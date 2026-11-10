# API para os três apps

Base: `<URL_DA_API>/api/` (ex.: `http://localhost:3000/api/`, ou a URL da cloud). Documentação interativa: `/api/docs` (Swagger).

- Respostas usam o envelope `{ error, data, statusCode, timestamp, requester, message }`; os apps leem `data`.
- Exceção: os logins devolvem direto `{ access_token, role, profile }`.
- Rotas marcadas com **Bearer** exigem o cabeçalho `Authorization: Bearer <access_token>` do login correspondente.
- Os apps atualizam por consulta periódica (a cada 5 s). `updatedAt` na solicitação permite detectar mudanças.

Legenda da última coluna: **Sim** = o app já usa (PR #1 de cada app); **Próxima** = já existe na API, falta tela no app.

## Quem faz o quê

- **Sensor** (físico ou virtual): envia a leitura. Ver [contrato-sensor.md](contrato-sensor.md).
- **Empresa coletora**: recebe a solicitação do **barril específico** e o aviso "Nova solicitação de coleta", agenda e conclui a coleta. Também pode agendar a coleta de um barril antes do alerta.
- **Síndico**: só é notificado. Vê o nível do barril e a cópia da solicitação; não cancela nem conclui coletas geradas pelo sensor ou pela empresa (HTTP 403).
- **Admin (desktop)**: cadastra síndicos, empresas, condomínios, barris e sensores, faz as ligações entre eles e acompanha tudo.

## app-mobile-sindico

| Ação | Rota | Auth | No app |
|---|---|---|---|
| Login | `POST auth/login` `{ email, password }` | — | Sim |
| Barril do condomínio | `GET sensor/mine` → Barril ou `null` | Bearer | Sim |
| Cópia da solicitação em aberto | `GET collection-request/my-active` → Solicitação ou `null` | Bearer | Sim |
| Notificações (cópias da solicitação) | `GET notifications/mine` (`?unread=true`, `?limit=50`) | Bearer | Próxima |
| Marcar como lida | `POST notifications/{id}/read` · `POST notifications/read-all` | Bearer | Próxima |
| Histórico | `GET collection-request/my-history` | Bearer | Próxima |

## app-mobile-empresa

| Ação | Rota | Auth | No app |
|---|---|---|---|
| Login | `POST auth/company/login` `{ email, password }` | — | Sim |
| Solicitações em aberto | `GET collection-request/company/active` → `PENDING` e `SCHEDULED` | Bearer | Sim |
| Reservatórios monitorados (barris dos clientes) | `GET sensor/company` | Bearer | Sim |
| Avisos ("Nova solicitação de coleta") | `GET notifications/company` (`?unread=true`, `?limit=50`) | Bearer | Próxima |
| Marcar aviso como lido | `POST notifications/company/{id}/read` · `POST notifications/company/read-all` | Bearer | Próxima |
| **Agendar coleta** do reservatório selecionado | `POST collection-request/company/schedule` `{ sensorId, scheduledDate? }` | Bearer | Próxima |
| Iniciar etapa de coleta de uma solicitação | `POST collection-request/{id}/accept` `{}` ou `{ scheduledDate }` → `SCHEDULED` | Bearer | Sim |
| Concluir coleta | `POST collection-request/{id}/company-complete` `{}` → `COMPLETED`, barril volta a 0% | Bearer | Sim |
| Recusar | `POST collection-request/{id}/refuse` → `REFUSED` | Bearer | Próxima (opcional) |
| Histórico | `GET collection-request/company/history` | Bearer | Próxima |

"Agendar coleta" serve para os dois casos do documento de funcionalidades:
- o barril já tem solicitação do sensor (`PENDING`): ela é aceita e passa a `SCHEDULED`;
- o barril ainda não atingiu o limite: é criada uma solicitação nova, `origin: "COMPANY"`, já `SCHEDULED`, e o síndico é notificado.
Nunca existem duas coletas abertas para o mesmo barril.

## interface-desktop-adm-coillect

Sem login no MVP, como a interface desktop atual espera.

| Ação | Rota | No app |
|---|---|---|
| Visão geral (contadores, barris, últimas 50 solicitações) | `GET admin/overview` | Sim |
| Leituras recebidas dos sensores | `GET admin/readings` (`?sensorId=CLT-8472-A&limit=50`) | Próxima |
| Síndicos | `GET admin/sindicos` · `POST admin/sindicos` | Próxima |
| Empresas coletoras | `GET admin/companies` · `POST admin/companies` | Próxima |
| Condomínios (com síndico e empresa) | `GET admin/condominiums` · `POST admin/condominiums` · `PATCH admin/condominiums/{id}` | Próxima |
| Barris | `GET admin/barrels` · `POST admin/barrels` · `PATCH admin/barrels/{id}` | Próxima |
| Sensores (ex.: cadastrar o ESP32) | `GET admin/sensors` · `POST admin/sensors` · `PATCH admin/sensors/{sensorId}` | Próxima |
| Reiniciar a demonstração | `POST admin/demo/reset` | Próxima |

Ordem de cadastro e corpos:

```json
POST admin/sindicos      { "name": "Leonardo Costa", "email": "leo@exemplo.com", "password": "Senha@123" }
POST admin/companies     { "name": "EcoColeta Ambiental", "email": "contato@ecocoleta.com", "cnpj": "11222333000181", "password": "Senha@123" }
POST admin/condominiums  { "name": "Residencial Aurora", "address": "Rua das Acácias, 120", "neighborhood": "Jardim Paulista", "sindicoId": 1, "companyId": 1 }
POST admin/barrels       { "code": "BRL-8472", "condominiumId": 1, "capacityLiters": 200, "alertThreshold": 80 }
POST admin/sensors       { "sensorId": "CLT-8472-A", "barrelId": 1 }
PATCH admin/barrels/1    { "alertThreshold": 70 }
PATCH admin/sensors/CLT-8472-A  { "barrelId": 2 }
```

- Sem `password`, síndico e empresa recebem a senha de demonstração (`DEMO_PASSWORD`).
- Um barril tem um sensor; tentar instalar um segundo devolve 409.
- Atalho antigo: `POST admin/sensors { "sensorId": "X", "condominiumId": 1, "threshold": 80 }` cria o barril `BRL-X` no condomínio.
- `GET admin/users` continua respondendo (mesmo que `admin/sindicos`).

## Rotas comuns

| Rota | Uso |
|---|---|
| `GET health` | API no ar e banco conectado (`data.database = "up"`); usado pela cloud |
| `POST sensor-alert` | Leitura do sensor: ver [contrato-sensor.md](contrato-sensor.md). `POST sensor/readings` é o mesmo |
| `GET sensor/{sensorId}/status` | Estado atual de um sensor (útil para o sensor virtual) |

## Formatos

**Barril/sensor** (`sensor/mine`, `sensor/company`, `admin/overview.sensors`, `admin/sensors`):

```json
{
  "id": 1, "sensorId": "CLT-8472-A", "barrelId": 1, "barrelCode": "BRL-8472",
  "condominiumId": 1, "condominiumName": "Residencial Aurora", "condominiumAddress": "Rua das Acácias, 120 - São Paulo/SP",
  "condominiumNeighborhood": "Jardim Paulista",
  "companyId": 1, "companyName": "EcoColeta Ambiental", "sindicoName": "Leonardo Costa",
  "level": 86, "threshold": 80, "capacityLiters": 200, "estimatedLiters": 172, "needsCollection": true,
  "online": true, "lastReadingAt": "2026-11-10T17:32:06.120Z", "lastCollectionAt": null,
  "openRequest": { "id": 12, "status": "PENDING", "requestedAt": "2026-11-10T17:32:06.300Z" }
}
```

**Solicitação de coleta** (rotas `collection-request/*`, `admin/overview.requests`):

```json
{
  "id": 12, "status": "PENDING", "origin": "SENSOR", "levelAtRequest": 86,
  "requestedAt": "…", "scheduledDate": null, "completedAt": null, "updatedAt": "…",
  "condominiumName": "Residencial Aurora", "condominiumNeighborhood": "Jardim Paulista",
  "barrel": { "id": 1, "code": "BRL-8472", "capacityLiters": 200, "threshold": 80 },
  "sensor": { "id": 1, "sensorId": "CLT-8472-A", "condominiumId": 1, "condominiumName": "Residencial Aurora", "level": 86, "threshold": 80 },
  "user": { "id": 1, "name": "Leonardo Costa", "email": "sindico@coillect.com" },
  "company": { "id": 1, "name": "EcoColeta Ambiental", "iconeUrl": null }
}
```

- Status: `PENDING` (aguardando a empresa) → `SCHEDULED` (agendada/em andamento) → `COMPLETED`. Também existem `REFUSED` e `CANCELLED`.
- `origin`: `SENSOR` (criada pelo listener), `COMPANY` (empresa agendou antes do alerta) ou `MANUAL` (fluxo antigo do frontend web).

**Notificação** (`notifications/mine` do síndico e `notifications/company` da empresa):

```json
{
  "id": 3, "audience": "EMPRESA", "type": "COLLECTION_REQUESTED", "title": "Nova solicitação de coleta",
  "message": "Residencial Aurora chegou a 86% de capacidade. Barril BRL-8472.",
  "read": false, "createdAt": "…", "requestId": 12, "request": { "...": "mesma solicitação acima" }
}
```

| Evento | Síndico (`audience: SINDICO`) | Empresa (`audience: EMPRESA`) |
|---|---|---|
| Sensor atingiu o limite | "Coleta solicitada automaticamente" | "Nova solicitação de coleta" |
| Empresa agendou/iniciou | "Coleta agendada" (com data) | — |
| Empresa concluiu | "Coleta concluída" | — |
| Empresa recusou | "Solicitação recusada" | — |
| Síndico cancelou (só fluxo antigo) | "Solicitação cancelada" | "Solicitação cancelada" |

## O que falta nos apps para usar tudo

- **Síndico**: lista de notificações e histórico, no visual do mockup.
- **Empresa**: faixa de aviso, "Agendar coleta" com data no reservatório selecionado, histórico.
- **Desktop**: cadastros, feed de leituras (mostra a comunicação do sensor ao vivo) e "Reiniciar demonstração".
- **Todos**: aumentar o tempo limite de leitura HTTP (hoje 10 s) se a API ficar num plano gratuito que "dorme"; ver [deploy-cloud.md](deploy-cloud.md).
