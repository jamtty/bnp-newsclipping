<?php
// =============================================
// POST /api/change-password.php
// Body: { "company_id": "...", "user_id": "...", "current_pw": "...", "new_pw": "..." }
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
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$body       = json_decode(file_get_contents('php://input'), true);
$company_id = trim($body['company_id'] ?? '');
$user_id    = trim($body['user_id']    ?? '');
$current_pw = trim($body['current_pw'] ?? '');
$new_pw     = trim($body['new_pw']     ?? '');

if ($company_id === '' || $user_id === '' || $current_pw === '' || $new_pw === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '모든 항목을 입력하세요']);
    exit;
}

if (mb_strlen($new_pw) < 4) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '새 비밀번호는 4자 이상이어야 합니다']);
    exit;
}

require_once dirname(__DIR__) . '/config.php';

try {
    // 현재 비밀번호 확인
    $stmt = $pdo->prepare('SELECT `password` FROM `users` WHERE `company_id` = ? AND `user_id` = ? LIMIT 1');
    $stmt->execute([$company_id, $user_id]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($current_pw, $user['password'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => '현재 비밀번호가 올바르지 않습니다']);
        exit;
    }

    // 새 비밀번호 저장
    $newHash = password_hash($new_pw, PASSWORD_BCRYPT);
    $upd     = $pdo->prepare('UPDATE `users` SET `password` = ? WHERE `company_id` = ? AND `user_id` = ?');
    $upd->execute([$newHash, $company_id, $user_id]);

    echo json_encode(['success' => true, 'message' => '비밀번호가 변경되었습니다']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => '서버 오류가 발생했습니다']);
}
