const form = document.getElementById('editForm');
const textarea = document.getElementById('content');
const counter = document.getElementById('contentLength');

document.getElementById('category').value = form.dataset.category;

if (textarea && counter) {
    counter.textContent = textarea.value.length;
    textarea.addEventListener('input', function () {
        counter.textContent = this.value.length;
    });
}

document.getElementById('submitBtn').addEventListener('click', async function () {
    const id = form.dataset.id;
    const category = document.getElementById('category').value;
    const title = document.getElementById('title').value.trim();
    const content = textarea.value.trim();
    const isPublic = document.querySelector('input[name="isPublic"]').checked;
    const notifyEmail = document.querySelector('input[name="notifyEmail"]').checked;
    const notifySms = document.querySelector('input[name="notifySms"]')?.checked ?? false;

    if (!category) return CcUI.toast('문의 유형을 선택해주세요.', 'warning');
    if (!title) return CcUI.toast('제목을 입력해주세요.', 'warning');
    if (!content) return CcUI.toast('내용을 입력해주세요.', 'warning');

    CcUI.loading.show();
    const { res } = await apiPut(`/api/inquiries/${id}`, { category, title, content, isPublic, notifyEmail, notifySms });
    CcUI.loading.hide();

    if (res && res.ok) {
        CcUI.toast('수정이 완료되었습니다.', 'success');
        setTimeout(() => location.href = `/support/inquiries/${id}`, 2000);
    } else {
        CcUI.toast('수정에 실패했습니다.', 'error');
    }
});