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

        // ── 기본 뉴스매체 50개 자동 등록 ──────────────────────
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `media` (
              `id`          INT          NOT NULL AUTO_INCREMENT,
              `company_id`  VARCHAR(50)  NOT NULL,
              `media_code`  VARCHAR(10)  NOT NULL,
              `media_name`  VARCHAR(100) NOT NULL DEFAULT '',
              `region`      VARCHAR(50)  DEFAULT NULL,
              `tel`         VARCHAR(30)  DEFAULT NULL,
              `address`     VARCHAR(255) DEFAULT NULL,
              `created_at`  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (`id`),
              UNIQUE KEY `uq_company_media` (`company_id`, `media_code`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        $defaultMedia = [
            // 통신사
            ['연합뉴스',         '전국'],
            ['뉴시스',           '전국'],
            ['뉴스1',            '전국'],
            // 전국 종합일간지
            ['조선일보',         '전국'],
            ['중앙일보',         '전국'],
            ['동아일보',         '전국'],
            ['한겨레',           '전국'],
            ['경향신문',         '전국'],
            ['국민일보',         '전국'],
            ['세계일보',         '전국'],
            ['한국일보',         '전국'],
            ['문화일보',         '전국'],
            ['서울신문',         '전국'],
            ['내일신문',         '전국'],
            ['한국경제신문',     '전국'],
            // 경제지
            ['매일경제',         '전국'],
            ['한국경제',         '전국'],
            ['서울경제',         '전국'],
            ['머니투데이',       '전국'],
            ['파이낸셜뉴스',     '전국'],
            ['헤럴드경제',       '전국'],
            ['이데일리',         '전국'],
            ['아시아경제',       '전국'],
            ['비즈니스워치',     '전국'],
            ['디지털타임스',     '전국'],
            ['전자신문',         '전국'],
            ['이투데이',         '전국'],
            ['뉴스핌',           '전국'],
            ['조선비즈',         '전국'],
            ['아주경제',         '전국'],
            ['이코노믹리뷰',     '전국'],
            ['한국금융신문',     '전국'],
            ['파이낸스투데이',   '전국'],
            // 방송 - 전국
            ['KBS뉴스',          '전국'],
            ['MBC뉴스',          '전국'],
            ['SBS뉴스',          '전국'],
            ['JTBC뉴스',         '전국'],
            ['TV조선',           '전국'],
            ['채널A',            '전국'],
            ['MBN',              '전국'],
            ['YTN',              '전국'],
            ['연합뉴스TV',       '전국'],
            ['한국경제TV',       '전국'],
            ['OBS',              '전국'],
            ['TBS',              '전국'],
            ['CBS노컷뉴스',      '전국'],
            ['KTV국민방송',      '전국'],
            ['EBS뉴스',          '전국'],
            // KBS 지역국
            ['KBS부산',          '부산'],
            ['KBS대구',          '대구'],
            ['KBS광주',          '광주'],
            ['KBS대전',          '대전'],
            ['KBS전주',          '전북'],
            ['KBS청주',          '충북'],
            ['KBS춘천',          '강원'],
            ['KBS창원',          '경남'],
            ['KBS울산',          '울산'],
            ['KBS제주',          '제주'],
            ['KBS포항',          '경북'],
            ['KBS안동',          '경북'],
            // MBC 지역국
            ['부산MBC',          '부산'],
            ['대구MBC',          '대구'],
            ['광주MBC',          '광주'],
            ['대전MBC',          '대전'],
            ['전주MBC',          '전북'],
            ['청주MBC',          '충북'],
            ['강원MBC',          '강원'],
            ['경남MBC',          '경남'],
            ['울산MBC',          '울산'],
            ['제주MBC',          '제주'],
            ['여수MBC',          '전남'],
            ['원주MBC',          '강원'],
            ['안동MBC',          '경북'],
            ['포항MBC',          '경북'],
            ['목포MBC',          '전남'],
            ['인천MBC',          '인천'],
            // SBS 계열 지역방송
            ['G1방송',           '강원'],
            ['KNN',              '부산'],
            ['TBC대구방송',      '대구'],
            ['KBC광주방송',      '광주'],
            ['JTV전주방송',      '전북'],
            ['CJB청주방송',      '충북'],
            ['OBS경인TV',        '경기'],
            ['KCTV제주방송',     '제주'],
            ['JIBS제주방송',     '제주'],
            // 인터넷·온라인
            ['노컷뉴스',         '전국'],
            ['오마이뉴스',       '전국'],
            ['프레시안',         '전국'],
            ['데일리안',         '전국'],
            ['뉴데일리',         '전국'],
            ['미디어오늘',       '전국'],
            ['시사저널',         '전국'],
            ['시사인',           '전국'],
            ['더팩트',           '전국'],
            ['아시아투데이',     '전국'],
            ['쿠키뉴스',         '전국'],
            ['뉴스토마토',       '전국'],
            ['에너지경제',       '전국'],
            ['민중의소리',       '전국'],
            ['일요신문',         '전국'],
            ['브레이크뉴스',     '전국'],
            ['미디어펜',         '전국'],
            ['펜앤마이크',       '전국'],
            ['뉴스웨이',         '전국'],
            ['비즈한국',         '전국'],
            ['스트레이트뉴스',   '전국'],
            ['뉴스타파',         '전국'],
            ['위클리서울',       '전국'],
            ['메트로신문',       '전국'],
            ['여성신문',         '전국'],
            ['통일뉴스',         '전국'],
            ['조세일보',         '전국'],
            ['세정신문',         '전국'],
            ['공감신문',         '전국'],
            ['포인트데일리',     '전국'],
            ['보안뉴스',         '전국'],
            ['IT조선',           '전국'],
            ['ZDNet Korea',      '전국'],
            // 스포츠
            ['스포츠조선',       '전국'],
            ['스포츠서울',       '전국'],
            ['스포츠경향',       '전국'],
            ['일간스포츠',       '전국'],
            ['스포티비뉴스',     '전국'],
            ['스포츠한국',       '전국'],
            ['MK스포츠',         '전국'],
            // 지역 신문 - 부산·경남·울산
            ['부산일보',         '부산'],
            ['국제신문',         '부산'],
            ['경남신문',         '경남'],
            ['경남도민일보',     '경남'],
            ['울산매일',         '울산'],
            ['울산신문',         '울산'],
            // 지역 신문 - 대구·경북
            ['매일신문',         '대구'],
            ['영남일보',         '대구'],
            ['대구신문',         '대구'],
            ['경북일보',         '경북'],
            ['경북매일',         '경북'],
            ['경북도민일보',     '경북'],
            // 지역 신문 - 광주·전남
            ['광주일보',         '광주'],
            ['광주매일',         '광주'],
            ['무등일보',         '광주'],
            ['전남일보',         '전남'],
            ['남도일보',         '전남'],
            // 지역 신문 - 전북
            ['전북일보',         '전북'],
            ['전북도민일보',     '전북'],
            ['전주일보',         '전북'],
            ['전민일보',         '전북'],
            // 지역 신문 - 대전·충남
            ['대전일보',         '대전'],
            ['중도일보',         '대전'],
            ['금강일보',         '대전'],
            ['충청투데이',       '충남'],
            ['충남일보',         '충남'],
            ['충청신문',         '충남'],
            // 지역 신문 - 충북
            ['충청일보',         '충북'],
            ['충북일보',         '충북'],
            ['충북도민일보',     '충북'],
            // 지역 신문 - 강원
            ['강원일보',         '강원'],
            ['강원도민일보',     '강원'],
            // 지역 신문 - 경기·인천
            ['경인일보',         '경기'],
            ['경기일보',         '경기'],
            ['경기신문',         '경기'],
            ['중부일보',         '경기'],
            ['수원일보',         '경기'],
            ['인천일보',         '인천'],
            ['기호일보',         '인천'],
            // 지역 신문 - 제주·세종
            ['제주일보',         '제주'],
            ['제민일보',         '제주'],
            ['한라일보',         '제주'],
            ['세종의소리',       '세종'],
            // 전문지
            ['의학신문',         '전국'],
            ['의사신문',         '전국'],
            ['약업신문',         '전국'],
            ['농민신문',         '전국'],
            ['한국농어민신문',   '전국'],
            ['수산경제신문',     '전국'],
            ['식품음료신문',     '전국'],
            ['환경일보',         '전국'],
            ['건설경제',         '전국'],
            ['교육신문',         '전국'],
            ['법률신문',         '전국'],
            ['소비자가만드는신문', '전국'],
            ['물류신문',         '전국'],
            ['자동차신문',       '전국'],
            ['오토헤럴드',       '전국'],
            ['중소기업뉴스',     '전국'],
        ];

        $mStmt = $pdo->prepare("
            INSERT IGNORE INTO `media` (`company_id`,`media_code`,`media_name`,`region`)
            VALUES (?,?,?,?)
        ");
        foreach ($defaultMedia as $idx => $m) {
            $mediaCode = str_pad($idx + 1, 4, '0', STR_PAD_LEFT);
            $mStmt->execute([$company_id, $mediaCode, $m[0], $m[1]]);
        }
        // ──────────────────────────────────────────────────────

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

        // 4) 클라이언트 기사분류 → 클라이언트 순서로 삭제
        try {
            $pdo->prepare("DELETE FROM `client_categories` WHERE `company_id`=?")->execute([$del_id]);
        } catch (Exception $e) { /* 테이블 없으면 무시 */ }
        $pdo->prepare("DELETE FROM `clients` WHERE `company_id`=?")->execute([$del_id]);

        // 5) 담당자
        $pdo->prepare("DELETE FROM `managers` WHERE `company_id`=?")->execute([$del_id]);

        // 6) 업체 환경설정 (company_settings)
        try {
            $pdo->prepare("DELETE FROM `company_settings` WHERE `company_id`=?")->execute([$del_id]);
        } catch (Exception $e) { /* 테이블 없으면 무시 */ }

        // 7) 업체 계정 (users)
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
