/* ===================================================================
   Rosewood Journal — fully functional client-side planner.
   Dashboard, journal, priorities, habit tracker, monthly calendar,
   mood board, settings (dark mode / export / import) — all stored in
   localStorage, so it survives reloads. No build step, no server.
=================================================================== */

const STORAGE_KEY = 'rosewoodJournalV2';

const MOOD_META = {
  Grateful: { dot: '#D98CA0', pillBg: '#F0DDBF', pillText: '#8A5A15' },
  Calm:     { dot: '#A6BB93', pillBg: '#DCE9D3', pillText: '#4F6B3E' },
  Angry:    { dot: '#E3B15C', pillBg: '#F0C6C6', pillText: '#8B3F3F' },
  Love:     { dot: '#C96C8A', pillBg: '#F3D3DC', pillText: '#8B3F5C' },
  Joy:      { dot: '#E3B15C', pillBg: '#FBE7C9', pillText: '#8A5A15' },
  Sad:      { dot: '#8FA8C9', pillBg: '#DCE6F2', pillText: '#3F5C8B' },
  Excited:  { dot: '#E88B5A', pillBg: '#FBDCC4', pillText: '#8A4A15' },
  Anxious:  { dot: '#B18FC9', pillBg: '#E6DCF2', pillText: '#5C3F8B' }
};
const MOOD_LIST = Object.keys(MOOD_META);

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW_LABELS = ['Mo','Tu','We','Th','Fr','Sa','Su'];

/* Ambient soundscapes — real, procedurally generated audio (Web Audio
   API), so there's actual peaceful sound to play with no files to
   bundle and nothing to license. See the "Ambient sound engine"
   section below for how each one is built. */
const SOUNDSCAPES = [
  { id: 'pad',      icon: '🎹',  track: 'Soft piano pad',     artist: 'Ambient · generated' },
  { id: 'keys',     icon: '🎼',  track: 'Slow piano melody',  artist: 'Ambient · generated' },
  { id: 'bowl',     icon: '🔔',  track: 'Singing bowl',       artist: 'Ambient · generated' },
  { id: 'strings',  icon: '🎻',  track: 'Warm strings',       artist: 'Ambient · generated' },
  { id: 'musicbox', icon: '✨',  track: 'Music box',          artist: 'Ambient · generated' },
  { id: 'drone',    icon: '🌙',  track: 'Soft ambient drone', artist: 'Ambient · generated' }
];

const HABIT_COLORS = ['#C96C8A', '#A6BB93', '#E3B15C', '#8FA8C9', '#B18FC9', '#E88B5A'];
const NOTE_COLORS = ['#F4C9D6', '#DCE9D3', '#F0DDBF', '#DCE6F2', '#E6DCF2', '#FBDCC4'];

const AFFIRMATIONS = [
  "You don't have to earn rest. Take it.",
  "Small, quiet progress still counts as progress.",
  "You are allowed to change your mind and your pace.",
  "One gentle breath is enough to begin again.",
  "You've survived every hard day so far — that's real proof.",
  "It's okay to close the day unfinished.",
  "Your worth isn't measured by your to-do list.",
  "Soft days are productive too.",
  "You are exactly where you need to be to grow.",
  "Let today be simple. Simple is enough.",
  "You're allowed to take up space and take your time.",
  "Whatever you feel right now is valid, and it will pass.",
  "You don't need to be everything today — just present.",
  "Progress is quiet most of the time. Keep going.",
  "Be as kind to yourself as you'd be to someone you love."
];

const JOURNAL_PROMPTS = [
  "What's one small thing that made today softer?",
  "What did you let yourself skip today, and how did that feel?",
  "Who or what are you quietly grateful for right now?",
  "What's a feeling you didn't quite have words for today?",
  "What would \"enough\" look like for today?",
  "What's something you handled better than you expected to?",
  "What do you need to hear right now?",
  "What's a small kindness you gave or received today?",
  "What are you still carrying from today that you could put down?",
  "If today had a color, what would it be — and why?",
  "What's something you're looking forward to, even a little?",
  "What's one thing you'd tell yourself from this morning?"
];

/* ---------- helpers ---------- */
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function rotSeed(){ return Math.round((Math.random() * 10 - 5) * 10) / 10; }
function esc(str){ const d = document.createElement('div'); d.textContent = str ?? ''; return d.innerHTML; }
function todayISO(){ return new Date().toISOString().slice(0, 10); }
function formatDate(iso){
  if(!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${names[(m || 1) - 1]} ${d}`;
}
function addDays(iso, n){
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function daysBetween(iso, refIso){
  const a = new Date(iso + 'T00:00:00'), b = new Date(refIso + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}

/* ---------- default demo data (used on first visit / after reset) ---------- */
function defaultData(){
  return {
    avatar: null,
    banner: null,
    journalEntries: [
      { id: uid(), title: 'Small win today',        date: '2026-03-18', mood: 'Joy',      reflection: "Finished something I'd been putting off", tags: ['Wins'],      favorite: false },
      { id: uid(), title: 'Breathe & never ignore',  date: '2026-03-12', mood: 'Calm',     reflection: 'Took ten minutes just to sit',             tags: ['Self-Care'], favorite: true  },
      { id: uid(), title: 'Got a new dog',           date: '2026-03-05', mood: 'Grateful', reflection: 'Life officially got softer today',         tags: ['Gratitude'], favorite: false },
      { id: uid(), title: 'My best gift',            date: '2026-03-01', mood: 'Love',     reflection: 'Someone showed up for me, quietly',        tags: ['Gratitude'], favorite: true  },
      { id: uid(), title: 'Sap for no reason',       date: '2026-02-10', mood: 'Angry',    reflection: 'Everything felt irritating today',         tags: ['Reflection'],favorite: false },
      { id: uid(), title: 'Quiet, easy Sunday',      date: todayISO(),   mood: 'Calm',     reflection: 'Read a whole book in one sitting',         tags: ['Self-Care'], favorite: false },
      { id: uid(), title: 'Proud of a small step',   date: addDays(todayISO(), -1), mood: 'Excited', reflection: 'Started the thing I kept avoiding', tags: ['Wins'], favorite: false }
    ],
    priorities: {
      top: [
        { id: uid(), text: 'Complete morning routine', done: false },
        { id: uid(), text: 'Spend quality time with family', done: false },
        { id: uid(), text: '20 minutes of quiet, just for me', done: false }
      ],
      todo: [
        { id: uid(), text: 'Reply to emails', done: true },
        { id: uid(), text: 'Wash laundry', done: false },
        { id: uid(), text: 'Clean desk', done: false }
      ],
      remember: [
        { id: uid(), text: 'Birthday gift for Mom', done: false },
        { id: uid(), text: 'Return the library book', done: false },
        { id: uid(), text: 'Renew subscription this week', done: false }
      ]
    },
    monthNotes: {},
    boardItems: [
      { id: uid(), type: 'photo', img: 'assets/images/board-mornings.jpg', caption: 'soft mornings', rot: rotSeed() },
      { id: uid(), type: 'photo', img: 'assets/images/board-gentle.jpg',   caption: 'be gentle', rot: rotSeed() },
      { id: uid(), type: 'note',  color: NOTE_COLORS[4], caption: 'you are exactly where you need to be', rot: rotSeed() },
      { id: uid(), type: 'photo', img: 'assets/images/board-dreams.jpg',   caption: 'manifest dreams', rot: rotSeed() },
      { id: uid(), type: 'photo', img: 'assets/images/board-bloom.jpg',    caption: 'good things', rot: rotSeed() },
      { id: uid(), type: 'note',  color: NOTE_COLORS[2], caption: 'small steps still count', rot: rotSeed() },
      { id: uid(), type: 'photo', img: 'assets/images/board-treats.jpg',   caption: 'little treats', rot: rotSeed() }
    ],
    habits: [
      { id: uid(), name: 'Drink water', color: HABIT_COLORS[0], completedDates: [addDays(todayISO(), -1), addDays(todayISO(), -2)] },
      { id: uid(), name: 'Move my body', color: HABIT_COLORS[1], completedDates: [addDays(todayISO(), -1)] },
      { id: uid(), name: 'Read 10 pages', color: HABIT_COLORS[2], completedDates: [] }
    ],
    settings: { theme: 'light', compact: false, accent: 'rose', account: null }
  };
}

function loadData(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      // fill in any fields older saves may be missing
      const fallback = defaultData();
      parsed.habits = parsed.habits || fallback.habits;
      parsed.boardItems = (parsed.boardItems || fallback.boardItems).map(it => ({
        ...it,
        type: it.type || 'photo',
        rot: typeof it.rot === 'number' ? it.rot : rotSeed()
      }));
      if(parsed.banner === undefined) parsed.banner = null;
      parsed.settings = Object.assign({ theme: 'light', compact: false, accent: 'rose', account: null }, parsed.settings || {});
      return parsed;
    }
  }catch(e){ /* fall through to defaults */ }
  return defaultData();
}
function saveData(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA)); }
  catch(e){ toast("Couldn't save — your browser storage may be full."); }
}

let DATA = loadData();
let activeMoodFilter = null;
let activeTagFilter = null;
let searchTerm = '';
let sortMode = 'newest';
let currentMonth = null;
let currentMonthYear = new Date().getFullYear();

/* ---------- toast (supports optional undo action) ---------- */
function toast(msg, undoFn){
  const wrap = document.getElementById('toastWrap');
  const t = document.createElement('div');
  t.className = 'toast';
  const span = document.createElement('span');
  span.textContent = msg;
  t.appendChild(span);
  if(undoFn){
    const btn = document.createElement('button');
    btn.className = 'toast-undo';
    btn.textContent = 'Undo';
    btn.addEventListener('click', () => { undoFn(); leave(); });
    t.appendChild(btn);
  }
  wrap.appendChild(t);
  function leave(){
    t.classList.add('toast-leaving');
    setTimeout(() => t.remove(), 200);
  }
  const timer = setTimeout(leave, undoFn ? 4500 : 2500);
  t.addEventListener('mouseenter', () => clearTimeout(timer));
}

/* ---------- modal helpers ---------- */
function openModal(el){ el.hidden = false; }
function closeModal(el){ el.hidden = true; }

/* ---------- nav scroll + mobile drawer ---------- */
function jump(id){
  closeDrawer();
  const el = document.getElementById(id);
  if(el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function openDrawer(){
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('drawerBackdrop').classList.add('show');
  document.getElementById('menuToggle').setAttribute('aria-expanded', 'true');
}
function closeDrawer(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('drawerBackdrop').classList.remove('show');
  document.getElementById('menuToggle').setAttribute('aria-expanded', 'false');
}

/* ===================================================================
   RENDER: Dashboard
=================================================================== */
function journalStreak(){
  const dates = [...new Set(DATA.journalEntries.map(e => e.date))].sort().reverse();
  if(dates.length === 0) return 0;
  const today = todayISO();
  let cursor = dates[0];
  if(daysBetween(cursor, today) > 1) return 0; // most recent entry older than yesterday
  let streak = 0;
  let expect = cursor;
  for(const d of dates){
    if(d === expect){ streak++; expect = addDays(expect, -1); }
    else if(d < expect) break;
  }
  return streak;
}
function habitStreak(habit){
  const set = new Set(habit.completedDates);
  const today = todayISO();
  let streak = 0, cursor = today;
  // if today isn't done yet, streak counts from yesterday backward (still "alive")
  if(!set.has(cursor)) cursor = addDays(cursor, -1);
  while(set.has(cursor)){ streak++; cursor = addDays(cursor, -1); }
  return streak;
}
function overallTaskProgress(){
  const lists = ['top', 'todo', 'remember'];
  let done = 0, total = 0;
  lists.forEach(k => { DATA.priorities[k].forEach(it => { total++; if(it.done) done++; }); });
  return { done, total };
}
function topMood(){
  const counts = {};
  DATA.journalEntries.forEach(e => counts[e.mood] = (counts[e.mood] || 0) + 1);
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return entries.length ? entries[0][0] : '—';
}

function renderDashboard(){
  const streak = journalStreak();
  const { done, total } = overallTaskProgress();
  const mood = topMood();
  const moodMeta = MOOD_META[mood];

  document.getElementById('dashDateRange').textContent = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const cards = [
    { ic: '📓', label: 'Journal entries', num: DATA.journalEntries.length, bg: '#F4C9D6', color: '#8B3F5C' },
    { ic: '🔥', label: 'Day streak', num: streak, bg: '#FBE7C9', color: '#8A5A15' },
    { ic: '✓', label: 'Tasks complete', num: total ? `${done}/${total}` : '0/0', bg: '#DCE9D3', color: '#4F6B3E' },
    { ic: '💗', label: 'Most-felt mood', num: mood, bg: moodMeta ? moodMeta.pillBg : '#F4C9D6', color: moodMeta ? moodMeta.pillText : '#8B3F5C', isText: true }
  ];
  document.getElementById('statGrid').innerHTML = cards.map(c => `
    <div class="stat-card glass">
      <div class="stat-top">
        <div class="stat-ic" style="background:${c.bg};color:${c.color}">${c.ic}</div>
      </div>
      <div class="stat-num" style="${c.isText ? 'font-size:1.25rem' : ''}">${esc(String(c.num))}</div>
      <div class="stat-label">${c.label}</div>
    </div>`).join('');

  // week chart: last 7 days entry counts
  const today = todayISO();
  const days = [];
  for(let i = 6; i >= 0; i--) days.push(addDays(today, -i));
  const maxCount = Math.max(1, ...days.map(d => DATA.journalEntries.filter(e => e.date === d).length));
  document.getElementById('weekChart').innerHTML = days.map(d => {
    const count = DATA.journalEntries.filter(e => e.date === d).length;
    const h = Math.round((count / maxCount) * 88) + (count ? 12 : 4);
    const dow = new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2);
    return `<div class="wc-col">
        <span class="wc-count">${count || ''}</span>
        <div class="wc-bar" style="height:${h}px"></div>
        <span class="wc-day">${dow}</span>
      </div>`;
  }).join('');

  // progress ring
  const pct = total ? Math.round((done / total) * 100) : 0;
  const circumference = 314;
  document.getElementById('ringFill').style.strokeDashoffset = circumference - (circumference * pct / 100);
  document.getElementById('ringPercent').textContent = pct + '%';

  // recent entries
  const recents = DATA.journalEntries.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const recentBox = document.getElementById('recentEntries');
  recentBox.innerHTML = recents.length ? recents.map(e => {
    const meta = MOOD_META[e.mood] || MOOD_META.Calm;
    return `<div class="recent-item"><span class="dot" style="background:${meta.dot}"></span><b>${esc(e.title)}</b><span class="rdate">${formatDate(e.date)}</span></div>`;
  }).join('') : `<div class="recent-empty">No entries yet — add your first one.</div>`;

  // upcoming reminders
  const remembers = DATA.priorities.remember.filter(r => !r.done).slice(0, 5);
  const upcomingBox = document.getElementById('upcomingRemember');
  upcomingBox.innerHTML = remembers.length ? remembers.map(r =>
    `<div class="recent-item"><span class="dot" style="background:#E3B15C"></span>${esc(r.text)}</div>`
  ).join('') : `<div class="recent-empty">Nothing pending — you're all caught up.</div>`;

  renderAchievements();
}

/* ===================================================================
   RENDER: Feeling Today (mood cards)
=================================================================== */
function renderMoods(){
  const grid = document.getElementById('moodGrid');
  const counts = {};
  MOOD_LIST.forEach(m => counts[m] = []);
  DATA.journalEntries.forEach(e => { if(counts[e.mood]) counts[e.mood].push(e); });

  const used = MOOD_LIST.filter(m => counts[m].length > 0)
    .sort((a, b) => counts[b].length - counts[a].length);

  document.getElementById('moodTotalCount').textContent = `${DATA.journalEntries.length} moods logged`;

  if(used.length === 0){
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">No moods logged yet. Add your first journal entry to see it here.</div>`;
    return;
  }

  grid.innerHTML = used.map(mood => {
    const meta = MOOD_META[mood];
    const entries = counts[mood].slice().sort((a, b) => b.date.localeCompare(a.date));
    const latest = entries[0];
    const active = activeMoodFilter === mood ? ' active' : '';
    return `
      <div class="mood-card glass${active}" data-mood="${mood}">
        <div class="head"><span class="dot" style="background:${meta.dot}"></span> ${mood} <span class="count">${entries.length}</span></div>
        <div class="entry-row">${esc(latest.title)}</div>
        <div class="addnew" data-mood-add="${mood}">+ New entry</div>
      </div>`;
  }).join('');
}

/* ===================================================================
   RENDER: Journal table (search + mood filter + tag filter + sort)
=================================================================== */
function renderTagChips(){
  const row = document.getElementById('tagChipRow');
  const tagSet = new Set();
  DATA.journalEntries.forEach(e => e.tags.forEach(t => tagSet.add(t)));
  const tags = [...tagSet].sort();
  if(tags.length === 0){ row.innerHTML = ''; return; }
  row.innerHTML = tags.map(t => `<button class="tag-chip${activeTagFilter === t ? ' active' : ''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('');
}

function renderJournal(){
  const body = document.getElementById('journalBody');
  const empty = document.getElementById('journalEmpty');
  const pill = document.getElementById('activeFilterPill');
  const pillText = document.getElementById('activeFilterText');

  const filterLabels = [];
  if(activeMoodFilter) filterLabels.push(activeMoodFilter);
  if(activeTagFilter) filterLabels.push('#' + activeTagFilter);
  if(filterLabels.length){
    pill.hidden = false;
    pillText.textContent = filterLabels.join(' + ');
  } else {
    pill.hidden = true;
  }

  let list = DATA.journalEntries.slice();
  if(activeMoodFilter) list = list.filter(e => e.mood === activeMoodFilter);
  if(activeTagFilter) list = list.filter(e => e.tags.includes(activeTagFilter));
  if(searchTerm){
    const q = searchTerm.toLowerCase();
    list = list.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.reflection.toLowerCase().includes(q) ||
      e.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  if(sortMode === 'oldest') list.sort((a, b) => a.date.localeCompare(b.date));
  else if(sortMode === 'favorites') list.sort((a, b) => (b.favorite - a.favorite) || b.date.localeCompare(a.date));
  else list.sort((a, b) => b.date.localeCompare(a.date));

  if(list.length === 0){
    body.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  body.innerHTML = list.map(e => {
    const meta = MOOD_META[e.mood] || MOOD_META.Calm;
    const tags = e.tags.map(t => `<span class="pill" style="background:#F4C9D6;color:#8B3F5C">${esc(t)}</span>`).join('');
    return `
      <tr data-id="${e.id}">
        <td class="heart" data-action="heart">${e.favorite ? '❤️' : '🤍'}</td>
        <td><b>${esc(e.title)}</b></td>
        <td>${formatDate(e.date)}</td>
        <td><span class="pill" style="background:${meta.pillBg};color:${meta.pillText}">${esc(e.mood)}</span></td>
        <td>${esc(e.reflection)}</td>
        <td>${tags}</td>
        <td><button class="row-del" data-action="del" title="Delete entry">✕</button></td>
      </tr>`;
  }).join('');
}

function exportJournalCSV(){
  const rows = [['Title', 'Date', 'Mood', 'Reflection', 'Tags', 'Favorite']];
  DATA.journalEntries.forEach(e => rows.push([e.title, e.date, e.mood, e.reflection, e.tags.join('; '), e.favorite ? 'Yes' : 'No']));
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  downloadBlob(csv, 'rosewood-journal-entries.csv', 'text/csv');
  toast('Entries exported as CSV');
}
function downloadBlob(content, filename, mime){
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* ===================================================================
   RENDER: Priorities / To-Do / Must Remember (+ progress + drag reorder)
=================================================================== */
function renderList(key){
  const ul = document.getElementById(`list-${key}`);
  const items = DATA.priorities[key];
  if(!items || items.length === 0){
    ul.innerHTML = `<li class="list-empty">Nothing here yet — add one below.</li>`;
  } else {
    ul.innerHTML = items.map(item => `
      <li data-id="${item.id}" draggable="true">
        <label>
          <input type="checkbox" ${item.done ? 'checked' : ''}>
          <span>${esc(item.text)}</span>
        </label>
        <button class="item-del" title="Remove">✕</button>
      </li>`).join('');
  }
  const done = items.filter(i => i.done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  const bar = document.getElementById(`progress-${key}`);
  if(bar) bar.style.width = pct + '%';
}
function renderAllLists(){
  ['top','todo','remember'].forEach(renderList);
  const { done, total } = overallTaskProgress();
  document.getElementById('prioritiesCount').textContent = total ? `${done}/${total} complete` : 'add your first item';
}

function addItem(key){
  const input = document.getElementById(`input-${key}`);
  const text = input.value.trim();
  if(!text) return;
  DATA.priorities[key].push({ id: uid(), text, done: false });
  saveData();
  renderList(key);
  renderDashboard();
  input.value = '';
  input.focus();
}

let dragState = null;
function initDragReorder(){
  ['top','todo','remember'].forEach(key => {
    const ul = document.getElementById(`list-${key}`);
    ul.addEventListener('dragstart', e => {
      const li = e.target.closest('li[data-id]');
      if(!li) return;
      dragState = { key, id: li.dataset.id };
      li.classList.add('dragging');
    });
    ul.addEventListener('dragend', e => {
      const li = e.target.closest('li[data-id]');
      if(li) li.classList.remove('dragging');
      ul.querySelectorAll('li').forEach(l => l.classList.remove('drag-over'));
    });
    ul.addEventListener('dragover', e => {
      e.preventDefault();
      const li = e.target.closest('li[data-id]');
      ul.querySelectorAll('li').forEach(l => l.classList.remove('drag-over'));
      if(li) li.classList.add('drag-over');
    });
    ul.addEventListener('drop', e => {
      e.preventDefault();
      const li = e.target.closest('li[data-id]');
      if(!li || !dragState || dragState.key !== key) return;
      const list = DATA.priorities[key];
      const fromIdx = list.findIndex(i => i.id === dragState.id);
      const toIdx = list.findIndex(i => i.id === li.dataset.id);
      if(fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
      const [moved] = list.splice(fromIdx, 1);
      list.splice(toIdx, 0, moved);
      saveData();
      renderList(key);
    });
  });
}

/* ===================================================================
   RENDER: Habit tracker
=================================================================== */
function currentWeekDates(){
  const today = new Date();
  const dow = (today.getDay() + 6) % 7; // 0 = Monday
  const monday = addDays(todayISO(), -dow);
  const out = [];
  for(let i = 0; i < 7; i++) out.push(addDays(monday, i));
  return out;
}
function renderHabits(){
  const wrap = document.getElementById('habitTable');
  const empty = document.getElementById('habitEmpty');
  const week = currentWeekDates();
  const today = todayISO();

  if(!DATA.habits.length){
    wrap.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  let html = `<div class="habit-row head-row"><div>Habit</div>${week.map(d => `<div style="text-align:center">${DOW_LABELS[new Date(d+'T00:00:00').getDay() === 0 ? 6 : new Date(d+'T00:00:00').getDay()-1]}</div>`).join('')}<div>Streak</div></div>`;

  html += DATA.habits.map(h => {
    const set = new Set(h.completedDates);
    const cells = week.map(d => {
      const isFuture = d > today;
      const done = set.has(d);
      const isToday = d === today;
      return `<button class="habit-day${done ? ' done' : ''}${isToday ? ' today' : ''}" style="${done ? `background:${h.color};border-color:${h.color}` : ''}" data-habit="${h.id}" data-date="${d}" ${isFuture ? 'disabled' : ''} title="${d}">${done ? '✓' : ''}</button>`;
    }).join('');
    const streak = habitStreak(h);
    return `<div class="habit-row" data-habit-row="${h.id}">
        <div class="habit-name"><span class="hdot" style="background:${h.color}"></span><span>${esc(h.name)}</span></div>
        ${cells}
        <div class="habit-streak">🔥 ${streak}<button class="habit-del" data-del-habit="${h.id}" title="Delete habit" style="margin-left:6px">✕</button></div>
      </div>`;
  }).join('');

  wrap.innerHTML = html;
}
function openHabitModal(){
  document.getElementById('habitName').value = '';
  const swatchWrap = document.getElementById('habitColorSwatches');
  swatchWrap.innerHTML = HABIT_COLORS.map((c, i) => `<div class="color-swatch${i === 0 ? ' active' : ''}" style="background:${c}" data-color="${c}"></div>`).join('');
  swatchWrap.dataset.selected = HABIT_COLORS[0];
  openModal(document.getElementById('habitModalOverlay'));
  document.getElementById('habitName').focus();
}
function saveHabit(){
  const name = document.getElementById('habitName').value.trim();
  if(!name){ toast('Give your habit a name first'); return; }
  const color = document.getElementById('habitColorSwatches').dataset.selected || HABIT_COLORS[0];
  DATA.habits.push({ id: uid(), name, color, completedDates: [] });
  saveData();
  renderHabits();
  renderDashboard();
  closeModal(document.getElementById('habitModalOverlay'));
  toast('Habit added 🌱');
}

/* ===================================================================
   RENDER: Monthly overview (+ mini calendar with entry markers)
=================================================================== */
function renderMonths(){
  const gallery = document.getElementById('monthGallery');
  gallery.innerHTML = MONTHS.map(m => {
    const hasNotes = !!(DATA.monthNotes[m] && DATA.monthNotes[m].trim());
    const file = m.toLowerCase();
    const monthIdx = MONTHS.indexOf(m);
    const entryCount = DATA.journalEntries.filter(e => (new Date(e.date + 'T00:00:00')).getMonth() === monthIdx).length;
    return `
      <div class="month-card glass" data-month="${m}">
        <div class="thumb" style="background-image:url('assets/images/month-${file}.jpg')">
          ${entryCount ? `<span class="entry-badge">${entryCount}</span>` : ''}
        </div>
        <div class="label">${m}${hasNotes ? '<span class="note-dot" title="Has notes"></span>' : ''}</div>
      </div>`;
  }).join('');
}
function renderMiniCal(month){
  const monthIdx = MONTHS.indexOf(month);
  const year = currentMonthYear;
  const first = new Date(year, monthIdx, 1);
  const startDow = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const today = todayISO();

  const entryDays = new Set(
    DATA.journalEntries
      .filter(e => (new Date(e.date + 'T00:00:00')).getMonth() === monthIdx)
      .map(e => (new Date(e.date + 'T00:00:00')).getDate())
  );

  let cells = DOW_LABELS.map(l => `<div class="mini-cal-dow">${l}</div>`).join('');
  for(let i = 0; i < startDow; i++) cells += `<div class="mini-cal-day empty"></div>`;
  for(let d = 1; d <= daysInMonth; d++){
    const iso = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = iso === today;
    const hasEntry = entryDays.has(d);
    cells += `<div class="mini-cal-day${hasEntry ? ' has-entry' : ''}${isToday ? ' is-today' : ''}" data-date="${iso}">${d}${hasEntry ? '<span class="mcd-dot"></span>' : ''}</div>`;
  }
  document.getElementById('miniCal').innerHTML = `<div class="mini-cal-grid">${cells}</div>`;
}
function openMonthModal(month){
  currentMonth = month;
  document.getElementById('monthModalTitle').textContent = `${month} ${currentMonthYear}`;
  document.getElementById('monthNotes').value = DATA.monthNotes[month] || '';
  renderMiniCal(month);
  openModal(document.getElementById('monthModalOverlay'));
}
function saveMonthNotes(){
  const text = document.getElementById('monthNotes').value.trim();
  if(text) DATA.monthNotes[currentMonth] = text;
  else delete DATA.monthNotes[currentMonth];
  saveData();
  renderMonths();
  closeModal(document.getElementById('monthModalOverlay'));
  toast(`Notes saved for ${currentMonth}`);
}

/* ===================================================================
   RENDER: Mood board (photos + sticky notes, draggable, editable)
=================================================================== */
function renderBoard(){
  const grid = document.getElementById('boardGrid');
  const cards = DATA.boardItems.map(item => {
    const rot = item.rot || 0;
    if(item.type === 'note'){
      return `
        <div class="board-card glass note" data-id="${item.id}" draggable="true" style="background:${item.color || NOTE_COLORS[0]};transform:rotate(${rot}deg)">
          <div class="board-pin">📌</div>
          <div class="note-tape"></div>
          <div class="note-text" data-field="caption" tabindex="0" title="Click to edit">${esc(item.caption)}</div>
          <button class="del-btn" data-action="del-board" title="Remove">✕</button>
        </div>`;
    }
    return `
      <div class="board-card glass" data-id="${item.id}" draggable="true" style="transform:rotate(${rot}deg)">
        <div class="board-pin">📌</div>
        <div class="art" style="background-image:url('${item.img}')"></div>
        <div class="cap" data-field="caption" tabindex="0" title="Click to edit">${esc(item.caption)}</div>
        <button class="del-btn" data-action="del-board" title="Remove">✕</button>
      </div>`;
  }).join('');
  const addTile = `
    <div class="board-card glass board-add" id="boardAddTile">
      <div class="plus">+</div>
      <div>Add inspiration</div>
    </div>`;
  grid.innerHTML = cards + addTile;
}

function beginBoardTextEdit(textEl){
  const card = textEl.closest('.board-card');
  const id = card.dataset.id;
  const item = DATA.boardItems.find(x => x.id === id);
  if(!item) return;
  const isNote = item.type === 'note';
  const input = document.createElement(isNote ? 'textarea' : 'input');
  input.className = 'board-text-edit';
  if(!isNote) input.type = 'text';
  else input.rows = 3;
  input.maxLength = isNote ? 140 : 60;
  input.value = item.caption;
  textEl.replaceWith(input);
  input.focus();
  input.select();
  let done = false;
  const commit = () => {
    if(done) return;
    done = true;
    const val = input.value.trim();
    item.caption = val || (isNote ? 'a little note' : 'untitled');
    saveData();
    renderBoard();
  };
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if(e.key === 'Enter' && !isNote){ e.preventDefault(); commit(); }
    if(e.key === 'Enter' && isNote && (e.metaKey || e.ctrlKey)){ e.preventDefault(); commit(); }
    if(e.key === 'Escape'){ done = true; renderBoard(); }
  });
}

let boardDragId = null;
function initBoardDragAndDrop(){
  const grid = document.getElementById('boardGrid');
  grid.addEventListener('dragstart', e => {
    const card = e.target.closest('.board-card:not(.board-add)');
    if(!card) return;
    boardDragId = card.dataset.id;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  grid.addEventListener('dragend', e => {
    const card = e.target.closest('.board-card');
    if(card) card.classList.remove('dragging');
    document.querySelectorAll('.board-card.drag-over').forEach(c => c.classList.remove('drag-over'));
    boardDragId = null;
  });
  grid.addEventListener('dragover', e => {
    const card = e.target.closest('.board-card:not(.board-add)');
    if(!card || !boardDragId || card.dataset.id === boardDragId) return;
    e.preventDefault();
    card.classList.add('drag-over');
  });
  grid.addEventListener('dragleave', e => {
    const card = e.target.closest('.board-card');
    if(card) card.classList.remove('drag-over');
  });
  grid.addEventListener('drop', e => {
    const card = e.target.closest('.board-card:not(.board-add)');
    if(!card || !boardDragId || card.dataset.id === boardDragId) return;
    e.preventDefault();
    card.classList.remove('drag-over');
    const fromIdx = DATA.boardItems.findIndex(x => x.id === boardDragId);
    const toIdx = DATA.boardItems.findIndex(x => x.id === card.dataset.id);
    if(fromIdx === -1 || toIdx === -1) return;
    const [moved] = DATA.boardItems.splice(fromIdx, 1);
    DATA.boardItems.splice(toIdx, 0, moved);
    saveData();
    renderBoard();
  });
}

/* ===================================================================
   Journal entry modal
=================================================================== */
function populateMoodSelect(){
  document.getElementById('entryMood').innerHTML = MOOD_LIST.map(m => `<option value="${m}">${m}</option>`).join('');
}
function openEntryModal(presetMood, presetDate){
  document.getElementById('entryTitle').value = '';
  document.getElementById('entryDate').value = presetDate || todayISO();
  document.getElementById('entryMood').value = presetMood || MOOD_LIST[0];
  document.getElementById('entryReflection').value = '';
  document.getElementById('entryTags').value = '';
  openModal(document.getElementById('entryModalOverlay'));
  document.getElementById('entryTitle').focus();
}
function saveEntry(){
  const title = document.getElementById('entryTitle').value.trim();
  if(!title){ toast('Give your entry a title first'); document.getElementById('entryTitle').focus(); return; }
  const date = document.getElementById('entryDate').value || todayISO();
  const mood = document.getElementById('entryMood').value;
  const reflection = document.getElementById('entryReflection').value.trim();
  const tags = document.getElementById('entryTags').value.split(',').map(t => t.trim()).filter(Boolean);

  DATA.journalEntries.unshift({ id: uid(), title, date, mood, reflection, tags, favorite: false });
  saveData();
  renderMoods();
  renderJournal();
  renderTagChips();
  renderDashboard();
  renderMonths();
  stopVoiceIfActive();
  closeModal(document.getElementById('entryModalOverlay'));
  toast('Entry saved 🤍');
}

/* ===================================================================
   Mood board add modal (photo or sticky note)
=================================================================== */
let boardTabMode = 'photo';
function setBoardTab(mode){
  boardTabMode = mode;
  document.getElementById('boardTabPhoto').classList.toggle('active', mode === 'photo');
  document.getElementById('boardTabPhoto').setAttribute('aria-selected', mode === 'photo');
  document.getElementById('boardTabNote').classList.toggle('active', mode === 'note');
  document.getElementById('boardTabNote').setAttribute('aria-selected', mode === 'note');
  document.getElementById('boardImageField').hidden = mode !== 'photo';
  document.getElementById('boardCaptionField').hidden = mode !== 'photo';
  document.getElementById('boardColorField').hidden = mode !== 'note';
  document.getElementById('boardNoteField').hidden = mode !== 'note';
}
function openBoardModal(){
  setBoardTab('photo');
  document.getElementById('boardImage').value = '';
  document.getElementById('boardCaption').value = '';
  document.getElementById('boardNoteText').value = '';
  const swatchWrap = document.getElementById('boardColorSwatches');
  swatchWrap.innerHTML = NOTE_COLORS.map((c, i) => `<div class="color-swatch${i === 0 ? ' active' : ''}" style="background:${c}" data-color="${c}"></div>`).join('');
  swatchWrap.dataset.selected = NOTE_COLORS[0];
  openModal(document.getElementById('boardModalOverlay'));
}
function saveBoardItem(){
  if(boardTabMode === 'note'){
    const text = document.getElementById('boardNoteText').value.trim();
    if(!text){ toast('Write a little something for your note'); return; }
    const color = document.getElementById('boardColorSwatches').dataset.selected || NOTE_COLORS[0];
    DATA.boardItems.push({ id: uid(), type: 'note', color, caption: text, rot: rotSeed() });
    saveData();
    renderBoard();
    closeModal(document.getElementById('boardModalOverlay'));
    toast('Pinned to your board 📌');
    return;
  }
  const fileInput = document.getElementById('boardImage');
  const caption = document.getElementById('boardCaption').value.trim() || 'untitled';
  const file = fileInput.files[0];
  if(!file){ toast('Choose an image to pin'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    DATA.boardItems.push({ id: uid(), type: 'photo', img: reader.result, caption, rot: rotSeed() });
    saveData();
    renderBoard();
    closeModal(document.getElementById('boardModalOverlay'));
    fileInput.value = '';
    document.getElementById('boardCaption').value = '';
    toast('Pinned to your board 📌');
  };
  reader.readAsDataURL(file);
}

/* ===================================================================
   Avatar upload
=================================================================== */
function initAvatar(){
  const img = document.getElementById('avatarImg');
  if(DATA.avatar) img.src = DATA.avatar;
  document.getElementById('avatarWrap').addEventListener('click', () => document.getElementById('avatarInput').click());
  document.getElementById('avatarInput').addEventListener('change', function(){
    const file = this.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      DATA.avatar = reader.result;
      saveData();
      img.src = DATA.avatar;
      toast('Photo updated');
    };
    reader.readAsDataURL(file);
  });
}

/* ===================================================================
   Banner / cover photo upload (same pattern as avatar)
=================================================================== */
function applyBanner(){
  const hero = document.getElementById('heroBanner');
  const resetBtn = document.getElementById('heroResetBtn');
  if(DATA.banner){
    hero.style.backgroundImage = `url('${DATA.banner}')`;
    resetBtn.hidden = false;
  } else {
    hero.style.backgroundImage = '';
    resetBtn.hidden = true;
  }
}
function initBanner(){
  applyBanner();
  document.getElementById('heroEditBtn').addEventListener('click', () => document.getElementById('bannerInput').click());
  document.getElementById('bannerInput').addEventListener('change', function(){
    const file = this.files[0];
    if(!file) return;
    if(!file.type.startsWith('image/')){ toast('Please choose an image file'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      DATA.banner = reader.result;
      saveData();
      applyBanner();
      toast('Cover photo updated');
    };
    reader.readAsDataURL(file);
    this.value = '';
  });
  document.getElementById('heroResetBtn').addEventListener('click', () => {
    DATA.banner = null;
    saveData();
    applyBanner();
    toast('Cover photo reset to default');
  });
}

/* ===================================================================
   Ambient sound engine — real audio via the Web Audio API. Nothing is
   streamed or downloaded: every soundscape is synthesized on the fly
   from noise buffers and oscillators, so play/pause/volume/mute all
   control genuine sound. Each builder returns { out, stop() } where
   `out` is the AudioNode to connect to the master gain.
=================================================================== */
const PLAY_D = 'M6 4l14 8-14 8z';
const PAUSE_D = 'M8 5h3v14H8zM13 5h3v14h-3z';

let actx = null;           // AudioContext, created lazily on first play (autoplay policy)
let masterGain = null;
let currentVoice = null;   // { out, stop() } for the soundscape currently connected
let playerIndex = 0, playing = false, shuffle = false, volume = 70, muted = false;
let elapsedSec = 0, elapsedTimer = null;

function ensureAudio(){
  if(actx) return;
  actx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = actx.createGain();
  masterGain.gain.value = (muted ? 0 : volume / 100);
  masterGain.connect(actx.destination);
}

function slowLFO(freq, min, max, target){
  const lfo = actx.createOscillator();
  const lfoGain = actx.createGain();
  lfo.frequency.value = freq;
  lfoGain.gain.value = (max - min) / 2;
  lfo.connect(lfoGain);
  lfoGain.connect(target);
  target.value = (max + min) / 2;
  lfo.start();
  return lfo;
}

/* ---- calm, fully-tonal soundscapes (no noise sources at all —
   every one of these is oscillators only, so nothing ever sounds
   "rushy" or hissy) ---- */
function buildBowl(){
  // singing bowl: struck tones with a long, slow decay and gentle beating
  const out = actx.createGain(); out.gain.value = 1;
  const room = makeRoom(out);
  const notes = [98.00, 130.81]; // G2, C3
  let stopped = false, timer = null;
  function strike(){
    if(stopped) return;
    const t = actx.currentTime;
    const base = notes[Math.floor(Math.random() * notes.length)];
    [ [1, 1, 0], [1, 1, 3.2], [2.001, 0.22, 0], [2.76, 0.1, 0], [4.2, 0.05, 0] ].forEach(([mult, amp, detune]) => {
      const o1 = actx.createOscillator();
      o1.type = 'sine'; o1.frequency.value = base * mult;
      const g = actx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.16 * amp, t + 0.4);
      g.gain.exponentialRampToValueAtTime(0.0003, t + 13);
      o1.connect(g); g.connect(out); g.connect(room);
      o1.start(t); o1.stop(t + 13.2);
      if(detune){
        const o2 = actx.createOscillator();
        o2.type = 'sine'; o2.frequency.value = base * mult + detune / 100;
        o2.connect(g);
        o2.start(t); o2.stop(t + 13.2);
      }
    });
    timer = setTimeout(strike, 15000 + Math.random() * 2000);
  }
  strike();
  return { out, stop(){ stopped = true; clearTimeout(timer); } };
}
function buildStrings(){
  // warm, slow-swelling string pad
  const out = actx.createGain(); out.gain.value = 0.85;
  const filt = actx.createBiquadFilter();
  filt.type = 'lowpass'; filt.frequency.value = 1400; filt.Q.value = 0.3;
  filt.connect(out);
  const room = makeRoom(out);
  const chords = [
    [130.81, 164.81, 196.00], // C
    [146.83, 174.61, 220.00], // Dm
    [110.00, 130.81, 164.81], // Am
    [130.81, 174.61, 220.00]  // F(ish)
  ];
  let chordIdx = 0, timer = null, stopped = false;
  function swell(){
    if(stopped) return;
    const t = actx.currentTime;
    chords[chordIdx].forEach(freq => {
      [freq, freq * 1.003, freq * 0.997].forEach(f => {
        const o = actx.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = f;
        const g = actx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.045, t + 3.5);
        g.gain.linearRampToValueAtTime(0, t + 10.5);
        o.connect(g); g.connect(filt); g.connect(room);
        o.start(t); o.stop(t + 11);
      });
    });
    chordIdx = (chordIdx + 1) % chords.length;
    timer = setTimeout(swell, 10000);
  }
  swell();
  const lfo = slowLFO(0.04, 900, 1500, filt.frequency);
  return { out, stop(){ stopped = true; clearTimeout(timer); try{ lfo.stop(); }catch(e){} } };
}
function buildMusicBox(){
  // a gentle, twinkly music-box melody
  const out = actx.createGain(); out.gain.value = 1;
  const room = makeRoom(out);
  const scale = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; // C D E G A C6
  let stopped = false, timer = null;
  function pluck(){
    if(stopped) return;
    const t = actx.currentTime;
    const freq = scale[Math.floor(Math.random() * scale.length)];
    const g = actx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0003, t + 2.6);
    g.connect(out); g.connect(room);
    [ [1, 1], [3, 0.18], [5, 0.06] ].forEach(([mult, amp]) => {
      const o = actx.createOscillator();
      o.type = 'sine'; o.frequency.value = freq * mult;
      const hg = actx.createGain(); hg.gain.value = amp;
      o.connect(hg); hg.connect(g);
      o.start(t); o.stop(t + 2.7);
    });
    timer = setTimeout(pluck, 1400 + Math.random() * 1600);
  }
  pluck();
  return { out, stop(){ stopped = true; clearTimeout(timer); } };
}
function buildDrone(){
  // a very slow, continuous ambient hum — root + fifth, always sustained
  const out = actx.createGain(); out.gain.value = 0.5;
  const filt = actx.createBiquadFilter();
  filt.type = 'lowpass'; filt.Q.value = 0.2;
  filt.connect(out);
  const freqs = [65.41, 98.00, 130.81]; // C2, G2, C3
  const oscs = freqs.map(f => {
    const o = actx.createOscillator();
    o.type = 'sine'; o.frequency.value = f;
    const g = actx.createGain(); g.gain.value = 0.09;
    o.connect(g); g.connect(filt);
    o.start();
    return o;
  });
  const lfoFreq = slowLFO(0.03, 500, 1100, filt.frequency);
  const lfoGain = slowLFO(0.05, 0.4, 0.6, out.gain);
  return { out, stop(){ oscs.forEach(o => { try{ o.stop(); }catch(e){} }); try{ lfoFreq.stop(); lfoGain.stop(); }catch(e){} } };
}

/* ---- shared soft delay ("room") for the tonal voices ---- */
function makeRoom(dest){
  const delay = actx.createDelay(1.2);
  delay.delayTime.value = 0.34;
  const fb = actx.createGain(); fb.gain.value = 0.32;
  const wet = actx.createGain(); wet.gain.value = 0.5;
  const damp = actx.createBiquadFilter(); damp.type = 'lowpass'; damp.frequency.value = 2600;
  delay.connect(damp); damp.connect(fb); fb.connect(delay);
  delay.connect(wet); wet.connect(dest);
  return delay; // feed dry notes into this
}
function pianoNote(freq, t, dryDest, wetDest, vel, dur){
  const g = actx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vel, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0002, t + dur);
  g.connect(dryDest);
  g.connect(wetDest);
  const partials = [ [1, 1], [2, 0.32], [3, 0.14], [4, 0.06] ];
  partials.forEach(([mult, amp], i) => {
    const o = actx.createOscillator();
    o.type = i === 0 ? 'triangle' : 'sine';
    o.frequency.value = freq * mult;
    const hg = actx.createGain(); hg.gain.value = amp;
    o.connect(hg); hg.connect(g);
    o.start(t); o.stop(t + dur + 0.15);
  });
}
function buildPad(){
  const out = actx.createGain(); out.gain.value = 0.9;
  const filt = actx.createBiquadFilter();
  filt.type = 'lowpass'; filt.frequency.value = 2600; filt.Q.value = 0.2;
  filt.connect(out);
  const room = makeRoom(out);
  const chords = [
    [130.81, 164.81, 196.00, 246.94], // Cmaj7
    [110.00, 130.81, 174.61, 220.00], // Am7
    [146.83, 174.61, 220.00, 261.63], // Dm7
    [130.81, 196.00, 246.94, 293.66]  // Cmaj9-ish
  ];
  let chordIdx = 0, chordTimer = null, stopped = false;
  function playChord(){
    if(stopped) return;
    const t = actx.currentTime;
    chords[chordIdx].forEach((freq, i) => {
      pianoNote(freq, t + i * 0.06, filt, room, 0.1, 8.5);
    });
    chordIdx = (chordIdx + 1) % chords.length;
    chordTimer = setTimeout(playChord, 8200);
  }
  playChord();
  return { out, stop(){ stopped = true; clearTimeout(chordTimer); } };
}
function buildKeys(){
  const out = actx.createGain(); out.gain.value = 1;
  const filt = actx.createBiquadFilter();
  filt.type = 'lowpass'; filt.frequency.value = 3200; filt.Q.value = 0.2;
  filt.connect(out);
  const room = makeRoom(out);
  // a slow, softly wandering melody drawn from a C major pentatonic scale,
  // with a low sustained root note underneath — no two takes ever repeat.
  const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25]; // C D E G A C5 D5 E5
  const roots = [65.41, 87.31]; // C2, F2
  let stopped = false, noteTimer = null, rootTimer = null;
  function playNote(){
    if(stopped) return;
    const t = actx.currentTime;
    const freq = scale[Math.floor(Math.random() * scale.length)];
    pianoNote(freq, t, filt, room, 0.085 + Math.random() * 0.03, 3.4 + Math.random() * 1.4);
    noteTimer = setTimeout(playNote, 1900 + Math.random() * 2200);
  }
  function playRoot(){
    if(stopped) return;
    const t = actx.currentTime;
    const freq = roots[Math.floor(Math.random() * roots.length)];
    pianoNote(freq, t, filt, room, 0.05, 9);
    rootTimer = setTimeout(playRoot, 8800);
  }
  playNote(); playRoot();
  return { out, stop(){ stopped = true; clearTimeout(noteTimer); clearTimeout(rootTimer); } };
}
const SOUND_BUILDERS = { pad: buildPad, keys: buildKeys, bowl: buildBowl, strings: buildStrings, musicbox: buildMusicBox, drone: buildDrone };

function renderTrack(){
  const s = SOUNDSCAPES[playerIndex];
  document.getElementById('playerTrack').textContent = s.track;
  document.getElementById('playerArtist').textContent = s.artist;
  document.querySelectorAll('.sound-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.sound === s.id);
  });
}
function formatClock(sec){
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}
function tickElapsed(){
  elapsedSec++;
  const el = document.getElementById('playerElapsed');
  if(el) el.textContent = formatClock(elapsedSec);
}
function setPlayIcon(){
  document.getElementById('playIcon').querySelector('path').setAttribute('d', playing ? PAUSE_D : PLAY_D);
  document.getElementById('playerPlay').setAttribute('aria-label', playing ? 'Pause' : 'Play');
  document.getElementById('playerBarWrap').classList.toggle('playing', playing);
}
function startVoice(){
  ensureAudio();
  if(actx.state === 'suspended') actx.resume();
  if(currentVoice) currentVoice.stop();
  const id = SOUNDSCAPES[playerIndex].id;
  const fade = actx.createGain();
  fade.gain.setValueAtTime(0, actx.currentTime);
  fade.gain.linearRampToValueAtTime(1, actx.currentTime + 1.2);
  const voice = SOUND_BUILDERS[id]();
  voice.out.connect(fade);
  fade.connect(masterGain);
  currentVoice = { stop(){ voice.stop(); try{ fade.disconnect(); }catch(e){} } };
}
function stopVoice(){
  if(!currentVoice) return;
  if(actx){
    const now = actx.currentTime;
    // let it ring out briefly rather than clicking off
    masterGain.gain.setTargetAtTime(0, now, 0.15);
    setTimeout(() => {
      if(currentVoice){ currentVoice.stop(); currentVoice = null; }
      if(actx && !muted) masterGain.gain.setTargetAtTime(volume / 100, actx.currentTime, 0.01);
    }, 350);
  }
}
function playPause(){
  playing = !playing;
  if(playing){
    startVoice();
    elapsedTimer = setInterval(tickElapsed, 1000);
  } else {
    stopVoice();
    clearInterval(elapsedTimer);
  }
  setPlayIcon();
}
function selectTrack(idx){
  playerIndex = (idx + SOUNDSCAPES.length) % SOUNDSCAPES.length;
  elapsedSec = 0;
  const el = document.getElementById('playerElapsed');
  if(el) el.textContent = '0:00';
  renderTrack();
  if(playing) startVoice();
}
function pickNextIndex(){
  if(shuffle && SOUNDSCAPES.length > 1){
    let idx;
    do { idx = Math.floor(Math.random() * SOUNDSCAPES.length); } while(idx === playerIndex);
    return idx;
  }
  return (playerIndex + 1) % SOUNDSCAPES.length;
}
function nextTrack(){ selectTrack(pickNextIndex()); }
function prevTrack(){ selectTrack(playerIndex - 1); }
function updateVolIcon(){
  const icon = document.getElementById('volIcon');
  const isMuted = muted || volume === 0;
  icon.innerHTML = isMuted
    ? '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M23 9l-6 6M17 9l6 6"/>'
    : '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/>';
  document.getElementById('playerMute').classList.toggle('active-toggle', isMuted);
  if(masterGain) masterGain.gain.setTargetAtTime(isMuted ? 0 : volume / 100, actx.currentTime, 0.05);
}

/* ---- sleep timer: gently fades the ambient sound out and pauses it ---- */
let sleepTimerHandle = null;
function setSleepTimer(minutes){
  clearTimeout(sleepTimerHandle);
  sleepTimerHandle = null;
  if(!minutes) return;
  sleepTimerHandle = setTimeout(() => {
    if(playing){
      if(actx) masterGain.gain.setTargetAtTime(0, actx.currentTime, 2.2);
      setTimeout(() => {
        if(playing) playPause();
        if(actx && masterGain && !muted) masterGain.gain.setTargetAtTime(volume / 100, actx.currentTime, 0.01);
      }, 2600);
    }
    toast('Sleep timer ended — sound faded out');
    document.getElementById('sleepTimerSelect').value = '0';
  }, minutes * 60000);
}

/* ===================================================================
   Breathing exercise — a slow, paced box-breathing widget. Reuses the
   ambient engine: starting it auto-starts soft sound if nothing is
   playing yet, and stopping the modal never kills sound the user
   already had going.
=================================================================== */
const BREATH_PHASES = [
  { label: 'Breathe in',  seconds: 4 },
  { label: 'Hold',        seconds: 4 },
  { label: 'Breathe out', seconds: 4 },
  { label: 'Hold',        seconds: 4 }
];
let breathTimer = null, breathPhaseIdx = 0, breathCycles = 0, breathRunning = false, breathStartedAudio = false;

function openBreathModal(){
  openModal(document.getElementById('breathModalOverlay'));
  resetBreathUI();
}
function closeBreathModalUI(){
  stopBreath();
  closeModal(document.getElementById('breathModalOverlay'));
}
function resetBreathUI(){
  breathPhaseIdx = 0; breathCycles = 0;
  document.getElementById('breathLabel').textContent = 'Ready when you are';
  document.getElementById('breathCount').textContent = '';
  const circle = document.getElementById('breathCircle');
  circle.style.transitionDuration = '.6s';
  circle.style.transform = 'scale(0.7)';
  document.getElementById('breathStartBtn').textContent = 'Start';
}
function runBreathPhase(){
  const phase = BREATH_PHASES[breathPhaseIdx];
  const circle = document.getElementById('breathCircle');
  document.getElementById('breathLabel').textContent = phase.label;
  circle.style.transitionDuration = phase.seconds + 's';
  if(phase.label === 'Breathe in') circle.style.transform = 'scale(1.15)';
  else if(phase.label === 'Breathe out') circle.style.transform = 'scale(0.7)';
  // holds: leave the circle exactly where it is
  breathTimer = setTimeout(() => {
    breathPhaseIdx++;
    if(breathPhaseIdx >= BREATH_PHASES.length){
      breathPhaseIdx = 0;
      breathCycles++;
      document.getElementById('breathCount').textContent = breathCycles + (breathCycles === 1 ? ' cycle' : ' cycles');
    }
    if(breathRunning) runBreathPhase();
  }, phase.seconds * 1000);
}
function startBreath(){
  breathRunning = true;
  document.getElementById('breathStartBtn').textContent = 'Stop';
  if(!playing){ playPause(); breathStartedAudio = true; }
  runBreathPhase();
}
function stopBreath(){
  breathRunning = false;
  clearTimeout(breathTimer);
  if(breathStartedAudio && playing){ playPause(); }
  breathStartedAudio = false;
  resetBreathUI();
}
function toggleBreath(){
  if(breathRunning) stopBreath(); else startBreath();
}

/* ===================================================================
   Daily affirmation — a small, gentle prompt on the dashboard. Picks
   deterministically by day so it feels like "today's" line, with a
   button to browse a different one in the moment.
=================================================================== */
let affirmationIdx = null;
function dayOfYear(){
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now - start) / 86400000);
}
function renderAffirmation(pickNew){
  if(affirmationIdx === null || pickNew){
    affirmationIdx = pickNew
      ? (affirmationIdx + 1 + Math.floor(Math.random() * (AFFIRMATIONS.length - 1))) % AFFIRMATIONS.length
      : dayOfYear() % AFFIRMATIONS.length;
  }
  const el = document.getElementById('affirmationText');
  if(el) el.textContent = AFFIRMATIONS[affirmationIdx];
}

/* ===================================================================
   Scroll-spy nav highlighting (sidebar + mobile bottom nav)
=================================================================== */
function initScrollSpy(){
  const navButtons = document.querySelectorAll('#navlist button');
  const bottomButtons = document.querySelectorAll('#mobileBottomNav button[data-target]');
  const sections = ['dashboard','feeling','journal','priorities','habits','months','board','settings'];
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        navButtons.forEach(b => b.classList.toggle('active', b.dataset.target === entry.target.id));
        bottomButtons.forEach(b => b.classList.toggle('bn-active', b.dataset.target === entry.target.id));
      }
    });
  }, { rootMargin: '-30% 0px -55% 0px', threshold: 0 });
  sections.forEach(id => {
    const el = document.getElementById(id);
    if(el) observer.observe(el);
  });
}

/* ===================================================================
   Settings: theme, compact mode, export / import backup, print
=================================================================== */
function applyTheme(){
  const dark = DATA.settings.theme === 'dark';
  document.body.classList.toggle('dark', dark);
  document.getElementById('darkModeToggle').checked = dark;
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content', dark ? '#241820' : '#F4C9D6');
  const mIcon = document.getElementById('mobileThemeIcon');
  mIcon.innerHTML = dark
    ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'
    : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
}
function applyCompact(){
  document.documentElement.style.setProperty('--font-scale', DATA.settings.compact ? '0.93' : '1');
  document.getElementById('compactToggle').checked = !!DATA.settings.compact;
}
const ACCENTS = ['rose', 'lavender', 'sage', 'amber', 'ocean'];
function applyAccent(){
  const accent = DATA.settings.accent || 'rose';
  ACCENTS.forEach(a => document.body.classList.toggle(`theme-${a}`, a === accent && a !== 'rose'));
  document.querySelectorAll('#accentSwatches .theme-swatch').forEach(sw => {
    sw.classList.toggle('active', sw.dataset.accent === accent);
  });
}
function exportBackup(){
  downloadBlob(JSON.stringify(DATA, null, 2), `rosewood-journal-backup-${todayISO()}.json`, 'application/json');
  toast('Backup downloaded');
}
function importBackup(file){
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const parsed = JSON.parse(reader.result);
      if(!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.journalEntries)){
        toast('That file doesn\u2019t look like a Rosewood Journal backup');
        return;
      }
      DATA = Object.assign(defaultData(), parsed);
      saveData();
      renderAll();
      applyTheme();
      applyCompact();
      applyAccent();
      applyBanner();
      renderAccountSettings();
      toast('Backup imported ✓');
    }catch(e){
      toast('Could not read that file');
    }
  };
  reader.readAsText(file);
}

/* ===================================================================
   Account: username + password login
=================================================================== */
async function hashCredential(username, password){
  const enc = new TextEncoder().encode('rosewood-salt-' + username.trim().toLowerCase() + ':' + password);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function renderAccountSettings(){
  const account = DATA.settings.account;
  const has = !!(account && account.passHash);
  document.getElementById('accountStatus').textContent = has
    ? `Logged in as "${account.username}" — this journal requires sign-in each time the page is reopened.`
    : 'No login set up — anyone with this browser can open your journal.';
  document.getElementById('accountCreateBtn').hidden = has;
  document.getElementById('accountChangePassBtn').hidden = !has;
  document.getElementById('accountLogoutBtn').hidden = !has;
  document.getElementById('accountRemoveBtn').hidden = !has;
  const sidebarBtn = document.getElementById('loginSidebarBtn');
  sidebarBtn.textContent = has ? '🔐 Log out' : '👤 Set up login';
}
let accountModalMode = 'create';
function openAccountModal(mode){
  accountModalMode = mode;
  document.getElementById('acctError').textContent = '';
  document.getElementById('acctUsername').value = mode === 'create' ? '' : (DATA.settings.account ? DATA.settings.account.username : '');
  document.getElementById('acctCurrentPass').value = '';
  document.getElementById('acctNewPass').value = '';
  document.getElementById('acctConfirmPass').value = '';
  document.getElementById('acctUsernameField').hidden = mode !== 'create';
  document.getElementById('acctCurrentPassField').hidden = mode === 'create';
  document.getElementById('acctNewPassField').hidden = mode === 'remove';
  document.getElementById('acctConfirmPassField').hidden = mode === 'remove';
  document.getElementById('acctNewPassLabel').innerHTML = mode === 'changePassword'
    ? 'New password <span class="tiny-sub">(min 4 characters)</span>'
    : 'Password <span class="tiny-sub">(min 4 characters)</span>';
  document.getElementById('accountModalTitle').textContent = mode === 'create' ? 'Create login' : mode === 'changePassword' ? 'Change password' : 'Remove login';
  document.getElementById('acctSaveBtn').textContent = mode === 'create' ? 'Create login' : mode === 'changePassword' ? 'Update password' : 'Remove login';
  openModal(document.getElementById('accountModalOverlay'));
  const focusId = mode === 'create' ? 'acctUsername' : 'acctCurrentPass';
  setTimeout(() => document.getElementById(focusId).focus(), 30);
}
async function handleAccountSave(){
  const errEl = document.getElementById('acctError');
  errEl.textContent = '';
  const account = DATA.settings.account;
  const username = document.getElementById('acctUsername').value.trim();
  const currentPass = document.getElementById('acctCurrentPass').value;
  const newPass = document.getElementById('acctNewPass').value;
  const confirmPass = document.getElementById('acctConfirmPass').value;

  if(accountModalMode !== 'create'){
    if(!account){ errEl.textContent = 'No login exists yet.'; return; }
    if(!currentPass){ errEl.textContent = 'Enter your current password.'; return; }
    const h = await hashCredential(account.username, currentPass);
    if(h !== account.passHash){ errEl.textContent = 'That password is incorrect.'; return; }
  }
  if(accountModalMode === 'remove'){
    DATA.settings.account = null;
    saveData();
    closeModal(document.getElementById('accountModalOverlay'));
    renderAccountSettings();
    toast('Login removed');
    return;
  }
  if(accountModalMode === 'create' && !username){ errEl.textContent = 'Choose a username.'; return; }
  if(newPass.length < 4){ errEl.textContent = 'Password must be at least 4 characters.'; return; }
  if(newPass !== confirmPass){ errEl.textContent = 'Passwords don\u2019t match.'; return; }

  const finalUsername = accountModalMode === 'create' ? username : account.username;
  DATA.settings.account = { username: finalUsername, passHash: await hashCredential(finalUsername, newPass) };
  saveData();
  closeModal(document.getElementById('accountModalOverlay'));
  renderAccountSettings();
  toast(accountModalMode === 'create' ? 'Login created — you\u2019ll sign in next time you reopen the journal' : 'Password updated');
}
function showLockScreen(){
  const account = DATA.settings.account;
  document.getElementById('loginSubtext').textContent = account
    ? `Sign in as "${account.username}" to open your journal.`
    : 'Sign in to open your journal.';
  document.getElementById('lockScreen').hidden = false;
  document.getElementById('loginUsernameInput').value = account ? account.username : '';
  document.getElementById('loginPasswordInput').value = '';
  document.getElementById('lockError').textContent = '';
  setTimeout(() => document.getElementById(account ? 'loginPasswordInput' : 'loginUsernameInput').focus(), 50);
}
function hideLockScreen(){ document.getElementById('lockScreen').hidden = true; }
async function attemptUnlock(){
  const account = DATA.settings.account;
  if(!account) { hideLockScreen(); return; }
  const username = document.getElementById('loginUsernameInput').value.trim();
  const password = document.getElementById('loginPasswordInput').value;
  if(!username || !password) return;
  const h = await hashCredential(username, password);
  if(h === account.passHash && username.toLowerCase() === account.username.toLowerCase()){
    hideLockScreen();
  } else {
    document.getElementById('lockError').textContent = 'Incorrect username or password, try again.';
    document.getElementById('loginPasswordInput').value = '';
    document.getElementById('loginPasswordInput').focus();
  }
}

/* ===================================================================
   Voice journaling (Web Speech API, graceful no-op if unsupported)
=================================================================== */
let recognition = null, recognizing = false;
function initVoice(){
  const btn = document.getElementById('voiceBtn');
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ btn.hidden = true; return; }
  recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  let baseText = '';
  recognition.onstart = () => {
    recognizing = true;
    btn.classList.add('recording');
    btn.textContent = '⏺ Listening…';
    baseText = document.getElementById('entryReflection').value;
  };
  recognition.onresult = e => {
    let finalT = '', interimT = '';
    for(let i = e.resultIndex; i < e.results.length; i++){
      const t = e.results[i][0].transcript;
      if(e.results[i].isFinal) finalT += t;
      else interimT += t;
    }
    const ta = document.getElementById('entryReflection');
    const sep = baseText && !/\s$/.test(baseText) ? ' ' : '';
    if(finalT){
      baseText = (baseText + sep + finalT).slice(0, 600);
      ta.value = baseText;
    } else {
      ta.value = (baseText + sep + interimT).slice(0, 600);
    }
  };
  recognition.onerror = () => toast('Voice input had trouble hearing you');
  recognition.onend = () => {
    recognizing = false;
    btn.classList.remove('recording');
    btn.textContent = '🎙️ Speak';
  };
  btn.addEventListener('click', () => {
    if(recognizing) recognition.stop();
    else { try{ recognition.start(); }catch(e){ /* already started */ } }
  });
}
function stopVoiceIfActive(){ if(recognizing && recognition) recognition.stop(); }

/* ===================================================================
   Command palette (Ctrl/Cmd+K)
=================================================================== */
const PALETTE_SECTIONS = [
  { label: 'Dashboard', id: 'dashboard', ic: '🏠' },
  { label: 'Feeling Today', id: 'feeling', ic: '💗' },
  { label: 'Journal Entries', id: 'journal', ic: '📓' },
  { label: 'Priorities & To-Do', id: 'priorities', ic: '✓' },
  { label: 'Habit Tracker', id: 'habits', ic: '📈' },
  { label: 'Monthly Overview', id: 'months', ic: '📅' },
  { label: 'Mood Board', id: 'board', ic: '📌' },
  { label: 'Settings', id: 'settings', ic: '⚙️' }
];
let paletteIndex = 0, paletteItems = [];
function buildPaletteItems(query){
  const q = query.trim().toLowerCase();
  const items = [];
  PALETTE_SECTIONS.forEach(s => {
    if(!q || s.label.toLowerCase().includes(q)) items.push({ label: s.label, sub: 'Section', ic: s.ic, action: () => jump(s.id) });
  });
  if(q){
    DATA.journalEntries.forEach(e => {
      if(e.title.toLowerCase().includes(q) || e.reflection.toLowerCase().includes(q) || e.tags.some(t => t.toLowerCase().includes(q))){
        items.push({
          label: e.title, sub: `Journal · ${formatDate(e.date)}`, ic: '📝',
          action: () => {
            activeMoodFilter = null; activeTagFilter = null;
            searchTerm = e.title;
            document.getElementById('journalSearch').value = e.title;
            renderMoods(); renderTagChips(); renderJournal();
            jump('journal');
          }
        });
      }
    });
    ['top', 'todo', 'remember'].forEach(key => {
      DATA.priorities[key].forEach(it => {
        if(it.text.toLowerCase().includes(q)) items.push({ label: it.text, sub: it.done ? 'Task · done' : 'Task', ic: it.done ? '✔️' : '⬜', action: () => jump('priorities') });
      });
    });
    DATA.habits.forEach(h => {
      if(h.name.toLowerCase().includes(q)) items.push({ label: h.name, sub: 'Habit', ic: '📈', action: () => jump('habits') });
    });
    MONTHS.forEach(m => {
      if(m.toLowerCase().includes(q)) items.push({ label: m, sub: 'Monthly overview', ic: '📅', action: () => openMonthModal(m) });
    });
  }
  return items.slice(0, 40);
}
function renderPalette(){
  const q = document.getElementById('paletteInput').value;
  paletteItems = buildPaletteItems(q);
  paletteIndex = 0;
  const box = document.getElementById('paletteResults');
  if(paletteItems.length === 0){ box.innerHTML = '<div class="palette-empty">Nothing found</div>'; return; }
  box.innerHTML = paletteItems.map((it, i) => `
    <div class="palette-item${i === 0 ? ' active' : ''}" data-idx="${i}">
      <span>${it.ic}</span><span>${esc(it.label)}</span><span class="tag">${esc(it.sub)}</span>
    </div>`).join('');
}
function setPaletteActive(i){
  paletteIndex = Math.max(0, Math.min(i, paletteItems.length - 1));
  document.querySelectorAll('.palette-item').forEach(el => el.classList.toggle('active', Number(el.dataset.idx) === paletteIndex));
  const active = document.querySelector('.palette-item.active');
  if(active) active.scrollIntoView({ block: 'nearest' });
}
function openPalette(){
  document.getElementById('paletteInput').value = '';
  openModal(document.getElementById('paletteOverlay'));
  renderPalette();
  setTimeout(() => document.getElementById('paletteInput').focus(), 30);
}
function runPaletteItem(i){
  const it = paletteItems[i];
  if(!it) return;
  closeModal(document.getElementById('paletteOverlay'));
  it.action();
}

/* ===================================================================
   Achievements
=================================================================== */
const ACHIEVEMENTS = [
  { ic: '🌱', label: 'First Entry', test: s => s.entries >= 1 },
  { ic: '🔥', label: '3-Day Streak', test: s => s.streak >= 3 },
  { ic: '🔥', label: 'Week Streak', test: s => s.streak >= 7 },
  { ic: '📚', label: '10 Entries', test: s => s.entries >= 10 },
  { ic: '📖', label: '50 Entries', test: s => s.entries >= 50 },
  { ic: '❤️', label: '5 Favorites', test: s => s.favorites >= 5 },
  { ic: '✅', label: 'Task Master', test: s => s.tasksDone >= 10 },
  { ic: '📈', label: 'Habit Streak', test: s => s.bestHabitStreak >= 7 },
  { ic: '🎨', label: 'Board Curator', test: s => s.boardCount >= 8 },
  { ic: '🗓️', label: 'Planner Pro', test: s => s.monthNotesCount >= 3 }
];
function computeAchievementStats(){
  const entries = DATA.journalEntries.length;
  const favorites = DATA.journalEntries.filter(e => e.favorite).length;
  const streak = journalStreak();
  let tasksDone = 0;
  ['top', 'todo', 'remember'].forEach(k => DATA.priorities[k].forEach(it => { if(it.done) tasksDone++; }));
  const bestHabitStreak = DATA.habits.reduce((m, h) => Math.max(m, habitStreak(h)), 0);
  const boardCount = DATA.boardItems.length;
  const monthNotesCount = Object.keys(DATA.monthNotes).filter(k => DATA.monthNotes[k] && DATA.monthNotes[k].trim()).length;
  return { entries, favorites, streak, tasksDone, bestHabitStreak, boardCount, monthNotesCount };
}
function renderAchievements(){
  const stats = computeAchievementStats();
  const unlocked = ACHIEVEMENTS.filter(a => a.test(stats)).length;
  document.getElementById('achievementsSub').textContent = `${unlocked} / ${ACHIEVEMENTS.length} unlocked`;
  document.getElementById('achvGrid').innerHTML = ACHIEVEMENTS.map(a => {
    const on = a.test(stats);
    return `<div class="achv-badge${on ? ' unlocked' : ''}" title="${on ? 'Unlocked' : 'Locked'}"><span class="achv-ic">${a.ic}</span><span>${esc(a.label)}</span></div>`;
  }).join('');
}

/* ===================================================================
   Wire up all event listeners
=================================================================== */
function initEvents(){
  // Mobile drawer
  document.getElementById('menuToggle').addEventListener('click', openDrawer);
  document.getElementById('drawerClose').addEventListener('click', closeDrawer);
  document.getElementById('drawerBackdrop').addEventListener('click', closeDrawer);
  document.querySelectorAll('#navlist button').forEach(b => b.addEventListener('click', closeDrawer));

  // Mobile bottom nav
  document.querySelectorAll('#mobileBottomNav button[data-target]').forEach(b => {
    b.addEventListener('click', () => jump(b.dataset.target));
  });
  document.getElementById('fabAdd').addEventListener('click', () => openEntryModal(null));

  // Theme toggles
  document.getElementById('darkModeToggle').addEventListener('change', function(){
    DATA.settings.theme = this.checked ? 'dark' : 'light';
    saveData(); applyTheme();
  });
  document.getElementById('mobileThemeToggle').addEventListener('click', () => {
    DATA.settings.theme = DATA.settings.theme === 'dark' ? 'light' : 'dark';
    saveData(); applyTheme();
  });
  document.getElementById('compactToggle').addEventListener('change', function(){
    DATA.settings.compact = this.checked;
    saveData(); applyCompact();
  });
  document.getElementById('accentSwatches').addEventListener('click', e => {
    const sw = e.target.closest('.theme-swatch');
    if(!sw) return;
    DATA.settings.accent = sw.dataset.accent;
    saveData(); applyAccent();
  });

  // Account / login
  document.getElementById('accountCreateBtn').addEventListener('click', () => openAccountModal('create'));
  document.getElementById('accountChangePassBtn').addEventListener('click', () => openAccountModal('changePassword'));
  document.getElementById('accountRemoveBtn').addEventListener('click', () => openAccountModal('remove'));
  document.getElementById('accountLogoutBtn').addEventListener('click', showLockScreen);
  document.getElementById('acctSaveBtn').addEventListener('click', handleAccountSave);
  ['acctUsername','acctCurrentPass','acctNewPass','acctConfirmPass'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => { if(e.key === 'Enter') handleAccountSave(); });
  });
  document.getElementById('loginSidebarBtn').addEventListener('click', () => {
    if(DATA.settings.account) showLockScreen();
    else openAccountModal('create');
  });
  document.getElementById('lockUnlockBtn').addEventListener('click', attemptUnlock);
  document.getElementById('loginUsernameInput').addEventListener('keydown', e => { if(e.key === 'Enter') document.getElementById('loginPasswordInput').focus(); });
  document.getElementById('loginPasswordInput').addEventListener('keydown', e => { if(e.key === 'Enter') attemptUnlock(); });

  // Command palette
  document.getElementById('paletteOpenBtn').addEventListener('click', openPalette);
  document.getElementById('paletteInput').addEventListener('input', renderPalette);
  document.getElementById('paletteResults').addEventListener('click', e => {
    const item = e.target.closest('.palette-item');
    if(item) runPaletteItem(Number(item.dataset.idx));
  });
  document.getElementById('paletteInput').addEventListener('keydown', e => {
    if(e.key === 'ArrowDown'){ e.preventDefault(); setPaletteActive(paletteIndex + 1); }
    else if(e.key === 'ArrowUp'){ e.preventDefault(); setPaletteActive(paletteIndex - 1); }
    else if(e.key === 'Enter'){ e.preventDefault(); runPaletteItem(paletteIndex); }
  });
  document.addEventListener('keydown', e => {
    if((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'){
      e.preventDefault();
      openPalette();
    }
  });

  // Data: export / import / print
  document.getElementById('exportDataBtn').addEventListener('click', exportBackup);
  document.getElementById('importDataBtn').addEventListener('click', () => document.getElementById('importFileInput').click());
  document.getElementById('importFileInput').addEventListener('change', function(){
    if(this.files[0]) importBackup(this.files[0]);
    this.value = '';
  });
  document.getElementById('printBtn').addEventListener('click', () => window.print());
  document.getElementById('exportEntriesBtn').addEventListener('click', exportJournalCSV);

  // Journal
  document.getElementById('addEntryBtn').addEventListener('click', () => openEntryModal(null));
  document.getElementById('saveEntryBtn').addEventListener('click', saveEntry);
  document.getElementById('journalSearch').addEventListener('input', function(){
    searchTerm = this.value;
    renderJournal();
  });
  document.getElementById('journalSort').addEventListener('change', function(){
    sortMode = this.value;
    renderJournal();
  });
  document.getElementById('clearFilterBtn').addEventListener('click', () => {
    activeMoodFilter = null;
    activeTagFilter = null;
    renderMoods();
    renderTagChips();
    renderJournal();
  });
  document.getElementById('tagChipRow').addEventListener('click', e => {
    const chip = e.target.closest('.tag-chip');
    if(!chip) return;
    const tag = chip.dataset.tag;
    activeTagFilter = activeTagFilter === tag ? null : tag;
    renderTagChips();
    renderJournal();
  });
  document.getElementById('journalBody').addEventListener('click', e => {
    const tr = e.target.closest('tr');
    if(!tr) return;
    const id = tr.dataset.id;
    if(e.target.closest('[data-action="heart"]')){
      const entry = DATA.journalEntries.find(x => x.id === id);
      if(entry){ entry.favorite = !entry.favorite; saveData(); renderJournal(); }
    }
    if(e.target.closest('[data-action="del"]')){
      const idx = DATA.journalEntries.findIndex(x => x.id === id);
      if(idx === -1) return;
      const [removed] = DATA.journalEntries.splice(idx, 1);
      saveData();
      renderMoods(); renderJournal(); renderTagChips(); renderDashboard(); renderMonths();
      toast('Entry deleted', () => {
        DATA.journalEntries.splice(idx, 0, removed);
        saveData();
        renderMoods(); renderJournal(); renderTagChips(); renderDashboard(); renderMonths();
      });
    }
  });

  // Mood cards
  document.getElementById('moodGrid').addEventListener('click', e => {
    const addBtn = e.target.closest('[data-mood-add]');
    if(addBtn){ openEntryModal(addBtn.dataset.moodAdd); return; }
    const card = e.target.closest('.mood-card');
    if(card){
      const mood = card.dataset.mood;
      activeMoodFilter = activeMoodFilter === mood ? null : mood;
      renderMoods();
      renderJournal();
      jump('journal');
    }
  });

  // Priorities / to-do / remember
  document.querySelectorAll('.add-item-btn').forEach(btn => {
    btn.addEventListener('click', () => addItem(btn.dataset.list));
  });
  ['top','todo','remember'].forEach(key => {
    document.getElementById(`input-${key}`).addEventListener('keydown', e => {
      if(e.key === 'Enter') addItem(key);
    });
    const ul = document.getElementById(`list-${key}`);
    ul.addEventListener('change', e => {
      if(e.target.matches('input[type="checkbox"]')){
        const li = e.target.closest('li');
        const item = DATA.priorities[key].find(x => x.id === li.dataset.id);
        if(item){ item.done = e.target.checked; saveData(); renderList(key); renderDashboard(); }
      }
    });
    ul.addEventListener('click', e => {
      if(e.target.closest('.item-del')){
        const li = e.target.closest('li');
        const idx = DATA.priorities[key].findIndex(x => x.id === li.dataset.id);
        if(idx === -1) return;
        const [removed] = DATA.priorities[key].splice(idx, 1);
        saveData();
        renderList(key);
        renderDashboard();
        toast('Item removed', () => {
          DATA.priorities[key].splice(idx, 0, removed);
          saveData(); renderList(key); renderDashboard();
        });
      }
    });
  });
  initDragReorder();

  // Habits
  document.getElementById('addHabitBtn').addEventListener('click', openHabitModal);
  document.getElementById('saveHabitBtn').addEventListener('click', saveHabit);
  document.getElementById('habitColorSwatches').addEventListener('click', e => {
    const sw = e.target.closest('.color-swatch');
    if(!sw) return;
    document.querySelectorAll('#habitColorSwatches .color-swatch').forEach(s => s.classList.remove('active'));
    sw.classList.add('active');
    document.getElementById('habitColorSwatches').dataset.selected = sw.dataset.color;
  });
  document.getElementById('habitTable').addEventListener('click', e => {
    const dayBtn = e.target.closest('.habit-day');
    if(dayBtn && !dayBtn.disabled){
      const habit = DATA.habits.find(h => h.id === dayBtn.dataset.habit);
      const date = dayBtn.dataset.date;
      if(habit){
        const i = habit.completedDates.indexOf(date);
        if(i === -1) habit.completedDates.push(date); else habit.completedDates.splice(i, 1);
        saveData();
        renderHabits();
        renderDashboard();
      }
      return;
    }
    const delBtn = e.target.closest('[data-del-habit]');
    if(delBtn){
      const idx = DATA.habits.findIndex(h => h.id === delBtn.dataset.delHabit);
      if(idx === -1) return;
      const [removed] = DATA.habits.splice(idx, 1);
      saveData();
      renderHabits();
      renderDashboard();
      toast('Habit removed', () => { DATA.habits.splice(idx, 0, removed); saveData(); renderHabits(); renderDashboard(); });
    }
  });

  // Months
  document.getElementById('monthGallery').addEventListener('click', e => {
    const card = e.target.closest('.month-card');
    if(card) openMonthModal(card.dataset.month);
  });
  document.getElementById('saveMonthBtn').addEventListener('click', saveMonthNotes);
  document.getElementById('miniCal').addEventListener('click', e => {
    const day = e.target.closest('.mini-cal-day:not(.empty)');
    if(!day) return;
    closeModal(document.getElementById('monthModalOverlay'));
    openEntryModal(null, day.dataset.date);
  });

  // Mood board
  document.getElementById('boardGrid').addEventListener('click', e => {
    if(e.target.closest('#boardAddTile')){
      openBoardModal();
      return;
    }
    if(e.target.closest('[data-action="del-board"]')){
      const card = e.target.closest('.board-card');
      const idx = DATA.boardItems.findIndex(x => x.id === card.dataset.id);
      if(idx === -1) return;
      const [removed] = DATA.boardItems.splice(idx, 1);
      saveData();
      renderBoard();
      toast('Removed from board', () => { DATA.boardItems.splice(idx, 0, removed); saveData(); renderBoard(); });
      return;
    }
    const textEl = e.target.closest('[data-field="caption"]');
    if(textEl){ beginBoardTextEdit(textEl); }
  });
  document.getElementById('boardGrid').addEventListener('keydown', e => {
    const textEl = e.target.closest('[data-field="caption"]');
    if(textEl && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); beginBoardTextEdit(textEl); }
  });
  initBoardDragAndDrop();
  document.getElementById('boardTabPhoto').addEventListener('click', () => setBoardTab('photo'));
  document.getElementById('boardTabNote').addEventListener('click', () => setBoardTab('note'));
  document.getElementById('boardColorSwatches').addEventListener('click', e => {
    const sw = e.target.closest('.color-swatch');
    if(!sw) return;
    document.querySelectorAll('#boardColorSwatches .color-swatch').forEach(s => s.classList.remove('active'));
    sw.classList.add('active');
    document.getElementById('boardColorSwatches').dataset.selected = sw.dataset.color;
  });
  document.getElementById('saveBoardBtn').addEventListener('click', saveBoardItem);

  // Modals: close buttons + overlay click + escape
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => { stopVoiceIfActive(); closeModal(btn.closest('.modal-overlay')); });
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if(e.target === overlay){ stopVoiceIfActive(); closeModal(overlay); } });
  });
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape'){
      if(!document.getElementById('breathModalOverlay').hidden) stopBreath();
      stopVoiceIfActive();
      document.querySelectorAll('.modal-overlay').forEach(ov => { if(!ov.hidden) closeModal(ov); });
      closeDrawer();
      return;
    }
    const typing = ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName);
    if(e.key === '/' && !typing){
      e.preventDefault();
      jump('journal');
      document.getElementById('journalSearch').focus();
    }
    if((e.key === 'n' || e.key === 'N') && !typing){
      e.preventDefault();
      openEntryModal(null);
    }
  });

  // Music player
  document.getElementById('playerPlay').addEventListener('click', playPause);
  document.getElementById('playerNext').addEventListener('click', nextTrack);
  document.getElementById('playerPrev').addEventListener('click', prevTrack);
  document.getElementById('playerShuffle').addEventListener('click', function(){
    shuffle = !shuffle;
    this.classList.toggle('active-toggle', shuffle);
    toast(shuffle ? 'Shuffle on' : 'Shuffle off');
  });
  document.getElementById('soundPicker').addEventListener('click', e => {
    const chip = e.target.closest('.sound-chip');
    if(!chip) return;
    selectTrack(SOUNDSCAPES.findIndex(s => s.id === chip.dataset.sound));
  });
  document.getElementById('playerVolume').addEventListener('input', function(){
    volume = Number(this.value);
    muted = volume === 0;
    updateVolIcon();
  });
  document.getElementById('playerMute').addEventListener('click', function(){
    muted = !muted;
    const slider = document.getElementById('playerVolume');
    if(muted){ slider.dataset.prev = slider.value; slider.value = 0; }
    else { slider.value = slider.dataset.prev || 70; }
    volume = Number(slider.value);
    updateVolIcon();
  });
  document.getElementById('sleepTimerSelect').addEventListener('change', function(){
    const mins = Number(this.value);
    setSleepTimer(mins);
    toast(mins ? `Sound will fade out in ${mins} min` : 'Sleep timer off');
  });

  // Journal writing prompt
  document.getElementById('journalPromptBtn').addEventListener('click', () => {
    const ta = document.getElementById('entryReflection');
    const prompt = JOURNAL_PROMPTS[Math.floor(Math.random() * JOURNAL_PROMPTS.length)];
    if(!ta.value.trim()){
      ta.value = prompt + '\n\n';
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    } else {
      toast(prompt);
    }
  });

  // Breathing exercise
  document.getElementById('breatheOpenBtn').addEventListener('click', openBreathModal);
  document.getElementById('breathStartBtn').addEventListener('click', toggleBreath);
  document.getElementById('breathModalOverlay').querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', closeBreathModalUI);
  });
  document.getElementById('breathModalOverlay').addEventListener('click', e => {
    if(e.target === document.getElementById('breathModalOverlay')) closeBreathModalUI();
  });

  // Daily affirmation
  document.getElementById('affirmationRefresh').addEventListener('click', () => renderAffirmation(true));

  // Reset (sidebar + settings page)
  function doReset(){
    if(confirm("Reset all planner data back to the demo defaults? This can't be undone.")){
      DATA = defaultData();
      saveData();
      activeMoodFilter = null;
      activeTagFilter = null;
      searchTerm = '';
      document.getElementById('journalSearch').value = '';
      renderAll();
      applyTheme();
      applyCompact();
      applyAccent();
      applyBanner();
      renderAccountSettings();
      toast('Reset to demo data');
    }
  }
  document.getElementById('resetDataBtn').addEventListener('click', doReset);
  document.getElementById('resetDataBtn2').addEventListener('click', doReset);
}

/* ===================================================================
   Init
=================================================================== */
function renderAll(){
  renderDashboard();
  renderMoods();
  renderTagChips();
  renderJournal();
  renderAllLists();
  renderHabits();
  renderMonths();
  renderBoard();
  renderTrack();
  renderAffirmation();
  setPlayIcon();
  updateVolIcon();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('todayDate').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  populateMoodSelect();
  initAvatar();
  initBanner();
  initVoice();
  initEvents();
  initScrollSpy();
  applyTheme();
  applyCompact();
  applyAccent();
  renderAccountSettings();
  renderAll();
  if(DATA.settings.account) showLockScreen();
});
