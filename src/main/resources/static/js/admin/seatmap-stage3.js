(() => {
    "use strict";

    const SAVE_URL = "/admin/seatmap/temp-save";
    const STORAGE = {
        sections: "seatmap_stage3_sections",
        sectionsCompat: "concert_sections",
        sectionsHeader: "concert_stage1_sections",
        visualGroupsHeader: "concert_stage1_visualGroups",
        stageData: "seatmap_stage3_data",
        legacyStageData: "concert_stage2Data",
        buttonImage: "concert_buttonImage",
        projectId: "seatmap_current_project_id",
        folderName: "seatmap_current_folder_name"
    };

    const PALETTE = [
        "#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4",
        "#f97316", "#84cc16", "#ec4899", "#64748b", "#14b8a6", "#a855f7"
    ];
    const GROUP_KEYS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

    const state = {
        projectId: "seat",
        stage2Url: "/admin/seatmap/stage/2",
        stage4Url: "/admin/seatmap/stage/4",
        buttonImageUrl: "",
        referenceImageUrl: "",
        width: 0,
        height: 0,
        sections: [],
        selectedIds: [],
        nextId: 1,
        activePart: 1,
        tool: "select",
        dragging: false,
        dragStart: null,
        dragRect: null,
        baseImageLoaded: false,
        backgroundColor: { r: 255, g: 255, b: 255, a: 255 },
        zoom: 1
    };

    const dom = {};
    let canvas;
    let overlay;
    let ctx;
    let overlayCtx;
    let previewCanvas;
    let previewCtx;

    const debugCanvas = document.createElement("canvas");
    const debugCtx = debugCanvas.getContext("2d", { willReadFrequently: true });

    document.addEventListener("DOMContentLoaded", init);

    async function init() {
        cacheDom();
        if (!canvas || !overlay) {
            console.error("[SeatTrace Stage3] canvas 연결 실패");
            return;
        }

        readRouteState();
        bindEvents();
        await loadBaseImage();
        await loadSavedSections();
        setPart(1);
        syncAll();
        toast("Stage 3 구역 나누기 준비 완료");
    }

    function cacheDom() {
        canvas = document.getElementById("canvas");
        overlay = document.getElementById("overlay");
        previewCanvas = document.getElementById("previewCanvas");

        if (canvas) ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (overlay) overlayCtx = overlay.getContext("2d", { willReadFrequently: true });
        if (previewCanvas) previewCtx = previewCanvas.getContext("2d", { willReadFrequently: true });

        [
            "stage3App", "canvasBox", "canvasScroll", "toast", "canvasTitle", "canvasSize", "canvasGuide",
            "part1Panel", "part2Panel", "part3Panel", "partBtn1", "partBtn2", "partBtn3",
            "minArea", "bgTolerance", "simplifyTolerance", "snapSize", "autoExtractBtn", "clearSectionsBtn", "goPart2Btn",
            "manualAddBtn", "cancelToolBtn", "mergeSectionsBtn", "deleteSectionsBtn", "selectionSummary", "goPart3Btn",
            "sectionNameInput", "groupKeyInput", "groupIndexInput", "floorInput", "gradeInput", "priceInput", "sectionColorInput", "labelInput",
            "groupTolerance", "autoGroupBtn", "renumberGroupsBtn", "groupBatchSelect", "groupRenameInput",
            "groupColorInput", "groupFloorInput", "groupGradeInput", "groupPriceInput", "applyGroupBatchBtn", "selectGroupBtn",
            "nameBatchInput", "applyNameBatchBtn", "sampleNameTemplateBtn",
            "applyInfoBtn", "autoNameBtn", "saveSectionsBtn", "toStage4Btn",
            "miniImg", "totalCount", "selectedCount", "selectedArea", "selectedName", "sectionList", "sortSectionsBtn"
        ].forEach((id) => {
            dom[id] = document.getElementById(id);
        });
    }

    function readRouteState() {
        const root = dom.stage3App;
        const params = new URLSearchParams(location.search);
        state.projectId = sanitizeProjectId(
            params.get("projectId")
            || root?.dataset.projectId
            || localStorage.getItem(STORAGE.folderName)
            || localStorage.getItem(STORAGE.projectId)
            || "seat"
        );
        state.stage2Url = root?.dataset.stage2Url || `/admin/seatmap/stage/2?projectId=${encodeURIComponent(state.projectId)}`;
        state.stage4Url = root?.dataset.stage4Url || `/admin/seatmap/stage/4?projectId=${encodeURIComponent(state.projectId)}`;
        state.buttonImageUrl = root?.dataset.buttonImageUrl || projectFileUrl("button-image.png");
        state.referenceImageUrl = projectFileUrl("cropped-image.png");

        localStorage.setItem(STORAGE.projectId, state.projectId);
        localStorage.setItem(STORAGE.folderName, state.projectId);
    }

    function bindEvents() {
        bind(dom.partBtn1, "click", () => setPart(1));
        bind(dom.partBtn2, "click", () => setPart(2));
        bind(dom.partBtn3, "click", () => setPart(3));

        bind(dom.autoExtractBtn, "click", autoExtractSections);
        bind(dom.clearSectionsBtn, "click", clearSections);
        bind(dom.goPart2Btn, "click", () => {
            if (!state.sections.length) {
                toast("먼저 구역을 추출하세요.");
                return;
            }
            setPart(2);
        });

        bind(dom.manualAddBtn, "click", toggleManualAdd);
        bind(dom.cancelToolBtn, "click", clearSelectionAndTool);
        bind(dom.mergeSectionsBtn, "click", mergeSelectedSections);
        bind(dom.deleteSectionsBtn, "click", deleteSelectedSections);
        bind(dom.goPart3Btn, "click", () => setPart(3));

        bind(dom.applyInfoBtn, "click", applyInfoToSelected);
        bind(dom.autoNameBtn, "click", () => renumberGroups(true));
        bind(dom.applyNameBatchBtn, "click", applyNameBatchToSections);
        bind(dom.sampleNameTemplateBtn, "click", fillSampleNameTemplate);
        bind(dom.saveSectionsBtn, "click", saveSectionsToServer);
        bind(dom.toStage4Btn, "click", moveToStage4);
        bind(dom.sortSectionsBtn, "click", sortSections);
        bind(dom.autoGroupBtn, "click", () => autoGroupSectionsByColor(true));
        bind(dom.renumberGroupsBtn, "click", () => renumberGroups(true));
        bind(dom.applyGroupBatchBtn, "click", applyGroupBatchToSections);
        bind(dom.selectGroupBtn, "click", selectCurrentGroup);
        bind(dom.groupBatchSelect, "change", fillGroupBatchForm);

        ["groupKeyInput", "groupIndexInput"].forEach((id) => {
            bind(dom[id], "input", syncNamePreviewFromGroupInput);
        });

        ["groupKeyInput", "groupIndexInput", "floorInput", "gradeInput", "priceInput", "sectionColorInput", "labelInput"].forEach((id) => {
            bind(dom[id], "keydown", (event) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    applyInfoToSelected();
                }
            });
        });

        if (overlay) {
            overlay.addEventListener("pointerdown", handlePointerDown);
            overlay.addEventListener("pointermove", handlePointerMove);
            overlay.addEventListener("pointerup", handlePointerUp);
            overlay.addEventListener("pointerleave", handlePointerLeave);
            overlay.addEventListener("click", handleCanvasClick);
            overlay.addEventListener("dblclick", handleCanvasDoubleClick);
        }

        bindToolbar();

        window.SeatMapStage3 = {
            save: saveSectionsToServer,
            getSections: () => normalizeSectionsForSave(),
            exportDebugImage: () => exportDebugImageDataUrl()
        };
    }

    function bind(element, eventName, handler) {
        if (element) element.addEventListener(eventName, handler);
    }

    function bindToolbar() {
        bind(document.getElementById("zoomIn"), "click", () => setZoom(state.zoom + 0.1));
        bind(document.getElementById("zoomOut"), "click", () => setZoom(state.zoom - 0.1));
        bind(document.getElementById("zoomReset"), "click", () => setZoom(1));
        bind(document.getElementById("zoomFit"), "click", fitZoom);
        bind(document.getElementById("resetView"), "click", () => {
            setZoom(1);
            if (dom.canvasScroll) {
                dom.canvasScroll.scrollLeft = 0;
                dom.canvasScroll.scrollTop = 0;
            }
        });
    }

    async function loadBaseImage() {
        const candidates = unique([
            localStorage.getItem(STORAGE.buttonImage),
            state.buttonImageUrl,
            projectFileUrl("button-image.png"),
            projectFileUrl("cropped-image.png")
        ]).filter(Boolean);

        let loaded = null;
        let loadedUrl = "";

        for (const url of candidates) {
            try {
                const image = await loadImage(noCache(url));
                loaded = image;
                loadedUrl = url;
                break;
            } catch (error) {
                console.warn("[SeatTrace Stage3] 이미지 로드 실패", url, error);
            }
        }

        if (!loaded) {
            toast("button-image.png를 읽지 못했습니다. Stage 2 저장을 먼저 확인하세요.");
            return;
        }

        setupCanvas(loaded.naturalWidth, loaded.naturalHeight);
        ctx.clearRect(0, 0, state.width, state.height);
        ctx.drawImage(loaded, 0, 0, state.width, state.height);
        state.baseImageLoaded = true;
        state.buttonImageUrl = loadedUrl;
        localStorage.setItem(STORAGE.buttonImage, loadedUrl);
        state.backgroundColor = detectBackgroundColor();

        if (dom.canvasSize) dom.canvasSize.textContent = `${state.width} × ${state.height}`;
        await loadMiniMap();
        fitZoom();
    }

    async function loadMiniMap() {
        const candidates = unique([
            projectFileUrl("cropped-image.png"),
            projectFileUrl("seatmap-image.png"),
            state.buttonImageUrl
        ]).filter(Boolean);

        for (const url of candidates) {
            try {
                await loadImage(noCache(url));
                if (dom.miniImg) dom.miniImg.src = noCache(url);
                return;
            } catch (error) {
                // 다음 후보 확인
            }
        }
    }

    async function loadSavedSections() {
        const stageData = readJson(STORAGE.stageData, null);
        if (stageData?.projectId === state.projectId && Array.isArray(stageData.sections) && stageData.sections.some(hasUsablePolygon)) {
            useLoadedSections(stageData.sections);
            return;
        }

        try {
            const response = await fetch(noCache(projectFileUrl("seatmap-sections.json")), { credentials: "same-origin" });
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data) && data.some(hasUsablePolygon)) {
                    useLoadedSections(data);
                    return;
                }
            }
        } catch (error) {
            console.warn("[SeatTrace Stage3] 저장된 구역 JSON 없음", error);
        }

        const local = readJson(STORAGE.sectionsCompat, null)
            || readJson(STORAGE.sectionsHeader, null);

        if (Array.isArray(local) && local.some(hasUsablePolygon)) {
            useLoadedSections(local);
        }
    }

    function useLoadedSections(source) {
        state.sections = source.map(normalizeLoadedSection).filter(hasUsablePolygon);
        ensureGroupsAfterLoad();
        updateNextId();
        state.selectedIds = state.sections[0] ? [state.sections[0].id] : [];
    }

    function setupCanvas(width, height) {
        state.width = width;
        state.height = height;
        canvas.width = width;
        canvas.height = height;
        overlay.width = width;
        overlay.height = height;
        debugCanvas.width = width;
        debugCanvas.height = height;

        if (previewCanvas) {
            const maxWidth = 300;
            const scale = width > 0 ? Math.min(1, maxWidth / width) : 1;
            previewCanvas.width = Math.max(1, Math.round(width * scale));
            previewCanvas.height = Math.max(1, Math.round(height * scale));
        }

        if (dom.canvasBox) {
            dom.canvasBox.style.width = `${width}px`;
            dom.canvasBox.style.height = `${height}px`;
        }
    }

    function autoExtractSections() {
        if (!state.baseImageLoaded) {
            toast("button-image.png를 먼저 불러와야 합니다.");
            return;
        }

        const imageData = ctx.getImageData(0, 0, state.width, state.height);
        const data = imageData.data;
        const seen = new Uint8Array(state.width * state.height);
        const minArea = positiveNumber(dom.minArea?.value, 120);
        const components = [];

        state.backgroundColor = detectBackgroundColor();

        for (let y = 0; y < state.height; y += 1) {
            for (let x = 0; x < state.width; x += 1) {
                const index = y * state.width + x;
                if (seen[index] || !isShapePixel(data, index)) continue;

                const component = floodFillComponent(data, seen, x, y);
                if (component.area >= minArea && component.bbox.w >= 3 && component.bbox.h >= 3) {
                    components.push(component);
                }
            }
        }

        components.sort((a, b) => {
            const rowGap = Math.abs(a.bbox.y - b.bbox.y);
            if (rowGap > Math.max(12, state.height * 0.02)) return a.bbox.y - b.bbox.y;
            return a.bbox.x - b.bbox.x;
        });

        state.sections = components.map((component, index) => makeSectionFromComponent(component, index));
        state.nextId = state.sections.length + 1;
        state.selectedIds = state.sections[0] ? [state.sections[0].id] : [];
        state.tool = "select";
        autoGroupSectionsByColor(false);
        saveLocalState();
        setPart(2);
        syncAll();
        toast(`구역 ${state.sections.length}개를 나누고 색상별 그룹을 붙였습니다.`);
    }

    function floodFillComponent(data, seen, startX, startY) {
        const width = state.width;
        const height = state.height;
        const queue = [startY * width + startX];
        const cells = [];
        let head = 0;
        let minX = startX;
        let maxX = startX;
        let minY = startY;
        let maxY = startY;
        const colorSum = { r: 0, g: 0, b: 0, count: 0 };

        seen[startY * width + startX] = 1;

        while (head < queue.length) {
            const current = queue[head++];
            const x = current % width;
            const y = Math.floor(current / width);
            cells.push(current);

            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;

            const color = pixelAt(data, current);
            colorSum.r += color.r;
            colorSum.g += color.g;
            colorSum.b += color.b;
            colorSum.count += 1;

            const neighbors = [current - 1, current + 1, current - width, current + width];
            for (const next of neighbors) {
                if (next < 0 || next >= width * height || seen[next]) continue;
                const nx = next % width;
                const ny = Math.floor(next / width);
                if ((next === current - 1 || next === current + 1) && ny !== y) continue;
                if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
                if (!isShapePixel(data, next)) continue;
                seen[next] = 1;
                queue.push(next);
            }
        }

        const dominant = colorSum.count > 0
            ? {
                r: colorSum.r / colorSum.count,
                g: colorSum.g / colorSum.count,
                b: colorSum.b / colorSum.count
            }
            : { r: 217, g: 217, b: 217 };

        return {
            cells,
            area: cells.length,
            bbox: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
            color: rgbToHex(dominant)
        };
    }

    function isShapePixel(data, index) {
        const color = pixelAt(data, index);
        if (color.a < 20) return false;

        const tolerance = positiveNumber(dom.bgTolerance?.value, 34);
        const bgDistance = colorDistance(color, state.backgroundColor);
        if (bgDistance <= tolerance) return false;

        const avg = (color.r + color.g + color.b) / 3;
        const max = Math.max(color.r, color.g, color.b);
        const min = Math.min(color.r, color.g, color.b);
        if (avg > 246 && max - min < 10) return false;

        return true;
    }

    function makeSectionFromComponent(component, index) {
        let polygon = polygonFromCells(component.cells, component.bbox);
        polygon = cleanupPolygon(polygon, readSimplify(), positiveNumber(dom.snapSize?.value, 0));
        if (!polygon || polygon.length < 3) polygon = rectPolygon(component.bbox);

        const id = `sec-${index + 1}`;
        const bbox = bboxOf(polygonsPoints([polygon]));
        const color = normalizeHex(component.color || PALETTE[index % PALETTE.length], PALETTE[index % PALETTE.length]);
        const groupKey = "A";
        const groupIndex = index + 1;
        const sectionName = `${groupKey}${groupIndex}`;
        const label = sectionName;

        return {
            id,
            sectionId: id,
            groupKey,
            groupName: groupKey,
            groupIndex,
            floor: "1",
            section: sectionName,
            name: sectionName,
            sectionName,
            label,
            grade: "일반석",
            price: 132000,
            color,
            renderColor: color,
            sourceColor: color,
            polygon,
            polygons: [polygon],
            bbox,
            area: Math.round(Math.abs(polygonArea(polygon))),
            sourceRegionIds: [id],
            sectionIds: [id],
            button: buildButtonInfo(bbox, label, color, 0)
        };
    }

    function polygonFromCells(cells, bbox) {
        if (!cells || !cells.length) return rectPolygon(bbox);

        const cellSet = new Set(cells);
        const edges = [];
        const width = state.width;

        cells.forEach((index) => {
            const x = index % width;
            const y = Math.floor(index / width);

            if (!cellSet.has(index - 1) || x === 0) edges.push(edge(x, y + 1, x, y));
            if (!cellSet.has(index - width) || y === 0) edges.push(edge(x, y, x + 1, y));
            if (!cellSet.has(index + 1) || x === width - 1) edges.push(edge(x + 1, y, x + 1, y + 1));
            if (!cellSet.has(index + width) || y === state.height - 1) edges.push(edge(x + 1, y + 1, x, y + 1));
        });

        const loops = traceLoops(edges);
        if (!loops.length) return convexHullFromCells(cells);

        loops.sort((a, b) => Math.abs(polygonArea(b)) - Math.abs(polygonArea(a)));
        const best = loops[0];
        return best && best.length >= 3 ? best : convexHullFromCells(cells);
    }

    function edge(x1, y1, x2, y2) {
        return { start: `${x1},${y1}`, end: `${x2},${y2}`, p1: { x: x1, y: y1 }, p2: { x: x2, y: y2 } };
    }

    function traceLoops(edges) {
        const startMap = new Map();
        edges.forEach((item, index) => {
            if (!startMap.has(item.start)) startMap.set(item.start, []);
            startMap.get(item.start).push(index);
        });

        const used = new Uint8Array(edges.length);
        const loops = [];

        for (let i = 0; i < edges.length; i += 1) {
            if (used[i]) continue;

            const loop = [];
            let currentIndex = i;
            let guard = 0;

            while (currentIndex != null && !used[currentIndex] && guard < edges.length + 8) {
                guard += 1;
                const current = edges[currentIndex];
                used[currentIndex] = 1;
                loop.push(current.p1);

                const candidates = startMap.get(current.end) || [];
                currentIndex = candidates.find((candidate) => !used[candidate]);
            }

            const cleaned = removeDuplicatePoints(loop);
            if (cleaned.length >= 3) loops.push(cleaned);
        }

        return loops;
    }

    function convexHullFromCells(cells) {
        const points = [];
        const width = state.width;
        const step = Math.max(1, Math.floor(cells.length / 2200));

        for (let i = 0; i < cells.length; i += step) {
            const index = cells[i];
            const x = index % width;
            const y = Math.floor(index / width);
            points.push({ x, y }, { x: x + 1, y }, { x: x + 1, y: y + 1 }, { x, y: y + 1 });
        }

        return convexHull(points);
    }

    function handlePointerDown(event) {
        if (!state.baseImageLoaded) return;
        const point = canvasPointFromEvent(event);

        if (state.tool === "manual") {
            state.dragging = true;
            state.dragStart = point;
            state.dragRect = { x: point.x, y: point.y, w: 0, h: 0 };
            overlay.setPointerCapture?.(event.pointerId);
            renderOverlay();
        }
    }

    function handlePointerMove(event) {
        if (!state.dragging || state.tool !== "manual") return;
        const point = canvasPointFromEvent(event);
        state.dragRect = normalizeRect({
            x: state.dragStart.x,
            y: state.dragStart.y,
            w: point.x - state.dragStart.x,
            h: point.y - state.dragStart.y
        });
        renderOverlay();
    }

    function handlePointerUp(event) {
        if (!state.dragging || state.tool !== "manual") return;
        const rect = state.dragRect;
        state.dragging = false;
        state.dragStart = null;
        state.dragRect = null;
        overlay.releasePointerCapture?.(event.pointerId);

        if (rect && Math.abs(rect.w) >= 6 && Math.abs(rect.h) >= 6) {
            addManualSection(rect);
        } else {
            renderOverlay();
        }
    }

    function handlePointerLeave() {
        if (!state.dragging) return;
        state.dragging = false;
        state.dragStart = null;
        state.dragRect = null;
        renderOverlay();
    }

    function handleCanvasClick(event) {
        if (state.tool === "manual" || state.dragging) return;
        const point = canvasPointFromEvent(event);
        const section = findSectionAt(point);

        if (!section) {
            if (!event.shiftKey && !event.ctrlKey && !event.metaKey) {
                state.selectedIds = [];
                fillForm(null);
                syncAll();
            }
            return;
        }

        if (event.shiftKey || event.ctrlKey || event.metaKey) {
            toggleSelected(section.id);
        } else {
            state.selectedIds = [section.id];
        }

        fillForm(getPrimarySelected());
        syncAll();
    }

    function handleCanvasDoubleClick(event) {
        if (!state.baseImageLoaded) return;
        const section = findSectionAt(canvasPointFromEvent(event));
        if (!section) return;

        state.selectedIds = [section.id];
        const current = sectionDisplayName(section);
        const next = window.prompt("구역명을 입력하세요. 예: A1, B12", current);
        if (next === null) {
            syncAll();
            return;
        }

        const parsed = parseSectionCode(next);
        if (!parsed) {
            toast("A1, B12처럼 그룹명+번호 형식으로 입력하세요.");
            syncAll();
            return;
        }

        section.groupKey = parsed.groupKey;
        section.groupName = parsed.groupKey;
        section.groupIndex = parsed.groupIndex;
        applyDerivedName(section);
        fillForm(section);
        saveLocalState();
        syncAll();
        toast(`${section.sectionName} 구역명으로 지정했습니다.`);
    }

    function addManualSection(rect) {
        const polygon = rectPolygon(rect);
        const id = `sec-${state.nextId++}`;
        const index = state.sections.length;
        const color = PALETTE[index % PALETTE.length];
        const groupKey = normalizeGroupKey(dom.groupKeyInput?.value, "A");
        const groupIndex = nextGroupIndex(groupKey);
        const name = `${groupKey}${groupIndex}`;
        const label = name;
        const bbox = bboxOf(polygon);

        const section = {
            id,
            sectionId: id,
            groupKey,
            groupName: groupKey,
            groupIndex,
            floor: "1",
            section: name,
            name,
            sectionName: name,
            label,
            grade: "일반석",
            price: 132000,
            color,
            renderColor: color,
            sourceColor: color,
            polygon,
            polygons: [polygon],
            bbox,
            area: Math.round(Math.abs(polygonArea(polygon))),
            manual: true,
            sourceRegionIds: [id],
            sectionIds: [id],
            button: buildButtonInfo(bbox, label, color, 0)
        };

        state.sections.push(section);
        state.selectedIds = [id];
        fillForm(section);
        state.tool = "select";
        if (dom.manualAddBtn) dom.manualAddBtn.classList.remove("is-active");
        saveLocalState();
        syncAll();
        toast("수동 구역을 추가했습니다. 구역명을 입력하세요.");
    }

    function toggleManualAdd() {
        state.tool = state.tool === "manual" ? "select" : "manual";
        if (dom.manualAddBtn) dom.manualAddBtn.classList.toggle("is-active", state.tool === "manual");
        if (dom.canvasGuide) {
            dom.canvasGuide.textContent = state.tool === "manual"
                ? "수동 추가 모드: 빈 영역을 드래그해서 새 구역만 만드세요."
                : "구역을 클릭해 선택하거나 더블클릭해 이름을 입력하세요.";
        }
        renderOverlay();
        toast(state.tool === "manual" ? "수동 추가 모드 ON" : "수동 추가 모드 OFF");
    }

    function clearSelectionAndTool() {
        state.selectedIds = [];
        state.tool = "select";
        state.dragging = false;
        state.dragStart = null;
        state.dragRect = null;
        if (dom.manualAddBtn) dom.manualAddBtn.classList.remove("is-active");
        fillForm(null);
        syncAll();
        toast("선택과 도구를 해제했습니다.");
    }

    function mergeSelectedSections() {
        const targets = getSelectedSections();
        if (targets.length < 2) {
            toast("병합할 구역을 2개 이상 선택하세요.");
            return;
        }

        const first = targets[0];
        const allPolygons = targets.flatMap((section) => getPolygons(section));
        const allPoints = polygonsPoints(allPolygons);
        const hull = cleanupPolygon(convexHull(allPoints), 2, 0);
        const bbox = bboxOf(allPoints);
        const mergedIds = targets.map((section) => section.id);
        const mergedKey = normalizeGroupKey(first.groupKey || first.groupName || first.sectionName, "A");
        const mergedIndex = Number(first.groupIndex) || nextGroupIndex(mergedKey);
        const mergedName = `${mergedKey}${mergedIndex}`;

        const merged = {
            ...first,
            id: `sec-${state.nextId++}`,
            sectionId: `sec-${state.nextId - 1}`,
            groupKey: mergedKey,
            groupName: mergedKey,
            groupIndex: mergedIndex,
            name: mergedName,
            sectionName: mergedName,
            section: mergedName,
            label: mergedName,
            polygon: hull.length >= 3 ? hull : rectPolygon(bbox),
            polygons: allPolygons.map((polygon) => polygon.map(copyPoint)),
            bbox,
            area: Math.round(allPolygons.reduce((sum, polygon) => sum + Math.abs(polygonArea(polygon)), 0)),
            merged: true,
            sourceRegionIds: unique(targets.flatMap((section) => normalizeArray(section.sourceRegionIds || section.sectionIds || section.id))).map(String),
            sectionIds: mergedIds,
            button: buildButtonInfo(bbox, mergedName, first.color || first.renderColor || PALETTE[0], 0)
        };

        state.sections = state.sections.filter((section) => !mergedIds.includes(section.id));
        state.sections.push(merged);
        sortSections(false);
        state.selectedIds = [merged.id];
        renumberGroups(false);
        fillForm(merged);
        saveLocalState();
        syncAll();
        toast(`${targets.length}개 구역을 병합했습니다.`);
    }

    function deleteSelectedSections() {
        if (!state.selectedIds.length) {
            toast("삭제할 구역을 선택하세요.");
            return;
        }

        const count = state.selectedIds.length;
        state.sections = state.sections.filter((section) => !state.selectedIds.includes(section.id));
        state.selectedIds = state.sections[0] ? [state.sections[0].id] : [];
        renumberGroups(false);
        fillForm(getPrimarySelected());
        saveLocalState();
        syncAll();
        toast(`${count}개 구역을 삭제했습니다.`);
    }

    function clearSections() {
        if (state.sections.length && !confirm("Stage 3 구역 데이터를 초기화할까요?")) return;
        state.sections = [];
        state.selectedIds = [];
        state.nextId = 1;
        state.tool = "select";
        state.dragging = false;
        state.dragRect = null;
        localStorage.removeItem(STORAGE.sections);
        localStorage.removeItem(STORAGE.sectionsCompat);
        localStorage.removeItem(STORAGE.sectionsHeader);
        localStorage.removeItem(STORAGE.stageData);
        localStorage.removeItem(STORAGE.legacyStageData);
        fillForm(null);
        syncAll();
        toast("구역 데이터를 초기화했습니다.");
    }

    function applyInfoToSelected() {
        const selected = getSelectedSections();
        if (!selected.length) {
            toast("그룹을 적용할 구역을 선택하세요.");
            return;
        }

        const groupKey = normalizeGroupKey(dom.groupKeyInput?.value, selected[0].groupKey || "A");
        const requestedIndex = Math.max(1, parseInt(dom.groupIndexInput?.value, 10) || 1);
        const floor = cleanText(dom.floorInput?.value, "1");
        const grade = cleanText(dom.gradeInput?.value, "일반석");
        const price = parseInt(dom.priceInput?.value, 10) || 0;
        const color = normalizeHex(dom.sectionColorInput?.value, selected[0].color || "#d9d9d9");

        const ordered = sortSectionsByPosition(selected);
        ordered.forEach((section, offset) => {
            section.groupKey = groupKey;
            section.groupName = groupKey;
            section.groupIndex = selected.length === 1 ? requestedIndex : requestedIndex + offset;
            section.floor = floor;
            section.grade = grade;
            section.price = price;
            section.color = color;
            section.renderColor = color;
            applyDerivedName(section, cleanText(dom.labelInput?.value, ""));
        });

        renumberGroups(false);
        fillForm(getPrimarySelected());
        saveLocalState();
        syncAll();
        toast(`${selected.length}개 구역을 ${groupKey} 그룹으로 묶었습니다.`);
    }

    function autoFillNames() {
        renumberGroups(true);
    }

    function fillSampleNameTemplate() {
        if (!dom.nameBatchInput) return;
        dom.nameBatchInput.value = [
            "A", "A", "A", "A",
            "B", "B", "B", "B",
            "C", "C", "C",
            "D", "D"
        ].join("\n");
        toast("A/B/C 그룹 예시를 넣었습니다. 정렬 순서에 맞게 수정 후 적용하세요.");
    }

    function applyNameBatchToSections() {
        if (!state.sections.length) {
            toast("구역이 없습니다.");
            return;
        }

        const names = parseBatchNames(dom.nameBatchInput?.value);
        if (!names.length) {
            toast("적용할 그룹명을 입력하세요.");
            return;
        }

        const ordered = sortSectionsByPosition(state.sections);
        const groupCounters = new Map();
        ordered.forEach((section, index) => {
            const raw = names[index];
            if (!raw) return;

            const parsed = parseSectionCode(raw);
            const groupKey = parsed ? parsed.groupKey : normalizeGroupKey(raw, section.groupKey || "A");
            const nextIndex = parsed
                ? parsed.groupIndex
                : (groupCounters.get(groupKey) || 0) + 1;

            section.groupKey = groupKey;
            section.groupName = groupKey;
            section.groupIndex = nextIndex;
            groupCounters.set(groupKey, Math.max(groupCounters.get(groupKey) || 0, nextIndex));
            applyDerivedName(section);
            section.floor = cleanText(section.floor, "1");
            section.grade = cleanText(section.grade, "일반석");
            section.price = parseInt(section.price, 10) || 132000;
            section.button = buildButtonInfo(section.bbox || bboxOf(section.polygon), section.label || section.sectionName, section.color || section.renderColor || PALETTE[index % PALETTE.length], 0);
        });

        renumberGroups(false);
        fillForm(getPrimarySelected());
        saveLocalState();
        syncAll();
        toast(`${Math.min(names.length, state.sections.length)}개 구역에 그룹을 적용했습니다.`);
    }

    function parseBatchNames(value) {
        return String(value || "")
            .split(/[\n,]+/)
            .map((item) => item.trim())
            .filter(Boolean);
    }

    function autoGroupSectionsByColor(showToast = true) {
        if (!state.sections.length) {
            if (showToast) toast("구역이 없습니다.");
            return;
        }

        const tolerance = positiveNumber(dom.groupTolerance?.value, 42);
        const ordered = sortSectionsByPosition(state.sections);
        const clusters = [];

        ordered.forEach((section) => {
            const rgb = hexToRgb(section.sourceColor || section.color || section.renderColor || "#d9d9d9");
            let best = null;
            let bestDistance = Infinity;

            clusters.forEach((cluster) => {
                const currentDistance = colorDistance(rgb, cluster.color);
                if (currentDistance < bestDistance) {
                    bestDistance = currentDistance;
                    best = cluster;
                }
            });

            if (!best || bestDistance > tolerance) {
                best = { color: { ...rgb }, items: [] };
                clusters.push(best);
            }

            best.items.push(section);
            const count = best.items.length;
            best.color.r = (best.color.r * (count - 1) + rgb.r) / count;
            best.color.g = (best.color.g * (count - 1) + rgb.g) / count;
            best.color.b = (best.color.b * (count - 1) + rgb.b) / count;
        });

        clusters.sort((a, b) => {
            const ca = averageCenter(a.items);
            const cb = averageCenter(b.items);
            const rowTolerance = Math.max(16, state.height * 0.035);
            if (Math.abs(ca.y - cb.y) > rowTolerance) return ca.y - cb.y;
            return ca.x - cb.x;
        });

        clusters.forEach((cluster, clusterIndex) => {
            const groupKey = groupKeyFromIndex(clusterIndex);
            const groupColor = rgbToHex(cluster.color);
            sortSectionsByPosition(cluster.items).forEach((section, index) => {
                section.groupKey = groupKey;
                section.groupName = groupKey;
                section.groupIndex = index + 1;
                section.color = groupColor;
                section.renderColor = groupColor;
                section.floor = cleanText(section.floor, "1");
                section.grade = cleanText(section.grade, "일반석");
                section.price = parseInt(section.price, 10) || 132000;
                applyDerivedName(section);
            });
        });

        fillForm(getPrimarySelected());
        saveLocalState();
        syncAll();
        if (showToast) toast(`${clusters.length}개 색상 그룹으로 자동 묶었습니다.`);
    }

    function applyGroupBatchToSections() {
        const selectedGroup = normalizeGroupKey(dom.groupBatchSelect?.value, "A");
        const targets = state.sections.filter((section) => normalizeGroupKey(section.groupKey || section.groupName, "A") === selectedGroup);
        if (!targets.length) {
            toast("수정할 그룹이 없습니다.");
            return;
        }

        const nextGroupKey = normalizeGroupKey(dom.groupRenameInput?.value, selectedGroup);
        const color = normalizeHex(dom.groupColorInput?.value, targets[0].color || "#d9d9d9");
        const floor = cleanText(dom.groupFloorInput?.value, targets[0].floor || "1");
        const grade = cleanText(dom.groupGradeInput?.value, targets[0].grade || "일반석");
        const price = parseInt(dom.groupPriceInput?.value, 10) || targets[0].price || 0;

        targets.forEach((section) => {
            section.groupKey = nextGroupKey;
            section.groupName = nextGroupKey;
            section.color = color;
            section.renderColor = color;
            section.floor = floor;
            section.grade = grade;
            section.price = price;
            applyDerivedName(section);
        });

        renumberGroups(false);
        state.selectedIds = targets.map((section) => section.id);
        fillForm(getPrimarySelected());
        saveLocalState();
        syncAll();
        toast(`${nextGroupKey} 그룹 ${targets.length}개 구역을 단체 수정했습니다.`);
    }

    function selectCurrentGroup() {
        const groupKey = normalizeGroupKey(dom.groupBatchSelect?.value || dom.groupKeyInput?.value, "A");
        const targets = state.sections.filter((section) => normalizeGroupKey(section.groupKey || section.groupName, "A") === groupKey);
        if (!targets.length) {
            toast("선택할 그룹이 없습니다.");
            return;
        }
        state.selectedIds = targets.map((section) => section.id);
        fillForm(targets[0]);
        syncAll();
        toast(`${groupKey} 그룹 전체를 선택했습니다.`);
    }

    async function saveSectionsToServer() {
        if (getPrimarySelected()) applyInfoToSelectedSilent();
        renumberGroups(false);

        const sections = normalizeSectionsForSave();
        if (!sections.length) {
            toast("저장할 구역이 없습니다.");
            return null;
        }

        saveLocalState();
        const imageDataUrl = exportDebugImageDataUrl();

        const payload = {
            page: "stage3",
            folderName: state.projectId,
            seatJsonText: "",
            sectionJsonText: JSON.stringify(sections, null, 2),
            bookingButtonJsonText: "",
            decorationJsonText: "",
            imageDataUrl
        };

        const button = dom.saveSectionsBtn;
        const before = button?.textContent;

        try {
            if (button) {
                button.disabled = true;
                button.textContent = "저장 중...";
            }

            const response = await fetch(SAVE_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || "구역 JSON 저장 실패");
            }

            const result = await response.json();
            toast("seatmap-sections.json 저장 완료");
            return result;
        } catch (error) {
            console.error(error);
            toast("저장 실패: " + error.message);
            alert("구역 JSON 저장 실패: " + error.message);
            return null;
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = before;
            }
        }
    }

    function applyInfoToSelectedSilent() {
        const section = getPrimarySelected();
        if (!section) return;

        const groupKey = normalizeGroupKey(dom.groupKeyInput?.value, section.groupKey || "A");
        const groupIndex = Math.max(1, parseInt(dom.groupIndexInput?.value, 10) || section.groupIndex || 1);
        section.groupKey = groupKey;
        section.groupName = groupKey;
        section.groupIndex = groupIndex;
        section.floor = cleanText(dom.floorInput?.value, section.floor || "1");
        section.grade = cleanText(dom.gradeInput?.value, section.grade || "일반석");
        section.price = parseInt(dom.priceInput?.value, 10) || section.price || 0;
        section.color = normalizeHex(dom.sectionColorInput?.value, section.color || section.renderColor || "#d9d9d9");
        section.renderColor = section.color;
        applyDerivedName(section, cleanText(dom.labelInput?.value, ""));
    }

    async function moveToStage4() {
        const result = await saveSectionsToServer();
        if (!result) return;
        window.location.href = state.stage4Url;
    }

    function saveLocalState() {
        const sections = normalizeSectionsForSave();
        const stageData = {
            stage: 3,
            projectId: state.projectId,
            width: state.width,
            height: state.height,
            updatedAt: new Date().toISOString(),
            sections
        };

        localStorage.setItem(STORAGE.sections, JSON.stringify(sections));
        localStorage.setItem(STORAGE.sectionsCompat, JSON.stringify(sections));
        localStorage.setItem(STORAGE.sectionsHeader, JSON.stringify(sections));
        localStorage.removeItem(STORAGE.visualGroupsHeader);
        localStorage.setItem(STORAGE.stageData, JSON.stringify(stageData));
        localStorage.setItem(STORAGE.legacyStageData, JSON.stringify({ sections }));
    }

    function normalizeSectionsForSave() {
        return state.sections.map((section, index) => {
            const polygons = getPolygons(section)
                .filter((polygon) => Array.isArray(polygon) && polygon.length >= 3)
                .map((polygon) => polygon.map((point) => ({ x: round(point.x), y: round(point.y) })));
            const polygon = polygons[0] || getPolygon(section).map((point) => ({ x: round(point.x), y: round(point.y) }));
            const bbox = bboxOf(polygonsPoints(polygons.length ? polygons : [polygon]));
            const groupKey = normalizeGroupKey(section.groupKey || section.groupName || section.sectionName, groupKeyFromIndex(index));
            const groupIndex = Math.max(1, parseInt(section.groupIndex, 10) || 1);
            const name = `${groupKey}${groupIndex}`;
            const color = normalizeHex(section.color || section.renderColor || PALETTE[index % PALETTE.length], PALETTE[index % PALETTE.length]);
            const label = cleanText(section.label, name);

            return {
                id: section.id || `sec-${index + 1}`,
                sectionId: section.sectionId || section.id || `sec-${index + 1}`,
                groupKey,
                groupName: groupKey,
                groupIndex,
                name,
                section: name,
                sectionName: name,
                label,
                floor: cleanText(section.floor, "1"),
                grade: cleanText(section.grade, "일반석"),
                price: parseInt(section.price, 10) || 0,
                color,
                renderColor: color,
                sourceColor: section.sourceColor || color,
                polygon,
                polygons,
                bbox,
                area: round(polygons.reduce((sum, item) => sum + Math.abs(polygonArea(item)), 0) || Math.abs(polygonArea(polygon))),
                sourceRegionIds: normalizeArray(section.sourceRegionIds || section.sectionIds || section.id).map(String),
                sectionIds: normalizeArray(section.sectionIds || section.sourceRegionIds || section.id).map(String),
                button: buildButtonInfo(bbox, label, color, 0),
                manual: Boolean(section.manual),
                merged: Boolean(section.merged)
            };
        });
    }

    function ensureGroupsAfterLoad() {
        if (!state.sections.length) return;
        const groupedCount = state.sections.filter((section) => section.__stage3Grouped).length;
        if (groupedCount >= Math.ceil(state.sections.length / 2)) {
            state.sections.forEach((section, index) => {
                const parsed = parseSectionCode(section.sectionName || section.name || section.section);
                section.groupKey = normalizeGroupKey(section.groupKey || section.groupName || parsed?.groupKey, groupKeyFromIndex(index));
                section.groupName = section.groupKey;
                section.groupIndex = Math.max(1, parseInt(section.groupIndex, 10) || parsed?.groupIndex || nextGroupIndex(section.groupKey));
                applyDerivedName(section);
            });
            renumberGroups(false);
        } else {
            autoGroupSectionsByColor(false);
        }
    }

    function applyDerivedName(section, explicitLabel = null) {
        const beforeName = section.sectionName || section.name || section.section || "";
        const beforeLabel = section.label || "";
        const groupKey = normalizeGroupKey(section.groupKey || section.groupName, "A");
        const groupIndex = Math.max(1, parseInt(section.groupIndex, 10) || 1);
        const name = `${groupKey}${groupIndex}`;
        section.groupKey = groupKey;
        section.groupName = groupKey;
        section.groupIndex = groupIndex;
        section.section = name;
        section.name = name;
        section.sectionName = name;
        if (explicitLabel !== null && cleanText(explicitLabel, "")) {
            section.label = cleanText(explicitLabel, name);
        } else if (!beforeLabel || beforeLabel === beforeName || parseSectionCode(beforeLabel)) {
            section.label = name;
        } else {
            section.label = beforeLabel;
        }
        section.button = buildButtonInfo(section.bbox || bboxOf(section.polygon), section.label || name, section.color || section.renderColor || "#d9d9d9", 0);
    }

    function sectionDisplayName(section) {
        if (!section) return "-";
        const groupKey = normalizeGroupKey(section.groupKey || section.groupName || section.sectionName, "A");
        const parsed = parseSectionCode(section.sectionName || section.name || section.section);
        const groupIndex = Math.max(1, parseInt(section.groupIndex, 10) || parsed?.groupIndex || 1);
        return `${groupKey}${groupIndex}`;
    }

    function renumberGroups(showToast = true) {
        getGroupedSections().forEach((group) => {
            sortSectionsByPosition(group.items).forEach((section, index) => {
                section.groupKey = group.key;
                section.groupName = group.key;
                section.groupIndex = index + 1;
                applyDerivedName(section);
            });
        });
        fillForm(getPrimarySelected());
        saveLocalState();
        syncAll();
        if (showToast) toast("그룹별 번호를 1부터 다시 정렬했습니다.");
    }

    function renumberGroup(groupKey, showToast = true) {
        const key = normalizeGroupKey(groupKey, "A");
        const items = sortSectionsByPosition(state.sections.filter((section) => normalizeGroupKey(section.groupKey || section.groupName, "A") === key));
        items.forEach((section, index) => {
            section.groupKey = key;
            section.groupName = key;
            section.groupIndex = index + 1;
            applyDerivedName(section);
        });
        if (showToast) toast(`${key} 그룹 번호를 정렬했습니다.`);
    }

    function nextGroupIndex(groupKey) {
        const key = normalizeGroupKey(groupKey, "A");
        return state.sections.reduce((max, section) => {
            if (normalizeGroupKey(section.groupKey || section.groupName, "A") !== key) return max;
            return Math.max(max, parseInt(section.groupIndex, 10) || 0);
        }, 0) + 1;
    }

    function getGroupedSections() {
        const map = new Map();
        state.sections.forEach((section) => {
            const key = normalizeGroupKey(section.groupKey || section.groupName || section.sectionName, "A");
            const color = normalizeHex(section.color || section.renderColor || section.sourceColor || "#d9d9d9", "#d9d9d9");
            if (!map.has(key)) map.set(key, { key, color, items: [] });
            map.get(key).items.push(section);
        });

        return Array.from(map.values())
            .map((group) => ({
                ...group,
                items: sortSectionsByPosition(group.items),
                center: averageCenter(group.items)
            }))
            .sort((a, b) => {
                const keyCompare = groupKeySortValue(a.key) - groupKeySortValue(b.key);
                if (keyCompare !== 0) return keyCompare;
                const rowTolerance = Math.max(16, state.height * 0.035);
                if (Math.abs(a.center.y - b.center.y) > rowTolerance) return a.center.y - b.center.y;
                return a.center.x - b.center.x;
            });
    }

    function renderGroupSelect() {
        if (!dom.groupBatchSelect) return;
        const current = dom.groupBatchSelect.value;
        const groups = getGroupedSections();
        if (!groups.length) {
            dom.groupBatchSelect.innerHTML = `<option value="A">A 그룹 없음</option>`;
            return;
        }
        dom.groupBatchSelect.innerHTML = groups.map((group) => `<option value="${escapeAttr(group.key)}">${escapeHtml(group.key)} 그룹 · ${group.items.length}개</option>`).join("");
        const next = groups.some((group) => group.key === current) ? current : groups[0].key;
        dom.groupBatchSelect.value = next;
        fillGroupBatchForm(next);
    }

    function fillGroupBatchForm(value = null) {
        const key = normalizeGroupKey(typeof value === "string" ? value : dom.groupBatchSelect?.value, "A");
        const targets = state.sections.filter((section) => normalizeGroupKey(section.groupKey || section.groupName, "A") === key);
        const first = targets[0];
        if (!first) return;
        setValue(dom.groupRenameInput, key);
        setValue(dom.groupColorInput, normalizeHex(first.color || first.renderColor || "#d9d9d9", "#d9d9d9"));
        setValue(dom.groupFloorInput, first.floor || "1");
        setValue(dom.groupGradeInput, first.grade || "일반석");
        setValue(dom.groupPriceInput, String(parseInt(first.price, 10) || 0));
    }

    function syncNamePreviewFromGroupInput() {
        const groupKey = normalizeGroupKey(dom.groupKeyInput?.value, "A");
        const groupIndex = Math.max(1, parseInt(dom.groupIndexInput?.value, 10) || 1);
        setValue(dom.groupKeyInput, groupKey);
        setValue(dom.sectionNameInput, `${groupKey}${groupIndex}`);
    }

    function parseSectionCode(value) {
        const text = String(value || "").trim().toUpperCase();
        const match = text.match(/^([A-Z]+)\s*[-_ ]?\s*(\d+)$/);
        if (!match) return null;
        return {
            groupKey: normalizeGroupKey(match[1], "A"),
            groupIndex: Math.max(1, parseInt(match[2], 10) || 1)
        };
    }

    function normalizeGroupKey(value, fallback = "A") {
        const raw = String(value || "").trim().toUpperCase();
        const match = raw.match(/[A-Z]+/);
        if (match) return match[0].slice(0, 2);
        const fallbackMatch = String(fallback || "A").trim().toUpperCase().match(/[A-Z]+/);
        return fallbackMatch ? fallbackMatch[0].slice(0, 2) : "A";
    }

    function groupKeyFromIndex(index) {
        if (index < GROUP_KEYS.length) return GROUP_KEYS[index];
        const first = GROUP_KEYS[Math.floor(index / GROUP_KEYS.length) - 1] || "Z";
        const second = GROUP_KEYS[index % GROUP_KEYS.length] || "Z";
        return `${first}${second}`;
    }

    function groupKeySortValue(key) {
        const text = normalizeGroupKey(key, "A");
        return text.split("").reduce((sum, char) => sum * 26 + (char.charCodeAt(0) - 64), 0);
    }

    function sortSectionsByPosition(sections) {
        return [...sections].sort((a, b) => {
            const ca = polygonCenter(getPolygon(a));
            const cb = polygonCenter(getPolygon(b));
            const rowTolerance = Math.max(16, state.height * 0.035);
            if (Math.abs(ca.y - cb.y) > rowTolerance) return ca.y - cb.y;
            return ca.x - cb.x;
        });
    }

    function averageCenter(sections) {
        if (!sections.length) return { x: 0, y: 0 };
        const sum = sections.reduce((acc, section) => {
            const center = polygonCenter(getPolygon(section));
            acc.x += center.x;
            acc.y += center.y;
            return acc;
        }, { x: 0, y: 0 });
        return { x: sum.x / sections.length, y: sum.y / sections.length };
    }

    function hexToRgb(hex) {
        const normalized = normalizeHex(hex, "#d9d9d9");
        return {
            r: parseInt(normalized.slice(1, 3), 16),
            g: parseInt(normalized.slice(3, 5), 16),
            b: parseInt(normalized.slice(5, 7), 16),
            a: 255
        };
    }

    function exportDebugImageDataUrl() {
        if (!state.width || !state.height) return "";
        debugCanvas.width = state.width;
        debugCanvas.height = state.height;
        debugCtx.clearRect(0, 0, state.width, state.height);
        debugCtx.drawImage(canvas, 0, 0);
        drawSections(debugCtx, true);
        return debugCanvas.toDataURL("image/png");
    }

    function syncAll() {
        syncPartUi();
        renderOverlay();
        renderPreview();
        renderList();
        renderInfo();
        syncSelectionSummary();
    }

    function setPart(part) {
        state.activePart = part;
        syncPartUi();
        if (dom.canvasGuide) {
            dom.canvasGuide.textContent = part === 1
                ? "구역 자동 나누기 후 비슷한 색상끼리 자동 그룹이 붙습니다."
                : part === 2
                    ? "클릭 선택 / Shift 다중 선택 / 병합으로 구역 도형만 정리하세요."
                    : "색상 그룹을 확인하고 잘못 묶인 구역은 A~Z 그룹을 수정하세요.";
        }
    }

    function syncPartUi() {
        [1, 2, 3].forEach((number) => {
            const panel = dom[`part${number}Panel`];
            const button = dom[`partBtn${number}`];
            if (!panel || !button) return;
            const active = state.activePart === number;
            panel.classList.toggle("is-active", active);
            panel.classList.toggle("is-done", number < state.activePart);
            button.classList.toggle("active", active);
            const status = panel.querySelector(".stage3-step__status");
            if (status) status.textContent = active ? "진행중" : number < state.activePart ? "완료" : "대기";
        });
    }

    function renderOverlay() {
        if (!overlayCtx) return;
        overlayCtx.clearRect(0, 0, state.width, state.height);
        drawSections(overlayCtx, false);

        if (state.dragRect) {
            overlayCtx.save();
            overlayCtx.setLineDash([8, 6]);
            overlayCtx.lineWidth = 2;
            overlayCtx.strokeStyle = "#2563eb";
            overlayCtx.fillStyle = "rgba(37, 99, 235, 0.12)";
            overlayCtx.fillRect(state.dragRect.x, state.dragRect.y, state.dragRect.w, state.dragRect.h);
            overlayCtx.strokeRect(state.dragRect.x, state.dragRect.y, state.dragRect.w, state.dragRect.h);
            overlayCtx.restore();
        }
    }

    function drawSections(targetCtx, debugMode) {
        state.sections.forEach((section, index) => {
            const selected = state.selectedIds.includes(section.id);
            const color = normalizeHex(section.color || section.renderColor || PALETTE[index % PALETTE.length], PALETTE[index % PALETTE.length]);
            const polygons = getPolygons(section);

            polygons.forEach((polygon) => {
                drawPolygon(targetCtx, polygon, {
                    stroke: selected ? "#ef4444" : color,
                    fill: debugMode ? withAlpha(color, 0.18) : selected ? "rgba(239, 68, 68, 0.08)" : "rgba(255,255,255,0)",
                    lineWidth: selected ? 3 : 2,
                    dash: selected ? [8, 5] : []
                });
            });

            const bbox = section.bbox || bboxOf(polygonsPoints(polygons));
            const label = sectionDisplayName(section);
            const x = bbox.x + bbox.w / 2;
            const y = bbox.y + bbox.h / 2;
            drawLabel(targetCtx, label, x, y, selected, debugMode, bbox);
        });
    }

    function drawPolygon(targetCtx, polygon, option) {
        if (!polygon || polygon.length < 3) return;
        targetCtx.save();
        targetCtx.beginPath();
        targetCtx.moveTo(polygon[0].x, polygon[0].y);
        for (let i = 1; i < polygon.length; i += 1) targetCtx.lineTo(polygon[i].x, polygon[i].y);
        targetCtx.closePath();
        targetCtx.fillStyle = option.fill;
        targetCtx.fill();
        targetCtx.strokeStyle = option.stroke;
        targetCtx.lineWidth = option.lineWidth;
        targetCtx.setLineDash(option.dash || []);
        targetCtx.stroke();
        targetCtx.restore();
    }

    function drawLabel(targetCtx, label, x, y, selected, debugMode, bbox = null) {
        const text = String(label || "-").slice(0, 28);
        if (!text) return;

        const box = bbox || { w: 80, h: 36 };
        const widthLimited = box.w / Math.max(6, text.length) * 1.55;
        const heightLimited = box.h * 0.32;
        const fontSize = Math.round(clamp(Math.min(Math.max(11, heightLimited), widthLimited), 10, 24));

        targetCtx.save();
        targetCtx.font = `900 ${fontSize}px Pretendard, Arial, sans-serif`;
        targetCtx.textAlign = "center";
        targetCtx.textBaseline = "middle";
        targetCtx.lineJoin = "round";
        targetCtx.miterLimit = 2;
        targetCtx.strokeStyle = selected ? "rgba(220, 38, 38, 0.72)" : "rgba(15, 23, 42, 0.48)";
        targetCtx.lineWidth = Math.max(2.2, fontSize * 0.18);
        targetCtx.strokeText(text, x, y + 1);
        targetCtx.fillStyle = "#ffffff";
        targetCtx.fillText(text, x, y + 1);

        if (selected && !debugMode) {
            targetCtx.beginPath();
            targetCtx.arc(x, y - fontSize * 1.05, 4, 0, Math.PI * 2);
            targetCtx.fillStyle = "#ef4444";
            targetCtx.fill();
        }

        targetCtx.restore();
    }

    function renderPreview() {
        if (!previewCtx || !previewCanvas || !state.width || !state.height) return;
        const scale = previewCanvas.width / state.width;
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        previewCtx.save();
        previewCtx.scale(scale, scale);
        previewCtx.drawImage(canvas, 0, 0);
        drawSections(previewCtx, true);
        previewCtx.restore();
    }

    function renderList() {
        if (!dom.sectionList) return;
        renderGroupSelect();

        if (!state.sections.length) {
            dom.sectionList.innerHTML = `<div class="stage3-empty">아직 구역이 없습니다.</div>`;
            return;
        }

        const groups = getGroupedSections();
        dom.sectionList.innerHTML = groups.map((group) => {
            const header = `
                <div class="stage3-group-header">
                    <span class="stage3-group-header__dot" style="background:${escapeAttr(group.color)}"></span>
                    <b>${escapeHtml(group.key)} 그룹</b>
                    <span>${group.items.length}개</span>
                </div>
            `;
            const items = group.items.map((section) => {
                const name = escapeHtml(sectionDisplayName(section));
                const floor = escapeHtml(section.floor || "1");
                const grade = escapeHtml(section.grade || "일반석");
                const area = Math.round(section.area || Math.abs(polygonArea(section.polygon || [])) || 0);
                const color = normalizeHex(section.color || section.renderColor || group.color, group.color);
                const selected = state.selectedIds.includes(section.id) ? " is-selected" : "";
                return `
                    <button type="button" class="stage3-section-item${selected}" data-section-id="${escapeAttr(section.id)}">
                        <span class="stage3-section-item__color" style="background:${escapeAttr(color)}"></span>
                        <span class="stage3-section-item__text">
                            <b>${name}</b>
                            <span>${floor}층 · ${grade}</span>
                        </span>
                        <span class="stage3-section-item__area">${area}</span>
                    </button>
                `;
            }).join("");
            return `<div class="stage3-group-block">${header}${items}</div>`;
        }).join("");

        dom.sectionList.querySelectorAll("[data-section-id]").forEach((button) => {
            button.addEventListener("click", (event) => {
                const id = button.dataset.sectionId;
                if (event.shiftKey || event.ctrlKey || event.metaKey) toggleSelected(id);
                else state.selectedIds = [id];
                fillForm(getPrimarySelected());
                syncAll();
            });
        });
    }

    function renderInfo() {
        const selected = getSelectedSections();
        const primary = selected[0] || null;
        setText(dom.totalCount, String(state.sections.length));
        setText(dom.selectedCount, String(selected.length));
        setText(dom.selectedArea, selected.length ? String(Math.round(selected.reduce((sum, section) => sum + (section.area || 0), 0))) : "-");
        setText(dom.selectedName, primary ? `${normalizeGroupKey(primary.groupKey || primary.groupName, "A")} / ${sectionDisplayName(primary)}` : "-");
    }

    function syncSelectionSummary() {
        if (!dom.selectionSummary) return;
        const selected = getSelectedSections();
        if (!selected.length) {
            dom.selectionSummary.textContent = "선택 구역 없음";
            return;
        }
        dom.selectionSummary.textContent = selected.map((section) => sectionDisplayName(section)).join(" / ");
    }

    function fillForm(section) {
        if (!section) {
            setValue(dom.groupKeyInput, "A");
            setValue(dom.groupIndexInput, "1");
            setValue(dom.sectionNameInput, "A1");
            setValue(dom.floorInput, "1");
            setValue(dom.gradeInput, "일반석");
            setValue(dom.priceInput, "132000");
            setValue(dom.sectionColorInput, "#d9d9d9");
            setValue(dom.labelInput, "");
            return;
        }

        const groupKey = normalizeGroupKey(section.groupKey || section.groupName || section.sectionName, "A");
        const groupIndex = Math.max(1, parseInt(section.groupIndex, 10) || parseSectionCode(section.sectionName)?.groupIndex || 1);
        setValue(dom.groupKeyInput, groupKey);
        setValue(dom.groupIndexInput, String(groupIndex));
        setValue(dom.sectionNameInput, `${groupKey}${groupIndex}`);
        setValue(dom.floorInput, section.floor || "1");
        setValue(dom.gradeInput, section.grade || "일반석");
        setValue(dom.priceInput, String(parseInt(section.price, 10) || 0));
        setValue(dom.sectionColorInput, normalizeHex(section.color || section.renderColor || "#d9d9d9", "#d9d9d9"));
        setValue(dom.labelInput, section.label || section.sectionName || section.name || "");
        fillGroupBatchForm(groupKey);
    }

    function sortSections(showToast = true) {
        state.sections.sort((a, b) => {
            const ca = polygonCenter(getPolygon(a));
            const cb = polygonCenter(getPolygon(b));
            const rowTolerance = Math.max(16, state.height * 0.035);
            if (Math.abs(ca.y - cb.y) > rowTolerance) return ca.y - cb.y;
            return ca.x - cb.x;
        });
        if (showToast) toast("구역 목록을 위→아래, 왼쪽→오른쪽 기준으로 정렬했습니다.");
        saveLocalState();
        syncAll();
    }

    function findSectionAt(point) {
        for (let i = state.sections.length - 1; i >= 0; i -= 1) {
            const section = state.sections[i];
            const polygons = getPolygons(section);
            if (polygons.some((polygon) => pointInPolygon(point, polygon))) return section;
        }
        return null;
    }

    function getPrimarySelected() {
        const id = state.selectedIds[0];
        return state.sections.find((section) => section.id === id) || null;
    }

    function getSelectedSections() {
        const selectedSet = new Set(state.selectedIds);
        return state.sections.filter((section) => selectedSet.has(section.id));
    }

    function toggleSelected(id) {
        if (!id) return;
        if (state.selectedIds.includes(id)) {
            state.selectedIds = state.selectedIds.filter((value) => value !== id);
        } else {
            state.selectedIds.push(id);
        }
    }

    function canvasPointFromEvent(event) {
        const rect = overlay.getBoundingClientRect();
        return {
            x: clamp((event.clientX - rect.left) * (overlay.width / rect.width), 0, state.width),
            y: clamp((event.clientY - rect.top) * (overlay.height / rect.height), 0, state.height)
        };
    }

    function detectBackgroundColor() {
        if (!state.width || !state.height) return { r: 255, g: 255, b: 255, a: 255 };
        const imageData = ctx.getImageData(0, 0, state.width, state.height);
        const data = imageData.data;
        const samples = [];
        const stepX = Math.max(1, Math.floor(state.width / 80));
        const stepY = Math.max(1, Math.floor(state.height / 80));

        for (let x = 0; x < state.width; x += stepX) {
            samples.push(pixelAtXY(data, x, 0));
            samples.push(pixelAtXY(data, x, state.height - 1));
        }
        for (let y = 0; y < state.height; y += stepY) {
            samples.push(pixelAtXY(data, 0, y));
            samples.push(pixelAtXY(data, state.width - 1, y));
        }

        const buckets = new Map();
        samples.forEach((color) => {
            const key = `${Math.round(color.r / 16) * 16},${Math.round(color.g / 16) * 16},${Math.round(color.b / 16) * 16}`;
            const entry = buckets.get(key) || { r: 0, g: 0, b: 0, count: 0 };
            entry.r += color.r;
            entry.g += color.g;
            entry.b += color.b;
            entry.count += 1;
            buckets.set(key, entry);
        });

        const best = Array.from(buckets.values()).sort((a, b) => b.count - a.count)[0];
        if (!best) return { r: 255, g: 255, b: 255, a: 255 };
        return { r: best.r / best.count, g: best.g / best.count, b: best.b / best.count, a: 255 };
    }

    function pixelAt(data, index) {
        const offset = index * 4;
        return { r: data[offset], g: data[offset + 1], b: data[offset + 2], a: data[offset + 3] };
    }

    function pixelAtXY(data, x, y) {
        return pixelAt(data, Math.round(y) * state.width + Math.round(x));
    }

    function getPolygon(section) {
        if (Array.isArray(section?.polygon) && section.polygon.length >= 3) return section.polygon;
        if (Array.isArray(section?.polygons) && section.polygons[0]?.length >= 3) return section.polygons[0];
        return [];
    }

    function getPolygons(section) {
        if (Array.isArray(section?.polygons) && section.polygons.length) {
            return section.polygons.filter((polygon) => Array.isArray(polygon) && polygon.length >= 3);
        }
        const polygon = getPolygon(section);
        return polygon.length >= 3 ? [polygon] : [];
    }

    function hasUsablePolygon(section) {
        return getPolygons(section).length > 0 || getPolygon(section).length >= 3;
    }

    function normalizeLoadedSection(section, index) {
        const id = cleanText(section.id || section.sectionId, `sec-${index + 1}`);
        const polygons = getPolygons(section).map((polygon) => polygon.map(normalizePoint)).filter((polygon) => polygon.length >= 3);
        const polygon = polygons[0] || getPolygon(section).map(normalizePoint);
        const points = polygonsPoints(polygons.length ? polygons : [polygon]);
        const bbox = section.bbox && Number.isFinite(Number(section.bbox.w)) ? normalizeBbox(section.bbox) : bboxOf(points);
        const color = normalizeHex(section.color || section.renderColor || section.sourceColor || PALETTE[index % PALETTE.length], PALETTE[index % PALETTE.length]);
        const name = cleanText(section.sectionName || section.name || section.section, section.label || `A${index + 1}`);
        const parsed = parseSectionCode(name);
        const originalHasGroupInfo = Boolean(section.groupKey || section.groupName || parsed);
        const groupKey = normalizeGroupKey(section.groupKey || section.groupName || parsed?.groupKey, groupKeyFromIndex(index));
        const groupIndex = Math.max(1, parseInt(section.groupIndex, 10) || parsed?.groupIndex || index + 1);
        const sectionName = `${groupKey}${groupIndex}`;

        return {
            ...section,
            id,
            sectionId: section.sectionId || id,
            groupKey,
            groupName: groupKey,
            groupIndex,
            __stage3Grouped: originalHasGroupInfo,
            section: sectionName,
            name: sectionName,
            sectionName,
            label: cleanText(section.label, sectionName),
            floor: cleanText(section.floor, "1"),
            grade: cleanText(section.grade, "일반석"),
            price: parseInt(section.price, 10) || 0,
            color,
            renderColor: color,
            polygon,
            polygons: polygons.length ? polygons : [polygon],
            bbox,
            area: Math.round(Number(section.area) || Math.abs(polygonArea(polygon)) || 0),
            sourceRegionIds: normalizeArray(section.sourceRegionIds || section.sectionIds || id).map(String),
            sectionIds: normalizeArray(section.sectionIds || section.sourceRegionIds || id).map(String),
            button: section.button || buildButtonInfo(bbox, section.label || sectionName, color, 0)
        };
    }

    function updateNextId() {
        const maxId = state.sections.reduce((max, section) => {
            const number = parseInt(String(section.id || "").replace(/\D+/g, ""), 10) || 0;
            return Math.max(max, number);
        }, 0);
        state.nextId = maxId + 1;
    }

    function cleanupPolygon(polygon, tolerance, snapSize) {
        if (!Array.isArray(polygon) || polygon.length < 3) return polygon;
        let out = removeDuplicatePoints(polygon.map(normalizePoint));
        if (out.length >= 4 && tolerance > 0) {
            const closed = out.concat([out[0]]);
            out = rdp(closed, tolerance).slice(0, -1);
        }
        if (snapSize > 0) {
            out = out.map((point) => ({
                x: Math.round(point.x / snapSize) * snapSize,
                y: Math.round(point.y / snapSize) * snapSize
            }));
            out = removeDuplicatePoints(out);
        }
        if (out.length < 3) return polygon;
        return out;
    }

    function rdp(points, epsilon) {
        if (!points || points.length < 3) return points || [];
        let maxDistance = 0;
        let index = 0;
        const end = points.length - 1;

        for (let i = 1; i < end; i += 1) {
            const distance = perpendicularDistance(points[i], points[0], points[end]);
            if (distance > maxDistance) {
                index = i;
                maxDistance = distance;
            }
        }

        if (maxDistance > epsilon) {
            const left = rdp(points.slice(0, index + 1), epsilon);
            const right = rdp(points.slice(index), epsilon);
            return left.slice(0, -1).concat(right);
        }

        return [points[0], points[end]];
    }

    function perpendicularDistance(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        if (dx === 0 && dy === 0) return distance(point, lineStart);
        return Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x) / Math.sqrt(dx * dx + dy * dy);
    }

    function convexHull(points) {
        const uniquePoints = uniqueByPoint(points.map(normalizePoint));
        if (uniquePoints.length <= 3) return uniquePoints;

        uniquePoints.sort((a, b) => a.x - b.x || a.y - b.y);
        const lower = [];
        for (const point of uniquePoints) {
            while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
            lower.push(point);
        }
        const upper = [];
        for (let i = uniquePoints.length - 1; i >= 0; i -= 1) {
            const point = uniquePoints[i];
            while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
            upper.push(point);
        }
        return lower.slice(0, -1).concat(upper.slice(0, -1));
    }

    function cross(o, a, b) {
        return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    }

    function pointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x;
            const yi = polygon[i].y;
            const xj = polygon[j].x;
            const yj = polygon[j].y;
            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / ((yj - yi) || 0.000001) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    function polygonArea(polygon) {
        if (!polygon || polygon.length < 3) return 0;
        let area = 0;
        for (let i = 0; i < polygon.length; i += 1) {
            const current = polygon[i];
            const next = polygon[(i + 1) % polygon.length];
            area += current.x * next.y - next.x * current.y;
        }
        return area / 2;
    }

    function polygonCenter(polygon) {
        if (!polygon || !polygon.length) return { x: 0, y: 0 };
        const bbox = bboxOf(polygon);
        return { x: bbox.x + bbox.w / 2, y: bbox.y + bbox.h / 2 };
    }

    function bboxOf(points) {
        const list = Array.isArray(points?.[0]) ? polygonsPoints(points) : points;
        if (!list || !list.length) return { x: 0, y: 0, w: 0, h: 0 };
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        list.forEach((point) => {
            minX = Math.min(minX, Number(point.x) || 0);
            minY = Math.min(minY, Number(point.y) || 0);
            maxX = Math.max(maxX, Number(point.x) || 0);
            maxY = Math.max(maxY, Number(point.y) || 0);
        });
        return { x: round(minX), y: round(minY), w: round(maxX - minX), h: round(maxY - minY) };
    }

    function buildButtonInfo(bbox, label, color, angle) {
        const cx = bbox.x + bbox.w / 2;
        const cy = bbox.y + bbox.h / 2;
        return {
            x: round(cx),
            y: round(cy),
            w: round(bbox.w),
            h: round(bbox.h),
            xPercent: percent(cx, state.width),
            yPercent: percent(cy, state.height),
            wPercent: percent(bbox.w, state.width),
            hPercent: percent(bbox.h, state.height),
            angle: round(angle || 0),
            label,
            color
        };
    }

    function rectPolygon(rect) {
        return [
            { x: round(rect.x), y: round(rect.y) },
            { x: round(rect.x + rect.w), y: round(rect.y) },
            { x: round(rect.x + rect.w), y: round(rect.y + rect.h) },
            { x: round(rect.x), y: round(rect.y + rect.h) }
        ];
    }

    function normalizeRect(rect) {
        const x1 = clamp(rect.x, 0, state.width);
        const y1 = clamp(rect.y, 0, state.height);
        const x2 = clamp(rect.x + rect.w, 0, state.width);
        const y2 = clamp(rect.y + rect.h, 0, state.height);
        return {
            x: Math.min(x1, x2),
            y: Math.min(y1, y2),
            w: Math.abs(x2 - x1),
            h: Math.abs(y2 - y1)
        };
    }

    function roundedRectPath(targetCtx, x, y, w, h, r) {
        const radius = Math.min(r, w / 2, h / 2);
        targetCtx.moveTo(x + radius, y);
        targetCtx.lineTo(x + w - radius, y);
        targetCtx.quadraticCurveTo(x + w, y, x + w, y + radius);
        targetCtx.lineTo(x + w, y + h - radius);
        targetCtx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        targetCtx.lineTo(x + radius, y + h);
        targetCtx.quadraticCurveTo(x, y + h, x, y + h - radius);
        targetCtx.lineTo(x, y + radius);
        targetCtx.quadraticCurveTo(x, y, x + radius, y);
    }

    function normalizePoint(point) {
        return { x: round(Number(point?.x) || 0), y: round(Number(point?.y) || 0) };
    }

    function normalizeBbox(bbox) {
        return {
            x: round(Number(bbox.x) || 0),
            y: round(Number(bbox.y) || 0),
            w: round(Number(bbox.w ?? bbox.width) || 0),
            h: round(Number(bbox.h ?? bbox.height) || 0)
        };
    }

    function polygonsPoints(polygons) {
        return normalizeArray(polygons).flatMap((polygon) => normalizeArray(polygon).map(normalizePoint));
    }

    function removeDuplicatePoints(points) {
        const output = [];
        points.forEach((point) => {
            const last = output[output.length - 1];
            if (!last || Math.abs(last.x - point.x) > 0.01 || Math.abs(last.y - point.y) > 0.01) output.push(point);
        });
        if (output.length > 1) {
            const first = output[0];
            const last = output[output.length - 1];
            if (Math.abs(first.x - last.x) <= 0.01 && Math.abs(first.y - last.y) <= 0.01) output.pop();
        }
        return output;
    }

    function uniqueByPoint(points) {
        const map = new Map();
        points.forEach((point) => map.set(`${round(point.x)},${round(point.y)}`, normalizePoint(point)));
        return Array.from(map.values());
    }

    function setZoom(value) {
        state.zoom = clamp(value, 0.25, 3);
        if (dom.canvasBox) dom.canvasBox.style.transform = `scale(${state.zoom})`;
        const zoomValue = document.getElementById("zoomValue");
        if (zoomValue) zoomValue.textContent = `${Math.round(state.zoom * 100)}%`;
    }

    function fitZoom() {
        if (!dom.canvasScroll || !state.width || !state.height) {
            setZoom(1);
            return;
        }
        const scaleX = (dom.canvasScroll.clientWidth - 90) / state.width;
        const scaleY = (dom.canvasScroll.clientHeight - 90) / state.height;
        setZoom(Math.min(1, Math.max(0.25, Math.min(scaleX, scaleY))));
    }

    function projectFileUrl(fileName) {
        return `/temp/seatmap/${encodeURIComponent(state.projectId)}/${fileName}`;
    }

    function loadImage(url) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error("이미지 로드 실패: " + url));
            image.src = url;
        });
    }

    function noCache(url) {
        if (!url) return url;
        if (url.startsWith("data:")) return url;
        const joiner = url.includes("?") ? "&" : "?";
        return `${url}${joiner}v=${Date.now()}`;
    }

    function readJson(key, fallback) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : fallback;
        } catch (error) {
            return fallback;
        }
    }

    function normalizeArray(value) {
        if (Array.isArray(value)) return value;
        if (value == null || value === "") return [];
        return [value];
    }

    function unique(values) {
        return Array.from(new Set(values.filter(Boolean)));
    }

    function copyPoint(point) {
        return { x: round(point.x), y: round(point.y) };
    }

    function cleanText(value, fallback) {
        const text = String(value ?? "").trim();
        return text || fallback;
    }

    function sanitizeProjectId(value) {
        const text = String(value || "seat").trim();
        return text.replace(/[^a-zA-Z0-9가-힣._-]/g, "_") || "seat";
    }

    function positiveNumber(value, fallback) {
        const number = Number(value);
        return Number.isFinite(number) && number >= 0 ? number : fallback;
    }

    function readSimplify() {
        return positiveNumber(dom.simplifyTolerance?.value, 4);
    }

    function normalizeHex(value, fallback) {
        const text = String(value || fallback || "#d9d9d9").trim();
        if (/^#[0-9a-fA-F]{6}$/.test(text)) return text.toLowerCase();
        if (/^#[0-9a-fA-F]{3}$/.test(text)) {
            return "#" + text.slice(1).split("").map((char) => char + char).join("").toLowerCase();
        }
        return fallback || "#d9d9d9";
    }

    function rgbToHex(color) {
        return "#" + [color.r, color.g, color.b].map((value) => {
            const number = clamp(Math.round(value), 0, 255);
            return number.toString(16).padStart(2, "0");
        }).join("");
    }

    function withAlpha(hex, alpha) {
        const normalized = normalizeHex(hex, "#d9d9d9");
        const r = parseInt(normalized.slice(1, 3), 16);
        const g = parseInt(normalized.slice(3, 5), 16);
        const b = parseInt(normalized.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function colorDistance(a, b) {
        const dr = (a.r || 0) - (b.r || 0);
        const dg = (a.g || 0) - (b.g || 0);
        const db = (a.b || 0) - (b.b || 0);
        return Math.sqrt(dr * dr + dg * dg + db * db);
    }

    function distance(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function percent(value, total) {
        if (!total) return 0;
        return round((Number(value) || 0) / total * 100);
    }

    function round(value) {
        return Math.round((Number(value) || 0) * 100) / 100;
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, Number(value) || 0));
    }

    function setText(element, text) {
        if (element) element.textContent = text;
    }

    function setValue(element, value) {
        if (element) element.value = value;
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function escapeAttr(value) {
        return escapeHtml(value).replace(/`/g, "&#96;");
    }

    function toast(message) {
        const target = dom.toast;
        if (!target) return;
        target.textContent = message;
        target.classList.add("show");
        clearTimeout(toast.timer);
        toast.timer = setTimeout(() => target.classList.remove("show"), 2200);
    }
})();
