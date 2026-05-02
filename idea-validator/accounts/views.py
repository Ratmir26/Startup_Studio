from django.contrib.auth.models import User
from django.http import JsonResponse
import json

def register(request):
    data = json.loads(request.body)

    user = User.objects.create_user(
        username=data['username'],
        password=data['password']
    )

    return JsonResponse({"status": "ok"})


def login(request):
    return JsonResponse({"status": "login ok"})