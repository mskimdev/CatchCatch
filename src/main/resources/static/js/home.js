function initCarousel() {
  const track = document.querySelector('[data-carousel-track]');
  const dotWrap = document.querySelector('[data-carousel-dots]');
  if (!track || !dotWrap) return;

  const slides = Array.from(track.children).filter(slide => slide.classList.contains('cc-hero__slide'));
  if (!slides.length) {
    dotWrap.hidden = true;
    return;
  }

  let index = 0;
  function move(nextIndex) {
    index = (nextIndex + slides.length) % slides.length;
    track.style.transform = `translateX(${-index * 100}%)`;
    dots.forEach((dot, i) => {
      const active = i === index;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-current', active ? 'true' : 'false');
    });
  }

  dotWrap.replaceChildren();
  dotWrap.hidden = slides.length <= 1;

  if (slides.length <= 1) {
    track.style.transform = 'translateX(0)';
    return;
  }

  const dots = slides.map((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'cc-hero__dot';
    dot.type = 'button';
    dot.setAttribute('aria-label', `${i + 1}번 배너`);
    dot.addEventListener('click', () => move(i));
    dotWrap.appendChild(dot);
    return dot;
  });

  move(0);
  setInterval(() => move(index + 1), 4500);
}

function fitHeroText() {
  const slides = document.querySelectorAll('.cc-hero__slide');
  const isMobile = window.matchMedia('(max-width: 600px)').matches;

  slides.forEach(slide => {
    const content = slide.querySelector('.cc-hero__content');
    const eyebrow = slide.querySelector('.cc-hero__eyebrow');
    const title = slide.querySelector('.cc-hero__title');
    const desc = slide.querySelector('.cc-hero__desc');
    if (!content || !title) return;

    slide.classList.remove('is-compact', 'is-dense');
    if (eyebrow) eyebrow.style.removeProperty('font-size');
    title.style.removeProperty('font-size');
    if (desc) desc.style.removeProperty('font-size');

    const fits = () => {
      const singleLineItems = [eyebrow, title].filter(Boolean);
      const lineFits = singleLineItems.every(item => item.scrollWidth <= item.clientWidth);

      return lineFits && content.scrollHeight <= content.clientHeight && content.scrollWidth <= content.clientWidth;
    };
    if (fits()) return;

    slide.classList.add('is-compact');
    if (fits()) return;

    slide.classList.add('is-dense');
    if (fits()) return;

    let eyebrowSize = eyebrow ? parseFloat(getComputedStyle(eyebrow).fontSize) : 0;
    let titleSize = parseFloat(getComputedStyle(title).fontSize);
    let descSize = desc ? parseFloat(getComputedStyle(desc).fontSize) : 0;
    const minEyebrowSize = isMobile ? 10 : 11;
    const minTitleSize = isMobile ? 16 : 18;
    const minDescSize = isMobile ? 12 : 13;

    while (!fits() && (titleSize > minTitleSize || eyebrowSize > minEyebrowSize || descSize > minDescSize)) {
      if (titleSize > minTitleSize) {
        titleSize -= 1;
        title.style.fontSize = `${titleSize}px`;
      }

      if (eyebrow && eyebrowSize > minEyebrowSize) {
        eyebrowSize -= 0.5;
        eyebrow.style.fontSize = `${eyebrowSize}px`;
      }

      if (desc && descSize > minDescSize) {
        descSize -= 0.5;
        desc.style.fontSize = `${descSize}px`;
      }
    }
  });
}

function initHeroTextFit() {
  fitHeroText();
  if (document.fonts) document.fonts.ready.then(fitHeroText);

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitHeroText, 120);
  });
}

async function initHeartStates() {
  const buttons = document.querySelectorAll('.cc-heart[data-concert-id]');
  if (!buttons.length) return;

  const res = await fetch('/api/concerts/liked-ids').catch(() => null);
  const data = res && res.ok ? await res.json().catch(() => null) : null;
  if (!data || data.status !== 200 || !Array.isArray(data.body)) return;

  const likedSet = new Set(data.body);
  buttons.forEach(btn => {
    const id = Number(btn.dataset.concertId);
    if (!likedSet.has(id)) return;
    btn.classList.add('is-liked');
    btn.setAttribute('aria-pressed', 'true');
    btn.setAttribute('aria-label', '관심 공연 취소');
    btn.querySelector('svg').setAttribute('fill', 'currentColor');
  });
}

function initHeartToggle() {
  const csrfMeta = document.querySelector('meta[name="csrf-token"]');

  document.addEventListener('click', async function (e) {
    const btn = e.target.closest('.cc-heart[data-concert-id]');
    if (!btn) return;

    const concertId = btn.dataset.concertId;
    const body = new URLSearchParams();
    if (csrfMeta) body.append(csrfMeta.dataset.param, csrfMeta.content);

    const res = await fetch(`/api/concerts/${concertId}/like`, {
      method: 'POST', body
    }).catch(() => null);

    if (res && res.status === 401) {
      const err = await res.json().catch(() => null);
      alert(err?.message || '로그인 먼저 해주세요');
      location.href = '/login';
      return;
    }

    const data = res && res.ok ? await res.json().catch(() => null) : null;
    if (!data || data.status !== 200) return;

    const liked = data.body;
    btn.classList.toggle('is-liked', liked);
    btn.setAttribute('aria-pressed', String(liked));
    btn.setAttribute('aria-label', liked ? '관심 공연 취소' : '관심 공연 등록');
    btn.querySelector('svg').setAttribute('fill', liked ? 'currentColor' : 'none');
  });
}

document.addEventListener('DOMContentLoaded', function () {
  initCarousel();
  initHeroTextFit();
  initHeartStates();
  initHeartToggle();
});
