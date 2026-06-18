(() => {
    "use strict";

    const STORAGE_KEYS = {
        sections: "concert_sections",
        overviewImage: "concert_overviewImage",
        imageMeta: "concert_imageMeta",
        stage3Seats: "concert_stage3_seats",
        stage3Layouts: "concert_stage3_layouts",
        stage3Data: "concert_stage3Data",
        layoutJson: "concert_layout_json",
        bookingJson: "concert_booking_seats"
    };

    const PART = {
        BASE: 1,
        EDIT: 2
    };

    const STATUS = {
        AVAILABLE: "AVAILABLE",
        REMOVED: "REMOVED",
        OBSTRUCTED: "OBSTRUCTED"
    };

    const COLORS = {
        bg: "#f8fafc",
        stage: "#c9c9c9",
        sectionStroke: "#ffffff",
        selected: "#ef4444",
        sectionFallback: "#8b5cf6",
        seat: "#dedede",
        seatLine: "#ffffff",
        selectedSeat: "#2563eb",
        obstructed: "#f59e0b",
        removed: "rgba(148,163,184,.22)",
        guide: "rgba(100,116,139,.45)"
    };

    const dom = {};

    const state = {
        part: PART.BASE,
        sections: readJson(STORAGE_KEYS.sections, []),
        seatsBySection: readJson(STORAGE_KEYS.stage3Seats, {}),
        layoutsBySection: readJson(STORAGE_KEYS.stage3Layouts, {}),
        selectedId: null,
        completedParts: new Set(),
        mapZoom: 1,
        mapPanX: 0,
        mapPanY: 0,
        mapDragging: false,
        mapMoved: false,
        mapStartX: 0,
        mapStartY: 0,
        mapStartPanX: 0,
        mapStartPanY: 0,
        mapTransform: { scale: 1, x: 0, y: 0 },
        editorTransform: { scale: 1, x: 0, y: 0 },
        width: 980,
        height: 660,
        selectedSeatIds: new Set(),
        hoverSeatId: null,
        draggingBox: false,
        movingSeats: false,
        pointerDown: false,
        dragStart: null,
        dragCurrent: null,
        moveOrigin: null,
        movedSeatSnapshot: null
    };

    init();

    function init() {
        cacheDom();
        normalizeSections();
        setInitialSelection();
        setupCanvasSizes();
        bindEvents();
        syncSelects();
        renderAll();
        setPart(PART.BASE, false);
    }

    function cacheDom() {
        dom.app = $("stage3App");
        dom.toast = $("toast");
        dom.miniCanvas = $("miniCanvas");
        dom.miniCtx = dom.miniCanvas?.getContext("2d");
        dom.miniFrame = $("miniFrame");
        dom.seatBase = $("seatBase");
        dom.seatOverlay = $("seatOverlay");
        dom.seatBaseCtx = dom.seatBase?.getContext("2d");
        dom.seatOverlayCtx = dom.seatOverlay?.getContext("2d");
        dom.seatCanvasBox = $("seatCanvasBox");
        dom.popover = $("seatActionPopover");
        dom.canvasTitle = $("canvasTitle");
        dom.sizeText = $("sizeText");
        dom.zoomIn = $("zoomIn");
        dom.zoomOut = $("zoomOut");
        dom.zoomReset = $("zoomReset");
        dom.zoomValue = $("zoomValue");
        dom.partBtn1 = $("partBtn1");
        dom.partBtn2 = $("partBtn2");
        dom.part1Panel = $("part1Panel");
        dom.part2Panel = $("part2Panel");
        dom.stage3Guide = $("stage3Guide");
        dom.baseSectionSelect = $("baseSectionSelect");
        dom.editSectionSelect = $("editSectionSelect");
        dom.baseRows = $("baseRows");
        dom.baseCols = $("baseCols");
        dom.editRows = $("editRows");
        dom.editCols = $("editCols");
        dom.applyBaseOne = $("applyBaseOne");
        dom.applyBaseAll = $("applyBaseAll");
        dom.regenSelected = $("regenSelected");
        dom.sectionsList1 = $("sectionsList1");
        dom.goPart2 = $("goPart2");
        dom.toStage4 = $("toStage4");
        dom.selName = $("selName");
        dom.selCount = $("selCount");
        dom.selectedCount = $("selectedCount");
        dom.selObstructed = $("selObstructed");
        dom.seatWidthRange = $("seatWidthRange");
        dom.seatHeightRange = $("seatHeightRange");
        dom.gapXRange = $("gapXRange");
        dom.gapYRange = $("gapYRange");
        dom.paddingXRange = $("paddingXRange");
        dom.paddingYRange = $("paddingYRange");
        dom.offsetXRange = $("offsetXRange");
        dom.offsetYRange = $("offsetYRange");
        dom.seatWidthValue = $("seatWidthValue");
        dom.seatHeightValue = $("seatHeightValue");
        dom.gapXValue = $("gapXValue");
        dom.gapYValue = $("gapYValue");
        dom.paddingXValue = $("paddingXValue");
        dom.paddingYValue = $("paddingYValue");
        dom.offsetXValue = $("offsetXValue");
        dom.offsetYValue = $("offsetYValue");
        dom.resetLayoutBtn = $("resetLayoutBtn");
        dom.saveLayoutBtn = $("saveLayoutBtn");
        dom.applyRemove = $("applyRemove");
        dom.applyAvailable = $("applyAvailable");
        dom.applyObstructed = $("applyObstructed");
        dom.clearSelection = $("clearSelection");
    }

    function $(id) {
        return document.getElementById(id);
    }

    function readJson(key, fallback) {
        try {
            return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
        } catch (error) {
            return fallback;
        }
    }

    function writeJson(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function toast(message) {
        if (!dom.toast) return;
        dom.toast.textContent = message;
        dom.toast.classList.add("show");
        clearTimeout(toast.timer);
        toast.timer = setTimeout(() => dom.toast.classList.remove("show"), 1900);
    }

    function normalizeSections() {
        if (!Array.isArray(state.sections)) state.sections = [];
        state.sections.forEach((section, index) => {
            section.id = section.id || `sec${index + 1}`;
            section.name = section.name || `구역 ${index + 1}`;
            section.label = section.label || String(index + 1);
            section.floor = section.floor || "1층";
            section.grade = section.grade || "일반석";
            section.price = section.price || 0;
            section.renderColor = section.renderColor || COLORS.sectionFallback;
            section.seatShape = cleanupSeatShape(section);
            section.seatRows = section.seatRows || getLayout(section).rows || 0;
            section.seatCols = section.seatCols || getLayout(section).cols || 0;
        });
        const meta = readJson(STORAGE_KEYS.imageMeta, {});
        const points = state.sections.flatMap(section => getSeatShape(section));
        state.width = meta.width || Math.max(980, Math.ceil(Math.max(0, ...points.map(point => point.x)) + 60));
        state.height = meta.height || Math.max(660, Math.ceil(Math.max(0, ...points.map(point => point.y)) + 60));
    }

    function setInitialSelection() {
        state.selectedId = state.sections[0]?.id || null;
    }

    function setupCanvasSizes() {
        resizeCanvasToBox(dom.miniCanvas, dom.miniFrame);
        resizeCanvasToBox(dom.seatBase, dom.seatCanvasBox);
        resizeCanvasToBox(dom.seatOverlay, dom.seatCanvasBox);
        window.addEventListener("resize", () => {
            resizeCanvasToBox(dom.miniCanvas, dom.miniFrame);
            resizeCanvasToBox(dom.seatBase, dom.seatCanvasBox);
            resizeCanvasToBox(dom.seatOverlay, dom.seatCanvasBox);
            renderAll();
        });
    }

    function resizeCanvasToBox(canvas, box) {
        if (!canvas || !box) return;
        const rect = box.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.floor(rect.width * ratio));
        canvas.height = Math.max(1, Math.floor(rect.height * ratio));
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        const ctx = canvas.getContext("2d");
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function bindEvents() {
        on(dom.partBtn1, "click", () => setPart(PART.BASE));
        on(dom.partBtn2, "click", () => setPart(PART.EDIT));
        on(dom.goPart2, "click", () => setPart(PART.EDIT));
        on(dom.applyBaseOne, "click", applyBaseOne);
        on(dom.applyBaseAll, "click", applyBaseAll);
        on(dom.regenSelected, "click", regenerateSelected);
        on(dom.baseSectionSelect, "change", event => selectSection(event.target.value));
        on(dom.editSectionSelect, "change", event => selectSection(event.target.value));
        on(dom.zoomIn, "click", () => setMapZoom(state.mapZoom * 1.15));
        on(dom.zoomOut, "click", () => setMapZoom(state.mapZoom / 1.15));
        on(dom.zoomReset, "click", resetMapView);
        on(dom.miniCanvas, "wheel", handleMiniWheel, { passive: false });
        on(dom.miniCanvas, "pointerdown", handleMiniPointerDown);
        on(window, "pointermove", handleWindowPointerMove);
        on(window, "pointerup", handleWindowPointerUp);
        on(dom.seatOverlay, "pointerdown", handleSeatPointerDown);
        on(dom.seatOverlay, "pointermove", handleSeatPointerMove);
        on(dom.seatOverlay, "pointerleave", () => {
            state.hoverSeatId = null;
            renderSeatOverlay();
        });
        on(dom.applyRemove, "click", () => applyStatusToSelection(STATUS.REMOVED));
        on(dom.applyAvailable, "click", () => applyStatusToSelection(STATUS.AVAILABLE));
        on(dom.applyObstructed, "click", () => applyStatusToSelection(STATUS.OBSTRUCTED));
        on(dom.clearSelection, "click", clearSelection);
        on(dom.resetLayoutBtn, "click", resetSelectedLayout);
        on(dom.saveLayoutBtn, "click", () => {
            saveWorkData();
            toast("Stage3 작업 저장 완료");
        });
        on(dom.toStage4, "click", goStage4);
        getRangeControls().forEach(item => {
            on(item.input, "input", () => updateSelectedLayoutFromControls(true));
            on(item.input, "change", () => updateSelectedLayoutFromControls(true));
        });
    }

    function on(target, eventName, handler, options) {
        if (!target) return;
        target.addEventListener(eventName, handler, options);
    }

    function setPart(nextPart, completePrevious = true) {
        if (completePrevious) {
            for (let i = 1; i < nextPart; i += 1) state.completedParts.add(i);
        }
        state.part = nextPart;
        syncPartUi();
        syncGuide();
        renderAll();
    }

    function syncPartUi() {
        [PART.BASE, PART.EDIT].forEach(number => {
            const panel = number === PART.BASE ? dom.part1Panel : dom.part2Panel;
            const button = number === PART.BASE ? dom.partBtn1 : dom.partBtn2;
            if (!panel || !button) return;
            const active = state.part === number;
            const done = state.completedParts.has(number) && !active;
            panel.classList.toggle("is-active", active);
            panel.classList.toggle("is-done", done);
            button.classList.toggle("active", active);
            const status = panel.querySelector(".seatmap-step__status");
            if (status) status.textContent = active ? "진행중" : done ? "완료" : "대기";
        });
    }

    function syncGuide() {
        if (!dom.stage3Guide) return;
        dom.stage3Guide.textContent = state.part === PART.BASE
            ? "미니맵에서 기준 구역을 클릭하고 좌석 수를 입력한 뒤 전체 구역을 자동 추정하세요."
            : "좌석을 클릭하거나 드래그해서 선택한 뒤 중앙 팝업으로 삭제/복구/장애석 처리하세요.";
    }

    function syncSelects() {
        const html = state.sections.map(section => {
            const count = getSeatCount(section);
            const rows = section.seatRows || getLayout(section).rows || 0;
            const cols = section.seatCols || getLayout(section).cols || 0;
            return `<option value="${escapeHtml(section.id)}">${escapeHtml(section.name)} · ${escapeHtml(section.floor)} · ${escapeHtml(section.grade)} · ${rows}×${cols} · ${count}석</option>`;
        }).join("");
        if (dom.baseSectionSelect) dom.baseSectionSelect.innerHTML = html;
        if (dom.editSectionSelect) dom.editSectionSelect.innerHTML = html;
        if (state.selectedId) {
            if (dom.baseSectionSelect) dom.baseSectionSelect.value = state.selectedId;
            if (dom.editSectionSelect) dom.editSectionSelect.value = state.selectedId;
        }
        const section = getSelectedSection();
        if (section) {
            const layout = getLayout(section);
            if (dom.editRows) dom.editRows.value = section.seatRows || layout.rows || 5;
            if (dom.editCols) dom.editCols.value = section.seatCols || layout.cols || 10;
            syncLayoutControls(layout);
        }
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;");
    }

    function renderAll() {
        syncSelects();
        renderSectionList();
        renderMiniMap();
        renderSeatEditor();
        updateInfoPanel();
    }

    function renderSectionList() {
        if (!dom.sectionsList1) return;
        if (!state.sections.length) {
            dom.sectionsList1.innerHTML = `<div class="help-text">Stage2에서 구역을 먼저 저장하세요.</div>`;
            return;
        }
        dom.sectionsList1.innerHTML = state.sections.map(section => {
            const active = section.id === state.selectedId ? " active" : "";
            const rows = section.seatRows || getLayout(section).rows || 0;
            const cols = section.seatCols || getLayout(section).cols || 0;
            const count = getSeatCount(section);
            return `
                <div class="section-item${active}" data-id="${escapeHtml(section.id)}">
                    <i class="section-item__color" style="background:${escapeHtml(section.renderColor || COLORS.sectionFallback)}"></i>
                    <div>
                        <strong>${escapeHtml(section.name)}</strong>
                        <span>${escapeHtml(section.floor)} · ${escapeHtml(section.grade)} · ${rows}×${cols} · ${count}석</span>
                    </div>
                </div>
            `;
        }).join("");
        dom.sectionsList1.querySelectorAll(".section-item").forEach(item => {
            item.addEventListener("click", () => selectSection(item.dataset.id));
        });
    }

    function renderMiniMap() {
        const canvas = dom.miniCanvas;
        const ctx = dom.miniCtx;
        if (!canvas || !ctx) return;
        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, rect.width, rect.height);
        const fit = Math.min(rect.width / state.width, rect.height / state.height) * 0.82;
        const scale = fit * state.mapZoom;
        const x = rect.width / 2 - state.width * scale / 2 + state.mapPanX;
        const y = rect.height / 2 - state.height * scale / 2 + state.mapPanY;
        state.mapTransform = { scale, x, y };
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        drawStageOnMap(ctx);
        state.sections.forEach(section => {
            const paths = getMapPaths(section);
            if (!paths.length) return;
            ctx.save();
            ctx.beginPath();
            paths.forEach(path => {
                if (!path || path.length < 3) return;
                drawPoly(ctx, path);
                ctx.closePath();
            });
            ctx.fillStyle = hexToRgba(section.renderColor || COLORS.sectionFallback, section.id === state.selectedId ? 0.88 : 0.68);
            ctx.strokeStyle = section.id === state.selectedId ? COLORS.selected : "#ffffff";
            ctx.lineWidth = section.id === state.selectedId ? 5 / scale : 3 / scale;
            ctx.lineJoin = "round";
            ctx.fill("evenodd");
            ctx.stroke();
            ctx.restore();
        });
        ctx.restore();
        updateZoomText();
    }

    function drawStageOnMap(ctx) {
        const stageW = Math.min(state.width * 0.34, 330);
        const stageH = Math.max(28, state.height * 0.065);
        const stageX = (state.width - stageW) / 2;
        const stageY = state.height * 0.07;
        ctx.save();
        ctx.fillStyle = COLORS.stage;
        ctx.fillRect(stageX, stageY, stageW, stageH);
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${Math.max(14, state.width * 0.016)}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("STAGE", state.width / 2, stageY + stageH / 2);
        ctx.restore();
    }

    function renderSeatEditor() {
        const base = dom.seatBase;
        const overlay = dom.seatOverlay;
        const ctx = dom.seatBaseCtx;
        if (!base || !overlay || !ctx) return;
        const rect = base.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, rect.width, rect.height);
        const section = getSelectedSection();
        if (!section) {
            ctx.fillStyle = "#64748b";
            ctx.font = "bold 16px Arial";
            ctx.textAlign = "center";
            ctx.fillText("Stage2 구역 데이터가 없습니다.", rect.width / 2, rect.height / 2);
            renderSeatOverlay();
            return;
        }
        if (dom.canvasTitle) dom.canvasTitle.textContent = state.part === PART.BASE ? "파트1 · 기준 구역 선택" : "파트2 · 좌석 배치 편집";
        if (dom.sizeText) dom.sizeText.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
        const transform = computeEditorTransform(section, rect.width, rect.height);
        state.editorTransform = transform;
        drawSeatEditorStage(ctx, rect.width);
        drawSectionGuide(ctx, section, transform);
        drawSeats(ctx, section, transform);
        renderSeatOverlay();
    }

    function drawSeatEditorStage(ctx, width) {
        ctx.save();
        const stageW = Math.min(width - 180, 660);
        const x = (width - stageW) / 2;
        ctx.fillStyle = COLORS.stage;
        ctx.fillRect(x, 34, stageW, 54);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("무대방향 (STAGE)", width / 2, 61);
        ctx.restore();
    }

    function drawSectionGuide(ctx, section, transform) {
        const shape = getSeatShape(section);
        ctx.save();
        ctx.translate(transform.x, transform.y);
        ctx.scale(transform.scale, transform.scale);
        ctx.beginPath();
        drawPoly(ctx, shape);
        ctx.closePath();
        ctx.fillStyle = "rgba(148,163,184,.08)";
        ctx.strokeStyle = COLORS.guide;
        ctx.lineWidth = 2 / transform.scale;
        ctx.setLineDash([8 / transform.scale, 6 / transform.scale]);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = "#64748b";
        ctx.font = "13px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`현재 보고 계신 구역은 ${section.floor} ${section.name} 구역입니다.`, ctx.canvas.getBoundingClientRect().width / 2, 115);
        ctx.restore();
    }

    function drawSeats(ctx, section, transform) {
        const seats = getSeats(section);
        ctx.save();
        ctx.translate(transform.x, transform.y);
        ctx.scale(transform.scale, transform.scale);
        seats.forEach(seat => {
            const selected = state.selectedSeatIds.has(seat.id);
            const hover = state.hoverSeatId === seat.id;
            ctx.save();
            roundRect(ctx, seat.x - seat.w / 2, seat.y - seat.h / 2, seat.w, seat.h, Math.max(1.5, Math.min(seat.w, seat.h) * 0.10));
            if (seat.status === STATUS.REMOVED) {
                ctx.strokeStyle = COLORS.removed;
                ctx.setLineDash([3 / transform.scale, 3 / transform.scale]);
                ctx.lineWidth = 1.4 / transform.scale;
                ctx.stroke();
            } else {
                ctx.fillStyle = seat.status === STATUS.OBSTRUCTED ? COLORS.obstructed : COLORS.seat;
                ctx.strokeStyle = selected ? COLORS.selectedSeat : hover ? COLORS.selected : COLORS.seatLine;
                ctx.lineWidth = selected ? 3 / transform.scale : hover ? 2.4 / transform.scale : 1 / transform.scale;
                ctx.fill();
                ctx.stroke();
            }
            ctx.restore();
        });
        ctx.restore();
    }

    function renderSeatOverlay() {
        const canvas = dom.seatOverlay;
        const ctx = dom.seatOverlayCtx;
        if (!canvas || !ctx) return;
        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);
        if (state.draggingBox && state.dragStart && state.dragCurrent) {
            const box = rectFromPoints(state.dragStart, state.dragCurrent);
            ctx.save();
            ctx.fillStyle = "rgba(37,99,235,.10)";
            ctx.strokeStyle = "#2563eb";
            ctx.setLineDash([6, 4]);
            ctx.lineWidth = 1.5;
            ctx.fillRect(box.x, box.y, box.w, box.h);
            ctx.strokeRect(box.x, box.y, box.w, box.h);
            ctx.restore();
        }
        placePopover();
    }

    function computeEditorTransform(section, canvasW, canvasH) {
        const bbox = bboxOf(getSeatShape(section));
        const maxW = canvasW - 160;
        const maxH = canvasH - 190;
        const scale = Math.min(maxW / Math.max(1, bbox.w), maxH / Math.max(1, bbox.h));
        const x = canvasW / 2 - (bbox.x + bbox.w / 2) * scale;
        const y = 150 + maxH / 2 - (bbox.y + bbox.h / 2) * scale;
        return { scale, x, y };
    }

    function selectSection(sectionId) {
        if (!sectionId) return;
        state.selectedId = sectionId;
        state.selectedSeatIds.clear();
        const section = getSelectedSection();
        if (section) {
            const layout = getLayout(section);
            if (dom.baseSectionSelect) dom.baseSectionSelect.value = section.id;
            if (dom.editSectionSelect) dom.editSectionSelect.value = section.id;
            if (dom.editRows) dom.editRows.value = section.seatRows || layout.rows || 5;
            if (dom.editCols) dom.editCols.value = section.seatCols || layout.cols || 10;
            syncLayoutControls(layout);
        }
        hidePopover();
        renderAll();
    }

    function applyBaseOne() {
        const section = getSelectedOrBaseSection();
        if (!section) {
            toast("기준 구역을 선택하세요.");
            return;
        }
        const rows = positiveInt(dom.baseRows?.value, 5);
        const cols = positiveInt(dom.baseCols?.value, 10);
        state.selectedId = section.id;
        generateSectionSeats(section, rows, cols, true);
        saveWorkData();
        renderAll();
        toast(`${section.name} 기준 구역 좌석 생성 완료`);
    }

    function applyBaseAll() {
        const baseSection = getSelectedOrBaseSection();
        if (!baseSection) {
            toast("기준 구역을 선택하세요.");
            return;
        }
        const baseRows = positiveInt(dom.baseRows?.value, 5);
        const baseCols = positiveInt(dom.baseCols?.value, 10);
        state.selectedId = baseSection.id;
        state.seatsBySection = {};
        state.layoutsBySection = {};
        state.selectedSeatIds.clear();
        state.sections.forEach(section => {
            section.seatShape = cleanupSeatShape(section);
        });
        const baseArea = Math.max(1, polygonArea(getSeatShape(baseSection)));
        const baseCount = Math.max(1, baseRows * baseCols);
        state.sections.forEach(section => {
            const shape = getSeatShape(section);
            const bbox = bboxOf(shape);
            const area = Math.max(1, polygonArea(shape));
            const targetCount = Math.max(1, Math.round(baseCount * area / baseArea));
            const aspect = Math.max(0.25, bbox.w / Math.max(1, bbox.h));
            const cols = section.id === baseSection.id ? baseCols : Math.max(1, Math.round(Math.sqrt(targetCount * aspect)));
            const rows = section.id === baseSection.id ? baseRows : Math.max(1, Math.ceil(targetCount / cols));
            generateSectionSeats(section, rows, cols, true);
        });
        saveWorkData();
        renderAll();
        toast("모든 구역 좌석을 다시 자동 추정했습니다.");
    }

    function regenerateSelected() {
        const section = getSelectedSection();
        if (!section) return;
        const rows = positiveInt(dom.editRows?.value, section.seatRows || 5);
        const cols = positiveInt(dom.editCols?.value, section.seatCols || 10);
        generateSectionSeats(section, rows, cols, true);
        state.selectedSeatIds.clear();
        saveWorkData();
        renderAll();
        toast("선택 구역 좌석을 재생성했습니다.");
    }

    function generateSectionSeats(section, rows, cols, resetLayout) {
        section.seatRows = rows;
        section.seatCols = cols;
        const current = getLayout(section);
        const layout = resetLayout ? defaultLayoutFor(section, rows, cols) : { ...current, rows, cols };
        state.layoutsBySection[section.id] = layout;
        state.seatsBySection[section.id] = buildSeats(section, layout);
    }

    function buildSeats(section, layout) {
        const shape = getSeatShape(section);
        const bbox = bboxOf(shape);
        const seats = [];
        const rows = Math.max(1, layout.rows || section.seatRows || 1);
        const cols = Math.max(1, layout.cols || section.seatCols || 1);
        const top = bbox.y + layout.paddingY + layout.offsetY + layout.seatH / 2;
        const bottom = bbox.y + bbox.h - layout.paddingY + layout.offsetY - layout.seatH / 2;
        for (let row = 0; row < rows; row += 1) {
            const ratioY = rows <= 1 ? 0.5 : row / (rows - 1);
            const y = rows <= 1 ? bbox.y + bbox.h / 2 + layout.offsetY : top + (bottom - top) * ratioY;
            const span = spanAtY(shape, y - layout.offsetY, bbox);
            const left = span.left + layout.paddingX + layout.offsetX + layout.seatW / 2;
            const right = span.right - layout.paddingX + layout.offsetX - layout.seatW / 2;
            const fallbackLeft = bbox.x + layout.paddingX + layout.offsetX + layout.seatW / 2;
            const fallbackRight = bbox.x + bbox.w - layout.paddingX + layout.offsetX - layout.seatW / 2;
            const rowLeft = Number.isFinite(left) && right > left ? left : fallbackLeft;
            const rowRight = Number.isFinite(right) && right > left ? right : fallbackRight;
            for (let col = 0; col < cols; col += 1) {
                const ratioX = cols <= 1 ? 0.5 : col / (cols - 1);
                const x = cols <= 1 ? (rowLeft + rowRight) / 2 : rowLeft + (rowRight - rowLeft) * ratioX;
                seats.push({
                    id: `${section.id}-${rowName(row)}-${col + 1}`,
                    sectionId: section.id,
                    rowIndex: row,
                    colIndex: col,
                    row: rowName(row),
                    col: col + 1,
                    x,
                    y,
                    w: layout.seatW,
                    h: layout.seatH,
                    status: STATUS.AVAILABLE,
                    color: section.renderColor || COLORS.seat
                });
            }
        }
        return seats;
    }



    function spanAtY(poly, y, bbox) {
        const xs = [];
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
            const a = poly[i];
            const b = poly[j];
            if ((a.y > y) === (b.y > y)) continue;
            const t = (y - a.y) / ((b.y - a.y) || 1);
            xs.push(a.x + (b.x - a.x) * t);
        }
        xs.sort((a, b) => a - b);
        if (xs.length >= 2) {
            return { left: xs[0], right: xs[xs.length - 1] };
        }
        return { left: bbox.x, right: bbox.x + bbox.w };
    }

    function defaultLayoutFor(section, rows, cols) {
        const bbox = bboxOf(getSeatShape(section));
        const paddingX = Math.max(6, Math.round(Math.min(bbox.w, bbox.h) * 0.04));
        const paddingY = Math.max(6, Math.round(Math.min(bbox.w, bbox.h) * 0.04));
        const cellW = Math.max(6, (bbox.w - paddingX * 2) / Math.max(1, cols));
        const cellH = Math.max(6, (bbox.h - paddingY * 2) / Math.max(1, rows));
        const seatW = Math.max(6, Math.min(34, Math.round(cellW * 0.66)));
        const seatH = Math.max(6, Math.min(34, Math.round(cellH * 0.66)));
        const gapX = Math.max(1, Math.min(22, Math.round(Math.max(0, cellW - seatW))));
        const gapY = Math.max(1, Math.min(22, Math.round(Math.max(0, cellH - seatH))));
        return { rows, cols, seatW, seatH, gapX, gapY, paddingX, paddingY, offsetX: 0, offsetY: 0 };
    }

    function getLayout(section) {
        if (!section) return defaultBlankLayout();
        if (!state.layoutsBySection[section.id]) {
            state.layoutsBySection[section.id] = defaultLayoutFor(section, section.seatRows || 5, section.seatCols || 10);
        }
        return state.layoutsBySection[section.id];
    }

    function defaultBlankLayout() {
        return { rows: 5, cols: 10, seatW: 18, seatH: 18, gapX: 4, gapY: 4, paddingX: 14, paddingY: 14, offsetX: 0, offsetY: 0 };
    }

    function syncLayoutControls(layout) {
        setRange(dom.seatWidthRange, layout.seatW);
        setRange(dom.seatHeightRange, layout.seatH);
        setRange(dom.gapXRange, layout.gapX);
        setRange(dom.gapYRange, layout.gapY);
        setRange(dom.paddingXRange, layout.paddingX);
        setRange(dom.paddingYRange, layout.paddingY);
        setRange(dom.offsetXRange, layout.offsetX);
        setRange(dom.offsetYRange, layout.offsetY);
        syncRangeLabels();
    }

    function setRange(input, value) {
        if (!input) return;
        input.value = String(Math.round(value || 0));
    }

    function updateSelectedLayoutFromControls(redraw) {
        const section = getSelectedSection();
        if (!section) return;
        const layout = getLayout(section);
        layout.seatW = numberValue(dom.seatWidthRange, layout.seatW);
        layout.seatH = numberValue(dom.seatHeightRange, layout.seatH);
        layout.gapX = numberValue(dom.gapXRange, layout.gapX);
        layout.gapY = numberValue(dom.gapYRange, layout.gapY);
        layout.paddingX = numberValue(dom.paddingXRange, layout.paddingX);
        layout.paddingY = numberValue(dom.paddingYRange, layout.paddingY);
        layout.offsetX = numberValue(dom.offsetXRange, layout.offsetX);
        layout.offsetY = numberValue(dom.offsetYRange, layout.offsetY);
        layout.rows = positiveInt(dom.editRows?.value, section.seatRows || layout.rows || 5);
        layout.cols = positiveInt(dom.editCols?.value, section.seatCols || layout.cols || 10);
        section.seatRows = layout.rows;
        section.seatCols = layout.cols;
        state.seatsBySection[section.id] = buildSeats(section, layout).map(nextSeat => {
            const old = getSeats(section).find(seat => seat.id === nextSeat.id);
            return old ? { ...nextSeat, status: old.status } : nextSeat;
        });
        syncRangeLabels();
        saveWorkData();
        if (redraw) renderAll();
    }

    function syncRangeLabels() {
        const pairs = [
            [dom.seatWidthRange, dom.seatWidthValue],
            [dom.seatHeightRange, dom.seatHeightValue],
            [dom.gapXRange, dom.gapXValue],
            [dom.gapYRange, dom.gapYValue],
            [dom.paddingXRange, dom.paddingXValue],
            [dom.paddingYRange, dom.paddingYValue],
            [dom.offsetXRange, dom.offsetXValue],
            [dom.offsetYRange, dom.offsetYValue]
        ];
        pairs.forEach(([input, label]) => {
            if (input && label) label.textContent = `${input.value}px`;
        });
    }

    function getRangeControls() {
        return [
            { input: dom.seatWidthRange },
            { input: dom.seatHeightRange },
            { input: dom.gapXRange },
            { input: dom.gapYRange },
            { input: dom.paddingXRange },
            { input: dom.paddingYRange },
            { input: dom.offsetXRange },
            { input: dom.offsetYRange }
        ];
    }

    function numberValue(input, fallback) {
        return input ? Number(input.value) || 0 : fallback;
    }

    function positiveInt(value, fallback) {
        return Math.max(1, parseInt(value, 10) || fallback || 1);
    }

    function resetSelectedLayout() {
        const section = getSelectedSection();
        if (!section) return;
        const rows = section.seatRows || positiveInt(dom.editRows?.value, 5);
        const cols = section.seatCols || positiveInt(dom.editCols?.value, 10);
        generateSectionSeats(section, rows, cols, true);
        syncLayoutControls(getLayout(section));
        saveWorkData();
        renderAll();
        toast("선택 구역 배치값을 초기화했습니다.");
    }

    function handleMiniWheel(event) {
        event.preventDefault();
        const before = screenToWorld(event, dom.miniCanvas, state.mapTransform);
        const nextZoom = event.deltaY < 0 ? state.mapZoom * 1.12 : state.mapZoom / 1.12;
        setMapZoom(nextZoom, false);
        renderMiniMap();
        const after = worldToScreen(before, state.mapTransform);
        const rect = dom.miniCanvas.getBoundingClientRect();
        state.mapPanX += event.clientX - rect.left - after.x;
        state.mapPanY += event.clientY - rect.top - after.y;
        renderMiniMap();
    }

    function handleMiniPointerDown(event) {
        if (!dom.miniCanvas) return;
        state.mapDragging = true;
        state.mapMoved = false;
        state.mapStartX = event.clientX;
        state.mapStartY = event.clientY;
        state.mapStartPanX = state.mapPanX;
        state.mapStartPanY = state.mapPanY;
        dom.miniCanvas.setPointerCapture?.(event.pointerId);
    }

    function handleWindowPointerMove(event) {
        if (state.mapDragging) {
            const dx = event.clientX - state.mapStartX;
            const dy = event.clientY - state.mapStartY;
            if (Math.abs(dx) + Math.abs(dy) > 3) state.mapMoved = true;
            state.mapPanX = state.mapStartPanX + dx;
            state.mapPanY = state.mapStartPanY + dy;
            renderMiniMap();
            return;
        }
        if (state.pointerDown) handleSeatDrag(event);
    }

    function handleWindowPointerUp(event) {
        if (state.mapDragging) {
            if (!state.mapMoved) {
                const point = screenToWorld(event, dom.miniCanvas, state.mapTransform);
                const hit = findSectionAt(point);
                if (hit) selectSection(hit.id);
            }
            state.mapDragging = false;
            return;
        }
        if (state.pointerDown) finishSeatPointer(event);
    }

    function setMapZoom(value, shouldRender = true) {
        state.mapZoom = Math.max(0.35, Math.min(5, value));
        if (shouldRender) renderMiniMap();
    }

    function resetMapView() {
        state.mapZoom = 1;
        state.mapPanX = 0;
        state.mapPanY = 0;
        renderMiniMap();
    }

    function updateZoomText() {
        if (dom.zoomValue) dom.zoomValue.textContent = `${Math.round(state.mapZoom * 100)}%`;
    }

    function handleSeatPointerDown(event) {
        const point = pointerInCanvas(event, dom.seatOverlay);
        const world = editorScreenToWorld(point);
        const seat = findSeatAtWorld(world);
        state.pointerDown = true;
        state.dragStart = point;
        state.dragCurrent = point;
        if (seat && state.selectedSeatIds.has(seat.id)) {
            state.movingSeats = true;
            state.moveOrigin = world;
            state.movedSeatSnapshot = Array.from(state.selectedSeatIds).map(id => {
                const found = getSelectedSeats().find(item => item.id === id);
                return found ? { id, x: found.x, y: found.y } : null;
            }).filter(Boolean);
            hidePopover();
            return;
        }
        if (seat) {
            state.selectedSeatIds.clear();
            state.selectedSeatIds.add(seat.id);
            hidePopover();
            renderAll();
            return;
        }
        state.draggingBox = true;
        state.selectedSeatIds.clear();
        hidePopover();
        renderSeatOverlay();
    }

    function handleSeatPointerMove(event) {
        if (!state.pointerDown) {
            const point = pointerInCanvas(event, dom.seatOverlay);
            const world = editorScreenToWorld(point);
            const seat = findSeatAtWorld(world);
            state.hoverSeatId = seat?.id || null;
            renderSeatOverlay();
        }
    }

    function handleSeatDrag(event) {
        const point = pointerInCanvas(event, dom.seatOverlay);
        state.dragCurrent = point;
        if (state.movingSeats) {
            const world = editorScreenToWorld(point);
            const dx = world.x - state.moveOrigin.x;
            const dy = world.y - state.moveOrigin.y;
            const seats = getSelectedSeats();
            state.movedSeatSnapshot.forEach(snapshot => {
                const seat = seats.find(item => item.id === snapshot.id);
                if (seat) {
                    seat.x = snapshot.x + dx;
                    seat.y = snapshot.y + dy;
                }
            });
            renderSeatEditor();
            return;
        }
        if (state.draggingBox) {
            const box = rectFromPoints(state.dragStart, state.dragCurrent);
            const selected = getSeats(getSelectedSection()).filter(seat => {
                if (seat.status === STATUS.REMOVED) return false;
                const screen = editorWorldToScreen({ x: seat.x, y: seat.y });
                return screen.x >= box.x && screen.x <= box.x + box.w && screen.y >= box.y && screen.y <= box.y + box.h;
            });
            state.selectedSeatIds = new Set(selected.map(seat => seat.id));
            renderSeatOverlay();
            updateInfoPanel();
        }
    }

    function finishSeatPointer() {
        state.pointerDown = false;
        if (state.movingSeats) {
            state.movingSeats = false;
            state.moveOrigin = null;
            state.movedSeatSnapshot = null;
            saveWorkData();
            renderAll();
            return;
        }
        if (state.draggingBox) {
            state.draggingBox = false;
            renderAll();
            return;
        }
    }

    function findSeatAtWorld(point) {
        const section = getSelectedSection();
        if (!section) return null;
        const seats = getSeats(section).slice().reverse();
        return seats.find(seat => {
            if (seat.status === STATUS.REMOVED) return false;
            return point.x >= seat.x - seat.w / 2 && point.x <= seat.x + seat.w / 2 && point.y >= seat.y - seat.h / 2 && point.y <= seat.y + seat.h / 2;
        }) || null;
    }

    function getSelectedSeats() {
        const section = getSelectedSection();
        if (!section) return [];
        return getSeats(section).filter(seat => state.selectedSeatIds.has(seat.id));
    }

    function applyStatusToSelection(status) {
        const seats = getSelectedSeats();
        if (!seats.length) return;
        seats.forEach(seat => {
            seat.status = status;
        });
        saveWorkData();
        renderAll();
        toast(status === STATUS.REMOVED ? "선택 좌석 삭제 완료" : status === STATUS.OBSTRUCTED ? "선택 좌석 장애석 처리 완료" : "선택 좌석 복구 완료");
    }

    function clearSelection() {
        state.selectedSeatIds.clear();
        hidePopover();
        renderAll();
    }

    function placePopover() {
        if (!dom.popover) return;
        const seats = getSelectedSeats().filter(seat => seat.status !== STATUS.REMOVED);
        if (!seats.length) {
            hidePopover();
            return;
        }
        const points = seats.map(seat => editorWorldToScreen({ x: seat.x, y: seat.y }));
        const xs = points.map(point => point.x);
        const ys = points.map(point => point.y);
        const x = (Math.min(...xs) + Math.max(...xs)) / 2;
        const y = Math.min(...ys) - 12;
        dom.popover.style.left = `${x}px`;
        dom.popover.style.top = `${Math.max(42, y)}px`;
        dom.popover.classList.add("is-show");
        dom.popover.setAttribute("aria-hidden", "false");
    }

    function hidePopover() {
        if (!dom.popover) return;
        dom.popover.classList.remove("is-show");
        dom.popover.setAttribute("aria-hidden", "true");
    }

    function updateInfoPanel() {
        const section = getSelectedSection();
        const seats = section ? getSeats(section) : [];
        const visible = seats.filter(seat => seat.status !== STATUS.REMOVED);
        const obstructed = visible.filter(seat => seat.status === STATUS.OBSTRUCTED);
        if (dom.selName) dom.selName.textContent = section?.name || "-";
        if (dom.selCount) dom.selCount.textContent = visible.length;
        if (dom.selectedCount) dom.selectedCount.textContent = state.selectedSeatIds.size;
        if (dom.selObstructed) dom.selObstructed.textContent = obstructed.length;
    }

    function saveWorkData() {
        writeJson(STORAGE_KEYS.sections, state.sections);
        writeJson(STORAGE_KEYS.stage3Seats, state.seatsBySection);
        writeJson(STORAGE_KEYS.stage3Layouts, state.layoutsBySection);
        const stage3Data = createStage3Data();
        writeJson(STORAGE_KEYS.stage3Data, stage3Data);
        writeJson(STORAGE_KEYS.layoutJson, stage3Data.layoutJson);
        writeJson(STORAGE_KEYS.bookingJson, stage3Data.bookingJson);
    }

    function createStage3Data() {
        const layoutJson = {
            type: "CONCERT_SEAT_LAYOUT",
            width: state.width,
            height: state.height,
            sections: state.sections.map(section => ({
                id: section.id,
                name: section.name,
                label: section.label,
                floor: section.floor,
                grade: section.grade,
                price: section.price,
                color: section.renderColor,
                polygon: roundPoints(getSeatShape(section)),
                layout: getLayout(section),
                seats: getSeats(section).map(seat => ({
                    id: makeSeatCode(section, seat),
                    row: seat.row,
                    col: seat.col,
                    x: round(seat.x),
                    y: round(seat.y),
                    w: round(seat.w),
                    h: round(seat.h),
                    color: seat.status === STATUS.OBSTRUCTED ? COLORS.obstructed : COLORS.seat,
                    status: seat.status
                }))
            })),
            updatedAt: new Date().toISOString()
        };
        const bookingJson = [];
        state.sections.forEach(section => {
            getSeats(section).forEach(seat => {
                if (seat.status === STATUS.REMOVED) return;
                bookingJson.push({
                    id: makeSeatCode(section, seat),
                    floor: floorCode(section),
                    section: sectionCode(section),
                    row: seat.row,
                    col: seat.col,
                    grade: section.grade || "일반석",
                    price: section.price || 0,
                    status: seat.status === STATUS.OBSTRUCTED ? STATUS.OBSTRUCTED : STATUS.AVAILABLE
                });
            });
        });
        return { layoutJson, bookingJson };
    }

    function goStage4() {
        saveWorkData();
        const url = dom.app?.dataset.stage4Url || "/admin/seatmap/concert/stage4";
        location.href = url;
    }

    function getSelectedOrBaseSection() {
        const id = dom.baseSectionSelect?.value || state.selectedId;
        return state.sections.find(section => section.id === id) || getSelectedSection();
    }

    function getSelectedSection() {
        return state.sections.find(section => section.id === state.selectedId) || state.sections[0] || null;
    }

    function getSeats(section) {
        if (!section) return [];
        return state.seatsBySection[section.id] || [];
    }

    function getSeatCount(section) {
        return getSeats(section).filter(seat => seat.status !== STATUS.REMOVED).length;
    }

    function getSeatShape(section) {
        if (!section) return [];
        return section.seatShape && section.seatShape.length >= 3 ? section.seatShape : cleanupSeatShape(section);
    }

    function getMapPaths(section) {
        if (section.buttonShape?.paths?.length) return section.buttonShape.paths;
        if (section.buttonPolygon?.length) return [section.buttonPolygon];
        if (section.polygon?.length) return [section.polygon];
        return [];
    }

    function getMapShape(section) {
        const paths = getMapPaths(section);
        return paths[0] || [];
    }

    function cleanupSeatShape(section) {
        const raw = getMapShape(section);
        if (!raw.length) return [];
        const bbox = bboxOf(raw);
        const hull = convexHull(raw);
        const source = hull.length >= 3 ? hull : raw;
        const simplified = simplifyPolygon(source, Math.max(3, Math.min(bbox.w, bbox.h) * 0.025));
        const limited = limitPoints(simplified, 8);
        const shape = limited.length >= 3 ? limited : [
            { x: bbox.x, y: bbox.y },
            { x: bbox.x + bbox.w, y: bbox.y },
            { x: bbox.x + bbox.w, y: bbox.y + bbox.h },
            { x: bbox.x, y: bbox.y + bbox.h }
        ];
        return snapSeatShape(shape, Math.max(4, Math.min(bbox.w, bbox.h) * 0.035)).map(point => ({ x: round(point.x), y: round(point.y) }));
    }

    function getRawShape(section) {
        return getMapShape(section);
    }

    function snapSeatShape(poly, tolerance) {
        const out = poly.map(point => ({ x: point.x, y: point.y }));
        for (let i = 0; i < out.length; i += 1) {
            const a = out[i];
            const b = out[(i + 1) % out.length];
            if (Math.abs(a.x - b.x) <= tolerance) {
                const x = (a.x + b.x) / 2;
                a.x = x;
                b.x = x;
            }
            if (Math.abs(a.y - b.y) <= tolerance) {
                const y = (a.y + b.y) / 2;
                a.y = y;
                b.y = y;
            }
        }
        return out;
    }

    function findSectionAt(point) {
        return state.sections.slice().reverse().find(section => {
            const paths = getMapPaths(section);
            return paths.some(path => pointInPoly(point, path));
        }) || null;
    }

    function pointerInCanvas(event, canvas) {
        const rect = canvas.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function screenToWorld(event, canvas, transform) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left - transform.x) / transform.scale,
            y: (event.clientY - rect.top - transform.y) / transform.scale
        };
    }

    function worldToScreen(point, transform) {
        return { x: point.x * transform.scale + transform.x, y: point.y * transform.scale + transform.y };
    }

    function editorWorldToScreen(point) {
        return worldToScreen(point, state.editorTransform);
    }

    function editorScreenToWorld(point) {
        return { x: (point.x - state.editorTransform.x) / state.editorTransform.scale, y: (point.y - state.editorTransform.y) / state.editorTransform.scale };
    }

    function rectFromPoints(a, b) {
        const x = Math.min(a.x, b.x);
        const y = Math.min(a.y, b.y);
        return { x, y, w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
    }

    function drawPoly(ctx, poly) {
        poly.forEach((point, index) => {
            if (index === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
        });
    }

    function roundRect(ctx, x, y, w, h, r) {
        const radius = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    function bboxOf(poly) {
        if (!poly || !poly.length) return { x: 0, y: 0, w: 1, h: 1 };
        const xs = poly.map(point => point.x);
        const ys = poly.map(point => point.y);
        return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    }

    function polygonArea(poly) {
        if (!poly || poly.length < 3) return 0;
        let sum = 0;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
            sum += poly[j].x * poly[i].y - poly[i].x * poly[j].y;
        }
        return Math.abs(sum / 2);
    }

    function pointInPoly(point, poly) {
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
            const a = poly[i];
            const b = poly[j];
            const intersect = (a.y > point.y) !== (b.y > point.y) && point.x < ((b.x - a.x) * (point.y - a.y)) / ((b.y - a.y) || 1) + a.x;
            if (intersect) inside = !inside;
        }
        return inside;
    }

    function convexHull(points) {
        const sorted = points.map(point => ({ x: point.x, y: point.y })).sort((a, b) => a.x - b.x || a.y - b.y);
        const unique = [];
        sorted.forEach(point => {
            const last = unique[unique.length - 1];
            if (!last || last.x !== point.x || last.y !== point.y) unique.push(point);
        });
        if (unique.length <= 2) return unique;
        const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
        const lower = [];
        unique.forEach(point => {
            while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
            lower.push(point);
        });
        const upper = [];
        unique.slice().reverse().forEach(point => {
            while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
            upper.push(point);
        });
        return lower.slice(0, -1).concat(upper.slice(0, -1));
    }

    function simplifyPolygon(points, epsilon) {
        if (!points || points.length <= 3) return points || [];
        const closed = points.concat([points[0]]);
        return rdp(closed, epsilon).slice(0, -1);
    }

    function rdp(points, epsilon) {
        if (points.length <= 2) return points.slice();
        const start = points[0];
        const end = points[points.length - 1];
        const len = Math.hypot(end.x - start.x, end.y - start.y) || 1;
        let maxDist = 0;
        let index = 0;
        for (let i = 1; i < points.length - 1; i += 1) {
            const p = points[i];
            const dist = Math.abs((end.y - start.y) * p.x - (end.x - start.x) * p.y + end.x * start.y - end.y * start.x) / len;
            if (dist > maxDist) {
                index = i;
                maxDist = dist;
            }
        }
        if (maxDist > epsilon) {
            const left = rdp(points.slice(0, index + 1), epsilon);
            const right = rdp(points.slice(index), epsilon);
            return left.slice(0, -1).concat(right);
        }
        return [start, end];
    }

    function limitPoints(poly, max) {
        if (!poly || poly.length <= max) return poly || [];
        const scored = poly.map((point, index) => {
            const a = poly[(index - 1 + poly.length) % poly.length];
            const b = poly[(index + 1) % poly.length];
            const score = Math.abs((a.x - point.x) * (b.y - point.y) - (a.y - point.y) * (b.x - point.x));
            return { point, index, score };
        });
        return scored.sort((a, b) => b.score - a.score).slice(0, max).sort((a, b) => a.index - b.index).map(item => item.point);
    }

    function roundPoints(points) {
        return points.map(point => ({ x: round(point.x), y: round(point.y) }));
    }

    function round(value) {
        return Math.round(value * 100) / 100;
    }

    function rowName(index) {
        let n = index + 1;
        let name = "";
        while (n > 0) {
            n -= 1;
            name = String.fromCharCode(97 + n % 26) + name;
            n = Math.floor(n / 26);
        }
        return name;
    }

    function floorCode(section) {
        const match = String(section.floor || "1층").match(/\d+/);
        return match ? match[0] : String(section.floor || "1");
    }

    function sectionCode(section) {
        return String(section.label || section.name || section.id).replace(/^구역\s*/, "").replace(/\s+/g, "");
    }

    function makeSeatCode(section, seat) {
        return `${floorCode(section)}-${sectionCode(section)}-${seat.row}-${seat.col}`;
    }

    function hexToRgba(hex, alpha) {
        const cleaned = String(hex || "#8b5cf6").replace("#", "");
        if (cleaned.length !== 6) return `rgba(139,92,246,${alpha})`;
        const r = parseInt(cleaned.slice(0, 2), 16);
        const g = parseInt(cleaned.slice(2, 4), 16);
        const b = parseInt(cleaned.slice(4, 6), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }
})();
