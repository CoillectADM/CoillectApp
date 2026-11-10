#!/usr/bin/env python3
"""Transforma falhas dos logs do CI em anotações ::error (visíveis no resumo do PR)."""
import pathlib
import re
import sys

ANSI = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")
PATTERNS = [
    r"error TS\d+",
    r"^\s*●",
    r"\bFAIL\b",
    r"npm (ERR!|error)",
    r"Nest can't resolve",
    r"QueryFailedError",
    r"\bError:",
    r"ERROR \[",
    r"✗",
    r"Expected",
    r"Received",
]
MAX_ANNOTATIONS = 9
MAX_CHARS = 3000


def escape(text: str) -> str:
    return text.replace("%", "%25").replace("\r", "").replace("\n", "%0A")


def snippets(lines):
    """Agrupa as linhas com erro e algumas linhas de contexto."""
    hits = [i for i, line in enumerate(lines) if any(re.search(p, line) for p in PATTERNS)]
    blocks, current = [], None
    for i in hits:
        start, end = max(i - 2, 0), min(i + 14, len(lines))
        if current and start <= current[1]:
            current[1] = max(current[1], end)
        else:
            current = [start, end]
            blocks.append(current)
    return ["\n".join(lines[a:b]) for a, b in blocks]


emitted = 0
for name in sys.argv[1:]:
    path = pathlib.Path(name)
    if not path.exists():
        continue
    lines = [ANSI.sub("", l) for l in path.read_text(errors="replace").splitlines()]
    found = snippets(lines)
    if not found and lines:
        found = ["\n".join(lines[-40:])]
    for block in found[:3]:
        if emitted >= MAX_ANNOTATIONS:
            break
        print(f"::error title={path.name}::{escape(block[:MAX_CHARS])}")
        emitted += 1

tail_source = [pathlib.Path(n) for n in sys.argv[1:] if pathlib.Path(n).exists()]
if tail_source and emitted < 10:
    last = tail_source[-1]
    tail = [ANSI.sub("", l) for l in last.read_text(errors="replace").splitlines()[-60:]]
    print(f"::error title=tail {last.name}::{escape(chr(10).join(tail)[-MAX_CHARS:])}")
