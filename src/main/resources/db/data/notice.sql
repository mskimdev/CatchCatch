-- ================
--  notice_tb
-- ================
INSERT INTO notice_tb
(title, content, user_id, is_pinned, view_count, created_at, updated_at)
VALUES
    ('서비스 이용약관 개정 안내',
     '<p>안녕하세요, CatchCatch입니다.</p><p>2026년 7월 1일부터 서비스 이용약관이 일부 개정됩니다.</p><h3>주요 변경 사항</h3><ol><li>개인정보 수집 항목 변경</li><li>서비스 이용 제한 조항 명확화</li><li>분쟁 해결 절차 추가</li></ol><p>자세한 내용은 이용약관 전문을 확인해주세요. 감사합니다.</p>',
     1, true, 1520, DATEADD('DAY', -30, NOW()), DATEADD('DAY', -30, NOW())),

    ('티켓 예매 시스템 정기 점검 안내 (6/15)',
     '<p>안녕하세요, CatchCatch입니다.</p><p>서비스 품질 향상을 위한 정기 시스템 점검이 예정되어 있습니다.</p><ul><li><strong>점검 일시:</strong> 2026년 6월 15일(월) 02:00 ~ 06:00 (4시간)</li><li><strong>점검 내용:</strong> 서버 인프라 업그레이드 및 예매 시스템 최적화</li></ul><p>점검 시간 중에는 모든 서비스 이용이 불가합니다. 이용에 불편을 드려 죄송합니다.</p>',
     1, true, 834, DATEADD('DAY', -10, NOW()), DATEADD('DAY', -10, NOW())),

    ('취소/환불 정책 변경 안내',
     '<p>안녕하세요, CatchCatch입니다.</p><p>2026년 6월 1일부터 취소/환불 정책이 아래와 같이 변경됩니다.</p><ul><li><strong>변경 전:</strong> 공연일 7일 전까지 100% 환불</li><li><strong>변경 후:</strong> 공연일 10일 전까지 100% 환불 / 9~7일 전 90% 환불</li></ul><p>보다 나은 서비스를 제공하기 위한 조치이니 양해 부탁드립니다.</p>',
     1, false, 672, DATEADD('DAY', -45, NOW()), DATEADD('DAY', -45, NOW())),

    ('2026년 여름 특가 예매 이벤트 안내',
     '<p>안녕하세요, CatchCatch입니다.</p><p>무더운 여름, 특별한 공연 관람 기회를 드립니다!</p><ul><li><strong>이벤트 기간:</strong> 2026년 6월 20일 ~ 7월 31일</li><li><strong>혜택:</strong> 7월 공연 전 좌석 10% 할인 + 음료 쿠폰 증정</li><li><strong>대상:</strong> CatchCatch 회원 전체</li></ul><p>지금 바로 예매하고 시원한 여름을 즐기세요!</p>',
     6, false, 441, DATEADD('DAY', -5, NOW()), DATEADD('DAY', -5, NOW())),

    ('앱 v2.3.0 업데이트 안내',
     '<p>안녕하세요, CatchCatch입니다.</p><p>CatchCatch 앱이 v2.3.0으로 업데이트 되었습니다.</p><h3>주요 변경 사항</h3><ul><li>좌석 선택 UI 개선</li><li>결제 속도 향상</li><li>예매 내역 화면 디자인 개편</li><li>버그 수정 다수</li></ul><p>최신 버전으로 업데이트하여 더욱 편리한 서비스를 경험하세요.</p>',
     6, false, 298, DATEADD('DAY', -2, NOW()), DATEADD('DAY', -2, NOW())),

    ('개인정보 처리방침 개정 안내',
     '<p>안녕하세요, CatchCatch입니다.</p><p>개인정보 보호법 개정에 따라 개인정보 처리방침이 일부 변경됩니다.</p><ul><li><strong>시행일:</strong> 2026년 8월 1일</li><li><strong>주요 변경 내용:</strong><ul><li>개인정보 보유 기간 명확화</li><li>제3자 제공 항목 조정</li></ul></li></ul><p>변경된 처리방침은 홈페이지에서 확인하실 수 있습니다.</p>',
     1, false, 187, DATEADD('DAY', -60, NOW()), DATEADD('DAY', -60, NOW()));
