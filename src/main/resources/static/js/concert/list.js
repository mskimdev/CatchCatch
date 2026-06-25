function initFilterState() {
  const urlParams = new URLSearchParams(window.location.search);
  const currentStatus = urlParams.get('status') || 'all';
  const currentGenre = urlParams.get('genre') || 'all';
  const currentRegion = urlParams.get('region') || 'all';

  document.querySelectorAll('.cc-filter-item, .cc-chip').forEach(el => el.classList.remove('is-active'));
  document.querySelectorAll(`.cc-filter-status[href*="status=${currentStatus}"]`).forEach(el => el.classList.add('is-active'));
  document.querySelectorAll(`.cc-filter-genre[href*="genre=${currentGenre}"]`).forEach(el => el.classList.add('is-active'));
  document.querySelectorAll(`.cc-filter-region[href*="region=${currentRegion}"]`).forEach(el => el.classList.add('is-active'));
  document.querySelectorAll(`.cc-chip-status[href*="status=${currentStatus}"]`).forEach(el => el.classList.add('is-active'));
}

function initFilterLinks() {
  document.querySelectorAll('.cc-filter-item, .cc-chip').forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const linkParams = new URLSearchParams(new URL(this.href, window.location.origin).search);
      const current = new URLSearchParams(window.location.search);
      linkParams.forEach((value, key) => current.set(key, value));
      window.location.href = '/concerts?' + current.toString();
    });
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
  initFilterState();
  initFilterLinks();
  initHeartStates();
  initHeartToggle();
});