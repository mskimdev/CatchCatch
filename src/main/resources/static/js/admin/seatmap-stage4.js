(() => {
    "use strict";

    const SAVE_URL = "/admin/seatmap/temp-save";
    const STATUS_AVAILABLE = "AVAILABLE";
    const STATUS_CANDIDATE = "CANDIDATE";

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
        layoutsCompat: "concert_stage3_layouts",
        projectOwner: "seatmap_stage4_project_owner"
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
        legacySeatsUrl: "",
        decorationsUrl: "",
        width: 1200,
        height: 800,
        sourceImage: null,
        sourceImageUrl: "",
        sections: [],
        seats: [],
        layouts: {},
        selectedSectionId: "",
        activeGroupKey: "",
        referenceBoardMode: false,
        selectedSeatIds: new Set(),
        activePart: 1,
        tool: "select",
        hoverSeatId: "",
        hoverSectionId: "",
        zoom: 1,
        drag: null,
        seatIndexVersion: 0,
        renderVersion: 0
    };

    const dom = {};
    let canvas;
    let overlay;
    let ctx;
    let overlayCtx;
    let seatSpatialIndex = null;
    let overlayFrame = 0;
    let miniMapFrame = 0;
    let persistTimer = 0;

    document.addEventListener("DOMContentLoaded", init);
    window.addEventListener("beforeunload", () => flushPersistLocalWork(false));

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
        setupSourceBoard();

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
            exportDebugImage: exportDebugImageDataUrl,
            reset: resetStage4Data
        };
    }

    function cacheDom() {
        canvas = document.getElementById("canvas");
        overlay = document.getElementById("overlay");
        if (canvas) ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (overlay) overlayCtx = overlay.getContext("2d", { willReadFrequently: true });

        [
            "stage4App", "toast", "canvasBox", "canvasScroll", "canvasSize", "sourceLoadSummary", "groupJumpBar",
            "part1Panel", "part2Panel", "part3Panel", "part4Panel", "part5Panel",
            "partBtn1", "partBtn2", "partBtn3", "partBtn4", "partBtn5",
            "part1Status", "part2Status", "part3Status", "part4Status", "part5Status",
            "goPart2Btn", "goPart3Btn", "goPart4Btn", "goPart5Btn", "resetStage4DataBtn",
            "groupFilter", "sectionSelect", "sectionSearch", "sectionList", "rotateLeftBtn", "rotateRightBtn",
            "selectedSectionName", "rowsInput", "colsInput", "angleInput", "seatSizeInput", "gapXInput", "gapYInput",
            "rowStartInput", "colStartInput", "generateSectionBtn", "inferAllBtn", "tightenBoundsBtn", "clearSectionBtn",
            "manualRowInput", "manualColInput", "manualAddBtn", "confirmCandidateBtn", "rejectCandidateBtn", "confirmGroupCandidateBtn", "rejectGroupCandidateBtn", "deleteSeatBtn", "clearSelectionBtn",
            "alignTopBtn", "alignBottomBtn", "alignLeftBtn", "alignRightBtn", "snapFinalBtn", "polishAllBoundsBtn",
            "saveSummary", "saveSeatsBtn", "toStage5Btn", "refreshFinalPreviewBtn", "finalPreviewImg", "finalPreviewStatus", "miniImg", "miniOverlay", "miniMapBox", "miniFocusName",
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
        state.projectId = sanitizeProjectId(
            params.get("projectId")
            || root?.dataset.projectId
            || localStorage.getItem(STORAGE.folderName)
            || localStorage.getItem(STORAGE.projectId)
            || "seat"
        );
        const projectPath = root?.dataset.projectPath || `/temp/seatmap/${encodeURIComponent(state.projectId)}`;
        state.stage3Url = root?.dataset.stage3Url || `/admin/seatmap/stage/3?projectId=${encodeURIComponent(state.projectId)}`;
        state.stage5Url = root?.dataset.stage5Url || `/admin/seatmap/stage/5?projectId=${encodeURIComponent(state.projectId)}`;
        state.buttonImageUrl = root?.dataset.buttonImageUrl || `${projectPath}/button-image.png`;
        state.seatmapImageUrl = root?.dataset.seatmapImageUrl || state.buttonImageUrl;
        state.sectionsUrl = root?.dataset.sectionJsonUrl || root?.dataset.sectionsUrl || `${projectPath}/seatmap-sections.json`;
        state.seatsUrl = root?.dataset.seatsUrl || `${projectPath}/seats/index.json`;
        state.legacySeatsUrl = `/temp/seatmap/seats/${encodeURIComponent(state.projectId)}-seatmap-seats.json`;
        state.decorationsUrl = root?.dataset.decorationsUrl || `${projectPath}/seatmap-decorations.json`;

        localStorage.setItem(STORAGE.projectId, state.projectId);
        localStorage.setItem(STORAGE.folderName, state.projectId);
    }

    function bindEvents() {
        bind(dom.partBtn1, "click", () => setPart(1));
        bind(dom.partBtn2, "click", () => setPart(2));
        bind(dom.partBtn3, "click", () => setPart(3));
        bind(dom.partBtn4, "click", () => setPart(4));
        bind(dom.partBtn5, "click", () => setPart(5));
        bind(dom.goPart2Btn, "click", () => setPart(2));
        bind(dom.goPart3Btn, "click", () => setPart(3));
        bind(dom.goPart4Btn, "click", () => setPart(4));
        bind(dom.goPart5Btn, "click", () => setPart(5));
        bind(dom.resetStage4DataBtn, "click", resetStage4Data);
        bind(dom.groupJumpBar, "click", handleGroupJumpClick);

        bind(dom.groupFilter, "change", () => {
            const value = dom.groupFilter?.value || "__all";
            if (state.activePart > 1) jumpToGroup(value);
            else syncSectionList();
        });
        bind(dom.sectionSelect, "change", () => selectSection(dom.sectionSelect.value));
        bind(dom.sectionSearch, "input", syncSectionList);
        bind(dom.rotateLeftBtn, "click", () => rotateSelectedSection(-15));
        bind(dom.rotateRightBtn, "click", () => rotateSelectedSection(15));

        bind(dom.generateSectionBtn, "click", (event) => { event?.preventDefault?.(); event?.stopPropagation?.(); generateSelectedSectionSeats(); });
        bind(dom.inferAllBtn, "click", (event) => { event?.preventDefault?.(); event?.stopPropagation?.(); inferAllSections(); });
        bind(dom.tightenBoundsBtn, "click", tightenSelectedBounds);
        bind(dom.clearSectionBtn, "click", clearSelectedSectionSeats);
        bind(dom.manualAddBtn, "click", toggleManualAddMode);
        bind(dom.confirmCandidateBtn, "click", confirmSelectedCandidateSeats);
        bind(dom.rejectCandidateBtn, "click", rejectSelectedCandidateSeats);
        bind(dom.confirmGroupCandidateBtn, "click", confirmActiveGroupCandidateSeats);
        bind(dom.rejectGroupCandidateBtn, "click", rejectActiveGroupCandidateSeats);
        bind(dom.deleteSeatBtn, "click", deleteSelectedSeats);
        bind(dom.clearSelectionBtn, "click", () => {
            state.selectedSeatIds.clear();
            syncAll();
        });
        bind(dom.saveSeatsBtn, "click", () => saveSeatsToServer());
        bind(dom.refreshFinalPreviewBtn, "click", updateFinalPreview);
        bind(dom.toStage5Btn, "click", goStage5);
        bind(dom.alignTopBtn, "click", () => alignSelectedFinalSection("top"));
        bind(dom.alignBottomBtn, "click", () => alignSelectedFinalSection("bottom"));
        bind(dom.alignLeftBtn, "click", () => alignSelectedFinalSection("left"));
        bind(dom.alignRightBtn, "click", () => alignSelectedFinalSection("right"));
        bind(dom.snapFinalBtn, "click", snapSelectedFinalSectionToNearestGuides);
        bind(dom.polishAllBoundsBtn, "click", polishAllFinalButtonPolygons);

        [dom.rowsInput, dom.colsInput, dom.angleInput, dom.seatSizeInput, dom.gapXInput, dom.gapYInput, dom.rowStartInput, dom.colStartInput].forEach((input) => {
            // 1만석 이상에서는 수치 입력/blur 때마다 전체 좌석 redraw + JSON 갱신이 돌면 렉이 심하다.
            // 입력값은 layout에만 반영하고, 실제 재추정은 기존처럼 버튼 클릭 때만 실행한다.
            bind(input, "change", () => rememberCurrentLayoutFromInputs(false));
            bind(input, "input", () => rememberCurrentLayoutFromInputs(false));
        });

        bind(overlay, "pointerdown", handlePointerDown);
        bind(overlay, "pointermove", handlePointerMove);
        bind(overlay, "pointerup", handlePointerUp);
        bind(overlay, "pointercancel", handlePointerUp);
        bind(overlay, "contextmenu", (event) => event.preventDefault());
        bind(overlay, "pointerleave", () => {
            const sectionChanged = Boolean(state.hoverSectionId);
            state.hoverSeatId = "";
            state.hoverSectionId = "";
            if (!state.drag) {
                requestDrawOverlay();
                if (sectionChanged) requestRenderMiniMapOverlay();
            }
        });

        bind(dom.zoomIn, "click", () => setZoom(state.zoom + 0.1));
        bind(dom.zoomOut, "click", () => setZoom(state.zoom - 0.1));
        bind(dom.zoomReset, "click", () => setZoom(1));
        bind(dom.zoomFit, "click", fitZoom);
        bind(dom.resetView, "click", (event) => {
            event?.preventDefault?.();
            resetStage4Data();
        });
        bind(dom.zoomTool, "click", () => toast("Stage 4는 Stage 3 polygon을 펼쳐서 좌석을 넣고, 실제 좌석 범위로 버튼 기준을 확정합니다."));
    }

    function bind(element, eventName, handler) {
        if (element) element.addEventListener(eventName, handler);
    }

    async function loadBaseImage() {
        const candidates = unique([
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
                if (dom.miniImg) {
                    dom.miniImg.onload = () => renderMiniMapOverlay();
                    dom.miniImg.src = noCache(url);
                }
                return;
            } catch (error) {
                console.warn("[SeatTrace Stage4] 기준 도면 로드 실패", url, error);
            }
        }
        toast("button-image.png를 읽지 못했습니다. 펼쳐보기 작업판만 표시합니다.");
    }

    async function loadSections() {
        const candidates = unique([
            state.sectionsUrl,
            projectFileUrl("seatmap-sections.json"),
            `/temp/seatmap/${state.projectId}/seatmap-sections.json`,
            `/temp/seatmap/${encodeURIComponent(state.projectId)}/seatmap-sections.json`
        ]).filter(Boolean);

        for (const url of candidates) {
            try {
                console.info("[SeatTrace Stage4] sections load try", url);
                const response = await fetch(noCache(url), { credentials: "same-origin", cache: "no-store" });
                if (!response.ok) throw new Error(response.status + " " + response.statusText);
                const data = await response.json();
                const source = normalizeArray(data.sections || data.items || data);
                const sections = source.map(normalizeSection).filter(hasUsablePolygon);
                if (sections.length) {
                    state.sections = sections;
                    state.sectionsUrl = url;
                    writeJson(STORAGE.sections, state.sections.map(sectionForSave));
                    console.info("[SeatTrace Stage4] sections loaded", url, sections.length);
                    break;
                }
            } catch (error) {
                console.warn("[SeatTrace Stage4] sections load fail", url, error);
            }
        }

        if (!state.sections.length) {
            const local = readJson(STORAGE.sections, null)
                || readJson(STORAGE.sectionsCompat, null)
                || readJson(STORAGE.sectionsHeader, null);
            const source = normalizeArray(local);
            state.sections = source.map(normalizeSection).filter(hasUsablePolygon);
        }

        if (!state.sections.length) {
            toast("Stage 3 구역 JSON이 없습니다. seatmap-sections.json 저장을 먼저 확인하세요.");
        }
    }

    async function loadExistingWork() {
        // 서버 저장 파일을 기준으로 복원한다.
        // 좌석 상세는 seatmap-decorations.json/localStorage에 넣지 않고
        // temp/seatmap/{projectId}/seats/index.json + 구역별 JSON에서 읽는다.
        await loadDecorations();

        if (!state.seats.length) {
            await loadSectionSeatFiles();
        }

        if (isLocalWorkForCurrentProject()) {
            const layouts = readJson(STORAGE.layouts, null) || readJson(STORAGE.layoutsCompat, null);
            if (layouts && typeof layouts === "object") {
                state.layouts = { ...state.layouts, ...layouts };
            }
        } else {
            clearStage4LocalCache(false);
        }
    }

    async function loadSectionSeatFiles() {
        const candidates = unique([state.seatsUrl, projectFileUrl("seats/index.json"), state.legacySeatsUrl]).filter(Boolean);

        for (const url of candidates) {
            try {
                const indexJson = await fetchJson(url);
                const seats = await collectSeatsFromIndexOrLegacy(indexJson, url);
                const detailed = seats.map(normalizeSeat).filter(hasSeatPoint);
                if (detailed.length) {
                    state.seats = detailed;
                    state.seatsUrl = url.includes("/seats/index.json") ? url : state.seatsUrl;
                    console.info("[SeatTrace Stage4] seats loaded", url, detailed.length);
                    return;
                }
            } catch (error) {
                console.warn("[SeatTrace Stage4] seats 로드 실패", url, error);
            }
        }
    }

    async function collectSeatsFromIndexOrLegacy(json, indexUrl) {
        const direct = normalizeSeatCollection(json);
        if (direct.length) return direct;

        const files = [];
        if (json && typeof json === "object") {
            if (json.files && typeof json.files === "object") {
                Object.values(json.files).forEach((fileData) => {
                    files.push(...normalizeSeatCollection(fileData));
                });
            }
            normalizeArray(json.sections).forEach((section) => {
                if (section?.file) files.push({ __file: section.file });
            });
        }

        const result = files.filter((item) => !item.__file);
        const fileRefs = files.filter((item) => item.__file).map((item) => item.__file);
        for (const fileName of fileRefs) {
            try {
                const fileJson = await fetchJson(resolveRelativeUrl(indexUrl, fileName));
                result.push(...normalizeSeatCollection(fileJson));
            } catch (error) {
                console.warn("[SeatTrace Stage4] section seat file 로드 실패", fileName, error);
            }
        }
        return result;
    }

    function resolveRelativeUrl(baseUrl, fileName) {
        if (/^https?:\/\//i.test(fileName) || String(fileName).startsWith("/")) return fileName;
        const cleanBase = String(baseUrl || "").split("?")[0];
        return cleanBase.replace(/[^/]*$/, "") + fileName;
    }

    async function loadDecorations() {
        let data = null;
        try {
            const response = await fetch(noCache(state.decorationsUrl), { credentials: "same-origin", cache: "no-store" });
            if (response.ok) data = await response.json();
        } catch (error) {
            console.warn("[SeatTrace Stage4] seatmap-decorations.json 로드 실패", error);
        }

        if (!data && isLocalWorkForCurrentProject()) {
            data = readJson(STORAGE.decorations, null);
        }

        if (!data || typeof data !== "object") return;

        const seatLayouts = normalizeArray(data.seatLayouts || data.stage4SeatLayouts);
        seatLayouts.forEach((raw) => {
            const sectionId = cleanText(raw.sectionId, "");
            if (!sectionId) return;
            state.layouts[sectionId] = normalizeLayout(raw);
        });

        // seatmap-decorations.json은 구역 polygon/layout 전용이다.
        // 좌석 상세는 seats/index.json + 구역별 JSON에서 복구한다.
    }

    function setupSourceBoard() {
        if (state.sourceImage) {
            setupCanvas(state.sourceImage.naturalWidth || state.sourceImage.width || 1200, state.sourceImage.naturalHeight || state.sourceImage.height || 800);
        } else {
            const box = bboxOf(state.sections.flatMap((section) => section.originalPolygon || section.polygon || []));
            setupCanvas(Math.max(900, box.x + box.w + 80), Math.max(620, box.y + box.h + 80));
        }
        if (dom.sourceLoadSummary) {
            dom.sourceLoadSummary.textContent = `기준 도면 ${state.sourceImage ? "로드 완료" : "없음"} · 구역 ${state.sections.length}개`;
        }
        syncGroupJumpBar();
        drawBase();
        drawOverlay();
        renderMiniMapOverlay();
    }

    function prepareBoardForCurrentPart() {
        if (state.activePart === 1 || isReferenceBoardMode()) {
            setupSourceBoard();
            return;
        }
        arrangeSectionsOnBoard();
    }

    function isReferenceBoardMode() {
        return state.activePart > 1 && state.referenceBoardMode && !state.activeGroupKey;
    }

    function getDisplayPolygon(section) {
        if (!section) return [];
        if (state.activePart === 1 || isReferenceBoardMode()) return section.originalPolygon || section.polygon || [];
        return section.layoutPolygon || section.polygon || section.originalPolygon || [];
    }

    function arrangeSectionsOnBoard() {
        if (!state.sections.length) {
            setupCanvas(1200, 800);
            drawBase();
            return;
        }

        const padding = 70;
        const groupGapY = 82;
        const itemGapX = 34;
        const itemGapY = 30;
        const maxRowWidth = 1520;
        const visibleSections = getVisibleSectionsForBoard();
        const groups = groupSectionsForBoard(visibleSections);

        let y = padding;
        let boardW = maxRowWidth + padding * 2;

        groups.forEach((group) => {
            let x = padding;
            let rowH = 0;
            const groupScale = getGroupBoardScale(group.sections);

            group.sections.forEach((section) => {
                const box = getOriginalBbox(section);
                const current = state.layouts[section.sectionId] || {};
                const layoutW = Math.max(12, box.w * groupScale);
                const layoutH = Math.max(12, box.h * groupScale);

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
                    scale: groupScale,
                    originalBbox: box,
                    width: layoutW,
                    height: layoutH,
                    proportionalBoard: true
                };

                x += layoutW + itemGapX;
                rowH = Math.max(rowH, layoutH);
            });
            y += Math.max(rowH, 80) + groupGapY;
        });

        const ext = getBoardExtent(visibleSections);
        boardW = Math.max(boardW, ext.maxX + padding);
        const boardH = Math.max(720, ext.maxY + padding);
        setupCanvas(boardW, boardH);
        rebuildSectionGeometry();
        drawBase();
    }

    function getGroupBoardScale(sections) {
        const boxes = normalizeArray(sections).map(getOriginalBbox).filter((box) => box && box.w > 0 && box.h > 0);
        if (!boxes.length) return 2.4;
        const heights = boxes.map((box) => box.h).sort((a, b) => a - b);
        const medianH = heights[Math.floor(heights.length / 2)] || 50;
        const targetMedianH = 150;
        return clamp(targetMedianH / Math.max(1, medianH), 1.4, 4.5);
    }

    function groupSectionsForBoard(sections) {
        const map = new Map();
        sections.forEach((section) => {
            const key = getGroupKey(section);
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(section);
        });
        return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, "ko")).map(([key, list]) => ({
            key,
            sections: list.sort(compareSection)
        }));
    }


    function getGroupKey(section) {
        const explicit = cleanText(section?.groupKey || section?.groupName, "");
        if (explicit) return explicit;
        const name = cleanText(section?.sectionName || section?.name || section?.section || "", "");
        const match = name.match(/^[A-Za-z가-힣]+/);
        return match ? match[0].slice(0, 1).toUpperCase() : "미지정";
    }

    function isSameGroupLoose(section, groupKey) {
        const key = cleanText(groupKey, "");
        if (!key || key === "__all") return false;
        const upperKey = key.toUpperCase();
        const sectionGroup = cleanText(section?.groupKey || section?.groupName, "");
        const name = cleanText(section?.sectionName || section?.name || section?.section, "");
        const upperName = name.toUpperCase();
        return sectionGroup === key || sectionGroup.toUpperCase() === upperKey || upperName === upperKey || upperName.startsWith(upperKey);
    }

    function getSameGroupSections(reference) {
        if (!reference) return [];
        const key = getGroupKey(reference);
        return getSectionsForGroupKeyLoose(key);
    }

    function getSectionsForGroupKeyLoose(groupKey) {
        const key = cleanText(groupKey, "");
        const upperKey = key.toUpperCase();
        if (!key || key === "__all") return [];
        return state.sections
            .filter((section) => isSameGroupLoose(section, key))
            .sort(compareSection);
    }

    function forceInferenceGroupBoard(reference) {
        if (!reference) return [];
        const groupKey = getGroupKey(reference);
        state.activePart = 3;
        state.referenceBoardMode = false;
        state.activeGroupKey = groupKey;
        if (dom.groupFilter) dom.groupFilter.value = groupKey;

        // 같은 그룹 전체 재추정은 반드시 같은 그룹 전체 layoutPolygon이 준비되어 있어야 한다.
        // 이전 코드처럼 선택 구역만 rebuild하면 target 중 일부가 default layout(70,70)에 겹쳐서
        // 실제로는 한 구역만 생성된 것처럼 보인다. 여기서는 매번 그룹 작업판을 다시 준비한다.
        arrangeSectionsOnBoard();

        const targets = getSameGroupSections(reference);
        targets.forEach((section) => {
            if (!section.layoutPolygon || !section.layoutBbox) {
                const current = state.layouts[section.sectionId] || defaultLayout(section);
                state.layouts[section.sectionId] = { ...defaultLayout(section), ...current };
                rebuildSectionGeometry(section.sectionId);
            }
        });
        return targets;
    }

    function getVisibleSectionsForBoard() {
        if (state.activePart === 1 || isReferenceBoardMode()) return state.sections;
        if (state.activePart === 5) return [];
        if (!state.activeGroupKey) return [];
        return getSectionsForGroupKeyLoose(state.activeGroupKey);
    }

    function isSectionVisibleOnBoard(section) {
        if (state.activePart === 1 || isReferenceBoardMode()) return true;
        if (state.activePart === 5) return false;
        if (!state.activeGroupKey) return false;
        return isSameGroupLoose(section, state.activeGroupKey);
    }

    function isSeatVisibleOnBoard(seat) {
        if (state.activePart === 1 || state.activePart === 5 || isReferenceBoardMode()) return false;
        if (!state.activeGroupKey) return false;
        const section = findSectionById(seat.sectionId);
        return Boolean(section && isSameGroupLoose(section, state.activeGroupKey));
    }

    function ensureActiveGroupForBoard() {
        if (state.activePart === 1 || state.activeGroupKey || state.referenceBoardMode) return;
        const selected = getSelectedSection();
        const firstGroup = groupSectionsForBoard(state.sections)[0];
        state.activeGroupKey = selected ? getGroupKey(selected) : (firstGroup?.key || "");
        if (dom.groupFilter && state.activeGroupKey) dom.groupFilter.value = state.activeGroupKey;
    }

    function handleGroupJumpClick(event) {
        const button = event.target.closest("[data-group-key]");
        if (!button) return;
        jumpToGroup(button.dataset.groupKey || "__all");
    }

    function jumpToGroup(groupKey) {
        invalidateSeatIndex();
        const key = cleanText(groupKey, "__all");

        if (state.activePart === 1) {
            setPart(2);
        } else if (state.activePart < 2) {
            setPart(2);
        }

        if (key === "__all") {
            state.activeGroupKey = "";
            state.referenceBoardMode = true;
            if (dom.groupFilter) dom.groupFilter.value = "__all";
            setupSourceBoard();
            syncSectionSelect();
            syncSectionList();
            syncInfo();
            syncJsonPreview();
            drawBase();
            drawOverlay();
            renderMiniMapOverlay();
            syncGroupJumpBar();
            requestAnimationFrame(() => {
                if (dom.canvasScroll) {
                    dom.canvasScroll.scrollTo({ left: 0, top: 0, behavior: "smooth" });
                }
            });
            toast("전체 기준 도면 보기: 기존 도면 위치를 참조합니다.");
            return;
        }

        const group = groupSectionsForBoard(state.sections).find((item) => item.key === key);
        if (!group || !group.sections.length) return;

        state.activeGroupKey = key;
        state.referenceBoardMode = false;
        if (!group.sections.some((section) => section.sectionId === state.selectedSectionId)) {
            state.selectedSectionId = group.sections[0].sectionId;
            state.selectedSeatIds.clear();
            restoreLayoutToInputs(group.sections[0]);
        }
        if (dom.groupFilter) dom.groupFilter.value = key;
        if (state.activePart > 1) arrangeSectionsOnBoard();
        syncSectionSelect();
        syncSectionList();
        syncInfo();
        syncJsonPreview();
        drawBase();
        drawOverlay();
        renderMiniMapOverlay();
        syncGroupJumpBar();
        requestAnimationFrame(() => scrollToGroup(key));
    }

    function scrollToGroup(groupKey) {
        const scroll = dom.canvasScroll;
        if (!scroll) return;
        if (state.activePart === 1) return;
        const group = groupSectionsForBoard(state.sections).find((item) => item.key === groupKey);
        if (!group) return;
        const boxes = group.sections
            .map((section) => section.layoutBbox || bboxOf(section.layoutPolygon || []))
            .filter((box) => box && Number.isFinite(box.x) && Number.isFinite(box.y) && box.w > 0 && box.h > 0);
        if (!boxes.length) return;
        const minX = Math.min(...boxes.map((box) => box.x));
        const minY = Math.min(...boxes.map((box) => box.y));
        const maxX = Math.max(...boxes.map((box) => box.x + box.w));
        const zoom = Number(state.zoom) || 1;
        const navOffset = dom.groupJumpBar && !dom.groupJumpBar.hidden ? dom.groupJumpBar.offsetHeight + 28 : 60;
        const targetLeft = Math.max(0, ((minX + maxX) / 2) * zoom - scroll.clientWidth / 2);
        const targetTop = Math.max(0, minY * zoom - navOffset);
        scroll.scrollTo({ left: targetLeft, top: targetTop, behavior: "smooth" });
    }

    function syncGroupJumpBar() {
        if (!dom.groupJumpBar) return;
        const groups = groupSectionsForBoard(state.sections);
        if (state.activePart === 1 || state.activePart === 5 || !groups.length) {
            dom.groupJumpBar.hidden = true;
            dom.groupJumpBar.innerHTML = "";
            return;
        }

        dom.groupJumpBar.hidden = false;
        const selectedGroup = getGroupKey(getSelectedSection());
        const activeKey = isReferenceBoardMode() ? "__all" : (state.activeGroupKey || selectedGroup);
        const allActive = isReferenceBoardMode() ? " is-active" : "";
        const baseButtons = [
            `<button type="button" class="stage4-group-nav__btn${allActive}" data-group-key="__all">전체</button>`
        ];
        const seatCountMap = buildSeatCountMap(true);
        const buttons = baseButtons.concat(groups.map((group) => {
            const seatCount = group.sections.reduce((sum, section) => sum + (seatCountMap.get(String(section.sectionId)) || 0), 0);
            const active = activeKey === group.key ? " is-active" : "";
            return `<button type="button" class="stage4-group-nav__btn${active}" data-group-key="${escapeHtml(group.key)}">${escapeHtml(group.key)}<span>${group.sections.length}</span><em>${seatCount}</em></button>`;
        }));

        dom.groupJumpBar.innerHTML = `
            <div class="stage4-group-nav__inner">
                <strong>그룹 이동</strong>
                <div class="stage4-group-nav__buttons">${buttons.join("")}</div>
            </div>`;
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


    function invalidateSeatIndex() {
        state.seatIndexVersion = (Number(state.seatIndexVersion) || 0) + 1;
        seatSpatialIndex = null;
        invalidateRenderCache();
    }

    function invalidateRenderCache() {
        state.renderVersion = (Number(state.renderVersion) || 0) + 1;
    }

    function requestDrawOverlay() {
        if (overlayFrame) return;
        overlayFrame = requestAnimationFrame(() => {
            overlayFrame = 0;
            drawOverlay();
        });
    }

    function requestRenderMiniMapOverlay() {
        if (miniMapFrame) return;
        miniMapFrame = requestAnimationFrame(() => {
            miniMapFrame = 0;
            renderMiniMapOverlay();
        });
    }

    function visibleSeatIndexKey() {
        return [
            state.seatIndexVersion,
            state.activePart,
            state.activeGroupKey || "",
            state.referenceBoardMode ? 1 : 0,
            state.seats.length
        ].join("|");
    }

    function getVisibleSeatSpatialIndex() {
        const key = visibleSeatIndexKey();
        if (seatSpatialIndex && seatSpatialIndex.key === key) return seatSpatialIndex;

        const cellSize = 48;
        const map = new Map();
        const add = (cellKey, seat) => {
            let list = map.get(cellKey);
            if (!list) {
                list = [];
                map.set(cellKey, list);
            }
            list.push(seat);
        };

        state.seats.forEach((seat) => {
            if (seat.status === "REMOVED" || !isSeatVisibleOnBoard(seat)) return;
            const size = Math.max(3, Number(seat.size) || 10);
            const radius = size / 2 + 8;
            const minX = Math.floor((Number(seat.x) - radius) / cellSize);
            const maxX = Math.floor((Number(seat.x) + radius) / cellSize);
            const minY = Math.floor((Number(seat.y) - radius) / cellSize);
            const maxY = Math.floor((Number(seat.y) + radius) / cellSize);
            for (let gx = minX; gx <= maxX; gx += 1) {
                for (let gy = minY; gy <= maxY; gy += 1) {
                    add(`${gx}:${gy}`, seat);
                }
            }
        });

        seatSpatialIndex = { key, cellSize, map };
        return seatSpatialIndex;
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


    function setupFinalPreviewBoard() {
        const size = getReferenceCanvasSize();
        setupCanvas(size.width, size.height);
    }

    function drawFinalPreviewBoard() {
        if (!ctx || !overlayCtx) return;
        preparePart5ButtonPolygons();
        drawFinalPng(ctx, { debug: false, reference: true, width: state.width, height: state.height });
        overlayCtx.clearRect(0, 0, state.width, state.height);
        drawFinalSelectionOverlay(overlayCtx);
    }

    function drawBase() {
        if (!ctx) return;
        ctx.clearRect(0, 0, state.width, state.height);
        if (state.activePart === 5) {
            drawFinalPng(ctx, { debug: false, reference: true, width: state.width, height: state.height });
            return;
        }
        ctx.fillStyle = COLORS.boardBg;
        ctx.fillRect(0, 0, state.width, state.height);

        if ((state.activePart === 1 || isReferenceBoardMode()) && state.sourceImage) {
            ctx.drawImage(state.sourceImage, 0, 0, state.width, state.height);
            return;
        }

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

        if (state.activePart > 1 && !isReferenceBoardMode()) drawGroupHeaders(ctx);
    }

    function drawGroupHeaders(targetCtx) {
        const groups = groupSectionsForBoard(getVisibleSectionsForBoard());
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
        invalidateSeatIndex();
        state.activePart = Math.max(1, Math.min(5, Number(nextPart) || 1));

        if (state.activePart === 1) {
            state.referenceBoardMode = false;
            setupSourceBoard();
        } else if (state.activePart === 5) {
            state.referenceBoardMode = false;
            setupFinalPreviewBoard();
        } else {
            state.referenceBoardMode = false;
            ensureActiveGroupForBoard();
            arrangeSectionsOnBoard();
        }

        [1, 2, 3, 4, 5].forEach((part) => {
            const panel = dom[`part${part}Panel`];
            const button = dom[`part${part}Btn`] || dom[`partBtn${part}`];
            const status = dom[`part${part}Status`];
            if (!panel || !button) return;

            panel.classList.toggle("is-active", part === state.activePart);
            panel.classList.toggle("is-done", isPartDone(part));
            button.classList.toggle("active", part === state.activePart);
            if (status) status.textContent = part === state.activePart ? "진행중" : (isPartDone(part) ? "완료" : "대기");
        });

        if (dom.canvasTitle) {
            dom.canvasTitle.textContent = state.activePart === 1
                ? "현재 도면 확인"
                : (state.activePart === 2
                    ? "구역 펼치기 · 회전"
                    : (state.activePart === 3
                        ? "기준 구역 좌석 재추정"
                        : (state.activePart === 4 ? "최종 형태 검수 · 좌석 추가/삭제" : "최종 PNG 미리보기")));
        }
        syncGroupJumpBar();
        if (state.activePart === 5) {
            drawFinalPreviewBoard();
            renderMiniMapOverlay();
            updateFinalPreview();
            return;
        }
        drawBase();
        drawOverlay();
        renderMiniMapOverlay();
    }

    function isPartDone(part) {
        if (part === 1) return state.sections.length > 0 && Boolean(getSelectedSection());
        if (part === 2) return Boolean(getSelectedSection());
        if (part === 3) return createFinalSeatJson().length > 0;
        if (part === 4) return createFinalSeatJson().length > 0;
        if (part === 5) return createFinalSeatJson().length > 0;
        return false;
    }

    function selectSection(sectionId) {
        if (!sectionId) return;
        state.selectedSectionId = sectionId;
        const selected = getSelectedSection();
        state.activeGroupKey = selected ? getGroupKey(selected) : state.activeGroupKey;
        state.selectedSeatIds.clear();
        restoreLayoutToInputs(selected);
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
            toast("좌석을 생성할 기준 구역을 선택하세요.");
            return;
        }
        if (!section.sectionName) {
            toast("sectionName이 없는 구역은 좌석을 만들 수 없습니다. Stage 3에서 구역명을 확정하세요.");
            return;
        }

        const groupKey = getGroupKey(section);
        state.activePart = 3;
        state.referenceBoardMode = false;
        state.activeGroupKey = groupKey;
        if (dom.groupFilter) dom.groupFilter.value = groupKey;

        try {
            ensureGroupLayoutsReady(groupKey);
            const currentSection = findSectionById(section.sectionId) || section;
            ensureLayoutReadyForSection(currentSection);

            const layout = {
                ...defaultLayout(currentSection),
                ...(state.layouts[currentSection.sectionId] || {}),
                ...readLayoutFromInputs(currentSection),
                inferenceMode: "REFERENCE",
                referenceSectionId: currentSection.sectionId,
                inferenceUpdatedAt: Date.now()
            };
            state.layouts[currentSection.sectionId] = layout;
            rebuildSectionGeometry(currentSection.sectionId);

            const generated = buildBBoxRectangleFillSeatsForSection(currentSection, state.layouts[currentSection.sectionId], {
                autoRowsCols: true,
                preserveInputSeatSize: true,
                includeOutsideAsCandidate: false
            });

            if (!generated.length) {
                toast(`${currentSection.sectionName} 좌석 생성 결과가 0개입니다. 행/열 또는 구역 크기를 확인하세요.`);
                drawBase();
                drawOverlay();
                return;
            }

            state.seats = state.seats
                .filter((seat) => String(seat.sectionId) !== String(currentSection.sectionId))
                .concat(generated);
            state.selectedSectionId = currentSection.sectionId;
            state.selectedSeatIds.clear();
            persistLocalWork();
            renderAfterSeatMutation(groupKey, false);

            const finalCount = generated.filter((seat) => seat.status === STATUS_AVAILABLE).length;
            const candidateCount = generated.filter((seat) => seat.status === STATUS_CANDIDATE).length;
            toast(`${currentSection.sectionName} 기준 좌석 재생성 완료 · 확정 ${finalCount}개 / 걸침 후보 ${candidateCount}개`);
        } catch (error) {
            console.error("[SeatTrace Stage4] 선택 구역 기준 좌석 생성 실패", error);
            toast("선택 구역 좌석 생성 실패: 콘솔 오류를 확인하세요.");
        }
    }

    function inferAllSections() {
        const selected = getSelectedSection();
        const selectedGroupKey = selected ? getGroupKey(selected) : "";
        const filterGroupKey = dom.groupFilter?.value && dom.groupFilter.value !== "__all" ? dom.groupFilter.value : "";
        const groupKey = cleanText(
            selectedGroupKey
            || state.activeGroupKey
            || filterGroupKey,
            ""
        );
        if (!groupKey || groupKey === "__all") {
            toast("재추정할 그룹을 먼저 선택하세요.");
            return;
        }

        const targets = getSectionsForGroupKeyLoose(groupKey);
        if (!targets.length) {
            toast(`${groupKey} 그룹에 재추정할 구역이 없습니다.`);
            return;
        }

        let reference = selected && isSameGroupLoose(selected, groupKey) ? selected : targets[0];
        reference = findSectionById(reference.sectionId) || reference;
        if (!reference) {
            toast("기준으로 삼을 구역을 먼저 선택하세요.");
            return;
        }

        const previousSeats = state.seats.slice();
        const previousLayouts = cloneLayouts(state.layouts);

        try {
            state.activePart = 3;
            state.referenceBoardMode = false;
            state.activeGroupKey = groupKey;
            state.selectedSectionId = reference.sectionId;
            if (dom.groupFilter) dom.groupFilter.value = groupKey;

            // 같은 그룹 전체 재추정은 복잡하게 기존 좌석을 찾지 않는다.
            // 현재 선택된 그룹 전체를 대상(targets)으로 잡고,
            // 선택 구역은 행/열 기준으로 pitch와 좌석 크기를 계산하는 기준점으로만 사용한다.
            ensureGroupLayoutsReady(groupKey);

            const currentReference = findSectionById(reference.sectionId) || reference;
            ensureLayoutReadyForSection(currentReference);

            const baseLayout = {
                ...defaultLayout(currentReference),
                ...(state.layouts[currentReference.sectionId] || {}),
                ...readLayoutFromInputs(currentReference),
                inferenceMode: "REFERENCE",
                referenceSectionId: currentReference.sectionId,
                inferenceUpdatedAt: Date.now()
            };
            state.layouts[currentReference.sectionId] = baseLayout;
            rebuildSectionGeometry(currentReference.sectionId);

            const metrics = getReferenceSeatMetrics(currentReference, state.layouts[currentReference.sectionId]);
            if (!metrics) {
                throw new Error(`${currentReference.sectionName} 기준 구역 크기 또는 행/열 값을 계산할 수 없습니다.`);
            }

            const generatedAll = [];
            const failedNames = [];

            targets.forEach((section) => {
                try {
                    const target = findSectionById(section.sectionId) || section;
                    ensureLayoutReadyForSection(target);
                    rebuildSectionGeometry(target.sectionId);
                    const targetBox = bboxOf(target.layoutPolygon || target.polygon || []);
                    if (!targetBox.w || !targetBox.h) {
                        failedNames.push(target.sectionName || target.sectionId);
                        return;
                    }

                    const isReference = String(target.sectionId) === String(currentReference.sectionId);
                    const targetGrid = calcSeatGridForBox(targetBox, metrics.seatSize, metrics.gapX, metrics.gapY);
                    const rows = targetGrid.rows;
                    const cols = targetGrid.cols;

                    const layout = {
                        ...defaultLayout(target),
                        ...(state.layouts[target.sectionId] || {}),
                        rows,
                        cols,
                        seatSize: metrics.seatSize,
                        gapX: metrics.gapX,
                        gapY: metrics.gapY,
                        rowStart: metrics.rowStart,
                        colStart: metrics.colStart,
                        seatAngle: metrics.seatAngle,
                        inferenceMode: isReference ? "REFERENCE" : "GROUP_REFERENCE",
                        referenceSectionId: currentReference.sectionId,
                        referencePitchX: metrics.pitchX,
                        referencePitchY: metrics.pitchY,
                        inferenceUpdatedAt: Date.now()
                    };
                    state.layouts[target.sectionId] = layout;
                    rebuildSectionGeometry(target.sectionId);

                    const generated = buildBBoxRectangleFillSeatsForSection(target, state.layouts[target.sectionId], {
                        autoRowsCols: true,
                        pitchX: metrics.pitchX,
                        pitchY: metrics.pitchY,
                        preserveInputSeatSize: true,
                        autoSeatSize: false,
                        includeOutsideAsCandidate: false
                    });

                    // 중요: 확정 좌석이 0개여도 후보 좌석이 있으면 성공이다.
                    // 실선에 걸친 좌석은 관리자가 살릴지 지울지 판단해야 하므로 사라지면 안 된다.
                    if (!generated.length) {
                        failedNames.push(target.sectionName || target.sectionId);
                        return;
                    }
                    generatedAll.push(...generated);
                } catch (error) {
                    console.warn("[SeatTrace Stage4] 구역 재추정 실패", section?.sectionName || section?.sectionId, error);
                    failedNames.push(section?.sectionName || section?.sectionId || "unknown");
                }
            });

            if (!generatedAll.length) {
                state.seats = previousSeats;
                state.layouts = previousLayouts;
                rebuildSectionGeometry();
                renderAfterSeatMutation(groupKey, false);
                toast("재추정 결과 좌석이 0개입니다. 기존 좌석을 유지했습니다.");
                return;
            }

            const targetIds = new Set(targets.map((section) => String(section.sectionId)));
            state.seats = state.seats
                .filter((seat) => !targetIds.has(String(seat.sectionId)))
                .concat(generatedAll);
            state.selectedSectionId = currentReference.sectionId;
            state.selectedSeatIds.clear();
            persistLocalWork();
            renderAfterSeatMutation(groupKey, true);

            const finalCount = generatedAll.filter((seat) => seat.status === STATUS_AVAILABLE).length;
            const candidateCount = generatedAll.filter((seat) => seat.status === STATUS_CANDIDATE).length;
            const failText = failedNames.length ? ` / 빈 구역 ${failedNames.length}개` : "";
            toast(`${currentReference.sectionName} 기준으로 ${groupKey} 그룹 ${targets.length}개 구역 재추정 완료 · 확정 ${finalCount}개 / 걸침 후보 ${candidateCount}개${failText}`);
        } catch (error) {
            console.error("[SeatTrace Stage4] 같은 그룹 전체 재추정 실패", error);
            state.seats = previousSeats;
            state.layouts = previousLayouts;
            rebuildSectionGeometry();
            renderAfterSeatMutation(groupKey, false);
            toast("같은 그룹 전체 재추정 실패: 기존 좌석을 유지했습니다. 콘솔 오류를 확인하세요.");
        }
    }

    function calcSeatGridForBox(box, seatSize, gapX, gapY) {
        const size = Math.max(1, Number(seatSize) || 10);
        const gx = Math.max(0, Number(gapX) || 0);
        const gy = Math.max(0, Number(gapY) || 0);
        const pitchX = Math.max(1, size + gx);
        const pitchY = Math.max(1, size + gy);
        const w = Math.max(0, Number(box?.w) || 0);
        const h = Math.max(0, Number(box?.h) || 0);
        return {
            rows: Math.max(1, Math.floor((h + gy) / pitchY)),
            cols: Math.max(1, Math.floor((w + gx) / pitchX))
        };
    }

    function getReferenceSeatMetrics(reference, layout) {
        if (!reference || !layout) return null;
        const box = bboxOf(reference.layoutPolygon || reference.polygon || []);
        if (!box.w || !box.h) return null;

        const inputSeatSize = Number(layout.seatSize);
        const seatSize = round(clamp(Number.isFinite(inputSeatSize) && inputSeatSize > 0 ? inputSeatSize : 10, 2, 80));
        const gapX = Math.max(0, Number(layout.gapX) || 0);
        const gapY = Math.max(0, Number(layout.gapY) || 0);
        const pitchX = Math.max(1, seatSize + gapX);
        const pitchY = Math.max(1, seatSize + gapY);
        const grid = calcSeatGridForBox(box, seatSize, gapX, gapY);

        // Part 3 추정 기준은 행/열 수가 아니라 좌석 크기 + 가로/세로 간격이다.
        // 행/열은 각 구역 bbox 안에 실제로 들어갈 수 있는 만큼 자동 계산한다.
        return {
            rows: grid.rows,
            cols: grid.cols,
            seatSize,
            gapX,
            gapY,
            pitchX: round(pitchX),
            pitchY: round(pitchY),
            rowStart: layout.rowStart || "A",
            colStart: Math.max(1, positiveInt(layout.colStart, 1)),
            seatAngle: normalizeAngle(Number(layout.seatAngle ?? 0) || 0)
        };
    }

    function ensureGroupLayoutsReady(groupKey) {
        const key = cleanText(groupKey, "");
        if (!key || key === "__all") return [];
        state.activePart = 3;
        state.referenceBoardMode = false;
        state.activeGroupKey = key;
        const targets = state.sections
            .filter((section) => getGroupKey(section) === key)
            .sort(compareSection);
        if (!targets.length) return [];

        const needsArrange = targets.some((section) => {
            const layout = state.layouts[section.sectionId];
            const box = section.layoutBbox || bboxOf(section.layoutPolygon || []);
            return !layout
                || !section.layoutPolygon
                || !box
                || !Number.isFinite(Number(box.w))
                || !Number.isFinite(Number(box.h))
                || Number(box.w) <= 0
                || Number(box.h) <= 0;
        });

        if (needsArrange) {
            arrangeSectionsOnBoard();
        }

        targets.forEach((section) => {
            ensureLayoutReadyForSection(section);
            rebuildSectionGeometry(section.sectionId);
        });
        return targets;
    }

    function safeBuildReferenceSeats(section, layout, options = {}) {
        try {
            // 자동 추정 기본 규칙:
            // 1) bbox는 스캔 범위일 뿐이다.
            // 2) 좌석 네모가 polygon 안에 충분히 들어가면 확정
            // 3) polygon 실선에 걸치거나 일부 겹치면 후보
            // 4) polygon과 전혀 안 겹치는 맨땅 좌석은 표시하지 않는다.
            return buildSeatsForSection(section, layout, options);
        } catch (error) {
            console.warn("[SeatTrace Stage4] 자동 좌석 생성 실패", section?.sectionName || section?.sectionId, error);
            return [];
        }
    }

    function cloneLayouts(layouts) {
        try {
            return JSON.parse(JSON.stringify(layouts || {}));
        } catch (_) {
            return { ...(layouts || {}) };
        }
    }

    function ensurePart3GroupBoard(reference) {
        if (!reference) return [];
        const groupKey = getGroupKey(reference);
        state.activePart = 3;
        state.referenceBoardMode = false;
        state.activeGroupKey = groupKey;
        if (dom.groupFilter) dom.groupFilter.value = groupKey;

        // 현재 보드가 다른 그룹/전체/기준도면 상태일 수 있으므로 한 번만 그룹 보드로 준비한다.
        // 이 함수는 버튼 클릭 중 setPart()/syncAll()을 부르지 않는다.
        arrangeSectionsOnBoard();
        const targets = getSameGroupSections(reference);
        targets.forEach(ensureLayoutReadyForSection);
        rebuildSectionGeometry();
        return targets;
    }

    function buildReferenceSeatsWithFallback(section, layout, options = {}) {
        let generated = buildSeatsForSection(section, layout, options);
        if (generated.length) return generated;

        // 맨땅 후보는 만들지 않는다. polygon과 전혀 안 겹치면 표시 대상이 아니다.
        return generated;
    }

    function ensureLayoutReadyForSection(section) {
        if (!section || !section.sectionId) return null;
        if (!state.layouts[section.sectionId]) {
            state.layouts[section.sectionId] = defaultLayout(section);
        }
        if (!section.layoutPolygon || !section.layoutBbox) {
            rebuildSectionGeometry(section.sectionId);
        }
        return state.layouts[section.sectionId];
    }

    function renderAfterSeatMutation(groupKey = "", scrollToActiveGroup = false) {
        invalidateSeatIndex();
        state.activePart = 3;
        state.referenceBoardMode = false;
        if (groupKey) state.activeGroupKey = groupKey;
        ensureActiveGroupForBoard();
        syncToolState();
        syncGroupFilter();
        syncSectionSelect();
        syncSectionList();
        syncInfo();
        syncJsonPreview();
        syncGroupJumpBar();
        drawBase();
        drawOverlay();
        renderMiniMapOverlay();
        if (scrollToActiveGroup && state.activeGroupKey) {
            requestAnimationFrame(() => scrollToGroup(state.activeGroupKey));
        }
    }

    function prepareInferenceBoard(reference) {
        if (!reference) return;
        forceInferenceGroupBoard(reference);
    }

    function applyInferenceLayout(section, layout) {
        const merged = {
            ...defaultLayout(section),
            ...(state.layouts[section.sectionId] || {}),
            ...layout
        };
        state.layouts[section.sectionId] = merged;
        rebuildSectionGeometry(section.sectionId);
        return state.layouts[section.sectionId];
    }

    function replaceSectionSeats(sectionIds, nextSeats) {
        invalidateSeatIndex();
        const ids = new Set(normalizeArray(sectionIds).map((id) => String(id)));
        state.seats = state.seats
            .filter((seat) => !ids.has(String(seat.sectionId)))
            .concat(normalizeArray(nextSeats).filter(hasSeatPoint));
    }

    function renderAfterInference(groupKey = "") {
        invalidateSeatIndex();
        // Part 3 추정 직후에는 setPart()/syncAll()로 다시 정렬하지 않는다.
        // 다시 정렬하면 방금 생성한 좌석 좌표와 layoutPolygon 기준이 어긋날 수 있다.
        state.activePart = 3;
        state.referenceBoardMode = false;
        if (groupKey) state.activeGroupKey = groupKey;
        ensureActiveGroupForBoard();
        syncToolState();
        syncGroupFilter();
        syncSectionSelect();
        syncSectionList();
        syncInfo();
        syncJsonPreview();
        syncGroupJumpBar();
        drawBase();
        drawOverlay();
        renderMiniMapOverlay();

        // 전체 재추정 후 기존 스크롤 위치가 빈 영역을 보고 있으면
        // 실제로는 생성됐는데 화면이 초기화된 것처럼 보인다.
        requestAnimationFrame(() => {
            if (state.activeGroupKey) scrollToGroup(state.activeGroupKey);
        });
    }

    function buildLooseBBoxSeatsForSection(section, layout, options = {}) {
        const polygon = section.layoutPolygon || section.polygon;
        const box = bboxOf(polygon);
        const rows = Math.max(1, positiveInt(layout.rows, 1));
        const cols = Math.max(1, positiveInt(layout.cols, 1));
        if (!box.w || !box.h) return [];

        const pitchX = Math.max(1, Number(options.pitchX || layout.referencePitchX) || (box.w / cols));
        const pitchY = Math.max(1, Number(options.pitchY || layout.referencePitchY) || (box.h / rows));
        const autoSeatSize = Math.max(3, Math.min(pitchX, pitchY) * 0.64);
        const inputSeatSize = Number(layout.seatSize);
        const useAutoSeatSize = options.autoSeatSize === true || !Number.isFinite(inputSeatSize) || inputSeatSize <= 0;
        const seatSize = round(clamp(useAutoSeatSize ? autoSeatSize : inputSeatSize, 2, Math.max(2, Math.min(pitchX, pitchY) * 0.92)));
        const angle = normalizeAngle(Number(layout.seatAngle ?? 0) || 0);
        const rowOffset = rowNameToIndex(layout.rowStart || "A");
        const colStart = Math.max(1, positiveInt(layout.colStart, 1));
        const totalW = Math.max(0, (cols - 1) * pitchX);
        const totalH = Math.max(0, (rows - 1) * pitchY);
        const startX = box.x + box.w / 2 - totalW / 2;
        const startY = box.y + box.h / 2 - totalH / 2;
        let seats = [];

        for (let r = 0; r < rows; r += 1) {
            for (let c = 0; c < cols; c += 1) {
                const center = {
                    x: startX + c * pitchX,
                    y: startY + r * pitchY
                };
                const centerInside = polygon && polygon.length >= 3 ? isInsideOrEdge(center, polygon) : true;
                const closeToEdge = polygon && polygon.length >= 3
                    ? distanceToPolygon(center, polygon) <= Math.max(2, seatSize * 0.75)
                    : false;
                if (!centerInside && !closeToEdge) continue;

                const row = indexToRowName(rowOffset + r);
                const col = colStart + c;
                seats.push(makeSeat(
                    section,
                    row,
                    col,
                    center,
                    seatSize,
                    angle,
                    centerInside ? STATUS_AVAILABLE : STATUS_CANDIDATE
                ));
            }
        }

        const finalSeats = seats.filter((seat) => seat.status === STATUS_AVAILABLE);
        const bounds = getSeatBounds(finalSeats);
        const cleanButtonPolygon = createCleanButtonPolygonFromSeats(section, finalSeats, Math.max(6, seatSize * 0.7));
        state.layouts[section.sectionId] = {
            ...layout,
            rows,
            cols,
            seatSize,
            pitchX: round(pitchX),
            pitchY: round(pitchY),
            seatCount: finalSeats.length,
            candidateSeatCount: seats.length - finalSeats.length,
            actualBounds: bounds,
            buttonPolygon: cleanButtonPolygon,
            buttonShapeMode: cleanButtonPolygon?.length === 3 ? "TRIANGLE" : "SEAT_HULL",
            polygonCandidateOnly: finalSeats.length === 0 && seats.length > 0
        };
        return seats;
    }

    function buildBBoxRectangleFillSeatsForSection(section, layout, options = {}) {
        const polygon = section.layoutPolygon || section.polygon || [];
        const box = bboxOf(polygon);
        if (!box || !box.w || !box.h) return [];

        const inputSeatSize = Number(layout.seatSize);
        const gapX = Math.max(0, Number(layout.gapX) || 0);
        const gapY = Math.max(0, Number(layout.gapY) || 0);
        const rawSeatSize = Number.isFinite(inputSeatSize) && inputSeatSize > 0 ? inputSeatSize : 10;
        const basePitchX = Math.max(1, Number(options.pitchX || layout.referencePitchX || layout.pitchX) || (rawSeatSize + gapX));
        const basePitchY = Math.max(1, Number(options.pitchY || layout.referencePitchY || layout.pitchY) || (rawSeatSize + gapY));
        const autoSeatSize = Math.max(3, Math.min(basePitchX, basePitchY) * 0.64);
        const useAutoSeatSize = options.autoSeatSize === true || !Number.isFinite(inputSeatSize) || inputSeatSize <= 0;
        const seatSize = round(clamp(useAutoSeatSize ? autoSeatSize : rawSeatSize, 2, Math.max(2, Math.min(basePitchX, basePitchY) * 0.92)));
        const grid = options.autoRowsCols === true
            ? calcSeatGridForBox(box, seatSize, gapX, gapY)
            : { rows: Math.max(1, positiveInt(layout.rows, 1)), cols: Math.max(1, positiveInt(layout.cols, 1)) };
        const rows = grid.rows;
        const cols = grid.cols;
        const pitchX = Math.max(1, Number(options.pitchX || layout.referencePitchX || layout.pitchX) || (seatSize + gapX));
        const pitchY = Math.max(1, Number(options.pitchY || layout.referencePitchY || layout.pitchY) || (seatSize + gapY));
        const angle = normalizeAngle(Number(layout.seatAngle ?? 0) || 0);
        const rowOffset = rowNameToIndex(layout.rowStart || "A");
        const colStart = Math.max(1, positiveInt(layout.colStart, 1));

        // 핵심: 같은 그룹 전체 재추정은 polygon 모양대로 좌석을 잘라내는 기능이 아니다.
        // 기준 구역에서 얻은 pitch로 각 구역 bbox 사각형을 먼저 전부 채운다.
        // polygon은 확정/후보 판정에만 사용한다.
        const totalW = Math.max(0, (cols - 1) * pitchX);
        const totalH = Math.max(0, (rows - 1) * pitchY);
        const startX = cols > 1 ? box.x + box.w / 2 - totalW / 2 : box.x + box.w / 2;
        const startY = rows > 1 ? box.y + box.h / 2 - totalH / 2 : box.y + box.h / 2;
        const seats = [];

        for (let r = 0; r < rows; r += 1) {
            for (let c = 0; c < cols; c += 1) {
                const center = { x: startX + c * pitchX, y: startY + r * pitchY };
                const classify = classifySeatAgainstPolygon(center, seatSize, angle, polygon);
                if (classify === "outside") continue;
                const row = indexToRowName(rowOffset + r);
                const col = colStart + c;
                seats.push(makeSeat(
                    section,
                    row,
                    col,
                    center,
                    seatSize,
                    angle,
                    classify === "inside" ? STATUS_AVAILABLE : STATUS_CANDIDATE
                ));
            }
        }

        const finalSeats = seats.filter((seat) => seat.status === STATUS_AVAILABLE);
        const bounds = getSeatBounds(finalSeats);
        const cleanButtonPolygon = createCleanButtonPolygonFromSeats(section, finalSeats, Math.max(6, seatSize * 0.7));
        state.layouts[section.sectionId] = {
            ...layout,
            rows,
            cols,
            seatSize,
            pitchX: round(pitchX),
            pitchY: round(pitchY),
            scanRows: rows,
            scanCols: cols,
            seatCount: finalSeats.length,
            candidateSeatCount: seats.length - finalSeats.length,
            actualBounds: bounds,
            buttonPolygon: cleanButtonPolygon,
            buttonShapeMode: cleanButtonPolygon?.length === 3 ? "TRIANGLE" : "SEAT_HULL",
            polygonCandidateOnly: finalSeats.length === 0 && seats.length > 0
        };
        return seats;
    }

    function buildSeatsForSection(section, layout, options = {}) {
        const polygon = section.layoutPolygon || section.polygon;
        const box = bboxOf(polygon);
        const rows = Math.max(1, positiveInt(layout.rows, 1));
        const cols = Math.max(1, positiveInt(layout.cols, 1));
        const pitchX = Math.max(1, Number(options.pitchX || layout.referencePitchX) || (box.w / cols));
        const pitchY = Math.max(1, Number(options.pitchY || layout.referencePitchY) || (box.h / rows));
        const autoSeatSize = Math.max(3, Math.min(pitchX, pitchY) * 0.64);
        const inputSeatSize = Number(layout.seatSize);
        const useAutoSeatSize = options.autoSeatSize === true || !Number.isFinite(inputSeatSize) || inputSeatSize <= 0;
        // Part 3 재추정은 같은 기준으로 여러 번 돌려야 하므로, 입력한 좌석 크기를 우선한다.
        // 기존처럼 inferenceMode만 보고 자동 크기로 덮어쓰면 두 번째 추정부터 값 변경이 안 먹는 것처럼 보인다.
        const seatSize = round(clamp(useAutoSeatSize ? autoSeatSize : inputSeatSize, 2, Math.max(2, Math.min(pitchX, pitchY) * 0.92)));
        const angle = normalizeAngle(Number(layout.seatAngle ?? 0) || 0);
        const rowOffset = rowNameToIndex(layout.rowStart || "A");
        const colStart = Math.max(1, positiveInt(layout.colStart, 1));

        // 같은 그룹 전체 재추정은 "구역별 행/열을 직접 맞추는 것"이 아니라
        // 기준 구역에서 구한 pitch를 같은 그룹 전체에 투영하는 방식이다.
        // 그래서 사다리꼴/ㄱ자/오차가 있는 도형은 bbox를 한 칸 정도 넓게 훑고,
        // polygon 내부는 확정, polygon 실선에 걸친 좌석은 후보로 남긴다.
        const scanByPitch = options.scanByPitch === true;
        const scanCols = scanByPitch ? Math.max(cols, Math.ceil((box.w + pitchX) / pitchX)) : cols;
        const scanRows = scanByPitch ? Math.max(rows, Math.ceil((box.h + pitchY) / pitchY)) : rows;
        const totalW = Math.max(0, (scanCols - 1) * pitchX);
        const totalH = Math.max(0, (scanRows - 1) * pitchY);
        const startX = box.x + box.w / 2 - totalW / 2;
        const startY = box.y + box.h / 2 - totalH / 2;
        const seats = [];

        for (let r = 0; r < scanRows; r += 1) {
            for (let c = 0; c < scanCols; c += 1) {
                const center = {
                    x: startX + c * pitchX,
                    y: startY + r * pitchY
                };
                let classify = classifySeatAgainstPolygon(center, seatSize, angle, polygon);
                if (classify === "outside") continue;
                const row = indexToRowName(rowOffset + r);
                const col = colStart + c;
                seats.push(makeSeat(section, row, col, center, seatSize, angle, classify === "candidate" ? STATUS_CANDIDATE : STATUS_AVAILABLE));
            }
        }

        const finalSeats = seats.filter((seat) => seat.status === STATUS_AVAILABLE);
        const bounds = getSeatBounds(finalSeats);
        const cleanButtonPolygon = createCleanButtonPolygonFromSeats(section, finalSeats, Math.max(6, seatSize * 0.7));
        state.layouts[section.sectionId] = {
            ...layout,
            rows,
            cols,
            seatSize,
            pitchX: round(pitchX),
            pitchY: round(pitchY),
            scanRows,
            scanCols,
            seatCount: finalSeats.length,
            candidateSeatCount: seats.length - finalSeats.length,
            actualBounds: bounds,
            buttonPolygon: cleanButtonPolygon,
            buttonShapeMode: cleanButtonPolygon?.length === 3 ? "TRIANGLE" : "SEAT_HULL",
            polygonCandidateOnly: finalSeats.length === 0 && seats.length > 0
        };
        return seats;
    }

    function makeSeat(section, row, col, center, size, angle, status = STATUS_AVAILABLE) {
        const floor = section.floor || "1";
        const sectionName = section.sectionName || section.name || section.section || "";
        const grade = section.grade || "일반석";
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

    function createStraightenedPolygonFromSection(section) {
        const box = bboxOf(section.layoutPolygon || section.polygon || []);
        return rectToPolygon(expandRect(box, 4));
    }


    // 좌석 외곽 기반 버튼 도형 생성
    // - Part 3/4에서는 좌석 생성/검수만 우선이라 과한 외곽 다듬기를 하지 않는다.
    // - Part 5에서도 계단식 좌석 외곽은 그대로 유지한다. 버튼 외곽선 처리는 Stage 5에서 담당한다.
    function createCleanButtonPolygonFromSeats(section, seats, padding = 8, options = {}) {
        const finalSeats = normalizeArray(seats)
            .filter((seat) => seat && seat.status === STATUS_AVAILABLE && hasSeatPoint(seat));
        if (!finalSeats.length) return createStraightenedPolygonFromSection(section);

        const bounds = getSeatBounds(finalSeats);
        if (!bounds) return createStraightenedPolygonFromSection(section);

        if (finalSeats.length <= 2) {
            return rectToPolygon(expandRect(bounds, Math.max(6, padding)));
        }

        const unionPoly = createSeatUnionOutlinePolygon(finalSeats, Math.max(2, padding * 0.25));
        if (unionPoly && unionPoly.length >= 3) {
            let cleaned = removeNearlyCollinearPoints(unionPoly, 8);
            cleaned = simplifyPolygon(cleaned, Math.max(1, Math.min(bounds.w, bounds.h) * 0.015));
            cleaned = removeNearlyCollinearPoints(cleaned, 8);

            // Stage 4 최종 도형은 확정 좌석 union 외곽을 그대로 사용한다.
            // 계단식 완만화/외곽선 처리는 다음 단계(Stage 5 버튼 생성)에서 수행한다.

            if (cleaned && cleaned.length >= 3) return cleaned.map(copyPoint);
        }

        const centers = finalSeats.map((seat) => ({ x: Number(seat.x), y: Number(seat.y) }));
        const rowProfiles = buildSeatRowProfiles(finalSeats);
        let poly = polygonFromRowProfiles(rowProfiles, Math.max(4, padding * 0.55));

        if (!poly || poly.length < 3) {
            poly = convexHull(centers);
        }

        if (!poly || poly.length < 3) {
            return rectToPolygon(expandRect(bounds, Math.max(6, padding)));
        }

        // 사각형으로 충분히 반듯한 경우는 사각형으로 확정한다.
        if (shouldUseRectForSeats(finalSeats, rowProfiles)) {
            return rectToPolygon(expandRect(bounds, Math.max(6, padding)));
        }

        poly = simplifyPolygon(poly, Math.max(4, Math.min(bounds.w, bounds.h) * 0.08));
        poly = removeNearlyCollinearPoints(poly, 10);

        // fallback에서만 단순 hull을 사용한다. union outline이 나온 경우는 절대 hull로 바꾸지 않는다.
        if (poly.length > 6) {
            poly = simplifyPolygon(convexHull(poly), Math.max(6, Math.min(bounds.w, bounds.h) * 0.14));
            poly = removeNearlyCollinearPoints(poly, 12);
        }

        poly = expandPolygonFromCenter(poly, Math.max(5, padding));
        return poly.map(copyPoint);
    }

    function createSeatUnionOutlinePolygon(seats, padding = 0) {
        const items = normalizeArray(seats)
            .filter((seat) => seat && hasSeatPoint(seat))
            .map((seat) => ({
                seat,
                x: Number(seat.x),
                y: Number(seat.y),
                size: Math.max(2, Number(seat.size) || 10),
                angle: normalizeAngle(Number(seat.angle) || 0)
            }))
            .filter((item) => Number.isFinite(item.x) && Number.isFinite(item.y));
        if (items.length < 3) return null;

        const bounds = getSeatBounds(items.map((item) => item.seat));
        const origin = bounds
            ? { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 }
            : {
                x: items.reduce((sum, item) => sum + item.x, 0) / items.length,
                y: items.reduce((sum, item) => sum + item.y, 0) / items.length
            };
        const angle = getDominantSeatAngle(items);
        const localItems = items.map((item) => ({
            ...item,
            local: rotatePoint({ x: item.x, y: item.y }, origin, -angle)
        }));
        const avgSize = localItems.reduce((sum, item) => sum + item.size, 0) / localItems.length;
        const pitchX = inferPitchFromValues(localItems.map((item) => item.local.x), avgSize);
        const pitchY = inferPitchFromValues(localItems.map((item) => item.local.y), avgSize);
        if (!Number.isFinite(pitchX) || !Number.isFinite(pitchY) || pitchX <= 0 || pitchY <= 0) return null;

        const halfW = Math.max(avgSize / 2, pitchX / 2);
        const halfH = Math.max(avgSize / 2, pitchY / 2);
        const precision = 1000;
        const q = (value) => Math.round(Number(value) * precision) / precision;
        const keyPoint = (pt) => `${q(pt.x)},${q(pt.y)}`;
        const edgeKey = (a, b) => {
            const ak = keyPoint(a);
            const bk = keyPoint(b);
            return ak < bk ? `${ak}|${bk}` : `${bk}|${ak}`;
        };
        const edges = new Map();
        const addEdge = (a, b) => {
            const qa = { x: q(a.x), y: q(a.y) };
            const qb = { x: q(b.x), y: q(b.y) };
            const key = edgeKey(qa, qb);
            if (edges.has(key)) edges.delete(key);
            else edges.set(key, { a: qa, b: qb, key });
        };

        localItems.forEach((item) => {
            const cx = q(item.local.x);
            const cy = q(item.local.y);
            const x1 = q(cx - halfW);
            const x2 = q(cx + halfW);
            const y1 = q(cy - halfH);
            const y2 = q(cy + halfH);
            const tl = { x: x1, y: y1 };
            const tr = { x: x2, y: y1 };
            const br = { x: x2, y: y2 };
            const bl = { x: x1, y: y2 };
            addEdge(tl, tr);
            addEdge(tr, br);
            addEdge(br, bl);
            addEdge(bl, tl);
        });

        const localPolygons = traceClosedPolygonsFromEdges(Array.from(edges.values()));
        if (!localPolygons.length) return null;
        const best = localPolygons
            .filter((poly) => poly.length >= 3)
            .sort((a, b) => Math.abs(polygonArea(b)) - Math.abs(polygonArea(a)))[0];
        if (!best || best.length < 3) return null;

        const cleanedLocal = removeNearlyCollinearPoints(best, 4);
        return cleanedLocal.map((point) => rotatePoint(point, origin, angle)).map(copyPoint);
    }

    function createSmoothedSeatProfilePolygon(seats, padding = 4) {
        const items = normalizeArray(seats)
            .filter((seat) => seat && seat.status === STATUS_AVAILABLE && hasSeatPoint(seat))
            .map((seat) => ({
                seat,
                x: Number(seat.x),
                y: Number(seat.y),
                size: Math.max(2, Number(seat.size) || 10),
                angle: normalizeAngle(Number(seat.angle) || 0)
            }))
            .filter((item) => Number.isFinite(item.x) && Number.isFinite(item.y));
        if (items.length < 4) return null;

        const bounds = getSeatBounds(items.map((item) => item.seat));
        if (!bounds) return null;
        const origin = { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 };
        const angle = getDominantSeatAngle(items);
        const localItems = items.map((item) => ({ ...item, local: rotatePoint({ x: item.x, y: item.y }, origin, -angle) }));
        const avgSize = localItems.reduce((sum, item) => sum + item.size, 0) / localItems.length;
        const pitchX = inferPitchFromValues(localItems.map((item) => item.local.x), avgSize);
        const pitchY = inferPitchFromValues(localItems.map((item) => item.local.y), avgSize);
        if (!Number.isFinite(pitchX) || !Number.isFinite(pitchY) || pitchX <= 0 || pitchY <= 0) return null;

        const rows = buildLocalSeatRows(localItems, pitchY, pitchX);
        if (rows.length < 3) return null;
        if (!rows.every((row) => row.isContiguous)) return null;

        const pad = Math.max(2, Number(padding) || 4);
        const leftEdge = smoothProfileSide(rows.map((row) => ({
            x: row.left - pad,
            y: row.y,
            count: row.count,
            row
        })), pitchX, "left");
        const rightEdge = smoothProfileSide(rows.map((row) => ({
            x: row.right + pad,
            y: row.y,
            count: row.count,
            row
        })), pitchX, "right");

        if (leftEdge.length < 2 || rightEdge.length < 2) return null;

        const topY = rows[0].top - pad;
        const bottomY = rows[rows.length - 1].bottom + pad;
        const localPoly = [];
        localPoly.push({ x: leftEdge[0].x, y: topY });
        localPoly.push({ x: rightEdge[0].x, y: topY });
        rightEdge.forEach((point) => localPoly.push({ x: point.x, y: point.y }));
        localPoly.push({ x: rightEdge[rightEdge.length - 1].x, y: bottomY });
        localPoly.push({ x: leftEdge[leftEdge.length - 1].x, y: bottomY });
        for (let i = leftEdge.length - 1; i >= 0; i -= 1) {
            localPoly.push({ x: leftEdge[i].x, y: leftEdge[i].y });
        }

        let cleaned = removeDuplicateAdjacentPoints(localPoly, 0.5);
        cleaned = removeNearlyCollinearPoints(cleaned, 7);
        cleaned = simplifyPolygon(cleaned, Math.max(1, Math.min(pitchX, pitchY) * 0.12));
        cleaned = removeDuplicateAdjacentPoints(cleaned, 0.5);
        if (!cleaned || cleaned.length < 3) return null;
        return cleaned.map((point) => rotatePoint(point, origin, angle)).map(copyPoint);
    }

    function buildLocalSeatRows(localItems, pitchY, pitchX) {
        const sorted = localItems.slice().sort((a, b) => a.local.y === b.local.y ? a.local.x - b.local.x : a.local.y - b.local.y);
        const rows = [];
        const rowTolerance = Math.max(1, pitchY * 0.38);
        sorted.forEach((item) => {
            let row = rows.find((candidate) => Math.abs(candidate.y - item.local.y) <= rowTolerance);
            if (!row) {
                row = { y: item.local.y, items: [] };
                rows.push(row);
            }
            row.items.push(item);
            row.y = row.items.reduce((sum, current) => sum + current.local.y, 0) / row.items.length;
        });
        return rows
            .map((row) => {
                const items = row.items.slice().sort((a, b) => a.local.x - b.local.x);
                const size = Math.max(2, items.reduce((sum, item) => sum + item.size, 0) / items.length);
                const gaps = [];
                for (let i = 1; i < items.length; i += 1) gaps.push(items[i].local.x - items[i - 1].local.x);
                const isContiguous = gaps.every((gap) => gap <= Math.max(pitchX * 1.45, size * 1.45));
                return {
                    y: row.y,
                    count: items.length,
                    left: items[0].local.x - size / 2,
                    right: items[items.length - 1].local.x + size / 2,
                    top: row.y - size / 2,
                    bottom: row.y + size / 2,
                    isContiguous
                };
            })
            .sort((a, b) => a.y - b.y);
    }

    function smoothProfileSide(points, pitchX, side) {
        const list = normalizeArray(points).filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
        if (list.length <= 2) return list.map(copyPoint);
        const result = [copyPoint(list[0])];
        let i = 1;
        const stepLimit = Math.max(2, Number(pitchX) * 1.35);
        while (i < list.length - 1) {
            const start = result[result.length - 1];
            let endIndex = i;
            let moved = 0;
            let lastDxSign = 0;
            let j = i;
            while (j < list.length) {
                const prev = j === 0 ? start : list[j - 1];
                const curr = list[j];
                const dx = curr.x - prev.x;
                if (Math.abs(dx) < 0.5) {
                    if (moved > 0) break;
                    endIndex = j;
                    j += 1;
                    continue;
                }
                if (Math.abs(dx) > stepLimit) break;
                const sign = Math.sign(dx);
                if (lastDxSign && sign !== lastDxSign) break;
                lastDxSign = sign;
                moved += 1;
                endIndex = j;
                j += 1;
            }

            // 3개 이상의 계단성 이동만 완만한 선으로 치환한다.
            // 한두 칸짜리 돌출은 의도된 ㄴ자/요철일 수 있으므로 그대로 둔다.
            if (moved >= 3) {
                const end = list[endIndex];
                result.push(copyPoint(end));
                i = endIndex + 1;
                continue;
            }

            result.push(copyPoint(list[i]));
            i += 1;
        }
        result.push(copyPoint(list[list.length - 1]));
        return removeDuplicateAdjacentPoints(result, 0.5);
    }

    function isSafeSmoothedButtonPolygon(smoothed, raw, seats) {
        const smooth = normalizePolygon(smoothed);
        const base = normalizePolygon(raw);
        if (!smooth || !base || smooth.length < 3 || base.length < 3) return false;
        const smoothArea = Math.abs(polygonArea(smooth));
        const baseArea = Math.abs(polygonArea(base));
        if (!smoothArea || !baseArea) return false;

        // 4번 그림 같은 억지 연결 방지:
        // 최종선이 raw union보다 과하게 넓어지면 계단 보정이 아니라 별도 블록을 덮은 것이다.
        const ratio = smoothArea / baseArea;
        if (ratio < 0.72 || ratio > 1.28) return false;

        const seatCount = normalizeArray(seats).filter((seat) => seat.status === STATUS_AVAILABLE).length;
        if (seatCount < 8 && smooth.length < base.length) return false;
        return true;
    }

    function removeDuplicateAdjacentPoints(points, tolerance = 0.25) {
        const poly = normalizeArray(points).filter((point) => Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y)));
        if (!poly.length) return [];
        const result = [];
        poly.forEach((point) => {
            const next = { x: round(point.x), y: round(point.y) };
            const prev = result[result.length - 1];
            if (!prev || Math.hypot(prev.x - next.x, prev.y - next.y) > tolerance) result.push(next);
        });
        if (result.length > 1) {
            const first = result[0];
            const last = result[result.length - 1];
            if (Math.hypot(first.x - last.x, first.y - last.y) <= tolerance) result.pop();
        }
        return result;
    }

    function getDominantSeatAngle(items) {
        const counts = new Map();
        normalizeArray(items).forEach((item) => {
            const angle = normalizeAngle(Number(item.angle) || 0);
            const key = String(Math.round(angle / 5) * 5);
            counts.set(key, (counts.get(key) || 0) + 1);
        });
        let bestKey = "0";
        let bestCount = -1;
        counts.forEach((count, key) => {
            if (count > bestCount) {
                bestCount = count;
                bestKey = key;
            }
        });
        return Number(bestKey) || 0;
    }

    function inferPitchFromValues(values, fallbackSize = 10) {
        const sorted = normalizeArray(values)
            .map((value) => Number(value))
            .filter(Number.isFinite)
            .sort((a, b) => a - b);
        if (sorted.length < 2) return Math.max(1, Number(fallbackSize) || 10);
        const unique = [];
        sorted.forEach((value) => {
            const last = unique[unique.length - 1];
            if (last === undefined || Math.abs(value - last) > 0.75) unique.push(value);
        });
        const diffs = [];
        for (let i = 1; i < unique.length; i += 1) {
            const diff = unique[i] - unique[i - 1];
            if (diff > Math.max(1, fallbackSize * 0.35)) diffs.push(diff);
        }
        if (!diffs.length) return Math.max(1, Number(fallbackSize) || 10);
        diffs.sort((a, b) => a - b);
        const mid = Math.floor(diffs.length / 2);
        return diffs.length % 2 ? diffs[mid] : (diffs[mid - 1] + diffs[mid]) / 2;
    }


    function polygonArea(points) {
        const poly = normalizePolygon(points);
        if (!poly || poly.length < 3) return 0;
        let area = 0;
        for (let i = 0; i < poly.length; i += 1) {
            const a = poly[i];
            const b = poly[(i + 1) % poly.length];
            area += Number(a.x || 0) * Number(b.y || 0) - Number(b.x || 0) * Number(a.y || 0);
        }
        return area / 2;
    }

    function traceClosedPolygonsFromEdges(edgeList) {
        const edges = normalizeArray(edgeList);
        if (!edges.length) return [];
        const pointKey = (pt) => `${pt.x},${pt.y}`;
        const pointFromKey = (key) => {
            const [x, y] = key.split(",").map(Number);
            return { x, y };
        };
        const adjacency = new Map();
        const addAdj = (from, to, key) => {
            const fk = pointKey(from);
            const tk = pointKey(to);
            if (!adjacency.has(fk)) adjacency.set(fk, []);
            adjacency.get(fk).push({ key, toKey: tk });
        };
        edges.forEach((edge) => {
            addAdj(edge.a, edge.b, edge.key);
            addAdj(edge.b, edge.a, edge.key);
        });

        const visited = new Set();
        const polygons = [];
        edges.forEach((edge) => {
            if (visited.has(edge.key)) return;
            const startKey = pointKey(edge.a);
            let currentKey = startKey;
            let prevKey = null;
            const poly = [];
            let guard = 0;
            while (guard < edges.length + 10) {
                guard += 1;
                poly.push(pointFromKey(currentKey));
                const nextEdges = normalizeArray(adjacency.get(currentKey))
                    .filter((item) => !visited.has(item.key));
                if (!nextEdges.length) break;
                let next = nextEdges[0];
                if (prevKey && nextEdges.length > 1) {
                    const nonBack = nextEdges.find((item) => item.toKey !== prevKey);
                    if (nonBack) next = nonBack;
                }
                visited.add(next.key);
                prevKey = currentKey;
                currentKey = next.toKey;
                if (currentKey === startKey) {
                    if (poly.length >= 3) polygons.push(poly.map(copyPoint));
                    break;
                }
            }
        });
        return polygons;
    }

    function buildSeatRowProfiles(seats) {
        const rows = new Map();
        normalizeArray(seats).forEach((seat) => {
            const rowKey = String(seat.row || "").toUpperCase();
            if (!rows.has(rowKey)) rows.set(rowKey, []);
            rows.get(rowKey).push(seat);
        });
        return Array.from(rows.values())
            .map((items) => {
                const sorted = items.slice().sort((a, b) => Number(a.x) - Number(b.x));
                const left = sorted[0];
                const right = sorted[sorted.length - 1];
                const avgY = sorted.reduce((sum, seat) => sum + Number(seat.y || 0), 0) / sorted.length;
                return {
                    row: String(left.row || ""),
                    y: avgY,
                    count: sorted.length,
                    leftX: Number(left.x),
                    rightX: Number(right.x),
                    seatSize: Math.max(...sorted.map((seat) => Number(seat.size) || 10))
                };
            })
            .sort((a, b) => a.y - b.y);
    }

    function polygonFromRowProfiles(rowProfiles, pad) {
        if (!rowProfiles.length) return null;
        if (rowProfiles.length === 1) {
            const row = rowProfiles[0];
            return rectToPolygon({
                x: row.leftX - row.seatSize / 2 - pad,
                y: row.y - row.seatSize / 2 - pad,
                w: (row.rightX - row.leftX) + row.seatSize + pad * 2,
                h: row.seatSize + pad * 2
            });
        }

        const left = [];
        const right = [];
        rowProfiles.forEach((row) => {
            const half = Math.max(2, row.seatSize / 2 + pad);
            left.push({ x: row.leftX - half, y: row.y });
            right.push({ x: row.rightX + half, y: row.y });
        });

        const profilePoly = left.concat(right.reverse());
        return convexHull(profilePoly);
    }

    function shouldUseRectForSeats(seats, rowProfiles) {
        if (rowProfiles.length < 2) return true;
        const counts = rowProfiles.map((row) => row.count);
        const minCount = Math.min(...counts);
        const maxCount = Math.max(...counts);
        const widths = rowProfiles.map((row) => row.rightX - row.leftX);
        const minWidth = Math.min(...widths);
        const maxWidth = Math.max(...widths);
        const countStable = maxCount - minCount <= 1;
        const widthStable = maxWidth <= 0 || (maxWidth - minWidth) / maxWidth < 0.18;
        return countStable && widthStable && seats.length >= rowProfiles.length * 2;
    }

    function convexHull(points) {
        const pts = normalizeArray(points)
            .map((point) => ({ x: Number(point.x), y: Number(point.y) }))
            .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
            .sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);
        const uniquePts = [];
        pts.forEach((point) => {
            const last = uniquePts[uniquePts.length - 1];
            if (!last || Math.abs(last.x - point.x) > 0.001 || Math.abs(last.y - point.y) > 0.001) uniquePts.push(point);
        });
        if (uniquePts.length <= 2) return uniquePts;
        const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
        const lower = [];
        uniquePts.forEach((point) => {
            while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
            lower.push(point);
        });
        const upper = [];
        for (let i = uniquePts.length - 1; i >= 0; i -= 1) {
            const point = uniquePts[i];
            while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
            upper.push(point);
        }
        lower.pop();
        upper.pop();
        return lower.concat(upper).map(copyPoint);
    }

    function simplifyPolygon(points, epsilon) {
        const poly = normalizePolygon(points);
        if (!poly || poly.length <= 4) return poly;
        let result = poly.slice();
        let changed = true;
        const limit = Math.max(1, Number(epsilon) || 1);
        while (changed && result.length > 3) {
            changed = false;
            for (let i = 0; i < result.length; i += 1) {
                const prev = result[(i - 1 + result.length) % result.length];
                const curr = result[i];
                const next = result[(i + 1) % result.length];
                if (distancePointSegment(curr, prev, next) <= limit) {
                    result.splice(i, 1);
                    changed = true;
                    break;
                }
            }
        }
        return result.map(copyPoint);
    }

    function removeNearlyCollinearPoints(points, angleToleranceDeg = 10) {
        const poly = normalizePolygon(points);
        if (!poly || poly.length <= 3) return poly;
        const result = [];
        for (let i = 0; i < poly.length; i += 1) {
            const prev = poly[(i - 1 + poly.length) % poly.length];
            const curr = poly[i];
            const next = poly[(i + 1) % poly.length];
            const a1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
            const a2 = Math.atan2(next.y - curr.y, next.x - curr.x);
            let diff = Math.abs(radToDeg(a2 - a1));
            diff = Math.min(diff, 360 - diff);
            if (diff < angleToleranceDeg || Math.abs(diff - 180) < angleToleranceDeg) continue;
            result.push(curr);
        }
        return result.length >= 3 ? result.map(copyPoint) : poly.map(copyPoint);
    }

    function expandPolygonFromCenter(points, padding) {
        const poly = normalizePolygon(points);
        if (!poly) return null;
        const center = polygonCenter(poly);
        return poly.map((point) => {
            const dx = point.x - center.x;
            const dy = point.y - center.y;
            const length = Math.hypot(dx, dy) || 1;
            return {
                x: round(point.x + (dx / length) * padding),
                y: round(point.y + (dy / length) * padding)
            };
        });
    }

    function clearSelectedSectionSeats() {
        const section = getSelectedSection();
        if (!section) {
            toast("구역을 선택하세요.");
            return;
        }
        state.seats = state.seats.filter((seat) => seat.sectionId !== section.sectionId);
        invalidateSeatIndex();
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
        toast(state.tool === "add-seat" ? "좌클릭 추가 / 우클릭 삭제: 클릭 근처 행렬 위치에 좌석을 생성합니다." : "선택 모드로 전환했습니다. Part 3에서는 Shift+클릭으로 좌석을 선택할 수 있습니다.");
    }


    function selectSectionLight(section) {
        if (!section || !section.sectionId) return;
        state.selectedSectionId = section.sectionId;
        state.activeGroupKey = getGroupKey(section) || state.activeGroupKey;
        state.selectedSeatIds.clear();
        restoreLayoutToInputs(section);
    }

    function addManualSeat(point, preferredSection = null) {
        const section = preferredSection || findSectionAt(point) || getSelectedSection();
        if (!section) {
            toast("먼저 구역을 선택하세요.");
            return;
        }

        // 수동 좌석 추가는 자동 추정과 다르게 원본 polygon 포함 여부를 따지지 않는다.
        // 클릭 위치와 가장 가까운 행/열 기준점에 스냅해서 행렬 정렬을 유지한다.
        selectSectionLight(section);
        const snap = snapManualSeatToGrid(section, point);
        const row = snap.row;
        const col = snap.col;

        const duplicated = getSectionSeats(section).some((seat) => {
            if (seat.status === "REMOVED") return false;
            return String(seat.row || "").toUpperCase() === String(row).toUpperCase() && Number(seat.col) === Number(col);
        });
        if (duplicated) {
            toast(`${section.sectionName} ${row}-${col} 좌석이 이미 있습니다.`);
            return;
        }

        const seat = makeSeat(section, row, col, snap.point, snap.size, snap.angle, STATUS_AVAILABLE);
        state.seats.push(seat);
        invalidateSeatIndex();
        if (dom.manualRowInput) dom.manualRowInput.value = row;
        if (dom.manualColInput) dom.manualColInput.value = col + 1;
        updateLayoutActualBounds(section);
        persistLocalWork();
        syncAll();
        toast(`${section.sectionName} ${row}-${col} 좌석 추가`);
    }

    function snapManualSeatToGrid(section, point) {
        const layout = state.layouts[section.sectionId] || defaultLayout(section);
        const polygon = section.layoutPolygon || section.polygon || [];
        const box = bboxOf(polygon);
        const rows = Math.max(1, positiveInt(layout.rows, 1));
        const cols = Math.max(1, positiveInt(layout.cols, 1));
        const pitchX = Math.max(1, Number(layout.pitchX || layout.referencePitchX) || (box.w / cols) || ((Number(layout.seatSize) || 10) + (Number(layout.gapX) || 0)));
        const pitchY = Math.max(1, Number(layout.pitchY || layout.referencePitchY) || (box.h / rows) || ((Number(layout.seatSize) || 10) + (Number(layout.gapY) || 0)));
        const totalW = Math.max(0, (cols - 1) * pitchX);
        const totalH = Math.max(0, (rows - 1) * pitchY);
        const startX = box.x + box.w / 2 - totalW / 2;
        const startY = box.y + box.h / 2 - totalH / 2;
        let c = Math.round((point.x - startX) / pitchX);
        let r = Math.round((point.y - startY) / pitchY);
        c = Math.max(0, c);
        r = Math.max(0, r);

        // 기준 그리드 바깥쪽에 추가하면 행/열 수를 자연스럽게 확장한다.
        if (r + 1 > rows) layout.rows = r + 1;
        if (c + 1 > cols) layout.cols = c + 1;
        layout.pitchX = round(pitchX);
        layout.pitchY = round(pitchY);
        state.layouts[section.sectionId] = layout;

        const rowOffset = rowNameToIndex(layout.rowStart || dom.manualRowInput?.value || "A");
        const colStart = Math.max(1, positiveInt(layout.colStart ?? dom.manualColInput?.value, 1));
        const row = indexToRowName(rowOffset + r);
        const col = colStart + c;
        return {
            row,
            col,
            point: { x: round(startX + c * pitchX), y: round(startY + r * pitchY) },
            size: Math.max(2, Number(layout.seatSize || dom.seatSizeInput?.value) || 10),
            angle: normalizeAngle(Number(layout.seatAngle) || 0)
        };
    }

    function deleteSeatAtPoint(point) {
        const hitSeat = findSeatAt(point);
        if (!hitSeat) {
            toast("삭제할 좌석이 없습니다.");
            return false;
        }
        const section = findSectionById(hitSeat.sectionId);
        state.seats = state.seats.filter((seat) => seat.id !== hitSeat.id);
        invalidateSeatIndex();
        state.selectedSeatIds.delete(hitSeat.id);
        if (section) {
            selectSectionLight(section);
            updateLayoutActualBounds(section);
        }
        persistLocalWork();
        syncAll();
        toast(`${hitSeat.sectionName} ${hitSeat.row}-${hitSeat.col} 좌석 삭제`);
        return true;
    }


    function confirmSelectedCandidateSeats() {
        const section = getSelectedSection();
        const selectedCandidateIds = Array.from(state.selectedSeatIds)
            .filter((id) => state.seats.some((seat) => seat.id === id && seat.status === STATUS_CANDIDATE));
        const confirmWholeSection = section && selectedCandidateIds.length === 0;

        if (!section && selectedCandidateIds.length === 0) {
            toast("확정할 구역 또는 걸친 후보 좌석을 선택하세요.");
            return;
        }

        let changed = 0;
        const affected = new Set();
        state.seats.forEach((seat) => {
            const target = confirmWholeSection
                ? seat.sectionId === section.sectionId && seat.status === STATUS_CANDIDATE
                : state.selectedSeatIds.has(seat.id) && seat.status === STATUS_CANDIDATE;
            if (!target) return;
            seat.status = STATUS_AVAILABLE;
            seat.id = buildSeatId(seat.floor, seat.sectionName, seat.row, seat.col, seat.grade, STATUS_AVAILABLE);
            affected.add(seat.sectionId);
            changed += 1;
        });

        if (!changed) {
            toast(confirmWholeSection ? `${section.sectionName} 구역에 걸친 후보 좌석이 없습니다.` : "선택한 걸친 후보 좌석이 없습니다.");
            return;
        }

        state.selectedSeatIds.clear();
        invalidateSeatIndex();
        affected.forEach((id) => updateLayoutActualBounds(findSectionById(id)));
        persistLocalWork();
        syncAll();
        toast(confirmWholeSection ? `${section.sectionName} 걸친 후보 좌석 ${changed}개를 전부 확정했습니다.` : `걸친 후보 좌석 ${changed}개를 확정했습니다.`);
    }


    function rejectSelectedCandidateSeats() {
        const section = getSelectedSection();
        const selectedCandidateIds = Array.from(state.selectedSeatIds)
            .filter((id) => state.seats.some((seat) => seat.id === id && seat.status === STATUS_CANDIDATE));
        const rejectWholeSection = section && selectedCandidateIds.length === 0;

        if (!section && selectedCandidateIds.length === 0) {
            toast("제외할 구역 또는 걸친 후보 좌석을 선택하세요.");
            return;
        }

        const affected = new Set();
        let changed = 0;
        state.seats = state.seats.filter((seat) => {
            const target = rejectWholeSection
                ? seat.sectionId === section.sectionId && seat.status === STATUS_CANDIDATE
                : state.selectedSeatIds.has(seat.id) && seat.status === STATUS_CANDIDATE;
            if (target) {
                affected.add(seat.sectionId);
                changed += 1;
                return false;
            }
            return true;
        });

        if (!changed) {
            toast(rejectWholeSection ? `${section.sectionName} 구역에 제외할 후보 좌석이 없습니다.` : "선택한 후보 좌석이 없습니다.");
            return;
        }

        state.selectedSeatIds.clear();
        invalidateSeatIndex();
        affected.forEach((id) => updateLayoutActualBounds(findSectionById(id)));
        persistLocalWork();
        syncAll();
        toast(rejectWholeSection ? `${section.sectionName} 후보 좌석 ${changed}개를 제외했습니다.` : `후보 좌석 ${changed}개를 제외했습니다.`);
    }

    function confirmActiveGroupCandidateSeats() {
        const selected = getSelectedSection();
        const groupKey = cleanText(state.activeGroupKey || (selected ? getGroupKey(selected) : dom.groupFilter?.value), "");
        if (!groupKey || groupKey === "__all") {
            toast("후보를 확정할 그룹을 먼저 선택하세요.");
            return;
        }
        const targetIds = new Set(getSectionsForGroupKeyLoose(groupKey).map((section) => String(section.sectionId)));
        if (!targetIds.size) {
            toast(`${groupKey} 그룹 구역을 찾을 수 없습니다.`);
            return;
        }

        let changed = 0;
        const affected = new Set();
        state.seats.forEach((seat) => {
            if (!targetIds.has(String(seat.sectionId)) || seat.status !== STATUS_CANDIDATE) return;
            seat.status = STATUS_AVAILABLE;
            seat.id = buildSeatId(seat.floor, seat.sectionName, seat.row, seat.col, seat.grade, STATUS_AVAILABLE);
            affected.add(seat.sectionId);
            changed += 1;
        });

        if (!changed) {
            toast(`${groupKey} 그룹에 걸친 후보 좌석이 없습니다.`);
            return;
        }

        state.selectedSeatIds.clear();
        invalidateSeatIndex();
        affected.forEach((id) => updateLayoutActualBounds(findSectionById(id)));
        persistLocalWork();
        syncAll();
        toast(`${groupKey} 그룹 걸친 후보 좌석 ${changed}개를 전부 확정했습니다.`);
    }


    function rejectActiveGroupCandidateSeats() {
        const selected = getSelectedSection();
        const groupKey = cleanText(state.activeGroupKey || (selected ? getGroupKey(selected) : dom.groupFilter?.value), "");
        if (!groupKey || groupKey === "__all") {
            toast("후보를 제외할 그룹을 먼저 선택하세요.");
            return;
        }
        const targetIds = new Set(getSectionsForGroupKeyLoose(groupKey).map((section) => String(section.sectionId)));
        if (!targetIds.size) {
            toast(`${groupKey} 그룹 구역을 찾을 수 없습니다.`);
            return;
        }

        const affected = new Set();
        let changed = 0;
        state.seats = state.seats.filter((seat) => {
            const target = targetIds.has(String(seat.sectionId)) && seat.status === STATUS_CANDIDATE;
            if (target) {
                affected.add(seat.sectionId);
                changed += 1;
                return false;
            }
            return true;
        });

        if (!changed) {
            toast(`${groupKey} 그룹에 제외할 후보 좌석이 없습니다.`);
            return;
        }

        state.selectedSeatIds.clear();
        invalidateSeatIndex();
        affected.forEach((id) => updateLayoutActualBounds(findSectionById(id)));
        persistLocalWork();
        syncAll();
        toast(`${groupKey} 그룹 후보 좌석 ${changed}개를 제외했습니다.`);
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
        invalidateSeatIndex();
        affected.forEach((id) => updateLayoutActualBounds(findSectionById(id)));
        persistLocalWork();
        syncAll();
        toast("선택 좌석을 삭제했습니다.");
    }

    function handlePointerDown(event) {
        const point = canvasPoint(event);
        if (!point) return;

        if (event.button === 2) {
            event.preventDefault?.();
            if (state.activePart === 4) deleteSeatAtPoint(point);
            return;
        }

        if (state.activePart === 1) {
            const hitSection = findSectionAt(point);
            if (hitSection) selectSection(hitSection.sectionId);
            else {
                state.selectedSeatIds.clear();
                syncAll();
            }
            return;
        }

        if (state.activePart === 2 || state.activePart === 3) {
            const rotateHit = findRotateHandleAt(point);
            if (rotateHit) {
                beginRotateSection(rotateHit, point, event);
                return;
            }

            const hitSection = findSectionAt(point);
            if (hitSection) {
                selectSection(hitSection.sectionId);
                if (canEditSectionTransform()) {
                    const layout = state.layouts[hitSection.sectionId] || defaultLayout(hitSection);
                    state.drag = {
                        type: "section",
                        sectionId: hitSection.sectionId,
                        start: point,
                        layoutX: Number(layout.layoutX || 0),
                        layoutY: Number(layout.layoutY || 0)
                    };
                    overlay.setPointerCapture?.(event.pointerId);
                }
            } else {
                state.selectedSeatIds.clear();
                syncAll();
            }
            return;
        }


        if (state.activePart === 5) {
            const hitSection = findFinalSectionAt(point);
            if (hitSection) {
                selectSectionForPart5(hitSection.sectionId);
                beginFinalSectionDrag(hitSection, point, event);
            } else {
                state.selectedSectionId = "";
                drawBase();
                drawOverlay();
            }
            return;
        }

        if (state.activePart === 4 && event.button === 0) {
            state.drag = {
                type: "seat-select",
                start: point,
                current: point,
                additive: Boolean(event.shiftKey)
            };
            overlay.setPointerCapture?.(event.pointerId);
            return;
        }

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
            selectSection(hitSection.sectionId);
            if (canEditSectionTransform()) {
                const layout = state.layouts[hitSection.sectionId] || defaultLayout(hitSection);
                state.drag = {
                    type: "section",
                    sectionId: hitSection.sectionId,
                    start: point,
                    layoutX: Number(layout.layoutX || 0),
                    layoutY: Number(layout.layoutY || 0)
                };
                overlay.setPointerCapture?.(event.pointerId);
            }
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


        if (state.drag?.type === "seat-select") {
            state.drag.current = point;
            requestDrawOverlay();
            return;
        }

        if (state.drag?.type === "final-section") {
            updateFinalSectionDrag(point);
            return;
        }

        const allowSeatHover = state.activePart === 4;
        const hit = allowSeatHover ? findSeatAt(point) : null;
        const hitSection = hit ? findSectionById(hit.sectionId) : findSectionAt(point);
        const nextSeatId = allowSeatHover ? (hit?.id || "") : "";
        const nextSectionId = hitSection?.sectionId || "";
        const prevSectionId = state.hoverSectionId;
        const changed = state.hoverSeatId !== nextSeatId || state.hoverSectionId !== nextSectionId;
        state.hoverSeatId = nextSeatId;
        state.hoverSectionId = nextSectionId;
        if (changed) {
            requestDrawOverlay();
            if (prevSectionId !== nextSectionId) requestRenderMiniMapOverlay();
        }
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
        } else if (state.drag?.type === "seat-select") {
            finishSeatSelectionDrag(event);
        } else if (state.drag?.type === "final-section") {
            finishFinalSectionDrag(event);
        }
        state.drag = null;
        overlay.releasePointerCapture?.(event.pointerId);
    }


    function finishSeatSelectionDrag(event) {
        const drag = state.drag;
        const end = canvasPoint(event) || drag.current || drag.start;
        const move = distance(drag.start, end);
        if (move < 6) {
            addManualSeat(drag.start, findSectionAt(drag.start));
            return;
        }
        const rect = normalizeRectFromPoints(drag.start, end);
        if (!drag.additive) state.selectedSeatIds.clear();
        let count = 0;
        state.seats.forEach((seat) => {
            if (seat.status === "REMOVED" || !isSeatVisibleOnBoard(seat)) return;
            if (pointInRect({ x: Number(seat.x), y: Number(seat.y) }, rect)) {
                state.selectedSeatIds.add(seat.id);
                count += 1;
            }
        });
        drawOverlay();
        toast(`드래그 선택 좌석 ${count}개`);
    }

    function drawSeatSelectionRect(targetCtx) {
        if (state.drag?.type !== "seat-select") return;
        const rect = normalizeRectFromPoints(state.drag.start, state.drag.current || state.drag.start);
        if (!rect || rect.w < 2 || rect.h < 2) return;
        targetCtx.save();
        targetCtx.fillStyle = "rgba(37,99,235,0.08)";
        targetCtx.strokeStyle = "rgba(37,99,235,0.9)";
        targetCtx.lineWidth = 1.6;
        targetCtx.setLineDash([6, 4]);
        targetCtx.fillRect(rect.x, rect.y, rect.w, rect.h);
        targetCtx.strokeRect(rect.x, rect.y, rect.w, rect.h);
        targetCtx.restore();
    }

    function normalizeRectFromPoints(a, b) {
        const x1 = Number(a?.x) || 0;
        const y1 = Number(a?.y) || 0;
        const x2 = Number(b?.x) || 0;
        const y2 = Number(b?.y) || 0;
        return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
    }

    function pointInRect(point, rect) {
        return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
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
        if (!canEditSectionTransform()) {
            toast("구역 회전은 Part 2/3에서 가능합니다.");
            return;
        }
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

    function canEditSectionTransform() {
        return state.activePart === 2 || state.activePart === 3;
    }

    function canResizeSeats() {
        // 빨간 결과선/buttonPolygon은 직접 드래그 컨트롤 대상이 아니다.
        return false;
    }

    function findRotateHandleAt(point) {
        if (!canEditSectionTransform()) return null;
        const section = getSelectedSection();
        const handle = section ? getRotateHandle(section) : null;
        return handle && distance(point, handle) <= 12 ? section : null;
    }

    function findResizeHandleAt(point) {
        if (!canResizeSeats()) return null;
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
        const index = getVisibleSeatSpatialIndex();
        const gx = Math.floor(Number(point.x || 0) / index.cellSize);
        const gy = Math.floor(Number(point.y || 0) / index.cellSize);
        const candidates = index.map.get(`${gx}:${gy}`) || [];
        for (let i = candidates.length - 1; i >= 0; i -= 1) {
            const seat = candidates[i];
            if (seat.status === "REMOVED" || !isSeatVisibleOnBoard(seat)) continue;
            const size = Math.max(3, Number(seat.size) || 10);
            if (pointInRotatedRect(point, { x: Number(seat.x), y: Number(seat.y) }, size + 4, seat.angle || 0)) return seat;
        }
        return null;
    }

    function findSectionAt(point) {
        const visibleSections = state.sections.filter(isSectionVisibleOnBoard);
        for (let i = visibleSections.length - 1; i >= 0; i -= 1) {
            const section = visibleSections[i];
            if (isInsideOrEdge(point, getDisplayPolygon(section))) return section;
        }
        return null;
    }

    function syncAll() {
        invalidateSeatIndex();
        syncToolState();
        syncGroupFilter();
        syncSectionSelect();
        syncSectionList();
        syncInfo();
        syncJsonPreview();
        syncGroupJumpBar();
        drawBase();
        drawOverlay();
        renderMiniMapOverlay();
    }

    function syncToolState() {
        if (dom.manualAddBtn) {
            dom.manualAddBtn.classList.toggle("is-active", state.tool === "add-seat");
            dom.manualAddBtn.textContent = state.tool === "add-seat" ? "좌클릭 추가 모드 종료" : "좌클릭 추가 / 우클릭 삭제";
        }
        if (dom.canvasBox) {
            dom.canvasBox.classList.toggle("is-add-mode", state.tool === "add-seat" && state.activePart === 4);
            dom.canvasBox.classList.toggle("is-final-edit", state.activePart === 5);
        }
    }

    function syncGroupFilter() {
        if (!dom.groupFilter) return;
        const selected = state.activePart > 1 && state.activeGroupKey ? state.activeGroupKey : (dom.groupFilter.value || "__all");
        const groups = unique(state.sections.map((section) => section.groupKey || "미지정"));
        const options = [`<option value="__all">전체 그룹</option>`]
            .concat(groups.map((group) => `<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`));
        dom.groupFilter.innerHTML = options.join("");
        dom.groupFilter.value = selected === "__all" || groups.includes(selected) ? selected : "__all";
    }

    function syncSectionSelect() {
        if (!dom.sectionSelect) return;
        const group = state.activePart > 1 && state.activeGroupKey ? state.activeGroupKey : (dom.groupFilter?.value || "__all");
        const list = state.sections.filter((section) => group === "__all" || getGroupKey(section) === group);
        dom.sectionSelect.innerHTML = list.map((section) => {
            const count = getSectionSeats(section).length;
            return `<option value="${escapeHtml(section.sectionId)}">${escapeHtml(section.sectionName || section.sectionId)} (${count})</option>`;
        }).join("");
        if (state.selectedSectionId) dom.sectionSelect.value = state.selectedSectionId;
    }

    function syncSectionList() {
        if (!dom.sectionList) return;
        const group = state.activePart > 1 && state.activeGroupKey ? state.activeGroupKey : (dom.groupFilter?.value || "__all");
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

        const seatCountMap = buildSeatCountMap(true);
        dom.sectionList.innerHTML = filtered.sort(compareSection).map((section) => {
            const active = section.sectionId === state.selectedSectionId ? " active" : "";
            const count = seatCountMap.get(String(section.sectionId)) || 0;
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
            button.addEventListener("mouseenter", () => setHoverSection(button.dataset.sectionId));
            button.addEventListener("mouseleave", () => setHoverSection(""));
        });
    }



    function buildSeatCountMap(includeCandidate = true) {
        const map = new Map();
        state.seats.forEach((seat) => {
            if (seat.status === "REMOVED") return;
            if (!includeCandidate && seat.status === STATUS_CANDIDATE) return;
            const key = String(seat.sectionId);
            map.set(key, (map.get(key) || 0) + 1);
        });
        return map;
    }

    function countSeatsForSectionFast(sectionId, includeCandidate = true) {
        if (!sectionId) return 0;
        let count = 0;
        state.seats.forEach((seat) => {
            if (String(seat.sectionId) !== String(sectionId) || seat.status === "REMOVED") return;
            if (!includeCandidate && seat.status === STATUS_CANDIDATE) return;
            count += 1;
        });
        return count;
    }

    function countFinalSeatsFast() {
        let count = 0;
        state.seats.forEach((seat) => {
            if (seat.status !== "REMOVED" && seat.status !== STATUS_CANDIDATE) count += 1;
        });
        return count;
    }

    function countSectionsWithSeatsFast() {
        return buildSeatCountMap(true).size;
    }

    function createFinalSeatPreview(limit = 10) {
        const preview = [];
        const seen = new Set();
        for (const seat of state.seats) {
            if (seat.status === "REMOVED" || seat.status === STATUS_CANDIDATE) continue;
            const section = findSectionForSeat(seat);
            const normalized = normalizeSeatForSave(seat, section);
            if (!normalized || seen.has(normalized.id)) continue;
            seen.add(normalized.id);
            preview.push(normalized);
            if (preview.length >= limit) break;
        }
        return preview;
    }

    function syncInfo() {
        const section = getSelectedSection();
        const sectionSeatCount = countSeatsForSectionFast(section?.sectionId, true);
        const finalSeatCount = countFinalSeatsFast();
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
        setText(dom.infoSectionSeats, String(sectionSeatCount));
        setText(dom.infoSelectedSeats, String(state.selectedSeatIds.size));
        setText(dom.totalSections, String(state.sections.length));
        setText(dom.totalSeats, String(finalSeatCount));
        const overlapText = finalSeatCount > 3000 ? " · 겹침 검사는 저장 시 확인" : "";
        setText(dom.saveSummary, `저장할 좌석 ID ${finalSeatCount}개 · 실제 구역 확정 ${countSectionsWithSeatsFast()}개${overlapText}`);
    }

    function syncJsonPreview() {
        if (!dom.jsonPreview) return;
        const preview = createFinalSeatPreview(10);
        const total = countFinalSeatsFast();
        dom.jsonPreview.textContent = JSON.stringify(preview, null, 2) + (total > preview.length ? "\n..." : "");
    }

    function setText(element, value) {
        if (element) element.textContent = value;
    }

    function setHoverSection(sectionId) {
        const nextId = sectionId || "";
        if (state.hoverSectionId === nextId) return;
        state.hoverSectionId = nextId;
        requestDrawOverlay();
        requestRenderMiniMapOverlay();
    }

    function renderMiniMapOverlay() {
        const canvasEl = dom.miniOverlay;
        if (!canvasEl) return;
        const miniCtx = canvasEl.getContext("2d");
        if (!miniCtx) return;

        const image = state.sourceImage;
        const width = Math.max(1, Math.round(image?.naturalWidth || image?.width || state.width || 1));
        const height = Math.max(1, Math.round(image?.naturalHeight || image?.height || state.height || 1));
        if (canvasEl.width !== width) canvasEl.width = width;
        if (canvasEl.height !== height) canvasEl.height = height;
        miniCtx.clearRect(0, 0, width, height);

        const focusId = state.hoverSectionId || state.selectedSectionId || "";
        const focus = findSectionById(focusId);
        if (dom.miniMapBox) dom.miniMapBox.classList.toggle("has-focus", Boolean(focus));

        miniCtx.save();
        state.sections.forEach((section) => {
            const poly = normalizePolygon(section.originalPolygon || section.polygon);
            if (!poly) return;
            const isFocus = focus && section.sectionId === focus.sectionId;
            miniCtx.beginPath();
            drawPolyPath(miniCtx, poly);
            miniCtx.closePath();
            miniCtx.fillStyle = hexToRgba(section.renderColor || section.color || section.sourceColor || "#94a3b8", isFocus ? 0.78 : 0.04);
            miniCtx.strokeStyle = isFocus ? "#ef4444" : "rgba(15,23,42,0.10)";
            miniCtx.lineWidth = isFocus ? 3.5 : 0.8;
            miniCtx.setLineDash(isFocus ? [] : [3, 4]);
            miniCtx.fill();
            miniCtx.stroke();
        });
        miniCtx.restore();

        if (dom.miniFocusName) {
            if (focus) {
                dom.miniFocusName.classList.add("is-active");
                dom.miniFocusName.textContent = `현재 위치 확인: ${focus.sectionName || focus.sectionId} / ${focus.groupKey || "미지정"} 그룹`;
            } else {
                dom.miniFocusName.classList.remove("is-active");
                dom.miniFocusName.textContent = "구역에 커서를 올리면 원본 위치를 진하게 표시합니다.";
            }
        }
    }

    function drawOverlay(targetCtx = overlayCtx, options = {}) {
        if (!targetCtx || !state.width || !state.height) return;
        if (!options.noClear) targetCtx.clearRect(0, 0, state.width, state.height);
        if (state.activePart === 5 && !options.debug) {
            drawFinalSelectionOverlay(targetCtx);
            return;
        }

        const visibleSections = state.sections.filter(isSectionVisibleOnBoard);
        visibleSections.forEach((section) => drawSection(targetCtx, section, section.sectionId === state.selectedSectionId, options));
        if (state.activePart > 1) {
            drawButtonBounds(targetCtx);
            state.seats
                .filter(isSeatVisibleOnBoard)
                .filter((seat) => !options.clean || seat.status === STATUS_AVAILABLE)
                .forEach((seat) => drawSeat(targetCtx, seat, options));
            drawEditHandles(targetCtx, options);
        }
        drawSeatSelectionRect(targetCtx);
    }

    function drawSection(targetCtx, section, selected, options = {}) {
        const poly = getDisplayPolygon(section);
        if (!poly || poly.length < 3) return;

        targetCtx.save();
        targetCtx.beginPath();
        drawPolyPath(targetCtx, poly);
        targetCtx.closePath();
        const hovered = state.hoverSectionId === section.sectionId;
        targetCtx.fillStyle = selected ? COLORS.sectionFill : hexToRgba(section.renderColor || section.color || "#94a3b8", hovered ? 0.32 : 0.18);
        targetCtx.fill();
        targetCtx.lineWidth = selected || hovered ? 2.8 : 1.4;
        targetCtx.setLineDash(selected ? [8, 4] : (hovered ? [5, 3] : []));
        targetCtx.strokeStyle = selected ? COLORS.sectionStroke : (hovered ? "#f97316" : (section.renderColor || section.color || COLORS.sectionIdleStroke));
        targetCtx.stroke();
        targetCtx.setLineDash([]);

        if (!options.skipLabels) {
            const box = bboxOf(poly);
            const label = section.sectionName || section.sectionId;
            const labelX = box.x + box.w / 2;
            const labelY = Math.max(14, box.y - 12);
            targetCtx.font = selected ? "900 14px Pretendard, Arial" : "800 12px Pretendard, Arial";
            targetCtx.textAlign = "center";
            targetCtx.textBaseline = "bottom";
            targetCtx.lineWidth = 4;
            targetCtx.strokeStyle = "rgba(255,255,255,0.96)";
            targetCtx.fillStyle = COLORS.label;
            targetCtx.strokeText(label, labelX, labelY);
            targetCtx.fillText(label, labelX, labelY);
        }
        targetCtx.restore();
    }

    function drawButtonBounds(targetCtx) {
        if (state.activePart < 3 || state.activePart === 5) return;
        targetCtx.save();
        state.sections.filter(isSectionVisibleOnBoard).forEach((section) => {
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
        if (options.skipHandles || state.activePart === 1) return;
        const section = getSelectedSection();
        if (!section || !isSectionVisibleOnBoard(section)) return;
        const layout = state.layouts[section.sectionId] || defaultLayout(section);
        const box = section.layoutBbox || bboxOf(section.layoutPolygon || section.polygon || []);
        const rotate = canEditSectionTransform() ? getRotateHandle(section) : null;

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

        const resize = canResizeSeats() ? getResizeHandle(section) : null;
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
        const candidate = seat.status === STATUS_CANDIDATE;
        targetCtx.fillStyle = selected ? COLORS.seatSelected : (hover ? COLORS.seatHover : (candidate ? "rgba(163, 230, 53, 0.12)" : COLORS.seat));
        targetCtx.strokeStyle = candidate ? "rgba(132, 204, 22, 0.78)" : COLORS.seatStroke;
        targetCtx.lineWidth = selected || hover ? 2 : (candidate ? 1.4 : 1);
        if (candidate) targetCtx.setLineDash([4, 3]);
        targetCtx.fill();
        targetCtx.stroke();
        targetCtx.setLineDash([]);
        targetCtx.restore();
    }

    function drawPolyPath(targetCtx, poly) {
        poly.forEach((point, index) => {
            if (index === 0) targetCtx.moveTo(point.x, point.y);
            else targetCtx.lineTo(point.x, point.y);
        });
    }

    function findSectionOverlapWarnings() {
        const layouts = createSeatLayoutsJson()
            .filter((item) => item.seatCount > 0)
            .map((item) => {
                const polygon = normalizePolygon(item.buttonPolygon) || normalizePolygon(item.polygon) || [];
                return {
                    sectionName: item.sectionName,
                    sectionId: item.sectionId,
                    polygon,
                    rect: bboxOf(polygon)
                };
            })
            .filter((item) => item.polygon.length >= 3 && item.rect && item.rect.w > 0 && item.rect.h > 0);
        const warnings = [];
        for (let i = 0; i < layouts.length; i += 1) {
            for (let j = i + 1; j < layouts.length; j += 1) {
                const a = layouts[i];
                const b = layouts[j];
                const bboxOverlap = rectOverlap(a.rect, b.rect);
                if (!bboxOverlap) continue;
                const minSeatSize = Math.min(
                    averageSeatSizeForSection(a.sectionId) || 10,
                    averageSeatSizeForSection(b.sectionId) || 10
                );
                const minOverlapSize = Math.max(1.5, minSeatSize * 0.25);
                if (bboxOverlap.w < minOverlapSize || bboxOverlap.h < minOverlapSize) continue;

                // actualBounds/bbox만 비교하면 ㄱ자/대각 구역이 실제로는 안 겹쳐도
                // 사각 범위가 겹쳤다는 이유로 B1 ↔ A1 같은 허위 경고가 나온다.
                // 저장 경고는 최종 buttonPolygon끼리 실제 면적이 겹칠 때만 띄운다.
                if (polygonsOverlapByArea(a.polygon, b.polygon)) {
                    warnings.push({ a: a.sectionName, b: b.sectionName, rect: bboxOverlap });
                }
            }
        }
        return warnings;
    }

    function polygonsOverlapByArea(polyA, polyB) {
        if (!polyA || !polyB || polyA.length < 3 || polyB.length < 3) return false;
        if (!rectOverlap(bboxOf(polyA), bboxOf(polyB))) return false;

        for (let i = 0; i < polyA.length; i += 1) {
            const a1 = polyA[i];
            const a2 = polyA[(i + 1) % polyA.length];
            for (let j = 0; j < polyB.length; j += 1) {
                const b1 = polyB[j];
                const b2 = polyB[(j + 1) % polyB.length];
                if (segmentsProperlyIntersect(a1, a2, b1, b2)) return true;
            }
        }

        if (polyA.some((point) => pointInPoly(point, polyB) && distanceToPolygon(point, polyB) > 0.5)) return true;
        if (polyB.some((point) => pointInPoly(point, polyA) && distanceToPolygon(point, polyA) > 0.5)) return true;
        return false;
    }

    function segmentsProperlyIntersect(a, b, c, d) {
        const o1 = orientation(a, b, c);
        const o2 = orientation(a, b, d);
        const o3 = orientation(c, d, a);
        const o4 = orientation(c, d, b);
        return o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0 && o1 !== o2 && o3 !== o4;
    }

    function rectOverlap(a, b) {
        if (!a || !b) return null;
        const x1 = Math.max(Number(a.x), Number(b.x));
        const y1 = Math.max(Number(a.y), Number(b.y));
        const x2 = Math.min(Number(a.x) + Number(a.w), Number(b.x) + Number(b.w));
        const y2 = Math.min(Number(a.y) + Number(a.h), Number(b.y) + Number(b.h));
        if (x2 <= x1 || y2 <= y1) return null;
        return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    }

    function averageSeatSizeForSection(sectionId) {
        const list = state.seats.filter((seat) => seat.sectionId === sectionId && seat.status === STATUS_AVAILABLE);
        if (!list.length) return 0;
        return list.reduce((sum, seat) => sum + (Number(seat.size) || 10), 0) / list.length;
    }

    function createFinalSeatJson() {
        const finalSeats = [];
        const seen = new Set();
        state.seats.forEach((seat) => {
            if (seat.status === "REMOVED" || seat.status === STATUS_CANDIDATE) return;
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
        const sectionCompare = String(ap.section || a.sectionName || "").localeCompare(String(bp.section || b.sectionName || ""), "ko", { numeric: true });
        if (sectionCompare !== 0) return sectionCompare;
        const rowCompare = rowNameToIndex(ap.row || a.row) - rowNameToIndex(bp.row || b.row);
        if (rowCompare !== 0) return rowCompare;
        return Number(ap.col || a.col || 0) - Number(bp.col || b.col || 0);
    }

    function normalizeSeatForSave(seat, section) {
        const source = section || findSectionForSeat(seat);
        const sectionId = String(seat.sectionId || source?.sectionId || "");
        const sectionName = seat.sectionName || seat.section || source?.sectionName || "";
        if (!sectionName) return null;
        const floor = String(seat.floor || source?.floor || "1");
        const grade = String(seat.grade || source?.grade || "일반석");
        const status = String(seat.status || STATUS_AVAILABLE).toUpperCase();
        const row = String(seat.row || "A");
        const col = Number(seat.col || 1);
        const x = round(seat.x);
        const y = round(seat.y);
        const size = round(seat.size || 10);
        const angle = round(normalizeAngle(seat.angle || 0));
        const id = buildSeatId(floor, sectionName, row, col, grade, status);
        return {
            id,
            floor,
            sectionId,
            sectionName,
            section: sectionName,
            row,
            col,
            grade,
            status,
            price: Number(seat.price ?? source?.price ?? 0) || 0,
            x,
            y,
            size,
            angle
        };
    }

    function createSectionSeatPayload(finalSeats) {
        const groups = new Map();
        finalSeats.forEach((seat) => {
            const key = seat.sectionId || seat.sectionName || "section";
            if (!groups.has(key)) {
                groups.set(key, {
                    sectionId: seat.sectionId || key,
                    sectionName: seat.sectionName || key,
                    seats: []
                });
            }
            groups.get(key).seats.push(seat);
        });

        const sections = [];
        const files = {};
        [...groups.values()]
            .sort((a, b) => String(a.sectionName).localeCompare(String(b.sectionName), "ko", { numeric: true }))
            .forEach((group, index) => {
                const file = sectionSeatFileName(group.sectionId, group.sectionName, index);
                const availableSeatCount = group.seats.filter((seat) => seat.status === STATUS_AVAILABLE).length;
                const sectionMeta = {
                    sectionId: group.sectionId,
                    sectionName: group.sectionName,
                    file,
                    seatCount: group.seats.length,
                    availableSeatCount
                };
                sections.push(sectionMeta);
                files[file] = {
                    ...sectionMeta,
                    seats: group.seats
                };
            });

        return {
            index: {
                version: 1,
                projectId: state.projectId,
                totalSeatCount: finalSeats.length,
                sectionCount: sections.length,
                generatedAt: new Date().toISOString(),
                sections
            },
            files
        };
    }

    function sectionSeatFileName(sectionId, sectionName, index = 0) {
        const raw = String(sectionId || sectionName || `section-${index + 1}`);
        const cleaned = raw
            .trim()
            .replace(/\s+/g, "_")
            .replace(/[^a-zA-Z0-9가-힣._-]/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_+|_+$/g, "");
        return `${cleaned || `section-${index + 1}`}.json`;
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
                finalDx: round(layout.finalDx || 0),
                finalDy: round(layout.finalDy || 0),
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
        return {
            version: 1,
            stage: 4,
            texts: [],
            shapes: [],
            manualSeats: [],
            seatLayouts: createSeatLayoutsJson(),
            stage4SavedAt: new Date().toISOString()
        };
    }

    function createEmptyDecorationsJson() {
        return {
            version: 1,
            stage: 4,
            texts: [],
            shapes: [],
            manualSeats: [],
            seatLayouts: [],
            stage4SavedAt: new Date().toISOString(),
            stage4ResetAt: new Date().toISOString()
        };
    }

    async function resetStage4Data() {
        const confirmed = window.confirm("Stage 4 좌석 배치 데이터를 초기화할까요?\nStage 1~3의 button-image.png와 seatmap-sections.json은 유지됩니다.");
        if (!confirmed) return;

        const emptyDecorations = createEmptyDecorationsJson();
        const payload = {
            page: "stage4",
            folderName: state.projectId,
            seatJsonText: "",
            sectionSeatJsonText: JSON.stringify({
                index: {
                    version: 1,
                    projectId: state.projectId,
                    totalSeatCount: 0,
                    sectionCount: 0,
                    generatedAt: new Date().toISOString(),
                    sections: []
                },
                files: {}
            }),
            sectionJsonText: "",
            bookingButtonJsonText: "",
            decorationJsonText: JSON.stringify(emptyDecorations),
            imageDataUrl: ""
        };

        const buttons = [dom.resetStage4DataBtn, dom.resetView].filter(Boolean);
        const labels = buttons.map((button) => button.textContent);
        buttons.forEach((button) => {
            button.disabled = true;
            button.textContent = "초기화 중...";
        });

        try {
            const response = await fetch(SAVE_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || "Stage 4 초기화 저장 실패");
            }

            state.seats = [];
            state.layouts = {};
            state.selectedSeatIds.clear();
            state.hoverSeatId = "";
            state.hoverSectionId = "";
            state.activeGroupKey = "";
            clearStage4LocalCache(true);
            writeJson(STORAGE.decorations, emptyDecorations);
            writeJson(STORAGE.seats, []);
            writeJson(STORAGE.finalSeats, []);

            state.sections.forEach((section) => {
                delete section.layoutPolygon;
                delete section.layoutPolygons;
                delete section.layoutBbox;
            });

            setPart(1);
            setupSourceBoard();
            restoreLayoutToInputs(getSelectedSection());
            syncAll();
            toast("Stage 4 좌석 배치 데이터 초기화 완료");
        } catch (error) {
            console.error(error);
            toast("초기화 실패: " + error.message);
            alert("Stage 4 초기화 실패: " + error.message);
        } finally {
            buttons.forEach((button, index) => {
                button.disabled = false;
                button.textContent = labels[index];
            });
        }
    }

    async function saveSeatsToServer(options = {}) {
        // 저장/Stage5 이동 직전에는 전체 구역 외곽선을 좌석 union 기준으로 한 번 확정한다.
        // 계단식 외곽은 그대로 유지하고, 완만한 외곽선 처리는 Stage 5에서 수행한다.
        recomputeAllButtonPolygons({ smoothStairs: false });
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

        const overlapWarnings = findSectionOverlapWarnings();
        if (overlapWarnings.length) {
            const preview = overlapWarnings.slice(0, 6).map((item) => `- ${item.a} ↔ ${item.b}`).join("\n");
            const more = overlapWarnings.length > 6 ? `\n외 ${overlapWarnings.length - 6}건` : "";
            const message = `좌석 기준 구역선이 서로 겹칩니다.\n${preview}${more}\n\n겹친 구역을 확인하고 저장할까요?`;
            toast(`구역 겹침 경고 ${overlapWarnings.length}건`);
            if (!window.confirm(message)) {
                throw new Error("구역 겹침 경고로 저장을 취소했습니다.");
            }
        }

        persistLocalWork({ immediate: true });
        const decorations = createDecorationsJson();
        const sectionSeatPayload = createSectionSeatPayload(finalSeats);
        const payload = {
            page: "stage4",
            folderName: state.projectId,
            seatJsonText: "",
            sectionSeatJsonText: JSON.stringify(sectionSeatPayload),
            sectionJsonText: "",
            bookingButtonJsonText: "",
            decorationJsonText: JSON.stringify(decorations),
            imageDataUrl: exportCleanImageDataUrl(),
            debugImageDataUrl: exportDebugImageDataUrl(),
            seatCount: finalSeats.length
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
            removeHeavySeatLocalStorage();
            toast(`좌석 ${finalSeats.length}개 / 구역별 파일 ${sectionSeatPayload.index.sections.length}개 저장 완료`);
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



    function recomputeAllButtonPolygons(options = {}) {
        const smoothStairs = options.smoothStairs === true;
        state.sections.forEach((section) => {
            if (getSectionSeats(section).some((seat) => seat.status === STATUS_AVAILABLE)) {
                updateLayoutActualBounds(section, { polish: true, smoothStairs });
            }
        });
    }

    function preparePart5ButtonPolygons() {
        state.sections.forEach((section) => {
            if (!getSectionSeats(section).some((seat) => seat.status === STATUS_AVAILABLE)) return;
            const layout = state.layouts[section.sectionId] || defaultLayout(section);
            if (!layout.buttonPolygon || layout.buttonPolygon.length < 3 || layout.buttonPolygonDirty === true || layout.buttonShapeMode === "SEAT_SMOOTHED") {
                updateLayoutActualBounds(section, { polish: true, smoothStairs: false });
            }
        });
    }

    function polishAllFinalButtonPolygons() {
        if (state.activePart !== 5) {
            setPart(5);
        }
        recomputeAllButtonPolygons({ smoothStairs: false });
        persistLocalWork();
        drawBase();
        drawOverlay();
        updateFinalPreview();
        toast("전체 최종 빨간 외곽선 좌석 기준 갱신 완료");
    }

    function exportCleanImageDataUrl(options = {}) {
        try {
            if (options.polish === true) recomputeAllButtonPolygons({ smoothStairs: false });
            const size = getReferenceCanvasSize();
            const out = document.createElement("canvas");
            const outCtx = out.getContext("2d");
            out.width = size.width;
            out.height = size.height;
            drawFinalPng(outCtx, { debug: false, reference: true, width: size.width, height: size.height });
            return out.toDataURL("image/png");
        } catch (error) {
            console.warn("[SeatTrace Stage4] clean image export failed", error);
            return exportDebugImageDataUrl();
        }
    }

    function getReferenceCanvasSize() {
        if (state.sourceImage) {
            return {
                width: Math.max(1, Math.round(state.sourceImage.naturalWidth || state.sourceImage.width || state.width || 1200)),
                height: Math.max(1, Math.round(state.sourceImage.naturalHeight || state.sourceImage.height || state.height || 800))
            };
        }
        const box = bboxOf(state.sections.flatMap((section) => section.originalPolygon || section.polygon || []));
        return {
            width: Math.max(900, Math.ceil(box.x + box.w + 80)),
            height: Math.max(620, Math.ceil(box.y + box.h + 80))
        };
    }


    function selectSectionForPart5(sectionId) {
        if (!sectionId) return;
        state.selectedSectionId = sectionId;
        const selected = getSelectedSection();
        if (selected) state.activeGroupKey = getGroupKey(selected);
        state.selectedSeatIds.clear();
        restoreLayoutToInputs(selected);
        syncInfo();
        syncSectionSelect();
        syncSectionList();
        syncJsonPreview();
        renderMiniMapOverlay();
    }

    function findFinalSectionAt(point) {
        for (let i = state.sections.length - 1; i >= 0; i -= 1) {
            const section = state.sections[i];
            if (!getSectionSeats(section).some((seat) => seat.status === STATUS_AVAILABLE)) continue;
            const poly = getReferenceExportPolygon(section, state.layouts[section.sectionId] || defaultLayout(section));
            if (poly && poly.length >= 3 && isInsideOrEdge(point, poly)) return section;
        }
        return null;
    }

    function beginFinalSectionDrag(section, point, event) {
        const layout = state.layouts[section.sectionId] || defaultLayout(section);
        state.layouts[section.sectionId] = layout;
        const basePoly = getReferenceExportPolygonBase(section, layout);
        state.drag = {
            type: "final-section",
            sectionId: section.sectionId,
            start: point,
            finalDx: Number(layout.finalDx || 0),
            finalDy: Number(layout.finalDy || 0),
            baseBounds: bboxOf(basePoly || []),
            guideX: null,
            guideY: null
        };
        overlay.setPointerCapture?.(event.pointerId);
    }

    function updateFinalSectionDrag(point) {
        const drag = state.drag;
        const section = findSectionById(drag.sectionId);
        if (!section) return;
        const layout = state.layouts[section.sectionId] || defaultLayout(section);
        let dx = point.x - drag.start.x;
        let dy = point.y - drag.start.y;
        const snap = getFinalSnapDelta(section, drag.baseBounds, drag.finalDx + dx, drag.finalDy + dy, 6);
        dx += snap.dx;
        dy += snap.dy;
        layout.finalDx = round(drag.finalDx + dx);
        layout.finalDy = round(drag.finalDy + dy);
        drag.guideX = snap.guideX;
        drag.guideY = snap.guideY;
        state.layouts[section.sectionId] = layout;
        drawBase();
        drawOverlay();
    }

    function finishFinalSectionDrag() {
        const section = getSelectedSection();
        if (section) {
            const layout = state.layouts[section.sectionId] || defaultLayout(section);
            layout.finalDx = round(layout.finalDx || 0);
            layout.finalDy = round(layout.finalDy || 0);
            state.layouts[section.sectionId] = layout;
        }
        persistLocalWork();
        drawBase();
        drawOverlay();
        updateFinalPreview();
    }

    function drawFinalSelectionOverlay(targetCtx) {
        if (!targetCtx) return;
        const section = getSelectedSection();
        if (section) {
            const poly = getReferenceExportPolygon(section, state.layouts[section.sectionId] || defaultLayout(section));
            if (poly && poly.length >= 3) {
                targetCtx.save();
                targetCtx.beginPath();
                drawPolyPath(targetCtx, poly);
                targetCtx.closePath();
                targetCtx.fillStyle = "rgba(37,99,235,0.08)";
                targetCtx.strokeStyle = "#2563eb";
                targetCtx.setLineDash([6, 4]);
                targetCtx.lineWidth = 2;
                targetCtx.fill();
                targetCtx.stroke();
                targetCtx.restore();
            }
        }
        if (state.drag?.type === "final-section") {
            targetCtx.save();
            targetCtx.strokeStyle = "rgba(14,165,233,0.9)";
            targetCtx.lineWidth = 1.4;
            targetCtx.setLineDash([4, 4]);
            if (Number.isFinite(state.drag.guideX)) {
                targetCtx.beginPath();
                targetCtx.moveTo(state.drag.guideX, 0);
                targetCtx.lineTo(state.drag.guideX, state.height);
                targetCtx.stroke();
            }
            if (Number.isFinite(state.drag.guideY)) {
                targetCtx.beginPath();
                targetCtx.moveTo(0, state.drag.guideY);
                targetCtx.lineTo(state.width, state.drag.guideY);
                targetCtx.stroke();
            }
            targetCtx.restore();
        }
    }

    function getReferenceExportPolygonBase(section, layout) {
        const cleanPoly = normalizePolygon(layout?.buttonPolygon) || normalizePolygon(layout?.actualPolygon);
        if (cleanPoly && cleanPoly.length >= 3) {
            return normalizeArray(cleanPoly).map((point) => mapLayoutPointToOriginal(point, section, layout)).filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
        }
        const layoutPoly = normalizePolygon(section?.layoutPolygon);
        if (layoutPoly && layoutPoly.length >= 3) {
            return normalizeArray(layoutPoly).map((point) => mapLayoutPointToOriginal(point, section, layout)).filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
        }
        return normalizePolygon(section?.originalPolygon || section?.polygon) || [];
    }

    function applyFinalOffsetToPolygon(poly, layout) {
        const dx = Number(layout?.finalDx || 0);
        const dy = Number(layout?.finalDy || 0);
        return normalizeArray(poly).map((point) => ({ x: round(Number(point.x) + dx), y: round(Number(point.y) + dy) }));
    }

    function getFinalSectionBounds(section) {
        const poly = getReferenceExportPolygon(section, state.layouts[section.sectionId] || defaultLayout(section));
        return poly && poly.length ? bboxOf(poly) : null;
    }

    function getFinalSnapDelta(section, baseBounds, finalDx, finalDy, tolerance = 6) {
        const moving = {
            x: baseBounds.x + finalDx,
            y: baseBounds.y + finalDy,
            w: baseBounds.w,
            h: baseBounds.h
        };
        const movingAnchors = {
            left: moving.x,
            centerX: moving.x + moving.w / 2,
            right: moving.x + moving.w,
            top: moving.y,
            centerY: moving.y + moving.h / 2,
            bottom: moving.y + moving.h
        };
        let bestX = { d: Infinity, delta: 0, guide: null };
        let bestY = { d: Infinity, delta: 0, guide: null };
        state.sections.forEach((other) => {
            if (other.sectionId === section.sectionId) return;
            const rect = getFinalSectionBounds(other);
            if (!rect) return;
            const otherX = [rect.x, rect.x + rect.w / 2, rect.x + rect.w];
            const otherY = [rect.y, rect.y + rect.h / 2, rect.y + rect.h];
            [movingAnchors.left, movingAnchors.centerX, movingAnchors.right].forEach((anchor) => {
                otherX.forEach((target) => {
                    const d = Math.abs(target - anchor);
                    if (d < bestX.d && d <= tolerance) bestX = { d, delta: target - anchor, guide: target };
                });
            });
            [movingAnchors.top, movingAnchors.centerY, movingAnchors.bottom].forEach((anchor) => {
                otherY.forEach((target) => {
                    const d = Math.abs(target - anchor);
                    if (d < bestY.d && d <= tolerance) bestY = { d, delta: target - anchor, guide: target };
                });
            });
        });
        return {
            dx: Number.isFinite(bestX.delta) ? bestX.delta : 0,
            dy: Number.isFinite(bestY.delta) ? bestY.delta : 0,
            guideX: bestX.guide,
            guideY: bestY.guide
        };
    }

    function alignSelectedFinalSection(edge) {
        const section = getSelectedSection();
        if (!section || state.activePart !== 5) {
            toast("Part 5에서 정렬할 구역을 선택하세요.");
            return;
        }
        const layout = state.layouts[section.sectionId] || defaultLayout(section);
        const rect = getFinalSectionBounds(section);
        if (!rect) return;
        let best = { d: Infinity, delta: 0 };
        state.sections.forEach((other) => {
            if (other.sectionId === section.sectionId) return;
            const otherRect = getFinalSectionBounds(other);
            if (!otherRect) return;
            let from;
            let to;
            if (edge === "left") { from = rect.x; to = otherRect.x; }
            if (edge === "right") { from = rect.x + rect.w; to = otherRect.x + otherRect.w; }
            if (edge === "top") { from = rect.y; to = otherRect.y; }
            if (edge === "bottom") { from = rect.y + rect.h; to = otherRect.y + otherRect.h; }
            const d = Math.abs(to - from);
            if (d < best.d) best = { d, delta: to - from };
        });
        if (!Number.isFinite(best.delta) || best.d === Infinity) best.delta = 0;
        if (edge === "left" || edge === "right") layout.finalDx = round(Number(layout.finalDx || 0) + best.delta);
        else layout.finalDy = round(Number(layout.finalDy || 0) + best.delta);
        state.layouts[section.sectionId] = layout;
        persistLocalWork();
        drawBase();
        drawOverlay();
        updateFinalPreview();
        toast(`${section.sectionName} ${edge} 정렬 완료`);
    }

    function snapSelectedFinalSectionToNearestGuides() {
        const section = getSelectedSection();
        if (!section || state.activePart !== 5) {
            toast("Part 5에서 스냅할 구역을 선택하세요.");
            return;
        }
        const layout = state.layouts[section.sectionId] || defaultLayout(section);
        const base = bboxOf(getReferenceExportPolygonBase(section, layout) || []);
        const snap = getFinalSnapDelta(section, base, Number(layout.finalDx || 0), Number(layout.finalDy || 0), 12);
        layout.finalDx = round(Number(layout.finalDx || 0) + snap.dx);
        layout.finalDy = round(Number(layout.finalDy || 0) + snap.dy);
        // 소수 오차도 여기서 정수화한다.
        layout.finalDx = Math.round(layout.finalDx);
        layout.finalDy = Math.round(layout.finalDy);
        state.layouts[section.sectionId] = layout;
        persistLocalWork();
        drawBase();
        drawOverlay();
        updateFinalPreview();
        toast(`${section.sectionName} 위치 스냅/오차 보정 완료`);
    }

    function exportDebugImageDataUrl(options = {}) {
        try {
            if (options.polish === true) recomputeAllButtonPolygons({ smoothStairs: false });
            const size = getReferenceCanvasSize();
            const out = document.createElement("canvas");
            const outCtx = out.getContext("2d");
            out.width = size.width;
            out.height = size.height;
            drawFinalPng(outCtx, { debug: true, reference: true, width: size.width, height: size.height });
            return out.toDataURL("image/png");
        } catch (error) {
            console.warn("[SeatTrace Stage4] debug image export failed", error);
            return "";
        }
    }

    function drawFinalPng(targetCtx, options = {}) {
        if (!targetCtx) return;
        const debug = Boolean(options.debug);
        const outWidth = Math.max(1, Number(options.width) || state.width);
        const outHeight = Math.max(1, Number(options.height) || state.height);
        targetCtx.save();
        targetCtx.clearRect(0, 0, outWidth, outHeight);
        targetCtx.fillStyle = "#ffffff";
        targetCtx.fillRect(0, 0, outWidth, outHeight);

        if (debug && state.sourceImage) {
            targetCtx.save();
            targetCtx.globalAlpha = 0.12;
            targetCtx.drawImage(state.sourceImage, 0, 0, outWidth, outHeight);
            targetCtx.restore();
        }

        const sections = state.sections
            .filter((section) => getSectionSeats(section).some((seat) => seat.status === STATUS_AVAILABLE));

        sections.forEach((section) => {
            const layout = state.layouts[section.sectionId] || defaultLayout(section);
            const sourcePoly = getReferenceExportPolygon(section, layout);
            if (!sourcePoly || sourcePoly.length < 3) return;
            const fill = section.renderColor || section.color || section.sourceColor || "#d9d9d9";
            targetCtx.beginPath();
            drawPolyPath(targetCtx, sourcePoly);
            targetCtx.closePath();
            targetCtx.fillStyle = debug ? hexToRgba(fill, 0.28) : fill;
            targetCtx.strokeStyle = debug ? "#ef4444" : fill;
            targetCtx.lineWidth = debug ? 1.8 : 1;
            if (debug) targetCtx.setLineDash([6, 4]);
            targetCtx.fill();
            targetCtx.stroke();
            targetCtx.setLineDash([]);
        });

        if (debug) {
            state.seats
                .filter((seat) => seat.status !== "REMOVED")
                .map(referenceSeatForExport)
                .filter(Boolean)
                .forEach((seat) => drawSeat(targetCtx, seat, { skipHover: true }));
        }
        targetCtx.restore();
    }

    function getReferenceExportPolygon(section, layout) {
        const cleanPoly = normalizePolygon(layout?.buttonPolygon) || normalizePolygon(layout?.actualPolygon);
        if (cleanPoly && cleanPoly.length >= 3) {
            return mapLayoutPolygonToOriginal(cleanPoly, section, layout);
        }
        const layoutPoly = normalizePolygon(section?.layoutPolygon);
        if (layoutPoly && layoutPoly.length >= 3) {
            return mapLayoutPolygonToOriginal(layoutPoly, section, layout);
        }
        return applyFinalOffsetToPolygon(normalizePolygon(section?.originalPolygon || section?.polygon) || [], layout);
    }

    function mapLayoutPolygonToOriginal(points, section, layout) {
        return applyFinalOffsetToPolygon(
            normalizeArray(points).map((point) => mapLayoutPointToOriginal(point, section, layout)).filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y)),
            layout
        );
    }

    function mapLayoutPointToOriginal(point, section, layout) {
        const box = layout?.originalBbox || getOriginalBbox(section);
        const scale = Math.max(0.0001, Number(layout?.scale) || 1);
        const layoutX = Number(layout?.layoutX || 0);
        const layoutY = Number(layout?.layoutY || 0);
        const w = Math.max(1, box.w * scale);
        const h = Math.max(1, box.h * scale);
        const center = { x: layoutX + w / 2, y: layoutY + h / 2 };
        const angle = normalizeAngle(Number(layout?.angle) || 0);
        const unrotated = rotatePoint({ x: Number(point.x), y: Number(point.y) }, center, -angle);
        return copyPoint({
            x: box.x + (unrotated.x - layoutX) / scale,
            y: box.y + (unrotated.y - layoutY) / scale
        });
    }

    function referenceSeatForExport(seat) {
        const section = findSectionById(seat.sectionId);
        if (!section) return null;
        const layout = state.layouts[section.sectionId] || defaultLayout(section);
        const mapped = mapLayoutPointToOriginal({ x: seat.x, y: seat.y }, section, layout);
        return {
            ...seat,
            x: round(mapped.x + Number(layout.finalDx || 0)),
            y: round(mapped.y + Number(layout.finalDy || 0)),
            size: Math.max(2, (Number(seat.size) || Number(layout.seatSize) || 10) / Math.max(0.0001, Number(layout.scale) || 1)),
            angle: normalizeAngle((Number(seat.angle) || 0) - (Number(layout.angle) || 0))
        };
    }

    function updateFinalPreview() {
        try {
            const dataUrl = exportCleanImageDataUrl();
            if (dom.finalPreviewImg) dom.finalPreviewImg.src = dataUrl;
            const finalSeats = createFinalSeatJson();
            const layoutCount = createSeatLayoutsJson().filter((item) => item.seatCount > 0).length;
            setText(dom.finalPreviewStatus, `최종 PNG 미리보기 갱신 완료 · 구역 ${layoutCount}개 · 좌석 ${finalSeats.length}개`);
        } catch (error) {
            console.warn("[SeatTrace Stage4] final preview failed", error);
            setText(dom.finalPreviewStatus, "최종 PNG 미리보기 생성 실패");
        }
    }

    function goStage5() {
        saveSeatsToServer().then(() => {
            window.location.href = state.stage5Url || `/admin/seatmap/stage/5?projectId=${encodeURIComponent(state.projectId)}`;
        }).catch(() => {});
    }

    function persistLocalWork(options = {}) {
        const immediate = options === true || options?.immediate === true;
        if (immediate) {
            flushPersistLocalWork(true);
            return;
        }
        if (persistTimer) clearTimeout(persistTimer);
        persistTimer = window.setTimeout(() => flushPersistLocalWork(false), 700);
    }

    function flushPersistLocalWork(full = false) {
        if (persistTimer) {
            clearTimeout(persistTimer);
            persistTimer = 0;
        }
        localStorage.setItem(STORAGE.projectOwner, state.projectId);

        // 좌석 전체는 localStorage에 저장하지 않는다.
        // 대형 도면에서 seatmap_stage4_seats / concert_final_seats가 quota를 터뜨리므로
        // 좌석 상세는 서버의 seats/index.json + 구역별 JSON에만 저장한다.
        writeJson(STORAGE.layouts, state.layouts);
        if (full) {
            writeJson(STORAGE.decorations, createDecorationsJson());
        }
        removeHeavySeatLocalStorage();
    }

    function removeHeavySeatLocalStorage() {
        [
            STORAGE.seats,
            STORAGE.finalSeats,
            STORAGE.bookingSeats,
            STORAGE.seatsBySectionCompat
        ].forEach((key) => {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.warn("[SeatTrace Stage4] heavy localStorage 제거 실패", key, error);
            }
        });
    }

    function rememberCurrentLayoutFromInputs(regenerateGeometry) {
        const section = getSelectedSection();
        if (!section) return;
        state.layouts[section.sectionId] = readLayoutFromInputs(section);
        if (regenerateGeometry) {
            rebuildSectionGeometry(section.sectionId);
            updateLayoutActualBounds(section);
            persistLocalWork();
            syncToolState();
            syncInfo();
        }
    }

    function readLayoutFromInputs(section) {
        const current = state.layouts[section?.sectionId || ""] || defaultLayout(section);
        const rows = positiveInt(current.rows, 1);
        const cols = positiveInt(current.cols, 1);
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
            originalBbox: box,
            finalDx: 0,
            finalDy: 0
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
            buttonPolygon: normalizePolygon(raw.buttonPolygon),
            finalDx: Number(raw.finalDx || 0),
            finalDy: Number(raw.finalDy || 0)
        };
    }

    function updateLayoutActualBounds(section, options = {}) {
        if (!section) return;
        const layout = state.layouts[section.sectionId] || defaultLayout(section);
        const availableSeats = getSectionSeats(section).filter((seat) => seat.status === STATUS_AVAILABLE);
        const bounds = getSeatBounds(availableSeats);
        const nextLayout = {
            ...layout,
            seatCount: availableSeats.length,
            actualBounds: bounds,
            buttonPolygonDirty: true
        };

        // Part 4 좌석 추가/삭제/후보 처리 시점에는 최종 빨간선을 매번 다듬지 않는다.
        // Part 5의 전체 다듬기 버튼/저장 시점에서만 실제 buttonPolygon을 확정한다.
        if (options && options.polish === true) {
            nextLayout.buttonPolygon = createCleanButtonPolygonFromSeats(
                section,
                availableSeats,
                Math.max(6, Number(layout.seatSize) || 10),
                { smoothStairs: false }
            ) || (section.layoutPolygon || []);
            nextLayout.buttonShapeMode = "SEAT_UNION";
            nextLayout.buttonPolygonDirty = false;
        }

        state.layouts[section.sectionId] = nextLayout;
    }

    function getSeatBounds(seats) {
        const list = normalizeArray(seats).filter((seat) => seat.status !== "REMOVED" && seat.status !== STATUS_CANDIDATE);
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

    function getBoardExtent(sections = state.sections) {
        let maxX = 0;
        let maxY = 0;
        sections.forEach((section) => {
            const layout = state.layouts[section.sectionId];
            if (!layout) return;
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
            if (Array.isArray(value.data)) return value.data;
            if (value.files && typeof value.files === "object") {
                return Object.values(value.files).flatMap((item) => normalizeSeatCollection(item));
            }
            if (Array.isArray(value.sections)) {
                return value.sections.flatMap((item) => normalizeSeatCollection(item));
            }
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
        return classifySeatAgainstPolygon(center, size, angle, polygon) === "inside";
    }

    function classifySeatAgainstPolygon(center, size, angle, polygon) {
        if (!polygon || polygon.length < 3) return "outside";
        const half = size / 2;
        const corners = [
            rotatePoint({ x: center.x - half, y: center.y - half }, center, angle),
            rotatePoint({ x: center.x + half, y: center.y - half }, center, angle),
            rotatePoint({ x: center.x + half, y: center.y + half }, center, angle),
            rotatePoint({ x: center.x - half, y: center.y + half }, center, angle)
        ];
        const centerInside = isInsideOrEdge(center, polygon);
        const insideCorners = corners.filter((point) => isInsideOrEdge(point, polygon)).length;
        const edgeHit = polygonEdgesIntersect(corners, polygon);
        // 작은/ㄱ자/오차가 있는 도형에서는 좌석 네모 안에 polygon 꼭짓점이 들어오는데도
        // 좌석 중심과 네 모서리가 모두 밖으로 판정되는 경우가 있다. 이건 "실선에 걸침"이므로 후보로 남겨야 한다.
        const polygonVertexInsideSeat = polygon.some((point) => pointInRotatedRect(point, center, size, angle));
        if (centerInside && insideCorners === 4 && !edgeHit) return "inside";
        if (
            centerInside
            || insideCorners > 0
            || edgeHit
            || polygonVertexInsideSeat
        ) return "candidate";
        return "outside";
    }

    function pointInRotatedRect(point, center, size, angle) {
        if (!point || !center) return false;
        const half = size / 2;
        const local = rotatePoint({ x: Number(point.x), y: Number(point.y) }, center, -normalizeAngle(angle));
        return local.x >= center.x - half
            && local.x <= center.x + half
            && local.y >= center.y - half
            && local.y <= center.y + half;
    }

    function polygonEdgesIntersect(rectPoints, polygon) {
        if (!rectPoints || rectPoints.length < 2 || !polygon || polygon.length < 2) return false;
        for (let i = 0; i < rectPoints.length; i += 1) {
            const a = rectPoints[i];
            const b = rectPoints[(i + 1) % rectPoints.length];
            for (let j = 0; j < polygon.length; j += 1) {
                const c = polygon[j];
                const d = polygon[(j + 1) % polygon.length];
                if (segmentsIntersect(a, b, c, d)) return true;
            }
        }
        return false;
    }

    function segmentsIntersect(a, b, c, d) {
        const o1 = orientation(a, b, c);
        const o2 = orientation(a, b, d);
        const o3 = orientation(c, d, a);
        const o4 = orientation(c, d, b);
        if (o1 !== o2 && o3 !== o4) return true;
        if (o1 === 0 && pointOnSegment(c, a, b)) return true;
        if (o2 === 0 && pointOnSegment(d, a, b)) return true;
        if (o3 === 0 && pointOnSegment(a, c, d)) return true;
        if (o4 === 0 && pointOnSegment(b, c, d)) return true;
        return false;
    }

    function orientation(a, b, c) {
        const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
        if (Math.abs(value) < 1e-9) return 0;
        return value > 0 ? 1 : 2;
    }

    function pointOnSegment(p, a, b) {
        return p.x <= Math.max(a.x, b.x) + 1e-9
            && p.x >= Math.min(a.x, b.x) - 1e-9
            && p.y <= Math.max(a.y, b.y) + 1e-9
            && p.y >= Math.min(a.y, b.y) - 1e-9;
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

    function pointInRotatedRect(point, centerOrX, sizeOrY, angleOrW, h, angleMaybe) {
        // New form: pointInRotatedRect(point, {x, y}, size, angle)
        // Legacy form: pointInRotatedRect(point, cx, cy, w, h, angle)
        if (centerOrX && typeof centerOrX === "object") {
            const center = { x: Number(centerOrX.x), y: Number(centerOrX.y) };
            const size = Number(sizeOrY) || 0;
            const angle = normalizeAngle(Number(angleOrW) || 0);
            const half = size / 2;
            const local = rotatePoint({ x: Number(point.x), y: Number(point.y) }, center, -angle);
            return local.x >= center.x - half
                && local.x <= center.x + half
                && local.y >= center.y - half
                && local.y <= center.y + half;
        }
        const cx = Number(centerOrX) || 0;
        const cy = Number(sizeOrY) || 0;
        const w = Number(angleOrW) || 0;
        const height = Number(h) || w;
        const angle = normalizeAngle(Number(angleMaybe) || 0);
        const local = rotatePoint(point, { x: cx, y: cy }, -angle);
        return Math.abs(local.x - cx) <= w / 2 && Math.abs(local.y - cy) <= height / 2;
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

    function radToDeg(rad) {
        return (Number(rad) || 0) * 180 / Math.PI;
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

    function setZoom(nextZoom) {
        state.zoom = clamp(Number(nextZoom) || 1, 0.15, 4);
        if (dom.canvasBox) {
            dom.canvasBox.style.transformOrigin = "0 0";
            dom.canvasBox.style.transform = `scale(${state.zoom})`;
        }
        if (dom.zoomValue) dom.zoomValue.textContent = `${Math.round(state.zoom * 100)}%`;
    }

    function fitZoom() {
        const scroll = dom.canvasScroll;
        if (!scroll || !state.width || !state.height) {
            setZoom(1);
            return;
        }
        const availableW = Math.max(320, scroll.clientWidth - 80);
        const availableH = Math.max(260, scroll.clientHeight - 80);
        const next = Math.min(1, availableW / state.width, availableH / state.height);
        setZoom(next);
    }

    function canvasPoint(event) {
        if (!overlay) return null;
        const rect = overlay.getBoundingClientRect();
        const scaleX = overlay.width / Math.max(1, rect.width);
        const scaleY = overlay.height / Math.max(1, rect.height);
        return {
            x: round((event.clientX - rect.left) * scaleX),
            y: round((event.clientY - rect.top) * scaleY)
        };
    }

    function sanitizeProjectId(value) {
        return String(value || "seat").trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9가-힣._-]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "") || "seat";
    }

    function projectFileUrl(fileName) {
        return `/temp/seatmap/${encodeURIComponent(state.projectId)}/${fileName}`;
    }

    function noCache(url) {
        if (!url) return url;
        const separator = url.includes("?") ? "&" : "?";
        return `${url}${separator}_=${Date.now()}`;
    }

    async function fetchJson(url) {
        const response = await fetch(noCache(url), { credentials: "same-origin", cache: "no-store" });
        if (!response.ok) throw new Error(response.status + " " + response.statusText);
        return response.json();
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

    function isLocalWorkForCurrentProject() {
        return localStorage.getItem(STORAGE.projectOwner) === state.projectId;
    }

    function clearStage4LocalCache(markCurrentProject = true) {
        [
            STORAGE.seats,
            STORAGE.layouts,
            STORAGE.decorations,
            STORAGE.finalSeats,
            STORAGE.bookingSeats,
            STORAGE.seatsBySectionCompat,
            STORAGE.layoutsCompat
        ].forEach((key) => {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.warn("[SeatTrace Stage4] localStorage 삭제 실패", key, error);
            }
        });
        if (markCurrentProject) {
            localStorage.setItem(STORAGE.projectOwner, state.projectId);
        } else {
            localStorage.removeItem(STORAGE.projectOwner);
        }
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
