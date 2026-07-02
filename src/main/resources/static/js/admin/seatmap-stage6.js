(() => {
    "use strict";

    const SAVE_URL = "/admin/seatmap/temp-save";

    const STORAGE = {
        projectId: "seatmap_current_project_id",
        folderName: "seatmap_current_folder_name",
        stage5ImageUrl: "seatmap_stage5_image_url",
        finalImageUrl: "seatmap_final_image_url",
        styleJsonUrl: "seatmap_style_json_url",
        style: "seatmap_stage6_style",
        bookingButtons: "seatmap_stage5_booking_buttons",
        bookingButtonsCompat: "concert_booking_buttons",
        generatedOverviewImage: "concert_generated_overviewImage"
    };

    const DEFAULT_LAYER_STYLE = {
        fill: "#f8fafc",
        stroke: "#334155",
        textColor: "#111827",
        fontSize: 24,
        lineWidth: 3,
        shadow: false,
        opacity: 1
    };

    const dom = {};
    const state = {
        projectId: "seat",
        projectPath: "",
        saveUrl: SAVE_URL,
        sourceCandidates: [],
        sourceImageUrl: "",
        fallbackImageUrl: "",
        styleUrl: "",
        bookingButtonsUrl: "",
        decorationsUrl: "",
        debugImageUrl: "",

        activeTool: "select",
        image: null,
        width: 1200,
        height: 760,
        zoom: 1,
        selectedId: "",
        clipboardLayer: null,
        pasteOffset: 0,
        drag: null,

        background: {
            type: "none",
            color: "#ffffff",
            color2: "#f1f5f9"
        },
        effects: {
            border: false,
            borderColor: "#d1d5db",
            borderWidth: 2,
            softShadow: false
        },
        layers: [],
        bookingButtons: [],
        decorations: null,
        showBookingDebug: false,
        showDebugImage: false,
        history: [],
        redoStack: []
    };

    document.addEventListener("DOMContentLoaded", init);

    async function init() {
        cacheDom();
        readRouteState();
        registerPublicAdapter();
        bindEvents();
        await Promise.all([loadBookingButtons(), loadDecorationData(), loadSavedStyle()]);
        await loadBaseImage();
        syncControls();
        redraw();
        fitCanvasView();
    }

    function registerPublicAdapter() {
        window.SeatmapStage6Decorate = {
            save: saveStage6ToServer,
            exportImage,
            getStyle: buildStyleJson,
            copy: copySelectedLayer,
            paste: pasteCopiedLayer,
            redrawAll: redraw
        };
    }

    function cacheDom() {
        [
            "stage6App", "canvas", "stage6CanvasBoard", "stage6CanvasViewport", "stage6CanvasInfo",
            "stage6ToolGrid", "selectedObjectInfo", "layerList", "stage6MiniMap", "toast",
            "addStageLabel", "addEntranceLabel", "addGuideBox", "importButtonLabels", "clearDecorations",
            "backgroundType", "backgroundColor", "backgroundColor2", "applyBackground", "toggleCanvasBorder", "toggleSoftShadow",
            "showBookingDebug", "showDebugImage", "alignLeft", "alignRight", "alignTop", "alignBottom", "alignCenterX", "alignCenterY",
            "clearSelection", "deleteSelectedLayer", "fitCanvasView", "fitCanvasViewInline", "resetCanvasView",
            "undoAction", "redoAction", "zoomIn", "zoomOut", "zoomFit", "zoomReset", "zoomValue", "resetView"
        ].forEach((id) => {
            dom[id] = document.getElementById(id);
        });

        dom.ctx = dom.canvas?.getContext("2d", { willReadFrequently: true }) || null;
        dom.miniCtx = dom.stage6MiniMap?.getContext("2d", { willReadFrequently: true }) || null;
    }

    function readRouteState() {
        const root = dom.stage6App;
        const params = new URLSearchParams(location.search);
        state.projectId = sanitizeProjectId(
            params.get("projectId")
            || root?.dataset.projectId
            || localStorage.getItem(STORAGE.folderName)
            || localStorage.getItem(STORAGE.projectId)
            || "seat"
        );
        state.projectPath = root?.dataset.projectPath || `/temp/seatmap/${encodeURIComponent(state.projectId)}`;
        state.saveUrl = root?.dataset.saveUrl || SAVE_URL;
        state.sourceImageUrl = root?.dataset.stage5ImageUrl || projectFileUrl("seatmap-stage5.png");
        state.fallbackImageUrl = root?.dataset.seatmapImageUrl || projectFileUrl("seatmap-image.png");
        state.styleUrl = root?.dataset.styleUrl || projectFileUrl("seatmap-style.json");
        state.bookingButtonsUrl = root?.dataset.bookingButtonsUrl || projectFileUrl("booking-buttons.json");
        state.decorationsUrl = root?.dataset.decorationsUrl || projectFileUrl("seatmap-decorations.json");
        state.debugImageUrl = root?.dataset.debugImageUrl || projectFileUrl("debug-polygons.png");
        state.sourceCandidates = uniqueTextList([
            state.sourceImageUrl,
            state.fallbackImageUrl,
            projectFileUrl("seatmap-image.png"),
            localStorage.getItem(STORAGE.stage5ImageUrl)
        ]);

        localStorage.setItem(STORAGE.projectId, state.projectId);
        localStorage.setItem(STORAGE.folderName, state.projectId);
    }

    function bindEvents() {
        dom.stage6ToolGrid?.addEventListener("click", (event) => {
            const button = event.target.closest("[data-tool]");
            if (!button) return;
            setTool(button.dataset.tool || "select");
        });

        dom.canvas?.addEventListener("pointerdown", handlePointerDown);
        dom.canvas?.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        dom.canvas?.addEventListener("dblclick", handleDoubleClick);

        bind(dom.addStageLabel, "click", () => addPreset("stage"));
        bind(dom.addEntranceLabel, "click", () => addPreset("entrance"));
        bind(dom.addGuideBox, "click", () => addPreset("guide"));
        bind(dom.importButtonLabels, "click", importButtonLabels);
        bind(dom.clearDecorations, "click", clearDecorations);
        bind(dom.applyBackground, "click", applyBackgroundControls);
        bind(dom.toggleCanvasBorder, "change", applyBackgroundControls);
        bind(dom.toggleSoftShadow, "change", applyBackgroundControls);
        bind(dom.showBookingDebug, "change", () => {
            state.showBookingDebug = Boolean(dom.showBookingDebug.checked);
            redraw();
        });
        bind(dom.showDebugImage, "change", () => {
            state.showDebugImage = Boolean(dom.showDebugImage.checked);
            redraw();
        });

        bind(dom.alignLeft, "click", () => alignSelected("left"));
        bind(dom.alignRight, "click", () => alignSelected("right"));
        bind(dom.alignTop, "click", () => alignSelected("top"));
        bind(dom.alignBottom, "click", () => alignSelected("bottom"));
        bind(dom.alignCenterX, "click", () => alignSelected("centerX"));
        bind(dom.alignCenterY, "click", () => alignSelected("centerY"));
        bind(dom.clearSelection, "click", () => selectLayer(""));
        bind(dom.deleteSelectedLayer, "click", deleteSelectedLayer);

        bind(dom.fitCanvasView, "click", fitCanvasView);
        bind(dom.fitCanvasViewInline, "click", fitCanvasView);
        bind(dom.resetCanvasView, "click", () => setCanvasScale(1));
        bind(dom.undoAction, "click", undo);
        bind(dom.redoAction, "click", redo);
        bind(dom.zoomIn, "click", () => setCanvasScale(state.zoom + 0.1));
        bind(dom.zoomOut, "click", () => setCanvasScale(state.zoom - 0.1));
        bind(dom.zoomFit, "click", fitCanvasView);
        bind(dom.zoomReset, "click", () => setCanvasScale(1));
        bind(dom.resetView, "click", resetView);

        window.addEventListener("keydown", handleKeyDown);
    }

    function bind(element, eventName, handler) {
        if (!element) return;
        element.addEventListener(eventName, (event) => {
            event.preventDefault?.();
            handler(event);
        });
    }

    async function loadBaseImage() {
        const loaded = await loadFirstImage(state.sourceCandidates);
        if (!loaded) {
            setupCanvas(1200, 760);
            updateInfo("seatmap-stage5.png / seatmap-image.png를 찾지 못해 빈 캔버스를 열었습니다.");
            return;
        }

        state.image = loaded.image;
        state.sourceImageUrl = loaded.url;
        setupCanvas(loaded.image.naturalWidth || loaded.image.width, loaded.image.naturalHeight || loaded.image.height);
        updateInfo(`${state.width} × ${state.height} / 기준 이미지: ${fileNameFromUrl(loaded.url)}`);
    }

    function loadFirstImage(urls) {
        const candidates = uniqueTextList(urls);
        let index = 0;

        return new Promise((resolve) => {
            const next = () => {
                if (index >= candidates.length) {
                    resolve(null);
                    return;
                }

                const url = candidates[index];
                index += 1;

                const image = new Image();
                image.onload = () => resolve({ image, url });
                image.onerror = next;
                image.src = withCacheBust(url);
            };

            next();
        });
    }

    async function loadSavedStyle() {
        const stored = readJsonFromStorage(STORAGE.style, null);
        if (stored) {
            applyStyleState(stored);
            return;
        }

        try {
            const response = await fetch(withCacheBust(state.styleUrl), { credentials: "same-origin" });
            if (!response.ok) return;
            const style = await response.json();
            applyStyleState(style);
        } catch (error) {
            // seatmap-style.json은 최초 진입 시 없을 수 있다.
        }
    }

    async function loadBookingButtons() {
        const stored = readJsonFromStorage(STORAGE.bookingButtons, null)
            || readJsonFromStorage(STORAGE.bookingButtonsCompat, null);
        if (Array.isArray(stored) && stored.length) {
            state.bookingButtons = stored;
            return;
        }

        try {
            const response = await fetch(withCacheBust(state.bookingButtonsUrl), { credentials: "same-origin" });
            if (!response.ok) return;
            const json = await response.json();
            state.bookingButtons = normalizeArray(json);
        } catch (error) {
            state.bookingButtons = [];
        }
    }

    async function loadDecorationData() {
        try {
            const response = await fetch(withCacheBust(state.decorationsUrl), { credentials: "same-origin" });
            if (!response.ok) return;
            state.decorations = await response.json();
        } catch (error) {
            state.decorations = null;
        }
    }

    function setupCanvas(width, height) {
        state.width = Math.max(400, Math.round(Number(width) || 1200));
        state.height = Math.max(300, Math.round(Number(height) || 760));
        if (!dom.canvas) return;
        dom.canvas.width = state.width;
        dom.canvas.height = state.height;
        dom.canvas.style.width = `${state.width}px`;
        dom.canvas.style.height = `${state.height}px`;
        if (dom.stage6CanvasBoard) {
            dom.stage6CanvasBoard.style.width = `${state.width}px`;
            dom.stage6CanvasBoard.style.height = `${state.height}px`;
        }
    }

    function redraw(options = {}) {
        if (!dom.ctx || !dom.canvas) return;
        const exportMode = options.exportMode === true;
        dom.ctx.clearRect(0, 0, state.width, state.height);
        drawBackground();
        drawBaseImage();
        state.layers.forEach(drawLayer);
        drawCanvasBorder();

        if (!exportMode) {
            if (state.showBookingDebug) drawBookingDebug();
            if (state.showDebugImage) drawDebugImageNotice();
            drawSelection();
        }

        drawMiniMap();
        renderLayers();
        renderSelectedInfo();
    }

    function drawBackground() {
        dom.ctx.save();
        if (state.background.type === "gradient") {
            const gradient = dom.ctx.createLinearGradient(0, 0, state.width, state.height);
            gradient.addColorStop(0, safeColor(state.background.color, "#ffffff"));
            gradient.addColorStop(1, safeColor(state.background.color2, "#f1f5f9"));
            dom.ctx.fillStyle = gradient;
        } else if (state.background.type === "solid") {
            dom.ctx.fillStyle = safeColor(state.background.color, "#ffffff");
        } else {
            dom.ctx.fillStyle = "#ffffff";
        }
        dom.ctx.fillRect(0, 0, state.width, state.height);
        dom.ctx.restore();
    }

    function drawBaseImage() {
        if (!state.image) return;
        dom.ctx.save();
        if (state.effects.softShadow) {
            dom.ctx.shadowColor = "rgba(15, 23, 42, 0.16)";
            dom.ctx.shadowBlur = 16;
            dom.ctx.shadowOffsetY = 8;
        }
        dom.ctx.drawImage(state.image, 0, 0, state.width, state.height);
        dom.ctx.restore();
    }

    function drawCanvasBorder() {
        if (!state.effects.border) return;
        dom.ctx.save();
        dom.ctx.strokeStyle = safeColor(state.effects.borderColor, "#d1d5db");
        dom.ctx.lineWidth = Math.max(1, Number(state.effects.borderWidth) || 2);
        const half = dom.ctx.lineWidth / 2;
        dom.ctx.strokeRect(half, half, state.width - dom.ctx.lineWidth, state.height - dom.ctx.lineWidth);
        dom.ctx.restore();
    }

    function drawLayer(layer) {
        const opacity = clamp(Number(layer.opacity ?? 1), 0.05, 1);
        dom.ctx.save();
        dom.ctx.globalAlpha = opacity;
        dom.ctx.lineWidth = Math.max(1, Number(layer.lineWidth || 1));
        dom.ctx.strokeStyle = safeColor(layer.stroke, DEFAULT_LAYER_STYLE.stroke);
        dom.ctx.fillStyle = safeColor(layer.fill, DEFAULT_LAYER_STYLE.fill);

        if (layer.shadow) {
            dom.ctx.shadowColor = "rgba(15, 23, 42, 0.18)";
            dom.ctx.shadowBlur = 14;
            dom.ctx.shadowOffsetY = 6;
        }

        if (layer.type === "text") {
            drawText(layer);
        } else if (layer.type === "rect" || layer.type === "stage" || layer.type === "guide") {
            drawRect(layer);
        } else if (layer.type === "ellipse") {
            drawEllipse(layer);
        } else if (layer.type === "line" || layer.type === "arrow") {
            drawLine(layer);
        }

        dom.ctx.restore();
    }

    function drawText(layer) {
        dom.ctx.save();
        dom.ctx.font = `${layer.bold === false ? 700 : 900} ${Math.max(8, Number(layer.fontSize || 24))}px Pretendard, Arial, sans-serif`;
        dom.ctx.textAlign = "center";
        dom.ctx.textBaseline = "middle";
        dom.ctx.lineWidth = Math.max(2, Math.round((Number(layer.fontSize || 24)) / 6));
        dom.ctx.strokeStyle = layer.textStroke || "rgba(255, 255, 255, 0.88)";
        dom.ctx.strokeText(layer.text || "텍스트", layer.x, layer.y);
        dom.ctx.fillStyle = safeColor(layer.textColor, DEFAULT_LAYER_STYLE.textColor);
        dom.ctx.fillText(layer.text || "텍스트", layer.x, layer.y);
        dom.ctx.restore();
    }

    function drawRect(layer) {
        const box = layerBox(layer);
        const radius = Math.min(Number(layer.radius || 12), Math.abs(box.w) / 2, Math.abs(box.h) / 2);
        roundedRect(dom.ctx, box.x, box.y, box.w, box.h, radius);
        if (layer.fill !== "transparent") dom.ctx.fill();
        if (Number(layer.lineWidth || 0) > 0) dom.ctx.stroke();
        if (layer.text) drawInnerText(layer, layer.x, layer.y);
    }

    function drawEllipse(layer) {
        const box = layerBox(layer);
        dom.ctx.beginPath();
        dom.ctx.ellipse(layer.x, layer.y, Math.abs(box.w) / 2, Math.abs(box.h) / 2, 0, 0, Math.PI * 2);
        if (layer.fill !== "transparent") dom.ctx.fill();
        if (Number(layer.lineWidth || 0) > 0) dom.ctx.stroke();
        if (layer.text) drawInnerText(layer, layer.x, layer.y);
    }

    function drawLine(layer) {
        const x1 = layer.x - layer.w / 2;
        const y1 = layer.y - layer.h / 2;
        const x2 = layer.x + layer.w / 2;
        const y2 = layer.y + layer.h / 2;
        dom.ctx.beginPath();
        dom.ctx.moveTo(x1, y1);
        dom.ctx.lineTo(x2, y2);
        dom.ctx.stroke();

        if (layer.type === "arrow") {
            const angle = Math.atan2(y2 - y1, x2 - x1);
            const size = Math.max(10, Number(layer.lineWidth || 3) * 4);
            dom.ctx.beginPath();
            dom.ctx.moveTo(x2, y2);
            dom.ctx.lineTo(x2 - size * Math.cos(angle - Math.PI / 6), y2 - size * Math.sin(angle - Math.PI / 6));
            dom.ctx.lineTo(x2 - size * Math.cos(angle + Math.PI / 6), y2 - size * Math.sin(angle + Math.PI / 6));
            dom.ctx.closePath();
            dom.ctx.fillStyle = safeColor(layer.stroke, DEFAULT_LAYER_STYLE.stroke);
            dom.ctx.fill();
        }
    }

    function drawInnerText(layer, x, y) {
        dom.ctx.save();
        dom.ctx.shadowColor = "transparent";
        dom.ctx.font = `900 ${Math.max(8, Number(layer.fontSize || 22))}px Pretendard, Arial, sans-serif`;
        dom.ctx.textAlign = "center";
        dom.ctx.textBaseline = "middle";
        dom.ctx.fillStyle = safeColor(layer.textColor, DEFAULT_LAYER_STYLE.textColor);
        dom.ctx.fillText(layer.text, x, y);
        dom.ctx.restore();
    }

    function drawBookingDebug() {
        state.bookingButtons.forEach((button) => {
            getButtonPolygons(button).forEach((polygon) => {
                if (polygon.length < 3) return;
                dom.ctx.save();
                dom.ctx.beginPath();
                polygon.forEach((point, index) => {
                    if (index === 0) dom.ctx.moveTo(point.x, point.y);
                    else dom.ctx.lineTo(point.x, point.y);
                });
                dom.ctx.closePath();
                dom.ctx.setLineDash([7, 5]);
                dom.ctx.lineWidth = 2;
                dom.ctx.strokeStyle = "#ef4444";
                dom.ctx.stroke();
                dom.ctx.restore();
            });
        });
    }

    function drawDebugImageNotice() {
        dom.ctx.save();
        dom.ctx.fillStyle = "rgba(239, 68, 68, 0.10)";
        dom.ctx.fillRect(0, 0, state.width, state.height);
        dom.ctx.fillStyle = "#991b1b";
        dom.ctx.font = "900 18px Pretendard, Arial, sans-serif";
        dom.ctx.textAlign = "left";
        dom.ctx.fillText("DEBUG 확인 모드: 최종 저장 이미지에는 표시되지 않습니다.", 20, 30);
        dom.ctx.restore();
    }

    function drawSelection() {
        const layer = getSelectedLayer();
        if (!layer) return;
        const box = layerBox(layer);
        dom.ctx.save();
        dom.ctx.setLineDash([7, 5]);
        dom.ctx.strokeStyle = "#7c3aed";
        dom.ctx.lineWidth = 2;
        dom.ctx.strokeRect(box.x, box.y, box.w, box.h);
        dom.ctx.setLineDash([]);
        dom.ctx.fillStyle = "#7c3aed";
        [[box.x, box.y], [box.x + box.w, box.y], [box.x, box.y + box.h], [box.x + box.w, box.y + box.h]].forEach(([x, y]) => {
            dom.ctx.fillRect(x - 4, y - 4, 8, 8);
        });
        dom.ctx.restore();
    }

    function handlePointerDown(event) {
        if (!dom.canvas) return;
        const point = canvasPoint(event);
        const tool = state.activeTool;

        if (["text", "rect", "ellipse", "line", "arrow"].includes(tool)) {
            pushHistory();
            const layer = createLayer(tool, point.x, point.y);
            state.layers.push(layer);
            selectLayer(layer.id);
            setTool("select");
            persistStyle();
            redraw();
            return;
        }

        if (tool === "erase") {
            const hit = hitTestLayer(point.x, point.y);
            if (hit) {
                pushHistory();
                state.layers = state.layers.filter((layer) => layer.id !== hit.id);
                selectLayer("");
                persistStyle();
                redraw();
            }
            return;
        }

        const hit = hitTestLayer(point.x, point.y);
        selectLayer(hit?.id || "");
        if (hit) {
            state.drag = {
                id: hit.id,
                startX: point.x,
                startY: point.y,
                originX: hit.x,
                originY: hit.y,
                pushed: false
            };
        }
        redraw();
    }

    function handlePointerMove(event) {
        if (!state.drag) return;
        const layer = getLayerById(state.drag.id);
        if (!layer) return;
        const point = canvasPoint(event);
        const dx = point.x - state.drag.startX;
        const dy = point.y - state.drag.startY;
        if (!state.drag.pushed && Math.hypot(dx, dy) > 2) {
            pushHistory();
            state.drag.pushed = true;
        }
        layer.x = clamp(state.drag.originX + dx, 0, state.width);
        layer.y = clamp(state.drag.originY + dy, 0, state.height);
        redraw();
    }

    function handlePointerUp() {
        if (state.drag?.pushed) {
            persistStyle();
        }
        state.drag = null;
    }

    function handleDoubleClick() {
        const layer = getSelectedLayer();
        if (!layer) return;
        if (!["text", "rect", "ellipse", "stage", "guide"].includes(layer.type)) return;
        const next = prompt("텍스트 입력", layer.text || "");
        if (next === null) return;
        pushHistory();
        layer.text = next;
        persistStyle();
        redraw();
    }

    function handleKeyDown(event) {
        const targetTag = event.target?.tagName || "";
        if (["INPUT", "TEXTAREA", "SELECT"].includes(targetTag)) return;

        const key = String(event.key || "").toLowerCase();
        const isShortcut = event.ctrlKey || event.metaKey;

        if (isShortcut && key === "z") {
            event.preventDefault();
            if (event.shiftKey) redo();
            else undo();
            return;
        }

        if (isShortcut && key === "y") {
            event.preventDefault();
            redo();
            return;
        }

        if (isShortcut && key === "c") {
            event.preventDefault();
            copySelectedLayer();
            return;
        }

        if (isShortcut && key === "x") {
            event.preventDefault();
            cutSelectedLayer();
            return;
        }

        if (isShortcut && key === "v") {
            event.preventDefault();
            pasteCopiedLayer();
            return;
        }

        if (isShortcut && key === "d") {
            event.preventDefault();
            duplicateSelectedLayer();
            return;
        }

        if (event.key === "Delete" || event.key === "Backspace") {
            event.preventDefault();
            deleteSelectedLayer();
            return;
        }

        const layer = getSelectedLayer();
        if (!layer || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault();
        pushHistory();
        const step = event.shiftKey ? 10 : 1;
        if (event.key === "ArrowLeft") layer.x = clamp(layer.x - step, 0, state.width);
        if (event.key === "ArrowRight") layer.x = clamp(layer.x + step, 0, state.width);
        if (event.key === "ArrowUp") layer.y = clamp(layer.y - step, 0, state.height);
        if (event.key === "ArrowDown") layer.y = clamp(layer.y + step, 0, state.height);
        persistStyle();
        redraw();
    }

    function createLayer(type, x, y) {
        const base = {
            id: `layer-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
            type,
            x: round(x),
            y: round(y),
            w: type === "line" || type === "arrow" ? 160 : type === "text" ? 160 : 180,
            h: type === "line" || type === "arrow" ? 0 : type === "text" ? 40 : 72,
            radius: 14,
            fill: DEFAULT_LAYER_STYLE.fill,
            stroke: DEFAULT_LAYER_STYLE.stroke,
            textColor: DEFAULT_LAYER_STYLE.textColor,
            fontSize: DEFAULT_LAYER_STYLE.fontSize,
            lineWidth: DEFAULT_LAYER_STYLE.lineWidth,
            shadow: false,
            opacity: 1,
            text: ""
        };

        if (type === "text") {
            base.text = "텍스트";
            base.fill = "transparent";
            base.stroke = "rgba(255,255,255,0.9)";
        } else if (type === "rect" || type === "ellipse") {
            base.fill = "#f8fafc";
            base.stroke = "#cbd5e1";
        } else if (type === "line" || type === "arrow") {
            base.fill = "transparent";
            base.stroke = "#334155";
            base.lineWidth = 4;
        }

        return base;
    }

    function addPreset(type) {
        pushHistory();
        const cx = state.width / 2;
        const layer = type === "stage"
            ? {
                ...createLayer("rect", cx, 64), type: "stage", w: 360, h: 58,
                fill: "#111827", stroke: "#111827", text: "STAGE", textColor: "#ffffff", shadow: true, fontSize: 24
            }
            : type === "entrance"
                ? {
                    ...createLayer("text", cx, state.height - 48), text: "입구", fontSize: 26,
                    textColor: "#111827", stroke: "rgba(255,255,255,0.9)"
                }
                : {
                    ...createLayer("rect", cx, 120), type: "guide", w: 300, h: 74,
                    fill: "#ffffff", stroke: "#cbd5e1", text: "안내 문구", textColor: "#334155", shadow: true
                };
        state.layers.push(layer);
        selectLayer(layer.id);
        persistStyle();
        redraw();
    }

    function importButtonLabels() {
        if (!state.bookingButtons.length) {
            toast("booking-buttons.json에 불러올 버튼명이 없습니다.");
            return;
        }
        pushHistory();
        let added = 0;
        state.bookingButtons.forEach((button) => {
            const id = String(button.id || button.sectionId || button.name || button.label || "");
            if (!id || state.layers.some((layer) => layer.metaButtonId === id)) return;
            const point = button.labelPoint || button.button || button;
            const x = numberOr(point.x, point.centerX, 0);
            const y = numberOr(point.y, point.centerY, 0);
            if (!Number.isFinite(x) || !Number.isFinite(y)) return;
            const layer = createLayer("text", x, y);
            layer.text = String(button.label || button.name || button.sectionName || button.section || id);
            layer.fontSize = Math.max(12, Math.min(24, Number(button.fontSize || 18)));
            layer.textColor = safeColor(button.textColor, "#111827");
            layer.stroke = "rgba(255,255,255,0.92)";
            layer.metaButtonId = id;
            state.layers.push(layer);
            added += 1;
        });
        persistStyle();
        redraw();
        toast(`버튼명 텍스트 ${added}개를 레이어로 추가했습니다.`);
    }

    function clearDecorations() {
        if (!confirm("Stage 6 꾸미기 레이어만 초기화할까요? booking-buttons.json은 변경되지 않습니다.")) return;
        pushHistory();
        state.layers = [];
        state.background = { type: "none", color: "#ffffff", color2: "#f1f5f9" };
        state.effects = { border: false, borderColor: "#d1d5db", borderWidth: 2, softShadow: false };
        selectLayer("");
        persistStyle();
        syncControls();
        redraw();
        toast("Stage 6 꾸미기 레이어를 초기화했습니다.");
    }

    function applyBackgroundControls() {
        pushHistory();
        state.background.type = dom.backgroundType?.value || "none";
        state.background.color = dom.backgroundColor?.value || "#ffffff";
        state.background.color2 = dom.backgroundColor2?.value || "#f1f5f9";
        state.effects.border = Boolean(dom.toggleCanvasBorder?.checked);
        state.effects.softShadow = Boolean(dom.toggleSoftShadow?.checked);
        persistStyle();
        redraw();
    }

    function alignSelected(mode) {
        const layer = getSelectedLayer();
        if (!layer) {
            toast("정렬할 레이어를 선택하세요.");
            return;
        }
        pushHistory();
        const box = layerBox(layer);
        if (mode === "left") layer.x += -box.x;
        if (mode === "right") layer.x += state.width - (box.x + box.w);
        if (mode === "top") layer.y += -box.y;
        if (mode === "bottom") layer.y += state.height - (box.y + box.h);
        if (mode === "centerX") layer.x += (state.width / 2) - (box.x + box.w / 2);
        if (mode === "centerY") layer.y += (state.height / 2) - (box.y + box.h / 2);
        layer.x = round(clamp(layer.x, 0, state.width));
        layer.y = round(clamp(layer.y, 0, state.height));
        persistStyle();
        redraw();
    }

    function copySelectedLayer() {
        const layer = getSelectedLayer();
        if (!layer) {
            toast("복사할 레이어를 선택하세요.");
            return;
        }

        state.clipboardLayer = cloneLayerForClipboard(layer);
        state.pasteOffset = 0;
        toast("레이어를 복사했습니다. Ctrl+V로 붙여넣을 수 있습니다.");
    }

    function cutSelectedLayer() {
        const layer = getSelectedLayer();
        if (!layer) {
            toast("잘라낼 레이어를 선택하세요.");
            return;
        }

        state.clipboardLayer = cloneLayerForClipboard(layer);
        state.pasteOffset = 0;
        pushHistory();
        state.layers = state.layers.filter((item) => item.id !== layer.id);
        selectLayer("");
        persistStyle();
        redraw();
        toast("레이어를 잘라냈습니다. Ctrl+V로 붙여넣을 수 있습니다.");
    }

    function pasteCopiedLayer() {
        if (!state.clipboardLayer) {
            toast("붙여넣을 레이어가 없습니다.");
            return;
        }

        pushHistory();
        state.pasteOffset = Math.min(160, Number(state.pasteOffset || 0) + 18);
        const layer = cloneLayerForPaste(state.clipboardLayer, state.pasteOffset);
        state.layers.push(layer);
        selectLayer(layer.id);
        setTool("select");
        persistStyle();
        redraw();
        toast("레이어를 붙여넣었습니다.");
    }

    function duplicateSelectedLayer() {
        const layer = getSelectedLayer();
        if (!layer) {
            toast("복제할 레이어를 선택하세요.");
            return;
        }

        state.clipboardLayer = cloneLayerForClipboard(layer);
        state.pasteOffset = 0;
        pasteCopiedLayer();
    }

    function cloneLayerForClipboard(layer) {
        return JSON.parse(JSON.stringify(layer));
    }

    function cloneLayerForPaste(layer, offset) {
        const copy = JSON.parse(JSON.stringify(layer));
        copy.id = `layer-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
        copy.x = round(clamp(Number(copy.x || 0) + offset, 0, state.width));
        copy.y = round(clamp(Number(copy.y || 0) + offset, 0, state.height));
        if (copy.metaButtonId) {
            copy.metaButtonId = `${copy.metaButtonId}-copy-${Date.now()}`;
        }
        return copy;
    }

    function deleteSelectedLayer() {
        const layer = getSelectedLayer();
        if (!layer) return;
        pushHistory();
        state.layers = state.layers.filter((item) => item.id !== layer.id);
        selectLayer("");
        persistStyle();
        redraw();
    }

    function renderLayers() {
        if (!dom.layerList) return;
        if (!state.layers.length) {
            dom.layerList.innerHTML = `<div class="stage6-empty-layer">추가된 꾸미기 레이어가 없습니다.</div>`;
            return;
        }
        dom.layerList.innerHTML = state.layers.slice().reverse().map((layer, index) => `
            <button type="button" class="stage6-layer-item ${state.selectedId === layer.id ? "is-active" : ""}" data-layer-id="${escapeHtml(layer.id)}">
                <div>
                    <b>${escapeHtml(layer.text || getToolName(layer.type))}</b>
                    <span>${escapeHtml(getToolName(layer.type))} · ${Math.round(layer.x)}, ${Math.round(layer.y)} · #${state.layers.length - index}</span>
                </div>
                <span>${layer.shadow ? "그림자" : "레이어"}</span>
            </button>
        `).join("");
        dom.layerList.querySelectorAll("[data-layer-id]").forEach((button) => {
            button.addEventListener("click", () => {
                selectLayer(button.dataset.layerId || "");
                setTool("select");
                redraw();
            });
        });
    }

    function renderSelectedInfo() {
        if (!dom.selectedObjectInfo) return;
        const layer = getSelectedLayer();
        if (!layer) {
            dom.selectedObjectInfo.innerHTML = "선택된 레이어가 없습니다.";
            return;
        }

        dom.selectedObjectInfo.innerHTML = `
            <div class="stage6-properties">
                <strong>${escapeHtml(getToolName(layer.type))}</strong>
                <label><span>텍스트</span><textarea id="propLayerText">${escapeHtml(layer.text || "")}</textarea></label>
                <div class="stage6-properties-grid">
                    <label><span>X</span><input type="number" id="propLayerX" value="${round(layer.x)}"></label>
                    <label><span>Y</span><input type="number" id="propLayerY" value="${round(layer.y)}"></label>
                    <label><span>너비</span><input type="number" id="propLayerW" value="${round(layer.w)}"></label>
                    <label><span>높이</span><input type="number" id="propLayerH" value="${round(layer.h)}"></label>
                    <label><span>채우기</span><input type="color" id="propLayerFill" value="${safeColor(layer.fill, DEFAULT_LAYER_STYLE.fill)}"></label>
                    <label><span>선 색상</span><input type="color" id="propLayerStroke" value="${safeColor(layer.stroke, DEFAULT_LAYER_STYLE.stroke)}"></label>
                    <label><span>글자색</span><input type="color" id="propLayerTextColor" value="${safeColor(layer.textColor, DEFAULT_LAYER_STYLE.textColor)}"></label>
                    <label><span>글자 크기</span><input type="number" id="propLayerFontSize" min="8" max="96" value="${round(layer.fontSize || 24)}"></label>
                    <label><span>선 두께</span><input type="number" id="propLayerLineWidth" min="0" max="30" value="${round(layer.lineWidth || 1)}"></label>
                    <label><span>투명도</span><input type="number" id="propLayerOpacity" min="0.05" max="1" step="0.05" value="${Number(layer.opacity ?? 1)}"></label>
                </div>
                <label class="stage6-check-row"><input type="checkbox" id="propLayerShadow" ${layer.shadow ? "checked" : ""}><span>은은한 그림자</span></label>
                <div class="stage6-properties-actions">
                    <button type="button" id="applyLayerProps">적용</button>
                    <button type="button" id="copyLayerProps">복사</button>
                    <button type="button" id="pasteLayerProps">붙여넣기</button>
                    <button type="button" id="bringLayerForward">위로</button>
                    <button type="button" id="sendLayerBackward">아래로</button>
                    <button type="button" id="deleteLayerProps">삭제</button>
                </div>
            </div>
        `;

        bind(document.getElementById("applyLayerProps"), "click", () => applyLayerProperties(layer.id));
        bind(document.getElementById("copyLayerProps"), "click", copySelectedLayer);
        bind(document.getElementById("pasteLayerProps"), "click", pasteCopiedLayer);
        bind(document.getElementById("deleteLayerProps"), "click", deleteSelectedLayer);
        bind(document.getElementById("bringLayerForward"), "click", () => moveLayerOrder(layer.id, 1));
        bind(document.getElementById("sendLayerBackward"), "click", () => moveLayerOrder(layer.id, -1));
    }

    function applyLayerProperties(layerId) {
        const layer = getLayerById(layerId);
        if (!layer) return;
        pushHistory();
        layer.text = document.getElementById("propLayerText")?.value || "";
        layer.x = clamp(Number(document.getElementById("propLayerX")?.value || layer.x), 0, state.width);
        layer.y = clamp(Number(document.getElementById("propLayerY")?.value || layer.y), 0, state.height);
        layer.w = Math.max(0, Number(document.getElementById("propLayerW")?.value || layer.w));
        layer.h = Number(document.getElementById("propLayerH")?.value ?? layer.h);
        layer.fill = document.getElementById("propLayerFill")?.value || layer.fill;
        layer.stroke = document.getElementById("propLayerStroke")?.value || layer.stroke;
        layer.textColor = document.getElementById("propLayerTextColor")?.value || layer.textColor;
        layer.fontSize = Math.max(8, Number(document.getElementById("propLayerFontSize")?.value || layer.fontSize));
        layer.lineWidth = Math.max(0, Number(document.getElementById("propLayerLineWidth")?.value || layer.lineWidth));
        layer.opacity = clamp(Number(document.getElementById("propLayerOpacity")?.value || layer.opacity || 1), 0.05, 1);
        layer.shadow = Boolean(document.getElementById("propLayerShadow")?.checked);
        persistStyle();
        redraw();
    }

    function moveLayerOrder(layerId, direction) {
        const index = state.layers.findIndex((layer) => layer.id === layerId);
        if (index < 0) return;
        const target = clamp(index + direction, 0, state.layers.length - 1);
        if (target === index) return;
        pushHistory();
        const [layer] = state.layers.splice(index, 1);
        state.layers.splice(target, 0, layer);
        persistStyle();
        redraw();
    }

    function saveStage6ToServer() {
        const imageDataUrl = exportImage();
        if (!imageDataUrl) {
            toast("저장할 최종 이미지가 없습니다.");
            return Promise.resolve(null);
        }

        const payload = {
            page: "stage6",
            folderName: state.projectId,
            styleJsonText: JSON.stringify(buildStyleJson(), null, 2),
            imageDataUrl
        };

        return fetch(state.saveUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify(payload)
        }).then(async (response) => {
            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || "Stage 6 저장 실패");
            }
            return response.json();
        }).then((result) => {
            const finalUrl = `${state.projectPath}/seatmap-final.png`;
            const styleUrl = `${state.projectPath}/seatmap-style.json`;
            localStorage.setItem(STORAGE.finalImageUrl, finalUrl);
            localStorage.setItem(STORAGE.styleJsonUrl, styleUrl);
            localStorage.setItem(STORAGE.generatedOverviewImage, finalUrl);
            persistStyle();
            updateInfo(`${state.width} × ${state.height} / seatmap-final.png 저장 완료`);
            toast("seatmap-final.png / seatmap-style.json 저장 완료");
            return { ...result, finalImageUrl: finalUrl, styleJsonUrl: styleUrl };
        });
    }

    function exportImage() {
        if (!dom.canvas) return "";
        const selectedId = state.selectedId;
        const bookingDebug = state.showBookingDebug;
        const debugImage = state.showDebugImage;
        try {
            state.selectedId = "";
            state.showBookingDebug = false;
            state.showDebugImage = false;
            redraw({ exportMode: true });
            const dataUrl = dom.canvas.toDataURL("image/png");
            state.selectedId = selectedId;
            state.showBookingDebug = bookingDebug;
            state.showDebugImage = debugImage;
            redraw();
            return dataUrl;
        } catch (error) {
            state.selectedId = selectedId;
            state.showBookingDebug = bookingDebug;
            state.showDebugImage = debugImage;
            redraw();
            console.warn("[SeatTrace Stage6] export failed", error);
            return "";
        }
    }

    function buildStyleJson() {
        return {
            version: 1,
            stage: 6,
            projectId: state.projectId,
            sourceImage: "seatmap-stage5.png",
            fallbackImage: "seatmap-image.png",
            outputImage: "seatmap-final.png",
            bookingButtons: "booking-buttons.json",
            bookingButtonsReadOnly: true,
            background: { ...state.background },
            effects: { ...state.effects },
            canvas: {
                width: state.width,
                height: state.height
            },
            layers: state.layers.map((layer) => ({ ...layer }))
        };
    }

    function applyStyleState(style) {
        if (!style || typeof style !== "object") return;
        state.background = { ...state.background, ...(style.background || {}) };
        state.effects = { ...state.effects, ...(style.effects || {}) };
        state.layers = normalizeLayers(style.layers || style.objects || []);
    }

    function persistStyle() {
        localStorage.setItem(STORAGE.style, JSON.stringify(buildStyleJson()));
    }

    function pushHistory() {
        state.history.push(JSON.stringify({
            background: state.background,
            effects: state.effects,
            layers: state.layers,
            selectedId: state.selectedId
        }));
        if (state.history.length > 60) state.history.shift();
        state.redoStack = [];
    }

    function applySnapshot(snapshotText) {
        try {
            const snapshot = JSON.parse(snapshotText);
            state.background = { ...state.background, ...(snapshot.background || {}) };
            state.effects = { ...state.effects, ...(snapshot.effects || {}) };
            state.layers = normalizeLayers(snapshot.layers || []);
            state.selectedId = snapshot.selectedId || "";
            syncControls();
            persistStyle();
            redraw();
        } catch (error) {
            console.warn("[SeatTrace Stage6] snapshot failed", error);
        }
    }

    function undo() {
        const snapshot = state.history.pop();
        if (!snapshot) {
            toast("되돌릴 작업이 없습니다.");
            return;
        }
        state.redoStack.push(JSON.stringify({
            background: state.background,
            effects: state.effects,
            layers: state.layers,
            selectedId: state.selectedId
        }));
        applySnapshot(snapshot);
        toast("되돌렸습니다.");
    }

    function redo() {
        const snapshot = state.redoStack.pop();
        if (!snapshot) {
            toast("다시 실행할 작업이 없습니다.");
            return;
        }
        state.history.push(JSON.stringify({
            background: state.background,
            effects: state.effects,
            layers: state.layers,
            selectedId: state.selectedId
        }));
        if (state.history.length > 60) state.history.shift();
        applySnapshot(snapshot);
        toast("다시 실행했습니다.");
    }

    function resetView() {
        if (!confirm("Stage 6 화면 배율과 선택을 초기화할까요? 꾸미기 레이어는 유지됩니다.")) return;
        selectLayer("");
        setTool("select");
        setCanvasScale(1);
        redraw();
    }

    function syncControls() {
        if (dom.backgroundType) dom.backgroundType.value = state.background.type || "none";
        if (dom.backgroundColor) dom.backgroundColor.value = safeColor(state.background.color, "#ffffff");
        if (dom.backgroundColor2) dom.backgroundColor2.value = safeColor(state.background.color2, "#f1f5f9");
        if (dom.toggleCanvasBorder) dom.toggleCanvasBorder.checked = Boolean(state.effects.border);
        if (dom.toggleSoftShadow) dom.toggleSoftShadow.checked = Boolean(state.effects.softShadow);
        if (dom.showBookingDebug) dom.showBookingDebug.checked = Boolean(state.showBookingDebug);
        if (dom.showDebugImage) dom.showDebugImage.checked = Boolean(state.showDebugImage);
    }

    function selectLayer(layerId) {
        state.selectedId = layerId || "";
        renderSelectedInfo();
        renderLayers();
    }

    function setTool(tool) {
        state.activeTool = tool || "select";
        document.querySelectorAll(".stage6-tool[data-tool]").forEach((button) => {
            button.classList.toggle("is-active", button.dataset.tool === state.activeTool);
        });
        updateInfo(`${state.width} × ${state.height} / ${getToolName(state.activeTool)}`);
    }

    function fitCanvasView() {
        if (!dom.stage6CanvasViewport || !dom.canvas) return;
        const w = Math.max(1, dom.stage6CanvasViewport.clientWidth - 56);
        const h = Math.max(1, dom.stage6CanvasViewport.clientHeight - 56);
        setCanvasScale(Math.max(0.2, Math.min(1.8, Math.min(w / state.width, h / state.height))));
    }

    function setCanvasScale(scale) {
        state.zoom = clamp(Number(scale) || 1, 0.2, 2.8);
        if (dom.stage6CanvasBoard) {
            dom.stage6CanvasBoard.style.transform = `scale(${state.zoom})`;
            dom.stage6CanvasBoard.style.marginRight = `${Math.max(40, state.width * (state.zoom - 1) + 40)}px`;
            dom.stage6CanvasBoard.style.marginBottom = `${Math.max(40, state.height * (state.zoom - 1) + 40)}px`;
        }
        if (dom.zoomValue) dom.zoomValue.textContent = `${Math.round(state.zoom * 100)}%`;
    }

    function drawMiniMap() {
        if (!dom.miniCtx || !dom.stage6MiniMap || !dom.canvas) return;
        const mini = dom.stage6MiniMap;
        const ratio = Math.min(mini.width / state.width, mini.height / state.height);
        const w = state.width * ratio;
        const h = state.height * ratio;
        const x = (mini.width - w) / 2;
        const y = (mini.height - h) / 2;
        dom.miniCtx.clearRect(0, 0, mini.width, mini.height);
        dom.miniCtx.fillStyle = "#ffffff";
        dom.miniCtx.fillRect(0, 0, mini.width, mini.height);
        dom.miniCtx.drawImage(dom.canvas, x, y, w, h);
        dom.miniCtx.strokeStyle = "#94a3b8";
        dom.miniCtx.lineWidth = 2;
        dom.miniCtx.strokeRect(x, y, w, h);
    }

    function layerBox(layer) {
        if (layer.type === "text") {
            const fontSize = Math.max(8, Number(layer.fontSize || 24));
            const width = Math.max(60, estimateTextWidth(layer.text || "텍스트", fontSize));
            return { x: layer.x - width / 2, y: layer.y - fontSize, w: width, h: fontSize * 1.6 };
        }
        if (layer.type === "line" || layer.type === "arrow") {
            const x1 = layer.x - layer.w / 2;
            const y1 = layer.y - layer.h / 2;
            const x2 = layer.x + layer.w / 2;
            const y2 = layer.y + layer.h / 2;
            const minX = Math.min(x1, x2);
            const minY = Math.min(y1, y2);
            return { x: minX, y: minY - Math.max(8, layer.lineWidth || 3), w: Math.abs(layer.w), h: Math.max(18, Math.abs(layer.h) + Math.max(16, layer.lineWidth || 3)) };
        }
        return { x: layer.x - layer.w / 2, y: layer.y - layer.h / 2, w: layer.w, h: layer.h };
    }

    function hitTestLayer(x, y) {
        for (let i = state.layers.length - 1; i >= 0; i -= 1) {
            const layer = state.layers[i];
            const box = layerBox(layer);
            if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
                return layer;
            }
        }
        return null;
    }

    function getSelectedLayer() {
        return getLayerById(state.selectedId);
    }

    function getLayerById(id) {
        return state.layers.find((layer) => layer.id === id) || null;
    }

    function getButtonPolygons(button) {
        if (Array.isArray(button.polygons) && button.polygons.length) {
            return button.polygons.map(normalizePolygon).filter((polygon) => polygon.length >= 3);
        }
        const polygon = normalizePolygon(button.polygon || []);
        return polygon.length >= 3 ? [polygon] : [];
    }

    function normalizePolygon(points) {
        return normalizeArray(points).map((point) => ({
            x: Number(point?.x),
            y: Number(point?.y)
        })).filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
    }

    function normalizeLayers(items) {
        return normalizeArray(items).map((item, index) => ({
            id: String(item.id || `layer-${index + 1}`),
            type: String(item.type || "text"),
            x: Number(item.x) || 0,
            y: Number(item.y) || 0,
            w: Number(item.w ?? item.width) || 120,
            h: Number(item.h ?? item.height) || (String(item.type) === "line" || String(item.type) === "arrow" ? 0 : 60),
            radius: Number(item.radius) || 12,
            fill: item.fill || DEFAULT_LAYER_STYLE.fill,
            stroke: item.stroke || DEFAULT_LAYER_STYLE.stroke,
            textColor: item.textColor || item.color || DEFAULT_LAYER_STYLE.textColor,
            textStroke: item.textStroke,
            fontSize: Number(item.fontSize) || DEFAULT_LAYER_STYLE.fontSize,
            lineWidth: Number(item.lineWidth) || DEFAULT_LAYER_STYLE.lineWidth,
            shadow: Boolean(item.shadow),
            opacity: Number.isFinite(Number(item.opacity)) ? clamp(Number(item.opacity), 0.05, 1) : 1,
            text: item.text || "",
            metaButtonId: item.metaButtonId || ""
        }));
    }

    function canvasPoint(event) {
        const rect = dom.canvas.getBoundingClientRect();
        return {
            x: clamp((event.clientX - rect.left) * (state.width / Math.max(1, rect.width)), 0, state.width),
            y: clamp((event.clientY - rect.top) * (state.height / Math.max(1, rect.height)), 0, state.height)
        };
    }

    function roundedRect(ctx, x, y, w, h, radius) {
        const r = Math.max(0, Math.min(radius, Math.abs(w) / 2, Math.abs(h) / 2));
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    function estimateTextWidth(text, fontSize) {
        if (!dom.ctx) return String(text || "").length * fontSize * 0.65;
        dom.ctx.save();
        dom.ctx.font = `900 ${fontSize}px Pretendard, Arial, sans-serif`;
        const width = dom.ctx.measureText(String(text || "")).width + 24;
        dom.ctx.restore();
        return width;
    }

    function updateInfo(text) {
        if (dom.stage6CanvasInfo) dom.stage6CanvasInfo.textContent = text;
    }

    function toast(message) {
        if (!dom.toast) return;
        dom.toast.textContent = message;
        dom.toast.classList.add("show");
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => dom.toast.classList.remove("show"), 1700);
    }

    function projectFileUrl(fileName) {
        return `${state.projectPath || `/temp/seatmap/${encodeURIComponent(state.projectId)}`}/${fileName}`;
    }

    function fileNameFromUrl(url) {
        return String(url || "").split("?")[0].split("/").pop() || "";
    }

    function readJsonFromStorage(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            return fallback;
        }
    }

    function normalizeArray(value) {
        if (Array.isArray(value)) return value;
        if (value && typeof value === "object") {
            if (Array.isArray(value.layers)) return value.layers;
            if (Array.isArray(value.buttons)) return value.buttons;
            if (Array.isArray(value.items)) return value.items;
            if (Array.isArray(value.data)) return value.data;
        }
        return [];
    }

    function uniqueTextList(items) {
        return Array.from(new Set((items || []).map((item) => String(item || "").trim()).filter(Boolean)));
    }

    function sanitizeProjectId(value) {
        const cleaned = String(value || "seat")
            .trim()
            .replace(/\s+/g, "_")
            .replace(/[^a-zA-Z0-9가-힣._-]/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_+|_+$/g, "");
        return cleaned || "seat";
    }

    function safeColor(value, fallback) {
        const text = String(value || "").trim();
        if (/^#[0-9a-f]{6}$/i.test(text)) return text;
        if (/^#[0-9a-f]{3}$/i.test(text)) return `#${text[1]}${text[1]}${text[2]}${text[2]}${text[3]}${text[3]}`;
        return fallback || "#111827";
    }

    function numberOr(...values) {
        for (const value of values) {
            const number = Number(value);
            if (Number.isFinite(number)) return number;
        }
        return NaN;
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, Number(value) || 0));
    }

    function round(value) {
        return Math.round(Number(value) || 0);
    }

    function withCacheBust(url) {
        if (!url || String(url).startsWith("data:image") || String(url).startsWith("blob:")) return url;
        return `${url}${String(url).includes("?") ? "&" : "?"}t=${Date.now()}`;
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function getToolName(tool) {
        return {
            select: "선택",
            text: "텍스트",
            rect: "사각형",
            ellipse: "원형",
            line: "선",
            arrow: "화살표",
            erase: "삭제",
            stage: "무대",
            guide: "안내 박스"
        }[tool] || tool;
    }
})();
