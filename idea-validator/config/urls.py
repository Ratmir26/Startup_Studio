from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),

    # API
    path('api/', include('ideas.urls')),
    path('api/auth/', include('accounts.urls')),

    # Главная страница (твой index.html)
    path('', TemplateView.as_view(template_name="index.html")),
]