// js/addmatch.js
(function () {
  const REDIRECT_DELAY_MS = 1500;

  // competition_id dari URL (?competition_id=X)
  // Jika > 0, form berjalan dalam mode "locked" — event tidak bisa diganti user.
  let lockedCompetitionId   = 0;
  let lockedCompetitionName = '';

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function apiBase() {
    return window.EsportConfig ? window.EsportConfig.apiBase : 'db/';
  }

  function showToast(message, type) {
    if (window.Esport && typeof window.Esport.showToast === 'function') {
      window.Esport.showToast(message, type);
    }
  }

  function getElements() {
    return {
      formElement:          document.getElementById('addMatchForm'),
      typeRadioGroup:       document.getElementById('typeRadioGroup'),
      eventGroup:           document.getElementById('eventGroup'),
      eventReadonlyGroup:   document.getElementById('eventReadonlyGroup'),
      eventReadonlyDisplay: document.getElementById('eventReadonlyDisplay'),
      eventHidden:          document.getElementById('eventHidden'),
      opponentGroup:        document.getElementById('opponentGroup'),
      opponentInput:        document.getElementById('opponentNameInput'),
      datetimeGroup:        document.getElementById('datetimeGroup'),
      formatGroup:          document.getElementById('formatGroup'),
      dateGroup:            document.getElementById('dateGroup'),
      timeGroup:            document.getElementById('timeGroup'),
      rankedAutoLabel:      document.getElementById('rankedAutoLabel'),
      breadcrumbParent:     document.getElementById('breadcrumbParent'),
      backBtn:              document.getElementById('backBtn'),
      cancelBtn:            document.getElementById('cancelBtn'),
    };
  }

  // ── Auto-generate ranked name ────────────────────
  function fetchNextRankedName() {
    return fetch(`${apiBase()}match_api.php?action=list`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json || !json.ok) return 'Ranked1';
        const rankeds = (json.matches || []).filter(
          (m) => (m.type || '').toLowerCase() === 'ranked'
        );
        return `Ranked${rankeds.length + 1}`;
      })
      .catch(() => 'Ranked1');
  }

  // ── Update breadcrumb & back / cancel links ─────────
  function updateNavLinks(type) {
    const { breadcrumbParent, backBtn, cancelBtn } = getElements();

    let href, label;
    if (lockedCompetitionId) {
      // Selalu kembali ke match.html dengan filter competition jika locked
      href  = `match.html?competition_id=${lockedCompetitionId}`;
      label = lockedCompetitionName
        ? `Match — ${lockedCompetitionName}`
        : 'Match';
    } else {
      const isTrainType = type === 'scrim' || type === 'ranked';
      href  = isTrainType ? 'train.html' : 'match.html';
      label = isTrainType ? 'Train' : 'Match';
    }

    if (breadcrumbParent) breadcrumbParent.textContent = label;
    if (backBtn)          backBtn.href   = href;
    if (cancelBtn)        cancelBtn.href = href;
  }

  // ── Form visibility ───────────────────────────
  function updateFormVisibility(type) {
    const {
      eventGroup, eventReadonlyGroup,
      opponentGroup, datetimeGroup, formatGroup,
      dateGroup, timeGroup, rankedAutoLabel,
    } = getElements();
    if (!datetimeGroup) return;

    // Sembunyikan semua dulu
    [eventGroup, eventReadonlyGroup, opponentGroup, datetimeGroup,
     formatGroup, dateGroup, timeGroup, rankedAutoLabel].forEach((el) => {
      if (el) el.classList.add('hidden');
    });

    updateNavLinks(type);

    if (type === 'tournament' || type === 'league') {
      // Event: tampilkan readonly jika locked, select jika bebas
      if (lockedCompetitionId) {
        if (eventReadonlyGroup) eventReadonlyGroup.classList.remove('hidden');
      } else {
        if (eventGroup) eventGroup.classList.remove('hidden');
        loadUpcomingCompetitions();
      }
      if (formatGroup)   formatGroup.classList.remove('hidden');
      if (opponentGroup) opponentGroup.classList.remove('hidden');
      if (datetimeGroup) datetimeGroup.classList.remove('hidden');
      if (dateGroup)     dateGroup.classList.remove('hidden');
      if (timeGroup)     timeGroup.classList.remove('hidden');

    } else if (type === 'scrim') {
      if (formatGroup)   formatGroup.classList.remove('hidden');
      if (opponentGroup) opponentGroup.classList.remove('hidden');
      if (datetimeGroup) datetimeGroup.classList.remove('hidden');
      if (dateGroup)     dateGroup.classList.remove('hidden');

    } else if (type === 'ranked') {
      if (datetimeGroup)   datetimeGroup.classList.remove('hidden');
      if (dateGroup)       dateGroup.classList.remove('hidden');
      if (rankedAutoLabel) rankedAutoLabel.classList.remove('hidden');

      fetchNextRankedName().then((name) => {
        if (rankedAutoLabel) {
          rankedAutoLabel.textContent        = `Sesi ini akan disimpan sebagai: ${name}`;
          rankedAutoLabel.dataset.rankedName = name;
        }
      });
    }
  }

  function attachTypeListeners() {
    const { formElement } = getElements();
    if (!formElement) return;
    formElement.querySelectorAll('input[name="type"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        updateFormVisibility((e.target.value || '').toLowerCase());
      });
    });
  }

  // ── Submit ─────────────────────────────────
  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const type          = (formData.get('type') || '').toLowerCase();
    const matchDate     = formData.get('matchDate') || '';
    const matchTime     = formData.get('matchTime') || '';
    const format        = formData.get('matchFormat') || null;
    // name="event" dipakai oleh eventSelect (normal) dan eventHidden (locked)
    const competitionId = formData.get('event') ? Number(formData.get('event')) : null;

    if (!type) { showToast('Kategori match wajib dipilih', 'error'); return; }

    let opponentName;

    if (type === 'ranked') {
      const rankedAutoLabel = document.getElementById('rankedAutoLabel');
      opponentName = (rankedAutoLabel && rankedAutoLabel.dataset.rankedName)
        ? rankedAutoLabel.dataset.rankedName
        : null;
      if (!matchDate) { showToast('Tanggal wajib diisi untuk Ranked', 'error'); return; }

    } else {
      opponentName = (formData.get('opponentName') || '').trim() || null;

      if ((type === 'tournament' || type === 'league') &&
          (!format || !opponentName || !matchDate || !matchTime || !competitionId)) {
        showToast('Format, lawan, tanggal, jam, dan nama kompetisi wajib diisi', 'error'); return;
      }
      if (type === 'scrim' && (!format || !opponentName || !matchDate)) {
        showToast('Format, lawan, dan tanggal wajib diisi untuk Scrim', 'error'); return;
      }
    }

    const payload = {
      action:         'add',
      type,
      competition_id: competitionId,
      format:         format ? format.toUpperCase() : null,
      opponent_name:  opponentName,
      our_score:      0,
      opponent_score: 0,
      match_date:     matchDate || null,
      match_time:     matchTime || null,
    };

    fetch(`${apiBase()}match_api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok || !json || !json.ok) throw new Error((json && json.message) || 'Gagal menyimpan match.');
        return json.match;
      })
      .then(() => {
        showToast('Match berhasil disimpan!', 'success');
        // Setelah simpan, kembali ke halaman yang relevan
        let redirect;
        if (lockedCompetitionId) {
          redirect = `match.html?competition_id=${lockedCompetitionId}`;
        } else {
          redirect = (type === 'scrim' || type === 'ranked') ? 'train.html' : 'match.html';
        }
        setTimeout(() => { window.location.href = redirect; }, REDIRECT_DELAY_MS);
      })
      .catch((err) => showToast(err.message || 'Terjadi kesalahan saat menyimpan match.', 'error'));
  }

  // ── Load competitions (mode normal / bebas) ──────────
  function loadUpcomingCompetitions() {
    const select = document.getElementById('eventSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Pilih Tournament/League</option>';

    fetch(`${apiBase()}competition_api.php?action=list`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json || !json.ok) throw new Error('Gagal mengambil daftar kompetisi.');
        return json.competitions || [];
      })
      .then((competitions) => {
        competitions
          .filter((c) => {
            const t = (c.type || '').toLowerCase();
            const s = (c.status || '').toLowerCase();
            return (t === 'tournament' || t === 'league') && s === 'upcoming';
          })
          .forEach((c) => {
            const opt = document.createElement('option');
            opt.value       = c.id;
            opt.textContent = `${c.name} (${c.type})`;
            select.appendChild(opt);
          });
      })
      .catch((err) => showToast(err.message || 'Gagal memuat daftar kompetisi.', 'error'));
  }

  // ── Fetch nama competition dari API ────────────────
  async function fetchCompetitionName(cid) {
    try {
      const res  = await fetch(`${apiBase()}competition_api.php?action=get&id=${cid}`);
      const json = await res.json().catch(() => null);
      if (json && json.ok && json.competition) return json.competition.name || '';
    } catch (_) { /* silent */ }
    return '';
  }

  // ── Setup context: locked dari competition page ────────
  //
  // Jika URL mengandung ?competition_id=X:
  //   1. Fetch nama kompetisi
  //   2. Tampilkan div readonly (bukan select)
  //   3. Isi hidden input dengan competition_id agar FormData terbawa
  //   4. Pre-select & kunci radio ke tournament/league
  //   5. Sembunyikan pilihan scrim & ranked dari radio (tidak relevan)
  //   6. Update breadcrumb & backBtn ke match.html?competition_id=X
  async function setupCompetitionContext() {
    const cid = parseInt(getParam('competition_id') || '0', 10);
    if (!cid) return;

    lockedCompetitionId   = cid;
    lockedCompetitionName = await fetchCompetitionName(cid);

    // 1. Isi readonly display & hidden input
    const { eventReadonlyDisplay, eventHidden } = getElements();
    if (eventReadonlyDisplay) {
      eventReadonlyDisplay.textContent = lockedCompetitionName
        ? `${lockedCompetitionName}`
        : `Competition #${cid}`;
    }
    if (eventHidden) eventHidden.value = String(cid);

    // 2. Sembunyikan radio scrim & ranked (tidak berlaku untuk competition context)
    const radios = document.querySelectorAll('input[name="type"]');
    radios.forEach((radio) => {
      const val = (radio.value || '').toLowerCase();
      if (val === 'scrim' || val === 'ranked') {
        const item = radio.closest('.radio-item');
        if (item) item.style.display = 'none';
      }
    });

    // 3. Pre-select tournament (default untuk competition context)
    //    Cari apakah competition type bisa di-detect dari nama; fallback ke tournament
    let preType = 'tournament';
    try {
      const res  = await fetch(`${apiBase()}competition_api.php?action=get&id=${cid}`);
      const json = await res.json().catch(() => null);
      if (json && json.ok && json.competition) {
        const t = (json.competition.type || '').toLowerCase();
        if (t === 'league') preType = 'league';
      }
    } catch (_) { /* pakai tournament sebagai default */ }

    const matchingRadio = document.querySelector(`input[name="type"][value="${preType}"]`);
    if (matchingRadio) {
      matchingRadio.checked = true;
      // Kunci semua radio agar user tidak bisa mengubah kategori
      radios.forEach((r) => { r.disabled = true; });
    }

    // 4. Update breadcrumb & backBtn
    const { breadcrumbParent, backBtn, cancelBtn } = getElements();
    const backHref = `match.html?competition_id=${cid}`;
    if (breadcrumbParent) breadcrumbParent.textContent = lockedCompetitionName
      ? `Match — ${lockedCompetitionName}`
      : 'Match';
    if (backBtn)   backBtn.href   = backHref;
    if (cancelBtn) cancelBtn.href = backHref;

    // 5. Trigger tampilan form sesuai tipe yang sudah dipilih
    updateFormVisibility(preType);
  }

  // ── Init ──────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    attachTypeListeners();
    const form = document.getElementById('addMatchForm');
    if (form) form.addEventListener('submit', handleSubmit);

    // setupCompetitionContext harus dipanggil SETELAH attachTypeListeners
    // agar listener sudah terpasang saat kita trigger updateFormVisibility
    await setupCompetitionContext();
  });

})();
