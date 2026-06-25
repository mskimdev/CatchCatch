// --- 1. 모달 열기/닫기 공통 및 개별 함수 (부트스트랩 방식으로 통일) ---

// 모달 닫기 공통 함수
function closeModal(modalId) {
    $('#' + modalId).modal('hide');
}

// 1. 신규 등록 모달 열기
function openCreateModal() {
    const form = document.getElementById('createForm');
    if (form) form.reset(); // 열 때마다 이전 입력값 초기화

    $('#createModal').modal('show');
}

// 2. 정보 수정 모달 열기 (데이터 세팅 포함)
function openUpdateModal(empNo, name, department, role) {
    const form = document.getElementById('updateForm');
    form.action = `/admin/employees/${empNo}/update`;

    document.getElementById('updateName').value = name;
    document.getElementById('updateDepartment').value = department;
    document.getElementById('updateRole').value = role;

    $('#updateModal').modal('show');
}

// 3. 상태 변경 모달 열기
function openStatusModal(empNo, name, currentStatus) {
    const form = document.getElementById('statusForm');
    form.action = `/admin/employees/${empNo}/status`;

    document.getElementById('statusTargetName').innerText = name;
    document.getElementById('updateStatus').value = currentStatus;

    $('#statusModal').modal('show');
}


// --- 2. 폼 제출 가로채기 (페이지 이동 없이 알림창 띄우고 모달 닫기) ---

document.addEventListener('DOMContentLoaded', function() {
    // 3개의 폼(등록, 수정, 상태변경)에 모두 적용
    const formIds = ['createForm', 'updateForm', 'statusForm'];

    formIds.forEach(formId => {
        const form = document.getElementById(formId);
        if (!form) return;

        form.addEventListener('submit', function(e) {
            e.preventDefault(); // 기본 새로고침(페이지 이동) 완벽 차단!

            const url = form.action;
            const formData = new FormData(form);

            // fetch를 이용해 백그라운드에서 조용히 서버로 데이터 전송
            fetch(url, {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    // 서버에서 400(값 오류)이나 403(권한 없음)이 오면 에러로 던짐
                    throw new Error('권한이 없거나 잘못된 요청입니다.');
                }
                // 성공 시 화면 새로고침하여 리스트 갱신
                location.reload();
            })
            .catch(error => {
                // 🚨 에러 발생 시 (모달창을 가리지 않고 예쁘게 띄움)
                Swal.fire({
                    icon: 'error',
                    title: '요청 실패',
                    text: error.message,
                    confirmButtonText: '확인'
                }).then((result) => {
                    // 💡 핵심: 사용자가 [확인] 버튼을 클릭하면 이 부분이 실행됨!
                    if (result.isConfirmed) {
                        // 폼 ID를 통해 현재 열려있는 모달의 ID를 유추해서 닫아줍니다.
                        // (ex: createForm 오류 -> createModal 닫기)
                        const modalId = formId.replace('Form', 'Modal');
                        closeModal(modalId);
                    }
                });
            });
        });
    });
});