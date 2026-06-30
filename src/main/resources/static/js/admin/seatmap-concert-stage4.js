(() => {
    "use strict";

    const STORAGE_KEYS = {
        sections: "concert_sections",
        stage3Seats: "concert_stage3_seats",
        stage3Layouts: "concert_stage3_layouts",
        stage: "concert_stage",
        imageMeta: "concert_imageMeta",
        generatedOverviewImage: "concert_generated_overviewImage",
        layoutJson: "concert_layout_json",
        bookingJson: "concert_booking_seats",
        layoutJsonUrl: "concert_layout_json_url",
        bookingJsonUrl: "concert_booking_json_url"
    };

    const SEAT_STATUS = {
        AVAILABLE: "AVAILABLE",
        REMOVED: "REMOVED",
        OBSTRUCTED: "OBSTRUCTED"
    };

    const COLORS = {
        bg: "#ffffff",
        stage: "#111827",
        stageText: "#ffffff",
        sectionFallback: "#8b5cf6",
        seat: "#d9d9d9",
        obstructed: "#f59e0b",
        line: "#ffffff"
    };

    const dom = {};

    const state = {
        sections: readStorageJson(STORAGE_KEYS.sections, []),
        seatsBySection: readStorageJson(STORAGE_KEYS.stage3Seats, {}),
        layoutsBySection: readStorageJson(STORAGE_KEYS.stage3Layouts, {}),
        stage: readStorageJson(STORAGE_KEYS.stage, null),
        imageMeta: readStorageJson(STORAGE_KEYS.imageMeta, {}),
        overviewImage: localStorage.getItem(STORAGE_KEYS.generatedOverviewImage) || "",
        layoutJson: null,
        bookingJson: null
    };

    document.addEventListener("DOMContentLoaded", init);

    function init() {
        cacheDom();
        normalizeData();
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
            "generatedOverviewPreview"
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
            return true;
        } catch (error) {
            console.warn(`[Seatmap Stage4] localStorage write failed: ${key}`, error);
            return false;
        }
    }

    function showToast(message) {
        if (!dom.toast) return;

        dom.toast.textContent = message;
        dom.toast.classList.add("show");

        clearTimeout(showToast._timer);
        showToast._timer = setTimeout(() => {
            dom.toast.classList.remove("show");
        }, 1900);
    }

    function normalizeData() {
        if (!Array.isArray(state.sections)) {
            state.sections = [];
        }

        state.sections.forEach((section, index) => {
            section.id = section.id || `sec${index + 1}`;
            section.name = section.name || `구역 ${index + 1}`;
            section.label = section.label || String(index + 1);
            section.floor = section.floor || "1층";
            section.grade = section.grade || "일반석";
            section.price = Number(section.price || 0);
            section.renderColor = safeColor(section.renderColor || section.color || COLORS.sectionFallback);
        });

        const points = state.sections.flatMap(section => getSectionShape(section));
        const maxX = Math.max(980, ...points.map(point => point.x + 80), Number(state.imageMeta.width || 0));
        const maxY = Math.max(660, ...points.map(point => point.y + 80), Number(state.imageMeta.height || 0));

        state.width = Math.ceil(maxX);
        state.height = Math.ceil(maxY);

        state.stage = normalizeStage(state.stage);
    }

    function normalizeStage(stage) {
        const fallback = {
            x: Math.round(state.width * 0.32),
            y: Math.round(Math.max(18, state.height * 0.06)),
            w: Math.round(Math.min(420, state.width * 0.36)),
            h: Math.round(Math.max(34, state.height * 0.07)),
            angle: 0,
            label: "STAGE"
        };

        const next = stage && typeof stage === "object" ? { ...fallback, ...stage } : fallback;

        next.x = Math.max(0, Math.round(Number(next.x) || fallback.x));
        next.y = Math.max(0, Math.round(Number(next.y) || fallback.y));
        next.w = Math.max(20, Math.round(Number(next.w) || fallback.w));
        next.h = Math.max(10, Math.round(Number(next.h) || fallback.h));
        next.angle = Number(next.angle) || 0;

        return next;
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

    function roundNumber(value) {
        return Math.round(Number(value || 0) * 100) / 100;
    }

    function cleanIdPart(value) {
        return String(value ?? "")
            .trim()
            .replace(/\s+/g, "")
            .replace(/-/g, "");
    }

    function makeSeatId(section, seat) {
        return [
            floorCode(section),
            sectionCode(section),
            cleanIdPart(seat.row),
            cleanIdPart(seat.col),
            cleanIdPart(section.grade || "일반석"),
            cleanIdPart(seat.status || SEAT_STATUS.AVAILABLE),
            cleanIdPart(roundNumber(seat.x)),
            cleanIdPart(roundNumber(seat.y)),
            cleanIdPart(roundNumber(Math.max(Number(seat.w || 0), Number(seat.h || 0)))),
            cleanIdPart(roundNumber(seat.angle || 0))
        ].join("-");
    }

    function collectUsableSeats() {
        const seats = [];

        state.sections.forEach((section) => {
            const sectionSeats = Array.isArray(state.seatsBySection[section.id]) ? state.seatsBySection[section.id] : [];

            sectionSeats
                .filter((seat) => seat.status !== SEAT_STATUS.REMOVED)
                .forEach((seat) => {
                    seats.push({ section, seat });
                });
        });

        return seats;
    }

    function buildJsons() {
        state.overviewImage = drawGeneratedOverviewImage();

        const usableSeats = collectUsableSeats();

        state.layoutJson = {
            service: "SeatTrace",
            type: "concert-layout",
            generatedAt: new Date().toISOString(),
            image: {
                width: state.width,
                height: state.height,
                overviewImage: state.overviewImage
            },
            stage: state.stage,
            sections: state.sections.map((section) => ({
                id: section.id,
                name: section.name,
                label: section.label,
                floor: section.floor,
                grade: section.grade,
                price: Number(section.price || 0),
                color: section.renderColor,
                polygon: getSectionShape(section).map(point => ({ x: roundNumber(point.x), y: roundNumber(point.y) })),
                layout: state.layoutsBySection[section.id] || null,
                seats: (state.seatsBySection[section.id] || [])
                    .filter(seat => seat.status !== SEAT_STATUS.REMOVED)
                    .map(seat => ({
                        id: makeSeatId(section, seat),
                        row: seat.row,
                        col: seat.col,
                        x: roundNumber(seat.x),
                        y: roundNumber(seat.y),
                        w: roundNumber(seat.w),
                        h: roundNumber(seat.h),
                        angle: roundNumber(seat.angle || 0),
                        status: seat.status || SEAT_STATUS.AVAILABLE,
                        color: section.renderColor
                    }))
            }))
        };

        state.bookingJson = usableSeats.map(({ section, seat }) => ({
            id: makeSeatId(section, seat),
            floor: floorCode(section),
            sectionId: section.id,
            sectionName: section.name,
            sectionLabel: section.label,
            row: seat.row,
            col: seat.col,
            grade: section.grade || "일반석",
            price: Number(section.price || 0),
            status: seat.status || SEAT_STATUS.AVAILABLE
        }));

        writeStorageJson(STORAGE_KEYS.layoutJson, state.layoutJson);
        writeStorageJson(STORAGE_KEYS.bookingJson, state.bookingJson);
    }

    function renderSummary() {
        const usableSeats = collectUsableSeats();
        const floors = new Set();
        const sections = new Set();
        const gradeMap = new Map();
        let obstructed = 0;

        usableSeats.forEach(({ section, seat }) => {
            floors.add(floorCode(section));
            sections.add(section.id);

            if (seat.status === SEAT_STATUS.OBSTRUCTED) {
                obstructed += 1;
            }

            const grade = section.grade || "일반석";
            const price = Number(section.price || 0);
            const key = `${grade}_${price}`;
            const before = gradeMap.get(key) || {
                grade,
                price,
                count: 0,
                color: section.renderColor || COLORS.sectionFallback
            };

            before.count += 1;
            gradeMap.set(key, before);
        });

        if (dom.sumFloors) dom.sumFloors.textContent = floors.size;
        if (dom.sumSections) dom.sumSections.textContent = sections.size;
        if (dom.sumSeats) dom.sumSeats.textContent = usableSeats.length;
        if (dom.sumObstructed) dom.sumObstructed.textContent = obstructed;

        if (dom.summaryText) {
            dom.summaryText.textContent = `최종 ${floors.size}개 층, ${sections.size}개 구역, ${usableSeats.length}석입니다. 장애석은 ${obstructed}석입니다.`;
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

    function renderJsonPreviews() {
        const layoutPreview = cloneWithoutHeavyImage(state.layoutJson);

        if (dom.layoutJsonPreview) {
            dom.layoutJsonPreview.value = JSON.stringify(layoutPreview || {}, null, 2);
        }

        if (dom.bookingJsonPreview) {
            dom.bookingJsonPreview.value = JSON.stringify(state.bookingJson || [], null, 2);
        }

        if (dom.generatedOverviewPreview && state.overviewImage) {
            dom.generatedOverviewPreview.src = state.overviewImage;
        }
    }

    function cloneWithoutHeavyImage(value) {
        if (!value) return value;
        const cloned = JSON.parse(JSON.stringify(value));

        if (cloned.image?.overviewImage) {
            cloned.image.overviewImage = `[base64 image omitted: ${String(value.image.overviewImage).length} chars]`;
        }

        return cloned;
    }

    function refreshGeneratedData() {
        buildJsons();
        renderSummary();
        renderJsonPreviews();
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
            dom.saveResultText.textContent = `저장 완료 · 배치용: ${layoutResult?.jsonUrl || "실패"} / 예매용: ${bookingResult?.jsonUrl || "실패"}`;
        }

        showToast("배치용 + 예매용 JSON 저장 완료");
    }

    async function saveJson(fileName, jsonValue) {
        const response = await fetch("/admin/seatmap/json/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fileName,
                json: JSON.stringify(jsonValue, null, 2)
            })
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

        [dom.saveAllJson, dom.saveAllJsonTop, dom.saveAllJsonMain].forEach((button) => {
            button?.addEventListener("click", saveHandler);
        });

        [dom.copyLayoutJson, dom.copyLayoutJsonMain].forEach((button) => {
            button?.addEventListener("click", () => {
                refreshGeneratedData();
                copyString(JSON.stringify(state.layoutJson || {}, null, 2)).catch((error) => {
                    console.error(error);
                    showToast("배치용 JSON 복사 실패");
                });
            });
        });

        [dom.copyBookingJson, dom.copyBookingJsonMain].forEach((button) => {
            button?.addEventListener("click", () => {
                refreshGeneratedData();
                copyString(JSON.stringify(state.bookingJson || [], null, 2)).catch((error) => {
                    console.error(error);
                    showToast("예매용 JSON 복사 실패");
                });
            });
        });

        dom.rawJsonDetails?.addEventListener("toggle", () => {
            if (dom.rawJsonDetails.open) {
                renderJsonPreviews();
            }
        });
    }

    function drawGeneratedOverviewImage() {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = Math.max(1, Math.round(state.width));
        canvas.height = Math.max(1, Math.round(state.height));

        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        state.sections.forEach(section => drawSection(ctx, section));
        drawStage(ctx);

        state.sections.forEach(section => {
            const seats = state.seatsBySection[section.id] || [];
            seats.forEach(seat => drawSeat(ctx, section, seat));
        });

        return canvas.toDataURL("image/png");
    }

    function drawStage(ctx) {
        const stage = state.stage;

        ctx.save();
        ctx.fillStyle = COLORS.stage;
        ctx.strokeStyle = "rgba(255,255,255,.92)";
        ctx.lineWidth = 2;
        roundRect(ctx, stage.x, stage.y, stage.w, stage.h, Math.max(4, Math.min(stage.w, stage.h) * 0.08));
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = COLORS.stageText;
        ctx.font = `bold ${Math.max(13, stage.h * 0.34)}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(stage.label || "STAGE", stage.x + stage.w / 2, stage.y + stage.h / 2);
        ctx.restore();
    }

    function drawSection(ctx, section) {
        const shape = getSectionShape(section);
        if (!shape.length) return;

        ctx.save();
        ctx.beginPath();
        drawPoly(ctx, shape);
        ctx.closePath();
        ctx.fillStyle = hexToRgba(section.renderColor || COLORS.sectionFallback, 0.14);
        ctx.strokeStyle = "rgba(15,23,42,.16)";
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    function drawSeat(ctx, section, seat) {
        if (seat.status === SEAT_STATUS.REMOVED) return;

        ctx.save();
        ctx.translate(Number(seat.x) || 0, Number(seat.y) || 0);
        ctx.rotate(toRad(Number(seat.angle) || 0));
        roundRect(
            ctx,
            -Number(seat.w || 0) / 2,
            -Number(seat.h || 0) / 2,
            Number(seat.w || 0),
            Number(seat.h || 0),
            Math.max(1, Math.min(Number(seat.w || 0), Number(seat.h || 0)) * 0.12)
        );
        ctx.fillStyle = seat.status === SEAT_STATUS.OBSTRUCTED
            ? COLORS.obstructed
            : safeColor(section.renderColor || seat.color || COLORS.seat);
        ctx.strokeStyle = COLORS.line;
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    function getSectionShape(section) {
        const candidates = [
            section.seatShape,
            section.buttonPolygon,
            section.polygon,
            section.points
        ];

        for (const candidate of candidates) {
            if (Array.isArray(candidate) && candidate.length >= 3) {
                return candidate.map(point => ({ x: Number(point.x) || 0, y: Number(point.y) || 0 }));
            }
        }

        return [];
    }

    function drawPoly(ctx, points) {
        points.forEach((point, index) => {
            if (index === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        });
    }

    function roundRect(ctx, x, y, w, h, r) {
        const radius = Math.max(0, Math.min(r || 0, Math.abs(w) / 2, Math.abs(h) / 2));

        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
    }

    function safeColor(value) {
        const raw = String(value || "").trim();

        if (/^#[0-9a-fA-F]{3}$/.test(raw)) return raw;
        if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw;

        return COLORS.seat;
    }

    function hexToRgba(hex, alpha) {
        const cleaned = String(safeColor(hex)).replace("#", "");
        const full = cleaned.length === 3
            ? cleaned.split("").map(char => char + char).join("")
            : cleaned;
        const r = parseInt(full.slice(0, 2), 16);
        const g = parseInt(full.slice(2, 4), 16);
        const b = parseInt(full.slice(4, 6), 16);

        return `rgba(${r},${g},${b},${alpha})`;
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function toRad(deg) {
        return deg * Math.PI / 180;
    }
})();
