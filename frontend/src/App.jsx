import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

function App() {
  // --- Audio ---
  const audioCtxRef = useRef(null);
  const getAudioContext = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtxRef.current;
  };
  const playClick = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 1000;
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.05);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } catch(e) {}
  }, []);
  const vibrate = (ms = 50) => { if (navigator.vibrate) navigator.vibrate(ms); };

  // --- Data ---
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') !== 'light');
  const [validationState, setValidationState] = useState(() => {
    const saved = localStorage.getItem('validation');
    return saved === 'yes' ? 'yes' : saved === 'no' ? 'no' : null;
  });
  const [currentIdea, setCurrentIdea] = useState(() => localStorage.getItem('currentIdea') || '');
  const [argumentsData, setArgumentsData] = useState(() => {
    const saved = localStorage.getItem('arguments');
    return saved ? JSON.parse(saved) : {
      pro: ["Засыпаю на первых двух уроках", "Нет времени даже на прогулку", "Прихожу домой только чтобы поспать", "Теряется интерес к учёбе из-за усталости", "Постоянный стресс и недосып ведут к болезням"],
      con: ["Без полных уроков не сдать ЕГЭ", "В школе и так мало часов по базе", 'Ученики выберут только "халяву"', "Учителя не успеют выдать программу", "Родители будут против свободного посещения"]
    };
  });

  const [selectedCard, setSelectedCard] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modalType, setModalType] = useState('pro');
  const [newArgText, setNewArgText] = useState('');
  const [deleteTarget, setDeleteTarget] = useState({ type: null, index: null, text: '' });
  const [editingCard, setEditingCard] = useState(null);
  const longPressTimer = useRef(null);

  // --- Onboarding ---
  useEffect(() => {
    if (!localStorage.getItem('visited')) {
      setTimeout(() => alert('👋 Добро пожаловать!\n\n1. Введи свою идею\n2. Добавь аргументы ЗА и ПРОТИВ\n3. Посмотри вердикт\n4. Поделись результатом'), 500);
      localStorage.setItem('visited', 'true');
    }
  }, []);

  // --- Persistence ---
  useEffect(() => { document.body.classList.toggle('light-theme', !isDark); }, [isDark]);
  useEffect(() => { localStorage.setItem('arguments', JSON.stringify(argumentsData)); }, [argumentsData]);
  useEffect(() => { localStorage.setItem('currentIdea', currentIdea); }, [currentIdea]);
  useEffect(() => { localStorage.setItem('validation', validationState); }, [validationState]);

  // --- Verdict ---
  const getVerdict = () => {
    const pro = argumentsData.pro.length;
    const con = argumentsData.con.length;
    const total = pro + con;
    const score = pro - con;
    let verdict, className, confidence;
    if (total === 0) { verdict = '🤔 Добавь аргументы'; className = 'neutral'; confidence = 'Нет данных'; }
    else if (total < 3) { verdict = '🤔 Нужно больше данных'; className = 'neutral'; confidence = 'Мало данных'; }
    else if (pro > con * 1.5) { verdict = '🚀 Идея перспективная!'; className = 'positive'; confidence = 'Достаточно данных'; }
    else if (con > pro * 1.5) { verdict = '❌ Идея слабая'; className = 'negative'; confidence = 'Достаточно данных'; }
    else if (score > 0) { verdict = '👍 Скорее перспективная'; className = 'positive'; confidence = total >= 5 ? 'Достаточно данных' : 'Мало данных'; }
    else if (score < 0) { verdict = '👎 Скорее слабая'; className = 'negative'; confidence = total >= 5 ? 'Достаточно данных' : 'Мало данных'; }
    else { verdict = '⚖️ Равновесие'; className = 'neutral'; confidence = 'Нужно больше аргументов'; }
    return { verdict, className, score, confidence };
  };

  const v = getVerdict();
  const progress = argumentsData.pro.length + argumentsData.con.length === 0 ? 50 : Math.round((argumentsData.pro.length / (argumentsData.pro.length + argumentsData.con.length)) * 100);

  // --- Actions ---
  const saveArgs = (newArgs) => { setArgumentsData(newArgs); localStorage.setItem('arguments', JSON.stringify(newArgs)); };

  const addArgument = () => {
    if (!newArgText.trim()) return;
    playClick(); vibrate();
    saveArgs({ ...argumentsData, [modalType]: [...argumentsData[modalType], newArgText.trim()] });
    setNewArgText(''); setShowAddModal(false);
  };

  const openDeleteConfirm = (type, index, text) => {
    playClick(); vibrate();
    setDeleteTarget({ type, index, text });
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    playClick(); vibrate();
    const { type, index } = deleteTarget;
    saveArgs({ ...argumentsData, [type]: argumentsData[type].filter((_, i) => i !== index) });
    setSelectedCard(null);
    setShowDeleteModal(false);
  };

  const selectCard = (type, index) => {
    playClick(); vibrate(30);
    setSelectedCard({ type, index });
  };

  const startEdit = (type, index) => {
    playClick();
    setEditingCard({ type, index, text: argumentsData[type][index] });
  };

  const finishEdit = (newText) => {
    if (editingCard && newText.trim() && newText !== editingCard.text) {
      const { type, index } = editingCard;
      const newArgs = argumentsData[type].map((t, i) => i === index ? newText.trim() : t);
      saveArgs({ ...argumentsData, [type]: newArgs });
    }
    setEditingCard(null);
  };

  // --- Share ---
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => alert('✅ Скопировано!')).catch(() => prompt('Скопируйте:', text));
  };

  const shareIdea = () => {
    playClick();
    const idea = currentIdea || 'Моя идея';
    const text = `Я проверяю идею: "${idea}". Помоги аргументами!`;
    if (navigator.share) navigator.share({ title: 'Валидация идеи', text, url: window.location.href }).catch(() => copyToClipboard(text));
    else copyToClipboard(text);
  };

  const copyArgs = () => {
    playClick(); vibrate();
    const idea = currentIdea || 'Моя идея';
    const proText = argumentsData.pro.map((t, i) => `${i+1}. ${t}`).join('\n');
    const conText = argumentsData.con.map((t, i) => `${i+1}. ${t}`).join('\n');
    copyToClipboard(`Идея: ${idea}\nВердикт: ${v.verdict}\n\nЗА:\n${proText}\n\nПРОТИВ:\n${conText}`);
  };

  const downloadTxt = () => {
    playClick(); vibrate();
    const idea = currentIdea || 'Моя идея';
    const content = `Валидация идеи: "${idea}"\nВердикт: ${v.verdict}\n\nПОДТВЕРЖДАЕТ БОЛЬ:\n${argumentsData.pro.map(t => `+ ${t}`).join('\n')}\n\nЛОМАЕТ ИДЕЮ:\n${argumentsData.con.map(t => `- ${t}`).join('\n')}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'validation-result.txt'; a.click();
  };

  const exportJSON = () => {
    playClick(); vibrate();
    const data = { idea: currentIdea, validationState, arguments: argumentsData, verdict: getVerdict(), exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'validation-data.json'; a.click();
  };

  const importJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.arguments?.pro && data.arguments?.con) {
          saveArgs(data.arguments);
          if (data.idea) setCurrentIdea(data.idea);
          if (data.validationState) setValidationState(data.validationState);
          alert('✅ Данные импортированы!');
        } else alert('❌ Неверный формат');
      } catch { alert('❌ Ошибка чтения'); }
    };
    reader.readAsText(file);
  };

  const checkHypothesis = () => {
    playClick(); vibrate();
    const questions = ['Кто твоя целевая аудитория?', 'Как часто люди сталкиваются с этой проблемой?', 'Сколько людей готовы платить за решение?', 'Есть ли уже конкуренты?', 'Можно ли проверить идею за неделю?'];
    alert(`🔍 Проверка гипотезы:\n\nИдея: "${currentIdea || '(не указана)'}"\n\nСлучайный вопрос:\n➡️ ${questions[Math.floor(Math.random() * questions.length)]}`);
  };

  // --- Render Argument Card ---
  const renderCard = (type, text, index) => (
    <div
      key={`${type}-${index}`}
      className={`argument-card${selectedCard?.type === type && selectedCard?.index === index ? ' selected' : ''}`}
      data-type={type}
      data-index={index}
      onClick={() => selectCard(type, index)}
      onDoubleClick={() => startEdit(type, index)}
      onTouchStart={() => { longPressTimer.current = setTimeout(() => openDeleteConfirm(type, index, text), 600); }}
      onTouchEnd={() => clearTimeout(longPressTimer.current)}
      onTouchMove={() => clearTimeout(longPressTimer.current)}
      title="Клик — выбрать. Двойной клик — редактировать. Удаление — кнопкой"
    >
      {editingCard?.type === type && editingCard?.index === index ? (
        <input
          type="text"
          defaultValue={text}
          autoFocus
          onBlur={(e) => finishEdit(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') finishEdit(e.target.value); if (e.key === 'Escape') setEditingCard(null); }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="argument-text">{text}</span>
      )}
      <button className="delete-argument-btn" onClick={(e) => { e.stopPropagation(); openDeleteConfirm(type, index, text); }} title="Удалить аргумент">🗑</button>
    </div>
  );

  // --- Keyboard ---
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') { setShowAddModal(false); setShowDeleteModal(false); }
      if (e.key === 'Delete' && selectedCard && !showAddModal && !showDeleteModal) {
        const { type, index } = selectedCard;
        if (argumentsData[type][index]) openDeleteConfirm(type, index, argumentsData[type][index]);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [selectedCard, showAddModal, showDeleteModal, argumentsData]);

  return (
    <div className="container">
      {/* Header */}
      <header>
        <div className="header-content">
          <div className="logo-section">
            <svg className="logo-gear" viewBox="0 0 100 100" fill="none">
              <path d="M30 20 L45 15 L55 25 L50 35 L40 30 Z" fill="var(--accent)"/>
              <path d="M70 20 L85 15 L95 25 L90 35 L80 30 Z" fill="var(--accent)" transform="rotate(120 50 50)"/>
              <path d="M70 80 L85 85 L95 75 L90 65 L80 70 Z" fill="var(--accent)" transform="rotate(240 50 50)"/>
              <path d="M30 80 L45 85 L55 75 L50 65 L40 70 Z" fill="var(--accent)" transform="rotate(60 50 50)"/>
              <circle cx="50" cy="50" r="15" fill="var(--bg-primary)"/>
              <circle cx="50" cy="50" r="8" fill="var(--accent)"/>
            </svg>
            <h1>ВАЛИДАТОР ИДЕЙ</h1>
          </div>
          <button className="theme-toggle" onClick={() => { playClick(); vibrate(); setIsDark(!isDark); }}>
            {isDark ? '☀️ СВЕТЛАЯ' : '🌙 ТЁМНАЯ'}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="hero-section">
        <p className="subtitle">Проверь свою идею за 2 минуты и пойми — она жизнеспособна или нет</p>
        <button className="cta-btn" onClick={() => { playClick(); vibrate(); document.getElementById('ideaInput')?.focus(); }}>🚀 Начать валидацию</button>
      </section>

      {/* Idea Input */}
      <section className="idea-input-section">
        <label className="idea-label">ТВОЯ ИДЕЯ</label>
        <div className="idea-input-wrapper">
          <input id="ideaInput" type="text" value={currentIdea} onChange={(e) => { setCurrentIdea(e.target.value); localStorage.setItem('currentIdea', e.target.value); }} placeholder="Например: Сократить уроки и дать свободу выбора ученикам" maxLength={150} />
        </div>
      </section>

      {/* Problem */}
      <section className="problem-section">
        <h2 className="section-title">ПРОБЛЕМА</h2>
        <div className="problem-grid">
          <div className="problem-card"><span className="problem-icon">👁️</span><h3>ЧТО ВИЖУ</h3><p>Школа занимает всё свободное время. В 1 смену нужно вставать в 7-8 утра</p></div>
          <div className="problem-card"><span className="problem-icon">👤</span><h3>КТО СТРАДАЕТ</h3><p>Все ученики</p></div>
          <div className="problem-card"><span className="problem-icon">❓</span><h3>КАК СЕЙЧАС РЕШАЮТ</h3><p>Пока никто не решает</p></div>
        </div>
      </section>

      {/* Validation Toggle */}
      <section className="validation-section">
        <div className="validation-toggle">
          <span className="toggle-label">ПРОВЕРИЛ ЛИ?</span>
          <div
            className={`toggle-btn${validationState === 'yes' ? ' yes-active' : ''}${validationState === 'no' ? ' no-active' : ''}`}
            onClick={() => { playClick(); vibrate(); setValidationState(s => s === 'yes' ? 'no' : s === 'no' ? null : 'yes'); }}
          >
            <div className="toggle-slider"></div>
            <div className="toggle-options">
              <span className="toggle-option yes-text">ДА</span>
              <span className="toggle-option no-text">НЕТ</span>
            </div>
            <div className="toggle-success">✓</div>
          </div>
        </div>
      </section>

      {/* Verdict */}
      <section className="verdict-section">
        <div id="verdict" className={v.className}>{v.verdict}</div>
        <div className="confidence-indicator">Статус: {v.confidence}</div>
      </section>

      {/* Arguments */}
      <section className="arguments-section">
        <h2 className="section-title">АРГУМЕНТЫ</h2>
        <div className="arguments-grid">
          <div className="arguments-column pro">
            <h3>ПОДТВЕРЖДАЕТ БОЛЬ</h3>
            <div className="arguments-list">{argumentsData.pro.map((t, i) => renderCard('pro', t, i))}</div>
            <button className="add-argument-btn" onClick={() => { setModalType('pro'); setShowAddModal(true); }}>+ ДОБАВИТЬ АРГУМЕНТ ЗА</button>
          </div>
          <div className="arguments-column con">
            <h3>ЛОМАЕТ ИДЕЮ</h3>
            <div className="arguments-list">{argumentsData.con.map((t, i) => renderCard('con', t, i))}</div>
            <button className="add-argument-btn" onClick={() => { setModalType('con'); setShowAddModal(true); }}>+ ДОБАВИТЬ АРГУМЕНТ ПРОТИВ</button>
          </div>
        </div>
      </section>

      {/* Check Hypothesis */}
      <section className="check-hypothesis-section">
        <button className="check-hypothesis-btn" onClick={checkHypothesis}>🔍 Проверить гипотезу (опрос)</button>
      </section>

      {/* Share */}
      <section className="share-section">
        <h2 className="section-title" style={{ marginBottom: 30 }}>ПОДЕЛИТЬСЯ / ЭКСПОРТ</h2>
        <div className="share-buttons">
          <button className="share-btn" onClick={shareIdea}>📤 Поделиться идеей</button>
          <button className="share-btn" onClick={copyArgs}>📋 Копировать аргументы</button>
          <button className="share-btn" onClick={downloadTxt}>💾 Скачать TXT</button>
          <button className="share-btn" onClick={exportJSON}>📦 Экспорт JSON</button>
          <button className="share-btn" onClick={() => { playClick(); document.getElementById('importFileInput')?.click(); }}>📥 Импорт JSON</button>
          <input type="file" id="importFileInput" accept=".json" style={{ display: 'none' }} onChange={importJSON} />
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="progress-container">
          <div className="progress-label"><span>Валидация идеи</span><span>{progress}%</span></div>
          <div className="progress-bar-wrapper"><div className="progress-bar" style={{ width: `${progress}%` }}>{progress}%</div></div>
        </div>
        <div className="footer-stats">
          <div className="stat-item">Аргументов ЗА: <span>{argumentsData.pro.length}</span></div>
          <div className="stat-item">Аргументов ПРОТИВ: <span>{argumentsData.con.length}</span></div>
          <div className="stat-item">Оценка: <span>{v.score}</span></div>
        </div>
      </footer>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal active" onClick={(e) => e.target.className === 'modal active' && setShowAddModal(false)}>
          <div className="modal-content">
            <h3>ДОБАВИТЬ АРГУМЕНТ</h3>
            <input type="text" value={newArgText} onChange={(e) => setNewArgText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addArgument()} placeholder="Введите ваш аргумент..." autoFocus />
            <select value={modalType} onChange={(e) => setModalType(e.target.value)}>
              <option value="pro">Подтверждает боль (ЗА)</option>
              <option value="con">Ломает идею (ПРОТИВ)</option>
            </select>
            <div className="modal-buttons">
              <button className="modal-btn confirm" onClick={addArgument}>ДОБАВИТЬ</button>
              <button className="modal-btn cancel" onClick={() => setShowAddModal(false)}>ОТМЕНА</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal active" onClick={(e) => e.target.className === 'modal active' && setShowDeleteModal(false)}>
          <div className="modal-content" style={{ textAlign: 'center' }}>
            <h3>Удалить аргумент?</h3>
            <p style={{ color: 'var(--text-secondary)', margin: '20px 0' }}>«{deleteTarget.text}»</p>
            <div className="modal-buttons">
              <button className="modal-btn confirm" style={{ background: 'var(--no-color)' }} onClick={confirmDelete}>УДАЛИТЬ</button>
              <button className="modal-btn cancel" onClick={() => setShowDeleteModal(false)}>ОТМЕНА</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;