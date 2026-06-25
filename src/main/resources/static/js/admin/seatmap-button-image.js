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
        }
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
        const priority = [
            STORAGE.original,
            STORAGE.concertOriginal,
            STORAGE.concertClean,
            STORAGE.result
        ];

        for (const key of priority) {
            const value = localStorage.getItem(key);
            if (value && value.startsWith("data:image")) {
                return { key, dataUrl: value };
            }
        }

        return { key: "", dataUrl: "" };
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

    function buildHeaderStyleSavePayload() {
        const imageDataUrl = getHeaderStyleCurrentImageDataUrl();
        const pageState = buildButtonImageResultState(imageDataUrl);
        const jsonText = JSON.stringify(pageState, null, 2);
        const htmlText = buildButtonImageResultHtml(pageState);

        return {
            page: "button-image",
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
            groups: state.groups.map((group) => ({
                id: group.id,
                name: group.name,
                gradeName: group.gradeName,
                color: group.output,
                role: ROLE_NAME.get(group.role) || String(group.role)
            })),
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
            stats: state.lastStats ? clone(state.lastStats) : null
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
        if (state.historyIndex <= 0) {
            return;
        }

        state.historyIndex -= 1;
        restoreHistory(state.history[state.historyIndex]);
    }

    function redo() {
        if (state.historyIndex >= state.history.length - 1) {
            return;
        }

        state.historyIndex += 1;
        restoreHistory(state.history[state.historyIndex]);
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
            undoButton.disabled = state.historyIndex <= 0;
        }

        if (redoButton) {
            redoButton.disabled = state.historyIndex >= state.history.length - 1;
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

        if (nextStep > 1 && !state.hasResult) {
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
        setBrushMode("paint", { silent: true });
        toast(`칠할 색상 변경: ${hex}`);
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
            : getBrushPaintColor();

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

    function getBrushPaintColor() {
        const input = $("regionColorInput");
        const hex = input?.value || state.region.color || "#ef5e94";
        return hexToRgb(hex);
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
})();
