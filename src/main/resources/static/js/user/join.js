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

function initAgreeAll() {
  const joinAll = document.getElementById('agreeAll');
  if (!joinAll) return;
  const items = document.querySelectorAll('.agree-item');
  joinAll.addEventListener('change', () => {
    items.forEach(cb => { cb.checked = joinAll.checked; });
  });
  items.forEach(cb => {
    cb.addEventListener('change', () => {
      joinAll.checked = Array.from(items).every(c => c.checked);
    });
  });
}

function initEmailVerification() {
  const emailInput = document.getElementById('email');
  const sendBtn = document.getElementById('sendCodeBtn');
  const verifyRow = document.getElementById('verifyCodeRow');
  const codeInput = document.getElementById('verifyCode');
  const verifyBtn = document.getElementById('verifyCodeBtn');
  const statusEl = document.getElementById('verifyStatus');
  const verifiedHidden = document.getElementById('emailVerified');
  const joinForm = document.querySelector('form[action="/join"]');
  if (!emailInput || !sendBtn || !joinForm) return;

  const csrfParam = joinForm.querySelector('input[name$="csrf"]') || joinForm.querySelector('input[name="_csrf"]');
  let timerInterval = null;

  function getCsrfHeaders() {
    if (!csrfParam) return {};
    return { [csrfParam.name]: csrfParam.value };
  }

  const ICONS = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:15px;height:15px;vertical-align:-2px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:15px;height:15px;vertical-align:-2px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:15px;height:15px;vertical-align:-2px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  };

  function setStatus(msg, type) {
    statusEl.innerHTML = msg ? (ICONS[type] || '') + ' ' + msg : '';
    statusEl.className = 'cc-verify-status cc-verify-status--' + type;
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

    const body = new URLSearchParams({ email, ...getCsrfHeaders() });
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

    const body = new URLSearchParams({ email, code, ...getCsrfHeaders() });
    const res = await fetch('/api/email/verify-code', { method: 'POST', body }).catch(() => null);
    const data = res && res.ok ? await res.json().catch(() => null) : null;

    if (data && data.status === 200) {
      clearInterval(timerInterval);
      verifiedHidden.value = 'true';
      emailInput.readOnly = true;
      codeInput.disabled = true;
      sendBtn.disabled = true;
      verifyBtn.disabled = true;
      sendBtn.textContent = '발송 완료';
      verifyBtn.textContent = '인증 완료';
      setStatus('이메일 인증이 완료됐습니다.', 'success');
    } else {
      verifyBtn.disabled = false;
      verifyBtn.textContent = '인증 확인';
      setStatus((data && data.msg) || '인증 코드가 올바르지 않습니다.', 'error');
    }
  });

  joinForm.addEventListener('submit', function (e) {
    if (verifiedHidden.value !== 'true') {
      e.preventDefault();
      setStatus('이메일 인증을 완료해 주세요.', 'error');
      document.getElementById('sendCodeBtn').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

document.addEventListener('DOMContentLoaded', function () {
  initPasswordToggle();
  initProfilePreview();
  initAgreeAll();
  initEmailVerification();
});