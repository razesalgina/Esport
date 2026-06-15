// js/addmatch.js
(function () {
  const REDIRECT_DELAY_MS = 1500;

  function getFormElement() {
    return document.getElementById('addMatchForm');
  }

  function showToast(message, type) {
    if (window.Esport && typeof window.Esport.showToast === 'function') {
      window.Esport.showToast(message, type);
    }
  }

  function getElements() {
    return {
      formElement: document.getElementById('addMatchForm'),
      eventGroup: document.getElementById('eventGroup'),
      opponentGroup: document.getElementById('opponentGroup'),
      datetimeGroup: document.getElementById('datetimeGroup'),
      formatGroup: document.getElementById('formatGroup'),
      dateGroup: document.getElementById('dateGroup'),
      timeGroup: document.getElementById('timeGroup'),
    };
  }

  function attachTypeListeners() {
    const { formElement } = getElements();
    if (!formElement) return;

    const typeRadios = formElement.querySelectorAll('input[name="type"]');
    typeRadios.forEach((radio) => {
      radio.addEventListener('change', (event) => {
        const selectedType = (event.target.value || '').toLowerCase();
        updateFormVisibility(selectedType);
      });
    });
  }

  function updateFormVisibility(type) {
    const {
      eventGroup,
      opponentGroup,
      datetimeGroup,
      formatGroup,
      dateGroup,
      timeGroup,
    } = getElements();

    if (!eventGroup || !opponentGroup || !datetimeGroup || !formatGroup || !dateGroup || !timeGroup) return;

    // Reset: semua hidden
    eventGroup.classList.add('hidden');
    opponentGroup.classList.add('hidden');
    datetimeGroup.classList.add('hidden');
    formatGroup.classList.add('hidden');
    dateGroup.classList.add('hidden');
    timeGroup.classList.add('hidden');

    if (type === 'tournament' || type === 'league') {
      eventGroup.classList.remove('hidden');
      formatGroup.classList.remove('hidden');
      opponentGroup.classList.remove('hidden');
      datetimeGroup.classList.remove('hidden');
      dateGroup.classList.remove('hidden');
      timeGroup.classList.remove('hidden'); // jam muncul
      loadUpcomingCompetitions();
    } else if (type === 'scrim') {
      formatGroup.classList.remove('hidden');
      opponentGroup.classList.remove('hidden');
      datetimeGroup.classList.remove('hidden');
      dateGroup.classList.remove('hidden');
      // timeGroup tetap hidden
    } else if (type === 'ranked') {
      datetimeGroup.classList.remove('hidden');
      dateGroup.classList.remove('hidden');
      // formatGroup, opponentGroup, timeGroup tetap hidden
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);

    const typeRaw = formData.get('type') || '';
    const type = typeRaw.toLowerCase();
    const opponentName = formData.get('opponentName') || '';
    const matchDate = formData.get('matchDate') || '';
    const matchTime = formData.get('matchTime') || '';
    const matchFormat = formData.get('matchFormat') || '';
    const competitionIdRaw = formData.get('event') || '';
    const competitionId = competitionIdRaw ? Number(competitionIdRaw) : null;

   if (!type) {
      showToast('Kategori match wajib dipilih', 'error');
      return;
    }

    if (type === 'tournament' || type === 'league') {
      if (!matchFormat || !opponentName || !matchDate || !matchTime || !competitionId) {
        showToast('Format, lawan, tanggal, jam, dan nama kompetisi wajib diisi', 'error');
        return;
      } 
    } else if (type === 'scrim') {
      if (!matchFormat || !opponentName || !matchDate) {
        showToast('Format, lawan, dan tanggal wajib diisi untuk Scrim', 'error');        
        return;
      }
    } else if (type === 'ranked') {
      if (!matchDate) {
        showToast('Tanggal wajib diisi untuk Ranked', 'error');        
        return;
      }
    }

    const payload = {
      action: 'add',
      type,
      competition_id: competitionId,
      opponent_name: opponentName || null,
      our_score: 0,
      opponent_score: 0,
      match_date: matchDate || null,
      match_time: matchTime || null,
    };

    const apiBase = window.EsportConfig ? window.EsportConfig.apiBase : 'db/';
    fetch(`${apiBase}match_api.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        const json = await response.json().catch(() => null);
        if (!response.ok || !json || !json.ok) {
          const message = (json && json.message) || 'Gagal menyimpan match.';
          throw new Error(message);
        }
        return json.match;
      })
      .then(() => {
        showToast('Match berhasil disimpan!', 'success');
        setTimeout(() => {
          window.location.href = 'match.html';
        }, REDIRECT_DELAY_MS);
      })
      .catch((error) => {
        showToast(error.message || 'Terjadi kesalahan saat menyimpan match.', 'error');
      });
  }

  function initAddMatchPage() {
    const formElement = getFormElement();
    if (!formElement) return;

    attachTypeListeners();
    formElement.addEventListener('submit', handleSubmit);
  }

  function loadUpcomingCompetitions() {
    const apiBase = window.EsportConfig ? window.EsportConfig.apiBase : 'db/';
    const select = document.getElementById('eventSelect');
    if (!select) return;

    // Kosongkan dulu, lalu set placeholder
    select.innerHTML = '<option value="">Pilih Tournament/League</option>';

    fetch(`${apiBase}competition_api.php?action=list`)
      .then(async (response) => {
        const json = await response.json().catch(() => null);
        if (!response.ok || !json || !json.ok) {
          throw new Error((json && json.message) || 'Gagal mengambil daftar kompetisi.');
        }
        return json.competitions || [];
      })
      .then((competitions) => {
        const filtered = competitions.filter((c) => {
          const type = (c.type || '').toLowerCase();
          const status = (c.status || '').toLowerCase();
          return (type === 'tournament' || type === 'league') && status === 'upcoming';
        });

        filtered.forEach((c) => {
          const opt = document.createElement('option');
          opt.value = c.id; // simpan id competition
          opt.textContent = `${c.name} (${c.type})`;
          select.appendChild(opt);
        });
      })
      .catch((error) => {
        console.error('loadUpcomingCompetitions error:', error);
        // Biarkan placeholder default saja, atau bisa pakai toast
        if (window.Esport && typeof window.Esport.showToast === 'function') {
          window.Esport.showToast(error.message || 'Gagal memuat daftar kompetisi.', 'error');
        }
      });
  }

  document.addEventListener('DOMContentLoaded', () => {    
    initAddMatchPage();
  });
})();