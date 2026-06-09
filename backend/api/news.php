<?php
// =============================================
// GET    /api/news.php?company_id=...                   목록
// GET    /api/news.php?company_id=...&id=...            단건
// POST   /api/news.php  (multipart/form-data)           신규
// PUT    /api/news.php  (multipart/form-data)           수정
// DELETE /api/news.php?id=...&company_id=...            삭제
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
    CREATE TABLE IF NOT EXISTS `news` (
      `id`           INT           NOT NULL AUTO_INCREMENT,
      `company_id`   VARCHAR(50)   NOT NULL                  COMMENT '업체아이디',
      `serial`       VARCHAR(20)   NOT NULL                  COMMENT '일련번호(자동)',
      `manager`      VARCHAR(100)  DEFAULT NULL              COMMENT '등록 담당자',
      `reg_date`     DATE          DEFAULT NULL              COMMENT '등록일',
      `reg_time`     VARCHAR(5)    DEFAULT NULL              COMMENT '등록시간(HH:MM)',
      `client_id`    INT           DEFAULT NULL              COMMENT '클라이언트 id',
      `client_name`  VARCHAR(100)  DEFAULT NULL              COMMENT '클라이언트명(스냅샷)',
      `media_code`   VARCHAR(10)   DEFAULT NULL              COMMENT '뉴스매체 코드',
      `media_name`   VARCHAR(100)  DEFAULT NULL              COMMENT '뉴스매체명(스냅샷)',
      `journalist`   VARCHAR(100)  DEFAULT NULL              COMMENT '기자명',
      `categories`   VARCHAR(255)  DEFAULT NULL              COMMENT '기사분류(콤마구분)',
      `media_type`   VARCHAR(20)   DEFAULT NULL              COMMENT '미디어 Type',
      `headline`     VARCHAR(500)  DEFAULT NULL              COMMENT '기사 Head line',
      `link`         VARCHAR(1000) DEFAULT NULL              COMMENT '기사 Link',
      `file_name`    VARCHAR(255)  DEFAULT NULL              COMMENT '첨부파일명',
      `file_path`    VARCHAR(500)  DEFAULT NULL              COMMENT '첨부파일 경로',
      `manager_user_id` VARCHAR(100) DEFAULT NULL            COMMENT '등록자 user_id',
      PRIMARY KEY (`id`),
      KEY `idx_company` (`company_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");

$method = $_SERVER['REQUEST_METHOD'];
// POST + _method 오버라이드 지원 (PUT multipart 파싱 문제 회피)
if ($method === 'POST' && isset($_POST['_method'])) {
    $method = strtoupper($_POST['_method']);
}

// manager_user_id 컬럼 없으면 추가 (구버전 DB 대응)
try {
    $pdo->exec("ALTER TABLE `news` ADD COLUMN `manager_user_id` VARCHAR(100) DEFAULT NULL COMMENT '등록자 user_id' AFTER `file_path`");
} catch (Exception $e) { /* 이미 있으면 무시 */ }
try {
    $pdo->exec("ALTER TABLE `news` ADD COLUMN `created_date` DATE DEFAULT NULL COMMENT '생성일' AFTER `manager_user_id`");
} catch (Exception $e) { /* 이미 있으면 무시 */ }
try {
    $pdo->exec("ALTER TABLE `news` ADD COLUMN `created_time` VARCHAR(5) DEFAULT NULL COMMENT '생성시간(HH:MM)' AFTER `created_date`");
} catch (Exception $e) { /* 이미 있으면 무시 */ }
try {
    $pdo->exec("ALTER TABLE `news` ADD COLUMN `sentiment` VARCHAR(10) DEFAULT '중립' COMMENT '기사성향(긍정/부정/중립)' AFTER `created_time`");
} catch (Exception $e) { /* 이미 있으면 무시 */ }

// 키워드 기반 기사 성향 판별 함수
function detectSentiment(string $text, string $company_id, $pdo): string {
    $cs = $pdo->prepare('SELECT `positive_keywords`, `negative_keywords` FROM `company_settings` WHERE `company_id` = ? LIMIT 1');
    $cs->execute([$company_id]);
    $row = $cs->fetch();
    if (!$row) return '중립';

    $posWords = array_filter(array_map('trim', explode(',', $row['positive_keywords'] ?? '')));
    $negWords = array_filter(array_map('trim', explode(',', $row['negative_keywords'] ?? '')));

    foreach ($negWords as $w) {
        if ($w !== '' && mb_strpos($text, $w) !== false) return '부정';
    }
    foreach ($posWords as $w) {
        if ($w !== '' && mb_strpos($text, $w) !== false) return '긍정';
    }
    return '중립';
}

// media / media_journalists 테이블 없으면 생성
try {
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
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `media_journalists` (
          `id`          INT          NOT NULL AUTO_INCREMENT,
          `media_code`  VARCHAR(10)  NOT NULL,
          `company_id`  VARCHAR(50)  NOT NULL,
          `name`        VARCHAR(50)  NOT NULL,
          `tel`         VARCHAR(30)  DEFAULT NULL,
          `email`       VARCHAR(100) DEFAULT NULL,
          `memo`        TEXT         DEFAULT NULL,
          `created_at`  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`),
          KEY `idx_media_code` (`company_id`, `media_code`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
} catch (\Throwable $e) { /* 무시 */ }

// ── GET ──────────────────────────────────────────────────
if ($method === 'GET') {
    $company_id = trim($_GET['company_id'] ?? '');
    $id         = (int)($_GET['id'] ?? 0);

    if ($id > 0) {
        $q = $company_id !== ''
            ? $pdo->prepare('SELECT * FROM `news` WHERE `id`=? AND `company_id`=? LIMIT 1')
            : $pdo->prepare('SELECT * FROM `news` WHERE `id`=? LIMIT 1');
        $company_id !== '' ? $q->execute([$id, $company_id]) : $q->execute([$id]);
        $row = $q->fetch();
        if (!$row) { http_response_code(404); echo json_encode(['success' => false, 'message' => '없음']); exit; }
        echo json_encode(['success' => true, 'data' => $row]);
        exit;
    }

    if ($company_id === '') {
        $stmt = $pdo->query('SELECT * FROM `news` ORDER BY `id` DESC');
    } else {
        $stmt = $pdo->prepare('SELECT * FROM `news` WHERE `company_id`=? ORDER BY `id` DESC');
        $stmt->execute([$company_id]);
    }
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    exit;
}

// ── 공통 파일 업로드 헬퍼 ──────────────────────────────────
function handleUpload(): array {
    // 이미 서버에 저장된 경로가 전달된 경우 (news-image.php 로 미리 저장)
    $savedName = trim($_POST['file_name_saved'] ?? '');
    $savedPath = trim($_POST['file_path_saved'] ?? '');
    if ($savedName !== '' && $savedPath !== '') {
        return ['name' => $savedName, 'path' => $savedPath];
    }

    if (empty($_FILES['file']['tmp_name'])) return ['name' => null, 'path' => null];

    $uploadDir = dirname(__DIR__) . '/uploads/news/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

    $origName = basename($_FILES['file']['name']);
    $ext      = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
    $allowed  = ['jpg','jpeg','png','gif','webp','pdf','doc','docx','xls','xlsx','zip'];
    if (!in_array($ext, $allowed, true)) return ['name' => null, 'path' => null];

    $safeName = date('YmdHis') . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $origName);
    $dest     = $uploadDir . $safeName;
    if (!move_uploaded_file($_FILES['file']['tmp_name'], $dest)) return ['name' => null, 'path' => null];

    return ['name' => $origName, 'path' => '/backend/uploads/news/' . $safeName];
}

// ── POST: 신규 ───────────────────────────────────────────
if ($method === 'POST') {
    $company_id  = trim($_POST['company_id']  ?? '');
    if ($company_id === '') { http_response_code(400); echo json_encode(['success' => false, 'message' => 'company_id 필요']); exit; }

    // 시리얼 자동채번: YYYYNNNNN (연도 + 5자리 순번)
    $year    = date('Y');
    $maxStmt = $pdo->prepare("SELECT MAX(CAST(SUBSTRING(`serial`,5) AS UNSIGNED)) FROM `news` WHERE `company_id`=? AND `serial` LIKE ?");
    $maxStmt->execute([$company_id, $year . '%']);
    $maxSeq  = (int)$maxStmt->fetchColumn();
    $serial  = $year . str_pad($maxSeq + 1, 5, '0', STR_PAD_LEFT);

    $file = handleUpload();

    // ── 뉴스매체 자동 등록 ──────────────────────────────
    $mediaName = trim($_POST['media_name'] ?? '');
    $mediaCode = trim($_POST['media_code'] ?? '');
    if ($mediaName !== '' && $company_id !== '') {
        try {
            $chkMedia = $pdo->prepare('SELECT `media_code` FROM `media` WHERE `company_id`=? AND `media_name`=? LIMIT 1');
            $chkMedia->execute([$company_id, $mediaName]);
            $existingMedia = $chkMedia->fetch();
            if ($existingMedia) {
                $mediaCode = $existingMedia['media_code'];
            } elseif ($mediaCode === '') {
                $maxStmt2 = $pdo->prepare('SELECT MAX(CAST(`media_code` AS UNSIGNED)) FROM `media` WHERE `company_id`=?');
                $maxStmt2->execute([$company_id]);
                $mediaCode = str_pad((int)$maxStmt2->fetchColumn() + 1, 4, '0', STR_PAD_LEFT);
                $insMedia = $pdo->prepare('INSERT INTO `media` (`company_id`,`media_code`,`media_name`) VALUES (?,?,?)');
                $insMedia->execute([$company_id, $mediaCode, $mediaName]);
            }
        } catch (\Throwable $e) {
            // media 테이블 오류 무시, 뉴스 등록은 계속
        }
    }

    // ── 소속 기자 자동 등록 ─────────────────────────────
    $journalist = trim($_POST['journalist'] ?? '');
    if ($journalist !== '' && $mediaCode !== '' && $company_id !== '') {
        try {
            $chkJ = $pdo->prepare('SELECT id FROM `media_journalists` WHERE `company_id`=? AND `media_code`=? AND `name`=? LIMIT 1');
            $chkJ->execute([$company_id, $mediaCode, $journalist]);
            if (!$chkJ->fetch()) {
                $insJ = $pdo->prepare('INSERT INTO `media_journalists` (`company_id`,`media_code`,`name`) VALUES (?,?,?)');
                $insJ->execute([$company_id, $mediaCode, $journalist]);
            }
        } catch (\Throwable $e) {
            // media_journalists 테이블 오류 무시, 뉴스 등록은 계속
        }
    }

    $now_date = date('Y-m-d');
    $now_time = date('H:i');
    $headline_text = trim($_POST['headline'] ?? '');
    $sentiment_manual = trim($_POST['sentiment'] ?? '');
    $sentiment = in_array($sentiment_manual, ['긍정','부정','중립'], true)
        ? $sentiment_manual
        : detectSentiment($headline_text, $company_id, $pdo);

    $stmt = $pdo->prepare('
        INSERT INTO `news`
            (`company_id`,`serial`,`manager`,`manager_user_id`,`reg_date`,`reg_time`,
             `client_id`,`client_name`,`media_code`,`media_name`,`journalist`,
             `categories`,`media_type`,`headline`,`link`,`file_name`,`file_path`,
             `created_date`,`created_time`,`sentiment`)
        VALUES (?,?,?,?,?,?, ?,?,?,?,?, ?,?,?,?,?,?, ?,?,?)
    ');
    $stmt->execute([
        $company_id,
        $serial,
        trim($_POST['manager']         ?? ''),
        trim($_POST['manager_user_id'] ?? '') ?: null,
        trim($_POST['reg_date']        ?? '') ?: null,
        trim($_POST['reg_time']        ?? '') ?: null,
        (int)($_POST['client_id']  ?? 0) ?: null,
        trim($_POST['client_name'] ?? '') ?: null,
        $mediaCode ?: null,
        $mediaName ?: null,
        $journalist ?: null,
        trim($_POST['categories']  ?? '') ?: null,
        trim($_POST['media_type']  ?? '') ?: null,
        $headline_text ?: null,
        trim($_POST['link']        ?? '') ?: null,
        $file['name'],
        $file['path'],
        $now_date,
        $now_time,
        $sentiment,
    ]);

    echo json_encode(['success' => true, 'id' => (int)$pdo->lastInsertId(), 'serial' => $serial]);
    exit;
}

// ── PUT: 수정 ────────────────────────────────────────────
if ($method === 'PUT') {
    // id, company_id는 URL 쿼리스트링으로 전달 (PHP는 PUT multipart에서 $_POST 자동 파싱 불가)
    $id         = (int)($_GET['id']         ?? 0);
    $company_id = trim($_GET['company_id']  ?? '');
    if (!$id || $company_id === '') { http_response_code(400); echo json_encode(['success' => false, 'message' => 'id, company_id 필요']); exit; }

    // 기존 파일 경로 조회
    $oldStmt = $pdo->prepare('SELECT `file_path`,`file_name` FROM `news` WHERE `id`=? AND `company_id`=? LIMIT 1');
    $oldStmt->execute([$id, $company_id]);
    $old = $oldStmt->fetch();

    $file = handleUpload();
    if ($file['name'] === null) {
        // delete_file=1 이면 명시적 삭제 (FTP 파일도 삭제)
        if (!empty($_POST['delete_file'])) {
            if (!empty($old['file_path'])) {
                $fp = $old['file_path'];
                if (str_starts_with($fp, '/backend/')) {
                    $delFull = dirname(__DIR__) . '/' . ltrim(substr($fp, strlen('/backend/')), '/');
                } elseif (str_starts_with($fp, '/uploads/')) {
                    $delFull = dirname(__DIR__) . $fp;
                } else {
                    $delFull = dirname(__DIR__) . '/uploads/news/' . basename($fp);
                }
                if (is_file($delFull)) @unlink($delFull);
            }
            $file['name'] = null;
            $file['path'] = null;
        } else {
            // 새 파일 없으면 기존 유지
            $file['name'] = $old['file_name'] ?? null;
            $file['path'] = $old['file_path'] ?? null;
        }
    } else {
        // 새 파일이 업로드됐으면 기존 파일 삭제 (단, 경로가 동일한 경우 삭제 안 함)
        if (!empty($old['file_path']) && $old['file_path'] !== $file['path']) {
            $fp = $old['file_path'];
            if (str_starts_with($fp, '/backend/')) {
                $oldFull = dirname(__DIR__) . '/' . ltrim(substr($fp, strlen('/backend/')), '/');
            } elseif (str_starts_with($fp, '/uploads/')) {
                $oldFull = dirname(__DIR__) . $fp;
            } else {
                $oldFull = dirname(__DIR__) . '/uploads/news/' . basename($fp);
            }
            if (is_file($oldFull)) @unlink($oldFull);
        }
    }

    $put_headline = trim($_POST['headline'] ?? '') ?: null;
    // 직접 선택한 성향값 우선, 없으면 자동 판별
    $put_sentiment_manual = trim($_POST['sentiment'] ?? '');
    $put_sentiment = in_array($put_sentiment_manual, ['긍정','부정','중립'], true)
        ? $put_sentiment_manual
        : detectSentiment($put_headline ?? '', $company_id, $pdo);

    $stmt = $pdo->prepare('
        UPDATE `news` SET
            `manager`=?,`manager_user_id`=?,`reg_date`=?,`reg_time`=?,
            `client_id`=?,`client_name`=?,`media_code`=?,`media_name`=?,`journalist`=?,
            `categories`=?,`media_type`=?,`headline`=?,`link`=?,`file_name`=?,`file_path`=?,`sentiment`=?
        WHERE `id`=? AND `company_id`=?
    ');
    $stmt->execute([
        trim($_POST['manager']         ?? ''),
        trim($_POST['manager_user_id'] ?? '') ?: null,
        trim($_POST['reg_date']        ?? '') ?: null,
        trim($_POST['reg_time']        ?? '') ?: null,
        (int)($_POST['client_id']  ?? 0) ?: null,
        trim($_POST['client_name'] ?? '') ?: null,
        trim($_POST['media_code']  ?? '') ?: null,
        trim($_POST['media_name']  ?? '') ?: null,
        trim($_POST['journalist']  ?? '') ?: null,
        trim($_POST['categories']  ?? '') ?: null,
        trim($_POST['media_type']  ?? '') ?: null,
        $put_headline,
        trim($_POST['link']        ?? '') ?: null,
        $file['name'],
        $file['path'],
        $put_sentiment,
        $id,
        $company_id,
    ]);

    echo json_encode(['success' => true]);
    exit;
}

// ── DELETE ───────────────────────────────────────────────
if ($method === 'DELETE') {
    $id         = (int)($_GET['id']         ?? 0);
    $company_id = trim($_GET['company_id']  ?? '');
    if (!$id) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'id 필요']); exit; }

    // 첨부파일 삭제
    if ($company_id !== '') {
        $q = $pdo->prepare('SELECT `file_path` FROM `news` WHERE `id`=? AND `company_id`=? LIMIT 1');
        $q->execute([$id, $company_id]);
    } else {
        $q = $pdo->prepare('SELECT `file_path` FROM `news` WHERE `id`=? LIMIT 1');
        $q->execute([$id]);
    }
    $row = $q->fetch();
    if ($row && $row['file_path']) {
        // '/uploads/news/파일명' 또는 '/backend/uploads/news/파일명' 두 형태 모두 처리
        $fp = $row['file_path'];
        // 절대경로로 변환 시도 (backend 기준)
        if (str_starts_with($fp, '/backend/')) {
            $full = dirname(__DIR__) . '/' . ltrim(substr($fp, strlen('/backend/')), '/');
        } elseif (str_starts_with($fp, '/uploads/')) {
            $full = dirname(__DIR__) . $fp;
        } else {
            $full = dirname(__DIR__) . '/uploads/news/' . basename($fp);
        }
        if (is_file($full)) {
            @unlink($full);
        }
    }

    if ($company_id !== '') {
        $pdo->prepare('DELETE FROM `news` WHERE `id`=? AND `company_id`=?')->execute([$id, $company_id]);
    } else {
        $pdo->prepare('DELETE FROM `news` WHERE `id`=?')->execute([$id]);
    }
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
