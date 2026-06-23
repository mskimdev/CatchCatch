(() => {
    const STORAGE = {
        original: "seat_button_originalImage",
        result: "seat_button_resultImage",
        meta: "seat_button_imageMeta",
        groups: "seat_button_groups",
        entry: "seat_button_entryFromMain",
        concertOriginal: "concert_originalImage",
        concertClean: "concert_cleanImage",
        concertEntry: "concert_entryFromMain"
    };

    const DEFAULT_GROUPS = [
        { id: "background", name: "배경 / 불필요", output: "#f7f7f7", samples: [] },
        { id: "stage", name: "STAGE / 무대", output: "#e5e5e5", samples: [] },
        { id: "text", name: "층수 / 안내 문자", output: "#8f8f8f", samples: [] },
        { id: "vip", name: "VIP / 갈색 좌석", output: "#c7b28e", samples: [] },
        { id: "standing", name: "STANDING", output: "#8067ff", samples: [] },
        { id: "seatPink", name: "좌석 핑크", output: "#ff7bab", samples: [] },
        { id: "seatBlue", name: "좌석 하늘", output: "#63cce4", samples: [] },
        { id: "seatGreen", name: "좌석 연두", output: "#b8e938", samples: [] },
        { id: "line", name: "외곽선 / 기타 라인", output: "#eeeeee", samples: [] }
    ];

    const $ = (id) => document.getElementById(id);

    const app = $("buttonImageApp");
    const canvas = $("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const overlay = $("overlay");
    const octx = overlay.getContext("2d");
    const box = $("box");
    const brushCursor = $("brushCursor");

    const sourceCanvas = document.createElement("canvas");
    const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });

    const resultCanvas = document.createElement("canvas");
    const resultCtx = resultCanvas.getContext("2d", { willReadFrequently: true });

    let groups = loadGroups();
    let selectedGroupId = "background";
    let currentStep = 1;
    let zoom = 1;
    let mode = "sample";
    let cropStartPoint = null;
    let cropRect = null;
    let drawing = false;
    let hasResult = false;
    let saved = false;
    let resultBaseDataUrl = "";
    let history = [];
    let historyIndex = -1;
    let originalDataUrl = "";

    document.addEventListener("DOMContentLoaded", init);

    function init() {
        bindStepHeaders();
        bindButtons();
        bindCanvasEvents();
        renderGroups();
        renderSamples();
        renderLegend();
        updateSelectedGroupUI();
        updateStats();
        loadOriginalImage();
    }

    function bindStepHeaders() {
        document.querySelectorAll(".button-image-step__header").forEach((button) => {
            button.addEventListener("click", () => {
                const step = Number(button.closest(".button-image-step").dataset.step);
                setStep(step);
            });
        });
    }

    function bindButtons() {
        $("cropStart").addEventListener("click", () => setMode(mode === "crop" ? "sample" : "crop"));
        $("cropApply").addEventListener("click", applyCrop);
        $("restoreSource").addEventListener("click", restoreSourceImage);
        $("go2").addEventListener("click", () => setStep(2));
        $("go3").addEventListener("click", () => setStep(3));
        $("sampleTol").addEventListener("input", () => {
            $("sampleTolValue").textContent = $("sampleTol").value;
        });
        $("groupOutputColor").addEventListener("input", updateSelectedGroupColor);
        $("clearSelectedSamples").addEventListener("click", clearSelectedSamples);
        $("clearAllSamples").addEventListener("click", clearAllSamples);
        $("generateButtonImage").addEventListener("click", () => generateButtonImage(true));
        $("cleanupPieces").addEventListener("click", cleanupSmallPieces);
        $("brushTool").addEventListener("click", () => toggleTool("brush"));
        $("eraseTool").addEventListener("click", () => toggleTool("erase"));
        $("restoreResultBase").addEventListener("click", restoreResultBase);
        $("saveButtonImage").addEventListener("click", saveButtonImage);
        $("applyToConcert").addEventListener("click", applyToConcert);
        $("downloadButtonImage").addEventListener("click", downloadButtonImage);
        $("zoomIn").addEventListener("click", () => setZoom(zoom + 0.1));
        $("zoomOut").addEventListener("click", () => setZoom(zoom - 0.1));
        $("zoomReset").addEventListener("click", () => setZoom(1));
        $("undoAction").addEventListener("click", undo);
        $("redoAction").addEventListener("click", redo);
    }

    function bindCanvasEvents() {
        overlay.addEventListener("mousedown", onCanvasDown);
        overlay.addEventListener("mousemove", onCanvasMove);
        overlay.addEventListener("mouseup", onCanvasUp);
        overlay.addEventListener("mouseleave", onCanvasLeave);
        overlay.addEventListener("click", onCanvasClick);
    }

    function loadOriginalImage() {
        originalDataUrl = localStorage.getItem(STORAGE.original);

        if (!originalDataUrl) {
            toast("등록된 원본 이미지가 없습니다. 메인에서 이미지를 먼저 등록하세요.");
            return;
        }

        drawDataUrlToCanvas(originalDataUrl, sourceCanvas, sourceCtx).then(() => {
            resizeVisibleCanvas(sourceCanvas.width, sourceCanvas.height);
            ctx.drawImage(sourceCanvas, 0, 0);
            syncResultFromVisible();
            pushHistory();
            updateStats();
            toast("원본 도면을 불러왔습니다.");
        });
    }

    function loadGroups() {
        const savedGroups = localStorage.getItem(STORAGE.groups);

        if (!savedGroups) {
            return cloneGroups(DEFAULT_GROUPS);
        }

        try {
            const parsed = JSON.parse(savedGroups);
            return DEFAULT_GROUPS.map((base) => {
                const saved = parsed.find((item) => item.id === base.id);
                return {
                    ...base,
                    output: saved?.output || base.output,
                    samples: Array.isArray(saved?.samples) ? saved.samples : []
                };
            });
        } catch (error) {
            return cloneGroups(DEFAULT_GROUPS);
        }
    }

    function cloneGroups(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function saveGroups() {
        localStorage.setItem(STORAGE.groups, JSON.stringify(groups));
    }

    function renderGroups() {
        const wrap = $("buttonImageGroups");

        wrap.innerHTML = groups.map((group) => {
            const activeClass = group.id === selectedGroupId ? " is-active" : "";

            return `
                <div class="button-image-group${activeClass}" data-group-id="${group.id}">
                    <i class="button-image-group__chip" style="background:${group.output}"></i>
                    <div class="button-image-group__text">
                        <strong>${escapeHtml(group.name)}</strong>
                        <span>${group.output}</span>
                    </div>
                    <em class="button-image-group__count">${group.samples.length}</em>
                </div>
            `;
        }).join("");

        wrap.querySelectorAll(".button-image-group").forEach((item) => {
            item.addEventListener("click", () => {
                selectedGroupId = item.dataset.groupId;
                mode = "sample";
                updateToolButtons();
                updateSelectedGroupUI();
                renderGroups();
                renderSamples();
                renderLegend();
            });
        });
    }

    function renderSamples() {
        const group = getSelectedGroup();
        const wrap = $("buttonImageSamples");

        if (!group || group.samples.length === 0) {
            wrap.innerHTML = `<div class="button-image-sample-empty">도면을 클릭해서 색상 샘플을 추가하세요.</div>`;
            return;
        }

        wrap.innerHTML = group.samples.map((sample, index) => {
            return `
                <div class="button-image-sample">
                    <i style="background:${sample.hex}"></i>
                    <span>${sample.hex} / RGB ${sample.r}, ${sample.g}, ${sample.b}</span>
                    <button type="button" data-sample-index="${index}">×</button>
                </div>
            `;
        }).join("");

        wrap.querySelectorAll("button[data-sample-index]").forEach((button) => {
            button.addEventListener("click", () => {
                const index = Number(button.dataset.sampleIndex);
                group.samples.splice(index, 1);
                saveGroups();
                renderGroups();
                renderSamples();
                renderLegend();
                updateStats();
            });
        });
    }

    function renderLegend() {
        const wrap = $("buttonImageLegend");

        wrap.innerHTML = groups.map((group) => {
            return `
                <div class="button-image-legend-row">
                    <i style="background:${group.output}"></i>
                    <strong>${escapeHtml(group.name)}</strong>
                    <span>${group.samples.length}개</span>
                </div>
            `;
        }).join("");
    }

    function updateSelectedGroupUI() {
        const group = getSelectedGroup();

        if (!group) {
            return;
        }

        $("selectedGroupName").textContent = group.name;
        $("groupOutputColor").value = group.output;
    }

    function updateSelectedGroupColor() {
        const group = getSelectedGroup();

        if (!group) {
            return;
        }

        group.output = $("groupOutputColor").value;
        saveGroups();
        renderGroups();
        renderLegend();

        if (hasResult) {
            saved = false;
            updateStats();
        }
    }

    function clearSelectedSamples() {
        const group = getSelectedGroup();

        if (!group) {
            return;
        }

        group.samples = [];
        saveGroups();
        renderGroups();
        renderSamples();
        renderLegend();
        updateStats();
        toast("선택 그룹의 샘플을 비웠습니다.");
    }

    function clearAllSamples() {
        groups.forEach((group) => {
            group.samples = [];
        });

        saveGroups();
        renderGroups();
        renderSamples();
        renderLegend();
        updateStats();
        toast("모든 색상 샘플을 비웠습니다.");
    }

    function onCanvasDown(event) {
        const point = getCanvasPoint(event);

        if (!point) {
            return;
        }

        if (mode === "crop") {
            cropStartPoint = point;
            cropRect = null;
            drawCropRect(point, point);
            return;
        }

        if (mode === "brush" || mode === "erase") {
            drawing = true;
            drawBrush(point);
        }
    }

    function onCanvasMove(event) {
        const point = getCanvasPoint(event);

        if (!point) {
            hideLoupe();
            hideBrushCursor();
            return;
        }

        updateLoupe(point, event);

        if (mode === "crop" && cropStartPoint) {
            drawCropRect(cropStartPoint, point);
            return;
        }

        if (mode === "brush" || mode === "erase") {
            showBrushCursor(point);

            if (drawing) {
                drawBrush(point);
            }
        }
    }

    function onCanvasUp(event) {
        const point = getCanvasPoint(event);

        if (mode === "crop" && cropStartPoint && point) {
            cropRect = normalizeRect(cropStartPoint, point);
            cropStartPoint = null;
            $("cropApply").disabled = !isValidCropRect(cropRect);
            return;
        }

        if ((mode === "brush" || mode === "erase") && drawing) {
            drawing = false;
            syncResultFromVisible();
            hasResult = true;
            saved = false;
            pushHistory();
            updateStats();
        }
    }

    function onCanvasLeave() {
        cropStartPoint = null;
        drawing = false;
        hideLoupe();
        hideBrushCursor();
    }

    function onCanvasClick(event) {
        if (mode !== "sample") {
            return;
        }

        const point = getCanvasPoint(event);

        if (!point) {
            return;
        }

        addSampleFromPoint(point);
    }

    function addSampleFromPoint(point) {
        if (!sourceCanvas.width || !sourceCanvas.height) {
            return;
        }

        const x = clamp(Math.round(point.x), 0, sourceCanvas.width - 1);
        const y = clamp(Math.round(point.y), 0, sourceCanvas.height - 1);
        const data = sourceCtx.getImageData(x, y, 1, 1).data;
        const sample = {
            r: data[0],
            g: data[1],
            b: data[2],
            hex: rgbToHex(data[0], data[1], data[2])
        };

        const group = getSelectedGroup();

        if (!group) {
            return;
        }

        const exists = group.samples.some((item) => item.hex.toLowerCase() === sample.hex.toLowerCase());

        if (!exists) {
            group.samples.push(sample);
            saveGroups();
            renderGroups();
            renderSamples();
            renderLegend();
            updateStats();
            toast(`${group.name} 샘플 추가: ${sample.hex}`);
        }
    }

    function setMode(nextMode) {
        mode = nextMode;
        cropStartPoint = null;
        cropRect = null;
        clearOverlay();
        $("cropApply").disabled = true;
        updateToolButtons();
    }

    function toggleTool(tool) {
        mode = mode === tool ? "sample" : tool;
        cropStartPoint = null;
        cropRect = null;
        clearOverlay();
        $("cropApply").disabled = true;
        updateToolButtons();
    }

    function updateToolButtons() {
        box.classList.toggle("is-cropping", mode === "crop");
        box.classList.toggle("is-brushing", mode === "brush");
        box.classList.toggle("is-erasing", mode === "erase");

        $("cropStart").classList.toggle("is-active", mode === "crop");
        $("brushTool").classList.toggle("is-active", mode === "brush");
        $("eraseTool").classList.toggle("is-active", mode === "erase");

        if (mode !== "brush" && mode !== "erase") {
            hideBrushCursor();
        }
    }

    function applyCrop() {
        if (!isValidCropRect(cropRect)) {
            toast("자를 범위를 먼저 지정하세요.");
            return;
        }

        const rect = {
            x: Math.floor(cropRect.x),
            y: Math.floor(cropRect.y),
            w: Math.floor(cropRect.w),
            h: Math.floor(cropRect.h)
        };

        const temp = document.createElement("canvas");
        const tctx = temp.getContext("2d");

        temp.width = rect.w;
        temp.height = rect.h;
        tctx.drawImage(sourceCanvas, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);

        sourceCanvas.width = rect.w;
        sourceCanvas.height = rect.h;
        sourceCtx.clearRect(0, 0, rect.w, rect.h);
        sourceCtx.drawImage(temp, 0, 0);

        resizeVisibleCanvas(rect.w, rect.h);
        ctx.drawImage(sourceCanvas, 0, 0);
        syncResultFromVisible();

        hasResult = false;
        saved = false;
        resultBaseDataUrl = "";
        cropRect = null;
        clearOverlay();
        $("cropApply").disabled = true;
        setMode("sample");
        pushHistory();
        updateStats();
        toast("선택 범위로 이미지를 잘랐습니다.");
    }

    function restoreSourceImage() {
        if (!originalDataUrl) {
            return;
        }

        drawDataUrlToCanvas(originalDataUrl, sourceCanvas, sourceCtx).then(() => {
            resizeVisibleCanvas(sourceCanvas.width, sourceCanvas.height);
            ctx.drawImage(sourceCanvas, 0, 0);
            syncResultFromVisible();
            hasResult = false;
            saved = false;
            resultBaseDataUrl = "";
            clearOverlay();
            setMode("sample");
            pushHistory();
            updateStats();
            toast("원본을 다시 표시했습니다.");
        });
    }

    function generateButtonImage(shouldPushHistory) {
        const sampleTotal = getSampleCount();

        if (sampleTotal === 0) {
            toast("먼저 색상 그룹 샘플을 추가하세요.");
            return;
        }

        const width = sourceCanvas.width;
        const height = sourceCanvas.height;
        const src = sourceCtx.getImageData(0, 0, width, height);
        const dst = resultCtx.createImageData(width, height);
        const tol = Number($("sampleTol").value);
        const fallback = hexToRgb(getGroup("background").output);

        resultCanvas.width = width;
        resultCanvas.height = height;

        for (let i = 0; i < src.data.length; i += 4) {
            const r = src.data[i];
            const g = src.data[i + 1];
            const b = src.data[i + 2];
            const a = src.data[i + 3];

            let output = fallback;

            if (a > 5) {
                const matched = findMatchedGroup(r, g, b, tol);

                if (matched) {
                    output = hexToRgb(matched.output);
                }
            }

            dst.data[i] = output.r;
            dst.data[i + 1] = output.g;
            dst.data[i + 2] = output.b;
            dst.data[i + 3] = 255;
        }

        resultCtx.putImageData(dst, 0, 0);
        resizeVisibleCanvas(width, height);
        ctx.drawImage(resultCanvas, 0, 0);

        hasResult = true;
        saved = false;
        resultBaseDataUrl = canvas.toDataURL("image/png");
        syncResultFromVisible();
        clearOverlay();

        if (shouldPushHistory) {
            pushHistory();
        }

        updateStats();
        toast("단색 버튼 이미지를 생성했습니다.");
    }

    function findMatchedGroup(r, g, b, tol) {
        let bestGroup = null;
        let bestDistance = Infinity;

        groups.forEach((group) => {
            group.samples.forEach((sample) => {
                const distance = colorDistance(r, g, b, sample.r, sample.g, sample.b);

                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestGroup = group;
                }
            });
        });

        if (bestDistance <= tol) {
            return bestGroup;
        }

        return null;
    }

    function cleanupSmallPieces() {
        if (!canvas.width || !canvas.height) {
            return;
        }

        if (!hasResult) {
            toast("먼저 단색 버튼 이미지를 생성하세요.");
            return;
        }

        const minArea = Math.max(1, Number($("cleanupArea").value) || 1);
        const width = canvas.width;
        const height = canvas.height;
        const image = ctx.getImageData(0, 0, width, height);
        const data = image.data;
        const visited = new Uint8Array(width * height);
        const fallback = hexToRgb(getGroup("background").output);
        const queue = [];
        const pixels = [];

        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
                const startIndex = y * width + x;

                if (visited[startIndex] || isBackgroundPixel(data, startIndex, fallback)) {
                    continue;
                }

                const base = getPixelColor(data, startIndex);
                queue.length = 0;
                pixels.length = 0;
                queue.push(startIndex);
                visited[startIndex] = 1;

                while (queue.length > 0) {
                    const current = queue.pop();
                    pixels.push(current);

                    const cx = current % width;
                    const cy = Math.floor(current / width);

                    pushNeighbor(cx + 1, cy, width, height, visited, queue, data, base);
                    pushNeighbor(cx - 1, cy, width, height, visited, queue, data, base);
                    pushNeighbor(cx, cy + 1, width, height, visited, queue, data, base);
                    pushNeighbor(cx, cy - 1, width, height, visited, queue, data, base);
                }

                if (pixels.length < minArea) {
                    pixels.forEach((pixelIndex) => {
                        const offset = pixelIndex * 4;
                        data[offset] = fallback.r;
                        data[offset + 1] = fallback.g;
                        data[offset + 2] = fallback.b;
                        data[offset + 3] = 255;
                    });
                }
            }
        }

        ctx.putImageData(image, 0, 0);
        syncResultFromVisible();
        hasResult = true;
        saved = false;
        pushHistory();
        updateStats();
        toast("작은 조각을 정리했습니다.");
    }

    function pushNeighbor(x, y, width, height, visited, queue, data, base) {
        if (x < 0 || y < 0 || x >= width || y >= height) {
            return;
        }

        const index = y * width + x;

        if (visited[index]) {
            return;
        }

        const color = getPixelColor(data, index);

        if (color.r !== base.r || color.g !== base.g || color.b !== base.b || color.a !== base.a) {
            return;
        }

        visited[index] = 1;
        queue.push(index);
    }

    function drawBrush(point) {
        if (!canvas.width || !canvas.height) {
            return;
        }

        const size = Number($("brushSize").value);
        const color = mode === "erase"
            ? getGroup("background").output
            : getSelectedGroup().output;

        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function showBrushCursor(point) {
        const size = Number($("brushSize").value);
        const displayX = point.x * zoom;
        const displayY = point.y * zoom;

        brushCursor.style.display = "block";
        brushCursor.style.width = `${size * zoom}px`;
        brushCursor.style.height = `${size * zoom}px`;
        brushCursor.style.transform = `translate(${displayX - (size * zoom / 2)}px, ${displayY - (size * zoom / 2)}px)`;
    }

    function hideBrushCursor() {
        brushCursor.style.display = "none";
        brushCursor.style.transform = "translate(-9999px, -9999px)";
    }

    function restoreResultBase() {
        if (!resultBaseDataUrl) {
            toast("복구할 생성 이미지가 없습니다.");
            return;
        }

        drawDataUrlToCanvas(resultBaseDataUrl, canvas, ctx).then(() => {
            overlay.width = canvas.width;
            overlay.height = canvas.height;
            syncCanvasDisplay();
            syncResultFromVisible();
            hasResult = true;
            saved = false;
            pushHistory();
            updateStats();
            toast("생성 직후 이미지로 복구했습니다.");
        });
    }

    function saveButtonImage() {
        if (!hasResult) {
            generateButtonImage(false);
        }

        const dataUrl = canvas.toDataURL("image/png");

        localStorage.setItem(STORAGE.result, dataUrl);
        localStorage.setItem(STORAGE.meta, JSON.stringify(createMeta()));
        localStorage.setItem(STORAGE.groups, JSON.stringify(groups));

        saved = true;
        updateStats();
        toast("버튼 이미지를 저장했습니다.");
    }

    function applyToConcert() {
        if (!hasResult) {
            generateButtonImage(false);
        }

        const dataUrl = canvas.toDataURL("image/png");

        localStorage.setItem(STORAGE.result, dataUrl);
        localStorage.setItem(STORAGE.meta, JSON.stringify(createMeta()));
        localStorage.setItem(STORAGE.groups, JSON.stringify(groups));

        localStorage.setItem(STORAGE.concertOriginal, dataUrl);
        localStorage.setItem(STORAGE.concertClean, dataUrl);
        localStorage.setItem(STORAGE.concertEntry, "true");

        saved = true;
        updateStats();
        toast("콘서트 제작에 버튼 이미지를 적용했습니다.");

        setTimeout(() => {
            location.href = app?.dataset.concertUrl || "/admin/seatmap/concert/stage1";
        }, 350);
    }

    function downloadButtonImage() {
        if (!hasResult) {
            generateButtonImage(false);
        }

        const link = document.createElement("a");

        link.href = canvas.toDataURL("image/png");
        link.download = "seat-button-image.png";
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    function createMeta() {
        return {
            width: canvas.width,
            height: canvas.height,
            groups,
            sampleTolerance: Number($("sampleTol").value),
            savedAt: new Date().toISOString()
        };
    }

    function pushHistory() {
        if (!canvas.width || !canvas.height || !sourceCanvas.width || !sourceCanvas.height) {
            return;
        }

        const snapshot = {
            source: sourceCanvas.toDataURL("image/png"),
            visible: canvas.toDataURL("image/png"),
            hasResult,
            resultBaseDataUrl,
            saved,
            groups: cloneGroups(groups)
        };

        history = history.slice(0, historyIndex + 1);
        history.push(snapshot);

        if (history.length > 30) {
            history.shift();
        }

        historyIndex = history.length - 1;
        updateHistoryButtons();
    }

    function undo() {
        if (historyIndex <= 0) {
            return;
        }

        historyIndex -= 1;
        restoreHistory(history[historyIndex]);
    }

    function redo() {
        if (historyIndex >= history.length - 1) {
            return;
        }

        historyIndex += 1;
        restoreHistory(history[historyIndex]);
    }

    function restoreHistory(snapshot) {
        Promise.all([
            drawDataUrlToCanvas(snapshot.source, sourceCanvas, sourceCtx),
            drawDataUrlToCanvas(snapshot.visible, canvas, ctx)
        ]).then(() => {
            overlay.width = canvas.width;
            overlay.height = canvas.height;
            groups = cloneGroups(snapshot.groups);
            hasResult = snapshot.hasResult;
            resultBaseDataUrl = snapshot.resultBaseDataUrl;
            saved = snapshot.saved;
            syncCanvasDisplay();
            syncResultFromVisible();
            clearOverlay();
            renderGroups();
            renderSamples();
            renderLegend();
            updateSelectedGroupUI();
            updateStats();
            updateHistoryButtons();
        });
    }

    function updateHistoryButtons() {
        $("undoAction").disabled = historyIndex <= 0;
        $("redoAction").disabled = historyIndex >= history.length - 1;
    }

    function setStep(step) {
        currentStep = step;

        document.querySelectorAll(".button-image-step").forEach((section) => {
            const itemStep = Number(section.dataset.step);
            const header = section.querySelector(".button-image-step__header");
            const status = section.querySelector(".button-image-step__status");

            section.classList.toggle("is-active", itemStep === step);
            section.classList.toggle("is-done", itemStep < step);
            header.classList.toggle("active", itemStep === step);

            if (itemStep < step) {
                status.textContent = "완료";
            } else if (itemStep === step) {
                status.textContent = "진행중";
            } else {
                status.textContent = "대기";
            }
        });

        if (step === 2) {
            mode = "sample";
        }

        if (step === 3 && !hasResult && getSampleCount() > 0) {
            generateButtonImage(true);
        }

        updateToolButtons();
    }

    function setZoom(nextZoom) {
        zoom = Math.min(2.5, Math.max(0.35, Number(nextZoom.toFixed(2))));
        syncCanvasDisplay();
    }

    function syncCanvasDisplay() {
        const width = canvas.width * zoom;
        const height = canvas.height * zoom;

        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        overlay.style.width = `${width}px`;
        overlay.style.height = `${height}px`;
        box.style.width = `${width}px`;
        box.style.height = `${height}px`;

        $("zoomValue").textContent = `${Math.round(zoom * 100)}%`;
    }

    function resizeVisibleCanvas(width, height) {
        canvas.width = width;
        canvas.height = height;
        overlay.width = width;
        overlay.height = height;
        resultCanvas.width = width;
        resultCanvas.height = height;
        syncCanvasDisplay();
    }

    function syncResultFromVisible() {
        resultCanvas.width = canvas.width;
        resultCanvas.height = canvas.height;
        resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
        resultCtx.drawImage(canvas, 0, 0);
    }

    function drawCropRect(start, end) {
        const rect = normalizeRect(start, end);

        clearOverlay();

        octx.save();
        octx.fillStyle = "rgba(37, 99, 235, 0.12)";
        octx.strokeStyle = "#2563eb";
        octx.lineWidth = 2;
        octx.setLineDash([6, 4]);
        octx.fillRect(rect.x, rect.y, rect.w, rect.h);
        octx.strokeRect(rect.x, rect.y, rect.w, rect.h);
        octx.restore();
    }

    function clearOverlay() {
        octx.clearRect(0, 0, overlay.width, overlay.height);
    }

    function updateLoupe(point, event) {
        if (!sourceCanvas.width || !sourceCanvas.height) {
            return;
        }

        const x = clamp(Math.round(point.x), 0, sourceCanvas.width - 1);
        const y = clamp(Math.round(point.y), 0, sourceCanvas.height - 1);
        const data = sourceCtx.getImageData(x, y, 1, 1).data;
        const hex = rgbToHex(data[0], data[1], data[2]);
        const loupe = $("colorLoupe");

        $("loupeChip").style.background = hex;
        $("loupeHex").textContent = hex;
        $("loupePoint").textContent = `X ${x}, Y ${y}`;

        loupe.classList.add("is-show");

        const rect = box.getBoundingClientRect();
        const left = event.clientX - rect.left + 18;
        const top = event.clientY - rect.top + 18;

        loupe.style.transform = `translate(${left}px, ${top}px)`;
    }

    function hideLoupe() {
        const loupe = $("colorLoupe");

        loupe.classList.remove("is-show");
        loupe.style.transform = "translate(-9999px, -9999px)";
    }

    function updateStats() {
        $("imageSizeText").textContent = canvas.width && canvas.height ? `${canvas.width} × ${canvas.height}` : "-";
        $("sampleCountText").textContent = `${getSampleCount()}개`;
        $("saveStateText").textContent = saved ? "저장됨" : "미저장";
    }

    function getSampleCount() {
        return groups.reduce((sum, group) => sum + group.samples.length, 0);
    }

    function getSelectedGroup() {
        return getGroup(selectedGroupId);
    }

    function getGroup(id) {
        return groups.find((group) => group.id === id) || groups[0];
    }

    function getCanvasPoint(event) {
        if (!canvas.width || !canvas.height) {
            return null;
        }

        const rect = canvas.getBoundingClientRect();

        return {
            x: (event.clientX - rect.left) * (canvas.width / rect.width),
            y: (event.clientY - rect.top) * (canvas.height / rect.height)
        };
    }

    function normalizeRect(a, b) {
        const x = Math.min(a.x, b.x);
        const y = Math.min(a.y, b.y);
        const w = Math.abs(a.x - b.x);
        const h = Math.abs(a.y - b.y);

        return { x, y, w, h };
    }

    function isValidCropRect(rect) {
        return rect && rect.w >= 20 && rect.h >= 20;
    }

    function drawDataUrlToCanvas(dataUrl, targetCanvas, targetCtx) {
        return new Promise((resolve, reject) => {
            const image = new Image();

            image.onload = () => {
                targetCanvas.width = image.naturalWidth;
                targetCanvas.height = image.naturalHeight;
                targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
                targetCtx.drawImage(image, 0, 0);
                resolve();
            };

            image.onerror = reject;
            image.src = dataUrl;
        });
    }

    function colorDistance(r1, g1, b1, r2, g2, b2) {
        const dr = r1 - r2;
        const dg = g1 - g2;
        const db = b1 - b2;

        return Math.sqrt((dr * dr) + (dg * dg) + (db * db));
    }

    function hexToRgb(hex) {
        const value = hex.replace("#", "");

        return {
            r: parseInt(value.substring(0, 2), 16),
            g: parseInt(value.substring(2, 4), 16),
            b: parseInt(value.substring(4, 6), 16)
        };
    }

    function rgbToHex(r, g, b) {
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
    }

    function toHex(value) {
        return Number(value).toString(16).padStart(2, "0");
    }

    function getPixelColor(data, index) {
        const offset = index * 4;

        return {
            r: data[offset],
            g: data[offset + 1],
            b: data[offset + 2],
            a: data[offset + 3]
        };
    }

    function isBackgroundPixel(data, index, background) {
        const offset = index * 4;

        return data[offset] === background.r
            && data[offset + 1] === background.g
            && data[offset + 2] === background.b;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function toast(message) {
        const toastElement = $("toast");

        toastElement.textContent = message;
        toastElement.classList.add("show");

        clearTimeout(window.__seatButtonImageToastTimer);

        window.__seatButtonImageToastTimer = setTimeout(() => {
            toastElement.classList.remove("show");
        }, 2000);
    }
})();