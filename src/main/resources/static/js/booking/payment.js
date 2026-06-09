(function () {
  function initPayMethods() {
    document.querySelectorAll('.cc-pay-method').forEach((label) => {
      label.addEventListener('click', () => {
        document.querySelectorAll('.cc-pay-method').forEach(l => l.classList.remove('is-active'));
        label.classList.add('is-active');
        const radio = label.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      });
    });
  }

  function initAgreeAll() {
    const payAll = document.getElementById('payAgreeAll');
    if (!payAll) return;
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

  document.addEventListener('DOMContentLoaded', function () {
    initPayMethods();
    initAgreeAll();
  });
})();
