<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
    exit;
}

require __DIR__ . '/db.php';

$rawInput = file_get_contents('php://input');
$data     = json_decode($rawInput, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Invalid JSON']);
    exit;
}

$gameInfo    = $data['game']    ?? null;
$playerStats = $data['players'] ?? null;

if (!$gameInfo || !$playerStats || !is_array($playerStats)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Data tidak lengkap']);
    exit;
}

$gameId = (int)($gameInfo['gameId'] ?? 0);
if ($gameId <= 0) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'game_id tidak valid']);
    exit;
}

try {
    $pdo->beginTransaction();

    // ── Pastikan game ada ─────────────────────────────────────────────────
    $checkStmt = $pdo->prepare('SELECT id FROM games WHERE id = :id');
    $checkStmt->execute([':id' => $gameId]);
    if (!$checkStmt->fetch()) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['ok' => false, 'message' => 'Game tidak ditemukan']);
        exit;
    }

    // ── Update games ──────────────────────────────────────────────────────
    $updateGame = $pdo->prepare('
        UPDATE games
        SET
            result           = :result,
            team_kills       = :team_kills,
            team_deaths      = :team_deaths,
            duration_minutes = :duration_minutes,
            duration_seconds = :duration_seconds
        WHERE id = :id
    ');
    $updateGame->execute([
        ':id'               => $gameId,
        ':result'           => $gameInfo['result'],
        ':team_kills'       => (int)$gameInfo['teamKills'],
        ':team_deaths'      => (int)$gameInfo['teamDeaths'],
        ':duration_minutes' => (int)$gameInfo['durationMinutes'],
        ':duration_seconds' => (int)$gameInfo['durationSeconds'],
    ]);

    // ── Ambil primary_role dari players (batch) ───────────────────────────
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

    // ── Hapus game_players lama, insert ulang ─────────────────────────────
    // Strategi delete+insert lebih aman daripada UPDATE per-row
    // karena player bisa diganti (bukan hanya stats yang berubah).
    $deleteStmt = $pdo->prepare('DELETE FROM game_players WHERE game_id = :game_id');
    $deleteStmt->execute([':game_id' => $gameId]);

    $playerStmt = $pdo->prepare('
        INSERT INTO game_players
            (game_id, player_id, player_role, hero_name, kills, deaths, assists, kda, total_gold)
        VALUES
            (:game_id, :player_id, :player_role, :hero_name, :kills, :deaths, :assists, :kda, :total_gold)
    ');

    foreach ($playerStats as $player) {
        $playerId  = (int)($player['playerId']  ?? 0);
        $heroName  = trim($player['heroName']   ?? '');
        $kills     = (int)($player['kills']     ?? 0);
        $deaths    = (int)($player['deaths']    ?? 0);
        $assists   = (int)($player['assists']   ?? 0);
        $kda       = round((float)($player['kda'] ?? (($kills + $assists) / max($deaths, 1))), 2);
        $totalGold = (int)($player['totalGold'] ?? 0);

        if ($playerId <= 0) {
            $pdo->rollBack();
            http_response_code(422);
            echo json_encode(['ok' => false, 'message' => "player_id tidak valid untuk role {$player['roleName']}"]);
            exit;
        }

        $playerRole = $roleMap[$playerId] ?? trim($player['roleName'] ?? '');

        $playerStmt->execute([
            ':game_id'     => $gameId,
            ':player_id'   => $playerId,
            ':player_role' => $playerRole,
            ':hero_name'   => $heroName,
            ':kills'       => $kills,
            ':deaths'      => $deaths,
            ':assists'     => $assists,
            ':kda'         => $kda,
            ':total_gold'  => $totalGold,
        ]);
    }

    $pdo->commit();
    echo json_encode(['ok' => true, 'gameId' => $gameId]);

} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Gagal memperbarui game: ' . $e->getMessage()]);
}
