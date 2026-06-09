#!/usr/bin/env python3
"""
Extrae título oficial, número de gaceta y fecha de sanción desde cada PDF en
apps/web/public/Fwd_/, y los sube al panel admin como gacetas.

Uso:
    python3 scripts/upload-gazettes.py                     # dry-run (solo muestra extracción)
    python3 scripts/upload-gazettes.py --upload            # sube de verdad
    python3 scripts/upload-gazettes.py --upload --reset    # borra TODAS las gacetas existentes y vuelve a subir

Requisitos: pdftotext en PATH (poppler), python3 ≥ 3.8.

Variables opcionales:
    API_URL    Worker (default: prod alcaldía)
    EMAIL      admin (default: admin@demo.cmp.test)
    PASSWORD   clave (default: admin)
    FOLDER     carpeta con PDFs (default: apps/web/public/Fwd_)
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path

API_URL = os.environ.get("API_URL", "https://cmp-api.informatica-cmbp.workers.dev")
EMAIL = os.environ.get("EMAIL", "admin@demo.cmp.test")
PASSWORD = os.environ.get("PASSWORD", "admin")
FOLDER = Path(os.environ.get("FOLDER", "apps/web/public/Fwd_"))
# Cloudflare bloquea el User-Agent por defecto de Python. Usamos uno realista.
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"


def pdf_text(path: Path, max_pages: int = 30) -> str:
    """Saca texto de las primeras páginas (con layout) y normaliza espacios."""
    try:
        result = subprocess.run(
            ["pdftotext", "-layout", "-l", str(max_pages), str(path), "-"],
            capture_output=True, text=True, check=True, timeout=30,
        )
        # Colapsar saltos de línea y espacios múltiples para regex más fáciles.
        return re.sub(r"\s+", " ", result.stdout)
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as e:
        print(f"  ⚠ pdftotext falló: {e}", file=sys.stderr)
        return ""


GAZETTE_RE = re.compile(
    r"GACETA\s+MUNICIPAL\s+(?:ORDINARIA|EXTRAORDINARIA)\s*N[ºo°]?\s*([\d.]+)",
    re.IGNORECASE,
)
TITLE_RE = re.compile(
    # contentiva de "TÍTULO …" hasta el siguiente "contentiva de" o "sancionada"
    r"contentiva\s+de\s+(.*?)(?:\s*,?\s*contentiva\s+de|\s+sancionad)",
    re.IGNORECASE | re.DOTALL,
)
# Cabecera tipo "REFORMA … PALAVECINO" o "ORDENANZA … PALAVECINO" antes de un quiebre claro de bloque
HEADER_TITLE_RE = re.compile(
    r"((?:REFORMA|ORDENANZA)[^.]{15,400}?(?:PALAVECINO|LARA))"
    r"\s*(?:\.|EXPOSICI[OÓ]N\s+DE\s+MOTIVOS|Art[ií]culo\s*\d)",
    re.IGNORECASE,
)
# Texto que indica que NO es un título sino contenido del cuerpo
NOT_A_TITLE_RE = re.compile(
    r"\b(?:se\s+entiende|el\s+cual|en\s+uso\s+de|considerando|por\s+cuanto|n[uú]mero\s+\d)\b",
    re.IGNORECASE,
)
DATE_RE = re.compile(r"sancionad[ao]\s+el\s+(\d{2}/\d{2}/\d{4})", re.IGNORECASE)
FECHA_INLINE_RE = re.compile(r"FECHA:\s*(\d{2}/\d{2}/\d{4})", re.IGNORECASE)
# Fecha escrita en palabras: "a los dieciocho (18) días del mes de diciembre del dos mil veinticinco (2.025)"
TEXTUAL_DATE_RE = re.compile(
    r"\(\s*(\d{1,2})\s*\)\s+d[ií]as\s+del\s+mes\s+de\s+(\w+)\s+del\s+dos\s+mil[^(]{0,40}\(\s*2\.?\s*(\d{3})\s*\)",
    re.IGNORECASE,
)
# Plan B: pura fecha textual ej. "diciembre del 2025" como último recurso
SIMPLE_TEXTUAL_DATE_RE = re.compile(
    r"\b(\d{1,2})\s+de\s+(\w+)\s+del?\s+(?:año\s+)?(?:dos\s+mil\s+\w+\s*\(?\s*)?2\.?(\d{3})",
    re.IGNORECASE,
)
MESES = {
    "enero": "01", "febrero": "02", "marzo": "03", "abril": "04",
    "mayo": "05", "junio": "06", "julio": "07", "agosto": "08",
    "septiembre": "09", "setiembre": "09", "octubre": "10",
    "noviembre": "11", "diciembre": "12",
}
# Número de gaceta más relajado: cualquier "Gaceta Municipal (Ordinaria|Extraordinaria) Nº XXX"
# (solo se usa como fallback porque puede capturar referencias cruzadas)
GAZETTE_LOOSE_RE = re.compile(
    r"Gaceta\s+Municipal\s+(?:Ordinaria|Extraordinaria)?\s*N[ºo°]?\s*([\d.]{3,})",
    re.IGNORECASE,
)


def parse_dmy(s: str) -> str:
    """DD/MM/YYYY → YYYY-MM-DD."""
    d, m, y = s.split("/")
    return f"{y}-{m.zfill(2)}-{d.zfill(2)}"


def parse_textual_date(text: str) -> str | None:
    """Extrae fecha de sanción escrita en palabras (formato venezolano oficial).

    Solo usamos el patrón formal "(NN) días del mes de MES del dos mil PALABRA"
    cuando aparece después de la palabra 'Sancionad' (la frase oficial de sanción).
    Otros patrones más laxos generan falsos positivos al capturar referencias a
    gacetas antiguas.
    """
    # Buscar todas las ocurrencias y preferir la primera que esté tras "Sancionad"
    for m in TEXTUAL_DATE_RE.finditer(text):
        ctx = text[max(0, m.start() - 200) : m.start()].lower()
        if "sancionad" in ctx:
            d, month_name, y_suffix = m.group(1), m.group(2).lower(), m.group(3)
            mm = MESES.get(month_name)
            if mm:
                return f"2{y_suffix}-{mm}-{d.zfill(2)}"
    # Sin contexto "Sancionad", solo aceptar si hay UNA sola ocurrencia (poco ambiguo)
    matches = list(TEXTUAL_DATE_RE.finditer(text))
    if len(matches) == 1:
        m = matches[0]
        d, month_name, y_suffix = m.group(1), m.group(2).lower(), m.group(3)
        mm = MESES.get(month_name)
        if mm:
            return f"2{y_suffix}-{mm}-{d.zfill(2)}"
    return None


def clean_title(raw: str) -> str:
    t = re.sub(r"\s+", " ", raw).strip()
    # Quitar prefijos basura tipo "ordenanza: ORDENANZA …" (requiere separador : o , para no comer "Reforma ordenanza …")
    t = re.sub(r"^(?:ordenanza|reforma)\s*[:,]\s+(?=(?:ordenanza|reforma)\b)", "", t, flags=re.IGNORECASE)
    # Cortar después del primer punto si es muy largo
    if len(t) > 200:
        t = t[:200].rstrip() + "…"
    # Convertir ALL CAPS a Title Case respetando acrónimos cortos
    if t.isupper() or sum(1 for c in t if c.isupper()) / max(1, len(t)) > 0.6:
        small = {"de", "del", "la", "el", "los", "las", "y", "o", "u", "a",
                 "en", "para", "por", "con", "al", "su", "sus", "lo"}
        words = t.lower().split()
        out = []
        for i, w in enumerate(words):
            if i > 0 and w in small:
                out.append(w)
            elif len(w) <= 2 and w.isalpha():
                out.append(w.capitalize())
            else:
                out.append(w[0].upper() + w[1:] if w else w)
        t = " ".join(out)
    # Quitar puntos finales y comas residuales
    return t.rstrip(".,;: ")


def extract_metadata(pdf: Path) -> dict:
    text = pdf_text(pdf)
    meta = {
        "file": pdf.name,
        "title": clean_title(pdf.stem),  # fallback al nombre del archivo
        "issue_number": "",
        "published_at": date.today().isoformat(),
        "source": "filename",
    }
    if not text:
        return meta

    g = GAZETTE_RE.search(text)
    if g:
        meta["issue_number"] = g.group(1).strip()
    # Nota: no usamos fallback laxo porque los PDFs contienen referencias cruzadas a otras
    # gacetas (instalación de concejales, juramentación del alcalde, etc.) que no son la
    # gaceta donde se publica la ordenanza actual. Si el patrón formal "contentiva de"
    # no aparece, se deja vacío para que se edite manualmente desde el panel admin.

    # Primero intentar el patrón formal (gaceta con "contentiva de")
    t = TITLE_RE.search(text)
    if t:
        candidate = clean_title(t.group(1))
        # Si el candidato no empieza con "Ordenanza"/"Reforma", probablemente capturó basura
        if re.match(r"^(Ordenanza|Reforma)", candidate, re.IGNORECASE):
            meta["title"] = candidate
            meta["source"] = "pdf"

    # Si no se encontró un título válido, buscar la primera cabecera tipo "ORDENANZA/REFORMA … PALAVECINO"
    # que no parezca texto del cuerpo del documento
    if meta["source"] == "filename":
        for h in HEADER_TITLE_RE.finditer(text):
            candidate_raw = h.group(1).strip()
            if NOT_A_TITLE_RE.search(candidate_raw):
                continue
            meta["title"] = clean_title(candidate_raw)
            meta["source"] = "pdf-header"
            break

    # Fechas: primero DD/MM/YYYY formal, luego fecha escrita en palabras
    d = DATE_RE.search(text) or FECHA_INLINE_RE.search(text)
    if d:
        meta["published_at"] = parse_dmy(d.group(1))
    else:
        td = parse_textual_date(text)
        if td:
            meta["published_at"] = td

    return meta


def reset_all(token: str) -> int:
    """Borra todas las gacetas existentes. Devuelve cuántas borró."""
    req = urllib.request.Request(
        f"{API_URL}/api/admin/gazettes",
        headers={
            "Authorization": f"Bearer {token}",
            "User-Agent": UA,
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read())
    items = data.get("items", [])
    deleted = 0
    for it in items:
        gid = it.get("id")
        if gid is None:
            continue
        del_req = urllib.request.Request(
            f"{API_URL}/api/admin/gazettes/{gid}",
            method="DELETE",
            headers={
                "Authorization": f"Bearer {token}",
                "User-Agent": UA,
                "Accept": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(del_req, timeout=30) as dr:
                if dr.status == 200:
                    deleted += 1
        except urllib.error.HTTPError as e:
            print(f"  ⚠ No se pudo borrar id={gid}: HTTP {e.code}", file=sys.stderr)
    return deleted


def login() -> str:
    body = json.dumps({"email": EMAIL, "password": PASSWORD}).encode()
    req = urllib.request.Request(
        f"{API_URL}/api/auth/login",
        data=body,
        headers={
            "Content-Type": "application/json",
            "User-Agent": UA,
            "Accept": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        data = json.loads(r.read())
    token = data.get("token")
    if not token:
        raise RuntimeError(f"Login sin token: {data}")
    return token


def upload(pdf: Path, meta: dict, token: str) -> tuple[int, str]:
    """Sube un PDF como multipart/form-data manualmente (stdlib only)."""
    boundary = "----CMPGazetteBoundary" + os.urandom(8).hex()
    crlf = b"\r\n"
    parts: list[bytes] = []

    def field(name: str, value: str):
        parts.extend([
            f"--{boundary}".encode(), crlf,
            f'Content-Disposition: form-data; name="{name}"'.encode(), crlf, crlf,
            value.encode("utf-8"), crlf,
        ])

    field("title", meta["title"])
    if meta["issue_number"]:
        field("issue_number", meta["issue_number"])
    field("published_at", meta["published_at"])

    with open(pdf, "rb") as fh:
        file_bytes = fh.read()

    parts.extend([
        f"--{boundary}".encode(), crlf,
        f'Content-Disposition: form-data; name="file"; filename="{pdf.name}"'.encode(), crlf,
        b"Content-Type: application/pdf", crlf, crlf,
        file_bytes, crlf,
        f"--{boundary}--".encode(), crlf,
    ])
    body = b"".join(parts)

    req = urllib.request.Request(
        f"{API_URL}/api/admin/gazettes",
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "User-Agent": UA,
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def main() -> int:
    if not FOLDER.is_dir():
        print(f"❌ Carpeta no encontrada: {FOLDER}", file=sys.stderr)
        return 1

    do_upload = "--upload" in sys.argv
    pdfs = sorted(FOLDER.glob("*.pdf")) + sorted(FOLDER.glob("*.PDF"))
    if not pdfs:
        print(f"⚠ No hay PDFs en {FOLDER}")
        return 1

    print(f"▶ Procesando {len(pdfs)} PDFs…\n")
    metas = []
    icons = {"pdf": "📄", "pdf-header": "📑", "filename": "📁"}
    for pdf in pdfs:
        meta = extract_metadata(pdf)
        metas.append((pdf, meta))
        tag = icons.get(meta["source"], "📁")
        print(f"{tag} {pdf.name}")
        print(f"   Título  : {meta['title']}")
        print(f"   Gaceta  : {meta['issue_number'] or '(sin nº)'}")
        print(f"   Fecha   : {meta['published_at']}")
        print()

    if not do_upload:
        print("══════════════════════════════════")
        print("Dry-run. Para subir de verdad:")
        print("  python3 scripts/upload-gazettes.py --upload")
        print("══════════════════════════════════")
        return 0

    print(f"▶ Login en {API_URL}…")
    try:
        token = login()
    except Exception as e:
        print(f"❌ Login falló: {e}", file=sys.stderr)
        return 1
    print("✅ Token obtenido.\n")

    if "--reset" in sys.argv:
        print("▶ Borrando todas las gacetas existentes…")
        try:
            n = reset_all(token)
            print(f"✅ {n} gacetas eliminadas.\n")
        except Exception as e:
            print(f"❌ Reset falló: {e}", file=sys.stderr)
            return 1

    ok = fail = 0
    for pdf, meta in metas:
        print(f"→ Subiendo: {pdf.name}")
        status, resp = upload(pdf, meta, token)
        if status == 200:
            print("   ✅ OK")
            ok += 1
        else:
            print(f"   ❌ HTTP {status} — {resp[:200]}")
            fail += 1

    print("\n══════════════════════════════════")
    print(f"✅ Subidas correctas: {ok}")
    print(f"❌ Fallidas:          {fail}")
    print("══════════════════════════════════")
    return 0 if fail == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
