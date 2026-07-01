(() => {
    "use strict";

    const SAVE_URL = "/admin/seatmap/temp-save";
    const STATUS_AVAILABLE = "AVAILABLE";

    const STORAGE = {
        projectId: "seatmap_current_project_id",
        folderName: "seatmap_current_folder_name",
        sections: "seatmap_stage3_sections",
        sectionsCompat: "concert_sections",
        sectionsHeader: "concert_stage1_sections",
        seats: "seatmap_stage4_seats",
        seatsUrl: "seatmap_stage4_seat_json_url",
        layouts: "seatmap_stage4_layouts",
        decorations: "seatmap_stage4_decorations",
        finalSeats: "concert_final_seats",
        bookingSeats: "concert_booking_seats",
        seatsBySectionCompat: "concert_stage3_seats",
        layoutsCompat: "concert_stage3_layouts"
    };

    const COLORS = {
        boardBg: "#ffffff",
        sectionStroke: "#7c3aed",
        sectionFill: "rgba(124, 58, 237, 0.12)",
        sectionIdleFill: "rgba(255,255,255,0.82)",
        sectionIdleStroke: "rgba(15, 23, 42, 0.42)",
        seat: "#a3e635",
        seatStroke: "#ffffff",
        seatSelected: "#2563eb",
        seatHover: "#f97316",
        label: "#111827",
        button: "rgba(239, 68, 68, 0.16)"
    };

    const state = {
        projectId: "seat",
        stage3Url: "/admin/seatmap/stage/3",
        stage5Url: "/admin/seatmap/stage/5",
        seatmapImageUrl: "",
        buttonImageUrl: "",
        sectionsUrl: "",
        seatsUrl: "",
        decorationsUrl: "",
        projectCandidates: [],
        buttonImageCandidates: [],
        sectionCandidates: [],
        seatsCandidates: [],
        decorationCandidates: [],
        loadedSectionUrl: "",
        loadedImageUrl: "",
        projectPathUrl: "",
        width: 1200,
        height: 800,
        sourceImage: null,
        sourceImageUrl: "",
        sections: [],
        seats: [],
        layouts: {},
        selectedSectionId: "",
        selectedSeatIds: new Set(),
        activePart: 1,
        tool: "select",
        hoverSeatId: "",
        zoom: 1,
        drag: null
    };

    const dom = {};
    let canvas;
    let overlay;
    let ctx;
    let overlayCtx;

    document.addEventListener("DOMContentLoaded", init);

    async function init() {
        cacheDom();
        if (!canvas || !overlay) {
            console.error("[SeatTrace Stage4] canvas 연결 실패");
            return;
        }

        readRouteState();
        bindEvents();
        await loadBaseImage();
        await loadSections();
        await loadExistingWork();
        arrangeSectionsOnBoard();

        if (!state.selectedSectionId && state.sections[0]) {
            state.selectedSectionId = state.sections[0].sectionId;
        }

        restoreLayoutToInputs(getSelectedSection());
        setPart(1);
        fitZoom();
        syncAll();
        toast("Stage 4 펼쳐보기 좌석 배치 준비 완료");

        window.SeatMapStage4 = {
            save: saveSeatsToServer,
            getSeats: createFinalSeatJson,
            getSeatLayouts: createSeatLayoutsJson,
            getSections: () => state.sections.map(sectionForSave),
            exportDebugImage: exportDebugImageDataUrl
        };
    }

    function cacheDom() {
        canvas = document.getElementById("canvas");
        overlay = document.getElementById("overlay");
        if (canvas) ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (overlay) overlayCtx = overlay.getContext("2d", { willReadFrequently: true });

        [
            "stage4App", "toast", "canvasBox", "canvasScroll", "canvasSize",
            "part1Panel", "part2Panel", "part3Panel", "partBtn1", "partBtn2", "partBtn3",
            "part1Status", "part2Status", "part3Status", "goPart2Btn",
            "groupFilter", "sectionSelect", "sectionSearch", "sectionList", "rotateLeftBtn", "rotateRightBtn",
            "selectedSectionName", "rowsInput", "colsInput", "angleInput", "seatSizeInput", "gapXInput", "gapYInput",
            "rowStartInput", "colStartInput", "generateSectionBtn", "inferAllBtn", "tightenBoundsBtn", "clearSectionBtn",
            "manualRowInput", "manualColInput", "manualAddBtn", "deleteSeatBtn", "clearSelectionBtn",
            "saveSummary", "saveSeatsBtn", "toStage5Btn", "miniImg",
            "infoSection", "infoSectionId", "infoFloorGrade", "infoPrice", "infoSectionSeats", "infoSelectedSeats",
            "totalSections", "totalSeats", "jsonPreview",
            "zoomIn", "zoomOut", "zoomReset", "zoomFit", "resetView", "zoomValue", "zoomTool"
        ].forEach((id) => {
            dom[id] = document.getElementById(id);
        });
    }

    function readRouteState() {
        const root = dom.stage4App;
        const params = new URLSearchParams(location.search);
        const rawProjectId = firstNonEmpty(
            params.get("projectId"),
            root?.dataset.projectId,
            localStorage.getItem(STORAGE.folderName),
            localStorage.getItem(STORAGE.projectId),
            "seat"
        );

        state.projectId = sanitizeProjectId(rawProjectId);
        state.projectCandidates = unique([
            rawProjectId,
            state.projectId,
            root?.dataset.projectId,
            localStorage.getItem(STORAGE.folderName),
            localStorage.getItem(STORAGE.projectId)
        ].map(sanitizeProjectId).filter(Boolean));

        state.stage3Url = root?.dataset.stage3Url || `/admin/seatmap/stage/3?projectId=${encodeURIComponent(state.projectId)}`;
        state.stage5Url = root?.dataset.stage5Url || `/admin/seatmap/stage/5?projectId=${encodeURIComponent(state.projectId)}`;
        state.projectPathUrl = normalizeUrlPath(root?.dataset.projectPath || `/temp/seatmap/${encodeURIComponent(state.projectId)}`);

        state.buttonImageUrl = firstNonEmpty(root?.dataset.buttonImageUrl, root?.dataset.seatmapImageUrl, projectFileUrl("button-image.png"));
        state.seatmapImageUrl = firstNonEmpty(root?.dataset.seatmapImageUrl, state.buttonImageUrl, projectFileUrl("button-image.png"));
        state.sectionsUrl = firstNonEmpty(root?.dataset.sectionJsonUrl, root?.dataset.sectionsUrl, projectFileUrl("seatmap-sections.json"));
        state.seatsUrl = firstNonEmpty(root?.dataset.seatsUrl, seatsFileUrl());
        state.decorationsUrl = firstNonEmpty(root?.dataset.decorationsUrl, projectFileUrl("seatmap-decorations.json"));

        state.buttonImageCandidates = unique([
            state.buttonImageUrl,
            ...candidateProjectFileUrls("button-image.png"),
            state.seatmapImageUrl,
            ...candidateProjectFileUrls("seatmap-image.png"),
            ...candidateProjectFileUrls("cropped-image.png")
        ]);
        state.sectionCandidates = unique([
            state.sectionsUrl,
            ...candidateProjectFileUrls("seatmap-sections.json")
        ]);
        state.seatsCandidates = unique([
            state.seatsUrl,
            ...candidateSeatsFileUrls()
        ]);
        state.decorationCandidates = unique([
            state.decorationsUrl,
            ...candidateProjectFileUrls("seatmap-decorations.json")
        ]);

        localStorage.setItem(STORAGE.projectId, state.projectId);
        localStorage.setItem(STORAGE.folderName, state.projectId);

        console.info("[SeatTrace Stage4] load candidates", {
            projectId: state.projectId,
            image: state.buttonImageCandidates,
            sections: state.sectionCandidates,
            seats: state.seatsCandidates,
            decorations: state.decorationCandidates
        });
    }

    function bindEvents() {
        bind(dom.partBtn1, "click", () => setPart(1));
        bind(dom.partBtn2, "click", () => setPart(2));
        bind(dom.partBtn3, "click", () => setPart(3));
        bind(dom.goPart2Btn, "click", () => setPart(2));

        bind(dom.groupFilter, "change", syncSectionList);
        bind(dom.sectionSelect, "change", () => selectSection(dom.sectionSelect.value));
        bind(dom.sectionSearch, "input", syncSectionList);
        bind(dom.rotateLeftBtn, "click", () => rotateSelectedSection(-15));
        bind(dom.rotateRightBtn, "click", () => rotateSelectedSection(15));

        bind(dom.generateSectionBtn, "click", generateSelectedSectionSeats);
        bind(dom.inferAllBtn, "click", inferAllSections);
        bind(dom.tightenBoundsBtn, "click", tightenSelectedBounds);
        bind(dom.clearSectionBtn, "click", clearSelectedSectionSeats);
        bind(dom.manualAddBtn, "click", toggleManualAddMode);
        bind(dom.deleteSeatBtn, "click", deleteSelectedSeats);
        bind(dom.clearSelectionBtn, "click", () => {
            state.selectedSeatIds.clear();
            syncAll();
        });
        bind(dom.saveSeatsBtn, "click", () => saveSeatsToServer());
        bind(dom.toStage5Btn, "click", goStage5);

        [dom.rowsInput, dom.colsInput, dom.angleInput, dom.seatSizeInput, dom.gapXInput, dom.gapYInput, dom.rowStartInput, dom.colStartInput].forEach((input) => {
            bind(input, "change", () => rememberCurrentLayoutFromInputs(true));
            bind(input, "input", () => rememberCurrentLayoutFromInputs(false));
        });

        bind(overlay, "pointerdown", handlePointerDown);
        bind(overlay, "pointermove", handlePointerMove);
        bind(overlay, "pointerup", handlePointerUp);
        bind(overlay, "pointercancel", handlePointerUp);
        bind(overlay, "pointerleave", () => {
            state.hoverSeatId = "";
            if (!state.drag) drawOverlay();
        });

        bind(dom.zoomIn, "click", () => setZoom(state.zoom + 0.1));
        bind(dom.zoomOut, "click", () => setZoom(state.zoom - 0.1));
        bind(dom.zoomReset, "click", () => setZoom(1));
        bind(dom.zoomFit, "click", fitZoom);
        bind(dom.resetView, "click", () => {
            setZoom(1);
            if (dom.canvasScroll) {
                dom.canvasScroll.scrollLeft = 0;
                dom.canvasScroll.scrollTop = 0;
            }
        });
        bind(dom.zoomTool, "click", () => toast("Stage 4는 Stage 3 polygon을 펼쳐서 좌석을 넣고, 실제 좌석 범위로 버튼 기준을 확정합니다."));
    }

    function bind(element, eventName, handler) {
        if (element) element.addEventListener(eventName, handler);
    }

    async function loadBaseImage() {
        const candidates = state.buttonImageCandidates.length ? state.buttonImageCandidates : unique([
            state.buttonImageUrl,
            projectFileUrl("button-image.png"),
            state.seatmapImageUrl,
            projectFileUrl("seatmap-image.png"),
            projectFileUrl("cropped-image.png")
        ]).filter(Boolean);

        for (const url of candidates) {
            try {
                const image = await loadImage(noCache(url));
                state.sourceImage = image;
                state.sourceImageUrl = url;
                state.loadedImageUrl = url;
                if (dom.miniImg) dom.miniImg.src = noCache(url);
                console.info("[SeatTrace Stage4] 기준 도면 로드 성공", url);
                return;
            } catch (error) {
                console.warn("[SeatTrace Stage4] 기준 도면 로드 실패", url, error);
            }
        }
        toast("button-image.png를 읽지 못했습니다. Network에서 /temp/seatmap/프로젝트/button-image.png 경로를 확인하세요.");
    }

    async function loadSections() {
        const candidates = state.sectionCandidates.length ? state.sectionCandidates : unique([
            state.sectionsUrl,
            projectFileUrl("seatmap-sections.json")
        ]);

        for (const url of candidates) {
            try {
                const data = await fetchJson(url);
                const source = normalizeArray(data?.sections || data?.items || data);
                const nextSections = source.map(normalizeSection).filter(hasUsablePolygon);
                if (nextSections.length) {
                    state.sections = nextSections;
                    state.loadedSectionUrl = url;
                    writeJson(STORAGE.sections, state.sections.map(sectionForSave));
                    console.info("[SeatTrace Stage4] seatmap-sections.json 로드 성공", url, state.sections.length);
                    break;
                }
                console.warn("[SeatTrace Stage4] 구역 polygon이 비어 있음", url, data);
            } catch (error) {
                console.warn("[SeatTrace Stage4] seatmap-sections.json 로드 실패", url, error);
            }
        }

        if (!state.sections.length) {
            const local = readJson(STORAGE.sections, null)
                || readJson(STORAGE.sectionsCompat, null)
                || readJson(STORAGE.sectionsHeader, null);
            const source = normalizeArray(local);
            state.sections = source.map(normalizeSection).filter(hasUsablePolygon);
            if (state.sections.length) {
                state.loadedSectionUrl = "localStorage";
                console.info("[SeatTrace Stage4] localStorage 구역 복구", state.sections.length);
            }
        }

        if (!state.sections.length) {
            toast("Stage 3 구역 JSON을 못 읽었습니다. /temp/seatmap/" + state.projectId + "/seatmap-sections.json 경로를 확인하세요.");
        }
    }

    async function loadExistingWork() {
        await loadDecorations();

        const localSeats = normalizeSeatCollection(readJson(STORAGE.seats, null)
            || readJson(STORAGE.finalSeats, null)
            || readJson(STORAGE.bookingSeats, null)
            || readJson(STORAGE.seatsBySectionCompat, null));
        if (localSeats.length) {
            const detailed = localSeats.map(normalizeSeat).filter(hasSeatPoint);
            if (detailed.length) state.seats = detailed;
        }

        const layouts = readJson(STORAGE.layouts, null) || readJson(STORAGE.layoutsCompat, null);
        if (layouts && typeof layouts === "object") {
            state.layouts = { ...state.layouts, ...layouts };
        }

        if (state.seats.length) return;

        // seats JSON은 최종 예매용 id 목록만 저장된다. 좌표 복구는 decorations의 stage4DetailedSeats에서만 한다.
        for (const url of (state.seatsCandidates.length ? state.seatsCandidates : [state.seatsUrl])) {
            try {
                await fetchJson(url);
                console.info("[SeatTrace Stage4] 기존 seats id 목록 확인", url);
                break;
            } catch (error) {
                console.warn("[SeatTrace Stage4] 기존 seats id 목록 없음", url, error);
            }
        }
    }

    async function loadDecorations() {
        let data = null;
        const candidates = state.decorationCandidates.length ? state.decorationCandidates : unique([
            state.decorationsUrl,
            projectFileUrl("seatmap-decorations.json")
        ]);
        for (const url of candidates) {
            try {
                data = await fetchJson(url);
                if (data && typeof data === "object") {
                    console.info("[SeatTrace Stage4] seatmap-decorations.json 로드 성공", url);
                    break;
                }
            } catch (error) {
                console.warn("[SeatTrace Stage4] seatmap-decorations.json 로드 실패", url, error);
            }
        }
        if (!data) data = readJson(STORAGE.decorations, null);
        if (!data || typeof data !== "object") return;

        const seatLayouts = normalizeArray(data.seatLayouts || data.stage4SeatLayouts);
        seatLayouts.forEach((raw) => {
            const sectionId = cleanText(raw.sectionId, "");
            if (!sectionId) return;
            state.layouts[sectionId] = normalizeLayout(raw);
        });

        const detailedSeats = normalizeArray(data.stage4DetailedSeats || data.detailedSeats || data.seats);
        if (detailedSeats.length) {
            state.seats = detailedSeats.map(normalizeSeat).filter(hasSeatPoint);
        }
    }

    function arrangeSectionsOnBoard() {
        if (!state.sections.length) {
            setupCanvas(1200, 800);
            drawBase();
            return;
        }

        const padding = 70;
        const groupGapY = 78;
        const itemGapX = 28;
        const itemGapY = 24;
        const minCardW = 140;
        const minCardH = 100;
        const targetH = 100;
        const maxRowWidth = 1250;
        const groups = groupSectionsForBoard(state.sections);

        let y = padding;
        let boardW = maxRowWidth + padding * 2;

        groups.forEach((group) => {
            let x = padding;
            let rowH = 0;
            group.sections.forEach((section) => {
                const box = getOriginalBbox(section);
                const current = state.layouts[section.sectionId] || {};
                const baseScale = Number(current.scale) || Math.max(1, minCardW / Math.max(1, box.w), minCardH / Math.max(1, box.h), targetH / Math.max(1, box.h));
                const layoutW = Math.max(minCardW, box.w * baseScale);
                const layoutH = Math.max(minCardH, box.h * baseScale);

                if (!Number.isFinite(current.layoutX) || !Number.isFinite(current.layoutY)) {
                    if (x + layoutW > maxRowWidth + padding) {
                        x = padding;
                        y += rowH + itemGapY;
                        rowH = 0;
                    }
                    state.layouts[section.sectionId] = {
                        ...defaultLayout(section),
                        ...current,
                        layoutX: x,
                        layoutY: y,
                        scale: baseScale,
                        originalBbox: box,
                        width: layoutW,
                        height: layoutH
                    };
                    x += layoutW + itemGapX;
                    rowH = Math.max(rowH, layoutH);
                } else {
                    state.layouts[section.sectionId] = {
                        ...defaultLayout(section),
                        ...current,
                        originalBbox: box,
                        width: Math.max(minCardW, box.w * (Number(current.scale) || baseScale)),
                        height: Math.max(minCardH, box.h * (Number(current.scale) || baseScale))
                    };
                    rowH = Math.max(rowH, state.layouts[section.sectionId].height || layoutH);
                }
            });
            y += Math.max(rowH, targetH) + groupGapY;
        });

        const ext = getBoardExtent();
        boardW = Math.max(boardW, ext.maxX + padding);
        const boardH = Math.max(760, ext.maxY + padding);
        setupCanvas(boardW, boardH);
        rebuildSectionGeometry();
        drawBase();
    }

    function groupSectionsForBoard(sections) {
        const map = new Map();
        sections.forEach((section) => {
            const key = cleanText(section.groupKey || section.groupName, "미지정");
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(section);
        });
        return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, "ko")).map(([key, list]) => ({
            key,
            sections: list.sort(compareSection)
        }));
    }

    function compareSection(a, b) {
        const groupCompare = String(a.groupKey || "").localeCompare(String(b.groupKey || ""), "ko");
        if (groupCompare !== 0) return groupCompare;
        const ai = Number(a.groupIndex);
        const bi = Number(b.groupIndex);
        if (Number.isFinite(ai) && Number.isFinite(bi) && ai !== bi) return ai - bi;
        return String(a.sectionName || a.sectionId).localeCompare(String(b.sectionName || b.sectionId), "ko", { numeric: true });
    }

    function rebuildSectionGeometry(sectionId = "") {
        state.sections.forEach((section) => {
            if (sectionId && section.sectionId !== sectionId) return;
            const layout = state.layouts[section.sectionId] || defaultLayout(section);
            section.layoutPolygon = transformPolygon(section.originalPolygon || section.polygon, layout);
            section.layoutPolygons = normalizeArray(section.originalPolygons || [section.originalPolygon || section.polygon])
                .map((polygon) => transformPolygon(polygon, layout));
            section.layoutBbox = bboxOf(section.layoutPolygon || []);
        });
    }

    function transformPolygon(points, layout) {
        const box = layout.originalBbox || bboxOf(points || []);
        const scale = Number(layout.scale) || 1;
        const w = Math.max(1, box.w * scale);
        const h = Math.max(1, box.h * scale);
        const cx = Number(layout.layoutX || 0) + w / 2;
        const cy = Number(layout.layoutY || 0) + h / 2;
        const angle = normalizeAngle(Number(layout.angle) || 0);
        return normalizeArray(points).map((point) => {
            const local = {
                x: Number(layout.layoutX || 0) + (Number(point.x) - box.x) * scale,
                y: Number(layout.layoutY || 0) + (Number(point.y) - box.y) * scale
            };
            return copyPoint(rotatePoint(local, { x: cx, y: cy }, angle));
        });
    }

    function setupCanvas(width, height) {
        state.width = Math.max(1, Math.round(width));
        state.height = Math.max(1, Math.round(height));
        canvas.width = overlay.width = state.width;
        canvas.height = overlay.height = state.height;

        if (dom.canvasBox) {
            dom.canvasBox.style.width = `${state.width}px`;
            dom.canvasBox.style.height = `${state.height}px`;
        }
        if (dom.canvasSize) dom.canvasSize.textContent = `${state.width} × ${state.height}`;
    }

    function drawBase() {
        if (!ctx) return;
        ctx.clearRect(0, 0, state.width, state.height);
        ctx.fillStyle = COLORS.boardBg;
        ctx.fillRect(0, 0, state.width, state.height);

        ctx.save();
        ctx.strokeStyle = "rgba(219, 234, 254, 0.9)";
        ctx.lineWidth = 1;
        for (let x = 0; x < state.width; x += 20) {
            for (let y = 0; y < state.height; y += 20) {
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        ctx.restore();

        drawGroupHeaders(ctx);
    }

    function drawGroupHeaders(targetCtx) {
        const groups = groupSectionsForBoard(state.sections);
        targetCtx.save();
        targetCtx.font = "900 18px Pretendard, Arial";
        targetCtx.textAlign = "left";
        targetCtx.textBaseline = "middle";
        targetCtx.fillStyle = "#334155";
        groups.forEach((group) => {
            const ys = group.sections
                .map((section) => section.layoutBbox?.y)
                .filter((value) => Number.isFinite(value));
            const y = ys.length ? Math.min(...ys) - 24 : 30;
            targetCtx.fillText(`${group.key} 그룹`, 34, Math.max(28, y));
        });
        targetCtx.restore();
    }

    function setPart(nextPart) {
        state.activePart = nextPart;
        [1, 2, 3].forEach((part) => {
            const panel = dom[`part${part}Panel`];
            const button = dom[`part${part}Btn`] || dom[`partBtn${part}`];
            const status = dom[`part${part}Status`];
            if (!panel || !button) return;

            panel.classList.toggle("is-active", part === nextPart);
            panel.classList.toggle("is-done", isPartDone(part));
            button.classList.toggle("active", part === nextPart);
            if (status) status.textContent = part === nextPart ? "진행중" : (isPartDone(part) ? "완료" : "대기");
        });
    }

    function isPartDone(part) {
        if (part === 1) return state.sections.length > 0 && Boolean(getSelectedSection());
        if (part === 2) return countVisibleSeats() > 0;
        if (part === 3) return createFinalSeatJson().length > 0;
        return false;
    }

    function selectSection(sectionId) {
        if (!sectionId) return;
        state.selectedSectionId = sectionId;
        state.selectedSeatIds.clear();
        restoreLayoutToInputs(getSelectedSection());
        syncAll();
    }

    function getSelectedSection() {
        return state.sections.find((section) => section.sectionId === state.selectedSectionId) || null;
    }

    function getSectionSeats(section) {
        if (!section) return [];
        return state.seats.filter((seat) => seat.sectionId === section.sectionId && seat.status !== "REMOVED");
    }

    function generateSelectedSectionSeats() {
        const section = getSelectedSection();
        if (!section) {
            toast("좌석을 생성할 구역을 선택하세요.");
            return;
        }
        if (!section.sectionName) {
            toast("sectionName이 없는 구역은 좌석을 만들 수 없습니다. Stage 3에서 구역명을 확정하세요.");
            return;
        }

        const layout = readLayoutFromInputs(section);
        state.layouts[section.sectionId] = layout;
        rebuildSectionGeometry(section.sectionId);
        const generated = buildSeatsForSection(section, layout);
        state.seats = state.seats.filter((seat) => seat.sectionId !== section.sectionId).concat(generated);
        state.selectedSeatIds.clear();
        persistLocalWork();
        syncAll();
        toast(`${section.sectionName} 좌석 ${generated.length}개를 생성했습니다.`);
        setPart(3);
    }

    function inferAllSections() {
        if (!state.sections.length) {
            toast("구역 JSON이 없습니다.");
            return;
        }

        const base = readLayoutFromInputs(getSelectedSection() || state.sections[0]);
        const allSeats = [];

        state.sections.forEach((section) => {
            if (!section.sectionName) return;
            const layout = {
                ...defaultLayout(section),
                ...(state.layouts[section.sectionId] || {}),
                rows: positiveInt(base.rows, 1),
                cols: positiveInt(base.cols, 1),
                seatSize: Number(base.seatSize) || 10,
                gapX: Number(base.gapX) || 0,
                gapY: Number(base.gapY) || 0,
                rowStart: base.rowStart || "A",
                colStart: positiveInt(base.colStart, 1)
            };
            state.layouts[section.sectionId] = layout;
            rebuildSectionGeometry(section.sectionId);
            allSeats.push(...buildSeatsForSection(section, layout));
        });

        state.seats = state.seats.filter((seat) => !state.sections.some((section) => section.sectionId === seat.sectionId)).concat(allSeats);
        state.selectedSeatIds.clear();
        persistLocalWork();
        syncAll();
        toast(`전체 구역 좌석 ${allSeats.length}개를 생성했습니다.`);
        setPart(3);
    }

    function buildSeatsForSection(section, layout) {
        const polygon = section.layoutPolygon || section.polygon;
        const box = bboxOf(polygon);
        const rows = Math.max(1, positiveInt(layout.rows, 1));
        const cols = Math.max(1, positiveInt(layout.cols, 1));
        const seatSize = Math.max(2, Number(layout.seatSize) || 10);
        const gapX = Math.max(0, Number(layout.gapX) || 0);
        const gapY = Math.max(0, Number(layout.gapY) || 0);
        const angle = normalizeAngle(Number(layout.seatAngle ?? 0) || 0);
        const rowOffset = rowNameToIndex(layout.rowStart || "A");
        const colStart = Math.max(1, positiveInt(layout.colStart, 1));

        const gridW = cols * seatSize + Math.max(0, cols - 1) * gapX;
        const gridH = rows * seatSize + Math.max(0, rows - 1) * gapY;
        const startX = box.x + (box.w - gridW) / 2;
        const startY = box.y + (box.h - gridH) / 2;
        const seats = [];

        for (let r = 0; r < rows; r += 1) {
            for (let c = 0; c < cols; c += 1) {
                const center = {
                    x: startX + c * (seatSize + gapX) + seatSize / 2,
                    y: startY + r * (seatSize + gapY) + seatSize / 2
                };
                if (!seatInsidePolygon(center, seatSize, angle, polygon)) continue;
                const row = indexToRowName(rowOffset + r);
                const col = colStart + c;
                seats.push(makeSeat(section, row, col, center, seatSize, angle));
            }
        }

        const bounds = getSeatBounds(seats);
        state.layouts[section.sectionId] = {
            ...layout,
            seatCount: seats.length,
            actualBounds: bounds,
            buttonPolygon: bounds ? rectToPolygon(expandRect(bounds, Math.max(6, seatSize))) : (section.layoutPolygon || section.polygon)
        };
        return seats;
    }

    function makeSeat(section, row, col, center, size, angle) {
        const floor = section.floor || "1";
        const sectionName = section.sectionName || section.name || section.section || "";
        const grade = section.grade || "일반석";
        const status = STATUS_AVAILABLE;
        const id = buildSeatId(floor, sectionName, row, col, grade, status);
        return {
            id,
            sectionId: section.sectionId,
            sectionName,
            section: sectionName,
            groupKey: section.groupKey || "",
            groupIndex: section.groupIndex ?? null,
            floor,
            grade,
            price: Number(section.price) || 0,
            row: String(row),
            col: Number(col),
            status,
            x: round(center.x),
            y: round(center.y),
            size: round(size),
            angle: round(normalizeAngle(angle))
        };
    }

    function clearSelectedSectionSeats() {
        const section = getSelectedSection();
        if (!section) {
            toast("구역을 선택하세요.");
            return;
        }
        state.seats = state.seats.filter((seat) => seat.sectionId !== section.sectionId);
        state.selectedSeatIds.clear();
        delete state.layouts[section.sectionId]?.actualBounds;
        delete state.layouts[section.sectionId]?.buttonPolygon;
        persistLocalWork();
        syncAll();
        toast(`${section.sectionName} 좌석을 비웠습니다.`);
    }

    function toggleManualAddMode() {
        state.tool = state.tool === "add-seat" ? "select" : "add-seat";
        syncToolState();
        toast(state.tool === "add-seat" ? "수동 추가 모드: 선택 구역 내부를 클릭하세요." : "선택 모드로 전환했습니다.");
    }

    function addManualSeat(point) {
        const section = getSelectedSection();
        if (!section) {
            toast("먼저 구역을 선택하세요.");
            return;
        }
        const polygon = section.layoutPolygon || section.polygon;
        if (!isInsideOrEdge(point, polygon)) {
            toast("선택 구역 내부에만 좌석을 추가할 수 있습니다.");
            return;
        }
        const size = Math.max(2, Number(dom.seatSizeInput?.value) || 10);
        const angle = 0;
        const row = cleanText(dom.manualRowInput?.value, "A").toUpperCase();
        let col = Math.max(1, positiveInt(dom.manualColInput?.value, 1));
        const used = new Set(getSectionSeats(section).filter((seat) => String(seat.row).toUpperCase() === row).map((seat) => Number(seat.col)));
        while (used.has(col)) col += 1;
        const seat = makeSeat(section, row, col, point, size, angle);
        state.seats.push(seat);
        if (dom.manualColInput) dom.manualColInput.value = col + 1;
        updateLayoutActualBounds(section);
        persistLocalWork();
        syncAll();
    }

    function deleteSelectedSeats() {
        if (!state.selectedSeatIds.size) {
            toast("삭제할 좌석을 선택하세요.");
            return;
        }
        const affected = new Set();
        state.seats = state.seats.filter((seat) => {
            const remove = state.selectedSeatIds.has(seat.id);
            if (remove) affected.add(seat.sectionId);
            return !remove;
        });
        state.selectedSeatIds.clear();
        affected.forEach((id) => updateLayoutActualBounds(findSectionById(id)));
        persistLocalWork();
        syncAll();
        toast("선택 좌석을 삭제했습니다.");
    }

    function handlePointerDown(event) {
        const point = canvasPoint(event);
        if (!point) return;

        if (state.tool === "add-seat") {
            addManualSeat(point);
            return;
        }

        const rotateHit = findRotateHandleAt(point);
        if (rotateHit) {
            beginRotateSection(rotateHit, point, event);
            return;
        }

        const resizeHit = findResizeHandleAt(point);
        if (resizeHit) {
            beginResizeSeats(resizeHit, point, event);
            return;
        }

        const hitSeat = findSeatAt(point);
        if (hitSeat) {
            if (!event.shiftKey) state.selectedSeatIds.clear();
            if (state.selectedSeatIds.has(hitSeat.id)) state.selectedSeatIds.delete(hitSeat.id);
            else state.selectedSeatIds.add(hitSeat.id);
            selectSection(hitSeat.sectionId);
            return;
        }

        const hitSection = findSectionAt(point);
        if (hitSection) {
            const layout = state.layouts[hitSection.sectionId] || defaultLayout(hitSection);
            state.drag = {
                type: "section",
                sectionId: hitSection.sectionId,
                start: point,
                layoutX: Number(layout.layoutX || 0),
                layoutY: Number(layout.layoutY || 0)
            };
            selectSection(hitSection.sectionId);
            overlay.setPointerCapture?.(event.pointerId);
        } else {
            state.selectedSeatIds.clear();
            syncAll();
        }
    }

    function handlePointerMove(event) {
        const point = canvasPoint(event);
        if (!point) return;

        if (state.drag?.type === "rotate-section") {
            updateRotateDrag(point);
            return;
        }

        if (state.drag?.type === "resize-seats") {
            updateResizeDrag(point);
            return;
        }

        if (state.drag?.type === "section") {
            const section = findSectionById(state.drag.sectionId);
            const layout = state.layouts[state.drag.sectionId];
            if (!section || !layout) return;
            const dx = point.x - state.drag.start.x;
            const dy = point.y - state.drag.start.y;
            layout.layoutX = round(state.drag.layoutX + dx);
            layout.layoutY = round(state.drag.layoutY + dy);
            rebuildSectionGeometry(section.sectionId);
            moveSectionSeats(section.sectionId, dx, dy, true);
            drawBase();
            drawOverlay();
            return;
        }

        const hit = findSeatAt(point);
        state.hoverSeatId = hit?.id || "";
        drawOverlay();
    }

    function handlePointerUp(event) {
        if (state.drag?.type === "section") {
            const section = findSectionById(state.drag.sectionId);
            const dx = (state.layouts[state.drag.sectionId]?.layoutX || 0) - state.drag.layoutX;
            const dy = (state.layouts[state.drag.sectionId]?.layoutY || 0) - state.drag.layoutY;
            moveSectionSeats(state.drag.sectionId, dx, dy, false);
            if (section) updateLayoutActualBounds(section);
            persistLocalWork();
            restoreLayoutToInputs(section);
            syncAll();
        } else if (state.drag?.type === "rotate-section" || state.drag?.type === "resize-seats") {
            const section = findSectionById(state.drag.sectionId);
            if (section) updateLayoutActualBounds(section);
            persistLocalWork();
            restoreLayoutToInputs(section);
            syncAll();
        }
        state.drag = null;
        overlay.releasePointerCapture?.(event.pointerId);
    }

    function moveSectionSeats(sectionId, dx, dy, previewOnly) {
        if (previewOnly) {
            // 기존 좌석은 최종 pointerup에서 한 번만 실제 좌표를 이동한다.
            return;
        }
        state.seats.forEach((seat) => {
            if (seat.sectionId !== sectionId) return;
            seat.x = round(Number(seat.x) + dx);
            seat.y = round(Number(seat.y) + dy);
        });
    }


    function rotateSelectedSection(delta) {
        const section = getSelectedSection();
        if (!section) {
            toast("회전할 구역을 선택하세요.");
            return;
        }
        const layout = state.layouts[section.sectionId] || defaultLayout(section);
        const nextAngle = normalizeAngle((Number(layout.angle) || 0) + delta);
        applySectionAngle(section, nextAngle, true);
        toast(`${section.sectionName} 회전 ${nextAngle}°`);
    }

    function applySectionAngle(section, nextAngle, rotateSeats) {
        const layout = state.layouts[section.sectionId] || defaultLayout(section);
        const previousAngle = normalizeAngle(Number(layout.angle) || 0);
        layout.angle = normalizeAngle(nextAngle);
        state.layouts[section.sectionId] = layout;
        rebuildSectionGeometry(section.sectionId);

        if (rotateSeats) {
            const center = getLayoutCenter(section, layout);
            rotateSeatsAround(section.sectionId, center, layout.angle - previousAngle);
        }
        updateLayoutActualBounds(section);
        setValue(dom.angleInput, layout.angle);
        persistLocalWork();
        syncAll();
    }

    function rotateSeatsAround(sectionId, center, deltaAngle) {
        if (!deltaAngle) return;
        state.seats.forEach((seat) => {
            if (seat.sectionId !== sectionId || seat.status === "REMOVED") return;
            const rotated = rotatePoint({ x: Number(seat.x), y: Number(seat.y) }, center, deltaAngle);
            seat.x = round(rotated.x);
            seat.y = round(rotated.y);
            seat.angle = round(normalizeAngle((Number(seat.angle) || 0) + deltaAngle));
        });
    }

    function beginRotateSection(section, point, event) {
        const layout = state.layouts[section.sectionId] || defaultLayout(section);
        const center = getLayoutCenter(section, layout);
        state.drag = {
            type: "rotate-section",
            sectionId: section.sectionId,
            center,
            startAngle: angleBetween(center, point),
            layoutAngle: normalizeAngle(Number(layout.angle) || 0),
            originalSeats: getSectionSeats(section).map(copySeat)
        };
        selectSection(section.sectionId);
        overlay.setPointerCapture?.(event.pointerId);
    }

    function updateRotateDrag(point) {
        const drag = state.drag;
        const section = findSectionById(drag.sectionId);
        if (!section) return;
        const layout = state.layouts[section.sectionId] || defaultLayout(section);
        const delta = angleBetween(drag.center, point) - drag.startAngle;
        layout.angle = normalizeAngle(drag.layoutAngle + delta);
        state.layouts[section.sectionId] = layout;
        rebuildSectionGeometry(section.sectionId);

        const byId = new Map(drag.originalSeats.map((seat) => [seat.id, seat]));
        state.seats.forEach((seat) => {
            const original = byId.get(seat.id);
            if (!original) return;
            const rotated = rotatePoint({ x: original.x, y: original.y }, drag.center, layout.angle - drag.layoutAngle);
            seat.x = round(rotated.x);
            seat.y = round(rotated.y);
            seat.angle = round(normalizeAngle((Number(original.angle) || 0) + layout.angle - drag.layoutAngle));
        });

        updateLayoutActualBounds(section);
        setValue(dom.angleInput, layout.angle);
        drawBase();
        drawOverlay();
    }

    function beginResizeSeats(section, point, event) {
        const seats = getSectionSeats(section);
        if (!seats.length) {
            toast("먼저 좌석을 추정하세요.");
            return;
        }
        const bounds = getSeatBounds(seats);
        const center = rectCenter(bounds);
        state.drag = {
            type: "resize-seats",
            sectionId: section.sectionId,
            center,
            startDistance: Math.max(1, distance(center, point)),
            originalSeats: seats.map(copySeat),
            originalLayout: { ...(state.layouts[section.sectionId] || defaultLayout(section)) }
        };
        selectSection(section.sectionId);
        overlay.setPointerCapture?.(event.pointerId);
    }

    function updateResizeDrag(point) {
        const drag = state.drag;
        const section = findSectionById(drag.sectionId);
        if (!section) return;
        const scale = clamp(distance(drag.center, point) / drag.startDistance, 0.25, 4);
        const byId = new Map(drag.originalSeats.map((seat) => [seat.id, seat]));
        state.seats.forEach((seat) => {
            const original = byId.get(seat.id);
            if (!original) return;
            seat.x = round(drag.center.x + (Number(original.x) - drag.center.x) * scale);
            seat.y = round(drag.center.y + (Number(original.y) - drag.center.y) * scale);
            seat.size = round(Math.max(2, Number(original.size || 10) * scale));
        });
        const layout = state.layouts[section.sectionId] || defaultLayout(section);
        layout.seatSize = round(Math.max(2, Number(drag.originalLayout.seatSize || 10) * scale));
        layout.gapX = round(Math.max(0, Number(drag.originalLayout.gapX || 0) * scale));
        layout.gapY = round(Math.max(0, Number(drag.originalLayout.gapY || 0) * scale));
        state.layouts[section.sectionId] = layout;
        updateLayoutActualBounds(section);
        setValue(dom.seatSizeInput, layout.seatSize);
        setValue(dom.gapXInput, layout.gapX);
        setValue(dom.gapYInput, layout.gapY);
        drawBase();
        drawOverlay();
    }

    function tightenSelectedBounds() {
        const section = getSelectedSection();
        if (!section) {
            toast("실제 구역 크기를 정리할 구역을 선택하세요.");
            return;
        }
        updateLayoutActualBounds(section);
        persistLocalWork();
        syncAll();
        toast(`${section.sectionName} 실제 구역 크기를 좌석 기준으로 재정리했습니다.`);
    }

    function findRotateHandleAt(point) {
        const section = getSelectedSection();
        const handle = section ? getRotateHandle(section) : null;
        return handle && distance(point, handle) <= 12 ? section : null;
    }

    function findResizeHandleAt(point) {
        const section = getSelectedSection();
        const handle = section ? getResizeHandle(section) : null;
        return handle && distance(point, handle) <= 12 ? section : null;
    }

    function getRotateHandle(section) {
        const box = section.layoutBbox || bboxOf(section.layoutPolygon || section.polygon || []);
        if (!box || !Number.isFinite(box.x)) return null;
        return { x: round(box.x + box.w / 2), y: round(box.y - 28) };
    }

    function getResizeHandle(section) {
        const seats = getSectionSeats(section);
        const bounds = getSeatBounds(seats) || normalizeRect(state.layouts[section.sectionId]?.actualBounds);
        if (!bounds) return null;
        return { x: round(bounds.x + bounds.w + Math.max(8, Number(state.layouts[section.sectionId]?.seatSize || 10))), y: round(bounds.y + bounds.h + Math.max(8, Number(state.layouts[section.sectionId]?.seatSize || 10))) };
    }

    function getLayoutCenter(section, layout) {
        const box = section.layoutBbox || bboxOf(section.layoutPolygon || section.polygon || []);
        if (box && (box.w || box.h)) return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
        return { x: Number(layout.layoutX || 0) + Number(layout.width || 0) / 2, y: Number(layout.layoutY || 0) + Number(layout.height || 0) / 2 };
    }

    function angleBetween(center, point) {
        return Math.atan2(point.y - center.y, point.x - center.x) * 180 / Math.PI;
    }

    function rectCenter(rect) {
        return { x: Number(rect.x) + Number(rect.w) / 2, y: Number(rect.y) + Number(rect.h) / 2 };
    }

    function copySeat(seat) {
        return { ...seat, x: Number(seat.x), y: Number(seat.y), size: Number(seat.size), angle: Number(seat.angle) || 0 };
    }

    function distance(a, b) {
        return Math.hypot(Number(a.x || 0) - Number(b.x || 0), Number(a.y || 0) - Number(b.y || 0));
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, Number(value) || 0));
    }

    function findSeatAt(point) {
        for (let i = state.seats.length - 1; i >= 0; i -= 1) {
            const seat = state.seats[i];
            if (seat.status === "REMOVED") continue;
            const size = Math.max(3, Number(seat.size) || 10);
            if (pointInRotatedRect(point, seat.x, seat.y, size + 4, size + 4, seat.angle || 0)) return seat;
        }
        return null;
    }

    function findSectionAt(point) {
        for (let i = state.sections.length - 1; i >= 0; i -= 1) {
            const section = state.sections[i];
            if (isInsideOrEdge(point, section.layoutPolygon || section.polygon)) return section;
        }
        return null;
    }

    function syncAll() {
        syncToolState();
        syncGroupFilter();
        syncSectionSelect();
        syncSectionList();
        syncInfo();
        syncJsonPreview();
        drawBase();
        drawOverlay();
        setPart(state.activePart);
    }

    function syncToolState() {
        if (dom.manualAddBtn) {
            dom.manualAddBtn.classList.toggle("is-active", state.tool === "add-seat");
            dom.manualAddBtn.textContent = state.tool === "add-seat" ? "수동 추가 모드 종료" : "수동 좌석 추가 모드";
        }
        if (dom.canvasBox) dom.canvasBox.classList.toggle("is-add-mode", state.tool === "add-seat");
    }

    function syncGroupFilter() {
        if (!dom.groupFilter) return;
        const selected = dom.groupFilter.value || "__all";
        const groups = unique(state.sections.map((section) => section.groupKey || "미지정"));
        const options = [`<option value="__all">전체 그룹</option>`]
            .concat(groups.map((group) => `<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`));
        dom.groupFilter.innerHTML = options.join("");
        dom.groupFilter.value = groups.includes(selected) ? selected : "__all";
    }

    function syncSectionSelect() {
        if (!dom.sectionSelect) return;
        dom.sectionSelect.innerHTML = state.sections.map((section) => {
            const count = getSectionSeats(section).length;
            return `<option value="${escapeHtml(section.sectionId)}">${escapeHtml(section.sectionName || section.sectionId)} (${count})</option>`;
        }).join("");
        if (state.selectedSectionId) dom.sectionSelect.value = state.selectedSectionId;
    }

    function syncSectionList() {
        if (!dom.sectionList) return;
        const group = dom.groupFilter?.value || "__all";
        const keyword = (dom.sectionSearch?.value || "").trim().toLowerCase();
        const filtered = state.sections.filter((section) => {
            const groupOk = group === "__all" || (section.groupKey || "미지정") === group;
            const name = `${section.sectionName} ${section.sectionId} ${section.groupKey}`.toLowerCase();
            return groupOk && (!keyword || name.includes(keyword));
        });

        if (!filtered.length) {
            dom.sectionList.innerHTML = `<div class="help-text">표시할 구역이 없습니다.</div>`;
            return;
        }

        dom.sectionList.innerHTML = filtered.sort(compareSection).map((section) => {
            const active = section.sectionId === state.selectedSectionId ? " active" : "";
            const count = getSectionSeats(section).length;
            const color = section.renderColor || section.color || "#d9d9d9";
            return `
                <button type="button" class="section-item${active}" data-section-id="${escapeHtml(section.sectionId)}">
                    <i class="section-item__color" style="background:${escapeHtml(color)}"></i>
                    <span class="section-item__meta">
                        <strong>${escapeHtml(section.sectionName || "이름 없음")}</strong>
                        <span>${escapeHtml(section.sectionId)} · ${escapeHtml(section.floor || "1")}층 · ${escapeHtml(section.grade || "일반석")}</span>
                    </span>
                    <em class="section-item__count">${count}</em>
                </button>`;
        }).join("");

        dom.sectionList.querySelectorAll("[data-section-id]").forEach((button) => {
            button.addEventListener("click", () => selectSection(button.dataset.sectionId));
        });
    }

    function syncInfo() {
        const section = getSelectedSection();
        const sectionSeats = getSectionSeats(section);
        const finalSeats = createFinalSeatJson();
        const layout = section ? state.layouts[section.sectionId] : null;
        const actual = layout?.actualBounds;

        if (dom.selectedSectionName) {
            dom.selectedSectionName.textContent = section
                ? `${section.sectionName || "이름 없음"} / ${section.floor || "1"}층 / ${section.grade || "일반석"} / 실제 ${actual ? `${round(actual.w)}×${round(actual.h)}` : "미확정"}`
                : "구역을 선택하세요.";
        }
        setText(dom.infoSection, section?.sectionName || "-");
        setText(dom.infoSectionId, section?.sectionId || "-");
        setText(dom.infoFloorGrade, section ? `${section.floor || "1"}층 / ${section.grade || "일반석"}` : "-");
        setText(dom.infoPrice, section ? formatPrice(section.price) : "-");
        setText(dom.infoSectionSeats, String(sectionSeats.length));
        setText(dom.infoSelectedSeats, String(state.selectedSeatIds.size));
        setText(dom.totalSections, String(state.sections.length));
        setText(dom.totalSeats, String(finalSeats.length));
        setText(dom.saveSummary, `저장할 좌석 ID ${finalSeats.length}개 · 실제 구역 확정 ${createSeatLayoutsJson().filter((item) => item.seatCount > 0).length}개`);
    }

    function syncJsonPreview() {
        if (!dom.jsonPreview) return;
        const finalSeats = createFinalSeatJson();
        dom.jsonPreview.textContent = JSON.stringify(finalSeats.slice(0, 10), null, 2) + (finalSeats.length > 10 ? "\n..." : "");
    }

    function setText(element, value) {
        if (element) element.textContent = value;
    }

    function drawOverlay(targetCtx = overlayCtx, options = {}) {
        if (!targetCtx || !state.width || !state.height) return;
        if (!options.noClear) targetCtx.clearRect(0, 0, state.width, state.height);

        state.sections.forEach((section) => drawSection(targetCtx, section, section.sectionId === state.selectedSectionId, options));
        drawButtonBounds(targetCtx);
        state.seats.forEach((seat) => drawSeat(targetCtx, seat, options));
        drawEditHandles(targetCtx, options);
    }

    function drawSection(targetCtx, section, selected, options = {}) {
        const poly = section.layoutPolygon || section.polygon;
        if (!poly || poly.length < 3) return;

        targetCtx.save();
        targetCtx.beginPath();
        drawPolyPath(targetCtx, poly);
        targetCtx.closePath();
        targetCtx.fillStyle = selected ? COLORS.sectionFill : hexToRgba(section.renderColor || section.color || "#94a3b8", 0.18);
        targetCtx.fill();
        targetCtx.lineWidth = selected ? 2.8 : 1.4;
        targetCtx.setLineDash(selected ? [8, 4] : []);
        targetCtx.strokeStyle = selected ? COLORS.sectionStroke : (section.renderColor || section.color || COLORS.sectionIdleStroke);
        targetCtx.stroke();
        targetCtx.setLineDash([]);

        if (!options.skipLabels) {
            const center = polygonCenter(poly);
            targetCtx.font = selected ? "900 15px Pretendard, Arial" : "800 12px Pretendard, Arial";
            targetCtx.textAlign = "center";
            targetCtx.textBaseline = "middle";
            targetCtx.lineWidth = 4;
            targetCtx.strokeStyle = "rgba(255,255,255,0.9)";
            targetCtx.fillStyle = COLORS.label;
            const label = section.sectionName || section.sectionId;
            targetCtx.strokeText(label, center.x, center.y);
            targetCtx.fillText(label, center.x, center.y);
        }
        targetCtx.restore();
    }

    function drawButtonBounds(targetCtx) {
        targetCtx.save();
        state.sections.forEach((section) => {
            const layout = state.layouts[section.sectionId];
            const polygon = normalizePolygon(layout?.buttonPolygon);
            if (!polygon) return;
            targetCtx.beginPath();
            drawPolyPath(targetCtx, polygon);
            targetCtx.closePath();
            targetCtx.fillStyle = COLORS.button;
            targetCtx.strokeStyle = "#ef4444";
            targetCtx.setLineDash([5, 4]);
            targetCtx.lineWidth = 1.6;
            targetCtx.fill();
            targetCtx.stroke();
        });
        targetCtx.restore();
    }


    function drawEditHandles(targetCtx, options = {}) {
        if (options.skipHandles) return;
        const section = getSelectedSection();
        if (!section) return;
        const layout = state.layouts[section.sectionId] || defaultLayout(section);
        const box = section.layoutBbox || bboxOf(section.layoutPolygon || section.polygon || []);
        const rotate = getRotateHandle(section);

        targetCtx.save();
        if (rotate) {
            targetCtx.beginPath();
            targetCtx.moveTo(box.x + box.w / 2, box.y);
            targetCtx.lineTo(rotate.x, rotate.y);
            targetCtx.strokeStyle = "rgba(124,58,237,0.72)";
            targetCtx.lineWidth = 1.6;
            targetCtx.stroke();

            targetCtx.beginPath();
            targetCtx.arc(rotate.x, rotate.y, 8, 0, Math.PI * 2);
            targetCtx.fillStyle = "#ffffff";
            targetCtx.strokeStyle = "#7c3aed";
            targetCtx.lineWidth = 2.4;
            targetCtx.fill();
            targetCtx.stroke();
            targetCtx.font = "900 12px Arial";
            targetCtx.textAlign = "center";
            targetCtx.textBaseline = "middle";
            targetCtx.fillStyle = "#7c3aed";
            targetCtx.fillText("↻", rotate.x, rotate.y + 0.5);
        }

        const resize = getResizeHandle(section);
        if (resize && getSectionSeats(section).length) {
            targetCtx.fillStyle = "#ffffff";
            targetCtx.strokeStyle = "#ef4444";
            targetCtx.lineWidth = 2.2;
            targetCtx.fillRect(resize.x - 6, resize.y - 6, 12, 12);
            targetCtx.strokeRect(resize.x - 6, resize.y - 6, 12, 12);
            targetCtx.font = "900 10px Arial";
            targetCtx.textAlign = "center";
            targetCtx.textBaseline = "middle";
            targetCtx.fillStyle = "#ef4444";
            targetCtx.fillText("↘", resize.x, resize.y + 0.5);
        }
        targetCtx.restore();
    }

    function drawSeat(targetCtx, seat, options = {}) {
        if (seat.status === "REMOVED") return;
        const selected = state.selectedSeatIds.has(seat.id);
        const hover = state.hoverSeatId === seat.id && !options.skipHover;
        const size = Number(seat.size) || 10;
        const angle = Number(seat.angle) || 0;

        targetCtx.save();
        targetCtx.translate(seat.x, seat.y);
        targetCtx.rotate(degToRad(angle));
        targetCtx.beginPath();
        targetCtx.rect(-size / 2, -size / 2, size, size);
        targetCtx.fillStyle = selected ? COLORS.seatSelected : (hover ? COLORS.seatHover : COLORS.seat);
        targetCtx.strokeStyle = COLORS.seatStroke;
        targetCtx.lineWidth = selected || hover ? 2 : 1;
        targetCtx.fill();
        targetCtx.stroke();
        targetCtx.restore();
    }

    function drawPolyPath(targetCtx, poly) {
        poly.forEach((point, index) => {
            if (index === 0) targetCtx.moveTo(point.x, point.y);
            else targetCtx.lineTo(point.x, point.y);
        });
    }

    function createFinalSeatJson() {
        const finalSeats = [];
        const seen = new Set();
        state.seats.forEach((seat) => {
            if (seat.status === "REMOVED") return;
            const section = findSectionForSeat(seat);
            const normalized = normalizeSeatForSave(seat, section);
            if (!normalized || seen.has(normalized.id)) return;
            seen.add(normalized.id);
            finalSeats.push(normalized);
        });
        finalSeats.sort(compareSeatIdOnly);
        return finalSeats;
    }

    function compareSeatIdOnly(a, b) {
        const ap = parseSeatId(a.id);
        const bp = parseSeatId(b.id);
        const sectionCompare = String(ap.section).localeCompare(String(bp.section), "ko", { numeric: true });
        if (sectionCompare !== 0) return sectionCompare;
        const rowCompare = rowNameToIndex(ap.row) - rowNameToIndex(bp.row);
        if (rowCompare !== 0) return rowCompare;
        return Number(ap.col || 0) - Number(bp.col || 0);
    }

    function normalizeSeatForSave(seat, section) {
        const source = section || findSectionForSeat(seat);
        const sectionName = seat.sectionName || seat.section || source?.sectionName || "";
        if (!sectionName) return null;
        const floor = String(seat.floor || source?.floor || "1");
        const grade = String(seat.grade || source?.grade || "일반석");
        const status = String(seat.status || STATUS_AVAILABLE).toUpperCase();
        const row = String(seat.row || "A");
        const col = Number(seat.col || 1);
        const id = buildSeatId(floor, sectionName, row, col, grade, status);
        return { id };
    }

    function createSeatLayoutsJson() {
        return state.sections.map((section) => {
            const layout = state.layouts[section.sectionId] || defaultLayout(section);
            const seats = getSectionSeats(section);
            const actualBounds = getSeatBounds(seats);
            const buttonPolygon = normalizePolygon(layout.buttonPolygon)
                || (actualBounds ? rectToPolygon(expandRect(actualBounds, Math.max(6, Number(layout.seatSize) || 10))) : (section.layoutPolygon || []));
            return {
                sectionId: section.sectionId,
                sectionName: section.sectionName,
                section: section.sectionName,
                groupKey: section.groupKey,
                groupIndex: section.groupIndex,
                floor: section.floor,
                grade: section.grade,
                price: Number(section.price) || 0,
                layoutX: round(layout.layoutX),
                layoutY: round(layout.layoutY),
                width: round(layout.width || 0),
                height: round(layout.height || 0),
                scale: round(layout.scale || 1, 4),
                angle: round(normalizeAngle(layout.angle || 0)),
                rowCount: positiveInt(layout.rows, 0),
                colCount: positiveInt(layout.cols, 0),
                seatSize: round(layout.seatSize || 10),
                gapX: round(layout.gapX || 0),
                gapY: round(layout.gapY || 0),
                rowStart: layout.rowStart || "A",
                colStart: positiveInt(layout.colStart, 1),
                seatCount: seats.length,
                polygon: (section.layoutPolygon || []).map(copyPoint),
                originalPolygon: (section.originalPolygon || section.polygon || []).map(copyPoint),
                actualBounds: actualBounds ? copyRect(actualBounds) : null,
                buttonPolygon: (buttonPolygon || []).map(copyPoint),
                labelPoint: polygonCenter(buttonPolygon || section.layoutPolygon || section.polygon || [])
            };
        });
    }

    function createDecorationsJson() {
        const seatLayouts = createSeatLayoutsJson();
        return {
            texts: [],
            shapes: [],
            manualSeats: [],
            seatLayouts,
            stage4SeatLayouts: seatLayouts,
            stage4DetailedSeats: state.seats
                .filter((seat) => seat.status !== "REMOVED")
                .map((seat) => ({ ...seat, id: buildSeatId(seat.floor, seat.sectionName, seat.row, seat.col, seat.grade, seat.status) })),
            stage4SavedAt: new Date().toISOString()
        };
    }

    async function saveSeatsToServer(options = {}) {
        const finalSeats = createFinalSeatJson();
        const invalidSections = state.sections.filter((section) => !section.sectionName);
        if (invalidSections.length) {
            const message = "sectionName이 없는 구역이 있습니다. Stage 3에서 구역명을 먼저 확정하세요.";
            toast(message);
            if (!options.source) alert(message);
            throw new Error(message);
        }
        if (!finalSeats.length) {
            const message = "저장할 좌석이 없습니다.";
            toast(message);
            if (!options.source) alert(message);
            throw new Error(message);
        }

        persistLocalWork();
        const decorations = createDecorationsJson();
        const payload = {
            page: "stage4",
            folderName: state.projectId,
            seatJsonText: JSON.stringify(finalSeats, null, 2),
            sectionJsonText: "",
            bookingButtonJsonText: "",
            decorationJsonText: JSON.stringify(decorations, null, 2),
            imageDataUrl: exportDebugImageDataUrl()
        };

        const button = options.source === "header" ? null : dom.saveSeatsBtn;
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
                throw new Error(text || "좌석 JSON 저장 실패");
            }
            const result = await response.json();
            localStorage.setItem(STORAGE.seatsUrl, result.seatJsonUrl || state.seatsUrl);
            writeJson(STORAGE.decorations, decorations);
            toast(`좌석 ID ${finalSeats.length}개 저장 완료`);
            return result;
        } catch (error) {
            console.error(error);
            toast("저장 실패: " + error.message);
            if (options.source !== "header") alert("좌석 JSON 저장 실패: " + error.message);
            throw error;
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = before;
            }
        }
    }

    function exportDebugImageDataUrl() {
        try {
            const out = document.createElement("canvas");
            const outCtx = out.getContext("2d");
            out.width = state.width;
            out.height = state.height;
            outCtx.fillStyle = "#ffffff";
            outCtx.fillRect(0, 0, state.width, state.height);
            drawGroupHeaders(outCtx);
            drawOverlay(outCtx, { noClear: true, skipHover: true, skipHandles: true });
            return out.toDataURL("image/png");
        } catch (error) {
            console.warn("[SeatTrace Stage4] debug image export failed", error);
            return "";
        }
    }

    function goStage5() {
        saveSeatsToServer().then(() => {
            window.location.href = state.stage5Url || `/admin/seatmap/stage/5?projectId=${encodeURIComponent(state.projectId)}`;
        }).catch(() => {});
    }

    function persistLocalWork() {
        writeJson(STORAGE.seats, state.seats);
        writeJson(STORAGE.finalSeats, createFinalSeatJson());
        writeJson(STORAGE.layouts, state.layouts);
        writeJson(STORAGE.decorations, createDecorationsJson());
    }

    function rememberCurrentLayoutFromInputs(regenerateGeometry) {
        const section = getSelectedSection();
        if (!section) return;
        state.layouts[section.sectionId] = readLayoutFromInputs(section);
        if (regenerateGeometry) {
            rebuildSectionGeometry(section.sectionId);
            updateLayoutActualBounds(section);
            persistLocalWork();
            syncAll();
        }
    }

    function readLayoutFromInputs(section) {
        const current = state.layouts[section?.sectionId || ""] || defaultLayout(section);
        const rows = positiveInt(dom.rowsInput?.value, current.rows || 1);
        const cols = positiveInt(dom.colsInput?.value, current.cols || 1);
        const seatSize = Math.max(2, Number(dom.seatSizeInput?.value) || current.seatSize || 10);
        const gapX = Math.max(0, Number(dom.gapXInput?.value) || current.gapX || 0);
        const gapY = Math.max(0, Number(dom.gapYInput?.value) || current.gapY || 0);
        const angle = normalizeAngle(Number(dom.angleInput?.value ?? current.angle) || 0);
        const box = current.originalBbox || getOriginalBbox(section);
        const scale = Number(current.scale) || 1;
        return {
            ...current,
            rows,
            cols,
            seatSize,
            gapX,
            gapY,
            rowStart: cleanText(dom.rowStartInput?.value, current.rowStart || "A").toUpperCase(),
            colStart: positiveInt(dom.colStartInput?.value, current.colStart || 1),
            angle,
            seatAngle: 0,
            originalBbox: box,
            width: Math.max(32, box.w * scale),
            height: Math.max(24, box.h * scale),
            scale
        };
    }

    function restoreLayoutToInputs(section) {
        if (!section) return;
        const layout = state.layouts[section.sectionId] || defaultLayout(section);
        setValue(dom.rowsInput, layout.rows);
        setValue(dom.colsInput, layout.cols);
        setValue(dom.seatSizeInput, layout.seatSize);
        setValue(dom.gapXInput, layout.gapX);
        setValue(dom.gapYInput, layout.gapY);
        setValue(dom.angleInput, layout.angle);
        setValue(dom.rowStartInput, layout.rowStart || "A");
        setValue(dom.colStartInput, layout.colStart || 1);
        setValue(dom.manualRowInput, layout.rowStart || "A");
        setValue(dom.manualColInput, nextColumnFor(section, layout.rowStart || "A"));
    }

    function setValue(element, value) {
        if (element) element.value = value;
    }

    function defaultLayout(section) {
        const box = getOriginalBbox(section);
        return {
            rows: 3,
            cols: 5,
            seatSize: 10,
            gapX: 4,
            gapY: 4,
            rowStart: "A",
            colStart: 1,
            angle: 0,
            seatAngle: 0,
            layoutX: 70,
            layoutY: 70,
            scale: 1,
            width: box.w,
            height: box.h,
            originalBbox: box
        };
    }

    function normalizeLayout(raw) {
        return {
            ...raw,
            rows: positiveInt(raw.rowCount ?? raw.rows, 3),
            cols: positiveInt(raw.colCount ?? raw.cols, 5),
            seatSize: Math.max(2, Number(raw.seatSize) || 10),
            gapX: Math.max(0, Number(raw.gapX ?? raw.gap) || 4),
            gapY: Math.max(0, Number(raw.gapY ?? raw.gap) || 4),
            rowStart: cleanText(raw.rowStart, "A").toUpperCase(),
            colStart: positiveInt(raw.colStart, 1),
            angle: normalizeAngle(Number(raw.angle) || 0),
            layoutX: Number(raw.layoutX || 0),
            layoutY: Number(raw.layoutY || 0),
            scale: Number(raw.scale) || 1,
            width: Number(raw.width || 0),
            height: Number(raw.height || 0),
            actualBounds: normalizeRect(raw.actualBounds),
            buttonPolygon: normalizePolygon(raw.buttonPolygon)
        };
    }

    function updateLayoutActualBounds(section) {
        if (!section) return;
        const layout = state.layouts[section.sectionId] || defaultLayout(section);
        const bounds = getSeatBounds(getSectionSeats(section));
        state.layouts[section.sectionId] = {
            ...layout,
            seatCount: getSectionSeats(section).length,
            actualBounds: bounds,
            buttonPolygon: bounds ? rectToPolygon(expandRect(bounds, Math.max(6, Number(layout.seatSize) || 10))) : (section.layoutPolygon || [])
        };
    }

    function getSeatBounds(seats) {
        const list = normalizeArray(seats).filter((seat) => seat.status !== "REMOVED");
        if (!list.length) return null;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        list.forEach((seat) => {
            const half = Math.max(1, Number(seat.size) || 10) / 2;
            minX = Math.min(minX, Number(seat.x) - half);
            minY = Math.min(minY, Number(seat.y) - half);
            maxX = Math.max(maxX, Number(seat.x) + half);
            maxY = Math.max(maxY, Number(seat.y) + half);
        });
        if (![minX, minY, maxX, maxY].every(Number.isFinite)) return null;
        return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }

    function expandRect(rect, padding) {
        const p = Number(padding) || 0;
        return { x: rect.x - p, y: rect.y - p, w: rect.w + p * 2, h: rect.h + p * 2 };
    }

    function rectToPolygon(rect) {
        return [
            { x: round(rect.x), y: round(rect.y) },
            { x: round(rect.x + rect.w), y: round(rect.y) },
            { x: round(rect.x + rect.w), y: round(rect.y + rect.h) },
            { x: round(rect.x), y: round(rect.y + rect.h) }
        ];
    }

    function copyRect(rect) {
        return { x: round(rect.x), y: round(rect.y), w: round(rect.w), h: round(rect.h) };
    }

    function getBoardExtent() {
        let maxX = 0;
        let maxY = 0;
        Object.values(state.layouts).forEach((layout) => {
            maxX = Math.max(maxX, Number(layout.layoutX || 0) + Number(layout.width || 0));
            maxY = Math.max(maxY, Number(layout.layoutY || 0) + Number(layout.height || 0));
        });
        return { maxX, maxY };
    }

    function normalizeSection(raw, index) {
        const sectionId = cleanText(raw?.sectionId || raw?.id, `section-${index + 1}`);
        const sectionName = cleanText(raw?.sectionName || raw?.name || raw?.section || raw?.label, "");
        const polygon = normalizePolygon(raw?.polygon)
            || normalizePolygons(raw?.polygons)[0]
            || polygonFromBbox(raw?.bbox);
        const polygons = normalizePolygons(raw?.polygons);
        const bbox = raw?.bbox && Number.isFinite(Number(raw.bbox.w ?? raw.bbox.width))
            ? normalizeBbox(raw.bbox)
            : bboxOf(polygon || []);
        return {
            ...raw,
            id: cleanText(raw?.id, sectionId),
            sectionId,
            groupKey: cleanText(raw?.groupKey || raw?.groupName, ""),
            groupName: cleanText(raw?.groupName || raw?.groupKey, ""),
            groupIndex: raw?.groupIndex ?? null,
            name: sectionName,
            section: sectionName,
            sectionName,
            label: cleanText(raw?.label, sectionName),
            floor: cleanText(raw?.floor, "1"),
            grade: cleanText(raw?.grade, "일반석"),
            price: Number(raw?.price) || 0,
            color: cleanText(raw?.color || raw?.renderColor || raw?.sourceColor, "#d9d9d9"),
            renderColor: cleanText(raw?.renderColor || raw?.color || raw?.sourceColor, "#d9d9d9"),
            sourceColor: cleanText(raw?.sourceColor || raw?.color || raw?.renderColor, "#d9d9d9"),
            originalPolygon: (polygon || []).map(copyPoint),
            originalPolygons: polygons.length ? polygons.map((poly) => poly.map(copyPoint)) : (polygon ? [polygon.map(copyPoint)] : []),
            polygon: polygon || [],
            polygons: polygons.length ? polygons : (polygon ? [polygon] : []),
            bbox
        };
    }

    function normalizeSeat(raw, index) {
        const parsed = parseSeatId(raw?.id || raw?.seatId || "");
        const section = findSectionByAny(raw?.sectionId, raw?.sectionName || raw?.section || parsed.section);
        const sectionId = cleanText(raw?.sectionId || section?.sectionId, "");
        const sectionName = cleanText(raw?.sectionName || raw?.section || parsed.section || section?.sectionName, "");
        const row = cleanText(raw?.row || raw?.seatRow || parsed.row, "A");
        const col = positiveInt(raw?.col ?? raw?.seatCol ?? raw?.no ?? parsed.col, index + 1);
        const floor = cleanText(raw?.floor || parsed.floor || section?.floor, "1");
        const grade = cleanText(raw?.grade || parsed.grade || section?.grade, "일반석");
        const status = cleanText(raw?.status || parsed.status, STATUS_AVAILABLE).toUpperCase();
        const x = Number(raw?.x);
        const y = Number(raw?.y);
        const size = Number(raw?.size || raw?.w || raw?.width || 10);
        const angle = normalizeAngle(Number(raw?.angle) || 0);
        const id = buildSeatId(floor, sectionName, row, col, grade, status);
        return {
            ...raw,
            id,
            sectionId,
            sectionName,
            section: sectionName,
            groupKey: section?.groupKey || raw?.groupKey || "",
            groupIndex: section?.groupIndex ?? raw?.groupIndex ?? null,
            floor,
            grade,
            price: Number(raw?.price ?? section?.price ?? 0) || 0,
            row,
            col,
            status,
            x,
            y,
            size,
            angle
        };
    }

    function sectionForSave(section) {
        return { ...section.raw, ...section, polygon: section.originalPolygon || section.polygon, polygons: section.originalPolygons || section.polygons };
    }

    function normalizeSeatCollection(value) {
        if (Array.isArray(value)) return value;
        if (value && typeof value === "object") {
            if (Array.isArray(value.seats)) return value.seats;
            if (Array.isArray(value.items)) return value.items;
            return Object.values(value).flatMap((item) => Array.isArray(item) ? item : []);
        }
        return [];
    }

    function normalizeArray(value) {
        if (Array.isArray(value)) return value;
        if (value && typeof value === "object") {
            if (Array.isArray(value.data)) return value.data;
            if (Array.isArray(value.items)) return value.items;
            if (Array.isArray(value.seats)) return value.seats;
        }
        return [];
    }

    function normalizePolygon(poly) {
        if (!Array.isArray(poly) || poly.length < 3) return null;
        const points = poly.map((point) => ({ x: Number(point.x), y: Number(point.y) }))
            .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
        return points.length >= 3 ? points : null;
    }

    function normalizePolygons(polygons) {
        if (!Array.isArray(polygons)) return [];
        return polygons.map(normalizePolygon).filter(Boolean);
    }

    function normalizeRect(rect) {
        if (!rect) return null;
        const x = Number(rect.x ?? rect.left);
        const y = Number(rect.y ?? rect.top);
        const w = Number(rect.w ?? rect.width);
        const h = Number(rect.h ?? rect.height);
        if (![x, y, w, h].every(Number.isFinite)) return null;
        return { x, y, w, h };
    }

    function polygonFromBbox(bbox) {
        const box = normalizeBbox(bbox);
        if (!box.w || !box.h) return null;
        return rectToPolygon(box);
    }

    function normalizeBbox(bbox) {
        return {
            x: Number(bbox?.x ?? bbox?.left) || 0,
            y: Number(bbox?.y ?? bbox?.top) || 0,
            w: Number(bbox?.w ?? bbox?.width) || 0,
            h: Number(bbox?.h ?? bbox?.height) || 0
        };
    }

    function hasUsablePolygon(section) {
        return Array.isArray(section?.polygon) && section.polygon.length >= 3;
    }

    function hasSeatPoint(seat) {
        return Number.isFinite(Number(seat?.x)) && Number.isFinite(Number(seat?.y)) && seat.sectionId && seat.sectionName;
    }

    function findSectionForSeat(seat) {
        return findSectionByAny(seat?.sectionId, seat?.sectionName || seat?.section);
    }

    function findSectionByAny(sectionId, sectionName) {
        const id = String(sectionId || "");
        const name = String(sectionName || "");
        return state.sections.find((section) => section.sectionId === id)
            || state.sections.find((section) => section.sectionName === name)
            || null;
    }

    function findSectionById(sectionId) {
        return state.sections.find((section) => section.sectionId === sectionId) || null;
    }

    function getOriginalBbox(section) {
        if (section?.bbox && Number(section.bbox.w) > 0 && Number(section.bbox.h) > 0) return normalizeBbox(section.bbox);
        return bboxOf(section?.originalPolygon || section?.polygon || []);
    }

    function bboxOf(points) {
        if (!points || !points.length) return { x: 0, y: 0, w: 0, h: 0 };
        const xs = points.map((point) => Number(point.x) || 0);
        const ys = points.map((point) => Number(point.y) || 0);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }

    function seatInsidePolygon(center, size, angle, polygon) {
        if (!isInsideOrEdge(center, polygon)) return false;
        const half = size / 2;
        const samples = [
            center,
            rotatePoint({ x: center.x - half, y: center.y - half }, center, angle),
            rotatePoint({ x: center.x + half, y: center.y - half }, center, angle),
            rotatePoint({ x: center.x + half, y: center.y + half }, center, angle),
            rotatePoint({ x: center.x - half, y: center.y + half }, center, angle)
        ];
        const insideCount = samples.filter((point) => isInsideOrEdge(point, polygon)).length;
        return insideCount >= 3;
    }

    function pointInPoly(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const a = polygon[i];
            const b = polygon[j];
            if ((a.y > point.y) !== (b.y > point.y)
                && point.x < ((b.x - a.x) * (point.y - a.y)) / ((b.y - a.y) || 1e-9) + a.x) {
                inside = !inside;
            }
        }
        return inside;
    }

    function isInsideOrEdge(point, polygon) {
        if (!polygon || polygon.length < 3) return false;
        if (pointInPoly(point, polygon)) return true;
        return distanceToPolygon(point, polygon) <= 0.75;
    }

    function distanceToPolygon(point, polygon) {
        let min = Infinity;
        for (let i = 0; i < polygon.length; i += 1) {
            const a = polygon[i];
            const b = polygon[(i + 1) % polygon.length];
            min = Math.min(min, distancePointSegment(point, a, b));
        }
        return min;
    }

    function distancePointSegment(point, a, b) {
        const vx = b.x - a.x;
        const vy = b.y - a.y;
        const wx = point.x - a.x;
        const wy = point.y - a.y;
        const len2 = vx * vx + vy * vy;
        if (!len2) return Math.hypot(point.x - a.x, point.y - a.y);
        const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2));
        const px = a.x + t * vx;
        const py = a.y + t * vy;
        return Math.hypot(point.x - px, point.y - py);
    }

    function pointInRotatedRect(point, cx, cy, w, h, angle) {
        const local = rotatePoint(point, { x: cx, y: cy }, -angle);
        return Math.abs(local.x - cx) <= w / 2 && Math.abs(local.y - cy) <= h / 2;
    }

    function rotatePoint(point, pivot, angle) {
        const rad = degToRad(angle);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const dx = point.x - pivot.x;
        const dy = point.y - pivot.y;
        return { x: pivot.x + dx * cos - dy * sin, y: pivot.y + dx * sin + dy * cos };
    }

    function polygonCenter(poly) {
        const points = normalizeArray(poly);
        if (!points.length) return { x: 0, y: 0 };
        const sum = points.reduce((acc, point) => ({ x: acc.x + Number(point.x || 0), y: acc.y + Number(point.y || 0) }), { x: 0, y: 0 });
        return { x: round(sum.x / points.length), y: round(sum.y / points.length) };
    }

    function nextColumnFor(section, row) {
        const rowKey = String(row || "A").toUpperCase();
        const cols = getSectionSeats(section)
            .filter((seat) => String(seat.row || "").toUpperCase() === rowKey)
            .map((seat) => Number(seat.col) || 0);
        return Math.max(1, ...cols) + (cols.length ? 1 : 0);
    }

    function countVisibleSeats() {
        return state.seats.filter((seat) => seat.status !== "REMOVED").length;
    }

    function rowNameToIndex(row) {
        const text = String(row || "A").trim().toUpperCase();
        if (/^\d+$/.test(text)) return Math.max(0, Number(text) - 1);
        let value = 0;
        for (let i = 0; i < text.length; i += 1) {
            const code = text.charCodeAt(i);
            if (code < 65 || code > 90) continue;
            value = value * 26 + (code - 64);
        }
        return Math.max(0, value - 1);
    }

    function indexToRowName(index) {
        let n = Math.max(0, Number(index) || 0) + 1;
        let out = "";
        while (n > 0) {
            const mod = (n - 1) % 26;
            out = String.fromCharCode(65 + mod) + out;
            n = Math.floor((n - 1) / 26);
        }
        return out || "A";
    }

    function parseSeatId(id) {
        const parts = String(id || "").split("-");
        if (parts.length < 6) return {};
        return {
            floor: parts[0],
            section: parts[1],
            row: parts[2],
            col: parts[3],
            grade: parts.slice(4, -1).join("-") || parts[4],
            status: parts[parts.length - 1]
        };
    }

    function normalizeAngle(angle) {
        let next = Number(angle) || 0;
        while (next > 180) next -= 360;
        while (next < -180) next += 360;
        return next;
    }

    function degToRad(deg) {
        return (Number(deg) || 0) * Math.PI / 180;
    }

    function round(value, precision = 2) {
        const pow = 10 ** precision;
        return Math.round((Number(value) || 0) * pow) / pow;
    }

    function positiveInt(value, fallback) {
        const number = parseInt(value, 10);
        return Number.isFinite(number) && number > 0 ? number : fallback;
    }

    function cleanText(value, fallback = "") {
        const text = String(value ?? "").trim();
        return text || fallback;
    }

    function buildSeatId(floor, sectionName, row, col, grade, status) {
        return [floor, sectionName, row, col, grade, status].map(cleanSeatPart).join("-");
    }

    function cleanSeatPart(value) {
        return String(value ?? "").trim().replace(/\s+/g, "_").replace(/-+/g, "_") || "EMPTY";
    }

    function copyPoint(point) {
        return { x: round(point.x), y: round(point.y) };
    }

    function formatPrice(price) {
        const number = Number(price) || 0;
        return number ? `${number.toLocaleString("ko-KR")}원` : "-";
    }

    function sanitizeProjectId(value) {
        return String(value || "seat").trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9가-힣._-]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "") || "seat";
    }

    function firstNonEmpty(...values) {
        return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
    }

    function candidateProjectFileUrls(fileName) {
        return unique([
            state.projectPathUrl ? `${state.projectPathUrl}/${fileName}` : "",
            ...(state.projectCandidates.length ? state.projectCandidates : [state.projectId])
                .map((projectId) => `/temp/seatmap/${encodeURIComponent(projectId)}/${fileName}`)
        ]);
    }

    function candidateSeatsFileUrls() {
        return unique((state.projectCandidates.length ? state.projectCandidates : [state.projectId])
            .map((projectId) => `/temp/seatmap/seats/${encodeURIComponent(projectId)}-seatmap-seats.json`));
    }

    function seatsFileUrl() {
        return `/temp/seatmap/seats/${encodeURIComponent(state.projectId)}-seatmap-seats.json`;
    }

    function projectFileUrl(fileName) {
        return state.projectPathUrl ? `${state.projectPathUrl}/${fileName}` : `/temp/seatmap/${encodeURIComponent(state.projectId)}/${fileName}`;
    }

    function normalizeUrlPath(value) {
        const text = String(value || "").trim();
        return text.replace(/\/+$/, "");
    }

    async function fetchJson(url) {
        const response = await fetch(noCache(url), { credentials: "same-origin", cache: "no-store" });
        if (!response.ok) throw new Error(`${response.status} ${response.statusText || "fetch failed"}`);
        return response.json();
    }

    function noCache(url) {
        if (!url) return url;
        const separator = url.includes("?") ? "&" : "?";
        return `${url}${separator}_=${Date.now()}`;
    }

    function loadImage(url) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = url;
        });
    }

    function unique(values) {
        return [...new Set(values.filter(Boolean))];
    }

    function readJson(key, fallback) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : fallback;
        } catch (error) {
            return fallback;
        }
    }

    function writeJson(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn("[SeatTrace Stage4] localStorage 저장 실패", key, error);
            return false;
        }
    }

    function hexToRgba(hex, alpha) {
        const text = String(hex || "#94a3b8").trim();
        const value = /^#[0-9a-f]{6}$/i.test(text) ? text.slice(1) : "94a3b8";
        const r = parseInt(value.slice(0, 2), 16);
        const g = parseInt(value.slice(2, 4), 16);
        const b = parseInt(value.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function toast(message) {
        const target = dom.toast || document.getElementById("toast");
        if (!target) return;
        target.textContent = message;
        target.classList.add("show");
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => target.classList.remove("show"), 2300);
    }
})();
