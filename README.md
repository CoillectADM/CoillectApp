# Coillect — API, sensor e documentação

MVP universitário de coleta de óleo de cozinha usado: o sensor do barril (ESP32, Wokwi ou sensor
virtual) envia o nível para a API; ao passar de 80%, a API abre a solicitação de coleta para a
empresa e notifica o síndico. Fila e comprovantes no Azure Storage (Queue + Blob).

- **Comece por [`LEIA-PRIMEIRO-CODEX.txt`](LEIA-PRIMEIRO-CODEX.txt)**: visão geral, rodar
  localmente, testes, roteiro da apresentação e deploys.
- API: [`backend/`](backend/README.md) · Sensor: [`sensor-esp32/`](sensor-esp32/README.md) ·
  Rotas dos apps: [`docs/api-apps.md`](docs/api-apps.md) · Azure (A02): [`docs/azure-a02.md`](docs/azure-a02.md)
- Apps: [app-mobile-sindico](https://github.com/CoillectADM/app-mobile-sindico) ·
  [app-mobile-empresa](https://github.com/CoillectADM/app-mobile-empresa) ·
  [interface-desktop-adm-coillect](https://github.com/CoillectADM/interface-desktop-adm-coillect)

Subir localmente (Docker): `docker compose up -d --build db azurite backend` → http://localhost:3000/api/docs
