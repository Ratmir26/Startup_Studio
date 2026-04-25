# 🏗️ Архитектура SaaS Валидатора идей

## Общий обзор

Проект эволюционирует от одностраничного валидатора к полноценному SaaS-продукту с React-фронтендом, облачным бекендом, AI-анализом и командной работой.

```
┌──────────────────────────────────────────────────────────┐
│                      ПОЛЬЗОВАТЕЛЬ                        │
└──────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│                   FRONTEND (React SPA)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Hero     │  │ Idea     │  │ Arguments│  │ Verdict  │ │
│  │ (CTA)    │  │ Input    │  │ Panel    │  │ Display  │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │
│  │ Share    │  │ Auth     │  │ State (Zustand)      │   │
│  │ Panel    │  │ Button   │  │ + React Query        │   │
│  └──────────┘  └──────────┘  └──────────────────────┘   │
└──────────────────────────────────────────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│   Vercel     │  │  Firebase    │  │  Google Forms    │
│  (хостинг)   │  │    Auth      │  │      API         │
└──────────────┘  └──────────────┘  └──────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│                 BACKEND (Node.js + Express)               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Auth     │  │ Ideas    │  │ Queue    │  │ WebSocket│ │
│  │ Routes   │  │ CRUD     │  │ Manager  │  │ (Socket) │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │
│  │ Rate     │  │ Helmet   │  │ Zod Validation       │   │
│  │ Limiter  │  │ (secure) │  │ (input check)        │   │
│  └──────────┘  └──────────┘  └──────────────────────┘   │
└──────────────────────────────────────────────────────────┘
          │                  │
          ▼                  ▼
┌──────────────┐  ┌──────────────────┐
│   Firestore  │  │     Redis        │
│  (NoSQL DB)  │  │   (cache/queue)  │
└──────────────┘  └──────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│                 AI SERVICE (Python + FastAPI)             │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │
│  │ OpenAI   │  │ spaCy    │  │ LangChain            │   │
│  │ GPT-4    │  │ (NLP)    │  │ (orchestration)      │   │
│  └──────────┘  └──────────┘  └──────────────────────┘   │
│                                                          │
│  Возможности:                                            │
│  • Анализ аргументов                                    │
│  • Генерация опросов                                    │
│  • Оценка достоверности                                 │
│  • Рекомендации по улучшению                            │
└──────────────────────────────────────────────────────────┘
```

## Стек технологий

### Frontend
| Технология | Назначение |
|-----------|-----------|
| React 18 | UI-фреймворк |
| TypeScript | Типизация |
| Vite | Сборщик (быстрее Webpack) |
| Zustand | Управление состоянием |
| React Router v6 | Навигация |
| React Query | Серверное состояние и кеширование |
| Framer Motion | Анимации |
| Tailwind CSS | Стилизация |
| Firebase SDK | Аутентификация на клиенте |
| Lucide React | Иконки |
| Vitest | Тестирование |

### Backend
| Технология | Назначение |
|-----------|-----------|
| Node.js | Рантайм |
| Express | HTTP-фреймворк |
| Firebase Admin SDK | Серверная работа с Firebase |
| Firestore | NoSQL база данных |
| Redis | Кеш и очередь задач |
| Bull | Управление очередями |
| Socket.io | WebSocket для real-time |
| Zod | Валидация запросов |
| Helmet | HTTP-заголовки безопасности |
| express-rate-limit | Защита от DDoS |

### AI Service
| Технология | Назначение |
|-----------|-----------|
| Python 3.11 | Язык |
| FastAPI | API-фреймворк |
| OpenAI GPT-4 | Основной AI-анализ |
| spaCy | NLP-обработка |
| LangChain | Оркестрация AI-запросов |

### DevOps
| Технология | Назначение |
|-----------|-----------|
| Docker | Контейнеризация |
| Docker Compose | Локальная разработка |
| GitHub Actions | CI/CD |
| Vercel | Хостинг фронтенда |
| Railway | Хостинг бекенда |

## Поток данных

### 1. Создание идеи (Happy Path)
```
Пользователь вводит идею
    → React обновляет Zustand store
    → POST /api/ideas (JWT в заголовке)
    → Express валидирует через Zod
    → Firebase Admin создаёт запись в Firestore
    → Ответ 201 + объект идеи
    → React Query обновляет кеш
    → UI перерисовывается
```

### 2. AI-анализ
```
Пользователь нажимает "Анализировать"
    → POST /api/ideas/:id/analyze
    → Express добавляет задачу в Bull Queue
    → Ответ "analysis started, jobId: xxx"
    → Bull передаёт задачу Python-сервису через Redis
    → Python вызывает OpenAI API
    → Результат сохраняется в Firestore
    → Socket.io отправляет уведомление на фронтенд
    → UI показывает результат анализа
```

### 3. Шаринг идеи
```
Автор нажимает "Поделиться"
    → POST /api/ideas/:id/share { emails: [...] }
    → Express проверяет права (только автор)
    → Добавляет email'ы в массив sharedWith
    → Генерирует публичную ссылку (если isPublic)
    → Отправляет email-уведомления (через очередь)
    → Ответ с обновлённой идеей
```

## Модели данных (Firestore)

### Collection: `users`
```typescript
{
  uid: string;              // ID из Firebase Auth
  email: string;            // Почта
  displayName: string;      // Имя
  photoURL?: string;        // Аватар
  createdAt: Timestamp;     // Дата регистрации
  updatedAt: Timestamp;     // Последнее обновление
  teamIds: string[];        // ID команд
  settings: {
    theme: 'dark' | 'light';
    notifications: boolean;
  }
}
```

### Collection: `ideas`
```typescript
{
  id: string;               // Автогенерируемый ID
  userId: string;           // ID создателя
  title: string;            // Название идеи (3-150 символов)
  description: string;      // Опциональное описание
  arguments: {
    pro: Array<{
      id: string;
      text: string;
      authorId: string;
      votes: number;
      createdAt: Timestamp;
    }>;
    con: Array<{
      id: string;
      text: string;
      authorId: string;
      votes: number;
      createdAt: Timestamp;
    }>;
  };
  verdict: 'promising' | 'weak' | 'uncertain';  // Вердикт
  score: number;            // pro минус con
  aiAnalysis?: {            // Результат AI (если был запрошен)
    summary: string;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    confidence: number;     // 0.0 - 1.0
    analyzedAt: Timestamp;
  };
  isPublic: boolean;        // Публичный доступ
  sharedWith: string[];     // Email'ы кому расшарено
  shareLink?: string;       // Уникальная ссылка
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Collection: `teams` (v5.0)
```typescript
{
  id: string;
  name: string;
  ownerId: string;
  members: Array<{
    userId: string;
    role: 'admin' | 'editor' | 'viewer';
    joinedAt: Timestamp;
  }>;
  ideaIds: string[];
  createdAt: Timestamp;
}
```

## Безопасность

### Аутентификация
- Firebase Auth (Google, Email/Password, GitHub)
- JWT токены автоматически обновляются
- Все запросы к API требуют `Authorization: Bearer <token>`

### Авторизация
- Идея доступна только создателю (по умолчанию)
- `isPublic: true` — доступна по ссылке всем
- `sharedWith` — доступна конкретным email'ам
- Команды: роли admin/editor/viewer

### Защита API
```javascript
// Пример цепочки middleware
app.use('/api/ideas',
  helmet(),                    // Безопасные заголовки
  cors({ origin: FRONTEND_URL }), // CORS
  rateLimit({ windowMs: 15*60*1000, max: 100 }), // Rate limiting
  authenticateUser,            // Проверка JWT
  validateInput(zodSchema)     // Валидация тела запроса
);
```

### Дополнительно
- Все пользовательские данные валидируются через Zod
- XSS-защита через DOMPurify на фронте
- SQL-инъекции не страшны (Firestore NoSQL)
- Пароли не хранятся (Firebase Auth)
- Приватные ключи только в `.env` (не в репозитории)

## Производительность

### Кеширование
- React Query кеширует ответы API на 5 минут
- Redis кеширует часто запрашиваемые публичные идеи
- Service Worker кеширует статику (PWA)
- Firestore использует встроенное кеширование

### Оптимизация фронтенда
- Code splitting (React.lazy)
- Lazy loading изображений
- Virtual scrolling для длинных списков
- Debounced поиск (300ms)
- Сжатие через Vite (gzip/brotli)

### Нагрузка
- Rate limiting: 100 запросов за 15 минут на пользователя
- Очередь AI-анализа: максимум 10 одновременных задач
- Firestore: до 1 млн чтений/день бесплатно

## Мониторинг и логирование

- **Ошибки фронтенда:** Sentry
- **Логи бекенда:** Winston + Grafana (опционально)
- **Метрики API:** встроенные в Firebase
- **AI-запросы:** логирование в Firestore
- **Алерты:** при падении API или ошибках 5xx

## Версионирование API

```
/api/v1/ideas        — Текущая версия (стабильная)
/api/v2/ideas        — Следующая (с командами)
```

Старые версии поддерживаются 6 месяцев после выхода новой.

## Тестирование

| Уровень | Инструмент | Что тестируем |
|---------|-----------|--------------|
| Unit | Vitest | Функции, хуки, компоненты |
| Integration | Testing Library | Взаимодействие компонентов |
| E2E | Playwright | Полный пользовательский путь |
| API | Supertest | Роуты и middleware |
| Load | k6 | Нагрузочное тестирование |

## Развёртывание (Deployment)

```bash
# Локальная разработка
docker-compose up

# Продакшен
# Frontend
vercel deploy --prod

# Backend
railway up

# Или всё вместе на одной VPS
docker-compose -f docker-compose.prod.yml up -d
```

## Дорожная карта версий

| Версия | Стек | Ключевые фичи |
|--------|------|-------------|
| v1.0 | HTML/CSS/JS | Локальный валидатор |
| v2.0 | React + Zustand | SPA, PWA, тесты |
| v3.0 | + Firebase | Аккаунты, облако, синхронизация |
| v4.0 | + Python AI | GPT-анализ, опросы |
| v5.0 | + Teams | Коллаборация, шаринг |
| v6.0 | Enterprise | SSO, White label, API |

---

**Текущая версия: v1.0 → Миграция на v2.0 в процессе**
```

Просто копируешь и вставляешь в `ARCHITECTURE.md` — всё готово!