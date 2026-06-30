function initPasswordToggle() {
  document.querySelectorAll('[data-toggle-pw]').forEach((eye) => {
    eye.addEventListener('click', () => {
      const input = document.getElementById(eye.dataset.togglePw);
      if (!input) return;
      const isVisible = input.type === 'password';
      input.type = isVisible ? 'text' : 'password';
      eye.classList.toggle('is-visible', isVisible);
      eye.setAttribute('aria-pressed', String(isVisible));
      eye.setAttribute('aria-label', isVisible ? '비밀번호 숨기기' : '비밀번호 보기');
    });
  });
}

function initResetPassword() {
  const emailInput = document.getElementById('email');
  const sendBtn = document.getElementById('sendCodeBtn');
  const verifyRow = document.getElementById('verifyCodeRow');
  const codeInput = document.getElementById('verifyCode');
  const verifyBtn = document.getElementById('verifyCodeBtn');
  const statusEl = document.getElementById('verifyStatus');
  const newPasswordSection = document.getElementById('newPasswordSection');
  const newPasswordInput = document.getElementById('newPassword');
  const newPasswordConfirmInput = document.getElementById('newPasswordConfirm');
  const resetStatusEl = document.getElementById('resetStatus');
  const form = document.getElementById('resetPasswordForm');
  if (!emailInput || !sendBtn || !form) return;

  let timerInterval = null;
  let emailVerified = false;

  const ICONS = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:15px;height:15px;vertical-align:-2px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:15px;height:15px;vertical-align:-2px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:15px;height:15px;vertical-align:-2px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  };

  function setStatus(msg, type) {
    statusEl.innerHTML = msg ? (ICONS[type] || '') + ' ' + msg : '';
    statusEl.className = 'cc-verify-status cc-verify-status--' + type;
  }

  function setResetStatus(msg, type) {
    resetStatusEl.innerHTML = msg ? (ICONS[type] || '') + ' ' + msg : '';
    resetStatusEl.className = 'cc-verify-status cc-verify-status--' + type;
  }

  function startTimer(seconds) {
    clearInterval(timerInterval);
    sendBtn.disabled = true;
    let remaining = seconds;
    const update = () => {
      const m = String(Math.floor(remaining / 60)).padStart(2, '0');
      const s = String(remaining % 60).padStart(2, '0');
      sendBtn.textContent = '재발송 (' + m + ':' + s + ')';
      if (remaining-- <= 0) {
        clearInterval(timerInterval);
        sendBtn.disabled = false;
        sendBtn.textContent = '재발송';
        setStatus('인증 시간이 만료됐습니다. 다시 발송해 주세요.', 'error');
      }
    };
    update();
    timerInterval = setInterval(update, 1000);
  }

  sendBtn.addEventListener('click', async function () {
    const email = emailInput.value.trim();
    if (!email || !email.includes('@')) {
      setStatus('올바른 이메일을 입력해 주세요.', 'error');
      return;
    }
    sendBtn.disabled = true;
    sendBtn.textContent = '발송 중...';
    setStatus('', '');

    const body = new URLSearchParams({ email });
    const res = await fetch('/api/email/send-code', { method: 'POST', body }).catch(() => null);
    const data = res && res.ok ? await res.json().catch(() => null) : null;

    if (data && data.status === 200) {
      verifyRow.style.display = 'flex';
      codeInput.focus();
      setStatus('인증 코드를 이메일로 발송했습니다. (3분 내 입력)', 'info');
      startTimer(180);
    } else {
      sendBtn.disabled = false;
      sendBtn.textContent = '인증코드 발송';
      setStatus((data && data.msg) || '발송에 실패했습니다. 다시 시도해 주세요.', 'error');
    }
  });

  verifyBtn.addEventListener('click', async function () {
    const email = emailInput.value.trim();
    const code = codeInput.value.trim();
    if (!code) { setStatus('인증 코드를 입력해 주세요.', 'error'); return; }

    verifyBtn.disabled = true;
    verifyBtn.textContent = '확인 중...';

    const body = new URLSearchParams({ email, code });
    const res = await fetch('/api/email/verify-code', { method: 'POST', body }).catch(() => null);
    const data = res && res.ok ? await res.json().catch(() => null) : null;

    if (data && data.status === 200) {
      clearInterval(timerInterval);
      emailVerified = true;
      emailInput.readOnly = true;
      codeInput.disabled = true;
      sendBtn.disabled = true;
      verifyBtn.disabled = true;
      sendBtn.textContent = '발송 완료';
      verifyBtn.textContent = '인증 완료';
      setStatus('이메일 인증이 완료됐습니다.', 'success');
      newPasswordSection.style.display = 'block';
      newPasswordInput.focus();
    } else {
      verifyBtn.disabled = false;
      verifyBtn.textContent = '인증 확인';
      setStatus((data && data.msg) || '인증 코드가 올바르지 않습니다.', 'error');
    }
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!emailVerified) {
      setStatus('이메일 인증을 완료해 주세요.', 'error');
      sendBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const newPassword = newPasswordInput.value;
    const newPasswordConfirm = newPasswordConfirmInput.value;
    if (!newPassword || newPassword.length < 8) {
      setResetStatus('비밀번호는 8자 이상이어야 합니다.', 'error');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setResetStatus('비밀번호가 일치하지 않습니다.', 'error');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    setResetStatus('', '');

    const body = new URLSearchParams({ email: emailInput.value.trim(), newPassword, newPasswordConfirm });
    const res = await fetch('/api/password-reset', { method: 'POST', body }).catch(() => null);
    const data = res ? await res.json().catch(() => null) : null;

    if (res && res.ok && data && data.status === 200) {
      setResetStatus('비밀번호가 변경됐습니다. 로그인 페이지로 이동합니다.', 'success');
      setTimeout(() => { window.location.href = '/login'; }, 1500);
    } else {
      submitBtn.disabled = false;
      setResetStatus((data && (data.msg || data.message)) || '비밀번호 변경에 실패했습니다.', 'error');
    }
  });
}

document.addEventListener('DOMContentLoaded', function () {
  initPasswordToggle();
  initResetPassword();
});
