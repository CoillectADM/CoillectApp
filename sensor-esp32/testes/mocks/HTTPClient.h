// HTTPClient SIMULADO: guarda cada requisição do firmware e devolve a resposta
// que o teste definir em simulado::api (por padrão, HTTP 201).
#pragma once
#include "WiFi.h"

struct RequisicaoSimulada {
  unsigned long ms = 0;  // millis() no momento do POST
  std::string url;
  std::string corpo;
  std::string contentType;
  std::string cliente;  // "http", "https" ou "https (setInsecure)"
  long conectarTimeoutMs = -1;
  long respostaTimeoutMs = -1;
};

struct RespostaSimulada {
  int status;  // > 0: HTTP; < 0: erro de conexão (como no ESP32)
  std::string corpo;
  unsigned long latenciaMs;
};

namespace simulado {
inline std::vector<RequisicaoSimulada> requisicoes;
inline std::function<RespostaSimulada(const RequisicaoSimulada&)> api;
}  // namespace simulado

class HTTPClient {
 public:
  bool begin(WiFiClient& cliente, const String& url) {
    atual_ = RequisicaoSimulada();
    atual_.url = url.c_str();
    atual_.cliente = cliente.tipo();
    return url.startsWith("http://") || url.startsWith("https://");
  }

  void setConnectTimeout(int32_t ms) { atual_.conectarTimeoutMs = ms; }
  void setTimeout(uint16_t ms) { atual_.respostaTimeoutMs = ms; }

  void addHeader(const String& nome, const String& valor) {
    if (nome == "Content-Type") atual_.contentType = valor.c_str();
  }

  int POST(uint8_t* dados, size_t tamanho) {
    atual_.corpo.assign(reinterpret_cast<const char*>(dados), tamanho);
    atual_.ms = simulado::agoraMs;
    simulado::requisicoes.push_back(atual_);
    RespostaSimulada resposta =
        simulado::api ? simulado::api(atual_) : RespostaSimulada{201, "{}", 0};
    simulado::agoraMs += resposta.latenciaMs;
    resposta_ = resposta.corpo;
    return resposta.status;
  }

  String getString() { return String(resposta_); }
  void end() {}

  static String errorToString(int erro) {
    if (erro == -1) return String("connection refused");
    if (erro == -11) return String("read Timeout");
    return String("erro de conexão");
  }

 private:
  RequisicaoSimulada atual_;
  std::string resposta_;
};
