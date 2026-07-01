(() => {
    "use strict";

    const STORAGE = {
        projectId: "seatmap_current_project_id",
        folderName: "seatmap_current_folder_name",
        sections: "seatmap_stage3_sections",
        sectionsCompat: "concert_sections",
        sectionsHeader: "concert_stage1_sections",
        seats: "seatmap_stage4_seats",
        seatsCompat: "concert_final_seats",
        bookingButtons: "seatmap_stage5_booking_buttons",
        bookingButtonsCompat: "concert_booking_buttons",
        bookingButtonsCompat2: "concert_stage5_booking_buttons",
        bookingButtonsUrl: "seatmap_booking_buttons_url",
        bookingButtonsJsonUrl: "seatmap_booking_buttons_json_url",
        finalImageUrl: "seatmap_final_image_url",
        generatedOverviewImage: "concert_generated_overviewImage",
        decorations: "seatmap_stage4_decorations"
    };

    const SAVE_URL = "/admin/seatmap/temp-save";
    const DEFAULT_COLOR = "#dbeafe";
    const DEFAULT_TEXT_COLOR = "#1f2937";
    const DEBUG_STROKE_COLOR = "#ef4444";
    const FINAL_FILL_ALPHA = 0.76;
    const EDIT_FILL_ALPHA = 0.32;
    const AVAILABLE = "AVAILABLE";
    const PASTEL_PALETTE = [
        "#dbeafe", "#dcfce7", "#fef3c7", "#fee2e2",
        "#ede9fe", "#cffafe", "#fce7f3", "#e0f2fe",
        "#f3e8ff", "#ecfccb", "#ffedd5", "#e2e8f0"
    ];

    const dom = {};
    const state = {
        projectId: "seat",
        stage4Url: "",
        stage6Url: "",
        seatmapImageUrl: "",
        buttonImageUrl: "",
        croppedImageUrl: "",
        finalImageUrl: "",
        debugImageUrl: "",
        sectionsUrl: "",
        seatsUrl: "",
        bookingButtonsUrl: "",
        decorationsUrl: "",
        saveUrl: SAVE_URL,

        sections: [],
        seats: [],
        seatLayouts: [],
        buttons: [],
        warnings: [],
        selectedId: "",
        hoverId: "",

        image: null,
        baseImageLoaded: false,
        baseImageUrl: "",
        width: 1000,
        height: 700,
        zoom: 1,

        showSectionPolygon: true,
        showButtonPolygon: true,
        showSeats: true,
        showLabels: true,
        draggingLabelId: "",
        labelDragOffset: { x: 0, y: 0 },
        completedParts: new Set()
    };

    document.addEventListener("DOMContentLoaded", init);

    async function init() {
        cacheDom();
        readRouteState();
        bindEvents();
        setupCanvases(state.width, state.height);
        await loadAllData();
        await loadBaseImage();
        await tryLoadSavedButtons(false);
        if (!state.buttons.length) {
            generateButtons({ silent: true });
        }
        setPart(1, false);
        syncAll();

        window.SeatMapStage5 = {
            save: saveBookingButtonsToServer,
            getButtons: () => createBookingButtonsJson(),
            exportDebugImage: exportDebugImageDataUrl,
            exportFinalImage: exportFinalImageDataUrl
        };
    }

    function cacheDom() {
        [
            "stage5App", "toast", "part1Panel", "part2Panel", "part3Panel", "part4Panel",
            "partBtn1", "partBtn2", "partBtn3", "partBtn4", "part1Status", "part2Status", "part3Status", "part4Status",
            "sectionCountText", "seatCountText", "matchFailCountText", "missingNameCountText", "warningList",
            "reloadDataBtn", "generateButtonsBtn", "loadSavedButtonsBtn", "showSectionPolygon", "showButtonPolygon",
            "showSeats", "showLabels", "labelInput", "fontSizeInput", "textColorInput", "labelXInput", "labelYInput", "colorInput", "strokeInput", "visibleInput",
            "clickableInput", "autoFontBtn", "applySelectedBtn", "buttonList", "saveSummary", "saveBookingButtonsBtn", "toStage6Btn",
            "canvasScroll", "canvasBox", "stage5BaseCanvas", "stage5OverlayCanvas", "canvasSize", "canvasTitle", "stage5Tooltip",
            "miniImg", "previewCanvas", "infoSectionId", "infoSectionName", "infoFloorGrade", "infoPrice", "infoSeatCount",
            "infoAvailableCount", "infoLabelPoint", "infoFlags", "jsonPreview", "zoomIn", "zoomOut", "zoomReset", "zoomFit",
            "resetView", "zoomValue", "zoomTool"
        ].forEach((id) => {
            dom[id] = document.getElementById(id);
        });

        dom.baseCtx = dom.stage5BaseCanvas?.getContext("2d", { willReadFrequently: true });
        dom.overlayCtx = dom.stage5OverlayCanvas?.getContext("2d", { willReadFrequently: true });
        dom.previewCtx = dom.previewCanvas?.getContext("2d", { willReadFrequently: true });
    }

    function readRouteState() {
        const root = dom.stage5App;
        const params = new URLSearchParams(location.search);
        state.projectId = sanitizeProjectId(
            params.get("projectId")
            || root?.dataset.projectId
            || localStorage.getItem(STORAGE.folderName)
            || localStorage.getItem(STORAGE.projectId)
            || "seat"
        );
        state.stage4Url = root?.dataset.stage4Url || `/admin/seatmap/stage/4?projectId=${encodeURIComponent(state.projectId)}`;
        state.stage6Url = root?.dataset.stage6Url || `/admin/seatmap/stage/6?projectId=${encodeURIComponent(state.projectId)}`;
        state.seatmapImageUrl = root?.dataset.seatmapImageUrl || projectFileUrl("button-image.png");
        state.buttonImageUrl = root?.dataset.buttonImageUrl || projectFileUrl("button-image.png");
        state.croppedImageUrl = root?.dataset.croppedImageUrl || projectFileUrl("cropped-image.png");
        state.finalImageUrl = root?.dataset.finalImageUrl || projectFileUrl("seatmap-image.png");
        state.debugImageUrl = root?.dataset.debugImageUrl || projectFileUrl("debug-polygons.png");
        state.sectionsUrl = root?.dataset.sectionsUrl || projectFileUrl("seatmap-sections.json");
        state.seatsUrl = root?.dataset.seatsUrl || `/temp/seatmap/seats/${encodeURIComponent(state.projectId)}-seatmap-seats.json`;
        state.bookingButtonsUrl = root?.dataset.bookingButtonsUrl || projectFileUrl("booking-buttons.json");
        state.decorationsUrl = root?.dataset.decorationsUrl || projectFileUrl("seatmap-decorations.json");
        state.saveUrl = root?.dataset.saveUrl || SAVE_URL;

        localStorage.setItem(STORAGE.projectId, state.projectId);
        localStorage.setItem(STORAGE.folderName, state.projectId);
    }

    function bindEvents() {
        bind(dom.partBtn1, "click", () => setPart(1));
        bind(dom.partBtn2, "click", () => setPart(2));
        bind(dom.partBtn3, "click", () => setPart(3));
        bind(dom.partBtn4, "click", () => setPart(4));

        bind(dom.reloadDataBtn, "click", async () => {
            await loadAllData({ forceServer: true });
            if (!state.buttons.length) generateButtons({ silent: true });
            syncAll();
            toast("입력 데이터 다시 읽기 완료");
        });
        bind(dom.generateButtonsBtn, "click", () => generateButtons());
        bind(dom.loadSavedButtonsBtn, "click", () => tryLoadSavedButtons(true));
        bind(dom.saveBookingButtonsBtn, "click", () => saveBookingButtonsToServer());
        bind(dom.toStage6Btn, "click", goStage6);
        bind(dom.applySelectedBtn, "click", applySelectedControls);

        [dom.showSectionPolygon, dom.showButtonPolygon, dom.showSeats, dom.showLabels].forEach((input) => {
            bind(input, "change", () => {
                state.showSectionPolygon = Boolean(dom.showSectionPolygon?.checked);
                state.showButtonPolygon = Boolean(dom.showButtonPolygon?.checked);
                state.showSeats = Boolean(dom.showSeats?.checked);
                state.showLabels = Boolean(dom.showLabels?.checked);
                drawAll();
            });
        });

        [dom.labelInput, dom.fontSizeInput, dom.textColorInput, dom.labelXInput, dom.labelYInput, dom.colorInput, dom.strokeInput, dom.visibleInput, dom.clickableInput].forEach((input) => {
            bind(input, "change", applySelectedControls);
            bind(input, "input", applySelectedControls);
        });

        bind(dom.autoFontBtn, "click", () => {
            const button = getSelectedButton();
            if (!button) return;
            button.fontSize = estimateFitFontSize(button.label || button.sectionName, button.polygon);
            persistButtonsLocal();
            syncAll();
            toast("선택 구역 글자 크기 자동 보정 완료");
        });

        bind(dom.stage5OverlayCanvas, "pointerdown", handlePointerDown);
        bind(dom.stage5OverlayCanvas, "pointermove", handlePointerMove);
        bind(dom.stage5OverlayCanvas, "pointerup", endPointerDrag);
        bind(dom.stage5OverlayCanvas, "pointerleave", () => {
            state.hoverId = "";
            hideTooltip();
            endPointerDrag();
            drawOverlay();
        });
        bind(dom.stage5OverlayCanvas, "click", handleCanvasClick);

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
        bind(dom.zoomTool, "click", () => toast("도면은 스크롤과 휠로 확인하고, label은 드래그해서 수정합니다."));
    }

    function bind(element, eventName, handler) {
        if (element) element.addEventListener(eventName, handler);
    }

    async function loadAllData(options = {}) {
        state.warnings = [];
        await loadSections(options);
        await loadDecorations(options);
        await loadSeats(options);
        validateMatches();
        setPartDone(1, state.sections.length > 0 && state.seats.length > 0);
    }

    async function loadSections(options = {}) {
        const server = options.forceServer ? null : null;
        try {
            const json = await fetchJson(state.sectionsUrl);
            const source = normalizeArray(json.sections || json.items || json);
            state.sections = source.map(normalizeSection).filter((section) => section.sectionId || section.sectionName || section.polygon.length);
            persistJson(STORAGE.sections, state.sections);
            persistJson(STORAGE.sectionsCompat, state.sections);
            return;
        } catch (error) {
            console.warn("[SeatTrace Stage5] seatmap-sections.json 로드 실패", error);
        }

        const local = readJson(STORAGE.sections, null) || readJson(STORAGE.sectionsCompat, null) || readJson(STORAGE.sectionsHeader, null) || server;
        if (Array.isArray(local) && local.length) {
            state.sections = local.map(normalizeSection).filter((section) => section.sectionId || section.sectionName || section.polygon.length);
            state.warnings.push("seatmap-sections.json 서버 파일을 읽지 못해 localStorage 구역 데이터를 사용했습니다.");
        } else {
            state.sections = [];
            state.warnings.push("seatmap-sections.json을 찾지 못했습니다. Stage 3 저장을 먼저 확인하세요.");
        }
    }

    async function loadDecorations(options = {}) {
        state.seatLayouts = [];
        try {
            const json = await fetchJson(state.decorationsUrl);
            const source = normalizeArray(json.seatLayouts || json.stage4SeatLayouts || []);
            state.seatLayouts = source.map(normalizeSeatLayout).filter((layout) => layout.sectionId || layout.sectionName);
            persistJson(STORAGE.decorations, json);
            return;
        } catch (error) {
            console.warn("[SeatTrace Stage5] seatmap-decorations.json 로드 실패", error);
        }

        const local = readJson(STORAGE.decorations, null);
        const source = normalizeArray(local?.seatLayouts || local?.stage4SeatLayouts || []);
        if (source.length) {
            state.seatLayouts = source.map(normalizeSeatLayout).filter((layout) => layout.sectionId || layout.sectionName);
            state.warnings.push("seatmap-decorations.json 서버 파일을 읽지 못해 localStorage Stage 4 layout을 사용했습니다.");
        }
    }

    async function loadSeats(options = {}) {
        try {
            const json = await fetchJson(state.seatsUrl);
            const source = normalizeArray(json.seats || json.items || json);
            state.seats = source.map(normalizeSeat).filter((seat) => seat.sectionId || seat.id);
            persistJson(STORAGE.seats, state.seats);
            persistJson(STORAGE.seatsCompat, state.seats);
            return;
        } catch (error) {
            console.warn("[SeatTrace Stage5] seatmap-seats.json 로드 실패", error);
        }

        const local = readJson(STORAGE.seats, null) || readJson(STORAGE.seatsCompat, null);
        if (Array.isArray(local) && local.length) {
            state.seats = local.map(normalizeSeat).filter((seat) => seat.sectionId || seat.id);
            state.warnings.push("좌석 JSON 서버 파일을 읽지 못해 localStorage 좌석 데이터를 사용했습니다.");
        } else if (local && typeof local === "object") {
            state.seats = Object.values(local).flat().map(normalizeSeat).filter((seat) => seat.sectionId || seat.id);
            state.warnings.push("좌석 JSON 서버 파일을 읽지 못해 localStorage 좌석 데이터를 사용했습니다.");
        } else {
            state.seats = [];
            state.warnings.push("seats/{projectId}-seatmap-seats.json을 찾지 못했습니다. Stage 4 저장을 먼저 확인하세요.");
        }
    }

    async function loadBaseImage() {
        const candidates = unique([
            state.buttonImageUrl,
            state.seatmapImageUrl,
            projectFileUrl("button-image.png"),
            state.croppedImageUrl,
            projectFileUrl("cropped-image.png"),
            state.finalImageUrl,
            projectFileUrl("seatmap-image.png")
        ]).filter(Boolean);

        for (const url of candidates) {
            try {
                const image = await loadImage(noCache(url));
                state.image = image;
                state.baseImageLoaded = true;
                state.baseImageUrl = url;
                setupCanvases(image.naturalWidth || image.width, image.naturalHeight || image.height);
                drawBase();
                if (dom.miniImg) dom.miniImg.src = noCache(url);
                return;
            } catch (error) {
                console.warn("[SeatTrace Stage5] 기준 도면 로드 실패", url, error);
            }
        }

        state.image = null;
        state.baseImageLoaded = false;
        setupCanvases(1000, 700);
        drawBase();
        state.warnings.push("button-image.png와 cropped-image.png를 읽지 못했습니다. 배경 없이 polygon만 표시합니다.");
    }

    async function tryLoadSavedButtons(showMessage) {
        let loaded = [];
        try {
            const json = await fetchJson(state.bookingButtonsUrl);
            loaded = normalizeArray(json.buttons || json.areas || json);
        } catch (error) {
            const local = readJson(STORAGE.bookingButtons, null)
                || readJson(STORAGE.bookingButtonsCompat, null)
                || readJson(STORAGE.bookingButtonsCompat2, null);
            loaded = normalizeArray(local);
        }

        if (!loaded.length) {
            if (showMessage) toast("저장된 booking-buttons.json이 없습니다.");
            return false;
        }

        const bySection = new Map(state.sections.map((section) => [section.sectionId, section]));
        state.buttons = loaded.map((button, index) => normalizeBookingButton(button, bySection.get(String(button.sectionId || "")), index)).filter((button) => button.sectionId && button.sectionName && button.polygon.length >= 3);
        persistButtonsLocal();
        setPartDone(2, state.buttons.length > 0);
        setPartDone(3, state.buttons.length > 0);
        if (!state.selectedId && state.buttons.length) state.selectedId = state.buttons[0].id;
        syncAll();
        if (showMessage) toast(`booking button ${state.buttons.length}개 불러오기 완료`);
        return true;
    }

    function normalizeSection(raw, index = 0) {
        const polygons = getPolygons(raw);
        const polygon = polygons[0] || [];
        const bbox = normalizeBbox(raw.bbox) || getBbox(polygon);
        const sectionName = firstText(raw.sectionName, raw.name, raw.section, raw.label);
        const sectionId = firstText(raw.sectionId, raw.id);

        return {
            raw,
            id: firstText(raw.id, sectionId),
            sectionId,
            sectionName,
            name: sectionName,
            section: sectionName,
            label,
            groupKey: raw.groupKey ?? raw.group ?? raw.groupName ?? "",
            groupIndex: raw.groupIndex ?? raw.index ?? index + 1,
            floor: raw.floor ?? "",
            grade: raw.grade ?? raw.gradeName ?? "",
            price: numberOrBlank(raw.price ?? raw.seatPrice),
            color: normalizeColor(raw.color || raw.renderColor || raw.fillColor || colorByIndex(index)),
            renderColor: normalizeColor(raw.renderColor || raw.color || raw.fillColor || colorByIndex(index)),
            polygon,
            polygons: polygons.length ? polygons : (polygon.length ? [polygon] : []),
            bbox,
            angle: Number(raw.angle || 0)
        };
    }

    function normalizeSeat(raw) {
        const parsed = parseSeatId(raw.id || raw.seatId || raw.seatNumber || raw.name || "");
        const sectionName = firstText(raw.sectionName, raw.section, raw.name, raw.label, parsed.section);
        const matchedSection = findSectionByAny(raw.sectionId || raw.section_id || raw.sectionKey, sectionName);
        const sectionId = firstText(raw.sectionId, raw.section_id, raw.sectionKey, matchedSection?.sectionId);
        const finalSectionName = firstText(sectionName, matchedSection?.sectionName);
        const floor = firstText(raw.floor, parsed.floor, matchedSection?.floor);
        const grade = firstText(raw.grade, raw.gradeName, parsed.grade, matchedSection?.grade);
        const status = String(firstText(raw.status, parsed.status, AVAILABLE)).toUpperCase();

        return {
            ...raw,
            id: buildSeatId(floor || "1", finalSectionName, firstText(raw.row, raw.rowName, raw.seatRow, parsed.row, "A"), firstText(raw.col, raw.no, raw.seatNo, raw.seatCol, parsed.col, "1"), grade || "일반석", status),
            sectionId,
            sectionName: finalSectionName,
            section: firstText(raw.section, finalSectionName),
            groupKey: raw.groupKey ?? matchedSection?.groupKey ?? "",
            groupIndex: raw.groupIndex ?? matchedSection?.groupIndex ?? "",
            floor,
            grade,
            price: numberOrBlank(raw.price ?? raw.seatPrice ?? matchedSection?.price),
            row: firstText(raw.row, raw.rowName, raw.seatRow, parsed.row),
            col: numberOrText(raw.col ?? raw.no ?? raw.seatNo ?? raw.seatCol ?? parsed.col),
            status,
            x: Number(raw.x || 0),
            y: Number(raw.y || 0),
            size: Number(raw.size || raw.w || raw.width || 6),
            angle: Number(raw.angle || 0)
        };
    }

    function normalizeSeatLayout(raw) {
        const sectionName = firstText(raw.sectionName, raw.section, raw.name, raw.label);
        const matchedSection = findSectionByAny(raw.sectionId, sectionName);
        const buttonPolygon = normalizePoints(raw.buttonPolygon || raw.bookingPolygon || []);
        const polygon = normalizePoints(raw.polygon || []);
        const actualBounds = normalizeBbox(raw.actualBounds || raw.seatBounds || raw.bounds);
        return {
            ...raw,
            sectionId: firstText(raw.sectionId, matchedSection?.sectionId),
            sectionName: firstText(sectionName, matchedSection?.sectionName),
            floor: firstText(raw.floor, matchedSection?.floor),
            grade: firstText(raw.grade, matchedSection?.grade),
            price: numberOrBlank(raw.price !== undefined ? raw.price : matchedSection?.price),
            seatCount: Number(raw.seatCount || 0),
            polygon,
            buttonPolygon: buttonPolygon.length ? buttonPolygon : (actualBounds ? rectToPolygon(actualBounds) : polygon),
            labelPoint: normalizePoint(raw.labelPoint)
        };
    }

    function normalizeBookingButton(raw, section, index = 0) {
        const sectionId = firstText(raw.sectionId, section?.sectionId);
        const sectionName = firstText(raw.sectionName, raw.name, raw.section, raw.label, section?.sectionName);
        const layout = findLayoutBySection(sectionId, sectionName);
        const polygon = normalizePoints(raw.polygon || raw.points || layout?.buttonPolygon || layout?.polygon || section?.polygon || []);
        const sectionSeats = state.seats.filter((seat) => sameSeatSection(seat, sectionId, sectionName));
        const labelPoint = normalizePoint(raw.labelPoint) || normalizePoint({ x: raw.x, y: raw.y }) || layout?.labelPoint || getSafeLabelPoint(polygon);
        const color = toPastelColor(raw.color || section?.color || section?.renderColor || colorByIndex(index));
        const strokeColor = normalizeColor(raw.strokeColor || makeReadableStroke(color));
        const label = firstText(raw.label, raw.buttonName, raw.sectionLabel, sectionName);
        const fontSize = clamp(Number(raw.fontSize || 0) || estimateFitFontSize(label, polygon), 9, 34);
        const textColor = normalizeColor(raw.textColor || autoTextColor(color));

        return {
            id: firstText(raw.id, raw.buttonId, `button-${sectionId || index + 1}`),
            sectionId,
            sectionName,
            section: firstText(raw.section, sectionName),
            name: firstText(raw.name, sectionName),
            label,
            groupKey: raw.groupKey ?? section?.groupKey ?? "",
            groupIndex: raw.groupIndex ?? section?.groupIndex ?? index + 1,
            floor: raw.floor ?? layout?.floor ?? section?.floor ?? "",
            grade: raw.grade ?? layout?.grade ?? section?.grade ?? "",
            price: numberOrBlank(raw.price ?? layout?.price ?? section?.price),
            polygon,
            labelPoint,
            x: round(labelPoint.x),
            y: round(labelPoint.y),
            seatCount: Number(raw.seatCount ?? sectionSeats.length),
            availableSeatCount: Number(raw.availableSeatCount ?? sectionSeats.filter(isAvailableSeat).length),
            color,
            hoverColor: raw.hoverColor || toHoverColor(color),
            strokeColor,
            textColor,
            fontSize,
            fillAlpha: Number(raw.fillAlpha || FINAL_FILL_ALPHA),
            visible: raw.visible !== false,
            clickable: raw.clickable !== false
        };
    }

    function findSectionByAny(sectionId, sectionName) {
        const id = String(sectionId || "");
        const name = String(sectionName || "");
        return state.sections.find((section) => section.sectionId === id)
            || state.sections.find((section) => section.sectionName === name || section.section === name || section.name === name)
            || null;
    }

    function findLayoutBySection(sectionId, sectionName) {
        const id = String(sectionId || "");
        const name = String(sectionName || "");
        return state.seatLayouts.find((layout) => layout.sectionId === id)
            || state.seatLayouts.find((layout) => layout.sectionName === name || layout.section === name)
            || null;
    }

    function sameSeatSection(seat, sectionId, sectionName) {
        return (seat.sectionId && sectionId && String(seat.sectionId) === String(sectionId))
            || normalizeSectionName(seat.sectionName || seat.section) === normalizeSectionName(sectionName);
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

    function buildSeatId(floor, section, row, col, grade, status) {
        return [floor, section, row, col, grade, status].map(cleanSeatPart).join("-");
    }

    function cleanSeatPart(value) {
        return String(value ?? "").trim().replace(/\s+/g, "_").replace(/-+/g, "_") || "EMPTY";
    }

    function numberOrText(value) {
        const number = Number(value);
        return Number.isFinite(number) && String(value).trim() !== "" ? number : firstText(value);
    }

    function normalizeSectionName(value) {
        return String(value || "").trim().replace(/\s+/g, "_");
    }

    function rectToPolygon(rect) {
        const box = normalizeBbox(rect);
        if (!box) return [];
        return [
            { x: box.x, y: box.y },
            { x: box.x + box.w, y: box.y },
            { x: box.x + box.w, y: box.y + box.h },
            { x: box.x, y: box.y + box.h }
        ];
    }

    function validateMatches() {
        const sectionIds = new Set(state.sections.map((section) => section.sectionId).filter(Boolean));
        const seatSectionIds = new Set(state.seats.map((seat) => seat.sectionId).filter(Boolean));

        const missingName = state.sections.filter((section) => !section.sectionName).length;
        const missingSectionId = state.sections.filter((section) => !section.sectionId).length;
        const missingPolygon = state.sections.filter((section) => section.polygon.length < 3).length;
        const unmatchedSeats = state.seats.filter((seat) => seat.sectionId && !sectionIds.has(seat.sectionId)).length;
        const sectionsWithoutSeats = state.sections.filter((section) => section.sectionId && !seatSectionIds.has(section.sectionId)).length;
        const missingMeta = state.sections.filter((section) => !section.floor || !section.grade || section.price === "").length;

        state.matchFailCount = unmatchedSeats;
        state.missingNameCount = missingName;

        const list = [];
        if (missingSectionId) list.push(`sectionId가 없는 구역 ${missingSectionId}개: 저장 대상에서 제외됩니다.`);
        if (missingName) list.push(`sectionName/name/section/label이 없는 구역 ${missingName}개: 임시명 생성 없이 저장을 막습니다.`);
        if (missingPolygon) list.push(`polygon이 없는 구역 ${missingPolygon}개: bbox만으로 버튼을 만들지 않으므로 제외됩니다.`);
        if (unmatchedSeats) list.push(`좌석 JSON에는 있으나 section JSON에 없는 sectionId 좌석 ${unmatchedSeats}개가 있습니다.`);
        if (sectionsWithoutSeats) list.push(`section은 있으나 좌석이 없는 구역 ${sectionsWithoutSeats}개가 있습니다.`);
        if (missingMeta) list.push(`floor/grade/price 중 누락된 구역 ${missingMeta}개가 있습니다. section 값 우선, 없으면 좌석 값으로 보정합니다.`);
        state.warnings = unique([...state.warnings, ...list]);
    }

    function generateButtons(options = {}) {
        const previousBySection = new Map(state.buttons.map((button) => [button.sectionId, button]));
        const generated = [];
        const blocked = [];

        state.sections.forEach((section, index) => {
            const layout = findLayoutBySection(section.sectionId, section.sectionName);
            const sourcePolygon = normalizePoints(layout?.buttonPolygon || layout?.polygon || section.polygon || []);
            if (!section.sectionId || !section.sectionName || sourcePolygon.length < 3) {
                blocked.push(section.sectionId || section.sectionName || `index-${index + 1}`);
                return;
            }

            const sectionSeats = state.seats.filter((seat) => sameSeatSection(seat, section.sectionId, section.sectionName));
            const firstSeat = sectionSeats[0] || {};
            const previous = previousBySection.get(section.sectionId);
            const color = toPastelColor(previous?.color || section.color || section.renderColor || colorByIndex(index));
            const strokeColor = normalizeColor(previous?.strokeColor || makeReadableStroke(color));
            const labelPoint = previous?.labelPoint ? copyPoint(previous.labelPoint) : (layout?.labelPoint || getSafeLabelPoint(sourcePolygon));
            const floor = firstText(section.floor, layout?.floor, firstSeat.floor);
            const grade = firstText(section.grade, layout?.grade, firstSeat.grade);
            const price = numberOrBlank(section.price !== "" ? section.price : (layout?.price !== "" ? layout?.price : firstSeat.price));
            const label = firstText(previous?.label, section.label, section.sectionName);
            const fontSize = clamp(Number(previous?.fontSize || 0) || estimateFitFontSize(label, sourcePolygon), 9, 34);
            const textColor = normalizeColor(previous?.textColor || autoTextColor(color));

            generated.push({
                id: previous?.id || `button-${section.sectionId}`,
                sectionId: section.sectionId,
                sectionName: section.sectionName,
                section: section.sectionName,
                name: section.sectionName,
                label,
                groupKey: section.groupKey,
                groupIndex: section.groupIndex,
                floor,
                grade,
                price,
                polygon: sourcePolygon.map(copyPoint),
                labelPoint,
                x: round(labelPoint.x),
                y: round(labelPoint.y),
                seatCount: sectionSeats.length,
                availableSeatCount: sectionSeats.filter(isAvailableSeat).length,
                color,
                hoverColor: toHoverColor(color),
                strokeColor,
                textColor,
                fontSize,
                fillAlpha: Number(previous?.fillAlpha || FINAL_FILL_ALPHA),
                visible: previous?.visible !== false,
                clickable: previous?.clickable !== false
            });
        });

        state.buttons = generated;
        if (!state.selectedId || !state.buttons.some((button) => button.id === state.selectedId)) {
            state.selectedId = state.buttons[0]?.id || "";
        }
        persistButtonsLocal();
        setPartDone(2, state.buttons.length > 0);
        setPartDone(3, state.buttons.length > 0);
        syncAll();

        if (blocked.length) {
            state.warnings = unique([...state.warnings, `저장 제외 구역 ${blocked.length}개: sectionId/sectionName/polygon 중 하나가 없습니다.`]);
            renderWarnings();
        }
        if (!options.silent) toast(`booking button ${state.buttons.length}개 생성 완료`);
    }

    function syncAll() {
        syncStats();
        renderWarnings();
        renderButtonList();
        syncSelectedPanel();
        syncSaveSummary();
        renderJsonPreview();
        drawAll();
    }

    function syncStats() {
        setText(dom.sectionCountText, state.sections.length);
        setText(dom.seatCountText, state.seats.length);
        setText(dom.matchFailCountText, state.matchFailCount || 0);
        setText(dom.missingNameCountText, state.missingNameCount || 0);
    }

    function renderWarnings() {
        if (!dom.warningList) return;
        if (!state.warnings.length) {
            dom.warningList.innerHTML = `<div class="stage5-warning is-ok">입력 데이터 검증 완료: 저장 가능한 상태입니다.</div>`;
            return;
        }
        dom.warningList.innerHTML = state.warnings.map((message) => `<div class="stage5-warning">${escapeHtml(message)}</div>`).join("");
    }

    function renderButtonList() {
        if (!dom.buttonList) return;
        if (!state.buttons.length) {
            dom.buttonList.innerHTML = `<div class="help-text">생성된 booking button이 없습니다.</div>`;
            return;
        }

        dom.buttonList.innerHTML = state.buttons.map((button) => {
            const active = button.id === state.selectedId ? " active" : "";
            const flag = [button.visible ? "표시" : "숨김", button.clickable ? "클릭" : "비활성"].join(" · ");
            return `
                <button type="button" class="section-item stage5-button-item${active}" data-button-id="${escapeHtml(button.id)}">
                    <i class="section-item__color" style="background:${escapeHtml(button.color)}"></i>
                    <span class="stage5-button-item__meta">
                        <strong>${escapeHtml(button.sectionName)}</strong>
                        <span>${escapeHtml(button.sectionId)} · ${escapeHtml(button.grade || "등급 누락")} · ${formatPrice(button.price)} · ${escapeHtml(flag)}</span>
                    </span>
                    <em class="stage5-button-item__count">${button.availableSeatCount}/${button.seatCount}</em>
                </button>
            `;
        }).join("");

        dom.buttonList.querySelectorAll("[data-button-id]").forEach((item) => {
            item.addEventListener("click", () => selectButton(item.dataset.buttonId));
        });
    }

    function syncSelectedPanel() {
        const button = getSelectedButton();
        if (!button) {
            setText(dom.infoSectionId, "-");
            setText(dom.infoSectionName, "-");
            setText(dom.infoFloorGrade, "-");
            setText(dom.infoPrice, "-");
            setText(dom.infoSeatCount, "-");
            setText(dom.infoAvailableCount, "-");
            setText(dom.infoLabelPoint, "-");
            setText(dom.infoFlags, "-");
            setInputValue(dom.labelInput, "");
            setInputValue(dom.fontSizeInput, "");
            setInputValue(dom.textColorInput, DEFAULT_TEXT_COLOR);
            setInputValue(dom.labelXInput, "");
            setInputValue(dom.labelYInput, "");
            return;
        }

        setText(dom.infoSectionId, button.sectionId);
        setText(dom.infoSectionName, button.sectionName);
        setText(dom.infoFloorGrade, `${button.floor || "층 누락"} / ${button.grade || "등급 누락"}`);
        setText(dom.infoPrice, formatPrice(button.price));
        setText(dom.infoSeatCount, button.seatCount);
        setText(dom.infoAvailableCount, button.availableSeatCount);
        setText(dom.infoLabelPoint, `${round(button.labelPoint.x)}, ${round(button.labelPoint.y)}`);
        setText(dom.infoFlags, `${button.visible ? "visible" : "hidden"} / ${button.clickable ? "clickable" : "disabled"}`);

        setInputValue(dom.labelInput, button.label || button.sectionName);
        setInputValue(dom.fontSizeInput, Math.round(button.fontSize || estimateFitFontSize(button.label || button.sectionName, button.polygon)));
        setInputValue(dom.textColorInput, colorToHex(button.textColor || autoTextColor(button.color)));
        setInputValue(dom.labelXInput, round(button.labelPoint.x));
        setInputValue(dom.labelYInput, round(button.labelPoint.y));
        setInputValue(dom.colorInput, colorToHex(button.color));
        setInputValue(dom.strokeInput, colorToHex(button.strokeColor || makeReadableStroke(button.color)));
        if (dom.visibleInput) dom.visibleInput.checked = button.visible !== false;
        if (dom.clickableInput) dom.clickableInput.checked = button.clickable !== false;
    }

    function syncSaveSummary() {
        const blocked = state.buttons.filter((button) => !button.sectionId || !button.sectionName || button.polygon.length < 3).length;
        const missingMeta = state.buttons.filter((button) => !button.floor || !button.grade || button.price === "").length;
        const text = `저장할 버튼 ${state.buttons.length}개 / 저장 불가 ${blocked}개 / 메타 누락 ${missingMeta}개`;
        setText(dom.saveSummary, text);
    }

    function renderJsonPreview() {
        if (!dom.jsonPreview) return;
        const json = createBookingButtonsJson();
        dom.jsonPreview.textContent = JSON.stringify(json.slice(0, 3), null, 2) + (json.length > 3 ? `\n... ${json.length - 3}개 더 있음` : "");
    }

    function setPart(part, userAction = true) {
        [1, 2, 3, 4].forEach((no) => {
            const panel = dom[`part${no}Panel`];
            const button = dom[`partBtn${no}`];
            const status = dom[`part${no}Status`];
            const active = no === part;
            panel?.classList.toggle("is-active", active);
            panel?.classList.toggle("is-done", state.completedParts.has(no));
            button?.classList.toggle("active", active);
            if (status) {
                if (active) status.textContent = "진행중";
                else if (state.completedParts.has(no)) status.textContent = "완료";
                else status.textContent = "대기";
            }
        });
        if (userAction) syncAll();
    }

    function setPartDone(part, done) {
        if (done) state.completedParts.add(part);
        else state.completedParts.delete(part);
    }

    function selectButton(id) {
        if (!id) return;
        state.selectedId = id;
        syncAll();
    }

    function applySelectedControls() {
        const button = getSelectedButton();
        if (!button) return;

        const labelText = String(dom.labelInput?.value || "").trim();
        if (labelText) {
            button.label = labelText;
            button.name = labelText;
        }

        const fontSize = Number(dom.fontSizeInput?.value);
        if (Number.isFinite(fontSize) && fontSize > 0) {
            button.fontSize = clamp(fontSize, 9, 42);
        }
        if (dom.textColorInput?.value) {
            button.textColor = normalizeColor(dom.textColorInput.value);
        }

        const x = Number(dom.labelXInput?.value);
        const y = Number(dom.labelYInput?.value);
        if (Number.isFinite(x)) button.labelPoint.x = x;
        if (Number.isFinite(y)) button.labelPoint.y = y;
        button.x = round(button.labelPoint.x);
        button.y = round(button.labelPoint.y);

        if (dom.colorInput?.value) {
            button.color = toPastelColor(dom.colorInput.value);
            button.hoverColor = toHoverColor(button.color);
            if (!dom.strokeInput?.value) button.strokeColor = makeReadableStroke(button.color);
        }
        if (dom.strokeInput?.value) button.strokeColor = normalizeColor(dom.strokeInput.value);
        if (dom.visibleInput) button.visible = dom.visibleInput.checked;
        if (dom.clickableInput) button.clickable = dom.clickableInput.checked;
        persistButtonsLocal();
        syncSaveSummary();
        renderButtonList();
        renderJsonPreview();
        drawAll();
        syncSelectedPanel();
    }

    function getSelectedButton() {
        return state.buttons.find((button) => button.id === state.selectedId) || null;
    }

    function setupCanvases(width, height) {
        state.width = Math.max(1, Math.round(Number(width || 1000)));
        state.height = Math.max(1, Math.round(Number(height || 700)));
        [dom.stage5BaseCanvas, dom.stage5OverlayCanvas].forEach((canvas) => {
            if (!canvas) return;
            canvas.width = state.width;
            canvas.height = state.height;
            canvas.style.width = `${state.width * state.zoom}px`;
            canvas.style.height = `${state.height * state.zoom}px`;
        });
        if (dom.canvasBox) {
            dom.canvasBox.style.width = `${state.width * state.zoom}px`;
            dom.canvasBox.style.height = `${state.height * state.zoom}px`;
        }
        setText(dom.canvasSize, `${state.width} × ${state.height}px / ${Math.round(state.zoom * 100)}%`);
    }

    function setZoom(value) {
        state.zoom = Math.min(3, Math.max(0.25, Math.round(Number(value || 1) * 100) / 100));
        setupCanvases(state.width, state.height);
        drawAll();
        if (dom.zoomValue) dom.zoomValue.textContent = `${Math.round(state.zoom * 100)}%`;
    }

    function fitZoom() {
        const frame = dom.canvasScroll;
        if (!frame || !state.width || !state.height) return;
        const usableW = Math.max(320, frame.clientWidth - 90);
        const usableH = Math.max(260, frame.clientHeight - 110);
        setZoom(Math.min(usableW / state.width, usableH / state.height, 1.5));
    }

    function drawAll() {
        drawBase();
        drawOverlay();
        drawPreview();
    }

    function drawBase() {
        if (!dom.baseCtx) return;
        const ctx = dom.baseCtx;
        ctx.clearRect(0, 0, state.width, state.height);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, state.width, state.height);
        if (state.image) {
            ctx.drawImage(state.image, 0, 0, state.width, state.height);
        } else {
            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(0, 0, state.width, state.height);
            ctx.fillStyle = "#64748b";
            ctx.font = "bold 22px Arial";
            ctx.textAlign = "center";
            ctx.fillText("seatmap-image.png 없음", state.width / 2, state.height / 2);
        }
    }

    function drawOverlay(targetCtx, options = {}) {
        const ctx = targetCtx || dom.overlayCtx;
        if (!ctx) return;
        if (!options.noClear) ctx.clearRect(0, 0, state.width, state.height);

        if (state.showSectionPolygon || options.forceSections) {
            drawSections(ctx);
        }
        if (state.showSeats || options.forceSeats) {
            drawSeats(ctx);
        }
        if (state.showButtonPolygon || options.forceButtons) {
            drawButtons(ctx, options);
        }
        if (state.showLabels || options.forceLabels) {
            drawLabels(ctx);
        }
    }

    function drawSections(ctx) {
        ctx.save();
        state.sections.forEach((section) => {
            if (section.polygon.length < 3) return;
            ctx.beginPath();
            pathPolygon(ctx, section.polygon);
            ctx.setLineDash([8, 5]);
            ctx.lineWidth = 2;
            ctx.strokeStyle = "rgba(15, 23, 42, 0.42)";
            ctx.stroke();
        });
        ctx.restore();
    }

    function drawSeats(ctx) {
        if (!state.seats.length) return;
        ctx.save();
        state.seats.forEach((seat) => {
            if (!Number.isFinite(seat.x) || !Number.isFinite(seat.y)) return;
            const size = Math.max(2, Number(seat.size || 5));
            ctx.save();
            ctx.translate(seat.x, seat.y);
            ctx.rotate((Number(seat.angle || 0) * Math.PI) / 180);
            ctx.fillStyle = isAvailableSeat(seat) ? "rgba(30, 64, 175, 0.28)" : "rgba(148, 163, 184, 0.30)";
            ctx.strokeStyle = "rgba(255,255,255,0.78)";
            ctx.lineWidth = 1;
            ctx.fillRect(-size / 2, -size / 2, size, size);
            ctx.strokeRect(-size / 2, -size / 2, size, size);
            ctx.restore();
        });
        ctx.restore();
    }

    function drawButtons(ctx, options = {}) {
        ctx.save();
        state.buttons.forEach((button) => {
            if (button.polygon.length < 3 || button.visible === false) return;
            const selected = button.id === state.selectedId;
            const hovered = button.id === state.hoverId;
            ctx.beginPath();
            pathPolygon(ctx, button.polygon);
            const finalMode = options.renderMode === "final";
            const debugMode = options.renderMode === "debug";
            const fillAlpha = finalMode ? Number(button.fillAlpha || FINAL_FILL_ALPHA) : EDIT_FILL_ALPHA;
            ctx.fillStyle = debugMode ? "rgba(239, 68, 68, 0.08)" : (selected || hovered ? (button.hoverColor || toHoverColor(button.color)) : hexToRgba(button.color, fillAlpha));
            ctx.strokeStyle = debugMode ? DEBUG_STROKE_COLOR : (selected ? DEBUG_STROKE_COLOR : (button.strokeColor || makeReadableStroke(button.color) || DEFAULT_COLOR));
            ctx.lineWidth = debugMode ? 4 : (selected ? 4 : 2);
            ctx.setLineDash(button.clickable === false ? [5, 4] : []);
            ctx.fill();
            ctx.stroke();
            if (button.clickable === false) {
                ctx.save();
                ctx.globalAlpha = 0.28;
                ctx.fillStyle = "#64748b";
                ctx.fill();
                ctx.restore();
            }
        });
        ctx.restore();
    }

    function drawLabels(ctx, options = {}) {
        ctx.save();
        state.buttons.forEach((button) => {
            if (button.visible === false || !button.labelPoint) return;
            const selected = button.id === state.selectedId;
            const x = Number(button.labelPoint.x || 0);
            const y = Number(button.labelPoint.y || 0);
            const marker = options.marker !== false;
            const text = button.label || button.sectionName;
            const fontSize = clamp(Number(button.fontSize || estimateFitFontSize(text, button.polygon)), 9, 42);

            if (marker) {
                ctx.beginPath();
                ctx.arc(x, y, selected ? 8 : 6, 0, Math.PI * 2);
                ctx.fillStyle = selected ? DEBUG_STROKE_COLOR : "#111827";
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = "#ffffff";
                ctx.stroke();
            }

            ctx.font = `900 ${fontSize}px Pretendard, Arial, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.lineWidth = Math.max(3, Math.round(fontSize * 0.22));
            ctx.strokeStyle = "rgba(255,255,255,0.88)";
            ctx.strokeText(text, x, marker ? y - Math.max(16, fontSize * 1.1) : y);
            ctx.fillStyle = selected && marker ? DEBUG_STROKE_COLOR : (button.textColor || autoTextColor(button.color));
            ctx.fillText(text, x, marker ? y - Math.max(16, fontSize * 1.1) : y);
        });
        ctx.restore();
    }

    function drawPreview() {
        const canvas = dom.previewCanvas;
        const ctx = dom.previewCtx;
        if (!canvas || !ctx) return;
        const maxW = 300;
        const scale = Math.min(1, maxW / state.width);
        canvas.width = Math.max(1, Math.round(state.width * scale));
        canvas.height = Math.max(1, Math.round(state.height * scale));
        ctx.save();
        ctx.scale(scale, scale);
        ctx.clearRect(0, 0, state.width, state.height);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, state.width, state.height);
        if (state.image) ctx.drawImage(state.image, 0, 0, state.width, state.height);
        drawButtons(ctx, { forceButtons: true, renderMode: "final" });
        drawLabels(ctx, { marker: false });
        ctx.restore();
    }

    function handlePointerDown(event) {
        const point = getCanvasPoint(event);
        const labelHit = findLabelAt(point);
        if (labelHit) {
            state.draggingLabelId = labelHit.id;
            state.selectedId = labelHit.id;
            state.labelDragOffset = {
                x: point.x - labelHit.labelPoint.x,
                y: point.y - labelHit.labelPoint.y
            };
            dom.stage5OverlayCanvas?.setPointerCapture?.(event.pointerId);
            syncSelectedPanel();
            drawAll();
        }
    }

    function handlePointerMove(event) {
        const point = getCanvasPoint(event);
        if (state.draggingLabelId) {
            const button = state.buttons.find((item) => item.id === state.draggingLabelId);
            if (button) {
                button.labelPoint = {
                    x: clamp(point.x - state.labelDragOffset.x, 0, state.width),
                    y: clamp(point.y - state.labelDragOffset.y, 0, state.height)
                };
                button.x = round(button.labelPoint.x);
                button.y = round(button.labelPoint.y);
                syncSelectedPanel();
                persistButtonsLocal();
                drawAll();
            }
            return;
        }

        const hover = findTopButtonAt(point);
        const nextHoverId = hover?.id || "";
        if (state.hoverId !== nextHoverId) {
            state.hoverId = nextHoverId;
            drawOverlay();
        }

        if (hover) showTooltip(event, hover);
        else hideTooltip();
    }

    function endPointerDrag() {
        if (!state.draggingLabelId) return;
        state.draggingLabelId = "";
        persistButtonsLocal();
        renderJsonPreview();
        syncSaveSummary();
        drawAll();
    }

    function handleCanvasClick(event) {
        if (state.draggingLabelId) return;
        const point = getCanvasPoint(event);
        const labelHit = findLabelAt(point);
        const button = labelHit || findTopButtonAt(point);
        if (button) selectButton(button.id);
    }

    function findTopButtonAt(point) {
        for (let i = state.buttons.length - 1; i >= 0; i -= 1) {
            const button = state.buttons[i];
            if (button.visible === false) continue;
            if (pointInPolygon(point, button.polygon)) return button;
        }
        return null;
    }

    function findLabelAt(point) {
        for (let i = state.buttons.length - 1; i >= 0; i -= 1) {
            const button = state.buttons[i];
            const label = button.labelPoint;
            if (!label) continue;
            if (distance(point, label) <= 14) return button;
        }
        return null;
    }

    function getCanvasPoint(event) {
        const rect = dom.stage5OverlayCanvas.getBoundingClientRect();
        const scaleX = state.width / Math.max(1, rect.width);
        const scaleY = state.height / Math.max(1, rect.height);
        return {
            x: clamp((event.clientX - rect.left) * scaleX, 0, state.width),
            y: clamp((event.clientY - rect.top) * scaleY, 0, state.height)
        };
    }

    function showTooltip(event, button) {
        if (!dom.stage5Tooltip) return;
        dom.stage5Tooltip.style.display = "block";
        dom.stage5Tooltip.style.left = `${event.clientX + 14}px`;
        dom.stage5Tooltip.style.top = `${event.clientY + 14}px`;
        dom.stage5Tooltip.innerHTML = `
            <strong>${escapeHtml(button.sectionName)}</strong><br>
            ${escapeHtml(button.grade || "등급 누락")} · ${formatPrice(button.price)}<br>
            좌석 ${button.availableSeatCount}/${button.seatCount} · ${escapeHtml(button.sectionId)}
        `;
    }

    function hideTooltip() {
        if (dom.stage5Tooltip) dom.stage5Tooltip.style.display = "none";
    }

    async function saveBookingButtonsToServer(options = {}) {
        validateBeforeSave();
        const finalButtons = createBookingButtonsJson();
        const button = options.source === "header" ? null : dom.saveBookingButtonsBtn;
        const before = button?.textContent || "";

        try {
            if (button) {
                button.disabled = true;
                button.textContent = "저장 중...";
            }

            const payload = {
                page: "stage5",
                folderName: state.projectId,
                bookingButtonJsonText: JSON.stringify(finalButtons, null, 2),
                imageDataUrl: exportDebugImageDataUrl(),
                finalImageDataUrl: exportFinalImageDataUrl(),
                sectionCount: state.sections.length,
                seatCount: state.seats.length,
                bookingButtonCount: finalButtons.length,
                stage5Saved: true
            };

            const response = await fetch(state.saveUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || "booking-buttons.json 저장 실패");
            }

            const result = await response.json();
            const bookingUrl = result.bookingButtonsJsonUrl || state.bookingButtonsUrl;
            const finalUrl = result.folderUrl ? `${result.folderUrl}/seatmap-image.png` : state.finalImageUrl;
            localStorage.setItem(STORAGE.bookingButtonsUrl, bookingUrl);
            localStorage.setItem(STORAGE.bookingButtonsJsonUrl, bookingUrl);
            localStorage.setItem(STORAGE.finalImageUrl, finalUrl);
            localStorage.setItem(STORAGE.generatedOverviewImage, finalUrl);
            persistButtonsLocal();
            setPartDone(4, true);
            setPart(4, false);
            toast(`booking-buttons.json 저장 완료: ${finalButtons.length}개`);
            return result;
        } catch (error) {
            console.error(error);
            toast("저장 실패: " + error.message);
            if (options.source !== "header") alert("booking-buttons.json 저장 실패: " + error.message);
            throw error;
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = before;
            }
        }
    }

    function validateBeforeSave() {
        const invalid = state.buttons.filter((button) => !button.sectionId || !button.sectionName || button.polygon.length < 3);
        if (invalid.length) {
            throw new Error(`sectionId/sectionName/polygon이 없는 버튼 ${invalid.length}개가 있어 저장할 수 없습니다.`);
        }
        if (!state.buttons.length) {
            throw new Error("저장할 booking button이 없습니다.");
        }
    }

    function createBookingButtonsJson() {
        return state.buttons.map((button) => ({
            id: button.id,
            sectionId: button.sectionId,
            sectionName: button.sectionName,
            section: button.sectionName,
            name: button.label || button.sectionName,
            label: button.label || button.sectionName,
            groupKey: button.groupKey,
            groupIndex: button.groupIndex,
            floor: button.floor,
            grade: button.grade,
            price: button.price === "" ? "" : Number(button.price),
            polygon: button.polygon.map(copyRoundedPoint),
            labelPoint: copyRoundedPoint(button.labelPoint),
            x: round(button.labelPoint.x),
            y: round(button.labelPoint.y),
            seatCount: Number(button.seatCount || 0),
            availableSeatCount: Number(button.availableSeatCount || 0),
            color: button.color,
            hoverColor: button.hoverColor || toHoverColor(button.color),
            strokeColor: button.strokeColor || makeReadableStroke(button.color),
            textColor: button.textColor || autoTextColor(button.color),
            fontSize: Math.round(Number(button.fontSize || estimateFitFontSize(button.label || button.sectionName, button.polygon))),
            fillAlpha: Number(button.fillAlpha || FINAL_FILL_ALPHA),
            visible: button.visible !== false,
            clickable: button.clickable !== false
        }));
    }

    function exportDebugImageDataUrl() {
        try {
            const out = document.createElement("canvas");
            const outCtx = out.getContext("2d");
            out.width = state.width;
            out.height = state.height;
            outCtx.fillStyle = "#ffffff";
            outCtx.fillRect(0, 0, state.width, state.height);
            if (state.image) outCtx.drawImage(state.image, 0, 0, state.width, state.height);
            drawButtons(outCtx, { forceButtons: true, renderMode: "debug" });
            drawLabels(outCtx, { marker: true });
            return out.toDataURL("image/png");
        } catch (error) {
            console.warn("[SeatTrace Stage5] debug image export failed", error);
            return "";
        }
    }

    function exportFinalImageDataUrl() {
        try {
            const out = document.createElement("canvas");
            const outCtx = out.getContext("2d");
            out.width = state.width;
            out.height = state.height;
            outCtx.fillStyle = "#ffffff";
            outCtx.fillRect(0, 0, state.width, state.height);
            if (state.image) outCtx.drawImage(state.image, 0, 0, state.width, state.height);
            drawButtons(outCtx, { forceButtons: true, renderMode: "final" });
            drawLabels(outCtx, { marker: false });
            return out.toDataURL("image/png");
        } catch (error) {
            console.warn("[SeatTrace Stage5] final image export failed", error);
            return "";
        }
    }

    function goStage6() {
        saveBookingButtonsToServer()
            .then(() => {
                window.location.href = state.stage6Url || `/admin/seatmap/stage/6?projectId=${encodeURIComponent(state.projectId)}`;
            })
            .catch(() => {});
    }

    function persistButtonsLocal() {
        const json = createBookingButtonsJson();
        persistJson(STORAGE.bookingButtons, json);
        persistJson(STORAGE.bookingButtonsCompat, json);
        persistJson(STORAGE.bookingButtonsCompat2, json);
    }

    function fetchJson(url) {
        return fetch(noCache(url), { cache: "no-store", credentials: "same-origin" }).then(async (response) => {
            if (!response.ok) throw new Error(`${url} ${response.status}`);
            return await response.json();
        });
    }

    function loadImage(url) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = url;
        });
    }

    function noCache(url) {
        if (!url) return "";
        const join = url.includes("?") ? "&" : "?";
        return `${url}${join}t=${Date.now()}`;
    }

    function projectFileUrl(fileName) {
        return `/temp/seatmap/${encodeURIComponent(state.projectId)}/${fileName}`;
    }

    function getPolygons(raw) {
        if (Array.isArray(raw.polygons) && raw.polygons.length) {
            return raw.polygons
                .map(normalizePoints)
                .filter((polygon) => polygon.length >= 3);
        }
        const polygon = normalizePoints(raw.polygon || raw.points || []);
        return polygon.length >= 3 ? [polygon] : [];
    }

    function normalizePoints(value) {
        if (!Array.isArray(value)) return [];
        return value
            .map((point) => ({ x: Number(point.x), y: Number(point.y) }))
            .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
    }

    function normalizePoint(point) {
        if (!point) return null;
        const x = Number(point.x);
        const y = Number(point.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        return { x, y };
    }

    function normalizeBbox(bbox) {
        if (!bbox) return null;
        const x = Number(bbox.x ?? bbox.left);
        const y = Number(bbox.y ?? bbox.top);
        const w = Number(bbox.w ?? bbox.width ?? ((bbox.right ?? 0) - x));
        const h = Number(bbox.h ?? bbox.height ?? ((bbox.bottom ?? 0) - y));
        if (![x, y, w, h].every(Number.isFinite)) return null;
        return { x, y, w, h };
    }

    function getBbox(points) {
        if (!points.length) return { x: 0, y: 0, w: 0, h: 0 };
        const xs = points.map((point) => point.x);
        const ys = points.map((point) => point.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }

    function getSafeLabelPoint(polygon) {
        if (!polygon.length) return { x: 0, y: 0 };
        const centroid = polygonCentroid(polygon);
        if (pointInPolygon(centroid, polygon)) return centroid;

        const bbox = getBbox(polygon);
        const center = { x: bbox.x + bbox.w / 2, y: bbox.y + bbox.h / 2 };
        if (pointInPolygon(center, polygon)) return center;

        const steps = 8;
        for (let y = 0; y <= steps; y += 1) {
            for (let x = 0; x <= steps; x += 1) {
                const point = {
                    x: bbox.x + (bbox.w * x) / steps,
                    y: bbox.y + (bbox.h * y) / steps
                };
                if (pointInPolygon(point, polygon)) return point;
            }
        }

        return polygon[0] ? copyPoint(polygon[0]) : { x: 0, y: 0 };
    }

    function polygonCentroid(points) {
        let twiceArea = 0;
        let x = 0;
        let y = 0;
        for (let i = 0; i < points.length; i += 1) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            const cross = p1.x * p2.y - p2.x * p1.y;
            twiceArea += cross;
            x += (p1.x + p2.x) * cross;
            y += (p1.y + p2.y) * cross;
        }
        if (Math.abs(twiceArea) < 0.0001) {
            const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
            return { x: sum.x / points.length, y: sum.y / points.length };
        }
        const area = twiceArea * 0.5;
        return { x: x / (6 * area), y: y / (6 * area) };
    }

    function pointInPolygon(point, polygon) {
        if (!polygon || polygon.length < 3) return false;
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x;
            const yi = polygon[i].y;
            const xj = polygon[j].x;
            const yj = polygon[j].y;
            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || 0.000001) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    function pathPolygon(ctx, polygon) {
        polygon.forEach((point, index) => {
            if (index === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
        });
        ctx.closePath();
    }

    function isAvailableSeat(seat) {
        return String(seat.status || AVAILABLE).toUpperCase() === AVAILABLE || seat.available === true;
    }

    function groupBy(items, getter) {
        return normalizeArray(items).reduce((acc, item) => {
            const key = String(getter(item) || "");
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
        }, {});
    }

    function firstText(...values) {
        for (const value of values) {
            if (value == null) continue;
            const text = String(value).trim();
            if (text) return text;
        }
        return "";
    }

    function numberOrBlank(value) {
        if (value == null || value === "") return "";
        const number = Number(value);
        return Number.isFinite(number) ? number : "";
    }

    function normalizeArray(value) {
        if (Array.isArray(value)) return value;
        if (value && typeof value === "object") {
            if (Array.isArray(value.data)) return value.data;
            if (Array.isArray(value.items)) return value.items;
            if (Array.isArray(value.areas)) return value.areas;
            if (Array.isArray(value.buttons)) return value.buttons;
            if (Array.isArray(value.seats)) return value.seats;
            if (Array.isArray(value.seatLayouts)) return value.seatLayouts;
            if (Array.isArray(value.stage4SeatLayouts)) return value.stage4SeatLayouts;
        }
        return [];
    }

    function readJson(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return fallback;
            return JSON.parse(raw);
        } catch (error) {
            return fallback;
        }
    }

    function persistJson(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn(`[SeatTrace Stage5] localStorage 저장 실패: ${key}`, error);
            return false;
        }
    }

    function sanitizeProjectId(value) {
        const cleaned = String(value || "seat")
            .trim()
            .replace(/\s+/g, "_")
            .replace(/[^a-zA-Z0-9가-힣._-]/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_+|_+$/g, "");
        return cleaned || "seat";
    }

    function normalizeColor(value) {
        const text = String(value || "").trim();
        if (/^#[0-9a-f]{6}$/i.test(text)) return text;
        if (/^#[0-9a-f]{3}$/i.test(text)) {
            return `#${text[1]}${text[1]}${text[2]}${text[2]}${text[3]}${text[3]}`;
        }
        return DEFAULT_COLOR;
    }

    function colorToHex(value) {
        return normalizeColor(value);
    }

    function toPastelColor(value) {
        const hex = normalizeColor(value);
        const rgb = hexToRgb(hex);
        const luminance = (rgb.r * 0.299) + (rgb.g * 0.587) + (rgb.b * 0.114);
        if (luminance >= 218) return hex;
        const target = 238;
        const r = Math.round(rgb.r * 0.34 + target * 0.66);
        const g = Math.round(rgb.g * 0.34 + target * 0.66);
        const b = Math.round(rgb.b * 0.34 + target * 0.66);
        return rgbToHex(r, g, b);
    }

    function makeReadableStroke(value) {
        const rgb = hexToRgb(normalizeColor(value));
        return rgbToHex(
            Math.max(0, Math.round(rgb.r * 0.78)),
            Math.max(0, Math.round(rgb.g * 0.78)),
            Math.max(0, Math.round(rgb.b * 0.78))
        );
    }

    function autoTextColor(value) {
        const rgb = hexToRgb(normalizeColor(value));
        const luminance = (rgb.r * 0.299) + (rgb.g * 0.587) + (rgb.b * 0.114);
        return luminance > 156 ? DEFAULT_TEXT_COLOR : "#ffffff";
    }

    function hexToRgb(hex) {
        const safe = normalizeColor(hex).replace("#", "");
        return {
            r: parseInt(safe.slice(0, 2), 16),
            g: parseInt(safe.slice(2, 4), 16),
            b: parseInt(safe.slice(4, 6), 16)
        };
    }

    function rgbToHex(r, g, b) {
        return `#${[r, g, b].map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0")).join("")}`;
    }

    function hexToRgba(hex, alpha) {
        const normalized = normalizeColor(hex).replace("#", "");
        const r = parseInt(normalized.slice(0, 2), 16);
        const g = parseInt(normalized.slice(2, 4), 16);
        const b = parseInt(normalized.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function toHoverColor(hex) {
        return hexToRgba(hex, 0.35);
    }

    function colorByIndex(index) {
        return PASTEL_PALETTE[Math.abs(index) % PASTEL_PALETTE.length];
    }

    function estimateFitFontSize(text, polygon) {
        const label = String(text || "").trim() || "구역";
        const bbox = getBbox(normalizePoints(polygon || []));
        const maxWidth = Math.max(34, bbox.w * 0.72);
        const maxHeight = Math.max(16, bbox.h * 0.34);
        const byWidth = maxWidth / Math.max(1, label.length * 0.62);
        const byHeight = maxHeight;
        return Math.round(clamp(Math.min(byWidth, byHeight, 26), 10, 30));
    }

    function unique(values) {
        return [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ""))];
    }

    function round(value) {
        return Math.round(Number(value || 0) * 100) / 100;
    }

    function copyPoint(point) {
        return { x: Number(point.x), y: Number(point.y) };
    }

    function copyRoundedPoint(point) {
        return { x: round(point?.x), y: round(point?.y) };
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, Number(value || 0)));
    }

    function distance(a, b) {
        const dx = Number(a.x || 0) - Number(b.x || 0);
        const dy = Number(a.y || 0) - Number(b.y || 0);
        return Math.sqrt(dx * dx + dy * dy);
    }

    function formatPrice(value) {
        const number = Number(value || 0);
        if (!Number.isFinite(number) || number <= 0) return "가격 누락";
        return `${number.toLocaleString("ko-KR")}원`;
    }

    function setText(element, value) {
        if (element) element.textContent = String(value ?? "");
    }

    function setInputValue(input, value) {
        if (input && document.activeElement !== input) input.value = value;
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function toast(message) {
        if (!dom.toast) {
            console.log(message);
            return;
        }
        dom.toast.textContent = message;
        dom.toast.classList.add("show");
        window.clearTimeout(toast._timer);
        toast._timer = window.setTimeout(() => dom.toast.classList.remove("show"), 1800);
    }
})();
