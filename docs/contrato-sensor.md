# Contrato do sensor (físico e virtual)

Este é o **único** formato que a API aceita para leituras de nível. O sensor físico (ESP32 via Wi-Fi/roteador) e o sensor virtual devem enviar exatamente a mesma requisição; depois que ela chega à API, o fluxo é idêntico.

## Requisição

```
POST <URL_DA_API>/api/sensor/readings
Content-Type: application/json

{ "sensorId": "COI-DEMO-01", "level": 85 }
```

| Campo | Tipo | Regra |
|---|---|---|
| `sensorId` | texto | Precisa estar cadastrado na API (`POST /api/admin/sensors`). Letras, números, `.`, `-`, `_`; até 60 caracteres. |
| `level` | número | Nível do barril em **percentual**, de 0 a 100. Decimais são arredondados. Texto numérico (`"85"`) também é aceito. |

- Nenhum outro campo é aceito (a API responde 400).
- O sensor **não faz login** e não envia token: basta a URL da API e o próprio `sensorId`.
- Frequência sugerida: uma leitura a cada 30–60 s, ou sempre que o nível mudar. Enviar só quando cruzar o limite também funciona, porque a regra é a mesma.

## Respostas

| HTTP | Quando | O que o dispositivo faz |
|---|---|---|
| **201** | Leitura registrada | Nada; segue enviando |
| 400 | Payload fora do contrato (ex.: `level: 150`) | Corrigir o firmware/simulador |
| 404 | `sensorId` não cadastrado | Cadastrar o sensor no admin |
| 5xx / sem resposta | API fora do ar ou "acordando" | Tentar de novo na próxima leitura |

Corpo da resposta 201 (resumido):

```json
{
  "error": false,
  "statusCode": 201,
  "message": "Leitura registrada. Solicitação de coleta #12 criada.",
  "requester": "sensor:COI-DEMO-01",
  "data": {
    "reading": { "id": 345, "sensorId": "COI-DEMO-01", "level": 85, "receivedAt": "2026-11-10T03:00:00.000Z" },
    "sensor": { "sensorId": "COI-DEMO-01", "condominiumName": "Condomínio Demonstração", "level": 85, "threshold": 80, "needsCollection": true, "lastCollectionAt": null, "openRequest": { "id": 12, "status": "PENDING" } },
    "collection": {
      "triggered": true,
      "reason": "THRESHOLD_REACHED",
      "request": { "id": 12, "status": "PENDING", "origin": "SENSOR", "levelAtRequest": 85 }
    }
  }
}
```

## Regra de disparo (listener)

A cada leitura recebida, a API grava o histórico, atualiza o nível do barril e publica o evento `sensor.reading.received`. O **listener** (`backend/src/collection-request/sensor-trigger.listener.ts`) avalia:

| Condição | `collection.reason` | Resultado |
|---|---|---|
| `level` < limite do sensor | `BELOW_THRESHOLD` | Só registra a leitura |
| Já existe solicitação `PENDING` ou `SCHEDULED` para o sensor | `REQUEST_ALREADY_OPEN` | Não duplica; devolve a solicitação aberta |
| Condomínio sem empresa coletora vinculada | `NO_COMPANY_LINKED` | Não cria; avisa no log |
| `level` ≥ limite e nenhuma aberta | `THRESHOLD_REACHED` | Cria **uma** solicitação `PENDING` |

- O limite é configurado **por sensor** (`threshold`, padrão 80%). Altere com `PATCH /api/admin/sensors/{sensorId}`.
- A solicitação criada vai para a **empresa** do condomínio (app-mobile-empresa).
- O **síndico** do condomínio recebe uma cópia/notificação vinculada à **mesma** solicitação (app-mobile-sindico). Não existe segunda coleta.
- Quando a empresa conclui a coleta, o barril volta a 0% e o próximo ciclo pode começar.

## Exemplos

curl (Linux/macOS/Git Bash):

```bash
curl -X POST http://localhost:3000/api/sensor/readings \
  -H "Content-Type: application/json" \
  -d '{"sensorId":"COI-DEMO-01","level":85}'
```

PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/sensor/readings `
  -ContentType 'application/json' -Body '{"sensorId":"COI-DEMO-01","level":85}'
```

ESP32 (Arduino), trecho de envio:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

const char* API_URL   = "https://SEU-SERVICO.onrender.com/api/sensor/readings";
const char* SENSOR_ID = "COI-DEMO-01";

int sendLevel(int level) {
  WiFiClientSecure client;
  client.setInsecure();          // MVP: sem validação de certificado
  HTTPClient http;
  http.setTimeout(70000);        // a cloud gratuita pode levar ~1 min para "acordar"
  http.begin(client, API_URL);   // para API na rede local (http://), use WiFiClient
  http.addHeader("Content-Type", "application/json");
  String body = String("{\"sensorId\":\"") + SENSOR_ID + "\",\"level\":" + level + "}";
  int status = http.POST(body);  // 201 = leitura registrada
  http.end();
  return status;
}
```

Se o sensor medir distância (ex.: ultrassônico), converta no firmware:
`level = (distVazio - distAtual) / (distVazio - distCheio) * 100`, limitado entre 0 e 100.

## Para o sensor virtual

- Deve enviar exatamente o `POST /api/sensor/readings` acima.
- Pode consultar `GET /api/sensor/{sensorId}/status` para saber o nível atual e `lastCollectionAt`; quando `lastCollectionAt` mudar, a coleta foi concluída e a simulação pode recomeçar do barril vazio.
- O roteiro `backend/scripts/smoke-flow.mjs` já percorre o ciclo completo com esse contrato, mas é um teste, não o simulador.
