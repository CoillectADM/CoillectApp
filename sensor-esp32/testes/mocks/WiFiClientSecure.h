// Cliente HTTPS SIMULADO: registra se o firmware chamou setInsecure().
#pragma once
#include "WiFi.h"

class WiFiClientSecure : public WiFiClient {
 public:
  void setInsecure() { inseguro = true; }
  std::string tipo() const override { return inseguro ? "https (setInsecure)" : "https"; }
  bool inseguro = false;
};
