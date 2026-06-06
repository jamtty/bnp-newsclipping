<?php
// =============================================
// GET /api/news-fetch.php
//   ?query=검색어
//   &display=20        (1~100, 기본 20)
//   &start=1           (1~1000, 기본 1)
//   &sort=date         (date|sim, 기본 date)
//
// 네이버 뉴스 검색 API 프록시
// config.php 에 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 설정 필요
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

require_once dirname(__DIR__) . '/config.php';

// API 키 미설정 체크
if (NAVER_CLIENT_ID === 'YOUR_NAVER_CLIENT_ID') {
    http_response_code(503);
    echo json_encode(['success' => false, 'message' => '네이버 API 키가 설정되지 않았습니다. backend/config.php 에서 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 을 설정해주세요.']);
    exit;
}

$query   = trim($_GET['query']   ?? '');
$display = min(100, max(1, (int)($_GET['display'] ?? 20)));
$start   = min(1000, max(1, (int)($_GET['start']  ?? 1)));
$sort    = in_array($_GET['sort'] ?? '', ['date', 'sim']) ? $_GET['sort'] : 'date';

if ($query === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '검색어를 입력해주세요.']);
    exit;
}

$url = 'https://openapi.naver.com/v1/search/news.json?' . http_build_query([
    'query'   => $query,
    'display' => $display,
    'start'   => $start,
    'sort'    => $sort,
]);

$ctx = stream_context_create([
    'http' => [
        'method'  => 'GET',
        'header'  => implode("\r\n", [
            'X-Naver-Client-Id: '     . NAVER_CLIENT_ID,
            'X-Naver-Client-Secret: ' . NAVER_CLIENT_SECRET,
        ]),
        'timeout' => 10,
        'ignore_errors' => true,
    ],
]);

$body = @file_get_contents($url, false, $ctx);

if ($body === false) {
    http_response_code(502);
    echo json_encode(['success' => false, 'message' => '네이버 API 호출에 실패했습니다.']);
    exit;
}

// HTTP 상태 코드 확인
$httpStatus = 200;
foreach ($http_response_header as $h) {
    if (preg_match('/HTTP\/\d\.\d\s+(\d+)/', $h, $m)) {
        $httpStatus = (int)$m[1];
    }
}

if ($httpStatus !== 200) {
    http_response_code($httpStatus);
    $err = json_decode($body, true);
    echo json_encode(['success' => false, 'message' => $err['errorMessage'] ?? '네이버 API 오류']);
    exit;
}

$result = json_decode($body, true);
if (!$result) {
    http_response_code(502);
    echo json_encode(['success' => false, 'message' => '응답 파싱 오류']);
    exit;
}

// HTML 태그 제거 헬퍼
$strip = fn(string $s) => html_entity_decode(strip_tags($s), ENT_QUOTES | ENT_HTML5, 'UTF-8');

$items = array_map(function ($item) use ($strip) {
    return [
        'title'       => $strip($item['title']       ?? ''),
        'link'        => $item['originallink'] ?: $item['link'] ?? '',
        'description' => $strip($item['description'] ?? ''),
        'pub_date'    => $item['pubDate'] ?? '',
        'source'      => parse_url($item['originallink'] ?: $item['link'] ?? '', PHP_URL_HOST) ?? '',
    ];
}, $result['items'] ?? []);

echo json_encode([
    'success' => true,
    'total'   => $result['total']   ?? 0,
    'display' => $result['display'] ?? $display,
    'start'   => $result['start']   ?? $start,
    'items'   => $items,
]);
