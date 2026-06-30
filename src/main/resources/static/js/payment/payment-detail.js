document.addEventListener('DOMContentLoaded', () => {
    const btnShowRefundForm = document.getElementById('btnShowRefundForm');
    const btnSubmitRefundAction = document.getElementById('btnSubmitRefundAction');
    const refundModal = document.getElementById('refundModal');
    const refundReason = document.getElementById('refundReason');
    const targetPaymentId = document.getElementById('targetPaymentId');

    if (btnShowRefundForm && refundModal) {
        btnShowRefundForm.addEventListener('click', () => {
            refundModal.style.display = 'flex';
            setTimeout(() => {
                refundReason.focus();
            }, 100);
        });
    }

    if (btnSubmitRefundAction) {
        btnSubmitRefundAction.addEventListener('click', function() {
            const paymentId = targetPaymentId.value;
            const reason = refundReason.value;

            if (!reason.trim()) {
                alert('취소 사유를 입력해주세요.');
                refundReason.focus();
                return;
            }

            const requestData = { paymentId: paymentId, reason: reason };

            this.disabled = true;
            this.innerText = '처리 중...';

            fetch(`/api/payments/${paymentId}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            })
            .then(response => {
                if (response.ok) {
                    alert('환불 처리가 성공적으로 완료되었습니다.');
                    window.close();
                    if (window.opener) window.opener.location.reload();
                } else {
                    return response.text().then(msg => { throw new Error(msg); });
                }
            })
            .catch(error => {
                alert('환불 실패: ' + error.message);
                this.disabled = false;
                this.innerText = '환불 확정하기';
            });
        });
    }
});