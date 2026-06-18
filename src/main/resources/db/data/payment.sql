-- ================
--  payment_tb
-- ================
INSERT INTO payment_tb
(booking_id, pg_tx_id, payment_id, original_amount, ticket_fee, used_point, amount, method, status, paid_at, created_at)
VALUES
    -- 1. 포인트 사용 안 함 (330,000 - 0 = 330,000)
    (1, 'pg_test_001', 'catchcatch_1_20250101_001', 310000, 2000, 0, 330000, 'kakaopay', 'PAID', DATEADD('MINUTE', -55, NOW()), DATEADD('HOUR', -1, NOW())),

    -- 2. 포인트 10,000점 사용 (142,000 - 10,000 = 132,000)
    (3, 'pg_test_002', 'catchcatch_3_20250101_002', 130000, 2000, 10000, 132000, 'tosspay', 'PAID', DATEADD('MINUTE', -115, NOW()), DATEADD('HOUR', -2, NOW())),

    -- 3. 취소된 결제 (포인트 사용 안 함)
    (4, 'pg_test_003', 'catchcatch_4_20250101_003', 108000, 2000, 0, 110000, 'card', 'CANCELLED', NULL, DATEADD('HOUR', -3, NOW())),

    -- 4. 포인트 2,000점 사용 (200,000 - 2,000 = 198,000)
    (5, 'pg_test_004', 'catchcatch_5_20250101_004', 200000, 2000,2000, 200000, 'kakaopay', 'PAID', DATEADD('MINUTE', -25, NOW()), DATEADD('MINUTE', -30, NOW())),

    -- 5. 포인트 5,000점 사용 (302,000 - 5,000 = 297,000)
    (6, 'pg_test_005', 'catchcatch_6_20260604_005', 302000, 2000, 5000, 299000, 'card', 'PAID', DATEADD('HOUR', -3, NOW()), DATEADD('HOUR', -3, NOW()));


-- ================
--  refund_tb
-- ================
INSERT INTO refund_tb
(payment_id, amount, cancel_fee, reason, refunded_at)
VALUES
    -- payment_id 3 (원래 amount 110,000, 수수료 11,000원 제하고 99,000원 환불)
    (3, 99000, 11000, '개인 사정으로 인한 취소', DATEADD('HOUR', -2, NOW()));