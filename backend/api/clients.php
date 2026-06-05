<?php
// =============================================
// GET    /api/clients.php?company_id=...           목록
// GET    /api/clients.php?company_id=...&id=...    단건
// POST   /api/clients.php                          신규
// PUT    /api/clients.php                          수정
// DELETE /api/clients.php?id=...&company_id=...   삭제
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
    CREATE TABLE IF NOT EXISTS `clients` (
      `id`            INT          NOT NULL AUTO_INCREMENT,
      `company_id`    VARCHAR(50)  NOT NULL                 COMMENT '회사아이디(히든)',
      `client_code`   VARCHAR(10)  NOT NULL                 COMMENT '업체코드',
      `company_name`  VARCHAR(100) NOT NULL DEFAULT ''      COMMENT '업체명',
      `biz_no`        VARCHAR(20)  DEFAULT NULL             COMMENT '사업자번호',
      `tel`           VARCHAR(30)  DEFAULT NULL             COMMENT '대표연락처',
      `ceo`           VARCHAR(50)  DEFAULT NULL             COMMENT '대표자명',
      `manager_name`  VARCHAR(50)  DEFAULT NULL             COMMENT '담당자 이름',
      `manager_tel`   VARCHAR(30)  DEFAULT NULL             COMMENT '담당자 연락처',
      `manager_email` VARCHAR(100) DEFAULT NULL             COMMENT '담당자 메일',
      `address`       VARCHAR(255) DEFAULT NULL             COMMENT '주소',
      `memo`          TEXT         DEFAULT NULL             COMMENT '메모',
      `created_at`    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      UNIQUE KEY `uq_company_code` (`company_id`, `client_code`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");

$pdo->exec("
    CREATE TABLE IF NOT EXISTS `client_categories` (
      `id`          INT          NOT NULL AUTO_INCREMENT,
      `client_code` VARCHAR(10)  NOT NULL                    COMMENT '업체코드',
      `company_id`  VARCHAR(50)  NOT NULL                    COMMENT '회사아이디',
      `name`        VARCHAR(100) NOT NULL                    COMMENT '기사분류기준명',
      `created_at`  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      KEY `idx_client_code` (`company_id`, `client_code`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");

$method = $_SERVER['REQUEST_METHOD'];

// ── GET ──────────────────────────────────────────────────
if ($method === 'GET') {
    $company_id = trim($_GET['company_id'] ?? '');
    $id         = (int)($_GET['id'] ?? 0);

    if ($company_id === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'company_id 필요']);
        exit;
    }

    if ($id > 0) {
        // 단건 조회 (수정 화면용)
        $stmt = $pdo->prepare('SELECT * FROM `clients` WHERE `id` = ? AND `company_id` = ? LIMIT 1');
        $stmt->execute([$id, $company_id]);
        $row = $stmt->fetch();
        if (!$row) { http_response_code(404); echo json_encode(['success' => false, 'message' => '없음']); exit; }

        $cat = $pdo->prepare('SELECT `id`, `name` FROM `client_categories` WHERE `client_code` = ? AND `company_id` = ? ORDER BY `id`');
        $cat->execute([$row['client_code'], $company_id]);
        $row['categories'] = $cat->fetchAll();

        echo json_encode(['success' => true, 'data' => $row]);
    } else {
        // 목록
        $stmt = $pdo->prepare('SELECT `id`,`client_code`,`company_name`,`biz_no`,`tel`,`ceo`,`manager_name`,`manager_tel`,`manager_email` FROM `clients` WHERE `company_id` = ? ORDER BY `client_code` ASC');
        $stmt->execute([$company_id]);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    }
    exit;
}

// ── POST: 신규 ───────────────────────────────────────────
if ($method === 'POST') {
    $body       = json_decode(file_get_contents('php://input'), true);
    $company_id = trim($body['company_id']    ?? '');

    if ($company_id === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'company_id 필요']);
        exit;
    }

    // 업체코드 자동 채번
    $maxStmt = $pdo->prepare('SELECT MAX(CAST(`client_code` AS UNSIGNED)) FROM `clients` WHERE `company_id` = ?');
    $maxStmt->execute([$company_id]);
    $maxCode = (int)$maxStmt->fetchColumn();
    $clientCode = str_pad($maxCode + 1, 4, '0', STR_PAD_LEFT);

    $stmt = $pdo->prepare('
        INSERT INTO `clients`
            (`company_id`,`client_code`,`company_name`,`biz_no`,`tel`,`ceo`,`manager_name`,`manager_tel`,`manager_email`,`address`,`memo`)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
    ');
    $stmt->execute([
        $company_id,
        $clientCode,
        trim($body['company_name']  ?? ''),
        trim($body['biz_no']        ?? ''),
        trim($body['tel']           ?? ''),
        trim($body['ceo']           ?? ''),
        trim($body['manager_name']  ?? ''),
        trim($body['manager_tel']   ?? ''),
        trim($body['manager_email'] ?? ''),
        trim($body['address']       ?? ''),
        trim($body['memo']          ?? ''),
    ]);
    $clientId = (int)$pdo->lastInsertId();

    // 기사분류기준 저장
    $categories = $body['categories'] ?? [];
    if (!empty($categories)) {
        $catStmt = $pdo->prepare('INSERT INTO `client_categories` (`client_code`,`company_id`,`name`) VALUES (?,?,?)');
        foreach ($categories as $cat) {
            $name = trim($cat['name'] ?? '');
            if ($name !== '') $catStmt->execute([$clientCode, $company_id, $name]);
        }
    }

    echo json_encode(['success' => true, 'id' => $clientId, 'client_code' => $clientCode]);
    exit;
}

// ── PUT: 수정 ────────────────────────────────────────────
if ($method === 'PUT') {
    $body       = json_decode(file_get_contents('php://input'), true);
    $id         = (int)($body['id']          ?? 0);
    $company_id = trim($body['company_id']   ?? '');

    if ($id === 0 || $company_id === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '필수 파라미터 누락']);
        exit;
    }

    $stmt = $pdo->prepare('
        UPDATE `clients` SET
            `company_name`  = ?,
            `biz_no`        = ?,
            `tel`           = ?,
            `ceo`           = ?,
            `manager_name`  = ?,
            `manager_tel`   = ?,
            `manager_email` = ?,
            `address`       = ?,
            `memo`          = ?
        WHERE `id` = ? AND `company_id` = ?
    ');
    $stmt->execute([
        trim($body['company_name']  ?? ''),
        trim($body['biz_no']        ?? ''),
        trim($body['tel']           ?? ''),
        trim($body['ceo']           ?? ''),
        trim($body['manager_name']  ?? ''),
        trim($body['manager_tel']   ?? ''),
        trim($body['manager_email'] ?? ''),
        trim($body['address']       ?? ''),
        trim($body['memo']          ?? ''),
        $id,
        $company_id,
    ]);

    // 기사분류기준 전체 교체
    // client_code 조회
    $codeStmt = $pdo->prepare('SELECT `client_code` FROM `clients` WHERE `id` = ? AND `company_id` = ? LIMIT 1');
    $codeStmt->execute([$id, $company_id]);
    $clientCode = $codeStmt->fetchColumn();

    $pdo->prepare('DELETE FROM `client_categories` WHERE `client_code` = ? AND `company_id` = ?')->execute([$clientCode, $company_id]);
    $categories = $body['categories'] ?? [];
    if (!empty($categories)) {
        $catStmt = $pdo->prepare('INSERT INTO `client_categories` (`client_code`,`company_id`,`name`) VALUES (?,?,?)');
        foreach ($categories as $cat) {
            $name = trim($cat['name'] ?? '');
            if ($name !== '') $catStmt->execute([$clientCode, $company_id, $name]);
        }
    }

    echo json_encode(['success' => true]);
    exit;
}

// ── DELETE ───────────────────────────────────────────────
if ($method === 'DELETE') {
    $id         = (int)($_GET['id']          ?? 0);
    $company_id = trim($_GET['company_id']   ?? '');

    if ($id === 0 || $company_id === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '파라미터 누락']);
        exit;
    }

    // client_code 조회 후 categories 삭제
    $codeStmt = $pdo->prepare('SELECT `client_code` FROM `clients` WHERE `id` = ? AND `company_id` = ? LIMIT 1');
    $codeStmt->execute([$id, $company_id]);
    $clientCode = $codeStmt->fetchColumn();
    if ($clientCode) {
        $pdo->prepare('DELETE FROM `client_categories` WHERE `client_code` = ? AND `company_id` = ?')->execute([$clientCode, $company_id]);
    }
    $pdo->prepare('DELETE FROM `clients` WHERE `id` = ? AND `company_id` = ?')->execute([$id, $company_id]);

    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
