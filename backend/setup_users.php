<?php
// =============================================
// 초기 사용자 데이터 삽입 스크립트
// 브라우저에서 한 번만 실행하세요:
//   https://newsclipping.mycafe24.com/backend/setup_users.php
// 실행 후 보안을 위해 이 파일을 삭제하거나 접근 차단 권장.
// =============================================

require_once __DIR__ . '/config.php';

// users 테이블 생성
$pdo->exec("
    CREATE TABLE IF NOT EXISTS `users` (
      `company_id`    VARCHAR(50)  NOT NULL                    COMMENT '회사아이디',
      `user_id`       VARCHAR(50)  NOT NULL                    COMMENT '사용자아이디',
      `user_type`     ENUM('super_admin','admin') NOT NULL DEFAULT 'admin'
                      COMMENT '회원구분 (super_admin: 메인관리자, admin: 일반관리자)',
      `company_name`  VARCHAR(100) DEFAULT NULL,
      `main_contact`  VARCHAR(20)  DEFAULT NULL,
      `main_manager`  VARCHAR(50)  DEFAULT NULL,
      `mobile`        VARCHAR(20)  DEFAULT NULL,
      `manager_email` VARCHAR(100) DEFAULT NULL,
      `password`      VARCHAR(255) NOT NULL,
      `created_at`    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`company_id`, `user_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");

// 초기 사용자 데이터
// user_type: 'super_admin' = 메인관리자(회사 아이디 추가 권한 포함)
//            'admin'       = 일반관리자(모든 페이지 권한)
$users = [
    [
        'company_id'    => 'admin',
        'user_id'       => 'admin',
        'user_type'     => 'super_admin',
        'company_name'  => '관리자',
        'main_contact'  => '',
        'main_manager'  => '',
        'mobile'        => '',
        'manager_email' => '',
        'password'      => password_hash('1111', PASSWORD_BCRYPT),
    ],
    [
        'company_id'    => 'company1',
        'user_id'       => 'company1',
        'user_type'     => 'admin',
        'company_name'  => 'Company 1',
        'main_contact'  => '',
        'main_manager'  => '',
        'mobile'        => '',
        'manager_email' => '',
        'password'      => password_hash('1111', PASSWORD_BCRYPT),
    ],
];

$stmt = $pdo->prepare("
    INSERT INTO `users`
        (`company_id`, `user_id`, `user_type`, `company_name`, `main_contact`, `main_manager`, `mobile`, `manager_email`, `password`)
    VALUES
        (:company_id, :user_id, :user_type, :company_name, :main_contact, :main_manager, :mobile, :manager_email, :password)
    ON DUPLICATE KEY UPDATE
        `user_type`     = VALUES(`user_type`),
        `company_name`  = VALUES(`company_name`),
        `password`      = VALUES(`password`)
");

$results = [];
foreach ($users as $user) {
    $stmt->execute($user);
    $results[] = "✅ [{$user['company_id']} / {$user['user_id']}] 삽입/업데이트 완료";
}

header('Content-Type: text/plain; charset=utf-8');
echo "=== 초기 사용자 설정 완료 ===\n\n";
echo implode("\n", $results) . "\n\n";
echo "admin   / 1111\n";
echo "company1 / 1111\n\n";
echo "⚠ 설정 완료 후 이 파일을 삭제하거나 접근을 차단하세요.\n";
