-- ================
--  inquiry_tb
-- ================
INSERT INTO inquiry_tb
(title, content, user_id, category, status, is_public, notify_email, notify_sms, reply, created_at)
VALUES
    -- RESOLVED: 답변 완료
    ('예매한 티켓을 취소하고 싶은데 방법을 모르겠어요',
     '안녕하세요. 아이유 콘서트 티켓을 예매했는데 사정이 생겨서 취소하고 싶습니다. 취소는 어떻게 하면 되나요? 환불은 얼마나 걸리나요?',
     2, 'TICKET', 'RESOLVED', true, true, false,
     '안녕하세요, CatchCatch 고객센터입니다. 마이페이지 > 예매내역에서 해당 예매 건을 선택하신 후 취소 버튼을 눌러주시면 됩니다. 환불은 영업일 기준 3~5일 내 처리됩니다. 감사합니다.',
     DATEADD('DAY', -14, NOW())),

    ('결제는 됐는데 예매 완료 문자가 안 왔어요',
     '세븐틴 콘서트 티켓을 카카오페이로 결제했는데 결제 완료 문자는 왔는데 예매 완료 확인 문자가 오지 않았습니다. 예매가 정상적으로 된 건지 확인 부탁드립니다.',
     3, 'PAYMENT', 'RESOLVED', false, true, true,
     '안녕하세요, CatchCatch 고객센터입니다. 확인 결과 예매가 정상적으로 완료되었습니다. 문자 발송 지연이 있었던 점 사과드립니다. 마이페이지 > 예매내역에서 예매 내역을 확인하실 수 있습니다.',
     DATEADD('DAY', -7, NOW())),

    ('카카오 로그인 연동 해제하고 싶어요',
     '카카오 소셜 로그인으로 가입했는데 카카오 연동을 해제하고 일반 계정으로 전환하고 싶습니다. 가능한가요?',
     5, 'USER', 'RESOLVED', false, false, false,
     '안녕하세요, CatchCatch 고객센터입니다. 현재 소셜 로그인 계정의 일반 계정 전환은 지원하지 않습니다. 불편하시더라도 카카오 계정을 유지하거나 새 계정으로 가입해 주시기 바랍니다. 해당 기능은 추후 업데이트 예정입니다.',
     DATEADD('DAY', -20, NOW())),

    -- PENDING: 답변 대기
    ('환불 신청 후 2주가 지났는데 아직 환불이 안 됐어요',
     '박보검 팬미팅 티켓을 취소했는데 환불 신청한 지 2주가 넘었습니다. 카드사에 문의하니 환불 요청이 아직 안 들어왔다고 하네요. 빠른 처리 부탁드립니다. 예매번호: BK-20250528-0004',
     4, 'PAYMENT', 'PENDING', false, true, true, NULL,
     DATEADD('DAY', -3, NOW())),

    ('공연 당일 티켓을 분실했습니다',
     '오늘 공연에 가려고 하는데 모바일 티켓 화면을 캡처해 놓은 게 지워졌습니다. 재발급이 가능한가요? 예매번호는 BK-20250528-0001입니다.',
     2, 'TICKET', 'PENDING', false, true, false, NULL,
     DATEADD('HOUR', -5, NOW())),

    ('결제 수단을 변경하고 싶습니다',
     '예매 후 결제 수단을 카카오페이에서 신용카드로 변경하고 싶은데 가능한가요? 아직 결제 전 상태입니다.',
     3, 'PAYMENT', 'PENDING', true, false, false, NULL,
     DATEADD('HOUR', -2, NOW())),

    ('회원 탈퇴 후 데이터는 어떻게 되나요',
     '회원 탈퇴를 고려 중인데 탈퇴 후 예매 내역이나 개인정보는 어떻게 처리되는지 궁금합니다.',
     4, 'USER', 'PENDING', true, true, false, NULL,
     DATEADD('HOUR', -1, NOW())),

    -- CANCELLED: 취소된 문의
    ('티켓 좌석 변경이 가능한가요',
     '예매한 좌석을 더 좋은 자리로 변경하고 싶습니다. 가능한지 궁금합니다.',
     5, 'TICKET', 'CANCELLED', false, false, false, NULL,
     DATEADD('DAY', -10, NOW())),

    ('기타 서비스 이용 중 오류가 발생했습니다',
     '예매 화면에서 좌석 선택 후 다음 단계로 넘어가지 않는 오류가 발생했습니다. 브라우저 새로고침 후 해결됐습니다. 참고로 제보 드립니다.',
     2, 'ETC', 'CANCELLED', false, false, false, NULL,
     DATEADD('DAY', -25, NOW()));
