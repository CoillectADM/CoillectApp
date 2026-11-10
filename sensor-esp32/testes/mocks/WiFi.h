// Wi-Fi SIMULADO (ver Arduino.h): o teste liga e desliga a rede.
#pragma once
#include "Arduino.h"

typedef enum {
  WL_IDLE_STATUS = 0,
  WL_NO_SSID_AVAIL = 1,
  WL_CONNECTED = 3,
  WL_CONNECT_FAILED = 4,
  WL_CONNECTION_LOST = 5,
  WL_DISCONNECTED = 6
} wl_status_t;

#define WIFI_STA 1

namespace simulado {
inline bool wifiDisponivel = true;  // a rede "existe"?
inline int wifiInicios = 0;         // quantas vezes WiFi.begin foi chamado
inline std::string wifiSsid;
inline int wifiCanal = -1;
}  // namespace simulado

class IPAddress {
 public:
  String toString() const { return String("10.10.0.2"); }
};

class WiFiClient {
 public:
  virtual ~WiFiClient() {}
  virtual std::string tipo() const { return "http"; }
};

class WiFiClass {
 public:
  bool mode(int) { return true; }
  bool setAutoReconnect(bool) { return true; }

  wl_status_t begin(const char* ssid, const char* = nullptr, int32_t canal = 0) {
    simulado::wifiInicios++;
    simulado::wifiSsid = ssid ? ssid : "";
    simulado::wifiCanal = canal;
    conectado_ = simulado::wifiDisponivel;
    return status();
  }

  bool disconnect(bool = false) {
    conectado_ = false;
    return true;
  }

  wl_status_t status() {
    if (!simulado::wifiDisponivel) conectado_ = false;
    return conectado_ ? WL_CONNECTED : WL_DISCONNECTED;
  }

  IPAddress localIP() const { return IPAddress(); }

 private:
  bool conectado_ = false;
};

inline WiFiClass WiFi;
