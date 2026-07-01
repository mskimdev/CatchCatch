/**
 * 전체 예매 흐름 부하 테스트
 *
 * 흐름: 로그인 → 대기열 진입 → READY 폴링 → 입장 → 좌석 선택 → 예매 완료 → 취소(슬롯 반환)
 *
 * 사전 조건:
 *   1. 서버 기동 (localhost:8080)
 *   2. Redis 대기열 키 초기화: redis-cli FLUSHDB
 *   3. test_mskim.sql 적용 (loadgen 계정 5000개 + k6 전용 콘서트/좌석 생성)
 *
 * 실행:
 *   k6 run loadtest/booking-flow-test.js
 *
 * 발표 지표 위치 (실행 후 출력):
 *   vus              → 동시 접속 가상 사용자 (최대값)
 *   http_req_duration → 평균 응답 시간 (avg)
 *   http_reqs        → 초당 처리 요청 수 (rate)
 *   http_req_failed  → 요청 실패율 (rate)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL   = 'http://localhost:8080';
const CONCERT_ID = 10;
const SESSION_ID = 16;
const MAX_USERS  = 2000;

// setup(): 테스트 시작 전 1회 실행
// /api/queue/admin/** 는 adminInterceptor 보호 → admin 계정으로 좌석 목록을 미리 받아둔다
export function setup() {
    const jar = new http.CookieJar();
    const loginRes = http.post(
        `${BASE_URL}/login`,
        { email: 'admin@catchcatch.com', password: 'ssar1234' },
        { redirects: 0, jar }
    );

    if (loginRes.status !== 302) {
        console.error('[setup] 관리자 로그인 실패');
        return { seatIds: [] };
    }

    const seatsRes = http.get(
        `${BASE_URL}/api/queue/admin/seats?sessionId=${SESSION_ID}`,
        { jar }
    );

    const seatIds = (seatsRes.status === 200 ? JSON.parse(seatsRes.body)?.body : null) ?? [];
    console.log(`[setup] 사용 가능한 좌석 수: ${seatIds.length}`);
    return { seatIds };
}

export const options = {
    scenarios: {
        booking_flow: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '1m',  target: 500  },  // 워밍업: 점진적 증가
                { duration: '3m',  target: 2000 },  // 피크: 최대 2000명
                { duration: '1m',  target: 0    },  // 정리
            ],
            gracefulRampDown: '30s',
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<3000'],  // 95%가 3초 이내
        http_req_failed:   ['rate<0.05'],   // 실패율 5% 미만
    },
    summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// ──────────────────────────────────────────────
// 단계별 함수
// ──────────────────────────────────────────────

function login(userIndex) {
    const jar = new http.CookieJar();
    const res = http.post(
        `${BASE_URL}/login`,
        { email: `loadgen${userIndex}@test.com`, password: 'ssar1234' },
        { redirects: 0, jar }
    );
    check(res, { '1_로그인 성공(302)': (r) => r.status === 302 });
    return res.status === 302 ? jar : null;
}

function enterQueue(jar) {
    // GET /queue/wait → 내부에서 enter() 호출 후 대기 화면 반환 또는 /booking/seat 리다이렉트
    const res = http.get(
        `${BASE_URL}/queue/wait?sessionId=${SESSION_ID}`,
        { jar, redirects: 0 }
    );
    check(res, { '2_대기열 진입(200/302)': (r) => r.status === 200 || r.status === 302 });
}

/**
 * READY 또는 ENTERED 가 될 때까지 폴링한다.
 * 최대 대기 시간: maxAttempts × intervalSec = 90 × 2 = 180초 (3분)
 * 500 capacity / 2000 VU 기준 대기 예상 시간: 30~60초
 */
function pollUntilReady(jar, maxAttempts = 90, intervalSec = 2) {
    for (let i = 0; i < maxAttempts; i++) {
        const res = http.get(`${BASE_URL}/api/queue/${SESSION_ID}/status`, { jar });

        if (res.status === 200) {
            const status = JSON.parse(res.body)?.body?.status;
            if (status === 'READY' || status === 'ENTERED') return status;
            if (status === 'SOLD_OUT') return 'SOLD_OUT';
        }

        sleep(intervalSec);
    }
    return 'TIMEOUT';
}

function enterBooking(jar) {
    const res = http.post(
        `${BASE_URL}/api/queue/${SESSION_ID}/enter-booking`,
        '{}',
        { headers: { 'Content-Type': 'application/json' }, jar }
    );
    check(res, { '4_입장 처리 성공(200)': (r) => r.status === 200 });
    return res.status === 200;
}

// setup()에서 받은 seatIds를 VU 번호로 나눠 가짐 → 충돌 최소화
function pickSeat(seatIds) {
    if (!seatIds || seatIds.length === 0) return null;
    return seatIds[(__VU - 1) % seatIds.length];
}

function completeBooking(jar, seatId) {
    const res = http.post(
        `${BASE_URL}/booking/complete`,
        {
            sessionId: String(SESSION_ID),
            concertId: String(CONCERT_ID),
            seatIds:   String(seatId),
        },
        { jar, redirects: 0 }
    );

    const ok = res.status === 302 && res.headers['Location']?.includes('/booking/payment');
    check(res, { '6_예매 완료(302)': () => ok });

    if (ok) {
        const m = res.headers['Location'].match(/bookingId=(\d+)/);
        return m ? m[1] : null;
    }
    return null;
}

function cancelBooking(jar, bookingId) {
    const res = http.post(
        `${BASE_URL}/booking/${bookingId}/cancel`,
        '{}',
        { headers: { 'Content-Type': 'application/json' }, jar }
    );
    check(res, { '7_예매 취소 성공(200)': (r) => r.status === 200 });
}

// ──────────────────────────────────────────────
// 메인 시나리오 (VU당 반복 실행)
// ──────────────────────────────────────────────

export default function (data) {
    const userIndex = ((__VU - 1) % MAX_USERS) + 1;

    // 1. 로그인
    const jar = login(userIndex);
    if (!jar) return;

    // 2. 대기열 진입
    enterQueue(jar);

    // 3. READY 대기 폴링
    const queueStatus = pollUntilReady(jar);

    if (queueStatus === 'SOLD_OUT' || queueStatus === 'TIMEOUT') return;

    // 4. READY → ENTERED 전환
    if (queueStatus === 'READY') {
        if (!enterBooking(jar)) return;
    }

    // 5. 좌석 선택 (setup에서 받은 목록 사용, VU 인덱스로 분산)
    const seatId = pickSeat(data.seatIds);
    if (!seatId) return;

    // 6. 예매 완료
    const bookingId = completeBooking(jar, seatId);
    if (!bookingId) return;  // 좌석 선점 충돌(400) - ENTERED 슬롯은 TTL(15분) 후 자동 해제

    // 7. 예매 취소 → 좌석 반환
    cancelBooking(jar, bookingId);

    sleep(1);
}

export function handleSummary(data) {
    const dur  = data.metrics['http_req_duration'];
    const reqs = data.metrics['http_reqs'];
    const fail = data.metrics['http_req_failed'];
    const vus  = data.metrics['vus_max'];

    const result = {
        테스트_일시: new Date().toISOString(),
        시나리오: {
            최대_가상사용자: 2000,
            stages: '0→500(1m)→2000(3m)→0(1m)',
            concert_id: CONCERT_ID,
            session_id: SESSION_ID,
        },
        핵심_지표: {
            동시접속_가상사용자: vus?.values?.max ?? 0,
            평균응답시간_ms:     Math.round(dur?.values?.avg ?? 0),
            초당처리요청수:      parseFloat((reqs?.values?.rate ?? 0).toFixed(2)),
            요청실패율_pct:      parseFloat(((fail?.values?.rate ?? 0) * 100).toFixed(2)),
        },
        응답시간_분포: {
            p50_ms: Math.round(dur?.values?.med        ?? 0),
            p90_ms: Math.round(dur?.values?.['p(90)'] ?? 0),
            p95_ms: Math.round(dur?.values?.['p(95)'] ?? 0),
            p99_ms: Math.round(dur?.values?.['p(99)'] ?? 0),
        },
        전체_요청: {
            총_요청수: reqs?.values?.count ?? 0,
            성공:      Math.round((reqs?.values?.count ?? 0) * (1 - (fail?.values?.rate ?? 0))),
            실패:      Math.round((reqs?.values?.count ?? 0) * (fail?.values?.rate ?? 0)),
        },
        임계값_통과: {
            'p95_3초이내':       (dur?.values?.['p(95)'] ?? Infinity) < 3000,
            '실패율_5퍼센트미만': (fail?.values?.rate ?? 1) < 0.05,
        },
    };

    return {
        'doc/queue-result-1.json': JSON.stringify(result, null, 2),
    };
}
