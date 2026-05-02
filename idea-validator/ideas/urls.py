from django.urls import path
from . import views

urlpatterns = [
    path('generate/', views.generate_ai),
    path('save/', views.save_idea),
    path('idea/<int:id>/', views.get_idea),
]