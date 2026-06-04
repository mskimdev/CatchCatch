// booking-seat.js — 구역 선택 + 구역 확대 좌석 테스트 버전
document.addEventListener("DOMContentLoaded", () => {
  const MAX_SELECT_COUNT = 4;

  const zoneButtons = Array.from(document.querySelectorAll(".cc-zone-tab"));
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

  let currentZone = "나";
  let selectedSeats = [];

  const zoneConfig = {
    "가": {
      name: "1층 가구역",
      rows: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
      cols: 10,
      grade: "r"
    },
    "나": {
      name: "1층 나구역",
      rows: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
      cols: 14,
      grade: "vip"
    },
    "다": {
      name: "1층 다구역",
      rows: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
      cols: 10,
      grade: "r"
    },
    "라": {
      name: "1층 라구역",
      rows: ["A", "B", "C", "D", "E", "F", "G"],
      cols: 10,
      grade: "s"
    },
    "마": {
      name: "1층 마구역",
      rows: ["A", "B", "C", "D", "E", "F", "G"],
      cols: 14,
      grade: "s"
    },
    "바": {
      name: "1층 바구역",
      rows: ["A", "B", "C", "D", "E", "F", "G"],
      cols: 10,
      grade: "s"
    }
  };

  const gradeNameMap = {
    vip: "VIP",
    r: "R",
    s: "S",
    a: "A",
    b: "B"
  };

  const gradePriceMap = {
    vip: 154000,
    r: 121000,
    s: 99000,
    a: 77000,
    b: 55000
  };

  function formatPrice(price) {
    return Number(price || 0).toLocaleString("ko-KR") + "원";
  }

  function makeSeatId(zone, row, col) {
    // TODO: 테스트 DB 기준 아이유 콘서트 1회차 seat_tb.id 임시 매핑
    // 실제 구현 시에는 서버에서 seat_tb.id를 조회해서 화면에 내려줘야 함
    const availableSeatIds = [
      4, 5,
      9, 10, 11, 12, 13, 14, 15,
      17, 18, 19, 20, 21, 22, 23, 24, 25,
      26, 27, 28, 29, 30, 31, 32, 33, 34, 35
    ];

    const zoneOrder = {
      "가": 0,
      "나": 1,
      "다": 2,
      "라": 3,
      "마": 4,
      "바": 5
    };

    const rowOrder = {
      "A": 0,
      "B": 1,
      "C": 2,
      "D": 3,
      "E": 4,
      "F": 5,
      "G": 6,
      "H": 7,
      "I": 8,
      "J": 9
    };

    const zoneIndex = zoneOrder[zone] || 0;
    const rowIndex = rowOrder[row] || 0;

    const index = (zoneIndex * 20 + rowIndex * 14 + col - 1) % availableSeatIds.length;

    return availableSeatIds[index];
  }

  function isMockSoldSeat(zone, rowIndex, col) {
    if (zone === "나" && rowIndex === 0 && col >= 11) return true;
    if (zone === "가" && rowIndex <= 1 && col <= 2) return true;
    if (zone === "다" && rowIndex <= 1 && col >= 9) return true;
    if (zone === "라" && rowIndex === 5 && col >= 8) return true;
    if (zone === "바" && rowIndex === 5 && col <= 3) return true;

    return false;
  }

  function getSeatGrade(zone, rowIndex) {
    const config = zoneConfig[zone];

    if (!config) return "r";

    if (config.grade === "vip" && rowIndex >= 7) return "r";
    if (config.grade === "r" && rowIndex >= 7) return "s";

    return config.grade;
  }

  function getSelectedSeatById(seatId) {
    return selectedSeats.find((seat) => seat.id === seatId);
  }

  function renderZone(zone) {
    const config = zoneConfig[zone];

    if (!config || !zoneSeatGrid) return;

    currentZone = zone;

    if (zoneTitle) {
      zoneTitle.textContent = config.name;
    }

    if (zoneSubText) {
      zoneSubText.textContent = `${config.name} 좌석을 확대해서 선택합니다.`;
    }

    zoneButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.zone === zone);
    });

    zoneSeatGrid.innerHTML = "";

    config.rows.forEach((rowName, rowIndex) => {
      const row = document.createElement("div");
      row.className = "cc-seat-row";

      const label = document.createElement("div");
      label.className = "cc-seat-row__label";
      label.textContent = `${rowName}열`;
      row.appendChild(label);

      for (let col = 1; col <= config.cols; col += 1) {
        const grade = getSeatGrade(zone, rowIndex);
        const price = gradePriceMap[grade] || 0;
        const seatId = makeSeatId(zone, rowName, col);
        const seatName = `${zone}구역 ${rowName}열 ${col}번`;

        const seat = document.createElement("button");
        seat.type = "button";
        seat.className = `cc-real-seat cc-real-seat--${grade}`;
        seat.textContent = col;
        seat.dataset.seatId = seatId;
        seat.dataset.zone = zone;
        seat.dataset.seatName = seatName;
        seat.dataset.grade = grade;
        seat.dataset.price = String(price);
        seat.setAttribute("aria-label", `${seatName} ${gradeNameMap[grade]}석 ${formatPrice(price)}`);

        if (isMockSoldSeat(zone, rowIndex, col)) {
          seat.classList.add("is-sold");
          seat.disabled = true;
        }

        if (getSelectedSeatById(seatId)) {
          seat.classList.add("is-selected");
        }

        seat.addEventListener("click", () => toggleSeat(seat));
        seat.addEventListener("mouseenter", () => updateHoverInfo(seat));

        row.appendChild(seat);
      }

      zoneSeatGrid.appendChild(row);
    });
  }

  function getSeatInfoFromButton(button) {
    const grade = button.dataset.grade;
    const price = Number(button.dataset.price || 0);

    return {
      id: button.dataset.seatId,
      zone: button.dataset.zone,
      seatNumber: button.dataset.seatName,
      grade,
      gradeName: gradeNameMap[grade] || grade.toUpperCase(),
      price
    };
  }

  function toggleSeat(button) {
    if (button.disabled || button.classList.contains("is-sold")) return;

    const seat = getSeatInfoFromButton(button);
    const alreadySelected = getSelectedSeatById(seat.id);

    if (alreadySelected) {
      selectedSeats = selectedSeats.filter((item) => item.id !== seat.id);
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
    hoverInfo.textContent = `${seat.seatNumber} / ${seat.gradeName}석 / ${formatPrice(seat.price)}`;
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
              <i class="cc-dot cc-dot--${seat.grade}"></i>${seat.seatNumber}
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
    selectedSeats = selectedSeats.filter((seat) => seat.id !== seatId);

    const seatButton = document.querySelector(`.cc-real-seat[data-seat-id="${CSS.escape(seatId)}"]`);

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
    zoneButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const zone = button.dataset.zone;
        renderZone(zone);
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

        console.log("submit selectedSeats =", selectedSeats);
        console.log("submit seatIds =", selectedSeatIdsInput ? selectedSeatIdsInput.value : null);

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
  renderZone(currentZone);
  renderSelectedPanel();
  initCountdown();
});