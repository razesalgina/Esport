// js/addcompetition.js
(function () {
  const REDIRECT_DELAY_MS = 1500;

  function getFormElement() {
    return document.getElementById('competitionForm');
  }

  function showToast(message, type) {
    if (window.Esport && typeof window.Esport.showToast === 'function') {
      window.Esport.showToast(message, type);
    }
  }

function getPhaseID(index) {
  return document.getElementById(`phase${index}Group`);
}

// Show/hide phase blocks sesuai jumlah fase yang dipilih
function updatePhaseBlockVisibility(count) {
  const MAX_PHASES = 4;
  
  for (let i = 1; i <= MAX_PHASES; i++) {
    const block = getPhaseID(i);
    if (!block) {
      continue;
    }
    const shouldHide = i > count;
    block.classList.toggle('hidden', shouldHide);
  }
}

// Attach listener ke select#phaseCount
function attachPhaseCountListener() {
  const phaseCountSelect = document.getElementById('phaseCount');
  if (!phaseCountSelect) return;

  // Jalankan sekali saat init untuk state awal
  updatePhaseBlockVisibility(parseInt(phaseCountSelect.value) || 1);

  phaseCountSelect.addEventListener('change', (e) => {
    const count = parseInt(e.target.value) || 1;
    updatePhaseBlockVisibility(count);
  });
}

  function getPhaseElements(phaseIndex) {
    const form = getFormElement();
    return {
      formatRadios: form
        ? form.querySelectorAll(`input[name="phaseFormat${phaseIndex}"]`)
        : [],
      positionGroup: document.getElementById(`phase${phaseIndex}PositionGroup`),
      groupTeamCountGroup: document.getElementById(`phase${phaseIndex}GroupTeamCountGroup`),
      swissRoundGroup: document.getElementById(`phase${phaseIndex}SwissRoundGroup`),
    };
  }

  function setHidden(element, hidden) {
    if (!element) return;
    if (hidden) {
      element.classList.add('hidden');
      element.setAttribute('aria-hidden', 'true');
    } else {
      element.classList.remove('hidden');
      element.removeAttribute('aria-hidden');
    }
  }

  function updatePhaseVisibilityForFormat(phaseIndex, formatValue) {
    const { positionGroup, groupTeamCountGroup, swissRoundGroup } = getPhaseElements(phaseIndex);
    const fmt = (formatValue || '').toLowerCase();

    // Reset semua sub-group dulu
    setHidden(positionGroup, true);
    setHidden(groupTeamCountGroup, true);
    setHidden(swissRoundGroup, true);

    if (fmt === 'double_elimination') {
      setHidden(positionGroup, false);
    } else if (fmt === 'group_stage') {
      setHidden(groupTeamCountGroup, false);
    } else if (fmt === 'swiss_stage') {
      setHidden(swissRoundGroup, false);
    }
    // single_elimination: semua tetap hidden
  }

  function attachPhaseFormatListeners(phaseIndex) {
    const { formatRadios } = getPhaseElements(phaseIndex);
    if (!formatRadios || formatRadios.length === 0) return;
    //console.log('Attach listener fase', phaseIndex, formatRadios.length);

    formatRadios.forEach((radio) => {
      radio.addEventListener('change', (event) => {
        const selected = event.target.value || '';        
        updatePhaseVisibilityForFormat(phaseIndex, selected);
      });
    });
  }

  function attachAllFormatListeners() {
    for (let i = 1; i <= 4; i += 1) {
      attachPhaseFormatListeners(i);
    }
  }

  function getPhaseFormatValue(phaseIndex) {
    const name = `phaseFormat${phaseIndex}`;
    const radio = document.querySelector(`input[name="${name}"]:checked`);
    return radio ? radio.value : '';
  }

  function buildCompetitionPayload(formElement) {
    const formData = new FormData(formElement);

    const typeRaw = formData.get('type') || '';
    const type = typeRaw.toLowerCase();
    const name = (formData.get('competitionName') || '').toString().trim();
    const registrationFee = formData.get('registrationFee') || '0';
    const prizepool = formData.get('prizepool') || '0';
    const finalRank = formData.get('finalRank') || null;
    const status = formData.get('competitionStatus') || null;
    const teamCount = formData.get('teamCount') || '0';
    const phaseCountStr = formData.get('phaseCount') || '1';
    const phaseCount = parseInt(phaseCountStr, 10) || 1;

    const phaseFormat1 = getPhaseFormatValue(1) || null;
    const phaseFormat2 = phaseCount >= 2 ? getPhaseFormatValue(2) || null : null;
    const phaseFormat3 = phaseCount >= 3 ? getPhaseFormatValue(3) || null : null;
    const phaseFormat4 = phaseCount >= 4 ? getPhaseFormatValue(4) || null : null;

    const phaseStatus1 = formData.get('phaseStatus1') || null;
    const phaseStatus2 = phaseCount >= 2 ? formData.get('phaseStatus2') || null : null;
    const phaseStatus3 = phaseCount >= 3 ? formData.get('phaseStatus3') || null : null;
    const phaseStatus4 = phaseCount >= 4 ? formData.get('phaseStatus4') || null : null;

    const phaseBracket1 = formData.get('phaseBracket1') || null;
    const phaseBracket2 = phaseCount >= 2 ? formData.get('phaseBracket2') || null : null;
    const phaseBracket3 = phaseCount >= 3 ? formData.get('phaseBracket3') || null : null;
    const phaseBracket4 = phaseCount >= 4 ? formData.get('phaseBracket4') || null : null;

    return {
      type,
      name,
      registration_fee: Number(registrationFee) || 0,
      prizepool: Number(prizepool) || 0,
      final_rank: finalRank || null,
      status: status || null,
      team_count: Number(teamCount) || 0,
      phase_count: phaseCount,
      phase_format1: phaseFormat1,
      phase_format2: phaseFormat2,
      phase_format3: phaseFormat3,
      phase_format4: phaseFormat4,
      phase_status1: phaseStatus1 || null,
      phase_status2: phaseStatus2,
      phase_status3: phaseStatus3,
      phase_status4: phaseStatus4,
      phase_bracket1: phaseBracket1 || null,
      phase_bracket2: phaseBracket2,
      phase_bracket3: phaseBracket3,
      phase_bracket4: phaseBracket4,
    };
  }

  function validateCompetitionData(payload) {
    if (!payload.type) {
      return { valid: false, message: 'Tipe kompetisi wajib dipilih' };
    }
    if (!payload.name) {
      return { valid: false, message: 'Nama kompetisi wajib diisi' };
    }
    if (!payload.team_count || payload.team_count <= 0) {
      return { valid: false, message: 'Jumlah tim harus lebih dari 0' };
    }
    if (payload.phase_count < 1 || payload.phase_count > 4) {
      return { valid: false, message: 'Jumlah fase harus antara 1 sampai 4' };
    }
    if (!payload.phase_format1) {
      return { valid: false, message: 'Format untuk Fase 1 wajib dipilih' };
    }
    return { valid: true, message: '' };
  }

  function handleSubmit(event) {
    event.preventDefault();

    const formElement = event.currentTarget;
    const payload = buildCompetitionPayload(formElement);
    const validation = validateCompetitionData(payload);

    if (!validation.valid) {
      showToast(validation.message, 'error');
      return;
    }

    const apiPayload = {
      action: 'add',
      ...payload,
    };

    const apiBase = window.EsportConfig ? window.EsportConfig.apiBase : 'db/';
    fetch(`${apiBase}competition_api.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiPayload),
    })
      .then(async (response) => {
        const json = await response.json().catch(() => null);
        if (!response.ok || !json || !json.ok) {
          const message = (json && json.message) || 'Gagal menyimpan kompetisi.';
          throw new Error(message);
        }
        return json.competition;
      })
      .then(() => {
        showToast('Kompetisi berhasil disimpan!', 'success');
        setTimeout(() => {
          window.location.href = 'competition.html';
        }, REDIRECT_DELAY_MS);
      })
      .catch((error) => {
        showToast(error.message || 'Terjadi kesalahan saat menyimpan kompetisi.', 'error');
      });
  }

  function getIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  }

  function populateForm(competition) {
    document.getElementById('competitionId').value = competition.id;
    document.getElementById('competitionName').value = competition.name || '';
    document.getElementById('competitionStatus').value = competition.status || '';
    document.getElementById('teamCount').value = competition.team_count || '';
    document.getElementById('phaseCount').value = competition.phase_count || 1;

    // Trigger ulang phase visibility
    updatePhaseBlockVisibility(parseInt(competition.phase_count) || 1);

    // Set radio format per fase
    for (let i = 1; i <= 4; i++) {
      const val = competition[`phase_format${i}`];
      if (val) {
        const radio = document.querySelector(`input[name="phaseFormat${i}"][value="${val}"]`);
        if (radio) {
          radio.checked = true;
          updatePhaseVisibilityForFormat(i, val);
        }
      }
    }
  }

  function initEditCompetitionPage() {
    const id = getIdFromUrl();
    if (!id) {
      window.location.href = 'competition.html';
      return;
    }

    const apiBase = window.EsportConfig ? window.EsportConfig.apiBase : 'db/';
    fetch(`${apiBase}competition_api.php?action=get&id=${id}`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json || !json.ok) throw new Error('Competition tidak ditemukan');
        return json.competition;
      })
      .then((competition) => populateForm(competition))
      .catch(() => window.location.href = 'competition.html');
  }

  document.addEventListener('DOMContentLoaded', () => {    
    initEditCompetitionPage();
  }); 
})();