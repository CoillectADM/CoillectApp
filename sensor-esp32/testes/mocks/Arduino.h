// Ambiente Arduino/ESP32 SIMULADO para testar o firmware no PC (g++), sem placa.
// Contém só o que o coillect_sensor.ino usa. O relógio é virtual: delay() avança
// millis() na hora, então um teste de 60 s roda em milissegundos.
#pragma once

#include <cmath>
#include <cstdarg>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <ctime>
#include <functional>
#include <string>
#include <vector>

#define HIGH 0x1
#define LOW 0x0
#define INPUT 0x01
#define OUTPUT 0x03
#define INPUT_PULLUP 0x05

// --------------------------------------------------------------- String
class String {
 public:
  String() {}
  String(const char* texto) : s_(texto ? texto : "") {}
  String(const std::string& texto) : s_(texto) {}

  unsigned int length() const { return (unsigned int)s_.size(); }
  const char* c_str() const { return s_.c_str(); }

  int indexOf(char c) const { return indexOf(c, 0); }
  int indexOf(char c, unsigned int de) const {
    size_t p = s_.find(c, de);
    return p == std::string::npos ? -1 : (int)p;
  }
  int indexOf(const String& trecho) const { return indexOf(trecho, 0); }
  int indexOf(const String& trecho, unsigned int de) const {
    size_t p = s_.find(trecho.s_, de);
    return p == std::string::npos ? -1 : (int)p;
  }

  String substring(unsigned int de) const {
    return de >= s_.size() ? String("") : String(s_.substr(de));
  }
  String substring(unsigned int de, unsigned int ate) const {
    if (de > ate) {
      unsigned int t = de;
      de = ate;
      ate = t;
    }
    if (de >= s_.size()) return String("");
    return String(s_.substr(de, ate - de));
  }

  bool startsWith(const String& prefixo) const {
    return s_.compare(0, prefixo.s_.size(), prefixo.s_) == 0;
  }
  long toInt() const { return std::strtol(s_.c_str(), nullptr, 10); }

  bool operator==(const String& outro) const { return s_ == outro.s_; }
  bool operator==(const char* outro) const { return s_ == (outro ? outro : ""); }
  bool operator!=(const String& outro) const { return s_ != outro.s_; }
  String& operator+=(const String& outro) {
    s_ += outro.s_;
    return *this;
  }
  String& operator+=(const char* outro) {
    s_ += (outro ? outro : "");
    return *this;
  }

 private:
  std::string s_;
};

// --------------------------------------------------------------- Serial
class SerialSimulado {
 public:
  std::string saida;  // tudo o que o firmware escreveu no monitor serial
  bool eco = false;   // true: também imprime no terminal (--eco)

  void begin(unsigned long) {}

  size_t write(const char* texto) {
    saida += texto;
    if (eco) std::fputs(texto, stdout);
    return std::strlen(texto);
  }

  __attribute__((format(printf, 2, 3))) size_t printf(const char* formato, ...) {
    char buffer[1024];
    va_list argumentos;
    va_start(argumentos, formato);
    int n = std::vsnprintf(buffer, sizeof(buffer), formato, argumentos);
    va_end(argumentos);
    write(buffer);
    return n < 0 ? 0 : (size_t)n;
  }

  size_t print(const char* texto) { return write(texto); }
  size_t print(const String& texto) { return write(texto.c_str()); }
  size_t println() { return write("\n"); }
  size_t println(const char* texto) { return write(texto) + write("\n"); }
  size_t println(const String& texto) { return println(texto.c_str()); }
};

inline SerialSimulado Serial;

// ------------------------------------------------- hardware controlado pelo teste
namespace simulado {
inline unsigned long agoraMs = 0;            // relógio virtual (millis)
inline float distanciaCm = 400.0f;           // o que o HC-SR04 "vê"; < 0 = sem eco
inline std::vector<int> entradas(64, HIGH);  // digitalRead (pull-up: HIGH = solto)
inline std::vector<int> saidas(64, LOW);     // último digitalWrite de cada pino
inline int pulsos = 0;                       // quantas medições de eco foram feitas
}  // namespace simulado

inline unsigned long millis() { return simulado::agoraMs; }
inline void delay(unsigned long ms) { simulado::agoraMs += ms; }
inline void delayMicroseconds(unsigned int) {}
inline void pinMode(int, int) {}

inline void digitalWrite(int pino, int valor) {
  if (pino >= 0 && pino < 64) simulado::saidas[pino] = valor;
}

inline int digitalRead(int pino) {
  return (pino >= 0 && pino < 64) ? simulado::entradas[pino] : LOW;
}

// HC-SR04: o eco dura 58 us por centímetro (ida e volta do som).
inline unsigned long pulseIn(int, int, unsigned long limiteUs = 1000000UL) {
  simulado::pulsos++;
  if (simulado::distanciaCm < 0.0f) return 0;
  unsigned long duracaoUs = (unsigned long)(simulado::distanciaCm * 58.0f + 0.5f);
  return duracaoUs > limiteUs ? 0 : duracaoUs;
}

// No ESP32 sincroniza o relógio por NTP; aqui só aplica o fuso horário.
inline void configTzTime(const char* fuso, const char*, const char* = nullptr,
                         const char* = nullptr) {
  setenv("TZ", fuso, 1);
  tzset();
}
