// Testes do firmware do sensor (coillect_sensor.ino) no PC, sem ESP32.
//
// O hardware é simulado (pasta mocks/): relógio virtual, HC-SR04 com a distância
// definida pelo teste, Wi-Fi que liga/desliga e uma API falsa com as mesmas
// regras da API Coillect. O código testado é o MESMO .ino que vai para o Wokwi
// e para o ESP32 físico (só a URL da API é trocada abaixo).
//
// Compilar e rodar (Linux/macOS/WSL, g++ 9+):
//   g++ -std=c++17 -Wall -Wextra -I sensor-esp32/testes/mocks -o /tmp/firmware-testes sensor-esp32/testes/firmware_testes.cpp
//   /tmp/firmware-testes                          # roda os testes
//   /tmp/firmware-testes --eco                    # mostra também o monitor serial
//   /tmp/firmware-testes --capturar saida.jsonl   # grava as requisições do roteiro
//                                                 # (o CI reenvia para a API real)

#define COILLECT_API_URL "http://api.teste/api/sensor-alert"
#include "../coillect_sensor/coillect_sensor.ino"

#include <fstream>
#include <regex>

// ------------------------------------------------------------ mini framework
static int g_verificacoes = 0;
static int g_falhas = 0;

#define VERIFICA(condicao, descricao)                                    \
  do {                                                                   \
    g_verificacoes++;                                                    \
    if (!(condicao)) {                                                   \
      g_falhas++;                                                        \
      std::printf("    FALHOU: %s (linha %d)\n", (descricao), __LINE__); \
    }                                                                    \
  } while (0)

static bool contem(const std::string& texto, const std::string& trecho) {
  return texto.find(trecho) != std::string::npos;
}

static int contar(const std::string& texto, const std::string& trecho) {
  int n = 0;
  for (size_t p = texto.find(trecho); p != std::string::npos; p = texto.find(trecho, p + 1)) n++;
  return n;
}

static int percentualDe(const RequisicaoSimulada& requisicao) {
  static const std::regex padrao("\"percentual\":(\\d+)");
  std::smatch achado;
  if (!std::regex_search(requisicao.corpo, achado, padrao)) return -1;
  return std::stoi(achado[1].str());
}

static std::vector<int> percentuaisEnviados() {
  std::vector<int> lista;
  for (const RequisicaoSimulada& r : simulado::requisicoes) lista.push_back(percentualDe(r));
  return lista;
}

// --------------------------------------------- API falsa (regras da API real)
// Limite de 80% no barril, uma solicitação aberta por barril e, depois de uma
// coleta concluída, só volta a disparar quando o sensor lê o barril abaixo do limite.
struct ApiFalsa {
  int limite = 80;
  int proximoId = 12;
  int solicitacaoAberta = 0;  // 0 = nenhuma
  bool aguardandoVazio = false;
  bool foraDoAr = false;
  std::string ultimaColeta = "null";

  void concluirColeta() {
    solicitacaoAberta = 0;
    aguardandoVazio = true;
    ultimaColeta = "\"2026-11-10T18:00:00.000Z\"";
  }

  RespostaSimulada responder(const RequisicaoSimulada& requisicao) {
    if (foraDoAr) return RespostaSimulada{-1, "", 1000};
    int percentual = percentualDe(requisicao);
    if (percentual < 0) {
      return RespostaSimulada{400, "{\"statusCode\":400,\"message\":[\"percentual must be a number\"]}", 100};
    }
    bool criou = false;
    std::string motivo;
    if (percentual < limite) {
      motivo = "BELOW_THRESHOLD";
      aguardandoVazio = false;
    } else if (solicitacaoAberta != 0) {
      motivo = "REQUEST_ALREADY_OPEN";
    } else if (aguardandoVazio) {
      motivo = "AWAITING_EMPTY_READING";
    } else {
      solicitacaoAberta = proximoId++;
      criou = true;
      motivo = "THRESHOLD_REACHED";
    }
    std::string aberta = solicitacaoAberta == 0
                             ? std::string("null")
                             : "{\"id\":" + std::to_string(solicitacaoAberta) +
                                   ",\"status\":\"PENDING\",\"requestedAt\":\"2026-11-10T17:32:06.120Z\"}";
    std::string mensagem = criou ? "Leitura registrada. Solicitação de coleta #" +
                                       std::to_string(solicitacaoAberta) + " criada."
                                 : std::string("Leitura registrada.");
    std::string corpo =
        "{\"error\":false,\"data\":{\"reading\":{\"id\":1,\"sensorId\":\"CLT-8472-A\",\"percentual\":" +
        std::to_string(percentual) + "},\"sensor\":{\"sensorId\":\"CLT-8472-A\",\"level\":" +
        std::to_string(percentual) + ",\"lastCollectionAt\":" + ultimaColeta +
        ",\"openRequest\":" + aberta + "},\"collection\":{\"triggered\":" +
        (criou ? "true" : "false") + ",\"reason\":\"" + motivo + "\",\"request\":" + aberta +
        "}},\"statusCode\":201,\"requester\":\"sensor:CLT-8472-A\",\"message\":\"" + mensagem +
        "\"}";
    return RespostaSimulada{201, corpo, 300};
  }
};

static ApiFalsa g_api;

// ------------------------------------------------------------- utilidades
static void preparar(const char* cenario) {
  std::printf("- %s\n", cenario);
  simulado::agoraMs = 0;
  simulado::distanciaCm = 81.0f;  // 10% num barril de 90 cm
  simulado::entradas.assign(64, HIGH);
  simulado::saidas.assign(64, LOW);
  simulado::requisicoes.clear();
  simulado::wifiDisponivel = true;
  simulado::wifiInicios = 0;
  simulado::wifiSsid.clear();
  simulado::wifiCanal = -1;
  Serial.saida.clear();
  g_api = ApiFalsa();
  simulado::api = [](const RequisicaoSimulada& r) { return g_api.responder(r); };
}

// Chama monitorarBarril() como o loop() faz, durante `ms` de tempo virtual.
static void rodar(SensorController& controlador, unsigned long ms) {
  unsigned long fim = simulado::agoraMs + ms;
  while (simulado::agoraMs < fim) {
    controlador.monitorarBarril();
    delay(10);
  }
}

// ----------------------------------------------------------------- testes
static void testeCalculadora() {
  std::printf("- FillLevelCalculator: distância -> percentual\n");
  FillLevelCalculator calc;
  VERIFICA(calc.calcularPercentual(90.0f, 90.0f) == 0, "90 cm num barril de 90 cm = 0%");
  VERIFICA(calc.calcularPercentual(81.0f, 90.0f) == 10, "81 cm = 10%");
  VERIFICA(calc.calcularPercentual(45.0f, 90.0f) == 50, "45 cm = 50%");
  VERIFICA(calc.calcularPercentual(18.0f, 90.0f) == 80, "18 cm = 80%");
  VERIFICA(calc.calcularPercentual(12.6f, 90.0f) == 86, "12,6 cm = 86%");
  VERIFICA(calc.calcularPercentual(2.0f, 90.0f) == 98, "2 cm (mínimo do HC-SR04) = 98%");
  VERIFICA(calc.calcularPercentual(0.0f, 90.0f) == 100, "0 cm = 100%");
  VERIFICA(calc.calcularPercentual(400.0f, 90.0f) == 0, "além do fundo = 0%");
  VERIFICA(calc.calcularPercentual(10.0f, 0.0f) == 0, "altura inválida = 0%");
  VERIFICA(calc.calcularPercentual(-1.0f, 90.0f) == 0, "sem eco = 0%");
  VERIFICA(calc.atingiuLimite(80, 80), "80% atinge o limite de 80%");
  VERIFICA(!calc.atingiuLimite(79, 80), "79% não atinge o limite de 80%");
}

static void testeUltrassonico() {
  std::printf("- UltrasonicSensor: mediana de 5 ecos\n");
  simulado::pulsos = 0;
  UltrasonicSensor sensor(PINO_TRIGGER, PINO_ECHO);
  sensor.iniciar();
  simulado::distanciaCm = 45.0f;
  float distancia = sensor.medirDistanciaCm();
  VERIFICA(std::fabs(distancia - 45.0f) < 0.1f, "mede 45 cm");
  VERIFICA(simulado::pulsos == 5, "usa 5 pulsos por medição");
  simulado::distanciaCm = -1.0f;
  VERIFICA(sensor.medirDistanciaCm() < 0.0f, "sem eco devolve -1");
}

static void testePayload() {
  std::printf("- AlertPayload: JSON do contrato da API\n");
  AlertPayload payload;
  payload.sensorId = "CLT-8472-A";
  payload.percentual = 86;
  std::snprintf(payload.dataHora, sizeof(payload.dataHora), "%s", "2026-11-10T14:32:05-03:00");
  char json[192];
  payload.paraJson(json, sizeof(json));
  VERIFICA(std::string(json) ==
               "{\"sensorId\":\"CLT-8472-A\",\"percentual\":86,\"dataHora\":\"2026-11-10T14:32:05-03:00\"}",
           "sensorId, percentual e dataHora");
  payload.dataHora[0] = '\0';
  payload.paraJson(json, sizeof(json));
  VERIFICA(std::string(json) == "{\"sensorId\":\"CLT-8472-A\",\"percentual\":86}",
           "sem relógio sincronizado, omite dataHora");
}

static void testePrimeiraLeitura() {
  preparar("liga, conecta no Wi-Fi do Wokwi e envia a primeira leitura");
  SensorController c(configuracao);
  c.iniciar();
  VERIFICA(simulado::wifiSsid == "Wokwi-GUEST", "conecta na rede Wokwi-GUEST");
  VERIFICA(simulado::wifiCanal == 6, "informa o canal 6 (conexão mais rápida no Wokwi)");
  rodar(c, 1500);
  VERIFICA(simulado::requisicoes.size() == 1, "1 envio logo ao ligar");
  if (simulado::requisicoes.empty()) return;
  const RequisicaoSimulada& r = simulado::requisicoes[0];
  VERIFICA(r.url == "http://api.teste/api/sensor-alert", "usa a URL configurada");
  VERIFICA(r.contentType == "application/json", "Content-Type: application/json");
  VERIFICA(r.cliente == "http", "http:// usa WiFiClient");
  static const std::regex contrato(
      R"(\{"sensorId":"CLT-8472-A","percentual":10,"dataHora":"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00"\})");
  VERIFICA(std::regex_match(r.corpo, contrato), "corpo no formato do contrato, com dataHora em -03:00");
  VERIFICA(r.conectarTimeoutMs == 15000, "espera até 15 s para conectar");
  VERIFICA(r.respostaTimeoutMs == 60000, "espera até 60 s pela resposta (cloud acordando)");
  VERIFICA(contem(Serial.saida, "Motivo: primeira leitura"), "monitor serial mostra o motivo");
  VERIFICA(contem(Serial.saida, "Decisão: abaixo do limite"), "monitor serial mostra a decisão da API");
  VERIFICA(simulado::saidas[PINO_LED_ONLINE] == HIGH, "LED verde aceso após HTTP 201");
  VERIFICA(simulado::saidas[PINO_LED_ALERTA] == LOW, "LED vermelho apagado em 10%");
}

static void testePeriodico() {
  preparar("envio periódico a cada 15 s, mesmo sem mudança de nível");
  SensorController c(configuracao);
  c.iniciar();
  rodar(c, 61000);
  const std::vector<RequisicaoSimulada>& req = simulado::requisicoes;
  VERIFICA(req.size() == 5, "5 envios em 61 s (0, 15, 30, 45 e 60 s)");
  for (size_t i = 1; i < req.size(); i++) {
    unsigned long intervalo = req[i].ms - req[i - 1].ms;
    VERIFICA(intervalo >= 15000 && intervalo <= 15100, "intervalo de 15 s entre envios");
  }
  VERIFICA(contar(Serial.saida, "Motivo: periódico") == 4, "4 envios com motivo periódico");
}

static void testeAlertaImediato() {
  preparar("alerta: envia na hora ao atingir o limite, sem esperar o período");
  SensorController c(configuracao);
  c.iniciar();
  rodar(c, 5000);
  size_t antes = simulado::requisicoes.size();
  simulado::distanciaCm = 12.6f;  // 86%
  unsigned long mudou = simulado::agoraMs;
  rodar(c, 1500);
  VERIFICA(simulado::requisicoes.size() == antes + 1, "1 envio logo após atingir o limite");
  const RequisicaoSimulada& r = simulado::requisicoes.back();
  VERIFICA(percentualDe(r) == 86, "envia 86%");
  VERIFICA(r.ms - mudou <= 1300, "em até ~1 s, sem esperar os 15 s");
  VERIFICA(contem(Serial.saida, "Motivo: alerta - atingiu o limite"), "motivo: alerta");
  VERIFICA(contem(Serial.saida, "Solicitação de coleta #12 criada."), "monitor mostra a solicitação criada");
  VERIFICA(contem(Serial.saida, "Solicitação de coleta #12 aberta para o barril: PENDING"),
           "monitor mostra a solicitação aberta");
  VERIFICA(simulado::saidas[PINO_LED_ALERTA] == HIGH, "LED vermelho aceso no limite");

  rodar(c, 40000);
  VERIFICA(contar(Serial.saida, "Motivo: alerta - atingiu o limite") == 1,
           "acima do limite não repete o alerta");
  VERIFICA(contar(Serial.saida, "REQUEST_ALREADY_OPEN") >= 2, "envios periódicos seguem e a API não duplica");
  VERIFICA(g_api.proximoId == 13, "API criou só uma solicitação");
}

static void testeHisterese() {
  preparar("histerese: novo alerta só depois de o nível baixar 10 pontos");
  SensorController c(configuracao);
  c.iniciar();
  rodar(c, 4000);
  simulado::distanciaCm = 12.6f;  // 86%: alerta
  rodar(c, 4000);
  simulado::distanciaCm = 22.5f;  // 75%: abaixo do limite, mas dentro da histerese
  rodar(c, 4000);
  simulado::distanciaCm = 12.6f;  // 86% de novo: não é alerta novo
  rodar(c, 4000);
  VERIFICA(contar(Serial.saida, "Motivo: alerta - atingiu o limite") == 1, "75% não rearma o alerta");
  simulado::distanciaCm = 36.0f;  // 60%: rearma
  rodar(c, 4000);
  simulado::distanciaCm = 12.6f;  // 86%: alerta novo
  rodar(c, 4000);
  VERIFICA(contar(Serial.saida, "Motivo: alerta - atingiu o limite") == 2, "60% rearma; 86% alerta de novo");
  std::vector<int> esperado = {10, 86, 75, 86, 60, 86};
  VERIFICA(percentuaisEnviados() == esperado, "envia 10, 86, 75, 86, 60, 86");
}

static void testeVariacao() {
  preparar("variação: envia antes do período quando o nível muda 5 pontos");
  SensorController c(configuracao);
  c.iniciar();
  rodar(c, 4000);
  simulado::distanciaCm = 54.0f;  // 40%
  rodar(c, 1500);
  VERIFICA(simulado::requisicoes.size() == 2, "envia a mudança de 10% para 40%");
  VERIFICA(percentualDe(simulado::requisicoes.back()) == 40, "envia 40%");
  VERIFICA(contem(Serial.saida, "Motivo: variação de nível"), "motivo: variação de nível");
  simulado::distanciaCm = 52.2f;  // 42%: mudança pequena
  rodar(c, 5000);
  VERIFICA(simulado::requisicoes.size() == 2, "mudança de 2 pontos espera o período");
}

static void testeSemEco() {
  preparar("sem eco do HC-SR04: não envia leitura inventada");
  simulado::distanciaCm = -1.0f;
  SensorController c(configuracao);
  c.iniciar();
  rodar(c, 5000);
  VERIFICA(simulado::requisicoes.empty(), "nenhum envio sem medição");
  VERIFICA(contem(Serial.saida, "Sem eco do HC-SR04"), "avisa no monitor serial");
}

static void testeApiForaDoAr() {
  preparar("API fora do ar: guarda o alerta e tenta de novo");
  SensorController c(configuracao);
  c.iniciar();
  rodar(c, 2000);
  g_api.foraDoAr = true;
  simulado::distanciaCm = 12.6f;
  rodar(c, 3000);
  VERIFICA(simulado::requisicoes.size() == 2, "tentou enviar o alerta");
  VERIFICA(contem(Serial.saida, "Sem resposta (connection refused)"), "avisa que a API não respondeu");
  VERIFICA(simulado::saidas[PINO_LED_ONLINE] == LOW, "LED verde apaga na falha");
  g_api.foraDoAr = false;
  rodar(c, 7000);
  VERIFICA(simulado::requisicoes.size() == 3, "nova tentativa depois de 5 s");
  VERIFICA(percentualDe(simulado::requisicoes.back()) == 86, "reenviou 86%");
  VERIFICA(contem(Serial.saida, "Motivo: alerta - nova tentativa"), "motivo: nova tentativa do alerta");
  VERIFICA(contem(Serial.saida, "Solicitação de coleta #12 criada."), "API criou a solicitação");
  VERIFICA(simulado::saidas[PINO_LED_ONLINE] == HIGH, "LED verde volta a acender");
}

static void testeWiFiCaiu() {
  preparar("Wi-Fi caiu: segura o alerta e envia ao reconectar");
  SensorController c(configuracao);
  c.iniciar();
  rodar(c, 2000);
  simulado::wifiDisponivel = false;
  simulado::distanciaCm = 12.6f;
  rodar(c, 5000);
  VERIFICA(simulado::requisicoes.size() == 1, "sem Wi-Fi não envia");
  VERIFICA(contem(Serial.saida, "Conexão perdida"), "avisa que a conexão caiu");
  VERIFICA(contem(Serial.saida, "Sem Wi-Fi: leitura (alerta - atingiu o limite) será enviada ao reconectar."),
           "guarda o alerta");
  simulado::wifiDisponivel = true;
  rodar(c, 12000);
  VERIFICA(simulado::wifiInicios >= 2, "tentou reconectar");
  VERIFICA(contem(Serial.saida, "[WIFI] Reconectado"), "reconectou");
  VERIFICA(simulado::requisicoes.size() == 2, "enviou o alerta guardado");
  VERIFICA(percentualDe(simulado::requisicoes.back()) == 86, "o alerta é de 86%");
}

static void testeBotao() {
  preparar("botão: envia a leitura na hora");
  SensorController c(configuracao);
  c.iniciar();
  rodar(c, 4000);
  simulado::entradas[PINO_BOTAO] = LOW;  // pressiona
  rodar(c, 600);
  simulado::entradas[PINO_BOTAO] = HIGH;  // solta
  rodar(c, 500);
  VERIFICA(simulado::requisicoes.size() == 2, "botão gera um envio extra");
  VERIFICA(contem(Serial.saida, "Motivo: botão (envio manual)"), "motivo: botão");
}

static void testeHttps() {
  preparar("https:// usa conexão TLS (setInsecure), como na cloud");
  SensorConfig cfg = configuracao;
  cfg.apiUrl = "https://coillect-api.onrender.com/api/sensor-alert";
  SensorController c(cfg);
  c.iniciar();
  rodar(c, 1500);
  VERIFICA(simulado::requisicoes.size() == 1, "envia");
  if (!simulado::requisicoes.empty()) {
    VERIFICA(simulado::requisicoes[0].cliente == "https (setInsecure)", "usa WiFiClientSecure sem validar certificado");
  }
}

static void testeUrlDeExemplo() {
  preparar("URL de exemplo: avisa e não envia");
  SensorConfig cfg = configuracao;
  cfg.apiUrl = "https://SEU-SERVICO.onrender.com/api/sensor-alert";
  SensorController c(cfg);
  c.iniciar();
  rodar(c, 3000);
  VERIFICA(simulado::requisicoes.empty(), "não envia para a URL de exemplo");
  VERIFICA(contem(Serial.saida, "ATENÇÃO: troque COILLECT_API_URL"), "avisa ao ligar");
}

static void testeColetaConcluida() {
  preparar("coleta concluída: avisa no monitor e só dispara de novo após ler o barril vazio");
  SensorController c(configuracao);
  c.iniciar();
  rodar(c, 2000);
  simulado::distanciaCm = 12.6f;
  rodar(c, 2000);
  VERIFICA(g_api.proximoId == 13, "solicitação #12 criada");
  g_api.concluirColeta();  // empresa concluiu no app, mas o barril (simulado) continua cheio
  rodar(c, 16000);
  VERIFICA(contem(Serial.saida, "Coleta concluída pela empresa em 2026-11-10T18:00:00.000Z"),
           "monitor avisa que a coleta foi concluída");
  VERIFICA(contem(Serial.saida, "aguardando o sensor ler o barril vazio"), "API não abre outra solicitação");
  VERIFICA(g_api.proximoId == 13, "nenhuma solicitação nova com o barril ainda cheio");
  simulado::distanciaCm = 95.0f;  // esvaziou
  rodar(c, 4000);
  simulado::distanciaCm = 12.6f;  // encheu de novo
  rodar(c, 2000);
  VERIFICA(g_api.proximoId == 14, "novo ciclo: solicitação #13 criada");
}

static void testeSetupLoop() {
  preparar("setup() e loop() do sketch");
  setup();
  for (int i = 0; i < 150; i++) loop();
  VERIFICA(simulado::requisicoes.size() == 1, "setup() conecta e loop() envia a primeira leitura");
}

static std::vector<RequisicaoSimulada> g_roteiro;

static void testeRoteiro() {
  preparar("roteiro da apresentação (10% -> 50% -> 86% -> 92% -> barril vazio)");
  SensorController c(configuracao);
  c.iniciar();
  rodar(c, 3000);
  simulado::distanciaCm = 45.0f;  // 50%
  rodar(c, 3000);
  simulado::distanciaCm = 12.6f;  // 86%: alerta
  rodar(c, 3000);
  simulado::distanciaCm = 7.2f;  // 92%
  rodar(c, 3000);
  simulado::distanciaCm = 95.0f;  // coletor esvaziou o barril
  rodar(c, 3000);
  std::vector<int> esperado = {10, 50, 86, 92, 0};
  VERIFICA(percentuaisEnviados() == esperado, "envia 10, 50, 86, 92 e 0");
  VERIFICA(contar(Serial.saida, "Solicitação de coleta #12 criada.") == 1, "uma solicitação no ciclo");
  g_roteiro = simulado::requisicoes;
}

int main(int argc, char** argv) {
  std::string capturar;
  for (int i = 1; i < argc; i++) {
    std::string arg = argv[i];
    if (arg == "--capturar" && i + 1 < argc) {
      capturar = argv[++i];
    } else if (arg == "--eco") {
      Serial.eco = true;
    }
  }

  std::printf("Firmware do sensor Coillect: testes no PC com hardware simulado\n\n");
  testeCalculadora();
  testeUltrassonico();
  testePayload();
  testePrimeiraLeitura();
  testePeriodico();
  testeAlertaImediato();
  testeHisterese();
  testeVariacao();
  testeSemEco();
  testeApiForaDoAr();
  testeWiFiCaiu();
  testeBotao();
  testeHttps();
  testeUrlDeExemplo();
  testeColetaConcluida();
  testeSetupLoop();
  testeRoteiro();

  if (!capturar.empty()) {
    std::ofstream arquivo(capturar);
    for (const RequisicaoSimulada& r : g_roteiro) {
      arquivo << "{\"ms\":" << r.ms << ",\"corpo\":" << r.corpo << "}\n";
    }
    std::printf("\nRoteiro gravado em %s (%zu requisições do firmware)\n", capturar.c_str(), g_roteiro.size());
  }

  std::printf("\n%d verificações, %d falha(s)\n", g_verificacoes, g_falhas);
  return g_falhas == 0 ? 0 : 1;
}
