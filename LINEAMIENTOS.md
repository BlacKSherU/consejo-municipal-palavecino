# Lineamientos de desarrollo — Consejo Municipal Palavecino

Este documento define convenciones y buenas prácticas que el equipo debe seguir de forma consistente en todo el código del proyecto Django. Está alineado con la documentación oficial de Django, recomendaciones de la comunidad y criterios de mantenibilidad, seguridad e internacionalización.

### Estado del proyecto

**Iniciado (marzo 2026).** Stack base, idiomas (es/en), Tailwind como CSS oficial y convenciones de código están definidos aquí; el desarrollo de apps y funcionalidades continúa sobre esta base. Cualquier cambio relevante a estas reglas debe reflejarse en este archivo y comunicarse al equipo.

---

## 1. Objetivos

- Código **legible**, **predecible** y **fácil de revisar**.
- Separación clara entre **configuración**, **lógica de negocio** y **presentación**.
- Preparación para **traducciones** y **formatos locales** desde el inicio.
- **Estilos y componentes visuales centralizados** para evitar duplicación y divergencias de diseño.
- **Un único framework CSS oficial** ([Tailwind CSS](#5-framework-css-oficial-tailwind-css)) para interfaz moderna y coherente.
- **Código fuente y comentarios en inglés** ([§11](#11-estilo-de-código-e-idioma-del-código-fuente)); la **interfaz de usuario** usa **español por defecto** y admite **inglés y español** como idiomas principales del sitio ([§4](#4-internacionalización-i18n-y-localización-l10n)).
- **Interfaz responsive en todo el proyecto** ([§5](#5-framework-css-oficial-tailwind-css)): diseño adaptable a móviles, tablets y escritorio, sin depender de un ancho fijo.
- **Iconografía** con conjuntos oficiales ([§5](#5-framework-css-oficial-tailwind-css)): Heroicons (preferido) o Bootstrap Icons (alternativa), sin SVG inventados a mano.
- **Compatibilidad de runtime:** **Python 3.8+** (incl. 3.8.10 en producción) y **Django 4.2 LTS** salvo acuerdo de subida de versión ([§14](#14-dependencias-y-entorno-python)).

---

## 2. Estructura del proyecto

- **Una app por dominio funcional** (por ejemplo: `noticias`, `sesiones`, `usuarios`). Evitar un único bloque monolítico sin división.
- **Settings por entorno**: separar `base.py`, `development.py`, `production.py` (o usar variables de entorno sobre un solo `settings` bien documentado). Nunca commitear secretos.
- **URLs**: cada app expone su `urls.py` y se incluye en el `urls.py` principal con **`app_name`** para namespaces (`{% url 'app:vista' %}`).
- **Templates**: carpeta `templates/` por app o, si el proyecto es pequeño, `templates/<app>/` para no mezclar nombres.

---

## 3. Configuración y secretos

- **`SECRET_KEY`**, credenciales de base de datos y API keys solo mediante **variables de entorno** (archivo `.env` local ignorado por Git y **`.env.example`** en el repo con claves sin valores secretos; actualizar el ejemplo cuando cambien variables requeridas).
- En producción: `DEBUG = False`, `ALLOWED_HOSTS` definido, HTTPS detrás de proxy si aplica, y revisión periódica con `python manage.py check --deploy`.

---

## 4. Internacionalización (i18n) y localización (l10n)

### Idiomas del sitio (interfaz de usuario)

- **Idioma por defecto de la interfaz:** **español** (`LANGUAGE_CODE = 'es'`). Es lo que ve un usuario que no ha elegido otro idioma y el idioma de referencia para contenidos públicos salvo que se indique lo contrario.
- **Idiomas principales admitidos:** **español** e **inglés** (`LANGUAGES` solo incluye estos dos, salvo decisión explícita de ampliar). Cualquier pantalla o mensaje visible al usuario debe existir en **ambos** catálogos (`locale/es/` y `locale/en/`) cuando el sitio ofrezca selector de idioma; no dejar un idioma a medias.
- El **código y los comentarios** siguen en **inglés** ([§11](#11-estilo-de-código-e-idioma-del-código-fuente)); las cadenas de interfaz pasan por **gettext** y los archivos `.po`, no se mezcla español o inglés arbitrariamente en el fuente en lugar de traducciones.

### Implementación

- Mantener en el código y en plantillas **textos traducibles** desde el primer día:
  - Python: `from django.utils.translation import gettext_lazy as _`
  - Plantillas: `{% load i18n %}` y `{% trans %}` / `{% blocktrans %}`.
- **Modelos**: `verbose_name` y `verbose_name_plural` con `_("...")` para que admin y formularios sean traducibles.
- **Configuración** (`settings`):
  - `LANGUAGE_CODE = 'es'` (interfaz por defecto en español).
  - `LANGUAGES` con al menos `('es', 'Español')` y `('en', 'English')`.
  - `LocaleMiddleware` en `MIDDLEWARE` (después de `SessionMiddleware`, antes de `CommonMiddleware`) para respetar el idioma activo.
  - `USE_I18N = True`, `USE_TZ = True` (la localización de formatos está activa por defecto en versiones recientes de Django; `TIME_ZONE` explícita, p. ej. `America/Caracas`).
  - `LOCALE_PATHS` apuntando a una carpeta `locale/` en el proyecto para mensajes del proyecto.
  - Opcional recomendable: `django.template.context_processors.i18n` en `TEMPLATES` para exponer `LANGUAGE_CODE` y similares en plantillas.
- Flujo habitual: `makemessages -l es` y `makemessages -l en` (o equivalente) / `compilemessages` cuando se añadan o cambien cadenas; revisar en PR que no queden textos visibles sin marcar para traducción y que **es** y **en** queden alineados.
- **Formato de fechas y números** en plantillas: filtros `date`, `localize` y, cuando haga falta, `{% load l10n %}` para coherencia regional.

---

## 5. Framework CSS oficial: Tailwind CSS

**Todo el front estático del proyecto usa [Tailwind CSS](https://tailwindcss.com/)** como único framework de estilos (no mezclar Bootstrap, Bulma u otros salvo excepción acordada y documentada).

### Por qué Tailwind

- Enfoque **utility-first** alineado con interfaces actuales y mantenimiento por clases composables.
- **Tema centralizado** (`tailwind.config` / `@theme` en v4): colores, tipografía, radios y espaciados de marca en un solo sitio.
- Buena integración con **Django**: una hoja compilada servida con `{% static %}`, sin imponer un stack de componentes JS pesado.
- **Responsive** y estados (`hover:`, `focus:`, `md:`) con convenciones estables y documentación amplia.

### Cómo lo aplicamos

- **Compilación**: el CSS de Tailwind se genera con la herramienta oficial (CLI o integración npm); el artefacto final vive bajo `static/` (por ejemplo `static/css/app.css`) y es lo que enlaza el layout base. `node_modules/` permanece fuera del control de versiones salvo decisión explícita del equipo.
- **Plantillas**: utilidades Tailwind en el HTML (`class="..."`). Para patrones repetidos (botones, cards), usar **`@layer components`** o **componentes de plantilla** (`{% include %}`) con las mismas clases, en lugar de duplicar lógica en CSS custom sin criterio.
- **`@apply`**: usarlo con moderación (p. ej. extracción de un bloque de utilidades que se repite muchísimo); no sustituir todo el HTML por capas de `@apply` opacas.
- **Tokens / marca**: colores y fuentes institucionales se definen en la **configuración de Tailwind** (y se documentan aquí o en anexos cuando exista manual de marca).
- **Un layout base** (`base.html`) con bloques (`title`, `content`, `extra_css`, `extra_js`) que todas las páginas extiendan (`{% extends "base.html" %}`), enlazando el CSS compilado de Tailwind.

### Diseño responsive (obligatorio)

- **Alcance:** todas las **páginas y componentes de interfaz** del proyecto (públicas, flujos autenticados y, si se personalizan, plantillas del admin) deben comportarse correctamente en **distintos anchos de viewport**, desde móviles pequeños hasta pantallas anchas. No se aceptan diseños pensados solo para escritorio.
- **Enfoque:** **mobile-first** — estilos base para pantallas estrechas y **breakpoints** (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) para añadir o modificar layout en anchos mayores.
- **Meta viewport:** el layout base debe incluir `<meta name="viewport" content="width=device-width, initial-scale=1">` (u equivalente válido) para que el escalado en dispositivos sea correcto.
- **Layout:** usar contenedores fluidos (`max-w-*`, `mx-auto`, padding horizontal responsive), **grid/flex** con envolturas y columnas que se apilen en móvil; evitar anchos fijos en píxeles para el cuerpo principal.
- **Navegación y cabeceras:** menús que se adapten (por ejemplo cierre en un panel o menú compacto en pantallas pequeñas) sin cortar contenido esencial; **z-index** y **scroll** controlados para no bloquear la interacción.
- **Tablas y datos anchos:** si una tabla no cabe, usar **desplazamiento horizontal** (`overflow-x-auto`) o patrones alternativos (tarjetas apiladas, columnas ocultas con prioridad) para no forzar scroll en toda la página de forma confusa.
- **Imágenes y medios:** `max-width: 100%` / alturas automáticas donde aplique; evitar desbordes que generen scroll horizontal no deseado en el `body`.
- **Objetivos táctiles:** botones y enlaces con área tocable suficiente en móvil (alineado con [§18](#18-accesibilidad-y-contenido-público)).
- **Revisión:** antes de integrar, comprobar visualmente (o con herramientas de diseño responsive) al menos **móvil (~360px)**, **tablet (~768px)** y **escritorio (≥1024px)**.

### Iconografía (obligatorio)

- **No** dibujar ni “inventar” iconos con paths SVG arbitrarios en plantillas. Usar siempre **librerías establecidas** y trazados oficiales sin alterar la geometría (salvo escala/color vía CSS).
- **Preferido — [Heroicons](https://heroicons.com)** (Tailwind Labs, mismo ecosistema que Tailwind CSS): instalar el paquete npm **`heroicons`** y tomar los `.svg` desde `node_modules/heroicons/` (típicamente **24×24**, variantes `outline` u `solid` según el diseño). En Django, conviene **includes** reutilizables bajo `templates/includes/icons/` con un comentario que indique la fuente exacta (p. ej. `Source: heroicons npm — 24/solid/moon.svg`). Si se actualiza Heroicons, regenerar esos includes desde los archivos del paquete.
- **Alternativa aceptable — [Bootstrap Icons](https://icons.getbootstrap.com)** (webfont con su hoja CSS o SVG oficiales descargados del sitio) cuando quede justificado y documentado; no mezclar docenas de estilos distintos en la misma pantalla.
- **Accesibilidad:** `aria-hidden="true"` en iconos puramente decorativos junto a texto; en botones solo-icono, el control debe tener `aria-label` traducible ([§4](#4-internacionalización-i18n-y-localización-l10n)).

### Otras reglas de presentación

- **JavaScript**: scripts reutilizables en `static/js/`; evitar grandes bloques inline salvo casos puntuos; usar `{% static %}` para URLs de archivos estáticos.
- **Imágenes y media**: subidas de usuarios en `MEDIA_ROOT`; assets del sitio en `static/`. No mezclar en el mismo directorio sin criterio.
- **Accesibilidad**: encabezados jerárquicos (`h1`–`h6`), texto alternativo en imágenes relevantes, contraste suficiente, foco visible (`focus:ring`, `focus-visible:`) y etiquetas asociadas a controles de formulario.

---

## 6. Vistas y lógica

- Preferir **vistas basadas en clases (CBV)** cuando encajen con `ListView`, `DetailView`, `FormView`, etc.; usar **funciones** cuando la vista sea trivial o requiera flujo muy específico. Criterio: claridad ante todo.
- **Lógica de negocio** pesada no debe vivir en la vista ni en el modelo como método gigante: extraer a **servicios** (módulos `services.py` o paquete `services/` por app) cuando mejore tests y lectura.
- **Formularios**: `ModelForm` donde aplique; validación en el formulario o en el modelo (`clean` / `clean_<campo>`) con mensajes traducibles.

---

## 7. Modelos y base de datos

- Campos con **`verbose_name`** y **`help_text`** cuando aporten contexto (y traducibles con `_()`).
- **`Meta`**: `ordering` por defecto cuando tenga sentido; `indexes` en consultas frecuentes si el volumen lo justifica.
- Migraciones: **revisar en PR**; no editar migraciones ya aplicadas en entornos compartidos sin consenso.

---

## 8. Plantillas

- Lógica mínima en plantillas; usar **template tags** personalizados para lógica reutilizable compleja.
- Reutilizar **includes** (`{% include %}`) para cabeceras, pies y componentes repetidos.
- **CSRF** en formularios POST (`{% csrf_token %}`).

---

## 9. Seguridad

- Autenticación y permisos explícitos en vistas sensibles (`@login_required`, `PermissionRequiredMixin`, comprobaciones de objeto).
- Nunca confiar en datos del cliente; validar en servidor.
- Configurar cabeceras y políticas acordes al despliegue (HTTPS, cookies seguras en producción, etc.) según la guía de despliegue de Django.

---

## 10. Pruebas

- Tests para reglas de negocio críticas y formularios importantes (`TestCase` en `tests/` por app).
- Nombrar tests de forma que fallen con un mensaje comprensible (`test_<condición>_<resultado_esperado>`).

---

## 11. Estilo de código e idioma del código fuente

### Idioma (convención fija)

- **Inglés** para todo lo que forma parte del **código fuente**:
  - Identificadores: módulos, paquetes, clases, funciones, variables, constantes.
  - **Comentarios** inline y bloques `{% comment %}…{% endcomment %}` en plantillas.
  - **Docstrings** y anotaciones de tipo.
  - Nombres de migraciones, rutas de URL **name** (`name='session_list'`), y mensajes de `logging` dirigidos a desarrolladores.
  - Comentarios y nombres en **CSS** (capas Tailwind personalizadas, archivos fuente) y en **JavaScript** del proyecto.
- **No** mezclar español u otros idiomas en identificadores o comentarios “por comodidad”; la revisión de código debe hacer cumplir esta regla.

### Texto visible al usuario

- Cadenas que ve el usuario final (etiquetas, mensajes de error, emails, etc.) se escriben en el flujo de **traducción** (`gettext` / `{% trans %}` / `verbose_name=_("…")`) y se mantienen en los **catálogos** para **es** y **en** ([§4](#4-internacionalización-i18n-y-localización-l10n)), no como texto fijo mezclado en el código en lugar de traducciones.

### Estilo Python

- **PEP 8** como referencia; líneas razonablemente cortas; imports ordenados (estándar, terceros, locales).

---

## 12. Git y revisiones

- Commits **atómicos** y mensajes **descriptivos** (qué y por qué, no solo “fix”).
- Ramas por feature/fix; revisión de código antes de integrar a la rama principal cuando el flujo del equipo lo requiera.

---

## 13. Documentación en código

- Docstrings en **inglés**, en módulos o funciones no obvias (qué hace y efectos laterales relevantes). Evitar comentarios que repiten el código; sí aclarar el “por qué” cuando sea necesario.

---

## 14. Dependencias y entorno Python

- **`requirements.txt`** (o lockfile equivalente) versionado en el repo; instalar con `pip install -r requirements.txt` dentro de un **entorno virtual** (`venv`), no mezclar paquetes con el Python del sistema.
- Añadir dependencias de forma explícita; **no** commitear el directorio `venv/`.
- Antes de subir cambios que afecten dependencias, actualizar el archivo de requisitos y mencionarlo en el PR.
- **Versión de Python (obligatorio):** el proyecto debe ser **compatible con Python 3.8** como mínimo (incluye despliegues con **3.8.10**). No introducir sintaxis ni dependencias que exijan 3.9+ sin decisión explícita y actualización del `README` y de este documento.
- **Django:** usar la rama **4.2 LTS** acordada en `requirements.txt` mientras el soporte a 3.8 esté vigente. Subidas de versión mayor de Django/Python requieren revisión de compatibilidad y despliegue.
- La versión de **Python** concreta del entorno de producción debe figurar en el `README` y mantenerse alineada con CI y servidores.

---

## 15. Registro (logging), errores HTTP y mensajes al usuario

- Usar el **sistema de logging** de Django/Python (`logging`) con niveles adecuados (`DEBUG` en desarrollo, no depender de `print` en código permanente).
- En **producción**: no exponer trazas ni detalles internos al usuario; páginas de error **500** genéricas y amigables; **404** personalizada cuando el sitio lo requiera.
- Mensajes de error o éxito visibles en la interfaz deben ser **traducibles** y coherentes con [§4](#4-internacionalización-i18n-y-localización-l10n); evitar filtrar detalles sensibles en `messages` o en JSON de API.

---

## 16. Rendimiento y acceso a datos

- Evitar consultas **N+1**: usar `select_related()` para FKs en la misma query y `prefetch_related()` para M2M y relaciones inversas cuando se iteren colecciones en vistas o plantillas.
- Listados grandes: **paginación** (`Paginator` o CBV con `paginate_by`).
- **Índices** en BD cuando haya filtros u ordenaciones frecuentes sobre tablas grandes (coordinado con migraciones).
- Archivos estáticos en producción: servir con el mecanismo previsto (`collectstatic`, CDN o servidor de archivos) según el despliegue.

---

## 17. Archivos subidos por usuarios

- Validar en **servidor** tipo MIME/extensión permitida, **tamaño máximo** y, si aplica, dimensiones de imagen; no confiar solo en el cliente.
- Almacenar fuera de la raíz del código web cuando el hosting lo permita; nombres de archivo seguros (evitar sobrescrituras y path traversal).
- Considerar escaneo o políticas adicionales si el contexto institucional lo exige.

---

## 18. Accesibilidad y contenido público

- Objetivo de referencia: criterios **WCAG 2.1 nivel AA** en páginas públicas y flujos críticos (navegación por teclado, contraste, etiquetas, foco, formularios).
- HTML **semántico** (`main`, `nav`, `article`, encabezados en orden); componentes interactivos con roles ARIA cuando proceda.
- Complementa las reglas de interfaz en [§5](#5-framework-css-oficial-tailwind-css).

---

## 19. SEO y metadatos (sitio público)

- Cada página pública relevante debe tener **`title`** único y, cuando aplique, **meta description** traducida (es/en).
- Atributos Open Graph / Twitter Card cuando se compartan enlaces en redes; URLs canónicas si hay duplicación de contenido.
- `robots.txt` y **sitemap** XML cuando el índice de páginas lo justifique.

---

## 20. Revisiones de código y definición de “hecho”

Antes de considerar una tarea lista para integrar (salvo excepciones acordadas), comprobar:

- Cumple estos **lineamientos** y no introduce secretos ni datos personales innecesarios en logs.
- **Migraciones** incluidas y revisadas; no rompen datos existentes sin plan.
- Cadenas de usuario marcadas para **i18n** y **es** / **en** actualizados cuando corresponda.
- **Interfaz responsive** revisada en anchos representativos (móvil / tablet / escritorio) según [§5](#5-framework-css-oficial-tailwind-css).
- **Tests** añadidos o actualizados para la lógica nueva o corregida.
- Sin dependencias nuevas sin actualizar `requirements.txt` (si aplica).

---

## Referencias útiles

- [Django 4.2: Documentación](https://docs.djangoproject.com/en/4.2/) (versión alineada con el `requirements.txt`)
- [Django: Design philosophies](https://docs.djangoproject.com/en/4.2/misc/design-philosophies/)
- [Django: Translation](https://docs.djangoproject.com/en/4.2/topics/i18n/translation/)
- [Django: Static files](https://docs.djangoproject.com/en/4.2/howto/static-files/)
- [Django: Deployment checklist](https://docs.djangoproject.com/en/4.2/howto/deployment/checklist/)
- [Django: Logging](https://docs.djangoproject.com/en/4.2/topics/logging/)
- [Django: Database optimization](https://docs.djangoproject.com/en/4.2/topics/db/optimization/)
- [Tailwind CSS: Documentación](https://tailwindcss.com/docs)
- [Tailwind CSS: Responsive design](https://tailwindcss.com/docs/responsive-design)
- [Heroicons](https://heroicons.com) (iconos oficiales del ecosistema Tailwind)
- [Bootstrap Icons](https://icons.getbootstrap.com) (alternativa permitida)
- [WCAG 2.1](https://www.w3.org/TR/WCAG21/) (referencia de accesibilidad)

La **paleta**, **tipografías** y **radios** institucionales deben reflejarse en la **configuración de tema de Tailwind** cuando el diseño esté cerrado.
