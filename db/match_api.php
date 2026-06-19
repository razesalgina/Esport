<?php
header('Content-Type: application/json');

require __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// ──────────────────────────────────────────
function determineStatus(string $date, string $time): string {
    $dt = strtotime($date . ' ' . ($time ?: '00:00:00'));
    if ($dt === false) return 'upcoming';
    return $dt <= time() ? 'finished' : 'upcoming';
}

function determineResult(int $our, int $opp): string {
    if ($our > $opp)  return 'win';
    if ($our < $opp)  return 'lose';
    return 'draw';
}

/**
 * Kembalikan default format berdasarkan type match.
 * Ranked → BO1, semua lainnya → BO3
 */
function defaultFormat(string $type): string {
    return $type === 'ranked' ? 'BO1' : 'BO3';
}

// ── GET list ────────────────────────────────
if ($method === 'GET' && $action === 'list') {
    try {
        $stmt = $pdo->query(
            'SELECT id, competition_id, type, format, opponent_name,
                    our_score, opponent_score, result,
                    match_date, match_time, status, created_at
             FROM matches
             ORDER BY match_date DESC, match_time DESC, id DESC'
        );
        echo json_encode(['ok' => true, 'matches' => $stmt->fetchAll()]);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'message' => 'Gagal mengambil data match']);
    }
    exit;
}

// ── GET single ─────────────────────────────
if ($method === 'GET' && $action === 'get') {
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'message' => 'ID tidak valid']);
        exit;
    }
    try {
        $stmt = $pdo->prepare(
            'SELECT id, competition_id, type, format, opponent_name,
                    our_score, opponent_score, result,
                    match_date, match_time, status, created_at
             FROM matches WHERE id = :id'
        );
        $stmt->execute([':id' => $id]);
        $match = $stmt->fetch();
        if (!$match) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'message' => 'Match tidak ditemukan']);
            exit;
        }
        echo json_encode(['ok' => true, 'match' => $match]);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'message' => 'Gagal mengambil data match']);
    }
    exit;
}

// ── POST: add | update | delete ───────────────
if ($method === 'POST') {
    $data   = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $data['action'] ?? $action;

    $validTypes    = ['tournament', 'league', 'scrim', 'ranked'];
    $validStatuses = ['upcoming', 'finished', 'cancel'];

    // ─── DELETE ──────────────────────────────────────────────────────
    /**
     * mode 'cascade' → hapus match + semua games miliknya
     * mode 'detach'  → lepas relasi games (games.match_id = NULL), lalu hapus match
     *
     * Validasi mode diperketat: hanya 'cascade' atau 'detach' yang diterima.
     */
    if ($action === 'delete') {
        $id   = (int)($data['id']   ?? 0);
        $mode = trim($data['mode']  ?? 'cascade');

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'ID match tidak valid']);
            exit;
        }

        if (!in_array($mode, ['cascade', 'detach'], true)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'Mode hapus tidak valid. Gunakan cascade atau detach.']);
            exit;
        }

        try {
            $pdo->beginTransaction();

            if ($mode === 'cascade') {
                // Hapus semua games milik match ini secara permanen
                $pdo->prepare('DELETE FROM games WHERE match_id = :mid')
                    ->execute([':mid' => $id]);
            } else {
                // Detach: lepas relasi game ↔ match, data game tetap ada
                $pdo->prepare('UPDATE games SET match_id = NULL WHERE match_id = :mid')
                    ->execute([':mid' => $id]);
            }

            // Hapus match
            $stmt = $pdo->prepare('DELETE FROM matches WHERE id = :id');
            $stmt->execute([':id' => $id]);

            if ($stmt->rowCount() === 0) {
                $pdo->rollBack();
                http_response_code(404);
                echo json_encode(['ok' => false, 'message' => 'Match tidak ditemukan']);
                exit;
            }

            $pdo->commit();
            echo json_encode(['ok' => true]);

        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['ok' => false, 'message' => 'Gagal menghapus match: ' . $e->getMessage()]);
        }
        exit;
    }

    // ─── ADD ────────────────────────────────────
    if ($action === 'add') {
        $type          = strtolower(trim($data['type'] ?? ''));
        // Jika format tidak dikirim atau kosong, gunakan default sesuai type
        $rawFormat     = strtoupper(trim($data['format'] ?? ''));
        $format        = $rawFormat !== '' ? $rawFormat : defaultFormat($type);
        $opponentName  = trim($data['opponent_name'] ?? '') ?: null;
        $matchDate     = trim($data['match_date'] ?? '');
        $matchTime     = trim($data['match_time'] ?? '');
        $competitionId = isset($data['competition_id']) && $data['competition_id'] ? (int)$data['competition_id'] : null;
        $ourScore      = (int)($data['our_score'] ?? 0);
        $opponentScore = (int)($data['opponent_score'] ?? 0);

        if ($type === '' || !in_array($type, $validTypes, true)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'Type match tidak valid']);
            exit;
        }

        if ($type === 'ranked') {
            if ($matchDate === '') $matchDate = date('Y-m-d');
            $matchTime = '00:00:00';
        } elseif ($type === 'scrim') {
            if (!$opponentName || $matchDate === '') {
                http_response_code(400);
                echo json_encode(['ok' => false, 'message' => 'Lawan dan tanggal wajib diisi untuk Scrim']);
                exit;
            }
            if ($matchTime === '') $matchTime = '00:00:00';
        } elseif ($type === 'tournament' || $type === 'league') {
            if (!$opponentName || $matchDate === '' || $matchTime === '') {
                http_response_code(400);
                echo json_encode(['ok' => false, 'message' => 'Lawan, tanggal, dan jam wajib diisi untuk Tournament/League']);
                exit;
            }
        }

        $status = determineStatus($matchDate, $matchTime);
        $result = determineResult($ourScore, $opponentScore);

        try {
            $stmt = $pdo->prepare('
                INSERT INTO matches
                    (competition_id, type, format, opponent_name, our_score, opponent_score, result, match_date, match_time, status)
                VALUES
                    (:competition_id, :type, :format, :opponent_name, :our_score, :opponent_score, :result, :match_date, :match_time, :status)
            ');
            $stmt->execute([
                ':competition_id' => $competitionId,
                ':type'           => $type,
                ':format'         => $format,
                ':opponent_name'  => $opponentName,
                ':our_score'      => $ourScore,
                ':opponent_score' => $opponentScore,
                ':result'         => $result,
                ':match_date'     => $matchDate,
                ':match_time'     => $matchTime,
                ':status'         => $status,
            ]);
            echo json_encode(['ok' => true, 'match' => [
                'id'             => (int)$pdo->lastInsertId(),
                'competition_id' => $competitionId,
                'type'           => $type,
                'format'         => $format,
                'opponent_name'  => $opponentName,
                'our_score'      => $ourScore,
                'opponent_score' => $opponentScore,
                'result'         => $result,
                'match_date'     => $matchDate,
                'match_time'     => $matchTime,
                'status'         => $status,
            ]]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'message' => 'Gagal menyimpan match']);
        }
        exit;
    }

    // ─── UPDATE ─────────────────────────────────
    if ($action === 'update') {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'ID match tidak valid']);
            exit;
        }

        $type          = strtolower(trim($data['type'] ?? ''));
        $rawFormat     = strtoupper(trim($data['format'] ?? ''));
        $format        = $rawFormat !== '' ? $rawFormat : defaultFormat($type);
        $opponentName  = trim($data['opponent_name'] ?? '') ?: null;
        $matchDate     = trim($data['match_date'] ?? '');
        $matchTime     = trim($data['match_time'] ?? '');
        $competitionId = isset($data['competition_id']) && $data['competition_id'] ? (int)$data['competition_id'] : null;
        $ourScore      = (int)($data['our_score'] ?? 0);
        $opponentScore = (int)($data['opponent_score'] ?? 0);
        $statusManual  = trim($data['status'] ?? '');

        if ($type === '' || !in_array($type, $validTypes, true)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'Type match tidak valid']);
            exit;
        }

        if ($type === 'ranked') {
            if ($matchDate === '') $matchDate = date('Y-m-d');
            $matchTime = '00:00:00';
        } elseif ($type === 'scrim') {
            if (!$opponentName || $matchDate === '') {
                http_response_code(400);
                echo json_encode(['ok' => false, 'message' => 'Lawan dan tanggal wajib diisi untuk Scrim']);
                exit;
            }
            if ($matchTime === '') $matchTime = '00:00:00';
        } elseif ($type === 'tournament' || $type === 'league') {
            if (!$opponentName || $matchDate === '' || $matchTime === '') {
                http_response_code(400);
                echo json_encode(['ok' => false, 'message' => 'Lawan, tanggal, dan jam wajib diisi untuk Tournament/League']);
                exit;
            }
        }

        $status = in_array($statusManual, $validStatuses, true)
            ? $statusManual
            : determineStatus($matchDate, $matchTime);
        $result = determineResult($ourScore, $opponentScore);

        try {
            $stmt = $pdo->prepare('
                UPDATE matches SET
                    competition_id = :competition_id,
                    type           = :type,
                    format         = :format,
                    opponent_name  = :opponent_name,
                    our_score      = :our_score,
                    opponent_score = :opponent_score,
                    result         = :result,
                    match_date     = :match_date,
                    match_time     = :match_time,
                    status         = :status
                WHERE id = :id
            ');
            $stmt->execute([
                ':id'             => $id,
                ':competition_id' => $competitionId,
                ':type'           => $type,
                ':format'         => $format,
                ':opponent_name'  => $opponentName,
                ':our_score'      => $ourScore,
                ':opponent_score' => $opponentScore,
                ':result'         => $result,
                ':match_date'     => $matchDate,
                ':match_time'     => $matchTime,
                ':status'         => $status,
            ]);
            if ($stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(['ok' => false, 'message' => 'Match tidak ditemukan']);
                exit;
            }
            echo json_encode(['ok' => true, 'match' => [
                'id'             => $id,
                'competition_id' => $competitionId,
                'type'           => $type,
                'format'         => $format,
                'opponent_name'  => $opponentName,
                'our_score'      => $ourScore,
                'opponent_score' => $opponentScore,
                'result'         => $result,
                'match_date'     => $matchDate,
                'match_time'     => $matchTime,
                'status'         => $status,
            ]]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'message' => 'Gagal memperbarui match']);
        }
        exit;
    }
}

http_response_code(400);
echo json_encode(['ok' => false, 'message' => 'Action tidak dikenal']);
