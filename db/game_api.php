<?php
header('Content-Type: application/json');

require __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// ── GET: list games ─────────────────────────────
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

            $mvpStmt = $pdo->prepare(
                "SELECT gp.game_id, gp.player_name,
                        ROUND((gp.kills + gp.assists) / GREATEST(gp.deaths, 1), 2) AS kda
                 FROM game_players gp
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
        echo json_encode(['ok' => false, 'message' => 'Gagal mengambil data game']);
    }
    exit;
}

// ── GET: single game ───────────────────────────
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

        $pStmt = $pdo->prepare(
            'SELECT role_name, player_name, hero_name, kills, deaths, assists, total_gold
             FROM game_players WHERE game_id = :gid ORDER BY id ASC'
        );
        $pStmt->execute([':gid' => $id]);
        $game['players'] = $pStmt->fetchAll();

        echo json_encode(['ok' => true, 'game' => $game]);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'message' => 'Gagal mengambil detail game']);
    }
    exit;
}

// ── GET: players list ──────────────────────────
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

// ── GET: heroes list ──────────────────────────
// Tabel mlbb_heroes memiliki kolom: id, name, created_at
if ($method === 'GET' && $action === 'heroes') {
    try {
        // Coba kolom 'name' terlebih dahulu (sesuai screenshot DB)
        $stmt = $pdo->query('SELECT name FROM mlbb_heroes ORDER BY name ASC');
        $heroes = $stmt->fetchAll(PDO::FETCH_COLUMN);
        echo json_encode(['ok' => true, 'heroes' => $heroes]);
    } catch (Throwable $e) {
        // Fallback: coba kolom 'nama_hero' (schema lama)
        try {
            $stmt2 = $pdo->query('SELECT nama_hero FROM mlbb_heroes ORDER BY nama_hero ASC');
            $heroes = $stmt2->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode(['ok' => true, 'heroes' => $heroes]);
        } catch (Throwable $e2) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'message' => 'Gagal mengambil data hero: ' . $e2->getMessage()]);
        }
    }
    exit;
}

// ── POST ──────────────────────────────────────
if ($method === 'POST') {
    $data   = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $data['action'] ?? $action;

    // ── DELETE ──
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
            echo json_encode(['ok' => false, 'message' => 'Gagal menghapus game']);
        }
        exit;
    }

    // ── UPDATE ──
    if ($action === 'update') {
        $id          = (int)($data['id'] ?? 0);
        $gameInfo    = $data['game']    ?? null;
        $playerStats = $data['players'] ?? null;

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

            $pStmt = $pdo->prepare(
                'INSERT INTO game_players (game_id, role_name, player_name, hero_name, kills, deaths, assists, total_gold, kda)
                 VALUES (:gid, :role, :player, :hero, :k, :d, :a, :g, :kda)'
            );
            foreach ($playerStats as $p) {
                $k   = (int)($p['kills']   ?? 0);
                $d   = (int)($p['deaths']  ?? 0);
                $a   = (int)($p['assists'] ?? 0);
                $kda = round(($k + $a) / max($d, 1), 2);
                $pStmt->execute([
                    ':gid'    => $id,
                    ':role'   => $p['roleName'],
                    ':player' => $p['playerName'],
                    ':hero'   => $p['heroName'],
                    ':k'      => $k,
                    ':d'      => $d,
                    ':a'      => $a,
                    ':g'      => (int)($p['totalGold'] ?? 0),
                    ':kda'    => $kda,
                ]);
            }

            $pdo->commit();
            echo json_encode(['ok' => true]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['ok' => false, 'message' => 'Gagal mengupdate game']);
        }
        exit;
    }
}

http_response_code(400);
echo json_encode(['ok' => false, 'message' => 'Action tidak dikenal']);