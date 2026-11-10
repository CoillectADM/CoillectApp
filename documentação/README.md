# Documentação do Coillect

Documentação completa do MVP do Coillect: tudo o que foi criado e alterado nos quatro repositórios,
como cada parte funciona, todas as bibliotecas e ferramentas usadas, as interações entre sensor, API,
apps e Azure, os testes e o histórico de mudanças.

Ela descreve o estado da `main` de cada repositório em 10/11/2026:

| Repositório | Conteúdo | Commit da `main` |
|---|---|---|
| [CoillectApp](https://github.com/CoillectADM/CoillectApp) (público) | API (`backend/`), sensor ESP32 e sensor virtual (`sensor-esp32/`), documentação, Docker e CI | `e5c4253d` |
| [app-mobile-sindico](https://github.com/CoillectADM/app-mobile-sindico) (privado) | App Android do síndico | `62bc6d19` |
| [app-mobile-empresa](https://github.com/CoillectADM/app-mobile-empresa) (privado) | App Android da empresa coletora | `e0051c92` |
| [interface-desktop-adm-coillect](https://github.com/CoillectADM/interface-desktop-adm-coillect) (privado) | App desktop do administrador | `4e321739` |

## Por onde começar

| Se você quer... | Leia |
|---|---|
| Entender o projeto em 10 minutos | [01-visao-geral-e-arquitetura.md](01-visao-geral-e-arquitetura.md) e [09-interacoes-e-fluxos.md](09-interacoes-e-fluxos.md) |
| Rodar tudo na sua máquina e apresentar em aula | [12-execucao-local-e-deploy.md](12-execucao-local-e-deploy.md) e [14-dados-de-demonstracao-e-glossario.md](14-dados-de-demonstracao-e-glossario.md) |
| Avaliar a parte de nuvem (Atividade A02) | [08-azure-storage-e-nuvem.md](08-azure-storage-e-nuvem.md) |
| Mexer no código da API | [02-api-backend.md](02-api-backend.md) e [03-referencia-de-rotas.md](03-referencia-de-rotas.md) |
| Mexer no sensor | [04-sensor-esp32-e-simulador.md](04-sensor-esp32-e-simulador.md) |
| Mexer nos apps | [05-app-sindico.md](05-app-sindico.md), [06-app-empresa.md](06-app-empresa.md) e [07-desktop-admin.md](07-desktop-admin.md) |
| Saber o que mudou e quando | [13-historico-de-mudancas.md](13-historico-de-mudancas.md) |

O Codex (ChatGPT) continua começando por [`LEIA-PRIMEIRO-CODEX.txt`](../LEIA-PRIMEIRO-CODEX.txt), que é o
guia operacional curto. Esta pasta é a referência detalhada.

## Índice

| Documento | O que cobre |
|---|---|
| [01-visao-geral-e-arquitetura.md](01-visao-geral-e-arquitetura.md) | O que é o Coillect, perfis, componentes e repositórios, diagrama da arquitetura, o ciclo principal em 10 passos, decisões de projeto, tecnologias, ambientes de execução, escopo e o que foi ou não verificado |
| [02-api-backend.md](02-api-backend.md) | A API NestJS por dentro: módulos e arquivos, inicialização, variáveis de ambiente, modelo de dados, regras de negócio, eventos, notificações, autenticação, administração, dados de demonstração, código legado e o que mudou em relação ao código anterior |
| [03-referencia-de-rotas.md](03-referencia-de-rotas.md) | Todas as rotas HTTP: autenticação, corpo, resposta, erros, quem chama cada uma e exemplos de `curl` |
| [04-sensor-esp32-e-simulador.md](04-sensor-esp32-e-simulador.md) | Firmware do ESP32 (Wokwi e placa), circuito, política de envio, sensor virtual no PC, contrato com a API e testes do sensor |
| [05-app-sindico.md](05-app-sindico.md) | App Android do síndico: arquitetura, telas, estado, comunicação com a API, celular de verdade, modo demonstração, build, testes e mudanças |
| [06-app-empresa.md](06-app-empresa.md) | App Android da empresa coletora, na mesma estrutura do documento do síndico |
| [07-desktop-admin.md](07-desktop-admin.md) | App desktop do administrador: abas, cadastros, aba Nuvem, reinício da demonstração, build e testes |
| [08-azure-storage-e-nuvem.md](08-azure-storage-e-nuvem.md) | Blob Storage, Queue Storage, Azurite, modo local, cliente REST, fila e poison queue, comprovantes, telemetria, health e o mapa da Atividade A02 |
| [09-interacoes-e-fluxos.md](09-interacoes-e-fluxos.md) | Como as partes conversam: 12 fluxos com diagramas de sequência, tempos e intervalos, matriz de notificações e estados da solicitação |
| [10-bibliotecas-e-ferramentas.md](10-bibliotecas-e-ferramentas.md) | Todas as bibliotecas, frameworks, imagens Docker, actions do GitHub e serviços, com versão, uso e o que foi adicionado ou removido |
| [11-testes-e-ci.md](11-testes-e-ci.md) | Inventário de testes de cada parte, workflows do GitHub Actions e como rodar os testes localmente |
| [12-execucao-local-e-deploy.md](12-execucao-local-e-deploy.md) | Rodar localmente, celulares na mesma rede, roteiro da apresentação, deploy na Azure e no Render, problemas comuns |
| [13-historico-de-mudancas.md](13-historico-de-mudancas.md) | Os 15 Pull Requests, um por um, com resumo e lista completa de arquivos |
| [14-dados-de-demonstracao-e-glossario.md](14-dados-de-demonstracao-e-glossario.md) | Contas, condomínios, barris e sensores de demonstração, endereços e portas, respostas do sensor e glossário |

## O que foi criado, em números

| Parte | O que existe agora | Base anterior |
|---|---|---|
| API (`backend/`) | 66 arquivos novos e 7 alterados em `backend/src`; 2 suítes e2e novas (`mvp-flow`, `azure-storage`); 3 scripts (`smoke-flow.mjs`, `endereco-celular.mjs` e o teste dele). Nenhuma dependência npm nova | API com cadastro, login e coleta manual (commit `76f12374`) |
| Sensor (`sensor-esp32/`) | Firmware do ESP32, circuito do Wokwi, sensor virtual com painel, testes do firmware no PC e scripts de teste contra a API (11 arquivos de código, cerca de 2.900 linhas) | Não existia |
| Nuvem | Cliente REST do Azure Storage, Blob (comprovantes), Queue (notificações), telemetria, Azurite no Docker Compose, imagem no GHCR, `render.yaml` | Não existia |
| App do síndico | 19 arquivos Kotlin de código e 6 de teste (29 arquivos novos, 6 alterados e 16 removidos em relação à base) | CoillectMobileRemake (`4d594a3`) |
| App da empresa | 18 arquivos Kotlin de código e 6 de teste (28 novos, 6 alterados, 16 removidos) | CoillectMobileRemake (`4d594a3`) |
| Desktop do administrador | 12 arquivos Kotlin de código e 3 de teste (18 novos, 8 alterados, 30 removidos) | CoillectMobileRemake (`4d594a3`) |
| CI | 7 arquivos de workflow: `backend.yml`, `imagem-api.yml`, `sensor-esp32.yml` e `documentacao.yml` no CoillectApp; `android.yml` em cada app; `desktop.yml` no desktop | Não existia |
| Documentação | `LEIA-PRIMEIRO-CODEX.txt`, `AGENTS.md`, `README.md` da raiz, 6 documentos em `docs/`, READMEs do backend, do sensor e dos apps, e esta pasta | README padrão do NestJS |
| Pull Requests | 15 PRs mesclados antes desta documentação (6 no CoillectApp e 3 em cada app), +22.207 e −4.784 linhas | — |

## Como esta documentação foi feita e é conferida

- Cada afirmação foi conferida no código da `main` dos quatro repositórios. Quando um documento
  existente (`docs/`, READMEs) e o código divergiam, vale o código.
- O que não pôde ser verificado em ambiente real está marcado como "não verificado": celulares reais,
  Wokwi no navegador, placa ESP32 física e deploy na Azure. Builds e testes rodaram no GitHub Actions.
- O workflow [`documentacao.yml`](../.github/workflows/documentacao.yml) roda a cada mudança nesta
  pasta: confere se os links internos e as âncoras existem
  ([`verificar_documentacao.py`](../.github/scripts/verificar_documentacao.py)) e se todos os diagramas
  Mermaid são válidos (com o mermaid-cli, a mesma biblioteca que o GitHub usa para desenhá-los).
- Os links para arquivos dos apps apontam para repositórios privados: é preciso estar logado no GitHub
  com acesso à organização `CoillectADM`.

## Pontos de atenção encontrados ao documentar

Conferir o código linha a linha revelou os pontos abaixo. Os três primeiros foram corrigidos junto
com esta documentação, porque atrapalhariam a execução local, a avaliação da A02 ou a apresentação.
Os demais estão descritos nos documentos de cada parte e não mudam o fluxo da demonstração.

| Ponto | Efeito | Situação |
|---|---|---|
| A API não lê o arquivo `backend/.env`; fora do Docker as variáveis vêm do terminal | Seguindo o README antigo, a API tentava o banco na porta 5432 em vez da 5482 | Corrigido em [`backend/README.md`](../backend/README.md); detalhes em [12](12-execucao-local-e-deploy.md) |
| A trava por barril, a pausa da fila e os contadores da aba Nuvem ficam na memória de cada instância da API | Com 2+ instâncias, leituras simultâneas do mesmo barril em instâncias diferentes poderiam abrir duas solicitações | Texto corrigido em [`docs/azure-a02.md`](../docs/azure-a02.md) §6; o MVP roda com 1 instância |
| O roteiro do `LEIA-PRIMEIRO-CODEX.txt` (§7.2, passo 2) dava a entender que era para cadastrar Residencial Aurora, `BRL-8472` e `CLT-8472-A`, que já existem | Cadastrar de novo o barril ou o sensor dá 409 no meio da aula | Corrigido: o passo agora diz para mostrar os cadastros existentes |
| Os tokens do síndico e da empresa usam o mesmo segredo e os guards não conferem o `role` | Um token de empresa passaria numa rota do síndico | Limitação aceita (segurança fora do escopo); ver [02](02-api-backend.md) |
| `GET /api/collection-request/my-active` também devolve solicitação `REFUSED` (filtro herdado do código antigo) | Depois de um "Recusar", o app do síndico mostra "Coleta solicitada à empresa" sempre que não houver solicitação pendente ou agendada mais nova, até "Reiniciar demonstração". O roteiro da aula não usa "Recusar" e começa com o reinício | Comportamento atual; ver [05](05-app-sindico.md) e [03](03-referencia-de-rotas.md) |
| A resposta de `POST .../company-complete` traz o nível anterior do sensor e `receiptAvailable: false` | Nenhum: os apps atualizam na consulta seguinte | Comportamento atual |
| Algumas ações `POST` respondem HTTP 201 com `statusCode: 200` no corpo | Nenhum: os apps usam o código HTTP | Comportamento atual |
| A rota antiga do `AppController` responde em `/api/api`, não em `/api` | Nenhum: nenhum app usa | Legado |
| O evento de telemetria `comprovante_erro` está declarado, mas nunca é emitido | Nenhum na demonstração | Ver [08](08-azure-storage-e-nuvem.md) |
| Pela leitura do firmware, a mensagem do 404 (sensor não cadastrado) sai cortada no monitor serial | Cosmético; não executado | Ver [04](04-sensor-esp32-e-simulador.md) |
| O APK da release `demo` vem com o servidor do emulador (`http://10.0.2.2:3000/api/`) | No celular é preciso digitar o IP do PC ou o domínio (o app lembra depois) | Esperado; ver [05](05-app-sindico.md) e [12](12-execucao-local-e-deploy.md) |
| `imagem-api.yml` publica a imagem mesmo se o `backend.yml` falhar | Uma imagem com defeito chegaria ao GHCR | Atenção ao publicar; ver [11](11-testes-e-ci.md) |
| Dependências npm antigas: `@nestjs/config` e `postgres` declaradas e não usadas; `dotenv` e `express` usados sem declaração direta; `typeorm` em `devDependencies` | Nenhum no MVP (a imagem Docker sobe no CI) | Pré-existente; ver [10](10-bibliotecas-e-ferramentas.md) |
| Documentos antigos com detalhes desatualizados: `docs/api-apps.md` (o desktop não chama `GET admin/sensors`), README do desktop (paleta e testes), README da empresa (botões do painel), `LEIA-PRIMEIRO-CODEX.txt` §4.2 (a idempotência por `dedupeKey` não tem teste), `docs/estado-atual.md` (o CI roda mais suítes) | Leitor pode se confundir | Não alterados; vale o que está nesta pasta |

## Outros documentos do repositório

| Documento | Para quê |
|---|---|
| [`LEIA-PRIMEIRO-CODEX.txt`](../LEIA-PRIMEIRO-CODEX.txt) | Guia para o Codex: rodar, testar, roteiro da aula, deploys |
| [`backend/README.md`](../backend/README.md) | Como rodar a API e os testes |
| [`sensor-esp32/README.md`](../sensor-esp32/README.md) | Passo a passo do Wokwi, da placa e do sensor virtual |
| [`docs/api-apps.md`](../docs/api-apps.md) | Rotas usadas pelos apps, com exemplos de JSON |
| [`docs/contrato-sensor.md`](../docs/contrato-sensor.md) | Contrato do sensor com a API |
| [`docs/azure-a02.md`](../docs/azure-a02.md) | Atividade A02 e passo a passo do deploy na Azure |
| [`docs/deploy-cloud.md`](../docs/deploy-cloud.md) | Variáveis de ambiente e outros provedores de nuvem |
| [`docs/diagramas.md`](../docs/diagramas.md) | Cada classe dos diagramas e o arquivo correspondente no código |
| [`docs/estado-atual.md`](../docs/estado-atual.md) | Inventário do backend: reaproveitado, ajustado, criado e legado |
