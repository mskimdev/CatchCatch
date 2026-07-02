-- ================================================================================
--  CatchCatch 전체 더미 데이터 (MySQL 8.0+ 호환판)
--  db/data/dummy.sql(H2 전용)의 1:1 이식본. 로직/값은 동일하며 다음 구문만 변환했다:
--    SYSTEM_RANGE(1,n)        -> WITH RECURSIVE seq(x) AS (...) 재귀 CTE
--    DATEADD(unit, n, date)   -> DATE_ADD(date, INTERVAL n unit)
--    문자열 연결 ||            -> CONCAT(...)
--    CAST(x AS VARCHAR)       -> CAST(x AS CHAR)
--    MERGE INTO ... KEY (..)  -> INSERT IGNORE (concert_like_tb.uk_concert_like_tb 유니크 제약 이용)
--    FROM (VALUES ...) AS s(sid) -> FROM (SELECT n AS sid UNION ALL ...) AS s
--  삽입 순서 (FK 의존성):
--    user → venue → concert → concert_session → seat
--    → queue → booking → booking_seat → payment → refund
--    → point_history → concert_like → operation_log
--    → notice → faq → inquiry → event(banner) → employee
--  SET문은 세션 한정이며 재귀 CTE 깊이(5000+)를 위해 필요하다.
-- ================================================================================

SET SESSION cte_max_recursion_depth = 6000;

-- ================
--  user_tb
--  비밀번호: 전부 "ssar1234" BCrypt
-- ================
INSERT INTO user_tb (username, password, email, phone, profile_image, oauth_provider, role, point, created_at, is_deleted)
VALUES
    ('admin',    '$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK', 'admin@catchcatch.com',    '010-0000-0000', NULL, 'LOCAL', 'ADMIN', 0,     NOW(), false),
    ('manager', '$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK', 'manager@catchcatch.com', '010-2222-2222', NULL, 'LOCAL', 'MANAGER', 0, NOW(), false),
    ('user1',    '$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK', 'user1@test.com',          '010-1111-1111', NULL, 'LOCAL', 'USER',  0,     NOW(), false),
    ('user2',    '$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK', 'user2@test.com',          '010-2222-2222', NULL, 'LOCAL', 'USER',  0,     NOW(), false),
    ('user3',    '$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK', 'user3@test.com',          '010-3333-3333', NULL, 'LOCAL', 'USER',  0,     NOW(), false),
    ('kakaouser','$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK', 'kakao_12345@kakao.com',   '010-4444-4444', NULL, 'KAKAO', 'USER',  0,     NOW(), false),
    ('ssar',     '$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK', 'ssar@naver.com',          '010-5729-1754', NULL, 'LOCAL', 'USER',  0,     NOW(), false);

-- 실사용자 200명 (realuser1~200), 최근 6개월 내 가입, 20%는 카카오 소셜
INSERT INTO user_tb (username, password, email, phone, profile_image, oauth_provider, role, point, created_at, is_deleted)
WITH RECURSIVE seq(x) AS (
    SELECT 1
    UNION ALL
    SELECT x + 1 FROM seq WHERE x < 200
)
SELECT
    CONCAT('realuser', x),
    '$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK',
    CONCAT('realuser', x, '@catchcatch.com'),
    CONCAT('010-', LPAD(CAST(MOD(x, 10000) AS CHAR), 4, '0'), '-', LPAD(CAST(MOD(x * 37, 10000) AS CHAR), 4, '0')),
    NULL,
    CASE WHEN MOD(x, 5) = 0 THEN 'KAKAO' ELSE 'LOCAL' END,
    'USER',
    MOD(x * 173, 50000),
    DATE_ADD(NOW(), INTERVAL -MOD(x * 7, 180) DAY),
    false
FROM seq;

-- k6 부하테스트용 유저 5000명
INSERT INTO user_tb (username, password, email, phone, profile_image, oauth_provider, role, point, created_at, is_deleted)
WITH RECURSIVE seq(x) AS (
    SELECT 1
    UNION ALL
    SELECT x + 1 FROM seq WHERE x < 5000
)
SELECT
    CONCAT('loadgen', x),
    '$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK',
    CONCAT('loadgen', x, '@test.com'),
    '010-0000-0000',
    NULL, 'LOCAL', 'USER', 0, NOW(), false
FROM seq;
-- user_id 기준:
--   1=admin, 2=user1, 3=user2, 4=user3, 5=kakaouser, 6=ssar
--   7~206 = realuser1~200
--   207~5206 = loadgen1~5000

-- 후기 테스트 전용 계정
-- 비밀번호: ssar1234
INSERT INTO user_tb (username, password, email, phone, profile_image, oauth_provider, role, point, created_at, is_deleted)
VALUES
    ('sarr', '$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK', 'sarr@naver.com', '010-7777-7777', NULL, 'LOCAL', 'USER', 0, NOW(), false);
--   5207=sarr (후기 테스트)


-- ================
--  venue_tb
-- ================
INSERT INTO venue_tb (name, address, total_capacity, seat_map_file_path, created_at)
VALUES
    ('고척스카이돔',          '서울특별시 구로구 경인로 430',                25000, NULL, NOW()),
    ('고려대학교 화정체육관',  '서울특별시 성북구 안암로 145',                6000,  '/json/seatmap/seatmap-concert-session.json', NOW()),
    ('장충체육관',            '서울특별시 중구 을지로 241',                  8000,  NULL, NOW()),
    ('세종문화회관 대극장',    '서울특별시 종로구 세종대로 175',               3000,  NULL, NOW()),
    ('일산 킨텍스 제1전시장', '경기도 고양시 일산서구 킨텍스로 217-60',       20000, NULL, NOW()),
    ('인천 파라다이스시티',    '인천광역시 중구 영종해안남로321번길 186',       15000, NULL, NOW()),
    ('k6 부하테스트 공연장 A','서울특별시 송파구 올림픽로 000',               1000,  NULL, NOW()),
    ('k6 부하테스트 공연장 B','서울특별시 송파구 올림픽로 001',               15000, '/temp/seatmap/seats/example-seatmap-seats.json', NOW());
-- venue_id: 1=고척스카이돔, 2=고려대화정, 3=장충체육관, 4=세종문화회관, 5=킨텍스, 6=파라다이스시티, 7=k6A, 8=k6B


-- ================
--  concert_tb
-- ================
INSERT INTO concert_tb
(venue_id, title, artist, description, poster_url, status,
 genre, start_date, end_date, ticket_open_date, age_limit, runtime, organizer, contact,
 detail_banner_url, detail_title, detail_description2,
 price_vip, price_r, price_s, price_a, created_at, is_deleted)
VALUES
    (2, 'Red Velvet FAN-CON 〈A Day in Red & Velvet〉', 'Red Velvet',
     '레드벨벳의 공식 팬콘서트. 역대 최고의 셋리스트와 화려한 퍼포먼스로 레베럿과 함께하는 특별한 두 밤.',
     '/images/posters/poster-redvelvet.jpg', 'OPEN', 'FANMEETING',
     '2026-08-01', '2026-08-02', '2026-06-15 20:00:00', '전체 관람가', '120분', 'SM 엔터테인먼트', '1544-1111',
     '/images/details/detail-redvelvet.jpg', '레드벨벳과 함께하는 특별한 여름',
     '고려대학교 화정체육관을 가득 채울 열기와 감동',
     132000, 110000, 88000, 0, NOW(), false),

    (4, '뮤지컬 〈베토벤〉', '뮤지컬 배우 앙상블',
     '천재 음악가 베토벤의 삶과 음악을 무대 위에 펼쳐내는 대작 뮤지컬. 세종문화회관 대극장에서의 감동적인 공연.',
     '/images/posters/poster-beethoven.jpg', 'OPEN', 'MUSICAL',
     '2026-06-09', '2026-08-11', '2026-04-15 14:00:00', '만 7세 이상 관람가', '150분 (인터미션 20분)', '신시컴퍼니', '1544-2222',
     '/images/details/detail-beethoven.jpg', '천재의 고뇌와 열정이 만들어낸 불멸의 선율',
     '세종문화회관 대극장을 가득 채울 웅장한 무대',
     0, 150000, 130000, 110000, NOW(), false),

    (1, '2027 후지이 카제 Prema 월드 투어 - 서울', '후지이 카제',
     '고척스카이돔을 매진시킨 후지이 카제의 두 번째 내한공연. Prema 월드투어 서울 단독 공연.',
     '/images/posters/poster-fujiikaze.jpg', 'COMING_SOON', 'CONCERT',
     '2027-01-09', '2027-01-09', '2026-09-05 12:00:00', '전체 관람가', '120분', '현대카드', '1644-1234',
     '/images/details/detail-fujiikaze.jpg', '다시 한번 고척돔을 가득 채울 그의 목소리',
     '단 하루뿐인 서울 공연, 놓치지 마세요',
     165000, 143000, 121000, 99000, NOW(), false),

    (5, '워터밤 서울 2026', '다수 아티스트',
     '국내 최대 규모 물총 축제 워터밤! 역대 최대 라인업으로 돌아온 여름 대표 페스티벌. 3일간 킨텍스를 가득 채울 뜨거운 열기.',
     '/images/posters/poster-waterbomb.jpg', 'OPEN', 'FESTIVAL',
     '2026-07-24', '2026-07-26', '2026-05-20 12:00:00', '만 18세 이상 관람가', '360분', '워터밤 컴퍼니', '1544-7755',
     '/images/details/detail-waterbomb.jpg', '2026년 여름, 가장 뜨거운 3일',
     '킨텍스를 흠뻑 적실 잊지 못할 여름 추억',
     220000, 90000, 0, 0, NOW(), false),

    (6, '사운드 플래닛 페스티벌 2026', '다수 아티스트',
     '국내외 정상급 뮤지션들이 총출동하는 대규모 음악 페스티벌. 인천 파라다이스시티에서 펼쳐지는 2일간의 음악 축제.',
     '/images/posters/poster-soundplanet.jpg', 'OPEN', 'FESTIVAL',
     '2026-09-05', '2026-09-06', '2026-05-15 20:00:00', '전체 관람가', '480분', '사운드 리퍼블리카', '1544-4455',
     '/images/details/detail-soundplanet.png', '바다와 음악이 만나는 최고의 페스티벌',
     '인천 파라다이스시티에서 즐기는 낭만적인 음악 축제',
     0, 143000, 0, 0, NOW(), false),

    (3, 'ICN 〉 NTG : BIG Naughty Concert', 'BIG Naughty (서동현)',
     '힙합 씬의 신성 BIG Naughty(서동현)의 단독 콘서트. 장충체육관을 가득 채울 에너지 넘치는 무대.',
     '/images/posters/poster-bignaughty.jpg', 'CLOSED_SOON', 'CONCERT',
     '2026-07-11', '2026-07-11', '2026-06-10 20:00:00', '만 7세 이상 관람가', '120분', 'BIGHIT MUSIC', '1544-3366',
     '/images/details/detail-bignaughty.png', '힙합을 넘어선 음악적 진화',
     '장충체육관을 뒤흔들 역대급 퍼포먼스',
     110000, 99000, 0, 0, NOW(), false),

    (3, 'David Byrne Who Is The Sky? Tour', 'David Byrne',
     '토킹 헤즈 리더이자 전설적인 뮤지션 데이비드 번의 첫 단독 내한공연. 반세기를 아우르는 명곡들과의 만남.',
     '/images/posters/poster-davidbyrne.png', 'OPEN', 'CONCERT',
     '2026-08-21', '2026-08-21', '2026-05-30 12:00:00', '전체 관람가', '120분', '라이브네이션코리아', '1588-7828',
     '/images/details/detail-davidbyrne.png', '살아있는 전설이 서울을 찾아옵니다',
     '경희대 평화의전당에서 펼쳐지는 단 하루의 공연',
     0, 143000, 121000, 99000, NOW(), false),

    (2, '나상현씨밴드 클럽투어 ''여름빛 2026'' - 서울', '나상현씨밴드',
     '인디 밴드 나상현씨밴드의 전국 클럽투어 서울 공연. 뜨거운 여름밤을 수놓을 소규모 라이브의 감동.',
     '/images/posters/poster-nasanghyun.jpg', 'OPEN', 'CONCERT',
     '2026-08-30', '2026-08-30', '2026-06-20 12:00:00', '전체 관람가', '100분', '인디레이블 소속', '02-1234-5678',
     '/images/details/detail-nasanghyun.jpg', '여름밤과 가장 잘 어울리는 인디의 감성',
     '소규모 공연장에서만 느낄 수 있는 뜨거운 라이브',
     0, 0, 44000, 33000, NOW(), false),

    (4, '정명훈x KBS교향악단x김선욱 〈베토벤+브람스〉', '정명훈, 김선욱',
     '마에스트로 정명훈과 피아니스트 김선욱이 KBS교향악단과 함께하는 세기의 클래식 공연. 베토벤과 브람스의 걸작을 세종문화회관 대극장에서.',
     '/images/posters/poster-myunghun.jpg', 'COMING_SOON', 'CLASSIC',
     '2026-10-04', '2026-10-04', '2026-08-20 12:00:00', '만 7세 이상 관람가', '100분 (인터미션 20분)', '세종문화회관', '02-399-1000',
     '/images/details/detail-myunghun.jpg', '두 거장이 함께하는 클래식의 밤',
     '세종문화회관 대극장에서 만나는 베토벤과 브람스의 걸작',
     120000, 100000, 80000, 60000, NOW(), false),

    -- k6 부하테스트 전용 콘서트 2개
    (7, 'k6 부하테스트 콘서트 A', 'k6',
     'k6 부하 테스트 전용 콘서트 데이터 A.',
     '/images/sample/poster-music.svg', 'OPEN', 'CONCERT',
     '2026-12-31', '2026-12-31', '2026-01-01 00:00:00', '전체 관람가', '120분', 'k6', '000-0000-0000',
     '/images/sample/detail-banner.svg', 'k6 부하테스트 A', 'k6 부하 테스트 전용',
     100000, 80000, 60000, 40000, NOW(), false),

    (8, 'k6 부하테스트 콘서트 B', 'k6',
     'k6 부하 테스트 전용 콘서트 데이터 B.',
     '/images/sample/poster-music.svg', 'OPEN', 'CONCERT',
     '2026-07-04', '2026-07-04', '2026-01-01 00:00:00', '전체 관람가', '120분', 'k6', '000-0000-0000',
     '/images/sample/detail-banner.svg', 'k6 부하테스트 B', 'k6 부하 테스트 전용',
     100000, 80000, 60000, 40000, NOW(), false),

    (5, '2026 전주얼티밋뮤직페스티벌', '다수 아티스트',
     '전주 완산야구장에서 펼쳐지는 대한민국 대표 여름 뮤직 페스티벌. 국내외 정상급 아티스트들이 총출동하는 역대 최강 라인업.',
     '/images/banners/banner-jeonju-festival.jpg', 'OPEN', 'FESTIVAL',
     '2026-08-07', '2026-08-09', '2026-06-20 20:00:00', '만 14세 이상 관람가', '360분', 'JUMF 조직위원회', '1544-7766',
     '/images/banners/banner-jeonju-festival.jpg', '전주에서 만나는 여름의 절정',
     '전주 완산야구장을 가득 채울 잊지 못할 여름 추억',
     0, 110000, 88000, 0, NOW(), false),

    (6, '2026 인천 펜타포트 락 페스티벌', '다수 아티스트',
     '국내외 최정상 록 아티스트들이 한자리에! KB국민카드와 함께하는 인천 펜타포트 락 페스티벌 2026.',
     '/images/banners/banner-pentaport.png', 'OPEN', 'FESTIVAL',
     '2026-07-31', '2026-08-02', '2026-06-10 12:00:00', '전체 관람가', '480분', '펜타포트 페스티벌 조직위', '032-123-4567',
     '/images/banners/banner-pentaport.png', '인천에서 울려 퍼지는 록의 함성',
     '송도달빛축제공원에서 즐기는 여름 최고의 록 페스티벌',
     0, 132000, 99000, 0, NOW(), false);
-- concert_id: 1=RedVelvet, 2=뮤지컬베토벤, 3=후지이카제, 4=워터밤, 5=사운드플래닛, 6=BIGNaughty, 7=DavidByrne, 8=나상현씨밴드, 9=정명훈클래식, 10=k6A, 11=k6B, 12=전주얼티밋뮤직페스티벌, 13=인천펜타포트


-- ================
--  concert_session_tb
-- ================
INSERT INTO concert_session_tb (concert_id, session_date, session_time, round, created_at, is_deleted)
VALUES
    (1,  '2026-08-01', '18:00:00', '1회차', NOW(), false),  -- session_id 1  (RedVelvet 1일차)
    (1,  '2026-08-02', '18:00:00', '2회차', NOW(), false),  -- session_id 2  (RedVelvet 2일차)
    (2,  '2026-07-11', '19:00:00', '1회차', NOW(), false),  -- session_id 3  (뮤지컬베토벤)
    (2,  '2026-07-18', '19:00:00', '2회차', NOW(), false),  -- session_id 4  (뮤지컬베토벤)
    (2,  '2026-08-08', '19:00:00', '3회차', NOW(), false),  -- session_id 5  (뮤지컬베토벤)
    (3,  '2027-01-09', '18:00:00', '1회차', NOW(), false),  -- session_id 6  (후지이카제)
    (4,  '2026-07-24', '17:00:00', '07.24', NOW(), false),  -- session_id 7  (워터밤 1일차)
    (4,  '2026-07-25', '17:00:00', '07.25', NOW(), false),  -- session_id 8  (워터밤 2일차)
    (4,  '2026-07-26', '17:00:00', '07.26', NOW(), false),  -- session_id 9  (워터밤 3일차)
    (5,  '2026-09-05', '16:00:00', '1일차', NOW(), false),  -- session_id 10 (사운드플래닛 1일차)
    (5,  '2026-09-06', '16:00:00', '2일차', NOW(), false),  -- session_id 11 (사운드플래닛 2일차)
    (6,  '2026-07-11', '19:00:00', '1회차', NOW(), false),  -- session_id 12 (BIGNaughty)
    (7,  '2026-08-21', '19:00:00', '1회차', NOW(), false),  -- session_id 13 (DavidByrne)
    (8,  '2026-08-30', '20:00:00', '1회차', NOW(), false),  -- session_id 14 (나상현씨밴드)
    (9,  '2026-10-04', '17:00:00', '1회차', NOW(), false),  -- session_id 15 (정명훈클래식)
    (10, '2026-12-31', '20:00:00', '1회차', NOW(), false),  -- session_id 16 (k6A)
    (11, '2026-07-04', '10:00:00', '25일 임시', NOW(), false), -- session_id 17 (k6B)
    (12, '2026-08-07', '16:00:00', '1일차', NOW(), false),  -- session_id 18 (전주얼티밋뮤직페스티벌 1일차)
    (12, '2026-08-08', '16:00:00', '2일차', NOW(), false),  -- session_id 19 (전주얼티밋뮤직페스티벌 2일차)
    (12, '2026-08-09', '16:00:00', '3일차', NOW(), false),  -- session_id 20 (전주얼티밋뮤직페스티벌 3일차)
    (13, '2026-07-31', '17:00:00', '1일차', NOW(), false),  -- session_id 21 (인천펜타포트 1일차)
    (13, '2026-08-01', '17:00:00', '2일차', NOW(), false),  -- session_id 22 (인천펜타포트 2일차)
    (13, '2026-08-02', '17:00:00', '3일차', NOW(), false);  -- session_id 23 (인천펜타포트 3일차)

-- 후기 작성 테스트용 종료 회차
-- sarr/ssar가 어떤 콘서트 상세에서도 후기 작성 조건을 통과할 수 있도록 모든 콘서트에 과거 회차를 추가한다.
INSERT INTO concert_session_tb (concert_id, session_date, session_time, round, created_at, is_deleted)
SELECT
    c.id,
    DATE_ADD(CURRENT_DATE, INTERVAL -7 DAY),
    TIME '10:00:00',
    '후기 테스트',
    NOW(),
    false
FROM concert_tb c;


-- ================
--  seat_tb
--  session 1~2 (RedVelvet 1~2회차): VIP 50 / R 100 / S 200 / A 150 = 500
--  session 3~15 (나머지 공연): each R 80 / S 120 / A 50 = 250
--  session 16,17 (k6): each A 1000
-- ================

-- session 1: VIP 50
INSERT INTO seat_tb (session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, updated_at)
WITH RECURSIVE seq(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM seq WHERE x < 50)
SELECT 1, 1, 'VIP', 'A', x, CONCAT('VIP A-', x), 'VIP', 150000,
    CASE WHEN MOD(x, 3) = 0 THEN 'SOLD' ELSE 'AVAILABLE' END, NOW()
FROM seq;

-- session 1: R 100
INSERT INTO seat_tb (session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, updated_at)
WITH RECURSIVE seq(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM seq WHERE x < 100)
SELECT 1, 1, 'R', 'B', x, CONCAT('R B-', x), 'R', 130000,
    CASE WHEN MOD(x, 4) = 0 THEN 'SOLD' ELSE 'AVAILABLE' END, NOW()
FROM seq;

-- session 1: S 200
INSERT INTO seat_tb (session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, updated_at)
WITH RECURSIVE seq(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM seq WHERE x < 200)
SELECT 1, 2, 'S', 'C', x, CONCAT('S C-', x), 'S', 110000,
    CASE WHEN MOD(x, 5) = 0 THEN 'SOLD' ELSE 'AVAILABLE' END, NOW()
FROM seq;

-- session 1: A 150
INSERT INTO seat_tb (session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, updated_at)
WITH RECURSIVE seq(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM seq WHERE x < 150)
SELECT 1, 2, 'A', 'D', x, CONCAT('A D-', x), 'A', 90000,
    CASE WHEN MOD(x, 6) = 0 THEN 'SOLD' ELSE 'AVAILABLE' END, NOW()
FROM seq;

-- session 2: VIP 50
INSERT INTO seat_tb (session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, updated_at)
WITH RECURSIVE seq(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM seq WHERE x < 50)
SELECT 2, 1, 'VIP', 'A', x, CONCAT('VIP A-', x), 'VIP', 150000,
    CASE WHEN MOD(x, 4) = 0 THEN 'SOLD' WHEN MOD(x, 7) = 0 THEN 'HELD' ELSE 'AVAILABLE' END, NOW()
FROM seq;

-- session 2: R 100
INSERT INTO seat_tb (session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, updated_at)
WITH RECURSIVE seq(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM seq WHERE x < 100)
SELECT 2, 1, 'R', 'B', x, CONCAT('R B-', x), 'R', 130000,
    CASE WHEN MOD(x, 5) = 0 THEN 'SOLD' ELSE 'AVAILABLE' END, NOW()
FROM seq;

-- session 2: S 200
INSERT INTO seat_tb (session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, updated_at)
WITH RECURSIVE seq(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM seq WHERE x < 200)
SELECT 2, 2, 'S', 'C', x, CONCAT('S C-', x), 'S', 110000,
    CASE WHEN MOD(x, 6) = 0 THEN 'SOLD' ELSE 'AVAILABLE' END, NOW()
FROM seq;

-- session 2: A 150
INSERT INTO seat_tb (session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, updated_at)
WITH RECURSIVE seq(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM seq WHERE x < 150)
SELECT 2, 2, 'A', 'D', x, CONCAT('A D-', x), 'A', 90000,
    CASE WHEN MOD(x, 7) = 0 THEN 'SOLD' ELSE 'AVAILABLE' END, NOW()
FROM seq;

-- session 3~15: each 250 seats (R 80 / S 120 / A 50)
INSERT INTO seat_tb (session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, updated_at)
WITH RECURSIVE seq(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM seq WHERE x < 80)
SELECT sid, 1, 'R', 'A', x, CONCAT('R A-', x), 'R', 130000,
    CASE WHEN MOD(x * sid, 5) = 0 THEN 'SOLD' ELSE 'AVAILABLE' END, NOW()
FROM (SELECT 3 AS sid UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7
      UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
      UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15) AS s
CROSS JOIN seq;

INSERT INTO seat_tb (session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, updated_at)
WITH RECURSIVE seq(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM seq WHERE x < 120)
SELECT sid, 2, 'S', 'B', x, CONCAT('S B-', x), 'S', 110000,
    CASE WHEN MOD(x * sid, 6) = 0 THEN 'SOLD' ELSE 'AVAILABLE' END, NOW()
FROM (SELECT 3 AS sid UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7
      UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
      UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15) AS s
CROSS JOIN seq;

INSERT INTO seat_tb (session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, updated_at)
WITH RECURSIVE seq(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM seq WHERE x < 50)
SELECT sid, 2, 'A', 'C', x, CONCAT('A C-', x), 'A', 90000,
    CASE WHEN MOD(x * sid, 7) = 0 THEN 'SOLD' ELSE 'AVAILABLE' END, NOW()
FROM (SELECT 3 AS sid UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7
      UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
      UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15) AS s
CROSS JOIN seq;

-- session 16 (k6A): 1000 A seats
INSERT INTO seat_tb (session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, updated_at)
WITH RECURSIVE seq(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM seq WHERE x < 1000)
SELECT 16, 1, 'A', 'A', x, CONCAT('A A-', x), 'A', 40000, 'AVAILABLE', NOW()
FROM seq;

-- session 17 (k6B): SeatTrace example seats, 3462 seats
-- STANDING_C의 SR 등급은 현재 Seat.Grade enum(VIP/R/S/A)에 맞춰 S로 저장한다.
INSERT INTO seat_tb (session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, updated_at)
WITH RECURSIVE seq(x) AS (
    SELECT 1
    UNION ALL
    SELECT x + 1 FROM seq WHERE x < 100
),
row_config AS (
    SELECT 1 AS seat_floor, 'VIP_A' AS section_name, 'A' AS seat_row, 8 AS seat_count, 'VIP' AS grade, 165000 AS price
    UNION ALL SELECT 1, 'VIP_A', 'B', 8, 'VIP', 165000
    UNION ALL SELECT 1, 'VIP_A', 'C', 8, 'VIP', 165000
    UNION ALL SELECT 1, 'VIP_B', 'A', 8, 'VIP', 165000
    UNION ALL SELECT 1, 'VIP_B', 'B', 8, 'VIP', 165000
    UNION ALL SELECT 1, 'VIP_B', 'C', 8, 'VIP', 165000
    UNION ALL SELECT 1, 'STANDING_C', 'A', 75, 'S', 90000
    UNION ALL SELECT 1, 'STANDING_C', 'B', 75, 'S', 90000
    UNION ALL SELECT 1, 'STANDING_C', 'C', 75, 'S', 90000
    UNION ALL SELECT 1, 'STANDING_C', 'D', 75, 'S', 90000
    UNION ALL SELECT 1, 'STANDING_C', 'E', 75, 'S', 90000
    UNION ALL SELECT 1, 'STANDING_C', 'F', 75, 'S', 90000
    UNION ALL SELECT 1, 'STANDING_C', 'G', 75, 'S', 90000
    UNION ALL SELECT 1, 'STANDING_C', 'H', 75, 'S', 90000
    UNION ALL SELECT 1, 'STANDING_C', 'I', 75, 'S', 90000
    UNION ALL SELECT 1, 'STANDING_C', 'J', 75, 'S', 90000
    UNION ALL SELECT 1, 'STANDING_C', 'K', 75, 'S', 90000
    UNION ALL SELECT 1, 'STANDING_C', 'L', 75, 'S', 90000
    UNION ALL SELECT 1, 'STANDING_C', 'M', 75, 'S', 90000
    UNION ALL SELECT 1, 'STANDING_C', 'N', 75, 'S', 90000
    UNION ALL SELECT 1, 'STANDING_C', 'O', 75, 'S', 90000
    UNION ALL SELECT 1, 'STANDING_C', 'P', 75, 'S', 90000
    UNION ALL SELECT 1, 'STANDING_C', 'Q', 75, 'S', 90000
    UNION ALL SELECT 1, 'STANDING_C', 'R', 75, 'S', 90000
    UNION ALL SELECT 1, 'STANDING_C', 'S', 75, 'S', 90000
    UNION ALL SELECT 1, 'STANDING_C', 'T', 75, 'S', 90000
    UNION ALL SELECT 1, 'STANDING_C', 'U', 75, 'S', 90000
    UNION ALL SELECT 1, 'STANDING_C', 'V', 75, 'S', 90000
    UNION ALL SELECT 1, 'STANDING_C', 'W', 75, 'S', 90000
    UNION ALL SELECT 1, 'STANDING_C', 'X', 75, 'S', 90000
    UNION ALL SELECT 2, 'D2', 'A', 5, 'A', 90000
    UNION ALL SELECT 2, 'D2', 'B', 15, 'A', 90000
    UNION ALL SELECT 2, 'D2', 'C', 16, 'A', 90000
    UNION ALL SELECT 2, 'D2', 'D', 16, 'A', 90000
    UNION ALL SELECT 2, 'D2', 'E', 17, 'A', 90000
    UNION ALL SELECT 2, 'D2', 'F', 18, 'A', 90000
    UNION ALL SELECT 2, 'D2', 'G', 21, 'A', 90000
    UNION ALL SELECT 2, 'D2', 'H', 22, 'A', 90000
    UNION ALL SELECT 2, 'D2', 'I', 23, 'A', 90000
    UNION ALL SELECT 2, 'D2', 'J', 23, 'A', 90000
    UNION ALL SELECT 2, 'D2', 'K', 20, 'A', 90000
    UNION ALL SELECT 2, 'S_C2', 'A', 8, 'S', 110000
    UNION ALL SELECT 2, 'S_C2', 'B', 8, 'S', 110000
    UNION ALL SELECT 2, 'S_C2', 'C', 9, 'S', 110000
    UNION ALL SELECT 2, 'S_C2', 'D', 10, 'S', 110000
    UNION ALL SELECT 2, 'S_C2', 'E', 11, 'S', 110000
    UNION ALL SELECT 2, 'S_C2', 'F', 12, 'S', 110000
    UNION ALL SELECT 2, 'S_C2', 'G', 12, 'S', 110000
    UNION ALL SELECT 2, 'S_C2', 'H', 13, 'S', 110000
    UNION ALL SELECT 2, 'C2', 'A', 11, 'R', 130000
    UNION ALL SELECT 2, 'C2', 'B', 11, 'R', 130000
    UNION ALL SELECT 2, 'C2', 'C', 12, 'R', 130000
    UNION ALL SELECT 2, 'C2', 'D', 13, 'R', 130000
    UNION ALL SELECT 2, 'C2', 'E', 14, 'R', 130000
    UNION ALL SELECT 2, 'C2', 'F', 15, 'R', 130000
    UNION ALL SELECT 2, 'C2', 'G', 16, 'R', 130000
    UNION ALL SELECT 2, 'C2', 'H', 17, 'R', 130000
    UNION ALL SELECT 2, 'C2', 'I', 18, 'R', 130000
    UNION ALL SELECT 2, 'S_B2', 'A', 11, 'S', 110000
    UNION ALL SELECT 2, 'S_B2', 'B', 12, 'S', 110000
    UNION ALL SELECT 2, 'S_B2', 'C', 12, 'S', 110000
    UNION ALL SELECT 2, 'S_B2', 'D', 12, 'S', 110000
    UNION ALL SELECT 2, 'S_B2', 'E', 12, 'S', 110000
    UNION ALL SELECT 2, 'S_B2', 'F', 12, 'S', 110000
    UNION ALL SELECT 2, 'S_B2', 'G', 11, 'S', 110000
    UNION ALL SELECT 2, 'B2', 'A', 11, 'R', 130000
    UNION ALL SELECT 2, 'B2', 'B', 12, 'R', 130000
    UNION ALL SELECT 2, 'B2', 'C', 14, 'R', 130000
    UNION ALL SELECT 2, 'B2', 'D', 15, 'R', 130000
    UNION ALL SELECT 2, 'B2', 'E', 16, 'R', 130000
    UNION ALL SELECT 2, 'B2', 'F', 18, 'R', 130000
    UNION ALL SELECT 2, 'B2', 'G', 19, 'R', 130000
    UNION ALL SELECT 2, 'B2', 'H', 20, 'R', 130000
    UNION ALL SELECT 2, 'S_A2', 'A', 20, 'S', 110000
    UNION ALL SELECT 2, 'S_A2', 'B', 21, 'S', 110000
    UNION ALL SELECT 2, 'S_A2', 'C', 21, 'S', 110000
    UNION ALL SELECT 2, 'S_A2', 'D', 19, 'S', 110000
    UNION ALL SELECT 2, 'A2', 'A', 23, 'R', 130000
    UNION ALL SELECT 2, 'A2', 'B', 23, 'R', 130000
    UNION ALL SELECT 2, 'A2', 'C', 24, 'R', 130000
    UNION ALL SELECT 2, 'A2', 'D', 23, 'R', 130000
    UNION ALL SELECT 2, 'A2', 'E', 22, 'R', 130000
    UNION ALL SELECT 2, 'S_P2', 'A', 20, 'S', 110000
    UNION ALL SELECT 2, 'S_P2', 'B', 20, 'S', 110000
    UNION ALL SELECT 2, 'S_P2', 'C', 20, 'S', 110000
    UNION ALL SELECT 2, 'S_P2', 'D', 19, 'S', 110000
    UNION ALL SELECT 2, 'P2', 'A', 23, 'R', 130000
    UNION ALL SELECT 2, 'P2', 'B', 24, 'R', 130000
    UNION ALL SELECT 2, 'P2', 'C', 25, 'R', 130000
    UNION ALL SELECT 2, 'P2', 'D', 24, 'R', 130000
    UNION ALL SELECT 2, 'P2', 'E', 23, 'R', 130000
    UNION ALL SELECT 2, 'S_O2', 'A', 11, 'S', 110000
    UNION ALL SELECT 2, 'S_O2', 'B', 11, 'S', 110000
    UNION ALL SELECT 2, 'S_O2', 'C', 11, 'S', 110000
    UNION ALL SELECT 2, 'S_O2', 'D', 11, 'S', 110000
    UNION ALL SELECT 2, 'S_O2', 'E', 11, 'S', 110000
    UNION ALL SELECT 2, 'S_O2', 'F', 11, 'S', 110000
    UNION ALL SELECT 2, 'S_O2', 'G', 10, 'S', 110000
    UNION ALL SELECT 2, 'O2', 'A', 11, 'R', 130000
    UNION ALL SELECT 2, 'O2', 'B', 13, 'R', 130000
    UNION ALL SELECT 2, 'O2', 'C', 14, 'R', 130000
    UNION ALL SELECT 2, 'O2', 'D', 15, 'R', 130000
    UNION ALL SELECT 2, 'O2', 'E', 17, 'R', 130000
    UNION ALL SELECT 2, 'O2', 'F', 18, 'R', 130000
    UNION ALL SELECT 2, 'O2', 'G', 19, 'R', 130000
    UNION ALL SELECT 2, 'O2', 'H', 20, 'R', 130000
    UNION ALL SELECT 2, 'S_N2', 'A', 7, 'S', 110000
    UNION ALL SELECT 2, 'S_N2', 'B', 8, 'S', 110000
    UNION ALL SELECT 2, 'S_N2', 'C', 8, 'S', 110000
    UNION ALL SELECT 2, 'S_N2', 'D', 9, 'S', 110000
    UNION ALL SELECT 2, 'S_N2', 'E', 10, 'S', 110000
    UNION ALL SELECT 2, 'S_N2', 'F', 11, 'S', 110000
    UNION ALL SELECT 2, 'S_N2', 'G', 11, 'S', 110000
    UNION ALL SELECT 2, 'S_N2', 'H', 12, 'S', 110000
    UNION ALL SELECT 2, 'N2', 'A', 10, 'R', 130000
    UNION ALL SELECT 2, 'N2', 'B', 11, 'R', 130000
    UNION ALL SELECT 2, 'N2', 'C', 12, 'R', 130000
    UNION ALL SELECT 2, 'N2', 'D', 14, 'R', 130000
    UNION ALL SELECT 2, 'N2', 'E', 15, 'R', 130000
    UNION ALL SELECT 2, 'N2', 'F', 16, 'R', 130000
    UNION ALL SELECT 2, 'N2', 'G', 17, 'R', 130000
    UNION ALL SELECT 2, 'N2', 'H', 18, 'R', 130000
    UNION ALL SELECT 2, 'N2', 'I', 19, 'R', 130000
    UNION ALL SELECT 2, 'M2', 'A', 5, 'A', 90000
    UNION ALL SELECT 2, 'M2', 'B', 15, 'A', 90000
    UNION ALL SELECT 2, 'M2', 'C', 16, 'A', 90000
    UNION ALL SELECT 2, 'M2', 'D', 16, 'A', 90000
    UNION ALL SELECT 2, 'M2', 'E', 17, 'A', 90000
    UNION ALL SELECT 2, 'M2', 'F', 18, 'A', 90000
    UNION ALL SELECT 2, 'M2', 'G', 21, 'A', 90000
    UNION ALL SELECT 2, 'M2', 'H', 22, 'A', 90000
    UNION ALL SELECT 2, 'M2', 'I', 23, 'A', 90000
    UNION ALL SELECT 2, 'M2', 'J', 23, 'A', 90000
    UNION ALL SELECT 2, 'M2', 'K', 20, 'A', 90000
)
SELECT
    17,
    rc.seat_floor,
    rc.section_name,
    rc.seat_row,
    seq.x,
    CONCAT(rc.section_name, ' ', rc.seat_row, '-', seq.x),
    rc.grade,
    rc.price,
    'AVAILABLE',
    NOW()
FROM row_config rc
JOIN seq ON seq.x <= rc.seat_count;

-- session 18~23 (전주얼티밋뮤직페스티벌, 인천펜타포트): each R 80 / S 120 / A 50
INSERT INTO seat_tb (session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, updated_at)
WITH RECURSIVE seq(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM seq WHERE x < 80)
SELECT sid, 1, 'R', 'A', x, CONCAT('R A-', x), 'R', 110000,
    CASE WHEN MOD(x * sid, 5) = 0 THEN 'SOLD' ELSE 'AVAILABLE' END, NOW()
FROM (SELECT 18 AS sid UNION ALL SELECT 19 UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23) AS s
CROSS JOIN seq;

INSERT INTO seat_tb (session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, updated_at)
WITH RECURSIVE seq(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM seq WHERE x < 120)
SELECT sid, 2, 'S', 'B', x, CONCAT('S B-', x), 'S', 88000,
    CASE WHEN MOD(x * sid, 6) = 0 THEN 'SOLD' ELSE 'AVAILABLE' END, NOW()
FROM (SELECT 18 AS sid UNION ALL SELECT 19 UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23) AS s
CROSS JOIN seq;

INSERT INTO seat_tb (session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, updated_at)
WITH RECURSIVE seq(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM seq WHERE x < 50)
SELECT sid, 2, 'A', 'C', x, CONCAT('A C-', x), 'A', 0,
    'AVAILABLE', NOW()
FROM (SELECT 18 AS sid UNION ALL SELECT 19 UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23) AS s
CROSS JOIN seq;


-- ================
--  queue_tb (기본 샘플)
-- ================
INSERT INTO queue_tb (user_id, concert_session_id, queue_number, status, entered_at, expired_at, created_at)
VALUES
    (2, 1, 1, 'ENTERED', NOW(), NULL,                                  NOW()),
    (3, 1, 2, 'WAITING', NULL,  DATE_ADD(NOW(), INTERVAL 10 MINUTE),  NOW()),
    (4, 1, 3, 'WAITING', NULL,  DATE_ADD(NOW(), INTERVAL 10 MINUTE),  NOW()),
    (5, 3, 1, 'ENTERED', NOW(), NULL,                                  NOW()),
    (2, 3, 2, 'EXPIRED', NULL,  DATE_ADD(NOW(), INTERVAL -5 MINUTE),  DATE_ADD(NOW(), INTERVAL -20 MINUTE));

-- k6B 좌석 선택 페이지 바로 진입 테스트용 계정
INSERT INTO queue_tb (user_id, concert_session_id, queue_number, status, entered_at, expired_at, created_at)
SELECT
    u.id,
    17,
    9000 + ROW_NUMBER() OVER (ORDER BY u.id),
    'ENTERED',
    NOW(),
    NULL,
    NOW()
FROM user_tb u
WHERE u.username IN ('user1', 'ssar', 'sarr')
  AND NOT EXISTS (
      SELECT 1
      FROM queue_tb q
      WHERE q.user_id = u.id
        AND q.concert_session_id = 17
  );


-- ================
--  booking_tb
--  user_id 7~206 (realuser1~200), session 1~15 순환, 총 500건
--  PAID 70% / CANCELED 20% / PENDING 10%
-- ================
INSERT INTO booking_tb (user_id, concert_session_id, booking_number, status, total_amount, created_at, expires_at, paid_at, canceled_at)
WITH RECURSIVE seq(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM seq WHERE x < 500)
SELECT
    7 + MOD(x - 1, 200),
    1 + MOD(x - 1, 15),
    CONCAT('BK-', LPAD(CAST(x AS CHAR), 6, '0')),
    CASE
        WHEN MOD(x, 10) = 0 THEN 'PENDING'
        WHEN MOD(x, 10) IN (1, 2) THEN 'CANCELED'
        ELSE 'PAID'
    END,
    CASE
        WHEN MOD(x, 4) = 0 THEN 150000
        WHEN MOD(x, 4) = 1 THEN 130000
        WHEN MOD(x, 4) = 2 THEN 110000
        ELSE 90000
    END,
    DATE_ADD(NOW(), INTERVAL -MOD(x * 13, 4320) HOUR),
    CASE WHEN MOD(x, 10) = 0 THEN DATE_ADD(NOW(), INTERVAL (15 - MOD(x * 13, 4320) * 60) MINUTE) ELSE NULL END,
    CASE WHEN MOD(x, 10) NOT IN (0, 1, 2) THEN DATE_ADD(NOW(), INTERVAL (5 - MOD(x * 13, 4320) * 60) MINUTE) ELSE NULL END,
    CASE WHEN MOD(x, 10) IN (1, 2) THEN DATE_ADD(NOW(), INTERVAL (1 - MOD(x * 13, 4320)) HOUR) ELSE NULL END
FROM seq;

-- sarr/ssar 후기 작성 테스트용 결제 완료 예매
-- 각 콘서트별 3건씩 만들어 반복 테스트가 가능하도록 한다.
INSERT INTO booking_tb (user_id, concert_session_id, booking_number, status, total_amount, created_at, expires_at, paid_at, canceled_at)
SELECT
    u.id,
    cs.id,
    CONCAT('BK-REVIEW-', UPPER(u.username), '-', LPAD(CAST(c.id AS CHAR), 2, '0'), '-', CAST(n.n AS CHAR)),
    'PAID',
    90000,
    DATE_ADD(NOW(), INTERVAL -6 DAY),
    NULL,
    DATE_ADD(NOW(), INTERVAL -6 DAY),
    NULL
FROM user_tb u
JOIN concert_tb c ON 1 = 1
JOIN concert_session_tb cs ON cs.concert_id = c.id
    AND cs.round = '후기 테스트'
JOIN (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3) AS n ON 1 = 1
WHERE u.username IN ('sarr', 'ssar');


-- ================
--  booking_seat_tb
--  각 booking에 해당 session의 SOLD 좌석 1개씩 스냅샷으로 연결
-- ================
INSERT INTO booking_seat_tb (booking_id, seat_id, price, seat_number_snapshot, seat_grade_snapshot, created_at)
SELECT
    b.id,
    s.id,
    s.price,
    s.seat_number,
    s.grade,
    b.created_at
FROM booking_tb b
JOIN (
    SELECT id, session_id, price, seat_number, grade,
           ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY id) AS rn
    FROM seat_tb
    WHERE status = 'SOLD'
) s ON s.session_id = b.concert_session_id
    AND s.rn = 1 + MOD(b.id, 10)
WHERE b.status IN ('PAID', 'CANCELED');


-- ================
--  payment_tb (PAID 예매)
-- ================
INSERT INTO payment_tb (booking_id, pg_tx_id, payment_id, original_amount, ticket_fee, used_point, amount, method, status, paid_at, created_at)
SELECT
    b.id,
    CONCAT('pg_', b.id),
    CONCAT('cc_', b.id),
    b.total_amount - 2000,
    2000,
    CASE WHEN MOD(b.id, 8) = 0 THEN 5000 WHEN MOD(b.id, 8) = 4 THEN 10000 ELSE 0 END,
    b.total_amount,
    CASE WHEN MOD(b.id, 3) = 0 THEN 'kakaopay' WHEN MOD(b.id, 3) = 1 THEN 'card' ELSE 'tosspay' END,
    'PAID',
    b.paid_at,
    b.created_at
FROM booking_tb b
WHERE b.status = 'PAID';

-- payment_tb (CANCELED 예매)
INSERT INTO payment_tb (booking_id, pg_tx_id, payment_id, original_amount, ticket_fee, used_point, amount, method, status, paid_at, created_at)
SELECT
    b.id,
    CONCAT('pg_c_', b.id),
    CONCAT('cc_c_', b.id),
    b.total_amount - 2000,
    2000,
    0,
    b.total_amount,
    CASE WHEN MOD(b.id, 2) = 0 THEN 'card' ELSE 'kakaopay' END,
    'CANCELED',
    NULL,
    b.created_at
FROM booking_tb b
WHERE b.status = 'CANCELED';


-- ================
--  refund_tb
-- ================
INSERT INTO refund_tb (payment_id, amount, cancel_fee, reason, refunded_at)
SELECT
    p.id,
    p.amount - CAST(p.amount * 0.1 AS SIGNED),
    CAST(p.amount * 0.1 AS SIGNED),
    CASE WHEN MOD(p.id, 3) = 0 THEN '개인 사정으로 인한 취소'
         WHEN MOD(p.id, 3) = 1 THEN '일정 변경으로 인한 취소'
         ELSE '중복 예매 취소' END,
    DATE_ADD(p.created_at, INTERVAL 1 HOUR)
FROM payment_tb p
WHERE p.status = 'CANCELED';


-- ================
--  point_history_tb
--  PAID 예매의 1% 적립, 일부 건 사용 내역
-- ================
INSERT INTO point_history_tb (user_id, type, amount, balance, created_at)
SELECT
    b.user_id,
    'EARN',
    CAST(b.total_amount * 0.01 AS SIGNED),
    CAST(b.total_amount * 0.01 AS SIGNED),
    b.paid_at
FROM booking_tb b
WHERE b.status = 'PAID'
  AND b.paid_at IS NOT NULL
  AND MOD(b.id, 3) != 0;

INSERT INTO point_history_tb (user_id, type, amount, balance, created_at)
SELECT
    b.user_id,
    'USE',
    -CAST(b.total_amount * 0.05 AS SIGNED),
    0,
    b.paid_at
FROM booking_tb b
WHERE b.status = 'PAID'
  AND b.paid_at IS NOT NULL
  AND MOD(b.id, 8) = 0;


-- ================
--  concert_like_tb (공연 좋아요)
--  realuser 200명 × 콘서트 9개 중 일부 → INSERT IGNORE로 중복 방지
--  (uk_concert_like_tb: UNIQUE(user_id, concert_id))
-- ================
INSERT IGNORE INTO concert_like_tb (user_id, concert_id, created_at)
WITH RECURSIVE seq(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM seq WHERE x < 600)
SELECT
    7 + MOD(x - 1, 200),
    1 + MOD(x - 1, 9),
    DATE_ADD(NOW(), INTERVAL -MOD(x * 11, 90) DAY)
FROM seq;


-- ================
--  operation_log_tb
-- ================
INSERT INTO operation_log_tb (actor, message, level, created_at)
VALUES
    ('admin',    'Red Velvet FAN-CON 〈A Day in Red & Velvet〉 1회차 좌석 배치 완료 (500석)', 'INFO', DATE_ADD(NOW(), INTERVAL -60 DAY)),
    ('admin',    '사운드 플래닛 페스티벌 2026 공연 등록',                     'INFO', DATE_ADD(NOW(), INTERVAL -45 DAY)),
    ('admin',    '후지이 카제 Prema 월드 투어 상태 COMING_SOON 설정',          'INFO', DATE_ADD(NOW(), INTERVAL -30 DAY)),
    ('admin',    'BIG Naughty 콘서트 CLOSED_SOON 처리 (공연 2주 전)',         'WARN', DATE_ADD(NOW(), INTERVAL -3 DAY)),
    ('admin',    '워터밤 서울 2026 대기열 강제 종료',                         'WARN', DATE_ADD(NOW(), INTERVAL -1 DAY)),
    ('admin',    '수동 환불 처리 완료 (booking:3)',                          'INFO', DATE_ADD(NOW(), INTERVAL -5 HOUR)),
    ('admin',    '공지사항 등록: 6월 서비스 점검 안내',                        'INFO', DATE_ADD(NOW(), INTERVAL -7 DAY)),
    ('admin',    'FAQ 수정: 환불 정책 안내 업데이트',                         'INFO', DATE_ADD(NOW(), INTERVAL -14 DAY)),
    ('admin',    '메인 배너 교체 - Red Velvet FAN-CON 홍보',                 'INFO', DATE_ADD(NOW(), INTERVAL -10 DAY)),
    ('admin',    '어뷰징 의심 계정 임시 비활성화 (user:15)',                   'WARN', DATE_ADD(NOW(), INTERVAL -2 HOUR)),
    ('manager1', '뮤지컬 〈베토벤〉 3회차 좌석 추가 배치',                      'INFO', DATE_ADD(NOW(), INTERVAL -5 DAY)),
    ('manager1', '포인트 만료 배치 수동 실행',                               'INFO', DATE_ADD(NOW(), INTERVAL -1 HOUR)),
    ('manager1', '1:1 문의 답변 처리 (inquiry:12)',                         'INFO', DATE_ADD(NOW(), INTERVAL -8 HOUR)),
    ('admin',    '대기열 동시 처리 상한 500 → 600 임시 조정',                 'WARN', DATE_ADD(NOW(), INTERVAL -2 DAY)),
    ('admin',    'k6 부하테스트 완료 후 테스트 데이터 초기화',                  'INFO', DATE_ADD(NOW(), INTERVAL -12 HOUR));


-- ================
--  notice_tb (user_id NOT NULL → admin(1) 작성자로 고정)
-- ================
INSERT INTO notice_tb (user_id, title, content, is_pinned, view_count, created_at, updated_at)
VALUES
    (1, '[필독] 티켓팅 유의사항 및 이용약관 안내',
     '<p>안녕하세요. CatchCatch를 이용해 주셔서 감사합니다.</p><p>티켓 구매 전 반드시 유의사항을 확인해 주세요.</p><ol><li>예매 완료 후 취소 시 취소 수수료가 발생합니다.</li><li>입장 시 본인 확인이 필요합니다.</li><li>좌석 선택 후 15분 이내 결제를 완료해야 합니다.</li></ol>',
     true, 1240, DATE_ADD(NOW(), INTERVAL -90 DAY), DATE_ADD(NOW(), INTERVAL -90 DAY)),

    (1, '[공지] 서버 점검 안내 (6/15 02:00~06:00)',
     '<p>안정적인 서비스 제공을 위해 서버 점검을 실시합니다.</p><ul><li><strong>점검 일시:</strong> 2026년 6월 15일(월) 02:00 ~ 06:00</li><li><strong>점검 내용:</strong> 서버 인프라 업그레이드 및 안정성 개선</li></ul><p>점검 중에는 서비스 이용이 불가합니다. 이용에 불편을 드려 죄송합니다.</p>',
     true, 876, DATE_ADD(NOW(), INTERVAL -10 DAY), DATE_ADD(NOW(), INTERVAL -10 DAY)),

    (1, 'Red Velvet FAN-CON 〈A Day in Red & Velvet〉 예매 안내',
     '<p>폭발적인 반응에 힘입어 <strong>Red Velvet FAN-CON 〈A Day in Red & Velvet〉</strong>의 예매가 시작되었습니다.</p><ul><li><strong>공연 일정:</strong> 2026년 8월 1~2일</li><li><strong>공연 장소:</strong> 고려대학교 화정체육관</li><li><strong>예매 오픈:</strong> 6월 15일 오후 8시</li></ul><p>많은 관심 부탁드립니다.</p>',
     false, 2341, DATE_ADD(NOW(), INTERVAL -20 DAY), DATE_ADD(NOW(), INTERVAL -20 DAY)),

    (1, '포인트 적립 정책 변경 안내',
     '<p>2026년 7월 1일부터 포인트 적립률이 변경됩니다.</p><ul><li><strong>변경 전:</strong> 결제 금액의 1% 적립</li><li><strong>변경 후:</strong> 결제 금액의 1.5% 적립</li></ul><p>더욱 풍성한 혜택으로 보답하겠습니다. 감사합니다.</p>',
     false, 534, DATE_ADD(NOW(), INTERVAL -15 DAY), DATE_ADD(NOW(), INTERVAL -15 DAY)),

    (1, '[이벤트] 첫 예매 포인트 5,000점 증정',
     '<p>첫 예매 완료 고객께 <strong>포인트 5,000점</strong>을 증정합니다.</p><ul><li><strong>대상:</strong> CatchCatch 첫 예매 완료 회원</li><li><strong>적용 기간:</strong> 2026년 8월 31일까지</li><li><strong>지급 시점:</strong> 예매 완료 즉시 자동 적립</li></ul>',
     false, 1892, DATE_ADD(NOW(), INTERVAL -30 DAY), DATE_ADD(NOW(), INTERVAL -30 DAY));


-- ================
--  faq_tb (category: FaqCategory enum)
-- ================
INSERT INTO faq_tb (category, question, answer, created_at)
VALUES
    ('BOOKING', '예매 취소는 어떻게 하나요?',
     '<p><strong>마이페이지 &gt; 예매 내역</strong>에서 취소 가능한 예매 건을 선택해 취소할 수 있습니다.</p><p>공연일 7일 전까지는 수수료 없이 취소 가능합니다.</p>',
     NOW()),
    ('BOOKING', '좌석을 선택하지 않으면 어떻게 되나요?',
     '<p>좌석 선택 후 <strong>15분 이내</strong>에 결제를 완료하지 않으면 자동으로 예매가 취소됩니다.</p>',
     NOW()),
    ('PAYMENT', '사용 가능한 결제 수단은 무엇인가요?',
     '<ul><li>신용/체크카드</li><li>카카오페이</li><li>토스페이</li><li>가상계좌</li></ul>',
     NOW()),
    ('PAYMENT', '포인트는 어떻게 사용하나요?',
     '<p>결제 단계에서 보유 포인트의 전부 또는 일부를 사용할 수 있습니다.</p><p><strong>1포인트 = 1원</strong>으로 적용됩니다.</p>',
     NOW()),
    ('CANCEL_REFUND', '환불은 언제 처리되나요?',
     '<p>결제수단과 카드사 정책에 따라 보통 <strong>3~7영업일</strong> 정도 소요됩니다.</p>',
     NOW()),
    ('CANCEL_REFUND', '취소 수수료는 얼마인가요?',
     '<ul><li>공연일 <strong>7일 전까지</strong>: 수수료 없음</li><li><strong>6~3일 전</strong>: 10%</li><li><strong>2~1일 전</strong>: 20%</li><li><strong>당일</strong>: 30%</li></ul>',
     NOW()),
    ('MEMBER', '비밀번호를 잊어버렸어요.',
     '<p>로그인 페이지에서 <strong>비밀번호 찾기</strong>를 이용하시거나, 소셜 로그인(카카오)으로 로그인하실 수 있습니다.</p>',
     NOW()),
    ('MEMBER', '회원 탈퇴는 어떻게 하나요?',
     '<p><strong>마이페이지 &gt; 계정 설정</strong>에서 회원 탈퇴를 신청할 수 있습니다.</p><p>미사용 포인트와 예매 내역은 탈퇴 후 복구되지 않습니다.</p>',
     NOW()),
    ('SERVICE', '대기열이 무엇인가요?',
     '<p>인기 공연의 경우 동시 접속자가 많아 공정한 예매를 위해 <strong>대기열 시스템</strong>을 운영합니다.</p><p>순번에 따라 순차적으로 입장합니다.</p>',
     NOW()),
    ('SERVICE', '대기 중 브라우저를 닫으면 어떻게 되나요?',
     '<p>대기 순번은 유지되나, READY 상태가 됐을 때 <strong>10분 이내</strong>에 접속하지 않으면 순번이 만료됩니다.</p>',
     NOW());


-- ================
--  inquiry_tb (reply, is_public, notify_email, notify_sms, category: InquiryCategory enum)
-- ================
INSERT INTO inquiry_tb (user_id, title, content, category, status, is_public, notify_email, notify_sms, reply, created_at)
VALUES
    (7,  '결제가 완료됐는데 예매가 안 돼있어요', '카카오페이로 결제했는데 예매 내역에 없습니다.', 'PAYMENT', 'RESOLVED', false, true, false, '결제 데이터를 확인한 결과 정상 처리되었습니다. 마이페이지를 새로고침 후 확인해 주세요.', DATE_ADD(NOW(), INTERVAL -5 DAY)),
    (8,  '취소 환불이 언제 되나요?',             '3일 전에 취소했는데 아직 환불이 안 됐습니다.',   'PAYMENT', 'RESOLVED', false, true, false, '카드사 환불은 영업일 기준 3~5일 소요됩니다. 이미 처리가 완료되어 곧 입금될 예정입니다.', DATE_ADD(NOW(), INTERVAL -3 DAY)),
    (9,  '대기열에서 오류가 났어요',              '대기 중 갑자기 화면이 멈췄습니다.',             'TICKET',  'PENDING',  false, false, false, NULL, DATE_ADD(NOW(), INTERVAL -1 DAY)),
    (10, '포인트가 적립이 안 됐어요',             '예매 완료 후 포인트가 적립되지 않았습니다.',     'TICKET',  'RESOLVED', false, true, false, '확인 결과 포인트 적립이 누락되었습니다. 수동으로 포인트를 지급해 드렸습니다.', DATE_ADD(NOW(), INTERVAL -7 DAY)),
    (11, '좌석 선택 화면이 안 열려요',            '좌석 선택 버튼을 눌러도 화면이 안 넘어갑니다.',  'TICKET',  'PENDING',  false, false, false, NULL, DATE_ADD(NOW(), INTERVAL -3 HOUR)),
    (12, '소셜 로그인 연동 문의',                '카카오 로그인 후 기존 계정과 합치고 싶어요.',     'USER',    'PENDING',  false, true, false, NULL, DATE_ADD(NOW(), INTERVAL -1 HOUR));


-- ================
--  event_tb
-- ================
INSERT INTO event_tb (title, description, notice_content, image_url, condition_type, condition_concert_id, reward_point, point_valid_months, start_date, end_date)
VALUES
    ('첫 예매 완료 포인트 증정',
     '첫 예매를 완료하신 분께 포인트 5,000점을 드립니다.',
     '<h3>유의사항</h3><ul><li>포인트는 참여 즉시 지급됩니다.</li><li>1인 1회 한정입니다.</li><li>포인트 유효기간은 지급일로부터 6개월입니다.</li></ul>',
     NULL, 'NONE', NULL, 5000, 6, DATE_ADD(NOW(), INTERVAL -60 DAY), DATE_ADD(NOW(), INTERVAL 60 DAY)),

    ('여름 특별 예매 혜택',
     '7~8월 공연 예매 시 추가 포인트 2,000점을 적립해 드립니다.',
     '<h3>유의사항</h3><ul><li>CatchCatch에서 공연을 예매한 이력이 있는 회원만 참여 가능합니다.</li><li>포인트 유효기간은 3개월입니다.</li></ul>',
     NULL, 'BOOKING_HISTORY', NULL, 2000, 3, DATE_ADD(NOW(), INTERVAL -30 DAY), DATE_ADD(NOW(), INTERVAL 60 DAY)),

    ('SNS 공유 이벤트',
     '공연 예매 후 SNS에 공유하시면 포인트 1,000점 증정합니다.',
     '<h3>이벤트 참여 방법</h3><ol><li>공연을 예매합니다.</li><li>SNS에 예매 인증을 공유합니다.</li><li>포인트 지급받기 버튼을 누릅니다.</li></ol><h3>유의사항</h3><ul><li>1인 1회 참여 가능합니다.</li><li>포인트 유효기간은 3개월입니다.</li></ul>',
     NULL, 'NONE', NULL, 1000, 3, DATE_ADD(NOW(), INTERVAL -14 DAY), DATE_ADD(NOW(), INTERVAL 16 DAY)),

    ('신규 가입 웰컴 포인트',
     '회원가입 완료 시 포인트 3,000점을 즉시 지급합니다.',
     '<h3>유의사항</h3><ul><li>회원가입 완료 후 참여 버튼을 눌러야 포인트가 지급됩니다.</li><li>포인트 유효기간은 지급일로부터 12개월입니다.</li></ul>',
     NULL, 'NONE', NULL, 3000, 12, DATE_ADD(NOW(), INTERVAL -90 DAY), DATE_ADD(NOW(), INTERVAL 275 DAY));


-- ================
--  banner_tb (image_url, display_order, is_active 필수)
--  YES24 스타일 3종 배너 (전주얼티밋뮤직페스티벌 / 뮤지컬 베토벤 / 인천 펜타포트)
--  show_text = false → 텍스트 오버레이/그라데이션 없이 이미지만 노출
-- ================
INSERT INTO banner_tb (image_url, eyebrow, title, highlight, description, button_text, link_url, display_order, is_active, show_text)
VALUES
    ('/images/banners/banner-jeonju-festival.jpg', NULL, NULL, NULL, NULL, NULL, '/concerts/12', 1, true, false),
    ('/images/banners/banner-beethoven.jpg',        NULL, NULL, NULL, NULL, NULL, '/concerts/2',  2, true, false),
    ('/images/banners/banner-pentaport.png',        NULL, NULL, NULL, NULL, NULL, '/concerts/13', 3, true, false);


-- ================
--  employee_tb
-- ================
INSERT INTO employee_tb
(employee_number, name, department, status, user_id, created_at, updated_at)
VALUES
    ('EMP001', '김최고', '시스템관리팀', 'ACTIVE', 1, NOW(), NOW()),
    ('EMP002', '이매니', '콘서트기획팀', 'ACTIVE', 2, NOW(), NOW()),
    ('EMP003', '박사원', '고객지원팀', 'ACTIVE', 3, NOW(), NOW()),
    ('EMP004', '정정지', '마케팅팀', 'SUSPENDED', 4, NOW(), NOW()),
    ('EMP005', '최퇴사', '영업팀', 'RESIGNED', 5, NOW(), NOW());
