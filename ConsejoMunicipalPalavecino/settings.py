"""
Django settings for ConsejoMunicipalPalavecino project.

Compatible with Python 3.12.3+ and Django 6.0.x (Django 6.0 requiere Python 3.12+).

Docs:
https://docs.djangoproject.com/en/6.0/topics/settings/
https://docs.djangoproject.com/en/6.0/ref/settings/
"""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# override=True: el .env sustituye variables ya definidas (systemd, Environment=, shell).
# Sin eso, un DJANGO_DEBUG=False en el servicio ignora lo que pongas en .env.
load_dotenv(BASE_DIR / ".env", override=True)


def _strip_optional_quotes(value: str) -> str:
    s = value.strip()
    if len(s) >= 2 and s[0] == s[-1] and s[0] in "\"'":
        return s[1:-1].strip()
    return s


def _env_str(key: str, default: str = "") -> str:
    raw = os.environ.get(key, default)
    if raw is None:
        return default
    return _strip_optional_quotes(str(raw))


def _env_bool(key: str, *, default: bool) -> bool:
    raw = os.environ.get(key)
    if raw is None or not str(raw).strip():
        return default
    s = _strip_optional_quotes(str(raw)).lower()
    return s in ("1", "true", "yes", "on")


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
_default_secret = (
    "django-insecure-k@pj!4#dw_$2v^2ir$i_c*#q-2gw$beo7*2f$9#$q*dbfm(b@c"
)
SECRET_KEY = _env_str("DJANGO_SECRET_KEY") or _default_secret

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = _env_bool("DJANGO_DEBUG", default=True)

_allowed_hosts_raw = _env_str("DJANGO_ALLOWED_HOSTS")
if _allowed_hosts_raw:
    ALLOWED_HOSTS = [
        h.strip() for h in _allowed_hosts_raw.split(",") if h.strip()
    ]
else:
    ALLOWED_HOSTS = []

if DEBUG:
    # Documentación Django: con DEBUG=True, ['*'] evita 400 al entrar por IP, otro hostname
    # o dominio no listado en DJANGO_ALLOWED_HOSTS (típico detrás de nginx). No uses DEBUG
    # en un entorno real expuesto a internet.
    ALLOWED_HOSTS = ["*"]

# Tras nginx/apache como proxy: que Host se tome de X-Forwarded-Host (solo si confías en el proxy).
USE_X_FORWARDED_HOST = _env_bool("DJANGO_USE_X_FORWARDED_HOST", default=False)

# HTTPS en producción (certificado y proxy ya configurados; nginx debe enviar X-Forwarded-Proto).
# No activar en local HTTP: rompería cookies CSRF/session y redirecciones. Usa DJANGO_SECURE_SSL=True en .env.
if _env_bool("DJANGO_SECURE_SSL", default=False):
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

# --- Logging (servidor): niveles por categoría vía .env (ver LINEAMIENTOS §15 y .env.example)
_LOG_LEVEL_NAMES = frozenset(
    {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
)


def _log_level_name(key: str, *, default: str) -> str:
    s = _env_str(key, "").strip().upper()
    if not s:
        return default
    return s if s in _LOG_LEVEL_NAMES else default


_root_default = "DEBUG" if DEBUG else "INFO"
LOG_ROOT_LEVEL = _log_level_name("DJANGO_LOG_ROOT_LEVEL", default=_root_default)
LOG_DJANGO_LEVEL = _log_level_name(
    "DJANGO_LOG_DJANGO_LEVEL",
    default="INFO" if DEBUG else "WARNING",
)
LOG_SQL = _env_bool("DJANGO_LOG_SQL", default=False)
LOG_REQUEST = _env_bool("DJANGO_LOG_REQUEST", default=False)
LOG_SERVER = _env_bool("DJANGO_LOG_SERVER", default=DEBUG)
LOG_SECURITY = _env_bool("DJANGO_LOG_SECURITY", default=False)
LOG_CORE = _env_bool("DJANGO_LOG_CORE", default=False)

BROWSER_CONSOLE_LOG_ENABLED = _env_bool("DJANGO_BROWSER_CONSOLE_LOG", default=False)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {
            "format": "{levelname} {asctime} {name} {message}",
            "style": "{",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "standard",
            "level": logging.DEBUG,
        },
    },
    "root": {
        "handlers": ["console"],
        "level": LOG_ROOT_LEVEL,
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": LOG_DJANGO_LEVEL,
            "propagate": False,
        },
        "django.request": {
            "handlers": ["console"],
            "level": "DEBUG" if LOG_REQUEST else "ERROR",
            "propagate": False,
        },
        "django.server": {
            "handlers": ["console"],
            "level": "INFO" if LOG_SERVER else "WARNING",
            "propagate": False,
        },
        "django.db.backends": {
            "handlers": ["console"],
            "level": "DEBUG" if LOG_SQL else "WARNING",
            "propagate": False,
        },
        "django.security": {
            "handlers": ["console"],
            "level": "DEBUG" if LOG_SECURITY else "WARNING",
            "propagate": False,
        },
        "core": {
            "handlers": ["console"],
            "level": "DEBUG" if LOG_CORE else "INFO",
            "propagate": False,
        },
    },
}

# https://docs.djangoproject.com/en/6.0/ref/settings/#default-auto-field
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'core',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'ConsejoMunicipalPalavecino.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.template.context_processors.i18n',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'core.context_processors.browser_logging',
            ],
        },
    },
]

WSGI_APPLICATION = 'ConsejoMunicipalPalavecino.wsgi.application'


# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = 'es'

LANGUAGES = [
    ('es', 'Español'),
    ('en', 'English'),
]

LOCALE_PATHS = [
    BASE_DIR / 'locale',
]

TIME_ZONE = 'America/Caracas'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = 'static/'

STATICFILES_DIRS = [
    BASE_DIR / 'static',
]

# Where collectstatic copies files for production (WhiteNoise / nginx)
STATIC_ROOT = BASE_DIR / 'staticfiles'

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# In development, serve from STATICFILES_DIRS without collectstatic; in production use STATIC_ROOT only.
WHITENOISE_USE_FINDERS = DEBUG
