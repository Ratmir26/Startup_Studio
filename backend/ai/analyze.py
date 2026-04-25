import os
import json
from typing import Dict, List
import openai
from dotenv import load_dotenv
import spacy

load_dotenv()

openai.api_key = os.getenv('OPENAI_API_KEY')
nlp = spacy.load('ru_core_news_sm')

class IdeaAnalyzer:
    def __init__(self):
        self.model = "gpt-4-turbo-preview"
    
    def analyze_arguments(self, arguments: Dict[str, List[str]]) -> Dict:
        """Анализирует аргументы и даёт рекомендации"""
        
        pro_args = '\n'.join([f"- {a}" for a in arguments.get('pro', [])])
        con_args = '\n'.join([f"- {a}" for a in arguments.get('con', [])])
        
        prompt = f"""
        Проанализируй аргументы за и против идеи.
        
        АРГУМЕНТЫ ЗА:
        {pro_args if pro_args else 'Нет аргументов'}
        
        АРГУМЕНТЫ ПРОТИВ:
        {con_args if con_args else 'Нет аргументов'}
        
        Дай анализ в формате JSON:
        {{
            "summary": "краткий итог (2-3 предложения)",
            "strengths": ["3 ключевых сильных стороны"],
            "weaknesses": ["3 ключевых слабых стороны"],
            "suggestions": ["3 конкретных совета по улучшению идеи"],
            "confidence": 0.0-1.0,
            "market_fit": "описание насколько идея решает реальную проблему",
            "next_steps": ["3 следующих шага для валидации"]
        }}
        """
        
        try:
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "Ты эксперт по валидации идей и стартапов."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            result = json.loads(response.choices[0].message.content)
            return result
            
        except Exception as e:
            print(f"Ошибка AI анализа: {e}")
            return {
                "summary": "Не удалось выполнить анализ",
                "error": str(e)
            }
    
    def generate_survey_questions(self, idea: str) -> List[Dict]:
        """Генерирует вопросы для опроса целевой аудитории"""
        
        prompt = f"""
        Создай 5 вопросов для опроса, чтобы проверить идею:
        "{idea}"
        
        Формат JSON:
        [
            {{
                "question": "текст вопроса",
                "type": "multiple_choice|scale|open",
                "options": ["варианты для multiple_choice"],
                "goal": "что хотим узнать"
            }}
        ]
        """
        
        try:
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8
            )
            
            return json.loads(response.choices[0].message.content)
            
        except Exception as e:
            print(f"Ошибка генерации опроса: {e}")
            return []
    
    def calculate_credibility_score(self, arguments: Dict[str, List[str]]) -> float:
        """Рассчитывает оценку достоверности аргументов"""
        
        total = len(arguments.get('pro', [])) + len(arguments.get('con', []))
        if total == 0:
            return 0.0
        
        # NLP анализ: проверяем наличие фактов, цифр, источников
        fact_indicators = ['%', 'исследование', 'статистика', 'по данным', 
                          'доказано', 'цифры', 'факт', 'исследования']
        
        score = 0
        for side in ['pro', 'con']:
            for arg in arguments.get(side, []):
                doc = nlp(arg.lower())
                # Проверяем индикаторы фактов
                if any(indicator in arg.lower() for indicator in fact_indicators):
                    score += 1
                # Проверяем длину (более развёрнутые аргументы)
                if len(arg.split()) > 10:
                    score += 0.5
        
        return min(score / max(total, 1), 1.0)

def main():
    """Точка входа для очереди задач"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python analyze.py <idea_id>")
        return
    
    idea_id = sys.argv[1]
    # Здесь загрузка идеи из Firestore и анализ
    print(f"Анализ идеи {idea_id}...")
    
    analyzer = IdeaAnalyzer()
    # TODO: загрузить идею из БД и запустить анализ

if __name__ == "__main__":
    main()