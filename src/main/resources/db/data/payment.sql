-- ================
--  payment_tb
-- ================
INSERT INTO payment_tb
(booking_id, pg_tx_id, payment_id, amount, method, status, paid_at, created_at)
VALUES
    (1, 'pg_test_001', 'catchcatch_1_20250101_001', 330000, 'kakaopay', 'PAID',      DATEADD('MINUTE', -55,  NOW()), DATEADD('HOUR',   -1,  NOW())),
    (3, 'pg_test_002', 'catchcatch_3_20250101_002', 132000, 'tosspay',  'PAID',      DATEADD('MINUTE', -115, NOW()), DATEADD('HOUR',   -2,  NOW())),
    (4, 'pg_test_003', 'catchcatch_4_20250101_003', 110000, 'card',     'CANCELLED', NULL,                          DATEADD('HOUR',   -3,  NOW())),
    (5, 'pg_test_004', 'catchcatch_5_20250101_004', 198000, 'kakaopay', 'PAID',      DATEADD('MINUTE', -25,  NOW()), DATEADD('MINUTE', -30, NOW())),
    (6, 'pg_test_005', 'catchcatch_6_20260604_005', 297000, 'card',     'PAID',      DATEADD('HOUR',   -3,   NOW()), DATEADD('HOUR',   -3,  NOW()));


-- ================
--  refund_tb
-- ================
INSERT INTO refund_tb
(payment_id, amount, cancel_fee, reason, refunded_at)
VALUES
    (3, 99000, 11000, '개인 사정으로 인한 취소', DATEADD('HOUR', -2, NOW()));
