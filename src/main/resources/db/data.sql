-- =====================================================
--  CatchCatch 테스트 데이터 INSERT
--  MySQL 8.x
-- =====================================================
--  1. user_tb
--  비밀번호: 전부 "1234" BCrypt 암호화
-- =====================================================
INSERT INTO user_tb (id, username, password, email, phone, profile_image, oauth_provider, created_at) VALUES
                                                                                                          (1,  'admin',    '$2a$10$pJgHFhQeqpkfNKJBLISTlO8Aq3DXdEq7SlAAnNdFpSInGKaOhGKAq', 'admin@catchcatch.com',   '010-0000-0000', NULL,          'LOCAL',  NOW()),
                                                                                                          (2,  'user1',    '$2a$10$pJgHFhQeqpkfNKJBLISTlO8Aq3DXdEq7SlAAnNdFpSInGKaOhGKAq', 'user1@test.com',         '010-1111-1111', NULL,          'LOCAL',  NOW()),
                                                                                                          (3,  'user2',    '$2a$10$pJgHFhQeqpkfNKJBLISTlO8Aq3DXdEq7SlAAnNdFpSInGKaOhGKAq', 'user2@test.com',         '010-2222-2222', NULL,          'LOCAL',  NOW()),
                                                                                                          (4,  'user3',    '$2a$10$pJgHFhQeqpkfNKJBLISTlO8Aq3DXdEq7SlAAnNdFpSInGKaOhGKAq', 'user3@test.com',         '010-3333-3333', NULL,          'LOCAL',  NOW()),
                                                                                                          (5,  'kakaouser','$2a$10$pJgHFhQeqpkfNKJBLISTlO8Aq3DXdEq7SlAAnNdFpSInGKaOhGKAq', 'kakao_12345@kakao.com',  '010-4444-4444', NULL,          'KAKAO',  NOW());


-- =====================================================
--  2. user_role_tb
-- =====================================================
INSERT INTO user_role_tb (id, user_id, role) VALUES
                                                 (1, 1, 'ADMIN'),
                                                 (2, 1, 'USER'),
                                                 (3, 2, 'USER'),
                                                 (4, 3, 'USER'),
                                                 (5, 4, 'USER'),
                                                 (6, 5, 'USER');


-- =====================================================
--  3. venue_tb
-- =====================================================
INSERT INTO venue_tb (id, name, address, total_capacity, created_at) VALUES
                                                                         (1, '올림픽공원 체조경기장',  '서울특별시 송파구 올림픽로 424',       15000, NOW()),
                                                                         (2, 'KSPO DOME',              '서울특별시 송파구 올림픽로 424',       15000, NOW()),
                                                                         (3, '잠실실내체육관',          '서울특별시 송파구 올림픽로 25',        15000, NOW()),
                                                                         (4, '부산 사직실내체육관',     '부산광역시 동래구 사직동 산 29',       12000, NOW()),
                                                                         (5, '인천 남동체육관',         '인천광역시 남동구 장수동 503',         10000, NOW());


-- =====================================================
--  4. concert_tb
-- =====================================================
INSERT INTO concert_tb (id, venue_id, title, artist, description, poster_url, status, created_at) VALUES
                                                                                                      (1, 1, '아이유 콘서트 2025 [HEREH]',         '아이유',       '아이유의 2025년 단독 콘서트. 새 앨범 수록곡을 포함한 화려한 무대.',  '/images/poster/iu_2025.jpg',       'OPEN',      NOW()),
                                                                                                      (2, 2, 'BTS WORLD TOUR 2025',               'BTS',          'BTS 월드투어 서울 공연. 역대 최대 규모의 세트와 퍼포먼스.',           '/images/poster/bts_2025.jpg',      'OPEN',      NOW()),
                                                                                                      (3, 3, '임영웅 콘서트 [IM HERO]',            '임영웅',       '임영웅의 전국투어 서울 공연.',                                       '/images/poster/lim_2025.jpg',      'OPEN',      NOW()),
                                                                                                      (4, 4, '부산 재즈 페스티벌 2025',            '다수 아티스트', '국내외 유명 재즈 아티스트들의 합동 공연.',                          '/images/poster/jazz_2025.jpg',     'OPEN',      NOW()),
                                                                                                      (5, 1, '세븐틴 콘서트 [FOLLOW]',             'SEVENTEEN',    '세븐틴의 국내 단독 콘서트.',                                        '/images/poster/svt_2025.jpg',      'CLOSED',    NOW());


-- =====================================================
--  5. concert_session_tb
-- =====================================================
INSERT INTO concert_session_tb (id, concert_id, session_date, session_time, created_at) VALUES
-- 아이유 (2회차)
(1,  1, '2025-08-01', '18:00:00', NOW()),
(2,  1, '2025-08-02', '18:00:00', NOW()),
-- BTS (3회차)
(3,  2, '2025-09-05', '19:00:00', NOW()),
(4,  2, '2025-09-06', '19:00:00', NOW()),
(5,  2, '2025-09-07', '17:00:00', NOW()),
-- 임영웅 (2회차)
(6,  3, '2025-10-10', '18:00:00', NOW()),
(7,  3, '2025-10-11', '18:00:00', NOW()),
-- 부산 재즈 (1회차)
(8,  4, '2025-07-20', '17:00:00', NOW()),
-- 세븐틴 (1회차, CLOSED)
(9,  5, '2025-06-01', '18:00:00', NOW());


-- =====================================================
--  6. seat_tb
--  아이유 1회차(session_id=1) 기준 샘플 좌석
--  VIP 5석 / R 10석 / S 10석 / A 10석
-- =====================================================
INSERT INTO seat_tb (id, session_id, seat_number, grade, price, status, updated_at) VALUES
-- VIP (session 1 - 아이유 1회차)
(1,  1, 'VIP-01', 'VIP', 165000, 'SOLD',      NOW()),
(2,  1, 'VIP-02', 'VIP', 165000, 'SOLD',      NOW()),
(3,  1, 'VIP-03', 'VIP', 165000, 'HELD',      NOW()),
(4,  1, 'VIP-04', 'VIP', 165000, 'AVAILABLE', NOW()),
(5,  1, 'VIP-05', 'VIP', 165000, 'AVAILABLE', NOW()),
-- R석
(6,  1, 'R-01',   'R',   132000, 'SOLD',      NOW()),
(7,  1, 'R-02',   'R',   132000, 'SOLD',      NOW()),
(8,  1, 'R-03',   'R',   132000, 'SOLD',      NOW()),
(9,  1, 'R-04',   'R',   132000, 'AVAILABLE', NOW()),
(10, 1, 'R-05',   'R',   132000, 'AVAILABLE', NOW()),
(11, 1, 'R-06',   'R',   132000, 'AVAILABLE', NOW()),
(12, 1, 'R-07',   'R',   132000, 'AVAILABLE', NOW()),
(13, 1, 'R-08',   'R',   132000, 'AVAILABLE', NOW()),
(14, 1, 'R-09',   'R',   132000, 'AVAILABLE', NOW()),
(15, 1, 'R-10',   'R',   132000, 'AVAILABLE', NOW()),
-- S석
(16, 1, 'S-01',   'S',   110000, 'SOLD',      NOW()),
(17, 1, 'S-02',   'S',   110000, 'AVAILABLE', NOW()),
(18, 1, 'S-03',   'S',   110000, 'AVAILABLE', NOW()),
(19, 1, 'S-04',   'S',   110000, 'AVAILABLE', NOW()),
(20, 1, 'S-05',   'S',   110000, 'AVAILABLE', NOW()),
(21, 1, 'S-06',   'S',   110000, 'AVAILABLE', NOW()),
(22, 1, 'S-07',   'S',   110000, 'AVAILABLE', NOW()),
(23, 1, 'S-08',   'S',   110000, 'AVAILABLE', NOW()),
(24, 1, 'S-09',   'S',   110000, 'AVAILABLE', NOW()),
(25, 1, 'S-10',   'S',   110000, 'AVAILABLE', NOW()),
-- A석
(26, 1, 'A-01',   'A',   88000,  'AVAILABLE', NOW()),
(27, 1, 'A-02',   'A',   88000,  'AVAILABLE', NOW()),
(28, 1, 'A-03',   'A',   88000,  'AVAILABLE', NOW()),
(29, 1, 'A-04',   'A',   88000,  'AVAILABLE', NOW()),
(30, 1, 'A-05',   'A',   88000,  'AVAILABLE', NOW()),
(31, 1, 'A-06',   'A',   88000,  'AVAILABLE', NOW()),
(32, 1, 'A-07',   'A',   88000,  'AVAILABLE', NOW()),
(33, 1, 'A-08',   'A',   88000,  'AVAILABLE', NOW()),
(34, 1, 'A-09',   'A',   88000,  'AVAILABLE', NOW()),
(35, 1, 'A-10',   'A',   88000,  'AVAILABLE', NOW()),
-- BTS 1회차(session_id=3) 샘플 좌석
(36, 3, 'VIP-01', 'VIP', 198000, 'SOLD',      NOW()),
(37, 3, 'VIP-02', 'VIP', 198000, 'AVAILABLE', NOW()),
(38, 3, 'R-01',   'R',   165000, 'AVAILABLE', NOW()),
(39, 3, 'S-01',   'S',   132000, 'AVAILABLE', NOW()),
(40, 3, 'A-01',   'A',   99000,  'AVAILABLE', NOW());


-- =====================================================
--  7. waiting_queue_tb
-- =====================================================
INSERT INTO waiting_queue_tb (id, user_id, session_id, position, status, entered_at, expired_at, created_at) VALUES
                                                                                                                 (1, 2, 1, 1, 'ENTERED',  NOW(),       NULL,                           NOW()),
                                                                                                                 (2, 3, 1, 2, 'WAITING',  NULL,        DATE_ADD(NOW(), INTERVAL 10 MINUTE), NOW()),
                                                                                                                 (3, 4, 1, 3, 'WAITING',  NULL,        DATE_ADD(NOW(), INTERVAL 10 MINUTE), NOW()),
                                                                                                                 (4, 5, 3, 1, 'ENTERED',  NOW(),       NULL,                           NOW()),
                                                                                                                 (5, 2, 3, 2, 'EXPIRED',  NULL,        DATE_SUB(NOW(), INTERVAL 5 MINUTE),  DATE_SUB(NOW(), INTERVAL 20 MINUTE));


-- =====================================================
--  8. booking_tb
-- =====================================================
INSERT INTO booking_tb (id, user_id, seat_id, total_price, status, booked_at, expired_at, confirmed_at) VALUES
-- user2가 아이유 VIP-01 예매 → CONFIRMED
(1, 2, 1, 165000, 'CONFIRMED', DATE_SUB(NOW(), INTERVAL 1 HOUR),  NULL,                                  DATE_SUB(NOW(), INTERVAL 55 MINUTE)),
-- user2가 아이유 VIP-02 예매 → CONFIRMED
(2, 2, 2, 165000, 'CONFIRMED', DATE_SUB(NOW(), INTERVAL 1 HOUR),  NULL,                                  DATE_SUB(NOW(), INTERVAL 55 MINUTE)),
-- user3가 아이유 VIP-03 예매 → PENDING (5분 타이머 진행중)
(3, 3, 3, 165000, 'PENDING',   NOW(),                              DATE_ADD(NOW(), INTERVAL 5 MINUTE),    NULL),
-- user3가 아이유 R-01 예매 → CONFIRMED
(4, 3, 6, 132000, 'CONFIRMED', DATE_SUB(NOW(), INTERVAL 2 HOUR),  NULL,                                  DATE_SUB(NOW(), INTERVAL 115 MINUTE)),
-- user4가 아이유 S-01 예매 → CANCELLED
(5, 4, 16, 110000, 'CANCELLED', DATE_SUB(NOW(), INTERVAL 3 HOUR), NULL,                                  NULL),
-- user2가 BTS VIP-01 예매 → CONFIRMED
(6, 2, 36, 198000, 'CONFIRMED', DATE_SUB(NOW(), INTERVAL 30 MINUTE), NULL,                               DATE_SUB(NOW(), INTERVAL 25 MINUTE));


-- =====================================================
--  9. payment_tb
-- =====================================================
INSERT INTO payment_tb (id, booking_id, user_id, imp_uid, merchant_uid, amount, method, status, paid_at, created_at) VALUES
                                                                                                                         (1, 1, 2, 'imp_test_001', 'catchcatch_1_20250101_001', 165000, 'kakaopay', 'PAID',      DATE_SUB(NOW(), INTERVAL 55 MINUTE), DATE_SUB(NOW(), INTERVAL 1 HOUR)),
                                                                                                                         (2, 2, 2, 'imp_test_002', 'catchcatch_2_20250101_002', 165000, 'card',     'PAID',      DATE_SUB(NOW(), INTERVAL 55 MINUTE), DATE_SUB(NOW(), INTERVAL 1 HOUR)),
                                                                                                                         (3, 4, 3, 'imp_test_003', 'catchcatch_4_20250101_003', 132000, 'tosspay',  'PAID',      DATE_SUB(NOW(), INTERVAL 115 MINUTE), DATE_SUB(NOW(), INTERVAL 2 HOUR)),
                                                                                                                         (4, 5, 4, 'imp_test_004', 'catchcatch_5_20250101_004', 110000, 'card',     'CANCELLED', NULL,                                 DATE_SUB(NOW(), INTERVAL 3 HOUR)),
                                                                                                                         (5, 6, 2, 'imp_test_005', 'catchcatch_6_20250101_005', 198000, 'kakaopay', 'PAID',      DATE_SUB(NOW(), INTERVAL 25 MINUTE), DATE_SUB(NOW(), INTERVAL 30 MINUTE));


-- =====================================================
--  10. refund_tb
--  booking_id=5 (user4, 아이유 S석) 취소 → 환불
-- =====================================================
INSERT INTO refund_tb (id, payment_id, booking_id, amount, fee, reason, refunded_at) VALUES
    (1, 4, 5, 99000, 11000, '개인 사정으로 인한 취소', DATE_SUB(NOW(), INTERVAL 2 HOUR));

/*
-- =====================================================
--  확인 쿼리
-- =====================================================
SELECT '=== user_tb ===' AS '';
SELECT id, username, email, oauth_provider FROM user_tb;

SELECT '=== concert_tb ===' AS '';
SELECT c.id, c.title, c.artist, v.name AS venue, c.status
FROM concert_tb c JOIN venue_tb v ON c.venue_id = v.id;

SELECT '=== 아이유 1회차 좌석 현황 ===' AS '';
SELECT seat_number, grade, price, status
FROM seat_tb WHERE session_id = 1 ORDER BY grade, seat_number;

SELECT '=== 예매 현황 ===' AS '';
SELECT b.id, u.username, s.seat_number, s.grade, b.total_price, b.status, b.booked_at
FROM booking_tb b
         JOIN user_tb u ON b.user_id = u.id
         JOIN seat_tb s ON b.seat_id = s.id
ORDER BY b.id;

SELECT '=== 결제 현황 ===' AS '';
SELECT p.id, u.username, p.amount, p.method, p.status, p.paid_at
FROM payment_tb p
         JOIN user_tb u ON p.user_id = u.id
ORDER BY p.id;

 */