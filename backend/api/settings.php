<?php
// =============================================
// GET /api/settings.php?company_id=...&user_id=...
// POST /api/settings.php  Body: { company_id, user_id, ...fields }
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
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once dirname(__DIR__) . '/config.php';

// company_settings 테이블 자동 생성
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `company_settings` (
          `id`                INT          NOT NULL AUTO_INCREMENT,
          `company_id`        VARCHAR(50)  NOT NULL,
          `positive_keywords` TEXT         DEFAULT NULL COMMENT '긍정 키워드(쉼표 구분)',
          `negative_keywords` TEXT         DEFAULT NULL COMMENT '부정 키워드(쉼표 구분)',
          `created_at`        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
          `updated_at`        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`),
          UNIQUE KEY `uq_company` (`company_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
} catch (Exception $e) { /* 무시 */ }

// ── GET: 설정 조회 ───────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $company_id = trim($_GET['company_id'] ?? '');
    $user_id    = trim($_GET['user_id']    ?? '');

    if ($company_id === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '파라미터가 누락되었습니다']);
        exit;
    }

    try {
        if ($user_id !== '') {
            $stmt = $pdo->prepare('
                SELECT `company_id`, `user_id`, `user_type`, `company_name`,
                       `main_contact`, `main_manager`, `mobile`, `manager_email`
                FROM `users`
                WHERE `company_id` = ? AND `user_id` = ?
                LIMIT 1
            ');
            $stmt->execute([$company_id, $user_id]);
        } else {
            // 담당자: user_id 없이 company_id로 admin 계정 정보 조회
            $stmt = $pdo->prepare('
                SELECT `company_id`, `user_id`, `user_type`, `company_name`,
                       `main_contact`, `main_manager`, `mobile`, `manager_email`
                FROM `users`
                WHERE `company_id` = ? AND `user_type` = \'admin\'
                LIMIT 1
            ');
            $stmt->execute([$company_id]);
        }
        $row = $stmt->fetch();

        if (!$row) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => '사용자를 찾을 수 없습니다']);
            exit;
        }

        // 키워드 설정 추가 조회
        $csStmt = $pdo->prepare('SELECT `positive_keywords`, `negative_keywords` FROM `company_settings` WHERE `company_id` = ? LIMIT 1');
        $csStmt->execute([$company_id]);
        $cs = $csStmt->fetch();
        $row['positive_keywords'] = $cs['positive_keywords'] ?? '';
        $row['negative_keywords'] = $cs['negative_keywords'] ?? '';

        echo json_encode(['success' => true, 'data' => $row]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '서버 오류가 발생했습니다']);
    }
    exit;
}

// ── POST: 설정 저장 ──────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body       = json_decode(file_get_contents('php://input'), true);
    $company_id = trim($body['company_id']   ?? '');
    $user_id    = trim($body['user_id']      ?? '');

    if ($company_id === '' || $user_id === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '파라미터가 누락되었습니다']);
        exit;
    }

    $company_name      = trim($body['company_name']      ?? '');
    $main_contact      = trim($body['main_contact']      ?? '');
    $main_manager      = trim($body['main_manager']      ?? '');
    $mobile            = trim($body['mobile']            ?? '');
    $manager_email     = trim($body['manager_email']     ?? '');
    $positive_keywords = trim($body['positive_keywords'] ?? '');
    $negative_keywords = trim($body['negative_keywords'] ?? '');

    try {
        $stmt = $pdo->prepare('
            UPDATE `users`
            SET `company_name`  = ?,
                `main_contact`  = ?,
                `main_manager`  = ?,
                `mobile`        = ?,
                `manager_email` = ?
            WHERE `company_id` = ? AND `user_id` = ?
        ');
        $stmt->execute([$company_name, $main_contact, $main_manager, $mobile, $manager_email, $company_id, $user_id]);

        // 키워드 저장 (UPSERT)
        $csStmt = $pdo->prepare('
            INSERT INTO `company_settings` (`company_id`, `positive_keywords`, `negative_keywords`)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE `positive_keywords` = VALUES(`positive_keywords`), `negative_keywords` = VALUES(`negative_keywords`)
        ');
        $csStmt->execute([$company_id, $positive_keywords, $negative_keywords]);

        echo json_encode(['success' => true, 'message' => '저장되었습니다']);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '서버 오류가 발생했습니다']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
