# Publicar a API na cloud

A API roda em qualquer serviço que execute um container Docker e ofereça PostgreSQL. Não depende de host fixo (`db`), lê a porta de `PORT` e o banco de `DATABASE_URL`.

## Variáveis de ambiente

| Variável | Obrigatória | Padrão | Uso |
|---|---|---|---|
| `DATABASE_URL` | sim, na cloud | — | `postgres://usuario:senha@host:5432/banco` |
| `DATABASE_HOST` / `_PORT` / `_USER` / `_PASSWORD` / `_NAME` | sem `DATABASE_URL` | `localhost` / `5432` / `postgres` / `postgres` / `app_db` | Ambiente local e docker compose |
| `DATABASE_SSL` | não | `false` | `true` se o banco exigir SSL e a URL não tiver `sslmode` |
| `DATABASE_SYNC` | não | `true` | Cria/atualiza as tabelas sozinho (MVP) |
| `PORT` | não | `3000` | A plataforma normalmente define |
| `JWT_SECRET` | sim, na cloud | valor interno | Segredo dos tokens de login |
| `SEED_DEMO` | não | `true` | Cria síndico, empresa, condomínios, barris e sensores de demonstração |
| `DEMO_PASSWORD` | não | `Coillect@2025` | Senha das contas de demonstração (e dos cadastros do admin sem senha) |
| `SENSOR_ONLINE_MINUTES` | não | `30` | Minutos sem leitura até o sensor aparecer como inativo (`online: false`) |
| `APP_TIMEZONE` | não | `America/Sao_Paulo` | Fuso usado nas datas das notificações |

Verificação: `GET /api/health` deve responder `"database": "up"`.

## Opção 1 — Render (gratuito, usado como exemplo)

O arquivo `render.yaml` na raiz cria a API e um PostgreSQL.

1. Crie a conta no Render e conecte o GitHub com acesso a `CoillectADM/CoillectApp`.
2. **New → Blueprint**, escolha o repositório e a branch `main` (depois do merge deste PR).
3. Confirme. O Render cria o banco `coillect-db`, gera o `JWT_SECRET` e faz o build de `backend/Dockerfile`.
4. Quando terminar, abra `https://<seu-servico>.onrender.com/api/health` e `…/api/docs`.
5. Rode o roteiro de verificação na sua máquina (Node 18+):
   `node backend/scripts/smoke-flow.mjs https://<seu-servico>.onrender.com/api --reset`
6. Nos três apps, no campo **Servidor da API**, use `https://<seu-servico>.onrender.com/api/`.
7. No firmware/simulador do sensor, use `https://<seu-servico>.onrender.com/api/sensor-alert`.

Limites do plano gratuito do Render:

- A API **dorme após 15 min sem tráfego** e leva cerca de **1 min** para acordar. Os apps usam tempo limite de 10 s: antes da apresentação, abra `/api/health` no navegador e espere responder.
- O **PostgreSQL gratuito expira 30 dias após a criação**. Crie perto da data da apresentação, ou use outro PostgreSQL e informe a `DATABASE_URL` dele.
- Arquivos gravados no disco (ícones enviados por upload) se perdem a cada reinício.

## Opção 2 — outro provedor (Railway, Azure, Fly.io, VM)

1. Crie um PostgreSQL gerenciado e copie a URL de conexão.
2. Crie um serviço a partir do Dockerfile `backend/Dockerfile` (contexto `backend/`).
3. Defina `DATABASE_URL`, `JWT_SECRET` e, se o banco exigir, `DATABASE_SSL=true`.
4. Health check: `/api/health`. A porta vem de `PORT`.

## Local, igual à cloud

```bash
docker compose up -d --build db backend
# API: http://localhost:3000/api/docs
node backend/scripts/smoke-flow.mjs http://localhost:3000/api --reset
```

O CI (`.github/workflows/backend.yml`) faz o mesmo a cada push: build da imagem, container com `PORT=8080` e `DATABASE_URL`, e o roteiro completo.
