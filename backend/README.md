# Coillect API (backend)

API NestJS + PostgreSQL do MVP Coillect. Liga o sensor do barril de óleo aos três apps:

```
Sensor físico (ESP32) ou sensor virtual
  └─ POST /api/sensor-alert { sensorId, percentual, dataHora }      (SensorAlertController)
       └─ SensorAlertService.processarAlerta: atualiza o sensor e grava a leitura
            └─ listener: barril atingiu o limite e não há coleta aberta?
                 └─ cria UMA solicitação de coleta do barril (PENDING)
                      └─ mensagem na FILA (Azure Queue Storage; em memória sem Azure)
                           ├─ app-mobile-empresa: aviso da solicitação; agenda e conclui
                           ├─ app-mobile-sindico: só a cópia/notificação da MESMA solicitação
                           └─ coleta concluída → comprovante JSON no Azure Blob Storage
interface-desktop-adm-coillect: cadastra, acompanha tudo e mostra a fila e o Blob (aba Nuvem)
```

## Rodar

Com Docker (recomendado), na raiz do repositório:

```bash
docker compose up -d --build db azurite backend
```

O `azurite` é o emulador oficial do Azure Storage: com ele a API usa Blob e Queue "de verdade"
na sua máquina. Para usar a Storage Account da Azure, defina `AZURE_STORAGE_CONNECTION_STRING`
antes do `docker compose up` (ver [azure-a02.md](../docs/azure-a02.md)).

- API: `http://localhost:3000/api` · Swagger: `http://localhost:3000/api/docs`
- No emulador Android, o endereço do computador é `http://10.0.2.2:3000/api/`.

Sem Docker (banco do compose na porta 5482):

```bash
cd backend
cp .env.example .env      # ajuste se precisar
npm ci
npm run start:dev
```

Sem `AZURE_STORAGE_CONNECTION_STRING` a API roda em **modo local**: comprovantes na pasta
`backend/storage-local/` e fila em memória (as notificações saem na hora).

## Contas de demonstração

Criadas automaticamente na primeira subida (`SEED_DEMO=true`):

| Perfil | Login | Senha |
|---|---|---|
| Síndico | `sindico@coillect.com` | `Coillect@2025` |
| Empresa coletora | `empresa@coillect.com` | `Coillect@2025` |
| Desktop administrativo | sem login | — |

Mesmos nomes dos mockups dos apps:

| Condomínio | Bairro | Barril | Sensor | Nível inicial |
|---|---|---|---|---|
| Residencial Aurora (síndico Leonardo Costa) | Jardim Paulista | `BRL-8472` | `CLT-8472-A` | 0% (usado na demonstração) |
| Condomínio Bosque | Vila Mariana | `BRL-1264` | `CLT-1264-B` | 62% |
| Edifício Átria | Pinheiros | `BRL-9801` | `CLT-9801-C` | 31% |

Empresa coletora dos três: EcoColeta Ambiental. Limite de alerta: 80%.

Para repetir a apresentação do zero: `POST /api/admin/demo/reset`.

## Simular o sensor agora

```bash
# na raiz do repositório: sensor virtual com painel em http://localhost:4010 (Node 18+, sem instalar nada)
node sensor-esp32/simulador-pc/sensor-virtual.mjs --api http://localhost:3000/api

# ou uma leitura avulsa
curl -X POST http://localhost:3000/api/sensor-alert \
  -H "Content-Type: application/json" -d '{"sensorId":"CLT-8472-A","percentual":86}'
```

O ESP32 virtual (Wokwi) e o ESP32 físico estão em [`sensor-esp32/`](../sensor-esp32/README.md).

## Testes

| Comando | O que verifica |
|---|---|
| `npm run test:mvp` | Regra de disparo, contrato do sensor, formatos de resposta, textos das notificações, configuração, cliente do Azure Storage (assinatura Shared Key, XML), fila (poison, nova tentativa, fallback) e comprovante |
| `npm run test:e2e:mvp` | Fluxo completo contra PostgreSQL real (reinicia os dados de demonstração do banco usado) |
| `npm run test:e2e:azure` | Fila e comprovantes no Azure Storage (Azurite ou conta real em `AZURE_STORAGE_CONNECTION_STRING`) |
| `npm run smoke -- <URL>/api --reset` | O mesmo ciclo contra uma API já publicada (local ou cloud) |

O GitHub Actions roda todos a cada push em `backend/` (o de Azure contra o Azurite) e publica a imagem `ghcr.io/coillectadm/coillect-api` a cada merge na `main`.

## Documentação

- [Contrato do sensor](../docs/contrato-sensor.md): payload, respostas, regra de disparo
- [Sensor ESP32 físico e virtual](../sensor-esp32/README.md): firmware, Wokwi e sensor virtual no PC
- [API para os três apps](../docs/api-apps.md): rotas por app, formatos e o que falta nos apps
- [Publicar na cloud](../docs/deploy-cloud.md): variáveis de ambiente, Azure, Render e outros provedores
- [Azure — Atividade A02](../docs/azure-a02.md): Blob, Queue, monitoramento, backup, alta disponibilidade e passo a passo no portal
- [Estado atual do backend](../docs/estado-atual.md): o que foi reutilizado, ajustado e criado
- [Diagramas de classes × código](../docs/diagramas.md): onde cada classe dos diagramas está implementada
