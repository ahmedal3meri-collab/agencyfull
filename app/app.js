import { renderMarkdown, escapeHtml as h } from './md.js';

// ── Constants ────────────────────────────────────────────────────────────
const CATS = {
  engineering: 'هندسة',
  design: 'تصميم',
  marketing: 'تسويق',
  'paid-media': 'إعلانات مدفوعة',
  sales: 'مبيعات',
  product: 'منتج',
  'project-management': 'إدارة مشاريع',
  strategy: 'استراتيجية',
  finance: 'مالية',
  support: 'دعم',
  testing: 'اختبار',
  'game-development': 'تطوير ألعاب',
  'spatial-computing': 'حوسبة مكانية',
  academic: 'أكاديمي',
  specialized: 'متخصصون',
};
const COLORS = {
  orange: '#f08c3a', blue: '#4c8dff', green: '#3fb984', purple: '#a278f5', teal: '#2bb3a3', red: '#ef5b5b',
  indigo: '#7480ff', cyan: '#2cb8d6', amber: '#eba82c', pink: '#ee6aa7', yellow: '#dcb421', violet: '#9a6cf2',
  slate: '#8391a8', rose: '#f0637f', lime: '#8fc232', gray: '#8f95a3', gold: '#d6a92b', fuchsia: '#d85ce6',
  'neon-green': '#3ddc84', 'neon-cyan': '#22d3ee', 'metallic-blue': '#5b8fc7',
};
const PROVIDERS = {
  openrouter: {
    label: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    keyHint: 'sk-or-v1-…',
    keysUrl: 'https://openrouter.ai/keys',
    defaultModel: 'deepseek/deepseek-r1-0528:free',
    models: [
      'deepseek/deepseek-r1-0528:free', 'deepseek/deepseek-chat-v3-0324:free', 'meta-llama/llama-4-maverick:free',
      'meta-llama/llama-3.3-70b-instruct:free', 'mistralai/mistral-small-3.1-24b-instruct:free',
      'google/gemma-3-27b-it:free', 'qwen/qwen-2.5-72b-instruct:free', 'moonshotai/kimi-k2:free',
    ],
  },
  openai: {
    label: 'OpenAI',
    url: 'https://api.openai.com/v1/chat/completions',
    keyHint: 'sk-…',
    keysUrl: 'https://platform.openai.com/api-keys',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1'],
  },
};
const STARTERS = ['عرّف بنفسك وكيف تقدر تساعدني', 'ما أول ٣ أسئلة تحتاج تسألني قبل ما نبدأ؟', 'أعطني خطة عمل مختصرة لمشروعي'];
const MAX_HISTORY = 60;

// ── Storage ──────────────────────────────────────────────────────────────
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full / private mode */ } },
  del(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } },
  keys(prefix) {
    try { return Object.keys(localStorage).filter((k) => k.startsWith(prefix)); } catch { return []; }
  },
};

const state = {
  agents: [],
  byId: new Map(),
  favs: new Set(store.get('favs', [])),
  settings: { provider: 'openrouter', keys: {}, models: {}, ...store.get('settings', {}) },
  query: '',
  cat: 'all',
  homeScroll: 0,
  stream: null, // AbortController of the running chat request
  installEvent: null,
};
const saveSettings = () => store.set('settings', state.settings);
const provider = () => PROVIDERS[state.settings.provider] || PROVIDERS.openrouter;
const apiKey = () => (state.settings.keys[state.settings.provider] || '').trim();
const model = () => (state.settings.models[state.settings.provider] || '').trim() || provider().defaultModel;

// ── Helpers ──────────────────────────────────────────────────────────────
const view = document.getElementById('view');
const $ = (sel, el = view) => el.querySelector(sel);
const $$ = (sel, el = view) => [...el.querySelectorAll(sel)];
const colorOf = (a) => (a.color ? (a.color.startsWith('#') ? a.color : COLORS[a.color]) : null) || '#9b8cff';
const tile = (a) => `<span class="tile" style="--c:${h(colorOf(a))}" aria-hidden="true">${h(a.emoji || a.name[0])}</span>`;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const arNum = (n) => n.toLocaleString('ar-EG');

const ICON = {
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/></svg>',
  back: '<svg class="flip" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  send: '<svg class="flip" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20l18-8L3 4l3 8z"/></svg>',
  stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg>',
  share: '<svg class="ios-share" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3M8 7l4-4 4 4M6 11H5v10h14V11h-1"/></svg>',
};

let toastTimer;
function toast(text, action) {
  const el = document.getElementById('toast');
  clearTimeout(toastTimer);
  el.innerHTML = `<span>${h(text)}</span>${action ? `<button type="button">${h(action.label)}</button>` : ''}`;
  el.hidden = false;
  if (action) el.querySelector('button').onclick = () => { el.hidden = true; action.run(); };
  else toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

const bodyCache = new Map();
async function loadBody(id) {
  if (bodyCache.has(id)) return bodyCache.get(id);
  const res = await fetch(`agents/${id.split('/').map(encodeURIComponent).join('/')}.md`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = (await res.text()).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  bodyCache.set(id, text);
  return text;
}

function toggleFav(id) {
  state.favs.has(id) ? state.favs.delete(id) : state.favs.add(id);
  store.set('favs', [...state.favs]);
  return state.favs.has(id);
}

// ── Cards / lists ────────────────────────────────────────────────────────
function card(a, extra = '') {
  const on = state.favs.has(a.id);
  return `<a class="card" href="#/a/${h(a.id)}">
    ${tile(a)}
    <div>
      <h3>${h(a.name)}</h3>
      <p>${h(extra || a.vibe || a.desc)}</p>
      <span class="tag">${h(CATS[a.cat] || a.cat)}${a.doc ? ' · دليل' : ''}</span>
    </div>
    <button class="star${on ? ' on' : ''}" type="button" data-fav="${h(a.id)}" aria-pressed="${on}" aria-label="${on ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}">${ICON.star}</button>
  </a>`;
}

view.addEventListener('click', (e) => {
  const star = e.target.closest('[data-fav]');
  if (!star) return;
  e.preventDefault();
  const on = toggleFav(star.dataset.fav);
  star.classList.toggle('on', on);
  star.setAttribute('aria-pressed', on);
  star.setAttribute('aria-label', on ? 'إزالة من المفضلة' : 'إضافة للمفضلة');
  if (star.dataset.rerender) route();
});

function filtered() {
  const terms = state.query.toLowerCase().split(/\s+/).filter(Boolean);
  return state.agents.filter((a) => {
    if (state.cat !== 'all' && a.cat !== state.cat) return false;
    return terms.every((t) => a._hay.includes(t));
  });
}

// ── Views ────────────────────────────────────────────────────────────────
function installBanner() {
  if (isStandalone() || store.get('installDismissed', false)) return '';
  if (isIOS()) {
    return `<div class="banner" id="install-banner"><span>📲</span>
      <span>ثبّت التطبيق على الآيفون: اضغط ${ICON.share} <strong>مشاركة</strong> ثم <strong>«إضافة إلى الشاشة الرئيسية»</strong>.</span>
      <button class="x" type="button" aria-label="إغلاق">✕</button></div>`;
  }
  if (state.installEvent) {
    return `<div class="banner" id="install-banner"><span>📲</span><span>ثبّت التطبيق عشان يفتح بسرعة ويشتغل بدون نت.</span>
      <button class="btn primary" type="button" id="install-now" style="flex:none;min-height:38px">تثبيت</button>
      <button class="x" type="button" aria-label="إغلاق">✕</button></div>`;
  }
  return '';
}

function viewHome() {
  const counts = {};
  for (const a of state.agents) counts[a.cat] = (counts[a.cat] || 0) + 1;
  const cats = Object.keys(CATS).filter((c) => counts[c]);
  view.innerHTML = `
    <header class="page-head">
      <h1>الوكلاء</h1>
      <span class="count">${navigator.onLine ? '' : '<span class="offline-pill">بدون نت</span> '}${arNum(state.agents.length)} وكيل</span>
    </header>
    ${installBanner()}
    <div class="sticky">
      <div class="search">
        ${ICON.search}
        <input id="q" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false"
          placeholder="ابحث بالاسم أو التخصص…" aria-label="بحث في الوكلاء" value="${h(state.query)}">
        <button class="clear" type="button" aria-label="مسح البحث" ${state.query ? '' : 'hidden'}>✕</button>
      </div>
      <div class="chips" role="tablist" aria-label="التصنيفات">
        <button class="chip${state.cat === 'all' ? ' on' : ''}" type="button" data-cat="all">الكل</button>
        ${cats.map((c) => `<button class="chip${state.cat === c ? ' on' : ''}" type="button" data-cat="${c}">${CATS[c]}<b>${arNum(counts[c])}</b></button>`).join('')}
      </div>
    </div>
    <div id="list" class="list"></div>`;

  const list = $('#list');
  const q = $('#q');
  const clear = $('.clear');
  const draw = () => {
    const items = filtered();
    list.innerHTML = items.length
      ? items.map((a) => card(a)).join('')
      : `<div class="empty" style="grid-column:1/-1"><span class="big">🔍</span>ما لقينا وكيل يطابق بحثك.<br><button type="button" id="reset">اعرض الكل</button></div>`;
    const reset = $('#reset');
    if (reset) reset.onclick = () => { state.query = ''; state.cat = 'all'; viewHome(); };
  };
  draw();

  q.addEventListener('input', () => {
    state.query = q.value;
    clear.hidden = !q.value;
    draw();
  });
  clear.onclick = () => { q.value = ''; state.query = ''; clear.hidden = true; draw(); q.focus(); };
  $('.chips').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-cat]');
    if (!chip) return;
    state.cat = chip.dataset.cat;
    $$('.chip').forEach((c) => c.classList.toggle('on', c === chip));
    draw();
    scrollTo({ top: 0 });
  });
  $('.chip.on')?.scrollIntoView({ block: 'nearest', inline: 'center' });

  const banner = $('#install-banner');
  if (banner) {
    $('.x', banner).onclick = () => { store.set('installDismissed', true); banner.remove(); };
    const now = $('#install-now', banner);
    if (now) now.onclick = async () => {
      state.installEvent.prompt();
      await state.installEvent.userChoice;
      state.installEvent = null;
      banner.remove();
    };
  }
  requestAnimationFrame(() => scrollTo({ top: state.homeScroll }));
}

function viewFav() {
  const items = state.agents.filter((a) => state.favs.has(a.id));
  view.innerHTML = `
    <header class="page-head"><h1>المفضلة</h1><span class="count">${arNum(items.length)}</span></header>
    ${items.length
      ? `<div class="list">${items.map((a) => card(a)).join('')}</div>`
      : `<div class="empty"><span class="big">⭐</span>ما عندك وكلاء مفضلين للحين.<br>اضغط النجمة على أي وكيل عشان تحفظه هنا.<br><a href="#/">تصفّح الوكلاء</a></div>`}`;
  $$('[data-fav]').forEach((b) => { b.dataset.rerender = '1'; });
}

function viewChats() {
  const items = store.keys('chat:')
    .map((k) => ({ a: state.byId.get(k.slice(5)), msgs: store.get(k, []) }))
    .filter((x) => x.a && x.msgs.length)
    .sort((x, y) => (y.msgs.at(-1).t || 0) - (x.msgs.at(-1).t || 0));
  view.innerHTML = `
    <header class="page-head"><h1>المحادثات</h1><span class="count">${arNum(items.length)}</span></header>
    ${items.length
      ? `<div class="list">${items.map(({ a, msgs }) => card(a, msgs.at(-1).content.slice(0, 140)).replace(`#/a/${h(a.id)}`, `#/chat/${h(a.id)}`)).join('')}</div>`
      : `<div class="empty"><span class="big">💬</span>ما بدأت أي محادثة للحين.<br>افتح أي وكيل واضغط «محادثة».<br><a href="#/">تصفّح الوكلاء</a></div>`}`;
}

async function viewAgent(id) {
  const a = state.byId.get(id);
  if (!a) return viewNotFound();
  const fav = state.favs.has(id);
  view.innerHTML = `
    <div class="topbar">
      <button class="icon-btn" type="button" id="back" aria-label="رجوع">${ICON.back}</button>
      <span class="title"></span>
      <button class="icon-btn${fav ? ' on' : ''}" type="button" id="fav" aria-pressed="${fav}" aria-label="مفضلة">${ICON.star}</button>
    </div>
    <section class="hero">
      ${tile(a)}
      <h1>${h(a.name)}</h1>
      <div class="cat">${h(CATS[a.cat] || a.cat)}${a.doc ? ' · دليل' : ''}</div>
      ${a.vibe ? `<p class="vibe">${h(a.vibe)}</p>` : ''}
    </section>
    <div class="actions">
      <a class="btn primary" href="#/chat/${h(id)}">💬 محادثة</a>
      <button class="btn" type="button" id="copy">نسخ البرومبت</button>
    </div>
    <article id="body" class="md ltr" aria-busy="true">
      ${[90, 100, 70, 95, 60].map((w) => `<div class="skeleton" style="width:${w}%"></div>`).join('')}
    </article>`;
  $('#back').onclick = goBack;
  $('#fav').onclick = (e) => {
    const on = toggleFav(id);
    e.currentTarget.classList.toggle('on', on);
    e.currentTarget.setAttribute('aria-pressed', on);
    toast(on ? 'انضاف للمفضلة' : 'انشال من المفضلة');
  };
  $('#copy').onclick = async () => {
    try { await copyText(await loadBody(id)); toast('انسخ البرومبت ✓'); } catch { toast('تعذّر النسخ'); }
  };
  scrollTo({ top: 0 });
  const body = $('#body');
  try {
    const text = await loadBody(id);
    if (!body.isConnected) return;
    // The hero already shows the title — drop the duplicate leading H1.
    body.innerHTML = renderMarkdown(text.replace(/^\s*#\s+.*\n/, ''));
  } catch {
    if (!body.isConnected) return;
    body.classList.remove('ltr');
    body.innerHTML = `<div class="empty"><span class="big">📡</span>تعذّر تحميل ملف الوكيل. تأكد من الاتصال وحاول مرة ثانية.<br><button type="button" id="retry">إعادة المحاولة</button></div>`;
    $('#retry').onclick = () => viewAgent(id);
  }
  body.removeAttribute('aria-busy');
}

function viewNotFound() {
  view.innerHTML = `<div class="empty"><span class="big">🤷</span>الصفحة غير موجودة.<br><a href="#/">الرجوع للوكلاء</a></div>`;
}

// ── Chat ─────────────────────────────────────────────────────────────────
function friendlyError(status, detail) {
  if (status === 401 || status === 403) return 'المفتاح غير صحيح أو ما له صلاحية. راجعه في الإعدادات.';
  if (status === 402) return 'الرصيد غير كافٍ لهذا النموذج. جرّب نموذج مجاني.';
  if (status === 404) return `النموذج «${model()}» غير متوفر. اختر نموذج ثاني من الإعدادات.`;
  if (status === 429) return 'وصلت حد الطلبات. انتظر شوي وجرب مرة ثانية، أو غيّر النموذج.';
  if (status >= 500) return 'الخدمة عندها مشكلة مؤقتة. جرب بعد شوي.';
  return detail || 'صار خطأ غير متوقع.';
}

async function* streamChat(messages, signal) {
  const res = await fetch(provider().url, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey()}` },
    body: JSON.stringify({ model: model(), messages, stream: true }),
  });
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).error?.message || ''; } catch { /* non-JSON error body */ }
    throw Object.assign(new Error(friendlyError(res.status, detail)), { friendly: true });
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      let json;
      try { json = JSON.parse(data); } catch { continue; }
      if (json.error) throw Object.assign(new Error(friendlyError(json.error.code, json.error.message)), { friendly: true });
      const delta = json.choices?.[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
}

function viewChat(id) {
  const a = state.byId.get(id);
  if (!a) return viewNotFound();
  const key = `chat:${id}`;
  let msgs = store.get(key, []);

  view.innerHTML = `
    <div class="chat">
      <div class="topbar">
        <button class="icon-btn" type="button" id="back" aria-label="رجوع">${ICON.back}</button>
        <a class="title" href="#/a/${h(id)}">${h(a.emoji || '')} ${h(a.name)}</a>
        <button class="icon-btn" type="button" id="clear" aria-label="مسح المحادثة">${ICON.trash}</button>
      </div>
      <div class="msgs" id="msgs" aria-live="polite"></div>
      <form class="composer" id="composer">
        <textarea id="input" rows="1" placeholder="اكتب رسالتك…" aria-label="رسالتك" enterkeyhint="send"></textarea>
        <button class="send" type="submit" id="send" aria-label="إرسال">${ICON.send}</button>
      </form>
    </div>`;

  const box = $('#msgs');
  const input = $('#input');
  const send = $('#send');
  const toBottom = () => scrollTo({ top: document.documentElement.scrollHeight });
  const nearBottom = () => innerHeight + scrollY > document.documentElement.scrollHeight - 160;

  const bubble = (m) => {
    const el = document.createElement('div');
    el.className = `msg ${m.role}`;
    if (m.role === 'user') el.textContent = m.content;
    else el.innerHTML = `<div class="md">${renderMarkdown(m.content)}</div>`;
    return el;
  };

  const drawAll = () => {
    box.innerHTML = '';
    if (!msgs.length) {
      const needKey = !apiKey();
      box.innerHTML = `<div class="empty" style="padding:28px 8px">
        ${tile(a).replace('class="tile"', 'class="tile" style="margin:0 auto 10px;width:64px;height:64px;font-size:32px;--c:' + h(colorOf(a)) + '"')}
        <div style="color:var(--text);font-weight:600;direction:ltr">${h(a.name)}</div>
        ${needKey
          ? `<p>عشان تتحدث مع الوكيل، ضيف مفتاح API (مجاني من OpenRouter).</p><a class="btn primary" href="#/settings" style="display:inline-flex;flex:none">فتح الإعدادات</a>`
          : `<p>ابدأ المحادثة، أو جرّب واحد من هذي:</p><div class="starters">${STARTERS.map((s) => `<button type="button">${h(s)}</button>`).join('')}</div>`}
      </div>`;
      $$('.starters button').forEach((b) => { b.onclick = () => submit(b.textContent); });
      return;
    }
    box.append(...msgs.map(bubble));
  };

  const setBusy = (busy) => {
    send.classList.toggle('stop', busy);
    send.innerHTML = busy ? ICON.stop : ICON.send;
    send.setAttribute('aria-label', busy ? 'إيقاف' : 'إرسال');
  };
  const save = () => {
    msgs = msgs.slice(-MAX_HISTORY);
    store.set(key, msgs);
  };
  const showError = (text) => {
    const el = document.createElement('div');
    el.className = 'msg error';
    el.textContent = text;
    box.append(el);
    toBottom();
  };

  async function submit(text) {
    text = text.trim();
    if (!text || state.stream) return;
    if (!apiKey()) { location.hash = '#/settings'; toast('ضيف مفتاح API أول'); return; }
    if (!navigator.onLine) { showError('أنت بدون نت. المحادثة تحتاج اتصال، لكن تصفّح الوكلاء يشتغل عادي.'); return; }

    if (!msgs.length) box.innerHTML = '';
    $$('.msg.error', box).forEach((el) => el.remove());
    msgs.push({ role: 'user', content: text, t: Date.now() });
    save();
    box.append(bubble(msgs.at(-1)));
    input.value = '';
    input.style.height = '';

    const el = document.createElement('div');
    el.className = 'msg assistant';
    el.innerHTML = '<span class="typing" aria-label="يكتب"><i></i><i></i><i></i></span>';
    box.append(el);
    toBottom();

    const ctrl = (state.stream = new AbortController());
    setBusy(true);
    let answer = '';
    let frame = 0;
    try {
      const system = await loadBody(id);
      const payload = [{ role: 'system', content: system }, ...msgs.map(({ role, content }) => ({ role, content }))];
      for await (const delta of streamChat(payload, ctrl.signal)) {
        answer += delta;
        if (!frame) {
          frame = requestAnimationFrame(() => {
            frame = 0;
            const stick = nearBottom();
            el.innerHTML = `<div class="md">${renderMarkdown(answer)}</div>`;
            if (stick) toBottom();
          });
        }
      }
      if (!answer) throw Object.assign(new Error('النموذج رجّع رد فاضي. جرّب مرة ثانية أو غيّر النموذج.'), { friendly: true });
    } catch (err) {
      if (err.name !== 'AbortError') {
        showError(err.friendly ? err.message : 'تعذّر الاتصال بالخدمة. تأكد من النت وحاول مرة ثانية.');
      }
    } finally {
      cancelAnimationFrame(frame);
      if (state.stream === ctrl) state.stream = null;
      if (answer) {
        msgs.push({ role: 'assistant', content: answer, t: Date.now() });
        save();
        el.innerHTML = `<div class="md">${renderMarkdown(answer)}</div>`;
      } else {
        el.remove();
      }
      if (send.isConnected) setBusy(false);
    }
  }

  $('#composer').addEventListener('submit', (e) => {
    e.preventDefault();
    if (state.stream) state.stream.abort();
    else submit(input.value);
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && matchMedia('(pointer: fine)').matches) {
      e.preventDefault();
      $('#composer').requestSubmit();
    }
  });
  $('#back').onclick = goBack;
  $('#clear').onclick = () => {
    if (!msgs.length || !confirm('تمسح كل رسائل هذي المحادثة؟')) return;
    state.stream?.abort();
    msgs = [];
    store.del(key);
    drawAll();
  };

  drawAll();
  requestAnimationFrame(toBottom);
}

// ── Settings ─────────────────────────────────────────────────────────────
function viewSettings() {
  const s = state.settings;
  const p = provider();
  const chatCount = store.keys('chat:').length;
  view.innerHTML = `
    <header class="page-head"><h1>الإعدادات</h1></header>

    <section class="group">
      <h2>مزوّد الذكاء الاصطناعي</h2>
      <p class="hint">المفتاح ينحفظ على جهازك فقط، ويُرسل مباشرة للمزوّد عند المحادثة.</p>
      <div class="field">
        <div class="seg" role="group" aria-label="المزوّد">
          ${Object.entries(PROVIDERS).map(([k, v]) => `<button type="button" data-provider="${k}" class="${s.provider === k ? 'on' : ''}">${v.label}${k === 'openrouter' ? ' (مجاني)' : ''}</button>`).join('')}
        </div>
      </div>
      <div class="field">
        <label for="key">مفتاح API</label>
        <input id="key" type="password" dir="ltr" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${p.keyHint}" value="${h(s.keys[s.provider] || '')}">
        <span class="hint" style="margin:0">ما عندك مفتاح؟ <a href="${p.keysUrl}" target="_blank" rel="noopener noreferrer" style="color:var(--accent);text-decoration:underline">احصل على واحد من ${p.label}</a></span>
      </div>
      <div class="field">
        <label for="model">النموذج</label>
        <input id="model" dir="ltr" list="models" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${h(p.defaultModel)}" value="${h(s.models[s.provider] || '')}">
        <datalist id="models"></datalist>
      </div>
      <div class="row">
        <button class="btn primary" type="button" id="test">اختبار الاتصال</button>
        ${s.provider === 'openrouter' ? '<button class="btn" type="button" id="refresh">تحديث النماذج المجانية</button>' : ''}
      </div>
      <div class="status" id="status" role="status"></div>
    </section>

    <section class="group">
      <h2>التثبيت على الآيفون</h2>
      ${isStandalone()
        ? '<p class="hint" style="margin:0">✓ التطبيق مثبّت ويشتغل كتطبيق مستقل.</p>'
        : `<ol class="steps">
            <li>افتح هذا الرابط في <strong>Safari</strong>.</li>
            <li>اضغط زر المشاركة ${ICON.share}.</li>
            <li>اختر <strong>«إضافة إلى الشاشة الرئيسية»</strong> ثم «إضافة».</li>
          </ol>`}
      <p class="hint" style="margin:10px 0 0">${'serviceWorker' in navigator && isSecureContext
        ? '✓ وضع بدون نت مفعّل: كل الوكلاء محفوظين على جهازك.'
        : '⚠︎ وضع بدون نت غير مفعّل لأن الرابط ليس HTTPS. افتح التطبيق من رابط https أو localhost.'}</p>
    </section>

    <section class="group">
      <h2>البيانات</h2>
      <p class="hint">${arNum(chatCount)} محادثة و${arNum(state.favs.size)} مفضلة محفوظة على هذا الجهاز.</p>
      <div class="row">
        <button class="btn danger" type="button" id="wipe-chats" ${chatCount ? '' : 'disabled'}>مسح كل المحادثات</button>
      </div>
    </section>

    <p class="meta">Agency PWA · v${h(state.version || 'dev')}</p>`;

  const status = $('#status');
  const setStatus = (text, cls = '') => { status.textContent = text; status.className = `status ${cls}`; };
  const fillModels = () => {
    const list = s.provider === 'openrouter' ? store.get('freeModels', p.models) : p.models;
    $('#models').innerHTML = list.map((m) => `<option value="${h(m)}"></option>`).join('');
  };
  fillModels();

  $$('[data-provider]').forEach((b) => {
    b.onclick = () => { s.provider = b.dataset.provider; saveSettings(); viewSettings(); };
  });
  $('#key').addEventListener('input', (e) => { s.keys[s.provider] = e.target.value.trim(); saveSettings(); setStatus(''); });
  $('#model').addEventListener('input', (e) => { s.models[s.provider] = e.target.value.trim(); saveSettings(); setStatus(''); });

  $('#test').onclick = async (e) => {
    if (!apiKey()) { setStatus('اكتب المفتاح أول.', 'bad'); $('#key').focus(); return; }
    e.currentTarget.disabled = true;
    setStatus('جاري الاختبار…');
    const ctrl = new AbortController();
    try {
      for await (const _ of streamChat([{ role: 'user', content: 'Say OK' }], ctrl.signal)) { ctrl.abort(); break; }
      setStatus(`✓ الاتصال شغّال مع ${model()}`, 'ok');
    } catch (err) {
      if (err.name === 'AbortError') setStatus(`✓ الاتصال شغّال مع ${model()}`, 'ok');
      else setStatus(err.friendly ? err.message : 'تعذّر الاتصال. تأكد من النت.', 'bad');
    }
    if (e.target.isConnected) e.target.disabled = false;
  };

  const refresh = $('#refresh');
  if (refresh) refresh.onclick = async () => {
    refresh.disabled = true;
    setStatus('جاري جلب النماذج…');
    try {
      const res = await fetch('https://openrouter.ai/api/v1/models');
      if (!res.ok) throw new Error();
      const free = (await res.json()).data
        .filter((m) => Number(m.pricing?.prompt) === 0 && Number(m.pricing?.completion) === 0)
        .map((m) => m.id)
        .sort();
      if (!free.length) throw new Error();
      store.set('freeModels', free);
      fillModels();
      setStatus(`✓ ${arNum(free.length)} نموذج مجاني متوفر — اختر من خانة النموذج.`, 'ok');
    } catch {
      setStatus('تعذّر جلب القائمة. تأكد من النت.', 'bad');
    }
    refresh.disabled = false;
  };

  $('#wipe-chats').onclick = () => {
    if (!confirm('تمسح كل المحادثات من هذا الجهاز؟ ما تقدر ترجعها.')) return;
    store.keys('chat:').forEach(store.del);
    toast('انمسحت المحادثات');
    viewSettings();
  };
  scrollTo({ top: 0 });
}

// ── Router ───────────────────────────────────────────────────────────────
let lastRoute = '';
function goBack() {
  if (history.length > 1 && lastRoute) history.back();
  else location.hash = '#/';
}

function route() {
  const path = decodeURIComponent(location.hash.slice(1)) || '/';
  if (lastRoute === '/' && path !== '/') state.homeScroll = scrollY;
  if (state.stream && !path.startsWith('/chat/')) state.stream.abort();

  const tab = path === '/' ? 'home' : ['fav', 'chats', 'settings'].find((t) => path === `/${t}`);
  document.body.classList.toggle('no-tabs', path.startsWith('/chat/'));
  document.querySelectorAll('#tabs a').forEach((el) => {
    const on = el.dataset.tab === tab;
    el.classList.toggle('active', on);
    on ? el.setAttribute('aria-current', 'page') : el.removeAttribute('aria-current');
  });

  if (path === '/') viewHome();
  else if (path === '/fav') { viewFav(); scrollTo({ top: 0 }); }
  else if (path === '/chats') { viewChats(); scrollTo({ top: 0 }); }
  else if (path === '/settings') viewSettings();
  else if (path.startsWith('/a/')) viewAgent(path.slice(3));
  else if (path.startsWith('/chat/')) viewChat(path.slice(6));
  else viewNotFound();
  lastRoute = path;
}

// ── Service worker ───────────────────────────────────────────────────────
async function registerSW() {
  if (!('serviceWorker' in navigator) || !isSecureContext) return;
  try {
    const reg = await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
    const offer = (worker) => {
      if (!worker || !navigator.serviceWorker.controller) return;
      toast('تحديث جديد جاهز', { label: 'تحديث', run: () => worker.postMessage('skipWaiting') });
    };
    if (reg.waiting) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      worker?.addEventListener('statechange', () => { if (worker.state === 'installed') offer(worker); });
    });
    let reloaded = false;
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded || !hadController) return;
      reloaded = true;
      location.reload();
    });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  } catch { /* SW unavailable — the app still works online */ }
}

// ── Boot ─────────────────────────────────────────────────────────────────
async function boot() {
  view.innerHTML = `<div class="empty"><span class="big">⏳</span>جاري التحميل…</div>`;
  try {
    const [index, ver] = await Promise.all([
      fetch('data/index.json').then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch('version.js').then((r) => r.text()).catch(() => ''),
    ]);
    state.version = /'([^']+)'/.exec(ver)?.[1];
    state.agents = index.agents;
    for (const a of state.agents) {
      a._hay = [a.name, a.desc, a.vibe, a.id, CATS[a.cat]].filter(Boolean).join(' ').toLowerCase();
      state.byId.set(a.id, a);
    }
  } catch {
    view.innerHTML = `<div class="empty"><span class="big">📡</span>تعذّر تحميل التطبيق. تأكد من الاتصال.<br><button type="button" onclick="location.reload()">إعادة المحاولة</button></div>`;
    return;
  }
  addEventListener('hashchange', route);
  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    state.installEvent = e;
    if (lastRoute === '/' && !$('#install-banner')) { state.homeScroll = scrollY; viewHome(); }
  });
  const onNet = () => { if (lastRoute === '/') { state.homeScroll = scrollY; viewHome(); } };
  addEventListener('online', onNet);
  addEventListener('offline', onNet);
  route();
  registerSW();
}

boot();
