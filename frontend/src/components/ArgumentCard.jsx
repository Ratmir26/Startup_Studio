import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Edit3, ThumbsUp, ThumbsDown } from 'lucide-react';
import useValidationStore from '../hooks/useValidation';

export default function ArgumentCard({ argument, type, index }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(argument.text);
  const [isSelected, setIsSelected] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const inputRef = useRef(null);
  const longPressTimer = useRef(null);
  
  const { 
    removeArgument, 
    editArgument, 
    voteArgument,
    selectedCard,
    selectCard 
  } = useValidationStore();

  const isPro = type === 'pro';

  // Фокус при редактировании
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Проверяем, выбрана ли эта карточка
  useEffect(() => {
    if (selectedCard?.type === type && selectedCard?.index === index) {
      setIsSelected(true);
    } else {
      setIsSelected(false);
    }
  }, [selectedCard, type, index]);

  // Обработчики
  const handleClick = () => {
    selectCard(type, index);
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditText(argument.text);
  };

  const handleEditSave = () => {
    if (editText.trim() && editText !== argument.text) {
      editArgument(type, argument.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditText(argument.text);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleEditSave();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(false);
    removeArgument(type, argument.id);
  };

  const handleVote = (delta) => {
    voteArgument(type, argument.id, delta);
  };

  // Long press для мобильных
  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowDeleteConfirm(true);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  return (
    <>
      <motion.div
        className={`argument-card ${isPro ? 'pro' : 'con'} ${isSelected ? 'selected' : ''}`}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        initial={{ opacity: 0, x: isPro ? -50 : 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.8, height: 0 }}
        transition={{ duration: 0.3 }}
        layout
        title="Клик — выбрать | Двойной клик — редактировать | Long press — удалить"
      >
        {isEditing ? (
          <div className="edit-mode">
            <input
              ref={inputRef}
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={handleEditSave}
              onKeyDown={handleKeyDown}
              className="edit-input"
              autoFocus
            />
            <div className="edit-actions">
              <button 
                className="btn-save"
                onClick={handleEditSave}
                title="Сохранить"
              >
                ✓
              </button>
              <button 
                className="btn-cancel"
                onClick={handleEditCancel}
                title="Отмена"
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="argument-content">
              <span className="argument-type-badge">
                {isPro ? '💚 ЗА' : '❤️ ПРОТИВ'}
              </span>
              <p className="argument-text">{argument.text}</p>
              
              {argument.authorId && (
                <span className="argument-author">
                  {argument.authorName || 'Аноним'}
                </span>
              )}
            </div>

            <div className="argument-actions">
              <div className="vote-buttons">
                <button
                  className="vote-btn up"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVote(1);
                  }}
                  title="Полезный аргумент"
                >
                  <ThumbsUp size={14} />
                </button>
                <span className="vote-count">{argument.votes || 0}</span>
                <button
                  className="vote-btn down"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVote(-1);
                  }}
                  title="Неубедительно"
                >
                  <ThumbsDown size={14} />
                </button>
              </div>

              <button
                className="edit-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDoubleClick();
                }}
                title="Редактировать"
              >
                <Edit3 size={14} />
              </button>

              <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                }}
                title="Удалить аргумент"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {argument.createdAt && (
              <div className="argument-time">
                {new Date(argument.createdAt).toLocaleDateString()}
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Модальное окно подтверждения удаления */}
      {showDeleteConfirm && (
        <div 
          className="modal-overlay"
          onClick={(e) => {
            if (e.target.classList.contains('modal-overlay')) {
              setShowDeleteConfirm(false);
            }
          }}
        >
          <motion.div 
            className="modal-content delete-modal"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            <h3>Удалить аргумент?</h3>
            <p className="delete-preview">{argument.text}</p>
            <div className="modal-buttons">
              <button 
                className="btn btn-danger"
                onClick={handleDelete}
              >
                🗑 Удалить
              </button>
              <button 
                className="btn btn-cancel"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Отмена
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}