// js/index.js
(function () {
  const ROLE_LABEL = {
    jungler: 'Jungler', roamer: 'Roamer', midlaner: 'Mid Laner',
    explaner: 'Exp Laner', goldlaner: 'Gold Laner',
  };
  const ROLE_BADGE = {
    jungler: 'badge-green', roamer: 'badge-red', midlaner: 'badge-blue',
    explaner: 'badge-neutral', goldlaner: 'badge-yellow',
  };

  const apiBase = () => window.EsportConfig ? window.EsportConfig.apiBase : 'db/';

  function showToast(msg, type) {
    if (window.Esport && typeof window.Esport.showToast === 'function') {
      window.Esport.showToast(msg, type);
    }
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  // ── KPI ──────────────────────────────────────
  function renderKpi(kpi) {
    setText('kpiKompetisi', kpi.competitions ?? '—');
    setText('kpiMatch',     kpi.matches      ?? '—');
    setText('kpiTeam',      kpi.players      ?? '—');
    setText('kpiWinrate',   kpi.winrate != null ? `${kpi.winrate}%` : '—');
  }

  // ── Match Summary ─────────────────────────────
  function renderMatchSummary(matches) {
    if (!matches || matches.length === 0) {
      setHTML('matchSummary', `
        <div class="empty-state">
          <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <h3>Belum ada match</h3>
          <p>Tambah data match untuk melihat summary</p>
          <a href="match.html" class="btn btn-primary btn-sm">Tambah Match</a>
        </div>`);
      return;
    }
    const rows = matches.map((m) => {
      const score = m.game_count > 0
        ? `<span class="badge badge-green">${m.game_wins}</span><span class="badge badge-neutral">:</span><span class="badge badge-red">${m.game_loses}</span>`
        : '<span class="text-faint">————</span>';
      const date = m.match_date
        ? new Date(m.match_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
        : '—';
      const type      = (m.type || '').toLowerCase();
      const typeLabel = (m.type || '—').toUpperCase();  // FIX: guard null crash
      const typeBadge = type === 'scrim' || type === 'ranked' ? 'badge-neutral' : 'badge-yellow';
      return `
        <tr>
          <td><a href="game.html?match_id=${m.id}" class="link-primary"><strong>${m.opponent_name || '—'}</strong></a></td>
          <td><span class="badge ${typeBadge}">${typeLabel}</span></td>
          <td>${score}</td>
          <td><small class="text-faint">${date}</small></td>
        </tr>`;
    }).join('');
    setHTML('matchSummary', `
      <table>
        <thead><tr><th>Lawan</th><th>Tipe</th><th>Skor</th><th>Tanggal</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`);
  }

  // ── Team Analysis ─────────────────────────────
  function getRoleThresholds(roleKey) {
    switch (roleKey) {
      case 'jungler':
        return { k: 5,  d: 4.5, a: 5  };
      case 'midlaner':
        return { k: 5,  d: 3.5, a: 5  };
      case 'roamer':
        return { k: 1,  d: 6.5, a: 9  };
      case 'explaner':
        return { k: 3,  d: 5.5, a: 7  };
      case 'goldlaner':
        return { k: 6,  d: 2.5, a: 9  };
      default:
        return { k: 3, d: 4, a: 5 };
    }
  }

  function getKdaBadgeClasses(roleKey, avgKill, avgDeath, avgAssist) {
    const t = getRoleThresholds(roleKey);
    const killCls   = avgKill   >= t.k ? 'badge-green' : 'badge-red';
    const deathCls  = avgDeath  >= t.d ? 'badge-red'   : 'badge-green';
    const assistCls = avgAssist >= t.a ? 'badge-green' : 'badge-red';
    return { killCls, deathCls, assistCls };
  }

  function renderTeamAvgSummary(teamAvg) {
    const el = document.getElementById('teamAvgSummary');
    if (!el) return;

    if (!teamAvg || !teamAvg.games) {
      el.textContent = 'Belum ada game';
      return;
    }

    const kills  = teamAvg.avg_kills.toFixed(2);
    const deaths = teamAvg.avg_deaths.toFixed(2);
    const min    = teamAvg.avg_dur_min;
    const sec    = String(teamAvg.avg_dur_sec).padStart(2, '0');

    el.innerHTML = `
      <div class="team-avg-pill">
        <span class="badge badge-blue">${kills}</span>
        <span>/</span>
        <span class="badge badge-red">${deaths}</span>
        <span>/</span>
        <span class="badge badge-yellow">${min}m ${sec}s</span>
      </div>
    `;
  }

  function renderTeamAnalysis(stats) {
    if (!stats || stats.length === 0) {
      setHTML('teamAnalysis', `
        <div class="empty-state">
          <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          <h3>Belum ada data</h3>
          <p>Tambah game untuk melihat statistik pemain</p>
        </div>`);
      return;
    }

    const rows = stats.map((s) => {
      const roleKey = (s.primary_role || '').toLowerCase();
      const roleLbl = ROLE_LABEL[roleKey] || s.primary_role || '—';
      const roleCls = ROLE_BADGE[roleKey] || 'badge-neutral';

      const kdaVal   = parseFloat(s.avg_kda);
      const kdaColor = kdaVal >= 8 ? 'badge-green' : kdaVal >= 7 ? 'badge-yellow' : 'badge-red';

      const games = s.games || 0;
      const rawAvgKill   = games > 0 ? s.total_kills   / games : 0;
      const rawAvgDeath  = games > 0 ? s.total_deaths  / games : 0;
      const rawAvgAssist = games > 0 ? s.total_assists / games : 0;

      const avgKill   = Number(rawAvgKill.toFixed(2));
      const avgDeath  = Number(rawAvgDeath.toFixed(2));
      const avgAssist = Number(rawAvgAssist.toFixed(2));

      const { killCls, deathCls, assistCls } =
        getKdaBadgeClasses(roleKey, avgKill, avgDeath, avgAssist);

      return `
        <tr>
          <td><strong>${s.player_name || '—'}</strong></td>
          <td><span class="badge ${roleCls}">${roleLbl}</span></td>
          <td><span class="badge badge-neutral">${s.games}G</span></td>
          <td class="kda-cell">
            <span class="badge ${killCls}">${avgKill}</span>
            <span>/</span>
            <span class="badge ${deathCls}">${avgDeath}</span>
            <span>/</span>
            <span class="badge ${assistCls}">${avgAssist}</span>
          </td>
          <td><span class="badge ${kdaColor}">${s.avg_kda}</span></td>
        </tr>`;
    }).join('');

    setHTML('teamAnalysis', `
      <table>
        <thead>
          <tr>
            <th>Pemain</th><th>Role</th><th>Games</th><th>K/D/A</th><th>KDA</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`);
  }

  // ── Player Hero Analysis ──────────────
  function renderPlayerHeroAnalysis(playerRows) {
    if (!playerRows || playerRows.length === 0) {
      setHTML('playerHeroRows', `
        <div class="empty-state">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <h3>Belum ada data player</h3>
          <p>Data akan muncul setelah game dicatat</p>
        </div>`);
      return;
    }

    const html = playerRows.map((p) => {
      const roleKey = (p.primary_role || '').toLowerCase();
      const roleLbl = ROLE_LABEL[roleKey] || p.primary_role || '—';
      const roleCls = ROLE_BADGE[roleKey] || 'badge-neutral';

      const bestStrip = p.best_heroes && p.best_heroes.length
        ? p.best_heroes.map((h) => {
            const tip = `${h.hero_name} (${h.picks} Games/KDA ${h.avg_kda}/WR ${h.winrate}%)`;
            return `
              <div class="player-hero-thumb" title="${tip}">
                <img src="assets/heroes/${h.hero_name.toLowerCase()}.png" width="64" height="64" loading="lazy"</img>
              </div>`;
          }).join('')
        : '<span class="text-faint" style="font-size:.8rem">Belum ada hero terbaik</span>';

      const comfortStrip = p.comfort_heroes && p.comfort_heroes.length
        ? p.comfort_heroes.map((h) => {
            const tip = `${h.hero_name} (${h.picks} Games/KDA ${h.avg_kda}/WR ${h.winrate}%)`;
            return `
              <div class="player-hero-thumb" title="${tip}">
                <img src="assets/heroes/${h.hero_name.toLowerCase()}.png" width="64" height="64" loading="lazy"</img>
              </div>`;
          }).join('')
        : '<span class="text-faint" style="font-size:.8rem">Belum ada hero nyaman</span>';

      return `
        <div class="player-hero-card" data-player-id="${p.player_id}">
          <div class="player-hero-card__head">
            <div class="player-hero-card__title">
              <span class="player-hero-card__name">${p.player_name}</span>
              <span class="badge ${roleCls}">${roleLbl}</span>              
            </div>
            <div class="player-hero-actions">
              <button type="button"
                class="btn-player-detail"
                data-player-detail="${p.player_id}">
                Detail
              </button>
            </div>
          </div>

          <div class="player-hero-row">
            <div class="player-hero-row__label">
              <strong>Best KDA</strong>
              <span></span>
              <strong>Most Picked</strong>
            </div>
            <div class="player-hero-strip">
              ${bestStrip}
              <svg class="player-hero-separator" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 44" preserveAspectRatio="none">
                <line x1="0" y1="0" x2="0" y2="44" stroke="#e0e0e0" stroke-width="2"></line>
              </svg>
              ${comfortStrip}
            </div>            
          </div>
        </div>`;
    }).join('');

    setHTML('playerHeroRows', `<div class="player-hero-list">${html}</div>`);
  }

  // ── Hero Detail Modal State & Logic ───────────
  const ModalState = {
    isOpen: false,
    playerId: null,
    playerName: '',
    primaryRole: '',
    allHeroes: [],
    keyword: '',
    activeRole: 'all',
    sortKey: 'games',   // 'games' | 'winrate' | 'kda'
    sortDir: 'desc',    // 'desc' (up) | 'asc' (down)
  };

  function getHeroRoleFromPlayer(primaryRole) {
    // Untuk sekarang, gunakan primary role player sebagai filter default di UI.
    return (primaryRole || '').toLowerCase();
  }

  function sortHeroesForModal(heroes) {
    const key = ModalState.sortKey;
    const dir = ModalState.sortDir === 'asc' ? 1 : -1;

    return [...heroes].sort((a, b) => {
      let va = 0;
      let vb = 0;

      if (key === 'games') {
        va = a.picks || 0;
        vb = b.picks || 0;
      } else if (key === 'winrate') {
        va = a.winrate || 0;
        vb = b.winrate || 0;
      } else if (key === 'kda') {
        va = a.avg_kda || 0;
        vb = b.avg_kda || 0;
      }

      if (va === vb) {
        // tie-break pakai picks lalu kda
        if (a.picks !== b.picks) {
          return (a.picks - b.picks) * -dir;
        }
        return (a.avg_kda - b.avg_kda) * -dir;
      }

      return (va - vb) * -dir;
    });
  }

  function filterHeroesForModal() {
    const kw = ModalState.keyword.trim().toLowerCase();
    const roleKey = ModalState.activeRole;

    let heroes = ModalState.allHeroes || [];

    if (kw) {
      heroes = heroes.filter((h) => (h.hero_name || '').toLowerCase().includes(kw));
    }

    if (roleKey !== 'all') {
      heroes = heroes.filter((h) => {
        const r1 = (h.hero_role1 || '').toLowerCase();
        const r2 = (h.hero_role2 || '').toLowerCase();
        return r1 === roleKey || r2 === roleKey;
      });
    }

    return sortHeroesForModal(heroes);
  }

  function renderHeroDetailList() {
    const listEl = document.getElementById('playerHeroDetailList');
    if (!listEl) return;

    const heroes = filterHeroesForModal();

    if (!heroes.length) {
      listEl.innerHTML = `
        <div class="empty-state">
          <h3>Belum ada hero</h3>
          <p>Atur filter atau search untuk melihat data lain</p>
        </div>`;
      return;
    }

    const rows = heroes.map((h) => {
      const games = h.picks || 0;
      const wr    = h.winrate || 0;
      const wins  = h.wins || 0;
      const loses = h.loses || 0;

      const tipText  = `Total Games: ${games} | Win: ${wins} | Lose: ${loses}`;
      const heroFile = h.hero_name.toLowerCase().replace(/\s+/g, '_');

      const total    = games;
      const winPct   = total ? (wins  / total) * 100 : 0;
      const losePct  = total ? (loses / total) * 100 : 0;

      return `
        <div class="hero-detail-item">
          <!-- Kolom 1: Gambar -->
          <div class="hero-detail-col hero-detail-col--thumb">
            <img
              src="assets/heroes/${heroFile}.png"
              alt="${h.hero_name}"
              class="hero-detail-item__thumb"
              onerror="this.style.backgroundImage='none';"
            />
          </div>

          <!-- Kolom 2: Nama + Games + Winrate -->
          <div class="hero-detail-col hero-detail-col--meta">
            <div class="hero-detail-meta-row hero-detail-meta-row--name">
              <span class="hero-detail-item__name">${h.hero_name}</span>
            </div>
            <div class="hero-detail-meta-row hero-detail-meta-row--games">
              <span class="hero-picked-badge">${games} Games</span>
            </div>
            <div class="hero-detail-meta-row hero-detail-meta-row--wr">
              <span class="hero-winrate" data-tip="${tipText}">
                WR ${wr}%
              </span>
            </div>
          </div>

          <!-- Kolom 3: Avg K/D/A/KDA + Winrate Bar -->
          <div class="hero-detail-col hero-detail-col--stats">
            <div class="hero-detail-stats hero-detail-stats--bar">
              <div class="stats-bar">
                <div class="stats-bar-items">
                  <div class="stats-item">
                    <div class="stats-num">${h.avg_kills.toFixed(2)}</div>
                    <div class="stats-label">Kill</div>
                  </div>
                  <div class="stats-item stats-lose">
                    <div class="stats-num">${h.avg_deaths.toFixed(2)}</div>
                    <div class="stats-label">Death</div>
                  </div>
                  <div class="stats-item stats-win">
                    <div class="stats-num">${h.avg_assists.toFixed(2)}</div>
                    <div class="stats-label">Assist</div>
                  </div>
                  <div class="stats-item stats-winrate">
                    <div class="stats-num">${h.avg_kda.toFixed(2)}</div>
                    <div class="stats-label">KDA</div>
                  </div>
                </div>
                <div class="stats-progress" aria-hidden="true">
                  <div class="stats-progress-win" style="width:${winPct}%"></div>
                  <div class="stats-progress-lose" style="width:${losePct}%"></div>
                </div>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');

    listEl.innerHTML = rows;
  }

  function updateSortButtonsUI() {
    const container = document.getElementById('playerHeroSortMenu');
    if (!container) return;

    const btns = container.querySelectorAll('[data-sort-key]');
    btns.forEach((btn) => {
      const key = btn.getAttribute('data-sort-key');
      const iconSpan = btn.querySelector('.sort-icon');

      if (key === ModalState.sortKey) {
        btn.classList.add('is-active');
        if (iconSpan) {
          if (ModalState.sortDir === 'desc') {
            iconSpan.innerHTML = `
              <svg viewBox="0 0 24 24" width="14" height="14">
                <polyline points="6 15 12 9 18 15" fill="none" stroke="currentColor" stroke-width="2" />
              </svg>`;
          } else {
            iconSpan.innerHTML = `
              <svg viewBox="0 0 24 24" width="14" height="14">
                <polyline points="6 9 12 15 18 9" fill="none" stroke="currentColor" stroke-width="2" />
              </svg>`;
          }
        }
      } else {
        btn.classList.remove('is-active');
        if (iconSpan) iconSpan.innerHTML = '';
      }
    });
  }

  function openHeroDetailModal(playerRow) {
    const modal = document.getElementById('playerHeroDetailModal');
    if (!modal) return;

    ModalState.isOpen     = true;
    ModalState.playerId   = playerRow.player_id;
    ModalState.playerName = playerRow.player_name;
    ModalState.primaryRole = playerRow.primary_role;
    ModalState.allHeroes  = playerRow.all_heroes || [];
    ModalState.keyword    = '';
    ModalState.activeRole = 'all';
    ModalState.sortKey    = 'games';
    ModalState.sortDir    = 'desc';

    const titleEl = document.getElementById('playerHeroDetailTitle');
    const subEl   = document.getElementById('playerHeroDetailSub');
    const searchEl = document.getElementById('playerHeroSearch');

    if (titleEl) titleEl.textContent = playerRow.player_name || 'Player Detail';
    if (subEl)   subEl.textContent = 'Detail hero aktif untuk ' + (playerRow.player_name || '');

    // reset search
    if (searchEl) searchEl.value = '';

    // reset role filter
    const roleFilterWrap = document.getElementById('playerHeroRoleFilters');
    if (roleFilterWrap) {
      const buttons = roleFilterWrap.querySelectorAll('.hero-detail-filter');
      buttons.forEach((b) => b.classList.remove('is-active'));
      const btnAll = roleFilterWrap.querySelector('[data-role="all"]');
      if (btnAll) btnAll.classList.add('is-active');
    }

    // reset sort UI
    updateSortButtonsUI();

    renderHeroDetailList();

    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');

    if (searchEl) {
      setTimeout(() => searchEl.focus(), 10);
    }
  }

  function closeHeroDetailModal() {
    const modal = document.getElementById('playerHeroDetailModal');
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    ModalState.isOpen = false;
  }

  function initHeroDetailModalEvents(playerHeroRows) {
    const modal = document.getElementById('playerHeroDetailModal');
    if (!modal) return;

    // click Detail button di card row
    const container = document.getElementById('playerHeroRows');
    if (container) {
      container.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-player-detail]');
        if (!btn) return;

        const playerId = parseInt(btn.getAttribute('data-player-detail'), 10);
        const row = (playerHeroRows || []).find((p) => p.player_id === playerId);
        if (!row) return;

        openHeroDetailModal(row);
      });
    }

    // close (backdrop + tombol close)
    modal.addEventListener('click', (e) => {
      if (e.target.matches('[data-close-player-detail]')) {
        closeHeroDetailModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && ModalState.isOpen) {
        closeHeroDetailModal();
      }
    });

    // search
    const searchEl = document.getElementById('playerHeroSearch');
    if (searchEl) {
      searchEl.addEventListener('input', () => {
        ModalState.keyword = searchEl.value || '';
        renderHeroDetailList();
      });
    }

    // role filter
    const roleFilterWrap = document.getElementById('playerHeroRoleFilters');
    if (roleFilterWrap) {
      roleFilterWrap.addEventListener('click', (e) => {
        const btn = e.target.closest('.hero-detail-filter');
        if (!btn) return;
        const role = btn.getAttribute('data-role');

        const buttons = roleFilterWrap.querySelectorAll('.hero-detail-filter');
        buttons.forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        ModalState.activeRole = role || 'all';
        renderHeroDetailList();
      });
    }

    // sort filter button (Game / Winrate / KDA)
    const sortContainer = document.getElementById('playerHeroSortMenu');
    if (sortContainer) {
      sortContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-sort-key]');
        if (!btn) return;

        const key = btn.getAttribute('data-sort-key');

        if (ModalState.sortKey === key) {
          // toggle direction
          ModalState.sortDir = ModalState.sortDir === 'desc' ? 'asc' : 'desc';
        } else {
          ModalState.sortKey = key;
          ModalState.sortDir = 'desc'; // default dari tertinggi ke terendah
        }

        updateSortButtonsUI();
        renderHeroDetailList();
      });
    }
  }

  // ── Competition Overview ────────────────────────
  function renderCompOverview(statusMap) {
    const total = Object.values(statusMap).reduce((a, b) => a + b, 0);
    if (total === 0) {
      setHTML('compOverview', `
        <div class="empty-state">
          <svg viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
          <h3>Belum ada kompetisi</h3>
          <p>Daftarkan kompetisi pertama tim kamu</p>
          <a href="competition.html" class="btn btn-primary btn-sm">Tambah Kompetisi</a>
        </div>`);
      return;
    }
    const statuses = [
      { key: 'upcoming', label: 'Upcoming', cls: 'badge-yellow' },
      { key: 'finished', label: 'Finished', cls: 'badge-green' },
      { key: 'cancel',   label: 'Cancel',   cls: 'badge-red'   },
    ];
    const rows = statuses.map((s) => {
      const cnt = statusMap[s.key] || 0;
      if (cnt === 0) return '';
      const pct = Math.round(cnt / total * 100);
      return `
        <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.75rem">
          <span class="badge ${s.cls}" style="min-width:72px;text-align:center">${s.label}</span>
          <div style="flex:1;background:var(--border);border-radius:4px;height:8px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:var(--primary);border-radius:4px"></div>
          </div>
          <strong style="min-width:28px;text-align:right">${cnt}</strong>
        </div>`;
    }).join('');
    setHTML('compOverview', `<div style="padding:.25rem 0">${rows}<div class="text-faint" style="margin-top:.5rem;font-size:.8rem">Total: ${total} kompetisi</div></div>`);
  }

  // ── Load all ──────────────────────────────────
  function loadDashboard() {
    fetch(`${apiBase()}dashboard_api.php`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json || !json.ok) throw new Error(json?.message || 'Gagal memuat dashboard.');
        return json;
      })
      .then((data) => {
        renderKpi(data.kpi);
        renderMatchSummary(data.recent_matches);
        renderTeamAnalysis(data.team_stats);
        renderCompOverview(data.comp_status);
        renderTeamAvgSummary(data.team_avg);

        // NEW: player hero analysis
        const playerRows = data.player_hero_rows || [];
        renderPlayerHeroAnalysis(playerRows);
        initHeroDetailModalEvents(playerRows);

        const now = new Date().toLocaleString('id-ID', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        });
        setText('lastUpdated', `Terakhir diperbarui: ${now}`);
      })
      .catch((err) => {
        showToast(err.message || 'Gagal memuat data dashboard.', 'error');
        setText('lastUpdated', 'Gagal memuat data');
      });
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
  });
})();