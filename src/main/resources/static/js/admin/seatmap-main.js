(() => {
    const PAGE_URL = {
        seatButtonImage: "/admin/seatmap/button-image",
        concert: "/admin/seatmap/concert/stage1",
        small: "/admin/seatmap/small-seat-builder"
    };

    const CONCERT_JSON_URL = "/json/seatmap/seatmap-concert-session.json";

    const STORAGE_KEYS = {
        seatButtonImage: [
            "seat_button_originalImage",
            "seat_button_resultImage",
            "seat_button_imageMeta",
            "seat_button_groups",
            "seat_button_entryFromMain"
        ],
        concert: [
            "concert_originalImage",
            "concert_cleanImage",
            "concert_buttonImage",
            "concert_buttonImageMeta",
            "concert_sections",
            "concert_seats",
            "concert_extractSettings",
            "concert_finalLayout",
            "concert_imageMeta",
            "concert_stage",
            "concert_overviewImage",
            "concert_generated_overviewImage",
            "concert_stage3_seats",
            "concert_stage3_layouts",
            "concert_entryFromMain"
        ],
        small: [
            "small_originalImage",
            "small_detectedSeats",
            "small_seats",
            "small_finalLayout",
            "small_entryFromMain"
        ]
    };

    const IMAGE_KEY = {
        seatButtonImage: "seat_button_originalImage",
        small: "small_originalImage"
    };

    const ENTRY_KEY = {
        seatButtonImage: "seat_button_entryFromMain",
        concert: "concert_entryFromMain",
        small: "small_entryFromMain"
    };

    const FILE_INPUT_ID = {
        seatButtonImage: "seatButtonImageFileInput",
        small: "smallFileInput"
    };

    const START_MESSAGE = {
        seatButtonImage: "좌석 이미지 등록 완료. 버튼 이미지화 화면으로 이동합니다.",
        small: "소극장 이미지 등록 완료. 제작 화면으로 이동합니다."
    };

    const $ = (id) => document.getElementById(id);

    document.addEventListener("DOMContentLoaded", () => {
        bindStartButtons();
        bindFileInputs();
    });

    function bindStartButtons() {
        document.querySelectorAll("[data-start-type]").forEach((button) => {
            button.addEventListener("click", () => {
                const type = button.dataset.startType;

                if (type === "concert") {
                    startConcertWork();
                    return;
                }

                if (type === "seatButtonImage" || type === "small") {
                    startImageWork(type);
                    return;
                }

                toast("알 수 없는 제작 방식입니다.");
            });
        });
    }

    function bindFileInputs() {
        Object.entries(FILE_INPUT_ID).forEach(([type, inputId]) => {
            const input = $(inputId);

            if (!input) {
                return;
            }

            input.addEventListener("change", (event) => {
                const file = event.target.files[0];

                if (!file) {
                    return;
                }

                saveImageAndMove(type, file);
            });
        });
    }

    function startImageWork(type) {
        clearWork(type);

        const inputId = FILE_INPUT_ID[type];
        const input = $(inputId);

        if (!input) {
            toast(`${inputId} 요소를 찾을 수 없습니다.`);
            return;
        }

        input.value = "";
        input.click();
    }

    async function startConcertWork() {
        clearWork("concert");

        try {
            const response = await fetch(CONCERT_JSON_URL, {
                method: "GET",
                cache: "no-store"
            });

            if (!response.ok) {
                showNeedButtonImageMessage();
                return;
            }

            const json = await response.json();

            if (!json || typeof json !== "object") {
                showNeedButtonImageMessage();
                return;
            }

            applyConcertJson(json);

            localStorage.setItem(ENTRY_KEY.concert, "true");

            toast("콘서트 JSON을 불러왔습니다. Stage1로 이동합니다.");

            setTimeout(() => {
                location.href = PAGE_URL.concert;
            }, 250);
        } catch (error) {
            console.error(error);
            showNeedButtonImageMessage();
        }
    }

function applyConcertJson(json) {
    const payload = normalizeConcertPayload(json);

    if (payload.originalImage) {
        localStorage.setItem("concert_originalImage", payload.originalImage);
    }

    if (payload.cleanImage) {
        localStorage.setItem("concert_cleanImage", payload.cleanImage);
    }

    if (payload.buttonImage) {
        localStorage.setItem("concert_buttonImage", payload.buttonImage);
        localStorage.setItem("concert_overviewImage", payload.buttonImage);
    }

    if (!payload.buttonImage && payload.cleanImage) {
        localStorage.setItem("concert_overviewImage", payload.cleanImage);
    }

    if (payload.buttonImageMeta) {
        localStorage.setItem("concert_buttonImageMeta", JSON.stringify(payload.buttonImageMeta));
    }

    if (payload.sections) {
        localStorage.setItem("concert_sections", JSON.stringify(payload.sections));
    }

    if (payload.seats) {
        localStorage.setItem("concert_seats", JSON.stringify(payload.seats));
    }

    if (payload.extractSettings) {
        localStorage.setItem("concert_extractSettings", JSON.stringify(payload.extractSettings));
    }

    if (payload.finalLayout) {
        localStorage.setItem("concert_finalLayout", JSON.stringify(payload.finalLayout));
    }

    if (payload.imageMeta) {
        localStorage.setItem("concert_imageMeta", JSON.stringify(payload.imageMeta));
    }
}

function normalizeConcertPayload(json) {
    const savedLocalStorage = json.localStorage || {};
    const output = json.output || {};
    const imageUrl = output.imageUrl || json.imageUrl || json.imageDataUrl || null;

    const originalImage =
        json.concert_originalImage ||
        json.originalImage ||
        json.sourceImage ||
        json.seat_button_originalImage ||
        savedLocalStorage.concert_originalImage ||
        savedLocalStorage.seat_button_originalImage ||
        imageUrl ||
        null;

    const cleanImage =
        json.concert_cleanImage ||
        json.cleanImage ||
        savedLocalStorage.concert_cleanImage ||
        savedLocalStorage.seat_button_resultImage ||
        imageUrl ||
        originalImage ||
        null;

    const buttonImage =
        json.concert_buttonImage ||
        json.buttonImage ||
        json.resultImage ||
        json.seat_button_resultImage ||
        savedLocalStorage.concert_buttonImage ||
        savedLocalStorage.seat_button_resultImage ||
        imageUrl ||
        cleanImage ||
        originalImage ||
        null;

    return {
        originalImage,
        cleanImage,
        buttonImage,

        buttonImageMeta:
            json.concert_buttonImageMeta ||
            json.buttonImageMeta ||
            json.imageMeta ||
            json.seat_button_imageMeta ||
            savedLocalStorage.concert_buttonImageMeta ||
            savedLocalStorage.seat_button_imageMeta ||
            null,

        sections:
            json.concert_sections ||
            json.sections ||
            savedLocalStorage.concert_sections ||
            savedLocalStorage.seat_button_groups ||
            json.groups ||
            json.seat_button_groups ||
            [],

        seats:
            json.concert_seats ||
            json.seats ||
            savedLocalStorage.concert_seats ||
            [],

        extractSettings:
            json.concert_extractSettings ||
            json.extractSettings ||
            savedLocalStorage.concert_extractSettings ||
            null,

        finalLayout:
            json.concert_finalLayout ||
            json.finalLayout ||
            savedLocalStorage.concert_finalLayout ||
            null,

        imageMeta:
            json.concert_imageMeta ||
            json.imageMeta ||
            json.seat_button_imageMeta ||
            savedLocalStorage.concert_imageMeta ||
            savedLocalStorage.seat_button_imageMeta ||
            json.image ||
            null
    };
}

    function getNestedLocalStorage(json) {
        const candidates = [
            json.localStorage,
            json.storage,
            json.pageState?.localStorage,
            json.payload?.localStorage,
            json.data?.localStorage
        ];

        for (const candidate of candidates) {
            const parsed = parseMaybeJson(candidate);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                return parsed;
            }
        }

        return {};
    }

    function pickFirst(...values) {
        for (const value of values) {
            if (value == null) continue;
            if (typeof value === "string" && value.trim() === "") continue;
            return value;
        }
        return null;
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

    function showNeedButtonImageMessage() {
        toast("콘서트용 JSON이 없습니다. 먼저 좌석 이미지 버튼 이미지화에서 생성해주세요.");

        setTimeout(() => {
            alert("콘서트용 내부 JSON 파일을 찾을 수 없습니다.\n\n먼저 [좌석 이미지 버튼 이미지화]에서 버튼 이미지를 생성하고 JSON을 저장해주세요.");
        }, 120);
    }

    function saveImageAndMove(type, file) {
        readImage(file, (imageUrl) => {
            localStorage.setItem(IMAGE_KEY[type], imageUrl);
            localStorage.setItem(ENTRY_KEY[type], "true");

            toast(START_MESSAGE[type]);

            setTimeout(() => {
                location.href = PAGE_URL[type];
            }, 250);
        });
    }

    function clearWork(type) {
        if (!STORAGE_KEYS[type]) {
            return;
        }

        STORAGE_KEYS[type].forEach((key) => {
            localStorage.removeItem(key);
        });
    }

    function readImage(file, callback) {
        const reader = new FileReader();

        reader.onload = () => {
            callback(reader.result);
        };

        reader.onerror = () => {
            toast("이미지를 읽는 중 오류가 발생했습니다.");
        };

        reader.readAsDataURL(file);
    }

    function toast(message) {
        const toastElement = $("toast");

        if (!toastElement) {
            alert(message);
            return;
        }

        toastElement.textContent = message;
        toastElement.classList.add("show");

        clearTimeout(window.__seatTraceToastTimer);

        window.__seatTraceToastTimer = setTimeout(() => {
            toastElement.classList.remove("show");
        }, 2200);
    }
})();