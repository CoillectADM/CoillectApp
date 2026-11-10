# Estado atual do backend (inventário)

Base: `main` @ `76f1237` ("atualizacao swagger"). Classificação conforme o contexto mestre (§4).

| Componente | Classificação | Situação |
|---|---|---|
| NestJS + TypeORM + PostgreSQL, prefixo `/api`, Swagger em `/api/docs`, `ValidationPipe` | REUTILIZAR | Mantidos; configuração movida para `src/app.setup.ts` (usada também nos testes) |
| Login de usuário/síndico (`POST auth/login`) e de empresa (`POST auth/company/login`), guards JWT | REUTILIZAR | Resposta ganhou `role` e `profile`; `access_token` continua igual |
| Envelope `APIResponse` | REUTILIZAR | Usado em todas as rotas novas |
| Entidades `users`, `companies` (+ endereço, contato, representante) | REUTILIZAR | Sem mudança; cadastro de empresa e usuário continuam como estavam |
| `collection_requests` e suas rotas | AJUSTAR | Vínculo com o sensor, `origin`, `levelAtRequest`, `completedAt`, `updatedAt`; `company/active` inclui `SCHEDULED`; nova rota `company-complete`; respostas sem hashes de senha |
| Conexão com o banco por variáveis fixas e porta 3000 fixa | AJUSTAR | `DATABASE_URL` ou `DATABASE_*`, SSL opcional, `PORT` |
| Dockerfile preso ao host `db:5432` (`wait-for-it.sh`) | AJUSTAR | Removida a dependência; o TypeORM reconecta sozinho. `wait-for-it.sh` ficou no repositório, sem uso |
| `docker-compose.yaml` exigia `backend/.env` | AJUSTAR | `.env` agora é opcional |
| Condomínio, sensor/barril, histórico de leituras | FALTANTE → criado | `src/sensor/entities/*` |
| Endpoint do sensor e listener/regra de disparo | FALTANTE → criado | `POST sensor/readings`, `src/collection-request/sensor-trigger.listener.ts` |
| Cópia/notificação do síndico | FALTANTE → criado | `src/notification/*`, vinculada à mesma solicitação |
| Rotas do desktop administrativo e dados de demonstração | FALTANTE → criado | `src/admin/*`, `src/demo/*` |
| Health check e CI do backend | FALTANTE → criado | `GET health`, `.github/workflows/backend.yml` |
| Fluxo antigo de pedido manual pelo usuário (`POST collection-request`, `:id/cancel`, `:id/complete`) | LEGADO | Mantido por compatibilidade; os novos apps não usam |
| Testes `*.spec.ts` antigos (vários não compilam ou chamam métodos inexistentes; um arquivo vazio) | LEGADO | Não alterados; o CI roda `npm run test:mvp` e `npm run test:e2e:mvp` |
| `frontend/` (web) | Fora deste PR | Não alterado |
| `ormconfig*.ts` e `src/migrations` | Fora deste PR | Não usados pela aplicação (ela usa `synchronize`) |
