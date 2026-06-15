<?php
header('Content-Type: application/json');

require __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

function normalizeType(?string $type): string {
    $t = strtolower(trim($type ?? ''));
    if ($t === 'tournament' || $t === 'league') {
        return $t;
    }
    return '';
}

if ($method === 'GET' && $action === 'list') {
    try {
        $stmt = $pdo->query('
            SELECT
              id,
              type,
              name,
              registration_fee,
              prizepool,
              final_rank,
              status,
              team_count,
              phase_count,
              phase_format1,
              phase_format2,
              phase_format3,
              phase_format4,
              phase_status1,
              phase_status2,
              phase_status3,
              phase_status4,
              phase_bracket1,
              phase_bracket2,
              phase_bracket3,
              phase_bracket4
            FROM competitions
            ORDER BY created_at DESC, id DESC
        ');
        $competitions = $stmt->fetchAll();

        echo json_encode([
            'ok' => true,
            'competitions' => $competitions,
        ]);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'message' => 'Gagal mengambil data kompetisi']);
    }
    exit;
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true) ?? [];

    $action = $data['action'] ?? $action;

    if ($action === 'add') {
        $type = normalizeType($data['type'] ?? '');
        $name = trim($data['name'] ?? '');
        $registrationFee = isset($data['registration_fee']) ? (int) $data['registration_fee'] : 0;
        $prizepool = isset($data['prizepool']) ? (int) $data['prizepool'] : 0;
        $finalRank = $data['final_rank'] ?? null;
        $status = $data['status'] ?? null;
        $teamCount = isset($data['team_count']) ? (int) $data['team_count'] : 0;
        $phaseCount = isset($data['phase_count']) ? (int) $data['phase_count'] : 1;

        if ($type === '' || $name === '') {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'Tipe dan nama kompetisi wajib diisi']);
            exit;
        }

        if ($teamCount <= 0) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'Jumlah tim tidak valid']);
            exit;
        }

        if ($phaseCount < 1 || $phaseCount > 4) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'message' => 'Jumlah fase harus antara 1 sampai 4']);
            exit;
        }

        // Ambil format/status/link per fase, jika tidak ada biarkan null
        $phaseFormat1 = $data['phase_format1'] ?? null;
        $phaseFormat2 = $data['phase_format2'] ?? null;
        $phaseFormat3 = $data['phase_format3'] ?? null;
        $phaseFormat4 = $data['phase_format4'] ?? null;

        $phaseStatus1 = $data['phase_status1'] ?? null;
        $phaseStatus2 = $data['phase_status2'] ?? null;
        $phaseStatus3 = $data['phase_status3'] ?? null;
        $phaseStatus4 = $data['phase_status4'] ?? null;

        $phaseBracket1 = $data['phase_bracket1'] ?? null;
        $phaseBracket2 = $data['phase_bracket2'] ?? null;
        $phaseBracket3 = $data['phase_bracket3'] ?? null;
        $phaseBracket4 = $data['phase_bracket4'] ?? null;

        // Opsional: validasi basic untuk format/status per fase (kalau mau lebih ketat)
        // Misalnya: jika phaseCount >= 1, maka phase_format1 tidak boleh kosong, dll.

        try {
            $stmt = $pdo->prepare('
                INSERT INTO competitions (
                  type,
                  name,
                  registration_fee,
                  prizepool,
                  final_rank,
                  status,
                  team_count,
                  phase_count,
                  phase_format1,
                  phase_format2,
                  phase_format3,
                  phase_format4,
                  phase_status1,
                  phase_status2,
                  phase_status3,
                  phase_status4,
                  phase_bracket1,
                  phase_bracket2,
                  phase_bracket3,
                  phase_bracket4
                )
                VALUES (
                  :type,
                  :name,
                  :registration_fee,
                  :prizepool,
                  :final_rank,
                  :status,
                  :team_count,
                  :phase_count,
                  :phase_format1,
                  :phase_format2,
                  :phase_format3,
                  :phase_format4,
                  :phase_status1,
                  :phase_status2,
                  :phase_status3,
                  :phase_status4,
                  :phase_bracket1,
                  :phase_bracket2,
                  :phase_bracket3,
                  :phase_bracket4
                )
            ');

            $stmt->execute([
                ':type'           => $type,
                ':name'           => $name,
                ':registration_fee' => $registrationFee,
                ':prizepool'      => $prizepool,
                ':final_rank'     => $finalRank,
                ':status'         => $status,
                ':team_count'     => $teamCount,
                ':phase_count'    => $phaseCount,
                ':phase_format1'  => $phaseFormat1,
                ':phase_format2'  => $phaseFormat2,
                ':phase_format3'  => $phaseFormat3,
                ':phase_format4'  => $phaseFormat4,
                ':phase_status1'  => $phaseStatus1,
                ':phase_status2'  => $phaseStatus2,
                ':phase_status3'  => $phaseStatus3,
                ':phase_status4'  => $phaseStatus4,
                ':phase_bracket1' => $phaseBracket1,
                ':phase_bracket2' => $phaseBracket2,
                ':phase_bracket3' => $phaseBracket3,
                ':phase_bracket4' => $phaseBracket4,
            ]);

            $id = (int) $pdo->lastInsertId();

            echo json_encode([
                'ok' => true,
                'competition' => [
                    'id'              => $id,
                    'type'            => $type,
                    'name'            => $name,
                    'registration_fee'=> $registrationFee,
                    'prizepool'       => $prizepool,
                    'final_rank'      => $finalRank,
                    'status'          => $status,
                    'team_count'      => $teamCount,
                    'phase_count'     => $phaseCount,
                    'phase_format1'   => $phaseFormat1,
                    'phase_format2'   => $phaseFormat2,
                    'phase_format3'   => $phaseFormat3,
                    'phase_format4'   => $phaseFormat4,
                    'phase_status1'   => $phaseStatus1,
                    'phase_status2'   => $phaseStatus2,
                    'phase_status3'   => $phaseStatus3,
                    'phase_status4'   => $phaseStatus4,
                    'phase_bracket1'  => $phaseBracket1,
                    'phase_bracket2'  => $phaseBracket2,
                    'phase_bracket3'  => $phaseBracket3,
                    'phase_bracket4'  => $phaseBracket4,
                ],
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'message' => 'Gagal menyimpan kompetisi']);
        }
        exit;
    }
}

case 'get':
  $id = intval($_GET['id'] ?? 0);
  $row = $pdo->prepare("SELECT * FROM competitions WHERE id = ?");
  $row->execute([$id]);
  $competition = $row->fetch(PDO::FETCH_ASSOC);
  if (!$competition) {
    echo json_encode(['ok' => false, 'message' => 'Not found']);
    exit;
  }
  echo json_encode(['ok' => true, 'competition' => $competition]);
  break;

case 'update':
  // mirip 'add', tapi pakai UPDATE ... WHERE id = ?
  $id = intval($body['id'] ?? 0);
  $stmt = $pdo->prepare("UPDATE competitions SET
    name=?, type=?, registration_fee=?, prizepool=?, final_rank=?, status=?,
    team_count=?, phase_count=?,
    phase_format1=?, phase_format2=?, phase_format3=?, phase_format4=?,
    phase_status1=?, phase_status2=?, phase_status3=?, phase_status4=?,
    phase_bracket1=?, phase_bracket2=?, phase_bracket3=?, phase_bracket4=?
    WHERE id=?");
  $stmt->execute([/* binding */..., $id]);
  echo json_encode(['ok' => true]);
  break;

http_response_code(400);
echo json_encode(['ok' => false, 'message' => 'Action tidak dikenal']);