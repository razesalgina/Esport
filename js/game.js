// js/game.js
(function () {

  let matchId   = 0;
  let matchData = null;

  // Cache detail yang sudah di-fetch: { [gameId]: players[] }
  const detailCache = {};

  const apiBase = () => window.EsportConfig ? window.EsportConfig.apiBase : 'db/';

  function showToast(msg, type) {
    if (window.Esport && typeof window.Esport.showToast === 'function') {
      window.Esport.showToast(msg, type);
    }
  }

  function getMatchIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return parseInt(params.get('match_id') || params.get('id') || '0', 10);
  }

  function maxGamesFromFormat(fmt) {
    if (!fmt) return Infinity;
    const n = parseInt(fmt.replace(/[^0-9]/g, ''), 10);
    return isNaN(n) ? Infinity : n;
  }

  // ── Badge helpers ────────────────────────────
  function resultBadgeHtml(result) {
    const r = (result || '').toLowerCase();
    const map = { win: 'badge badge-green', lose: 'badge badge-red', draw: 'badge badge-yellow' };
    const label = r.charAt(0).toUpperCase() + r.slice(1);
    return `<span class="${map[r] || 'badge badge-neutral'}">${label || '-'}</span>`;
  }

  function scoreBadgeHtml(kills, deaths) {
    return [
      `<span class="badge badge-blue">${kills}</span>`,
      `<span class="badge badge-neutral">:</span>`,
      `<span class="badge badge-red">${deaths}</span>`,
    ].join(' ');
  }

  function kdaClass(kda) {
    if (kda >= 3) return 'kda-high';
    if (kda >= 2) return 'kda-mid';
    return 'kda-low';
  }

  // ── Detail table HTML ────────────────────────
  function buildDetailHtml(gameNum, players) {
    if (!players || players.length === 0) {
      return `<div class="detail-empty">Tidak ada data pemain untuk Game ${gameNum}.</div>`;
    }

    const rows = players.map((p) => {
      const k   = Number(p.kills   ?? 0);
      const d   = Number(p.deaths  ?? 0);
      const a   = Number(p.assists ?? 0);
      const kda = parseFloat(p.kda ?? ((k + a) / Math.max(d, 1)).toFixed(2));
      const gold = Number(p.total_gold ?? 0).toLocaleString('id-ID');
      return `
        <tr>
          <td><strong>${p.player_name || '-'}</strong></td>
          <td><em style="color:var(--color-text-muted);font-style:normal;font-size:10px">${p.role_name || '-'}</em></td>
          <td>${p.hero_name || '-'}</td>
          <td class="${kdaClass(kda)}">${kda}</td>
          <td>${k}</td>
          <td>${d}</td>
          <td>${a}</td>
          <td>${gold}</td>
        </tr>`;
    }).join('');

    return `
      <div class="detail-label">Detail Statistik — Game ${gameNum}</div>
      <table class="table-detail">
        <thead>
          <tr>
            <th>Nama Player</th>
            <th>Role</th>
            <th>Hero</th>
            <th>KDA</th>
            <th>Kills</th>
            <th>Deaths</th>
            <th>Assists</th>
            <th>Total Gold</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  // ── Toggle detail row ─────────────────────────
  async function toggleDetail(btn, gameId, gameNum, colSpan) {
    const existingRow = document.getElementById(`detail-row-${gameId}`);

    if (existingRow) {
      existingRow.remove();
      btn.textContent = 'Detail';
      btn.classList.remove('is-open');
      return;
    }

    btn.textContent = '...';
    btn.disabled = true;

    try {
      if (!detailCache[gameId]) {
        const res  = await fetch(`${apiBase()}game_api.php?action=get&id=${gameId}`);
        const json = await res.json().catch(() => null);
        detailCache[gameId] = (json && json.ok && json.game) ? (json.game.players || []) : [];
      }

      const players = detailCache[gameId];

      const gameRow   = btn.closest('tr');
      const detailRow = document.createElement('tr');
      detailRow.className = 'detail-row';
      detailRow.id = `detail-row-${gameId}`;
      detailRow.innerHTML = `<td colspan="${colSpan}">
        <div class="detail-inner">${buildDetailHtml(gameNum, players)}</div>
      </td>`;

      gameRow.insertAdjacentElement('afterend', detailRow);
      btn.textContent = 'Detail ▲';
      btn.classList.add('is-open');
    } catch (_) {
      showToast('Gagal memuat detail game.', 'error');
      btn.textContent = 'Detail';
    } finally {
      btn.disabled = false;
    }
  }

  // ── Match meta ───────────────────────────────
  function updateMatchMeta(match) {
    const opponentName = match.opponent_name || 'Match';

    document.title = `${opponentName} — Esport`;

    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) pageTitle.textContent = `${opponentName}`;

    const pageSub = document.getElementById('pageSub');
    if (pageSub) pageSub.textContent = `Format: ${match.format || '-'}  |  Lihat semua game dalam match ini`;

    const breadcrumbMatch = document.getElementById('breadcrumbMatch');
    if (breadcrumbMatch) breadcrumbMatch.textContent = opponentName;

    const addGameBtn = document.getElementById('addGameBtn');
    if (addGameBtn) addGameBtn.href = `addgame.html?match_id=${matchId}`;

    // FIX: back btn dinamis berdasarkan type match
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
      const type = (match.type || '').toLowerCase();
      if (type === 'scrim' || type === 'ranked') {
        backBtn.href = 'train.html';
      } else {
        // tournament / league → kembali ke match.html dengan filter kompetisi jika ada
        const compId = match.competition_id ? `?competition_id=${match.competition_id}` : '';
        backBtn.href = `match.html${compId}`;
      }
    }
  }

  // ── Render games ────────────────────────────
  function renderGames(games) {
    const tbody    = document.getElementById('gameBody');
    const countEl  = document.getElementById('gameCount');
    const maxGames = matchData ? maxGamesFromFormat(matchData.format) : Infinity;
    const COL_SPAN = 7;

    if (countEl) {
      const remaining = maxGames === Infinity ? '' : ` / ${maxGames}`;
      countEl.textContent = `${games.length}${remaining} game`;
    }

    const addGameBtn = document.getElementById('addGameBtn');
    if (addGameBtn) {
      const full = games.length >= maxGames;
      addGameBtn.classList.toggle('hidden', full);
      full ? addGameBtn.setAttribute('aria-disabled', 'true') : addGameBtn.removeAttribute('aria-disabled');
    }

    if (!tbody) return;

    if (games.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="${COL_SPAN}">
          <div class="empty-state">
            <svg viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <h3>Belum ada game</h3>
            <p>Tambahkan data game pertama untuk menampilkan statistik match.</p>
            <a href="addgame.html?match_id=${matchId}" class="btn btn-primary btn-sm">
              <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Tambah Game
            </a>
          </div>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = games.map((g) => {
      const dur = `${g.duration_minutes || 0}m ${String(g.duration_seconds || 0).padStart(2, '0')}s`;
      const mvp = g.mvp
        ? `<span class="badge badge-blue">${g.mvp}</span>`
        : `<span class="badge badge-neutral">—</span>`;

      return `
        <tr data-game-id="${g.id}">
          <td><strong>Game ${g.game_number}</strong></td>
          <td>${resultBadgeHtml(g.result)}</td>
          <td>${dur}</td>
          <td>${scoreBadgeHtml(g.team_kills, g.team_deaths)}</td>
          <td>${mvp}</td>
          <td>
            <button
              class="btn btn-sm btn-detail"
              data-id="${g.id}"
              data-num="${g.game_number}"
              data-colspan="${COL_SPAN}"
              aria-expanded="false"
            >Detail</button>
          </td>
          <td class="actions-cell">
            <a href="editgame.html?id=${g.id}" class="btn btn-sm btn-secondary">Edit</a>
            <button class="btn btn-sm btn-danger" data-id="${g.id}" data-num="${g.game_number}" data-action="delete">Hapus</button>
          </td>
        </tr>`;
    }).join('');

    tbody.addEventListener('click', (e) => {
      const detailBtn = e.target.closest('.btn-detail');
      if (detailBtn) {
        const gId  = Number(detailBtn.dataset.id);
        const gNum = detailBtn.dataset.num;
        const cs   = Number(detailBtn.dataset.colspan);
        toggleDetail(detailBtn, gId, gNum, cs);
        return;
      }

      const deleteBtn = e.target.closest('[data-action="delete"]');
      if (deleteBtn) {
        handleDelete(Number(deleteBtn.dataset.id), deleteBtn.dataset.num);
      }
    });
  }

  // ── Delete ──────────────────────────────────
  function handleDelete(id, num) {
    if (!confirm(`Hapus Game ${num}? Tindakan ini tidak bisa dibatalkan.`)) return;
    fetch(`${apiBase()}game_api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json || !json.ok) throw new Error((json && json.message) || 'Gagal menghapus.');
        showToast(`Game ${num} berhasil dihapus.`, 'success');
        delete detailCache[id];
        loadGames();
      })
      .catch((err) => showToast(err.message || 'Gagal menghapus game.', 'error'));
  }

  // ── Load match info ──────────────────────────
  // FIX: tidak throw jika gagal — loadGames tetap jalan
  function loadMatchInfo() {
    return fetch(`${apiBase()}match_api.php?action=get&id=${matchId}`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json || !json.ok) return null;
        return json.match;
      })
      .then((match) => {
        if (match) {
          matchData = match;
          updateMatchMeta(match);
        }
        // Jika match null (tidak ditemukan), lanjut saja — loadGames akan tampil empty state
      })
      .catch(() => {
        // Koneksi gagal — tetap lanjutkan loadGames, jangan hentikan alur
      });
  }

  function loadGames() {
    fetch(`${apiBase()}game_api.php?action=list&match_id=${matchId}`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json || !json.ok) throw new Error(json?.message || 'Gagal mengambil data game');
        return json.games || [];
      })
      .then(renderGames)
      .catch((err) => showToast(err.message || 'Gagal memuat game.', 'error'));
  }

  document.addEventListener('DOMContentLoaded', () => {
    matchId = getMatchIdFromUrl();

    // FIX: direct URL tanpa match_id — tidak tampilkan toast error,
    // cukup redirect ke match.html secara diam-diam
    if (matchId <= 0) {
      window.location.replace('match.html');
      return;
    }

    // loadMatchInfo tidak lagi mem-block loadGames meski gagal
    loadMatchInfo().then(() => loadGames());
  });

})();
