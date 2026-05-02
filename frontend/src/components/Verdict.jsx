import { motion } from 'framer-motion';
import { 
  Rocket, 
  AlertTriangle, 
  HelpCircle, 
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

export default function Verdict({ verdict }) {
  if (!verdict) return null;

  const { text, type, score, confidence } = verdict;

  const config = {
    positive: {
      icon: <Rocket className="verdict-icon" />,
      color: 'var(--yes-color)',
      bgColor: 'rgba(0, 255, 136, 0.1)',
      label: 'Перспективная идея',
    },
    negative: {
      icon: <AlertTriangle className="verdict-icon" />,
      color: 'var(--no-color)',
      bgColor: 'rgba(255, 68, 102, 0.1)',
      label: 'Слабая идея',
    },
    neutral: {
      icon: <HelpCircle className="verdict-icon" />,
      color: 'var(--warning-color)',
      bgColor: 'rgba(255, 170, 0, 0.1)',
      label: 'Недостаточно данных',
    },
  };

  const currentConfig = config[type] || config.neutral;

  const ScoreIndicator = () => {
    if (score > 0) return <TrendingUp size={20} color="var(--yes-color)" />;
    if (score < 0) return <TrendingDown size={20} color="var(--no-color)" />;
    return <Minus size={20} color="var(--warning-color)" />;
  };

  return (
    <motion.section 
      className="verdict-section"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <motion.div
        className="verdict-card"
        style={{
          borderColor: currentConfig.color,
          background: currentConfig.bgColor,
        }}
        animate={{
          boxShadow: [
            `0 0 20px ${currentConfig.color}20`,
            `0 0 40px ${currentConfig.color}40`,
            `0 0 20px ${currentConfig.color}20`,
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div className="verdict-header">
          <motion.div
            className="verdict-icon-wrapper"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {currentConfig.icon}
          </motion.div>
          
          <h3 className="verdict-title" style={{ color: currentConfig.color }}>
            {text}
          </h3>
        </div>

        <div className="verdict-details">
          <div className="verdict-stat">
            <span className="stat-label">Уверенность</span>
            <div className="confidence-bar">
              <div
                className="confidence-fill"
                style={{
                  width: `${confidence || 50}%`,
                  background: `linear-gradient(90deg, ${currentConfig.color}, var(--accent))`,
                }}
              />
            </div>
            <span className="stat-value">
              {confidence > 70 ? 'Высокая' : confidence > 30 ? 'Средняя' : 'Низкая'}
            </span>
          </div>

          <div className="verdict-stat">
            <span className="stat-label">Счёт</span>
            <div className="score-display">
              <ScoreIndicator />
              <span className="score-value" style={{
                color: score > 0 ? 'var(--yes-color)' : score < 0 ? 'var(--no-color)' : 'var(--warning-color)'
              }}>
                {score > 0 ? `+${score}` : score}
              </span>
            </div>
          </div>

          <div className="verdict-stat">
            <span className="stat-label">Статус</span>
            <span className="verdict-badge" style={{
              background: currentConfig.color,
              color: '#000',
            }}>
              {currentConfig.label}
            </span>
          </div>
        </div>

        {/* Рекомендации на основе вердикта */}
        <div className="verdict-recommendations">
          {type === 'positive' && (
            <p className="recommendation">
              🚀 Идея выглядит многообещающе! Рекомендуется провести дополнительное исследование рынка и создать MVP.
            </p>
          )}
          {type === 'negative' && (
            <p className="recommendation">
              ⚠️ Сейчас идея выглядит слабой. Попробуйте доработать концепцию или найти новое применение.
            </p>
          )}
          {type === 'neutral' && (
            <p className="recommendation">
              🤔 Добавьте больше аргументов с обеих сторон, чтобы получить более точную оценку.
            </p>
          )}
        </div>
      </motion.div>
    </motion.section>
  );
}