# CatchCatch 🎫

콘서트 예매 시 발생하는 대규모 동시 접속을 안정적으로 처리하는 **실시간 대기열 기반 콘서트 티켓팅 플랫폼**입니다.

대기열 진입 → 좌석 선택 → 결제까지 이어지는 예매 전 과정을 다루며, 트래픽이 몰리는 오픈 시점에도 공정한 순서로 사용자를 입장시키는 것을 핵심 목표로 합니다.

## 주요 기능

### 🎟️ 실시간 대기열 (Queue)
- 대기열 진입 시 순번(`queueNumber`)을 발급하고 `WAITING → READY → ENTERED` 상태로 전환
- `QueueScheduler`가 주기적으로 앞쪽 대기자를 `READY`로 승격시키고, 만료된 입장 토큰을 정리
- `READY` 상태가 되면 한정 시간 동안 유효한 입장 토큰을 발급하여 좌석 선택 페이지로 진입
- K6 부하 테스트 스크립트로 대규모 동시 진입 시나리오 검증 (`loadtest/queue-test.js`, 5000 VU)

### 🪑 예매 / 좌석 (Booking / Seat)
- 공연 - 회차 - 좌석 구조로 데이터 모델링, 좌석 등급(VIP/R/S/A 등)별 가격 설정
- 좌석 상태 관리: `AVAILABLE → HELD(선점) → SOLD(판매완료)`
- 예매 상태 관리: `PENDING(결제 대기) → PAID(결제 완료)`
- 관리자 페이지에서 공연장 도면(JSON)을 기반으로 회차별 좌석을 대량 생성하는 파이프라인 제공

### 💳 결제 / 환불 (Payment / Refund)
- [포트원(PortOne)](https://portone.io/) 연동으로 카드, 카카오페이, 토스페이, 가상계좌 결제 지원
- 결제 승인 시 포트원 응답값과 서버 측 결제 금액을 검증하여 위변조 방지
- 예매 수수료 자동 계산 및 포인트 차감/적립 연동
- 예매 취소 시 환불 처리

### 📊 관리자 대시보드 (Admin)
- 기간별 매출/예매 통계, 공연별 좌석 판매율(등급별) 조회
- 회차별 실시간 대기열 현황 모니터링
- 공연/회차/공지사항/배너/FAQ 관리
- 시스템 에러 로그 수집 및 조회 (`systemlog`, `InMemoryErrorLogAppender`)

### 🔔 알림 / AI 챗봇
- SSE(Server-Sent Events) 기반 실시간 알림
- `NotificationDispatcher`가 1:1 문의 답변, 예매 완료/취소, 포인트 적립/만료, 관심 공연 예매 오픈, 1:1 채팅 답변 등 도메인 이벤트별 알림을 중앙에서 조율
- 인앱(`InAppSender`) / 이메일 / SMS 채널을 동일한 `MessageSender` 인터페이스로 통일
- K6 부하 테스트로 알림 발송~수신 흐름 검증 (`loadtest/notification-test.js`)
- Spring AI + Claude(Anthropic) 연동 인앱 챗봇 상담 기능

### 👤 사용자 / 인증
- 카카오 / 구글 소셜 로그인(OAuth)
- 포인트 적립 및 사용 내역 관리
- 이메일 인증, SMS 인증(CoolSMS)

## 기술 스택

| 구분 | 내용 |
|---|---|
| Language | Java 21 |
| Framework | Spring Boot 3.5.14 |
| Data Access | Spring Data JPA, QueryDSL 5.0 |
| Database | MySQL (운영), H2 (테스트/로컬) |
| View | Mustache |
| 실시간 통신 | WebSocket, SSE |
| AI | Spring AI + Anthropic Claude |
| 결제 | PortOne (포트원) |
| 인증 | Kakao / Google OAuth |
| 메일/SMS | Spring Mail, CoolSMS(Solapi) |
| API 문서 | springdoc-openapi (Swagger UI) |
| 부하 테스트 | k6 |

## 프로젝트 구조

```
src/main/java/com/catchcatch/ticket
├── admin            # 관리자 대시보드, 통계
├── aichat           # AI 챗봇 (Spring AI + Claude)
├── booking          # 예매 처리
├── chat             # 채팅
├── concert          # 공연 정보
├── concertlike      # 공연 좋아요
├── core             # 공통 설정, 예외 처리, 유틸리티
├── event            # 이벤트/배너
├── eventhistory     # 이벤트 히스토리
├── faq              # FAQ
├── information      # 공연 부가 정보
├── inquiry          # 문의
├── notice           # 공지사항
├── notification     # 실시간 알림 (SSE)
├── oauth            # 소셜 로그인 연동
├── payment          # 결제
├── pointHistory     # 포인트 적립/사용 내역
├── queue            # 실시간 대기열
├── refund           # 환불
├── seat / seatmap   # 좌석, 좌석 배치도
├── session          # 공연 회차
├── systemlog        # 시스템 에러 로그
├── user             # 사용자
└── venue            # 공연장
```

## 실행 방법

### 1. 환경변수 설정

프로젝트 루트의 `.env.example`을 참고하여 `.env` 파일을 생성하고 값을 채워주세요.

```bash
cp .env.example .env
```

필요한 주요 키:
- `KAKAO_CLIENT_ID` / `KAKAO_CLIENT_SECRET` — 카카오 소셜 로그인
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — 구글 소셜 로그인
- `ANTHROPIC_API_KEY` — AI 챗봇(Claude) 연동
- `PORTONE_STORE_ID` / `PORTONE_API_SECRET` / `PORTONE_*_CHANNEL_KEY` — 결제 연동
- `SOL_API_KEY` / `SOL_API_SECRET` / `SOL_SENDER` — SMS 발송(CoolSMS)
- `EMAIL_SENDER` / `GOOGLE_APP_KEY` — 이메일 인증 발송
- `CATCHCATCH_KEY` — 소셜 가입자 비밀번호 설정 등에 사용하는 자체 암호화 키

### 2. 애플리케이션 실행

```bash
./gradlew bootRun
```

기본적으로 `local` 프로필로 실행되며, 서버는 `http://localhost:8080` 에서 동작합니다.

- Swagger UI: `http://localhost:8080/swagger-ui.html`
- H2 콘솔(로컬 프로필 사용 시): `http://localhost:8080/h2-console`

### 3. 대기열 부하 테스트

k6는 npm 패키지가 아닌 별도 CLI 도구이므로 OS 패키지 매니저로 설치해야 합니다.

```bash
# macOS
brew install k6

# Windows (Chocolatey)
choco install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

설치 없이 Docker로 바로 실행할 수도 있습니다 (macOS는 `BASE_URL`을 `http://host.docker.internal:8080`으로 변경 필요).

```bash
docker run --rm -i --network host grafana/k6 run - < loadtest/queue-test.js
```

설치 후 실행:

```bash
k6 run loadtest/queue-test.js
```

5000명의 가상 사용자가 동시에 로그인 후 대기열에 진입하여 `READY` 상태로 승격되는 과정을 검증합니다.

### 4. 알림 발송 부하 테스트

유저/관리자 세션을 분리해 1:1 문의 답변, 포인트 적립, 관심 공연 예매 오픈 알림이 실제로 발송되는지 끝까지 검증합니다.

```bash
k6 run loadtest/notification-test.js
```

유저(`ssar@naver.com`)가 문의를 등록하고 이벤트에 참여하는 동안, 관리자(`admin@catchcatch.com`)가 답변을 등록하고 공연 상태를 변경한 뒤 `/api/notifications`로 알림 수신 여부를 확인합니다. 결제·환불(PortOne 실연동 필요)과 1:1 채팅 답변(STOMP 기반)은 순수 HTTP 시나리오로 다루기 어려워 검증 범위에서 제외했습니다.

## 로깅

`logback-spring.xml` 설정을 통해 운영 로그를 관리하며, `InMemoryErrorLogAppender`로 수집된 에러 로그는 관리자 대시보드에서 조회할 수 있습니다.
