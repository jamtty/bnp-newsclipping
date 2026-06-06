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
      `created_at`   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      KEY `idx_company` (`company_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");

$method = $_SERVER['REQUEST_METHOD'];

// manager_user_id 컬럼 없으면 추가 (구버전 DB 대응)
try {
    $pdo->exec("ALTER TABLE `news` ADD COLUMN `manager_user_id` VARCHAR(100) DEFAULT NULL COMMENT '등록자 user_id' AFTER `file_path`");
} catch (Exception $e) { /* 이미 있으면 무시 */ }

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

    return ['name' => $origName, 'path' => '/uploads/news/' . $safeName];
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

    $stmt = $pdo->prepare('
        INSERT INTO `news`
            (`company_id`,`serial`,`manager`,`manager_user_id`,`reg_date`,`reg_time`,
             `client_id`,`client_name`,`media_code`,`media_name`,`journalist`,
             `categories`,`media_type`,`headline`,`link`,`file_name`,`file_path`)
        VALUES (?,?,?,?,?,?, ?,?,?,?,?, ?,?,?,?,?,?)
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
        trim($_POST['media_code']  ?? '') ?: null,
        trim($_POST['media_name']  ?? '') ?: null,
        trim($_POST['journalist']  ?? '') ?: null,
        trim($_POST['categories']  ?? '') ?: null,
        trim($_POST['media_type']  ?? '') ?: null,
        trim($_POST['headline']    ?? '') ?: null,
        trim($_POST['link']        ?? '') ?: null,
        $file['name'],
        $file['path'],
    ]);

    echo json_encode(['success' => true, 'id' => (int)$pdo->lastInsertId(), 'serial' => $serial]);
    exit;
}

// ── PUT: 수정 ────────────────────────────────────────────
if ($method === 'PUT') {
    // PUT도 multipart로 전송되므로 $_POST 사용
    $id         = (int)($_POST['id']         ?? 0);
    $company_id = trim($_POST['company_id']  ?? '');
    if (!$id || $company_id === '') { http_response_code(400); echo json_encode(['success' => false, 'message' => 'id, company_id 필요']); exit; }

    // 기존 파일 경로 조회
    $oldStmt = $pdo->prepare('SELECT `file_path`,`file_name` FROM `news` WHERE `id`=? AND `company_id`=? LIMIT 1');
    $oldStmt->execute([$id, $company_id]);
    $old = $oldStmt->fetch();

    $file = handleUpload();
    if ($file['name'] === null) {
        // 새 파일 없으면 기존 유지
        $file['name'] = $old['file_name'] ?? null;
        $file['path'] = $old['file_path'] ?? null;
    }

    $stmt = $pdo->prepare('
        UPDATE `news` SET
            `manager`=?,`manager_user_id`=?,`reg_date`=?,`reg_time`=?,
            `client_id`=?,`client_name`=?,`media_code`=?,`media_name`=?,`journalist`=?,
            `categories`=?,`media_type`=?,`headline`=?,`link`=?,`file_name`=?,`file_path`=?
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
        trim($_POST['headline']    ?? '') ?: null,
        trim($_POST['link']        ?? '') ?: null,
        $file['name'],
        $file['path'],
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
        $full = dirname(__DIR__) . $row['file_path'];
        if (file_exists($full)) unlink($full);
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
