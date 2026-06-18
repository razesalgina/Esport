<?php
header('Content-Type: application/json');

require __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// ── GET: list games ──────────────────────────────────────────────────────
if ($method === 'GET' && $action === 'list') {
    $matchId = isset($_GET['match_id']) ? (int)$_GET['match_id'] : 0;
    if ($matchId <= 0) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'message' => 'match_id tidak valid']);
        exit;
    }
    try {
        $stmt = $pdo->prepare(
            'SELECT id, match_id, game_number, result, team_kills, team_deaths,
                    duration_minutes, duration_seconds, created_at
             FROM games
             WHERE match_id = :match_id
             ORDER BY game_number ASC'
        );
        $stmt->execute([':match_id' => $matchId]);
        $games = $stmt->fetchAll();

        if (!empty($games)) {
            $gameIds  = array_column($games, 'id');
            $inClause = implode(',', array_fill(0, count($gameIds), '?'));

            // MVP: player dengan KDA tertinggi per game
            // JOIN players untuk ambil nama; player_role sudah ada di game_players
            $mvpStmt = $pdo->prepare(
                "SELECT gp.game_id, p.name AS player_name,
                        ROUND((gp.kills + gp.assists) / GREATEST(gp.deaths, 1), 2) AS kda
                 FROM game_players gp
                 JOIN players p ON p.id = gp.player_id
                 INNER JOIN (
                     SELECT game_id,
                            MAX((kills + assists) / GREATEST(deaths, 1)) AS max_kda
                     FROM game_players
                     WHERE game_id IN ($inClause)
                     GROUP BY game_id
                 ) best ON gp.game_id = best.game_id
                       AND (gp.kills + gp.assists) / GREATEST(gp.deaths, 1) = best.max_kda
                 WHERE gp.game_id IN ($inClause)
                 GROUP BY gp.game_id"
            );
            $mvpStmt->execute(array_merge($gameIds, $gameIds));
            $mvpMap = [];
            foreach ($mvpStmt->fetchAll() as $row) {
                $mvpMap[(int)$row['game_id']] = $row['player_name'];
            }
            foreach ($games as &$game) {
                $game['mvp'] = $mvpMap[(int)$game['id']] ?? null;
            }
            unset($game);
        }

        echo json_encode(['ok' => true, 'games' => $games]);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'message' => 'Gagal mengambil data game: ' . $e->getMessage()]);
    }
    exit;
}

// ── GET: single game ─────────────────────────────────────────────────────
if ($method === 'GET' && $action === 'get') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'message' => 'id tidak valid']);
        exit;
    }
    try {
        $stmt = $pdo->prepare(
            'SELECT id, match_id, game_number, result, team_kills, team_deaths,
                    duration_minutes, duration_seconds
             FROM games WHERE id = :id'
        );
        $stmt->execute([':id' => $id]);
        $game = $stmt->fetch();
        if (!$game) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'message' => 'Game tidak ditemukan']);
            exit;
        }

        // player_role diambil langsung dari game_players (sudah disimpan saat insert)
        // player_name di-JOIN dari tabel players
        $pStmt = $pdo->prepare(
            'SELECT gp.player_role, p.name AS player_name, p.id AS player_id,
                    gp.hero_name, gp.kills, gp.deaths, gp.assists, gp.kda, gp.total_gold
             FROM game_players gp
             JOIN players p ON p.id = gp.player_id
             WHERE gp.game_id = :gid
             ORDER BY gp.id ASC'
        );
        $pStmt->execute([':gid' => $id]);
        $game['players'] = $pStmt->fetchAll();

        echo json_encode(['ok' => true, 'game' => $game]);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'message' => 'Gagal mengambil detail game: ' . $e->getMessage()]);
    }
    exit;
}

// ── GET: players list ────────────────────────────────────────────────────
if ($method === 'GET' && $action === 'players') {
    try {
        $stmt = $pdo->query(
            'SELECT id, name, primary_role FROM players WHERE is_active = 1 ORDER BY name ASC'
        );
        echo json_encode(['ok' => true, 'players' => $stmt->fetchAll()]);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'message' => 'Gagal mengambil data pemain']);
    }
    exit;
}

// ── GET: heroes list ─────────────────────────────────────────────────────
if ($method === 'GET' && $action === 'heroes') {
    try {
        $stmt   = $pdo->query('SELECT name FROM mlbb_heroes ORDER BY name ASC');
        $heroes = $stmt->fetchAll(PDO::FETCH_COLUMN);
        echo json_encode(['ok' => true, 'heroes' => $heroes]);
    } catch (Throwable $e) {
        // fallback kolom lama
        try {
            $stmt2  = $pdo->query('SELECT nama_hero FROM mlbb_heroes ORDER BY nama_hero ASC');
            $heroes = $stmt2->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['ok' => true, 'heroes' => $heroes]);
        } catch (Throwable $e2) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'message' => 'Gagal mengambil data hero: ' . $e2->getMessage()]);
        }
    }
    exit;
}

// ── POST ─────────────────────────────────────────────────────────────────
if ($method === 'POST') {
    $data   = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $data['action'] ?? $action;

    // ── DELETE ──────────────────────────────────────────────────────────
    if ($action === 'delete') {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'ID tidak valid']);
            exit;
        }
        try {
            $sel = $pdo->prepare('SELECT match_id, game_number FROM games WHERE id = :id');
            $sel->execute([':id' => $id]);
            $game = $sel->fetch();
            if (!$game) {
                http_response_code(404);
                echo json_encode(['ok' => false, 'message' => 'Game tidak ditemukan']);
                exit;
            }

            $pdo->beginTransaction();
            $pdo->prepare('DELETE FROM game_players WHERE game_id = :id')->execute([':id' => $id]);
            $pdo->prepare('DELETE FROM games WHERE id = :id')->execute([':id' => $id]);
            $pdo->prepare(
                'UPDATE games SET game_number = game_number - 1
                 WHERE match_id = :mid AND game_number > :gn'
            )->execute([':mid' => $game['match_id'], ':gn' => $game['game_number']]);
            $pdo->commit();

            echo json_encode(['ok' => true]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['ok' => false, 'message' => 'Gagal menghapus game: ' . $e->getMessage()]);
        }
        exit;
    }

    // ── UPDATE ──────────────────────────────────────────────────────────
    if ($action === 'update') {
        $id          = (int)($data['id']      ?? 0);
        $gameInfo    = $data['game']           ?? null;
        $playerStats = $data['players']        ?? null;

        if ($id <= 0 || !$gameInfo || !$playerStats || !is_array($playerStats)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'Data tidak lengkap']);
            exit;
        }
        try {
            $pdo->beginTransaction();

            $pdo->prepare(
                'UPDATE games SET result=:result, team_kills=:tk, team_deaths=:td,
                 duration_minutes=:dm, duration_seconds=:ds WHERE id=:id'
            )->execute([
                ':result' => $gameInfo['result'],
                ':tk'     => $gameInfo['teamKills'],
                ':td'     => $gameInfo['teamDeaths'],
                ':dm'     => $gameInfo['durationMinutes'],
                ':ds'     => $gameInfo['durationSeconds'],
                ':id'     => $id,
            ]);

            $pdo->prepare('DELETE FROM game_players WHERE game_id = :gid')
                ->execute([':gid' => $id]);

            // Ambil primary_role dari players (batch) untuk auto-fill player_role
            $playerIds = array_filter(array_map(fn($p) => (int)($p['playerId'] ?? 0), $playerStats));
            $roleMap   = [];
            if (!empty($playerIds)) {
                $inClause = implode(',', array_fill(0, count($playerIds), '?'));
                $roleStmt = $pdo->prepare("SELECT id, primary_role FROM players WHERE id IN ($inClause)");
                $roleStmt->execute(array_values($playerIds));
                foreach ($roleStmt->fetchAll() as $row) {
                    $roleMap[(int)$row['id']] = $row['primary_role'] ?? '';
                }
            }

            $pStmt = $pdo->prepare(
                'INSERT INTO game_players
                    (game_id, player_id, player_role, hero_name, kills, deaths, assists, kda, total_gold)
                 VALUES
                    (:gid, :player_id, :player_role, :hero, :k, :d, :a, :kda, :g)'
            );
            foreach ($playerStats as $p) {
                $playerId = (int)($p['playerId'] ?? 0);
                if ($playerId <= 0) {
                    $pdo->rollBack();
                    http_response_code(422);
                    echo json_encode(['ok' => false, 'message' => "player_id tidak valid"]);
                    exit;
                }
                $k          = (int)($p['kills']   ?? 0);
                $d          = (int)($p['deaths']  ?? 0);
                $a          = (int)($p['assists'] ?? 0);
                $kda        = round((float)($p['kda'] ?? (($k + $a) / max($d, 1))), 2);
                $playerRole = $roleMap[$playerId] ?? trim($p['roleName'] ?? '');

                $pStmt->execute([
                    ':gid'         => $id,
                    ':player_id'   => $playerId,
                    ':player_role' => $playerRole,
                    ':hero'        => $p['heroName'],
                    ':k'           => $k,
                    ':d'           => $d,
                    ':a'           => $a,
                    ':kda'         => $kda,
                    ':g'           => (int)($p['totalGold'] ?? 0),
                ]);
            }

            $pdo->commit();
            echo json_encode(['ok' => true]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['ok' => false, 'message' => 'Gagal mengupdate game: ' . $e->getMessage()]);
        }
        exit;
    }
}

http_response_code(400);
echo json_encode(['ok' => false, 'message' => 'Action tidak dikenal']);
