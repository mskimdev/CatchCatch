const TEMP_SEATMAP = {
    seatsUrl: "/temp/seatmap/concert-session/seatmap-seats.json",
    sectionsUrl: "/temp/seatmap/concert-session/seatmap-sections.json",
    //imageUrl: "/temp/seatmap/concert-session/seatmap-image.png"
};

document.addEventListener("DOMContentLoaded", () => {
    initCatchCatchBookingSeat().catch((error) => {
        console.error("[CatchCatch] booking seat init failed", error);
        alert("좌석 정보를 불러오지 못했습니다.");
    });
});

async function initCatchCatchBookingSeat() {
    const app = await loadBookingSeatApp();
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

        const displaySectionLabel = normalizeText(seat.sectionLabel ?? seat.label ?? seat.zoneLabel, sectionOnly);

        return {
            raw: seat,
            id,
            floor,
            section,
            sectionOnly,
            label: displaySectionLabel,
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
            seatNumber: seat.seatNumber || seat.name || `${floor} ${displaySectionLabel} ${row}열 ${no}번`
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
            color: zone.color || zone.renderColor || zone.fillColor || "",
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

        const existingSections = Array.from(sectionMap.keys());

        if (existingSections.length === 0) {
            return [];
        }

        return existingSections.map((section, index) => {
            const sectionSeats = sectionMap.get(section) || [];
            const firstSeat = sectionSeats[0] || {};
            const xs = sectionSeats.map((seat) => numberValue(seat.x, 0));
            const ys = sectionSeats.map((seat) => numberValue(seat.y, 0));
            const minX = xs.length ? Math.min(...xs) : 0;
            const maxX = xs.length ? Math.max(...xs) : 0;
            const minY = ys.length ? Math.min(...ys) : 0;
            const maxY = ys.length ? Math.max(...ys) : 0;
            const imageWidth = numberValue(app.imageWidth, 0) || Math.max(maxX, 1);
            const imageHeight = numberValue(app.imageHeight, 0) || Math.max(maxY, 1);

            return {
                section,
                label: firstSeat.label || firstSeat.sectionOnly || section,
                floor: firstSeat.floor || "1",
                grade: firstSeat.grade || "TEMP",
                x: clampNumber(toPercent(minX, imageWidth), 0, 100),
                y: clampNumber(toPercent(minY, imageHeight), 0, 100),
                w: Math.max(1, clampNumber(toPercent(Math.max(maxX - minX, 1), imageWidth), 0, 100)),
                h: Math.max(1, clampNumber(toPercent(Math.max(maxY - minY, 1), imageHeight), 0, 100)),
                angle: numberValue(firstSeat.angle, 0),
                clip: "",
                radius: "2px",
                fontSize: 18,
                order: 1000 + index
            };
        });
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

        if (zone.color) {
            button.style.setProperty("--zone-color", zone.color);
            button.style.backgroundColor = zone.color;
        }
    }

    function applySeatmapBackground(target, mini) {
        if (!target || !app.seatImageUrl) {
            return;
        }

        target.style.backgroundImage = `url("${app.seatImageUrl}")`;
        target.style.backgroundRepeat = "no-repeat";
        target.style.backgroundPosition = "center";
        target.style.backgroundSize = mini ? "contain" : "contain";
    }

    function clearSeatmapBackground(target) {
        if (!target) return;
        target.style.backgroundImage = "";
        target.style.backgroundRepeat = "";
        target.style.backgroundPosition = "";
        target.style.backgroundSize = "";
    }

    function hasSeatmapInfo() {
        return seats.length > 0 && zones.length > 0;
    }

    function createEmptySeatmapMessage(message = "좌석 정보가 없습니다.") {
        const box = document.createElement("div");
        box.className = "cc-seatmap-empty";
        box.innerHTML = `
            <strong>${escapeHtml(message)}</strong>
            <span>관리자 좌석도 저장 후 다시 확인해주세요.</span>
        `;
        return box;
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

        if (!hasSeatmapInfo()) {
            clearSeatmapBackground(zoneButtonLayer);
            zoneButtonLayer.appendChild(createEmptySeatmapMessage());

            if (mainGuideText) {
                mainGuideText.textContent = "좌석 정보가 없습니다.";
            }
            return;
        }

        applySeatmapBackground(zoneButtonLayer, false);

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

        if (!hasSeatmapInfo()) {
            clearSeatmapBackground(miniMap);
            miniMap.appendChild(createEmptySeatmapMessage("좌석 정보 없음"));
            return;
        }

        applySeatmapBackground(miniMap, true);

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
            gradeList.innerHTML = `<div class="cc-empty-selected">좌석 정보가 없습니다.</div>`;
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
        guide.textContent = sectionSeats.length > 0 ? "현재 보고 계신 구역입니다." : "좌석 정보가 없습니다.";
        canvasInner.appendChild(guide);

        if (sectionSeats.length === 0) {
            canvasInner.appendChild(createEmptySeatmapMessage());
            seatCanvas.appendChild(canvasInner);

            if (seatViewTitle) {
                seatViewTitle.textContent = `${zone ? zone.label : currentSection} 구역`;
            }
            if (seatViewSubText) {
                seatViewSubText.textContent = "좌석 정보가 없습니다.";
            }
            if (seatGuideText) {
                seatGuideText.textContent = "좌석 정보가 없습니다.";
            }
            return;
        }

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

    function injectSeatmapEmptyStyle() {
        if (document.getElementById("ccSeatmapEmptyStyle")) return;

        const style = document.createElement("style");
        style.id = "ccSeatmapEmptyStyle";
        style.textContent = `
            .cc-seatmap-empty {
                position: absolute;
                left: 50%;
                top: 50%;
                z-index: 10;
                min-width: 220px;
                padding: 18px 22px;
                border: 1px solid #e5e7eb;
                border-radius: 14px;
                background: rgba(255, 255, 255, 0.92);
                box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
                color: #0f172a;
                text-align: center;
                transform: translate(-50%, -50%);
                pointer-events: none;
            }

            .cc-seatmap-empty strong {
                display: block;
                font-size: 18px;
                font-weight: 900;
            }

            .cc-seatmap-empty span {
                display: block;
                margin-top: 6px;
                color: #64748b;
                font-size: 12px;
                font-weight: 700;
            }

            #miniMap .cc-seatmap-empty {
                min-width: 120px;
                padding: 10px 12px;
                border-radius: 10px;
            }

            #miniMap .cc-seatmap-empty strong {
                font-size: 12px;
            }

            #miniMap .cc-seatmap-empty span {
                display: none;
            }
        `;
        document.head.appendChild(style);
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

    injectSeatmapEmptyStyle();

    bindEvents();
    renderAll();
    showZoneView();
    initCountdown();

    console.log("CatchCatch booking seats =", seats);
    console.log("CatchCatch booking zones =", zones);
}


async function loadBookingSeatApp() {
    const baseApp = window.CATCHCATCH_BOOKING || {};

    console.log("[CatchCatch] booking-seat temp v5 flat split sectionId/polygons loaded");

    // 핵심: 서버/머스태치 샘플 데이터보다 temp 저장 결과를 먼저 사용한다.
    // temp가 없으면 기본 샘플을 띄우지 않고 빈 좌석 상태로 둔다.
    try {
        const [seatResponse, sectionResponse] = await Promise.all([
            fetch(`${TEMP_SEATMAP.seatsUrl}?v=${Date.now()}`, { cache: "no-store" }),
            fetch(`${TEMP_SEATMAP.sectionsUrl}?v=${Date.now()}`, { cache: "no-store" })
        ]);

        const tempSeats = seatResponse.ok ? await seatResponse.json() : [];
        const tempSections = sectionResponse.ok ? await sectionResponse.json() : [];
        const imageUrl = TEMP_SEATMAP.imageUrl;
        const imageSize = await readImageSize(imageUrl);

        const convertedTemp = convertTempSeatmapToBookingData(tempSeats, tempSections, imageSize);

        if (convertedTemp.hasData) {
            const nextApp = {
                ...baseApp,
                seats: convertedTemp.seats,
                zones: convertedTemp.zones,
                seatImageUrl: imageUrl,
                imageWidth: imageSize.width || convertedTemp.imageWidth || 0,
                imageHeight: imageSize.height || convertedTemp.imageHeight || 0,
                maxSelectCount: Number(baseApp.maxSelectCount || 4)
            };

            window.CATCHCATCH_BOOKING = nextApp;
            return nextApp;
        }

        console.warn("[CatchCatch] temp seatmap is empty. sample fallback blocked.", {
            seatsStatus: seatResponse.status,
            sectionsStatus: sectionResponse.status,
            tempSeatCount: Array.isArray(tempSeats) ? tempSeats.length : 0,
            tempSectionCount: Array.isArray(tempSections) ? tempSections.length : 0
        });
    } catch (error) {
        console.warn("[CatchCatch] temp seatmap load failed. sample fallback blocked.", error);
    }

    // 실제 서버 좌석 데이터를 쓰고 싶은 경우에만 머스태치에서 useServerSeatData: true 를 명시한다.
    // 기본값은 false. 즉 정보가 없으면 샘플 대신 '좌석 정보가 없습니다.' 표시.
    if (baseApp.useServerSeatData === true && Array.isArray(baseApp.seats) && baseApp.seats.length > 0) {
        return {
            ...baseApp,
            seats: baseApp.seats,
            zones: Array.isArray(baseApp.zones) ? baseApp.zones : [],
            seatImageUrl: baseApp.seatImageUrl || "",
            maxSelectCount: Number(baseApp.maxSelectCount || 4)
        };
    }

    const emptyApp = {
        ...baseApp,
        seats: [],
        zones: [],
        seatImageUrl: "",
        imageWidth: 0,
        imageHeight: 0,
        maxSelectCount: Number(baseApp.maxSelectCount || 4)
    };

    window.CATCHCATCH_BOOKING = emptyApp;
    return emptyApp;
}

function convertTempSeatmapToBookingData(tempSeats, tempSections, imageSize = { width: 0, height: 0 }) {
    const sourceSeats = convertTempSeatsToBookingSeats(tempSeats);
    const sections = normalizeArray(tempSections);
    const hasSections = sections.length > 0;
    const hasSeats = sourceSeats.length > 0;

    if (!hasSections && !hasSeats) {
        return {
            seats: [],
            zones: [],
            imageWidth: imageSize.width || 0,
            imageHeight: imageSize.height || 0,
            hasData: false
        };
    }

    const zones = convertTempSectionsToBookingZones(sections, imageSize);

    if (!hasSections) {
        return {
            seats: sourceSeats,
            zones: [],
            imageWidth: imageSize.width || 0,
            imageHeight: imageSize.height || 0,
            hasData: hasSeats
        };
    }

    const groupedSeats = [];
    const usedIds = new Set();

    sections.forEach((section, index) => {
        const groupSection = getTempSectionKey(section, index);
        const groupLabel = section.label || section.name || groupSection;
        const floor = section.floor || "1";
        const grade = section.grade || "TEMP";
        const price = toNumber(section.price || section.seatPrice, 0);
        const matchedSeats = getSeatsForTempSection(section, index, sourceSeats);

        matchedSeats.forEach((source) => {
            usedIds.add(String(source.id));
            groupedSeats.push({
                ...source,
                section: groupSection,
                sectionId: groupSection,
                sourceSectionId: source.sourceSectionId || source.sectionId || source.section,
                sectionName: groupSection,
                sectionLabel: groupLabel,
                floor: source.floor || floor,
                grade: source.grade && source.grade !== "TEMP" ? source.grade : grade,
                price: source.price || price,
                seatNumber: `${floor} ${groupLabel} ${source.row}열 ${source.col || source.no}번`
            });
        });
    });

    // sections에는 seatIds를 넣지 않는다. sectionId/sourceSectionId로 매칭한다.
    // 그래도 매칭이 전혀 안 된 오래된 JSON은 좌석을 버리지 않고 그대로 표시한다.
    if (groupedSeats.length === 0 && sourceSeats.length > 0) {
        groupedSeats.push(...sourceSeats);
    }

    return {
        seats: groupedSeats,
        zones,
        imageWidth: imageSize.width || inferSeatmapSize(sections).width || 0,
        imageHeight: imageSize.height || inferSeatmapSize(sections).height || 0,
        hasData: groupedSeats.length > 0 && zones.length > 0
    };
}

function getSeatsForTempSection(section, index, sourceSeats) {
    const sectionKey = getTempSectionKey(section, index);
    const sourceIds = normalizeArray(section.sectionIds || section.sourceRegionIds || section.regionIds || section.sections)
        .map((value) => String(value));

    if (!sourceIds.includes(sectionKey)) {
        sourceIds.push(sectionKey);
    }

    return sourceSeats.filter((seat) => {
        const keys = [
            seat.sectionId,
            seat.sourceSectionId,
            seat.section,
            seat.sectionName,
            seat.zone,
            seat.zoneName
        ].filter((value) => value != null).map((value) => String(value));

        return keys.some((key) => sourceIds.includes(key));
    });
}

function getTempSectionKey(section, index) {
    return String(section.id || section.section || section.name || section.label || `vg-${index + 1}`);
}

function convertTempSeatsToBookingSeats(items) {
    return normalizeArray(items).map((item) => {
        if (item && typeof item === "object" && item.id && (item.x !== undefined || item.seatId !== undefined)) {
            return {
                id: item.id || item.seatId,
                sectionId: item.sectionId || item.section || item.sectionName || item.zone || item.zoneName || "",
                sourceSectionId: item.sourceSectionId || item.originalSectionId || item.regionId || "",
                floor: item.floor || "1",
                section: item.section || item.sectionName || item.zone || item.zoneName || item.sectionId || "A",
                row: item.row || item.rowName || "1",
                col: item.col || item.no || item.seatNo || "1",
                no: item.col || item.no || item.seatNo || "1",
                grade: item.grade || item.seatGrade || "A",
                status: item.status || item.seatStatus || "AVAILABLE",
                x: toNumber(item.x, 0),
                y: toNumber(item.y, 0),
                size: toNumber(item.size, 14),
                angle: toNumber(item.angle || item.gridAngle, 0),
                price: toNumber(item.price || item.seatPrice, 0)
            };
        }

        const id = typeof item === "string" ? item : String(item?.id || "");
        const parts = id.split("-");
        const angleText = parts.slice(9).join("-") || "0";

        return {
            id,
            sectionId: parts[1] || "A",
            sourceSectionId: "",
            floor: parts[0] || "1",
            section: parts[1] || "A",
            row: parts[2] || "1",
            col: parts[3] || "1",
            no: parts[3] || "1",
            grade: parts[4] || "A",
            status: parts[5] || "AVAILABLE",
            x: toNumber(parts[6], 0),
            y: toNumber(parts[7], 0),
            size: toNumber(parts[8], 14),
            angle: toNumber(angleText, 0),
            price: 0
        };
    }).filter((seat) => seat.id);
}

function convertTempSectionsToBookingZones(sections, imageSize) {
    const list = normalizeArray(sections);
    const fallbackSize = inferSeatmapSize(list);
    const width = imageSize.width || fallbackSize.width || 1;
    const height = imageSize.height || fallbackSize.height || 1;
    const result = [];

    list.forEach((section, index) => {
        const sectionPolygons = getSectionPolygons(section);
        const wholeBbox = normalizeBbox(section.bbox || getPolygonBbox(sectionPolygons.flat()));
        const button = section.button || {};
        const name = getTempSectionKey(section, index);
        const label = section.label || section.name || name;
        const floor = section.floor || "1";
        const grade = section.grade || "TEMP";
        const color = section.color || section.renderColor || section.fillColor || button.color || "";
        const polygons = sectionPolygons.length > 0 ? sectionPolygons : [normalizePolygon(section.polygon || section.points || section.seatShape || [])];

        polygons.forEach((polygon, polygonIndex) => {
            const bbox = normalizeBbox(getPolygonBbox(polygon));
            const zoneX = bbox.w > 0 ? bbox.x : toNumber(button.x, 20);
            const zoneY = bbox.h > 0 ? bbox.y : toNumber(button.y, 40);
            const zoneW = bbox.w > 0 ? bbox.w : toNumber(button.w || button.width, 12);
            const zoneH = bbox.h > 0 ? bbox.h : toNumber(button.h || button.height, 10);

            result.push({
                section: name,
                label: polygonIndex === 0 ? label : "",
                floor,
                grade,
                color,
                x: toPercent(zoneX, width),
                y: toPercent(zoneY, height),
                w: Math.max(1, toPercent(zoneW, width)),
                h: Math.max(1, toPercent(zoneH, height)),
                angle: toNumber(button.angle || section.angle || section.gridAngle, 0),
                clip: polygon.length >= 3 && bbox.w > 0 && bbox.h > 0 ? polygonToClipPath(polygon, bbox) : "",
                radius: section.radius || "2px",
                fontSize: toNumber(section.fontSize, 24),
                order: toNumber(section.order, index + 1) + polygonIndex / 100,
                wholeBbox
            });
        });
    });

    return result;
}

function getSectionPolygons(section) {
    if (Array.isArray(section.polygons) && section.polygons.length > 0) {
        return section.polygons
            .filter((polygon) => Array.isArray(polygon) && polygon.length >= 3)
            .map((polygon) => normalizePolygon(polygon))
            .filter((polygon) => polygon.length >= 3);
    }

    const polygon = normalizePolygon(section.polygon || section.points || section.seatShape || []);
    return polygon.length >= 3 ? [polygon] : [];
}

function normalizeArray(value) {
    if (Array.isArray(value)) {
        return value;
    }

    if (value && typeof value === "object") {
        return Object.values(value);
    }

    return [];
}

function readImageSize(url) {
    return new Promise((resolve) => {
        if (!url) {
            resolve({ width: 0, height: 0 });
            return;
        }

        const image = new Image();
        image.onload = () => resolve({ width: image.naturalWidth || 0, height: image.naturalHeight || 0 });
        image.onerror = () => resolve({ width: 0, height: 0 });
        image.src = `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
    });
}

function inferSeatmapSize(sections) {
    let width = 0;
    let height = 0;

    sections.forEach((section) => {
        const polygons = getSectionPolygons(section);
        const polygon = polygons.flat();
        const bbox = normalizeBbox(section.bbox || getPolygonBbox(polygon));
        width = Math.max(width, bbox.x + bbox.w, toNumber(section.button?.x, 0) + toNumber(section.button?.w, 0));
        height = Math.max(height, bbox.y + bbox.h, toNumber(section.button?.y, 0) + toNumber(section.button?.h, 0));
    });

    return { width, height };
}

function normalizePolygon(points) {
    if (!Array.isArray(points)) {
        return [];
    }

    return points
        .map((point) => ({ x: toNumber(point.x, 0), y: toNumber(point.y, 0) }))
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
}

function normalizeBbox(bbox) {
    return {
        x: toNumber(bbox?.x, 0),
        y: toNumber(bbox?.y, 0),
        w: toNumber(bbox?.w ?? bbox?.width, 0),
        h: toNumber(bbox?.h ?? bbox?.height, 0)
    };
}

function getPolygonBbox(points) {
    if (!points.length) {
        return { x: 0, y: 0, w: 0, h: 0 };
    }

    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function polygonToClipPath(points, bbox) {
    const items = points.map((point) => {
        const x = bbox.w ? ((point.x - bbox.x) / bbox.w) * 100 : 0;
        const y = bbox.h ? ((point.y - bbox.y) / bbox.h) * 100 : 0;
        return `${roundCss(clampNumber(x, 0, 100))}% ${roundCss(clampNumber(y, 0, 100))}%`;
    });

    return `polygon(${items.join(", ")})`;
}

function toPercent(value, base) {
    const number = toNumber(value, 0);

    if (Math.abs(number) <= 100 && base <= 100) {
        return number;
    }

    return (number / Math.max(1, base)) * 100;
}

function toNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function roundCss(value) {
    return Math.round(value * 100) / 100;
}
