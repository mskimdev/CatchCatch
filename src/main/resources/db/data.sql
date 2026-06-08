-- =====================================================
--  CatchCatch 테스트 데이터 INSERT
--  H2 Database 기준 / 비밀번호 전부 "1234" BCrypt 암호화
-- =====================================================
--  삽입 순서
--   1. user_tb
--   2. venue_tb
--   3. concert_tb
--   4. concert_session_tb
--   5. seat_tb
--   6. queue_tb
--   7. booking_tb
--   8. payment_tb
--   9. refund_tb
--  10. concert_like_tb
--  11. faq_tb
--  12. inquiry_tb
--  13. notice_tb
--  [마무리] UPDATE / ALTER TABLE (AUTO_INCREMENT 보정)
-- =====================================================


-- =====================================================
--  1. user_tb
--  id: admin=1, user1=2, user2=3, user3=4, kakaouser=5, ssar=6, mskim=7
-- =====================================================
INSERT INTO user_tb
(username, password, email, phone, profile_image, oauth_provider, role, created_at, is_deleted)
VALUES
    ('admin',
     '$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK',
     'admin@catchcatch.com',
     '010-0000-0000',
     NULL, 'LOCAL', 'ADMIN', NOW(), false),

    ('user1',
     '$2a$10$pJgHFhQeqpkfNKJBLISTlO8Aq3DXdEq7SlAAnNdFpSInGKaOhGKAq',
     'user1@test.com',
     '010-1111-1111',
     NULL, 'LOCAL', 'USER', NOW(), false),

    ('user2',
     '$2a$10$pJgHFhQeqpkfNKJBLISTlO8Aq3DXdEq7SlAAnNdFpSInGKaOhGKAq',
     'user2@test.com',
     '010-2222-2222',
     NULL, 'LOCAL', 'USER', NOW(), false),

    ('user3',
     '$2a$10$pJgHFhQeqpkfNKJBLISTlO8Aq3DXdEq7SlAAnNdFpSInGKaOhGKAq',
     'user3@test.com',
     '010-3333-3333',
     NULL, 'LOCAL', 'USER', NOW(), false),

    ('kakaouser',
     '$2a$10$pJgHFhQeqpkfNKJBLISTlO8Aq3DXdEq7SlAAnNdFpSInGKaOhGKAq',
     'kakao_12345@kakao.com',
     '010-4444-4444',
     NULL, 'KAKAO', 'USER', NOW(), false),

    ('ssar',
     '$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK',
     'ssar@naver.com',
     '010-1234-5678',
     NULL, 'LOCAL', 'USER', NOW(), false),

    ('mskim',
     '$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK',
     'kimmin1754@gmail.com',
     '010-5729-1754',
     NULL, 'LOCAL', 'USER', DATEADD('DAY', -10, NOW()), false);


-- =====================================================
--  2. venue_tb
-- =====================================================
INSERT INTO venue_tb
(name, address, total_capacity, created_at)
VALUES
    ('올림픽공원 체조경기장', '서울특별시 송파구 올림픽로 424',  15000, NOW()),
    ('KSPO DOME',           '서울특별시 송파구 올림픽로 424',  15000, NOW()),
    ('잠실실내체육관',       '서울특별시 송파구 올림픽로 25',   15000, NOW()),
    ('부산 사직실내체육관',  '부산광역시 동래구 사직동 산 29',  12000, NOW()),
    ('인천 남동체육관',      '인천광역시 남동구 장수동 503',    10000, NOW());


-- =====================================================
--  3. concert_tb
-- =====================================================
INSERT INTO concert_tb
(id, venue_id, title, artist, description, poster_url, status,
 category, genre, start_date, end_date, ticket_open_date, age_limit, runtime, organizer, contact,
 detail_banner_url, detail_title, detail_description1, detail_description2, created_at, is_deleted)
VALUES
    (1, 1,
     '아이유 콘서트 2026 [HEREH]', '아이유',
     '아이유의 2026년 단독 콘서트. 새 앨범 수록곡을 포함한 화려한 무대.',
     '/images/sample/poster-music.svg', 'OPEN',
     '콘서트', 'concert', '2026-08-01', '2026-08-02', '2026-05-20 20:00:00',
     '만 7세 이상 관람가', '150분', 'EDAM 엔터테인먼트', '1544-1111',
     '/images/sample/detail-banner.svg',
     '여름밤을 수놓을 아름다운 목소리',
     '아이유와 함께하는 잊지 못할 특별한 시간',
     '놓칠 수 없는 단 이틀간의 공연', NOW(), false),

    (2, 2,
     '뮤지컬 <시카고> 오리지널 내한', '내한공연팀',
     '브로드웨이 역사상 가장 매혹적인 뮤지컬 시카고 내한 공연.',
     '/images/sample/poster-music.svg', 'OPEN',
     '뮤지컬', 'musical', '2026-09-05', '2026-09-07', '2026-05-25 14:00:00',
     '만 15세 이상 관람가', '150분', '신시컴퍼니', '1544-2222',
     '/images/sample/detail-banner.svg',
     '가장 뜨겁고 섹시한 무대',
     '브로드웨이 오리지널 캐스트의 귀환',
     'All That Jazz', NOW(), false),

    (3, 3,
     '조성진 피아노 리사이틀', '조성진',
     '세계적인 피아니스트 조성진의 2026년 전국투어 리사이틀.',
     '/images/sample/poster-music.svg', 'COMING_SOON',
     '클래식', 'classic', '2026-10-10', '2026-10-11', '2026-07-10 18:00:00',
     '만 7세 이상 관람가', '100분', '크레디아', '1544-3333',
     '/images/sample/detail-banner.svg',
     '건반 위를 수놓는 완벽한 타건',
     '쇼팽 콩쿠르 우승자 조성진의 귀환',
     '영혼을 울리는 클래식의 밤', NOW(), false),

    (4, 4,
     '부산 재즈 페스티벌 2026', '다수 아티스트',
     '국내외 유명 재즈 아티스트들의 합동 페스티벌 공연.',
     '/images/sample/poster-music.svg', 'OPEN',
     '페스티벌', 'festival', '2026-07-20', '2026-07-20', '2026-06-01 12:00:00',
     '전체 관람가', '240분', '부산문화재단', '1544-4444',
     '/images/sample/detail-banner.svg',
     '한여름 밤의 낭만적인 재즈 선율',
     '국내외 최정상급 재즈 뮤지션 총출동',
     '사직실내체육관에서 즐기는 감미로운 축제', NOW(), false),

    (5, 1,
     '박보검 데뷔 16주년 팬미팅', '박보검',
     '배우 박보검 데뷔 16주년 기념 공식 팬미팅.',
     '/images/sample/poster-music.svg', 'CLOSED_SOON',
     '팬미팅', 'fanmeeting', '2026-06-25', '2026-06-25', '2026-05-01 20:00:00',
     '전체 관람가', '120분', '더블랙레이블', '1544-5555',
     '/images/sample/detail-banner.svg',
     '팬들과 함께하는 특별한 16주년',
     '보검복지부와 함께하는 따뜻한 시간',
     '놓칠 수 없는 단 하루', NOW(), false),

    (21, 2,
     'DAY6 4TH WORLD TOUR <FOREVER>', 'DAY6',
     '마이데이를 위한 뜨거운 여정, 데이식스 월드투어 서울 공연.',
     '/images/sample/poster-music.svg', 'COMING_SOON',
     '콘서트', 'concert', '2026-08-21', '2026-08-25', '2026-06-25 20:00:00',
     '만 7세 이상 관람가', '150분', 'JYP 엔터테인먼트', '1544-6666',
     '/images/sample/detail-banner.svg',
     '우리의 모든 순간이 영원이 되도록',
     'FOREVER 뜨겁게 빛날 무대',
     '올림픽공원에서 펼쳐지는 벅찬 감동', NOW(), false),

    (22, 3,
     '세븐틴 WORLD TOUR <NEW_> IN SEOUL', '세븐틴',
     '새로운 챕터의 시작을 알리는 세븐틴의 월드투어 인 서울.',
     '/images/sample/poster-triangle.svg', 'OPEN',
     '콘서트', 'concert', '2026-07-06', '2026-07-08', '2026-05-15 20:00:00',
     '만 7세 이상 관람가', '180분', 'PLEDIS 엔터테인먼트', '1544-7777',
     '/images/sample/detail-banner.svg',
     '새로운 역사를 써 내려갈 완벽한 무대',
     '고척돔을 가득 채울 열기',
     '캐럿과 함께 여는 NEW 챕터', NOW(), false),

    (23, 4,
     '황치열 전국투어 콘서트 <별, 그대> - 서울', '황치열',
     '가슴 절절한 목소리로 돌아온 황치열의 2026년 전국투어.',
     '/images/sample/poster-artist.svg', 'CLOSED_SOON',
     '콘서트', 'concert', '2026-06-20', '2026-06-21', '2026-05-10 14:00:00',
     '만 7세 이상 관람가', '150분', 'TEN2 엔터테인먼트', '1544-8888',
     '/images/sample/detail-banner.svg',
     '밤하늘의 별처럼 쏟아지는 감동',
     '별, 그리고 당신을 위한 세레나데',
     '화이트데이에 전하는 특별한 선물', NOW(), false),

    (24, 5,
     'aespa LIVE TOUR <SYNK : HYPER LINE>', 'aespa',
     '가상과 현실을 넘나드는 에스파의 메타버스 라이브 투어.',
     '/images/sample/poster-aespa.svg', 'OPEN',
     '콘서트', 'concert', '2026-08-11', '2026-08-12', '2026-06-02 20:00:00',
     '만 7세 이상 관람가', '150분', 'SM 엔터테인먼트', '1544-9999',
     '/images/sample/detail-banner.svg',
     '현실과 광야를 잇는 압도적인 세계관',
     'SYNK : HYPER LINE',
     '인스파이어 아레나를 강타할 광야의 소리', NOW(), false),

    (25, 1,
     'Cigarettes After Sex Live in Seoul', 'Cigarettes After Sex',
     '몽환적이고 감각적인 사운드의 대명사, CAS 내한 공연.',
     '/images/sample/poster-cas.svg', 'OPEN',
     '콘서트', 'concert', '2026-07-30', '2026-07-30', '2026-05-30 12:00:00',
     '만 15세 이상 관람가', '120분', '프라이빗커브', '1544-0000',
     '/images/sample/detail-banner.svg',
     '당신의 밤을 적실 몽환적인 멜로디',
     '독보적인 분위기의 라이브',
     '잠실을 수놓을 짙은 감성', NOW(), false);


-- =====================================================
--  4. concert_session_tb
-- =====================================================
INSERT INTO concert_session_tb
(id, concert_id, session_date, session_time, created_at, is_deleted)
VALUES
    (1, 1, '2025-08-01', '18:00:00', NOW(), false),
    (2, 1, '2025-08-02', '18:00:00', NOW(), false),
    (3, 2, '2025-09-05', '19:00:00', NOW(), false),
    (4, 2, '2025-09-06', '19:00:00', NOW(), false),
    (5, 2, '2025-09-07', '17:00:00', NOW(), false),
    (6, 3, '2025-10-10', '18:00:00', NOW(), false),
    (7, 3, '2025-10-11', '18:00:00', NOW(), false),
    (8, 4, '2025-07-20', '17:00:00', NOW(), false),
    (9, 5, '2025-06-01', '18:00:00', NOW(), false);


-- =====================================================
--  5. seat_tb
-- =====================================================
INSERT INTO seat_tb
(id, session_id, seat_number, grade, price, status, updated_at)
VALUES
    -- 아이유 VIP석
    (1,  1, 'VIP-01', 'VIP', 165000, 'SOLD',      NOW()),
    (2,  1, 'VIP-02', 'VIP', 165000, 'SOLD',      NOW()),
    (3,  1, 'VIP-03', 'VIP', 165000, 'HELD',      NOW()),
    (4,  1, 'VIP-04', 'VIP', 165000, 'AVAILABLE', NOW()),
    (5,  1, 'VIP-05', 'VIP', 165000, 'AVAILABLE', NOW()),
    -- 아이유 R석
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
    -- 아이유 S석
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
    -- 아이유 A석
    (26, 1, 'A-01',   'A',    88000, 'AVAILABLE', NOW()),
    (27, 1, 'A-02',   'A',    88000, 'AVAILABLE', NOW()),
    (28, 1, 'A-03',   'A',    88000, 'AVAILABLE', NOW()),
    (29, 1, 'A-04',   'A',    88000, 'AVAILABLE', NOW()),
    (30, 1, 'A-05',   'A',    88000, 'AVAILABLE', NOW()),
    (31, 1, 'A-06',   'A',    88000, 'AVAILABLE', NOW()),
    (32, 1, 'A-07',   'A',    88000, 'AVAILABLE', NOW()),
    (33, 1, 'A-08',   'A',    88000, 'AVAILABLE', NOW()),
    (34, 1, 'A-09',   'A',    88000, 'AVAILABLE', NOW()),
    (35, 1, 'A-10',   'A',    88000, 'AVAILABLE', NOW()),
    -- 시카고 샘플 좌석
    (36, 3, 'VIP-01', 'VIP', 198000, 'SOLD',      NOW()),
    (37, 3, 'VIP-02', 'VIP', 198000, 'AVAILABLE', NOW()),
    (38, 3, 'R-01',   'R',   165000, 'AVAILABLE', NOW()),
    (39, 3, 'S-01',   'S',   132000, 'AVAILABLE', NOW()),
    (40, 3, 'A-01',   'A',    99000, 'AVAILABLE', NOW());


-- =====================================================
--  6. queue_tb
-- =====================================================
INSERT INTO queue_tb
(id, user_id, concert_session_id, queue_number, status, entered_at, expired_at, created_at)
VALUES
    (1, 2, 1, 1, 'ENTERED', NOW(),                        NULL,                        NOW()),
    (2, 3, 1, 2, 'WAITING', NULL,                         DATEADD('MINUTE', 10, NOW()), NOW()),
    (3, 4, 1, 3, 'WAITING', NULL,                         DATEADD('MINUTE', 10, NOW()), NOW()),
    (4, 5, 3, 1, 'ENTERED', NOW(),                        NULL,                        NOW()),
    (5, 2, 3, 2, 'EXPIRED', NULL,  DATEADD('MINUTE', -5, NOW()), DATEADD('MINUTE', -20, NOW()));


-- =====================================================
--  7. booking_tb
-- =====================================================
INSERT INTO booking_tb
(id, user_id, concert_session_id, seat_id, booking_number, status, created_at, expires_at, canceled_at)
VALUES
    (1, 2, 1, 1,  'BK-20250528-0001', 'CONFIRMED', DATEADD('HOUR',   -1, NOW()), NULL,                        NULL),
    (2, 2, 1, 2,  'BK-20250528-0002', 'CONFIRMED', DATEADD('HOUR',   -1, NOW()), NULL,                        NULL),
    (3, 3, 1, 3,  'BK-20250528-0003', 'PENDING',   NOW(),                        DATEADD('MINUTE', 5, NOW()),  NULL),
    (4, 3, 1, 6,  'BK-20250528-0004', 'CONFIRMED', DATEADD('HOUR',   -2, NOW()), NULL,                        NULL),
    (5, 4, 1, 16, 'BK-20250528-0005', 'CANCELLED', DATEADD('HOUR',   -3, NOW()), NULL,  DATEADD('HOUR', -2, NOW())),
    (6, 2, 3, 36, 'BK-20250528-0006', 'CONFIRMED', DATEADD('MINUTE', -30, NOW()),NULL,                        NULL),
    (7, 6, 1, 4,  'BK-20260604-0007', 'PAID',      DATEADD('HOUR',   -3, NOW()), NULL,                        NULL),
    (8, 6, 1, 9,  'BK-20260604-0008', 'PAID',      DATEADD('HOUR',   -3, NOW()), NULL,                        NULL),
    (9, 6, 1, 17, 'BK-20260604-0009', 'CANCELED',  DATEADD('HOUR',   -5, NOW()), NULL,  DATEADD('HOUR', -4, NOW()));


-- =====================================================
--  8. payment_tb
-- =====================================================
INSERT INTO payment_tb
(id, booking_id, user_id, pg_tx_id, payment_id, amount, method, status, paid_at, created_at)
VALUES
    (1, 1, 2, 'imp_test_001', 'catchcatch_1_20250101_001', 165000, 'kakaopay', 'PAID',      DATEADD('MINUTE', -55, NOW()), DATEADD('HOUR',   -1, NOW())),
    (2, 2, 2, 'imp_test_002', 'catchcatch_2_20250101_002', 165000, 'card',     'PAID',      DATEADD('MINUTE', -55, NOW()), DATEADD('HOUR',   -1, NOW())),
    (3, 4, 3, 'imp_test_003', 'catchcatch_4_20250101_003', 132000, 'tosspay',  'PAID',      DATEADD('MINUTE',-115, NOW()), DATEADD('HOUR',   -2, NOW())),
    (4, 5, 4, 'imp_test_004', 'catchcatch_5_20250101_004', 110000, 'card',     'CANCELLED', NULL,                          DATEADD('HOUR',   -3, NOW())),
    (5, 6, 2, 'imp_test_005', 'catchcatch_6_20250101_005', 198000, 'kakaopay', 'PAID',      DATEADD('MINUTE', -25, NOW()), DATEADD('MINUTE', -30, NOW())),
    (6, 7, 6, 'imp_test_006', 'catchcatch_7_20260604_006', 165000, 'kakaopay', 'PAID',      DATEADD('HOUR',   -3, NOW()), DATEADD('HOUR',   -3, NOW())),
    (7, 8, 6, 'imp_test_007', 'catchcatch_8_20260604_007', 132000, 'card',     'PAID',      DATEADD('HOUR',   -3, NOW()), DATEADD('HOUR',   -3, NOW()));


-- =====================================================
--  9. refund_tb
-- =====================================================
INSERT INTO refund_tb
(id, payment_id, amount, cancel_fee, reason, refunded_at)
VALUES
    (1, 4, 99000, 11000, '개인 사정으로 인한 취소', DATEADD('HOUR', -2, NOW()));


-- =====================================================
--  10. concert_like_tb
-- =====================================================
INSERT INTO concert_like_tb
(user_id, concert_id, created_at)
VALUES
    (6, 1,  DATEADD('DAY', -5, NOW())),
    (6, 22, DATEADD('DAY', -4, NOW())),
    (6, 24, DATEADD('DAY', -3, NOW())),
    (6, 25, DATEADD('DAY', -1, NOW()));


-- =====================================================
--  11. faq_tb
-- =====================================================
INSERT INTO faq_tb
(category, question, answer, is_visible, created_at)
VALUES
    -- 회원
    ('MEMBER', '회원가입은 어떻게 하나요?',   '상단 회원가입 메뉴에서 아이디, 비밀번호, 이메일을 입력하면 가입할 수 있습니다.', true, CURRENT_TIMESTAMP),
    ('MEMBER', '비밀번호를 잊어버렸어요.',     '로그인 화면의 비밀번호 찾기 기능을 통해 가입한 이메일로 임시 비밀번호 또는 재설정 링크를 받을 수 있습니다.', true, CURRENT_TIMESTAMP),
    ('MEMBER', '회원정보 수정은 어디서 하나요?', '로그인 후 마이페이지에서 이름, 이메일, 연락처 등의 회원정보를 수정할 수 있습니다.', true, CURRENT_TIMESTAMP),
    ('MEMBER', '회원 탈퇴는 어떻게 하나요?',  '마이페이지의 회원정보 관리 메뉴에서 탈퇴를 신청할 수 있습니다. 탈퇴 후 일부 정보는 관련 법령에 따라 일정 기간 보관될 수 있습니다.', true, CURRENT_TIMESTAMP),
    -- 예매
    ('BOOKING', '예매는 어떻게 하나요?',              '공연 상세 페이지에서 원하는 회차와 좌석을 선택한 뒤 결제를 진행하면 예매가 완료됩니다.', true, CURRENT_TIMESTAMP),
    ('BOOKING', '예매 내역은 어디서 확인하나요?',     '로그인 후 마이페이지의 예매 내역 메뉴에서 예매한 공연 정보를 확인할 수 있습니다.', true, CURRENT_TIMESTAMP),
    ('BOOKING', '좌석 선택 후 바로 결제해야 하나요?', '좌석 선택 후 일정 시간 내에 결제를 완료해야 합니다. 시간이 지나면 선택한 좌석이 자동으로 해제될 수 있습니다.', true, CURRENT_TIMESTAMP),
    ('BOOKING', '비회원도 예매할 수 있나요?',         '현재는 원활한 예매 내역 관리와 취소 처리를 위해 회원 예매만 지원합니다.', true, CURRENT_TIMESTAMP),
    -- 결제
    ('PAYMENT', '결제 수단은 무엇이 있나요?',       '카드 결제, 카카오페이, 토스페이 등의 결제 수단을 지원할 예정입니다.', true, CURRENT_TIMESTAMP),
    ('PAYMENT', '결제 중 오류가 발생했어요.',       '일시적인 네트워크 문제일 수 있습니다. 결제 내역을 먼저 확인한 뒤, 결제가 완료되지 않았다면 다시 시도해 주세요.', true, CURRENT_TIMESTAMP),
    ('PAYMENT', '결제 완료 후 영수증을 받을 수 있나요?', '결제 완료 후 마이페이지의 예매 내역에서 결제 정보를 확인할 수 있습니다.', true, CURRENT_TIMESTAMP),
    ('PAYMENT', '결제 금액이 다르게 나왔어요.',     '할인 적용 여부, 수수료, 쿠폰 사용 여부에 따라 최종 결제 금액이 달라질 수 있습니다.', true, CURRENT_TIMESTAMP),
    -- 취소/환불
    ('CANCEL_REFUND', '예매 취소는 어떻게 하나요?',    '마이페이지의 예매 내역에서 취소할 수 있습니다. 단, 공연 시작 시간이 임박한 경우 취소가 제한될 수 있습니다.', true, CURRENT_TIMESTAMP),
    ('CANCEL_REFUND', '환불은 얼마나 걸리나요?',       '환불은 결제 수단과 카드사 정책에 따라 보통 3~7영업일 정도 소요될 수 있습니다.', true, CURRENT_TIMESTAMP),
    ('CANCEL_REFUND', '부분 취소가 가능한가요?',       '여러 장을 예매한 경우 일부 좌석만 취소할 수 있는지 여부는 공연 정책에 따라 달라질 수 있습니다.', true, CURRENT_TIMESTAMP),
    ('CANCEL_REFUND', '공연 당일에도 취소할 수 있나요?', '공연 당일 취소 가능 여부는 공연별 취소 정책에 따라 다르며, 일부 공연은 당일 취소가 제한될 수 있습니다.', true, CURRENT_TIMESTAMP),
    -- 이벤트/혜택
    ('EVENT', '이벤트 혜택은 어디서 확인하나요?',      '이벤트 페이지에서 진행 중인 할인 및 혜택 정보를 확인할 수 있습니다.', true, CURRENT_TIMESTAMP),
    ('EVENT', '쿠폰은 어떻게 사용하나요?',             '결제 단계에서 보유한 쿠폰을 선택하면 할인 금액이 적용됩니다.', true, CURRENT_TIMESTAMP),
    ('EVENT', '이벤트 당첨 여부는 어디서 확인하나요?', '이벤트 당첨 결과는 이벤트 페이지 또는 마이페이지 알림 메뉴에서 확인할 수 있습니다.', true, CURRENT_TIMESTAMP),
    ('EVENT', '할인 혜택은 중복 적용되나요?',          '할인 혜택의 중복 적용 여부는 이벤트별 정책에 따라 다릅니다.', true, CURRENT_TIMESTAMP),
    -- 서비스/기타
    ('SERVICE', '고객센터 운영 시간은 어떻게 되나요?', '고객센터는 평일 오전 9시부터 오후 6시까지 운영됩니다.', true, CURRENT_TIMESTAMP),
    ('SERVICE', '1:1 문의는 어디서 작성하나요?',       '고객센터의 1:1 문의 메뉴에서 문의 내용을 작성할 수 있습니다.', true, CURRENT_TIMESTAMP),
    ('SERVICE', '사이트 이용 중 오류가 발생했어요.',   '오류 화면을 캡처한 뒤 고객센터로 문의해 주시면 확인 후 안내해 드리겠습니다.', true, CURRENT_TIMESTAMP),
    ('SERVICE', '공지사항은 어디서 확인하나요?',       '서비스 관련 공지사항은 고객센터 또는 메인 화면의 공지 영역에서 확인할 수 있습니다.', true, CURRENT_TIMESTAMP),
    -- 숨김 처리 테스트용
    ('SERVICE', '숨김 FAQ 테스트입니다.',        '관리자 화면에서는 보이지만 사용자 화면에서는 보이지 않아야 하는 테스트 데이터입니다.', false, CURRENT_TIMESTAMP),
    ('MEMBER',  '비노출 회원 FAQ 테스트입니다.', 'is_visible 값이 false인 데이터가 사용자 FAQ 목록에서 제외되는지 확인하기 위한 데이터입니다.', false, CURRENT_TIMESTAMP);


-- =====================================================
--  12. inquiry_tb
--  PENDING=답변대기 / RESOLVED=답변완료 / CANCELLED=취소
-- =====================================================
INSERT INTO inquiry_tb
(title, content, user_id, category, status, is_public, notify_email, notify_sms, reply, created_at)
VALUES
    -- mskim
    ('아이유 콘서트 티켓 취소 방법 문의',
     '안녕하세요. 아이유 콘서트 2026 [HEREH] 티켓을 예매했는데 갑작스러운 일정 변경으로 취소해야 할 것 같습니다. 취소 수수료 없이 환불받을 수 있는 방법이 있나요? 예매번호는 BK-20260604-0001 입니다.',
     7, 'TICKET', 'PENDING', false, true, false, NULL, DATEADD('HOUR', -2, NOW())),

    ('카카오페이 결제 후 예매 내역에 없어요',
     '어제 카카오페이로 결제를 완료했는데 마이페이지 예매 내역에 확인이 되지 않습니다. 카카오페이 앱에서는 결제 완료로 나오는데 혹시 오류가 있는 건가요?',
     7, 'PAYMENT', 'PENDING', false, true, true, NULL, DATEADD('DAY', -3, NOW())),

    ('전화번호 변경이 안 됩니다',
     '마이페이지에서 전화번호를 변경하려고 하는데 저장이 되지 않습니다. 버튼을 눌러도 아무런 반응이 없어서 문의드립니다. 브라우저는 크롬 최신 버전 사용 중입니다.',
     7, 'USER', 'PENDING', false, false, false, NULL, DATEADD('HOUR', -5, NOW())),

    -- user1
    ('세븐틴 콘서트 좌석 등급별 차이가 궁금합니다',
     '세븐틴 WORLD TOUR 예매를 준비 중인데요. VIP석과 R석의 위치 차이가 어느 정도인지 알 수 있을까요? 공연장 좌석 배치도를 따로 확인할 수 있는 방법이 있나요?',
     2, 'TICKET', 'PENDING', true, false, false, NULL, DATEADD('HOUR', -8, NOW())),

    ('티켓 실물 수령 가능한가요?',
     '전자 티켓 외에 실물 티켓으로 받는 것이 가능한지 궁금합니다. 기념으로 보관하고 싶어서요.',
     2, 'ETC', 'RESOLVED', true, true, false,
     '안녕하세요, CatchCatch 고객센터입니다. 현재 CatchCatch는 전자 티켓(모바일 티켓)만 지원하고 있으며 실물 티켓 발권 서비스는 제공하지 않습니다. 추후 서비스 개선 시 반영될 수 있도록 의견을 전달하겠습니다. 이용에 불편을 드려 죄송합니다.',
     DATEADD('DAY', -5, NOW())),

    -- user2
    ('토스페이로 결제 시 오류 코드 발생',
     '결제 진행 중 "PG_ERR_500" 오류 코드가 뜨면서 결제가 계속 실패합니다. 카드 결제도 동일하게 오류가 납니다. 다른 결제 수단을 사용해야 하나요?',
     3, 'PAYMENT', 'PENDING', false, true, true, NULL, DATEADD('HOUR', -1, NOW())),

    ('중복 예매 방지 정책이 있나요?',
     '같은 공연 같은 회차를 두 장 이상 예매하는 것이 가능한가요? 가족과 함께 가려고 여러 장 사고 싶은데 혹시 1인 1매 제한이 있는지 궁금합니다.',
     3, 'TICKET', 'RESOLVED', true, false, false,
     '안녕하세요, CatchCatch 고객센터입니다. 현재 일부 인기 공연의 경우 1인 최대 구매 한도가 설정되어 있습니다. 공연 상세 페이지에서 1인 최대 구매 가능 매수를 확인하실 수 있습니다. 해당 한도 내에서는 여러 장 구매가 가능하니 참고해 주세요.',
     DATEADD('DAY', -2, NOW())),

    -- user3
    ('환불 취소 요청드립니다',
     '실수로 예매 취소를 신청했습니다. 아직 환불 처리가 완료되지 않았다면 취소 신청을 철회할 수 있을까요?',
     4, 'TICKET', 'CANCELLED', false, false, false, NULL, DATEADD('DAY', -1, NOW())),

    -- ssar
    ('소셜 로그인 계정과 일반 계정 통합 문의',
     '구글 계정으로 가입했는데 기존에 이메일로 만들어둔 계정과 통합이 가능한지 궁금합니다. 예매 내역이 두 계정에 나뉘어 있어서 불편합니다.',
     6, 'USER', 'RESOLVED', false, true, false,
     '안녕하세요, CatchCatch 고객센터입니다. 현재 소셜 로그인 계정과 일반 계정의 통합 기능은 지원하지 않습니다. 보안상의 이유로 계정 병합은 어려운 점 양해 부탁드립니다. 불편하시더라도 각 계정을 별도로 이용해 주시기 바랍니다. 서비스 개선 시 우선적으로 반영될 수 있도록 하겠습니다.',
     DATEADD('DAY', -7, NOW())),

    -- kakaouser
    ('공연 취소 시 자동 환불 처리 여부 확인',
     '공연사 측에서 공연을 취소할 경우 자동으로 환불이 이루어지는지, 아니면 별도로 신청해야 하는지 알고 싶습니다.',
     5, 'ETC', 'PENDING', true, true, false, NULL, DATEADD('MINUTE', -30, NOW()));


-- =====================================================
--  13. notice_tb
--  admin(user_id=1)이 작성한 공지사항
-- =====================================================
INSERT INTO notice_tb
(title, content, user_id, is_pinned, view_count, created_at, updated_at)
VALUES
    -- 고정 공지
    ('[필독] CatchCatch 서비스 이용약관 개정 안내',
     '안녕하세요, CatchCatch입니다.

서비스 이용약관이 2026년 7월 1일부로 개정될 예정입니다.

주요 변경 사항은 다음과 같습니다.
1. 개인정보 처리방침 제3조 수정 (데이터 보존 기간 명확화)
2. 티켓 환불 정책 제7조 개정 (공연 취소 시 자동 환불 조항 신설)
3. 계정 정지 및 이용 제한 기준 구체화

변경된 약관은 시행일 이후 서비스 이용 시 자동으로 동의한 것으로 간주되오니, 내용을 꼭 확인해 주시기 바랍니다.',
     1, true, 1523, DATEADD('DAY', -14, NOW()), DATEADD('DAY', -14, NOW())),

    ('[공지] 정기 서버 점검 안내 (6/15 02:00 ~ 06:00)',
     '안녕하세요, CatchCatch입니다.

서비스 안정화를 위한 정기 점검을 아래와 같이 진행할 예정입니다.

- 일시: 2026년 6월 15일(월) 오전 2시 ~ 오전 6시 (4시간)
- 대상: 전체 서비스 (예매, 결제, 마이페이지 등 모든 기능)

점검 시간 동안에는 서비스를 이용하실 수 없으니 양해 부탁드립니다.
점검 완료 후 정상 서비스될 예정이며, 점검 중 불편을 드려 죄송합니다.',
     1, true, 872, DATEADD('DAY', -3, NOW()), DATEADD('DAY', -3, NOW())),

    -- 일반 공지
    ('티켓 예매 취소 수수료 정책 안내',
     '안녕하세요, CatchCatch입니다.

공연 예매 취소 수수료 정책을 아래와 같이 안내드립니다.

- 공연일 10일 전까지: 수수료 없음 (전액 환불)
- 공연일 9일 ~ 7일 전: 결제 금액의 10% 공제
- 공연일 6일 ~ 3일 전: 결제 금액의 20% 공제
- 공연일 2일 ~ 1일 전: 결제 금액의 30% 공제
- 공연 당일: 환불 불가

단, 공연사 귀책 사유로 인한 공연 취소 시에는 수수료 없이 전액 환불됩니다.
자세한 내용은 각 공연 상세 페이지에서 확인해 주세요.',
     1, false, 3241, DATEADD('DAY', -30, NOW()), DATEADD('DAY', -30, NOW())),

    ('[이벤트] 여름 시즌 얼리버드 할인 프로모션',
     '안녕하세요, CatchCatch입니다.

여름을 맞아 특별 얼리버드 할인 프로모션을 진행합니다!

- 기간: 2026년 6월 10일(수) ~ 6월 20일(금)
- 대상: 7~8월 예정 공연 선예매 고객
- 혜택: 전 좌석 10% 할인 + 선착순 500명 추가 5% 할인 쿠폰 증정

이 기회를 놓치지 마시고, 여름의 특별한 추억을 CatchCatch와 함께 만들어보세요!',
     1, false, 1089, DATEADD('DAY', -7, NOW()), DATEADD('DAY', -7, NOW())),

    ('카카오페이 결제 간헐적 오류 해결 완료 안내',
     '안녕하세요, CatchCatch입니다.

지난 6월 4일(목) 발생한 카카오페이 결제 간헐적 오류가 금일 정상 복구되었음을 알려드립니다.

- 오류 발생 시각: 2026.06.04 14:30
- 복구 완료 시각: 2026.06.05 09:10
- 영향 범위: 카카오페이 결제 실패 (타 결제 수단 정상)

오류 발생 기간 중 결제를 시도하셨으나 실패하신 고객분들께서는 1:1 문의를 통해 접수해 주시면 우선 처리해 드리겠습니다. 불편을 드려 진심으로 사과드립니다.',
     1, false, 654, DATEADD('DAY', -2, NOW()), DATEADD('DAY', -2, NOW())),

    ('모바일 앱 v2.3.0 업데이트 안내',
     '안녕하세요, CatchCatch입니다.

모바일 앱 v2.3.0 업데이트 내용을 안내드립니다.

[신규 기능]
- 공연 알림 설정: 관심 공연 티켓 오픈 30분 전 푸시 알림
- 좌석 미리보기: 공연장 3D 좌석 배치도 확인 기능

[개선 사항]
- 결제 페이지 로딩 속도 30% 개선
- 예매 내역 정렬 필터 UI 개선

[버그 수정]
- iOS 17에서 소셜 로그인 시 앱 종료 현상 수정
- 안드로이드 다크모드에서 티켓 QR코드 배경 오류 수정',
     1, false, 2178, DATEADD('DAY', -10, NOW()), DATEADD('DAY', -10, NOW())),

    ('[안내] 공연 예매 대기열(Queue) 시스템 도입 안내',
     '안녕하세요, CatchCatch입니다.

인기 공연 예매 시 서버 과부하를 방지하고 공정한 예매 기회를 드리기 위해 대기열 시스템을 도입합니다.

- 적용 기준: 동시 접속 1,000명 초과 시 자동 활성화
- 대기 방식: 선착순 번호표 발급 → 순서대로 예매 페이지 입장
- 대기 시간: 실시간 인원에 따라 변동

대기열 진입 후 이탈 시 번호가 소멸될 수 있으니 주의해 주세요. 공정한 예매 환경을 위한 시스템 도입에 협조해 주셔서 감사합니다.',
     1, false, 4502, DATEADD('DAY', -20, NOW()), DATEADD('DAY', -20, NOW())),

    ('개인정보 처리방침 변경 사전 고지',
     '안녕하세요, CatchCatch입니다.

개인정보 보호법 개정에 따라 개인정보 처리방침 일부를 변경합니다.

- 시행일: 2026년 7월 1일
- 주요 변경 내용:
  1. 개인정보 보유 기간 세분화
  2. 제3자 제공 목적 및 항목 구체화
  3. 파기 절차 및 방법 상세화

변경된 처리방침 전문은 시행일 이전에 서비스 내 공지 및 홈페이지를 통해 공개될 예정입니다. 개인정보 처리에 관한 문의는 고객센터로 연락해 주세요.',
     1, false, 921, DATEADD('DAY', -45, NOW()), DATEADD('DAY', -45, NOW()));


-- =====================================================
--  [마무리] UPDATE / AUTO_INCREMENT 보정
-- =====================================================

-- ssar 예매 좌석 SOLD 처리
UPDATE seat_tb SET status = 'SOLD' WHERE id = 4;
UPDATE seat_tb SET status = 'SOLD' WHERE id = 9;

-- 직접 id를 지정한 테이블의 AUTO_INCREMENT 보정
ALTER TABLE concert_tb     ALTER COLUMN id RESTART WITH 100;
ALTER TABLE booking_tb     ALTER COLUMN id RESTART WITH 10;
ALTER TABLE payment_tb     ALTER COLUMN id RESTART WITH 8;


-- =====================================================
--  [확인 쿼리] (필요 시 주석 해제 후 실행)
-- =====================================================
/*
SELECT id, username, email, phone, oauth_provider, role FROM user_tb;

SELECT c.id, c.title, c.artist, v.name AS venue, c.status
FROM concert_tb c JOIN venue_tb v ON c.venue_id = v.id;

SELECT seat_number, grade, price, status
FROM seat_tb WHERE session_id = 1 ORDER BY grade, seat_number;

SELECT b.id, u.username, b.booking_number, s.seat_number, s.grade, b.status, b.created_at
FROM booking_tb b
JOIN user_tb u ON b.user_id = u.id
JOIN seat_tb  s ON b.seat_id  = s.id
ORDER BY b.id;

SELECT p.id, u.username, p.amount, p.method, p.status, p.paid_at
FROM payment_tb p JOIN user_tb u ON p.user_id = u.id ORDER BY p.id;

SELECT q.id, q.user_id, q.concert_session_id, q.queue_number, q.status
FROM queue_tb q ORDER BY q.id;

SELECT i.id, u.username, i.category, i.title, i.status, i.created_at
FROM inquiry_tb i JOIN user_tb u ON i.user_id = u.id ORDER BY i.id;
*/
