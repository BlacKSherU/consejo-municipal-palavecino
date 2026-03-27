# Consejo Municipal Palavecino

Aplicación web del **Consejo Municipal de Palavecino** (Venezuela), desarrollada con **Django**. El proyecto está **iniciado**; las reglas de trabajo, stack e idiomas están fijadas en [`LINEAMIENTOS.md`](LINEAMIENTOS.md).

## Stack

| Área | Elección |
|------|----------|
| Backend | Django 6.x |
| Python | 3.13+ (alinear con producción/CI) |
| Interfaz | Español por defecto; **es** y **en** como idiomas del sitio |
| CSS | **Tailwind CSS** (único framework CSS; ver lineamientos) |
| Iconos | **Heroicons** (npm `heroicons`, alineado con Tailwind); alternativa: Bootstrap Icons |
| Base de datos (dev) | SQLite (`db.sqlite3`, no versionada) |

## Requisitos

- Python **3.13** o la versión indicada en el entorno de despliegue
- Entorno virtual (`python -m venv venv`)
- Dependencias Python: `pip install -r requirements.txt`
- **Node.js** (solo para compilar CSS de Tailwind en desarrollo)

## Instalación local

```bash
git clone https://github.com/BlacKSherU/consejo-municipal-palavecino.git
cd consejo-municipal-palavecino
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
copy .env.example .env
# Editar .env cuando integres variables (secret key, hosts, etc.)

npm install
npm run build
```

Esto genera [`static/css/app.css`](static/css/app.css). Si cambias plantillas o clases Tailwind, vuelve a ejecutar `npm run build` (o `npm run watch:css` mientras desarrollas).

### Traducciones (gettext)

Los textos de la interfaz están en `locale/<idioma>/LC_MESSAGES/django.po`. Tras editar cadenas en plantillas:

1. Si tienes **GNU gettext** instalado: `python manage.py makemessages -l es -l en` y luego `compilemessages`.
2. En **Windows** sin gettext: instala dependencias y compila con Babel (ya incluido en `requirements.txt`):

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
