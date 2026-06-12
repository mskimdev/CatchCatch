(function () {
  function initTextareaCounter() {
    const textarea = document.getElementById('content');
    const counter = document.getElementById('contentLength');
    if (!textarea || !counter) return;
    textarea.addEventListener('input', () => { counter.textContent = textarea.value.length; });
  }

  document.addEventListener('DOMContentLoaded', initTextareaCounter);
})();
