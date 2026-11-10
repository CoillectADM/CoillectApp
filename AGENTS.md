# Instruções para agentes (Codex, GitHub Copilot)

**Antes de qualquer ação, leia [`LEIA-PRIMEIRO-CODEX.txt`](LEIA-PRIMEIRO-CODEX.txt) inteiro.** Ele
explica como o Coillect funciona de ponta a ponta (sensor → API → fila → apps), como rodar tudo
localmente, testar, apresentar em aula e fazer os deploys (Azure, Atividade A02).

Regras resumidas (detalhes na seção 0 do arquivo acima):

- O objetivo é ensinar o Allan a operar o projeto, um passo por vez, conferindo cada resultado.
- Não altere código sem pedido explícito. Quando houver pedido: uma branch e um Pull Request por
  tarefa, com o CI (GitHub Actions) verde antes do merge.
- Nunca peça segredos no chat (senhas, connection strings, chaves de acesso).
- Escopo de MVP universitário: segurança e otimização ficam fora do escopo por decisão do autor.
