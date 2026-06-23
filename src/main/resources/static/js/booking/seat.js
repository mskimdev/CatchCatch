// booking-seat.js — DB 좌석 + 예매 상태 반영 버전
document.addEventListener("DOMContentLoaded", () => {
  const MAX_SELECT_COUNT = 4;

  const rawSeats = Array.isArray(window.CATCHCATCH_SEATS)
    ? window.CATCHCATCH_SEATS
    : [];

  const dbSeats = rawSeats.map(normalizeSeat);

  const gradeTabsBox = document.querySelector(".cc-zone-tabs");
  let gradeButtons = Array.from(document.querySelectorAll(".cc-zone-tab"));

  const zoneTitle = document.querySelector("#zoneTitle");
  const zoneSubText = document.querySelector("#zoneSubText");
  const zoneSeatGrid = document.querySelector("#zoneSeatGrid");
  const hoverInfo = document.querySelector("#seatHoverInfo");
  const resetZoneBtn = document.querySelector("#resetZoneBtn");

  const selectedList = document.querySelector(".cc-selected-list");
  const totalBox = document.querySelector(".cc-total");
  const totalPriceEl = document.querySelector(".cc-total__price");
  const paymentForm = document.querySelector(".cc-complete-form");

  const selectedSeatIdsInput = document.querySelector("#selectedSeatIds");
  const selectedSeatInputs = document.querySelector("#selectedSeatInputs");

  let selectedSeats = [];

  const gradeOrder = ["VIP", "R", "S", "A", "B"];
  let currentGrade = getFirstGrade();

  function normalizeSeat(seat) {
    const id = seat.id ?? seat.seatId;
    const grade = String(seat.grade ?? seat.gradeCode ?? "").toUpperCase();

    const rowName =
      seat.rowName ??
      seat.row ??
      seat.seatRow ??
      grade ??
      "좌석";

    const seatNo =
      seat.seatNo ??
      seat.seatNumberOnly ??
      seat.number ??
      seat.no ??
      "";

    const seatNumber =
      seat.seatNumber ??
      seat.name ??
      `${rowName}-${seatNo}`;

    const price = Number(seat.price ?? seat.seatPrice ?? 0);

    const status = String(seat.status ?? "").toUpperCase();
    const bookingStatus = String(seat.bookingStatus ?? seat.booking_status ?? "").toUpperCase();

    const available = isSeatAvailable(seat, status, bookingStatus);

    return {
      id,
      grade,
      gradeName: seat.gradeName ?? getGradeName(grade),
      rowName,
      seatNo,
      seatNumber,
      price,
      status,
      bookingStatus,
      available
    };
  }

  function isSeatAvailable(seat, status, bookingStatus) {
    if (seat.available === false) return false;
    if (seat.isAvailable === false) return false;

    if (seat.sold === true) return false;
    if (seat.reserved === true) return false;
    if (seat.booked === true) return false;
    if (seat.disabled === true) return false;

    if (status === "CONFIRMED") return false;
    if (status === "PENDING") return false;
    if (status === "SOLD") return false;
    if (status === "RESERVED") return false;
    if (status === "UNAVAILABLE") return false;
    if (status === "BOOKED") return false;

    if (bookingStatus === "CONFIRMED") return false;
    if (bookingStatus === "PENDING") return false;
    if (bookingStatus === "SOLD") return false;
    if (bookingStatus === "RESERVED") return false;
    if (bookingStatus === "UNAVAILABLE") return false;
    if (bookingStatus === "BOOKED") return false;

    return true;
  }

  function isSoldSeat(seatData) {
    return seatData.available === false;
  }

  function getFirstGrade() {
    for (const grade of gradeOrder) {
      if (dbSeats.some((seat) => seat.grade === grade)) {
        return grade;
      }
    }

    return dbSeats.length > 0 ? dbSeats[0].grade : null;
  }

  function getUsedGrades() {
    const set = new Set();

    dbSeats.forEach((seat) => {
      if (seat.grade) {
        set.add(seat.grade);
      }
    });

    return gradeOrder.filter((grade) => set.has(grade));
  }

  function rebuildGradeTabsIfNeeded() {
    if (!gradeTabsBox) return;

    const usedGrades = getUsedGrades();

    if (usedGrades.length === 0) {
      gradeTabsBox.innerHTML = `<button type="button" class="cc-zone-tab is-active" data-grade="">좌석 없음</button>`;
      gradeButtons = Array.from(document.querySelectorAll(".cc-zone-tab"));
      return;
    }

    const hasRealButton = gradeButtons.some((button) => button.dataset.grade);

    if (hasRealButton) {
      return;
    }

    gradeTabsBox.innerHTML = "";

    usedGrades.forEach((grade, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `cc-zone-tab ${index === 0 ? "is-active" : ""}`;
      button.dataset.grade = grade;
      button.textContent = getGradeName(grade);
      gradeTabsBox.appendChild(button);
    });

    gradeButtons = Array.from(document.querySelectorAll(".cc-zone-tab"));
  }

  function formatPrice(price) {
    return Number(price || 0).toLocaleString("ko-KR") + "원";
  }

  function getGradeName(grade) {
    if (!grade) return "좌석";

    if (grade === "VIP") {
      return "VIP석";
    }

    return `${grade}석`;
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
        const rowCompare = String(a.rowName || "").localeCompare(String(b.rowName || ""), "ko-KR", {
          numeric: true
        });

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
    if (!zoneSeatGrid) return;

    currentGrade = grade;

    const seats = getSeatsByGrade(grade);
    const groupedSeats = groupSeatsByRow(seats);

    if (zoneTitle) {
      zoneTitle.textContent = `${getGradeName(grade)} 좌석`;
    }

    if (zoneSubText) {
      const totalCount = seats.length;
      const availableCount = seats.filter((seat) => seat.available).length;
      zoneSubText.textContent = `총 ${totalCount}석 / 예매 가능 ${availableCount}석`;
    }

    gradeButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.grade === grade);
    });

    zoneSeatGrid.innerHTML = "";

    if (!grade || seats.length === 0) {
      zoneSeatGrid.innerHTML = `
        <div class="cc-empty-seat">
          <div class="cc-selected-seat__name">등록된 좌석이 없습니다.</div>
          <div class="cc-selected-seat__price">DB에 해당 등급 좌석이 없습니다.</div>
        </div>
      `;
      return;
    }

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
        seat.dataset.bookingStatus = seatData.bookingStatus || "";

        seat.setAttribute(
          "aria-label",
          `${seatData.seatNumber} ${seat.dataset.gradeName} ${formatPrice(seatData.price)}`
        );

        if (isSoldSeat(seatData)) {
          seat.classList.add("is-sold");
          seat.disabled = true;
          seat.setAttribute("aria-disabled", "true");
          seat.title = "이미 예매된 좌석입니다.";
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
    if (button.disabled) return;
    if (button.classList.contains("is-sold")) return;
    if (button.getAttribute("aria-disabled") === "true") return;

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
    const bookingStatus = button.dataset.bookingStatus;
    const status = button.dataset.status;

    if (button.classList.contains("is-sold")) {
      hoverInfo.textContent = `${seat.seatNumber} / ${seat.gradeName} / 예매 불가 (${bookingStatus || status || "매진"})`;
      return;
    }

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
              <i class="cc-dot cc-dot--${getGradeClass(seat.grade)}"></i>
              ${seat.seatNumber}
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
    const seatIds = selectedSeats.map((seat) => seat.id);

    if (selectedSeatIdsInput) {
      selectedSeatIdsInput.value = seatIds.join(",");
    }

    if (!selectedSeatInputs) return;

    selectedSeatInputs.innerHTML = "";

    seatIds.forEach((seatId) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "seatIds";
      input.value = seatId;
      selectedSeatInputs.appendChild(input);
    });

    console.log("선택 좌석 seatIds =", seatIds);
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
          return;
        }

        event.preventDefault();

        CcUI.confirm({
          title: "결제하시겠습니까?",
          text: "좌석 점유는 결제 화면 진입 시점부터 10분간 유지됩니다.<br>시간 내 결제되지 않으면 좌석이 해제되어 처음부터 다시 선택해야 합니다.",
          confirmText: "결제하기",
          onConfirm: () => paymentForm.submit()
        });
      });
    }
  }

  rebuildGradeTabsIfNeeded();
  initEvents();

  if (currentGrade) {
    renderGrade(currentGrade);
  } else if (zoneSeatGrid) {
    zoneSeatGrid.innerHTML = `
      <div class="cc-empty-seat">
        <div class="cc-selected-seat__name">좌석 데이터가 없습니다.</div>
        <div class="cc-selected-seat__price">서버에서 seat.seatsJson 값이 전달되지 않았습니다.</div>
      </div>
    `;
  }

  renderSelectedPanel();

  console.log("window.CATCHCATCH_SEATS =", window.CATCHCATCH_SEATS);
  console.log("normalized dbSeats =", dbSeats);
});