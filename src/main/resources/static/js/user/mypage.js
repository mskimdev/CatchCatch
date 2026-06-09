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

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function initProfileUpdate() {
  const form = document.getElementById('profileForm');
  if (!form) return;

  const successEl = document.getElementById('profileSuccess');
  const errorEl = document.getElementById('profileError');

  function showMessage(el, msg) {
    successEl.style.display = 'none';
    errorEl.style.display = 'none';
    el.textContent = msg;
    el.style.display = 'block';
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const file = form.querySelector('[name="profileImage"]').files[0];
    let base64Data = null;
    if (file) {
      const base64 = await toBase64(file);
      base64Data = base64;
    }

    const isLocalUser = window.MYPAGE_DATA?.isLocalUser;

    const commonJsonContent = {
      username: form.querySelector('[name="username"]').value,
      phone: form.querySelector('[name="phone"]').value,
      profileImage: base64Data
    }

    if(isLocalUser){
      commonJsonContent.currentPassword = form.querySelector('[name="currentPassword"]').value;
      commonJsonContent.newPassword = form.querySelector('[name="newPassword"]').value;
      commonJsonContent.newPasswordConfirm = form.querySelector('[name="newPasswordConfirm"]').value;
    }

    const res = await fetch('/api/users/mypage', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(commonJsonContent),
    }).catch(() => null);

    const data = res ? await res.json().catch(() => null) : null;

    if (res && res.ok) {
      showMessage(successEl, data?.body || '회원 정보가 저장되었습니다.');
    } else {
      showMessage(errorEl, data?.message || '저장에 실패했습니다.');
    }
  });
}

document.addEventListener('DOMContentLoaded', function () {
  initProfilePreview();
  initProfileUpdate();
});
