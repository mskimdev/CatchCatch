const ICONS = {
  success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:15px;height:15px;vertical-align:-2px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
  error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:15px;height:15px;vertical-align:-2px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>',
};

document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('findIdForm');
  const usernameInput = document.getElementById('username');
  const phoneInput = document.getElementById('phone');
  const statusEl = document.getElementById('findIdStatus');
  const submitBtn = form.querySelector('button[type="submit"]');
  if (!form) return;

  function setStatus(msg, type) {
    statusEl.innerHTML = msg ? (ICONS[type] || '') + ' ' + msg : '';
    statusEl.className = 'cc-verify-status cc-verify-status--' + type;
  }

  function formatPhone(value) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length < 4) return digits;
    if (digits.length < 8) return digits.replace(/(\d{3})(\d+)/, '$1-$2');
    if (digits.length === 10) return digits.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    return digits.replace(/(\d{3})(\d{4})(\d{1,4})/, '$1-$2-$3');
  }

  phoneInput.addEventListener('input', function () {
    phoneInput.value = formatPhone(phoneInput.value);
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const username = usernameInput.value.trim();
    const phone = formatPhone(phoneInput.value.trim());
    if (!username || !phone) {
      setStatus('아이디와 휴대폰 번호를 모두 입력해 주세요.', 'error');
      return;
    }

    submitBtn.disabled = true;
    setStatus('', '');

    const body = new URLSearchParams({ username, phone });
    const res = await fetch('/api/find-id', { method: 'POST', body }).catch(() => null);
    const data = res ? await res.json().catch(() => null) : null;

    submitBtn.disabled = false;

    if (res && res.ok && data && data.status === 200) {
      setStatus('회원님의 이메일은 <strong>' + data.body + '</strong> 입니다.', 'success');
      form.reset();
    } else {
      setStatus((data && (data.msg || data.message)) || '일치하는 회원 정보를 찾을 수 없습니다.', 'error');
    }
  });
});
