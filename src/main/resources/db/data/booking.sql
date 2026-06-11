-- ================
--  booking_tb
-- ================
INSERT INTO booking_tb
(id, user_id, concert_session_id, booking_number, status, total_amount, created_at, expires_at, paid_at, canceled_at)
VALUES
    (1, 2, 1, 'BK-20250528-0001', 'PAID',     330000, DATEADD('HOUR',   -1, NOW()), NULL,                       DATEADD('HOUR',   -1, NOW()), NULL),
    (2, 3, 1, 'BK-20250528-0002', 'PENDING',  165000, NOW(),                        DATEADD('MINUTE', 5, NOW()), NULL,                         NULL),
    (3, 3, 1, 'BK-20250528-0003', 'PAID',     132000, DATEADD('HOUR',   -2, NOW()), NULL,                       DATEADD('HOUR',   -2, NOW()), NULL),
    (4, 4, 1, 'BK-20250528-0004', 'CANCELED', 110000, DATEADD('HOUR',   -3, NOW()), NULL,                       NULL,                         DATEADD('HOUR', -2, NOW())),
    (5, 2, 3, 'BK-20250528-0005', 'PAID',     198000, DATEADD('MINUTE', -30, NOW()), NULL,                      DATEADD('MINUTE', -25, NOW()), NULL),
    (6, 6, 1, 'BK-20260604-0006', 'PAID',     297000, DATEADD('HOUR',   -3, NOW()), NULL,                       DATEADD('HOUR',   -3, NOW()), NULL),
    (7, 6, 1, 'BK-20260604-0007', 'CANCELED', 110000, DATEADD('HOUR',   -5, NOW()), NULL,                       NULL,                         DATEADD('HOUR', -4, NOW()));

ALTER TABLE booking_tb ALTER COLUMN id RESTART WITH 8;


-- ================
--  booking_seat_tb
-- ================
INSERT INTO booking_seat_tb
(booking_id, seat_id, price, seat_number_snapshot, seat_grade_snapshot, created_at)
VALUES
    (1, 1,  165000, 'VIP-01', 'VIP', DATEADD('HOUR',   -1,  NOW())),
    (1, 2,  165000, 'VIP-02', 'VIP', DATEADD('HOUR',   -1,  NOW())),
    (2, 3,  165000, 'VIP-03', 'VIP', NOW()),
    (3, 6,  132000, 'R-01',   'R',   DATEADD('HOUR',   -2,  NOW())),
    (4, 16, 110000, 'S-01',   'S',   DATEADD('HOUR',   -3,  NOW())),
    (5, 36, 198000, 'VIP-01', 'VIP', DATEADD('MINUTE', -30, NOW())),
    (6, 4,  165000, 'VIP-04', 'VIP', DATEADD('HOUR',   -3,  NOW())),
    (6, 9,  132000, 'R-04',   'R',   DATEADD('HOUR',   -3,  NOW())),
    (7, 17, 110000, 'S-02',   'S',   DATEADD('HOUR',   -5,  NOW()));


-- 예매/결제 데이터와 좌석 상태 동기화
UPDATE seat_tb SET status = 'SOLD'      WHERE id IN (1, 2, 4, 6, 9, 36);
UPDATE seat_tb SET status = 'HELD'      WHERE id IN (3);
UPDATE seat_tb SET status = 'AVAILABLE' WHERE id IN (16, 17);
