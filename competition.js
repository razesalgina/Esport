// js/competition.js
(function () {
  function getElements() {
    return {
      tournamentBody: document.getElementById('tournamentBody'),
      leagueBody: document.getElementById('leagueBody'),
    };
  }

  function clearTableBody(bodyElement) {
    if (!bodyElement) return;
    while (bodyElement.firstChild) {
      bodyElement.removeChild(bodyElement.firstChild);
    }
  }

  function createCompetitionRow(competition, index) {
    const row = document.createElement('tr');

    const indexCell = document.createElement('td');
    indexCell.textContent = String(index + 1);

    const nameCell = document.createElement('td');
    nameCell.textContent = competition.name || '-';

    const teamCountCell = document.createElement('td');
    teamCountCell.textContent = String(competition.team_count || 0);

    const prizepoolCell = document.createElement('td');
    prizepoolCell.textContent = competition.prizepool
      ? `Rp ${Number(competition.prizepool).toLocaleString('id-ID')}`
      : '-';

    const rankCell = document.createElement('td');
    rankCell.textContent = competition.final_rank || '-';

    const statusCell = document.createElement('td');
    statusCell.textContent = competition.status || '-';

    const actionsCell = document.createElement('td');
    const editBtn = document.createElement('a');
    editBtn.href = `editcompetition.html?id=${competition.id}`;
    editBtn.className = 'btn btn-sm btn-secondary';
    editBtn.textContent = 'Edit';
    actionsCell.appendChild(editBtn);

    row.appendChild(indexCell);
    row.appendChild(nameCell);
    row.appendChild(teamCountCell);
    row.appendChild(prizepoolCell);
    row.appendChild(rankCell);
    row.appendChild(statusCell);
    row.appendChild(actionsCell);

    return row;
  }

  function renderCompetitionTables(competitions) {
    const { tournamentBody, leagueBody } = getElements();
    if (!tournamentBody || !leagueBody) return;

    // Kalau tidak ada data sama sekali, biarkan empty state default
    if (!competitions || competitions.length === 0) {
      return;
    }

    clearTableBody(tournamentBody);
    clearTableBody(leagueBody);

    const tournaments = competitions.filter((c) => c.type === 'tournament');
    const leagues = competitions.filter((c) => c.type === 'league');

    if (tournaments.length === 0) {
      // Biarkan empty state turnamen default (bisa di-render ulang kalau mau)
      tournamentBody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <svg viewBox="0 0 24 24">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                <path d="M4 22h16"/>
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
              </svg>
              <h3>Belum ada turnamen</h3>
              <p>Mulai dengan menambahkan turnamen pertama tim kamu</p>
              <a href="addcompetition.html" class="btn btn-primary btn-sm">
                <svg viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Tambah Turnamen Baru
              </a>
            </div>
          </td>
        </tr>
      `;
    } else {
      tournaments.forEach((competition, index) => {
        const row = createCompetitionRow(competition, index);
        tournamentBody.appendChild(row);
      });
    }

    if (leagues.length === 0) {
      leagueBody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <svg viewBox="0 0 24 24">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                <path d="M4 22h16"/>
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
              </svg>
              <h3>Belum ada liga</h3>
              <p>Mulai dengan menambahkan liga pertama tim kamu</p>
              <a href="addcompetition.html" class="btn btn-primary btn-sm">
                <svg viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Tambah Liga Baru
              </a>
            </div>
          </td>
        </tr>
      `;
    } else {
      leagues.forEach((competition, index) => {
        const row = createCompetitionRow(competition, index);
        leagueBody.appendChild(row);
      });
    }
  }

  function fetchCompetitions() {
    const apiBase = window.EsportConfig ? window.EsportConfig.apiBase : 'db/';
    return fetch(`${apiBase}competition_api.php?action=list`)
      .then(async (response) => {
        const json = await response.json().catch(() => null);
        if (!response.ok || !json || !json.ok) {
          const message = (json && json.message) || 'Gagal memuat data kompetisi.';
          throw new Error(message);
        }
        return json.competitions || [];
      })
      .catch((error) => {
        if (window.Esport && typeof window.Esport.showToast === 'function') {
          window.Esport.showToast(error.message || 'Gagal memuat kompetisi.', 'error');
        }
        return [];
      });
  }

  function initCompetitionPage() {
    fetchCompetitions().then((competitions) => {
      renderCompetitionTables(competitions);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initCompetitionPage();
  });
})();