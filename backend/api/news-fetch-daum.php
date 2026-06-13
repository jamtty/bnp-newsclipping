<?php
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

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'GET only']);
    exit;
}

$query = trim($_GET['query'] ?? '');
$page  = max(1, (int)($_GET['page'] ?? 1));
$sort  = ($_GET['sort'] ?? 'recency') === 'accuracy' ? '0' : '1';

if ($query === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '검색어를 입력해주세요.']);
    exit;
}

$url = 'https://search.daum.net/search?' . http_build_query([
    'w'    => 'news',
    'q'    => $query,
    'p'    => $page,
    'sort' => $sort,
]);

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_ENCODING       => '',
    CURLOPT_HTTPHEADER     => [
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language: ko-KR,ko;q=0.9',
        'Referer: https://search.daum.net/',
    ],
]);
$html      = curl_exec($ch);
$httpStatus = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError  = curl_error($ch);
curl_close($ch);

if ($html === false || $curlError) {
    http_response_code(502);
    echo json_encode(['success' => false, 'message' => '페이지 로드 실패: ' . $curlError]);
    exit;
}
if ($httpStatus !== 200) {
    http_response_code(502);
    echo json_encode(['success' => false, 'message' => '다음 서버 오류 (HTTP ' . $httpStatus . ')']);
    exit;
}

$dom = new DOMDocument('1.0', 'UTF-8');
libxml_use_internal_errors(true);
$dom->loadHTML('<?xml encoding="UTF-8">' . $html);
libxml_clear_errors();

$xpath = new DOMXPath($dom);
$items = [];
$seen  = [];

// v.daum.net/v/ 로 시작하는 기사 링크 전체 수집
$links = $xpath->query('//a[contains(@href,"v.daum.net/v/")]');

foreach ($links as $a) {
    $href = $a->getAttribute('href');
    // 정규 기사 URL 패턴 확인
    if (!preg_match('#v\.daum\.net/v/\d+#', $href)) continue;
    // 중복 제거
    if (isset($seen[$href])) continue;
    $seen[$href] = true;

    $title = trim(preg_replace('/\s+/', ' ', $a->textContent));
    if ($title === '') continue;
    // 댓글 수 등 숫자만 있는 링크 제외
    if (preg_match('/^\d+$/', $title)) continue;

    // a 태그의 부모/조상 중 클래스를 가진 컨테이너 찾기 (최대 5단계)
    $container = $a->parentNode;
    for ($i = 0; $i < 5; $i++) {
        if (!$container || $container->nodeName === 'body') break;
        $cls = $container->getAttribute('class') ?? '';
        if ($cls !== '') break;
        $container = $container->parentNode;
    }

    // 설명 (a 다음 형제 텍스트 노드 또는 p)
    $description = '';
    $sibling = $a->nextSibling;
    while ($sibling) {
        $text = trim(preg_replace('/\s+/', ' ', $sibling->textContent ?? ''));
        if ($text !== '') { $description = $text; break; }
        $sibling = $sibling->nextSibling;
    }
    // 컨테이너 안에서 설명 재탐색
    if ($description === '' && $container) {
        $descNode = $xpath->query('.//*[contains(@class,"desc") or contains(@class,"contents") or contains(@class,"summary")]', $container)->item(0);
        if ($descNode) {
            $description = trim(preg_replace('/\s+/', ' ', $descNode->textContent));
        }
    }

    // 날짜
    $pub_date = '';
    if ($container) {
        $dateNode = $xpath->query('.//*[contains(@class,"time") or contains(@class,"date") or contains(@class,"num-date")]', $container)->item(0);
        if ($dateNode) $pub_date = trim($dateNode->textContent);
    }

    // 언론사: a 이전 형제 또는 컨테이너 내 press 클래스
    $source = '';
    if ($container) {
        $srcNode = $xpath->query('.//*[contains(@class,"press") or contains(@class,"channel") or contains(@class,"source") or contains(@class,"info_detail")]', $container)->item(0);
        if ($srcNode) $source = trim($srcNode->textContent);
    }

    $items[] = [
        'title'       => $title,
        'link'        => $href,
        'description' => $description,
        'pub_date'    => $pub_date,
        'source'      => $source,
    ];
}

if (count($items) === 0) {
    echo json_encode([
        'success' => false,
        'message' => '뉴스 항목을 파싱하지 못했습니다.',
        'debug'   => mb_substr(strip_tags($html), 0, 800),
    ]);
    exit;
}

echo json_encode([
    'success' => true,
    'total'   => count($items) >= 10 ? 9999 : count($items),
    'is_end'  => count($items) < 10,
    'page'    => $page,
    'items'   => $items,
]);