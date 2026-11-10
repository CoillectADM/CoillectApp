# Dados de demonstração e glossário

Parte da [documentação do Coillect](README.md).

Este documento reúne o que é preciso ter à mão na apresentação: contas, condomínios, barris e sensores
criados automaticamente, endereços e portas, como voltar ao estado inicial e o significado dos termos
usados no código, nos apps e nesta documentação.

## Sumário

- [Referência rápida](#referência-rápida)
- [Contas de demonstração](#contas-de-demonstração)
- [Condomínios, barris e sensores](#condomínios-barris-e-sensores)
- [Quando os dados são criados](#quando-os-dados-são-criados)
- [Reiniciar a demonstração](#reiniciar-a-demonstração)
- [Respostas do sensor](#respostas-do-sensor)
- [Glossário](#glossário)

## Referência rápida

| O quê | Valor |
|---|---|
| API local | `http://localhost:3000/api` |
| Documentação interativa (Swagger) | `http://localhost:3000/api/docs` |
| Saúde da API | `http://localhost:3000/api/health` |
| API vista pelo emulador Android | `http://10.0.2.2:3000/api/` (endereço padrão dos apps, `BuildConfig.API_URL`) |
| API vista por um celular na mesma Wi-Fi | IP do PC, por exemplo `192.168.0.15` (o app completa para `http://192.168.0.15:3000/api/`) |
| PostgreSQL do Docker Compose | `localhost:5482` (porta 5432 dentro do contêiner), banco `app_db` |
| Azurite (emulador do Azure Storage) | Blob `10000`, Queue `10001`, Table `10002` |
| Painel do sensor virtual | `http://localhost:4010` |
| Frontend web antigo (legado) | `http://localhost:8080` |
| Sensor do roteiro | `CLT-8472-A`, barril `BRL-8472`, Residencial Aurora |
| Limite de alerta | 80% |
| Fila de notificações | `coillect-notificacoes` (poison: `coillect-notificacoes-poison`) |
| Container dos comprovantes | `comprovantes-coleta` |
| APK do síndico | https://github.com/CoillectADM/app-mobile-sindico/releases/download/demo/coillect-sindico.apk |
| APK da empresa | https://github.com/CoillectADM/app-mobile-empresa/releases/download/demo/coillect-empresa.apk |

Os repositórios dos apps são privados: para baixar o APK é preciso estar logado no GitHub com acesso à
organização `CoillectADM`.

## Contas de demonstração

| Perfil | Nome | Login | Senha | App |
|---|---|---|---|---|
| Síndico | Leonardo Costa | `sindico@coillect.com` | `Coillect@2025` | App do síndico |
| Empresa coletora | EcoColeta Ambiental (CNPJ `11222333000181`) | `empresa@coillect.com` | `Coillect@2025` | App da empresa |
| Administrador | — | sem login | — | Desktop |

- A senha pode ser trocada pela variável `DEMO_PASSWORD` antes de a API criar as contas.
- Síndicos e empresas cadastrados pelo desktop sem senha recebem a mesma senha de demonstração.
- Os apps também têm um "modo demonstração" que funciona sem API, com dados em memória. Ele serve como
  plano B; não conversa com os outros apps.

Fonte: [demo-data.ts](../backend/src/demo/demo-data.ts) e
[demo-seed.service.ts](../backend/src/demo/demo-seed.service.ts).

## Condomínios, barris e sensores

Os nomes seguem os mockups dos apps. Todos os barris têm capacidade de 200 litros e limite de alerta de
80%, e os três condomínios são clientes da EcoColeta Ambiental.

| Condomínio | Endereço | Bairro | Barril | Sensor | Nível inicial | Síndico vinculado |
|---|---|---|---|---|---|---|
| Residencial Aurora | Rua das Acácias, 120 - São Paulo/SP | Jardim Paulista | `BRL-8472` | `CLT-8472-A` | 0% | Leonardo Costa |
| Condomínio Bosque | Rua dos Ipês, 455 - São Paulo/SP | Vila Mariana | `BRL-1264` | `CLT-1264-B` | 62% | nenhum |
| Edifício Átria | Rua das Palmeiras, 89 - São Paulo/SP | Pinheiros | `BRL-9801` | `CLT-9801-C` | 31% | nenhum |

Consequências para a apresentação:

- O síndico de demonstração vê só o Residencial Aurora. Use `CLT-8472-A` para mostrar o ciclo nos
  dois celulares.
- A empresa vê os três barris na lista "Reservatórios monitorados". O Bosque, a 62%, ajuda a mostrar
  um barril perto do limite.
- O Bosque e o Átria não têm síndico: uma solicitação deles aparece para a empresa e no desktop, mas
  nenhum síndico recebe a cópia.

## Quando os dados são criados

- Na inicialização da API, se `SEED_DEMO` estiver ligada (padrão: ligada).
- Só é criado o que estiver faltando, procurando por e-mail (síndico), e-mail ou CNPJ (empresa), nome
  (condomínio) e código (barril e sensor). Dados que já existem não são alterados.
- Um erro na criação aparece no log ("Falha ao criar dados de demonstração") e não impede a API de
  subir.
- Com o Docker Compose, os dados ficam no volume `db-data`. Para começar do zero absoluto:
  `docker compose down -v` e subir de novo.

## Reiniciar a demonstração

Botão "Reiniciar demonstração" no desktop (com confirmação) ou `POST /api/admin/demo/reset`.

| O que acontece | Detalhe |
|---|---|
| Apaga | Todas as notificações, solicitações de coleta e leituras de sensor |
| Zera | O nível de todos os sensores, a última leitura e a data da última coleta de todos os barris |
| Restaura | Os níveis iniciais da tabela acima (Aurora 0%, Bosque 62%, Átria 31%) e remove a marca "aguardando leitura vazia" desses três barris |
| Mantém | Contas, condomínios, barris e sensores, inclusive os cadastrados pelo desktop; comprovantes já gravados no Blob ou em `storage-local/` |

Barris cadastrados fora dos dados de demonstração ficam com o sensor em 0%; se estavam aguardando
leitura vazia, a marca sai na primeira leitura abaixo do limite.

## Respostas do sensor

A resposta de `POST /api/sensor-alert` traz `collection.triggered` e `collection.reason`. O firmware e o
sensor virtual mostram esses valores no monitor serial e no painel.

| `reason` | Significado | O que fazer na demonstração |
|---|---|---|
| `THRESHOLD_REACHED` | Esta leitura criou a solicitação de coleta | Mostrar o aviso no app da empresa |
| `BELOW_THRESHOLD` | Nível abaixo do limite do barril | Subir o nível |
| `REQUEST_ALREADY_OPEN` | Já existe solicitação `PENDING` ou `SCHEDULED` para o barril | Agendar ou concluir a existente |
| `AWAITING_EMPTY_READING` | A coleta foi concluída e o sensor ainda lê o barril cheio | Baixar o nível (no Wokwi, aumentar a distância do HC-SR04) |
| `SENSOR_NOT_INSTALLED` | O sensor não está instalado em nenhum barril | Instalar pelo desktop (aba Cadastros) |
| `NO_COMPANY_LINKED` | O condomínio do barril não tem empresa coletora | Vincular a empresa ao condomínio |

Um `sensorId` desconhecido devolve 404 ("Sensor ... não cadastrado"); um corpo inválido devolve 400.

## Glossário

| Termo | Significado no Coillect |
|---|---|
| A02 | Atividade da disciplina Computação em Nuvem II (entrega em 16/11/2026) que exige Blob Storage e Table ou Queue Storage. O projeto usa Blob + Queue. Ver [08-azure-storage-e-nuvem.md](08-azure-storage-e-nuvem.md) |
| `access_token` | Token JWT devolvido pelo login do síndico ou da empresa; vai no cabeçalho `Authorization: Bearer` |
| `alertThreshold` (limite de alerta, `limiteAlerta`) | Percentual do barril a partir do qual a leitura abre uma solicitação. Padrão 80 |
| `APIResponse` | Envelope das respostas de sucesso da API: `error`, `data`, `statusCode`, `timestamp`, `requester`, `message` |
| `awaitingEmptyReading` | Marca do barril depois de uma coleta concluída: a API não abre outra solicitação até o sensor ler o barril abaixo do limite |
| Azurite | Emulador oficial do Azure Storage que roda em Docker; permite usar Blob e Queue sem conta no Azure |
| Barril (`Barrel`) | Reservatório de óleo de um condomínio, com código (ex.: `BRL-8472`), capacidade e limite de alerta. Recebe um sensor |
| Blob Storage | Serviço de arquivos do Azure. Guarda o comprovante JSON de cada coleta concluída |
| Comprovante | JSON gerado na conclusão da coleta, gravado em `comprovantes-coleta/AAAA/MM/DD/coleta-<id>-<data>.json` e aberto pelos apps no histórico |
| Condomínio (`Condominium`) | Local atendido; liga um síndico e uma empresa coletora aos seus barris |
| Consumidor da fila | Rotina dentro da API que lê a fila `coillect-notificacoes`, grava as notificações e o comprovante e só então apaga a mensagem |
| `dataHora` | Data e hora da leitura informada pelo dispositivo (o firmware usa NTP no fuso −03:00) |
| `dedupeKey` | Chave única de cada notificação (id da mensagem + destinatário); evita aviso duplicado quando a fila entrega a mesma mensagem duas vezes |
| Empresa coletora (`Company`) | Empresa que recolhe o óleo; usa o app da empresa |
| ESP32 | Microcontrolador com Wi-Fi usado no sensor físico (placa ESP32 Dev Module) |
| Evento de domínio | Aviso interno da API (`sensor.reading.received`, `collection-request.created`, `collection-request.status-changed`) entregue aos ouvintes em memória |
| GHCR | GitHub Container Registry; recebe a imagem `ghcr.io/coillectadm/coillect-api` a cada push na `main` que altera `backend/` (ou manualmente pelo workflow `imagem-api.yml`) |
| HC-SR04 | Sensor ultrassônico de distância; o firmware converte a distância até o óleo em percentual |
| Health | `GET /api/health`: diz se a API e o banco estão no ar e se o armazenamento está em modo `azure` ou `local`; 503 sem banco |
| Histerese | O firmware só manda outro alerta imediato depois de o nível cair 10 pontos abaixo do limite |
| Leitura (`SensorReading`) | Cada envio do sensor gravado no histórico, com o nível e a `dataHora` |
| Listener do sensor | `SensorTriggerListener`: avalia cada leitura e cria a solicitação quando a regra de disparo é atendida |
| Modo demonstração (apps) | Repositório em memória dentro de cada app, para mostrar as telas sem API |
| Modo local (API) | API sem `AZURE_STORAGE_CONNECTION_STRING`: fila processada em memória e comprovantes em disco (`storage-local/`) |
| Notificação (síndico) e aviso (empresa) | Mensagens gravadas pela API para cada perfil; aparecem na lista, no badge e na faixa laranja |
| Origem (`origin`) | Quem criou a solicitação: `SENSOR` (leitura no limite), `COMPANY` ("Agendar coleta" sem alerta) ou `MANUAL` (frontend web antigo) |
| Poison queue | Fila `coillect-notificacoes-poison`, para onde vai a mensagem que falhou 5 vezes ou não é um JSON da Coillect |
| Queue Storage | Serviço de filas do Azure; leva os avisos da API para o consumidor, separando a criação da solicitação da entrega das notificações |
| Regra de disparo | Função `evaluateCollectionTrigger`: decide se a leitura cria a solicitação (ver [Respostas do sensor](#respostas-do-sensor)) |
| Release `demo` | Release dos repositórios dos apps onde o CI publica o APK mais recente da `main`, com link fixo |
| Sensor (`Sensor`) | Dispositivo identificado por `sensorId` (ex.: `CLT-8472-A`), instalado em um barril |
| Sensor virtual | Programa Node (`sensor-esp32/simulador-pc/sensor-virtual.mjs`) que envia a mesma requisição do ESP32, com painel no navegador |
| Simular leitura | Botão do app do síndico que envia `POST /api/sensor-alert` com o sensor do condomínio |
| Síndico | Responsável pelo condomínio; usa o app do síndico e só é notificado sobre a coleta |
| Solicitação de coleta (`CollectionRequest`) | Pedido de coleta de um barril para a empresa. Estados: `PENDING` (aguardando a empresa), `SCHEDULED` (agendada), `COMPLETED` (concluída), `REFUSED` (recusada), `CANCELLED` (cancelada, só pedidos manuais) |
| Swagger | Documentação interativa das rotas em `/api/docs` |
| Trava por barril | `barrelLock`: garante que, para o mesmo barril, só uma leitura ou agendamento seja avaliado por vez |
| Túnel (`cloudflared`) | Expõe a API do PC na internet com um endereço `https://...trycloudflare.com`; necessário para o Wokwi gratuito |
| Wokwi | Simulador online de ESP32 onde roda o mesmo firmware da placa |
| CoillectMobileRemake | App Android genérico que serviu de base para os dois apps móveis e para o desktop |
| `LEIA-PRIMEIRO-CODEX.txt` | Guia na raiz do CoillectApp para o Codex ler antes de qualquer ação: como rodar, testar, apresentar e fazer os deploys |
