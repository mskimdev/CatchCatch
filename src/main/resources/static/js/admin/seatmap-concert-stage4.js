(() => {
    "use strict";

    const STORAGE_KEYS = {
        sections: "concert_sections",
        stage3Seats: "concert_stage3_seats",
        seatJson: "concert_seat_json",
        seatJsonUrl: "concert_seat_json_url",
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
        seatJson: [],
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
            "seatJsonPreview",
            "layoutJsonPreview",
            "bookingJsonPreview",
            "rawJsonDetails",
            "saveSeatJson",
            "saveSeatJsonTop",
            "saveSeatJsonMain",
            "saveAllJson",
            "saveAllJsonTop",
            "saveAllJsonMain",
            "copySeatJson",
            "copySeatJsonMain",
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
        showToast._timer = setTimeout(() => {
            dom.toast.classList.remove("show");
        }, 1900);
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
            cleanIdPart(seat.col),
            cleanIdPart(seat.row),
            cleanIdPart(roundNumber(seat.x)),
            cleanIdPart(roundNumber(seat.y)),
        ].join("-");
    }

    function collectUsableSeats() {
        const seats = [];

        state.sections.forEach((section) => {
            const sectionSeats = state.seatsBySection[section.id] || [];

            sectionSeats
                .filter((seat) => seat.status !== SEAT_STATUS.REMOVED)
                .forEach((seat) => {
                    seats.push({
                        section,
                        seat,
                    });
                });
        });

        return seats;
    }

    function buildJsons() {
        state.seatJson = collectUsableSeats().map(({ section, seat }) => ({
            id: makeSeatId(section, seat),
        }));

        writeStorageJson(STORAGE_KEYS.seatJson, state.seatJson);
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
                color: findGradeColor(grade),
            };

            before.count += 1;
            gradeMap.set(key, before);
        });

        if (dom.sumFloors) dom.sumFloors.textContent = floors.size;
        if (dom.sumSections) dom.sumSections.textContent = sections.size;
        if (dom.sumSeats) dom.sumSeats.textContent = usableSeats.length;
        if (dom.sumObstructed) dom.sumObstructed.textContent = obstructed;

        if (dom.summaryText) {
            dom.summaryText.textContent =
                `최종 ${floors.size}개 층, ${sections.size}개 구역, ${usableSeats.length}석입니다. 장애석은 ${obstructed}석입니다.`;
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
        const section = state.sections.find((item) => item.grade === grade);
        return section?.renderColor || section?.color || "#d9d9d9";
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

    function renderJsonPreviews() {
        const value = JSON.stringify(state.seatJson || [], null, 2);

        if (dom.seatJsonPreview) {
            dom.seatJsonPreview.value = value;
        }

        if (dom.layoutJsonPreview) {
            dom.layoutJsonPreview.value = value;
        }

        if (dom.bookingJsonPreview) {
            dom.bookingJsonPreview.value = "";
        }
    }

    function refreshGeneratedData() {
        buildJsons();
        renderSummary();

        if (!dom.rawJsonDetails || dom.rawJsonDetails.open || dom.seatJsonPreview || dom.layoutJsonPreview) {
            renderJsonPreviews();
        }
    }

    async function saveAllJson() {
        refreshGeneratedData();

        const baseFileName = makeBaseFileName();
        const result = await saveJson(`${baseFileName}.json`, state.seatJson);

        if (result?.jsonUrl) {
            localStorage.setItem(STORAGE_KEYS.seatJsonUrl, result.jsonUrl);
        }

        if (dom.saveResultText) {
            dom.saveResultText.textContent =
                `저장 완료 · 좌석 JSON: ${result?.jsonUrl || "실패"}`;
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

        const copySeatJsonHandler = () => {
            refreshGeneratedData();

            copyString(JSON.stringify(state.seatJson || [], null, 2)).catch((error) => {
                console.error(error);
                showToast("JSON 복사 실패");
            });
        };

        [
            dom.saveSeatJson,
            dom.saveSeatJsonTop,
            dom.saveSeatJsonMain,
            dom.saveAllJson,
            dom.saveAllJsonTop,
            dom.saveAllJsonMain,
        ].forEach((button) => {
            button?.addEventListener("click", saveHandler);
        });

        [
            dom.copySeatJson,
            dom.copySeatJsonMain,
            dom.copyLayoutJson,
            dom.copyLayoutJsonMain,
            dom.copyBookingJson,
            dom.copyBookingJsonMain,
        ].forEach((button) => {
            button?.addEventListener("click", copySeatJsonHandler);
        });

        dom.rawJsonDetails?.addEventListener("toggle", () => {
            if (dom.rawJsonDetails.open) {
                renderJsonPreviews();
            }
        });
    }
})();