(() => {
    "use strict";

    const STORAGE_KEYS = {
        decoratedImage: "seatmap_stage4_decorated_image",
        generatedOverviewImage: "concert_generated_overviewImage",
        stage1GeneratedImage: "concert_stage1_generatedImage",
        buttonImage: "concert_buttonImage",
        seatButtonResult: "seat_button_resultImage",
        cleanImage: "concert_cleanImage",
        originalImage: "concert_originalImage",
        croppedImage: "seatmap_cropped_image"
    };

    const dom = {};
    const state = {
        activeTool: "move",
        objects: [],
        history: [],
        scale: 1,
        baseImage: null,
        sourceImageUrl: ""
    };

    document.addEventListener("DOMContentLoaded", init);

    function init() {
        cacheDom();
        bindEvents();
        loadInitialImage();
    }

    function cacheDom() {
        [
            "stage4App",
            "canvas",
            "decorateOverlay",
            "stage4CanvasBoard",
            "stage4CanvasViewport",
            "stage4CanvasInfo",
            "stage4ToolGrid",
            "fillColor",
            "strokeColor",
            "textColor",
            "fontSize",
            "layerList",
            "selectedObjectInfo",
            "stage4MiniMap",
            "toast",
            "saveDecoratedImage",
            "clearDecorations",
            "undoDecorate",
            "addStageLabel",
            "addEntranceLabel",
            "addGuideBox",
            "fitCanvasView",
            "resetCanvasView"
        ].forEach((id) => {
            dom[id] = document.getElementById(id);
        });

        dom.ctx = dom.canvas?.getContext("2d") || null;
        dom.overlayCtx = dom.decorateOverlay?.getContext("2d") || null;
        dom.miniCtx = dom.stage4MiniMap?.getContext("2d") || null;
    }

    function bindEvents() {
        dom.stage4ToolGrid?.addEventListener("click", (event) => {
            const button = event.target.closest("[data-tool]");
            if (!button) return;
            setTool(button.dataset.tool);
        });

        dom.canvas?.addEventListener("click", onCanvasClick);
        dom.saveDecoratedImage?.addEventListener("click", saveDecoratedImage);
        dom.clearDecorations?.addEventListener("click", clearDecorations);
        dom.undoDecorate?.addEventListener("click", undoDecorate);
        dom.addStageLabel?.addEventListener("click", () => addPreset("stage"));
        dom.addEntranceLabel?.addEventListener("click", () => addPreset("entrance"));
        dom.addGuideBox?.addEventListener("click", () => addPreset("guide"));
        dom.fitCanvasView?.addEventListener("click", fitCanvasView);
        dom.resetCanvasView?.addEventListener("click", () => setCanvasScale(1));
    }

    function setTool(tool) {
        state.activeTool = tool || "move";
        document.querySelectorAll(".stage4-tool[data-tool]").forEach((button) => {
            button.classList.toggle("is-active", button.dataset.tool === state.activeTool);
        });
        updateSelectedInfo(`${getToolName(state.activeTool)} 도구 선택됨`);
    }

    function loadInitialImage() {
        const source = findSourceImage();
        state.sourceImageUrl = source;

        if (!source) {
            setupEmptyCanvas(1200, 760);
            drawEmptyGuide();
            updateInfo("불러올 도면이 없어 빈 캔버스를 생성했습니다.");
            return;
        }

        const image = new Image();
        image.onload = () => {
            state.baseImage = image;
            setupEmptyCanvas(image.naturalWidth || image.width, image.naturalHeight || image.height);
            redrawAll();
            updateInfo(`${dom.canvas.width} × ${dom.canvas.height} / 최종 꾸미기`);
        };
        image.onerror = () => {
            setupEmptyCanvas(1200, 760);
            drawEmptyGuide();
            updateInfo("도면 이미지를 불러오지 못해 빈 캔버스를 생성했습니다.");
        };
        image.src = source;
    }

    function findSourceImage() {
        return Object.values(STORAGE_KEYS)
            .map((key) => localStorage.getItem(key))
            .find((value) => value && (value.startsWith("data:image") || value.startsWith("/") || value.startsWith("http"))) || "";
    }

    function setupEmptyCanvas(width, height) {
        const safeWidth = Math.max(900, Math.round(Number(width) || 1200));
        const safeHeight = Math.max(560, Math.round(Number(height) || 760));

        [dom.canvas, dom.decorateOverlay].forEach((canvas) => {
            if (!canvas) return;
            canvas.width = safeWidth;
            canvas.height = safeHeight;
            canvas.style.width = `${safeWidth}px`;
            canvas.style.height = `${safeHeight}px`;
        });

        if (dom.stage4CanvasBoard) {
            dom.stage4CanvasBoard.style.width = `${safeWidth}px`;
            dom.stage4CanvasBoard.style.height = `${safeHeight}px`;
        }
    }

    function redrawAll() {
        if (!dom.ctx || !dom.canvas) return;

        dom.ctx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);
        dom.ctx.fillStyle = "#ffffff";
        dom.ctx.fillRect(0, 0, dom.canvas.width, dom.canvas.height);

        if (state.baseImage) {
            dom.ctx.drawImage(state.baseImage, 0, 0, dom.canvas.width, dom.canvas.height);
        }

        state.objects.forEach(drawObject);
        drawMiniMap();
    }

    function drawEmptyGuide() {
        if (!dom.ctx || !dom.canvas) return;
        dom.ctx.fillStyle = "#ffffff";
        dom.ctx.fillRect(0, 0, dom.canvas.width, dom.canvas.height);
        dom.ctx.strokeStyle = "#cbd5e1";
        dom.ctx.lineWidth = 2;
        dom.ctx.setLineDash([10, 8]);
        dom.ctx.strokeRect(80, 80, dom.canvas.width - 160, dom.canvas.height - 160);
        dom.ctx.setLineDash([]);
        dom.ctx.fillStyle = "#64748b";
        dom.ctx.font = "700 28px sans-serif";
        dom.ctx.textAlign = "center";
        dom.ctx.fillText("최종 도면 이미지를 불러오면 이곳에 표시됩니다.", dom.canvas.width / 2, dom.canvas.height / 2);
        drawMiniMap();
    }

    function onCanvasClick(event) {
        if (!dom.canvas) return;
        const point = getCanvasPoint(event);

        if (state.activeTool === "move") {
            updateSelectedInfo(`이동 도구: X ${Math.round(point.x)}, Y ${Math.round(point.y)}`);
            return;
        }

        pushHistory();

        if (state.activeTool === "erase") {
            eraseAt(point.x, point.y);
            addLayerLog("지우개", point);
            return;
        }

        const object = createObject(state.activeTool, point.x, point.y);
        state.objects.push(object);
        drawObject(object);
        drawMiniMap();
        renderLayers();
        updateSelectedInfo(`${getToolName(state.activeTool)} 추가됨 / X ${Math.round(point.x)}, Y ${Math.round(point.y)}`);
    }

    function getCanvasPoint(event) {
        const rect = dom.canvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left) * (dom.canvas.width / rect.width),
            y: (event.clientY - rect.top) * (dom.canvas.height / rect.height)
        };
    }

    function createObject(tool, x, y) {
        const fill = dom.fillColor?.value || "#8b5cf6";
        const stroke = dom.strokeColor?.value || "#111827";
        const textColor = dom.textColor?.value || "#ffffff";
        const fontSize = Number(dom.fontSize?.value || 22);

        return {
            id: `decor-${Date.now()}-${state.objects.length + 1}`,
            type: tool,
            x,
            y,
            w: tool === "line" ? 120 : tool === "seat" ? 28 : 130,
            h: tool === "line" ? 0 : tool === "seat" ? 28 : 56,
            fill,
            stroke,
            textColor,
            fontSize,
            text: tool === "text" ? "텍스트" : tool === "stage" ? "STAGE" : tool === "seat" ? "A1" : ""
        };
    }

    function drawObject(object) {
        if (!dom.ctx) return;

        dom.ctx.save();
        dom.ctx.lineWidth = 3;
        dom.ctx.strokeStyle = object.stroke;
        dom.ctx.fillStyle = object.fill;
        dom.ctx.font = `900 ${object.fontSize || 22}px sans-serif`;
        dom.ctx.textAlign = "center";
        dom.ctx.textBaseline = "middle";

        if (object.type === "rect" || object.type === "stage") {
            roundRect(dom.ctx, object.x - object.w / 2, object.y - object.h / 2, object.w, object.h, 12);
            dom.ctx.fill();
            dom.ctx.stroke();
            if (object.text) {
                dom.ctx.fillStyle = object.textColor;
                dom.ctx.fillText(object.text, object.x, object.y);
            }
        } else if (object.type === "ellipse") {
            dom.ctx.beginPath();
            dom.ctx.ellipse(object.x, object.y, object.w / 2, object.h / 2, 0, 0, Math.PI * 2);
            dom.ctx.fill();
            dom.ctx.stroke();
        } else if (object.type === "line") {
            dom.ctx.beginPath();
            dom.ctx.moveTo(object.x - object.w / 2, object.y);
            dom.ctx.lineTo(object.x + object.w / 2, object.y);
            dom.ctx.stroke();
        } else if (object.type === "seat") {
            roundRect(dom.ctx, object.x - object.w / 2, object.y - object.h / 2, object.w, object.h, 6);
            dom.ctx.fill();
            dom.ctx.stroke();
            dom.ctx.fillStyle = object.textColor;
            dom.ctx.font = "900 11px sans-serif";
            dom.ctx.fillText(object.text, object.x, object.y);
        } else if (object.type === "text") {
            dom.ctx.fillStyle = object.textColor;
            dom.ctx.strokeStyle = object.stroke;
            dom.ctx.lineWidth = 5;
            dom.ctx.strokeText(object.text, object.x, object.y);
            dom.ctx.fillText(object.text, object.x, object.y);
        }

        dom.ctx.restore();
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

    function eraseAt(x, y) {
        if (!dom.ctx) return;
        dom.ctx.save();
        dom.ctx.fillStyle = "#ffffff";
        dom.ctx.fillRect(x - 28, y - 28, 56, 56);
        dom.ctx.restore();
        drawMiniMap();
        updateSelectedInfo(`지우개 적용 / X ${Math.round(x)}, Y ${Math.round(y)}`);
    }

    function addPreset(type) {
        if (!dom.canvas) return;
        pushHistory();

        const center = {
            x: dom.canvas.width / 2,
            y: type === "stage" ? 80 : type === "entrance" ? dom.canvas.height - 80 : 140
        };

        const object = type === "stage"
            ? { ...createObject("stage", center.x, center.y), w: 360, h: 62, text: "STAGE", fill: "#111827", textColor: "#ffffff" }
            : type === "entrance"
                ? { ...createObject("text", center.x, center.y), text: "입구", textColor: "#111827", stroke: "#ffffff", fontSize: 28 }
                : { ...createObject("rect", center.x, center.y), w: 280, h: 74, text: "안내", fill: "#f8fafc", stroke: "#8b5cf6", textColor: "#111827" };

        state.objects.push(object);
        redrawAll();
        renderLayers();
        updateSelectedInfo(`${type === "stage" ? "STAGE" : type === "entrance" ? "입구" : "안내 박스"} 추가됨`);
    }

    function pushHistory() {
        try {
            state.history.push(dom.canvas.toDataURL("image/png"));
            if (state.history.length > 20) {
                state.history.shift();
            }
        } catch (error) {
            console.warn("history save failed", error);
        }
    }

    function undoDecorate() {
        const prev = state.history.pop();
        if (!prev) {
            showToast("되돌릴 작업이 없습니다.");
            return;
        }

        const image = new Image();
        image.onload = () => {
            dom.ctx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);
            dom.ctx.drawImage(image, 0, 0, dom.canvas.width, dom.canvas.height);
            state.objects.pop();
            renderLayers();
            drawMiniMap();
        };
        image.src = prev;
    }

    function clearDecorations() {
        if (!confirm("현재 꾸미기 요소를 초기화할까요?")) return;
        pushHistory();
        state.objects = [];
        redrawAll();
        renderLayers();
        updateSelectedInfo("꾸미기 요소 초기화됨");
    }

    function saveDecoratedImage() {
        const dataUrl = exportImage();
        if (!dataUrl) {
            showToast("저장할 도면이 없습니다.");
            return;
        }

        localStorage.setItem(STORAGE_KEYS.decoratedImage, dataUrl);
        localStorage.setItem(STORAGE_KEYS.generatedOverviewImage, dataUrl);
        showToast("최종 꾸미기 도면을 임시 저장했습니다.");
        updateInfo(`${dom.canvas.width} × ${dom.canvas.height} / 임시 저장 완료`);
    }

    function exportImage() {
        try {
            return dom.canvas?.toDataURL("image/png") || "";
        } catch (error) {
            console.warn("canvas export failed", error);
            return "";
        }
    }

    function renderLayers() {
        if (!dom.layerList) return;

        if (!state.objects.length) {
            dom.layerList.innerHTML = `<div class="stage4-empty-layer">추가된 꾸미기 요소가 없습니다.</div>`;
            return;
        }

        dom.layerList.innerHTML = state.objects
            .slice()
            .reverse()
            .map((object, index) => `
                <div class="stage4-layer-item">
                    <div>
                        <b>${escapeHtml(getToolName(object.type))}</b>
                        <span>${Math.round(object.x)}, ${Math.round(object.y)}</span>
                    </div>
                    <span>#${state.objects.length - index}</span>
                </div>
            `)
            .join("");
    }

    function addLayerLog(name, point) {
        renderLayers();
        updateSelectedInfo(`${name} / X ${Math.round(point.x)}, Y ${Math.round(point.y)}`);
    }

    function updateSelectedInfo(text) {
        if (dom.selectedObjectInfo) {
            dom.selectedObjectInfo.textContent = text;
        }
    }

    function updateInfo(text) {
        if (dom.stage4CanvasInfo) {
            dom.stage4CanvasInfo.textContent = text;
        }
    }

    function drawMiniMap() {
        if (!dom.miniCtx || !dom.stage4MiniMap || !dom.canvas) return;

        const mini = dom.stage4MiniMap;
        const ratio = Math.min(mini.width / dom.canvas.width, mini.height / dom.canvas.height);
        const w = dom.canvas.width * ratio;
        const h = dom.canvas.height * ratio;
        const x = (mini.width - w) / 2;
        const y = (mini.height - h) / 2;

        dom.miniCtx.clearRect(0, 0, mini.width, mini.height);
        dom.miniCtx.fillStyle = "#f8fafc";
        dom.miniCtx.fillRect(0, 0, mini.width, mini.height);
        dom.miniCtx.drawImage(dom.canvas, x, y, w, h);
        dom.miniCtx.strokeStyle = "#ef4444";
        dom.miniCtx.lineWidth = 2;
        dom.miniCtx.strokeRect(x, y, w, h);
    }

    function fitCanvasView() {
        if (!dom.stage4CanvasViewport || !dom.canvas) return;
        const available = dom.stage4CanvasViewport.clientWidth - 70;
        const scale = Math.min(1, Math.max(0.25, available / dom.canvas.width));
        setCanvasScale(scale);
    }

    function setCanvasScale(scale) {
        state.scale = scale;
        if (dom.stage4CanvasBoard) {
            dom.stage4CanvasBoard.style.transform = `scale(${scale})`;
            dom.stage4CanvasBoard.style.marginBottom = `${80 + dom.canvas.height * (scale - 1)}px`;
        }
    }

    function getToolName(tool) {
        return {
            move: "이동",
            text: "텍스트",
            rect: "박스",
            ellipse: "원형",
            line: "선",
            seat: "좌석",
            stage: "무대",
            erase: "지우개"
        }[tool] || tool;
    }

    function showToast(message) {
        if (!dom.toast) return;
        dom.toast.textContent = message;
        dom.toast.classList.add("show");
        clearTimeout(showToast._timer);
        showToast._timer = setTimeout(() => dom.toast.classList.remove("show"), 1700);
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    window.SeatmapStage4Decorate = {
        exportImage,
        saveDecoratedImage
    };
})();
