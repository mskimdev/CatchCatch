// booking-seat.js — DB 좌석 출력 버전
document.addEventListener("DOMContentLoaded", () => {
  const MAX_SELECT_COUNT = 4;

  const dbSeats = Array.isArray(window.CATCHCATCH_SEATS)
    ? window.CATCHCATCH_SEATS
    : [];

  const gradeButtons = Array.from(document.querySelectorAll(".cc-zone-tab"));
  const zoneTitle = document.querySelector("#zoneTitle");
  const zoneSubText = document.querySelector("#zoneSubText");
  const zoneSeatGrid = document.querySelector("#zoneSeatGrid");
  const hoverInfo = document.querySelector("#seatHoverInfo");
  const resetZoneBtn = document.querySelector("#resetZoneBtn");

  const selectedList = document.querySelector(".cc-selected-list");
  const totalBox = document.querySelector(".cc-total");
  const totalPriceEl = document.querySelector(".cc-total__price");
  const paymentForm = document.querySelector(".cc-payment-form");
  const timerEl = document.querySelector("[data-countdown]");
  const selectedSeatIdsInput = document.querySelector("#selectedSeatIds");

  let selectedSeats = [];

  const gradeOrder = ["VIP", "R", "S", "A", "B"];
  let currentGrade = getFirstGrade();

  function getFirstGrade() {
    for (const grade of gradeOrder) {
      if (dbSeats.some((seat) => seat.grade === grade)) {
        return grade;
      }
    }

    return dbSeats.length > 0 ? dbSeats[0].grade : null;
  }

  function formatPrice(price) {
    return Number(price || 0).toLocaleString("ko-KR") + "원";
  }

  function getGradeName(grade) {
    if (!grade) return "";
    return grade + "석";
  }

  function getGradeClass(grade) {
    if (!grade) return "gray";
    return String(grade).toLowerCase();
  }

  function getSelectedSeatById(seatId) {
    return selectedSeats.find((seat) => String(seat.id) === String(seatId));
  }

  function getSeatsByGrade(grade) {
    return dbSeats
      .filter((seat) => seat.grade === grade)
      .sort((a, b) => {
        const rowCompare = String(a.rowName || "").localeCompare(String(b.rowName || ""));

        if (rowCompare !== 0) {
          return rowCompare;
        }

        return Number(a.seatNo || 0) - Number(b.seatNo || 0);
      });
  }

  function groupSeatsByRow(seats) {
    return seats.reduce((map, seat) => {
      const rowName = seat.rowName || seat.grade || "좌석";

      if (!map[rowName]) {
        map[rowName] = [];
      }

      map[rowName].push(seat);

      return map;
    }, {});
  }

  function renderGrade(grade) {
    if (!grade || !zoneSeatGrid) return;

    currentGrade = grade;

    const seats = getSeatsByGrade(grade);
    const groupedSeats = groupSeatsByRow(seats);

    if (zoneTitle) {
      zoneTitle.textContent = `${getGradeName(grade)} 좌석`;
    }

    if (zoneSubText) {
      zoneSubText.textContent = `DB에 등록된 ${getGradeName(grade)} 좌석을 표시합니다.`;
    }

    gradeButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.grade === grade);
    });

    zoneSeatGrid.innerHTML = "";

    Object.keys(groupedSeats).forEach((rowName) => {
      const row = document.createElement("div");
      row.className = "cc-seat-row";

      const label = document.createElement("div");
      label.className = "cc-seat-row__label";
      label.textContent = `${rowName}열`;
      row.appendChild(label);

      groupedSeats[rowName].forEach((seatData) => {
        const seat = document.createElement("button");
        seat.type = "button";
        seat.className = `cc-real-seat cc-real-seat--${getGradeClass(seatData.grade)}`;
        seat.textContent = seatData.seatNo || seatData.seatNumber;

        seat.dataset.seatId = seatData.id;
        seat.dataset.seatNumber = seatData.seatNumber;
        seat.dataset.grade = seatData.grade;
        seat.dataset.gradeName = seatData.gradeName || getGradeName(seatData.grade);
        seat.dataset.price = String(seatData.price || 0);
        seat.dataset.status = seatData.status || "";

        seat.setAttribute(
          "aria-label",
          `${seatData.seatNumber} ${seat.dataset.gradeName} ${formatPrice(seatData.price)}`
        );

        if (!seatData.available) {
          seat.classList.add("is-sold");
          seat.disabled = true;
        }

        if (getSelectedSeatById(seatData.id)) {
          seat.classList.add("is-selected");
        }

        seat.addEventListener("click", () => toggleSeat(seat));
        seat.addEventListener("mouseenter", () => updateHoverInfo(seat));

        row.appendChild(seat);
      });

      zoneSeatGrid.appendChild(row);
    });

    if (seats.length === 0) {
      zoneSeatGrid.innerHTML = `
        <div class="cc-selected-seat">
          <div>
            <div class="cc-selected-seat__name">등록된 좌석이 없습니다.</div>
            <div class="cc-selected-seat__price">DB에 해당 등급 좌석이 없습니다.</div>
          </div>
        </div>
      `;
    }
  }

  function getSeatInfoFromButton(button) {
    const grade = button.dataset.grade;
    const price = Number(button.dataset.price || 0);

    return {
      id: button.dataset.seatId,
      seatNumber: button.dataset.seatNumber,
      grade,
      gradeName: button.dataset.gradeName || getGradeName(grade),
      price
    };
  }

  function toggleSeat(button) {
    if (button.disabled || button.classList.contains("is-sold")) return;

    const seat = getSeatInfoFromButton(button);
    const alreadySelected = getSelectedSeatById(seat.id);

    if (alreadySelected) {
      selectedSeats = selectedSeats.filter((item) => String(item.id) !== String(seat.id));
      button.classList.remove("is-selected");
      renderSelectedPanel();
      return;
    }

    if (selectedSeats.length >= MAX_SELECT_COUNT) {
      alert(`좌석은 최대 ${MAX_SELECT_COUNT}석까지 선택할 수 있습니다.`);
      return;
    }

    selectedSeats.push(seat);
    button.classList.add("is-selected");
    renderSelectedPanel();
  }

  function updateHoverInfo(button) {
    if (!hoverInfo) return;

    const seat = getSeatInfoFromButton(button);
    hoverInfo.textContent = `${seat.seatNumber} / ${seat.gradeName} / ${formatPrice(seat.price)}`;
  }

  function renderSelectedPanel() {
    if (!selectedList || !totalBox || !totalPriceEl) return;

    selectedList.innerHTML = "";

    if (selectedSeats.length === 0) {
      const empty = document.createElement("div");
      empty.className = "cc-selected-seat";
      empty.innerHTML = `
        <div>
          <div class="cc-selected-seat__name">선택된 좌석이 없습니다.</div>
          <div class="cc-selected-seat__price">좌석을 선택하면 여기에 표시됩니다.</div>
        </div>
      `;
      selectedList.appendChild(empty);
    } else {
      selectedSeats.forEach((seat) => {
        const item = document.createElement("div");
        item.className = "cc-selected-seat";
        item.innerHTML = `
          <div>
            <div class="cc-selected-seat__name">
              <i class="cc-dot cc-dot--${getGradeClass(seat.grade)}"></i>${seat.seatNumber}
            </div>
            <div class="cc-selected-seat__price">${seat.gradeName} ${formatPrice(seat.price)}</div>
          </div>
          <button type="button" class="cc-remove" data-seat-id="${seat.id}" aria-label="좌석 제거">×</button>
        `;
        selectedList.appendChild(item);
      });
    }

    const totalPrice = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
    const totalCountEl = totalBox.querySelector("span");

    if (totalCountEl) {
      totalCountEl.textContent = `총 ${selectedSeats.length}석`;
    }

    totalPriceEl.textContent = formatPrice(totalPrice);
    renderHiddenInputs();
  }

  function renderHiddenInputs() {
    if (!paymentForm || !selectedSeatIdsInput) return;

    selectedSeatIdsInput.value = selectedSeats
      .map((seat) => seat.id)
      .join(",");

    console.log("hidden seatIds =", selectedSeatIdsInput.value);
  }

  function removeSelectedSeat(seatId) {
    selectedSeats = selectedSeats.filter((seat) => String(seat.id) !== String(seatId));

    const seatButton = document.querySelector(`.cc-real-seat[data-seat-id="${CSS.escape(String(seatId))}"]`);

    if (seatButton) {
      seatButton.classList.remove("is-selected");
    }

    renderSelectedPanel();
  }

  function clearAllSeats() {
    selectedSeats = [];

    document.querySelectorAll(".cc-real-seat.is-selected").forEach((button) => {
      button.classList.remove("is-selected");
    });

    renderSelectedPanel();

    if (hoverInfo) {
      hoverInfo.textContent = "좌석에 마우스를 올리면 좌석 정보가 표시됩니다.";
    }
  }

  function initEvents() {
    gradeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const grade = button.dataset.grade;
        renderGrade(grade);
      });
    });

    document.addEventListener("click", (event) => {
      const removeButton = event.target.closest(".cc-remove");

      if (!removeButton) return;

      removeSelectedSeat(removeButton.dataset.seatId);
    });

    if (resetZoneBtn) {
      resetZoneBtn.addEventListener("click", clearAllSeats);
    }

    if (paymentForm) {
      paymentForm.addEventListener("submit", (event) => {
        renderHiddenInputs();

        if (selectedSeats.length === 0) {
          event.preventDefault();
          alert("좌석을 먼저 선택해주세요.");
          return;
        }

        if (!selectedSeatIdsInput || selectedSeatIdsInput.value.trim() === "") {
          event.preventDefault();
          alert("좌석 정보가 정상적으로 입력되지 않았습니다.");
          return;
        }

        if (selectedSeats.length > MAX_SELECT_COUNT) {
          event.preventDefault();
          alert(`좌석은 최대 ${MAX_SELECT_COUNT}석까지 선택할 수 있습니다.`);
        }
      });
    }
  }

  function initCountdown() {
    if (!timerEl) return;

    let remainSeconds = Number(timerEl.dataset.countdown || 600);

    function tick() {
      const minute = String(Math.floor(remainSeconds / 60)).padStart(2, "0");
      const second = String(remainSeconds % 60).padStart(2, "0");

      timerEl.textContent = `${minute}:${second}`;

      if (remainSeconds <= 0) {
        alert("좌석 보관 시간이 만료되었습니다. 좌석을 다시 선택해주세요.");
        clearAllSeats();
        return;
      }

      remainSeconds -= 1;
      window.setTimeout(tick, 1000);
    }

    tick();
  }

  initEvents();

  if (currentGrade) {
    renderGrade(currentGrade);
  }

  renderSelectedPanel();
  initCountdown();
});