// js/editmatch.js
(function () {
  const REDIRECT_DELAY_MS = 1500;

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
      formElement:    document.getElementById('editMatchForm'),
      eventGroup:     document.getElementById('eventGroup'),
      eventLabel:     document.getElementById('eventLabel'),
      eventSelect:    document.getElementById('eventSelect'),
      formatGroup:    document.getElementById('formatGroup'),
      matchFormat:    document.getElementById('matchFormat'),
      opponentGroup:  document.getElementById('opponentGroup'),
      opponentInput:  document.getElementById('opponentNameInput'),
      datetimeGroup:  document.getElementById('datetimeGroup'),
      dateGroup:      document.getElementById('dateGroup'),
      timeGroup:      document.getElementById('timeGroup'),
      rankedAutoLabel: document.getElementById('rankedAutoLabel'),
    };
  }

  // ── Auto-generate ranked name (sama seperti addmatch) ──
  function fetchNextRankedName(currentMatchId) {
    return fetch(`${apiBase()}match_api.php?action=list`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json || !json.ok) return 'Ranked1';
        // Exclude match yang sedang diedit agar nomor urut tidak bergeser
        const rankeds = (json.matches || []).filter(
          (m) =>
            (m.type || '').toLowerCase() === 'ranked' &&
            Number(m.id) !== Number(currentMatchId)
        );
        return `Ranked${rankeds.length + 1}`;
      })
      .catch(() => 'Ranked1');
  }

  /**
   * Perbarui label + placeholder option pertama pada #eventSelect.
   * @param {'tournament'|'league'} type
   */
  function updateEventLabel(type) {
    const { eventLabel, eventSelect } = getElements();
    const labelMap = { tournament: 'Pilih Tournament', league: 'Pilih League' };
    const text = labelMap[type] || 'Pilih Tournament/League';
    if (eventLabel) eventLabel.textContent = text;
    if (eventSelect && eventSelect.options.length > 0 && eventSelect.options[0].value === '') {
      eventSelect.options[0].textContent = text;
    }
  }

  function updateFormVisibility(type) {
    const {
      eventGroup, formatGroup, opponentGroup,
      datetimeGroup, dateGroup, timeGroup, rankedAutoLabel,
    } = getElements();
    if (!datetimeGroup) return;

    // Sembunyikan semua dulu
    [eventGroup, formatGroup, opponentGroup,
     datetimeGroup, dateGroup, timeGroup, rankedAutoLabel].forEach((el) => {
      if (el) el.classList.add('hidden');
    });

    if (type === 'tournament' || type === 'league') {
      if (eventGroup)    eventGroup.classList.remove('hidden');
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

      const matchId = document.getElementById('matchId')?.value || null;
      fetchNextRankedName(matchId).then((name) => {
        if (rankedAutoLabel) {
          rankedAutoLabel.textContent        = `Sesi ini akan disimpan sebagai: ${name}`;
          rankedAutoLabel.dataset.rankedName = name;
        }
      });
    }
  }

  /**
   * Muat daftar kompetisi upcoming sesuai tipe yang dipilih.
   * @param {'tournament'|'league'} filterType
   * @param {string|number|null}   selectedId  - pre-select jika ada
   */
  function loadCompetitions(filterType, selectedId) {
    const { eventSelect } = getElements();
    if (!eventSelect) return;

    updateEventLabel(filterType);
    eventSelect.innerHTML = '';

    const placeholderOpt       = document.createElement('option');
    placeholderOpt.value       = '';
    placeholderOpt.textContent = filterType === 'tournament' ? 'Pilih Tournament' : 'Pilih League';
    placeholderOpt.disabled = true;
    placeholderOpt.selected = true;
    eventSelect.appendChild(placeholderOpt);

    fetch(`${apiBase()}competition_api.php?action=list`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json || !json.ok) throw new Error('Gagal memuat kompetisi');
        return json.competitions || [];
      })
      .then((competitions) => {
        competitions
          .filter((c) => {
            const t = (c.type   || '').toLowerCase();
            const s = (c.status || '').toLowerCase();
            return t === filterType && s === 'upcoming';
          })
          .forEach((c) => {
            const opt       = document.createElement('option');
            opt.value       = c.id;
            opt.textContent = c.name;
            if (selectedId && Number(c.id) === Number(selectedId)) opt.selected = true;
            eventSelect.appendChild(opt);
          });
      })
      .catch((err) => showToast(err.message || 'Gagal memuat daftar kompetisi.', 'error'));
  }

  /**
   * Pasang listener pada radio type.
   * Setiap kali radio berubah:
   *   1. Update visibilitas form
   *   2. Reload daftar kompetisi (jika tournament/league) — tanpa pre-select
   */
  function attachTypeListeners() {
    const { formElement } = getElements();
    if (!formElement) return;

    formElement.querySelectorAll('input[name="type"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        const type = (e.target.value || '').toLowerCase();
        updateFormVisibility(type);
        if (type === 'tournament' || type === 'league') {
          loadCompetitions(type, null);
        }
      });
    });
  }

  function populateForm(match) {
    document.getElementById('matchId').value = match.id;

    const type = (match.type || '').toLowerCase();
    const typeRadio = document.querySelector(`input[name="type"][value="${type}"]`);
    if (typeRadio) typeRadio.checked = true;
    updateFormVisibility(type);

    const opponentInput = document.getElementById('opponentNameInput');
    if (opponentInput) opponentInput.value = match.opponent_name || '';

    const dateInput = document.getElementById('matchDateInput');
    if (dateInput) dateInput.value = match.match_date || '';

    const timeInput = document.getElementById('matchTimeInput');
    if (timeInput) {
      const rawTime = match.match_time || '';
      timeInput.value = rawTime.length >= 5 ? rawTime.substring(0, 5) : rawTime;
    }

    const formatSelect = document.getElementById('matchFormat');
    if (formatSelect && match.format) formatSelect.value = match.format;

    const oppScoreInput = document.getElementById('opponentScore');
    if (oppScoreInput) oppScoreInput.value = match.opponent_score != null ? match.opponent_score : 0;

    const statusSelect = document.getElementById('matchStatus');
    if (statusSelect) statusSelect.value = match.status || 'upcoming';

    // Muat kompetisi dengan filter tipe + pre-select competition_id tersimpan
    if ((type === 'tournament' || type === 'league') && match.competition_id) {
      loadCompetitions(type, match.competition_id);
    }

    const label      = match.opponent_name || 'Edit Match';
    const breadcrumb = document.getElementById('breadcrumbMatchLabel');
    const pageTitle  = document.getElementById('pageTitle');
    if (breadcrumb) breadcrumb.textContent = label;
    if (pageTitle)  pageTitle.textContent  = label;
  }

  /**
   * Bangun payload berdasarkan tipe aktif saat submit.
   * Field yang tidak relevan untuk tipe tersebut di-null-kan
   * agar database tidak menyimpan sisa data dari tipe sebelumnya.
   */
  async function buildPayload(formData) {
    const type = (formData.get('type') || '').toLowerCase();

    // Base payload — semua field nullable diset null dulu
    const payload = {
      action:         'update',
      id:             parseInt(formData.get('id') || '0', 10),
      type,
      competition_id: null,
      format:         null,
      opponent_name:  null,
      match_date:     formData.get('matchDate') || null,
      match_time:     null,
      opponent_score: parseInt(formData.get('opponentScore') || '0', 10),
      status:         formData.get('matchStatus') || null,
    };

    if (type === 'tournament' || type === 'league') {
      payload.competition_id = formData.get('event') ? Number(formData.get('event')) : null;
      payload.format         = formData.get('matchFormat')
        ? formData.get('matchFormat').toUpperCase()
        : null;
      payload.opponent_name  = (formData.get('opponentName') || '').trim() || null;
      payload.match_time     = formData.get('matchTime') || null;

    } else if (type === 'scrim') {
      // competition_id tetap null, format & opponent diisi
      payload.format        = formData.get('matchFormat')
        ? formData.get('matchFormat').toUpperCase()
        : null;
      payload.opponent_name = (formData.get('opponentName') || '').trim() || null;
      // match_time tidak wajib untuk scrim, tapi simpan jika diisi
      payload.match_time    = formData.get('matchTime') || null;

    } else if (type === 'ranked') {
      // competition_id, format, opponent_name, match_time = null (sudah di-null di base)
      // opponent_name diisi otomatis dengan RankedX
      const rankedAutoLabel = document.getElementById('rankedAutoLabel');
      const autoName = rankedAutoLabel?.dataset.rankedName || null;
      if (autoName) {
        payload.opponent_name = autoName;
      } else {
        // fallback: fetch ulang jika label belum ter-render
        payload.opponent_name = await fetchNextRankedName(payload.id);
      }
    }

    return payload;
  }

  function validatePayload(payload) {
    if (!payload.id)   return { valid: false, message: 'ID match tidak ditemukan' };
    if (!payload.type) return { valid: false, message: 'Kategori match wajib dipilih' };

    if (payload.type === 'tournament' || payload.type === 'league') {
      if (!payload.competition_id) return { valid: false, message: 'Kompetisi wajib dipilih' };
      if (!payload.format)         return { valid: false, message: 'Format match wajib dipilih' };
      if (!payload.opponent_name)  return { valid: false, message: 'Nama lawan wajib diisi' };
      if (!payload.match_date)     return { valid: false, message: 'Tanggal match wajib diisi' };
      if (!payload.match_time)     return { valid: false, message: 'Jam match wajib diisi' };
    }
    if (payload.type === 'scrim') {
      if (!payload.format)        return { valid: false, message: 'Format wajib dipilih untuk Scrim' };
      if (!payload.opponent_name) return { valid: false, message: 'Nama lawan wajib diisi untuk Scrim' };
      if (!payload.match_date)    return { valid: false, message: 'Tanggal wajib diisi untuk Scrim' };
    }
    if (payload.type === 'ranked' && !payload.match_date) {
      return { valid: false, message: 'Tanggal wajib diisi untuk Ranked' };
    }

    return { valid: true, message: '' };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const payload    = await buildPayload(formData);
    const validation = validatePayload(payload);
    if (!validation.valid) { showToast(validation.message, 'error'); return; }

    fetch(`${apiBase()}match_api.php`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok || !json || !json.ok) throw new Error((json && json.message) || 'Gagal memperbarui match.');
        return json.match;
      })
      .then((savedMatch) => {
        showToast('Match berhasil diperbarui!', 'success');
        // Redirect: jika match masih punya competition_id → kembali ke halaman kompetisi itu.
        // Jika sudah di-null (ubah ke scrim/ranked) → kembali ke match.html atau train.html.
        const savedCompId = savedMatch && savedMatch.competition_id
          ? savedMatch.competition_id
          : null;

        let redirect;
        if (savedCompId) {
          redirect = `match.html?competition_id=${savedCompId}`;
        } else {
          const t = (savedMatch && savedMatch.type) || payload.type;
          redirect = (t === 'scrim' || t === 'ranked') ? 'train.html' : 'match.html';
        }
        setTimeout(() => { window.location.href = redirect; }, REDIRECT_DELAY_MS);
      })
      .catch((err) => showToast(err.message || 'Terjadi kesalahan saat memperbarui match.', 'error'));
  }

  function getIdFromUrl() {
    return new URLSearchParams(window.location.search).get('id');
  }

  function initEditMatchPage() {
    const formElement = document.getElementById('editMatchForm');
    if (!formElement) return;

    const id = getIdFromUrl();
    if (!id) { window.location.href = 'match.html'; return; }

    attachTypeListeners();

    fetch(`${apiBase()}match_api.php?action=get&id=${id}`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json || !json.ok) throw new Error('Match tidak ditemukan');
        return json.match;
      })
      .then((match) => {
        populateForm(match);
        formElement.addEventListener('submit', handleSubmit);
      })
      .catch(() => { window.location.href = 'match.html'; });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initEditMatchPage();
  });

})();