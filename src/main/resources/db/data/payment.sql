
-- ================
--  payment_tb
-- ================
INSERT INTO payment_tb
(booking_id, pg_tx_id, payment_id, original_amount, ticket_fee, used_point, amount, method, status, paid_at, created_at)
VALUES
    -- 기존 샘플 결제
    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20250528-0001'),
     'pg_test_001', 'catchcatch_1_20250101_001',
     310000, 2000, 0, 330000, 'kakaopay', 'PAID',
     DATEADD('MINUTE', -55, NOW()), DATEADD('HOUR', -1, NOW())),

    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20250528-0003'),
     'pg_test_002', 'catchcatch_3_20250101_002',
     130000, 2000, 10000, 132000, 'tosspay', 'PAID',
     DATEADD('MINUTE', -115, NOW()), DATEADD('HOUR', -2, NOW())),

    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20250528-0004'),
     'pg_test_003', 'catchcatch_4_20250101_003',
     108000, 2000, 0, 110000, 'card', 'CANCELED',
     NULL, DATEADD('HOUR', -3, NOW())),

    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20250528-0005'),
     'pg_test_004', 'catchcatch_5_20250101_004',
     200000, 2000, 2000, 200000, 'kakaopay', 'PAID',
     DATEADD('MINUTE', -25, NOW()), DATEADD('MINUTE', -30, NOW())),

    -- ssar 아이유 / 예약확정
    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20260604-0006'),
     'pg_test_005', 'catchcatch_6_20260604_005',
     302000, 2000, 5000, 299000, 'card', 'PAID',
     DATEADD('HOUR', -3, NOW()), DATEADD('HOUR', -3, NOW())),

    -- ssar 뮤지컬 / 예약확정
    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20260604-0008'),
     'pg_test_006', 'catchcatch_6_20260604_006',
     200000, 2000, 4000, 198000, 'kakaopay', 'PAID',
     DATEADD('HOUR', -2, NOW()), DATEADD('HOUR', -2, NOW())),

    -- ssar 아이유 / 취소됨
    ((SELECT id FROM booking_tb WHERE booking_number = 'BK-20260604-0010'),
     'pg_test_007', 'catchcatch_6_20260604_007',
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