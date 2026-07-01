/**
 * 대기열 없는 시나리오 시뮬레이션
 *
 * booking-flow-test.js(대기열 있음)와 대비용 테스트.
 *
 * 차이점:
 *   - 2000명이 ramp-up 없이 즉시 동시에 출발 (per-vu-iterations)
 *   - READY 폴링 없이 즉시 enter-booking 시도
 *   - 500 capacity 초과 ~1500명 → 즉시 400 실패
 *   - DB에 한꺼번에 부하 집중 → 응답시간/실패율 비교 가능
 *
 * 실행:
 *   k6 run loadtest/no-queue-test.js
 *
 * 결과 저장: doc/queue-result-2.json
 */

import http from 'k6/http';
import { check } from 'k6';

const BASE_URL   = 'http://localhost:8080';
const CONCERT_ID = 10;
const SESSION_ID = 16;
const MAX_USERS  = 2000;

export const options = {
    scenarios: {
        no_queue_spike: {
            executor: 'constant-vus',
            vus:      2000,   // 2000명 동시 지속
            duration: '3m',   // 3분간 지속 (대시보드 그래프 생성용)
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<3000'],
        http_req_failed:   ['rate<0.05'],
    },
    summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// 관리자 계정으로 좌석 목록 1회 조회 (/api/queue/admin/** → adminInterceptor)
export function setup() {
    const jar = new http.CookieJar();
    http.post(
        `${BASE_URL}/login`,
        { email: 'admin@catchcatch.com', password: 'ssar1234' },
        { redirects: 0, jar }
    );
    const res = http.get(
        `${BASE_URL}/api/queue/admin/seats?sessionId=${SESSION_ID}`,
        { jar }
    );
    const seatIds = (res.status === 200 ? JSON.parse(res.body)?.body : null) ?? [];
    console.log(`[setup] 좌석 수: ${seatIds.length}`);
    return { seatIds };
}

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

export default function (data) {
    const userIndex = ((__VU - 1) % MAX_USERS) + 1;

    // 1. 로그인
    const jar = login(userIndex);
    if (!jar) return;

    // 2. 대기열 진입
    const enterRes = http.post(
        `${BASE_URL}/api/queue/enter`,
        JSON.stringify({ concertSessionId: SESSION_ID }),
        { headers: { 'Content-Type': 'application/json' }, jar }
    );
    check(enterRes, { '2_대기열 진입(200)': (r) => r.status === 200 });

    // 3. 폴링 없이 즉시 enter-booking 시도
    //    대기열 없는 상황 = 모두가 즉시 입장 시도
    //    WAITING 상태면 400 → 실패로 기록 (대기열 없으면 이 사람들도 그냥 튕김)
    const bookingEnterRes = http.post(
        `${BASE_URL}/api/queue/${SESSION_ID}/enter-booking`,
        '{}',
        { headers: { 'Content-Type': 'application/json' }, jar }
    );
    check(bookingEnterRes, { '3_즉시 입장 성공(200)': (r) => r.status === 200 });

    if (bookingEnterRes.status !== 200) return; // WAITING → 여기서 탈락

    // 4. ENTERED된 소수만 예매 시도 (좌석 충돌 최소화: VU 인덱스로 분산)
    const seatId = data.seatIds[(__VU - 1) % data.seatIds.length];
    const completeRes = http.post(
        `${BASE_URL}/booking/complete`,
        {
            sessionId: String(SESSION_ID),
            concertId: String(CONCERT_ID),
            seatIds:   String(seatId),
        },
        { jar, redirects: 0 }
    );

    const ok = completeRes.status === 302
        && completeRes.headers['Location']?.includes('/booking/payment');
    check(completeRes, { '4_예매 완료(302)': () => ok });

    if (ok) {
        const m = completeRes.headers['Location'].match(/bookingId=(\d+)/);
        if (m) {
            http.post(
                `${BASE_URL}/booking/${m[1]}/cancel`,
                '{}',
                { headers: { 'Content-Type': 'application/json' }, jar }
            );
        }
    }
}

export function handleSummary(data) {
    const dur  = data.metrics['http_req_duration'];
    const reqs = data.metrics['http_reqs'];
    const fail = data.metrics['http_req_failed'];
    const vus  = data.metrics['vus_max'];

    const result = {
        테스트_일시: new Date().toISOString(),
        시나리오: {
            설명: '대기열 없는 시나리오 — 2000명 즉시 동시 접속, 폴링 없음',
            최대_가상사용자: 2000,
            concert_id: CONCERT_ID,
            session_id: SESSION_ID,
        },
        핵심_지표: {
            동시접속_가상사용자: vus?.values?.max  ?? 0,
            평균응답시간_ms:     Math.round(dur?.values?.avg  ?? 0),
            초당처리요청수:      parseFloat((reqs?.values?.rate  ?? 0).toFixed(2)),
            요청실패율_pct:      parseFloat(((fail?.values?.rate ?? 0) * 100).toFixed(2)),
        },
        응답시간_분포: {
            p50_ms: Math.round(dur?.values?.med         ?? 0),
            p90_ms: Math.round(dur?.values?.['p(90)']  ?? 0),
            p95_ms: Math.round(dur?.values?.['p(95)']  ?? 0),
            p99_ms: Math.round(dur?.values?.['p(99)']  ?? 0),
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
        'doc/queue-result-2.json': JSON.stringify(result, null, 2),
    };
}
