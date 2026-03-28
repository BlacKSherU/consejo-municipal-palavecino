"""
Django settings for ConsejoMunicipalPalavecino project.

Compatible with Python 3.8+ and Django 4.2 LTS.

Docs:
https://docs.djangoproject.com/en/4.2/topics/settings/
https://docs.djangoproject.com/en/4.2/ref/settings/
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Carga .env en el proceso (Django no lo hace solo). Las variables siguen siendo os.environ.
load_dotenv(BASE_DIR / ".env")


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/4.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "django-insecure-k@pj!4#dw_$2v^2ir$i_c*#q-2gw$beo7*2f$9#$q*dbfm(b@c",
)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = (
    os.environ.get("DJANGO_DEBUG", "True").strip().lower() in ("1", "true", "yes")
)

_allowed_hosts_raw = os.environ.get("DJANGO_ALLOWED_HOSTS", "")
if _allowed_hosts_raw.strip():
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
USE_X_FORWARDED_HOST = os.environ.get(
    "DJANGO_USE_X_FORWARDED_HOST", ""
).strip().lower() in ("1", "true", "yes")

# https://docs.djangoproject.com/en/4.2/ref/settings/#default-auto-field
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
            ],
        },
    },
]

WSGI_APPLICATION = 'ConsejoMunicipalPalavecino.wsgi.application'


# Database
# https://docs.djangoproject.com/en/4.2/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# Password validation
# https://docs.djangoproject.com/en/4.2/ref/settings/#auth-password-validators

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
# https://docs.djangoproject.com/en/4.2/topics/i18n/

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
# https://docs.djangoproject.com/en/4.2/howto/static-files/

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
