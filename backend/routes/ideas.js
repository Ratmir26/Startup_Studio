import { Router } from 'express';
import { z } from 'zod';
// import { IdeaModel } from '../models/Idea.js';  // Закомментируй пока
import { authenticateUser } from '../middleware/auth.js';
import { addToQueue } from '../services/queueService.js';  // Исправь путь

const router = Router();

// Временные заглушки для демо
const ideas = [];

// Валидация
const createIdeaSchema = z.object({
  title: z.string().min(3).max(150),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional()
});

const addArgumentSchema = z.object({
  type: z.enum(['pro', 'con']),
  text: z.string().min(1).max(300)
});

// Создать идею
router.post('/', authenticateUser, async (req, res) => {
  try {
    const data = createIdeaSchema.parse(req.body);
    const idea = await IdeaModel.create(req.user.uid, {
      title: data.title,
      description: data.description,
      isPublic: data.isPublic
    });
    res.status(201).json(idea);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить все идеи пользователя
router.get('/', authenticateUser, async (req, res) => {
  try {
    const ideas = await IdeaModel.getUserIdeas(req.user.uid);
    res.json(ideas);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить конкретную идею
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const idea = await IdeaModel.getById(req.params.id);
    if (!idea) return res.status(404).json({ error: 'Идея не найдена' });
    
    // Проверка прав доступа
    if (idea.userId !== req.user.uid && !idea.isPublic) {
      return res.status(403).json({ error: 'Нет доступа' });
    }
    
    res.json(idea);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Добавить аргумент
router.post('/:id/arguments', authenticateUser, async (req, res) => {
  try {
    const data = addArgumentSchema.parse(req.body);
    const idea = await IdeaModel.getById(req.params.id);
    
    if (!idea) return res.status(404).json({ error: 'Идея не найдена' });
    
    const updatedIdea = await IdeaModel.addArgument(req.params.id, data.type, {
      text: data.text,
      authorId: req.user.uid
    });
    
    res.json(updatedIdea);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Запустить AI-анализ
router.post('/:id/analyze', authenticateUser, async (req, res) => {
  try {
    const idea = await IdeaModel.getById(req.params.id);
    if (!idea) return res.status(404).json({ error: 'Идея не найдена' });
    
    // Добавляем в очередь на анализ
    const job = await addToQueue('ai-analysis', {
      ideaId: req.params.id,
      idea
    });
    
    res.json({ 
      message: 'Анализ запущен',
      jobId: job.id,
      status: 'processing'
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Поделиться идеей
router.post('/:id/share', authenticateUser, async (req, res) => {
  try {
    const idea = await IdeaModel.getById(req.params.id);
    if (!idea) return res.status(404).json({ error: 'Идея не найдена' });
    
    if (idea.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Только автор может делиться' });
    }
    
    const { emails } = req.body;
    const updatedIdea = await IdeaModel.update(req.params.id, {
      sharedWith: [...new Set([...idea.sharedWith, ...emails])]
    });
    
    // TODO: Отправить email уведомления
    
    res.json(updatedIdea);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;