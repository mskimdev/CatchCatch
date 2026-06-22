import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'http://localhost:8080';
const CONCERT_SESSION_ID = 1;

export const options = {
    scenarios: {
        queue_entry: {
            executor: 'per-vu-iterations',
            vus: 5000,
            iterations: 1,
            maxDuration: '5m',
        },
    },
};

export default function () {
    const userIndex = __VU;
    const email = `loadgen${userIndex}@test.com`;
    const password = 'ssar1234';

    const loginRes = http.post(
        `${BASE_URL}/login`,
        { email, password },
        { redirects: 0 }
    );

    check(loginRes, {
        '로그인 성공(302 리다이렉트)': (r) => r.status === 302 || r.status === 200,
    });

    const enterRes = http.post(
        `${BASE_URL}/api/queue/enter`,
        JSON.stringify({ concertSessionId: CONCERT_SESSION_ID }),
        { headers: { 'Content-Type': 'application/json' } }
    );

    check(enterRes, {
        '대기열 진입 성공': (r) => r.status === 200,
    });

    if (enterRes.status !== 200) {
        console.error(`VU ${userIndex} enter 실패: ${enterRes.status} ${enterRes.body}`);
        return;
    }

    const enterBody = JSON.parse(enterRes.body).body;
    const queueId = enterBody.queueId;
    console.log(`VU ${userIndex} queueId=${queueId} queueNumber=${enterBody.queueNumber} waitingAhead=${enterBody.waitingAhead}`);

    let status = enterBody.status;
    let attempts = 0;
    const maxAttempts = 60;

    while (status === 'WAITING' && attempts < maxAttempts) {
        sleep(2);
        const statusRes = http.get(`${BASE_URL}/api/queue/${queueId}/status`);
        if (statusRes.status === 200) {
            const body = JSON.parse(statusRes.body).body;
            status = body.status;
            if (attempts % 3 === 0) {
                console.log(`VU ${userIndex} queueId=${queueId} status=${status} waitingAhead=${body.waitingAhead}`);
            }
        }
        attempts++;
    }

    console.log(`VU ${userIndex} 최종 status=${status} (${attempts * 2}초 소요)`);

    check(status, {
        'READY 상태로 승격됨': (s) => s === 'READY',
    });
}