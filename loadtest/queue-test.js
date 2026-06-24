import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'http://localhost:8080';

// test_mskim.sql 기준 k6 부하테스트 전용 콘서트(id=11)의 회차(sessionId=10), 좌석 1000석(A등급).
// capacity = min(FIXED_SYSTEM_LIMIT=500, AVAILABLE 좌석 수) 이므로 이 회차의 capacity는 500명이다.
const SESSION_ID = 10;
const CONCERT_ID = 11;

// ENTERED된 VU가 0.5초 간격으로 한 명씩 좌석 확정->예약취소를 해서 자리를 비워준다.
// 이렇게 해소 속도를 일정하게 맞춰야, 어드민 대시보드에서 "1000명 -> 서서히 ENTERED 빠져나가는"
// 그래프 변화를 관찰할 수 있다 (전부 동시에 풀리면 그래프가 한 번에 뚝 떨어져버린다).
const RELEASE_INTERVAL_SECONDS = 0.1;

// test_mskim.sql로 생성된 k6 전용 좌석 1000석의 실제 DB ID 범위(환경마다 다를 수 있으므로
// 먼저 GET /booking/seat 응답의 window.CATCHCATCH_SEATS에서 확인 후 필요하면 값을 바꾼다).
const SEAT_ID_OFFSET = __ENV.SEAT_ID_OFFSET ? Number(__ENV.SEAT_ID_OFFSET) : 40;

export const options = {
    scenarios: {
        queue_entry: {
            executor: 'per-vu-iterations',
            vus: 1000,
            iterations: 1,
            // VU 1000명이 0.5초 간격으로 해소되면 마지막 VU는 약 500초(8분20초) 뒤에 끝난다.
            // 로그인/대기열 처리 여유까지 감안해 10분으로 잡는다.
            maxDuration: '10m',
        },
    },
};

// http.cookieJar()(인자 없음)는 VU 전역 jar라서 동시에 여러 유저를 다루면 섞인다.
// new http.CookieJar()로 매번 독립된 jar를 만들어 VU별 세션을 분리한다.
function login(userIndex) {
    const jar = new http.CookieJar();
    const res = http.post(
        `${BASE_URL}/login`,
        { email: `loadgen${userIndex}@test.com`, password: 'ssar1234' },
        { redirects: 0, jar }
    );

    check(res, {
        '로그인 성공(302)': (r) => r.status === 302,
    });

    return jar;
}

export default function () {
    const userIndex = __VU;
    const jar = login(userIndex);

    // /queue/wait?sessionId=... 진입이 QueueService.enter()를 호출한다.
    // 첫 등록 시 capacity 여유가 있으면 즉시 READY로 승격된다.
    const waitRes = http.get(`${BASE_URL}/queue/wait?sessionId=${SESSION_ID}`, { jar, redirects: 0 });

    check(waitRes, {
        '대기열 화면 진입 성공(200) 또는 이미 통과(302)': (r) => r.status === 200 || r.status === 302,
    });

    let status = null;
    let attempts = 0;
    const maxAttempts = 60;

    // /booking/seat로 이미 리다이렉트됐다면 이미 ENTERED 상태(매우 빠르게 승격된 경우)
    if (waitRes.status === 302) {
        status = 'ENTERED';
    }

    while (status !== 'READY' && status !== 'ENTERED' && attempts < maxAttempts) {
        sleep(1);
        const statusRes = http.get(`${BASE_URL}/api/queue/${SESSION_ID}/status`, { jar });

        if (statusRes.status === 200) {
            const body = JSON.parse(statusRes.body).body;
            status = body.status;
            if (attempts % 5 === 0) {
                console.log(`VU ${userIndex} status=${status} waitingAhead=${body.waitingAhead} queueNumber=${body.queueNumber}`);
            }
        }
        attempts++;
    }

    console.log(`VU ${userIndex} 최종 status=${status} (${attempts}초 소요)`);

    check(status, {
        'READY 또는 ENTERED로 승격됨': (s) => s === 'READY' || s === 'ENTERED',
    });

    if (status !== 'READY') {
        return;
    }

    // READY -> ENTERED 전이 (대기열 화면 JS가 자동으로 호출하는 것을 흉내냄)
    const enterBookingRes = http.post(`${BASE_URL}/api/queue/${SESSION_ID}/enter-booking`, '{}', {
        headers: { 'Content-Type': 'application/json' },
        jar,
    });

    check(enterBookingRes, {
        '좌석선택 입장 처리 성공': (r) => r.status === 200,
    });

    if (enterBookingRes.status !== 200) {
        return;
    }

    // 자기 차례(VU 인덱스)에 맞춰 0.5초 간격으로 좌석 확정 -> 예약취소를 수행해 자리를 비운다.
    // 동시에 풀리지 않도록 VU별로 출발 시각을 분산시킨다.
    sleep(userIndex * RELEASE_INTERVAL_SECONDS);

    // VU마다 다른 좌석을 골라야 비관적 락 충돌 없이 각자 확정할 수 있다.
    const seatId = userIndex + SEAT_ID_OFFSET;

    const completeRes = http.post(
        `${BASE_URL}/booking/complete`,
        {
            sessionId: String(SESSION_ID),
            concertId: String(CONCERT_ID),
            seatIds: String(seatId),
        },
        { jar, redirects: 0 }
    );

    const bookingIdMatch = completeRes.headers.Location
        ? completeRes.headers.Location.match(/bookingId=(\d+)/)
        : null;

    check(completeRes, {
        '좌석 확정 성공(302)': (r) => r.status === 302 && !!bookingIdMatch,
    });

    if (!bookingIdMatch) {
        console.error(`VU ${userIndex} 좌석 확정 실패 (seatId=${seatId}, status=${completeRes.status})`);
        return;
    }

    const bookingId = bookingIdMatch[1];

    // 결제는 진행하지 않고(PortOne 실연동 필요), 곧바로 예약취소해서 큐 슬롯을 해제한다.
    // BookingService.cancelPendingBooking()이 좌석 해제 + ENTERED 해제 + 다음 대기자 승격까지 처리한다.
    const cancelRes = http.post(`${BASE_URL}/booking/${bookingId}/cancel`, '{}', {
        headers: { 'Content-Type': 'application/json' },
        jar,
    });

    check(cancelRes, {
        '예약취소로 자리 해소 성공': (r) => r.status === 200,
    });

    console.log(`VU ${userIndex} bookingId=${bookingId} 좌석 해소 완료 (t=${(userIndex * RELEASE_INTERVAL_SECONDS).toFixed(1)}s)`);
}