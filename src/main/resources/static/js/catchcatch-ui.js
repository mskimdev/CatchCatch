(function () {

  /* ── 캐러셀 ─────────────────────────────────── */
  function initCarousel() {
    const track = document.querySelector('[data-carousel-track]');
    const dotWrap = document.querySelector('[data-carousel-dots]');
    if (!track || !dotWrap) return;

    const slides = Array.from(track.children);
    const dots = Array.from(dotWrap.querySelectorAll('.cc-hero__dot'));
    if (slides.length <= 1) return;

    let index = 0;
    function move(nextIndex) {
      index = (nextIndex + slides.length) % slides.length;
      track.style.transform = `translateX(${-index * 100}%)`;
      dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
    }

    dots.forEach((dot, i) => dot.addEventListener('click', () => move(i)));
    setInterval(() => move(index + 1), 4500);
  }

  /* ── 좌석 선택 카운트다운 ────────────────────── */
  function initCountdown() {
    const timer = document.querySelector('[data-countdown]');
    if (!timer) return;
    let seconds = Number(timer.dataset.countdown || 0);
    if (!seconds) return;

    function render() {
      const min = String(Math.floor(seconds / 60)).padStart(2, '0');
      const sec = String(seconds % 60).padStart(2, '0');
      timer.textContent = `${min}:${sec}`;
      if (seconds > 0) seconds -= 1;
    }
    render();
    setInterval(render, 1000);
  }

  /* ── 좌석 선택 토글 ─────────────────────────── */
  function initSeatPreview() {
    document.querySelectorAll('.cc-seat-dot').forEach((seat) => {
      seat.addEventListener('click', () => {
        if (seat.classList.contains('cc-seat-dot--sold') || seat.classList.contains('cc-seat-dot--held')) return;
        seat.classList.toggle('cc-seat-dot--selected');
        seat.textContent = seat.classList.contains('cc-seat-dot--selected') ? '✓' : '';
      });
    });
  }

  /* ── 전체 동의 체크박스 ──────────────────────── */
  function initAgreeAll() {
    // 회원가입 페이지
    const joinAll = document.getElementById('agreeAll');
    if (joinAll) {
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

    // 결제 페이지
    const payAll = document.getElementById('payAgreeAll');
    if (payAll) {
      const items = document.querySelectorAll('.pay-agree-item');
      payAll.addEventListener('change', () => {
        items.forEach(cb => { cb.checked = payAll.checked; });
      });
      items.forEach(cb => {
        cb.addEventListener('change', () => {
          payAll.checked = Array.from(items).every(c => c.checked);
        });
      });
    }
  }

  /* ── 비밀번호 표시 토글 ──────────────────────── */
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

  function initUserMenu() {
    document.querySelectorAll('[data-user-menu]').forEach((menu) => {
      const button = menu.querySelector('[data-user-menu-button]');
      if (!button) return;

      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const willOpen = !menu.classList.contains('is-open');
        document.querySelectorAll('[data-user-menu]').forEach((other) => {
          other.classList.remove('is-open');
          const otherButton = other.querySelector('[data-user-menu-button]');
          if (otherButton) otherButton.setAttribute('aria-expanded', 'false');
        });
        menu.classList.toggle('is-open', willOpen);
        button.setAttribute('aria-expanded', String(willOpen));
      });
    });

    document.addEventListener('click', () => {
      document.querySelectorAll('[data-user-menu]').forEach((menu) => {
        menu.classList.remove('is-open');
        const button = menu.querySelector('[data-user-menu-button]');
        if (button) button.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      document.querySelectorAll('[data-user-menu]').forEach((menu) => {
        menu.classList.remove('is-open');
        const button = menu.querySelector('[data-user-menu-button]');
        if (button) button.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ── 결제 수단 선택 ─────────────────────────── */
  function initPayMethods() {
    document.querySelectorAll('.cc-pay-method').forEach((label) => {
      label.addEventListener('click', () => {
        document.querySelectorAll('.cc-pay-method').forEach(l => l.classList.remove('is-active'));
        label.classList.add('is-active');
      });
    });
  }

  /* ── 탭 네비게이션 (콘서트 상세) ──────────────── */
  function initDetailTabs() {
    document.querySelectorAll('.cc-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.cc-tab').forEach(t => t.classList.remove('is-active'));
        tab.classList.add('is-active');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initCarousel();
    initCountdown();
    initSeatPreview();
    initAgreeAll();
    initPasswordToggle();
    initProfilePreview();
    initUserMenu();
    initPayMethods();
    initDetailTabs();
  });

})();
