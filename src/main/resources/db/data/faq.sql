================
--  faq_tb
-- ================
INSERT INTO faq_tb (category, question, answer, is_visible, created_at)
VALUES ('MEMBER', '회원가입은 어떻게 하나요?', '상단의 회원가입 버튼을 클릭한 뒤 필요한 정보를 입력하면 회원가입할 수 있습니다.', true, CURRENT_TIMESTAMP),
       ('MEMBER', '카카오 계정으로 로그인할 수 있나요?', '네, 로그인 페이지에서 카카오 로그인 버튼을 통해 간편하게 로그인할 수 있습니다.', true, CURRENT_TIMESTAMP),
       ('MEMBER', '회원 정보를 수정할 수 있나요?', '로그인 후 마이페이지에서 이름, 비밀번호, 프로필 정보를 수정할 수 있습니다.', true, CURRENT_TIMESTAMP),

       ('BOOKING', '공연 예매는 어떻게 하나요?', '공연 목록에서 원하는 공연을 선택한 뒤 회차와 좌석을 선택하고 결제를 완료하면 예매가 완료됩니다.', true,
        CURRENT_TIMESTAMP),
       ('BOOKING', '좌석 선택 후 얼마나 유지되나요?', '선택한 좌석은 일정 시간 동안 임시 선점되며, 제한 시간 안에 결제하지 않으면 자동으로 해제됩니다.', true,
        CURRENT_TIMESTAMP),
       ('BOOKING', '예매 내역은 어디서 확인하나요?', '로그인 후 마이페이지의 예매 내역에서 확인할 수 있습니다.', true, CURRENT_TIMESTAMP),

       ('PAYMENT', '어떤 결제수단을 사용할 수 있나요?', '카드 결제, 카카오페이, 토스페이 등 지원되는 결제수단을 사용할 수 있습니다.', true, CURRENT_TIMESTAMP),
       ('PAYMENT', '결제 중 오류가 발생했어요.', '결제 금액이 실제로 차감되었는지 확인한 뒤, 문제가 지속되면 고객센터로 문의해주세요.', true, CURRENT_TIMESTAMP),
       ('PAYMENT', '결제 완료 후 예매가 보이지 않아요.', '결제 승인 처리에 시간이 걸릴 수 있습니다. 잠시 후 마이페이지에서 다시 확인해주세요.', true, CURRENT_TIMESTAMP),

       ('CANCEL_REFUND', '예매 취소는 어떻게 하나요?', '마이페이지의 예매 내역에서 취소 가능한 예매 건을 선택해 취소할 수 있습니다.', true, CURRENT_TIMESTAMP),
       ('CANCEL_REFUND', '환불은 언제 처리되나요?', '환불은 결제수단과 카드사 정책에 따라 보통 3~7영업일 정도 소요될 수 있습니다.', true, CURRENT_TIMESTAMP),
       ('CANCEL_REFUND', '공연 당일에도 취소할 수 있나요?', '공연 당일 취소 가능 여부는 공연별 취소 및 환불 정책에 따라 다를 수 있습니다.', true,
        CURRENT_TIMESTAMP),

       ('EVENT', '이벤트는 어디서 확인하나요?', '홈 화면 또는 이벤트 페이지에서 진행 중인 이벤트와 혜택을 확인할 수 있습니다.', true, CURRENT_TIMESTAMP),
       ('EVENT', '쿠폰은 어떻게 사용하나요?', '결제 화면에서 보유한 쿠폰을 선택하면 할인 금액이 적용됩니다.', true, CURRENT_TIMESTAMP),
       ('EVENT', '포인트 적립은 어떻게 되나요?', '예매 완료 시 결제 금액 기준으로 포인트가 적립될 수 있습니다.', true, CURRENT_TIMESTAMP),

       ('SERVICE', '고객센터 운영 시간은 언제인가요?', '고객센터 운영 시간은 평일 10:00부터 18:00까지입니다.', true, CURRENT_TIMESTAMP),
       ('SERVICE', '공지사항은 어디에서 확인하나요?', '상단 메뉴의 공지사항 페이지에서 서비스 관련 안내를 확인할 수 있습니다.', true, CURRENT_TIMESTAMP),
       ('SERVICE', '사이트 이용 중 오류가 발생했어요.', '브라우저 새로고침 후에도 문제가 지속되면 고객센터로 문의해주세요.', true, CURRENT_TIMESTAMP);