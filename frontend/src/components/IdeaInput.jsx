import { motion } from 'framer-motion';

export default function IdeaInput({ value, onChange }) {
  return (
    <motion.section 
      className="idea-input-section"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <label className="idea-label">ТВОЯ ИДЕЯ</label>
      <div className="idea-input-wrapper">
        <input
          id="idea-input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Например: Сократить уроки и дать свободу выбора ученикам"
          maxLength={150}
          className="idea-input"
        />
      </div>
      {value && (
        <div className="char-count">
          {value.length}/150 символов
        </div>
      )}
    </motion.section>
  );
}