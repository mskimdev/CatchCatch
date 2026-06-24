document.addEventListener('DOMContentLoaded', () => {
    console.log('booking.js 로드됨');

    const bookingItems = document.querySelectorAll('.js-booking-detail');
    console.log('예매 카드 개수:', bookingItems.length);

    bookingItems.forEach((item) => {
        item.addEventListener('click', () => {
            const url = item.dataset.detailUrl;
            console.log('카드 클릭됨:', url);

            if (!url) {
                alert('상세 페이지 주소가 없습니다.');
                return;
            }

            window.open(
                url,
                '_blank',
                'width=780,height=860,top=60,left=330,scrollbars=yes,resizable=yes'
            );
        });
    });
});