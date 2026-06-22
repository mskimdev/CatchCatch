const notificationToggle = document.getElementById('notification-toggle');
const notificationDropdown = document.getElementById('notification-dropdown');
const notificationBadge = document.getElementById('notification-badge');
const notificationList = document.getElementById('notification-list');
const notificationTabButtons = notificationDropdown ? notificationDropdown.querySelectorAll('[data-tab]') : [];
const notificationFilterPanels = notificationDropdown ? notificationDropdown.querySelectorAll('[data-tab-panel]') : [];

let allNotifications = [];
let activeNotificationTab = 'notification';
let activeNotificationFilter = 'ALL';

const NOTIFICATION_CHAT_TYPES = ['CHAT_REPLY'];

//보안용
function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function renderNotificationBadge(count) {
    if (!notificationBadge) return;

    if (count > 0) {
        notificationBadge.style.display = 'inline-flex';
        notificationBadge.textContent = count > 99 ? '99+' : count;
    } else {
        notificationBadge.style.display = 'none';
        notificationBadge.textContent = '';
    }
}

async function loadUnreadCount() {
    try {
        const { res, data } = await apiGet('/api/notifications/unread-count');

        if (!res || !res.ok) return;

        renderNotificationBadge(data.body ?? 0);
    } catch (e) {
        console.error('알림 개수 조회 실패', e);
    }
}

// 현재 탭(알림/대화) + 필터(전체/타입) 기준으로 allNotifications를 추려서 렌더링
function renderNotifications() {
    if (!notificationList) return;

    const inChatTab = activeNotificationTab === 'chat';

    let notifications = allNotifications.filter((n) => {
        const isChatType = NOTIFICATION_CHAT_TYPES.includes(n.type);
        return inChatTab ? isChatType : !isChatType;
    });

    if (!inChatTab && activeNotificationFilter !== 'ALL') {
        const types = activeNotificationFilter.split(',');
        notifications = notifications.filter((n) => types.includes(n.type));
    }

    if (notifications.length === 0) {
        notificationList.innerHTML = `<div class="cc-notification-empty">${inChatTab ? '도착한 대화가 없습니다.' : '도착한 알림이 없습니다.'}</div>`;
        return;
    }

    notificationList.innerHTML = notifications.map((notification) => {
        const unreadClass = notification.read ? '' : 'is-unread';
        const newBadge = notification.read ? '' : '<span class="cc-notification-new">NEW</span>';

        return `
            <button type="button"
                    class="cc-notification-item ${unreadClass}"
                    data-id="${notification.id}"
                    data-url="${escapeHtml(notification.targetUrl)}">
                <div class="cc-notification-item-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                </div>
                <div class="cc-notification-item-body">
                    <div class="cc-notification-title-row">
                        <strong>${escapeHtml(notification.title)}</strong>
                        ${newBadge}
                    </div>
                    <p>${escapeHtml(notification.content)}</p>
                    <small>${escapeHtml(notification.createdAt)}</small>
                </div>
            </button>
        `;
    }).join('');
}

async function loadNotifications() {
    if (!notificationList) return;

    try {
        const { res, data } = await apiGet('/api/notifications');

        if (!res || !res.ok) {
            notificationList.innerHTML = '<div class="cc-notification-empty">알림을 불러오지 못했습니다.</div>';
            return;
        }

        allNotifications = data.body ?? [];
        renderNotifications();

    } catch (e) {
        console.error('알림 조회 실패', e);
        notificationList.innerHTML = '<div class="cc-notification-empty">알림을 불러오지 못했습니다.</div>';
    }
}

function connectSse() {
    if (!window.EventSource) {
        console.warn('이 브라우저는 SSE를 지원하지 않습니다.');
        return;
    }

    const eventSource = new EventSource('/api/notifications/subscribe');

    eventSource.addEventListener('connect', () => {
        console.log('알림 SSE 연결 완료');
    });
    //notification이라는 이벤트가 오면 실행됨
    eventSource.addEventListener('notification', (event) => {
        const notification = JSON.parse(event.data);

        renderNotificationBadge(notification.unreadCount ?? 0);
        //새 알림내용 팝업처럼 띄우기
        if (window.CcUI) {
            CcUI.toast(notification.content, 'info');
        }

        // 알림창 열려있으면 알림오면 새로고침
        if (notificationDropdown?.classList.contains('is-open')) {
            loadNotifications();
        }
    });

    eventSource.onerror = () => {
        console.warn('알림 SSE 연결 끊김. 브라우저가 자동 재연결합니다.');
    };
}

notificationToggle?.addEventListener('click', async (e) => {
    //document까지 뻗어나가는걸 막음
    e.stopPropagation();
    //누르면 나오고 꺼지면 사라짐
    notificationDropdown.classList.toggle('is-open');
    // 팝업 렌더링
    if (notificationDropdown.classList.contains('is-open')) {
        await loadNotifications();
    }
});

// 알림/대화 탭 전환
notificationTabButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();

        activeNotificationTab = btn.dataset.tab;

        notificationTabButtons.forEach((b) => b.classList.toggle('active', b === btn));
        notificationFilterPanels.forEach((panel) => {
            panel.style.display = panel.dataset.tabPanel === activeNotificationTab ? '' : 'none';
        });

        // 탭을 옮기면 필터는 항상 첫 번째(전체)로 초기화
        const panel = Array.from(notificationFilterPanels).find((p) => p.dataset.tabPanel === activeNotificationTab);
        const firstFilterBtn = panel?.querySelector('[data-filter]');
        if (firstFilterBtn) {
            panel.querySelectorAll('[data-filter]').forEach((b) => b.classList.toggle('active', b === firstFilterBtn));
            activeNotificationFilter = firstFilterBtn.dataset.filter;
        }

        renderNotifications();
    });
});

// 전체 / 타입별 필터 전환
notificationFilterPanels.forEach((panel) => {
    panel.addEventListener('click', (e) => {
        e.stopPropagation();

        const filterBtn = e.target.closest('[data-filter]');
        if (!filterBtn) return;

        activeNotificationFilter = filterBtn.dataset.filter;
        panel.querySelectorAll('[data-filter]').forEach((b) => b.classList.toggle('active', b === filterBtn));

        renderNotifications();
    });
});

notificationDropdown?.addEventListener('click', async (e) => {
    e.stopPropagation();
    //내가 클릭한 요소 부모로 올라가서 .cc-notification-item 이거와 제일 가까운 클래스를 찾아라
    const item = e.target.closest('.cc-notification-item');

    if (!item) return;

    const id = item.dataset.id;
    const url = item.dataset.url;

    try {
        //눌러서 읽은 알림으로 처리
        await apiPut(`/api/notifications/${id}/read`, {});
        //다시 렌더링 해서 알림 갯수 지움
        await loadUnreadCount();
    } catch (e) {
        console.error('알림 읽음 처리 실패', e);
    }

    // 1:1 채팅 답변 알림은 페이지 이동 대신 채팅 패널을 띄운다
    if (url === '#open-chat') {
        notificationDropdown.classList.remove('is-open');
        document.getElementById('cc-fab')?.classList.add('is-open');
        document.getElementById('cc-fab-chat')?.click();
        return;
    }

    // 누른 url로 이동
    location.href = url;
});

//바깥 클릭하면 닫힘
document.addEventListener('click', () => {
    notificationDropdown?.classList.remove('is-open');
});

document.addEventListener('DOMContentLoaded', () => {
    if (!notificationToggle) return;
    //안 읽은 알림 갯수 종에 표시
    loadUnreadCount();
    // sse 연결 시작
    connectSse();
});
