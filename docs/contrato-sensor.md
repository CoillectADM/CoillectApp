# Contrato do sensor (físico e virtual)

Este é o **único** formato que a API aceita para leituras de nível. Ele segue os diagramas de classes do projeto: o sensor monta um `AlertPayload` e o `RouterClient.enviarAlerta()` envia para o `SensorAlertController.receberAlerta()` da API. O sensor físico (ESP32 via Wi-Fi/roteador) e o sensor virtual enviam exatamente a mesma requisição; depois que ela chega à API, o fluxo é idêntico.

## Requisição

```
POST <URL_DA_API>/api/sensor-alert
Content-Type: application/json

{ "sensorId": "CLT-8472-A", "percentual": 86, "dataHora": "2026-11-10T14:32:05-03:00" }
```

| Campo | Tipo | Regra |
|---|---|---|
| `sensorId` | texto | `SensorConfig.sensorId`. Precisa estar cadastrado na API (`POST /api/admin/sensors`). Até 60 caracteres. |
| `percentual` | número | Nível do barril de 0 a 100, calculado no sensor (`FillLevelCalculator.calcularPercentual`). Decimais são arredondados; texto numérico (`"86"`) também é aceito. |
| `dataHora` | texto (opcional) | Hora da medição no dispositivo. Guardada como veio; a hora oficial é a de recebimento na API. Se o ESP32 não tiver relógio (NTP), pode omitir. |

- A rota antiga `POST /api/sensor/readings` continua funcionando, inclusive com o formato antigo `{ "sensorId": "...", "level": 85 }`.
- Campos fora do contrato são recusados (HTTP 400).
- O sensor **não faz login** e não envia token: basta a URL da API e o próprio `sensorId`.

## Quando enviar

Decisão do projeto: **envio periódico + alerta imediato**.

- O sensor envia a leitura a cada intervalo (sugestão: 10–30 s no sensor virtual durante a apresentação; 1–5 min no ESP32 real) para os apps mostrarem o nível real (31%, 62%, 75%…).
- Quando `FillLevelCalculator.atingiuLimite(percentual, limiteAlerta)` passa a ser verdadeiro, o sensor envia **na hora**, sem esperar o intervalo. Um novo alerta só vale depois de o nível baixar 10 pontos abaixo do limite.
- O firmware e o simulador também enviam antes do intervalo quando o nível muda 5 pontos ou mais (no máximo um envio a cada 3 s), para os apps acompanharem a demonstração.
- Quem decide se cria a coleta é sempre a **API** (regra abaixo). Por isso o limite do sensor serve só para antecipar o envio: se o firmware enviar somente no alerta, o fluxo continua funcionando.
- Um sensor que enviou leitura nos últimos 30 min aparece como `online: true` (ajustável por `SENSOR_ONLINE_MINUTES`).

## Respostas

| HTTP | Quando | O que o dispositivo faz |
|---|---|---|
| **201** | Leitura registrada | Nada; segue enviando |
| 400 | Payload fora do contrato (ex.: `percentual: 150`) | Corrigir o firmware/simulador |
| 404 | `sensorId` não cadastrado | Cadastrar o sensor no admin |
| 5xx / sem resposta | API fora do ar ou "acordando" | Tentar de novo na próxima leitura |

Corpo da resposta 201 (resumido):

```json
{
  "error": false,
  "statusCode": 201,
  "message": "Leitura registrada. Solicitação de coleta #12 criada.",
  "requester": "sensor:CLT-8472-A",
  "data": {
    "reading": { "id": 345, "sensorId": "CLT-8472-A", "percentual": 86, "level": 86, "dataHora": "2026-11-10T14:32:05-03:00", "receivedAt": "2026-11-10T17:32:06.120Z" },
    "sensor": { "sensorId": "CLT-8472-A", "barrelCode": "BRL-8472", "condominiumName": "Residencial Aurora", "level": 86, "threshold": 80, "needsCollection": true, "online": true, "lastCollectionAt": null, "openRequest": { "id": 12, "status": "PENDING" } },
    "collection": {
      "triggered": true,
      "reason": "THRESHOLD_REACHED",
      "request": { "id": 12, "status": "PENDING", "origin": "SENSOR", "levelAtRequest": 86, "barrel": { "code": "BRL-8472" } }
    }
  }
}
```

## Regra de disparo (listener)

A cada leitura, o `SensorAlertService.processarAlerta()` atualiza o sensor (`percentualAtual`, `ultimaLeitura`), grava o histórico e publica o evento `sensor.reading.received`. O **listener** (`backend/src/collection-request/sensor-trigger.listener.ts`) avalia:

| Condição | `collection.reason` | Resultado |
|---|---|---|
| `percentual` < `limiteAlerta` do barril | `BELOW_THRESHOLD` | Só registra a leitura |
| Sensor não instalado em um barril | `SENSOR_NOT_INSTALLED` | Não cria; avisa no log |
| Já existe solicitação `PENDING` ou `SCHEDULED` para o barril | `REQUEST_ALREADY_OPEN` | Não duplica; devolve a solicitação aberta |
| Coleta concluída e o sensor ainda não leu o barril abaixo do limite | `AWAITING_EMPTY_READING` | Não cria: espera a leitura do barril vazio |
| Condomínio do barril sem empresa coletora | `NO_COMPANY_LINKED` | Não cria; avisa no log |
| Atingiu o limite e nenhuma aberta | `THRESHOLD_REACHED` | Cria **uma** solicitação `PENDING` do barril |

- O limite fica no **barril** (`alertThreshold`, padrão 80%). Altere com `PATCH /api/admin/barrels/{id}`.
- A solicitação vai para a **empresa** do condomínio (app-mobile-empresa), com o barril e o sensor, e a empresa recebe o aviso "Residencial Aurora chegou a 86% de capacidade.".
- O **síndico** recebe só uma cópia/notificação da **mesma** solicitação (app-mobile-sindico). Ele não pode cancelar nem concluir coletas geradas pelo sensor ou pela empresa (HTTP 403).
- Quando a empresa conclui a coleta, o barril volta a 0% e `lastCollectionAt` é preenchido. O próximo ciclo começa quando o sensor lê o barril **abaixo do limite** (o barril foi esvaziado de fato). Até lá, leituras no limite respondem `AWAITING_EMPTY_READING` e não abrem outra solicitação; isso evita uma coleta repetida se o barril simulado continuar cheio no Wokwi ou se o sensor ainda não tiver feito a leitura.

## Exemplos

curl (Linux/macOS/Git Bash):

```bash
curl -X POST http://localhost:3000/api/sensor-alert \
  -H "Content-Type: application/json" \
  -d '{"sensorId":"CLT-8472-A","percentual":86,"dataHora":"2026-11-10T14:32:05-03:00"}'
```

PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/sensor-alert `
  -ContentType 'application/json' -Body '{"sensorId":"CLT-8472-A","percentual":86}'
```

ESP32 (Arduino): o firmware completo, com as classes do diagrama do sensor, está em [`sensor-esp32/coillect_sensor/coillect_sensor.ino`](../sensor-esp32/coillect_sensor/coillect_sensor.ino). É o mesmo arquivo para o Wokwi e para a placa física. Pontos que fazem diferença:

- `WiFiClientSecure` com `setInsecure()` quando a URL é `https://` (cloud); `WiFiClient` quando é `http://` (rede local);
- `http.setTimeout(60000)`: a cloud gratuita pode levar ~1 min para "acordar" (o parâmetro é `uint16_t`, então o máximo é 65535 ms);
- `dataHora` só vai no JSON depois que o relógio sincronizou por NTP;
- a resposta da API (`message`, `collection.reason`, `sensor.openRequest`, `sensor.lastCollectionAt`) aparece no monitor serial.

## Para o sensor virtual

Pronto em [`sensor-esp32/`](../sensor-esp32/README.md), nas duas formas:

- **ESP32 virtual no Wokwi:** o firmware acima rodando num ESP32 simulado, com HC-SR04, LEDs e botão (`sensor-esp32/coillect_sensor/diagram.json`). Precisa da API com URL pública (cloud ou túnel).
- **Sensor virtual no PC:** `node sensor-esp32/simulador-pc/sensor-virtual.mjs --api <URL>/api`, com painel em `http://localhost:4010`. Mesmas classes e mesma política de envio do firmware.

Os dois enviam exatamente o `POST /api/sensor-alert` acima. O simulador do PC lê `GET /api/sensor/{sensorId}/status` para começar no nível que a API já tem e, quando `lastCollectionAt` muda, esvazia o barril simulado. O roteiro `backend/scripts/smoke-flow.mjs` continua sendo só um teste de ponta a ponta.
