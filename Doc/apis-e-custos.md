# APIs e custos

## Em uso no código

| Serviço | Uso | Custo/limite operacional |
| --- | --- | --- |
| Leaflet + React Leaflet | Renderização | Bibliotecas livres |
| Tiles OpenStreetMap | Base cartográfica no piloto | Serviço público sem SLA; respeitar [política de tiles](https://operations.osmfoundation.org/policies/tiles/), atribuição, cache HTTP, identificação/referer e sem pré-carregamento |
| ViaCEP | CEP→campos de endereço | Consulta só após 8 dígitos; indisponibilidade permite preenchimento manual. Não obtém número nem coordenada da porta. [Documentação](https://viacep.com.br/) |
| HeiGIT Pelias | Geocodificação | `https://api.heigit.org/pelias/v1/search` |
| HeiGIT Directions | Rota A→B | `https://api.heigit.org/openrouteservice/v2/directions/driving-car/geojson` |
| HeiGIT VROOM | Sugestão de sequência | `https://api.heigit.org/vroom/v0` |
| Supabase Free | Banco, Auth, Realtime e Edge Functions | Sujeito a [cotas do plano](https://supabase.com/pricing/) |

A chave HeiGIT é `HEIGIT_API_KEY` e fica só no segredo da Edge Function. Ainda não foi fornecida; nenhuma requisição real ao provedor foi validada. Confirme os endpoints e cota efetiva no painel da chave. [Anúncio de migração de endpoints](https://ask.openrouteservice.org/t/deprecating-api-openrouteservice-org-in-favour-of-api-heigit-org/7912). A FAQ de ORS cita 2.000 Directions/dia e 40/min como exemplo, não como garantia para esta conta: [FAQ](https://giscience.github.io/openrouteservice/v9.10.0/frequently-asked-questions).

A Edge Function limita a 12 chamadas por usuário/minuto e 8 s por chamada, com cache em memória: geocódigo 24 h, rota/otimização 10 min. O cache e limitador são locais à instância e não constituem cota global. GPS é enviado no mínimo a cada 15 s pelo cliente e o servidor também limita frequência. Um motoboy ativo por 8 h pode gerar até 1.920 atualizações de posição/dia; cada assinante Realtime pode receber até esse volume, além de leituras periódicas. Compare com o plano Supabase antes de ampliar a frota.

`driving-car` aproxima o trajeto de moto; não há trânsito ao vivo nem promessa de rota legalmente adequada a motocicletas. A tela separa rota estimada, cálculo e GPS observado. A distância de cobertura é geodésica, não a distância viária. Para tráfego maior, contratar tiles hospedados ou self-host, cache/limite distribuído, agregação GPS e validar custo antes de escalar.

[← Índice da documentação](README.md) · [Desenvolvimento local](desenvolvimento-local.md) · [Frontend](frontend.md)
