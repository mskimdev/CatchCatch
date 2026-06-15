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

        btn.style.backgroundColor = "#cbd5e1";
        btn.style.color = "#64748b";
        btn.style.cursor = "not-allowed";
        btn.style.borderColor = "#cbd5e1";

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