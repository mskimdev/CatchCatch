document.addEventListener('DOMContentLoaded', () => {
    const paymentDetailBtn = document.querySelector('.js-payment-detail');

    if (!paymentDetailBtn) {
        return;
    }

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
});