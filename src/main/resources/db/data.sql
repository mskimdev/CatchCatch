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
     '$2a$10$pJgHFhQeqpkfNKJBLISTlO8Aq3DXdEq7SlAAnNdFpSInGKaOhGKAq',
     'admin@catchcatch.com',
     '010-0000-0000',
     NULL,
     'LOCAL',
     'USER',
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
--  3. concert_tb
-- =====================================================
INSERT INTO concert_tb
(id, venue_id, title, artist, description, poster_url, status, created_at)
VALUES
    (1, 1,
     '아이유 콘서트 2025 [HEREH]',
     '아이유',
     '아이유의 2025년 단독 콘서트. 새 앨범 수록곡을 포함한 화려한 무대.',
     '/images/sample/poster-music.svg',
     'OPEN',
     NOW()),

    (2, 2,
     'BTS WORLD TOUR 2025',
     'BTS',
     'BTS 월드투어 서울 공연. 역대 최대 규모의 세트와 퍼포먼스.',
     '/images/sample/poster-music.svg',
     'OPEN',
     NOW()),

    (3, 3,
     '임영웅 콘서트 [IM HERO]',
     '임영웅',
     '임영웅의 전국투어 서울 공연.',
     '/images/sample/poster-music.svg',
     'OPEN',
     NOW()),

    (4, 4,
     '부산 재즈 페스티벌 2025',
     '다수 아티스트',
     '국내외 유명 재즈 아티스트들의 합동 공연.',
     '/images/sample/poster-music.svg',
     'OPEN',
     NOW()),

    (5, 1,
     '세븐틴 콘서트 [FOLLOW]',
     'SEVENTEEN',
     '세븐틴의 국내 단독 콘서트.',
     '/images/sample/poster-music.svg',
     'CLOSED',
     NOW());


-- =====================================================
--  4. concert_session_tb
-- =====================================================
INSERT INTO concert_session_tb
(id, concert_id, session_date, session_time, created_at)
VALUES
-- 아이유
(1, 1, '2025-08-01', '18:00:00', NOW()),
(2, 1, '2025-08-02', '18:00:00', NOW()),

-- BTS
(3, 2, '2025-09-05', '19:00:00', NOW()),
(4, 2, '2025-09-06', '19:00:00', NOW()),
(5, 2, '2025-09-07', '17:00:00', NOW()),

-- 임영웅
(6, 3, '2025-10-10', '18:00:00', NOW()),
(7, 3, '2025-10-11', '18:00:00', NOW()),

-- 부산 재즈
(8, 4, '2025-07-20', '17:00:00', NOW()),

-- 세븐틴
(9, 5, '2025-06-01', '18:00:00', NOW());


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
--  7. booking_tb
--  현재 Booking Entity 컬럼 기준
-- =====================================================
INSERT INTO booking_tb
(id, user_id, concert_session_id, seat_id, booking_number, status, created_at, expires_at, canceled_at)
VALUES
-- user1 아이유 VIP-01 예매 완료
(1, 2, 1, 1,
 'BK-20250528-0001',
 'CONFIRMED',
 DATEADD('HOUR', -1, NOW()),
 NULL,
 NULL),

-- user1 아이유 VIP-02 예매 완료
(2, 2, 1, 2,
 'BK-20250528-0002',
 'CONFIRMED',
 DATEADD('HOUR', -1, NOW()),
 NULL,
 NULL),

-- user2 아이유 VIP-03 결제 대기
(3, 3, 1, 3,
 'BK-20250528-0003',
 'PENDING',
 NOW(),
 DATEADD('MINUTE', 5, NOW()),
 NULL),

-- user2 아이유 R-01 예매 완료
(4, 3, 1, 6,
 'BK-20250528-0004',
 'CONFIRMED',
 DATEADD('HOUR', -2, NOW()),
 NULL,
 NULL),

-- user3 아이유 S-01 예매 취소
(5, 4, 1, 16,
 'BK-20250528-0005',
 'CANCELLED',
 DATEADD('HOUR', -3, NOW()),
 NULL,
 DATEADD('HOUR', -2, NOW())),

-- user1 BTS VIP-01 예매 완료
(6, 2, 3, 36,
 'BK-20250528-0006',
 'CONFIRMED',
 DATEADD('MINUTE', -30, NOW()),
 NULL,
 NULL);


-- =====================================================
--  8. payment_tb
--  PaymentStatus: READY, PAID, CANCELLED, FAILED
-- =====================================================
INSERT INTO payment_tb
(id, booking_id, user_id, imp_uid, merchant_uid, amount, method, status, paid_at, created_at)
VALUES
    (1, 1, 2,
     'imp_test_001',
     'catchcatch_1_20250101_001',
     165000,
     'kakaopay',
     'PAID',
     DATEADD('MINUTE', -55, NOW()),
     DATEADD('HOUR', -1, NOW())),

    (2, 2, 2,
     'imp_test_002',
     'catchcatch_2_20250101_002',
     165000,
     'card',
     'PAID',
     DATEADD('MINUTE', -55, NOW()),
     DATEADD('HOUR', -1, NOW())),

    (3, 4, 3,
     'imp_test_003',
     'catchcatch_4_20250101_003',
     132000,
     'tosspay',
     'PAID',
     DATEADD('MINUTE', -115, NOW()),
     DATEADD('HOUR', -2, NOW())),

    (4, 5, 4,
     'imp_test_004',
     'catchcatch_5_20250101_004',
     110000,
     'card',
     'CANCELLED',
     NULL,
     DATEADD('HOUR', -3, NOW())),

    (5, 6, 2,
     'imp_test_005',
     'catchcatch_6_20250101_005',
     198000,
     'kakaopay',
     'PAID',
     DATEADD('MINUTE', -25, NOW()),
     DATEADD('MINUTE', -30, NOW()));


-- =====================================================
--  9. refund_tb
-- =====================================================
INSERT INTO refund_tb
(id, payment_id, booking_id, amount, fee, reason, refunded_at)
VALUES
    (1, 4, 5, 99000, 11000, '개인 사정으로 인한 취소', DATEADD('HOUR', -2, NOW()));


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
       b.concert_session_id,
       s.seat_number,
       s.grade,
       b.status,
       b.created_at
FROM booking_tb b
JOIN user_tb u ON b.user_id = u.id
JOIN seat_tb s ON b.seat_id = s.id
ORDER BY b.id;

SELECT p.id,
       u.username,
       p.amount,
       p.method,
       p.status,
       p.paid_at
FROM payment_tb p
JOIN user_tb u ON p.user_id = u.id
ORDER BY p.id;

SELECT q.id,
       q.user_id,
       q.concert_session_id,
       q.queue_number,
       q.status
FROM queue_tb q
ORDER BY q.id;

*/