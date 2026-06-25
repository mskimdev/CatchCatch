-- ================
--  booking_tb
-- ================
INSERT INTO booking_tb
(user_id, concert_session_id, booking_number, ticket_token, status, total_amount, created_at, expires_at, paid_at, canceled_at, checked_in_at)
VALUES
    -- 1. 아이유 / 예약확정 / 티켓 2장
    (6, 1, 'BK-20260604-0001', CAST(RANDOM_UUID() AS VARCHAR), 'PAID',
     297000, DATEADD('HOUR', -3, NOW()), NULL, DATEADD('HOUR', -3, NOW()), NULL, NULL),

    -- 2. 아이유 / 결제대기 / 티켓 2장
    (6, 1, 'BK-20260604-0002', CAST(RANDOM_UUID() AS VARCHAR), 'PENDING',
     220000, NOW(), DATEADD('MINUTE', 10, NOW()), NULL, NULL, NULL),

    -- 3. 뮤지컬 / 예약확정 / 티켓 2장
    (6, 3, 'BK-20260604-0003', CAST(RANDOM_UUID() AS VARCHAR), 'PAID',
     198000, DATEADD('HOUR', -2, NOW()), NULL, DATEADD('HOUR', -2, NOW()), NULL, NULL),

    -- 4. 뮤지컬 / 결제대기 / 티켓 2장
    (6, 3, 'BK-20260604-0004', CAST(RANDOM_UUID() AS VARCHAR), 'PENDING',
     264000, NOW(), DATEADD('MINUTE', 15, NOW()), NULL, NULL, NULL),

    -- 5. 아이유 / 취소됨 / 티켓 2장
    (6, 1, 'BK-20260604-0005', CAST(RANDOM_UUID() AS VARCHAR), 'CANCELED',
     220000, DATEADD('HOUR', -5, NOW()), NULL, DATEADD('HOUR', -5, NOW()), DATEADD('HOUR', -4, NOW()), NULL);


-- ================
--  booking_seat_tb
-- ================
INSERT INTO booking_seat_tb
(booking_id, seat_id, price, seat_number_snapshot, seat_grade_snapshot, created_at)
VALUES
    -- 1. 아이유 / 예약확정
    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20260604-0001'), 1, 165000, 'VIP-01', 'VIP', DATEADD('HOUR', -3, NOW())),
    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20260604-0001'), 2, 132000, 'R-01',   'R',   DATEADD('HOUR', -3, NOW())),

    -- 2. 아이유 / 결제대기
    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20260604-0002'), 3, 110000, 'S-01',   'S',   NOW()),
    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20260604-0002'), 4, 110000, 'S-02',   'S',   NOW()),

    -- 3. 뮤지컬 / 예약확정
    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20260604-0003'), 5, 99000,  'R-02',   'R',   DATEADD('HOUR', -2, NOW())),
    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20260604-0003'), 6, 99000,  'R-03',   'R',   DATEADD('HOUR', -2, NOW())),

    -- 4. 뮤지컬 / 결제대기
    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20260604-0004'), 7, 132000, 'R-04',   'R',   NOW()),
    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20260604-0004'), 8, 132000, 'R-05',   'R',   NOW()),

    -- 5. 아이유 / 취소됨
    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20260604-0005'), 9, 110000, 'S-03',   'S',   DATEADD('HOUR', -5, NOW())),
    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20260604-0005'), 10, 110000, 'S-04',  'S',   DATEADD('HOUR', -5, NOW()));


-- ================
--  seat_tb 상태 동기화
-- ================

-- 예약확정 좌석
UPDATE seat_tb
SET status = 'SOLD'
WHERE id IN (1, 2, 5, 6);

-- 결제대기 좌석
UPDATE seat_tb
SET status = 'HELD'
WHERE id IN (3, 4, 7, 8);

-- 취소된 예매 좌석은 다시 선택 가능
UPDATE seat_tb
SET status = 'AVAILABLE'
WHERE id IN (9, 10);