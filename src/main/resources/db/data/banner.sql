-- ====================================================================
-- 메인 홈페이지 히어로 배너 (banner_tb) 초기화 데이터
-- YES24 스타일 3종 배너
-- show_text = false → 텍스트 오버레이/그라데이션 없이 이미지만 노출
-- ====================================================================

-- 1번 배너: 전주얼티밋뮤직페스티벌
INSERT INTO banner_tb (image_url, eyebrow, title, highlight, description, button_text, link_url, display_order, is_active, show_text)
VALUES (
           '/images/banners/banner-jeonju-festival.jpg',
           NULL, NULL, NULL, NULL, NULL,
           '/concerts/12',
           1,
           true,
           false
       );

-- 2번 배너: 뮤지컬 베토벤
INSERT INTO banner_tb (image_url, eyebrow, title, highlight, description, button_text, link_url, display_order, is_active, show_text)
VALUES (
           '/images/banners/banner-beethoven.jpg',
           NULL, NULL, NULL, NULL, NULL,
           '/concerts/2',
           2,
           true,
           false
       );

-- 3번 배너: 인천 펜타포트 락 페스티벌
INSERT INTO banner_tb (image_url, eyebrow, title, highlight, description, button_text, link_url, display_order, is_active, show_text)
VALUES (
           '/images/banners/banner-pentaport.png',
           NULL, NULL, NULL, NULL, NULL,
           '/concerts/13',
           3,
           true,
           false
       );
