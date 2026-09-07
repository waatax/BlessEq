/**
 * BlessEq - Application Core Controller
 * Handles curriculum navigation, dual-pane synchronization,
 * presenter mode, interactive fill-in-the-blanks, search, audio narration, and themes.
 */

(function() {
  'use strict';

  // --- State ---
  const state = {
    lessons: [],
    activeLessonId: '00',
    activeSlideIndex: 1,
    activeCategory: 'all',
    isMasked: false,
    theme: localStorage.getItem('blesseq_theme') || 'light',
    fontScale: parseFloat(localStorage.getItem('blesseq_font_scale') || '1.0'),
    isPresenterOpen: false,
    revealedBlanks: new Set(),
    synthUtterance: null,
    isSpeaking: false,
    playbackRate: 1.0
  };

  // --- DOM Elements ---
  const DOM = {
    // Theme & Root
    html: document.documentElement,
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeIcon: document.getElementById('themeIcon'),
    fontScaleBtn: document.getElementById('fontScaleBtn'),
    brandHomeBtn: document.getElementById('brandHomeBtn'),

    // Category Tabs & Sidebar
    categoryTabs: document.querySelectorAll('.tab-btn[data-filter]'),
    lessonsContainer: document.getElementById('lessonsContainer'),
    lessonCountBadge: document.getElementById('lessonCountBadge'),

    // Lesson Banner
    bannerCategory: document.getElementById('bannerCategory'),
    bannerTitle: document.getElementById('bannerTitle'),
    bannerSubtitle: document.getElementById('bannerSubtitle'),
    btnPrevLesson: document.getElementById('btnPrevLesson'),
    btnNextLesson: document.getElementById('btnNextLesson'),

    // Audio Narrator
    audioNarrateBtn: document.getElementById('audioNarrateBtn'),
    audioIcon: document.getElementById('audioIcon'),
    audioStatusText: document.getElementById('audioStatusText'),
    audioDetailText: document.getElementById('audioDetailText'),
    audioSpeedSelect: document.getElementById('audioSpeedSelect'),

    // Slide Stage
    currentSlideNum: document.getElementById('currentSlideNum'),
    totalSlideNum: document.getElementById('totalSlideNum'),
    btnSlidePrev: document.getElementById('btnSlidePrev'),
    btnSlideNext: document.getElementById('btnSlideNext'),
    btnSlideFullscreen: document.getElementById('btnSlideFullscreen'),
    slideStageMain: document.getElementById('slideStageMain'),
    slideMainImg: document.getElementById('slideMainImg'),
    overlayPrevBtn: document.getElementById('overlayPrevBtn'),
    overlayNextBtn: document.getElementById('overlayNextBtn'),
    thumbnailsStrip: document.getElementById('thumbnailsStrip'),
    slideHeadline: document.getElementById('slideHeadline'),
    slideBulletList: document.getElementById('slideBulletList'),
    slideNotesBox: document.getElementById('slideNotesBox'),
    slideNotesText: document.getElementById('slideNotesText'),

    // Lecture Pane
    lectureScrollContent: document.getElementById('lectureScrollContent'),
    toggleMaskBtn: document.getElementById('toggleMaskBtn'),
    maskIcon: document.getElementById('maskIcon'),
    toggleMaskRightBtn: document.getElementById('toggleMaskRightBtn'),
    lectureCopyBtn: document.getElementById('lectureCopyBtn'),

    // Presenter Fullscreen Modal
    startPresenterBtn: document.getElementById('startPresenterBtn'),
    presenterModal: document.getElementById('presenterModal'),
    presenterImg: document.getElementById('presenterImg'),
    presenterLessonTitle: document.getElementById('presenterLessonTitle'),
    presenterSlideIndicator: document.getElementById('presenterSlideIndicator'),
    presenterPrevBtn: document.getElementById('presenterPrevBtn'),
    presenterNextBtn: document.getElementById('presenterNextBtn'),
    closePresenterBtn: document.getElementById('closePresenterBtn'),

    // Search Modal
    openSearchBtn: document.getElementById('openSearchBtn'),
    searchModal: document.getElementById('searchModal'),
    closeSearchModalBtn: document.getElementById('closeSearchModalBtn'),
    globalSearchInput: document.getElementById('globalSearchInput'),
    searchResultsList: document.getElementById('searchResultsList'),
    searchResultSummary: document.getElementById('searchResultSummary'),

    // Practical Toolkit Modal
    openToolkitBtn: document.getElementById('openToolkitBtn'),
    toolkitModal: document.getElementById('toolkitModal'),
    closeToolkitModalBtn: document.getElementById('closeToolkitModalBtn'),
    toolTabTestimony: document.getElementById('toolTabTestimony'),
    toolTabBest: document.getElementById('toolTabBest'),
    testimonyToolContent: document.getElementById('testimonyToolContent'),
    bestToolContent: document.getElementById('bestToolContent'),
    testimonyBefore: document.getElementById('testimonyBefore'),
    testimonyTurning: document.getElementById('testimonyTurning'),
    testimonyAfter: document.getElementById('testimonyAfter'),
    clearTestimonyBtn: document.getElementById('clearTestimonyBtn'),
    copyTestimonyBtn: document.getElementById('copyTestimonyBtn')
  };

  // --- Initialize Application ---
  function init() {
    // 1. Load Data
    if (window.BLESS_EQ_DATA && Array.isArray(window.BLESS_EQ_DATA)) {
      state.lessons = window.BLESS_EQ_DATA;
    } else {
      console.warn('Waiting for BLESS_EQ_DATA or fetching curriculum.json...');
      fetch('data/curriculum.json')
        .then(res => res.json())
        .then(data => {
          state.lessons = data;
          finishInit();
        })
        .catch(err => {
          console.error('Failed to load curriculum data:', err);
        });
      return;
    }
    finishInit();
  }

  function finishInit() {
    applyTheme(state.theme);
    applyFontScale(state.fontScale);

    // Bind Event Handlers
    bindEvents();

    // Render Initial UI
    renderCurriculumList();
    const savedLesson = localStorage.getItem('blesseq_active_lesson') || '00';
    loadLesson(savedLesson, 1);
  }

  // --- Theme & Font Scaling ---
  function applyTheme(theme) {
    state.theme = theme;
    DOM.html.setAttribute('data-theme', theme);
    localStorage.setItem('blesseq_theme', theme);
    if (theme === 'dark') {
      DOM.themeIcon.className = 'fa-solid fa-sun';
      DOM.themeToggleBtn.title = '切換為典雅羊皮紙日間模式';
    } else {
      DOM.themeIcon.className = 'fa-solid fa-moon';
      DOM.themeToggleBtn.title = '切換為黑曜石靜夜研經模式';
    }
  }

  function applyFontScale(scale) {
    state.fontScale = scale;
    document.body.style.fontSize = `${scale * 16}px`;
    localStorage.setItem('blesseq_font_scale', scale.toString());
  }

  // --- Category Filter & Curriculum List ---
  function renderCurriculumList() {
    const filtered = state.lessons.filter(l => {
      if (state.activeCategory === 'all') return true;
      return l.category === state.activeCategory;
    });

    DOM.lessonCountBadge.textContent = `${filtered.length} 門課`;
    DOM.lessonsContainer.innerHTML = '';

    filtered.forEach(lesson => {
      const item = document.createElement('a');
      item.href = 'javascript:void(0)';
      item.className = `lesson-item ${lesson.id === state.activeLessonId ? 'active' : ''}`;
      item.dataset.lessonId = lesson.id;

      item.innerHTML = `
        <div class="lesson-badge">${lesson.code}</div>
        <div class="lesson-details">
          <div class="lesson-name">${lesson.title}</div>
          <div class="lesson-sub">${lesson.subtitle || ''}</div>
          <div class="lesson-meta">
            <span class="meta-chip"><i class="fa-regular fa-images"></i> ${lesson.slideCount} 投影片</span>
            <span class="meta-chip"><i class="fa-regular fa-file-lines"></i> ${lesson.pdfPageCount} 講義頁</span>
          </div>
        </div>
      `;

      item.addEventListener('click', () => {
        loadLesson(lesson.id, 1);
      });

      DOM.lessonsContainer.appendChild(item);
    });
  }

  // --- Load Lesson & Synchronize Workspace ---
  function loadLesson(lessonId, slideIndex = 1) {
    const lesson = state.lessons.find(l => l.id === lessonId);
    if (!lesson) return;

    state.activeLessonId = lessonId;
    state.activeSlideIndex = slideIndex;
    localStorage.setItem('blesseq_active_lesson', lessonId);

    // Stop ongoing audio
    stopAudio();

    // 1. Update Left Sidebar Active State
    document.querySelectorAll('.lesson-item').forEach(el => {
      el.classList.toggle('active', el.dataset.lessonId === lessonId);
    });

    // 2. Update Lesson Banner
    DOM.bannerCategory.innerHTML = `<i class="fa-solid fa-bookmark"></i> <span>${lesson.categoryName} · 第 ${lesson.code} 單元</span>`;
    DOM.bannerTitle.textContent = lesson.title;
    DOM.bannerSubtitle.textContent = `${lesson.subtitle || ''} · 共 ${lesson.slideCount} 頁簡報與完整門下講義教學`;

    // 3. Update Slide Deck
    DOM.totalSlideNum.textContent = lesson.slideCount;
    renderThumbnails(lesson);
    setSlide(slideIndex);

    // 4. Update Lecture Narrative (Right Pane)
    renderLectureNarrative(lesson);

    // Scroll right pane to top
    DOM.lectureScrollContent.scrollTop = 0;
  }

  // --- Render Slide Thumbnails ---
  function renderThumbnails(lesson) {
    DOM.thumbnailsStrip.innerHTML = '';
    lesson.slides.forEach(slide => {
      const thumb = document.createElement('div');
      thumb.className = `thumb-item ${slide.slideIndex === state.activeSlideIndex ? 'active' : ''}`;
      thumb.dataset.slideIndex = slide.slideIndex;

      thumb.innerHTML = `
        <img src="${slide.image}" alt="Slide ${slide.slideIndex}" loading="lazy">
        <span class="thumb-number">${slide.slideIndex}</span>
      `;

      thumb.addEventListener('click', () => {
        setSlide(slide.slideIndex);
      });

      DOM.thumbnailsStrip.appendChild(thumb);
    });
  }

  // --- Switch Slide ---
  function setSlide(slideIndex) {
    const lesson = state.lessons.find(l => l.id === state.activeLessonId);
    if (!lesson || !lesson.slides || lesson.slides.length === 0) return;

    // Bounds check
    if (slideIndex < 1) slideIndex = 1;
    if (slideIndex > lesson.slideCount) slideIndex = lesson.slideCount;

    state.activeSlideIndex = slideIndex;
    const slide = lesson.slides[slideIndex - 1];

    // Update Counter
    DOM.currentSlideNum.textContent = slideIndex;

    // Update Main Slide Image with soft fade
    DOM.slideMainImg.style.opacity = '0.4';
    DOM.slideMainImg.src = slide.image;
    DOM.slideMainImg.onload = () => {
      DOM.slideMainImg.style.opacity = '1';
    };

    // Update Presenter Image if Open
    if (state.isPresenterOpen) {
      DOM.presenterImg.src = slide.image;
      DOM.presenterSlideIndicator.textContent = `${slideIndex} / ${lesson.slideCount}`;
    }

    // Update Active Thumbnail
    document.querySelectorAll('.thumb-item').forEach(el => {
      const isCur = parseInt(el.dataset.slideIndex, 10) === slideIndex;
      el.classList.toggle('active', isCur);
      if (isCur) {
        el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    });

    // Update Slide Bullet Points and Notes
    DOM.slideHeadline.textContent = slide.title || `投影片 ${slideIndex} 重點提要`;
    DOM.slideBulletList.innerHTML = '';
    
    if (slide.textLines && slide.textLines.length > 0) {
      slide.textLines.slice(1).forEach(line => {
        if (line && line.trim()) {
          const li = document.createElement('li');
          li.textContent = line.trim();
          DOM.slideBulletList.appendChild(li);
        }
      });
    }

    if (DOM.slideBulletList.children.length === 0) {
      const li = document.createElement('li');
      li.textContent = '此頁為視覺概念圖示或經文全版呈現。';
      DOM.slideBulletList.appendChild(li);
    }

    // Speaker Notes
    if (slide.notes && slide.notes.trim()) {
      DOM.slideNotesBox.style.display = 'block';
      DOM.slideNotesText.textContent = slide.notes.trim();
    } else {
      DOM.slideNotesBox.style.display = 'none';
    }
  }

  // --- Lecture Narrative (Right Pane) Parsing & Rendering ---
  function renderLectureNarrative(lesson) {
    DOM.lectureScrollContent.innerHTML = '';

    const fullText = lesson.fullPdfText || '';

    // If PDF text is short or not loaded, fallback gracefully
    if (!fullText || fullText.trim().length === 0) {
      DOM.lectureScrollContent.innerHTML = `
        <div style="padding: 2rem; text-align: center; color: var(--text-muted);">
          <i class="fa-solid fa-book-open" style="font-size: 2.5rem; margin-bottom: 1rem; color: var(--gold-primary);"></i>
          <p>本課講義正在載入中，請參考左側投影片內容。</p>
        </div>
      `;
      return;
    }

    // Split text into meaningful sections
    // Standard structure in 門下講義:
    // 【課程目標】
    // 【前言提要】
    // 一、 二、 三、 大綱
    // 經文引用 【...】
    // 反思與作業

    const lines = fullText.split('\n').map(l => l.trim()).filter(l => l);
    let htmlBuffer = '';
    let currentSection = '';

    // Extract Course Goals & Scriptures
    const goalsMatch = fullText.match(/【課程目標】([\s\S]*?)(?=【|一、|\d+\.|$)/);
    if (goalsMatch && goalsMatch[1]) {
      htmlBuffer += `
        <div class="teaching-section">
          <h4><i class="fa-solid fa-bullseye text-gold"></i> 課程目標</h4>
          <div class="teaching-text" style="font-weight: 500; color: var(--text-primary);">
            ${formatLectureParagraph(goalsMatch[1].trim())}
          </div>
        </div>
      `;
    }

    // Key Scriptures
    const scriptureRegex = /【([^】]+?(?:書|記|篇|音|徒|羅|林|加|弗|腓|西|帖|太|可|路|約)[^】]+?)】([\s\S]*?)(?=【|[一二三四五六七八九十]、|\d+\.|$)/g;
    let sMatch;
    let sCount = 0;
    while ((sMatch = scriptureRegex.exec(fullText)) !== null && sCount < 3) {
      const cite = sMatch[1].trim();
      const verseText = sMatch[2].trim().replace(/\s+/g, ' ');
      if (verseText.length > 5 && verseText.length < 300) {
        htmlBuffer += `
          <div class="scripture-card">
            <div class="scripture-citation">
              <i class="fa-solid fa-book-bible text-gold"></i> 【${cite}】
            </div>
            <div class="scripture-text">「${verseText}」</div>
          </div>
        `;
        sCount++;
      }
    }

    // Parse Outlines (一、 二、 三、 ...)
    const sectionRegex = /([一二三四五六七八九十]、[^\n]+)/g;
    const parts = fullText.split(sectionRegex);

    for (let i = 1; i < parts.length; i += 2) {
      const secTitle = parts[i].trim();
      const secBody = (parts[i + 1] || '').trim();

      htmlBuffer += `
        <div class="teaching-section">
          <h4>${secTitle}</h4>
          <div class="teaching-text">
            ${formatLectureParagraph(secBody)}
          </div>
        </div>
      `;
    }

    // If no numbered sections matched, render paragraphs nicely
    if (parts.length <= 1) {
      htmlBuffer += `
        <div class="teaching-section">
          <h4>講義核心述說</h4>
          <div class="teaching-text">
            ${formatLectureParagraph(fullText)}
          </div>
        </div>
      `;
    }

    // Add Small Group Reflection & Practical Workshop
    htmlBuffer += `
      <div style="background: var(--bg-surface-subtle); border: 1.5px dashed var(--gold-border); border-radius: var(--radius-md); padding: 1.25rem 1.5rem; margin-top: 1.5rem;">
        <h4 style="font-size: 1rem; color: var(--gold-primary); margin-bottom: 0.6rem; display: flex; align-items: center; gap: 0.5rem;">
          <i class="fa-solid fa-comments"></i> 課後反思與小組實作操練
        </h4>
        <ul style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.7; padding-left: 1.2rem;">
          <li>默想本課核心經文，哪一句話最觸動你此時此刻的心境？</li>
          <li>在實際服事或日常生活中，本課觀念如何幫助你突破目前的瓶頸？</li>
          <li>與幸福小組同工彼此代禱，並寫下具體的實踐行動清單。</li>
        </ul>
      </div>
    `;

    DOM.lectureScrollContent.innerHTML = htmlBuffer;

    // Apply interactive blank behavior
    updateBlanksDisplay();
  }

  // Format Paragraph with Interactive Fill-in-the-Blanks
  function formatLectureParagraph(text) {
    // 1. Clean line breaks and headers
    let cleaned = text
      .replace(/門徒學校\(下\)[\s\S]*?\d+/g, '')
      .replace(/幸福小組實作秘笈[\s\S]*?\d+/g, '')
      .replace(/\t+/g, ' ')
      .replace(/\n\s*\n/g, '<br><br>');

    // 2. Identify Fill-in keywords (words inside quotes or blanks or key terms)
    // Keywords with underlines or prominent terms
    cleaned = cleaned.replace(/([\u4e00-\u9fa5]{2,6})(?=\s*的作為|\s*的經歷|\s*與\s*榮耀|\s*命令|\s*應有的回應|\s*相信耶穌)/g, function(match) {
      return createBlankSpan(match);
    });

    // Also match explicit brackets or fills
    cleaned = cleaned.replace(/【填空：([^】]+)】/g, function(m, p1) {
      return createBlankSpan(p1);
    });

    return cleaned;
  }

  function createBlankSpan(text) {
    const isMasked = state.isMasked;
    return `<span class="blank-answer ${isMasked ? 'masked' : ''}" data-answer="${text}" title="點擊揭曉/遮蔽解答">${text}</span>`;
  }

  function updateBlanksDisplay() {
    const blanks = DOM.lectureScrollContent.querySelectorAll('.blank-answer');
    blanks.forEach(b => {
      b.classList.toggle('masked', state.isMasked);
      b.onclick = function(e) {
        e.stopPropagation();
        this.classList.toggle('masked');
        this.classList.add('revealed');
      };
    });
  }

  // --- Presenter Fullscreen Mode ---
  function openPresenter() {
    state.isPresenterOpen = true;
    const lesson = state.lessons.find(l => l.id === state.activeLessonId);
    if (!lesson) return;

    DOM.presenterLessonTitle.textContent = `${lesson.code} ${lesson.title}`;
    DOM.presenterSlideIndicator.textContent = `${state.activeSlideIndex} / ${lesson.slideCount}`;
    DOM.presenterImg.src = lesson.slides[state.activeSlideIndex - 1].image;
    DOM.presenterModal.style.display = 'flex';

    // Request native fullscreen if available
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen request bypassed:', e);
    }
  }

  function closePresenter() {
    state.isPresenterOpen = false;
    DOM.presenterModal.style.display = 'none';
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  // --- Audio Narration (Web Speech API) ---
  function toggleAudio() {
    if (!('speechSynthesis' in window)) {
      alert('您的瀏覽器不支援語音合成功能，建議使用 Chrome / Edge 瀏覽器。');
      return;
    }

    if (state.isSpeaking) {
      stopAudio();
    } else {
      startAudio();
    }
  }

  function startAudio() {
    const lesson = state.lessons.find(l => l.id === state.activeLessonId);
    if (!lesson) return;

    window.speechSynthesis.cancel();

    // Extract plain text for narration
    const textToRead = `${lesson.title}。${lesson.subtitle || ''}。` + 
      DOM.lectureScrollContent.innerText.replace(/[•？\n]+/g, '，').slice(0, 1500);

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'zh-TW';
    utterance.rate = state.playbackRate;

    // Find zh voice if available
    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find(v => v.lang === 'zh-TW' || v.lang.startsWith('zh'));
    if (zhVoice) utterance.voice = zhVoice;

    utterance.onstart = () => {
      state.isSpeaking = true;
      DOM.audioIcon.className = 'fa-solid fa-pause';
      DOM.audioStatusText.textContent = '語音朗讀中...';
      DOM.audioDetailText.textContent = '點擊暫停';
    };

    utterance.onend = utterance.onerror = () => {
      stopAudio();
    };

    state.synthUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  function stopAudio() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    state.isSpeaking = false;
    DOM.audioIcon.className = 'fa-solid fa-volume-high';
    DOM.audioStatusText.textContent = '講義述說語音導讀';
    DOM.audioDetailText.textContent = '點擊播放聆聽本課講義全文';
  }

  // --- Global Realtime Search ---
  function openSearch() {
    DOM.searchModal.classList.add('open');
    DOM.globalSearchInput.focus();
  }

  function closeSearch() {
    DOM.searchModal.classList.remove('open');
  }

  function handleSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      DOM.searchResultsList.innerHTML = '';
      DOM.searchResultSummary.textContent = '請輸入關鍵字進行檢索';
      return;
    }

    const hits = [];

    state.lessons.forEach(l => {
      // 1. Check title and subtitle
      if (l.title.toLowerCase().includes(q) || (l.subtitle && l.subtitle.toLowerCase().includes(q))) {
        hits.push({
          lessonId: l.id,
          lessonCode: l.code,
          lessonTitle: l.title,
          slideIndex: 1,
          type: '課程標題',
          snippet: `${l.title} - ${l.subtitle || ''}`
        });
      }

      // 2. Check slides
      l.slides.forEach(s => {
        const joined = (s.textLines || []).join(' ');
        if (joined.toLowerCase().includes(q)) {
          hits.push({
            lessonId: l.id,
            lessonCode: l.code,
            lessonTitle: l.title,
            slideIndex: s.slideIndex,
            type: `投影片 ${s.slideIndex}`,
            snippet: extractSnippet(joined, q)
          });
        }
      });

      // 3. Check PDF text
      if (l.fullPdfText && l.fullPdfText.toLowerCase().includes(q)) {
        hits.push({
          lessonId: l.id,
          lessonCode: l.code,
          lessonTitle: l.title,
          slideIndex: 1,
          type: '講義述說全文',
          snippet: extractSnippet(l.fullPdfText, q)
        });
      }
    });

    renderSearchResults(hits, q);
  }

  function extractSnippet(text, query) {
    const idx = text.toLowerCase().indexOf(query);
    if (idx === -1) return text.slice(0, 100);
    const start = Math.max(0, idx - 30);
    const end = Math.min(text.length, idx + query.length + 50);
    return (start > 0 ? '...' : '') + text.slice(start, end).replace(/\s+/g, ' ') + (end < text.length ? '...' : '');
  }

  function renderSearchResults(hits, query) {
    DOM.searchResultsList.innerHTML = '';
    DOM.searchResultSummary.textContent = `找到 ${hits.length} 筆符合結果`;

    if (hits.length === 0) {
      DOM.searchResultsList.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
          <i class="fa-solid fa-magnifying-glass" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
          <p>查無符合「${query}」之內容，請嘗試其他關鍵字</p>
        </div>
      `;
      return;
    }

    hits.slice(0, 30).forEach(h => {
      const item = document.createElement('div');
      item.className = 'search-result-item';

      const highlightedSnippet = h.snippet.replace(new RegExp(query, 'gi'), match => `<span class="highlight-match">${match}</span>`);

      item.innerHTML = `
        <div class="search-res-lesson">${h.lessonCode} · ${h.lessonTitle} · <span style="color: var(--text-muted); font-weight: normal;">${h.type}</span></div>
        <div class="search-res-snippet">${highlightedSnippet}</div>
      `;

      item.addEventListener('click', () => {
        closeSearch();
        loadLesson(h.lessonId, h.slideIndex);
      });

      DOM.searchResultsList.appendChild(item);
    });
  }

  // --- Practical Tools Modal ---
  function openToolkit() {
    DOM.toolkitModal.classList.add('open');
  }

  function closeToolkit() {
    DOM.toolkitModal.classList.remove('open');
  }

  // --- Event Bindings ---
  function bindEvents() {
    // Theme Toggle
    DOM.themeToggleBtn.addEventListener('click', () => {
      applyTheme(state.theme === 'light' ? 'dark' : 'light');
    });

    // Font Scale
    DOM.fontScaleBtn.addEventListener('click', () => {
      const nextScale = state.fontScale >= 1.25 ? 0.95 : state.fontScale + 0.1;
      applyFontScale(Math.round(nextScale * 100) / 100);
    });

    // Brand Logo Home Click
    DOM.brandHomeBtn.addEventListener('click', () => {
      loadLesson('00', 1);
    });

    // Category Tabs
    DOM.categoryTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        DOM.categoryTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.activeCategory = tab.dataset.filter;
        renderCurriculumList();
      });
    });

    // Slide Next / Prev
    DOM.btnSlidePrev.addEventListener('click', () => setSlide(state.activeSlideIndex - 1));
    DOM.btnSlideNext.addEventListener('click', () => setSlide(state.activeSlideIndex + 1));
    DOM.overlayPrevBtn.addEventListener('click', () => setSlide(state.activeSlideIndex - 1));
    DOM.overlayNextBtn.addEventListener('click', () => setSlide(state.activeSlideIndex + 1));

    // Presenter Triggers
    DOM.startPresenterBtn.addEventListener('click', openPresenter);
    DOM.btnSlideFullscreen.addEventListener('click', openPresenter);
    DOM.closePresenterBtn.addEventListener('click', closePresenter);
    DOM.presenterPrevBtn.addEventListener('click', () => setSlide(state.activeSlideIndex - 1));
    DOM.presenterNextBtn.addEventListener('click', () => setSlide(state.activeSlideIndex + 1));

    // Next / Prev Lesson
    DOM.btnPrevLesson.addEventListener('click', () => {
      const curIdx = state.lessons.findIndex(l => l.id === state.activeLessonId);
      if (curIdx > 0) loadLesson(state.lessons[curIdx - 1].id, 1);
    });
    DOM.btnNextLesson.addEventListener('click', () => {
      const curIdx = state.lessons.findIndex(l => l.id === state.activeLessonId);
      if (curIdx < state.lessons.length - 1) loadLesson(state.lessons[curIdx + 1].id, 1);
    });

    // Mask/Reveal Blanks Toggle
    function toggleMask() {
      state.isMasked = !state.isMasked;
      DOM.maskIcon.className = state.isMasked ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
      DOM.toggleMaskBtn.title = state.isMasked ? '揭曉講義解答' : '切換為挖空測驗模式';
      DOM.toggleMaskRightBtn.innerHTML = state.isMasked ? '<i class="fa-solid fa-eye"></i> 顯示解答' : '<i class="fa-solid fa-pen-clip"></i> 填空測驗';
      updateBlanksDisplay();
    }
    DOM.toggleMaskBtn.addEventListener('click', toggleMask);
    DOM.toggleMaskRightBtn.addEventListener('click', toggleMask);

    // Audio Narration Controls
    DOM.audioNarrateBtn.addEventListener('click', toggleAudio);
    DOM.audioSpeedSelect.addEventListener('change', e => {
      state.playbackRate = parseFloat(e.target.value);
      if (state.isSpeaking) {
        startAudio();
      }
    });

    // Search Controls
    DOM.openSearchBtn.addEventListener('click', openSearch);
    DOM.closeSearchModalBtn.addEventListener('click', closeSearch);
    DOM.searchModal.addEventListener('click', e => {
      if (e.target === DOM.searchModal) closeSearch();
    });
    DOM.globalSearchInput.addEventListener('input', e => {
      handleSearch(e.target.value);
    });

    // Toolkit Modal
    DOM.openToolkitBtn.addEventListener('click', openToolkit);
    DOM.closeToolkitModalBtn.addEventListener('click', closeToolkit);
    DOM.toolkitModal.addEventListener('click', e => {
      if (e.target === DOM.toolkitModal) closeToolkit();
    });

    // Toolkit Tabs
    DOM.toolTabTestimony.addEventListener('click', () => {
      DOM.toolTabTestimony.classList.add('active');
      DOM.toolTabBest.classList.remove('active');
      DOM.testimonyToolContent.style.display = 'flex';
      DOM.bestToolContent.style.display = 'none';
    });
    DOM.toolTabBest.addEventListener('click', () => {
      DOM.toolTabBest.classList.add('active');
      DOM.toolTabTestimony.classList.remove('active');
      DOM.testimonyToolContent.style.display = 'none';
      DOM.bestToolContent.style.display = 'flex';
    });

    // Copy Testimony
    DOM.copyTestimonyBtn.addEventListener('click', () => {
      const b = DOM.testimonyBefore.value.trim();
      const t = DOM.testimonyTurning.value.trim();
      const a = DOM.testimonyAfter.value.trim();
      const full = `【我的信主見證】\n\n一、信主前：\n${b || '（尚未填寫）'}\n\n二、轉折點：\n${t || '（尚未填寫）'}\n\n三、信主後的改變：\n${a || '（尚未填寫）'}\n\n願一切榮耀頌讚都歸給愛我們的主耶穌！`;
      navigator.clipboard.writeText(full).then(() => {
        alert('見證講稿已成功複製到剪貼簿！');
      });
    });

    DOM.clearTestimonyBtn.addEventListener('click', () => {
      if (confirm('確定清除已輸入的見證內容嗎？')) {
        DOM.testimonyBefore.value = '';
        DOM.testimonyTurning.value = '';
        DOM.testimonyAfter.value = '';
      }
    });

    // Copy Lecture Summary
    DOM.lectureCopyBtn.addEventListener('click', () => {
      const text = DOM.lectureScrollContent.innerText;
      navigator.clipboard.writeText(text).then(() => {
        alert('講義重點與述說內容已成功複製！');
      });
    });

    // Global Keyboard Shortcuts
    document.addEventListener('keydown', e => {
      // Ignore if typing in text inputs or textareas
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        if (e.key === 'Escape') {
          closeSearch();
          closeToolkit();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          setSlide(state.activeSlideIndex - 1);
          break;
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          setSlide(state.activeSlideIndex + 1);
          break;
        case 'f':
        case 'F':
          if (state.isPresenterOpen) {
            closePresenter();
          } else {
            openPresenter();
          }
          break;
        case 'Escape':
          if (state.isPresenterOpen) closePresenter();
          closeSearch();
          closeToolkit();
          break;
        case 'k':
        case 'K':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            openSearch();
          }
          break;
      }
    });
  }

  // Auto Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
