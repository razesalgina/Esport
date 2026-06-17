<?php
// db/dashboard_api.php
header('Content-Type: application/json');
require __DIR__ . '/db.php';

try {
    // ─── KPI ─────────────────────────────
    $kompetisi  = (int)$pdo->query('SELECT COUNT(*) FROM competitions')->fetchColumn();
    $matchTotal = (int)$pdo->query('SELECT COUNT(*) FROM matches')->fetchColumn();

    // FIX: hitung pemain unik dari game_players UNION players aktif
    // Menggunakan COUNT(*) dari subquery agar kompatibel dengan semua MySQL mode
    $players = (int)$pdo->query(
        "SELECT COUNT(*) FROM (
            SELECT name
              FROM players
             WHERE is_active = 1
            UNION
            SELECT DISTINCT player_name
              FROM game_players
         ) AS all_active"
    )->fetchColumn();

    // Winrate dari games
    $wr = $pdo->query(
        "SELECT COUNT(*) AS total,
                SUM(result = 'win') AS wins
         FROM games"
    )->fetch();
    $winrate = ($wr['total'] > 0)
        ? round($wr['wins'] / $wr['total'] * 100, 1)
        : null;

    // ─── Match Summary (5 match terakhir) ─────────────────
    $recentMatches = $pdo->query(
        "SELECT m.id, m.opponent_name, m.match_date, m.type, m.format,
                COUNT(g.id)              AS game_count,
                SUM(g.result = 'win')    AS game_wins,
                SUM(g.result = 'lose')   AS game_loses
         FROM matches m
         LEFT JOIN games g ON g.match_id = m.id
         GROUP BY m.id, m.opponent_name, m.match_date, m.type, m.format
         ORDER BY m.match_date DESC, m.id DESC
         LIMIT 5"
    )->fetchAll();
    foreach ($recentMatches as &$rm) {
        $rm['id']         = (int)$rm['id'];
        $rm['game_count'] = (int)$rm['game_count'];
        $rm['game_wins']  = (int)$rm['game_wins'];
        $rm['game_loses'] = (int)$rm['game_loses'];
    }
    unset($rm);

    // ─── Team Analysis: avg KDA per pemain ───────────────
    // FIX only_full_group_by:
    //   - Gunakan ANY_VALUE(p.primary_role) agar MySQL tidak menolak kolom
    //     yang tidak ada di GROUP BY.
    //   - ANY_VALUE mengambil nilai arbitrary dari grup — aman karena satu
    //     player_name seharusnya memiliki satu primary_role yang konsisten.
    $stmtTeam = $pdo->prepare(
        "SELECT gp.player_name,
                ANY_VALUE(p.primary_role)  AS primary_role,
                COUNT(*)                   AS games,
                SUM(gp.kills)              AS total_kills,
                SUM(gp.deaths)             AS total_deaths,
                SUM(gp.assists)            AS total_assists,
                ROUND(AVG(gp.kda), 2)      AS avg_kda
         FROM game_players gp
         LEFT JOIN players p ON p.name = gp.player_name
         GROUP BY gp.player_name
         ORDER BY avg_kda DESC"
    );
    $stmtTeam->execute();
    $teamStats = $stmtTeam->fetchAll();
    foreach ($teamStats as &$ts) {
        $ts['games']         = (int)$ts['games'];
        $ts['total_kills']   = (int)$ts['total_kills'];
        $ts['total_deaths']  = (int)$ts['total_deaths'];
        $ts['total_assists'] = (int)$ts['total_assists'];
    }
    unset($ts);

    // ─── Most picked heroes ──────────────────────────
    $heroPicks = $pdo->query(
        "SELECT gp.hero_name,
                COUNT(*)              AS picks,
                SUM(g.result = 'win') AS hero_wins
         FROM game_players gp
         JOIN games g ON g.id = gp.game_id
         GROUP BY gp.hero_name
         ORDER BY picks DESC
         LIMIT 8"
    )->fetchAll();
    foreach ($heroPicks as &$hp) {
        $hp['picks']     = (int)$hp['picks'];
        $hp['hero_wins'] = (int)$hp['hero_wins'];
    }
    unset($hp);

    // ─── Competition summary ─────────────────────────
    $compStats = $pdo->query(
        "SELECT status, COUNT(*) AS cnt FROM competitions GROUP BY status"
    )->fetchAll();
    $compMap = [];
    foreach ($compStats as $cs) {
        $compMap[$cs['status']] = (int)$cs['cnt'];
    }

    echo json_encode([
        'ok'             => true,
        'kpi'            => [
            'competitions' => $kompetisi,
            'matches'      => $matchTotal,
            'players'      => $players,
            'winrate'      => $winrate,
        ],
        'recent_matches' => $recentMatches,
        'team_stats'     => $teamStats,
        'hero_picks'     => $heroPicks,
        'comp_status'    => $compMap,
    ]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok'      => false,
        'message' => 'Gagal mengambil data dashboard: ' . $e->getMessage(),
    ]);
}
