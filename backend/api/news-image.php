<?php
// =============================================
// GET /api/news-image.php?url=기사URL
// 기사 페이지에서 og:image 추출 → 서버에 저장 → file_name / file_path 반환
// =============================================

ob_start();
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');

$allowed = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177',
    'https://newsclipping.mycafe24.com',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'GET only']);
    exit;
}

$articleUrl = trim($_GET['url'] ?? '');
if ($articleUrl === '' || !filter_var($articleUrl, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'url 파라미터 필요']);
    exit;
}

// 기사 HTML 가져오기
function fetchHtml(string $url): string {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 5,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (compatible; NewsClipping/1.0)',
        CURLOPT_HTTPHEADER     => ['Accept: text/html,application/xhtml+xml'],
    ]);
    $html = curl_exec($ch);
    curl_close($ch);
    return is_string($html) ? $html : '';
}

// og:image URL 추출
function extractOgImage(string $html): string {
    // og:image
    if (preg_match('/<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\'][^>]*>/i', $html, $m)) {
        return trim($m[1]);
    }
    // content 먼저 나오는 순서도 처리
    if (preg_match('/<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\'][^>]*>/i', $html, $m)) {
        return trim($m[1]);
    }
    // twitter:image
    if (preg_match('/<meta[^>]+(?:name|property)=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\'][^>]*>/i', $html, $m)) {
        return trim($m[1]);
    }
    return '';
}

// 이미지 다운로드 후 저장
function downloadImage(string $imgUrl): array {
    $ch = curl_init($imgUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 5,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (compatible; NewsClipping/1.0)',
    ]);
    $data     = curl_exec($ch);
    $mimeType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);

    if (!$data) return ['name' => null, 'path' => null];

    // 확장자 결정
    $extMap = [
        'image/jpeg' => 'jpg',
        'image/jpg'  => 'jpg',
        'image/png'  => 'png',
        'image/gif'  => 'gif',
        'image/webp' => 'webp',
    ];
    $mime = strtolower(explode(';', $mimeType)[0]);
    $ext  = $extMap[$mime] ?? pathinfo(parse_url($imgUrl, PHP_URL_PATH), PATHINFO_EXTENSION);
    $ext  = strtolower(preg_replace('/[^a-z0-9]/', '', $ext ?: 'jpg'));
    if (!in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp'], true)) $ext = 'jpg';

    $uploadDir = dirname(__DIR__) . '/uploads/news/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

    $safeName = 'img_' . date('YmdHis') . '_' . substr(md5($imgUrl), 0, 8) . '.' . $ext;
    $dest     = $uploadDir . $safeName;

    if (file_put_contents($dest, $data) === false) return ['name' => null, 'path' => null];

    return [
        'name' => $safeName,
        'path' => '/backend/uploads/news/' . $safeName,
    ];
}

$html   = fetchHtml($articleUrl);
if ($html === '') {
    echo json_encode(['success' => false, 'message' => '기사 페이지를 가져올 수 없습니다.']);
    exit;
}

$imgUrl = extractOgImage($html);
if ($imgUrl === '') {
    echo json_encode(['success' => false, 'message' => '대표이미지를 찾을 수 없습니다.']);
    exit;
}

// 상대 URL → 절대 URL 변환
if (str_starts_with($imgUrl, '//')) {
    $imgUrl = 'https:' . $imgUrl;
} elseif (str_starts_with($imgUrl, '/')) {
    $parsed = parse_url($articleUrl);
    $imgUrl = $parsed['scheme'] . '://' . $parsed['host'] . $imgUrl;
}

$file = downloadImage($imgUrl);
if (!$file['name']) {
    echo json_encode(['success' => false, 'message' => '이미지 저장에 실패했습니다.']);
    exit;
}

echo json_encode([
    'success'   => true,
    'file_name' => $file['name'],
    'file_path' => $file['path'],
]);
