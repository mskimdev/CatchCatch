(() => {
    "use strict";

    const PROJECTS_KEY = "seatmap_projects";
    const CURRENT_PROJECT_KEY = "seatmap_current_project_id";

    const state = {
        projectId: "seat",
        projectPath: "/temp/seatmap/seat",
        image: null,
        imageUrl: "",
        rotation: 0,
        zoom: 1,
        fitScale: 1,
        crop: null,
        mode: "select",
        pointer: null,
        history: [],
        future: []
    };

    const $ = (id) => document.getElementById(id);

    document.addEventListener("DOMContentLoaded", () => {
        initContext();
        bindToolbar();
        bindPanelButtons();
        bindCanvas();
        loadSourceImage();
    });

    function initContext() {
        const app = $("cropRotateApp");
        const query = new URLSearchParams(location.search);

        state.projectId = query.get("projectId")
            || app?.dataset.projectId
            || localStorage.getItem("seatmap_current_folder_name")
            || localStorage.getItem(CURRENT_PROJECT_KEY)
            || "seat";

        state.projectPath = app?.dataset.projectPath || `/temp/seatmap/${state.projectId}`;
        state.imageUrl = app?.dataset.imageUrl || `${state.projectPath}/original-image.png`;

        localStorage.setItem(CURRENT_PROJECT_KEY, state.projectId);
        localStorage.setItem("seatmap_current_folder_name", state.projectId);
        localStorage.setItem("seatmap_project_path", state.projectPath);

        setText("cropProjectName", state.projectId);
        setText("cropProjectPath", state.projectPath);
    }

    function bindToolbar() {
        document.querySelectorAll("[data-seatmap-tool]").forEach((button) => {
            button.addEventListener("click", (event) => {
                event.preventDefault();
                const tool = button.dataset.seatmapTool;

                if (tool === "undo") undo();
                else if (tool === "redo") redo();
                else if (tool === "zoom-out") setZoom(state.zoom / 1.15);
                else if (tool === "zoom-in") setZoom(state.zoom * 1.15);
                else if (tool === "zoom-reset") setZoom(1);
                else if (tool === "fit") fitToScreen();
                else if (tool === "pan") togglePanMode(button);
                else if (tool === "rotate-left") rotate(-90);
                else if (tool === "rotate-right") rotate(90);
                else if (tool === "reset") resetWork();
            });
        });
    }

    function bindPanelButtons() {
        bindClick("applyFullCrop", selectFullArea);
        bindClick("clearCropArea", () => {
            pushHistory();
            state.crop = null;
            draw();
            toast("영역을 다시 선택하세요.");
        });
        bindClick("openMainPage", () => {
            location.href = "/admin/seatmap/main";
        });
    }

    function bindClick(id, handler) {
        const element = $(id);
        if (!element) return;
        element.addEventListener("click", (event) => {
            event.preventDefault();
            handler(event);
        });
    }

    function bindCanvas() {
        const canvas = $("cropCanvas");
        const wrap = $("cropCanvasWrap");
        if (!canvas || !wrap) return;

        canvas.addEventListener("pointerdown", onPointerDown);
        canvas.addEventListener("pointermove", onPointerMove);
        canvas.addEventListener("pointerup", onPointerUp);
        canvas.addEventListener("pointercancel", onPointerUp);
        canvas.addEventListener("wheel", (event) => {
            if (!event.ctrlKey) return;
            event.preventDefault();
            setZoom(event.deltaY < 0 ? state.zoom * 1.08 : state.zoom / 1.08);
        }, { passive: false });

        wrap.addEventListener("pointerdown", (event) => {
            if (state.mode !== "pan" || event.target !== canvas) return;
            state.pointer = {
                type: "pan",
                startClientX: event.clientX,
                startClientY: event.clientY,
                startScrollLeft: wrap.scrollLeft,
                startScrollTop: wrap.scrollTop
            };
            wrap.setPointerCapture?.(event.pointerId);
        });
        wrap.addEventListener("pointermove", (event) => {
            if (!state.pointer || state.pointer.type !== "pan") return;
            wrap.scrollLeft = state.pointer.startScrollLeft - (event.clientX - state.pointer.startClientX);
            wrap.scrollTop = state.pointer.startScrollTop - (event.clientY - state.pointer.startClientY);
        });
        wrap.addEventListener("pointerup", () => {
            if (state.pointer?.type === "pan") state.pointer = null;
        });
    }

    function loadSourceImage() {
        const image = new Image();
        image.onload = () => {
            state.image = image;
            state.crop = null;
            state.rotation = 0;
            fitToScreen();
            const mini = $("cropMiniImage");
            if (mini) mini.src = image.src;
        };
        image.onerror = () => {
            drawEmpty("도면 이미지를 불러오지 못했습니다.");
        };
        image.src = withCacheBust(state.imageUrl);
    }

    function fitToScreen() {
        if (!state.image) return;
        const wrap = $("cropCanvasWrap");
        const availableW = Math.max(500, (wrap?.clientWidth || 1000) - 80);
        const availableH = Math.max(360, (wrap?.clientHeight || 640) - 80);
        const size = getRotatedSize();
        state.fitScale = Math.min(availableW / size.width, availableH / size.height, 1.25);
        if (!Number.isFinite(state.fitScale) || state.fitScale <= 0) state.fitScale = 1;
        state.zoom = 1;
        resizeCanvas();
        draw();
        updateZoomText();
    }

    function resizeCanvas() {
        const canvas = $("cropCanvas");
        if (!canvas || !state.image) return;
        const size = getRotatedSize();
        const scale = getScale();
        canvas.width = Math.round(size.width * scale);
        canvas.height = Math.round(size.height * scale);
        canvas.style.width = `${canvas.width}px`;
        canvas.style.height = `${canvas.height}px`;
    }

    function draw() {
        const canvas = $("cropCanvas");
        if (!canvas || !state.image) return;

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawImageTo(ctx, canvas.width, canvas.height);
        drawCropOverlay(ctx);
    }

    function drawImageTo(ctx, width, height) {
        const scale = getScale();
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate((state.rotation * Math.PI) / 180);
        ctx.drawImage(
            state.image,
            -state.image.width * scale / 2,
            -state.image.height * scale / 2,
            state.image.width * scale,
            state.image.height * scale
        );
        ctx.restore();
    }

    function drawCropOverlay(ctx) {
        if (!state.crop) return;
        const crop = normalizeCrop(state.crop);
        state.crop = crop;

        ctx.save();
        ctx.fillStyle = "rgba(15, 23, 42, 0.38)";
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.clearRect(crop.x, crop.y, crop.w, crop.h);

        // clearRect 이후 선택 영역은 다시 원본 그대로 그린다.
        ctx.save();
        ctx.beginPath();
        ctx.rect(crop.x, crop.y, crop.w, crop.h);
        ctx.clip();
        drawImageTo(ctx, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();

        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 7]);
        ctx.strokeRect(crop.x, crop.y, crop.w, crop.h);
        ctx.setLineDash([]);

        drawHandle(ctx, crop.x, crop.y);
        drawHandle(ctx, crop.x + crop.w, crop.y);
        drawHandle(ctx, crop.x, crop.y + crop.h);
        drawHandle(ctx, crop.x + crop.w, crop.y + crop.h);
        ctx.restore();
    }

    function drawHandle(ctx, x, y) {
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    function onPointerDown(event) {
        if (state.mode === "pan") return;
        const point = getCanvasPoint(event);
        const canvas = $("cropCanvas");
        canvas.setPointerCapture?.(event.pointerId);

        const handle = hitHandle(point);
        if (handle) {
            pushHistory();
            state.pointer = { type: "resize", handle, start: point, crop: { ...state.crop } };
            return;
        }

        if (state.crop && isInside(point, state.crop)) {
            pushHistory();
            state.pointer = { type: "move", start: point, crop: { ...state.crop } };
            return;
        }

        pushHistory();
        state.crop = { x: point.x, y: point.y, w: 1, h: 1 };
        state.pointer = { type: "new", start: point };
        draw();
    }

    function onPointerMove(event) {
        if (!state.pointer || state.pointer.type === "pan") return;
        const point = getCanvasPoint(event);

        if (state.pointer.type === "new") {
            const start = state.pointer.start;
            state.crop = normalizeRawCrop({
                x: Math.min(start.x, point.x),
                y: Math.min(start.y, point.y),
                w: Math.abs(point.x - start.x),
                h: Math.abs(point.y - start.y)
            });
        } else if (state.pointer.type === "move") {
            const dx = point.x - state.pointer.start.x;
            const dy = point.y - state.pointer.start.y;
            state.crop = normalizeCrop({
                ...state.pointer.crop,
                x: state.pointer.crop.x + dx,
                y: state.pointer.crop.y + dy
            });
        } else if (state.pointer.type === "resize") {
            resizeCrop(point);
        }

        draw();
    }

    function onPointerUp() {
        if (state.pointer && state.crop) {
            state.crop = normalizeCrop(state.crop);
            if (state.crop.w < 12 || state.crop.h < 12) {
                state.crop = null;
            }
            draw();
        }
        state.pointer = null;
    }

    function resizeCrop(point) {
        const base = state.pointer.crop;
        let x1 = base.x;
        let y1 = base.y;
        let x2 = base.x + base.w;
        let y2 = base.y + base.h;

        if (state.pointer.handle.includes("l")) x1 = point.x;
        if (state.pointer.handle.includes("r")) x2 = point.x;
        if (state.pointer.handle.includes("t")) y1 = point.y;
        if (state.pointer.handle.includes("b")) y2 = point.y;

        state.crop = normalizeRawCrop({
            x: Math.min(x1, x2),
            y: Math.min(y1, y2),
            w: Math.abs(x2 - x1),
            h: Math.abs(y2 - y1)
        });
    }

    function selectFullArea() {
        if (!state.image) return;
        pushHistory();
        const canvas = $("cropCanvas");
        state.crop = {
            x: 0,
            y: 0,
            w: canvas.width,
            h: canvas.height
        };
        draw();
    }

    function rotate(delta) {
        if (!state.image) return;
        pushHistory();
        state.rotation = ((state.rotation + delta) % 360 + 360) % 360;
        state.crop = null;
        fitToScreen();
        toast("회전 후 자를 영역을 다시 선택하세요.");
    }

    function setZoom(value) {
        if (!state.image) return;
        const oldW = $("cropCanvas").width;
        const oldH = $("cropCanvas").height;
        const oldCrop = state.crop ? { ...state.crop } : null;
        state.zoom = Math.max(0.2, Math.min(5, value));
        resizeCanvas();
        if (oldCrop) {
            const rx = $("cropCanvas").width / oldW;
            const ry = $("cropCanvas").height / oldH;
            state.crop = normalizeCrop({
                x: oldCrop.x * rx,
                y: oldCrop.y * ry,
                w: oldCrop.w * rx,
                h: oldCrop.h * ry
            });
        }
        draw();
        updateZoomText();
    }

    function resetWork() {
        pushHistory();
        state.rotation = 0;
        state.crop = null;
        fitToScreen();
    }

    function togglePanMode(button) {
        state.mode = state.mode === "pan" ? "select" : "pan";
        document.body.classList.toggle("is-pan-mode", state.mode === "pan");
        document.querySelectorAll("[data-seatmap-tool='pan']").forEach((item) => {
            item.classList.toggle("is-active", state.mode === "pan");
        });
        if (button) button.blur();
    }

    function undo() {
        const prev = state.history.pop();
        if (!prev) return;
        state.future.push(snapshot());
        restore(prev);
    }

    function redo() {
        const next = state.future.pop();
        if (!next) return;
        state.history.push(snapshot());
        restore(next);
    }

    function pushHistory() {
        state.history.push(snapshot());
        if (state.history.length > 40) state.history.shift();
        state.future = [];
    }

    function snapshot() {
        return {
            crop: state.crop ? { ...state.crop } : null,
            rotation: state.rotation,
            zoom: state.zoom
        };
    }

    function restore(data) {
        state.crop = data.crop ? { ...data.crop } : null;
        state.rotation = data.rotation || 0;
        state.zoom = data.zoom || 1;
        resizeCanvas();
        draw();
        updateZoomText();
    }

    function exportSelectedImage() {
        if (!state.image || !state.crop) return "";
        const crop = normalizeCrop(state.crop);
        const display = document.createElement("canvas");
        display.width = $("cropCanvas").width;
        display.height = $("cropCanvas").height;
        const displayCtx = display.getContext("2d");
        displayCtx.fillStyle = "#ffffff";
        displayCtx.fillRect(0, 0, display.width, display.height);
        drawImageTo(displayCtx, display.width, display.height);

        const output = document.createElement("canvas");
        output.width = Math.max(1, Math.round(crop.w));
        output.height = Math.max(1, Math.round(crop.h));
        output.getContext("2d").drawImage(
            display,
            crop.x,
            crop.y,
            crop.w,
            crop.h,
            0,
            0,
            output.width,
            output.height
        );

        const dataUrl = output.toDataURL("image/png");
        localStorage.setItem("seatmap_cropped_image", dataUrl);
        localStorage.setItem("seat_button_originalImage", dataUrl);
        localStorage.setItem("concert_originalImage", dataUrl);
        return dataUrl;
    }

    function getCanvasPoint(event) {
        const canvas = $("cropCanvas");
        const rect = canvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left) * (canvas.width / rect.width),
            y: (event.clientY - rect.top) * (canvas.height / rect.height)
        };
    }

    function hitHandle(point) {
        if (!state.crop) return null;
        const crop = state.crop;
        const handles = [
            ["lt", crop.x, crop.y],
            ["rt", crop.x + crop.w, crop.y],
            ["lb", crop.x, crop.y + crop.h],
            ["rb", crop.x + crop.w, crop.y + crop.h]
        ];
        return handles.find(([, x, y]) => Math.hypot(point.x - x, point.y - y) <= 12)?.[0] || null;
    }

    function isInside(point, crop) {
        return point.x >= crop.x && point.x <= crop.x + crop.w && point.y >= crop.y && point.y <= crop.y + crop.h;
    }

    function normalizeRawCrop(crop) {
        const canvas = $("cropCanvas");
        const x = Math.max(0, Math.min(crop.x, canvas.width));
        const y = Math.max(0, Math.min(crop.y, canvas.height));
        const w = Math.max(1, Math.min(crop.w, canvas.width - x));
        const h = Math.max(1, Math.min(crop.h, canvas.height - y));
        return { x, y, w, h };
    }

    function normalizeCrop(crop) {
        const canvas = $("cropCanvas");
        const w = Math.max(12, Math.min(crop.w, canvas.width));
        const h = Math.max(12, Math.min(crop.h, canvas.height));
        const x = Math.max(0, Math.min(crop.x, canvas.width - w));
        const y = Math.max(0, Math.min(crop.y, canvas.height - h));
        return { x, y, w, h };
    }

    function getRotatedSize() {
        const odd = state.rotation % 180 !== 0;
        return {
            width: odd ? state.image.height : state.image.width,
            height: odd ? state.image.width : state.image.height
        };
    }

    function getScale() {
        return state.fitScale * state.zoom;
    }

    function updateZoomText() {
        const text = `${Math.round(state.zoom * 100)}%`;
        document.querySelectorAll("[data-seatmap-tool='zoom-reset'], .seatmap-work-toolbar__zoom-text").forEach((item) => {
            item.textContent = text;
        });
    }

    function drawEmpty(message) {
        const canvas = $("cropCanvas");
        if (!canvas) return;
        canvas.width = 900;
        canvas.height = 520;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#64748b";
        ctx.font = "800 20px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    }

    function withCacheBust(url) {
        if (!url) return "";
        if (url.startsWith("data:image")) return url;
        return `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
    }

    function setText(id, value) {
        const element = $(id);
        if (element) element.textContent = value;
    }

    function toast(message) {
        const element = $("toast");
        if (!element) {
            console.log(message);
            return;
        }
        element.textContent = message;
        element.classList.add("show", "toast--show");
        clearTimeout(toast.timer);
        toast.timer = setTimeout(() => element.classList.remove("show", "toast--show"), 1800);
    }

    window.SeatMapCrop = {
        exportSelectedImage
    };
})();
