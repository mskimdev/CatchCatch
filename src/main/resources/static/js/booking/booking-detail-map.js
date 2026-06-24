/* global kakao */

document.addEventListener("DOMContentLoaded", () => {
    const mapContainer = document.getElementById("map");

    if (!mapContainer) return;

    kakao.maps.load(() => {
        const address = mapContainer.dataset.address;
        const venueName = mapContainer.dataset.venueName || "공연장";

        console.log("지도 주소:", address);
        console.log("공연장 이름:", venueName);

        const geocoder = new kakao.maps.services.Geocoder();
        const places = new kakao.maps.services.Places();

        const keyword = `${venueName} ${address}`;

        // 1차: 장소명 + 주소로 검색
        places.keywordSearch(keyword, function (result, status) {
            console.log("장소검색 키워드:", keyword);
            console.log("장소검색 결과:", result);
            console.log("장소검색 상태:", status);

            if (status === kakao.maps.services.Status.OK && result.length > 0) {
                drawMap(result[0].y, result[0].x, venueName);
                return;
            }

            // 2차: 공연장 이름만 검색
            places.keywordSearch(venueName, function (placeResult, placeStatus) {
                console.log("공연장명 검색 결과:", placeResult);
                console.log("공연장명 검색 상태:", placeStatus);

                if (placeStatus === kakao.maps.services.Status.OK && placeResult.length > 0) {
                    drawMap(placeResult[0].y, placeResult[0].x, venueName);
                    return;
                }

                // 3차: 주소 검색
                geocoder.addressSearch(address, function (addressResult, addressStatus) {
                    console.log("주소검색 결과:", addressResult);
                    console.log("주소검색 상태:", addressStatus);

                    if (addressStatus === kakao.maps.services.Status.OK && addressResult.length > 0) {
                        drawMap(addressResult[0].y, addressResult[0].x, venueName);
                        return;
                    }

                    mapContainer.innerHTML = "<p>지도를 불러오지 못했습니다.</p>";
                });
            });
        });

        function drawMap(lat, lng, name) {
            console.log("최종 지도 좌표:", lat, lng);

            const coords = new kakao.maps.LatLng(lat, lng);

            const map = new kakao.maps.Map(mapContainer, {
                center: coords,
                level: 3
            });

            const marker = new kakao.maps.Marker({
                map: map,
                position: coords
            });

            const infoWindow = new kakao.maps.InfoWindow({
                content: `<div style="padding:6px 10px;font-size:13px;">${name}</div>`
            });

            infoWindow.open(map, marker);
        }
    });
});