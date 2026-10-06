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
  // ─────────────────────────────────────────────
  //  STATE & THEMES
  // ─────────────────────────────────────────────
  const THEMES = ['light', 'sepia', 'sage', 'dark'];
  const THEME_ICONS = { light: 'fa-sun', sepia: 'fa-scroll', sage: 'fa-leaf', dark: 'fa-moon' };
  const THEME_NAMES = { light: '日光羊皮', sepia: '古卷柔光', sage: '青竹晨曦', dark: '黑曜暗夜' };

  const FONT_SIZES = [15, 17, 19, 22, 25];
  const FONT_SIZE_LABELS = {
    15: '精簡 (15px)',
    17: '標準 (17px)',
    19: '舒適 (19px)',
    22: '特大 (22px)',
    25: '尊長 (25px)'
  };

  const state = {
    lessons: [],
    activeLessonId: '00',
    activeSlideIndex: 1,
    activeCategory: 'all',
    isMasked: false,
    themeIndex: Math.max(0, THEMES.indexOf(localStorage.getItem('blesseq_theme') || 'light')),
    fontSize: parseInt(localStorage.getItem('blesseq_font_size') || '17', 10),
    lineHeight: parseFloat(localStorage.getItem('blesseq_line_height') || '1.85'),
    fontFamily: localStorage.getItem('blesseq_font_family') || 'sans',
    mobileView: localStorage.getItem('blesseq_mobile_view') || 'lecture',
    isDrawerOpen: false,
    isSettingsOpen: false,
    toastTimer: null,
    isPresenterOpen: false,
    isGridOpen: false,
    isNotesOpen: false,
    activeNotesTab: 'prompts',
    notesSaveTimer: null,
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
    // Scripture Memory Cards State (01-12)
    isMemoryCardsOpen: false,
    activeMemoryIndex: 0,
    isMemoryMasked: false,
    isCardFlipped: false,
    masteredVerses: new Set(JSON.parse(localStorage.getItem('blesseq_mastered_verses') || '[]')),
    isSpeakingVerse: false,
  };

  // ─────────────────────────────────────────────
  //  SAFE DOM QUERY
  // ─────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }

  const DOM = {
    html: document.documentElement,
    appLayout: $('appLayout'),
    readingProgressBar: $('readingProgressBar'),
    mobileMenuBtn: $('mobileMenuBtn'),
    sidebarCurriculum: $('sidebarCurriculum'),
    sidebarBackdrop: $('sidebarBackdrop'),
    closeSidebarBtn: $('closeSidebarBtn'),

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

    // Mobile View Switcher
    mobileViewSwitcher: $('mobileViewSwitcher'),
    viewSwitchBtns: document.querySelectorAll('.view-switch-btn[data-view]'),

    // Mobile Bottom Dock
    mobileBottomDock: $('mobileBottomDock'),
    dockMenuBtn: $('dockMenuBtn'),
    dockLectureBtn: $('dockLectureBtn'),
    dockSlideBtn: $('dockSlideBtn'),
    dockAudioBtn: $('dockAudioBtn'),
    dockAudioIcon: $('dockAudioIcon'),
    dockAudioText: $('dockAudioText'),
    dockSettingsBtn: $('dockSettingsBtn'),

    // Audio Narrator
    audioNarrateBtn: $('audioNarrateBtn'),
    audioIcon: $('audioIcon'),
    audioStatusText: $('audioStatusText'),
    audioDetailText: $('audioDetailText'),
    audioAutoAdvanceBtn: $('audioAutoAdvanceBtn'),
    autoAdvanceText: $('autoAdvanceText'),
    audioSpeedSelect: $('audioSpeedSelect'),
    sectionNavPills: $('sectionNavPills'),

    // Slides Pane
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

    // Lecture Pane
    lectureScrollContent: $('lectureScrollContent'),
    lectureCopyBtn: $('lectureCopyBtn'),
    toggleMaskBtn: $('toggleMaskBtn'),
    maskIcon: $('maskIcon'),
    toggleMaskRightBtn: $('toggleMaskRightBtn'),
    toggleNotesHeaderBtn: $('toggleNotesHeaderBtn'),

    // Notes & Tips Companion
    personalNotesSection: $('personalNotesSection'),
    personalNotesToggle: $('personalNotesToggle'),
    personalNotesArea: $('personalNotesArea'),
    personalNotesInput: $('personalNotesInput'),
    notesToggleStateLabel: $('notesToggleStateLabel'),
    notesContentSelect: $('notesContentSelect'),
    notesContentViewport: $('notesContentViewport'),
    notesCopyContentBtn: $('notesCopyContentBtn'),
    notesSaveStatus: $('notesSaveStatus'),
    notesIndicatorBadge: $('notesIndicatorBadge'),

    // Presenter
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

    // Search
    searchModal: $('searchModal'),
    openSearchBtn: $('openSearchBtn'),
    closeSearchModalBtn: $('closeSearchModalBtn'),
    globalSearchInput: $('globalSearchInput'),
    searchResultsList: $('searchResultsList'),
    searchResultSummary: $('searchResultSummary'),

    // Toolkit
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

    // Reading Settings Modal
    readingSettingsModal: $('readingSettingsModal'),
    closeReadingSettingsBtn: $('closeReadingSettingsBtn'),
    applySettingsCloseBtn: $('applySettingsCloseBtn'),
    resetSettingsBtn: $('resetSettingsBtn'),
    fontSizeSlider: $('fontSizeSlider'),
    fontSizeDisplay: $('fontSizeDisplay'),
    fontSizeButtons: document.querySelectorAll('.font-size-btn[data-size]'),
    lineHeightButtons: document.querySelectorAll('.line-height-btn[data-lh]'),
    fontFamilyButtons: document.querySelectorAll('.font-family-btn[data-ff]'),
    themeSelectButtons: document.querySelectorAll('.theme-select-btn[data-thm]'),
    readingPreviewCard: $('readingPreviewCard'),
    previewText: $('previewText'),

    // Toast
    toastNotice: $('toastNotice'),

    // Memory Cards (經文記憶卡 01-12)
    openMemoryCardsBtn: $('openMemoryCardsBtn'),
    memoryCardsModal: $('memoryCardsModal'),
    closeMemoryCardsBtn: $('closeMemoryCardsBtn'),
    memoryMasteredBadge: $('memoryMasteredBadge'),
    memoryCardNavPills: $('memoryCardNavPills'),
    memoryLessonLabel: $('memoryLessonLabel'),
    memoryToggleMaskBtn: $('memoryToggleMaskBtn'),
    memoryMaskBtnText: $('memoryMaskBtnText'),
    memoryAudioBtn: $('memoryAudioBtn'),
    memoryAudioIcon: $('memoryAudioIcon'),
    memoryAudioText: $('memoryAudioText'),
    memoryShuffleBtn: $('memoryShuffleBtn'),
    flashcardScene: $('flashcardScene'),
    flashcardElement: $('flashcardElement'),
    cardFrontWeekBadge: $('cardFrontWeekBadge'),
    cardFrontCitation: $('cardFrontCitation'),
    cardFrontTopic: $('cardFrontTopic'),
    cardFrontTags: $('cardFrontTags'),
    cardBackCitation: $('cardBackCitation'),
    cardBackScripture: $('cardBackScripture'),
    cardBackInsightBox: $('cardBackInsightBox'),
    cardBackInsight: $('cardBackInsight'),
    cardCopyBtn: $('cardCopyBtn'),
    cardJumpLessonBtn: $('cardJumpLessonBtn'),
    memoryPrevCardBtn: $('memoryPrevCardBtn'),
    memoryNextCardBtn: $('memoryNextCardBtn'),
    memoryToggleMasteredBtn: $('memoryToggleMasteredBtn'),
    memoryMasteredIcon: $('memoryMasteredIcon'),
    memoryMasteredText: $('memoryMasteredText'),
    memoryFlipActionBtn: $('memoryFlipActionBtn'),
    toolTabScriptures: $('toolTabScriptures'),
    scripturesToolContent: $('scripturesToolContent'),
    toolkitMemoryGrid: $('toolkitMemoryGrid'),
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
    applyReadingSettings(false);
    setMobileView(state.mobileView, false);
    bindEvents();
    initInteractiveChecklists();
    renderLessonList();
    updateMemoryMasteryBadge();
    renderToolkitMemoryGrid();
    routeFromHash();
    window.addEventListener('hashchange', routeFromHash);
    initScrollProgressBar();
  }

  // ─────────────────────────────────────────────
  //  URL HASH ROUTING (P1-5)
  // ─────────────────────────────────────────────
  function routeFromHash() {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      if (hash.startsWith('memory')) {
        const parts = hash.split('/');
        const memIdx = parts[1] ? (parseInt(parts[1], 10) - 1) : 0;
        openMemoryCards(memIdx);
        return;
      }
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
  //  THEME ENGINE (4 Comfort Themes)
  // ─────────────────────────────────────────────
  function applyTheme(save = true) {
    if (state.themeIndex < 0 || state.themeIndex >= THEMES.length) state.themeIndex = 0;
    const theme = THEMES[state.themeIndex];
    DOM.html.setAttribute('data-theme', theme);
    if (DOM.themeIcon) DOM.themeIcon.className = `fa-solid ${THEME_ICONS[theme] || 'fa-sun'}`;
    if (DOM.themeToggleBtn) {
      DOM.themeToggleBtn.setAttribute('aria-label', `目前主題：${THEME_NAMES[theme]}，點擊切換下一主題`);
      DOM.themeToggleBtn.setAttribute('title', `主題：${THEME_NAMES[theme]} (點擊切換)`);
    }
    if (DOM.themeSelectButtons) {
      DOM.themeSelectButtons.forEach(btn => {
        const isActive = btn.dataset.thm === theme;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
      });
    }
    if (save) safeStorage('set', 'blesseq_theme', theme);
  }

  function setThemeByName(themeName, save = true) {
    const idx = THEMES.indexOf(themeName);
    if (idx !== -1) {
      state.themeIndex = idx;
      applyTheme(save);
      showToast(`已切換至「${THEME_NAMES[themeName]}」主題`, 'fa-palette');
    }
  }

  function cycleTheme() {
    state.themeIndex = (state.themeIndex + 1) % THEMES.length;
    applyTheme();
    showToast(`已切換至「${THEME_NAMES[THEMES[state.themeIndex]]}」`, 'fa-palette');
  }

  // ─────────────────────────────────────────────
  //  READING TYPOGRAPHY ENGINE (Adjustable Size & Spacing)
  // ─────────────────────────────────────────────
  function applyReadingSettings(save = true) {
    if (state.fontSize < 14) state.fontSize = 14;
    if (state.fontSize > 26) state.fontSize = 26;

    DOM.html.style.setProperty('--reading-font-size', `${state.fontSize}px`);
    DOM.html.style.setProperty('--reading-line-height', String(state.lineHeight));
    DOM.html.style.setProperty(
      '--reading-font-family',
      state.fontFamily === 'serif' ? 'var(--font-serif)' : 'var(--font-sans)'
    );

    if (DOM.fontSizeSlider) DOM.fontSizeSlider.value = state.fontSize;
    if (DOM.fontSizeDisplay) {
      const label = FONT_SIZE_LABELS[state.fontSize] || `${state.fontSize}px`;
      DOM.fontSizeDisplay.textContent = label;
    }
    if (DOM.fontSizeButtons) {
      DOM.fontSizeButtons.forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.size, 10) === state.fontSize);
      });
    }
    if (DOM.lineHeightButtons) {
      DOM.lineHeightButtons.forEach(btn => {
        btn.classList.toggle('active', Math.abs(parseFloat(btn.dataset.lh) - state.lineHeight) < 0.05);
      });
    }
    if (DOM.fontFamilyButtons) {
      DOM.fontFamilyButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.ff === state.fontFamily);
      });
    }
    if (DOM.previewText) {
      DOM.previewText.style.fontSize = `${state.fontSize}px`;
      DOM.previewText.style.lineHeight = String(state.lineHeight);
      DOM.previewText.style.fontFamily = state.fontFamily === 'serif' ? 'var(--font-serif)' : 'var(--font-sans)';
    }

    if (save) {
      safeStorage('set', 'blesseq_font_size', String(state.fontSize));
      safeStorage('set', 'blesseq_line_height', String(state.lineHeight));
      safeStorage('set', 'blesseq_font_family', state.fontFamily);
    }
  }

  function openReadingSettings() {
    state.isSettingsOpen = true;
    if (DOM.readingSettingsModal) {
      DOM.readingSettingsModal.style.display = 'flex';
      applyReadingSettings(false);
      applyTheme(false);
    }
  }

  function closeReadingSettings() {
    state.isSettingsOpen = false;
    if (DOM.readingSettingsModal) {
      DOM.readingSettingsModal.style.display = 'none';
    }
  }

  // ─────────────────────────────────────────────
  //  MOBILE DRAWER ENGINE (Responsive Offcanvas)
  // ─────────────────────────────────────────────
  function openMobileDrawer() {
    state.isDrawerOpen = true;
    if (DOM.sidebarCurriculum) DOM.sidebarCurriculum.classList.add('drawer-open');
    if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.classList.add('active');
    if (DOM.mobileMenuBtn) DOM.mobileMenuBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileDrawer() {
    state.isDrawerOpen = false;
    if (DOM.sidebarCurriculum) DOM.sidebarCurriculum.classList.remove('drawer-open');
    if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.classList.remove('active');
    if (DOM.mobileMenuBtn) DOM.mobileMenuBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function toggleMobileDrawer() {
    if (state.isDrawerOpen) closeMobileDrawer();
    else openMobileDrawer();
  }

  // ─────────────────────────────────────────────
  //  MOBILE VIEW SWITCHER (Lecture / Slides / Dual)
  // ─────────────────────────────────────────────
  function setMobileView(viewMode, save = true) {
    if (!['lecture', 'slides', 'dual'].includes(viewMode)) viewMode = 'lecture';
    state.mobileView = viewMode;
    if (DOM.appLayout) DOM.appLayout.setAttribute('data-mobile-view', viewMode);

    if (DOM.viewSwitchBtns) {
      DOM.viewSwitchBtns.forEach(btn => {
        const isActive = btn.dataset.view === viewMode;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
    }

    if (DOM.dockLectureBtn) DOM.dockLectureBtn.classList.toggle('active', viewMode === 'lecture');
    if (DOM.dockSlideBtn) DOM.dockSlideBtn.classList.toggle('active', viewMode === 'slides');

    if (save) safeStorage('set', 'blesseq_mobile_view', viewMode);
  }

  // ─────────────────────────────────────────────
  //  TOAST & READING PROGRESS
  // ─────────────────────────────────────────────
  function showToast(message, icon = 'fa-check') {
    if (!DOM.toastNotice) return;
    DOM.toastNotice.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
    DOM.toastNotice.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => {
      DOM.toastNotice.classList.remove('show');
    }, 2200);
  }

  function initScrollProgressBar() {
    const updateProgress = () => {
      if (!DOM.readingProgressBar) return;
      const isMobile = window.innerWidth <= 900;
      let pct = 0;
      if (isMobile) {
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (totalHeight > 0) pct = Math.round((window.scrollY / totalHeight) * 100);
      } else {
        const scroller = DOM.lectureScrollContent;
        if (scroller) {
          const totalHeight = scroller.scrollHeight - scroller.clientHeight;
          if (totalHeight > 0) pct = Math.round((scroller.scrollTop / totalHeight) * 100);
        }
      }
      pct = Math.max(0, Math.min(100, pct));
      DOM.readingProgressBar.style.width = `${pct}%`;
      DOM.readingProgressBar.setAttribute('aria-valuenow', String(pct));
    };

    window.addEventListener('scroll', updateProgress, { passive: true });
    if (DOM.lectureScrollContent) {
      DOM.lectureScrollContent.addEventListener('scroll', updateProgress, { passive: true });
    }
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

    closeMobileDrawer();
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
    if (state.isNotesOpen) {
      renderNotesContent(state.activeNotesTab || 'prompts');
    }
  }

  // ─────────────────────────────────────────────
  //  BANNER
  // ─────────────────────────────────────────────
  function renderBanner(lesson) {
    const catLabels = { overview: '門訓總攬', core: '門徒成長必修', practical: '幸福小組實作秘笈', special: '信仰專題' };
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

    // Sync active slide notes if notes panel is open and viewing slide notes
    if (state.isNotesOpen && state.activeNotesTab === 'slideNotes') {
      renderNotesContent('slideNotes');
    }
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
    if (!slide || !slide.title || !DOM.lectureScrollContent) return;
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
      const parentRect = DOM.lectureScrollContent.getBoundingClientRect();
      const targetRect = bestMatch.getBoundingClientRect();
      const relativeTop = targetRect.top - parentRect.top + DOM.lectureScrollContent.scrollTop;
      DOM.lectureScrollContent.scrollTo({ top: Math.max(0, relativeTop - 16), behavior: 'smooth' });
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
        const pillTitle = sec.title.length > 12 ? sec.title.slice(0, 11) + '…' : sec.title;
        pill.innerHTML = `<i class="fa-solid fa-bookmark text-gold" style="font-size:0.7em;"></i> <span>${escapeHtml(sec.num)}. ${escapeHtml(pillTitle)}</span>`;
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

      // P3: Supplementary Nav Pill
      if (lesson.supplementary) {
        const suppPill = document.createElement('button');
        suppPill.className = 'section-nav-pill supplement-pill';
        suppPill.setAttribute('role', 'tab');
        suppPill.setAttribute('aria-selected', 'false');
        suppPill.id = 'nav-pill-supplement';
        suppPill.title = '福氣教會與台灣主要教會實戰補充資料';
        suppPill.innerHTML = `<i class="fa-solid fa-church text-gold" style="font-size:0.75em;"></i> <span>實戰補充</span>`;
        suppPill.addEventListener('click', () => {
          DOM.sectionNavPills.querySelectorAll('.section-nav-pill').forEach(p => {
            p.classList.remove('active');
            p.setAttribute('aria-selected', 'false');
          });
          suppPill.classList.add('active');
          suppPill.setAttribute('aria-selected', 'true');
          const card = $('card-church-supplement');
          if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        DOM.sectionNavPills.appendChild(suppPill);
      }
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
          li.innerHTML = formatLectureParagraph(p, lesson, sec);
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

    // Render Church Supplementary Card (福氣教會與台灣主要教會實戰補充)
    if (lesson.supplementary) {
      renderChurchSupplementaryCard(lesson, DOM.lectureScrollContent);
    }

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
  //  CHURCH SUPPLEMENTARY CARD (福氣教會與台灣主要教會實戰補充)
  // ─────────────────────────────────────────────
  function renderChurchSupplementaryCard(lesson, container) {
    const supp = lesson.supplementary;
    if (!supp) return;

    const card = document.createElement('article');
    card.className = 'church-supplement-card';
    card.id = 'card-church-supplement';
    card.dataset.sectionTitle = '實戰補充';

    let insightsHtml = '';
    if (supp.blessingChurch && supp.blessingChurch.coreInsights) {
      insightsHtml = supp.blessingChurch.coreInsights.map((ci, idx) => `
        <div class="supplement-insight-item">
          <div class="insight-heading">
            <span class="insight-number">${idx + 1}</span>
            <strong>${escapeHtml(ci.heading)}</strong>
          </div>
          <p class="insight-detail">${escapeHtml(ci.detail)}</p>
        </div>
      `).join('');
    }

    let churchesHtml = '';
    if (supp.taiwanChurches && supp.taiwanChurches.length > 0) {
      churchesHtml = supp.taiwanChurches.map(tc => `
        <div class="church-case-item">
          <div class="case-header">
            <div class="case-church-name">
              <i class="fa-solid fa-cross text-gold"></i>
              <strong>${escapeHtml(tc.churchName)}</strong>
              ${tc.pastorOrLeader ? `<span class="case-pastor">（${escapeHtml(tc.pastorOrLeader)}）</span>` : ''}
            </div>
            <span class="case-model-badge">${escapeHtml(tc.modelName)}</span>
          </div>
          <p class="case-experience">${escapeHtml(tc.practicalExperience)}</p>
        </div>
      `).join('');
    }

    let tacticsHtml = '';
    if (supp.pastoralTactics && supp.pastoralTactics.length > 0) {
      tacticsHtml = supp.pastoralTactics.map(pt => `
        <div class="tactic-callout">
          <div class="tactic-challenge">
            <i class="fa-solid fa-triangle-exclamation text-crimson"></i>
            <div>
              <strong>前線常見盲點與挫折：</strong>
              <span>${escapeHtml(pt.challenge)}</span>
            </div>
          </div>
          <div class="tactic-solution">
            <i class="fa-solid fa-lightbulb text-gold"></i>
            <div>
              <strong>福氣教會實戰破解之道：</strong>
              <span>${escapeHtml(pt.solution)}</span>
            </div>
          </div>
        </div>
      `).join('');
    }

    let checklistHtml = '';
    if (supp.actionChecklist && supp.actionChecklist.length > 0) {
      checklistHtml = `
        <div class="supplement-checklist-block">
          <h5 class="sub-block-title"><i class="fa-solid fa-list-check text-gold"></i> 本課福長與同工實戰行動檢核</h5>
          <ul class="supplement-checklist">
            ${supp.actionChecklist.map(ac => `
              <li class="checklist-item">
                <i class="fa-regular fa-square-check text-gold"></i>
                <span>${escapeHtml(ac)}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    let prayerHtml = '';
    if (supp.commissioningPrayer) {
      prayerHtml = `
        <div class="commissioning-prayer-card">
          <div class="prayer-header">
            <h5><i class="fa-solid fa-hands-praying text-gold"></i> 本課同工差遣與得勝宣告禱文</h5>
            <button class="btn-secondary prayer-copy-btn" id="btnCopyPrayer" type="button" title="複製禱詞至剪貼簿">
              <i class="fa-regular fa-copy"></i> <span class="btn-text">複製禱詞</span>
            </button>
          </div>
          <blockquote class="prayer-text" id="prayerTextContent">
            「${escapeHtml(supp.commissioningPrayer)}」
          </blockquote>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="supplement-ribbon">
        <i class="fa-solid fa-church"></i> 福氣教會與台灣主要教會 · 實戰補充寶庫
      </div>
      <div class="supplement-header">
        <div class="supplement-badge-group">
          <span class="supplement-badge">牧會前線實務</span>
          <span class="supplement-badge-accent">幸福小組現場心法</span>
        </div>
        <h4 class="supplement-theme-title">${escapeHtml(supp.themeTitle || lesson.title)}</h4>
      </div>

      ${supp.blessingChurch && supp.blessingChurch.pastorQuote ? `
        <div class="supplement-hero-quote">
          <i class="fa-solid fa-quote-left quote-watermark"></i>
          <p class="hero-quote-text">${escapeHtml(supp.blessingChurch.pastorQuote)}</p>
          <div class="hero-quote-source">
            <i class="fa-solid fa-bookmark text-gold"></i>
            <span>${escapeHtml(supp.blessingChurch.quoteSource || '高雄福氣教會 楊錫儒主任牧師')}</span>
          </div>
        </div>
      ` : ''}

      ${insightsHtml ? `
        <div class="supplement-sub-block">
          <h5 class="sub-block-title"><i class="fa-solid fa-fire text-gold"></i> 福氣教會現場實戰心法提要</h5>
          <div class="supplement-insights-grid">${insightsHtml}</div>
        </div>
      ` : ''}

      ${churchesHtml ? `
        <div class="supplement-sub-block">
          <h5 class="sub-block-title"><i class="fa-solid fa-people-roof text-gold"></i> 台灣主要教會落地實踐與跨堂會經驗</h5>
          <div class="church-case-grid">${churchesHtml}</div>
        </div>
      ` : ''}

      ${tacticsHtml ? `
        <div class="supplement-sub-block">
          <h5 class="sub-block-title"><i class="fa-solid fa-shield-halved text-gold"></i> 福長同工前線眉角與盲點拆彈</h5>
          <div class="tactics-list">${tacticsHtml}</div>
        </div>
      ` : ''}

      ${checklistHtml}
      ${prayerHtml}
    `;

    container.appendChild(card);

    // Bind copy prayer button
    const copyBtn = card.querySelector('#btnCopyPrayer');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const textToCopy = supp.commissioningPrayer;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(textToCopy).then(() => {
            copyBtn.innerHTML = '<i class="fa-solid fa-check text-gold"></i> <span class="btn-text">已複製</span>';
            setTimeout(() => {
              copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> <span class="btn-text">複製禱詞</span>';
            }, 2000);
          }).catch(() => {
            copyBtn.innerHTML = '<i class="fa-solid fa-check text-gold"></i> <span class="btn-text">已複製</span>';
          });
        } else {
          // Fallback
          const ta = document.createElement('textarea');
          ta.value = textToCopy;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          copyBtn.innerHTML = '<i class="fa-solid fa-check text-gold"></i> <span class="btn-text">已複製</span>';
          setTimeout(() => {
            copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> <span class="btn-text">複製禱詞</span>';
          }, 2000);
        }
      });
    }
  }

  // ─────────────────────────────────────────────
  //  FILL-IN-BLANKS ENGINE (P1-3: data-driven)
  // ─────────────────────────────────────────────
  function formatLectureParagraph(text, lesson, sec) {
    if (!text) return '';

    // Clean control characters
    let cleaned = text
      .replace(/門徒學校\(下\)[\s\S]*?\d+/g, '')
      .replace(/幸福小組實作秘笈[\s\S]*?\d+/g, '')
      .replace(/[\r\t]+/g, ' ')
      .replace(/\n\s*\n/g, '<br><br>')
      .replace(/\n/g, '<br>');

    // Priority 1: Data-driven keyBlanks from curated curriculum section
    const blanks = (sec && Array.isArray(sec.keyBlanks)) ? [...sec.keyBlanks] : [];

    // Support explicit markers 【填空：xxx】 or {{xxx}}
    cleaned = cleaned.replace(/【填空：([^】]+)】/g, (m, p1) => {
      if (!blanks.includes(p1)) blanks.push(p1);
      return p1;
    });
    cleaned = cleaned.replace(/\{\{([^}]+)\}\}/g, (m, p1) => {
      if (!blanks.includes(p1)) blanks.push(p1);
      return p1;
    });

    if (blanks.length > 0) {
      // Deduplicate and sort by length descending to match longer phrases first
      const uniqueBlanks = Array.from(new Set(blanks)).filter(b => typeof b === 'string' && b.trim().length > 0);
      uniqueBlanks.sort((a, b) => b.length - a.length);

      const tokens = [];
      uniqueBlanks.forEach((blank, idx) => {
        const trimmed = blank.trim();
        const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        try {
          const re = new RegExp(escaped, 'g');
          if (re.test(cleaned)) {
            const token = `__BLESS_BLANK_${idx}__`;
            tokens.push({ token, blank: trimmed });
            cleaned = cleaned.replace(re, token);
          }
        } catch (e) { /* ignore regex error */ }
      });

      // Substitute tokens with HTML blank spans
      tokens.forEach(({ token, blank }) => {
        cleaned = cleaned.split(token).join(createBlankSpan(blank));
      });
    }

    // Direct blank markers in PDF text (various forms)
    cleaned = cleaned.replace(/_{3,}/g, () => createBlankSpan('　　　'));
    cleaned = cleaned.replace(/\u3000{2,}/g, () => createBlankSpan('　　　'));

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
      if (!state.isMasked) {
        b.classList.remove('revealed');
      }
      b.onclick = function (e) {
        e.stopPropagation();
        if (this.classList.contains('masked')) {
          this.classList.remove('masked');
          this.classList.add('revealed');
        } else {
          this.classList.add('masked');
          this.classList.remove('revealed');
        }
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

      // Search Supplementary materials (福氣教會與台灣主要教會實戰補充)
      if (lesson.supplementary) {
        const supp = lesson.supplementary;
        const suppParts = [
          supp.themeTitle || '',
          supp.blessingChurch ? (supp.blessingChurch.pastorQuote || '') : '',
          supp.blessingChurch ? (supp.blessingChurch.quoteSource || '') : '',
          supp.blessingChurch ? (supp.blessingChurch.coreInsights || []).map(ci => ci.heading + ' ' + ci.detail).join(' ') : '',
          (supp.taiwanChurches || []).map(tc => tc.churchName + ' ' + (tc.pastorOrLeader || '') + ' ' + tc.modelName + ' ' + tc.practicalExperience).join(' '),
          (supp.pastoralTactics || []).map(pt => pt.challenge + ' ' + pt.solution).join(' '),
          (supp.actionChecklist || []).join(' '),
          supp.commissioningPrayer || ''
        ];
        const suppText = suppParts.join(' ');

        re.lastIndex = 0;
        const suppIdx = suppText.search(re);
        if (suppIdx !== -1) {
          const snippet = suppText.slice(Math.max(0, suppIdx - 20), suppIdx + 110);
          hits.push({
            type: 'supplement',
            lesson,
            title: `實戰補充 · ${supp.themeTitle || lesson.title}`,
            snippet,
            slideIdx: 1,
            targetCardId: 'card-church-supplement'
          });
        }
        re.lastIndex = 0;
      }
    });

    // Deduplicate by lessonId+slideIdx+type
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
      const typeLabel = h.type === 'lesson' ? '課程' : h.type === 'slide' ? '投影片' : h.type === 'supplement' ? '實戰補充' : '講義';

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
        if (h.targetCardId) {
          setTimeout(() => {
            const card = $(h.targetCardId);
            if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 180);
        }
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
  //  PERSONAL NOTES & COMPANION TIPS (V8 UI Overhaul)
  // ─────────────────────────────────────────────
  function togglePersonalNotes(forceOpen) {
    if (typeof forceOpen === 'boolean') {
      state.isNotesOpen = forceOpen;
    } else {
      state.isNotesOpen = !state.isNotesOpen;
    }

    if (DOM.personalNotesToggle) {
      DOM.personalNotesToggle.setAttribute('aria-expanded', state.isNotesOpen ? 'true' : 'false');
    }
    if (DOM.notesToggleStateLabel) {
      DOM.notesToggleStateLabel.textContent = state.isNotesOpen ? '收合隱藏' : '展開瀏覽';
    }
    if (DOM.personalNotesArea) {
      DOM.personalNotesArea.hidden = !state.isNotesOpen;
    }
    if (DOM.toggleNotesHeaderBtn) {
      DOM.toggleNotesHeaderBtn.classList.toggle('active', state.isNotesOpen);
      DOM.toggleNotesHeaderBtn.setAttribute('aria-pressed', state.isNotesOpen ? 'true' : 'false');
    }

    if (state.isNotesOpen) {
      const activeTab = DOM.notesContentSelect ? DOM.notesContentSelect.value : (state.activeNotesTab || 'prompts');
      renderNotesContent(activeTab || 'prompts');
    }
  }

  function showNotesAutoSaveNotice() {
    if (!DOM.notesSaveStatus) return;
    DOM.notesSaveStatus.style.display = 'inline-flex';
    clearTimeout(state.notesSaveTimer);
    state.notesSaveTimer = setTimeout(() => {
      if (DOM.notesSaveStatus) DOM.notesSaveStatus.style.display = 'none';
    }, 2000);
  }

  function renderNotesContent(type = 'prompts') {
    if (!DOM.notesContentViewport) return;
    state.activeNotesTab = type;
    const lesson = state.lessons.find(l => l.id === state.activeLessonId);
    if (!lesson) return;

    if (DOM.notesContentSelect && DOM.notesContentSelect.value !== type) {
      DOM.notesContentSelect.value = type;
    }

    if (type === 'prompts') {
      // 💡 課後反思與實作操練指引
      const prompts = (lesson.reflection && lesson.reflection.length)
        ? lesson.reflection
        : [
            '默想本課核心經文與關鍵字句，哪一處觀念最觸動您此時此刻的心境？',
            '在實際服事、職場生活或人際關係中，本課信息如何指引具體的突破方向？',
            '為幸福小組同工與最佳福音對象彼此代禱，並寫下本週具體的實踐行動清單。'
          ];
      DOM.notesContentViewport.innerHTML = `
        <div class="notes-prompts-wrapper">
          <div class="notes-section-tag"><i class="fa-solid fa-comments text-gold" aria-hidden="true"></i> 課後深思與實作操練指引</div>
          <ul class="notes-prompts-list">
            ${prompts.map(p => `
              <li class="notes-prompt-item">
                <i class="fa-solid fa-circle-dot" aria-hidden="true"></i>
                <span>${escapeHtml(p)}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    } else if (type === 'slideNotes') {
      // 📌 當前投影片備忘與重點提要
      const slideIdx = state.activeSlideIndex;
      const slide = lesson.slides ? lesson.slides[slideIdx - 1] : null;
      if (!slide) {
        DOM.notesContentViewport.innerHTML = `<p class="notes-empty">本頁尚無投影片資訊。</p>`;
        return;
      }
      const title = slide.title || `第 ${slideIdx} 張投影片`;
      const notes = (slide.notes && slide.notes.trim()) ? slide.notes.trim() : '此頁講員未特別設定備忘文字，請參考上方投影片核心要點。';
      const bullets = (slide.textLines || []).filter(l => l.trim().length > 0 && l.trim() !== (slide.title || '').trim());

      DOM.notesContentViewport.innerHTML = `
        <div class="notes-slide-card">
          <div class="notes-slide-header">
            <span class="notes-slide-title">
              <i class="fa-regular fa-image text-gold" aria-hidden="true"></i>
              投影片 ${slideIdx} / ${lesson.slideCount} · ${escapeHtml(title)}
            </span>
            <div class="notes-slide-nav">
              <button class="btn-secondary stepper-btn" id="notesSlidePrevBtn" type="button" title="上一張投影片備忘" ${slideIdx <= 1 ? 'disabled' : ''}>
                <i class="fa-solid fa-chevron-left"></i> 上一張
              </button>
              <button class="btn-secondary stepper-btn" id="notesSlideNextBtn" type="button" title="下一張投影片備忘" ${slideIdx >= lesson.slideCount ? 'disabled' : ''}>
                下一張 <i class="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
          ${slide.notes ? `
            <div class="notes-speaker-box">
              <strong><i class="fa-regular fa-comment-dots text-gold" aria-hidden="true"></i> 講員備忘筆記：</strong>
              <p>${escapeHtml(notes)}</p>
            </div>
          ` : ''}
          ${bullets.length > 0 ? `
            <div class="notes-bullets-box">
              <strong><i class="fa-solid fa-list-ul text-gold" aria-hidden="true"></i> 重點提要：</strong>
              <ul class="notes-bullet-list">
                ${bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `;

      const prevBtn = document.getElementById('notesSlidePrevBtn');
      const nextBtn = document.getElementById('notesSlideNextBtn');
      if (prevBtn) prevBtn.addEventListener('click', () => setSlide(slideIdx - 1, 'prev'));
      if (nextBtn) nextBtn.addEventListener('click', () => setSlide(slideIdx + 1, 'next'));

    } else if (type === 'keyVerses') {
      // 📜 本課核心經文金句速查
      const verses = lesson.keyVerses || [];
      if (verses.length === 0) {
        DOM.notesContentViewport.innerHTML = `<p class="notes-empty">本課講義內文已融入聖言真理，無獨立索引經文。</p>`;
        return;
      }
      DOM.notesContentViewport.innerHTML = `
        <div class="notes-verses-wrapper">
          <div class="notes-section-tag"><i class="fa-solid fa-book-bible text-gold" aria-hidden="true"></i> 本課精選核心聖經經文 (${verses.length} 處)</div>
          <div class="notes-verses-grid">
            ${verses.map(v => `
              <div class="notes-verse-card">
                <i class="fa-solid fa-bookmark text-gold" aria-hidden="true"></i>
                <span class="notes-verse-text">${escapeHtml(v)}</span>
                <button class="notes-verse-copy-btn btn-icon-sm" data-verse="${escapeHtml(v)}" type="button" title="複製此節經文">
                  <i class="fa-regular fa-copy"></i>
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      DOM.notesContentViewport.querySelectorAll('.notes-verse-copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          safeCopy(btn.dataset.verse, '經文已成功複製到剪貼簿！');
        });
      });

    } else if (type === 'myNotes') {
      // 📝 我的個人研經反思筆記
      const key = `blesseq_note_${lesson.id}`;
      const saved = safeStorage('get', key) || '';
      DOM.notesContentViewport.innerHTML = `
        <div class="notes-editor-wrapper">
          <div class="notes-editor-header">
            <span class="notes-editor-hint"><i class="fa-solid fa-pen-nib text-gold" aria-hidden="true"></i> 記錄您在「${escapeHtml(lesson.title)}」的領受、反思或代禱事項 (自動同步存檔)：</span>
            <span class="notes-char-count" id="notesCharCount">${saved.length} 字</span>
          </div>
          <textarea id="personalNotesInput"
                    class="notes-textarea"
                    aria-label="個人反思筆記輸入框，內容自動儲存"
                    placeholder="在此記錄您對本課的反思、禱告事項或行動計劃... (自動儲存)">${escapeHtml(saved)}</textarea>
          <div class="notes-editor-footer">
            <button class="btn-secondary stepper-btn" id="notesClearBtn" type="button" title="清空本課筆記">
              <i class="fa-regular fa-trash-can"></i> 清除
            </button>
            <span class="notes-autosave-tip"><i class="fa-solid fa-shield-halved text-gold"></i> 自動安全儲存於您的瀏覽器本地快取</span>
          </div>
        </div>
      `;

      const input = document.getElementById('personalNotesInput');
      const count = document.getElementById('notesCharCount');
      const clearBtn = document.getElementById('notesClearBtn');
      if (input) {
        input.addEventListener('input', () => {
          safeStorage('set', key, input.value);
          if (count) count.textContent = `${input.value.length} 字`;
          showNotesAutoSaveNotice();
        });
      }
      if (clearBtn && input) {
        clearBtn.addEventListener('click', () => {
          if (confirm('確定要清空本課的個人筆記紀錄嗎？')) {
            input.value = '';
            safeStorage('set', key, '');
            if (count) count.textContent = '0 字';
            showToast('個人筆記已清空');
          }
        });
      }
    } else if (type === 'memoryCards') {
      // 🎴 門徒學校（下）12週 主題經文記憶卡速覽與研讀
      const verses = window.BLESS_EQ_MEMORY_VERSES || [];
      const currentWeekIdx = parseInt(lesson.id, 10) - 1;
      const currentVerse = (currentWeekIdx >= 0 && currentWeekIdx < verses.length) ? verses[currentWeekIdx] : verses[0];
      const isMastered = currentVerse ? state.masteredVerses.has(currentVerse.id) : false;

      DOM.notesContentViewport.innerHTML = `
        <div class="notes-memory-wrapper">
          <div class="notes-section-tag">
            <i class="fa-solid fa-layer-group text-gold" aria-hidden="true"></i> 
            門徒學校（下）12週 主題經文記憶卡 (熟記進度：${state.masteredVerses.size} / 12)
          </div>
          ${currentVerse ? `
            <div class="notes-memory-highlight-card" style="background:var(--bg-surface);border:1px solid var(--gold-border);border-radius:var(--radius-md);padding:1.1rem;margin-top:0.6rem;box-shadow:var(--shadow-sm);">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;">
                <span class="card-week-badge">第 ${currentVerse.id} 週 · 主題經文</span>
                <span class="brand-badge ${isMastered ? 'text-olive' : 'text-gold'}" style="font-size:0.75rem;">
                  <i class="fa-${isMastered ? 'solid fa-check' : 'regular fa-circle'}"></i> 
                  ${isMastered ? '已熟記' : '未熟記'}
                </span>
              </div>
              <h4 style="margin:0.6rem 0 0.2rem;font-family:var(--font-serif);color:var(--gold-primary);font-size:1.2rem;">
                ${escapeHtml(currentVerse.citation)}
              </h4>
              <p style="margin:0 0 0.6rem;font-size:0.92rem;color:var(--text-secondary);font-weight:600;">
                ${escapeHtml(currentVerse.lessonTitle)}
              </p>
              <blockquote class="card-scripture-quote" style="margin:0.6rem 0;font-size:1.1rem;line-height:1.75;">
                ${escapeHtml(currentVerse.text)}
              </blockquote>
              <div class="card-insight-box" style="margin-top:0.5rem;font-size:0.88rem;">
                <strong><i class="fa-solid fa-lightbulb text-gold"></i> 核心心法：</strong>
                ${escapeHtml(currentVerse.insight)}
              </div>
              <div style="display:flex;gap:0.5rem;margin-top:0.85rem;justify-content:flex-end;">
                <button class="btn-primary stepper-btn" id="notesOpenFlashcardBtn" type="button" style="flex:none;padding:0.45rem 1rem;">
                  <i class="fa-solid fa-rotate"></i> 開啟 3D 翻轉記憶卡
                </button>
              </div>
            </div>
          ` : '<p class="notes-empty">本總覽課程無獨立週次記憶卡，請點擊下方瀏覽全部 12 週主題經文。</p>'}
          <div style="margin-top:1.1rem;display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:0.86rem;font-weight:700;color:var(--text-secondary);"><i class="fa-solid fa-list-check text-gold"></i> 全套 12 週主題經文一覽：</span>
            <button class="btn-secondary stepper-btn" id="notesOpenAllFlashcardsBtn" type="button" style="flex:none;font-size:0.8rem;padding:0.35rem 0.75rem;">
              <i class="fa-solid fa-layer-group"></i> 記憶卡完整視窗
            </button>
          </div>
          <div class="toolkit-memory-cards-grid" style="margin-top:0.6rem;">
            ${verses.map((v, i) => `
              <div class="toolkit-memory-card-tile ${state.masteredVerses.has(v.id) ? 'is-mastered' : ''}" data-idx="${i}" role="button" tabindex="0">
                <div class="toolkit-tile-header">
                  <span class="toolkit-tile-week">第 ${v.id} 週</span>
                  ${state.masteredVerses.has(v.id) ? '<span class="brand-badge text-olive" style="font-size:0.72rem;"><i class="fa-solid fa-check"></i> 已熟記</span>' : ''}
                </div>
                <div class="toolkit-tile-citation">${escapeHtml(v.citation)}</div>
                <div class="toolkit-tile-snippet">${escapeHtml(v.text)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      const openBtn = document.getElementById('notesOpenFlashcardBtn');
      if (openBtn && currentVerse) {
        openBtn.addEventListener('click', () => openMemoryCards(currentWeekIdx >= 0 ? currentWeekIdx : 0));
      }
      const openAllBtn = document.getElementById('notesOpenAllFlashcardsBtn');
      if (openAllBtn) {
        openAllBtn.addEventListener('click', () => openMemoryCards(0));
      }
      DOM.notesContentViewport.querySelectorAll('.toolkit-memory-card-tile').forEach(tile => {
        tile.addEventListener('click', () => {
          const idx = parseInt(tile.dataset.idx, 10);
          openMemoryCards(idx);
        });
      });
    }
  }

  function restorePersonalNotes(lessonId) {
    if (state.isNotesOpen) {
      renderNotesContent(state.activeNotesTab || 'prompts');
    }
  }

  function savePersonalNote() {
    const input = document.getElementById('personalNotesInput');
    if (input) {
      const key = `blesseq_note_${state.activeLessonId}`;
      safeStorage('set', key, input.value);
      showNotesAutoSaveNotice();
    }
  }

  // ─────────────────────────────────────────────
  //  SCRIPTURE MEMORY CARDS CONTROLLER (01 - 12)
  //  3D Flip, Recitation Blanks Mode, Mastery Tracking
  // ─────────────────────────────────────────────
  function getMemoryVerses() {
    return window.BLESS_EQ_MEMORY_VERSES || [];
  }

  function openMemoryCards(targetIndex = null) {
    const verses = getMemoryVerses();
    if (!verses.length) {
      showToast('經文記憶卡資料載入中，請稍候');
      return;
    }

    if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex < verses.length) {
      state.activeMemoryIndex = targetIndex;
    } else {
      // Default to current lesson if 01-12, else maintain activeMemoryIndex or 0
      const currentLessonNum = parseInt(state.activeLessonId, 10);
      if (!isNaN(currentLessonNum) && currentLessonNum >= 1 && currentLessonNum <= verses.length) {
        state.activeMemoryIndex = currentLessonNum - 1;
      } else if (state.activeMemoryIndex < 0 || state.activeMemoryIndex >= verses.length) {
        state.activeMemoryIndex = 0;
      }
    }

    state.isMemoryCardsOpen = true;
    state.isCardFlipped = false;
    if (DOM.memoryCardsModal) {
      DOM.memoryCardsModal.style.display = 'flex';
      trapFocus(DOM.memoryCardsModal);
    }

    renderMemoryNavPills();
    renderMemoryCard(state.activeMemoryIndex);
    updateMemoryMasteryBadge();
  }

  function closeMemoryCards() {
    state.isMemoryCardsOpen = false;
    stopSpeakingVerse();
    if (DOM.memoryCardsModal) {
      DOM.memoryCardsModal.style.display = 'none';
      releaseFocus();
    }
    if (DOM.openMemoryCardsBtn) {
      DOM.openMemoryCardsBtn.focus();
    }
  }

  function renderMemoryNavPills() {
    if (!DOM.memoryCardNavPills) return;
    const verses = getMemoryVerses();
    DOM.memoryCardNavPills.innerHTML = verses.map((v, i) => {
      const isActive = i === state.activeMemoryIndex;
      const isMastered = state.masteredVerses.has(v.id);
      return `
        <button class="memory-pill-btn ${isActive ? 'active' : ''} ${isMastered ? 'is-mastered' : ''}"
                type="button"
                data-index="${i}"
                role="tab"
                aria-selected="${isActive ? 'true' : 'false'}"
                title="第 ${v.id} 週：${escapeHtml(v.lessonTitle)} (${escapeHtml(v.citation)})">
          第 ${v.id} 週
        </button>
      `;
    }).join('');

    DOM.memoryCardNavPills.querySelectorAll('.memory-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        state.isCardFlipped = false;
        renderMemoryCard(idx);
      });
    });
  }

  function renderMemoryCard(index) {
    const verses = getMemoryVerses();
    if (!verses.length) return;
    if (index < 0) index = 0;
    if (index >= verses.length) index = verses.length - 1;
    state.activeMemoryIndex = index;

    const verse = verses[index];
    const isMastered = state.masteredVerses.has(verse.id);

    // Update Nav Pills active states
    if (DOM.memoryCardNavPills) {
      const pills = DOM.memoryCardNavPills.querySelectorAll('.memory-pill-btn');
      pills.forEach((p, idx) => {
        const active = idx === index;
        p.classList.toggle('active', active);
        p.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      const activePill = pills[index];
      if (activePill && typeof activePill.scrollIntoView === 'function') {
        activePill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }

    // Header label
    if (DOM.memoryLessonLabel) {
      DOM.memoryLessonLabel.innerHTML = `第 ${verse.id} 週 · <strong>${escapeHtml(verse.lessonTitle)}</strong>`;
    }

    // Front Face
    if (DOM.cardFrontWeekBadge) {
      DOM.cardFrontWeekBadge.textContent = `第 ${verse.id} 週 · 主題經文`;
    }
    if (DOM.cardFrontCitation) {
      DOM.cardFrontCitation.textContent = verse.citation;
    }
    if (DOM.cardFrontTopic) {
      DOM.cardFrontTopic.textContent = verse.lessonTitle;
    }
    if (DOM.cardFrontTags) {
      DOM.cardFrontTags.innerHTML = (verse.tags || []).map(t => `<span class="card-tag"><i class="fa-solid fa-tag"></i> ${escapeHtml(t)}</span>`).join('');
    }

    // Back Face
    if (DOM.cardBackCitation) {
      DOM.cardBackCitation.textContent = verse.citation;
    }
    if (DOM.cardBackScripture) {
      if (state.isMemoryMasked) {
        const html = escapeHtml(verse.maskedText).replace(/【(.*?)】/g, (match, word) => {
          return `<span class="card-blank-word" data-word="${word}" role="button" tabindex="0" title="點擊顯示答案">${word}</span>`;
        });
        DOM.cardBackScripture.innerHTML = html;

        DOM.cardBackScripture.querySelectorAll('.card-blank-word').forEach(blank => {
          blank.addEventListener('click', e => {
            e.stopPropagation();
            blank.classList.toggle('revealed');
          });
          blank.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              blank.classList.toggle('revealed');
            }
          });
        });
      } else {
        DOM.cardBackScripture.textContent = verse.text;
      }
    }
    if (DOM.cardBackInsight) {
      DOM.cardBackInsight.textContent = verse.insight;
    }

    // Mastery Button
    if (DOM.memoryToggleMasteredBtn) {
      DOM.memoryToggleMasteredBtn.classList.toggle('is-mastered', isMastered);
    }
    if (DOM.memoryMasteredIcon) {
      DOM.memoryMasteredIcon.className = isMastered ? 'fa-solid fa-circle-check text-olive' : 'fa-regular fa-circle-check';
    }
    if (DOM.memoryMasteredText) {
      DOM.memoryMasteredText.textContent = isMastered ? '已熟記（點擊取消）' : '標記為已熟記';
    }

    // Flip UI Sync
    updateCardFlipUI();
  }

  function updateCardFlipUI() {
    if (DOM.flashcardElement) {
      DOM.flashcardElement.classList.toggle('is-flipped', state.isCardFlipped);
    }
    if (DOM.memoryFlipActionBtn) {
      DOM.memoryFlipActionBtn.innerHTML = state.isCardFlipped
        ? '<i class="fa-solid fa-rotate-left"></i> 翻回正面 (出處)'
        : '<i class="fa-solid fa-rotate"></i> 翻看經文 (空白鍵)';
    }
  }

  function flipMemoryCard() {
    state.isCardFlipped = !state.isCardFlipped;
    updateCardFlipUI();
  }

  function prevMemoryCard() {
    const verses = getMemoryVerses();
    if (!verses.length) return;
    let prev = state.activeMemoryIndex - 1;
    if (prev < 0) prev = verses.length - 1;
    state.isCardFlipped = false;
    renderMemoryCard(prev);
  }

  function nextMemoryCard() {
    const verses = getMemoryVerses();
    if (!verses.length) return;
    let next = state.activeMemoryIndex + 1;
    if (next >= verses.length) next = 0;
    state.isCardFlipped = false;
    renderMemoryCard(next);
  }

  function shuffleMemoryCard() {
    const verses = getMemoryVerses();
    if (verses.length <= 1) return;
    let r = Math.floor(Math.random() * verses.length);
    if (r === state.activeMemoryIndex) {
      r = (r + 1) % verses.length;
    }
    state.isCardFlipped = false;
    renderMemoryCard(r);
    showToast(`隨機抽考：第 ${verses[r].id} 週經文！`, 'fa-shuffle');
  }

  function toggleMemoryMask() {
    state.isMemoryMasked = !state.isMemoryMasked;
    if (DOM.memoryToggleMaskBtn) {
      DOM.memoryToggleMaskBtn.classList.toggle('active', state.isMemoryMasked);
    }
    if (DOM.memoryMaskBtnText) {
      DOM.memoryMaskBtnText.textContent = state.isMemoryMasked ? '顯示完整經文' : '挖空背誦模式';
    }
    if (state.isMemoryMasked && !state.isCardFlipped) {
      state.isCardFlipped = true;
    }
    renderMemoryCard(state.activeMemoryIndex);
    showToast(state.isMemoryMasked ? '已啟用填空挖空挑戰模式' : '已恢復完整經文顯示', 'fa-pen-clip');
  }

  function toggleCardMastered() {
    const verses = getMemoryVerses();
    const verse = verses[state.activeMemoryIndex];
    if (!verse) return;

    if (state.masteredVerses.has(verse.id)) {
      state.masteredVerses.delete(verse.id);
      showToast(`第 ${verse.id} 週經文已取消熟記標記`, 'fa-circle-info');
    } else {
      state.masteredVerses.add(verse.id);
      showToast(`🎉 第 ${verse.id} 週經文已成功熟記！`, 'fa-circle-check');
    }

    safeStorage('set', 'blesseq_mastered_verses', JSON.stringify([...state.masteredVerses]));
    renderMemoryCard(state.activeMemoryIndex);
    renderMemoryNavPills();
    updateMemoryMasteryBadge();
    renderToolkitMemoryGrid();
    if (state.isNotesOpen && state.activeNotesTab === 'memoryCards') {
      renderNotesContent('memoryCards');
    }
  }

  function updateMemoryMasteryBadge() {
    if (DOM.memoryMasteredBadge) {
      DOM.memoryMasteredBadge.textContent = `熟記 ${state.masteredVerses.size} / 12`;
    }
  }

  function speakMemoryVerse() {
    const verses = getMemoryVerses();
    const verse = verses[state.activeMemoryIndex];
    if (!verse || !('speechSynthesis' in window)) {
      showToast('您的瀏覽器不支援語音合成朗讀');
      return;
    }

    if (state.isSpeakingVerse) {
      stopSpeakingVerse();
      return;
    }

    stopSpeakingVerse();
    const textToSpeak = `${verse.citation}。${verse.text}`;
    const utter = new SpeechSynthesisUtterance(textToSpeak);
    utter.lang = 'zh-TW';
    utter.rate = 0.9;

    state.isSpeakingVerse = true;
    if (DOM.memoryAudioIcon) DOM.memoryAudioIcon.className = 'fa-solid fa-circle-stop text-gold';
    if (DOM.memoryAudioText) DOM.memoryAudioText.textContent = '停止朗誦';

    utter.onend = () => stopSpeakingVerse();
    utter.onerror = () => stopSpeakingVerse();
    window.speechSynthesis.speak(utter);
  }

  function stopSpeakingVerse() {
    if ('speechSynthesis' in window && state.isSpeakingVerse) {
      window.speechSynthesis.cancel();
    }
    state.isSpeakingVerse = false;
    if (DOM.memoryAudioIcon) DOM.memoryAudioIcon.className = 'fa-solid fa-volume-high text-gold';
    if (DOM.memoryAudioText) DOM.memoryAudioText.textContent = '語音朗誦';
  }

  function copyCurrentMemoryVerse() {
    const verses = getMemoryVerses();
    const verse = verses[state.activeMemoryIndex];
    if (!verse) return;
    const content = `【第 ${verse.id} 週主題經文 · ${verse.lessonTitle}】\n${verse.citation}\n${verse.text}\n\n💡 門下核心心法：${verse.insight}`;
    safeCopy(content, '第 ' + verse.id + ' 週經文與心法已成功複製！');
  }

  function jumpToLessonFromCard() {
    const verses = getMemoryVerses();
    const verse = verses[state.activeMemoryIndex];
    if (!verse) return;
    closeMemoryCards();
    loadLesson(verse.lessonId, 1);
    showToast(`已跳轉至第 ${verse.id} 課：${verse.lessonTitle}`);
  }

  function renderToolkitMemoryGrid() {
    if (!DOM.toolkitMemoryGrid) return;
    const verses = getMemoryVerses();
    if (!verses.length) return;

    DOM.toolkitMemoryGrid.innerHTML = verses.map((v, i) => {
      const isMastered = state.masteredVerses.has(v.id);
      return `
        <div class="toolkit-memory-card-tile ${isMastered ? 'is-mastered' : ''}" data-idx="${i}" role="button" tabindex="0" title="點擊開啟第 ${v.id} 週記憶卡">
          <div class="toolkit-tile-header">
            <span class="toolkit-tile-week">第 ${v.id} 週 · 主題經文</span>
            ${isMastered ? '<span class="brand-badge text-olive" style="font-size:0.72rem;"><i class="fa-solid fa-check"></i> 已熟記</span>' : ''}
          </div>
          <div class="toolkit-tile-citation">${escapeHtml(v.citation)}</div>
          <div class="toolkit-tile-snippet">${escapeHtml(v.text)}</div>
          <div class="toolkit-tile-footer">
            <span><i class="fa-regular fa-bookmark"></i> ${escapeHtml(v.lessonTitle)}</span>
            <span class="text-gold"><i class="fa-solid fa-rotate"></i> 翻轉記憶卡 →</span>
          </div>
        </div>
      `;
    }).join('');

    DOM.toolkitMemoryGrid.querySelectorAll('.toolkit-memory-card-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        const idx = parseInt(tile.dataset.idx, 10);
        closeToolkit();
        openMemoryCards(idx);
      });
      tile.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const idx = parseInt(tile.dataset.idx, 10);
          closeToolkit();
          openMemoryCards(idx);
        }
      });
    });
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
      navigator.clipboard.writeText(text).then(() => {
        showToast(successMsg || '已成功複製到剪貼簿！', 'fa-copy');
      }).catch(() => {
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
      showToast(successMsg || '已成功複製到剪貼簿！', 'fa-copy');
    } catch(e) {
      showToast('複製失敗，請手動選取文字複製。', 'fa-triangle-exclamation');
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
    // Theme & Reading Settings
    DOM.themeToggleBtn.addEventListener('click', cycleTheme);
    DOM.fontScaleBtn.addEventListener('click', openReadingSettings);

    // Mobile Drawer Controls
    if (DOM.mobileMenuBtn) DOM.mobileMenuBtn.addEventListener('click', toggleMobileDrawer);
    if (DOM.closeSidebarBtn) DOM.closeSidebarBtn.addEventListener('click', closeMobileDrawer);
    if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.addEventListener('click', closeMobileDrawer);

    // Mobile View Switcher
    if (DOM.viewSwitchBtns) {
      DOM.viewSwitchBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          setMobileView(btn.dataset.view);
        });
      });
    }

    // Mobile Bottom Dock Controls
    if (DOM.dockMenuBtn) DOM.dockMenuBtn.addEventListener('click', openMobileDrawer);
    if (DOM.dockLectureBtn) DOM.dockLectureBtn.addEventListener('click', () => setMobileView('lecture'));
    if (DOM.dockSlideBtn) DOM.dockSlideBtn.addEventListener('click', () => setMobileView('slides'));
    if (DOM.dockAudioBtn) DOM.dockAudioBtn.addEventListener('click', toggleMasterAudio);
    if (DOM.dockSettingsBtn) DOM.dockSettingsBtn.addEventListener('click', openReadingSettings);

    // Reading Settings Modal Controls
    if (DOM.closeReadingSettingsBtn) DOM.closeReadingSettingsBtn.addEventListener('click', closeReadingSettings);
    if (DOM.applySettingsCloseBtn) DOM.applySettingsCloseBtn.addEventListener('click', closeReadingSettings);
    if (DOM.readingSettingsModal) {
      DOM.readingSettingsModal.addEventListener('click', e => {
        if (e.target === DOM.readingSettingsModal) closeReadingSettings();
      });
    }

    // Font Size Stepper & Slider
    if (DOM.fontSizeButtons) {
      DOM.fontSizeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          state.fontSize = parseInt(btn.dataset.size, 10);
          applyReadingSettings();
        });
      });
    }

    if (DOM.fontSizeSlider) {
      DOM.fontSizeSlider.addEventListener('input', e => {
        state.fontSize = parseInt(e.target.value, 10);
        applyReadingSettings();
      });
    }

    // Line Height Stepper
    if (DOM.lineHeightButtons) {
      DOM.lineHeightButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          state.lineHeight = parseFloat(btn.dataset.lh);
          applyReadingSettings();
        });
      });
    }

    // Font Family Stepper
    if (DOM.fontFamilyButtons) {
      DOM.fontFamilyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          state.fontFamily = btn.dataset.ff;
          applyReadingSettings();
        });
      });
    }

    // Theme Selector Buttons
    if (DOM.themeSelectButtons) {
      DOM.themeSelectButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          setThemeByName(btn.dataset.thm);
        });
      });
    }

    // Reset Settings
    if (DOM.resetSettingsBtn) {
      DOM.resetSettingsBtn.addEventListener('click', () => {
        state.fontSize = 17;
        state.lineHeight = 1.85;
        state.fontFamily = 'sans';
        state.themeIndex = 0;
        applyReadingSettings();
        applyTheme();
        showToast('已恢復預設排版與色調', 'fa-rotate-left');
      });
    }

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

    // Toolkit Tabs (V4: 4-Tab Blessed Church Toolkit)
    function switchToolkitTab(tab) {
      const tabs = [
        { btn: DOM.toolTabTestimony, panel: DOM.testimonyToolContent, id: 'testimony' },
        { btn: DOM.toolTabBest, panel: DOM.bestToolContent, id: 'best' },
        { btn: DOM.toolTab8Weeks, panel: DOM.eightWeeksToolContent, id: '8weeks' },
        { btn: DOM.toolTabScriptures, panel: DOM.scripturesToolContent, id: 'scriptures' }
      ];
      tabs.forEach(t => {
        if (t.btn && t.panel) {
          const isActive = t.id === tab;
          t.btn.classList.toggle('active', isActive);
          t.btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
          t.panel.hidden = !isActive;
          t.panel.style.display = isActive ? 'block' : 'none';
        }
      });
    }

    DOM.toolTabTestimony.addEventListener('click', () => switchToolkitTab('testimony'));
    DOM.toolTabBest.addEventListener('click', () => switchToolkitTab('best'));
    if (DOM.toolTab8Weeks) {
      DOM.toolTab8Weeks.addEventListener('click', () => switchToolkitTab('8weeks'));
    }
    if (DOM.toolTabScriptures) {
      DOM.toolTabScriptures.addEventListener('click', () => {
        switchToolkitTab('scriptures');
        renderToolkitMemoryGrid();
      });
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

    // Notes & Tips Companion (V8)
    if (DOM.personalNotesToggle) {
      DOM.personalNotesToggle.addEventListener('click', () => togglePersonalNotes());
    }
    if (DOM.toggleNotesHeaderBtn) {
      DOM.toggleNotesHeaderBtn.addEventListener('click', () => togglePersonalNotes());
    }
    if (DOM.notesContentSelect) {
      DOM.notesContentSelect.addEventListener('change', () => {
        renderNotesContent(DOM.notesContentSelect.value);
      });
    }
    if (DOM.notesCopyContentBtn) {
      DOM.notesCopyContentBtn.addEventListener('click', () => {
        if (!DOM.notesContentViewport) return;
        const text = DOM.notesContentViewport.innerText.trim();
        if (text) {
          safeCopy(text, '目前提示與筆記內容已複製！');
        } else {
          showToast('目前尚無可複製內容');
        }
      });
    }

    // Memory Cards (經文記憶卡 01-12)
    if (DOM.openMemoryCardsBtn) {
      DOM.openMemoryCardsBtn.addEventListener('click', () => openMemoryCards());
    }
    if (DOM.closeMemoryCardsBtn) {
      DOM.closeMemoryCardsBtn.addEventListener('click', closeMemoryCards);
    }
    if (DOM.memoryCardsModal) {
      DOM.memoryCardsModal.addEventListener('click', e => {
        if (e.target === DOM.memoryCardsModal) closeMemoryCards();
      });
    }
    if (DOM.flashcardScene) {
      DOM.flashcardScene.addEventListener('click', e => {
        if (e.target.closest('button') || e.target.closest('.card-blank-word')) return;
        flipMemoryCard();
      });
    }
    if (DOM.memoryFlipActionBtn) {
      DOM.memoryFlipActionBtn.addEventListener('click', flipMemoryCard);
    }
    if (DOM.memoryToggleMaskBtn) {
      DOM.memoryToggleMaskBtn.addEventListener('click', toggleMemoryMask);
    }
    if (DOM.memoryAudioBtn) {
      DOM.memoryAudioBtn.addEventListener('click', speakMemoryVerse);
    }
    if (DOM.memoryShuffleBtn) {
      DOM.memoryShuffleBtn.addEventListener('click', shuffleMemoryCard);
    }
    if (DOM.memoryPrevCardBtn) {
      DOM.memoryPrevCardBtn.addEventListener('click', prevMemoryCard);
    }
    if (DOM.memoryNextCardBtn) {
      DOM.memoryNextCardBtn.addEventListener('click', nextMemoryCard);
    }
    if (DOM.memoryToggleMasteredBtn) {
      DOM.memoryToggleMasteredBtn.addEventListener('click', toggleCardMastered);
    }
    if (DOM.cardCopyBtn) {
      DOM.cardCopyBtn.addEventListener('click', copyCurrentMemoryVerse);
    }
    if (DOM.cardJumpLessonBtn) {
      DOM.cardJumpLessonBtn.addEventListener('click', jumpToLessonFromCard);
    }

    // Swipe Gestures (P1-13)
    addSwipe(DOM.slideStageMain);
    addSwipe(document.getElementById('presenterBody'));

    // Keyboard Shortcuts
    document.addEventListener('keydown', e => {
      // Allow typing in inputs
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        if (e.key === 'Escape') {
          if (DOM.searchModal && DOM.searchModal.style.display !== 'none') closeSearch();
          if (DOM.toolkitModal && DOM.toolkitModal.style.display !== 'none') closeToolkit();
          if (DOM.memoryCardsModal && DOM.memoryCardsModal.style.display !== 'none') closeMemoryCards();
          if (state.isSettingsOpen) closeReadingSettings();
        }
        return;
      }

      // Memory Cards Active Shortcuts
      if (state.isMemoryCardsOpen) {
        if (e.key === 'Escape') {
          closeMemoryCards();
          return;
        }
        if (e.key === ' ' || e.code === 'Space') {
          e.preventDefault();
          flipMemoryCard();
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          prevMemoryCard();
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          nextMemoryCard();
          return;
        }
      }

      switch (e.key) {
        case 'ArrowLeft':
          setSlide(state.activeSlideIndex - 1, 'prev');
          break;
        case 'ArrowRight':
          setSlide(state.activeSlideIndex + 1, 'next');
          break;
        case ' ':
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
        case 'm': case 'M':
          if (!e.ctrlKey && !e.metaKey) {
            if (state.isMemoryCardsOpen) {
              toggleMemoryMask();
            } else {
              openMemoryCards();
            }
          }
          break;
        case 'a': case 'A':
          if (!e.ctrlKey && !e.metaKey) {
            state.isSettingsOpen ? closeReadingSettings() : openReadingSettings();
          }
          break;
        case 'Escape':
          if (state.isMemoryCardsOpen) closeMemoryCards();
          if (state.isPresenterOpen) closePresenter();
          if (state.isSettingsOpen) closeReadingSettings();
          if (state.isDrawerOpen) closeMobileDrawer();
          if (DOM.searchModal && DOM.searchModal.style.display !== 'none') closeSearch();
          if (DOM.toolkitModal && DOM.toolkitModal.style.display !== 'none') closeToolkit();
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
