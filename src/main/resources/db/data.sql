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
     'USER',
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
--  11. notice_tb
--  공지사항 (작성자: admin, ssar)
-- =====================================================
INSERT INTO notice_tb
(title, content, user_id, is_pinned, view_count, created_at, updated_at)
VALUES
    ('서비스 이용약관 개정 안내',
     '안녕하세요, CatchCatch입니다.

2026년 7월 1일부터 서비스 이용약관이 일부 개정됩니다.
주요 변경 사항은 다음과 같습니다.

1. 개인정보 수집 항목 변경
2. 서비스 이용 제한 조항 명확화
3. 분쟁 해결 절차 추가

자세한 내용은 이용약관 전문을 확인해주세요.

감사합니다.',
     1, true, 1520, DATEADD('DAY', -30, NOW()), DATEADD('DAY', -30, NOW())),

    ('티켓 예매 시스템 정기 점검 안내 (6/15)',
     '안녕하세요, CatchCatch입니다.

서비스 품질 향상을 위한 정기 시스템 점검이 예정되어 있습니다.

■ 점검 일시: 2026년 6월 15일(월) 02:00 ~ 06:00 (4시간)
■ 점검 내용: 서버 인프라 업그레이드 및 예매 시스템 최적화

점검 시간 중에는 모든 서비스 이용이 불가합니다.
이용에 불편을 드려 죄송합니다.',
     1, true, 834, DATEADD('DAY', -10, NOW()), DATEADD('DAY', -10, NOW())),

    ('취소/환불 정책 변경 안내',
     '안녕하세요, CatchCatch입니다.

2026년 6월 1일부터 취소/환불 정책이 아래와 같이 변경됩니다.

■ 변경 전: 공연일 7일 전까지 100% 환불
■ 변경 후: 공연일 10일 전까지 100% 환불 / 9~7일 전 90% 환불

보다 나은 서비스를 제공하기 위한 조치이니 양해 부탁드립니다.',
     1, false, 672, DATEADD('DAY', -45, NOW()), DATEADD('DAY', -45, NOW())),

    ('2026년 여름 특가 예매 이벤트 안내',
     '안녕하세요, CatchCatch입니다.

무더운 여름, 특별한 공연 관람 기회를 드립니다!

■ 이벤트 기간: 2026년 6월 20일 ~ 7월 31일
■ 혜택: 7월 공연 전 좌석 10% 할인 + 음료 쿠폰 증정
■ 대상: CatchCatch 회원 전체

지금 바로 예매하고 시원한 여름을 즐기세요!',
     6, false, 441, DATEADD('DAY', -5, NOW()), DATEADD('DAY', -5, NOW())),

    ('앱 v2.3.0 업데이트 안내',
     '안녕하세요, CatchCatch입니다.

CatchCatch 앱이 v2.3.0으로 업데이트 되었습니다.

■ 주요 변경 사항
- 좌석 선택 UI 개선
- 결제 속도 향상
- 예매 내역 화면 디자인 개편
- 버그 수정 다수

최신 버전으로 업데이트하여 더욱 편리한 서비스를 경험하세요.',
     6, false, 298, DATEADD('DAY', -2, NOW()), DATEADD('DAY', -2, NOW())),

    ('개인정보 처리방침 개정 안내',
     '안녕하세요, CatchCatch입니다.

개인정보 보호법 개정에 따라 개인정보 처리방침이 일부 변경됩니다.

■ 시행일: 2026년 8월 1일
■ 주요 변경 내용:
  - 개인정보 보유 기간 명확화
  - 제3자 제공 항목 조정

변경된 처리방침은 홈페이지에서 확인하실 수 있습니다.',
     1, false, 187, DATEADD('DAY', -60, NOW()), DATEADD('DAY', -60, NOW()));


-- =====================================================
--  12. inquiry_tb
--  1:1 문의 (다양한 유저, 카테고리, 상태)
-- =====================================================
INSERT INTO inquiry_tb
(title, content, user_id, category, status, is_public, notify_email, notify_sms, reply, created_at)
VALUES
    -- RESOLVED: 답변 완료
    ('예매한 티켓을 취소하고 싶은데 방법을 모르겠어요',
     '안녕하세요. 아이유 콘서트 티켓을 예매했는데 사정이 생겨서 취소하고 싶습니다. 취소는 어떻게 하면 되나요? 환불은 얼마나 걸리나요?',
     2, 'TICKET', 'RESOLVED', true, true, false,
     '안녕하세요, CatchCatch 고객센터입니다. 마이페이지 > 예매내역에서 해당 예매 건을 선택하신 후 취소 버튼을 눌러주시면 됩니다. 환불은 영업일 기준 3~5일 내 처리됩니다. 감사합니다.',
     DATEADD('DAY', -14, NOW())),

    ('결제는 됐는데 예매 완료 문자가 안 왔어요',
     '세븐틴 콘서트 티켓을 카카오페이로 결제했는데 결제 완료 문자는 왔는데 예매 완료 확인 문자가 오지 않았습니다. 예매가 정상적으로 된 건지 확인 부탁드립니다.',
     3, 'PAYMENT', 'RESOLVED', false, true, true,
     '안녕하세요, CatchCatch 고객센터입니다. 확인 결과 예매가 정상적으로 완료되었습니다. 문자 발송 지연이 있었던 점 사과드립니다. 마이페이지 > 예매내역에서 예매 내역을 확인하실 수 있습니다.',
     DATEADD('DAY', -7, NOW())),

    ('카카오 로그인 연동 해제하고 싶어요',
     '카카오 소셜 로그인으로 가입했는데 카카오 연동을 해제하고 일반 계정으로 전환하고 싶습니다. 가능한가요?',
     5, 'USER', 'RESOLVED', false, false, false,
     '안녕하세요, CatchCatch 고객센터입니다. 현재 소셜 로그인 계정의 일반 계정 전환은 지원하지 않습니다. 불편하시더라도 카카오 계정을 유지하거나 새 계정으로 가입해 주시기 바랍니다. 해당 기능은 추후 업데이트 예정입니다.',
     DATEADD('DAY', -20, NOW())),

    -- PENDING: 답변 대기
    ('환불 신청 후 2주가 지났는데 아직 환불이 안 됐어요',
     '박보검 팬미팅 티켓을 취소했는데 환불 신청한 지 2주가 넘었습니다. 카드사에 문의하니 환불 요청이 아직 안 들어왔다고 하네요. 빠른 처리 부탁드립니다. 예매번호: BK-20250528-0004',
     4, 'PAYMENT', 'PENDING', false, true, true,
     NULL,
     DATEADD('DAY', -3, NOW())),

    ('공연 당일 티켓을 분실했습니다',
     '오늘 공연에 가려고 하는데 모바일 티켓 화면을 캡처해 놓은 게 지워졌습니다. 재발급이 가능한가요? 예매번호는 BK-20250528-0001입니다.',
     2, 'TICKET', 'PENDING', false, true, false,
     NULL,
     DATEADD('HOUR', -5, NOW())),

    ('결제 수단을 변경하고 싶습니다',
     '예매 후 결제 수단을 카카오페이에서 신용카드로 변경하고 싶은데 가능한가요? 아직 결제 전 상태입니다.',
     3, 'PAYMENT', 'PENDING', true, false, false,
     NULL,
     DATEADD('HOUR', -2, NOW())),

    ('회원 탈퇴 후 데이터는 어떻게 되나요',
     '회원 탈퇴를 고려 중인데 탈퇴 후 예매 내역이나 개인정보는 어떻게 처리되는지 궁금합니다.',
     4, 'USER', 'PENDING', true, true, false,
     NULL,
     DATEADD('HOUR', -1, NOW())),

    -- CANCELLED: 취소된 문의
    ('티켓 좌석 변경이 가능한가요',
     '예매한 좌석을 더 좋은 자리로 변경하고 싶습니다. 가능한지 궁금합니다.',
     5, 'TICKET', 'CANCELLED', false, false, false,
     NULL,
     DATEADD('DAY', -10, NOW())),

    ('기타 서비스 이용 중 오류가 발생했습니다',
     '예매 화면에서 좌석 선택 후 다음 단계로 넘어가지 않는 오류가 발생했습니다. 브라우저 새로고침 후 해결됐습니다. 참고로 제보 드립니다.',
     2, 'ETC', 'CANCELLED', false, false, false,
     NULL,
     DATEADD('DAY', -25, NOW()));


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
ALTER TABLE notice_tb ALTER COLUMN id RESTART WITH 7;
ALTER TABLE inquiry_tb ALTER COLUMN id RESTART WITH 10;