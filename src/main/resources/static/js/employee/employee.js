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


document.addEventListener('DOMContentLoaded', function() {
    const formIds = ['createForm', 'updateForm', 'statusForm'];

    formIds.forEach(formId => {
        const form = document.getElementById(formId);
        if (!form) return;

        form.addEventListener('submit', function(e) {
            e.preventDefault();

            const url = form.action;
            const formData = new FormData(form);

            fetch(url, {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('권한이 없거나 잘못된 요청입니다.');
                }
                location.reload();
            })
            .catch(error => {
                Swal.fire({
                    icon: 'error',
                    title: '요청 실패',
                    text: error.message,
                    confirmButtonText: '확인'
                }).then((result) => {
                    if (result.isConfirmed) {
                        const modalId = formId.replace('Form', 'Modal');
                        closeModal(modalId);
                    }
                });
            });
        });
    });
});

$('#createModal').on('hidden.bs.modal', function () {
    const form = document.getElementById('createForm');
    if (form) {
        form.reset();
    }
});