(function () {
  // --- DOM: Screens ---
  const homeScreen = document.getElementById('homeScreen');
  const classicScreen = document.getElementById('classicScreen');
  const practiceScreen = document.getElementById('practiceScreen');
  const flagScreen = document.getElementById('flagScreen');
  const gameScreen = document.getElementById('gameScreen');
  const backBtn = document.getElementById('backBtn');
  const regionBadge = document.getElementById('regionBadge');
  const modeBadge = document.getElementById('modeBadge');
  const inputLabel = document.getElementById('inputLabel');

  // --- DOM: Game ---
  const mapContainer = document.getElementById('mapContainer');
  const userInput = document.getElementById('userInput');
  const submitBtn = document.getElementById('submitBtn');
  const feedback = document.getElementById('feedback');
  const modeIndicator = document.getElementById('modeIndicator');
  const completedCount = document.getElementById('completedCount');
  const totalCount = document.getElementById('totalCount');
  const progressFill = document.getElementById('progressFill');
  const timerDisplay = document.getElementById('timerDisplay');

  // --- Timer state ---
  let gameStartTime = 0;
  let timerInterval = null;
  let finalTime = 0;

  function formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  function startTimer() {
    stopTimer();
    gameStartTime = Date.now();
    timerDisplay.textContent = '0:00';
    timerInterval = setInterval(() => {
      timerDisplay.textContent = formatTime(Date.now() - gameStartTime);
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  // --- Celebration ---
  const celebrationOverlay = document.getElementById('celebrationOverlay');
  const celebrationSubtitle = document.getElementById('celebrationSubtitle');
  const celebrationBackBtn = document.getElementById('celebrationBackBtn');
  const confettiCanvas = document.getElementById('confettiCanvas');

  // --- Game type ---
  let gameType = 'classic'; // 'classic', 'target', or 'flag'

  // --- Target mode state ---
  let practiceTarget = null;
  let practiceRemaining = [];

  // --- Flag mode state ---
  let flagTarget = null;
  let flagRemaining = [];
  const flagDisplay = document.getElementById('flagDisplay');
  const flagImage = document.getElementById('flagImage');
  const flagHint = document.getElementById('flagHint');
  const sidebarHeader = document.getElementById('sidebarHeader');

  // --- Screen helpers ---
  function showScreen(screen) {
    [homeScreen, classicScreen, practiceScreen, flagScreen, gameScreen].forEach(s => s.classList.add('hidden'));
    screen.classList.remove('hidden');
  }

  celebrationBackBtn.addEventListener('click', () => {
    stopTimer();
    celebrationOverlay.classList.add('hidden');
    const returnScreen = gameType === 'target' ? practiceScreen : gameType === 'flag' ? flagScreen : classicScreen;
    showScreen(returnScreen);
    mapContainer.innerHTML = '<div class="tooltip" id="tooltip"></div>';
    updateStartScreenProgress();
  });

  // --- Home → Classic ---
  document.getElementById('classicModeBtn').addEventListener('click', () => {
    showScreen(classicScreen);
    updateStartScreenProgress();
  });

  // --- Home → Target ---
  document.getElementById('practiceModeBtn').addEventListener('click', () => {
    showScreen(practiceScreen);
    updateStartScreenProgress();
  });

  // --- Home → Flag ---
  document.getElementById('flagModeBtn').addEventListener('click', () => {
    showScreen(flagScreen);
    updateStartScreenProgress();
  });

  // --- Classic → Home ---
  document.getElementById('classicBackBtn').addEventListener('click', () => {
    showScreen(homeScreen);
  });

  // --- Target → Home ---
  document.getElementById('practiceBackBtn').addEventListener('click', () => {
    showScreen(homeScreen);
  });

  // --- Flag → Home ---
  document.getElementById('flagBackBtn').addEventListener('click', () => {
    showScreen(homeScreen);
  });

  // --- Mode tabs ---
  let activeMode = 'both'; // 'countries', 'capitals', 'both'
  let practiceMode = 'countries'; // 'countries', 'capitals'

  // Classic mode tabs
  const classicModeTabs = document.querySelectorAll('#classicModeTabs .mode-tab');
  classicModeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      classicModeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeMode = tab.dataset.mode;
      updateStartScreenProgress();
    });
  });

  // Target mode tabs
  const practiceModeTabs = document.querySelectorAll('#practiceModeTabs .mode-tab');
  practiceModeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      practiceModeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      practiceMode = tab.dataset.mode;
      updateStartScreenProgress();
    });
  });

  // --- localStorage helpers (best score + time) ---
  function bestKey(region, mode, type) {
    const t = type || gameType;
    const prefix = t === 'target' ? 'target_best_' : t === 'flag' ? 'flag_best_' : 'capitals_best_';
    const m = mode || (t === 'flag' ? 'countries' : t === 'target' ? practiceMode : activeMode);
    return prefix + region.replace(/\s+/g, '_') + '_' + m;
  }

  function getBest(region, mode, type) {
    try {
      const raw = localStorage.getItem(bestKey(region, mode, type));
      if (!raw) return { score: 0, time: null };
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'number') return { score: parsed, time: null };
      return parsed;
    } catch { return { score: 0, time: null }; }
  }

  function saveBestIfNeeded() {
    const current = countCompleted();
    const total = mapCountryAlphaIds.size;
    const prev = getBest(activeRegion, activeMode);
    const elapsed = Date.now() - gameStartTime;

    let dominated = false;
    if (current > prev.score) {
      dominated = true;
    } else if (current === prev.score && current === total && total > 0) {
      // Same perfect score — save only if faster
      if (prev.time === null || elapsed < prev.time) dominated = true;
    }

    if (dominated) {
      const best = { score: current, time: (current === total && total > 0) ? elapsed : null };
      localStorage.setItem(bestKey(activeRegion, activeMode), JSON.stringify(best));
    }
    updateStartScreenProgress();
  }

  // --- Populate region counts on classic screen ---
  const regions = ['World', 'Asia', 'Europe', 'Africa', 'North America', 'South America', 'Oceania'];

  function updateStartScreenProgress() {
    regions.forEach(r => {
      const total = r === 'World'
        ? COUNTRIES.length
        : COUNTRIES.filter(c => c.continent === r).length;

      // Classic screen
      const el = document.querySelector(`[data-region-count="${r}"]`);
      if (el) {
        const best = getBest(r, activeMode, 'classic');
        if (best.score > 0) {
          let text = `Best: ${best.score} / ${total}`;
          if (best.score === total && best.time !== null) {
            text += ` (${formatTime(best.time)})`;
          }
          el.textContent = text;
        } else {
          el.textContent = `${total} countries`;
        }

        let bar = el.parentNode.querySelector('.region-progress-bar');
        if (!bar) {
          bar = document.createElement('div');
          bar.className = 'region-progress-bar';
          const fill = document.createElement('div');
          fill.className = 'region-progress-fill';
          bar.appendChild(fill);
          el.parentNode.appendChild(bar);
        }
        bar.querySelector('.region-progress-fill').style.width =
          total > 0 ? (best.score / total * 100) + '%' : '0%';
      }

      // Flag screen
      const fel = document.querySelector(`[data-region-count-flag="${r}"]`);
      if (fel) {
        const best = getBest(r, 'countries', 'flag');
        if (best.score > 0) {
          let text = `Best: ${best.score} / ${total}`;
          if (best.score === total && best.time !== null) {
            text += ` (${formatTime(best.time)})`;
          }
          fel.textContent = text;
        } else {
          fel.textContent = `${total} countries`;
        }

        let bar = fel.parentNode.querySelector('.region-progress-bar');
        if (!bar) {
          bar = document.createElement('div');
          bar.className = 'region-progress-bar';
          const fill = document.createElement('div');
          fill.className = 'region-progress-fill';
          bar.appendChild(fill);
          fel.parentNode.appendChild(bar);
        }
        bar.querySelector('.region-progress-fill').style.width =
          total > 0 ? (best.score / total * 100) + '%' : '0%';
      }

      // Target screen
      const pel = document.querySelector(`[data-region-count-practice="${r}"]`);
      if (pel) {
        const best = getBest(r, practiceMode, 'target');
        if (best.score > 0) {
          let text = `Best: ${best.score} / ${total}`;
          if (best.score === total && best.time !== null) {
            text += ` (${formatTime(best.time)})`;
          }
          pel.textContent = text;
        } else {
          pel.textContent = `${total} countries`;
        }

        let bar = pel.parentNode.querySelector('.region-progress-bar');
        if (!bar) {
          bar = document.createElement('div');
          bar.className = 'region-progress-bar';
          const fill = document.createElement('div');
          fill.className = 'region-progress-fill';
          bar.appendChild(fill);
          pel.parentNode.appendChild(bar);
        }
        bar.querySelector('.region-progress-fill').style.width =
          total > 0 ? (best.score / total * 100) + '%' : '0%';
      }
    });
  }

  updateStartScreenProgress();

  // --- Small nations that are tiny/missing on the 110m map ---
  const SMALL_NATIONS = {
    "336": { lat: 41.9, lng: 12.45 },
    "492": { lat: 43.73, lng: 7.42 },
    "674": { lat: 43.94, lng: 12.46 },
    "438": { lat: 47.17, lng: 9.51 },
    "020": { lat: 42.55, lng: 1.58 },
    "470": { lat: 35.94, lng: 14.40 },
    "702": { lat: 1.35, lng: 103.82 },
    "048": { lat: 26.07, lng: 50.55 },
    "462": { lat: 3.20, lng: 73.22 },
    "174": { lat: -12.17, lng: 44.25 },
    "678": { lat: 0.19, lng: 6.61 },
    "690": { lat: -4.68, lng: 55.49 },
    "028": { lat: 17.06, lng: -61.80 },
    "052": { lat: 13.19, lng: -59.54 },
    "212": { lat: 15.41, lng: -61.37 },
    "308": { lat: 12.12, lng: -61.67 },
    "659": { lat: 17.36, lng: -62.78 },
    "662": { lat: 13.91, lng: -60.98 },
    "670": { lat: 13.16, lng: -61.23 },
    "776": { lat: -21.18, lng: -175.20 },
    "882": { lat: -13.76, lng: -172.10 },
    "296": { lat: 1.87, lng: -157.36 },
    "584": { lat: 7.13, lng: 171.18 },
    "583": { lat: 6.92, lng: 158.16 },
    "585": { lat: 7.51, lng: 134.58 },
    "520": { lat: -0.52, lng: 166.93 },
    "798": { lat: -7.11, lng: 177.64 },
    "480": { lat: -20.35, lng: 57.55 },
    "132": { lat: 16.00, lng: -24.01 },
  };

  // --- DOM: Sidebar ---
  const countryList = document.getElementById('countryList');

  // --- Game state ---
  let activeRegion = 'World';
  let activeCountries = [];
  let shuffledCountries = [];
  let progress = {};
  let numIdToCountry = {};
  let nameToCountry = {};
  let mapCountryIds = new Set();
  let activeNumIds = new Set();
  let mapCountryAlphaIds = new Set();
  let countryColors = {};

  // --- Start game ---
  document.querySelectorAll('#classicRegionGrid .region-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      gameType = 'classic';
      activeRegion = btn.dataset.region;
      startGame();
    });
  });

  document.querySelectorAll('#practiceRegionGrid .region-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      gameType = 'target';
      activeMode = practiceMode; // sync activeMode for target
      activeRegion = btn.dataset.region;
      startGame();
    });
  });

  document.querySelectorAll('#flagRegionGrid .region-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      gameType = 'flag';
      activeMode = 'countries';
      activeRegion = btn.dataset.region;
      startGame();
    });
  });

  backBtn.addEventListener('click', () => {
    stopTimer();
    const returnScreen = gameType === 'target' ? practiceScreen : gameType === 'flag' ? flagScreen : classicScreen;
    showScreen(returnScreen);
    mapContainer.innerHTML = '<div class="tooltip" id="tooltip"></div>';
    updateStartScreenProgress();
  });

  function startGame() {
    showScreen(gameScreen);
    regionBadge.textContent = activeRegion === 'World' ? 'World Map' : activeRegion;

    // Mode badge & input hints
    const modeLabels = { countries: 'Countries', capitals: 'Capitals', both: 'Both' };
    if (gameType === 'flag') {
      modeBadge.textContent = 'Flag Quiz';
    } else if (gameType === 'target') {
      modeBadge.textContent = `Target · ${modeLabels[activeMode]}`;
    } else {
      modeBadge.textContent = modeLabels[activeMode];
    }

    // Toggle sidebar between country list and flag display
    const countryListEl = document.getElementById('countryList');
    const sidebarEl = document.getElementById('sidebar');
    if (gameType === 'flag') {
      countryListEl.classList.add('hidden');
      flagDisplay.classList.remove('hidden');
      flagDisplay.classList.add('flex');
      sidebarHeader.textContent = 'Flag';
      sidebarEl.classList.remove('hide-mobile');
    } else {
      countryListEl.classList.remove('hidden');
      flagDisplay.classList.add('hidden');
      flagDisplay.classList.remove('flex');
      sidebarHeader.textContent = 'Countries';
      sidebarEl.classList.add('hide-mobile');
    }

    if (gameType === 'flag') {
      inputLabel.textContent = 'Country:';
      userInput.placeholder = 'Name this country...';
    } else if (gameType === 'target') {
      // Target mode: label updated per target in pickNextTarget()
      inputLabel.textContent = activeMode === 'countries' ? 'Country:' : 'Capital:';
      userInput.placeholder = activeMode === 'countries' ? 'Name this country...' : 'Name the capital...';
    } else if (activeMode === 'countries') {
      inputLabel.textContent = 'Country:';
      userInput.placeholder = 'Type a country name...';
    } else if (activeMode === 'capitals') {
      inputLabel.textContent = 'Capital:';
      userInput.placeholder = 'Type a capital city...';
    } else {
      inputLabel.textContent = 'Country or Capital:';
      userInput.placeholder = 'Type a country name or capital city...';
    }

    // Filter countries
    activeCountries = activeRegion === 'World'
      ? COUNTRIES
      : COUNTRIES.filter(c => c.continent === activeRegion);

    // Reset state
    progress = {};
    countryColors = {};
    numIdToCountry = {};
    nameToCountry = {};
    mapCountryIds = new Set();
    mapCountryAlphaIds = new Set();
    activeNumIds = new Set();
    practiceTarget = null;
    practiceRemaining = [];
    flagTarget = null;
    flagRemaining = [];

    COUNTRIES.forEach(c => {
      numIdToCountry[c.numId] = c;
      numIdToCountry[String(Number(c.numId))] = c;
    });

    activeCountries.forEach(c => {
      progress[c.id] = { nameFound: false, capitalFound: false };
      activeNumIds.add(c.numId);
      activeNumIds.add(String(Number(c.numId)));
      nameToCountry[c.name.toLowerCase()] = c;
      if (c.altNames) {
        c.altNames.forEach(alt => {
          nameToCountry[alt.toLowerCase()] = c;
        });
      }
    });

    feedback.textContent = '';
    feedback.className = feedbackBase;

    buildSidebar();
    buildMap();
  }

  // --- Completion logic (mode-aware) ---
  function isCompleted(countryId) {
    const p = progress[countryId];
    if (!p) return false;
    if (activeMode === 'countries') return p.nameFound;
    if (activeMode === 'capitals') return p.capitalFound;
    return p.nameFound && p.capitalFound;
  }

  function isHalfKnown(countryId) {
    if (activeMode !== 'both') return false;
    const p = progress[countryId];
    return p && (p.nameFound || p.capitalFound) && !(p.nameFound && p.capitalFound);
  }

  function countCompleted() {
    let count = 0;
    for (const c of activeCountries) {
      if (mapCountryAlphaIds.has(c.id) && isCompleted(c.id)) count++;
    }
    return count;
  }

  // --- Levenshtein distance ---
  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }

  function normalize(str) {
    return str.trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/['']/g, "'")
      .replace(/\s+/g, ' ');
  }

  function findCountryByCapital(input) {
    if (activeMode === 'countries') return null;
    const norm = normalize(input);
    for (const c of activeCountries) {
      const targets = [c.capital];
      if (c.altCapitals) targets.push(...c.altCapitals);
      for (const target of targets) {
        if (norm === normalize(target)) return c;
      }
    }
    let bestMatch = null;
    let bestDist = Infinity;
    for (const c of activeCountries) {
      const targets = [c.capital];
      if (c.altCapitals) targets.push(...c.altCapitals);
      for (const target of targets) {
        const normTarget = normalize(target);
        const lenDiff = Math.abs(norm.length - normTarget.length);
        if (lenDiff > 2) continue;
        const dist = levenshtein(norm, normTarget);
        const maxDist = normTarget.length <= 5 ? 1 : 2;
        if (dist <= maxDist && dist < bestDist) {
          bestDist = dist;
          bestMatch = c;
        }
      }
    }
    return bestMatch;
  }

  function findCountryByName(input) {
    if (activeMode === 'capitals') return null;
    const norm = normalize(input);
    return nameToCountry[norm] || null;
  }

  // --- Shuffle helper ---
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // --- Sidebar ---
  function buildSidebar() {
    countryList.innerHTML = '';
    shuffledCountries = shuffle(activeCountries);
    shuffledCountries.forEach(c => {
      const li = document.createElement('li');
      li.className = 'country-list-item';
      li.dataset.countryId = c.id;
      li.dataset.numId = c.numId;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'cl-name';
      const showNameByDefault = activeMode === 'capitals' || (gameType === 'target' && activeMode === 'capitals');
      nameSpan.textContent = showNameByDefault ? c.name : '????';
      if (showNameByDefault) nameSpan.classList.add('revealed');

      const capSpan = document.createElement('span');
      capSpan.className = 'cl-capital';
      if (activeMode === 'countries') {
        capSpan.style.display = 'none';
      } else {
        capSpan.textContent = '????';
      }

      li.appendChild(nameSpan);
      li.appendChild(capSpan);

      li.addEventListener('mouseenter', () => {
        queryByNumId(c.numId).forEach(el => el.classList.add('highlight'));
      });
      li.addEventListener('mouseleave', () => {
        queryByNumId(c.numId).forEach(el => el.classList.remove('highlight'));
      });

      countryList.appendChild(li);
    });
  }

  function updateSidebarItem(country) {
    const li = countryList.querySelector(`[data-country-id="${country.id}"]`);
    if (!li) return;
    const p = progress[country.id];
    const nameSpan = li.querySelector('.cl-name');
    const capSpan = li.querySelector('.cl-capital');

    if (p.nameFound && activeMode !== 'capitals') {
      nameSpan.textContent = country.name;
      nameSpan.classList.add('revealed');
    }
    if (p.capitalFound && activeMode !== 'countries') {
      capSpan.textContent = country.capital;
      capSpan.classList.add('revealed');
    }
    if (isCompleted(country.id)) {
      li.classList.add('completed-item');
    }
  }

  function queryByNumId(numId) {
    const padded = numId;
    const unpadded = String(Number(numId));
    if (padded === unpadded) return document.querySelectorAll(`[data-num-id="${padded}"]`);
    return document.querySelectorAll(`[data-num-id="${padded}"], [data-num-id="${unpadded}"]`);
  }

  // Resurrect 64 palette
  const FILL_COLORS = [
    '#ea4f36', '#f57d4a', '#f79617', '#f9c22b', '#fbb954',
    '#e83b3b', '#fb6b1d', '#fbff86', '#d5e04b', '#cddf6c',
    '#a2a947', '#91db69', '#1ebc73', '#30e1b9', '#8ff8e2',
    '#0eaf9b', '#0b8a8f', '#4d9be6', '#8fd3ff', '#4d65b4',
    '#a884f3', '#eaaded', '#905ea9', '#cf657f', '#ed8099',
    '#f68181', '#fca790', '#fdcbb0', '#f04f78', '#c32454',
    '#a24b6f', '#e6904e', '#cd683d', '#ab947a', '#c7dcd0',
    '#9babb2', '#92a984', '#b2ba90', '#8ff8e2', '#239063',
  ];

  function getCountryColor(countryId) {
    if (!countryColors[countryId]) {
      countryColors[countryId] = FILL_COLORS[Math.floor(Math.random() * FILL_COLORS.length)];
    }
    return countryColors[countryId];
  }

  function createFillOverlay(pathEl, country, fillPercent, animate, color) {
    const svg = pathEl.closest('svg');
    const g = pathEl.parentNode;
    let defs = svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svg.insertBefore(defs, svg.firstChild);
    }

    const uid = 'fill-' + country.id + '-' + Math.random().toString(36).slice(2, 6);
    const bbox = pathEl.getBBox();

    const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
    clipPath.setAttribute('id', uid);
    const useEl = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    if (!pathEl.id) pathEl.id = 'path-' + country.id + '-' + Math.random().toString(36).slice(2, 6);
    useEl.setAttribute('href', '#' + pathEl.id);
    clipPath.appendChild(useEl);
    defs.appendChild(clipPath);

    g.querySelectorAll(`.fill-overlay[data-country="${country.id}"]`).forEach(e => e.remove());

    const fillGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    fillGroup.setAttribute('class', 'fill-overlay');
    fillGroup.setAttribute('data-country', country.id);
    fillGroup.setAttribute('clip-path', `url(#${uid})`);
    fillGroup.style.pointerEvents = 'none';

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', bbox.x - 2);
    rect.setAttribute('width', bbox.width + 4);
    rect.setAttribute('fill', color);
    rect.setAttribute('opacity', fillPercent >= 1 ? '0.92' : '0.55');

    const wave = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    wave.setAttribute('fill', color);
    wave.setAttribute('opacity', fillPercent >= 1 ? '1' : '0.7');

    fillGroup.appendChild(rect);
    fillGroup.appendChild(wave);

    if (pathEl.nextSibling) {
      g.insertBefore(fillGroup, pathEl.nextSibling);
    } else {
      g.appendChild(fillGroup);
    }

    const fullHeight = bbox.height;
    const targetHeight = fullHeight * fillPercent;
    const targetY = bbox.y + fullHeight - targetHeight;
    const waveAmp = Math.min(bbox.width * 0.04, fullHeight * 0.06, 6);
    const waveLen = bbox.width * 0.5;

    function buildWavePath(y, amp, phase) {
      const left = bbox.x - 2;
      const right = bbox.x + bbox.width + 2;
      const bottom = bbox.y + fullHeight + 2;
      const steps = 20;
      const dx = (right - left) / steps;
      let d = `M ${left} ${y}`;
      for (let i = 0; i <= steps; i++) {
        const wx = left + i * dx;
        const wy = y + Math.sin((wx - left) / waveLen * Math.PI * 2 + phase) * amp;
        d += ` L ${wx} ${wy}`;
      }
      d += ` L ${right} ${bottom} L ${left} ${bottom} Z`;
      return d;
    }

    if (animate) {
      const startPercent = fillPercent >= 1 ? 0.5 : 0;
      const startHeight = fullHeight * startPercent;
      const startY = bbox.y + fullHeight - startHeight;

      rect.setAttribute('y', startY);
      rect.setAttribute('height', startHeight);
      wave.setAttribute('d', buildWavePath(startY, 0, 0));

      const fillDuration = fillPercent >= 1 ? 1200 : 900;
      const startTime = performance.now();

      function animateFill(now) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / fillDuration, 1);
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        const currentHeight = startHeight + (targetHeight - startHeight) * ease;
        const currentY = bbox.y + fullHeight - currentHeight;

        rect.setAttribute('y', currentY);
        rect.setAttribute('height', currentHeight);

        const waveProgress = 1 - Math.abs(t - 0.5) * 2;
        const currentAmp = waveAmp * waveProgress * (1 + Math.sin(elapsed * 0.008) * 0.3);
        const phase = elapsed * 0.006;
        wave.setAttribute('d', buildWavePath(currentY, currentAmp, phase));

        if (t < 1) {
          requestAnimationFrame(animateFill);
        } else {
          const settleStart = performance.now();
          const settleDuration = 600;
          function settleWave(now2) {
            const st = Math.min((now2 - settleStart) / settleDuration, 1);
            const dampAmp = waveAmp * 0.5 * (1 - st);
            const sp = (now2 - settleStart) * 0.008;
            wave.setAttribute('d', buildWavePath(targetY, dampAmp, sp));
            if (st < 1) {
              requestAnimationFrame(settleWave);
            } else {
              wave.setAttribute('d', buildWavePath(targetY, 0, 0));
              if (fillPercent >= 1) {
                rect.setAttribute('opacity', '0.92');
                wave.setAttribute('opacity', '1');
              }
            }
          }
          requestAnimationFrame(settleWave);
        }
      }

      requestAnimationFrame(animateFill);
    } else {
      rect.setAttribute('y', targetY);
      rect.setAttribute('height', targetHeight);
      wave.setAttribute('d', buildWavePath(targetY, 0, 0));
    }
  }

  function updateCountryAppearance(country) {
    const els = queryByNumId(country.numId);
    const p = progress[country.id];
    if (!p) return;

    const color = getCountryColor(country.id);
    const completed = isCompleted(country.id);
    const half = isHalfKnown(country.id);

    if (completed) {
      els.forEach(el => {
        if (el.tagName === 'path') {
          el.classList.remove('half-known');
          el.classList.add('completed');
          createFillOverlay(el, country, 1.0, true, color);
        } else {
          el.classList.remove('half-known');
          el.classList.add('completed', 'just-completed');
          el.style.fill = color;
          setTimeout(() => el.classList.remove('just-completed'), 800);
        }
      });
    } else if (half) {
      els.forEach(el => {
        if (el.tagName === 'path') {
          el.classList.add('half-known');
          createFillOverlay(el, country, 0.5, true, color);
        } else {
          el.classList.add('half-known');
          el.style.fill = color;
          el.style.opacity = '0.6';
        }
      });
    }

    updateSidebarItem(country);
  }

  function updateProgress() {
    const total = mapCountryAlphaIds.size;
    const done = countCompleted();
    completedCount.textContent = done;
    totalCount.textContent = total;
    progressFill.style.width = total > 0 ? (done / total * 100) + '%' : '0%';
  }

  const feedbackBase = 'feedback text-sm font-semibold ml-2 min-h-[1.2em]';

  function showFeedback(msg, type) {
    feedback.textContent = msg;
    feedback.className = feedbackBase + ' ' + type;
    if (type !== 'info') {
      setTimeout(() => { feedback.textContent = ''; feedback.className = feedbackBase; }, 3500);
    }
  }

  // --- Target mode helpers ---
  function clearTargetHighlight() {
    document.querySelectorAll('.practice-target').forEach(el => el.classList.remove('practice-target'));
  }

  function pickNextTarget() {
    clearTargetHighlight();
    if (practiceRemaining.length === 0) {
      practiceTarget = null;
      return;
    }
    practiceTarget = practiceRemaining.shift();

    // Highlight target on map
    queryByNumId(practiceTarget.numId).forEach(el => el.classList.add('practice-target'));

    // Update input label
    if (activeMode === 'capitals') {
      inputLabel.textContent = `Capital of ${practiceTarget.name}?`;
      userInput.placeholder = 'Type the capital...';
    } else {
      inputLabel.textContent = 'Which country is this?';
      userInput.placeholder = 'Name this country...';
    }

    userInput.value = '';
    userInput.focus();
  }

  // --- Flag mode helpers ---
  function pickNextFlag() {
    if (flagRemaining.length === 0) {
      flagTarget = null;
      flagImage.src = '';
      flagHint.textContent = '';
      return;
    }
    flagTarget = flagRemaining.shift();
    flagImage.src = `https://flagcdn.com/w320/${flagTarget.id.toLowerCase()}.png`;
    flagImage.alt = 'Flag';
    flagHint.textContent = `${countCompleted() + 1} / ${mapCountryAlphaIds.size}`;
    userInput.value = '';
    userInput.focus();
  }

  function handleSubmit() {
    const val = userInput.value.trim();
    if (!val) return;

    // --- Flag mode submit ---
    if (gameType === 'flag' && flagTarget) {
      const norm = normalize(val);
      const targets = [flagTarget.name];
      if (flagTarget.altNames) targets.push(...flagTarget.altNames);
      const correct = targets.some(t => normalize(t) === norm);

      if (correct) {
        const p = progress[flagTarget.id];
        p.nameFound = true;

        updateCountryAppearance(flagTarget);
        updateProgress();
        showFeedback(`${flagTarget.name} — correct!`, 'success');

        saveBestIfNeeded();

        if (countCompleted() === mapCountryAlphaIds.size && mapCountryAlphaIds.size > 0) {
          showCelebration();
        } else {
          pickNextFlag();
        }
      } else {
        showFeedback(`Wrong! That's ${flagTarget.name}.`, 'error');
        userInput.classList.add('shake');
        gameScreen.classList.add('flash-error');
        setTimeout(() => {
          userInput.classList.remove('shake');
          gameScreen.classList.remove('flash-error');
        }, 400);
        userInput.value = '';
        userInput.focus();
      }
      return;
    }

    // --- Target mode submit ---
    if (gameType === 'target' && practiceTarget) {
      const norm = normalize(val);
      let correct = false;

      if (activeMode === 'countries') {
        // Must match the target country's name exactly
        const targets = [practiceTarget.name];
        if (practiceTarget.altNames) targets.push(...practiceTarget.altNames);
        correct = targets.some(t => normalize(t) === norm);
      } else {
        // Capital: fuzzy match against target's capital
        const targets = [practiceTarget.capital];
        if (practiceTarget.altCapitals) targets.push(...practiceTarget.altCapitals);
        // Exact first
        correct = targets.some(t => normalize(t) === norm);
        // Fuzzy fallback
        if (!correct) {
          for (const t of targets) {
            const normT = normalize(t);
            const lenDiff = Math.abs(norm.length - normT.length);
            if (lenDiff > 2) continue;
            const dist = levenshtein(norm, normT);
            const maxDist = normT.length <= 5 ? 1 : 2;
            if (dist <= maxDist) { correct = true; break; }
          }
        }
      }

      if (correct) {
        const p = progress[practiceTarget.id];
        if (activeMode === 'countries') p.nameFound = true;
        else p.capitalFound = true;

        updateCountryAppearance(practiceTarget);
        updateProgress();
        showFeedback(activeMode === 'countries'
          ? `${practiceTarget.name} — correct!`
          : `${practiceTarget.capital} — correct!`, 'success');

        saveBestIfNeeded();

        if (countCompleted() === mapCountryAlphaIds.size && mapCountryAlphaIds.size > 0) {
          clearTargetHighlight();
          showCelebration();
        } else {
          pickNextTarget();
        }
      } else {
        showFeedback(activeMode === 'countries'
          ? `Wrong! That's ${practiceTarget.name}.`
          : `Wrong! The capital is ${practiceTarget.capital}.`, 'error');
        userInput.classList.add('shake');
        gameScreen.classList.add('flash-error');
        setTimeout(() => {
          userInput.classList.remove('shake');
          gameScreen.classList.remove('flash-error');
        }, 400);
        userInput.value = '';
        userInput.focus();
      }
      return;
    }

    // --- Classic mode submit ---
    const byName = findCountryByName(val);
    const byCapital = findCountryByCapital(val);
    let matched = false;

    if (byName) {
      const p = progress[byName.id];
      if (!p.nameFound) {
        p.nameFound = true;
        matched = true;
        if (activeMode === 'countries') {
          showFeedback(`${byName.name} found!`, 'success');
        } else if (p.capitalFound) {
          showFeedback(`${byName.name} completed! Both facts known.`, 'success');
        } else {
          showFeedback(`${byName.name} — country name found! Now find its capital.`, 'success');
        }
        updateCountryAppearance(byName);
        updateProgress();
      } else if (isCompleted(byName.id)) {
        showFeedback(`${byName.name} is already completed!`, 'info');
        matched = true;
      } else {
        showFeedback(`${byName.name} — name already known. Still need the capital!`, 'info');
        matched = true;
      }
    }

    if (byCapital && !matched) {
      const p = progress[byCapital.id];
      if (!p.capitalFound) {
        p.capitalFound = true;
        matched = true;
        if (activeMode === 'capitals') {
          showFeedback(`${byCapital.capital} found!`, 'success');
        } else if (p.nameFound) {
          showFeedback(`${byCapital.capital} is correct! ${byCapital.name} completed!`, 'success');
        } else {
          showFeedback(`${byCapital.capital} — capital found! Now name the country.`, 'success');
        }
        updateCountryAppearance(byCapital);
        updateProgress();
      } else if (isCompleted(byCapital.id)) {
        showFeedback(`${byCapital.name} is already completed!`, 'info');
        matched = true;
      } else {
        showFeedback(`${byCapital.capital} — capital already known. Still need the country name!`, 'info');
        matched = true;
      }
    }

    // Input matches both a country name AND a different country's capital
    if (byName && byCapital && byName.id !== byCapital.id) {
      const pCap = progress[byCapital.id];
      if (pCap && !pCap.capitalFound) {
        pCap.capitalFound = true;
        if (pCap.nameFound || activeMode === 'capitals') {
          showFeedback(feedback.textContent + ` ${byCapital.name} also completed!`, 'success');
        } else {
          showFeedback(feedback.textContent + ` Also matched capital of ${byCapital.name}!`, 'success');
        }
        updateCountryAppearance(byCapital);
        updateProgress();
      }
      matched = true;
    }

    if (!matched) {
      showFeedback('No match found. Check your spelling!', 'error');
      userInput.classList.add('shake');
      gameScreen.classList.add('flash-error');
      setTimeout(() => {
        userInput.classList.remove('shake');
        gameScreen.classList.remove('flash-error');
      }, 400);
    }

    userInput.value = '';
    userInput.focus();

    if (matched) saveBestIfNeeded();

    if (countCompleted() === mapCountryAlphaIds.size && mapCountryAlphaIds.size > 0) {
      showCelebration();
    }
  }

  // --- Celebration ---
  function showCelebration() {
    stopTimer();
    finalTime = Date.now() - gameStartTime;
    timerDisplay.textContent = formatTime(finalTime);

    const regionLabel = activeRegion === 'World' ? 'World Map' : activeRegion;
    const modeLabels = { countries: 'country', capitals: 'capital', both: 'country and capital' };
    const prev = getBest(activeRegion, activeMode, gameType);
    const isNewRecord = prev.time === null || finalTime < prev.time;

    let subtitle = gameType === 'flag'
      ? `You identified every flag in ${regionLabel}!`
      : `You named every ${modeLabels[activeMode]} in ${regionLabel}!`;
    subtitle += `<br>Time: ${formatTime(finalTime)}`;
    if (!isNewRecord && prev.time !== null) {
      subtitle += ` (Best: ${formatTime(prev.time)})`;
    } else if (prev.time !== null) {
      subtitle += ` — New record!`;
    }

    celebrationSubtitle.innerHTML = subtitle;
    celebrationOverlay.classList.remove('hidden');
    launchConfetti();
  }

  function launchConfetti() {
    const canvas = confettiCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#FFC8DD', '#BDE0FE', '#BAFFC9', '#CDB4DB', '#FEC89A',
                    '#FFB3BA', '#FFDFBA', '#A2D2FF', '#D4E09B', '#E8BAFF'];
    const particles = [];
    const count = 150;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 8 + 4,
        h: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 3 + 2,
        rot: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 8,
        opacity: 1,
      });
    }

    let frame = 0;
    const maxFrames = 300;

    function animate() {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx;
        p.vy += 0.04;
        p.y += p.vy;
        p.rot += p.rotSpeed;
        if (frame > maxFrames - 60) p.opacity = Math.max(0, p.opacity - 0.02);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * Math.PI / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      if (frame < maxFrames) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    requestAnimationFrame(animate);
  }

  submitBtn.addEventListener('click', handleSubmit);
  userInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSubmit();
  });

  // --- Build map ---
  function buildMap() {
    mapContainer.innerHTML = '<div class="tooltip" id="tooltip"></div>';
    const tooltipEl = document.getElementById('tooltip');

    const width = mapContainer.clientWidth;
    const height = mapContainer.clientHeight || 500;

    const svg = d3.select('#mapContainer')
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const g = svg.append('g');

    const zoom = d3.zoom()
      .scaleExtent([1, 12])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    const projection = d3.geoNaturalEarth1()
      .scale(width / 5.5)
      .translate([width / 2, height / 2]);

    const pathGen = d3.geoPath().projection(projection);

    svg.insert('rect', ':first-child')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('fill', '#0d1117');

    const graticule = d3.geoGraticule();
    g.append('path')
      .datum(graticule())
      .attr('d', pathGen)
      .attr('fill', 'none')
      .attr('stroke', '#1a1a2e')
      .attr('stroke-width', 0.3);

    d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(world => {
        const countries = topojson.feature(world, world.objects.countries).features;

        g.selectAll('.country-path')
          .data(countries)
          .enter()
          .append('path')
          .attr('class', d => {
            const inRegion = activeNumIds.has(d.id);
            return 'country-path' + (inRegion ? '' : ' out-of-region');
          })
          .attr('d', pathGen)
          .attr('data-num-id', d => d.id)
          .on('mousemove', function (event, d) {
            const country = numIdToCountry[d.id];
            if (!country || !activeNumIds.has(d.id)) return;
            const p = progress[country.id];
            let text = '???';
            if (p && p.nameFound && p.capitalFound) {
              text = `${country.name} — ${country.capital}`;
            } else if (p && p.nameFound) {
              text = activeMode === 'countries' ? country.name : `${country.name} — capital: ???`;
            } else if (p && p.capitalFound) {
              text = activeMode === 'capitals' ? country.capital : `??? — ${country.capital}`;
            }
            tooltipEl.textContent = text;
            tooltipEl.classList.add('visible');
            const rect = mapContainer.getBoundingClientRect();
            tooltipEl.style.left = (event.clientX - rect.left + 12) + 'px';
            tooltipEl.style.top = (event.clientY - rect.top - 30) + 'px';
          })
          .on('mouseleave', function () {
            tooltipEl.classList.remove('visible');
          });

        mapCountryIds.clear();
        mapCountryAlphaIds = new Set();
        countries.forEach(d => {
          const country = numIdToCountry[d.id];
          if (country && activeNumIds.has(d.id)) {
            mapCountryIds.add(d.id);
            mapCountryAlphaIds.add(country.id);
          }
        });

        const markerGroup = g.append('g').attr('class', 'small-markers');
        activeCountries.forEach(c => {
          const coords = SMALL_NATIONS[c.numId];
          if (!coords) return;
          const [cx, cy] = projection([coords.lng, coords.lat]);
          if (cx == null || cy == null) return;

          markerGroup.append('circle')
            .attr('class', 'country-marker' + (activeNumIds.has(c.numId) ? '' : ' out-of-region'))
            .attr('data-num-id', c.numId)
            .attr('cx', cx)
            .attr('cy', cy)
            .attr('r', 4)
            .on('mousemove', function (event) {
              const p = progress[c.id];
              let text = '???';
              if (p && p.nameFound && p.capitalFound) {
                text = `${c.name} — ${c.capital}`;
              } else if (p && p.nameFound) {
                text = activeMode === 'countries' ? c.name : `${c.name} — capital: ???`;
              } else if (p && p.capitalFound) {
                text = activeMode === 'capitals' ? c.capital : `??? — ${c.capital}`;
              }
              tooltipEl.textContent = text;
              tooltipEl.classList.add('visible');
              const rect = mapContainer.getBoundingClientRect();
              tooltipEl.style.left = (event.clientX - rect.left + 12) + 'px';
              tooltipEl.style.top = (event.clientY - rect.top - 30) + 'px';
            })
            .on('mouseleave', function () {
              tooltipEl.classList.remove('visible');
            });

          mapCountryIds.add(c.numId);
          mapCountryAlphaIds.add(c.id);
        });

        updateProgress();
        userInput.value = '';
        userInput.focus();
        startTimer();

        // Initialize target/flag mode queue after map is ready
        if (gameType === 'target') {
          practiceRemaining = shuffle(activeCountries.filter(c => mapCountryAlphaIds.has(c.id)));
          pickNextTarget();
        } else if (gameType === 'flag') {
          flagRemaining = shuffle([...activeCountries]);
          pickNextFlag();
        }

        if (activeRegion !== 'World') {
          const regionFeatures = countries.filter(d => activeNumIds.has(d.id));
          if (regionFeatures.length > 0) {
            const bounds = pathGen.bounds({
              type: 'FeatureCollection',
              features: regionFeatures
            });
            const dx = bounds[1][0] - bounds[0][0];
            const dy = bounds[1][1] - bounds[0][1];
            const x = (bounds[0][0] + bounds[1][0]) / 2;
            const y = (bounds[0][1] + bounds[1][1]) / 2;
            const scale = Math.min(8, 0.85 / Math.max(dx / width, dy / height));
            const translate = [width / 2 - scale * x, height / 2 - scale * y];

            svg.transition().duration(750).call(
              zoom.transform,
              d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
            );
          }
        }
      })
      .catch(err => {
        showFeedback('Failed to load map data. Check your internet connection.', 'error');
        console.error(err);
      });
  }
})();
