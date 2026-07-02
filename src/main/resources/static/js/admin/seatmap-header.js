(() => {
    "use strict";

    const SAVE_URL = "/admin/seatmap/temp-save";

    const STORAGE_KEYS = {
        stage1Seats: "concert_stage1_seats",
        stage1Sections: "concert_stage1_sections",
        stage1Layouts: "concert_stage1_layouts",
        stage1VisualGroups: "concert_stage1_visualGroups",
        stage1GeneratedImage: "concert_stage1_generatedImage",
        cleanImage: "concert_cleanImage",
        concertSections: "concert_sections",
        stage3Seats: "concert_stage3_seats",
        stage3Layouts: "concert_stage3_layouts",
        buttonImage: "concert_buttonImage",
        originalImage: "concert_originalImage"
    };

    document.addEventListener("DOMContentLoaded", () => {
        initSaveInfo();

        const button = document.getElementById("seatmapHeaderSave");

        if (!button) {
            return;
        }

        button.addEventListener("click", () => saveSeatmapTemp(button));
    });

    function initSaveInfo() {
        updateSaveInfoIdle();
    }

    async function saveSeatmapTemp(button) {
        const originalText = button.textContent;

        try {
            button.disabled = true;
            button.textContent = "저장 중...";
            updateSaveInfoSaving();

            const stageSpecificSave = getStageSpecificSave();
            if (stageSpecificSave) {
                const stageSpecificResult = await stageSpecificSave();
                if (!stageSpecificResult) {
                    throw new Error("저장할 데이터가 없거나 Stage 저장에 실패했습니다.");
                }

                console.log("[SeatTrace] stage specific save result", stageSpecificResult);
                button.textContent = "저장 완료";
                updateSaveInfoSuccess(stageSpecificResult);

                window.setTimeout(() => {
                    button.textContent = originalText;
                    button.disabled = false;
                }, 900);
                return;
            }

            const payload = await buildTempSavePayload();

            const response = await fetch(SAVE_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "same-origin",
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || "저장 실패");
            }

            const result = await response.json();

            console.log("[SeatTrace] temp save result", result);

            button.textContent = "저장 완료";
            updateSaveInfoSuccess(result);

            window.setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
            }, 900);
        } catch (error) {
            console.error(error);
            button.textContent = "저장 실패";
            updateSaveInfoError(error.message);
            alert("저장 실패: " + error.message);

            window.setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
            }, 1200);
        }
    }

    function getStageSpecificSave() {
        const adapters = [
            window.SeatMapStage1,
            window.SeatMapStage2,
            window.SeatMapStage3,
            window.SeatMapStage4,
            window.SeatMapStage5,
            window.SeatmapStage6Decorate
        ];

        for (const adapter of adapters) {
            if (adapter && typeof adapter.save === "function") {
                return adapter.save;
            }
        }

        return null;
    }

    async function buildTempSavePayload() {
        const imageDataUrl = await getCurrentImageDataUrl();
        const source = collectStageData();
        const seatJson = buildSeatJson(source);
        const sectionJson = buildSectionJson(source);

        return {
            page: getPageName(),
            folderName: getCurrentProjectId(),
            seatJsonText: seatJson.length ? JSON.stringify(seatJson, null, 2) : "",
            sectionJsonText: sectionJson.length ? JSON.stringify(sectionJson, null, 2) : "",
            bookingButtonJsonText: readStoredText("concert_booking_buttons"),
            decorationJsonText: readStoredText("seatmap_decorations"),
            imageDataUrl
        };
    }

    function collectStageData() {
        const visualGroups = normalizeArray(readJson(STORAGE_KEYS.stage1VisualGroups, []));
        const sections = normalizeArray(
            readJson(STORAGE_KEYS.stage1Sections, readJson(STORAGE_KEYS.concertSections, []))
        );
        const seatsBySection = normalizeSeatsBySection(
            readJson(STORAGE_KEYS.stage1Seats, readJson(STORAGE_KEYS.stage3Seats, {}))
        );
        const layoutsBySection = readJson(STORAGE_KEYS.stage1Layouts, readJson(STORAGE_KEYS.stage3Layouts, {})) || {};
        const canvasSize = getCanvasSize();

        return {
            visualGroups,
            sections,
            seatsBySection,
            layoutsBySection,
            width: canvasSize.width,
            height: canvasSize.height
        };
    }

    function buildSeatJson(source) {
        const sectionMap = new Map();

        source.sections.forEach((section) => {
            sectionMap.set(String(section.id || section.name || section.label || ""), section);
        });

        const visualGroups = source.visualGroups || [];
        const result = [];

        Object.entries(source.seatsBySection).forEach(([sourceSectionId, seats]) => {
            const visualGroup = findVisualGroupBySourceSectionId(visualGroups, sourceSectionId);
            const finalSectionId = visualGroup?.id || sourceSectionId;
            const section = sectionMap.get(String(sourceSectionId)) || visualGroup || { id: sourceSectionId, name: sourceSectionId, label: sourceSectionId };

            normalizeArray(seats).forEach((seat) => {
                if (String(seat.status || "").toUpperCase() === "REMOVED") {
                    return;
                }

                const normalized = normalizeSeatForSave(seat, section, finalSectionId, sourceSectionId);
                result.push(normalized);
            });
        });

        return result;
    }

    function normalizeSeatForSave(seat, section, finalSectionId, sourceSectionId) {
        const floor = cleanIdPart(seat.floor || section.floor || "1");
        const sectionName = cleanIdPart(seat.section || seat.sectionName || section.label || section.name || sourceSectionId || finalSectionId || "A");
        const row = cleanIdPart(seat.row || seat.seatRow || 1);
        const col = cleanIdPart(seat.col || seat.no || seat.seatCol || 1);
        const grade = cleanIdPart(seat.grade || section.grade || "UNASSIGNED");
        const status = cleanIdPart(seat.status || "AVAILABLE");
        const id = seat.id || [floor, sectionName, row, col, grade, status].join("-");

        return {
            id
        };
    }

    function buildSectionJson(source) {
        const visualGroups = source.visualGroups.length > 0
            ? source.visualGroups
            : source.sections;

        return visualGroups.map((item, index) => {
            const polygons = getSectionPolygons(item);
            const polygon = polygons[0] || getSectionPolygon(item);
            const bbox = getPolygonBbox(polygons.flat().length ? polygons.flat() : polygon);
            const layout = source.layoutsBySection[item.id] || item.layout || {};
            const label = item.label || item.name || (item.id ? String(item.id) : `구역 ${index + 1}`);
            const color = item.color || item.renderColor || "#d9d9d9";
            const angle = roundNumber(item.angle ?? layout.angle ?? 0);
            const sectionIds = normalizeArray(item.sectionIds || item.sourceRegionIds || item.sections || item.regionIds || item.id);

            return {
                id: item.id || `vg-${index + 1}`,
                name: item.name || label,
                label,
                floor: item.floor || "1",
                grade: item.grade || "TEMP",
                color,
                sectionIds,
                sourceRegionIds: sectionIds,
                polygon,
                polygons,
                bbox,
                button: {
                    x: roundNumber(bbox.x + bbox.w / 2),
                    y: roundNumber(bbox.y + bbox.h / 2),
                    w: roundNumber(bbox.w),
                    h: roundNumber(bbox.h),
                    xPercent: percent(bbox.x + bbox.w / 2, source.width),
                    yPercent: percent(bbox.y + bbox.h / 2, source.height),
                    wPercent: percent(bbox.w, source.width),
                    hPercent: percent(bbox.h, source.height),
                    angle,
                    label,
                    color
                }
            };
        });
    }

    function findVisualGroupBySourceSectionId(visualGroups, sectionId) {
        const key = String(sectionId || "");

        return normalizeArray(visualGroups).find((group) => {
            const ids = normalizeArray(group.sectionIds || group.sourceRegionIds || group.regionIds || []);
            return ids.map((value) => String(value)).includes(key) || String(group.id || "") === key;
        }) || null;
    }

    function getSectionPolygons(section) {
        if (Array.isArray(section.polygons) && section.polygons.length > 0) {
            return section.polygons
                .filter((polygon) => Array.isArray(polygon) && polygon.length >= 3)
                .map((polygon) => polygon.map((point) => ({
                    x: roundNumber(point.x),
                    y: roundNumber(point.y)
                })));
        }

        const polygon = getSectionPolygon(section);
        return polygon.length >= 3 ? [polygon] : [];
    }

    async function getCurrentImageDataUrl() {
        if (window.SeatmapStage6Decorate && typeof window.SeatmapStage6Decorate.exportImage === "function") {
            const finalImage = window.SeatmapStage6Decorate.exportImage();
            if (finalImage && finalImage.startsWith("data:image")) {
                return finalImage;
            }
        }

        if (window.SeatMapCrop && typeof window.SeatMapCrop.exportSelectedImage === "function") {
            const cropped = window.SeatMapCrop.exportSelectedImage();
            if (cropped && cropped.startsWith("data:image")) {
                return cropped;
            }
        }

        const storedImage =
            localStorage.getItem(STORAGE_KEYS.stage1GeneratedImage) ||
            localStorage.getItem(STORAGE_KEYS.cleanImage);

        if (storedImage && storedImage.startsWith("data:image")) {
            return storedImage;
        }

        const canvas = document.getElementById("canvas");

        if (canvas && canvas.width > 0 && canvas.height > 0) {
            try {
                return canvas.toDataURL("image/png");
            } catch (error) {
                console.warn("[SeatTrace] canvas export failed", error);
            }
        }

        const imageUrl =
            localStorage.getItem(STORAGE_KEYS.stage1GeneratedImage) ||
            localStorage.getItem(STORAGE_KEYS.cleanImage) ||
            localStorage.getItem(STORAGE_KEYS.buttonImage) ||
            localStorage.getItem(STORAGE_KEYS.originalImage) ||
            "";

        if (imageUrl && imageUrl.startsWith("/")) {
            return await urlToDataUrl(imageUrl);
        }

        return imageUrl || "";
    }

    async function urlToDataUrl(url) {
        const response = await fetch(url, {
            method: "GET",
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("이미지 URL을 읽지 못했습니다: " + url);
        }

        const blob = await response.blob();

        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    function getSectionPolygon(section) {
        const source = section.polygon || section.points || section.shape || [];

        if (Array.isArray(source) && source.length > 0) {
            return source.map((point) => ({
                x: roundNumber(point.x),
                y: roundNumber(point.y)
            }));
        }

        const bbox = section.bbox || section.button || section;
        const x = Number(bbox.x || 0);
        const y = Number(bbox.y || 0);
        const w = Number(bbox.w || bbox.width || 0);
        const h = Number(bbox.h || bbox.height || 0);

        return [
            { x, y },
            { x: x + w, y },
            { x: x + w, y: y + h },
            { x, y: y + h }
        ];
    }

    function getPolygonBbox(points) {
        if (!points.length) {
            return { x: 0, y: 0, w: 0, h: 0 };
        }

        const xs = points.map((point) => Number(point.x || 0));
        const ys = points.map((point) => Number(point.y || 0));
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        return {
            x: roundNumber(minX),
            y: roundNumber(minY),
            w: roundNumber(maxX - minX),
            h: roundNumber(maxY - minY)
        };
    }

    function normalizeArray(value) {
        if (Array.isArray(value)) {
            return value;
        }

        if (value == null || value === "") {
            return [];
        }

        return [value];
    }

    function normalizeSeatsBySection(value) {
        if (!value) {
            return {};
        }

        if (Array.isArray(value)) {
            const grouped = {};

            value.forEach((seat) => {
                const key = String(seat.sectionId || seat.section || seat.sectionName || "default");

                if (!grouped[key]) {
                    grouped[key] = [];
                }

                grouped[key].push(seat);
            });

            return grouped;
        }

        return value;
    }

    function readStoredText(key) {
        const value = localStorage.getItem(key);
        return value && value.trim() ? value : "";
    }

    function readJson(key, fallback) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : fallback;
        } catch (error) {
            console.warn("[SeatTrace] localStorage parse failed:", key, error);
            return fallback;
        }
    }

    function getCanvasSize() {
        const canvas = document.getElementById("canvas");

        if (canvas && canvas.width > 0 && canvas.height > 0) {
            return {
                width: canvas.width,
                height: canvas.height
            };
        }

        const meta = readJson("concert_imageMeta", {});

        return {
            width: Number(meta.width || 0),
            height: Number(meta.height || 0)
        };
    }

    function updateSaveInfoIdle() {
        const box = document.getElementById("seatmapSaveInfo");
        const title = document.getElementById("seatmapSaveInfoTitle");
        const pathText = document.getElementById("seatmapSavePathText");

        if (!box || !title || !pathText) {
            return;
        }

        box.classList.remove("is-saving", "is-saved", "is-error");
        const tempPaths = getTempPaths();
        const defaultTitle = box.dataset.saveTitle || "저장 위치: 좌석 JSON · 구역 JSON · 도형 이미지";
        const defaultPath = box.dataset.savePath || `${tempPaths.seats} · ${tempPaths.sections} · ${tempPaths.image}`;

        title.textContent = defaultTitle;
        pathText.textContent = defaultPath;
    }

    function updateSaveInfoSaving() {
        const box = document.getElementById("seatmapSaveInfo");
        const title = document.getElementById("seatmapSaveInfoTitle");
        const pathText = document.getElementById("seatmapSavePathText");

        if (!box || !title || !pathText) {
            return;
        }

        box.classList.remove("is-saved", "is-error");
        box.classList.add("is-saving");
        const tempPaths = getTempPaths();
        const defaultTitle = box.dataset.saveTitle || "저장 위치: 좌석 JSON · 구역 JSON · 도형 이미지";
        const defaultPath = box.dataset.savePath || tempPaths.base;

        title.textContent = "저장 중: " + defaultTitle.replace(/^저장 위치:\s*/, "");
        pathText.textContent = defaultPath;
    }

    function updateSaveInfoSuccess(result) {
        const box = document.getElementById("seatmapSaveInfo");
        const title = document.getElementById("seatmapSaveInfoTitle");
        const pathText = document.getElementById("seatmapSavePathText");

        if (!box || !title || !pathText) {
            return;
        }

        const time = new Date().toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });

        box.classList.remove("is-saving", "is-error");
        box.classList.add("is-saved");
        const tempPaths = getTempPaths();
        const defaultTitle = box.dataset.saveTitle || "저장 위치: 좌석 JSON · 구역 JSON · 도형 이미지";
        title.textContent = `최근 저장 완료: ${time} / ${defaultTitle.replace(/^저장 위치:\s*/, "")}`;

        if (result.finalImageUrl || result.styleJsonUrl) {
            pathText.textContent = [result.finalImageUrl, result.styleJsonUrl].filter(Boolean).join(" · ");
            return;
        }

        pathText.textContent = [
            result.seatJsonUrl || tempPaths.seats,
            result.sectionJsonUrl || tempPaths.sections,
            result.buttonImageUrl || result.imageUrl || tempPaths.image
        ].join(" · ");
    }

    function updateSaveInfoError(message) {
        const box = document.getElementById("seatmapSaveInfo");
        const title = document.getElementById("seatmapSaveInfoTitle");
        const pathText = document.getElementById("seatmapSavePathText");

        if (!box || !title || !pathText) {
            return;
        }

        box.classList.remove("is-saving", "is-saved");
        box.classList.add("is-error");
        title.textContent = "저장 실패";
        pathText.textContent = message || "서버 저장 요청을 확인하세요.";
    }


    function getTempPaths() {
        const projectId = cleanProjectPathPart(getCurrentProjectId());
        const base = `/temp/seatmap/${projectId}`;
        const page = getPageName();
        let imageFileName = "seatmap-image.png";

        if (page === "stage1") {
            imageFileName = "cropped-image.png";
        } else if (page === "stage2" || page === "stage3" || page === "stage4") {
            imageFileName = "button-image.png";
        } else if (page === "stage5") {
            imageFileName = "debug-polygons.png";
        }

        return {
            base: `${base}/`,
            seats: `${base}/seats/index.json`,
            sections: `${base}/seatmap-sections.json`,
            image: `${base}/${imageFileName}`
        };
    }

    function cleanProjectPathPart(value) {
        const cleaned = String(value || "seat")
            .trim()
            .replace(/\s+/g, "_")
            .replace(/[^a-zA-Z0-9가-힣._-]/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_+|_+$/g, "");

        return cleaned || "seat";
    }

    function getPageName() {
        const path = location.pathname;

        if (path.includes("/stage/1") || path.includes("crop-rotate")) return "stage1";
        if (path.includes("/stage/2") || path.includes("button-image")) return "stage2";
        if (path.includes("/stage/3") || path.includes("concert/stage1")) return "stage3";
        if (path.includes("/stage/4") || path.includes("concert/stage2")) return "stage4";
        if (path.includes("/stage/5") || path.includes("concert/stage3")) return "stage5";
        if (path.includes("/stage/6") || path.includes("concert/stage4")) return "stage6";

        return "seatmap";
    }

    function getCurrentProjectId() {
        const fromQuery = new URLSearchParams(location.search).get("projectId");
        const fromDataset = document.querySelector("[data-project-id]")?.dataset?.projectId;
        const fromStorage = localStorage.getItem("seatmap_current_folder_name") || localStorage.getItem("seatmap_current_project_id");
        return cleanProjectPathPart(fromQuery || fromDataset || fromStorage || "seat");
    }

    function cleanIdPart(value) {
        return String(value ?? "")
            .trim()
            .replace(/\s+/g, "")
            .replace(/-/g, "")
            .replace(/[^\w가-힣]/g, "");
    }

    function roundNumber(value) {
        return Math.round(Number(value || 0) * 100) / 100;
    }

    function percent(value, total) {
        const number = Number(total || 0);

        if (!number) {
            return 0;
        }

        return roundNumber(Number(value || 0) / number * 100);
    }
})();
