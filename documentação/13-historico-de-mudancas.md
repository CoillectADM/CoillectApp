# Histórico de mudanças

Parte da [documentação do Coillect](README.md).

Este documento lista tudo o que foi criado e alterado no projeto, Pull Request por Pull Request, nos
quatro repositórios: o que cada PR fez, quando foi aberto e mesclado, quantas linhas mudou e a lista
completa de arquivos. Os horários estão no fuso de Brasília (UTC−3); todos os PRs foram mesclados na
`main` em 10/11/2026. Os PRs com código só foram mesclados com o CI verde; o PR #5 do CoillectApp,
só de documentação, não dispara o CI.

## Sumário

- [Como era antes](#como-era-antes)
- [Linha do tempo](#linha-do-tempo)
- [CoillectApp](#coillectapp)
- [app-mobile-sindico](#app-mobile-sindico)
- [app-mobile-empresa](#app-mobile-empresa)
- [interface-desktop-adm-coillect](#interface-desktop-adm-coillect)
- [Totais](#totais)

## Como era antes

| Repositório | Ponto de partida | O que já existia |
|---|---|---|
| CoillectApp | Commit `76f12374` ("atualizacao swagger", 30/11/2025), com commits do Allan e da Mattia desde 11/06/2025 | API NestJS com cadastro e login (JWT, bcrypt) de usuários e empresas, cadastro de empresa em etapas, solicitações de coleta manuais com histórico, Swagger e migrations; frontend web em React; `docker-compose.yaml` com banco, backend e frontend. Não havia sensor, barril, regra de disparo, notificações, rotas para os apps, testes no CI nem documentação do fluxo. |
| app-mobile-sindico, app-mobile-empresa, interface-desktop-adm-coillect | Repositórios criados em 09/11/2026, às 23h29, com a cópia do CoillectMobileRemake (commit `4d594a3`) no "Initial commit" | Um único app Android genérico (pacote `com.example.coillectremake`) com login, cadastro, mapa e pedido de coleta pelo usuário. Os PRs #1 de cada repositório mostram exatamente o que mudou em relação a essa base. |

## Linha do tempo

| Mesclado em | Repositório | PR | Título | Arquivos | Linhas |
|---|---|---|---|---|---|
| 10/11/2026 01:36 | CoillectApp | [#1](https://github.com/CoillectADM/CoillectApp/pull/1) | API do MVP: sensor → solicitação de coleta → apps (síndico, empresa, admin) + cloud | 61 | +3766 / −353 |
| 10/11/2026 01:38 | CoillectApp | [#2](https://github.com/CoillectADM/CoillectApp/pull/2) | API alinhada aos diagramas: barril, aviso da empresa, Agendar coleta e síndico só notificado | 55 | +2502 / −669 |
| 10/11/2026 01:39 | app-mobile-sindico | [#1](https://github.com/CoillectADM/app-mobile-sindico/pull/1) | App do síndico: escopo do MVP a partir do MobileRemake | 36 | +1048 / −882 |
| 10/11/2026 01:39 | app-mobile-empresa | [#1](https://github.com/CoillectADM/app-mobile-empresa/pull/1) | App da empresa: escopo do MVP a partir do MobileRemake | 36 | +1183 / −883 |
| 10/11/2026 01:40 | interface-desktop-adm-coillect | [#1](https://github.com/CoillectADM/interface-desktop-adm-coillect/pull/1) | Interface desktop do admin: base do MobileRemake em Compose Desktop | 51 | +983 / −1238 |
| 10/11/2026 02:50 | CoillectApp | [#3](https://github.com/CoillectADM/CoillectApp/pull/3) | Sensor ESP32 virtual (Wokwi) e físico, sensor virtual no PC e testes | 26 | +3298 / −56 |
| 10/11/2026 03:32 | CoillectApp | [#4](https://github.com/CoillectADM/CoillectApp/pull/4) | Azure Storage (A02): comprovantes no Blob, notificações pela Queue, monitoramento e docs | 45 | +3415 / −104 |
| 10/11/2026 03:54 | app-mobile-sindico | [#2](https://github.com/CoillectADM/app-mobile-sindico/pull/2) | Telas do mockup: visão geral, simular leitura, ajuda, notificações e histórico com comprovante | 19 | +1628 / −221 |
| 10/11/2026 03:54 | app-mobile-empresa | [#2](https://github.com/CoillectADM/app-mobile-empresa/pull/2) | Central de coletas: telas do mockup, avisos, histórico e comprovante | 18 | +1333 / −300 |
| 10/11/2026 03:54 | interface-desktop-adm-coillect | [#2](https://github.com/CoillectADM/interface-desktop-adm-coillect/pull/2) | Administração: leituras ao vivo, cadastros, aba Nuvem (Azure) e reiniciar demonstração | 14 | +1161 / −42 |
| 10/11/2026 03:54 | CoillectApp | [#5](https://github.com/CoillectADM/CoillectApp/pull/5) | Guia para o Codex: LEIA-PRIMEIRO-CODEX.txt | 3 | +471 / −0 |
| 10/11/2026 04:44 | app-mobile-sindico | [#3](https://github.com/CoillectADM/app-mobile-sindico/pull/3) | Celular de verdade: Testar conexão, endereço simplificado, servidor lembrado e APK fixo | 16 | +478 / −12 |
| 10/11/2026 04:44 | app-mobile-empresa | [#3](https://github.com/CoillectADM/app-mobile-empresa/pull/3) | Celular de verdade: Testar conexão, endereço simplificado, servidor lembrado e APK fixo | 16 | +478 / −12 |
| 10/11/2026 04:44 | interface-desktop-adm-coillect | [#3](https://github.com/CoillectADM/interface-desktop-adm-coillect/pull/3) | Servidor da API: aceita só o IP/domínio e completa http(s), porta e /api | 3 | +68 / −1 |
| 10/11/2026 04:46 | CoillectApp | [#6](https://github.com/CoillectADM/CoillectApp/pull/6) | Celulares e vários clientes ao mesmo tempo: um barril por vez + endereço para os celulares | 11 | +395 / −11 |

## CoillectApp

Repositório [CoillectApp](https://github.com/CoillectADM/CoillectApp) (público).

### PR #1: API do MVP: sensor → solicitação de coleta → apps (síndico, empresa, admin) + cloud

| Campo | Valor |
|---|---|
| Link | https://github.com/CoillectADM/CoillectApp/pull/1 |
| Branch | `api-mvp` → `main` |
| Aberto em | 10/11/2026 00:23 |
| Mesclado em | 10/11/2026 01:36 (commit `792c9092`) |
| Arquivos | 61 (49 adicionados, 12 modificados) |
| Linhas | +3766 / −353 |

O que mudou:

- Refatora a API (`backend/`) para o MVP e para os três apps: rota única do sensor (`POST /api/sensor/readings`, que no PR #2 ganhou o nome do diagrama, `POST /api/sensor-alert`), listener `sensor-trigger.listener.ts` e regra `collection-trigger.rule.ts` (80% por padrão, sem duplicar enquanto houver solicitação aberta).
- Entidades novas de condomínio, sensor e histórico de leituras; notificações do síndico (`/api/notifications/*`) vinculadas à solicitação da empresa; barramento de eventos de domínio em memória.
- Rotas do desktop (`/api/admin/*`): visão geral, leituras, cadastro de condomínio e sensor, listas e reinício da demonstração. `GET /api/health`, `GET /api/sensor/{sensorId}/status` e dados de demonstração automáticos.
- Ajustes no que já existia: `company/active` passa a trazer `PENDING` e `SCHEDULED`; nova rota `:id/company-complete` (barril volta a 0%); `:id/accept` usa a data atual em vez de +5 dias; respostas sem hash de senha; login devolve `role` e `profile` além do `access_token`.
- Preparação para a nuvem: `PORT`, `DATABASE_URL` ou `DATABASE_*`, `DATABASE_SSL`, `DATABASE_SYNC`, escuta em `0.0.0.0`, Dockerfile sem host fixo, `docker-compose.yaml` com `.env` opcional, `render.yaml` e `docs/deploy-cloud.md`.
- Documentação (`docs/api-apps.md`, `docs/estado-atual.md`, `backend/README.md`) e CI (`.github/workflows/backend.yml`: build, testes unitários, e2e com PostgreSQL e imagem Docker com smoke test).

<details>
<summary>Arquivos alterados (61)</summary>

| Arquivo | Mudança | + | − |
|---|---|---|---|
| `.github/scripts/report_errors.py` | adicionado | 62 | 0 |
| `.github/workflows/backend.yml` | adicionado | 132 | 0 |
| `backend/.env.example` | adicionado | 25 | 0 |
| `backend/Dockerfile` | modificado | 6 | 9 |
| `backend/README.md` | modificado | 51 | 65 |
| `backend/package.json` | modificado | 8 | 2 |
| `backend/scripts/smoke-flow.mjs` | adicionado | 103 | 0 |
| `backend/src/admin/admin.controller.ts` | adicionado | 137 | 0 |
| `backend/src/admin/admin.module.ts` | adicionado | 32 | 0 |
| `backend/src/admin/admin.service.ts` | adicionado | 286 | 0 |
| `backend/src/admin/dto/condominium.dto.ts` | adicionado | 63 | 0 |
| `backend/src/admin/dto/sensor-admin.dto.ts` | adicionado | 63 | 0 |
| `backend/src/app.module.ts` | modificado | 17 | 34 |
| `backend/src/app.setup.ts` | adicionado | 41 | 0 |
| `backend/src/auth/auth.service.ts` | modificado | 4 | 0 |
| `backend/src/collection-request/collection-request.controller.ts` | modificado | 114 | 131 |
| `backend/src/collection-request/collection-request.entity.ts` | modificado | 31 | 0 |
| `backend/src/collection-request/collection-request.module.ts` | modificado | 6 | 1 |
| `backend/src/collection-request/collection-request.service.ts` | modificado | 213 | 69 |
| `backend/src/collection-request/collection-request.view.spec.ts` | adicionado | 51 | 0 |
| `backend/src/collection-request/collection-request.view.ts` | adicionado | 74 | 0 |
| `backend/src/collection-request/collection-trigger.rule.spec.ts` | adicionado | 35 | 0 |
| `backend/src/collection-request/collection-trigger.rule.ts` | adicionado | 36 | 0 |
| `backend/src/collection-request/dto/accept-collection-request.dto.ts` | adicionado | 13 | 0 |
| `backend/src/collection-request/sensor-trigger.listener.ts` | adicionado | 68 | 0 |
| `backend/src/config/database.config.spec.ts` | adicionado | 49 | 0 |
| `backend/src/config/database.config.ts` | adicionado | 36 | 0 |
| `backend/src/config/env.ts` | adicionado | 13 | 0 |
| `backend/src/demo/demo-data.ts` | adicionado | 46 | 0 |
| `backend/src/demo/demo-seed.service.ts` | adicionado | 147 | 0 |
| `backend/src/demo/demo.module.ts` | adicionado | 14 | 0 |
| `backend/src/events/domain-events.service.spec.ts` | adicionado | 30 | 0 |
| `backend/src/events/domain-events.service.ts` | adicionado | 38 | 0 |
| `backend/src/events/domain-events.ts` | adicionado | 54 | 0 |
| `backend/src/events/events.module.ts` | adicionado | 9 | 0 |
| `backend/src/health/health.controller.ts` | adicionado | 32 | 0 |
| `backend/src/main.ts` | modificado | 12 | 41 |
| `backend/src/notification/notification.controller.ts` | adicionado | 81 | 0 |
| `backend/src/notification/notification.entity.ts` | adicionado | 48 | 0 |
| `backend/src/notification/notification.listener.ts` | adicionado | 59 | 0 |
| `backend/src/notification/notification.module.ts` | adicionado | 14 | 0 |
| `backend/src/notification/notification.service.ts` | adicionado | 115 | 0 |
| `backend/src/notification/notification.view.ts` | adicionado | 31 | 0 |
| `backend/src/sensor/dto/sensor-reading.dto.spec.ts` | adicionado | 46 | 0 |
| `backend/src/sensor/dto/sensor-reading.dto.ts` | adicionado | 37 | 0 |
| `backend/src/sensor/entities/condominium.entity.ts` | adicionado | 42 | 0 |
| `backend/src/sensor/entities/sensor-reading.entity.ts` | adicionado | 25 | 0 |
| `backend/src/sensor/entities/sensor.entity.ts` | adicionado | 49 | 0 |
| `backend/src/sensor/sensor.controller.ts` | adicionado | 101 | 0 |
| `backend/src/sensor/sensor.module.ts` | adicionado | 23 | 0 |
| `backend/src/sensor/sensor.service.ts` | adicionado | 204 | 0 |
| `backend/src/sensor/sensor.view.spec.ts` | adicionado | 48 | 0 |
| `backend/src/sensor/sensor.view.ts` | adicionado | 58 | 0 |
| `backend/test/jest-e2e.json` | modificado | 4 | 0 |
| `backend/test/mvp-flow.e2e-spec.ts` | adicionado | 290 | 0 |
| `docker-compose.yaml` | modificado | 4 | 1 |
| `docs/api-apps.md` | adicionado | 113 | 0 |
| `docs/contrato-sensor.md` | adicionado | 116 | 0 |
| `docs/deploy-cloud.md` | adicionado | 54 | 0 |
| `docs/estado-atual.md` | adicionado | 23 | 0 |
| `render.yaml` | adicionado | 30 | 0 |

</details>

### PR #2: API alinhada aos diagramas: barril, aviso da empresa, Agendar coleta e síndico só notificado

| Campo | Valor |
|---|---|
| Link | https://github.com/CoillectADM/CoillectApp/pull/2 |
| Branch | `api-diagrama` → `main` |
| Aberto em | 10/11/2026 01:22 |
| Mesclado em | 10/11/2026 01:38 (commit `1343c1f1`) |
| Arquivos | 55 (12 adicionados, 41 modificados, 2 removidos) |
| Linhas | +2502 / −669 |

O que mudou:

- Alinha a API aos diagramas de classes: `POST /api/sensor-alert` com o `AlertPayload` `{ sensorId, percentual, dataHora }` (`SensorAlertController.receberAlerta` → `SensorAlertService.processarAlerta`); o formato antigo `{ sensorId, level }` continua aceito.
- Entidade `Barrel` (código, capacidade, `alertThreshold`): sensor → barril → condomínio → síndico e empresa. No máximo uma coleta aberta por barril; sensor sem barril não dispara (`SENSOR_NOT_INSTALLED`).
- `NotificationService.notificarSindico` e `notificarEmpresa`; avisos da empresa em `GET /api/notifications/company` com marcar como lido.
- "Agendar coleta" da empresa: `POST /api/collection-request/company/schedule` aceita a solicitação aberta do barril ou cria uma nova já agendada (origem `COMPANY`).
- O síndico só acompanha: `:id/cancel` e `:id/complete` valem apenas para pedidos `MANUAL`; nas coletas do sensor ou da empresa a API responde 403.
- Admin: `admin/sindicos`, `admin/companies`, `admin/barrels`; sensor instalado em barril (um por barril, 409 no segundo); bairro do condomínio; `online` no sensor; leituras com a `dataHora` do dispositivo.
- Dados de demonstração iguais aos mockups (EcoColeta Ambiental, Leonardo Costa, Residencial Aurora, Condomínio Bosque, Edifício Átria) e `docs/diagramas.md` (classe dos diagramas → arquivo do código). Variáveis novas: `SENSOR_ONLINE_MINUTES` e `APP_TIMEZONE`.
- Remove `sensor-reading.dto.ts` e o seu teste, substituídos por `sensor-alert.payload.ts`.

<details>
<summary>Arquivos alterados (55)</summary>

| Arquivo | Mudança | + | − |
|---|---|---|---|
| `backend/.env.example` | modificado | 5 | 0 |
| `backend/README.md` | modificado | 20 | 10 |
| `backend/package.json` | modificado | 1 | 1 |
| `backend/scripts/smoke-flow.mjs` | modificado | 21 | 10 |
| `backend/src/admin/admin.controller.ts` | modificado | 61 | 9 |
| `backend/src/admin/admin.module.ts` | modificado | 2 | 0 |
| `backend/src/admin/admin.service.ts` | modificado | 284 | 53 |
| `backend/src/admin/dto/condominium.dto.ts` | modificado | 17 | 5 |
| `backend/src/admin/dto/people.dto.ts` | adicionado | 58 | 0 |
| `backend/src/admin/dto/sensor-admin.dto.ts` | modificado | 73 | 9 |
| `backend/src/collection-request/collection-request.controller.ts` | modificado | 25 | 3 |
| `backend/src/collection-request/collection-request.entity.ts` | modificado | 15 | 6 |
| `backend/src/collection-request/collection-request.module.ts` | modificado | 3 | 1 |
| `backend/src/collection-request/collection-request.service.ts` | modificado | 124 | 20 |
| `backend/src/collection-request/collection-request.view.spec.ts` | modificado | 47 | 16 |
| `backend/src/collection-request/collection-request.view.ts` | modificado | 22 | 2 |
| `backend/src/collection-request/collection-trigger.rule.spec.ts` | modificado | 18 | 1 |
| `backend/src/collection-request/collection-trigger.rule.ts` | modificado | 10 | 4 |
| `backend/src/collection-request/dto/schedule-collection.dto.ts` | adicionado | 43 | 0 |
| `backend/src/collection-request/sensor-trigger.listener.ts` | modificado | 14 | 5 |
| `backend/src/demo/demo-data.ts` | modificado | 37 | 16 |
| `backend/src/demo/demo-seed.service.ts` | modificado | 40 | 10 |
| `backend/src/demo/demo.module.ts` | modificado | 4 | 1 |
| `backend/src/events/domain-events.ts` | modificado | 4 | 3 |
| `backend/src/notification/company-notification.controller.ts` | adicionado | 80 | 0 |
| `backend/src/notification/notification.controller.ts` | modificado | 7 | 6 |
| `backend/src/notification/notification.entity.ts` | modificado | 17 | 5 |
| `backend/src/notification/notification.listener.ts` | modificado | 40 | 11 |
| `backend/src/notification/notification.module.ts` | modificado | 3 | 1 |
| `backend/src/notification/notification.service.ts` | modificado | 55 | 49 |
| `backend/src/notification/notification.text.spec.ts` | adicionado | 52 | 0 |
| `backend/src/notification/notification.text.ts` | adicionado | 99 | 0 |
| `backend/src/notification/notification.view.ts` | modificado | 8 | 2 |
| `backend/src/sensor/dto/sensor-alert.payload.spec.ts` | adicionado | 97 | 0 |
| `backend/src/sensor/dto/sensor-alert.payload.ts` | adicionado | 92 | 0 |
| `backend/src/sensor/dto/sensor-reading.dto.spec.ts` | removido | 0 | 46 |
| `backend/src/sensor/dto/sensor-reading.dto.ts` | removido | 0 | 37 |
| `backend/src/sensor/entities/barrel.entity.ts` | adicionado | 54 | 0 |
| `backend/src/sensor/entities/condominium.entity.ts` | modificado | 12 | 6 |
| `backend/src/sensor/entities/sensor-reading.entity.ts` | modificado | 5 | 0 |
| `backend/src/sensor/entities/sensor.entity.ts` | modificado | 11 | 17 |
| `backend/src/sensor/sensor-alert.controller.ts` | adicionado | 47 | 0 |
| `backend/src/sensor/sensor-alert.service.ts` | adicionado | 129 | 0 |
| `backend/src/sensor/sensor-links.ts` | adicionado | 35 | 0 |
| `backend/src/sensor/sensor.controller.ts` | modificado | 17 | 18 |
| `backend/src/sensor/sensor.module.ts` | modificado | 7 | 3 |
| `backend/src/sensor/sensor.service.ts` | modificado | 59 | 116 |
| `backend/src/sensor/sensor.view.spec.ts` | modificado | 42 | 22 |
| `backend/src/sensor/sensor.view.ts` | modificado | 20 | 5 |
| `backend/test/mvp-flow.e2e-spec.ts` | modificado | 305 | 58 |
| `docs/api-apps.md` | modificado | 68 | 35 |
| `docs/contrato-sensor.md` | modificado | 61 | 38 |
| `docs/deploy-cloud.md` | modificado | 5 | 3 |
| `docs/diagramas.md` | adicionado | 120 | 0 |
| `docs/estado-atual.md` | modificado | 7 | 6 |

</details>

### PR #3: Sensor ESP32 virtual (Wokwi) e físico, sensor virtual no PC e testes

| Campo | Valor |
|---|---|
| Link | https://github.com/CoillectADM/CoillectApp/pull/3 |
| Branch | `sensor-esp32` → `main` |
| Aberto em | 10/11/2026 02:22 |
| Mesclado em | 10/11/2026 02:50 (commit `76de2496`) |
| Arquivos | 26 (13 adicionados, 13 modificados) |
| Linhas | +3298 / −56 |

O que mudou:

- Firmware `sensor-esp32/coillect_sensor/coillect_sensor.ino` com as classes do diagrama do sensor; roda no Wokwi e na placa sem mudar o código; `diagram.json` com ESP32, HC-SR04, dois LEDs e botão.
- Sensor virtual no PC (`sensor-esp32/simulador-pc/sensor-virtual.mjs`) com painel em `http://localhost:4010`, vários barris e esvaziamento automático quando a empresa conclui a coleta.
- Ajuste na API: depois de uma coleta concluída o barril fica marcado (`awaitingEmptyReading`) e leituras no limite respondem `AWAITING_EMPTY_READING` até o sensor ler o barril abaixo do limite.
- Testes e CI (`.github/workflows/sensor-esp32.yml`): firmware compilado com g++ no PC com hardware simulado, compilação para ESP32 com `arduino-cli`, requisições do firmware e do sensor virtual contra a API real em Docker.

<details>
<summary>Arquivos alterados (26)</summary>

| Arquivo | Mudança | + | − |
|---|---|---|---|
| `.github/workflows/sensor-esp32.yml` | adicionado | 143 | 0 |
| `backend/README.md` | modificado | 8 | 1 |
| `backend/src/collection-request/collection-trigger.rule.spec.ts` | modificado | 23 | 0 |
| `backend/src/collection-request/collection-trigger.rule.ts` | modificado | 10 | 0 |
| `backend/src/collection-request/sensor-trigger.listener.ts` | modificado | 15 | 0 |
| `backend/src/demo/demo-seed.service.ts` | modificado | 4 | 1 |
| `backend/src/events/domain-events.ts` | modificado | 1 | 0 |
| `backend/src/sensor/entities/barrel.entity.ts` | modificado | 8 | 0 |
| `backend/src/sensor/sensor.service.ts` | modificado | 1 | 0 |
| `backend/test/mvp-flow.e2e-spec.ts` | modificado | 16 | 0 |
| `docs/contrato-sensor.md` | modificado | 16 | 43 |
| `docs/deploy-cloud.md` | modificado | 1 | 1 |
| `docs/diagramas.md` | modificado | 11 | 10 |
| `docs/estado-atual.md` | modificado | 2 | 0 |
| `sensor-esp32/README.md` | adicionado | 171 | 0 |
| `sensor-esp32/coillect_sensor/coillect_sensor.ino` | adicionado | 545 | 0 |
| `sensor-esp32/coillect_sensor/diagram.json` | adicionado | 69 | 0 |
| `sensor-esp32/simulador-pc/sensor-virtual.mjs` | adicionado | 891 | 0 |
| `sensor-esp32/simulador-pc/sensor-virtual.test.mjs` | adicionado | 351 | 0 |
| `sensor-esp32/testes/firmware_testes.cpp` | adicionado | 465 | 0 |
| `sensor-esp32/testes/mocks/Arduino.h` | adicionado | 146 | 0 |
| `sensor-esp32/testes/mocks/HTTPClient.h` | adicionado | 66 | 0 |
| `sensor-esp32/testes/mocks/WiFi.h` | adicionado | 63 | 0 |
| `sensor-esp32/testes/mocks/WiFiClientSecure.h` | adicionado | 10 | 0 |
| `sensor-esp32/testes/reproduzir-na-api.mjs` | adicionado | 135 | 0 |
| `sensor-esp32/testes/simulador-na-api.mjs` | adicionado | 127 | 0 |

</details>

### PR #4: Azure Storage (A02): comprovantes no Blob, notificações pela Queue, monitoramento e docs

| Campo | Valor |
|---|---|
| Link | https://github.com/CoillectADM/CoillectApp/pull/4 |
| Branch | `azure-storage` → `main` |
| Aberto em | 10/11/2026 03:21 |
| Mesclado em | 10/11/2026 03:32 (commit `78df5a85`) |
| Arquivos | 45 (19 adicionados, 26 modificados) |
| Linhas | +3415 / −104 |

O que mudou:

- Atividade A02: Azure Queue Storage (fila `coillect-notificacoes`, poison queue, idempotência por `dedupeKey`, reserva local, pausar e retomar o consumidor) e Azure Blob Storage (comprovante JSON da coleta no container `comprovantes-coleta`).
- Rotas novas: comprovante do síndico e da empresa, `POST /api/help-request` ("Precisa de ajuda?"), `GET /api/admin/cloud`, `POST /api/admin/cloud/queue/pause` e `resume`. A solicitação ganha `receiptAvailable` e `receiptBlob`.
- Monitoramento por eventos JSON no stdout (`cloud/telemetry.ts`); `GET /api/health` responde 503 sem banco e informa `storage: azure|local`.
- Cliente do Storage pela API REST (Shared Key ou SAS), sem SDK e sem dependência npm nova; Azurite no `docker-compose.yaml`; workflow `imagem-api.yml` publica `ghcr.io/coillectadm/coillect-api`; guia `docs/azure-a02.md`.

<details>
<summary>Arquivos alterados (45)</summary>

| Arquivo | Mudança | + | − |
|---|---|---|---|
| `.github/workflows/backend.yml` | modificado | 84 | 0 |
| `.github/workflows/imagem-api.yml` | adicionado | 48 | 0 |
| `backend/.dockerignore` | modificado | 3 | 0 |
| `backend/.env.example` | modificado | 16 | 0 |
| `backend/.gitignore` | modificado | 3 | 0 |
| `backend/README.md` | modificado | 18 | 7 |
| `backend/package.json` | modificado | 2 | 1 |
| `backend/scripts/smoke-flow.mjs` | modificado | 37 | 5 |
| `backend/src/app.module.ts` | modificado | 3 | 0 |
| `backend/src/cloud/azure-storage.client.spec.ts` | adicionado | 144 | 0 |
| `backend/src/cloud/azure-storage.client.ts` | adicionado | 470 | 0 |
| `backend/src/cloud/blob-storage.service.ts` | adicionado | 244 | 0 |
| `backend/src/cloud/cloud.config.spec.ts` | adicionado | 34 | 0 |
| `backend/src/cloud/cloud.config.ts` | adicionado | 58 | 0 |
| `backend/src/cloud/cloud.controller.ts` | adicionado | 66 | 0 |
| `backend/src/cloud/cloud.module.ts` | adicionado | 27 | 0 |
| `backend/src/cloud/message-queue.service.spec.ts` | adicionado | 150 | 0 |
| `backend/src/cloud/message-queue.service.ts` | adicionado | 384 | 0 |
| `backend/src/cloud/telemetry.spec.ts` | adicionado | 27 | 0 |
| `backend/src/cloud/telemetry.ts` | adicionado | 49 | 0 |
| `backend/src/collection-request/collection-request.controller.ts` | modificado | 48 | 0 |
| `backend/src/collection-request/collection-request.entity.ts` | modificado | 7 | 0 |
| `backend/src/collection-request/collection-request.module.ts` | modificado | 3 | 1 |
| `backend/src/collection-request/collection-request.service.ts` | modificado | 4 | 2 |
| `backend/src/collection-request/collection-request.view.ts` | modificado | 6 | 0 |
| `backend/src/collection-request/receipt.service.ts` | adicionado | 77 | 0 |
| `backend/src/collection-request/receipt.spec.ts` | adicionado | 73 | 0 |
| `backend/src/collection-request/receipt.ts` | adicionado | 108 | 0 |
| `backend/src/health/health.controller.ts` | modificado | 23 | 7 |
| `backend/src/notification/help-request.controller.ts` | adicionado | 82 | 0 |
| `backend/src/notification/help-request.dto.ts` | adicionado | 20 | 0 |
| `backend/src/notification/notification.entity.ts` | modificado | 18 | 3 |
| `backend/src/notification/notification.listener.ts` | modificado | 136 | 36 |
| `backend/src/notification/notification.module.ts` | modificado | 10 | 2 |
| `backend/src/notification/notification.service.ts` | modificado | 74 | 10 |
| `backend/src/notification/notification.text.spec.ts` | modificado | 31 | 0 |
| `backend/src/notification/notification.text.ts` | modificado | 48 | 0 |
| `backend/src/sensor/sensor-alert.service.ts` | modificado | 13 | 0 |
| `backend/test/azure-storage.e2e-spec.ts` | adicionado | 219 | 0 |
| `backend/test/mvp-flow.e2e-spec.ts` | modificado | 94 | 0 |
| `docker-compose.yaml` | modificado | 16 | 0 |
| `docs/api-apps.md` | modificado | 62 | 23 |
| `docs/azure-a02.md` | adicionado | 357 | 0 |
| `docs/deploy-cloud.md` | modificado | 16 | 7 |
| `docs/estado-atual.md` | modificado | 3 | 0 |

</details>

### PR #5: Guia para o Codex: LEIA-PRIMEIRO-CODEX.txt

| Campo | Valor |
|---|---|
| Link | https://github.com/CoillectADM/CoillectApp/pull/5 |
| Branch | `guia-codex` → `main` |
| Aberto em | 10/11/2026 03:53 |
| Mesclado em | 10/11/2026 03:54 (commit `25af9ead`) |
| Arquivos | 3 (3 adicionados) |
| Linhas | +471 / −0 |

O que mudou:

- `LEIA-PRIMEIRO-CODEX.txt` na raiz: guia para o Codex ler antes de qualquer ação (como o projeto funciona, rodar localmente, testar, roteiro da aula, deploys e mapa da A02).
- `AGENTS.md` (lido automaticamente pelo Codex) e `README.md` da raiz apontando para o guia.

<details>
<summary>Arquivos alterados (3)</summary>

| Arquivo | Mudança | + | − |
|---|---|---|---|
| `AGENTS.md` | adicionado | 13 | 0 |
| `LEIA-PRIMEIRO-CODEX.txt` | adicionado | 443 | 0 |
| `README.md` | adicionado | 15 | 0 |

</details>

### PR #6: Celulares e vários clientes ao mesmo tempo: um barril por vez + endereço para os celulares

| Campo | Valor |
|---|---|
| Link | https://github.com/CoillectADM/CoillectApp/pull/6 |
| Branch | `celulares-api` → `main` |
| Aberto em | 10/11/2026 04:44 |
| Mesclado em | 10/11/2026 04:46 (commit `e5c4253d`) |
| Arquivos | 11 (4 adicionados, 7 modificados) |
| Linhas | +395 / −11 |

O que mudou:

- Trava por barril (`collection-request/barrel-lock.ts`) usada pelo listener do sensor e pelo "Agendar coleta": com vários clientes simultâneos, no máximo uma solicitação aberta por barril. Teste unitário e e2e de concorrência (5 leituras + 1 agendamento simultâneos).
- `backend/scripts/endereco-celular.mjs`: mostra o endereço da API para digitar nos celulares, confere se ele responde e imprime o comando do firewall do Windows; testado com `node --test` e executado no CI contra o contêiner.
- Documentação: §5.5.1 "Celulares de verdade" e problemas comuns no `LEIA-PRIMEIRO-CODEX.txt`; seção de vários clientes em `docs/api-apps.md`.

<details>
<summary>Arquivos alterados (11)</summary>

| Arquivo | Mudança | + | − |
|---|---|---|---|
| `.github/workflows/backend.yml` | modificado | 7 | 0 |
| `LEIA-PRIMEIRO-CODEX.txt` | modificado | 42 | 8 |
| `backend/package.json` | modificado | 1 | 1 |
| `backend/scripts/endereco-celular.mjs` | adicionado | 103 | 0 |
| `backend/scripts/endereco-celular.test.mjs` | adicionado | 54 | 0 |
| `backend/src/collection-request/barrel-lock.spec.ts` | adicionado | 72 | 0 |
| `backend/src/collection-request/barrel-lock.ts` | adicionado | 44 | 0 |
| `backend/src/collection-request/collection-request.service.ts` | modificado | 12 | 0 |
| `backend/src/collection-request/sensor-trigger.listener.ts` | modificado | 18 | 1 |
| `backend/test/mvp-flow.e2e-spec.ts` | modificado | 34 | 0 |
| `docs/api-apps.md` | modificado | 8 | 1 |

</details>

## app-mobile-sindico

Repositório [app-mobile-sindico](https://github.com/CoillectADM/app-mobile-sindico) (privado).

### PR #1: App do síndico: escopo do MVP a partir do MobileRemake

| Campo | Valor |
|---|---|
| Link | https://github.com/CoillectADM/app-mobile-sindico/pull/1 |
| Branch | `escopo-mvp` → `main` |
| Aberto em | 09/11/2026 23:37 |
| Mesclado em | 10/11/2026 01:39 (commit `a68fd0d5`) |
| Arquivos | 36 (15 adicionados, 5 modificados, 13 removidos, 3 renomeados) |
| Linhas | +1048 / −882 |

O que mudou:

- Transforma a cópia do CoillectMobileRemake no app do síndico (pacote `br.com.coillect.sindico`): painel do barril (nível, limite, empresa, sensor, última leitura) e notificação com a cópia informativa da solicitação (`GET collection-request/my-active`).
- Login do síndico (`POST auth/login`) com endereço da API editável, atualização automática a cada 5 s e modo demonstração em memória.
- Remove o que não é do síndico: cadastro, recuperação de senha, mapa e solicitar/cancelar coleta (e o teste instrumentado `CollectionFlowTest.kt`).

<details>
<summary>Arquivos alterados (36)</summary>

| Arquivo | Mudança | + | − |
|---|---|---|---|
| `.github/scripts/report_errors.py` | adicionado | 42 | 0 |
| `.github/workflows/android.yml` | adicionado | 31 | 0 |
| `AGENTS.md` | adicionado | 10 | 0 |
| `README.md` | modificado | 40 | 79 |
| `app/build.gradle.kts` | modificado | 11 | 14 |
| `app/src/androidTest/java/com/example/coillectremake/CollectionFlowTest.kt` | removido | 0 | 32 |
| `app/src/main/AndroidManifest.xml` | modificado | 3 | 2 |
| `app/src/main/java/br/com/coillect/sindico/MainActivity.kt` | renomeado | 4 | 4 |
| `app/src/main/java/br/com/coillect/sindico/data/ApiSindicoRepository.kt` | adicionado | 62 | 0 |
| `app/src/main/java/br/com/coillect/sindico/data/CoillectHttp.kt` | adicionado | 74 | 0 |
| `app/src/main/java/br/com/coillect/sindico/data/DemoSindicoRepository.kt` | adicionado | 59 | 0 |
| `app/src/main/java/br/com/coillect/sindico/domain/FormValidation.kt` | adicionado | 7 | 0 |
| `app/src/main/java/br/com/coillect/sindico/domain/Models.kt` | adicionado | 51 | 0 |
| `app/src/main/java/br/com/coillect/sindico/ui/SindicoApp.kt` | adicionado | 55 | 0 |
| `app/src/main/java/br/com/coillect/sindico/ui/SindicoViewModel.kt` | adicionado | 155 | 0 |
| `app/src/main/java/br/com/coillect/sindico/ui/auth/LoginScreen.kt` | adicionado | 51 | 0 |
| `app/src/main/java/br/com/coillect/sindico/ui/components/Components.kt` | renomeado | 48 | 19 |
| `app/src/main/java/br/com/coillect/sindico/ui/dashboard/DashboardScreen.kt` | adicionado | 174 | 0 |
| `app/src/main/java/br/com/coillect/sindico/ui/theme/CoillectTheme.kt` | renomeado | 1 | 1 |
| `app/src/main/java/com/example/coillectremake/data/ApiCoillectRepository.kt` | removido | 0 | 21 |
| `app/src/main/java/com/example/coillectremake/data/DemoCoillectRepository.kt` | removido | 0 | 20 |
| `app/src/main/java/com/example/coillectremake/domain/CoillectRepository.kt` | removido | 0 | 30 |
| `app/src/main/java/com/example/coillectremake/domain/FormValidation.kt` | removido | 0 | 17 |
| `app/src/main/java/com/example/coillectremake/ui/CoillectApp.kt` | removido | 0 | 68 |
| `app/src/main/java/com/example/coillectremake/ui/CoillectViewModel.kt` | removido | 0 | 117 |
| `app/src/main/java/com/example/coillectremake/ui/auth/AuthScreens.kt` | removido | 0 | 98 |
| `app/src/main/java/com/example/coillectremake/ui/dashboard/CollectionDialogs.kt` | removido | 0 | 39 |
| `app/src/main/java/com/example/coillectremake/ui/dashboard/CollectionMap.kt` | removido | 0 | 48 |
| `app/src/main/java/com/example/coillectremake/ui/dashboard/DashboardScreen.kt` | removido | 0 | 126 |
| `app/src/test/java/br/com/coillect/sindico/ApiMappingTest.kt` | adicionado | 40 | 0 |
| `app/src/test/java/br/com/coillect/sindico/FormValidationTest.kt` | adicionado | 15 | 0 |
| `app/src/test/java/br/com/coillect/sindico/SindicoViewModelTest.kt` | adicionado | 113 | 0 |
| `app/src/test/java/com/example/coillectremake/CoillectViewModelTest.kt` | removido | 0 | 111 |
| `app/src/test/java/com/example/coillectremake/FormValidationTest.kt` | removido | 0 | 29 |
| `gradle/libs.versions.toml` | modificado | 1 | 5 |
| `settings.gradle.kts` | modificado | 1 | 2 |

</details>

### PR #2: Telas do mockup: visão geral, simular leitura, ajuda, notificações e histórico com comprovante

| Campo | Valor |
|---|---|
| Link | https://github.com/CoillectADM/app-mobile-sindico/pull/2 |
| Branch | `telas-mockup` → `main` |
| Aberto em | 10/11/2026 03:38 |
| Mesclado em | 10/11/2026 03:54 (commit `02388da4`) |
| Arquivos | 19 (5 adicionados, 14 modificados) |
| Linhas | +1628 / −221 |

O que mudou:

- Telas no visual do mockup "Visão geral": saudação, dados do condomínio, nível do reservatório com o barril desenhado e a situação da coleta.
- "Simular leitura do sensor" (envia o mesmo `POST /api/sensor-alert` do ESP32), "Precisa de ajuda?" (`POST /api/help-request`), menu com Notificações (badge, marcar como lidas) e Histórico de coletas com o comprovante do Blob.
- Tema com as cores do mockup, tempo limite HTTP de 15 s para conectar e 60 s para responder, modo demonstração atualizado e `AGENTS.md` apontando para o guia do Codex.

<details>
<summary>Arquivos alterados (19)</summary>

| Arquivo | Mudança | + | − |
|---|---|---|---|
| `AGENTS.md` | modificado | 4 | 2 |
| `README.md` | modificado | 26 | 20 |
| `app/src/main/java/br/com/coillect/sindico/data/ApiSindicoRepository.kt` | modificado | 121 | 6 |
| `app/src/main/java/br/com/coillect/sindico/data/CoillectHttp.kt` | modificado | 6 | 2 |
| `app/src/main/java/br/com/coillect/sindico/data/DemoSindicoRepository.kt` | modificado | 110 | 11 |
| `app/src/main/java/br/com/coillect/sindico/domain/Display.kt` | adicionado | 38 | 0 |
| `app/src/main/java/br/com/coillect/sindico/domain/Models.kt` | modificado | 78 | 2 |
| `app/src/main/java/br/com/coillect/sindico/ui/SindicoApp.kt` | modificado | 131 | 10 |
| `app/src/main/java/br/com/coillect/sindico/ui/SindicoViewModel.kt` | modificado | 181 | 7 |
| `app/src/main/java/br/com/coillect/sindico/ui/components/Components.kt` | modificado | 246 | 22 |
| `app/src/main/java/br/com/coillect/sindico/ui/dashboard/DashboardScreen.kt` | modificado | 123 | 114 |
| `app/src/main/java/br/com/coillect/sindico/ui/help/HelpDialog.kt` | adicionado | 64 | 0 |
| `app/src/main/java/br/com/coillect/sindico/ui/history/HistoryScreen.kt` | adicionado | 118 | 0 |
| `app/src/main/java/br/com/coillect/sindico/ui/notifications/NotificationsScreen.kt` | adicionado | 85 | 0 |
| `app/src/main/java/br/com/coillect/sindico/ui/theme/CoillectTheme.kt` | modificado | 31 | 5 |
| `app/src/main/res/values/themes.xml` | modificado | 2 | 2 |
| `app/src/test/java/br/com/coillect/sindico/ApiMappingTest.kt` | modificado | 77 | 8 |
| `app/src/test/java/br/com/coillect/sindico/DisplayTest.kt` | adicionado | 41 | 0 |
| `app/src/test/java/br/com/coillect/sindico/SindicoViewModelTest.kt` | modificado | 146 | 10 |

</details>

### PR #3: Celular de verdade: Testar conexão, endereço simplificado, servidor lembrado e APK fixo

| Campo | Valor |
|---|---|
| Link | https://github.com/CoillectADM/app-mobile-sindico/pull/3 |
| Branch | `celular-api` → `main` |
| Aberto em | 10/11/2026 04:44 |
| Mesclado em | 10/11/2026 04:44 (commit `62bc6d19`) |
| Arquivos | 16 (6 adicionados, 10 modificados) |
| Linhas | +478 / −12 |

O que mudou:

- Celular de verdade: endereço simplificado (`domain/ServerAddress.kt`), botão "Testar conexão" (`GET /api/health`), mensagens de rede claras, servidor e e-mail lembrados (`data/LoginMemory.kt`).
- Chave de debug fixa (`app/coillect-debug.keystore`) e publicação do APK na release `demo` pelo CI; seção "No celular de verdade" no README.

<details>
<summary>Arquivos alterados (16)</summary>

| Arquivo | Mudança | + | − |
|---|---|---|---|
| `.github/workflows/android.yml` | modificado | 21 | 0 |
| `README.md` | modificado | 28 | 2 |
| `app/build.gradle.kts` | modificado | 11 | 0 |
| `app/coillect-debug.keystore` | adicionado | 0 | 0 |
| `app/src/main/java/br/com/coillect/sindico/data/ApiSindicoRepository.kt` | modificado | 23 | 0 |
| `app/src/main/java/br/com/coillect/sindico/data/LoginMemory.kt` | adicionado | 24 | 0 |
| `app/src/main/java/br/com/coillect/sindico/domain/Models.kt` | modificado | 7 | 0 |
| `app/src/main/java/br/com/coillect/sindico/domain/ServerAddress.kt` | adicionado | 41 | 0 |
| `app/src/main/java/br/com/coillect/sindico/ui/Connection.kt` | adicionado | 61 | 0 |
| `app/src/main/java/br/com/coillect/sindico/ui/SindicoApp.kt` | modificado | 26 | 1 |
| `app/src/main/java/br/com/coillect/sindico/ui/SindicoViewModel.kt` | modificado | 36 | 5 |
| `app/src/main/java/br/com/coillect/sindico/ui/auth/LoginScreen.kt` | modificado | 42 | 4 |
| `app/src/test/java/br/com/coillect/sindico/ApiMappingTest.kt` | modificado | 20 | 0 |
| `app/src/test/java/br/com/coillect/sindico/ConnectionTest.kt` | adicionado | 53 | 0 |
| `app/src/test/java/br/com/coillect/sindico/ServerAddressTest.kt` | adicionado | 46 | 0 |
| `app/src/test/java/br/com/coillect/sindico/SindicoViewModelTest.kt` | modificado | 39 | 0 |

</details>

## app-mobile-empresa

Repositório [app-mobile-empresa](https://github.com/CoillectADM/app-mobile-empresa) (privado).

### PR #1: App da empresa: escopo do MVP a partir do MobileRemake

| Campo | Valor |
|---|---|
| Link | https://github.com/CoillectADM/app-mobile-empresa/pull/1 |
| Branch | `escopo-mvp` → `main` |
| Aberto em | 09/11/2026 23:37 |
| Mesclado em | 10/11/2026 01:39 (commit `b4ac9e3e`) |
| Arquivos | 36 (15 adicionados, 5 modificados, 13 removidos, 3 renomeados) |
| Linhas | +1183 / −883 |

O que mudou:

- Transforma a cópia do CoillectMobileRemake no app da empresa coletora (pacote `br.com.coillect.empresa`): solicitações recebidas (`GET collection-request/company/active`) com aviso de nova, iniciar e concluir coleta, condomínios clientes com o nível do barril.
- Login da empresa (`POST auth/company/login`) com endereço da API editável, atualização automática a cada 5 s e modo demonstração com o ciclo completo.
- Remove o que não é da empresa (cadastro, mapa, telas do usuário comum e o teste instrumentado).

<details>
<summary>Arquivos alterados (36)</summary>

| Arquivo | Mudança | + | − |
|---|---|---|---|
| `.github/scripts/report_errors.py` | adicionado | 42 | 0 |
| `.github/workflows/android.yml` | adicionado | 31 | 0 |
| `AGENTS.md` | adicionado | 10 | 0 |
| `README.md` | modificado | 42 | 80 |
| `app/build.gradle.kts` | modificado | 11 | 14 |
| `app/src/androidTest/java/com/example/coillectremake/CollectionFlowTest.kt` | removido | 0 | 32 |
| `app/src/main/AndroidManifest.xml` | modificado | 3 | 2 |
| `app/src/main/java/br/com/coillect/empresa/MainActivity.kt` | renomeado | 4 | 4 |
| `app/src/main/java/br/com/coillect/empresa/data/ApiEmpresaRepository.kt` | adicionado | 83 | 0 |
| `app/src/main/java/br/com/coillect/empresa/data/CoillectHttp.kt` | adicionado | 74 | 0 |
| `app/src/main/java/br/com/coillect/empresa/data/DemoEmpresaRepository.kt` | adicionado | 70 | 0 |
| `app/src/main/java/br/com/coillect/empresa/domain/FormValidation.kt` | adicionado | 7 | 0 |
| `app/src/main/java/br/com/coillect/empresa/domain/Models.kt` | adicionado | 49 | 0 |
| `app/src/main/java/br/com/coillect/empresa/ui/EmpresaApp.kt` | adicionado | 57 | 0 |
| `app/src/main/java/br/com/coillect/empresa/ui/EmpresaViewModel.kt` | adicionado | 180 | 0 |
| `app/src/main/java/br/com/coillect/empresa/ui/auth/LoginScreen.kt` | adicionado | 51 | 0 |
| `app/src/main/java/br/com/coillect/empresa/ui/components/Components.kt` | renomeado | 66 | 19 |
| `app/src/main/java/br/com/coillect/empresa/ui/home/HomeScreen.kt` | adicionado | 193 | 0 |
| `app/src/main/java/br/com/coillect/empresa/ui/theme/CoillectTheme.kt` | renomeado | 1 | 1 |
| `app/src/main/java/com/example/coillectremake/data/ApiCoillectRepository.kt` | removido | 0 | 21 |
| `app/src/main/java/com/example/coillectremake/data/DemoCoillectRepository.kt` | removido | 0 | 20 |
| `app/src/main/java/com/example/coillectremake/domain/CoillectRepository.kt` | removido | 0 | 30 |
| `app/src/main/java/com/example/coillectremake/domain/FormValidation.kt` | removido | 0 | 17 |
| `app/src/main/java/com/example/coillectremake/ui/CoillectApp.kt` | removido | 0 | 68 |
| `app/src/main/java/com/example/coillectremake/ui/CoillectViewModel.kt` | removido | 0 | 117 |
| `app/src/main/java/com/example/coillectremake/ui/auth/AuthScreens.kt` | removido | 0 | 98 |
| `app/src/main/java/com/example/coillectremake/ui/dashboard/CollectionDialogs.kt` | removido | 0 | 39 |
| `app/src/main/java/com/example/coillectremake/ui/dashboard/CollectionMap.kt` | removido | 0 | 48 |
| `app/src/main/java/com/example/coillectremake/ui/dashboard/DashboardScreen.kt` | removido | 0 | 126 |
| `app/src/test/java/br/com/coillect/empresa/ApiMappingTest.kt` | adicionado | 50 | 0 |
| `app/src/test/java/br/com/coillect/empresa/EmpresaViewModelTest.kt` | adicionado | 142 | 0 |
| `app/src/test/java/br/com/coillect/empresa/FormValidationTest.kt` | adicionado | 15 | 0 |
| `app/src/test/java/com/example/coillectremake/CoillectViewModelTest.kt` | removido | 0 | 111 |
| `app/src/test/java/com/example/coillectremake/FormValidationTest.kt` | removido | 0 | 29 |
| `gradle/libs.versions.toml` | modificado | 1 | 5 |
| `settings.gradle.kts` | modificado | 1 | 2 |

</details>

### PR #2: Central de coletas: telas do mockup, avisos, histórico e comprovante

| Campo | Valor |
|---|---|
| Link | https://github.com/CoillectADM/app-mobile-empresa/pull/2 |
| Branch | `telas-mockup` → `main` |
| Aberto em | 10/11/2026 03:53 |
| Mesclado em | 10/11/2026 03:54 (commit `ec337753`) |
| Arquivos | 18 (4 adicionados, 14 modificados) |
| Linhas | +1333 / −300 |

O que mudou:

- Telas no visual do mockup "Central de coletas": saudação, contadores de sensores ativos e coletas pendentes, faixa laranja com o aviso mais recente, reservatórios monitorados e painel do selecionado com "Agendar coleta", "Concluir coleta" e "Recusar".
- Menu com Avisos e Histórico de coletas com o comprovante do Blob; nome da empresa vindo do `profile` do login; tempo limite HTTP de 15 s e 60 s; modo demonstração atualizado; `AGENTS.md` apontando para o guia do Codex.

<details>
<summary>Arquivos alterados (18)</summary>

| Arquivo | Mudança | + | − |
|---|---|---|---|
| `AGENTS.md` | modificado | 4 | 2 |
| `README.md` | modificado | 24 | 22 |
| `app/src/main/java/br/com/coillect/empresa/data/ApiEmpresaRepository.kt` | modificado | 101 | 21 |
| `app/src/main/java/br/com/coillect/empresa/data/CoillectHttp.kt` | modificado | 6 | 2 |
| `app/src/main/java/br/com/coillect/empresa/data/DemoEmpresaRepository.kt` | modificado | 75 | 20 |
| `app/src/main/java/br/com/coillect/empresa/domain/Display.kt` | adicionado | 37 | 0 |
| `app/src/main/java/br/com/coillect/empresa/domain/Models.kt` | modificado | 68 | 16 |
| `app/src/main/java/br/com/coillect/empresa/ui/EmpresaApp.kt` | modificado | 127 | 12 |
| `app/src/main/java/br/com/coillect/empresa/ui/EmpresaViewModel.kt` | modificado | 152 | 16 |
| `app/src/main/java/br/com/coillect/empresa/ui/components/Components.kt` | modificado | 109 | 32 |
| `app/src/main/java/br/com/coillect/empresa/ui/history/HistoryScreen.kt` | adicionado | 118 | 0 |
| `app/src/main/java/br/com/coillect/empresa/ui/home/HomeScreen.kt` | modificado | 155 | 120 |
| `app/src/main/java/br/com/coillect/empresa/ui/notices/NoticesScreen.kt` | adicionado | 86 | 0 |
| `app/src/main/java/br/com/coillect/empresa/ui/theme/CoillectTheme.kt` | modificado | 31 | 5 |
| `app/src/main/res/values/themes.xml` | modificado | 2 | 2 |
| `app/src/test/java/br/com/coillect/empresa/ApiMappingTest.kt` | modificado | 61 | 12 |
| `app/src/test/java/br/com/coillect/empresa/DisplayTest.kt` | adicionado | 36 | 0 |
| `app/src/test/java/br/com/coillect/empresa/EmpresaViewModelTest.kt` | modificado | 141 | 18 |

</details>

### PR #3: Celular de verdade: Testar conexão, endereço simplificado, servidor lembrado e APK fixo

| Campo | Valor |
|---|---|
| Link | https://github.com/CoillectADM/app-mobile-empresa/pull/3 |
| Branch | `celular-api` → `main` |
| Aberto em | 10/11/2026 04:44 |
| Mesclado em | 10/11/2026 04:44 (commit `e0051c92`) |
| Arquivos | 16 (6 adicionados, 10 modificados) |
| Linhas | +478 / −12 |

O que mudou:

- Mesmas mudanças do PR #3 do app do síndico: endereço simplificado, "Testar conexão", mensagens de rede, servidor e e-mail lembrados, chave de debug fixa e APK na release `demo`.

<details>
<summary>Arquivos alterados (16)</summary>

| Arquivo | Mudança | + | − |
|---|---|---|---|
| `.github/workflows/android.yml` | modificado | 21 | 0 |
| `README.md` | modificado | 28 | 2 |
| `app/build.gradle.kts` | modificado | 11 | 0 |
| `app/coillect-debug.keystore` | adicionado | 0 | 0 |
| `app/src/main/java/br/com/coillect/empresa/data/ApiEmpresaRepository.kt` | modificado | 23 | 0 |
| `app/src/main/java/br/com/coillect/empresa/data/LoginMemory.kt` | adicionado | 24 | 0 |
| `app/src/main/java/br/com/coillect/empresa/domain/Models.kt` | modificado | 7 | 0 |
| `app/src/main/java/br/com/coillect/empresa/domain/ServerAddress.kt` | adicionado | 41 | 0 |
| `app/src/main/java/br/com/coillect/empresa/ui/Connection.kt` | adicionado | 61 | 0 |
| `app/src/main/java/br/com/coillect/empresa/ui/EmpresaApp.kt` | modificado | 26 | 1 |
| `app/src/main/java/br/com/coillect/empresa/ui/EmpresaViewModel.kt` | modificado | 36 | 5 |
| `app/src/main/java/br/com/coillect/empresa/ui/auth/LoginScreen.kt` | modificado | 42 | 4 |
| `app/src/test/java/br/com/coillect/empresa/ApiMappingTest.kt` | modificado | 20 | 0 |
| `app/src/test/java/br/com/coillect/empresa/ConnectionTest.kt` | adicionado | 53 | 0 |
| `app/src/test/java/br/com/coillect/empresa/EmpresaViewModelTest.kt` | modificado | 39 | 0 |
| `app/src/test/java/br/com/coillect/empresa/ServerAddressTest.kt` | adicionado | 46 | 0 |

</details>

## interface-desktop-adm-coillect

Repositório [interface-desktop-adm-coillect](https://github.com/CoillectADM/interface-desktop-adm-coillect) (privado).

### PR #1: Interface desktop do admin: base do MobileRemake em Compose Desktop

| Campo | Valor |
|---|---|
| Link | https://github.com/CoillectADM/interface-desktop-adm-coillect/pull/1 |
| Branch | `escopo-mvp` → `main` |
| Aberto em | 09/11/2026 23:37 |
| Mesclado em | 10/11/2026 01:40 (commit `0974e882`) |
| Arquivos | 51 (13 adicionados, 8 modificados, 30 removidos) |
| Linhas | +983 / −1238 |

O que mudou:

- Transforma a cópia do CoillectMobileRemake em um app Compose Multiplatform Desktop (JVM), com o mesmo tema e logo: indicadores, tabela de sensores e barris e tabela de solicitações, atualização a cada 5 s e modo demonstração.
- Remove os arquivos específicos de Android (manifest, tema XML, `.idea`, telas do app antigo).

<details>
<summary>Arquivos alterados (51)</summary>

| Arquivo | Mudança | + | − |
|---|---|---|---|
| `.github/scripts/report_errors.py` | adicionado | 42 | 0 |
| `.github/workflows/desktop.yml` | adicionado | 24 | 0 |
| `.gitignore` | modificado | 1 | 0 |
| `.idea/.gitignore` | removido | 0 | 3 |
| `.idea/AndroidProjectSystem.xml` | removido | 0 | 6 |
| `.idea/compiler.xml` | removido | 0 | 6 |
| `.idea/deploymentTargetSelector.xml` | removido | 0 | 11 |
| `.idea/deviceManager.xml` | removido | 0 | 13 |
| `.idea/gradle.xml` | removido | 0 | 19 |
| `.idea/markdown.xml` | removido | 0 | 8 |
| `.idea/migrations.xml` | removido | 0 | 10 |
| `.idea/misc.xml` | removido | 0 | 10 |
| `.idea/runConfigurations.xml` | removido | 0 | 17 |
| `.idea/vcs.xml` | removido | 0 | 6 |
| `AGENTS.md` | adicionado | 10 | 0 |
| `README.md` | modificado | 33 | 81 |
| `app/build.gradle.kts` | modificado | 21 | 51 |
| `app/proguard-rules.pro` | removido | 0 | 21 |
| `app/src/androidTest/java/com/example/coillectremake/CollectionFlowTest.kt` | removido | 0 | 32 |
| `app/src/main/AndroidManifest.xml` | removido | 0 | 14 |
| `app/src/main/java/com/example/coillectremake/MainActivity.kt` | removido | 0 | 16 |
| `app/src/main/java/com/example/coillectremake/data/ApiCoillectRepository.kt` | removido | 0 | 21 |
| `app/src/main/java/com/example/coillectremake/data/DemoCoillectRepository.kt` | removido | 0 | 20 |
| `app/src/main/java/com/example/coillectremake/domain/CoillectRepository.kt` | removido | 0 | 30 |
| `app/src/main/java/com/example/coillectremake/domain/FormValidation.kt` | removido | 0 | 17 |
| `app/src/main/java/com/example/coillectremake/ui/CoillectApp.kt` | removido | 0 | 68 |
| `app/src/main/java/com/example/coillectremake/ui/CoillectViewModel.kt` | removido | 0 | 117 |
| `app/src/main/java/com/example/coillectremake/ui/auth/AuthScreens.kt` | removido | 0 | 98 |
| `app/src/main/java/com/example/coillectremake/ui/components/Components.kt` | removido | 0 | 93 |
| `app/src/main/java/com/example/coillectremake/ui/dashboard/CollectionDialogs.kt` | removido | 0 | 39 |
| `app/src/main/java/com/example/coillectremake/ui/dashboard/CollectionMap.kt` | removido | 0 | 48 |
| `app/src/main/java/com/example/coillectremake/ui/dashboard/DashboardScreen.kt` | removido | 0 | 126 |
| `app/src/main/java/com/example/coillectremake/ui/theme/CoillectTheme.kt` | removido | 0 | 20 |
| `app/src/main/kotlin/br/com/coillect/admin/Main.kt` | adicionado | 23 | 0 |
| `app/src/main/kotlin/br/com/coillect/admin/data/ApiAdminRepository.kt` | adicionado | 55 | 0 |
| `app/src/main/kotlin/br/com/coillect/admin/data/CoillectHttp.kt` | adicionado | 74 | 0 |
| `app/src/main/kotlin/br/com/coillect/admin/data/DemoAdminRepository.kt` | adicionado | 71 | 0 |
| `app/src/main/kotlin/br/com/coillect/admin/domain/Models.kt` | adicionado | 42 | 0 |
| `app/src/main/kotlin/br/com/coillect/admin/ui/AdminApp.kt` | adicionado | 228 | 0 |
| `app/src/main/kotlin/br/com/coillect/admin/ui/AdminController.kt` | adicionado | 123 | 0 |
| `app/src/main/kotlin/br/com/coillect/admin/ui/Components.kt` | adicionado | 84 | 0 |
| `app/src/main/res/values/themes.xml` | removido | 0 | 10 |
| `app/src/test/java/com/example/coillectremake/CoillectViewModelTest.kt` | removido | 0 | 111 |
| `app/src/test/java/com/example/coillectremake/FormValidationTest.kt` | removido | 0 | 29 |
| `app/src/test/kotlin/br/com/coillect/admin/AdminControllerTest.kt` | adicionado | 100 | 0 |
| `app/src/test/kotlin/br/com/coillect/admin/ApiMappingTest.kt` | adicionado | 37 | 0 |
| `build.gradle.kts` | modificado | 4 | 5 |
| `gradle.properties` | modificado | 0 | 31 |
| `gradle/libs.versions.toml` | modificado | 8 | 21 |
| `gradle/wrapper/gradle-wrapper.properties` | modificado | 1 | 1 |
| `settings.gradle.kts` | modificado | 2 | 9 |

</details>

### PR #2: Administração: leituras ao vivo, cadastros, aba Nuvem (Azure) e reiniciar demonstração

| Campo | Valor |
|---|---|
| Link | https://github.com/CoillectADM/interface-desktop-adm-coillect/pull/2 |
| Branch | `telas-admin` → `main` |
| Aberto em | 10/11/2026 03:53 |
| Mesclado em | 10/11/2026 03:54 (commit `b45efdc3`) |
| Arquivos | 14 (3 adicionados, 11 modificados) |
| Linhas | +1161 / −42 |

O que mudou:

- Abas da administração: Visão geral, Leituras do sensor ao vivo, Cadastros (síndico, empresa, condomínio, barril e sensor) e Nuvem (Azure), com "Pausar/Retomar consumidor" e "Reiniciar demonstração" com confirmação.
- Paleta Coillect, tempo limite HTTP de 15 s e 60 s, testes `AdminControllerTest` e `ApiMappingTest`, README e `AGENTS.md` apontando para o guia do Codex.

<details>
<summary>Arquivos alterados (14)</summary>

| Arquivo | Mudança | + | − |
|---|---|---|---|
| `AGENTS.md` | modificado | 4 | 3 |
| `README.md` | modificado | 18 | 11 |
| `app/src/main/kotlin/br/com/coillect/admin/data/ApiAdminRepository.kt` | modificado | 151 | 7 |
| `app/src/main/kotlin/br/com/coillect/admin/data/CoillectHttp.kt` | modificado | 18 | 2 |
| `app/src/main/kotlin/br/com/coillect/admin/data/DemoAdminRepository.kt` | modificado | 88 | 4 |
| `app/src/main/kotlin/br/com/coillect/admin/domain/Models.kt` | modificado | 83 | 1 |
| `app/src/main/kotlin/br/com/coillect/admin/ui/AdminApp.kt` | modificado | 35 | 3 |
| `app/src/main/kotlin/br/com/coillect/admin/ui/AdminController.kt` | modificado | 144 | 2 |
| `app/src/main/kotlin/br/com/coillect/admin/ui/CloudTab.kt` | adicionado | 121 | 0 |
| `app/src/main/kotlin/br/com/coillect/admin/ui/Components.kt` | modificado | 71 | 7 |
| `app/src/main/kotlin/br/com/coillect/admin/ui/ReadingsTab.kt` | adicionado | 55 | 0 |
| `app/src/main/kotlin/br/com/coillect/admin/ui/RegistryTab.kt` | adicionado | 198 | 0 |
| `app/src/test/kotlin/br/com/coillect/admin/AdminControllerTest.kt` | modificado | 127 | 1 |
| `app/src/test/kotlin/br/com/coillect/admin/ApiMappingTest.kt` | modificado | 48 | 1 |

</details>

### PR #3: Servidor da API: aceita só o IP/domínio e completa http(s), porta e /api

| Campo | Valor |
|---|---|
| Link | https://github.com/CoillectADM/interface-desktop-adm-coillect/pull/3 |
| Branch | `endereco-servidor` → `main` |
| Aberto em | 10/11/2026 04:44 |
| Mesclado em | 10/11/2026 04:44 (commit `4e321739`) |
| Arquivos | 3 (2 adicionados, 1 modificado) |
| Linhas | +68 / −1 |

O que mudou:

- O campo "Servidor da API" aceita só o IP ou o domínio e completa `http://` ou `https://`, a porta 3000 e o `/api` (`domain/ServerAddress.kt`, com teste).

<details>
<summary>Arquivos alterados (3)</summary>

| Arquivo | Mudança | + | − |
|---|---|---|---|
| `app/src/main/kotlin/br/com/coillect/admin/domain/ServerAddress.kt` | adicionado | 41 | 0 |
| `app/src/main/kotlin/br/com/coillect/admin/ui/AdminController.kt` | modificado | 3 | 1 |
| `app/src/test/kotlin/br/com/coillect/admin/ServerAddressTest.kt` | adicionado | 24 | 0 |

</details>

## Totais

| Repositório | PRs | Arquivos alterados (soma por PR) | Linhas adicionadas | Linhas removidas |
|---|---|---|---|---|
| CoillectApp | 6 | 201 | 13847 | 1193 |
| app-mobile-sindico | 3 | 71 | 3154 | 1115 |
| app-mobile-empresa | 3 | 70 | 2994 | 1195 |
| interface-desktop-adm-coillect | 3 | 68 | 2212 | 1281 |
| **Total** | **15** | **410** | **22207** | **4784** |

Um mesmo arquivo alterado em dois PRs conta duas vezes na soma de arquivos. As linhas removidas dos
PRs #1 dos apps são, em grande parte, o código do app genérico do CoillectMobileRemake que deixou de
ser usado.
