-- =========================
-- Event Sample Data for H2
-- =========================

-- 진행 중 이벤트
INSERT INTO event_tb
(title, description, reward_point, start_date, end_date)
VALUES
    (
        'CatchCatch 첫 예매 웰컴 혜택',
        '처음 예매하면 바로 사용할 수 있는 2,000P를 드려요.',
        2000,
        DATEADD('DAY', -5, CURRENT_TIMESTAMP),
        DATEADD('DAY', 20, CURRENT_TIMESTAMP)
    );

INSERT INTO event_tb
(title, description, reward_point, start_date, end_date)
VALUES
    (
        '여름 공연 취향 테스트 이벤트',
        '간단한 취향 테스트로 이번 여름에 어울리는 공연을 추천받아보세요.',
        1000,
        DATEADD('DAY', -3, CURRENT_TIMESTAMP),
        DATEADD('DAY', 35, CURRENT_TIMESTAMP)
    );

INSERT INTO event_tb
(title, description, reward_point, start_date, end_date)
VALUES
    (
        '공연 후기 작성 포인트 적립',
        '공연 관람 후 후기를 남기면 추첨을 통해 포인트를 적립해드려요.',
        1500,
        DATEADD('DAY', -10, CURRENT_TIMESTAMP),
        DATEADD('DAY', 10, CURRENT_TIMESTAMP)
    );

INSERT INTO event_tb
(title, description, reward_point, start_date, end_date)
VALUES
    (
        '친구 초대 포인트 이벤트',
        '친구가 가입하면 초대한 회원과 친구 모두에게 포인트를 드려요.',
        1000,
        DATEADD('DAY', -1, CURRENT_TIMESTAMP),
        DATEADD('DAY', 50, CURRENT_TIMESTAMP)
    );


-- 예정 이벤트
INSERT INTO event_tb
(title, description, reward_point, start_date, end_date)
VALUES
    (
        '가을 콘서트 얼리버드 이벤트',
        '다가오는 가을 공연을 미리 준비하는 회원을 위한 얼리버드 혜택입니다.',
        3000,
        DATEADD('DAY', 7, CURRENT_TIMESTAMP),
        DATEADD('DAY', 45, CURRENT_TIMESTAMP)
    );

INSERT INTO event_tb
(title, description, reward_point, start_date, end_date)
VALUES
    (
        '뮤지컬 초대권 응모 이벤트',
        '이벤트 기간 동안 응모한 회원 중 추첨을 통해 뮤지컬 초대권을 드립니다.',
        0,
        DATEADD('DAY', 12, CURRENT_TIMESTAMP),
        DATEADD('DAY', 40, CURRENT_TIMESTAMP)
    );


-- 종료 이벤트
INSERT INTO event_tb
(title, description, reward_point, start_date, end_date)
VALUES
    (
        '봄맞이 공연 할인 이벤트',
        '봄 시즌 공연 예매 고객을 위한 기간 한정 할인 이벤트였습니다.',
        1000,
        DATEADD('DAY', -60, CURRENT_TIMESTAMP),
        DATEADD('DAY', -20, CURRENT_TIMESTAMP)
    );

INSERT INTO event_tb
(title, description, reward_point, start_date, end_date)
VALUES
    (
        '신규 회원 가입 축하 이벤트',
        '신규 회원 가입 시 포인트를 지급했던 이벤트입니다.',
        3000,
        DATEADD('DAY', -90, CURRENT_TIMESTAMP),
        DATEADD('DAY', -30, CURRENT_TIMESTAMP)
    );