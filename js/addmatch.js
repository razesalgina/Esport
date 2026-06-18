// js/addmatch.js
(function () {
  const REDIRECT_DELAY_MS = 1500;

  // competition_id dari URL (?competition_id=X)
  // Jika > 0: eventSelect di-preselect ke competition ini, backBtn/cancelBtn
  // kembali ke match.html?competition_id=X. User tetap BISA ganti event.
  let lockedCompetitionId = 0;

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
      formElement:      document.getElementById('addMatchForm'),
      typeRadioGroup:   document.getElementById('typeRadioGroup'),
      eventGroup:       document.getElementById('eventGroup'),
      opponentGroup:    document.getElementById('opponentGroup'),
      opponentInput:    document.getElementById('opponentNameInput'),
      datetimeGroup:    document.getElementById('datetimeGroup'),
      formatGroup:      document.getElementById('formatGroup'),
      dateGroup:        document.getElementById('dateGroup'),
      timeGroup:        document.getElementById('timeGroup'),
      rankedAutoLabel:  document.getElementById('rankedAutoLabel'),
      breadcrumbParent: document.getElementById('breadcrumbParent'),
      backBtn:          document.getElementById('backBtn'),
      cancelBtn:        document.getElementById('cancelBtn'),
    };
  }

  // ── Hitung href kembali berdasarkan lockedCompetitionId ──
  function backHref(type) {
    if (lockedCompetitionId) return `match.html?competition_id=${lockedCompetitionId}`;
    return (type === 'scrim' || type === 'ranked') ? 'train.html' : 'match.html';
  }

  // ── Auto-generate ranked name ─────────────────────
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

  // ── Update breadcrumb & back / cancel links ──────────
  function updateNavLinks(type) {
    const { breadcrumbParent, backBtn, cancelBtn } = getElements();
    const href = backHref(type);

    let label;
    if (lockedCompetitionId) {
      label = 'Match';
    } else {
      label = (type === 'scrim' || type === 'ranked') ? 'Train' : 'Match';
    }

    if (breadcrumbParent) breadcrumbParent.textContent = label;
    if (backBtn)          backBtn.href   = href;
    if (cancelBtn)        cancelBtn.href = href;
  }

  // ── Form visibility ────────────────────────────
  function updateFormVisibility(type) {
    const {
      eventGroup, opponentGroup, datetimeGroup,
      formatGroup, dateGroup, timeGroup, rankedAutoLabel,
    } = getElements();
    if (!datetimeGroup) return;

    // Sembunyikan semua dulu
    [eventGroup, opponentGroup, datetimeGroup,
     formatGroup, dateGroup, timeGroup, rankedAutoLabel].forEach((el) => {
      if (el) el.classList.add('hidden');
    });

    updateNavLinks(type);

    if (type === 'tournament' || type === 'league') {
      if (eventGroup) eventGroup.classList.remove('hidden');
      // Muat daftar kompetisi; jika ada lockedCompetitionId maka option-nya di-preselect
      loadUpcomingCompetitions(lockedCompetitionId);
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

  // ── Submit ──────────────────────────────────
  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const type          = (formData.get('type') || '').toLowerCase();
    const matchDate     = formData.get('matchDate') || '';
    const matchTime     = formData.get('matchTime') || '';
    const format        = formData.get('matchFormat') || null;
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
      .then((savedMatch) => {
        showToast('Match berhasil disimpan!', 'success');
        // Redirect: utamakan competition_id dari match yang baru disimpan,
        // fallback ke lockedCompetitionId, lalu ke tipe-based redirect.
        const savedCompId = savedMatch && savedMatch.competition_id
          ? savedMatch.competition_id
          : competitionId;

        let redirect;
        if (savedCompId) {
          redirect = `match.html?competition_id=${savedCompId}`;
        } else {
          redirect = (type === 'scrim' || type === 'ranked') ? 'train.html' : 'match.html';
        }
        setTimeout(() => { window.location.href = redirect; }, REDIRECT_DELAY_MS);
      })
      .catch((err) => showToast(err.message || 'Terjadi kesalahan saat menyimpan match.', 'error'));
  }

  // ── Load competitions ────────────────────────────
  // selectedId: jika > 0, option dengan id ini akan di-set selected
  function loadUpcomingCompetitions(selectedId) {
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
            const opt        = document.createElement('option');
            opt.value        = c.id;
            opt.textContent  = `${c.name}`;
            // Tandai selected jika cocok dengan competition_id dari URL
            if (selectedId && Number(c.id) === Number(selectedId)) {
              opt.selected = true;
            }
            select.appendChild(opt);
          });
      })
      .catch((err) => showToast(err.message || 'Gagal memuat daftar kompetisi.', 'error'));
  }

  // ── Setup context: pre-select dari competition page ──
  //
  // Jika URL mengandung ?competition_id=X:
  //   1. Set lockedCompetitionId (dipakai backHref & updateNavLinks)
  //   2. Update breadcrumb & backBtn ke match.html?competition_id=X
  //   3. Pre-select & kunci radio sesuai tipe competition (tournament/league)
  //   4. Trigger updateFormVisibility → memanggil loadUpcomingCompetitions(selectedId)
  async function setupCompetitionContext() {
    const cid = parseInt(getParam('competition_id') || '0', 10);
    if (!cid) return;

    lockedCompetitionId = cid;

    // Update breadcrumb & tombol sebelum fetch selesai (pakai placeholder)
    const { breadcrumbParent, backBtn, cancelBtn } = getElements();
    const href = `match.html?competition_id=${cid}`;
    if (breadcrumbParent) breadcrumbParent.textContent = 'Match';
    if (backBtn)   backBtn.href   = href;
    if (cancelBtn) cancelBtn.href = href;

    // Fetch tipe competition untuk pre-select radio yang tepat
    let preType = 'tournament';
    try {
      const res  = await fetch(`${apiBase()}competition_api.php?action=get&id=${cid}`);
      const json = await res.json().catch(() => null);
      if (json && json.ok && json.competition) {
        const t = (json.competition.type || '').toLowerCase();
        if (t === 'league') preType = 'league';
      }
    } catch (_) { /* fallback ke tournament */ }

    // Pre-select radio (tournament atau league); radio lain tetap bisa dipilih
    const matchingRadio = document.querySelector(`input[name="type"][value="${preType}"]`);
    if (matchingRadio) matchingRadio.checked = true;

    // Trigger form visibility → ini memanggil loadUpcomingCompetitions(lockedCompetitionId)
    updateFormVisibility(preType);
  }

  // ── Init ──────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    attachTypeListeners();
    const form = document.getElementById('addMatchForm');
    if (form) form.addEventListener('submit', handleSubmit);

    await setupCompetitionContext();
  });

})();
