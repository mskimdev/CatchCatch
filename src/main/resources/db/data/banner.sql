-- ====================================================================
-- 메인 홈페이지 히어로 배너 (banner_tb) 초기화 데이터
-- ====================================================================

-- 1번 배너: 메인 아티스트 대형 콘서트 홍보
INSERT INTO banner_tb (image_url, eyebrow, title, highlight, description, button_text, link_url, display_order, is_active)
VALUES (
           '/images/sample/banner-main.svg',
           'CATCHCATCH EXCLUSIVE',
           '2026 악뮤(AKMU) 10주년 전국투어',
           '단독 오픈 결정!',
           '오직 CatchCatch에서만 제공하는 특별 스페셜 좌석 패키지를 지금 확인하세요.',
           '티켓 예매하기',
           '/concerts/1',
           1,
           true
       );

-- 2번 배너: 시즌 뮤직 페스티벌 홍보
INSERT INTO banner_tb (image_url, eyebrow, title, highlight, description, button_text, link_url, display_order, is_active)
VALUES (
           '/images/sample/banner-festival.svg',
           'SEASON FESTIVAL',
           '2026 한강 서머 스플래시 뮤직 페스티벌',
           '얼리버드 20% 할인',
           '도심 속에서 즐기는 가장 시원하고 짜릿한 물총 축제와 힙합 비트의 결합',
           '라인업 보러가기',
           '/concerts/2',
           2,
           true
       );

-- 3번 배너: 마케팅/이벤트 페이지 연동 링킹 배너 (확장성 증명용)
INSERT INTO banner_tb (image_url, eyebrow, title, highlight, description, button_text, link_url, display_order, is_active)
VALUES (
           '/images/sample/banner-event.svg',
           'MEMBERSHIP BENEFIT',
           '신규 회원 가입 감사 웰컴 쿠폰팩 pack',
           '5,000원 즉시 지급',
           '지금 CatchCatch 가입하고 첫 콘서트 예매 시 바로 사용할 수 있는 할인 쿠폰을 받으세요.',
           '혜택 신청하기',
           '/events/welcome-coupon',
           3,
           true
       );