// 모달 닫기 공통 함수
function closeModal(modalId) {
    document.getElementById(modalId).close();
}

// 1. 신규 등록 모달 열기
function openCreateModal() {
    document.getElementById('createModal').showModal();
}

// 2. 정보 수정 모달 열기 (데이터 세팅 포함)
function openUpdateModal(empNo, name, department, role) {
    // 폼의 action URL을 해당 사번으로 변경
    const form = document.getElementById('updateForm');
    form.action = `/admin/employees/${empNo}/update`;

    // 기존 데이터를 input 창에 미리 채워줌
    document.getElementById('updateName').value = name;
    document.getElementById('updateDepartment').value = department;
    document.getElementById('updateRole').value = role;

    document.getElementById('updateModal').showModal();
}

// 3. 상태 변경 모달 열기
function openStatusModal(empNo, name, currentStatus) {
    const form = document.getElementById('statusForm');
    form.action = `/admin/employees/${empNo}/status`;

    // 누구의 상태를 바꾸는지 이름 표시
    document.getElementById('statusTargetName').innerText = name;
    document.getElementById('updateStatus').value = currentStatus;

    document.getElementById('statusModal').showModal();
}