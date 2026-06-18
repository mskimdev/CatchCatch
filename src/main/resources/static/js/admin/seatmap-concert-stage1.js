(() => {
    "use strict";

    const STORAGE_KEYS = {
        ORIGINAL_IMAGE: "concert_originalImage",
        CLEAN_IMAGE: "concert_cleanImage",
        IMAGE_META: "concert_imageMeta",
    };

    const PAGE_URL = {
        STAGE2: "/admin/seatmap/concert/stage2",
    };

    const HISTORY_LIMIT = 30;
    const MIN_ZOOM = 0.25;
    const MAX_ZOOM = 4;

    const dom = {};
    const state = {
        width: 0,
        height: 0,

        originalUrl: null,
        workingUrl: null,
        cleanUrl: null,
        lastExtractUrl: null,

        part: 1,
        completedParts: new Set(),
        samples: [],

        cropMode: false,
        cropDraft: null,
        cropRect: null,

        eraserMode: false,
        erasing: false,

        fillMode: false,
        filling: false,

        lastPointerPos: null,

        baseDisplayScale: 1,
        zoomScale: 1,
        zoomMode: false,
        zoomDragging: false,
        zoomStartX: 0,
        zoomStartScale: 1,

        history: [],
        historyIndex: -1,
        isApplyingHistory: false,
        changedDuringDrag: false,
    };

    let canvas;
    let overlay;
    let ctx;
    let overlayCtx;
    let loupeCanvas;
    let loupeCtx;

    const sourceCanvas = document.createElement("canvas");
    const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });

    const cleanCanvas = document.createElement("canvas");
    const cleanCtx = cleanCanvas.getContext("2d", { willReadFrequently: true });

    document.addEventListener("DOMContentLoaded", init);

    function init() {
        cacheDom();
        bindEvents();
        initializeWorkspaceSteps();
        renderPartGuide(state.part);
        updateHistoryButtons();
        updateZoomView();

        state.originalUrl = localStorage.getItem(STORAGE_KEYS.ORIGINAL_IMAGE);
        state.workingUrl = state.originalUrl;
        state.cleanUrl = localStorage.getItem(STORAGE_KEYS.CLEAN_IMAGE) || state.workingUrl;
        state.lastExtractUrl = state.cleanUrl;

        if (!state.originalUrl) {
            showToast("메인에서 이미지를 업로드하세요");
            renderSamples();
            return;
        }

        loadImage(state.workingUrl, (sourceImage) => {
            setupCanvas(sourceImage.naturalWidth, sourceImage.naturalHeight);
            drawImageToSourceCanvas(sourceImage);

            loadImage(state.cleanUrl, (cleanImage) => {
                drawImageToCleanCanvas(cleanImage);
                render();
                renderSamples();
                pushHistory("초기 상태");
            });
        });
    }

    function cacheDom() {
        canvas = document.getElementById("canvas");
        overlay = document.getElementById("overlay");
        ctx = canvas.getContext("2d", { willReadFrequently: true });
        overlayCtx = overlay.getContext("2d", { willReadFrequently: true });

        loupeCanvas = document.getElementById("loupeCanvas");
        loupeCtx = loupeCanvas ? loupeCanvas.getContext("2d", { willReadFrequently: true }) : null;

        [
            "box",
            "title",
            "size",
            "toast",
            "eraserCursor",

            "undoAction",
            "redoAction",
            "zoomTool",
            "zoomReset",
            "zoomValue",

            "colorLoupe",
            "loupeChip",
            "loupeHex",
            "loupeRgb",
            "loupePoint",

            "tab1",
            "tab2",
            "tab3",
            "part1",
            "part2",
            "part3",
            "stage1Guide",

            "cropStart",
            "cropApply",
            "go2",
            "go3",

            "samples",
            "tol",
            "alpha",
            "shapeColor",
            "bgColor",
            "hole",
            "viewMode",
            "clearSamples",
            "restoreOriginal",

            "eraser",
            "rectFill",
            "eraserSize",
            "cleanupArea",
            "cleanup",
            "restoreExtract",
            "toStage3",
        ].forEach((id) => {
            dom[id] = document.getElementById(id);
        });
    }

    function bindEvents() {
        bindIfExists("tab1", "click", () => showPart(1));
        bindIfExists("tab2", "click", () => showPart(2));
        bindIfExists("tab3", "click", () => showPart(3));

        bindIfExists("go2", "click", () => moveNextPart(1, 2));
        bindIfExists("go3", "click", () => moveNextPart(2, 3));

        bindIfExists("cropStart", "click", startCropMode);
        bindIfExists("cropApply", "click", applyCrop);

        overlay.addEventListener("pointerdown", handlePointerDown);
        overlay.addEventListener("pointerleave", handlePointerLeave);
        overlay.addEventListener("pointerenter", handlePointerEnter);
        overlay.addEventListener("pointermove", handleOverlayPointerMove);

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);

        ["tol", "alpha", "shapeColor", "bgColor", "hole", "viewMode"].forEach((id) => {
            if (!dom[id]) {
                return;
            }

            dom[id].addEventListener("input", () => extractSelectedColors());
            dom[id].addEventListener("change", () => extractSelectedColors({ recordHistory: true }));
        });

        bindIfExists("clearSamples", "click", clearSamples);
        bindIfExists("restoreOriginal", "click", restoreOriginalPreview);

        bindIfExists("eraser", "click", toggleEraserMode);
        bindIfExists("rectFill", "click", toggleFillMode);

        if (dom.eraserSize) {
            dom.eraserSize.addEventListener("input", () => {
                if (state.part === 3 && state.lastPointerPos) {
                    updateToolCursor(state.lastPointerPos);
                }
            });
        }

        bindIfExists("cleanup", "click", removeSmallFragments);
        bindIfExists("restoreExtract", "click", restoreLastExtract);
        bindIfExists("toStage3", "click", moveToStage2);

        bindIfExists("undoAction", "click", undoHistory);
        bindIfExists("redoAction", "click", redoHistory);
        bindIfExists("zoomTool", "click", toggleZoomMode);
        bindIfExists("zoomReset", "click", resetZoom);

        document.addEventListener("keydown", handleCommandShortcut);
    }

    function bindIfExists(id, eventName, handler) {
        if (!dom[id]) {
            return;
        }

        dom[id].addEventListener(eventName, handler);
    }

    /* =========================
       Canvas Setup / Render
    ========================= */

    function setupCanvas(width, height) {
        state.width = width;
        state.height = height;

        canvas.width = width;
        canvas.height = height;
        overlay.width = width;
        overlay.height = height;
        sourceCanvas.width = width;
        sourceCanvas.height = height;
        cleanCanvas.width = width;
        cleanCanvas.height = height;

        state.baseDisplayScale = Math.min(1, 1120 / width, 720 / height);
        applyCanvasDisplayScale();

        if (dom.size) {
            dom.size.textContent = `${width} × ${height}`;
        }
    }

    function applyCanvasDisplayScale() {
        const scale = state.baseDisplayScale * state.zoomScale;
        const displayWidth = `${state.width * scale}px`;
        const displayHeight = `${state.height * scale}px`;

        canvas.style.width = displayWidth;
        canvas.style.height = displayHeight;
        overlay.style.width = displayWidth;
        overlay.style.height = displayHeight;

        dom.box.style.width = displayWidth;
        dom.box.style.height = displayHeight;

        updateZoomView();
    }

    function drawImageToSourceCanvas(image) {
        sourceCtx.clearRect(0, 0, state.width, state.height);
        sourceCtx.drawImage(image, 0, 0, state.width, state.height);
    }

    function drawImageToCleanCanvas(image) {
        cleanCtx.clearRect(0, 0, state.width, state.height);
        cleanCtx.drawImage(image, 0, 0, state.width, state.height);
        state.cleanUrl = cleanCanvas.toDataURL("image/png");
    }

    function render() {
        clearCanvas();
        hideColorLoupeIfInvalid();

        if (state.part === 1) {
            ctx.drawImage(sourceCanvas, 0, 0);
            drawCropGuide();
            return;
        }

        if (state.part === 2 && isMixedPreviewMode()) {
            ctx.drawImage(sourceCanvas, 0, 0);
            drawPreviewOverlay();
            return;
        }

        ctx.drawImage(cleanCanvas, 0, 0);

        if (state.part === 3 && isToolModeActive() && state.lastPointerPos) {
            updateToolCursor(state.lastPointerPos);
        }
    }

    function clearCanvas() {
        ctx.clearRect(0, 0, state.width, state.height);
        overlayCtx.clearRect(0, 0, state.width, state.height);
    }

    function drawPreviewOverlay() {
        if (!state.cleanUrl) {
            return;
        }

        const preview = createCanvas(state.width, state.height);
        const previewCtx = preview.getContext("2d", { willReadFrequently: true });

        previewCtx.drawImage(cleanCanvas, 0, 0);

        const imageData = previewCtx.getImageData(0, 0, state.width, state.height);
        const data = imageData.data;
        const shapeColor = hexToRgb(dom.shapeColor.value);
        const alpha = Math.round((getNumber(dom.alpha, 55) / 100) * 255);

        for (let i = 0; i < data.length; i += 4) {
            const pixel = {
                r: data[i],
                g: data[i + 1],
                b: data[i + 2],
            };

            if (colorDistance(pixel, shapeColor) <= 18) {
                data[i] = shapeColor.r;
                data[i + 1] = shapeColor.g;
                data[i + 2] = shapeColor.b;
                data[i + 3] = alpha;
            } else {
                data[i + 3] = 0;
            }
        }

        previewCtx.putImageData(imageData, 0, 0);

        overlayCtx.clearRect(0, 0, state.width, state.height);
        overlayCtx.drawImage(preview, 0, 0);
    }

    function isMixedPreviewMode() {
        return state.part === 2 && dom.viewMode && dom.viewMode.value === "mix";
    }

    /* =========================
       Part Tabs
    ========================= */

    function showPart(partNumber) {
        completePreviousParts(partNumber);

        state.part = partNumber;
        syncWorkspacePartState();
        renderPartGuide(partNumber);

        if (dom.title) {
            dom.title.textContent = getPartTitle(partNumber);
        }

        if (partNumber !== 2) {
            hideColorLoupe();
        }

        if (partNumber !== 3) {
            hideToolCursor();
        }

        render();
    }

    function moveNextPart(currentPart, nextPart) {
        state.completedParts.add(currentPart);
        showPart(nextPart);
    }

    function completePreviousParts(partNumber) {
        for (let number = 1; number < partNumber; number += 1) {
            state.completedParts.add(number);
        }
    }

    function syncWorkspacePartState() {
        [1, 2, 3].forEach((number) => {
            const part = dom[`part${number}`];
            const tab = dom[`tab${number}`];

            if (!part || !tab) {
                return;
            }

            const isActive = number === state.part;
            const isDone = state.completedParts.has(number);

            part.classList.remove("hidden");
            part.classList.toggle("is-active", isActive);
            part.classList.toggle("is-done", isDone);

            tab.classList.toggle("active", isActive);

            const status = part.querySelector(".seatmap-step__status");

            if (status) {
                if (isActive) {
                    status.textContent = isDone ? "완료진행중" : "진행중";
                } else if (isDone) {
                    status.textContent = "완료";
                } else {
                    status.textContent = "대기";
                }
            }
        });
    }

    function initializeWorkspaceSteps() {
        [1, 2, 3].forEach((number) => {
            if (dom[`part${number}`]) {
                dom[`part${number}`].classList.remove("hidden");
            }
        });

        syncWorkspacePartState();
    }

    function getPartTitle(partNumber) {
        if (partNumber === 1) {
            return "원본 / 자르기";
        }

        if (partNumber === 2) {
            return "원본 + 추출 미리보기";
        }

        return "추출본 다듬기";
    }

    function renderPartGuide(partNumber) {
        if (!dom.stage1Guide) {
            return;
        }

        const guideText = {
            1: "도면 영역만 남기고 제목, 범례, 여백은 제거하세요.",
            2: "가운데 이미지를 움직이면 픽셀 확대경과 색상 정보가 표시됩니다. 클릭하면 해당 색상이 추출 목록에 추가됩니다.",
            3: "먼저 작은 선/조각을 자동 제거하고, 남는 부분만 지우개 또는 브러쉬로 수동 보정하세요.",
        };

        dom.stage1Guide.textContent = guideText[partNumber] || "";
    }

    /* =========================
       Common Commands - Zoom
    ========================= */

    function toggleZoomMode() {
        state.zoomMode = !state.zoomMode;

        if (state.zoomMode) {
            disableEraserMode();
            disableFillMode();
            state.cropMode = false;
            hideColorLoupe();
            showToast("확대 도구: 오른쪽 드래그 확대 / 왼쪽 드래그 축소");
        }

        updateZoomView();
    }

    function beginZoomDrag(event) {
        state.zoomDragging = true;
        state.zoomStartX = event.clientX;
        state.zoomStartScale = state.zoomScale;
        hideColorLoupe();
    }

    function updateZoomDrag(event) {
        const deltaX = event.clientX - state.zoomStartX;
        const nextScale = clamp(state.zoomStartScale + deltaX / 260, MIN_ZOOM, MAX_ZOOM);

        setZoomScale(nextScale);
    }

    function endZoomDrag() {
        state.zoomDragging = false;
    }

    function setZoomScale(scale) {
        state.zoomScale = clamp(scale, MIN_ZOOM, MAX_ZOOM);
        applyCanvasDisplayScale();
    }

    function resetZoom() {
        setZoomScale(1);
    }

    function updateZoomView() {
        if (dom.zoomValue) {
            dom.zoomValue.textContent = `${Math.round(state.zoomScale * 100)}%`;
        }

        if (dom.zoomTool) {
            dom.zoomTool.classList.toggle("is-active", state.zoomMode);
        }

        if (dom.box) {
            dom.box.classList.toggle("is-zooming", state.zoomMode);
        }
    }

    /* =========================
       Common Commands - History
    ========================= */

    function pushHistory(label) {
        if (state.isApplyingHistory || !state.workingUrl || !state.cleanUrl) {
            return;
        }

        const snapshot = {
            label,
            width: state.width,
            height: state.height,
            workingUrl: state.workingUrl,
            cleanUrl: state.cleanUrl,
            lastExtractUrl: state.lastExtractUrl,
            samples: state.samples.map((sample) => ({ ...sample })),
            part: state.part,
            completedParts: Array.from(state.completedParts),
        };

        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push(snapshot);

        if (state.history.length > HISTORY_LIMIT) {
            state.history.shift();
        }

        state.historyIndex = state.history.length - 1;
        updateHistoryButtons();
    }

    function undoHistory() {
        if (state.historyIndex <= 0) {
            return;
        }

        state.historyIndex -= 1;
        applyHistorySnapshot(state.history[state.historyIndex]);
    }

    function redoHistory() {
        if (state.historyIndex >= state.history.length - 1) {
            return;
        }

        state.historyIndex += 1;
        applyHistorySnapshot(state.history[state.historyIndex]);
    }

    function applyHistorySnapshot(snapshot) {
        if (!snapshot) {
            return;
        }

        state.isApplyingHistory = true;

        state.width = snapshot.width;
        state.height = snapshot.height;
        state.workingUrl = snapshot.workingUrl;
        state.cleanUrl = snapshot.cleanUrl;
        state.lastExtractUrl = snapshot.lastExtractUrl;
        state.samples = snapshot.samples.map((sample) => ({ ...sample }));
        state.part = snapshot.part;
        state.completedParts = new Set(snapshot.completedParts);

        state.cropMode = false;
        state.cropDraft = null;
        state.cropRect = null;
        state.erasing = false;
        state.filling = false;
        state.changedDuringDrag = false;
        hideToolCursor();
        hideColorLoupe();

        localStorage.setItem(STORAGE_KEYS.ORIGINAL_IMAGE, state.workingUrl);

        loadImage(state.workingUrl, (sourceImage) => {
            setupCanvas(snapshot.width, snapshot.height);
            drawImageToSourceCanvas(sourceImage);

            loadImage(state.cleanUrl, (cleanImage) => {
                drawImageToCleanCanvas(cleanImage);
                renderSamples();
                syncWorkspacePartState();
                renderPartGuide(state.part);
                render();
                updateHistoryButtons();
                state.isApplyingHistory = false;
            });
        });
    }

    function updateHistoryButtons() {
        if (dom.undoAction) {
            dom.undoAction.disabled = state.historyIndex <= 0;
        }

        if (dom.redoAction) {
            dom.redoAction.disabled = state.historyIndex >= state.history.length - 1;
        }
    }

    function handleCommandShortcut(event) {
        const isCtrl = event.ctrlKey || event.metaKey;

        if (!isCtrl) {
            return;
        }

        if (event.key.toLowerCase() === "z" && !event.shiftKey) {
            event.preventDefault();
            undoHistory();
            return;
        }

        if (event.key.toLowerCase() === "y" || (event.key.toLowerCase() === "z" && event.shiftKey)) {
            event.preventDefault();
            redoHistory();
        }
    }

    /* =========================
       Part 1 - Crop
    ========================= */

    function startCropMode() {
        state.cropMode = true;
        state.cropDraft = null;
        state.cropRect = null;
        disableEraserMode();
        disableFillMode();
        state.zoomMode = false;
        updateZoomView();
        showToast("자를 범위를 드래그하세요");
    }

    function updateCropDraft(pointerPos) {
        if (!state.cropDraft) {
            return;
        }

        state.cropDraft.x = Math.min(state.cropDraft.startX, pointerPos.x);
        state.cropDraft.y = Math.min(state.cropDraft.startY, pointerPos.y);
        state.cropDraft.w = Math.abs(pointerPos.x - state.cropDraft.startX);
        state.cropDraft.h = Math.abs(pointerPos.y - state.cropDraft.startY);

        drawCropGuide();
    }

    function drawCropGuide() {
        overlayCtx.clearRect(0, 0, state.width, state.height);

        const rect = state.cropDraft || state.cropRect;

        if (!rect) {
            return;
        }

        overlayCtx.save();
        overlayCtx.fillStyle = "rgba(124, 58, 237, 0.08)";
        overlayCtx.fillRect(rect.x, rect.y, rect.w, rect.h);
        overlayCtx.strokeStyle = "#7c3aed";
        overlayCtx.lineWidth = 2;
        overlayCtx.setLineDash([7, 5]);
        overlayCtx.strokeRect(rect.x, rect.y, rect.w, rect.h);
        overlayCtx.restore();
    }

    function applyCrop() {
        const rect = state.cropRect;

        if (!rect || rect.w <= 5 || rect.h <= 5) {
            showToast("자를 범위를 먼저 선택하세요");
            return;
        }

        const cropCanvas = createCanvas(Math.round(rect.w), Math.round(rect.h));
        const cropCtx = cropCanvas.getContext("2d");

        cropCtx.drawImage(
            sourceCanvas,
            rect.x,
            rect.y,
            rect.w,
            rect.h,
            0,
            0,
            cropCanvas.width,
            cropCanvas.height
        );

        state.workingUrl = cropCanvas.toDataURL("image/png");
        localStorage.setItem(STORAGE_KEYS.ORIGINAL_IMAGE, state.workingUrl);

        loadImage(state.workingUrl, (image) => {
            setupCanvas(image.naturalWidth, image.naturalHeight);
            drawImageToSourceCanvas(image);
            cleanCtx.clearRect(0, 0, state.width, state.height);
            cleanCtx.drawImage(image, 0, 0, state.width, state.height);

            state.cleanUrl = cleanCanvas.toDataURL("image/png");
            state.lastExtractUrl = state.cleanUrl;
            state.cropRect = null;
            state.cropDraft = null;
            state.cropMode = false;
            state.samples = [];

            if (dom.cropApply) {
                dom.cropApply.disabled = true;
            }

            renderSamples();
            render();
            showToast("자르기 완료");
            pushHistory("자르기");
        });
    }

    /* =========================
       Part 2 - Color Extract
    ========================= */

    function addColorSample(pointerPos) {
        const pixel = getSourcePixel(pointerPos.x, pointerPos.y);

        if (!pixel) {
            return;
        }

        const exists = state.samples.some((sample) => colorDistance(sample, pixel) <= 2);

        if (!exists) {
            state.samples.push(pixel);
        }

        renderSamples();
        extractSelectedColors({ recordHistory: true });
    }

    function renderSamples() {
        if (!dom.samples) {
            return;
        }

        if (!state.samples.length) {
            dom.samples.innerHTML = '<div class="help">이미지를 움직이면 확대경이 표시됩니다. 클릭해서 남길 색상을 고르세요.</div>';
            return;
        }

        dom.samples.innerHTML = state.samples
            .map((sample, index) => {
                const color = rgbToHex(sample).toUpperCase();

                return `
                    <div class="sample">
                        <span>
                            <i style="background:${color}"></i>
                            ${color}
                        </span>
                        <button type="button" data-index="${index}" aria-label="색상 제거">×</button>
                    </div>
                `;
            })
            .join("");

        dom.samples.querySelectorAll("button").forEach((button) => {
            button.addEventListener("click", () => {
                state.samples.splice(Number(button.dataset.index), 1);
                renderSamples();
                extractSelectedColors({ recordHistory: true });
            });
        });
    }

    function extractSelectedColors(options = {}) {
        if (!state.workingUrl || !state.width || !state.height) {
            return;
        }

        cleanCtx.clearRect(0, 0, state.width, state.height);

        if (!state.samples.length) {
            cleanCtx.drawImage(sourceCanvas, 0, 0);
            state.cleanUrl = cleanCanvas.toDataURL("image/png");
            state.lastExtractUrl = state.cleanUrl;
            render();

            if (options.recordHistory === true) {
                pushHistory("색상 초기화");
            }

            return;
        }

        const sourceImageData = sourceCtx.getImageData(0, 0, state.width, state.height);
        const imageData = cleanCtx.createImageData(state.width, state.height);
        const sourceData = sourceImageData.data;
        const data = imageData.data;

        const tolerance = getNumber(dom.tol, 45);
        const shapeColor = hexToRgb(dom.shapeColor.value);
        const backgroundColor = hexToRgb(dom.bgColor.value);
        const holeArea = getNumber(dom.hole, 0);

        for (let i = 0; i < sourceData.length; i += 4) {
            const pixel = {
                r: sourceData[i],
                g: sourceData[i + 1],
                b: sourceData[i + 2],
            };

            const isSelectedColor = state.samples.some((sample) => {
                return colorDistance(pixel, sample) <= tolerance;
            });

            if (isSelectedColor) {
                data[i] = shapeColor.r;
                data[i + 1] = shapeColor.g;
                data[i + 2] = shapeColor.b;
                data[i + 3] = 255;
            } else {
                data[i] = backgroundColor.r;
                data[i + 1] = backgroundColor.g;
                data[i + 2] = backgroundColor.b;
                data[i + 3] = 255;
            }
        }

        fillSmallHoles(imageData, shapeColor, backgroundColor, holeArea);
        cleanCtx.putImageData(imageData, 0, 0);

        state.cleanUrl = cleanCanvas.toDataURL("image/png");
        state.lastExtractUrl = state.cleanUrl;

        render();

        if (options.recordHistory === true) {
            pushHistory("색상 추출");
        }
    }

    function clearSamples() {
        state.samples = [];
        renderSamples();
        extractSelectedColors({ recordHistory: true });
    }

    function restoreOriginalPreview() {
        state.samples = [];
        renderSamples();

        cleanCtx.clearRect(0, 0, state.width, state.height);
        cleanCtx.drawImage(sourceCanvas, 0, 0);
        state.cleanUrl = cleanCanvas.toDataURL("image/png");
        state.lastExtractUrl = state.cleanUrl;

        render();
        pushHistory("원본 복구");
    }

    function fillSmallHoles(imageData, shapeColor, backgroundColor, maxArea) {
        if (maxArea <= 0) {
            return;
        }

        const data = imageData.data;
        const visited = new Uint8Array(state.width * state.height);

        const isBackground = (index) => {
            const offset = index * 4;

            return (
                data[offset] === backgroundColor.r &&
                data[offset + 1] === backgroundColor.g &&
                data[offset + 2] === backgroundColor.b
            );
        };

        const paintShape = (index) => {
            const offset = index * 4;

            data[offset] = shapeColor.r;
            data[offset + 1] = shapeColor.g;
            data[offset + 2] = shapeColor.b;
            data[offset + 3] = 255;
        };

        for (let y = 0; y < state.height; y += 1) {
            for (let x = 0; x < state.width; x += 1) {
                const startIndex = y * state.width + x;

                if (visited[startIndex] || !isBackground(startIndex)) {
                    continue;
                }

                const result = collectConnectedArea(startIndex, visited, isBackground);

                if (!result.touchesEdge && result.cells.length <= maxArea) {
                    result.cells.forEach(paintShape);
                }
            }
        }
    }

    /* =========================
       Part 2 - Loupe
    ========================= */

    function updateColorLoupe(event) {
        if (!shouldShowColorLoupe()) {
            hideColorLoupe();
            return;
        }

        const pointerPos = getCanvasPointer(event);
        const pixel = getSourcePixel(pointerPos.x, pointerPos.y);

        if (!pixel) {
            hideColorLoupe();
            return;
        }

        drawLoupeCanvas(pointerPos);
        updateLoupeText(pointerPos, pixel);
        positionColorLoupe(event);

        dom.colorLoupe.classList.add("is-show");
        dom.colorLoupe.setAttribute("aria-hidden", "false");
    }

    function shouldShowColorLoupe() {
        return (
            state.part === 2 &&
            !state.zoomMode &&
            !state.zoomDragging &&
            dom.colorLoupe &&
            loupeCanvas &&
            loupeCtx &&
            state.width > 0 &&
            state.height > 0
        );
    }

    function drawLoupeCanvas(pointerPos) {
        const lensSize = loupeCanvas.width;
        const zoom = 10;
        const sampleSize = Math.ceil(lensSize / zoom);
        const half = Math.floor(sampleSize / 2);
        const centerX = Math.round(pointerPos.x);
        const centerY = Math.round(pointerPos.y);

        const sx = clamp(centerX - half, 0, Math.max(0, state.width - sampleSize));
        const sy = clamp(centerY - half, 0, Math.max(0, state.height - sampleSize));

        loupeCtx.save();
        loupeCtx.clearRect(0, 0, lensSize, lensSize);
        loupeCtx.imageSmoothingEnabled = false;
        loupeCtx.drawImage(sourceCanvas, sx, sy, sampleSize, sampleSize, 0, 0, lensSize, lensSize);

        const cell = lensSize / sampleSize;
        const targetCellX = centerX - sx;
        const targetCellY = centerY - sy;
        const targetX = targetCellX * cell;
        const targetY = targetCellY * cell;
        const crossX = targetX + cell / 2;
        const crossY = targetY + cell / 2;

        loupeCtx.strokeStyle = "rgba(15, 23, 42, 0.16)";
        loupeCtx.lineWidth = 1;

        for (let i = 1; i < sampleSize; i += 1) {
            const p = i * cell;
            loupeCtx.beginPath();
            loupeCtx.moveTo(p, 0);
            loupeCtx.lineTo(p, lensSize);
            loupeCtx.stroke();

            loupeCtx.beginPath();
            loupeCtx.moveTo(0, p);
            loupeCtx.lineTo(lensSize, p);
            loupeCtx.stroke();
        }

        loupeCtx.strokeStyle = "rgba(17, 24, 39, 0.95)";
        loupeCtx.lineWidth = 1.5;
        loupeCtx.beginPath();
        loupeCtx.moveTo(crossX, 0);
        loupeCtx.lineTo(crossX, lensSize);
        loupeCtx.moveTo(0, crossY);
        loupeCtx.lineTo(lensSize, crossY);
        loupeCtx.stroke();

        loupeCtx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        loupeCtx.lineWidth = 1;
        loupeCtx.strokeRect(targetX + 1, targetY + 1, cell - 2, cell - 2);

        loupeCtx.strokeStyle = "rgba(17, 24, 39, 0.95)";
        loupeCtx.lineWidth = 1;
        loupeCtx.strokeRect(targetX + 0.5, targetY + 0.5, cell - 1, cell - 1);
        loupeCtx.restore();
    }

    function updateLoupeText(pointerPos, pixel) {
        const hex = rgbToHex(pixel).toUpperCase();
        const x = Math.floor(pointerPos.x);
        const y = Math.floor(pointerPos.y);

        if (dom.loupeChip) {
            dom.loupeChip.style.background = hex;
        }

        if (dom.loupeHex) {
            dom.loupeHex.textContent = hex;
        }

        if (dom.loupeRgb) {
            dom.loupeRgb.textContent = `RGB ${pixel.r}, ${pixel.g}, ${pixel.b}`;
        }

        if (dom.loupePoint) {
            dom.loupePoint.textContent = `X ${x}, Y ${y}`;
        }
    }

    function positionColorLoupe(event) {
        const boxRect = dom.box.getBoundingClientRect();
        const localX = event.clientX - boxRect.left;
        const localY = event.clientY - boxRect.top;

        const loupeWidth = 168;
        const loupeHeight = 205;
        let x = localX + 18;
        let y = localY + 18;

        if (x + loupeWidth > boxRect.width) {
            x = localX - loupeWidth - 18;
        }

        if (y + loupeHeight > boxRect.height) {
            y = localY - loupeHeight - 18;
        }

        x = clamp(x, 8, Math.max(8, boxRect.width - loupeWidth - 8));
        y = clamp(y, 8, Math.max(8, boxRect.height - loupeHeight - 8));

        dom.colorLoupe.style.transform = `translate(${x}px, ${y}px)`;
    }

    function hideColorLoupeIfInvalid() {
        if (state.part !== 2 || state.zoomMode) {
            hideColorLoupe();
        }
    }

    function hideColorLoupe() {
        if (!dom.colorLoupe) {
            return;
        }

        dom.colorLoupe.classList.remove("is-show");
        dom.colorLoupe.setAttribute("aria-hidden", "true");
    }

    function getSourcePixel(x, y) {
        const px = clamp(Math.floor(x), 0, Math.max(0, state.width - 1));
        const py = clamp(Math.floor(y), 0, Math.max(0, state.height - 1));

        if (!state.width || !state.height) {
            return null;
        }

        const imageData = sourceCtx.getImageData(px, py, 1, 1);
        const data = imageData.data;

        return {
            r: data[0],
            g: data[1],
            b: data[2],
        };
    }

    /* =========================
       Part 3 - Clean
    ========================= */

    function toggleEraserMode() {
        if (state.eraserMode) {
            disableEraserMode();
            showToast("지우개 모드 종료");
            return;
        }

        enableEraserMode();
    }

    function toggleFillMode() {
        if (state.fillMode) {
            disableFillMode();
            showToast("브러쉬 채우기 모드 종료");
            return;
        }

        enableFillMode();
    }

    function syncToolButtons() {
        if (dom.eraser) {
            dom.eraser.classList.toggle("is-active", state.eraserMode);
        }

        if (dom.rectFill) {
            dom.rectFill.classList.toggle("is-active", state.fillMode);
        }
    }

    function enableEraserMode() {
        state.eraserMode = true;
        state.fillMode = false;
        state.erasing = false;
        state.filling = false;
        state.zoomMode = false;
        hideColorLoupe();
        updateZoomView();
        syncToolButtons();

        if (dom.box) {
            dom.box.classList.add("is-erasing");
        }

        showToast("지우개 모드: 다시 누르면 종료됩니다");
    }

    function disableEraserMode() {
        state.eraserMode = false;
        state.erasing = false;
        syncToolButtons();
        hideToolCursor();
    }

    function enableFillMode() {
        state.fillMode = true;
        state.eraserMode = false;
        state.erasing = false;
        state.filling = false;
        state.zoomMode = false;
        hideColorLoupe();
        updateZoomView();
        syncToolButtons();
        hideToolCursor();
        showToast("브러쉬 채우기 모드: 다시 누르면 종료됩니다");
    }

    function disableFillMode() {
        state.fillMode = false;
        state.filling = false;
        syncToolButtons();
        hideToolCursor();
        render();
    }

    function eraseAt(pointerPos) {
        const size = getNumber(dom.eraserSize, 18);
        const backgroundColor = dom.bgColor.value;

        cleanCtx.save();
        cleanCtx.fillStyle = backgroundColor;
        cleanCtx.beginPath();
        cleanCtx.arc(pointerPos.x, pointerPos.y, size / 2, 0, Math.PI * 2);
        cleanCtx.fill();
        cleanCtx.restore();

        state.cleanUrl = cleanCanvas.toDataURL("image/png");
        state.changedDuringDrag = true;
        render();
    }

    function fillAt(pointerPos) {
        const size = getNumber(dom.eraserSize, 18);
        const shapeColor = dom.shapeColor.value;

        cleanCtx.save();
        cleanCtx.fillStyle = shapeColor;
        cleanCtx.beginPath();
        cleanCtx.arc(pointerPos.x, pointerPos.y, size / 2, 0, Math.PI * 2);
        cleanCtx.fill();
        cleanCtx.restore();

        state.cleanUrl = cleanCanvas.toDataURL("image/png");
        state.lastExtractUrl = state.cleanUrl;
        state.changedDuringDrag = true;
        render();
    }

    function removeSmallFragments() {
        disableEraserMode();
        disableFillMode();

        const shapeColor = hexToRgb(dom.shapeColor.value);
        const backgroundColor = hexToRgb(dom.bgColor.value);
        const minArea = getNumber(dom.cleanupArea, 180);

        const imageData = cleanCtx.getImageData(0, 0, state.width, state.height);
        const data = imageData.data;
        const visited = new Uint8Array(state.width * state.height);

        const isShape = (index) => {
            const offset = index * 4;

            return (
                data[offset] === shapeColor.r &&
                data[offset + 1] === shapeColor.g &&
                data[offset + 2] === shapeColor.b
            );
        };

        const paintBackground = (index) => {
            const offset = index * 4;

            data[offset] = backgroundColor.r;
            data[offset + 1] = backgroundColor.g;
            data[offset + 2] = backgroundColor.b;
            data[offset + 3] = 255;
        };

        for (let y = 0; y < state.height; y += 1) {
            for (let x = 0; x < state.width; x += 1) {
                const startIndex = y * state.width + x;

                if (visited[startIndex] || !isShape(startIndex)) {
                    continue;
                }

                const result = collectConnectedArea(startIndex, visited, isShape);

                if (result.cells.length <= minArea) {
                    result.cells.forEach(paintBackground);
                }
            }
        }

        cleanCtx.putImageData(imageData, 0, 0);

        state.cleanUrl = cleanCanvas.toDataURL("image/png");
        render();
        showToast("자동 제거 완료");
        pushHistory("작은 조각 제거");
    }

    function restoreLastExtract() {
        disableEraserMode();
        disableFillMode();

        if (!state.lastExtractUrl) {
            return;
        }

        loadImage(state.lastExtractUrl, (image) => {
            cleanCtx.clearRect(0, 0, state.width, state.height);
            cleanCtx.drawImage(image, 0, 0, state.width, state.height);
            state.cleanUrl = cleanCanvas.toDataURL("image/png");
            render();
            pushHistory("추출본 복구");
        });
    }

    function saveStage1() {
        localStorage.setItem(STORAGE_KEYS.CLEAN_IMAGE, state.cleanUrl);
        localStorage.setItem(
            STORAGE_KEYS.IMAGE_META,
            JSON.stringify({
                width: state.width,
                height: state.height,
            })
        );

        state.completedParts.add(3);
        syncWorkspacePartState();

        showToast("Stage1 자동 저장 완료");
    }

    function moveToStage2() {
        saveStage1();
        window.location.href = PAGE_URL.STAGE2;
    }

    /* =========================
       Pointer Events
    ========================= */

    function handlePointerDown(event) {
        if (state.zoomMode) {
            beginZoomDrag(event);
            return;
        }

        const pointerPos = getCanvasPointer(event);

        if (state.part === 1 && state.cropMode) {
            state.cropDraft = {
                x: pointerPos.x,
                y: pointerPos.y,
                w: 0,
                h: 0,
                startX: pointerPos.x,
                startY: pointerPos.y,
            };
            return;
        }

        if (state.part === 2) {
            addColorSample(pointerPos);
            updateColorLoupe(event);
            return;
        }

        if (state.part === 3 && state.eraserMode) {
            updateToolCursor(pointerPos);
            state.erasing = true;
            state.changedDuringDrag = false;
            eraseAt(pointerPos);
            return;
        }

        if (state.part === 3 && state.fillMode) {
            updateToolCursor(pointerPos);
            state.filling = true;
            state.changedDuringDrag = false;
            fillAt(pointerPos);
        }
    }

    function handleOverlayPointerMove(event) {
        if (state.part === 2 && !state.zoomMode && !state.zoomDragging) {
            updateColorLoupe(event);
        }
    }

    function handlePointerMove(event) {
        if (state.zoomDragging) {
            updateZoomDrag(event);
            return;
        }

        const pointerPos = getCanvasPointer(event);

        if (state.cropDraft) {
            updateCropDraft(pointerPos);
        }

        if (state.part === 3 && isToolModeActive()) {
            updateToolCursor(pointerPos);
        }

        if (state.erasing) {
            eraseAt(pointerPos);
        }

        if (state.filling) {
            fillAt(pointerPos);
        }
    }

    function handlePointerUp() {
        if (state.zoomDragging) {
            endZoomDrag();
            return;
        }

        if (state.cropDraft) {
            state.cropRect = {
                x: state.cropDraft.x,
                y: state.cropDraft.y,
                w: state.cropDraft.w,
                h: state.cropDraft.h,
            };

            state.cropDraft = null;
            state.cropMode = false;

            if (dom.cropApply) {
                dom.cropApply.disabled = !(state.cropRect.w > 5 && state.cropRect.h > 5);
            }

            drawCropGuide();
        }

        const didBrushWork = state.changedDuringDrag;
        const brushLabel = state.erasing ? "지우개" : state.filling ? "브러쉬 채우기" : "";

        state.erasing = false;
        state.filling = false;
        state.changedDuringDrag = false;

        if (didBrushWork) {
            pushHistory(brushLabel);
        }
    }

    function handlePointerLeave() {
        hideColorLoupe();

        if (state.part === 3 && isToolModeActive() && !state.erasing && !state.filling) {
            hideToolCursor();
        }
    }

    function handlePointerEnter(event) {
        if (state.part === 2) {
            updateColorLoupe(event);
        }

        if (state.part === 3 && isToolModeActive()) {
            updateToolCursor(getCanvasPointer(event));
        }
    }

    function getCanvasPointer(event) {
        const rect = overlay.getBoundingClientRect();

        return {
            x: clamp((event.clientX - rect.left) * overlay.width / rect.width, 0, state.width - 1),
            y: clamp((event.clientY - rect.top) * overlay.height / rect.height, 0, state.height - 1),
        };
    }

    function isToolModeActive() {
        return state.eraserMode || state.fillMode;
    }

    function updateToolCursor(pointerPos) {
        state.lastPointerPos = pointerPos;

        if (!(state.part === 3 && isToolModeActive())) {
            hideToolCursor();
            return;
        }

        const size = getNumber(dom.eraserSize, 18);
        const scale = parseFloat(canvas.style.width) / state.width || 1;
        const cursorSize = size * scale;

        dom.eraserCursor.style.display = "block";
        dom.eraserCursor.style.borderColor = state.fillMode ? "#10b981" : "#111827";
        dom.eraserCursor.style.width = `${cursorSize}px`;
        dom.eraserCursor.style.height = `${cursorSize}px`;
        dom.eraserCursor.style.transform = `translate(${pointerPos.x * scale - cursorSize / 2}px, ${pointerPos.y * scale - cursorSize / 2}px)`;

        dom.box.classList.add("is-erasing");
    }

    function hideToolCursor() {
        if (!dom.eraserCursor || !dom.box) {
            return;
        }

        dom.eraserCursor.style.display = "none";
        dom.box.classList.remove("is-erasing");
        state.lastPointerPos = null;
    }

    /* =========================
       Shared Algorithms
    ========================= */

    function collectConnectedArea(startIndex, visited, predicate) {
        const queue = [startIndex];
        const cells = [];

        let head = 0;
        let touchesEdge = false;

        visited[startIndex] = 1;

        while (head < queue.length) {
            const index = queue[head];
            head += 1;

            const x = index % state.width;
            const y = Math.floor(index / state.width);

            cells.push(index);

            if (x === 0 || y === 0 || x === state.width - 1 || y === state.height - 1) {
                touchesEdge = true;
            }

            visitNeighbor(x + 1, y);
            visitNeighbor(x - 1, y);
            visitNeighbor(x, y + 1);
            visitNeighbor(x, y - 1);
        }

        return {
            cells,
            touchesEdge,
        };

        function visitNeighbor(x, y) {
            if (x < 0 || y < 0 || x >= state.width || y >= state.height) {
                return;
            }

            const nextIndex = y * state.width + x;

            if (!visited[nextIndex] && predicate(nextIndex)) {
                visited[nextIndex] = 1;
                queue.push(nextIndex);
            }
        }
    }

    /* =========================
       Utils
    ========================= */

    function loadImage(url, callback) {
        const image = new Image();

        image.onload = () => callback(image);
        image.onerror = () => showToast("이미지를 불러오지 못했습니다");
        image.src = url;
    }

    function createCanvas(width, height) {
        const target = document.createElement("canvas");
        target.width = width;
        target.height = height;
        return target;
    }

    function getNumber(element, fallback) {
        if (!element) {
            return fallback;
        }

        const value = Number(element.value);
        return Number.isFinite(value) ? value : fallback;
    }

    function hexToRgb(hex) {
        return {
            r: parseInt(hex.slice(1, 3), 16),
            g: parseInt(hex.slice(3, 5), 16),
            b: parseInt(hex.slice(5, 7), 16),
        };
    }

    function rgbToHex(color) {
        return `#${[color.r, color.g, color.b]
            .map((value) => value.toString(16).padStart(2, "0"))
            .join("")}`;
    }

    function colorDistance(a, b) {
        return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function showToast(message) {
        if (!dom.toast) {
            return;
        }

        dom.toast.textContent = message;
        dom.toast.classList.add("show");

        window.setTimeout(() => {
            dom.toast.classList.remove("show");
        }, 2000);
    }
})();
