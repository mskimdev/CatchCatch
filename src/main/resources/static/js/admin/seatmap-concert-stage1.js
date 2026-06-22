(() => {
    "use strict";

    const STORAGE_KEYS = {
        ORIGINAL_IMAGE: "concert_originalImage",
        CLEAN_IMAGE: "concert_cleanImage",
        IMAGE_META: "concert_imageMeta",
        SIMPLIFY_BASE_IMAGE: "concert_simplifyBaseImage",
        STAGE1_SETTINGS: "concert_stage1Settings",
    };

    const PAGE_URL = {
        STAGE2: "/admin/seatmap/concert/stage2",
    };

    const HISTORY_LIMIT = 30;
    const MIN_ZOOM = 0.25;
    const MAX_ZOOM = 4;
    const FIXED_BACKGROUND_COLOR = "#f7f7f7";

    const dom = {};
    const state = {
        width: 0,
        height: 0,

        originalUrl: null,
        workingUrl: null,
        cleanUrl: null,
        lastExtractUrl: null,

        simplifyBaseUrl: null,
        simplifiedUrl: null,

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

        rotationMode: false,
        rotationDragging: false,
        rotationBaseUrl: null,
        rotationStartX: 0,
        rotationStartDeg: 0,
        rotationDeg: 0,
        rotationMoved: false,

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
        applySavedStage1Settings();
        bindEvents();
        syncHoleValue();
        initializeWorkspaceSteps();
        renderPartGuide(state.part);
        updateHistoryButtons();
        updateZoomView();
        updateRotationView();

        state.originalUrl = localStorage.getItem(STORAGE_KEYS.ORIGINAL_IMAGE);
        state.workingUrl = state.originalUrl;
        state.rotationBaseUrl = state.workingUrl;
        state.simplifyBaseUrl = localStorage.getItem(STORAGE_KEYS.SIMPLIFY_BASE_IMAGE);
        state.cleanUrl = localStorage.getItem(STORAGE_KEYS.CLEAN_IMAGE) || state.workingUrl;
        state.lastExtractUrl = state.cleanUrl;

        if (!state.originalUrl) {
            showToast("메인에서 이미지를 업로드하세요");
            renderSamples();
            updateSimplifyInfo("적용 전");
            return;
        }

        loadImage(state.workingUrl, (sourceImage) => {
            setupCanvas(sourceImage.naturalWidth, sourceImage.naturalHeight);
            drawImageToSourceCanvas(sourceImage);

            loadImage(state.cleanUrl, (cleanImage) => {
                drawImageToCleanCanvas(cleanImage);
                render();
                renderSamples();
                updateSimplifyInfo("적용 전");
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
            "rotateTool",
            "rotateValue",
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
            "tab4",
            "part1",
            "part2",
            "part3",
            "part4",
            "stage1Guide",

            "cropStart",
            "cropApply",
            "go2",
            "go3",
            "go4",

            "simplifyScale",
            "simplifyStep",
            "simplifyApply",
            "simplifyReset",
            "simplifyInfo",

            "samples",
            "tol",
            "alpha",
            "shapeColor",
            "backgroundColor",
            "clearRemoveSamples",
            "removeSamplesClear",
            "hole",
            "holeValue",
            "viewMode",
            "restoreOriginal",
            "invertExtract",

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
        bindIfExists("tab4", "click", () => showPart(4));

        bindIfExists("go2", "click", () => moveNextPart(1, 2));
        bindIfExists("go3", "click", () => moveNextPart(2, 3));
        bindIfExists("go4", "click", () => moveNextPart(3, 4));

        bindIfExists("cropStart", "click", startCropMode);
        bindIfExists("cropApply", "click", applyCrop);

        bindIfExists("simplifyApply", "click", applyImageSimplify);
        bindIfExists("simplifyReset", "click", resetImageSimplify);

        overlay.addEventListener("pointerdown", handlePointerDown);
        overlay.addEventListener("pointerleave", handlePointerLeave);
        overlay.addEventListener("pointerenter", handlePointerEnter);
        overlay.addEventListener("pointermove", handleOverlayPointerMove);

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);

        ["tol", "alpha", "shapeColor", "backgroundColor", "hole", "viewMode"].forEach((id) => {
            if (!dom[id]) {
                return;
            }

            dom[id].addEventListener("input", () => {
                if (id === "hole") {
                    syncHoleValue();
                }

                extractSelectedColors();
            });

            dom[id].addEventListener("change", () => {
                if (id === "hole") {
                    syncHoleValue();
                }

                extractSelectedColors({ recordHistory: true });
            });
        });

        bindIfExists("restoreOriginal", "click", restoreOriginalPreview);
        bindIfExists("invertExtract", "click", invertExtractedMask);
        bindIfExists("clearRemoveSamples", "click", clearRemoveSamples);
        bindIfExists("removeSamplesClear", "click", clearRemoveSamples);

        bindIfExists("eraser", "click", toggleEraserMode);
        bindIfExists("rectFill", "click", toggleFillMode);

        if (dom.eraserSize) {
            dom.eraserSize.addEventListener("input", () => {
                if (state.part === 4 && state.lastPointerPos) {
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
        bindIfExists("rotateTool", "click", toggleRotationMode);
        bindIfExists("zoomReset", "click", resetZoom);

        document.addEventListener("keydown", handleCommandShortcut);
    }

    function bindIfExists(id, eventName, handler) {
        if (!dom[id]) {
            return;
        }

        dom[id].addEventListener(eventName, handler);
    }

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
        updateRotationView();
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

        if (state.part === 2) {
            ctx.drawImage(sourceCanvas, 0, 0);
            drawRemoveSampleMarkers();
            if (state.lastPointerPos) {
                updateRemoveColorCursor(state.lastPointerPos);
            }
            return;
        }

        if (state.part === 3 && isMixedPreviewMode()) {
            ctx.drawImage(sourceCanvas, 0, 0);
            drawPreviewOverlay();
            return;
        }

        ctx.drawImage(cleanCanvas, 0, 0);

        if (state.part === 4 && isToolModeActive() && state.lastPointerPos) {
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
        const shapeColor = getShapeColorRgb();
        const alpha = Math.round((getNumber(dom.alpha, 100) / 100) * 255);

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
        return state.part === 3 && dom.viewMode && dom.viewMode.value === "mix";
    }

    function showPart(partNumber) {
        completePreviousParts(partNumber);

        state.part = partNumber;
        syncWorkspacePartState();
        renderPartGuide(partNumber);

        if (dom.title) {
            dom.title.textContent = getPartTitle(partNumber);
        }

        if (partNumber !== 2 && partNumber !== 3) {
            hideColorLoupe();
        }

        if (partNumber !== 2 && partNumber !== 4) {
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
        [1, 2, 3, 4].forEach((number) => {
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
        [1, 2, 3, 4].forEach((number) => {
            if (dom[`part${number}`]) {
                dom[`part${number}`].classList.remove("hidden");
            }
        });

        syncWorkspacePartState();
    }

    function getPartTitle(partNumber) {
        if (partNumber === 1) {
            return "원본 / 방향 / 자르기";
        }

        if (partNumber === 2) {
            return "제거 색상 선택";
        }

        if (partNumber === 3) {
            return "제거 결과 확인";
        }

        return "추출본 다듬기";
    }

    function renderPartGuide(partNumber) {
        if (!dom.stage1Guide) {
            return;
        }

        const guideText = {
            1: "상단 회전 도구로 STAGE가 위쪽을 향하도록 방향을 맞춘 뒤, 도면 영역만 남기고 제목, 범례, 여백은 제거하세요.",
            2: "가운데 이미지에서 흰색, 검은색, 회색, 글자, 무대처럼 필요 없는 색을 클릭하세요. 선택한 색은 배경색으로 제거됩니다.",
            3: "제거 결과를 확인하세요. 선택한 색은 배경색, 남은 영역은 도형색으로 정리됩니다.",
            4: "먼저 작은 선/조각을 자동 제거하고, 남는 부분만 지우개 또는 브러쉬로 수동 보정하세요.",
        };

        dom.stage1Guide.textContent = guideText[partNumber] || "";
    }

    function toggleZoomMode() {
        state.zoomMode = !state.zoomMode;

        if (state.zoomMode) {
            state.rotationMode = false;
            state.rotationDragging = false;
            clearRotationPreviewTransform();
            updateRotationView();

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

    function toggleRotationMode() {
        state.rotationMode = !state.rotationMode;

        if (state.rotationMode) {
            if (state.part !== 1) {
                showPart(1);
            }

            state.zoomMode = false;
            state.cropMode = false;
            state.cropDraft = null;
            state.cropRect = null;

            disableEraserMode();
            disableFillMode();
            hideColorLoupe();

            if (dom.cropApply) {
                dom.cropApply.disabled = true;
            }

            showToast("회전 모드: 이미지를 누른 채 좌우로 드래그하세요");
        } else {
            clearRotationPreviewTransform();
            state.rotationDragging = false;
            state.rotationMoved = false;
            state.rotationDeg = 0;
        }

        updateRotationView();
        updateZoomView();
        render();
    }

    function beginRotationDrag(event) {
        if (!state.workingUrl) {
            return;
        }

        clearRotationPreviewTransform();

        state.rotationDragging = true;
        state.rotationMoved = false;
        state.rotationBaseUrl = state.workingUrl;
        state.rotationStartX = event.clientX;
        state.rotationStartDeg = 0;
        state.rotationDeg = 0;

        hideColorLoupe();
        hideToolCursor();

        updateRotationView();
    }

    function updateRotationDrag(event) {
        const deltaX = event.clientX - state.rotationStartX;
        const nextDegree = clampRotation(Math.round((state.rotationStartDeg + deltaX / 4) * 10) / 10);

        if (nextDegree === state.rotationDeg) {
            return;
        }

        state.rotationMoved = true;
        state.rotationDeg = nextDegree;

        syncRotateValue();
        applyRotationPreviewTransform();
    }

    function endRotationDrag() {
        state.rotationDragging = false;

        if (!state.rotationMoved || state.rotationDeg === 0) {
            clearRotationPreviewTransform();

            state.rotationDeg = 0;
            state.rotationMoved = false;

            syncRotateValue();
            updateRotationView();
            render();
            return;
        }

        commitRotationOnce();
    }

    function applyRotationPreviewTransform() {
        const transformValue = `rotate(${state.rotationDeg}deg)`;

        canvas.style.transformOrigin = "center center";
        overlay.style.transformOrigin = "center center";

        canvas.style.transform = transformValue;
        overlay.style.transform = transformValue;

        if (dom.box) {
            dom.box.style.overflow = "visible";
        }
    }

    function clearRotationPreviewTransform() {
        canvas.style.transform = "";
        overlay.style.transform = "";
        canvas.style.transformOrigin = "";
        overlay.style.transformOrigin = "";

        if (dom.box) {
            dom.box.style.overflow = "";
        }
    }

    function commitRotationOnce() {
        const baseUrl = state.rotationBaseUrl;
        const degree = state.rotationDeg;

        clearRotationPreviewTransform();

        if (!baseUrl) {
            state.rotationDeg = 0;
            state.rotationMoved = false;
            syncRotateValue();
            updateRotationView();
            return;
        }

        loadImage(baseUrl, (image) => {
            const baseCanvas = createCanvas(image.naturalWidth, image.naturalHeight);
            const baseCtx = baseCanvas.getContext("2d", { willReadFrequently: true });

            baseCtx.clearRect(0, 0, baseCanvas.width, baseCanvas.height);
            baseCtx.drawImage(image, 0, 0);

            const rotatedCanvas = rotateCanvasByDegree(baseCanvas, degree);

            replaceWorkingImageFromCanvas(rotatedCanvas, {
                keepSimplifyBase: false,
            });

            state.rotationBaseUrl = state.workingUrl;
            state.rotationDeg = 0;
            state.rotationMoved = false;

            syncRotateValue();
            updateRotationView();

            pushHistory("이미지 회전");
            showToast("회전 적용 완료");
        });
    }

    function updateRotationView() {
        if (dom.rotateTool) {
            dom.rotateTool.classList.toggle("is-active", state.rotationMode);
            dom.rotateTool.classList.toggle("is-rotate-active", state.rotationMode);
        }

        if (dom.box) {
            dom.box.classList.toggle("is-rotating", state.rotationMode);
            dom.box.classList.toggle("is-rotate-dragging", state.rotationDragging);
        }

        syncRotateValue();
    }

    function syncRotateValue() {
        if (!dom.rotateValue) {
            return;
        }

        dom.rotateValue.textContent = `${state.rotationDeg}°`;
    }

    function rotateCanvasByDegree(source, degree) {
        const radian = degree * Math.PI / 180;
        const sin = Math.abs(Math.sin(radian));
        const cos = Math.abs(Math.cos(radian));

        const nextWidth = Math.ceil(source.width * cos + source.height * sin);
        const nextHeight = Math.ceil(source.width * sin + source.height * cos);

        const result = createCanvas(nextWidth, nextHeight);
        const resultCtx = result.getContext("2d", { willReadFrequently: true });

        resultCtx.save();
        resultCtx.fillStyle = FIXED_BACKGROUND_COLOR;
        resultCtx.fillRect(0, 0, nextWidth, nextHeight);
        resultCtx.translate(nextWidth / 2, nextHeight / 2);
        resultCtx.rotate(radian);
        resultCtx.drawImage(source, -source.width / 2, -source.height / 2);
        resultCtx.restore();

        return result;
    }

    function clampRotation(degree) {
        return Math.max(-180, Math.min(180, degree));
    }

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
            simplifyBaseUrl: state.simplifyBaseUrl,
            simplifiedUrl: state.simplifiedUrl,
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
        state.simplifyBaseUrl = snapshot.simplifyBaseUrl || null;
        state.simplifiedUrl = snapshot.simplifiedUrl || null;
        state.samples = snapshot.samples.map((sample) => ({ ...sample }));
        state.part = snapshot.part;
        state.completedParts = new Set(snapshot.completedParts);

        state.cropMode = false;
        state.cropDraft = null;
        state.cropRect = null;
        state.erasing = false;
        state.filling = false;
        state.zoomDragging = false;
        state.rotationDragging = false;
        state.rotationDeg = 0;
        state.rotationMoved = false;
        state.changedDuringDrag = false;

        clearRotationPreviewTransform();
        hideToolCursor();
        hideColorLoupe();

        localStorage.setItem(STORAGE_KEYS.ORIGINAL_IMAGE, state.workingUrl);

        if (state.simplifyBaseUrl) {
            localStorage.setItem(STORAGE_KEYS.SIMPLIFY_BASE_IMAGE, state.simplifyBaseUrl);
        } else {
            localStorage.removeItem(STORAGE_KEYS.SIMPLIFY_BASE_IMAGE);
        }

        loadImage(state.workingUrl, (sourceImage) => {
            setupCanvas(snapshot.width, snapshot.height);
            drawImageToSourceCanvas(sourceImage);

            loadImage(state.cleanUrl, (cleanImage) => {
                drawImageToCleanCanvas(cleanImage);
                renderSamples();
                syncWorkspacePartState();
                renderPartGuide(state.part);
                updateRotationView();
                updateSimplifyInfo(state.simplifyBaseUrl ? "이전 보정 상태" : "적용 전");
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

    function startCropMode() {
        state.cropMode = true;
        state.cropDraft = null;
        state.cropRect = null;
        disableEraserMode();
        disableFillMode();
        state.zoomMode = false;
        state.rotationMode = false;
        clearRotationPreviewTransform();
        updateZoomView();
        updateRotationView();
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

        replaceWorkingImageFromCanvas(cropCanvas, {
            keepSimplifyBase: false,
        });

        state.rotationBaseUrl = state.workingUrl;
        state.simplifyBaseUrl = null;
        state.simplifiedUrl = null;
        localStorage.removeItem(STORAGE_KEYS.SIMPLIFY_BASE_IMAGE);

        updateSimplifyInfo("적용 전");
        showToast("자르기 완료");
        pushHistory("자르기");
    }

    function applyImageSimplify() {
        if (!state.workingUrl || !state.width || !state.height) {
            showToast("적용할 이미지가 없습니다");
            return;
        }

        if (!state.simplifyBaseUrl) {
            state.simplifyBaseUrl = state.workingUrl;
            localStorage.setItem(STORAGE_KEYS.SIMPLIFY_BASE_IMAGE, state.simplifyBaseUrl);
        }

        const scale = getNumber(dom.simplifyScale, 2);
        const step = getNumber(dom.simplifyStep, 16);

        loadImage(state.simplifyBaseUrl, (image) => {
            const nextWidth = Math.max(1, Math.round(image.naturalWidth * scale));
            const nextHeight = Math.max(1, Math.round(image.naturalHeight * scale));

            const nextCanvas = createCanvas(nextWidth, nextHeight);
            const nextCtx = nextCanvas.getContext("2d", { willReadFrequently: true });

            nextCtx.imageSmoothingEnabled = false;
            nextCtx.clearRect(0, 0, nextWidth, nextHeight);
            nextCtx.drawImage(image, 0, 0, nextWidth, nextHeight);

            simplifyCanvasColors(nextCanvas, step);
            replaceWorkingImageFromCanvas(nextCanvas, {
                keepSimplifyBase: true,
            });

            state.simplifiedUrl = state.workingUrl;
            updateSimplifyInfo(`${image.naturalWidth}×${image.naturalHeight} → ${nextWidth}×${nextHeight}, 색상 단순화 ${step} 적용`);
            showToast("확대 + 색상 단순화 완료");
            pushHistory("확대 + 색상 단순화");
        });
    }

    function resetImageSimplify() {
        const baseUrl = state.simplifyBaseUrl || localStorage.getItem(STORAGE_KEYS.SIMPLIFY_BASE_IMAGE);

        if (!baseUrl) {
            showToast("복구할 이미지가 없습니다");
            return;
        }

        loadImage(baseUrl, (image) => {
            const baseCanvas = createCanvas(image.naturalWidth, image.naturalHeight);
            const baseCtx = baseCanvas.getContext("2d", { willReadFrequently: true });

            baseCtx.clearRect(0, 0, baseCanvas.width, baseCanvas.height);
            baseCtx.drawImage(image, 0, 0);

            replaceWorkingImageFromCanvas(baseCanvas, {
                keepSimplifyBase: false,
            });

            state.simplifyBaseUrl = null;
            state.simplifiedUrl = null;
            localStorage.removeItem(STORAGE_KEYS.SIMPLIFY_BASE_IMAGE);

            updateSimplifyInfo("단순화 전으로 복구됨");
            showToast("단순화 전으로 복구 완료");
            pushHistory("단순화 복구");
        });
    }

    function simplifyCanvasColors(targetCanvas, step) {
        const targetCtx = targetCanvas.getContext("2d", { willReadFrequently: true });
        const imageData = targetCtx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            data[i] = quantizeColorValue(data[i], step);
            data[i + 1] = quantizeColorValue(data[i + 1], step);
            data[i + 2] = quantizeColorValue(data[i + 2], step);
            data[i + 3] = 255;
        }

        targetCtx.putImageData(imageData, 0, 0);
    }

    function quantizeColorValue(value, step) {
        return clamp(Math.round(value / step) * step, 0, 255);
    }

    function updateSimplifyInfo(text) {
        if (!dom.simplifyInfo) {
            return;
        }

        dom.simplifyInfo.textContent = text;
    }

    function replaceWorkingImageFromCanvas(nextCanvas, options = {}) {
        state.workingUrl = nextCanvas.toDataURL("image/png");
        state.originalUrl = state.workingUrl;

        localStorage.setItem(STORAGE_KEYS.ORIGINAL_IMAGE, state.workingUrl);

        setupCanvas(nextCanvas.width, nextCanvas.height);

        sourceCtx.clearRect(0, 0, state.width, state.height);
        sourceCtx.drawImage(nextCanvas, 0, 0, state.width, state.height);

        cleanCtx.clearRect(0, 0, state.width, state.height);
        cleanCtx.drawImage(nextCanvas, 0, 0, state.width, state.height);

        state.cleanUrl = cleanCanvas.toDataURL("image/png");
        state.lastExtractUrl = state.cleanUrl;
        state.samples = [];

        state.cropMode = false;
        state.cropDraft = null;
        state.cropRect = null;

        if (options.keepSimplifyBase !== true) {
            state.simplifyBaseUrl = null;
            state.simplifiedUrl = null;
            localStorage.removeItem(STORAGE_KEYS.SIMPLIFY_BASE_IMAGE);
        }

        if (dom.cropApply) {
            dom.cropApply.disabled = true;
        }

        overlayCtx.clearRect(0, 0, state.width, state.height);

        renderSamples();
        render();
    }

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
            dom.samples.innerHTML = '<div class="help">이미지에서 제거할 색상을 클릭하세요. 흰색, 검은색, 회색, 글자색, 무대색을 먼저 찍으면 됩니다.</div>';
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
                pushHistory("제거 색상 초기화");
            }

            return;
        }

        const sourceImageData = sourceCtx.getImageData(0, 0, state.width, state.height);
        const imageData = cleanCtx.createImageData(state.width, state.height);
        const sourceData = sourceImageData.data;
        const data = imageData.data;

        const tolerance = getNumber(dom.tol, 45);
        const shapeColor = getShapeColorRgb();
        const backgroundColor = getBackgroundColorRgb();
        const holeArea = getNumber(dom.hole, 0);

        for (let i = 0; i < sourceData.length; i += 4) {
            const pixel = {
                r: sourceData[i],
                g: sourceData[i + 1],
                b: sourceData[i + 2],
            };

            const shouldRemove = state.samples.some((sample) => {
                return colorDistance(pixel, sample) <= tolerance;
            });

            if (shouldRemove) {
                data[i] = backgroundColor.r;
                data[i + 1] = backgroundColor.g;
                data[i + 2] = backgroundColor.b;
                data[i + 3] = 255;
            } else {
                data[i] = shapeColor.r;
                data[i + 1] = shapeColor.g;
                data[i + 2] = shapeColor.b;
                data[i + 3] = 255;
            }
        }

        fillSmallHoles(imageData, shapeColor, backgroundColor, holeArea);
        cleanCtx.putImageData(imageData, 0, 0);

        state.cleanUrl = cleanCanvas.toDataURL("image/png");
        state.lastExtractUrl = state.cleanUrl;

        render();

        if (options.recordHistory === true) {
            pushHistory("제거 색상 추출");
        }
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

    function invertExtractedMask() {
        if (!state.width || !state.height) {
            return;
        }

        const shapeColor = getShapeColorRgb();
        const backgroundColor = getBackgroundColorRgb();
        const imageData = cleanCtx.getImageData(0, 0, state.width, state.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const pixel = {
                r: data[i],
                g: data[i + 1],
                b: data[i + 2],
            };

            const shapeDistance = colorDistance(pixel, shapeColor);
            const backgroundDistance = colorDistance(pixel, backgroundColor);

            if (shapeDistance <= backgroundDistance) {
                data[i] = backgroundColor.r;
                data[i + 1] = backgroundColor.g;
                data[i + 2] = backgroundColor.b;
                data[i + 3] = 255;
            } else {
                data[i] = shapeColor.r;
                data[i + 1] = shapeColor.g;
                data[i + 2] = shapeColor.b;
                data[i + 3] = 255;
            }
        }

        cleanCtx.putImageData(imageData, 0, 0);

        state.cleanUrl = cleanCanvas.toDataURL("image/png");
        state.lastExtractUrl = state.cleanUrl;

        render();
        pushHistory("추출 반전");
        showToast("추출 결과 반전 완료");
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
            (state.part === 2 || state.part === 3) &&
            !state.zoomMode &&
            !state.zoomDragging &&
            !state.rotationMode &&
            !state.rotationDragging &&
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
        if ((state.part !== 2 && state.part !== 3) || state.zoomMode || state.rotationMode) {
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
        state.rotationMode = false;
        clearRotationPreviewTransform();
        hideColorLoupe();
        updateZoomView();
        updateRotationView();
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
        state.rotationMode = false;
        clearRotationPreviewTransform();
        hideColorLoupe();
        updateZoomView();
        updateRotationView();
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
        const backgroundColor = getBackgroundColorHex();

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
        const shapeColor = getShapeColorHex();

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

        const shapeColor = getShapeColorRgb();
        const backgroundColor = getBackgroundColorRgb();
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
        saveStage1Settings();

        localStorage.setItem(STORAGE_KEYS.CLEAN_IMAGE, state.cleanUrl);
        localStorage.setItem(
            STORAGE_KEYS.IMAGE_META,
            JSON.stringify({
                width: state.width,
                height: state.height,
                mode: "remove-colors",
                shapeColor: getShapeColorHex(),
                backgroundColor: getBackgroundColorHex(),
            })
        );

        state.completedParts.add(4);
        syncWorkspacePartState();

        showToast("Stage1 자동 저장 완료");
    }

    function moveToStage2() {
        if (!state.samples.length) {
            showPart(2);
            showToast("먼저 제거할 색상을 1개 이상 선택하세요");
            return;
        }

        extractSelectedColors();
        saveStage1();
        window.location.href = PAGE_URL.STAGE2;
    }

    function handlePointerDown(event) {
        if (state.rotationMode) {
            beginRotationDrag(event);
            return;
        }

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
            updateRemoveColorCursor(pointerPos);
            updateColorLoupe(event);
            return;
        }

        if (state.part === 3) {
            updateColorLoupe(event);
            return;
        }

        if (state.part === 4 && state.eraserMode) {
            updateToolCursor(pointerPos);
            state.erasing = true;
            state.changedDuringDrag = false;
            eraseAt(pointerPos);
            return;
        }

        if (state.part === 4 && state.fillMode) {
            updateToolCursor(pointerPos);
            state.filling = true;
            state.changedDuringDrag = false;
            fillAt(pointerPos);
        }
    }

    function handleOverlayPointerMove(event) {
        if ((state.part === 2 || state.part === 3) && !state.zoomMode && !state.zoomDragging && !state.rotationMode && !state.rotationDragging) {
            const pointerPos = getCanvasPointer(event);
            if (state.part === 2) {
                updateRemoveColorCursor(pointerPos);
            }
            updateColorLoupe(event);
        }
    }

    function handlePointerMove(event) {
        if (state.rotationDragging) {
            updateRotationDrag(event);
            return;
        }

        if (state.zoomDragging) {
            updateZoomDrag(event);
            return;
        }

        const pointerPos = getCanvasPointer(event);

        if (state.cropDraft) {
            updateCropDraft(pointerPos);
        }

        if (state.part === 2) {
            updateRemoveColorCursor(pointerPos);
        }

        if (state.part === 4 && isToolModeActive()) {
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
        if (state.rotationDragging) {
            endRotationDrag();
            return;
        }

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

        if (state.part === 2) {
            hideToolCursor();
        }

        if (state.part === 4 && isToolModeActive() && !state.erasing && !state.filling) {
            hideToolCursor();
        }
    }

    function handlePointerEnter(event) {
        if (state.part === 2 || state.part === 3) {
            updateColorLoupe(event);
        }

        if (state.part === 2) {
            updateRemoveColorCursor(getCanvasPointer(event));
        }

        if (state.part === 4 && isToolModeActive()) {
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

    function drawRemoveSampleMarkers() {
        if (!state.samples.length || !overlayCtx) {
            return;
        }

        overlayCtx.save();
        overlayCtx.font = "bold 12px Arial";
        overlayCtx.textAlign = "left";
        overlayCtx.textBaseline = "top";
        overlayCtx.fillStyle = "rgba(239, 68, 68, 0.92)";
        overlayCtx.fillText(`제거 색상 ${state.samples.length}개 선택됨`, 12, 12);
        overlayCtx.restore();
    }

    function updateRemoveColorCursor(pointerPos) {
        state.lastPointerPos = pointerPos;

        if (state.part !== 2 || !dom.eraserCursor || !dom.box) {
            return;
        }

        const size = 28;
        const scale = parseFloat(canvas.style.width) / state.width || 1;
        const cursorSize = size * scale;

        dom.eraserCursor.style.display = "block";
        dom.eraserCursor.style.borderColor = "#ef4444";
        dom.eraserCursor.style.width = `${cursorSize}px`;
        dom.eraserCursor.style.height = `${cursorSize}px`;
        dom.eraserCursor.style.transform = `translate(${pointerPos.x * scale - cursorSize / 2}px, ${pointerPos.y * scale - cursorSize / 2}px)`;
        dom.box.classList.add("is-erasing");
    }

    function clearRemoveSamples() {
        state.samples = [];
        renderSamples();
        extractSelectedColors({ recordHistory: true });
        showToast("제거 색상 목록을 비웠습니다");
    }

    function updateToolCursor(pointerPos) {
        state.lastPointerPos = pointerPos;

        if (!(state.part === 4 && isToolModeActive())) {
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

    function syncHoleValue() {
        if (!dom.hole || !dom.holeValue) {
            return;
        }

        dom.holeValue.textContent = dom.hole.value;
    }

    function normalizeHexColor(value, fallback = "#000000") {
        const color = String(value || fallback).trim();

        if (/^#[0-9a-fA-F]{6}$/.test(color)) {
            return color.toLowerCase();
        }

        if (/^#[0-9a-fA-F]{3}$/.test(color)) {
            return (
                "#" +
                color
                    .slice(1)
                    .split("")
                    .map((value) => value + value)
                    .join("")
            ).toLowerCase();
        }

        return fallback.toLowerCase();
    }

    function getShapeColorHex() {
        return normalizeHexColor(dom.shapeColor?.value || "#000000", "#000000");
    }

    function getShapeColorRgb() {
        return hexToRgb(getShapeColorHex());
    }

    function getBackgroundColorHex() {
        return normalizeHexColor(dom.backgroundColor?.value || FIXED_BACKGROUND_COLOR, FIXED_BACKGROUND_COLOR);
    }

    function getBackgroundColorRgb() {
        return hexToRgb(getBackgroundColorHex());
    }

    function readStage1Settings() {
        try {
            const value = localStorage.getItem(STORAGE_KEYS.STAGE1_SETTINGS);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            return null;
        }
    }

    function applySavedStage1Settings() {
        const settings = readStage1Settings();

        if (!settings) {
            return;
        }

        if (dom.shapeColor && settings.shapeColor) {
            dom.shapeColor.value = normalizeHexColor(settings.shapeColor, "#000000");
        }

        if (dom.backgroundColor && settings.backgroundColor) {
            dom.backgroundColor.value = normalizeHexColor(settings.backgroundColor, FIXED_BACKGROUND_COLOR);
        }

        if (dom.tol && Number.isFinite(Number(settings.tolerance))) {
            dom.tol.value = settings.tolerance;
        }

        if (dom.alpha && Number.isFinite(Number(settings.alpha))) {
            dom.alpha.value = settings.alpha;
        }

        if (dom.hole && Number.isFinite(Number(settings.hole))) {
            dom.hole.value = settings.hole;
        }

        if (Array.isArray(settings.removeSamples)) {
            state.samples = settings.removeSamples
                .map((value) => hexToRgb(normalizeHexColor(value, "#000000")))
                .filter((value) => Number.isFinite(value.r) && Number.isFinite(value.g) && Number.isFinite(value.b));
        }
    }

    function getStage1Settings() {
        return {
            mode: "remove-colors",
            shapeColor: getShapeColorHex(),
            backgroundColor: getBackgroundColorHex(),
            removeSamples: state.samples.map((sample) => rgbToHex(sample)),
            tolerance: getNumber(dom.tol, 45),
            alpha: getNumber(dom.alpha, 100),
            hole: getNumber(dom.hole, 0),
            updatedAt: new Date().toISOString(),
        };
    }

    function saveStage1Settings() {
        localStorage.setItem(
            STORAGE_KEYS.STAGE1_SETTINGS,
            JSON.stringify(getStage1Settings())
        );
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