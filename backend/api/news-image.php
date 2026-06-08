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

// 기사 HTML 가져오기 (EUC-KR → UTF-8 자동 변환)
function fetchHtml(string $url): string {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 10,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_ENCODING       => '',
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        CURLOPT_HTTPHEADER     => [
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language: ko-KR,ko;q=0.9,en-US;q=0.8',
            'Connection: keep-alive',
            'Upgrade-Insecure-Requests: 1',
        ],
    ]);
    $raw      = curl_exec($ch);
    $ctype    = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);
    if (!is_string($raw) || $raw === '') return '';

    // Content-Type 또는 meta charset에서 인코딩 감지
    $charset = '';
    if (preg_match('/charset=([^\s;]+)/i', $ctype, $m)) $charset = strtolower(trim($m[1]));
    if (!$charset && preg_match('/<meta[^>]+charset=["\']?([a-z0-9\-_]+)/i', $raw, $m)) $charset = strtolower(trim($m[1]));

    // EUC-KR / CP949 이면 UTF-8로 변환
    if (in_array($charset, ['euc-kr', 'ks_c_5601-1987', 'cp949', 'windows-949'], true)) {
        $converted = mb_convert_encoding($raw, 'UTF-8', 'EUC-KR');
        if ($converted !== false) return $converted;
    }
    return $raw;
}

// 도메인 → 한글 매체명 매핑
function domainToMediaName(string $url): string {
    $host = strtolower(parse_url($url, PHP_URL_HOST) ?? '');
    $host = preg_replace('/^www\./', '', $host);
    $map = [
        'chosun.com'        => '조선일보',   'donga.com'         => '동아일보',
        'joongang.co.kr'    => '중앙일보',   'joins.com'         => '중앙일보',
        'hankookilbo.com'   => '한국일보',   'hankyung.com'      => '한국경제',
        'mk.co.kr'          => '매일경제',   'sedaily.com'       => '서울경제',
        'edaily.co.kr'      => '이데일리',   'etoday.co.kr'      => '이투데이',
        'etnews.com'        => '전자신문',   'dt.co.kr'          => '디지털타임스',
        'zdnet.co.kr'       => 'ZDNet코리아','yna.co.kr'         => '연합뉴스',
        'newsis.com'        => '뉴시스',     'news1.kr'          => '뉴스1',
        'khan.co.kr'        => '경향신문',   'hani.co.kr'        => '한겨레',
        'ohmynews.com'      => '오마이뉴스', 'pressian.com'      => '프레시안',
        'mediatoday.co.kr'  => '미디어오늘', 'munhwa.com'        => '문화일보',
        'kookmin.co.kr'     => '국민일보',   'segye.com'         => '세계일보',
        'seoul.co.kr'       => '서울신문',   'kmib.co.kr'        => '국민일보',
        'fnnews.com'        => '파이낸셜뉴스','mt.co.kr'          => '머니투데이',
        'asiae.co.kr'       => '아시아경제', 'ajunews.com'       => '아주경제',
        'newspim.com'       => '뉴스핌',     'newstomato.com'    => '뉴스토마토',
        'nocutnews.co.kr'   => '노컷뉴스',   'cbs.co.kr'         => 'CBS',
        'mbc.co.kr'         => 'MBC',        'kbs.co.kr'         => 'KBS',
        'sbs.co.kr'         => 'SBS',        'jtbc.co.kr'        => 'JTBC',
        'tvchosun.com'      => 'TV조선',     'mbn.co.kr'         => 'MBN',
        'ytn.co.kr'         => 'YTN',        'tf.co.kr'          => '더팩트',
        'sisajournal.com'   => '시사저널',   'imaeil.com'        => '매일신문',
        'busan.com'         => '부산일보',   'knn.co.kr'         => 'KNN',
        'heraldcorp.com'    => '헤럴드경제', 'naver.com'         => '네이버뉴스',
        'daum.net'          => '다음뉴스',   'moneytoday.co.kr'  => '머니투데이',
        'inews24.com'       => '아이뉴스24', 'theguru.co.kr'     => '더구루',
        'businesspost.co.kr'=> '비즈니스포스트',
    ];
    foreach ($map as $domain => $name) {
        if (str_contains($host, $domain)) return $name;
    }
    return '';
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

// og:site_name 추출
function extractSiteName(string $html): string {
    if (preg_match('/<meta[^>]+property=["\']og:site_name["\'][^>]+content=["\']([^"\']+)["\'][^>]*>/i', $html, $m)) return trim($m[1]);
    if (preg_match('/<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:site_name["\'][^>]*>/i', $html, $m)) return trim($m[1]);
    return '';
}

// 기자명 추출
function extractJournalist(string $html): string {
    // 1. 주요 언론사 전용 클래스
    $classPatterns = ['byline_name','journalist_name','media_end_head_journalist_name',
                      'reporter_name','author_name','writer_name','article_info_writer'];
    foreach ($classPatterns as $cls) {
        if (preg_match('/<[^>]+class=["\'][^"\']*' . $cls . '[^"\']*["\'][^>]*>\s*([가-힣]{2,5})\s*</u', $html, $m))
            return trim($m[1]);
    }

    // 2. byline 클래스 내부에서 "기자" 앞 이름
    if (preg_match('/<[^>]+class=["\'][^"\']*byline[^"\']*["\'][^>]*>([\s\S]{1,300}?)<\/[^>]+>/u', $html, $m)) {
        $text = strip_tags($m[1]);
        if (preg_match('/([가-힣]{2,5})\s*기자/u', $text, $n)) return trim($n[1]);
        if (preg_match('/([가-힣]{2,5})\s*특파원/u', $text, $n)) return trim($n[1]);
    }

    // 3. "기자" / "특파원" 키워드 앞 한글 이름 (HTML 전체, /u 플래그)
    if (preg_match('/([가-힣]{2,5})\s*기자/u', $html, $m)) return trim($m[1]);
    if (preg_match('/([가-힣]{2,5})\s*특파원/u', $html, $m)) return trim($m[1]);

    // 4. "입력 홍길동 기자" 패턴
    if (preg_match('/입력.{0,30}?([가-힣]{2,5})\s*기자/u', $html, $m)) return trim($m[1]);

    // 5. meta author (순수 한글 이름만)
    if (preg_match('/<meta[^>]+(?:name|property)=["\'](?:author|article:author)["\'][^>]+content=["\']([^"\']{2,10})["\'][^>]*>/i', $html, $m)) {
        $val = trim($m[1]);
        if (preg_match('/^[가-힣]{2,5}$/u', $val)) return $val;
    }

    return '';
}

// 도메인 매핑은 URL만으로 즉시 결정 (HTML fetch 전)
$siteName = domainToMediaName($articleUrl);

$html = fetchHtml($articleUrl);
if ($html === '') {
    // HTML 못 가져와도 도메인 매핑 결과는 반환
    echo json_encode(['success' => false, 'message' => '기사 페이지를 가져올 수 없습니다.', 'media_name' => $siteName, 'journalist' => '']);
    exit;
}

// og:site_name으로 보완 (도메인 매핑 없을 때)
if ($siteName === '') $siteName = extractSiteName($html);
$journalist = extractJournalist($html);

$imgUrl = extractOgImage($html);
if ($imgUrl === '') {
    echo json_encode(['success' => false, 'message' => '대표이미지를 찾을 수 없습니다.', 'media_name' => $siteName, 'journalist' => $journalist]);
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
    echo json_encode(['success' => false, 'message' => '이미지 저장에 실패했습니다.', 'media_name' => $siteName, 'journalist' => $journalist]);
    exit;
}

echo json_encode([
    'success'    => true,
    'file_name'  => $file['name'],
    'file_path'  => $file['path'],
    'media_name' => $siteName,
    'journalist' => $journalist,
]);
