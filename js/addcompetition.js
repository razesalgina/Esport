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

const MAX_PHASES = 4;

function createPhaseHtml(index) {
  return `
    <div class="form-group ${index > 1 ? 'hidden' : ''}" id="phase${index}Group">
      <label class="form-label">Fase ${index}</label>

      <!-- Format Fase ${index} -->
      <div class="form-group">
        <label class="form-label">Format Fase ${index}</label>
        <div class="radio-group">
          <label class="radio-item">
            <input type="radio" name="phaseFormat${index}" value="single_elimination"/>
            <span>Single Elimination</span>
          </label>
          <label class="radio-item">
            <input type="radio" name="phaseFormat${index}" value="double_elimination"/>
            <span>Double Elimination</span>
          </label>
          <label class="radio-item">
            <input type="radio" name="phaseFormat${index}" value="group_stage"/>
            <span>Group Stage</span>
          </label>
          <label class="radio-item">
            <input type="radio" name="phaseFormat${index}" value="swiss_stage"/>
            <span>Swiss Stage</span>
          </label>
        </div>
      </div>

      <!-- Jumlah Tim per Fase & Tanggal Mulai -->
      <div class="form-grid-2">
        <div class="form-group">
          <label class="form-label" for="phase${index}TeamCount">Jumlah Tim per Fase</label>
          <input
            class="form-input"
            type="number"
            id="phase${index}TeamCount"
            name="phase${index}TeamCount"
            min="2"
            placeholder="Contoh: 8"
          />
        </div>
        <div class="form-group">
          <label class="form-label" for="phase${index}StartDate">Tanggal Mulai</label>
          <input
            class="form-input"
            type="date"
            id="phase${index}StartDate"
            name="phase${index}StartDate"
          />
        </div>
      </div>

      <!-- Hidden sub-form Fase ${index} (akan di-show/hide via JS) -->
      <div class="form-grid-3">
        <div class="form-group hidden" id="phase${index}PositionGroup">
          <label class="form-label" for="phase${index}Position">Posisi Bracket</label>
          <select class="form-select" id="phase${index}Position" name="phase${index}Position">
            <option value="">Pilih posisi</option>
            <option value="upper">Upper</option>
            <option value="lower">Lower</option>
          </select>
        </div>

        <div class="form-grid-2 hidden" id="phase${index}GroupTeamCountGroup">
          <div class="form-group">
            <label class="form-label" for="phase${index}GroupCount">Jumlah Group</label>
            <input
              class="form-input"
              type="number"
              id="phase${index}GroupCount"
              name="phase${index}GroupCount"
              min="0"
              placeholder="Contoh: 4"
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="phase${index}GroupTeamCount">Jumlah Tim per Group</label>
            <input
              class="form-input"
              type="number"
              id="phase${index}GroupTeamCount"
              name="phase${index}GroupTeamCount"
              min="2"
              placeholder="Contoh: 4"
            />
          </div>
        </div>

        <div class="form-group hidden" id="phase${index}SwissRoundGroup">
          <label class="form-label" for="phase${index}SwissRound">Jumlah Round Swiss</label>
          <input
            class="form-input"
            type="number"
            id="phase${index}SwissRound"
            name="phase${index}SwissRound"
            min="1"
            placeholder="Contoh: 5"
          />
        </div>
      </div>

      <!-- Status & Link bracket Fase ${index} -->
      <div class="form-grid-2">
        <div class="form-group">
          <label class="form-label" for="phaseStatus${index}">Status Fase ${index}</label>
          <select class="form-select" id="phaseStatus${index}" name="phaseStatus${index}">
            <option value="">Upcoming</option>
            <option value="lose">Lose</option>
            <option value="pass">Pass</option>
            <option value="win">Win</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="phaseBracket${index}">Link Bracket Fase ${index}</label>
          <input
            class="form-input"
            type="url"
            id="phaseBracket${index}"
            name="phaseBracket${index}"
            placeholder="https://..."
          />
        </div>
      </div>
    </div>
  `;
}

function renderPhaseBlocks() {
  const container = document.getElementById('phaseContainer');
  if (!container) return;

  let html = '';
  for (let i = 1; i <= MAX_PHASES; i += 1) {
    html += createPhaseHtml(i);
  }
  container.innerHTML = html;
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

    const idRaw = formData.get('id') || formData.get('competitionId') || '';
    const id = parseInt(idRaw, 10) || 0;

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

    // Field baru per fase: start_date, team_count, group_count, group_team_count
    function getPhaseDate(index) {
      const value = formData.get(`phase${index}StartDate`);
      return value && value.trim() !== '' ? value : null;
    }

    function getPhaseInt(name) {
      const raw = formData.get(name);
      if (raw === null || raw === '') return null;
      const n = parseInt(raw, 10);
      return Number.isNaN(n) ? null : n;
    }

    const phase_start_date1 = getPhaseDate(1);
    const phase_start_date2 = phaseCount >= 2 ? getPhaseDate(2) : null;
    const phase_start_date3 = phaseCount >= 3 ? getPhaseDate(3) : null;
    const phase_start_date4 = phaseCount >= 4 ? getPhaseDate(4) : null;

    const phase_team_count1 = getPhaseInt('phase1TeamCount');
    const phase_team_count2 = phaseCount >= 2 ? getPhaseInt('phase2TeamCount') : null;
    const phase_team_count3 = phaseCount >= 3 ? getPhaseInt('phase3TeamCount') : null;
    const phase_team_count4 = phaseCount >= 4 ? getPhaseInt('phase4TeamCount') : null;

    const phase_group_count1 = getPhaseInt('phase1GroupCount');
    const phase_group_count2 = phaseCount >= 2 ? getPhaseInt('phase2GroupCount') : null;
    const phase_group_count3 = phaseCount >= 3 ? getPhaseInt('phase3GroupCount') : null;
    const phase_group_count4 = phaseCount >= 4 ? getPhaseInt('phase4GroupCount') : null;

    const phase_group_team_count1 = getPhaseInt('phase1GroupTeamCount');
    const phase_group_team_count2 =
      phaseCount >= 2 ? getPhaseInt('phase2GroupTeamCount') : null;
    const phase_group_team_count3 =
      phaseCount >= 3 ? getPhaseInt('phase3GroupTeamCount') : null;
    const phase_group_team_count4 =
      phaseCount >= 4 ? getPhaseInt('phase4GroupTeamCount') : null;

    return {
      id,  // ← penting untuk update

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

      phase_start_date1,
      phase_start_date2,
      phase_start_date3,
      phase_start_date4,
      phase_team_count1,
      phase_team_count2,
      phase_team_count3,
      phase_team_count4,
      phase_group_count1,
      phase_group_count2,
      phase_group_count3,
      phase_group_count4,
      phase_group_team_count1,
      phase_group_team_count2,
      phase_group_team_count3,
      phase_group_team_count4,
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

function initAddCompetitionPage() {
  const formElement = getFormElement();
  if (!formElement) return;

  renderPhaseBlocks();
  attachPhaseCountListener();
  attachAllFormatListeners();
  formElement.addEventListener('submit', handleSubmit);
}

  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded addcompetition.js'); // DEBUG
    initAddCompetitionPage();
  }); 
})();