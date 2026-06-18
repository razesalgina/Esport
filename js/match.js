// js/match.js
(function () {

  // ── State ──────────────────────────────────
  let allMatches      = [];
  let competitionId   = 0;   // set jika drill-down dari competition
  let competitionName = ''; // untuk label header

  // ── Helpers ─────────────────────────────
  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function showToast(message, type) {
    if (window.Esport && typeof window.Esport.showToast === 'function') {
      window.Esport.showToast(message, type);
    }
  }

  // ── Badge helpers ────────────────────────
  function getResult(our, opp, resultFromDb) {
    let r = (resultFromDb || '').toLowerCase();
    if (!r) {
      const a = parseInt(our, 10) || 0;
      const b = parseInt(opp, 10) || 0;
      if (a > b)      r = 'win';
      else if (a < b) r = 'lose';
      else            r = 'draw';
    }
    return r;
  }

  function resultBadgeHtml(our, opp, resultFromDb) {
    const r = getResult(our, opp, resultFromDb);
    const cssMap = { win: 'badge badge-green', lose: 'badge badge-red', draw: 'badge badge-yellow' };
    const label  = r.charAt(0).toUpperCase() + r.slice(1);
    return `<span class="${cssMap[r] || 'badge badge-neutral'}">${label}</span>`;
  }

  function statusBadgeHtml(status) {
    const s = (status || '').toLowerCase();
    const cssMap   = { upcoming: 'badge badge-yellow', finished: 'badge badge-green', cancel: 'badge badge-red' };
    const labelMap = { upcoming: 'Upcoming', finished: 'Finished', cancel: 'Cancel' };
    return `<span class="${cssMap[s] || 'badge badge-neutral'}">${labelMap[s] || s || '-'}</span>`;
  }

  function formatTypeLabel(type) {
    const map = { tournament: 'Tournament', league: 'League', scrim: 'Scrim', ranked: 'Ranked' };
    return map[(type || '').toLowerCase()] || type || '-';
  }

  // ── Delete ───────────────────────────────
  function handleDeleteMatch(id, opponentName) {
    const label = opponentName ? `match vs "${opponentName}"` : `match #${id}`;
    if (!confirm(`Hapus ${label}? Tindakan ini tidak bisa dibatalkan.`)) return;

    const apiBase = window.EsportConfig ? window.EsportConfig.apiBase : 'db/';
    fetch(`${apiBase}match_api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json || !json.ok) throw new Error((json && json.message) || 'Gagal menghapus.');
        showToast(`${label.charAt(0).toUpperCase() + label.slice(1)} berhasil dihapus.`, 'success');
        loadMatches();
      })
      .catch((err) => showToast(err.message || 'Gagal menghapus match.', 'error'));
  }

  // ── Filter ───────────────────────────────
  function getFilters() {
    const val = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
    return {
      searchText: val('matchSearch').trim().toLowerCase(),
      kategori:   val('matchFilterKategori'),
      format:     val('matchFilterFormat'),
      status:     val('matchFilterStatus'),
      result:     val('matchFilterResult'),
    };
  }

  function applyFilters(data) {
    const { searchText, kategori, format, status, result } = getFilters();
    return data.filter((m) => {
      if (searchText && !(m.opponent_name || '').toLowerCase().includes(searchText)) return false;
      if (kategori   && (m.type   || '').toLowerCase()  !== kategori.toLowerCase()) return false;
      if (format     && (m.format || '').toUpperCase()  !== format.toUpperCase())    return false;
      if (status     && (m.status || '').toLowerCase()  !== status.toLowerCase())    return false;
      if (result) {
        const r = getResult(m.our_score, m.opponent_score, m.result);
        if (r !== result.toLowerCase()) return false;
      }
      return true;
    });
  }

  // ── Render ───────────────────────────────
  function renderEmptyState(tbody, isFiltered) {
    const addLink = competitionId
      ? `addmatch.html?competition_id=${competitionId}`
      : 'addmatch.html';
    tbody.innerHTML = `
      <tr><td colspan="8">
        <div class="empty-state">
          <svg viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <h3>${isFiltered ? 'Tidak ada hasil' : 'Belum ada match'}</h3>
          <p>${isFiltered ? 'Tidak ada match yang sesuai filter.' : 'Tambahkan match pertama untuk mulai melacak performa tim'}</p>
          ${!isFiltered ? `
          <a href="${addLink}" class="btn btn-primary btn-sm">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tambah Match
          </a>` : ''}
        </div>
      </td></tr>`;
  }

  function renderFilteredTable() {
    const tbody = document.getElementById('matchBody');
    if (!tbody) return;

    const source   = competitionId
      ? allMatches.filter((m) => m.competition_id == competitionId)
      : allMatches;
    const filtered   = applyFilters(source);
    const isFiltered = source.length > 0 && filtered.length === 0;

    if (filtered.length === 0) { renderEmptyState(tbody, isFiltered); return; }

    tbody.innerHTML = filtered.map((m, i) => {
      const our = m.our_score != null ? m.our_score : 0;
      const opp = m.opponent_score != null ? m.opponent_score : 0;
      const safeOpponent = (m.opponent_name || '').replace(/"/g, '&quot;');

      return `
        <tr>
          <td>${i + 1}</td>
          <td>
            <a href="game.html?match_id=${m.id}" class="link-primary">${m.opponent_name || '-'}</a>
          </td>
          <td>${formatTypeLabel(m.type)}</td>
          <td>${our}:${opp}&nbsp;${resultBadgeHtml(our, opp, m.result)}</td>
          <td>${m.format || '-'}</td>
          <td>${statusBadgeHtml(m.status)}</td>
          <td>
            <a href="editmatch.html?id=${m.id}" class="btn btn-sm btn-secondary">Edit</a>
            <button class="btn btn-sm btn-danger" data-id="${m.id}" data-name="${safeOpponent}">Hapus</button>
          </td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('button[data-id]').forEach((btn) => {
      btn.addEventListener('click', () => handleDeleteMatch(Number(btn.dataset.id), btn.dataset.name));
    });
  }

  // ── Toolbar ──────────────────────────────
  function makeSelect(id, placeholder, options) {
    const sel = document.createElement('select');
    sel.id = id;
    sel.className = 'form-select form-select-sm table-filter-select';
    sel.innerHTML = `<option value="">${placeholder}</option>` +
      options.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
    sel.addEventListener('change', renderFilteredTable);
    return sel;
  }

  function setupToolbar() {
    const tableWrap = document.getElementById('matchTableWrap');
    if (!tableWrap || document.getElementById('matchSearch')) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'table-toolbar';

    const left  = document.createElement('div'); left.className  = 'table-toolbar-left';
    const right = document.createElement('div'); right.className = 'table-toolbar-right';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'matchSearch';
    searchInput.className = 'form-input form-input-sm table-search-input';
    searchInput.placeholder = 'Cari nama lawan…';
    searchInput.addEventListener('input', renderFilteredTable);
    left.appendChild(searchInput);

    right.appendChild(makeSelect('matchFilterKategori', 'Kategori: Semua', [
      ['tournament','Tournament'], ['league','League'], ['scrim','Scrim'], ['ranked','Ranked'],
    ]));
    right.appendChild(makeSelect('matchFilterFormat', 'Format: Semua', [
      ['BO1','BO1'], ['BO2','BO2'], ['BO3','BO3'],
      ['BO4','BO4'], ['BO5','BO5'], ['BO7','BO7'],
    ]));
    right.appendChild(makeSelect('matchFilterStatus', 'Status: Semua', [
      ['upcoming','Upcoming'], ['finished','Finished'], ['cancel','Cancel'],
    ]));
    right.appendChild(makeSelect('matchFilterResult', 'Result: Semua', [
      ['win','Win'], ['draw','Draw'], ['lose','Lose'],
    ]));

    toolbar.appendChild(left);
    toolbar.appendChild(right);
    tableWrap.parentElement.insertBefore(toolbar, tableWrap);
  }

  // ── Competition context (drill-down dari competition page) ──
  //
  // Mirip pola game.js:
  //   - backBtn     → competition.html (selalu, karena match hanya datang dari competition)
  //   - addMatchBtn → addmatch.html?competition_id=X
  //   - Breadcrumb & judul halaman diupdate dinamis
  function setupCompetitionContext() {
    // ── Back button ──
    // Jika ada competition_id → kembali ke competition.html
    // Jika tidak ada           → backBtn disembunyikan (halaman stand-alone)
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
      if (competitionId) {
        backBtn.href = 'competition.html';
      } else {
        // Stand-alone: sembunyikan tombol Kembali
        backBtn.style.display = 'none';
      }
    }

    // ── Tambah Match button ──
    const addMatchBtn = document.getElementById('addMatchBtn');
    if (addMatchBtn && competitionId) {
      addMatchBtn.href = `addmatch.html?competition_id=${competitionId}`;
    }

    // Hentikan di sini jika tidak ada competition context
    if (!competitionId) return;

    // ── Breadcrumb: Esport / Competition / Match ──
    const breadcrumbWrap = document.querySelector('.topbar-breadcrumb');
    if (breadcrumbWrap) {
      const current = breadcrumbWrap.querySelector('.current');
      if (current && !breadcrumbWrap.querySelector('a[href="competition.html"]')) {
        const sepComp  = document.createElement('span'); sepComp.className = 'sep'; sepComp.textContent = '/';
        const linkComp = document.createElement('a');
        linkComp.href = 'competition.html';
        linkComp.textContent = 'Competition';
        const sepMatch = document.createElement('span'); sepMatch.className = 'sep'; sepMatch.textContent = '/';

        current.parentElement.insertBefore(sepComp,  current);
        current.parentElement.insertBefore(linkComp, sepComp);
        current.parentElement.insertBefore(sepMatch,  current);
        current.textContent = 'Match';
      }
    }

    // ── Page title & sub ──
    const pageTitle = document.querySelector('.page-title');
    const pageSub   = document.querySelector('.page-sub');
    if (pageTitle) pageTitle.textContent = competitionName
      ? `Match — ${competitionName}`
      : 'Match Turnamen';
    if (pageSub) pageSub.textContent = competitionName
      ? `Daftar match untuk ${competitionName}`
      : 'Daftar match untuk turnamen ini';

    // ── Section title ──
    const sectionTitle = document.querySelector('#matchSection .section-title');
    if (sectionTitle) sectionTitle.textContent = competitionName
      ? `Match: ${competitionName}`
      : 'Match Turnamen Ini';
  }

  // ── Fetch competition name ─────────────────────
  async function fetchCompetitionName(cid) {
    const apiBase = window.EsportConfig ? window.EsportConfig.apiBase : 'db/';
    try {
      const res  = await fetch(`${apiBase}competition_api.php?action=get&id=${cid}`);
      const json = await res.json().catch(() => null);
      if (json && json.ok && json.competition) return json.competition.name || '';
    } catch (_) { /* silent */ }
    return '';
  }

  // ── Fetch & init ────────────────────────────
  function loadMatches() {
    const apiBase = window.EsportConfig ? window.EsportConfig.apiBase : 'db/';
    const url = competitionId
      ? `${apiBase}match_api.php?action=list&competition_id=${competitionId}`
      : `${apiBase}match_api.php?action=list`;

    fetch(url)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json || !json.ok) throw new Error('Gagal mengambil data match');
        return json.matches || [];
      })
      .then((matches) => {
        allMatches = matches;
        renderFilteredTable();
      })
      .catch((err) => showToast(err.message || 'Gagal memuat match.', 'error'));
  }

  document.addEventListener('DOMContentLoaded', async () => {
    competitionId = parseInt(getParam('competition_id') || '0', 10);

    if (competitionId > 0) {
      competitionName = await fetchCompetitionName(competitionId);
    }

    setupToolbar();
    setupCompetitionContext();
    loadMatches();
  });

})();
