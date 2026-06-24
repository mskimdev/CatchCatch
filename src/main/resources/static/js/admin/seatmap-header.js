(() => {
    const SAVE_URL = "/admin/seatmap/overwrite-save";

    const STORAGE_KEYS = [
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

    document.addEventListener("DOMContentLoaded", () => {
        const button = document.getElementById("seatmapHeaderSave");

        if (!button) {
            return;
        }

        button.addEventListener("click", () => saveSeatmap(button));
    });

    async function saveSeatmap(button) {
        const originalText = button.textContent;

        try {
            button.disabled = true;
            button.textContent = "저장 중...";

            const payload = buildSavePayload();

            const response = await fetch(SAVE_URL, {
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
            button.textContent = "저장 완료";
            console.log("[SeatTrace] overwrite save result", result);

            setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
            }, 900);
        } catch (error) {
            console.error(error);
            button.textContent = "저장 실패";
            alert("저장 실패: " + error.message);

            setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
            }, 1200);
        }
    }

    function buildSavePayload() {
        const imageDataUrl = getCurrentImageDataUrl();
        const localStorageDump = dumpSeatmapLocalStorage();
        const pageState = getPageState(localStorageDump, imageDataUrl);
        const jsonText = JSON.stringify(pageState, null, 2);
        const htmlText = buildPreviewHtml(imageDataUrl, pageState);

        return {
            page: getPageName(),
            imageDataUrl,
            jsonText,
            htmlText
        };
    }

    function getCurrentImageDataUrl() {
        const canvas = document.getElementById("canvas");

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

    function dumpSeatmapLocalStorage() {
        const result = {};

        STORAGE_KEYS.forEach((key) => {
            const value = localStorage.getItem(key);

            if (value == null) {
                return;
            }

            result[key] = parseMaybeJson(value);
        });

        return result;
    }

    function parseMaybeJson(value) {
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

    function getPageState(localStorageDump, imageDataUrl) {
        return {
            service: "SeatTrace",
            savedAt: new Date().toISOString(),
            page: getPageName(),
            path: location.pathname,
            image: {
                exists: Boolean(imageDataUrl),
                width: getCanvasWidth(),
                height: getCanvasHeight()
            },
            localStorage: localStorageDump
        };
    }

    function getCanvasWidth() {
        const canvas = document.getElementById("canvas");
        return canvas ? canvas.width : 0;
    }

    function getCanvasHeight() {
        const canvas = document.getElementById("canvas");
        return canvas ? canvas.height : 0;
    }

    function getPageName() {
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

    function buildPreviewHtml(imageDataUrl, pageState) {
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

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }
})();
