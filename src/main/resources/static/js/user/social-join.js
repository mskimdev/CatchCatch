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

document.addEventListener('DOMContentLoaded', function () {
  initProfilePreview();
  initAgreeAll();
});