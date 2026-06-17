(() => {
    "use strict";

    const STORAGE_KEYS = {
        ORIGINAL_IMAGE: "concert_originalImage",
        CLEAN_IMAGE: "concert_cleanImage",
        IMAGE_META: "concert_imageMeta",
    };

    // 다음 스테이지 이동
    const PAGE_URL = {
        STAGE2: "/admin/seatmap/concert-stage2",
    };

    const dom = {};
    const state = {
        width: 0,
        height: 0,

        originalUrl: null,
        workingUrl: null,
        cleanUrl: null,
        lastExtractUrl: null,

        part: 1,
        samples: [],

        cropMode: false,
        cropDraft: null,
        cropRect: null,

        eraserMode: false,
        erasing: false,

        fillMode: false,
        filling: false,

        lastPointerPos: null,
    };

    let canvas;
    let overlay;
    let ctx;
    let overlayCtx;

    const cleanCanvas = document.createElement("canvas");
    const cleanCtx = cleanCanvas.getContext("2d", { willReadFrequently: true });

    document.addEventListener("DOMContentLoaded", init);

    function init() {
        cacheDom();
        bindEvents();

        state.originalUrl = localStorage.getItem(STORAGE_KEYS.ORIGINAL_IMAGE);
        state.workingUrl = localStorage.getItem(STORAGE_KEYS.CLEAN_IMAGE) || state.originalUrl;
        state.cleanUrl = state.workingUrl;
        state.lastExtractUrl = state.workingUrl;

        if (!state.originalUrl) {
            showToast("메인에서 이미지를 업로드하세요");
            renderSamples();
            return;
        }

        loadImage(state.workingUrl, (image) => {
            setupCanvas(image.naturalWidth, image.naturalHeight);
            cleanCtx.drawImage(image, 0, 0, state.width, state.height);
            render();
            renderSamples();
        });
    }

    function cacheDom() {
        canvas = document.getElementById("canvas");
        overlay = document.getElementById("overlay");
        ctx = canvas.getContext("2d", { willReadFrequently: true });
        overlayCtx = overlay.getContext("2d");

        [
            "box",
            "title",
            "size",
            "toast",
            "eraserCursor",

            "tab1",
            "tab2",
            "tab3",
            "part1",
            "part2",
            "part3",

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
            "stopEraser",
            "rectFill",
            "stopRectFill",
            "eraserSize",
            "cleanupArea",
            "cleanup",
            "restoreExtract",
            "saveClean",
            "toStage3",
        ].forEach((id) => {
            dom[id] = document.getElementById(id);
        });
    }

    function bindEvents() {
        dom.tab1.addEventListener("click", () => showPart(1));
        dom.tab2.addEventListener("click", () => showPart(2));
        dom.tab3.addEventListener("click", () => showPart(3));

        dom.go2.addEventListener("click", () => showPart(2));
        dom.go3.addEventListener("click", () => showPart(3));

        dom.cropStart.addEventListener("click", startCropMode);
        dom.cropApply.addEventListener("click", applyCrop);

        overlay.addEventListener("pointerdown", handlePointerDown);
        overlay.addEventListener("pointerleave", handlePointerLeave);
        overlay.addEventListener("pointerenter", handlePointerEnter);

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);

        ["tol", "alpha", "shapeColor", "bgColor", "hole", "viewMode"].forEach((id) => {
            dom[id].addEventListener("input", extractSelectedColors);
        });

        dom.clearSamples.addEventListener("click", clearSamples);
        dom.restoreOriginal.addEventListener("click", restoreOriginalPreview);

        dom.eraser.addEventListener("click", enableEraserMode);
        dom.stopEraser.addEventListener("click", disableEraserMode);

        dom.rectFill.addEventListener("click", enableFillMode);
        dom.stopRectFill.addEventListener("click", disableFillMode);

        dom.eraserSize.addEventListener("input", () => {
            if (state.part === 3 && state.lastPointerPos) {
                updateToolCursor(state.lastPointerPos);
            }
        });

        dom.cleanup.addEventListener("click", removeSmallFragments);
        dom.restoreExtract.addEventListener("click", restoreLastExtract);
        dom.saveClean.addEventListener("click", saveStage1);
        dom.toStage3.addEventListener("click", moveToStage2);
    }

    /* =========================
       Canvas Render
    ========================= */

    function setupCanvas(width, height) {
        state.width = width;
        state.height = height;

        canvas.width = width;
        canvas.height = height;
        overlay.width = width;
        overlay.height = height;
        cleanCanvas.width = width;
        cleanCanvas.height = height;

        const scale = Math.min(1, 1120 / width, 720 / height);
        const displayWidth = `${width * scale}px`;
        const displayHeight = `${height * scale}px`;

        canvas.style.width = displayWidth;
        canvas.style.height = displayHeight;
        overlay.style.width = displayWidth;
        overlay.style.height = displayHeight;

        dom.box.style.width = displayWidth;
        dom.box.style.height = displayHeight;
        dom.size.textContent = `${width} × ${height}`;
    }

    function render() {
        clearCanvas();

        if (state.part === 1 || isMixedPreviewMode()) {
            drawImageToMainCanvas(state.workingUrl, () => {
                if (state.part === 2) {
                    drawPreviewOverlay();
                }

                if (state.part === 1) {
                    drawCropGuide();
                }
            });
            return;
        }

        drawImageToMainCanvas(state.cleanUrl, () => {
            if (state.part === 3 && isToolModeActive() && state.lastPointerPos) {
                updateToolCursor(state.lastPointerPos);
            }
        });
    }

    function clearCanvas() {
        ctx.clearRect(0, 0, state.width, state.height);
        overlayCtx.clearRect(0, 0, state.width, state.height);
    }

    function drawImageToMainCanvas(url, callback) {
        if (!url) {
            return;
        }

        loadImage(url, (image) => {
            ctx.clearRect(0, 0, state.width, state.height);
            ctx.drawImage(image, 0, 0, state.width, state.height);

            if (typeof callback === "function") {
                callback();
            }
        });
    }

    function drawPreviewOverlay() {
        if (!state.cleanUrl) {
            return;
        }

        loadImage(state.cleanUrl, (image) => {
            const preview = createCanvas(state.width, state.height);
            const previewCtx = preview.getContext("2d", { willReadFrequently: true });

            previewCtx.drawImage(image, 0, 0, state.width, state.height);

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
        });
    }

    function isMixedPreviewMode() {
        return state.part === 2 && dom.viewMode.value === "mix";
    }

    /* =========================
       Part Tabs
    ========================= */

    function showPart(partNumber) {
        state.part = partNumber;

        [1, 2, 3].forEach((number) => {
            dom[`tab${number}`].classList.toggle("active", number === partNumber);
            dom[`part${number}`].classList.toggle("hidden", number !== partNumber);
        });

        dom.title.textContent = getPartTitle(partNumber);

        if (partNumber !== 3) {
            hideToolCursor();
        }

        render();
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

    /* =========================
       Part 1 - Crop
    ========================= */

    function startCropMode() {
        state.cropMode = true;
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

        if (!rect) {
            return;
        }

        const cropCanvas = createCanvas(Math.round(rect.w), Math.round(rect.h));
        const cropCtx = cropCanvas.getContext("2d");

        cropCtx.drawImage(
            canvas,
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

            state.cleanUrl = state.workingUrl;
            state.lastExtractUrl = state.workingUrl;
            state.cropRect = null;
            state.cropDraft = null;

            cleanCtx.clearRect(0, 0, state.width, state.height);
            cleanCtx.drawImage(image, 0, 0, state.width, state.height);

            render();
            showToast("자르기 완료");
        });
    }

    /* =========================
       Part 2 - Color Extract
    ========================= */

    function addColorSample(pointerPos) {
        loadImage(state.workingUrl, (image) => {
            const sampleCanvas = createCanvas(state.width, state.height);
            const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });

            sampleCtx.drawImage(image, 0, 0, state.width, state.height);

            const imageData = sampleCtx.getImageData(
                Math.floor(pointerPos.x),
                Math.floor(pointerPos.y),
                1,
                1
            );

            const data = imageData.data;

            state.samples.push({
                r: data[0],
                g: data[1],
                b: data[2],
            });

            renderSamples();
            extractSelectedColors();
        });
    }

    function renderSamples() {
        if (!state.samples.length) {
            dom.samples.innerHTML = '<div class="help">이미지를 클릭해서 남길 색상을 고르세요.</div>';
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
                extractSelectedColors();
            });
        });
    }

    function extractSelectedColors() {
        if (!state.workingUrl) {
            return;
        }

        loadImage(state.workingUrl, (image) => {
            cleanCtx.clearRect(0, 0, state.width, state.height);
            cleanCtx.drawImage(image, 0, 0, state.width, state.height);

            const imageData = cleanCtx.getImageData(0, 0, state.width, state.height);
            const data = imageData.data;

            const tolerance = getNumber(dom.tol, 45);
            const shapeColor = hexToRgb(dom.shapeColor.value);
            const backgroundColor = hexToRgb(dom.bgColor.value);
            const holeArea = getNumber(dom.hole, 0);

            if (state.samples.length) {
                for (let i = 0; i < data.length; i += 4) {
                    const pixel = {
                        r: data[i],
                        g: data[i + 1],
                        b: data[i + 2],
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
            }

            cleanCtx.putImageData(imageData, 0, 0);

            state.cleanUrl = cleanCanvas.toDataURL("image/png");
            state.lastExtractUrl = state.cleanUrl;

            render();
        });
    }

    function clearSamples() {
        state.samples = [];
        renderSamples();
        extractSelectedColors();
    }

    function restoreOriginalPreview() {
        state.samples = [];
        renderSamples();

        state.cleanUrl = state.workingUrl;

        loadImage(state.workingUrl, (image) => {
            cleanCtx.clearRect(0, 0, state.width, state.height);
            cleanCtx.drawImage(image, 0, 0, state.width, state.height);
            render();
        });
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
       Part 3 - Clean
    ========================= */

    function enableEraserMode() {
        state.eraserMode = true;
        state.fillMode = false;
        dom.box.classList.add("is-erasing");
        showToast("지우개 모드: 원형 커서 크기만큼 지워집니다");
    }

    function disableEraserMode() {
        state.eraserMode = false;
        state.erasing = false;
        hideToolCursor();
    }

    function enableFillMode() {
        state.fillMode = true;
        state.eraserMode = false;
        hideToolCursor();
        showToast("브러쉬 채우기 모드: 빈 부분을 드래그해서 칠하세요");
    }

    function disableFillMode() {
        state.fillMode = false;
        state.filling = false;
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

        render();
    }

    function removeSmallFragments() {
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
    }

    function restoreLastExtract() {
        state.cleanUrl = state.lastExtractUrl;

        loadImage(state.cleanUrl, (image) => {
            cleanCtx.clearRect(0, 0, state.width, state.height);
            cleanCtx.drawImage(image, 0, 0, state.width, state.height);
            render();
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

        showToast("Stage1 저장 완료");
    }

    function moveToStage2() {
        saveStage1();
        window.location.href = PAGE_URL.STAGE2;
    }

    /* =========================
       Pointer Events
    ========================= */

    function handlePointerDown(event) {
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
            return;
        }

        if (state.part === 3 && state.eraserMode) {
            updateToolCursor(pointerPos);
            state.erasing = true;
            eraseAt(pointerPos);
            return;
        }

        if (state.part === 3 && state.fillMode) {
            updateToolCursor(pointerPos);
            state.filling = true;
            fillAt(pointerPos);
        }
    }

    function handlePointerMove(event) {
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
        if (state.cropDraft) {
            state.cropRect = {
                x: state.cropDraft.x,
                y: state.cropDraft.y,
                w: state.cropDraft.w,
                h: state.cropDraft.h,
            };

            state.cropDraft = null;
            state.cropMode = false;
            dom.cropApply.disabled = !(state.cropRect.w > 5 && state.cropRect.h > 5);
            drawCropGuide();
        }

        state.erasing = false;
        state.filling = false;
    }

    function handlePointerLeave() {
        if (state.part === 3 && isToolModeActive() && !state.erasing && !state.filling) {
            hideToolCursor();
        }
    }

    function handlePointerEnter(event) {
        if (state.part === 3 && isToolModeActive()) {
            updateToolCursor(getCanvasPointer(event));
        }
    }

    function getCanvasPointer(event) {
        const rect = overlay.getBoundingClientRect();

        return {
            x: (event.clientX - rect.left) * overlay.width / rect.width,
            y: (event.clientY - rect.top) * overlay.height / rect.height,
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
        image.src = url;
    }

    function createCanvas(width, height) {
        const target = document.createElement("canvas");
        target.width = width;
        target.height = height;
        return target;
    }

    function getNumber(element, fallback) {
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

    function showToast(message) {
        dom.toast.textContent = message;
        dom.toast.classList.add("show");

        window.setTimeout(() => {
            dom.toast.classList.remove("show");
        }, 2000);
    }
})();
