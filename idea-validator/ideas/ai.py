from openai import OpenAI
from django.conf import settings
import json

client = OpenAI(api_key=settings.OPENAI_API_KEY)

def generate_arguments(idea):
    prompt = f"""
    Дай аргументы ЗА и ПРОТИВ для идеи:
    {idea}

    Ответ строго JSON:
    {{
        "pro": ["..."],
        "con": ["..."]
    }}
    """

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )

    return json.loads(response.choices[0].message.content)