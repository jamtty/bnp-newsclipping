<?php
// =============================================
// GET    /api/media.php?company_id=...          목록
// GET    /api/media.php?company_id=...&id=...   단건
// POST   /api/media.php                         신규
// PUT    /api/media.php                         수정
// DELETE /api/media.php?id=...&company_id=...  삭제
// =============================================

ob_start();
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');

$allowed = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'https://newsclipping.mycafe24.com',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once dirname(__DIR__) . '/config.php';

// 테이블 자동 생성
$pdo->exec("
    CREATE TABLE IF NOT EXISTS `media` (
      `id`          INT          NOT NULL AUTO_INCREMENT,
      `company_id`  VARCHAR(50)  NOT NULL                COMMENT '회사아이디(히든)',
      `media_code`  VARCHAR(10)  NOT NULL                COMMENT '뉴스매체 ID(자동채번)',
      `media_name`  VARCHAR(100) NOT NULL DEFAULT ''     COMMENT '매체명',
      `region`      VARCHAR(50)  DEFAULT NULL            COMMENT '지역',
      `tel`         VARCHAR(30)  DEFAULT NULL            COMMENT '대표전화',
      `address`     VARCHAR(255) DEFAULT NULL            COMMENT '주소',
      `created_at`  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      UNIQUE KEY `uq_company_media` (`company_id`, `media_code`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");

$pdo->exec("
    CREATE TABLE IF NOT EXISTS `media_journalists` (
      `id`          INT          NOT NULL AUTO_INCREMENT,
      `media_code`  VARCHAR(10)  NOT NULL                COMMENT '뉴스매체 ID',
      `company_id`  VARCHAR(50)  NOT NULL                COMMENT '회사아이디',
      `name`        VARCHAR(50)  NOT NULL                COMMENT '기자명',
      `tel`         VARCHAR(30)  DEFAULT NULL            COMMENT '연락처',
      `email`       VARCHAR(100) DEFAULT NULL            COMMENT '메일주소',
      `memo`        TEXT         DEFAULT NULL            COMMENT '비고',
      `created_at`  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      KEY `idx_media_code` (`company_id`, `media_code`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");

$method = $_SERVER['REQUEST_METHOD'];

// ── GET ──────────────────────────────────────────────────
if ($method === 'GET') {
    $company_id = trim($_GET['company_id'] ?? '');
    $id         = (int)($_GET['id'] ?? 0);
    $by_code    = isset($_GET['by_code']) && $_GET['by_code'] === '1';

    // media_code 기준 기자 목록 조회 (뉴스등록 폼용)
    if ($by_code && $_GET['id'] !== '' && $company_id !== '') {
        $media_code = trim($_GET['id']);
        $mStmt = $pdo->prepare('SELECT `id`,`media_name` FROM `media` WHERE `media_code` = ? AND `company_id` = ? LIMIT 1');
        $mStmt->execute([$media_code, $company_id]);
        $mRow = $mStmt->fetch();
        $jStmt = $pdo->prepare('SELECT `id`,`name` FROM `media_journalists` WHERE `media_code` = ? AND `company_id` = ? ORDER BY `id`');
        $jStmt->execute([$media_code, $company_id]);
        echo json_encode(['success' => true, 'data' => [
            'id' => $mRow ? (int)$mRow['id'] : null,
            'media_name' => $mRow ? $mRow['media_name'] : '',
            'journalists' => $jStmt->fetchAll(),
        ]]);
        exit;
    }

    if ($id > 0) {
        if ($company_id !== '') {
            $stmt = $pdo->prepare('SELECT * FROM `media` WHERE `id` = ? AND `company_id` = ? LIMIT 1');
            $stmt->execute([$id, $company_id]);
        } else {
            $stmt = $pdo->prepare('SELECT * FROM `media` WHERE `id` = ? LIMIT 1');
            $stmt->execute([$id]);
        }
        $row = $stmt->fetch();
        if (!$row) { http_response_code(404); echo json_encode(['success' => false, 'message' => '없음']); exit; }

        $jStmt = $pdo->prepare('SELECT `id`,`name`,`tel`,`email`,`memo` FROM `media_journalists` WHERE `media_code` = ? AND `company_id` = ? ORDER BY `id`');
        $jStmt->execute([$row['media_code'], $row['company_id']]);
        $row['journalists'] = $jStmt->fetchAll();

        echo json_encode(['success' => true, 'data' => $row]);
        exit;
    }

    if ($company_id === '') {
        $stmt = $pdo->query('
            SELECT m.`id`,m.`media_code`,m.`media_name`,m.`region`,m.`tel`,m.`company_id`,
                   u.`company_name` AS `admin_company_name`
            FROM `media` m
            LEFT JOIN `users` u ON u.`company_id` = m.`company_id`
            ORDER BY m.`media_code` ASC
        ');
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        exit;
    }

    $stmt = $pdo->prepare('
        SELECT m.`id`,m.`media_code`,m.`media_name`,m.`region`,m.`tel`,m.`company_id`,
               u.`company_name` AS `admin_company_name`
        FROM `media` m
        LEFT JOIN `users` u ON u.`company_id` = m.`company_id`
        WHERE m.`company_id` = ?
        ORDER BY m.`media_code` ASC
    ');
    $stmt->execute([$company_id]);
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    exit;
}

// ── POST: 신규 ───────────────────────────────────────────
if ($method === 'POST') {
    $body       = json_decode(file_get_contents('php://input'), true);
    $company_id = trim($body['company_id'] ?? '');

    if ($company_id === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'company_id 필요']);
        exit;
    }
    if (trim($body['media_name'] ?? '') === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '매체명을 입력하세요']);
        exit;
    }

    // 매체코드 자동 채번
    $maxStmt = $pdo->prepare('SELECT MAX(CAST(`media_code` AS UNSIGNED)) FROM `media` WHERE `company_id` = ?');
    $maxStmt->execute([$company_id]);
    $mediaCode = str_pad((int)$maxStmt->fetchColumn() + 1, 4, '0', STR_PAD_LEFT);

    $stmt = $pdo->prepare('
        INSERT INTO `media` (`company_id`,`media_code`,`media_name`,`region`,`tel`,`address`)
        VALUES (?,?,?,?,?,?)
    ');
    $stmt->execute([
        $company_id,
        $mediaCode,
        trim($body['media_name'] ?? ''),
        trim($body['region']     ?? ''),
        trim($body['tel']        ?? ''),
        trim($body['address']    ?? ''),
    ]);
    $mediaId = (int)$pdo->lastInsertId();

    // 소속기자 저장
    $journalists = $body['journalists'] ?? [];
    if (!empty($journalists)) {
        $jStmt = $pdo->prepare('INSERT INTO `media_journalists` (`media_code`,`company_id`,`name`,`tel`,`email`,`memo`) VALUES (?,?,?,?,?,?)');
        foreach ($journalists as $j) {
            $name = trim($j['name'] ?? '');
            if ($name !== '') $jStmt->execute([$mediaCode, $company_id, $name, trim($j['tel'] ?? ''), trim($j['email'] ?? ''), trim($j['memo'] ?? '')]);
        }
    }

    echo json_encode(['success' => true, 'id' => $mediaId, 'media_code' => $mediaCode]);
    exit;
}

// ── PUT: 수정 ────────────────────────────────────────────
if ($method === 'PUT') {
    $body       = json_decode(file_get_contents('php://input'), true);
    $id         = (int)($body['id']         ?? 0);
    $company_id = trim($body['company_id']  ?? '');

    if ($id === 0 || $company_id === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '필수 파라미터 누락']);
        exit;
    }

    $stmt = $pdo->prepare('
        UPDATE `media` SET `media_name`=?,`region`=?,`tel`=?,`address`=?
        WHERE `id` = ? AND `company_id` = ?
    ');
    $stmt->execute([
        trim($body['media_name'] ?? ''),
        trim($body['region']     ?? ''),
        trim($body['tel']        ?? ''),
        trim($body['address']    ?? ''),
        $id,
        $company_id,
    ]);

    // media_code 조회 후 소속기자 전체 교체
    $codeStmt = $pdo->prepare('SELECT `media_code` FROM `media` WHERE `id` = ? AND `company_id` = ? LIMIT 1');
    $codeStmt->execute([$id, $company_id]);
    $mediaCode = $codeStmt->fetchColumn();

    $pdo->prepare('DELETE FROM `media_journalists` WHERE `media_code` = ? AND `company_id` = ?')->execute([$mediaCode, $company_id]);
    $journalists = $body['journalists'] ?? [];
    if (!empty($journalists)) {
        $jStmt = $pdo->prepare('INSERT INTO `media_journalists` (`media_code`,`company_id`,`name`,`tel`,`email`,`memo`) VALUES (?,?,?,?,?,?)');
        foreach ($journalists as $j) {
            $name = trim($j['name'] ?? '');
            if ($name !== '') $jStmt->execute([$mediaCode, $company_id, $name, trim($j['tel'] ?? ''), trim($j['email'] ?? ''), trim($j['memo'] ?? '')]);
        }
    }

    echo json_encode(['success' => true]);
    exit;
}

// ── DELETE ───────────────────────────────────────────────
if ($method === 'DELETE') {
    $id         = (int)($_GET['id']         ?? 0);
    $company_id = trim($_GET['company_id']  ?? '');

    if ($id === 0 || $company_id === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '파라미터 누락']);
        exit;
    }

    $codeStmt = $pdo->prepare('SELECT `media_code` FROM `media` WHERE `id` = ? AND `company_id` = ? LIMIT 1');
    $codeStmt->execute([$id, $company_id]);
    $mediaCode = $codeStmt->fetchColumn();
    if ($mediaCode) {
        $pdo->prepare('DELETE FROM `media_journalists` WHERE `media_code` = ? AND `company_id` = ?')->execute([$mediaCode, $company_id]);
    }
    $pdo->prepare('DELETE FROM `media` WHERE `id` = ? AND `company_id` = ?')->execute([$id, $company_id]);

    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
