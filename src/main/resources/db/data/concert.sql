-- ================
--  venue_tb
-- ================
INSERT INTO venue_tb
    (name, address, total_capacity, created_at)
VALUES ('올림픽공원 체조경기장', '서울특별시 송파구 올림픽로 424', 15000, NOW()),
       ('KSPO DOME', '서울특별시 송파구 올림픽로 424', 15000, NOW()),
       ('잠실실내체육관', '서울특별시 송파구 올림픽로 25', 15000, NOW()),
       ('부산 사직실내체육관', '부산광역시 동래구 사직동 산 29', 12000, NOW()),
       ('인천 남동체육관', '인천광역시 남동구 장수동 503', 10000, NOW());


-- ================
--  concert_tb
-- ================
INSERT INTO concert_tb
(venue_id, title, artist, description, poster_url, status,
 category, genre, start_date, end_date, ticket_open_date, age_limit, runtime, organizer, contact,
 detail_banner_url, detail_title, detail_description1, detail_description2, created_at, is_deleted)
VALUES (1,
        '아이유 콘서트 2026 [HEREH]', '아이유', '아이유의 2026년 단독 콘서트. 새 앨범 수록곡을 포함한 화려한 무대.', '/images/sample/poster-music.svg',
        'OPEN',
        '콘서트', 'concert', '2026-08-01', '2026-08-02', '2026-05-20 20:00:00', '만 7세 이상 관람가', '150분', 'EDAM 엔터테인먼트',
        '1544-1111',
        '/images/sample/detail-banner.svg', '여름밤을 수놓을 아름다운 목소리', '아이유와 함께하는 잊지 못할 특별한 시간', '놓칠 수 없는 단 이틀간의 공연', NOW(),
        false),

       (2,
        '뮤지컬 <시카고> 오리지널 내한', '내한공연팀', '브로드웨이 역사상 가장 매혹적인 뮤지컬 시카고 내한 공연.', '/images/sample/poster-music.svg', 'OPEN',
        '뮤지컬', 'musical', '2026-09-05', '2026-09-07', '2026-05-25 14:00:00', '만 15세 이상 관람가', '150분', '신시컴퍼니',
        '1544-2222',
        '/images/sample/detail-banner.svg', '가장 뜨겁고 섹시한 무대', '브로드웨이 오리지널 캐스트의 귀환', 'All That Jazz', NOW(), false),

       (3,
        '조성진 피아노 리사이틀', '조성진', '세계적인 피아니스트 조성진의 2026년 전국투어 리사이틀.', '/images/sample/poster-music.svg', 'COMING_SOON',
        '클래식', 'classic', '2026-10-10', '2026-10-11', '2026-07-10 18:00:00', '만 7세 이상 관람가', '100분', '크레디아', '1544-3333',
        '/images/sample/detail-banner.svg', '건반 위를 수놓는 완벽한 타건', '쇼팽 콩쿠르 우승자 조성진의 귀환', '영혼을 울리는 클래식의 밤', NOW(), false),

       (4,
        '부산 재즈 페스티벌 2026', '다수 아티스트', '국내외 유명 재즈 아티스트들의 합동 페스티벌 공연.', '/images/sample/poster-music.svg', 'OPEN',
        '페스티벌', 'festival', '2026-07-20', '2026-07-20', '2026-06-01 12:00:00', '전체 관람가', '240분', '부산문화재단', '1544-4444',
        '/images/sample/detail-banner.svg', '한여름 밤의 낭만적인 재즈 선율', '국내외 최정상급 재즈 뮤지션 총출동', '사직실내체육관에서 즐기는 감미로운 축제', NOW(),
        false),

       (1,
        '박보검 데뷔 16주년 팬미팅', '박보검', '배우 박보검 데뷔 16주년 기념 공식 팬미팅.', '/images/sample/poster-music.svg', 'CLOSED_SOON',
        '팬미팅', 'fanmeeting', '2026-06-25', '2026-06-25', '2026-05-01 20:00:00', '전체 관람가', '120분', '더블랙레이블', '1544-5555',
        '/images/sample/detail-banner.svg', '팬들과 함께하는 특별한 16주년', '보검복지부와 함께하는 따뜻한 시간', '놓칠 수 없는 단 하루', NOW(), false),

       (2,
        'DAY6 4TH WORLD TOUR <FOREVER>', 'DAY6', '마이데이를 위한 뜨거운 여정, 데이식스 월드투어 서울 공연.', '/images/sample/poster-music.svg',
        'COMING_SOON',
        '콘서트', 'concert', '2026-08-21', '2026-08-25', '2026-06-25 20:00:00', '만 7세 이상 관람가', '150분', 'JYP 엔터테인먼트',
        '1544-6666',
        '/images/sample/detail-banner.svg', '우리의 모든 순간이 영원이 되도록', 'FOREVER 뜨겁게 빛날 무대', '올림픽공원에서 펼쳐지는 벅찬 감동', NOW(),
        false),

       (3,
        '세븐틴 WORLD TOUR <NEW_> IN SEOUL', '세븐틴', '새로운 챕터의 시작을 알리는 세븐틴의 월드투어 인 서울.',
        '/images/sample/poster-triangle.svg', 'OPEN',
        '콘서트', 'concert', '2026-07-06', '2026-07-08', '2026-05-15 20:00:00', '만 7세 이상 관람가', '180분', 'PLEDIS 엔터테인먼트',
        '1544-7777',
        '/images/sample/detail-banner.svg', '새로운 역사를 써 내려갈 완벽한 무대', '고척돔을 가득 채울 열기', '캐럿과 함께 여는 NEW 챕터', NOW(), false),

       (4,
        '황치열 전국투어 콘서트 <별, 그대> - 서울', '황치열', '가슴 절절한 목소리로 돌아온 황치열의 2026년 전국투어.', '/images/sample/poster-artist.svg',
        'CLOSED_SOON',
        '콘서트', 'concert', '2026-06-20', '2026-06-21', '2026-05-10 14:00:00', '만 7세 이상 관람가', '150분', 'TEN2 엔터테인먼트',
        '1544-8888',
        '/images/sample/detail-banner.svg', '밤하늘의 별처럼 쏟아지는 감동', '별, 그리고 당신을 위한 세레나데', '화이트데이에 전하는 특별한 선물', NOW(),
        false),

       (5,
        'aespa LIVE TOUR <SYNK : HYPER LINE>', 'aespa', '가상과 현실을 넘나드는 에스파의 메타버스 라이브 투어.',
        '/images/sample/poster-aespa.svg', 'OPEN',
        '콘서트', 'concert', '2026-08-11', '2026-08-12', '2026-06-02 20:00:00', '만 7세 이상 관람가', '150분', 'SM 엔터테인먼트',
        '1544-9999',
        '/images/sample/detail-banner.svg', '현실과 광야를 잇는 압도적인 세계관', 'SYNK : HYPER LINE', '인스파이어 아레나를 강타할 광야의 소리', NOW(),
        false),

       (1,
        'Cigarettes After Sex Live in Seoul', 'Cigarettes After Sex', '몽환적이고 감각적인 사운드의 대명사, CAS 내한 공연.',
        '/images/sample/poster-cas.svg', 'OPEN',
        '콘서트', 'concert', '2026-07-30', '2026-07-30', '2026-05-30 12:00:00', '만 15세 이상 관람가', '120분', '프라이빗커브',
        '1544-0000',
        '/images/sample/detail-banner.svg', '당신의 밤을 적실 몽환적인 멜로디', '독보적인 분위기의 라이브', '잠실을 수놓을 짙은 감성', NOW(), false);



-- ================
--  concert_session_tb
-- ================
INSERT INTO concert_session_tb
    (concert_id, session_date, session_time, created_at, is_deleted)
VALUES (1, '2025-08-01', '18:00:00', NOW(), false),
       (1, '2025-08-02', '18:00:00', NOW(), false),
       (2, '2025-09-05', '19:00:00', NOW(), false),
       (2, '2025-09-06', '19:00:00', NOW(), false),
       (2, '2025-09-07', '17:00:00', NOW(), false),
       (3, '2025-10-10', '18:00:00', NOW(), false),
       (3, '2025-10-11', '18:00:00', NOW(), false),
       (4, '2025-07-20', '17:00:00', NOW(), false),
       (5, '2025-06-01', '18:00:00', NOW(), false);


-- ================
--  seat_tb
-- ================
INSERT INTO seat_tb
    (session_id, seat_number, grade, price, status, updated_at)
VALUES
    -- 아이유 VIP석
    (1, 'VIP-01', 'VIP', 165000, 'SOLD', NOW()),
    (1, 'VIP-02', 'VIP', 165000, 'SOLD', NOW()),
    (1, 'VIP-03', 'VIP', 165000, 'HELD', NOW()),
    (1, 'VIP-04', 'VIP', 165000, 'AVAILABLE', NOW()),
    (1, 'VIP-05', 'VIP', 165000, 'AVAILABLE', NOW()),
    -- 아이유 R석
    (1, 'R-01', 'R', 132000, 'SOLD', NOW()),
    (1, 'R-02', 'R', 132000, 'SOLD', NOW()),
    (1, 'R-03', 'R', 132000, 'SOLD', NOW()),
    (1, 'R-04', 'R', 132000, 'AVAILABLE', NOW()),
    (1, 'R-05', 'R', 132000, 'AVAILABLE', NOW()),
    (1, 'R-06', 'R', 132000, 'AVAILABLE', NOW()),
    (1, 'R-07', 'R', 132000, 'AVAILABLE', NOW()),
    (1, 'R-08', 'R', 132000, 'AVAILABLE', NOW()),
    (1, 'R-09', 'R', 132000, 'AVAILABLE', NOW()),
    (1, 'R-10', 'R', 132000, 'AVAILABLE', NOW()),
    -- 아이유 S석
    (1, 'S-01', 'S', 110000, 'SOLD', NOW()),
    (1, 'S-02', 'S', 110000, 'AVAILABLE', NOW()),
    (1, 'S-03', 'S', 110000, 'AVAILABLE', NOW()),
    (1, 'S-04', 'S', 110000, 'AVAILABLE', NOW()),
    (1, 'S-05', 'S', 110000, 'AVAILABLE', NOW()),
    (1, 'S-06', 'S', 110000, 'AVAILABLE', NOW()),
    (1, 'S-07', 'S', 110000, 'AVAILABLE', NOW()),
    (1, 'S-08', 'S', 110000, 'AVAILABLE', NOW()),
    (1, 'S-09', 'S', 110000, 'AVAILABLE', NOW()),
    (1, 'S-10', 'S', 110000, 'AVAILABLE', NOW()),
    -- 아이유 A석
    (1, 'A-01', 'A', 88000, 'AVAILABLE', NOW()),
    (1, 'A-02', 'A', 88000, 'AVAILABLE', NOW()),
    (1, 'A-03', 'A', 88000, 'AVAILABLE', NOW()),
    (1, 'A-04', 'A', 88000, 'AVAILABLE', NOW()),
    (1, 'A-05', 'A', 88000, 'AVAILABLE', NOW()),
    (1, 'A-06', 'A', 88000, 'AVAILABLE', NOW()),
    (1, 'A-07', 'A', 88000, 'AVAILABLE', NOW()),
    (1, 'A-08', 'A', 88000, 'AVAILABLE', NOW()),
    (1, 'A-09', 'A', 88000, 'AVAILABLE', NOW()),
    (1, 'A-10', 'A', 88000, 'AVAILABLE', NOW()),
    -- 시카고 샘플 좌석
    (3, 'VIP-01', 'VIP', 198000, 'SOLD', NOW()),
    (3, 'VIP-02', 'VIP', 198000, 'AVAILABLE', NOW()),
    (3, 'R-01', 'R', 165000, 'AVAILABLE', NOW()),
    (3, 'S-01', 'S', 132000, 'AVAILABLE', NOW()),
    (3, 'A-01', 'A', 99000, 'AVAILABLE', NOW());
