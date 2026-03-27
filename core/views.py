from django.views.generic import TemplateView


class HomeView(TemplateView):
    """Public landing page."""

    template_name = "core/landing.html"
