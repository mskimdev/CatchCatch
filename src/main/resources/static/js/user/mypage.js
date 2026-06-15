function initProfilePreview() {
  const input = document.querySelector('[data-profile-input]');
  const preview = document.querySelector('[data-profile-preview]');
  const previewWrap = preview && preview.closest('.cc-profile-upload__preview, .cc-profile-image-edit__preview');
  if (!input || !preview || !previewWrap) return;

  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) {
      preview.removeAttribute('src');
      previewWrap.classList.remove('has-image');
      return;
    }
    preview.src = URL.createObjectURL(file);
    previewWrap.classList.add('has-image');
  });
}

function initProfileUpdate() {
  const form = document.getElementById('profileForm');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const file = form.querySelector('[name="profileImage"]').files[0];
    const base64Data = file ? await toBase64(file) : null;

    const isLocalUser = window.MYPAGE_DATA?.isLocalUser;

    const body = {
      username: form.querySelector('[name="username"]').value,
      phone: form.querySelector('[name="phone"]').value,
      profileImage: base64Data,
    };

    if (isLocalUser) {
      body.currentPassword    = form.querySelector('[name="currentPassword"]').value;
      body.newPassword        = form.querySelector('[name="newPassword"]').value;
      body.newPasswordConfirm = form.querySelector('[name="newPasswordConfirm"]').value;
    }

    if(body.newPassword !== body.newPasswordConfirm) {
      CcUI.toast("비밀번호를 확인해주세요.", 'warning');
      return;
    }

    CcUI.loading.show('저장 중입니다...');
    const { res, data } = await apiPut('/api/users/mypage', body);
    CcUI.loading.hide();

    if (res && res.ok) {
      CcUI.toast(data?.body || '회원 정보가 저장되었습니다.');
    } else {
      CcUI.toast(data?.message || '저장에 실패했습니다.', 'error');
    }

    form.querySelector('[name="currentPassword"]').value = "";
    form.querySelector('[name="newPassword"]').value = "";
    form.querySelector('[name="newPasswordConfirm"]').value = "";
  });
}

document.addEventListener('DOMContentLoaded', function () {
  initProfilePreview();
  initProfileUpdate();
});