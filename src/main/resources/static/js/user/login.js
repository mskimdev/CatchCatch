(function () {
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

  document.addEventListener('DOMContentLoaded', initPasswordToggle);
})();
