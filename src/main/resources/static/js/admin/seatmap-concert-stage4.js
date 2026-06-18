(() => {
    "use strict";

    const STORAGE_KEYS = {
        overviewImage: "concert_overviewImage",
        sections: "concert_sections",
        stage3Seats: "concert_stage3_seats",
        sectionLayouts: "concert_stage3_section_layouts",
        stage3Data: "concert_stage3_data",
        layoutJson: "concert_seat_layout_json",
        bookingJson: "concert_seat_booking_json",
        layoutJsonUrl: "concert_seat_layout_json_url",
        bookingJsonUrl: "concert_seat_booking_json_url",
    };

    const SEAT_STATUS = {
        AVAILABLE: "AVAILABLE",
        REMOVED: "REMOVED",
        OBSTRUCTED: "OBSTRUCTED",
    };

    const dom = {};
    const state = {
        sections: readStorageJson(STORAGE_KEYS.sections, []),
        seatsBySection: readStorageJson(STORAGE_KEYS.stage3Seats, {}),
        layoutsBySection: readStorageJson(STORAGE_KEYS.sectionLayouts, {}),
        stage3Data: readStorageJson(STORAGE_KEYS.stage3Data, {}),
        overviewImage: localStorage.getItem(STORAGE_KEYS.overviewImage),
        layoutJson: null,
        bookingJson: null,
    };

    document.addEventListener("DOMContentLoaded", init);

    function init() {
        cacheDom();
        refreshGeneratedData();
        bindEvents();
    }

    function cacheDom() {
        [
            "toast",
            "sumFloors",
            "sumSections",
            "sumSeats",
            "sumObstructed",
            "summaryText",
            "gradeSummaryList",
            "layoutPreviewCanvas",
            "layoutSizeText",
            "layoutJsonPreview",
            "bookingJsonPreview",
            "rawJsonDetails",
            "saveAllJson",
            "saveAllJsonTop",
            "saveAllJsonMain",
            "copyLayoutJson",
            "copyLayoutJsonMain",
            "copyBookingJson",
            "copyBookingJsonMain",
            "saveResultText",
        ].forEach((id) => {
            dom[id] = document.getElementById(id);
        });
    }

    function readStorageJson(key, fallback) {
        try {
            return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
        } catch (error) {
            console.warn(`[Seatmap Stage4] localStorage parse failed: ${key}`, error);
            return fallback;
        }
    }

    function writeStorageJson(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.warn(`[Seatmap Stage4] localStorage write failed: ${key}`, error);
        }
    }

    function showToast(message) {
        if (!dom.toast) return;
        dom.toast.textContent = message;
        dom.toast.classList.add("show");
        clearTimeout(showToast._timer);
        showToast._timer = setTimeout(() => dom.toast.classList.remove("show"), 1900);
    }

    function cleanCode(value, fallback) {
        const raw = String(value || fallback || "").trim();
        const cleaned = raw
            .replace(/^구역\s*/, "")
            .replace(/층/g, "")
            .replace(/\s+/g, "")
            .replace(/[^\w가-힣-]/g, "");
        return cleaned || String(fallback || "A");
    }

    function floorCode(section) {
        const matched = String(section.floor || "1층").match(/\d+/);
        return matched ? matched[0] : cleanCode(section.floor, "1");
    }

    function sectionCode(section) {
        return cleanCode(section.label || section.name || section.id, section.id);
    }

    function getSectionPaths(section) {
        if (!section) return [];
        if (section.buttonShape?.paths?.length) return section.buttonShape.paths;
        if (section.buttonPolygon?.length) return [section.buttonPolygon];
        if (section.polygon?.length) return [section.polygon];
        return [];
    }

    function getBBoxFromSections() {
        const points = state.sections.flatMap((section) => getSectionPaths(section).flat());
        if (!points.length) return { width: 900, height: 620 };

        return {
            width: Math.ceil(Math.max(900, ...points.map((point) => Number(point.x || 0) + 40))),
            height: Math.ceil(Math.max(620, ...points.map((point) => Number(point.y || 0) + 40))),
        };
    }

    function roundPoint(point) {
        return {
            x: Math.round(Number(point.x || 0) * 100) / 100,
            y: Math.round(Number(point.y || 0) * 100) / 100,
        };
    }

    function roundNumber(value) {
        return Math.round(Number(value || 0) * 100) / 100;
    }

    function buildJsons() {
        const bbox = getBBoxFromSections();
        const size = {
            width: state.stage3Data.width || bbox.width,
            height: state.stage3Data.height || bbox.height,
        };

        const layoutSections = state.sections.map((section) => {
            const seats = (state.seatsBySection[section.id] || [])
                .filter((seat) => seat.status !== SEAT_STATUS.REMOVED)
                .map((seat) => ({
                    id: seat.id || `${floorCode(section)}-${sectionCode(section)}-${seat.row}-${seat.col}`,
                    row: seat.row,
                    col: seat.col,
                    x: roundNumber(seat.x),
                    y: roundNumber(seat.y),
                    w: roundNumber(seat.w),
                    h: roundNumber(seat.h),
                    color: seat.status === SEAT_STATUS.OBSTRUCTED
                        ? "#f59e0b"
                        : (seat.color || section.renderColor || "#dedede"),
                    status: seat.status === SEAT_STATUS.OBSTRUCTED
                        ? SEAT_STATUS.OBSTRUCTED
                        : SEAT_STATUS.AVAILABLE,
                }));

            return {
                id: section.id,
                name: section.name,
                label: section.label,
                floor: section.floor || "1층",
                grade: section.grade || "일반석",
                price: Number(section.price || 0),
                color: section.renderColor || "#d9d9d9",
                polygon: (section.polygon || []).map(roundPoint),
                buttonPolygon: (section.buttonPolygon || []).map(roundPoint),
                buttonShape: section.buttonShape
                    ? {
                        source: section.buttonShape.source || "stage2",
                        paths: (section.buttonShape.paths || []).map((path) => path.map(roundPoint)),
                    }
                    : null,
                layout: state.layoutsBySection[section.id] || null,
                seats,
            };
        });

        const bookingSeats = [];

        layoutSections.forEach((section) => {
            section.seats.forEach((seat) => {
                bookingSeats.push({
                    id: seat.id,
                    floor: floorCode(section),
                    sectionId: section.id,
                    section: sectionCode(section),
                    sectionName: section.name || section.label || section.id,
                    row: seat.row,
                    col: seat.col,
                    grade: section.grade || "일반석",
                    price: Number(section.price || 0),
                    status: seat.status,
                });
            });
        });

        state.layoutJson = {
            type: "CONCERT_SEAT_LAYOUT",
            version: 1,
            width: size.width,
            height: size.height,
            overviewImage: state.overviewImage || null,
            sections: layoutSections,
            updatedAt: new Date().toISOString(),
        };

        state.bookingJson = {
            type: "CONCERT_BOOKING_SEATS",
            version: 1,
            seats: bookingSeats,
            updatedAt: new Date().toISOString(),
        };

        writeStorageJson(STORAGE_KEYS.layoutJson, state.layoutJson);
        writeStorageJson(STORAGE_KEYS.bookingJson, state.bookingJson);
    }

    function renderSummary() {
        const seats = state.bookingJson?.seats || [];
        const floors = new Set(seats.map((seat) => seat.floor));
        const sections = new Set(seats.map((seat) => seat.sectionId));
        const obstructed = seats.filter((seat) => seat.status === SEAT_STATUS.OBSTRUCTED).length;
        const gradeMap = new Map();

        seats.forEach((seat) => {
            const key = `${seat.grade}_${seat.price}`;
            const before = gradeMap.get(key) || {
                grade: seat.grade,
                price: seat.price,
                count: 0,
                color: findGradeColor(seat.grade),
            };
            before.count += 1;
            gradeMap.set(key, before);
        });

        if (dom.sumFloors) dom.sumFloors.textContent = floors.size;
        if (dom.sumSections) dom.sumSections.textContent = sections.size;
        if (dom.sumSeats) dom.sumSeats.textContent = seats.length;
        if (dom.sumObstructed) dom.sumObstructed.textContent = obstructed;

        if (dom.summaryText) {
            dom.summaryText.textContent = `최종 ${floors.size}개 층, ${sections.size}개 구역, ${seats.length}석입니다. 장애석은 ${obstructed}석입니다.`;
        }

        if (dom.gradeSummaryList) {
            dom.gradeSummaryList.innerHTML = Array.from(gradeMap.values())
                .map((item) => `
                    <div class="grade-summary-row">
                        <span><i style="background:${safeColor(item.color)}"></i>${escapeHtml(item.grade)}</span>
                        <b>${item.count}석</b>
                    </div>
                `)
                .join("") || '<div class="help-text">좌석 없음</div>';
        }
    }

    function findGradeColor(grade) {
        const section = state.layoutJson?.sections?.find((item) => item.grade === grade);
        return section?.color || "#d9d9d9";
    }

    function safeColor(value) {
        const raw = String(value || "").trim();
        if (/^#[0-9a-fA-F]{3}$/.test(raw)) return raw;
        if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
        return "#d9d9d9";
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function makeLayoutPreviewJson() {
        const image = state.layoutJson?.overviewImage;
        return {
            ...state.layoutJson,
            overviewImage: image ? `[base64 생략 ${image.length}자]` : null,
        };
    }

    function renderJsonPreviews() {
        if (dom.layoutJsonPreview) {
            dom.layoutJsonPreview.value = JSON.stringify(makeLayoutPreviewJson(), null, 2);
        }

        if (dom.bookingJsonPreview) {
            dom.bookingJsonPreview.value = JSON.stringify(state.bookingJson, null, 2);
        }
    }

    function refreshGeneratedData() {
        buildJsons();
        renderSummary();
        renderLayoutPreview();

        if (dom.rawJsonDetails?.open) {
            renderJsonPreviews();
        }
    }

    function renderLayoutPreview() {
        const canvas = dom.layoutPreviewCanvas;
        if (!canvas || !state.layoutJson) return;

        const ctx = canvas.getContext("2d");
        const sourceWidth = Number(state.layoutJson.width || 900);
        const sourceHeight = Number(state.layoutJson.height || 620);
        const maxWidth = 980;
        const maxHeight = 720;
        const previewScale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight, 1.5);
        const cssWidth = Math.max(320, Math.round(sourceWidth * previewScale));
        const cssHeight = Math.max(220, Math.round(sourceHeight * previewScale));
        const ratio = window.devicePixelRatio || 1;

        canvas.width = Math.round(cssWidth * ratio);
        canvas.height = Math.round(cssHeight * ratio);
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const drawScale = previewScale * ratio;
        ctx.setTransform(drawScale, 0, 0, drawScale, 0, 0);

        drawPreviewBackground(ctx, sourceWidth, sourceHeight);

        const sections = state.layoutJson.sections || [];
        if (!sections.length) {
            drawEmptyPreview(ctx, sourceWidth, sourceHeight);
        } else {
            sections.forEach((section) => drawSectionShape(ctx, section));
            sections.forEach((section) => drawSectionLabel(ctx, section));
        }

        if (dom.layoutSizeText) {
            dom.layoutSizeText.textContent = `${sourceWidth} × ${sourceHeight}`;
        }
    }

    function drawPreviewBackground(ctx, width, height) {
        ctx.save();
        ctx.fillStyle = "#f1f5f9";
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1;

        const gap = 20;
        for (let x = 0; x <= width; x += gap) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        for (let y = 0; y <= height; y += gap) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        ctx.restore();
    }

    function drawEmptyPreview(ctx, width, height) {
        ctx.save();
        ctx.fillStyle = "#94a3b8";
        ctx.font = "700 22px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("미리보기 데이터 없음", width / 2, height / 2);
        ctx.restore();
    }

    function drawSectionShape(ctx, section) {
        const paths = getSectionPreviewPaths(section);
        if (!paths.length) return;

        ctx.save();
        ctx.fillStyle = safeColor(section.color || "#d9d9d9");
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        paths.forEach((path) => {
            if (!path.length) return;

            ctx.beginPath();
            path.forEach((point, index) => {
                const x = Number(point.x || 0);
                const y = Number(point.y || 0);

                if (index === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        });

        ctx.restore();
    }

    function getSectionPreviewPaths(section) {
        if (section.buttonShape?.paths?.length) return section.buttonShape.paths;
        if (section.buttonPolygon?.length) return [section.buttonPolygon];
        if (section.polygon?.length) return [section.polygon];
        return [];
    }

    function drawSectionLabel(ctx, section) {
        const paths = getSectionPreviewPaths(section);
        const bounds = getPathsBounds(paths);
        if (!bounds) return;

        const width = bounds.maxX - bounds.minX;
        const height = bounds.maxY - bounds.minY;
        if (width < 24 || height < 18) return;

        const label = makeSectionPreviewLabel(section);
        const lines = makeWrappedLines(label, width);

        let fontSize = calculateFontSize(lines, width, height);
        if (fontSize < 10) return;

        ctx.save();
        ctx.fillStyle = pickTextColor(section.color);
        ctx.font = `900 ${fontSize}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const centerX = bounds.minX + width / 2;
        const centerY = bounds.minY + height / 2;
        const lineHeight = Math.round(fontSize * 1.15);
        const totalHeight = lineHeight * lines.length;
        let y = centerY - totalHeight / 2 + lineHeight / 2;

        lines.forEach((line) => {
            ctx.fillText(line, centerX, y);
            y += lineHeight;
        });

        ctx.restore();
    }

    function makeSectionPreviewLabel(section) {
        const raw = String(section.name || section.label || section.id || "").trim();
        return raw || "구역";
    }

    function makeWrappedLines(text, width) {
        const words = text.split(/\s+/).filter(Boolean);
        if (words.length <= 1) return [text];

        const lines = [];
        let current = "";

        words.forEach((word) => {
            const next = current ? `${current} ${word}` : word;
            const maxChars = Math.max(4, Math.floor(width / 14));

            if (next.length <= maxChars) {
                current = next;
            } else {
                if (current) lines.push(current);
                current = word;
            }
        });

        if (current) lines.push(current);

        if (lines.length > 3) {
            return [text];
        }

        return lines;
    }

    function calculateFontSize(lines, boxWidth, boxHeight) {
        const longestLine = lines.reduce((max, line) => Math.max(max, line.length), 1);
        const widthBased = Math.floor(boxWidth / Math.max(1.8, longestLine * 0.7));
        const heightBased = Math.floor(boxHeight / Math.max(1.8, lines.length * 1.4));
        return Math.max(10, Math.min(34, widthBased, heightBased));
    }

    function getPathsBounds(paths) {
        const points = paths.flat();
        if (!points.length) return null;

        const xs = points.map((point) => Number(point.x || 0));
        const ys = points.map((point) => Number(point.y || 0));

        return {
            minX: Math.min(...xs),
            maxX: Math.max(...xs),
            minY: Math.min(...ys),
            maxY: Math.max(...ys),
        };
    }

    function pickTextColor(background) {
        const hex = safeColor(background).replace("#", "");
        const full = hex.length === 3
            ? hex.split("").map((char) => char + char).join("")
            : hex;

        const r = parseInt(full.slice(0, 2), 16);
        const g = parseInt(full.slice(2, 4), 16);
        const b = parseInt(full.slice(4, 6), 16);
        const luminance = (0.299 * r) + (0.587 * g) + (0.114 * b);

        return luminance > 165 ? "#0f172a" : "#ffffff";
    }

    async function saveAllJson() {
        refreshGeneratedData();

        const baseFileName = makeBaseFileName();
        const layoutResult = await saveJson(`${baseFileName}-layout.json`, state.layoutJson);
        const bookingResult = await saveJson(`${baseFileName}-booking.json`, state.bookingJson);

        if (layoutResult?.jsonUrl) {
            localStorage.setItem(STORAGE_KEYS.layoutJsonUrl, layoutResult.jsonUrl);
        }

        if (bookingResult?.jsonUrl) {
            localStorage.setItem(STORAGE_KEYS.bookingJsonUrl, bookingResult.jsonUrl);
        }

        if (dom.saveResultText) {
            dom.saveResultText.textContent =
                `저장 완료 · 배치용: ${layoutResult?.jsonUrl || "실패"} / 예매용: ${bookingResult?.jsonUrl || "실패"}`;
        }

        showToast("JSON 저장 완료");
    }

    async function saveJson(fileName, jsonValue) {
        const response = await fetch("/admin/seatmap/json/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fileName,
                json: JSON.stringify(jsonValue, null, 2),
            }),
        });

        if (!response.ok) {
            throw new Error(`${fileName} 저장 실패`);
        }

        return response.json();
    }

    function makeBaseFileName() {
        const concertId = localStorage.getItem("concert_id") || "concert";
        const sessionId = localStorage.getItem("concert_session_id") || "session";
        return `seatmap-${concertId}-${sessionId}`;
    }

    async function copyString(value) {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(value);
                showToast("JSON 복사 완료");
                return;
            }
        } catch (error) {
            console.warn("[Seatmap Stage4] clipboard write failed", error);
        }

        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "readonly");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);

        showToast("JSON 복사 완료");
    }

    function bindEvents() {
        const saveHandler = () => {
            saveAllJson().catch((error) => {
                console.error(error);
                showToast("JSON 저장 실패");
            });
        };

        const copyLayoutHandler = () => {
            refreshGeneratedData();
            copyString(JSON.stringify(state.layoutJson, null, 2)).catch((error) => {
                console.error(error);
                showToast("JSON 복사 실패");
            });
        };

        const copyBookingHandler = () => {
            refreshGeneratedData();
            copyString(JSON.stringify(state.bookingJson, null, 2)).catch((error) => {
                console.error(error);
                showToast("JSON 복사 실패");
            });
        };

        [
            dom.saveAllJson,
            dom.saveAllJsonTop,
            dom.saveAllJsonMain,
        ].forEach((button) => {
            button?.addEventListener("click", saveHandler);
        });

        [
            dom.copyLayoutJson,
            dom.copyLayoutJsonMain,
        ].forEach((button) => {
            button?.addEventListener("click", copyLayoutHandler);
        });

        [
            dom.copyBookingJson,
            dom.copyBookingJsonMain,
        ].forEach((button) => {
            button?.addEventListener("click", copyBookingHandler);
        });

        dom.rawJsonDetails?.addEventListener("toggle", () => {
            if (dom.rawJsonDetails.open) {
                renderJsonPreviews();
            }
        });

        window.addEventListener("resize", debounce(() => {
            renderLayoutPreview();
        }, 120));
    }

    function debounce(fn, wait) {
        let timer = null;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), wait);
        };
    }
})();