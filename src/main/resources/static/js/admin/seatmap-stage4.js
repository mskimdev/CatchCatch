(() => {
    "use strict";

    const SAVE_URL = "/admin/seatmap/temp-save";
    const STATUS_AVAILABLE = "AVAILABLE";

    const STORAGE = {
        projectId: "seatmap_current_project_id",
        folderName: "seatmap_current_folder_name",
        sections: "seatmap_stage3_sections",
        sectionsCompat: "concert_sections",
        sectionsHeader: "concert_stage1_sections",
        seats: "seatmap_stage4_seats",
        seatsUrl: "seatmap_stage4_seat_json_url",
        layouts: "seatmap_stage4_layouts",
        finalSeats: "concert_final_seats",
        bookingSeats: "concert_booking_seats",
        seatsBySectionCompat: "concert_stage3_seats",
        layoutsCompat: "concert_stage3_layouts"
    };

    const COLORS = {
        sectionStroke: "#7c3aed",
        sectionFill: "rgba(124, 58, 237, 0.12)",
        sectionIdleStroke: "rgba(15, 23, 42, 0.45)",
        seat: "#a3e635",
        seatStroke: "#ffffff",
        seatSelected: "#2563eb",
        seatHover: "#f97316",
        label: "#111827"
    };

    const state = {
        projectId: "seat",
        stage3Url: "/admin/seatmap/stage/3",
        stage5Url: "/admin/seatmap/stage/5",
        seatmapImageUrl: "",
        sectionsUrl: "",
        seatsUrl: "",
        width: 0,
        height: 0,
        sections: [],
        seats: [],
        layouts: {},
        selectedSectionId: "",
        selectedSeatIds: new Set(),
        activePart: 1,
        tool: "select",
        hoverSeatId: "",
        zoom: 1,
        baseImageLoaded: false,
        baseImageUrl: ""
    };

    const dom = {};
    let canvas;
    let overlay;
    let ctx;
    let overlayCtx;

    document.addEventListener("DOMContentLoaded", init);

    async function init() {
        cacheDom();
        if (!canvas || !overlay) {
            console.error("[SeatTrace Stage4] canvas 연결 실패");
            return;
        }

        readRouteState();
        bindEvents();
        await loadBaseImage();
        await loadSections();
        await loadExistingSeats();

        if (!state.selectedSectionId && state.sections[0]) {
            state.selectedSectionId = state.sections[0].sectionId;
        }

        restoreLayoutToInputs(getSelectedSection());
        setPart(1);
        fitZoom();
        syncAll();
        toast("Stage 4 좌석 배치 준비 완료");

        window.SeatMapStage4 = {
            save: saveSeatsToServer,
            getSeats: createFinalSeatJson,
            getSections: () => state.sections.map(sectionForSave),
            exportDebugImage: exportDebugImageDataUrl
        };
    }

    function cacheDom() {
        canvas = document.getElementById("canvas");
        overlay = document.getElementById("overlay");
        if (canvas) ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (overlay) overlayCtx = overlay.getContext("2d", { willReadFrequently: true });

        [
            "stage4App", "toast", "canvasBox", "canvasScroll", "canvasSize",
            "part1Panel", "part2Panel", "part3Panel", "partBtn1", "partBtn2", "partBtn3",
            "part1Status", "part2Status", "part3Status", "goPart2Btn",
            "groupFilter", "sectionSelect", "sectionSearch", "sectionList",
            "selectedSectionName", "rowsInput", "colsInput", "angleInput", "seatSizeInput", "gapXInput", "gapYInput",
            "rowStartInput", "colStartInput", "generateSectionBtn", "inferAllBtn", "clearSectionBtn",
            "manualRowInput", "manualColInput", "manualAddBtn", "deleteSeatBtn", "clearSelectionBtn",
            "saveSummary", "saveSeatsBtn", "toStage5Btn", "miniImg",
            "infoSection", "infoSectionId", "infoFloorGrade", "infoPrice", "infoSectionSeats", "infoSelectedSeats",
            "totalSections", "totalSeats", "jsonPreview",
            "zoomIn", "zoomOut", "zoomReset", "zoomFit", "resetView", "zoomValue", "zoomTool"
        ].forEach((id) => {
            dom[id] = document.getElementById(id);
        });
    }

    function readRouteState() {
        const root = dom.stage4App;
        const params = new URLSearchParams(location.search);
        state.projectId = sanitizeProjectId(
            params.get("projectId")
            || root?.dataset.projectId
            || localStorage.getItem(STORAGE.folderName)
            || localStorage.getItem(STORAGE.projectId)
            || "seat"
        );
        state.stage3Url = root?.dataset.stage3Url || `/admin/seatmap/stage/3?projectId=${encodeURIComponent(state.projectId)}`;
        state.stage5Url = root?.dataset.stage5Url || `/admin/seatmap/stage/5?projectId=${encodeURIComponent(state.projectId)}`;
        state.seatmapImageUrl = root?.dataset.seatmapImageUrl || projectFileUrl("seatmap-image.png");
        state.sectionsUrl = root?.dataset.sectionsUrl || projectFileUrl("seatmap-sections.json");
        state.seatsUrl = root?.dataset.seatsUrl || `/temp/seatmap/seats/${encodeURIComponent(state.projectId)}-seatmap-seats.json`;

        localStorage.setItem(STORAGE.projectId, state.projectId);
        localStorage.setItem(STORAGE.folderName, state.projectId);
    }

    function bindEvents() {
        bind(dom.partBtn1, "click", () => setPart(1));
        bind(dom.partBtn2, "click", () => setPart(2));
        bind(dom.partBtn3, "click", () => setPart(3));
        bind(dom.goPart2Btn, "click", () => setPart(2));

        bind(dom.groupFilter, "change", () => {
            syncSectionList();
        });
        bind(dom.sectionSelect, "change", () => selectSection(dom.sectionSelect.value));
        bind(dom.sectionSearch, "input", () => syncSectionList());

        bind(dom.generateSectionBtn, "click", generateSelectedSectionSeats);
        bind(dom.inferAllBtn, "click", inferAllSections);
        bind(dom.clearSectionBtn, "click", clearSelectedSectionSeats);
        bind(dom.manualAddBtn, "click", toggleManualAddMode);
        bind(dom.deleteSeatBtn, "click", deleteSelectedSeats);
        bind(dom.clearSelectionBtn, "click", () => {
            state.selectedSeatIds.clear();
            syncAll();
        });
        bind(dom.saveSeatsBtn, "click", () => saveSeatsToServer());
        bind(dom.toStage5Btn, "click", goStage5);

        [dom.rowsInput, dom.colsInput, dom.angleInput, dom.seatSizeInput, dom.gapXInput, dom.gapYInput, dom.rowStartInput, dom.colStartInput].forEach((input) => {
            bind(input, "change", () => rememberCurrentLayoutFromInputs());
            bind(input, "input", () => rememberCurrentLayoutFromInputs(false));
        });

        bind(overlay, "pointerdown", handlePointerDown);
        bind(overlay, "pointermove", handlePointerMove);
        bind(overlay, "pointerleave", () => {
            state.hoverSeatId = "";
            drawOverlay();
        });

        bind(dom.zoomIn, "click", () => setZoom(state.zoom + 0.1));
        bind(dom.zoomOut, "click", () => setZoom(state.zoom - 0.1));
        bind(dom.zoomReset, "click", () => setZoom(1));
        bind(dom.zoomFit, "click", fitZoom);
        bind(dom.resetView, "click", () => {
            setZoom(1);
            if (dom.canvasScroll) {
                dom.canvasScroll.scrollLeft = 0;
                dom.canvasScroll.scrollTop = 0;
            }
        });
        bind(dom.zoomTool, "click", () => toast("Stage 4는 도면 스크롤과 확대/축소로 위치를 조정합니다."));
    }

    function bind(element, eventName, handler) {
        if (element) element.addEventListener(eventName, handler);
    }

    async function loadBaseImage() {
        const candidates = unique([
            state.seatmapImageUrl,
            projectFileUrl("seatmap-image.png"),
            projectFileUrl("cropped-image.png"),
            projectFileUrl("button-image.png")
        ]).filter(Boolean);

        for (const url of candidates) {
            try {
                const image = await loadImage(noCache(url));
                setupCanvas(image.naturalWidth, image.naturalHeight);
                ctx.clearRect(0, 0, state.width, state.height);
                ctx.drawImage(image, 0, 0, state.width, state.height);
                state.baseImageLoaded = true;
                state.baseImageUrl = url;
                if (dom.miniImg) dom.miniImg.src = noCache(url);
                return;
            } catch (error) {
                console.warn("[SeatTrace Stage4] 기준 도면 로드 실패", url, error);
            }
        }

        setupCanvas(980, 660);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, state.width, state.height);
        toast("seatmap-image.png 또는 cropped-image.png를 읽지 못했습니다.");
    }

    async function loadSections() {
        const local = readJson(STORAGE.sections, null)
            || readJson(STORAGE.sectionsCompat, null)
            || readJson(STORAGE.sectionsHeader, null);

        if (Array.isArray(local) && local.length) {
            state.sections = local.map(normalizeSection).filter(hasUsablePolygon);
            return;
        }

        try {
            const response = await fetch(noCache(state.sectionsUrl), { credentials: "same-origin" });
            if (!response.ok) throw new Error(response.statusText || "sections not found");
            const data = await response.json();
            if (Array.isArray(data)) {
                state.sections = data.map(normalizeSection).filter(hasUsablePolygon);
            }
        } catch (error) {
            console.warn("[SeatTrace Stage4] seatmap-sections.json 로드 실패", error);
        }

        if (!state.sections.length) {
            toast("Stage 3 구역 JSON이 없습니다. seatmap-sections.json 저장을 먼저 확인하세요.");
        }
    }

    async function loadExistingSeats() {
        const local = readJson(STORAGE.seats, null)
            || readJson(STORAGE.finalSeats, null)
            || readJson(STORAGE.bookingSeats, null)
            || readJson(STORAGE.seatsBySectionCompat, null);

        const localSeats = normalizeSeatCollection(local);
        if (localSeats.length) {
            state.seats = localSeats.map(normalizeSeat).filter(hasSeatPoint);
        }

        const layouts = readJson(STORAGE.layouts, null) || readJson(STORAGE.layoutsCompat, null);
        if (layouts && typeof layouts === "object") {
            state.layouts = layouts;
        }

        if (state.seats.length) return;

        try {
            const response = await fetch(noCache(state.seatsUrl), { credentials: "same-origin" });
            if (!response.ok) return;
            const data = await response.json();
            state.seats = normalizeSeatCollection(data).map(normalizeSeat).filter(hasSeatPoint);
        } catch (error) {
            console.warn("[SeatTrace Stage4] 기존 좌석 JSON 없음", error);
        }
    }

    function setupCanvas(width, height) {
        state.width = Math.max(1, Math.round(width));
        state.height = Math.max(1, Math.round(height));
        canvas.width = overlay.width = state.width;
        canvas.height = overlay.height = state.height;

        if (dom.canvasBox) {
            dom.canvasBox.style.width = `${state.width}px`;
            dom.canvasBox.style.height = `${state.height}px`;
        }
        if (dom.canvasSize) dom.canvasSize.textContent = `${state.width} × ${state.height}`;
    }

    function setPart(nextPart) {
        state.activePart = nextPart;
        [1, 2, 3].forEach((part) => {
            const panel = dom[`part${part}Panel`];
            const button = dom[`partBtn${part}`];
            const status = dom[`part${part}Status`];
            if (!panel || !button) return;

            panel.classList.toggle("is-active", part === nextPart);
            panel.classList.toggle("is-done", isPartDone(part));
            button.classList.toggle("active", part === nextPart);
            if (status) status.textContent = part === nextPart ? "진행중" : (isPartDone(part) ? "완료" : "대기");
        });
    }

    function isPartDone(part) {
        if (part === 1) return state.sections.length > 0 && Boolean(getSelectedSection());
        if (part === 2) return countVisibleSeats() > 0;
        if (part === 3) return createFinalSeatJson().length > 0;
        return false;
    }

    function selectSection(sectionId) {
        if (!sectionId) return;
        state.selectedSectionId = sectionId;
        state.selectedSeatIds.clear();
        restoreLayoutToInputs(getSelectedSection());
        syncAll();
    }

    function getSelectedSection() {
        return state.sections.find((section) => section.sectionId === state.selectedSectionId) || null;
    }

    function getSectionSeats(section) {
        if (!section) return [];
        return state.seats.filter((seat) => seat.sectionId === section.sectionId && seat.status !== "REMOVED");
    }

    function generateSelectedSectionSeats() {
        const section = getSelectedSection();
        if (!section) {
            toast("좌석을 생성할 구역을 선택하세요.");
            return;
        }
        if (!section.sectionName) {
            toast("sectionName이 없는 구역은 좌석을 만들 수 없습니다. Stage 3에서 구역명을 확정하세요.");
            return;
        }

        const layout = readLayoutFromInputs(section);
        const generated = buildSeatsForSection(section, layout);
        state.layouts[section.sectionId] = layout;
        state.seats = state.seats.filter((seat) => seat.sectionId !== section.sectionId).concat(generated);
        state.selectedSeatIds.clear();
        persistLocalWork();
        syncAll();
        toast(`${section.sectionName} 좌석 ${generated.length}개를 생성했습니다.`);
        setPart(3);
    }

    function inferAllSections() {
        if (!state.sections.length) {
            toast("구역 JSON이 없습니다.");
            return;
        }

        const base = readLayoutFromInputs(getSelectedSection() || state.sections[0]);
        const allSeats = [];
        const layouts = {};
        const skipped = [];

        state.sections.forEach((section) => {
            if (!section.sectionName) {
                skipped.push(section.sectionId || "이름 없음");
                return;
            }

            const box = getSectionBbox(section);
            const size = Math.max(2, Number(base.seatSize) || 10);
            const gapX = Math.max(0, Number(base.gapX) || 0);
            const gapY = Math.max(0, Number(base.gapY) || 0);
            const rows = Math.max(1, Math.floor((box.h + gapY) / (size + gapY)));
            const cols = Math.max(1, Math.floor((box.w + gapX) / (size + gapX)));
            const layout = {
                ...base,
                rows,
                cols,
                rowStart: base.rowStart || "A",
                colStart: base.colStart || 1,
                angle: Number(state.layouts[section.sectionId]?.angle ?? base.angle ?? 0)
            };

            layouts[section.sectionId] = layout;
            allSeats.push(...buildSeatsForSection(section, layout));
        });

        state.layouts = { ...state.layouts, ...layouts };
        state.seats = state.seats.filter((seat) => !state.sections.some((section) => section.sectionId === seat.sectionId)).concat(allSeats);
        state.selectedSeatIds.clear();
        persistLocalWork();
        syncAll();
        toast(`전체 구역 좌석 ${allSeats.length}개를 추정했습니다.${skipped.length ? " / 이름 없는 구역 제외" : ""}`);
        setPart(3);
    }

    function buildSeatsForSection(section, layout) {
        const polygon = section.polygon;
        const box = getSectionBbox(section);
        const rows = Math.max(1, positiveInt(layout.rows, 1));
        const cols = Math.max(1, positiveInt(layout.cols, 1));
        const seatSize = Math.max(2, Number(layout.seatSize) || 10);
        const gapX = Math.max(0, Number(layout.gapX) || 0);
        const gapY = Math.max(0, Number(layout.gapY) || 0);
        const angle = normalizeAngle(Number(layout.angle) || 0);
        const rowOffset = rowNameToIndex(layout.rowStart || "A");
        const colStart = Math.max(1, positiveInt(layout.colStart, 1));

        const gridW = cols * seatSize + Math.max(0, cols - 1) * gapX;
        const gridH = rows * seatSize + Math.max(0, rows - 1) * gapY;
        const startX = box.x + (box.w - gridW) / 2;
        const startY = box.y + (box.h - gridH) / 2;
        const pivot = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
        const seats = [];

        for (let r = 0; r < rows; r += 1) {
            for (let c = 0; c < cols; c += 1) {
                const baseCenter = {
                    x: startX + c * (seatSize + gapX) + seatSize / 2,
                    y: startY + r * (seatSize + gapY) + seatSize / 2
                };
                const center = rotatePoint(baseCenter, pivot, angle);

                if (!seatInsidePolygon(center, seatSize, angle, polygon)) {
                    continue;
                }

                const row = indexToRowName(rowOffset + r);
                const col = colStart + c;
                seats.push(makeSeat(section, row, col, center, seatSize, angle));
            }
        }

        return seats;
    }

    function makeSeat(section, row, col, center, size, angle) {
        const floor = cleanSeatPart(section.floor || "1");
        const sectionName = cleanSeatPart(section.sectionName || section.name || section.section || "");
        const grade = cleanSeatPart(section.grade || "일반석");
        const status = STATUS_AVAILABLE;
        const id = [floor, sectionName, cleanSeatPart(row), cleanSeatPart(col), grade, status].join("-");

        return {
            id,
            sectionId: section.sectionId,
            sectionName: section.sectionName,
            section: section.sectionName,
            groupKey: section.groupKey || "",
            groupIndex: section.groupIndex ?? null,
            floor: section.floor || "1",
            grade: section.grade || "일반석",
            price: Number(section.price) || 0,
            row: String(row),
            col: Number(col),
            status,
            x: round(center.x),
            y: round(center.y),
            size: round(size),
            angle: round(normalizeAngle(angle))
        };
    }

    function clearSelectedSectionSeats() {
        const section = getSelectedSection();
        if (!section) {
            toast("구역을 선택하세요.");
            return;
        }
        state.seats = state.seats.filter((seat) => seat.sectionId !== section.sectionId);
        state.selectedSeatIds.clear();
        persistLocalWork();
        syncAll();
        toast(`${section.sectionName} 좌석을 비웠습니다.`);
    }

    function toggleManualAddMode() {
        state.tool = state.tool === "add-seat" ? "select" : "add-seat";
        syncToolState();
        toast(state.tool === "add-seat" ? "수동 추가 모드: polygon 내부를 클릭하세요." : "선택 모드로 전환했습니다.");
    }

    function addManualSeat(point) {
        const section = getSelectedSection();
        if (!section) {
            toast("먼저 구역을 선택하세요.");
            return;
        }
        if (!isInsideOrEdge(point, section.polygon)) {
            toast("선택 구역 polygon 안쪽에만 좌석을 추가할 수 있습니다.");
            return;
        }

        const size = Math.max(2, Number(dom.seatSizeInput?.value) || 10);
        const angle = normalizeAngle(Number(dom.angleInput?.value) || 0);
        const row = cleanText(dom.manualRowInput?.value, "A").toUpperCase();
        let col = Math.max(1, positiveInt(dom.manualColInput?.value, nextColumnFor(section, row)));
        let seat = makeSeat(section, row, col, point, size, angle);
        const ids = new Set(state.seats.map((item) => item.id));
        while (ids.has(seat.id)) {
            col += 1;
            seat = makeSeat(section, row, col, point, size, angle);
        }

        state.seats.push(seat);
        state.selectedSeatIds.clear();
        state.selectedSeatIds.add(seat.id);
        if (dom.manualColInput) dom.manualColInput.value = String(col + 1);
        persistLocalWork();
        syncAll();
    }

    function deleteSelectedSeats() {
        if (!state.selectedSeatIds.size) {
            toast("삭제할 좌석을 선택하세요.");
            return;
        }
        const before = state.seats.length;
        state.seats = state.seats.filter((seat) => !state.selectedSeatIds.has(seat.id));
        const removed = before - state.seats.length;
        state.selectedSeatIds.clear();
        persistLocalWork();
        syncAll();
        toast(`좌석 ${removed}개를 삭제했습니다.`);
    }

    function handlePointerDown(event) {
        const point = canvasPoint(event);
        if (!point) return;

        if (state.tool === "add-seat") {
            addManualSeat(point);
            return;
        }

        const hitSeat = findSeatAt(point);
        if (hitSeat) {
            if (!event.shiftKey) state.selectedSeatIds.clear();
            if (state.selectedSeatIds.has(hitSeat.id)) state.selectedSeatIds.delete(hitSeat.id);
            else state.selectedSeatIds.add(hitSeat.id);
            syncAll();
            return;
        }

        const hitSection = findSectionAt(point);
        if (hitSection) {
            selectSection(hitSection.sectionId);
        } else if (!event.shiftKey) {
            state.selectedSeatIds.clear();
            syncAll();
        }
    }

    function handlePointerMove(event) {
        const point = canvasPoint(event);
        if (!point) return;
        const hit = findSeatAt(point);
        const nextHover = hit?.id || "";
        if (nextHover !== state.hoverSeatId) {
            state.hoverSeatId = nextHover;
            drawOverlay();
        }
    }

    function findSeatAt(point) {
        for (let i = state.seats.length - 1; i >= 0; i -= 1) {
            const seat = state.seats[i];
            if (seat.status === "REMOVED") continue;
            if (pointInRotatedRect(point, seat.x, seat.y, seat.size || 10, seat.size || 10, seat.angle || 0)) {
                return seat;
            }
        }
        return null;
    }

    function findSectionAt(point) {
        for (let i = state.sections.length - 1; i >= 0; i -= 1) {
            const section = state.sections[i];
            if (isInsideOrEdge(point, section.polygon)) return section;
        }
        return null;
    }

    function rememberCurrentLayoutFromInputs(save = true) {
        const section = getSelectedSection();
        if (!section) return;
        state.layouts[section.sectionId] = readLayoutFromInputs(section);
        if (save) persistLocalWork();
    }

    function readLayoutFromInputs(section) {
        const current = state.layouts[section?.sectionId || ""] || {};
        return {
            rows: positiveInt(dom.rowsInput?.value, current.rows || 8),
            cols: positiveInt(dom.colsInput?.value, current.cols || 12),
            seatSize: Math.max(2, Number(dom.seatSizeInput?.value || current.seatSize || 10)),
            gapX: Math.max(0, Number(dom.gapXInput?.value || current.gapX || 4)),
            gapY: Math.max(0, Number(dom.gapYInput?.value || current.gapY || 4)),
            angle: normalizeAngle(Number(dom.angleInput?.value || current.angle || 0)),
            rowStart: cleanText(dom.rowStartInput?.value, current.rowStart || "A").toUpperCase(),
            colStart: positiveInt(dom.colStartInput?.value, current.colStart || 1)
        };
    }

    function restoreLayoutToInputs(section) {
        if (!section) return;
        const box = getSectionBbox(section);
        const inferredSize = Math.max(4, Math.min(12, Math.floor(Math.min(box.w / 8, box.h / 5)) || 10));
        const layout = state.layouts[section.sectionId] || {
            rows: 8,
            cols: 12,
            seatSize: inferredSize,
            gapX: 4,
            gapY: 4,
            angle: 0,
            rowStart: "A",
            colStart: 1
        };

        setValue(dom.rowsInput, layout.rows);
        setValue(dom.colsInput, layout.cols);
        setValue(dom.seatSizeInput, layout.seatSize);
        setValue(dom.gapXInput, layout.gapX);
        setValue(dom.gapYInput, layout.gapY);
        setValue(dom.angleInput, layout.angle);
        setValue(dom.rowStartInput, layout.rowStart || "A");
        setValue(dom.colStartInput, layout.colStart || 1);
        setValue(dom.manualRowInput, layout.rowStart || "A");
        setValue(dom.manualColInput, nextColumnFor(section, layout.rowStart || "A"));
    }

    function setValue(element, value) {
        if (element) element.value = value;
    }

    function syncAll() {
        syncToolState();
        syncGroupFilter();
        syncSectionSelect();
        syncSectionList();
        syncInfo();
        syncJsonPreview();
        drawOverlay();
        setPart(state.activePart);
    }

    function syncToolState() {
        if (dom.manualAddBtn) {
            dom.manualAddBtn.classList.toggle("is-active", state.tool === "add-seat");
            dom.manualAddBtn.textContent = state.tool === "add-seat" ? "수동 추가 모드 종료" : "수동 좌석 추가 모드";
        }
        if (dom.canvasBox) dom.canvasBox.classList.toggle("is-add-mode", state.tool === "add-seat");
    }

    function syncGroupFilter() {
        if (!dom.groupFilter) return;
        const selected = dom.groupFilter.value || "__all";
        const groups = unique(state.sections.map((section) => section.groupKey || "미지정"));
        const options = [`<option value="__all">전체 그룹</option>`]
            .concat(groups.map((group) => `<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`));
        dom.groupFilter.innerHTML = options.join("");
        dom.groupFilter.value = groups.includes(selected) ? selected : "__all";
    }

    function syncSectionSelect() {
        if (!dom.sectionSelect) return;
        dom.sectionSelect.innerHTML = state.sections.map((section) => {
            const count = getSectionSeats(section).length;
            return `<option value="${escapeHtml(section.sectionId)}">${escapeHtml(section.sectionName || section.sectionId)} (${count})</option>`;
        }).join("");
        if (state.selectedSectionId) dom.sectionSelect.value = state.selectedSectionId;
    }

    function syncSectionList() {
        if (!dom.sectionList) return;
        const group = dom.groupFilter?.value || "__all";
        const keyword = (dom.sectionSearch?.value || "").trim().toLowerCase();
        const filtered = state.sections.filter((section) => {
            const groupOk = group === "__all" || (section.groupKey || "미지정") === group;
            const name = `${section.sectionName} ${section.sectionId} ${section.groupKey}`.toLowerCase();
            return groupOk && (!keyword || name.includes(keyword));
        });

        if (!filtered.length) {
            dom.sectionList.innerHTML = `<div class="help-text">표시할 구역이 없습니다.</div>`;
            return;
        }

        dom.sectionList.innerHTML = filtered.map((section) => {
            const active = section.sectionId === state.selectedSectionId ? " active" : "";
            const count = getSectionSeats(section).length;
            const color = section.renderColor || section.color || "#d9d9d9";
            return `
                <button type="button" class="section-item${active}" data-section-id="${escapeHtml(section.sectionId)}">
                    <i class="section-item__color" style="background:${escapeHtml(color)}"></i>
                    <span class="section-item__meta">
                        <strong>${escapeHtml(section.sectionName || "이름 없음")}</strong>
                        <span>${escapeHtml(section.sectionId)} · ${escapeHtml(section.floor || "1")}층 · ${escapeHtml(section.grade || "일반석")}</span>
                    </span>
                    <em class="section-item__count">${count}</em>
                </button>`;
        }).join("");

        dom.sectionList.querySelectorAll("[data-section-id]").forEach((button) => {
            button.addEventListener("click", () => selectSection(button.dataset.sectionId));
        });
    }

    function syncInfo() {
        const section = getSelectedSection();
        const sectionSeats = getSectionSeats(section);
        const finalSeats = createFinalSeatJson();

        if (dom.selectedSectionName) {
            dom.selectedSectionName.textContent = section
                ? `${section.sectionName || "이름 없음"} / ${section.floor || "1"}층 / ${section.grade || "일반석"}`
                : "구역을 선택하세요.";
        }
        setText(dom.infoSection, section?.sectionName || "-");
        setText(dom.infoSectionId, section?.sectionId || "-");
        setText(dom.infoFloorGrade, section ? `${section.floor || "1"}층 / ${section.grade || "일반석"}` : "-");
        setText(dom.infoPrice, section ? formatPrice(section.price) : "-");
        setText(dom.infoSectionSeats, String(sectionSeats.length));
        setText(dom.infoSelectedSeats, String(state.selectedSeatIds.size));
        setText(dom.totalSections, String(state.sections.length));
        setText(dom.totalSeats, String(finalSeats.length));
        setText(dom.saveSummary, `저장할 좌석 ${finalSeats.length}개 · 선택 구역 ${sectionSeats.length}개`);
    }

    function syncJsonPreview() {
        if (!dom.jsonPreview) return;
        const finalSeats = createFinalSeatJson();
        dom.jsonPreview.textContent = JSON.stringify(finalSeats.slice(0, 8), null, 2) + (finalSeats.length > 8 ? "\n..." : "");
    }

    function setText(element, value) {
        if (element) element.textContent = value;
    }

    function drawOverlay(targetCtx = overlayCtx, options = {}) {
        if (!targetCtx || !state.width || !state.height) return;
        if (!options.noClear) {
            targetCtx.clearRect(0, 0, state.width, state.height);
        }

        state.sections.forEach((section) => drawSection(targetCtx, section, section.sectionId === state.selectedSectionId, options));
        state.seats.forEach((seat) => drawSeat(targetCtx, seat, options));
    }

    function drawSection(targetCtx, section, selected, options = {}) {
        const poly = section.polygon;
        if (!poly || poly.length < 3) return;

        targetCtx.save();
        targetCtx.beginPath();
        drawPolyPath(targetCtx, poly);
        targetCtx.closePath();
        targetCtx.fillStyle = selected ? COLORS.sectionFill : "rgba(15, 23, 42, 0.035)";
        targetCtx.fill();
        targetCtx.lineWidth = selected ? 2.5 : 1.2;
        targetCtx.setLineDash(selected ? [8, 4] : []);
        targetCtx.strokeStyle = selected ? COLORS.sectionStroke : (section.renderColor || section.color || COLORS.sectionIdleStroke);
        targetCtx.stroke();
        targetCtx.setLineDash([]);

        if (!options.skipLabels) {
            const center = polygonCenter(poly);
            targetCtx.font = selected ? "900 15px Pretendard, Arial" : "800 12px Pretendard, Arial";
            targetCtx.textAlign = "center";
            targetCtx.textBaseline = "middle";
            targetCtx.lineWidth = 4;
            targetCtx.strokeStyle = "rgba(255,255,255,0.86)";
            targetCtx.fillStyle = COLORS.label;
            const label = section.sectionName || section.sectionId;
            targetCtx.strokeText(label, center.x, center.y);
            targetCtx.fillText(label, center.x, center.y);
        }
        targetCtx.restore();
    }

    function drawSeat(targetCtx, seat, options = {}) {
        if (seat.status === "REMOVED") return;
        const selected = state.selectedSeatIds.has(seat.id);
        const hover = state.hoverSeatId === seat.id && !options.skipHover;
        const size = Number(seat.size) || 10;
        const angle = Number(seat.angle) || 0;

        targetCtx.save();
        targetCtx.translate(seat.x, seat.y);
        targetCtx.rotate(degToRad(angle));
        targetCtx.beginPath();
        targetCtx.rect(-size / 2, -size / 2, size, size);
        targetCtx.fillStyle = selected ? COLORS.seatSelected : (hover ? COLORS.seatHover : COLORS.seat);
        targetCtx.strokeStyle = COLORS.seatStroke;
        targetCtx.lineWidth = selected || hover ? 2 : 1;
        targetCtx.fill();
        targetCtx.stroke();
        targetCtx.restore();
    }

    function drawPolyPath(targetCtx, poly) {
        poly.forEach((point, index) => {
            if (index === 0) targetCtx.moveTo(point.x, point.y);
            else targetCtx.lineTo(point.x, point.y);
        });
    }

    function createFinalSeatJson() {
        const finalSeats = [];
        const seen = new Set();

        state.seats.forEach((seat) => {
            if (seat.status === "REMOVED") return;
            const section = findSectionForSeat(seat);
            const normalized = normalizeSeatForSave(seat, section);
            if (!normalized || seen.has(normalized.id)) return;
            seen.add(normalized.id);
            finalSeats.push(normalized);
        });

        finalSeats.sort((a, b) => {
            const sectionCompare = String(a.sectionName).localeCompare(String(b.sectionName), "ko");
            if (sectionCompare !== 0) return sectionCompare;
            const rowCompare = rowNameToIndex(a.row) - rowNameToIndex(b.row);
            if (rowCompare !== 0) return rowCompare;
            return Number(a.col || 0) - Number(b.col || 0);
        });

        return finalSeats;
    }

    function normalizeSeatForSave(seat, section) {
        const source = section || findSectionForSeat(seat);
        const sectionId = seat.sectionId || source?.sectionId || "";
        const sectionName = seat.sectionName || seat.section || source?.sectionName || "";
        if (!sectionId || !sectionName) return null;

        const floor = String(seat.floor || source?.floor || "1");
        const grade = String(seat.grade || source?.grade || "일반석");
        const status = String(seat.status || STATUS_AVAILABLE).toUpperCase();
        const row = String(seat.row || "A");
        const col = Number(seat.col || 1);
        const id = [
            cleanSeatPart(floor),
            cleanSeatPart(sectionName),
            cleanSeatPart(row),
            cleanSeatPart(col),
            cleanSeatPart(grade),
            cleanSeatPart(status)
        ].join("-");

        return {
            id,
            sectionId,
            sectionName,
            section: sectionName,
            groupKey: source?.groupKey || seat.groupKey || "",
            groupIndex: source?.groupIndex ?? seat.groupIndex ?? null,
            floor,
            grade,
            price: Number(seat.price ?? source?.price ?? 0) || 0,
            row,
            col,
            status,
            x: round(seat.x),
            y: round(seat.y),
            size: round(seat.size || 10),
            angle: round(normalizeAngle(seat.angle || 0))
        };
    }

    async function saveSeatsToServer(options = {}) {
        const finalSeats = createFinalSeatJson();
        const invalidSections = state.sections.filter((section) => !section.sectionName);

        if (invalidSections.length) {
            const message = "sectionName이 없는 구역이 있습니다. Stage 3에서 구역명을 먼저 확정하세요.";
            toast(message);
            if (!options.source) alert(message);
            throw new Error(message);
        }
        if (!finalSeats.length) {
            const message = "저장할 좌석이 없습니다.";
            toast(message);
            if (!options.source) alert(message);
            throw new Error(message);
        }

        persistLocalWork();

        const payload = {
            page: "stage4",
            folderName: state.projectId,
            seatJsonText: JSON.stringify(finalSeats, null, 2),
            sectionJsonText: JSON.stringify(state.sections.map(sectionForSave), null, 2),
            bookingButtonJsonText: "",
            decorationJsonText: "",
            imageDataUrl: exportDebugImageDataUrl()
        };

        const button = options.source === "header" ? null : dom.saveSeatsBtn;
        const before = button?.textContent;

        try {
            if (button) {
                button.disabled = true;
                button.textContent = "저장 중...";
            }

            const response = await fetch(SAVE_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || "좌석 JSON 저장 실패");
            }

            const result = await response.json();
            localStorage.setItem(STORAGE.seatsUrl, result.seatJsonUrl || state.seatsUrl);
            toast(`좌석 ${finalSeats.length}개 저장 완료`);
            syncAll();
            return result;
        } catch (error) {
            console.error(error);
            toast("저장 실패: " + error.message);
            if (!options.source) alert("좌석 JSON 저장 실패: " + error.message);
            throw error;
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = before;
            }
        }
    }

    function goStage5() {
        saveSeatsToServer()
            .then(() => {
                window.location.href = state.stage5Url || `/admin/seatmap/stage/5?projectId=${encodeURIComponent(state.projectId)}`;
            })
            .catch(() => {});
    }

    function persistLocalWork() {
        const finalSeats = createFinalSeatJson();
        writeJson(STORAGE.sections, state.sections.map(sectionForSave));
        writeJson(STORAGE.sectionsCompat, state.sections.map(sectionForSave));
        writeJson(STORAGE.seats, state.seats);
        writeJson(STORAGE.finalSeats, finalSeats);
        writeJson(STORAGE.bookingSeats, finalSeats);
        writeJson(STORAGE.layouts, state.layouts);
        writeJson(STORAGE.layoutsCompat, state.layouts);
        writeJson(STORAGE.seatsBySectionCompat, groupSeatsBySection(finalSeats));
    }

    function sectionForSave(section) {
        return {
            ...section,
            id: section.id || section.sectionId,
            sectionId: section.sectionId,
            name: section.sectionName,
            section: section.sectionName,
            sectionName: section.sectionName,
            label: section.label || section.sectionName,
            polygon: section.polygon.map(copyPoint),
            polygons: Array.isArray(section.polygons) && section.polygons.length ? section.polygons.map((poly) => poly.map(copyPoint)) : [section.polygon.map(copyPoint)],
            bbox: getSectionBbox(section)
        };
    }

    function groupSeatsBySection(seats) {
        return seats.reduce((acc, seat) => {
            const key = seat.sectionId;
            if (!acc[key]) acc[key] = [];
            acc[key].push(seat);
            return acc;
        }, {});
    }

    function exportDebugImageDataUrl() {
        try {
            const out = document.createElement("canvas");
            const outCtx = out.getContext("2d");
            out.width = state.width;
            out.height = state.height;
            outCtx.drawImage(canvas, 0, 0);
            drawOverlay(outCtx, { skipHover: true, noClear: true });
            return out.toDataURL("image/png");
        } catch (error) {
            console.warn("[SeatTrace Stage4] debug image export failed", error);
            return "";
        }
    }

    function setZoom(nextZoom) {
        state.zoom = Math.max(0.15, Math.min(5, Number(nextZoom) || 1));
        applyZoom();
    }

    function fitZoom() {
        if (!dom.canvasScroll || !state.width || !state.height) {
            setZoom(1);
            return;
        }
        const pad = 80;
        const availableW = Math.max(260, dom.canvasScroll.clientWidth - pad);
        const availableH = Math.max(260, dom.canvasScroll.clientHeight - pad);
        const zoom = Math.min(1, availableW / state.width, availableH / state.height);
        setZoom(zoom || 1);
    }

    function applyZoom() {
        const cssW = Math.max(1, state.width * state.zoom);
        const cssH = Math.max(1, state.height * state.zoom);
        [canvas, overlay].forEach((item) => {
            if (!item) return;
            item.style.width = `${cssW}px`;
            item.style.height = `${cssH}px`;
        });
        if (dom.canvasBox) {
            dom.canvasBox.style.width = `${cssW}px`;
            dom.canvasBox.style.height = `${cssH}px`;
        }
        if (dom.zoomValue) dom.zoomValue.textContent = `${Math.round(state.zoom * 100)}%`;
    }

    function canvasPoint(event) {
        const rect = overlay.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        return {
            x: ((event.clientX - rect.left) * overlay.width) / rect.width,
            y: ((event.clientY - rect.top) * overlay.height) / rect.height
        };
    }

    function normalizeSection(raw, index) {
        const sectionId = cleanText(raw?.sectionId || raw?.id, `section-${index + 1}`);
        const sectionName = cleanText(raw?.sectionName || raw?.name || raw?.section || raw?.label, "");
        const polygon = normalizePolygon(raw?.polygon)
            || normalizePolygons(raw?.polygons)[0]
            || polygonFromBbox(raw?.bbox);
        const polygons = normalizePolygons(raw?.polygons);
        const bbox = raw?.bbox && Number.isFinite(Number(raw.bbox.w))
            ? normalizeBbox(raw.bbox)
            : bboxOf(polygon || []);

        return {
            ...raw,
            id: cleanText(raw?.id, sectionId),
            sectionId,
            groupKey: cleanText(raw?.groupKey || raw?.groupName, ""),
            groupName: cleanText(raw?.groupName || raw?.groupKey, ""),
            groupIndex: raw?.groupIndex ?? null,
            name: sectionName,
            section: sectionName,
            sectionName,
            label: cleanText(raw?.label, sectionName),
            floor: cleanText(raw?.floor, "1"),
            grade: cleanText(raw?.grade, "일반석"),
            price: Number(raw?.price) || 0,
            color: cleanText(raw?.color || raw?.renderColor || raw?.sourceColor, "#d9d9d9"),
            renderColor: cleanText(raw?.renderColor || raw?.color || raw?.sourceColor, "#d9d9d9"),
            sourceColor: cleanText(raw?.sourceColor || raw?.color || raw?.renderColor, "#d9d9d9"),
            polygon: polygon || [],
            polygons: polygons.length ? polygons : (polygon ? [polygon] : []),
            bbox
        };
    }

    function normalizeSeat(raw, index) {
        const section = findSectionByAny(raw?.sectionId, raw?.sectionName || raw?.section || raw?.name);
        const sectionId = cleanText(raw?.sectionId || section?.sectionId, "");
        const sectionName = cleanText(raw?.sectionName || raw?.section || section?.sectionName, "");
        const row = cleanText(raw?.row || raw?.seatRow, "A");
        const col = positiveInt(raw?.col ?? raw?.seatCol ?? raw?.no, index + 1);
        const floor = cleanText(raw?.floor || section?.floor, "1");
        const grade = cleanText(raw?.grade || section?.grade, "일반석");
        const status = cleanText(raw?.status, STATUS_AVAILABLE).toUpperCase();
        const x = Number(raw?.x);
        const y = Number(raw?.y);
        const size = Number(raw?.size || raw?.w || raw?.width || 10);
        const angle = normalizeAngle(Number(raw?.angle) || 0);
        const id = cleanText(raw?.id, [cleanSeatPart(floor), cleanSeatPart(sectionName), cleanSeatPart(row), cleanSeatPart(col), cleanSeatPart(grade), status].join("-"));

        return {
            ...raw,
            id,
            sectionId,
            sectionName,
            section: sectionName,
            groupKey: section?.groupKey || raw?.groupKey || "",
            groupIndex: section?.groupIndex ?? raw?.groupIndex ?? null,
            floor,
            grade,
            price: Number(raw?.price ?? section?.price ?? 0) || 0,
            row,
            col,
            status,
            x,
            y,
            size,
            angle
        };
    }

    function normalizeSeatCollection(value) {
        if (Array.isArray(value)) return value;
        if (value && typeof value === "object") {
            return Object.values(value).flatMap((item) => Array.isArray(item) ? item : []);
        }
        return [];
    }

    function normalizePolygon(poly) {
        if (!Array.isArray(poly) || poly.length < 3) return null;
        const points = poly.map((point) => ({ x: Number(point.x), y: Number(point.y) }))
            .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
        return points.length >= 3 ? points : null;
    }

    function normalizePolygons(polygons) {
        if (!Array.isArray(polygons)) return [];
        return polygons.map(normalizePolygon).filter(Boolean);
    }

    function polygonFromBbox(bbox) {
        const box = normalizeBbox(bbox);
        if (!box.w || !box.h) return null;
        return [
            { x: box.x, y: box.y },
            { x: box.x + box.w, y: box.y },
            { x: box.x + box.w, y: box.y + box.h },
            { x: box.x, y: box.y + box.h }
        ];
    }

    function normalizeBbox(bbox) {
        return {
            x: Number(bbox?.x) || 0,
            y: Number(bbox?.y) || 0,
            w: Number(bbox?.w ?? bbox?.width) || 0,
            h: Number(bbox?.h ?? bbox?.height) || 0
        };
    }

    function hasUsablePolygon(section) {
        return Array.isArray(section?.polygon) && section.polygon.length >= 3;
    }

    function hasSeatPoint(seat) {
        return Number.isFinite(Number(seat?.x)) && Number.isFinite(Number(seat?.y)) && seat.sectionId && seat.sectionName;
    }

    function findSectionForSeat(seat) {
        return findSectionByAny(seat?.sectionId, seat?.sectionName || seat?.section);
    }

    function findSectionByAny(sectionId, sectionName) {
        const id = String(sectionId || "");
        const name = String(sectionName || "");
        return state.sections.find((section) => section.sectionId === id)
            || state.sections.find((section) => section.sectionName === name)
            || null;
    }

    function getSectionBbox(section) {
        if (section?.bbox && Number(section.bbox.w) > 0 && Number(section.bbox.h) > 0) {
            return normalizeBbox(section.bbox);
        }
        return bboxOf(section?.polygon || []);
    }

    function bboxOf(points) {
        if (!points || !points.length) return { x: 0, y: 0, w: 0, h: 0 };
        const xs = points.map((point) => Number(point.x) || 0);
        const ys = points.map((point) => Number(point.y) || 0);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }

    function seatInsidePolygon(center, size, angle, polygon) {
        if (!isInsideOrEdge(center, polygon)) return false;
        const half = size / 2;
        const samples = [
            center,
            rotatePoint({ x: center.x - half, y: center.y - half }, center, angle),
            rotatePoint({ x: center.x + half, y: center.y - half }, center, angle),
            rotatePoint({ x: center.x + half, y: center.y + half }, center, angle),
            rotatePoint({ x: center.x - half, y: center.y + half }, center, angle)
        ];
        const insideCount = samples.filter((point) => isInsideOrEdge(point, polygon)).length;
        return insideCount >= 3;
    }

    function pointInPoly(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const a = polygon[i];
            const b = polygon[j];
            if ((a.y > point.y) !== (b.y > point.y)
                && point.x < ((b.x - a.x) * (point.y - a.y)) / ((b.y - a.y) || 1e-9) + a.x) {
                inside = !inside;
            }
        }
        return inside;
    }

    function isInsideOrEdge(point, polygon) {
        if (!polygon || polygon.length < 3) return false;
        if (pointInPoly(point, polygon)) return true;
        return distanceToPolygon(point, polygon) <= 0.75;
    }

    function distanceToPolygon(point, polygon) {
        let min = Infinity;
        for (let i = 0; i < polygon.length; i += 1) {
            const a = polygon[i];
            const b = polygon[(i + 1) % polygon.length];
            min = Math.min(min, distancePointSegment(point, a, b));
        }
        return min;
    }

    function distancePointSegment(point, a, b) {
        const vx = b.x - a.x;
        const vy = b.y - a.y;
        const wx = point.x - a.x;
        const wy = point.y - a.y;
        const len2 = vx * vx + vy * vy;
        if (!len2) return Math.hypot(point.x - a.x, point.y - a.y);
        const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2));
        const px = a.x + t * vx;
        const py = a.y + t * vy;
        return Math.hypot(point.x - px, point.y - py);
    }

    function pointInRotatedRect(point, cx, cy, w, h, angle) {
        const local = rotatePoint(point, { x: cx, y: cy }, -angle);
        return Math.abs(local.x - cx) <= w / 2 && Math.abs(local.y - cy) <= h / 2;
    }

    function rotatePoint(point, pivot, angle) {
        const rad = degToRad(angle);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const dx = point.x - pivot.x;
        const dy = point.y - pivot.y;
        return {
            x: pivot.x + dx * cos - dy * sin,
            y: pivot.y + dx * sin + dy * cos
        };
    }

    function polygonCenter(poly) {
        if (!poly || !poly.length) return { x: 0, y: 0 };
        let x = 0;
        let y = 0;
        poly.forEach((point) => {
            x += point.x;
            y += point.y;
        });
        return { x: x / poly.length, y: y / poly.length };
    }

    function nextColumnFor(section, row) {
        const rowKey = String(row || "A").toUpperCase();
        const cols = getSectionSeats(section)
            .filter((seat) => String(seat.row || "").toUpperCase() === rowKey)
            .map((seat) => Number(seat.col) || 0);
        return Math.max(1, ...cols) + (cols.length ? 1 : 0);
    }

    function countVisibleSeats() {
        return state.seats.filter((seat) => seat.status !== "REMOVED").length;
    }

    function rowNameToIndex(row) {
        const text = String(row || "A").trim().toUpperCase();
        if (/^\d+$/.test(text)) return Math.max(0, Number(text) - 1);
        let value = 0;
        for (let i = 0; i < text.length; i += 1) {
            const code = text.charCodeAt(i);
            if (code < 65 || code > 90) continue;
            value = value * 26 + (code - 64);
        }
        return Math.max(0, value - 1);
    }

    function indexToRowName(index) {
        let n = Math.max(0, Number(index) || 0) + 1;
        let out = "";
        while (n > 0) {
            const mod = (n - 1) % 26;
            out = String.fromCharCode(65 + mod) + out;
            n = Math.floor((n - 1) / 26);
        }
        return out || "A";
    }

    function normalizeAngle(angle) {
        let next = Number(angle) || 0;
        while (next > 180) next -= 360;
        while (next < -180) next += 360;
        return next;
    }

    function degToRad(deg) {
        return (Number(deg) || 0) * Math.PI / 180;
    }

    function round(value, precision = 2) {
        const pow = 10 ** precision;
        return Math.round((Number(value) || 0) * pow) / pow;
    }

    function positiveInt(value, fallback) {
        const number = parseInt(value, 10);
        return Number.isFinite(number) && number > 0 ? number : fallback;
    }

    function cleanText(value, fallback = "") {
        const text = String(value ?? "").trim();
        return text || fallback;
    }

    function cleanSeatPart(value) {
        return String(value ?? "")
            .trim()
            .replace(/\s+/g, "_")
            .replace(/-+/g, "_") || "EMPTY";
    }

    function copyPoint(point) {
        return { x: round(point.x), y: round(point.y) };
    }

    function formatPrice(price) {
        const number = Number(price) || 0;
        return number ? `${number.toLocaleString("ko-KR")}원` : "-";
    }

    function sanitizeProjectId(value) {
        return String(value || "seat")
            .trim()
            .replace(/\s+/g, "_")
            .replace(/[^a-zA-Z0-9가-힣._-]/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_+|_+$/g, "") || "seat";
    }

    function projectFileUrl(fileName) {
        return `/temp/seatmap/${encodeURIComponent(state.projectId)}/${fileName}`;
    }

    function noCache(url) {
        if (!url) return url;
        const separator = url.includes("?") ? "&" : "?";
        return `${url}${separator}_=${Date.now()}`;
    }

    function loadImage(url) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = url;
        });
    }

    function unique(values) {
        return [...new Set(values.filter(Boolean))];
    }

    function readJson(key, fallback) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : fallback;
        } catch (error) {
            return fallback;
        }
    }

    function writeJson(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn("[SeatTrace Stage4] localStorage 저장 실패", key, error);
            return false;
        }
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function toast(message) {
        const target = dom.toast || document.getElementById("toast");
        if (!target) return;
        target.textContent = message;
        target.classList.add("show");
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => target.classList.remove("show"), 2300);
    }
})();
