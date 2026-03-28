# Consejo Municipal Palavecino

Aplicación web del **Consejo Municipal de Palavecino** (Venezuela), desarrollada con **Django**. El proyecto está **iniciado**; las reglas de trabajo, stack e idiomas están fijadas en [`LINEAMIENTOS.md`](LINEAMIENTOS.md).

## Stack

| Área | Elección |
|------|----------|
| Backend | **Django 6.0** |
| Python | **3.12.3+** (referencia: **3.12.3**; alinear dev/CI/producción) |
| Interfaz | Español por defecto; **es** y **en** como idiomas del sitio |
| CSS | **Tailwind CSS** (único framework CSS; ver lineamientos) |
| Iconos | **Heroicons** (npm `heroicons`, alineado con Tailwind); alternativa: Bootstrap Icons |
| Base de datos (dev) | SQLite (`db.sqlite3`, no versionada) |

## Requisitos

### Python

Versión mínima soportada: **Python 3.12** (Django 6.0 no admite 3.10 ni 3.11). Se recomienda **Python 3.12.3** como versión de referencia en todos los entornos. Con [pyenv](https://github.com/pyenv/pyenv) o similar, el archivo [`.python-version`](.python-version) fija `3.12.3`.

Comprueba:

```bash
python3 --version   # debe ser >= 3.12 (idealmente 3.12.3)
```

### Otros

- Entorno virtual: `python3.12 -m venv venv` (o `python3 -m venv venv` si `python3` es 3.12+)
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

Tras actualizar Django de una versión mayor anterior, si fallan migraciones o la base local de desarrollo, puedes borrar `db.sqlite3` y volver a ejecutar `python manage.py migrate`.

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

## Gunicorn (producción)

El módulo WSGI es el del **proyecto** `ConsejoMunicipalPalavecino`, no la app `core`:

```bash
gunicorn ConsejoMunicipalPalavecino.wsgi:application --bind 127.0.0.1:8000
```

### CSS y estáticos (si no ves estilos)

Con **`DEBUG=False`** Django **no** sirve `static/` solo. Este proyecto usa **WhiteNoise** y `collectstatic`.

1. Variables de entorno: el proyecto carga `.env` al arrancar (vía `python-dotenv` en `settings.py`). También puedes exportar variables en systemd/shell.

   - `DJANGO_DEBUG=False`
   - `DJANGO_ALLOWED_HOSTS=tudominio.com,www.tudominio.com` (obligatorio si `DEBUG` es falso)
   - `DJANGO_SECRET_KEY=` (cadena larga y secreta; no uses la de desarrollo)
   - Si usas **nginx** delante y ves 400 con `DEBUG=False`, prueba `DJANGO_USE_X_FORWARDED_HOST=True` (solo si confías en ese proxy).
   - Con **HTTPS** terminado en nginx (certificado listo), pon `DJANGO_SECURE_SSL=True` para cookies seguras, redirección HTTP→HTTPS y `SECURE_PROXY_SSL_HEADER` (nginx debe enviar `X-Forwarded-Proto https`).

   Con **`DJANGO_DEBUG=True`**, el proyecto usa `ALLOWED_HOSTS=['*']` para que no fallen peticiones por IP u otro host no listado (solo para depuración; no lo dejes así en internet).

   El **puerto** no se configura en `settings.py`: va en `gunicorn --bind` o en `runserver host:puerto` (ver ejemplo de Gunicorn más arriba).

2. En el servidor, tras cada despliegue o cambio en `static/`:

   ```bash
   cd ~/consejo-municipal-palavecino
   source venv/bin/activate
   pip install -r requirements.txt
   python manage.py collectstatic --noinput
   ```

3. Reinicia Gunicorn (o el servicio que uses).

En local, con `DEBUG=True`, no hace falta `collectstatic` para ver los estilos (WhiteNoise usa los finders de desarrollo).

### Logging (servidor y consola del navegador)

Las variables `DJANGO_LOG_*` y `DJANGO_BROWSER_CONSOLE_LOG` en `.env` activan o silencian categorías concretas (SQL, peticiones, app `core`, etc.). Detalle y convenciones en [LINEAMIENTOS.md §15.1](LINEAMIENTOS.md#151-logging-del-servidor-y-consola-del-navegador-interruptores-por-entorno).

## Licencia

_Pendiente si aplica._
