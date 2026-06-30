-- ================
--  k6 부하 테스트 전용 데이터
--  - 대기열 진입/승격 부하 테스트
--  - 좌석 동시선택 방지(비관적 락) 검증
--  기존 venue(1~5)/concert(1~11)/concert_session(1~9)와 겹치지 않게 새 ID로 추가한다.
-- ================

-- ================
--  venue_tb (k6 전용 공연장 2개)
-- ================
INSERT INTO venue_tb
(name, address, total_capacity, seat_map_file_path, created_at)
VALUES ('k6 부하테스트 전용 공연장 A', '서울특별시 송파구 올림픽로 000', 1000, NULL, NOW()),
       ('k6 부하테스트 전용 공연장 B', '서울특별시 송파구 올림픽로 001', 1000, NULL, NOW());

-- ================
--  concert_tb (k6 전용 콘서트 2개)
-- ================
INSERT INTO concert_tb
(venue_id, title, artist, description, poster_url, status,
 genre, start_date, end_date, ticket_open_date, age_limit, runtime, organizer, contact,
 detail_banner_url, detail_title, detail_description2, price_vip, price_r, price_s, price_a, created_at, is_deleted)
VALUES
    ((SELECT id FROM venue_tb WHERE name = 'k6 부하테스트 전용 공연장 A'),
     'k6 부하테스트 콘서트 A', 'k6', 'k6 부하 테스트 전용 콘서트 데이터 A.', '/images/sample/poster-music.svg', 'OPEN',
     'CONCERT', '2026-12-31', '2026-12-31', '2026-01-01 00:00:00', '전체 관람가', '120분', 'k6', '000-0000-0000',
     '/images/sample/detail-banner.svg', 'k6 부하테스트 A', 'k6 부하 테스트 전용',
     100000, 80000, 60000, 40000, NOW(), false),

    ((SELECT id FROM venue_tb WHERE name = 'k6 부하테스트 전용 공연장 B'),
     'k6 부하테스트 콘서트 B', 'k6', 'k6 부하 테스트 전용 콘서트 데이터 B.', '/images/sample/poster-music.svg', 'OPEN',
     'CONCERT', '2026-12-31', '2026-12-31', '2026-01-01 00:00:00', '전체 관람가', '120분', 'k6', '000-0000-0000',
     '/images/sample/detail-banner.svg', 'k6 부하테스트 B', 'k6 부하 테스트 전용',
     100000, 80000, 60000, 40000, NOW(), false);

-- ================
--  concert_session_tb (k6 전용 회차, 콘서트당 1개)
-- ================
INSERT INTO concert_session_tb
(concert_id, session_date, session_time, round, created_at, is_deleted)
VALUES
    ((SELECT id FROM concert_tb WHERE title = 'k6 부하테스트 콘서트 A'),
     '2026-12-31', '20:00:00', '1회차', NOW(), false),

    ((SELECT id FROM concert_tb WHERE title = 'k6 부하테스트 콘서트 B'),
     '2026-12-31', '21:00:00', '1회차', NOW(), false);

-- ================
--  seat_tb (k6 전용 좌석 각 1000석)
--  capacity = min(INFRA_CONCURRENCY_LIMIT=500, AVAILABLE 좌석 수) 가 500에서 막히는 것까지 확인 가능하도록
--  500석보다 많은 1000석을 생성한다. 등급은 모두 A로 단순화.
-- ================
INSERT INTO seat_tb
(session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, updated_at)
SELECT
    (SELECT cs.id FROM concert_session_tb cs
        JOIN concert_tb c ON c.id = cs.concert_id
        WHERE c.title = 'k6 부하테스트 콘서트 A'),
    1, 'A', 'A', x,
    'A구역 A열 ' || x || '번',
    'A', 40000, 'AVAILABLE', NOW()
FROM SYSTEM_RANGE(1, 1000) AS t(x);

INSERT INTO seat_tb
(session_id, floor, section_name, seat_row, seat_col, seat_number, grade, price, status, updated_at)
SELECT
    (SELECT cs.id FROM concert_session_tb cs
        JOIN concert_tb c ON c.id = cs.concert_id
        WHERE c.title = 'k6 부하테스트 콘서트 B'),
    1, 'A', 'A', x,
    'A구역 A열 ' || x || '번',
    'A', 40000, 'AVAILABLE', NOW()
FROM SYSTEM_RANGE(1, 1000) AS t(x);
