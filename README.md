# Consejo Municipal Palavecino

Aplicación web del **Consejo Municipal de Palavecino** (Venezuela), desarrollada con **Django**. El proyecto está **iniciado**; las reglas de trabajo, stack e idiomas están fijadas en [`LINEAMIENTOS.md`](LINEAMIENTOS.md).

## Stack

| Área | Elección |
|------|----------|
| Backend | **Django 4.2 LTS** |
| Python | **3.8+** (incluye **3.8.10** en servidor; alinear dev/CI/producción) |
| Interfaz | Español por defecto; **es** y **en** como idiomas del sitio |
| CSS | **Tailwind CSS** (único framework CSS; ver lineamientos) |
| Iconos | **Heroicons** (npm `heroicons`, alineado con Tailwind); alternativa: Bootstrap Icons |
| Base de datos (dev) | SQLite (`db.sqlite3`, no versionada) |

## Requisitos

### Python

Versión mínima soportada: **Python 3.8**. El proyecto se despliega y prueba con **3.8.10** en servidor; en desarrollo puedes usar 3.10–3.13 si lo prefieres, pero **evita** sintaxis exclusiva de Python 3.10+ (`str | None`, `match/case`, etc.) salvo compatibilidad verificada.

Comprueba:

```bash
python3 --version   # debe ser >= 3.8
```

### Otros

- Entorno virtual: `python3 -m venv venv` (o `python3.8 -m venv venv`)
- Dependencias: `pip install -r requirements.txt` (recomendado: `pip install --upgrade pip` antes)
- **Node.js** (solo para compilar CSS de Tailwind en desarrollo o en el pipeline de despliegue)

## Instalación local

```bash
git clone https://github.com/BlacKSherU/consejo-municipal-palavecino.git
cd consejo-municipal-palavecino
python3 -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt
copy .env.example .env
# Linux: cp .env.example .env
# Editar .env cuando integres variables (secret key, hosts, etc.)

npm install
npm run build
```

Si venías de una copia del repo con **Django 6** y fallan migraciones o la base local, en desarrollo puedes borrar `db.sqlite3` y volver a ejecutar `python manage.py migrate`.

Esto genera [`static/css/app.css`](static/css/app.css). Si cambias plantillas o clases Tailwind, vuelve a ejecutar `npm run build` (o `npm run watch:css` mientras desarrollas).

### Traducciones (gettext)

Los textos de la interfaz están en `locale/<idioma>/LC_MESSAGES/django.po`. Tras editar cadenas en plantillas:

1. Si tienes **GNU gettext** instalado: `python manage.py makemessages -l es -l en` y luego `compilemessages`.
2. En entornos sin `msgfmt`: usa **Babel** (incluido en `requirements.txt`):

```bash
pybabel compile -d locale -D django
```

Vuelve a compilar cuando cambies los `.po`.

```bash
python manage.py migrate
python manage.py runserver
```

- **Inicio / landing:** [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Admin:** [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/) (crear superusuario con `createsuperuser`).

## Documentación del equipo

- **[LINEAMIENTOS.md](LINEAMIENTOS.md)** — convenciones obligatorias: código en inglés, UI en es/en, Tailwind, seguridad, pruebas, i18n, rendimiento, accesibilidad y criterios de “hecho” antes de integrar.

## Licencia

_Pendiente si aplica._
