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
        flipX: false,
        flipY: false,
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
        resizeCorner: null,
        baseChangeWarningAccepted: false,
        cropApplied: false,
        transformSaved: false,
        cropStepExpanded: true
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
        bindClick("stage1RotateLeft", () => rotate(-90));
        bindClick("stage1RotateRight", () => rotate(90));
        bindClick("stage1FlipX", flipHorizontal);
        bindClick("stage1FlipY", flipVertical);
        bindClick("cropReset", resetView);
        bindClick("cropSelectStepHeader", toggleCropStepSummary);
        bindClick("cropApply", applyCropAndOpenTransform);
        bindClick("cropSave", applyCropAndOpenTransform);
        bindClick("runCropSave", applyCropAndOpenTransform);
        bindClick("transformApply", saveTransformAndExit);
        bindClick("goStage2", goStage2);
        window.SeatMapCustomHeaderSave = saveCurrentStage1Work;
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
        state.cropApplied = Boolean(project && (project.status === "CROPPED" || project.status === "STAGE1_CROPPED" || localStorage.getItem(stage1CropDoneKey(project)) === "true"));
        state.transformSaved = Boolean(project && localStorage.getItem(stage1TransformDoneKey(project)) === "true");

        renderProjectInfo();
        updateStepState();

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
            state.flipX = false;
            state.flipY = false;
            state.zoom = 1;
            syncMiniMapSource(src);
            updateTransformSummary();
            updateStepState();
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
        if (isCropPartEditable()) {
            selectFullArea();
        } else {
            state.crop = null;
            draw();
        }
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
        ctx.scale(state.flipX ? -1 : 1, state.flipY ? -1 : 1);

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
        if (!isCropPartEditable() || !state.crop) {
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
        return {
            x: 0,
            y: 0,
            w: Math.max(40, state.canvasWidth),
            h: Math.max(40, state.canvasHeight)
        };
    }

    function selectFullArea() {
        if (!isCropPartEditable()) {
            toast("자를 영역 선택 파트를 먼저 열어주세요.");
            return;
        }
        state.crop = fullCrop();
        draw();
    }

    function clearCropArea() {
        if (!isCropPartEditable()) {
            toast("자를 영역 선택 파트를 먼저 열어주세요.");
            return;
        }
        state.crop = null;
        draw();
    }

    function resetView() {
        state.rotation = 0;
        state.flipX = false;
        state.flipY = false;
        state.zoom = 1;
        updateZoomValue();
        updateTransformSummary();
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
        markTransformDirty();
        fitToScreen();
        updateTransformSummary();
    }

    function flipHorizontal() {
        if (!state.image) {
            return;
        }

        state.flipX = !state.flipX;
        markTransformDirty();
        draw();
        updateTransformSummary();
    }

    function flipVertical() {
        if (!state.image) {
            return;
        }

        state.flipY = !state.flipY;
        markTransformDirty();
        draw();
        updateTransformSummary();
    }

    function updateTransformSummary() {
        const summary = $("cropTransformSummary");
        const flipTexts = [];

        if (state.flipX) flipTexts.push("좌우");
        if (state.flipY) flipTexts.push("상하");

        if (summary) {
            summary.textContent = `회전 ${state.rotation}° · ${flipTexts.length ? flipTexts.join("/") + " 뒤집기" : "뒤집기 없음"}`;
        }

        const flipXButton = $("stage1FlipX");
        const flipYButton = $("stage1FlipY");
        if (flipXButton) flipXButton.classList.toggle("is-active", state.flipX);
        if (flipYButton) flipYButton.classList.toggle("is-active", state.flipY);
    }

    function startDrag(event) {
        if (!state.image || !isCropPartEditable()) {
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
        if (!isCropPartEditable() || !state.dragging || !state.crop) {
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

    async function applyCropAndOpenTransform(event) {
        await saveCropImage(event?.currentTarget || $("cropApply"), { openTransform: true });
    }

    async function saveCropImage(buttonOverride, options = {}) {
        if (!state.image || !state.project) {
            toast("저장할 도면이 없습니다.");
            return false;
        }

        if (!state.crop) {
            toast("자를 영역을 먼저 선택하세요.");
            return false;
        }

        if (!state.baseChangeWarningAccepted) {
            const confirmed = window.confirm(
                "자르기를 적용하면 현재 도면의 기준 이미지가 선택 영역으로 교체됩니다.\n"
                + "이후 버튼 이미지화, 구역, 좌석 배치는 변경된 도면 기준으로 다시 진행됩니다.\n\n"
                + "계속 적용할까요?"
            );

            if (!confirmed) {
                return false;
            }

            state.baseChangeWarningAccepted = true;
        }

        const button = buttonOverride || $("cropApply") || $("cropSave");
        const oldText = button ? button.textContent : "";

        try {
            if (button) {
                button.disabled = true;
                button.textContent = "저장 중...";
            }

            const imageDataUrl = buildCroppedImageDataUrl();
            state.transformSaved = false;
            if (state.project) {
                localStorage.removeItem(stage1TransformDoneKey(state.project));
            }
            clearDerivedSeatMapState();

            const response = await fetch(TEMP_SAVE_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({
                    page: "stage1",
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
            const savedImageUrl = rememberStage1Image(result, imageDataUrl);
            state.crop = null;
            updateProjectAfterSave(savedImageUrl, result);
            markCropApplied();
            replaceCurrentBaseImage(savedImageUrl);

            if (button) {
                button.textContent = "저장 완료";
                window.setTimeout(() => {
                    button.textContent = oldText;
                    button.disabled = false;
                }, 800);
            }

            toast(options.openTransform ? "자르기를 적용했습니다. 이제 도면 방향을 보정하세요." : "기준 도면을 선택 영역으로 갱신했습니다.");
            return true;
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
            return false;
        }
    }

    async function saveTransformImage(event, options = {}) {
        if (!state.image || !state.project) {
            toast("저장할 도면이 없습니다.");
            return false;
        }

        if (!state.cropApplied) {
            toast("먼저 자르기를 적용하세요.");
            return false;
        }

        const button = event?.currentTarget || $("transformApply");
        const oldText = button ? button.textContent : "";

        try {
            if (button) {
                button.disabled = true;
                button.textContent = "저장 중...";
            }

            const imageDataUrl = buildTransformedImageDataUrl();
            clearDerivedSeatMapState();

            const response = await fetch(TEMP_SAVE_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({
                    page: "stage1",
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
            const savedImageUrl = rememberStage1Image(result, imageDataUrl);
            state.crop = null;
            updateProjectAfterSave(savedImageUrl, result);
            markTransformSaved();
            replaceCurrentBaseImage(savedImageUrl);

            if (button) {
                button.textContent = "저장 완료";
                window.setTimeout(() => {
                    button.textContent = oldText;
                    button.disabled = false;
                }, 800);
            }

            if (!options.silent) {
                toast("Stage 1 마무리 저장을 완료했습니다.");
            }
            return true;
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
            return false;
        }
    }

    function buildTransformedImageDataUrl() {
        const canvas = $("cropCanvas");
        const cleanCanvas = document.createElement("canvas");
        cleanCanvas.width = canvas.width;
        cleanCanvas.height = canvas.height;
        drawBaseImage(cleanCanvas.getContext("2d"), cleanCanvas.width, cleanCanvas.height);
        return cleanCanvas.toDataURL("image/png");
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

    function replaceCurrentBaseImage(imageDataUrl) {
        if (!imageDataUrl) {
            return;
        }

        const image = new Image();
        image.onload = () => {
            state.image = image;
            state.imageDataUrl = imageDataUrl;
            state.rotation = 0;
            state.flipX = false;
            state.flipY = false;
            state.zoom = 1;
            updateTransformSummary();
            syncMiniMapSource(imageDataUrl);
            fitToScreen();
        };
        image.src = imageDataUrl;
    }

    function clearDerivedSeatMapState() {
        [
            "seat_button_resultImage",
            "seat_button_imageMeta",
            "seat_button_groups",
            "seat_button_selectedGroups",
            "concert_cleanImage",
            "concert_buttonImage",
            "concert_buttonImageMeta",
            "concert_sections",
            "concert_seats",
            "concert_extractSettings",
            "concert_finalLayout",
            "concert_imageMeta"
        ].forEach((key) => localStorage.removeItem(key));
    }


    function saveCurrentStage1Work(event) {
        if (!state.cropApplied || state.cropStepExpanded) {
            return saveCropImage(event?.currentTarget || $("cropApply"), { openTransform: true });
        }

        return saveTransformImage(event, { silent: false });
    }

    async function saveTransformAndExit(event) {
        const saved = await saveTransformImage(event, { silent: true });
        if (!saved || !state.project) {
            return;
        }

        location.href = `/admin/seatmap/main?projectId=${encodeURIComponent(state.project.folderName || state.project.id)}`;
    }

    function isCropPartEditable() {
        return !state.cropApplied || state.cropStepExpanded;
    }

    function rememberStage1Image(result, fallbackDataUrl) {
        const url = addCacheBuster(result?.croppedImageUrl || result?.imageUrl || fallbackDataUrl);
        clearLocalImageCache();
        safeLocalSet("seatmap_crop_originalImage", url);
        safeLocalSet("seatmap_cropped_image", url);
        safeLocalSet("seatmap_cropped_image_url", url);
        safeLocalSet("seat_button_originalImage", url);
        safeLocalSet("concert_originalImage", url);
        return url;
    }

    function clearLocalImageCache() {
        [
            "seatmap_crop_originalImage",
            "seatmap_cropped_image",
            "seat_button_originalImage",
            "concert_originalImage",
            "seat_button_resultImage",
            "concert_buttonImage",
            "concert_cleanImage"
        ].forEach((key) => localStorage.removeItem(key));
    }

    function safeLocalSet(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (error) {
            console.warn("localStorage 저장 생략:", key, error);
        }
    }

    function addCacheBuster(url) {
        if (!url || url.startsWith("data:image")) {
            return url;
        }
        const separator = url.includes("?") ? "&" : "?";
        return `${url}${separator}t=${Date.now()}`;
    }

    function stripHeavyProjectData(project) {
        if (!project) {
            return project;
        }
        const imageDataUrl = typeof project.imageDataUrl === "string" && project.imageDataUrl.startsWith("data:image")
            ? (project.files?.croppedImage || project.files?.image || project.files?.originalImage || "")
            : project.imageDataUrl;
        return { ...project, imageDataUrl };
    }

    function updateProjectAfterSave(imageDataUrl, result) {
        const projects = getProjects().map(stripHeavyProjectData);
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

        safeLocalSet(PROJECTS_KEY, JSON.stringify(projects.slice(0, 80)));
        safeLocalSet(CURRENT_PROJECT_KEY, updated.id);
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

    function toggleCropStepSummary() {
        if (!state.cropApplied) {
            return;
        }

        state.cropStepExpanded = !state.cropStepExpanded;
        updateStepState();
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

    function markCropApplied() {
        state.cropApplied = true;
        state.transformSaved = false;
        state.cropStepExpanded = false;
        if (state.project) {
            localStorage.setItem(stage1CropDoneKey(state.project), "true");
            localStorage.removeItem(stage1TransformDoneKey(state.project));
        }
        updateStepState();
    }

    function markTransformDirty() {
        if (!state.cropApplied) {
            return;
        }

        state.transformSaved = false;
        if (state.project) {
            localStorage.removeItem(stage1TransformDoneKey(state.project));
        }
        updateStepState();
    }

    function markTransformSaved() {
        state.transformSaved = true;
        if (state.project) {
            localStorage.setItem(stage1TransformDoneKey(state.project), "true");
        }
        updateStepState();
    }

    function updateStepState() {
        const transformStep = $("transformStep");
        const transformHeader = $("transformStepHeader");
        const cropApply = $("cropApply");
        const transformApply = $("transformApply");
        const goButton = $("goStage2");
        const transformButtons = ["stage1RotateLeft", "stage1RotateRight", "stage1FlipX", "stage1FlipY"]
            .map((id) => $(id))
            .filter(Boolean);
        const firstStep = $("cropSelectStep") || document.querySelector(".crop-step-list .crop-step:first-child");
        const firstHeader = $("cropSelectStepHeader");

        if (!transformStep || !firstStep) {
            return;
        }

        const cropDone = Boolean(state.cropApplied);
        const firstExpanded = !cropDone || state.cropStepExpanded;
        const transformEnabled = cropDone && !firstExpanded;
        const transformDone = Boolean(state.transformSaved) && transformEnabled;

        firstStep.classList.toggle("is-complete", cropDone && !firstExpanded);
        firstStep.classList.toggle("is-active", firstExpanded);
        firstStep.classList.toggle("is-collapsed", cropDone && !firstExpanded);
        firstStep.classList.toggle("is-summary", cropDone && !firstExpanded);
        firstStep.classList.toggle("is-editing", cropDone && firstExpanded);

        const firstStatus = firstStep.querySelector(".crop-step__status");
        const firstArrow = firstStep.querySelector(".crop-step__arrow");
        if (firstStatus) firstStatus.textContent = !cropDone ? "진행중" : firstExpanded ? "수정중" : "완료";
        if (firstArrow) firstArrow.textContent = firstExpanded ? "⌃" : "⌄";
        if (firstHeader) {
            firstHeader.disabled = false;
            firstHeader.setAttribute("aria-expanded", firstExpanded ? "true" : "false");
            firstHeader.title = cropDone
                ? (firstExpanded ? "자르기 편집 닫기" : "자르기 영역 다시 열기")
                : "자르기 영역 선택 진행 중";
        }

        transformStep.classList.toggle("is-disabled", !transformEnabled);
        transformStep.classList.toggle("is-locked", !transformEnabled);
        transformStep.classList.toggle("is-active", transformEnabled && !transformDone);
        transformStep.classList.toggle("is-complete", transformDone);
        transformStep.classList.toggle("is-collapsed", !transformEnabled || transformDone);
        transformStep.classList.toggle("is-summary", transformDone);

        const status = transformStep.querySelector(".crop-step__status");
        const arrow = transformStep.querySelector(".crop-step__arrow");
        if (status) status.textContent = !transformEnabled ? "대기" : transformDone ? "완료" : "진행중";
        if (arrow) arrow.textContent = transformEnabled && !transformDone ? "⌃" : "⌄";
        if (transformHeader) {
            transformHeader.disabled = !transformEnabled;
            transformHeader.setAttribute("aria-expanded", transformEnabled && !transformDone ? "true" : "false");
        }

        transformButtons.forEach((button) => button.disabled = !transformEnabled || transformDone);
        if (transformApply) {
            transformApply.disabled = !transformEnabled || transformDone;
            transformApply.textContent = transformDone ? "저장 완료" : "저장하고 나가기";
        }
        if (goButton) goButton.disabled = !transformEnabled;

        if (cropApply) cropApply.textContent = cropDone ? "자르기 다시 적용" : "자르기";

        if (!isCropPartEditable()) {
            state.crop = null;
        }
        draw();
    }

    async function goStage2(event) {
        if (!state.project) {
            location.href = "/admin/seatmap/stage/2";
            return;
        }

        if (!state.cropApplied) {
            toast("먼저 자르기를 적용하세요.");
            return;
        }

        if (!state.transformSaved) {
            const saved = await saveTransformImage(event, { silent: true });
            if (!saved) {
                return;
            }
        }

        location.href = `/admin/seatmap/stage/2?projectId=${encodeURIComponent(state.project.folderName || state.project.id)}`;
    }

    function stage1CropDoneKey(project) {
        return `seatmap_stage1_crop_done_${project?.folderName || project?.id || "default"}`;
    }

    function stage1TransformDoneKey(project) {
        return `seatmap_stage1_transform_done_${project?.folderName || project?.id || "default"}`;
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
