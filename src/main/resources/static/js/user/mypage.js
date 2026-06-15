// 1. 프로필 이미지 미리보기
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

// 2. 조회/수정 모드 토글 (새로 추가된 부분)
function initProfileModeToggle() {
  const viewMode = document.getElementById('profileViewMode');
  const editMode = document.getElementById('profileEditMode');
  const btnShowEdit = document.getElementById('btnShowEditForm');
  const btnCancelEdit = document.getElementById('btnCancelEdit');

  if (!viewMode || !editMode) return;

  // '회원 정보 수정하기' 클릭 시 수정 모드로
  if (btnShowEdit) {
    btnShowEdit.addEventListener('click', () => {
      viewMode.style.display = 'none';
      editMode.style.display = 'block';
    });
  }

  // '취소' 클릭 시 조회 모드로
  if (btnCancelEdit) {
    btnCancelEdit.addEventListener('click', () => {
      editMode.style.display = 'none';
      viewMode.style.display = 'block';

      // 취소 시 입력했던 폼 초기화 (선택 사항)
      document.getElementById('profileForm')?.reset();
    });
  }
}

// 3. 폼 전송 및 업데이트
function initProfileUpdate() {
  const form = document.getElementById('profileForm');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const file = form.querySelector('[name="profileImage"]').files[0];
    // toBase64는 외부에 정의되어 있다고 가정합니다.
    const base64Data = file ? await toBase64(file) : null;

    const isLocalUser = window.MYPAGE_DATA?.isLocalUser;

    const body = {
      username: form.querySelector('[name="username"]').value,
      phone: form.querySelector('[name="phone"]').value,
      profileImage: base64Data,
    };

    // 로컬 유저일 경우에만 비밀번호 값 할당
    if (isLocalUser) {
      body.currentPassword    = form.querySelector('[name="currentPassword"]').value;
      body.newPassword        = form.querySelector('[name="newPassword"]').value;
      body.newPasswordConfirm = form.querySelector('[name="newPasswordConfirm"]').value;

      // 새 비밀번호 유효성 검사
      if(body.newPassword && body.newPassword !== body.newPasswordConfirm) {
        CcUI.toast("비밀번호를 확인해주세요.", 'warning');
        return;
      }
    }

    CcUI.loading.show('저장 중입니다...');
    const { res, data } = await apiPut('/api/users/mypage', body);
    CcUI.loading.hide();

    if (res && res.ok) {
      CcUI.toast(data?.body || '회원 정보가 저장되었습니다.');

      // 저장 성공 시, 조회 화면에 변경된 정보를 반영하기 위해 페이지 새로고침
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } else {
      CcUI.toast(data?.message || '저장에 실패했습니다.', 'error');
    }

    // 초기화: 요소가 존재하는지 확인 후(Optional Chaining) 초기화하여 소셜 로그인 유저 에러 방지
    const currentPwdInput = form.querySelector('[name="currentPassword"]');
    const newPwdInput = form.querySelector('[name="newPassword"]');
    const newPwdConfirmInput = form.querySelector('[name="newPasswordConfirm"]');

    if (currentPwdInput) currentPwdInput.value = "";
    if (newPwdInput) newPwdInput.value = "";
    if (newPwdConfirmInput) newPwdConfirmInput.value = "";
  });
}

// 4. DOM 로드 시 실행
document.addEventListener('DOMContentLoaded', function () {
  initProfilePreview();
  initProfileModeToggle(); // 토글 기능 초기화 추가
  initProfileUpdate();
});

// 5. 이메일 및 전화번호 마스킹 처리 함수
function initPrivacyMasking() {
  // --- 이메일 마스킹 ---
  const emailElem = document.getElementById('viewEmail');
  if (emailElem && emailElem.dataset.email) {
    const email = emailElem.dataset.email;
    const [name, domain] = email.split('@');

    if (name && domain) {
      // 앞 3자리만 자르고, 나머지는 이름 길이만큼 * 처리 (이름이 3자리 이하면 * 없음)
      const visibleName = name.substring(0, 3);
      const hiddenName = '*'.repeat(Math.max(name.length - 3, 0));
      emailElem.textContent = `${visibleName}${hiddenName}@${domain}`;
    } else {
      // 이메일 형식이 아닐 경우 예외 처리
      emailElem.textContent = email;
    }
  }

  // --- 전화번호 마스킹 ---
  const phoneElem = document.getElementById('viewPhone');
  if (phoneElem && phoneElem.dataset.phone) {
    const phone = phoneElem.dataset.phone;

    // 정규식을 이용해 가운데 3~4자리 숫자를 ****로 변경
    // 하이픈이 있든 없든 010-****-1234 형태로 포맷팅합니다.
    const maskedPhone = phone.replace(/(\d{2,3})-?(\d{3,4})-?(\d{4})/, '$1-****-$3');
    phoneElem.textContent = maskedPhone;
  }
}

// 기존 DOMContentLoaded에 마스킹 함수 실행 추가
document.addEventListener('DOMContentLoaded', function () {
  initProfilePreview();
  initProfileModeToggle();
  initProfileUpdate();

  // 새로 추가된 마스킹 함수 호출
  initPrivacyMasking();
});