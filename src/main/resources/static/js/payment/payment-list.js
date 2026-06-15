function openPaymentDetail(paymentId) {
  if (!paymentId) {
    alert('결제 정보를 찾을 수 없습니다.');
    return;
  }
  const width = 760;
  const height = 760;
  const left = Math.round((window.screen.width - width) / 2);
  const top = Math.round((window.screen.height - height) / 2);
  window.open(
    '/users/payments/' + paymentId,
    'paymentDetail_' + paymentId,
    'width=' + width + ',height=' + height + ',left=' + left + ',top=' + top + ',scrollbars=yes,resizable=yes'
  );
}