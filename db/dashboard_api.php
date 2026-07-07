<?php
// db/dashboard_api.php
header('Content-Type: application/json');
require __DIR__ . '/db.php';

try {
    // ─── KPI ────────────────────────────────────
    $kompetisi  = (int)$pdo->query('SELECT COUNT(*) FROM competitions')->fetchColumn();
    $matchTotal = (int)$pdo->query('SELECT COUNT(*) FROM matches')->fetchColumn();

    // Hitung pemain unik dari players aktif UNION player_id yang pernah main.
    $players = (int)$pdo->query(
        "SELECT COUNT(*) FROM (
            SELECT id FROM players WHERE is_active = 1
            UNION
            SELECT DISTINCT player_id FROM game_players
         ) AS all_active"
    )->fetchColumn();

    $wr = $pdo->query(
        "SELECT COUNT(*) AS total,
                SUM(result = 'win') AS wins
         FROM games"
    )->fetch();
    $winrate = ($wr['total'] > 0)
        ? round($wr['wins'] / $wr['total'] * 100, 1)
        : null;

    // ─── Match Summary (5 match terakhir) ───────────────
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

    // ─── Team Analysis: avg KDA per pemain ──────────────
    $stmtTeam = $pdo->prepare(
        "SELECT p.name                    AS player_name,
                ANY_VALUE(p.primary_role) AS primary_role,
                COUNT(*)                  AS games,
                SUM(gp.kills)             AS total_kills,
                SUM(gp.deaths)            AS total_deaths,
                SUM(gp.assists)           AS total_assists,
                ROUND(AVG(gp.kda), 2)     AS avg_kda
         FROM game_players gp
         JOIN players p ON p.id = gp.player_id
         GROUP BY gp.player_id, p.name
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

    // ─── Team Analysis (avg team) ────────────────────────
    $avgStmt = $pdo->query('
        SELECT
            COUNT(*)                                   AS total_games,
            AVG(team_kills)                            AS avg_kills,
            AVG(team_deaths)                           AS avg_deaths,
            AVG(duration_minutes * 60 + duration_seconds) AS avg_duration_seconds
        FROM games
    ');
    $avgRow = $avgStmt->fetch(PDO::FETCH_ASSOC) ?: null;

    $teamAvg = null;
    if ($avgRow && (int)$avgRow['total_games'] > 0) {
        $totalGames    = (int)$avgRow['total_games'];
        $avgKills      = (float)$avgRow['avg_kills'];
        $avgDeaths     = (float)$avgRow['avg_deaths'];
        $avgDurSeconds = (float)$avgRow['avg_duration_seconds'];

        $avgDurMinutes = floor($avgDurSeconds / 60);
        $avgDurRemain  = (int)round($avgDurSeconds - $avgDurMinutes * 60);

        $teamAvg = [
            'games'       => $totalGames,
            'avg_kills'   => round($avgKills, 2),
            'avg_deaths'  => round($avgDeaths, 2),
            'avg_dur_min' => (int)$avgDurMinutes,
            'avg_dur_sec' => $avgDurRemain,
        ];
    }

    // ─── Most picked heroes (GLOBAL, optional) ──────────
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

    // ─── NEW: Player Hero Analysis (per player aktif) ───
    // Ambil agregat hero per player aktif
    $stmtPlayerHeroes = $pdo->prepare(
        "SELECT
            p.id               AS player_id,
            p.name             AS player_name,
            p.primary_role     AS primary_role,
            gp.hero_id         AS hero_id,
            gp.hero_name       AS hero_name,
            h.role1            AS hero_role1,
            h.role2            AS hero_role2,
            COUNT(*)           AS picks,
            ROUND(AVG(gp.kills),   2) AS avg_kills,
            ROUND(AVG(gp.deaths),  2) AS avg_deaths,
            ROUND(AVG(gp.assists), 2) AS avg_assists,
            ROUND(AVG(gp.kda),     2) AS avg_kda,
            SUM(g.result = 'win')  AS wins,
            SUM(g.result = 'lose') AS loses
         FROM game_players gp
         JOIN games g   ON g.id = gp.game_id
         JOIN players p ON p.id = gp.player_id
         LEFT JOIN mlbb_heroes h ON h.id = gp.hero_id
         WHERE p.is_active = 1
         GROUP BY
            p.id, p.name, p.primary_role,
            gp.hero_id, gp.hero_name,
            h.role1, h.role2
         ORDER BY
            p.name ASC,
            avg_kda DESC"
    );
    $stmtPlayerHeroes->execute();
    $rows = $stmtPlayerHeroes->fetchAll(PDO::FETCH_ASSOC);

    // Susun per player, merge hero yang sama
    $playerMap = [];
    foreach ($rows as $row) {
        $pid = (int)$row['player_id'];
        if (!isset($playerMap[$pid])) {
            $playerMap[$pid] = [
                'player_id'    => $pid,
                'player_name'  => $row['player_name'],
                'primary_role' => $row['primary_role'],
                'heroes'       => [],
            ];
        }

        // key hero: pakai hero_id jika ada, fallback ke nama
        $heroId   = $row['hero_id'] ? (int)$row['hero_id'] : null;
        $heroName = $row['hero_name'];
        $heroKey  = $heroId !== null ? 'id_' . $heroId : 'name_' . strtolower(trim($heroName));

        if (!isset($playerMap[$pid]['heroes'][$heroKey])) {
            $role1 = $row['hero_role1'] ? strtolower($row['hero_role1']) : null;
            $role2 = $row['hero_role2'] ? strtolower($row['hero_role2']) : null;

            $playerMap[$pid]['heroes'][$heroKey] = [
                'hero_id'       => $heroId,
                'hero_name'     => $heroName,
                'hero_role1'    => $role1,
                'hero_role2'    => $role2,
                'picks'         => 0,
                'total_kills'   => 0.0,
                'total_deaths'  => 0.0,
                'total_assists' => 0.0,
                'total_kda'     => 0.0,
                'wins'          => 0,
                'loses'         => 0,
            ];
        }

        $hero  =& $playerMap[$pid]['heroes'][$heroKey];
        $games  = (int)$row['picks'];
        $wins   = (int)$row['wins'];
        $loses  = (int)$row['loses'];

        $hero['picks']         += $games;
        // simpan total untuk hitung avg final
        $hero['total_kills']   += $row['avg_kills']   * $games;
        $hero['total_deaths']  += $row['avg_deaths']  * $games;
        $hero['total_assists'] += $row['avg_assists'] * $games;
        $hero['total_kda']     += $row['avg_kda']     * $games;
        $hero['wins']          += $wins;
        $hero['loses']         += $loses;
    }

    // Turunkan jadi array, hitung avg final + top 3
    $playerHeroRows = [];
    foreach ($playerMap as $player) {
        $heroes = [];

        foreach ($player['heroes'] as $hero) {
            $games = (int)$hero['picks'];
            if ($games <= 0) {
                continue; // skip hero tanpa game
            }

            $avgKills   = $hero['total_kills']   / $games;
            $avgDeaths  = $hero['total_deaths']  / $games;
            $avgAssists = $hero['total_assists'] / $games;
            $avgKda     = $hero['total_kda']     / $games;
            $winRate    = round($hero['wins'] / $games * 100);

            $heroes[] = [
                'hero_id'     => $hero['hero_id'],
                'hero_name'   => $hero['hero_name'],
                'hero_role1'  => $hero['hero_role1'],
                'hero_role2'  => $hero['hero_role2'],
                'picks'       => $games,
                'avg_kills'   => round($avgKills, 2),
                'avg_deaths'  => round($avgDeaths, 2),
                'avg_assists' => round($avgAssists, 2),
                'avg_kda'     => round($avgKda, 2),
                'wins'        => $hero['wins'],
                'loses'       => $hero['loses'],
                'winrate'     => $winRate,
            ];
        }

        // top 3 highest avg_kda
        $bestHeroes = $heroes;
        usort($bestHeroes, function ($a, $b) {
            if ($b['avg_kda'] == $a['avg_kda']) {
                return $b['picks'] <=> $a['picks'];
            }
            return $b['avg_kda'] <=> $a['avg_kda'];
        });
        $bestHeroes = array_slice($bestHeroes, 0, 3);

        // top 3 most picked
        $comfortHeroes = $heroes;
        usort($comfortHeroes, function ($a, $b) {
            if ($b['picks'] == $a['picks']) {
                return $b['avg_kda'] <=> $a['avg_kda'];
            }
            return $b['picks'] <=> $a['picks'];
        });
        $comfortHeroes = array_slice($comfortHeroes, 0, 3);

        $playerHeroRows[] = [
            'player_id'      => $player['player_id'],
            'player_name'    => $player['player_name'],
            'primary_role'   => $player['primary_role'],
            'best_heroes'    => $bestHeroes,
            'comfort_heroes' => $comfortHeroes,
            'all_heroes'     => $heroes,
        ];
    }

    // ─── Competition summary ────────────────────────
    $compStats = $pdo->query(
        "SELECT status, COUNT(*) AS cnt FROM competitions GROUP BY status"
    )->fetchAll();
    $compMap = [];
    foreach ($compStats as $cs) {
        $compMap[$cs['status']] = (int)$cs['cnt'];
    }

    echo json_encode([
        'ok'               => true,
        'kpi'              => [
            'competitions' => $kompetisi,
            'matches'      => $matchTotal,
            'players'      => $players,
            'winrate'      => $winrate,
        ],
        'team_avg'         => $teamAvg,
        'recent_matches'   => $recentMatches,
        'team_stats'       => $teamStats,
        'hero_picks'       => $heroPicks,
        'player_hero_rows' => $playerHeroRows,
        'comp_status'      => $compMap,
    ]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok'      => false,
        'message' => 'Gagal mengambil data dashboard: ' . $e->getMessage(),
    ]);
}