document.addEventListener("DOMContentLoaded", () => {
    const app = window.CATCHCATCH_BOOKING || {};
    const rawSeats = Array.isArray(app.seats) ? app.seats : [];
    const rawZones = Array.isArray(app.zones) ? app.zones : [];
    const maxSelectCount = Number(app.maxSelectCount || 4);

    const zoneView = document.querySelector("#zoneView");
    const seatView = document.querySelector("#seatView");
    const zoneButtonLayer = document.querySelector("#zoneButtonLayer");
    const miniMap = document.querySelector("#miniMap");
    const gradeList = document.querySelector("#gradeList");
    const seatCanvas = document.querySelector("#seatCanvas");
    const seatViewTitle = document.querySelector("#seatViewTitle");
    const seatViewSubText = document.querySelector("#seatViewSubText");
    const mainGuideText = document.querySelector("#mainGuideText");
    const seatGuideText = document.querySelector("#seatGuideText");
    const selectedSeatList = document.querySelector("#selectedSeatList");
    const selectedCountText = document.querySelector("#selectedCountText");
    const totalPriceText = document.querySelector("#totalPriceText");
    const selectedSeatIds = document.querySelector("#selectedSeatIds");
    const selectedSeatInputs = document.querySelector("#selectedSeatInputs");
    const bookingCompleteBtn = document.querySelector("#bookingCompleteBtn");
    const bookingCompleteForm = document.querySelector("#bookingCompleteForm");
    const timerEl = document.querySelector("[data-countdown]");

    const selectedSeats = new Map();

    let currentSection = "";
    let currentGrade = "";

    const defaultZoneLayouts = [
        { section: "1F-E", label: "E", floor: "1F", grade: "S", x: 16, y: 28, w: 15, h: 15, angle: 0, clip: "polygon(24% 0, 100% 0, 100% 100%, 0 100%, 0 28%)", order: 10 },
        { section: "1F-D", label: "D", floor: "1F", grade: "R", x: 32, y: 28, w: 18, h: 15, angle: 0, order: 20 },
        { section: "1F-C", label: "C", floor: "1F", grade: "R", x: 50, y: 28, w: 18, h: 15, angle: 0, order: 30 },
        { section: "1F-B", label: "B", floor: "1F", grade: "R", x: 68, y: 28, w: 18, h: 15, angle: 0, order: 40 },
        { section: "1F-A", label: "A", floor: "1F", grade: "S", x: 84, y: 28, w: 15, h: 15, angle: 0, clip: "polygon(0 0, 76% 0, 100% 28%, 100% 100%, 0 100%)", order: 50 },

        { section: "2F-E", label: "E", floor: "2F", grade: "S", x: 16, y: 48, w: 17, h: 14, angle: 0, clip: "polygon(22% 0, 100% 0, 100% 100%, 0 100%, 0 35%)", order: 60 },
        { section: "2F-D", label: "D", floor: "2F", grade: "S", x: 34, y: 48, w: 16, h: 14, angle: 0, order: 70 },
        { section: "2F-C", label: "C", floor: "2F", grade: "S", x: 51, y: 48, w: 20, h: 14, angle: 0, order: 80 },
        { section: "2F-B", label: "B", floor: "2F", grade: "S", x: 70, y: 48, w: 16, h: 14, angle: 0, order: 90 },
        { section: "2F-A", label: "A", floor: "2F", grade: "S", x: 86, y: 48, w: 17, h: 14, angle: 0, clip: "polygon(0 0, 78% 0, 100% 35%, 100% 100%, 0 100%)", order: 100 },

        { section: "3F-E", label: "E", floor: "3F", grade: "A", x: 16, y: 72, w: 17, h: 14, angle: 0, clip: "polygon(22% 0, 100% 0, 100% 100%, 0 100%, 0 35%)", order: 110 },
        { section: "3F-D", label: "D", floor: "3F", grade: "A", x: 34, y: 72, w: 16, h: 14, angle: 0, order: 120 },
        { section: "3F-C", label: "C", floor: "3F", grade: "A", x: 52, y: 72, w: 20, h: 14, angle: 0, order: 130 },
        { section: "3F-B", label: "B", floor: "3F", grade: "A", x: 71, y: 72, w: 16, h: 14, angle: 0, order: 140 },
        { section: "3F-A", label: "A", floor: "3F", grade: "A", x: 87, y: 72, w: 17, h: 14, angle: 0, clip: "polygon(0 0, 78% 0, 100% 35%, 100% 100%, 0 100%)", order: 150 }
    ];

    function normalizeText(value, fallback) {
        const text = String(value ?? fallback ?? "").trim();
        return text || String(fallback ?? "");
    }

    function normalizeSection(value, floor) {
        const raw = normalizeText(value, "A")
            .replaceAll("구역", "")
            .replace(/\s+/g, "-")
            .toUpperCase();

        const floorText = normalizeText(floor, "");
        if (floorText && !raw.startsWith(`${floorText.toUpperCase()}-`)) {
            return `${floorText.toUpperCase()}-${raw}`;
        }

        return raw;
    }

    function normalizeGrade(value) {
        const raw = normalizeText(value, "A").toUpperCase();

        if (raw === "VIP") return "VIP";
        if (raw.includes("STANDING")) return "STANDING";
        if (raw === "R" || raw === "R석") return "R";
        if (raw === "S" || raw === "S석") return "S";
        if (raw === "A" || raw === "A석") return "A";
        if (raw === "B" || raw === "B석") return "B";

        return raw || "A";
    }

    function gradeName(grade) {
        if (grade === "VIP") return "VIP";
        if (grade === "STANDING") return "STANDING석";
        return `${grade}석`;
    }

    function gradeClass(grade) {
        return `cc-grade-${String(grade || "A").toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    }

    function numberValue(value, fallback) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function priceText(value) {
        return `${Number(value || 0).toLocaleString("ko-KR")}원`;
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function isBlockedStatus(status) {
        return [
            "SOLD",
            "RESERVED",
            "BOOKED",
            "PENDING",
            "CONFIRMED",
            "UNAVAILABLE",
            "OBSTRUCTED",
            "REMOVED",
            "DISABLED"
        ].includes(String(status || "").toUpperCase());
    }

    function normalizeSeat(seat) {
        const floor = normalizeText(seat.floor ?? seat.floorName, "1F");
        const sectionOnly = normalizeText(seat.sectionName ?? seat.section ?? seat.zoneName ?? seat.zone, "A");
        const section = normalizeSection(sectionOnly, floor);
        const row = normalizeText(seat.rowName ?? seat.row ?? seat.seatRow, "1");
        const no = normalizeText(seat.seatNo ?? seat.seatNumberOnly ?? seat.no ?? seat.number ?? seat.col ?? seat.seatCol, "1");
        const grade = normalizeGrade(seat.grade ?? seat.gradeCode ?? seat.seatGrade);
        const status = normalizeText(seat.status ?? seat.seatStatus, "AVAILABLE").toUpperCase();
        const bookingStatus = normalizeText(seat.bookingStatus ?? seat.booking_status, "").toUpperCase();
        const id = normalizeText(seat.id ?? seat.seatId, `${floor}-${section}-${row}-${no}`);

        return {
            raw: seat,
            id,
            floor,
            section,
            sectionOnly,
            label: sectionOnly,
            row,
            no,
            grade,
            gradeName: seat.gradeName || gradeName(grade),
            price: numberValue(seat.price ?? seat.seatPrice, 0),
            status,
            bookingStatus,
            available: seat.available === false || seat.isAvailable === false || seat.sold === true || seat.reserved === true || seat.booked === true || seat.disabled === true
                ? false
                : !isBlockedStatus(status) && !isBlockedStatus(bookingStatus),
            x: numberValue(seat.x ?? seat.xLabel, null),
            y: numberValue(seat.y ?? seat.yLabel, null),
            size: numberValue(seat.size, 14),
            angle: numberValue(seat.angle, 0),
            imageUrl: seat.imageUrl || seat.seatImageUrl || "",
            seatNumber: seat.seatNumber || seat.name || `${floor} ${sectionOnly}구역 ${row}열 ${no}번`
        };
    }

    function normalizeZone(zone, index) {
        const floor = normalizeText(zone.floor ?? zone.floorName, "");
        const sectionValue = normalizeText(zone.section ?? zone.sectionName ?? zone.zone ?? zone.zoneName, zone.name ?? `ZONE-${index + 1}`);
        const section = normalizeSection(sectionValue, floor);
        const grade = normalizeGrade(zone.grade ?? zone.gradeCode ?? zone.seatGrade ?? "A");

        return {
            section,
            label: normalizeText(zone.label ?? zone.text ?? sectionValue, sectionValue),
            floor,
            grade,
            x: numberValue(zone.x, 20),
            y: numberValue(zone.y, 40),
            w: numberValue(zone.w ?? zone.width, 12),
            h: numberValue(zone.h ?? zone.height, 10),
            angle: numberValue(zone.angle, 0),
            clip: zone.clip || zone.clipPath || "",
            radius: zone.radius || "2px",
            fontSize: numberValue(zone.fontSize, 24),
            order: numberValue(zone.order, index + 1)
        };
    }

    const seats = rawSeats.map(normalizeSeat);

    function makeSectionMap() {
        const map = new Map();

        seats.forEach((seat) => {
            if (!map.has(seat.section)) {
                map.set(seat.section, []);
            }

            map.get(seat.section).push(seat);
        });

        return map;
    }

    const sectionMap = makeSectionMap();

    function makeZones() {
        const fromServer = rawZones.map(normalizeZone);

        if (fromServer.length > 0) {
            return fromServer;
        }

        const defaults = defaultZoneLayouts.map((zone, index) => normalizeZone(zone, index));
        const existingSections = Array.from(sectionMap.keys());

        if (existingSections.length === 0) {
            return defaults;
        }

        const defaultMap = new Map(defaults.map((zone) => [zone.section, zone]));
        const zones = [];

        existingSections.forEach((section, index) => {
            if (defaultMap.has(section)) {
                zones.push(defaultMap.get(section));
                return;
            }

            const firstSeat = sectionMap.get(section)[0];

            zones.push({
                section,
                label: firstSeat.sectionOnly,
                floor: firstSeat.floor,
                grade: firstSeat.grade,
                x: 16 + (index % 5) * 18,
                y: 30 + Math.floor(index / 5) * 18,
                w: 16,
                h: 12,
                angle: 0,
                clip: "",
                radius: "2px",
                fontSize: 24,
                order: 1000 + index
            });
        });

        return zones;
    }

    const zones = makeZones().sort((a, b) => a.order - b.order);

    function zoneSeatInfo(section) {
        const list = sectionMap.get(section) || [];
        return {
            total: list.length,
            available: list.filter((seat) => seat.available).length,
            seats: list
        };
    }

    function setZoneStyle(button, zone, mini) {
        const scaleFont = mini ? Math.max(7, zone.fontSize * .42) : zone.fontSize;

        button.style.setProperty("--x", `${zone.x}%`);
        button.style.setProperty("--y", `${zone.y}%`);
        button.style.setProperty("--w", `${zone.w}%`);
        button.style.setProperty("--h", `${zone.h}%`);
        button.style.setProperty("--angle", `${zone.angle}deg`);
        button.style.setProperty("--font-size", `${scaleFont}px`);
        button.style.setProperty("--mini-font-size", `${scaleFont}px`);
        button.style.setProperty("--radius", zone.radius);

        if (zone.clip) {
            button.style.setProperty("--clip", zone.clip);
        }
    }

    function createZoneButton(zone, mini) {
        const info = zoneSeatInfo(zone.section);
        const button = document.createElement("button");

        button.type = "button";
        button.className = `cc-zone-area-btn ${gradeClass(zone.grade)}`;
        button.dataset.section = zone.section;
        button.dataset.grade = zone.grade;
        button.textContent = zone.label;
        button.title = `${zone.label} / 잔여 ${info.available}석`;

        setZoneStyle(button, zone, mini);

        if (currentSection === zone.section) {
            button.classList.add("is-active");
        }

        if (currentGrade && currentGrade !== zone.grade) {
            button.classList.add("is-dimmed");
        }

        if (info.total === 0) {
            button.classList.add("is-disabled");
        }

        button.addEventListener("click", () => {
            if (info.total === 0) return;
            openSection(zone.section);
        });

        return button;
    }

    function renderZoneMap() {
        if (!zoneButtonLayer) return;

        zoneButtonLayer.innerHTML = "";

        zones.forEach((zone) => {
            zoneButtonLayer.appendChild(createZoneButton(zone, false));
        });

        if (mainGuideText) {
            mainGuideText.textContent = currentGrade
                ? `${gradeName(currentGrade)} 구역을 선택해주세요.`
                : "구역을 먼저 선택해주세요.";
        }
    }

    function renderMiniMap() {
        if (!miniMap) return;

        miniMap.innerHTML = "";

        const stage = document.createElement("div");
        stage.className = "cc-stage-label";
        stage.textContent = "무대";
        miniMap.appendChild(stage);

        zones.forEach((zone) => {
            miniMap.appendChild(createZoneButton(zone, true));
        });
    }

    function makeGrades() {
        const map = new Map();

        seats.forEach((seat) => {
            if (!map.has(seat.grade)) {
                map.set(seat.grade, {
                    grade: seat.grade,
                    total: 0,
                    available: 0,
                    price: seat.price
                });
            }

            const item = map.get(seat.grade);
            item.total += 1;

            if (seat.available) {
                item.available += 1;
            }

            if (!item.price && seat.price) {
                item.price = seat.price;
            }
        });

        const order = ["VIP", "R", "S", "A", "B", "STANDING"];

        return Array.from(map.values()).sort((a, b) => {
            const ai = order.indexOf(a.grade);
            const bi = order.indexOf(b.grade);
            const av = ai === -1 ? 999 : ai;
            const bv = bi === -1 ? 999 : bi;

            if (av !== bv) return av - bv;
            return a.grade.localeCompare(b.grade, "ko-KR", { numeric: true });
        });
    }

    function renderGradeList() {
        if (!gradeList) return;

        const grades = makeGrades();

        gradeList.innerHTML = "";

        if (grades.length === 0) {
            gradeList.innerHTML = `<div class="cc-empty-selected">좌석 등급 정보가 없습니다.</div>`;
            return;
        }

        grades.forEach((item) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = `cc-grade-row ${currentGrade === item.grade ? "is-active" : ""}`;
            button.dataset.grade = item.grade;

            button.innerHTML = `
                <i class="cc-grade-color ${gradeClass(item.grade)}"></i>
                <span class="cc-grade-name">${escapeHtml(gradeName(item.grade))}</span>
                <span class="cc-grade-price">${priceText(item.price)}</span>
                <span class="cc-grade-arrow">⌄</span>
            `;

            button.addEventListener("click", () => {
                currentGrade = currentGrade === item.grade ? "" : item.grade;
                currentSection = "";
                showZoneView();
                renderAll();
            });

            gradeList.appendChild(button);
        });
    }

    function showZoneView() {
        if (zoneView) zoneView.classList.add("is-active");
        if (seatView) seatView.classList.remove("is-active");
        currentSection = "";
    }

    function openSection(section) {
        currentSection = section;
        currentGrade = "";

        if (zoneView) zoneView.classList.remove("is-active");
        if (seatView) seatView.classList.add("is-active");

        renderSectionSeats();
        renderAllSideOnly();
    }

    function compareSeats(a, b) {
        const rowCompare = String(a.row).localeCompare(String(b.row), "ko-KR", { numeric: true });
        if (rowCompare !== 0) return rowCompare;
        return String(a.no).localeCompare(String(b.no), "ko-KR", { numeric: true });
    }

    function makeAutoPositions(sectionSeats) {
        const sorted = [...sectionSeats].sort(compareSeats);
        const hasCoordinate = sorted.some((seat) => seat.x !== null && seat.y !== null);

        if (hasCoordinate) {
            const xs = sorted.map((seat) => numberValue(seat.x, 0));
            const ys = sorted.map((seat) => numberValue(seat.y, 0));
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);
            const width = Math.max(maxX - minX, 1);
            const height = Math.max(maxY - minY, 1);

            return sorted.map((seat) => ({
                seat,
                x: 9 + ((numberValue(seat.x, 0) - minX) / width) * 82,
                y: 10 + ((numberValue(seat.y, 0) - minY) / height) * 78
            }));
        }

        const rows = new Map();

        sorted.forEach((seat) => {
            if (!rows.has(seat.row)) {
                rows.set(seat.row, []);
            }

            rows.get(seat.row).push(seat);
        });

        const rowNames = Array.from(rows.keys()).sort((a, b) => String(a).localeCompare(String(b), "ko-KR", { numeric: true }));
        const result = [];

        rowNames.forEach((rowName, rowIndex) => {
            const rowSeats = rows.get(rowName).sort(compareSeats);

            rowSeats.forEach((seat, colIndex) => {
                result.push({
                    seat,
                    x: 10 + colIndex * (80 / Math.max(rowSeats.length - 1, 1)),
                    y: 12 + rowIndex * (76 / Math.max(rowNames.length - 1, 1))
                });
            });
        });

        return result;
    }

    function renderSectionSeats() {
        if (!seatCanvas) return;

        const sectionSeats = sectionMap.get(currentSection) || [];
        const zone = zones.find((item) => item.section === currentSection);
        const availableCount = sectionSeats.filter((seat) => seat.available).length;
        const canvasInner = document.createElement("div");

        seatCanvas.innerHTML = "";
        canvasInner.className = "cc-seat-canvas-inner";

        const imageUrl = sectionSeats.find((seat) => seat.imageUrl)?.imageUrl || app.seatImageUrl || "";
        if (imageUrl) {
            canvasInner.style.backgroundImage = `url("${imageUrl}")`;
        }

        const guide = document.createElement("div");
        guide.className = "cc-seat-canvas-guide";
        guide.textContent = "현재 보고 계신 구역은 1층입니다.";
        canvasInner.appendChild(guide);

        if (seatViewTitle) {
            seatViewTitle.textContent = `${zone ? zone.label : currentSection} 구역`;
        }

        if (seatViewSubText) {
            seatViewSubText.textContent = `잔여 ${availableCount.toLocaleString("ko-KR")}석 / 총 ${sectionSeats.length.toLocaleString("ko-KR")}석`;
        }

        const positions = makeAutoPositions(sectionSeats);

        positions.forEach((item) => {
            const seat = item.seat;
            const button = document.createElement("button");

            button.type = "button";
            button.className = "cc-seat-dot";
            button.dataset.seatId = seat.id;
            button.title = seat.available
                ? `${seat.seatNumber} / ${seat.gradeName} / ${priceText(seat.price)}`
                : `${seat.seatNumber} / 예매 불가`;

            button.style.setProperty("--x", `${item.x}%`);
            button.style.setProperty("--y", `${item.y}%`);
            button.style.setProperty("--size", `${Math.max(8, Math.min(seat.size, 24))}px`);
            button.style.setProperty("--angle", `${seat.angle}deg`);

            if (!seat.available) {
                button.classList.add("is-sold");
                button.disabled = true;
            } else if (selectedSeats.has(seat.id)) {
                button.classList.add("is-selected");
            } else {
                button.classList.add("is-available");
            }

            button.addEventListener("click", () => {
                toggleSeat(seat);
            });

            button.addEventListener("mouseenter", () => {
                if (!seatGuideText) return;

                seatGuideText.textContent = seat.available
                    ? `${seat.seatNumber} / ${seat.gradeName} / ${priceText(seat.price)}`
                    : `${seat.seatNumber} / 예매 불가`;
            });

            canvasInner.appendChild(button);
        });

        seatCanvas.appendChild(canvasInner);

        if (seatGuideText) {
            seatGuideText.textContent = "좌석을 선택해주세요.";
        }
    }

    function toggleSeat(seat) {
        if (!seat.available) return;

        if (selectedSeats.has(seat.id)) {
            selectedSeats.delete(seat.id);
            renderSectionSeats();
            renderSelectedPanel();
            return;
        }

        if (selectedSeats.size >= maxSelectCount) {
            alert(`좌석은 최대 ${maxSelectCount}석까지 선택할 수 있습니다.`);
            return;
        }

        selectedSeats.set(seat.id, seat);
        renderSectionSeats();
        renderSelectedPanel();
    }

    function renderSelectedPanel() {
        if (!selectedSeatList) return;

        const list = Array.from(selectedSeats.values());

        selectedSeatList.innerHTML = "";

        if (list.length === 0) {
            selectedSeatList.innerHTML = `<div class="cc-empty-selected">선택된 좌석이 없습니다.</div>`;
        } else {
            list.forEach((seat) => {
                const row = document.createElement("div");
                row.className = "cc-selected-seat";
                row.innerHTML = `
                    <div>
                        <div class="cc-selected-seat-name">${escapeHtml(seat.seatNumber)}</div>
                        <div class="cc-selected-seat-price">${escapeHtml(seat.gradeName)} ${priceText(seat.price)}</div>
                    </div>
                    <button type="button" class="cc-selected-remove" data-remove-seat="${escapeHtml(seat.id)}">삭제</button>
                `;
                selectedSeatList.appendChild(row);
            });
        }

        const totalPrice = list.reduce((sum, seat) => sum + Number(seat.price || 0), 0);

        if (selectedCountText) {
            selectedCountText.textContent = `총 ${list.length}석`;
        }

        if (totalPriceText) {
            totalPriceText.textContent = priceText(totalPrice);
        }

        renderHiddenInputs();

        if (bookingCompleteBtn) {
            bookingCompleteBtn.disabled = list.length === 0;
        }
    }

    function renderHiddenInputs() {
        const ids = Array.from(selectedSeats.keys());

        if (selectedSeatIds) {
            selectedSeatIds.value = ids.join(",");
        }

        if (!selectedSeatInputs) return;

        selectedSeatInputs.innerHTML = "";

        ids.forEach((id) => {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = "seatIds";
            input.value = id;
            selectedSeatInputs.appendChild(input);
        });
    }

    function bindEvents() {
        const backToZoneBtn = document.querySelector("#backToZoneBtn");
        const clearSeatsBtn = document.querySelector("#clearSeatsBtn");
        const openFullMapBtn = document.querySelector("#openFullMapBtn");
        const refreshSeatBtn = document.querySelector("#refreshSeatBtn");

        if (backToZoneBtn) {
            backToZoneBtn.addEventListener("click", () => {
                showZoneView();
                renderAll();
            });
        }

        if (openFullMapBtn) {
            openFullMapBtn.addEventListener("click", () => {
                showZoneView();
                renderAll();
            });
        }

        if (clearSeatsBtn) {
            clearSeatsBtn.addEventListener("click", () => {
                selectedSeats.clear();
                renderSectionSeats();
                renderSelectedPanel();
            });
        }

        if (refreshSeatBtn) {
            refreshSeatBtn.addEventListener("click", () => {
                renderAll();
            });
        }

        document.addEventListener("click", (event) => {
            const removeButton = event.target.closest("[data-remove-seat]");
            if (!removeButton) return;

            selectedSeats.delete(removeButton.dataset.removeSeat);
            renderSectionSeats();
            renderSelectedPanel();
        });

        if (bookingCompleteForm) {
            bookingCompleteForm.addEventListener("submit", (event) => {
                renderHiddenInputs();

                if (selectedSeats.size === 0) {
                    event.preventDefault();
                    alert("좌석을 먼저 선택해주세요.");
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
                selectedSeats.clear();
                renderSelectedPanel();

                if (currentSection) {
                    renderSectionSeats();
                }

                alert("좌석 보관 시간이 만료되었습니다. 좌석을 다시 선택해주세요.");
                return;
            }

            remainSeconds -= 1;
            window.setTimeout(tick, 1000);
        }

        tick();
    }

    function renderAllSideOnly() {
        renderMiniMap();
        renderGradeList();
        renderSelectedPanel();
    }

    function renderAll() {
        renderZoneMap();
        renderAllSideOnly();
    }

    bindEvents();
    renderAll();
    showZoneView();
    initCountdown();

    console.log("CatchCatch booking seats =", seats);
    console.log("CatchCatch booking zones =", zones);
});