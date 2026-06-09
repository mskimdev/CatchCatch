(function () {
  function initDetailTabs() {
    document.querySelectorAll('.cc-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.cc-tab').forEach(t => t.classList.remove('is-active'));
        tab.classList.add('is-active');
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

  function initBookingSectionToggle() {
    document.querySelectorAll('[data-section-toggle]').forEach(function (toggleButton) {
      toggleButton.addEventListener('click', function () {
        const section = toggleButton.closest('[data-booking-section]');
        if (!section) return;
        section.classList.toggle('is-collapsed');
      });
    });
  }

  function extractDateFromText(text) {
    if (!text) return '';
    const dotMatch = text.match(/(\d{4})\.(\d{2})\.(\d{2})/);
    if (dotMatch) return dotMatch[1] + '-' + dotMatch[2] + '-' + dotMatch[3];
    const dashMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dashMatch) return dashMatch[1] + '-' + dashMatch[2] + '-' + dashMatch[3];
    return '';
  }

  function updateSessionSummary(sessionSelect, sessionSummary) {
    if (!sessionSelect || !sessionSummary) return;
    const selectedOption = Array.from(sessionSelect.options).find(opt => opt.value === sessionSelect.value);
    sessionSummary.textContent = selectedOption ? selectedOption.textContent.trim() : '';
  }

  function filterSessionsByDate(form, selectedDate) {
    if (!form || !selectedDate) return;
    const sessionSelect = form.querySelector('.bookingSessionSelect');
    const sessionList = form.querySelector('.cc-session-card-list');
    const sessionSummary = form.querySelector('[data-selected-session-summary]');
    if (!sessionSelect || !sessionList) return;

    const buttons = Array.from(sessionList.querySelectorAll('.cc-session-card'));
    let firstVisibleButton = null;

    buttons.forEach(function (button) {
      if (!button.dataset.sessionDate) {
        const option = Array.from(sessionSelect.options).find(item => item.value === button.dataset.sessionValue);
        if (option) {
          const foundDate = extractDateFromText(option.textContent);
          if (foundDate) button.dataset.sessionDate = foundDate;
        }
      }
      const shouldShow = !button.dataset.sessionDate || button.dataset.sessionDate === selectedDate;
      button.hidden = !shouldShow;
      if (shouldShow && !firstVisibleButton) firstVisibleButton = button;
    });

    const currentButton = buttons.find(button => button.dataset.sessionValue === sessionSelect.value && !button.hidden);
    if (currentButton) {
      buttons.forEach(button => button.classList.remove('is-selected'));
      currentButton.classList.add('is-selected');
      updateSessionSummary(sessionSelect, sessionSummary);
      return;
    }
    if (firstVisibleButton) {
      firstVisibleButton.click();
    } else {
      sessionSelect.value = '';
      if (sessionSummary) sessionSummary.textContent = '';
    }
  }

  function initCalendarPicker() {
    document.querySelectorAll('.cc-calendar-picker').forEach(function (picker) {
      const selectId = picker.dataset.calendarFor;
      const dateSelect = document.getElementById(selectId);
      const title = picker.querySelector('.cc-calendar-title');
      const grid = picker.querySelector('.cc-calendar-grid');
      const form = picker.closest('form');
      const dateSummary = form ? form.querySelector('[data-selected-date-summary]') : null;

      if (!dateSelect || !title || !grid) return;

      const availableDates = Array.from(dateSelect.options)
        .filter(option => option.value)
        .map(option => ({ value: option.value, label: option.textContent.trim() }));

      if (availableDates.length === 0) return;

      const availableMap = {};
      availableDates.forEach(date => { availableMap[date.value] = date.label; });

      const minDate = new Date(availableDates[0].value + 'T00:00:00');
      const maxDate = new Date(availableDates[availableDates.length - 1].value + 'T00:00:00');

      if (!dateSelect.value) dateSelect.value = availableDates[0].value;

      let viewDate = new Date(dateSelect.value + 'T00:00:00');

      function isSameMonth(a, b) {
        return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
      }

      function updateDateSummary() {
        if (!dateSummary) return;
        dateSummary.textContent = availableMap[dateSelect.value] || '';
      }

      function updateArrowState() {
        const prevButton = picker.querySelector('[data-calendar-prev]');
        const nextButton = picker.querySelector('[data-calendar-next]');
        if (prevButton) prevButton.disabled = isSameMonth(viewDate, minDate);
        if (nextButton) nextButton.disabled = isSameMonth(viewDate, maxDate);
      }

      function renderCalendar() {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        title.textContent = year + '. ' + String(month + 1).padStart(2, '0');

        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();
        grid.innerHTML = '';

        for (let i = 0; i < firstDay; i++) {
          const empty = document.createElement('button');
          empty.type = 'button';
          empty.className = 'cc-calendar-day is-empty';
          empty.tabIndex = -1;
          grid.appendChild(empty);
        }

        for (let day = 1; day <= lastDate; day++) {
          const value = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'cc-calendar-day';
          button.textContent = day;

          if (new Date(year, month, day).getDay() === 0) button.classList.add('is-sunday');

          if (availableMap[value]) {
            button.classList.add('is-available');
            button.addEventListener('click', function () {
              dateSelect.value = value;
              viewDate = new Date(value + 'T00:00:00');
              renderCalendar();
              updateDateSummary();
              filterSessionsByDate(form, value);
              dateSelect.dispatchEvent(new Event('change', { bubbles: true }));
            });
          }

          if (dateSelect.value === value) button.classList.add('is-selected');
          grid.appendChild(button);
        }

        updateArrowState();
        updateDateSummary();
      }

      const prevButton = picker.querySelector('[data-calendar-prev]');
      const nextButton = picker.querySelector('[data-calendar-next]');

      if (prevButton) {
        prevButton.addEventListener('click', function () {
          if (prevButton.disabled) return;
          viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
          renderCalendar();
        });
      }
      if (nextButton) {
        nextButton.addEventListener('click', function () {
          if (nextButton.disabled) return;
          viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
          renderCalendar();
        });
      }

      renderCalendar();
      filterSessionsByDate(form, dateSelect.value);
    });
  }

  function initSessionPicker() {
    document.querySelectorAll('.cc-session-card-list').forEach(function (list) {
      const selectId = list.dataset.sessionPickerFor;
      const sessionSelect = document.getElementById(selectId);
      const form = list.closest('form');
      const sessionSummary = form ? form.querySelector('[data-selected-session-summary]') : null;
      if (!sessionSelect) return;

      const buttons = list.querySelectorAll('.cc-session-card');
      buttons.forEach(function (button) {
        const option = Array.from(sessionSelect.options).find(item => item.value === button.dataset.sessionValue);
        if (option && !button.dataset.sessionDate) {
          const foundDate = extractDateFromText(option.textContent);
          if (foundDate) button.dataset.sessionDate = foundDate;
        }
        button.addEventListener('click', function () {
          sessionSelect.value = button.dataset.sessionValue;
          buttons.forEach(item => item.classList.remove('is-selected'));
          button.classList.add('is-selected');
          updateSessionSummary(sessionSelect, sessionSummary);
          sessionSelect.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });

      const firstVisible = Array.from(buttons).find(b => !b.hidden) || buttons[0];
      if (!sessionSelect.value && firstVisible) {
        firstVisible.click();
      } else {
        updateSessionSummary(sessionSelect, sessionSummary);
      }
    });
  }

  function initBookingPopupSubmit() {
    document.querySelectorAll('.bookingStartForm').forEach(function (form) {
      form.addEventListener('submit', function (event) {
        const dateSelect = form.querySelector('.bookingDateSelect');
        const sessionSelect = form.querySelector('.bookingSessionSelect');

        if (!dateSelect || !dateSelect.value) {
          event.preventDefault();
          alert('관람일을 선택해주세요.');
          return;
        }
        if (!sessionSelect || !sessionSelect.value) {
          event.preventDefault();
          alert('회차를 선택해주세요.');
          return;
        }

        window.open('', 'bookingPopup', 'width=1240,height=860,left=120,top=40,resizable=yes,scrollbars=yes');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initDetailTabs();
    initHeartStates();
    initHeartToggle();
    initBookingSectionToggle();
    initCalendarPicker();
    initSessionPicker();
    initBookingPopupSubmit();
  });
})();
