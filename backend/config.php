<?php
// =============================================
// DB 연결 설정
// cafe24 서버 배포 시 아래 값을 실제 DB 정보로 수정하세요.
// =============================================

// =============================================
// 네이버 오픈 API 키
// https://developers.naver.com 에서 발급
// =============================================
define('NAVER_CLIENT_ID',     'pcmhlVLXhGx184_5fa5y');
define('NAVER_CLIENT_SECRET', 'mjr3yAwAY4');

define('DB_HOST',    'localhost');
define('DB_NAME',    'newsclipping');   // cafe24 DB 이름으로 수정
define('DB_USER',    'newsclipping');   // cafe24 DB 계정으로 수정
define('DB_PASS',    'wkaxnl001!');               // cafe24 DB 비밀번호로 수정
define('DB_CHARSET', 'utf8mb4');

try {
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        DB_HOST, DB_NAME, DB_CHARSET
    );
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'DB 연결 실패']);
    exit;
}
