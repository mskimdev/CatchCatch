

const toggle = document.getElementById('notification-toggle');
const dropdown = document.getElementById('notification-dropdown');
const badge = document.getElementById('notification-badge');
const list = document.getElementById('notification-list');

//보안용
function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function renderBadge(count) {
    if (!badge) return;

    if (count > 0) {
        badge.style.display = 'inline-flex';
        badge.textContent = count > 99 ? '99+' : count;
    } else {
        badge.style.display = 'none';
        badge.textContent = '';
    }
}

async function loadUnreadCount() {
    try {
        const { res, data } = await apiGet('/api/notifications/unread-count');

        if (!res || !res.ok) return;

        renderBadge(data.body ?? 0);
    } catch (e) {
        console.error('알림 개수 조회 실패', e);
    }
}

async function loadNotifications() {
    if (!list) return;

    try {
        const { res, data } = await apiGet('/api/notifications');

        if (!res || !res.ok) {
            list.innerHTML = '<div class="cc-notification-empty">알림을 불러오지 못했습니다.</div>';
            return;
        }

        const notifications = data.body ?? [];

        if (notifications.length === 0) {
            list.innerHTML = '<div class="cc-notification-empty">도착한 알림이 없습니다.</div>';
            return;
        }

        list.innerHTML = notifications.map((notification) => {
            const unreadClass = notification.read ? '' : 'is-unread';
            const newBadge = notification.read ? '' : '<span class="cc-notification-new">NEW</span>';

            return `
                <button type="button"
                        class="cc-notification-item ${unreadClass}"
                        data-id="${notification.id}"
                        data-url="${escapeHtml(notification.targetUrl)}">
                    <div class="cc-notification-item-icon">🔔</div>
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

    } catch (e) {
        console.error('알림 조회 실패', e);
        list.innerHTML = '<div class="cc-notification-empty">알림을 불러오지 못했습니다.</div>';
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

        renderBadge(notification.unreadCount ?? 0);
        //새 알림내용 팝업처럼 띄우기
        if (window.CcUI) {
            CcUI.toast(notification.content, 'info');
        }

        // 알림창 열려있으면 알림오면 새로고침
        if (dropdown?.classList.contains('is-open')) {
            loadNotifications();
        }
    });

    eventSource.onerror = () => {
        console.warn('알림 SSE 연결 끊김. 브라우저가 자동 재연결합니다.');
    };
}

toggle?.addEventListener('click', async (e) => {
    //document까지 뻗어나가는걸 막음
    e.stopPropagation();
    //누르면 나오고 꺼지면 사라짐
    dropdown.classList.toggle('is-open');
    // 팝업 렌더링
    if (dropdown.classList.contains('is-open')) {
        await loadNotifications();
    }
});

dropdown?.addEventListener('click', async (e) => {
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
    // 누른 url로 이동
    location.href = url;
});

//바깥 클릭하면 닫힘
document.addEventListener('click', () => {
    dropdown?.classList.remove('is-open');
});

document.addEventListener('DOMContentLoaded', () => {
    if (!toggle) return;
    //안 읽은 알림 갯수 종에 표시
    loadUnreadCount();
    // sse 연결 시작
    connectSse();
});