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

// 2. 이벤트 참여 기능 (에러 방지 밸브 추가)
async function joinEvent(eventId) {
    try {
        const response = await fetch(`/api/events/${eventId}/join`, {
            method: "POST"
        });

        // 서버가 정상적인 JSON을 줬는지 검증 (HTML 에러 페이지 파싱 에러 방지)
        const contentType = response.headers.get("content-type");
        let result = {};

        if (contentType && contentType.includes("application/json")) {
            result = await response.json();
        }

        if (!response.ok) {
            // 💡 단순히 글자만 띄우는 걸 넘어, '401'일 때는 로그인 창으로 보내주는 '액션'을 추가하는 것!
            if (response.status === 401) {
                alert(result.message || "로그인이 필요합니다.");
                location.href = "/login"; // 로그인 페이지 주소로 이동
                return;
            }

            // 그 외 400 에러(이미 참여함 등)는 그냥 알림창만 띄우고 제자리 유지
            alert(result.message || "이벤트 참여에 실패했습니다.");
            return;
        }

        alert(result.message || result.msg || "이벤트 참여가 완료되었습니다.");
        location.reload();

    } catch (error) {
        console.error("이벤트 참여 중 스크립트 에러 발생:", error);
        alert("요청 처리 중 오류가 발생했습니다. 로그인을 확인하거나 잠시 후 다시 시도해주세요.");
    }
}