# Coillect API (backend)

API NestJS + PostgreSQL do MVP Coillect. Liga o sensor do barril de óleo aos três apps:

```
Sensor físico (ESP32) ou sensor virtual
  └─ POST /api/sensor/readings { sensorId, level }
       └─ listener: nível ≥ limite e nenhuma coleta aberta?
            └─ cria UMA solicitação de coleta (PENDING)
                 ├─ app-mobile-empresa: recebe, inicia e conclui a coleta
                 ├─ app-mobile-sindico: cópia/notificação da MESMA solicitação
                 └─ interface-desktop-adm-coillect: acompanha barris e solicitações
```

## Rodar

Com Docker (recomendado), na raiz do repositório:

```bash
docker compose up -d --build db backend
```

- API: `http://localhost:3000/api` · Swagger: `http://localhost:3000/api/docs`
- No emulador Android, o endereço do computador é `http://10.0.2.2:3000/api/`.

Sem Docker (banco do compose na porta 5482):

```bash
cd backend
cp .env.example .env      # ajuste se precisar
npm ci
npm run start:dev
```

## Contas de demonstração

Criadas automaticamente na primeira subida (`SEED_DEMO=true`):

| Perfil | Login | Senha |
|---|---|---|
| Síndico | `sindico@coillect.com` | `Coillect@2025` |
| Empresa coletora | `empresa@coillect.com` | `Coillect@2025` |
| Desktop administrativo | sem login | — |

Sensores: `COI-DEMO-01` (Condomínio Demonstração, do síndico de demonstração, começa em 0%), `COI-ILUS-02` e `COI-ILUS-03` (ilustrativos). Limite: 80%.

Para repetir a apresentação do zero: `POST /api/admin/demo/reset`.

## Simular o sensor agora

```bash
curl -X POST http://localhost:3000/api/sensor/readings \
  -H "Content-Type: application/json" -d '{"sensorId":"COI-DEMO-01","level":85}'
```

## Testes

| Comando | O que verifica |
|---|---|
| `npm run test:mvp` | Regra de disparo, contrato do sensor, formatos de resposta, configuração |
| `npm run test:e2e:mvp` | Fluxo completo contra PostgreSQL real (reinicia os dados de demonstração do banco usado) |
| `npm run smoke -- <URL>/api --reset` | O mesmo ciclo contra uma API já publicada (local ou cloud) |

O GitHub Actions roda os três a cada push em `backend/`.

## Documentação

- [Contrato do sensor](../docs/contrato-sensor.md): payload, respostas, regra de disparo, exemplo ESP32
- [API para os três apps](../docs/api-apps.md): rotas por app, formatos e o que falta nos apps
- [Publicar na cloud](../docs/deploy-cloud.md): variáveis de ambiente, Render e outros provedores
- [Estado atual do backend](../docs/estado-atual.md): o que foi reutilizado, ajustado e criado
