(() => {
    "use strict";

    /**
     * seatmap-button-image.js
     *
     * 목표:
     * - 원본 좌석 도면을 사람이 수동 샘플링하지 않아도 자동으로 단색 구역 이미지로 변환한다.
     * - 핵심 로직은 "색상 스캔 → 역할 분류 → 흰색 둘러싸임 판정 → 구역 단위 단색화"이다.
     * - STAGE / 회색 통로 / 장식 / 외곽 구조는 가능한 원본 그대로 유지한다.
     * - 좌석 구역 안의 숫자/글자는 주변 좌석색으로 메워서 제거한다.
     *     */

    const STORAGE = {
        original: "seat_button_originalImage",
        result: "seat_button_resultImage",
        meta: "seat_button_imageMeta",
        groups: "seat_button_groups",
        entry: "seat_button_entryFromMain",
        concertOriginal: "concert_originalImage",
        concertClean: "concert_cleanImage",
        concertButton: "concert_buttonImage",
        concertImageMeta: "concert_imageMeta",
        concertButtonMeta: "concert_buttonImageMeta",
        concertEntry: "concert_entryFromMain",
        concertVersion: "seatmap_concert_session_version",
        concertJsonUrl: "seatmap_concert_session_json_url"
    };

    const ROLE = {
        UNKNOWN: 0,
        BACKGROUND: 1,
        WHITE: 2,
        OUTER_WHITE: 3,
        GRAY: 4,
        BLACK: 5,
        SEAT_PINK: 20,
        SEAT_GREEN: 21,
        SEAT_ORANGE: 22,
        SEAT_PURPLE: 23,
        SEAT_BLUE: 24,
        SEAT_BROWN: 25,
        SEAT_RED: 26
    };

    const ROLE_NAME = new Map([
        [ROLE.UNKNOWN, "미분류"],
        [ROLE.BACKGROUND, "배경"],
        [ROLE.WHITE, "흰색 후보"],
        [ROLE.OUTER_WHITE, "외부 흰색"],
        [ROLE.GRAY, "회색 구조"],
        [ROLE.BLACK, "검은 구조"],
        [ROLE.SEAT_PINK, "좌석 핑크"],
        [ROLE.SEAT_GREEN, "좌석 초록"],
        [ROLE.SEAT_ORANGE, "좌석 오렌지"],
        [ROLE.SEAT_PURPLE, "좌석 보라"],
        [ROLE.SEAT_BLUE, "좌석 하늘"],
        [ROLE.SEAT_BROWN, "좌석 갈색"],
        [ROLE.SEAT_RED, "좌석 레드"]
    ]);

    const DEFAULT_GROUPS = [
        { id: "background", name: "배경 / 불필요", gradeName: "BG", output: "#f7f7f7", role: ROLE.BACKGROUND, samples: [] },
        { id: "stage", name: "STAGE / 무대", gradeName: "STAGE", output: "#222222", role: ROLE.BLACK, samples: [] },
        { id: "text", name: "층수 / 안내 문자", gradeName: "TEXT", output: "#8f8f8f", role: ROLE.GRAY, samples: [] },
        { id: "vip", name: "VIP / 갈색 좌석", gradeName: "VIP", output: "#c7b28e", role: ROLE.SEAT_BROWN, samples: [] },
        { id: "standing", name: "STANDING", gradeName: "S", output: "#8067ff", role: ROLE.SEAT_PURPLE, samples: [] },
        { id: "seatPink", name: "좌석 핑크", gradeName: "R", output: "#f77bab", role: ROLE.SEAT_PINK, samples: [] },
        { id: "seatBlue", name: "좌석 하늘", gradeName: "B", output: "#63cce4", role: ROLE.SEAT_BLUE, samples: [] },
        { id: "seatGreen", name: "좌석 연두", gradeName: "A", output: "#2fc28e", role: ROLE.SEAT_GREEN, samples: [] },
        { id: "seatOrange", name: "좌석 오렌지", gradeName: "A", output: "#f4a11f", role: ROLE.SEAT_ORANGE, samples: [] },
        { id: "line", name: "외곽선 / 기타 라인", gradeName: "LINE", output: "#eeeeee", role: ROLE.WHITE, samples: [] }
    ];

    const FIXED_PALETTE = new Map([
        [ROLE.SEAT_PINK, { r: 239, g: 94, b: 148 }],
        [ROLE.SEAT_GREEN, { r: 45, g: 190, b: 137 }],
        [ROLE.SEAT_ORANGE, { r: 242, g: 157, b: 33 }],
        [ROLE.SEAT_PURPLE, { r: 148, g: 61, b: 174 }],
        [ROLE.SEAT_BLUE, { r: 99, g: 204, b: 228 }],
        [ROLE.SEAT_BROWN, { r: 194, g: 174, b: 137 }],
        [ROLE.SEAT_RED, { r: 199, g: 42, b: 91 }]
    ]);

    const SETTINGS = {
        whiteLight: 0.79,
        whiteSaturation: 0.42,
        graySaturation: 0.20,
        blackLight: 0.20,
        minSeatSaturation: 0.30,
        minSeatChroma: 28,
        minSeatLight: 0.20,
        maxSeatLight: 0.84,
        textMaxArea: 1800,
        textMinArea: 3,
        textBoundarySeatRatio: 0.54,
        textDecisionScore: 62,
        ringRadius: 3,
        tinyIslandArea: 28,
        tinyHoleArea: 950,
        majorityIterations: 2,
        componentMinSeatArea: 4,
        componentRepresentativeMinArea: 10,
        useComponentOriginalColor: true,

        // 파트 3: 반듯하게 버튼화 기본값
        // 강도는 Ramer-Douglas-Peucker 단순화 epsilon과 스캔라인 median 범위에 사용된다.
        // 높이면 더 직선화되지만, 너무 높으면 작은 사다리꼴 디테일이 사라질 수 있다.
        straightenDefaultStrength: 5,
        straightenMinArea: 18,
        straightenFallbackLineColor: { r: 247, g: 247, b: 247 },
        straightenMaxAreaRatio: 2.35
    };

    const state = {
        imageReady: false,
        hasResult: false,
        saved: false,
        sourceKey: "",
        originalDataUrl: "",
        resultBaseDataUrl: "",
        groups: clone(DEFAULT_GROUPS),
        history: [],
        historyIndex: -1,
        zoom: 1,
        lastStats: null,

        // 파트 2: 구역 선택 보정 상태
        // 사각형 드래그가 아니라 클릭한 좌석 구역 connected component를 선택한다.
        // 선택된 구역 안에 남은 숫자/문자는 선택 구역 주변색으로만 제거하므로 STAGE, FLOOR 같은 외부 문자는 건드리지 않는다.
        region: {
            // 구역 보정은 이제 기본적으로 켜둔다.
            // 사용자는 좌석 구역을 클릭하고, 오른쪽/왼쪽 색상 버튼을 눌러 바로 등급 색을 바꾼다.
            enabled: true,
            selected: [],
            nextId: 1,
            color: "#ef5e94",
            gradeName: "R"
        },

        // 파트 3: 최외각 스캔 기반 직선화 상태
        straighten: {
            strength: SETTINGS.straightenDefaultStrength
        },

        // 파트 3: 최종 브러쉬 보정 상태
        brush: {
            mode: "none", // none | paint | erase
            size: 18,
            down: false,
            changed: false,
            pickColor: false,
            holdZoomTimer: null,
            holdZoomStarted: false
        },

        finalPreview: {
            enabled: false,
            componentCount: 0
        },
        currentStep: 1
    };

    const $ = (id) => document.getElementById(id);

    const app = $("buttonImageApp");
    const canvas = $("canvas");
    const overlay = $("overlay");
    const box = $("box");
    const brushCursor = $("brushCursor");

    if (!canvas) {
        return;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const overlayCtx = overlay ? overlay.getContext("2d") : null;

    const sourceCanvas = document.createElement("canvas");
    const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });

    const resultCanvas = document.createElement("canvas");
    const resultCtx = resultCanvas.getContext("2d", { willReadFrequently: true });

    document.addEventListener("DOMContentLoaded", init);

    function init() {
        state.groups = loadGroupsSafe();
        bindEvents();
        renderLegend();
        updateStats();
        updateRegionToolUI();
        setActionButtonsEnabled(false);
        loadOriginalImage();
    }

    function bindEvents() {
        bindClick("generateButtonImage", () => runAutoConversion(false, { nextStep: 2 }));
        bindClick("applyToConcert", () => runAutoConversion(true));
        bindClick("saveButtonImage", saveButtonImageLocal);
        bindClick("restoreSource", restoreSourceImage);
        bindClick("restoreResultBase", restoreResultBase);
        bindClick("clearAllSamples", resetAutoState);
        bindClick("clearSelectedSamples", resetAutoState);
        bindClick("cleanupPieces", () => runAutoConversion(false));
        bindClick("go2", () => runAutoConversion(false, { nextStep: 2 }));
        bindClick("go3", () => runAutoConversion(false, { nextStep: 3 }));
        bindClick("go4", () => setStep(4));
        bindClick("tab4", () => setStep(4));
        bindClick("backToBrush", () => setStep(3));
        bindClick("previewSaveRegions", showFinalSavePreview);
        bindClick("pickColorFromCanvas", toggleColorPickerMode);
        bindCanvasWheelZoom();
        showUndoRedoButtonsV21();
        bindClick("undoAction", undo);
        bindClick("redoAction", redo);
        bindZoomButton("zoomIn", 1);
        bindZoomButton("zoomOut", -1);
        bindClick("zoomReset", () => setZoom(1));
        bindClick("serverSaveButtonImage", saveButtonImageToServer);
        bindClick("saveAndExitButton", saveAndExit);
        bindClick("regionCleanAll", cleanAllCurrentSeatRegions);
        bindClick("tab1", () => setStep(1));
        bindClick("tab2", () => setStep(2));
        bindClick("tab3", () => setStep(3));

        // 파트 2: 구역 선택 보정 도구
        bindClick("regionSelectStart", toggleRegionSelectTool);
        bindClick("regionClear", clearSelectedRegions);
        bindClick("regionRemoveText", removeTextInsideSelectedRegions);
        bindClick("regionDominantFill", fillSelectedRegionsWithDominantColor);
        bindClick("regionApplyColor", applySelectedRegionColor);
        bindClick("regionCleanFill", cleanAndFillSelectedRegions);
        bindInput("regionColorInput", updateRegionColorFromInput);
        bindInput("regionGradeInput", updateRegionGradeFromInput);

        // 파트 3: 반듯하게 버튼화 + 브러쉬 보정
        bindClick("straightenAllRegions", () => straightenSeatRegions(false));
        bindClick("straightenSelectedRegions", () => straightenSeatRegions(true));
        bindInput("straightenStrength", updateStraightenStrength);
        bindClick("brushTool", () => setBrushMode(state.brush.mode === "paint" ? "none" : "paint"));
        bindClick("eraseTool", () => setBrushMode(state.brush.mode === "erase" ? "none" : "erase"));
        bindInput("brushSize", updateBrushSize);

        document.querySelectorAll("[data-region-palette]").forEach((button) => {
            button.addEventListener("click", () => {
                handlePaletteButtonClick(button);
            });
        });

        if (overlay) {
            overlay.addEventListener("mousedown", onCanvasDown);
            overlay.addEventListener("mousemove", onCanvasMove);
            overlay.addEventListener("mouseup", onCanvasUp);
            overlay.addEventListener("click", onCanvasClick);
            overlay.addEventListener("mouseleave", onCanvasLeave);
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

    function bindInput(id, handler) {
        const element = $(id);

        if (!element) {
            return;
        }

        element.addEventListener("input", handler);
    }

    function bindZoomButton(id, direction) {
        const element = $(id);

        if (!element) {
            return;
        }

        let holdTimer = null;
        let dragStartX = 0;
        let dragStartY = 0;
        let dragStartZoom = 1;
        let pointerActive = false;
        let holdStarted = false;

        function step(multiplier = 1) {
            setZoom(state.zoom + (direction * 0.06 * multiplier));
        }

        function stop() {
            pointerActive = false;
            if (holdTimer) {
                clearInterval(holdTimer);
                clearTimeout(holdTimer);
                holdTimer = null;
            }
        }

        element.addEventListener("pointerdown", (event) => {
            event.preventDefault();
            pointerActive = true;
            holdStarted = false;
            dragStartX = event.clientX;
            dragStartY = event.clientY;
            dragStartZoom = state.zoom;
            element.setPointerCapture?.(event.pointerId);
            step();

            holdTimer = setTimeout(() => {
                holdStarted = true;
                holdTimer = setInterval(() => step(1), 55);
            }, 220);
        });

        element.addEventListener("pointermove", (event) => {
            if (!pointerActive) {
                return;
            }

            const dx = event.clientX - dragStartX;
            const dy = event.clientY - dragStartY;
            const delta = ((dx - dy) / 240) * direction;

            if (Math.abs(delta) >= 0.02) {
                setZoom(dragStartZoom + delta);
                holdStarted = true;
            }
        });

        ["pointerup", "pointercancel", "pointerleave", "blur"].forEach((eventName) => {
            element.addEventListener(eventName, stop);
        });

        element.addEventListener("click", (event) => {
            if (holdStarted) {
                event.preventDefault();
                event.stopPropagation();
            }
        });
    }

    function bindCanvasWheelZoom() {
        const wrap = document.querySelector(".button-image-canvas-wrap");
        const target = wrap || box || canvas;

        if (!target) {
            return;
        }

        target.addEventListener("wheel", (event) => {
            if (!event.ctrlKey && !event.shiftKey && !event.altKey) {
                return;
            }

            event.preventDefault();
            const delta = event.deltaY < 0 ? 0.08 : -0.08;
            setZoom(state.zoom + delta);
        }, { passive: false });
    }

    function setActionButtonsEnabled(enabled) {
        [
            "generateButtonImage",
            "applyToConcert",
            "saveButtonImage",
            "restoreSource",
            "straightenAllRegions",
            "straightenSelectedRegions",
            "go2",
            "go3"
        ].forEach((id) => {
            const button = $(id);
            if (button) {
                button.disabled = !enabled;
            }
        });
    }

    function loadOriginalImage() {
        const source = findBestSourceImage();

        if (!source.dataUrl) {
            toast("등록된 원본 이미지가 없습니다. 메인에서 이미지를 먼저 등록하세요.");
            return;
        }

        state.sourceKey = source.key;
        state.originalDataUrl = source.dataUrl;

        drawDataUrlToCanvas(source.dataUrl, sourceCanvas, sourceCtx).then(() => {
            resizeVisibleCanvas(sourceCanvas.width, sourceCanvas.height);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(sourceCanvas, 0, 0);
            syncResultFromVisible();

            state.imageReady = true;
            state.hasResult = false;
            state.saved = false;
            state.resultBaseDataUrl = "";
            state.history = [];
            state.historyIndex = -1;

            pushHistory("원본 로드");
            updateStats();
            setActionButtonsEnabled(true);
            toast("원본 도면을 불러왔습니다.");
        }).catch(() => {
            toast("원본 이미지를 읽지 못했습니다.");
        });
    }

    function findBestSourceImage() {
        const projectFolder = getSeatmapProjectFolderName();
        const fallbackBase = `/temp/seatmap/${projectFolder}`;
        const priorityValues = [
            { key: STORAGE.original, value: localStorage.getItem(STORAGE.original) },
            { key: "seatmap_cropped_image_url", value: localStorage.getItem("seatmap_cropped_image_url") },
            { key: "cropped-image.png", value: `${fallbackBase}/cropped-image.png` },
            { key: STORAGE.concertOriginal, value: localStorage.getItem(STORAGE.concertOriginal) },
            { key: "original-image.png", value: `${fallbackBase}/original-image.png` },
            { key: STORAGE.concertClean, value: localStorage.getItem(STORAGE.concertClean) },
            { key: STORAGE.result, value: localStorage.getItem(STORAGE.result) }
        ];

        for (const item of priorityValues) {
            const value = item.value;
            if (isLoadableImageSource(value)) {
                return { key: item.key, dataUrl: appendButtonImageCacheBust(value) };
            }
        }

        return { key: "", dataUrl: "" };
    }

    function isLoadableImageSource(value) {
        if (!value || typeof value !== "string") {
            return false;
        }

        const source = value.trim();

        return source.startsWith("data:image")
            || source.startsWith("blob:")
            || /^https?:\/\//i.test(source)
            || /^\//.test(source)
            || /\.(png|jpe?g|webp|gif|bmp|svg)(\?|#|$)/i.test(source);
    }

    function appendButtonImageCacheBust(value) {
        if (!value || value.startsWith("data:image") || value.startsWith("blob:")) {
            return value;
        }

        return `${value}${value.includes("?") ? "&" : "?"}t=${Date.now()}`;
    }

    function runAutoConversion(shouldApplyToConcert, options = {}) {
        if (!state.imageReady || !sourceCanvas.width || !sourceCanvas.height) {
            toast("원본 이미지 로딩이 끝난 뒤 다시 실행하세요.");
            return;
        }

        const width = sourceCanvas.width;
        const height = sourceCanvas.height;
        const sourceImage = sourceCtx.getImageData(0, 0, width, height);

        toast("이미지 전체 스캔 + 둘러싸임 판정 중...");

        setTimeout(() => {
            try {
                const inference = runScanInference(sourceImage, width, height);

                resizeVisibleCanvas(width, height);
                resultCanvas.width = width;
                resultCanvas.height = height;
                resultCtx.putImageData(inference.image, 0, 0);

                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(resultCanvas, 0, 0);

                state.hasResult = true;
                state.saved = false;
                state.resultBaseDataUrl = canvas.toDataURL("image/png");
                state.lastStats = inference.stats;

                syncResultFromVisible();
                pushHistory("자동 변환");
                updateStats();
                renderLegend(inference.stats);

                if (shouldApplyToConcert) {
                    applyToConcert();
                } else {
                    toast(createResultMessage(inference.stats));
                    if (options.nextStep) {
                        setStep(options.nextStep);
                    }
                }
            } catch (error) {
                console.error(error);
                restoreSourceImage(false);
                toast("자동 변환 실패: 원본을 유지했습니다.");
            }
        }, 20);
    }

    function runScanInference(sourceImage, width, height) {
        const maps = [
            scanBaseRoles(sourceImage, width, height, "normal"),
            scanBaseRoles(sourceImage, width, height, "strict"),
            scanBaseRoles(sourceImage, width, height, "relaxed"),
            scanBaseRoles(sourceImage, width, height, "contrast")
        ];

        const merged = mergeRoleMaps(maps, width, height);
        const stats = createEmptyStats(width, height);

        markOuterWhite(merged, width, height);

        const firstText = removeInnerTextHoles(merged, width, height, stats, "1차");
        const firstHoles = fillTinyNonSeatHoles(merged, width, height, stats, "1차");
        const firstIslands = absorbSmallSeatIslands(merged, width, height, stats, "1차");
        const firstMajority = majoritySeatCleanup(merged, width, height, stats, "1차");

        markOuterWhite(merged, width, height);

        const secondText = removeInnerTextHoles(merged, width, height, stats, "2차");
        const secondHoles = fillTinyNonSeatHoles(merged, width, height, stats, "2차");
        const secondIslands = absorbSmallSeatIslands(merged, width, height, stats, "2차");
        const secondMajority = majoritySeatCleanup(merged, width, height, stats, "2차");

        const finalImage = buildOutputImage(sourceImage, merged, width, height, stats);

        stats.textHoleRemoved += firstText + secondText;
        stats.tinyHolesFilled += firstHoles + secondHoles;
        stats.smallIslandsAbsorbed += firstIslands + secondIslands;
        stats.majorityChanges += firstMajority + secondMajority;

        return {
            image: finalImage,
            roleMap: merged,
            stats
        };
    }

    function scanBaseRoles(sourceImage, width, height, mode) {
        const roleMap = new Uint8Array(width * height);
        const data = sourceImage.data;
        const variant = getScanVariant(mode);

        for (let i = 0; i < width * height; i += 1) {
            const offset = i * 4;
            const r = data[offset];
            const g = data[offset + 1];
            const b = data[offset + 2];
            const a = data[offset + 3];

            roleMap[i] = classifyColorRole(r, g, b, a, variant);
        }

        return roleMap;
    }

    function getScanVariant(mode) {
        if (mode === "strict") {
            return {
                whiteLight: 0.84,
                whiteSaturation: 0.32,
                graySaturation: 0.16,
                minSeatSaturation: 0.38,
                minSeatChroma: 36,
                blackLight: 0.18
            };
        }

        if (mode === "relaxed") {
            return {
                whiteLight: 0.74,
                whiteSaturation: 0.50,
                graySaturation: 0.26,
                minSeatSaturation: 0.24,
                minSeatChroma: 20,
                blackLight: 0.23
            };
        }

        if (mode === "contrast") {
            return {
                whiteLight: 0.78,
                whiteSaturation: 0.58,
                graySaturation: 0.18,
                minSeatSaturation: 0.28,
                minSeatChroma: 24,
                blackLight: 0.20
            };
        }

        return {
            whiteLight: SETTINGS.whiteLight,
            whiteSaturation: SETTINGS.whiteSaturation,
            graySaturation: SETTINGS.graySaturation,
            minSeatSaturation: SETTINGS.minSeatSaturation,
            minSeatChroma: SETTINGS.minSeatChroma,
            blackLight: SETTINGS.blackLight
        };
    }

    function classifyColorRole(r, g, b, a, variant) {
        if (a < 10) {
            return ROLE.BACKGROUND;
        }

        const hsl = rgbToHsl(r, g, b);
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const chroma = max - min;
        const light = hsl.l;
        const saturation = hsl.s;
        const hue = hsl.h;

        if (light <= variant.blackLight && saturation <= 0.55) {
            return ROLE.BLACK;
        }

        if (isWhiteLike(r, g, b, hsl, variant)) {
            return ROLE.WHITE;
        }

        const seatRole = classifySeatHue(hue, saturation, light, chroma, variant);
        if (seatRole !== ROLE.UNKNOWN) {
            return seatRole;
        }

        if (saturation <= variant.graySaturation && light >= 0.18 && light <= 0.92) {
            return ROLE.GRAY;
        }

        if (chroma <= 18 && light > 0.86) {
            return ROLE.WHITE;
        }

        if (chroma <= 22 && light > 0.18 && light <= 0.92) {
            return ROLE.GRAY;
        }

        return ROLE.BACKGROUND;
    }

    function isWhiteLike(r, g, b, hsl, variant) {
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const chroma = max - min;

        if (max >= 246 && min >= 222) {
            return true;
        }

        if (hsl.l >= variant.whiteLight && hsl.s <= variant.whiteSaturation) {
            return true;
        }

        if (hsl.l >= 0.68 && hsl.s <= 0.22 && chroma <= 42) {
            return true;
        }

        return false;
    }

    function classifySeatHue(hue, saturation, light, chroma, variant) {
        if (saturation < variant.minSeatSaturation || chroma < variant.minSeatChroma) {
            return ROLE.UNKNOWN;
        }

        if (light < SETTINGS.minSeatLight || light > SETTINGS.maxSeatLight) {
            return ROLE.UNKNOWN;
        }

        if (hue >= 340 || hue < 13) {
            return ROLE.SEAT_RED;
        }

        if (hue >= 13 && hue < 55) {
            if (saturation < 0.47 && light < 0.68) {
                return ROLE.SEAT_BROWN;
            }
            return ROLE.SEAT_ORANGE;
        }

        if (hue >= 55 && hue < 170) {
            return ROLE.SEAT_GREEN;
        }

        if (hue >= 170 && hue < 215) {
            return ROLE.SEAT_BLUE;
        }

        if (hue >= 215 && hue < 315) {
            return ROLE.SEAT_PURPLE;
        }

        if (hue >= 315 && hue < 340) {
            return ROLE.SEAT_PINK;
        }

        return ROLE.UNKNOWN;
    }

    function mergeRoleMaps(maps, width, height) {
        const merged = new Uint8Array(width * height);
        const vote = new Map();

        for (let i = 0; i < width * height; i += 1) {
            vote.clear();

            for (const map of maps) {
                const role = map[i];
                vote.set(role, (vote.get(role) || 0) + 1);
            }

            merged[i] = chooseMergedRole(vote);
        }

        return merged;
    }

    function chooseMergedRole(vote) {
        const seatWinner = getBestSeatVote(vote);
        if (seatWinner.role !== ROLE.UNKNOWN && seatWinner.count >= 2) {
            return seatWinner.role;
        }

        const blackCount = vote.get(ROLE.BLACK) || 0;
        if (blackCount >= 2) {
            return ROLE.BLACK;
        }

        const grayCount = vote.get(ROLE.GRAY) || 0;
        if (grayCount >= 2) {
            return ROLE.GRAY;
        }

        const whiteCount = vote.get(ROLE.WHITE) || 0;
        if (whiteCount >= 2) {
            return ROLE.WHITE;
        }

        let bestRole = ROLE.BACKGROUND;
        let bestCount = -1;

        vote.forEach((count, role) => {
            if (count > bestCount) {
                bestRole = role;
                bestCount = count;
            }
        });

        return bestRole;
    }

    function getBestSeatVote(vote) {
        let bestRole = ROLE.UNKNOWN;
        let bestCount = 0;

        vote.forEach((count, role) => {
            if (isSeatRole(role) && count > bestCount) {
                bestRole = role;
                bestCount = count;
            }
        });

        return { role: bestRole, count: bestCount };
    }

    function markOuterWhite(roleMap, width, height) {
        const queue = [];
        const visited = new Uint8Array(width * height);

        for (let x = 0; x < width; x += 1) {
            enqueueOuterWhite(x, 0, roleMap, visited, queue, width, height);
            enqueueOuterWhite(x, height - 1, roleMap, visited, queue, width, height);
        }

        for (let y = 0; y < height; y += 1) {
            enqueueOuterWhite(0, y, roleMap, visited, queue, width, height);
            enqueueOuterWhite(width - 1, y, roleMap, visited, queue, width, height);
        }

        while (queue.length > 0) {
            const index = queue.pop();
            roleMap[index] = ROLE.OUTER_WHITE;

            const x = index % width;
            const y = Math.floor(index / width);

            enqueueOuterWhite(x + 1, y, roleMap, visited, queue, width, height);
            enqueueOuterWhite(x - 1, y, roleMap, visited, queue, width, height);
            enqueueOuterWhite(x, y + 1, roleMap, visited, queue, width, height);
            enqueueOuterWhite(x, y - 1, roleMap, visited, queue, width, height);
        }
    }

    function enqueueOuterWhite(x, y, roleMap, visited, queue, width, height) {
        if (x < 0 || y < 0 || x >= width || y >= height) {
            return;
        }

        const index = y * width + x;

        if (visited[index]) {
            return;
        }

        const role = roleMap[index];
        if (role !== ROLE.WHITE && role !== ROLE.OUTER_WHITE && role !== ROLE.BACKGROUND) {
            return;
        }

        visited[index] = 1;
        queue.push(index);
    }

    function removeInnerTextHoles(roleMap, width, height, stats, passName) {
        const components = extractComponents(roleMap, width, height, (role) => role === ROLE.WHITE);
        let changedPixels = 0;

        for (const component of components) {
            const analysis = analyzeWhiteComponent(component, roleMap, width, height);

            if (isLikelyTextHole(analysis)) {
                fillComponent(roleMap, component, analysis.dominantSeatRole);
                changedPixels += component.area;
                stats.debug.push(`${passName} 문자/숫자 후보 제거: ${component.area}px → ${getRoleName(analysis.dominantSeatRole)}`);
            }
        }

        return changedPixels;
    }

    function fillTinyNonSeatHoles(roleMap, width, height, stats, passName) {
        const components = extractComponents(roleMap, width, height, (role) => {
            return !isSeatRole(role)
                && role !== ROLE.BLACK
                && role !== ROLE.GRAY
                && role !== ROLE.OUTER_WHITE;
        });

        let changedPixels = 0;

        for (const component of components) {
            if (component.area > SETTINGS.tinyHoleArea || component.touchesBorder) {
                continue;
            }

            const boundary = analyzeBoundary(component, roleMap, width, height, SETTINGS.ringRadius);
            const dominant = getDominantSeatFromCounts(boundary.counts);

            if (dominant.role === ROLE.UNKNOWN) {
                continue;
            }

            const ratio = boundary.total > 0 ? dominant.count / boundary.total : 0;

            if (ratio >= 0.62 && !isLongSeparatorLike(component)) {
                fillComponent(roleMap, component, dominant.role);
                changedPixels += component.area;
                stats.debug.push(`${passName} 내부 잡구멍 보정: ${component.area}px → ${getRoleName(dominant.role)}`);
            }
        }

        return changedPixels;
    }

    function absorbSmallSeatIslands(roleMap, width, height, stats, passName) {
        const components = extractComponents(roleMap, width, height, (role) => isSeatRole(role));
        let changedPixels = 0;

        for (const component of components) {
            if (component.area > SETTINGS.tinyIslandArea) {
                continue;
            }

            const currentRole = roleMap[component.pixels[0]];
            const boundary = analyzeBoundary(component, roleMap, width, height, 2);
            const dominant = getDominantSeatFromCounts(boundary.counts, currentRole);

            if (dominant.role !== ROLE.UNKNOWN && dominant.count >= 5) {
                fillComponent(roleMap, component, dominant.role);
                changedPixels += component.area;
                stats.debug.push(`${passName} 작은 좌석 잡색 흡수: ${component.area}px ${getRoleName(currentRole)} → ${getRoleName(dominant.role)}`);
            }
        }

        return changedPixels;
    }

    function majoritySeatCleanup(roleMap, width, height, stats, passName) {
        let totalChanges = 0;

        for (let iteration = 0; iteration < SETTINGS.majorityIterations; iteration += 1) {
            const nextMap = new Uint8Array(roleMap);
            let changes = 0;

            for (let y = 1; y < height - 1; y += 1) {
                for (let x = 1; x < width - 1; x += 1) {
                    const index = y * width + x;
                    const role = roleMap[index];

                    if (!isSeatRole(role)) {
                        continue;
                    }

                    const counts = countNeighborRoles(roleMap, width, height, x, y, 1);
                    const dominant = getDominantSeatFromCounts(counts, role);
                    const currentCount = counts.get(role) || 0;

                    if (dominant.role !== ROLE.UNKNOWN && dominant.count >= 5 && currentCount <= 2) {
                        nextMap[index] = dominant.role;
                        changes += 1;
                    }
                }
            }

            roleMap.set(nextMap);
            totalChanges += changes;

            if (changes === 0) {
                break;
            }
        }

        if (totalChanges > 0) {
            stats.debug.push(`${passName} 주변 다수결 보정: ${totalChanges}px`);
        }

        return totalChanges;
    }

    function buildOutputImage(sourceImage, roleMap, width, height, stats) {
        const output = createImageDataSafe(width, height);
        const source = sourceImage.data;
        const destination = output.data;
        const seatComponents = extractComponents(roleMap, width, height, (role) => isSeatRole(role));
        const filledSeat = new Uint8Array(width * height);
        const regionRoleCounts = new Map();

        for (const component of seatComponents) {
            const role = roleMap[component.pixels[0]];

            if (component.area < SETTINGS.componentMinSeatArea) {
                copyOriginalPixels(component, source, destination);
                continue;
            }

            const color = SETTINGS.useComponentOriginalColor
                ? getComponentRepresentativeColor(component, source, role)
                : getDefaultRoleColor(role);

            fillOutputComponent(component, destination, color);
            markComponent(filledSeat, component, 1);
            stats.seatRegions += 1;
            stats.seatPixels += component.area;
            regionRoleCounts.set(role, (regionRoleCounts.get(role) || 0) + 1);
        }

        stats.regionRoleCounts = Array.from(regionRoleCounts.entries()).map(([role, count]) => ({
            role,
            name: getRoleName(role),
            count
        }));

        for (let i = 0; i < width * height; i += 1) {
            if (filledSeat[i]) {
                continue;
            }

            const offset = i * 4;
            destination[offset] = source[offset];
            destination[offset + 1] = source[offset + 1];
            destination[offset + 2] = source[offset + 2];
            destination[offset + 3] = source[offset + 3];
        }

        return output;
    }

    function getComponentRepresentativeColor(component, source, role) {
        if (component.area < SETTINGS.componentRepresentativeMinArea) {
            return getDefaultRoleColor(role);
        }

        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        let count = 0;

        for (const index of component.pixels) {
            const offset = index * 4;
            const r = source[offset];
            const g = source[offset + 1];
            const b = source[offset + 2];
            const a = source[offset + 3];

            if (a < 10) {
                continue;
            }

            const hsl = rgbToHsl(r, g, b);

            if (isWhiteLike(r, g, b, hsl, getScanVariant("relaxed"))) {
                continue;
            }

            if (hsl.l <= SETTINGS.blackLight || hsl.s < 0.18) {
                continue;
            }

            const sourceRole = classifyColorRole(r, g, b, a, getScanVariant("relaxed"));
            if (!isSeatRole(sourceRole)) {
                continue;
            }

            rSum += r;
            gSum += g;
            bSum += b;
            count += 1;
        }

        if (count < 3) {
            return getDefaultRoleColor(role);
        }

        return {
            r: clamp255(Math.round(rSum / count)),
            g: clamp255(Math.round(gSum / count)),
            b: clamp255(Math.round(bSum / count))
        };
    }

    function analyzeWhiteComponent(component, roleMap, width, height) {
        const boundary = analyzeBoundary(component, roleMap, width, height, SETTINGS.ringRadius);
        const dominant = getDominantSeatFromCounts(boundary.counts);
        const seatBoundary = countSeatBoundary(boundary.counts);
        const blackBoundary = boundary.counts.get(ROLE.BLACK) || 0;
        const grayBoundary = boundary.counts.get(ROLE.GRAY) || 0;
        const outerWhiteBoundary = boundary.counts.get(ROLE.OUTER_WHITE) || 0;
        const backgroundBoundary = boundary.counts.get(ROLE.BACKGROUND) || 0;
        const total = Math.max(1, boundary.total);
        const dominantSeatRatio = dominant.count / total;
        const seatRatio = seatBoundary / total;
        const blackRatio = blackBoundary / total;
        const grayRatio = grayBoundary / total;
        const openRatio = (outerWhiteBoundary + backgroundBoundary) / total;
        const longSeparatorLike = isLongSeparatorLike(component);

        let score = 0;

        if (!component.touchesBorder) score += 14;
        if (component.area >= SETTINGS.textMinArea && component.area <= SETTINGS.textMaxArea) score += 18;
        if (dominantSeatRatio >= SETTINGS.textBoundarySeatRatio) score += 30;
        if (seatRatio >= 0.62) score += 12;
        if (!longSeparatorLike) score += 14;
        if (component.width <= 60 && component.height <= 60) score += 8;
        if (blackRatio >= 0.30) score -= 45;
        if (grayRatio >= 0.50) score -= 25;
        if (openRatio >= 0.35) score -= 30;
        if (component.area > SETTINGS.textMaxArea) score -= 50;

        return {
            component,
            dominantSeatRole: dominant.role,
            dominantSeatCount: dominant.count,
            dominantSeatRatio,
            seatRatio,
            blackRatio,
            grayRatio,
            openRatio,
            longSeparatorLike,
            score
        };
    }

    function isLikelyTextHole(analysis) {
        if (analysis.dominantSeatRole === ROLE.UNKNOWN) {
            return false;
        }

        if (analysis.longSeparatorLike) {
            return false;
        }

        return analysis.score >= SETTINGS.textDecisionScore;
    }

    function analyzeBoundary(component, roleMap, width, height, radius) {
        const mark = new Uint8Array(width * height);
        const counts = new Map();
        let total = 0;

        for (const index of component.pixels) {
            mark[index] = 1;
        }

        for (const index of component.pixels) {
            const x = index % width;
            const y = Math.floor(index / width);

            for (let dy = -radius; dy <= radius; dy += 1) {
                for (let dx = -radius; dx <= radius; dx += 1) {
                    if (dx === 0 && dy === 0) {
                        continue;
                    }

                    const nx = x + dx;
                    const ny = y + dy;

                    if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
                        continue;
                    }

                    const nIndex = ny * width + nx;

                    if (mark[nIndex]) {
                        continue;
                    }

                    const role = roleMap[nIndex];
                    counts.set(role, (counts.get(role) || 0) + 1);
                    total += 1;
                }
            }
        }

        return { counts, total };
    }

    function countNeighborRoles(roleMap, width, height, x, y, radius) {
        const counts = new Map();

        for (let dy = -radius; dy <= radius; dy += 1) {
            for (let dx = -radius; dx <= radius; dx += 1) {
                if (dx === 0 && dy === 0) {
                    continue;
                }

                const nx = x + dx;
                const ny = y + dy;

                if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
                    continue;
                }

                const role = roleMap[ny * width + nx];
                counts.set(role, (counts.get(role) || 0) + 1);
            }
        }

        return counts;
    }

    function getDominantSeatFromCounts(counts, ignoreRole) {
        let bestRole = ROLE.UNKNOWN;
        let bestCount = 0;

        counts.forEach((count, role) => {
            if (!isSeatRole(role) || role === ignoreRole) {
                return;
            }

            if (count > bestCount) {
                bestRole = role;
                bestCount = count;
            }
        });

        return { role: bestRole, count: bestCount };
    }

    function countSeatBoundary(counts) {
        let total = 0;

        counts.forEach((count, role) => {
            if (isSeatRole(role)) {
                total += count;
            }
        });

        return total;
    }

    function isLongSeparatorLike(component) {
        const longSide = Math.max(component.width, component.height);
        const shortSide = Math.max(1, Math.min(component.width, component.height));
        const aspect = longSide / shortSide;
        const fillRatio = component.area / Math.max(1, component.width * component.height);

        if (longSide >= 35 && aspect >= 5.5) {
            return true;
        }

        if (longSide >= 80 && fillRatio <= 0.34) {
            return true;
        }

        return false;
    }

    function extractComponents(roleMap, width, height, predicate) {
        const visited = new Uint8Array(width * height);
        const components = [];
        const queue = [];

        for (let i = 0; i < width * height; i += 1) {
            if (visited[i] || !predicate(roleMap[i], i)) {
                continue;
            }

            const startRole = roleMap[i];
            const component = {
                pixels: [],
                area: 0,
                minX: Infinity,
                minY: Infinity,
                maxX: -Infinity,
                maxY: -Infinity,
                width: 0,
                height: 0,
                touchesBorder: false,
                role: startRole
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

                if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
                    component.touchesBorder = true;
                }

                pushComponentNeighbor(x + 1, y, startRole, roleMap, visited, queue, width, height, predicate);
                pushComponentNeighbor(x - 1, y, startRole, roleMap, visited, queue, width, height, predicate);
                pushComponentNeighbor(x, y + 1, startRole, roleMap, visited, queue, width, height, predicate);
                pushComponentNeighbor(x, y - 1, startRole, roleMap, visited, queue, width, height, predicate);
            }

            component.width = component.maxX - component.minX + 1;
            component.height = component.maxY - component.minY + 1;
            components.push(component);
        }

        return components;
    }

    function pushComponentNeighbor(x, y, startRole, roleMap, visited, queue, width, height, predicate) {
        if (x < 0 || y < 0 || x >= width || y >= height) {
            return;
        }

        const index = y * width + x;

        if (visited[index]) {
            return;
        }

        const role = roleMap[index];

        if (!predicate(role, index, startRole)) {
            return;
        }

        if (predicate.length < 3 && role !== startRole) {
            return;
        }

        visited[index] = 1;
        queue.push(index);
    }

    function fillComponent(roleMap, component, role) {
        for (const index of component.pixels) {
            roleMap[index] = role;
        }
    }

    function fillOutputComponent(component, destination, color) {
        for (const index of component.pixels) {
            const offset = index * 4;
            destination[offset] = color.r;
            destination[offset + 1] = color.g;
            destination[offset + 2] = color.b;
            destination[offset + 3] = 255;
        }
    }

    function copyOriginalPixels(component, source, destination) {
        for (const index of component.pixels) {
            const offset = index * 4;
            destination[offset] = source[offset];
            destination[offset + 1] = source[offset + 1];
            destination[offset + 2] = source[offset + 2];
            destination[offset + 3] = source[offset + 3];
        }
    }

    function markComponent(mark, component, value) {
        for (const index of component.pixels) {
            mark[index] = value;
        }
    }

    function createEmptyStats(width, height) {
        return {
            width,
            height,
            textHoleRemoved: 0,
            tinyHolesFilled: 0,
            smallIslandsAbsorbed: 0,
            majorityChanges: 0,
            seatRegions: 0,
            seatPixels: 0,
            debug: []
        };
    }

    function createResultMessage(stats) {
        return `자동 추리 완료: 문자 ${stats.textHoleRemoved}px / 구역 ${stats.seatRegions}개 / 잡색 ${stats.smallIslandsAbsorbed}px 정리`;
    }

    function saveButtonImageLocal() {
        if (!state.hasResult) {
            runAutoConversion(false);
            return;
        }

        const dataUrl = canvas.toDataURL("image/png");
        localStorage.setItem(STORAGE.result, dataUrl);
        localStorage.setItem(STORAGE.meta, JSON.stringify(createMeta(), null, 2));
        localStorage.setItem(STORAGE.groups, JSON.stringify(state.groups));

        state.saved = true;
        updateStats();
        toast("버튼 이미지를 브라우저 저장소에 저장했습니다.");
    }

    function applyToConcert() {
        if (!state.hasResult) {
            toast("먼저 자동 변환 결과를 생성하세요.");
            return;
        }

        const dataUrl = canvas.toDataURL("image/png");

        localStorage.setItem(STORAGE.result, dataUrl);
        localStorage.setItem(STORAGE.meta, JSON.stringify(createMeta(), null, 2));
        localStorage.setItem(STORAGE.groups, JSON.stringify(state.groups));
        localStorage.setItem(STORAGE.concertOriginal, dataUrl);
        localStorage.setItem(STORAGE.concertClean, dataUrl);
        localStorage.setItem(STORAGE.concertEntry, "true");

        state.saved = true;
        updateStats();
        toast("콘서트 제작에 적용했습니다.");

        setTimeout(() => {
            location.href = app?.dataset.concertUrl || "/admin/seatmap/concert/stage1";
        }, 350);
    }

    function showFinalSavePreview() {
        if (!state.hasResult) {
            toast("먼저 자동 변환 결과를 생성하세요.");
            return;
        }

        state.finalPreview.enabled = true;
        setBrushMode("none", { silent: true });
        setColorPickerMode(false, { silent: true });
        drawFinalSaveOutline();
    }

    function drawFinalSaveOutline() {
        clearOverlay();

        if (!overlayCtx || !overlay || !canvas.width || !canvas.height) {
            return;
        }

        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const roleMap = buildCurrentCanvasRoleMap(image, canvas.width, canvas.height);
        const components = extractComponents(roleMap, canvas.width, canvas.height, (role) => isSeatRole(role))
            .filter((component) => component.area >= Math.max(16, SETTINGS.componentRepresentativeMinArea || 10));

        overlayCtx.save();
        overlayCtx.lineWidth = Math.max(1, 1.5 / Math.max(1, state.zoom));
        overlayCtx.strokeStyle = "rgba(15, 23, 42, 0.88)";
        overlayCtx.fillStyle = "rgba(255, 255, 255, 0)";

        for (const component of components) {
            traceComponentBoundary(component, roleMap, canvas.width, canvas.height);
        }

        overlayCtx.restore();
        state.finalPreview.componentCount = components.length;
        toast(`저장될 구역 ${components.length}개를 실선으로 표시했습니다.`);
    }

    function traceComponentBoundary(component, roleMap, width, height) {
        const role = component.role;
        const minX = Math.max(0, component.minX - 1);
        const maxX = Math.min(width - 1, component.maxX + 1);
        const minY = Math.max(0, component.minY - 1);
        const maxY = Math.min(height - 1, component.maxY + 1);

        overlayCtx.beginPath();

        for (let y = minY; y <= maxY; y += 1) {
            for (let x = minX; x <= maxX; x += 1) {
                const index = y * width + x;

                if (roleMap[index] !== role) {
                    continue;
                }

                if (x <= 0 || roleMap[index - 1] !== role) {
                    overlayCtx.moveTo(x, y);
                    overlayCtx.lineTo(x, y + 1);
                }

                if (x >= width - 1 || roleMap[index + 1] !== role) {
                    overlayCtx.moveTo(x + 1, y);
                    overlayCtx.lineTo(x + 1, y + 1);
                }

                if (y <= 0 || roleMap[index - width] !== role) {
                    overlayCtx.moveTo(x, y);
                    overlayCtx.lineTo(x + 1, y);
                }

                if (y >= height - 1 || roleMap[index + width] !== role) {
                    overlayCtx.moveTo(x, y + 1);
                    overlayCtx.lineTo(x + 1, y + 1);
                }
            }
        }

        overlayCtx.stroke();
    }

    async function saveAndExit() {
        if (!state.hasResult) {
            toast("먼저 미리보기를 생성하세요.");
            return;
        }

        const button = $("saveAndExitButton") || $("saveAndExit");
        const originalText = button ? button.textContent : "";

        try {
            if (button) {
                button.disabled = true;
                button.textContent = "저장 중...";
            }

            /*
             * 여기서 localStorage에 base64 이미지를 다시 넣으면 브라우저 저장소 용량 제한 때문에
             * QuotaExceededError가 발생할 수 있습니다.
             * 저장 및 나가기는 헤더 저장과 동일하게 서버로 바로 전송한 뒤 이동합니다.
             */
            const savedToServer = await saveButtonImageToServer({ silent: true });

            if (!savedToServer) {
                if (button) {
                    button.disabled = false;
                    button.textContent = originalText;
                }
                return;
            }

            state.saved = true;
            updateStats();
            toast("저장 완료. 메인으로 이동합니다.");

            setTimeout(() => {
                location.href = app?.dataset.mainUrl || "/admin/seatmap/main";
            }, 250);
        } catch (error) {
            console.error(error);
            toast("저장 및 나가기 실패: 콘솔을 확인하세요.");

            if (button) {
                button.disabled = false;
                button.textContent = originalText;
            }
        }
    }

    async function saveButtonImageToServer(options = {}) {
        if (!state.hasResult) {
            toast("먼저 자동 변환 결과를 생성하세요.");
            return false;
        }

        const saveUrl = app?.dataset.saveUrl || "/admin/seatmap/overwrite-save";
        const payload = buildHeaderStyleSavePayload();

        try {
            const response = await fetch(saveUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "same-origin",
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "저장 실패");
            }

            const result = await response.json();
            console.log("[SeatTrace] overwrite save result", result);

            markConcertServerSaveFresh(result);

            if (!options.silent) {
                toast("저장 완료");
            }

            return true;
        } catch (error) {
            console.error(error);
            toast("서버 저장 실패: 저장 API 연결을 확인하세요.");
            return false;
        }
    }


    function markConcertServerSaveFresh(result) {
        const version = String(Date.now());
        const baseImageUrl =
            result?.imageUrl ||
            result?.savedImageUrl ||
            result?.output?.imageUrl ||
            "/images/seatmap/generated/seatmap-concert-image.png";
        const baseJsonUrl =
            result?.jsonUrl ||
            result?.savedJsonUrl ||
            result?.output?.jsonUrl ||
            "/json/seatmap/seatmap-concert-session.json";

        const imageUrl = appendCacheVersion(baseImageUrl, version);
        const jsonUrl = appendCacheVersion(baseJsonUrl, version);

        clearConcertBuildCacheForFreshImage();

        localStorage.setItem(STORAGE.concertOriginal, imageUrl);
        localStorage.setItem(STORAGE.concertClean, imageUrl);
        localStorage.setItem(STORAGE.concertButton, imageUrl);
        localStorage.setItem(STORAGE.concertEntry, "true");
        localStorage.setItem(STORAGE.concertVersion, version);
        localStorage.setItem(STORAGE.concertJsonUrl, jsonUrl);

        const meta = {
            source: "button-image-save",
            savedAt: new Date().toISOString(),
            version,
            imageUrl,
            jsonUrl
        };

        localStorage.setItem(STORAGE.concertImageMeta, JSON.stringify(meta));
        localStorage.setItem(STORAGE.concertButtonMeta, JSON.stringify(meta));
    }

    function clearConcertBuildCacheForFreshImage() {
        [
            "concert_originalImage",
            "concert_cleanImage",
            "concert_buttonImage",
            "concert_buttonImageMeta",
            "concert_sections",
            "concert_seats",
            "concert_extractSettings",
            "concert_finalLayout",
            "concert_imageMeta",
            "concert_stage1_colorRegions",
            "concert_stage1_angleRegions",
            "concert_stage1_selectedAngleRegions",
            "concert_stage1_sections",
            "concert_stage1_seats",
            "concert_stage1_layouts",
            "concert_stage1_generatedImage",
            "concert_stage1_baseLayoutsByGroup",
            "concert_stage1_visualGroups",
            "concert_stage1_selectedVisualGroupId",
            "concert_stage2_sections",
            "concert_stage2_selectedSections",
            "concert_stage2_layouts",
            "concert_stage3_seats",
            "concert_stage3_layouts",
            "concert_stage3_selectedSection",
            "concert_stage4_sections",
            "concert_stage4_finalImage",
            "concert_stage4_result"
        ].forEach((key) => localStorage.removeItem(key));
    }

    function appendCacheVersion(url, version) {
        if (!url || url.startsWith("data:image")) {
            return url;
        }

        try {
            const parsed = new URL(url, location.origin);
            parsed.searchParams.set("v", version);
            return parsed.pathname + parsed.search + parsed.hash;
        } catch (error) {
            const separator = url.includes("?") ? "&" : "?";
            return `${url}${separator}v=${encodeURIComponent(version)}`;
        }
    }

    function getSeatmapProjectFolderName() {
        const urlProjectId = new URLSearchParams(location.search).get("projectId");
        const storedFolder = localStorage.getItem("seatmap_current_folder_name");
        const currentId = localStorage.getItem("seatmap_current_project_id");

        return String(urlProjectId || storedFolder || currentId || "seat")
            .trim()
            .replace(/\s+/g, "_")
            .replace(/[^a-zA-Z0-9가-힣._-]/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_+|_+$/g, "") || "seat";
    }

    function buildHeaderStyleSavePayload() {
        const imageDataUrl = getHeaderStyleCurrentImageDataUrl();
        const pageState = buildButtonImageResultState(imageDataUrl);
        const jsonText = JSON.stringify(pageState, null, 2);
        const htmlText = buildButtonImageResultHtml(pageState);

        return {
            page: "button-image",
            folderName: getSeatmapProjectFolderName(),
            imageDataUrl,
            jsonText,
            htmlText,
            imageFileName: "seatmap-concert-image.png",
            htmlFileName: "seatmap-concert-image.html",
            jsonFileName: "seatmap-concert-session.json"
        };
    }

    function buildButtonImageResultState(imageDataUrl) {
        const meta = createMeta();
        const originalImage = localStorage.getItem(STORAGE.original) || "";

        return {
            _comment: "SeatTrace 1단계 좌석 이미지 버튼 이미지화 결과입니다. 원본 도면을 단색 구역 이미지로 변환한 PNG와 HTML 미리보기 파일을 함께 저장합니다.",
            service: "SeatTrace",
            type: "button-image-result",
            savedAt: new Date().toISOString(),
            page: "button-image",
            path: location.pathname,
            output: {
                jsonUrl: "/json/seatmap/seatmap-concert-session.json",
                imageUrl: "/images/seatmap/generated/seatmap-concert-image.png",
                htmlUrl: "/html/seatmap/generated/seatmap-concert-image.html"
            },
            image: {
                exists: Boolean(imageDataUrl),
                width: canvas ? canvas.width : 0,
                height: canvas ? canvas.height : 0,
                format: "png"
            },
            source: {
                originalExists: Boolean(originalImage),
                originalKey: STORAGE.original,
                resultKey: STORAGE.result
            },
            groups: buildGeneratedRegionGroupsForSave(),
            corrections: {
                selectedRegionCount: state.region.selected.length,
                selectedRegions: state.region.selected.map((region) => ({
                    id: region.id,
                    gradeName: region.gradeName || state.region.gradeName,
                    color: region.colorHex || state.region.color,
                    pixels: region.pixels.length,
                    bounds: region.bounds || null
                }))
            },
            algorithm: meta.algorithm,
            stats: meta.stats
        };
    }

    function buildButtonImageResultHtml(pageState) {
        const escapedJson = escapeHtml(JSON.stringify(pageState, null, 2));
        const imageUrl = pageState.output.imageUrl;

        return `<!--
SeatTrace 버튼 이미지화 결과 파일
- 1단계에서 생성된 단색 구역 PNG를 확인하기 위한 HTML입니다.
- 실제 다음 단계에서는 아래 imageUrl의 PNG 파일을 불러와 구역/좌석 제작에 사용합니다.
-->
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>SeatTrace 버튼 이미지화 결과</title>
    <style>
        body { margin: 0; padding: 24px; background: #f5f7fb; color: #111827; font-family: Arial, sans-serif; }
        h1 { margin: 0 0 16px; font-size: 22px; }
        .card { margin-bottom: 18px; padding: 18px; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; }
        img { max-width: 100%; height: auto; display: block; border: 1px solid #e5e7eb; background: #fff; }
        pre { overflow: auto; white-space: pre-wrap; word-break: break-word; font-size: 12px; line-height: 1.5; }
    </style>
</head>
<body>
    <h1>SeatTrace 버튼 이미지화 결과</h1>
    <div class="card">
        <img src="${imageUrl}" alt="SeatTrace 버튼 이미지화 결과">
    </div>
    <div class="card">
        <pre>${escapedJson}</pre>
    </div>
    <script type="application/json" id="seatmapButtonImageMeta">${escapedJson}</script>
</body>
</html>`;
    }

    function getHeaderStyleCurrentImageDataUrl() {
        if (canvas && canvas.width > 0 && canvas.height > 0) {
            try {
                return canvas.toDataURL("image/png");
            } catch (error) {
                console.warn("canvas image export failed", error);
            }
        }

        return localStorage.getItem("seat_button_resultImage")
            || localStorage.getItem("concert_cleanImage")
            || localStorage.getItem("concert_buttonImage")
            || localStorage.getItem("seat_button_originalImage")
            || localStorage.getItem("concert_originalImage")
            || "";
    }

    function dumpHeaderStyleSeatmapLocalStorage() {
        const storageKeys = [
            "seat_button_originalImage",
            "seat_button_resultImage",
            "seat_button_imageMeta",
            "seat_button_groups",
            "concert_originalImage",
            "concert_cleanImage",
            "concert_buttonImage",
            "concert_buttonImageMeta",
            "concert_sections",
            "concert_seats",
            "concert_extractSettings",
            "concert_finalLayout",
            "concert_imageMeta",
            "small_originalImage",
            "small_detectedSeats",
            "small_seats",
            "small_finalLayout"
        ];

        const result = {};

        storageKeys.forEach((key) => {
            const value = localStorage.getItem(key);

            if (value == null) {
                return;
            }

            result[key] = parseHeaderStyleMaybeJson(value);
        });

        return result;
    }

    function parseHeaderStyleMaybeJson(value) {
        if (typeof value !== "string") {
            return value;
        }

        const trimmed = value.trim();

        if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
            return value;
        }

        try {
            return JSON.parse(trimmed);
        } catch (error) {
            return value;
        }
    }

    function getHeaderStylePageState(localStorageDump, imageDataUrl) {
        return {
            service: "SeatTrace",
            savedAt: new Date().toISOString(),
            page: getHeaderStylePageName(),
            path: location.pathname,
            image: {
                exists: Boolean(imageDataUrl),
                width: getHeaderStyleCanvasWidth(),
                height: getHeaderStyleCanvasHeight()
            },
            localStorage: localStorageDump
        };
    }

    function getHeaderStyleCanvasWidth() {
        return canvas ? canvas.width : 0;
    }

    function getHeaderStyleCanvasHeight() {
        return canvas ? canvas.height : 0;
    }

    function getHeaderStylePageName() {
        const path = location.pathname;

        if (path.includes("button-image")) {
            return "button-image";
        }

        if (path.includes("concert/stage1")) {
            return "concert-stage1";
        }

        if (path.includes("concert/stage2")) {
            return "concert-stage2";
        }

        if (path.includes("concert/stage3")) {
            return "concert-stage3";
        }

        if (path.includes("concert/stage4")) {
            return "concert-stage4";
        }

        return "seatmap";
    }

    function buildHeaderStylePreviewHtml(imageDataUrl, pageState) {
        const escapedJson = escapeHtml(JSON.stringify(pageState, null, 2));
        const imageHtml = imageDataUrl
            ? `<img src="${imageDataUrl}" alt="SeatTrace saved image">`
            : `<div class="empty">저장된 이미지가 없습니다.</div>`;

        return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>SeatTrace 저장 미리보기</title>
    <style>
        body { margin: 0; padding: 24px; background: #f5f7fb; color: #111827; font-family: Arial, sans-serif; }
        h1 { margin: 0 0 16px; font-size: 22px; }
        .card { margin-bottom: 18px; padding: 18px; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; }
        img { max-width: 100%; height: auto; display: block; border: 1px solid #e5e7eb; background: #fff; }
        pre { overflow: auto; white-space: pre-wrap; word-break: break-word; font-size: 12px; line-height: 1.5; }
        .empty { padding: 50px; text-align: center; border: 1px dashed #cbd5e1; border-radius: 10px; color: #64748b; }
    </style>
</head>
<body>
    <h1>SeatTrace 저장 미리보기</h1>
    <div class="card">
        ${imageHtml}
    </div>
    <div class="card">
        <pre>${escapedJson}</pre>
    </div>
</body>
</html>`;
    }

    function createMeta() {
        return {
            version: 2,
            createdAt: new Date().toISOString(),
            sourceKey: state.sourceKey,
            width: canvas.width,
            height: canvas.height,
            algorithm: "scan-role-enclosure-region-brain",
            steps: [
                "multiScan",
                "outerWhiteFloodFill",
                "innerTextHoleDetection",
                "smallIslandAbsorption",
                "majorityCleanup",
                "componentDominantFill"
            ],
            stats: state.lastStats || {},
            groups: state.groups,
            selectedRegionGrades: state.region.selected.map((region) => ({
                id: region.id,
                gradeName: region.gradeName || state.region.gradeName,
                color: region.colorHex || state.region.color,
                pixels: region.pixels.length,
                bounds: region.bounds || null
            }))
        };
    }

    function createPreviewHtml(imageDataUrl, meta) {
        const escapedMeta = escapeHtml(JSON.stringify(meta, null, 2));

        return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>Seatmap Button Image Preview</title>
    <style>
        body { margin: 0; padding: 24px; font-family: Arial, sans-serif; background: #f5f6f8; color: #111827; }
        .card { max-width: 1100px; margin: 0 auto; padding: 20px; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; }
        img { max-width: 100%; height: auto; border: 1px solid #d1d5db; background: #fff; }
        pre { overflow: auto; padding: 16px; background: #111827; color: #e5e7eb; border-radius: 10px; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Seatmap Button Image Preview</h1>
        <img src="${imageDataUrl}" alt="seatmap result">
        <h2>Meta</h2>
        <pre>${escapedMeta}</pre>
    </div>
</body>
</html>`;
    }

    function downloadButtonImage() {
        if (!state.hasResult) {
            toast("먼저 자동 변환 결과를 생성하세요.");
            return;
        }

        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = "seatmap-button-image.png";
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    function restoreSourceImage(showToast = true) {
        if (!state.originalDataUrl) {
            return;
        }

        drawDataUrlToCanvas(state.originalDataUrl, sourceCanvas, sourceCtx).then(() => {
            resizeVisibleCanvas(sourceCanvas.width, sourceCanvas.height);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(sourceCanvas, 0, 0);
            syncResultFromVisible();

            state.hasResult = false;
            state.saved = false;
            state.resultBaseDataUrl = "";
            state.lastStats = null;

            pushHistory("원본 복구");
            updateStats();
            renderLegend();

            if (showToast) {
                toast("원본을 다시 표시했습니다.");
            }
        });
    }

    function restoreResultBase() {
        if (!state.resultBaseDataUrl) {
            toast("복구할 생성 이미지가 없습니다.");
            return;
        }

        drawDataUrlToCanvas(state.resultBaseDataUrl, canvas, ctx).then(() => {
            if (overlay) {
                overlay.width = canvas.width;
                overlay.height = canvas.height;
            }

            syncCanvasDisplay();
            syncResultFromVisible();
            state.hasResult = true;
            state.saved = false;
            pushHistory("생성 직후 복구");
            updateStats();
            toast("생성 직후 이미지로 복구했습니다.");
        });
    }

    function resetAutoState() {
        localStorage.removeItem(STORAGE.groups);
        state.groups = clone(DEFAULT_GROUPS);
        renderLegend();
        toast("자동 그룹 설정을 초기화했습니다.");
    }

    function pushHistory(label) {
        if (!canvas.width || !canvas.height) {
            return;
        }

        const snapshot = {
            label,
            visible: canvas.toDataURL("image/png"),
            hasResult: state.hasResult,
            saved: state.saved,
            resultBaseDataUrl: state.resultBaseDataUrl,
            stats: state.lastStats ? clone(state.lastStats) : null,
            step: state.currentStep || 1
        };

        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push(snapshot);

        if (state.history.length > 30) {
            state.history.shift();
        }

        state.historyIndex = state.history.length - 1;
        updateHistoryButtons();
    }

    function undo() {
        const targetIndex = findHistoryIndexInCurrentStep(-1);

        if (targetIndex < 0) {
            updateHistoryButtons();
            return;
        }

        state.historyIndex = targetIndex;
        restoreHistory(state.history[state.historyIndex]);
    }

    function redo() {
        const targetIndex = findHistoryIndexInCurrentStep(1);

        if (targetIndex < 0) {
            updateHistoryButtons();
            return;
        }

        state.historyIndex = targetIndex;
        restoreHistory(state.history[state.historyIndex]);
    }

    function findHistoryIndexInCurrentStep(direction) {
        const step = state.currentStep || 1;
        const start = state.historyIndex + direction;

        for (let i = start; i >= 0 && i < state.history.length; i += direction) {
            const itemStep = state.history[i]?.step || 1;

            if (itemStep === step) {
                return i;
            }

            // 파트 경계를 넘어서 복원하지 않는다.
            return -1;
        }

        return -1;
    }

    function restoreHistory(snapshot) {
        drawDataUrlToCanvas(snapshot.visible, canvas, ctx).then(() => {
            if (overlay) {
                overlay.width = canvas.width;
                overlay.height = canvas.height;
            }

            state.hasResult = snapshot.hasResult;
            state.saved = snapshot.saved;
            state.resultBaseDataUrl = snapshot.resultBaseDataUrl;
            state.lastStats = snapshot.stats;

            syncCanvasDisplay();
            syncResultFromVisible();
            updateStats();
            renderLegend(state.lastStats);
            updateHistoryButtons();
        });
    }

    function updateHistoryButtons() {
        const undoButton = $("undoAction");
        const redoButton = $("redoAction");

        if (undoButton) {
            undoButton.disabled = findHistoryIndexInCurrentStep(-1) < 0;
            undoButton.style.display = "";
            undoButton.removeAttribute("aria-hidden");
            undoButton.style.pointerEvents = "";
        }

        if (redoButton) {
            redoButton.disabled = findHistoryIndexInCurrentStep(1) < 0;
            redoButton.style.display = "";
            redoButton.removeAttribute("aria-hidden");
            redoButton.style.pointerEvents = "";
        }
    }

    function renderLegend(stats) {
        const wrap = $("buttonImageLegend") || $("buttonImageGroups");

        if (!wrap) {
            return;
        }

        const counts = stats ? createRoleCountFromStats(stats) : new Map();

        // 오른쪽 미리보기 색상 목록을 그대로 "색상 버튼"처럼 사용한다.
        // 구역을 선택한 뒤 이 줄을 클릭하면 선택 구역이 해당 색/등급으로 바로 바뀐다.
        wrap.innerHTML = state.groups.map((group) => {
            const count = counts.get(group.role) || 0;
            const canApply = isSeatRole(group.role);
            const countText = count ? `${count}개` : "자동";
            const grade = group.gradeName || getDefaultGradeName(group.role);
            const className = canApply
                ? "button-image-legend-row button-image-group button-image-palette-button"
                : "button-image-legend-row button-image-group is-disabled";
            const attrs = canApply
                ? `data-region-palette="${escapeHtml(group.output)}" data-region-name="${escapeHtml(grade)}" data-group-id="${escapeHtml(group.id)}"`
                : `data-group-id="${escapeHtml(group.id)}"`;

            return `
                <button type="button" class="${className}" ${attrs}>
                    <i style="background:${escapeHtml(group.output)}"></i>
                    <strong>${escapeHtml(grade)}</strong>
                    <small>${escapeHtml(group.name)}</small>
                    <span>${countText}</span>
                </button>
            `;
        }).join("");

        wrap.querySelectorAll("[data-region-palette]").forEach((button) => {
            button.addEventListener("click", () => handlePaletteButtonClick(button));
        });
    }

    function createRoleCountFromStats(stats) {
        const result = new Map();

        if (!stats || !Array.isArray(stats.regionRoleCounts)) {
            return result;
        }

        for (const item of stats.regionRoleCounts) {
            result.set(item.role, item.count);
        }

        return result;
    }

    function updateStats() {
        setText("imageSizeText", canvas.width && canvas.height ? `${canvas.width} × ${canvas.height}` : "-");
        setText("sampleCountText", state.lastStats ? `${state.lastStats.seatRegions}개` : "0개");
        setText("saveStateText", state.saved ? "저장됨" : "미저장");

        const autoSampleText = $("autoSampleText");
        if (autoSampleText) {
            autoSampleText.textContent = state.lastStats ? `${state.lastStats.seatRegions}개` : "0개";
        }
    }

    function toggleRegionSelectTool() {
        if (!state.imageReady || !canvas.width || !canvas.height) {
            toast("원본 또는 변환 결과가 먼저 필요합니다.");
            return;
        }

        state.region.enabled = !state.region.enabled;

        if (!state.region.enabled) {
            clearOverlay();
        } else {
            drawSelectedRegionsOverlay();
        }

        updateRegionToolUI();
        toast(state.region.enabled ? "구역 선택 모드: 남은 글자/숫자가 있는 좌석 구역을 클릭하세요." : "구역 선택 모드를 종료했습니다.");
    }

    function setStep(step) {
        const nextStep = Number(step) || 1;
        state.currentStep = nextStep;

        if (nextStep > 1 && !state.hasResult) {
            state.currentStep = 1;
            toast("먼저 파트 1에서 미리보기를 생성하세요.");
            return;
        }

        if (nextStep !== 4) {
            state.finalPreview.enabled = false;
        }

        document.querySelectorAll(".button-image-step").forEach((section) => {
            const itemStep = Number(section.dataset.step);
            const header = section.querySelector(".button-image-step__header");
            const status = section.querySelector(".button-image-step__status");

            section.classList.toggle("is-active", itemStep === nextStep);
            section.classList.toggle("is-done", itemStep < nextStep);

            if (header) {
                header.classList.toggle("active", itemStep === nextStep);
            }

            if (status) {
                if (itemStep < nextStep) {
                    status.textContent = "완료";
                } else if (itemStep === nextStep) {
                    status.textContent = nextStep === 2 ? "선택중" : (nextStep === 3 ? "보정중" : (nextStep === 4 ? "확인중" : "진행중"));
                } else {
                    status.textContent = "대기";
                }
            }
        });

        if (nextStep === 2) {
            enableRegionSelectTool(true);
            setBrushMode("none", { silent: true });
            setColorPickerMode(false, { silent: true });
        } else if (nextStep === 3) {
            enableRegionSelectTool(false);
            updateBrushSize();
            setColorPickerMode(false, { silent: true });
            setBrushMode(state.brush.mode === "none" ? "paint" : state.brush.mode, { silent: true });
            clearOverlay();
        } else if (nextStep === 4) {
            enableRegionSelectTool(false);
            setBrushMode("none", { silent: true });
            setColorPickerMode(false, { silent: true });
            showFinalSavePreview();
        } else {
            setBrushMode("none", { silent: true });
            setColorPickerMode(false, { silent: true });
            clearOverlay();
        }
    }

    function enableRegionSelectTool(enabled) {
        if (enabled && (!state.imageReady || !canvas.width || !canvas.height)) {
            toast("원본 또는 변환 결과가 먼저 필요합니다.");
            return;
        }

        state.region.enabled = Boolean(enabled);

        if (state.region.enabled) {
            drawSelectedRegionsOverlay();
        } else {
            clearOverlay();
        }

        updateRegionToolUI();
    }

    function updateRegionColorFromInput() {
        const input = $("regionColorInput");
        if (!input) {
            return;
        }

        setRegionColor(input.value);
    }

    function setRegionColor(hex, shouldToast = true) {
        if (!hex || !hex.startsWith("#")) {
            return;
        }

        state.region.color = hex;

        const input = $("regionColorInput");
        if (input) {
            input.value = hex;
        }

        if (shouldToast) {
            toast(`보정 색상 선택: ${hex.toUpperCase()}`);
        }
    }

    function updateRegionGradeFromInput() {
        const input = $("regionGradeInput");
        if (!input) {
            return;
        }

        state.region.gradeName = input.value.trim() || "R";

        for (const region of state.region.selected) {
            region.gradeName = state.region.gradeName;
        }

        updateRegionSelectionText();
    }

    function setRegionGradeName(name) {
        const cleanName = String(name || "").trim() || "R";
        state.region.gradeName = cleanName;

        const input = $("regionGradeInput");
        if (input) {
            input.value = cleanName;
        }

        for (const region of state.region.selected) {
            region.gradeName = cleanName;
        }

        updateRegionSelectionText();
    }

    function handlePaletteButtonClick(button) {
        const color = button?.dataset?.regionPalette;
        const gradeName = button?.dataset?.regionName;

        if (!color) {
            return;
        }

        setRegionColor(color, false);
        setRegionGradeName(gradeName || state.region.gradeName);

        // 선택된 구역이 있으면 색상 버튼 클릭 즉시 반영한다.
        // 선택 구역이 없으면 다음 선택 때 쓸 색상만 바꿔둔다.
        if (state.region.selected.length > 0) {
            applySelectedRegionColor({ silent: true });
            toast(`${state.region.gradeName} 색상으로 선택 구역을 변경했습니다.`);
        } else {
            toast(`${state.region.gradeName} 색상을 선택했습니다. 변경할 구역을 클릭하세요.`);
        }
    }

    function getDefaultGradeName(role) {
        if (role === ROLE.SEAT_BROWN) return "VIP";
        if (role === ROLE.SEAT_PURPLE) return "S";
        if (role === ROLE.SEAT_PINK) return "R";
        if (role === ROLE.SEAT_BLUE) return "B";
        if (role === ROLE.SEAT_GREEN) return "A";
        if (role === ROLE.SEAT_ORANGE) return "A";
        if (role === ROLE.SEAT_RED) return "R";
        return "-";
    }

    function clearSelectedRegions() {
        state.region.selected = [];
        clearOverlay();
        updateRegionSelectionText();
        toast("선택 구역을 모두 해제했습니다.");
    }

    function onCanvasDown(event) {
        if (state.brush.pickColor) {
            event.preventDefault();
            return;
        }

        if (state.brush.mode !== "none") {
            const point = getCanvasPoint(event);
            if (!point) {
                return;
            }

            event.preventDefault();
            state.brush.down = true;
            state.brush.changed = false;
            paintBrushAt(point);
            return;
        }

        // 구역 선택 방식에서는 드래그를 쓰지 않는다.
        // 마우스 down/up은 기존 overlay 이벤트 호환을 위해 남겨둔다.
    }

    function onCanvasUp() {
        finishBrushStroke();
    }

    function onCanvasClick(event) {
        const point = getCanvasPoint(event);

        if (state.brush.pickColor) {
            event.preventDefault();
            if (point) {
                sampleBrushColorAt(point);
            }
            return;
        }

        if (state.brush.mode !== "none") {
            event.preventDefault();
            return;
        }

        if (!state.region.enabled) {
            return;
        }

        if (!point) {
            return;
        }

        event.preventDefault();
        selectRegionByClick(point, event.shiftKey, event.ctrlKey || event.metaKey);
    }

    function onCanvasLeave() {
        finishBrushStroke();
        hideLoupe();
    }

    function onCanvasMove(event) {
        if (!state.imageReady || !sourceCanvas.width || !sourceCanvas.height) {
            return;
        }

        const point = getCanvasPoint(event);
        if (!point) {
            hideLoupe();
            return;
        }

        if (state.brush.pickColor) {
            updateLoupe(point, event);
            updateBrushCursor(point);
            return;
        }

        updateBrushCursor(point);

        if (state.brush.down && state.brush.mode !== "none") {
            event.preventDefault();
            paintBrushAt(point);
            return;
        }

        updateLoupe(point, event);
    }

    function selectRegionByClick(point, appendMode, toggleMode) {
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const roleMap = buildCurrentCanvasRoleMap(image, canvas.width, canvas.height);
        const start = findNearestSeatStart(point, roleMap, canvas.width, canvas.height);

        if (!start) {
            toast("좌석 구역을 찾지 못했습니다. 색상이 있는 좌석 안쪽을 클릭하세요.");
            return;
        }

        const region = floodSelectSeatRegion(start.index, roleMap, canvas.width, canvas.height, start.role);

        if (!region || region.pixels.length < 3) {
            toast("선택 가능한 좌석 구역이 너무 작습니다.");
            return;
        }

        region.id = state.region.nextId;
        state.region.nextId += 1;
        region.color = getDominantColorFromPixels(image, region.pixels);
        region.colorHex = rgbToHex(region.color.r, region.color.g, region.color.b);
        region.gradeName = state.region.gradeName || getDefaultGradeName(region.role);
        region.pixelSet = new Set(region.pixels);

        mergeRegionSelection(region, appendMode, toggleMode);
        drawSelectedRegionsOverlay();
        updateRegionSelectionText();
        toast(`구역 선택: ${getRoleName(region.role)} / ${region.pixels.length}픽셀`);
    }

    function setBrushMode(mode, options = {}) {
        const nextMode = ["paint", "erase"].includes(mode) ? mode : "none";

        state.brush.mode = nextMode;
        if (nextMode !== "none") {
            state.brush.pickColor = false;
        }
        state.brush.down = false;
        state.brush.changed = false;

        if (box) {
            box.classList.toggle("is-brushing", nextMode === "paint");
            box.classList.toggle("is-erasing", nextMode === "erase");
        }

        const brushButton = $("brushTool");
        const eraseButton = $("eraseTool");

        if (brushButton) {
            brushButton.classList.toggle("is-active", nextMode === "paint");
        }

        if (eraseButton) {
            eraseButton.classList.toggle("is-active", nextMode === "erase");
        }

        if (nextMode === "none" && brushCursor) {
            brushCursor.style.display = "none";
        }

        if (!options.silent) {
            if (nextMode === "paint") {
                toast("브러쉬 모드: 선택 색상으로 찌꺼기를 덮어 칠합니다.");
            } else if (nextMode === "erase") {
                toast("지우개 모드: 배경색으로 찌꺼기를 제거합니다.");
            } else {
                toast("브러쉬 보정을 종료했습니다.");
            }
        }
    }

    function toggleColorPickerMode() {
        setColorPickerMode(!state.brush.pickColor);
    }

    function setColorPickerMode(enabled, options = {}) {
        state.brush.pickColor = Boolean(enabled);

        const button = $("pickColorFromCanvas");
        if (button) {
            button.classList.toggle("is-active", state.brush.pickColor);
            button.textContent = state.brush.pickColor ? "도면 클릭 대기중" : "도면에서 색상 찍기";
        }

        if (box) {
            box.classList.toggle("is-picking-color", state.brush.pickColor);
        }

        if (state.brush.pickColor) {
            state.brush.down = false;
            hideLoupe();
            if (!options.silent) {
                toast("도면에서 칠할 색상을 클릭하세요.");
            }
        } else if (!options.silent) {
            toast("색상 찍기 모드를 종료했습니다.");
        }
    }

    function sampleBrushColorAt(point) {
        if (!canvas.width || !canvas.height) {
            return;
        }

        const x = clamp(Math.round(point.x), 0, canvas.width - 1);
        const y = clamp(Math.round(point.y), 0, canvas.height - 1);
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
        const input = $("regionColorInput");

        if (input) {
            input.value = hex;
        }

        state.region.color = hex;
        setColorPickerMode(false, { silent: true });
        setBrushMode("none", { silent: true });
        updateRegionToolUI();
        toast(`지정 색상 선택: ${hex}`);
    }

    function updateBrushSize() {
        const input = $("brushSize");
        const value = input ? Number(input.value) : state.brush.size;

        state.brush.size = clamp(value || 18, 2, 120);
        setText("brushSizeText", `${Math.round(state.brush.size)}px`);
    }

    function paintBrushAt(point) {
        if (!state.imageReady || !canvas.width || !canvas.height || state.brush.mode === "none") {
            return;
        }

        updateBrushSize();

        const radius = Math.max(1, state.brush.size / 2);
        const color = state.brush.mode === "erase"
            ? getBrushEraseColor()
            : getBrushPaintColor(point, radius);

        ctx.save();
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        ctx.fill();
        ctx.restore();

        state.hasResult = true;
        state.saved = false;
        state.brush.changed = true;
    }

    function finishBrushStroke() {
        if (!state.brush.down) {
            return;
        }

        state.brush.down = false;

        if (!state.brush.changed) {
            return;
        }

        syncResultFromVisible();
        state.resultBaseDataUrl = canvas.toDataURL("image/png");
        pushHistory(state.brush.mode === "erase" ? "지우개 보정" : "브러쉬 보정");
        updateStats();
        toast(state.brush.mode === "erase" ? "지우개 보정을 적용했습니다." : "브러쉬 보정을 적용했습니다.");
    }

    function getBrushPaintColor(point, radius = 12) {
        const auto = findNearestRegionColorForBrushV48(point, radius);
        if (auto) {
            const hex = rgbToHex(auto.r, auto.g, auto.b);
            state.region.color = hex;
            state.brush.color = hex;
            const input = $("regionColorInput");
            if (input) {
                input.value = hex;
            }
            return auto;
        }

        const input = $("regionColorInput");
        const hex = input?.value || state.region.color || "#ef5e94";
        return hexToRgb(hex);
    }

    function findNearestRegionColorForBrushV48(point, radius = 12) {
        if (!canvas.width || !canvas.height) {
            return null;
        }

        const cx = clamp(Math.round(point.x), 0, canvas.width - 1);
        const cy = clamp(Math.round(point.y), 0, canvas.height - 1);
        const maxRadius = Math.max(8, Math.round(radius * 2.5), 24);
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const votes = new Map();
        let fallback = null;

        for (let r = 1; r <= maxRadius; r += 1) {
            const minX = Math.max(0, cx - r);
            const maxX = Math.min(canvas.width - 1, cx + r);
            const minY = Math.max(0, cy - r);
            const maxY = Math.min(canvas.height - 1, cy + r);

            for (let x = minX; x <= maxX; x += 1) {
                collectBrushColorVoteV48(x, minY, r);
                if (maxY !== minY) {
                    collectBrushColorVoteV48(x, maxY, r);
                }
            }

            for (let y = minY + 1; y < maxY; y += 1) {
                collectBrushColorVoteV48(minX, y, r);
                if (maxX !== minX) {
                    collectBrushColorVoteV48(maxX, y, r);
                }
            }

            if (votes.size > 0 && r >= Math.max(3, Math.round(radius * 0.8))) {
                break;
            }
        }

        let best = null;
        votes.forEach((entry) => {
            if (!best || entry.score > best.score) {
                best = entry;
            }
        });

        return best ? best.rgb : fallback;

        function collectBrushColorVoteV48(x, y, ring) {
            const idx = (y * canvas.width + x) * 4;
            const a = image[idx + 3];
            const rr = image[idx];
            const gg = image[idx + 1];
            const bb = image[idx + 2];
            if (a < 10) {
                return;
            }
            if (rr <= 10 && gg <= 10 && bb <= 10) {
                return;
            }
            if (rr >= 245 && gg >= 245 && bb >= 245) {
                return;
            }
            const key = `${rr},${gg},${bb}`;
            const ringWeight = Math.max(1, maxRadius - ring + 1);
            const existing = votes.get(key) || { rgb: { r: rr, g: gg, b: bb }, score: 0 };
            existing.score += ringWeight;
            votes.set(key, existing);
            if (!fallback) {
                fallback = { r: rr, g: gg, b: bb };
            }
        }
    }

    function getBrushEraseColor() {
        return { r: 247, g: 247, b: 247 };
    }

    function updateBrushCursor(point) {
        if (!brushCursor || (state.brush.mode === "none" && !state.brush.pickColor)) {
            if (brushCursor) {
                brushCursor.style.display = "none";
            }
            return;
        }

        const size = state.brush.pickColor ? Math.max(36, 46 * state.zoom) : Math.max(2, state.brush.size * state.zoom);
        const left = (point.x * state.zoom) - (size / 2);
        const top = (point.y * state.zoom) - (size / 2);

        brushCursor.style.display = "block";
        brushCursor.style.width = `${size}px`;
        brushCursor.style.height = `${size}px`;
        brushCursor.style.transform = `translate(${left}px, ${top}px)`;
        brushCursor.classList.toggle("is-erase", state.brush.mode === "erase");
        brushCursor.classList.toggle("is-picker", state.brush.pickColor);
    }

    function buildCurrentCanvasRoleMap(image, width, height) {
        const roleMap = new Uint8Array(width * height);
        const data = image.data;
        const variant = getScanVariant("relaxed");

        for (let i = 0; i < width * height; i += 1) {
            const offset = i * 4;
            roleMap[i] = classifyColorRole(data[offset], data[offset + 1], data[offset + 2], data[offset + 3], variant);
        }

        return roleMap;
    }

    function findNearestSeatStart(point, roleMap, width, height) {
        const startX = clamp(Math.round(point.x), 0, width - 1);
        const startY = clamp(Math.round(point.y), 0, height - 1);
        const directIndex = startY * width + startX;
        const directRole = roleMap[directIndex];

        if (isSeatRole(directRole)) {
            return { index: directIndex, role: directRole };
        }

        // 숫자/문자 잔상 위를 클릭해도 주변 좌석 구역을 잡기 위해 가까운 좌석 픽셀을 찾는다.
        const maxRadius = 14;
        let best = null;
        let bestDistance = Infinity;

        for (let radius = 1; radius <= maxRadius; radius += 1) {
            for (let dy = -radius; dy <= radius; dy += 1) {
                for (let dx = -radius; dx <= radius; dx += 1) {
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) {
                        continue;
                    }

                    const x = startX + dx;
                    const y = startY + dy;

                    if (x < 0 || y < 0 || x >= width || y >= height) {
                        continue;
                    }

                    const index = y * width + x;
                    const role = roleMap[index];

                    if (!isSeatRole(role)) {
                        continue;
                    }

                    const distance = (dx * dx) + (dy * dy);
                    if (distance < bestDistance) {
                        bestDistance = distance;
                        best = { index, role };
                    }
                }
            }

            if (best) {
                return best;
            }
        }

        return null;
    }

    function floodSelectSeatRegion(startIndex, roleMap, width, height, targetRole) {
        const visited = new Uint8Array(width * height);
        const queue = [startIndex];
        const pixels = [];
        const bounds = {
            minX: Infinity,
            minY: Infinity,
            maxX: -Infinity,
            maxY: -Infinity
        };

        visited[startIndex] = 1;

        while (queue.length > 0) {
            const current = queue.pop();
            const x = current % width;
            const y = Math.floor(current / width);

            pixels.push(current);
            bounds.minX = Math.min(bounds.minX, x);
            bounds.minY = Math.min(bounds.minY, y);
            bounds.maxX = Math.max(bounds.maxX, x);
            bounds.maxY = Math.max(bounds.maxY, y);

            pushRegionNeighbor(x + 1, y, targetRole, roleMap, visited, queue, width, height);
            pushRegionNeighbor(x - 1, y, targetRole, roleMap, visited, queue, width, height);
            pushRegionNeighbor(x, y + 1, targetRole, roleMap, visited, queue, width, height);
            pushRegionNeighbor(x, y - 1, targetRole, roleMap, visited, queue, width, height);
        }

        bounds.width = bounds.maxX - bounds.minX + 1;
        bounds.height = bounds.maxY - bounds.minY + 1;

        return {
            id: 0,
            role: targetRole,
            pixels,
            bounds
        };
    }

    function pushRegionNeighbor(x, y, targetRole, roleMap, visited, queue, width, height) {
        if (x < 0 || y < 0 || x >= width || y >= height) {
            return;
        }

        const index = y * width + x;

        if (visited[index] || roleMap[index] !== targetRole) {
            return;
        }

        visited[index] = 1;
        queue.push(index);
    }

    function mergeRegionSelection(region, appendMode, toggleMode) {
        const hitIndex = state.region.selected.findIndex((selected) => regionsOverlapEnough(selected, region));

        if (toggleMode && hitIndex >= 0) {
            state.region.selected.splice(hitIndex, 1);
            return;
        }

        if (!appendMode && !toggleMode) {
            state.region.selected = [];
        }

        if (hitIndex >= 0) {
            state.region.selected[hitIndex] = region;
            return;
        }

        state.region.selected.push(region);
    }

    function regionsOverlapEnough(a, b) {
        if (!a || !b || !a.pixelSet) {
            return false;
        }

        let overlap = 0;
        const limit = Math.min(30, b.pixels.length);
        const step = Math.max(1, Math.floor(b.pixels.length / limit));

        for (let i = 0; i < b.pixels.length; i += step) {
            if (a.pixelSet.has(b.pixels[i])) {
                overlap += 1;
            }
        }

        return overlap >= Math.max(3, Math.floor(limit * 0.35));
    }

    function drawSelectedRegionsOverlay() {
        clearOverlay();

        if (!overlayCtx || !overlay || state.region.selected.length === 0) {
            return;
        }

        const width = overlay.width;
        const height = overlay.height;
        const image = overlayCtx.createImageData(width, height);
        const data = image.data;
        const selectedMask = buildSelectedMask();

        // 선택 내부는 보라색 반투명으로 표시한다.
        for (const region of state.region.selected) {
            for (const index of region.pixels) {
                const offset = index * 4;
                data[offset] = 124;
                data[offset + 1] = 58;
                data[offset + 2] = 237;
                data[offset + 3] = 72;
            }
        }

        // 선택 테두리는 진하게 표시해서 어느 구역이 선택됐는지 바로 보이게 한다.
        for (const region of state.region.selected) {
            for (const index of region.pixels) {
                const x = index % width;
                const y = Math.floor(index / width);

                if (isSelectionBoundaryPixel(x, y, selectedMask, width, height)) {
                    const offset = index * 4;
                    data[offset] = 17;
                    data[offset + 1] = 24;
                    data[offset + 2] = 39;
                    data[offset + 3] = 210;
                }
            }
        }

        overlayCtx.putImageData(image, 0, 0);
    }

    function isSelectionBoundaryPixel(x, y, selectedMask, width, height) {
        const neighbors = [
            [x + 1, y],
            [x - 1, y],
            [x, y + 1],
            [x, y - 1]
        ];

        return neighbors.some(([nx, ny]) => {
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
                return true;
            }
            return selectedMask[ny * width + nx] === 0;
        });
    }

    function buildSelectedMask() {
        const mask = new Uint8Array(canvas.width * canvas.height);

        for (const region of state.region.selected) {
            for (const index of region.pixels) {
                mask[index] = 1;
            }
        }

        return mask;
    }

    function updateRegionToolUI() {
        const button = $("regionSelectStart");
        if (button) {
            button.classList.toggle("is-active", state.region.enabled);
            button.textContent = state.region.enabled ? "구역 선택 모드 켜짐" : "구역 클릭 선택 시작";
        }

        updateRegionSelectionText();
    }

    function updateRegionSelectionText() {
        const count = state.region.selected.length;
        let pixels = 0;

        for (const region of state.region.selected) {
            pixels += region.pixels.length;
        }

        const gradeText = state.region.gradeName ? ` / ${state.region.gradeName}` : "";
        const text = count > 0 ? `${count}개 / ${pixels}픽셀${gradeText}` : "없음";
        setText("regionSelectionText", text);
    }

    function applySelectedRegionColor(options = {}) {
        if (state.region.selected.length === 0) {
            if (!options.silent) {
                toast("먼저 보정할 구역을 클릭해서 선택하세요.");
            }
            return;
        }

        const color = hexToRgb(state.region.color);
        paintSelectedRegionPixels(color, "선택 색상 적용", options);
    }

    function fillSelectedRegionsWithDominantColor() {
        if (state.region.selected.length === 0) {
            toast("먼저 보정할 구역을 클릭해서 선택하세요.");
            return;
        }

        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let changed = 0;

        for (const region of state.region.selected) {
            const color = getDominantColorFromPixels(image, region.pixels);
            changed += paintRegionPixels(region, color);
            region.color = color;
            region.colorHex = rgbToHex(color.r, color.g, color.b);
        }

        finishRegionEdit(`대표색 통일 ${changed}픽셀`);
    }

    function cleanAndFillSelectedRegions() {
        if (state.region.selected.length === 0) {
            toast("먼저 보정할 구역을 클릭해서 선택하세요.");
            return;
        }

        const removed = removeTextInsideSelectedRegions({ silent: true });
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let painted = 0;

        for (const region of state.region.selected) {
            const color = getDominantColorFromPixels(image, region.pixels);
            painted += paintRegionPixels(region, color);
        }

        finishRegionEdit(`선택 구역 정리 ${removed + painted}픽셀`);
        toast(`선택 구역 정리 완료: 문자 ${removed}픽셀 / 구역 ${painted}픽셀`);
    }

    function paintSelectedRegionPixels(color, label, options = {}) {
        let changed = 0;

        for (const region of state.region.selected) {
            changed += paintRegionPixels(region, color);
            region.color = color;
            region.colorHex = rgbToHex(color.r, color.g, color.b);
            region.gradeName = state.region.gradeName;
        }

        finishRegionEdit(`${label} ${changed}픽셀`);

        if (!options.silent) {
            toast(`${label}: ${changed}픽셀`);
        }
    }

    function paintRegionPixels(region, color) {
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = image.data;

        for (const index of region.pixels) {
            const offset = index * 4;
            data[offset] = color.r;
            data[offset + 1] = color.g;
            data[offset + 2] = color.b;
            data[offset + 3] = 255;
        }

        ctx.putImageData(image, 0, 0);
        return region.pixels.length;
    }

    function cleanAllCurrentSeatRegions() {
        if (!state.hasResult || !canvas.width || !canvas.height) {
            toast("먼저 파트 1에서 미리보기를 생성하세요.");
            return;
        }

        const width = canvas.width;
        const height = canvas.height;
        const image = ctx.getImageData(0, 0, width, height);
        const roleMap = buildCurrentCanvasRoleMap(image, width, height);
        const components = extractComponents(roleMap, width, height, (role) => isSeatRole(role))
            .filter((component) => component.area >= 8);
        const data = image.data;
        let removed = 0;
        let repainted = 0;

        for (const component of components) {
            const region = {
                id: 0,
                role: roleMap[component.pixels[0]],
                pixels: component.pixels,
                bounds: {
                    minX: component.minX,
                    minY: component.minY,
                    maxX: component.maxX,
                    maxY: component.maxY,
                    width: component.width,
                    height: component.height
                }
            };
            const selectedMask = buildMaskFromPixels(region.pixels, width, height);
            const fillColor = getDominantColorFromPixels(image, region.pixels);
            const textComponents = extractCandidateTextComponentsNearRegion(roleMap, selectedMask, region, width, height);

            for (const textComponent of textComponents) {
                const score = scoreCandidateComponentForRegion(textComponent, selectedMask, width, height);

                if (score < 62) {
                    continue;
                }

                for (const index of textComponent.pixels) {
                    const offset = index * 4;
                    data[offset] = fillColor.r;
                    data[offset + 1] = fillColor.g;
                    data[offset + 2] = fillColor.b;
                    data[offset + 3] = 255;
                    removed += 1;
                }
            }

            // 전체 정리는 외부 확장이 아니라 현재 구역 픽셀만 대표색으로 통일한다.
            for (const index of region.pixels) {
                const offset = index * 4;
                if (data[offset] !== fillColor.r || data[offset + 1] !== fillColor.g || data[offset + 2] !== fillColor.b) {
                    data[offset] = fillColor.r;
                    data[offset + 1] = fillColor.g;
                    data[offset + 2] = fillColor.b;
                    data[offset + 3] = 255;
                    repainted += 1;
                }
            }
        }

        ctx.putImageData(image, 0, 0);
        syncResultFromVisible();
        state.hasResult = true;
        state.saved = false;
        state.resultBaseDataUrl = canvas.toDataURL("image/png");
        pushHistory(`전체 정리 문자 ${removed}픽셀 / 통일 ${repainted}픽셀`);
        drawSelectedRegionsOverlay();
        updateStats();
        toast(`전체 정리 완료: 문자 ${removed}픽셀 / 구역 통일 ${repainted}픽셀`);
    }

    function buildMaskFromPixels(pixels, width, height) {
        const mask = new Uint8Array(width * height);

        for (const index of pixels) {
            mask[index] = 1;
        }

        return mask;
    }

    function removeTextInsideSelectedRegions(options = {}) {
        if (state.region.selected.length === 0) {
            toast("먼저 보정할 구역을 클릭해서 선택하세요.");
            return 0;
        }

        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const roleMap = buildCurrentCanvasRoleMap(image, canvas.width, canvas.height);
        const data = image.data;
        let removed = 0;

        for (const region of state.region.selected) {
            const selectedMask = buildMaskFromPixels(region.pixels, canvas.width, canvas.height);
            const fillColor = getDominantColorFromPixels(image, region.pixels);
            const components = extractCandidateTextComponentsNearRegion(roleMap, selectedMask, region, canvas.width, canvas.height);

            for (const component of components) {
                const score = scoreCandidateComponentForRegion(component, selectedMask, canvas.width, canvas.height);

                if (score < 62) {
                    continue;
                }

                // 절대 외부 확장 금지.
                // 선택 구역 바깥쪽 픽셀을 넓히는 게 아니라, 선택 구역 내부에 갇힌 문자/숫자 구멍만 채운다.
                for (const index of component.pixels) {
                    const offset = index * 4;
                    data[offset] = fillColor.r;
                    data[offset + 1] = fillColor.g;
                    data[offset + 2] = fillColor.b;
                    data[offset + 3] = 255;
                    removed += 1;
                }
            }
        }

        if (removed > 0) {
            ctx.putImageData(image, 0, 0);
            syncResultFromVisible();
            state.hasResult = true;
            state.saved = false;
            state.resultBaseDataUrl = canvas.toDataURL("image/png");
            pushHistory(`선택 구역 내부 문자 제거 ${removed}픽셀`);
            drawSelectedRegionsOverlay();
            updateStats();
        }

        if (!options.silent) {
            toast(removed > 0 ? `선택 구역 내부 문자 제거 완료: ${removed}픽셀` : "선택 구역 안쪽에서 제거할 문자/숫자를 찾지 못했습니다.");
        }

        return removed;
    }

    function fillEnclosedTextPixelsInsideRegion(data, roleMap, selectedMask, region, fillColor, width, height) {
        // 구버전 호환용 함수.
        // 예전에는 이 함수가 bbox 주변을 훑으면서 선택 영역을 바깥으로 키워버렸다.
        // 이제는 외부 확장을 막기 위해 직접 픽셀 단위 확장 처리를 하지 않는다.
        return 0;
    }


    function isCandidateTextPixelForRegion(r, g, b, a, role) {
        if (a <= 10) {
            return true;
        }

        if (role === ROLE.WHITE || role === ROLE.OUTER_WHITE || role === ROLE.BLACK || role === ROLE.GRAY || role === ROLE.BACKGROUND || role === ROLE.UNKNOWN) {
            return true;
        }

        // 흰 글자의 안티앨리어싱이나 압축 노이즈는 완전한 흰색이 아니라도 밝고 채도가 낮다.
        const hsl = rgbToHsl(r, g, b);
        if (hsl.l >= 0.62 && hsl.s <= 0.35) {
            return true;
        }

        // 검은 숫자/점 잔상도 선택 구역 내부에 박혀 있으면 제거 대상이다.
        if (hsl.l <= 0.28 && hsl.s <= 0.45) {
            return true;
        }

        return false;
    }

    function getRegionEnclosureScore(x, y, selectedMask, width, height, maxDistance) {
        const directions = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1]
        ];
        let hitDirections = 0;
        let ringHits = 0;
        let ringTotal = 0;

        for (const [dx, dy] of directions) {
            let hit = false;

            for (let distance = 1; distance <= maxDistance; distance += 1) {
                const nx = x + (dx * distance);
                const ny = y + (dy * distance);

                if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
                    break;
                }

                ringTotal += 1;

                if (selectedMask[ny * width + nx]) {
                    hit = true;
                    ringHits += 1;
                    break;
                }
            }

            if (hit) {
                hitDirections += 1;
            }
        }

        return {
            directions: hitDirections,
            ringRatio: ringHits / Math.max(1, ringTotal)
        };
    }

    function extractCandidateTextComponentsNearRegion(roleMap, selectedMask, region, width, height) {
        const visited = new Uint8Array(width * height);
        const components = [];
        const queue = [];
        const bounds = region.bounds || createBoundsFromPixels(region.pixels, width, height);
        const minX = clamp(bounds.minX, 0, width - 1);
        const minY = clamp(bounds.minY, 0, height - 1);
        const maxX = clamp(bounds.maxX, 0, width - 1);
        const maxY = clamp(bounds.maxY, 0, height - 1);

        for (let y = minY; y <= maxY; y += 1) {
            for (let x = minX; x <= maxX; x += 1) {
                const start = y * width + x;

                if (visited[start] || selectedMask[start] || !isCandidateTextRole(roleMap[start])) {
                    continue;
                }

                // 핵심 변경점:
                // 후보 시작점부터 선택 구역 내부에 갇힌 픽셀인지 확인한다.
                // 이 조건이 없으면 모서리 바깥/흰 구분선까지 문자로 오판해서 구역이 퍼진다.
                if (!isPixelInsideSelectedEnvelope(x, y, selectedMask, width, height, 18)) {
                    continue;
                }

                const component = {
                    pixels: [],
                    area: 0,
                    minX: Infinity,
                    minY: Infinity,
                    maxX: -Infinity,
                    maxY: -Infinity,
                    width: 0,
                    height: 0,
                    insideCount: 0,
                    insideRatio: 0,
                    touchesRegionEdge: false
                };

                queue.length = 0;
                queue.push(start);
                visited[start] = 1;

                while (queue.length > 0) {
                    const current = queue.pop();
                    const cx = current % width;
                    const cy = Math.floor(current / width);

                    if (cx < minX || cy < minY || cx > maxX || cy > maxY) {
                        continue;
                    }

                    if (!isCandidateTextRole(roleMap[current]) || selectedMask[current]) {
                        continue;
                    }

                    const inside = isPixelInsideSelectedEnvelope(cx, cy, selectedMask, width, height, 18);

                    // 컴포넌트가 밖으로 새는 순간부터는 구분선/외곽일 가능성이 커진다.
                    // 그래도 전체 판단을 위해 픽셀은 모으되, insideRatio에서 걸러낸다.
                    component.pixels.push(current);
                    component.area += 1;
                    component.minX = Math.min(component.minX, cx);
                    component.minY = Math.min(component.minY, cy);
                    component.maxX = Math.max(component.maxX, cx);
                    component.maxY = Math.max(component.maxY, cy);
                    if (inside) component.insideCount += 1;
                    if (cx <= minX || cy <= minY || cx >= maxX || cy >= maxY) component.touchesRegionEdge = true;

                    pushCandidateNeighbor(cx + 1, cy, roleMap, selectedMask, visited, queue, width, height, minX, minY, maxX, maxY);
                    pushCandidateNeighbor(cx - 1, cy, roleMap, selectedMask, visited, queue, width, height, minX, minY, maxX, maxY);
                    pushCandidateNeighbor(cx, cy + 1, roleMap, selectedMask, visited, queue, width, height, minX, minY, maxX, maxY);
                    pushCandidateNeighbor(cx, cy - 1, roleMap, selectedMask, visited, queue, width, height, minX, minY, maxX, maxY);
                }

                component.width = component.maxX - component.minX + 1;
                component.height = component.maxY - component.minY + 1;
                component.insideRatio = component.insideCount / Math.max(1, component.area);

                // 문자/숫자 크기만 통과. 긴 구분선이나 외곽 흰줄은 여기서 대부분 제외된다.
                if (component.area > 0 && component.area <= 900 && component.insideRatio >= 0.72) {
                    components.push(component);
                }
            }
        }

        return components;
    }

    function isPixelInsideSelectedEnvelope(x, y, selectedMask, width, height, maxDistance) {
        // 내부 구멍 판정.
        // 같은 행 기준 좌/우에 선택 구역이 있고, 같은 열 기준 상/하에도 선택 구역이 있어야 한다.
        // 즉 '구역이 나를 감싸고 있다'는 확신이 있을 때만 내부 문자로 본다.
        const left = hasSelectedInDirection(x, y, -1, 0, selectedMask, width, height, maxDistance);
        const right = hasSelectedInDirection(x, y, 1, 0, selectedMask, width, height, maxDistance);
        const top = hasSelectedInDirection(x, y, 0, -1, selectedMask, width, height, maxDistance);
        const bottom = hasSelectedInDirection(x, y, 0, 1, selectedMask, width, height, maxDistance);

        if (left && right && top && bottom) {
            return true;
        }

        // 대각선/기울어진 좌석 내부 숫자는 상하좌우가 살짝 어긋날 수 있다.
        // 그래서 8방향 중 6방향 이상이 선택 구역을 만나면 내부로 인정한다.
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1],
            [-1, -1], [1, -1], [-1, 1], [1, 1]
        ];
        let hits = 0;

        for (const [dx, dy] of directions) {
            if (hasSelectedInDirection(x, y, dx, dy, selectedMask, width, height, maxDistance)) {
                hits += 1;
            }
        }

        return hits >= 6;
    }

    function hasSelectedInDirection(x, y, dx, dy, selectedMask, width, height, maxDistance) {
        let gap = 0;

        for (let distance = 1; distance <= maxDistance; distance += 1) {
            const nx = x + (dx * distance);
            const ny = y + (dy * distance);

            if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
                return false;
            }

            if (selectedMask[ny * width + nx]) {
                return true;
            }

            gap += 1;

            // 너무 멀리 떨어진 선택 픽셀은 같은 구역 내부로 보지 않는다.
            if (gap >= maxDistance) {
                return false;
            }
        }

        return false;
    }


    function pushCandidateNeighbor(x, y, roleMap, selectedMask, visited, queue, width, height, minX, minY, maxX, maxY) {
        if (x < minX || y < minY || x > maxX || y > maxY) {
            return;
        }

        const index = y * width + x;

        if (visited[index] || selectedMask[index] || !isCandidateTextRole(roleMap[index])) {
            return;
        }

        visited[index] = 1;
        queue.push(index);
    }

    function isCandidateTextRole(role) {
        return role === ROLE.WHITE
            || role === ROLE.OUTER_WHITE
            || role === ROLE.BLACK
            || role === ROLE.GRAY
            || role === ROLE.BACKGROUND
            || role === ROLE.UNKNOWN;
    }

    function scoreCandidateComponentForRegion(component, selectedMask, width, height) {
        let score = 0;
        const area = component.area;
        const longSide = Math.max(component.width, component.height);
        const shortSide = Math.max(1, Math.min(component.width, component.height));
        const aspect = longSide / shortSide;
        const boundary = countSelectedBoundary(component, selectedMask, width, height);
        const boundaryRatio = boundary.selected / Math.max(1, boundary.total);

        // 선택 구역 내부에 갇힌 비율이 가장 중요하다.
        // 이 비율이 낮으면 구역 사이 흰 선이나 외곽 여백일 가능성이 크다.
        if (component.insideRatio >= 0.95) score += 36;
        else if (component.insideRatio >= 0.85) score += 28;
        else if (component.insideRatio >= 0.72) score += 16;
        else score -= 50;

        // 숫자/글자 크기에 가까울수록 가산.
        if (area >= 2 && area <= 350) score += 24;
        else if (area <= 700) score += 12;
        else score -= 35;

        // 선택 구역 픽셀이 컴포넌트 주변과 실제로 맞닿아 있어야 한다.
        if (boundaryRatio >= 0.58) score += 24;
        else if (boundaryRatio >= 0.38) score += 12;

        if (boundary.directions >= 4) score += 18;
        else if (boundary.directions >= 3) score += 10;

        // 긴 선은 구분선일 확률이 높다.
        if (longSide >= 26 && aspect >= 4.2) score -= 40;
        if (longSide >= 42) score -= 28;

        // 선택 구역의 bbox 가장자리에 닿는 후보는 외곽/구분선일 수 있으므로 제외 쪽으로 민다.
        if (component.touchesRegionEdge) score -= 35;

        return score;
    }


    function countSelectedBoundary(component, selectedMask, width, height) {
        let selected = 0;
        let total = 0;
        let left = false;
        let right = false;
        let top = false;
        let bottom = false;

        for (const index of component.pixels) {
            const x = index % width;
            const y = Math.floor(index / width);
            const neighbors = [
                [x - 1, y, "left"],
                [x + 1, y, "right"],
                [x, y - 1, "top"],
                [x, y + 1, "bottom"],
                [x - 1, y - 1, "left"],
                [x + 1, y - 1, "right"],
                [x - 1, y + 1, "left"],
                [x + 1, y + 1, "right"]
            ];

            for (const [nx, ny, direction] of neighbors) {
                if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
                    continue;
                }

                total += 1;
                if (selectedMask[ny * width + nx]) {
                    selected += 1;
                    if (direction === "left") left = true;
                    if (direction === "right") right = true;
                    if (direction === "top") top = true;
                    if (direction === "bottom") bottom = true;
                }
            }
        }

        return {
            selected,
            total,
            directions: Number(left) + Number(right) + Number(top) + Number(bottom)
        };
    }

    function getDominantColorFromPixels(image, pixels) {
        const data = image.data;
        const buckets = new Map();
        let fallback = { r: 239, g: 94, b: 148 };

        for (const index of pixels) {
            const offset = index * 4;
            const r = data[offset];
            const g = data[offset + 1];
            const b = data[offset + 2];
            const role = classifyColorRole(r, g, b, data[offset + 3], getScanVariant("relaxed"));

            if (!isSeatRole(role)) {
                continue;
            }

            const key = `${Math.round(r / 12) * 12},${Math.round(g / 12) * 12},${Math.round(b / 12) * 12}`;
            const current = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
            current.count += 1;
            current.r += r;
            current.g += g;
            current.b += b;
            buckets.set(key, current);
            fallback = { r, g, b };
        }

        let best = null;
        for (const bucket of buckets.values()) {
            if (!best || bucket.count > best.count) {
                best = bucket;
            }
        }

        if (!best) {
            return fallback;
        }

        return {
            r: clamp255(Math.round(best.r / best.count)),
            g: clamp255(Math.round(best.g / best.count)),
            b: clamp255(Math.round(best.b / best.count))
        };
    }


    function updateStraightenStrength() {
        const input = $("straightenStrength");
        const value = input ? Number(input.value) : SETTINGS.straightenDefaultStrength;

        state.straighten.strength = clamp(value || SETTINGS.straightenDefaultStrength, 1, 12);
        setText("straightenStrengthText", String(state.straighten.strength));
    }

    function straightenSeatRegions(selectedOnly) {
        if (!canvas.width || !canvas.height) {
            toast("먼저 원본 이미지를 불러오세요.");
            return;
        }

        if (selectedOnly && state.region.selected.length === 0) {
            toast("먼저 파트 2에서 반듯하게 만들 구역을 클릭 선택하세요.");
            return;
        }

        updateStraightenStrength();

        const width = canvas.width;
        const height = canvas.height;
        const image = ctx.getImageData(0, 0, width, height);
        const roleMap = buildCurrentCanvasRoleMap(image, width, height);
        const components = selectedOnly
            ? state.region.selected.map((region) => normalizeRegionForStraighten(region, width, height, roleMap))
            : extractComponents(roleMap, width, height, (role) => isSeatRole(role));

        let changedRegions = 0;
        let changedPixels = 0;
        let skipped = 0;

        for (const component of components) {
            if (!component || component.area < SETTINGS.straightenMinArea) {
                skipped += 1;
                continue;
            }

            const polygon = createStraightPolygonFromComponent(component, width, height, state.straighten.strength);

            if (!polygon || polygon.length < 3) {
                skipped += 1;
                continue;
            }

            const polygonArea = Math.max(1, Math.abs(getPolygonArea(polygon)));
            const areaRatio = polygonArea / Math.max(1, component.area);

            // 너무 넓게 부풀어 오르는 구역은 자동 전체 보정에서 위험하다.
            // 선택 구역 보정에서는 사용자가 의도적으로 고른 것이므로 조금 더 허용한다.
            if (!selectedOnly && areaRatio > SETTINGS.straightenMaxAreaRatio) {
                skipped += 1;
                continue;
            }

            const fillColor = getDominantColorFromPixels(image, component.pixels);
            const eraseColor = getDominantBoundaryNonSeatColor(image, roleMap, component, width, height);

            eraseComponentPixels(image.data, component, eraseColor);
            const filled = fillPolygonIntoImageData(image.data, width, height, polygon, fillColor);

            changedRegions += 1;
            changedPixels += component.area + filled;
        }

        if (changedRegions === 0) {
            toast(selectedOnly ? "선택 구역에서 반듯하게 만들 대상을 찾지 못했습니다." : "반듯하게 만들 좌석 구역을 찾지 못했습니다.");
            return;
        }

        ctx.putImageData(image, 0, 0);
        syncResultFromVisible();
        state.hasResult = true;
        state.saved = false;
        state.resultBaseDataUrl = canvas.toDataURL("image/png");
        pushHistory(selectedOnly ? "선택 구역 반듯하게" : "전체 구역 반듯하게");
        drawSelectedRegionsOverlay();
        updateStats();

        const scope = selectedOnly ? "선택 구역" : "전체 구역";
        const skipText = skipped > 0 ? ` / 건너뜀 ${skipped}개` : "";
        toast(`${scope} 반듯하게 완료: ${changedRegions}개 / ${changedPixels}픽셀${skipText}`);
    }

    function normalizeRegionForStraighten(region, width, height, roleMap) {
        if (!region || !Array.isArray(region.pixels) || region.pixels.length === 0) {
            return null;
        }

        const bounds = region.bounds || createBoundsFromPixels(region.pixels, width, height);
        const role = region.role || getDominantRoleFromPixels(region.pixels, roleMap);

        return {
            pixels: region.pixels,
            area: region.pixels.length,
            minX: bounds.minX,
            minY: bounds.minY,
            maxX: bounds.maxX,
            maxY: bounds.maxY,
            width: bounds.maxX - bounds.minX + 1,
            height: bounds.maxY - bounds.minY + 1,
            touchesBorder: bounds.minX <= 0 || bounds.minY <= 0 || bounds.maxX >= width - 1 || bounds.maxY >= height - 1,
            role
        };
    }

    function createBoundsFromPixels(pixels, width, height) {
        const bounds = {
            minX: Infinity,
            minY: Infinity,
            maxX: -Infinity,
            maxY: -Infinity
        };

        for (const index of pixels) {
            const x = index % width;
            const y = Math.floor(index / width);
            bounds.minX = Math.min(bounds.minX, x);
            bounds.minY = Math.min(bounds.minY, y);
            bounds.maxX = Math.max(bounds.maxX, x);
            bounds.maxY = Math.max(bounds.maxY, y);
        }

        if (!Number.isFinite(bounds.minX)) {
            bounds.minX = 0;
            bounds.minY = 0;
            bounds.maxX = 0;
            bounds.maxY = 0;
        }

        return bounds;
    }

    function getDominantRoleFromPixels(pixels, roleMap) {
        const counts = new Map();

        for (const index of pixels) {
            const role = roleMap[index];
            if (!isSeatRole(role)) {
                continue;
            }
            counts.set(role, (counts.get(role) || 0) + 1);
        }

        let bestRole = ROLE.SEAT_PINK;
        let bestCount = -1;

        counts.forEach((count, role) => {
            if (count > bestCount) {
                bestRole = role;
                bestCount = count;
            }
        });

        return bestRole;
    }

    function createStraightPolygonFromComponent(component, width, height, strength) {
        const scan = createRowExtentScan(component, width, height);

        if (scan.rows.length < 2) {
            return createFallbackRectanglePolygon(component);
        }

        const smoothWindow = clamp(Math.floor(strength / 2), 1, 6);
        const smoothedRows = smoothRowExtents(scan.rows, smoothWindow);
        const leftLine = [];
        const rightLine = [];

        for (const row of smoothedRows) {
            leftLine.push({ x: row.minX, y: row.y });
            rightLine.push({ x: row.maxX + 1, y: row.y });
        }

        const epsilon = Math.max(0.8, strength * 0.65);
        const left = simplifyPolyline(leftLine, epsilon);
        const right = simplifyPolyline(rightLine, epsilon);

        let polygon = left.concat(right.slice().reverse());
        polygon = removeDuplicatePolygonPoints(polygon);
        polygon = snapAlmostAxisAlignedEdges(polygon, Math.max(1.2, strength * 0.28));
        polygon = removeDuplicatePolygonPoints(polygon);

        if (polygon.length < 3) {
            return createFallbackRectanglePolygon(component);
        }

        return polygon;
    }

    function createRowExtentScan(component, width, height) {
        const rowCount = component.maxY - component.minY + 1;
        const minByRow = new Int32Array(rowCount);
        const maxByRow = new Int32Array(rowCount);
        const rows = [];

        minByRow.fill(2147483647);
        maxByRow.fill(-2147483648);

        for (const index of component.pixels) {
            const x = index % width;
            const y = Math.floor(index / width);
            const row = y - component.minY;

            if (x < minByRow[row]) minByRow[row] = x;
            if (x > maxByRow[row]) maxByRow[row] = x;
        }

        for (let i = 0; i < rowCount; i += 1) {
            if (maxByRow[i] < minByRow[i]) {
                continue;
            }

            rows.push({
                y: component.minY + i,
                minX: minByRow[i],
                maxX: maxByRow[i],
                width: maxByRow[i] - minByRow[i] + 1
            });
        }

        return { rows };
    }

    function smoothRowExtents(rows, windowSize) {
        if (rows.length <= 2 || windowSize <= 1) {
            return rows.map((row) => ({ ...row }));
        }

        return rows.map((row, index) => {
            const start = Math.max(0, index - windowSize);
            const end = Math.min(rows.length - 1, index + windowSize);
            const minValues = [];
            const maxValues = [];

            for (let i = start; i <= end; i += 1) {
                minValues.push(rows[i].minX);
                maxValues.push(rows[i].maxX);
            }

            return {
                y: row.y,
                minX: medianNumber(minValues),
                maxX: medianNumber(maxValues),
                width: row.width
            };
        });
    }

    function simplifyPolyline(points, epsilon) {
        if (points.length <= 2) {
            return points.slice();
        }

        let maxDistance = 0;
        let index = 0;
        const first = points[0];
        const last = points[points.length - 1];

        for (let i = 1; i < points.length - 1; i += 1) {
            const distance = pointLineDistance(points[i], first, last);
            if (distance > maxDistance) {
                maxDistance = distance;
                index = i;
            }
        }

        if (maxDistance > epsilon) {
            const left = simplifyPolyline(points.slice(0, index + 1), epsilon);
            const right = simplifyPolyline(points.slice(index), epsilon);
            return left.slice(0, -1).concat(right);
        }

        return [first, last];
    }

    function pointLineDistance(point, a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;

        if (dx === 0 && dy === 0) {
            return Math.hypot(point.x - a.x, point.y - a.y);
        }

        return Math.abs((dy * point.x) - (dx * point.y) + (b.x * a.y) - (b.y * a.x)) / Math.hypot(dx, dy);
    }

    function snapAlmostAxisAlignedEdges(polygon, tolerance) {
        const result = polygon.map((point) => ({ x: point.x, y: point.y }));

        // 거의 수평/수직인 선만 정렬한다.
        // 대각선은 강제로 꺾지 않고 그대로 둬야 사다리꼴/부채꼴 구역이 망가지지 않는다.
        for (let i = 0; i < result.length; i += 1) {
            const nextIndex = (i + 1) % result.length;
            const a = result[i];
            const b = result[nextIndex];
            const dx = Math.abs(a.x - b.x);
            const dy = Math.abs(a.y - b.y);

            if (dy <= tolerance && dx >= tolerance * 2) {
                const y = Math.round((a.y + b.y) / 2);
                a.y = y;
                b.y = y;
            } else if (dx <= tolerance && dy >= tolerance * 2) {
                const x = Math.round((a.x + b.x) / 2);
                a.x = x;
                b.x = x;
            }
        }

        return result;
    }

    function removeDuplicatePolygonPoints(polygon) {
        const result = [];

        for (const point of polygon) {
            const rounded = { x: Math.round(point.x), y: Math.round(point.y) };
            const previous = result[result.length - 1];

            if (previous && previous.x === rounded.x && previous.y === rounded.y) {
                continue;
            }

            result.push(rounded);
        }

        if (result.length > 1) {
            const first = result[0];
            const last = result[result.length - 1];
            if (first.x === last.x && first.y === last.y) {
                result.pop();
            }
        }

        return result;
    }

    function createFallbackRectanglePolygon(component) {
        return [
            { x: component.minX, y: component.minY },
            { x: component.maxX + 1, y: component.minY },
            { x: component.maxX + 1, y: component.maxY + 1 },
            { x: component.minX, y: component.maxY + 1 }
        ];
    }

    function getDominantBoundaryNonSeatColor(image, roleMap, component, width, height) {
        const data = image.data;
        const buckets = new Map();
        const fallback = SETTINGS.straightenFallbackLineColor;
        const pixelSet = component.pixelSet || new Set(component.pixels);

        for (const index of component.pixels) {
            const x = index % width;
            const y = Math.floor(index / width);
            const neighbors = [
                [x + 1, y],
                [x - 1, y],
                [x, y + 1],
                [x, y - 1]
            ];

            for (const [nx, ny] of neighbors) {
                if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
                    continue;
                }

                const nIndex = ny * width + nx;
                if (pixelSet.has(nIndex) || isSeatRole(roleMap[nIndex]) || roleMap[nIndex] === ROLE.BLACK) {
                    continue;
                }

                const offset = nIndex * 4;
                const r = data[offset];
                const g = data[offset + 1];
                const b = data[offset + 2];
                const key = `${Math.round(r / 16) * 16},${Math.round(g / 16) * 16},${Math.round(b / 16) * 16}`;
                const current = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };

                current.count += 1;
                current.r += r;
                current.g += g;
                current.b += b;
                buckets.set(key, current);
            }
        }

        let best = null;
        for (const bucket of buckets.values()) {
            if (!best || bucket.count > best.count) {
                best = bucket;
            }
        }

        if (!best || best.count < 3) {
            return fallback;
        }

        return {
            r: clamp255(Math.round(best.r / best.count)),
            g: clamp255(Math.round(best.g / best.count)),
            b: clamp255(Math.round(best.b / best.count))
        };
    }

    function eraseComponentPixels(data, component, color) {
        for (const index of component.pixels) {
            const offset = index * 4;
            data[offset] = color.r;
            data[offset + 1] = color.g;
            data[offset + 2] = color.b;
            data[offset + 3] = 255;
        }
    }

    function fillPolygonIntoImageData(data, width, height, polygon, color) {
        if (!polygon || polygon.length < 3) {
            return 0;
        }

        let minY = Infinity;
        let maxY = -Infinity;
        let changed = 0;

        for (const point of polygon) {
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
        }

        minY = clamp(Math.floor(minY), 0, height - 1);
        maxY = clamp(Math.ceil(maxY), 0, height - 1);

        for (let y = minY; y <= maxY; y += 1) {
            const scanY = y + 0.5;
            const intersections = [];

            for (let i = 0; i < polygon.length; i += 1) {
                const a = polygon[i];
                const b = polygon[(i + 1) % polygon.length];

                if (a.y === b.y) {
                    continue;
                }

                const minEdgeY = Math.min(a.y, b.y);
                const maxEdgeY = Math.max(a.y, b.y);

                if (scanY < minEdgeY || scanY >= maxEdgeY) {
                    continue;
                }

                const t = (scanY - a.y) / (b.y - a.y);
                intersections.push(a.x + (t * (b.x - a.x)));
            }

            if (intersections.length < 2) {
                continue;
            }

            intersections.sort((a, b) => a - b);

            for (let i = 0; i < intersections.length - 1; i += 2) {
                const startX = clamp(Math.ceil(intersections[i]), 0, width - 1);
                const endX = clamp(Math.floor(intersections[i + 1]), 0, width - 1);

                for (let x = startX; x <= endX; x += 1) {
                    const offset = ((y * width) + x) * 4;
                    data[offset] = color.r;
                    data[offset + 1] = color.g;
                    data[offset + 2] = color.b;
                    data[offset + 3] = 255;
                    changed += 1;
                }
            }
        }

        return changed;
    }

    function getPolygonArea(polygon) {
        let area = 0;

        for (let i = 0; i < polygon.length; i += 1) {
            const a = polygon[i];
            const b = polygon[(i + 1) % polygon.length];
            area += (a.x * b.y) - (b.x * a.y);
        }

        return area / 2;
    }

    function medianNumber(values) {
        const sorted = values.slice().sort((a, b) => a - b);
        return sorted[Math.floor(sorted.length / 2)] || 0;
    }

    function finishRegionEdit(label) {
        syncResultFromVisible();
        state.hasResult = true;
        state.saved = false;
        state.resultBaseDataUrl = canvas.toDataURL("image/png");
        pushHistory(label);
        drawSelectedRegionsOverlay();
        updateStats();
        toast(label);
    }

    function clearOverlay() {
        if (!overlayCtx || !overlay) {
            return;
        }

        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
    }

    function setText(id, text) {
        const element = $(id);
        if (element) {
            element.textContent = text;
        }
    }

    function onCanvasMove(event) {
        if (!state.imageReady || !sourceCanvas.width || !sourceCanvas.height) {
            return;
        }

        const point = getCanvasPoint(event);
        if (!point) {
            hideLoupe();
            return;
        }

        updateBrushCursor(point);

        if (state.brush.down && state.brush.mode !== "none") {
            event.preventDefault();
            paintBrushAt(point);
            return;
        }

        updateLoupe(point, event);
    }

    function updateLoupe(point, event) {
        const loupe = $("colorLoupe");
        if (!loupe) {
            return;
        }

        const x = clamp(Math.round(point.x), 0, canvas.width - 1);
        const y = clamp(Math.round(point.y), 0, canvas.height - 1);
        const data = ctx.getImageData(x, y, 1, 1).data;
        const hex = rgbToHex(data[0], data[1], data[2]);

        const chip = $("loupeChip");
        if (chip) {
            chip.style.background = hex;
        }

        setText("loupeHex", hex);
        setText("loupePoint", `X ${x}, Y ${y}`);

        loupe.classList.add("is-show");

        const rect = box ? box.getBoundingClientRect() : canvas.getBoundingClientRect();
        const left = event.clientX - rect.left + 18;
        const top = event.clientY - rect.top + 18;
        loupe.style.transform = `translate(${left}px, ${top}px)`;
    }

    function hideLoupe() {
        const loupe = $("colorLoupe");
        if (!loupe) {
            return;
        }

        loupe.classList.remove("is-show");
        loupe.style.transform = "translate(-9999px, -9999px)";

        if (brushCursor) {
            brushCursor.style.display = "none";
        }
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

    function resizeVisibleCanvas(width, height) {
        canvas.width = width;
        canvas.height = height;

        if (overlay) {
            overlay.width = width;
            overlay.height = height;
        }

        resultCanvas.width = width;
        resultCanvas.height = height;
        syncCanvasDisplay();
    }

    function syncCanvasDisplay() {
        const displayWidth = canvas.width * state.zoom;
        const displayHeight = canvas.height * state.zoom;

        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;

        if (overlay) {
            overlay.style.width = `${displayWidth}px`;
            overlay.style.height = `${displayHeight}px`;
        }

        if (box) {
            box.style.width = `${displayWidth}px`;
            box.style.height = `${displayHeight}px`;
        }

        setText("zoomValue", `${Math.round(state.zoom * 100)}%`);

        if (brushCursor) {
            brushCursor.style.display = "none";
        }
    }

    function setZoom(nextZoom) {
        state.zoom = Math.min(4, Math.max(0.25, Number(nextZoom.toFixed(2))));
        syncCanvasDisplay();
    }

    function syncResultFromVisible() {
        resultCanvas.width = canvas.width;
        resultCanvas.height = canvas.height;
        resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
        resultCtx.drawImage(canvas, 0, 0);
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

    function loadGroupsSafe() {
        const savedGroups = localStorage.getItem(STORAGE.groups);

        if (!savedGroups) {
            return clone(DEFAULT_GROUPS);
        }

        try {
            const parsed = JSON.parse(savedGroups);
            return DEFAULT_GROUPS.map((base) => {
                const saved = parsed.find((item) => item.id === base.id);
                return {
                    ...base,
                    name: saved?.name || base.name,
                    gradeName: saved?.gradeName || base.gradeName || getDefaultGradeName(base.role),
                    output: saved?.output && isSafeSeatOutput(saved.output, base.role) ? saved.output : base.output,
                    samples: []
                };
            });
        } catch (error) {
            return clone(DEFAULT_GROUPS);
        }
    }

    function isSafeSeatOutput(hex, role) {
        if (!hex || !hex.startsWith("#")) {
            return false;
        }

        if (!isSeatRole(role)) {
            return true;
        }

        const rgb = hexToRgb(hex);
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

        return hsl.s >= 0.20 && hsl.l <= 0.88;
    }

    function getDefaultRoleColor(role) {
        const fixed = FIXED_PALETTE.get(role);
        if (fixed) {
            return fixed;
        }

        const group = state.groups.find((item) => item.role === role);
        if (group) {
            return hexToRgb(group.output);
        }

        return { r: 247, g: 247, b: 247 };
    }

    function isSeatRole(role) {
        return role >= ROLE.SEAT_PINK && role <= ROLE.SEAT_RED;
    }

    function getRoleName(role) {
        return ROLE_NAME.get(role) || "알 수 없음";
    }

    function rgbToHsl(r, g, b) {
        const rn = r / 255;
        const gn = g / 255;
        const bn = b / 255;
        const max = Math.max(rn, gn, bn);
        const min = Math.min(rn, gn, bn);
        const delta = max - min;
        let h = 0;
        let s = 0;
        const l = (max + min) / 2;

        if (delta !== 0) {
            s = delta / (1 - Math.abs((2 * l) - 1));

            if (max === rn) {
                h = 60 * (((gn - bn) / delta) % 6);
            } else if (max === gn) {
                h = 60 * (((bn - rn) / delta) + 2);
            } else {
                h = 60 * (((rn - gn) / delta) + 4);
            }
        }

        if (h < 0) {
            h += 360;
        }

        return { h, s, l };
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

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function clamp255(value) {
        return clamp(value, 0, 255);
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function createImageDataSafe(width, height) {
        if (typeof ImageData !== "undefined") {
            return new ImageData(width, height);
        }

        return resultCtx.createImageData(width, height);
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

        if (!toastElement) {
            console.log(message);
            return;
        }

        toastElement.textContent = message;
        toastElement.classList.add("show");

        clearTimeout(window.__seatButtonImageToastTimer);
        window.__seatButtonImageToastTimer = setTimeout(() => {
            toastElement.classList.remove("show");
        }, 2600);
    }


    // ============================================================================
    // v17 patch: 버튼 이미지화 흐름 재정리
    // - 파트 1 = 단색화 및 내부 글자 제거
    // - 파트 2 = 구역 미리보기 / 누락 브러쉬 보정
    // - 파트 3 = 현재 보정 이미지 기준 최종 구역 병합 / 간격 정리
    // - 파트 4 = 저장 및 나가기
    // - 파트 이동 시 자동 변환을 다시 실행하지 않는다.
    // ============================================================================

    document.addEventListener("DOMContentLoaded", () => {
        window.setTimeout(() => {
            ensureFinalMergeToolsV17();
            bindFinalMergeToolsV17();
        }, 0);
    });

    function bindEvents() {
        bindClick("generateButtonImage", () => runAutoConversion(false, { nextStep: 2 }));
        bindClick("applyToConcert", () => runAutoConversion(true));
        bindClick("saveButtonImage", saveButtonImageLocal);
        bindClick("restoreSource", restoreSourceImage);
        bindClick("restoreResultBase", restoreResultBase);
        bindClick("clearAllSamples", resetAutoState);
        bindClick("clearSelectedSamples", resetAutoState);
        bindClick("cleanupPieces", () => runAutoConversion(false));

        // 중요: 파트 이동에서 runAutoConversion을 다시 실행하지 않는다.
        // 전체 정리/브러쉬 보정 결과가 다음 파트로 넘어갈 때 되돌아가던 원인 차단.
        bindClick("go2", () => setStep(2));
        bindClick("go3", () => setStep(3));
        bindClick("go4", () => setStep(4));
        bindClick("tab1", () => setStep(1));
        bindClick("tab2", () => setStep(2));
        bindClick("tab3", () => setStep(3));
        bindClick("tab4", () => setStep(4));

        bindClick("backToBrush", () => setStep(2));
        bindClick("previewSaveRegions", showFinalSavePreview);
        bindClick("pickColorFromCanvas", toggleColorPickerMode);

        bindCanvasWheelZoom();
        showUndoRedoButtonsV21();
        bindClick("undoAction", undo);
        bindClick("redoAction", redo);
        bindZoomButton("zoomIn", 1);
        bindZoomButton("zoomOut", -1);
        bindClick("zoomReset", () => setZoom(1));
        bindClick("serverSaveButtonImage", saveButtonImageToServer);
        bindClick("saveAndExitButton", saveAndExit);

        // 구역 보정 / 내부 글자 제거
        bindClick("regionSelectStart", toggleRegionSelectTool);
        bindClick("regionClear", clearSelectedRegions);
        bindClick("regionRemoveText", removeTextInsideSelectedRegions);
        bindClick("regionDominantFill", fillSelectedRegionsWithDominantColor);
        bindClick("regionApplyColor", applySelectedRegionColor);
        bindClick("regionCleanFill", cleanAndFillSelectedRegions);
        bindClick("regionCleanAll", cleanAllCurrentSeatRegions);
        bindInput("regionColorInput", updateRegionColorFromInput);
        bindInput("regionGradeInput", updateRegionGradeFromInput);

        // 브러쉬 보정
        bindClick("straightenAllRegions", () => straightenSeatRegions(false));
        bindClick("straightenSelectedRegions", () => straightenSeatRegions(true));
        bindInput("straightenStrength", updateStraightenStrength);
        bindClick("brushTool", () => setBrushMode(state.brush.mode === "paint" ? "none" : "paint"));
        bindClick("eraseTool", () => setBrushMode(state.brush.mode === "erase" ? "none" : "erase"));
        bindInput("brushSize", updateBrushSize);

        document.querySelectorAll("[data-region-palette]").forEach((button) => {
            button.addEventListener("click", () => handlePaletteButtonClick(button));
        });

        if (overlay) {
            overlay.addEventListener("mousedown", onCanvasDown);
            overlay.addEventListener("mousemove", onCanvasMove);
            overlay.addEventListener("mouseup", onCanvasUp);
            overlay.addEventListener("click", onCanvasClick);
            overlay.addEventListener("mouseleave", onCanvasLeave);
        }
    }

    function setStep(step) {
        const nextStep = Number(step) || 1;
        state.currentStep = nextStep;

        if (nextStep > 1 && !state.hasResult) {
            state.currentStep = 1;
            toast("먼저 파트 1에서 단색화 이미지를 생성하세요.");
            return;
        }

        if (nextStep !== 3) {
            state.finalPreview.enabled = false;
            if (state.finalPreview) {
                state.finalPreview.dragging = false;
                state.finalPreview.dragRect = null;
            }
        }

        document.querySelectorAll(".button-image-step").forEach((section) => {
            const itemStep = Number(section.dataset.step);
            const header = section.querySelector(".button-image-step__header");
            const status = section.querySelector(".button-image-step__status");

            section.classList.toggle("is-active", itemStep === nextStep);
            section.classList.toggle("is-done", itemStep < nextStep);

            if (header) {
                header.classList.toggle("active", itemStep === nextStep);
            }

            if (status) {
                if (itemStep < nextStep) {
                    status.textContent = "완료";
                } else if (itemStep === nextStep) {
                    status.textContent = nextStep === 1 ? "진행중" : nextStep === 2 ? "보정중" : nextStep === 3 ? "병합중" : "저장";
                } else {
                    status.textContent = "대기";
                }
            }
        });

        if (nextStep === 1) {
            enableRegionSelectTool(false);
            setBrushMode("none", { silent: true });
            setColorPickerMode(false, { silent: true });
            clearOverlay();
        } else if (nextStep === 2) {
            // 파트2는 현재 결과 이미지 위에서 누락 구역/찌꺼기를 브러쉬로 보정한다.
            // 자동 변환을 다시 돌리지 않고 현재 canvas 그대로 사용한다.
            enableRegionSelectTool(true);
            updateBrushSize();
            setColorPickerMode(false, { silent: true });
            if (state.brush.mode === "none") {
                setBrushMode("paint", { silent: true });
            }
            drawLiveRegionPreviewV17();
        } else if (nextStep === 3) {
            // 파트3은 파트2 브러쉬 보정이 끝난 현재 canvas를 기준으로 구역 병합을 한다.
            enableRegionSelectTool(false);
            setBrushMode("none", { silent: true });
            setColorPickerMode(false, { silent: true });
            showFinalSavePreview();
        } else if (nextStep === 4) {
            enableRegionSelectTool(false);
            setBrushMode("none", { silent: true });
            setColorPickerMode(false, { silent: true });
            state.finalPreview.enabled = false;
            clearOverlay();
        }
    }

    function finishBrushStroke() {
        if (!state.brush.down) {
            return;
        }

        state.brush.down = false;

        if (!state.brush.changed) {
            return;
        }

        syncResultFromVisible();
        state.hasResult = true;
        state.saved = false;
        state.resultBaseDataUrl = canvas.toDataURL("image/png");
        pushHistory(state.brush.mode === "erase" ? "지우개 보정" : "브러쉬 보정");
        updateStats();

        if (document.querySelector("#part2.button-image-step.is-active")) {
            drawLiveRegionPreviewV17();
        }

        toast(state.brush.mode === "erase" ? "지우개 보정을 적용했습니다." : "브러쉬 보정을 적용했습니다.");
    }

    function drawLiveRegionPreviewV17() {
        if (!overlayCtx || !canvas.width || !canvas.height) {
            return;
        }

        clearOverlay();

        if (!state.hasResult) {
            return;
        }

        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const roleMap = buildCurrentCanvasRoleMap(image, canvas.width, canvas.height);
        const minArea = Math.max(16, SETTINGS.componentRepresentativeMinArea || 10);
        const components = extractAnySeatComponentsV17(roleMap, canvas.width, canvas.height)
            .filter((component) => component.area >= minArea);

        overlayCtx.save();
        overlayCtx.strokeStyle = "rgba(15, 23, 42, 0.60)";
        overlayCtx.lineWidth = Math.max(1, 1.2 / Math.max(1, state.zoom));

        components.forEach((component) => {
            const region = {
                pixels: component.pixels,
                pixelSet: new Set(component.pixels),
                bounds: {
                    x: component.minX,
                    y: component.minY,
                    w: component.maxX - component.minX + 1,
                    h: component.maxY - component.minY + 1
                }
            };
            drawFinalRegionBoundaryV17(region, "rgba(15, 23, 42, 0.58)", 1.2);
        });

        overlayCtx.restore();
    }

    function ensureFinalMergeToolsV17() {
        const part3 = document.querySelector("#part3 .button-image-box") || document.querySelector("#part3 .button-image-step__body") || document.querySelector("#part3");

        if (!part3 || document.getElementById("finalMergeSelectedRegions")) {
            return;
        }

        const panel = document.createElement("div");
        panel.className = "button-image-final-merge-tools";
        panel.style.cssText = "display:flex;flex-direction:column;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid #e5e7eb;";
        panel.innerHTML = `
            <div class="button-image-guide" style="margin:0;">
                현재 보정된 이미지를 기준으로 저장 구역을 실선으로 표시합니다. 드래그는 여러 구역 병합, Shift+클릭은 선택 구역과 클릭 구역 병합입니다.
            </div>
            <button type="button" class="btn btn--primary" id="finalMergeSelectedRegions">선택 구역 병합</button>
            <button type="button" class="btn" id="finalClearSelection">선택 해제</button>
            <div class="button-image-selected" id="finalSelectionText">선택 구역: 없음</div>
        `;

        const nextButton = document.getElementById("go4");
        if (nextButton && nextButton.parentNode === part3) {
            part3.insertBefore(panel, nextButton);
        } else {
            part3.appendChild(panel);
        }
    }

    function bindFinalMergeToolsV17() {
        const mergeButton = document.getElementById("finalMergeSelectedRegions");
        const clearButton = document.getElementById("finalClearSelection");

        if (mergeButton && !mergeButton.dataset.boundFinalMergeV17) {
            mergeButton.dataset.boundFinalMergeV17 = "true";
            mergeButton.addEventListener("click", (event) => {
                event.preventDefault();
                mergeSelectedFinalRegionsV17();
            });
        }

        if (clearButton && !clearButton.dataset.boundFinalMergeV17) {
            clearButton.dataset.boundFinalMergeV17 = "true";
            clearButton.addEventListener("click", (event) => {
                event.preventDefault();
                clearFinalRegionSelectionV17();
            });
        }

        updateFinalMergeToolUIV17();
    }

    function showFinalSavePreview() {
        if (!state.hasResult) {
            toast("먼저 파트 1에서 단색화 이미지를 생성하세요.");
            return;
        }

        ensureFinalMergeToolsV17();
        bindFinalMergeToolsV17();

        state.finalPreview.enabled = true;
        state.finalPreview.selectedIds = [];
        state.finalPreview.dragging = false;
        state.finalPreview.dragStart = null;
        state.finalPreview.dragRect = null;
        state.finalPreview.suppressClick = false;

        setBrushMode("none", { silent: true });
        setColorPickerMode(false, { silent: true });

        rebuildFinalPreviewRegionsV17();
        drawFinalPreviewOverlayV17();
        updateFinalMergeToolUIV17();
        toast(`저장될 구역 ${state.finalPreview.componentCount || 0}개를 실선으로 표시했습니다.`);
    }

    function drawFinalSaveOutline() {
        rebuildFinalPreviewRegionsV17();
        drawFinalPreviewOverlayV17();
        updateFinalMergeToolUIV17();
    }

    function rebuildFinalPreviewRegionsV17() {
        if (!canvas.width || !canvas.height) {
            state.finalPreview.regions = [];
            state.finalPreview.componentCount = 0;
            return;
        }

        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const roleMap = buildCurrentCanvasRoleMap(image, canvas.width, canvas.height);
        const minArea = Math.max(16, SETTINGS.componentRepresentativeMinArea || 10);
        const components = extractAnySeatComponentsV17(roleMap, canvas.width, canvas.height)
            .filter((component) => component.area >= minArea)
            .sort((a, b) => Math.abs(a.minY - b.minY) > 12 ? a.minY - b.minY : a.minX - b.minX);

        state.finalPreview.regions = components.map((component, index) => {
            const color = getDominantColorFromPixels(image, component.pixels);
            const role = getDominantFinalRoleFromPixelsV17(roleMap, component.pixels);

            return {
                id: `final-${index + 1}`,
                role,
                color,
                colorHex: rgbToHex(color.r, color.g, color.b),
                pixels: component.pixels,
                pixelSet: new Set(component.pixels),
                area: component.area,
                bounds: {
                    x: component.minX,
                    y: component.minY,
                    w: component.maxX - component.minX + 1,
                    h: component.maxY - component.minY + 1
                }
            };
        });

        const liveIds = new Set(state.finalPreview.regions.map((region) => region.id));
        state.finalPreview.selectedIds = (state.finalPreview.selectedIds || []).filter((id) => liveIds.has(id));
        state.finalPreview.componentCount = state.finalPreview.regions.length;
    }

    function drawFinalPreviewOverlayV17() {
        clearOverlay();

        if (!overlayCtx || !overlay) {
            return;
        }

        const selected = new Set(state.finalPreview.selectedIds || []);
        overlayCtx.save();

        for (const region of state.finalPreview.regions || []) {
            const isSelected = selected.has(region.id);
            drawFinalRegionBoundaryV17(
                region,
                isSelected ? "rgba(124, 58, 237, 0.98)" : "rgba(15, 23, 42, 0.88)",
                isSelected ? 2.6 : 1.4
            );

            if (isSelected) {
                overlayCtx.fillStyle = "rgba(124, 58, 237, 0.10)";
                overlayCtx.fillRect(region.bounds.x, region.bounds.y, region.bounds.w, region.bounds.h);
            }
        }

        if (state.finalPreview.dragRect) {
            const rect = state.finalPreview.dragRect;
            overlayCtx.save();
            overlayCtx.strokeStyle = "rgba(37, 99, 235, 0.95)";
            overlayCtx.fillStyle = "rgba(37, 99, 235, 0.08)";
            overlayCtx.lineWidth = 2;
            overlayCtx.setLineDash([7, 5]);
            overlayCtx.fillRect(rect.x, rect.y, rect.w, rect.h);
            overlayCtx.strokeRect(rect.x, rect.y, rect.w, rect.h);
            overlayCtx.restore();
        }

        overlayCtx.restore();
    }

    function drawFinalRegionBoundaryV17(region, strokeStyle, lineWidth) {
        const width = canvas.width;
        const height = canvas.height;
        const pixelSet = region.pixelSet || new Set(region.pixels || []);

        overlayCtx.save();
        overlayCtx.beginPath();
        overlayCtx.strokeStyle = strokeStyle;
        overlayCtx.lineWidth = Math.max(1, lineWidth / Math.max(1, state.zoom));

        for (const index of region.pixels || []) {
            const x = index % width;
            const y = Math.floor(index / width);

            if (x <= 0 || !pixelSet.has(index - 1)) {
                overlayCtx.moveTo(x, y);
                overlayCtx.lineTo(x, y + 1);
            }

            if (x >= width - 1 || !pixelSet.has(index + 1)) {
                overlayCtx.moveTo(x + 1, y);
                overlayCtx.lineTo(x + 1, y + 1);
            }

            if (y <= 0 || !pixelSet.has(index - width)) {
                overlayCtx.moveTo(x, y);
                overlayCtx.lineTo(x + 1, y);
            }

            if (y >= height - 1 || !pixelSet.has(index + width)) {
                overlayCtx.moveTo(x, y + 1);
                overlayCtx.lineTo(x + 1, y + 1);
            }
        }

        overlayCtx.stroke();
        overlayCtx.restore();
    }

    function onCanvasDown(event) {
        const point = getCanvasPoint(event);

        if (state.finalPreview.enabled && state.brush.mode === "none" && !state.brush.pickColor && point) {
            event.preventDefault();
            state.finalPreview.dragging = true;
            state.finalPreview.dragStart = point;
            state.finalPreview.dragRect = null;
            state.finalPreview.suppressClick = false;
            return;
        }

        if (state.brush.pickColor) {
            event.preventDefault();
            return;
        }

        if (state.brush.mode !== "none") {
            if (!point) {
                return;
            }

            event.preventDefault();
            state.brush.down = true;
            state.brush.changed = false;
            paintBrushAt(point);
            return;
        }
    }

    function onCanvasMove(event) {
        if (!state.imageReady || !sourceCanvas.width || !sourceCanvas.height) {
            return;
        }

        const point = getCanvasPoint(event);
        if (!point) {
            hideLoupe();
            return;
        }

        if (state.finalPreview.dragging && state.finalPreview.dragStart) {
            event.preventDefault();
            state.finalPreview.dragRect = normalizeCanvasRectV17(state.finalPreview.dragStart, point);
            drawFinalPreviewOverlayV17();
            return;
        }

        if (state.brush.pickColor) {
            updateLoupe(point, event);
            updateBrushCursor(point);
            return;
        }

        updateBrushCursor(point);

        if (state.brush.down && state.brush.mode !== "none") {
            event.preventDefault();
            paintBrushAt(point);
            return;
        }

        updateLoupe(point, event);
    }

    function onCanvasUp(event) {
        if (state.finalPreview.dragging) {
            finishFinalPreviewDragV17(event);
            return;
        }

        finishBrushStroke();
    }

    function onCanvasClick(event) {
        const point = getCanvasPoint(event);

        if (state.brush.pickColor) {
            event.preventDefault();
            if (point) {
                sampleBrushColorAt(point);
            }
            return;
        }

        if (state.brush.mode !== "none") {
            event.preventDefault();
            return;
        }

        if (state.finalPreview.enabled) {
            event.preventDefault();

            if (state.finalPreview.suppressClick) {
                state.finalPreview.suppressClick = false;
                return;
            }

            if (point) {
                selectFinalRegionByClickV17(point, event.shiftKey || event.ctrlKey || event.metaKey);
            }
            return;
        }

        if (!state.region.enabled) {
            return;
        }

        if (!point) {
            return;
        }

        event.preventDefault();
        selectRegionByClick(point, event.shiftKey, event.ctrlKey || event.metaKey);
    }

    function onCanvasLeave() {
        if (state.finalPreview.dragging) {
            state.finalPreview.dragging = false;
            state.finalPreview.dragStart = null;
            state.finalPreview.dragRect = null;
            drawFinalPreviewOverlayV17();
        }

        finishBrushStroke();
        hideLoupe();
    }

    function finishFinalPreviewDragV17() {
        const rect = state.finalPreview.dragRect;
        state.finalPreview.dragging = false;
        state.finalPreview.dragStart = null;
        state.finalPreview.dragRect = null;

        if (!rect || rect.w < 6 || rect.h < 6) {
            drawFinalPreviewOverlayV17();
            return;
        }

        const ids = (state.finalPreview.regions || [])
            .filter((region) => rectOverlapV17(region.bounds, rect))
            .map((region) => region.id);

        state.finalPreview.suppressClick = true;

        // 드래그는 병합을 바로 실행하지 않고, 2개 이상 구역을 선택하는 용도다.
        // 실제 병합은 [선택 구역 병합] 버튼으로 확정한다.
        state.finalPreview.selectedIds = ids;
        drawFinalPreviewOverlayV17();
        updateFinalMergeToolUIV17();
        toast(ids.length > 0 ? `구역 ${ids.length}개를 선택했습니다.` : "선택된 구역이 없습니다.");
    }

    function selectFinalRegionByClickV17(point, mergeMode) {
        const region = findFinalRegionAtPointV17(point);

        if (!region) {
            state.finalPreview.selectedIds = [];
            drawFinalPreviewOverlayV17();
            updateFinalMergeToolUIV17();
            toast("최종 구역을 찾지 못했습니다.");
            return;
        }

        if (mergeMode) {
            // Shift/Ctrl 클릭은 즉시 병합이 아니라 다중 선택 토글이다.
            // 2개 이상 선택 후 [선택 구역 병합]으로 확정한다.
            const exists = state.finalPreview.selectedIds.includes(region.id);
            state.finalPreview.selectedIds = exists
                ? state.finalPreview.selectedIds.filter((id) => id !== region.id)
                : [...state.finalPreview.selectedIds, region.id];
        } else {
            state.finalPreview.selectedIds = [region.id];
        }

        drawFinalPreviewOverlayV17();
        updateFinalMergeToolUIV17();
        toast(`구역 ${state.finalPreview.selectedIds.length}개 선택됨`);
    }

    function mergeSelectedFinalRegionsV17() {
        mergeFinalRegionsByIdsV17(state.finalPreview.selectedIds || [], "선택 구역 병합");
    }

    function mergeFinalRegionsByIdsV17(ids, label = "최종 구역 병합") {
        const uniqueIds = [...new Set(ids || [])];

        if (uniqueIds.length < 2) {
            toast("합칠 구역을 2개 이상 선택하세요.");
            return;
        }

        const targets = (state.finalPreview.regions || []).filter((region) => uniqueIds.includes(region.id));

        if (targets.length < 2) {
            toast("합칠 구역을 2개 이상 선택하세요.");
            return;
        }

        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = targets.flatMap((region) => region.pixels || []);
        const color = getDominantColorFromPixels(image, pixels);
        const hull = buildMergedRegionHullV17(targets);

        if (!hull || hull.length < 3) {
            toast("병합할 도형 외곽을 계산하지 못했습니다.");
            return;
        }

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(hull[0].x, hull[0].y);
        for (let i = 1; i < hull.length; i += 1) {
            ctx.lineTo(hull[i].x, hull[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = rgbToHex(color.r, color.g, color.b);
        ctx.fill();
        ctx.restore();

        syncResultFromVisible();
        state.hasResult = true;
        state.saved = false;
        state.resultBaseDataUrl = canvas.toDataURL("image/png");
        state.finalPreview.selectedIds = [];
        pushHistory(label);
        rebuildFinalPreviewRegionsV17();
        drawFinalPreviewOverlayV17();
        updateFinalMergeToolUIV17();
        updateStats();
        toast(`${targets.length}개 구역을 대표색 ${rgbToHex(color.r, color.g, color.b)}로 병합했습니다.`);
    }

    function clearFinalRegionSelectionV17() {
        state.finalPreview.selectedIds = [];
        drawFinalPreviewOverlayV17();
        updateFinalMergeToolUIV17();
        toast("최종 구역 선택을 해제했습니다.");
    }

    function updateFinalMergeToolUIV17() {
        const text = document.getElementById("finalSelectionText");
        const button = document.getElementById("finalMergeSelectedRegions");
        const count = (state.finalPreview.selectedIds || []).length;

        if (text) {
            text.textContent = count > 0
                ? `선택 구역: ${count}개 / 전체 ${state.finalPreview.componentCount || 0}개`
                : `선택 구역: 없음 / 전체 ${state.finalPreview.componentCount || 0}개`;
        }

        if (button) {
            button.disabled = count < 2;
        }
    }

    function findFinalRegionAtPointV17(point) {
        const x = clamp(Math.round(point.x), 0, canvas.width - 1);
        const y = clamp(Math.round(point.y), 0, canvas.height - 1);
        const index = y * canvas.width + x;

        for (let i = (state.finalPreview.regions || []).length - 1; i >= 0; i -= 1) {
            const region = state.finalPreview.regions[i];

            if (region.pixelSet && region.pixelSet.has(index)) {
                return region;
            }

            if (point.x >= region.bounds.x && point.x <= region.bounds.x + region.bounds.w
                && point.y >= region.bounds.y && point.y <= region.bounds.y + region.bounds.h
                && isNearFinalRegionPixelV17(region, point, 6)) {
                return region;
            }
        }

        return null;
    }

    function isNearFinalRegionPixelV17(region, point, radius) {
        const x = Math.round(point.x);
        const y = Math.round(point.y);
        const r = Math.max(1, radius || 4);
        const pixelSet = region.pixelSet || new Set(region.pixels || []);

        for (let yy = y - r; yy <= y + r; yy += 1) {
            for (let xx = x - r; xx <= x + r; xx += 1) {
                if (xx < 0 || yy < 0 || xx >= canvas.width || yy >= canvas.height) {
                    continue;
                }

                if (pixelSet.has(yy * canvas.width + xx)) {
                    return true;
                }
            }
        }

        return false;
    }

    function extractAnySeatComponentsV17(roleMap, width, height) {
        const visited = new Uint8Array(width * height);
        const components = [];
        const queue = [];

        for (let i = 0; i < width * height; i += 1) {
            if (visited[i] || !isSeatRole(roleMap[i])) {
                continue;
            }

            const component = {
                role: roleMap[i],
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

                pushAnySeatNeighborV17(queue, visited, roleMap, width, height, x + 1, y);
                pushAnySeatNeighborV17(queue, visited, roleMap, width, height, x - 1, y);
                pushAnySeatNeighborV17(queue, visited, roleMap, width, height, x, y + 1);
                pushAnySeatNeighborV17(queue, visited, roleMap, width, height, x, y - 1);
                pushAnySeatNeighborV17(queue, visited, roleMap, width, height, x + 1, y + 1);
                pushAnySeatNeighborV17(queue, visited, roleMap, width, height, x - 1, y - 1);
                pushAnySeatNeighborV17(queue, visited, roleMap, width, height, x + 1, y - 1);
                pushAnySeatNeighborV17(queue, visited, roleMap, width, height, x - 1, y + 1);
            }

            components.push(component);
        }

        return components;
    }

    function pushAnySeatNeighborV17(queue, visited, roleMap, width, height, x, y) {
        if (x < 0 || y < 0 || x >= width || y >= height) {
            return;
        }

        const index = y * width + x;

        if (visited[index] || !isSeatRole(roleMap[index])) {
            return;
        }

        visited[index] = 1;
        queue.push(index);
    }

    function getDominantFinalRoleFromPixelsV17(roleMap, pixels) {
        const counts = new Map();

        for (const index of pixels || []) {
            const role = roleMap[index];

            if (!isSeatRole(role)) {
                continue;
            }

            counts.set(role, (counts.get(role) || 0) + 1);
        }

        let bestRole = ROLE.SEAT_PINK;
        let bestCount = -1;
        counts.forEach((count, role) => {
            if (count > bestCount) {
                bestRole = role;
                bestCount = count;
            }
        });

        return bestRole;
    }

    function buildMergedRegionHullV17(regions) {
        const points = [];

        for (const region of regions) {
            const boundary = getFinalRegionBoundaryPointsV17(region);
            const step = Math.max(1, Math.floor(boundary.length / 1200));

            for (let i = 0; i < boundary.length; i += step) {
                points.push(boundary[i]);
            }

            points.push(
                { x: region.bounds.x, y: region.bounds.y },
                { x: region.bounds.x + region.bounds.w, y: region.bounds.y },
                { x: region.bounds.x + region.bounds.w, y: region.bounds.y + region.bounds.h },
                { x: region.bounds.x, y: region.bounds.y + region.bounds.h }
            );
        }

        return convexHullV17(points).map((point) => ({ x: round(point.x), y: round(point.y) }));
    }

    function getFinalRegionBoundaryPointsV17(region) {
        const width = canvas.width;
        const height = canvas.height;
        const pixelSet = region.pixelSet || new Set(region.pixels || []);
        const points = [];

        for (const index of region.pixels || []) {
            const x = index % width;
            const y = Math.floor(index / width);

            if (x <= 0 || x >= width - 1 || y <= 0 || y >= height - 1
                || !pixelSet.has(index - 1)
                || !pixelSet.has(index + 1)
                || !pixelSet.has(index - width)
                || !pixelSet.has(index + width)) {
                points.push({ x, y });
            }
        }

        return points;
    }

    function convexHullV17(points) {
        const unique = [];
        const seen = new Set();

        for (const point of points || []) {
            const x = Math.round(point.x);
            const y = Math.round(point.y);
            const key = `${x},${y}`;

            if (seen.has(key)) {
                continue;
            }

            seen.add(key);
            unique.push({ x, y });
        }

        if (unique.length <= 3) {
            return unique;
        }

        unique.sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);

        const lower = [];
        for (const point of unique) {
            while (lower.length >= 2 && crossV17(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
                lower.pop();
            }
            lower.push(point);
        }

        const upper = [];
        for (let i = unique.length - 1; i >= 0; i -= 1) {
            const point = unique[i];
            while (upper.length >= 2 && crossV17(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
                upper.pop();
            }
            upper.push(point);
        }

        lower.pop();
        upper.pop();
        return lower.concat(upper);
    }

    function crossV17(o, a, b) {
        return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    }

    function normalizeCanvasRectV17(a, b) {
        const x1 = Math.min(a.x, b.x);
        const y1 = Math.min(a.y, b.y);
        const x2 = Math.max(a.x, b.x);
        const y2 = Math.max(a.y, b.y);
        return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    }

    function rectOverlapV17(a, b) {
        if (!a || !b) {
            return false;
        }

        return a.x <= b.x + b.w
            && a.x + a.w >= b.x
            && a.y <= b.y + b.h
            && a.y + a.h >= b.y;
    }



    // ============================================================================
    // v18 patch: 최종 확정 흐름
    // 1. 단색화 및 내부 글자 제거
    // 2. 구역 미리보기 / 누락 보정 / 단색화 취소
    // 3. 수정 반영 단색화
    // 4. 구역 병합
    // 5. 최종 결과 확인 / 저장
    // ============================================================================

    function bindEvents() {
        bindClick("generateButtonImage", () => runAutoConversion(false, { nextStep: 2 }));
        bindClick("applyToConcert", () => runAutoConversion(true));
        bindClick("saveButtonImage", saveButtonImageLocal);
        bindClick("restoreSource", restoreSourceImage);
        bindClick("restoreResultBase", restoreResultBase);
        bindClick("clearAllSamples", resetAutoState);
        bindClick("clearSelectedSamples", resetAutoState);
        bindClick("cleanupPieces", () => runAutoConversion(false));

        // 파트 이동은 기존 결과를 되감지 않는다.
        bindClick("go2", () => setStep(2));
        bindClick("go3", () => setStep(3));
        bindClick("go4", () => setStep(4));
        bindClick("go5", () => {
            finalizeFinalImagePreviewV18();
            setStep(5);
        });

        bindClick("tab1", () => setStep(1));
        bindClick("tab2", () => setStep(2));
        bindClick("tab3", () => setStep(3));
        bindClick("tab4", () => setStep(4));
        bindClick("tab5", () => setStep(5));

        bindClick("backToBrush", () => setStep(2));
        bindClick("backToMerge", () => setStep(4));
        bindClick("previewSaveRegions", showFinalSavePreview);
        bindClick("pickColorFromCanvas", toggleColorPickerMode);
        bindClick("cancelSolidSelectedRegion", cancelSelectedSolidRegionsV18);
        bindClick("solidifyPickedColor", solidifyPickedColorAndRemoveTextV20);
        bindClick("extractPickedColorRegions", extractPickedColorRegionsV21);
        bindClick("rerunSingleColorFromCurrent", () => rerunSingleColorFromCurrentV18({ nextStep: 4 }));
        bindClick("rerunSingleColorOnly", () => rerunSingleColorFromCurrentV18());

        bindCanvasWheelZoom();
        showUndoRedoButtonsV21();
        bindClick("undoAction", undo);
        bindClick("redoAction", redo);
        bindZoomButton("zoomIn", 1);
        bindZoomButton("zoomOut", -1);
        bindClick("zoomReset", () => setZoom(1));
        bindClick("serverSaveButtonImage", saveButtonImageToServer);
        bindClick("saveAndExitButton", saveAndExit);

        bindClick("regionSelectStart", toggleRegionSelectTool);
        bindClick("regionClear", clearSelectedRegions);
        bindClick("regionRemoveText", removeTextInsideSelectedRegions);
        bindClick("regionDominantFill", fillSelectedRegionsWithDominantColor);
        bindClick("regionApplyColor", applySelectedRegionColor);
        bindClick("regionCleanFill", cleanAndFillSelectedRegions);
        bindClick("regionCleanAll", cleanAllCurrentSeatRegions);
        bindInput("regionColorInput", updateRegionColorFromInput);
        bindInput("regionGradeInput", updateRegionGradeFromInput);

        bindClick("straightenAllRegions", () => straightenSeatRegions(false));
        bindClick("straightenSelectedRegions", () => straightenSeatRegions(true));
        bindInput("straightenStrength", updateStraightenStrength);
        bindClick("brushTool", () => setBrushMode(state.brush.mode === "paint" ? "none" : "paint"));
        bindClick("eraseTool", () => setBrushMode(state.brush.mode === "erase" ? "none" : "erase"));
        bindInput("brushSize", updateBrushSize);

        document.querySelectorAll("[data-region-palette]").forEach((button) => {
            button.addEventListener("click", () => handlePaletteButtonClick(button));
        });

        if (overlay) {
            overlay.addEventListener("mousedown", onCanvasDown);
            overlay.addEventListener("mousemove", onCanvasMove);
            overlay.addEventListener("mouseup", onCanvasUp);
            overlay.addEventListener("click", onCanvasClick);
            overlay.addEventListener("mouseleave", onCanvasLeave);
        }
    }

    function setStep(step) {
        const nextStep = Number(step) || 1;
        state.currentStep = nextStep;

        if (nextStep > 1 && !state.hasResult) {
            state.currentStep = 1;
            toast("먼저 파트 1에서 단색화 이미지를 생성하세요.");
            return;
        }

        if (nextStep !== 4) {
            state.finalPreview.enabled = false;
            state.finalPreview.dragging = false;
            state.finalPreview.dragRect = null;
        }

        document.querySelectorAll(".button-image-step").forEach((section) => {
            const itemStep = Number(section.dataset.step);
            const header = section.querySelector(".button-image-step__header");
            const status = section.querySelector(".button-image-step__status");

            section.classList.toggle("is-active", itemStep === nextStep);
            section.classList.toggle("is-done", itemStep < nextStep);

            if (header) {
                header.classList.toggle("active", itemStep === nextStep);
            }

            if (status) {
                if (itemStep < nextStep) {
                    status.textContent = "완료";
                } else if (itemStep === nextStep) {
                    status.textContent = nextStep === 1
                        ? "진행중"
                        : nextStep === 2
                            ? "보정중"
                            : nextStep === 3
                                ? "단색화"
                                : nextStep === 4
                                    ? "병합중"
                                    : "확인";
                } else {
                    status.textContent = "대기";
                }
            }
        });

        if (nextStep === 1) {
            enableRegionSelectTool(false);
            setBrushMode("none", { silent: true });
            setColorPickerMode(false, { silent: true });
            clearOverlay();
            updateRegionSelectionText();
            return;
        }

        if (nextStep === 2) {
            // 파트2 진입점은 항상 "실선 구역 미리보기" 상태다.
            // 관리자가 먼저 잘못 단색화된 구역을 취소하거나, 지정 색상을 단색화할 수 있어야 하므로
            // 브러쉬를 자동으로 쥐어주지 않는다. 브러쉬는 사용자가 버튼을 눌렀을 때만 켠다.
            enableRegionSelectTool(true);
            updateBrushSize();
            setColorPickerMode(false, { silent: true });
            setBrushMode("none", { silent: true });
            drawLiveRegionPreviewV18();
            updateRegionSelectionText();
            return;
        }

        if (nextStep === 3) {
            enableRegionSelectTool(false);
            setBrushMode("none", { silent: true });
            setColorPickerMode(false, { silent: true });
            clearOverlay();
            return;
        }

        if (nextStep === 4) {
            enableRegionSelectTool(false);
            setBrushMode("none", { silent: true });
            setColorPickerMode(false, { silent: true });
            showFinalSavePreview();
            return;
        }

        if (nextStep === 5) {
            enableRegionSelectTool(false);
            setBrushMode("none", { silent: true });
            setColorPickerMode(false, { silent: true });
            state.finalPreview.enabled = false;
            clearOverlay();
        }
    }

    function drawLiveRegionPreviewV18() {
        drawLiveRegionPreviewV17();
    }

    function finishBrushStroke() {
        if (!state.brush.down) {
            return;
        }

        state.brush.down = false;

        if (!state.brush.changed) {
            return;
        }

        syncResultFromVisible();
        state.hasResult = true;
        state.saved = false;
        state.resultBaseDataUrl = canvas.toDataURL("image/png");
        pushHistory(state.brush.mode === "erase" ? "지우개 보정" : "브러쉬 보정");
        updateStats();

        if (document.querySelector("#part2.button-image-step.is-active")) {
            drawLiveRegionPreviewV18();
        }

        toast(state.brush.mode === "erase" ? "지우개 보정을 적용했습니다." : "브러쉬 보정을 적용했습니다.");
    }

    function cancelSelectedSolidRegionsV18() {
        if (!state.hasResult || !canvas.width || !canvas.height) {
            toast("먼저 단색화 이미지를 생성하세요.");
            return;
        }

        if (!state.region.selected || state.region.selected.length <= 0) {
            toast("단색화 취소할 구역을 먼저 클릭하세요.");
            return;
        }

        const width = canvas.width;
        const height = canvas.height;
        const current = ctx.getImageData(0, 0, width, height);
        const original = sourceCtx.getImageData(0, 0, width, height);
        const currentData = current.data;
        const originalData = original.data;
        const visited = new Set();
        let changed = 0;

        for (const region of state.region.selected) {
            for (const index of region.pixels || []) {
                if (visited.has(index)) {
                    continue;
                }
                visited.add(index);
                const offset = index * 4;
                currentData[offset] = originalData[offset];
                currentData[offset + 1] = originalData[offset + 1];
                currentData[offset + 2] = originalData[offset + 2];
                currentData[offset + 3] = originalData[offset + 3];
                changed += 1;
            }
        }

        ctx.putImageData(current, 0, 0);
        syncResultFromVisible();
        state.resultBaseDataUrl = canvas.toDataURL("image/png");
        state.saved = false;
        pushHistory("선택 구역 단색화 취소");
        state.region.selected = [];
        clearOverlay();
        drawLiveRegionPreviewV18();
        updateRegionSelectionText();
        updateStats();
        toast(`선택 구역 단색화를 취소했습니다. ${changed}픽셀 원본 복원`);
    }

    function rerunSingleColorFromCurrentV18(options = {}) {
        if (!state.hasResult || !canvas.width || !canvas.height) {
            toast("먼저 파트 1에서 단색화 이미지를 생성하세요.");
            return;
        }

        const width = canvas.width;
        const height = canvas.height;
        const sourceImage = ctx.getImageData(0, 0, width, height);
        toast("수정 내용을 기준으로 다시 단색화 중...");

        setTimeout(() => {
            try {
                const inference = runScanInference(sourceImage, width, height);

                resultCanvas.width = width;
                resultCanvas.height = height;
                resultCtx.putImageData(inference.image, 0, 0);

                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(resultCanvas, 0, 0);

                state.hasResult = true;
                state.saved = false;
                state.resultBaseDataUrl = canvas.toDataURL("image/png");
                state.lastStats = inference.stats;
                state.region.selected = [];
                state.finalPreview.enabled = false;
                state.finalPreview.regions = [];
                state.finalPreview.selectedIds = [];

                syncResultFromVisible();
                pushHistory("수정 반영 단색화");
                renderLegend(inference.stats);
                updateStats();
                clearOverlay();
                toast(createResultMessage(inference.stats));

                if (options.nextStep) {
                    setStep(options.nextStep);
                }
            } catch (error) {
                console.error(error);
                toast("수정 반영 단색화 실패: 현재 이미지를 유지했습니다.");
            }
        }, 20);
    }

    function finalizeFinalImagePreviewV18() {
        if (!state.hasResult) {
            toast("먼저 단색화 이미지를 생성하세요.");
            return;
        }

        // 파트 5는 실선/오버레이 없이 최종 저장 이미지만 보여준다.
        state.finalPreview.enabled = false;
        state.finalPreview.dragging = false;
        state.finalPreview.dragRect = null;
        clearOverlay();
        syncResultFromVisible();
        state.resultBaseDataUrl = canvas.toDataURL("image/png");
        state.saved = false;
        updateStats();
        toast("실선이 제거된 최종 저장 미리보기입니다.");
    }


    // ============================================================================
    // v19 patch: 파트2 지정 색상 단색화 + 병합 선택 방식 보정
    // ============================================================================

    function solidifyPickedColorV19() {
        if (!state.hasResult || !canvas.width || !canvas.height) {
            toast("먼저 파트 1에서 단색화 이미지를 생성하세요.");
            return;
        }

        // 선택 구역이 있으면 해당 구역만 지정 색상으로 단색화한다.
        if (state.region.selected && state.region.selected.length > 0) {
            applySelectedRegionColor();
            if (document.querySelector("#part2.button-image-step.is-active")) {
                drawLiveRegionPreviewV18();
            }
            return;
        }

        const target = hexToRgb(state.region.color || "#ef5e94");

        if (!isSeatLikeColorV19(target)) {
            toast("흰색/회색/검정이 아닌 좌석 색상을 먼저 찍으세요.");
            return;
        }

        const width = canvas.width;
        const height = canvas.height;
        const image = ctx.getImageData(0, 0, width, height);
        const data = image.data;
        const visited = new Uint8Array(width * height);
        const queue = [];
        const components = [];
        const tolerance = 62;
        const minArea = 10;

        function matches(index) {
            const offset = index * 4;
            if (data[offset + 3] < 10) {
                return false;
            }

            const pixel = { r: data[offset], g: data[offset + 1], b: data[offset + 2] };
            return colorDistance(pixel, target) <= tolerance;
        }

        for (let start = 0; start < width * height; start += 1) {
            if (visited[start] || !matches(start)) {
                continue;
            }

            const component = [];
            queue.length = 0;
            queue.push(start);
            visited[start] = 1;

            while (queue.length > 0) {
                const current = queue.pop();
                component.push(current);
                const x = current % width;
                const y = Math.floor(current / width);

                pushColorNeighborV19(queue, visited, matches, width, height, x + 1, y);
                pushColorNeighborV19(queue, visited, matches, width, height, x - 1, y);
                pushColorNeighborV19(queue, visited, matches, width, height, x, y + 1);
                pushColorNeighborV19(queue, visited, matches, width, height, x, y - 1);
                pushColorNeighborV19(queue, visited, matches, width, height, x + 1, y + 1);
                pushColorNeighborV19(queue, visited, matches, width, height, x - 1, y - 1);
                pushColorNeighborV19(queue, visited, matches, width, height, x + 1, y - 1);
                pushColorNeighborV19(queue, visited, matches, width, height, x - 1, y + 1);
            }

            if (component.length >= minArea) {
                components.push(component);
            }
        }

        if (components.length <= 0) {
            toast("해당 색상으로 단색화할 구역을 찾지 못했습니다. 도면에서 색상을 다시 찍어보세요.");
            return;
        }

        let changed = 0;
        for (const component of components) {
            for (const index of component) {
                const offset = index * 4;
                data[offset] = target.r;
                data[offset + 1] = target.g;
                data[offset + 2] = target.b;
                data[offset + 3] = 255;
                changed += 1;
            }
        }

        ctx.putImageData(image, 0, 0);
        syncResultFromVisible();
        state.hasResult = true;
        state.saved = false;
        state.resultBaseDataUrl = canvas.toDataURL("image/png");
        state.region.selected = [];
        pushHistory("지정 색상 단색화");
        updateStats();
        drawLiveRegionPreviewV18();
        updateRegionSelectionText();
        toast(`지정 색상 단색화 완료: ${components.length}개 구역 / ${changed}픽셀`);
    }

    function pushColorNeighborV19(queue, visited, matches, width, height, x, y) {
        if (x < 0 || y < 0 || x >= width || y >= height) {
            return;
        }

        const index = y * width + x;
        if (visited[index] || !matches(index)) {
            return;
        }

        visited[index] = 1;
        queue.push(index);
    }

    function isSeatLikeColorV19(rgb) {
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        return hsl.s >= 0.20 && hsl.l >= 0.18 && hsl.l <= 0.92;
    }


    // ============================================================================
    // v20 patch: 파트2 상단 "지정 색상 단색화 + 내부 글자 제거" + 히스토리 버튼 숨김
    // ============================================================================

    function hideUndoRedoButtonsV20() {
        showUndoRedoButtonsV21();
    }

    function showUndoRedoButtonsV21() {
        ["undoAction", "redoAction"].forEach((id) => {
            const button = $(id);
            if (!button) {
                return;
            }

            button.style.display = "";
            button.style.pointerEvents = "";
            button.removeAttribute("aria-hidden");
        });
        updateHistoryButtons();
    }

    function solidifyPickedColorAndRemoveTextV20() {
        if (!state.hasResult || !canvas.width || !canvas.height) {
            toast("먼저 파트 1에서 단색화 이미지를 생성하세요.");
            return;
        }

        const target = hexToRgb(state.region.color || "#ef5e94");

        if (!isSeatLikeColorV19(target)) {
            toast("흰색/회색/검정이 아닌 좌석 색상을 먼저 찍으세요.");
            return;
        }

        if (state.region.selected && state.region.selected.length > 0) {
            const result = solidifySelectedRegionsAndRemoveTextV20(target);
            drawLiveRegionPreviewV18();
            updateRegionSelectionText();
            toast(`선택 구역 단색화 + 내부 글자 제거 완료: 단색화 ${result.painted}픽셀 / 글자 ${result.removed}픽셀`);
            return;
        }

        const result = solidifyPickedColorComponentsAndRemoveTextV20(target);

        if (result.components <= 0) {
            toast("해당 색상으로 단색화할 구역을 찾지 못했습니다. 도면에서 색상을 다시 찍어보세요.");
            return;
        }

        drawLiveRegionPreviewV18();
        updateRegionSelectionText();
        toast(`지정 색상 단색화 + 내부 글자 제거 완료: ${result.components}개 구역 / 단색화 ${result.painted}픽셀 / 글자 ${result.removed}픽셀`);
    }

    function solidifySelectedRegionsAndRemoveTextV20(target) {
        const width = canvas.width;
        const height = canvas.height;
        const image = ctx.getImageData(0, 0, width, height);
        const roleMap = buildCurrentCanvasRoleMap(image, width, height);
        const data = image.data;
        let painted = 0;
        let removed = 0;

        for (const region of state.region.selected) {
            for (const index of region.pixels || []) {
                const offset = index * 4;
                if (data[offset] !== target.r || data[offset + 1] !== target.g || data[offset + 2] !== target.b || data[offset + 3] !== 255) {
                    data[offset] = target.r;
                    data[offset + 1] = target.g;
                    data[offset + 2] = target.b;
                    data[offset + 3] = 255;
                    painted += 1;
                }
            }

            const selectedMask = buildMaskFromPixels(region.pixels || [], width, height);
            const components = extractCandidateTextComponentsNearRegion(roleMap, selectedMask, region, width, height);

            for (const component of components) {
                const score = scoreCandidateComponentForRegion(component, selectedMask, width, height);

                if (score < 58) {
                    continue;
                }

                for (const index of component.pixels || []) {
                    const offset = index * 4;
                    data[offset] = target.r;
                    data[offset + 1] = target.g;
                    data[offset + 2] = target.b;
                    data[offset + 3] = 255;
                    removed += 1;
                }
            }

            region.color = target;
            region.colorHex = rgbToHex(target.r, target.g, target.b);
            region.gradeName = state.region.gradeName;
        }

        ctx.putImageData(image, 0, 0);
        syncResultFromVisible();
        state.hasResult = true;
        state.saved = false;
        state.resultBaseDataUrl = canvas.toDataURL("image/png");
        pushHistory("지정 색상 단색화 + 내부 글자 제거");
        updateStats();

        return { painted, removed };
    }

    function solidifyPickedColorComponentsAndRemoveTextV20(target) {
        const width = canvas.width;
        const height = canvas.height;
        const image = ctx.getImageData(0, 0, width, height);
        const data = image.data;
        const visited = new Uint8Array(width * height);
        const queue = [];
        const components = [];
        const tolerance = 66;
        const minArea = 8;

        function matches(index) {
            const offset = index * 4;
            if (data[offset + 3] < 10) {
                return false;
            }

            const pixel = { r: data[offset], g: data[offset + 1], b: data[offset + 2] };
            return colorDistance(pixel, target) <= tolerance;
        }

        for (let start = 0; start < width * height; start += 1) {
            if (visited[start] || !matches(start)) {
                continue;
            }

            const component = {
                id: 0,
                role: ROLE.SEAT_RED,
                pixels: [],
                bounds: {
                    minX: Infinity,
                    minY: Infinity,
                    maxX: -Infinity,
                    maxY: -Infinity
                }
            };

            queue.length = 0;
            queue.push(start);
            visited[start] = 1;

            while (queue.length > 0) {
                const current = queue.pop();
                const x = current % width;
                const y = Math.floor(current / width);

                component.pixels.push(current);
                component.bounds.minX = Math.min(component.bounds.minX, x);
                component.bounds.minY = Math.min(component.bounds.minY, y);
                component.bounds.maxX = Math.max(component.bounds.maxX, x);
                component.bounds.maxY = Math.max(component.bounds.maxY, y);

                pushColorNeighborV19(queue, visited, matches, width, height, x + 1, y);
                pushColorNeighborV19(queue, visited, matches, width, height, x - 1, y);
                pushColorNeighborV19(queue, visited, matches, width, height, x, y + 1);
                pushColorNeighborV19(queue, visited, matches, width, height, x, y - 1);
                pushColorNeighborV19(queue, visited, matches, width, height, x + 1, y + 1);
                pushColorNeighborV19(queue, visited, matches, width, height, x - 1, y - 1);
                pushColorNeighborV19(queue, visited, matches, width, height, x + 1, y - 1);
                pushColorNeighborV19(queue, visited, matches, width, height, x - 1, y + 1);
            }

            if (component.pixels.length >= minArea) {
                component.bounds.width = component.bounds.maxX - component.bounds.minX + 1;
                component.bounds.height = component.bounds.maxY - component.bounds.minY + 1;
                components.push(component);
            }
        }

        if (components.length <= 0) {
            return { components: 0, painted: 0, removed: 0 };
        }

        const roleMap = buildCurrentCanvasRoleMap(image, width, height);
        let painted = 0;
        let removed = 0;

        for (const component of components) {
            for (const index of component.pixels) {
                const offset = index * 4;
                data[offset] = target.r;
                data[offset + 1] = target.g;
                data[offset + 2] = target.b;
                data[offset + 3] = 255;
                painted += 1;
            }

            const selectedMask = buildMaskFromPixels(component.pixels, width, height);
            const textComponents = extractCandidateTextComponentsNearRegion(roleMap, selectedMask, component, width, height);

            for (const textComponent of textComponents) {
                const score = scoreCandidateComponentForRegion(textComponent, selectedMask, width, height);

                if (score < 58) {
                    continue;
                }

                for (const index of textComponent.pixels || []) {
                    const offset = index * 4;
                    data[offset] = target.r;
                    data[offset + 1] = target.g;
                    data[offset + 2] = target.b;
                    data[offset + 3] = 255;
                    removed += 1;
                }
            }
        }

        ctx.putImageData(image, 0, 0);
        syncResultFromVisible();
        state.hasResult = true;
        state.saved = false;
        state.resultBaseDataUrl = canvas.toDataURL("image/png");
        state.region.selected = [];
        pushHistory("지정 색상 단색화 + 내부 글자 제거");
        updateStats();

        return { components: components.length, painted, removed };
    }


    // ============================================================================
    // v21 patch: 파트2 선택 색상 추출 + 파트 경계 히스토리 제한
    // ============================================================================

    function extractPickedColorRegionsV21() {
        if (!state.hasResult || !canvas.width || !canvas.height) {
            toast("먼저 파트 1에서 단색화 이미지를 생성하세요.");
            return;
        }

        const target = hexToRgb(state.region.color || $("regionColorInput")?.value || "#ef5e94");

        if (!isSeatLikeColorV19(target)) {
            toast("좌석 구역 색상을 먼저 선택하세요. 흰색/회색/검정은 제외됩니다.");
            return;
        }

        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const components = extractRegionsByPickedColorV21(image, canvas.width, canvas.height, target);

        if (components.length <= 0) {
            state.region.selected = [];
            drawLiveRegionPreviewV18();
            updateRegionSelectionText();
            toast("선택 색상으로 추출된 구역이 없습니다.");
            return;
        }

        state.region.selected = components.map((component) => {
            const color = getDominantColorFromPixels(image, component.pixels);
            return {
                id: state.region.nextId++,
                role: component.role,
                pixels: component.pixels,
                bounds: component.bounds,
                color,
                colorHex: rgbToHex(color.r, color.g, color.b),
                gradeName: state.region.gradeName || getDefaultGradeName(component.role),
                pixelSet: new Set(component.pixels)
            };
        });

        enableRegionSelectTool(true);
        drawSelectedRegionsOverlay();
        updateRegionSelectionText();
        toast(`선택 색상 추출 완료: ${state.region.selected.length}개 구역`);
    }

    function extractRegionsByPickedColorV21(image, width, height, target) {
        const data = image.data;
        const visited = new Uint8Array(width * height);
        const queue = [];
        const components = [];
        const tolerance = 58;
        const minArea = 16;

        function matches(index) {
            const offset = index * 4;

            if (data[offset + 3] < 10) {
                return false;
            }

            const pixel = { r: data[offset], g: data[offset + 1], b: data[offset + 2] };

            if (colorDistance(pixel, target) > tolerance) {
                return false;
            }

            return isSeatLikeColorV19(pixel);
        }

        for (let start = 0; start < width * height; start += 1) {
            if (visited[start] || !matches(start)) {
                continue;
            }

            const component = {
                role: classifyColorRole(target.r, target.g, target.b, 255, getScanVariant("relaxed")),
                pixels: [],
                bounds: {
                    minX: Infinity,
                    minY: Infinity,
                    maxX: -Infinity,
                    maxY: -Infinity
                }
            };

            queue.length = 0;
            queue.push(start);
            visited[start] = 1;

            while (queue.length > 0) {
                const current = queue.pop();
                const x = current % width;
                const y = Math.floor(current / width);

                component.pixels.push(current);
                component.bounds.minX = Math.min(component.bounds.minX, x);
                component.bounds.minY = Math.min(component.bounds.minY, y);
                component.bounds.maxX = Math.max(component.bounds.maxX, x);
                component.bounds.maxY = Math.max(component.bounds.maxY, y);

                pushColorExtractNeighborV21(queue, visited, matches, width, height, x + 1, y);
                pushColorExtractNeighborV21(queue, visited, matches, width, height, x - 1, y);
                pushColorExtractNeighborV21(queue, visited, matches, width, height, x, y + 1);
                pushColorExtractNeighborV21(queue, visited, matches, width, height, x, y - 1);
                pushColorExtractNeighborV21(queue, visited, matches, width, height, x + 1, y + 1);
                pushColorExtractNeighborV21(queue, visited, matches, width, height, x - 1, y - 1);
                pushColorExtractNeighborV21(queue, visited, matches, width, height, x + 1, y - 1);
                pushColorExtractNeighborV21(queue, visited, matches, width, height, x - 1, y + 1);
            }

            if (component.pixels.length >= minArea) {
                component.bounds.width = component.bounds.maxX - component.bounds.minX + 1;
                component.bounds.height = component.bounds.maxY - component.bounds.minY + 1;
                components.push(component);
            }
        }

        components.sort((a, b) => b.pixels.length - a.pixels.length);
        return components.slice(0, 240);
    }

    function pushColorExtractNeighborV21(queue, visited, matches, width, height, x, y) {
        if (x < 0 || y < 0 || x >= width || y >= height) {
            return;
        }

        const index = y * width + x;

        if (visited[index] || !matches(index)) {
            return;
        }

        visited[index] = 1;
        queue.push(index);
    }

    function saveAndExit() {
        finalizeFinalImagePreviewV18();
        saveButtonImageToServer();
    }


    // ============================================================================
    // v22 patch: 최종 확정 플로우 재정리
    // 1. 파트1 = 기존 자동 단색화 유지
    // 2. 파트2 = 브러쉬/스포트라이트로 파트1 누락 구역만 색칠
    // 3. 파트3 = 찍은 색상 추출 + 파트1식 단색화/내부 글자 제거
    // 4. 파트4 = 실선 항상 표시 + 구역 병합
    // 5. 파트5 = 최종 미리보기 + 유사 색상 번호 병합
    // ============================================================================

    function bindEvents() {
        bindClick("generateButtonImage", () => runAutoConversion(false, { nextStep: 2 }));
        bindClick("applyToConcert", () => runAutoConversion(true));
        bindClick("saveButtonImage", saveButtonImageLocal);
        bindClick("restoreSource", restoreSourceImage);
        bindClick("restoreResultBase", restoreResultBase);
        bindClick("clearAllSamples", resetAutoState);
        bindClick("clearSelectedSamples", resetAutoState);
        bindClick("cleanupPieces", () => runAutoConversion(false));

        bindClick("go2", () => setStep(2));
        bindClick("go3", () => setStep(3));
        bindClick("go4", () => setStep(4));
        bindClick("go5", () => {
            finalizeFinalImagePreviewV18();
            setStep(5);
        });

        bindClick("tab1", () => setStep(1));
        bindClick("tab2", () => setStep(2));
        bindClick("tab3", () => setStep(3));
        bindClick("tab4", () => setStep(4));
        bindClick("tab5", () => setStep(5));

        bindClick("backToBrush", () => setStep(2));
        bindClick("backToMerge", () => setStep(4));
        bindClick("previewSaveRegions", showFinalSavePreview);

        bindClick("pickColorFromCanvas", () => {
            state.__colorPickTarget = "regionColorInput";
            toggleColorPickerMode();
        });
        bindClick("pickStep3ColorFromCanvas", () => {
            state.__colorPickTarget = "step3ColorInput";
            toggleColorPickerMode();
        });

        bindClick("cancelSolidSelectedRegion", cancelSelectedSolidRegionsV18);
        bindClick("solidifyPickedColor", solidifyPickedColorAndRemoveTextV20);
        bindClick("extractPickedColorRegions", extractPickedColorRegionsV21);
        bindClick("extractAndSolidifyColor", extractAndSolidifyPickedColorV22);
        bindClick("rerunSingleColorFromCurrent", () => rerunSingleColorFromCurrentV18());
        bindClick("rerunSingleColorOnly", () => rerunSingleColorFromCurrentV18());

        bindClick("finalMergeSelectedRegions", mergeSelectedFinalRegionsV17);
        bindClick("finalClearSelection", clearFinalRegionSelectionV17);
        bindClick("mergeFinalColors", mergeFinalColorGroupsV22);
        bindClick("refreshFinalColors", renderFinalColorListV22);

        bindCanvasWheelZoom();
        showUndoRedoButtonsV21();
        bindClick("undoAction", undo);
        bindClick("redoAction", redo);
        bindZoomButton("zoomIn", 1);
        bindZoomButton("zoomOut", -1);
        bindClick("zoomReset", () => setZoom(1));
        bindClick("serverSaveButtonImage", saveButtonImageToServer);
        bindClick("saveAndExitButton", saveAndExit);

        bindClick("regionSelectStart", toggleRegionSelectTool);
        bindClick("regionClear", clearSelectedRegions);
        bindClick("regionRemoveText", removeTextInsideSelectedRegions);
        bindClick("regionDominantFill", fillSelectedRegionsWithDominantColor);
        bindClick("regionApplyColor", applySelectedRegionColor);
        bindClick("regionCleanFill", cleanAndFillSelectedRegions);
        bindClick("regionCleanAll", cleanAllCurrentSeatRegions);
        bindInput("regionColorInput", updateRegionColorFromInput);
        bindInput("step3ColorInput", updateStep3ColorFromInputV22);
        bindInput("regionGradeInput", updateRegionGradeFromInput);

        bindClick("straightenAllRegions", () => straightenSeatRegions(false));
        bindClick("straightenSelectedRegions", () => straightenSeatRegions(true));
        bindInput("straightenStrength", updateStraightenStrength);
        bindClick("brushTool", () => setBrushMode(state.brush.mode === "paint" ? "none" : "paint"));
        bindClick("eraseTool", () => setBrushMode(state.brush.mode === "erase" ? "none" : "erase"));
        bindInput("brushSize", updateBrushSize);

        document.querySelectorAll("[data-region-palette]").forEach((button) => {
            button.addEventListener("click", () => handlePaletteButtonClick(button));
        });

        if (overlay) {
            overlay.addEventListener("mousedown", onCanvasDown);
            overlay.addEventListener("mousemove", onCanvasMove);
            overlay.addEventListener("mouseup", onCanvasUp);
            overlay.addEventListener("click", onCanvasClick);
            overlay.addEventListener("mouseleave", onCanvasLeave);
        }
    }

    function setStep(step) {
        const nextStep = Number(step) || 1;
        state.currentStep = nextStep;

        if (nextStep > 1 && !state.hasResult) {
            state.currentStep = 1;
            toast("먼저 파트 1에서 단색화 이미지를 생성하세요.");
            return;
        }

        if (nextStep !== 4) {
            state.finalPreview.enabled = false;
            state.finalPreview.dragging = false;
            state.finalPreview.dragRect = null;
        }

        document.querySelectorAll(".button-image-step").forEach((section) => {
            const itemStep = Number(section.dataset.step);
            const header = section.querySelector(".button-image-step__header");
            const status = section.querySelector(".button-image-step__status");

            section.classList.toggle("is-active", itemStep === nextStep);
            section.classList.toggle("is-done", itemStep < nextStep);

            if (header) {
                header.classList.toggle("active", itemStep === nextStep);
            }

            if (status) {
                if (itemStep < nextStep) {
                    status.textContent = "완료";
                } else if (itemStep === nextStep) {
                    status.textContent = nextStep === 1
                        ? "진행중"
                        : nextStep === 2
                            ? "보정중"
                            : nextStep === 3
                                ? "추출중"
                                : nextStep === 4
                                    ? "병합중"
                                    : "확인";
                } else {
                    status.textContent = "대기";
                }
            }
        });

        if (nextStep === 1) {
            enableRegionSelectTool(false);
            setBrushMode("none", { silent: true });
            setColorPickerMode(false, { silent: true });
            clearOverlay();
            updateRegionSelectionText();
            return;
        }

        if (nextStep === 2) {
            enableRegionSelectTool(false);
            updateBrushSize();
            setColorPickerMode(false, { silent: true });
            setBrushMode("none", { silent: true });
            drawLiveRegionPreviewV18();
            updateRegionSelectionText();
            return;
        }

        if (nextStep === 3) {
            enableRegionSelectTool(false);
            setBrushMode("none", { silent: true });
            setColorPickerMode(false, { silent: true });
            drawLiveRegionPreviewV18();
            syncStep3ColorFromRegionColorV22();
            return;
        }

        if (nextStep === 4) {
            enableRegionSelectTool(false);
            setBrushMode("none", { silent: true });
            setColorPickerMode(false, { silent: true });
            showFinalSavePreview();
            updateFinalMergeToolUIV17();
            return;
        }

        if (nextStep === 5) {
            enableRegionSelectTool(false);
            setBrushMode("none", { silent: true });
            setColorPickerMode(false, { silent: true });
            state.finalPreview.enabled = false;
            finalizeFinalImagePreviewV18();
            clearOverlay();
            renderFinalColorListV22();
        }
    }

    function finishBrushStroke() {
        if (!state.brush.down) {
            return;
        }

        state.brush.down = false;

        if (!state.brush.changed) {
            return;
        }

        syncResultFromVisible();
        state.hasResult = true;
        state.saved = false;
        state.resultBaseDataUrl = canvas.toDataURL("image/png");
        pushHistory(state.brush.mode === "erase" ? "지우개 보정" : "브러쉬 보정");
        updateStats();

        if (document.querySelector("#part2.button-image-step.is-active") || document.querySelector("#part3.button-image-step.is-active")) {
            drawLiveRegionPreviewV18();
        }

        toast(state.brush.mode === "erase" ? "지우개 보정을 적용했습니다." : "브러쉬 보정을 적용했습니다.");
    }

    function sampleBrushColorAt(point) {
        const x = clamp(Math.round(point.x), 0, canvas.width - 1);
        const y = clamp(Math.round(point.y), 0, canvas.height - 1);
        const data = ctx.getImageData(x, y, 1, 1).data;
        const hex = rgbToHex(data[0], data[1], data[2]);

        state.brush.color = hex;
        state.region.color = hex;

        const targetId = state.__colorPickTarget || "regionColorInput";
        const targetInput = $(targetId) || $("regionColorInput");

        if (targetInput) {
            targetInput.value = hex;
        }

        if (targetId === "step3ColorInput" && $("regionColorInput")) {
            $("regionColorInput").value = hex;
        }

        setColorPickerMode(false, { silent: true });
        state.__colorPickTarget = null;
        updateBrushCursor(point);
        toast(`색상 선택: ${hex.toUpperCase()}`);
    }

    function updateStep3ColorFromInputV22() {
        const input = $("step3ColorInput");
        if (!input) {
            return;
        }

        state.region.color = input.value;
        state.brush.color = input.value;

        const part2Input = $("regionColorInput");
        if (part2Input) {
            part2Input.value = input.value;
        }
    }

    function syncStep3ColorFromRegionColorV22() {
        const color = $("regionColorInput")?.value || state.region.color || "#ef5e94";
        const input = $("step3ColorInput");

        if (input && /^#[0-9a-fA-F]{6}$/.test(color)) {
            input.value = color;
        }

        state.region.color = color;
        state.brush.color = color;
    }

    function extractAndSolidifyPickedColorV22() {
        if (!state.hasResult || !canvas.width || !canvas.height) {
            toast("먼저 파트 1에서 단색화 이미지를 생성하세요.");
            return;
        }

        syncStep3ColorFromRegionColorV22();
        const target = hexToRgb($("step3ColorInput")?.value || state.region.color || "#ef5e94");

        if (!isSeatLikeColorV19(target)) {
            toast("좌석 구역 색상을 먼저 찍으세요. 흰색/회색/검정은 제외됩니다.");
            return;
        }

        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const components = extractRegionsByPickedColorV21(image, canvas.width, canvas.height, target);

        if (components.length <= 0) {
            state.region.selected = [];
            drawLiveRegionPreviewV18();
            updateRegionSelectionText();
            toast("선택 색상으로 추출된 구역이 없습니다.");
            return;
        }

        state.region.selected = components.map((component) => {
            const color = getDominantColorFromPixels(image, component.pixels);
            return {
                id: state.region.nextId++,
                role: component.role,
                pixels: component.pixels,
                bounds: component.bounds,
                color,
                colorHex: rgbToHex(color.r, color.g, color.b),
                gradeName: state.region.gradeName || getDefaultGradeName(component.role),
                pixelSet: new Set(component.pixels)
            };
        });

        const result = solidifySelectedRegionsAndRemoveTextV20(target);
        state.region.selected = [];
        syncResultFromVisible();
        state.hasResult = true;
        state.saved = false;
        state.resultBaseDataUrl = canvas.toDataURL("image/png");
        drawLiveRegionPreviewV18();
        updateRegionSelectionText();
        toast(`색상 추출 + 단색화 완료: ${components.length}개 구역 / 단색화 ${result.painted}픽셀 / 글자 ${result.removed}픽셀`);
    }

    function renderFinalColorListV22() {
        const container = $("finalColorList");
        if (!container || !canvas.width || !canvas.height) {
            return;
        }

        const groups = collectFinalColorGroupsV22();
        state.finalColorGroupsV22 = groups;

        if (groups.length <= 0) {
            container.innerHTML = `<div class="button-image-empty">정리할 좌석 색상이 없습니다.</div>`;
            return;
        }

        container.innerHTML = groups.map((group, index) => `
            <div class="button-image-color-merge-item" data-color-index="${index + 1}">
                <span class="button-image-color-merge-no">${index + 1}</span>
                <i style="background:${escapeHtml(group.hex)}"></i>
                <b>${escapeHtml(group.hex.toUpperCase())}</b>
                <small>${group.count.toLocaleString()}px</small>
            </div>
        `).join("");
    }

    function collectFinalColorGroupsV22() {
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = image.data;
        const groups = [];
        const minCount = 12;

        for (let i = 0; i < canvas.width * canvas.height; i += 1) {
            const offset = i * 4;
            if (data[offset + 3] < 10) {
                continue;
            }

            const pixel = {
                r: data[offset],
                g: data[offset + 1],
                b: data[offset + 2]
            };

            if (!isSeatLikeColorV19(pixel)) {
                continue;
            }

            let group = groups.find((item) => colorDistance(item.avg, pixel) <= 30);

            if (!group) {
                group = {
                    r: 0,
                    g: 0,
                    b: 0,
                    count: 0,
                    pixels: []
                };
                groups.push(group);
            }

            group.r += pixel.r;
            group.g += pixel.g;
            group.b += pixel.b;
            group.count += 1;
            group.pixels.push(i);
            group.avg = {
                r: group.r / group.count,
                g: group.g / group.count,
                b: group.b / group.count
            };
        }

        return groups
            .filter((group) => group.count >= minCount)
            .sort((a, b) => b.count - a.count)
            .map((group) => ({
                ...group,
                avg: {
                    r: Math.round(group.r / group.count),
                    g: Math.round(group.g / group.count),
                    b: Math.round(group.b / group.count)
                },
                hex: rgbToHex(group.r / group.count, group.g / group.count, group.b / group.count)
            }));
    }

    function mergeFinalColorGroupsV22() {
        const groups = state.finalColorGroupsV22 || collectFinalColorGroupsV22();
        const fromIndex = Math.max(1, parseInt($("colorMergeFrom")?.value || "0", 10)) - 1;
        const toIndex = Math.max(1, parseInt($("colorMergeTo")?.value || "0", 10)) - 1;

        if (fromIndex === toIndex || !groups[fromIndex] || !groups[toIndex]) {
            toast("병합할 색상 번호를 올바르게 입력하세요.");
            return;
        }

        const source = groups[fromIndex];
        const target = groups[toIndex];
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = image.data;
        let changed = 0;

        for (const index of source.pixels || []) {
            const offset = index * 4;
            data[offset] = target.avg.r;
            data[offset + 1] = target.avg.g;
            data[offset + 2] = target.avg.b;
            data[offset + 3] = 255;
            changed += 1;
        }

        ctx.putImageData(image, 0, 0);
        syncResultFromVisible();
        state.hasResult = true;
        state.saved = false;
        state.resultBaseDataUrl = canvas.toDataURL("image/png");
        pushHistory(`색상 ${fromIndex + 1} → ${toIndex + 1} 병합`);
        updateStats();
        renderFinalColorListV22();
        toast(`${fromIndex + 1}번 색상을 ${toIndex + 1}번 색상으로 병합했습니다. ${changed}픽셀 변경`);
    }

    function finalizeFinalImagePreviewV18() {
        if (!state.hasResult || !canvas.width || !canvas.height) {
            return;
        }

        state.finalPreview.enabled = false;
        state.finalPreview.dragging = false;
        state.finalPreview.dragRect = null;
        clearOverlay();
        syncResultFromVisible();
        state.resultBaseDataUrl = canvas.toDataURL("image/png");
    }

    function saveAndExit() {
        finalizeFinalImagePreviewV18();
        renderFinalColorListV22();
        saveButtonImageToServer();
    }


    // ============================================================================
    // v27 minimal patch
    // 기존 버튼/파트 기능은 유지하고, 아래 4개만 수술한다.
    // 1) 파트3: 클릭 색상 + 허용범위 추출에서 색상 제외 규칙 제거
    // 2) 파트3: 추출 후 실선 표시
    // 3) 파트4: 색상 컴포넌트 기반 병합 + 떨어진 구역 사이도 채움
    // 4) 파트5: 색상 번호 오버레이 + 저장 후 메인 이동
    // ============================================================================

    function getStep3ToleranceV27() {
        return Math.max(1, parseInt($("step3Tolerance")?.value || "48", 10));
    }

    function updateStep3ToleranceTextV27() {
        const input = $("step3Tolerance");
        const output = $("step3ToleranceText");

        if (input && output) {
            output.textContent = input.value;
        }
    }

    function onCanvasClick(event) {
        const point = getCanvasPoint(event);

        if (state.brush.pickColor) {
            event.preventDefault();
            if (point) {
                sampleBrushColorAt(point);
            }
            return;
        }

        // 파트3은 브러쉬/선택모드가 아니라 마술봉식 클릭 추출 단계다.
        if (state.currentStep === 3 && point && state.brush.mode === "none") {
            event.preventDefault();
            extractMagicColorAtPointV27(point);
            return;
        }

        if (state.brush.mode !== "none") {
            event.preventDefault();
            return;
        }

        if (state.finalPreview.enabled) {
            event.preventDefault();

            if (state.finalPreview.suppressClick) {
                state.finalPreview.suppressClick = false;
                return;
            }

            if (point) {
                selectFinalRegionByClickV17(point, event.shiftKey || event.ctrlKey || event.metaKey);
            }
            return;
        }

        if (!state.region.enabled || !point) {
            return;
        }

        event.preventDefault();
        selectRegionByClick(point, event.shiftKey, event.ctrlKey || event.metaKey);
    }

    function extractMagicColorAtPointV27(point) {
        if (!state.hasResult || !canvas.width || !canvas.height) {
            toast("먼저 파트 1에서 단색화 이미지를 생성하세요.");
            return;
        }

        const x = clamp(Math.round(point.x), 0, canvas.width - 1);
        const y = clamp(Math.round(point.y), 0, canvas.height - 1);
        const sampled = ctx.getImageData(x, y, 1, 1).data;
        const target = {
            r: sampled[0],
            g: sampled[1],
            b: sampled[2]
        };
        const hex = rgbToHex(target.r, target.g, target.b);

        state.region.color = hex;
        state.brush.color = hex;

        const regionColorInput = $("regionColorInput");
        const step3ColorInput = $("step3ColorInput");

        if (regionColorInput) {
            regionColorInput.value = hex;
        }

        if (step3ColorInput) {
            step3ColorInput.value = hex;
        }

        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const components = extractRegionsByPickedColorV21(image, canvas.width, canvas.height, target);

        if (!components.length) {
            drawExtractedRegionOutlineV27([]);
            toast("허용범위 안에서 추출된 구역이 없습니다.");
            return;
        }

        state.region.selected = components.map((component) => {
            const color = getDominantColorFromPixels(image, component.pixels);

            return {
                id: state.region.nextId++,
                role: component.role,
                pixels: component.pixels,
                bounds: component.bounds,
                color,
                colorHex: rgbToHex(color.r, color.g, color.b),
                gradeName: state.region.gradeName || getDefaultGradeName(component.role),
                pixelSet: new Set(component.pixels)
            };
        });

        const result = solidifySelectedRegionsAndRemoveTextV20(target);
        const preview = state.region.selected.map((region, index) => ({
            id: `extract-${index + 1}`,
            pixels: region.pixels || [],
            pixelSet: new Set(region.pixels || []),
            bounds: normalizeBoundsV27(region.bounds),
            color: target,
            colorHex: hex
        }));

        state.region.selected = [];
        state.__lastExtractedRegionsV27 = preview;
        syncResultFromVisible();
        state.hasResult = true;
        state.saved = false;
        state.resultBaseDataUrl = canvas.toDataURL("image/png");

        pushHistory("허용범위 색상 추출 + 재단색화");
        drawExtractedRegionOutlineV27(preview);
        updateRegionSelectionText();
        updateStats();

        toast(`${hex.toUpperCase()} 추출 완료: ${components.length}개 구역 / 단색화 ${result.painted}픽셀 / 글자 ${result.removed}픽셀`);
    }

    function extractRegionsByPickedColorV21(image, width, height, target) {
        const data = image.data;
        const visited = new Uint8Array(width * height);
        const queue = [];
        const components = [];
        const tolerance = getStep3ToleranceV27();
        const minArea = 10;

        function matches(index) {
            const offset = index * 4;

            if (data[offset + 3] < 10) {
                return false;
            }

            const pixel = {
                r: data[offset],
                g: data[offset + 1],
                b: data[offset + 2]
            };

            // 색상 제외 규칙 없음.
            // 흰색/검정/회색 포함, 클릭한 색상과 허용범위 안이면 전부 추출한다.
            return colorDistance(pixel, target) <= tolerance;
        }

        for (let start = 0; start < width * height; start += 1) {
            if (visited[start] || !matches(start)) {
                continue;
            }

            const component = {
                role: classifyColorRole(target.r, target.g, target.b, 255, getScanVariant("relaxed")),
                pixels: [],
                bounds: {
                    minX: Infinity,
                    minY: Infinity,
                    maxX: -Infinity,
                    maxY: -Infinity
                }
            };

            queue.length = 0;
            queue.push(start);
            visited[start] = 1;

            while (queue.length > 0) {
                const current = queue.pop();
                const x = current % width;
                const y = Math.floor(current / width);

                component.pixels.push(current);
                component.bounds.minX = Math.min(component.bounds.minX, x);
                component.bounds.minY = Math.min(component.bounds.minY, y);
                component.bounds.maxX = Math.max(component.bounds.maxX, x);
                component.bounds.maxY = Math.max(component.bounds.maxY, y);

                pushColorExtractNeighborV21(queue, visited, matches, width, height, x + 1, y);
                pushColorExtractNeighborV21(queue, visited, matches, width, height, x - 1, y);
                pushColorExtractNeighborV21(queue, visited, matches, width, height, x, y + 1);
                pushColorExtractNeighborV21(queue, visited, matches, width, height, x, y - 1);
                pushColorExtractNeighborV21(queue, visited, matches, width, height, x + 1, y + 1);
                pushColorExtractNeighborV21(queue, visited, matches, width, height, x - 1, y - 1);
                pushColorExtractNeighborV21(queue, visited, matches, width, height, x + 1, y - 1);
                pushColorExtractNeighborV21(queue, visited, matches, width, height, x - 1, y + 1);
            }

            if (component.pixels.length >= minArea) {
                component.bounds.width = component.bounds.maxX - component.bounds.minX + 1;
                component.bounds.height = component.bounds.maxY - component.bounds.minY + 1;
                components.push(component);
            }
        }

        components.sort((a, b) => b.pixels.length - a.pixels.length);
        return components.slice(0, 500);
    }

    function drawExtractedRegionOutlineV27(regions) {
        clearOverlay();

        if (!overlayCtx || !Array.isArray(regions) || !regions.length) {
            return;
        }

        overlayCtx.save();
        overlayCtx.strokeStyle = "rgba(124, 58, 237, 0.98)";
        overlayCtx.fillStyle = "rgba(124, 58, 237, 0.08)";
        overlayCtx.lineWidth = Math.max(1.5, 2.2 / Math.max(1, state.zoom));
        overlayCtx.setLineDash([7, 4]);

        for (const region of regions) {
            const b = region.bounds || {};
            overlayCtx.strokeRect(b.x, b.y, b.w, b.h);
            overlayCtx.fillRect(b.x, b.y, b.w, b.h);
        }

        overlayCtx.restore();
    }

    function normalizeBoundsV27(bounds) {
        if (!bounds) {
            return { x: 0, y: 0, w: 0, h: 0 };
        }

        if (Number.isFinite(bounds.x)) {
            return {
                x: bounds.x,
                y: bounds.y,
                w: bounds.w || bounds.width || 0,
                h: bounds.h || bounds.height || 0
            };
        }

        return {
            x: bounds.minX,
            y: bounds.minY,
            w: bounds.maxX - bounds.minX + 1,
            h: bounds.maxY - bounds.minY + 1
        };
    }

    function extractVisualComponentsV27(options = {}) {
        if (!canvas.width || !canvas.height) {
            return [];
        }

        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = image.data;
        const width = canvas.width;
        const height = canvas.height;
        const visited = new Uint8Array(width * height);
        const queue = [];
        const result = [];
        const tolerance = options.tolerance ?? 20;
        const minArea = options.minArea ?? 18;
        const maxArea = options.maxArea ?? Math.floor(width * height * 0.42);

        for (let start = 0; start < width * height; start += 1) {
            if (visited[start]) {
                continue;
            }

            const startOffset = start * 4;

            if (data[startOffset + 3] < 10) {
                visited[start] = 1;
                continue;
            }

            const base = {
                r: data[startOffset],
                g: data[startOffset + 1],
                b: data[startOffset + 2]
            };

            const component = {
                pixels: [],
                bounds: {
                    x: Infinity,
                    y: Infinity,
                    minX: Infinity,
                    minY: Infinity,
                    maxX: -Infinity,
                    maxY: -Infinity,
                    w: 0,
                    h: 0
                },
                color: base
            };

            queue.length = 0;
            queue.push(start);
            visited[start] = 1;

            while (queue.length > 0) {
                const current = queue.pop();
                const x = current % width;
                const y = Math.floor(current / width);

                component.pixels.push(current);
                component.bounds.minX = Math.min(component.bounds.minX, x);
                component.bounds.minY = Math.min(component.bounds.minY, y);
                component.bounds.maxX = Math.max(component.bounds.maxX, x);
                component.bounds.maxY = Math.max(component.bounds.maxY, y);

                pushVisualNeighborV27(queue, visited, data, width, height, x + 1, y, base, tolerance);
                pushVisualNeighborV27(queue, visited, data, width, height, x - 1, y, base, tolerance);
                pushVisualNeighborV27(queue, visited, data, width, height, x, y + 1, base, tolerance);
                pushVisualNeighborV27(queue, visited, data, width, height, x, y - 1, base, tolerance);
                pushVisualNeighborV27(queue, visited, data, width, height, x + 1, y + 1, base, tolerance);
                pushVisualNeighborV27(queue, visited, data, width, height, x - 1, y - 1, base, tolerance);
                pushVisualNeighborV27(queue, visited, data, width, height, x + 1, y - 1, base, tolerance);
                pushVisualNeighborV27(queue, visited, data, width, height, x - 1, y + 1, base, tolerance);
            }

            component.bounds.x = component.bounds.minX;
            component.bounds.y = component.bounds.minY;
            component.bounds.w = component.bounds.maxX - component.bounds.minX + 1;
            component.bounds.h = component.bounds.maxY - component.bounds.minY + 1;
            component.area = component.pixels.length;
            component.fillRatio = component.area / Math.max(1, component.bounds.w * component.bounds.h);

            // 색상으로 제외하지 않는다. 화면을 거의 덮는 배경 덩어리만 제외한다.
            if (component.area >= minArea && component.area <= maxArea && component.fillRatio >= 0.06) {
                const dominant = getDominantColorFromPixels(image, component.pixels);
                result.push({
                    id: `final-${result.length + 1}`,
                    pixels: component.pixels,
                    pixelSet: new Set(component.pixels),
                    bounds: component.bounds,
                    area: component.area,
                    color: dominant,
                    colorHex: rgbToHex(dominant.r, dominant.g, dominant.b)
                });
            }
        }

        result.sort((a, b) => Math.abs(a.bounds.y - b.bounds.y) > 10 ? a.bounds.y - b.bounds.y : a.bounds.x - b.bounds.x);
        result.forEach((region, index) => {
            region.id = `final-${index + 1}`;
        });

        return result;
    }

    function pushVisualNeighborV27(queue, visited, data, width, height, x, y, base, tolerance) {
        if (x < 0 || y < 0 || x >= width || y >= height) {
            return;
        }

        const index = y * width + x;

        if (visited[index]) {
            return;
        }

        const offset = index * 4;

        if (data[offset + 3] < 10) {
            visited[index] = 1;
            return;
        }

        const pixel = {
            r: data[offset],
            g: data[offset + 1],
            b: data[offset + 2]
        };

        if (colorDistance(pixel, base) > tolerance) {
            return;
        }

        visited[index] = 1;
        queue.push(index);
    }

    function rebuildFinalPreviewRegionsV17() {
        const regions = extractVisualComponentsV27({ minArea: 18, tolerance: 22 });
        state.finalPreview.regions = regions;
        state.finalPreview.componentCount = regions.length;
    }

    function showFinalSavePreview() {
        if (!state.hasResult) {
            toast("먼저 단색화 결과를 생성하세요.");
            return;
        }

        state.finalPreview.enabled = true;
        state.finalPreview.dragging = false;
        state.finalPreview.dragRect = null;
        state.finalPreview.selectedIds = state.finalPreview.selectedIds || [];

        setBrushMode("none", { silent: true });
        setColorPickerMode(false, { silent: true });

        rebuildFinalPreviewRegionsV17();
        drawFinalPreviewOverlayV17();
        updateFinalMergeToolUIV17();
    }

    function mergeSelectedFinalRegionsV17() {
        mergeFinalRegionsByIdsV17(state.finalPreview.selectedIds || [], "선택 구역 병합");
    }

    function mergeFinalRegionsByIdsV17(ids, label = "선택 구역 병합") {
        const uniqueIds = [...new Set(ids || [])];

        if (uniqueIds.length < 2) {
            toast("합칠 구역을 2개 이상 선택하세요.");
            return;
        }

        const targets = (state.finalPreview.regions || []).filter((region) => uniqueIds.includes(region.id));

        if (targets.length < 2) {
            toast("합칠 구역을 2개 이상 선택하세요.");
            return;
        }

        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = targets.flatMap((region) => region.pixels || []);
        const color = getDominantColorFromPixels(image, pixels);
        const hull = buildConvexHullForRegionsV27(targets);

        if (!hull || hull.length < 3) {
            toast("병합할 외곽을 계산하지 못했습니다.");
            return;
        }

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(hull[0].x, hull[0].y);

        for (let i = 1; i < hull.length; i += 1) {
            ctx.lineTo(hull[i].x, hull[i].y);
        }

        ctx.closePath();
        ctx.fillStyle = rgbToHex(color.r, color.g, color.b);
        ctx.fill();
        ctx.restore();

        syncResultFromVisible();
        state.hasResult = true;
        state.saved = false;
        state.resultBaseDataUrl = canvas.toDataURL("image/png");
        state.finalPreview.selectedIds = [];

        pushHistory(label);
        rebuildFinalPreviewRegionsV17();
        drawFinalPreviewOverlayV17();
        updateFinalMergeToolUIV17();
        updateStats();

        toast(`${targets.length}개 구역을 병합했습니다.`);
    }

    function buildConvexHullForRegionsV27(regions) {
        const points = [];

        for (const region of regions || []) {
            const b = region.bounds || {};

            points.push(
                { x: b.x, y: b.y },
                { x: b.x + b.w, y: b.y },
                { x: b.x + b.w, y: b.y + b.h },
                { x: b.x, y: b.y + b.h }
            );

            const pixels = region.pixels || [];
            const stride = Math.max(1, Math.floor(pixels.length / 160));

            for (let i = 0; i < pixels.length; i += stride) {
                const index = pixels[i];
                points.push({
                    x: index % canvas.width,
                    y: Math.floor(index / canvas.width)
                });
            }
        }

        return convexHullV27(points);
    }

    function convexHullV27(points) {
        const unique = [...new Map((points || [])
            .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
            .map((point) => [`${Math.round(point.x)},${Math.round(point.y)}`, {
                x: Math.round(point.x),
                y: Math.round(point.y)
            }])).values()];

        if (unique.length < 3) {
            return unique;
        }

        unique.sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);

        const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
        const lower = [];

        for (const point of unique) {
            while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
                lower.pop();
            }

            lower.push(point);
        }

        const upper = [];

        for (let i = unique.length - 1; i >= 0; i -= 1) {
            const point = unique[i];

            while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
                upper.pop();
            }

            upper.push(point);
        }

        upper.pop();
        lower.pop();

        return lower.concat(upper);
    }

    function collectFinalColorGroupsV22() {
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const regions = extractVisualComponentsV27({ minArea: 18, tolerance: 22 });
        const groups = [];

        for (const region of regions) {
            const color = region.color || getDominantColorFromPixels(image, region.pixels || []);
            let group = groups.find((item) => colorDistance(item.avg, color) <= 24);

            if (!group) {
                group = {
                    r: 0,
                    g: 0,
                    b: 0,
                    count: 0,
                    pixels: [],
                    components: [],
                    avg: color
                };
                groups.push(group);
            }

            const pixels = region.pixels || [];
            group.r += color.r * pixels.length;
            group.g += color.g * pixels.length;
            group.b += color.b * pixels.length;
            group.count += pixels.length;
            group.pixels.push(...pixels);
            group.components.push(region);
            group.avg = {
                r: group.r / Math.max(1, group.count),
                g: group.g / Math.max(1, group.count),
                b: group.b / Math.max(1, group.count)
            };
        }

        return groups
            .filter((group) => group.count >= 12)
            .sort((a, b) => b.count - a.count)
            .map((group) => ({
                ...group,
                avg: {
                    r: Math.round(group.r / group.count),
                    g: Math.round(group.g / group.count),
                    b: Math.round(group.b / group.count)
                },
                hex: rgbToHex(group.r / group.count, group.g / group.count, group.b / group.count)
            }));
    }

    function renderFinalColorListV22() {
        const container = $("finalColorList");

        if (!container || !canvas.width || !canvas.height) {
            return;
        }

        const groups = collectFinalColorGroupsV22();
        state.finalColorGroupsV22 = groups;

        if (groups.length <= 0) {
            container.innerHTML = `<div class="button-image-empty">정리할 색상이 없습니다.</div>`;
            clearOverlay();
            return;
        }

        container.innerHTML = groups.map((group, index) => `
            <div class="button-image-color-merge-item" data-color-index="${index + 1}">
                <span class="button-image-color-merge-no">${index + 1}</span>
                <i style="background:${escapeHtml(group.hex)}"></i>
                <b>${escapeHtml(group.hex.toUpperCase())}</b>
                <small>${group.count.toLocaleString()}px</small>
            </div>
        `).join("");

        drawFinalColorNumbersV27(groups);
    }

    function drawFinalColorNumbersV27(groups) {
        clearOverlay();

        if (!overlayCtx || !Array.isArray(groups)) {
            return;
        }

        overlayCtx.save();
        overlayCtx.textAlign = "center";
        overlayCtx.textBaseline = "middle";
        overlayCtx.font = "bold 13px sans-serif";

        groups.forEach((group, groupIndex) => {
            const number = String(groupIndex + 1);

            for (const component of (group.components || []).slice(0, 160)) {
                const b = component.bounds || {};
                const x = Math.round(b.x + b.w / 2);
                const y = Math.round(b.y + b.h / 2);

                overlayCtx.fillStyle = "rgba(255,255,255,0.96)";
                overlayCtx.strokeStyle = "rgba(15,23,42,0.82)";
                overlayCtx.lineWidth = 2;
                overlayCtx.beginPath();
                overlayCtx.arc(x, y, 9, 0, Math.PI * 2);
                overlayCtx.fill();
                overlayCtx.stroke();

                overlayCtx.fillStyle = "#111827";
                overlayCtx.fillText(number, x, y + 0.5);
            }
        });

        overlayCtx.restore();
    }

    function mergeFinalColorGroupsV22() {
        const groups = state.finalColorGroupsV22 || collectFinalColorGroupsV22();
        const fromIndex = Math.max(1, parseInt($("colorMergeFrom")?.value || "0", 10)) - 1;
        const toIndex = Math.max(1, parseInt($("colorMergeTo")?.value || "0", 10)) - 1;

        if (fromIndex === toIndex || !groups[fromIndex] || !groups[toIndex]) {
            toast("병합할 색상 번호를 올바르게 입력하세요.");
            return;
        }

        const source = groups[fromIndex];
        const target = groups[toIndex];
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = image.data;

        for (const index of source.pixels || []) {
            const offset = index * 4;
            data[offset] = target.avg.r;
            data[offset + 1] = target.avg.g;
            data[offset + 2] = target.avg.b;
            data[offset + 3] = 255;
        }

        ctx.putImageData(image, 0, 0);
        syncResultFromVisible();
        state.hasResult = true;
        state.saved = false;
        state.resultBaseDataUrl = canvas.toDataURL("image/png");

        pushHistory(`색상 ${fromIndex + 1} → ${toIndex + 1} 병합`);
        updateStats();
        renderFinalColorListV22();

        toast(`${fromIndex + 1}번 색상을 ${toIndex + 1}번 색상으로 병합했습니다.`);
    }

    function setStep(step) {
        const nextStep = Number(step) || 1;
        state.currentStep = nextStep;

        if (nextStep > 1 && !state.hasResult) {
            state.currentStep = 1;
            toast("먼저 파트 1에서 단색화 이미지를 생성하세요.");
            return;
        }

        if (nextStep !== 4) {
            state.finalPreview.enabled = false;
            state.finalPreview.dragging = false;
            state.finalPreview.dragRect = null;
        }

        document.querySelectorAll(".button-image-step").forEach((section) => {
            const itemStep = Number(section.dataset.step);
            const header = section.querySelector(".button-image-step__header");
            const status = section.querySelector(".button-image-step__status");

            section.classList.toggle("is-active", itemStep === nextStep);
            section.classList.toggle("is-done", itemStep < nextStep);

            if (header) {
                header.classList.toggle("active", itemStep === nextStep);
            }

            if (status) {
                if (itemStep < nextStep) {
                    status.textContent = "완료";
                } else if (itemStep === nextStep) {
                    status.textContent = nextStep === 1
                        ? "진행중"
                        : nextStep === 2
                            ? "보정중"
                            : nextStep === 3
                                ? "추출중"
                                : nextStep === 4
                                    ? "병합중"
                                    : "확인";
                } else {
                    status.textContent = "대기";
                }
            }
        });

        enableRegionSelectTool(false);
        setColorPickerMode(false, { silent: true });
        setBrushMode("none", { silent: true });

        if (nextStep === 1) {
            clearOverlay();
            updateRegionSelectionText();
            return;
        }

        if (nextStep === 2) {
            updateBrushSize();
            drawLiveRegionPreviewV18();
            updateRegionSelectionText();
            return;
        }

        if (nextStep === 3) {
            updateStep3ToleranceTextV27();

            // 파트2 기준 구역 실선 + 파트3에서 추가 추출한 실선을 함께 유지한다.
            drawAllStep3OutlinesV33();
            updateRegionSelectionText();
            return;
        }

        if (nextStep === 4) {
            showFinalSavePreview();
            return;
        }

        if (nextStep === 5) {
            state.finalPreview.enabled = false;
            finalizeFinalImagePreviewV18();
            renderFinalColorListV22();
        }
    }

    function saveAndExit() {
        finalizeFinalImagePreviewV18();

        Promise.resolve(saveButtonImageToServer()).then((ok) => {
            if (ok === false) {
                toast("저장 실패: 저장 API를 확인하세요.");
                return;
            }

            toast("저장 완료. 메인으로 이동합니다.");

            setTimeout(() => {
                window.location.href = app?.dataset.mainUrl || "/admin/seatmap/main";
            }, 180);
        }).catch((error) => {
            console.error(error);
            toast("저장 및 나가기 실패");
        });
    }

    function applyV27Patch() {
        updateStep3ToleranceTextV27();
        bindInput("step3Tolerance", updateStep3ToleranceTextV27);
    }

    setTimeout(applyV27Patch, 0);


    // ============================================================================
    // v29 patch: 파트3 회색/흰색/검정도 실제 구역처럼 보이게 재단색화 + 실선 표시
    // - 색상 제외 없음
    // - 화면 전체 배경처럼 너무 큰 덩어리만 크기/테두리 기준으로 제외
    // - 추출 후 bbox가 아니라 픽셀 외곽선을 실선처럼 표시
    // ============================================================================

    function extractMagicColorAtPointV27(point) {
        if (!state.hasResult || !canvas.width || !canvas.height) {
            toast("먼저 파트 1에서 단색화 이미지를 생성하세요.");
            return;
        }

        const x = clamp(Math.round(point.x), 0, canvas.width - 1);
        const y = clamp(Math.round(point.y), 0, canvas.height - 1);
        const sampled = ctx.getImageData(x, y, 1, 1).data;
        const target = {
            r: sampled[0],
            g: sampled[1],
            b: sampled[2]
        };
        const hex = rgbToHex(target.r, target.g, target.b);

        state.region.color = hex;
        state.brush.color = hex;

        const regionColorInput = $("regionColorInput");
        const step3ColorInput = $("step3ColorInput");

        if (regionColorInput) {
            regionColorInput.value = hex;
        }

        if (step3ColorInput) {
            step3ColorInput.value = hex;
        }

        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const clickedIndex = y * canvas.width + x;
        const components = extractRegionsByPickedColorV29(image, canvas.width, canvas.height, target, clickedIndex);

        if (!components.length) {
            drawExtractedRegionOutlineV29([]);
            toast("허용범위 안에서 추출된 구역이 없습니다.");
            return;
        }

        state.region.selected = components.map((component) => {
            const color = getDominantColorFromPixels(image, component.pixels);

            return {
                id: state.region.nextId++,
                role: component.role,
                pixels: component.pixels,
                bounds: component.bounds,
                color,
                colorHex: rgbToHex(color.r, color.g, color.b),
                gradeName: state.region.gradeName || getDefaultGradeName(component.role),
                pixelSet: new Set(component.pixels)
            };
        });

        const result = solidifySelectedRegionsAndRemoveTextV20(target);
        const preview = state.region.selected.map((region, index) => ({
            id: `extract-${index + 1}`,
            pixels: region.pixels || [],
            pixelSet: new Set(region.pixels || []),
            bounds: normalizeBoundsV27(region.bounds),
            color: target,
            colorHex: hex
        }));

        state.region.selected = [];
        state.__lastExtractedRegionsV29 = preview;
        syncResultFromVisible();
        state.hasResult = true;
        state.saved = false;
        state.resultBaseDataUrl = canvas.toDataURL("image/png");

        pushHistory("허용범위 색상 추출 + 재단색화");
        drawExtractedRegionOutlineV29(preview);
        updateRegionSelectionText();
        updateStats();

        toast(`${hex.toUpperCase()} 추출 완료: ${components.length}개 구역 / 단색화 ${result.painted}픽셀 / 글자 ${result.removed}픽셀`);
    }

    function extractRegionsByPickedColorV29(image, width, height, target, clickedIndex) {
        const data = image.data;
        const visited = new Uint8Array(width * height);
        const queue = [];
        const components = [];
        const tolerance = getStep3ToleranceV27();
        const minArea = 10;
        const maxArea = Math.floor(width * height * 0.38);

        function matches(index) {
            const offset = index * 4;

            if (data[offset + 3] < 10) {
                return false;
            }

            const pixel = {
                r: data[offset],
                g: data[offset + 1],
                b: data[offset + 2]
            };

            // 색상 제외 규칙 없음.
            // 흰색/검정/회색 포함, 클릭 색상과 허용범위 안이면 후보다.
            return colorDistance(pixel, target) <= tolerance;
        }

        for (let start = 0; start < width * height; start += 1) {
            if (visited[start] || !matches(start)) {
                continue;
            }

            const component = {
                role: classifyColorRole(target.r, target.g, target.b, 255, getScanVariant("relaxed")),
                pixels: [],
                bounds: {
                    minX: Infinity,
                    minY: Infinity,
                    maxX: -Infinity,
                    maxY: -Infinity
                },
                containsClicked: false
            };

            queue.length = 0;
            queue.push(start);
            visited[start] = 1;

            while (queue.length > 0) {
                const current = queue.pop();
                const x = current % width;
                const y = Math.floor(current / width);

                if (current === clickedIndex) {
                    component.containsClicked = true;
                }

                component.pixels.push(current);
                component.bounds.minX = Math.min(component.bounds.minX, x);
                component.bounds.minY = Math.min(component.bounds.minY, y);
                component.bounds.maxX = Math.max(component.bounds.maxX, x);
                component.bounds.maxY = Math.max(component.bounds.maxY, y);

                pushColorExtractNeighborV21(queue, visited, matches, width, height, x + 1, y);
                pushColorExtractNeighborV21(queue, visited, matches, width, height, x - 1, y);
                pushColorExtractNeighborV21(queue, visited, matches, width, height, x, y + 1);
                pushColorExtractNeighborV21(queue, visited, matches, width, height, x, y - 1);
                pushColorExtractNeighborV21(queue, visited, matches, width, height, x + 1, y + 1);
                pushColorExtractNeighborV21(queue, visited, matches, width, height, x - 1, y - 1);
                pushColorExtractNeighborV21(queue, visited, matches, width, height, x + 1, y - 1);
                pushColorExtractNeighborV21(queue, visited, matches, width, height, x - 1, y + 1);
            }

            component.bounds.width = component.bounds.maxX - component.bounds.minX + 1;
            component.bounds.height = component.bounds.maxY - component.bounds.minY + 1;
            component.area = component.pixels.length;

            const touches = [
                component.bounds.minX <= 1,
                component.bounds.minY <= 1,
                component.bounds.maxX >= width - 2,
                component.bounds.maxY >= height - 2
            ].filter(Boolean).length;

            const almostFullWidth = component.bounds.width >= width * 0.92;
            const almostFullHeight = component.bounds.height >= height * 0.92;
            const looksLikeWholeBackground = !component.containsClicked
                && (
                    component.area > maxArea ||
                    touches >= 3 ||
                    (almostFullWidth && almostFullHeight)
                );

            if (component.pixels.length >= minArea && !looksLikeWholeBackground) {
                components.push(component);
            }
        }

        // 클릭한 구역을 제일 먼저 보여주고, 나머지는 면적순.
        components.sort((a, b) => {
            if (a.containsClicked !== b.containsClicked) {
                return a.containsClicked ? -1 : 1;
            }

            return b.pixels.length - a.pixels.length;
        });

        return components.slice(0, 500);
    }

    function drawExtractedRegionOutlineV29(regions) {
        clearOverlay();

        if (!overlayCtx || !Array.isArray(regions) || !regions.length) {
            return;
        }

        overlayCtx.save();
        overlayCtx.strokeStyle = "rgba(124, 58, 237, 0.98)";
        overlayCtx.fillStyle = "rgba(124, 58, 237, 0.10)";
        overlayCtx.lineWidth = Math.max(1.3, 1.8 / Math.max(1, state.zoom));
        overlayCtx.setLineDash([]);

        for (const region of regions) {
            drawPixelRegionEdgesV29(region, "rgba(124, 58, 237, 0.98)");
            const b = region.bounds || {};
            overlayCtx.strokeStyle = "rgba(124, 58, 237, 0.45)";
            overlayCtx.strokeRect(b.x, b.y, b.w, b.h);
        }

        overlayCtx.restore();
    }

    function drawPixelRegionEdgesV29(region, color) {
        if (!region || !region.pixelSet || !region.pixels) {
            return;
        }

        const width = canvas.width;
        const height = canvas.height;
        const set = region.pixelSet;
        const step = Math.max(1, Math.floor(region.pixels.length / 50000));

        overlayCtx.fillStyle = color;

        for (let i = 0; i < region.pixels.length; i += step) {
            const index = region.pixels[i];
            const x = index % width;
            const y = Math.floor(index / width);

            const edge =
                x <= 0 || y <= 0 || x >= width - 1 || y >= height - 1 ||
                !set.has(index - 1) ||
                !set.has(index + 1) ||
                !set.has(index - width) ||
                !set.has(index + width);

            if (edge) {
                overlayCtx.fillRect(x, y, 1.2, 1.2);
            }
        }
    }


    // ============================================================================
    // v30 patch: 허용범위 1에서도 클릭 지점 색상 덩어리가 무조건 잡히게 수정
    // 원인: 기존 추출이 전체 색상 검색/분류 흐름을 타면서 회색 배경/구조물과 충돌했다.
    // 수정: 파트3은 클릭 지점을 seed로 하는 flood-fill을 먼저 수행한다.
    // ============================================================================

    function rgbDistanceV30(a, b) {
        const dr = Number(a.r || 0) - Number(b.r || 0);
        const dg = Number(a.g || 0) - Number(b.g || 0);
        const db = Number(a.b || 0) - Number(b.b || 0);

        return Math.sqrt((dr * dr) + (dg * dg) + (db * db));
    }

    function extractMagicColorAtPointV27(point) {
        if (!state.hasResult || !canvas.width || !canvas.height) {
            toast("먼저 파트 1에서 단색화 이미지를 생성하세요.");
            return;
        }

        const x = clamp(Math.round(point.x), 0, canvas.width - 1);
        const y = clamp(Math.round(point.y), 0, canvas.height - 1);
        const sampled = ctx.getImageData(x, y, 1, 1).data;
        const target = {
            r: sampled[0],
            g: sampled[1],
            b: sampled[2]
        };
        const hex = rgbToHex(target.r, target.g, target.b);

        state.region.color = hex;
        state.brush.color = hex;

        const regionColorInput = $("regionColorInput");
        const step3ColorInput = $("step3ColorInput");

        if (regionColorInput) {
            regionColorInput.value = hex;
        }

        if (step3ColorInput) {
            step3ColorInput.value = hex;
        }

        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const clickedIndex = y * canvas.width + x;
        const component = floodFillFromClickedPixelV30(image, canvas.width, canvas.height, target, clickedIndex);

        if (!component || component.pixels.length <= 0) {
            drawExtractedRegionOutlineV29([]);
            toast(`${hex.toUpperCase()} 주변에서 추출된 구역이 없습니다.`);
            return;
        }

        state.region.selected = [{
            id: state.region.nextId++,
            role: classifyColorRole(target.r, target.g, target.b, 255, getScanVariant("relaxed")),
            pixels: component.pixels,
            bounds: component.bounds,
            color: target,
            colorHex: hex,
            gradeName: state.region.gradeName || "TEMP",
            pixelSet: new Set(component.pixels)
        }];

        const result = solidifySelectedRegionsAndRemoveTextV20(target);
        const preview = state.region.selected.map((region, index) => ({
            id: `extract-${index + 1}`,
            pixels: region.pixels || [],
            pixelSet: new Set(region.pixels || []),
            bounds: normalizeBoundsV27(region.bounds),
            color: target,
            colorHex: hex
        }));

        state.region.selected = [];
        state.__lastExtractedRegionsV30 = preview;
        syncResultFromVisible();
        state.hasResult = true;
        state.saved = false;
        state.resultBaseDataUrl = canvas.toDataURL("image/png");

        pushHistory("클릭 지점 색상 추출 + 재단색화");
        drawExtractedRegionOutlineV29(preview);
        updateRegionSelectionText();
        updateStats();

        toast(`${hex.toUpperCase()} 추출 완료: ${component.pixels.length.toLocaleString()}픽셀 / 글자 ${result.removed}픽셀`);
    }

    function floodFillFromClickedPixelV30(image, width, height, target, clickedIndex) {
        const data = image.data;
        const tolerance = Math.max(0, getStep3ToleranceV27());
        const visited = new Uint8Array(width * height);
        const queue = [clickedIndex];
        const pixels = [];
        const bounds = {
            minX: Infinity,
            minY: Infinity,
            maxX: -Infinity,
            maxY: -Infinity
        };

        visited[clickedIndex] = 1;

        while (queue.length > 0) {
            const current = queue.pop();
            const offset = current * 4;

            if (data[offset + 3] < 10) {
                continue;
            }

            const pixel = {
                r: data[offset],
                g: data[offset + 1],
                b: data[offset + 2]
            };

            if (rgbDistanceV30(pixel, target) > tolerance) {
                continue;
            }

            const x = current % width;
            const y = Math.floor(current / width);

            pixels.push(current);
            bounds.minX = Math.min(bounds.minX, x);
            bounds.minY = Math.min(bounds.minY, y);
            bounds.maxX = Math.max(bounds.maxX, x);
            bounds.maxY = Math.max(bounds.maxY, y);

            pushSeedNeighborV30(queue, visited, width, height, x + 1, y);
            pushSeedNeighborV30(queue, visited, width, height, x - 1, y);
            pushSeedNeighborV30(queue, visited, width, height, x, y + 1);
            pushSeedNeighborV30(queue, visited, width, height, x, y - 1);
            pushSeedNeighborV30(queue, visited, width, height, x + 1, y + 1);
            pushSeedNeighborV30(queue, visited, width, height, x - 1, y - 1);
            pushSeedNeighborV30(queue, visited, width, height, x + 1, y - 1);
            pushSeedNeighborV30(queue, visited, width, height, x - 1, y + 1);
        }

        if (pixels.length <= 0) {
            return null;
        }

        bounds.width = bounds.maxX - bounds.minX + 1;
        bounds.height = bounds.maxY - bounds.minY + 1;

        return {
            pixels,
            pixelSet: new Set(pixels),
            bounds,
            area: pixels.length
        };
    }

    function pushSeedNeighborV30(queue, visited, width, height, x, y) {
        if (x < 0 || y < 0 || x >= width || y >= height) {
            return;
        }

        const index = y * width + x;

        if (visited[index]) {
            return;
        }

        visited[index] = 1;
        queue.push(index);
    }


    // ============================================================================
    // v31 patch: 파트3 추출 실선은 "교체"가 아니라 "추가"로 그린다.
    // 기존 파트2 기준 구역 실선을 먼저 다시 그리고, 그 위에 새 추출 구역 실선을 추가한다.
    // ============================================================================

    function drawExtractedRegionOutlineV29(regions) {
        // 기존 파트2 기준 구역 실선 유지
        drawLiveRegionPreviewV18();

        if (!overlayCtx || !Array.isArray(regions) || !regions.length) {
            return;
        }

        overlayCtx.save();
        overlayCtx.strokeStyle = "rgba(124, 58, 237, 0.98)";
        overlayCtx.fillStyle = "rgba(124, 58, 237, 0.10)";
        overlayCtx.lineWidth = Math.max(1.4, 2 / Math.max(1, state.zoom));
        overlayCtx.setLineDash([]);

        for (const region of regions) {
            drawPixelRegionEdgesV29(region, "rgba(124, 58, 237, 0.98)");

            const b = region.bounds || {};
            overlayCtx.strokeStyle = "rgba(124, 58, 237, 0.65)";
            overlayCtx.strokeRect(b.x, b.y, b.w, b.h);
        }

        overlayCtx.restore();
    }


    // ============================================================================
    // v32 patch: 단계 되돌아가기 버튼
    // 파트 이동 시 작업 자체를 undo 하지 않고, 화면 단계만 이전 파트로 이동한다.
    // ============================================================================

    function applyV32BackButtons() {
        const backToStep2 = $("backToStep2FromStep3");
        if (backToStep2 && !backToStep2.dataset.boundV32) {
            backToStep2.dataset.boundV32 = "true";
            backToStep2.addEventListener("click", (event) => {
                event.preventDefault();
                setStep(2);
            });
        }

        const backToStep3 = $("backToStep3FromStep4");
        if (backToStep3 && !backToStep3.dataset.boundV32) {
            backToStep3.dataset.boundV32 = "true";
            backToStep3.addEventListener("click", (event) => {
                event.preventDefault();
                setStep(3);
            });
        }
    }

    setTimeout(applyV32BackButtons, 0);


    // ============================================================================
    // v33 patch: 파트3 실선 누적 + 이전 작업 되돌리기
    // - 새 색상 추출 시 기존 실선을 지우지 않고 누적 표시
    // - 잘못 추출했을 때 "이전 작업 되돌리기"로 직전 추출만 되돌림
    // ============================================================================

    function ensureStep3OutlineStoreV33() {
        if (!Array.isArray(state.__step3ExtractedOutlinesV33)) {
            state.__step3ExtractedOutlinesV33 = [];
        }

        return state.__step3ExtractedOutlinesV33;
    }

    function drawAllStep3OutlinesV33() {
        // 기준 구역 실선 먼저 그림
        drawLiveRegionPreviewV18();

        const groups = ensureStep3OutlineStoreV33();

        if (!overlayCtx || groups.length <= 0) {
            return;
        }

        overlayCtx.save();

        for (const group of groups) {
            drawStep3OutlineGroupV33(group);
        }

        overlayCtx.restore();
    }

    function drawStep3OutlineGroupV33(group) {
        if (!Array.isArray(group)) {
            return;
        }

        overlayCtx.strokeStyle = "rgba(124, 58, 237, 0.98)";
        overlayCtx.fillStyle = "rgba(124, 58, 237, 0.10)";
        overlayCtx.lineWidth = Math.max(1.4, 2 / Math.max(1, state.zoom));
        overlayCtx.setLineDash([]);

        for (const region of group) {
            drawPixelRegionEdgesV29(region, "rgba(124, 58, 237, 0.98)");

            const b = region.bounds || {};
            overlayCtx.strokeStyle = "rgba(124, 58, 237, 0.70)";
            overlayCtx.strokeRect(b.x, b.y, b.w, b.h);
        }
    }

    function drawExtractedRegionOutlineV29(regions) {
        const store = ensureStep3OutlineStoreV33();

        if (Array.isArray(regions) && regions.length > 0) {
            store.push(regions);
        }

        drawAllStep3OutlinesV33();
    }

    function extractMagicColorAtPointV27(point) {
        if (!state.hasResult || !canvas.width || !canvas.height) {
            toast("먼저 파트 1에서 단색화 이미지를 생성하세요.");
            return;
        }

        const x = clamp(Math.round(point.x), 0, canvas.width - 1);
        const y = clamp(Math.round(point.y), 0, canvas.height - 1);
        const sampled = ctx.getImageData(x, y, 1, 1).data;
        const target = {
            r: sampled[0],
            g: sampled[1],
            b: sampled[2]
        };
        const hex = rgbToHex(target.r, target.g, target.b);

        state.region.color = hex;
        state.brush.color = hex;

        const regionColorInput = $("regionColorInput");
        const step3ColorInput = $("step3ColorInput");

        if (regionColorInput) {
            regionColorInput.value = hex;
        }

        if (step3ColorInput) {
            step3ColorInput.value = hex;
        }

        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const clickedIndex = y * canvas.width + x;
        const component = floodFillFromClickedPixelV30(image, canvas.width, canvas.height, target, clickedIndex);

        if (!component || component.pixels.length <= 0) {
            toast(`${hex.toUpperCase()} 주변에서 추출된 구역이 없습니다.`);
            return;
        }

        // 첫 추출도 되돌릴 수 있게 수정 직전 상태를 같은 파트 history에 저장
        pushHistory("색상 추출 전");

        state.region.selected = [{
            id: state.region.nextId++,
            role: classifyColorRole(target.r, target.g, target.b, 255, getScanVariant("relaxed")),
            pixels: component.pixels,
            bounds: component.bounds,
            color: target,
            colorHex: hex,
            gradeName: state.region.gradeName || "TEMP",
            pixelSet: new Set(component.pixels)
        }];

        const result = solidifySelectedRegionsAndRemoveTextV20(target);
        const preview = state.region.selected.map((region, index) => ({
            id: `extract-${index + 1}`,
            pixels: region.pixels || [],
            pixelSet: new Set(region.pixels || []),
            bounds: normalizeBoundsV27(region.bounds),
            color: target,
            colorHex: hex
        }));

        state.region.selected = [];
        state.__lastExtractedRegionsV33 = preview;
        syncResultFromVisible();
        state.hasResult = true;
        state.saved = false;
        state.resultBaseDataUrl = canvas.toDataURL("image/png");

        pushHistory("클릭 지점 색상 추출 + 재단색화");
        drawExtractedRegionOutlineV29(preview);
        updateRegionSelectionText();
        updateStats();

        toast(`${hex.toUpperCase()} 추출 완료: ${component.pixels.length.toLocaleString()}픽셀 / 글자 ${result.removed}픽셀`);
    }

    function undoStep3LastActionV33() {
        if (state.currentStep !== 3) {
            return;
        }

        const store = ensureStep3OutlineStoreV33();

        if (store.length > 0) {
            store.pop();
        }

        undo();

        // undo는 이미지 복원이 비동기라서 복원 후 실선 다시 그림
        setTimeout(() => {
            syncResultFromVisible();
            drawAllStep3OutlinesV33();
            updateStats();
        }, 80);
    }

    function applyV33Step3Undo() {
        const undoButton = $("undoStep3Action");

        if (undoButton && !undoButton.dataset.boundV33) {
            undoButton.dataset.boundV33 = "true";
            undoButton.addEventListener("click", (event) => {
                event.preventDefault();
                undoStep3LastActionV33();
            });
        }
    }

    setTimeout(applyV33Step3Undo, 0);


    // ============================================================================
    // v34 patch: 상단 command-bar 이전 버튼 + 저장 groups R1~ 동적 생성
    // ============================================================================

    function undo() {
        const targetIndex = findHistoryIndexInCurrentStep(-1);

        if (targetIndex < 0) {
            updateHistoryButtons();
            return;
        }

        // 파트3에서 추가 추출한 보라 실선도 직전 작업과 같이 하나 제거한다.
        if (state.currentStep === 3 && Array.isArray(state.__step3ExtractedOutlinesV33) && state.__step3ExtractedOutlinesV33.length > 0) {
            state.__step3ExtractedOutlinesV33.pop();
        }

        state.historyIndex = targetIndex;
        restoreHistory(state.history[state.historyIndex]);

        setTimeout(() => {
            if (state.currentStep === 3 && typeof drawAllStep3OutlinesV33 === "function") {
                drawAllStep3OutlinesV33();
            } else if (state.currentStep === 4 && state.finalPreview?.enabled) {
                drawFinalPreviewOverlayV17();
            }
            updateHistoryButtons();
        }, 80);
    }

    function buildGeneratedRegionGroupsForSave() {
        const items = collectRegionColorGroupsForSaveV34();

        if (!items.length) {
            return [];
        }

        return items.map((item, index) => {
            const code = `R${index + 1}`;

            return {
                id: code,
                name: `구역 ${code}`,
                gradeName: code,
                color: item.hex,
                pixelCount: item.count,
                bounds: item.bounds
            };
        });
    }

    function collectRegionColorGroupsForSaveV34() {
        if (!canvas || !canvas.width || !canvas.height) {
            return [];
        }

        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = image.data;
        const width = canvas.width;
        const height = canvas.height;
        const buckets = new Map();

        for (let i = 0; i < width * height; i += 1) {
            const offset = i * 4;

            if (data[offset + 3] < 10) {
                continue;
            }

            const r = data[offset];
            const g = data[offset + 1];
            const b = data[offset + 2];
            const key = rgbToHex(r, g, b).toUpperCase();

            let bucket = buckets.get(key);

            if (!bucket) {
                bucket = {
                    hex: key,
                    count: 0,
                    minX: Infinity,
                    minY: Infinity,
                    maxX: -Infinity,
                    maxY: -Infinity
                };
                buckets.set(key, bucket);
            }

            const x = i % width;
            const y = Math.floor(i / width);

            bucket.count += 1;
            bucket.minX = Math.min(bucket.minX, x);
            bucket.minY = Math.min(bucket.minY, y);
            bucket.maxX = Math.max(bucket.maxX, x);
            bucket.maxY = Math.max(bucket.maxY, y);
        }

        return [...buckets.values()]
            .filter((bucket) => bucket.count >= 30)
            .sort((a, b) => b.count - a.count)
            .slice(0, 100)
            .map((bucket) => ({
                hex: bucket.hex,
                count: bucket.count,
                bounds: {
                    x: bucket.minX,
                    y: bucket.minY,
                    w: bucket.maxX - bucket.minX + 1,
                    h: bucket.maxY - bucket.minY + 1
                }
            }));
    }


    // ============================================================================
    // v35 patch: 파트3에서 추가 추출한 구역을 파트4 병합 목록에 합류
    // - 파트2 기준 실선: 계속 표시
    // - 파트3 추가 실선: 계속 표시
    // - 파트4: 기준 구역 + 추가 구역 전부 selectable/merge 대상
    // ============================================================================

    function flattenStep3ExtractedRegionsV35() {
        const groups = Array.isArray(state.__step3ExtractedOutlinesV33)
            ? state.__step3ExtractedOutlinesV33
            : [];

        const result = [];

        groups.forEach((group, groupIndex) => {
            if (!Array.isArray(group)) {
                return;
            }

            group.forEach((region, regionIndex) => {
                const pixels = Array.isArray(region.pixels) ? region.pixels : [];
                const bounds = normalizeBoundsV27(region.bounds);

                if (pixels.length <= 0) {
                    return;
                }

                result.push({
                    id: `step3-${groupIndex + 1}-${regionIndex + 1}`,
                    pixels,
                    pixelSet: new Set(pixels),
                    bounds,
                    area: pixels.length,
                    color: region.color || hexToRgb(region.colorHex || state.region.color || "#7c3aed"),
                    colorHex: region.colorHex || state.region.color || "#7c3aed",
                    fromStep3: true
                });
            });
        });

        return result;
    }

    function appendStep3RegionsToFinalPreviewV35() {
        const baseRegions = Array.isArray(state.finalPreview.regions)
            ? state.finalPreview.regions
            : [];
        const step3Regions = flattenStep3ExtractedRegionsV35();

        if (step3Regions.length <= 0) {
            state.finalPreview.regions = baseRegions;
            state.finalPreview.componentCount = baseRegions.length;
            return;
        }

        const existingKeys = new Set(baseRegions.map((region) => {
            const b = region.bounds || {};
            return `${Math.round(b.x)}:${Math.round(b.y)}:${Math.round(b.w)}:${Math.round(b.h)}`;
        }));

        const merged = [...baseRegions];

        for (const region of step3Regions) {
            const b = region.bounds || {};
            const key = `${Math.round(b.x)}:${Math.round(b.y)}:${Math.round(b.w)}:${Math.round(b.h)}`;

            if (!existingKeys.has(key)) {
                merged.push(region);
                existingKeys.add(key);
            }
        }

        state.finalPreview.regions = merged;
        state.finalPreview.componentCount = merged.length;
    }

    function showFinalSavePreview() {
        if (!state.hasResult) {
            toast("먼저 단색화 결과를 생성하세요.");
            return;
        }

        state.finalPreview.enabled = true;
        state.finalPreview.dragging = false;
        state.finalPreview.dragRect = null;
        state.finalPreview.selectedIds = state.finalPreview.selectedIds || [];

        setBrushMode("none", { silent: true });
        setColorPickerMode(false, { silent: true });

        rebuildFinalPreviewRegionsV17();
        appendStep3RegionsToFinalPreviewV35();
        drawFinalPreviewOverlayV17();
        updateFinalMergeToolUIV17();
    }

    function drawFinalPreviewOverlayV17() {
        clearOverlay();

        if (!overlayCtx || !overlay) {
            return;
        }

        const selected = new Set(state.finalPreview.selectedIds || []);
        overlayCtx.save();

        for (const region of state.finalPreview.regions || []) {
            const isSelected = selected.has(region.id);
            const isStep3 = Boolean(region.fromStep3);

            drawFinalRegionBoundaryV17(
                region,
                isSelected
                    ? "rgba(124, 58, 237, 0.98)"
                    : isStep3
                        ? "rgba(124, 58, 237, 0.86)"
                        : "rgba(15, 23, 42, 0.88)",
                isSelected ? 2.8 : isStep3 ? 1.8 : 1.4
            );

            if (isSelected) {
                overlayCtx.fillStyle = "rgba(124, 58, 237, 0.10)";
                overlayCtx.fillRect(region.bounds.x, region.bounds.y, region.bounds.w, region.bounds.h);
            }
        }

        if (state.finalPreview.dragRect) {
            const rect = state.finalPreview.dragRect;
            overlayCtx.save();
            overlayCtx.strokeStyle = "rgba(37, 99, 235, 0.95)";
            overlayCtx.fillStyle = "rgba(37, 99, 235, 0.08)";
            overlayCtx.lineWidth = 2;
            overlayCtx.setLineDash([7, 5]);
            overlayCtx.fillRect(rect.x, rect.y, rect.w, rect.h);
            overlayCtx.strokeRect(rect.x, rect.y, rect.w, rect.h);
            overlayCtx.restore();
        }

        overlayCtx.restore();
    }

    function setStep(step) {
        const nextStep = Number(step) || 1;
        state.currentStep = nextStep;

        if (nextStep > 1 && !state.hasResult) {
            state.currentStep = 1;
            toast("먼저 파트 1에서 단색화 이미지를 생성하세요.");
            return;
        }

        if (nextStep !== 4) {
            state.finalPreview.enabled = false;
            state.finalPreview.dragging = false;
            state.finalPreview.dragRect = null;
        }

        document.querySelectorAll(".button-image-step").forEach((section) => {
            const itemStep = Number(section.dataset.step);
            const header = section.querySelector(".button-image-step__header");
            const status = section.querySelector(".button-image-step__status");

            section.classList.toggle("is-active", itemStep === nextStep);
            section.classList.toggle("is-done", itemStep < nextStep);

            if (header) {
                header.classList.toggle("active", itemStep === nextStep);
            }

            if (status) {
                if (itemStep < nextStep) {
                    status.textContent = "완료";
                } else if (itemStep === nextStep) {
                    status.textContent = nextStep === 1
                        ? "진행중"
                        : nextStep === 2
                            ? "보정중"
                            : nextStep === 3
                                ? "추출중"
                                : nextStep === 4
                                    ? "병합중"
                                    : "확인";
                } else {
                    status.textContent = "대기";
                }
            }
        });

        enableRegionSelectTool(false);
        setColorPickerMode(false, { silent: true });
        setBrushMode("none", { silent: true });

        if (nextStep === 1) {
            clearOverlay();
            updateRegionSelectionText();
            return;
        }

        if (nextStep === 2) {
            updateBrushSize();
            drawLiveRegionPreviewV18();
            updateRegionSelectionText();
            return;
        }

        if (nextStep === 3) {
            updateStep3ToleranceTextV27();
            drawAllStep3OutlinesV33();
            updateRegionSelectionText();
            return;
        }

        if (nextStep === 4) {
            showFinalSavePreview();
            return;
        }

        if (nextStep === 5) {
            state.finalPreview.enabled = false;
            finalizeFinalImagePreviewV18();

            // 최종 색상 정리 단계에서도 구역 확인선을 먼저 계산한 뒤 색상 번호를 올린다.
            renderFinalColorListV22();
        }
    }


    // ============================================================================
    // v36 patch
    // 1. 파트4에서는 파트3 보라색 임시 실선/박스를 제거하고 일반 구역 실선만 표시
    // 2. 파트5 색상 목록/번호/병합/저장을 실제 동작하도록 재구성
    // 3. 상단 이전은 캔버스 + 파트3 실선 개수를 함께 되돌림
    // ============================================================================

    function cloneStep3OutlineCountV36() {
        return Array.isArray(state.__step3ExtractedOutlinesV33)
            ? state.__step3ExtractedOutlinesV33.length
            : 0;
    }

    function pushHistory(label) {
        if (!canvas.width || !canvas.height) {
            return;
        }

        const snapshot = {
            label,
            visible: canvas.toDataURL("image/png"),
            hasResult: state.hasResult,
            saved: state.saved,
            resultBaseDataUrl: state.resultBaseDataUrl,
            stats: state.lastStats ? clone(state.lastStats) : null,
            step: state.currentStep || 1,
            step3OutlineCount: cloneStep3OutlineCountV36()
        };

        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push(snapshot);

        if (state.history.length > 30) {
            state.history.shift();
        }

        state.historyIndex = state.history.length - 1;
        updateHistoryButtons();
    }

    function restoreHistory(snapshot) {
        drawDataUrlToCanvas(snapshot.visible, canvas, ctx).then(() => {
            if (overlay) {
                overlay.width = canvas.width;
                overlay.height = canvas.height;
            }

            state.hasResult = snapshot.hasResult;
            state.saved = snapshot.saved;
            state.resultBaseDataUrl = snapshot.resultBaseDataUrl;
            state.lastStats = snapshot.stats;

            if (Array.isArray(state.__step3ExtractedOutlinesV33) && Number.isFinite(snapshot.step3OutlineCount)) {
                state.__step3ExtractedOutlinesV33 = state.__step3ExtractedOutlinesV33.slice(0, snapshot.step3OutlineCount);
            }

            syncCanvasDisplay();
            syncResultFromVisible();
            updateStats();
            renderLegend(state.lastStats);

            if (state.currentStep === 3 && typeof drawAllStep3OutlinesV33 === "function") {
                drawAllStep3OutlinesV33();
            } else if (state.currentStep === 4 && state.finalPreview?.enabled) {
                showFinalSavePreview();
            } else if (state.currentStep === 5) {
                renderFinalColorListV22();
            } else {
                clearOverlay();
            }

            updateHistoryButtons();
        });
    }

    function undo() {
        const targetIndex = findHistoryIndexInCurrentStep(-1);

        if (targetIndex < 0) {
            updateHistoryButtons();
            return;
        }

        state.historyIndex = targetIndex;
        restoreHistory(state.history[state.historyIndex]);
    }

    function showFinalSavePreview() {
        if (!state.hasResult) {
            toast("먼저 단색화 결과를 생성하세요.");
            return;
        }

        state.finalPreview.enabled = true;
        state.finalPreview.dragging = false;
        state.finalPreview.dragRect = null;
        state.finalPreview.selectedIds = state.finalPreview.selectedIds || [];

        setBrushMode("none", { silent: true });
        setColorPickerMode(false, { silent: true });

        // 핵심: 파트4는 파트3 보라색 임시 박스를 가져오지 않는다.
        // 현재 캔버스에 실제로 칠해진 구역만 다시 계산해서 일반 실선으로 표시한다.
        rebuildFinalPreviewRegionsV17();
        drawFinalPreviewOverlayV17();
        updateFinalMergeToolUIV17();
    }

    function drawFinalPreviewOverlayV17() {
        clearOverlay();

        if (!overlayCtx || !overlay) {
            return;
        }

        const selected = new Set(state.finalPreview.selectedIds || []);

        overlayCtx.save();

        for (const region of state.finalPreview.regions || []) {
            const isSelected = selected.has(region.id);

            drawFinalRegionBoundaryV17(
                region,
                isSelected ? "rgba(124, 58, 237, 0.98)" : "rgba(15, 23, 42, 0.86)",
                isSelected ? 2.8 : 1.45
            );

            if (isSelected) {
                overlayCtx.fillStyle = "rgba(124, 58, 237, 0.10)";
                overlayCtx.fillRect(region.bounds.x, region.bounds.y, region.bounds.w, region.bounds.h);
            }
        }

        if (state.finalPreview.dragRect) {
            const rect = state.finalPreview.dragRect;
            overlayCtx.save();
            overlayCtx.strokeStyle = "rgba(37, 99, 235, 0.95)";
            overlayCtx.fillStyle = "rgba(37, 99, 235, 0.08)";
            overlayCtx.lineWidth = 2;
            overlayCtx.setLineDash([7, 5]);
            overlayCtx.fillRect(rect.x, rect.y, rect.w, rect.h);
            overlayCtx.strokeRect(rect.x, rect.y, rect.w, rect.h);
            overlayCtx.restore();
        }

        overlayCtx.restore();
    }

    function ensureFinalRegionsForColorsV36() {
        if (!Array.isArray(state.finalPreview.regions) || state.finalPreview.regions.length <= 0) {
            rebuildFinalPreviewRegionsV17();
        }

        return Array.isArray(state.finalPreview.regions)
            ? state.finalPreview.regions
            : [];
    }

    function collectFinalColorGroupsV22() {
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const regions = ensureFinalRegionsForColorsV36();
        const groups = [];

        for (const region of regions) {
            const pixels = Array.isArray(region.pixels) ? region.pixels : [];

            if (pixels.length <= 0) {
                continue;
            }

            const color = getDominantColorFromPixels(image, pixels);
            let group = groups.find((item) => colorDistance(item.avg, color) <= 24);

            if (!group) {
                group = {
                    r: 0,
                    g: 0,
                    b: 0,
                    count: 0,
                    pixels: [],
                    components: [],
                    avg: color
                };
                groups.push(group);
            }

            group.r += color.r * pixels.length;
            group.g += color.g * pixels.length;
            group.b += color.b * pixels.length;
            group.count += pixels.length;
            group.pixels.push(...pixels);
            group.components.push({
                ...region,
                color,
                colorHex: rgbToHex(color.r, color.g, color.b)
            });
            group.avg = {
                r: group.r / Math.max(1, group.count),
                g: group.g / Math.max(1, group.count),
                b: group.b / Math.max(1, group.count)
            };
        }

        return groups
            .filter((group) => group.count >= 8)
            .sort((a, b) => b.count - a.count)
            .map((group) => ({
                ...group,
                avg: {
                    r: Math.round(group.r / group.count),
                    g: Math.round(group.g / group.count),
                    b: Math.round(group.b / group.count)
                },
                hex: rgbToHex(group.r / group.count, group.g / group.count, group.b / group.count)
            }));
    }

    function renderFinalColorListV22() {
        const container = $("finalColorList");

        if (!container) {
            return;
        }

        if (!canvas.width || !canvas.height) {
            container.innerHTML = `<div class="button-image-empty">캔버스가 없습니다.</div>`;
            return;
        }

        const groups = collectFinalColorGroupsV22();
        state.finalColorGroupsV22 = groups;

        if (groups.length <= 0) {
            container.innerHTML = `<div class="button-image-empty">정리할 색상이 없습니다. 구역 병합 단계로 돌아가 구역 실선을 먼저 확인하세요.</div>`;
            clearOverlay();
            return;
        }

        container.innerHTML = groups.map((group, index) => `
            <div class="button-image-color-merge-item" data-color-index="${index + 1}">
                <span class="button-image-color-merge-no">${index + 1}</span>
                <i style="background:${escapeHtml(group.hex)}"></i>
                <b>${escapeHtml(group.hex.toUpperCase())}</b>
                <small>${group.components.length.toLocaleString()}구역 / ${group.count.toLocaleString()}px</small>
            </div>
        `).join("");

        drawFinalColorNumbersV36(groups);
    }

    function drawFinalColorNumbersV36(groups) {
        clearOverlay();

        if (!overlayCtx || !Array.isArray(groups)) {
            return;
        }

        overlayCtx.save();
        overlayCtx.textAlign = "center";
        overlayCtx.textBaseline = "middle";
        overlayCtx.font = "bold 13px sans-serif";

        groups.forEach((group, groupIndex) => {
            const number = String(groupIndex + 1);

            for (const component of (group.components || []).slice(0, 180)) {
                const b = component.bounds || {};
                const x = Math.round(b.x + b.w / 2);
                const y = Math.round(b.y + b.h / 2);

                overlayCtx.fillStyle = "rgba(255,255,255,0.96)";
                overlayCtx.strokeStyle = "rgba(15,23,42,0.82)";
                overlayCtx.lineWidth = 2;
                overlayCtx.beginPath();
                overlayCtx.arc(x, y, 9, 0, Math.PI * 2);
                overlayCtx.fill();
                overlayCtx.stroke();

                overlayCtx.fillStyle = "#111827";
                overlayCtx.fillText(number, x, y + 0.5);
            }
        });

        overlayCtx.restore();
    }

    function mergeFinalColorGroupsV22() {
        const groups = state.finalColorGroupsV22 || collectFinalColorGroupsV22();
        const fromIndex = Math.max(1, parseInt($("colorMergeFrom")?.value || "0", 10)) - 1;
        const toIndex = Math.max(1, parseInt($("colorMergeTo")?.value || "0", 10)) - 1;

        if (fromIndex === toIndex || !groups[fromIndex] || !groups[toIndex]) {
            toast("병합할 색상 번호를 올바르게 입력하세요.");
            return;
        }

        pushHistory(`색상 ${fromIndex + 1} 병합 전`);

        const source = groups[fromIndex];
        const target = groups[toIndex];
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = image.data;

        for (const index of source.pixels || []) {
            const offset = index * 4;
            data[offset] = target.avg.r;
            data[offset + 1] = target.avg.g;
            data[offset + 2] = target.avg.b;
            data[offset + 3] = 255;
        }

        ctx.putImageData(image, 0, 0);
        syncResultFromVisible();
        state.hasResult = true;
        state.saved = false;
        state.resultBaseDataUrl = canvas.toDataURL("image/png");

        rebuildFinalPreviewRegionsV17();
        updateStats();
        renderFinalColorListV22();
        pushHistory(`색상 ${fromIndex + 1} → ${toIndex + 1} 병합`);

        toast(`${fromIndex + 1}번 색상을 ${toIndex + 1}번 색상으로 병합했습니다.`);
    }

    function setStep(step) {
        const nextStep = Number(step) || 1;
        state.currentStep = nextStep;

        if (nextStep > 1 && !state.hasResult) {
            state.currentStep = 1;
            toast("먼저 파트 1에서 단색화 이미지를 생성하세요.");
            return;
        }

        if (nextStep !== 4) {
            state.finalPreview.enabled = false;
            state.finalPreview.dragging = false;
            state.finalPreview.dragRect = null;
        }

        document.querySelectorAll(".button-image-step").forEach((section) => {
            const itemStep = Number(section.dataset.step);
            const header = section.querySelector(".button-image-step__header");
            const status = section.querySelector(".button-image-step__status");

            section.classList.toggle("is-active", itemStep === nextStep);
            section.classList.toggle("is-done", itemStep < nextStep);

            if (header) {
                header.classList.toggle("active", itemStep === nextStep);
            }

            if (status) {
                if (itemStep < nextStep) {
                    status.textContent = "완료";
                } else if (itemStep === nextStep) {
                    status.textContent = nextStep === 1
                        ? "진행중"
                        : nextStep === 2
                            ? "보정중"
                            : nextStep === 3
                                ? "추출중"
                                : nextStep === 4
                                    ? "병합중"
                                    : "확인";
                } else {
                    status.textContent = "대기";
                }
            }
        });

        enableRegionSelectTool(false);
        setColorPickerMode(false, { silent: true });
        setBrushMode("none", { silent: true });

        if (nextStep === 1) {
            clearOverlay();
            updateRegionSelectionText();
            return;
        }

        if (nextStep === 2) {
            updateBrushSize();
            drawLiveRegionPreviewV18();
            updateRegionSelectionText();
            return;
        }

        if (nextStep === 3) {
            updateStep3ToleranceTextV27();
            drawAllStep3OutlinesV33();
            updateRegionSelectionText();
            return;
        }

        if (nextStep === 4) {
            showFinalSavePreview();
            return;
        }

        if (nextStep === 5) {
            state.finalPreview.enabled = false;
            rebuildFinalPreviewRegionsV17();
            renderFinalColorListV22();
        }
    }

    function applyV36FinalBindings() {
        const merge = $("mergeFinalColors");
        if (merge && !merge.dataset.boundV36) {
            merge.dataset.boundV36 = "true";
            merge.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopImmediatePropagation();
                mergeFinalColorGroupsV22();
            }, true);
        }

        const refresh = $("refreshFinalColors");
        if (refresh && !refresh.dataset.boundV36) {
            refresh.dataset.boundV36 = "true";
            refresh.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopImmediatePropagation();
                renderFinalColorListV22();
            }, true);
        }

        const save = $("saveAndExitButton");
        if (save && !save.dataset.boundV36) {
            save.dataset.boundV36 = "true";
            save.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopImmediatePropagation();
                saveAndExit();
            }, true);
        }
    }

    setTimeout(applyV36FinalBindings, 0);


    // ============================================================================
    // v37 patch: 파트1 배경/글자 색상 지정 + 공통 돋보기 강화
    // ============================================================================

    function colorDistance(a, b) {
        const dr = Number(a.r || 0) - Number(b.r || 0);
        const dg = Number(a.g || 0) - Number(b.g || 0);
        const db = Number(a.b || 0) - Number(b.b || 0);
        return Math.sqrt((dr * dr) + (dg * dg) + (db * db));
    }

    function ensureManualHintsV37() {
        if (!state.manualHintsV37) {
            state.manualHintsV37 = {
                backgroundEnabled: false,
                textEnabled: false,
                pickTarget: "",
                background: "#000000",
                text: "#111111",
                tolerance: 28
            };
        }

        return state.manualHintsV37;
    }

    function syncManualHintsFromInputsV37() {
        const hints = ensureManualHintsV37();
        const bg = $("part1BackgroundColor");
        const text = $("part1TextColor");
        const tol = $("part1HintTolerance");

        if (bg) {
            hints.background = bg.value || hints.background;
        }

        if (text) {
            hints.text = text.value || hints.text;
        }

        if (tol) {
            hints.tolerance = Math.max(0, parseInt(tol.value || "28", 10));
        }

        const tolText = $("part1HintToleranceText");
        if (tolText) {
            tolText.textContent = String(hints.tolerance);
        }

        updateManualHintStatusV37();
        return hints;
    }

    function updateManualHintStatusV37() {
        const hints = ensureManualHintsV37();
        const status = $("part1HintStatus");

        if (!status) {
            return;
        }

        const used = [];

        if (hints.backgroundEnabled) {
            used.push(`배경 ${hints.background.toUpperCase()}`);
        }

        if (hints.textEnabled) {
            used.push(`글자 ${hints.text.toUpperCase()}`);
        }

        status.textContent = used.length > 0
            ? `적용 중: ${used.join(" / ")} / 허용범위 ${hints.tolerance}`
            : "배경/글자 색상을 지정하면 단색화할 때 그 기준을 우선 적용합니다.";
    }

    function setPart1PickTargetV37(target) {
        const hints = ensureManualHintsV37();
        hints.pickTarget = target;

        if (box) {
            box.classList.toggle("is-picking-part1", Boolean(target));
        }

        if (target === "background") {
            toast("도면에서 배경 색상을 클릭하세요.");
        } else if (target === "text") {
            toast("도면에서 도형 내부 숫자/글자 색상을 클릭하세요.");
        }
    }

    function samplePart1HintAtPointV37(point) {
        const hints = ensureManualHintsV37();

        if (!hints.pickTarget || !point) {
            return false;
        }

        const x = clamp(Math.round(point.x), 0, canvas.width - 1);
        const y = clamp(Math.round(point.y), 0, canvas.height - 1);
        const data = ctx.getImageData(x, y, 1, 1).data;
        const hex = rgbToHex(data[0], data[1], data[2]);

        if (hints.pickTarget === "background") {
            hints.background = hex;
            hints.backgroundEnabled = true;
            const input = $("part1BackgroundColor");
            if (input) {
                input.value = hex;
            }
            toast(`배경 색상 지정: ${hex}`);
        }

        if (hints.pickTarget === "text") {
            hints.text = hex;
            hints.textEnabled = true;
            const input = $("part1TextColor");
            if (input) {
                input.value = hex;
            }
            toast(`도형 내부 글자 색상 지정: ${hex}`);
        }

        hints.pickTarget = "";

        if (box) {
            box.classList.remove("is-picking-part1");
        }

        updateManualHintStatusV37();
        return true;
    }

    function applyManualColorHintsToRoleMapV37(sourceImage, roleMap, width, height, stats) {
        const hints = syncManualHintsFromInputsV37();

        if (!hints.backgroundEnabled && !hints.textEnabled) {
            return;
        }

        const data = sourceImage.data;
        const tolerance = hints.tolerance;
        const bg = hexToRgb(hints.background);
        const text = hexToRgb(hints.text);
        let textPixels = 0;
        let bgPixels = 0;

        if (hints.textEnabled) {
            for (let i = 0; i < width * height; i += 1) {
                const offset = i * 4;

                if (data[offset + 3] < 10) {
                    continue;
                }

                const pixel = {
                    r: data[offset],
                    g: data[offset + 1],
                    b: data[offset + 2]
                };

                if (colorDistance(pixel, text) <= tolerance) {
                    // 내부 숫자/문자를 기존 문자 제거 로직이 처리할 수 있게 WHITE 후보로 둔다.
                    roleMap[i] = ROLE.WHITE;
                    textPixels += 1;
                }
            }
        }

        if (hints.backgroundEnabled) {
            bgPixels = markManualBackgroundComponentsV37(sourceImage, roleMap, width, height, bg, tolerance);
        }

        if (stats && stats.debug) {
            if (hints.backgroundEnabled) {
                stats.debug.push(`수동 배경색 제외: ${hints.background.toUpperCase()} / ${bgPixels}px`);
            }

            if (hints.textEnabled) {
                stats.debug.push(`수동 글자색 제거 후보: ${hints.text.toUpperCase()} / ${textPixels}px`);
            }
        }
    }

    function markManualBackgroundComponentsV37(sourceImage, roleMap, width, height, target, tolerance) {
        const data = sourceImage.data;
        const visited = new Uint8Array(width * height);
        const queue = [];
        let changed = 0;
        const maxArea = width * height;
        const largeArea = Math.max(500, Math.floor(maxArea * 0.015));

        function matches(index) {
            const offset = index * 4;

            if (data[offset + 3] < 10) {
                return false;
            }

            const pixel = {
                r: data[offset],
                g: data[offset + 1],
                b: data[offset + 2]
            };

            return colorDistance(pixel, target) <= tolerance;
        }

        for (let start = 0; start < width * height; start += 1) {
            if (visited[start] || !matches(start)) {
                continue;
            }

            const pixels = [];
            let touchesBorder = false;
            let minX = Infinity;
            let minY = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;

            queue.length = 0;
            queue.push(start);
            visited[start] = 1;

            while (queue.length > 0) {
                const current = queue.pop();
                const x = current % width;
                const y = Math.floor(current / width);

                pixels.push(current);
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);

                if (x <= 1 || y <= 1 || x >= width - 2 || y >= height - 2) {
                    touchesBorder = true;
                }

                pushManualBgNeighborV37(queue, visited, matches, width, height, x + 1, y);
                pushManualBgNeighborV37(queue, visited, matches, width, height, x - 1, y);
                pushManualBgNeighborV37(queue, visited, matches, width, height, x, y + 1);
                pushManualBgNeighborV37(queue, visited, matches, width, height, x, y - 1);
            }

            const area = pixels.length;
            const boxW = maxX - minX + 1;
            const boxH = maxY - minY + 1;
            const isLargeBackground = area >= largeArea || boxW >= width * 0.42 || boxH >= height * 0.42;

            // 배경색과 글자색이 같아도 내부 숫자는 살려야 하므로,
            // 화면 가장자리와 연결되거나 큰 덩어리인 배경만 제외한다.
            if (touchesBorder || isLargeBackground) {
                for (const index of pixels) {
                    roleMap[index] = ROLE.OUTER_WHITE;
                }
                changed += pixels.length;
            }
        }

        return changed;
    }

    function pushManualBgNeighborV37(queue, visited, matches, width, height, x, y) {
        if (x < 0 || y < 0 || x >= width || y >= height) {
            return;
        }

        const index = y * width + x;

        if (visited[index] || !matches(index)) {
            return;
        }

        visited[index] = 1;
        queue.push(index);
    }

    function runScanInference(sourceImage, width, height) {
        const maps = [
            scanBaseRoles(sourceImage, width, height, "normal"),
            scanBaseRoles(sourceImage, width, height, "strict"),
            scanBaseRoles(sourceImage, width, height, "relaxed"),
            scanBaseRoles(sourceImage, width, height, "contrast")
        ];

        const merged = mergeRoleMaps(maps, width, height);
        const stats = createEmptyStats(width, height);

        applyManualColorHintsToRoleMapV37(sourceImage, merged, width, height, stats);

        markOuterWhite(merged, width, height);

        const firstText = removeInnerTextHoles(merged, width, height, stats, "1차");
        const firstHoles = fillTinyNonSeatHoles(merged, width, height, stats, "1차");
        const firstIslands = absorbSmallSeatIslands(merged, width, height, stats, "1차");
        const firstMajority = majoritySeatCleanup(merged, width, height, stats, "1차");

        applyManualColorHintsToRoleMapV37(sourceImage, merged, width, height, stats);
        markOuterWhite(merged, width, height);

        const secondText = removeInnerTextHoles(merged, width, height, stats, "2차");
        const secondHoles = fillTinyNonSeatHoles(merged, width, height, stats, "2차");
        const secondIslands = absorbSmallSeatIslands(merged, width, height, stats, "2차");
        const secondMajority = majoritySeatCleanup(merged, width, height, stats, "2차");

        const finalImage = buildOutputImage(sourceImage, merged, width, height, stats);

        stats.textHoleRemoved += firstText + secondText;
        stats.tinyHolesFilled += firstHoles + secondHoles;
        stats.smallIslandsAbsorbed += firstIslands + secondIslands;
        stats.majorityChanges += firstMajority + secondMajority;

        return {
            image: finalImage,
            roleMap: merged,
            stats
        };
    }

    function onCanvasClick(event) {
        const point = getCanvasPoint(event);

        if (state.currentStep === 1 && point && samplePart1HintAtPointV37(point)) {
            event.preventDefault();
            return;
        }

        if (state.brush.pickColor) {
            event.preventDefault();
            if (point) {
                sampleBrushColorAt(point);
            }
            return;
        }

        if (state.currentStep === 3 && point && state.brush.mode === "none") {
            event.preventDefault();
            extractMagicColorAtPointV27(point);
            return;
        }

        if (state.brush.mode !== "none") {
            event.preventDefault();
            return;
        }

        if (state.finalPreview.enabled) {
            event.preventDefault();

            if (state.finalPreview.suppressClick) {
                state.finalPreview.suppressClick = false;
                return;
            }

            if (point) {
                selectFinalRegionByClickV17(point, event.shiftKey || event.ctrlKey || event.metaKey);
            }
            return;
        }

        if (!state.region.enabled || !point) {
            return;
        }

        event.preventDefault();
        selectRegionByClick(point, event.shiftKey, event.ctrlKey || event.metaKey);
    }

    function shouldShowLoupeV37(event) {
        if (!state.imageReady || !canvas.width || !canvas.height) {
            return false;
        }

        if (event?.shiftKey) {
            return true;
        }

        if (state.currentStep === 1) {
            const hints = ensureManualHintsV37();
            return Boolean(hints.pickTarget);
        }

        if (state.currentStep === 2) {
            return state.brush.pickColor || state.brush.mode !== "none" || state.region.enabled;
        }

        if (state.currentStep === 3) {
            return true;
        }

        if (state.currentStep === 4) {
            return Boolean(state.finalPreview?.enabled);
        }

        return Boolean(event?.shiftKey);
    }

    function onCanvasMove(event) {
        if (!state.imageReady || !sourceCanvas.width || !sourceCanvas.height) {
            return;
        }

        const point = getCanvasPoint(event);
        if (!point) {
            hideLoupe();
            return;
        }

        if (state.finalPreview.dragging && state.finalPreview.dragStart) {
            event.preventDefault();
            state.finalPreview.dragRect = normalizeCanvasRectV17(state.finalPreview.dragStart, point);
            drawFinalPreviewOverlayV17();
            updateLoupeV37(point, event, true);
            return;
        }

        if (state.brush.pickColor) {
            updateLoupeV37(point, event, true);
            updateBrushCursor(point);
            return;
        }

        updateBrushCursor(point);

        if (state.brush.down && state.brush.mode !== "none") {
            event.preventDefault();
            paintBrushAt(point);
            updateLoupeV37(point, event, true);
            return;
        }

        if (shouldShowLoupeV37(event)) {
            updateLoupeV37(point, event, true);
        } else {
            hideLoupe();
        }
    }

    function updateLoupe(point, event) {
        updateLoupeV37(point, event, shouldShowLoupeV37(event));
    }

    function updateLoupeV37(point, event, forceShow = false) {
        const loupe = $("colorLoupe");

        if (!loupe || !forceShow) {
            hideLoupe();
            return;
        }

        const x = clamp(Math.round(point.x), 0, canvas.width - 1);
        const y = clamp(Math.round(point.y), 0, canvas.height - 1);
        const data = ctx.getImageData(x, y, 1, 1).data;
        const hex = rgbToHex(data[0], data[1], data[2]);

        const chip = $("loupeChip");
        if (chip) {
            chip.style.background = hex;
        }

        setText("loupeHex", hex);
        setText("loupePoint", `X ${x}, Y ${y}`);

        drawLoupeCanvasV37(x, y);

        loupe.classList.add("is-show");

        const rect = box ? box.getBoundingClientRect() : canvas.getBoundingClientRect();
        let left = event.clientX - rect.left + 18;
        let top = event.clientY - rect.top + 18;

        const loupeWidth = 205;
        const loupeHeight = 112;
        const maxLeft = Math.max(0, rect.width - loupeWidth - 8);
        const maxTop = Math.max(0, rect.height - loupeHeight - 8);

        if (left > maxLeft) {
            left = event.clientX - rect.left - loupeWidth - 18;
        }

        if (top > maxTop) {
            top = event.clientY - rect.top - loupeHeight - 18;
        }

        loupe.style.transform = `translate(${Math.max(4, left)}px, ${Math.max(4, top)}px)`;
    }

    function drawLoupeCanvasV37(centerX, centerY) {
        const loupeCanvas = $("loupeCanvas");

        if (!loupeCanvas) {
            return;
        }

        const lctx = loupeCanvas.getContext("2d");
        const sample = 15;
        const scale = Math.floor(loupeCanvas.width / sample);
        const half = Math.floor(sample / 2);

        lctx.clearRect(0, 0, loupeCanvas.width, loupeCanvas.height);
        lctx.imageSmoothingEnabled = false;

        for (let yy = 0; yy < sample; yy += 1) {
            for (let xx = 0; xx < sample; xx += 1) {
                const sx = clamp(centerX + xx - half, 0, canvas.width - 1);
                const sy = clamp(centerY + yy - half, 0, canvas.height - 1);
                const data = ctx.getImageData(sx, sy, 1, 1).data;

                lctx.fillStyle = rgbToHex(data[0], data[1], data[2]);
                lctx.fillRect(xx * scale, yy * scale, scale, scale);
            }
        }

        lctx.strokeStyle = "rgba(15,23,42,0.30)";
        lctx.lineWidth = 1;

        for (let i = 0; i <= sample; i += 1) {
            const p = i * scale;
            lctx.beginPath();
            lctx.moveTo(p, 0);
            lctx.lineTo(p, sample * scale);
            lctx.stroke();

            lctx.beginPath();
            lctx.moveTo(0, p);
            lctx.lineTo(sample * scale, p);
            lctx.stroke();
        }

        const cx = half * scale;
        const cy = half * scale;
        lctx.strokeStyle = "#111827";
        lctx.lineWidth = 2;
        lctx.strokeRect(cx, cy, scale, scale);
    }

    function applyV37ManualControls() {
        ensureManualHintsV37();

        const bgInput = $("part1BackgroundColor");
        const textInput = $("part1TextColor");
        const tolerance = $("part1HintTolerance");

        if (bgInput && !bgInput.dataset.boundV37) {
            bgInput.dataset.boundV37 = "true";
            bgInput.addEventListener("input", () => {
                const hints = ensureManualHintsV37();
                hints.backgroundEnabled = true;
                syncManualHintsFromInputsV37();
            });
        }

        if (textInput && !textInput.dataset.boundV37) {
            textInput.dataset.boundV37 = "true";
            textInput.addEventListener("input", () => {
                const hints = ensureManualHintsV37();
                hints.textEnabled = true;
                syncManualHintsFromInputsV37();
            });
        }

        if (tolerance && !tolerance.dataset.boundV37) {
            tolerance.dataset.boundV37 = "true";
            tolerance.addEventListener("input", syncManualHintsFromInputsV37);
        }

        const bgButton = $("pickPart1BackgroundColor");
        if (bgButton && !bgButton.dataset.boundV37) {
            bgButton.dataset.boundV37 = "true";
            bgButton.addEventListener("click", (event) => {
                event.preventDefault();
                setPart1PickTargetV37("background");
            });
        }

        const textButton = $("pickPart1TextColor");
        if (textButton && !textButton.dataset.boundV37) {
            textButton.dataset.boundV37 = "true";
            textButton.addEventListener("click", (event) => {
                event.preventDefault();
                setPart1PickTargetV37("text");
            });
        }

        syncManualHintsFromInputsV37();
    }

    setTimeout(applyV37ManualControls, 0);


    // ============================================================================
    // v38 patch: 파트5 색상 번호/HEX 깨짐 수정
    // 원인: rgbToHex에 소수점 RGB가 들어가면서 #FE.5B... 형태의 깨진 문자열 생성
    // 수정:
    // - rgbToHex는 항상 정수 0~255로 반올림 후 변환
    // - 파트5 색상 목록은 "1번 / #RRGGBB" 형태로 짧게 표시
    // - 도면 위 번호는 색상마다 대표 구역 몇 개만 표시해서 글자 난잡함 제거
    // ============================================================================

    function rgbToHex(r, g, b) {
        return `#${toHexV38(r)}${toHexV38(g)}${toHexV38(b)}`.toUpperCase();
    }

    function toHexV38(value) {
        const number = Math.round(Number(value || 0));
        return clamp(number, 0, 255).toString(16).padStart(2, "0");
    }

    function collectFinalColorGroupsV22() {
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const regions = ensureFinalRegionsForColorsV36();
        const groups = [];

        for (const region of regions) {
            const pixels = Array.isArray(region.pixels) ? region.pixels : [];

            if (pixels.length <= 0) {
                continue;
            }

            const color = getDominantColorFromPixels(image, pixels);
            let group = groups.find((item) => colorDistance(item.avg, color) <= 24);

            if (!group) {
                group = {
                    r: 0,
                    g: 0,
                    b: 0,
                    count: 0,
                    pixels: [],
                    components: [],
                    avg: color
                };
                groups.push(group);
            }

            group.r += color.r * pixels.length;
            group.g += color.g * pixels.length;
            group.b += color.b * pixels.length;
            group.count += pixels.length;
            group.pixels.push(...pixels);
            group.components.push({
                ...region,
                color,
                colorHex: rgbToHex(color.r, color.g, color.b)
            });
            group.avg = {
                r: group.r / Math.max(1, group.count),
                g: group.g / Math.max(1, group.count),
                b: group.b / Math.max(1, group.count)
            };
        }

        return groups
            .filter((group) => group.count >= 8)
            .sort((a, b) => b.count - a.count)
            .map((group) => {
                const avg = {
                    r: Math.round(group.r / group.count),
                    g: Math.round(group.g / group.count),
                    b: Math.round(group.b / group.count)
                };

                return {
                    ...group,
                    avg,
                    hex: rgbToHex(avg.r, avg.g, avg.b)
                };
            });
    }

    function renderFinalColorListV22() {
        const container = $("finalColorList");

        if (!container) {
            return;
        }

        if (!canvas.width || !canvas.height) {
            container.innerHTML = `<div class="button-image-empty">캔버스가 없습니다.</div>`;
            return;
        }

        const groups = collectFinalColorGroupsV22();
        state.finalColorGroupsV22 = groups;

        if (groups.length <= 0) {
            container.innerHTML = `<div class="button-image-empty">정리할 색상이 없습니다. 구역 병합 단계로 돌아가 구역 실선을 먼저 확인하세요.</div>`;
            clearOverlay();
            return;
        }

        container.innerHTML = groups.map((group, index) => `
            <div class="button-image-color-merge-item button-image-color-merge-item--v38" data-color-index="${index + 1}">
                <span class="button-image-color-merge-no">${index + 1}</span>
                <i style="background:${escapeHtml(group.hex)}"></i>
                <div class="button-image-color-merge-main">
                    <b>${index + 1}번</b>
                    <small>${escapeHtml(group.hex)}</small>
                </div>
                <em>${group.components.length.toLocaleString()}구역</em>
            </div>
        `).join("");

        drawFinalColorNumbersV36(groups);
    }

    function drawFinalColorNumbersV36(groups) {
        clearOverlay();

        if (!overlayCtx || !Array.isArray(groups)) {
            return;
        }

        overlayCtx.save();
        overlayCtx.textAlign = "center";
        overlayCtx.textBaseline = "middle";
        overlayCtx.font = "bold 12px sans-serif";

        groups.forEach((group, groupIndex) => {
            const number = String(groupIndex + 1);
            const components = [...(group.components || [])]
                .filter((component) => component.bounds && component.bounds.w >= 8 && component.bounds.h >= 8)
                .sort((a, b) => (b.area || b.pixels?.length || 0) - (a.area || a.pixels?.length || 0))
                .slice(0, 16);

            for (const component of components) {
                const b = component.bounds || {};
                const x = Math.round(b.x + b.w / 2);
                const y = Math.round(b.y + b.h / 2);

                overlayCtx.fillStyle = "rgba(255,255,255,0.92)";
                overlayCtx.strokeStyle = "rgba(15,23,42,0.68)";
                overlayCtx.lineWidth = 1.6;
                overlayCtx.beginPath();
                overlayCtx.arc(x, y, 8, 0, Math.PI * 2);
                overlayCtx.fill();
                overlayCtx.stroke();

                overlayCtx.fillStyle = "#111827";
                overlayCtx.fillText(number, x, y + 0.3);
            }
        });

        overlayCtx.restore();
    }

    function buildGeneratedRegionGroupsForSave() {
        const items = collectRegionColorGroupsForSaveV34();

        if (!items.length) {
            return [];
        }

        return items.map((item, index) => {
            const code = `R${index + 1}`;

            return {
                id: code,
                name: `구역 ${code}`,
                gradeName: code,
                color: item.hex,
                pixelCount: item.count,
                bounds: item.bounds
            };
        });
    }

    function collectRegionColorGroupsForSaveV34() {
        if (!canvas || !canvas.width || !canvas.height) {
            return [];
        }

        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = image.data;
        const width = canvas.width;
        const height = canvas.height;
        const buckets = new Map();

        for (let i = 0; i < width * height; i += 1) {
            const offset = i * 4;

            if (data[offset + 3] < 10) {
                continue;
            }

            const r = Math.round(data[offset]);
            const g = Math.round(data[offset + 1]);
            const b = Math.round(data[offset + 2]);
            const key = rgbToHex(r, g, b);

            let bucket = buckets.get(key);

            if (!bucket) {
                bucket = {
                    hex: key,
                    count: 0,
                    minX: Infinity,
                    minY: Infinity,
                    maxX: -Infinity,
                    maxY: -Infinity
                };
                buckets.set(key, bucket);
            }

            const x = i % width;
            const y = Math.floor(i / width);

            bucket.count += 1;
            bucket.minX = Math.min(bucket.minX, x);
            bucket.minY = Math.min(bucket.minY, y);
            bucket.maxX = Math.max(bucket.maxX, x);
            bucket.maxY = Math.max(bucket.maxY, y);
        }

        return [...buckets.values()]
            .filter((bucket) => bucket.count >= 30)
            .sort((a, b) => b.count - a.count)
            .slice(0, 100)
            .map((bucket) => ({
                hex: bucket.hex,
                count: bucket.count,
                bounds: {
                    x: bucket.minX,
                    y: bucket.minY,
                    w: bucket.maxX - bucket.minX + 1,
                    h: bucket.maxY - bucket.minY + 1
                }
            }));
    }


    // ============================================================================
    // v39 patch: 파트1 허용범위 실시간 미리보기
    // - 배경/글자 색상을 지정한 뒤 슬라이더를 움직이면 overlay 실선 범위 즉시 갱신
    // - 단색화 실행 전에도 현재 허용범위가 어디까지 잡히는지 확인 가능
    // ============================================================================

    function schedulePart1HintPreviewV39() {
        if (state.currentStep !== 1) {
            return;
        }

        cancelAnimationFrame(state.__part1PreviewRafV39 || 0);
        state.__part1PreviewRafV39 = requestAnimationFrame(() => {
            drawPart1HintPreviewV39();
        });
    }

    function syncManualHintsFromInputsV37() {
        const hints = ensureManualHintsV37();
        const bg = $("part1BackgroundColor");
        const text = $("part1TextColor");
        const tol = $("part1HintTolerance");

        if (bg) {
            hints.background = bg.value || hints.background;
        }

        if (text) {
            hints.text = text.value || hints.text;
        }

        if (tol) {
            hints.tolerance = Math.max(0, parseInt(tol.value || "28", 10));
        }

        const tolText = $("part1HintToleranceText");
        if (tolText) {
            tolText.textContent = String(hints.tolerance);
        }

        updateManualHintStatusV37();
        schedulePart1HintPreviewV39();
        return hints;
    }

    function updateManualHintStatusV37() {
        const hints = ensureManualHintsV37();
        const status = $("part1HintStatus");

        if (!status) {
            return;
        }

        const used = [];

        if (hints.backgroundEnabled) {
            used.push(`배경 ${hints.background.toUpperCase()}`);
        }

        if (hints.textEnabled) {
            used.push(`글자 ${hints.text.toUpperCase()}`);
        }

        const previewCount = Number(state.__part1PreviewCountV39 || 0);

        status.textContent = used.length > 0
            ? `미리보기 적용 중: ${used.join(" / ")} / 허용범위 ${hints.tolerance} / ${previewCount}구역`
            : "배경/글자 색상을 지정하면 슬라이더 변경 시 도면 위 실선 범위가 즉시 바뀝니다.";
    }

    function samplePart1HintAtPointV37(point) {
        const hints = ensureManualHintsV37();

        if (!hints.pickTarget || !point) {
            return false;
        }

        const x = clamp(Math.round(point.x), 0, canvas.width - 1);
        const y = clamp(Math.round(point.y), 0, canvas.height - 1);
        const data = ctx.getImageData(x, y, 1, 1).data;
        const hex = rgbToHex(data[0], data[1], data[2]);

        if (hints.pickTarget === "background") {
            hints.background = hex;
            hints.backgroundEnabled = true;
            const input = $("part1BackgroundColor");
            if (input) {
                input.value = hex;
            }
            toast(`배경 색상 지정: ${hex}`);
        }

        if (hints.pickTarget === "text") {
            hints.text = hex;
            hints.textEnabled = true;
            const input = $("part1TextColor");
            if (input) {
                input.value = hex;
            }
            toast(`도형 내부 글자 색상 지정: ${hex}`);
        }

        hints.pickTarget = "";

        if (box) {
            box.classList.remove("is-picking-part1");
        }

        updateManualHintStatusV37();
        drawPart1HintPreviewV39();
        return true;
    }

    function drawPart1HintPreviewV39() {
        if (state.currentStep !== 1 || !canvas.width || !canvas.height || !overlayCtx) {
            return;
        }

        const hints = ensureManualHintsV37();

        clearOverlay();

        if (!hints.backgroundEnabled && !hints.textEnabled) {
            state.__part1PreviewCountV39 = 0;
            updateManualHintStatusV37();
            return;
        }

        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const groups = [];

        if (hints.backgroundEnabled) {
            groups.push({
                label: "배경",
                color: hints.background,
                stroke: "rgba(37, 99, 235, 0.95)",
                fill: "rgba(37, 99, 235, 0.08)",
                components: extractColorPreviewComponentsV39(
                    image,
                    canvas.width,
                    canvas.height,
                    hexToRgb(hints.background),
                    hints.tolerance,
                    "background"
                )
            });
        }

        if (hints.textEnabled) {
            groups.push({
                label: "글자",
                color: hints.text,
                stroke: "rgba(124, 58, 237, 0.98)",
                fill: "rgba(124, 58, 237, 0.10)",
                components: extractColorPreviewComponentsV39(
                    image,
                    canvas.width,
                    canvas.height,
                    hexToRgb(hints.text),
                    hints.tolerance,
                    "text"
                )
            });
        }

        let total = 0;

        overlayCtx.save();

        for (const group of groups) {
            total += group.components.length;

            overlayCtx.strokeStyle = group.stroke;
            overlayCtx.fillStyle = group.fill;
            overlayCtx.lineWidth = Math.max(1.4, 2 / Math.max(1, state.zoom));
            overlayCtx.setLineDash([]);

            for (const component of group.components) {
                drawPreviewComponentOutlineV39(component, group.stroke);

                const b = component.bounds;
                overlayCtx.strokeStyle = group.stroke;
                overlayCtx.strokeRect(b.x, b.y, b.w, b.h);
            }
        }

        overlayCtx.restore();

        state.__part1PreviewCountV39 = total;
        updateManualHintStatusV37();
    }

    function extractColorPreviewComponentsV39(image, width, height, target, tolerance, type) {
        const data = image.data;
        const visited = new Uint8Array(width * height);
        const queue = [];
        const components = [];
        const minArea = type === "text" ? 2 : 8;
        const maxComponents = type === "text" ? 350 : 160;

        function matches(index) {
            const offset = index * 4;

            if (data[offset + 3] < 10) {
                return false;
            }

            const pixel = {
                r: data[offset],
                g: data[offset + 1],
                b: data[offset + 2]
            };

            return colorDistance(pixel, target) <= tolerance;
        }

        for (let start = 0; start < width * height; start += 1) {
            if (visited[start] || !matches(start)) {
                continue;
            }

            const pixels = [];
            const bounds = {
                minX: Infinity,
                minY: Infinity,
                maxX: -Infinity,
                maxY: -Infinity
            };

            let touchesBorder = false;

            queue.length = 0;
            queue.push(start);
            visited[start] = 1;

            while (queue.length > 0) {
                const current = queue.pop();
                const x = current % width;
                const y = Math.floor(current / width);

                pixels.push(current);
                bounds.minX = Math.min(bounds.minX, x);
                bounds.minY = Math.min(bounds.minY, y);
                bounds.maxX = Math.max(bounds.maxX, x);
                bounds.maxY = Math.max(bounds.maxY, y);

                if (x <= 1 || y <= 1 || x >= width - 2 || y >= height - 2) {
                    touchesBorder = true;
                }

                pushPreviewNeighborV39(queue, visited, matches, width, height, x + 1, y);
                pushPreviewNeighborV39(queue, visited, matches, width, height, x - 1, y);
                pushPreviewNeighborV39(queue, visited, matches, width, height, x, y + 1);
                pushPreviewNeighborV39(queue, visited, matches, width, height, x, y - 1);
                pushPreviewNeighborV39(queue, visited, matches, width, height, x + 1, y + 1);
                pushPreviewNeighborV39(queue, visited, matches, width, height, x - 1, y - 1);
                pushPreviewNeighborV39(queue, visited, matches, width, height, x + 1, y - 1);
                pushPreviewNeighborV39(queue, visited, matches, width, height, x - 1, y + 1);
            }

            if (pixels.length < minArea) {
                continue;
            }

            const w = bounds.maxX - bounds.minX + 1;
            const h = bounds.maxY - bounds.minY + 1;
            const area = pixels.length;
            const fillRatio = area / Math.max(1, w * h);

            // 배경은 가장자리 연결/큰 덩어리 위주로 보여주되,
            // 관리자가 색 범위 확인할 수 있게 작은 내부 후보도 일부 남긴다.
            const keep =
                type === "text"
                    ? area <= Math.max(900, width * height * 0.006)
                    : touchesBorder ||
                      area >= Math.max(100, width * height * 0.0012) ||
                      (w >= 14 && h >= 14 && fillRatio >= 0.12);

            if (!keep) {
                continue;
            }

            components.push({
                pixels,
                pixelSet: new Set(pixels),
                area,
                touchesBorder,
                bounds: {
                    x: bounds.minX,
                    y: bounds.minY,
                    w,
                    h
                }
            });
        }

        components.sort((a, b) => {
            if (a.touchesBorder !== b.touchesBorder) {
                return a.touchesBorder ? -1 : 1;
            }

            return b.area - a.area;
        });

        return components.slice(0, maxComponents);
    }

    function pushPreviewNeighborV39(queue, visited, matches, width, height, x, y) {
        if (x < 0 || y < 0 || x >= width || y >= height) {
            return;
        }

        const index = y * width + x;

        if (visited[index] || !matches(index)) {
            return;
        }

        visited[index] = 1;
        queue.push(index);
    }

    function drawPreviewComponentOutlineV39(component, color) {
        if (!component || !component.pixelSet || !component.pixels) {
            return;
        }

        const width = canvas.width;
        const height = canvas.height;
        const set = component.pixelSet;
        const stride = Math.max(1, Math.floor(component.pixels.length / 50000));

        overlayCtx.fillStyle = color;

        for (let i = 0; i < component.pixels.length; i += stride) {
            const index = component.pixels[i];
            const x = index % width;
            const y = Math.floor(index / width);

            const edge =
                x <= 0 || y <= 0 || x >= width - 1 || y >= height - 1 ||
                !set.has(index - 1) ||
                !set.has(index + 1) ||
                !set.has(index - width) ||
                !set.has(index + width);

            if (edge) {
                overlayCtx.fillRect(x, y, 1.2, 1.2);
            }
        }
    }

    function setStep(step) {
        const nextStep = Number(step) || 1;
        state.currentStep = nextStep;

        if (nextStep > 1 && !state.hasResult) {
            state.currentStep = 1;
            toast("먼저 파트 1에서 단색화 이미지를 생성하세요.");
            return;
        }

        if (nextStep !== 4) {
            state.finalPreview.enabled = false;
            state.finalPreview.dragging = false;
            state.finalPreview.dragRect = null;
        }

        document.querySelectorAll(".button-image-step").forEach((section) => {
            const itemStep = Number(section.dataset.step);
            const header = section.querySelector(".button-image-step__header");
            const status = section.querySelector(".button-image-step__status");

            section.classList.toggle("is-active", itemStep === nextStep);
            section.classList.toggle("is-done", itemStep < nextStep);

            if (header) {
                header.classList.toggle("active", itemStep === nextStep);
            }

            if (status) {
                if (itemStep < nextStep) {
                    status.textContent = "완료";
                } else if (itemStep === nextStep) {
                    status.textContent = nextStep === 1
                        ? "진행중"
                        : nextStep === 2
                            ? "보정중"
                            : nextStep === 3
                                ? "추출중"
                                : nextStep === 4
                                    ? "병합중"
                                    : "확인";
                } else {
                    status.textContent = "대기";
                }
            }
        });

        enableRegionSelectTool(false);
        setColorPickerMode(false, { silent: true });
        setBrushMode("none", { silent: true });

        if (nextStep === 1) {
            drawPart1HintPreviewV39();
            updateRegionSelectionText();
            return;
        }

        if (nextStep === 2) {
            updateBrushSize();
            drawLiveRegionPreviewV18();
            updateRegionSelectionText();
            return;
        }

        if (nextStep === 3) {
            updateStep3ToleranceTextV27();
            drawAllStep3OutlinesV33();
            updateRegionSelectionText();
            return;
        }

        if (nextStep === 4) {
            showFinalSavePreview();
            return;
        }

        if (nextStep === 5) {
            state.finalPreview.enabled = false;
            rebuildFinalPreviewRegionsV17();
            renderFinalColorListV22();
        }
    }

    function applyV39Part1PreviewBindings() {
        const ids = [
            "part1BackgroundColor",
            "part1TextColor",
            "part1HintTolerance"
        ];

        ids.forEach((id) => {
            const element = $(id);

            if (!element || element.dataset.boundV39) {
                return;
            }

            element.dataset.boundV39 = "true";
            element.addEventListener("input", () => {
                const hints = ensureManualHintsV37();

                if (id === "part1BackgroundColor") {
                    hints.backgroundEnabled = true;
                }

                if (id === "part1TextColor") {
                    hints.textEnabled = true;
                }

                syncManualHintsFromInputsV37();
            });
        });

        syncManualHintsFromInputsV37();
    }

    setTimeout(applyV39Part1PreviewBindings, 0);


    function bindV40PreprocessContinue() {
        const btn = $("preprocessContinue");

        if (!btn || btn.dataset.boundV40) {
            return;
        }

        btn.dataset.boundV40 = "true";
        btn.addEventListener("click", () => {
            const target = $("part1");
            const header = $("tab1");

            if (header && typeof header.click === "function") {
                header.click();
            }

            if (target && typeof target.scrollIntoView === "function") {
                target.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        });
    }

    setTimeout(bindV40PreprocessContinue, 0);


    // ============================================================================
    // v41 patch: button-image Part 1 = 도형 색상 추출 + 원본 위 cover 미리보기
    // - 수정 대상은 concert-stage1이 아니라 /admin/seatmap/button-image 흐름이다.
    // - 원본(sourceCanvas)은 절대 덮어쓰지 않고, 선택 색상만 새 후보 레이어로 생성한다.
    // ============================================================================

    const PART1_PREVIEW_COLORS_V41 = [
        "#7c3aed", "#2563eb", "#059669", "#ea580c", "#db2777",
        "#0891b2", "#65a30d", "#9333ea", "#dc2626", "#0f766e"
    ];

    function ensurePart1ColorStateV41() {
        if (!state.part1ColorExtract) {
            state.part1ColorExtract = {
                colors: [],
                extracted: false,
                tolerance: 18,
                lastPreviewDataUrl: ""
            };
        }

        return state.part1ColorExtract;
    }

    function bindPart1ColorExtractV41() {
        const extractButton = $("extractShapeColors");
        const generateButton = $("generateButtonImage");
        const restoreButton = $("restoreSource");

        replaceButtonListenerV41(extractButton, extractPart1ShapeColorsV41);
        replaceButtonListenerV41($("part1SelectColored"), () => {
            autoSelectPart1CandidateColorsV41(true);
            renderPart1ColorPaletteV41();
            drawPart1SelectedColorPreviewV41();
        });
        replaceButtonListenerV41($("part1InvertSelection"), () => {
            const part1 = ensurePart1ColorStateV41();
            part1.colors.forEach((item) => item.selected = !item.selected);
            renderPart1ColorPaletteV41();
            drawPart1SelectedColorPreviewV41();
        });
        replaceButtonListenerV41($("part1ClearSelection"), () => {
            const part1 = ensurePart1ColorStateV41();
            part1.colors.forEach((item) => item.selected = false);
            renderPart1ColorPaletteV41();
            drawPart1SelectedColorPreviewV41();
        });
        replaceButtonListenerV41($("part1PreviewSelected"), drawPart1SelectedColorPreviewV41);
        replaceButtonListenerV41(generateButton, createPart1ButtonCandidateImageV41);
        replaceButtonListenerV41(restoreButton, () => {
            restoreSourceImage();
            renderPart1ColorPaletteV41();
        });

        const tolerance = $("part1ColorTolerance");
        if (tolerance && !tolerance.dataset.boundV41) {
            tolerance.dataset.boundV41 = "true";
            tolerance.addEventListener("input", () => {
                const part1 = ensurePart1ColorStateV41();
                part1.tolerance = Math.max(0, Number(tolerance.value) || 0);
                setText("part1ColorToleranceText", String(part1.tolerance));
                drawPart1SelectedColorPreviewV41();
            });
        }

        setText("part1ColorToleranceText", String(Number(tolerance?.value || 18)));
    }

    function replaceButtonListenerV41(button, handler) {
        if (!button || button.dataset.boundV41) {
            return;
        }

        const clone = button.cloneNode(true);
        clone.dataset.boundV41 = "true";
        button.parentNode.replaceChild(clone, button);
        clone.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            handler(event);
        });
    }

    function extractPart1ShapeColorsV41() {
        if (!state.imageReady || !sourceCanvas.width || !sourceCanvas.height) {
            toast("원본 이미지 로딩이 끝난 뒤 다시 실행하세요.");
            return;
        }

        const part1 = ensurePart1ColorStateV41();
        const width = sourceCanvas.width;
        const height = sourceCanvas.height;
        const image = sourceCtx.getImageData(0, 0, width, height);
        const buckets = new Map();
        const data = image.data;
        const step = 16;

        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];

            if (alpha < 10) {
                continue;
            }

            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const key = `${Math.round(r / step) * step},${Math.round(g / step) * step},${Math.round(b / step) * step}`;
            let bucket = buckets.get(key);

            if (!bucket) {
                bucket = { count: 0, r: 0, g: 0, b: 0 };
                buckets.set(key, bucket);
            }

            bucket.count += 1;
            bucket.r += r;
            bucket.g += g;
            bucket.b += b;
        }

        const minCount = Math.max(18, Math.floor((width * height) * 0.00004));
        const colors = Array.from(buckets.values())
            .filter((bucket) => bucket.count >= minCount)
            .map((bucket, index) => {
                const rgb = {
                    r: Math.round(bucket.r / bucket.count),
                    g: Math.round(bucket.g / bucket.count),
                    b: Math.round(bucket.b / bucket.count)
                };
                const hsl = rgbToHslV41(rgb.r, rgb.g, rgb.b);
                const hex = rgbToHexV41(rgb.r, rgb.g, rgb.b);
                const role = guessPart1ColorRoleV41(rgb, hsl, bucket.count, width * height);

                return {
                    id: `color-${index + 1}`,
                    sourceColor: hex,
                    rgb,
                    count: bucket.count,
                    ratio: bucket.count / Math.max(1, width * height),
                    saturation: hsl.s,
                    lightness: hsl.l,
                    role,
                    selected: role === "button",
                    previewColor: PART1_PREVIEW_COLORS_V41[index % PART1_PREVIEW_COLORS_V41.length]
                };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 80)
            .map((item, index) => ({
                ...item,
                id: `color-${index + 1}`,
                previewColor: PART1_PREVIEW_COLORS_V41[index % PART1_PREVIEW_COLORS_V41.length]
            }));

        part1.colors = colors;
        part1.extracted = true;
        part1.tolerance = Math.max(0, Number($("part1ColorTolerance")?.value || part1.tolerance || 18));

        renderPart1ColorPaletteV41();
        drawPart1SelectedColorPreviewV41();
        savePart1ColorExtractStateV41();

        toast(`도형 색상 후보 ${colors.length}개를 추출했습니다.`);
    }

    function guessPart1ColorRoleV41(rgb, hsl, count, totalPixels) {
        const max = Math.max(rgb.r, rgb.g, rgb.b);
        const min = Math.min(rgb.r, rgb.g, rgb.b);
        const chroma = max - min;
        const ratio = count / Math.max(1, totalPixels);

        if (hsl.l >= 0.90 && hsl.s <= 0.18) {
            return "background";
        }

        if (hsl.l <= 0.16 && hsl.s <= 0.30) {
            return "text";
        }

        if (hsl.s <= 0.13 && chroma <= 24) {
            return ratio > 0.05 ? "background" : "line";
        }

        if (count < 35) {
            return "noise";
        }

        if (hsl.s >= 0.18 && hsl.l >= 0.16 && hsl.l <= 0.88 && chroma >= 24) {
            return "button";
        }

        return "etc";
    }

    function autoSelectPart1CandidateColorsV41(forceToast) {
        const part1 = ensurePart1ColorStateV41();

        if (!part1.extracted || part1.colors.length === 0) {
            extractPart1ShapeColorsV41();
            return;
        }

        part1.colors.forEach((item) => {
            item.selected = item.role === "button";
        });

        if (forceToast) {
            toast("도형 후보 색상만 자동 선택했습니다.");
        }
    }

    function renderPart1ColorPaletteV41() {
        const palette = $("part1ColorPalette");
        const part1 = ensurePart1ColorStateV41();

        if (!palette) {
            return;
        }

        if (!part1.colors || part1.colors.length === 0) {
            palette.innerHTML = `
                <div class="button-image-empty-palette">
                    아직 추출된 색상이 없습니다. [도형 색상 추출]을 누르세요.
                </div>
            `;
            updatePart1ColorStatusV41();
            return;
        }

        palette.innerHTML = part1.colors.map((item, index) => {
            const roleText = getPart1RoleTextV41(item.role);
            const selected = item.selected ? "is-selected" : "";
            const checked = item.selected ? "checked" : "";
            const countText = item.count.toLocaleString();

            return `
                <button type="button" class="button-image-color-chip ${selected}" data-color-index="${index}">
                    <span class="button-image-color-chip__check">
                        <input type="checkbox" ${checked} tabindex="-1">
                    </span>
                    <span class="button-image-color-chip__swatch" style="background:${item.sourceColor}"></span>
                    <span class="button-image-color-chip__body">
                        <strong>${escapeHtml(item.sourceColor)}</strong>
                        <small>${roleText} · ${countText}px</small>
                    </span>
                    <span class="button-image-color-chip__cover" style="background:${item.previewColor}"></span>
                </button>
            `;
        }).join("");

        palette.querySelectorAll("[data-color-index]").forEach((button) => {
            button.addEventListener("click", () => {
                const index = Number(button.dataset.colorIndex);
                const item = part1.colors[index];

                if (!item) {
                    return;
                }

                item.selected = !item.selected;
                renderPart1ColorPaletteV41();
                drawPart1SelectedColorPreviewV41();
            });
        });

        updatePart1ColorStatusV41();
    }

    function updatePart1ColorStatusV41() {
        const part1 = ensurePart1ColorStateV41();
        const selected = part1.colors.filter((item) => item.selected);
        const totalPixels = selected.reduce((sum, item) => sum + item.count, 0);
        const text = part1.colors.length === 0
            ? "색상을 추출하면 아래에 원본 색상 목록이 표시됩니다."
            : `추출 ${part1.colors.length}개 / 선택 ${selected.length}개 / 선택 픽셀 ${totalPixels.toLocaleString()}px`;

        setText("part1ColorStatus", text);
    }

    function getPart1RoleTextV41(role) {
        if (role === "button") return "도형 후보";
        if (role === "background") return "배경 후보";
        if (role === "text") return "글자 후보";
        if (role === "line") return "선/회색 후보";
        if (role === "noise") return "작은 색상";
        return "기타";
    }

    function drawPart1SelectedColorPreviewV41(options = {}) {
        const part1 = ensurePart1ColorStateV41();

        if (!state.imageReady || !sourceCanvas.width || !sourceCanvas.height) {
            return;
        }

        if (!part1.extracted || part1.colors.length === 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(sourceCanvas, 0, 0);
            clearOverlay();
            return;
        }

        const hoverGroup = Number.isInteger(part1.hoverGroupIndex)
            ? part1.groups?.[part1.hoverGroupIndex]
            : null;
        const selected = options.hoverOnly && hoverGroup
            ? getPart1GroupColorsV42(hoverGroup)
            : part1.colors.filter((item) => item.selected);
        const width = sourceCanvas.width;
        const height = sourceCanvas.height;
        const source = sourceCtx.getImageData(0, 0, width, height);
        const output = new ImageData(new Uint8ClampedArray(source.data), width, height);
        const src = source.data;
        const dst = output.data;
        const tolerance = Math.max(0, Number($("part1ColorTolerance")?.value || part1.tolerance || 18));
        const alpha = 0.68;

        for (let i = 0; i < src.length; i += 4) {
            const match = findMatchingPart1ColorV41(src[i], src[i + 1], src[i + 2], selected, tolerance);

            if (!match) {
                dst[i] = Math.round(src[i] * 0.72 + 255 * 0.28);
                dst[i + 1] = Math.round(src[i + 1] * 0.72 + 255 * 0.28);
                dst[i + 2] = Math.round(src[i + 2] * 0.72 + 255 * 0.28);
                dst[i + 3] = src[i + 3];
                continue;
            }

            const cover = hexToRgbV41(match.previewColor);
            dst[i] = Math.round(src[i] * (1 - alpha) + cover.r * alpha);
            dst[i + 1] = Math.round(src[i + 1] * (1 - alpha) + cover.g * alpha);
            dst[i + 2] = Math.round(src[i + 2] * (1 - alpha) + cover.b * alpha);
            dst[i + 3] = 255;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.putImageData(output, 0, 0);
        state.part1ColorExtract.lastPreviewDataUrl = canvas.toDataURL("image/png");
        clearOverlay();
        updatePart1ColorStatusV41();
        savePart1ColorExtractStateV41();
    }

    function createPart1ButtonCandidateImageV41() {
        const part1 = ensurePart1ColorStateV41();

        if (!state.imageReady || !sourceCanvas.width || !sourceCanvas.height) {
            toast("원본 이미지 로딩이 끝난 뒤 다시 실행하세요.");
            return;
        }

        if (!part1.extracted || part1.colors.length === 0) {
            extractPart1ShapeColorsV41();
            return;
        }

        const selected = part1.colors.filter((item) => item.selected);

        if (selected.length === 0) {
            toast("버튼 후보로 사용할 색상을 하나 이상 선택하세요.");
            return;
        }

        const width = sourceCanvas.width;
        const height = sourceCanvas.height;
        const source = sourceCtx.getImageData(0, 0, width, height);
        const output = ctx.createImageData(width, height);
        const src = source.data;
        const dst = output.data;
        const tolerance = Math.max(0, Number($("part1ColorTolerance")?.value || part1.tolerance || 18));
        const masks = new Map(selected.map((item) => [item.id, {
            id: item.id,
            sourceColor: item.sourceColor,
            previewColor: item.previewColor,
            count: 0,
            minX: width,
            minY: height,
            maxX: -1,
            maxY: -1,
            spans: new Map()
        }]));

        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
                const offset = (y * width + x) * 4;
                const match = findMatchingPart1ColorV41(src[offset], src[offset + 1], src[offset + 2], selected, tolerance);

                if (!match) {
                    dst[offset] = 255;
                    dst[offset + 1] = 255;
                    dst[offset + 2] = 255;
                    dst[offset + 3] = 255;
                    continue;
                }

                const color = hexToRgbV41(match.previewColor);
                dst[offset] = color.r;
                dst[offset + 1] = color.g;
                dst[offset + 2] = color.b;
                dst[offset + 3] = 255;

                const mask = masks.get(match.id);
                if (mask) {
                    mask.count += 1;
                    mask.minX = Math.min(mask.minX, x);
                    mask.minY = Math.min(mask.minY, y);
                    mask.maxX = Math.max(mask.maxX, x);
                    mask.maxY = Math.max(mask.maxY, y);
                    addXToSpanMapV41(mask.spans, y, x);
                }
            }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.putImageData(output, 0, 0);

        resultCanvas.width = width;
        resultCanvas.height = height;
        resultCtx.putImageData(output, 0, 0);

        state.hasResult = true;
        state.saved = false;
        state.resultBaseDataUrl = canvas.toDataURL("image/png");
        state.lastStats = {
            seatRegions: selected.length,
            regionRoleCounts: selected.map((item) => ({ role: item.role || "button", count: item.count || 0 }))
        };

        const maskList = Array.from(masks.values())
            .filter((mask) => mask.count > 0)
            .map((mask) => ({
                id: mask.id,
                sourceColor: mask.sourceColor,
                previewColor: mask.previewColor,
                pixelCount: mask.count,
                bbox: {
                    x: mask.minX,
                    y: mask.minY,
                    w: mask.maxX - mask.minX + 1,
                    h: mask.maxY - mask.minY + 1
                },
                maskSpans: spanMapToMaskSpansV41(mask.spans)
            }));

        const meta = {
            width,
            height,
            mode: "button-image-color-extract-v41",
            tolerance,
            selectedColors: selected.map((item) => ({
                id: item.id,
                sourceColor: item.sourceColor,
                previewColor: item.previewColor,
                count: item.count,
                role: item.role
            })),
            masks: maskList,
            createdAt: new Date().toISOString()
        };

        localStorage.setItem(STORAGE.result, state.resultBaseDataUrl);
        localStorage.setItem(STORAGE.concertButton, state.resultBaseDataUrl);
        localStorage.setItem(STORAGE.meta, JSON.stringify(meta));
        localStorage.setItem(STORAGE.concertButtonMeta, JSON.stringify(meta));
        localStorage.setItem("seat_button_part1_color_extract", JSON.stringify(meta));

        savePart1ColorExtractStateV41();
        pushHistory("도형 색상 추출 기반 버튼 후보 이미지 생성");
        updateStats();
        setActionButtonsEnabled(true);
        setStep(2);
        toast("선택 색상만 남긴 버튼 후보 이미지를 생성했습니다.");
    }

    function findMatchingPart1ColorV41(r, g, b, colors, tolerance) {
        if (!colors || colors.length === 0) {
            return null;
        }

        let best = null;
        let bestDistance = Infinity;
        const limit = Math.max(4, tolerance) * 2.2;

        for (const item of colors) {
            const distance = colorDistanceV41({ r, g, b }, item.rgb);

            if (distance <= limit && distance < bestDistance) {
                best = item;
                bestDistance = distance;
            }
        }

        return best;
    }

    function addXToSpanMapV41(spanMap, y, x) {
        let list = spanMap.get(y);

        if (!list) {
            list = [];
            spanMap.set(y, list);
        }

        const last = list[list.length - 1];

        if (last && last[1] + 1 === x) {
            last[1] = x;
        } else {
            list.push([x, x]);
        }
    }

    function spanMapToMaskSpansV41(spanMap) {
        return Array.from(spanMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([y, ranges]) => ({ y, ranges }));
    }

    function savePart1ColorExtractStateV41() {
        const part1 = ensurePart1ColorStateV41();
        const payload = {
            tolerance: part1.tolerance,
            extracted: part1.extracted,
            colors: part1.colors.map((item) => ({
                id: item.id,
                sourceColor: item.sourceColor,
                previewColor: item.previewColor,
                count: item.count,
                role: item.role,
                selected: item.selected,
                saturation: item.saturation,
                lightness: item.lightness
            }))
        };

        localStorage.setItem("seat_button_part1_colors", JSON.stringify(payload));
    }

    function rgbToHslV41(r, g, b) {
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

            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                default:
                    h = (r - g) / d + 4;
                    break;
            }

            h /= 6;
        }

        return { h, s, l };
    }

    function colorDistanceV41(a, b) {
        const dr = (a.r || 0) - (b.r || 0);
        const dg = (a.g || 0) - (b.g || 0);
        const db = (a.b || 0) - (b.b || 0);
        return Math.sqrt((dr * dr) + (dg * dg) + (db * db));
    }

    function rgbToHexV41(r, g, b) {
        return `#${toHex2V41(r)}${toHex2V41(g)}${toHex2V41(b)}`.toUpperCase();
    }

    function hexToRgbV41(hex) {
        const value = String(hex || "#000000").replace("#", "");
        const normalized = value.length === 3
            ? value.split("").map((char) => char + char).join("")
            : value.padEnd(6, "0").slice(0, 6);

        return {
            r: parseInt(normalized.slice(0, 2), 16) || 0,
            g: parseInt(normalized.slice(2, 4), 16) || 0,
            b: parseInt(normalized.slice(4, 6), 16) || 0
        };
    }

    function toHex2V41(value) {
        return Math.max(0, Math.min(255, Math.round(value || 0))).toString(16).padStart(2, "0");
    }



    // ============================================================================
    // v42 patch: Part 1 그룹화 + 흑백 마스크 + 원본 미니맵/커서 확대
    // ============================================================================

    function ensurePart1ColorStateV41() {
        if (!state.part1ColorExtract) {
            state.part1ColorExtract = {
                colors: [],
                groups: [],
                extracted: false,
                tolerance: 18,
                previewMode: "mask",
                lastPreviewDataUrl: ""
            };
        }

        if (!Array.isArray(state.part1ColorExtract.colors)) {
            state.part1ColorExtract.colors = [];
        }

        if (!Array.isArray(state.part1ColorExtract.groups)) {
            state.part1ColorExtract.groups = [];
        }

        if (!state.part1ColorExtract.previewMode) {
            state.part1ColorExtract.previewMode = "mask";
        }

        return state.part1ColorExtract;
    }

    function bindPart1ColorExtractV41() {
        const extractButton = $("extractShapeColors");
        const nextStepButton = $("goPart2FromPart1");
        const restoreButton = $("restoreSource");

        replaceButtonListenerV41(extractButton, extractPart1ShapeColorsV41);
        replaceButtonListenerV41($("part1PreviewMask"), () => setPart1PreviewModeV42("mask"));
        replaceButtonListenerV41($("part1PreviewOverlay"), () => setPart1PreviewModeV42("overlay"));
        replaceButtonListenerV41(nextStepButton, createPart1ButtonCandidateImageV41);
        replaceButtonListenerV41(restoreButton, () => {
            restoreSourceImage();
            renderPart1ColorPaletteV41();
            drawPart1MiniMapV42();
        });

        const tolerance = $("part1ColorTolerance");
        if (tolerance && !tolerance.dataset.boundV42) {
            tolerance.dataset.boundV42 = "true";
            tolerance.addEventListener("input", () => {
                const part1 = ensurePart1ColorStateV41();
                part1.tolerance = Math.max(0, Number(tolerance.value) || 0);
                setText("part1ColorToleranceText", String(part1.tolerance));
                part1.groups = buildPart1ColorGroupsV42(part1.colors, part1.tolerance);
                renderPart1ColorPaletteV41();
                drawPart1SelectedColorPreviewV41();
            });
        }

        setText("part1ColorToleranceText", String(Number(tolerance?.value || 18)));
        setPart1PreviewModeV42(ensurePart1ColorStateV41().previewMode || "mask", { silent: true });
        bindPart1MiniMapV42();
    }

    function extractPart1ShapeColorsV41() {
        if (!state.imageReady || !sourceCanvas.width || !sourceCanvas.height) {
            toast("원본 이미지 로딩이 끝난 뒤 다시 실행하세요.");
            return;
        }

        const part1 = ensurePart1ColorStateV41();
        const width = sourceCanvas.width;
        const height = sourceCanvas.height;
        const image = sourceCtx.getImageData(0, 0, width, height);
        const buckets = new Map();
        const data = image.data;
        const step = 16;

        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];

            if (alpha < 10) {
                continue;
            }

            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const key = `${Math.round(r / step) * step},${Math.round(g / step) * step},${Math.round(b / step) * step}`;
            let bucket = buckets.get(key);

            if (!bucket) {
                bucket = { count: 0, r: 0, g: 0, b: 0 };
                buckets.set(key, bucket);
            }

            bucket.count += 1;
            bucket.r += r;
            bucket.g += g;
            bucket.b += b;
        }

        const minCount = Math.max(18, Math.floor((width * height) * 0.00004));
        const tolerance = Math.max(0, Number($("part1ColorTolerance")?.value || part1.tolerance || 18));
        const colors = Array.from(buckets.values())
            .filter((bucket) => bucket.count >= minCount)
            .map((bucket, index) => {
                const rgb = {
                    r: Math.round(bucket.r / bucket.count),
                    g: Math.round(bucket.g / bucket.count),
                    b: Math.round(bucket.b / bucket.count)
                };
                const hsl = rgbToHslV41(rgb.r, rgb.g, rgb.b);
                const hex = rgbToHexV41(rgb.r, rgb.g, rgb.b);
                const role = guessPart1ColorRoleV41(rgb, hsl, bucket.count, width * height);

                return {
                    id: `color-${index + 1}`,
                    sourceColor: hex,
                    rgb,
                    count: bucket.count,
                    ratio: bucket.count / Math.max(1, width * height),
                    saturation: hsl.s,
                    lightness: hsl.l,
                    hue: hsl.h,
                    role,
                    selected: role === "button",
                    previewColor: PART1_PREVIEW_COLORS_V41[index % PART1_PREVIEW_COLORS_V41.length]
                };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 96)
            .map((item, index) => ({
                ...item,
                id: `color-${index + 1}`,
                previewColor: PART1_PREVIEW_COLORS_V41[index % PART1_PREVIEW_COLORS_V41.length]
            }));

        part1.colors = colors;
        part1.groups = buildPart1ColorGroupsV42(colors, tolerance);
        part1.extracted = true;
        part1.tolerance = tolerance;
        part1.previewMode = part1.previewMode || "mask";

        autoSelectPart1CandidateColorsV41(false);
        renderPart1ColorPaletteV41();
        drawPart1SelectedColorPreviewV41();
        savePart1ColorExtractStateV41();
        drawPart1MiniMapV42();

        toast(`색상 ${colors.length}개를 추출하고 유사 색상 그룹 ${part1.groups.length}개로 묶었습니다.`);
    }

    function buildPart1ColorGroupsV42(colors, tolerance) {
        const groups = [];
        const limit = Math.max(30, 42 + (Number(tolerance) || 0) * 0.55);
        const sorted = [...(colors || [])].sort((a, b) => b.count - a.count);

        sorted.forEach((color) => {
            let bestGroup = null;
            let bestDistance = Infinity;

            groups.forEach((group) => {
                const distance = colorDistanceV41(color.rgb, group.center);
                const rolePenalty = color.role === group.role ? 0 : 12;
                const finalDistance = distance + rolePenalty;

                if (finalDistance <= limit && finalDistance < bestDistance) {
                    bestGroup = group;
                    bestDistance = finalDistance;
                }
            });

            if (!bestGroup) {
                bestGroup = {
                    id: `group-${groups.length + 1}`,
                    role: color.role,
                    center: { ...color.rgb },
                    count: 0,
                    colorIds: [],
                    previewColor: PART1_PREVIEW_COLORS_V41[groups.length % PART1_PREVIEW_COLORS_V41.length]
                };
                groups.push(bestGroup);
            }

            color.groupId = bestGroup.id;
            color.previewColor = bestGroup.previewColor;
            bestGroup.colorIds.push(color.id);
            bestGroup.count += color.count;
            const weight = Math.max(1, color.count);
            const prevWeight = Math.max(1, bestGroup.count - color.count);
            bestGroup.center = {
                r: Math.round(((bestGroup.center.r * prevWeight) + (color.rgb.r * weight)) / (prevWeight + weight)),
                g: Math.round(((bestGroup.center.g * prevWeight) + (color.rgb.g * weight)) / (prevWeight + weight)),
                b: Math.round(((bestGroup.center.b * prevWeight) + (color.rgb.b * weight)) / (prevWeight + weight))
            };
            bestGroup.sourceColor = rgbToHexV41(bestGroup.center.r, bestGroup.center.g, bestGroup.center.b);
        });

        groups.forEach((group, index) => {
            group.id = `group-${index + 1}`;
            group.colorIds.forEach((colorId) => {
                const color = colors.find((item) => item.id === colorId);
                if (color) {
                    color.groupId = group.id;
                    color.previewColor = group.previewColor;
                }
            });
        });

        return groups;
    }

    function syncPart1GroupsFromColorsV42() {
        const part1 = ensurePart1ColorStateV41();
        part1.groups = buildPart1ColorGroupsV42(part1.colors, part1.tolerance);
    }

    function autoSelectPart1CandidateColorsV41(forceToast) {
        const part1 = ensurePart1ColorStateV41();

        if (!part1.extracted || part1.colors.length === 0) {
            extractPart1ShapeColorsV41();
            return;
        }

        part1.colors.forEach((item) => {
            item.selected = item.role === "button";
        });
        syncPart1GroupsFromColorsV42();

        if (forceToast) {
            toast("도형 후보 그룹을 자동 선택했습니다.");
        }
    }

    function renderPart1ColorPaletteV41() {
        const palette = $("part1ColorPalette");
        const part1 = ensurePart1ColorStateV41();

        if (!palette) {
            return;
        }

        if (!part1.colors || part1.colors.length === 0) {
            palette.innerHTML = `
                <div class="button-image-empty-palette">
                    아직 추출된 색상이 없습니다. [도형 색상 추출]을 누르세요.
                </div>
            `;
            updatePart1ColorStatusV41();
            return;
        }

        if (!part1.groups || part1.groups.length === 0) {
            syncPart1GroupsFromColorsV42();
        }

        palette.innerHTML = `
            <div class="button-image-color-tile-grid">
                ${part1.groups.map((group, groupIndex) => renderPart1GroupTileV43(group, groupIndex)).join("")}
            </div>
        `;

        palette.querySelectorAll("[data-group-index]").forEach((button) => {
            button.addEventListener("click", () => {
                const groupIndex = Number(button.dataset.groupIndex);
                const group = part1.groups[groupIndex];
                const colors = getPart1GroupColorsV42(group);
                const allSelected = colors.length > 0 && colors.every((item) => item.selected);
                colors.forEach((item) => item.selected = !allSelected);
                part1.hoverGroupIndex = null;
                renderPart1ColorPaletteV41();
                drawPart1SelectedColorPreviewV41();
            });

            button.addEventListener("mouseenter", () => {
                const groupIndex = Number(button.dataset.groupIndex);
                part1.hoverGroupIndex = groupIndex;
                drawPart1SelectedColorPreviewV41({ hoverOnly: true });
            });

            button.addEventListener("mouseleave", () => {
                part1.hoverGroupIndex = null;
                drawPart1SelectedColorPreviewV41();
            });
        });

        updatePart1ColorStatusV41();
    }

    function renderPart1GroupTileV43(group, groupIndex) {
        const colors = getPart1GroupColorsV42(group);
        const selectedCount = colors.filter((item) => item.selected).length;
        const allSelected = colors.length > 0 && selectedCount === colors.length;
        const anySelected = selectedCount > 0;
        const selectedClass = anySelected ? "is-selected" : "";
        const partialClass = anySelected && !allSelected ? "is-partial" : "";
        const groupName = getPart1GroupNameV42(group, groupIndex);
        const countText = Number(group.count || 0).toLocaleString();
        const title = `${groupName} / ${colors.length}색 / ${selectedCount}/${colors.length} 선택 / ${countText}px`;

        return `
            <button type="button"
                    class="button-image-color-tile ${selectedClass} ${partialClass}"
                    data-group-index="${groupIndex}"
                    title="${escapeHtml(title)}">
                <span class="button-image-color-tile__swatch" style="background:${escapeHtml(group.sourceColor || '#ffffff')}"></span>
                <span class="button-image-color-tile__check" aria-hidden="true"></span>
            </button>
        `;
    }

    function getPart1GroupColorsV42(group) {
        const part1 = ensurePart1ColorStateV41();
        if (!group || !Array.isArray(group.colorIds)) {
            return [];
        }
        return group.colorIds
            .map((id) => part1.colors.find((item) => item.id === id))
            .filter(Boolean);
    }

    function getPart1GroupNameV42(group, index) {
        const roleText = getPart1RoleTextV41(group.role || "etc");
        return `${roleText} 그룹 ${index + 1}`;
    }

    function updatePart1ColorStatusV41() {
        const part1 = ensurePart1ColorStateV41();
        const selected = part1.colors.filter((item) => item.selected);
        const selectedGroups = (part1.groups || []).filter((group) => getPart1GroupColorsV42(group).some((item) => item.selected));
        const totalPixels = selected.reduce((sum, item) => sum + item.count, 0);
        const text = part1.colors.length === 0
            ? "색상을 추출하면 유사 색상 그룹이 표시됩니다."
            : `추출 ${part1.colors.length}개 / 그룹 ${part1.groups.length}개 / 선택 그룹 ${selectedGroups.length}개 / 선택 픽셀 ${totalPixels.toLocaleString()}px`;

        setText("part1ColorStatus", text);
    }

    function setPart1PreviewModeV42(mode, options = {}) {
        const part1 = ensurePart1ColorStateV41();
        part1.previewMode = mode === "overlay" ? "overlay" : "mask";

        const mask = $("part1PreviewMask");
        const overlayButton = $("part1PreviewOverlay");
        mask?.classList.toggle("is-active", part1.previewMode === "mask");
        overlayButton?.classList.toggle("is-active", part1.previewMode === "overlay");

        if (!options.silent) {
            drawPart1SelectedColorPreviewV41();
        }
    }

    function drawPart1SelectedColorPreviewV41(options = {}) {
        const part1 = ensurePart1ColorStateV41();

        if (!state.imageReady || !sourceCanvas.width || !sourceCanvas.height) {
            return;
        }

        if (!part1.extracted || part1.colors.length === 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(sourceCanvas, 0, 0);
            clearOverlay();
            drawPart1MiniMapV42();
            return;
        }

        const hoverGroup = Number.isInteger(options.hoverGroupIndex)
            ? part1.groups?.[options.hoverGroupIndex]
            : Number.isInteger(part1.hoverGroupIndex)
                ? part1.groups?.[part1.hoverGroupIndex]
                : null;
        const selected = hoverGroup
            ? getPart1GroupColorsV42(hoverGroup)
            : part1.colors.filter((item) => item.selected);
        const width = sourceCanvas.width;
        const height = sourceCanvas.height;
        const source = sourceCtx.getImageData(0, 0, width, height);
        const output = new ImageData(new Uint8ClampedArray(source.data), width, height);
        const src = source.data;
        const dst = output.data;
        const tolerance = Math.max(0, Number($("part1ColorTolerance")?.value || part1.tolerance || 18));
        const alpha = 0.68;
        const maskMode = part1.previewMode !== "overlay";

        for (let i = 0; i < src.length; i += 4) {
            const match = findMatchingPart1ColorV41(src[i], src[i + 1], src[i + 2], selected, tolerance);

            if (maskMode) {
                if (!match) {
                    dst[i] = 0;
                    dst[i + 1] = 0;
                    dst[i + 2] = 0;
                    dst[i + 3] = 255;
                    continue;
                }

                dst[i] = src[i];
                dst[i + 1] = src[i + 1];
                dst[i + 2] = src[i + 2];
                dst[i + 3] = 255;
                continue;
            }

            if (!match) {
                dst[i] = Math.round(src[i] * 0.72 + 255 * 0.28);
                dst[i + 1] = Math.round(src[i + 1] * 0.72 + 255 * 0.28);
                dst[i + 2] = Math.round(src[i + 2] * 0.72 + 255 * 0.28);
                dst[i + 3] = src[i + 3];
                continue;
            }

            const cover = hexToRgbV41(match.previewColor);
            dst[i] = Math.round(src[i] * (1 - alpha) + cover.r * alpha);
            dst[i + 1] = Math.round(src[i + 1] * (1 - alpha) + cover.g * alpha);
            dst[i + 2] = Math.round(src[i + 2] * (1 - alpha) + cover.b * alpha);
            dst[i + 3] = 255;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.putImageData(output, 0, 0);
        syncCanvasDisplay();
        state.part1ColorExtract.lastPreviewDataUrl = canvas.toDataURL("image/png");
        clearOverlay();
        updatePart1ColorStatusV41();
        savePart1ColorExtractStateV41();
        drawPart1MiniMapV42();
    }

    function createPart1ButtonCandidateImageV41() {
        const part1 = ensurePart1ColorStateV41();

        if (!state.imageReady || !sourceCanvas.width || !sourceCanvas.height) {
            toast("원본 이미지 로딩이 끝난 뒤 다시 실행하세요.");
            return;
        }

        if (!part1.extracted || part1.colors.length === 0) {
            extractPart1ShapeColorsV41();
            return;
        }

        const selected = part1.colors.filter((item) => item.selected);

        if (selected.length === 0) {
            toast("버튼 후보로 사용할 색상을 하나 이상 선택하세요.");
            return;
        }

        const width = sourceCanvas.width;
        const height = sourceCanvas.height;
        const source = sourceCtx.getImageData(0, 0, width, height);
        const output = ctx.createImageData(width, height);
        const src = source.data;
        const dst = output.data;
        const tolerance = Math.max(0, Number($("part1ColorTolerance")?.value || part1.tolerance || 18));
        const masks = new Map(selected.map((item) => [item.id, {
            id: item.id,
            groupId: item.groupId || "",
            sourceColor: item.sourceColor,
            previewColor: item.previewColor,
            count: 0,
            minX: width,
            minY: height,
            maxX: -1,
            maxY: -1,
            spans: new Map()
        }]));

        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
                const offset = (y * width + x) * 4;
                const match = findMatchingPart1ColorV41(src[offset], src[offset + 1], src[offset + 2], selected, tolerance);

                if (!match) {
                    dst[offset] = 0;
                    dst[offset + 1] = 0;
                    dst[offset + 2] = 0;
                    dst[offset + 3] = 255;
                    continue;
                }

                dst[offset] = src[offset];
                dst[offset + 1] = src[offset + 1];
                dst[offset + 2] = src[offset + 2];
                dst[offset + 3] = 255;

                const mask = masks.get(match.id);
                if (mask) {
                    mask.count += 1;
                    mask.minX = Math.min(mask.minX, x);
                    mask.minY = Math.min(mask.minY, y);
                    mask.maxX = Math.max(mask.maxX, x);
                    mask.maxY = Math.max(mask.maxY, y);
                    addXToSpanMapV41(mask.spans, y, x);
                }
            }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.putImageData(output, 0, 0);
        syncCanvasDisplay();

        resultCanvas.width = width;
        resultCanvas.height = height;
        resultCtx.putImageData(output, 0, 0);

        state.hasResult = true;
        state.saved = false;
        state.resultBaseDataUrl = canvas.toDataURL("image/png");
        state.lastStats = {
            seatRegions: selected.length,
            regionRoleCounts: selected.map((item) => ({ role: item.role || "button", count: item.count || 0 }))
        };

        const selectedGroups = (part1.groups || [])
            .filter((group) => getPart1GroupColorsV42(group).some((item) => item.selected))
            .map((group) => ({
                id: group.id,
                role: group.role,
                sourceColor: group.sourceColor,
                previewColor: group.previewColor,
                count: group.count,
                colorIds: group.colorIds
            }));

        const maskList = Array.from(masks.values())
            .filter((mask) => mask.count > 0)
            .map((mask) => ({
                id: mask.id,
                groupId: mask.groupId,
                sourceColor: mask.sourceColor,
                previewColor: mask.previewColor,
                pixelCount: mask.count,
                bbox: {
                    x: mask.minX,
                    y: mask.minY,
                    w: mask.maxX - mask.minX + 1,
                    h: mask.maxY - mask.minY + 1
                },
                maskSpans: spanMapToMaskSpansV41(mask.spans)
            }));

        const meta = {
            width,
            height,
            mode: "button-image-color-extract-v43-selected-color-black",
            tolerance,
            previewMode: "mask",
            selectedGroups,
            selectedColors: selected.map((item) => ({
                id: item.id,
                groupId: item.groupId || "",
                sourceColor: item.sourceColor,
                previewColor: item.previewColor,
                count: item.count,
                role: item.role
            })),
            masks: maskList,
            createdAt: new Date().toISOString()
        };

        localStorage.setItem(STORAGE.result, state.resultBaseDataUrl);
        localStorage.setItem(STORAGE.concertButton, state.resultBaseDataUrl);
        localStorage.setItem(STORAGE.meta, JSON.stringify(meta));
        localStorage.setItem(STORAGE.concertButtonMeta, JSON.stringify(meta));
        localStorage.setItem("seat_button_part1_color_extract", JSON.stringify(meta));

        savePart1ColorExtractStateV41();
        pushHistory("유사 색상 그룹 기반 선택 색상 버튼 후보 이미지 생성");
        updateStats();
        setActionButtonsEnabled(true);
        setStep(2);
        drawPart1MiniMapV42();
        toast("선택한 그룹/색상은 원본 색상 유지, 제외 영역은 검은색인 버튼 후보 이미지를 생성했습니다.");
    }

    function savePart1ColorExtractStateV41() {
        const part1 = ensurePart1ColorStateV41();
        const payload = {
            tolerance: part1.tolerance,
            extracted: part1.extracted,
            previewMode: part1.previewMode,
            groups: (part1.groups || []).map((group) => ({
                id: group.id,
                role: group.role,
                sourceColor: group.sourceColor,
                previewColor: group.previewColor,
                count: group.count,
                colorIds: group.colorIds
            })),
            colors: part1.colors.map((item) => ({
                id: item.id,
                groupId: item.groupId || "",
                sourceColor: item.sourceColor,
                previewColor: item.previewColor,
                count: item.count,
                role: item.role,
                selected: item.selected,
                saturation: item.saturation,
                lightness: item.lightness,
                hue: item.hue
            }))
        };

        localStorage.setItem("seat_button_part1_colors", JSON.stringify(payload));
    }

    function bindPart1MiniMapV42() {
        if (state.__part1MiniMapBoundV42) {
            drawPart1MiniMapV42();
            return;
        }

        state.__part1MiniMapBoundV42 = true;
        const main = document.querySelector(".seatmap-main");
        const mini = $("part1MiniMapCanvas");

        if (main) {
            main.addEventListener("scroll", () => requestAnimationFrame(drawPart1MiniMapV42));
        }

        if (mini) {
            mini.addEventListener("mouseenter", (event) => {
                const point = getPart1MiniMapSourcePointV43(event);
                drawPart1MiniMapFloatV46(point);
            });
            mini.addEventListener("mousemove", (event) => {
                const point = getPart1MiniMapSourcePointV43(event);
                drawPart1MiniMapFloatV46(point);
                requestAnimationFrame(drawPart1MiniMapV42);
            });
            mini.addEventListener("mouseleave", () => {
                hidePart1MiniMapFloatV46();
            });
        }

        window.addEventListener("resize", () => requestAnimationFrame(drawPart1MiniMapV42));
        setInterval(drawPart1MiniMapV42, 700);
        drawPart1MiniMapV42();
    }

    function positionPart1MiniMapFloatV46() {
        const mini = $("part1MiniMapCanvas");
        const floatCanvas = $("part1MiniMapFloatCanvas");

        if (!mini || !floatCanvas) {
            return;
        }

        const rect = mini.getBoundingClientRect();
        const width = Math.round(rect.width * 2);
        const height = Math.round(rect.height * 2);
        let left = rect.left - width - 14;
        let top = rect.top;

        if (left < 12) {
            left = 12;
        }

        if (top + height > window.innerHeight - 12) {
            top = Math.max(12, window.innerHeight - height - 12);
        }

        floatCanvas.style.width = `${width}px`;
        floatCanvas.style.height = `${height}px`;
        floatCanvas.style.left = `${left}px`;
        floatCanvas.style.top = `${top}px`;
    }

    function hidePart1MiniMapFloatV46() {
        const floatCanvas = $("part1MiniMapFloatCanvas");

        if (!floatCanvas) {
            return;
        }

        floatCanvas.classList.remove("is-visible");
    }

    function drawPart1MiniMapFloatV46(point) {
        const floatCanvas = $("part1MiniMapFloatCanvas");

        if (!floatCanvas || !sourceCanvas.width || !sourceCanvas.height) {
            return;
        }

        positionPart1MiniMapFloatV46();
        floatCanvas.classList.add("is-visible");

        const ctx = floatCanvas.getContext("2d");
        const w = floatCanvas.width;
        const h = floatCanvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);

        const scale = Math.min(w / sourceCanvas.width, h / sourceCanvas.height);
        const drawW = sourceCanvas.width * scale;
        const drawH = sourceCanvas.height * scale;
        const ox = (w - drawW) / 2;
        const oy = (h - drawH) / 2;

        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(sourceCanvas, ox, oy, drawW, drawH);

        drawPart1ViewportRectOnContextV44(ctx, ox, oy, scale);

        if (point) {
            const x = Math.max(0, Math.min(sourceCanvas.width - 1, Math.round(point.x)));
            const y = Math.max(0, Math.min(sourceCanvas.height - 1, Math.round(point.y)));
            const px = ox + x * scale;
            const py = oy + y * scale;

            ctx.save();
            ctx.strokeStyle = "#ef4444";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(px, oy);
            ctx.lineTo(px, oy + drawH);
            ctx.moveTo(ox, py);
            ctx.lineTo(ox + drawW, py);
            ctx.stroke();
            ctx.restore();
        }
    }

    function getPart1MiniMapSourcePointV43(event) {
        const mini = $("part1MiniMapCanvas");
        if (!mini || !sourceCanvas.width || !sourceCanvas.height) {
            return null;
        }

        const rect = mini.getBoundingClientRect();
        const scale = Math.min(mini.width / sourceCanvas.width, mini.height / sourceCanvas.height);
        const drawW = sourceCanvas.width * scale;
        const drawH = sourceCanvas.height * scale;
        const ox = (mini.width - drawW) / 2;
        const oy = (mini.height - drawH) / 2;
        const mx = (event.clientX - rect.left) * (mini.width / Math.max(1, rect.width));
        const my = (event.clientY - rect.top) * (mini.height / Math.max(1, rect.height));
        const x = (mx - ox) / Math.max(0.0001, scale);
        const y = (my - oy) / Math.max(0.0001, scale);

        return {
            x: Math.max(0, Math.min(sourceCanvas.width - 1, x)),
            y: Math.max(0, Math.min(sourceCanvas.height - 1, y))
        };
    }

    function drawPart1MiniMapV42() {
        const mini = $("part1MiniMapCanvas");
        if (!mini || !sourceCanvas.width || !sourceCanvas.height) {
            return;
        }

        const miniCtx = mini.getContext("2d");
        const w = mini.width;
        const h = mini.height;
        miniCtx.clearRect(0, 0, w, h);
        miniCtx.fillStyle = "#f8fafc";
        miniCtx.fillRect(0, 0, w, h);

        const scale = Math.min(w / sourceCanvas.width, h / sourceCanvas.height);
        const drawW = sourceCanvas.width * scale;
        const drawH = sourceCanvas.height * scale;
        const ox = (w - drawW) / 2;
        const oy = (h - drawH) / 2;

        miniCtx.drawImage(sourceCanvas, ox, oy, drawW, drawH);

        const main = document.querySelector(".seatmap-main");
        if (!main || !canvas.width || !canvas.height) {
            return;
        }

        const canvasRect = canvas.getBoundingClientRect();
        const mainRect = main.getBoundingClientRect();
        const visibleLeft = Math.max(mainRect.left, canvasRect.left);
        const visibleTop = Math.max(mainRect.top, canvasRect.top);
        const visibleRight = Math.min(mainRect.right, canvasRect.right);
        const visibleBottom = Math.min(mainRect.bottom, canvasRect.bottom);

        if (visibleRight <= visibleLeft || visibleBottom <= visibleTop) {
            return;
        }

        const imageX = (visibleLeft - canvasRect.left) * (canvas.width / Math.max(1, canvasRect.width));
        const imageY = (visibleTop - canvasRect.top) * (canvas.height / Math.max(1, canvasRect.height));
        const imageW = (visibleRight - visibleLeft) * (canvas.width / Math.max(1, canvasRect.width));
        const imageH = (visibleBottom - visibleTop) * (canvas.height / Math.max(1, canvasRect.height));

        miniCtx.save();
        miniCtx.strokeStyle = "#ef4444";
        miniCtx.lineWidth = 2;
        miniCtx.setLineDash([5, 3]);
        miniCtx.strokeRect(ox + imageX * scale, oy + imageY * scale, imageW * scale, imageH * scale);
        miniCtx.restore();
    }

    function updatePart1HoverZoomV42(point) {
        const zoomCanvas = $("part1HoverZoomCanvas");
        if (!zoomCanvas || !sourceCanvas.width || !sourceCanvas.height) {
            return;
        }

        const zoomCtx = zoomCanvas.getContext("2d");
        const w = zoomCanvas.width;
        const h = zoomCanvas.height;
        zoomCtx.imageSmoothingEnabled = true;
        zoomCtx.clearRect(0, 0, w, h);
        zoomCtx.fillStyle = "#f8fafc";
        zoomCtx.fillRect(0, 0, w, h);

        const scale = Math.min(w / sourceCanvas.width, h / sourceCanvas.height);
        const drawW = sourceCanvas.width * scale;
        const drawH = sourceCanvas.height * scale;
        const ox = (w - drawW) / 2;
        const oy = (h - drawH) / 2;

        // 특정 픽셀 crop 확대가 아니라, 원본 전체 사진을 더 크게 다시 그린다.
        zoomCtx.drawImage(sourceCanvas, ox, oy, drawW, drawH);

        // 현재 메인 화면 위치도 전체 확대 화면에 같이 표시한다.
        drawPart1ViewportRectOnContextV44(zoomCtx, ox, oy, scale);

        if (point) {
            const x = Math.max(0, Math.min(sourceCanvas.width - 1, Math.round(point.x)));
            const y = Math.max(0, Math.min(sourceCanvas.height - 1, Math.round(point.y)));
            const px = ox + x * scale;
            const py = oy + y * scale;

            zoomCtx.save();
            zoomCtx.strokeStyle = "#ef4444";
            zoomCtx.lineWidth = 2;
            zoomCtx.beginPath();
            zoomCtx.moveTo(px, Math.max(oy, py - 18));
            zoomCtx.lineTo(px, Math.min(oy + drawH, py + 18));
            zoomCtx.moveTo(Math.max(ox, px - 18), py);
            zoomCtx.lineTo(Math.min(ox + drawW, px + 18), py);
            zoomCtx.stroke();
            zoomCtx.restore();

            const pixel = sourceCtx.getImageData(x, y, 1, 1).data;
            const hex = rgbToHexV41(pixel[0], pixel[1], pixel[2]);
            setText("part1HoverZoomText", `원본 전체 확대 · X ${x}, Y ${y} · ${hex}`);
            return;
        }

        setText("part1HoverZoomText", "원본 전체 확대입니다. 미니맵 위에 커서를 올리면 위치만 빨간 십자로 표시됩니다.");
    }

    function drawPart1ViewportRectOnContextV44(targetCtx, ox, oy, scale) {
        const main = document.querySelector(".seatmap-main");
        if (!main || !canvas.width || !canvas.height) {
            return;
        }

        const canvasRect = canvas.getBoundingClientRect();
        const mainRect = main.getBoundingClientRect();
        const visibleLeft = Math.max(mainRect.left, canvasRect.left);
        const visibleTop = Math.max(mainRect.top, canvasRect.top);
        const visibleRight = Math.min(mainRect.right, canvasRect.right);
        const visibleBottom = Math.min(mainRect.bottom, canvasRect.bottom);

        if (visibleRight <= visibleLeft || visibleBottom <= visibleTop) {
            return;
        }

        const imageX = (visibleLeft - canvasRect.left) * (canvas.width / Math.max(1, canvasRect.width));
        const imageY = (visibleTop - canvasRect.top) * (canvas.height / Math.max(1, canvasRect.height));
        const imageW = (visibleRight - visibleLeft) * (canvas.width / Math.max(1, canvasRect.width));
        const imageH = (visibleBottom - visibleTop) * (canvas.height / Math.max(1, canvasRect.height));

        targetCtx.save();
        targetCtx.strokeStyle = "#ef4444";
        targetCtx.lineWidth = 2;
        targetCtx.setLineDash([5, 3]);
        targetCtx.strokeRect(ox + imageX * scale, oy + imageY * scale, imageW * scale, imageH * scale);
        targetCtx.restore();
    }



    // ============================================================================
    // v47 patch: Part 2 selected-group solidify + hole fill + noise cleanup
    // ============================================================================

    function bindPart2SolidifyV47() {
        replaceButtonListenerV41($("part2AutoSolidify"), runPart2SolidifySelectedGroupsV47);

        const holeInput = $("part2HoleThreshold");
        const noiseInput = $("part2NoiseThreshold");

        const syncText = () => {
            setText("part2HoleThresholdText", `${Number(holeInput?.value || 160)}px`);
            setText("part2NoiseThresholdText", `${Number(noiseInput?.value || 20)}px`);
        };

        if (holeInput && !holeInput.dataset.boundV47) {
            holeInput.dataset.boundV47 = "true";
            holeInput.addEventListener("input", syncText);
        }

        if (noiseInput && !noiseInput.dataset.boundV47) {
            noiseInput.dataset.boundV47 = "true";
            noiseInput.addEventListener("input", syncText);
        }

        syncText();
    }

    function runPart2SolidifySelectedGroupsV47() {
        const part1 = ensurePart1ColorStateV41();

        if (!state.hasResult || !canvas.width || !canvas.height) {
            toast("먼저 파트 1에서 버튼 후보 이미지를 생성하세요.");
            return;
        }

        const selectedGroups = collectPart2SelectedGroupsV47(part1);
        if (selectedGroups.length === 0) {
            toast("파트 1에서 선택된 색상 그룹이 없습니다.");
            return;
        }

        const width = canvas.width;
        const height = canvas.height;
        const source = ctx.getImageData(0, 0, width, height);
        const src = source.data;
        const groupMap = new Int16Array(width * height);
        groupMap.fill(-1);
        const tolerance = Math.max(0, Number($("part1ColorTolerance")?.value || part1.tolerance || 18));
        const holeThreshold = Math.max(1, Number($("part2HoleThreshold")?.value || 160));
        const noiseThreshold = Math.max(1, Number($("part2NoiseThreshold")?.value || 20));
        const selectedColors = part1.colors.filter((item) => item.selected);
        const groupIndexById = new Map(selectedGroups.map((group, index) => [group.id, index]));

        for (let i = 0; i < width * height; i += 1) {
            const offset = i * 4;
            const r = src[offset];
            const g = src[offset + 1];
            const b = src[offset + 2];
            const alpha = src[offset + 3];

            if (alpha < 10 || (r <= 10 && g <= 10 && b <= 10)) {
                groupMap[i] = -1;
                continue;
            }

            const match = findMatchingPart1ColorV41(r, g, b, selectedColors, tolerance);
            if (!match) {
                groupMap[i] = -1;
                continue;
            }

            groupMap[i] = groupIndexById.has(match.groupId)
                ? groupIndexById.get(match.groupId)
                : -1;
        }

        const holeFillCount = fillBlackHolesByMajorityV47(groupMap, width, height, holeThreshold);
        const cleanupCount = cleanupSmallColorComponentsV47(groupMap, width, height, noiseThreshold);
        const output = new ImageData(width, height);
        const dst = output.data;
        const colorPixelsByGroup = new Array(selectedGroups.length).fill(0);

        for (let i = 0; i < width * height; i += 1) {
            const groupIndex = groupMap[i];
            const offset = i * 4;

            if (groupIndex < 0 || !selectedGroups[groupIndex]) {
                dst[offset] = 0;
                dst[offset + 1] = 0;
                dst[offset + 2] = 0;
                dst[offset + 3] = 255;
                continue;
            }

            const rgb = selectedGroups[groupIndex].rgb;
            dst[offset] = rgb.r;
            dst[offset + 1] = rgb.g;
            dst[offset + 2] = rgb.b;
            dst[offset + 3] = 255;
            colorPixelsByGroup[groupIndex] += 1;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.putImageData(output, 0, 0);
        syncCanvasDisplay();
        syncResultFromVisible();

        state.hasResult = true;
        state.saved = false;
        state.resultBaseDataUrl = canvas.toDataURL("image/png");
        state.lastStats = {
            seatRegions: selectedGroups.length,
            regionRoleCounts: selectedGroups.map((group, index) => ({
                role: group.role || "button",
                count: colorPixelsByGroup[index] || 0
            })),
            holeFillCount,
            cleanupCount
        };

        const metaRaw = localStorage.getItem(STORAGE.meta);
        let meta = {};
        try {
            meta = metaRaw ? JSON.parse(metaRaw) : {};
        } catch (error) {
            meta = {};
        }
        meta.width = width;
        meta.height = height;
        meta.mode = "button-image-part2-solidify-v47";
        meta.selectedGroups = selectedGroups.map((group, index) => ({
            id: group.id,
            role: group.role,
            sourceColor: group.sourceColor,
            pixelCount: colorPixelsByGroup[index] || 0
        }));
        meta.holeThreshold = holeThreshold;
        meta.noiseThreshold = noiseThreshold;
        meta.holeFillCount = holeFillCount;
        meta.cleanupCount = cleanupCount;
        meta.createdAt = new Date().toISOString();

        localStorage.setItem(STORAGE.result, state.resultBaseDataUrl);
        localStorage.setItem(STORAGE.concertButton, state.resultBaseDataUrl);
        localStorage.setItem(STORAGE.meta, JSON.stringify(meta));
        localStorage.setItem(STORAGE.concertButtonMeta, JSON.stringify(meta));

        setText("part2SolidifyStatus", `단색화 완료 · 내부 구멍 ${holeFillCount}개 메움 · 작은 조각 ${cleanupCount}개 정리`);
        pushHistory("파트2 버튼 네모 단색화");
        updateStats();
        toast("파트 1 선택 그룹 기준으로 버튼 네모 단색화를 완료했습니다.");
    }

    function collectPart2SelectedGroupsV47(part1) {
        const groups = (part1.groups || []).filter((group) => getPart1GroupColorsV42(group).some((item) => item.selected));
        return groups.map((group, index) => {
            const rgb = hexToRgbV41(group.sourceColor || PART1_PREVIEW_COLORS_V41[index % PART1_PREVIEW_COLORS_V41.length]);
            return {
                id: group.id,
                role: group.role,
                sourceColor: group.sourceColor || rgbToHexV41(rgb.r, rgb.g, rgb.b),
                rgb,
                colorIds: Array.isArray(group.colorIds) ? group.colorIds.slice() : []
            };
        });
    }

    function fillBlackHolesByMajorityV47(groupMap, width, height, maxHoleSize) {
        const visited = new Uint8Array(width * height);
        const queue = new Int32Array(width * height);
        const dirs = [-1, 1, -width, width];
        let filled = 0;

        for (let start = 0; start < groupMap.length; start += 1) {
            if (groupMap[start] !== -1 || visited[start]) {
                continue;
            }

            let head = 0;
            let tail = 0;
            queue[tail++] = start;
            visited[start] = 1;
            const component = [];
            let touchesEdge = false;
            const neighborCounts = new Map();

            while (head < tail) {
                const current = queue[head++];
                component.push(current);
                const x = current % width;
                const y = Math.floor(current / width);

                if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
                    touchesEdge = true;
                }

                if (x > 0) {
                    tail = visitNeighborForHoleV47(current - 1, neighborCounts, visited, queue, tail, groupMap);
                }
                if (x < width - 1) {
                    tail = visitNeighborForHoleV47(current + 1, neighborCounts, visited, queue, tail, groupMap);
                }
                if (y > 0) {
                    tail = visitNeighborForHoleV47(current - width, neighborCounts, visited, queue, tail, groupMap);
                }
                if (y < height - 1) {
                    tail = visitNeighborForHoleV47(current + width, neighborCounts, visited, queue, tail, groupMap);
                }
            }

            if (touchesEdge || component.length > maxHoleSize || neighborCounts.size === 0) {
                continue;
            }

            let bestGroup = -1;
            let bestCount = 0;
            neighborCounts.forEach((count, groupIndex) => {
                if (count > bestCount) {
                    bestCount = count;
                    bestGroup = Number(groupIndex);
                }
            });

            if (bestGroup < 0) {
                continue;
            }

            component.forEach((index) => {
                groupMap[index] = bestGroup;
            });
            filled += 1;
        }

        return filled;
    }

    function visitNeighborForHoleV47(index, neighborCounts, visited, queue, tail, groupMap) {
        if (groupMap[index] === -1) {
            if (!visited[index]) {
                visited[index] = 1;
                queue[tail] = index;
                tail += 1;
            }
            return tail;
        }

        neighborCounts.set(groupMap[index], (neighborCounts.get(groupMap[index]) || 0) + 1);
        return tail;
    }

    function cleanupSmallColorComponentsV47(groupMap, width, height, minSize) {
        const visited = new Uint8Array(width * height);
        const queue = new Int32Array(width * height);
        let cleaned = 0;

        for (let start = 0; start < groupMap.length; start += 1) {
            if (groupMap[start] < 0 || visited[start]) {
                continue;
            }

            const targetGroup = groupMap[start];
            let head = 0;
            let tail = 0;
            queue[tail++] = start;
            visited[start] = 1;
            const component = [];
            const neighborCounts = new Map();

            while (head < tail) {
                const current = queue[head++];
                component.push(current);
                const x = current % width;
                const y = Math.floor(current / width);
                const neighbors = [];
                if (x > 0) neighbors.push(current - 1);
                if (x < width - 1) neighbors.push(current + 1);
                if (y > 0) neighbors.push(current - width);
                if (y < height - 1) neighbors.push(current + width);

                neighbors.forEach((next) => {
                    if (groupMap[next] === targetGroup) {
                        if (!visited[next]) {
                            visited[next] = 1;
                            queue[tail++] = next;
                        }
                    } else if (groupMap[next] >= 0) {
                        neighborCounts.set(groupMap[next], (neighborCounts.get(groupMap[next]) || 0) + 1);
                    }
                });
            }

            if (component.length >= minSize) {
                continue;
            }

            let replacement = -1;
            let bestCount = 0;
            neighborCounts.forEach((count, groupIndex) => {
                if (count > bestCount) {
                    bestCount = count;
                    replacement = Number(groupIndex);
                }
            });

            component.forEach((index) => {
                groupMap[index] = replacement;
            });
            cleaned += 1;
        }

        return cleaned;
    }

    setTimeout(bindPart1ColorExtractV41, 0);
    setTimeout(bindPart2SolidifyV47, 0);

})();

// v52 safety patch: Part1 next 버튼을 눌렀을 때 UI가 Part2로 확실히 넘어가도록 보정한다.
document.addEventListener("DOMContentLoaded", () => {
    const next = document.getElementById("goPart2FromPart1");
    if (!next || next.dataset.part2SafetyBound === "true") return;
    next.dataset.part2SafetyBound = "true";

    next.addEventListener("click", () => {
        window.setTimeout(() => {
            const part1 = document.getElementById("part1");
            const part2 = document.getElementById("part2");
            if (!part2) return;

            document.querySelectorAll(".button-image-step").forEach((section) => {
                section.classList.remove("is-active");
                section.querySelector(".button-image-step__header")?.classList.remove("active");
                const status = section.querySelector(".button-image-step__status");
                if (status) status.textContent = "대기";
            });

            part2.classList.add("is-active");
            part2.querySelector(".button-image-step__header")?.classList.add("active");
            const status = part2.querySelector(".button-image-step__status");
            if (status) status.textContent = "진행중";

            part2.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
    });
});
