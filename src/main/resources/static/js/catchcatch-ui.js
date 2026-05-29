(function () {
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

  function initSeatPreview() {
    document.querySelectorAll('.cc-seat-dot').forEach((seat) => {
      seat.addEventListener('click', () => {
        if (seat.classList.contains('cc-seat-dot--sold') || seat.classList.contains('cc-seat-dot--held')) return;
        seat.classList.toggle('cc-seat-dot--selected');
        seat.textContent = seat.classList.contains('cc-seat-dot--selected') ? '✓' : '';
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initCarousel();
    initCountdown();
    initSeatPreview();
  });
})();
