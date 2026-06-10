-- =====================================================
--  CatchCatch 테스트 데이터 INSERT
--  H2 Database 기준
-- =====================================================


-- =====================================================
--  1. user_tb
--  비밀번호: 전부 "1234" BCrypt 암호화
-- =====================================================
INSERT INTO user_tb
(username, password, email, phone, profile_image, oauth_provider, role, created_at, is_deleted)
VALUES
    ('admin',
     '$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK',
     'admin@catchcatch.com',
     '010-0000-0000',
     NULL,
     'LOCAL',
     'ADMIN',
     NOW(),
     false),

    ('user1',
     '$2a$10$pJgHFhQeqpkfNKJBLISTlO8Aq3DXdEq7SlAAnNdFpSInGKaOhGKAq',
     'user1@test.com',
     '010-1111-1111',
     NULL,
     'LOCAL',
     'USER',
     NOW(),
     false),

    ('user2',
     '$2a$10$pJgHFhQeqpkfNKJBLISTlO8Aq3DXdEq7SlAAnNdFpSInGKaOhGKAq',
     'user2@test.com',
     '010-2222-2222',
     NULL,
     'LOCAL',
     'USER',
     NOW(),
     false),

    ('user3',
     '$2a$10$pJgHFhQeqpkfNKJBLISTlO8Aq3DXdEq7SlAAnNdFpSInGKaOhGKAq',
     'user3@test.com',
     '010-3333-3333',
     NULL,
     'LOCAL',
     'USER',
     NOW(),
     false),

    ('kakaouser',
     '$2a$10$pJgHFhQeqpkfNKJBLISTlO8Aq3DXdEq7SlAAnNdFpSInGKaOhGKAq',
     'kakao_12345@kakao.com',
     '010-4444-4444',
     NULL,
     'KAKAO',
     'USER',
     NOW(),
     false),

    ('ssar',
     '$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK',
     'ssar@naver.com',
     '010-1234-5678',
     NULL,
     'LOCAL',
     'ADMIN',
     NOW(),
     false);


-- =====================================================
--  2. venue_tb
-- =====================================================
INSERT INTO venue_tb
(name, address, total_capacity, created_at)
VALUES
    ('올림픽공원 체조경기장', '서울특별시 송파구 올림픽로 424', 15000, NOW()),
    ('KSPO DOME', '서울특별시 송파구 올림픽로 424', 15000, NOW()),
    ('잠실실내체육관', '서울특별시 송파구 올림픽로 25', 15000, NOW()),
    ('부산 사직실내체육관', '부산광역시 동래구 사직동 산 29', 12000, NOW()),
    ('인천 남동체육관', '인천광역시 남동구 장수동 503', 10000, NOW());


-- =====================================================
--  3. concert_tb (💡 2026년 하반기 기준 + is_deleted 필드 추가 완료)
-- =====================================================
INSERT INTO concert_tb
(id, venue_id, title, artist, description, poster_url, status,
 category, genre, start_date, end_date, ticket_open_date, age_limit, runtime, organizer, contact,
 detail_banner_url, detail_title, detail_description1, detail_description2, created_at, is_deleted)
VALUES
    -- 1. [콘서트 / concert] -> 예매 진행 중
    (1, 1,
     '아이유 콘서트 2026 [HEREH]', '아이유', '아이유의 2026년 단독 콘서트. 새 앨범 수록곡을 포함한 화려한 무대.', '/images/sample/poster-music.svg', 'OPEN',
     '콘서트', 'concert', '2026-08-01', '2026-08-02', '2026-05-20 20:00:00', '만 7세 이상 관람가', '150분', 'EDAM 엔터테인먼트', '1544-1111',
     '/images/sample/detail-banner.svg', '여름밤을 수놓을 아름다운 목소리', '아이유와 함께하는 잊지 못할 특별한 시간', '놓칠 수 없는 단 이틀간의 공연', NOW(), false),

    -- 2. [뮤지컬 / musical] -> 예매 진행 중
    (2, 2,
     '뮤지컬 <시카고> 오리지널 내한', '내한공연팀', '브로드웨이 역사상 가장 매혹적인 뮤지컬 시카고 내한 공연.', '/images/sample/poster-music.svg', 'OPEN',
     '뮤지컬', 'musical', '2026-09-05', '2026-09-07', '2026-05-25 14:00:00', '만 15세 이상 관람가', '150분', '신시컴퍼니', '1544-2222',
     '/images/sample/detail-banner.svg', '가장 뜨겁고 섹시한 무대', '브로드웨이 오리지널 캐스트의 귀환', 'All That Jazz', NOW(), false),

    -- 3. [클래식 / classic] -> 오픈 예정 (티켓 오픈일이 미래)
    (3, 3,
     '조성진 피아노 리사이틀', '조성진', '세계적인 피아니스트 조성진의 2026년 전국투어 리사이틀.', '/images/sample/poster-music.svg', 'COMING_SOON',
     '클래식', 'classic', '2026-10-10', '2026-10-11', '2026-07-10 18:00:00', '만 7세 이상 관람가', '100분', '크레디아', '1544-3333',
     '/images/sample/detail-banner.svg', '건반 위를 수놓는 완벽한 타건', '쇼팽 콩쿠르 우승자 조성진의 귀환', '영혼을 울리는 클래식의 밤', NOW(), false),

    -- 4. [페스티벌 / festival] -> 예매 진행 중
    (4, 4,
     '부산 재즈 페스티벌 2026', '다수 아티스트', '국내외 유명 재즈 아티스트들의 합동 페스티벌 공연.', '/images/sample/poster-music.svg', 'OPEN',
     '페스티벌', 'festival', '2026-07-20', '2026-07-20', '2026-06-01 12:00:00', '전체 관람가', '240분', '부산문화재단', '1544-4444',
     '/images/sample/detail-banner.svg', '한여름 밤의 낭만적인 재즈 선율', '국내외 최정상급 재즈 뮤지션 총출동', '사직실내체육관에서 즐기는 감미로운 축제', NOW(), false),

    -- 5. [팬미팅 / fanmeeting] -> 마감 임박 (공연일이 코앞)
    (5, 1,
     '박보검 데뷔 16주년 팬미팅', '박보검', '배우 박보검 데뷔 16주년 기념 공식 팬미팅.', '/images/sample/poster-music.svg', 'CLOSED_SOON',
     '팬미팅', 'fanmeeting', '2026-06-25', '2026-06-25', '2026-05-01 20:00:00', '전체 관람가', '120분', '더블랙레이블', '1544-5555',
     '/images/sample/detail-banner.svg', '팬들과 함께하는 특별한 16주년', '보검복지부와 함께하는 따뜻한 시간', '놓칠 수 없는 단 하루', NOW(), false),

    -- =========================================================
    -- 💡 21~25번: 머스태치 템플릿에 하드코딩 되어있던 원본 데이터들 최신화
    -- =========================================================
    (21, 2,
     'DAY6 4TH WORLD TOUR <FOREVER>', 'DAY6', '마이데이를 위한 뜨거운 여정, 데이식스 월드투어 서울 공연.', '/images/sample/poster-music.svg', 'COMING_SOON',
     '콘서트', 'concert', '2026-08-21', '2026-08-25', '2026-06-25 20:00:00', '만 7세 이상 관람가', '150분', 'JYP 엔터테인먼트', '1544-6666',
     '/images/sample/detail-banner.svg', '우리의 모든 순간이 영원이 되도록', 'FOREVER 뜨겁게 빛날 무대', '올림픽공원에서 펼쳐지는 벅찬 감동', NOW(), false),

    (22, 3,
     '세븐틴 WORLD TOUR <NEW_> IN SEOUL', '세븐틴', '새로운 챕터의 시작을 알리는 세븐틴의 월드투어 인 서울.', '/images/sample/poster-triangle.svg', 'OPEN',
     '콘서트', 'concert', '2026-07-06', '2026-07-08', '2026-05-15 20:00:00', '만 7세 이상 관람가', '180분', 'PLEDIS 엔터테인먼트', '1544-7777',
     '/images/sample/detail-banner.svg', '새로운 역사를 써 내려갈 완벽한 무대', '고척돔을 가득 채울 열기', '캐럿과 함께 여는 NEW 챕터', NOW(), false),

    (23, 4,
     '황치열 전국투어 콘서트 <별, 그대> - 서울', '황치열', '가슴 절절한 목소리로 돌아온 황치열의 2026년 전국투어.', '/images/sample/poster-artist.svg', 'CLOSED_SOON',
     '콘서트', 'concert', '2026-06-20', '2026-06-21', '2026-05-10 14:00:00', '만 7세 이상 관람가', '150분', 'TEN2 엔터테인먼트', '1544-8888',
     '/images/sample/detail-banner.svg', '밤하늘의 별처럼 쏟아지는 감동', '별, 그리고 당신을 위한 세레나데', '화이트데이에 전하는 특별한 선물', NOW(), false),

    (24, 5,
     'aespa LIVE TOUR <SYNK : HYPER LINE>', 'aespa', '가상과 현실을 넘나드는 에스파의 메타버스 라이브 투어.', '/images/sample/poster-aespa.svg', 'OPEN',
     '콘서트', 'concert', '2026-08-11', '2026-08-12', '2026-06-02 20:00:00', '만 7세 이상 관람가', '150분', 'SM 엔터테인먼트', '1544-9999',
     '/images/sample/detail-banner.svg', '현실과 광야를 잇는 압도적인 세계관', 'SYNK : HYPER LINE', '인스파이어 아레나를 강타할 광야의 소리', NOW(), false),

    (25, 1,
     'Cigarettes After Sex Live in Seoul', 'Cigarettes After Sex', '몽환적이고 감각적인 사운드의 대명사, CAS 내한 공연.', '/images/sample/poster-cas.svg', 'OPEN',
     '콘서트', 'concert', '2026-07-30', '2026-07-30', '2026-05-30 12:00:00', '만 15세 이상 관람가', '120분', '프라이빗커브', '1544-0000',
     '/images/sample/detail-banner.svg', '당신의 밤을 적실 몽환적인 멜로디', '독보적인 분위기의 라이브', '잠실을 수놓을 짙은 감성', NOW(), false);

-- TODO 추후 삭제예정(정회욱)
ALTER TABLE concert_tb ALTER COLUMN id RESTART WITH 100;

-- =====================================================
--  4. concert_session_tb
-- =====================================================
INSERT INTO concert_session_tb
(concert_id, session_date, session_time, created_at, is_deleted)
VALUES
    ( 1, '2025-08-01', '18:00:00', NOW(), false),
    ( 1, '2025-08-02', '18:00:00', NOW(), false),
    ( 2, '2025-09-05', '19:00:00', NOW(), false),
    ( 2, '2025-09-06', '19:00:00', NOW(), false),
    ( 2, '2025-09-07', '17:00:00', NOW(), false),
    ( 3, '2025-10-10', '18:00:00', NOW(), false),
    ( 3, '2025-10-11', '18:00:00', NOW(), false),
    ( 4, '2025-07-20', '17:00:00', NOW(), false),
    ( 5, '2025-06-01', '18:00:00', NOW(), false);


-- =====================================================
--  5. seat_tb
-- =====================================================
INSERT INTO seat_tb
(id, session_id, seat_number, grade, price, status, updated_at)
VALUES
-- 아이유 VIP석
(1, 1, 'VIP-01', 'VIP', 165000, 'SOLD', NOW()),
(2, 1, 'VIP-02', 'VIP', 165000, 'SOLD', NOW()),
(3, 1, 'VIP-03', 'VIP', 165000, 'HELD', NOW()),
(4, 1, 'VIP-04', 'VIP', 165000, 'AVAILABLE', NOW()),
(5, 1, 'VIP-05', 'VIP', 165000, 'AVAILABLE', NOW()),

-- 아이유 R석
(6, 1, 'R-01', 'R', 132000, 'SOLD', NOW()),
(7, 1, 'R-02', 'R', 132000, 'SOLD', NOW()),
(8, 1, 'R-03', 'R', 132000, 'SOLD', NOW()),
(9, 1, 'R-04', 'R', 132000, 'AVAILABLE', NOW()),
(10, 1, 'R-05', 'R', 132000, 'AVAILABLE', NOW()),
(11, 1, 'R-06', 'R', 132000, 'AVAILABLE', NOW()),
(12, 1, 'R-07', 'R', 132000, 'AVAILABLE', NOW()),
(13, 1, 'R-08', 'R', 132000, 'AVAILABLE', NOW()),
(14, 1, 'R-09', 'R', 132000, 'AVAILABLE', NOW()),
(15, 1, 'R-10', 'R', 132000, 'AVAILABLE', NOW()),

-- 아이유 S석
(16, 1, 'S-01', 'S', 110000, 'SOLD', NOW()),
(17, 1, 'S-02', 'S', 110000, 'AVAILABLE', NOW()),
(18, 1, 'S-03', 'S', 110000, 'AVAILABLE', NOW()),
(19, 1, 'S-04', 'S', 110000, 'AVAILABLE', NOW()),
(20, 1, 'S-05', 'S', 110000, 'AVAILABLE', NOW()),
(21, 1, 'S-06', 'S', 110000, 'AVAILABLE', NOW()),
(22, 1, 'S-07', 'S', 110000, 'AVAILABLE', NOW()),
(23, 1, 'S-08', 'S', 110000, 'AVAILABLE', NOW()),
(24, 1, 'S-09', 'S', 110000, 'AVAILABLE', NOW()),
(25, 1, 'S-10', 'S', 110000, 'AVAILABLE', NOW()),

-- 아이유 A석
(26, 1, 'A-01', 'A', 88000, 'AVAILABLE', NOW()),
(27, 1, 'A-02', 'A', 88000, 'AVAILABLE', NOW()),
(28, 1, 'A-03', 'A', 88000, 'AVAILABLE', NOW()),
(29, 1, 'A-04', 'A', 88000, 'AVAILABLE', NOW()),
(30, 1, 'A-05', 'A', 88000, 'AVAILABLE', NOW()),
(31, 1, 'A-06', 'A', 88000, 'AVAILABLE', NOW()),
(32, 1, 'A-07', 'A', 88000, 'AVAILABLE', NOW()),
(33, 1, 'A-08', 'A', 88000, 'AVAILABLE', NOW()),
(34, 1, 'A-09', 'A', 88000, 'AVAILABLE', NOW()),
(35, 1, 'A-10', 'A', 88000, 'AVAILABLE', NOW()),

-- BTS 샘플 좌석
(36, 3, 'VIP-01', 'VIP', 198000, 'SOLD', NOW()),
(37, 3, 'VIP-02', 'VIP', 198000, 'AVAILABLE', NOW()),
(38, 3, 'R-01', 'R', 165000, 'AVAILABLE', NOW()),
(39, 3, 'S-01', 'S', 132000, 'AVAILABLE', NOW()),
(40, 3, 'A-01', 'A', 99000, 'AVAILABLE', NOW());


-- =====================================================
--  6. queue_tb
-- =====================================================
INSERT INTO queue_tb
(id, user_id, concert_session_id, queue_number, status, entered_at, expired_at, created_at)
VALUES
    (1, 2, 1, 1, 'ENTERED', NOW(), NULL, NOW()),

    (2, 3, 1, 2, 'WAITING', NULL,
     DATEADD('MINUTE', 10, NOW()),
     NOW()),

    (3, 4, 1, 3, 'WAITING', NULL,
     DATEADD('MINUTE', 10, NOW()),
     NOW()),

    (4, 5, 3, 1, 'ENTERED', NOW(), NULL, NOW()),

    (5, 2, 3, 2, 'EXPIRED', NULL,
     DATEADD('MINUTE', -5, NOW()),
     DATEADD('MINUTE', -20, NOW()));



-- =====================================================
--  8. booking_tb
--  현재 Booking Entity 컬럼 기준
-- =====================================================
-- =====================================================
--  7. booking_tb
--  예매 묶음
-- =====================================================
INSERT INTO booking_tb
(id, user_id, concert_session_id, booking_number, status, total_amount, created_at, expires_at, paid_at, canceled_at)
VALUES
-- user1 아이유 VIP-01 + VIP-02 예매 완료
(1, 2, 1,
 'BK-20250528-0001',
 'PAID',
 330000,
 DATEADD('HOUR', -1, NOW()),
 NULL,
 DATEADD('HOUR', -1, NOW()),
 NULL),

-- user2 아이유 VIP-03 결제 대기
(2, 3, 1,
 'BK-20250528-0002',
 'PENDING',
 165000,
 NOW(),
 DATEADD('MINUTE', 5, NOW()),
 NULL,
 NULL),

-- user2 아이유 R-01 예매 완료
(3, 3, 1,
 'BK-20250528-0003',
 'PAID',
 132000,
 DATEADD('HOUR', -2, NOW()),
 NULL,
 DATEADD('HOUR', -2, NOW()),
 NULL),

-- user3 아이유 S-01 예매 취소
(4, 4, 1,
 'BK-20250528-0004',
 'CANCELED',
 110000,
 DATEADD('HOUR', -3, NOW()),
 NULL,
 NULL,
 DATEADD('HOUR', -2, NOW())),

-- user1 BTS VIP-01 예매 완료
(5, 2, 3,
 'BK-20250528-0005',
 'PAID',
 198000,
 DATEADD('MINUTE', -30, NOW()),
 NULL,
 DATEADD('MINUTE', -25, NOW()),
 NULL),

-- ssar 아이유 VIP-04 + R-04 예매 완료
(6, 6, 1,
 'BK-20260604-0006',
 'PAID',
 297000,
 DATEADD('HOUR', -3, NOW()),
 NULL,
 DATEADD('HOUR', -3, NOW()),
 NULL),

-- ssar 아이유 S-02 취소
(7, 6, 1,
 'BK-20260604-0007',
 'CANCELED',
 110000,
 DATEADD('HOUR', -5, NOW()),
 NULL,
 NULL,
 DATEADD('HOUR', -4, NOW()));

-- =====================================================
--  8. booking_seat_tb
--  예매에 포함된 좌석들
-- =====================================================
INSERT INTO booking_seat_tb
(id, booking_id, seat_id, price, seat_number_snapshot, seat_grade_snapshot, created_at)
VALUES
-- booking 1: user1 아이유 VIP-01 + VIP-02
(1, 1, 1, 165000, 'VIP-01', 'VIP', DATEADD('HOUR', -1, NOW())),
(2, 1, 2, 165000, 'VIP-02', 'VIP', DATEADD('HOUR', -1, NOW())),

-- booking 2: user2 아이유 VIP-03 결제 대기
(3, 2, 3, 165000, 'VIP-03', 'VIP', NOW()),

-- booking 3: user2 아이유 R-01 예매 완료
(4, 3, 6, 132000, 'R-01', 'R', DATEADD('HOUR', -2, NOW())),

-- booking 4: user3 아이유 S-01 예매 취소
(5, 4, 16, 110000, 'S-01', 'S', DATEADD('HOUR', -3, NOW())),

-- booking 5: user1 BTS VIP-01 예매 완료
(6, 5, 36, 198000, 'VIP-01', 'VIP', DATEADD('MINUTE', -30, NOW())),

-- booking 6: ssar 아이유 VIP-04 + R-04
(7, 6, 4, 165000, 'VIP-04', 'VIP', DATEADD('HOUR', -3, NOW())),
(8, 6, 9, 132000, 'R-04', 'R', DATEADD('HOUR', -3, NOW())),

-- booking 7: ssar 아이유 S-02 취소
(9, 7, 17, 110000, 'S-02', 'S', DATEADD('HOUR', -5, NOW()));

-- =====================================================
--  9. payment_tb
--  PaymentStatus: READY, PAID, CANCELLED, FAILED
-- =====================================================
INSERT INTO payment_tb
(id, booking_id, pg_tx_id, payment_id, amount, method, status, paid_at, created_at)
VALUES
-- booking 1 결제 완료
(1, 1,
 'pg_test_001',
 'catchcatch_1_20250101_001',
 330000,
 'kakaopay',
 'PAID',
 DATEADD('MINUTE', -55, NOW()),
 DATEADD('HOUR', -1, NOW())),

-- booking 3 결제 완료
(2, 3,
 'pg_test_002',
 'catchcatch_3_20250101_002',
 132000,
 'tosspay',
 'PAID',
 DATEADD('MINUTE', -115, NOW()),
 DATEADD('HOUR', -2, NOW())),

-- booking 4 결제 취소
(3, 4,
 'pg_test_003',
 'catchcatch_4_20250101_003',
 110000,
 'card',
 'CANCELLED',
 NULL,
 DATEADD('HOUR', -3, NOW())),

-- booking 5 결제 완료
(4, 5,
 'pg_test_004',
 'catchcatch_5_20250101_004',
 198000,
 'kakaopay',
 'PAID',
 DATEADD('MINUTE', -25, NOW()),
 DATEADD('MINUTE', -30, NOW())),

-- booking 6 ssar 결제 완료
(5, 6,
 'pg_test_005',
 'catchcatch_6_20260604_005',
 297000,
 'card',
 'PAID',
 DATEADD('HOUR', -3, NOW()),
 DATEADD('HOUR', -3, NOW()));

-- =====================================================
--  10. refund_tb
-- =====================================================
INSERT INTO refund_tb
(id, payment_id, amount, cancel_fee, reason, refunded_at)
VALUES
    (1, 3, 99000, 11000, '개인 사정으로 인한 취소', DATEADD('HOUR', -2, NOW()));


/*
-- =====================================================
--  확인 쿼리
-- =====================================================

SELECT id, username, email, oauth_provider, role
FROM user_tb;

SELECT c.id, c.title, c.artist, v.name AS venue, c.status
FROM concert_tb c
JOIN venue_tb v ON c.venue_id = v.id;

SELECT seat_number, grade, price, status
FROM seat_tb
WHERE session_id = 1
ORDER BY grade, seat_number;

SELECT b.id,
       u.username,
       b.booking_number,
       b.status,
       b.total_amount,
       cs.session_date,
       cs.session_time
FROM booking_tb b
JOIN user_tb u ON b.user_id = u.id
JOIN concert_session_tb cs ON b.concert_session_id = cs.id
ORDER BY b.id;

SELECT bs.id,
       bs.booking_id,
       s.seat_number,
       s.grade,
       bs.price
FROM booking_seat_tb bs
JOIN seat_tb s ON bs.seat_id = s.id
ORDER BY bs.booking_id, bs.id;

SELECT p.id,
       b.booking_number,
       p.amount,
       p.method,
       p.status,
       p.paid_at
FROM payment_tb p
JOIN booking_tb b ON p.booking_id = b.id
ORDER BY p.id;

*/

-- =====================================================
-- AUTO_INCREMENT 시작 번호 보정
-- 기존 테스트 데이터가 id를 직접 넣었기 때문에 다음 생성 id를 맞춰준다.
-- =====================================================
-- ssar 예매 좌석 SOLD 처리
-- 예매/결제 데이터와 좌석 상태 맞추기
UPDATE seat_tb SET status = 'SOLD' WHERE id IN (1, 2, 6, 36, 4, 9);
UPDATE seat_tb SET status = 'HELD' WHERE id IN (3);
UPDATE seat_tb SET status = 'AVAILABLE' WHERE id IN (16, 17);

ALTER TABLE booking_tb ALTER COLUMN id RESTART WITH 8;
ALTER TABLE booking_seat_tb ALTER COLUMN id RESTART WITH 10;
ALTER TABLE payment_tb ALTER COLUMN id RESTART WITH 6;
ALTER TABLE refund_tb ALTER COLUMN id RESTART WITH 2;