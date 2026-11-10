"""Verifica a pasta documentação/: links internos, âncoras e blocos Mermaid.

Uso: python3 .github/scripts/verificar_documentacao.py [--mermaid-dir DIR]

- Links relativos (para arquivos do repositório) precisam apontar para um arquivo
  ou pasta que existe.
- Âncoras (#secao) precisam existir no documento de destino, no formato do GitHub.
- Com --mermaid-dir, cada bloco ```mermaid é salvo como <arquivo>-<n>.mmd para o
  mermaid-cli validar no CI.
Erros saem como anotações do GitHub Actions (::error file=...,line=...::).
"""
import argparse
import os
import re
import sys
import unicodedata

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PASTA = unicodedata.normalize('NFC', 'documentação')

LINK = re.compile(r'(?<!!)\[(?:[^\[\]]|\[[^\]]*\])*\]\(([^)\s]+)(?:\s+"[^"]*")?\)')
CODIGO_INLINE = re.compile(r'`+[^`]*`+')


def slug(titulo):
    """Âncora no formato do GitHub (github-slugger)."""
    texto = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', titulo)
    texto = texto.replace('`', '').replace('**', '').replace('*', '')
    texto = texto.strip().lower()
    mantidos = []
    for ch in texto:
        cat = unicodedata.category(ch)
        if ch in ' -' or cat[0] in 'LMN' or cat == 'Pc':
            mantidos.append(ch)
    return ''.join(mantidos).replace(' ', '-')


def linhas_fora_de_codigo(texto):
    """(número da linha, linha) fora de blocos ``` ; e os blocos mermaid."""
    fora, mermaid = [], []
    bloco, linguagem, inicio, conteudo = False, '', 0, []
    for n, linha in enumerate(texto.splitlines(), 1):
        cerca = re.match(r'^\s*(```+|~~~+)\s*([\w-]*)', linha)
        if cerca and not bloco:
            bloco, linguagem, inicio, conteudo = True, cerca.group(2).lower(), n, []
            continue
        if cerca and bloco:
            if linguagem == 'mermaid':
                mermaid.append((inicio, '\n'.join(conteudo) + '\n'))
            bloco = False
            continue
        if bloco:
            conteudo.append(linha)
        else:
            fora.append((n, linha))
    return fora, mermaid


def ancoras(caminho, cache={}):
    if caminho not in cache:
        with open(caminho, encoding='utf-8') as fh:
            fora, _ = linhas_fora_de_codigo(fh.read())
        vistos, resultado = {}, set()
        for _, linha in fora:
            m = re.match(r'^(#{1,6})\s+(.*?)\s*#*\s*$', linha)
            if not m:
                continue
            base = slug(m.group(2))
            n = vistos.get(base, 0)
            resultado.add(base if n == 0 else '%s-%d' % (base, n))
            vistos[base] = n + 1
        cache[caminho] = resultado
    return cache[caminho]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--mermaid-dir')
    opcoes = parser.parse_args()

    pasta = os.path.join(RAIZ, PASTA)
    if not os.path.isdir(pasta):
        print('::error::pasta %s não encontrada' % PASTA)
        return 1
    erros, links, diagramas = 0, 0, 0
    if opcoes.mermaid_dir:
        os.makedirs(opcoes.mermaid_dir, exist_ok=True)

    for nome in sorted(os.listdir(pasta)):
        if not nome.endswith('.md'):
            continue
        caminho = os.path.join(pasta, nome)
        rel = os.path.relpath(caminho, RAIZ)
        with open(caminho, encoding='utf-8') as fh:
            texto = fh.read()
        if unicodedata.normalize('NFC', texto) != texto:
            print('::warning file=%s::texto fora da normalização NFC' % rel)
        fora, mermaid = linhas_fora_de_codigo(texto)

        for numero, linha in fora:
            for alvo in LINK.findall(CODIGO_INLINE.sub('', linha)):
                if re.match(r'^[a-z][a-z0-9+.-]*:', alvo, re.I):
                    continue
                links += 1
                arquivo, _, ancora = alvo.partition('#')
                destino = caminho if not arquivo else os.path.normpath(
                    os.path.join(os.path.dirname(caminho), unicodedata.normalize('NFC', arquivo)))
                if not os.path.exists(destino):
                    print('::error file=%s,line=%d::link para arquivo inexistente: %s' % (rel, numero, alvo))
                    erros += 1
                    continue
                if not os.path.realpath(destino).startswith(RAIZ):
                    print('::error file=%s,line=%d::link para fora do repositório: %s' % (rel, numero, alvo))
                    erros += 1
                    continue
                if ancora and destino.endswith('.md') and ancora not in ancoras(destino):
                    print('::error file=%s,line=%d::âncora inexistente: %s' % (rel, numero, alvo))
                    erros += 1

        for i, (inicio, codigo) in enumerate(mermaid, 1):
            diagramas += 1
            if opcoes.mermaid_dir:
                base = '%s-%02d' % (nome[:-3], i)
                with open(os.path.join(opcoes.mermaid_dir, base + '.mmd'), 'w', encoding='utf-8') as fh:
                    fh.write(codigo)
                with open(os.path.join(opcoes.mermaid_dir, base + '.origem'), 'w', encoding='utf-8') as fh:
                    fh.write('%s:%d\n' % (rel, inicio))

    print('%d links internos conferidos, %d diagramas Mermaid encontrados, %d erro(s).' % (links, diagramas, erros))
    return 1 if erros else 0


if __name__ == '__main__':
    sys.exit(main())
