document.addEventListener('DOMContentLoaded', () => {
    const qrBox = document.getElementById('ticket-qr');

    if (!qrBox) return;

    const token = qrBox.dataset.token;

    if (!token) {
        qrBox.innerHTML = '<p>입장권 정보를 찾을 수 없습니다.</p>';
        return;
    }

    const verifyUrl = `${location.origin}/staff/tickets/verify?token=${encodeURIComponent(token)}`;

    new QRCode(qrBox, {
        text: verifyUrl,
        width: 170,
        height: 170,
        correctLevel: QRCode.CorrectLevel.H
    });
});