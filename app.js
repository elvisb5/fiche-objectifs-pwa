/* ============================================
   DAILY OBJECTIVES PWA — APP LOGIC
   ============================================ */

// ── Constants ──
const STORAGE_KEY = 'daily-objectives-data';
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS_FR = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
const DAYS_FULL_FR = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];

const CATEGORIES = [
  { id: 'morning',  icon: '🌅', label: 'Routine Matinale',           color: 'morning' },
  { id: 'health',   icon: '💪', label: 'Santé & Discipline',         color: 'health' },
  { id: 'food',     icon: '🍽️', label: 'Alimentation & Hydratation', color: 'food' },
  { id: 'growth',   icon: '📚', label: 'Développement Personnel',    color: 'growth' },
  { id: 'org',      icon: '📋', label: 'Organisation & Finances',    color: 'org' },
  { id: 'evening',  icon: '🌙', label: 'Routine du Soir',            color: 'evening' },
];

const OBJECTIVES = [
  { id: 'wake',      cat: 'morning', text: 'Se réveiller tôt',                           detail: '5h – 6h max' },
  { id: 'pray',      cat: 'morning', text: 'Prier',                                      detail: '' },
  { id: 'nophone',   cat: 'morning', text: 'Déposer le téléphone',                       detail: '2 premières heures' },
  { id: 'sport',     cat: 'health',  text: 'Faire du sport',                              detail: '' },
  { id: 'nosmoke',   cat: 'health',  text: 'Ne pas fumer',                                detail: '🚫 0 cigarette' },
  { id: 'noalcohol', cat: 'health',  text: "Ne pas boire d'alcool",                       detail: '🚫 0 verre' },
  { id: 'bodycare',  cat: 'health',  text: 'Prendre soin de mon corps',                   detail: '' },
  { id: 'sleep8h',   cat: 'health',  text: 'Dormir 8 heures',                             detail: '' },
  { id: 'read',      cat: 'growth',  text: 'Lire au minimum 20 pages',                    detail: '' },
  { id: 'trading',   cat: 'growth',  text: "S'exercer au trading",                        detail: '1h30 – 2h max' },
  { id: 'tidy',      cat: 'org',     text: "Ranger s'il y a du désordre",                 detail: '' },
  { id: 'rdv',       cat: 'org',     text: 'Vérifier & honorer mes rendez-vous',          detail: '' },
  { id: 'save200',   cat: 'org',     text: 'Mettre 200 FCFA de côté',                     detail: '' },
  { id: 'recap',     cat: 'evening', text: 'Faire le récap de la journée',                detail: '' },
  { id: 'plan',      cat: 'evening', text: 'Planifier la journée du lendemain',           detail: '' },
  { id: 'finance',   cat: 'evening', text: "Noter les entrées & sorties d'argent",        detail: '' },
];

// Meals & water are tracked separately
const MEALS = [
  { id: 'breakfast', emoji: '🥐', label: 'Petit-déj' },
  { id: 'lunch',     emoji: '🍛', label: 'Déjeuner' },
  { id: 'dinner',    emoji: '🍽️', label: 'Dîner' },
];

const TOTAL_CHECKABLE = OBJECTIVES.length + MEALS.length; // 19 objectives + 3 meals but let's count properly

// ── State ──
let currentDate = new Date();
let currentView = 'daily';
let calendarDate = new Date();
let synthesisDate = new Date();
let deferredPrompt = null;
let saveTimeout = null;

// ── Data Layer ──
function getAllData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveAllData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function dateKey(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toISOString().split('T')[0];
}

function getDayData(d) {
  const key = dateKey(d);
  const all = getAllData();
  return all[key] || createEmptyDay();
}

function saveDayData(d, dayData) {
  const key = dateKey(d);
  const all = getAllData();
  // Recalculate score before saving
  dayData.score = calculateScore(dayData);
  all[key] = dayData;
  saveAllData(all);
}

function debouncedSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    const data = collectCurrentDayData();
    saveDayData(currentDate, data);
    updateScoreBanner(data);
  }, 300);
}

function createEmptyDay() {
  return {
    objectives: {},
    meals: { breakfast: false, lunch: false, dinner: false },
    water: new Array(16).fill(false),
    finances: [],
    recap: '',
    planning: '',
    score: 0,
  };
}

function calculateScore(data) {
  let score = 0;
  OBJECTIVES.forEach(obj => { if (data.objectives[obj.id]) score++; });
  MEALS.forEach(meal => { if (data.meals[meal.id]) score++; });
  return score;
}

function collectCurrentDayData() {
  const data = getDayData(currentDate);

  // Objectives
  document.querySelectorAll('.objective-item[data-id]').forEach(el => {
    data.objectives[el.dataset.id] = el.classList.contains('checked');
  });

  // Meals
  document.querySelectorAll('.meal-btn[data-meal]').forEach(el => {
    data.meals[el.dataset.meal] = el.classList.contains('checked');
  });

  // Water
  document.querySelectorAll('.water-drop[data-index]').forEach(el => {
    data.water[parseInt(el.dataset.index)] = el.classList.contains('filled');
  });

  // Finances
  const entries = [];
  document.querySelectorAll('.finance-entry').forEach(el => {
    const desc = el.querySelector('.fin-desc')?.value || '';
    const income = parseFloat(el.querySelector('.fin-income')?.value) || 0;
    const expense = parseFloat(el.querySelector('.fin-expense')?.value) || 0;
    if (desc || income || expense) {
      entries.push({ desc, income, expense });
    }
  });
  data.finances = entries;

  // Texts
  const recapEl = document.querySelector('#recap-area');
  const planEl = document.querySelector('#planning-area');
  if (recapEl) data.recap = recapEl.value;
  if (planEl) data.planning = planEl.value;

  return data;
}

// ── Score Messages ──
function getScoreMessage(score) {
  const total = OBJECTIVES.length + MEALS.length;
  const pct = score / total;
  if (pct === 0) return 'Commence ta journée ! 💪';
  if (pct < 0.25) return 'C\'est un début, continue ! 🌱';
  if (pct < 0.5) return 'Tu avances bien ! 🔥';
  if (pct < 0.75) return 'Belle progression ! ⭐';
  if (pct < 1) return 'Presque parfait ! 🏆';
  return 'JOURNÉE PARFAITE ! 👑🎉';
}

function getScoreColor(score) {
  const total = OBJECTIVES.length + MEALS.length;
  const pct = score / total;
  if (pct < 0.25) return '#e06c5a';
  if (pct < 0.5) return '#e8a838';
  if (pct < 0.75) return '#5b8def';
  return '#4caf76';
}

// ── Update Score Banner ──
function updateScoreBanner(data) {
  const total = OBJECTIVES.length + MEALS.length;
  const score = data ? data.score : 0;
  const pct = score / total;

  const ring = document.getElementById('score-ring-fill');
  const circumference = 2 * Math.PI * 42; // r=42
  ring.style.strokeDashoffset = circumference * (1 - pct);
  ring.style.stroke = getScoreColor(score);

  document.getElementById('score-value').textContent = score;
  document.getElementById('score-message').textContent = getScoreMessage(score);
}

// ── Render Daily View ──
function renderDailyView() {
  const container = document.getElementById('objectives-container');
  const data = getDayData(currentDate);
  let html = '';

  CATEGORIES.forEach(cat => {
    const catObjectives = OBJECTIVES.filter(o => o.cat === cat.id);
    const checkedCount = catObjectives.filter(o => data.objectives[o.id]).length;

    // For food category, add meals count
    let totalInCat = catObjectives.length;
    if (cat.id === 'food') {
      totalInCat += MEALS.length;
    }

    let extraChecked = 0;
    if (cat.id === 'food') {
      MEALS.forEach(m => { if (data.meals[m.id]) extraChecked++; });
    }

    html += `<div class="section-card" data-category="${cat.id}">`;
    html += `<div class="section-header">`;
    html += `  <div class="section-icon">${cat.icon}</div>`;
    html += `  <div class="section-title">${cat.label}</div>`;
    html += `  <div class="section-progress">${checkedCount + extraChecked}/${totalInCat}</div>`;
    html += `</div>`;

    // Objectives
    catObjectives.forEach(obj => {
      const checked = data.objectives[obj.id] ? 'checked' : '';
      html += `<div class="objective-item ${checked}" data-id="${obj.id}" onclick="toggleObjective(this)">`;
      html += `  <div class="objective-checkbox"><span class="check-icon">✓</span></div>`;
      html += `  <div class="objective-content">`;
      html += `    <div class="objective-text">${obj.text}</div>`;
      if (obj.detail) {
        html += `    <div class="objective-detail">${obj.detail}</div>`;
      }
      html += `  </div>`;
      if (obj.detail && !obj.detail.startsWith('🚫')) {
        html += `  <div class="objective-badge">${obj.detail}</div>`;
      }
      html += `</div>`;
    });

    // Food-specific: meals + water
    if (cat.id === 'food') {
      // Meals
      html += `<div class="meals-row">`;
      MEALS.forEach(meal => {
        const checked = data.meals[meal.id] ? 'checked' : '';
        html += `<button class="meal-btn ${checked}" data-meal="${meal.id}" onclick="toggleMeal(this)">`;
        html += `  <span class="meal-emoji">${meal.emoji}</span>`;
        html += `  <span>${meal.label}</span>`;
        html += `</button>`;
      });
      html += `</div>`;

      // Water tracker
      const waterCount = data.water.filter(Boolean).length;
      html += `<div class="water-tracker">`;
      html += `  <div class="water-label">💧 Boire de l'eau — <span class="water-count">${waterCount}/16 verres</span></div>`;
      html += `  <div class="water-grid">`;
      for (let i = 0; i < 16; i++) {
        const hour = 6 + i;
        const filled = data.water[i] ? 'filled' : '';
        html += `<div class="water-drop ${filled}" data-index="${i}" onclick="toggleWater(this)">`;
        html += `  <span class="water-hour">${hour}h</span>`;
        html += `</div>`;
      }
      html += `  </div>`;
      html += `</div>`;
    }

    // Organisation: savings + finance table
    if (cat.id === 'org') {
      // Finance entries
      html += `<div class="finance-section">`;
      html += `  <div class="text-section-label">💰 Suivi Entrées / Sorties d'argent</div>`;
      html += `  <div class="finance-entries" id="finance-entries">`;

      if (data.finances.length === 0) {
        html += renderFinanceRow({ desc: '', income: '', expense: '' }, 0);
      } else {
        data.finances.forEach((entry, i) => {
          html += renderFinanceRow(entry, i);
        });
      }

      html += `  </div>`;
      html += `  <button class="finance-add-btn" onclick="addFinanceRow()">+ Ajouter une ligne</button>`;

      // Totals
      const totalIncome = data.finances.reduce((s, e) => s + (e.income || 0), 0);
      const totalExpense = data.finances.reduce((s, e) => s + (e.expense || 0), 0);
      html += `  <div class="finance-total">`;
      html += `    <span class="finance-total-income">▲ ${formatFCFA(totalIncome)}</span>`;
      html += `    <span class="finance-total-expense">▼ ${formatFCFA(totalExpense)}</span>`;
      html += `  </div>`;
      html += `</div>`;
    }

    // Evening: recap + planning
    if (cat.id === 'evening') {
      html += `<div class="text-section">`;
      html += `  <div class="text-section-label">📝 Planning de demain</div>`;
      html += `  <textarea class="text-area" id="planning-area" placeholder="Écrire les tâches de demain..." oninput="debouncedSave()">${escapeHtml(data.planning)}</textarea>`;
      html += `</div>`;
      html += `<div class="text-section">`;
      html += `  <div class="text-section-label">📖 Récap & Notes de la journée</div>`;
      html += `  <textarea class="text-area" id="recap-area" placeholder="Comment s'est passée ta journée ?..." oninput="debouncedSave()">${escapeHtml(data.recap)}</textarea>`;
      html += `</div>`;
    }

    html += `</div>`;
  });

  container.innerHTML = html;
  updateScoreBanner(data);
  updateSectionProgress();
}

function renderFinanceRow(entry, index) {
  return `<div class="finance-entry" data-index="${index}">
    <input type="text" class="fin-desc" placeholder="Description" value="${escapeHtml(entry.desc || '')}" oninput="debouncedSave()">
    <input type="number" class="fin-income" placeholder="Entrée" value="${entry.income || ''}" oninput="updateFinanceTotals(); debouncedSave()">
    <input type="number" class="fin-expense" placeholder="Sortie" value="${entry.expense || ''}" oninput="updateFinanceTotals(); debouncedSave()">
    <button class="finance-delete-btn" onclick="removeFinanceRow(this)" title="Supprimer">✕</button>
  </div>`;
}

function formatFCFA(n) {
  return n.toLocaleString('fr-FR') + ' FCFA';
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Interactive Handlers ──
function toggleObjective(el) {
  el.classList.toggle('checked');
  debouncedSave();
  updateSectionProgress();

  // Haptic feedback if available
  if (navigator.vibrate) navigator.vibrate(10);
}

function toggleMeal(el) {
  el.classList.toggle('checked');
  debouncedSave();
  updateSectionProgress();
  if (navigator.vibrate) navigator.vibrate(10);
}

function toggleWater(el) {
  el.classList.toggle('filled');
  // Update water count
  const count = document.querySelectorAll('.water-drop.filled').length;
  const label = document.querySelector('.water-count');
  if (label) label.textContent = `${count}/16 verres`;
  debouncedSave();
  if (navigator.vibrate) navigator.vibrate(10);
}

function addFinanceRow() {
  const container = document.getElementById('finance-entries');
  const index = container.children.length;
  const div = document.createElement('div');
  div.innerHTML = renderFinanceRow({ desc: '', income: '', expense: '' }, index);
  container.appendChild(div.firstElementChild);
  debouncedSave();
}

function removeFinanceRow(btn) {
  const entry = btn.closest('.finance-entry');
  entry.remove();
  updateFinanceTotals();
  debouncedSave();
}

function updateFinanceTotals() {
  let totalIncome = 0;
  let totalExpense = 0;
  document.querySelectorAll('.finance-entry').forEach(el => {
    totalIncome += parseFloat(el.querySelector('.fin-income')?.value) || 0;
    totalExpense += parseFloat(el.querySelector('.fin-expense')?.value) || 0;
  });
  const totalEl = document.querySelector('.finance-total');
  if (totalEl) {
    totalEl.innerHTML = `
      <span class="finance-total-income">▲ ${formatFCFA(totalIncome)}</span>
      <span class="finance-total-expense">▼ ${formatFCFA(totalExpense)}</span>
    `;
  }
}

function updateSectionProgress() {
  document.querySelectorAll('.section-card').forEach(card => {
    const cat = card.dataset.category;
    const objectives = card.querySelectorAll('.objective-item[data-id]');
    let checked = 0;
    let total = objectives.length;
    objectives.forEach(o => { if (o.classList.contains('checked')) checked++; });

    // Add meals for food category
    if (cat === 'food') {
      const meals = card.querySelectorAll('.meal-btn');
      total += meals.length;
      meals.forEach(m => { if (m.classList.contains('checked')) checked++; });
    }

    const progress = card.querySelector('.section-progress');
    if (progress) progress.textContent = `${checked}/${total}`;
  });
}

// ── Header & Navigation ──
function updateHeader() {
  const title = document.getElementById('header-title');
  const subtitle = document.getElementById('header-subtitle');
  const today = new Date();
  const todayKey = dateKey(today);
  const curKey = dateKey(currentDate);

  if (currentView === 'daily') {
    if (curKey === todayKey) {
      title.textContent = "Aujourd'hui";
    } else if (curKey === dateKey(new Date(today.getTime() - 86400000))) {
      title.textContent = 'Hier';
    } else if (curKey === dateKey(new Date(today.getTime() + 86400000))) {
      title.textContent = 'Demain';
    } else {
      title.textContent = DAYS_FULL_FR[currentDate.getDay()];
    }
    subtitle.textContent = `${currentDate.getDate()} ${MONTHS_FR[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  } else if (currentView === 'calendar') {
    title.textContent = MONTHS_FR[calendarDate.getMonth()];
    subtitle.textContent = calendarDate.getFullYear().toString();
  } else if (currentView === 'synthesis') {
    title.textContent = 'Synthèse';
    subtitle.textContent = `${MONTHS_FR[synthesisDate.getMonth()]} ${synthesisDate.getFullYear()}`;
  }
}

function navigatePrev() {
  if (currentView === 'daily') {
    // Save current before leaving
    saveDayData(currentDate, collectCurrentDayData());
    currentDate = new Date(currentDate.getTime() - 86400000);
    renderDailyView();
  } else if (currentView === 'calendar') {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendarView();
  } else if (currentView === 'synthesis') {
    synthesisDate.setMonth(synthesisDate.getMonth() - 1);
    renderSynthesisView();
  }
  updateHeader();
}

function navigateNext() {
  if (currentView === 'daily') {
    saveDayData(currentDate, collectCurrentDayData());
    currentDate = new Date(currentDate.getTime() + 86400000);
    renderDailyView();
  } else if (currentView === 'calendar') {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendarView();
  } else if (currentView === 'synthesis') {
    synthesisDate.setMonth(synthesisDate.getMonth() + 1);
    renderSynthesisView();
  }
  updateHeader();
}

function switchView(view) {
  // Save current daily data if leaving daily view
  if (currentView === 'daily') {
    saveDayData(currentDate, collectCurrentDayData());
  }

  currentView = view;

  // Show/hide views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`${view}-view`).classList.add('active');

  // Update nav tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.view === view);
  });

  // Show/hide score banner
  const scoreBanner = document.getElementById('score-banner');
  if (view === 'daily') {
    scoreBanner.classList.remove('hidden-banner');
    renderDailyView();
  } else {
    scoreBanner.classList.add('hidden-banner');
    if (view === 'calendar') renderCalendarView();
    if (view === 'synthesis') renderSynthesisView();
  }

  updateHeader();
}

// ── Calendar View ──
function renderCalendarView() {
  const container = document.getElementById('calendar-container');
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const allData = getAllData();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayKey = dateKey(today);

  let html = '';
  html += `<div class="calendar-month-header">${MONTHS_FR[month]} ${year}</div>`;

  // Weekday headers (Mon-Sun)
  html += '<div class="calendar-weekdays">';
  ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].forEach(d => {
    html += `<div class="calendar-weekday">${d}</div>`;
  });
  html += '</div>';

  html += '<div class="calendar-grid">';

  // Empty cells before first day
  // JS getDay(): 0=Sun, adjust for Mon start
  let startOffset = (firstDay + 6) % 7;
  for (let i = 0; i < startOffset; i++) {
    html += '<div class="calendar-day empty"></div>';
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const key = dateKey(d);
    const dayData = allData[key];
    const isToday = key === todayKey;

    let classes = 'calendar-day';
    let scoreText = '';
    let heatClass = '';

    if (isToday) classes += ' today';

    if (dayData) {
      classes += ' has-data';
      const score = dayData.score || 0;
      const total = OBJECTIVES.length + MEALS.length;
      const pct = score / total;
      scoreText = `${score}/${total}`;

      if (pct === 0) heatClass = 'heat-0';
      else if (pct < 0.25) heatClass = 'heat-1';
      else if (pct < 0.5) heatClass = 'heat-2';
      else if (pct < 0.75) heatClass = 'heat-3';
      else if (pct < 1) heatClass = 'heat-4';
      else heatClass = 'heat-5';

      classes += ` ${heatClass}`;
    }

    html += `<div class="${classes}" onclick="goToDay('${key}')">`;
    html += `  <span>${day}</span>`;
    if (scoreText) html += `<span class="day-score">${scoreText}</span>`;
    html += `</div>`;
  }

  html += '</div>';

  // Legend
  html += '<div style="display:flex; justify-content:center; gap:12px; margin-top:20px; flex-wrap:wrap;">';
  html += '<div style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text-dim);"><div style="width:12px;height:12px;border-radius:3px;background:rgba(224,108,90,0.15);border:1px solid var(--border);"></div> &lt;25%</div>';
  html += '<div style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text-dim);"><div style="width:12px;height:12px;border-radius:3px;background:rgba(232,168,56,0.15);border:1px solid var(--border);"></div> 25-49%</div>';
  html += '<div style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text-dim);"><div style="width:12px;height:12px;border-radius:3px;background:rgba(76,175,118,0.15);border:1px solid var(--border);"></div> 50-74%</div>';
  html += '<div style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text-dim);"><div style="width:12px;height:12px;border-radius:3px;background:rgba(76,175,118,0.35);border:1px solid var(--border);"></div> 75-100%</div>';
  html += '</div>';

  container.innerHTML = html;
}

function goToDay(key) {
  currentDate = new Date(key + 'T12:00:00');
  switchView('daily');
}

// ── Synthesis View ──
function renderSynthesisView() {
  const container = document.getElementById('synthesis-container');
  const year = synthesisDate.getFullYear();
  const month = synthesisDate.getMonth();
  const stats = calculateMonthlyStats(year, month);

  if (stats.daysTracked === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <div class="empty-state-text">Pas encore de données pour ${MONTHS_FR[month]} ${year}</div>
      </div>
    `;
    return;
  }

  let html = '';

  // ── Overview stats ──
  html += `<div class="synth-card">`;
  html += `  <div class="synth-card-title">📈 Vue d'ensemble</div>`;
  html += `  <div class="stats-grid">`;
  html += `    <div class="stat-item">
      <div class="stat-value" style="color:var(--morning)">${stats.avgScore.toFixed(1)}</div>
      <div class="stat-label">Score moyen / ${stats.totalCheckable}</div>
    </div>`;
  html += `    <div class="stat-item">
      <div class="stat-value" style="color:var(--health)">${stats.avgPct}%</div>
      <div class="stat-label">Taux de réussite</div>
    </div>`;
  html += `    <div class="stat-item">
      <div class="stat-value" style="color:var(--growth)">${stats.daysTracked}</div>
      <div class="stat-label">Jours suivis</div>
    </div>`;
  html += `    <div class="stat-item">
      <div class="stat-value" style="color:var(--org)">${stats.perfectDays}</div>
      <div class="stat-label">Jours parfaits</div>
    </div>`;
  html += `  </div>`;
  html += `</div>`;

  // ── Score chart ──
  html += `<div class="synth-card">`;
  html += `  <div class="synth-card-title">📊 Scores quotidiens</div>`;
  html += `  <div class="score-chart">`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayData = stats.dailyData[key];
    const score = dayData ? (dayData.score || 0) : 0;
    const maxHeight = 100;
    const height = stats.totalCheckable > 0 ? (score / stats.totalCheckable) * maxHeight : 0;
    const color = dayData ? getScoreColor(score) : 'var(--border)';
    html += `<div class="score-chart-bar" style="height:${Math.max(height, 2)}%;background:${color};">`;
    html += `  <div class="tooltip">${day} ${MONTHS_FR[month].substring(0, 3)} — ${score}/${stats.totalCheckable}</div>`;
    html += `</div>`;
  }
  html += `  </div>`;
  html += `</div>`;

  // ── Category breakdown ──
  html += `<div class="synth-card">`;
  html += `  <div class="synth-card-title">🎯 Par catégorie</div>`;
  CATEGORIES.forEach(cat => {
    const catStats = stats.categories[cat.id];
    if (!catStats) return;
    const pct = catStats.total > 0 ? Math.round((catStats.checked / catStats.total) * 100) : 0;
    html += `<div class="category-bar-row">`;
    html += `  <div class="category-bar-label">${cat.icon} ${cat.label.split(' ')[0]}</div>`;
    html += `  <div class="category-bar-track">`;
    html += `    <div class="category-bar-fill" style="width:${pct}%;background:var(--${cat.color})"></div>`;
    html += `  </div>`;
    html += `  <div class="category-bar-value" style="color:var(--${cat.color})">${pct}%</div>`;
    html += `</div>`;
  });
  html += `</div>`;

  // ── Streaks ──
  html += `<div class="synth-card">`;
  html += `  <div class="synth-card-title">🔥 Séries (Streaks)</div>`;
  const streakItems = [
    { id: 'nosmoke',  emoji: '🚭', name: 'Sans cigarette' },
    { id: 'noalcohol',emoji: '🚫', name: "Sans alcool" },
    { id: 'sport',    emoji: '🏋️', name: 'Sport' },
    { id: 'read',     emoji: '📖', name: 'Lecture' },
    { id: 'pray',     emoji: '🤲', name: 'Prière' },
    { id: 'wake',     emoji: '⏰', name: 'Réveil tôt' },
  ];
  streakItems.forEach(item => {
    const streak = stats.streaks[item.id] || { current: 0, longest: 0 };
    html += `<div class="streak-row">`;
    html += `  <div class="streak-info">`;
    html += `    <span class="streak-emoji">${item.emoji}</span>`;
    html += `    <span class="streak-name">${item.name}</span>`;
    html += `  </div>`;
    html += `  <div>`;
    html += `    <span class="streak-value">${streak.longest}</span>`;
    html += `    <span class="streak-unit">jours max</span>`;
    html += `  </div>`;
    html += `</div>`;
  });
  html += `</div>`;

  // ── Financial summary ──
  html += `<div class="synth-card">`;
  html += `  <div class="synth-card-title">💰 Résumé financier</div>`;
  html += `  <div class="fin-summary-grid">`;
  html += `    <div class="fin-summary-item">
      <div class="fin-summary-value" style="color:var(--health)">${formatFCFA(stats.finance.totalIncome)}</div>
      <div class="fin-summary-label">Entrées</div>
    </div>`;
  html += `    <div class="fin-summary-item">
      <div class="fin-summary-value" style="color:var(--food)">${formatFCFA(stats.finance.totalExpense)}</div>
      <div class="fin-summary-label">Sorties</div>
    </div>`;
  html += `    <div class="fin-summary-item">
      <div class="fin-summary-value" style="color:var(--morning)">${formatFCFA(stats.finance.totalSavings)}</div>
      <div class="fin-summary-label">Épargne (200F/j)</div>
    </div>`;
  html += `  </div>`;
  const net = stats.finance.totalIncome - stats.finance.totalExpense;
  html += `  <div class="finance-total" style="margin-top:14px;">`;
  html += `    <span>Solde net</span>`;
  html += `    <span style="color:${net >= 0 ? 'var(--health)' : 'var(--food)'};font-size:16px;">${net >= 0 ? '+' : ''}${formatFCFA(net)}</span>`;
  html += `  </div>`;
  html += `</div>`;

  container.innerHTML = html;
}

function calculateMonthlyStats(year, month) {
  const allData = getAllData();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCheckable = OBJECTIVES.length + MEALS.length;

  const stats = {
    daysTracked: 0,
    perfectDays: 0,
    totalScore: 0,
    avgScore: 0,
    avgPct: 0,
    totalCheckable,
    dailyData: {},
    categories: {},
    streaks: {},
    finance: { totalIncome: 0, totalExpense: 0, totalSavings: 0 },
  };

  // Init categories
  CATEGORIES.forEach(cat => {
    stats.categories[cat.id] = { checked: 0, total: 0 };
  });

  // Init streaks
  const streakTrackers = {};
  ['nosmoke','noalcohol','sport','read','pray','wake'].forEach(id => {
    streakTrackers[id] = { current: 0, longest: 0 };
  });

  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayData = allData[key];

    if (!dayData) {
      // Reset streaks
      Object.keys(streakTrackers).forEach(id => {
        streakTrackers[id].current = 0;
      });
      continue;
    }

    stats.dailyData[key] = dayData;
    stats.daysTracked++;
    const score = dayData.score || 0;
    stats.totalScore += score;
    if (score >= totalCheckable) stats.perfectDays++;

    // Category stats
    OBJECTIVES.forEach(obj => {
      const catStats = stats.categories[obj.cat];
      catStats.total++;
      if (dayData.objectives && dayData.objectives[obj.id]) catStats.checked++;
    });

    // Meals count in food category
    MEALS.forEach(meal => {
      stats.categories['food'].total++;
      if (dayData.meals && dayData.meals[meal.id]) stats.categories['food'].checked++;
    });

    // Streaks
    Object.keys(streakTrackers).forEach(id => {
      if (dayData.objectives && dayData.objectives[id]) {
        streakTrackers[id].current++;
        streakTrackers[id].longest = Math.max(streakTrackers[id].longest, streakTrackers[id].current);
      } else {
        streakTrackers[id].current = 0;
      }
    });

    // Finance
    if (dayData.finances) {
      dayData.finances.forEach(entry => {
        stats.finance.totalIncome += (entry.income || 0);
        stats.finance.totalExpense += (entry.expense || 0);
      });
    }
    if (dayData.objectives && dayData.objectives.save200) {
      stats.finance.totalSavings += 200;
    }
  }

  stats.avgScore = stats.daysTracked > 0 ? stats.totalScore / stats.daysTracked : 0;
  stats.avgPct = stats.daysTracked > 0 ? Math.round((stats.avgScore / totalCheckable) * 100) : 0;
  stats.streaks = streakTrackers;

  return stats;
}

// ── PWA Install ──
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById('install-banner').classList.remove('hidden');
});

document.addEventListener('DOMContentLoaded', () => {
  // Install button
  document.getElementById('install-btn')?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    document.getElementById('install-banner').classList.add('hidden');
  });

  document.getElementById('install-dismiss')?.addEventListener('click', () => {
    document.getElementById('install-banner').classList.add('hidden');
  });

  // Navigation arrows
  document.getElementById('prev-btn').addEventListener('click', navigatePrev);
  document.getElementById('next-btn').addEventListener('click', navigateNext);

  // Bottom nav
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });

  // Header center tap -> go to today
  document.getElementById('header-center').addEventListener('click', () => {
    if (currentView === 'daily') {
      saveDayData(currentDate, collectCurrentDayData());
      currentDate = new Date();
      renderDailyView();
      updateHeader();
    }
  });

  // Swipe gestures for mobile
  let touchStartX = 0;
  let touchStartY = 0;
  document.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 80 && Math.abs(dy) < 60) {
      if (dx > 0) navigatePrev();
      else navigateNext();
    }
  }, { passive: true });

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  // Init
  renderDailyView();
  updateHeader();
});

// Save data when leaving page
window.addEventListener('beforeunload', () => {
  if (currentView === 'daily') {
    saveDayData(currentDate, collectCurrentDayData());
  }
});

// Visibility change -> save
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && currentView === 'daily') {
    saveDayData(currentDate, collectCurrentDayData());
  }
});
