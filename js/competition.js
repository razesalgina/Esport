// js/competition.js
(function () {
  let allCompetitions = [];

  function getElements() {
    return {
      tournamentBody:      document.getElementById('tournamentBody'),
      leagueBody:          document.getElementById('leagueBody'),
      tournamentTableWrap: document.querySelector('#tournamentSection .table-wrap'),
      leagueTableWrap:     document.querySelector('#leagueSection .table-wrap'),
    };
  }

  function clearTableBody(bodyElement) {
    if (!bodyElement) return;
    while (bodyElement.firstChild) bodyElement.removeChild(bodyElement.firstChild);
  }

  function showToast(message, type) {
    if (window.Esport && typeof window.Esport.showToast === 'function') {
      window.Esport.showToast(message, type);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // DELETE MODAL  (2 langkah)
  //   Step 1 → pilih mode : Hapus Semua | Hapus Saja | Batal
  //   Step 2 → konfirmasi  : Yakin | Batal
  // ─────────────────────────────────────────────────────────────────
  const DeleteModal = (function () {
    let _overlay = null;

    /* Pastikan overlay DOM sudah ada */
    function _ensureDOM() {
      if (_overlay) return;

      _overlay = document.createElement('div');
      _overlay.id = 'deleteModal';
      _overlay.style.cssText = [
        'display:none',
        'position:fixed',
        'inset:0',
        'z-index:9999',
        'background:rgba(15,23,42,.55)',
        'backdrop-filter:blur(3px)',
        'align-items:center',
        'justify-content:center',
      ].join(';');

      _overlay.innerHTML = `
        <div id="deleteModalBox" style="
          background:var(--color-surface,#fff);
          border:1px solid var(--color-border,#e2e8f0);
          border-radius:14px;
          box-shadow:0 20px 48px rgba(15,23,42,.18);
          padding:28px 28px 22px;
          width:min(440px,92vw);
          max-width:100%;
          font-family:inherit;
        ">
          <div id="deleteModalContent"></div>
        </div>`;

      /* Klik backdrop = tutup */
      _overlay.addEventListener('click', (e) => {
        if (e.target === _overlay) _close();
      });
      document.body.appendChild(_overlay);
    }

    function _close() {
      if (_overlay) {
        _overlay.style.display = 'none';
        document.getElementById('deleteModalContent').innerHTML = '';
      }
    }

    function _setContent(html) {
      _ensureDOM();
      document.getElementById('deleteModalContent').innerHTML = html;
      _overlay.style.display = 'flex';
    }

    /* ── Tombol reusable ──
     * FIX: b.type = 'button' agar tidak memicu form submit
     */
    function _btn(label, variant) {
      const colors = {
        danger:    'background:#dc2626;color:#fff;border:none',
        warning:   'background:#d97706;color:#fff;border:none',
        secondary: 'background:var(--color-surface-offset,#f1f5f9);color:var(--color-text,#1e293b);border:1px solid var(--color-border,#e2e8f0)',
      };
      const b = document.createElement('button');
      b.type = 'button'; // ← FIX: cegah submit form
      b.innerHTML = label;
      b.style.cssText = `
        display:inline-flex;align-items:center;gap:6px;
        padding:9px 18px;border-radius:9px;cursor:pointer;
        font-size:0.875rem;font-weight:600;line-height:1;
        transition:filter .15s;
        ${colors[variant] || colors.secondary}
      `;
      b.addEventListener('mouseenter', () => b.style.filter = 'brightness(.88)');
      b.addEventListener('mouseleave', () => b.style.filter = '');
      return b;
    }

    /**
     * showStep1 – tampilkan pilihan mode hapus
     * @param {string} label   – nama item yang akan dihapus
     * @param {Function} onMode  – callback(mode) → mode: 'cascade' | 'detach'
     */
    function showStep1(label, onMode) {
      _ensureDOM();
      const content = document.getElementById('deleteModalContent');
      content.innerHTML = '';

      /* Header */
      const title = document.createElement('p');
      title.style.cssText = 'margin:0 0 6px;font-size:1.05rem;font-weight:700;color:var(--color-text,#1e293b)';
      title.textContent = `Hapus "${label}"`;

      const sub = document.createElement('p');
      sub.style.cssText = 'margin:0 0 20px;font-size:.85rem;color:var(--color-text-muted,#64748b)';
      sub.textContent = 'Pilih cara penghapusan:';

      /* Option cards */
      const cards = document.createElement('div');
      cards.style.cssText = 'display:flex;flex-direction:column;gap:10px;margin-bottom:20px';

      const makeCard = (icon, heading, desc, mode) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.style.cssText = `
          display:flex;align-items:flex-start;gap:12px;
          padding:13px 14px;border-radius:10px;cursor:pointer;
          border:1.5px solid var(--color-border,#e2e8f0);
          background:var(--color-surface,#fff);
          text-align:left;transition:border-color .15s,background .15s;
        `;
        card.innerHTML = `
          <span style="font-size:1.4rem;line-height:1">${icon}</span>
          <span>
            <strong style="display:block;font-size:.875rem;color:var(--color-text,#1e293b);margin-bottom:2px">${heading}</strong>
            <span style="font-size:.78rem;color:var(--color-text-muted,#64748b);line-height:1.4">${desc}</span>
          </span>`;
        card.addEventListener('mouseenter', () => {
          card.style.borderColor = 'var(--color-primary,#2563eb)';
          card.style.background  = 'var(--color-primary-highlight,#eff6ff)';
        });
        card.addEventListener('mouseleave', () => {
          card.style.borderColor = 'var(--color-border,#e2e8f0)';
          card.style.background  = 'var(--color-surface,#fff)';
        });
        card.addEventListener('click', () => {
          _close();
          onMode(mode);
        });
        return card;
      };

      cards.appendChild(makeCard(
        '\uD83D\uDDD1\uFE0F',
        'Hapus beserta semua data di dalamnya',
        'Semua Match dan Game yang terkait akan ikut dihapus secara permanen.',
        'cascade'
      ));
      cards.appendChild(makeCard(
        '\uD83D\uDCC2',
        'Hapus kompetisi ini saja',
        'Data Match & Game tetap tersimpan dan masih bisa diakses untuk diedit.',
        'detach'
      ));

      /* Cancel */
      const footer = document.createElement('div');
      footer.style.cssText = 'display:flex;justify-content:flex-end';
      const cancelBtn = _btn('Batal', 'secondary');
      cancelBtn.addEventListener('click', _close);
      footer.appendChild(cancelBtn);

      content.appendChild(title);
      content.appendChild(sub);
      content.appendChild(cards);
      content.appendChild(footer);

      _overlay.style.display = 'flex';
    }

    /**
     * showStep2 – konfirmasi akhir
     * @param {string}   label   – nama item
     * @param {string}   mode    – 'cascade' | 'detach'
     * @param {Function} onConfirm – callback jika yakin
     */
    function showStep2(label, mode, onConfirm) {
      _ensureDOM();
      const content = document.getElementById('deleteModalContent');
      content.innerHTML = '';

      const isCascade = mode === 'cascade';

      const icon = document.createElement('div');
      icon.style.cssText = 'font-size:2.5rem;text-align:center;margin-bottom:12px';
      icon.textContent = isCascade ? '\u26A0\uFE0F' : '\uD83D\uDCC2';

      const title = document.createElement('p');
      title.style.cssText = 'margin:0 0 8px;font-size:1rem;font-weight:700;color:var(--color-text,#1e293b);text-align:center';
      title.textContent = isCascade ? 'Konfirmasi Hapus Semua' : 'Konfirmasi Hapus Kompetisi';

      const msg = document.createElement('p');
      msg.style.cssText = 'margin:0 0 22px;font-size:.85rem;color:var(--color-text-muted,#64748b);text-align:center;line-height:1.55';
      msg.innerHTML = isCascade
        ? `Yakin ingin menghapus <strong>"${label}"</strong> beserta <strong>semua Match dan Game</strong> di dalamnya?<br><span style="color:#dc2626">Tindakan ini tidak bisa dibatalkan.</span>`
        : `Yakin ingin menghapus kompetisi <strong>"${label}"</strong>?<br>Data Match &amp; Game akan tetap tersimpan.`;

      const footer = document.createElement('div');
      footer.style.cssText = 'display:flex;justify-content:flex-end;gap:10px';

      const backBtn = _btn('\u2190 Kembali', 'secondary');
      backBtn.addEventListener('click', () => showStep1(label, (m) => showStep2(label, m, onConfirm)));

      const confirmBtn = _btn(
        isCascade ? '\uD83D\uDDD1\uFE0F Ya, Hapus Semua' : '\uD83D\uDCC2 Ya, Hapus Saja',
        isCascade ? 'danger' : 'warning'
      );
      confirmBtn.addEventListener('click', () => { _close(); onConfirm(mode); });

      footer.appendChild(backBtn);
      footer.appendChild(confirmBtn);

      content.appendChild(icon);
      content.appendChild(title);
      content.appendChild(msg);
      content.appendChild(footer);

      _overlay.style.display = 'flex';
    }

    return { showStep1, showStep2, close: _close };
  })();

  // ─────────────────────────────────────────────────────────────────
  // handleDeleteCompetition  – entry point dari tombol Hapus
  // ─────────────────────────────────────────────────────────────────
  function handleDeleteCompetition(id, name) {
    DeleteModal.showStep1(name, function (mode) {
      DeleteModal.showStep2(name, mode, function (confirmedMode) {
        const apiBase = window.EsportConfig ? window.EsportConfig.apiBase : 'db/';
        fetch(`${apiBase}competition_delete.php`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ id, mode: confirmedMode }),
        })
          .then(async (res) => {
            const json = await res.json().catch(() => null);
            if (!json || !json.ok) throw new Error((json && json.message) || 'Gagal menghapus.');
            showToast(
              confirmedMode === 'cascade'
                ? `Kompetisi "${name}" beserta semua datanya berhasil dihapus.`
                : `Kompetisi "${name}" dihapus. Data Match & Game tetap tersimpan.`,
              'success'
            );
            initCompetitionPage();
          })
          .catch((err) => showToast(err.message || 'Gagal menghapus kompetisi.', 'error'));
      });
    });
  }

  // ── Row builder ───────────────────────────────
  function createCompetitionRow(competition, index) {
    const row = document.createElement('tr');

    const indexCell = document.createElement('td');
    indexCell.textContent = String(index + 1);

    const nameCell = document.createElement('td');
    const nameLink = document.createElement('a');
    nameLink.href        = `match.html?competition_id=${competition.id}`;
    nameLink.textContent = competition.name || '-';
    nameLink.className   = 'link-primary';
    nameCell.appendChild(nameLink);

    const teamCountCell = document.createElement('td');
    teamCountCell.textContent = String(competition.team_count || 0);

    const prizepoolCell = document.createElement('td');
    const prizeStrong   = document.createElement('strong');
    prizeStrong.textContent = competition.prizepool
      ? `Rp ${Number(competition.prizepool).toLocaleString('id-ID')}`
      : '-';
    prizepoolCell.appendChild(prizeStrong);

    const rankCell = document.createElement('td');
    rankCell.textContent = competition.final_rank || '-';

    const statusCell = document.createElement('td');
    const badge      = document.createElement('span');
    const rawStatus  = (competition.status || '').toLowerCase();
    const statusCss  = { '': 'badge badge-neutral', upcoming: 'badge badge-yellow', cancel: 'badge badge-red', finished: 'badge badge-green' };
    const statusLbl  = { '': 'Unknown', upcoming: 'Upcoming', cancel: 'Cancel', finished: 'Finished' };
    badge.className  = statusCss[rawStatus] || 'badge badge-neutral';
    badge.textContent = statusLbl[rawStatus] || 'Unknown';
    statusCell.appendChild(badge);

    const actionsCell = document.createElement('td');
    actionsCell.className = 'actions-cell';

    const editBtn = document.createElement('a');
    editBtn.href        = `editcompetition.html?id=${competition.id}`;
    editBtn.className   = 'btn btn-sm btn-secondary';
    editBtn.textContent = 'Edit';

    const deleteBtn = document.createElement('button');
    deleteBtn.type        = 'button';
    deleteBtn.className   = 'btn btn-sm btn-danger';
    deleteBtn.textContent = 'Hapus';
    deleteBtn.addEventListener('click', () => handleDeleteCompetition(competition.id, competition.name));

    actionsCell.appendChild(editBtn);
    actionsCell.appendChild(deleteBtn);

    row.appendChild(indexCell);
    row.appendChild(nameCell);
    row.appendChild(teamCountCell);
    row.appendChild(prizepoolCell);
    row.appendChild(rankCell);
    row.appendChild(statusCell);
    row.appendChild(actionsCell);

    return row;
  }

  // ── Search & Filter ────────────────────────────
  function getFiltersFromControls(prefix) {
    const val = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
    return {
      searchText: val(`${prefix}Search`).trim().toLowerCase(),
      status:     val(`${prefix}FilterStatus`),
      rank:       val(`${prefix}FilterRank`),
      prize:      val(`${prefix}FilterPrize`),
    };
  }

  function applyFilters(data, prefix) {
    const { searchText, status, rank, prize } = getFiltersFromControls(prefix);
    return data.filter((c) => {
      if (searchText && !(c.name || '').toLowerCase().includes(searchText)) return false;
      if (status     && (c.status || '').toLowerCase() !== status.toLowerCase())   return false;
      if (rank       && (c.final_rank || '').toLowerCase() !== rank.toLowerCase()) return false;
      if (prize) {
        const p = Number(c.prizepool || 0);
        if (prize === 'lt10'   && !(p >= 0 && p < 10_000_000))          return false;
        if (prize === '10to50' && !(p >= 10_000_000 && p <= 50_000_000)) return false;
        if (prize === 'gt50'   && !(p > 50_000_000))                     return false;
      }
      return true;
    });
  }

  function renderFilteredTables() {
    const { tournamentBody, leagueBody } = getElements();
    if (!tournamentBody || !leagueBody) return;

    clearTableBody(tournamentBody);
    clearTableBody(leagueBody);

    const tournamentsAll = allCompetitions.filter((c) => c.type === 'tournament');
    const leaguesAll     = allCompetitions.filter((c) => c.type === 'league');

    const tournaments = applyFilters(tournamentsAll, 'tournament');
    const leagues     = applyFilters(leaguesAll, 'league');

    const emptyHtml = (type, label, addLabel) => `
      <tr><td colspan="7">
        <div class="empty-state">
          <svg viewBox="0 0 24 24">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
            <path d="M4 22h16"/>
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
          </svg>
          <h3>${label}</h3>
          <p>Mulai dengan menambahkan ${type} pertama tim kamu</p>
          <a href="addcompetition.html" class="btn btn-primary btn-sm">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            ${addLabel}
          </a>
        </div>
      </td></tr>`;

    if (tournaments.length === 0) {
      tournamentBody.innerHTML = emptyHtml('turnamen', 'Belum ada turnamen', 'Tambah Turnamen Baru');
    } else {
      tournaments.forEach((c, i) => tournamentBody.appendChild(createCompetitionRow(c, i)));
    }

    if (leagues.length === 0) {
      leagueBody.innerHTML = emptyHtml('liga', 'Belum ada liga', 'Tambah Liga Baru');
    } else {
      leagues.forEach((c, i) => leagueBody.appendChild(createCompetitionRow(c, i)));
    }
  }

  // ── Toolbar ────────────────────────────────────
  function createTableToolbar({ prefix, title, container }) {
    if (!container) return null;

    const toolbar = document.createElement('div');
    toolbar.className = 'table-toolbar';

    const left  = document.createElement('div'); left.className  = 'table-toolbar-left';
    const right = document.createElement('div'); right.className = 'table-toolbar-right';

    const searchInput = document.createElement('input');
    searchInput.type        = 'text';
    searchInput.id          = `${prefix}Search`;
    searchInput.className   = 'form-input form-input-sm table-search-input';
    searchInput.placeholder = `Cari ${title}`;
    searchInput.addEventListener('input', renderFilteredTables);
    left.appendChild(searchInput);

    const makeSelect = (id, placeholder, options) => {
      const sel = document.createElement('select');
      sel.id        = id;
      sel.className = 'form-select form-select-sm table-filter-select';
      sel.innerHTML = `<option value="">${placeholder}</option>` +
        options.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
      sel.addEventListener('change', renderFilteredTables);
      return sel;
    };

    right.appendChild(makeSelect(`${prefix}FilterStatus`, 'Status: Semua', [
      ['upcoming','Upcoming'], ['cancel','Cancel'], ['finished','Finished'],
    ]));
    right.appendChild(makeSelect(`${prefix}FilterRank`, 'Rank: Semua', [
      ['1st','1st'], ['2nd','2nd'], ['3rd','3rd'], ['4th','4th'],
      ['8th','8th'], ['16th','16th'], ['failed','Failed'],
    ]));
    right.appendChild(makeSelect(`${prefix}FilterPrize`, 'Prizepool: Semua', [
      ['lt10','< 10 Juta'], ['10to50','10\u201350 Juta'], ['gt50','> 50 Juta'],
    ]));

    toolbar.appendChild(left);
    toolbar.appendChild(right);
    container.parentElement.insertBefore(toolbar, container);
    return toolbar;
  }

  function setupToolbars() {
    const { tournamentTableWrap, leagueTableWrap } = getElements();
    createTableToolbar({ prefix: 'tournament', title: 'turnamen', container: tournamentTableWrap });
    createTableToolbar({ prefix: 'league',     title: 'liga',     container: leagueTableWrap });
  }

  // ── Fetch & init ────────────────────────────────
  function fetchCompetitions() {
    const apiBase = window.EsportConfig ? window.EsportConfig.apiBase : 'db/';
    return fetch(`${apiBase}competition_api.php?action=list`)
      .then(async (response) => {
        const json = await response.json().catch(() => null);
        if (!response.ok || !json || !json.ok) throw new Error((json && json.message) || 'Gagal memuat data kompetisi.');
        return json.competitions || [];
      })
      .catch((err) => { showToast(err.message || 'Gagal memuat kompetisi.', 'error'); return []; });
  }

  function initCompetitionPage() {
    fetchCompetitions().then((competitions) => {
      allCompetitions = competitions;
      renderFilteredTables();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupToolbars();
    initCompetitionPage();
  });
})();
