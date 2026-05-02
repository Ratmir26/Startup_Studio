import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

app.post('/api/generate', async (req, res) => {
    const { idea } = req.body;
    console.log('🔍 Анализирую идею:', idea);

    if (!idea) {
        return res.status(400).json({ error: 'Идея не указана' });
    }

    try {
        console.log('🤖 Запускаю g4f...');

        const escapedIdea = idea.replace(/"/g, '\\"');

        const { stdout } = await execAsync(
            `python -X utf8 ai_generate.py "${escapedIdea}"`,
            {
                timeout: 60000,
                encoding: 'utf8',
                env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
            }
        );

        console.log('Raw Python output:', stdout);

        const cleanOutput = stdout.trim().replace(/^\uFEFF/, '');
        const args = JSON.parse(cleanOutput);

        console.log('✅ AI ответ получен');
        res.json(args);

    } catch (error) {
        console.error('❌ Ошибка:', error.message);

        res.json({
            pro: [
                `Идея "${idea}" интересна`,
                "Есть потенциал роста",
                "Можно изучить рынок"
            ],
            con: [
                "Нужно проверить спрос",
                "Возможна конкуренция",
                "Требуется бюджет"
            ]
        });
    }
});

app.get('/api/health', (req, res) => res.json({
    status: 'ok',
    engine: 'g4f (free)',
    timestamp: new Date().toISOString()
}));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`\n🚀 AI сервер: http://localhost:${PORT}`);
    console.log(`📋 Health: http://localhost:${PORT}/api/health`);
    console.log(`🤖 Движок: g4f (бесплатный)\n`);
});