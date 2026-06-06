<?php
// =============================================
// GET    /api/managers.php?company_id=...       목록 조회
// POST   /api/managers.php                      신규 등록
// PUT    /api/managers.php                      수정
// DELETE /api/managers.php?id=...&company_id=... 삭제
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

// managers 테이블 자동 생성
$pdo->exec("
    CREATE TABLE IF NOT EXISTS `managers` (
      `id`          INT          NOT NULL AUTO_INCREMENT  COMMENT 'PK',
      `company_id`  VARCHAR(50)  NOT NULL                 COMMENT '회사아이디(히든)',
      `manager_id`  VARCHAR(50)  NOT NULL                 COMMENT '담당자 ID',
      `name`        VARCHAR(100) NOT NULL                 COMMENT '이름',
      `password`    VARCHAR(255) NOT NULL                 COMMENT '비밀번호(bcrypt)',
      `email`       VARCHAR(100) DEFAULT NULL             COMMENT '메일주소',
      `phone`       VARCHAR(30)  DEFAULT NULL             COMMENT '비상연락망',
      `created_at`  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      UNIQUE KEY `uq_company_manager` (`company_id`, `manager_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");

$method = $_SERVER['REQUEST_METHOD'];

// ── GET: 목록 조회 ────────────────────────────────────────
if ($method === 'GET') {
    $company_id = trim($_GET['company_id'] ?? '');
    $id = (int)($_GET['id'] ?? 0);

    if ($id > 0) {
        // 단건 조회: company_id가 있으면 함께 검사, 없으면 id로만 조회
        if ($company_id !== '') {
            $stmt = $pdo->prepare('SELECT m.*, u.company_name FROM `managers` m LEFT JOIN `users` u ON m.company_id = u.company_id WHERE m.id = ? AND m.company_id = ? LIMIT 1');
            $stmt->execute([$id, $company_id]);
        } else {
            $stmt = $pdo->prepare('SELECT m.*, u.company_name FROM `managers` m LEFT JOIN `users` u ON m.company_id = u.company_id WHERE m.id = ? LIMIT 1');
            $stmt->execute([$id]);
        }
        $row = $stmt->fetch();
        if (!$row) { http_response_code(404); echo json_encode(['success' => false, 'message' => '없음']); exit; }
        echo json_encode(['success' => true, 'data' => $row]);
        exit;
    }

    if ($company_id === '') {
        // 전체 조회
        $stmt = $pdo->query('SELECT m.`id`, m.`manager_id`, m.`name`, m.`email`, m.`phone`, m.`company_id`, u.`company_name` FROM `managers` m LEFT JOIN `users` u ON m.company_id = u.company_id ORDER BY m.`id` ASC');
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        exit;
    }

    $stmt = $pdo->prepare('SELECT m.`id`, m.`manager_id`, m.`name`, m.`email`, m.`phone`, m.`company_id`, u.`company_name` FROM `managers` m LEFT JOIN `users` u ON m.`company_id` = u.`company_id` WHERE m.`company_id` = ? ORDER BY m.`id` ASC');
    $stmt->execute([$company_id]);
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    exit;
}

// ── POST: 신규 등록 ───────────────────────────────────────
if ($method === 'POST') {
    $body       = json_decode(file_get_contents('php://input'), true);
    $company_id = trim($body['company_id'] ?? '');
    $manager_id = trim($body['manager_id'] ?? '');
    $name       = trim($body['name']       ?? '');
    $password   = trim($body['password']   ?? '');
    $email      = trim($body['email']      ?? '');
    $phone      = trim($body['phone']      ?? '');

    if ($company_id === '' || $manager_id === '' || $name === '' || $password === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '필수 항목을 입력하세요']);
        exit;
    }

    // 중복 확인
    $chk = $pdo->prepare('SELECT id FROM `managers` WHERE `company_id` = ? AND `manager_id` = ?');
    $chk->execute([$company_id, $manager_id]);
    if ($chk->fetch()) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => '이미 존재하는 담당자 ID입니다']);
        exit;
    }

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare('INSERT INTO `managers` (`company_id`,`manager_id`,`name`,`password`,`email`,`phone`) VALUES (?,?,?,?,?,?)');
    $stmt->execute([$company_id, $manager_id, $name, $hash, $email, $phone]);
    echo json_encode(['success' => true, 'id' => (int)$pdo->lastInsertId()]);
    exit;
}

// ── PUT: 수정 ─────────────────────────────────────────────
if ($method === 'PUT') {
    $body       = json_decode(file_get_contents('php://input'), true);
    $id         = (int)($body['id']         ?? 0);
    $company_id = trim($body['company_id']  ?? '');
    $name       = trim($body['name']        ?? '');
    $email      = trim($body['email']       ?? '');
    $phone      = trim($body['phone']       ?? '');
    $password   = trim($body['password']    ?? '');

    if ($id === 0 || $company_id === '' || $name === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '필수 항목 누락']);
        exit;
    }

    if ($password !== '') {
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare('UPDATE `managers` SET `name`=?,`email`=?,`phone`=?,`password`=? WHERE `id`=? AND `company_id`=?');
        $stmt->execute([$name, $email, $phone, $hash, $id, $company_id]);
    } else {
        $stmt = $pdo->prepare('UPDATE `managers` SET `name`=?,`email`=?,`phone`=? WHERE `id`=? AND `company_id`=?');
        $stmt->execute([$name, $email, $phone, $id, $company_id]);
    }
    echo json_encode(['success' => true]);
    exit;
}

// ── DELETE: 삭제 ──────────────────────────────────────────
if ($method === 'DELETE') {
    $id         = (int)($_GET['id']         ?? 0);
    $company_id = trim($_GET['company_id']  ?? '');
    if ($id === 0 || $company_id === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '파라미터 누락']);
        exit;
    }
    $stmt = $pdo->prepare('DELETE FROM `managers` WHERE `id` = ? AND `company_id` = ?');
    $stmt->execute([$id, $company_id]);
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
