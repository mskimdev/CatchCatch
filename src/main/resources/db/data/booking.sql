-- ================
--  booking_tb
-- ================
INSERT INTO booking_tb
(user_id, concert_session_id, booking_number, ticket_token, ticket_code, status, total_amount, created_at, expires_at, paid_at, canceled_at, checked_in_at)
VALUES
    -- 기존 샘플 유지
    (2, 1, 'BK-20250528-0001', CAST(RANDOM_UUID() AS VARCHAR), 'A7K29Q', 'PAID',
     330000, DATEADD('HOUR', -1, NOW()), NULL, DATEADD('HOUR', -1, NOW()), NULL, NULL),

    (3, 1, 'BK-20250528-0002', CAST(RANDOM_UUID() AS VARCHAR), 'B4M82P', 'PENDING',
     165000, NOW(), DATEADD('MINUTE', 5, NOW()), NULL, NULL, NULL),

    (3, 1, 'BK-20250528-0003', CAST(RANDOM_UUID() AS VARCHAR), 'C9R31T', 'PAID',
     132000, DATEADD('HOUR', -2, NOW()), NULL, DATEADD('HOUR', -2, NOW()), NULL, DATEADD('MINUTE', -30, NOW())),

    (4, 1, 'BK-20250528-0004', CAST(RANDOM_UUID() AS VARCHAR), 'D2H76X', 'CANCELED',
     110000, DATEADD('HOUR', -3, NOW()), NULL, NULL, DATEADD('HOUR', -2, NOW()), NULL),

    (2, 3, 'BK-20250528-0005', CAST(RANDOM_UUID() AS VARCHAR), 'E5V44Z', 'PAID',
     198000, DATEADD('MINUTE', -30, NOW()), NULL, DATEADD('MINUTE', -25, NOW()), NULL, NULL),

    -- ssar 예매내역
    -- 1. 아이유 / 예약확정 / 티켓 2장
    (7, 1, 'BK-20260604-0006', CAST(RANDOM_UUID() AS VARCHAR), 'F8K22M', 'PAID',
     297000, DATEADD('HOUR', -3, NOW()), NULL, DATEADD('HOUR', -3, NOW()), NULL, NULL),

    -- 2. 아이유 / 결제대기 / 티켓 2장
    (7, 1, 'BK-20260604-0007', CAST(RANDOM_UUID() AS VARCHAR), 'G3P91R', 'PENDING',
     220000, NOW(), DATEADD('MINUTE', 10, NOW()), NULL, NULL, NULL),

    -- 3. 뮤지컬 / 예약확정 / 티켓 2장
    (7, 3, 'BK-20260604-0008', CAST(RANDOM_UUID() AS VARCHAR), 'H6T44X', 'PAID',
     198000, DATEADD('HOUR', -2, NOW()), NULL, DATEADD('HOUR', -2, NOW()), NULL, NULL),

    -- 4. 뮤지컬 / 결제대기 / 티켓 2장
    (7, 3, 'BK-20260604-0009', CAST(RANDOM_UUID() AS VARCHAR), 'J5V72Z', 'PENDING',
     264000, NOW(), DATEADD('MINUTE', 15, NOW()), NULL, NULL, NULL),

    -- 5. 아이유 / 취소됨 / 티켓 2장
    (7, 1, 'BK-20260604-0010', CAST(RANDOM_UUID() AS VARCHAR), 'K9W38Y', 'CANCELED',
     220000, DATEADD('HOUR', -5, NOW()), NULL, DATEADD('HOUR', -5, NOW()), DATEADD('HOUR', -4, NOW()), NULL);


-- ================
--  booking_seat_tb
-- ================
INSERT INTO booking_seat_tb
(booking_id, seat_id, price, seat_number_snapshot, seat_grade_snapshot, created_at)
VALUES
    -- 기존 샘플
    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20250528-0001'), 1, 165000, 'VIP-01', 'VIP', DATEADD('HOUR', -1, NOW())),
    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20250528-0001'), 2, 165000, 'VIP-02', 'VIP', DATEADD('HOUR', -1, NOW())),

    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20250528-0002'), 3, 165000, 'VIP-03', 'VIP', NOW()),

    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20250528-0003'), 6, 132000, 'R-01', 'R', DATEADD('HOUR', -2, NOW())),

    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20250528-0004'), 16, 110000, 'S-01', 'S', DATEADD('HOUR', -3, NOW())),

    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20250528-0005'), 36, 198000, 'VIP-01', 'VIP', DATEADD('MINUTE', -30, NOW())),

    -- ssar 1. 아이유 / 예약확정 / 티켓 2장
    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20260604-0006'), 4, 165000, 'VIP-04', 'VIP', DATEADD('HOUR', -3, NOW())),
    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20260604-0006'), 9, 132000, 'R-04', 'R', DATEADD('HOUR', -3, NOW())),

    -- ssar 2. 아이유 / 결제대기 / 티켓 2장
    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20260604-0007'), 17, 110000, 'S-02', 'S', NOW()),
    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20260604-0007'), 18, 110000, 'S-03', 'S', NOW()),

    -- ssar 3. 뮤지컬 / 예약확정 / 티켓 2장
    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20260604-0008'), 19, 99000, 'R-05', 'R', DATEADD('HOUR', -2, NOW())),
    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20260604-0008'), 20, 99000, 'R-06', 'R', DATEADD('HOUR', -2, NOW())),

    -- ssar 4. 뮤지컬 / 결제대기 / 티켓 2장
    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20260604-0009'), 21, 132000, 'R-07', 'R', NOW()),
    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20260604-0009'), 22, 132000, 'R-08', 'R', NOW()),

    -- ssar 5. 아이유 / 취소됨 / 티켓 2장
    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20260604-0010'), 23, 110000, 'S-04', 'S', DATEADD('HOUR', -5, NOW())),
    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20260604-0010'), 24, 110000, 'S-05', 'S', DATEADD('HOUR', -5, NOW()));


-- ================
--  seat_tb 상태 동기화
-- ================

-- 예약확정 좌석
UPDATE seat_tb
SET status = 'SOLD'
WHERE id IN (1, 2, 4, 6, 9, 19, 20, 36);

-- 결제대기 좌석
UPDATE seat_tb
SET status = 'HELD'
WHERE id IN (3, 17, 18, 21, 22);

-- 취소된 예매 좌석은 다시 선택 가능
UPDATE seat_tb
SET status = 'AVAILABLE'
WHERE id IN (16, 23, 24);