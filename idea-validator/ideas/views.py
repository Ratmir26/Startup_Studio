import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Idea
from .ai import generate_arguments


@csrf_exempt
def generate_ai(request):
    data = json.loads(request.body)
    idea = data.get("idea")

    result = generate_arguments(idea)

    return JsonResponse(result)


@csrf_exempt
def save_idea(request):
    data = json.loads(request.body)

    idea = Idea.objects.create(
        text=data["idea"],
        pros=data["pro"],
        cons=data["con"]
    )

    return JsonResponse({"id": idea.id})


def get_idea(request, id):
    idea = Idea.objects.get(id=id)

    return JsonResponse({
        "idea": idea.text,
        "pro": idea.pros,
        "con": idea.cons
    })