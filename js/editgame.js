// js/editgame.js
// Hero picker visual (popup grid) ditangani oleh hero-picker.js.
// File ini hanya mengurus: load game data, player dropdown, role tabs, validasi, dan submit.
(function () {
  const REDIRECT_DELAY_MS = 1500;
  const ROLES = [
    { key: 'jungler',   label: 'Jungler'   },
    { key: 'roamer',    label: 'Roamer'    },
    { key: 'midlaner',  label: 'Mid Laner' },
    { key: 'explaner',  label: 'Exp Laner' },
    { key: 'goldlaner', label: 'Gold Laner'},
  ];

  const ROLE_DB_MAP = {
    jungler:   'jungler',
    roamer:    'roamer',
    midlaner:  'midlaner',
    explaner:  'explaner',
    goldlaner: 'goldlaner',
  };

  // ── State ───────────────────────────────────
  let gameId     = 0;
  let matchId    = 0;
  let allPlayers = []; // [{ id, name, primary_role }]

  const apiBase = () => window.EsportConfig ? window.EsportConfig.apiBase : 'db/';

  function showToast(msg, type) {
    if (window.Esport && typeof window.Esport.showToast === 'function') {
      window.Esport.showToast(msg, type);
    }
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  // ── Nav links ───────────────────────────────
  function updateNavLinks(mid) {
    const gameUrl        = `game.html?match_id=${mid}`;
    const backBtn        = document.getElementById('backBtn');
    const breadcrumbGame = document.getElementById('breadcrumbGame');
    if (backBtn)         backBtn.href = gameUrl;
    if (breadcrumbGame)  breadcrumbGame.href = gameUrl;
  }

  // ── Hero value helper ───────────────────────
  function getHeroValue(roleKey) {
    const el = document.getElementById(`hero_${roleKey}`);
    return el ? el.value.trim() : '';
  }

  // Pre-fill hidden input + preview label (dipanggil saat load game data)
  function setHeroValue(roleKey, heroName) {
    const hiddenEl  = document.getElementById(`hero_${roleKey}`);
    const previewEl = document.getElementById(`preview_hero_${roleKey}`);
    if (hiddenEl)  hiddenEl.value        = heroName;
    if (previewEl) previewEl.textContent = heroName || '—';
    // Dispatch 'change' agar updateRoleProgress terpicu
    hiddenEl?.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ── Player dropdown ─────────────────────────
  function refreshPlayerDropdown(roleKey, selectedId = null) {
    const card = document.getElementById(`card-${roleKey}`);
    if (!card) return;
    const sel = card.querySelector('.select-player');
    if (!sel) return;

    const dbRole   = ROLE_DB_MAP[roleKey] || roleKey;
    const filtered = allPlayers.filter(
      (p) => (p.primary_role || '').toLowerCase() === dbRole.toLowerCase()
    );
    const pool = filtered.length > 0 ? filtered : allPlayers;

    sel.innerHTML = `<option value="" disabled>Pilih Pemain</option>` +
      pool.map((p) =>
        `<option value="${p.id}" ${String(p.id) === String(selectedId) ? 'selected' : ''}>${p.name}</option>`
      ).join('');

    if (!selectedId || !pool.some((p) => String(p.id) === String(selectedId))) sel.value = '';
  }

  function refreshAllPlayerDropdowns() {
    ROLES.forEach(({ key }) => refreshPlayerDropdown(key));
  }

  // ── Role progress badge ──────────────────────
  function updateRoleProgress() {
    let filled = 0;
    ROLES.forEach(({ key }) => {
      const card = document.getElementById(`card-${key}`);
      if (!card) return;
      const player  = card.querySelector('.select-player');
      const heroVal = getHeroValue(key);
      const kills   = card.querySelector('.input-kills');
      const deaths  = card.querySelector('.input-deaths');
      const assists = card.querySelector('.input-assists');
      const kda     = card.querySelector('.input-kda');
      const gold    = card.querySelector('.input-gold');
      if (
        player?.value &&
        heroVal !== '' &&
        kills?.value.trim()   !== '' &&
        deaths?.value.trim()  !== '' &&
        assists?.value.trim() !== '' &&
        kda?.value.trim()     !== '' &&
        gold?.value.trim()    !== ''
      ) filled++;
    });
    const el = document.getElementById('roleProgress');
    if (el) el.textContent = `${filled} / 5 role`;
  }

  // ── Role tabs ────────────────────────────────
  function switchRole(roleKey) {
    ROLES.forEach(({ key }) => {
      document.getElementById(`card-${key}`)?.classList.toggle('hidden', key !== roleKey);
    });
  }

  function attachRoleTabListeners() {
    document.querySelectorAll('input[name="activeRole"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        switchRole(radio.value);
        refreshPlayerDropdown(radio.value);
        updateRoleProgress();
      });
    });

    const container = document.getElementById('playerContainer');
    if (container) {
      container.addEventListener('change', updateRoleProgress);
      container.addEventListener('input',  updateRoleProgress);
    }
  }

  // ── Load game data ───────────────────────────
  async function loadGameData() {
    const [gRes, pRes] = await Promise.all([
      fetch(`${apiBase()}game_api.php?action=get&id=${gameId}`),
      fetch(`${apiBase()}game_api.php?action=players`),
    ]);
    const gJson = await gRes.json().catch(() => null);
    const pJson = await pRes.json().catch(() => null);

    if (!gJson || !gJson.ok) throw new Error('Game tidak ditemukan');

    const game = gJson.game;
    allPlayers = (pJson && pJson.ok) ? pJson.players : [];

    matchId = game.match_id;
    updateNavLinks(matchId);

    // Fill tahap 1
    const numEl = document.getElementById('gameNumberDisplay');
    if (numEl) numEl.textContent = `Game ${game.game_number}`;

    const result = document.getElementById('gameResult');
    if (result) result.value = game.result || 'win';

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
    setVal('teamKills',       game.team_kills);
    setVal('teamDeaths',      game.team_deaths);
    setVal('gameDurationMin', game.duration_minutes);
    setVal('gameDurationSec', game.duration_seconds);

    // Fill tahap 2 per-role
    ROLES.forEach(({ key }) => {
      const existing = (game.players || []).find(
        (p) => (p.player_role || '').toLowerCase().replace(/\s/g, '') === key
      );
      if (!existing) return;

      refreshPlayerDropdown(key, existing.player_id || null);
      setHeroValue(key, existing.hero_name || '');

      const card = document.getElementById(`card-${key}`);
      if (!card) return;
      const fill = (cls, val) => { const el = card.querySelector(cls); if (el) el.value = val ?? ''; };
      fill('.input-kills',   existing.kills);
      fill('.input-deaths',  existing.deaths);
      fill('.input-assists', existing.assists);
      fill('.input-kda',     existing.kda ?? parseFloat(
        ((Number(existing.kills ?? 0) + Number(existing.assists ?? 0)) /
          Math.max(Number(existing.deaths ?? 0), 1)).toFixed(2)
      ));
      fill('.input-gold',    existing.total_gold);
    });

    updateRoleProgress();
  }

  // ── Validation ───────────────────────────────
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

    if (!kills?.value.trim())  { markError(kills);  return { valid: false, message: 'Total kills wajib diisi.' }; }
    if (!deaths?.value.trim()) { markError(deaths); return { valid: false, message: 'Total deaths wajib diisi.' }; }
    if (!durMin?.value.trim()) { markError(durMin); return { valid: false, message: 'Menit durasi wajib diisi.' }; }
    if (!durSec?.value.trim()) { markError(durSec); return { valid: false, message: 'Detik durasi wajib diisi.' }; }
    if (Number(durSec.value) < 0 || Number(durSec.value) > 59) {
      markError(durSec);
      return { valid: false, message: 'Detik harus 0–59.' };
    }
    return { valid: true };
  }

  function validateStep2() {
    clearErrors();
    for (const { key, label } of ROLES) {
      const card    = document.getElementById(`card-${key}`);
      if (!card) continue;
      const player  = card.querySelector('.select-player');
      const heroVal = getHeroValue(key);
      const kills   = card.querySelector('.input-kills');
      const deaths  = card.querySelector('.input-deaths');
      const assists = card.querySelector('.input-assists');
      const kda     = card.querySelector('.input-kda');
      const gold    = card.querySelector('.input-gold');

      const switchToRole = () => {
        switchRole(key);
        const radio = document.querySelector(`input[name="activeRole"][value="${key}"]`);
        if (radio) radio.checked = true;
      };

      if (!player?.value) {
        switchToRole(); markError(player);
        return { valid: false, message: `Pilih pemain untuk ${label}.` };
      }
      if (!heroVal) {
        switchToRole();
        const btn = card.querySelector('.open-hero-picker');
        if (btn) btn.classList.add('field-error');
        return { valid: false, message: `Pilih hero untuk ${label}.` };
      }
      if (!kills?.value.trim()) {
        switchToRole(); markError(kills);
        return { valid: false, message: `Kill untuk ${label} wajib diisi.` };
      }
      if (!deaths?.value.trim()) {
        switchToRole(); markError(deaths);
        return { valid: false, message: `Death untuk ${label} wajib diisi.` };
      }
      if (!assists?.value.trim()) {
        switchToRole(); markError(assists);
        return { valid: false, message: `Assist untuk ${label} wajib diisi.` };
      }
      if (!kda?.value.trim()) {
        switchToRole(); markError(kda);
        return { valid: false, message: `KDA untuk ${label} wajib diisi.` };
      }
      if (!gold?.value.trim()) {
        switchToRole(); markError(gold);
        return { valid: false, message: `Total Gold untuk ${label} wajib diisi.` };
      }
    }
    return { valid: true };
  }

  // ── Collect data ─────────────────────────────
  function getGameInfo() {
    return {
      gameId,
      matchId,
      result:          document.getElementById('gameResult')?.value || 'win',
      teamKills:       Number(document.getElementById('teamKills')?.value)       || 0,
      teamDeaths:      Number(document.getElementById('teamDeaths')?.value)      || 0,
      durationMinutes: Number(document.getElementById('gameDurationMin')?.value) || 0,
      durationSeconds: Number(document.getElementById('gameDurationSec')?.value) || 0,
    };
  }

  function getPlayerStats() {
    return ROLES.map(({ key }) => {
      const card = document.getElementById(`card-${key}`);
      return {
        roleName:   key,
        playerId:   Number(card?.querySelector('.select-player')?.value) || 0,
        heroName:   getHeroValue(key),
        kills:      Number(card?.querySelector('.input-kills')?.value)   || 0,
        deaths:     Number(card?.querySelector('.input-deaths')?.value)  || 0,
        assists:    Number(card?.querySelector('.input-assists')?.value) || 0,
        kda:        parseFloat(card?.querySelector('.input-kda')?.value) || 0,
        totalGold:  Number(card?.querySelector('.input-gold')?.value)    || 0,
      };
    });
  }

  // ── Step navigation ──────────────────────────
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

  // ── Submit ───────────────────────────────────
  function handleSubmitAll() {
    const v = validateStep2();
    if (!v.valid) { showToast(v.message, 'error'); return; }

    const payload = { game: getGameInfo(), players: getPlayerStats() };

    fetch(`${apiBase()}update_game.php`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok || !json || !json.ok) throw new Error((json && json.message) || 'Gagal memperbarui game.');
        return json;
      })
      .then(() => {
        showToast('Game berhasil diperbarui!', 'success');
        setTimeout(() => { window.location.href = `game.html?match_id=${matchId}`; }, REDIRECT_DELAY_MS);
      })
      .catch((err) => showToast(err.message || 'Terjadi kesalahan.', 'error'));
  }

  // ── Init ─────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    // FIX Bug 1: baca param 'id' ATAU 'game_id' — game.html biasanya link ke editgame.html?id=X
    const rawId = getParam('id') || getParam('game_id') || '0';
    gameId  = parseInt(rawId, 10);
    matchId = parseInt(getParam('match_id') || '0', 10);

    if (gameId <= 0) {
      showToast('game_id tidak ditemukan di URL. Pastikan URL mengandung ?id=X', 'error');
      return; // hentikan eksekusi agar tidak fetch dengan id=0
    }

    attachRoleTabListeners();

    loadGameData().catch((err) => showToast(err.message || 'Gagal memuat data.', 'error'));

    document.getElementById('btnNextStep')?.addEventListener('click', handleNextStep);
    document.getElementById('btnBackStep')?.addEventListener('click', goToStep1);
    document.getElementById('btnSubmitAll')?.addEventListener('click', handleSubmitAll);
  });

})();
