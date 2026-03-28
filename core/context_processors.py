from django.conf import settings


def browser_logging(request):
    """Exposes frontend debug flag for templates (see static/js/debug.js)."""
    return {
        "browser_console_log_enabled": getattr(
            settings, "BROWSER_CONSOLE_LOG_ENABLED", False
        ),
    }
