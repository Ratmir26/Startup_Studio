(function() {
    // --- Audio ---
    let audioCtx;
    function getAudioContext() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        return audioCtx;
    }
    function playClick() {
        try {
            const ctx = getAudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 1000;
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.05);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.05);
        } catch(e) {}
    }

    function vibrate(ms = 50) {
        if (navigator.vibrate) navigator.vibrate(ms);
    }

    // --- Toast ---
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);

    function showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('removing');
            toast.addEventListener('animationend', () => toast.remove());
        }, duration);
    }

    // --- Undo ---
    const undoBar = document.createElement('div');
    undoBar.className = 'undo-bar';
    undoBar.innerHTML = '<span id="undoText"></span><button class="undo-btn" id="undoBtn">ОТМЕНА</button>';
    document.body.appendChild(undoBar);

    let undoTimeout = null;
    let undoAction = null;

    function showUndoBar(text, action, duration = 5000) {
        clearTimeout(undoTimeout);
        document.getElementById('undoText').textContent = text;
        undoAction = action;
        undoBar.classList.add('visible');
        document.getElementById('undoBtn').onclick = () => { undoAction(); hideUndoBar(); };
        undoTimeout = setTimeout(hideUndoBar, duration);
    }

    function hideUndoBar() {
        undoBar.classList.remove('visible');
        undoAction = null;
    }

    // --- Data ---
    let isDark = true;
    let validationState = null;
    let currentIdea = localStorage.getItem('currentIdea') || '';
    let argumentsData = { pro: [], con: [] };
    let argumentWeights = { pro: {}, con: {} };
    let selectedCard = null;
    let selectedDelete = { type: null, index: null };
    let longPressTimer = null;

    // --- Hypothesis Survey ---
    let surveyStep = 0;
    let surveyAnswers = {};

    // --- DOM ---
    const themeToggleBtn = document.getElementById('themeToggle');
    const validationToggle = document.getElementById('validationToggle');
    const proList = document.getElementById('proList');
    const conList = document.getElementById('conList');
    const argumentModal = document.getElementById('argumentModal');
    const argumentInput = document.getElementById('argumentInput');
    const typeSelect = document.getElementById('typeSelect');
    const progressBar = document.getElementById('progressBar');
    const progressPercent = document.getElementById('progressPercent');
    const proCountSpan = document.getElementById('proCount');
    const conCountSpan = document.getElementById('conCount');
    const scoreDisplay = document.getElementById('scoreDisplay');
    const confirmDeleteModal = document.getElementById('confirmDeleteModal');
    const deleteText = document.getElementById('deleteText');
    const verdictEl = document.getElementById('verdict');
    const confidenceText = document.getElementById('confidenceText');
    const ideaInput = document.getElementById('ideaInput');
    const charCounter = document.getElementById('charCounter');
    const hypothesisModal = document.getElementById('hypothesisModal');
    const audienceInput = document.getElementById('audienceInput');
    const prevStepBtn = document.getElementById('prevStepBtn');
    const nextStepBtn = document.getElementById('nextStepBtn');
    const surveyResult = document.getElementById('surveyResult');

    // --- Weight selector ---
    let selectedWeight = 'medium';

    function initWeightSelector() {
        const container = document.getElementById('weightSelector');
        if (!container) return;
        container.innerHTML = '';
        ['weak', 'medium', 'strong'].forEach(weight => {
            const btn = document.createElement('button');
            btn.className = `weight-option ${weight === selectedWeight ? 'selected' : ''}`;
            btn.dataset.weight = weight;
            const labels = { weak: 'Слабый', medium: 'Средний', strong: 'Сильный' };
            btn.textContent = labels[weight];
            btn.addEventListener('click', () => {
                playClick();
                selectedWeight = weight;
                container.querySelectorAll('.weight-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
            container.appendChild(btn);
        });
    }

    // --- History ---
    function getHistory() {
        try { return JSON.parse(localStorage.getItem('ideaHistory') || '[]'); } catch { return []; }
    }

    function saveToHistory() {
        const { verdict, score } = getVerdict();
        const entry = {
            idea: currentIdea || 'Без названия',
            verdict, score,
            proCount: argumentsData.pro.length,
            conCount: argumentsData.con.length,
            savedAt: new Date().toISOString(),
            arguments: JSON.parse(JSON.stringify(argumentsData)),
            weights: JSON.parse(JSON.stringify(argumentWeights))
        };
        const history = getHistory();
        history.unshift(entry);
        if (history.length > 50) history.pop();
        localStorage.setItem('ideaHistory', JSON.stringify(history));
    }

    function loadFromHistory(entry) {
        currentIdea = entry.idea;
        ideaInput.value = entry.idea;
        localStorage.setItem('currentIdea', currentIdea);
        argumentsData = JSON.parse(JSON.stringify(entry.arguments));
        argumentWeights = entry.weights || { pro: {}, con: {} };
        saveArguments();
        saveWeights();
        renderAllArguments();
        updateProgress();
        closeHistoryPanel();
        showToast('Идея загружена из истории', 'success');
    }

    function clearHistory() {
        localStorage.removeItem('ideaHistory');
        renderHistoryPanel();
        showToast('История очищена', 'info');
    }

    // --- History Panel ---
    const historyPanel = document.createElement('div');
    historyPanel.className = 'history-panel';
    historyPanel.id = 'historyPanel';
    document.body.appendChild(historyPanel);

    const historyOverlay = document.createElement('div');
    historyOverlay.className = 'history-overlay';
    historyOverlay.id = 'historyOverlay';
    document.body.appendChild(historyOverlay);

    function openHistoryPanel() {
        playClick();
        renderHistoryPanel();
        historyPanel.classList.add('open');
        historyOverlay.classList.add('visible');
    }

    function closeHistoryPanel() {
        historyPanel.classList.remove('open');
        historyOverlay.classList.remove('visible');
    }

    function renderHistoryPanel() {
        const history = getHistory();
        let html = `
            <h3>
                История идей
                <button class="history-close" id="historyClose">&times;</button>
            </h3>
        `;
        if (history.length === 0) {
            html += '<div class="history-empty">Пока нет сохранённых идей</div>';
        } else {
            history.forEach((entry, idx) => {
                const date = new Date(entry.savedAt).toLocaleDateString('ru-RU', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                });
                const emoji = { promising: '🚀', weak: '❌', uncertain: '⚖️' };
                html += `
                    <div class="history-item" data-idx="${idx}">
                        <div class="history-item-title">${escapeHtml(entry.idea)}</div>
                        <div class="history-item-meta">
                            <span>${date}</span>
                            <span class="history-item-verdict">${emoji[entry.verdict] || '🤔'} ${entry.score > 0 ? '+' : ''}${entry.score}</span>
                        </div>
                    </div>
                `;
            });
        }
        html += `
            <div class="history-actions">
                <button class="new-idea-btn" id="newIdeaBtn">+ Новая идея</button>
                <button class="history-clear-btn" id="clearHistoryBtn">Очистить</button>
            </div>
        `;
        historyPanel.innerHTML = html;

        document.getElementById('historyClose').addEventListener('click', closeHistoryPanel);
        historyPanel.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => { loadFromHistory(history[parseInt(item.dataset.idx)]); });
        });
        document.getElementById('newIdeaBtn').addEventListener('click', () => { newIdea(); closeHistoryPanel(); });
        document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
    }

    historyOverlay.addEventListener('click', closeHistoryPanel);

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // --- Onboarding ---
    function showOnboarding() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'onboardingModal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>👋 Добро пожаловать!</h3>
                <p style="color: var(--text-secondary); margin-bottom: 20px; line-height: 1.8;">
                    <strong>Валидатор идей</strong> помогает проверить гипотезу до того, как ты потратишь время и ресурсы.
                </p>
                <ol style="color: var(--text-secondary); margin-bottom: 20px; padding-left: 20px; line-height: 2;">
                    <li>Введи свою идею</li>
                    <li>Добавь аргументы <span style="color: var(--yes-color);">ЗА</span> и <span style="color: var(--no-color);">ПРОТИВ</span></li>
                    <li>Укажи вес каждого аргумента</li>
                    <li>Получи вердикт</li>
                </ol>
                <div style="background: var(--bg-card); border-radius: 10px; padding: 15px; margin-bottom: 20px;">
                    <p style="color: var(--accent); font-weight: 600; margin-bottom: 8px;">⌨️ Горячие клавиши:</p>
                    <p style="color: var(--text-secondary); font-size: 0.9rem;">
                        <kbd>Ctrl+S</kbd> — сохранить в историю<br>
                        <kbd>Ctrl+N</kbd> — новая идея<br>
                        <kbd>Delete</kbd> — удалить выбранный аргумент<br>
                        <kbd>Esc</kbd> — закрыть окно
                    </p>
                </div>
                <div class="modal-buttons">
                    <button class="modal-btn confirm" id="onboardingStart">Начать</button>
                    <button class="modal-btn cancel" id="onboardingDemo">Демо-режим</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('onboardingStart').addEventListener('click', () => {
            playClick();
            localStorage.setItem('visited', 'true');
            modal.remove();
            ideaInput.focus();
        });

        document.getElementById('onboardingDemo').addEventListener('click', () => {
            playClick();
            localStorage.setItem('visited', 'true');
            loadDemoData();
            modal.remove();
            showToast('Демо-данные загружены', 'info');
        });
    }

    function loadDemoData() {
        argumentsData = {
            pro: [
                "Засыпаю на первых двух уроках",
                "Нет времени даже на прогулку",
                "Прихожу домой только чтобы поспать",
                "Теряется интерес к учёбе из-за усталости",
                "Постоянный стресс и недосып ведут к болезням"
            ],
            con: [
                "Без полных уроков не сдать ЕГЭ",
                "В школе и так мало часов по базе",
                'Ученики выберут только "халяву"',
                "Учителя не успеют выдать программу",
                "Родители будут против свободного посещения"
            ]
        };
        argumentWeights = {
            pro: { "0": "strong", "1": "strong", "2": "medium", "3": "strong", "4": "medium" },
            con: { "0": "strong", "1": "medium", "2": "weak", "3": "medium", "4": "strong" }
        };
        currentIdea = "Сократить уроки и дать свободу выбора ученикам";
        ideaInput.value = currentIdea;
        localStorage.setItem('currentIdea', currentIdea);
        saveArguments();
        saveWeights();
        renderAllArguments();
        updateProgress();
    }

    // --- Theme ---
    function applyTheme(dark) {
        document.body.classList.toggle('light-theme', !dark);
        themeToggleBtn.textContent = dark ? '☀️ СВЕТЛАЯ' : '🌙 ТЁМНАЯ';
    }

    function toggleTheme() {
        playClick(); vibrate();
        isDark = !isDark;
        applyTheme(isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    // --- Validation Toggle ---
    function updateValidationUI() {
        validationToggle.classList.remove('yes-active', 'no-active');
        if (validationState === 'yes') validationToggle.classList.add('yes-active');
        else if (validationState === 'no') validationToggle.classList.add('no-active');
    }

    function toggleValidation() {
        playClick(); vibrate();
        if (validationState === null) validationState = 'yes';
        else if (validationState === 'yes') validationState = 'no';
        else validationState = null;
        updateValidationUI();
        localStorage.setItem('validation', validationState);
        const success = validationToggle.querySelector('.toggle-success');
        success.style.animation = 'none';
        setTimeout(() => success.style.animation = 'checkmark 0.5s forwards', 10);
    }

    // --- Weight mapping ---
    const weightValues = { weak: 1, medium: 2, strong: 3 };

    // --- Verdict Logic ---
    function getVerdict() {
        const proWeighted = argumentsData.pro.reduce((sum, _, i) => {
            return sum + (weightValues[argumentWeights.pro[String(i)]] || 2);
        }, 0);
        const conWeighted = argumentsData.con.reduce((sum, _, i) => {
            return sum + (weightValues[argumentWeights.con[String(i)]] || 2);
        }, 0);
        const pro = argumentsData.pro.length;
        const con = argumentsData.con.length;
        const total = pro + con;
        const score = proWeighted - conWeighted;

        let verdict, className, confidence, verdictKey;
        if (total === 0) {
            verdict = '🤔 Нужно больше данных';
            className = 'neutral';
            confidence = 'Нет данных';
            verdictKey = 'uncertain';
        } else if (total < 3) {
            verdict = '🤔 Нужно больше данных';
            className = 'neutral';
            confidence = 'Мало данных';
            verdictKey = 'uncertain';
        } else if (proWeighted > conWeighted * 1.5) {
            verdict = '🚀 Идея перспективная!';
            className = 'positive';
            confidence = 'Достаточно данных';
            verdictKey = 'promising';
        } else if (conWeighted > proWeighted * 1.5) {
            verdict = '❌ Идея слабая';
            className = 'negative';
            confidence = 'Достаточно данных';
            verdictKey = 'weak';
        } else if (score > 0) {
            verdict = '👍 Скорее перспективная';
            className = 'positive';
            confidence = total >= 5 ? 'Достаточно данных' : 'Мало данных';
            verdictKey = 'promising';
        } else if (score < 0) {
            verdict = '👎 Скорее слабая';
            className = 'negative';
            confidence = total >= 5 ? 'Достаточно данных' : 'Мало данных';
            verdictKey = 'weak';
        } else {
            verdict = '⚖️ Равновесие';
            className = 'neutral';
            confidence = 'Нужно больше аргументов';
            verdictKey = 'uncertain';
        }

        return { verdict, className, score, confidence, verdictKey, proWeighted, conWeighted };
    }

    function updateVerdict() {
        const { verdict, className, score, confidence } = getVerdict();
        verdictEl.textContent = verdict;
        verdictEl.className = className;
        scoreDisplay.textContent = (score > 0 ? '+' : '') + score;
        if (confidenceText) confidenceText.textContent = `Статус: ${confidence}`;
    }

    // --- Render arguments ---
    function createCardElement(type, text, index) {
        const card = document.createElement('div');
        card.className = 'argument-card';
        card.dataset.type = type;
        card.dataset.index = index;
        card.title = 'Клик — выбрать. Двойной клик — редактировать. Delete — удалить';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');

        const contentDiv = document.createElement('div');
        contentDiv.className = 'argument-content';

        const textSpan = document.createElement('span');
        textSpan.className = 'argument-text';
        textSpan.textContent = text;
        contentDiv.appendChild(textSpan);

        const weightKey = String(index);
        const currentWeight = argumentWeights[type][weightKey] || 'medium';
        const weightBadge = document.createElement('span');
        weightBadge.className = `weight-badge weight-${currentWeight}`;
        const weightLabels = { weak: 'слабый', medium: 'средний', strong: 'сильный' };
        weightBadge.textContent = weightLabels[currentWeight];
        contentDiv.appendChild(weightBadge);

        card.appendChild(contentDiv);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'argument-actions';

        const weightSelector = document.createElement('div');
        weightSelector.className = 'weight-selector';
        ['weak', 'medium', 'strong'].forEach(w => {
            const dot = document.createElement('button');
            dot.className = `weight-dot ${w === currentWeight ? 'active' : ''}`;
            dot.title = weightLabels[w];
            dot.setAttribute('aria-label', `Вес: ${weightLabels[w]}`);
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                argumentWeights[type][weightKey] = w;
                saveWeights();
                renderAllArguments();
                updateProgress();
                playClick();
            });
            weightSelector.appendChild(dot);
        });
        actionsDiv.appendChild(weightSelector);

        const delBtn = document.createElement('button');
        delBtn.className = 'delete-argument-btn';
        delBtn.innerHTML = '🗑';
        delBtn.title = 'Удалить аргумент';
        delBtn.setAttribute('aria-label', 'Удалить');
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(card.dataset.index, 10);
            const tp = card.dataset.type;
            openDeleteConfirm(tp, idx, argumentsData[tp][idx]);
        });
        actionsDiv.appendChild(delBtn);

        card.appendChild(actionsDiv);

        return card;
    }

    function renderAllArguments() {
        proList.innerHTML = '';
        conList.innerHTML = '';
        argumentsData.pro.forEach((text, i) => {
            const card = createCardElement('pro', text, i);
            proList.appendChild(card);
            observer.observe(card);
        });
        argumentsData.con.forEach((text, i) => {
            const card = createCardElement('con', text, i);
            conList.appendChild(card);
            observer.observe(card);
        });
    }

    function saveArguments() { localStorage.setItem('arguments', JSON.stringify(argumentsData)); }
    function saveWeights() { localStorage.setItem('argumentWeights', JSON.stringify(argumentWeights)); }

    // --- Progress Bar ---
    function updateProgress() {
        const { score, proWeighted, conWeighted } = getVerdict();
        const total = proWeighted + conWeighted;
        const percent = total === 0 ? 50 : Math.round((proWeighted / total) * 100);
        progressBar.style.width = percent + '%';
        progressBar.textContent = percent + '%';
        progressPercent.textContent = percent + '%';

        let color;
        if (percent <= 33) {
            color = 'linear-gradient(90deg, var(--no-color), var(--warning-color))';
        } else if (percent <= 66) {
            color = 'linear-gradient(90deg, var(--warning-color), var(--yes-color))';
        } else {
            color = 'linear-gradient(90deg, var(--yes-color), var(--accent))';
        }
        progressBar.style.background = color;

        proCountSpan.textContent = argumentsData.pro.length;
        conCountSpan.textContent = argumentsData.con.length;
        updateVerdict();
    }

    // --- Delete with undo ---
    function openDeleteConfirm(type, index, text) {
        playClick(); vibrate();
        selectedDelete = { type, index };
        deleteText.textContent = `«${text}»`;
        confirmDeleteModal.classList.add('active');
    }

    function closeDeleteConfirm() {
        confirmDeleteModal.classList.remove('active');
        selectedDelete = { type: null, index: null };
    }

    function confirmDelete() {
        if (!selectedDelete.type) return;
        playClick(); vibrate();
        const { type, index } = selectedDelete;
        const deletedText = argumentsData[type][index];
        const deletedWeight = argumentWeights[type][String(index)];

        if (selectedCard && selectedCard.type === type && selectedCard.index === index) selectedCard = null;

        argumentsData[type].splice(index, 1);
        const newWeights = {};
        Object.keys(argumentWeights[type]).forEach(key => {
            const k = parseInt(key);
            if (k < index) newWeights[String(k)] = argumentWeights[type][key];
            else if (k > index) newWeights[String(k - 1)] = argumentWeights[type][key];
        });
        argumentWeights[type] = newWeights;

        saveArguments();
        saveWeights();
        renderAllArguments();
        updateProgress();
        closeDeleteConfirm();

        showToast('Аргумент удалён', 'info');
        showUndoBar('Аргумент удалён', () => {
            argumentsData[type].splice(index, 0, deletedText);
            const restoredWeights = {};
            Object.keys(argumentWeights[type]).forEach(key => {
                const k = parseInt(key);
                if (k >= index) restoredWeights[String(k + 1)] = argumentWeights[type][key];
                else restoredWeights[String(k)] = argumentWeights[type][key];
            });
            restoredWeights[String(index)] = deletedWeight || 'medium';
            argumentWeights[type] = restoredWeights;
            saveArguments();
            saveWeights();
            renderAllArguments();
            updateProgress();
            showToast('Аргумент восстановлен', 'success');
        });
    }

    // --- Card selection ---
    function selectCard(type, index) {
        if (selectedCard) {
            const prev = document.querySelector(`.argument-card[data-type="${selectedCard.type}"][data-index="${selectedCard.index}"]`);
            if (prev) prev.classList.remove('selected');
        }
        selectedCard = { type, index };
        const card = document.querySelector(`.argument-card[data-type="${type}"][data-index="${index}"]`);
        if (card) card.classList.add('selected');
        playClick(); vibrate(30);
    }

    // --- Edit on double click ---
    function handleDoubleClick(e) {
        const card = e.target.closest('.argument-card');
        if (!card || card.classList.contains('removing')) return;
        const type = card.dataset.type;
        const index = parseInt(card.dataset.index, 10);
        const currentText = argumentsData[type][index];
        if (card.querySelector('input')) return;

        const textSpan = card.querySelector('.argument-text');
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentText;
        input.className = 'argument-edit-input';
        textSpan.replaceWith(input);
        input.focus();

        function finishEdit() {
            const newText = input.value.trim();
            if (newText && newText !== currentText) {
                const duplicate = argumentsData[type].some((t, i) => i !== index && t.toLowerCase() === newText.toLowerCase());
                if (duplicate) {
                    showToast('Такой аргумент уже есть', 'error');
                    const newSpan = document.createElement('span');
                    newSpan.className = 'argument-text';
                    newSpan.textContent = currentText;
                    input.replaceWith(newSpan);
                    return;
                }
                argumentsData[type][index] = newText;
                saveArguments();
                updateProgress();
                showToast('Аргумент обновлён', 'success');
            }
            const newSpan = document.createElement('span');
            newSpan.className = 'argument-text';
            newSpan.textContent = newText || currentText;
            input.replaceWith(newSpan);
        }

        input.addEventListener('blur', finishEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
            if (e.key === 'Escape') { input.value = currentText; input.blur(); }
        });
        playClick();
    }

    // --- Single click ---
    function handleSingleClick(e) {
        const card = e.target.closest('.argument-card');
        if (!card || card.classList.contains('removing')) return;
        if (e.target.tagName === 'INPUT' || e.target.closest('.delete-argument-btn') || e.target.closest('.weight-selector')) return;
        const type = card.dataset.type;
        const index = parseInt(card.dataset.index, 10);
        selectCard(type, index);
    }

    // --- Long press ---
    function handleTouchStart(e) {
        const card = e.target.closest('.argument-card');
        if (!card) return;
        const type = card.dataset.type;
        const index = parseInt(card.dataset.index, 10);
        longPressTimer = setTimeout(() => {
            openDeleteConfirm(type, index, argumentsData[type][index]);
            vibrate(100);
        }, 600);
    }

    function handleTouchEnd() { clearTimeout(longPressTimer); }

    // --- Modal Add ---
    function openModal(presetType = 'pro') {
        playClick();
        typeSelect.value = presetType;
        argumentInput.value = '';
        selectedWeight = 'medium';
        initWeightSelector();
        argumentModal.classList.add('active');
        argumentInput.focus();
    }

    function closeModal() {
        argumentModal.classList.remove('active');
    }

    function addArgumentFromModal() {
        const text = argumentInput.value.trim();
        if (!text) {
            showToast('Введите аргумент', 'error');
            argumentInput.focus();
            return;
        }
        if (text.length < 3) {
            showToast('Аргумент слишком короткий (мин. 3 символа)', 'error');
            argumentInput.focus();
            return;
        }
        const type = typeSelect.value;
        const duplicate = argumentsData[type].some(t => t.toLowerCase() === text.toLowerCase());
        if (duplicate) {
            showToast('Такой аргумент уже есть', 'error');
            argumentInput.focus();
            return;
        }
        playClick(); vibrate();
        argumentsData[type].push(text);
        argumentWeights[type][String(argumentsData[type].length - 1)] = selectedWeight;
        saveArguments();
        saveWeights();
        renderAllArguments();
        updateProgress();
        closeModal();
        showToast('Аргумент добавлен', 'success');
    }

    // --- Hypothesis Survey ---
    function openHypothesisModal() {
        playClick(); vibrate();
        surveyStep = 0;
        surveyAnswers = {};
        if (audienceInput) audienceInput.value = '';
        document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
        updateSurveySteps();
        hypothesisModal.classList.add('active');
    }

    function closeHypothesisModal() {
        hypothesisModal.classList.remove('active');
    }

    function updateSurveySteps() {
        document.querySelectorAll('.hypothesis-step').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.step-dot').forEach(d => d.classList.remove('active'));
        const target = surveyStep < 5 ? `.hypothesis-step[data-step="${surveyStep}"]` : '.hypothesis-step[data-step="result"]';
        const stepDot = document.querySelector(`.step-dot[data-step="${Math.min(surveyStep, 4)}"]`);
        const el = document.querySelector(target);
        if (el) el.classList.add('active');
        if (stepDot) stepDot.classList.add('active');
        if (prevStepBtn) prevStepBtn.style.display = surveyStep > 0 ? 'inline-block' : 'none';
        if (nextStepBtn) nextStepBtn.textContent = surveyStep >= 5 ? 'Завершить' : 'Далее →';
    }

    function nextStep() {
        if (surveyStep === 0) {
            const val = audienceInput ? audienceInput.value.trim() : '';
            if (!val) { showToast('Введите целевую аудиторию', 'error'); return; }
            surveyAnswers.audience = val;
        } else if (surveyStep >= 1 && surveyStep <= 4) {
            const names = ['frequency', 'payment', 'competitors', 'test'];
            const selected = document.querySelector(`input[name="${names[surveyStep - 1]}"]:checked`);
            if (!selected) { showToast('Выберите один из вариантов', 'error'); return; }
            surveyAnswers[names[surveyStep - 1]] = parseInt(selected.value);
        }
        surveyStep++;
        if (surveyStep > 5) { showSurveyResult(); return; }
        updateSurveySteps();
    }

    function prevStep() {
        if (surveyStep > 0) surveyStep--;
        updateSurveySteps();
    }

    function showSurveyResult() {
        updateSurveySteps();
        const names = ['frequency', 'payment', 'competitors', 'test'];
        const maxScore = 20;
        let actualScore = 4;
        names.forEach(n => { actualScore += surveyAnswers[n] || 0; });
        actualScore = Math.min(actualScore, maxScore);
        const percent = Math.round((actualScore / maxScore) * 100);
        let emoji, text, color;
        if (actualScore >= 16) {
            emoji = '🚀'; text = 'Отличная идея для проверки!'; color = 'var(--yes-color)';
        } else if (actualScore >= 11) {
            emoji = '👍'; text = 'Хорошая идея, но есть вопросы'; color = 'var(--warning-color)';
        } else if (actualScore >= 6) {
            emoji = '⚠️'; text = 'Нужно больше исследований'; color = '#ff8800';
        } else {
            emoji = '🛑'; text = 'Пока рано, доработай идею'; color = 'var(--no-color)';
        }
        if (surveyResult) {
            surveyResult.innerHTML = `
                <h2>${emoji} ${actualScore}/${maxScore}</h2>
                <p style="color:${color};font-weight:600;font-size:1.2rem;margin:10px 0;">${text}</p>
                <p style="color:var(--text-secondary);">Целевая аудитория: ${surveyAnswers.audience || '—'}</p>
                <div style="margin-top:15px;background:var(--bg-card);border-radius:8px;height:20px;overflow:hidden;">
                    <div style="height:100%;width:${percent}%;background:${color};border-radius:8px;transition:width 0.5s;"></div>
                </div>
            `;
        }
    }

    // --- Idea Input ---
    function updateCharCounter() {
        const len = ideaInput.value.length;
        const max = 150;
        charCounter.textContent = `${len}/${max}`;
        charCounter.classList.remove('warn', 'error');
        if (len > max) { charCounter.classList.add('error'); ideaInput.classList.add('input-error'); }
        else if (len > max * 0.8) { charCounter.classList.add('warn'); ideaInput.classList.remove('input-error'); }
        else { ideaInput.classList.remove('input-error'); }
    }

    ideaInput.addEventListener('input', () => {
        const val = ideaInput.value.slice(0, 150);
        ideaInput.value = val;
        currentIdea = val;
        localStorage.setItem('currentIdea', currentIdea);
        updateCharCounter();
    });

    // --- New Idea ---
    function newIdea() {
        saveToHistory();
        currentIdea = '';
        ideaInput.value = '';
        argumentsData = { pro: [], con: [] };
        argumentWeights = { pro: {}, con: {} };
        validationState = null;
        updateValidationUI();
        localStorage.setItem('currentIdea', '');
        localStorage.setItem('validation', '');
        saveArguments();
        saveWeights();
        renderAllArguments();
        updateProgress();
        ideaInput.focus();
        showToast('Новая идея начата', 'success');
    }

    // --- Share / Export ---
    function shareIdea() {
        playClick();
        const idea = ideaInput.value.trim() || currentIdea || 'Моя идея';
        const shareData = {
            title: 'Валидация идеи',
            text: `Я проверяю идею: "${idea}". Помоги аргументами!`,
            url: window.location.href
        };
        if (navigator.share) navigator.share(shareData).catch(() => copyToClipboard(shareData.text));
        else copyToClipboard(shareData.text);
    }

    function copyArgumentsToClipboard() {
        playClick(); vibrate();
        const idea = ideaInput.value.trim() || currentIdea || 'Моя идея';
        const proText = argumentsData.pro.map((t, i) => `${i+1}. ${t} [${argumentWeights.pro[String(i)] || 'medium'}]`).join('\n');
        const conText = argumentsData.con.map((t, i) => `${i+1}. ${t} [${argumentWeights.con[String(i)] || 'medium'}]`).join('\n');
        const { verdict } = getVerdict();
        copyToClipboard(`Идея: ${idea}\nВердикт: ${verdict}\n\nЗА:\n${proText}\n\nПРОТИВ:\n${conText}`);
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => showToast('Скопировано в буфер обмена!', 'success'))
            .catch(() => showToast('Не удалось скопировать', 'error'));
    }

    function downloadTxt() {
        playClick(); vibrate();
        const idea = ideaInput.value.trim() || currentIdea || 'Моя идея';
        const proLines = argumentsData.pro.map(t => `+ ${t}`);
        const conLines = argumentsData.con.map(t => `- ${t}`);
        const { verdict } = getVerdict();
        const content = `Валидация идеи: "${idea}"\nВердикт: ${verdict}\n\nЗА:\n${proLines.join('\n')}\n\nПРОТИВ:\n${conLines.join('\n')}`;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'validation-result.txt';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Файл скачан', 'success');
    }

    function exportJSON() {
        playClick(); vibrate();
        const idea = ideaInput.value.trim() || currentIdea || 'Моя идея';
        const { verdict, score, verdictKey } = getVerdict();
        const data = { idea, validationState, arguments: argumentsData, weights: argumentWeights, verdict: { text: verdict, score, key: verdictKey }, exportedAt: new Date().toISOString() };
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'validation-data.json';
        a.click();
        URL.revokeObjectURL(url);
        showToast('JSON экспортирован', 'success');
    }

    function importJSON(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.arguments && data.arguments.pro && data.arguments.con) {
                    saveToHistory();
                    argumentsData = data.arguments;
                    argumentWeights = data.weights || { pro: {}, con: {} };
                    saveArguments();
                    saveWeights();
                    renderAllArguments();
                    updateProgress();
                    if (data.idea) { currentIdea = data.idea; ideaInput.value = data.idea; localStorage.setItem('currentIdea', data.idea); }
                    if (data.validationState) { validationState = data.validationState; updateValidationUI(); localStorage.setItem('validation', data.validationState); }
                    updateCharCounter();
                    showToast('Данные импортированы!', 'success');
                } else showToast('Неверный формат файла', 'error');
            } catch(err) { showToast('Ошибка чтения файла', 'error'); }
        };
        reader.readAsText(file);
    }

    // --- Intersection Observer ---
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
    }, { threshold: 0.1 });

    // --- Event Listeners ---
    themeToggleBtn.addEventListener('click', toggleTheme);
    validationToggle.addEventListener('click', toggleValidation);

    const ctaBtn = document.getElementById('ctaBtn');
    if (ctaBtn) {
        ctaBtn.addEventListener('click', () => {
            playClick(); vibrate();
            ideaInput.focus();
            ideaInput.scrollIntoView({ behavior: 'smooth' });
        });
    }

    document.querySelectorAll('.add-argument-btn').forEach(btn => {
        btn.addEventListener('click', () => openModal(btn.dataset.type));
    });

    document.getElementById('addArgumentBtn').addEventListener('click', addArgumentFromModal);
    document.getElementById('cancelModalBtn').addEventListener('click', closeModal);
    argumentModal.addEventListener('click', (e) => { if (e.target === argumentModal) closeModal(); });

    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
    document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteConfirm);
    confirmDeleteModal.addEventListener('click', (e) => { if (e.target === confirmDeleteModal) closeDeleteConfirm(); });

    proList.addEventListener('click', handleSingleClick);
    conList.addEventListener('click', handleSingleClick);
    proList.addEventListener('dblclick', handleDoubleClick);
    conList.addEventListener('dblclick', handleDoubleClick);
    proList.addEventListener('touchstart', handleTouchStart);
    conList.addEventListener('touchstart', handleTouchStart);
    proList.addEventListener('touchend', handleTouchEnd);
    conList.addEventListener('touchend', handleTouchEnd);
    proList.addEventListener('touchmove', handleTouchEnd);
    conList.addEventListener('touchmove', handleTouchEnd);

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.argument-card') && !e.target.closest('.modal')) {
            if (selectedCard) {
                const prev = document.querySelector(`.argument-card[data-type="${selectedCard.type}"][data-index="${selectedCard.index}"]`);
                if (prev) prev.classList.remove('selected');
                selectedCard = null;
            }
        }
    });

    document.getElementById('shareIdeaBtn').addEventListener('click', shareIdea);
    document.getElementById('copyArgsBtn').addEventListener('click', copyArgumentsToClipboard);
    document.getElementById('downloadBtn').addEventListener('click', downloadTxt);
    document.getElementById('exportJsonBtn').addEventListener('click', exportJSON);
    document.getElementById('importJsonBtn').addEventListener('click', () => {
        playClick();
        document.getElementById('importFileInput').click();
    });
    document.getElementById('importFileInput').addEventListener('change', (e) => {
        if (e.target.files[0]) { importJSON(e.target.files[0]); e.target.value = ''; }
    });

    document.getElementById('checkHypothesisBtn').addEventListener('click', openHypothesisModal);

    if (nextStepBtn) nextStepBtn.addEventListener('click', nextStep);
    if (prevStepBtn) prevStepBtn.addEventListener('click', prevStep);
    if (hypothesisModal) {
        hypothesisModal.addEventListener('click', (e) => {
            if (e.target === hypothesisModal) closeHypothesisModal();
        });
    }

    document.getElementById('historyToggle').addEventListener('click', openHistoryPanel);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (argumentModal.classList.contains('active')) closeModal();
            if (confirmDeleteModal.classList.contains('active')) closeDeleteConfirm();
            if (hypothesisModal && hypothesisModal.classList.contains('active')) closeHypothesisModal();
            if (historyPanel.classList.contains('open')) closeHistoryPanel();
        }
        if (e.key === 'Enter' && argumentModal.classList.contains('active')) addArgumentFromModal();
        if (e.key === 'Delete' && selectedCard && !argumentModal.classList.contains('active') && !confirmDeleteModal.classList.contains('active')) {
            const { type, index } = selectedCard;
            if (argumentsData[type][index] !== undefined) openDeleteConfirm(type, index, argumentsData[type][index]);
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveToHistory(); showToast('Сохранено в историю', 'success'); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); newIdea(); }
    });

    // --- Init ---
    const savedTheme = localStorage.getItem('theme');
    isDark = savedTheme !== 'light';
    applyTheme(isDark);

    const savedValidation = localStorage.getItem('validation');
    if (savedValidation === 'yes' || savedValidation === 'no') validationState = savedValidation;
    updateValidationUI();

    const savedArgs = localStorage.getItem('arguments');
    if (savedArgs) { try { const p = JSON.parse(savedArgs); if (p.pro && p.con) argumentsData = p; } catch(e) {} }

    const savedWeights = localStorage.getItem('argumentWeights');
    if (savedWeights) { try { const p = JSON.parse(savedWeights); if (p.pro && p.con) argumentWeights = p; } catch(e) {} }

    ideaInput.value = currentIdea;
    updateCharCounter();

    renderAllArguments();
    updateProgress();
    updateVerdict();

    if (!localStorage.getItem('visited')) setTimeout(showOnboarding, 500);
})();
