import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

type Point = [number, number];
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...cors, "Content-Type": "application/json" } });
const cache = new Map<string, { expires: number; value: unknown }>();
const hits = new Map<string, { until: number; count: number }>();
const validPoint = (point: unknown): point is Point => Array.isArray(point) && point.length === 2 &&
  point.every(Number.isFinite) && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90;
const validGeometry = (geometry: { type?: string; coordinates?: unknown[] } | null | undefined) =>
  geometry?.type === "LineString" && Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 2 && geometry.coordinates.every(validPoint);
const near = (a: Point, b: Point) => Math.abs(a[0] - b[0]) < 0.003 && Math.abs(a[1] - b[1]) < 0.003;

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!token || !supabaseUrl || !serviceKey) return json({ error: "Entre novamente para consultar o mapa." }, 401);
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return json({ error: "Sessão expirada. Entre novamente." }, 401);
  const user = data.user;
  const now = Date.now();
  const quota = hits.get(user.id);
  if (quota && quota.until > now && quota.count >= 12) return json({ error: "Muitas consultas ao mapa. Aguarde um minuto." }, 429);
  hits.set(user.id, quota && quota.until > now ? { ...quota, count: quota.count + 1 } : { until: now + 60_000, count: 1 });
  const key = Deno.env.get("HEIGIT_API_KEY");

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json({ error: "Dados inválidos." }, 400); }
  const action = String(body.action || "");
  let target: string;
  let options: RequestInit;
  let cacheKey: string;
  let orderId: string | null = null;
  let optimizationNumbers: number[] | null = null;
  if (action === "geocode") {
    const text = String(body.text || "").trim();
    if (text.length < 12 || text.length > 220) return json({ error: "Informe o endereço completo para localizar." }, 400);
    target = `https://api.heigit.org/pelias/v1/search?text=${encodeURIComponent(text)}&size=3&boundary.country=BRA`;
    options = { headers: { Authorization: key || "" } };
    cacheKey = `geo:${text.toLowerCase()}`;
  } else if (action === "route") {
    const orderNumber = Number(body.order_number);
    if (!Number.isSafeInteger(orderNumber) || orderNumber < 1) return json({ error: "Pedido inválido." }, 400);
    const { data: order } = await admin.from("lusky_orders").select("id,order_number,created_by,assigned_driver,order_type,status,delivery_latitude,delivery_longitude").eq("order_number", orderNumber).maybeSingle();
    const role = String(user.app_metadata?.role || "customer");
    if (!order || (order.created_by !== user.id && order.assigned_driver !== user.id && !["owner","manager","staff"].includes(role))) return json({ error: "Pedido não disponível para esta conta." }, 403);
    if (order.order_type !== "Entrega") return json({ error: "Pedido sem rota de entrega." }, 400);
    const { data: restaurant } = await admin.from("lusky_restaurant_settings").select("latitude,longitude").eq("id",1).maybeSingle();
    const pickup = body.stage === "pickup";
    if (pickup && (role !== "motoboy" || order.assigned_driver !== user.id || !["Novo pedido","Preparando","Pronto"].includes(order.status))) return json({ error: "Deslocamento para retirada indisponível." }, 403);
    if (restaurant?.latitude == null || restaurant?.longitude == null || (!pickup && (order.delivery_latitude == null || order.delivery_longitude == null))) return json({ error: "Origem ou destino ainda sem coordenadas confirmadas." }, 400);
    const start: Point = pickup ? body.origin as Point : [Number(restaurant.longitude), Number(restaurant.latitude)];
    const end: Point = pickup ? [Number(restaurant.longitude), Number(restaurant.latitude)] : [Number(order.delivery_longitude), Number(order.delivery_latitude)];
    if (!validPoint(start) || !validPoint(end)) return json({ error: "Origem ou destino ainda sem coordenadas confirmadas." }, 400);
    if (!pickup) {
      orderId = order.id;
      const { data: existing } = await admin.from("lusky_order_routes").select("geometry,distance_m,duration_s,calculated_at,profile").eq("order_id", order.id).maybeSingle();
      const points = existing?.geometry?.coordinates;
      if (existing?.profile === "driving-car-shortest" && validGeometry(existing.geometry) && near(points[0], start) && near(points[points.length-1], end) && Number.isFinite(existing.distance_m) && Number.isFinite(existing.duration_s)) return json(existing);
    }
    target = "https://api.heigit.org/openrouteservice/v2/directions/driving-car/geojson";
    options = { method: "POST", headers: { Authorization: key || "", "Content-Type": "application/json" }, body: JSON.stringify({ coordinates: [start, end], preference: "shortest", instructions: false }) };
    cacheKey = `route:${order.id}:${pickup ? 'pickup' : 'delivery'}:${start.map(n=>n.toFixed(4)).join(',')}:${end.map(n=>n.toFixed(4)).join(',')}`;
  } else if (action === "sequence") {
    const numbers = body.order_numbers;
    const role = String(user.app_metadata?.role || "customer");
    if (role !== "motoboy") return json({ error: "Somente o motoboy atribuído pode consultar sua rota." }, 403);
    if (!Array.isArray(numbers) || numbers.length < 2 || numbers.length > 8 || !numbers.every(value => Number.isSafeInteger(value) && value > 0) || new Set(numbers).size !== numbers.length) return json({ error: "Sequência de entregas inválida." }, 400);
    const { data: stops } = await admin.from("lusky_orders").select("order_number,assigned_driver,order_type,status,delivery_latitude,delivery_longitude,route_order").in("order_number", numbers);
    if (!stops || stops.length !== numbers.length || stops.some(stop => stop.assigned_driver !== user.id || stop.order_type !== "Entrega" || stop.status !== "Saiu para entrega" || stop.delivery_latitude == null || stop.delivery_longitude == null)) return json({ error: "A rota inclui entrega sem atribuição ativa ou sem pino confirmado." }, 403);
    const byNumber = new Map(stops.map(stop => [stop.order_number, stop]));
    const ordered = numbers.map(number => byNumber.get(number)!);
    const { data: restaurant } = await admin.from("lusky_restaurant_settings").select("latitude,longitude").eq("id",1).maybeSingle();
    if (restaurant?.latitude == null || restaurant?.longitude == null) return json({ error: "Configure a origem do restaurante." }, 400);
    const start: Point = Array.isArray(body.origin) ? body.origin as Point : [Number(restaurant.longitude),Number(restaurant.latitude)];
    const coordinates: Point[] = [start, ...ordered.map(stop => [Number(stop.delivery_longitude),Number(stop.delivery_latitude)] as Point)];
    if (!coordinates.every(validPoint)) return json({ error: "A sequência contém coordenadas inválidas." }, 400);
    target = "https://api.heigit.org/openrouteservice/v2/directions/driving-car/geojson";
    options = { method:"POST", headers:{ Authorization:key || "", "Content-Type":"application/json" }, body:JSON.stringify({ coordinates, preference:"shortest", instructions:false }) };
    cacheKey = `sequence:${user.id}:${numbers.join(',')}:${coordinates.map(point=>point.map(n=>n.toFixed(4)).join(',')).join(';')}`;
  } else if (action === "optimize") {
    if (!["owner","manager","staff"].includes(String(user.app_metadata?.role || ""))) return json({ error: "Somente a equipe pode sugerir sequência." }, 403);
    const numbers = body.order_numbers;
    if (!Array.isArray(numbers) || numbers.length < 2 || numbers.length > 8 || !numbers.every(value => Number.isSafeInteger(value) && value > 0) || new Set(numbers).size !== numbers.length) return json({ error: "Selecione de 2 a 8 entregas diferentes." }, 400);
    const { data: orders } = await admin.from("lusky_orders").select("order_number,order_type,status,assigned_driver,delivery_latitude,delivery_longitude").in("order_number",numbers);
    if (!orders || orders.length !== numbers.length || orders.some(order => order.order_type !== "Entrega" || order.status !== "Pronto" || !order.assigned_driver || order.assigned_driver !== orders[0].assigned_driver || order.delivery_latitude == null || order.delivery_longitude == null)) return json({ error: "As entregas precisam estar prontas, com pino confirmado e atribuídas ao mesmo motoboy." }, 400);
    const { data: restaurant } = await admin.from("lusky_restaurant_settings").select("latitude,longitude").eq("id",1).maybeSingle();
    if (restaurant?.latitude == null || restaurant?.longitude == null) return json({ error: "Configure a origem do restaurante." }, 400);
    const start: Point = [Number(restaurant.longitude),Number(restaurant.latitude)];
    const jobs = orders.map((order,index) => ({ id:index+1, location:[Number(order.delivery_longitude),Number(order.delivery_latitude)] }));
    optimizationNumbers = orders.map(order => order.order_number);
    target = "https://api.heigit.org/vroom/v0";
    options = { method:"POST", headers:{ Authorization:key || "", "Content-Type":"application/json" }, body:JSON.stringify({ vehicles:[{ id:1, profile:"driving-car", start }], jobs }) };
    cacheKey = `optimize:${numbers.slice().sort().join(',')}`;
  } else return json({ error: "Operação de mapa inválida." }, 400);

  const cached = cache.get(cacheKey);
  if (cached && cached.expires > now) return json(cached.value);
  if (!key) return json({ error: "Roteamento indisponível: o provedor de mapas ainda não está configurado." }, 503);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(target, { ...options, signal: controller.signal });
    if (response.status === 403 || response.status === 429) return json({ error: "A cota do mapa foi atingida. Tente mais tarde." }, 503);
    if (!response.ok) return json({ error: "Não foi possível calcular o mapa agora." }, 502);
    const result = await response.json();
    let value: unknown;
    if (action === "geocode") {
      const feature = result.features?.[0];
      const coords = feature?.geometry?.coordinates;
      if (!validPoint(coords)) return json({ error: "Endereço não encontrado. Ajuste os campos ou o pino." }, 404);
      value = { point: { latitude: coords[1], longitude: coords[0] }, label: feature.properties?.label || "" };
    } else if (action === "route" || action === "sequence") {
      const feature = result.features?.[0];
      if (!validGeometry(feature?.geometry) || !Number.isFinite(feature?.properties?.summary?.distance) || !Number.isFinite(feature?.properties?.summary?.duration)) return json({ error: "Rota indisponível para esses pontos." }, 404);
      value = { geometry: feature.geometry, distance_m: feature.properties.summary.distance, duration_s: feature.properties.summary.duration, calculated_at: new Date().toISOString(), profile: action === "sequence" ? "driving-car-shortest-sequence" : "driving-car-shortest" };
      if (orderId) {
        const { error: saveError } = await admin.from("lusky_order_routes").upsert({ order_id: orderId, ...value });
        if (saveError) return json({ error: "A rota foi calculada, mas não pôde ser salva." }, 500);
      }
    } else {
      const steps = result.routes?.[0]?.steps?.filter((step: { type: string }) => step.type === "job") || [];
      if (result.unassigned?.length || steps.length !== optimizationNumbers?.length) return json({ error: "O provedor não encontrou sequência para todas as entregas." }, 422);
      value = { order_numbers:steps.map((step: { id: number }) => optimizationNumbers![step.id-1]), distance_m:result.routes[0].distance, duration_s:result.routes[0].duration, calculated_at:new Date().toISOString(), profile:"driving-car" };
    }
    if (cache.size > 500) cache.clear();
    cache.set(cacheKey, { value, expires: now + (action === "geocode" ? 86_400_000 : 600_000) });
    return json(value);
  } catch {
    return json({ error: "O serviço de mapa demorou a responder. Tente novamente." }, 504);
  } finally { clearTimeout(timeout); }
});
