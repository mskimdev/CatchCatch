/* global kakao */

document.addEventListener("DOMContentLoaded", () => {
    const mapContainer = document.getElementById("map");

    if (!mapContainer) return;

    if (!window.kakao || !window.kakao.maps) {
        console.error("카카오 지도 SDK가 로딩되지 않았습니다.");
        mapContainer.innerHTML = "<p>카카오 지도 SDK를 불러오지 못했습니다.</p>";
        return;
    }

    kakao.maps.load(() => {
        const address = mapContainer.dataset.address;
        const venueName = mapContainer.dataset.venueName || "공연장";

        console.log("지도 주소:", address);
        console.log("공연장 이름:", venueName);

        const geocoder = new kakao.maps.services.Geocoder();

        geocoder.addressSearch(address, function (result, status) {
            console.log("주소검색 결과:", result);
            console.log("주소검색 상태:", status);

            if (status !== kakao.maps.services.Status.OK || result.length === 0) {
                mapContainer.innerHTML = "<p>지도를 불러오지 못했습니다.</p>";
                return;
            }

            const lat = result[0].y;
            const lng = result[0].x;

            const coords = new kakao.maps.LatLng(lat, lng);

            const mapOption = {
                center: coords,
                level: 3
            };

            const map = new kakao.maps.Map(mapContainer, mapOption);

            const marker = new kakao.maps.Marker({
                map: map,
                position: coords
            });

            const infoWindow = new kakao.maps.InfoWindow({
                content: `<div style="padding:6px;font-size:13px;">${venueName}</div>`
            });

            infoWindow.open(map, marker);
        });
    });
});