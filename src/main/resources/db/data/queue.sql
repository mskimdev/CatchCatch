-- ================
--  queue_tb
-- ================
INSERT INTO queue_tb
(user_id, concert_session_id, queue_number, status, entered_at, expired_at, created_at)
VALUES
    (2, 1, 1, 'ENTERED', NOW(), NULL,                         NOW()),
    (3, 1, 2, 'WAITING', NULL,  DATEADD('MINUTE',  10, NOW()), NOW()),
    (4, 1, 3, 'WAITING', NULL,  DATEADD('MINUTE',  10, NOW()), NOW()),
    (5, 3, 1, 'ENTERED', NOW(), NULL,                         NOW()),
    (2, 3, 2, 'EXPIRED', NULL,  DATEADD('MINUTE',  -5, NOW()), DATEADD('MINUTE', -20, NOW()));
