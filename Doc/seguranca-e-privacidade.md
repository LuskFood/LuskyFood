# Segurança e privacidade

Auth controla sessão e e-mail verificado conforme configuração do projeto. RLS e grants protegem endereços, pedidos, eventos, rotas e localização. RPCs `security definer` exigem autenticação, papel e vínculo com o pedido; mantenha revisão de cada alteração nessas funções. A Edge Function usa a identidade do usuário antes de ler um pedido; `HEIGIT_API_KEY` e `SUPABASE_SERVICE_ROLE_KEY` ficam apenas no servidor. Nunca usar `VITE_*` para segredos.

CPF/RG de motoboy seguem o schema `internal` existente; CPF tem verificador, RG apenas formato aceito, sem pretensão de autenticidade nacional. A tela mascara CPF, telefone e CEP. Não registrar documentos ou códigos em logs. O código da cozinha fica em tabela interna e só é entregue à equipe; o código do cliente só é retornado ao titular enquanto a entrega está em rota. Cinco erros bloqueiam novas tentativas por 15 min. Pedidos antigos tiveram `pickup_code` limpo da tabela pública.

A posição persistida é apenas a última do motoboy durante rota ativa. A interface só lê localização vinculada à entrega ativa e oculta dados antigos; um gatilho elimina a linha quando a última entrega ativa termina. Não há histórico de trilha GPS. O navegador pode parar `watchPosition` em segundo plano ou ao bloquear a tela; nunca apresentar uma posição antiga como atual. A rota e o snapshot de endereço do pedido permanecem como dado operacional e devem seguir política de retenção a ser definida pelo responsável.

Verificação restante antes de produção: testes com cinco JWTs separados (cliente A/B, motoboy A/B, equipe), evento Realtime entre sessões, revisão do aviso Supabase de proteção contra senhas vazadas e política de retenção de pedidos, endereços e ocorrências.
