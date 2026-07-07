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

$matchId = (int)($gameInfo['matchId'] ?? 0);
if ($matchId <= 0) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'match_id tidak valid']);
    exit;
}

// ── Helper: update aggregate score di tabel matches ─────────────────────
function recompute_match_score(PDO $pdo, int $matchId): void {
    // Hitung jumlah game win/lose untuk match ini
    $stmt = $pdo->prepare('SELECT result, COUNT(*) AS cnt FROM games WHERE match_id = :mid GROUP BY result');
    $stmt->execute([':mid' => $matchId]);

    $wins = 0;
    $loss = 0;

    foreach ($stmt->fetchAll() as $row) {
        $r = strtolower($row['result'] ?? '');
        if ($r === 'win')  $wins += (int)$row['cnt'];
        if ($r === 'lose') $loss += (int)$row['cnt'];
        // draw tidak menambah wins maupun loss
    }

    $our  = $wins;
    $opp  = $loss;
    $res  = 'draw';
    if ($our > $opp)      $res = 'win';
    elseif ($our < $opp)  $res = 'lose';

    $upd = $pdo->prepare('
        UPDATE matches
        SET our_score = :our, opponent_score = :opp, result = :res
        WHERE id = :id
    ');
    $upd->execute([
        ':our' => $our,
        ':opp' => $opp,
        ':res' => $res,
        ':id'  => $matchId,
    ]);
}

try {
    $pdo->beginTransaction();

    // ── Auto game_number ──────────────────────────────────────────────────
    $countStmt = $pdo->prepare('SELECT COUNT(*) FROM games WHERE match_id = :match_id');
    $countStmt->execute([':match_id' => $matchId]);
    $gameNumber = (int)$countStmt->fetchColumn() + 1;

    // ── Validasi batas BO dari matches.format ─────────────────────────────
    $fmtStmt = $pdo->prepare('SELECT format FROM matches WHERE id = :id');
    $fmtStmt->execute([':id' => $matchId]);
    $fmt = $fmtStmt->fetchColumn();
    if ($fmt) {
        $maxGames = (int)filter_var($fmt, FILTER_SANITIZE_NUMBER_INT);
        if ($maxGames > 0 && $gameNumber > $maxGames) {
            $pdo->rollBack();
            http_response_code(422);
            echo json_encode([
                'ok'      => false,
                'message' => "Batas maksimal game untuk format {$fmt} sudah tercapai ({$maxGames} game)",
            ]);
            exit;
        }
    }

    // ── Insert games ──────────────────────────────────────────────────────
    $stmt = $pdo->prepare('
        INSERT INTO games
            (match_id, game_number, result, team_kills, team_deaths, duration_minutes, duration_seconds)
        VALUES
            (:match_id, :game_number, :result, :team_kills, :team_deaths, :duration_minutes, :duration_seconds)
    ');
    $stmt->execute([
        ':match_id'         => $matchId,
        ':game_number'      => $gameNumber,
        ':result'           => $gameInfo['result'],
        ':team_kills'       => $gameInfo['teamKills'],
        ':team_deaths'      => $gameInfo['teamDeaths'],
        ':duration_minutes' => $gameInfo['durationMinutes'],
        ':duration_seconds' => $gameInfo['durationSeconds'],
    ]);
    $gameId = (int)$pdo->lastInsertId();

    // ── Ambil primary_role dari tabel players (batch) ─────────────────────
    // player_role di game_players diisi otomatis dari players.primary_role
    // sehingga tidak perlu input manual dari form.
    $playerIds = array_filter(array_map(fn($p) => (int)($p['playerId'] ?? 0), $playerStats));
    $roleMap   = [];
    if (!empty($playerIds)) {
        $inClause  = implode(',', array_fill(0, count($playerIds), '?'));
        $roleStmt  = $pdo->prepare("SELECT id, primary_role FROM players WHERE id IN ($inClause)");
        $roleStmt->execute(array_values($playerIds));
        foreach ($roleStmt->fetchAll() as $row) {
            $roleMap[(int)$row['id']] = $row['primary_role'] ?? '';
        }
    }

    // ── Insert game_players ───────────────────────────────────────────────
    $playerStmt = $pdo->prepare('
        INSERT INTO game_players
            (game_id, player_id, player_role, hero_id, hero_name, kills, deaths, assists, kda, total_gold)
        VALUES
            (:game_id, :player_id, :player_role, :hero_id, :hero_name, :kills, :deaths, :assists, :kda, :total_gold)
    ');

    foreach ($playerStats as $player) {
        $playerId  = (int)($player['playerId']  ?? 0);
        $heroName  = trim($player['heroName']   ?? '');
        $kills     = (int)($player['kills']     ?? 0);
        $deaths    = (int)($player['deaths']    ?? 0);
        $assists   = (int)($player['assists']   ?? 0);
        $kda       = round((float)($player['kda'] ?? (($kills + $assists) / max($deaths, 1))), 2);
        $totalGold = (int)($player['totalGold'] ?? 0);

        $heroId = null;
        if ($heroName !== '') {
            $stmtHero = $pdo->prepare('SELECT id FROM mlbb_heroes WHERE name = :name LIMIT 1');
            $stmtHero->execute([':name' => $heroName]);
            $heroId = $stmtHero->fetchColumn();
        }

        if ($playerId <= 0) {
            $pdo->rollBack();
            http_response_code(422);
            echo json_encode(['ok' => false, 'message' => "player_id tidak valid (index game_players)"]);
            exit;
        }

        // Auto-fill player_role dari players.primary_role
        // Fallback: jika payload mengirim roleName, pakai itu; prioritas DB.
        $playerRole = $roleMap[$playerId] ?? trim($player['roleName'] ?? '');

        $playerStmt->execute([
            ':game_id'     => $gameId,
            ':player_id'   => $playerId,
            ':player_role' => $playerRole,
            ':hero_id'     => $heroId,
            ':hero_name'   => $heroName,
            ':kills'       => $kills,
            ':deaths'      => $deaths,
            ':assists'     => $assists,
            ':kda'         => $kda,
            ':total_gold'  => $totalGold,
        ]);
    }

    recompute_match_score($pdo, $matchId);

    $pdo->commit();
    echo json_encode(['ok' => true, 'gameId' => $gameId, 'gameNumber' => $gameNumber]);

} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Gagal menyimpan game: ' . $e->getMessage()]);
}
