# Coillect na Azure — Atividade A02 (Computação em Nuvem II)

Este documento cobre os 6 itens da atividade e o passo a passo para publicar tudo na Azure.
O código já está pronto: a API usa **Blob Storage** e **Queue Storage** de verdade quando
recebe a connection string da Storage Account, e funciona igual sem Azure (modo local) para
desenvolvimento.

| Item da A02 | Onde está |
|---|---|
| 1. Infraestrutura, onde é publicado, recursos | [§1](#1-infraestrutura-e-recursos) |
| 2. Storage Account — Blob Storage | [§2](#2-blob-storage-comprovantes-de-coleta) (implementado) |
| 3. Table **ou** Queue Storage | [§3](#3-queue-storage-fila-de-notificações) — **Queue** (implementado) |
| 4. Monitoramento e dashboards | [§4](#4-monitoramento-e-dashboards) (eventos JSON implementados; painéis configurados no portal) |
| 5. Política de backup | [§5](#5-política-de-backup) |
| 6. Alta disponibilidade | [§6](#6-alta-disponibilidade) (parte no código, parte na configuração) |
| Passo a passo no portal | [§7](#7-passo-a-passo-no-portal-da-azure) |

> **Precisa ser Azure?** "Storage Account", Blob, Queue e Table são serviços da Azure: para
> usá-los de verdade é preciso uma assinatura (o **Azure for Students** dá US$ 100 de crédito por
> 12 meses, sem cartão). Para desenvolver e testar, o emulador oficial **Azurite** roda na sua
> máquina sem conta nenhuma (já está no `docker-compose.yaml` e no CI). A API não fica presa à
> Azure: sem a connection string ela usa disco + memória; e a Storage Account pode ser usada mesmo
> com a API hospedada em outro lugar (ex.: Render). Para a A02, o recomendado é publicar tudo na Azure.

---

## 1. Infraestrutura e recursos

```text
                 ┌──────────── GitHub ─────────────┐
                 │ código + CI (testes, Azurite)   │
                 │ imagem: ghcr.io/coillectadm/    │
                 │         coillect-api:latest     │
                 └───────────────┬─────────────────┘
                                 │ (App Service baixa a imagem)
ESP32 / Wokwi / sensor virtual   ▼
  POST /api/sensor-alert ──►  App Service (Linux, container)  ──►  PostgreSQL Flexible Server
Apps Android (síndico, empresa)   API NestJS "coillect-api"          (usuários, condomínios,
Desktop admin (Windows/Linux) ─►  /api/health (Health check)          barris, sensores, coletas)
                                     │            ▲
                    publica mensagem │            │ consome (1–5 s)
                                     ▼            │
                          Storage Account ────────┘
                           ├─ Queue: coillect-notificacoes (+ -poison)
                           └─ Blob:  comprovantes-coleta/AAAA/MM/DD/coleta-<id>-<data>.json
                                     │
App Service + Storage + PostgreSQL ──► Log Analytics ──► Dashboard "Coillect — Operação"
Application Insights: teste de disponibilidade de /api/health ──► alerta por e-mail
```

| Recurso (nome sugerido) | Serviço / SKU | Função no Coillect | Custo aproximado |
|---|---|---|---|
| `rg-coillect` | Grupo de recursos, região **Brazil South** (ou East US se a assinatura bloquear) | Agrupa tudo; apagar o grupo apaga o projeto | — |
| `stcoillect<sufixo>` | **Storage Account** StorageV2, Standard, LRS (ou GRS, ver §5) | Blob `comprovantes-coleta` e filas `coillect-notificacoes` / `-poison` | centavos de dólar no volume da demonstração |
| `psql-coillect-<sufixo>` | **Azure Database for PostgreSQL Flexible Server**, Burstable **B1ms**, 32 GB | Banco relacional da API | coberto pela oferta gratuita de 12 meses do Azure for Students (750 h de B1ms + 32 GB) |
| `asp-coillect` | **App Service Plan** Linux **B1** | Máquina que roda o container | ~US$ 13/mês (sai do crédito). Container exige Basic ou superior; o F1 gratuito não roda container |
| `app-coillect-<sufixo>` | **Web App for Containers** | API em `https://app-coillect-<sufixo>.azurewebsites.net/api` | incluso no plano |
| `log-coillect` | **Log Analytics workspace** | Logs da API (eventos JSON), logs HTTP e métricas | camada gratuita mensal |
| `appi-coillect` | **Application Insights** (baseado no workspace) | Teste de disponibilidade e alertas | idem |
| Dashboard `Coillect — Operação` | **Painel do portal da Azure** | Gráficos do §4 | grátis |

Fora da Azure: código, CI e imagem Docker no GitHub; firmware no ESP32/Wokwi; APKs dos apps
(gerados pelo CI de cada repositório) e o app desktop no computador da apresentação.

**Onde a API é publicada:** App Service, a partir da imagem `ghcr.io/coillectadm/coillect-api:latest`,
que o workflow [`imagem-api.yml`](../.github/workflows/imagem-api.yml) publica a cada merge na `main`.

---

## 2. Blob Storage: comprovantes de coleta

**O que vai para o Blob:** quando a empresa conclui uma coleta, a API gera o **comprovante da
coleta** (JSON: protocolo, condomínio, síndico, empresa, barril, sensor, nível no alerta, volume
estimado, datas) e grava no container privado `comprovantes-coleta`:

```text
comprovantes-coleta/2026/11/16/coleta-12-20261116T143015Z.json
```

É o tipo de dado que combina com Blob: arquivo, um por coleta, gravado uma vez e lido depois
(documento/arquivo morto). Os apps leem pela API, sem expor a chave da conta:

| Quem | Rota |
|---|---|
| Síndico | `GET /api/collection-request/{id}/receipt` |
| Empresa | `GET /api/collection-request/company/{id}/receipt` |
| Desktop | `GET /api/admin/cloud` (lista os comprovantes recentes) |

**No código:**

- `backend/src/cloud/azure-storage.client.ts` — chamadas REST oficiais do Storage (Put Blob,
  Get Blob, List Blobs, Create Container) com autenticação **Shared Key** (HMAC-SHA256 da chave da
  conta) ou SAS. Sem SDK, sem dependências novas.
- `backend/src/cloud/blob-storage.service.ts` — Azure ou disco local (sem Azure).
- `backend/src/collection-request/receipt.ts` e `receipt.service.ts` — monta e grava o comprovante.

**Como mostrar na aula:** conclua uma coleta no app da empresa → portal da Azure → Storage account
→ **Navegador de armazenamento** → Contêineres de blobs → `comprovantes-coleta` → abra o JSON.
No app (síndico ou empresa), o mesmo comprovante aparece em "Histórico".

---

## 3. Queue Storage: fila de notificações

**Escolha: Queue Storage** (e não Table Storage).

| | Queue Storage | Table Storage |
|---|---|---|
| Para que serve | Mensagens entre partes do sistema, processadas de forma assíncrona | Dados NoSQL chave-valor (consultas por PartitionKey/RowKey) |
| No Coillect | É exatamente o "listener" do projeto: o alerta do sensor vira mensagens que alguém precisa entregar | Duplicaria o PostgreSQL, que já guarda os dados estruturados |
| Ganho | Desacoplamento, nova tentativa automática, absorve picos, permite várias instâncias | Só mais um lugar para guardar a mesma coisa |

**Como funciona:**

1. O sensor manda a leitura → a API grava a leitura e, se o barril passou do limite, cria a
   solicitação de coleta **na hora** (o sensor recebe a resposta com a solicitação).
2. A API publica uma mensagem JSON na fila `coillect-notificacoes`:
   ```json
   { "tipo": "coleta.criada", "requestId": 12, "status": "PENDING", "origem": "SENSOR",
     "id": "5f0c…", "versao": 1, "enviadaEm": "2026-11-16T14:30:15.120Z" }
   ```
   Tipos: `coleta.criada`, `coleta.status` (agendada, concluída, recusada…) e `ajuda.solicitada`
   ("Precisa de ajuda?" do síndico).
3. O consumidor (dentro da API, `backend/src/cloud/message-queue.service.ts`) lê a fila a cada
   1–5 s, entrega os avisos — **empresa**: nova solicitação (faixa laranja do app); **síndico**:
   cópia informativa — e, na conclusão, grava o comprovante no Blob (§2).
4. Só depois de processar ele **apaga** a mensagem. Se a API cair no meio, a mensagem volta a ficar
   visível em 30 s e é processada de novo.

Boas práticas implementadas: **idempotência** (o id da mensagem vira chave única da notificação;
mensagem repetida não duplica aviso), **poison queue** (depois de 5 tentativas a mensagem vai para
`coillect-notificacoes-poison` para análise), **fallback** (se a fila estiver fora do ar, a API
processa localmente e registra o evento `fila_indisponivel`) e **backoff** (fila vazia → lê com
menos frequência, gastando menos transações).

**Como mostrar na aula (desacoplamento ao vivo):**

1. Desktop → aba **Nuvem** → **Pausar consumidor** (ou `POST /api/admin/cloud/queue/pause`).
2. Mande uma leitura de 90% (Wokwi, sensor virtual ou "Simular leitura" no app do síndico).
   A solicitação nasce na hora, mas o aviso **não** chega no app da empresa.
3. Portal → Storage account → Navegador de armazenamento → **Filas** → `coillect-notificacoes`:
   a mensagem está lá, com o JSON.
4. **Retomar consumidor** → em ~1 s a fila esvazia e o aviso aparece no app da empresa.

---

## 4. Monitoramento e dashboards

Três fontes, todas nativas da Azure:

1. **Métricas da plataforma** (sem configurar nada): App Service (Requisições, Erros HTTP 5xx,
   Tempo de resposta, CPU, Memória), Storage (Transações, Capacidade, Contagem de mensagens da fila),
   PostgreSQL (CPU, Conexões ativas, Armazenamento).
2. **Logs da API no Log Analytics**: a API escreve **uma linha JSON por evento de negócio** na saída
   padrão (`backend/src/cloud/telemetry.ts`). O App Service envia isso para a tabela
   `AppServiceConsoleLogs` (coluna `ResultDescription`). Eventos:
   `leitura_sensor`, `solicitacao_criada`, `solicitacao_status`, `fila_mensagem_enviada`,
   `fila_mensagem_processada`, `fila_mensagem_erro`, `fila_mensagem_descartada`,
   `fila_indisponivel`, `comprovante_gerado`, `ajuda_solicitada`, `armazenamento_iniciado`.
   Exemplo de linha:
   ```json
   {"app":"coillect-api","evento":"leitura_sensor","sensorId":"CLT-8472-A","percentual":86,"limite":80,"condominio":"Residencial Aurora","barril":"BRL-8472","disparouColeta":true,"motivo":"THRESHOLD_REACHED","solicitacaoId":12,"em":"2026-11-16T14:30:15.100Z"}
   ```
3. **Application Insights — teste de disponibilidade**: chama `GET /api/health` de vários lugares
   do mundo a cada 5 min. O health responde **503** se o banco cair.

### Consultas KQL (Log Analytics → Logs)

Nível dos barris ao longo do tempo (gráfico de linhas):

```kusto
AppServiceConsoleLogs
| where ResultDescription startswith '{"app":"coillect-api"'
| extend e = parse_json(ResultDescription)
| where tostring(e.evento) == "leitura_sensor"
| summarize nivel = max(toint(e.percentual)) by bin(TimeGenerated, 1m), sensor = tostring(e.sensorId)
| render timechart
```

Solicitações de coleta por condomínio (barras):

```kusto
AppServiceConsoleLogs
| where ResultDescription startswith '{"app":"coillect-api"'
| extend e = parse_json(ResultDescription)
| where tostring(e.evento) == "solicitacao_criada"
| summarize solicitacoes = count() by condominio = tostring(e.condominio)
| render barchart
```

Fila: mensagens processadas, tempo médio e falhas:

```kusto
AppServiceConsoleLogs
| where ResultDescription startswith '{"app":"coillect-api"'
| extend e = parse_json(ResultDescription)
| where tostring(e.evento) startswith "fila_"
| summarize total = count(), ms_medio = avg(toint(e.ms)) by evento = tostring(e.evento), bin(TimeGenerated, 5m)
| render columnchart
```

Comprovantes gravados no Blob:

```kusto
AppServiceConsoleLogs
| where ResultDescription startswith '{"app":"coillect-api"'
| extend e = parse_json(ResultDescription)
| where tostring(e.evento) == "comprovante_gerado"
| project TimeGenerated, protocolo = tostring(e.protocolo), condominio = tostring(e.condominio),
          blob = tostring(e.blob), bytes = toint(e.bytes)
| order by TimeGenerated desc
```

Tempo de resposta e erros por rota (logs HTTP do App Service):

```kusto
AppServiceHTTPLogs
| summarize requisicoes = count(), ms_medio = avg(TimeTaken), erros_5xx = countif(ScStatus >= 500)
    by rota = CsUriStem
| order by requisicoes desc
```

### Dashboard

Em cada consulta: **Fixar no painel → Criar novo → "Coillect — Operação"** (compartilhado).
Acrescente os gráficos de métricas (App Service → Métricas → *Requisições*, *Http 5xx*,
*Tempo de resposta*; Storage → Métricas → *Transações* filtrando por API; PostgreSQL → *CPU percent*)
com **Fixar no painel**. Resultado: um painel com nível dos barris, coletas, fila, comprovantes,
saúde da API e do banco.

### Alertas sugeridos

| Alerta | Sinal | Ação |
|---|---|---|
| API fora do ar | Teste de disponibilidade falhou em 2+ locais | E-mail |
| Erros na API | Métrica *Http 5xx* > 5 em 5 min | E-mail |
| Fila com falhas | Consulta de log: `fila_mensagem_erro` ou `fila_mensagem_descartada` > 0 em 15 min | E-mail |

---

## 5. Política de backup

| Dado | Onde fica | Backup | RPO / RTO |
|---|---|---|---|
| Usuários, condomínios, barris, sensores, leituras, solicitações, notificações | PostgreSQL Flexible Server | **Automático**: snapshot diário + backup contínuo do log de transações (WAL). Retenção padrão de **7 dias**, configurável até **35**. Restauração para **qualquer ponto no tempo** (PITR) dentro da retenção, criando um novo servidor. Opcional: backup **geo-redundante** (só pode ser escolhido na criação do servidor) para restaurar em outra região. Exportação manual extra com `pg_dump` antes da apresentação | RPO de até ~5 min (segundo a documentação da Azure); RTO de minutos a horas, conforme o tamanho |
| Comprovantes de coleta | Blob Storage | Redundância da conta (**LRS**: 3 cópias no mesmo datacenter; **GRS**: + cópia em outra região). Ativar **exclusão reversível (soft delete)** de blobs e de contêineres (ex.: 14 dias) e **controle de versão** de blobs. Opcional: política de imutabilidade (WORM) no container, já que comprovante não deve ser alterado | Exclusão acidental: restaura pelo soft delete/versão |
| Mensagens da fila | Queue Storage | Não precisam de backup: são transitórias (TTL de 7 dias) e o estado oficial está no banco. Falhas ficam guardadas na `-poison` para análise | — |
| Código e configuração | GitHub | Histórico completo no Git; imagem Docker versionada por commit no GHCR (`:latest` e `:<sha>`): voltar uma versão = trocar a tag no App Service. As variáveis de ambiente estão documentadas em [deploy-cloud.md](deploy-cloud.md) | Recriar a infraestrutura pelo §7 |

Rotina proposta: retenção de 14 dias no PostgreSQL; soft delete de 14 dias + versionamento no Blob;
`pg_dump` manual antes de cada apresentação; teste de restauração (PITR para um servidor novo)
uma vez, documentando o tempo gasto.

---

## 6. Alta disponibilidade

**Já implementado no código (vale para qualquer escala):**

- **Dados fora da API**: tudo fica no PostgreSQL e no Storage, então dá para rodar 2+ instâncias
  atrás do balanceador do App Service. Limite conhecido: a trava que garante uma solicitação
  aberta por barril (`barrel-lock.ts`), a pausa da fila e os contadores da aba Nuvem ficam na
  memória de cada instância. Com 2+ instâncias, duas leituras simultâneas do mesmo barril em
  instâncias diferentes ainda poderiam abrir duas solicitações (a garantia teria de vir de um
  índice único no banco). O MVP roda com 1 instância.
- **Health check** `GET /api/health` → **503** quando o banco cai: o App Service tira a instância
  doente do balanceador e a substitui se continuar doente.
- **Fila com consumidores concorrentes**: com várias instâncias, cada mensagem é processada por
  uma só (visibilidade de 30 s); se uma instância cair, outra processa depois. Idempotência e
  poison queue evitam duplicidade e laço infinito.
- **Fallback**: Storage fora do ar → os avisos são processados localmente e a falha é registrada.
- **Reconexão ao banco** na subida (o TypeORM tenta de novo por ~30 s).
- **Sensor resiliente**: o firmware do ESP32 reconecta o Wi-Fi, tenta reenviar o alerta a cada 5 s
  e reenvia o último alerta pendente.
- **Apps resilientes**: atualização automática a cada 5 s, mantêm o último dado em tela se uma
  consulta falhar e usam tempo limite longo para a API "acordar".

**Configuração na Azure (custo × disponibilidade):**

| Camada | Demonstração (barato) | Alta disponibilidade (produção) |
|---|---|---|
| App Service | B1, 1 instância, **Always On**, Health check `/api/health` | Premium v3 com **2–3 instâncias** e **redundância de zona**; autoescala por CPU/requisições; slot de *staging* para publicar sem parar |
| PostgreSQL | Burstable B1ms (sem HA) | General Purpose com **HA com redundância de zona** (servidor *standby* síncrono em outra zona; failover automático, RTO em geral < 120 s e RPO zero, segundo a documentação) — a HA não existe na camada Burstable |
| Storage | LRS | **ZRS** (zonas) ou **GRS/RA-GRS** (outra região) |
| Região | 1 região | 2 regiões + Azure Front Door (failover global) |

Para a A02: publicar a versão de demonstração e **descrever** a coluna de produção, explicando o
custo de cada item.

---

## 7. Passo a passo no portal da Azure

Pré-requisitos: assinatura **Azure for Students** ativa; a imagem publicada no GHCR (o workflow
**Imagem da API** roda a cada merge na `main`; veja em *Actions*).

**0. Deixar a imagem pública (uma vez):** github.com/CoillectADM → **Packages** → `coillect-api`
→ **Package settings** → **Change visibility** → **Public**. Assim o App Service baixa sem senha.

**1. Grupo de recursos:** *Grupos de recursos* → Criar → `rg-coillect`, região Brazil South.

**2. Storage Account:** *Contas de armazenamento* → Criar → nome `stcoillect<sufixo>` (só minúsculas
e números) → Desempenho Standard → Redundância LRS (ou GRS) → Criar. Depois:
- *Proteção de dados*: ative soft delete de blobs e contêineres (14 dias) e controle de versão.
- *Segurança + rede → Chaves de acesso* → **Mostrar** → copie a **Cadeia de conexão** (é segredo:
  não coloque no GitHub). O container e as filas são criados sozinhos pela API.

**3. PostgreSQL:** *Servidores do Banco de Dados do Azure para PostgreSQL* → Criar → Servidor
flexível → nome `psql-coillect-<sufixo>` → carga de trabalho *Desenvolvimento* → Computação
**Burstable B1ms**, 32 GB → Autenticação PostgreSQL (usuário e senha) → *Rede*: acesso público,
marque **"Permitir acesso público de qualquer serviço do Azure"** e adicione o seu IP (para testar
do PC) → Criar. A URL fica:

```text
postgres://<usuario>:<senha>@psql-coillect-<sufixo>.postgres.database.azure.com:5432/postgres
```

(senha com caracteres especiais: codifique na URL, ex.: `@` vira `%40`). Não coloque `sslmode` na
URL: use `DATABASE_SSL=true`.

**4. App Service:** *Serviços de Aplicativos* → Criar → Aplicativo Web → Publicar: **Contêiner**,
Sistema: **Linux**, Plano novo `asp-coillect` **B1** → aba *Contêiner*: Origem **Outros registros
de contêiner**, Acesso **Público**, Servidor `https://ghcr.io`, Imagem `coillectadm/coillect-api:latest`
→ Criar. Depois, em **Configurações → Variáveis de ambiente**:

| Nome | Valor |
|---|---|
| `WEBSITES_PORT` | `3000` |
| `PORT` | `3000` |
| `DATABASE_URL` | URL do passo 3 |
| `DATABASE_SSL` | `true` |
| `JWT_SECRET` | um texto longo qualquer |
| `SEED_DEMO` | `true` |
| `AZURE_STORAGE_CONNECTION_STRING` | cadeia de conexão do passo 2 |

E ainda: **Configuração → Always On = Ativado**; **Monitoramento → Verificação de integridade**
→ caminho `/api/health`. Abra `https://<app>.azurewebsites.net/api/health`: deve mostrar
`"database":"up"` e `"storage":"azure"`.

**5. Monitoramento:**
1. *Workspaces do Log Analytics* → Criar `log-coillect`.
2. App Service → **Configurações de diagnóstico** → Adicionar → marque *App Service Console Logs*,
   *HTTP logs* e *AllMetrics* → Enviar para o workspace `log-coillect`.
3. (Opcional) Storage account → Configurações de diagnóstico → *queue* e *blob* → mesmo workspace.
4. *Application Insights* → Criar `appi-coillect` (modo baseado em workspace, `log-coillect`) →
   **Disponibilidade** → Adicionar teste padrão → URL `https://<app>.azurewebsites.net/api/health`,
   frequência 5 min → crie a regra de alerta com o seu e-mail.
5. Rode as consultas do §4 em *Logs* e fixe no painel "Coillect — Operação".

**6. Testar de ponta a ponta (do seu PC):**

```bash
node backend/scripts/smoke-flow.mjs https://<app>.azurewebsites.net/api --reset
```

Depois configure as pontas: apps → campo **Servidor da API** = `https://<app>.azurewebsites.net/api/`;
firmware do ESP32/Wokwi → `COILLECT_API_URL` = `https://<app>.azurewebsites.net/api/sensor-alert`;
sensor virtual → `--api https://<app>.azurewebsites.net/api`.

**Custos:** ao terminar a avaliação, pare o App Service e o PostgreSQL (ou apague o grupo
`rg-coillect`) para não consumir o crédito. Acompanhe o saldo em microsoftazuresponsorships.com.
