/**
 * BlessEq V2 - Application Core Controller
 * Handles: curriculum navigation, URL routing, slide transitions,
 * Biblia 3-theme engine, data-driven fill-in-blanks (all 17 lessons),
 * touch swipe, presenter mode with timer, chunked audio narration,
 * voices change listener, real-time search (Regex-safe), ARIA management,
 * focus trap in modals, personal notes autosave, progress tracking,
 * slide preload, grid gallery, lecturer sync scroll.
 */

(function () {
  'use strict';

  // ─────────────────────────────────────────────
  //  STATE
  // ─────────────────────────────────────────────
  const THEMES = ['light', 'sepia', 'dark'];
  const THEME_ICONS = { light: 'fa-sun', sepia: 'fa-cloud-sun', dark: 'fa-moon' };
  const FONT_SCALES = [1.0, 1.15, 1.3];

  const state = {
    lessons: [],
    activeLessonId: '00',
    activeSlideIndex: 1,
    activeCategory: 'all',
    isMasked: false,
    themeIndex: THEMES.indexOf(localStorage.getItem('blesseq_theme') || 'light'),
    fontScaleIndex: parseInt(localStorage.getItem('blesseq_font_scale_idx') || '0', 10),
    isPresenterOpen: false,
    isGridOpen: false,
    isNotesOpen: false,
    // V3: Section-level micro-narration audio state
    activeSectionId: null,
    isSectionSpeaking: false,
    autoAdvance: false,
    playbackRate: 1.0,
    timerRunning: false,
    timerSeconds: 0,
    timerInterval: null,
    speechKeepAliveInterval: null,
    progress: JSON.parse(localStorage.getItem('blesseq_progress') || '{}'),
    routeInitialized: false,
  };

  // ─────────────────────────────────────────────
  //  SAFE DOM QUERY
  // ─────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }

  const DOM = {
    html: document.documentElement,
    themeToggleBtn: $('themeToggleBtn'),
    themeIcon: $('themeIcon'),
    fontScaleBtn: $('fontScaleBtn'),
    brandHomeBtn: $('brandHomeBtn'),

    categoryTabs: document.querySelectorAll('.tab-btn[data-filter]'),
    lessonsContainer: $('lessonsContainer'),
    lessonCountBadge: $('lessonCountBadge'),

    bannerCategory: $('bannerCategory'),
    bannerTitle: $('bannerTitle'),
    bannerSubtitle: $('bannerSubtitle'),
    btnPrevLesson: $('btnPrevLesson'),
    btnNextLesson: $('btnNextLesson'),

    audioNarrateBtn: $('audioNarrateBtn'),
    audioIcon: $('audioIcon'),
    audioStatusText: $('audioStatusText'),
    audioDetailText: $('audioDetailText'),
    audioAutoAdvanceBtn: $('audioAutoAdvanceBtn'),
    autoAdvanceText: $('autoAdvanceText'),
    audioSpeedSelect: $('audioSpeedSelect'),
    sectionNavPills: $('sectionNavPills'),

    currentSlideNum: $('currentSlideNum'),
    totalSlideNum: $('totalSlideNum'),
    btnSlidePrev: $('btnSlidePrev'),
    btnSlideNext: $('btnSlideNext'),
    btnSlideFullscreen: $('btnSlideFullscreen'),
    btnGridView: $('btnGridView'),
    slideStageMain: $('slideStageMain'),
    slideMainImg: $('slideMainImg'),
    overlayPrevBtn: $('overlayPrevBtn'),
    overlayNextBtn: $('overlayNextBtn'),
    thumbnailsStrip: $('thumbnailsStrip'),
    slideGridGallery: $('slideGridGallery'),
    slideHeadline: $('slideHeadline'),
    slideBulletList: $('slideBulletList'),
    slideNotesBox: $('slideNotesBox'),
    slideNotesText: $('slideNotesText'),

    lectureScrollContent: $('lectureScrollContent'),
    lectureCopyBtn: $('lectureCopyBtn'),
    toggleMaskBtn: $('toggleMaskBtn'),
    maskIcon: $('maskIcon'),
    toggleMaskRightBtn: $('toggleMaskRightBtn'),

    personalNotesToggle: $('personalNotesToggle'),
    personalNotesArea: $('personalNotesArea'),
    personalNotesInput: $('personalNotesInput'),

    presenterModal: $('presenterModal'),
    presenterLessonTitle: $('presenterLessonTitle'),
    presenterSlideIndicator: $('presenterSlideIndicator'),
    presenterImg: $('presenterImg'),
    startPresenterBtn: $('startPresenterBtn'),
    closePresenterBtn: $('closePresenterBtn'),
    presenterPrevBtn: $('presenterPrevBtn'),
    presenterNextBtn: $('presenterNextBtn'),
    presenterTimerToggle: $('presenterTimerToggle'),
    presenterTimerDisplay: $('presenterTimerDisplay'),
    presenterTimerIcon: $('presenterTimerIcon'),

    searchModal: $('searchModal'),
    openSearchBtn: $('openSearchBtn'),
    closeSearchModalBtn: $('closeSearchModalBtn'),
    globalSearchInput: $('globalSearchInput'),
    searchResultsList: $('searchResultsList'),
    searchResultSummary: $('searchResultSummary'),

    toolkitModal: $('toolkitModal'),
    openToolkitBtn: $('openToolkitBtn'),
    closeToolkitModalBtn: $('closeToolkitModalBtn'),
    toolTabTestimony: $('toolTabTestimony'),
    toolTabBest: $('toolTabBest'),
    toolTab8Weeks: $('toolTab8Weeks'),
    testimonyToolContent: $('testimonyToolContent'),
    bestToolContent: $('bestToolContent'),
    eightWeeksToolContent: $('eightWeeksToolContent'),
    testimonyBefore: $('testimonyBefore'),
    testimonyTurning: $('testimonyTurning'),
    testimonyAfter: $('testimonyAfter'),
    copyTestimonyBtn: $('copyTestimonyBtn'),
    clearTestimonyBtn: $('clearTestimonyBtn'),
  };

  // ─────────────────────────────────────────────
  //  INIT
  // ─────────────────────────────────────────────
  function init() {
    if (!window.BLESS_EQ_DATA || !Array.isArray(window.BLESS_EQ_DATA)) {
      DOM.lectureScrollContent.innerHTML = '<p style="padding:2rem;color:var(--text-muted);">課程資料載入失敗，請重新整理頁面。</p>';
      return;
    }
    state.lessons = window.BLESS_EQ_DATA;

    applyTheme(false);
    applyFontScale(false);
    bindEvents();
    initInteractiveChecklists();
    renderLessonList();
    routeFromHash();
    window.addEventListener('hashchange', routeFromHash);
  }

  // ─────────────────────────────────────────────
  //  URL HASH ROUTING (P1-5)
  // ─────────────────────────────────────────────
  function routeFromHash() {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      const [lessonId, slideStr] = hash.split('/');
      const slideIdx = parseInt(slideStr, 10) || 1;
      if (state.lessons.find(l => l.id === lessonId)) {
        loadLesson(lessonId, slideIdx);
        return;
      }
    }
    // Fallback: last visited lesson from localStorage
    const lastLesson = safeStorage('get', 'blesseq_last_lesson') || state.lessons[0].id;
    const lastSlide = parseInt(safeStorage('get', 'blesseq_last_slide') || '1', 10);
    loadLesson(lastLesson, lastSlide);
  }

  function updateHash(lessonId, slideIdx) {
    const newHash = `#${lessonId}/${slideIdx}`;
    if (window.location.hash !== newHash) {
      history.replaceState(null, '', newHash);
    }
  }

  // ─────────────────────────────────────────────
  //  THEME ENGINE (P1-1: 3 themes)
  // ─────────────────────────────────────────────
  function applyTheme(save = true) {
    if (state.themeIndex < 0 || state.themeIndex >= THEMES.length) state.themeIndex = 0;
    const theme = THEMES[state.themeIndex];
    DOM.html.setAttribute('data-theme', theme);
    DOM.themeIcon.className = `fa-solid ${THEME_ICONS[theme]}`;
    DOM.themeToggleBtn.setAttribute('aria-label', `目前主題：${['日光','古卷護眼','暗夜'][state.themeIndex]}，點擊切換下一主題`);
    if (save) safeStorage('set', 'blesseq_theme', theme);
  }

  function cycleTheme() {
    state.themeIndex = (state.themeIndex + 1) % THEMES.length;
    applyTheme();
  }

  // ─────────────────────────────────────────────
  //  FONT SCALE (P0-6: fixed to use html element)
  // ─────────────────────────────────────────────
  function applyFontScale(save = true) {
    if (state.fontScaleIndex < 0 || state.fontScaleIndex >= FONT_SCALES.length) state.fontScaleIndex = 0;
    const scale = FONT_SCALES[state.fontScaleIndex];
    document.documentElement.style.fontSize = `${scale * 16}px`; // P0-6 FIX: was body
    DOM.fontScaleBtn.setAttribute('aria-label', `目前字體：${['標準','大','超大'][state.fontScaleIndex]}，點擊放大`);
    if (save) safeStorage('set', 'blesseq_font_scale_idx', String(state.fontScaleIndex));
  }

  function cycleFontScale() {
    state.fontScaleIndex = (state.fontScaleIndex + 1) % FONT_SCALES.length;
    applyFontScale();
  }

  // ─────────────────────────────────────────────
  //  LESSON LIST RENDER
  // ─────────────────────────────────────────────
  function renderLessonList() {
    const filtered = state.activeCategory === 'all'
      ? state.lessons
      : state.lessons.filter(l => l.category === state.activeCategory);

    DOM.lessonsContainer.innerHTML = '';
    DOM.lessonCountBadge.textContent = `${filtered.length} 門課`;

    filtered.forEach(lesson => {
      const progress = state.progress[lesson.id] || { lastSlide: 0, slideCount: lesson.slideCount };
      const pct = lesson.slideCount > 0 ? Math.round((progress.lastSlide / lesson.slideCount) * 100) : 0;

      const item = document.createElement('button');
      item.className = `lesson-item${lesson.id === state.activeLessonId ? ' active' : ''}`;
      item.setAttribute('role', 'listitem');
      item.setAttribute('aria-label', `${lesson.code} ${lesson.title}，共 ${lesson.slideCount} 張投影片`);
      item.setAttribute('aria-current', lesson.id === state.activeLessonId ? 'true' : 'false');
      item.dataset.id = lesson.id;

      const circumference = 2 * Math.PI * 11; // r=11
      const dashOffset = circumference * (1 - pct / 100);

      item.innerHTML = `
        <div class="lesson-badge">${lesson.code}</div>
        <div class="lesson-details">
          <div class="lesson-name">${lesson.title}</div>
          <div class="lesson-sub">${lesson.subtitle || ''}</div>
          <div class="lesson-meta">
            <span class="meta-chip"><i class="fa-regular fa-image" aria-hidden="true"></i> ${lesson.slideCount} 張</span>
            ${progress.lastSlide > 0 ? `<span class="meta-chip" style="color:var(--olive-primary);">進度 ${pct}%</span>` : ''}
          </div>
          <div class="lesson-progress-bar" aria-label="學習進度 ${pct}%">
            <div class="lesson-progress-fill" style="width:${pct}%"></div>
          </div>
        </div>
      `;
      item.addEventListener('click', () => loadLesson(lesson.id, 1));
      DOM.lessonsContainer.appendChild(item);
    });
  }

  // ─────────────────────────────────────────────
  //  LOAD LESSON
  // ─────────────────────────────────────────────
  function loadLesson(lessonId, slideIdx) {
    const lesson = state.lessons.find(l => l.id === lessonId);
    if (!lesson) return;

    stopSectionAudio();
    state.activeLessonId = lessonId;
    state.activeSlideIndex = Math.max(1, Math.min(slideIdx, lesson.slideCount));

    safeStorage('set', 'blesseq_last_lesson', lessonId);
    updateHash(lessonId, state.activeSlideIndex);

    renderLessonList();
    renderBanner(lesson);
    renderSlides(lesson, state.activeSlideIndex);
    renderLectureNarrative(lesson);
    restorePersonalNotes(lessonId);
    updateProgress(lessonId, state.activeSlideIndex);
  }

  // ─────────────────────────────────────────────
  //  BANNER
  // ─────────────────────────────────────────────
  function renderBanner(lesson) {
    const catLabels = { overview: '門訓總攬', core: '門徒成長必修', practical: '幸福小組實作秘笈' };
    DOM.bannerCategory.querySelector('span').textContent = catLabels[lesson.category] || '門訓課程';
    DOM.bannerTitle.textContent = lesson.title;
    DOM.bannerSubtitle.textContent = lesson.subtitle || '';
    DOM.audioStatusText.textContent = '講義述說語音導讀';
    DOM.audioDetailText.textContent = '點擊播放聆聽本課講義全文';
    DOM.audioIcon.className = 'fa-solid fa-volume-high';
    DOM.audioNarrateBtn.classList.remove('playing');
  }

  // ─────────────────────────────────────────────
  //  SLIDE RENDERING & NAVIGATION
  // ─────────────────────────────────────────────
  function renderSlides(lesson, slideIdx) {
    DOM.totalSlideNum.textContent = lesson.slideCount;
    renderThumbnails(lesson, slideIdx);
    if (state.isGridOpen) renderSlideGrid(lesson);
    setSlide(slideIdx, 'none');
  }

  function setSlide(newIdx, direction) {
    const lesson = state.lessons.find(l => l.id === state.activeLessonId);
    if (!lesson) return;

    const idx = Math.max(1, Math.min(newIdx, lesson.slideCount));
    const slide = lesson.slides[idx - 1];
    if (!slide) return;

    const prevIdx = state.activeSlideIndex;
    state.activeSlideIndex = idx;

    // Slide image with transition animation (P2-9)
    const img = DOM.slideMainImg;
    img.classList.remove('enter-right', 'enter-left');
    void img.offsetWidth; // force reflow
    if (direction === 'next') img.classList.add('enter-right');
    else if (direction === 'prev') img.classList.add('enter-left');

    img.src = slide.image;
    img.alt = slide.title || `第${state.activeLessonId}課 第${idx}張投影片`;

    DOM.currentSlideNum.textContent = idx;
    updateHash(state.activeLessonId, idx);
    safeStorage('set', 'blesseq_last_slide', String(idx));
    updateProgress(state.activeLessonId, idx);

    // Sync thumbnails
    syncThumbnailActive(idx);

    // Update slide info pane (P1-11 fix)
    renderSlideInfo(slide);

    // Update presenter if open
    if (state.isPresenterOpen) {
      DOM.presenterImg.src = slide.image;
      DOM.presenterSlideIndicator.textContent = `${idx} / ${lesson.slideCount}`;
    }

    // Preload adjacent slides (P1-9)
    preloadAdjacentSlides(lesson, idx);

    // Sync lecture scroll (P1-14)
    syncLectureScroll(slide);
  }

  function preloadAdjacentSlides(lesson, idx) {
    [idx + 1, idx + 2, idx - 1].forEach(i => {
      if (i >= 1 && i <= lesson.slideCount) {
        const s = lesson.slides[i - 1];
        if (s && s.image) {
          const img = new Image();
          img.src = s.image;
        }
      }
    });
  }

  function renderSlideInfo(slide) {
    DOM.slideHeadline.textContent = slide.title
      ? slide.title.replace(/\r?\n/g, ' ').replace(/\t/g, ' ').trim()
      : '投影片重點提要';

    DOM.slideBulletList.innerHTML = '';

    // P1-11 FIX: Skip first line only if it duplicates the title
    const titleClean = (slide.title || '').replace(/\s+/g, ' ').trim();
    const lines = (slide.textLines || []).filter((line, idx) => {
      const lineClean = line.replace(/[\r\n\t]+/g, ' ').trim();
      if (idx === 0 && lineClean && titleClean && lineClean === titleClean) return false;
      return lineClean.length > 0;
    });

    if (lines.length > 0) {
      lines.forEach(line => {
        const cleanLine = line.replace(/[\r\n\t]+/g, ' ').trim();
        if (!cleanLine) return;
        const li = document.createElement('li');
        li.textContent = cleanLine;
        DOM.slideBulletList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = '此頁為視覺概念圖示或經文全版呈現。';
      li.style.color = 'var(--text-muted)';
      li.style.fontStyle = 'italic';
      DOM.slideBulletList.appendChild(li);
    }

    if (slide.notes && slide.notes.trim()) {
      DOM.slideNotesBox.style.display = 'block';
      DOM.slideNotesText.textContent = slide.notes.trim();
    } else {
      DOM.slideNotesBox.style.display = 'none';
    }
  }

  // ─────────────────────────────────────────────
  //  THUMBNAILS
  // ─────────────────────────────────────────────
  function renderThumbnails(lesson, activeIdx) {
    DOM.thumbnailsStrip.innerHTML = '';
    lesson.slides.forEach((slide, i) => {
      const idx = i + 1;
      const div = document.createElement('div');
      div.className = `thumb-item${idx === activeIdx ? ' active' : ''}`;
      div.setAttribute('role', 'option');
      div.setAttribute('aria-selected', idx === activeIdx ? 'true' : 'false');
      div.setAttribute('aria-label', `第 ${idx} 張投影片`);
      div.dataset.idx = idx;

      const img = document.createElement('img');
      img.src = slide.image;
      img.alt = '';
      img.loading = 'lazy';
      div.appendChild(img);
      div.addEventListener('click', () => {
        const dir = idx > state.activeSlideIndex ? 'next' : 'prev';
        setSlide(idx, dir);
      });
      DOM.thumbnailsStrip.appendChild(div);
    });
  }

  function syncThumbnailActive(activeIdx) {
    DOM.thumbnailsStrip.querySelectorAll('.thumb-item').forEach(t => {
      const isActive = parseInt(t.dataset.idx) === activeIdx;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
      if (isActive) t.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
  }

  // ─────────────────────────────────────────────
  //  SLIDE GRID GALLERY (P2-7)
  // ─────────────────────────────────────────────
  function toggleGridView() {
    state.isGridOpen = !state.isGridOpen;
    DOM.slideGridGallery.hidden = !state.isGridOpen;
    DOM.btnGridView.setAttribute('aria-label', state.isGridOpen ? '關閉格線總覽' : '切換格線縮圖總覽模式');

    if (state.isGridOpen) {
      const lesson = state.lessons.find(l => l.id === state.activeLessonId);
      if (lesson) renderSlideGrid(lesson);
    }
  }

  function renderSlideGrid(lesson) {
    DOM.slideGridGallery.innerHTML = '';
    lesson.slides.forEach((slide, i) => {
      const idx = i + 1;
      const div = document.createElement('div');
      div.className = `slide-grid-thumb${idx === state.activeSlideIndex ? ' active' : ''}`;
      div.setAttribute('aria-label', `第 ${idx} 張`);
      const img = document.createElement('img');
      img.src = slide.image;
      img.alt = '';
      img.loading = 'lazy';
      div.appendChild(img);
      div.addEventListener('click', () => {
        const dir = idx > state.activeSlideIndex ? 'next' : 'prev';
        setSlide(idx, dir);
        toggleGridView();
      });
      DOM.slideGridGallery.appendChild(div);
    });
  }

  // ─────────────────────────────────────────────
  //  LECTURE SYNC SCROLL (P1-14)
  // ─────────────────────────────────────────────
  function syncLectureScroll(slide) {
    if (!slide || !slide.title) return;
    const titleClean = slide.title.replace(/\s+/g, '').slice(0, 6);
    const sections = DOM.lectureScrollContent.querySelectorAll('[data-section-title]');
    let bestMatch = null;
    sections.forEach(sec => {
      const secTitle = (sec.dataset.sectionTitle || '').replace(/\s+/g, '').slice(0, 6);
      if (secTitle && titleClean && secTitle.includes(titleClean.slice(0, 3))) {
        bestMatch = sec;
      }
    });
    if (bestMatch) {
      bestMatch.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ─────────────────────────────────────────────
  //  LECTURE NARRATIVE (Right Pane - V3 Editorial Cards)
  // ─────────────────────────────────────────────
  function renderLectureNarrative(lesson) {
    DOM.lectureScrollContent.innerHTML = '';
    if (DOM.sectionNavPills) DOM.sectionNavPills.innerHTML = '';

    const sections = lesson.sections || [];
    if (sections.length === 0) {
      DOM.lectureScrollContent.innerHTML = `
        <div style="padding:2rem;text-align:center;color:var(--text-muted);">
          <i class="fa-solid fa-book-open" style="font-size:2.5rem;margin-bottom:1rem;color:var(--gold-primary);"></i>
          <p>本課講義正在載入中，請參考左側投影片內容。</p>
        </div>`;
      return;
    }

    // 1. Render Mini-TOC Nav Pills
    if (DOM.sectionNavPills) {
      sections.forEach((sec, idx) => {
        const pill = document.createElement('button');
        pill.className = `section-nav-pill${idx === 0 ? ' active' : ''}`;
        pill.setAttribute('role', 'tab');
        pill.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
        pill.id = `nav-pill-${sec.id}`;
        pill.title = `${sec.tag}: ${sec.title}`;
        pill.innerHTML = `<i class="fa-solid fa-bookmark text-gold" style="font-size:0.7em;"></i> <span>${escapeHtml(sec.num)}. ${escapeHtml(sec.title.slice(0, 10))}</span>`;
        pill.addEventListener('click', () => {
          DOM.sectionNavPills.querySelectorAll('.section-nav-pill').forEach(p => {
            p.classList.remove('active');
            p.setAttribute('aria-selected', 'false');
          });
          pill.classList.add('active');
          pill.setAttribute('aria-selected', 'true');
          const card = $(`card-${sec.id}`);
          if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        DOM.sectionNavPills.appendChild(pill);
      });
    }

    // 2. Render Curated Study Section Cards
    sections.forEach((sec, idx) => {
      const card = document.createElement('article');
      card.className = 'study-section-card';
      card.id = `card-${sec.id}`;
      card.dataset.sectionId = sec.id;
      card.dataset.sectionNum = sec.num;
      card.dataset.sectionTitle = sec.title;

      // Header Bar: Tag badge + Num + Discrete Micro-Audio Button
      const headerBar = document.createElement('div');
      headerBar.className = 'section-header-bar';
      headerBar.innerHTML = `
        <div class="section-badge-group">
          <span class="section-badge-tag">${escapeHtml(sec.tag || '研讀要點')}</span>
          <span class="section-badge-num">PART ${escapeHtml(sec.num)}</span>
        </div>
        <button class="section-audio-btn" type="button" id="btn-audio-${sec.id}"
                aria-label="播放或暫停本段語音導讀，預估時長 ${sec.durationEstimate || '約 45 秒'}"
                title="聆聽此段重點導讀">
          <i class="fa-solid fa-play" id="icon-audio-${sec.id}" aria-hidden="true"></i>
          <span id="text-audio-${sec.id}">聆聽此段 · ${escapeHtml(sec.durationEstimate || '約 45 秒')}</span>
        </button>
      `;

      // Bind micro-audio button click
      const audioBtn = headerBar.querySelector('.section-audio-btn');
      audioBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSectionAudio(sec.id);
      });

      card.appendChild(headerBar);

      // Section Title
      const titleEl = document.createElement('h4');
      titleEl.className = 'section-title-heading';
      titleEl.textContent = `${sec.num}、${sec.title}`;
      card.appendChild(titleEl);

      // Scripture Callout (if available)
      if (sec.scripture && sec.scripture.text) {
        const scriptureCard = document.createElement('div');
        scriptureCard.className = 'scripture-card';
        scriptureCard.innerHTML = `
          <div class="scripture-citation">
            <i class="fa-solid fa-book-bible text-gold" aria-hidden="true"></i> 【${escapeHtml(sec.scripture.citation)}】
          </div>
          <div class="scripture-text">「${escapeHtml(sec.scripture.text)}」</div>
        `;
        card.appendChild(scriptureCard);
      }

      // Paragraphs / Subpoints with Interactive Fill-in Blanks
      if (sec.paragraphs && sec.paragraphs.length > 0) {
        const pointsList = document.createElement('ul');
        pointsList.className = 'section-points-list';
        sec.paragraphs.forEach(p => {
          const li = document.createElement('li');
          li.className = 'section-point-item';
          li.innerHTML = formatLectureParagraph(p, lesson);
          pointsList.appendChild(li);
        });
        card.appendChild(pointsList);
      }

      // Golden Quote Box (Key Insight Takeaway)
      if (sec.goldenQuote && sec.goldenQuote.trim()) {
        const quoteBox = document.createElement('div');
        quoteBox.className = 'golden-quote-box';
        quoteBox.innerHTML = `
          <i class="fa-solid fa-lightbulb" aria-hidden="true"></i>
          <div>
            <strong style="color:var(--gold-primary);font-size:0.8rem;display:block;margin-bottom:0.2rem;letter-spacing:0.04em;">核心心法提要</strong>
            <span>${escapeHtml(sec.goldenQuote)}</span>
          </div>
        `;
        card.appendChild(quoteBox);
      }

      DOM.lectureScrollContent.appendChild(card);
    });

    // Small Group Reflection Workshop Box at the end
    const reflectionCard = document.createElement('div');
    reflectionCard.className = 'reflection-box';
    reflectionCard.innerHTML = `
      <h4><i class="fa-solid fa-comments text-gold" aria-hidden="true"></i> 課後反思與小組實作操練</h4>
      <ul>
        <li>默想本課核心經文，哪一句話最觸動你此時此刻的心境？</li>
        <li>在實際服事或日常生活中，本課觀念如何幫助你突破目前的瓶頸？</li>
        <li>與幸福小組同工彼此代禱，並寫下具體的實踐行動清單。</li>
      </ul>
    `;
    DOM.lectureScrollContent.appendChild(reflectionCard);

    updateBlanksDisplay();
  }

  // ─────────────────────────────────────────────
  //  FILL-IN-BLANKS ENGINE (P1-3: data-driven)
  // ─────────────────────────────────────────────
  function formatLectureParagraph(text, lesson) {
    if (!text) return '';

    // Clean control characters
    let cleaned = text
      .replace(/門徒學校\(下\)[\s\S]*?\d+/g, '')
      .replace(/幸福小組實作秘笈[\s\S]*?\d+/g, '')
      .replace(/[\r\t]+/g, ' ')
      .replace(/\n\s*\n/g, '<br><br>')
      .replace(/\n/g, '<br>');

    // P1-3: Data-driven blank detection — use slides' textLines with full-width spaces
    // Pattern 1: Lines from slides that have 　　　 (ideographic spaces as blanks)
    if (lesson && lesson.slides) {
      lesson.slides.forEach(slide => {
        (slide.textLines || []).forEach(line => {
          // Detect fill-in pattern: text before blank spaces, then more text
          const blankPattern = /([^\u3000]+?)\u3000{2,}([^\u3000]*)/g;
          let bm;
          while ((bm = blankPattern.exec(line)) !== null) {
            // The "blank" in slide text is marked by full-width spaces
            // Try to find an adjacent slide that has the answer
            const before = bm[1].trim();
            const after = bm[2].trim();
            if (before.length >= 2 && before.length <= 20) {
              // Escape for HTML and replace in cleaned text
              const escaped = before.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              try {
                const re = new RegExp(escaped, 'g');
                cleaned = cleaned.replace(re, createBlankSpan(before));
              } catch(e) { /* ignore */ }
            }
          }
        });
      });
    }

    // Pattern 2: Direct blank markers in PDF text (various forms)
    cleaned = cleaned.replace(/_{3,}/g, () => createBlankSpan('　　　'));
    cleaned = cleaned.replace(/\u3000{2,}/g, () => createBlankSpan('　　　'));

    // Pattern 3: 【填空：answer】 explicit markers
    cleaned = cleaned.replace(/【填空：([^】]+)】/g, (m, p1) => createBlankSpan(p1));

    return cleaned;
  }

  function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function createBlankSpan(text) {
    const safe = text.replace(/"/g, '&quot;');
    return `<span class="blank-answer${state.isMasked ? ' masked' : ''}" data-answer="${safe}" role="button" tabindex="0" aria-label="填空題，點擊揭曉解答" title="點擊揭曉/遮蔽解答">${escapeHtml(text)}</span>`;
  }

  function updateBlanksDisplay() {
    DOM.lectureScrollContent.querySelectorAll('.blank-answer').forEach(b => {
      b.classList.toggle('masked', state.isMasked);
      b.onclick = function (e) {
        e.stopPropagation();
        this.classList.remove('masked');
        this.classList.add('revealed');
      };
      b.onkeydown = function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.click();
        }
      };
    });
  }

  // ─────────────────────────────────────────────
  //  PRESENTER MODE (P3-7: with timer)
  // ─────────────────────────────────────────────
  function openPresenter() {
    state.isPresenterOpen = true;
    const lesson = state.lessons.find(l => l.id === state.activeLessonId);
    if (!lesson) return;
    const slide = lesson.slides[state.activeSlideIndex - 1];

    DOM.presenterLessonTitle.textContent = `${lesson.code} ${lesson.title}`;
    DOM.presenterSlideIndicator.textContent = `${state.activeSlideIndex} / ${lesson.slideCount}`;
    DOM.presenterImg.src = slide ? slide.image : '';
    DOM.presenterModal.style.display = 'flex';
    DOM.presenterModal.removeAttribute('hidden');

    // Focus management (P2-3)
    DOM.closePresenterBtn.focus();

    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }
    } catch (e) { /* ignore */ }
  }

  function closePresenter() {
    state.isPresenterOpen = false;
    DOM.presenterModal.style.display = 'none';
    stopPresenterTimer();
    DOM.startPresenterBtn.focus();
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  // Presenter Timer (P3-7)
  function togglePresenterTimer() {
    if (state.timerRunning) {
      state.timerRunning = false;
      clearInterval(state.timerInterval);
      DOM.presenterTimerIcon.className = 'fa-solid fa-play';
    } else {
      state.timerRunning = true;
      DOM.presenterTimerIcon.className = 'fa-solid fa-pause';
      state.timerInterval = setInterval(() => {
        state.timerSeconds++;
        const m = String(Math.floor(state.timerSeconds / 60)).padStart(2, '0');
        const s = String(state.timerSeconds % 60).padStart(2, '0');
        DOM.presenterTimerDisplay.textContent = `${m}:${s}`;
      }, 1000);
    }
  }

  function stopPresenterTimer() {
    state.timerRunning = false;
    state.timerSeconds = 0;
    clearInterval(state.timerInterval);
    DOM.presenterTimerDisplay.textContent = '00:00';
    DOM.presenterTimerIcon.className = 'fa-solid fa-play';
  }

  // ─────────────────────────────────────────────
  //  SECTION-LEVEL MICRO-AUDIO CONTROLLER (V3)
  // ─────────────────────────────────────────────
  function toggleSectionAudio(secId) {
    if (!('speechSynthesis' in window)) {
      alert('您的瀏覽器不支援語音合成功能，建議使用 Chrome / Edge 瀏覽器。');
      return;
    }
    if (state.activeSectionId === secId && state.isSectionSpeaking) {
      stopSectionAudio();
    } else {
      playSectionAudio(secId);
    }
  }

  function playSectionAudio(secId, isAutoAdvance = false) {
    const lesson = state.lessons.find(l => l.id === state.activeLessonId);
    if (!lesson || !lesson.sections) return;

    const sec = lesson.sections.find(s => s.id === secId);
    if (!sec) return;

    // Stop any currently running speech
    stopSectionAudio(false);

    state.activeSectionId = secId;
    state.isSectionSpeaking = true;

    // Visual highlight on card with golden breathing glow
    const card = $(`card-${secId}`);
    if (card) {
      card.classList.add('speaking');
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Sync Mini-TOC active pill
    if (DOM.sectionNavPills) {
      DOM.sectionNavPills.querySelectorAll('.section-nav-pill').forEach((p, idx) => {
        const isTarget = lesson.sections[idx] && lesson.sections[idx].id === secId;
        p.classList.toggle('active', isTarget);
        p.setAttribute('aria-selected', isTarget ? 'true' : 'false');
        if (isTarget) p.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      });
    }

    // Update Section Audio Pill button
    const btn = $(`btn-audio-${secId}`);
    const icon = $(`icon-audio-${secId}`);
    const text = $(`text-audio-${secId}`);
    if (btn) {
      btn.classList.add('playing');
      if (icon) icon.className = 'fa-solid fa-pause';
      if (text) text.textContent = '導讀中 · 點擊暫停';
    }

    // Update Top Audio Narrator Bar
    DOM.audioIcon.className = 'fa-solid fa-pause';
    DOM.audioNarrateBtn.classList.add('playing');
    DOM.audioStatusText.textContent = `正在導讀：${sec.num} · ${sec.title}`;
    DOM.audioDetailText.textContent = `時長 ${sec.durationEstimate} · 點擊暫停`;

    // Utterance with natural punctuation pacing
    const scriptToRead = sec.narrationScript || `${sec.title}。${sec.summary}`;
    const utterance = new SpeechSynthesisUtterance(scriptToRead);
    utterance.lang = 'zh-TW';
    utterance.rate = state.playbackRate;

    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const zhVoice = voices.find(v => v.lang === 'zh-TW') || voices.find(v => v.lang.startsWith('zh'));
      if (zhVoice) utterance.voice = zhVoice;
    };
    if (window.speechSynthesis.getVoices().length > 0) setVoice();
    else window.speechSynthesis.addEventListener('voiceschanged', setVoice, { once: true });

    utterance.onend = () => {
      onSectionAudioEnded(secId);
    };

    utterance.onerror = () => {
      stopSectionAudio();
    };

    // Chrome GC keepalive
    clearInterval(state.speechKeepAliveInterval);
    state.speechKeepAliveInterval = setInterval(() => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);

    window.speechSynthesis.speak(utterance);
  }

  function onSectionAudioEnded(secId) {
    const lesson = state.lessons.find(l => l.id === state.activeLessonId);
    const card = $(`card-${secId}`);
    if (card) card.classList.remove('speaking');

    const btn = $(`btn-audio-${secId}`);
    const icon = $(`icon-audio-${secId}`);
    const text = $(`text-audio-${secId}`);
    if (btn) {
      btn.classList.remove('playing');
      const sec = lesson ? lesson.sections.find(s => s.id === secId) : null;
      if (icon) icon.className = 'fa-solid fa-rotate-right';
      if (text) text.textContent = `重新聆聽 · ${sec ? sec.durationEstimate : ''}`;
    }

    state.isSectionSpeaking = false;
    clearInterval(state.speechKeepAliveInterval);

    // If Auto-Advance is enabled, advance to next section smoothly
    if (state.autoAdvance && lesson && lesson.sections) {
      const curIdx = lesson.sections.findIndex(s => s.id === secId);
      if (curIdx >= 0 && curIdx < lesson.sections.length - 1) {
        const nextSec = lesson.sections[curIdx + 1];
        setTimeout(() => {
          playSectionAudio(nextSec.id, true);
        }, 700);
        return;
      }
    }

    // Reset Top Narrator Bar
    DOM.audioIcon.className = 'fa-solid fa-volume-high';
    DOM.audioNarrateBtn.classList.remove('playing');
    DOM.audioStatusText.textContent = '講義述說語音導讀';
    DOM.audioDetailText.textContent = '點擊段落播放按鈕開始聆聽';
    state.activeSectionId = null;
  }

  function stopSectionAudio(resetTopBar = true) {
    window.speechSynthesis.cancel();
    clearInterval(state.speechKeepAliveInterval);

    if (state.activeSectionId) {
      const prevCard = $(`card-${state.activeSectionId}`);
      if (prevCard) prevCard.classList.remove('speaking');

      const prevBtn = $(`btn-audio-${state.activeSectionId}`);
      const prevIcon = $(`icon-audio-${state.activeSectionId}`);
      const prevText = $(`text-audio-${state.activeSectionId}`);
      if (prevBtn) {
        prevBtn.classList.remove('playing');
        const lesson = state.lessons.find(l => l.id === state.activeLessonId);
        const sec = lesson ? lesson.sections.find(s => s.id === state.activeSectionId) : null;
        if (prevIcon) prevIcon.className = 'fa-solid fa-play';
        if (prevText) prevText.textContent = `聆聽此段 · ${sec ? sec.durationEstimate : ''}`;
      }
    }

    state.isSectionSpeaking = false;
    if (resetTopBar) {
      state.activeSectionId = null;
      DOM.audioIcon.className = 'fa-solid fa-volume-high';
      DOM.audioNarrateBtn.classList.remove('playing');
      DOM.audioStatusText.textContent = '講義述說語音導讀';
      DOM.audioDetailText.textContent = '點擊段落播放按鈕開始聆聽';
    }
  }

  function toggleAutoAdvance() {
    state.autoAdvance = !state.autoAdvance;
    if (DOM.audioAutoAdvanceBtn) {
      DOM.audioAutoAdvanceBtn.classList.toggle('active', state.autoAdvance);
      DOM.audioAutoAdvanceBtn.setAttribute('aria-pressed', state.autoAdvance ? 'true' : 'false');
    }
    if (DOM.autoAdvanceText) {
      DOM.autoAdvanceText.textContent = `自動連播: ${state.autoAdvance ? '開' : '關'}`;
    }
  }

  // Master Audio Toggle on Top Banner Bar
  function toggleMasterAudio() {
    const lesson = state.lessons.find(l => l.id === state.activeLessonId);
    if (!lesson || !lesson.sections || lesson.sections.length === 0) return;

    if (state.isSectionSpeaking) {
      stopSectionAudio();
    } else {
      const targetSecId = state.activeSectionId || lesson.sections[0].id;
      playSectionAudio(targetSecId);
    }
  }

  // ─────────────────────────────────────────────
  //  SEARCH (P0-2: Regex-safe)
  // ─────────────────────────────────────────────
  function openSearch() {
    DOM.searchModal.style.display = 'flex';
    DOM.globalSearchInput.value = '';
    DOM.searchResultsList.innerHTML = '';
    DOM.searchResultSummary.textContent = '請輸入關鍵字進行檢索';
    DOM.globalSearchInput.focus();
    trapFocus(DOM.searchModal);
  }

  function closeSearch() {
    DOM.searchModal.style.display = 'none';
    DOM.openSearchBtn.focus();
    releaseFocus();
  }

  function handleSearch(query) {
    query = query.trim();
    if (!query) {
      DOM.searchResultsList.innerHTML = '';
      DOM.searchResultSummary.textContent = '請輸入關鍵字進行檢索';
      return;
    }

    // P0-2: Escape special regex characters
    const escapedQ = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let re;
    try {
      re = new RegExp(escapedQ, 'gi');
    } catch (e) {
      DOM.searchResultSummary.textContent = '搜尋格式錯誤，請輸入一般文字';
      return;
    }

    const hits = [];
    state.lessons.forEach(lesson => {
      // Search lesson title & subtitle
      if (re.test(lesson.title) || re.test(lesson.subtitle || '')) {
        re.lastIndex = 0;
        hits.push({ type: 'lesson', lesson, title: lesson.title, snippet: lesson.subtitle || lesson.title, slideIdx: 1 });
      }
      re.lastIndex = 0;

      // Search slides
      lesson.slides.forEach((slide, i) => {
        const slideText = [slide.title, ...(slide.textLines || [])].join(' ');
        re.lastIndex = 0;
        if (re.test(slideText)) {
          hits.push({ type: 'slide', lesson, title: slide.title || `第 ${i+1} 張投影片`, snippet: slideText.slice(0, 120), slideIdx: i + 1 });
        }
        re.lastIndex = 0;
      });

      // Search PDF text
      if (lesson.fullPdfText) {
        re.lastIndex = 0;
        const pdfIdx = lesson.fullPdfText.search(re);
        if (pdfIdx !== -1) {
          const snippet = lesson.fullPdfText.slice(Math.max(0, pdfIdx - 30), pdfIdx + 100);
          hits.push({ type: 'pdf', lesson, title: `${lesson.code} 講義`, snippet, slideIdx: 1 });
        }
        re.lastIndex = 0;
      }
    });

    // Deduplicate by lessonId+slideIdx
    const seen = new Set();
    const unique = hits.filter(h => {
      const key = `${h.lesson.id}:${h.slideIdx}:${h.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    DOM.searchResultSummary.textContent = unique.length > 0
      ? `找到 ${unique.length} 個結果`
      : '未找到相關內容，請嘗試其他關鍵字';

    DOM.searchResultsList.innerHTML = '';
    unique.slice(0, 40).forEach(h => {
      const typeLabel = h.type === 'lesson' ? '課程' : h.type === 'slide' ? '投影片' : '講義';

      let highlightedTitle = escapeHtml(h.title || '');
      let highlightedSnippet = escapeHtml(h.snippet || '');
      try {
        const reH = new RegExp(escapedQ, 'gi');
        highlightedTitle = highlightedTitle.replace(reH, m => `<mark class="highlight-match">${m}</mark>`);
        highlightedSnippet = highlightedSnippet.replace(reH, m => `<mark class="highlight-match">${m}</mark>`);
      } catch(e) { /* ignore */ }

      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.setAttribute('role', 'option');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', `${h.lesson.code} ${h.title}`);
      item.innerHTML = `
        <div class="search-res-lesson">${escapeHtml(h.lesson.code)} · ${escapeHtml(h.lesson.title)} · ${typeLabel}</div>
        <div class="search-res-title">${highlightedTitle}</div>
        <div class="search-res-snippet">${highlightedSnippet}</div>
      `;
      const handler = () => {
        loadLesson(h.lesson.id, h.slideIdx);
        closeSearch();
      };
      item.addEventListener('click', handler);
      item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handler(); });
      DOM.searchResultsList.appendChild(item);
    });
  }

  // ─────────────────────────────────────────────
  //  TOOLKIT MODAL
  // ─────────────────────────────────────────────
  function openToolkit() {
    DOM.toolkitModal.style.display = 'flex';
    trapFocus(DOM.toolkitModal);
    DOM.closeToolkitModalBtn.focus();
  }

  function closeToolkit() {
    DOM.toolkitModal.style.display = 'none';
    releaseFocus();
    DOM.openToolkitBtn.focus();
  }

  // ─────────────────────────────────────────────
  //  FOCUS TRAP (P2-3)
  // ─────────────────────────────────────────────
  let _focusTrapEl = null;
  let _prevFocusEl = null;

  function trapFocus(el) {
    _prevFocusEl = document.activeElement;
    _focusTrapEl = el;
    el.addEventListener('keydown', handleFocusTrap);
  }

  function releaseFocus() {
    if (_focusTrapEl) _focusTrapEl.removeEventListener('keydown', handleFocusTrap);
    _focusTrapEl = null;
    if (_prevFocusEl) try { _prevFocusEl.focus(); } catch(e) {}
  }

  function handleFocusTrap(e) {
    if (e.key !== 'Tab' || !_focusTrapEl) return;
    const focusable = Array.from(_focusTrapEl.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter(el => !el.disabled && el.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  // ─────────────────────────────────────────────
  //  PERSONAL NOTES (P2-8)
  // ─────────────────────────────────────────────
  function togglePersonalNotes() {
    state.isNotesOpen = !state.isNotesOpen;
    DOM.personalNotesToggle.setAttribute('aria-expanded', state.isNotesOpen ? 'true' : 'false');
    DOM.personalNotesArea.hidden = !state.isNotesOpen;
    if (state.isNotesOpen) DOM.personalNotesInput.focus();
  }

  function restorePersonalNotes(lessonId) {
    const key = `blesseq_note_${lessonId}`;
    const saved = safeStorage('get', key) || '';
    DOM.personalNotesInput.value = saved;
  }

  function savePersonalNote() {
    const key = `blesseq_note_${state.activeLessonId}`;
    safeStorage('set', key, DOM.personalNotesInput.value);
  }

  // ─────────────────────────────────────────────
  //  PROGRESS TRACKING (P2-4)
  // ─────────────────────────────────────────────
  function updateProgress(lessonId, slideIdx) {
    if (!state.progress[lessonId]) {
      state.progress[lessonId] = { lastSlide: 0, slideCount: 0 };
    }
    state.progress[lessonId].lastSlide = Math.max(state.progress[lessonId].lastSlide, slideIdx);
    const lesson = state.lessons.find(l => l.id === lessonId);
    if (lesson) state.progress[lessonId].slideCount = lesson.slideCount;
    safeStorage('set', 'blesseq_progress', JSON.stringify(state.progress));
  }

  // ─────────────────────────────────────────────
  //  INTERACTIVE BEST CHECKLIST (V4)
  // ─────────────────────────────────────────────
  function initInteractiveChecklists() {
    document.querySelectorAll('.best-check-item input[type="checkbox"]').forEach(chk => {
      const key = `blesseq_chk_${chk.id}`;
      const saved = safeStorage('get', key);
      if (saved === 'true') {
        chk.checked = true;
        const item = chk.closest('.best-check-item');
        if (item) item.classList.add('completed');
      }
      chk.addEventListener('change', () => {
        safeStorage('set', key, chk.checked ? 'true' : 'false');
        const item = chk.closest('.best-check-item');
        if (item) item.classList.toggle('completed', chk.checked);
      });
    });
  }

  // ─────────────────────────────────────────────
  //  SAFE LOCALSTORAGE (P0-7)
  // ─────────────────────────────────────────────
  function safeStorage(action, key, value) {
    try {
      if (action === 'get') return localStorage.getItem(key);
      if (action === 'set') localStorage.setItem(key, value);
    } catch (e) { /* Private browsing / security policy */ }
    return null;
  }

  // ─────────────────────────────────────────────
  //  SAFE CLIPBOARD (P0-7)
  // ─────────────────────────────────────────────
  function safeCopy(text, successMsg) {
    try {
      navigator.clipboard.writeText(text).then(() => alert(successMsg || '已複製！')).catch(() => {
        fallbackCopy(text, successMsg);
      });
    } catch (e) {
      fallbackCopy(text, successMsg);
    }
  }

  function fallbackCopy(text, successMsg) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      alert(successMsg || '已複製！');
    } catch(e) {
      alert('複製失敗，請手動選取文字複製。');
    }
  }

  // ─────────────────────────────────────────────
  //  TOUCH SWIPE GESTURES (P1-13)
  // ─────────────────────────────────────────────
  function addSwipe(el) {
    let startX = 0;
    let startY = 0;
    el.addEventListener('touchstart', e => {
      startX = e.changedTouches[0].screenX;
      startY = e.changedTouches[0].screenY;
    }, { passive: true });
    el.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].screenX - startX;
      const dy = e.changedTouches[0].screenY - startY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
        if (dx < 0) setSlide(state.activeSlideIndex + 1, 'next');
        else setSlide(state.activeSlideIndex - 1, 'prev');
      }
    }, { passive: true });
  }

  // ─────────────────────────────────────────────
  //  MASK TOGGLE
  // ─────────────────────────────────────────────
  function toggleMask() {
    state.isMasked = !state.isMasked;
    const isNowMasked = state.isMasked;
    DOM.maskIcon.className = isNowMasked ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
    DOM.toggleMaskBtn.setAttribute('aria-pressed', isNowMasked ? 'true' : 'false');
    DOM.toggleMaskBtn.title = isNowMasked ? '揭曉講義解答' : '切換為挖空測驗模式';
    DOM.toggleMaskRightBtn.innerHTML = isNowMasked
      ? '<i class="fa-solid fa-eye" aria-hidden="true"></i> <span class="btn-text">顯示解答</span>'
      : '<i class="fa-solid fa-pen-clip" aria-hidden="true"></i> <span class="btn-text">填空測驗</span>';
    DOM.toggleMaskRightBtn.setAttribute('aria-pressed', isNowMasked ? 'true' : 'false');
    updateBlanksDisplay();
  }

  // ─────────────────────────────────────────────
  //  BIND EVENTS
  // ─────────────────────────────────────────────
  function bindEvents() {
    // Theme & Font
    DOM.themeToggleBtn.addEventListener('click', cycleTheme);
    DOM.fontScaleBtn.addEventListener('click', cycleFontScale);

    // Brand / Home
    DOM.brandHomeBtn.addEventListener('click', () => {
      loadLesson(state.lessons[0].id, 1);
    });

    // Category Tabs
    DOM.categoryTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        DOM.categoryTabs.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        state.activeCategory = btn.dataset.filter;
        renderLessonList();
      });
    });

    // Slide Controls
    DOM.btnSlidePrev.addEventListener('click', () => setSlide(state.activeSlideIndex - 1, 'prev'));
    DOM.btnSlideNext.addEventListener('click', () => setSlide(state.activeSlideIndex + 1, 'next'));
    DOM.overlayPrevBtn.addEventListener('click', () => setSlide(state.activeSlideIndex - 1, 'prev'));
    DOM.overlayNextBtn.addEventListener('click', () => setSlide(state.activeSlideIndex + 1, 'next'));

    // Grid View
    DOM.btnGridView.addEventListener('click', toggleGridView);

    // Presenter
    DOM.startPresenterBtn.addEventListener('click', openPresenter);
    DOM.btnSlideFullscreen.addEventListener('click', openPresenter);
    DOM.closePresenterBtn.addEventListener('click', closePresenter);
    DOM.presenterPrevBtn.addEventListener('click', () => setSlide(state.activeSlideIndex - 1, 'prev'));
    DOM.presenterNextBtn.addEventListener('click', () => setSlide(state.activeSlideIndex + 1, 'next'));
    DOM.presenterTimerToggle.addEventListener('click', togglePresenterTimer);

    // Lesson Prev / Next
    DOM.btnPrevLesson.addEventListener('click', () => {
      const cur = state.lessons.findIndex(l => l.id === state.activeLessonId);
      if (cur > 0) loadLesson(state.lessons[cur - 1].id, 1);
    });
    DOM.btnNextLesson.addEventListener('click', () => {
      const cur = state.lessons.findIndex(l => l.id === state.activeLessonId);
      if (cur < state.lessons.length - 1) loadLesson(state.lessons[cur + 1].id, 1);
    });

    // Mask / Blanks
    DOM.toggleMaskBtn.addEventListener('click', toggleMask);
    DOM.toggleMaskRightBtn.addEventListener('click', toggleMask);

    // Audio (V3 Section Audio & Auto-Advance)
    DOM.audioNarrateBtn.addEventListener('click', toggleMasterAudio);
    if (DOM.audioAutoAdvanceBtn) {
      DOM.audioAutoAdvanceBtn.addEventListener('click', toggleAutoAdvance);
    }
    DOM.audioSpeedSelect.addEventListener('change', e => {
      const newRate = parseFloat(e.target.value);
      state.playbackRate = newRate;
      if (state.isSectionSpeaking && state.activeSectionId) {
        playSectionAudio(state.activeSectionId);
      }
    });

    // Search
    DOM.openSearchBtn.addEventListener('click', openSearch);
    DOM.closeSearchModalBtn.addEventListener('click', closeSearch);
    DOM.searchModal.addEventListener('click', e => { if (e.target === DOM.searchModal) closeSearch(); });
    DOM.globalSearchInput.addEventListener('input', e => handleSearch(e.target.value));

    // Toolkit
    DOM.openToolkitBtn.addEventListener('click', openToolkit);
    DOM.closeToolkitModalBtn.addEventListener('click', closeToolkit);
    DOM.toolkitModal.addEventListener('click', e => { if (e.target === DOM.toolkitModal) closeToolkit(); });

    // Toolkit Tabs (V4: 3-Tab Blessed Church Toolkit)
    function switchToolkitTab(tab) {
      const tabs = [
        { btn: DOM.toolTabTestimony, panel: DOM.testimonyToolContent, id: 'testimony' },
        { btn: DOM.toolTabBest, panel: DOM.bestToolContent, id: 'best' },
        { btn: DOM.toolTab8Weeks, panel: DOM.eightWeeksToolContent, id: '8weeks' }
      ];
      tabs.forEach(t => {
        if (t.btn && t.panel) {
          const isActive = t.id === tab;
          t.btn.classList.toggle('active', isActive);
          t.btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
          t.panel.hidden = !isActive;
        }
      });
    }

    DOM.toolTabTestimony.addEventListener('click', () => switchToolkitTab('testimony'));
    DOM.toolTabBest.addEventListener('click', () => switchToolkitTab('best'));
    if (DOM.toolTab8Weeks) {
      DOM.toolTab8Weeks.addEventListener('click', () => switchToolkitTab('8weeks'));
    }

    // Copy Testimony (P0-7 safe clipboard)
    DOM.copyTestimonyBtn.addEventListener('click', () => {
      const b = DOM.testimonyBefore.value.trim();
      const t = DOM.testimonyTurning.value.trim();
      const a = DOM.testimonyAfter.value.trim();
      const full = `【我的信主見證】\n\n一、信主前：\n${b||'（尚未填寫）'}\n\n二、轉折點：\n${t||'（尚未填寫）'}\n\n三、信主後的改變：\n${a||'（尚未填寫）'}\n\n願一切榮耀頌讚都歸給愛我們的主耶穌！`;
      safeCopy(full, '見證講稿已成功複製到剪貼簿！');
    });

    DOM.clearTestimonyBtn.addEventListener('click', () => {
      if (confirm('確定清除已輸入的見證內容嗎？')) {
        DOM.testimonyBefore.value = '';
        DOM.testimonyTurning.value = '';
        DOM.testimonyAfter.value = '';
      }
    });

    // Copy Lecture
    DOM.lectureCopyBtn.addEventListener('click', () => {
      safeCopy(DOM.lectureScrollContent.innerText, '講義重點與述說內容已成功複製！');
    });

    // Personal Notes (P2-8)
    DOM.personalNotesToggle.addEventListener('click', togglePersonalNotes);
    DOM.personalNotesInput.addEventListener('input', savePersonalNote);

    // Swipe Gestures (P1-13)
    addSwipe(DOM.slideStageMain);
    addSwipe(document.getElementById('presenterBody'));

    // Keyboard Shortcuts
    document.addEventListener('keydown', e => {
      // Allow typing in inputs
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        if (e.key === 'Escape') {
          if (DOM.searchModal.style.display !== 'none') closeSearch();
          if (DOM.toolkitModal.style.display !== 'none') closeToolkit();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          setSlide(state.activeSlideIndex - 1, 'prev');
          break;
        case 'ArrowRight':
          setSlide(state.activeSlideIndex + 1, 'next');
          break;
        case ' ':
          // P1-4 FIX: Space only advances slides in presenter mode
          if (state.isPresenterOpen) {
            e.preventDefault();
            setSlide(state.activeSlideIndex + 1, 'next');
          }
          break;
        case 'f': case 'F':
          if (!e.ctrlKey && !e.metaKey) {
            state.isPresenterOpen ? closePresenter() : openPresenter();
          }
          break;
        case 'g': case 'G':
          if (!e.ctrlKey && !e.metaKey) toggleGridView();
          break;
        case 'Escape':
          if (state.isPresenterOpen) closePresenter();
          if (DOM.searchModal.style.display !== 'none') closeSearch();
          if (DOM.toolkitModal.style.display !== 'none') closeToolkit();
          break;
        case 'k': case 'K':
          if (e.ctrlKey || e.metaKey) { e.preventDefault(); openSearch(); }
          break;
      }
    });
  }

  // ─────────────────────────────────────────────
  //  AUTO START
  // ─────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
