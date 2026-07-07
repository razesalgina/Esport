/**
 * hero-picker.js
 * Hero Picker Popup — MLBB Manager
 * Batch 1: core logic (search, role filter, select, positioning)
 */

( function () {
  'use strict';

  /* ─────────────────────────────────────────
   * 1. HERO DATA
   * Sumber: data statis MLBB. Ganti / extend
   * lewat window.HERO_DATA sebelum script ini
   * di-load, atau nanti lewat fetch ke PHP.
   * ───────────────────────────────────────── */
  const HERO_DATA = window.HERO_DATA || [
    /* Tank */
    { id: 1, name: 'Akai', role: 'tank', image: 'assets/heroes/akai.png' },
    { id: 2, name: 'Alice', role: 'tank', image: 'assets/heroes/alice.png' },
    { id: 3, name: 'Atlas', role: 'tank', image: 'assets/heroes/atlas.png' },
    { id: 4, name: 'Barats', role: 'tank', image: 'assets/heroes/barats.png' },
    { id: 5, name: 'Baxia', role: 'tank', image: 'assets/heroes/baxia.png' },
    { id: 6, name: 'Belerick', role: 'tank', image: 'assets/heroes/belerick.png' },
    { id: 7, name: 'Edith', role: 'tank', image: 'assets/heroes/edith.png' },
    { id: 8, name: 'Esmeralda', role: 'tank', image: 'assets/heroes/esmeralda.png' },
    { id: 9, name: 'Franco', role: 'tank', image: 'assets/heroes/franco.png' },
    { id: 10, name: 'Gatotkaca', role: 'tank', image: 'assets/heroes/gatotkaca.png' },
    { id: 11, name: 'Gloo', role: 'tank', image: 'assets/heroes/gloo.png' },
    { id: 12, name: 'Grock', role: 'tank', image: 'assets/heroes/grock.png' },
    { id: 13, name: 'Hilda', role: 'tank', image: 'assets/heroes/hilda.png' },
    { id: 14, name: 'Hylos', role: 'tank', image: 'assets/heroes/hylos.png' },
    { id: 15, name: 'Johnson', role: 'tank', image: 'assets/heroes/johnson.png' },
    { id: 16, name: 'Khufra', role: 'tank', image: 'assets/heroes/khufra.png' },
    { id: 17, name: 'Lolita', role: 'tank', image: 'assets/heroes/lolita.png' },
    { id: 18, name: 'Minotaur', role: 'tank', image: 'assets/heroes/minotaur.png' },
    { id: 19, name: 'Tigreal', role: 'tank', image: 'assets/heroes/tigreal.png' },
    { id: 20, name: 'Uranus', role: 'tank', image: 'assets/heroes/uranus.png' },
    /* Fighter */
    { id: 21, name: 'Aldous', role: 'fighter', image: 'assets/heroes/aldous.png' },
    { id: 22, name: 'Alpha', role: 'fighter', image: 'assets/heroes/alpha.png' },
    { id: 23, name: 'Alucard', role: 'fighter', image: 'assets/heroes/alucard.png' },
    { id: 24, name: 'Argus', role: 'fighter', image: 'assets/heroes/argus.png' },
    { id: 25, name: 'Arlott', role: 'fighter', image: 'assets/heroes/arlott.png' },
    { id: 26, name: 'Aulus', role: 'fighter', image: 'assets/heroes/aulus.png' },
    { id: 27, name: 'Badang', role: 'fighter', image: 'assets/heroes/badang.png' },
    { id: 28, name: 'Balmond', role: 'fighter', image: 'assets/heroes/balmond.png' },
    { id: 29, name: 'Bane', role: 'fighter', image: 'assets/heroes/bane.png' },
    { id: 30, name: 'Chou', role: 'fighter', image: 'assets/heroes/chou.png' },
    { id: 31, name: 'Cici', role: 'fighter', image: 'assets/heroes/cici.png' },
    { id: 32, name: 'Dyrroth', role: 'fighter', image: 'assets/heroes/dyrroth.png' },
    { id: 33, name: 'Fredrinn', role: 'fighter', image: 'assets/heroes/fredrinn.png' },
    { id: 34, name: 'Freya', role: 'fighter', image: 'assets/heroes/freya.png' },
    { id: 35, name: 'Guinevere', role: 'fighter', image: 'assets/heroes/guinevere.png' },
    { id: 36, name: 'Jawhead', role: 'fighter', image: 'assets/heroes/jawhead.png' },
    { id: 37, name: 'Julian', role: 'fighter', image: 'assets/heroes/julian.png' },
    { id: 38, name: 'Kalea', role: 'fighter', image: 'assets/heroes/kalea.png' },
    { id: 39, name: 'Khaleed', role: 'fighter', image: 'assets/heroes/khaleed.png' },
    { id: 40, name: 'Lapu-Lapu', role: 'fighter', image: 'assets/heroes/lapu-lapu.png' },
    { id: 41, name: 'Leomord', role: 'fighter', image: 'assets/heroes/leomord.png' },
    { id: 42, name: 'Lukas', role: 'fighter', image: 'assets/heroes/lukas.png' },
    { id: 43, name: 'Martis', role: 'fighter', image: 'assets/heroes/martis.png' },
    { id: 44, name: 'Masha', role: 'fighter', image: 'assets/heroes/masha.png' },
    { id: 45, name: 'Minsitthar', role: 'fighter', image: 'assets/heroes/minsitthar.png' },
    { id: 46, name: 'Paquito', role: 'fighter', image: 'assets/heroes/paquito.png' },
    { id: 47, name: 'Phoveus', role: 'fighter', image: 'assets/heroes/phoveus.png' },
    { id: 48, name: 'Roger', role: 'fighter', image: 'assets/heroes/roger.png' },
    { id: 49, name: 'Ruby', role: 'fighter', image: 'assets/heroes/ruby.png' },
    { id: 50, name: 'Silvanna', role: 'fighter', image: 'assets/heroes/silvanna.png' },
    { id: 51, name: 'Sora', role: 'fighter', image: 'assets/heroes/sora.png' },
    { id: 52, name: 'Sun', role: 'fighter', image: 'assets/heroes/sun.png' },
    { id: 53, name: 'Terizla', role: 'fighter', image: 'assets/heroes/terizla.png' },
    { id: 54, name: 'Thamuz', role: 'fighter', image: 'assets/heroes/thamuz.png' },
    { id: 55, name: 'X.Borg', role: 'fighter', image: 'assets/heroes/x.borg.png' },
    { id: 56, name: 'Yu Zhong', role: 'fighter', image: 'assets/heroes/yu zhong.png' },
    { id: 57, name: 'Zilong', role: 'fighter', image: 'assets/heroes/zilong.png' },
    /* Assassin */
    { id: 58, name: 'Aamon', role: 'assassin', image: 'assets/heroes/aamon.png' },
    { id: 59, name: 'Benedetta', role: 'assassin', image: 'assets/heroes/benedetta.png' },
    { id: 60, name: 'Fanny', role: 'assassin', image: 'assets/heroes/fanny.png' },
    { id: 61, name: 'Gusion', role: 'assassin', image: 'assets/heroes/gusion.png' },
    { id: 62, name: 'Hanzo', role: 'assassin', image: 'assets/heroes/hanzo.png' },
    { id: 63, name: 'Harley', role: 'assassin', image: 'assets/heroes/harley.png' },
    { id: 64, name: 'Hayabusa', role: 'assassin', image: 'assets/heroes/hayabusa.png' },
    { id: 65, name: 'Helcurt', role: 'assassin', image: 'assets/heroes/helcurt.png' },
    { id: 66, name: 'Hirara', role: 'assassin', image: 'assets/heroes/hirara.png' },
    { id: 67, name: 'Joy', role: 'assassin', image: 'assets/heroes/joy.png' },
    { id: 68, name: 'Kadita', role: 'assassin', image: 'assets/heroes/kadita.png' },
    { id: 69, name: 'Karina', role: 'assassin', image: 'assets/heroes/karina.png' },
    { id: 70, name: 'Lancelot', role: 'assassin', image: 'assets/heroes/lancelot.png' },
    { id: 71, name: 'Ling', role: 'assassin', image: 'assets/heroes/ling.png' },
    { id: 72, name: 'Natalia', role: 'assassin', image: 'assets/heroes/natalia.png' },
    { id: 73, name: 'Nolan', role: 'assassin', image: 'assets/heroes/nolan.png' },
    { id: 74, name: 'Saber', role: 'assassin', image: 'assets/heroes/saber.png' },
    { id: 75, name: 'Selena', role: 'assassin', image: 'assets/heroes/selena.png' },
    { id: 76, name: 'Suyou', role: 'assassin', image: 'assets/heroes/suyou.png' },
    { id: 77, name: 'Yi Sun-shin', role: 'assassin', image: 'assets/heroes/yi sun-shin.png' },
    { id: 78, name: 'Yin', role: 'assassin', image: 'assets/heroes/yin.png' },
    /* Marksman */
    { id: 79, name: 'Beatrix', role: 'marksman', image: 'assets/heroes/beatrix.png' },
    { id: 80, name: 'Brody', role: 'marksman', image: 'assets/heroes/brody.png' },
    { id: 81, name: 'Bruno', role: 'marksman', image: 'assets/heroes/bruno.png' },
    { id: 82, name: 'Claude', role: 'marksman', image: 'assets/heroes/claude.png' },
    { id: 83, name: 'Clint', role: 'marksman', image: 'assets/heroes/clint.png' },
    { id: 84, name: 'Granger', role: 'marksman', image: 'assets/heroes/granger.png' },
    { id: 85, name: 'Hanabi', role: 'marksman', image: 'assets/heroes/hanabi.png' },
    { id: 86, name: 'Irithel', role: 'marksman', image: 'assets/heroes/irithel.png' },
    { id: 87, name: 'Ixia', role: 'marksman', image: 'assets/heroes/ixia.png' },
    { id: 88, name: 'Karrie', role: 'marksman', image: 'assets/heroes/karrie.png' },
    { id: 89, name: 'Kimmy', role: 'marksman', image: 'assets/heroes/kimmy.png' },
    { id: 90, name: 'Layla', role: 'marksman', image: 'assets/heroes/layla.png' },
    { id: 91, name: 'Lesley', role: 'marksman', image: 'assets/heroes/lesley.png' },
    { id: 92, name: 'Melissa', role: 'marksman', image: 'assets/heroes/melissa.png' },
    { id: 93, name: 'Miya', role: 'marksman', image: 'assets/heroes/miya.png' },
    { id: 94, name: 'Moskov', role: 'marksman', image: 'assets/heroes/moskov.png' },
    { id: 95, name: 'Natan', role: 'marksman', image: 'assets/heroes/natan.png' },
    { id: 96, name: 'Obsidia', role: 'marksman', image: 'assets/heroes/obsidia.png' },
    { id: 97, name: 'Popol and Kupa', role: 'marksman', image: 'assets/heroes/popol and kupa.png' },
    { id: 98, name: 'Wanwan', role: 'marksman', image: 'assets/heroes/wanwan.png' },
    /* Mage */
    { id: 99, name: 'Aurora', role: 'mage', image: 'assets/heroes/aurora.png' },
    { id: 100, name: 'Cecilion', role: 'mage', image: 'assets/heroes/cecilion.png' },
    { id: 101, name: "Chang'e", role: 'mage', image: "assets/heroes/chang'e.png" },
    { id: 102, name: 'Cyclops', role: 'mage', image: 'assets/heroes/cyclops.png' },
    { id: 103, name: 'Eudora', role: 'mage', image: 'assets/heroes/eudora.png' },
    { id: 104, name: 'Faramis', role: 'mage', image: 'assets/heroes/faramis.png' },
    { id: 105, name: 'Gord', role: 'mage', image: 'assets/heroes/gord.png' },
    { id: 106, name: 'Harith', role: 'mage', image: 'assets/heroes/harith.png' },
    { id: 107, name: 'Kagura', role: 'mage', image: 'assets/heroes/kagura.png' },
    { id: 108, name: 'Lunox', role: 'mage', image: 'assets/heroes/lunox.png' },
    { id: 109, name: 'Luo Yi', role: 'mage', image: 'assets/heroes/luo yi.png' },
    { id: 110, name: 'Lylia', role: 'mage', image: 'assets/heroes/lylia.png' },
    { id: 111, name: 'Nana', role: 'mage', image: 'assets/heroes/nana.png' },
    { id: 112, name: 'Novaria', role: 'mage', image: 'assets/heroes/novaria.png' },
    { id: 113, name: 'Odette', role: 'mage', image: 'assets/heroes/odette.png' },
    { id: 114, name: 'Parsha', role: 'mage', image: 'assets/heroes/pharsa.png' },
    { id: 115, name: 'Vale', role: 'mage', image: 'assets/heroes/vale.png' },
    { id: 116, name: 'Valentina', role: 'mage', image: 'assets/heroes/valentina.png' },
    { id: 117, name: 'Valir', role: 'mage', image: 'assets/heroes/valir.png' },
    { id: 118, name: 'Vexana', role: 'mage', image: 'assets/heroes/vexana.png' },
    { id: 119, name: 'Xavier', role: 'mage', image: 'assets/heroes/xavier.png' },
    { id: 120, name: 'Yve', role: 'mage', image: 'assets/heroes/yve.png' },
    { id: 121, name: 'Zhask', role: 'mage', image: 'assets/heroes/zhask.png' },
    { id: 122, name: 'Zetian', role: 'mage', image: 'assets/heroes/zetian.png' },
    { id: 123, name: 'Zhuxin', role: 'mage', image: 'assets/heroes/zhuxin.png' },
    /* Support */
    { id: 124, name: 'Angela', role: 'support', image: 'assets/heroes/angela.png' },
    { id: 125, name: 'Carmilla', role: 'support', image: 'assets/heroes/carmilla.png' },
    { id: 126, name: 'Chip', role: 'support', image: 'assets/heroes/chip.png' },
    { id: 127, name: 'Diggie', role: 'support', image: 'assets/heroes/diggie.png' },
    { id: 128, name: 'Estes', role: 'support', image: 'assets/heroes/estes.png' },
    { id: 129, name: 'Floryn', role: 'support', image: 'assets/heroes/floryn.png' },
    { id: 130, name: 'Kaja', role: 'support', image: 'assets/heroes/kaja.png' },
    { id: 131, name: 'Marcel', role: 'support', image: 'assets/heroes/marcel.png' },
    { id: 132, name: 'Mathilda', role: 'support', image: 'assets/heroes/mathilda.png' },
    { id: 133, name: 'Rafaela', role: 'support', image: 'assets/heroes/rafaela.png' }
  ];

  const ROLES = ['all', 'tank', 'fighter', 'assassin', 'marksman', 'mage', 'support'];

  /* ─────────────────────────────────────────
   * 2. STATE  (singleton — only 1 popup open)
   * ───────────────────────────────────────── */
  const State = {
    isOpen:       false,
    activeRole:   'all',
    keyword:      '',
    selectedHero: null,   // hero object
    targetInput:  null,   // <input type="hidden">
    targetLabel:  null,   // <span class="hero-picker-preview">
    triggerBtn:   null,   // button that opened the popup
  };

  /* ─────────────────────────────────────────
   * 3. BUILD POPUP DOM (once, reused)
   * ───────────────────────────────────────── */
  let popup = null;
  let popupSearch, popupClose, popupGrid, popupSelectBtn;
  const filterBtnMap = {};

  function buildPopup() {
    popup = document.createElement('div');
    popup.className  = 'hero-popup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-modal', 'true');
    popup.setAttribute('aria-label', 'Pilih Hero');
    popup.hidden = true;

    /* — Header — */
    const header = document.createElement('div');
    header.className = 'hero-popup__header';

    popupSearch = document.createElement('input');
    popupSearch.type        = 'text';
    popupSearch.className   = 'hero-popup__search';
    popupSearch.placeholder = 'Cari nama hero...';
    popupSearch.setAttribute('autocomplete', 'off');

    popupClose = document.createElement('button');
    popupClose.type      = 'button';
    popupClose.className = 'hero-popup__close';
    popupClose.setAttribute('aria-label', 'Tutup popup');
    popupClose.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

    header.appendChild(popupSearch);
    header.appendChild(popupClose);

    /* — Filters — */
    const filterRow = document.createElement('div');
    filterRow.className = 'hero-popup__filters';

    ROLES.forEach( function (role) {
      const btn = document.createElement('button');
      btn.type      = 'button';
      btn.className = 'hero-filter' + (role === 'all' ? ' is-active' : '');
      btn.dataset.role = role;
      btn.textContent  = role === 'all' ? 'All' : role.charAt(0).toUpperCase() + role.slice(1);
      filterBtnMap[role] = btn;
      filterRow.appendChild(btn);
    });

    /* — Grid — */
    popupGrid = document.createElement('div');
    popupGrid.className = 'hero-popup__grid';

    /* — Footer — */
    const footer = document.createElement('div');
    footer.className = 'hero-popup__footer';

    popupSelectBtn = document.createElement('button');
    popupSelectBtn.type      = 'button';
    popupSelectBtn.className = 'hero-popup__select btn btn-primary';
    popupSelectBtn.textContent = 'Select';
    popupSelectBtn.disabled  = true;

    footer.appendChild(popupSelectBtn);

    popup.appendChild(header);
    popup.appendChild(filterRow);
    popup.appendChild(popupGrid);
    popup.appendChild(footer);

    document.body.appendChild(popup);

    /* — Events (delegated to popup) — */
    popupClose.addEventListener('click', closePopup);

    filterRow.addEventListener('click', function (e) {
      const btn = e.target.closest('.hero-filter');
      if (!btn) return;
      Object.values(filterBtnMap).forEach( b => b.classList.remove('is-active') );
      btn.classList.add('is-active');
      State.activeRole = btn.dataset.role;
      renderGrid();
    });

    popupSearch.addEventListener('input', function () {
      State.keyword = popupSearch.value.trim();
      renderGrid();
    });

    popupGrid.addEventListener('click', function (e) {
      const card = e.target.closest('.hero-card');
      if (!card) return;
      const heroId = Number(card.dataset.heroId);
      State.selectedHero = HERO_DATA.find( h => h.id === heroId ) || null;
      popupSelectBtn.disabled = !State.selectedHero;

      popupGrid.querySelectorAll('.hero-card').forEach( c => c.classList.remove('is-selected') );
      card.classList.add('is-selected');
    });

    popupSelectBtn.addEventListener('click', confirmSelection);

    popup.addEventListener('click', function (e) { e.stopPropagation(); });
  }

  /* ─────────────────────────────────────────
   * 4. RENDER GRID
   * ───────────────────────────────────────── */
  function renderGrid() {
    const kw = State.keyword.toLowerCase();
    const filtered = HERO_DATA.filter( function (h) {
      const matchRole = State.activeRole === 'all' || h.role === State.activeRole;
      const matchKw   = h.name.toLowerCase().includes(kw);
      return matchRole && matchKw;
    });

    if (!filtered.length) {
      popupGrid.innerHTML = '<p class="hero-popup__empty">Hero tidak ditemukan</p>';
      return;
    }

    popupGrid.innerHTML = filtered.map( function (h) {
      const selected = State.selectedHero && State.selectedHero.id === h.id ? ' is-selected' : '';
      return (
        '<button type="button" class="hero-card' + selected + '" ' +
        'data-hero-id="' + h.id + '" ' +
        'aria-label="Pilih ' + h.name + '">' +
        '<img src="' + h.image + '" alt="' + h.name + '" ' +
        'width="64" height="64" loading="lazy" ' +
        'onerror="this.src=\'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'64\' height=\'64\'%3E%3Crect width=\'64\' height=\'64\' rx=\'8\' fill=\'%23e2e8f0\'/%3E%3C/svg%3E\'"/>' +
        '<span class="hero-card__name">' + h.name + '</span>' +
        '</button>'
      );
    }).join('');
  }

  /* ─────────────────────────────────────────
   * 5. POSITION POPUP
   * ───────────────────────────────────────── */
  function positionPopup() {
    if (!State.triggerBtn || !popup) return;

    const btnRect = State.triggerBtn.getBoundingClientRect();
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const pW = popup.offsetWidth || 420;
    const pH = popup.offsetHeight || 420;
    const margin = 8;

    let top = btnRect.bottom + margin + window.scrollY;
    let left = btnRect.left + window.scrollX;

    if (left + pW > vpW - margin) {
      left = Math.max(margin, vpW - pW - margin);
    }

    if (btnRect.bottom + pH + margin > vpH) {
      top = btnRect.top - pH - margin + window.scrollY;
    }

    top = Math.max(window.scrollY + margin, top)+50;

    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
  }

  /* ─────────────────────────────────────────
   * 6. OPEN / CLOSE
   * ───────────────────────────────────────── */
  function openPopup(wrapper) {
    const inputId   = wrapper.dataset.pickerInput;
    const labelId   = wrapper.dataset.pickerLabel;
    const triggerBtn = wrapper.querySelector('.open-hero-picker');

    State.targetInput  = document.getElementById(inputId);
    State.targetLabel  = document.getElementById(labelId);
    State.triggerBtn   = triggerBtn;
    State.isOpen       = true;

    /* Reset UI */
    State.activeRole   = 'all';
    State.keyword      = '';
    popupSearch.value  = '';
    Object.values(filterBtnMap).forEach( b => b.classList.remove('is-active') );
    filterBtnMap['all'].classList.add('is-active');

    /* Pre-select hero if already chosen */
    const existingVal = State.targetInput ? State.targetInput.value : '';
    State.selectedHero = HERO_DATA.find( h => h.name === existingVal ) || null;
    popupSelectBtn.disabled = !State.selectedHero;

    renderGrid();

    popup.hidden = false;
    positionPopup();
    popupSearch.focus();
  }

  function closePopup() {
    if (!popup) return;
    popup.hidden   = true;
    State.isOpen   = false;
    State.triggerBtn && State.triggerBtn.focus();
  }

  /* ─────────────────────────────────────────
   * 7. CONFIRM SELECTION
   * ───────────────────────────────────────── */
  function confirmSelection() {
    if (!State.selectedHero) return;

    /* Write to hidden input */
    if (State.targetInput) {
      State.targetInput.value = State.selectedHero.name;
    }

    /* Update preview label */
    if (State.targetLabel) {
      State.targetLabel.innerHTML =
        '<img class="preview-thumb" src="' + State.selectedHero.image + '" ' +
        'alt="' + State.selectedHero.name + '" width="28" height="28" ' +
        'onerror="this.style.display=\'none\'">' +
        '<span class="preview-name">' + State.selectedHero.name + '</span>' +
        '<span class="preview-role badge-role badge-role--' + State.selectedHero.role + '">' +
        State.selectedHero.role.charAt(0).toUpperCase() + State.selectedHero.role.slice(1) +
        '</span>';
    }

    closePopup();
  }

  /* ─────────────────────────────────────────
   * 8. KEYBOARD: ESC to close
   * ───────────────────────────────────────── */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && State.isOpen) closePopup();
  });

  /* Click outside closes popup */
  document.addEventListener('click', function (e) {
    if (State.isOpen && popup && !popup.contains(e.target)) {
      closePopup();
    }
  });

  /* Reposition on resize */
  let resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout( function () {
      if (State.isOpen) positionPopup();
    }, 50);
  });

  /* ─────────────────────────────────────────
   * 9. INIT — attach open-button listeners
   * ───────────────────────────────────────── */
  function init() {
    buildPopup();

    document.querySelectorAll('.hero-picker-wrapper').forEach( function (wrapper) {
      const btn = wrapper.querySelector('.open-hero-picker');
      if (!btn) return;

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const alreadyOpen = State.isOpen && State.triggerBtn === btn;
        if (alreadyOpen) {
          closePopup();
        } else {
          closePopup();
          openPopup(wrapper);
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
