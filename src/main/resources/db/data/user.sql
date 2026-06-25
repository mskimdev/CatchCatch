-- ================
--  user_tb
--  비밀번호: 전부 "ssar1234" BCrypt 암호화
-- ================
INSERT INTO user_tb
(username, password, email, phone, profile_image, oauth_provider, role, point, created_at, is_deleted)
VALUES
    ('admin',
     '$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK',
     'admin@catchcatch.com',
     '010-0000-0000',
     NULL, 'LOCAL', 'ADMIN', 0, NOW(), false),

    ('manager',
     '$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK',
     'manager@catchcatch.com',
     '010-7777-7777',
     NULL, 'LOCAL', 'MANAGER', 0, NOW(), false),

    ('user1',
     '$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK',
     'user1@test.com',
     '010-1111-1111',
     NULL, 'LOCAL', 'USER', 0, NOW(), false),

    ('user2',
     '$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK',
     'user2@test.com',
     '010-2222-2222',
     NULL, 'LOCAL', 'USER', 0, NOW(), false),

    ('user3',
     '$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK',
     'user3@test.com',
     '010-3333-3333',
     NULL, 'LOCAL', 'USER', 0, NOW(), false),

    ('kakaouser',
     '$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK',
     'kakao_12345@kakao.com',
     '010-4444-4444',
     NULL, 'KAKAO', 'USER', 0, NOW(), false),

    ('ssar',
     '$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK',
     'ssar@naver.com',
     '010-5729-1754',
     NULL, 'LOCAL', 'USER', 0 , NOW(), false);

-- ================
--  대규모 부하 테스트용 더미 유저 (loadgen1 ~ loadgen30000)
--  비밀번호: 전부 "ssar1234" BCrypt 암호화
--  SYSTEM_RANGE로 3만 건을 한 번에 생성 (H2 전용 문법 - MySQL 등 외부 DB에서는 동작하지 않음)
-- ================
INSERT INTO user_tb
(username, password, email, phone, profile_image, oauth_provider, role, point, created_at, is_deleted)
SELECT
    'loadgen' || x,
    '$2a$10$khm3EIgyknCWhPOeB78.Oe7aSr1uF1DnytJ40b/LoBi9Q1Uig9RIK',
    'loadgen' || x || '@test.com',
    '010-0000-0000',
    NULL, 'LOCAL', 'USER', 0, NOW(), false
FROM SYSTEM_RANGE(1, 5000) AS t(x);
