package com.catchcatch.ticket.concert;

import lombok.Data;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

public class ConcertResponse {

    @Data
    public static class ListDTO {
        private Integer id;
        private String posterUrl;
        private String category; // "콘서트", "뮤지컬" 등
        private String title;

        // 프론트엔드가 요구하는 '2026.04.11 - 2026.04.12' 형태의 텍스트
        private String dateRange;

        private String venueName;
        private String region; // "인천", "서울" 등

        // TODO 평점 및 리뷰 수 DB 테이블(Review 등)
        private Double rating;
        private Integer reviewCount;
        private String badge; // "단독판매", "매진임박" 등

        public ListDTO(Concert concert) {
            this.id = concert.getId();
            this.posterUrl = concert.getPosterUrl();
            this.category = "콘서트"; // 추후 DB 컬럼 추가 필요
            this.title = concert.getTitle();
            this.venueName = concert.getVenue().getName();

            // 공연장의 전체 주소(address)에서 앞 2글자(지역명)만 추출
            // 예: "인천광역시 중구..." -> "인천"
            if (concert.getVenue().getAddress() != null && concert.getVenue().getAddress().length() >= 2) {
                this.region = concert.getVenue().getAddress().substring(0, 2);
            } else {
                this.region = "미상";
            }

            // 날짜 범위 계산 로직 (시작일 ~ 종료일)
            List<LocalDate> dates = concert.getSessions().stream()
                    .map(session -> session.getSessionDate())
                    .sorted() // 날짜순 정렬
                    .collect(Collectors.toList());

            if (!dates.isEmpty()) {
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy.MM.dd");
                String startDate = dates.get(0).format(formatter);
                String endDate = dates.get(dates.size() - 1).format(formatter);

                if (startDate.equals(endDate)) {
                    this.dateRange = startDate; // 하루짜리 공연
                } else {
                    this.dateRange = startDate + " - " + endDate; // 여러 날짜 공연
                }
            } else {
                this.dateRange = "일정 미정";
            }

            //TODO 더미 데이터 (추후 Review 도메인이 생기면 연동)
            this.rating = 4.9;
            this.reviewCount = 2765;
            this.badge = "예매가능"; // Concert의 Status 값에 따라 변경 가능
        }
    } // end of ListDTO

    @Data
    public static class BannerDTO {
        private String imageUrl;     // 배경 이미지
        private String eyebrow;      // 작은 부제목 (예: "단독 판매")
        private String title;        // 큰 제목
        private String highlight;    // 강조할 단어
        private String description;  // 설명
        private String linkUrl;      // 클릭 시 이동할 주소 (/concerts/1)
        private String buttonText;   // 버튼 텍스트 (예: "예매하기")

        // TODO Banner 테이블 생성 시 연결 예정
        public BannerDTO(String imageUrl, String eyebrow, String title, String highlight, String description, Integer concertId) {
            this.imageUrl = imageUrl;
            this.eyebrow = eyebrow;
            this.title = title;
            this.highlight = highlight;
            this.description = description;
            this.linkUrl = "/concerts/" + concertId;
            this.buttonText = "예매하기";
        }
    }// end of BannerDTO
}