// js/addgame.js
(function () {
  const REDIRECT_DELAY_MS = 1500;
  const ROLES = [
    { key: 'jungler',   label: 'Jungler' },
    { key: 'roamer',    label: 'Roamer' },
    { key: 'midlaner',  label: 'Mid Laner' },
    { key: 'explaner',  label: 'Exp Laner' },
    { key: 'goldlaner', label: 'Gold Laner' },
  ];

  // Role mapping: key -> nilai primary_role di DB
  const ROLE_DB_MAP = {
    jungler:   'jungler',
    roamer:    'roamer',
    midlaner:  'midlaner',
    explaner:  'explaner',
    goldlaner: 'goldlaner',
  };

  let matchId    = 0;
  let gameNumber = 0;

  let allPlayers = []; // [{ id, name, primary_role }]
  let allHeroes  = []; // ['Hero A', 'Hero B', ...]

  const apiBase = () => window.EsportConfig ? window.EsportConfig.apiBase : 'db/';

  function showToast(msg, type) {
    if (window.Esport && typeof window.Esport.showToast === 'function') {
      window.Esport.showToast(msg, type);
    }
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function updateNavLinks(mid) {
    const gameUrl = `game.html?match_id=${mid}`;
    const backBtn = document.getElementById('backBtn');
    const breadcrumbGame = document.getElementById('breadcrumbGame');
    if (backBtn)        backBtn.href = gameUrl;
    if (breadcrumbGame) breadcrumbGame.href = gameUrl;
  }

  // ═══════════════════════════════════════════════════════
  // PLAYER DROPDOWN — filter by role
  // ═══════════════════════════════════════════════════════

  function refreshPlayerDropdown(roleKey) {
    const card = document.getElementById(`card-${roleKey}`);
    if (!card) return;
    const sel = card.querySelector('.select-player');
    if (!sel) return;

    const prevVal = sel.value;
    const dbRole  = ROLE_DB_MAP[roleKey] || roleKey;

    const filtered = allPlayers.filter(
      (p) => (p.primary_role || '').toLowerCase() === dbRole.toLowerCase()
    );
    const pool = filtered.length > 0 ? filtered : allPlayers;

    sel.innerHTML = `<option value="" disabled>Pilih Pemain</option>` +
      pool.map((p) => `<option value="${p.name}">${p.name}</option>`).join('');

    sel.value = (prevVal && pool.some((p) => p.name === prevVal)) ? prevVal : '';
  }

  function refreshAllPlayerDropdowns() {
    ROLES.forEach(({ key }) => refreshPlayerDropdown(key));
  }

  // ═══════════════════════════════════════════════════════
  // HERO PICKER — searchable grid, pakai token style.css
  // ═══════════════════════════════════════════════════════

  /**
   * Bangun hero picker yang visually identik dengan .form-select
   * (border, radius, padding, warna semua dari token style.css).
   * Hidden input .hero-value.select-hero menyimpan nilai terpilih.
   */
  function buildHeroPicker(card, roleKey) {
    const oldSel = card.querySelector('.select-hero');
    if (!oldSel) return;

    // SVG chevron — sama persis ikon di background-image .form-select
    const chevronSVG = `<svg class="hero-picker-arrow" viewBox="0 0 24 24" aria-hidden="true"
      fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>`;

    // SVG search icon untuk search input
    const searchSVG = `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"
      fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round"
      style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--color-text-faint);pointer-events:none">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>`;

    const wrapper = document.createElement('div');
    wrapper.className   = 'hero-picker-wrap';
    wrapper.dataset.role = roleKey;

    // Trigger identik dengan .form-select (div karena tidak submit form)
    wrapper.innerHTML = `
      <div class="hero-picker-trigger" role="combobox" tabindex="0"
           aria-haspopup="listbox" aria-expanded="false">
        <span class="hero-picker-display">Pilih Hero</span>
        ${chevronSVG}
        <input type="hidden" class="hero-value select-hero" name="heroName" value="">
      </div>
      <div class="hero-picker-panel" hidden>
        <div style="position:relative">
          ${searchSVG}
          <input type="text" class="hero-picker-search"
                 placeholder="Cari hero..."
                 autocomplete="off"
                 style="padding-left:32px">
        </div>
        <div class="hero-picker-grid" role="listbox"></div>
        <div class="hero-picker-empty" hidden>Hero tidak ditemukan</div>
      </div>`;

    // Bawa spacing dari select aslinya
    wrapper.className += ` ${oldSel.className.replace('form-select', '').replace('select-hero', '').trim()}`;
    oldSel.replaceWith(wrapper);

    renderHeroGrid(wrapper, '');
    attachHeroPickerEvents(wrapper);
  }

  function renderHeroGrid(wrapper, query) {
    const grid  = wrapper.querySelector('.hero-picker-grid');
    const empty = wrapper.querySelector('.hero-picker-empty');
    const q     = (query || '').toLowerCase().trim();
    const list  = q ? allHeroes.filter((h) => h.toLowerCase().includes(q)) : allHeroes;

    if (list.length === 0) {
      grid.innerHTML = '';
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    const currentVal = wrapper.querySelector('.hero-value').value;
    grid.innerHTML = list
      .map((h) => {
        const active = h === currentVal ? ' is-active' : '';
        return `<button type="button" class="hero-item${active}" data-hero="${h}" role="option"
          aria-selected="${h === currentVal}">${h}</button>`;
      })
      .join('');
  }

  function attachHeroPickerEvents(wrapper) {
    const trigger  = wrapper.querySelector('.hero-picker-trigger');
    const panel    = wrapper.querySelector('.hero-picker-panel');
    const search   = wrapper.querySelector('.hero-picker-search');
    const display  = wrapper.querySelector('.hero-picker-display');
    const hiddenIn = wrapper.querySelector('.hero-value');

    // Buka / tutup
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !panel.hidden;
      closeAllHeroPanels();
      if (!isOpen) {
        panel.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        wrapper.classList.add('is-open');
        search.focus();
        renderHeroGrid(wrapper, search.value);
      }
    });

    // Keyboard: Enter/Space membuka, Escape menutup
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trigger.click(); }
      if (e.key === 'Escape') closeAllHeroPanels();
    });

    search.addEventListener('input', () => renderHeroGrid(wrapper, search.value));
    search.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAllHeroPanels();
    });

    // Pilih hero via event delegation
    panel.addEventListener('click', (e) => {
      const btn = e.target.closest('.hero-item');
      if (!btn) return;
      const hero = btn.dataset.hero;
      hiddenIn.value = hero;
      display.textContent = hero;
      display.classList.add('has-value');
      closeAllHeroPanels();
      hiddenIn.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  function closeAllHeroPanels() {
    document.querySelectorAll('.hero-picker-wrap.is-open').forEach((w) => {
      w.querySelector('.hero-picker-panel').hidden = true;
      w.querySelector('.hero-picker-trigger').setAttribute('aria-expanded', 'false');
      w.classList.remove('is-open');
    });
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.hero-picker-wrap')) closeAllHeroPanels();
  });

  // ═══════════════════════════════════════════════════════
  // LOAD DROPDOWNS
  // ═══════════════════════════════════════════════════════

  async function loadDropdowns() {
    try {
      const [pRes, hRes] = await Promise.all([
        fetch(`${apiBase()}game_api.php?action=players`),
        fetch(`${apiBase()}game_api.php?action=heroes`),
      ]);
      const pJson = await pRes.json().catch(() => null);
      const hJson = await hRes.json().catch(() => null);
      allPlayers = (pJson && pJson.ok) ? pJson.players : [];
      allHeroes  = (hJson && hJson.ok) ? hJson.heroes  : [];

      refreshAllPlayerDropdowns();

      ROLES.forEach(({ key }) => {
        const card = document.getElementById(`card-${key}`);
        if (card) buildHeroPicker(card, key);
      });
    } catch (_) {
      showToast('Gagal memuat data pemain / hero.', 'error');
    }
  }

  // ═══════════════════════════════════════════════════════
  // GAME NUMBER PREVIEW
  // ═══════════════════════════════════════════════════════

  async function loadGameNumber() {
    if (matchId <= 0) return;
    try {
      const res  = await fetch(`${apiBase()}game_api.php?action=list&match_id=${matchId}`);
      const json = await res.json().catch(() => null);
      const count = (json && json.ok) ? (json.games || []).length : 0;
      gameNumber = count + 1;
      const el = document.getElementById('gameNumberDisplay');
      if (el) el.textContent = `Game ${gameNumber}`;
    } catch (_) { /* silent */ }
  }

  // ═══════════════════════════════════════════════════════
  // ROLE TABS
  // ═══════════════════════════════════════════════════════

  function updateRoleProgress() {
    let filled = 0;
    ROLES.forEach(({ key }) => {
      const card = document.getElementById(`card-${key}`);
      if (!card) return;
      const player  = card.querySelector('.select-player');
      const heroEl  = card.querySelector('.hero-value') || card.querySelector('.select-hero');
      const kills   = card.querySelector('.input-kills');
      const deaths  = card.querySelector('.input-deaths');
      const assists = card.querySelector('.input-assists');
      const gold    = card.querySelector('.input-gold');
      if (player  && player.value &&
          heroEl  && heroEl.value &&
          kills   && kills.value.trim()   !== '' &&
          deaths  && deaths.value.trim()  !== '' &&
          assists && assists.value.trim() !== '' &&
          gold    && gold.value.trim()    !== '') {
        filled++;
      }
    });
    const el = document.getElementById('roleProgress');
    if (el) el.textContent = `${filled} / 5 role`;
  }

  function switchRole(roleKey) {
    ROLES.forEach(({ key }) => {
      const card = document.getElementById(`card-${key}`);
      if (card) card.classList.toggle('hidden', key !== roleKey);
    });
  }

  function attachRoleTabListeners() {
    document.querySelectorAll('input[name="activeRole"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        const roleKey = radio.value;
        switchRole(roleKey);
        refreshPlayerDropdown(roleKey);
        updateRoleProgress();
      });
    });

    const container = document.getElementById('playerContainer');
    if (container) {
      container.addEventListener('change', updateRoleProgress);
      container.addEventListener('input',  updateRoleProgress);
    }
  }

  // ═══════════════════════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════════════════════

  function markError(el) { if (el) el.classList.add('field-error'); }
  function clearErrors() {
    document.querySelectorAll('.field-error').forEach((el) => el.classList.remove('field-error'));
  }

  function validateStep1() {
    clearErrors();
    const kills  = document.getElementById('teamKills');
    const deaths = document.getElementById('teamDeaths');
    const durMin = document.getElementById('gameDurationMin');
    const durSec = document.getElementById('gameDurationSec');

    if (!kills  || kills.value.trim() === '')   { markError(kills);  return { valid: false, message: 'Total kills wajib diisi.' }; }
    if (!deaths || deaths.value.trim() === '')  { markError(deaths); return { valid: false, message: 'Total deaths wajib diisi.' }; }
    if (!durMin || durMin.value.trim() === '')  { markError(durMin); return { valid: false, message: 'Menit durasi wajib diisi.' }; }
    if (!durSec || durSec.value.trim() === '')  { markError(durSec); return { valid: false, message: 'Detik durasi wajib diisi.' }; }
    if (Number(durSec.value) < 0 || Number(durSec.value) > 59) {
      markError(durSec);
      return { valid: false, message: 'Detik harus 0–59.' };
    }
    return { valid: true };
  }

  function validateStep2() {
    clearErrors();
    for (const { key, label } of ROLES) {
      const card     = document.getElementById(`card-${key}`);
      if (!card) continue;
      const player   = card.querySelector('.select-player');
      const heroEl   = card.querySelector('.hero-value') || card.querySelector('.select-hero');
      const heroTrig = card.querySelector('.hero-picker-trigger');
      const kills    = card.querySelector('.input-kills');
      const deaths   = card.querySelector('.input-deaths');
      const assists  = card.querySelector('.input-assists');
      const gold     = card.querySelector('.input-gold');

      const switchToRole = () => {
        switchRole(key);
        const radio = document.querySelector(`input[name="activeRole"][value="${key}"]`);
        if (radio) radio.checked = true;
      };

      if (!player || !player.value) {
        switchToRole(); markError(player);
        return { valid: false, message: `Pilih pemain untuk ${label}.` };
      }
      if (!heroEl || !heroEl.value) {
        switchToRole();
        if (heroTrig) heroTrig.classList.add('field-error');
        return { valid: false, message: `Pilih hero untuk ${label}.` };
      }
      if (!kills || kills.value.trim() === '') {
        switchToRole(); markError(kills);
        return { valid: false, message: `Kill untuk ${label} wajib diisi.` };
      }
      if (!deaths || deaths.value.trim() === '') {
        switchToRole(); markError(deaths);
        return { valid: false, message: `Death untuk ${label} wajib diisi.` };
      }
      if (!assists || assists.value.trim() === '') {
        switchToRole(); markError(assists);
        return { valid: false, message: `Assist untuk ${label} wajib diisi.` };
      }
      if (!gold || gold.value.trim() === '') {
        switchToRole(); markError(gold);
        return { valid: false, message: `Total Gold untuk ${label} wajib diisi.` };
      }
    }
    return { valid: true };
  }

  // ═══════════════════════════════════════════════════════
  // COLLECT DATA
  // ═══════════════════════════════════════════════════════

  function getGameInfo() {
    return {
      matchId,
      result:          document.getElementById('gameResult')?.value || 'win',
      teamKills:       Number(document.getElementById('teamKills')?.value) || 0,
      teamDeaths:      Number(document.getElementById('teamDeaths')?.value) || 0,
      durationMinutes: Number(document.getElementById('gameDurationMin')?.value) || 0,
      durationSeconds: Number(document.getElementById('gameDurationSec')?.value) || 0,
    };
  }

  function getPlayerStats() {
    return ROLES.map(({ key }) => {
      const card   = document.getElementById(`card-${key}`);
      const heroEl = card?.querySelector('.hero-value') || card?.querySelector('.select-hero');
      return {
        roleName:   key,
        playerName: card?.querySelector('.select-player')?.value || '',
        heroName:   heroEl?.value || '',
        kills:      Number(card?.querySelector('.input-kills')?.value)   || 0,
        deaths:     Number(card?.querySelector('.input-deaths')?.value)  || 0,
        assists:    Number(card?.querySelector('.input-assists')?.value) || 0,
        totalGold:  Number(card?.querySelector('.input-gold')?.value)    || 0,
      };
    });
  }

  // ═══════════════════════════════════════════════════════
  // STEP NAVIGATION
  // ═══════════════════════════════════════════════════════

  function goToStep2() {
    document.getElementById('tahap1')?.classList.add('hidden');
    document.getElementById('tahap2')?.classList.remove('hidden');
    updateRoleProgress();
  }
  function goToStep1() {
    document.getElementById('tahap2')?.classList.add('hidden');
    document.getElementById('tahap1')?.classList.remove('hidden');
  }
  function handleNextStep() {
    const v = validateStep1();
    if (!v.valid) { showToast(v.message, 'error'); return; }
    goToStep2();
  }

  // ═══════════════════════════════════════════════════════
  // SUBMIT
  // ═══════════════════════════════════════════════════════

  function handleSubmitAll() {
    const v = validateStep2();
    if (!v.valid) { showToast(v.message, 'error'); return; }

    const payload = { game: getGameInfo(), players: getPlayerStats() };

    fetch(`${apiBase()}save_game.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok || !json || !json.ok) throw new Error((json && json.message) || 'Gagal menyimpan game.');
        return json;
      })
      .then(() => {
        showToast('Game berhasil disimpan!', 'success');
        setTimeout(() => { window.location.href = `game.html?match_id=${matchId}`; }, REDIRECT_DELAY_MS);
      })
      .catch((err) => showToast(err.message || 'Terjadi kesalahan.', 'error'));
  }

  // ═══════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════

  document.addEventListener('DOMContentLoaded', () => {
    matchId = parseInt(getParam('match_id') || '0', 10);
    if (matchId <= 0) showToast('match_id tidak ditemukan di URL.', 'error');

    updateNavLinks(matchId);
    loadDropdowns();
    loadGameNumber();
    attachRoleTabListeners();

    document.getElementById('btnNextStep')?.addEventListener('click', handleNextStep);
    document.getElementById('btnBackStep')?.addEventListener('click', goToStep1);
    document.getElementById('btnSubmitAll')?.addEventListener('click', handleSubmitAll);
  });

})();
