# Estado atual do backend (inventário)

Base: `main` @ `76f1237` ("atualizacao swagger"). Classificação conforme o contexto mestre (§4).
Atualizado com o alinhamento aos diagramas de classes (ver [diagramas.md](diagramas.md)).

| Componente | Classificação | Situação |
|---|---|---|
| NestJS + TypeORM + PostgreSQL, prefixo `/api`, Swagger em `/api/docs`, `ValidationPipe` | REUTILIZAR | Mantidos; configuração movida para `src/app.setup.ts` (usada também nos testes) |
| Login de usuário/síndico (`POST auth/login`) e de empresa (`POST auth/company/login`), guards JWT | REUTILIZAR | Resposta ganhou `role` e `profile`; `access_token` continua igual |
| Envelope `APIResponse` | REUTILIZAR | Usado em todas as rotas novas |
| Entidades `users`, `companies` (+ endereço, contato, representante) | REUTILIZAR | Sem mudança; cadastro de empresa e usuário continuam como estavam |
| `collection_requests` e suas rotas | AJUSTAR | Vínculo com o **barril** e o sensor, `origin` (`SENSOR`, `COMPANY`, `MANUAL`), `levelAtRequest`, `completedAt`, `updatedAt`; `company/active` inclui `SCHEDULED`; novas rotas `company-complete` e `company/schedule` ("Agendar coleta"); respostas sem hashes de senha (campos `*Snapshot` mantidos para o frontend web) |
| Conexão com o banco por variáveis fixas e porta 3000 fixa | AJUSTAR | `DATABASE_URL` ou `DATABASE_*`, SSL opcional, `PORT` |
| Dockerfile preso ao host `db:5432` (`wait-for-it.sh`) | AJUSTAR | Removida a dependência; o TypeORM reconecta sozinho. `wait-for-it.sh` ficou no repositório, sem uso |
| `docker-compose.yaml` exigia `backend/.env` | AJUSTAR | `.env` agora é opcional |
| Condomínio (com bairro), barril, sensor, histórico de leituras | FALTANTE → criado | `src/sensor/entities/*` (`Condominium`, `Barrel`, `Sensor`, `SensorReading`), como no diagrama da API |
| Endpoint do sensor e listener/regra de disparo | FALTANTE → criado | `POST sensor-alert` (`SensorAlertController`/`SensorAlertService`), `POST sensor/readings` (mesmo), `src/collection-request/sensor-trigger.listener.ts` |
| Notificações do síndico e da empresa | FALTANTE → criado | `src/notification/*` (`notificarSindico`, `notificarEmpresa`), vinculadas à mesma solicitação |
| Rotas do desktop administrativo (cadastros de síndico, empresa, condomínio, barril e sensor) e dados de demonstração | FALTANTE → criado | `src/admin/*`, `src/demo/*` (nomes dos mockups) |
| Health check e CI do backend | FALTANTE → criado | `GET health`, `.github/workflows/backend.yml` |
| Fluxo antigo de pedido manual pelo usuário (`POST collection-request`, `:id/cancel`, `:id/complete`) | LEGADO | Mantido para o frontend web; cancelar/concluir só vale para pedidos `MANUAL` abertos (403 nas coletas do sensor ou da empresa); os novos apps não usam |
| Testes `*.spec.ts` antigos (vários não compilam ou chamam métodos inexistentes; um arquivo vazio) | LEGADO | Não alterados; o CI roda `npm run test:mvp` e `npm run test:e2e:mvp` |
| `frontend/` (web) | Fora deste PR | Não alterado |
| `ormconfig*.ts` e `src/migrations` | Fora deste PR | Não usados pela aplicação (ela usa `synchronize`) |
