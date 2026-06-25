
-- ================
--  payment_tb
-- ================
INSERT INTO payment_tb
(booking_id, pg_tx_id, payment_id, original_amount, ticket_fee, used_point, amount, method, status, paid_at, created_at)
VALUES
    -- 1. 아이유 / 예약확정
    (1, 'pg_test_001', 'catchcatch_1_20260604_001',
     300000, 2000, 5000, 297000, 'card', 'PAID',
     DATEADD('HOUR', -3, NOW()), DATEADD('HOUR', -3, NOW())),

    -- 3. 뮤지컬 / 예약확정
    (3, 'pg_test_002', 'catchcatch_3_20260604_002',
     200000, 2000, 4000, 198000, 'kakaopay', 'PAID',
     DATEADD('HOUR', -2, NOW()), DATEADD('HOUR', -2, NOW())),

    -- 5. 아이유 / 취소됨
    (5, 'pg_test_003', 'catchcatch_5_20260604_003',
     220000, 2000, 2000, 220000, 'tosspay', 'CANCELED',
     DATEADD('HOUR', -5, NOW()), DATEADD('HOUR', -5, NOW()));
-- ================
--  refund_tb
-- ================
INSERT INTO refund_tb
(payment_id, amount, cancel_fee, reason, refunded_at)
VALUES
    -- payment_id 3 (원래 amount 110,000, 수수료 11,000원 제하고 99,000원 환불)
    (3, 99000, 11000, '개인 사정으로 인한 취소', DATEADD('HOUR', -2, NOW()));