# API para os três apps

Base: `<URL_DA_API>/api/` (ex.: `http://localhost:3000/api/`, ou a URL da cloud). Documentação interativa: `/api/docs` (Swagger).

- Respostas usam o envelope `{ error, data, statusCode, timestamp, requester, message }`; os apps leem `data`.
- Exceção: os logins devolvem direto `{ access_token, role, profile }`.
- Rotas marcadas com **Bearer** exigem o cabeçalho `Authorization: Bearer <access_token>` do login correspondente.
- Os apps atualizam por consulta periódica (a cada 5 s). `updatedAt` na solicitação permite detectar mudanças.

Legenda da última coluna: **Sim** = o app usa (telas do mockup, PR #2 de cada app); **—** = existe na API, o app não precisa.

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
| Notificações (cópias da solicitação e pedidos de ajuda) | `GET notifications/mine` (`?unread=true`, `?limit=50`) | Bearer | Sim |
| Marcar como lida | `POST notifications/{id}/read` · `POST notifications/read-all` | Bearer | Sim |
| Histórico | `GET collection-request/my-history` | Bearer | Sim |
| Comprovante da coleta concluída (Blob Storage) | `GET collection-request/{id}/receipt` | Bearer | Sim |
| "Precisa de ajuda?" | `POST help-request` `{ message, topic? }` (`COLETA`, `SENSOR`, `CADASTRO`, `OUTRO`) | Bearer | Sim |
| "Simular leitura do sensor" (demonstração) | `POST sensor-alert` `{ sensorId, percentual }` (mesmo contrato do ESP32) | — | Sim |

## app-mobile-empresa

| Ação | Rota | Auth | No app |
|---|---|---|---|
| Login | `POST auth/company/login` `{ email, password }` | — | Sim |
| Solicitações em aberto | `GET collection-request/company/active` → `PENDING` e `SCHEDULED` | Bearer | Sim |
| Reservatórios monitorados (barris dos clientes) | `GET sensor/company` | Bearer | Sim |
| Avisos ("Nova solicitação de coleta", "Pedido de ajuda") | `GET notifications/company` (`?unread=true`, `?limit=50`) | Bearer | Sim |
| Marcar aviso como lido | `POST notifications/company/{id}/read` · `POST notifications/company/read-all` | Bearer | Sim |
| **Agendar coleta** do reservatório selecionado | `POST collection-request/company/schedule` `{ sensorId, scheduledDate? }` | Bearer | Sim |
| Iniciar etapa de coleta de uma solicitação | `POST collection-request/{id}/accept` `{}` ou `{ scheduledDate }` → `SCHEDULED` | Bearer | — (o "Agendar coleta" faz o mesmo) |
| Concluir coleta | `POST collection-request/{id}/company-complete` `{}` → `COMPLETED`, barril volta a 0% | Bearer | Sim |
| Recusar | `POST collection-request/{id}/refuse` → `REFUSED` | Bearer | Sim |
| Histórico | `GET collection-request/company/history` | Bearer | Sim |
| Comprovante da coleta (Blob Storage) | `GET collection-request/company/{id}/receipt` | Bearer | Sim |

"Agendar coleta" serve para os dois casos do documento de funcionalidades:
- o barril já tem solicitação do sensor (`PENDING`): ela é aceita e passa a `SCHEDULED`;
- o barril ainda não atingiu o limite: é criada uma solicitação nova, `origin: "COMPANY"`, já `SCHEDULED`, e o síndico é notificado.
Nunca existem duas coletas abertas para o mesmo barril.

## interface-desktop-adm-coillect

Sem login no MVP, como a interface desktop atual espera.

| Ação | Rota | No app |
|---|---|---|
| Visão geral (contadores, barris, últimas 50 solicitações) | `GET admin/overview` | Sim |
| Leituras recebidas dos sensores | `GET admin/readings` (`?sensorId=CLT-8472-A&limit=50`) | Sim |
| Síndicos | `GET admin/sindicos` · `POST admin/sindicos` | Sim |
| Empresas coletoras | `GET admin/companies` · `POST admin/companies` | Sim |
| Condomínios (com síndico e empresa) | `GET admin/condominiums` · `POST admin/condominiums` · `PATCH admin/condominiums/{id}` | Sim (lista e cadastro) |
| Barris | `GET admin/barrels` · `POST admin/barrels` · `PATCH admin/barrels/{id}` | Sim (lista e cadastro) |
| Sensores (ex.: cadastrar o ESP32) | `GET admin/sensors` · `POST admin/sensors` · `PATCH admin/sensors/{sensorId}` | Sim (lista e cadastro) |
| Reiniciar a demonstração | `POST admin/demo/reset` | Sim |
| Nuvem: Blob (comprovantes) e Queue (fila) | `GET admin/cloud` | Sim |
| Pausar/retomar o consumidor da fila (só com Azure) | `POST admin/cloud/queue/pause` · `POST admin/cloud/queue/resume` | Sim |

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
| `GET health` | API no ar e banco conectado (`data.database = "up"`, HTTP 503 se o banco cair); `data.storage` = `azure` ou `local`; usado pela cloud |
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
| Síndico tocou em "Precisa de ajuda?" (`HELP_REQUESTED`, sem solicitação: `requestId: null`) | "Pedido de ajuda enviado" | "Pedido de ajuda • Residencial Aurora" com a mensagem |

As notificações passam pela **fila** (Azure Queue Storage, ou em memória sem Azure): com o Azure elas chegam 1–2 s depois da solicitação. Ver [azure-a02.md](azure-a02.md).

**Comprovante** (`…/receipt`), gravado no Blob Storage na conclusão da coleta (`receiptAvailable: true` na solicitação):

```json
{
  "requestId": 12,
  "receipt": {
    "tipo": "comprovante-de-coleta", "versao": 1, "protocolo": "COL-000012", "solicitacaoId": 12, "origem": "SENSOR",
    "condominio": { "nome": "Residencial Aurora", "endereco": "Rua das Acácias, 120 - São Paulo/SP", "bairro": "Jardim Paulista" },
    "sindico": { "nome": "Leonardo Costa", "email": "sindico@coillect.com" },
    "empresaColetora": { "nome": "EcoColeta Ambiental", "cnpj": "11222333000181" },
    "barril": { "codigo": "BRL-8472", "capacidadeLitros": 200, "limiteAlertaPercentual": 80 },
    "sensor": "CLT-8472-A", "nivelNoAlertaPercentual": 86, "volumeEstimadoLitros": 172,
    "solicitadaEm": "…", "agendadaPara": "…", "concluidaEm": "…", "emitidoEm": "…",
    "armazenamento": { "provedor": "Azure Blob Storage", "container": "comprovantes-coleta", "blob": "2026/11/16/coleta-12-20261116T143015Z.json" }
  },
  "storage": { "mode": "azure", "provider": "Azure Blob Storage", "container": "comprovantes-coleta", "blob": "2026/11/16/coleta-12-20261116T143015Z.json" }
}
```

Antes da conclusão (ou nos primeiros segundos depois dela, enquanto a fila processa) a rota responde 404.

**Nuvem** (`GET admin/cloud`):

```json
{
  "mode": "azure",
  "blob": { "provider": "Azure Blob Storage", "account": "stcoillect", "container": "comprovantes-coleta", "count": 3,
            "recent": [{ "name": "2026/11/16/coleta-12-….json", "size": 812, "lastModified": "…" }], "error": null },
  "queue": { "provider": "Azure Queue Storage", "name": "coillect-notificacoes", "poisonQueue": "coillect-notificacoes-poison",
             "waiting": 0, "published": 9, "processed": 9, "failed": 0, "poisoned": 0, "fallbacks": 0, "paused": false, "lastError": null }
}
```

## Tempo limite nos apps

Os três apps esperam até 15 s para conectar e 60 s pela resposta: uma API em plano que "dorme" (Render gratuito, App Service sem Always On) leva até ~1 min para acordar. Ver [deploy-cloud.md](deploy-cloud.md).
