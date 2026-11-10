# API para os três apps

Base: `<URL_DA_API>/api/` (ex.: `http://localhost:3000/api/`, ou a URL da cloud). Documentação interativa: `/api/docs` (Swagger).

- Respostas usam o envelope `{ error, data, statusCode, timestamp, requester, message }`; os apps leem `data`.
- Exceção: os logins devolvem direto `{ access_token, role, profile }`.
- Rotas com **Bearer** exigem `Authorization: Bearer <access_token>` do login correspondente.
- Os apps atualizam por consulta periódica (a cada 5 s). `updatedAt` na solicitação permite detectar mudanças.

Legenda da última coluna: **Sim** = o app já usa (PR #1 de cada app); **Próxima** = já existe na API, falta tela no app.

## app-mobile-sindico

| Ação | Rota | Auth | No app |
|---|---|---|---|
| Login | `POST auth/login` `{ email, password }` | — | Sim |
| Barril do condomínio | `GET sensor/mine` → Barril ou `null` | Bearer | Sim |
| Cópia da solicitação em aberto | `GET collection-request/my-active` → Solicitação ou `null` | Bearer | Sim |
| Notificações (cópias vinculadas à solicitação) | `GET notifications/mine` (`?unread=true`, `?limit=50`) | Bearer | Próxima |
| Marcar como lida | `POST notifications/{id}/read` · `POST notifications/read-all` | Bearer | Próxima |
| Histórico | `GET collection-request/my-history` | Bearer | Próxima |

O síndico só acompanha: não inicia, não conclui e não recusa a coleta.

## app-mobile-empresa

| Ação | Rota | Auth | No app |
|---|---|---|---|
| Login | `POST auth/company/login` `{ email, password }` | — | Sim |
| Solicitações em aberto | `GET collection-request/company/active` → `PENDING` e `SCHEDULED` | Bearer | Sim |
| Barris dos condomínios clientes | `GET sensor/company` | Bearer | Sim |
| Iniciar etapa de coleta | `POST collection-request/{id}/accept` `{}` ou `{ scheduledDate }` → `SCHEDULED` | Bearer | Sim |
| Concluir coleta | `POST collection-request/{id}/company-complete` `{}` → `COMPLETED`, barril volta a 0% | Bearer | Sim |
| Recusar | `POST collection-request/{id}/refuse` → `REFUSED` | Bearer | Próxima (opcional) |
| Histórico | `GET collection-request/company/history` | Bearer | Próxima |

## interface-desktop-adm-coillect

Sem login no MVP, como a interface desktop atual espera.

| Ação | Rota | No app |
|---|---|---|
| Visão geral (contadores, barris, últimas 50 solicitações) | `GET admin/overview` | Sim |
| Leituras recebidas dos sensores | `GET admin/readings` (`?sensorId=COI-DEMO-01&limit=50`) | Próxima |
| Condomínios | `GET admin/condominiums` · `POST admin/condominiums` · `PATCH admin/condominiums/{id}` | Próxima |
| Sensores (ex.: cadastrar o ESP32) | `GET admin/sensors` · `POST admin/sensors` · `PATCH admin/sensors/{sensorId}` | Próxima |
| Listas para formulários | `GET admin/users` · `GET admin/companies` | Próxima |
| Reiniciar a demonstração | `POST admin/demo/reset` | Próxima |

Corpos de cadastro:

```json
POST admin/condominiums  { "name": "Condomínio X", "address": "Rua Y, 10", "sindicoId": 1, "companyId": 1 }
POST admin/sensors       { "sensorId": "COI-ESP32-01", "condominiumId": 1, "threshold": 80, "capacityLiters": 200 }
PATCH admin/sensors/COI-ESP32-01  { "threshold": 70 }
```

## Rotas comuns

| Rota | Uso |
|---|---|
| `GET health` | API no ar e banco conectado (`data.database = "up"`); usado pela cloud |
| `POST sensor/readings` | Leitura do sensor: ver [contrato-sensor.md](contrato-sensor.md) |
| `GET sensor/{sensorId}/status` | Estado atual de um sensor (útil para o sensor virtual) |

## Formatos

**Barril** (`sensor/mine`, `sensor/company`, `admin/overview.sensors`, `admin/sensors`):

```json
{
  "id": 1, "sensorId": "COI-DEMO-01",
  "condominiumId": 1, "condominiumName": "Condomínio Demonstração", "condominiumAddress": "Rua das Flores, 120 - São Paulo/SP",
  "companyId": 1, "companyName": "Coleta Verde", "sindicoName": "Síndico Demonstração",
  "level": 85, "threshold": 80, "capacityLiters": 200, "estimatedLiters": 170, "needsCollection": true,
  "lastReadingAt": "2026-11-10T03:00:00.000Z", "lastCollectionAt": null,
  "openRequest": { "id": 12, "status": "PENDING", "requestedAt": "2026-11-10T03:00:00.000Z" }
}
```

**Solicitação de coleta** (todas as rotas `collection-request/*`, `admin/overview.requests`):

```json
{
  "id": 12, "status": "PENDING", "origin": "SENSOR", "levelAtRequest": 85,
  "requestedAt": "…", "scheduledDate": null, "completedAt": null, "updatedAt": "…",
  "condominiumName": "Condomínio Demonstração",
  "sensor": { "id": 1, "sensorId": "COI-DEMO-01", "condominiumId": 1, "condominiumName": "Condomínio Demonstração", "level": 85, "threshold": 80 },
  "user": { "id": 1, "name": "Síndico Demonstração", "email": "sindico@coillect.com" },
  "company": { "id": 1, "name": "Coleta Verde", "iconeUrl": null }
}
```

Status: `PENDING` (aguardando início) → `SCHEDULED` (em andamento) → `COMPLETED`. Também existem `REFUSED` e `CANCELLED` (fluxo antigo). `origin`: `SENSOR` (criada pelo listener) ou `MANUAL` (fluxo antigo).

**Notificação do síndico** (`notifications/mine`):

```json
{
  "id": 3, "type": "COLLECTION_REQUESTED", "title": "Solicitação de coleta gerada",
  "message": "O barril de Condomínio Demonstração atingiu 85%. A solicitação #12 foi enviada para Coleta Verde.",
  "read": false, "createdAt": "…", "requestId": 12, "request": { "...": "mesma solicitação acima" }
}
```

Tipos: `COLLECTION_REQUESTED`, `COLLECTION_SCHEDULED`, `COLLECTION_COMPLETED`, `COLLECTION_REFUSED`, `COLLECTION_CANCELLED`.

## O que falta nos apps para usar tudo

- **Síndico**: lista de notificações com "marcar como lida" e histórico.
- **Empresa**: histórico; botão de recusar, se a equipe quiser.
- **Desktop**: feed de leituras (mostra a comunicação do sensor ao vivo), cadastro de condomínio/sensor e botão "Reiniciar demonstração".
- **Todos**: aumentar o tempo limite de leitura HTTP (hoje 10 s) se a API ficar num plano gratuito que "dorme"; ver [deploy-cloud.md](deploy-cloud.md).
