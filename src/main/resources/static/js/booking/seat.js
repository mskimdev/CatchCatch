document.addEventListener("DOMContentLoaded", () => {
    const MAX_SELECT_COUNT = 4;

    const rawSeats = Array.isArray(window.CATCHCATCH_SEATS)
        ? window.CATCHCATCH_SEATS
        : [];

    const dbSeats = rawSeats.map(normalizeSeat);

    const overview = document.querySelector(".cc-zone-overview--large");
    const imageBox = document.querySelector(".cc-zone-overview__image-box--large");
    const zoneLayer = document.querySelector("#seatImageHoverLayer");
    const zoneDetail = document.querySelector(".cc-zone-detail");
    const zoneTitle = document.querySelector("#zoneTitle");
    const zoneSubText = document.querySelector("#zoneSubText");
    const zoneSeatGrid = document.querySelector("#zoneSeatGrid");
    const hoverInfo = document.querySelector("#seatHoverInfo");
    const resetZoneBtn = document.querySelector("#resetZoneBtn");

    const side = document.querySelector(".cc-seat-side");
    const selectedList = document.querySelector(".cc-selected-list");
    const totalBox = document.querySelector(".cc-total");
    const totalPriceEl = document.querySelector(".cc-total__price");
    const paymentForm = document.querySelector(".cc-payment-form");
    const timerEl = document.querySelector("[data-countdown]");
    const selectedSeatIdsInput = document.querySelector("#selectedSeatIds");
    const selectedSeatInputs = document.querySelector("#selectedSeatInputs");

    const selectedSeats = new Map();

    let currentSection = "";
    let currentGrade = "";

    const zoneLayouts = {
        "D2": { x: 10, y: 49, w: 13, h: 15, angle: -13, grade: "S", label: "D2", order: 10 },
        "C2": { x: 18, y: 64, w: 13, h: 15, angle: -36, grade: "R", label: "C2", order: 20 },
        "B2": { x: 30, y: 76, w: 16, h: 14, angle: -22, grade: "R", label: "B2", order: 30 },
        "A2": { x: 44, y: 83, w: 16, h: 10, angle: 0, grade: "R", label: "A2", order: 40 },
        "P2": { x: 56, y: 83, w: 16, h: 10, angle: 0, grade: "R", label: "P2", order: 50 },
        "O2": { x: 70, y: 76, w: 16, h: 14, angle: 22, grade: "R", label: "O2", order: 60 },
        "N2": { x: 82, y: 64, w: 13, h: 15, angle: 36, grade: "R", label: "N2", order: 70 },
        "M2": { x: 90, y: 49, w: 13, h: 15, angle: 13, grade: "S", label: "M2", order: 80 },

        "STANDING C": { x: 50, y: 48, w: 45, h: 16, angle: 0, grade: "STANDING", label: "STANDING C", order: 1, fontSize: 21 },
        "VIP STANDING A": { x: 35, y: 31, w: 18, h: 9, angle: 0, grade: "VIP", label: "VIP STANDING", order: 2, fontSize: 11 },
        "VIP STANDING B": { x: 65, y: 31, w: 18, h: 9, angle: 0, grade: "VIP", label: "VIP STANDING", order: 3, fontSize: 11 }
    };

    function normalizeSeat(seat) {
        const sectionName = normalizeSection(
            seat.sectionName ??
            seat.section ??
            seat.zoneName ??
            seat.zone ??
            "A"
        );

        const grade = normalizeGrade(
            seat.grade ??
            seat.gradeCode ??
            seat.seatGrade ??
            zoneLayouts[sectionName]?.grade ??
            "A"
        );

        const rowName =
            seat.rowName ??
            seat.row ??
            seat.seatRow ??
            "1";

        const seatNo =
            seat.seatNo ??
            seat.seatNumberOnly ??
            seat.number ??
            seat.no ??
            seat.seatCol ??
            seat.col ??
            "";

        const id =
            seat.id ??
            seat.seatId ??
            `${seat.floor ?? 1}-${sectionName}-${rowName}-${seatNo}`;

        const price = Number(seat.price ?? seat.seatPrice ?? 0);
        const status = String(seat.status ?? seat.seatStatus ?? "AVAILABLE").toUpperCase();
        const bookingStatus = String(seat.bookingStatus ?? seat.booking_status ?? "").toUpperCase();

        return {
            raw: seat,
            id: String(id),
            floor: seat.floor ?? 1,
            sectionName,
            grade,
            gradeName: seat.gradeName ?? getGradeName(grade),
            rowName,
            seatNo,
            seatNumber: seat.seatNumber ?? seat.name ?? `${seat.floor ?? 1}층 ${sectionName}구역 ${rowName}열 ${seatNo}번`,
            price,
            status,
            bookingStatus,
            available: isAvailable(status, bookingStatus, seat),
            x: toNumber(seat.x ?? seat.xLabel, null),
            y: toNumber(seat.y ?? seat.yLabel, null),
            size: toNumber(seat.size, 14),
            angle: toNumber(seat.angle, 0)
        };
    }

    function normalizeSection(value) {
        return String(value || "A")
            .trim()
            .toUpperCase()
            .replaceAll("구역", "")
            .replace(/\s+/g, " ");
    }

    function normalizeGrade(value) {
        const raw = String(value || "A").trim().toUpperCase();

        if (raw === "VIP") return "VIP";
        if (raw.includes("STANDING")) return "STANDING";
        if (raw === "R" || raw === "R석") return "R";
        if (raw === "S" || raw === "S석") return "S";
        if (raw === "A" || raw === "A석") return "A";
        if (raw === "B" || raw === "B석") return "B";

        return raw || "A";
    }

    function isAvailable(status, bookingStatus, seat) {
        if (seat.available === false) return false;
        if (seat.isAvailable === false) return false;
        if (seat.sold === true) return false;
        if (seat.reserved === true) return false;
        if (seat.booked === true) return false;
        if (seat.disabled === true) return false;

        const blocked = ["CONFIRMED", "PENDING", "SOLD", "RESERVED", "UNAVAILABLE", "BOOKED", "OBSTRUCTED", "REMOVED"];

        if (blocked.includes(status)) return false;
        if (blocked.includes(bookingStatus)) return false;

        return true;
    }

    function toNumber(value, fallback) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function formatPrice(price) {
        return Number(price || 0).toLocaleString("ko-KR") + "원";
    }

    function getGradeName(grade) {
        if (grade === "VIP") return "VIP";
        if (grade === "STANDING") return "STANDING석";
        return `${grade}석`;
    }

    function getGradeClass(grade) {
        return String(grade || "A").toLowerCase().replace(/[^a-z0-9]/g, "");
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function makeSectionMap() {
        const map = new Map();

        dbSeats.forEach((seat) => {
            if (!map.has(seat.sectionName)) {
                map.set(seat.sectionName, []);
            }

            map.get(seat.sectionName).push(seat);
        });

        return map;
    }

    const sectionMap = makeSectionMap();

    function getAutoLayout(sectionName, index) {
        return {
            x: 18 + (index % 5) * 16,
            y: 48 + Math.floor(index / 5) * 14,
            w: 13,
            h: 10,
            angle: 0,
            grade: sectionMap.get(sectionName)?.[0]?.grade || "A",
            label: sectionName,
            order: 999 + index
        };
    }

    function getSections() {
        const names = Array.from(sectionMap.keys());

        return names.map((name, index) => {
            const seats = sectionMap.get(name) || [];
            const layout = zoneLayouts[name] || getAutoLayout(name, index);
            const grade = layout.grade || seats[0]?.grade || "A";

            return {
                name,
                label: layout.label || name,
                seats,
                layout,
                grade,
                totalCount: seats.length,
                availableCount: seats.filter((seat) => seat.available).length
            };
        }).sort((a, b) => {
            const ao = a.layout.order ?? 999;
            const bo = b.layout.order ?? 999;

            if (ao !== bo) return ao - bo;

            return a.name.localeCompare(b.name, "ko-KR", { numeric: true });
        });
    }

    function getGrades() {
        const map = new Map();

        dbSeats.forEach((seat) => {
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

        const order = ["VIP", "STANDING", "R", "S", "A", "B"];

        return Array.from(map.values()).sort((a, b) => {
            const ai = order.indexOf(a.grade);
            const bi = order.indexOf(b.grade);
            const ao = ai === -1 ? 999 : ai;
            const bo = bi === -1 ? 999 : bi;

            if (ao !== bo) return ao - bo;

            return a.grade.localeCompare(b.grade, "ko-KR");
        });
    }

    function setZoneButtonStyle(button, layout) {
        button.style.setProperty("--x", `${layout.x}%`);
        button.style.setProperty("--y", `${layout.y}%`);
        button.style.setProperty("--w", `${layout.w}%`);
        button.style.setProperty("--h", `${layout.h}%`);
        button.style.setProperty("--angle", `${layout.angle || 0}deg`);
        button.style.setProperty("--font-size", `${layout.fontSize || 24}px`);
    }

    function createZoneButton(section, mini) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `cc-zone-area-btn cc-zone-area-btn--${getGradeClass(section.grade)}`;
        button.dataset.section = section.name;
        button.textContent = section.label;
        button.title = `${section.label} / 잔여 ${section.availableCount}석`;

        if (currentSection === section.name) {
            button.classList.add("is-active");
        }

        if (currentGrade && currentGrade !== section.grade) {
            button.classList.add("is-dimmed");
        }

        setZoneButtonStyle(button, section.layout);

        if (mini) {
            button.style.setProperty("--font-size", `${Math.max(8, (section.layout.fontSize || 18) * 0.45)}px`);
        }

        button.addEventListener("click", () => {
            openSection(section.name);
        });

        return button;
    }

    function renderMainZoneMap() {
        if (!zoneLayer || !imageBox) return;

        zoneLayer.innerHTML = "";

        const guide = document.createElement("div");
        guide.className = "cc-catch-map-guide";
        guide.textContent = "무대 및 스탠딩 석은 입장 번호 순 예매의 편의를 위해 표기된 것으로 실제 무대와 다를 수 있습니다.";
        zoneLayer.appendChild(guide);

        getSections().forEach((section) => {
            zoneLayer.appendChild(createZoneButton(section, false));
        });

        const bottom = document.createElement("div");
        bottom.className = "cc-catch-bottom-bar";
        bottom.textContent = currentGrade
            ? `${getGradeName(currentGrade)} 등급 구역을 선택해주세요.`
            : "구역을 먼저 선택해주세요. 우측 좌석등급을 선택해도 됩니다.";
        zoneLayer.appendChild(bottom);
    }

    function ensureSideExtraCards() {
        if (!side) return;

        if (!document.querySelector("#miniZoneMap")) {
            const miniCard = document.createElement("div");
            miniCard.className = "cc-card cc-mini-map-card";
            miniCard.innerHTML = `
                <div class="cc-mini-brand">
                    <b>CatchCatch</b><span>티켓</span>
                </div>
                <div id="miniZoneMap" class="cc-mini-zone-map"></div>
                <button type="button" class="cc-mini-map-link">좌석도 전체보기</button>
            `;
            side.prepend(miniCard);
        }

        if (!document.querySelector("#gradeList")) {
            const gradeCard = document.createElement("div");
            gradeCard.className = "cc-card cc-grade-card";
            gradeCard.innerHTML = `
                <div class="cc-grade-head">
                    <h3>좌석등급/잔여석</h3>
                    <button type="button" id="refreshSeatBtn">새로고침</button>
                </div>
                <div id="gradeList" class="cc-grade-list"></div>
            `;

            const selectedCard = side.querySelector(".cc-selected-card");
            if (selectedCard) {
                side.insertBefore(gradeCard, selectedCard);
            } else {
                side.appendChild(gradeCard);
            }
        }
    }

    function renderMiniZoneMap() {
        const miniZoneMap = document.querySelector("#miniZoneMap");

        if (!miniZoneMap) return;

        miniZoneMap.innerHTML = "";

        getSections().forEach((section) => {
            miniZoneMap.appendChild(createZoneButton(section, true));
        });
    }

    function renderGradeList() {
        const gradeList = document.querySelector("#gradeList");

        if (!gradeList) return;

        gradeList.innerHTML = "";

        getGrades().forEach((item) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "cc-grade-row";
            button.dataset.grade = item.grade;

            if (currentGrade === item.grade) {
                button.classList.add("is-active");
            }

            button.innerHTML = `
                <i class="cc-grade-color cc-zone-area-btn--${getGradeClass(item.grade)}"></i>
                <span class="cc-grade-name">
                    <b>${escapeHtml(getGradeName(item.grade))}</b>
                    <span>잔여 ${item.available.toLocaleString("ko-KR")}석 / 총 ${item.total.toLocaleString("ko-KR")}석</span>
                </span>
                <span class="cc-grade-price">${formatPrice(item.price)}</span>
            `;

            button.addEventListener("click", () => {
                currentGrade = currentGrade === item.grade ? "" : item.grade;
                currentSection = "";
                showZoneView();
                render();
            });

            gradeList.appendChild(button);
        });
    }

    function openSection(sectionName) {
        currentSection = sectionName;
        currentGrade = "";

        if (overview) {
            overview.style.display = "none";
        }

        if (zoneDetail) {
            zoneDetail.classList.add("is-open");
        }

        renderSectionSeats();
        renderMiniZoneMap();
        renderGradeList();
    }

    function showZoneView() {
        currentSection = "";

        if (overview) {
            overview.style.display = "";
        }

        if (zoneDetail) {
            zoneDetail.classList.remove("is-open");
        }

        renderMainZoneMap();
        renderMiniZoneMap();
        renderGradeList();
    }

    function compareSeat(a, b) {
        const rowCompare = String(a.rowName).localeCompare(String(b.rowName), "ko-KR", { numeric: true });

        if (rowCompare !== 0) return rowCompare;

        return Number(a.seatNo || 0) - Number(b.seatNo || 0);
    }

    function makeSeatPositions(seats) {
        const sorted = [...seats].sort(compareSeat);
        const hasPosition = sorted.some((seat) => seat.x !== null && seat.y !== null);

        if (!hasPosition) {
            const rows = new Map();

            sorted.forEach((seat) => {
                if (!rows.has(seat.rowName)) {
                    rows.set(seat.rowName, []);
                }

                rows.get(seat.rowName).push(seat);
            });

            const rowNames = Array.from(rows.keys()).sort((a, b) => {
                return String(a).localeCompare(String(b), "ko-KR", { numeric: true });
            });

            const result = [];

            rowNames.forEach((rowName, rowIndex) => {
                const rowSeats = rows.get(rowName).sort(compareSeat);

                rowSeats.forEach((seat, colIndex) => {
                    result.push({
                        seat,
                        x: 10 + colIndex * (80 / Math.max(rowSeats.length - 1, 1)),
                        y: 14 + rowIndex * (72 / Math.max(rowNames.length - 1, 1))
                    });
                });
            });

            return result;
        }

        const xs = sorted.map((seat) => Number(seat.x || 0));
        const ys = sorted.map((seat) => Number(seat.y || 0));
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const width = Math.max(maxX - minX, 1);
        const height = Math.max(maxY - minY, 1);

        return sorted.map((seat) => {
            return {
                seat,
                x: 8 + ((Number(seat.x || 0) - minX) / width) * 84,
                y: 12 + ((Number(seat.y || 0) - minY) / height) * 76
            };
        });
    }

    function renderSectionSeats() {
        if (!zoneSeatGrid) return;

        const section = getSections().find((item) => item.name === currentSection);

        zoneSeatGrid.innerHTML = "";

        if (!section) {
            return;
        }

        if (zoneTitle) {
            zoneTitle.textContent = `${section.label} 구역`;
        }

        if (zoneSubText) {
            zoneSubText.textContent = `현재 보고 계신 구역은 ${section.label} 구역입니다. 잔여 ${section.availableCount}석 / 총 ${section.totalCount}석`;
        }

        ensureBackButton();

        const positions = makeSeatPositions(section.seats);

        positions.forEach((item) => {
            const seat = item.seat;
            const button = document.createElement("button");

            button.type = "button";
            button.className = "cc-seat-dot";
            button.dataset.seatId = seat.id;
            button.title = `${seat.seatNumber} / ${seat.gradeName} / ${formatPrice(seat.price)}`;

            button.style.setProperty("--x", `${item.x}%`);
            button.style.setProperty("--y", `${item.y}%`);
            button.style.setProperty("--size", `${Math.max(10, Math.min(seat.size || 14, 24))}px`);
            button.style.setProperty("--angle", `${seat.angle || 0}deg`);

            if (!seat.available) {
                button.classList.add("is-sold");
                button.disabled = true;
                button.title = `${seat.seatNumber} / 예매 불가`;
            } else if (selectedSeats.has(seat.id)) {
                button.classList.add("is-selected");
            } else {
                button.classList.add("is-available");
            }

            button.addEventListener("click", () => {
                toggleSeat(seat);
            });

            button.addEventListener("mouseenter", () => {
                if (!hoverInfo) return;

                if (!seat.available) {
                    hoverInfo.textContent = `${seat.seatNumber} / 예매 불가`;
                    return;
                }

                hoverInfo.textContent = `${seat.seatNumber} / ${seat.gradeName} / ${formatPrice(seat.price)}`;
            });

            zoneSeatGrid.appendChild(button);
        });

        if (hoverInfo) {
            hoverInfo.textContent = "좌석을 선택해주세요.";
        }
    }

    function ensureBackButton() {
        const top = document.querySelector(".cc-zone-detail__top");

        if (!top) return;
        if (top.querySelector(".cc-zone-back-btn")) return;

        const button = document.createElement("button");
        button.type = "button";
        button.className = "cc-zone-back-btn";
        button.textContent = "전체 구역 보기";
        button.addEventListener("click", showZoneView);

        top.prepend(button);
    }

    function toggleSeat(seat) {
        if (!seat.available) return;

        if (selectedSeats.has(seat.id)) {
            selectedSeats.delete(seat.id);
            renderSectionSeats();
            renderSelectedPanel();
            return;
        }

        if (selectedSeats.size >= MAX_SELECT_COUNT) {
            alert(`좌석은 최대 ${MAX_SELECT_COUNT}석까지 선택할 수 있습니다.`);
            return;
        }

        selectedSeats.set(seat.id, seat);
        renderSectionSeats();
        renderSelectedPanel();
    }

    function renderSelectedPanel() {
        if (!selectedList || !totalBox || !totalPriceEl) return;

        selectedList.innerHTML = "";

        const seats = Array.from(selectedSeats.values());

        if (seats.length === 0) {
            selectedList.innerHTML = `
                <div class="cc-selected-seat">
                    <div>
                        <div class="cc-selected-seat__name">선택된 좌석이 없습니다.</div>
                        <div class="cc-selected-seat__price">좌석을 선택하면 여기에 표시됩니다.</div>
                    </div>
                </div>
            `;
        } else {
            seats.forEach((seat) => {
                const item = document.createElement("div");
                item.className = "cc-selected-seat";
                item.innerHTML = `
                    <div>
                        <div class="cc-selected-seat__name">
                            <i class="cc-dot cc-dot--${getGradeClass(seat.grade)}"></i>
                            ${escapeHtml(seat.seatNumber)}
                        </div>
                        <div class="cc-selected-seat__price">
                            ${escapeHtml(seat.gradeName)} ${formatPrice(seat.price)}
                        </div>
                    </div>
                    <button type="button"
                            class="cc-selected-seat__remove"
                            data-remove-seat="${escapeHtml(seat.id)}">
                        삭제
                    </button>
                `;
                selectedList.appendChild(item);
            });
        }

        const totalPrice = seats.reduce((sum, seat) => sum + Number(seat.price || 0), 0);
        const totalCountEl = totalBox.querySelector("span");

        if (totalCountEl) {
            totalCountEl.textContent = `총 ${seats.length}석`;
        }

        totalPriceEl.textContent = formatPrice(totalPrice);

        renderHiddenInputs();
        updateSubmitButton();
    }

    function renderHiddenInputs() {
        const ids = Array.from(selectedSeats.keys());

        if (selectedSeatIdsInput) {
            selectedSeatIdsInput.value = ids.join(",");
        }

        if (!selectedSeatInputs) return;

        selectedSeatInputs.innerHTML = "";

        ids.forEach((seatId) => {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = "seatIds";
            input.value = seatId;
            selectedSeatInputs.appendChild(input);
        });

        console.log("선택 좌석 seatIds =", ids);
    }

    function updateSubmitButton() {
        const button = document.querySelector(".cc-seat-complete-btn");

        if (button) {
            button.disabled = selectedSeats.size === 0;
        }
    }

    function bindCommonEvents() {
        document.addEventListener("click", (event) => {
            const removeButton = event.target.closest("[data-remove-seat]");

            if (!removeButton) return;

            selectedSeats.delete(removeButton.dataset.removeSeat);
            renderSectionSeats();
            renderSelectedPanel();
        });

        if (resetZoneBtn) {
            resetZoneBtn.addEventListener("click", () => {
                selectedSeats.clear();
                renderSectionSeats();
                renderSelectedPanel();
            });
        }

        if (paymentForm) {
            paymentForm.addEventListener("submit", (event) => {
                renderHiddenInputs();

                if (selectedSeats.size === 0) {
                    event.preventDefault();
                    alert("좌석을 먼저 선택해주세요.");
                    return;
                }

                if (!selectedSeatIdsInput || selectedSeatIdsInput.value.trim() === "") {
                    event.preventDefault();
                    alert("좌석 정보가 정상적으로 입력되지 않았습니다.");
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
                selectedSeats.clear();
                renderSelectedPanel();
                renderSectionSeats();
                return;
            }

            remainSeconds -= 1;
            window.setTimeout(tick, 1000);
        }

        tick();
    }

    function render() {
        ensureSideExtraCards();
        renderMainZoneMap();
        renderMiniZoneMap();
        renderGradeList();
        renderSelectedPanel();
    }

    bindCommonEvents();
    render();
    showZoneView();
    initCountdown();

    console.log("CatchCatch seats =", dbSeats);
});