document.addEventListener('DOMContentLoaded', () => {
    console.log('booking-detail.js 실행됨');

    // 1. 결제 상세보기 팝업
    const paymentDetailBtn = document.querySelector('.js-payment-detail');

    if (paymentDetailBtn) {
        paymentDetailBtn.addEventListener('click', () => {
            const url = paymentDetailBtn.dataset.paymentUrl;

            if (!url) {
                alert('결제 상세내역을 확인할 수 없습니다.');
                return;
            }

            window.open(
                url,
                'paymentDetail',
                'width=760,height=850,top=80,left=350,scrollbars=yes,resizable=yes'
            );
        });
    }

    // 2. 예매 취소
    const bookingCancelBtn = document.querySelector('.js-booking-cancel');

    if (bookingCancelBtn) {
        bookingCancelBtn.addEventListener('click', async () => {
            const paymentId = bookingCancelBtn.dataset.paymentId;

            if (!paymentId) {
                alert('결제 정보를 찾을 수 없습니다.');
                return;
            }

            const ok = confirm('정말 예매를 취소하시겠습니까?');
            if (!ok) return;

            try {
                const response = await fetch(`/api/payments/${paymentId}/cancel`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        reason: '사용자 예매 취소'
                    })
                });

                if (!response.ok) {
                    const message = await response.text();
                    alert(message);
                    return;
                }

                alert('예매가 취소되었습니다.');
                location.reload();
            } catch (e) {
                console.error('예매 취소 실패:', e);
                alert('예매 취소 중 오류가 발생했습니다.');
            }
        });
    }

    // 3. 카드 접기 / 펼치기
    const foldableCards = document.querySelectorAll('.cc-detail-card--foldable');

    console.log('접기 가능한 카드 개수:', foldableCards.length);

    foldableCards.forEach((card) => {
        const toggle = card.querySelector('.js-detail-toggle');
        const body = card.querySelector('.cc-detail-section-body');

        if (!toggle || !body) return;

        body.style.maxHeight = body.scrollHeight + 'px';

        toggle.addEventListener('click', () => {
            const isCollapsed = card.classList.contains('is-collapsed');

            if (isCollapsed) {
                card.classList.remove('is-collapsed');
                body.style.maxHeight = body.scrollHeight + 'px';
            } else {
                card.classList.add('is-collapsed');
                body.style.maxHeight = '0px';
            }
        });
    });
});