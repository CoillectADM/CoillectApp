# Sensor do barril: ESP32 físico e virtual

O mesmo sensor roda de três formas. Todas enviam **a mesma requisição** para a API (`POST /api/sensor-alert`, ver [contrato do sensor](../docs/contrato-sensor.md)), então a API não sabe nem precisa saber se o sinal veio do ESP32 de verdade ou da simulação.

| Forma | Pasta | Para quê | Precisa de |
|---|---|---|---|
| **ESP32 virtual no Wokwi** | `coillect_sensor/` | Demonstrar com o firmware real rodando num ESP32 simulado com HC-SR04 | Navegador e a API com URL pública |
| **ESP32 físico** | `coillect_sensor/` (mesmo arquivo) | Quando tiver a placa | Arduino IDE, ESP32, HC-SR04 |
| **Sensor virtual no PC** | `simulador-pc/` | Plano B sem Wokwi ou sem internet; vários barris de uma vez | Node 18 ou mais novo |

```
HC-SR04 ── UltrasonicSensor.medirDistanciaCm()
             └─ FillLevelCalculator.calcularPercentual() / atingiuLimite()
                  └─ SensorController.monitorarBarril() monta o AlertPayload
                       └─ RouterClient.enviarAlerta() ── Wi-Fi / roteador ──► API: POST /api/sensor-alert
                                                                               └─ listener: barril atingiu o limite?
                                                                                    ├─ empresa: solicitação de coleta + aviso
                                                                                    └─ síndico: só a notificação
```

## 1. ESP32 virtual no Wokwi

**Antes:** o Wokwi gratuito acessa a internet, mas não o `localhost` do seu PC. A API precisa de uma URL pública:

- **API na cloud (Render):** `https://SEU-SERVICO.onrender.com/api/sensor-alert` (ver [deploy-cloud.md](../docs/deploy-cloud.md)). O plano gratuito "dorme": abra `https://SEU-SERVICO.onrender.com/api/health` um minuto antes e espere responder.
- **API no seu PC + túnel gratuito:** suba a API (`docker compose up -d --build db backend`) e, em outro terminal, rode `cloudflared tunnel --url http://localhost:3000` ([Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/), sem conta). Use `https://<endereço-gerado>.trycloudflare.com/api/sensor-alert`. O endereço muda a cada vez que o túnel é aberto.

**Passo a passo:**

1. Abra <https://wokwi.com/projects/new/esp32>. Crie a conta gratuita se quiser salvar e ter um link para a apresentação.
2. Na aba `sketch.ino`, apague tudo e cole o conteúdo de [`coillect_sensor/coillect_sensor.ino`](coillect_sensor/coillect_sensor.ino).
3. Na aba `diagram.json`, apague tudo e cole o conteúdo de [`coillect_sensor/diagram.json`](coillect_sensor/diagram.json) (ESP32, HC-SR04, dois LEDs e um botão).
4. No começo do sketch, troque `COILLECT_API_URL` pela URL da sua API. Se quiser outro barril, troque `COILLECT_SENSOR_ID`.
5. Clique em ▶. O monitor serial mostra a conexão Wi-Fi, cada leitura e a resposta da API.
6. Clique no HC-SR04 e arraste a distância: é a distância da tampa até o óleo.

Barril de 90 cm, limite de 80%:

| Distância no HC-SR04 | Nível | O que acontece |
|---|---|---|
| 81 cm (início) | 10% | Envio periódico (a cada 15 s) |
| 45 cm | 50% | Envia na hora (mudou 5 pontos ou mais) |
| 18 cm | 80% | **Alerta:** envia na hora e a API cria a solicitação de coleta |
| 12 cm | 87% | Alerta |
| 2 cm (mínimo do sensor) | 98% | Nível máximo que o HC-SR04 consegue ler |
| 90 cm ou mais | 0% | Barril vazio (depois da coleta) |

No circuito: **LED vermelho** (GPIO 26) acende no limite; **LED verde** (GPIO 27) acende quando a API aceitou o último envio; o **botão azul** (GPIO 4, ou a tecla **E**) envia a leitura na hora.

Exemplo do que o firmware escreve no monitor serial:

```
[WIFI] Conectando a "Wokwi-GUEST".. conectado (IP 10.10.0.2)
[SENSOR] Distância 81.0 cm -> nível 10% (limite 80%)
[ENVIO] Motivo: primeira leitura
[ENVIO] POST https://SEU-SERVICO.onrender.com/api/sensor-alert {"sensorId":"CLT-8472-A","percentual":10,"dataHora":"2026-11-10T14:30:02-03:00"}
[API] HTTP 201 em 812 ms - Leitura registrada.
[API] Decisão: abaixo do limite: só registrou a leitura (BELOW_THRESHOLD)
[SENSOR] Distância 12.6 cm -> nível 86% (limite 80%)  ** ALERTA **
[ENVIO] Motivo: alerta - atingiu o limite
[API] HTTP 201 em 905 ms - Leitura registrada. Solicitação de coleta #12 criada.
[API] Decisão: limite atingido: solicitação de coleta criada para a empresa (THRESHOLD_REACHED)
[API] Solicitação de coleta #12 aberta para o barril: PENDING
```

### Roteiro da demonstração (parte do sensor)

1. Reinicie os dados de demonstração (desktop administrativo, ou `POST /api/admin/demo/reset`).
2. Rode o Wokwi: o Residencial Aurora (barril `BRL-8472`) aparece com 10% nos apps.
3. Arraste o HC-SR04 para 45 cm: os apps mostram 50%.
4. Arraste para 12 cm (87%): o LED vermelho acende. A **empresa** recebe a solicitação de coleta do barril e o aviso; o **síndico** recebe só a notificação.
5. No app da empresa, **Agendar coleta**: o síndico é avisado.
6. O coletor esvazia o barril: arraste o HC-SR04 para 90 cm (0%).
7. No app da empresa, **Concluir coleta**: o barril fica em 0% e o síndico é avisado.

Se a coleta for concluída **antes** de esvaziar o barril simulado, a API não abre outra solicitação enquanto o sensor não ler o barril abaixo do limite. O monitor mostra `coleta recém-concluída: aguardando o sensor ler o barril vazio (AWAITING_EMPTY_READING)`.

## 2. ESP32 físico

Material: ESP32 DevKit (ESP32-WROOM-32), HC-SR04, resistores de 1 kΩ e 2 kΩ. Opcionais: 2 LEDs com resistores de 220 Ω e 1 botão.

| HC-SR04 | ESP32 |
|---|---|
| VCC | 5V (VIN) |
| GND | GND |
| TRIG | GPIO 5 |
| ECHO | GPIO 18 **por um divisor de tensão** (ECHO → 1 kΩ → GPIO 18 → 2 kΩ → GND), porque o ECHO sai com 5 V e o ESP32 aceita 3,3 V. Com o modelo HC-SR04P, alimente em 3V3 e ligue direto. |

LEDs opcionais: GPIO 26 → 220 Ω → LED vermelho → GND; GPIO 27 → 220 Ω → LED verde → GND. Botão opcional: GPIO 4 ↔ GND.

1. Arduino IDE 2 → Preferências → *URLs adicionais para Gerenciadores de Placas*: `https://espressif.github.io/arduino-esp32/package_esp32_index.json`.
2. Gerenciador de Placas → instale **esp32 by Espressif Systems** → placa **ESP32 Dev Module**.
3. Abra `coillect_sensor/coillect_sensor.ino` e ajuste no começo do arquivo:
   - `WIFI_SSID` e `WIFI_SENHA` da rede (2,4 GHz);
   - `COILLECT_API_URL`: a URL da cloud, ou `http://IP-DO-PC:3000/api/sensor-alert` se a API roda num PC da mesma rede;
   - `ALTURA_BARRIL_CM`: meça do sensor até o fundo do barril vazio;
   - `INTERVALO_ENVIO_MS`: no barril real, `300000UL` (5 min) basta.
4. Carregue na placa e abra o Monitor Serial em 115200.
5. Fixe o sensor na tampa, apontado para baixo, pelo menos 2 cm acima do nível máximo do óleo.

## 3. Sensor virtual no PC (plano B)

Mesmas classes e mesma política de envio do firmware, em JavaScript, sem instalar nada além do Node:

```bash
node sensor-esp32/simulador-pc/sensor-virtual.mjs --api http://localhost:3000/api
```

Abra <http://localhost:4010>: o painel mostra o barril, um controle para encher e esvaziar, os botões **Enviar leitura agora**, **Simular alerta**, **Esvaziar barril (coleta feita)** e **Encher sozinho**, o que a API sabe do barril (solicitação aberta, última coleta) e o histórico de envios.

- O simulador começa no nível que a API já tem (ex.: 62% no Condomínio Bosque).
- Quando a empresa conclui a coleta no app, o simulador esvazia o barril sozinho.

| Opção | Padrão | Uso |
|---|---|---|
| `--api URL` | `http://localhost:3000/api` | Base da API (aceita também a URL da cloud) |
| `--sensores A,B,C` | `CLT-8472-A` | Um ou mais sensores cadastrados, ex.: `CLT-8472-A,CLT-1264-B,CLT-9801-C` |
| `--porta 4010` | `4010` | Porta do painel |
| `--intervalo 15` | `15` | Envio periódico, em segundos |
| `--altura 90` / `--limite 80` | `90` / `80` | Barril em cm e limite de alerta em % |
| `--encher-sozinho` | desligado | Enche 5% a cada 3 s |
| `--sem-painel` | desligado | Só terminal |
| `--uma-vez --percentual 85` | — | Envia uma leitura por sensor e sai |

## Quando o sensor envia

Igual no firmware e no simulador:

- mede a cada 1 s (no ESP32, mediana de 5 ecos);
- **na hora** ao atingir o limite (80%), só na subida; um novo alerta só vale depois de o nível baixar até 70%;
- **na hora** pelo botão;
- quando o nível muda 5 pontos ou mais (no máximo um envio a cada 3 s);
- a cada 15 s mesmo sem mudança (no barril real, 5 min);
- se a API não responder, guarda o alerta e tenta de novo a cada 5 s; espera até 60 s por resposta (a cloud gratuita pode estar "acordando").

Quem decide se cria a solicitação é sempre a API.

## Classes do diagrama

| Classe (Diagrama 1) | Firmware `coillect_sensor.ino` | Simulador `sensor-virtual.mjs` |
|---|---|---|
| `SensorConfig` (`sensorId`, `apiUrl`, `roteadorId`, `alturaBarrilCm`, `limiteAlerta`) | `struct SensorConfig` (+ senha do Wi-Fi) | `class SensorConfig` |
| `UltrasonicSensor.medirDistanciaCm()` | HC-SR04 nos pinos 5 (TRIG) e 18 (ECHO) | Distância calculada do `BarrilSimulado` |
| `FillLevelCalculator.calcularPercentual()` / `atingiuLimite()` | Igual | Igual |
| `AlertPayload` (`sensorId`, `percentual`, `dataHora`) | JSON com `dataHora` do NTP (`-03:00`) | JSON com `dataHora` do relógio do PC |
| `RouterClient.enviarAlerta()` | Wi-Fi + `HTTPClient` (HTTPS com `setInsecure`) | `fetch` |
| `SensorController.monitorarBarril()` | Chamado no `loop()` | Chamado a cada 200 ms |

## Como é testado

O GitHub Actions ([`sensor-esp32.yml`](../.github/workflows/sensor-esp32.yml)) roda a cada mudança no sensor:

1. **Firmware no PC:** o mesmo `.ino` compilado com g++, com o hardware simulado (`testes/mocks/`): primeira leitura, envio periódico, alerta imediato, histerese, variação, sensor sem eco, API fora do ar, Wi-Fi caindo, botão, HTTPS, URL não configurada, coleta concluída e o roteiro da apresentação.
2. **Firmware compila para o ESP32**, com o core oficial da Espressif.
3. **Requisições do firmware na API real** (Docker + PostgreSQL): as requisições que o firmware gerou no passo 1 são reenviadas para a API; o teste confere a solicitação da empresa, o aviso, a notificação do síndico e o ciclo depois da coleta.
4. **Sensor virtual do PC na API real:** linha de comando e painel, do alerta à coleta concluída.

Para rodar na sua máquina:

```bash
g++ -std=c++17 -Wall -Wextra -I sensor-esp32/testes/mocks -o /tmp/firmware-testes sensor-esp32/testes/firmware_testes.cpp
/tmp/firmware-testes --eco
node --test sensor-esp32/simulador-pc/sensor-virtual.test.mjs
```

## Limitações conhecidas

- O gateway gratuito do Wokwi só alcança a internet e tem o tráfego monitorado. Acessar o `localhost` direto exige o gateway privado, que é pago.
- A simulação no Wokwi pode rodar mais devagar que o tempo real; os intervalos de envio acompanham o relógio simulado.
- O HC-SR04 não mede menos de 2 cm: num barril de 90 cm, o maior nível lido é 98%.
- HTTPS sem validação de certificado (`setInsecure`), aceitável para o MVP.
