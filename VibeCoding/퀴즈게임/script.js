/* ==========================================================
 * 지식왕 도전 - 상식 퀴즈 게임 로직
 * 1단계: 핵심 퀴즈 시스템 (출제 → 정답 판정 → 즉시 피드백 → 결과)
 * 2단계: 점수 시스템(ScoreManager) + 게임 모드 3종 + 힌트 + 순위 기록
 * 문제 데이터는 quiz-data.js 의 QUIZ_DATA 를 사용
 * ========================================================== */

(function () {
  'use strict';

  const CATEGORIES = Object.keys(CATEGORY_META);
  const DIFF_LABEL = { easy: '쉬움', medium: '보통', hard: '어려움' };
  const MODE_LABEL = { all: '전체 도전', category: '카테고리별', speed: '스피드 퀴즈' };
  const SPEED_COUNT = 20;
  const SPEED_LIMIT = 15; // 초
  const CATEGORY_COUNT = 10;
  const RANK_KEY = 'quiz.rankings';

  /* ---------- 점수 관리 ---------- */
  const ScoreManager = {
    multiplier: { easy: 1, medium: 1.5, hard: 2 },
    base: 10,
    timeBonus: 3,      // 10초 미만 정답
    noHintBonus: 2,    // 힌트 미사용
    hintCost: 2,       // 힌트 사용 시 차감
    combo(streak) {
      if (streak >= 10) return 10;
      if (streak >= 5) return 5;
      if (streak >= 3) return 2;
      return 0;
    },
    // 정답일 때 획득 점수와 내역 계산
    calc(q, seconds, usedHint, streak) {
      const parts = [];
      const base = Math.round(this.base * this.multiplier[q.difficulty]);
      parts.push([`기본 (${DIFF_LABEL[q.difficulty]})`, base]);
      if (seconds < 10) parts.push(['⚡ 빠른 정답', this.timeBonus]);
      if (!usedHint) parts.push(['💡 힌트 미사용', this.noHintBonus]);
      const c = this.combo(streak);
      if (c) parts.push([`🔥 ${streak}연속 콤보`, c]);
      return { total: parts.reduce((s, p) => s + p[1], 0), parts };
    },
  };

  /* ---------- 상태 ---------- */
  const game = {
    mode: 'all',
    category: null,
    questions: [],
    index: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    hintsUsed: 0,
    usedHint: false,
    answered: false,
    startTime: 0,
    totalTime: 0,
    timerId: null,
    perCategory: {},
    saved: false,
  };

  /* ---------- DOM ---------- */
  const $ = (id) => document.getElementById(id);
  const screens = ['startScreen', 'modeScreen', 'quizScreen', 'resultScreen', 'rankingScreen'];

  function show(id) {
    screens.forEach((s) => $(s).classList.toggle('active', s === id));
    window.scrollTo(0, 0);
  }

  /* ---------- 유틸 ---------- */
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function loadRankings() {
    try { return JSON.parse(localStorage.getItem(RANK_KEY)) || []; } catch (e) { return []; }
  }
  function saveRankings(list) {
    try { localStorage.setItem(RANK_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
  }

  /* ---------- 시작 화면 ---------- */
  function renderChips(container, clickable) {
    container.innerHTML = CATEGORIES.map((c) => {
      const n = QUIZ_DATA.filter((q) => q.category === c).length;
      return `<button class="chip" data-cat="${c}" style="--c:${CATEGORY_META[c].color}" ${clickable ? '' : 'tabindex="-1"'}>
        ${CATEGORY_META[c].icon} ${c}${clickable ? ` <small>${n}문제</small>` : ''}</button>`;
    }).join('');
  }

  function initStart() {
    $('startSubtitle').textContent = `${CATEGORIES.length}개 카테고리, ${QUIZ_DATA.length}개의 도전적인 문제`;
    $('modeAllDesc').textContent = `모든 카테고리 ${QUIZ_DATA.length}문제`;
    renderChips($('categoryChips'), false);
    renderChips($('categoryPickChips'), true);
  }

  /* ---------- 게임 시작 ---------- */
  function buildQuestions(mode, category) {
    if (mode === 'category') {
      return shuffle(QUIZ_DATA.filter((q) => q.category === category)).slice(0, CATEGORY_COUNT);
    }
    if (mode === 'speed') {
      return shuffle(QUIZ_DATA).slice(0, SPEED_COUNT);
    }
    // 전체 도전: 카테고리 순서대로, 카테고리 안에서는 무작위
    return CATEGORIES.flatMap((c) => shuffle(QUIZ_DATA.filter((q) => q.category === c)));
  }

  function startGame(mode, category = null) {
    Object.assign(game, {
      mode, category,
      questions: buildQuestions(mode, category),
      index: 0, score: 0, streak: 0, bestStreak: 0, correct: 0, hintsUsed: 0, totalTime: 0,
      perCategory: {}, saved: false,
    });
    game.questions.forEach((q) => {
      game.perCategory[q.category] = game.perCategory[q.category] || { correct: 0, total: 0 };
      game.perCategory[q.category].total++;
    });
    $('timerText').hidden = mode !== 'speed';
    show('quizScreen');
    renderQuestion();
  }

  /* ---------- 문제 표시 ---------- */
  function renderQuestion() {
    const q = game.questions[game.index];
    const total = game.questions.length;
    game.answered = false;
    game.usedHint = false;

    $('progressText').textContent = `${game.index + 1} / ${total}`;
    $('progressBar').style.width = `${(game.index / total) * 100}%`;
    updateHud();

    const cat = $('qCategory');
    cat.textContent = `${CATEGORY_META[q.category].icon} ${q.category}`;
    cat.style.setProperty('--c', CATEGORY_META[q.category].color);
    const diff = $('qDifficulty');
    diff.textContent = DIFF_LABEL[q.difficulty];
    diff.dataset.level = q.difficulty;
    $('qText').textContent = q.question;

    $('options').innerHTML = q.options.map((opt, i) =>
      `<button class="option" data-index="${i}"><span class="num">${i + 1}</span>${escapeHTML(opt)}</button>`).join('');
    $('hintBox').hidden = true;
    $('hintBtn').disabled = false;

    game.startTime = performance.now();
    startTimer();
  }

  function updateHud() {
    $('scoreText').textContent = `점수: ${game.score}`;
    $('comboText').textContent = `🔥 ${game.streak}`;
    $('comboText').classList.toggle('hot', game.streak >= 3);
  }

  /* ---------- 타이머 (스피드 퀴즈) ---------- */
  function startTimer() {
    stopTimer();
    if (game.mode !== 'speed') return;
    const timer = $('timerText');
    const tick = () => {
      const left = Math.max(0, SPEED_LIMIT - Math.floor((performance.now() - game.startTime) / 1000));
      timer.textContent = `${left}초`;
      timer.classList.toggle('warn', left <= 5);
      if (left <= 0) { stopTimer(); answer(-1); }
    };
    tick();
    game.timerId = setInterval(tick, 200);
  }

  function stopTimer() {
    if (game.timerId) clearInterval(game.timerId);
    game.timerId = null;
  }

  /* ---------- 힌트 ---------- */
  function useHint() {
    if (game.answered || game.usedHint) return;
    const q = game.questions[game.index];
    game.usedHint = true;
    game.hintsUsed++;
    game.score = Math.max(0, game.score - ScoreManager.hintCost);
    updateHud();
    // 오답 보기 2개 제거
    const wrong = shuffle(q.options.map((_, i) => i).filter((i) => i !== q.answer)).slice(0, 2);
    wrong.forEach((i) => {
      const btn = $('options').querySelector(`[data-index="${i}"]`);
      btn.disabled = true;
      btn.classList.add('eliminated');
    });
    const box = $('hintBox');
    box.textContent = `💡 힌트: ${q.hint}`;
    box.hidden = false;
    $('hintBtn').disabled = true;
  }

  /* ---------- 정답 판정 ---------- */
  function answer(choice) {
    if (game.answered) return;
    game.answered = true;
    stopTimer();

    const q = game.questions[game.index];
    const seconds = (performance.now() - game.startTime) / 1000;
    game.totalTime += seconds;
    const isCorrect = choice === q.answer;
    const timedOut = choice === -1;

    // 보기 색상 표시
    $('options').querySelectorAll('.option').forEach((btn) => {
      const i = Number(btn.dataset.index);
      btn.disabled = true;
      if (i === q.answer) btn.classList.add('correct');
      else if (i === choice) btn.classList.add('wrong');
    });
    $('hintBtn').disabled = true;

    let pointsHTML = '';
    if (isCorrect) {
      game.streak++;
      game.bestStreak = Math.max(game.bestStreak, game.streak);
      game.correct++;
      game.perCategory[q.category].correct++;
      const result = ScoreManager.calc(q, seconds, game.usedHint, game.streak);
      game.score += result.total;
      pointsHTML = result.parts.map(([k, v]) => `<span>${k} <b>+${v}</b></span>`).join('') +
        `<strong>+${result.total}점</strong>`;
    } else {
      game.streak = 0;
      pointsHTML = '<span>콤보가 초기화되었어요</span>';
    }
    updateHud();
    $('progressBar').style.width = `${((game.index + 1) / game.questions.length) * 100}%`;

    // 피드백 표시
    $('fbIcon').textContent = isCorrect ? '✅' : (timedOut ? '⏰' : '❌');
    $('fbTitle').textContent = isCorrect ? '정답입니다!' : (timedOut ? '시간 초과!' : '틀렸습니다');
    $('fbTitle').className = isCorrect ? 'ok' : 'no';
    $('fbText').textContent = (isCorrect ? '' : `정답: ${q.options[q.answer]} — `) + q.explanation;
    $('fbPoints').innerHTML = pointsHTML;
    $('nextBtn').textContent = game.index + 1 < game.questions.length ? '다음 문제' : '결과 보기';
    setTimeout(() => {
      $('feedback').classList.add('open');
      $('nextBtn').focus();
    }, 350);
  }

  function next() {
    if (!$('feedback').classList.contains('open')) return;
    $('feedback').classList.remove('open');
    game.index++;
    if (game.index < game.questions.length) renderQuestion();
    else showResult();
  }

  /* ---------- 결과 ---------- */
  function showResult() {
    stopTimer();
    const total = game.questions.length;
    const rate = total ? Math.round((game.correct / total) * 100) : 0;
    $('resultMode').textContent = MODE_LABEL[game.mode] + (game.category ? ` · ${game.category}` : '');
    $('finalScore').textContent = game.score;
    $('finalCorrect').textContent = `${game.correct} / ${total}`;
    $('finalRate').textContent = `${rate}%`;
    $('extraStats').innerHTML = `
      <span>🔥 최대 콤보 ${game.bestStreak}</span>
      <span>💡 힌트 ${game.hintsUsed}회</span>
      <span>⏱️ 평균 ${(game.totalTime / Math.max(1, total)).toFixed(1)}초</span>`;
    $('catResults').innerHTML = Object.entries(game.perCategory).map(([c, r]) => `
      <li><span>${CATEGORY_META[c].icon} ${c}</span>
        <span class="bar"><i style="width:${(r.correct / r.total) * 100}%;--c:${CATEGORY_META[c].color}"></i></span>
        <b>${r.correct} / ${r.total}</b></li>`).join('');
    $('saveRankForm').hidden = false;
    $('playerName').value = '';
    renderRanking($('rankingBox'), game.mode, null);
    show('resultScreen');
    setTimeout(() => $('playerName').focus(), 100);
  }

  function saveRank(name) {
    if (game.saved) return;
    const list = loadRankings();
    const entry = {
      id: Date.now(),
      name: name.trim().slice(0, 12) || '익명',
      score: game.score,
      correct: game.correct,
      total: game.questions.length,
      mode: game.mode,
      category: game.category,
      date: new Date().toISOString(),
    };
    list.push(entry);
    saveRankings(list);
    game.saved = true;
    $('saveRankForm').hidden = true;
    renderRanking($('rankingBox'), game.mode, entry.id);
  }

  function renderRanking(box, mode, highlightId) {
    const list = loadRankings()
      .filter((r) => r.mode === mode)
      .sort((a, b) => b.score - a.score || b.correct - a.correct || a.id - b.id)
      .slice(0, 10);
    if (!list.length) {
      box.innerHTML = `<p class="empty">아직 ${MODE_LABEL[mode]} 기록이 없어요. 첫 번째 주인공이 되어 보세요!</p>`;
      return;
    }
    const medal = ['🥇', '🥈', '🥉'];
    box.innerHTML = `
      <table>
        <thead><tr><th>순위</th><th>이름</th><th>점수</th><th>정답</th><th>날짜</th></tr></thead>
        <tbody>${list.map((r, i) => `
          <tr class="${r.id === highlightId ? 'me' : ''}">
            <td>${medal[i] || i + 1}</td>
            <td>${escapeHTML(r.name)}${r.category ? ` <small>${escapeHTML(r.category)}</small>` : ''}</td>
            <td><b>${r.score}</b></td>
            <td>${r.correct}/${r.total}</td>
            <td>${new Date(r.date).toLocaleDateString('ko-KR')}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  /* ---------- 이벤트 ---------- */
  function bindEvents() {
    $('startBtn').addEventListener('click', () => { $('categoryPick').hidden = true; show('modeScreen'); });
    $('backToStart').addEventListener('click', () => show('startScreen'));

    document.querySelectorAll('.mode-card').forEach((card) => card.addEventListener('click', () => {
      const mode = card.dataset.mode;
      if (mode === 'category') {
        $('categoryPick').hidden = false;
        $('categoryPick').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      startGame(mode);
    }));
    $('categoryPickChips').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (chip) startGame('category', chip.dataset.cat);
    });

    $('options').addEventListener('click', (e) => {
      const btn = e.target.closest('.option');
      if (btn && !btn.disabled) answer(Number(btn.dataset.index));
    });
    $('hintBtn').addEventListener('click', useHint);
    $('nextBtn').addEventListener('click', next);
    $('quitBtn').addEventListener('click', () => {
      stopTimer();
      if (confirmQuit()) showResultEarly();
      else startTimer();
    });

    $('saveRankForm').addEventListener('submit', (e) => {
      e.preventDefault();
      saveRank($('playerName').value);
    });
    $('restartBtn').addEventListener('click', () => startGame(game.mode, game.category));
    $('homeBtn').addEventListener('click', () => show('startScreen'));

    $('showRankingBtn').addEventListener('click', () => { selectRankTab('all'); show('rankingScreen'); });
    $('rankTabs').addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      if (tab) selectRankTab(tab.dataset.mode);
    });
    $('rankBackBtn').addEventListener('click', () => show('startScreen'));
    $('resetRankBtn').addEventListener('click', () => {
      if (window.confirm('모든 순위 기록을 삭제할까요?')) {
        saveRankings([]);
        selectRankTab(document.querySelector('#rankTabs .tab.active').dataset.mode);
      }
    });

    // 키보드: 1~4 보기 선택, H 힌트, Enter 다음 문제
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if ($('feedback').classList.contains('open')) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); }
        return;
      }
      if (!$('quizScreen').classList.contains('active') || game.answered) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 4) {
        const btn = $('options').querySelector(`[data-index="${n - 1}"]`);
        if (btn && !btn.disabled) answer(n - 1);
      }
      if (e.key === 'h' || e.key === 'H') useHint();
    });
  }

  function confirmQuit() {
    return window.confirm('게임을 그만하고 지금까지의 결과를 볼까요?');
  }

  function showResultEarly() {
    // 아직 풀지 않은 문제는 결과에서 제외
    const answeredCount = game.index + (game.answered ? 1 : 0);
    game.questions = game.questions.slice(0, Math.max(answeredCount, 0));
    const perCat = {};
    game.questions.forEach((q) => { perCat[q.category] = perCat[q.category] || { correct: 0, total: 0 }; perCat[q.category].total++; });
    Object.keys(perCat).forEach((c) => { perCat[c].correct = game.perCategory[c].correct; });
    game.perCategory = perCat;
    $('feedback').classList.remove('open');
    showResult();
  }

  function selectRankTab(mode) {
    document.querySelectorAll('#rankTabs .tab').forEach((t) => t.classList.toggle('active', t.dataset.mode === mode));
    renderRanking($('rankingFull'), mode, null);
  }

  /* ---------- 시작 ---------- */
  initStart();
  bindEvents();
})();
