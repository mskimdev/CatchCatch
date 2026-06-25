-- ================================================================================
--  CatchCatch 전체 더미 데이터 (H2 전용)
--  기존 sql 파일 없이 이 파일 하나로 전체 초기 데이터를 구성한다.
--  삽입 순서 (FK 의존성):
--    user → venue → concert → concert_session → seat
--    → queue → booking → booking_seat → payment → refund
--    → point_history → concert_like → operation_log
--    → notice → faq → inquiry → event(banner) → employee
-- ================================================================================

-- ================
--  user_tb
--  비밀번호: 전부 "ssar1234" BCrypt
-- ================
INSERT INTO user_tb (username, password, email, phone, profile_image, oauth_provider, role, point, created_at, is_deleted)
VALUES
    ('admin',    '$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK', 'admin@catchcatch.com',    '010-0000-0000', NULL, 'LOCAL', 'ADMIN', 0,     NOW(), false),
    ('user1',    '$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK', 'user1@test.com',          '010-1111-1111', NULL, 'LOCAL', 'USER',  0,     NOW(), false),
    ('user2',    '$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK', 'user2@test.com',          '010-2222-2222', NULL, 'LOCAL', 'USER',  0,     NOW(), false),
    ('user3',    '$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK', 'user3@test.com',          '010-3333-3333', NULL, 'LOCAL', 'USER',  0,     NOW(), false),
    ('kakaouser','$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK', 'kakao_12345@kakao.com',   '010-4444-4444', NULL, 'KAKAO', 'USER',  0,     NOW(), false),
    ('ssar',     '$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK', 'ssar@naver.com',          '010-5729-1754', NULL, 'LOCAL', 'USER',  0,     NOW(), false);

-- 실사용자 200명 (realuser1~200), 최근 6개월 내 가입, 20%는 카카오 소셜
INSERT INTO user_tb (username, password, email, phone, profile_image, oauth_provider, role, point, created_at, is_deleted)
SELECT
    'realuser' || x,
    '$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK',
    'realuser' || x || '@catchcatch.com',
    '010-' || LPAD(CAST(MOD(x, 10000) AS VARCHAR), 4, '0') || '-' || LPAD(CAST(MOD(x * 37, 10000) AS VARCHAR), 4, '0'),
    NULL,
    CASE WHEN MOD(x, 5) = 0 THEN 'KAKAO' ELSE 'LOCAL' END,
    'USER',
    MOD(x * 173, 50000),
    DATEADD('DAY', -MOD(x * 7, 180), NOW()),
    false
FROM SYSTEM_RANGE(1, 200) AS t(x);

-- k6 부하테스트용 유저 5000명
INSERT INTO user_tb (username, password, email, phone, profile_image, oauth_provider, role, point, created_at, is_deleted)
SELECT
    'loadgen' || x,
    '$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK',
    'loadgen' || x || '@test.com',
    '010-0000-0000',
    NULL, 'LOCAL', 'USER', 0, NOW(), false
FROM SYSTEM_RANGE(1, 5000) AS t(x);
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
    ('올림픽공원 체조경기장', '서울특별시 송파구 올림픽로 424',          15000, '/json/seatmap/seatmap-concert-session.json', NOW()),
    ('KSPO DOME',          '서울특별시 송파구 올림픽로 424',          15000, NULL, NOW()),
    ('잠실실내체육관',         '서울특별시 송파구 올림픽로 25',           15000, NULL, NOW()),
    ('부산 사직실내체육관',     '부산광역시 동래구 사직동 산 29',          12000, NULL, NOW()),
    ('인천 남동체육관',        '인천광역시 남동구 장수동 503',            10000, NULL, NOW()),
    ('k6 부하테스트 공연장 A', '서울특별시 송파구 올림픽로 000',           1000, NULL, NOW()),
    ('k6 부하테스트 공연장 B', '서울특별시 송파구 올림픽로 001',           1000, NULL, NOW());
-- venue_id: 1~7


-- ================
--  concert_tb
-- ================
INSERT INTO concert_tb
(venue_id, title, artist, description, poster_url, status,
 category, genre, start_date, end_date, ticket_open_date, age_limit, runtime, organizer, contact,
 detail_banner_url, detail_title, detail_description1, detail_description2,
 price_vip, price_r, price_s, price_a, created_at, is_deleted)
VALUES
    (1, '아이유 콘서트 2026 [HEREH]', '아이유',
     '아이유의 2026년 단독 콘서트. 새 앨범 수록곡을 포함한 화려한 무대.',
     '/images/sample/poster-music.svg', 'OPEN', '콘서트', 'concert',
     '2026-08-01', '2026-08-02', '2026-05-20 20:00:00', '만 7세 이상 관람가', '150분', 'EDAM 엔터테인먼트', '1544-1111',
     '/images/sample/detail-banner.svg', '여름밤을 수놓을 아름다운 목소리', '아이유와 함께하는 잊지 못할 특별한 시간', '놓칠 수 없는 단 이틀간의 공연',
     150000, 130000, 110000, 90000, NOW(), false),

    (2, '뮤지컬 <시카고> 오리지널 내한', '내한공연팀',
     '브로드웨이 역사상 가장 매혹적인 뮤지컬 시카고 내한 공연.',
     '/images/sample/poster-music.svg', 'OPEN', '뮤지컬', 'musical',
     '2026-09-05', '2026-09-07', '2026-05-25 14:00:00', '만 15세 이상 관람가', '150분', '신시컴퍼니', '1544-2222',
     '/images/sample/detail-banner.svg', '가장 뜨겁고 섹시한 무대', '브로드웨이 오리지널 캐스트의 귀환', 'All That Jazz',
     0, 0, 0, 0, NOW(), false),

    (3, '조성진 피아노 리사이틀', '조성진',
     '세계적인 피아니스트 조성진의 2026년 전국투어 리사이틀.',
     '/images/sample/poster-music.svg', 'COMING_SOON', '클래식', 'classic',
     '2026-10-10', '2026-10-11', '2026-07-10 18:00:00', '만 7세 이상 관람가', '100분', '크레디아', '1544-3333',
     '/images/sample/detail-banner.svg', '건반 위를 수놓는 완벽한 타건', '쇼팽 콩쿠르 우승자 조성진의 귀환', '영혼을 울리는 클래식의 밤',
     0, 0, 0, 0, NOW(), false),

    (4, '부산 재즈 페스티벌 2026', '다수 아티스트',
     '국내외 유명 재즈 아티스트들의 합동 페스티벌 공연.',
     '/images/sample/poster-music.svg', 'OPEN', '페스티벌', 'festival',
     '2026-07-20', '2026-07-20', '2026-06-01 12:00:00', '전체 관람가', '240분', '부산문화재단', '1544-4444',
     '/images/sample/detail-banner.svg', '한여름 밤의 낭만적인 재즈 선율', '국내외 최정상급 재즈 뮤지션 총출동', '사직실내체육관에서 즐기는 감미로운 축제',
     0, 0, 0, 0, NOW(), false),

    (1, '박보검 데뷔 16주년 팬미팅', '박보검',
     '배우 박보검 데뷔 16주년 기념 공식 팬미팅.',
     '/images/sample/poster-music.svg', 'CLOSED_SOON', '팬미팅', 'fanmeeting',
     '2026-06-25', '2026-06-25', '2026-05-01 20:00:00', '전체 관람가', '120분', '더블랙레이블', '1544-5555',
     '/images/sample/detail-banner.svg', '팬들과 함께하는 특별한 16주년', '보검복지부와 함께하는 따뜻한 시간', '놓칠 수 없는 단 하루',
     0, 0, 0, 0, NOW(), false),

    (2, 'DAY6 4TH WORLD TOUR <FOREVER>', 'DAY6',
     '마이데이를 위한 뜨거운 여정, 데이식스 월드투어 서울 공연.',
     '/images/sample/poster-music.svg', 'COMING_SOON', '콘서트', 'concert',
     '2026-08-21', '2026-08-25', '2026-06-25 20:00:00', '만 7세 이상 관람가', '150분', 'JYP 엔터테인먼트', '1544-6666',
     '/images/sample/detail-banner.svg', '우리의 모든 순간이 영원이 되도록', 'FOREVER 뜨겁게 빛날 무대', '올림픽공원에서 펼쳐지는 벅찬 감동',
     0, 0, 0, 0, NOW(), false),

    (3, '세븐틴 WORLD TOUR <NEW_> IN SEOUL', '세븐틴',
     '새로운 챕터의 시작을 알리는 세븐틴의 월드투어 인 서울.',
     '/images/sample/poster-triangle.svg', 'OPEN', '콘서트', 'concert',
     '2026-07-06', '2026-07-08', '2026-05-15 20:00:00', '만 7세 이상 관람가', '180분', 'PLEDIS 엔터테인먼트', '1544-7777',
     '/images/sample/detail-banner.svg', '새로운 역사를 써 내려갈 완벽한 무대', '고척돔을 가득 채울 열기', '캐럿과 함께 여는 NEW 챕터',
     0, 0, 0, 0, NOW(), false),

    (4, '황치열 전국투어 콘서트 <별, 그대>', '황치열',
     '가슴 절절한 목소리로 돌아온 황치열의 2026년 전국투어.',
     '/images/sample/poster-artist.svg', 'CLOSED_SOON', '콘서트', 'concert',
     '2026-06-20', '2026-06-21', '2026-05-10 14:00:00', '만 7세 이상 관람가', '150분', 'TEN2 엔터테인먼트', '1544-8888',
     '/images/sample/detail-banner.svg', '밤하늘의 별처럼 쏟아지는 감동', '별, 그리고 당신을 위한 세레나데', '화이트데이에 전하는 특별한 선물',
     0, 0, 0, 0, NOW(), false),

    (5, 'aespa LIVE TOUR <SYNK : HYPER LINE>', 'aespa',
     '가상과 현실을 넘나드는 에스파의 메타버스 라이브 투어.',
     '/images/sample/poster-aespa.svg', 'OPEN', '콘서트', 'concert',
     '2026-08-11', '2026-08-12', '2026-06-02 20:00:00', '만 7세 이상 관람가', '150분', 'SM 엔터테인먼트', '1544-9999',
     '/images/sample/detail-banner.svg', '현실과 광야를 잇는 압도적인 세계관', 'SYNK : HYPER LINE', '인스파이어 아레나를 강타할 광야의 소리',
     0, 0, 0, 0, NOW(), false),

    (1, 'Cigarettes After Sex Live in Seoul', 'Cigarettes After Sex',
     '몽환적이고 감각적인 사운드의 대명사, CAS 내한 공연.',
     '/images/sample/poster-cas.svg', 'OPEN', '콘서트', 'concert',
     '2026-07-30', '2026-07-30', '2026-05-30 12:00:00', '만 15세 이상 관람가', '120분', '프라이빗커브', '1544-0000',
     '/images/sample/detail-banner.svg', '당신의 밤을 적실 몽환적인 멜로디', '독보적인 분위기의 라이브', '잠실을 수놓을 짙은 감성',
     0, 0, 0, 0, NOW(), false),

    -- k6 부하테스트 전용 콘서트 2개
    (6, 'k6 부하테스트 콘서트 A', 'k6',
     'k6 부하 테스트 전용 콘서트 데이터 A.',
     '/images/sample/poster-music.svg', 'OPEN', '콘서트', 'concert',
     '2026-12-31', '2026-12-31', '2026-01-01 00:00:00', '전체 관람가', '120분', 'k6', '000-0000-0000',
     '/images/sample/detail-banner.svg', 'k6 부하테스트 A', 'k6 부하 테스트 전용', 'k6 부하 테스트 전용',
     100000, 80000, 60000, 40000, NOW(), false),

    (7, 'k6 부하테스트 콘서트 B', 'k6',
     'k6 부하 테스트 전용 콘서트 데이터 B.',
     '/images/sample/poster-music.svg', 'OPEN', '콘서트', 'concert',
     '2026-12-31', '2026-12-31', '2026-01-01 00:00:00', '전체 관람가', '120분', 'k6', '000-0000-0000',
     '/images/sample/detail-banner.svg', 'k6 부하테스트 B', 'k6 부하 테스트 전용', 'k6 부하 테스트 전용',
     100000, 80000, 60000, 40000, NOW(), false);
-- concert_id: 1=아이유, 2=시카고, 3=조성진, 4=재즈, 5=박보검, 6=DAY6, 7=세븐틴, 8=황치열, 9=aespa, 10=CAS, 11=k6A, 12=k6B


-- ================
--  concert_session_tb
-- ================
INSERT INTO concert_session_tb (concert_id, session_date, session_time, round, created_at, is_deleted)
VALUES
    (1,  '2026-08-01', '18:00:00', '1회차', NOW(), false),  -- session_id 1
    (1,  '2026-08-02', '18:00:00', '2회차', NOW(), false),  -- session_id 2
    (2,  '2026-09-05', '19:00:00', '1회차', NOW(), false),  -- session_id 3
    (2,  '2026-09-06', '19:00:00', '2회차', NOW(), false),  -- session_id 4
    (2,  '2026-09-07', '17:00:00', '3회차', NOW(), false),  -- session_id 5
    (3,  '2026-10-10', '18:00:00', '1회차', NOW(), false),  -- session_id 6
    (3,  '2026-10-11', '18:00:00', '2회차', NOW(), false),  -- session_id 7
    (4,  '2026-07-20', '17:00:00', '1회차', NOW(), false),  -- session_id 8
    (5,  '2026-06-25', '18:00:00', '1회차', NOW(), false),  -- session_id 9
    (7,  '2026-07-06', '18:00:00', '1회차', NOW(), false),  -- session_id 10
    (7,  '2026-07-07', '18:00:00', '2회차', NOW(), false),  -- session_id 11
    (7,  '2026-07-08', '18:00:00', '3회차', NOW(), false),  -- session_id 12
    (9,  '2026-08-11', '18:00:00', '1회차', NOW(), false),  -- session_id 13
    (9,  '2026-08-12', '18:00:00', '2회차', NOW(), false),  -- session_id 14
    (10, '2026-07-30', '19:00:00', '1회차', NOW(), false),  -- session_id 15
    (11, '2026-12-31', '20:00:00', '1회차', NOW(), false),  -- session_id 16 (k6A)
    (12, '2026-12-31', '21:00:00', '1회차', NOW(), false);  -- session_id 17 (k6B)

-- 후기 작성 테스트용 종료 회차
-- sarr/ssar가 어떤 콘서트 상세에서도 후기 작성 조건을 통과할 수 있도록 모든 콘서트에 과거 회차를 추가한다.
INSERT INTO concert_session_tb (concert_id, session_date, session_time, round, created_at, is_deleted)
SELECT
    c.id,
    DATEADD('DAY', -7, CURRENT_DATE),
    TIME '10:00:00',
    '후기 테스트',
    NOW(),
    false
FROM concert_tb c;


-- ================
--  seat_tb
--  session 1 (아이유 1회차): VIP 50 / R 100 / S 200 / A 150 = 500석
--  session 2 (아이유 2회차): VIP 50 / R 100 / S 200 / A 150 = 500석
--  session 3~15: 각 R 80 / S 120 / A 50 = 250석
--  session 16,17 (k6): 각 1000석 (A등급)
-- ================

-- session 1: VIP 50석
INSERT INTO seat_tb (session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, x_label, y_label, seat_size, seat_angle, updated_at)
SELECT 1, 1, 'VIP', 'A', x, 'VIP A열 ' || x || '번', 'VIP', 150000,
    CASE WHEN MOD(x, 3) = 0 THEN 'SOLD' ELSE 'AVAILABLE' END,
    CAST(60 + x * 14 AS DOUBLE), 120, 18, 0, NOW()
FROM SYSTEM_RANGE(1, 50) AS t(x);

-- session 1: R 100석
INSERT INTO seat_tb (session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, x_label, y_label, seat_size, seat_angle, updated_at)
SELECT 1, 1, 'R', 'B', x, 'R B열 ' || x || '번', 'R', 130000,
    CASE WHEN MOD(x, 4) = 0 THEN 'SOLD' ELSE 'AVAILABLE' END,
    CAST(60 + x * 11 AS DOUBLE), 180, 18, 0, NOW()
FROM SYSTEM_RANGE(1, 100) AS t(x);

-- session 1: S 200석
INSERT INTO seat_tb (session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, x_label, y_label, seat_size, seat_angle, updated_at)
SELECT 1, 2, 'S', 'C', x, 'S C열 ' || x || '번', 'S', 110000,
    CASE WHEN MOD(x, 5) = 0 THEN 'SOLD' ELSE 'AVAILABLE' END,
    CAST(60 + x * 9 AS DOUBLE), 240, 18, 0, NOW()
FROM SYSTEM_RANGE(1, 200) AS t(x);

-- session 1: A 150석
INSERT INTO seat_tb (session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, x_label, y_label, seat_size, seat_angle, updated_at)
SELECT 1, 2, 'A', 'D', x, 'A D열 ' || x || '번', 'A', 90000,
    CASE WHEN MOD(x, 6) = 0 THEN 'SOLD' ELSE 'AVAILABLE' END,
    CAST(60 + x * 9 AS DOUBLE), 300, 18, 0, NOW()
FROM SYSTEM_RANGE(1, 150) AS t(x);

-- session 2: VIP 50석
INSERT INTO seat_tb (session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, x_label, y_label, seat_size, seat_angle, updated_at)
SELECT 2, 1, 'VIP', 'A', x, 'VIP A열 ' || x || '번', 'VIP', 150000,
    CASE WHEN MOD(x, 4) = 0 THEN 'SOLD' WHEN MOD(x, 7) = 0 THEN 'HELD' ELSE 'AVAILABLE' END,
    CAST(60 + x * 14 AS DOUBLE), 120, 18, 0, NOW()
FROM SYSTEM_RANGE(1, 50) AS t(x);

-- session 2: R 100석
INSERT INTO seat_tb (session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, x_label, y_label, seat_size, seat_angle, updated_at)
SELECT 2, 1, 'R', 'B', x, 'R B열 ' || x || '번', 'R', 130000,
    CASE WHEN MOD(x, 5) = 0 THEN 'SOLD' ELSE 'AVAILABLE' END,
    CAST(60 + x * 11 AS DOUBLE), 180, 18, 0, NOW()
FROM SYSTEM_RANGE(1, 100) AS t(x);

-- session 2: S 200석
INSERT INTO seat_tb (session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, x_label, y_label, seat_size, seat_angle, updated_at)
SELECT 2, 2, 'S', 'C', x, 'S C열 ' || x || '번', 'S', 110000,
    CASE WHEN MOD(x, 6) = 0 THEN 'SOLD' ELSE 'AVAILABLE' END,
    CAST(60 + x * 9 AS DOUBLE), 240, 18, 0, NOW()
FROM SYSTEM_RANGE(1, 200) AS t(x);

-- session 2: A 150석
INSERT INTO seat_tb (session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, x_label, y_label, seat_size, seat_angle, updated_at)
SELECT 2, 2, 'A', 'D', x, 'A D열 ' || x || '번', 'A', 90000,
    CASE WHEN MOD(x, 7) = 0 THEN 'SOLD' ELSE 'AVAILABLE' END,
    CAST(60 + x * 9 AS DOUBLE), 300, 18, 0, NOW()
FROM SYSTEM_RANGE(1, 150) AS t(x);

-- session 3~15: 각 250석 (R 80 / S 120 / A 50)
INSERT INTO seat_tb (session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, x_label, y_label, seat_size, seat_angle, updated_at)
SELECT sid, 1, 'R', 'A', x, 'R A열 ' || x || '번', 'R', 130000,
    CASE WHEN MOD(x * sid, 5) = 0 THEN 'SOLD' ELSE 'AVAILABLE' END,
    CAST(60 + x * 11 AS DOUBLE), 180, 18, 0, NOW()
FROM (VALUES (3),(4),(5),(6),(7),(8),(9),(10),(11),(12),(13),(14),(15)) AS s(sid)
CROSS JOIN SYSTEM_RANGE(1, 80) AS t(x);

INSERT INTO seat_tb (session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, x_label, y_label, seat_size, seat_angle, updated_at)
SELECT sid, 2, 'S', 'B', x, 'S B열 ' || x || '번', 'S', 110000,
    CASE WHEN MOD(x * sid, 6) = 0 THEN 'SOLD' ELSE 'AVAILABLE' END,
    CAST(60 + x * 9 AS DOUBLE), 240, 18, 0, NOW()
FROM (VALUES (3),(4),(5),(6),(7),(8),(9),(10),(11),(12),(13),(14),(15)) AS s(sid)
CROSS JOIN SYSTEM_RANGE(1, 120) AS t(x);

INSERT INTO seat_tb (session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, x_label, y_label, seat_size, seat_angle, updated_at)
SELECT sid, 2, 'A', 'C', x, 'A C열 ' || x || '번', 'A', 90000,
    CASE WHEN MOD(x * sid, 7) = 0 THEN 'SOLD' ELSE 'AVAILABLE' END,
    CAST(60 + x * 9 AS DOUBLE), 300, 18, 0, NOW()
FROM (VALUES (3),(4),(5),(6),(7),(8),(9),(10),(11),(12),(13),(14),(15)) AS s(sid)
CROSS JOIN SYSTEM_RANGE(1, 50) AS t(x);

-- session 16,17 (k6): 각 1000석 A등급
INSERT INTO seat_tb (session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, x_label, y_label, seat_size, seat_angle, updated_at)
SELECT 16, 1, 'A', 'A', x, 'A구역 A열 ' || x || '번', 'A', 40000, 'AVAILABLE',
    CAST(x AS DOUBLE), 100, 20, 0, NOW()
FROM SYSTEM_RANGE(1, 1000) AS t(x);

INSERT INTO seat_tb (session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, x_label, y_label, seat_size, seat_angle, updated_at)
SELECT 17, 1, 'A', 'A', x, 'A구역 A열 ' || x || '번', 'A', 40000, 'AVAILABLE',
    CAST(x AS DOUBLE), 100, 20, 0, NOW()
FROM SYSTEM_RANGE(1, 1000) AS t(x);


-- ================
--  queue_tb (기본 샘플)
-- ================
INSERT INTO queue_tb (user_id, concert_session_id, queue_number, status, entered_at, expired_at, created_at)
VALUES
    (2, 1, 1, 'ENTERED', NOW(), NULL,                          NOW()),
    (3, 1, 2, 'WAITING', NULL,  DATEADD('MINUTE', 10, NOW()),  NOW()),
    (4, 1, 3, 'WAITING', NULL,  DATEADD('MINUTE', 10, NOW()),  NOW()),
    (5, 3, 1, 'ENTERED', NOW(), NULL,                          NOW()),
    (2, 3, 2, 'EXPIRED', NULL,  DATEADD('MINUTE', -5, NOW()),  DATEADD('MINUTE', -20, NOW()));


-- ================
--  booking_tb
--  user_id 7~206 (realuser1~200), session 1~15 순환, 총 500건
--  PAID 70% / CANCELED 20% / PENDING 10%
-- ================
INSERT INTO booking_tb (user_id, concert_session_id, booking_number, status, total_amount, created_at, expires_at, paid_at, canceled_at)
SELECT
    7 + MOD(x - 1, 200),
    1 + MOD(x - 1, 15),
    'BK-' || LPAD(CAST(x AS VARCHAR), 6, '0'),
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
    DATEADD('HOUR', -MOD(x * 13, 4320), NOW()),
    CASE WHEN MOD(x, 10) = 0 THEN DATEADD('MINUTE', 15 - MOD(x * 13, 4320) * 60, NOW()) ELSE NULL END,
    CASE WHEN MOD(x, 10) NOT IN (0, 1, 2) THEN DATEADD('MINUTE', 5 - MOD(x * 13, 4320) * 60, NOW()) ELSE NULL END,
    CASE WHEN MOD(x, 10) IN (1, 2) THEN DATEADD('HOUR', 1 - MOD(x * 13, 4320), NOW()) ELSE NULL END
FROM SYSTEM_RANGE(1, 500) AS t(x);

-- sarr/ssar 후기 작성 테스트용 결제 완료 예매
-- 각 콘서트별 3건씩 만들어 반복 테스트가 가능하도록 한다.
INSERT INTO booking_tb (user_id, concert_session_id, booking_number, status, total_amount, created_at, expires_at, paid_at, canceled_at)
SELECT
    u.id,
    cs.id,
    'BK-REVIEW-' || UPPER(u.username) || '-' || LPAD(CAST(c.id AS VARCHAR), 2, '0') || '-' || CAST(n.n AS VARCHAR),
    'PAID',
    90000,
    DATEADD('DAY', -6, NOW()),
    NULL,
    DATEADD('DAY', -6, NOW()),
    NULL
FROM user_tb u
JOIN concert_tb c ON 1 = 1
JOIN concert_session_tb cs ON cs.concert_id = c.id
    AND cs.round = '후기 테스트'
JOIN SYSTEM_RANGE(1, 3) AS n(n) ON 1 = 1
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
    'pg_' || b.id,
    'cc_' || b.id,
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
    'pg_c_' || b.id,
    'cc_c_' || b.id,
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
    p.amount - CAST(p.amount * 0.1 AS INT),
    CAST(p.amount * 0.1 AS INT),
    CASE WHEN MOD(p.id, 3) = 0 THEN '개인 사정으로 인한 취소'
         WHEN MOD(p.id, 3) = 1 THEN '일정 변경으로 인한 취소'
         ELSE '중복 예매 취소' END,
    DATEADD('HOUR', 1, p.created_at)
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
    CAST(b.total_amount * 0.01 AS INT),
    CAST(b.total_amount * 0.01 AS INT),
    b.paid_at
FROM booking_tb b
WHERE b.status = 'PAID'
  AND b.paid_at IS NOT NULL
  AND MOD(b.id, 3) != 0;

INSERT INTO point_history_tb (user_id, type, amount, balance, created_at)
SELECT
    b.user_id,
    'USE',
    -CAST(b.total_amount * 0.05 AS INT),
    0,
    b.paid_at
FROM booking_tb b
WHERE b.status = 'PAID'
  AND b.paid_at IS NOT NULL
  AND MOD(b.id, 8) = 0;


-- ================
--  concert_like_tb (공연 좋아요)
--  realuser 200명 × 콘서트 10개 중 일부 → MERGE로 중복 방지
-- ================
MERGE INTO concert_like_tb (user_id, concert_id, created_at)
KEY (user_id, concert_id)
SELECT
    7 + MOD(x - 1, 200),
    1 + MOD(x - 1, 10),
    DATEADD('DAY', -MOD(x * 11, 90), NOW())
FROM SYSTEM_RANGE(1, 600) AS t(x);


-- ================
--  operation_log_tb
-- ================
INSERT INTO operation_log_tb (actor, message, level, created_at)
VALUES
    ('admin',    '아이유 콘서트 1회차 좌석 배치 완료 (500석)',              'INFO', DATEADD('DAY',    -60, NOW())),
    ('admin',    'aespa LIVE TOUR 공연 등록',                             'INFO', DATEADD('DAY',    -45, NOW())),
    ('admin',    '조성진 리사이틀 상태 COMING_SOON 변경',                   'INFO', DATEADD('DAY',    -30, NOW())),
    ('admin',    '황치열 콘서트 CLOSED_SOON 처리',                         'INFO', DATEADD('DAY',     -3, NOW())),
    ('admin',    '박보검 팬미팅 대기열 강제 종료',                           'WARN', DATEADD('DAY',     -1, NOW())),
    ('admin',    '수동 환불 처리 완료 (booking:3)',                         'INFO', DATEADD('HOUR',    -5, NOW())),
    ('admin',    '공지사항 등록: 6월 서비스 점검 안내',                       'INFO', DATEADD('DAY',     -7, NOW())),
    ('admin',    'FAQ 수정: 환불 정책 안내 업데이트',                        'INFO', DATEADD('DAY',    -14, NOW())),
    ('admin',    '메인 배너 교체 - 아이유 콘서트 홍보',                       'INFO', DATEADD('DAY',    -10, NOW())),
    ('admin',    '어뷰징 의심 계정 임시 비활성화 (user:15)',                  'WARN', DATEADD('HOUR',    -2, NOW())),
    ('manager1', '세븐틴 콘서트 3회차 좌석 추가 배치',                        'INFO', DATEADD('DAY',     -5, NOW())),
    ('manager1', '포인트 만료 배치 수동 실행',                               'INFO', DATEADD('HOUR',    -1, NOW())),
    ('manager1', '1:1 문의 답변 처리 (inquiry:12)',                         'INFO', DATEADD('HOUR',    -8, NOW())),
    ('admin',    '대기열 동시 처리 상한 500 → 600 임시 조정',                 'WARN', DATEADD('DAY',     -2, NOW())),
    ('admin',    'k6 부하테스트 완료 후 테스트 데이터 초기화',                  'INFO', DATEADD('HOUR',   -12, NOW()));


-- ================
--  notice_tb (user_id NOT NULL → admin(1) 작성자로 고정)
-- ================
INSERT INTO notice_tb (user_id, title, content, is_pinned, view_count, created_at, updated_at)
VALUES
    (1, '[필독] 티켓팅 유의사항 및 이용약관 안내',
     '<p>안녕하세요. CatchCatch를 이용해 주셔서 감사합니다.</p><p>티켓 구매 전 반드시 유의사항을 확인해 주세요.</p><ol><li>예매 완료 후 취소 시 취소 수수료가 발생합니다.</li><li>입장 시 본인 확인이 필요합니다.</li><li>좌석 선택 후 15분 이내 결제를 완료해야 합니다.</li></ol>',
     true, 1240, DATEADD('DAY', -90, NOW()), DATEADD('DAY', -90, NOW())),

    (1, '[공지] 서버 점검 안내 (6/15 02:00~06:00)',
     '<p>안정적인 서비스 제공을 위해 서버 점검을 실시합니다.</p><ul><li><strong>점검 일시:</strong> 2026년 6월 15일(월) 02:00 ~ 06:00</li><li><strong>점검 내용:</strong> 서버 인프라 업그레이드 및 안정성 개선</li></ul><p>점검 중에는 서비스 이용이 불가합니다. 이용에 불편을 드려 죄송합니다.</p>',
     true, 876, DATEADD('DAY', -10, NOW()), DATEADD('DAY', -10, NOW())),

    (1, '아이유 콘서트 2026 추가 공연 안내',
     '<p>폭발적인 반응에 힘입어 <strong>아이유 콘서트 2026 [HEREH] 추가 공연</strong>이 확정되었습니다.</p><ul><li><strong>추가 공연 예매 오픈:</strong> 7월 1일 오후 8시</li><li><strong>공연 장소:</strong> 올림픽공원 88잔디마당</li></ul><p>많은 관심 부탁드립니다.</p>',
     false, 2341, DATEADD('DAY', -20, NOW()), DATEADD('DAY', -20, NOW())),

    (1, '포인트 적립 정책 변경 안내',
     '<p>2026년 7월 1일부터 포인트 적립률이 변경됩니다.</p><ul><li><strong>변경 전:</strong> 결제 금액의 1% 적립</li><li><strong>변경 후:</strong> 결제 금액의 1.5% 적립</li></ul><p>더욱 풍성한 혜택으로 보답하겠습니다. 감사합니다.</p>',
     false, 534, DATEADD('DAY', -15, NOW()), DATEADD('DAY', -15, NOW())),

    (1, '[이벤트] 첫 예매 포인트 5,000점 증정',
     '<p>첫 예매 완료 고객께 <strong>포인트 5,000점</strong>을 증정합니다.</p><ul><li><strong>대상:</strong> CatchCatch 첫 예매 완료 회원</li><li><strong>적용 기간:</strong> 2026년 8월 31일까지</li><li><strong>지급 시점:</strong> 예매 완료 즉시 자동 적립</li></ul>',
     false, 1892, DATEADD('DAY', -30, NOW()), DATEADD('DAY', -30, NOW()));


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
    (7,  '결제가 완료됐는데 예매가 안 돼있어요', '카카오페이로 결제했는데 예매 내역에 없습니다.', 'PAYMENT', 'RESOLVED', false, true, false, '결제 데이터를 확인한 결과 정상 처리되었습니다. 마이페이지를 새로고침 후 확인해 주세요.', DATEADD('DAY', -5, NOW())),
    (8,  '취소 환불이 언제 되나요?',             '3일 전에 취소했는데 아직 환불이 안 됐습니다.',   'PAYMENT', 'RESOLVED', false, true, false, '카드사 환불은 영업일 기준 3~5일 소요됩니다. 이미 처리가 완료되어 곧 입금될 예정입니다.', DATEADD('DAY', -3, NOW())),
    (9,  '대기열에서 오류가 났어요',              '대기 중 갑자기 화면이 멈췄습니다.',             'TICKET',  'PENDING',  false, false, false, NULL, DATEADD('DAY', -1, NOW())),
    (10, '포인트가 적립이 안 됐어요',             '예매 완료 후 포인트가 적립되지 않았습니다.',     'TICKET',  'RESOLVED', false, true, false, '확인 결과 포인트 적립이 누락되었습니다. 수동으로 포인트를 지급해 드렸습니다.', DATEADD('DAY', -7, NOW())),
    (11, '좌석 선택 화면이 안 열려요',            '좌석 선택 버튼을 눌러도 화면이 안 넘어갑니다.',  'TICKET',  'PENDING',  false, false, false, NULL, DATEADD('HOUR', -3, NOW())),
    (12, '소셜 로그인 연동 문의',                '카카오 로그인 후 기존 계정과 합치고 싶어요.',     'USER',    'PENDING',  false, true, false, NULL, DATEADD('HOUR', -1, NOW()));


-- ================
--  event_tb
-- ================
INSERT INTO event_tb (title, description, notice_content, image_url, condition_type, condition_concert_id, reward_point, point_valid_months, start_date, end_date)
VALUES
    ('첫 예매 완료 포인트 증정',
     '첫 예매를 완료하신 분께 포인트 5,000점을 드립니다.',
     '<h3>유의사항</h3><ul><li>포인트는 참여 즉시 지급됩니다.</li><li>1인 1회 한정입니다.</li><li>포인트 유효기간은 지급일로부터 6개월입니다.</li></ul>',
     NULL, 'NONE', NULL, 5000, 6, DATEADD('DAY', -60, NOW()), DATEADD('DAY', 60, NOW())),

    ('여름 특별 예매 혜택',
     '7~8월 공연 예매 시 추가 포인트 2,000점을 적립해 드립니다.',
     '<h3>유의사항</h3><ul><li>CatchCatch에서 공연을 예매한 이력이 있는 회원만 참여 가능합니다.</li><li>포인트 유효기간은 3개월입니다.</li></ul>',
     NULL, 'BOOKING_HISTORY', NULL, 2000, 3, DATEADD('DAY', -30, NOW()), DATEADD('DAY', 60, NOW())),

    ('SNS 공유 이벤트',
     '공연 예매 후 SNS에 공유하시면 포인트 1,000점 증정합니다.',
     '<h3>이벤트 참여 방법</h3><ol><li>공연을 예매합니다.</li><li>SNS에 예매 인증을 공유합니다.</li><li>포인트 지급받기 버튼을 누릅니다.</li></ol><h3>유의사항</h3><ul><li>1인 1회 참여 가능합니다.</li><li>포인트 유효기간은 3개월입니다.</li></ul>',
     NULL, 'NONE', NULL, 1000, 3, DATEADD('DAY', -14, NOW()), DATEADD('DAY', 16, NOW())),

    ('신규 가입 웰컴 포인트',
     '회원가입 완료 시 포인트 3,000점을 즉시 지급합니다.',
     '<h3>유의사항</h3><ul><li>회원가입 완료 후 참여 버튼을 눌러야 포인트가 지급됩니다.</li><li>포인트 유효기간은 지급일로부터 12개월입니다.</li></ul>',
     NULL, 'NONE', NULL, 3000, 12, DATEADD('DAY', -90, NOW()), DATEADD('DAY', 275, NOW()));


-- ================
--  banner_tb (image_url, display_order, is_active 필수)
-- ================
INSERT INTO banner_tb (image_url, eyebrow, title, highlight, description, button_text, link_url, display_order, is_active)
VALUES
    ('/images/sample/detail-banner.svg', '2026 여름 콘서트', '아이유 콘서트 [HEREH]',        '8월 1~2일 올림픽공원',    '아이유의 2026년 단독 콘서트. 새 앨범 수록곡을 포함한 화려한 무대.', '예매하기', '/concerts/1', 1, true),
    ('/images/sample/detail-banner.svg', 'WORLD TOUR',     '세븐틴 <NEW_> IN SEOUL',       '7월 6~8일 잠실실내체육관', '새로운 챕터의 시작을 알리는 세븐틴의 월드투어 서울 공연.', '예매하기', '/concerts/7', 2, true),
    ('/images/sample/detail-banner.svg', 'LIVE TOUR',      'aespa SYNK : HYPER LINE',     '8월 11~12일 인천',        '가상과 현실을 넘나드는 에스파의 메타버스 라이브 투어.', '예매하기', '/concerts/9', 3, true),
    ('/images/sample/detail-banner.svg', '내한공연',         'Cigarettes After Sex in Seoul','7월 30일 단 하루',        '몽환적이고 감각적인 사운드의 대명사 CAS 내한 공연.', '예매하기', '/concerts/10', 4, true);


-- ================
--  employee_tb
-- ================
INSERT INTO employee_tb (employee_number, account_id, password, name, department, role, status, created_at, updated_at)
VALUES
    ('EMP001', 'admin',    '$2a$10$WpPikpXqj9fC3k1PjL2B.euqIq.uL/fJ8R.R3A5x1aV2L7jM6J.uO', '김최고', '시스템관리팀', 'ADMIN',   'ACTIVE',    NOW(), NOW()),
    ('EMP002', 'manager1', '$2a$10$WpPikpXqj9fC3k1PjL2B.euqIq.uL/fJ8R.R3A5x1aV2L7jM6J.uO', '이매니', '콘서트기획팀', 'MANAGER', 'ACTIVE',    NOW(), NOW()),
    ('EMP003', 'clerk1',   '$2a$10$WpPikpXqj9fC3k1PjL2B.euqIq.uL/fJ8R.R3A5x1aV2L7jM6J.uO', '박사원', '고객지원팀',   'CLERK',   'ACTIVE',    NOW(), NOW()),
    ('EMP004', 'clerk2',   '$2a$10$WpPikpXqj9fC3k1PjL2B.euqIq.uL/fJ8R.R3A5x1aV2L7jM6J.uO', '정정지', '마케팅팀',     'CLERK',   'SUSPENDED', NOW(), NOW()),
    ('EMP005', 'clerk3',   '$2a$10$WpPikpXqj9fC3k1PjL2B.euqIq.uL/fJ8R.R3A5x1aV2L7jM6J.uO', '최퇴사', '영업팀',       'CLERK',   'RESIGNED',  NOW(), NOW());
