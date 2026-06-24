import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'http://localhost:8080';
const LOADTEST_API_KEY = '6d636376d7ef1fb6392a714f533e986103f0f19ba53c91d5';

// test_mskim.sql 기준:
//   콘서트A 회차 sessionId=10 (VU 1~1000)
//   콘서트B 회차 sessionId=11 (VU 1001~2000)
// capacity = min(INFRA_CONCURRENCY_LIMIT=500, AVAILABLE 좌석 수) = 500명씩.
const SESSION_ID_A = 10;
const SESSION_ID_B = 11;

// 콘서트A/B의 concert_id (test_mskim.sql 삽입 순서 기준)
const CONCERT_ID_A = 11;
const CONCERT_ID_B = 12;

export const options = {
    scenarios: {
        queue_entry: {
            executor: 'per-vu-iterations',
            vus: 2000,
            iterations: 1,
            maxDuration: '20m',
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

// 좌석 선택 화면에서 AVAILABLE 좌석 목록을 조회해 VU 인덱스 기반으로 하나 선택
// VU가 서로 다른 좌석을 고르도록 vuSlot(0~999)으로 분산
function pickSeatId(jar, sessionId, vuSlot) {
    // /booking/seat 화면은 세션에 bookingConcertId/bookingSessionId가 필요 — start 먼저 호출
    const concertId = sessionId === SESSION_ID_A ? CONCERT_ID_A : CONCERT_ID_B;
    http.post(
        `${BASE_URL}/booking/start`,
        `concertId=${concertId}&sessionId=${sessionId}`,
        { jar, redirects: 0, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const seatRes = http.get(`${BASE_URL}/api/queue/admin/seats?sessionId=${sessionId}`, { jar });
    if (seatRes.status !== 200) return null;

    // 응답 구조: { status, msg, body: [seatId, ...] }
    const seats = JSON.parse(seatRes.body).body;
    if (!seats || seats.length === 0) return null;

    // vuSlot(0~999)을 좌석 배열 길이로 나눠 겹치지 않게 순환
    return seats[vuSlot % seats.length];
}

// POST /booking/complete (form submit) → bookingId 반환
function selectSeat(jar, sessionId, seatId) {
    const res = http.post(
        `${BASE_URL}/booking/complete`,
        `sessionId=${sessionId}&seatIds=${seatId}`,
        { jar, redirects: 0, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    check(res, { '좌석선택 완료(302)': (r) => r.status === 302 });

    // Location: /booking/payment?bookingId=123 에서 bookingId 추출
    const location = res.headers['Location'] || '';
    const match = location.match(/bookingId=(\d+)/);
    return match ? parseInt(match[1]) : null;
}

// POST /api/payments/prepare → paymentId 반환
// 응답이 PrepareDTO 직접 반환 (Resp 래핑 없음)
function preparePayment(jar, bookingId) {
    const res = http.post(
        `${BASE_URL}/api/payments/prepare`,
        JSON.stringify({ bookingId, method: 'card', usedPoint: 0 }),
        { jar, headers: { 'Content-Type': 'application/json' } }
    );
    check(res, { '결제 준비 성공(200)': (r) => r.status === 200 });
    if (res.status !== 200) return null;
    const body = JSON.parse(res.body);
    // PrepareDTO를 직접 반환하므로 body.paymentId
    return body.paymentId;
}

// POST /api/queue/admin/payment/bypass → 포트원 없이 결제 완료
function bypassPayment(jar, paymentId) {
    const res = http.post(
        `${BASE_URL}/api/queue/admin/payment/bypass?paymentId=${paymentId}`,
        null,
        { jar, headers: { 'X-Loadtest-Key': LOADTEST_API_KEY } }
    );
    check(res, { '결제 우회 완료(200)': (r) => r.status === 200 });
    return res.status === 200;
}

export default function () {
    const userIndex = __VU;
    // VU 1~1000 → 콘서트A(sessionId=10), VU 1001~2000 → 콘서트B(sessionId=11)
    const SESSION_ID = userIndex <= 1000 ? SESSION_ID_A : SESSION_ID_B;
    const vuSlot = userIndex <= 1000 ? userIndex - 1 : userIndex - 1001; // 0-based

    const jar = login(userIndex);

    // ── 1단계: 대기열 진입 ──
    const waitRes = http.get(`${BASE_URL}/queue/wait?sessionId=${SESSION_ID}`, { jar, redirects: 0 });
    check(waitRes, {
        '대기열 진입(200/302)': (r) => r.status === 200 || r.status === 302,
    });

    let status = waitRes.status === 302 ? 'ENTERED' : null;
    let attempts = 0;
    const maxAttempts = 120;

    // ── 2단계: READY/ENTERED 될 때까지 폴링 ──
    while (status !== 'READY' && status !== 'ENTERED' && attempts < maxAttempts) {
        sleep(1);
        const statusRes = http.get(`${BASE_URL}/api/queue/${SESSION_ID}/status`, { jar });
        if (statusRes.status === 200) {
            const body = JSON.parse(statusRes.body).body;
            status = body.status;
            if (attempts % 10 === 0) {
                console.log(`VU ${userIndex} [session=${SESSION_ID}] status=${status} ahead=${body.waitingAhead}`);
            }
        }
        attempts++;
    }

    check(status, { 'READY/ENTERED 승격됨': (s) => s === 'READY' || s === 'ENTERED' });
    if (status !== 'READY' && status !== 'ENTERED') return;

    // ── 3단계: READY → ENTERED 전이 ──
    if (status === 'READY') {
        const enterRes = http.post(
            `${BASE_URL}/api/queue/${SESSION_ID}/enter-booking`, '{}',
            { jar, headers: { 'Content-Type': 'application/json' } }
        );
        check(enterRes, { 'enter-booking 성공': (r) => r.status === 200 });
        if (enterRes.status !== 200) return;
    }

    // ── 4단계: 좌석 선택 ──
    const seatId = pickSeatId(jar, SESSION_ID, vuSlot);
    if (!seatId) {
        console.error(`VU ${userIndex} 좌석 없음`);
        return;
    }

    const bookingId = selectSeat(jar, SESSION_ID, seatId);
    if (!bookingId) {
        console.error(`VU ${userIndex} 좌석선택 실패 (seatId=${seatId})`);
        return;
    }

    // ── 5단계: 결제 준비 ──
    const paymentId = preparePayment(jar, bookingId);
    if (!paymentId) {
        console.error(`VU ${userIndex} 결제 준비 실패 (bookingId=${bookingId})`);
        return;
    }

    // ── 6단계: 결제 우회 완료 (포트원 없이 PAID 처리) ──
    const ok = bypassPayment(jar, paymentId);

    if (ok) {
        console.log(`VU ${userIndex} [session=${SESSION_ID}] 예매 완료 ✓ bookingId=${bookingId}`);
    }
}
