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
        bookingJson: "concert_booking_seats",
        finalJson: "concert_final_seats",
        stage: "concert_stage",
        generatedOverviewImage: "concert_generated_overviewImage"
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
        guide: "rgba(100,116,139,.45)",
        rotate: "#ef4444",
        stageFill: "#111827",
        stageText: "#ffffff",
        stageGuide: "#7c3aed"
    };

    const dom = {};

    const state = {
        part: PART.BASE,
        sections: readJson(STORAGE_KEYS.sections, []),
        overviewImageUrl: findInitialOverviewImageUrl(),
        overviewImage: null,
        seatsBySection: readJson(STORAGE_KEYS.stage3Seats, {}),
        layoutsBySection: readJson(STORAGE_KEYS.stage3Layouts, {}),
        selectedId: null,
        completedParts: new Set(),
        stage: readJson(STORAGE_KEYS.stage, null),
        stageEditMode: false,
        stageDragging: false,
        stageDragOffsetX: 0,
        stageDragOffsetY: 0,

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
        movedSeatSnapshot: null,

        rotationDragging: false,
        rotationStartAngle: 0,
        rotationBaseAngle: 0,
        rotationHandleHitRadius: 16
    };

    init();

    function init() {
        cacheDom();
        normalizeSections();
        normalizeStageState();
        setInitialSelection();
        setupCanvasSizes();
        bindEvents();
        loadOverviewImage();
        syncSelects();
        ensureAllLayoutsHaveAngle();
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

        dom.stageEditMode = $("stageEditMode");
        dom.stageX = $("stageX");
        dom.stageY = $("stageY");
        dom.stageW = $("stageW");
        dom.stageH = $("stageH");
        dom.resetStagePosition = $("resetStagePosition");
        dom.autoStageAngles = $("autoStageAngles");

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

    function findInitialOverviewImageUrl() {
        return localStorage.getItem(STORAGE_KEYS.overviewImage)
            || localStorage.getItem(STORAGE_KEYS.generatedOverviewImage)
            || localStorage.getItem("seatmap_final_image_url")
            || getProjectImageUrl("seatmap-image.png")
            || localStorage.getItem("concert_buttonImage")
            || localStorage.getItem("seatmap_button_image_url")
            || getProjectImageUrl("button-image.png")
            || localStorage.getItem("concert_cleanImage")
            || localStorage.getItem("concert_originalImage")
            || getProjectImageUrl("cropped-image.png")
            || "";
    }

    function getProjectFolderName() {
        const query = new URLSearchParams(location.search);
        return query.get("projectId")
            || localStorage.getItem("seatmap_current_folder_name")
            || localStorage.getItem("seatmap_current_project_id")
            || "seat";
    }

    function getProjectImageUrl(fileName) {
        const folderName = getProjectFolderName();
        return `/temp/seatmap/${encodeURIComponent(folderName)}/${fileName}`;
    }

    function writeJson(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`[Stage3 저장 실패] ${key}`, error);

            if (isQuotaExceeded(error)) {
                toast("브라우저 저장 공간이 부족합니다. 임시 데이터를 정리한 뒤 다시 시도합니다.");
            } else {
                toast("Stage3 저장 중 오류가 발생했습니다. 콘솔을 확인하세요.");
            }

            return false;
        }
    }

    function isQuotaExceeded(error) {
        return error && (
            error.name === "QuotaExceededError" ||
            error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
            error.code === 22 ||
            error.code === 1014
        );
    }

    function toast(message) {
        if (!dom.toast) return;

        dom.toast.textContent = message;
        dom.toast.classList.add("show");

        clearTimeout(toast.timer);
        toast.timer = setTimeout(() => dom.toast.classList.remove("show"), 1900);
    }

    function loadOverviewImage() {
        if (!state.overviewImageUrl) return;

        const image = new Image();

        image.onload = () => {
            state.overviewImage = image;

            if (!readJson(STORAGE_KEYS.imageMeta, {}).width) {
                state.width = image.naturalWidth || state.width;
                state.height = image.naturalHeight || state.height;
            }

            renderAll();
        };

        image.src = state.overviewImageUrl;
    }

    function normalizeSections() {
        if (!Array.isArray(state.sections)) {
            state.sections = [];
        }

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

    function ensureAllLayoutsHaveAngle() {
        state.sections.forEach(section => {
            const layout = getLayout(section);

            if (!Number.isFinite(Number(layout.angle))) {
                layout.angle = 0;
            }
        });
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

        on(dom.stageEditMode, "change", () => {
            state.stageEditMode = Boolean(dom.stageEditMode.checked);
            renderAll();
            toast(state.stageEditMode ? "미니맵에서 스테이지를 클릭/드래그해서 위치를 조절하세요." : "스테이지 위치 조절 모드를 껐습니다.");
        });
        [dom.stageX, dom.stageY, dom.stageW, dom.stageH].forEach(input => {
            on(input, "input", updateStageFromControls);
            on(input, "change", updateStageFromControls);
        });
        on(dom.resetStagePosition, "click", resetStagePosition);
        on(dom.autoStageAngles, "click", applyStageAnglesToAll);

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
            if (saveWorkData()) {
                toast("Stage3 작업 저장 완료");
            }
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
            for (let i = 1; i < nextPart; i += 1) {
                state.completedParts.add(i);
            }
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
            if (status) {
                status.textContent = active ? "진행중" : done ? "완료" : "대기";
            }
        });
    }

    function syncGuide() {
        if (!dom.stage3Guide) return;

        dom.stage3Guide.textContent = state.part === PART.BASE
            ? "먼저 스테이지 위치를 맞춘 뒤 기준 구역과 기준 가로 좌석 수를 입력하세요. 좌석 각도는 스테이지 방향으로 자동 적용됩니다."
            : "Part2에서는 좌석을 클릭/드래그로 수정할 수 있고, 빨간 회전 핸들로 선택 구역 각도를 최종 보정할 수 있습니다.";
    }

    function syncSelects() {
        const html = state.sections.map(section => {
            const count = getSeatCount(section);
            const rows = section.seatRows || getLayout(section).rows || 0;
            const cols = section.seatCols || getLayout(section).cols || 0;
            const angle = normalizeAngle(getLayout(section).angle || 0);

            return `<option value="${escapeHtml(section.id)}">${escapeHtml(section.name)} · ${escapeHtml(section.floor)} · ${escapeHtml(section.grade)} · ${rows}×${cols} · ${count}석 · ${angle}°</option>`;
        }).join("");

        if (dom.baseSectionSelect) {
            dom.baseSectionSelect.innerHTML = html;
        }

        if (dom.editSectionSelect) {
            dom.editSectionSelect.innerHTML = html;
        }

        if (state.selectedId) {
            if (dom.baseSectionSelect) {
                dom.baseSectionSelect.value = state.selectedId;
            }

            if (dom.editSectionSelect) {
                dom.editSectionSelect.value = state.selectedId;
            }
        }

        const section = getSelectedSection();

        if (section) {
            const layout = getLayout(section);

            if (dom.editRows) {
                dom.editRows.value = section.seatRows || layout.rows || 5;
            }

            if (dom.editCols) {
                dom.editCols.value = section.seatCols || layout.cols || 10;
            }

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
        syncStageControls();
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
            const angle = normalizeAngle(getLayout(section).angle || 0);

            return `
                <div class="section-item${active}" data-id="${escapeHtml(section.id)}">
                    <i class="section-item__color" style="background:${escapeHtml(section.renderColor || COLORS.sectionFallback)}"></i>
                    <div>
                        <strong>${escapeHtml(section.name)}</strong>
                        <span>${escapeHtml(section.floor)} · ${escapeHtml(section.grade)} · ${rows}×${cols} · ${count}석 · ${angle}°</span>
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

        const fit = Math.min(rect.width / state.width, rect.height / state.height) * 0.92;
        const scale = fit * state.mapZoom;
        const x = rect.width / 2 - state.width * scale / 2 + state.mapPanX;
        const y = rect.height / 2 - state.height * scale / 2 + state.mapPanY;

        state.mapTransform = { scale, x, y };

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        if (state.overviewImage) {
            ctx.drawImage(state.overviewImage, 0, 0, state.width, state.height);
        } else {
            state.sections.forEach(section => drawMapSectionFill(ctx, section, scale));
        }

        drawStageOnMap(ctx, scale);
        state.sections.forEach(section => drawMapSectionOutline(ctx, section, scale));

        const selected = getSelectedSection();
        if (selected) {
            drawMapRotationArrow(ctx, selected, scale);
        }

        ctx.restore();
        updateZoomText();
    }

    function drawStageOnMap(ctx, scale = 1) {
        const stage = getStage();
        const selected = state.stageEditMode;

        ctx.save();
        ctx.fillStyle = COLORS.stageFill;
        ctx.strokeStyle = selected ? COLORS.stageGuide : "rgba(255,255,255,.9)";
        ctx.lineWidth = selected ? 5 / scale : 2 / scale;
        ctx.lineJoin = "round";

        roundRect(ctx, stage.x, stage.y, stage.w, stage.h, Math.max(4, Math.min(stage.w, stage.h) * 0.08));
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = COLORS.stageText;
        ctx.font = `bold ${Math.max(13, stage.h * 0.34)}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("STAGE", stage.x + stage.w / 2, stage.y + stage.h / 2);

        if (selected) {
            ctx.fillStyle = COLORS.stageGuide;
            ctx.font = `bold ${Math.max(10, 12 / scale)}px Arial`;
            ctx.fillText("드래그 이동", stage.x + stage.w / 2, stage.y + stage.h + 18 / scale);
        }

        ctx.restore();
    }

    function drawMapSectionFill(ctx, section, scale) {
        const paths = getMapPaths(section);
        if (!paths.length) return;

        ctx.save();
        ctx.beginPath();

        paths.forEach(path => {
            if (!path || path.length < 3) return;
            drawPoly(ctx, path);
            ctx.closePath();
        });

        ctx.fillStyle = hexToRgba(section.renderColor || COLORS.sectionFallback, 0.72);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3 / scale;
        ctx.lineJoin = "round";
        ctx.fill("evenodd");
        ctx.stroke();
        ctx.restore();
    }

    function drawMapSectionOutline(ctx, section, scale) {
        const paths = getMapPaths(section);
        if (!paths.length) return;

        const selected = section.id === state.selectedId;

        ctx.save();
        ctx.beginPath();

        paths.forEach(path => {
            if (!path || path.length < 3) return;
            drawPoly(ctx, path);
            ctx.closePath();
        });

        ctx.strokeStyle = selected ? COLORS.selected : "rgba(15,23,42,.14)";
        ctx.lineWidth = selected ? 4 / scale : 1.1 / scale;
        ctx.lineJoin = "round";
        ctx.stroke();
        ctx.restore();
    }

    function drawMapRotationArrow(ctx, section, scale) {
        const pivot = getSectionPivot(section);
        const layout = getLayout(section);
        const bbox = bboxOf(getSeatShape(section));
        const length = Math.max(bbox.w, bbox.h) * 0.8;
        const tip = rotatePoint(
            { x: pivot.x, y: pivot.y - length },
            pivot,
            layout.angle || 0
        );

        ctx.save();
        ctx.strokeStyle = COLORS.rotate;
        ctx.fillStyle = COLORS.rotate;
        ctx.lineWidth = 4 / scale;
        ctx.beginPath();
        ctx.moveTo(pivot.x, pivot.y);
        ctx.lineTo(tip.x, tip.y);
        ctx.stroke();

        const arrowSize = 16 / scale;
        const headBase = pointOnLine(tip, pivot, arrowSize);
        const left = rotatePoint(headBase, tip, 28);
        const right = rotatePoint(headBase, tip, -28);

        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(left.x, left.y);
        ctx.lineTo(right.x, right.y);
        ctx.closePath();
        ctx.fill();
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

        if (dom.canvasTitle) {
            dom.canvasTitle.textContent = state.part === PART.BASE ? "파트1 · 기준 구역 선택" : "파트2 · 좌석 배치 편집";
        }

        if (dom.sizeText) {
            dom.sizeText.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
        }

        const transform = computeEditorTransform(section, rect.width, rect.height);
        state.editorTransform = transform;

        drawSeatEditorStage(ctx, rect.width);
        drawSectionGuide(ctx, section, transform);
        drawSeats(ctx, section, transform);
        renderSeatOverlay();
    }

    function drawSeatEditorStage(ctx, width) {
        ctx.save();
        ctx.fillStyle = COLORS.stageFill;
        ctx.strokeStyle = "rgba(255,255,255,.9)";
        ctx.lineWidth = 2;

        const stageW = Math.min(width - 180, 660);
        const x = (width - stageW) / 2;

        roundRect(ctx, x, 34, stageW, 54, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = COLORS.stageText;
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("메인 스테이지 기준", width / 2, 61);
        ctx.restore();
    }

    function drawSectionGuide(ctx, section, transform) {
        const layout = getLayout(section);
        const shape = getRotatedSeatShape(section, layout.angle || 0);

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
        ctx.fillText(`현재 좌석 각도: ${normalizeAngle(layout.angle || 0)}°`, ctx.canvas.getBoundingClientRect().width / 2, 136);
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
            ctx.translate(seat.x, seat.y);
            ctx.rotate(toRad(seat.angle || 0));

            roundRect(
                ctx,
                -seat.w / 2,
                -seat.h / 2,
                seat.w,
                seat.h,
                Math.max(1.5, Math.min(seat.w, seat.h) * 0.10)
            );

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

        drawRotationOverlay(ctx);
        placePopover();
    }

    function drawRotationOverlay(ctx) {
        if (state.part !== PART.EDIT) return;

        const section = getSelectedSection();
        if (!section) return;

        const info = getRotationOverlayInfo(section);
        if (!info) return;

        ctx.save();
        ctx.strokeStyle = COLORS.rotate;
        ctx.fillStyle = COLORS.rotate;
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(info.center.x, info.center.y);
        ctx.lineTo(info.handle.x, info.handle.y);
        ctx.stroke();

        const arrowSize = 14;
        const headBase = pointOnLine(info.handle, info.center, arrowSize);
        const left = rotatePoint(headBase, info.handle, 28);
        const right = rotatePoint(headBase, info.handle, -28);

        ctx.beginPath();
        ctx.moveTo(info.handle.x, info.handle.y);
        ctx.lineTo(left.x, left.y);
        ctx.lineTo(right.x, right.y);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.arc(info.handle.x, info.handle.y, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(info.center.x, info.center.y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 13px Arial";
        ctx.textAlign = "left";
        ctx.fillText(`${normalizeAngle(getLayout(section).angle || 0)}°`, info.handle.x + 14, info.handle.y - 8);

        ctx.restore();
    }

    function computeEditorTransform(section, canvasW, canvasH) {
        const layout = getLayout(section);
        const shape = getRotatedSeatShape(section, layout.angle || 0);
        const bbox = bboxOf(shape);
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

            if (dom.baseSectionSelect) {
                dom.baseSectionSelect.value = section.id;
            }

            if (dom.editSectionSelect) {
                dom.editSectionSelect.value = section.id;
            }

            if (dom.editRows) {
                dom.editRows.value = section.seatRows || layout.rows || 5;
            }

            if (dom.editCols) {
                dom.editCols.value = section.seatCols || layout.cols || 10;
            }

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

        const baseCols = positiveInt(dom.baseCols?.value, 10);
        const baseBbox = bboxOf(getSeatShape(section));
        const seatSize = Math.max(2, baseBbox.w / baseCols);
        const rows = Math.max(1, Math.round(baseBbox.h / seatSize));

        state.selectedId = section.id;

        generateSectionSeats(section, rows, baseCols, true, seatSize);

        if (dom.editRows) {
            dom.editRows.value = rows;
        }

        if (dom.editCols) {
            dom.editCols.value = baseCols;
        }

        saveWorkData();
        renderAll();
        toast(`${section.name} 좌석 초안을 생성했습니다.`);
    }

    function applyBaseAll() {
        const baseSection = getSelectedOrBaseSection();

        if (!baseSection) {
            toast("기준 구역을 선택하세요.");
            return;
        }

        const baseCols = positiveInt(dom.baseCols?.value, 10);
        const baseBbox = bboxOf(getSeatShape(baseSection));
        const seatSize = Math.max(2, baseBbox.w / baseCols);

        state.selectedId = baseSection.id;
        state.seatsBySection = {};
        state.layoutsBySection = {};
        state.selectedSeatIds.clear();

        state.sections.forEach(section => {
            section.seatShape = cleanupSeatShape(section);

            const bbox = bboxOf(getSeatShape(section));
            const cols = Math.max(1, Math.round(bbox.w / seatSize));
            const rows = Math.max(1, Math.round(bbox.h / seatSize));

            generateSectionSeats(section, rows, cols, true, seatSize);
        });

        const selectedLayout = getLayout(baseSection);

        if (dom.editRows) {
            dom.editRows.value = selectedLayout.rows;
        }

        if (dom.editCols) {
            dom.editCols.value = selectedLayout.cols;
        }

        saveWorkData();
        renderAll();
        toast("기준 좌석 크기로 모든 구역 좌석을 다시 생성했습니다.");
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

    function generateSectionSeats(section, rows, cols, resetLayout, preferredSeatSize) {
        section.seatRows = rows;
        section.seatCols = cols;

        const current = getLayout(section);
        const layout = resetLayout
            ? defaultLayoutFor(section, rows, cols, preferredSeatSize)
            : { ...current, rows, cols, angle: normalizeAngle(current.angle || 0) };

        state.layoutsBySection[section.id] = layout;
        state.seatsBySection[section.id] = buildSeats(section, layout);
    }

    function rebuildSelectedSectionSeats() {
        const section = getSelectedSection();
        if (!section) return;

        const layout = getLayout(section);
        const previous = getSeats(section);
        const statusMap = new Map(previous.map(seat => [seat.id, seat.status]));
        const movedMap = new Map(previous.map(seat => [seat.id, { x: seat.x, y: seat.y, angle: seat.angle }]));

        const rebuilt = buildSeats(section, layout).map(seat => {
            const prevStatus = statusMap.get(seat.id);
            const prevMoved = movedMap.get(seat.id);

            return {
                ...seat,
                status: prevStatus || seat.status,
                angle: prevMoved?.angle ?? seat.angle
            };
        });

        state.seatsBySection[section.id] = rebuilt;
    }

    function buildSeats(section, layout) {
        const bbox = bboxOf(getSeatShape(section));
        const rows = Math.max(1, layout.rows || section.seatRows || 1);
        const cols = Math.max(1, layout.cols || section.seatCols || 1);

        const seatW = Math.max(1, Number(layout.seatW) || 1);
        const seatH = Math.max(1, Number(layout.seatH) || seatW);
        const gapX = Math.max(0, Number(layout.gapX) || 0);
        const gapY = Math.max(0, Number(layout.gapY) || 0);
        const paddingX = Math.max(0, Number(layout.paddingX) || 0);
        const paddingY = Math.max(0, Number(layout.paddingY) || 0);
        const offsetX = Number(layout.offsetX) || 0;
        const offsetY = Number(layout.offsetY) || 0;
        const angle = normalizeAngle(layout.angle || 0);

        const usableW = Math.max(1, bbox.w - paddingX * 2);
        const usableH = Math.max(1, bbox.h - paddingY * 2);
        const gridW = cols * seatW + Math.max(0, cols - 1) * gapX;
        const gridH = rows * seatH + Math.max(0, rows - 1) * gapY;

        const startX = bbox.x + paddingX + (usableW - gridW) / 2 + offsetX;
        const startY = bbox.y + paddingY + (usableH - gridH) / 2 + offsetY;

        const pivot = getSectionPivot(section);
        const rotatedShape = getRotatedSeatShape(section, angle);
        const seats = [];

        for (let row = 0; row < rows; row += 1) {
            for (let col = 0; col < cols; col += 1) {
                const baseCenter = {
                    x: startX + col * (seatW + gapX) + seatW / 2,
                    y: startY + row * (seatH + gapY) + seatH / 2
                };

                const rotatedCenter = rotatePoint(baseCenter, pivot, angle);

                if (!seatFitsRotatedShape(rotatedCenter, rotatedShape, Math.max(seatW, seatH) * 0.45)) {
                    continue;
                }

                seats.push({
                    id: `${section.id}-${rowName(row)}-${col + 1}`,
                    sectionId: section.id,
                    rowIndex: row,
                    colIndex: col,
                    row: rowName(row),
                    col: col + 1,
                    x: rotatedCenter.x,
                    y: rotatedCenter.y,
                    w: seatW,
                    h: seatH,
                    angle,
                    status: STATUS.AVAILABLE,
                    color: section.renderColor || COLORS.seat
                });
            }
        }

        return seats;
    }

    function seatFitsRotatedShape(center, shape, tolerance) {
        if (pointInPoly(center, shape)) {
            return true;
        }

        return distanceToPolygon(center, shape) <= tolerance;
    }

    function defaultLayoutFor(section, rows, cols, preferredSeatSize) {
        const bbox = bboxOf(getSeatShape(section));
        const cellW = bbox.w / Math.max(1, cols);
        const cellH = bbox.h / Math.max(1, rows);
        const seatSize = Math.max(2, Math.floor(Math.min(preferredSeatSize || cellW, cellW, cellH)));

        return {
            rows,
            cols,
            seatW: seatSize,
            seatH: seatSize,
            gapX: 0,
            gapY: 0,
            paddingX: 0,
            paddingY: 0,
            offsetX: 0,
            offsetY: 0,
            angle: getAutoAngleForSection(section)
        };
    }

    function getLayout(section) {
        if (!section) return defaultBlankLayout();

        if (!state.layoutsBySection[section.id]) {
            state.layoutsBySection[section.id] = defaultLayoutFor(section, section.seatRows || 5, section.seatCols || 10);
        }

        if (!Number.isFinite(Number(state.layoutsBySection[section.id].angle))) {
            state.layoutsBySection[section.id].angle = 0;
        }

        return state.layoutsBySection[section.id];
    }

    function defaultBlankLayout() {
        return {
            rows: 5,
            cols: 10,
            seatW: 18,
            seatH: 18,
            gapX: 4,
            gapY: 4,
            paddingX: 14,
            paddingY: 14,
            offsetX: 0,
            offsetY: 0,
            angle: 0
        };
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
        layout.angle = normalizeAngle(layout.angle || 0);

        section.seatRows = layout.rows;
        section.seatCols = layout.cols;

        rebuildSelectedSectionSeats();
        syncRangeLabels();
        saveWorkData();

        if (redraw) {
            renderAll();
        }
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
            if (input && label) {
                label.textContent = `${input.value}px`;
            }
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

    function normalizeStageState() {
        state.stage = normalizeStage(state.stage);
        saveStage(false);
    }

    function normalizeStage(stage) {
        const fallback = createDefaultStage();
        const next = stage && typeof stage === "object" ? { ...fallback, ...stage } : fallback;

        next.x = Number(next.x);
        next.y = Number(next.y);
        next.w = Number(next.w);
        next.h = Number(next.h);

        if (!Number.isFinite(next.x)) next.x = fallback.x;
        if (!Number.isFinite(next.y)) next.y = fallback.y;
        if (!Number.isFinite(next.w) || next.w < 20) next.w = fallback.w;
        if (!Number.isFinite(next.h) || next.h < 10) next.h = fallback.h;

        next.angle = Number.isFinite(Number(next.angle)) ? Number(next.angle) : 0;
        clampStage(next);

        return next;
    }

    function createDefaultStage() {
        const w = Math.max(160, Math.min(420, state.width * 0.36));
        const h = Math.max(34, Math.min(70, state.height * 0.07));

        return {
            x: Math.round((state.width - w) / 2),
            y: Math.round(Math.max(18, state.height * 0.06)),
            w: Math.round(w),
            h: Math.round(h),
            angle: 0,
            label: "STAGE"
        };
    }

    function getStage() {
        if (!state.stage) {
            state.stage = createDefaultStage();
        }

        return state.stage;
    }

    function getStageCenter() {
        const stage = getStage();

        return {
            x: stage.x + stage.w / 2,
            y: stage.y + stage.h / 2
        };
    }

    function clampStage(stage) {
        stage.w = Math.max(20, Math.min(Math.round(stage.w), Math.max(20, state.width)));
        stage.h = Math.max(10, Math.min(Math.round(stage.h), Math.max(10, state.height)));
        stage.x = Math.round(Math.max(0, Math.min(stage.x, state.width - stage.w)));
        stage.y = Math.round(Math.max(0, Math.min(stage.y, state.height - stage.h)));
    }

    function saveStage(shouldSync = true) {
        writeJson(STORAGE_KEYS.stage, getStage());

        if (shouldSync) {
            syncStageControls();
        }
    }

    function syncStageControls() {
        const stage = getStage();

        if (dom.stageEditMode) {
            dom.stageEditMode.checked = state.stageEditMode;
        }

        setNumberInput(dom.stageX, stage.x);
        setNumberInput(dom.stageY, stage.y);
        setNumberInput(dom.stageW, stage.w);
        setNumberInput(dom.stageH, stage.h);
    }

    function setNumberInput(input, value) {
        if (!input || document.activeElement === input) return;
        input.value = String(Math.round(Number(value) || 0));
    }

    function updateStageFromControls() {
        const stage = getStage();

        stage.x = Number(dom.stageX?.value) || 0;
        stage.y = Number(dom.stageY?.value) || 0;
        stage.w = Math.max(20, Number(dom.stageW?.value) || stage.w);
        stage.h = Math.max(10, Number(dom.stageH?.value) || stage.h);

        clampStage(stage);
        saveStage(false);
        renderAll();
    }

    function resetStagePosition() {
        state.stage = createDefaultStage();
        saveStage();
        renderAll();
        toast("스테이지를 상단 중앙에 다시 배치했습니다.");
    }

    function pointInStage(point, stage) {
        return point.x >= stage.x &&
            point.x <= stage.x + stage.w &&
            point.y >= stage.y &&
            point.y <= stage.y + stage.h;
    }

    function getAutoAngleForSection(section) {
        const center = getSectionPivot(section);
        const stage = getStageCenter();
        const angle = Math.atan2(stage.y - center.y, stage.x - center.x) * 180 / Math.PI + 90;

        return normalizeAngle(angle);
    }

    function applyStageAnglesToAll() {
        if (!state.sections.length) {
            toast("먼저 구역을 생성하세요.");
            return;
        }

        state.sections.forEach(section => {
            const layout = getLayout(section);
            layout.angle = getAutoAngleForSection(section);
            state.layoutsBySection[section.id] = layout;

            if (getSeats(section).length) {
                state.seatsBySection[section.id] = buildSeats(section, layout).map(seat => ({
                    ...seat,
                    status: getSeatStatusById(section, seat.id) || seat.status
                }));
            }
        });

        saveWorkData();
        renderAll();
        toast("모든 구역 좌석 각도를 스테이지 방향으로 적용했습니다.");
    }

    function getSeatStatusById(section, id) {
        const previous = getSeats(section).find(seat => seat.id === id);
        return previous?.status || null;
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

        if (state.stageEditMode) {
            const point = screenToWorld(event, dom.miniCanvas, state.mapTransform);
            const stage = getStage();

            if (pointInStage(point, stage)) {
                state.stageDragging = true;
                state.stageDragOffsetX = point.x - stage.x;
                state.stageDragOffsetY = point.y - stage.y;
            } else {
                stage.x = Math.round(point.x - stage.w / 2);
                stage.y = Math.round(point.y - stage.h / 2);
                clampStage(stage);
                saveStage();
            }

            dom.miniCanvas.setPointerCapture?.(event.pointerId);
            renderAll();
            return;
        }

        state.mapDragging = true;
        state.mapMoved = false;
        state.mapStartX = event.clientX;
        state.mapStartY = event.clientY;
        state.mapStartPanX = state.mapPanX;
        state.mapStartPanY = state.mapPanY;

        dom.miniCanvas.setPointerCapture?.(event.pointerId);
    }

    function handleWindowPointerMove(event) {
        if (state.stageDragging) {
            const point = screenToWorld(event, dom.miniCanvas, state.mapTransform);
            const stage = getStage();
            stage.x = Math.round(point.x - state.stageDragOffsetX);
            stage.y = Math.round(point.y - state.stageDragOffsetY);
            clampStage(stage);
            renderAll();
            return;
        }

        if (state.mapDragging) {
            const dx = event.clientX - state.mapStartX;
            const dy = event.clientY - state.mapStartY;

            if (Math.abs(dx) + Math.abs(dy) > 3) {
                state.mapMoved = true;
            }

            state.mapPanX = state.mapStartPanX + dx;
            state.mapPanY = state.mapStartPanY + dy;

            renderMiniMap();
            return;
        }

        if (state.rotationDragging) {
            handleRotationDrag(event);
            return;
        }

        if (state.pointerDown) {
            handleSeatDrag(event);
        }
    }

    function handleWindowPointerUp(event) {
        if (state.stageDragging) {
            state.stageDragging = false;
            saveStage();
            renderAll();
            return;
        }

        if (state.mapDragging) {
            if (!state.mapMoved) {
                const point = screenToWorld(event, dom.miniCanvas, state.mapTransform);
                const hit = findSectionAt(point);

                if (hit) {
                    selectSection(hit.id);
                }
            }

            state.mapDragging = false;
            return;
        }

        if (state.rotationDragging) {
            finishRotationDrag();
            return;
        }

        if (state.pointerDown) {
            finishSeatPointer(event);
        }
    }

    function setMapZoom(value, shouldRender = true) {
        state.mapZoom = Math.max(0.35, Math.min(5, value));

        if (shouldRender) {
            renderMiniMap();
        }
    }

    function resetMapView() {
        state.mapZoom = 1;
        state.mapPanX = 0;
        state.mapPanY = 0;
        renderMiniMap();
    }

    function updateZoomText() {
        if (dom.zoomValue) {
            dom.zoomValue.textContent = `${Math.round(state.mapZoom * 100)}%`;
        }
    }

    function handleSeatPointerDown(event) {
        const point = pointerInCanvas(event, dom.seatOverlay);

        if (state.part === PART.EDIT && isOnRotationHandle(point)) {
            startRotationDrag(point);
            return;
        }

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
                return found ? { id, x: found.x, y: found.y, angle: found.angle } : null;
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
        if (state.rotationDragging) {
            return;
        }

        if (!state.pointerDown) {
            const point = pointerInCanvas(event, dom.seatOverlay);

            if (state.part === PART.EDIT && isOnRotationHandle(point)) {
                dom.seatOverlay.style.cursor = "grab";
                return;
            }

            dom.seatOverlay.style.cursor = "default";

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
                    seat.angle = snapshot.angle;
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

                return screen.x >= box.x &&
                    screen.x <= box.x + box.w &&
                    screen.y >= box.y &&
                    screen.y <= box.y + box.h;
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

    function startRotationDrag(point) {
        const section = getSelectedSection();
        if (!section) return;

        const info = getRotationOverlayInfo(section);
        if (!info) return;

        const layout = getLayout(section);
        const center = info.center;

        state.rotationDragging = true;
        state.rotationBaseAngle = normalizeAngle(layout.angle || 0);
        state.rotationStartAngle = screenAngleFromCenter(point, center);
        state.pointerDown = false;
        state.draggingBox = false;
        state.movingSeats = false;

        hidePopover();
        dom.seatOverlay.style.cursor = "grabbing";
    }

    function handleRotationDrag(event) {
        const section = getSelectedSection();
        if (!section) return;

        const point = pointerInCanvas(event, dom.seatOverlay);
        const info = getRotationOverlayInfo(section);
        if (!info) return;

        const current = screenAngleFromCenter(point, info.center);
        const delta = current - state.rotationStartAngle;

        const layout = getLayout(section);
        layout.angle = normalizeAngle(state.rotationBaseAngle + delta);

        rebuildSelectedSectionSeats();
        renderAll();
    }

    function finishRotationDrag() {
        state.rotationDragging = false;
        dom.seatOverlay.style.cursor = "grab";
        saveWorkData();
        renderAll();
    }

    function getRotationOverlayInfo(section) {
        const layout = getLayout(section);
        const shape = getRotatedSeatShape(section, layout.angle || 0);
        if (!shape.length) return null;

        const bbox = bboxOf(shape);
        const centerWorld = {
            x: bbox.x + bbox.w / 2,
            y: bbox.y + bbox.h / 2
        };
        const center = editorWorldToScreen(centerWorld);

        const handleWorld = {
            x: centerWorld.x,
            y: bbox.y - Math.max(26, bbox.h * 0.10) - 18
        };

        const handle = editorWorldToScreen(handleWorld);

        return { center, handle };
    }

    function isOnRotationHandle(screenPoint) {
        const section = getSelectedSection();
        if (!section) return false;

        const info = getRotationOverlayInfo(section);
        if (!info) return false;

        return distance(screenPoint, info.handle) <= state.rotationHandleHitRadius;
    }

    function screenAngleFromCenter(point, center) {
        return Math.atan2(point.y - center.y, point.x - center.x) * 180 / Math.PI + 90;
    }

    function findSeatAtWorld(point) {
        const section = getSelectedSection();
        if (!section) return null;

        const seats = getSeats(section).slice().reverse();

        return seats.find(seat => {
            if (seat.status === STATUS.REMOVED) return false;
            return pointInRotatedRect(point, seat);
        }) || null;
    }

    function pointInRotatedRect(point, seat) {
        const local = inverseRotatePoint(point, { x: seat.x, y: seat.y }, seat.angle || 0);

        return local.x >= seat.x - seat.w / 2 &&
            local.x <= seat.x + seat.w / 2 &&
            local.y >= seat.y - seat.h / 2 &&
            local.y <= seat.y + seat.h / 2;
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

        toast(
            status === STATUS.REMOVED
                ? "선택 좌석 삭제 완료"
                : status === STATUS.OBSTRUCTED
                    ? "선택 좌석 장애석 처리 완료"
                    : "선택 좌석 복구 완료"
        );
    }

    function clearSelection() {
        state.selectedSeatIds.clear();
        hidePopover();
        renderAll();
    }

    function placePopover() {
        if (!dom.popover) return;

        const seats = getSelectedSeats().filter(seat => seat.status !== STATUS.REMOVED);

        if (!seats.length || state.rotationDragging) {
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
        const angle = section ? normalizeAngle(getLayout(section).angle || 0) : 0;

        if (dom.selName) {
            dom.selName.textContent = section?.name || "-";
        }

        if (dom.selCount) {
            dom.selCount.textContent = visible.length;
        }

        if (dom.selectedCount) {
            dom.selectedCount.textContent = state.selectedSeatIds.size;
        }

        if (dom.selObstructed) {
            dom.selObstructed.textContent = obstructed.length;
        }

        const title = dom.selName?.parentElement?.parentElement?.parentElement?.querySelector("h3");
        if (title && section) {
            title.textContent = `선택 구역 · ${angle}°`;
        }
    }

    function saveWorkData(finalSave = false) {
        if (finalSave) {
            return saveFinalSeatJson();
        }

        const results = [
            writeJson(STORAGE_KEYS.sections, state.sections),
            writeJson(STORAGE_KEYS.stage3Seats, state.seatsBySection),
            writeJson(STORAGE_KEYS.stage3Layouts, state.layoutsBySection),
            writeJson(STORAGE_KEYS.stage, getStage())
        ];

        return results.every(Boolean);
    }

    function saveFinalSeatJson() {
        const finalSeats = createFinalSeatJson();
        const generatedOverviewImage = createGeneratedOverviewImage();

        clearHeavyStorageBeforeStage4();

        let saved = writeJson(STORAGE_KEYS.finalJson, finalSeats);
        saved = writeJson(STORAGE_KEYS.bookingJson, finalSeats) && saved;
        saved = writeJson(STORAGE_KEYS.sections, state.sections) && saved;
        saved = writeJson(STORAGE_KEYS.stage3Seats, state.seatsBySection) && saved;
        saved = writeJson(STORAGE_KEYS.stage3Layouts, state.layoutsBySection) && saved;
        saved = writeJson(STORAGE_KEYS.stage, getStage()) && saved;

        if (generatedOverviewImage) {
            try {
                localStorage.setItem(STORAGE_KEYS.generatedOverviewImage, generatedOverviewImage);
            } catch (error) {
                console.warn("[Stage3] generated overview image save skipped", error);
            }
        }

        if (saved) {
            return true;
        }

        clearEmergencyStage3WorkStorage();

        saved = writeJson(STORAGE_KEYS.finalJson, finalSeats);
        saved = writeJson(STORAGE_KEYS.bookingJson, finalSeats) && saved;

        return saved;
    }

    function clearHeavyStorageBeforeStage4() {
        const removeKeys = [
            STORAGE_KEYS.stage3Data,
            STORAGE_KEYS.overviewImage,
            STORAGE_KEYS.layoutJson,
            STORAGE_KEYS.bookingJson,
            STORAGE_KEYS.finalJson,
            STORAGE_KEYS.generatedOverviewImage
        ];

        removeKeys.forEach(key => {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.warn(`[Stage3 정리 실패] ${key}`, error);
            }
        });
    }

    function clearEmergencyStage3WorkStorage() {
        const removeKeys = [
            STORAGE_KEYS.stage3Seats,
            STORAGE_KEYS.stage3Layouts,
            STORAGE_KEYS.sections
        ];

        removeKeys.forEach(key => {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.warn(`[Stage3 긴급 정리 실패] ${key}`, error);
            }
        });
    }

    function createGeneratedOverviewImage() {
        try {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = Math.max(1, Math.round(state.width));
            canvas.height = Math.max(1, Math.round(state.height));

            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

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
                ctx.fillStyle = hexToRgba(section.renderColor || COLORS.sectionFallback, 0.16);
                ctx.strokeStyle = "rgba(15,23,42,.18)";
                ctx.lineWidth = 1.5;
                ctx.fill("evenodd");
                ctx.stroke();
                ctx.restore();
            });

            drawStageOnMap(ctx, 1);

            state.sections.forEach(section => {
                getSeats(section).forEach(seat => {
                    if (seat.status === STATUS.REMOVED) return;

                    ctx.save();
                    ctx.translate(seat.x, seat.y);
                    ctx.rotate(toRad(seat.angle || 0));
                    roundRect(ctx, -seat.w / 2, -seat.h / 2, seat.w, seat.h, Math.max(1, Math.min(seat.w, seat.h) * 0.12));
                    ctx.fillStyle = seat.status === STATUS.OBSTRUCTED ? COLORS.obstructed : (section.renderColor || seat.color || COLORS.seat);
                    ctx.strokeStyle = "#ffffff";
                    ctx.lineWidth = 1;
                    ctx.fill();
                    ctx.stroke();
                    ctx.restore();
                });
            });

            return canvas.toDataURL("image/png");
        } catch (error) {
            console.warn("[Stage3] generated overview image failed", error);
            return "";
        }
    }

    function createFinalSeatJson() {
        const finalSeats = [];

        state.sections.forEach(section => {
            getSeats(section).forEach(seat => {
                if (seat.status === STATUS.REMOVED) {
                    return;
                }

                finalSeats.push({
                    id: makeFinalSeatId(section, seat)
                });
            });
        });

        return finalSeats;
    }

    function makeFinalSeatId(section, seat) {
        return [
            floorCode(section),
            sectionCode(section),
            seat.row,
            seat.col,
            seatCoordinate(seat.x),
            seatCoordinate(seat.y),
            seatAngle(seat, section)
        ].join("---");
    }

    function seatCoordinate(value) {
        return String(Math.round(Number(value) || 0));
    }

    function seatAngle(seat, section) {
        const layout = getLayout(section);
        return normalizeAngle(seat.angle ?? layout.angle ?? 0);
    }

    function goStage4(event) {
        event?.preventDefault?.();
        event?.stopPropagation?.();

        if (!state.sections.length) {
            toast("Stage2에서 구역을 먼저 생성하세요.");
            return;
        }

        if (!hasGeneratedSeats()) {
            toast("좌석을 먼저 생성한 뒤 결과 확인으로 이동하세요.");
            return;
        }

        if (!saveWorkData(true)) {
            toast("최종 좌석 JSON 저장 실패입니다. 브라우저 저장공간을 비우고 다시 시도하세요.");
            return;
        }

        const url = dom.app?.dataset.stage4Url || "/admin/seatmap/stage/6";
        window.location.href = url;
    }

    function hasGeneratedSeats() {
        return state.sections.some(section => getSeats(section).length > 0);
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

    function getRotatedSeatShape(section, angle) {
        const shape = getSeatShape(section);
        const pivot = getSectionPivot(section);
        return rotatePolygon(shape, pivot, angle || 0);
    }

    function getSectionPivot(section) {
        const bbox = bboxOf(getSeatShape(section));
        return {
            x: bbox.x + bbox.w / 2,
            y: bbox.y + bbox.h / 2
        };
    }

    function getMapPaths(section) {
        if (section.buttonShape?.paths?.length) {
            return section.buttonShape.paths;
        }

        if (section.buttonPolygon?.length) {
            return [section.buttonPolygon];
        }

        if (section.polygon?.length) {
            return [section.polygon];
        }

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
        const simplified = simplifyPolygon(source, Math.max(6, Math.min(bbox.w, bbox.h) * 0.045));
        const snapped = snapStrongAxis(simplified, Math.max(6, Math.min(bbox.w, bbox.h) * 0.06));
        const reduced = removeTinySteps(snapped, Math.max(5, Math.min(bbox.w, bbox.h) * 0.035));
        const finalPoly = reduced.length >= 3 ? reduced : rectFromBBox(bbox);

        return finalPoly.map(point => ({
            x: round(point.x),
            y: round(point.y)
        }));
    }

    function snapStrongAxis(poly, tolerance) {
        if (!poly || poly.length < 3) return poly || [];

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

    function removeTinySteps(poly, minLen) {
        if (!poly || poly.length < 3) return poly || [];

        const filtered = [];

        for (let i = 0; i < poly.length; i += 1) {
            const prev = poly[(i - 1 + poly.length) % poly.length];
            const curr = poly[i];

            if (distance(prev, curr) >= minLen || filtered.length < 3) {
                filtered.push(curr);
            }
        }

        return filtered.length >= 3 ? filtered : poly;
    }

    function rectFromBBox(bbox) {
        return [
            { x: bbox.x, y: bbox.y },
            { x: bbox.x + bbox.w, y: bbox.y },
            { x: bbox.x + bbox.w, y: bbox.y + bbox.h },
            { x: bbox.x, y: bbox.y + bbox.h }
        ];
    }

    function findSectionAt(point) {
        return state.sections.slice().reverse().find(section => {
            const paths = getMapPaths(section);
            return paths.some(path => pointInPoly(point, path));
        }) || null;
    }

    function pointerInCanvas(event, canvas) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    function screenToWorld(event, canvas, transform) {
        const rect = canvas.getBoundingClientRect();

        return {
            x: (event.clientX - rect.left - transform.x) / transform.scale,
            y: (event.clientY - rect.top - transform.y) / transform.scale
        };
    }

    function worldToScreen(point, transform) {
        return {
            x: point.x * transform.scale + transform.x,
            y: point.y * transform.scale + transform.y
        };
    }

    function editorWorldToScreen(point) {
        return worldToScreen(point, state.editorTransform);
    }

    function editorScreenToWorld(point) {
        return {
            x: (point.x - state.editorTransform.x) / state.editorTransform.scale,
            y: (point.y - state.editorTransform.y) / state.editorTransform.scale
        };
    }

    function rectFromPoints(a, b) {
        const x = Math.min(a.x, b.x);
        const y = Math.min(a.y, b.y);

        return {
            x,
            y,
            w: Math.abs(a.x - b.x),
            h: Math.abs(a.y - b.y)
        };
    }

    function drawPoly(ctx, poly) {
        poly.forEach((point, index) => {
            if (index === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
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
        if (!poly || !poly.length) {
            return { x: 0, y: 0, w: 1, h: 1 };
        }

        const xs = poly.map(point => point.x);
        const ys = poly.map(point => point.y);

        return {
            x: Math.min(...xs),
            y: Math.min(...ys),
            w: Math.max(...xs) - Math.min(...xs),
            h: Math.max(...ys) - Math.min(...ys)
        };
    }

    function pointInPoly(point, poly) {
        let inside = false;

        for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
            const a = poly[i];
            const b = poly[j];
            const intersect = (a.y > point.y) !== (b.y > point.y) &&
                point.x < ((b.x - a.x) * (point.y - a.y)) / ((b.y - a.y) || 1) + a.x;

            if (intersect) {
                inside = !inside;
            }
        }

        return inside;
    }

    function distanceToPolygon(point, poly) {
        if (!poly || poly.length < 2) {
            return Number.MAX_SAFE_INTEGER;
        }

        let min = Number.MAX_SAFE_INTEGER;

        for (let i = 0; i < poly.length; i += 1) {
            const a = poly[i];
            const b = poly[(i + 1) % poly.length];
            min = Math.min(min, distancePointToSegment(point, a, b));
        }

        return min;
    }

    function distancePointToSegment(p, a, b) {
        const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
        if (l2 === 0) return distance(p, a);

        let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
        t = Math.max(0, Math.min(1, t));

        const proj = {
            x: a.x + t * (b.x - a.x),
            y: a.y + t * (b.y - a.y)
        };

        return distance(p, proj);
    }

    function convexHull(points) {
        const sorted = points
            .map(point => ({ x: point.x, y: point.y }))
            .sort((a, b) => a.x - b.x || a.y - b.y);

        const unique = [];

        sorted.forEach(point => {
            const last = unique[unique.length - 1];
            if (!last || last.x !== point.x || last.y !== point.y) {
                unique.push(point);
            }
        });

        if (unique.length <= 2) {
            return unique;
        }

        const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
        const lower = [];

        unique.forEach(point => {
            while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
                lower.pop();
            }
            lower.push(point);
        });

        const upper = [];

        unique.slice().reverse().forEach(point => {
            while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
                upper.pop();
            }
            upper.push(point);
        });

        return lower.slice(0, -1).concat(upper.slice(0, -1));
    }

    function simplifyPolygon(points, epsilon) {
        if (!points || points.length <= 3) {
            return points || [];
        }

        const closed = points.concat([points[0]]);
        return rdp(closed, epsilon).slice(0, -1);
    }

    function rdp(points, epsilon) {
        if (points.length <= 2) {
            return points.slice();
        }

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

    function rotatePolygon(points, pivot, angle) {
        return points.map(point => rotatePoint(point, pivot, angle));
    }

    function rotatePoint(point, pivot, angle) {
        const rad = toRad(angle || 0);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const dx = point.x - pivot.x;
        const dy = point.y - pivot.y;

        return {
            x: pivot.x + dx * cos - dy * sin,
            y: pivot.y + dx * sin + dy * cos
        };
    }

    function inverseRotatePoint(point, pivot, angle) {
        return rotatePoint(point, pivot, -(angle || 0));
    }

    function pointOnLine(from, to, distanceValue) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.hypot(dx, dy) || 1;

        return {
            x: from.x + (dx / len) * distanceValue,
            y: from.y + (dy / len) * distanceValue
        };
    }

    function distance(a, b) {
        return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0));
    }

    function toRad(deg) {
        return deg * Math.PI / 180;
    }

    function round(value) {
        return Math.round(value * 100) / 100;
    }

    function normalizeAngle(value) {
        const angle = Number(value);

        if (!Number.isFinite(angle)) {
            return 0;
        }

        return Math.round(angle * 100) / 100;
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
        return String(section.label || section.name || section.id)
            .replace(/^구역\s*/, "")
            .replace(/\s+/g, "");
    }

    function hexToRgba(hex, alpha) {
        const cleaned = String(hex || "#8b5cf6").replace("#", "");

        if (cleaned.length !== 6) {
            return `rgba(139,92,246,${alpha})`;
        }

        const r = parseInt(cleaned.slice(0, 2), 16);
        const g = parseInt(cleaned.slice(2, 4), 16);
        const b = parseInt(cleaned.slice(4, 6), 16);

        return `rgba(${r},${g},${b},${alpha})`;
    }
})();