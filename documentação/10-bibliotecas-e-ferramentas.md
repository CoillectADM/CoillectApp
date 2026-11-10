# Bibliotecas, frameworks e ferramentas

Parte da [documentação do Coillect](README.md).

Este documento lista, por componente, todas as bibliotecas, frameworks, ferramentas de build, imagens
Docker, actions do GitHub e serviços externos do Coillect: versão declarada, para que servem, onde
aparecem e se já existiam antes dos PRs de 10/11/2026 ou entraram/saíram neles. Os testes e o CI em
detalhe estão em [Testes e CI](11-testes-e-ci.md).

## Sumário

- [Como ler as versões e a situação](#como-ler-as-versões-e-a-situação)
- [API (backend)](#api-backend)
- [Sensor ESP32 e sensor virtual](#sensor-esp32-e-sensor-virtual)
- [Apps Android do síndico e da empresa](#apps-android-do-síndico-e-da-empresa)
- [App desktop do administrador](#app-desktop-do-administrador)
- [Infraestrutura, CI e nuvem](#infraestrutura-ci-e-nuvem)
- [Resumo: o que entrou e o que saiu no MVP](#resumo-o-que-entrou-e-o-que-saiu-no-mvp)
- [Limites desta lista](#limites-desta-lista)

## Como ler as versões e a situação

- **npm (API e frontend legado):** a versão é a **faixa semver declarada** no `package.json`
  (ex.: `^10.0.0` aceita qualquer 10.x a partir de 10.0.0). A versão exata instalada fica no
  `package-lock.json`, que existe no repositório, mas não estava na cópia usada para escrever este
  documento. Por isso as versões exatas instaladas não foram conferidas.
- **Gradle (apps e desktop):** versões exatas do catálogo `gradle/libs.versions.toml`. Bibliotecas
  sem versão no catálogo recebem a versão do BOM do Compose (Android) ou do plugin Compose
  Multiplatform (desktop).
- **Docker e GitHub Actions:** a tag declarada (`node:24-alpine`, `actions/checkout@v5`...). Imagem
  sem tag (`mcr.microsoft.com/azure-storage/azurite`) baixa a `latest` no momento da execução.
- **Situação:**
  - **Pré-existente:** já estava na base — `CoillectApp` no commit `76f12374` (30/11/2025) ou
    `CoillectMobileRemake` no commit `4d594a3` (base copiada para os três apps).
  - **Adicionado / Removido / Alterado:** mudou em um PR de 10/11/2026 (o PR é indicado).
    "PR #N" sem repositório se refere ao CoillectApp.

## API (backend)

O [`backend/package.json`](../backend/package.json) declara 19 `dependencies` e 24
`devDependencies`. **Nenhuma dependência npm foi adicionada, removida ou trocou de faixa no MVP:** as
duas listas são idênticas às da base, e o `package-lock.json` não aparece na lista de arquivos de
nenhum PR. O `package.json` mudou só em `scripts` e na configuração do Jest (ver
[Scripts npm e configuração do Jest](#scripts-npm-e-configuração-do-jest)).

O que o MVP fez sem biblioteca nova:

- **Cliente do Azure Storage**
  ([azure-storage.client.ts](../backend/src/cloud/azure-storage.client.ts)): chama a API REST do Blob e
  da Queue (versão `2021-08-06`, constante `STORAGE_API_VERSION`) com o `fetch` global do Node e
  assina cada chamada com `crypto.createHmac` (Shared Key, HMAC-SHA256), ou usa um token SAS. O XML
  das respostas é lido com expressões regulares. Não usa os SDKs `@azure/storage-*`; o comentário do
  arquivo explica o motivo: não adicionar dependências e deixar cada chamada visível.
- **Barramento de eventos em memória**
  ([domain-events.service.ts](../backend/src/events/domain-events.service.ts)): um `Map` de
  listeners, sem `@nestjs/event-emitter` e sem RxJS.
- **Trava por barril** ([barrel-lock.ts](../backend/src/collection-request/barrel-lock.ts)):
  encadeamento de `Promise`, sem biblioteca de mutex.
- **Eventos de monitoramento** ([telemetry.ts](../backend/src/cloud/telemetry.ts)): `JSON.stringify`
  e `process.stdout.write`, sem SDK do Application Insights.
- **Scripts** ([smoke-flow.mjs](../backend/scripts/smoke-flow.mjs),
  [endereco-celular.mjs](../backend/scripts/endereco-celular.mjs)) e **sensor virtual**: só Node, sem
  `npm install`.

### Runtime, linguagem e framework

| Item | Versão declarada | Onde | Situação |
|---|---|---|---|
| Node.js | 24: imagem `node:24-alpine`; `node-version: 24` no CI | [`backend/Dockerfile`](../backend/Dockerfile) (build e execução); jobs `api` e `azure-storage` do [`backend.yml`](../.github/workflows/backend.yml); jobs `firmware-pc` e `sensor-na-api` do [`sensor-esp32.yml`](../.github/workflows/sensor-esp32.yml) | Imagem pré-existente; Node 24 no CI adicionado no PR #1 (commit "CI: usar Node 24, como a imagem Docker") |
| TypeScript | `^5.1.3` | [`tsconfig.json`](../backend/tsconfig.json): alvo `ES2021`, módulos CommonJS, `experimentalDecorators` e `emitDecoratorMetadata`; [`tsconfig.build.json`](../backend/tsconfig.build.json) compila só `src/**/*` e deixa de fora `*.spec.ts` | Pré-existente |
| NestJS | `@nestjs/core`, `@nestjs/common` e `@nestjs/testing` `^10.0.0`; `@nestjs/platform-express` `^10.4.20`; `@nestjs/jwt`, `@nestjs/typeorm` `^11.0.0`; `@nestjs/passport` `^11.0.5`; `@nestjs/swagger` `^7.3.1`; `@nestjs/cli` `^11.0.10` | Toda a API | Pré-existente |
| TypeORM + PostgreSQL | `typeorm` `^0.3.27`, driver `pg` `^8.16.0`; servidor PostgreSQL 17.5 no compose, 17 no CI | Entidades, repositórios e `DataSource`; tabelas criadas por `synchronize` (`DATABASE_SYNC`, padrão `true`) | Pré-existente (banco `postgres:17-alpine` no CI adicionado no PR #1) |
| Jest + ts-jest | `^29.5.0` / `^29.1.0` | Testes unitários e e2e | Pré-existente |
| supertest | `^7.0.0` | Testes e2e | Pré-existente |
| ESLint + Prettier | `^8.42.0` / `^3.0.0` | `npm run lint`, `npm run format` (não rodam no CI) | Pré-existente |

### dependencies (19)

| Pacote | Versão declarada | Para que serve no Coillect | Onde é usado | Situação |
|---|---|---|---|---|
| `@nestjs/common` | `^10.0.0` | Decorators, módulos, `ValidationPipe`, exceções HTTP, `Logger` | Praticamente todos os arquivos de `src/` | Pré-existente |
| `@nestjs/config` | `^4.0.2` | Nenhum: não há `ConfigModule` em `src/`. As variáveis são lidas direto de `process.env` ([env.ts](../backend/src/config/env.ts), [database.config.ts](../backend/src/config/database.config.ts), [cloud.config.ts](../backend/src/cloud/cloud.config.ts)) | — | Pré-existente, sem uso |
| `@nestjs/core` | `^10.0.0` | Cria a aplicação (`NestFactory`) | `src/main.ts` | Pré-existente |
| `@nestjs/jwt` | `^11.0.0` | Assina o `access_token` dos logins (validade de 1 dia) | `src/auth/auth.module.ts`, `src/auth/auth.service.ts` | Pré-existente |
| `@nestjs/passport` | `^11.0.5` | Liga o Passport aos guards do NestJS | `src/auth/auth.module.ts`, `src/auth/guards/`, `src/auth/strategies/` | Pré-existente |
| `@nestjs/platform-express` | `^10.4.20` | Adaptador HTTP (Express) do NestJS; `FileInterceptor` do upload de ícone da empresa | Usado pelo `NestFactory.create`; `src/company/company.controller.ts` (legado) | Pré-existente |
| `@nestjs/swagger` | `^7.3.1` | Documento OpenAPI e página em `/api/docs`; decorators `@ApiTags`, `@ApiOperation`, `@ApiProperty` | [`src/app.setup.ts`](../backend/src/app.setup.ts) e os controllers/DTOs | Pré-existente |
| `@nestjs/typeorm` | `^11.0.0` | Conexão (`TypeOrmModule.forRootAsync` com `buildDatabaseOptions`), repositórios por módulo (`forFeature`) e `@InjectRepository` | `src/app.module.ts`, `src/config/database.config.ts`, módulos e serviços | Pré-existente |
| `bcrypt` | `^6.0.0` | Hash e conferência de senhas | `src/auth/auth.service.ts`, `src/user/user.service.ts`, `src/company/company.service.ts`; no código novo, `src/admin/admin.service.ts` (cadastros do admin) e `src/demo/demo-seed.service.ts` (contas de demonstração) | Pré-existente |
| `class-transformer` | `^0.5.1` | Converte o corpo da requisição antes da validação (`ValidationPipe` com `transform: true`); `@Transform`/`@Type` aceitam `percentual` em texto e `dataHora` numérica | `src/app.setup.ts` (pipe global), `src/sensor/dto/sensor-alert.payload.ts`, `src/collection-request/dto/schedule-collection.dto.ts` | Pré-existente |
| `class-validator` | `^0.14.2` | Regras dos DTOs (HTTP 400 para campo inválido ou fora do contrato) | DTOs de `src/admin/dto/`, `src/auth/dto/`, `src/collection-request/dto/`, `src/notification/help-request.dto.ts`, `src/sensor/dto/sensor-alert.payload.ts`, `src/user/dto/`, `src/company/dto/` | Pré-existente |
| `multer` | `^2.0.2` | Grava o ícone enviado no cadastro de empresa (`diskStorage` em `./uploads/company-icons`) | `src/company/company.controller.ts` (legado) | Pré-existente |
| `passport` | `^0.7.0` | Base do `@nestjs/passport` | Sem import direto | Pré-existente |
| `passport-jwt` | `^4.0.1` | Estratégias JWT do síndico e da empresa (token `Bearer`) | `src/auth/strategies/jwt.strategy.ts`, `src/auth/strategies/company-jwt.strategy.ts` | Pré-existente |
| `pg` | `^8.16.0` | Driver PostgreSQL usado pelo TypeORM (`type: 'postgres'`) | Sem import direto | Pré-existente |
| `postgres` | `^3.4.7` | Nenhum: cliente PostgreSQL alternativo, sem import em `src/` | — | Pré-existente, sem uso |
| `reflect-metadata` | `^0.2.0` | Metadados dos decorators (NestJS, TypeORM, class-validator) | Sem import direto em `src/` | Pré-existente |
| `rxjs` | `^7.8.1` | Exigido pelo NestJS | Sem import direto em `src/` | Pré-existente |
| `swagger-ui-express` | `^5.0.1` | Declarado para a página do Swagger UI em `/api/docs`, que é montada pelo `@nestjs/swagger` (`SwaggerModule.setup('api/docs', ...)`) | Sem import direto em `src/` | Pré-existente |

### devDependencies (24)

| Pacote | Versão declarada | Para que serve no Coillect | Onde é usado | Situação |
|---|---|---|---|---|
| `@nestjs/cli` | `^11.0.10` | `nest build` e `nest start` | Scripts `build`, `start`, `start:dev`, `start:debug`; [`nest-cli.json`](../backend/nest-cli.json) (`deleteOutDir`); Dockerfile e CI via `npm run build` | Pré-existente |
| `@nestjs/schematics` | `^10.0.0` | Geradores de código do Nest CLI | `nest-cli.json` (`"collection"`) | Pré-existente |
| `@nestjs/testing` | `^10.0.0` | Monta o `AppModule` em memória (`Test.createTestingModule`) | `test/mvp-flow.e2e-spec.ts`, `test/azure-storage.e2e-spec.ts`; specs antigos | Pré-existente |
| `@types/bcrypt` | `^6.0.0` | Tipos do `bcrypt` | — | Pré-existente |
| `@types/express` | `^4.17.17` | Tipos do Express | — | Pré-existente |
| `@types/jest` | `^29.5.2` | Tipos do Jest | — | Pré-existente |
| `@types/node` | `^20.3.1` | Tipos do Node (a execução usa Node 24) | — | Pré-existente |
| `@types/passport-jwt` | `^4.0.1` | Tipos do `passport-jwt` | — | Pré-existente |
| `@types/supertest` | `^6.0.0` | Tipos do `supertest` | — | Pré-existente |
| `@typescript-eslint/eslint-plugin` | `^8.0.0` | Regras de TypeScript do ESLint | [`.eslintrc.js`](../backend/.eslintrc.js) (`plugin:@typescript-eslint/recommended`) | Pré-existente |
| `@typescript-eslint/parser` | `^8.0.0` | Parser de TypeScript do ESLint | `.eslintrc.js` | Pré-existente |
| `eslint` | `^8.42.0` | Lint (`npm run lint`, com `--fix`) | `.eslintrc.js` | Pré-existente; não roda no CI |
| `eslint-config-prettier` | `^9.0.0` | Desliga regras do ESLint que conflitam com o Prettier | `.eslintrc.js` (`plugin:prettier/recommended`) | Pré-existente |
| `eslint-plugin-prettier` | `^5.0.0` | Roda o Prettier como regra do ESLint | `.eslintrc.js` | Pré-existente |
| `jest` | `^29.5.0` | Executor dos testes | Scripts `test*`; bloco `jest` do `package.json` e [`test/jest-e2e.json`](../backend/test/jest-e2e.json) | Pré-existente |
| `prettier` | `^3.0.0` | Formatação (`npm run format`) | [`.prettierrc`](../backend/.prettierrc) (`singleQuote`, `trailingComma: all`) | Pré-existente; não roda no CI |
| `source-map-support` | `^0.5.21` | Sem uso direto (veio do modelo do Nest CLI) | — | Pré-existente |
| `supertest` | `^7.0.0` | Requisições HTTP ao app em memória | `test/mvp-flow.e2e-spec.ts`, `test/azure-storage.e2e-spec.ts`, `test/app.e2e-spec.ts` | Pré-existente |
| `ts-jest` | `^29.1.0` | Compila `.ts` para o Jest | `transform` do Jest | Pré-existente |
| `ts-loader` | `^9.4.3` | Sem uso direto (o `nest-cli.json` não liga o webpack) | — | Pré-existente |
| `ts-node` | `^10.9.2` | Executa TypeScript no `test:debug` | Script `test:debug` | Pré-existente |
| `tsconfig-paths` | `^4.2.0` | Resolve os caminhos do `tsconfig` no `test:debug` | Script `test:debug` | Pré-existente |
| `typeorm` | `^0.3.27` | ORM: entidades, repositórios, `DataSource` | Entidades (`src/**/entities/`, `notification.entity.ts`, `collection-request.entity.ts`), serviços, `src/health/health.controller.ts`, e2e | Pré-existente (ver observação abaixo) |
| `typescript` | `^5.1.3` | Compilador | `tsconfig.json`, `tsconfig.build.json` | Pré-existente |

Observação sobre o `typeorm`: está em `devDependencies` (pré-existente), mas a API o usa em execução.
A imagem Docker roda `npm prune --omit=dev` e mesmo assim sobe e passa no roteiro HTTP do CI (job
`docker`), então o pacote continua instalado na imagem. O motivo exato (provavelmente por ser
dependência *peer* do `@nestjs/typeorm`) não foi conferido, porque o `package-lock.json` não estava
na cópia local.

### Pacotes importados sem declaração direta

| Pacote | Onde é importado | Observação | Situação |
|---|---|---|---|
| `express` | `src/app.setup.ts` (`express.static` da pasta `uploads` em `/uploads`), `src/company/company.controller.ts` (tipo `Express`) | Não está no `package.json`; chega com o `@nestjs/platform-express` | Pré-existente (a base fazia o mesmo em `main.ts`) |
| `dotenv` | `ormconfig.ts`, `ormconfig.local.ts` | Não está no `package.json`. Esses arquivos de configuração do TypeORM não são usados pela aplicação ([estado-atual.md](../docs/estado-atual.md)) e ficam fora do build (`tsconfig.build.json` só inclui `src/`) | Pré-existente |

### Scripts npm e configuração do Jest

| Script | Comando | Situação |
|---|---|---|
| `build` | `nest build` | Pré-existente |
| `format` | `prettier --write "src/**/*.ts" "test/**/*.ts"` | Pré-existente |
| `start` | `nest start` | Pré-existente |
| `start:dev` | `nest start --watch` | Pré-existente |
| `start:debug` | `nest start --debug --watch` | Pré-existente |
| `start:prod` | `node dist/main` | Pré-existente |
| `lint` | `eslint "{src,apps,libs,test}/**/*.ts" --fix` | Pré-existente |
| `test` | `jest` (todos os `*.spec.ts`, inclusive os antigos) | Pré-existente |
| `test:watch` | `jest --watch` | Pré-existente |
| `test:cov` | `jest --coverage` | Pré-existente |
| `test:debug` | `node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand` | Pré-existente |
| `test:e2e` | `jest --config ./test/jest-e2e.json` (todos os e2e) | Pré-existente |
| `test:mvp` | `jest` com a lista de pastas e arquivos do MVP | Adicionado no PR #1; a lista mudou nos PRs #2, #4 e #6 |
| `test:e2e:mvp` | `jest --config ./test/jest-e2e.json --runInBand --forceExit test/mvp-flow.e2e-spec.ts` | Adicionado no PR #1 |
| `test:e2e:azure` | `jest --config ./test/jest-e2e.json --runInBand --forceExit test/azure-storage.e2e-spec.ts` | Adicionado no PR #4 |
| `smoke` | `node scripts/smoke-flow.mjs` | Adicionado no PR #1 |

Configuração do Jest:

- Bloco `jest` do `package.json` (testes unitários): `rootDir: src`, `testRegex: .*\.spec\.ts$`,
  `transform` com `ts-jest`, `testEnvironment: node`, cobertura em `../coverage` (pré-existente).
  **Adicionado no PR #1:** `moduleNameMapper` `^src/(.*)$` → `<rootDir>/$1`, para resolver imports
  como `src/utils/response/response`.
- [`test/jest-e2e.json`](../backend/test/jest-e2e.json): `rootDir: .`, `testRegex: .e2e-spec.ts$`
  (pré-existente). **Adicionados no PR #1:** `testTimeout: 60000` e o mesmo `moduleNameMapper`
  (`<rootDir>/../src/$1`).

### Módulos nativos do Node usados pelo código novo

Nenhum precisa de instalação: fazem parte do Node.

| Módulo | O que é usado | Arquivo | Para quê | PR |
|---|---|---|---|---|
| `crypto` | `createHmac` | [`src/cloud/azure-storage.client.ts`](../backend/src/cloud/azure-storage.client.ts) e o spec | Assinatura Shared Key (HMAC-SHA256) das chamadas REST ao Blob e à Queue | #4 |
| `crypto` | `randomUUID` | [`src/cloud/message-queue.service.ts`](../backend/src/cloud/message-queue.service.ts) | Id de cada mensagem publicada na fila | #4 |
| `fs` | `promises` (`mkdir`, `writeFile`, `readFile`, `readdir`, `stat`) | [`src/cloud/blob-storage.service.ts`](../backend/src/cloud/blob-storage.service.ts) | Comprovantes em disco no modo local (pasta `storage-local`) | #4 |
| `path` | `dirname`, `join`, `normalize`, `relative`, `sep` | `src/cloud/blob-storage.service.ts` | Caminhos dos comprovantes em disco | #4 |
| `path` | `join` | `src/cloud/cloud.config.ts` | Pasta padrão `storage-local` (variável `STORAGE_LOCAL_DIR`) | #4 |
| `path` | `join` | `src/app.setup.ts` | Pasta `uploads` servida em `/uploads` (já existia em `main.ts`; movido) | #1 |
| `node:os` | `networkInterfaces()` | [`backend/scripts/endereco-celular.mjs`](../backend/scripts/endereco-celular.mjs) | Lista os IPs da rede local para os celulares | #6 |
| `node:url` | `pathToFileURL` | `endereco-celular.mjs`, [`sensor-virtual.mjs`](../sensor-esp32/simulador-pc/sensor-virtual.mjs) | Saber se o arquivo foi executado direto ou importado pelo teste | #6, #3 |
| `node:url` | `fileURLToPath` | [`sensor-virtual.test.mjs`](../sensor-esp32/simulador-pc/sensor-virtual.test.mjs), [`simulador-na-api.mjs`](../sensor-esp32/testes/simulador-na-api.mjs) | Caminho do simulador para rodá-lo como processo filho | #3 |
| `node:test` | `test` | [`endereco-celular.test.mjs`](../backend/scripts/endereco-celular.test.mjs), `sensor-virtual.test.mjs` | Executor de testes nativo (`node --test`) | #6, #3 |
| `node:assert/strict` | `assert` | `endereco-celular.test.mjs`, `sensor-virtual.test.mjs` | Asserções | #6, #3 |
| `node:http` | `createServer` | `sensor-virtual.mjs` | Painel do sensor virtual (`http://localhost:4010`) | #3 |
| `node:http` | `createServer` | `sensor-virtual.test.mjs` | API falsa local com as regras da API Coillect | #3 |
| `node:util` | `parseArgs` | `sensor-virtual.mjs` | Opções de linha de comando (`--api`, `--sensores`, `--uma-vez`...) | #3 |
| `node:child_process` | `spawn` | `sensor-virtual.test.mjs`, `simulador-na-api.mjs` | Roda o simulador com `--uma-vez` em outro processo | #3 |
| `node:fs` | `readFileSync` | [`sensor-esp32/testes/reproduzir-na-api.mjs`](../sensor-esp32/testes/reproduzir-na-api.mjs) | Lê o roteiro JSONL gravado pelo teste do firmware | #3 |

Também são usados objetos globais do Node: `fetch` e `AbortSignal.timeout` (cliente do Azure Storage,
`smoke-flow.mjs`, `endereco-celular.mjs`, `RouterClient` do sensor virtual,
`reproduzir-na-api.mjs`, `simulador-na-api.mjs`), `URL`, `Headers` e `Buffer` (cliente do Azure
Storage). O código legado usa ainda `path.extname` em `src/company/company.controller.ts`.

### Qualidade de código

- [`.eslintrc.js`](../backend/.eslintrc.js): parser `@typescript-eslint/parser`, `extends`
  `plugin:@typescript-eslint/recommended` e `plugin:prettier/recommended`; desliga
  `interface-name-prefix`, `explicit-function-return-type`, `explicit-module-boundary-types` e
  `no-explicit-any`.
- [`.prettierrc`](../backend/.prettierrc): `singleQuote: true`, `trailingComma: "all"`.
- Nenhum workflow roda `npm run lint` ou `npm run format`. Os dois arquivos são pré-existentes e não
  mudaram.

## Sensor ESP32 e sensor virtual

Tudo nesta seção foi adicionado no PR #3 (pasta [`sensor-esp32/`](../sensor-esp32/README.md)).

### Bibliotecas do firmware

O firmware [`coillect_sensor.ino`](../sensor-esp32/coillect_sensor/coillect_sensor.ino) inclui só o
que vem com o core Arduino-ESP32 da Espressif e a biblioteca C do toolchain. Não usa bibliotecas
externas: o JSON é montado com `snprintf` e a resposta da API é lida por busca de texto
(`extrairTexto`). O [`diagram.json`](../sensor-esp32/coillect_sensor/diagram.json) do Wokwi não
declara bibliotecas (`"dependencies": {}`).

| `#include` | De onde vem | Uso no firmware |
|---|---|---|
| `<Arduino.h>` | Core Arduino-ESP32 | `pinMode`, `digitalWrite`, `digitalRead`, `pulseIn` (eco do HC-SR04, limite de 30 000 µs), `millis`, `delay`, `Serial` (115200), `String` |
| `<WiFi.h>` | Core Arduino-ESP32 | Modo estação, `WiFi.begin(ssid, senha, canal)` (canal 6 quando a rede é `Wokwi-GUEST`), reconexão automática, IP; `WiFiClient` para URLs `http://` |
| `<WiFiClientSecure.h>` | Core Arduino-ESP32 | Conexão TLS para URLs `https://` com `setInsecure()` (não valida o certificado) |
| `<HTTPClient.h>` | Core Arduino-ESP32 | `POST` do JSON para `/api/sensor-alert`, tempo limite de 15 s para conectar e 60 s para responder, `errorToString` |
| `<time.h>` | Biblioteca C do toolchain | `time`, `localtime_r` e `strftime` para a `dataHora` ISO 8601 com fuso; o relógio é acertado por NTP com `configTzTime` (função do core) nos servidores `pool.ntp.org` e `time.google.com`, fuso `<-03>3` |

### Hardware

| Componente | No Wokwi (`diagram.json`) | Na placa física ([README do sensor](../sensor-esp32/README.md)) | Pino |
|---|---|---|---|
| Microcontrolador | `board-esp32-devkit-c-v4` | ESP32 DevKit (ESP32-WROOM-32), placa "ESP32 Dev Module" | — |
| Sensor ultrassônico | `wokwi-hc-sr04` (distância inicial 81 cm) | HC-SR04 em 5 V, ou HC-SR04P em 3V3 | TRIG GPIO 5; ECHO GPIO 18 |
| Divisor de tensão do ECHO | — | Resistores de 1 kΩ e 2 kΩ (ECHO sai com 5 V; o ESP32 aceita 3,3 V) | GPIO 18 |
| LED vermelho "Alerta" | `wokwi-led` + `wokwi-resistor` 220 Ω | Opcional, com 220 Ω | GPIO 26 |
| LED verde "API OK" | `wokwi-led` + `wokwi-resistor` 220 Ω | Opcional, com 220 Ω | GPIO 27 |
| Botão "Enviar agora" | `wokwi-pushbutton` azul (tecla `e`) | Opcional, ligado ao GND (`INPUT_PULLUP`) | GPIO 4 |

### Ferramentas do firmware

| Ferramenta | Versão | Uso | Situação |
|---|---|---|---|
| Wokwi (wokwi.com) | Serviço online | ESP32 virtual: cola-se o `.ino` e o `diagram.json` num projeto ESP32; Wi-Fi `Wokwi-GUEST`, que só alcança a internet | Adicionado (PR #3); não executado nos PRs |
| Arduino IDE 2 | Não fixada | Carregar o firmware na placa: URL de placas `https://espressif.github.io/arduino-esp32/package_esp32_index.json`, pacote "esp32 by Espressif Systems", placa "ESP32 Dev Module", monitor serial em 115200 | Documentado (PR #3); não verificado |
| arduino-cli | Não fixada (instalada pela action `arduino/setup-arduino-cli@v2`) | Compilação no CI: `arduino-cli compile --fqbn esp32:esp32:esp32 --warnings default` | Adicionado (PR #3) |
| Core `esp32:esp32` (Arduino-ESP32) | Não fixada no workflow. Instalada do índice da Espressif; a pasta `~/.arduino15` fica em cache com chave fixa (`arduino15-esp32-<SO>-v1`); o passo `arduino-cli core list` mostra a versão no log do CI | Bibliotecas `WiFi`, `WiFiClientSecure`, `HTTPClient` e compilador do ESP32 | Adicionado (PR #3) |
| g++ | A do runner `ubuntu-latest` (o teste pede g++ 9 ou mais novo) | Compila [`firmware_testes.cpp`](../sensor-esp32/testes/firmware_testes.cpp), que inclui o próprio `.ino`, com `-std=c++17 -Wall -Wextra` | Adicionado (PR #3) |
| Mocks do Arduino | [`sensor-esp32/testes/mocks/`](../sensor-esp32/testes/mocks/) (`Arduino.h`, `WiFi.h`, `WiFiClientSecure.h`, `HTTPClient.h`) | Hardware simulado no PC: relógio virtual, HC-SR04, Wi-Fi e cliente HTTP que grava as requisições | Adicionado (PR #3) |
| cloudflared | Instalado à parte | Túnel público (`cloudflared tunnel --url http://localhost:3000`) para o Wokwi e os celulares alcançarem a API do PC | Documentado a partir do PR #3 (README do sensor); depois também no LEIA-PRIMEIRO, nos READMEs dos apps e na saída do `endereco-celular.mjs` |

### Sensor virtual no PC

[`sensor-virtual.mjs`](../sensor-esp32/simulador-pc/sensor-virtual.mjs) não tem `package.json` nem
dependências. O README do sensor pede Node 18 ou mais novo; o CI usa Node 24. Usa `node:http` (painel
em `http://localhost:4010`, porta mudável com `--porta`), `node:util` (`parseArgs`), `node:url` e o
`fetch` global. Os testes usam `node:test`, `node:assert/strict`, `node:child_process` e `node:http`.
Detalhes do simulador em [Sensor ESP32 e simulador](04-sensor-esp32-e-simulador.md).

## Apps Android do síndico e da empresa

Os dois apps têm o mesmo catálogo de bibliotecas e o mesmo `app/build.gradle.kts`; só mudam o
`namespace` e o `applicationId`. A base é o `CoillectMobileRemake` (`4d594a3`). Arquivos de referência
(síndico; o da empresa é igual):
[`gradle/libs.versions.toml`](https://github.com/CoillectADM/app-mobile-sindico/blob/main/gradle/libs.versions.toml),
[`app/build.gradle.kts`](https://github.com/CoillectADM/app-mobile-sindico/blob/main/app/build.gradle.kts),
[`gradle/wrapper/gradle-wrapper.properties`](https://github.com/CoillectADM/app-mobile-sindico/blob/main/gradle/wrapper/gradle-wrapper.properties).

### Build e SDK

| Item | Valor | Onde | Situação |
|---|---|---|---|
| Android Gradle Plugin (`com.android.application`) | 9.3.2 | `gradle/libs.versions.toml` | Pré-existente |
| Kotlin Android (`org.jetbrains.kotlin.android`) | 2.2.10 | `gradle/libs.versions.toml` | Pré-existente |
| Compose Compiler (`org.jetbrains.kotlin.plugin.compose`) | 2.2.10 (versão do Kotlin) | `gradle/libs.versions.toml` | Pré-existente |
| Gradle (wrapper) | 9.5.0 | `gradle/wrapper/gradle-wrapper.properties` | Pré-existente |
| `compileSdk` / `targetSdk` | 36 / 36 | `app/build.gradle.kts` | Pré-existente |
| `minSdk` | 26 (Android 8.0) | `app/build.gradle.kts` | Pré-existente |
| Alvo Java/Kotlin | 17 (`compileOptions` e `kotlinOptions.jvmTarget`) | `app/build.gradle.kts` | Pré-existente |
| `namespace` / `applicationId` | `br.com.coillect.sindico` e `br.com.coillect.empresa` | `app/build.gradle.kts` | Alterado (era `com.example.coillectremake`) — PR #1 de cada app |
| `versionCode` / `versionName` | 1 / `0.1.0-mvp` | `app/build.gradle.kts` | Alterado (`versionName` era `1.0`) — PR #1 de cada app |
| `BuildConfig.API_URL` | Vem de `COILLECT_API_URL` (propriedade Gradle, variável de ambiente ou `local.properties`); padrão `http://10.0.2.2:3000/api/` | `app/build.gradle.kts` | Adicionado — PR #1 de cada app (no lugar de `MAPS_API_KEY`/`MAPS_ENABLED`, removidos) |
| Assinatura de debug | Chave fixa `app/coillect-debug.keystore` (PKCS12), versionada de propósito para o APK novo instalar por cima | `app/build.gradle.kts` | Adicionado — PR #3 de cada app |
| Repositórios Maven | `google()`, `mavenCentral()`, `gradlePluginPortal()` | `settings.gradle.kts` | Pré-existente |
| `gradle.properties` | `-Xmx2048m`, AndroidX e flags do AGP (`android.builtInKotlin=false`, `android.newDsl=false` e outras) | `gradle.properties` | Pré-existente, sem mudança |
| JDK no CI | Temurin 21 (`actions/setup-java@v4`) | `.github/workflows/android.yml` | Adicionado — PR #1 de cada app (o MobileRemake não tinha CI) |
| JDK e SDK locais | JDK 17 ou 21, Android SDK 36 (README) | README de cada app | Pré-existente |

### Bibliotecas do catálogo

| Alias no catálogo | Coordenada Maven | Versão | Configuração | Uso no app | Situação |
|---|---|---|---|---|---|
| `androidx-compose-bom` | `androidx.compose:compose-bom` | 2024.12.01 | `implementation(platform(...))` | Define as versões das bibliotecas Compose sem versão no catálogo | Pré-existente |
| `androidx-core-ktx` | `androidx.core:core-ktx` | 1.15.0 | `implementation` | Declarada; nenhum import direto no código | Pré-existente |
| `androidx-activity-compose` | `androidx.activity:activity-compose` | 1.9.3 | `implementation` | `ComponentActivity`, `setContent`, `enableEdgeToEdge` (`MainActivity.kt`); `BackHandler` (`ui/SindicoApp.kt`, `ui/EmpresaApp.kt`) | Pré-existente |
| `androidx-lifecycle-viewmodel-compose` | `androidx.lifecycle:lifecycle-viewmodel-compose` | 2.8.7 | `implementation` | `ViewModel`, `viewModelScope`, `ViewModelProvider` (`ui/SindicoViewModel.kt`, `ui/EmpresaViewModel.kt`); `viewModel()` (`ui/SindicoApp.kt`, `ui/EmpresaApp.kt`) | Pré-existente |
| `androidx-lifecycle-runtime-compose` | `androidx.lifecycle:lifecycle-runtime-compose` | 2.8.7 | `implementation` | `collectAsStateWithLifecycle` (`ui/SindicoApp.kt`, `ui/EmpresaApp.kt`) | Pré-existente |
| `androidx-compose-ui` | `androidx.compose.ui:ui` | BOM | `implementation` | Toda a interface (`ui/**`) | Pré-existente |
| `androidx-compose-ui-tooling-preview` | `androidx.compose.ui:ui-tooling-preview` | BOM | `implementation` | `@Preview` em `ui/auth/LoginScreen.kt` e `ui/dashboard/DashboardScreen.kt` (síndico) ou `ui/home/HomeScreen.kt` (empresa) | Pré-existente |
| `androidx-compose-ui-tooling` | `androidx.compose.ui:ui-tooling` | BOM | `debugImplementation` | Renderização dos previews no Android Studio (só no build de debug) | Pré-existente |
| `androidx-compose-material3` | `androidx.compose.material3:material3` | BOM | `implementation` | Componentes Material 3 e tema (`ui/theme/CoillectTheme.kt`) | Pré-existente |
| `androidx-compose-material-icons-extended` | `androidx.compose.material:material-icons-extended` | BOM | `implementation` | Ícones do menu, dos botões e do campo de senha (`ui/SindicoApp.kt` ou `ui/EmpresaApp.kt`, e `ui/components/Components.kt`) | Pré-existente |
| `junit` | `junit:junit` | 4.13.2 | `testImplementation` | JUnit 4 nos testes de `app/src/test` | Pré-existente |
| `coroutines-test` | `org.jetbrains.kotlinx:kotlinx-coroutines-test` | 1.9.0 | `testImplementation` | `runTest`, `StandardTestDispatcher`, `Dispatchers.setMain` nos testes de ViewModel | Pré-existente |
| `orgjson` | `org.json:json` | 20240303 | `testImplementation` | `org.json` de verdade nos testes JVM; no aparelho, o `org.json` vem do próprio Android | **Adicionado** — PR #1 de cada app |
| `androidx-navigation-compose` | `androidx.navigation:navigation-compose` | 2.8.5 | — | — | **Removido** — PR #1 de cada app |
| `maps-compose` | `com.google.maps.android:maps-compose` | 6.4.1 | — | — (mapa saiu do escopo) | **Removido** — PR #1 de cada app |
| `androidx-compose-ui-test-junit4` | `androidx.compose.ui:ui-test-junit4` | BOM | — | — (teste instrumentado `CollectionFlowTest` apagado) | **Removido** — PR #1 de cada app |
| `androidx-compose-ui-test-manifest` | `androidx.compose.ui:ui-test-manifest` | BOM | — | — | **Removido** — PR #1 de cada app |
| `androidx-test-runner` | `androidx.test:runner` | 1.6.2 | — | — | **Removido** — PR #1 de cada app |

O `kotlinx-coroutines` usado no código principal (`Dispatchers.IO`, `withContext`, `StateFlow`) não é
declarado no catálogo: chega como dependência transitiva das bibliotecas AndroidX.

### Recursos da plataforma usados no lugar de bibliotecas

| Necessidade | Solução | Arquivo (síndico; a empresa tem o equivalente) |
|---|---|---|
| HTTP | `java.net.HttpURLConnection`, com 15 s para conectar e 60 s para ler; sem Retrofit, OkHttp ou Ktor | [`data/CoillectHttp.kt`](https://github.com/CoillectADM/app-mobile-sindico/blob/main/app/src/main/java/br/com/coillect/sindico/data/CoillectHttp.kt) |
| JSON | `org.json` (`JSONObject`, `JSONArray`) do Android | `data/CoillectHttp.kt`, `data/ApiSindicoRepository.kt`, `ui/Connection.kt`, `ui/SindicoViewModel.kt` |
| Datas | `java.time` (`Instant`, `ZoneId`, `DateTimeFormatter`) | `data/CoillectHttp.kt` |
| Lembrar servidor e e-mail | `SharedPreferences` (`coillect_login`; a senha não é gravada) | [`data/LoginMemory.kt`](https://github.com/CoillectADM/app-mobile-sindico/blob/main/app/src/main/java/br/com/coillect/sindico/data/LoginMemory.kt) |
| Rede no aparelho | Permissão `INTERNET` e `usesCleartextTraffic="true"` (HTTP simples para a API local) | [`AndroidManifest.xml`](https://github.com/CoillectADM/app-mobile-sindico/blob/main/app/src/main/AndroidManifest.xml) |

### Ferramentas

- **Android Studio** (abrir, sincronizar o Gradle e rodar) e emulador, onde o PC é `10.0.2.2`.
- **Depuração USB** para instalar pelo cabo, ou o APK da release `demo` (ver
  [GitHub Actions](#github-actions)).
- Detalhes de cada app em [App do síndico](05-app-sindico.md) e [App da empresa](06-app-empresa.md).

## App desktop do administrador

O desktop nasceu da mesma base (`CoillectMobileRemake`), convertida para Compose Multiplatform
Desktop (JVM) no PR #1 do repositório `interface-desktop-adm-coillect`. Arquivos:
[`gradle/libs.versions.toml`](https://github.com/CoillectADM/interface-desktop-adm-coillect/blob/main/gradle/libs.versions.toml),
[`app/build.gradle.kts`](https://github.com/CoillectADM/interface-desktop-adm-coillect/blob/main/app/build.gradle.kts),
[`gradle/wrapper/gradle-wrapper.properties`](https://github.com/CoillectADM/interface-desktop-adm-coillect/blob/main/gradle/wrapper/gradle-wrapper.properties).

### Build

| Item | Valor | Situação (em relação ao MobileRemake) |
|---|---|---|
| Kotlin JVM (`org.jetbrains.kotlin.jvm`) | 2.2.20 | Adicionado (no lugar do AGP e do Kotlin Android) |
| Compose Multiplatform (`org.jetbrains.compose`) | 1.9.3 | Adicionado |
| Compose Compiler (`org.jetbrains.kotlin.plugin.compose`) | 2.2.20 | Alterado (era 2.2.10) |
| Gradle (wrapper) | 8.14.3 | Alterado (era 9.5.0) |
| JDK | README: 17 ou superior; CI: Temurin 21. O build não define `jvmToolchain`: usa o JDK que roda o Gradle | — |
| Classe principal | `br.com.coillect.admin.MainKt` | Adicionado |
| Instaladores | `nativeDistributions`: MSI, EXE e DEB; `packageName` `CoillectAdmin`, `packageVersion` `1.0.0`; tarefa `:app:packageDistributionForCurrentOS` | Adicionado |
| Recursos | `src/main/res/drawable` (logo e ícone herdados) usado como pasta de recursos da JVM | Adicionado (reaproveita as imagens) |
| `gradle.properties` | Só `-Xmx2048m` e `kotlin.code.style=official` | Alterado (flags do Android removidas) |

### Bibliotecas

| Dependência | Versão | Configuração | Uso | Situação |
|---|---|---|---|---|
| `compose.desktop.currentOs` | Do plugin Compose Multiplatform 1.9.3 | `implementation` | Compose para o sistema operacional atual: `Window`, `application`, `rememberWindowState` (`Main.kt`), Skia (`org.jetbrains.skia.Image` em `ui/Components.kt`), `foundation` e `ui` | Adicionado |
| `compose.material3` | Do plugin 1.9.3 | `implementation` | Componentes Material 3 das abas (`ui/**`) | Adicionado (no MobileRemake vinha pelo BOM do Android) |
| `org.json:json` | 20240303 | `implementation` | JSON da API (`data/CoillectHttp.kt`, `data/ApiAdminRepository.kt`, `ui/AdminController.kt`); na JVM o `org.json` não vem embutido | Adicionado |
| `org.jetbrains.kotlinx:kotlinx-coroutines-core` | 1.10.2 | `implementation` | `Dispatchers.IO`/`withContext` no HTTP (`data/CoillectHttp.kt`), `CoroutineScope` e `StateFlow` (`ui/AdminController.kt`), `delay` (`ui/AdminApp.kt`) | Adicionado |
| `junit:junit` | 4.13.2 | `testImplementation` | JUnit 4 | Pré-existente |
| `org.jetbrains.kotlinx:kotlinx-coroutines-test` | 1.10.2 | `testImplementation` | `runTest`, `advanceUntilIdle` (`AdminControllerTest`) | Alterado (era 1.9.0) |

O HTTP do desktop também é `java.net.HttpURLConnection` + `org.json`, com 15 s para conectar e 60 s
para ler
([`data/CoillectHttp.kt`](https://github.com/CoillectADM/interface-desktop-adm-coillect/blob/main/app/src/main/kotlin/br/com/coillect/admin/data/CoillectHttp.kt)).
Para rodar, abra no IntelliJ IDEA ou no Android Studio, ou use `./gradlew :app:run`. Detalhes em
[Desktop do administrador](07-desktop-admin.md).

### Removido em relação ao MobileRemake

Plugins `com.android.application` (AGP 9.3.2) e `org.jetbrains.kotlin.android`; o BOM do Compose
2024.12.01 e todas as bibliotecas AndroidX (`core-ktx`, `activity-compose`, `lifecycle-*`,
`navigation-compose`, `compose-ui*`, `material3`, `material-icons-extended`, `ui-test-*`);
`maps-compose`; `androidx.test:runner`; as flags Android do `gradle.properties`; e os arquivos
`AndroidManifest.xml`, `proguard-rules.pro`, `res/values/themes.xml`, a pasta `.idea` e o teste
instrumentado `CollectionFlowTest`.

## Infraestrutura, CI e nuvem

### Imagens Docker

| Imagem | Tag | Onde | Para quê | Situação |
|---|---|---|---|---|
| `node` | `24-alpine` | [`backend/Dockerfile`](../backend/Dockerfile) (estágios de build e de execução) | Build (`npm ci`, `npm run build`, `npm prune --omit=dev`) e execução (`node dist/main.js`, `PORT=3000`) | Pré-existente. No PR #1 saíram o `bash` e o `wait-for-it.sh db:5432` do `ENTRYPOINT` |
| `postgres` | `17.5-alpine` | [`db/Dockerfile`](../db/Dockerfile) (serviço `db` do compose) | Banco local, porta 5482 no PC | Pré-existente |
| `postgres` | `17-alpine` | Serviços dos jobs `api` e `azure-storage` do `backend.yml`; `docker run` nos jobs `docker` e `sensor-na-api` | Banco dos testes no CI | Adicionado (PR #1) |
| `mcr.microsoft.com/azure-storage/azurite` | Sem tag | Serviço `azurite` do [`docker-compose.yaml`](../docker-compose.yaml); serviço do job `azure-storage`; `docker run` no job `docker` | Emulador oficial do Azure Storage (Blob 10000, Queue 10001, Table 10002) | Adicionado (PR #4) |
| `node` + `nginx` | `24-alpine` / `1.27-alpine` | [`frontend/Dockerfile`](../frontend/Dockerfile) | Build e servidor do frontend web antigo (serviço `frontend`, porta 8080) | Legado, não alterado e fora do MVP |
| `ghcr.io/coillectadm/coillect-api` | `latest` e o SHA do commit | Gerada pelo [`imagem-api.yml`](../.github/workflows/imagem-api.yml) | Imagem que o App Service baixaria | Adicionado (PR #4) |

### Docker Compose

[`docker-compose.yaml`](../docker-compose.yaml) (`version: "3.9"`, rede `appnet`, volume `db-data`):

| Serviço | Imagem ou build | Portas no PC | O que mudou no MVP |
|---|---|---|---|
| `db` | Build de `./db` (`postgres:17.5-alpine`); usuário e senha `postgres`, banco `app_db`; health check `pg_isready` a cada 10 s | 5482 → 5432 | Nada |
| `azurite` | `mcr.microsoft.com/azure-storage/azurite` | 10000, 10001, 10002 | Adicionado (PR #4) |
| `backend` | Build de `./backend` | 3000 | PR #1: `backend/.env` opcional (`required: false`), `PORT` e `SEED_DEMO`. PR #4: espera o `azurite` e recebe `AZURE_STORAGE_CONNECTION_STRING`, com padrão apontando para o Azurite do compose |
| `frontend` | Build de `./frontend` | 8080 → 80 | Nada (legado) |

### Frontend web antigo (legado)

O `frontend/` (React + Vite) é do projeto original e não faz parte do MVP. Nenhum PR de 10/11/2026
alterou arquivos dele (a cópia da base usada aqui não inclui `frontend/`; a informação vem das listas
de arquivos dos PRs) e nenhum workflow o testa. Pacotes declarados em
[`frontend/package.json`](../frontend/package.json), todos pré-existentes:

| Pacote | Versão declarada | Tipo | Uso |
|---|---|---|---|
| `react`, `react-dom` | `^19.1.0` | `dependencies` | Interface |
| `react-router-dom` | `^7.6.2` | `dependencies` | Rotas das páginas (`src/App.tsx` e páginas) |
| `axios` | `^1.9.0` | `dependencies` | Chamadas à API (`src/api/axios.ts`, `src/api/companyAxios.ts`, `src/api.js`, `src/services/api/collectionRequestApi.ts` e páginas) |
| `jwt-decode` | `^4.0.0` | `dependencies` | Decodifica o token JWT (`src/pages/company-login/CompanyLoginPage.tsx`) |
| `vite`, `@vitejs/plugin-react-swc` | `^6.3.5`, `^3.9.0` | `devDependencies` | Build (`tsc -b && vite build`) e servidor de desenvolvimento (porta 5173) |
| `typescript` | `~5.8.3` | `devDependencies` | Compilador |
| `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals` | `^9.25.0`, `^9.25.0`, `^8.30.1`, `^5.2.0`, `^0.4.19`, `^16.0.0` | `devDependencies` | Lint (`npm run lint`) |
| `@types/react`, `@types/react-dom` | `^19.1.2` | `devDependencies` | Tipos |

### GitHub Actions

Todos os jobs rodam em `ubuntu-latest`. Actions usadas, com versão:

| Action | Versão | Workflow e job | Para quê |
|---|---|---|---|
| `actions/checkout` | v5 | `backend.yml` (`api`, `azure-storage`, `docker`), `imagem-api.yml` (`publicar`), `sensor-esp32.yml` (`firmware-pc`, `firmware-esp32`, `sensor-na-api`), `documentacao.yml` (`verificar`) | Baixar o repositório |
| `actions/checkout` | v4 | `android.yml` dos dois apps (`build`), `desktop.yml` (`build`) | Baixar o repositório |
| `actions/setup-node` | v5 | `backend.yml` (`api`, `azure-storage`: Node 24, cache npm de `backend/package-lock.json`); `sensor-esp32.yml` (`firmware-pc`, `sensor-na-api`: Node 24); `documentacao.yml` (`verificar`: Node 24, para o mermaid-cli) | Instalar o Node |
| `actions/setup-java` | v4 | `android.yml`, `desktop.yml` (Temurin 21) | Instalar o JDK |
| `actions/upload-artifact` | v4 | `sensor-esp32.yml` (`roteiro-firmware`); `android.yml` (APK de debug, guardado por 7 dias) | Publicar artefatos |
| `actions/download-artifact` | v4 | `sensor-esp32.yml` (`sensor-na-api`) | Receber o roteiro gravado pelo teste do firmware |
| `actions/cache` | v4 | `sensor-esp32.yml` (`firmware-esp32`: pasta `~/.arduino15`) | Cache do core ESP32 |
| `arduino/setup-arduino-cli` | v2 | `sensor-esp32.yml` (`firmware-esp32`) | Instalar o arduino-cli |
| `docker/setup-buildx-action` | v3 | `imagem-api.yml` | Preparar o Docker Buildx |
| `docker/login-action` | v3 | `imagem-api.yml` (registro `ghcr.io`, usuário `github.actor`, `GITHUB_TOKEN`) | Login no GHCR |
| `docker/build-push-action` | v6 | `imagem-api.yml` (contexto `./backend`) | Build e push da imagem |

Não são usados `gradle/actions/*` (os workflows chamam `./gradlew --no-daemon` direto, sem cache do
Gradle) nem `actions/setup-python` (o `report_errors.py` roda no `python3` do runner). Os jobs também
chamam direto `docker`, `docker compose config`, `curl`, `g++`, `python3`, `gh` e `git`. O job
`docker` do `backend.yml` não chama `setup-node`: usa o Node que já vem no runner.

Os workflows foram adicionados nos PRs: `backend.yml` no PR #1 (alterado nos PRs #4 e #6),
`sensor-esp32.yml` no PR #3, `imagem-api.yml` no PR #4, `android.yml` no PR #1 de cada app (release
`demo` no PR #3) e `desktop.yml` no PR #1 do desktop. O script `.github/scripts/report_errors.py`
entrou junto com o primeiro workflow de cada repositório. O `documentacao.yml`, com o script
`.github/scripts/verificar_documentacao.py`, entrou junto com esta pasta de documentação. Passo a
passo de cada workflow em [Testes e CI](11-testes-e-ci.md).

### Outras ferramentas

| Ferramenta | Uso no Coillect | Onde | Situação |
|---|---|---|---|
| GitHub CLI (`gh`) | Recria a release `demo` a cada push na `main`: `gh release delete demo --yes --cleanup-tag` e `gh release create demo <apk>` | `android.yml` dos dois apps | Adicionado (PR #3 de cada app) |
| GitHub Releases | Release `demo` com `coillect-sindico.apk` e `coillect-empresa.apk` (link fixo) | Repositórios dos apps | Adicionado (PR #3 de cada app) |
| GitHub Container Registry (GHCR) | Guarda `ghcr.io/coillectadm/coillect-api` (`latest` e SHA). Tornar o pacote público é um passo manual, feito uma vez (comentário do workflow) | `imagem-api.yml` | Adicionado (PR #4) |
| Render | Blueprint gratuito: serviço web Docker `coillect-api` (health check `/api/health`, rebuild só com mudança em `backend/**`) e PostgreSQL `coillect-db`; `JWT_SECRET` gerado pelo Render | [`render.yaml`](../render.yaml) | Adicionado (PR #1); deploy não verificado |
| Azurite | Emulador do Azure Storage; conta `devstoreaccount1`; connection string `UseDevelopmentStorage=true` (no compose, com `DevelopmentStorageProxyUri=http://azurite`) | `docker-compose.yaml`, `backend.yml` | Adicionado (PR #4) |
| Swagger UI | Documentação interativa em `/api/docs` (título "Coillect API", versão `2.0`, autenticação Bearer) | `src/app.setup.ts` | Pré-existente (versão e descrição atualizadas no PR #1) |
| cloudflared | Túnel público `https://<endereço>.trycloudflare.com` para o Wokwi e os celulares | README do sensor, [LEIA-PRIMEIRO-CODEX.txt](../LEIA-PRIMEIRO-CODEX.txt) §5.4 e §5.5.1, saída do `endereco-celular.mjs` | Documentado; não é instalado pelo projeto |
| Azure Storage Explorer | Opcional: ver a fila e o Blob do Azurite | LEIA-PRIMEIRO §5.0 e §5.7 | Documentado |
| Python 3 | `report_errors.py`, só com a biblioteca padrão (`pathlib`, `re` e `sys` no CoillectApp; `os` e `sys` nos apps e no desktop); `verificar_documentacao.py` (`argparse`, `os`, `re`, `sys`, `unicodedata`) | `.github/scripts/` dos quatro repositórios | Adicionado |
| mermaid-cli (`@mermaid-js/mermaid-cli`) | Desenha cada diagrama Mermaid desta documentação no CI; um diagrama inválido falha o workflow | `documentacao.yml` (instalado com `npm install` no job, versão 11) | Adicionado com esta documentação |

### Serviços da Azure planejados

Planejados em [`docs/azure-a02.md`](../docs/azure-a02.md) §1 e §7. **Nenhum foi criado nem
verificado nos PRs** (PR #4: "Não verificado: Storage Account real na Azure, App Service, PostgreSQL
Flexible e Log Analytics"). O código da API já usa o Storage pela API REST e foi testado contra o
Azurite. Detalhes em [Azure Storage e nuvem](08-azure-storage-e-nuvem.md).

| Recurso (nome sugerido) | Serviço / SKU sugerido | Papel no Coillect |
|---|---|---|
| `rg-coillect` | Grupo de recursos (Brazil South; East US se a assinatura bloquear) | Agrupa tudo |
| `stcoillect<sufixo>` | Storage Account StorageV2, Standard, LRS (ou GRS) | Blob `comprovantes-coleta`; filas `coillect-notificacoes` e `coillect-notificacoes-poison` |
| `psql-coillect-<sufixo>` | Azure Database for PostgreSQL Flexible Server, Burstable B1ms, 32 GB | Banco da API (`DATABASE_URL` com `DATABASE_SSL=true`) |
| `asp-coillect` e `app-coillect-<sufixo>` | App Service Plan Linux B1 e Web App for Containers | Roda a imagem `ghcr.io/coillectadm/coillect-api:latest`; Health check em `/api/health` |
| `log-coillect` | Log Analytics workspace | Recebe o stdout da API (eventos JSON na tabela `AppServiceConsoleLogs`), logs HTTP e métricas; consultas KQL |
| `appi-coillect` | Application Insights (baseado no workspace) | Teste de disponibilidade de `/api/health` a cada 5 min e alertas |
| Painel "Coillect — Operação" | Dashboard do portal da Azure | Gráficos das consultas e das métricas |

## Resumo: o que entrou e o que saiu no MVP

### Adicionado

| Componente | Item | Versão | PR |
|---|---|---|---|
| API | Nenhum pacote npm. Só scripts (`test:mvp`, `test:e2e:mvp`, `test:e2e:azure`, `smoke`) e configuração do Jest (`moduleNameMapper`, `testTimeout` dos e2e) | — | #1 e #4 |
| API | Módulos nativos no código novo: `crypto`, `fs`, `path` (`src/cloud/`) e `node:os`, `node:url`, `node:test`, `node:assert/strict` (scripts) | Do Node | #4 e #6 |
| API | Azure Storage pela API REST (Shared Key ou SAS), sem SDK | API REST `2021-08-06` | #4 |
| Infraestrutura | Azurite no compose e no CI | Sem tag | #4 |
| Infraestrutura | PostgreSQL `17-alpine` no CI | 17 | #1 |
| CI | `backend.yml`, `sensor-esp32.yml`, `imagem-api.yml` e `report_errors.py` | Actions da tabela acima | #1, #3 e #4 |
| Infraestrutura | Imagem no GHCR (`ghcr.io/coillectadm/coillect-api`) | `latest` e SHA | #4 |
| Infraestrutura | Blueprint do Render (`render.yaml`) | — | #1 |
| Sensor | Firmware com bibliotecas do core Arduino-ESP32 (`WiFi`, `WiFiClientSecure`, `HTTPClient`), circuito do Wokwi, arduino-cli e core `esp32:esp32` no CI, testes com g++ e mocks, sensor virtual com módulos `node:*` | Core não fixado | #3 |
| Ferramentas | cloudflared (túnel), só documentado | — | #3 em diante |
| Apps Android | `org.json:json` (`testImplementation`) | 20240303 | PR #1 de cada app |
| Apps Android | `android.yml` (JDK Temurin 21, APK como artefato) e `report_errors.py` | — | PR #1 de cada app |
| Apps Android | Release `demo` com `gh` e chave de debug fixa `coillect-debug.keystore` | — | PR #3 de cada app |
| Desktop | Kotlin JVM; Compose Multiplatform (`compose.desktop.currentOs`, `compose.material3`) | 2.2.20; 1.9.3 | PR #1 do desktop |
| Desktop | `org.json:json`, `kotlinx-coroutines-core` | 20240303; 1.10.2 | PR #1 do desktop |
| Desktop | `desktop.yml` (JDK Temurin 21) e `report_errors.py` | — | PR #1 do desktop |
| Documentação | `documentacao.yml`, `verificar_documentacao.py` e mermaid-cli | mermaid-cli 11 | PR desta documentação |

### Removido ou trocado

| Componente | Item | Versão anterior | PR |
|---|---|---|---|
| API | Nenhum pacote npm removido | — | — |
| Imagem da API | `apk add bash` e `ENTRYPOINT` com `wait-for-it.sh db:5432` (o arquivo `wait-for-it.sh` continua no repositório, sem uso) | — | #1 |
| Apps Android | `androidx.navigation:navigation-compose` | 2.8.5 | PR #1 de cada app |
| Apps Android | `com.google.maps.android:maps-compose` e a configuração `MAPS_API_KEY`/`MAPS_ENABLED` | 6.4.1 | PR #1 de cada app |
| Apps Android | `androidx.compose.ui:ui-test-junit4` e `ui-test-manifest` | BOM 2024.12.01 | PR #1 de cada app |
| Apps Android | `androidx.test:runner` e o teste instrumentado `CollectionFlowTest` | 1.6.2 | PR #1 de cada app |
| Desktop | AGP e plugin Kotlin Android | 9.3.2; 2.2.10 | PR #1 do desktop |
| Desktop | BOM do Compose e todas as bibliotecas AndroidX, `maps-compose`, `navigation-compose`, `ui-test-*`, `androidx.test:runner` | Ver catálogo do MobileRemake | PR #1 do desktop |
| Desktop | Gradle 9.5.0, trocado por 8.14.3 | 9.5.0 | PR #1 do desktop |
| Desktop | `kotlinx-coroutines-test` 1.9.0, trocado por 1.10.2 | 1.9.0 | PR #1 do desktop |
| Desktop | Compose Compiler 2.2.10, trocado por 2.2.20 | 2.2.10 | PR #1 do desktop |

## Limites desta lista

- As versões npm são faixas; as versões exatas instaladas (no `package-lock.json`) não foram
  conferidas.
- Não estão fixadas, e por isso não aparecem aqui: a versão do core `esp32:esp32`, do arduino-cli, do
  g++, do Node do runner no job `docker` e a tag do Azurite.
- Nada desta lista foi verificado em ambiente real. O CI compilou e testou a API, o firmware (no PC e
  para o ESP32), o sensor virtual e os três apps; nada rodou em celular, na placa ESP32 física, no
  wokwi.com, numa máquina com o desktop aberto, na Azure ou no Render.
