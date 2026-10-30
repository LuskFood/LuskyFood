# Lusky Food: gestão de contas

Edge Function `lusky-admin-users` para listar, criar, editar, redefinir senha,
habilitar, desabilitar e excluir contas do Supabase Auth.

O gateway exige JWT (`verify_jwt = true`) e a função valida novamente a sessão
no servidor, permitindo mutações apenas quando `app_metadata.role` é `owner`.
A chave service role é lida somente do ambiente da Edge Function. Não a coloque
no frontend nem em variáveis `VITE_`.

Não há migration de banco nesta entrega: a função usa as tabelas e gatilhos
existentes. Ao excluir, preserva contas com pedidos históricos e recomenda
desativá-las; contas de administrador e a própria sessão não podem ser
desativadas ou excluídas pela tela.
