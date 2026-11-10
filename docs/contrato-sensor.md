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
- Quando `FillLevelCalculator.atingiuLimite(percentual, limiteAlerta)` passa a ser verdadeiro, o sensor envia **na hora**, sem esperar o intervalo.
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
| Condomínio do barril sem empresa coletora | `NO_COMPANY_LINKED` | Não cria; avisa no log |
| Atingiu o limite e nenhuma aberta | `THRESHOLD_REACHED` | Cria **uma** solicitação `PENDING` do barril |

- O limite fica no **barril** (`alertThreshold`, padrão 80%). Altere com `PATCH /api/admin/barrels/{id}`.
- A solicitação vai para a **empresa** do condomínio (app-mobile-empresa), com o barril e o sensor, e a empresa recebe o aviso "Residencial Aurora chegou a 86% de capacidade.".
- O **síndico** recebe só uma cópia/notificação da **mesma** solicitação (app-mobile-sindico). Ele não pode cancelar nem concluir coletas geradas pelo sensor ou pela empresa (HTTP 403).
- Quando a empresa conclui a coleta, o barril volta a 0%, `lastCollectionAt` é preenchido e o próximo ciclo pode começar.

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

ESP32 (Arduino), com os nomes do diagrama do sensor:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

struct SensorConfig {
  const char* sensorId    = "CLT-8472-A";
  const char* apiUrl      = "https://SEU-SERVICO.onrender.com/api/sensor-alert";
  const char* roteadorId  = "Wokwi-GUEST";   // SSID do roteador
  float alturaBarrilCm    = 90.0;            // distância do sensor (tampa) até o fundo
  int   limiteAlerta      = 80;
} config;

// FillLevelCalculator
int calcularPercentual(float distanciaCm, float alturaBarrilCm) {
  float p = (alturaBarrilCm - distanciaCm) / alturaBarrilCm * 100.0;
  return constrain((int) round(p), 0, 100);
}
bool atingiuLimite(int percentual, int limite) { return percentual >= limite; }

// RouterClient
bool enviarAlerta(int percentual, const String& dataHora) {
  WiFiClientSecure client;
  client.setInsecure();          // MVP: sem validação de certificado
  HTTPClient http;
  http.setTimeout(70000);        // a cloud gratuita pode levar ~1 min para "acordar"
  http.begin(client, config.apiUrl);  // para API na rede local (http://), use WiFiClient
  http.addHeader("Content-Type", "application/json");
  String body = String("{\"sensorId\":\"") + config.sensorId +
                "\",\"percentual\":" + percentual +
                (dataHora.length() ? ",\"dataHora\":\"" + dataHora + "\"" : "") + "}";
  int status = http.POST(body);  // 201 = leitura registrada
  http.end();
  return status == 201;
}
```

## Para o sensor virtual

- Envia exatamente o `POST /api/sensor-alert` acima, com as mesmas classes do diagrama (`UltrasonicSensor` simulado, `FillLevelCalculator`, `SensorConfig`, `RouterClient`, `AlertPayload`, `SensorController.monitorarBarril()`).
- Para saber se a coleta foi concluída, compare `data.sensor.lastCollectionAt` da resposta (ou de `GET /api/sensor/{sensorId}/status`): quando mudar, o barril foi esvaziado e a simulação recomeça do zero.
- O roteiro `backend/scripts/smoke-flow.mjs` percorre o ciclo completo com esse contrato, mas é um teste, não o simulador.
