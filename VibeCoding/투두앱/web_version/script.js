/* ==========================================================
 * My Tasks - 할 일 관리 앱
 * 순수 HTML / CSS / JavaScript (프레임워크 없음)
 *
 * Step 1: 기본 구조 및 핵심 기능 (추가/삭제/완료, localStorage)
 * Step 2: 카테고리 기능 및 UI 개선 (업무/개인/공부, 필터, 상대 시간)
 * Step 3: 진행률 대시보드 + 인라인 수정 + 애니메이션
 * Step 4: 다크 모드 + 완료 항목 삭제 + 검색 + 단축키
 * Step 5: 내보내기/가져오기 + 정렬 + 드래그 앤 드롭 + 성능 최적화
 * 5장 추가: 키워드 기반 자동 카테고리 분류
 * ========================================================== */

(function () {
  'use strict';

  /* ---------- 상수 ---------- */
  const STORAGE_KEYS = {
    todos: 'mytasks.todos',
    theme: 'mytasks.theme',
    sort: 'mytasks.sort',
    autoCat: 'mytasks.autoCategory',
  };

  const CATEGORIES = {
    work: { label: '업무', color: '#4A90E2' },
    personal: { label: '개인', color: '#27AE60' },
    study: { label: '공부', color: '#8E44AD' },
  };
  const FILTER_ORDER = ['all', 'work', 'personal', 'study'];
  const MAX_TITLE = 100;

  // 오늘의 격언 (랜덤 표시)
  const QUOTES = [
    '노력하는 모든 순간이 소중해요',
    '작은 일도 끝내면 큰 성취가 됩니다',
    '오늘 할 수 있는 일에 집중하세요',
    '천천히 가도 멈추지만 않으면 됩니다',
    '시작이 반이다',
    '완벽보다 완료가 낫습니다',
    '한 번에 하나씩, 꾸준히',
    '어제보다 나은 오늘을 만들어요',
    '계획 없는 목표는 소원에 불과합니다',
    '할 수 있다고 믿으면 이미 반은 온 것입니다',
  ];

  // 자동 분류 기본 키워드 (분류 설정에서 수정 가능)
  const DEFAULT_KEYWORDS = {
    work: ['회사', '회의', '미팅', '보고서', '보고', '업무', '출근', '퇴근', '프로젝트', '이메일', '메일',
      '발표', '거래처', '클라이언트', '고객', '결재', '야근', '출장', '스케줄', '일정', '기획', '마감', '팀장', '상사', '동료', '계약'],
    personal: ['영화', '운동', '헬스', '쇼핑', '장보기', '마트', '친구', '가족', '부모님', '엄마', '아빠', '여행',
      '병원', '약속', '생일', '선물', '청소', '빨래', '요리', '산책', '데이트', '카페', '게임', '취미', '은행', '택배', '미용실'],
    study: ['공부', '숙제', '과제', '시험', '강의', '수업', '복습', '예습', '독서', '책', '읽기', '영어', '수학',
      '코딩', '프로그래밍', '자격증', '토익', '논문', '레포트', '리포트', '학원', '인강', '바이브 코딩', '혼공'],
  };

  /* ---------- 상태 ---------- */
  const state = {
    todos: [],
    filter: 'all',
    search: '',
    sort: 'newest',
    editingId: null,
    autoCat: { enabled: true, confirm: true, keywords: clone(DEFAULT_KEYWORDS) },
  };

  /* ---------- DOM ---------- */
  const $ = (sel) => document.querySelector(sel);
  const el = {
    form: $('#todoForm'),
    input: $('#todoInput'),
    category: $('#categorySelect'),
    list: $('#todoList'),
    empty: $('#emptyState'),
    filters: document.querySelectorAll('.filter-btn'),
    search: $('#searchInput'),
    sort: $('#sortSelect'),
    themeToggle: $('#themeToggle'),
    clearCompleted: $('#clearCompletedBtn'),
    remainingBadge: $('#remainingBadge'),
    totalText: $('#totalProgressText'),
    totalBar: $('#totalProgressBar'),
    todayCount: $('#todayCount'),
    quote: $('#quoteText'),
    quoteRefresh: $('#quoteRefresh'),
    exportBtn: $('#exportBtn'),
    importBtn: $('#importBtn'),
    importFile: $('#importFile'),
    reclassifyBtn: $('#reclassifyBtn'),
    autoSettingsBtn: $('#autoSettingsBtn'),
    modal: $('#modal'),
    modalTitle: $('#modalTitle'),
    modalBody: $('#modalBody'),
    modalOk: $('#modalOk'),
    modalCancel: $('#modalCancel'),
    toast: $('#toast'),
  };

  /* ---------- 유틸 ---------- */
  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function timeAgo(ts) {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return '방금 전';
    if (diff < 3600) return Math.floor(diff / 60) + '분 전';
    if (diff < 86400) return Math.floor(diff / 3600) + '시간 전';
    if (diff < 86400 * 30) return Math.floor(diff / 86400) + '일 전';
    return new Date(ts).toLocaleDateString('ko-KR');
  }

  function isToday(ts) {
    const d = new Date(ts);
    const n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
  }

  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function showToast(msg) {
    if (!el.toast) return;
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.toast.classList.remove('show'), 2200);
  }

  /* ---------- 저장소 ---------- */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.todos);
      state.todos = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(state.todos)) state.todos = [];
    } catch (e) { state.todos = []; }
    // 이전 버전 데이터 호환: category / order 필드 보정
    state.todos.forEach((t, i) => {
      if (!CATEGORIES[t.category]) t.category = 'personal';
      if (typeof t.order !== 'number') t.order = i;
      if (!t.createdAt) t.createdAt = Date.now();
    });
    try { state.sort = localStorage.getItem(STORAGE_KEYS.sort) || 'newest'; } catch (e) { /* ignore */ }
    try {
      const ac = JSON.parse(localStorage.getItem(STORAGE_KEYS.autoCat) || 'null');
      if (ac && ac.keywords) state.autoCat = ac;
    } catch (e) { /* ignore */ }
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEYS.todos, JSON.stringify(state.todos)); } catch (e) { /* ignore */ }
  }

  function saveAutoCat() {
    try { localStorage.setItem(STORAGE_KEYS.autoCat, JSON.stringify(state.autoCat)); } catch (e) { /* ignore */ }
  }

  /* ---------- 자동 카테고리 분류 (5장) ---------- */
  // 각 카테고리 키워드가 제목에 몇 번 등장하는지 점수화하여 가장 높은 카테고리를 추천
  function suggestCategory(title) {
    const text = title.toLowerCase();
    let best = null;
    let bestScore = 0;
    Object.keys(CATEGORIES).forEach((cat) => {
      let score = 0;
      (state.autoCat.keywords[cat] || []).forEach((kw) => {
        const k = kw.trim().toLowerCase();
        if (k && text.includes(k)) score += k.length; // 긴 키워드일수록 가중치
      });
      if (score > bestScore) { bestScore = score; best = cat; }
    });
    return best;
  }

  /* ---------- 모달 (확인 다이얼로그) ---------- */
  function openModal({ title, html, okText = '확인', cancelText = '취소', hideCancel = false }) {
    return new Promise((resolve) => {
      el.modalTitle.textContent = title;
      el.modalBody.innerHTML = html;
      el.modalOk.textContent = okText;
      el.modalCancel.textContent = cancelText;
      el.modalCancel.style.display = hideCancel ? 'none' : '';
      el.modal.classList.add('open');
      el.modalOk.focus();
      const close = (result) => {
        el.modal.classList.remove('open');
        el.modalOk.onclick = null;
        el.modalCancel.onclick = null;
        el.modal.onkeydown = null;
        resolve(result);
      };
      el.modalOk.onclick = () => close(true);
      el.modalCancel.onclick = () => close(false);
      el.modal.onkeydown = (e) => { if (e.key === 'Escape') close(false); };
    });
  }

  /* ---------- CRUD ---------- */
  async function addTodo(title, category) {
    title = title.trim();
    if (!title) { showToast('할 일을 입력해 주세요.'); return; }
    if (title.length > MAX_TITLE) { showToast(`할 일은 최대 ${MAX_TITLE}자까지 입력할 수 있어요.`); return; }

    // 자동 분류: 선택한 카테고리와 추천 카테고리가 다르면 확인
    if (state.autoCat.enabled) {
      const suggested = suggestCategory(title);
      if (suggested && suggested !== category) {
        let apply = true;
        if (state.autoCat.confirm) {
          apply = await openModal({
            title: '🤖 스마트 카테고리 추천',
            html: `<p>'<strong>${escapeHTML(title)}</strong>'은(는)
              <span class="tag" style="--tag:${CATEGORIES[suggested].color}">${CATEGORIES[suggested].label}</span>
              카테고리로 보입니다.</p>
              <p class="muted">선택한 카테고리: ${CATEGORIES[category].label} → 추천 카테고리로 변경할까요?</p>`,
            okText: '확인', cancelText: '그대로 두기',
          });
        }
        if (apply) category = suggested;
      }
    }

    const minOrder = state.todos.reduce((m, t) => Math.min(m, t.order), 0);
    state.todos.push({
      id: uid(), title, category, completed: false,
      createdAt: Date.now(), order: minOrder - 1,
    });
    save();
    render({ animateId: state.todos[state.todos.length - 1].id });
  }

  function toggleTodo(id) {
    const t = state.todos.find((x) => x.id === id);
    if (!t) return;
    t.completed = !t.completed;
    t.completedAt = t.completed ? Date.now() : null;
    save();
    render();
  }

  function deleteTodo(id) {
    const item = el.list.querySelector(`[data-id="${id}"]`);
    const remove = () => {
      state.todos = state.todos.filter((x) => x.id !== id);
      save();
      render();
    };
    if (item) {
      item.classList.add('removing');
      item.addEventListener('animationend', remove, { once: true });
      setTimeout(remove, 400); // 애니메이션 미지원 대비
    } else remove();
  }

  function updateTodo(id, patch) {
    const t = state.todos.find((x) => x.id === id);
    if (!t) return;
    Object.assign(t, patch);
    save();
  }

  async function clearCompleted() {
    const count = state.todos.filter((t) => t.completed).length;
    if (!count) { showToast('완료된 항목이 없어요.'); return; }
    const ok = await openModal({
      title: '완료된 항목 삭제',
      html: `<p>완료된 할 일 <strong>${count}개</strong>를 모두 삭제할까요?</p><p class="muted">이 작업은 되돌릴 수 없어요.</p>`,
      okText: '삭제',
    });
    if (!ok) return;
    state.todos = state.todos.filter((t) => !t.completed);
    save();
    render();
    showToast(`${count}개의 완료 항목을 삭제했어요.`);
  }

  /* ---------- 정렬 & 필터 ---------- */
  function getVisibleTodos() {
    const q = state.search.trim().toLowerCase();
    let list = state.todos.filter((t) =>
      (state.filter === 'all' || t.category === state.filter) &&
      (!q || t.title.toLowerCase().includes(q)));

    const catIndex = (c) => Object.keys(CATEGORIES).indexOf(c);
    const sorters = {
      newest: (a, b) => b.createdAt - a.createdAt,
      oldest: (a, b) => a.createdAt - b.createdAt,
      category: (a, b) => catIndex(a.category) - catIndex(b.category) || b.createdAt - a.createdAt,
      status: (a, b) => Number(a.completed) - Number(b.completed) || b.createdAt - a.createdAt,
      manual: (a, b) => a.order - b.order,
    };
    return list.sort(sorters[state.sort] || sorters.newest);
  }

  /* ---------- 렌더링 ---------- */
  function render(opts = {}) {
    renderList(opts);
    renderDashboard();
    renderFilters();
  }

  function renderList({ animateId } = {}) {
    const todos = getVisibleTodos();
    // DocumentFragment 로 한 번에 DOM 반영 (100개 이상에서도 부드럽게)
    const frag = document.createDocumentFragment();
    const draggable = state.sort === 'manual';

    todos.forEach((t) => {
      const li = document.createElement('li');
      li.className = 'todo-item' + (t.completed ? ' completed' : '') + (t.id === animateId ? ' adding' : '');
      li.dataset.id = t.id;
      li.draggable = draggable;
      li.style.setProperty('--cat', CATEGORIES[t.category].color);
      li.innerHTML = `
        ${draggable ? '<span class="drag-handle" title="드래그해서 순서 변경">⋮⋮</span>' : ''}
        <input type="checkbox" class="todo-check" ${t.completed ? 'checked' : ''} aria-label="완료 표시">
        <div class="todo-body">
          <span class="todo-title" title="더블클릭해서 수정">${escapeHTML(t.title)}</span>
          <div class="todo-meta">
            <span class="tag" style="--tag:${CATEGORIES[t.category].color}">${CATEGORIES[t.category].label}</span>
            <span class="time">${timeAgo(t.createdAt)}</span>
          </div>
        </div>
        <button class="delete-btn" aria-label="삭제" title="삭제">✕</button>`;
      frag.appendChild(li);
    });

    el.list.replaceChildren(frag);
    el.list.classList.toggle('sortable', draggable);

    const hasAny = todos.length > 0;
    el.empty.hidden = hasAny;
    if (!hasAny) {
      el.empty.querySelector('p').textContent = state.search
        ? `'${state.search}'에 해당하는 할 일이 없습니다.`
        : '할 일이 없습니다. 추가해보세요!';
    }
  }

  function renderDashboard() {
    const total = state.todos.length;
    const done = state.todos.filter((t) => t.completed).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    el.totalText.textContent = `${done}/${total} 완료 (${pct}%)`;
    el.totalBar.style.width = pct + '%';
    el.todayCount.textContent = state.todos.filter((t) => isToday(t.createdAt)).length + '개';
    el.remainingBadge.textContent = total - done;

    Object.keys(CATEGORIES).forEach((cat) => {
      const items = state.todos.filter((t) => t.category === cat);
      const d = items.filter((t) => t.completed).length;
      const p = items.length ? Math.round((d / items.length) * 100) : 0;
      const box = document.querySelector(`.mini-progress[data-cat="${cat}"]`);
      if (!box) return;
      box.querySelector('.mini-count').textContent = `${d}/${items.length}`;
      box.querySelector('.mini-bar span').style.width = p + '%';
    });
  }

  function renderFilters() {
    el.filters.forEach((btn) => {
      const f = btn.dataset.filter;
      btn.classList.toggle('active', f === state.filter);
      const count = f === 'all' ? state.todos.length : state.todos.filter((t) => t.category === f).length;
      const badge = btn.querySelector('.count');
      if (badge) badge.textContent = count;
    });
  }

  function showRandomQuote() {
    const current = el.quote.textContent;
    let q;
    do { q = QUOTES[Math.floor(Math.random() * QUOTES.length)]; } while (q === current && QUOTES.length > 1);
    el.quote.textContent = q;
  }

  /* ---------- 인라인 수정 (더블클릭) ---------- */
  function startEdit(li) {
    const id = li.dataset.id;
    const t = state.todos.find((x) => x.id === id);
    if (!t || state.editingId) return;
    state.editingId = id;
    li.classList.add('editing');
    li.draggable = false;
    const body = li.querySelector('.todo-body');
    const options = Object.entries(CATEGORIES)
      .map(([k, v]) => `<option value="${k}" ${k === t.category ? 'selected' : ''}>${v.label}</option>`).join('');
    body.innerHTML = `
      <div class="edit-row">
        <input type="text" class="edit-input" maxlength="${MAX_TITLE}" value="${escapeHTML(t.title)}">
        <select class="edit-select">${options}</select>
      </div>
      <small class="muted">Enter 저장 · Esc 취소</small>`;
    const input = body.querySelector('.edit-input');
    const select = body.querySelector('.edit-select');
    input.focus();
    input.select();

    let finished = false;
    const finish = (commit) => {
      if (finished) return;
      finished = true;
      if (commit) {
        const v = input.value.trim();
        if (v) updateTodo(id, { title: v, category: select.value });
      }
      state.editingId = null;
      render();
    };
    const onKey = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    };
    input.addEventListener('keydown', onKey);
    select.addEventListener('keydown', onKey);
    // 입력창/셀렉트 바깥을 클릭하면 저장
    body.addEventListener('focusout', () => {
      setTimeout(() => { if (!body.contains(document.activeElement)) finish(true); }, 0);
    });
  }

  /* ---------- 드래그 앤 드롭 (수동 정렬) ---------- */
  let dragId = null;
  function setupDragAndDrop() {
    el.list.addEventListener('dragstart', (e) => {
      const li = e.target.closest('.todo-item');
      if (!li || state.sort !== 'manual') return;
      dragId = li.dataset.id;
      li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', dragId); } catch (err) { /* ignore */ }
    });
    el.list.addEventListener('dragover', (e) => {
      if (!dragId) return;
      e.preventDefault();
      const dragging = el.list.querySelector('.dragging');
      const after = getDragAfterElement(e.clientY);
      if (!dragging) return;
      if (after == null) el.list.appendChild(dragging);
      else if (after !== dragging) el.list.insertBefore(dragging, after);
    });
    el.list.addEventListener('dragend', () => {
      const dragging = el.list.querySelector('.dragging');
      if (dragging) dragging.classList.remove('dragging');
      if (!dragId) return;
      dragId = null;
      // 화면에 보이는 순서대로 order 재부여 (숨겨진 항목은 기존 순서 유지)
      const visibleIds = [...el.list.querySelectorAll('.todo-item')].map((n) => n.dataset.id);
      const visibleOrders = visibleIds.map((id) => state.todos.find((t) => t.id === id).order).sort((a, b) => a - b);
      visibleIds.forEach((id, i) => { state.todos.find((t) => t.id === id).order = visibleOrders[i]; });
      save();
    });
  }

  function getDragAfterElement(y) {
    const items = [...el.list.querySelectorAll('.todo-item:not(.dragging)')];
    let closest = { offset: Number.NEGATIVE_INFINITY, element: null };
    items.forEach((child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) closest = { offset, element: child };
    });
    return closest.element;
  }

  /* ---------- 내보내기 / 가져오기 ---------- */
  function exportData() {
    const data = {
      app: 'My Tasks',
      version: 1,
      exportedAt: new Date().toISOString(),
      todos: state.todos,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    a.href = URL.createObjectURL(blob);
    a.download = `my-tasks-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    showToast(`${state.todos.length}개의 할 일을 내보냈어요.`);
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = async () => {
      let todos;
      try {
        const parsed = JSON.parse(reader.result);
        todos = Array.isArray(parsed) ? parsed : parsed.todos;
        if (!Array.isArray(todos)) throw new Error('형식 오류');
        todos = todos.filter((t) => t && typeof t.title === 'string').map((t, i) => ({
          id: t.id || uid(),
          title: t.title.slice(0, MAX_TITLE),
          category: CATEGORIES[t.category] ? t.category : 'personal',
          completed: !!t.completed,
          createdAt: Number(t.createdAt) || Date.now(),
          completedAt: t.completedAt || null,
          order: typeof t.order === 'number' ? t.order : i,
        }));
      } catch (e) {
        await openModal({ title: '가져오기 실패', html: '<p>올바른 JSON 파일이 아니에요.</p>', hideCancel: true });
        return;
      }
      const backup = state.todos.length > 0 ? await openModal({
        title: '데이터 가져오기',
        html: `<p>파일에서 <strong>${todos.length}개</strong>의 할 일을 찾았어요.</p>
          <p>현재 데이터 <strong>${state.todos.length}개</strong>를 덮어쓰기 전에 백업 파일로 내보낼까요?</p>`,
        okText: '백업 후 가져오기', cancelText: '백업 없이 가져오기',
      }) : false;
      if (backup) exportData();
      state.todos = todos;
      save();
      render();
      showToast(`${todos.length}개의 할 일을 가져왔어요.`);
    };
    reader.readAsText(file);
  }

  /* ---------- 자동 재분류 / 분류 설정 ---------- */
  async function reclassifyAll() {
    const changes = state.todos
      .map((t) => ({ t, to: suggestCategory(t.title) }))
      .filter((c) => c.to && c.to !== c.t.category);
    if (!changes.length) {
      await openModal({ title: '자동 재분류', html: '<p>모든 할 일이 이미 알맞은 카테고리에 있어요. 👍</p>', hideCancel: true });
      return;
    }
    const rows = changes.map((c) => `<li>${escapeHTML(c.t.title)}:
      ${CATEGORIES[c.t.category].label} → <strong style="color:${CATEGORIES[c.to].color}">${CATEGORIES[c.to].label}</strong></li>`).join('');
    const ok = await openModal({
      title: '🔄 자동 재분류',
      html: `<p>키워드 분석 결과 ${changes.length}개 항목의 카테고리를 변경할 수 있어요.</p><ul class="change-list">${rows}</ul>`,
      okText: '모두 변경',
    });
    if (!ok) return;
    changes.forEach((c) => { c.t.category = c.to; });
    save();
    render();
    showToast(`${changes.length}개 항목을 재분류했어요.`);
  }

  async function openAutoSettings() {
    const kwFields = Object.entries(CATEGORIES).map(([k, v]) => `
      <label class="kw-label" style="--tag:${v.color}">${v.label} 키워드
        <textarea data-cat="${k}" rows="2">${escapeHTML(state.autoCat.keywords[k].join(', '))}</textarea>
      </label>`).join('');
    const ok = await openModal({
      title: '⚙️ 분류 설정',
      html: `
        <label class="switch-row"><input type="checkbox" id="acEnabled" ${state.autoCat.enabled ? 'checked' : ''}> 자동 카테고리 분류 사용</label>
        <label class="switch-row"><input type="checkbox" id="acConfirm" ${state.autoCat.confirm ? 'checked' : ''}> 변경 전에 확인 받기</label>
        <p class="muted">키워드는 쉼표(,)로 구분해요.</p>
        ${kwFields}
        <button type="button" class="link-btn" id="acReset">기본 키워드로 되돌리기</button>`,
      okText: '저장',
    });
    if (!ok) return;
    state.autoCat.enabled = document.getElementById('acEnabled').checked;
    state.autoCat.confirm = document.getElementById('acConfirm').checked;
    el.modalBody.querySelectorAll('textarea[data-cat]').forEach((ta) => {
      state.autoCat.keywords[ta.dataset.cat] = ta.value.split(',').map((s) => s.trim()).filter(Boolean);
    });
    saveAutoCat();
    updateAutoBtn();
    showToast('분류 설정을 저장했어요.');
  }

  function updateAutoBtn() {
    if (el.autoSettingsBtn) el.autoSettingsBtn.classList.toggle('off', !state.autoCat.enabled);
  }

  /* ---------- 테마 ---------- */
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    el.themeToggle.setAttribute('aria-checked', theme === 'dark');
    el.themeToggle.title = theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환';
  }

  function initTheme() {
    let theme = null;
    try { theme = localStorage.getItem(STORAGE_KEYS.theme); } catch (e) { /* ignore */ }
    if (!theme) theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    applyTheme(theme);
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(STORAGE_KEYS.theme, next); } catch (e) { /* ignore */ }
  }

  /* ---------- 이벤트 ---------- */
  function bindEvents() {
    el.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = el.input.value;
      el.input.value = '';
      addTodo(title, el.category.value).then(() => el.input.focus());
    });

    // 이벤트 위임: 체크/삭제/더블클릭 수정
    el.list.addEventListener('change', (e) => {
      if (e.target.classList.contains('todo-check')) toggleTodo(e.target.closest('.todo-item').dataset.id);
    });
    el.list.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-btn')) deleteTodo(e.target.closest('.todo-item').dataset.id);
    });
    el.list.addEventListener('dblclick', (e) => {
      const li = e.target.closest('.todo-item');
      if (li && e.target.closest('.todo-body')) startEdit(li);
    });

    el.filters.forEach((btn) => btn.addEventListener('click', () => {
      state.filter = btn.dataset.filter;
      render();
    }));

    el.search.addEventListener('input', debounce(() => {
      state.search = el.search.value;
      renderList();
    }, 120));

    el.sort.value = state.sort;
    el.sort.addEventListener('change', () => {
      state.sort = el.sort.value;
      try { localStorage.setItem(STORAGE_KEYS.sort, state.sort); } catch (e) { /* ignore */ }
      renderList();
      if (state.sort === 'manual') showToast('항목을 드래그해서 순서를 바꿀 수 있어요.');
    });

    el.themeToggle.addEventListener('click', toggleTheme);
    el.clearCompleted.addEventListener('click', clearCompleted);
    el.quoteRefresh && el.quoteRefresh.addEventListener('click', showRandomQuote);
    el.exportBtn.addEventListener('click', exportData);
    el.importBtn.addEventListener('click', () => el.importFile.click());
    el.importFile.addEventListener('change', () => {
      if (el.importFile.files[0]) importData(el.importFile.files[0]);
      el.importFile.value = '';
    });
    el.reclassifyBtn && el.reclassifyBtn.addEventListener('click', reclassifyAll);
    el.autoSettingsBtn && el.autoSettingsBtn.addEventListener('click', openAutoSettings);

    // 키보드 단축키: Alt+N 입력창 포커스, Alt+1~4 필터 전환
    document.addEventListener('keydown', (e) => {
      if (!e.altKey || el.modal.classList.contains('open')) return;
      if (e.key === 'n' || e.key === 'N' || e.code === 'KeyN') {
        e.preventDefault();
        el.input.focus();
      }
      const n = parseInt(e.key, 10) || parseInt((e.code || '').replace('Digit', ''), 10);
      if (n >= 1 && n <= 4) {
        e.preventDefault();
        state.filter = FILTER_ORDER[n - 1];
        render();
      }
    });

    // 상대 시간 표시를 1분마다 갱신
    setInterval(() => { if (!state.editingId && !dragId) renderList(); }, 60000);
  }

  /* ---------- 시작 ---------- */
  initTheme();
  load();
  bindEvents();
  setupDragAndDrop();
  updateAutoBtn();
  showRandomQuote();
  render();
})();
