// js/editmatch.js
(function () {
  const REDIRECT_DELAY_MS = 1500;

  function showToast(message, type) {
    if (window.Esport && typeof window.Esport.showToast === 'function') {
      window.Esport.showToast(message, type);
    }
  }

  function getElements() {
    return {
      formElement:   document.getElementById('editMatchForm'),
      eventGroup:    document.getElementById('eventGroup'),
      formatGroup:   document.getElementById('formatGroup'),
      opponentGroup: document.getElementById('opponentGroup'),
      datetimeGroup: document.getElementById('datetimeGroup'),
      dateGroup:     document.getElementById('dateGroup'),
      timeGroup:     document.getElementById('timeGroup'),
    };
  }

  function updateFormVisibility(type) {
    const { eventGroup, formatGroup, opponentGroup, datetimeGroup, dateGroup, timeGroup } = getElements();
    if (!eventGroup) return;

    [eventGroup, formatGroup, opponentGroup, datetimeGroup, dateGroup, timeGroup].forEach((el) => {
      if (el) el.classList.add('hidden');
    });

    if (type === 'tournament' || type === 'league') {
      eventGroup.classList.remove('hidden');
      formatGroup.classList.remove('hidden');
      opponentGroup.classList.remove('hidden');
      datetimeGroup.classList.remove('hidden');
      dateGroup.classList.remove('hidden');
      timeGroup.classList.remove('hidden');
    } else if (type === 'scrim') {
      formatGroup.classList.remove('hidden');
      opponentGroup.classList.remove('hidden');
      datetimeGroup.classList.remove('hidden');
      dateGroup.classList.remove('hidden');
    } else if (type === 'ranked') {
      datetimeGroup.classList.remove('hidden');
      dateGroup.classList.remove('hidden');
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

  function loadCompetitions(selectedId) {
    const apiBase = window.EsportConfig ? window.EsportConfig.apiBase : 'db/';
    const select = document.getElementById('eventSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Pilih Tournament/League</option>';

    fetch(`${apiBase}competition_api.php?action=list`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json || !json.ok) throw new Error('Gagal memuat kompetisi');
        return json.competitions || [];
      })
      .then((competitions) => {
        competitions
          .filter((c) => {
            const t = (c.type || '').toLowerCase();
            return t === 'tournament' || t === 'league';
          })
          .forEach((c) => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `${c.name} (${c.type})`;
            if (selectedId && String(c.id) === String(selectedId)) opt.selected = true;
            select.appendChild(opt);
          });
      })
      .catch((err) => showToast(err.message || 'Gagal memuat daftar kompetisi.', 'error'));
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

    // format kolom DB = 'format'
    const formatSelect = document.getElementById('matchFormat');
    if (formatSelect && match.format) formatSelect.value = match.format;

    const ourScoreInput = document.getElementById('ourScore');
    if (ourScoreInput) ourScoreInput.value = match.our_score != null ? match.our_score : 0;

    const oppScoreInput = document.getElementById('opponentScore');
    if (oppScoreInput) oppScoreInput.value = match.opponent_score != null ? match.opponent_score : 0;

    const statusSelect = document.getElementById('matchStatus');
    if (statusSelect) statusSelect.value = match.status || 'upcoming';

    if ((type === 'tournament' || type === 'league') && match.competition_id) {
      loadCompetitions(match.competition_id);
    }

    const label = match.opponent_name ? `${match.opponent_name}` : 'Edit Match';
    const breadcrumb = document.getElementById('breadcrumbMatchLabel');
    const pageTitle  = document.getElementById('pageTitle');
    if (breadcrumb) breadcrumb.textContent = label;
    if (pageTitle)  pageTitle.textContent  = label;
  }

  function validatePayload(payload) {
    if (!payload.id)   return { valid: false, message: 'ID match tidak ditemukan' };
    if (!payload.type) return { valid: false, message: 'Kategori match wajib dipilih' };
    if ((payload.type === 'tournament' || payload.type === 'league')) {
      if (!payload.opponent_name) return { valid: false, message: 'Nama lawan wajib diisi' };
      if (!payload.match_date)    return { valid: false, message: 'Tanggal match wajib diisi' };
      if (!payload.match_time)    return { valid: false, message: 'Jam match wajib diisi' };
    }
    if (payload.type === 'scrim') {
      if (!payload.opponent_name) return { valid: false, message: 'Nama lawan wajib diisi untuk Scrim' };
      if (!payload.match_date)    return { valid: false, message: 'Tanggal wajib diisi untuk Scrim' };
    }
    if (payload.type === 'ranked' && !payload.match_date) {
      return { valid: false, message: 'Tanggal wajib diisi untuk Ranked' };
    }
    return { valid: true, message: '' };
  }

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const payload = {
      action:         'update',
      id:             parseInt(formData.get('id') || '0', 10),
      type:           (formData.get('type') || '').toLowerCase(),
      competition_id: formData.get('event') ? Number(formData.get('event')) : null,
      format:         formData.get('matchFormat') ? formData.get('matchFormat').toUpperCase() : null,
      opponent_name:  (formData.get('opponentName') || '').trim() || null,
      match_date:     formData.get('matchDate') || null,
      match_time:     formData.get('matchTime') || null,
      our_score:      parseInt(formData.get('ourScore') || '0', 10),
      opponent_score: parseInt(formData.get('opponentScore') || '0', 10),
      status:         formData.get('matchStatus') || null,
    };

    const validation = validatePayload(payload);
    if (!validation.valid) { showToast(validation.message, 'error'); return; }

    const apiBase = window.EsportConfig ? window.EsportConfig.apiBase : 'db/';
    fetch(`${apiBase}match_api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok || !json || !json.ok) throw new Error((json && json.message) || 'Gagal memperbarui match.');
        return json.match;
      })
      .then(() => {
        showToast('Match berhasil diperbarui!', 'success');
        setTimeout(() => { window.location.href = 'match.html'; }, REDIRECT_DELAY_MS);
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

    const apiBase = window.EsportConfig ? window.EsportConfig.apiBase : 'db/';
    fetch(`${apiBase}match_api.php?action=get&id=${id}`)
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