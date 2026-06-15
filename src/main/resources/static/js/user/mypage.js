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

document.addEventListener('DOMContentLoaded', function () {
  initProfilePreview();
  initProfileModeToggle();
  initProfileUpdate();
  initPrivacyMasking();
  initPointModal();
});

function unwrapBody(data) {
  return data?.body ?? data?.data ?? data;
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeToast(message, type = 'success') {
  if (window.CcUI?.toast) {
    CcUI.toast(message, type);
  } else {
    alert(message);
  }
}

function safeAlert(message, type = 'info') {
  if (window.CcUI?.alert) {
    CcUI.alert(message, type);
  } else {
    alert(message);
  }
}

window.pointModalLastFocusedElement = null;

function initPointModal() {
  const btnOpen = document.getElementById('btnOpenPointModal');
  const btnClose = document.getElementById('btnClosePointModal');
  const overlay = document.getElementById('pointModalOverlay');

  if (btnOpen) {
    btnOpen.addEventListener('click', openPointModal);
  }

  if (btnClose) {
    btnClose.addEventListener('click', closePointModal);
  }

  if (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        closePointModal();
      }
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay?.classList.contains('is-open')) {
      closePointModal();
    }
  });
}

async function openPointModal() {
  const overlay = document.getElementById('pointModalOverlay');
  const content = document.getElementById('pointModalContent');
  const btnClose = document.getElementById('btnClosePointModal');

  if (!overlay || !content) {
    console.error('pointModalOverlay 또는 pointModalContent 엘리먼트가 없습니다.');
    return;
  }

  window.pointModalLastFocusedElement = document.activeElement;

  overlay.removeAttribute('inert');
  overlay.classList.add('is-open');
  overlay.setAttribute('aria-hidden', 'false');

  content.innerHTML = `
    <p class="cc-modal-loading-text">
      내역을 조회 중입니다...
    </p>
  `;

  requestAnimationFrame(() => {
    btnClose?.focus();
  });

  try {
    const response = await fetch('/api/points/expiring');

    if (!response.ok) {
      throw new Error(`서버 응답 에러: ${response.status}`);
    }

    const data = await response.json();
    const expiringList = unwrapBody(data);

    renderExpiringView(expiringList);
  } catch (error) {
    console.error('포인트 조회 실패:', error);
    closePointModal();
    safeAlert('포인트 내역을 불러오지 못했습니다.', 'error');
  }
}

function renderExpiringView(list) {
  const content = document.getElementById('pointModalContent');
  if (!content) return;

  let html = `
    <h3 style="font-size:16px; font-weight:bold; margin-bottom:16px; color:#1e293b;">
      30일 내 소멸 예정 포인트
    </h3>
  `;

  if (!Array.isArray(list) || list.length === 0) {
    html += `
      <p style="text-align:center; color:#64748b; margin:30px 0; font-size:13px;">
        30일 이내에 소멸 예정인 포인트가 없습니다. 🥳
      </p>
    `;
  } else {
    html += `
      <ul style="list-style:none; padding:0; margin:0 0 20px 0; max-height:200px; overflow-y:auto;">
    `;

    list.forEach(item => {
      const title = escapeHtml(item.title);
      const balance = Number(item.balance ?? 0).toLocaleString();
      const expiredAt = escapeHtml(item.expiredAt);

      html += `
        <li style="padding:10px 0; border-bottom:1px solid #f1f5f9; font-size:13px; display:flex; justify-content:space-between; gap:12px;">
          <span style="color:#334155;">${title}</span>
          <span style="color:#ef4444; font-weight:600; white-space:nowrap;">
            ${balance}P
            <span style="font-size:11px; color:#94a3b8; font-weight:400;">(${expiredAt})</span>
          </span>
        </li>
      `;
    });

    html += `</ul>`;
  }

  html += `
    <div style="text-align:center; margin-top:15px; border-top:1px solid #e2e8f0; padding-top:15px;">
      <button type="button"
              id="btnLoadAllPointHistory"
              style="background:none; border:none; color:#0284c7; font-size:12px; font-weight:600; cursor:pointer; text-decoration:underline;">
        전체 이용 내역 보기
      </button>
    </div>
  `;

  content.innerHTML = html;

  const btnLoadAll = document.getElementById('btnLoadAllPointHistory');

  if (btnLoadAll) {
    btnLoadAll.addEventListener('click', loadAllHistory);
  }
}

async function loadAllHistory() {
  const content = document.getElementById('pointModalContent');
  if (!content) return;

  content.innerHTML = `
    <p class="cc-modal-loading-text">
      전체 내역을 조회 중입니다...
    </p>
  `;

  try {
    const response = await fetch('/api/points/history');

    if (!response.ok) {
      throw new Error(`서버 응답 에러: ${response.status}`);
    }

    const data = await response.json();
    const historyList = unwrapBody(data);

    let html = `
      <h3 style="font-size:16px; font-weight:bold; margin-bottom:16px; color:#1e293b;">
        전체 포인트 이용 내역
      </h3>
      <ul style="list-style:none; padding:0; margin:0; max-height:250px; overflow-y:auto;">
    `;

    if (!Array.isArray(historyList) || historyList.length === 0) {
      html += `
        <p style="text-align:center; color:#64748b; margin:30px 0; font-size:13px;">
          포인트 이용 내역이 존재하지 않습니다.
        </p>
      `;
    } else {
      historyList.forEach(item => {
        const typeLabel = escapeHtml(item.typeLabel);
        const title = escapeHtml(item.title);
        const createdAt = escapeHtml(item.createdAt);

        const amount = Number(item.amount ?? 0);
        const isEarn = amount > 0;
        const color = isEarn ? '#10b981' : '#ef4444';
        const amountText = `${isEarn ? '+' : ''}${amount.toLocaleString()}P`;

        html += `
          <li style="padding:10px 0; border-bottom:1px solid #f1f5f9; font-size:13px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:2px; gap:12px;">
              <strong style="color:#334155;">[${typeLabel}] ${title}</strong>
              <span style="color:${color}; font-weight:600; white-space:nowrap;">
                ${amountText}
              </span>
            </div>
            <span style="font-size:11px; color:#94a3b8;">${createdAt}</span>
          </li>
        `;
      });
    }

    html += `</ul>`;

    content.innerHTML = html;
  } catch (error) {
    console.error('전체 내역 조회 실패:', error);
    safeToast('전체 내역을 불러오지 못했습니다.', 'error');
  }
}

function closePointModal() {
  const overlay = document.getElementById('pointModalOverlay');

  if (!overlay) return;

  const activeElement = document.activeElement;

  if (activeElement && overlay.contains(activeElement)) {
    if (
      window.pointModalLastFocusedElement &&
      typeof window.pointModalLastFocusedElement.focus === 'function'
    ) {
      window.pointModalLastFocusedElement.focus();
    } else {
      activeElement.blur();
    }
  }

  overlay.classList.remove('is-open');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.setAttribute('inert', '');

  window.pointModalLastFocusedElement = null;
}