// CatchCatch booking seat - 구역 선택 후 좌석 행열 표시
(() => {
  document.addEventListener("DOMContentLoaded", init);

  const GRADE_ORDER = ["VIP", "SR", "R", "S", "A", "B"];
  const GRADE_COLORS = {
    VIP: "#bbaa8b",
    SR: "#8b72f6",
    R: "#f77eaa",
    S: "#63c7d9",
    A: "#b7e645",
    B: "#ffc45c"
  };

  const GRADE_LABELS = {
    VIP: "VIP",
    SR: "STANDING석",
    R: "R석",
    S: "S석",
    A: "A석",
    B: "B석"
  };

  const state = {
    seats: [],
    areas: [],
    selectedSeats: [],
    activeArea: null,
    hoverAreaId: null,
    hoverGrade: null,
    maxSelect: 4,
    imageSize: { width: 1000, height: 700 }
  };

  const dom = {};

  async function init() {
    cacheDom();
    applyDynamicAssets();
    state.maxSelect = Number(window.CATCHCATCH_SEAT_META?.maxSelectCount || 4);
    state.seats = normalizeSeats(window.CATCHCATCH_SEATS || []);

    await loadAreas();
    renderAreas();
    renderMiniAreas();
    renderGradeList();
    bindEvents();
    updateSelection();
    updateGuide("구역을 먼저 선택해주세요 <small>(화면을 직접 선택하거나 우측 좌석등급을 선택해주세요)</small>");
  }

  function cacheDom() {
    dom.app = document.querySelector("#bookingSeatApp");
    dom.mapStage = document.querySelector("#overviewStage");
    dom.mapImage = document.querySelector("#seatmapImage");
    dom.miniImage = document.querySelector("#miniSeatmapImage");
    dom.zoneOverlay = document.querySelector("#zoneOverlay");
    dom.miniZoneOverlay = document.querySelector("#miniZoneOverlay");
    dom.gradeList = document.querySelector("#gradeList");
    dom.selectedSeatList = document.querySelector("#selectedSeatList");
    dom.selectedSeatIds = document.querySelector("#selectedSeatIds");
    dom.selectedSeatInputs = document.querySelector("#selectedSeatInputs");
    dom.completeBtn = document.querySelector("#seatCompleteBtn");
    dom.completeForm = document.querySelector("#seatCompleteForm");
    dom.realSeatGrid = document.querySelector("#realSeatGrid");
    dom.seatGridView = document.querySelector("#seatGridView");
    dom.seatGridTitle = document.querySelector("#seatGridTitle");
    dom.seatGridSub = document.querySelector("#seatGridSub");
    dom.backToMapBtn = document.querySelector("#backToMapBtn");
    dom.bottomGuideText = document.querySelector("#bottomGuideText");
    dom.resetSelectionBtn = document.querySelector("#resetSelectionBtn");
    dom.refreshZoneBtn = document.querySelector("#refreshZoneBtn");
    dom.showFullMapBtn = document.querySelector("#showFullMapBtn");
  }

  function applyDynamicAssets() {
    const imageUrl = resolveAssetUrl("seatmapImageUrl", "seatmap-image.png");

    if (imageUrl) {
      if (dom.mapImage) dom.mapImage.src = imageUrl;
      if (dom.miniImage) dom.miniImage.src = imageUrl;
    }
  }

  function resolveAssetUrl(metaKey, fileName) {
    const meta = window.CATCHCATCH_SEAT_META || {};
    const directUrl = meta[metaKey] || dom.app?.dataset?.[metaKey];

    if (directUrl && String(directUrl).trim()) {
      return String(directUrl).trim();
    }

    const projectId = String(meta.projectId || dom.app?.dataset?.seatmapProjectId || "").trim();

    if (!projectId) {
      return "";
    }

    return `/temp/seatmap/${projectId}/${fileName}`;
  }

  async function loadAreas() {
    const url = resolveAssetUrl("bookingButtonsUrl", "booking-buttons.json");

    if (!url) {
      state.areas = buildFallbackAreasFromGrades();
      return;
    }

    try {
      const response = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("booking-buttons.json not found");

      const json = await response.json();
      const source = Array.isArray(json) ? json : (json.areas || json.buttons || []);
      state.imageSize.width = Number(json.imageWidth || json.width || state.imageSize.width);
      state.imageSize.height = Number(json.imageHeight || json.height || state.imageSize.height);
      state.areas = source.map(normalizeArea).filter((area) => area.points.length >= 3);
    } catch (error) {
      state.areas = buildFallbackAreasFromGrades();
    }
  }

  function normalizeSeats(rawSeats) {
    return rawSeats.map((seat) => {
      const grade = normalizeGrade(seat.grade || seat.gradeCode);
      const seatNumber = String(seat.seatNumber || seat.name || seat.id || "");
      const parsed = parseSeatNumber(seatNumber);

      // 서버 DTO의 rowName/seatNo가 기존 "A-1" 형식 기준으로 잘못 들어오는 경우가 있음.
      // 그래서 seatNumber를 먼저 파싱하고, 파싱이 실패했을 때만 DTO 값을 보조로 사용한다.
      const rawRow = seat.rowName || seat.row || seat.seatRow || "";
      const rawNo = seat.seatNo || seat.no || seat.number || "";
      const rawSection = seat.sectionName || seat.section || "";

      const rowName = String(parsed.row || normalizeRowName(rawRow) || "A");
      const seatNo = String(parsed.col || normalizeSeatNo(rawNo) || "");
      const sectionName = String(parsed.section || normalizeSectionName(rawSection) || grade || "A");
      const floor = Number(parsed.floor || seat.floor || 1);
      const id = seat.id || seat.seatId;
      const status = String(seat.status || "AVAILABLE").toUpperCase();
      const available = seat.available !== false && !["SOLD", "RESERVED", "BOOKED", "CONFIRMED", "PENDING", "HELD", "UNAVAILABLE", "OBSTRUCTED"].includes(status);

      return {
        id,
        floor,
        sectionName,
        sectionKey: sectionKey(floor, sectionName),
        rowName,
        seatNo,
        seatNumber: seatNumber || `${floor}층 ${sectionName}구역 ${rowName}열 ${seatNo}번`,
        grade,
        gradeName: seat.gradeName || gradeLabel(grade),
        price: Number(seat.price || seat.seatPrice || 0),
        priceText: seat.priceText || formatPrice(seat.price || seat.seatPrice || 0),
        status,
        available
      };
    });
  }

  function parseSeatNumber(value) {
    const text = String(value || "");
    const result = {};

    const korean = text.match(/(\d+)층\s+(.+?)구역\s+(.+?)열\s+(\d+)번/);
    if (korean) {
      result.floor = Number(korean[1]);
      result.section = korean[2].trim();
      result.row = korean[3].trim();
      result.col = korean[4].trim();
      return result;
    }

    const compact = text.match(/^(\d+)-(.+?)-(.+?)-(\d+)-(.+?)-(.+)$/);
    if (compact) {
      result.floor = Number(compact[1]);
      result.section = compact[2].trim();
      result.row = compact[3].trim();
      result.col = compact[4].trim();
      return result;
    }

    // DB seat_number 형식: "D2 A-1", "STANDING_C A-1", "VIP_A C-8"
    const simple = text.match(/^(.+?)\s+([^\s-]+)-(\d+)$/);
    if (simple) {
      result.section = simple[1].trim();
      result.row = simple[2].trim();
      result.col = simple[3].trim();
      return result;
    }

    return result;
  }

  function normalizeRowName(value) {
    const text = String(value || "").trim();
    const korean = text.match(/(.+?)열/);
    if (korean) return korean[1].replace(/.*구역\s*/, "").trim();

    // "1층 D2구역 A열 1번" 같은 전체 좌석명이 들어온 경우 방어
    const parsed = parseSeatNumber(text);
    if (parsed.row) return parsed.row;

    return text;
  }

  function normalizeSeatNo(value) {
    const text = String(value || "").trim();
    const korean = text.match(/(\d+)번/);
    if (korean) return korean[1];

    const parsed = parseSeatNumber(text);
    if (parsed.col) return parsed.col;

    return text;
  }

  function compareRowName(a, b) {
    return String(a || "").localeCompare(String(b || ""), "ko-KR", { numeric: true });
  }

  function compareSeatNo(a, b) {
    return Number(a.seatNo || 0) - Number(b.seatNo || 0);
  }

  function getSeatSize(maxCols) {
    if (maxCols >= 70) return 10;
    if (maxCols >= 50) return 12;
    if (maxCols >= 35) return 14;
    if (maxCols >= 25) return 16;
    return 20;
  }

  function normalizeArea(area, index) {
    const rawGrade = normalizeGrade(area.grade || area.gradeCode || area.type);
    const floor = Number(area.floor || parseSectionKey(area.sectionId || area.id).floor || 1);
    const rawSection = parseSectionKey(area.sectionId || area.id).section || area.section || area.name || `구역${index + 1}`;
    const section = normalizeSectionName(rawSection);
    const matchedSeat = firstSeatBySection(floor, section);
    const grade = matchedSeat?.grade || rawGrade;
    const points = normalizePoints(area);

    return {
      id: String(area.id || area.buttonId || `area-${index + 1}`),
      sectionId: String(area.sectionId || sectionKey(floor, section)),
      floor,
      section,
      sectionKey: sectionKey(floor, section),
      name: String(area.name || section),
      grade,
      price: Number(matchedSeat?.price || area.price || firstPriceByGrade(grade) || 0),
      points,
      center: getCenter(points, area),
      color: area.color || gradeColor(grade)
    };
  }

  function normalizePoints(area) {
    const polygon = area.polygon || area.points;
    if (Array.isArray(polygon) && polygon.length >= 3) {
      return polygon.map((point) => ({ x: Number(point.x), y: Number(point.y) }));
    }

    const x = Number(area.x || 0);
    const y = Number(area.y || 0);
    const width = Number(area.width || area.w || 80);
    const height = Number(area.height || area.h || 50);
    const halfW = width / 2;
    const halfH = height / 2;

    return [
      { x: x - halfW, y: y - halfH },
      { x: x + halfW, y: y - halfH },
      { x: x + halfW, y: y + halfH },
      { x: x - halfW, y: y + halfH }
    ];
  }

  function getCenter(points, area) {
    if (area.x != null && area.y != null) {
      return { x: Number(area.x), y: Number(area.y) };
    }

    const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
    return { x: sum.x / points.length, y: sum.y / points.length };
  }

  function buildFallbackAreasFromGrades() {
    const grades = usedGrades();
    state.imageSize = { width: 1000, height: 700 };

    return grades.map((grade, index) => {
      const x = 140 + index * 132;
      const y = 390;
      const width = 104;
      const height = 70;
      const floor = 1;
      const section = grade;
      const points = [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height }
      ];

      return {
        id: `fallback-${grade}`,
        sectionId: sectionKey(floor, section),
        floor,
        section,
        sectionKey: sectionKey(floor, section),
        name: gradeLabel(grade),
        grade,
        price: firstPriceByGrade(grade),
        points,
        center: getCenter(points, {}),
        color: gradeColor(grade)
      };
    });
  }

  function renderAreas() {
    if (!dom.zoneOverlay) return;

    dom.zoneOverlay.setAttribute("viewBox", `0 0 ${state.imageSize.width} ${state.imageSize.height}`);
    dom.zoneOverlay.innerHTML = "";

    state.areas.forEach((area) => {
      const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      polygon.classList.add("cc-zone-hit", "is-hidden");
      polygon.dataset.areaId = area.id;
      polygon.dataset.grade = area.grade;
      polygon.setAttribute("points", area.points.map((point) => `${point.x},${point.y}`).join(" "));
      polygon.setAttribute("fill", area.color);
      polygon.setAttribute("stroke", "rgba(255,255,255,.78)");
      polygon.setAttribute("stroke-width", "1.5");
      polygon.addEventListener("mouseenter", () => setAreaHover(area));
      polygon.addEventListener("mouseleave", clearHover);
      polygon.addEventListener("click", () => selectArea(area));
      dom.zoneOverlay.appendChild(polygon);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.classList.add("cc-zone-label");
      text.dataset.areaLabel = area.id;
      text.setAttribute("x", area.center.x);
      text.setAttribute("y", area.center.y);
      text.textContent = shortAreaName(area.name);
      dom.zoneOverlay.appendChild(text);
    });
  }

  function renderMiniAreas() {
    if (!dom.miniZoneOverlay) return;

    dom.miniZoneOverlay.setAttribute("viewBox", `0 0 ${state.imageSize.width} ${state.imageSize.height}`);
    dom.miniZoneOverlay.innerHTML = "";

    state.areas.forEach((area) => {
      const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      polygon.dataset.miniAreaId = area.id;
      polygon.setAttribute("points", area.points.map((point) => `${point.x},${point.y}`).join(" "));
      polygon.setAttribute("fill", "#cfcfcf");
      polygon.setAttribute("opacity", ".42");
      polygon.setAttribute("stroke", "#fff");
      polygon.setAttribute("stroke-width", "1.5");
      dom.miniZoneOverlay.appendChild(polygon);
    });

    updateMiniMap();
  }

  function renderGradeList() {
    if (!dom.gradeList) return;

    const groups = usedGrades().map((grade) => {
      const seats = state.seats.filter((seat) => seat.grade === grade);
      const availableCount = seats.filter((seat) => seat.available).length;
      const totalCount = seats.length;
      const price = firstPriceByGrade(grade);
      return { grade, availableCount, totalCount, price };
    });

    dom.gradeList.innerHTML = groups.map((group) => `
      <button type="button" class="cc-grade-row" data-grade="${escapeHtml(group.grade)}">
        <span class="cc-grade-color" style="background:${gradeColor(group.grade)}"></span>
        <span class="cc-grade-label">${escapeHtml(gradeLabel(group.grade))} <small>${group.availableCount}/${group.totalCount}</small></span>
        <span class="cc-grade-price">${formatPrice(group.price)}</span>
        <span class="cc-grade-arrow">⌄</span>
      </button>
    `).join("");

    dom.gradeList.querySelectorAll(".cc-grade-row").forEach((button) => {
      const grade = button.dataset.grade;
      button.addEventListener("mouseenter", () => setGradeHover(grade));
      button.addEventListener("mouseleave", clearHover);
      button.addEventListener("click", () => filterByGrade(grade));
    });
  }

  function bindEvents() {
    dom.backToMapBtn?.addEventListener("click", showMap);
    dom.resetSelectionBtn?.addEventListener("click", resetAll);
    dom.refreshZoneBtn?.addEventListener("click", () => window.location.reload());
    dom.showFullMapBtn?.addEventListener("click", showMap);
    dom.completeForm?.addEventListener("submit", (event) => {
      if (state.selectedSeats.length === 0) {
        event.preventDefault();
        alert("좌석을 선택해주세요.");
      }
    });
  }

  function setAreaHover(area) {
    state.hoverAreaId = area.id;
    state.hoverGrade = null;
    updateAreaVisual();
    updateGuide(`${escapeHtml(area.name)} 구역을 선택할 수 있습니다.`);
  }

  function setGradeHover(grade) {
    state.hoverGrade = grade;
    state.hoverAreaId = null;
    updateAreaVisual();
    updateGuide(`${escapeHtml(gradeLabel(grade))} 구역을 확인 중입니다.`);
  }

  function clearHover() {
    state.hoverAreaId = null;
    state.hoverGrade = null;
    updateAreaVisual();

    if (state.activeArea) {
      updateGuide(`${escapeHtml(state.activeArea.name)} 선택됨`);
    } else {
      updateGuide("구역을 먼저 선택해주세요 <small>(화면을 직접 선택하거나 우측 좌석등급을 선택해주세요)</small>");
    }
  }

  function filterByGrade(grade) {
    document.querySelectorAll(".cc-grade-row").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.grade === grade);
    });

    state.activeArea = null;
    setGradeHover(grade);
    renderSeatGridByGrade(grade);
  }

  function selectArea(area) {
    state.activeArea = area;
    state.hoverAreaId = null;
    state.hoverGrade = null;
    updateAreaVisual();
    updateMiniMap();
    renderSeatGrid(area);
  }

  function renderSeatGrid(area) {
    if (!dom.realSeatGrid) return;

    const seats = seatsByArea(area);
    dom.seatGridView.hidden = false;

    if (dom.seatGridTitle) dom.seatGridTitle.textContent = `${area.name} 좌석`;
    if (dom.seatGridSub) dom.seatGridSub.textContent = `총 ${seats.length}석 / 최대 ${state.maxSelect}석 선택 가능`;
    updateGuide(`${escapeHtml(area.name)} 선택됨`);

    renderSeatRows(seats);
  }

  function renderSeatGridByGrade(grade) {
    const seats = state.seats.filter((seat) => seat.grade === grade);
    dom.seatGridView.hidden = false;
    if (dom.seatGridTitle) dom.seatGridTitle.textContent = `${gradeLabel(grade)} 좌석`;
    if (dom.seatGridSub) dom.seatGridSub.textContent = `총 ${seats.length}석 / 최대 ${state.maxSelect}석 선택 가능`;
    renderSeatRows(seats);
  }

  function renderSeatRows(seats) {
    if (!dom.realSeatGrid) return;

    if (seats.length === 0) {
      dom.realSeatGrid.innerHTML = `<div class="cc-empty-zone">이 구역에 등록된 좌석이 없습니다.</div>`;
      return;
    }

    const grouped = groupBy(seats, (seat) => seat.rowName || "A");
    const rowNames = Object.keys(grouped).sort(compareRowName);
    const maxCols = Math.max(...rowNames.map((rowName) => grouped[rowName].length), 1);
    const seatSize = getSeatSize(maxCols);

    dom.realSeatGrid.innerHTML = "";
    dom.realSeatGrid.style.setProperty("--seat-size", `${seatSize}px`);

    rowNames.forEach((rowName) => {
      const rowSeats = grouped[rowName].sort(compareSeatNo);
      const row = document.createElement("div");
      row.className = "cc-seat-row";
      row.dataset.row = rowName;
      row.style.setProperty("--seat-count", String(rowSeats.length));

      const label = document.createElement("div");
      label.className = "cc-seat-row__label";
      label.textContent = `${rowName}열`;
      row.appendChild(label);

      const seatsBox = document.createElement("div");
      seatsBox.className = "cc-seat-row__seats";
      rowSeats.forEach((seat) => seatsBox.appendChild(createSeatButton(seat)));
      row.appendChild(seatsBox);

      dom.realSeatGrid.appendChild(row);
    });
  }

  function createSeatButton(seat) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `cc-real-seat cc-real-seat--${seat.grade.toLowerCase()}`;
    button.dataset.seatId = seat.id;
    button.title = `${seat.seatNumber} / ${formatPrice(seat.price)}`;
    button.textContent = seat.seatNo || "";

    if (!seat.available) {
      button.disabled = true;
      button.classList.add("is-disabled");
    }

    if (isSelected(seat.id)) {
      button.classList.add("is-selected");
    }

    button.addEventListener("click", () => toggleSeat(seat, button));
    return button;
  }

  function toggleSeat(seat, button) {
    if (!seat.available) return;

    const index = state.selectedSeats.findIndex((item) => String(item.id) === String(seat.id));
    if (index >= 0) {
      state.selectedSeats.splice(index, 1);
      button.classList.remove("is-selected");
      updateSelection();
      return;
    }

    if (state.selectedSeats.length >= state.maxSelect) {
      alert(`좌석은 최대 ${state.maxSelect}석까지 선택할 수 있습니다.`);
      return;
    }

    state.selectedSeats.push(seat);
    button.classList.add("is-selected");
    updateSelection();
  }

  function updateSelection() {
    const selected = state.selectedSeats;
    const total = selected.reduce((sum, seat) => sum + Number(seat.price || 0), 0);

    if (dom.selectedSeatList) {
      dom.selectedSeatList.innerHTML = selected.length === 0
        ? "선택된 좌석이 없습니다."
        : selected.map((seat) => `${escapeHtml(shortSeatName(seat))} ${formatPrice(seat.price)}`).join(" / ");
    }

    if (dom.selectedSeatIds) {
      dom.selectedSeatIds.value = selected.map((seat) => seat.id).join(",");
    }

    if (dom.selectedSeatInputs) {
      dom.selectedSeatInputs.innerHTML = selected.map((seat) => `
        <input type="hidden" name="seatIdList" value="${escapeHtml(String(seat.id))}">
      `).join("");
    }

    if (dom.completeBtn) {
      dom.completeBtn.disabled = selected.length === 0;
      dom.completeBtn.classList.toggle("is-ready", selected.length > 0);
      dom.completeBtn.innerHTML = selected.length === 0
        ? `좌석 선택 완료 <span>〉</span>`
        : `좌석 선택 완료 <strong>${selected.length}석 · ${formatPrice(total)}</strong> <span>〉</span>`;
    }
  }

  function updateAreaVisual() {
    const hasHighlight = Boolean(state.activeArea || state.hoverAreaId || state.hoverGrade);
    dom.mapStage?.classList.toggle("is-highlight", hasHighlight);

    document.querySelectorAll(".cc-zone-hit").forEach((node) => {
      const area = state.areas.find((item) => item.id === node.dataset.areaId);
      const isActive = state.activeArea?.id === area?.id;
      const isHover = state.hoverAreaId === area?.id;
      const isGrade = state.hoverGrade && area?.grade === state.hoverGrade;
      const visible = isActive || isHover || isGrade;

      node.classList.toggle("is-hidden", !hasHighlight);
      node.classList.toggle("is-muted", hasHighlight && !visible);
      node.classList.toggle("is-active", isActive || isGrade);
      node.classList.toggle("is-hover", isHover);
    });

    document.querySelectorAll(".cc-zone-label").forEach((node) => {
      const areaId = node.dataset.areaLabel;
      const area = state.areas.find((item) => item.id === areaId);
      const visible = state.activeArea?.id === areaId || state.hoverAreaId === areaId || (state.hoverGrade && area?.grade === state.hoverGrade);
      node.classList.toggle("is-visible", Boolean(visible));
    });
  }

  function updateMiniMap() {
    document.querySelectorAll("[data-mini-area-id]").forEach((node) => {
      const area = state.areas.find((item) => item.id === node.dataset.miniAreaId);
      const active = state.activeArea && area?.id === state.activeArea.id;
      node.setAttribute("fill", active ? area.color : "#cfcfcf");
      node.setAttribute("opacity", active ? ".86" : ".38");
    });
  }

  function showMap() {
    state.activeArea = null;
    dom.seatGridView.hidden = true;
    updateAreaVisual();
    updateMiniMap();
    updateGuide("구역을 먼저 선택해주세요 <small>(화면을 직접 선택하거나 우측 좌석등급을 선택해주세요)</small>");
  }

  function resetAll() {
    state.selectedSeats = [];
    state.activeArea = null;
    dom.seatGridView.hidden = true;
    document.querySelectorAll(".cc-real-seat.is-selected").forEach((button) => button.classList.remove("is-selected"));
    document.querySelectorAll(".cc-grade-row.is-active").forEach((button) => button.classList.remove("is-active"));
    updateAreaVisual();
    updateMiniMap();
    updateSelection();
    updateGuide("구역을 먼저 선택해주세요 <small>(화면을 직접 선택하거나 우측 좌석등급을 선택해주세요)</small>");
  }

  function seatsByArea(area) {
    const exact = state.seats.filter((seat) => seat.sectionKey === area.sectionKey || normalizeSectionName(seat.sectionName) === normalizeSectionName(area.section));
    if (exact.length > 0) return exact;
    return state.seats.filter((seat) => seat.grade === area.grade);
  }

  function usedGrades() {
    const set = new Set(state.seats.map((seat) => seat.grade).filter(Boolean));

    if (set.size === 0) {
      state.areas
        .map((area) => area.grade)
        .filter(Boolean)
        .forEach((grade) => set.add(grade));
    }

    return Array.from(set).sort((a, b) => gradeOrder(a) - gradeOrder(b));
  }

  function firstSeatBySection(floor, section) {
    const normalizedSection = normalizeSectionName(section);
    const key = sectionKey(floor, normalizedSection);

    return state.seats.find((seat) =>
      seat.sectionKey === key || normalizeSectionName(seat.sectionName) === normalizedSection
    );
  }

  function firstPriceByGrade(grade) {
    const seat = state.seats.find((item) => item.grade === grade && Number(item.price) > 0);
    return seat ? seat.price : 0;
  }

  function normalizeGrade(value) {
    const raw = String(value || "").trim().toUpperCase();
    if (raw === "VIP") return "VIP";
    if (raw === "SR" || raw === "STANDING" || raw === "STANDING석") return "SR";
    if (raw === "R" || raw === "R석") return "R";
    if (raw === "S" || raw === "S석") return "S";
    if (raw === "A" || raw === "A석") return "A";
    if (raw === "B" || raw === "B석") return "B";
    return raw || "A";
  }

  function gradeLabel(grade) {
    return GRADE_LABELS[grade] || `${grade}석`;
  }

  function gradeColor(grade) {
    return GRADE_COLORS[grade] || "#9ca3af";
  }

  function gradeOrder(grade) {
    const index = GRADE_ORDER.indexOf(grade);
    return index === -1 ? 99 : index;
  }

  function sectionKey(floor, section) {
    return `${Number(floor || 1)}-${normalizeSectionName(section)}`;
  }

  function normalizeSectionName(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/^\d+-/, "")
      .toUpperCase();
  }

  function parseSectionKey(value) {
    const text = String(value || "");
    const match = text.match(/^(\d+)-(.+)$/);
    if (!match) return { floor: 1, section: text };
    return { floor: Number(match[1]), section: match[2] };
  }

  function shortAreaName(name) {
    return String(name || "")
      .replace("VIP STANDING(SC+HT) ", "VIP ")
      .replace("STANDING ", "")
      .slice(0, 18);
  }

  function shortSeatName(seat) {
    if (!seat) return "";
    const section = seat.sectionName || "";
    const row = seat.rowName || "";
    const no = seat.seatNo || "";
    return `${section}-${row}${no}`;
  }

  function isSelected(id) {
    return state.selectedSeats.some((seat) => String(seat.id) === String(id));
  }

  function updateGuide(html) {
    if (dom.bottomGuideText) dom.bottomGuideText.innerHTML = html;
  }

  function groupBy(list, keyGetter) {
    return list.reduce((map, item) => {
      const key = keyGetter(item);
      if (!map[key]) map[key] = [];
      map[key].push(item);
      return map;
    }, {});
  }

  function formatPrice(value) {
    return `${Number(value || 0).toLocaleString("ko-KR")}원`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
