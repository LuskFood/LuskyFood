import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

function randomPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join("") + "aA7!";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Entre novamente como administrador." }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "A configuração segura do servidor está incompleta." }, 500);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  const actor = authData.user;
  if (authError || !actor || actor.app_metadata?.role !== "owner") {
    return json({ error: "Somente a conta administradora Lusky pode gerenciar usuários." }, 403);
  }

  try {
    const body = await req.json();
    const action = String(body?.action ?? "");

    if (action === "list") {
      const users = [];
      for (let page = 1; page <= 20; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        users.push(...data.users);
        if (data.users.length < 1000) break;
      }
      const [profiles, drivers] = await Promise.all([
        admin.from("lusky_profiles").select("id,display_name,phone"),
        admin.from("lusky_motoboy_profiles").select("id,driver_code,vehicle_color,vehicle_plate,vehicle_brand,vehicle_model"),
      ]);
      if (profiles.error) throw profiles.error;
      if (drivers.error) throw drivers.error;
      const profileById = new Map((profiles.data ?? []).map(row => [row.id, row]));
      const driverById = new Map((drivers.data ?? []).map(row => [row.id, row]));
      const result = users.map(user => {
        const role = user.app_metadata?.role ?? user.user_metadata?.account_type ?? "customer";
        const profile = profileById.get(user.id);
        const driver = driverById.get(user.id);
        const bannedUntil = user.banned_until ? Date.parse(user.banned_until) : 0;
        return {
          id: user.id,
          email: user.email ?? "",
          full_name: user.user_metadata?.full_name ?? profile?.display_name ?? "",
          phone: profile?.phone ?? user.user_metadata?.phone ?? "",
          role,
          active: !bannedUntil || bannedUntil <= Date.now(),
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          driver_code: driver?.driver_code ?? null,
          vehicle: driver ? `${driver.vehicle_color} · ${driver.vehicle_brand} ${driver.vehicle_model} · ${driver.vehicle_plate}` : null,
          vehicle_details: driver ? {
            vehicle_color: driver.vehicle_color,
            vehicle_plate: driver.vehicle_plate,
            vehicle_brand: driver.vehicle_brand,
            vehicle_model: driver.vehicle_model,
          } : null,
        };
      }).sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email, "pt-BR"));
      return json({ users: result });
    }

    if (action === "create") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const fullName = String(body.full_name ?? "").trim();
      const password = String(body.password ?? "");
      const phone = String(body.phone ?? "").replace(/\D/g, "");
      const role = String(body.role ?? "");
      if (!email.includes("@") || fullName.length < 3 || fullName.length > 120 || password.length < 8) {
        return json({ error: "Confira o e-mail, o nome completo e a senha (mínimo de 8 caracteres)." }, 400);
      }
      if (!/^\d{11}$/.test(phone)) return json({ error: "Informe um celular com DDD (11 dígitos)." }, 400);
      if (!["customer", "motoboy", "owner"].includes(role)) return json({ error: "Tipo de conta inválido." }, 400);
      const metadata: Record<string, string> = {
        full_name: fullName,
        phone,
        account_type: role === "owner" ? "owner" : role,
      };
      if (role === "motoboy") {
        for (const key of ["document_type", "document_number", "vehicle_color", "vehicle_plate", "vehicle_brand", "vehicle_model"]) {
          metadata[key] = String(body[key] ?? "").trim();
        }
        if (!metadata.document_type || !metadata.document_number || !metadata.vehicle_color || !metadata.vehicle_plate || !metadata.vehicle_brand || !metadata.vehicle_model) {
          return json({ error: "Preencha documento e todas as informações do veículo." }, 400);
        }
      }
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: metadata,
        app_metadata: { role },
      });
      if (error) {
        const message = role === "motoboy" && error.message.includes("Database error creating new user")
          ? "O Supabase recusou os dados do motoboy. Confira a placa no formato ABC1D23 e valide se o documento já está cadastrado."
          : error.message;
        return json({ error: message }, 400);
      }
      return json({ user: { id: data.user.id, email: data.user.email, role } }, 201);
    }

    const userId = String(body.user_id ?? "");
    if (!userId) return json({ error: "Usuário não informado." }, 400);
    if (userId === actor.id && ["disable", "delete", "reset_password"].includes(action)) {
      return json({ error: "Por segurança, não é possível suspender, excluir ou resetar sua própria conta por aqui." }, 400);
    }
    const { data: targetData, error: targetError } = await admin.auth.admin.getUserById(userId);
    if (targetError || !targetData.user) return json({ error: "Essa conta não foi encontrada." }, 404);
    const target = targetData.user;
    const targetRole = target.app_metadata?.role ?? target.user_metadata?.account_type ?? "customer";
    if (targetRole === "owner" && ["disable", "delete"].includes(action)) {
      return json({ error: "Contas administradoras não podem ser suspensas nem excluídas por esta tela." }, 400);
    }

    if (action === "update") {
      const fullName = String(body.full_name ?? "").trim();
      const email = String(body.email ?? "").trim().toLowerCase();
      const phone = String(body.phone ?? "").replace(/\D/g, "");
      if (fullName.length < 3 || fullName.length > 120 || !email.includes("@")) {
        return json({ error: "Confira o nome completo e o e-mail." }, 400);
      }
      if (!/^\d{11}$/.test(phone)) return json({ error: "Informe um celular com DDD (11 dígitos)." }, 400);
      const { error } = await admin.auth.admin.updateUserById(userId, {
        email,
        email_confirm: true,
        user_metadata: { ...target.user_metadata, full_name: fullName, phone },
      });
      if (error) return json({ error: error.message }, 400);
      const { error: profileError } = await admin.from("lusky_profiles").update({ display_name: fullName, full_name: fullName, phone }).eq("id", userId);
      if (profileError) throw profileError;
      if (targetRole === "motoboy") {
        const vehicle = body.vehicle ?? {};
        const vehicleFields = {
          vehicle_color: String(vehicle.vehicle_color ?? "").trim(),
          vehicle_plate: String(vehicle.vehicle_plate ?? "").trim().toUpperCase(),
          vehicle_brand: String(vehicle.vehicle_brand ?? "").trim(),
          vehicle_model: String(vehicle.vehicle_model ?? "").trim(),
        };
        if (Object.values(vehicleFields).some(value => !value)) return json({ error: "Preencha cor, placa, marca e modelo do veículo." }, 400);
        if (!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(vehicleFields.vehicle_plate)) return json({ error: "Confira o formato da placa." }, 400);
        const { error: driverError } = await admin.from("lusky_motoboy_profiles").update({ full_name: fullName, ...vehicleFields }).eq("id", userId);
        if (driverError) throw driverError;
      }
      return json({ ok: true });
    }

    if (action === "reset_password") {
      const password = randomPassword();
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ password });
    }

    if (action === "disable" || action === "enable") {
      const { error } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: action === "disable" ? "876000h" : "none",
      });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "delete") {
      const { count, error: ordersError } = await admin.from("lusky_orders").select("id", { count: "exact", head: true }).eq("created_by", userId);
      if (ordersError) throw ordersError;
      if ((count ?? 0) > 0) return json({ error: "Esta conta tem pedidos no histórico. Desative-a para preservar os registros." }, 409);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Ação não reconhecida." }, 400);
  } catch (error) {
    console.error("lusky-admin-users error", error);
    return json({ error: "Não foi possível concluir a operação. Confira os dados e tente novamente." }, 500);
  }
});
