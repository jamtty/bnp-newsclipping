<?php
// =============================================
// POST /api/login.php
// Body: { "company_id": "...", "user_id": "...", "password": "..." }
// Response: { "success": true, "user": { "company_id": "...", "user_id": "...", "user_type": "...", "company_name": "..." } }
//         | { "success": false, "message": "..." }
// =============================================

header('Content-Type: application/json; charset=utf-8');

// 허용 오리진: 로컬 개발 + 운영 도메인
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

// preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => '허용되지 않는 메서드입니다']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);

$company_id = trim($body['company_id'] ?? '');
$user_id    = trim($body['user_id']    ?? '');
$password   = trim($body['password']   ?? '');

if ($company_id === '' || $user_id === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '회사아이디, 사용자아이디, 비밀번호를 모두 입력하세요']);
    exit;
}

require_once __DIR__ . '/../config.php';

$stmt = $pdo->prepare("
    SELECT `company_id`, `user_id`, `user_type`, `company_name`, `password`
    FROM `users`
    WHERE `company_id` = ? AND `user_id` = ?
    LIMIT 1
");
$stmt->execute([$company_id, $user_id]);
$user = $stmt->fetch();

if ($user && password_verify($password, $user['password'])) {
    echo json_encode([
        'success' => true,
        'user'    => [
            'company_id'   => $user['company_id'],
            'user_id'      => $user['user_id'],
            'user_type'    => $user['user_type'],   // 'super_admin' | 'admin'
            'company_name' => $user['company_name'],
        ],
    ]);
    exit;
}

// users에 없으면 managers 테이블 확인
$stmt2 = $pdo->prepare("
    SELECT m.`company_id`, m.`manager_id`, m.`name`, m.`password`,
           u.`company_name`
    FROM `managers` m
    LEFT JOIN `users` u ON u.`company_id` = m.`company_id`
    WHERE m.`company_id` = ? AND m.`manager_id` = ?
    LIMIT 1
");
$stmt2->execute([$company_id, $user_id]);
$manager = $stmt2->fetch();

if ($manager && password_verify($password, $manager['password'])) {
    echo json_encode([
        'success' => true,
        'user'    => [
            'company_id'   => $manager['company_id'],
            'user_id'      => $manager['manager_id'],
            'user_type'    => 'manager',
            'company_name' => $manager['company_name'],
            'name'         => $manager['name'],
        ],
    ]);
} else {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => '아이디 또는 비밀번호가 올바르지 않습니다']);
}
