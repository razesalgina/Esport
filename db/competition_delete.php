<?php
/**
 * db/competition_delete.php
 *
 * POST body (JSON):
 *   { "id": 5, "mode": "cascade" }
 *       → Hapus competition + semua match miliknya + semua game dalam match-match tersebut
 *
 *   { "id": 5, "mode": "detach" }
 *       → Lepas relasi (matches.competition_id = NULL), lalu hapus competition.
 *         Data match & game tetap tersimpan.
 *
 * Response JSON:
 *   { "ok": true }
 *   { "ok": false, "message": "..." }
 */
header('Content-Type: application/json');
require __DIR__ . '/db.php';

// ── Guard method ────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
    exit;
}

// ── Parse body ──────────────────────────────────────────────────────
$data = json_decode(file_get_contents('php://input'), true) ?? [];
$id   = (int)($data['id']   ?? 0);
$mode = trim($data['mode']  ?? 'cascade');

// ── Validasi input ──────────────────────────────────────────────────
if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'ID kompetisi tidak valid']);
    exit;
}

if (!in_array($mode, ['cascade', 'detach'], true)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Mode hapus tidak valid. Gunakan cascade atau detach.']);
    exit;
}

// ── Eksekusi dalam transaksi ─────────────────────────────────────────
try {
    $pdo->beginTransaction();

    if ($mode === 'cascade') {
        // 1. Ambil semua match_id yang terkait kompetisi ini
        $matchStmt = $pdo->prepare('SELECT id FROM matches WHERE competition_id = :cid');
        $matchStmt->execute([':cid' => $id]);
        $matchIds  = $matchStmt->fetchAll(PDO::FETCH_COLUMN);

        // 2. Hapus semua games dari match-match tersebut
        if (!empty($matchIds)) {
            $placeholders = implode(',', array_fill(0, count($matchIds), '?'));
            $pdo->prepare("DELETE FROM games WHERE match_id IN ($placeholders)")
                ->execute($matchIds);
        }

        // 3. Hapus semua matches milik kompetisi
        $pdo->prepare('DELETE FROM matches WHERE competition_id = :cid')
            ->execute([':cid' => $id]);

    } else {
        // detach: lepas relasi match ↔ competition; data match & game tetap
        $pdo->prepare('UPDATE matches SET competition_id = NULL WHERE competition_id = :cid')
            ->execute([':cid' => $id]);
    }

    // 4. Hapus record competition
    $stmt = $pdo->prepare('DELETE FROM competitions WHERE id = :id');
    $stmt->execute([':id' => $id]);

    if ($stmt->rowCount() === 0) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['ok' => false, 'message' => 'Kompetisi tidak ditemukan']);
        exit;
    }

    $pdo->commit();
    echo json_encode(['ok' => true]);

} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Gagal menghapus kompetisi: ' . $e->getMessage()]);
}
