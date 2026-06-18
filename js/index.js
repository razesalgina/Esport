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

  // ── KPI ───────────────────────────────────
  function renderKpi(kpi) {
    setText('kpiKompetisi', kpi.competitions ?? '—');
    setText('kpiMatch',     kpi.matches      ?? '—');
    setText('kpiTeam',      kpi.players      ?? '—');
    setText('kpiWinrate',   kpi.winrate != null ? `${kpi.winrate}%` : '—');
  }

  // ── Match Summary ───────────────────────────
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
      const type = (m.type || '').toLowerCase();
      const typeBadge = type === 'scrim'
        ? 'badge-neutral'
        : type === 'ranked' ? 'badge-neutral' : 'badge-yellow';
      return `
        <tr>
          <td><a href="game.html?match_id=${m.id}" class="link-primary"><strong>${m.opponent_name || '—'}</strong></a></td>
          <td><span class="badge ${typeBadge}">${m.type.toUpperCase() || '—'}</span></td>
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

  // ── Team Analysis ───────────────────────────
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
      const roleKey  = (s.primary_role || '').toLowerCase();
      const roleLbl  = ROLE_LABEL[roleKey] || s.primary_role || '—';
      const roleCls  = ROLE_BADGE[roleKey] || 'badge-neutral';
      const kdaColor = parseFloat(s.avg_kda) >= 3 ? 'badge-green' : parseFloat(s.avg_kda) >= 2 ? 'badge-yellow' : 'badge-red';
      return `
        <tr>
          <td><strong>${s.player_name}</strong></td>
          <td><span class="badge ${roleCls}">${roleLbl}</span></td>
          <td><span class="badge badge-neutral">${s.games}G</span></td>
          <td>${s.total_kills}/${s.total_deaths}/${s.total_assists}</td>
          <td><span class="badge ${kdaColor}">${s.avg_kda}</span></td>
        </tr>`;
    }).join('');
    setHTML('teamAnalysis', `
      <table>
        <thead><tr><th>Pemain</th><th>Role</th><th>Games</th><th>K/D/A</th><th>Avg KDA</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`);
  }

  // ── Hero Picks ──────────────────────────────
  function renderHeroPicks(heroes) {
    if (!heroes || heroes.length === 0) {
      setHTML('heroPicks', `
        <div class="empty-state">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <h3>Belum ada data hero</h3>
          <p>Data muncul setelah game dicatat</p>
        </div>`);
      return;
    }
    const maxPick = Math.max(...heroes.map((h) => h.picks));
    const rows = heroes.map((h) => {
      const wr  = h.picks > 0 ? Math.round(h.hero_wins / h.picks * 100) : 0;
      const pct = Math.round(h.picks / maxPick * 100);
      const wrColor = wr >= 60 ? 'badge-green' : wr >= 50 ? 'badge-yellow' : 'badge-red';
      return `
        <div style="margin-bottom:.75rem">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
            <strong>${h.hero_name}</strong>
            <div style="display:flex;gap:.4rem;align-items:center">
              <span class="badge badge-neutral">${h.picks}x</span>
              <span class="badge ${wrColor}">WR ${wr}%</span>
            </div>
          </div>
          <div style="background:var(--border);border-radius:4px;height:6px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:var(--primary);border-radius:4px"></div>
          </div>
        </div>`;
    }).join('');
    setHTML('heroPicks', `<div style="padding:.25rem 0">${rows}</div>`);
  }

  // ── Competition Overview ──────────────────────
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
      { key: 'cancel',   label: 'Cancel',   cls: 'badge-red' },
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

  // ── Load all ─────────────────────────────────
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
        renderHeroPicks(data.hero_picks);
        renderCompOverview(data.comp_status);

        const now = new Date().toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
        setText('lastUpdated', `Terakhir diperbarui: ${now}`);
      })
      .catch((err) => {
        showToast(err.message || 'Gagal memuat data dashboard.', 'error');
        setText('lastUpdated', 'Gagal memuat data');
      });
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    document.getElementById('refreshBtn')?.addEventListener('click', loadDashboard);
  });
})();