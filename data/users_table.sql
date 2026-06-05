-- =============================================
-- newsclipping DB - users 테이블 생성
-- =============================================
-- user_type 구분
--   'super_admin' : 메인관리자 - 모든 페이지 권한 + 회사 아이디 추가 권한
--   'admin'       : 일반관리자 - 모든 페이지 권한 (회사 아이디 추가 불가)
--
-- 로그인: company_id(회사아이디) + user_id(사용자아이디) + password
-- PK: (company_id, user_id) 복합키
-- =============================================

CREATE TABLE IF NOT EXISTS `users` (
  `company_id`    VARCHAR(50)  NOT NULL                        COMMENT '회사아이디',
  `user_id`       VARCHAR(50)  NOT NULL                        COMMENT '사용자아이디',
  `user_type`     ENUM('super_admin','admin') NOT NULL
                  DEFAULT 'admin'                             COMMENT '회원구분 (super_admin: 메인관리자, admin: 일반관리자)',
  `company_name`  VARCHAR(100) DEFAULT NULL                   COMMENT '상호',
  `main_contact`  VARCHAR(20)  DEFAULT NULL                   COMMENT '대표연락처',
  `main_manager`  VARCHAR(50)  DEFAULT NULL                   COMMENT '대표 담당자',
  `mobile`        VARCHAR(20)  DEFAULT NULL                   COMMENT '연락처(핸드폰)',
  `manager_email` VARCHAR(100) DEFAULT NULL                   COMMENT '담당자 이메일',
  `password`      VARCHAR(255) NOT NULL                       COMMENT '비밀번호 (bcrypt)',
  `created_at`    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`company_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 초기 데이터 삽입 (비밀번호: 1111)
-- 비밀번호 해시는 backend/setup_users.php 실행으로 자동 삽입됩니다.
-- =============================================

-- 주의: setup_users.php를 통해 bcrypt 해시로 삽입하는 것을 권장합니다.
-- 아래는 참고용 구조 예시입니다.

/*
INSERT INTO `users`
  (`company_id`, `user_id`, `user_type`, `company_name`, `main_contact`, `main_manager`, `mobile`, `manager_email`, `password`)
VALUES
  ('admin',    'admin',    'super_admin', '관리자',   '', '', '', '', '<bcrypt_hash_of_1111>'),
  ('company1', 'company1', 'admin',       'Company 1','', '', '', '', '<bcrypt_hash_of_1111>');
*/

-- setup_users.php 실행 후 자동으로 위 데이터가 삽입됩니다.
