// 1. 페이지 로드 시 이벤트 기간 확인 및 버튼 제어
document.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('btnJoinEvent');
    if (!btn) return;

    const startDateStr = btn.getAttribute('data-start');
    const endDateStr = btn.getAttribute('data-end');

    const now = new Date();
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    if (endDateStr && endDateStr.length <= 10) {
        end.setHours(23, 59, 59, 999);
    }

    if (now < start || now > end) {
        btn.disabled = true;
        btn.innerText = "이벤트 종료 (기간 아님)";
        btn.classList.add('cc-btn--disabled');
        btn.removeAttribute('onclick');
    }
});

// 2. 이벤트 참여 기능 (CcUI 적용)
async function joinEvent(eventId) {
    try {
        const response = await fetch(`/api/events/${eventId}/join`, {
            method: "POST"
        });

        // 서버가 정상적인 JSON을 줬는지 검증
        const contentType = response.headers.get("content-type");
        let result = {};

        if (contentType && contentType.includes("application/json")) {
            result = await response.json();
        }

        if (!response.ok) {
            // 💡 1. 401 에러 (로그인 필요): 페이지 이동이 필요하므로 confirm 다이얼로그 활용
            if (response.status === 401) {
                CcUI.confirm({
                    title: '로그인 안내',
                    text: result.message || "로그인이 필요합니다.\n로그인 페이지로 이동하시겠습니까?",
                    confirmText: '로그인',
                    onConfirm: () => {
                        location.href = "/login";
                    }
                });
                return;
            }

            // 💡 2. 그 외 400 에러 (이미 참여함 등): 경고(warning) 타입 alert 사용
            CcUI.alert(result.message || result.msg || "이벤트 참여에 실패했습니다.", 'warning');
            return;
        }

        // 💡 3. 성공: 우상단 토스트 알림을 띄우고, 사용자가 읽을 수 있도록 1.5초 대기 후 새로고침
        CcUI.toast(result.message || result.msg || "이벤트 참여가 완료되었습니다.", 'success');

        setTimeout(() => {
            location.reload();
        }, 1500);

    } catch (error) {
        console.error("이벤트 참여 중 스크립트 에러 발생:", error);
        // 💡 4. 시스템/네트워크 에러: 에러(error) 타입 alert 사용
        CcUI.alert("요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", 'error');
    }
}


// DOM 요소가 정상 로드된 후 이벤트 바인딩 처리
document.addEventListener("DOMContentLoaded", () => {
    const btnShowPointHistory = document.getElementById("btnShowPointHistory");
    const btnClosePointModal = document.getElementById("btnClosePointModal");

    // [포인트 내역] 링크 클릭 이벤트 등록
    if (btnShowPointHistory) {
        btnShowPointHistory.addEventListener("click", openPointModal);
    }

    // 우상단 [X] 버튼 클릭 이벤트 등록
    if (btnClosePointModal) {
        btnClosePointModal.addEventListener("click", closePointModal);
    }
});

// 1. 모달 열기 함수
async function openPointModal() {
    const overlay = document.getElementById('pointModalOverlay');
    const content = document.getElementById('pointModalContent');

    if (!overlay || !content) return;

    overlay.style.setProperty('display', 'flex', 'important');
    content.innerHTML = '<p style="text-align: center; color: #64748b; margin: 40px 0; font-size: 14px;">내역을 조회 중입니다...</p>';

    try {
        const response = await fetch('/api/points/expiring');
        if (!response.ok) throw new Error();

        const expiringList = await response.json();
        renderExpiringView(expiringList);
    } catch (error) {
        overlay.style.display = 'none';
        CcUI.alert("포인트 내역을 불러오지 못했습니다.", "error");
    }
}

// 2. 만료 예정 목록 화면 그리기
function renderExpiringView(list) {
    let html = `<h3 style="font-size: 18px; font-weight: bold; margin-bottom: 20px; color: #1e293b;">30일 내 소멸 예정 포인트</h3>`;

    if (!list || list.length === 0) {
        html += `<p style="text-align: center; color: #64748b; margin: 40px 0; font-size: 14px;">30일 이내에 소멸 예정인 포인트가 없습니다. 🥳</p>`;
    } else {
        html += `<ul style="list-style: none; padding: 0; margin: 0 0 24px 0; max-height: 250px; overflow-y: auto;">`;
        list.forEach(item => {
            html += `
                <li style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; display: flex; justify-content: space-between;">
                    <span style="color: #334155;">${item.title}</span>
                    <span style="color: #ef4444; font-weight: 600;">${item.balance}P <span style="font-size: 12px; color: #94a3b8; font-weight: 400;">(${item.expiredAt})</span></span>
                </li>`;
        });
        html += `</ul>`;
    }

    html += `
        <div style="text-align: center; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            <button type="button" onclick="loadAllHistory()" style="background: none; border: none; color: #0284c7; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: underline;">
                전체 이용 내역 보기
            </button>
        </div>
    `;

    document.getElementById('pointModalContent').innerHTML = html;
}

// 3. 전체 내역 보기 클릭 시
async function loadAllHistory() {
    const content = document.getElementById('pointModalContent');
    content.innerHTML = '<p style="text-align: center; color: #64748b; margin: 40px 0; font-size: 14px;">전체 내역을 조회 중입니다...</p>';

    try {
        const response = await fetch('/api/points/history');
        if (!response.ok) throw new Error();

        const historyList = await response.json();

        let html = `<h3 style="font-size: 18px; font-weight: bold; margin-bottom: 20px; color: #1e293b;">당월 포인트 이용 내역</h3>`;
        html += `<ul style="list-style: none; padding: 0; margin: 0; max-height: 300px; overflow-y: auto;">`;

        if (!historyList || historyList.length === 0) {
            html += `<p style="text-align: center; color: #64748b; margin: 40px 0; font-size: 14px;">이번 달 이용 내역이 없습니다.</p>`;
        } else {
            historyList.forEach(item => {
                const isEarn = item.typeLabel === '적립';
                const color = isEarn ? '#10b981' : '#64748b';
                const prefix = isEarn ? '+' : '-';

                html += `
                    <li style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <strong style="color: #334155;">[${item.typeLabel}] ${item.title}</strong>
                            <span style="color: ${color}; font-weight: 600;">${prefix}${item.amount}P</span>
                        </div>
                        <span style="font-size: 12px; color: #94a3b8;">${item.createdAt}</span>
                    </li>`;
            });
        }
        html += `</ul>`;

        content.innerHTML = html;
    } catch (error) {
        CcUI.toast("전체 내역을 불러오지 못했습니다.", "error");
    }
}

// 4. 모달 닫기
function closePointModal() {
    document.getElementById('pointModalOverlay').style.display = 'none';
}