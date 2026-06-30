// 결제 도중 이탈했다가 돌아왔을 때, 만료되지 않은 예매가 있으면 결제 재개를 안내한다.
document.addEventListener('DOMContentLoaded', async function () {
  if (location.pathname.startsWith('/booking/payment')) return;
  if (sessionStorage.getItem('resumePaymentDismissed') === '1') return;

  const { res, data } = await apiGet('/booking/pending-payment');
  if (!res || !res.ok || !data || data.status !== 200 || !data.body) return;

  const pending = data.body;
  sessionStorage.setItem('resumePaymentDismissed', '1');

  CcUI.confirm({
    title: '진행 중인 결제가 있어요',
    text: '<strong>' + pending.concertTitle + '</strong> 예매가 결제 완료 전 상태입니다.<br>이어서 결제하시겠습니까?',
    confirmText: '이어서 결제하기',
    cancelText: '나중에',
    onConfirm: () => {
      location.href = '/booking/payment?bookingId=' + pending.bookingId;
    },
  });
});
