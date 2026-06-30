(() => {
    "use strict";

    const STORAGE_KEYS = {
        originalImage: "concert_originalImage",
        cleanImage: "concert_cleanImage",
        imageMeta: "concert_imageMeta",
        colorRegions: "concert_stage1_colorRegions",
        angleRegions: "concert_stage1_angleRegions",
        selectedAngleRegions: "concert_stage1_selectedAngleRegions",
        baseLayoutsByGroup: "concert_stage1_baseLayoutsByGroup",
        visualGroups: "concert_stage1_visualGroups",
        selectedVisualGroupId: "concert_stage1_selectedVisualGroupId",
        seatSections: "concert_stage1_sections",
        seats: "concert_stage1_seats",
        layouts: "concert_stage1_layouts",
        generatedImage: "concert_stage1_generatedImage",
        concertSections: "concert_sections",
        concertStage3Seats: "concert_stage3_seats",
        concertStage3Layouts: "concert_stage3_layouts"
    };

    const CONCERT_JSON_URL = "/json/seatmap/seatmap-concert-session.json";
    const DEFAULT_IMAGE_URL = "/images/seatmap/generated/seatmap-concert-image.png";
    const DEFAULT_BACKGROUND = "#f7f7f7";

    const ROLE = {
        UNKNOWN: 0,
        BACKGROUND: 1,
        WHITE: 2,
        GRAY: 3,
        BLACK: 4,
        SEAT_PINK: 20,
        SEAT_GREEN: 21,
        SEAT_ORANGE: 22,
        SEAT_PURPLE: 23,
        SEAT_BLUE: 24,
        SEAT_BROWN: 25,
        SEAT_RED: 26
    };

    const ROLE_NAME = {
        [ROLE.SEAT_PINK]: "핑크",
        [ROLE.SEAT_GREEN]: "초록",
        [ROLE.SEAT_ORANGE]: "오렌지",
        [ROLE.SEAT_PURPLE]: "보라",
        [ROLE.SEAT_BLUE]: "하늘",
        [ROLE.SEAT_BROWN]: "갈색",
        [ROLE.SEAT_RED]: "레드"
    };

    const state = {
        width: 0,
        height: 0,
        part: 1,
        completedParts: new Set(),
        originalUrl: "",
        generatedUrl: "",
        colorRegions: [],
        selectedRegionId: null,
        selectedAngleRegionIds: [],
        angleRegions: {},
        baseRegionId: null,
        baseLayoutsByGroup: {},
        visualGroups: [],
        selectedVisualGroupId: null,
        seatSections: [],
        seatsBySection: {},
        layoutsBySection: {},
        roleMap: null,
        imageData: null,
        dragMode: null,
        dragStart: null,
        dragRect: null,
        angleSelectRect: null,
        pointerDown: false,
        previewMode: "original"
    };

    const dom = {};
    let canvas;
    let overlay;
    let ctx;
    let overlayCtx;

    const sourceCanvas = document.createElement("canvas");
    const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });

    const solidCanvas = document.createElement("canvas");
    const solidCtx = solidCanvas.getContext("2d", { willReadFrequently: true });

    document.addEventListener("DOMContentLoaded", init);

    async function init() {
        cacheDom();
        ensureAngleModePanel();
        ensurePart4InfoPanel();
        injectStage1DynamicStyle();
        bindEvents();
        loadSavedState();
        await loadInitialImage();
    }

    function cacheDom() {
        canvas = document.getElementById("canvas");
        overlay = document.getElementById("overlay");

        if (!canvas || !overlay) {
            console.error("[Stage1] canvas 또는 overlay를 찾지 못했습니다.");
            return;
        }

        ctx = canvas.getContext("2d", { willReadFrequently: true });
        overlayCtx = overlay.getContext("2d", { willReadFrequently: true });

        [
            "concertStage1App",
            "box",
            "toast",
            "stage1Title",
            "stage1Size",
            "stage1Guide",
            "part1",
            "part2",
            "part3",
            "part4",
            "tab1",
            "tab2",
            "tab3",
            "tab4",
            "colorMinArea",
            "colorTolerance",
            "extractColorRegions",
            "clearColorRegions",
            "colorRegionList",
            "goPart2",
            "angleDragStart",
            "angleClearSelected",
            "angleRegionName",
            "angleValue",
            "angleRegionList",
            "goPart3",
            "baseFloor",
            "baseSectionName",
            "baseGrade",
            "baseColor",
            "baseRows",
            "baseCols",
            "applyBaseRegion",
            "estimateAllSeats",
            "clearEstimatedSeats",
            "seatEstimateList",
            "goPart4",
            "solidGap",
            "solidBackground",
            "renderSolidSections",
            "showOriginalImage",
            "saveStage1Result",
            "toStage2"
        ].forEach((id) => {
            dom[id] = document.getElementById(id);
        });
    }

    function bindEvents() {
        bind(dom.tab1, "click", () => showPart(1));
        bind(dom.tab2, "click", () => showPart(2));
        bind(dom.tab3, "click", () => showPart(3));
        bind(dom.tab4, "click", () => showPart(4));

        bind(dom.extractColorRegions, "click", extractColorRegions);
        bind(dom.clearColorRegions, "click", clearColorRegions);
        bind(dom.goPart2, "click", () => showPart(2));

        bind(dom.angleGlobalStart, "click", startGlobalAnglePick);
        bind(dom.angleDragStart, "click", startAngleDrag);
        bind(dom.angleClearSelected, "click", clearSelectedAngles);
        bind(dom.goPart3, "click", () => showPart(3));

        bind(dom.applyBaseRegion, "click", applyBaseRegion);
        bind(dom.estimateAllSeats, "click", estimateAllSeats);
        bind(dom.clearEstimatedSeats, "click", clearEstimatedSeats);
        bind(dom.goPart4, "click", () => showPart(4));

        bind(dom.renderSolidSections, "click", renderSolidSections);
        bind(dom.showOriginalImage, "click", showOriginalImage);
        bind(dom.saveStage1Result, "click", saveStage1Result);
        bind(dom.toStage2, "click", moveToStage2);

        if (overlay) {
            overlay.addEventListener("pointerdown", handlePointerDown);
            overlay.addEventListener("pointermove", handlePointerMove);
            overlay.addEventListener("pointerup", handlePointerUp);
            overlay.addEventListener("pointerleave", handlePointerLeave);
            overlay.addEventListener("click", handleCanvasClick);
        }
    }

    function bind(element, eventName, handler) {
        if (element) {
            element.addEventListener(eventName, handler);
        }
    }

    function loadSavedState() {
        state.colorRegions = readJson(STORAGE_KEYS.colorRegions, []);
        state.angleRegions = readJson(STORAGE_KEYS.angleRegions, {});
        state.selectedAngleRegionIds = readJson(STORAGE_KEYS.selectedAngleRegions, []);
        state.baseLayoutsByGroup = readJson(STORAGE_KEYS.baseLayoutsByGroup, {});
        state.visualGroups = readJson(STORAGE_KEYS.visualGroups, []);
        state.selectedVisualGroupId = localStorage.getItem(STORAGE_KEYS.selectedVisualGroupId) || null;
        state.seatSections = readJson(STORAGE_KEYS.seatSections, []);
        state.seatsBySection = readJson(STORAGE_KEYS.seats, {});
        state.layoutsBySection = readJson(STORAGE_KEYS.layouts, {});
        state.generatedUrl = localStorage.getItem(STORAGE_KEYS.generatedImage) || "";

        if (state.colorRegions.length > 0) {
            state.selectedRegionId = state.colorRegions[0].id;
        }
    }

    function getProjectFolderName() {
        const query = new URLSearchParams(location.search);
        return query.get("projectId")
            || localStorage.getItem("seatmap_current_folder_name")
            || localStorage.getItem("seatmap_current_project_id")
            || "seat";
    }

    function getProjectImageUrl(fileName) {
        const folderName = getProjectFolderName();
        return `/temp/seatmap/${encodeURIComponent(folderName)}/${fileName}`;
    }

    async function loadInitialImage() {
        clearBrokenImageCache();

        let url = await readImageUrlFromJson();

        if (!url) {
            url = localStorage.getItem("concert_buttonImage")
                || localStorage.getItem("seatmap_button_image_url")
                || getProjectImageUrl("button-image.png")
                || localStorage.getItem(STORAGE_KEYS.originalImage)
                || localStorage.getItem("seatmap_cropped_image_url")
                || getProjectImageUrl("cropped-image.png")
                || DEFAULT_IMAGE_URL;
        }

        state.originalUrl = appendNoCache(url);

        loadImage(state.originalUrl, (image) => {
            setupCanvas(image.naturalWidth, image.naturalHeight);
            sourceCtx.clearRect(0, 0, state.width, state.height);
            sourceCtx.drawImage(image, 0, 0, state.width, state.height);
            state.imageData = sourceCtx.getImageData(0, 0, state.width, state.height);
            state.roleMap = buildRoleMap(state.imageData, state.width, state.height);

            localStorage.setItem(STORAGE_KEYS.originalImage, url);
            localStorage.setItem("concert_buttonImage", url);

            render();
            syncAllPanels();
            showPart(state.part);
        });
    }

    function clearBrokenImageCache() {
        [
            STORAGE_KEYS.cleanImage,
            STORAGE_KEYS.generatedImage,
            "concert_stage1_generatedImage",
            "concert_generated_overviewImage"
        ].forEach((key) => {
            const value = localStorage.getItem(key);
            if (value && value.startsWith("data:image")) {
                localStorage.removeItem(key);
            }
        });
    }

    async function readImageUrlFromJson() {
        try {
            const response = await fetch(CONCERT_JSON_URL, { method: "GET", cache: "no-store" });

            if (!response.ok) {
                return "";
            }

            const json = await response.json();
            const output = json.output || {};
            const imageUrl =
                output.imageUrl ||
                output.buttonImageUrl ||
                output.resultImageUrl ||
                output.resultImage ||
                json.imageUrl ||
                json.buttonImageUrl ||
                json.resultImageUrl ||
                json.concert_buttonImage ||
                json.buttonImage ||
                json.resultImage ||
                json.seat_button_resultImage ||
                "";

            if (imageUrl) {
                localStorage.setItem(STORAGE_KEYS.originalImage, imageUrl);
                localStorage.setItem("concert_buttonImage", imageUrl);
            }

            return imageUrl;
        } catch (error) {
            console.warn("[Stage1] JSON 이미지 경로 로드 실패", error);
            return "";
        }
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
        solidCanvas.width = width;
        solidCanvas.height = height;

        const scale = Math.min(1, 1120 / width, 760 / height);
        const displayWidth = `${width * scale}px`;
        const displayHeight = `${height * scale}px`;

        canvas.style.width = displayWidth;
        canvas.style.height = displayHeight;
        overlay.style.width = displayWidth;
        overlay.style.height = displayHeight;

        if (dom.box) {
            dom.box.style.width = displayWidth;
            dom.box.style.height = displayHeight;
        }

        if (dom.stage1Size) {
            dom.stage1Size.textContent = `${width} × ${height}`;
        }
    }

    function showPart(partNumber) {
        state.part = partNumber;

        if (dom.concertStage1App) {
            dom.concertStage1App.dataset.part = String(partNumber);
        }

        clearTransientSelectionForPart(partNumber);

        for (let i = 1; i < partNumber; i += 1) {
            state.completedParts.add(i);
        }

        [1, 2, 3, 4].forEach((number) => {
            const part = dom[`part${number}`];
            const tab = dom[`tab${number}`];

            if (!part || !tab) {
                return;
            }

            const active = number === partNumber;
            const done = state.completedParts.has(number);

            part.classList.toggle("is-active", active);
            part.classList.toggle("is-done", done);
            tab.classList.toggle("active", active);

            const status = part.querySelector(".seatmap-step__status");

            if (status) {
                status.textContent = active ? "진행중" : done ? "완료" : "대기";
            }
        });

        updateGuideText();
        render();
        syncAllPanels();
        renderSelectedVisualGroupInfo(partNumber === 4 ? getSelectedVisualGroup() : null);
    }

    function clearTransientSelectionForPart(partNumber) {
        state.pointerDown = false;
        state.dragMode = null;
        state.dragStart = null;
        state.dragRect = null;

        if (partNumber !== 2) {
            state.angleSelectRect = null;
            state.selectedAngleRegionIds = [];
        }
    }

    function updateGuideText() {
        const titles = {
            1: "색상 추출",
            2: "각도 계산",
            3: "전체 좌석 추정",
            4: "깔끔화 / 저장"
        };

        const guides = {
            1: "좌석 색상을 추출해서 구역 후보를 생성하세요.",
            2: "2-1 전체 계산은 STAGE를 한 번 클릭하고, 2-2 보정은 구역을 드래그한 뒤 시선점을 클릭하세요.",
            3: "구역 하나를 클릭해 기준을 잡고, 같은 색상/역할 그룹끼리 좌석을 추정하세요.",
            4: "원본 구조는 유지하고, 한글/좌석선/테두리 없이 도형만 표시하세요."
        };

        if (dom.stage1Title) {
            dom.stage1Title.textContent = titles[state.part] || "";
        }

        if (dom.stage1Guide) {
            dom.stage1Guide.textContent = guides[state.part] || "";
        }

        if (dom.estimateAllSeats) {
            dom.estimateAllSeats.textContent = state.part === 3 ? "선택 색상 그룹 좌석 추정" : dom.estimateAllSeats.textContent;
        }
    }

    function render() {
        if (!ctx || !overlayCtx) {
            return;
        }

        ctx.clearRect(0, 0, state.width, state.height);
        overlayCtx.clearRect(0, 0, state.width, state.height);

        if (state.previewMode === "solid" && state.generatedUrl) {
            loadImage(state.generatedUrl, (image) => {
                ctx.clearRect(0, 0, state.width, state.height);
                overlayCtx.clearRect(0, 0, state.width, state.height);
                ctx.drawImage(image, 0, 0, state.width, state.height);
                if (state.part === 4) {
                    drawSelectedVisualGroupOutline();
                }
            });
            return;
        }

        ctx.drawImage(sourceCanvas, 0, 0, state.width, state.height);
        drawOverlay();
    }

    function drawOverlay() {
        overlayCtx.clearRect(0, 0, state.width, state.height);

        if (state.part === 4) {
            return;
        }

        drawRegionOverlay();

        if (state.part >= 3) {
            drawSeatOverlay();
        }

        if (state.dragRect) {
            drawRect(state.dragRect, "#1d4ed8", "rgba(37, 99, 235, 0.08)", 3);
        }

        if (state.angleSelectRect) {
            drawRect(state.angleSelectRect, "#1d4ed8", "rgba(37, 99, 235, 0.06)", 3);
        }
    }

    function drawRegionOverlay() {
        if (state.part === 3) {
            drawPart3SelectionOverlay();
            return;
        }

        state.colorRegions.forEach((region) => {
            const selected = region.id === state.selectedRegionId;
            const angleSelected = state.selectedAngleRegionIds.includes(region.id);
            const checked = Boolean(state.angleRegions[region.id]?.checked);
            const stroke = checked ? "#22c55e" : angleSelected ? "#1d4ed8" : selected ? "#7c3aed" : "#64748b";
            const fill = checked ? "rgba(34,197,94,0.08)" : angleSelected ? "rgba(37,99,235,0.08)" : selected ? "rgba(124,58,237,0.08)" : "rgba(100,116,139,0.04)";

            drawPolygon(region.polygon, stroke, fill, selected || angleSelected || checked ? 2.5 : 1.5);

            const center = getPolygonCenter(region.polygon);
            overlayCtx.save();
            overlayCtx.font = "bold 13px Arial";
            overlayCtx.textAlign = "center";
            overlayCtx.textBaseline = "middle";
            overlayCtx.fillStyle = checked ? "#15803d" : angleSelected ? "#1d4ed8" : "#475569";
            overlayCtx.fillText(checked ? "✓" : region.name, center.x, center.y);
            overlayCtx.restore();
        });
    }

    function drawPart3SelectionOverlay() {
        const selected = getSelectedRegion();

        if (!selected) {
            return;
        }

        const groupKey = getRegionGroupKey(selected);
        const sameGroupRegions = state.colorRegions.filter((region) => getRegionGroupKey(region) === groupKey);

        sameGroupRegions.forEach((region) => {
            if (region.id === selected.id) {
                return;
            }

            overlayCtx.save();
            overlayCtx.globalAlpha = 0.18;
            drawPolygon(region.polygon, "#64748b", "rgba(100,116,139,0.00)", 1);
            overlayCtx.restore();
        });

        overlayCtx.save();
        overlayCtx.shadowColor = "rgba(124,58,237,0.32)";
        overlayCtx.shadowBlur = 10;
        drawPolygon(selected.polygon, "#7c3aed", "rgba(124,58,237,0.06)", 4);
        overlayCtx.restore();
    }

    function drawSeatOverlay() {
        Object.values(state.seatsBySection).forEach((seats) => {
            seats.forEach((seat) => {
                overlayCtx.save();
                overlayCtx.translate(seat.x, seat.y);
                overlayCtx.rotate(degToRad(seat.angle || 0));
                overlayCtx.fillStyle = "rgba(15, 23, 42, 0.62)";
                overlayCtx.fillRect(-seat.size / 2, -seat.size / 2, seat.size, seat.size);
                overlayCtx.restore();
            });
        });
    }

    function drawRect(rect, stroke, fill, lineWidth) {
        overlayCtx.save();
        overlayCtx.fillStyle = fill;
        overlayCtx.strokeStyle = stroke;
        overlayCtx.lineWidth = lineWidth;
        overlayCtx.setLineDash([8, 5]);
        overlayCtx.fillRect(rect.x, rect.y, rect.w, rect.h);
        overlayCtx.strokeRect(rect.x, rect.y, rect.w, rect.h);
        overlayCtx.restore();
    }

    function drawPolygon(points, stroke, fill, lineWidth) {
        if (!points || points.length < 3) {
            return;
        }

        overlayCtx.save();
        overlayCtx.beginPath();
        overlayCtx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i += 1) {
            overlayCtx.lineTo(points[i].x, points[i].y);
        }

        overlayCtx.closePath();
        overlayCtx.fillStyle = fill;
        overlayCtx.fill();
        overlayCtx.strokeStyle = stroke;
        overlayCtx.lineWidth = lineWidth;
        overlayCtx.stroke();
        overlayCtx.restore();
    }

    function extractColorRegions() {
        if (!state.imageData) {
            toast("이미지를 먼저 불러와야 합니다.");
            return;
        }

        const minArea = positiveNumber(dom.colorMinArea?.value, 120);
        state.roleMap = buildRoleMap(state.imageData, state.width, state.height);
        cleanupRoleMap(state.roleMap, state.width, state.height);

        const components = extractComponents(state.roleMap, state.width, state.height, (role) => isSeatRole(role));
        const regions = [];

        components.forEach((component) => {
            if (component.area < minArea) {
                return;
            }

            regions.push(createRegionFromComponent(component));
        });

        regions.sort((a, b) => Math.abs(a.bbox.y - b.bbox.y) > 20 ? a.bbox.y - b.bbox.y : a.bbox.x - b.bbox.x);

        regions.forEach((region, index) => {
            region.id = `region-${index + 1}`;
            region.name = `구역 ${index + 1}`;
            region.label = region.name;
        });

        state.colorRegions = regions;
        state.selectedRegionId = regions[0]?.id || null;
        state.selectedAngleRegionIds = [];
        state.angleRegions = {};
        state.seatSections = [];
        state.seatsBySection = {};
        state.layoutsBySection = {};
        state.visualGroups = [];
        state.selectedVisualGroupId = null;
        state.previewMode = "original";

        saveWorkState();
        syncAllPanels();
        render();
        toast(`구역 후보 ${regions.length}개를 생성했습니다.`);
    }

    function clearColorRegions() {
        state.colorRegions = [];
        state.selectedRegionId = null;
        state.selectedAngleRegionIds = [];
        state.angleRegions = {};
        state.seatSections = [];
        state.seatsBySection = {};
        state.layoutsBySection = {};
        state.previewMode = "original";
        saveWorkState();
        syncAllPanels();
        render();
        toast("구역 후보를 초기화했습니다.");
    }

    function startGlobalAnglePick() {
        if (state.colorRegions.length <= 0) {
            toast("먼저 파트 1에서 구역 후보를 생성하세요.");
            return;
        }

        state.dragMode = "globalAngleTarget";
        state.dragStart = null;
        state.dragRect = null;
        state.angleSelectRect = null;
        state.selectedAngleRegionIds = [];
        saveWorkState();
        syncAllPanels();
        render();
        toast("전체 구역이 바라볼 STAGE/중앙 지점을 클릭하세요.");
    }

    function startAngleDrag() {
        if (state.colorRegions.length <= 0) {
            toast("먼저 파트 1에서 구역 후보를 생성하세요.");
            return;
        }

        state.dragMode = "angleSelect";
        state.dragStart = null;
        state.dragRect = null;
        state.angleSelectRect = null;
        state.selectedAngleRegionIds = [];
        saveWorkState();
        syncAllPanels();
        render();
        toast("보정할 구역들을 파란 박스로 드래그하세요.");
    }

    function applyGlobalAngleTargetPoint(point) {
        if (state.colorRegions.length <= 0) {
            toast("각도를 적용할 구역 후보가 없습니다.");
            return;
        }

        state.colorRegions.forEach((region) => {
            const result = calculateFacingAndGridAngle(region, point);
            state.angleRegions[region.id] = {
                checked: true,
                mode: "global",
                targetPoint: { x: round(point.x), y: round(point.y) },
                targetFacingAngle: round(result.targetFacingAngle),
                sideAngle: round(result.sideAngle),
                facingAngle: round(result.facingAngle),
                gridAngle: round(result.gridAngle),
                angle: round(result.gridAngle),
                rect: null
            };
        });

        state.dragMode = null;
        state.dragStart = null;
        state.dragRect = null;
        state.angleSelectRect = null;
        state.selectedAngleRegionIds = [];

        saveWorkState();
        syncAllPanels();
        render();
        toast(`전체 ${state.colorRegions.length}개 구역 각도를 계산했습니다.`);
    }

    function clearSelectedAngles() {
        const ids = state.selectedAngleRegionIds.length > 0 ? state.selectedAngleRegionIds : [state.selectedRegionId].filter(Boolean);

        ids.forEach((id) => {
            delete state.angleRegions[id];
        });

        saveWorkState();
        syncAllPanels();
        render();
        toast("선택 구역의 각도를 삭제했습니다.");
    }

    function applyAngleTargetPoint(point) {
        const targetRegions = getAngleTargetRegions();

        if (targetRegions.length <= 0) {
            toast("드래그 박스 안에 선택된 구역이 없습니다.");
            return;
        }

        targetRegions.forEach((region) => {
            const result = calculateFacingAndGridAngle(region, point);
            state.angleRegions[region.id] = {
                checked: true,
                mode: "manual",
                targetPoint: { x: round(point.x), y: round(point.y) },
                targetFacingAngle: round(result.targetFacingAngle),
                sideAngle: round(result.sideAngle),
                facingAngle: round(result.facingAngle),
                gridAngle: round(result.gridAngle),
                angle: round(result.gridAngle),
                rect: state.angleSelectRect ? { ...state.angleSelectRect } : null
            };
        });

        state.selectedRegionId = targetRegions[0].id;
        state.dragMode = null;
        state.dragRect = null;
        state.angleSelectRect = null;
        state.selectedAngleRegionIds = [];

        saveWorkState();
        syncAllPanels();
        render();
        toast(`${targetRegions.length}개 구역 시선 각도를 저장했습니다.`);
    }

    function getAngleTargetRegions() {
        if (state.selectedAngleRegionIds.length > 0) {
            return state.colorRegions.filter((region) => state.selectedAngleRegionIds.includes(region.id));
        }

        const selected = getSelectedRegion();
        return selected ? [selected] : [];
    }

    function calculateFacingAndGridAngle(region, targetPoint) {
        const center = getPolygonCenter(region.polygon);
        const targetFacingAngle = normalizeAngle(radToDeg(Math.atan2(targetPoint.y - center.y, targetPoint.x - center.x)));
        const sideAngle = getRegionSideAxisAngle(region);
        const picked = chooseAnglesBySideAndTarget(sideAngle, targetFacingAngle);

        return {
            targetFacingAngle,
            sideAngle: picked.sideAngle,
            facingAngle: picked.facingAngle,
            gridAngle: picked.gridAngle
        };
    }

    function chooseAnglesBySideAndTarget(sideAngle, targetFacingAngle) {
        const axisA = snapSideAxisAngle(sideAngle);
        const axisB = normalizeAngle(axisA + 90);
        const facingCandidates = [
            axisA,
            normalizeAngle(axisA + 180),
            axisB,
            normalizeAngle(axisB + 180)
        ];

        let bestFacing = facingCandidates[0];
        let bestDiff = Math.abs(angleDiff(targetFacingAngle, bestFacing));

        facingCandidates.forEach((candidate) => {
            const diff = Math.abs(angleDiff(targetFacingAngle, candidate));

            if (diff < bestDiff) {
                bestFacing = candidate;
                bestDiff = diff;
            }
        });

        return {
            sideAngle: axisA,
            facingAngle: normalizeAngle(bestFacing),
            gridAngle: normalizeAngle(bestFacing - 90)
        };
    }

    function snapSideAxisAngle(angle) {
        const targets = [-180, -135, -90, -45, 0, 45, 90, 135, 180];
        let best = normalizeAngle(angle);
        let bestDiff = Infinity;

        targets.forEach((target) => {
            const diff = Math.abs(angleDiff(angle, target));

            if (diff < bestDiff) {
                best = target;
                bestDiff = diff;
            }
        });

        if (bestDiff <= 10) {
            return normalizeAngle(best);
        }

        return normalizeAngle(Math.round(angle / 2.5) * 2.5);
    }

    function getRegionSideAxisAngle(region) {
        const points = region?.polygon || [];

        if (points.length < 2) {
            return 0;
        }

        let bestAngle = 0;
        let bestLength = 0;

        for (let i = 0; i < points.length; i += 1) {
            const a = points[i];
            const b = points[(i + 1) % points.length];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const length = Math.hypot(dx, dy);

            if (length > bestLength) {
                bestLength = length;
                bestAngle = radToDeg(Math.atan2(dy, dx));
            }
        }

        return normalizeAngle(bestAngle);
    }

    function getBoundaryAngleNearGrid(points, gridAngle) {
        if (!points || points.length < 2) {
            return gridAngle;
        }

        const candidates = [];

        for (let i = 0; i < points.length; i += 1) {
            const a = points[i];
            const b = points[(i + 1) % points.length];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const length = Math.hypot(dx, dy);

            if (length < 8) {
                continue;
            }

            const edgeAngle = normalizeAngleToParallel(radToDeg(Math.atan2(dy, dx)), gridAngle);
            const diff = Math.abs(angleDiff(edgeAngle, gridAngle));
            candidates.push({ angle: edgeAngle, diff, length });
        }

        candidates.sort((a, b) => {
            if (Math.abs(a.diff - b.diff) > 0.1) {
                return a.diff - b.diff;
            }
            return b.length - a.length;
        });

        if (candidates.length <= 0) {
            return gridAngle;
        }

        const usable = candidates.filter((item) => item.diff <= 35).slice(0, 3);

        if (usable.length <= 0) {
            return gridAngle;
        }

        let x = 0;
        let y = 0;

        usable.forEach((item) => {
            const weight = Math.max(1, item.length);
            const rad = degToRad(item.angle);
            x += Math.cos(rad) * weight;
            y += Math.sin(rad) * weight;
        });

        return normalizeAngle(radToDeg(Math.atan2(y, x)));
    }

    function stabilizeGridAngle(rawGridAngle, boundaryAngle) {
        const diff = Math.abs(angleDiff(boundaryAngle, rawGridAngle));

        if (diff <= 28) {
            return blendAngles(rawGridAngle, boundaryAngle, 0.35, 0.65);
        }

        return rawGridAngle;
    }

    function snapGridAngle(angle) {
        const snapTargets = [-180, -135, -90, -45, 0, 45, 90, 135, 180];
        let best = normalizeAngle(angle);
        let bestDiff = Infinity;

        snapTargets.forEach((target) => {
            const diff = Math.abs(angleDiff(angle, target));

            if (diff < bestDiff) {
                best = target;
                bestDiff = diff;
            }
        });

        if (bestDiff <= 8) {
            return normalizeAngle(best);
        }

        return normalizeAngle(Math.round(angle / 2.5) * 2.5);
    }

    function applyBaseRegion() {
        const region = getSelectedRegion();

        if (!region) {
            toast("기준 구역을 선택하세요.");
            return;
        }

        const rows = positiveInt(dom.baseRows?.value, 5);
        const cols = positiveInt(dom.baseCols?.value, 10);
        const floor = safeValue(dom.baseFloor?.value, "1");
        const name = safeValue(dom.baseSectionName?.value, region.name);
        const color = safeValue(dom.baseColor?.value, region.color || "#f77bab");
        const gridAngle = getRegionGridAngle(region);
        const facingAngle = getRegionFacingAngle(region);
        const usable = getRegionUsableLocalBox(region, gridAngle);

        // 기준 구역에서 한 번 계산한 좌석 간격을 같은 색상/역할 그룹 전체에 고정한다.
        // 이후 다른 구역은 이 pitchX/pitchY 안에 들어갈 수 있는 좌석 개수만 계산한다.
        const pitchX = Math.max(1, usable.w / cols);
        const pitchY = Math.max(1, usable.h / rows);
        const seatSize = Math.max(2, Math.floor(Math.min(pitchX, pitchY) * getSeatScaleForRegion(region)));
        const groupKey = getRegionGroupKey(region);

        state.baseRegionId = region.id;
        region.floor = floor;
        region.name = name;
        region.label = name;
        region.color = color;

        const baseLayout = {
            groupKey,
            rows,
            cols,
            cellW: pitchX,
            cellH: pitchY,
            pitchX,
            pitchY,
            seatSize,
            seatW: seatSize,
            seatH: seatSize,
            gridAngle,
            facingAngle,
            angle: gridAngle,
            savedAt: new Date().toISOString()
        };

        state.baseLayoutsByGroup[groupKey] = baseLayout;
        state.baseLayoutsByGroup.__last = baseLayout;

        const section = createSeatSection(region, rows, cols, seatSize, gridAngle, facingAngle, baseLayout);
        const seats = buildSeatsForRegionWithCoverage(region, section.layout);

        upsertSeatSection(section);
        state.seatsBySection[section.id] = seats;
        state.layoutsBySection[section.id] = section.layout;

        saveWorkState();
        syncAllPanels();
        render();
        toast(`${region.name} 기준을 ${getGroupLabel(region)} 그룹에 저장했습니다.`);
    }

    function estimateAllSeats() {
        const baseRegion = getSelectedRegion() || state.colorRegions.find((region) => region.id === state.baseRegionId);

        if (!baseRegion) {
            toast("좌석 기준을 잡을 구역을 먼저 클릭하세요.");
            return;
        }

        const groupKey = getRegionGroupKey(baseRegion);

        if (!state.baseLayoutsByGroup[groupKey]) {
            applyBaseRegion();
        }

        const baseLayout = state.baseLayoutsByGroup[groupKey];

        if (!baseLayout) {
            toast("선택 구역 기준 설정에 실패했습니다.");
            return;
        }

        ensureRoleMap();

        const floor = safeValue(dom.baseFloor?.value, "1");
        const targetRegions = state.colorRegions.filter((region) => getRegionGroupKey(region) === groupKey);

        // 같은 색상/역할 그룹만 새로 추정한다. 다른 그룹 좌석은 유지한다.
        const targetIdSet = new Set(targetRegions.map((region) => region.id));
        state.seatSections = state.seatSections.filter((section) => !targetIdSet.has(section.id));

        targetRegions.forEach((region) => {
            delete state.seatsBySection[region.id];
            delete state.layoutsBySection[region.id];
        });

        let estimatedCount = 0;

        targetRegions.forEach((region, index) => {
            const gridAngle = getRegionGridAngle(region);
            const facingAngle = getRegionFacingAngle(region);
            const usable = getRegionUsableLocalBox(region, gridAngle);
            const pitchX = Math.max(2, Number(baseLayout.pitchX || baseLayout.cellW || baseLayout.seatSize || 8));
            const pitchY = Math.max(2, Number(baseLayout.pitchY || baseLayout.cellH || baseLayout.seatSize || 8));

            // 같은 그룹은 좌석 간격을 절대 다시 줄이지 않는다.
            // 구역이 좁으면 좌석 크기/간격을 줄이는 대신 들어갈 수 있는 행/열 개수만 줄인다.
            const rows = Math.max(1, Math.floor((usable.h + pitchY * 0.04) / pitchY));
            const cols = Math.max(1, Math.floor((usable.w + pitchX * 0.04) / pitchX));

            if (!region.name || /^구역\s*\d+$/.test(region.name)) {
                region.name = region.id === baseRegion.id
                    ? safeValue(dom.baseSectionName?.value, "A1")
                    : `구역${index + 1}`;
                region.label = region.name;
            }

            region.floor = region.floor || floor;

            const seatSize = Math.max(2, Math.floor(baseLayout.seatSize));
            const fixedLayout = {
                ...baseLayout,
                pitchX,
                pitchY,
                cellW: pitchX,
                cellH: pitchY,
                seatSize
            };
            const section = createSeatSection(region, rows, cols, seatSize, gridAngle, facingAngle, fixedLayout);
            const seats = buildSeatsForRegionWithCoverage(region, section.layout);

            upsertSeatSection(section);
            state.seatsBySection[section.id] = seats;
            state.layoutsBySection[section.id] = section.layout;
            estimatedCount += seats.length;
        });

        state.baseRegionId = baseRegion.id;
        state.visualGroups = [];
        state.selectedVisualGroupId = null;

        saveWorkState();
        syncAllPanels();
        render();
        toast(`${getGroupLabel(baseRegion)} 그룹 ${targetRegions.length}개 구역 / ${estimatedCount}석을 추정했습니다.`);
    }

    function clearEstimatedSeats() {
        state.seatSections = [];
        state.seatsBySection = {};
        state.layoutsBySection = {};
        state.visualGroups = [];
        state.selectedVisualGroupId = null;
        state.baseRegionId = null;
        saveWorkState();
        syncAllPanels();
        render();
        toast("좌석 추정 결과를 초기화했습니다.");
    }

    function createSeatSection(region, rows, cols, seatSize, gridAngle, facingAngle, presetLayout = null) {
        // presetLayout이 있으면 기준 구역에서 저장한 pitch를 그대로 사용한다.
        // 이 값이 같은 등급/색상 그룹의 좌석 간격을 결정한다.
        const fixedSeatSize = Math.max(2, Math.floor(Number(seatSize || presetLayout?.seatSize || 8)));
        const fixedPitchX = Math.max(fixedSeatSize, Number(presetLayout?.pitchX || presetLayout?.cellW || fixedSeatSize));
        const fixedPitchY = Math.max(fixedSeatSize, Number(presetLayout?.pitchY || presetLayout?.cellH || fixedSeatSize));
        const gridBox = getFixedPitchGridBox(region, gridAngle, rows, cols, fixedPitchX, fixedPitchY);
        const cellW = fixedPitchX;
        const cellH = fixedPitchY;

        const layout = {
            rows,
            cols,
            seatSize: fixedSeatSize,
            seatW: fixedSeatSize,
            seatH: fixedSeatSize,
            gapX: Math.max(0, cellW - fixedSeatSize),
            gapY: Math.max(0, cellH - fixedSeatSize),
            cellW,
            cellH,
            pitchX: cellW,
            pitchY: cellH,
            gridBox,
            gridAngle,
            facingAngle,
            angle: gridAngle,
            coverageThreshold: 0.34,
            centerRequired: true
        };

        return {
            id: region.id,
            name: region.name || region.label || region.id,
            label: region.label || region.name || region.id,
            floor: region.floor || "1",
            color: region.color || "#d9d9d9",
            role: region.role,
            groupKey: getRegionGroupKey(region),
            polygon: clonePoints(region.polygon),
            bbox: { ...region.bbox },
            angle: facingAngle,
            gridAngle,
            facingAngle,
            rows,
            cols,
            seatRows: rows,
            seatCols: cols,
            seatSize: fixedSeatSize,
            layout
        };
    }

    function getFlexibleGridBox(region, gridAngle, rows, cols, seatSize) {
        // 구버전 호출 호환용. 실제 좌석 추정은 getFixedPitchGridBox를 사용한다.
        const pitch = Math.max(2, Number(seatSize || 8));
        return getFixedPitchGridBox(region, gridAngle, rows, cols, pitch, pitch);
    }

    function getRegionUsableLocalBox(region, gridAngle) {
        const center = getPolygonCenter(region.polygon);
        const localPoints = region.polygon.map((point) => rotatePoint(point, center, -gridAngle));
        const polygonBbox = getBbox(localPoints);
        const colorBbox = getAllowedLocalBbox(region, center, gridAngle, polygonBbox);
        const source = colorBbox || polygonBbox;

        return {
            x: source.x,
            y: source.y,
            w: Math.max(1, source.w),
            h: Math.max(1, source.h),
            polygonBbox
        };
    }

    function getFixedPitchGridBox(region, gridAngle, rows, cols, pitchX, pitchY) {
        const usable = getRegionUsableLocalBox(region, gridAngle);
        const polygonBbox = usable.polygonBbox || usable;
        const targetW = Math.max(1, pitchX * Math.max(1, cols));
        const targetH = Math.max(1, pitchY * Math.max(1, rows));

        // rows/cols는 이미 usable/pitch 기준 floor로 계산되므로 보통 targetW/H는 usable보다 작다.
        // 혹시 기준 구역처럼 직접 N×M이 입력된 경우에도 pitch 자체를 줄이지 않고 중앙 배치한다.
        const w = Math.min(targetW, polygonBbox.w);
        const h = Math.min(targetH, polygonBbox.h);

        const x = clamp(usable.x + (usable.w - w) / 2, polygonBbox.x, polygonBbox.x + polygonBbox.w - w);
        const y = clamp(usable.y + (usable.h - h) / 2, polygonBbox.y, polygonBbox.y + polygonBbox.h - h);

        return {
            x,
            y,
            w: Math.max(1, w),
            h: Math.max(1, h)
        };
    }

    function getAllowedLocalBbox(region, center, gridAngle, fallbackBbox) {
        ensureRoleMap();

        const localXs = [];
        const localYs = [];
        const step = Math.max(2, Math.round(Math.min(fallbackBbox.w, fallbackBbox.h) / 48));
        const minX = Math.floor(fallbackBbox.x);
        const maxX = Math.ceil(fallbackBbox.x + fallbackBbox.w);
        const minY = Math.floor(fallbackBbox.y);
        const maxY = Math.ceil(fallbackBbox.y + fallbackBbox.h);

        for (let y = minY; y <= maxY; y += step) {
            for (let x = minX; x <= maxX; x += step) {
                const world = rotatePoint({ x, y }, center, gridAngle);

                if (isPointAllowedInRegionLoose(region, world)) {
                    localXs.push(x);
                    localYs.push(y);
                }
            }
        }

        if (localXs.length < 12) {
            return null;
        }

        localXs.sort((a, b) => a - b);
        localYs.sort((a, b) => a - b);

        const qx1 = quantile(localXs, 0.02);
        const qx2 = quantile(localXs, 0.98);
        const qy1 = quantile(localYs, 0.02);
        const qy2 = quantile(localYs, 0.98);

        return {
            x: qx1,
            y: qy1,
            w: Math.max(1, qx2 - qx1),
            h: Math.max(1, qy2 - qy1)
        };
    }

    function buildSeatsForRegionWithCoverage(region, layout) {
        const center = getPolygonCenter(region.polygon);
        const gridBox = layout.gridBox || getFixedPitchGridBox(region, layout.angle, layout.rows, layout.cols, layout.pitchX || layout.seatSize, layout.pitchY || layout.seatSize);
        const cellW = Math.max(1, Number(layout.pitchX || layout.cellW || (gridBox.w / Math.max(1, layout.cols))));
        const cellH = Math.max(1, Number(layout.pitchY || layout.cellH || (gridBox.h / Math.max(1, layout.rows))));
        const seats = [];

        for (let row = 1; row <= layout.rows; row += 1) {
            for (let col = 1; col <= layout.cols; col += 1) {
                const localX = gridBox.x + (col - 0.5) * cellW;
                const localY = gridBox.y + (row - 0.5) * cellH;
                const rotated = rotatePoint({ x: localX, y: localY }, center, layout.angle);
                const centerAllowed = isPointAllowedInRegionLoose(region, rotated);
                const coverage = getSeatCoverage(region, rotated, layout.seatSize, layout.angle);

                if (!centerAllowed && coverage < layout.coverageThreshold) {
                    continue;
                }

                if (coverage < 0.22) {
                    continue;
                }

                const seat = {
                    sectionId: region.id,
                    row,
                    col,
                    status: "AVAILABLE",
                    x: round(rotated.x),
                    y: round(rotated.y),
                    size: round(layout.seatSize),
                    angle: round(layout.facingAngle ?? normalizeAngle(layout.angle + 90)),
                    gridAngle: round(layout.angle)
                };

                seat.id = makeSeatId(region, seat);
                seats.push(seat);
            }
        }

        return seats;
    }

    function getSeatCoverage(region, seatCenter, seatSize, angle) {
        const half = seatSize / 2;
        const samples = [];

        for (let sy = -2; sy <= 2; sy += 1) {
            for (let sx = -2; sx <= 2; sx += 1) {
                samples.push({
                    x: sx * half / 2,
                    y: sy * half / 2
                });
            }
        }

        let allowed = 0;

        samples.forEach((sample) => {
            const point = rotatePoint({ x: seatCenter.x + sample.x, y: seatCenter.y + sample.y }, seatCenter, angle);

            if (isPointAllowedInRegionLoose(region, point)) {
                allowed += 1;
            }
        });

        return allowed / samples.length;
    }

    function isPointAllowedInRegionLoose(region, point) {
        if (!pointInPolygon(point, region.polygon)) {
            return false;
        }

        const x = Math.round(point.x);
        const y = Math.round(point.y);

        if (x < 0 || y < 0 || x >= state.width || y >= state.height) {
            return false;
        }

        ensureRoleMap();
        const role = state.roleMap[y * state.width + x];

        if (role === region.role) {
            return true;
        }

        const offset = (y * state.width + x) * 4;
        const data = state.imageData.data;
        const target = hexToRgb(region.color || "#999999");
        const pixel = { r: data[offset], g: data[offset + 1], b: data[offset + 2] };

        return colorDistance(pixel, target) <= 90;
    }

    function isPointAllowedInRegion(region, point) {
        return isPointAllowedInRegionLoose(region, point);
    }

    function renderSolidSections() {
        if (state.seatSections.length <= 0) {
            toast("먼저 파트 3에서 좌석을 추정하세요.");
            return;
        }

        const gap = positiveNumber(dom.solidGap?.value, 0);

        state.visualGroups = buildVisualGroups();

        solidCanvas.width = state.width;
        solidCanvas.height = state.height;
        solidCtx.clearRect(0, 0, state.width, state.height);
        solidCtx.drawImage(sourceCanvas, 0, 0, state.width, state.height);

        state.visualGroups.forEach((group) => {
            drawVisualGroupOnly(group, gap);
        });

        state.generatedUrl = solidCanvas.toDataURL("image/png");
        state.previewMode = "solid";
        state.selectedVisualGroupId = null;

        saveWorkState();
        render();
        syncAllPanels();
        renderSelectedVisualGroupInfo(null);
        toast("도형만 표시되는 최종 미리보기를 생성했습니다.");
    }

    function buildVisualGroups() {
        const sections = state.seatSections.map((section) => {
            const region = state.colorRegions.find((item) => item.id === section.id);
            return {
                section,
                region: region || section,
                groupKey: getRegionGroupKey(region || section),
                bbox: getBbox((region || section).polygon || section.polygon),
                polygon: clonePoints((region || section).polygon || section.polygon),
                color: (region || section).color || section.color || "#d9d9d9",
                angle: section.gridAngle ?? section.layout?.gridAngle ?? 0
            };
        });

        const visited = new Set();
        const groups = [];

        sections.forEach((item) => {
            if (visited.has(item.section.id)) {
                return;
            }

            const queue = [item];
            const members = [];
            visited.add(item.section.id);

            while (queue.length > 0) {
                const current = queue.shift();
                members.push(current);

                sections.forEach((candidate) => {
                    if (visited.has(candidate.section.id)) {
                        return;
                    }

                    if (!canMergeVisualSection(current, candidate)) {
                        return;
                    }

                    visited.add(candidate.section.id);
                    queue.push(candidate);
                });
            }

            const sectionIds = members.map((member) => member.section.id);
            const seatIds = [];
            const polygons = [];
            const points = [];

            members.forEach((member) => {
                polygons.push(clonePoints(member.polygon));
                points.push(...member.polygon);
                (state.seatsBySection[member.section.id] || []).forEach((seat) => seatIds.push(seat.id));
            });

            const bbox = getBbox(points);
            const color = getDominantMemberColor(members);

            groups.push({
                id: `vg-${groups.length + 1}`,
                label: `도형 ${groups.length + 1}`,
                groupKey: members[0]?.groupKey || "group",
                color,
                sectionIds,
                seatIds,
                polygons,
                bbox,
                button: {
                    x: round(bbox.x + bbox.w / 2),
                    y: round(bbox.y + bbox.h / 2),
                    w: round(bbox.w),
                    h: round(bbox.h),
                    label: `도형 ${groups.length + 1}`,
                    color
                }
            });
        });

        return groups;
    }

    function canMergeVisualSection(a, b) {
        if (a.groupKey !== b.groupKey) {
            return false;
        }

        if (Math.abs(angleDiff(a.angle, b.angle)) > 22) {
            return false;
        }

        const gap = rectGap(a.bbox, b.bbox);
        const nearLimit = Math.max(14, Math.min(80, Math.max(Math.min(a.bbox.w, a.bbox.h), Math.min(b.bbox.w, b.bbox.h)) * 0.75));

        return gap <= nearLimit;
    }

    function drawVisualGroupOnly(group, gap) {
        solidCtx.save();

        group.polygons.forEach((polygon) => {
            if (!polygon || polygon.length < 3) {
                return;
            }

            solidCtx.beginPath();
            solidCtx.moveTo(polygon[0].x, polygon[0].y);

            for (let i = 1; i < polygon.length; i += 1) {
                solidCtx.lineTo(polygon[i].x, polygon[i].y);
            }

            solidCtx.closePath();
            solidCtx.fillStyle = group.color || "#d9d9d9";
            solidCtx.fill();

            if (gap > 0) {
                solidCtx.lineWidth = gap;
                solidCtx.strokeStyle = "rgba(247, 247, 247, 0.92)";
                solidCtx.stroke();
            }
        });

        solidCtx.restore();
    }

    function buildCleanPolygonFromSeats(seats, angle, seatSize, limitPolygon) {
        if (!Array.isArray(seats) || seats.length <= 0) {
            return [];
        }

        const center = getPointsCenter(seats);
        const localPoints = [];

        seats.forEach((seat) => {
            const half = (seat.size || seatSize || 8) / 2;
            [
                { x: seat.x - half, y: seat.y - half },
                { x: seat.x + half, y: seat.y - half },
                { x: seat.x + half, y: seat.y + half },
                { x: seat.x - half, y: seat.y + half }
            ].forEach((point) => {
                localPoints.push(rotatePoint(point, center, -angle));
            });
        });

        let bbox = getBbox(localPoints);
        const padding = Math.max(1, (seatSize || 8) * 0.20);

        if (Array.isArray(limitPolygon) && limitPolygon.length >= 3) {
            const limitLocalPoints = limitPolygon.map((point) => rotatePoint(point, center, -angle));
            const limitBbox = getBbox(limitLocalPoints);
            const minX = Math.max(bbox.x - padding, limitBbox.x);
            const minY = Math.max(bbox.y - padding, limitBbox.y);
            const maxX = Math.min(bbox.x + bbox.w + padding, limitBbox.x + limitBbox.w);
            const maxY = Math.min(bbox.y + bbox.h + padding, limitBbox.y + limitBbox.h);

            bbox = {
                x: minX,
                y: minY,
                w: Math.max(0, maxX - minX),
                h: Math.max(0, maxY - minY)
            };
        } else {
            bbox = {
                x: bbox.x - padding,
                y: bbox.y - padding,
                w: bbox.w + padding * 2,
                h: bbox.h + padding * 2
            };
        }

        const localPolygon = [
            { x: bbox.x, y: bbox.y },
            { x: bbox.x + bbox.w, y: bbox.y },
            { x: bbox.x + bbox.w, y: bbox.y + bbox.h },
            { x: bbox.x, y: bbox.y + bbox.h }
        ];

        return localPolygon.map((point) => {
            const rotated = rotatePoint(point, center, angle);
            return { x: round(rotated.x), y: round(rotated.y) };
        });
    }

    function showOriginalImage() {
        state.previewMode = "original";
        render();
        toast("원본 보기로 전환했습니다.");
    }

    async function saveStage1Result() {
        if (!state.generatedUrl) {
            renderSolidSections();
        }

        const image = state.generatedUrl || sourceCanvas.toDataURL("image/png");
        const tempSeats = buildTempSeatJson();
        const tempSections = buildTempSectionJson();

        localStorage.setItem(STORAGE_KEYS.cleanImage, image);
        localStorage.setItem(STORAGE_KEYS.generatedImage, image);
        localStorage.setItem(STORAGE_KEYS.colorRegions, JSON.stringify(state.colorRegions));
        localStorage.setItem(STORAGE_KEYS.angleRegions, JSON.stringify(state.angleRegions));
        localStorage.setItem(STORAGE_KEYS.selectedAngleRegions, JSON.stringify(state.selectedAngleRegionIds));
        localStorage.setItem(STORAGE_KEYS.baseLayoutsByGroup, JSON.stringify(state.baseLayoutsByGroup));
        localStorage.setItem(STORAGE_KEYS.visualGroups, JSON.stringify(state.visualGroups));

        if (state.selectedVisualGroupId) {
            localStorage.setItem(STORAGE_KEYS.selectedVisualGroupId, state.selectedVisualGroupId);
        }

        localStorage.setItem(STORAGE_KEYS.seatSections, JSON.stringify(state.seatSections));
        localStorage.setItem(STORAGE_KEYS.seats, JSON.stringify(state.seatsBySection));
        localStorage.setItem(STORAGE_KEYS.layouts, JSON.stringify(state.layoutsBySection));
        localStorage.setItem(STORAGE_KEYS.concertSections, JSON.stringify(tempSections));
        localStorage.setItem(STORAGE_KEYS.concertStage3Seats, JSON.stringify(state.seatsBySection));
        localStorage.setItem(STORAGE_KEYS.concertStage3Layouts, JSON.stringify(state.layoutsBySection));
        localStorage.setItem(STORAGE_KEYS.imageMeta, JSON.stringify({
            width: state.width,
            height: state.height,
            mode: "stage1-flexible-seat-grid-v6",
            savedAt: new Date().toISOString()
        }));

        const ok = await saveTempSeatmapToServer(tempSeats, tempSections, image);

        if (ok) {
            toast("Stage1 결과를 서버 임시 폴더에 저장했습니다.");
        } else {
            toast("브라우저 저장은 완료. 서버 저장은 실패했습니다. 콘솔/엔드포인트를 확인하세요.");
        }
    }

    function buildTempSeatJson() {
    const result = [];
    const visualGroups = state.visualGroups && state.visualGroups.length > 0
        ? state.visualGroups
        : buildVisualGroups();
    const visualGroupBySourceId = buildVisualGroupIdMap(visualGroups);

    Object.entries(state.seatsBySection || {}).forEach(([sourceSectionId, seats]) => {
        const section = state.seatSections.find((item) => item.id === sourceSectionId) || {};
        const region = state.colorRegions.find((item) => item.id === sourceSectionId) || section;
        const finalSectionId = visualGroupBySourceId.get(String(sourceSectionId)) || String(sourceSectionId);
        const floor = safeSeatPart(region.floor || section.floor || "1");
        const sectionName = safeSeatPart(region.label || region.name || section.label || section.name || sourceSectionId);
        const grade = safeSeatPart(region.grade || section.grade || "UNASSIGNED");

        (seats || []).forEach((seat) => {
            if (String(seat.status || "").toUpperCase() === "REMOVED") {
                return;
            }

            const row = safeSeatPart(seat.row || 1);
            const col = safeSeatPart(seat.col || 1);
            const status = safeSeatPart(seat.status || "AVAILABLE");
            const x = round(seat.x || 0);
            const y = round(seat.y || 0);
            const size = round(seat.size || section.seatSize || Math.min(seat.w || 0, seat.h || 0) || 10);
            const angle = round(seat.angle ?? section.angle ?? section.gridAngle ?? 0);
            const id = `${floor}-${sectionName}-${row}-${col}-${grade}-${status}-${x}-${y}-${size}-${angle}`;

            result.push({
                id,
                sectionId: finalSectionId,
                sourceSectionId: String(sourceSectionId),
                floor,
                section: sectionName,
                row,
                col,
                grade,
                status,
                x,
                y,
                size,
                angle,
                w: round(seat.w || seat.width || size),
                h: round(seat.h || seat.height || size)
            });
        });
    });

    return result;
}

    function buildTempSectionJson() {
    const sourceGroups = state.visualGroups && state.visualGroups.length > 0
        ? state.visualGroups
        : buildVisualGroups();

    return sourceGroups.map((group, index) => {
        const polygons = normalizeGroupPolygons(group);
        const points = polygons.flat();
        const bbox = group.bbox || getBbox(points);
        const label = group.label || `도형 ${index + 1}`;
        const sectionIds = (group.sectionIds || group.sourceRegionIds || []).map((id) => String(id));
        const seatCount = sectionIds.reduce((sum, sectionId) => {
            return sum + ((state.seatsBySection && state.seatsBySection[sectionId]) || []).length;
        }, 0);
        const polygon = getRepresentativeGroupPolygon({ ...group, polygons, bbox });

        return {
            id: group.id || `vg-${index + 1}`,
            name: label,
            label,
            floor: "1",
            grade: group.grade || "TEMP",
            color: group.color || "#d9d9d9",
            sectionIds,
            sourceRegionIds: sectionIds,
            seatCount,
            polygon,
            polygons,
            bbox,
            button: {
                x: round(bbox.x + bbox.w / 2),
                y: round(bbox.y + bbox.h / 2),
                w: round(bbox.w),
                h: round(bbox.h),
                xPercent: round(((bbox.x + bbox.w / 2) / Math.max(1, state.width)) * 100),
                yPercent: round(((bbox.y + bbox.h / 2) / Math.max(1, state.height)) * 100),
                wPercent: round((bbox.w / Math.max(1, state.width)) * 100),
                hPercent: round((bbox.h / Math.max(1, state.height)) * 100),
                angle: round(group.angle || 0),
                label,
                color: group.color || "#d9d9d9"
            }
        };
    });
}

    function getRepresentativeGroupPolygon(group) {
    const polygons = normalizeGroupPolygons(group);

    if (polygons.length <= 0) {
        const bbox = group.bbox || { x: 0, y: 0, w: 0, h: 0 };
        return [
            { x: round(bbox.x), y: round(bbox.y) },
            { x: round(bbox.x + bbox.w), y: round(bbox.y) },
            { x: round(bbox.x + bbox.w), y: round(bbox.y + bbox.h) },
            { x: round(bbox.x), y: round(bbox.y + bbox.h) }
        ];
    }

    // polygon은 대표 1개만 넣는다. 여러 조각은 polygons에 따로 보관한다.
    // bbox 사각형으로 만들면 예매 화면에서 괴랄한 직사각형이 나오므로 금지.
    return clonePoints(polygons.slice().sort((a, b) => polygonAreaAbs(b) - polygonAreaAbs(a))[0]);
}

function buildVisualGroupIdMap(visualGroups) {
    const map = new Map();

    (visualGroups || []).forEach((group, index) => {
        const groupId = String(group.id || `vg-${index + 1}`);
        const ids = group.sectionIds || group.sourceRegionIds || group.regionIds || [];

        ids.forEach((id) => {
            map.set(String(id), groupId);
        });

        map.set(groupId, groupId);
    });

    return map;
}

function normalizeGroupPolygons(group) {
    if (!group) {
        return [];
    }

    if (Array.isArray(group.polygons) && group.polygons.length > 0) {
        return group.polygons
            .filter((polygon) => Array.isArray(polygon) && polygon.length >= 3)
            .map((polygon) => polygon.map((point) => ({ x: round(point.x), y: round(point.y) })));
    }

    if (Array.isArray(group.polygon) && group.polygon.length >= 3) {
        return [clonePoints(group.polygon)];
    }

    return [];
}

function polygonAreaAbs(points) {
    if (!Array.isArray(points) || points.length < 3) {
        return 0;
    }

    let sum = 0;

    for (let i = 0; i < points.length; i += 1) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        sum += (a.x * b.y) - (b.x * a.y);
    }

    return Math.abs(sum / 2);
}

function buildComponentContourPolygon(component, fallbackBbox) {
    const pixels = component.pixels || [];

    if (pixels.length < 12) {
        return bboxToPolygon(fallbackBbox);
    }

    const pixelSet = new Set(pixels);
    const boundary = [];

    pixels.forEach((index) => {
        const x = index % state.width;
        const y = Math.floor(index / state.width);
        const left = x <= 0 || !pixelSet.has(index - 1);
        const right = x >= state.width - 1 || !pixelSet.has(index + 1);
        const top = y <= 0 || !pixelSet.has(index - state.width);
        const bottom = y >= state.height - 1 || !pixelSet.has(index + state.width);

        if (!(left || right || top || bottom)) {
            return;
        }

        if (left || top) boundary.push({ x, y });
        if (right || top) boundary.push({ x: x + 1, y });
        if (right || bottom) boundary.push({ x: x + 1, y: y + 1 });
        if (left || bottom) boundary.push({ x, y: y + 1 });
    });

    if (boundary.length < 3) {
        return bboxToPolygon(fallbackBbox);
    }

    const hull = buildConvexHull(boundary);
    const tolerance = Math.max(1.2, Math.min(4, Math.max(fallbackBbox.w, fallbackBbox.h) / 80));
    const simplified = simplifyClosedPolygon(hull, tolerance);
    const polygon = simplified.length >= 3 ? simplified : hull;
    const area = polygonAreaAbs(polygon);
    const bboxArea = Math.max(1, fallbackBbox.w * fallbackBbox.h);

    if (area <= 1 || area > bboxArea * 1.35) {
        return buildComponentOrientedPolygon(component, fallbackBbox);
    }

    return polygon.map((point) => ({ x: round(point.x), y: round(point.y) }));
}

function buildConvexHull(points) {
    const unique = Array.from(new Map(points.map((point) => [`${round(point.x)}:${round(point.y)}`, { x: round(point.x), y: round(point.y) }])).values())
        .sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);

    if (unique.length <= 3) {
        return unique;
    }

    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower = [];
    const upper = [];

    unique.forEach((point) => {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
            lower.pop();
        }
        lower.push(point);
    });

    for (let i = unique.length - 1; i >= 0; i -= 1) {
        const point = unique[i];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
            upper.pop();
        }
        upper.push(point);
    }

    lower.pop();
    upper.pop();

    return lower.concat(upper);
}

function simplifyClosedPolygon(points, tolerance) {
    if (!Array.isArray(points) || points.length <= 8) {
        return points || [];
    }

    const closed = points.concat([points[0]]);
    const simplified = simplifyRdp(closed, tolerance).slice(0, -1);
    return simplified.length >= 3 ? simplified : points;
}

function simplifyRdp(points, epsilon) {
    if (points.length <= 2) {
        return points;
    }

    let maxDistance = 0;
    let index = 0;
    const first = points[0];
    const last = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i += 1) {
        const distance = pointLineDistance(points[i], first, last);

        if (distance > maxDistance) {
            index = i;
            maxDistance = distance;
        }
    }

    if (maxDistance > epsilon) {
        const left = simplifyRdp(points.slice(0, index + 1), epsilon);
        const right = simplifyRdp(points.slice(index), epsilon);
        return left.slice(0, -1).concat(right);
    }

    return [first, last];
}

function pointLineDistance(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    if (dx === 0 && dy === 0) {
        return Math.hypot(point.x - start.x, point.y - start.y);
    }

    return Math.abs(dy * point.x - dx * point.y + end.x * start.y - end.y * start.x) / Math.hypot(dx, dy);
}

    async function saveTempSeatmapToServer(seats, sections, imageDataUrl) {
        try {
            const response = await fetch("/admin/seatmap/temp-save", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "same-origin",
                body: JSON.stringify({
                    page: "stage3",
                    seatJsonText: JSON.stringify(seats, null, 2),
                    sectionJsonText: JSON.stringify(sections, null, 2),
                    imageDataUrl
                })
            });

            if (!response.ok) {
                const text = await response.text();
                console.warn("[Stage1] temp save failed", response.status, text);
                return false;
            }

            const result = await response.json().catch(() => ({}));
            console.log("[Stage1] temp save result", result);
            return true;
        } catch (error) {
            console.warn("[Stage1] temp save error", error);
            return false;
        }
    }

    async function moveToStage2() {
        await saveStage1Result();
        const nextUrl = (dom.concertStage1App || document.getElementById("stage3App"))?.dataset?.nextUrl || "/admin/seatmap/stage/4";
        window.location.href = nextUrl;
    }

    function handlePointerDown(event) {
        const point = getCanvasPoint(event);

        if (!point) {
            return;
        }

        state.pointerDown = true;

        if (state.dragMode === "angleSelect") {
            state.dragStart = point;
            state.dragRect = { x: point.x, y: point.y, w: 0, h: 0 };
        }
    }

    function handlePointerMove(event) {
        if (!state.pointerDown || !state.dragStart || state.dragMode !== "angleSelect") {
            return;
        }

        const point = getCanvasPoint(event);

        if (!point) {
            return;
        }

        state.dragRect = normalizeRect({
            x: state.dragStart.x,
            y: state.dragStart.y,
            w: point.x - state.dragStart.x,
            h: point.y - state.dragStart.y
        });

        render();
    }

    function handlePointerUp() {
        if (state.dragMode === "angleSelect" && state.dragRect && state.dragRect.w > 5 && state.dragRect.h > 5) {
            state.angleSelectRect = state.dragRect;
            state.selectedAngleRegionIds = findRegionsByRect(state.angleSelectRect).map((region) => region.id);
            state.dragMode = null;
            state.dragStart = null;
            state.dragRect = null;

            if (state.selectedAngleRegionIds.length > 0) {
                state.selectedRegionId = state.selectedAngleRegionIds[0];
            }

            saveWorkState();
            syncAllPanels();
            render();
            toast(`${state.selectedAngleRegionIds.length}개 구역 선택됨. 이제 STAGE/중앙 방향을 클릭하세요.`);
        }

        state.pointerDown = false;
    }

    function handlePointerLeave() {
        state.pointerDown = false;
    }

    function handleCanvasClick(event) {
        const point = getCanvasPoint(event);

        if (!point) {
            return;
        }

        if (state.part === 4 && state.visualGroups.length > 0) {
            selectVisualGroupAtPoint(point);
            return;
        }

        if (state.part === 2 && state.dragMode === "globalAngleTarget") {
            applyGlobalAngleTargetPoint(point);
            return;
        }

        if (state.part === 2 && state.selectedAngleRegionIds.length > 0 && !state.dragMode) {
            applyAngleTargetPoint(point);
            return;
        }

        const region = findRegionAtPoint(point);

        if (region) {
            state.selectedRegionId = region.id;

            if (state.part === 3) {
                if (dom.baseSectionName) dom.baseSectionName.value = region.label || region.name || region.id;
                if (dom.baseColor) dom.baseColor.value = normalizeHex(region.color || "#f77bab");
            }

            syncAllPanels();
            render();
        }
    }

    function findRegionsByRect(rect) {
        return state.colorRegions.filter((region) => rectOverlapArea(rect, region.bbox) > 0 || polygonIntersectsRect(region.polygon, rect));
    }

    function polygonIntersectsRect(polygon, rect) {
        if (!polygon || polygon.length <= 0) {
            return false;
        }

        return polygon.some((point) => point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h)
            || pointInPolygon({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 }, polygon);
    }

    function syncAllPanels() {
        renderColorRegionList();
        renderAngleRegionList();
        renderSeatEstimateList();
        updateSelectedInfo();
    }

    function renderColorRegionList() {
        if (!dom.colorRegionList) {
            return;
        }

        if (state.colorRegions.length <= 0) {
            dom.colorRegionList.innerHTML = `<div class="stage1-empty">아직 추출된 구역 후보가 없습니다.</div>`;
            return;
        }

        dom.colorRegionList.innerHTML = state.colorRegions.map((region) => {
            const selected = region.id === state.selectedRegionId ? " is-selected" : "";
            const checked = state.angleRegions[region.id]?.checked ? "✓" : "";

            return `
                <button type="button" class="stage1-list-item${selected}" data-region-id="${escapeHtml(region.id)}">
                    <i style="background:${escapeHtml(region.color)}"></i>
                    <span>${escapeHtml(region.name)}</span>
                    <small>${escapeHtml(region.roleName || "좌석")} / ${Math.round(region.bbox.w)}×${Math.round(region.bbox.h)}</small>
                    <strong>${checked}</strong>
                </button>
            `;
        }).join("");

        bindRegionList(dom.colorRegionList);
    }

    function renderAngleRegionList() {
        if (!dom.angleRegionList) {
            return;
        }

        const items = state.colorRegions.filter((region) => state.selectedAngleRegionIds.includes(region.id) || state.angleRegions[region.id]?.checked);

        if (items.length <= 0) {
            dom.angleRegionList.innerHTML = `<div class="stage1-empty">각도가 계산된 구역이 없습니다.</div>`;
            return;
        }

        dom.angleRegionList.innerHTML = items.map((region) => {
            const selected = region.id === state.selectedRegionId ? " is-selected" : "";
            const angle = getRegionAngle(region);
            const label = state.angleRegions[region.id]?.checked ? "각도 설정 완료" : "드래그 선택됨";

            return `
                <button type="button" class="stage1-list-item${selected}" data-region-id="${escapeHtml(region.id)}">
                    <i style="background:${escapeHtml(region.color)}"></i>
                    <span>${escapeHtml(region.name)}</span>
                    <small>${label}</small>
                    <strong>${round(angle)}°</strong>
                </button>
            `;
        }).join("");

        bindRegionList(dom.angleRegionList);
    }

    function renderSeatEstimateList() {
        if (!dom.seatEstimateList) {
            return;
        }

        if (state.seatSections.length <= 0) {
            dom.seatEstimateList.innerHTML = `<div class="stage1-empty">아직 추정된 좌석이 없습니다.</div>`;
            return;
        }

        dom.seatEstimateList.innerHTML = state.seatSections.map((section) => {
            const selected = section.id === state.selectedRegionId ? " is-selected" : "";
            const seatCount = (state.seatsBySection[section.id] || []).length;

            return `
                <button type="button" class="stage1-list-item${selected}" data-region-id="${escapeHtml(section.id)}">
                    <i style="background:${escapeHtml(section.color)}"></i>
                    <span>${escapeHtml(section.name)}</span>
                    <small>${section.rows}×${section.cols} / ${seatCount}석</small>
                    <strong>${round(section.angle)}°</strong>
                </button>
            `;
        }).join("");

        bindRegionList(dom.seatEstimateList);
    }

    function bindRegionList(container) {
        container.querySelectorAll("[data-region-id]").forEach((button) => {
            button.addEventListener("click", () => {
                state.selectedRegionId = button.dataset.regionId;
                syncAllPanels();
                render();
            });
        });
    }

    function updateSelectedInfo() {
        const region = getSelectedRegion();

        if (dom.angleRegionName) {
            dom.angleRegionName.value = region ? region.name : "-";
        }

        if (dom.angleValue) {
            dom.angleValue.value = region ? `시선 ${round(getRegionFacingAngle(region))}° / 줄 ${round(getRegionGridAngle(region))}°` : "0°";
        }
    }

    function saveWorkState() {
        localStorage.setItem(STORAGE_KEYS.colorRegions, JSON.stringify(state.colorRegions));
        localStorage.setItem(STORAGE_KEYS.angleRegions, JSON.stringify(state.angleRegions));
        localStorage.setItem(STORAGE_KEYS.selectedAngleRegions, JSON.stringify(state.selectedAngleRegionIds));
        localStorage.setItem(STORAGE_KEYS.baseLayoutsByGroup, JSON.stringify(state.baseLayoutsByGroup));
        localStorage.setItem(STORAGE_KEYS.visualGroups, JSON.stringify(state.visualGroups));
        if (state.selectedVisualGroupId) {
            localStorage.setItem(STORAGE_KEYS.selectedVisualGroupId, state.selectedVisualGroupId);
        }
        localStorage.setItem(STORAGE_KEYS.seatSections, JSON.stringify(state.seatSections));
        localStorage.setItem(STORAGE_KEYS.seats, JSON.stringify(state.seatsBySection));
        localStorage.setItem(STORAGE_KEYS.layouts, JSON.stringify(state.layoutsBySection));

        if (state.generatedUrl) {
            localStorage.setItem(STORAGE_KEYS.generatedImage, state.generatedUrl);
        }
    }

    function buildRoleMap(imageData, width, height) {
        const roleMap = new Uint8Array(width * height);
        const data = imageData.data;

        for (let i = 0; i < width * height; i += 1) {
            const offset = i * 4;
            roleMap[i] = classifyColorRole(data[offset], data[offset + 1], data[offset + 2], data[offset + 3]);
        }

        return roleMap;
    }

    function classifyColorRole(r, g, b, a) {
        if (a < 10) return ROLE.BACKGROUND;

        const hsl = rgbToHsl(r, g, b);
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const chroma = max - min;

        if (hsl.l <= 0.20 && hsl.s <= 0.55) return ROLE.BLACK;
        if ((max >= 246 && min >= 222) || (hsl.l >= 0.78 && hsl.s <= 0.42)) return ROLE.WHITE;
        if (hsl.s <= 0.20 && hsl.l >= 0.18 && hsl.l <= 0.92) return ROLE.GRAY;
        if (hsl.s < 0.24 || chroma < 20 || hsl.l < 0.20 || hsl.l > 0.88) return ROLE.BACKGROUND;

        const hue = hsl.h;
        if (hue >= 340 || hue < 13) return ROLE.SEAT_RED;
        if (hue >= 13 && hue < 55) return hsl.s < 0.48 && hsl.l < 0.70 ? ROLE.SEAT_BROWN : ROLE.SEAT_ORANGE;
        if (hue >= 55 && hue < 170) return ROLE.SEAT_GREEN;
        if (hue >= 170 && hue < 215) return ROLE.SEAT_BLUE;
        if (hue >= 215 && hue < 315) return ROLE.SEAT_PURPLE;
        if (hue >= 315 && hue < 340) return ROLE.SEAT_PINK;

        return ROLE.BACKGROUND;
    }

    function cleanupRoleMap(roleMap, width, height) {
        for (let iteration = 0; iteration < 2; iteration += 1) {
            const next = new Uint8Array(roleMap);

            for (let y = 1; y < height - 1; y += 1) {
                for (let x = 1; x < width - 1; x += 1) {
                    const index = y * width + x;
                    const role = roleMap[index];
                    const counts = countNeighborSeatRoles(roleMap, width, height, x, y, 1);
                    const dominant = getDominantRole(counts);

                    if (!isSeatRole(role) && dominant.count >= 5) {
                        next[index] = dominant.role;
                    } else if (isSeatRole(role) && dominant.role !== ROLE.UNKNOWN && dominant.role !== role && dominant.count >= 6) {
                        next[index] = dominant.role;
                    }
                }
            }

            roleMap.set(next);
        }
    }

    function countNeighborSeatRoles(roleMap, width, height, x, y, radius) {
        const counts = new Map();

        for (let dy = -radius; dy <= radius; dy += 1) {
            for (let dx = -radius; dx <= radius; dx += 1) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
                const role = roleMap[ny * width + nx];
                if (!isSeatRole(role)) continue;
                counts.set(role, (counts.get(role) || 0) + 1);
            }
        }

        return counts;
    }

    function getDominantRole(counts) {
        let role = ROLE.UNKNOWN;
        let count = 0;

        counts.forEach((value, key) => {
            if (value > count) {
                role = key;
                count = value;
            }
        });

        return { role, count };
    }

    function extractComponents(roleMap, width, height, predicate) {
        const visited = new Uint8Array(width * height);
        const components = [];
        const queue = [];

        for (let i = 0; i < width * height; i += 1) {
            if (visited[i] || !predicate(roleMap[i])) continue;

            const targetRole = roleMap[i];
            const component = {
                role: targetRole,
                pixels: [],
                area: 0,
                minX: Infinity,
                minY: Infinity,
                maxX: -Infinity,
                maxY: -Infinity
            };

            queue.length = 0;
            queue.push(i);
            visited[i] = 1;

            while (queue.length > 0) {
                const current = queue.pop();
                const x = current % width;
                const y = Math.floor(current / width);

                component.pixels.push(current);
                component.area += 1;
                component.minX = Math.min(component.minX, x);
                component.minY = Math.min(component.minY, y);
                component.maxX = Math.max(component.maxX, x);
                component.maxY = Math.max(component.maxY, y);

                pushNeighbor(queue, visited, roleMap, width, height, x + 1, y, targetRole);
                pushNeighbor(queue, visited, roleMap, width, height, x - 1, y, targetRole);
                pushNeighbor(queue, visited, roleMap, width, height, x, y + 1, targetRole);
                pushNeighbor(queue, visited, roleMap, width, height, x, y - 1, targetRole);
            }

            component.width = component.maxX - component.minX + 1;
            component.height = component.maxY - component.minY + 1;
            components.push(component);
        }

        return components;
    }

    function pushNeighbor(queue, visited, roleMap, width, height, x, y, targetRole) {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        const index = y * width + x;
        if (visited[index] || roleMap[index] !== targetRole) return;
        visited[index] = 1;
        queue.push(index);
    }

    function createRegionFromComponent(component) {
    const color = averageComponentColor(component);
    const bbox = {
        x: component.minX,
        y: component.minY,
        w: component.width,
        h: component.height
    };
    const maskSpans = buildComponentSpans(component);

    return {
        id: "",
        name: "",
        label: "",
        floor: "1",
        grade: getDefaultGrade(component.role),
        color,
        role: component.role,
        roleName: ROLE_NAME[component.role] || "좌석",
        bbox,
        rawBbox: { ...bbox },
        // 실제 색상 마스크 외곽을 단순화한 polygon이다.
        // bbox 4각형으로 저장하면 예매 화면에서 사각형 덩어리가 되므로 여기서 막는다.
        polygon: buildComponentContourPolygon(component, bbox),
        maskSpans
    };
}

    function buildComponentOrientedPolygon(component, fallbackBbox) {
        const pixels = component.pixels || [];

        if (pixels.length < 12) {
            return bboxToPolygon(fallbackBbox);
        }

        const step = Math.max(1, Math.floor(pixels.length / 900));
        const points = [];
        let cx = 0;
        let cy = 0;

        for (let i = 0; i < pixels.length; i += step) {
            const index = pixels[i];
            const x = index % state.width;
            const y = Math.floor(index / state.width);
            points.push({ x, y });
            cx += x;
            cy += y;
        }

        if (points.length < 12) {
            return bboxToPolygon(fallbackBbox);
        }

        cx /= points.length;
        cy /= points.length;

        let xx = 0;
        let xy = 0;
        let yy = 0;

        points.forEach((point) => {
            const dx = point.x - cx;
            const dy = point.y - cy;
            xx += dx * dx;
            xy += dx * dy;
            yy += dy * dy;
        });

        let angle = 0.5 * radToDeg(Math.atan2(2 * xy, xx - yy));
        angle = snapSideAxisAngle(angle);

        const center = { x: cx, y: cy };
        const localPoints = points.map((point) => rotatePoint(point, center, -angle));
        const localBbox = getBbox(localPoints);
        const padding = 1.5;
        const localPolygon = [
            { x: localBbox.x - padding, y: localBbox.y - padding },
            { x: localBbox.x + localBbox.w + padding, y: localBbox.y - padding },
            { x: localBbox.x + localBbox.w + padding, y: localBbox.y + localBbox.h + padding },
            { x: localBbox.x - padding, y: localBbox.y + localBbox.h + padding }
        ];

        const polygon = localPolygon.map((point) => {
            const rotated = rotatePoint(point, center, angle);
            return { x: round(rotated.x), y: round(rotated.y) };
        });

        const orientedBbox = getBbox(polygon);
        const fallbackArea = Math.max(1, fallbackBbox.w * fallbackBbox.h);
        const orientedArea = Math.max(1, orientedBbox.w * orientedBbox.h);

        if (orientedArea > fallbackArea * 1.85) {
            return bboxToPolygon(fallbackBbox);
        }

        return polygon;
    }

    function bboxToPolygon(bbox) {
        return [
            { x: bbox.x, y: bbox.y },
            { x: bbox.x + bbox.w, y: bbox.y },
            { x: bbox.x + bbox.w, y: bbox.y + bbox.h },
            { x: bbox.x, y: bbox.y + bbox.h }
        ];
    }

    function averageComponentColor(component) {
        const data = state.imageData.data;
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        const step = Math.max(1, Math.floor(component.pixels.length / 600));

        for (let i = 0; i < component.pixels.length; i += step) {
            const offset = component.pixels[i] * 4;
            r += data[offset];
            g += data[offset + 1];
            b += data[offset + 2];
            count += 1;
        }

        if (count <= 0) return "#999999";
        return rgbToHex(r / count, g / count, b / count);
    }

    function ensureRoleMap() {
        if (!state.imageData) {
            state.imageData = sourceCtx.getImageData(0, 0, state.width, state.height);
        }

        if (!state.roleMap) {
            state.roleMap = buildRoleMap(state.imageData, state.width, state.height);
            cleanupRoleMap(state.roleMap, state.width, state.height);
        }
    }

    function ensureAngleModePanel() {
        const part2 = document.querySelector("#part2 .seatmap-step__body");

        if (!part2 || document.getElementById("angleGlobalStart")) {
            dom.angleGlobalStart = document.getElementById("angleGlobalStart");
            return;
        }

        const panel = document.createElement("div");
        panel.className = "stage1-angle-mode-box";
        panel.innerHTML = `
            <div class="stage1-angle-mode-box__title">각도 계산 방식</div>
            <button type="button" class="stage1-primary" id="angleGlobalStart">2-1 전체 각도 계산</button>
            <div class="stage1-angle-mode-box__help">STAGE/중앙 지점 하나를 클릭하면 모든 구역이 그 지점을 바라보되, 각 구역 양 사이드의 평행/직각 후보로 스냅됩니다. 대각선 구역은 45°/135° 계열도 후보로 잡습니다.</div>
            <div class="stage1-angle-mode-box__divider"></div>
            <div class="stage1-angle-mode-box__help"><b>2-2 구역별 보정</b>은 아래 버튼으로 구역을 드래그한 뒤 다시 STAGE 지점을 클릭합니다.</div>
        `;

        const card = part2.querySelector(".stage1-card");

        if (card && card.nextSibling) {
            part2.insertBefore(panel, card.nextSibling);
        } else {
            part2.prepend(panel);
        }

        dom.angleGlobalStart = document.getElementById("angleGlobalStart");
    }

    function ensurePart4InfoPanel() {
        if (document.getElementById("part4InfoPanel")) {
            dom.part4InfoPanel = document.getElementById("part4InfoPanel");
            return;
        }

        const app = document.getElementById("concertStage1App");

        if (!app) {
            return;
        }

        const panel = document.createElement("aside");
        panel.id = "part4InfoPanel";
        panel.className = "stage1-right-panel";
        panel.innerHTML = `<div class="stage1-right-panel__inner"><strong>도형 정보</strong><div class="stage1-empty">파트 4에서 도형을 생성한 뒤 클릭하세요.</div></div>`;
        app.appendChild(panel);
        dom.part4InfoPanel = panel;
    }

    function injectStage1DynamicStyle() {
        if (document.getElementById("stage1DynamicStyle")) {
            return;
        }

        const style = document.createElement("style");
        style.id = "stage1DynamicStyle";
        style.textContent = `
            .stage1-right-panel{display:none;width:280px;min-width:280px;border-left:1px solid #e2e8f0;background:rgba(255,255,255,.96);box-shadow:-12px 0 30px rgba(15,23,42,.06);overflow:auto}
            .seatmap-workspace--concert-stage1[data-part="4"] .stage1-right-panel{display:block}
            .stage1-right-panel__inner{padding:14px;display:flex;flex-direction:column;gap:10px}
            .stage1-right-panel__inner>strong{font-size:15px;font-weight:900;color:#0f172a}
            .stage1-info-mini{border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;padding:12px;color:#334155;font-size:12px;font-weight:800;line-height:1.6}
            .stage1-info-mini b{display:block;color:#0f172a;font-size:14px;margin-bottom:6px}
            .stage1-chip-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
            .stage1-chip{padding:4px 7px;border-radius:999px;background:#eef2ff;color:#4338ca;font-size:11px;font-weight:900}
            .stage1-angle-mode-box{margin:0 0 12px;padding:12px;border:1px solid #ddd6fe;border-radius:10px;background:#faf5ff;display:flex;flex-direction:column;gap:8px}
            .stage1-angle-mode-box__title{font-size:13px;font-weight:900;color:#312e81}
            .stage1-angle-mode-box__help{font-size:11px;font-weight:800;line-height:1.45;color:#64748b}
            .stage1-angle-mode-box__help b{color:#312e81}
            .stage1-angle-mode-box__divider{height:1px;background:#e9d5ff;margin:2px 0}
        `;
        document.head.appendChild(style);
    }

    function getRegionGroupKey(region) {
        if (!region) {
            return "unknown";
        }

        if (Number.isFinite(Number(region.role))) {
            return `role-${region.role}`;
        }

        return `color-${normalizeHex(region.color || "#999999")}`;
    }

    function getGroupLabel(region) {
        return region?.roleName || region?.color || getRegionGroupKey(region);
    }

    function getSeatScaleForRegion(region) {
        if (!region) {
            return 0.76;
        }

        if (region.role === ROLE.SEAT_PURPLE) {
            return 0.66;
        }

        if (region.role === ROLE.SEAT_BROWN) {
            return 0.82;
        }

        return 0.76;
    }

    function getLayoutPresetForRegion(region) {
        const groupKey = getRegionGroupKey(region);
        const exact = state.baseLayoutsByGroup[groupKey];

        if (exact) {
            return exact;
        }

        const fallback = state.baseLayoutsByGroup.__last || {
            cellW: 14,
            cellH: 14,
            seatSize: 10
        };

        const densityScale = getPresetDensityScale(region);
        const seatScale = getSeatScaleForRegion(region);

        return {
            ...fallback,
            groupKey,
            cellW: Math.max(2, fallback.cellW * densityScale),
            cellH: Math.max(2, fallback.cellH * densityScale),
            seatSize: Math.max(2, Math.floor(Math.min(fallback.cellW, fallback.cellH) * densityScale * seatScale))
        };
    }

    function getPresetDensityScale(region) {
        if (!region) {
            return 1;
        }

        if (region.role === ROLE.SEAT_PURPLE) {
            return 0.72;
        }

        if (region.role === ROLE.SEAT_BROWN) {
            return 1.12;
        }

        return 1;
    }

    function rectGap(a, b) {
        const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
        const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
        return Math.hypot(dx, dy);
    }

    function getDominantMemberColor(members) {
        const countMap = new Map();

        members.forEach((member) => {
            const color = normalizeHex(member.color || "#d9d9d9");
            countMap.set(color, (countMap.get(color) || 0) + 1);
        });

        let bestColor = members[0]?.color || "#d9d9d9";
        let bestCount = -1;

        countMap.forEach((count, color) => {
            if (count > bestCount) {
                bestColor = color;
                bestCount = count;
            }
        });

        return bestColor;
    }

    function selectVisualGroupAtPoint(point) {
        const group = findVisualGroupAtPoint(point);
        state.selectedVisualGroupId = group ? group.id : null;
        saveWorkState();
        renderSelectedVisualGroupInfo(group);
        render();
    }

    function findVisualGroupAtPoint(point) {
        for (let i = state.visualGroups.length - 1; i >= 0; i -= 1) {
            const group = state.visualGroups[i];
            const hit = (group.polygons || []).some((polygon) => pointInPolygon(point, polygon));

            if (hit) {
                return group;
            }
        }

        return null;
    }

    function getSelectedVisualGroup() {
        return state.visualGroups.find((group) => group.id === state.selectedVisualGroupId) || null;
    }

    function renderSelectedVisualGroupInfo(group) {
        if (!dom.part4InfoPanel) {
            return;
        }

        const inner = dom.part4InfoPanel.querySelector(".stage1-right-panel__inner") || dom.part4InfoPanel;

        if (!group) {
            inner.innerHTML = `<strong>도형 정보</strong><div class="stage1-empty">도형을 클릭하면 포함 좌석 정보가 표시됩니다.</div>`;
            return;
        }

        const sections = group.sectionIds || [];
        const seatIds = group.seatIds || [];
        const sectionChips = sections.slice(0, 16).map((id) => `<span class="stage1-chip">${escapeHtml(id)}</span>`).join("");
        const more = sections.length > 16 ? `<span class="stage1-chip">+${sections.length - 16}</span>` : "";

        inner.innerHTML = `
            <strong>도형 정보</strong>
            <div class="stage1-info-mini">
                <b>${escapeHtml(group.label || group.id)}</b>
                <div>포함 구역 수: ${sections.length}</div>
                <div>포함 좌석 수: ${seatIds.length}</div>
                <div>크기: ${round(group.bbox?.w || 0)} × ${round(group.bbox?.h || 0)}</div>
                <div class="stage1-chip-row">${sectionChips}${more}</div>
            </div>
        `;
    }

    function drawSelectedVisualGroupOutline() {
        const group = getSelectedVisualGroup();

        if (!group) {
            return;
        }

        overlayCtx.save();
        overlayCtx.strokeStyle = "rgba(37, 99, 235, 0.65)";
        overlayCtx.lineWidth = 2;
        overlayCtx.setLineDash([6, 6]);

        (group.polygons || []).forEach((polygon) => {
            if (!polygon || polygon.length < 3) {
                return;
            }

            overlayCtx.beginPath();
            overlayCtx.moveTo(polygon[0].x, polygon[0].y);
            for (let i = 1; i < polygon.length; i += 1) {
                overlayCtx.lineTo(polygon[i].x, polygon[i].y);
            }
            overlayCtx.closePath();
            overlayCtx.stroke();
        });

        overlayCtx.restore();
    }

    function getSelectedRegion() {
        return state.colorRegions.find((region) => region.id === state.selectedRegionId) || null;
    }

    function findRegionAtPoint(point) {
        for (let i = state.colorRegions.length - 1; i >= 0; i -= 1) {
            if (pointInPolygon(point, state.colorRegions[i].polygon)) {
                return state.colorRegions[i];
            }
        }
        return null;
    }

    function getRegionAngle(region) {
        return getRegionGridAngle(region);
    }

    function getRegionGridAngle(region) {
        if (!region) return 0;
        const item = state.angleRegions[region.id];
        if (item && Number.isFinite(Number(item.gridAngle))) return Number(item.gridAngle);
        if (item && Number.isFinite(Number(item.angle))) return Number(item.angle);
        return getLongSideAngle(region.polygon);
    }

    function getRegionFacingAngle(region) {
        if (!region) return 0;
        const item = state.angleRegions[region.id];
        if (item && Number.isFinite(Number(item.facingAngle))) return Number(item.facingAngle);
        return normalizeAngle(getRegionGridAngle(region) + 90);
    }

    function getRegionLocalSize(region, angle) {
        const center = getPolygonCenter(region.polygon);
        const localPoints = region.polygon.map((point) => rotatePoint(point, center, -angle));
        const bbox = getBbox(localPoints);
        return { w: Math.max(1, bbox.w), h: Math.max(1, bbox.h) };
    }

    function getLongSideAngle(points) {
        const bbox = getBbox(points);
        return bbox.w >= bbox.h ? 0 : 90;
    }

    function upsertSeatSection(section) {
        const index = state.seatSections.findIndex((item) => item.id === section.id);
        if (index >= 0) state.seatSections[index] = section;
        else state.seatSections.push(section);
    }

    function makeSeatId(region, seat) {
        const floor = safeSeatPart(region.floor || "1");
        const sectionName = safeSeatPart(region.label || region.name || region.id);
        const grade = safeSeatPart(seat.grade || "UNASSIGNED");
        const status = safeSeatPart(seat.status || "AVAILABLE");
        return `${floor}-${sectionName}-${seat.row}-${seat.col}-${grade}-${status}-${round(seat.x)}-${round(seat.y)}-${round(seat.size)}-${round(seat.angle)}`;
    }

    function getCanvasPoint(event) {
        const rect = overlay.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        return {
            x: clamp((event.clientX - rect.left) * overlay.width / rect.width, 0, overlay.width),
            y: clamp((event.clientY - rect.top) * overlay.height / rect.height, 0, overlay.height)
        };
    }

    function normalizeRect(rect) {
        const x = Math.min(rect.x, rect.x + rect.w);
        const y = Math.min(rect.y, rect.y + rect.h);
        const w = Math.abs(rect.w);
        const h = Math.abs(rect.h);
        return { x, y, w, h };
    }

    function rectOverlapArea(a, b) {
        const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
        const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
        return x * y;
    }

    function pointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
            const xi = polygon[i].x;
            const yi = polygon[i].y;
            const xj = polygon[j].x;
            const yj = polygon[j].y;
            const intersect = ((yi > point.y) !== (yj > point.y)) && (point.x < (xj - xi) * (point.y - yi) / ((yj - yi) || 1) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    function getPolygonCenter(points) {
        return getPointsCenter(points);
    }

    function getPointsCenter(points) {
        if (!points || points.length <= 0) return { x: 0, y: 0 };
        let x = 0;
        let y = 0;
        points.forEach((point) => {
            x += Number(point.x || 0);
            y += Number(point.y || 0);
        });
        return { x: x / points.length, y: y / points.length };
    }

    function quantile(values, ratio) {
        if (!values || values.length <= 0) {
            return 0;
        }

        const index = Math.max(0, Math.min(values.length - 1, Math.round((values.length - 1) * ratio)));
        return values[index];
    }

    function getBbox(points) {
        if (!points || points.length <= 0) return { x: 0, y: 0, w: 0, h: 0 };
        const xs = points.map((point) => Number(point.x || 0));
        const ys = points.map((point) => Number(point.y || 0));
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        return { x: round(minX), y: round(minY), w: round(maxX - minX), h: round(maxY - minY) };
    }

    function rotatePoint(point, center, degree) {
        const rad = degToRad(degree);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const dx = point.x - center.x;
        const dy = point.y - center.y;
        return {
            x: center.x + dx * cos - dy * sin,
            y: center.y + dx * sin + dy * cos
        };
    }

    function snapSeatAngle(angle, reference) {
        let value = normalizeAngleToParallel(angle, reference);
        const targets = [-180, -90, 0, 90, 180];
        let best = value;
        let bestDiff = Infinity;

        targets.forEach((target) => {
            const candidate = normalizeAngleToParallel(target, reference);
            const diff = Math.abs(angleDiff(value, candidate));

            if (diff < bestDiff) {
                best = candidate;
                bestDiff = diff;
            }
        });

        if (bestDiff <= 12) {
            return normalizeAngle(best);
        }

        return Math.round(value / 5) * 5;
    }

    function normalizeAngleToParallel(angle, reference) {
        let value = normalizeAngle(angle);
        while (angleDiff(value, reference) > 90) value = normalizeAngle(value - 180);
        while (angleDiff(value, reference) < -90) value = normalizeAngle(value + 180);
        return value;
    }

    function blendAngles(a, b, weightA, weightB) {
        const ar = degToRad(a);
        const br = degToRad(b);
        const x = Math.cos(ar) * weightA + Math.cos(br) * weightB;
        const y = Math.sin(ar) * weightA + Math.sin(br) * weightB;
        return radToDeg(Math.atan2(y, x));
    }

    function angleDiff(a, b) {
        return normalizeAngle(a - b);
    }

    function normalizeAngle(angle) {
        let value = Number(angle || 0);
        while (value > 180) value -= 360;
        while (value < -180) value += 360;
        return round(value);
    }

    function degToRad(degree) {
        return degree * Math.PI / 180;
    }

    function radToDeg(rad) {
        return rad * 180 / Math.PI;
    }

    function isSeatRole(role) {
        return role >= 20;
    }

    function getDefaultGrade(role) {
        if (role === ROLE.SEAT_BROWN) return "VIP";
        if (role === ROLE.SEAT_PURPLE) return "스탠딩";
        return "일반석";
    }

    function colorDistance(a, b) {
        return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
    }

    function rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0;
        let s = 0;
        const l = (max + min) / 2;
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h *= 60;
        }
        return { h, s, l };
    }

    function rgbToHex(r, g, b) {
        return `#${[r, g, b].map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0")).join("")}`;
    }

    function hexToRgb(hex) {
        const value = normalizeHex(hex);
        return {
            r: parseInt(value.slice(1, 3), 16),
            g: parseInt(value.slice(3, 5), 16),
            b: parseInt(value.slice(5, 7), 16)
        };
    }

    function normalizeHex(value) {
        const color = String(value || "#000000").trim();
        if (/^#[0-9a-fA-F]{6}$/.test(color)) return color.toLowerCase();
        if (/^#[0-9a-fA-F]{3}$/.test(color)) return ("#" + color.slice(1).split("").map((item) => item + item).join("")).toLowerCase();
        return "#000000";
    }

    function loadImage(url, callback) {
        const image = new Image();
        image.onload = () => callback(image);
        image.onerror = () => {
            console.error("[Stage1] 이미지 로딩 실패:", url);
            toast("이미지를 불러오지 못했습니다.");
        };
        image.src = url;
    }

    function appendNoCache(url) {
        if (!url || url.startsWith("data:image")) return url;
        return `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
    }

    function readJson(key, fallback) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : fallback;
        } catch (error) {
            return fallback;
        }
    }

    function clonePoints(points) {
        return (points || []).map((point) => ({ x: round(point.x), y: round(point.y) }));
    }

    function positiveInt(value, fallback) {
        const number = parseInt(value, 10);
        return Number.isFinite(number) && number > 0 ? number : fallback;
    }

    function positiveNumber(value, fallback) {
        const number = Number(value);
        return Number.isFinite(number) && number >= 0 ? number : fallback;
    }

    function safeValue(value, fallback) {
        const text = String(value || "").trim();
        return text || fallback;
    }

    function safeSeatPart(value) {
        return String(value ?? "").trim().replace(/\s+/g, "").replace(/-/g, "").replace(/[^\w가-힣]/g, "");
    }

    function round(value) {
        return Math.round(Number(value || 0) * 100) / 100;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function toast(message) {
        if (!dom.toast) {
            console.log(message);
            return;
        }

        dom.toast.textContent = message;
        dom.toast.classList.add("show");
        window.setTimeout(() => dom.toast.classList.remove("show"), 1800);
    }

    // ============================================================================
    // v10 patch: mask based seat placement + shape-clean render
    // - 좌석은 실제 색상 마스크 내부 기준으로만 생성한다.
    // - 깔끔화는 도형을 새로 비틀지 않고, 원본 색상 마스크를 단색으로 다시 칠한다.
    // ============================================================================

    function createRegionFromComponent(component) {
    const color = averageComponentColor(component);
    const bbox = {
        x: component.minX,
        y: component.minY,
        w: component.width,
        h: component.height
    };
    const maskSpans = buildComponentSpans(component);

    return {
        id: "",
        name: "",
        label: "",
        floor: "1",
        grade: getDefaultGrade(component.role),
        color,
        role: component.role,
        roleName: ROLE_NAME[component.role] || "좌석",
        bbox,
        rawBbox: { ...bbox },
        // 실제 색상 마스크 외곽을 단순화한 polygon이다.
        // bbox 4각형으로 저장하면 예매 화면에서 사각형 덩어리가 되므로 여기서 막는다.
        polygon: buildComponentContourPolygon(component, bbox),
        maskSpans
    };
}

    function buildComponentSpans(component) {
        const byRow = new Map();
        const pixels = component.pixels || [];

        pixels.forEach((index) => {
            const x = index % state.width;
            const y = Math.floor(index / state.width);

            if (!byRow.has(y)) {
                byRow.set(y, []);
            }

            byRow.get(y).push(x);
        });

        return Array.from(byRow.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([y, xs]) => {
                xs.sort((a, b) => a - b);

                const ranges = [];
                let start = xs[0];
                let prev = xs[0];

                for (let i = 1; i < xs.length; i += 1) {
                    const x = xs[i];

                    if (x <= prev + 1) {
                        prev = x;
                        continue;
                    }

                    ranges.push([start, prev]);
                    start = x;
                    prev = x;
                }

                ranges.push([start, prev]);

                return { y, ranges };
            });
    }

    function getRegionSpanMap(region) {
        if (!Array.isArray(region?.maskSpans) || region.maskSpans.length <= 0) {
            return null;
        }

        if (region._spanMap) {
            return region._spanMap;
        }

        const map = new Map();

        region.maskSpans.forEach((row) => {
            map.set(Number(row.y), row.ranges || []);
        });

        region._spanMap = map;
        return map;
    }

    function isPointInRegionMask(region, point, dilation = 1) {
        const spanMap = getRegionSpanMap(region);

        if (!spanMap) {
            return pointInPolygon(point, region.polygon || []);
        }

        const x = Math.round(point.x);
        const y = Math.round(point.y);
        const d = Math.max(0, Number(dilation || 0));

        for (let yy = y - d; yy <= y + d; yy += 1) {
            const ranges = spanMap.get(yy);

            if (!ranges) {
                continue;
            }

            for (const range of ranges) {
                if (x >= Number(range[0]) - d && x <= Number(range[1]) + d) {
                    return true;
                }
            }
        }

        return false;
    }

    function getAllowedLocalBbox(region, center, gridAngle, fallbackBbox) {
        const localXs = [];
        const localYs = [];
        const step = Math.max(1, Math.round(Math.min(fallbackBbox.w, fallbackBbox.h) / 64));
        const minX = Math.floor(fallbackBbox.x);
        const maxX = Math.ceil(fallbackBbox.x + fallbackBbox.w);
        const minY = Math.floor(fallbackBbox.y);
        const maxY = Math.ceil(fallbackBbox.y + fallbackBbox.h);

        for (let y = minY; y <= maxY; y += step) {
            for (let x = minX; x <= maxX; x += step) {
                const world = rotatePoint({ x, y }, center, gridAngle);

                if (isPointAllowedInRegionStrict(region, world, 1)) {
                    localXs.push(x);
                    localYs.push(y);
                }
            }
        }

        if (localXs.length < 8) {
            return null;
        }

        localXs.sort((a, b) => a - b);
        localYs.sort((a, b) => a - b);

        const qx1 = quantile(localXs, 0.01);
        const qx2 = quantile(localXs, 0.99);
        const qy1 = quantile(localYs, 0.01);
        const qy2 = quantile(localYs, 0.99);

        return {
            x: qx1,
            y: qy1,
            w: Math.max(1, qx2 - qx1),
            h: Math.max(1, qy2 - qy1)
        };
    }

    function getFixedPitchGridBox(region, gridAngle, rows, cols, pitchX, pitchY) {
        const usable = getRegionUsableLocalBox(region, gridAngle);
        const targetW = Math.max(1, pitchX * Math.max(1, cols));
        const targetH = Math.max(1, pitchY * Math.max(1, rows));

        // 핵심: polygon bbox가 아니라 실제 색상 마스크 bbox 안에서만 grid를 잡는다.
        // target이 더 크면 pitch를 줄이지 않고, 들어가는 영역만 중앙 정렬한다.
        const w = Math.min(targetW, usable.w);
        const h = Math.min(targetH, usable.h);

        return {
            x: usable.x + (usable.w - w) / 2,
            y: usable.y + (usable.h - h) / 2,
            w: Math.max(1, w),
            h: Math.max(1, h)
        };
    }

    function buildSeatsForRegionWithCoverage(region, layout) {
        const center = getPolygonCenter(region.polygon);
        const gridBox = layout.gridBox || getFixedPitchGridBox(
            region,
            layout.angle,
            layout.rows,
            layout.cols,
            layout.pitchX || layout.seatSize,
            layout.pitchY || layout.seatSize
        );
        const cellW = Math.max(1, Number(layout.pitchX || layout.cellW || (gridBox.w / Math.max(1, layout.cols))));
        const cellH = Math.max(1, Number(layout.pitchY || layout.cellH || (gridBox.h / Math.max(1, layout.rows))));
        const seats = [];

        for (let row = 1; row <= layout.rows; row += 1) {
            for (let col = 1; col <= layout.cols; col += 1) {
                const localX = gridBox.x + (col - 0.5) * cellW;
                const localY = gridBox.y + (row - 0.5) * cellH;
                const rotated = rotatePoint({ x: localX, y: localY }, center, layout.angle);
                const centerAllowed = isPointAllowedInRegionStrict(region, rotated, 1);
                const coverage = getSeatCoverage(region, rotated, layout.seatSize, layout.angle);

                // 중심점이 색상 마스크 내부에 있어야 하고, 좌석 사각형도 절반 이상 포함되어야 한다.
                if (!centerAllowed || coverage < 0.50) {
                    continue;
                }

                const seat = {
                    sectionId: region.id,
                    row,
                    col,
                    status: "AVAILABLE",
                    x: round(rotated.x),
                    y: round(rotated.y),
                    size: round(layout.seatSize),
                    angle: round(layout.facingAngle ?? normalizeAngle(layout.angle + 90)),
                    gridAngle: round(layout.angle)
                };

                seat.id = makeSeatId(region, seat);
                seats.push(seat);
            }
        }

        return seats;
    }

    function getSeatCoverage(region, seatCenter, seatSize, angle) {
        const half = seatSize / 2;
        const samples = [];

        for (let sy = -2; sy <= 2; sy += 1) {
            for (let sx = -2; sx <= 2; sx += 1) {
                samples.push({
                    x: sx * half / 2,
                    y: sy * half / 2
                });
            }
        }

        let allowed = 0;

        samples.forEach((sample) => {
            const point = rotatePoint(
                { x: seatCenter.x + sample.x, y: seatCenter.y + sample.y },
                seatCenter,
                angle
            );

            if (isPointAllowedInRegionStrict(region, point, 1)) {
                allowed += 1;
            }
        });

        return allowed / samples.length;
    }

    function isPointAllowedInRegionStrict(region, point, dilation = 1) {
        if (!point || point.x < 0 || point.y < 0 || point.x >= state.width || point.y >= state.height) {
            return false;
        }

        // 추출된 실제 색상 마스크가 있으면 그것을 최우선으로 사용한다.
        // 이게 좌석이 통로/회색/다른 구역으로 튀는 룰 브레이크를 막는다.
        if (Array.isArray(region?.maskSpans) && region.maskSpans.length > 0) {
            return isPointInRegionMask(region, point, dilation);
        }

        if (!pointInPolygon(point, region.polygon || [])) {
            return false;
        }

        ensureRoleMap();
        const x = Math.round(point.x);
        const y = Math.round(point.y);
        const role = state.roleMap[y * state.width + x];

        if (role === region.role) {
            return true;
        }

        const offset = (y * state.width + x) * 4;
        const data = state.imageData.data;
        const target = hexToRgb(region.color || "#999999");
        const pixel = { r: data[offset], g: data[offset + 1], b: data[offset + 2] };

        return colorDistance(pixel, target) <= 42;
    }

    function isPointAllowedInRegionLoose(region, point) {
        return isPointAllowedInRegionStrict(region, point, 1);
    }

    function isPointAllowedInRegion(region, point) {
        return isPointAllowedInRegionStrict(region, point, 0);
    }

    function renderSolidSections() {
        if (state.seatSections.length <= 0) {
            toast("먼저 파트 3에서 좌석을 추정하세요.");
            return;
        }

        state.visualGroups = buildVisualGroups();

        solidCanvas.width = state.width;
        solidCanvas.height = state.height;
        solidCtx.clearRect(0, 0, state.width, state.height);

        // 원본 배치/통로/STAGE/외곽은 유지한다.
        solidCtx.drawImage(sourceCanvas, 0, 0, state.width, state.height);

        // 좌석 구역은 새 polygon으로 비틀지 않고, 추출 당시 실제 색상 마스크를 단색으로 다시 칠한다.
        state.seatSections.forEach((section) => {
            const region = state.colorRegions.find((item) => item.id === section.id) || section;
            drawRegionMaskSolid(region, section.color || region.color || "#d9d9d9");
        });

        state.generatedUrl = solidCanvas.toDataURL("image/png");
        state.previewMode = "solid";
        state.selectedVisualGroupId = null;

        saveWorkState();
        render();
        syncAllPanels();
        renderSelectedVisualGroupInfo(null);
        toast("원본 배치를 유지한 깔끔화 이미지를 생성했습니다.");
    }

    function drawRegionMaskSolid(region, color) {
    solidCtx.save();
    solidCtx.fillStyle = color || region.color || "#d9d9d9";

    const polygons = normalizeGroupPolygons(region).length > 0
        ? normalizeGroupPolygons(region)
        : [region.polygon || []];

    let drawn = false;

    polygons.forEach((polygon) => {
        if (!polygon || polygon.length < 3) {
            return;
        }

        solidCtx.beginPath();
        solidCtx.moveTo(polygon[0].x, polygon[0].y);

        for (let i = 1; i < polygon.length; i += 1) {
            solidCtx.lineTo(polygon[i].x, polygon[i].y);
        }

        solidCtx.closePath();
        solidCtx.fill();
        drawn = true;
    });

    // polygon 생성 실패 시에만 원본 maskSpans를 fallback으로 사용한다.
    if (!drawn && Array.isArray(region?.maskSpans) && region.maskSpans.length > 0) {
        region.maskSpans.forEach((row) => {
            const y = Number(row.y);
            (row.ranges || []).forEach((range) => {
                const x1 = Number(range[0]);
                const x2 = Number(range[1]);
                solidCtx.fillRect(x1, y, Math.max(1, x2 - x1 + 1), 1);
            });
        });
    }

    solidCtx.restore();
}

    // =====================================================================
    // v11 override: 같은 구역 내부 좌석 간격 0px / 개인 점유칸 기준 배치
    // - 기준 구역에서 seatW/seatH를 계산하고 같은 색상/역할 그룹에 고정
    // - 다른 구역은 좌석 크기/간격을 줄이지 않고 들어갈 수 있는 rows/cols만 계산
    // - 좌석 중심 + 회전 좌석 사각형 50% 이상이 실제 색상 마스크 안에 있을 때만 생성
    // =====================================================================

    function applyBaseRegion() {
        const region = getSelectedRegion();

        if (!region) {
            toast("기준 구역을 선택하세요.");
            return;
        }

        const rows = positiveInt(dom.baseRows?.value, 5);
        const cols = positiveInt(dom.baseCols?.value, 10);
        const floor = safeValue(dom.baseFloor?.value, "1");
        const name = safeValue(dom.baseSectionName?.value, region.name);
        const color = safeValue(dom.baseColor?.value, region.color || "#f77bab");
        const gridAngle = getRegionGridAngle(region);
        const facingAngle = getRegionFacingAngle(region);
        const usable = getRegionUsableLocalBox(region, gridAngle);
        const groupKey = getRegionGroupKey(region);

        // 좌석은 의자 간격이 아니라 개인 점유칸이다.
        // 따라서 기준 구역 N×M 입력값으로 구역 내부를 정확히 나누고, 내부 gap은 항상 0이다.
        const seatW = Math.max(1, usable.w / cols);
        const seatH = Math.max(1, usable.h / rows);
        const seatSize = Math.max(1, Math.min(seatW, seatH));

        state.baseRegionId = region.id;
        region.floor = floor;
        region.name = name;
        region.label = name;
        region.color = color;

        const baseLayout = {
            groupKey,
            rows,
            cols,
            layoutType: "linear",
            seatW,
            seatH,
            seatSize,
            pitchX: seatW,
            pitchY: seatH,
            cellW: seatW,
            cellH: seatH,
            gapX: 0,
            gapY: 0,
            internalGapX: 0,
            internalGapY: 0,
            gridAngle,
            facingAngle,
            angle: gridAngle,
            savedAt: new Date().toISOString()
        };

        state.baseLayoutsByGroup[groupKey] = baseLayout;
        state.baseLayoutsByGroup.__last = baseLayout;

        const section = createSeatSection(region, rows, cols, seatSize, gridAngle, facingAngle, baseLayout);
        const seats = buildSeatsForRegionWithCoverage(region, section.layout);

        upsertSeatSection(section);
        state.seatsBySection[section.id] = seats;
        state.layoutsBySection[section.id] = section.layout;

        saveWorkState();
        syncAllPanels();
        render();
        toast(`${region.name} 기준을 ${getGroupLabel(region)} 그룹에 저장했습니다. 좌석 내부 간격 0px`);
    }

    function estimateAllSeats() {
        const baseRegion = getSelectedRegion() || state.colorRegions.find((region) => region.id === state.baseRegionId);

        if (!baseRegion) {
            toast("좌석 기준을 잡을 구역을 먼저 클릭하세요.");
            return;
        }

        const groupKey = getRegionGroupKey(baseRegion);

        if (!state.baseLayoutsByGroup[groupKey]) {
            applyBaseRegion();
        }

        const baseLayout = state.baseLayoutsByGroup[groupKey];

        if (!baseLayout) {
            toast("선택 구역 기준 설정에 실패했습니다.");
            return;
        }

        ensureRoleMap();

        const floor = safeValue(dom.baseFloor?.value, "1");
        const targetRegions = state.colorRegions.filter((region) => getRegionGroupKey(region) === groupKey);
        const targetIdSet = new Set(targetRegions.map((region) => region.id));

        // 같은 색상/역할 그룹만 다시 추정한다. 다른 그룹은 유지한다.
        state.seatSections = state.seatSections.filter((section) => !targetIdSet.has(section.id));

        targetRegions.forEach((region) => {
            delete state.seatsBySection[region.id];
            delete state.layoutsBySection[region.id];
        });

        let estimatedCount = 0;
        const baseSeatW = Math.max(1, Number(baseLayout.seatW || baseLayout.pitchX || baseLayout.seatSize || 8));
        const baseSeatH = Math.max(1, Number(baseLayout.seatH || baseLayout.pitchY || baseLayout.seatSize || 8));
        const baseSeatSize = Math.max(1, Number(baseLayout.seatSize || Math.min(baseSeatW, baseSeatH)));

        targetRegions.forEach((region, index) => {
            const gridAngle = getRegionGridAngle(region);
            const facingAngle = getRegionFacingAngle(region);
            const usable = getRegionUsableLocalBox(region, gridAngle);

            // 좌석 크기/간격은 절대 줄이지 않는다.
            // 공간이 부족하면 좌석 개수만 줄어든다.
            const rows = Math.max(1, Math.floor(usable.h / baseSeatH));
            const cols = Math.max(1, Math.floor(usable.w / baseSeatW));

            if (!region.name || /^구역\s*\d+$/.test(region.name)) {
                region.name = region.id === baseRegion.id
                    ? safeValue(dom.baseSectionName?.value, "A1")
                    : `구역${index + 1}`;
                region.label = region.name;
            }

            region.floor = region.floor || floor;

            const fixedLayout = {
                ...baseLayout,
                rows,
                cols,
                layoutType: "linear",
                seatW: baseSeatW,
                seatH: baseSeatH,
                seatSize: baseSeatSize,
                pitchX: baseSeatW,
                pitchY: baseSeatH,
                cellW: baseSeatW,
                cellH: baseSeatH,
                gapX: 0,
                gapY: 0,
                internalGapX: 0,
                internalGapY: 0,
                gridAngle,
                facingAngle,
                angle: gridAngle,
                coverageThreshold: 0.50,
                centerRequired: true
            };

            const section = createSeatSection(region, rows, cols, baseSeatSize, gridAngle, facingAngle, fixedLayout);
            const seats = buildSeatsForRegionWithCoverage(region, section.layout);

            upsertSeatSection(section);
            state.seatsBySection[section.id] = seats;
            state.layoutsBySection[section.id] = section.layout;
            estimatedCount += seats.length;
        });

        state.baseRegionId = baseRegion.id;
        state.visualGroups = [];
        state.selectedVisualGroupId = null;

        saveWorkState();
        syncAllPanels();
        render();
        toast(`${getGroupLabel(baseRegion)} 그룹 ${targetRegions.length}개 구역 / ${estimatedCount}석을 추정했습니다. 내부 간격 0px`);
    }

    function createSeatSection(region, rows, cols, seatSize, gridAngle, facingAngle, presetLayout = null) {
        const fixedSeatW = Math.max(1, Number(presetLayout?.seatW || presetLayout?.pitchX || seatSize || 8));
        const fixedSeatH = Math.max(1, Number(presetLayout?.seatH || presetLayout?.pitchY || seatSize || 8));
        const fixedSeatSize = Math.max(1, Number(presetLayout?.seatSize || Math.min(fixedSeatW, fixedSeatH)));
        const gridBox = getFixedPitchGridBox(region, gridAngle, rows, cols, fixedSeatW, fixedSeatH);

        const layout = {
            rows,
            cols,
            layoutType: presetLayout?.layoutType || "linear",
            seatW: fixedSeatW,
            seatH: fixedSeatH,
            seatSize: fixedSeatSize,
            gapX: 0,
            gapY: 0,
            internalGapX: 0,
            internalGapY: 0,
            cellW: fixedSeatW,
            cellH: fixedSeatH,
            pitchX: fixedSeatW,
            pitchY: fixedSeatH,
            gridBox,
            gridAngle,
            facingAngle,
            angle: gridAngle,
            coverageThreshold: 0.50,
            centerRequired: true
        };

        return {
            id: region.id,
            name: region.name || region.label || region.id,
            label: region.label || region.name || region.id,
            floor: region.floor || "1",
            color: region.color || "#d9d9d9",
            role: region.role,
            groupKey: getRegionGroupKey(region),
            polygon: clonePoints(region.polygon),
            bbox: { ...region.bbox },
            angle: facingAngle,
            gridAngle,
            facingAngle,
            rows,
            cols,
            seatRows: rows,
            seatCols: cols,
            seatSize: fixedSeatSize,
            seatW: fixedSeatW,
            seatH: fixedSeatH,
            layout
        };
    }

    function getFixedPitchGridBox(region, gridAngle, rows, cols, pitchX, pitchY) {
        const usable = getRegionUsableLocalBox(region, gridAngle);
        const targetW = Math.max(1, pitchX * Math.max(1, cols));
        const targetH = Math.max(1, pitchY * Math.max(1, rows));
        const w = Math.min(targetW, usable.w);
        const h = Math.min(targetH, usable.h);

        // 구역 내부 실제 색상 마스크 bbox 안에서만 중앙 정렬한다.
        // 좌석 사이 간격을 만들기 위해 w/h를 늘리거나 pitch를 재분배하지 않는다.
        return {
            x: usable.x + (usable.w - w) / 2,
            y: usable.y + (usable.h - h) / 2,
            w: Math.max(1, w),
            h: Math.max(1, h)
        };
    }

    function buildSeatsForRegionWithCoverage(region, layout) {
        const center = getPolygonCenter(region.polygon);
        const gridBox = layout.gridBox || getFixedPitchGridBox(
            region,
            layout.angle,
            layout.rows,
            layout.cols,
            layout.pitchX || layout.seatW || layout.seatSize,
            layout.pitchY || layout.seatH || layout.seatSize
        );
        const seatW = Math.max(1, Number(layout.seatW || layout.pitchX || layout.seatSize || 8));
        const seatH = Math.max(1, Number(layout.seatH || layout.pitchY || layout.seatSize || 8));
        const seats = [];

        for (let row = 1; row <= layout.rows; row += 1) {
            for (let col = 1; col <= layout.cols; col += 1) {
                const localX = gridBox.x + (col - 0.5) * seatW;
                const localY = gridBox.y + (row - 0.5) * seatH;
                const rotated = rotatePoint({ x: localX, y: localY }, center, layout.angle);
                const centerAllowed = isPointAllowedInRegionStrict(region, rotated, 1);
                const coverage = getSeatCoverageRect(region, rotated, seatW, seatH, layout.angle);

                if (!centerAllowed || coverage < 0.50) {
                    continue;
                }

                const seat = {
                    sectionId: region.id,
                    row,
                    col,
                    status: "AVAILABLE",
                    x: round(rotated.x),
                    y: round(rotated.y),
                    size: round(Math.min(seatW, seatH)),
                    w: round(seatW),
                    h: round(seatH),
                    angle: round(layout.facingAngle ?? normalizeAngle(layout.angle + 90)),
                    gridAngle: round(layout.angle)
                };

                seat.id = makeSeatId(region, seat);
                seats.push(seat);
            }
        }

        return seats;
    }

    function getSeatCoverageRect(region, seatCenter, seatW, seatH, angle) {
        const samples = [];

        for (let sy = -2; sy <= 2; sy += 1) {
            for (let sx = -2; sx <= 2; sx += 1) {
                samples.push({
                    x: sx * seatW / 4,
                    y: sy * seatH / 4
                });
            }
        }

        let allowed = 0;

        samples.forEach((sample) => {
            const point = rotatePoint(
                { x: seatCenter.x + sample.x, y: seatCenter.y + sample.y },
                seatCenter,
                angle
            );

            if (isPointAllowedInRegionStrict(region, point, 1)) {
                allowed += 1;
            }
        });

        return allowed / samples.length;
    }


})();
