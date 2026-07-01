(() => {
    "use strict";

    const STORAGE_KEYS = {
        decoratedImage: "seatmap_stage6_decorated_image",
        decorations: "seatmap_decorations",
        generatedOverviewImage: "concert_generated_overviewImage",
        originalImage: "concert_originalImage",
        overviewImage: "concert_overviewImage",
        imageMeta: "concert_imageMeta",
        sections: "concert_sections",
        stage1Sections: "concert_stage1_sections",
        bookingButtons: "concert_booking_buttons",
        stage3Seats: "concert_stage3_seats",
        stage3Layouts: "concert_stage3_layouts",
        seatJsonUrl: "seatmap_seat_json_url",
        sectionJsonUrl: "seatmap_section_json_url",
        bookingJsonUrl: "seatmap_booking_buttons_json_url",
        finalImageUrl: "seatmap_final_image_url",
        originalImageUrl: "seatmap_original_image_url"
    };

    const dom = {};
    const state = {
        activeTool: "move",
        objects: [],
        sections: [],
        seats: [],
        bookingButtons: [],
        sectionOverrides: {},
        selected: null,
        history: [],
        redoStack: [],
        scale: 1,
        baseImage: null,
        originalImage: null,
        sourceImageUrl: "",
        originalImageUrl: "",
        drag: {
            mode: null,
            objectId: null,
            startX: 0,
            startY: 0,
            offsetX: 0,
            offsetY: 0,
            started: false
        },
        showSections: true,
        showLabels: true,
        showSeats: false,
        showBooking: false,
        showCompare: false
    };

    document.addEventListener("DOMContentLoaded", init);

    async function init() {
        cacheDom();
        bindEvents();
        await loadStageData();
        loadInitialImage();
    }

    function cacheDom() {
        [
            "stage6App",
            "canvas",
            "stage6CanvasBoard",
            "stage6CanvasViewport",
            "stage6CanvasInfo",
            "stage6ToolGrid",
            "fillColor",
            "strokeColor",
            "textColor",
            "fontSize",
            "layerList",
            "selectedObjectInfo",
            "stage6MiniMap",
            "toast",
            "saveDecoratedImage",
            "clearDecorations",
            "addStageLabel",
            "addEntranceLabel",
            "addGuideBox",
            "importSectionLabels",
            "fitCanvasView",
            "fitCanvasViewInline",
            "resetCanvasView",
            "toggleSections",
            "toggleLabels",
            "toggleSeats",
            "toggleBooking",
            "toggleCompare",
            "clearSelection",
            "undoAction",
            "redoAction",
            "zoomIn",
            "zoomOut",
            "zoomFit",
            "zoomReset",
            "zoomValue",
            "resetView"
        ].forEach((id) => {
            dom[id] = document.getElementById(id);
        });

        dom.ctx = dom.canvas?.getContext("2d") || null;
        dom.miniCtx = dom.stage6MiniMap?.getContext("2d") || null;
    }

    function bindEvents() {
        dom.stage6ToolGrid?.addEventListener("click", (event) => {
            const button = event.target.closest("[data-tool]");
            if (!button) return;
            setTool(button.dataset.tool);
        });

        dom.canvas?.addEventListener("pointerdown", onPointerDown);
        dom.canvas?.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        dom.canvas?.addEventListener("dblclick", onDoubleClick);

        dom.saveDecoratedImage?.addEventListener("click", saveDecoratedImage);
        dom.clearDecorations?.addEventListener("click", clearDecorations);
        dom.addStageLabel?.addEventListener("click", () => addPreset("stage"));
        dom.addEntranceLabel?.addEventListener("click", () => addPreset("entrance"));
        dom.addGuideBox?.addEventListener("click", () => addPreset("guide"));
        dom.importSectionLabels?.addEventListener("click", importSectionLabels);
        dom.fitCanvasView?.addEventListener("click", fitCanvasView);
        dom.fitCanvasViewInline?.addEventListener("click", fitCanvasView);
        dom.resetCanvasView?.addEventListener("click", () => setCanvasScale(1));
        dom.clearSelection?.addEventListener("click", () => selectItem(null));

        bindCheckbox(dom.toggleSections, (checked) => {
            state.showSections = checked;
            redrawAll();
            persistDecorations();
        });
        bindCheckbox(dom.toggleLabels, (checked) => {
            state.showLabels = checked;
            redrawAll();
            persistDecorations();
        });
        bindCheckbox(dom.toggleSeats, (checked) => {
            state.showSeats = checked;
            redrawAll();
            persistDecorations();
        });
        bindCheckbox(dom.toggleBooking, (checked) => {
            state.showBooking = checked;
            redrawAll();
            persistDecorations();
        });
        bindCheckbox(dom.toggleCompare, (checked) => {
            state.showCompare = checked;
            redrawAll();
            persistDecorations();
        });

        bindClick("undoAction", undo);
        bindClick("redoAction", redo);
        bindClick("zoomIn", () => setCanvasScale(state.scale + 0.1));
        bindClick("zoomOut", () => setCanvasScale(state.scale - 0.1));
        bindClick("zoomFit", fitCanvasView);
        bindClick("zoomReset", () => setCanvasScale(1));
        bindClick("resetView", resetStage6View);
    }

    function bindClick(id, handler) {
        const element = document.getElementById(id);
        if (!element) return;
        element.addEventListener("click", (event) => {
            event.preventDefault();
            handler(event);
        });
    }

    function bindCheckbox(element, handler) {
        if (!element) return;
        element.addEventListener("change", () => handler(Boolean(element.checked)));
    }

    async function loadStageData() {
        state.sections = normalizeSections(await loadSections());
        state.seats = normalizeSeats(await loadSeats());
        state.bookingButtons = normalizeBookingButtons(await loadBookingButtons());

        const decorationState = readJson(STORAGE_KEYS.decorations, null);
        if (decorationState && typeof decorationState === "object") {
            state.objects = normalizeObjects(decorationState.objects || []);
            state.sectionOverrides = decorationState.sectionOverrides || {};
            state.showSections = decorationState.showSections !== false;
            state.showLabels = decorationState.showLabels !== false;
            state.showSeats = Boolean(decorationState.showSeats);
            state.showBooking = Boolean(decorationState.showBooking);
            state.showCompare = Boolean(decorationState.showCompare);
        }

        setCheckboxValue(dom.toggleSections, state.showSections);
        setCheckboxValue(dom.toggleLabels, state.showLabels);
        setCheckboxValue(dom.toggleSeats, state.showSeats);
        setCheckboxValue(dom.toggleBooking, state.showBooking);
        setCheckboxValue(dom.toggleCompare, state.showCompare);
    }

    function setCheckboxValue(element, value) {
        if (element) element.checked = Boolean(value);
    }

    async function loadSections() {
        const stored = readJson(STORAGE_KEYS.sections, null) || readJson(STORAGE_KEYS.stage1Sections, null);
        if (Array.isArray(stored) && stored.length) {
            return stored;
        }
        const url = localStorage.getItem(STORAGE_KEYS.sectionJsonUrl) || resolveProjectAssetUrl("seatmap-sections.json");
        return fetchJson(url, []);
    }

    async function loadSeats() {
        const stored = readJson(STORAGE_KEYS.stage3Seats, null);
        if (stored && (Array.isArray(stored) ? stored.length : Object.keys(stored).length)) {
            return stored;
        }
        const url = localStorage.getItem(STORAGE_KEYS.seatJsonUrl) || resolveProjectSeatJsonUrl();
        return fetchJson(url, []);
    }

    async function loadBookingButtons() {
        const stored = readJson(STORAGE_KEYS.bookingButtons, null);
        if (Array.isArray(stored) && stored.length) {
            return stored;
        }
        const url = localStorage.getItem(STORAGE_KEYS.bookingJsonUrl) || resolveProjectAssetUrl("booking-buttons.json");
        return fetchJson(url, []);
    }

    function loadInitialImage() {
        state.sourceImageUrl = findSourceImage();
        state.originalImageUrl = findOriginalImage();

        if (!state.sourceImageUrl) {
            setupCanvas(1200, 760);
            redrawAll();
            updateInfo("불러올 도면이 없어 빈 캔버스를 생성했습니다.");
            return;
        }

        const image = new Image();
        image.onload = () => {
            state.baseImage = image;
            setupCanvas(image.naturalWidth || image.width, image.naturalHeight || image.height);
            loadOriginalImage();
            redrawAll();
            updateInfo(`${dom.canvas.width} × ${dom.canvas.height} / 최종 꾸미기`);
            fitCanvasView();
        };
        image.onerror = () => {
            setupCanvas(1200, 760);
            redrawAll();
            updateInfo("도면 이미지를 불러오지 못했습니다.");
        };
        image.src = withCacheBust(state.sourceImageUrl);
    }

    function loadOriginalImage() {
        if (!state.originalImageUrl || state.originalImageUrl === state.sourceImageUrl) {
            state.originalImage = state.baseImage;
            return;
        }
        const original = new Image();
        original.onload = () => {
            state.originalImage = original;
            redrawAll();
        };
        original.src = withCacheBust(state.originalImageUrl);
    }

    function findSourceImage() {
        return localStorage.getItem(STORAGE_KEYS.generatedOverviewImage)
            || localStorage.getItem(STORAGE_KEYS.overviewImage)
            || localStorage.getItem(STORAGE_KEYS.finalImageUrl)
            || resolveProjectAssetUrl("seatmap-image.png")
            || localStorage.getItem("concert_buttonImage")
            || resolveProjectAssetUrl("button-image.png")
            || resolveProjectAssetUrl("debug-polygons.png")
            || localStorage.getItem("concert_cleanImage")
            || localStorage.getItem(STORAGE_KEYS.originalImage)
            || resolveProjectAssetUrl("cropped-image.png")
            || "";
    }

    function findOriginalImage() {
        return localStorage.getItem(STORAGE_KEYS.originalImage)
            || localStorage.getItem(STORAGE_KEYS.originalImageUrl)
            || resolveProjectAssetUrl("original-image.png")
            || state.sourceImageUrl;
    }

    function setupCanvas(width, height) {
        const safeWidth = Math.max(900, Math.round(Number(width) || 1200));
        const safeHeight = Math.max(560, Math.round(Number(height) || 760));
        dom.canvas.width = safeWidth;
        dom.canvas.height = safeHeight;
        dom.canvas.style.width = `${safeWidth}px`;
        dom.canvas.style.height = `${safeHeight}px`;

        if (dom.stage6CanvasBoard) {
            dom.stage6CanvasBoard.style.width = `${safeWidth}px`;
            dom.stage6CanvasBoard.style.height = `${safeHeight}px`;
        }
    }

    function redrawAll() {
        if (!dom.ctx || !dom.canvas) return;
        dom.ctx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);
        drawBaseImage();

        if (state.showSections) {
            drawSections();
        }
        if (state.showSeats) {
            drawSeats();
        }
        if (state.showBooking) {
            drawBookingButtons();
        }

        state.objects.forEach(drawObject);
        drawSelection();
        drawMiniMap();
        renderLayers();
        renderSelectedInfo();
    }

    function drawBaseImage() {
        const image = state.showCompare ? (state.originalImage || state.baseImage) : state.baseImage;
        if (image) {
            dom.ctx.drawImage(image, 0, 0, dom.canvas.width, dom.canvas.height);
            return;
        }
        dom.ctx.fillStyle = "#f8fafc";
        dom.ctx.fillRect(0, 0, dom.canvas.width, dom.canvas.height);
    }

    function drawSections() {
        state.sections.forEach((section) => {
            const override = getSectionOverride(section.id);
            const fillColor = override.color || section.color || section.renderColor || "#d9d9d9";
            const polygons = getSectionPolygons(section);

            polygons.forEach((polygon) => {
                if (polygon.length < 3) return;
                dom.ctx.save();
                dom.ctx.beginPath();
                polygon.forEach((point, index) => {
                    if (index === 0) {
                        dom.ctx.moveTo(point.x, point.y);
                    } else {
                        dom.ctx.lineTo(point.x, point.y);
                    }
                });
                dom.ctx.closePath();
                dom.ctx.fillStyle = hexToRgba(fillColor, 0.78);
                dom.ctx.fill();
                dom.ctx.lineWidth = 3;
                dom.ctx.strokeStyle = (isSelectedSection(section.id) ? "#7c3aed" : "#ffffff");
                dom.ctx.stroke();
                dom.ctx.restore();
            });

            if (state.showLabels && !override.hidden) {
                const labelPoint = getSectionLabelPoint(section);
                const labelText = override.label || section.label || section.name || String(section.id || "");
                drawLabel(labelPoint.x, labelPoint.y, labelText, override.textColor || autoTextColor(fillColor));
            }
        });
    }

    function drawLabel(x, y, text, color) {
        dom.ctx.save();
        dom.ctx.font = "900 20px Pretendard, Arial, sans-serif";
        dom.ctx.textAlign = "center";
        dom.ctx.textBaseline = "middle";
        dom.ctx.lineWidth = 5;
        dom.ctx.strokeStyle = "rgba(255,255,255,0.86)";
        dom.ctx.strokeText(text, x, y);
        dom.ctx.fillStyle = color;
        dom.ctx.fillText(text, x, y);
        dom.ctx.restore();
    }

    function drawSeats() {
        state.seats.forEach((seat) => {
            if (!Number.isFinite(seat.x) || !Number.isFinite(seat.y)) return;
            const w = seat.w || seat.width || seat.size || 18;
            const h = seat.h || seat.height || seat.size || 18;
            dom.ctx.save();
            dom.ctx.fillStyle = seat.status === "REMOVED" ? "rgba(148,163,184,0.35)" : (seat.fill || "#ffffff");
            dom.ctx.strokeStyle = seat.status === "OBSTRUCTED" ? "#f59e0b" : "#334155";
            dom.ctx.lineWidth = 1.5;
            roundRect(dom.ctx, seat.x - w / 2, seat.y - h / 2, w, h, 3);
            dom.ctx.fill();
            dom.ctx.stroke();
            dom.ctx.restore();
        });
    }

    function drawBookingButtons() {
        state.bookingButtons.forEach((button) => {
            const polygons = normalizeButtonPolygons(button);
            polygons.forEach((polygon) => {
                if (polygon.length < 3) return;
                dom.ctx.save();
                dom.ctx.beginPath();
                polygon.forEach((point, index) => {
                    if (index === 0) dom.ctx.moveTo(point.x, point.y);
                    else dom.ctx.lineTo(point.x, point.y);
                });
                dom.ctx.closePath();
                dom.ctx.lineWidth = 2;
                dom.ctx.setLineDash([8, 6]);
                dom.ctx.strokeStyle = "#ef4444";
                dom.ctx.stroke();
                dom.ctx.restore();
            });
        });
    }

    function drawObject(object) {
        dom.ctx.save();
        dom.ctx.lineWidth = object.lineWidth || 3;
        dom.ctx.strokeStyle = object.stroke || "#111827";
        dom.ctx.fillStyle = object.fill || "#8b5cf6";
        dom.ctx.textAlign = "center";
        dom.ctx.textBaseline = "middle";

        if (object.type === "rect" || object.type === "stage") {
            roundRect(dom.ctx, object.x - object.w / 2, object.y - object.h / 2, object.w, object.h, object.radius || 12);
            dom.ctx.fill();
            dom.ctx.stroke();
            if (object.text) {
                drawCanvasText(object.text, object.x, object.y, object.fontSize || 22, object.textColor || "#ffffff");
            }
        } else if (object.type === "ellipse") {
            dom.ctx.beginPath();
            dom.ctx.ellipse(object.x, object.y, object.w / 2, object.h / 2, 0, 0, Math.PI * 2);
            dom.ctx.fill();
            dom.ctx.stroke();
            if (object.text) {
                drawCanvasText(object.text, object.x, object.y, object.fontSize || 20, object.textColor || "#ffffff");
            }
        } else if (object.type === "line") {
            const x1 = object.x - object.w / 2;
            const y1 = object.y - object.h / 2;
            const x2 = object.x + object.w / 2;
            const y2 = object.y + object.h / 2;
            dom.ctx.beginPath();
            dom.ctx.moveTo(x1, y1);
            dom.ctx.lineTo(x2, y2);
            dom.ctx.stroke();
        } else if (object.type === "seat") {
            roundRect(dom.ctx, object.x - object.w / 2, object.y - object.h / 2, object.w, object.h, 4);
            dom.ctx.fill();
            dom.ctx.stroke();
            if (object.text) {
                drawCanvasText(object.text, object.x, object.y, Math.min(object.fontSize || 12, 13), object.textColor || "#111827", "rgba(255,255,255,.85)");
            }
        } else if (object.type === "text") {
            drawCanvasText(object.text || "텍스트", object.x, object.y, object.fontSize || 22, object.textColor || "#ffffff", object.stroke || "rgba(17,24,39,.38)");
        }

        dom.ctx.restore();
    }

    function drawCanvasText(text, x, y, fontSize, fillStyle, strokeStyle = "rgba(17,24,39,.38)") {
        dom.ctx.save();
        dom.ctx.font = `900 ${fontSize}px Pretendard, Arial, sans-serif`;
        dom.ctx.textAlign = "center";
        dom.ctx.textBaseline = "middle";
        dom.ctx.lineWidth = Math.max(3, Math.round(fontSize / 5));
        dom.ctx.strokeStyle = strokeStyle;
        dom.ctx.strokeText(text, x, y);
        dom.ctx.fillStyle = fillStyle;
        dom.ctx.fillText(text, x, y);
        dom.ctx.restore();
    }

    function drawSelection() {
        if (!state.selected) return;

        if (state.selected.kind === "object") {
            const object = getObjectById(state.selected.id);
            if (!object) return;
            const box = getObjectBounds(object);
            dom.ctx.save();
            dom.ctx.strokeStyle = "#7c3aed";
            dom.ctx.lineWidth = 2;
            dom.ctx.setLineDash([8, 5]);
            dom.ctx.strokeRect(box.x, box.y, box.w, box.h);
            dom.ctx.setLineDash([]);
            dom.ctx.fillStyle = "#7c3aed";
            [[box.x, box.y], [box.x + box.w, box.y], [box.x, box.y + box.h], [box.x + box.w, box.y + box.h]].forEach(([x, y]) => {
                dom.ctx.fillRect(x - 4, y - 4, 8, 8);
            });
            dom.ctx.restore();
        } else if (state.selected.kind === "section") {
            const section = state.sections.find((item) => String(item.id) === String(state.selected.id));
            if (!section) return;
            const point = getSectionLabelPoint(section);
            dom.ctx.save();
            dom.ctx.strokeStyle = "#7c3aed";
            dom.ctx.lineWidth = 2;
            dom.ctx.setLineDash([6, 4]);
            dom.ctx.beginPath();
            dom.ctx.arc(point.x, point.y, 16, 0, Math.PI * 2);
            dom.ctx.stroke();
            dom.ctx.restore();
        }
    }

    function onPointerDown(event) {
        if (!dom.canvas) return;
        const point = getCanvasPoint(event);
        const hitObject = hitTestObject(point.x, point.y);
        const hitSection = hitTestSection(point.x, point.y);

        if (state.activeTool === "erase") {
            if (hitObject) {
                pushHistory();
                state.objects = state.objects.filter((item) => item.id !== hitObject.id);
                selectItem(null);
                persistDecorations();
                redrawAll();
            } else if (hitSection) {
                const override = getSectionOverride(hitSection.id);
                pushHistory();
                override.hidden = true;
                state.sectionOverrides[String(hitSection.id)] = override;
                selectItem({ kind: "section", id: hitSection.id });
                persistDecorations();
                redrawAll();
            }
            return;
        }

        if (["text", "rect", "ellipse", "line", "seat"].includes(state.activeTool)) {
            pushHistory();
            const object = createObject(state.activeTool, point.x, point.y);
            state.objects.push(object);
            selectItem({ kind: "object", id: object.id });
            persistDecorations();
            redrawAll();
            return;
        }

        if (state.activeTool === "section") {
            selectItem(hitSection ? { kind: "section", id: hitSection.id } : null);
            redrawAll();
            return;
        }

        if (hitObject) {
            selectItem({ kind: "object", id: hitObject.id });
            state.drag.mode = "object";
            state.drag.objectId = hitObject.id;
            state.drag.offsetX = point.x - hitObject.x;
            state.drag.offsetY = point.y - hitObject.y;
            state.drag.started = false;
            state.drag.startX = point.x;
            state.drag.startY = point.y;
            return;
        }

        if (hitSection) {
            selectItem({ kind: "section", id: hitSection.id });
            state.drag.mode = "section-label";
            state.drag.objectId = String(hitSection.id);
            state.drag.offsetX = 0;
            state.drag.offsetY = 0;
            state.drag.started = false;
            state.drag.startX = point.x;
            state.drag.startY = point.y;
            redrawAll();
            return;
        }

        selectItem(null);
        redrawAll();
    }

    function onPointerMove(event) {
        if (!state.drag.mode) return;
        const point = getCanvasPoint(event);
        const moveDistance = Math.hypot(point.x - state.drag.startX, point.y - state.drag.startY);
        if (!state.drag.started && moveDistance > 2) {
            pushHistory();
            state.drag.started = true;
        }

        if (state.drag.mode === "object") {
            const object = getObjectById(state.drag.objectId);
            if (!object) return;
            object.x = clamp(point.x - state.drag.offsetX, 0, dom.canvas.width);
            object.y = clamp(point.y - state.drag.offsetY, 0, dom.canvas.height);
            redrawAll();
        } else if (state.drag.mode === "section-label") {
            const section = state.sections.find((item) => String(item.id) === String(state.drag.objectId));
            if (!section) return;
            const override = getSectionOverride(section.id);
            override.labelX = clamp(point.x, 0, dom.canvas.width);
            override.labelY = clamp(point.y, 0, dom.canvas.height);
            state.sectionOverrides[String(section.id)] = override;
            redrawAll();
        }
    }

    function onPointerUp() {
        if (state.drag.started) {
            persistDecorations();
        }
        state.drag.mode = null;
        state.drag.objectId = null;
        state.drag.started = false;
    }

    function onDoubleClick() {
        if (!state.selected) return;

        if (state.selected.kind === "object") {
            const object = getObjectById(state.selected.id);
            if (!object || (object.type !== "text" && object.type !== "rect" && object.type !== "stage" && object.type !== "seat" && object.type !== "ellipse")) {
                return;
            }
            const next = prompt("텍스트 입력", object.text || "");
            if (next !== null) {
                pushHistory();
                object.text = next;
                persistDecorations();
                redrawAll();
            }
        } else if (state.selected.kind === "section") {
            const section = state.sections.find((item) => String(item.id) === String(state.selected.id));
            if (!section) return;
            const override = getSectionOverride(section.id);
            const next = prompt("구역명 입력", override.label || section.label || section.name || "");
            if (next !== null) {
                pushHistory();
                override.label = next;
                override.hidden = false;
                state.sectionOverrides[String(section.id)] = override;
                syncSectionsToStorage();
                persistDecorations();
                redrawAll();
            }
        }
    }

    function createObject(tool, x, y) {
        const fill = dom.fillColor?.value || "#8b5cf6";
        const stroke = dom.strokeColor?.value || "#111827";
        const textColor = dom.textColor?.value || "#ffffff";
        const fontSize = Number(dom.fontSize?.value || 22);

        return {
            id: `decor-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
            type: tool,
            x,
            y,
            w: tool === "line" ? 120 : tool === "seat" ? 28 : 150,
            h: tool === "line" ? 20 : tool === "seat" ? 28 : 60,
            radius: tool === "seat" ? 4 : 12,
            fill,
            stroke,
            textColor,
            fontSize,
            lineWidth: tool === "line" ? 4 : 3,
            text: tool === "text" ? "텍스트" : tool === "seat" ? "A1" : ""
        };
    }

    function addPreset(type) {
        if (!dom.canvas) return;
        pushHistory();

        const centerX = dom.canvas.width / 2;
        const centerY = type === "stage" ? 72 : type === "entrance" ? dom.canvas.height - 80 : 140;

        const object = type === "stage"
            ? { ...createObject("rect", centerX, centerY), type: "stage", w: 360, h: 62, text: "STAGE", fill: "#111827", stroke: "#111827", textColor: "#ffffff" }
            : type === "entrance"
                ? { ...createObject("text", centerX, centerY), text: "입구", textColor: "#111827", stroke: "rgba(255,255,255,.88)", fontSize: 28 }
                : { ...createObject("rect", centerX, centerY), w: 280, h: 74, text: "안내 박스", fill: "#f8fafc", stroke: "#8b5cf6", textColor: "#111827" };

        state.objects.push(object);
        selectItem({ kind: "object", id: object.id });
        persistDecorations();
        redrawAll();
    }

    function importSectionLabels() {
        if (!state.sections.length) {
            showToast("불러올 구역 정보가 없습니다.");
            return;
        }

        pushHistory();

        state.sections.forEach((section) => {
            const label = getSectionLabelPoint(section);
            const exists = state.objects.some((object) => object.type === "text" && object.metaSectionId === String(section.id));
            if (exists) return;
            state.objects.push({
                ...createObject("text", label.x, label.y),
                text: section.label || section.name || String(section.id),
                textColor: autoTextColor(getSectionOverride(section.id).color || section.color || "#d9d9d9"),
                stroke: "rgba(255,255,255,.88)",
                fontSize: 20,
                metaSectionId: String(section.id)
            });
        });

        persistDecorations();
        redrawAll();
        showToast("구역 라벨을 편집용 텍스트로 불러왔습니다.");
    }

    function clearDecorations() {
        if (!confirm("현재 꾸미기 요소와 구역 보정을 초기화할까요?")) return;
        pushHistory();
        state.objects = [];
        state.sectionOverrides = {};
        selectItem(null);
        syncSectionsToStorage();
        persistDecorations();
        redrawAll();
        showToast("꾸미기 요소를 초기화했습니다.");
    }

    function saveDecoratedImage() {
        const dataUrl = exportImage();
        if (!dataUrl) {
            showToast("저장할 도면이 없습니다.");
            return;
        }

        localStorage.setItem(STORAGE_KEYS.decoratedImage, dataUrl);
        localStorage.setItem(STORAGE_KEYS.generatedOverviewImage, dataUrl);
        persistDecorations();
        syncSectionsToStorage();
        showToast("현재 상태를 임시 저장했습니다.");
        updateInfo(`${dom.canvas.width} × ${dom.canvas.height} / 임시 저장 완료`);
    }

    function exportImage() {
        if (!dom.canvas) return "";

        const selected = state.selected;

        try {
            state.selected = null;
            redrawAll();
            const imageDataUrl = dom.canvas.toDataURL("image/png");
            state.selected = selected;
            redrawAll();
            return imageDataUrl;
        } catch (error) {
            state.selected = selected;
            redrawAll();
            console.warn("canvas export failed", error);
            return "";
        }
    }

    function pushHistory() {
        state.history.push(snapshotState());
        if (state.history.length > 40) {
            state.history.shift();
        }
        state.redoStack = [];
    }

    function snapshotState() {
        return JSON.stringify({
            objects: state.objects,
            sectionOverrides: state.sectionOverrides,
            selected: state.selected,
            showSections: state.showSections,
            showLabels: state.showLabels,
            showSeats: state.showSeats,
            showBooking: state.showBooking,
            showCompare: state.showCompare
        });
    }

    function applySnapshot(snapshotText) {
        try {
            const snapshot = JSON.parse(snapshotText);
            state.objects = normalizeObjects(snapshot.objects || []);
            state.sectionOverrides = snapshot.sectionOverrides || {};
            state.selected = snapshot.selected || null;
            state.showSections = snapshot.showSections !== false;
            state.showLabels = snapshot.showLabels !== false;
            state.showSeats = Boolean(snapshot.showSeats);
            state.showBooking = Boolean(snapshot.showBooking);
            state.showCompare = Boolean(snapshot.showCompare);
            setCheckboxValue(dom.toggleSections, state.showSections);
            setCheckboxValue(dom.toggleLabels, state.showLabels);
            setCheckboxValue(dom.toggleSeats, state.showSeats);
            setCheckboxValue(dom.toggleBooking, state.showBooking);
            setCheckboxValue(dom.toggleCompare, state.showCompare);
            persistDecorations();
            redrawAll();
        } catch (error) {
            console.warn("snapshot apply failed", error);
        }
    }

    function undo() {
        const snapshot = state.history.pop();
        if (!snapshot) {
            showToast("되돌릴 작업이 없습니다.");
            return;
        }
        state.redoStack.push(snapshotState());
        applySnapshot(snapshot);
        showToast("이전 작업으로 되돌렸습니다.");
    }

    function redo() {
        const snapshot = state.redoStack.pop();
        if (!snapshot) {
            showToast("다시 실행할 작업이 없습니다.");
            return;
        }
        state.history.push(snapshotState());
        applySnapshot(snapshot);
        showToast("다시 실행했습니다.");
    }

    function renderLayers() {
        if (!dom.layerList) return;

        const sectionItems = state.sections.map((section) => {
            const override = getSectionOverride(section.id);
            return {
                id: `section:${section.id}`,
                kind: "section",
                name: override.label || section.label || section.name || String(section.id),
                sub: `구역 / ${section.floor || "1F"}`
            };
        });

        const objectItems = state.objects
            .slice()
            .reverse()
            .map((object, index) => ({
                id: `object:${object.id}`,
                kind: "object",
                name: getToolName(object.type),
                sub: `${Math.round(object.x)}, ${Math.round(object.y)} / #${state.objects.length - index}`
            }));

        const items = [...objectItems, ...sectionItems];

        if (!items.length) {
            dom.layerList.innerHTML = `<div class="stage6-empty-layer">추가된 꾸미기 요소가 없습니다.</div>`;
            return;
        }

        dom.layerList.innerHTML = items.map((item) => `
            <button type="button" class="stage6-layer-item ${isLayerActive(item) ? "is-active" : ""}" data-layer-id="${escapeHtml(item.id)}">
                <div>
                    <b>${escapeHtml(item.name)}</b>
                    <span>${escapeHtml(item.sub)}</span>
                </div>
                <span>${item.kind === "object" ? "OBJ" : "SEC"}</span>
            </button>
        `).join("");

        dom.layerList.querySelectorAll("[data-layer-id]").forEach((button) => {
            button.addEventListener("click", () => {
                const [kind, id] = String(button.dataset.layerId || "").split(":");
                if (!kind || !id) return;
                selectItem({ kind, id });
                if (kind === "section") {
                    setTool("section");
                } else {
                    setTool("move");
                }
                redrawAll();
            });
        });
    }

    function isLayerActive(item) {
        return state.selected && state.selected.kind === item.kind && String(state.selected.id) === String(item.id.split(":")[1]);
    }

    function renderSelectedInfo() {
        if (!dom.selectedObjectInfo) return;

        if (!state.selected) {
            dom.selectedObjectInfo.innerHTML = "아직 선택된 요소가 없습니다.";
            return;
        }

        if (state.selected.kind === "object") {
            const object = getObjectById(state.selected.id);
            if (!object) {
                dom.selectedObjectInfo.innerHTML = "선택된 요소를 찾을 수 없습니다.";
                return;
            }

            dom.selectedObjectInfo.innerHTML = `
                <div class="stage6-properties">
                    <strong>${escapeHtml(getToolName(object.type))}</strong>
                    <label><span>텍스트</span><textarea id="propObjectText">${escapeHtml(object.text || "")}</textarea></label>
                    <div class="stage6-properties-grid">
                        <label><span>X</span><input type="number" id="propObjectX" value="${Math.round(object.x)}"></label>
                        <label><span>Y</span><input type="number" id="propObjectY" value="${Math.round(object.y)}"></label>
                        <label><span>너비</span><input type="number" id="propObjectW" value="${Math.round(object.w || 0)}"></label>
                        <label><span>높이</span><input type="number" id="propObjectH" value="${Math.round(object.h || 0)}"></label>
                        <label><span>채우기</span><input type="color" id="propObjectFill" value="${safeColor(object.fill || "#8b5cf6")}"></label>
                        <label><span>선 색상</span><input type="color" id="propObjectStroke" value="${safeColor(object.stroke || "#111827")}"></label>
                        <label><span>글자색</span><input type="color" id="propObjectTextColor" value="${safeColor(object.textColor || "#ffffff")}"></label>
                        <label><span>글자 크기</span><input type="number" id="propObjectFontSize" value="${Math.round(object.fontSize || 22)}"></label>
                    </div>
                    <div class="stage6-properties-actions">
                        <button type="button" id="applyObjectProps">적용</button>
                        <button type="button" id="deleteObjectProps">삭제</button>
                    </div>
                </div>
            `;

            bindClick("applyObjectProps", () => applyObjectProperties(object.id));
            bindClick("deleteObjectProps", () => deleteObject(object.id));
            return;
        }

        const section = state.sections.find((item) => String(item.id) === String(state.selected.id));
        if (!section) {
            dom.selectedObjectInfo.innerHTML = "선택된 구역을 찾을 수 없습니다.";
            return;
        }
        const override = getSectionOverride(section.id);
        const point = getSectionLabelPoint(section);
        const color = override.color || section.color || section.renderColor || "#d9d9d9";
        const label = override.label || section.label || section.name || String(section.id);
        dom.selectedObjectInfo.innerHTML = `
            <div class="stage6-properties">
                <strong>${escapeHtml(label)}</strong>
                <div>Floor ${escapeHtml(section.floor || "1")} / Grade ${escapeHtml(section.grade || "TEMP")}</div>
                <label><span>구역명</span><input type="text" id="propSectionLabel" value="${escapeHtml(label)}"></label>
                <div class="stage6-properties-grid">
                    <label><span>색상</span><input type="color" id="propSectionColor" value="${safeColor(color)}"></label>
                    <label><span>라벨 색상</span><input type="color" id="propSectionTextColor" value="${safeColor(override.textColor || autoTextColor(color))}"></label>
                    <label><span>라벨 X</span><input type="number" id="propSectionX" value="${Math.round(point.x)}"></label>
                    <label><span>라벨 Y</span><input type="number" id="propSectionY" value="${Math.round(point.y)}"></label>
                </div>
                <div class="stage6-properties-actions">
                    <button type="button" id="applySectionProps">적용</button>
                    <button type="button" id="resetSectionProps">기본값</button>
                    <button type="button" id="toggleSectionHidden">${override.hidden ? "라벨 표시" : "라벨 숨기기"}</button>
                </div>
            </div>
        `;

        bindClick("applySectionProps", () => applySectionProperties(section.id));
        bindClick("resetSectionProps", () => resetSectionProperties(section.id));
        bindClick("toggleSectionHidden", () => toggleSectionHidden(section.id));
    }

    function applyObjectProperties(objectId) {
        const object = getObjectById(objectId);
        if (!object) return;
        pushHistory();
        object.text = document.getElementById("propObjectText")?.value || object.text;
        object.x = Number(document.getElementById("propObjectX")?.value || object.x);
        object.y = Number(document.getElementById("propObjectY")?.value || object.y);
        object.w = Math.max(0, Number(document.getElementById("propObjectW")?.value || object.w));
        object.h = Math.max(0, Number(document.getElementById("propObjectH")?.value || object.h));
        object.fill = document.getElementById("propObjectFill")?.value || object.fill;
        object.stroke = document.getElementById("propObjectStroke")?.value || object.stroke;
        object.textColor = document.getElementById("propObjectTextColor")?.value || object.textColor;
        object.fontSize = Math.max(8, Number(document.getElementById("propObjectFontSize")?.value || object.fontSize));
        persistDecorations();
        redrawAll();
    }

    function deleteObject(objectId) {
        pushHistory();
        state.objects = state.objects.filter((item) => item.id !== objectId);
        if (state.selected?.kind === "object" && state.selected.id === objectId) {
            selectItem(null);
        }
        persistDecorations();
        redrawAll();
    }

    function applySectionProperties(sectionId) {
        const section = state.sections.find((item) => String(item.id) === String(sectionId));
        if (!section) return;
        pushHistory();
        const override = getSectionOverride(section.id);
        override.label = document.getElementById("propSectionLabel")?.value || override.label;
        override.color = document.getElementById("propSectionColor")?.value || override.color;
        override.textColor = document.getElementById("propSectionTextColor")?.value || override.textColor;
        override.labelX = Number(document.getElementById("propSectionX")?.value || getSectionLabelPoint(section).x);
        override.labelY = Number(document.getElementById("propSectionY")?.value || getSectionLabelPoint(section).y);
        override.hidden = false;
        state.sectionOverrides[String(section.id)] = override;
        syncSectionsToStorage();
        persistDecorations();
        redrawAll();
    }

    function resetSectionProperties(sectionId) {
        pushHistory();
        delete state.sectionOverrides[String(sectionId)];
        syncSectionsToStorage();
        persistDecorations();
        redrawAll();
    }

    function toggleSectionHidden(sectionId) {
        pushHistory();
        const override = getSectionOverride(sectionId);
        override.hidden = !override.hidden;
        state.sectionOverrides[String(sectionId)] = override;
        syncSectionsToStorage();
        persistDecorations();
        redrawAll();
    }

    function persistDecorations() {
        const payload = {
            objects: state.objects,
            sectionOverrides: state.sectionOverrides,
            showSections: state.showSections,
            showLabels: state.showLabels,
            showSeats: state.showSeats,
            showBooking: state.showBooking,
            showCompare: state.showCompare
        };
        localStorage.setItem(STORAGE_KEYS.decorations, JSON.stringify(payload));
    }

    function syncSectionsToStorage() {
        if (!Array.isArray(state.sections) || !state.sections.length) return;

        const merged = state.sections.map((section) => {
            const override = getSectionOverride(section.id);
            const labelPoint = getSectionLabelPoint(section);
            return {
                ...section,
                color: override.color || section.color,
                renderColor: override.color || section.renderColor || section.color,
                label: override.label || section.label || section.name,
                name: override.label || section.name || section.label,
                button: {
                    ...(section.button || {}),
                    label: override.label || section.button?.label || section.label || section.name,
                    color: override.color || section.button?.color || section.color,
                    x: round(labelPoint.x),
                    y: round(labelPoint.y)
                }
            };
        });

        localStorage.setItem(STORAGE_KEYS.sections, JSON.stringify(merged));
        localStorage.setItem(STORAGE_KEYS.stage1Sections, JSON.stringify(merged));
    }

    function selectItem(selection) {
        state.selected = selection;
        renderSelectedInfo();
        renderLayers();
    }

    function setTool(tool) {
        state.activeTool = tool || "move";
        document.querySelectorAll(".stage6-tool[data-tool]").forEach((button) => {
            button.classList.toggle("is-active", button.dataset.tool === state.activeTool);
        });
        if (state.activeTool === "section") {
            updateInfo(`${dom.canvas.width} × ${dom.canvas.height} / 구역 선택 모드`);
        } else {
            updateInfo(`${dom.canvas.width} × ${dom.canvas.height} / ${getToolName(state.activeTool)} 도구`);
        }
    }

    function fitCanvasView() {
        if (!dom.stage6CanvasViewport || !dom.canvas) return;
        const availableWidth = dom.stage6CanvasViewport.clientWidth - 70;
        const availableHeight = dom.stage6CanvasViewport.clientHeight - 70;
        const scale = Math.max(0.25, Math.min(1.6, Math.min(availableWidth / dom.canvas.width, availableHeight / dom.canvas.height)));
        setCanvasScale(scale);
    }

    function setCanvasScale(scale) {
        state.scale = clamp(scale, 0.25, 2.5);
        if (dom.stage6CanvasBoard) {
            dom.stage6CanvasBoard.style.transform = `scale(${state.scale})`;
            dom.stage6CanvasBoard.style.marginBottom = `${Math.max(40, dom.canvas.height * (state.scale - 1) + 40)}px`;
            dom.stage6CanvasBoard.style.marginRight = `${Math.max(40, dom.canvas.width * (state.scale - 1) + 40)}px`;
        }
        if (dom.zoomValue) {
            dom.zoomValue.textContent = `${Math.round(state.scale * 100)}%`;
        }
    }

    function resetStage6View() {
        const hasDecorations = state.objects.length > 0 || Object.keys(state.sectionOverrides || {}).length > 0;

        if (hasDecorations && !confirm("Stage 6 꾸미기 요소와 구역 보정을 초기화할까요?")) {
            return;
        }

        pushHistory();
        state.objects = [];
        state.sectionOverrides = {};
        state.showSections = true;
        state.showLabels = true;
        state.showSeats = false;
        state.showBooking = false;
        state.showCompare = false;
        selectItem(null);
        setCheckboxValue(dom.toggleSections, state.showSections);
        setCheckboxValue(dom.toggleLabels, state.showLabels);
        setCheckboxValue(dom.toggleSeats, state.showSeats);
        setCheckboxValue(dom.toggleBooking, state.showBooking);
        setCheckboxValue(dom.toggleCompare, state.showCompare);
        setCanvasScale(1);
        syncSectionsToStorage();
        persistDecorations();
        redrawAll();
        showToast("Stage 6 꾸미기를 초기화했습니다.");
    }

    function drawMiniMap() {
        if (!dom.miniCtx || !dom.stage6MiniMap || !dom.canvas) return;

        const mini = dom.stage6MiniMap;
        const ratio = Math.min(mini.width / dom.canvas.width, mini.height / dom.canvas.height);
        const w = dom.canvas.width * ratio;
        const h = dom.canvas.height * ratio;
        const x = (mini.width - w) / 2;
        const y = (mini.height - h) / 2;

        dom.miniCtx.clearRect(0, 0, mini.width, mini.height);
        dom.miniCtx.fillStyle = "#ffffff";
        dom.miniCtx.fillRect(0, 0, mini.width, mini.height);
        dom.miniCtx.drawImage(dom.canvas, x, y, w, h);
        dom.miniCtx.strokeStyle = "#ef4444";
        dom.miniCtx.lineWidth = 2;
        dom.miniCtx.strokeRect(x, y, w, h);
    }

    function getCanvasPoint(event) {
        const rect = dom.canvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left) * (dom.canvas.width / rect.width),
            y: (event.clientY - rect.top) * (dom.canvas.height / rect.height)
        };
    }

    function hitTestObject(x, y) {
        for (let index = state.objects.length - 1; index >= 0; index -= 1) {
            const object = state.objects[index];
            const bounds = getObjectBounds(object);
            if (x >= bounds.x && x <= bounds.x + bounds.w && y >= bounds.y && y <= bounds.y + bounds.h) {
                return object;
            }
        }
        return null;
    }

    function hitTestSection(x, y) {
        for (let index = state.sections.length - 1; index >= 0; index -= 1) {
            const section = state.sections[index];
            const polygons = getSectionPolygons(section);
            if (polygons.some((polygon) => isPointInPolygon({ x, y }, polygon))) {
                return section;
            }
        }
        return null;
    }

    function getObjectBounds(object) {
        if (object.type === "text") {
            const fontSize = object.fontSize || 22;
            const width = Math.max(60, estimateTextWidth(object.text || "텍스트", fontSize));
            return { x: object.x - width / 2, y: object.y - fontSize, w: width, h: fontSize * 1.6 };
        }

        if (object.type === "line") {
            return { x: object.x - object.w / 2, y: object.y - object.h / 2, w: object.w, h: object.h || 20 };
        }

        return { x: object.x - object.w / 2, y: object.y - object.h / 2, w: object.w, h: object.h };
    }

    function getObjectById(objectId) {
        return state.objects.find((item) => item.id === objectId) || null;
    }

    function getSectionOverride(sectionId) {
        return { ...(state.sectionOverrides[String(sectionId)] || {}) };
    }

    function getSectionLabelPoint(section) {
        const override = state.sectionOverrides[String(section.id)] || {};
        if (Number.isFinite(override.labelX) && Number.isFinite(override.labelY)) {
            return { x: override.labelX, y: override.labelY };
        }
        if (section.button && Number.isFinite(section.button.x) && Number.isFinite(section.button.y)) {
            return { x: section.button.x, y: section.button.y };
        }
        const bbox = getPolygonBbox(flattenPoints(getSectionPolygons(section)));
        return { x: bbox.x + bbox.w / 2, y: bbox.y + bbox.h / 2 };
    }

    function getSectionPolygons(section) {
        if (Array.isArray(section.polygons) && section.polygons.length) {
            return section.polygons.map(normalizePolygon).filter((polygon) => polygon.length >= 3);
        }
        const polygon = normalizePolygon(section.polygon || []);
        return polygon.length >= 3 ? [polygon] : [];
    }

    function normalizeSections(items) {
        if (!Array.isArray(items)) return [];
        return items.map((item, index) => ({
            ...item,
            id: item.id || item.sectionId || item.name || `section-${index + 1}`,
            label: item.label || item.name || item.sectionId || `구역 ${index + 1}`,
            color: item.color || item.renderColor || "#d9d9d9"
        }));
    }

    function normalizeSeats(input) {
        if (Array.isArray(input)) {
            return input.map((seat) => normalizeSeat(seat)).filter(Boolean);
        }
        if (input && typeof input === "object") {
            return Object.entries(input).flatMap(([sectionId, seats]) => normalizeArray(seats).map((seat) => normalizeSeat({ ...seat, sectionId }))).filter(Boolean);
        }
        return [];
    }

    function normalizeSeat(seat) {
        if (!seat || typeof seat !== "object") return null;
        const x = firstNumber(seat.x, seat.cx, seat.centerX, seat.left + ((seat.width || 18) / 2));
        const y = firstNumber(seat.y, seat.cy, seat.centerY, seat.top + ((seat.height || 18) / 2));
        if (!Number.isFinite(x) || !Number.isFinite(y)) return { ...seat, x: NaN, y: NaN };
        return {
            ...seat,
            x,
            y,
            w: firstNumber(seat.w, seat.width, seat.size, 18),
            h: firstNumber(seat.h, seat.height, seat.size, 18)
        };
    }

    function normalizeBookingButtons(items) {
        return Array.isArray(items) ? items : [];
    }

    function normalizeButtonPolygons(button) {
        if (Array.isArray(button.polygons) && button.polygons.length) {
            return button.polygons.map(normalizePolygon).filter((polygon) => polygon.length >= 3);
        }
        const polygon = normalizePolygon(button.polygon || []);
        return polygon.length >= 3 ? [polygon] : [];
    }

    function normalizePolygon(polygon) {
        return normalizeArray(polygon).map((point) => ({
            x: Number(point?.x),
            y: Number(point?.y)
        })).filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
    }

    function normalizeObjects(items) {
        return normalizeArray(items).map((item) => ({
            ...item,
            x: Number(item.x) || 0,
            y: Number(item.y) || 0,
            w: Number(item.w ?? item.width) || 120,
            h: Number(item.h ?? item.height) || 60,
            fontSize: Number(item.fontSize) || 22,
            lineWidth: Number(item.lineWidth) || 3,
            radius: Number(item.radius) || 12
        }));
    }

    function updateInfo(text) {
        if (dom.stage6CanvasInfo) {
            dom.stage6CanvasInfo.textContent = text;
        }
    }

    function showToast(message) {
        if (!dom.toast) return;
        dom.toast.textContent = message;
        dom.toast.classList.add("show");
        clearTimeout(showToast._timer);
        showToast._timer = setTimeout(() => dom.toast.classList.remove("show"), 1700);
    }

    async function fetchJson(url, fallback) {
        if (!url) return fallback;
        try {
            const response = await fetch(withCacheBust(url), { credentials: "same-origin" });
            if (!response.ok) {
                return fallback;
            }
            return await response.json();
        } catch (error) {
            console.warn("json load failed", url, error);
            return fallback;
        }
    }

    function resolveProjectAssetUrl(fileName) {
        const folder = getCurrentProjectId();
        return folder ? `/temp/seatmap/${encodeURIComponent(folder)}/${fileName}` : "";
    }

    function resolveProjectSeatJsonUrl() {
        const folder = getCurrentProjectId();
        return folder ? `/temp/seatmap/seats/${encodeURIComponent(folder)}-seatmap-seats.json` : "";
    }

    function getCurrentProjectId() {
        const params = new URLSearchParams(location.search);
        return params.get("projectId")
            || localStorage.getItem("seatmap_current_project_id")
            || localStorage.getItem("seatmap_current_folder_name")
            || localStorage.getItem("seatmap_current_folder")
            || "";
    }

    function readJson(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            return fallback;
        }
    }

    function normalizeArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function isSelectedSection(sectionId) {
        return state.selected?.kind === "section" && String(state.selected.id) === String(sectionId);
    }

    function isPointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x;
            const yi = polygon[i].y;
            const xj = polygon[j].x;
            const yj = polygon[j].y;
            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || 1e-6) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    function flattenPoints(polygons) {
        return polygons.flatMap((polygon) => polygon);
    }

    function getPolygonBbox(points) {
        const safePoints = normalizeArray(points).filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
        if (!safePoints.length) {
            return { x: 0, y: 0, w: 0, h: 0 };
        }
        const xs = safePoints.map((point) => point.x);
        const ys = safePoints.map((point) => point.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }

    function roundRect(ctx, x, y, w, h, r) {
        const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
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

    function estimateTextWidth(text, fontSize) {
        if (!dom.ctx) return (String(text || "").length * fontSize * 0.6);
        dom.ctx.save();
        dom.ctx.font = `900 ${fontSize}px Pretendard, Arial, sans-serif`;
        const width = dom.ctx.measureText(String(text || "")).width;
        dom.ctx.restore();
        return width + 20;
    }

    function firstNumber(...values) {
        const found = values.find((value) => Number.isFinite(Number(value)));
        return Number(found);
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, Number(value) || 0));
    }

    function round(value) {
        return Math.round(Number(value) || 0);
    }

    function getToolName(tool) {
        return {
            move: "이동",
            text: "텍스트",
            rect: "박스",
            ellipse: "원형",
            line: "선",
            seat: "좌석",
            section: "구역",
            stage: "무대",
            erase: "지우개"
        }[tool] || tool;
    }

    function withCacheBust(url) {
        if (!url || String(url).startsWith("data:image") || String(url).startsWith("blob:")) {
            return url;
        }
        return `${url}${String(url).includes("?") ? "&" : "?"}t=${Date.now()}`;
    }

    function hexToRgba(hex, alpha) {
        const safe = safeColor(hex).replace("#", "");
        const size = safe.length === 3 ? 1 : 2;
        const values = safe.length === 3
            ? safe.split("").map((char) => parseInt(char + char, 16))
            : [safe.slice(0, 2), safe.slice(2, 4), safe.slice(4, 6)].map((part) => parseInt(part, 16));
        return `rgba(${values[0]}, ${values[1]}, ${values[2]}, ${alpha})`;
    }

    function safeColor(value) {
        return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value || "")) ? String(value) : "#8b5cf6";
    }

    function autoTextColor(hex) {
        const safe = safeColor(hex).replace("#", "");
        const values = safe.length === 3
            ? safe.split("").map((char) => parseInt(char + char, 16))
            : [safe.slice(0, 2), safe.slice(2, 4), safe.slice(4, 6)].map((part) => parseInt(part, 16));
        const luminance = (values[0] * 0.299) + (values[1] * 0.587) + (values[2] * 0.114);
        return luminance > 168 ? "#111827" : "#ffffff";
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    window.SeatmapStage6Decorate = {
        exportImage,
        saveDecoratedImage,
        redrawAll
    };
})();
