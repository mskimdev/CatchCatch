(() => {
    "use strict";

    const TEMP_SAVE_URL = "/admin/seatmap/temp-save";
    const PROJECTS_KEY = "seatmap_projects";
    const CURRENT_PROJECT_KEY = "seatmap_current_project_id";
    const DUMMY_SEATS = [{ id: "1-A-1-1-VIP-AVAILABLE" }];
    const DUMMY_SECTIONS = [{ id: "1-A", name: "A구역", grade: "VIP", seatCount: 0 }];

    const state = {
        image: null,
        imageDataUrl: null,
        project: null,
        rotation: 0,
        zoom: 1,
        baseScale: 1,
        canvasWidth: 900,
        canvasHeight: 600,
        crop: null,
        dragging: false,
        dragMode: null,
        dragStartX: 0,
        dragStartY: 0,
        dragOffsetX: 0,
        dragOffsetY: 0,
        resizeCorner: null
    };

    const $ = (id) => document.getElementById(id);

    document.addEventListener("DOMContentLoaded", () => {
        bindButtons();
        initProject();
    });

    function bindButtons() {
        bindClick("zoomOut", () => setZoom(state.zoom - 0.12));
        bindClick("zoomIn", () => setZoom(state.zoom + 0.12));
        bindClick("zoomFit", fitToScreen);
        bindClick("zoomReset", resetView);

        // 이전 crop 전용 ID와도 호환
        bindClick("cropZoomOut", () => setZoom(state.zoom - 0.12));
        bindClick("cropZoomIn", () => setZoom(state.zoom + 0.12));
        bindClick("cropFit", fitToScreen);
        bindClick("cropRotateLeft", () => rotate(-90));
        bindClick("cropRotateRight", () => rotate(90));
        bindClick("cropReset", resetView);
        bindClick("cropSave", saveCropImage);
        bindClick("runCropSave", saveCropImage);
        window.SeatMapCustomHeaderSave = saveCropImage;
        bindClick("applyFullCrop", selectFullArea);
        bindClick("clearCropArea", clearCropArea);
        bindClick("openMainPage", () => location.href = "/admin/seatmap/main");

        const canvas = $("cropCanvas");
        if (canvas) {
            canvas.addEventListener("mousedown", startDrag);
            canvas.addEventListener("mousemove", dragCrop);
            canvas.addEventListener("mouseup", endDrag);
            canvas.addEventListener("mouseleave", endDrag);
            canvas.addEventListener("wheel", handleWheel, { passive: false });
        }
    }

    function bindClick(id, handler) {
        const element = $(id);
        if (!element) {
            return;
        }
        element.addEventListener("click", (event) => {
            event.preventDefault();
            handler(event);
        });
    }

    function initProject() {
        const urlProjectId = new URLSearchParams(location.search).get("projectId");
        const currentId = urlProjectId || localStorage.getItem(CURRENT_PROJECT_KEY);
        let project = null;

        if (currentId) {
            project = getProjects().find((item) => item.id === currentId || item.folderName === currentId) || null;
        }

        if (!project) {
            project = getCurrentProject();
        }

        state.project = project;

        renderProjectInfo();

        if (!project) {
            drawEmptyCanvas("새 도면을 먼저 생성하세요.");
            toast("새 도면을 먼저 생성하세요.");
            return;
        }

        localStorage.setItem(CURRENT_PROJECT_KEY, project.id);
        localStorage.setItem("seatmap_current_folder_name", project.folderName);

        const imageDataUrl = localStorage.getItem("seatmap_crop_originalImage")
            || localStorage.getItem("seatmap_cropped_image")
            || project.imageDataUrl
            || localStorage.getItem("seat_button_originalImage")
            || localStorage.getItem("concert_originalImage");

        if (imageDataUrl) {
            loadImage(imageDataUrl);
            return;
        }

        const imageUrl = project.files?.originalImage || project.files?.image || project.files?.croppedImage;
        if (imageUrl) {
            loadImage(`${imageUrl}?t=${Date.now()}`);
            return;
        }

        drawEmptyCanvas("도면 이미지를 찾을 수 없습니다.");
        toast("도면 이미지를 찾을 수 없습니다.");
    }

    function renderProjectInfo() {
        const project = state.project;
        const name = $("cropProjectName");
        const path = $("cropProjectPath");
        const savePath = $("cropSavePath");

        if (!project) {
            if (name) name.textContent = "도면 없음";
            if (path) path.textContent = "새 도면을 먼저 생성하세요.";
            return;
        }

        if (name) name.textContent = project.name;
        if (path) path.textContent = `/temp/seatmap/${project.folderName}`;
        if (savePath) savePath.textContent = `/temp/seatmap/${project.folderName}/seatmap-image.png`;
        const stageLabel = $("cropProjectStage");
        if (stageLabel) stageLabel.textContent = project.status || "도면 정리";
    }

    function loadImage(src) {
        const image = new Image();
        image.onload = () => {
            state.image = image;
            state.imageDataUrl = src;
            state.rotation = 0;
            state.zoom = 1;
            syncMiniMapSource(src);
            fitToScreen();
        };
        image.onerror = () => {
            drawEmptyCanvas("이미지를 불러오지 못했습니다.");
            toast("이미지를 불러오지 못했습니다.");
        };
        image.src = src;
    }

    function drawEmptyCanvas(message) {
        const canvas = $("cropCanvas");
        if (!canvas) {
            return;
        }

        canvas.width = 900;
        canvas.height = 520;
        canvas.style.width = "900px";
        canvas.style.height = "520px";

        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#64748b";
        ctx.font = "700 20px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    }

    function fitToScreen() {
        if (!state.image) {
            return;
        }

        const wrap = $("cropCanvasWrap");
        const maxWidth = Math.max(600, (wrap?.clientWidth || 1100) - 80);
        const maxHeight = Math.max(420, (wrap?.clientHeight || 700) - 80);
        const rotated = getRotatedImageSize();
        const scale = Math.min(maxWidth / rotated.width, maxHeight / rotated.height, 1.2);

        state.baseScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
        state.zoom = 1;
        updateCanvasSize();
        selectFullArea();
        draw();
    }

    function updateCanvasSize() {
        const canvas = $("cropCanvas");
        if (!canvas || !state.image) {
            return;
        }

        const rotated = getRotatedImageSize();
        const displayWidth = Math.max(120, Math.round(rotated.width * state.baseScale * state.zoom));
        const displayHeight = Math.max(120, Math.round(rotated.height * state.baseScale * state.zoom));

        state.canvasWidth = displayWidth;
        state.canvasHeight = displayHeight;
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;
    }

    function draw() {
        const canvas = $("cropCanvas");
        if (!canvas || !state.image) {
            return;
        }

        const ctx = canvas.getContext("2d");
        drawBaseImage(ctx, canvas.width, canvas.height);

        drawCropOverlay(ctx);
        updateCropSummary();
        updateMiniViewport();
    }

    function drawBaseImage(ctx, width, height) {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate((state.rotation * Math.PI) / 180);

        const imageScale = state.baseScale * state.zoom;
        ctx.drawImage(
            state.image,
            -state.image.width * imageScale / 2,
            -state.image.height * imageScale / 2,
            state.image.width * imageScale,
            state.image.height * imageScale
        );
        ctx.restore();
    }

    function drawCropOverlay(ctx) {
        if (!state.crop) {
            return;
        }

        const crop = normalizeCrop(state.crop);
        state.crop = crop;

        ctx.save();
        // 원본 도면은 절대 흐리게 만들지 않는다. 선택 영역은 선과 핸들만 표시한다.
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 6]);
        ctx.strokeRect(crop.x, crop.y, crop.w, crop.h);
        ctx.setLineDash([]);

        ctx.fillStyle = "rgba(239, 68, 68, 0.95)";
        drawHandle(ctx, crop.x, crop.y);
        drawHandle(ctx, crop.x + crop.w, crop.y);
        drawHandle(ctx, crop.x, crop.y + crop.h);
        drawHandle(ctx, crop.x + crop.w, crop.y + crop.h);
        ctx.restore();
    }

    function drawHandle(ctx, x, y) {
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    function fullCrop() {
        const marginX = Math.round(state.canvasWidth * 0.06);
        const marginY = Math.round(state.canvasHeight * 0.06);
        return {
            x: marginX,
            y: marginY,
            w: Math.max(40, state.canvasWidth - marginX * 2),
            h: Math.max(40, state.canvasHeight - marginY * 2)
        };
    }

    function selectFullArea() {
        state.crop = fullCrop();
        draw();
    }

    function clearCropArea() {
        state.crop = null;
        draw();
    }

    function resetView() {
        state.rotation = 0;
        state.zoom = 1;
        updateZoomValue();
        fitToScreen();
    }

    function setZoom(value) {
        if (!state.image) {
            return;
        }

        const oldWidth = state.canvasWidth;
        const oldHeight = state.canvasHeight;
        const oldCrop = state.crop ? { ...state.crop } : fullCrop();

        state.zoom = Math.max(0.25, Math.min(3, value));
        updateCanvasSize();

        const ratioX = state.canvasWidth / oldWidth;
        const ratioY = state.canvasHeight / oldHeight;
        state.crop = normalizeCrop({
            x: oldCrop.x * ratioX,
            y: oldCrop.y * ratioY,
            w: oldCrop.w * ratioX,
            h: oldCrop.h * ratioY
        });

        updateZoomValue();
        draw();
    }

    function updateZoomValue() {
        const value = document.getElementById("zoomValue");
        if (value) {
            value.textContent = `${Math.round(state.zoom * 100)}%`;
        }
    }

    function rotate(delta) {
        if (!state.image) {
            return;
        }

        state.rotation = ((state.rotation + delta) % 360 + 360) % 360;
        fitToScreen();
    }

    function startDrag(event) {
        if (!state.image) {
            return;
        }

        const point = getCanvasPoint(event);
        const crop = state.crop;

        state.dragging = true;
        state.dragStartX = point.x;
        state.dragStartY = point.y;

        const corner = crop ? getHitCorner(point, crop) : null;
        if (corner) {
            state.dragMode = "resize";
            state.resizeCorner = corner;
            return;
        }

        if (crop && isPointInCrop(point, crop)) {
            state.dragMode = "move";
            state.dragOffsetX = point.x - crop.x;
            state.dragOffsetY = point.y - crop.y;
            return;
        }

        state.dragMode = "create";
        state.crop = { x: point.x, y: point.y, w: 1, h: 1 };
        draw();
    }

    function dragCrop(event) {
        if (!state.dragging || !state.crop) {
            return;
        }

        const point = getCanvasPoint(event);

        if (state.dragMode === "create") {
            const x = Math.min(state.dragStartX, point.x);
            const y = Math.min(state.dragStartY, point.y);
            const w = Math.abs(point.x - state.dragStartX);
            const h = Math.abs(point.y - state.dragStartY);
            state.crop = normalizeCrop({ x, y, w, h });
        } else if (state.dragMode === "resize") {
            state.crop = resizeCropByCorner(state.crop, point, state.resizeCorner);
        } else {
            state.crop.x = point.x - state.dragOffsetX;
            state.crop.y = point.y - state.dragOffsetY;
            state.crop = normalizeCrop(state.crop);
        }

        draw();
    }

    function endDrag() {
        state.dragging = false;
        state.dragMode = null;
        state.resizeCorner = null;
    }

    function handleWheel(event) {
        if (!event.ctrlKey) {
            return;
        }

        event.preventDefault();
        setZoom(state.zoom + (event.deltaY < 0 ? 0.08 : -0.08));
    }

    function getCanvasPoint(event) {
        const canvas = $("cropCanvas");
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
        };
    }

    function getHitCorner(point, crop) {
        const hit = 14;
        const corners = [
            { name: "nw", x: crop.x, y: crop.y },
            { name: "ne", x: crop.x + crop.w, y: crop.y },
            { name: "sw", x: crop.x, y: crop.y + crop.h },
            { name: "se", x: crop.x + crop.w, y: crop.y + crop.h }
        ];

        return corners.find((corner) => Math.abs(point.x - corner.x) <= hit && Math.abs(point.y - corner.y) <= hit)?.name || null;
    }

    function resizeCropByCorner(crop, point, corner) {
        const left = crop.x;
        const top = crop.y;
        const right = crop.x + crop.w;
        const bottom = crop.y + crop.h;

        let x1 = left;
        let y1 = top;
        let x2 = right;
        let y2 = bottom;

        if (corner === "nw") { x1 = point.x; y1 = point.y; }
        if (corner === "ne") { x2 = point.x; y1 = point.y; }
        if (corner === "sw") { x1 = point.x; y2 = point.y; }
        if (corner === "se") { x2 = point.x; y2 = point.y; }

        return normalizeCrop({
            x: Math.min(x1, x2),
            y: Math.min(y1, y2),
            w: Math.abs(x2 - x1),
            h: Math.abs(y2 - y1)
        });
    }

    function isPointInCrop(point, crop) {
        return point.x >= crop.x
            && point.x <= crop.x + crop.w
            && point.y >= crop.y
            && point.y <= crop.y + crop.h;
    }

    function normalizeCrop(crop) {
        const minSize = 40;
        const w = Math.max(minSize, Math.min(crop.w, state.canvasWidth));
        const h = Math.max(minSize, Math.min(crop.h, state.canvasHeight));
        const x = Math.max(0, Math.min(crop.x, state.canvasWidth - w));
        const y = Math.max(0, Math.min(crop.y, state.canvasHeight - h));

        return { x, y, w, h };
    }

    async function saveCropImage(buttonOverride) {
        if (!state.image || !state.project) {
            toast("저장할 도면이 없습니다.");
            return;
        }

        if (!state.crop) {
            toast("자를 영역을 먼저 선택하세요.");
            return;
        }

        const button = buttonOverride || $("cropSave");
        const oldText = button ? button.textContent : "";

        try {
            if (button) {
                button.disabled = true;
                button.textContent = "저장 중...";
            }

            const imageDataUrl = buildCroppedImageDataUrl();
            localStorage.setItem("seatmap_cropped_image", imageDataUrl);
            localStorage.setItem("seat_button_originalImage", imageDataUrl);
            localStorage.setItem("concert_originalImage", imageDataUrl);

            const response = await fetch(TEMP_SAVE_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({
                    page: "seatmap-crop-rotate",
                    folderName: state.project.folderName,
                    seatJsonText: state.project.seatJsonText || JSON.stringify(DUMMY_SEATS),
                    sectionJsonText: state.project.sectionJsonText || JSON.stringify(DUMMY_SECTIONS),
                    imageDataUrl
                })
            });

            if (!response.ok) {
                throw new Error(await response.text() || `저장 실패: ${response.status}`);
            }

            const result = await response.json();
            updateProjectAfterSave(imageDataUrl, result);

            if (button) {
                button.textContent = "저장 완료";
                window.setTimeout(() => {
                    button.textContent = oldText;
                    button.disabled = false;
                }, 800);
            }

            toast("자르기/회전 결과를 저장했습니다.");
        } catch (error) {
            console.error(error);
            if (button) {
                button.textContent = "저장 실패";
                window.setTimeout(() => {
                    button.textContent = oldText;
                    button.disabled = false;
                }, 1000);
            }
            toast("저장 실패: " + error.message);
        }
    }

    function buildCroppedImageDataUrl() {
        const canvas = $("cropCanvas");
        const crop = normalizeCrop(state.crop);

        // 화면용 빨간 점선/핸들이 저장 이미지에 섞이지 않도록
        // 같은 크기의 임시 캔버스에 원본 이미지만 다시 그린 뒤 자른다.
        const cleanCanvas = document.createElement("canvas");
        cleanCanvas.width = canvas.width;
        cleanCanvas.height = canvas.height;
        drawBaseImage(cleanCanvas.getContext("2d"), cleanCanvas.width, cleanCanvas.height);

        const offscreen = document.createElement("canvas");
        offscreen.width = Math.round(crop.w);
        offscreen.height = Math.round(crop.h);

        const ctx = offscreen.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, offscreen.width, offscreen.height);
        ctx.drawImage(
            cleanCanvas,
            crop.x,
            crop.y,
            crop.w,
            crop.h,
            0,
            0,
            offscreen.width,
            offscreen.height
        );

        return offscreen.toDataURL("image/png");
    }

    function updateProjectAfterSave(imageDataUrl, result) {
        const projects = getProjects();
        const index = projects.findIndex((item) => item.id === state.project.id || item.folderName === state.project.folderName);
        const updated = {
            ...state.project,
            imageDataUrl,
            status: "CROPPED",
            updatedAt: new Date().toISOString(),
            files: {
                ...state.project.files,
                folder: result.folderUrl || state.project.files?.folder,
                image: result.imageUrl || state.project.files?.image,
                croppedImage: result.croppedImageUrl || state.project.files?.croppedImage,
                seatJson: result.seatJsonUrl || state.project.files?.seatJson,
                sectionJson: result.sectionJsonUrl || state.project.files?.sectionJson
            }
        };

        if (index >= 0) {
            projects[index] = updated;
        } else {
            projects.unshift(updated);
        }

        localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects.slice(0, 80)));
        localStorage.setItem(CURRENT_PROJECT_KEY, updated.id);
        state.project = updated;
        renderProjectInfo();
    }

    function syncMiniMapSource(src) {
        const mini = $("cropMiniMapImage");
        if (mini) {
            mini.src = src;
        }
    }

    function updateCropSummary() {
        const summary = $("cropSelectionSummary");
        if (!summary) {
            return;
        }

        if (!state.crop) {
            summary.textContent = "선택 영역 없음";
            return;
        }

        const crop = normalizeCrop(state.crop);
        summary.textContent = `${Math.round(crop.w)} × ${Math.round(crop.h)}px`;
    }

    function updateMiniViewport() {
        const viewport = $("cropMiniViewport");
        if (!viewport) {
            return;
        }

        if (!state.crop || !state.canvasWidth || !state.canvasHeight) {
            viewport.hidden = true;
            return;
        }

        const crop = normalizeCrop(state.crop);
        viewport.hidden = false;
        viewport.style.left = `${(crop.x / state.canvasWidth) * 100}%`;
        viewport.style.top = `${(crop.y / state.canvasHeight) * 100}%`;
        viewport.style.width = `${(crop.w / state.canvasWidth) * 100}%`;
        viewport.style.height = `${(crop.h / state.canvasHeight) * 100}%`;
    }

    function getRotatedImageSize() {
        const rotation = ((state.rotation % 180) + 180) % 180;
        if (rotation === 90) {
            return { width: state.image.height, height: state.image.width };
        }
        return { width: state.image.width, height: state.image.height };
    }

    function getProjects() {
        try {
            return JSON.parse(localStorage.getItem(PROJECTS_KEY) || "[]");
        } catch (error) {
            return [];
        }
    }

    function getCurrentProject() {
        const id = localStorage.getItem(CURRENT_PROJECT_KEY);
        if (!id) {
            return null;
        }
        return getProjects().find((project) => project.id === id || project.folderName === id) || null;
    }

    function toast(message) {
        const element = $("toast");
        if (!element) {
            alert(message);
            return;
        }

        element.textContent = message;
        element.classList.add("toast--show");

        window.clearTimeout(toast.timer);
        toast.timer = window.setTimeout(() => {
            element.classList.remove("toast--show");
        }, 2200);
    }
})();
