import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'http://localhost:8080';

// dummy-mysql.sql 기준 k6 전용 콘서트 A: concert_id=10, session_id=16
// H2(test_mskim.sql) 기준이면 CONCERT_ID=11, SESSION_ID=10
const CONCERT_ID = 10;
const SESSION_ID = 16;

// 모든 VU가 정확히 같은 좌석 1개를 동시에 선택하도록 고정한다.
// (test_mskim.sql에서 SYSTEM_RANGE(1,1000)로 생성된 좌석 중 임의의 ID. 환경마다 ID가
//  다를 수 있으니 먼저 GET /booking/seat로 실제 ID를 확인해서 바꿔도 된다.)
const TARGET_SEAT_ID = __ENV.SEAT_ID ? Number(__ENV.SEAT_ID) : 1;

export const options = {
    scenarios: {
        seat_concurrency: {
            executor: 'per-vu-iterations',
            vus: 50,
            iterations: 1,
            maxDuration: '1m',
        },
    },
};

function login(userIndex) {
    const jar = new http.CookieJar();
    const res = http.post(
        `${BASE_URL}/login`,
        { email: `loadgen${userIndex}@test.com`, password: 'ssar1234' },
        { redirects: 0, jar }
    );

    check(res, { '로그인 성공(302)': (r) => r.status === 302 });
    return jar;
}

// 대기열 capacity(500명) 안에서만 동작하므로, VU 수가 적은 이 테스트는
// 거의 항상 즉시 ENTERED까지 도달한다. 혹시 WAITING이면 잠깐 폴링한다.
function enterBookingFlow(jar, userIndex) {
    http.get(`${BASE_URL}/queue/wait?sessionId=${SESSION_ID}`, { jar, redirects: 0 });

    let status = null;
    let attempts = 0;

    while (status !== 'READY' && status !== 'ENTERED' && attempts < 30) {
        const statusRes = http.get(`${BASE_URL}/api/queue/${SESSION_ID}/status`, { jar });
        if (statusRes.status === 200) {
            status = JSON.parse(statusRes.body).body.status;
        }
        if (status === 'READY' || status === 'ENTERED') break;
        sleep(1);
        attempts++;
    }

    if (status === 'READY') {
        http.post(`${BASE_URL}/api/queue/${SESSION_ID}/enter-booking`, '{}', {
            headers: { 'Content-Type': 'application/json' },
            jar,
        });
        status = 'ENTERED';
    }

    return status === 'ENTERED';
}

export default function () {
    const userIndex = __VU;
    const jar = login(userIndex);

    const entered = enterBookingFlow(jar, userIndex);
    check(entered, { '대기열 통과(ENTERED)': (v) => v });

    if (!entered) {
        console.error(`VU ${userIndex} 대기열 통과 실패`);
        return;
    }

    // 모든 VU가 같은 TARGET_SEAT_ID 하나를 동시에 선택해 좌석 확정을 시도한다.
    // 비관적 락(findAllByIdInAndSessionIdForUpdate) 덕분에 단 1명만 성공해야 한다.
    const completeRes = http.post(
        `${BASE_URL}/booking/complete`,
        {
            sessionId: String(SESSION_ID),
            concertId: String(CONCERT_ID),
            seatIds: String(TARGET_SEAT_ID),
        },
        { jar, redirects: 0 }
    );

    const succeeded = completeRes.status === 302 && completeRes.headers.Location && completeRes.headers.Location.includes('/booking/payment');

    if (succeeded) {
        console.log(`VU ${userIndex} 좌석 확정 성공 -> ${completeRes.headers.Location}`);

        // 다음 테스트 반복을 위해 곧바로 예약취소해서 좌석을 비워둔다.
        const bookingIdMatch = completeRes.headers.Location.match(/bookingId=(\d+)/);
        if (bookingIdMatch) {
            const bookingId = bookingIdMatch[1];
            const cancelRes = http.post(`${BASE_URL}/booking/${bookingId}/cancel`, '{}', {
                headers: { 'Content-Type': 'application/json' },
                jar,
            });
            check(cancelRes, { '테스트 정리용 예약취소 성공': (r) => r.status === 200 });
        }
    } else {
        console.log(`VU ${userIndex} 좌석 확정 실패 (status=${completeRes.status}) - 이미 선점된 좌석`);
    }

    check(completeRes, {
        '좌석 확정 응답을 받음(성공 302 또는 실패 400)': (r) => r.status === 302 || r.status === 400,
    });
}