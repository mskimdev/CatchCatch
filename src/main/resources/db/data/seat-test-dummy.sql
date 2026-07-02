-- ================================================================================
--  SeatTrace 좌석 테스트 더미 (H2 전용)
--  실행 위치: src/main/resources/db/data/seat-test-dummy.sql
--
--  data.sql 실행 순서:
--    RUNSCRIPT FROM 'classpath:db/data/dummy.sql';
--    RUNSCRIPT FROM 'classpath:db/data/seat-test-dummy.sql';
--
--  역할:
--    1) dummy.sql의 k6 부하테스트 콘서트 B를 2026-07-04 테스트 회차로 맞춘다.
--    2) k6 부하테스트 공연장 B에 SeatTrace example 좌석 파일 경로를 연결한다.
--    3) dummy.sql에서 넣은 k6B A석 1000개를 삭제한다.
--    4) example-seatmap-seats.json 기준 좌석 3462개를 seat_tb에 다시 넣는다.
--
--  참고:
--    현재 Seat.Grade enum이 VIP/R/S/A 기준이면 SR은 DB에 넣을 수 없으므로
--    STANDING_C의 SR은 S로 변환해서 넣고, 가격은 90,000원으로 유지한다.
-- ================================================================================

-- ------------------------------------------------------------
-- 1. k6B 공연장에 SeatTrace example 좌석도 연결
-- ------------------------------------------------------------
UPDATE venue_tb
SET seat_map_file_path = '/temp/seatmap/seats/example-seatmap-seats.json',
    total_capacity = 15000
WHERE name = 'k6 부하테스트 공연장 B';

-- ------------------------------------------------------------
-- 2. k6B 공연/회차를 2026-07-04 테스트용으로 고정
-- ------------------------------------------------------------
UPDATE concert_tb
SET start_date = DATE '2026-07-04',
    end_date = DATE '2026-07-04',
    status = 'OPEN'
WHERE title = 'k6 부하테스트 콘서트 B';

UPDATE concert_session_tb
SET session_date = DATE '2026-07-04',
    session_time = TIME '10:00:00',
    round = '25일 임시',
    is_deleted = false
WHERE concert_id = (SELECT id FROM concert_tb WHERE title = 'k6 부하테스트 콘서트 B')
  AND (
        round = '25일 임시'
        OR round = '1회차'
        OR session_date = DATE '2026-12-31'
      );

-- ------------------------------------------------------------
-- 3. k6B 25일 임시 회차의 기존 좌석 제거
--    dummy.sql의 A석 1000개를 example 기반 좌석으로 교체하기 위함
-- ------------------------------------------------------------
DELETE FROM booking_seat_tb
WHERE seat_id IN (
    SELECT s.id
    FROM seat_tb s
             JOIN concert_session_tb cs ON cs.id = s.session_id
             JOIN concert_tb c ON c.id = cs.concert_id
    WHERE c.title = 'k6 부하테스트 콘서트 B'
      AND cs.session_date = DATE '2026-07-04'
      AND cs.session_time = TIME '10:00:00'
);

DELETE FROM seat_tb
WHERE session_id IN (
    SELECT cs.id
    FROM concert_session_tb cs
             JOIN concert_tb c ON c.id = cs.concert_id
    WHERE c.title = 'k6 부하테스트 콘서트 B'
      AND cs.session_date = DATE '2026-07-04'
      AND cs.session_time = TIME '10:00:00'
);

-- ------------------------------------------------------------
-- 4. example-seatmap-seats.json 기준 좌석 생성
--    좌석 ID 원본 규칙: 층-구역-행-렬-좌석등급-상태
--    DB seat_number: 구역 행-렬
--
--  섹션별 수량
--    VIP_A: 25
--    VIP_B: 25
--    STANDING_C: 1800
--    D2: 196
--    S_C2: 83
--    C2: 127
--    S_B2: 82
--    B2: 125
--    S_A2: 81
--    A2: 115
--    S_P2: 79
--    P2: 119
--    S_O2: 76
--    O2: 127
--    S_N2: 76
--    N2: 132
--    M2: 196
--
--  등급별 수량: A=392, R=745, S=2277, VIP=48
-- ------------------------------------------------------------
INSERT INTO seat_tb (
    session_id,
    floor,
    section_name,
    seat_row,
    seat_col,
    seat_number,
    grade,
    price,
    status,
    updated_at
)
SELECT
    target.session_id,
    rc.floor,
    rc.section_name,
    rc.seat_row,
    n.x AS seat_col,
    rc.section_name || ' ' || rc.seat_row || '-' || n.x AS seat_number,
    rc.grade,
    rc.price,
    'AVAILABLE' AS status,
    NOW() AS updated_at
FROM (
    SELECT cs.id AS session_id
    FROM concert_session_tb cs
             JOIN concert_tb c ON c.id = cs.concert_id
    WHERE c.title = 'k6 부하테스트 콘서트 B'
      AND cs.session_date = DATE '2026-07-04'
      AND cs.session_time = TIME '10:00:00'
    ORDER BY cs.id
    LIMIT 1
) target
CROSS JOIN (
VALUES
    (1, 'VIP_A', 'A', 8, 'VIP', 165000),
    (1, 'VIP_A', 'B', 8, 'VIP', 165000),
    (1, 'VIP_A', 'C', 8, 'VIP', 165000),
    (1, 'VIP_B', 'A', 8, 'VIP', 165000),
    (1, 'VIP_B', 'B', 8, 'VIP', 165000),
    (1, 'VIP_B', 'C', 8, 'VIP', 165000),
    (1, 'STANDING_C', 'A', 75, 'S', 90000),
    (1, 'STANDING_C', 'B', 75, 'S', 90000),
    (1, 'STANDING_C', 'C', 75, 'S', 90000),
    (1, 'STANDING_C', 'D', 75, 'S', 90000),
    (1, 'STANDING_C', 'E', 75, 'S', 90000),
    (1, 'STANDING_C', 'F', 75, 'S', 90000),
    (1, 'STANDING_C', 'G', 75, 'S', 90000),
    (1, 'STANDING_C', 'H', 75, 'S', 90000),
    (1, 'STANDING_C', 'I', 75, 'S', 90000),
    (1, 'STANDING_C', 'J', 75, 'S', 90000),
    (1, 'STANDING_C', 'K', 75, 'S', 90000),
    (1, 'STANDING_C', 'L', 75, 'S', 90000),
    (1, 'STANDING_C', 'M', 75, 'S', 90000),
    (1, 'STANDING_C', 'N', 75, 'S', 90000),
    (1, 'STANDING_C', 'O', 75, 'S', 90000),
    (1, 'STANDING_C', 'P', 75, 'S', 90000),
    (1, 'STANDING_C', 'Q', 75, 'S', 90000),
    (1, 'STANDING_C', 'R', 75, 'S', 90000),
    (1, 'STANDING_C', 'S', 75, 'S', 90000),
    (1, 'STANDING_C', 'T', 75, 'S', 90000),
    (1, 'STANDING_C', 'U', 75, 'S', 90000),
    (1, 'STANDING_C', 'V', 75, 'S', 90000),
    (1, 'STANDING_C', 'W', 75, 'S', 90000),
    (1, 'STANDING_C', 'X', 75, 'S', 90000),
    (2, 'D2', 'A', 5, 'A', 90000),
    (2, 'D2', 'B', 15, 'A', 90000),
    (2, 'D2', 'C', 16, 'A', 90000),
    (2, 'D2', 'D', 16, 'A', 90000),
    (2, 'D2', 'E', 17, 'A', 90000),
    (2, 'D2', 'F', 18, 'A', 90000),
    (2, 'D2', 'G', 21, 'A', 90000),
    (2, 'D2', 'H', 22, 'A', 90000),
    (2, 'D2', 'I', 23, 'A', 90000),
    (2, 'D2', 'J', 23, 'A', 90000),
    (2, 'D2', 'K', 20, 'A', 90000),
    (2, 'S_C2', 'A', 8, 'S', 110000),
    (2, 'S_C2', 'B', 8, 'S', 110000),
    (2, 'S_C2', 'C', 9, 'S', 110000),
    (2, 'S_C2', 'D', 10, 'S', 110000),
    (2, 'S_C2', 'E', 11, 'S', 110000),
    (2, 'S_C2', 'F', 12, 'S', 110000),
    (2, 'S_C2', 'G', 12, 'S', 110000),
    (2, 'S_C2', 'H', 13, 'S', 110000),
    (2, 'C2', 'A', 11, 'R', 130000),
    (2, 'C2', 'B', 11, 'R', 130000),
    (2, 'C2', 'C', 12, 'R', 130000),
    (2, 'C2', 'D', 13, 'R', 130000),
    (2, 'C2', 'E', 14, 'R', 130000),
    (2, 'C2', 'F', 15, 'R', 130000),
    (2, 'C2', 'G', 16, 'R', 130000),
    (2, 'C2', 'H', 17, 'R', 130000),
    (2, 'C2', 'I', 18, 'R', 130000),
    (2, 'S_B2', 'A', 11, 'S', 110000),
    (2, 'S_B2', 'B', 12, 'S', 110000),
    (2, 'S_B2', 'C', 12, 'S', 110000),
    (2, 'S_B2', 'D', 12, 'S', 110000),
    (2, 'S_B2', 'E', 12, 'S', 110000),
    (2, 'S_B2', 'F', 12, 'S', 110000),
    (2, 'S_B2', 'G', 11, 'S', 110000),
    (2, 'B2', 'A', 11, 'R', 130000),
    (2, 'B2', 'B', 12, 'R', 130000),
    (2, 'B2', 'C', 14, 'R', 130000),
    (2, 'B2', 'D', 15, 'R', 130000),
    (2, 'B2', 'E', 16, 'R', 130000),
    (2, 'B2', 'F', 18, 'R', 130000),
    (2, 'B2', 'G', 19, 'R', 130000),
    (2, 'B2', 'H', 20, 'R', 130000),
    (2, 'S_A2', 'A', 20, 'S', 110000),
    (2, 'S_A2', 'B', 21, 'S', 110000),
    (2, 'S_A2', 'C', 21, 'S', 110000),
    (2, 'S_A2', 'D', 19, 'S', 110000),
    (2, 'A2', 'A', 23, 'R', 130000),
    (2, 'A2', 'B', 23, 'R', 130000),
    (2, 'A2', 'C', 25, 'R', 130000),
    (2, 'A2', 'D', 23, 'R', 130000),
    (2, 'A2', 'E', 22, 'R', 130000),
    (2, 'S_P2', 'A', 20, 'S', 110000),
    (2, 'S_P2', 'B', 20, 'S', 110000),
    (2, 'S_P2', 'C', 20, 'S', 110000),
    (2, 'S_P2', 'D', 19, 'S', 110000),
    (2, 'P2', 'A', 23, 'R', 130000),
    (2, 'P2', 'B', 25, 'R', 130000),
    (2, 'P2', 'C', 25, 'R', 130000),
    (2, 'P2', 'D', 25, 'R', 130000),
    (2, 'P2', 'E', 23, 'R', 130000),
    (2, 'S_O2', 'A', 11, 'S', 110000),
    (2, 'S_O2', 'B', 11, 'S', 110000),
    (2, 'S_O2', 'C', 11, 'S', 110000),
    (2, 'S_O2', 'D', 11, 'S', 110000),
    (2, 'S_O2', 'E', 11, 'S', 110000),
    (2, 'S_O2', 'F', 11, 'S', 110000),
    (2, 'S_O2', 'G', 10, 'S', 110000),
    (2, 'O2', 'A', 11, 'R', 130000),
    (2, 'O2', 'B', 13, 'R', 130000),
    (2, 'O2', 'C', 14, 'R', 130000),
    (2, 'O2', 'D', 15, 'R', 130000),
    (2, 'O2', 'E', 17, 'R', 130000),
    (2, 'O2', 'F', 18, 'R', 130000),
    (2, 'O2', 'G', 19, 'R', 130000),
    (2, 'O2', 'H', 20, 'R', 130000),
    (2, 'S_N2', 'A', 7, 'S', 110000),
    (2, 'S_N2', 'B', 8, 'S', 110000),
    (2, 'S_N2', 'C', 8, 'S', 110000),
    (2, 'S_N2', 'D', 9, 'S', 110000),
    (2, 'S_N2', 'E', 10, 'S', 110000),
    (2, 'S_N2', 'F', 11, 'S', 110000),
    (2, 'S_N2', 'G', 11, 'S', 110000),
    (2, 'S_N2', 'H', 12, 'S', 110000),
    (2, 'N2', 'A', 10, 'R', 130000),
    (2, 'N2', 'B', 11, 'R', 130000),
    (2, 'N2', 'C', 12, 'R', 130000),
    (2, 'N2', 'D', 14, 'R', 130000),
    (2, 'N2', 'E', 15, 'R', 130000),
    (2, 'N2', 'F', 16, 'R', 130000),
    (2, 'N2', 'G', 17, 'R', 130000),
    (2, 'N2', 'H', 18, 'R', 130000),
    (2, 'N2', 'I', 19, 'R', 130000),
    (2, 'M2', 'A', 5, 'A', 90000),
    (2, 'M2', 'B', 15, 'A', 90000),
    (2, 'M2', 'C', 16, 'A', 90000),
    (2, 'M2', 'D', 16, 'A', 90000),
    (2, 'M2', 'E', 17, 'A', 90000),
    (2, 'M2', 'F', 18, 'A', 90000),
    (2, 'M2', 'G', 21, 'A', 90000),
    (2, 'M2', 'H', 22, 'A', 90000),
    (2, 'M2', 'I', 23, 'A', 90000),
    (2, 'M2', 'J', 23, 'A', 90000),
    (2, 'M2', 'K', 20, 'A', 90000)
) AS rc(floor, section_name, seat_row, seat_count, grade, price)
JOIN SYSTEM_RANGE(1, 100) AS n(x)
  ON n.x <= rc.seat_count;

-- ------------------------------------------------------------
-- 5. 테스트 계정 대기열 입장 처리
--    좌석 선택 페이지 바로 진입 테스트용
-- ------------------------------------------------------------
INSERT INTO queue_tb (user_id, concert_session_id, queue_number, status, entered_at, expired_at, created_at)
SELECT
    u.id,
    target.session_id,
    9000 + ROW_NUMBER() OVER (ORDER BY u.id) AS queue_number,
    'ENTERED',
    NOW(),
    NULL,
    NOW()
FROM user_tb u
CROSS JOIN (
    SELECT cs.id AS session_id
    FROM concert_session_tb cs
             JOIN concert_tb c ON c.id = cs.concert_id
    WHERE c.title = 'k6 부하테스트 콘서트 B'
      AND cs.session_date = DATE '2026-07-04'
      AND cs.session_time = TIME '10:00:00'
    ORDER BY cs.id
    LIMIT 1
) target
WHERE u.username IN ('user1', 'ssar', 'sarr')
  AND NOT EXISTS (
      SELECT 1
      FROM queue_tb q
      WHERE q.user_id = u.id
        AND q.concert_session_id = target.session_id
  );

-- ------------------------------------------------------------
-- 6. 확인용 SQL
-- ------------------------------------------------------------
-- SELECT
--     cs.id,
--     c.title,
--     cs.session_date,
--     cs.session_time,
--     cs.round,
--     v.seat_map_file_path,
--     COUNT(s.id) AS seat_count
-- FROM concert_session_tb cs
--          JOIN concert_tb c ON c.id = cs.concert_id
--          JOIN venue_tb v ON v.id = c.venue_id
--          LEFT JOIN seat_tb s ON s.session_id = cs.id
-- WHERE c.title = 'k6 부하테스트 콘서트 B'
-- GROUP BY cs.id, c.title, cs.session_date, cs.session_time, cs.round, v.seat_map_file_path
-- ORDER BY cs.session_date, cs.session_time;
