CatchCatch SeatMap 예제

- 작업용 도면 파일은 /temp/seatmap/seat/ 안에 둡니다.
- 공연장 등록 select에서 사용할 좌석 JSON은 /temp/seatmap/seats/seat-seatmap-seats.json 하나만 사용합니다.
- 좌석 ID 규칙: 층-구역-행-렬-좌석등급-상태
- 예시: 1-VIP_A-A-1-VIP-AVAILABLE
- 모든 좌석 상태는 AVAILABLE 입니다.
- 좌석 렌더링은 행(A,B,C...) 기준으로 묶고, 각 행 안에서 렬(1,2,3...) 순서로 정사각형 배치합니다.
