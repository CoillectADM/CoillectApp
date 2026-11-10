/*
 * Coillect - sensor de nível do barril de óleo (ESP32 + HC-SR04)
 * ----------------------------------------------------------------------------
 * O MESMO código roda:
 *   - no Wokwi (ESP32 virtual em wokwi.com): copie este arquivo para o sketch.ino
 *     e o diagram.json desta pasta. Clique no HC-SR04 e arraste a distância para
 *     "encher" ou "esvaziar" o barril;
 *   - no ESP32 físico (Arduino IDE, placa "ESP32 Dev Module").
 * Passo a passo em sensor-esp32/README.md.
 *
 * Classes do diagrama de classes do sensor (Diagrama 1):
 *   SensorConfig, UltrasonicSensor, FillLevelCalculator, AlertPayload,
 *   RouterClient (enviarAlerta) e SensorController (monitorarBarril).
 *
 * Contrato com a API (docs/contrato-sensor.md):
 *   POST <url-da-api>/api/sensor-alert
 *   {"sensorId":"CLT-8472-A","percentual":86,"dataHora":"2026-11-10T14:32:05-03:00"}
 *
 * Quando envia (decisão do projeto: periódico + alerta imediato):
 *   - mede a cada 1 s;
 *   - envia NA HORA quando o nível atinge o limite (80%);
 *   - envia a cada INTERVALO_ENVIO_MS, mesmo sem mudança;
 *   - envia quando o nível muda VARIACAO_ENVIO pontos (os apps ficam em dia);
 *   - o botão (GPIO 4) envia na hora.
 * Quem decide se cria a solicitação de coleta é sempre a API.
 */
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <time.h>

// ============================ CONFIGURAÇÃO ==================================
// Edite estes valores. Cada um pode também ser definido na compilação (-D).

// URL COMPLETA da rota do sensor na API. Exemplos:
//   API na cloud (Render):      "https://SEU-SERVICO.onrender.com/api/sensor-alert"
//   API no PC + túnel gratuito: "https://xxxx.trycloudflare.com/api/sensor-alert"
//   ESP32 físico na mesma rede: "http://192.168.0.10:3000/api/sensor-alert"
#ifndef COILLECT_API_URL
#define COILLECT_API_URL "https://SEU-SERVICO.onrender.com/api/sensor-alert"
#endif

// sensorId cadastrado na API (admin > Sensores).
// CLT-8472-A = barril BRL-8472 do Residencial Aurora (dados de demonstração).
#ifndef COILLECT_SENSOR_ID
#define COILLECT_SENSOR_ID "CLT-8472-A"
#endif

// Rede Wi-Fi (roteadorId do diagrama). No Wokwi é sempre "Wokwi-GUEST", sem senha.
#ifndef WIFI_SSID
#define WIFI_SSID "Wokwi-GUEST"
#endif
#ifndef WIFI_SENHA
#define WIFI_SENHA ""
#endif

// Distância do sensor (preso na tampa) até o fundo do barril vazio, em cm.
#ifndef ALTURA_BARRIL_CM
#define ALTURA_BARRIL_CM 90.0f
#endif

// Percentual que dispara o envio imediato. Use o mesmo limite do barril na API.
#ifndef LIMITE_ALERTA
#define LIMITE_ALERTA 80
#endif

// Envio periódico, em ms. 15 s para a apresentação; num barril real, 5 min basta.
#ifndef INTERVALO_ENVIO_MS
#define INTERVALO_ENVIO_MS 15000UL
#endif

// Envia antes do periodo quando o nível muda pelo menos estes pontos (0 desliga).
#ifndef VARIACAO_ENVIO
#define VARIACAO_ENVIO 5
#endif

// Fuso horário do dataHora (POSIX). "<-03>3" = horário de Brasília (UTC-3).
#ifndef FUSO_HORARIO
#define FUSO_HORARIO "<-03>3"
#endif

// Pinos (iguais no Wokwi e no ESP32 físico).
#define PINO_TRIGGER 5      // HC-SR04 TRIG
#define PINO_ECHO 18        // HC-SR04 ECHO (no físico, use divisor de tensão 5 V -> 3,3 V)
#define PINO_LED_ALERTA 26  // LED vermelho: nível no limite (opcional)
#define PINO_LED_ONLINE 27  // LED verde: último envio aceito pela API (opcional)
#define PINO_BOTAO 4        // botão para o GND: envia a leitura na hora (opcional)

// Ritmo interno.
static const unsigned long INTERVALO_MEDICAO_MS = 1000UL;
static const unsigned long ESPERA_ENTRE_ENVIOS_MS = 3000UL;  // mínimo entre envios por variação
static const unsigned long ESPERA_APOS_FALHA_MS = 5000UL;    // nova tentativa depois de erro
static const unsigned long RECONEXAO_WIFI_MS = 10000UL;
static const int HISTERESE_ALERTA = 10;  // novo alerta só depois de cair 10 pontos abaixo do limite
static const unsigned long HTTP_CONECTAR_MS = 15000UL;
static const uint16_t HTTP_RESPOSTA_MS = 60000;  // a cloud gratuita pode levar ~1 min para "acordar"

// ============================ SensorConfig =================================
// Configuração do dispositivo (diagrama: sensorId, apiUrl, roteadorId,
// alturaBarrilCm, limiteAlerta). roteadorSenha é a senha do Wi-Fi.
struct SensorConfig {
  const char* sensorId;
  const char* apiUrl;
  const char* roteadorId;
  const char* roteadorSenha;
  float alturaBarrilCm;
  int limiteAlerta;
};

// ========================== UltrasonicSensor ===============================
// HC-SR04: mede a distância da tampa até a superfície do óleo.
class UltrasonicSensor {
 public:
  UltrasonicSensor(int trigger, int echo) : pinoTrigger(trigger), pinoEcho(echo) {}

  void iniciar() {
    pinMode(pinoTrigger, OUTPUT);
    pinMode(pinoEcho, INPUT);
    digitalWrite(pinoTrigger, LOW);
  }

  // Mediana de 5 pulsos (o óleo balança). Devolve -1 quando não há eco.
  float medirDistanciaCm() {
    float amostras[AMOSTRAS];
    int n = 0;
    for (int i = 0; i < AMOSTRAS; i++) {
      digitalWrite(pinoTrigger, LOW);
      delayMicroseconds(2);
      digitalWrite(pinoTrigger, HIGH);
      delayMicroseconds(10);
      digitalWrite(pinoTrigger, LOW);
      unsigned long duracaoUs = pulseIn(pinoEcho, HIGH, 30000UL);  // até ~5 m
      if (duracaoUs > 0) amostras[n++] = duracaoUs / 58.0f;      // us -> cm
      delay(PAUSA_ENTRE_PULSOS_MS);
    }
    if (n == 0) return -1.0f;
    for (int i = 1; i < n; i++) {  // ordena as amostras (inserção)
      float valor = amostras[i];
      int j = i - 1;
      while (j >= 0 && amostras[j] > valor) {
        amostras[j + 1] = amostras[j];
        j--;
      }
      amostras[j + 1] = valor;
    }
    return amostras[n / 2];
  }

 private:
  static const int AMOSTRAS = 5;
  static const int PAUSA_ENTRE_PULSOS_MS = 40;
  int pinoTrigger;
  int pinoEcho;
};

// ========================= FillLevelCalculator =============================
class FillLevelCalculator {
 public:
  // Distância (cm) da tampa até o óleo -> percentual cheio, de 0 a 100.
  int calcularPercentual(float distanciaCm, float alturaBarrilCm) const {
    if (alturaBarrilCm <= 0.0f || distanciaCm < 0.0f) return 0;
    float percentual = (alturaBarrilCm - distanciaCm) * 100.0f / alturaBarrilCm;
    if (percentual < 0.0f) percentual = 0.0f;
    if (percentual > 100.0f) percentual = 100.0f;
    return (int)(percentual + 0.5f);
  }

  bool atingiuLimite(int percentual, int limite) const { return percentual >= limite; }
};

// ============================ AlertPayload =================================
// Dados enviados para a API (mesmo formato do SensorAlertPayload da API).
struct AlertPayload {
  const char* sensorId;
  int percentual;
  char dataHora[32];  // vazio enquanto o relógio (NTP) não sincronizou

  int paraJson(char* destino, size_t tamanho) const {
    if (dataHora[0] != '\0') {
      return snprintf(destino, tamanho, "{\"sensorId\":\"%s\",\"percentual\":%d,\"dataHora\":\"%s\"}",
                      sensorId, percentual, dataHora);
    }
    return snprintf(destino, tamanho, "{\"sensorId\":\"%s\",\"percentual\":%d}", sensorId, percentual);
  }
};

// ============================ RouterClient =================================
// Wi-Fi (roteador) + envio do AlertPayload para a API.
class RouterClient {
 public:
  explicit RouterClient(const SensorConfig& cfg) : config(cfg) {}

  void conectarWiFi(unsigned long esperaMaximaMs) {
    Serial.printf("[WIFI] Conectando a \"%s\"", config.roteadorId);
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    iniciarWiFi();
    unsigned long inicio = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - inicio < esperaMaximaMs) {
      delay(250);
      Serial.print(".");
    }
    ultimaTentativaWiFiMs = millis();
    estavaConectado = conectado();
    if (estavaConectado) {
      Serial.printf(" conectado (IP %s)\n", WiFi.localIP().toString().c_str());
    } else {
      Serial.println(" sem conexão por enquanto; continuo tentando.");
    }
  }

  // Reconecta se a rede cair. Devolve true se está conectado.
  bool manterConexao(unsigned long agora) {
    bool ok = conectado();
    if (ok != estavaConectado) {
      estavaConectado = ok;
      if (ok) {
        Serial.printf("[WIFI] Reconectado (IP %s)\n", WiFi.localIP().toString().c_str());
      } else {
        Serial.println("[WIFI] Conexão perdida; as leituras continuam e serão enviadas ao reconectar.");
      }
    }
    if (!ok && agora - ultimaTentativaWiFiMs >= RECONEXAO_WIFI_MS) {
      ultimaTentativaWiFiMs = agora;
      WiFi.disconnect();
      iniciarWiFi();
    }
    return ok;
  }

  bool conectado() { return WiFi.status() == WL_CONNECTED; }

  // Envia o payload. true = API respondeu 2xx (leitura registrada).
  bool enviarAlerta(const AlertPayload& payload) {
    char corpo[192];
    int tamanho = payload.paraJson(corpo, sizeof(corpo));
    if (tamanho <= 0 || tamanho >= (int)sizeof(corpo)) {
      Serial.println("[ENVIO] Payload grande demais; confira o COILLECT_SENSOR_ID.");
      return false;
    }
    if (strstr(config.apiUrl, "SEU-SERVICO") != NULL) {
      Serial.println("[ENVIO] Configure COILLECT_API_URL com a URL da sua API (veja o README).");
      return false;
    }
    Serial.printf("[ENVIO] POST %s %s\n", config.apiUrl, corpo);

    HTTPClient http;
    WiFiClient clienteHttp;
    WiFiClientSecure clienteHttps;
    bool iniciou;
    if (strncmp(config.apiUrl, "https://", 8) == 0) {
      clienteHttps.setInsecure();  // MVP: sem validar o certificado do servidor
      iniciou = http.begin(clienteHttps, config.apiUrl);
    } else {
      iniciou = http.begin(clienteHttp, config.apiUrl);
    }
    if (!iniciou) {
      Serial.printf("[ENVIO] URL inválida: %s\n", config.apiUrl);
      return false;
    }
    http.setConnectTimeout(HTTP_CONECTAR_MS);
    http.setTimeout(HTTP_RESPOSTA_MS);
    http.addHeader("Content-Type", "application/json");

    unsigned long inicio = millis();
    int status = http.POST((uint8_t*)corpo, (size_t)tamanho);
    unsigned long duracao = millis() - inicio;
    String resposta;
    if (status > 0) resposta = http.getString();
    http.end();

    registrarResposta(status, resposta, duracao);
    return status >= 200 && status < 300;
  }

 private:
  const SensorConfig& config;
  unsigned long ultimaTentativaWiFiMs = 0;
  bool estavaConectado = false;
  bool primeiraResposta = true;
  String ultimaColeta;

  void iniciarWiFi() {
    // O ponto de acesso do Wokwi usa o canal 6: informar o canal pula a busca (~4 s).
    int canal = strcmp(config.roteadorId, "Wokwi-GUEST") == 0 ? 6 : 0;
    WiFi.begin(config.roteadorId, config.roteadorSenha, canal);
  }

  // Mostra no monitor serial o que a API decidiu sobre a leitura.
  void registrarResposta(int status, const String& corpo, unsigned long duracaoMs) {
    if (status <= 0) {
      Serial.printf("[API] Sem resposta (%s) após %lu ms. Nova tentativa em instantes.\n",
                    HTTPClient::errorToString(status).c_str(), duracaoMs);
      return;
    }
    String mensagem = extrairTexto(corpo, "\"message\":\"");
    String motivo = extrairTexto(corpo, "\"reason\":\"");
    Serial.printf("[API] HTTP %d em %lu ms", status, duracaoMs);
    if (mensagem.length() > 0) Serial.printf(" - %s", mensagem.c_str());
    Serial.println();
    if (motivo.length() > 0) Serial.printf("[API] Decisão: %s (%s)\n", descreverMotivo(motivo), motivo.c_str());

    int aberta = corpo.indexOf("\"openRequest\":{");
    if (aberta >= 0) {
      String estado = extrairTexto(corpo.substring(aberta), "\"status\":\"");
      long id = extrairNumero(corpo.substring(aberta), "\"id\":");
      Serial.printf("[API] Solicitação de coleta #%ld aberta para o barril: %s\n", id, estado.c_str());
    }
    if (status == 404) Serial.println("[API] sensorId não cadastrado: cadastre-o no admin ou ajuste COILLECT_SENSOR_ID.");
    if (status >= 400 && mensagem.length() == 0) Serial.printf("[API] Resposta: %s\n", corpo.substring(0, 200).c_str());

    String coleta = extrairTexto(corpo, "\"lastCollectionAt\":\"");
    if (coleta.length() > 0 && coleta != ultimaColeta) {
      if (!primeiraResposta) {
        Serial.printf("[API] Coleta concluída pela empresa em %s: o barril deve estar vazio agora.\n", coleta.c_str());
      }
      ultimaColeta = coleta;
    }
    primeiraResposta = false;
  }

  static const char* descreverMotivo(const String& motivo) {
    if (motivo == "THRESHOLD_REACHED") return "limite atingido: solicitação de coleta criada para a empresa";
    if (motivo == "BELOW_THRESHOLD") return "abaixo do limite: só registrou a leitura";
    if (motivo == "REQUEST_ALREADY_OPEN") return "já existe solicitação aberta para este barril";
    if (motivo == "AWAITING_EMPTY_READING") return "coleta recém-concluída: aguardando o sensor ler o barril vazio";
    if (motivo == "NO_COMPANY_LINKED") return "condomínio sem empresa coletora vinculada";
    if (motivo == "SENSOR_NOT_INSTALLED") return "sensor não está instalado em um barril";
    return "ver docs/contrato-sensor.md";
  }

  static String extrairTexto(const String& json, const char* chave) {
    int i = json.indexOf(chave);
    if (i < 0) return String("");
    unsigned int inicio = (unsigned int)i + (unsigned int)strlen(chave);
    int fim = json.indexOf('"', inicio);
    if (fim < 0) return String("");
    return json.substring(inicio, (unsigned int)fim);
  }

  static long extrairNumero(const String& json, const char* chave) {
    int i = json.indexOf(chave);
    if (i < 0) return -1;
    return json.substring((unsigned int)i + (unsigned int)strlen(chave)).toInt();
  }
};

// =========================== SensorController ==============================
class SensorController {
 public:
  explicit SensorController(const SensorConfig& cfg)
      : config(cfg), sensor(PINO_TRIGGER, PINO_ECHO), calculator(), router(cfg) {}

  void iniciar() {
    pinMode(PINO_LED_ALERTA, OUTPUT);
    pinMode(PINO_LED_ONLINE, OUTPUT);
    pinMode(PINO_BOTAO, INPUT_PULLUP);
    digitalWrite(PINO_LED_ALERTA, LOW);
    digitalWrite(PINO_LED_ONLINE, LOW);
    sensor.iniciar();

    Serial.println();
    Serial.println("==============================================================");
    Serial.println(" Coillect - sensor de nível do barril (ESP32 + HC-SR04)");
    Serial.printf(" sensorId: %s | barril: %.0f cm | limite: %d%%\n", config.sensorId,
                  (double)config.alturaBarrilCm, config.limiteAlerta);
    Serial.printf(" API: %s\n", config.apiUrl);
    Serial.printf(" Envio: a cada %lu s, na hora ao atingir %d%% e ao variar %d pontos\n",
                  (unsigned long)(INTERVALO_ENVIO_MS / 1000UL), config.limiteAlerta, VARIACAO_ENVIO);
    Serial.println("==============================================================");
    if (strstr(config.apiUrl, "SEU-SERVICO") != NULL) {
      Serial.println("[CONFIG] ATENÇÃO: troque COILLECT_API_URL pela URL da sua API antes de rodar.");
    }

    router.conectarWiFi(20000UL);
    configTzTime(FUSO_HORARIO, "pool.ntp.org", "time.google.com");  // relógio do dataHora
  }

  // Chamado continuamente pelo loop(): mede, decide e envia.
  void monitorarBarril() {
    unsigned long agora = millis();
    bool online = router.manterConexao(agora);
    if (!online) digitalWrite(PINO_LED_ONLINE, LOW);
    verificarBotao(agora);

    if (jaMediu && !envioManual && agora - ultimaMedicaoMs < INTERVALO_MEDICAO_MS) return;
    ultimaMedicaoMs = agora;
    jaMediu = true;

    float distanciaCm = sensor.medirDistanciaCm();
    if (distanciaCm < 0.0f) {
      if (!avisouSemEco || agora - avisoSemEcoMs >= 10000UL) {
        Serial.println("[SENSOR] Sem eco do HC-SR04: confira a ligação dos pinos TRIG/ECHO.");
        avisouSemEco = true;
        avisoSemEcoMs = agora;
      }
      return;
    }
    avisouSemEco = false;

    int percentual = calculator.calcularPercentual(distanciaCm, config.alturaBarrilCm);
    bool noLimite = calculator.atingiuLimite(percentual, config.limiteAlerta);
    digitalWrite(PINO_LED_ALERTA, noLimite ? HIGH : LOW);
    if (percentual != ultimoPercentualMedido) {
      Serial.printf("[SENSOR] Distância %.1f cm -> nível %d%% (limite %d%%)%s\n", (double)distanciaCm,
                    percentual, config.limiteAlerta, noLimite ? "  ** ALERTA **" : "");
      ultimoPercentualMedido = percentual;
    }

    // Alerta só na subida; rearma depois de cair HISTERESE_ALERTA pontos abaixo do limite.
    if (noLimite && alertaArmado) {
      alertaArmado = false;
      alertaPendente = true;
      alertaNovo = true;
    } else if (!noLimite && percentual <= config.limiteAlerta - HISTERESE_ALERTA) {
      alertaArmado = true;
    }

    const char* motivo = escolherMotivo(percentual, agora);
    if (motivo == NULL) return;
    if (!online) {
      if (!avisouOffline) {
        Serial.printf("[ENVIO] Sem Wi-Fi: leitura (%s) será enviada ao reconectar.\n", motivo);
        avisouOffline = true;
      }
      return;
    }
    avisouOffline = false;

    AlertPayload payload;
    payload.sensorId = config.sensorId;
    payload.percentual = percentual;
    preencherDataHora(payload.dataHora, sizeof(payload.dataHora));

    Serial.printf("[ENVIO] Motivo: %s\n", motivo);
    bool ok = router.enviarAlerta(payload);
    unsigned long depois = millis();
    jaTentou = true;
    alertaNovo = false;
    envioManual = false;
    if (ok) {
      jaEnviou = true;
      ultimoEnvioOkMs = agora;  // o período conta a partir do início desta medição
      ultimoPercentualEnviado = percentual;
      alertaPendente = false;
      proximoEnvioPermitidoMs = depois + ESPERA_ENTRE_ENVIOS_MS;
    } else {
      proximoEnvioPermitidoMs = depois + ESPERA_APOS_FALHA_MS;
    }
    digitalWrite(PINO_LED_ONLINE, ok ? HIGH : LOW);
  }

 private:
  const SensorConfig& config;
  UltrasonicSensor sensor;
  FillLevelCalculator calculator;
  RouterClient router;

  bool jaMediu = false;
  bool jaTentou = false;
  bool jaEnviou = false;
  unsigned long ultimaMedicaoMs = 0;
  unsigned long ultimoEnvioOkMs = 0;
  unsigned long proximoEnvioPermitidoMs = 0;
  int ultimoPercentualMedido = -1;
  int ultimoPercentualEnviado = -1;
  bool alertaArmado = true;
  bool alertaPendente = false;
  bool alertaNovo = false;
  bool envioManual = false;
  bool avisouSemEco = false;
  unsigned long avisoSemEcoMs = 0;
  bool avisouOffline = false;
  bool botaoLeitura = false;
  bool botaoEstavel = false;
  unsigned long botaoMudouMs = 0;

  // Prioridade: alerta novo > botão > (respeitando a espera) alerta pendente >
  // primeira leitura > periódico > variação de nível.
  const char* escolherMotivo(int percentual, unsigned long agora) {
    if (alertaNovo) return "alerta - atingiu o limite";
    if (envioManual) return "botão (envio manual)";
    if (jaTentou && (long)(agora - proximoEnvioPermitidoMs) < 0) return NULL;
    if (alertaPendente) return "alerta - nova tentativa";
    if (!jaEnviou) return "primeira leitura";
    if (agora - ultimoEnvioOkMs >= INTERVALO_ENVIO_MS) return "periódico";
    if (VARIACAO_ENVIO > 0 && abs(percentual - ultimoPercentualEnviado) >= VARIACAO_ENVIO) {
      return "variação de nível";
    }
    return NULL;
  }

  void verificarBotao(unsigned long agora) {
    bool pressionado = digitalRead(PINO_BOTAO) == LOW;
    if (pressionado != botaoLeitura) {
      botaoLeitura = pressionado;
      botaoMudouMs = agora;
      return;
    }
    if (pressionado != botaoEstavel && agora - botaoMudouMs >= 30UL) {
      botaoEstavel = pressionado;
      if (pressionado) {
        envioManual = true;
        Serial.println("[BOTÃO] Envio manual solicitado.");
      }
    }
  }

  // dataHora no formato ISO 8601 com fuso, ex.: 2026-11-10T14:32:05-03:00.
  static void preencherDataHora(char* destino, size_t tamanho) {
    destino[0] = '\0';
    time_t agora = time(NULL);
    if (agora < 1700000000) return;  // relógio ainda não sincronizou (NTP)
    struct tm local;
    localtime_r(&agora, &local);
    char base[24];
    char fuso[8];
    strftime(base, sizeof(base), "%Y-%m-%dT%H:%M:%S", &local);
    strftime(fuso, sizeof(fuso), "%z", &local);  // ex.: -0300
    if (strlen(fuso) == 5) {
      snprintf(destino, tamanho, "%s%c%c%c:%c%c", base, fuso[0], fuso[1], fuso[2], fuso[3], fuso[4]);
    } else {
      snprintf(destino, tamanho, "%s", base);
    }
  }
};

// ============================== Programa ===================================
static const SensorConfig configuracao = {
    COILLECT_SENSOR_ID, COILLECT_API_URL, WIFI_SSID, WIFI_SENHA, ALTURA_BARRIL_CM, LIMITE_ALERTA,
};

SensorController controlador(configuracao);

void setup() {
  Serial.begin(115200);
  delay(100);
  controlador.iniciar();
}

void loop() {
  controlador.monitorarBarril();
  delay(10);
}
