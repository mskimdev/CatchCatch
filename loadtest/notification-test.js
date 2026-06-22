import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'http://localhost:8080';

const USER_EMAIL = 'ssar@naver.com';
const USER_PASSWORD = 'ssar1234';
const ADMIN_EMAIL = 'admin@catchcatch.com';
const ADMIN_PASSWORD = 'ssar1234';

// 시드 데이터(concert.sql) 기준 COMING_SOON 콘서트: id=3 조성진 피아노 리사이틀, venue_id=3
const COMING_SOON_CONCERT_ID = 3;
// 시드 데이터(event.sql) 기준 진행 중 이벤트: id=1 첫 예매 웰컴 혜택
const ACTIVE_EVENT_ID = 1;

export const options = {
    scenarios: {
        notification_flow: {
            executor: 'shared-iterations',
            vus: 1,
            iterations: 1,
            maxDuration: '1m',
        },
    },
};

// http.cookieJar()(인자 없음)는 VU 전역 jar라서 유저/관리자 세션을 같이 다루면
// 같은 JSESSIONID로 뒤섞인다. new http.CookieJar()로 매번 독립된 jar를 만들어 분리한다.
function login(email, password) {
    const jar = new http.CookieJar();
    const res = http.post(
        `${BASE_URL}/login`,
        { email, password },
        { redirects: 0, jar }
    );

    check(res, {
        [`${email} 로그인 성공(302)`]: (r) => r.status === 302,
    });

    return jar;
}

function fetchNotifications(jar) {
    const res = http.get(`${BASE_URL}/api/notifications`, { jar });
    check(res, { '알림 목록 조회 성공': (r) => r.status === 200 });
    return JSON.parse(res.body).body ?? [];
}

function expectNotification(notifications, type, matcher, label) {
    const found = notifications.find((n) => n.type === type && matcher(n));
    check(found, { [`${label} 알림 도착`]: (n) => !!n });

    if (found) {
        console.log(`[OK] ${label}: [${found.type}] ${found.title} - ${found.content}`);
    } else {
        console.error(`[FAIL] ${label} 알림을 찾지 못했습니다.`);
    }

    return found;
}

// 1. 1:1 문의 답변 알림 (INQUIRY_REPLY)
function testInquiryReply(userJar, adminJar) {
    const inquiryTitle = `알림 테스트 문의 ${Date.now()}`;

    const saveRes = http.post(
        `${BASE_URL}/support/inquiries/save`,
        {
            category: 'ETC',
            title: inquiryTitle,
            content: '알림 연동 확인용 문의입니다.',
            isPublic: 'false',
            notifyEmail: 'false',
            notifySms: 'false',
        },
        { redirects: 0, jar: userJar }
    );
    check(saveRes, { '문의 등록 성공(302)': (r) => r.status === 302 });

    sleep(1);

    const listRes = http.get(`${BASE_URL}/admin/boards/inquiry?status=PENDING`, { jar: adminJar });
    check(listRes, { '관리자 문의 목록 조회 성공': (r) => r.status === 200 });

    const idMatch = listRes.body.match(/\/admin\/boards\/inquiry\/(\d+)/);
    if (!idMatch) {
        console.error('[FAIL] 답변 대기 중인 문의를 찾지 못했습니다.');
        return;
    }

    const inquiryId = idMatch[1];
    const replyRes = http.put(
        `${BASE_URL}/api/admin/boards/inquiry/${inquiryId}/reply`,
        JSON.stringify({ reply: '문의 감사합니다. 알림 테스트용 답변입니다.' }),
        { headers: { 'Content-Type': 'application/json' }, jar: adminJar }
    );
    check(replyRes, { '문의 답변 등록 성공(200)': (r) => r.status === 200 });

    sleep(1);

    const notifications = fetchNotifications(userJar);
    expectNotification(
        notifications,
        'INQUIRY_REPLY',
        (n) => n.content.includes(inquiryTitle),
        '1:1 문의 답변'
    );
}

// 2. 포인트 적립 알림 (POINT_EARNED)
function testPointEarned(userJar) {
    const joinRes = http.post(
        `${BASE_URL}/api/events/${ACTIVE_EVENT_ID}/join`,
        null,
        { jar: userJar }
    );

    check(joinRes, {
        '이벤트 참여 처리됨(200 또는 이미 참여 400)': (r) => r.status === 200 || r.status === 400,
    });

    if (joinRes.status !== 200) {
        console.warn(`[SKIP] 이미 참여한 이벤트로 보입니다: ${joinRes.body}`);
        return;
    }

    sleep(1);

    const notifications = fetchNotifications(userJar);
    expectNotification(
        notifications,
        'POINT_EARNED',
        () => true,
        '포인트 적립'
    );
}

// 알림 디스패치 조건이 "COMING_SOON -> OPEN 전환"이므로, 반복 실행 시에도 항상
// COMING_SOON 상태에서 시작하도록 먼저 되돌려놓는다.
function buildConcertUpdatePayload(concertStatus) {
    return JSON.stringify({
        title: '조성진 피아노 리사이틀',
        artist: '조성진',
        venueId: 3,
        genre: 'classic',
        category: '클래식',
        priceVip: 0,
        priceR: 0,
        priceS: 0,
        priceA: 0,
        ticketOpenDate: '2026-07-10T18:00',
        startDate: '2026-10-10',
        endDate: '2026-10-11',
        runtime: '100분',
        ageLimit: '만 7세 이상 관람가',
        organizer: '크레디아',
        contact: '1544-3333',
        detailTitle: '건반 위를 수놓는 완벽한 타건',
        description: '세계적인 피아니스트 조성진의 2026년 전국투어 리사이틀.',
        detailDescription1: '쇼팽 콩쿠르 우승자 조성진의 귀환',
        detailDescription2: '영혼을 울리는 클래식의 밤',
        posterUrl: '/images/sample/poster-music.svg',
        concertStatus,
    });
}

// 3. 관심 공연 예매 오픈 알림 (CONCERT_OPENED)
function testConcertOpened(userJar, adminJar) {
    // 3-0. 콘서트를 COMING_SOON 상태로 리셋 (반복 실행 대비)
    const resetRes = http.put(
        `${BASE_URL}/api/concert/${COMING_SOON_CONCERT_ID}`,
        buildConcertUpdatePayload('COMING_SOON'),
        { headers: { 'Content-Type': 'application/json' }, jar: adminJar }
    );
    check(resetRes, { '공연 상태 COMING_SOON 리셋 성공': (r) => r.status === 200 });

    sleep(1);

    // 3-1. 유저가 COMING_SOON 콘서트를 찜
    const likeRes = http.post(
        `${BASE_URL}/api/concerts/${COMING_SOON_CONCERT_ID}/like`,
        null,
        { jar: userJar }
    );
    check(likeRes, { '관심 공연 등록 성공': (r) => r.status === 200 });

    sleep(1);

    // 3-2. 관리자가 콘서트 상태를 COMING_SOON -> OPEN으로 변경
    const updateRes = http.put(
        `${BASE_URL}/api/concert/${COMING_SOON_CONCERT_ID}`,
        buildConcertUpdatePayload('OPEN'),
        { headers: { 'Content-Type': 'application/json' }, jar: adminJar }
    );
    check(updateRes, { '공연 상태 변경(예매 오픈) 성공': (r) => r.status === 200 });

    if (updateRes.status !== 200) {
        console.error(`[FAIL] 공연 상태 변경 실패: ${updateRes.body}`);
        return;
    }

    sleep(1);

    const notifications = fetchNotifications(userJar);
    expectNotification(
        notifications,
        'CONCERT_OPENED',
        () => true,
        '관심 공연 예매 오픈'
    );
}

export default function () {
    const userJar = login(USER_EMAIL, USER_PASSWORD);
    const adminJar = login(ADMIN_EMAIL, ADMIN_PASSWORD);

    console.log('=== 1. 1:1 문의 답변 알림 테스트 ===');
    testInquiryReply(userJar, adminJar);

    console.log('=== 2. 포인트 적립 알림 테스트 ===');
    testPointEarned(userJar);

    console.log('=== 3. 관심 공연 예매 오픈 알림 테스트 ===');
    testConcertOpened(userJar, adminJar);

    // 참고: 아래 알림은 외부 연동(PortOne 결제) 또는 WebSocket/STOMP가 필요해
    // 순수 HTTP 부하테스트로는 다루지 않음
    //  - BOOKING_CONFIRMED / BOOKING_CANCELED (결제·환불, PortOne 실연동 필요)
    //  - CHAT_REPLY (STOMP 메시지 기반)
    //  - POINT_EXPIRED (전용 트리거 없이 결제 준비 시점에 간접 발생)
}
