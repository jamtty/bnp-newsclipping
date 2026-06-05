<?php
// =============================================
// GET    /api/companies.php                          → 업체 목록
// POST   /api/companies.php  Body: {...}             → 업체 등록
// PUT    /api/companies.php  Body: {id, ...}         → 업체 수정
// DELETE /api/companies.php?id=...                   → 업체 삭제
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

// ── GET: 업체 목록 ─────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->query("
            SELECT `company_id`, `user_id`, `company_name`,
                   `main_contact`, `main_manager`, `mobile`, `manager_email`
            FROM `users`
            WHERE `user_type` = 'admin'
            ORDER BY `company_id` ASC
        ");
        $rows = $stmt->fetchAll();
        echo json_encode(['success' => true, 'data' => $rows]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '서버 오류']);
    }
    exit;
}

// ── POST: 업체 등록 ────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);

    $company_id    = trim($body['company_id']    ?? '');
    $user_id       = trim($body['user_id']       ?? '');
    $password      = trim($body['password']      ?? '');
    $company_name  = trim($body['company_name']  ?? '');
    $main_contact  = trim($body['main_contact']  ?? '');
    $main_manager  = trim($body['main_manager']  ?? '');
    $mobile        = trim($body['mobile']        ?? '');
    $manager_email = trim($body['manager_email'] ?? '');

    if ($company_id === '' || $user_id === '' || $password === '' || $company_name === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '회사 ID, 관리자 ID, 비밀번호, 상호는 필수입니다']);
        exit;
    }

    if (strlen($password) < 4) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '비밀번호는 4자 이상이어야 합니다']);
        exit;
    }

    try {
        // 중복 확인
        $check = $pdo->prepare("SELECT `company_id` FROM `users` WHERE `company_id` = ? LIMIT 1");
        $check->execute([$company_id]);
        if ($check->fetch()) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => '이미 사용 중인 회사 ID입니다']);
            exit;
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("
            INSERT INTO `users`
                (`company_id`, `user_id`, `password`, `user_type`, `company_name`,
                 `main_contact`, `main_manager`, `mobile`, `manager_email`)
            VALUES (?, ?, ?, 'admin', ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $company_id, $user_id, $hash, $company_name,
            $main_contact, $main_manager, $mobile, $manager_email,
        ]);

        echo json_encode(['success' => true, 'message' => '업체가 등록되었습니다']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '서버 오류']);
    }
    exit;
}

// ── PUT: 업체 수정 ─────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $body = json_decode(file_get_contents('php://input'), true);

    $target_id     = trim($body['company_id']    ?? '');
    $company_name  = trim($body['company_name']  ?? '');
    $main_contact  = trim($body['main_contact']  ?? '');
    $main_manager  = trim($body['main_manager']  ?? '');
    $mobile        = trim($body['mobile']        ?? '');
    $manager_email = trim($body['manager_email'] ?? '');
    $new_password  = trim($body['new_password']  ?? '');

    if ($target_id === '' || $company_name === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'company_id와 상호는 필수입니다']);
        exit;
    }

    try {
        if ($new_password !== '') {
            if (strlen($new_password) < 4) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => '비밀번호는 4자 이상이어야 합니다']);
                exit;
            }
            $hash = password_hash($new_password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("
                UPDATE `users`
                SET `company_name`=?, `main_contact`=?, `main_manager`=?,
                    `mobile`=?, `manager_email`=?, `password`=?
                WHERE `company_id`=? AND `user_type`='admin'
            ");
            $stmt->execute([$company_name, $main_contact, $main_manager, $mobile, $manager_email, $hash, $target_id]);
        } else {
            $stmt = $pdo->prepare("
                UPDATE `users`
                SET `company_name`=?, `main_contact`=?, `main_manager`=?,
                    `mobile`=?, `manager_email`=?
                WHERE `company_id`=? AND `user_type`='admin'
            ");
            $stmt->execute([$company_name, $main_contact, $main_manager, $mobile, $manager_email, $target_id]);
        }

        echo json_encode(['success' => true, 'message' => '수정되었습니다']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '서버 오류']);
    }
    exit;
}

// ── DELETE: 업체 삭제 ──────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $del_id = trim($_GET['id'] ?? '');
    if ($del_id === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'id가 필요합니다']);
        exit;
    }
    try {
        $pdo->beginTransaction();

        // 1) 뉴스 클리핑 관련 테이블 (있을 경우 대비)
        foreach (['news_clippings', 'news', 'reports'] as $tbl) {
            try {
                $pdo->prepare("DELETE FROM `{$tbl}` WHERE `company_id`=?")->execute([$del_id]);
            } catch (Exception $e) { /* 테이블 없으면 무시 */ }
        }

        // 2) 기자 (media_journalists)
        $pdo->prepare("DELETE mj FROM `media_journalists` mj
                       INNER JOIN `media` m ON mj.media_code = m.media_code AND m.company_id = ?
                       WHERE m.company_id = ?")->execute([$del_id, $del_id]);

        // 3) 매체
        $pdo->prepare("DELETE FROM `media` WHERE `company_id`=?")->execute([$del_id]);

        // 4) 클라이언트
        $pdo->prepare("DELETE FROM `clients` WHERE `company_id`=?")->execute([$del_id]);

        // 5) 담당자
        $pdo->prepare("DELETE FROM `managers` WHERE `company_id`=?")->execute([$del_id]);

        // 6) 업체 계정 (users)
        $pdo->prepare("DELETE FROM `users` WHERE `company_id`=? AND `user_type`='admin'")->execute([$del_id]);

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => '업체 및 관련 데이터가 모두 삭제되었습니다']);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '삭제 중 오류가 발생했습니다: ' . $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => '허용되지 않는 메서드']);
