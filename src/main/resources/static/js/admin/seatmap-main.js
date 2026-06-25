(() => {
    const PAGE_URL = {
        seatButtonImage: "/admin/seatmap/button-image",
        concert: "/admin/seatmap/concert/stage1",
        small: "/admin/seatmap/small-seat-builder"
    };

    const CONCERT_JSON_URL = "/json/seatmap/seatmap-concert-session.json";
    const DEFAULT_CONCERT_IMAGE_URL = "/images/seatmap/generated/seatmap-concert-image.png";

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
            "concert_entryFromMain",

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
        bindResetButtons();
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

    function bindResetButtons() {
        document.querySelectorAll("[data-reset-type]").forEach((button) => {
            button.addEventListener("click", () => {
                const type = button.dataset.resetType;

                if (type === "concert") {
                    resetConcertWork();
                    return;
                }

                toast("알 수 없는 초기화 방식입니다.");
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

    function resetConcertWork() {
        if (!confirm("콘서트 / 대형장 작업 데이터를 초기화할까요?\n\n브라우저에 저장된 Stage1~Stage4 작업 데이터만 삭제됩니다.")) {
            return;
        }

        clearWork("concert");
        toast("콘서트 / 대형장 작업 데이터를 초기화했습니다.");
    }

    function applyConcertJson(json) {
        const payload = normalizeConcertPayload(json);
        const imageUrl = payload.imageUrl || DEFAULT_CONCERT_IMAGE_URL;

        localStorage.setItem("concert_originalImage", imageUrl);
        localStorage.setItem("concert_buttonImage", imageUrl);
        localStorage.setItem("concert_cleanImage", imageUrl);

        if (payload.imageMeta) {
            localStorage.setItem("concert_imageMeta", JSON.stringify(payload.imageMeta));
            localStorage.setItem("concert_buttonImageMeta", JSON.stringify(payload.imageMeta));
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
    }

    function normalizeConcertPayload(json) {
        const output = json.output || {};
        const input = json.input || {};
        const meta = json.meta || {};

        const imageUrl =
            output.imageUrl ||
            output.buttonImageUrl ||
            output.resultImageUrl ||
            output.resultImage ||
            json.imageUrl ||
            json.buttonImageUrl ||
            json.resultImageUrl ||
            json.concert_buttonImage ||
            json.buttonImage ||
            json.resultImage ||
            json.seat_button_resultImage ||
            DEFAULT_CONCERT_IMAGE_URL;

        return {
            imageUrl,

            imageMeta:
                output.imageMeta ||
                json.concert_buttonImageMeta ||
                json.buttonImageMeta ||
                json.imageMeta ||
                json.seat_button_imageMeta ||
                meta.imageMeta ||
                null,

            sections:
                output.sections ||
                output.groups ||
                json.concert_sections ||
                json.sections ||
                json.groups ||
                json.seat_button_groups ||
                [],

            seats:
                output.seats ||
                json.concert_seats ||
                json.seats ||
                [],

            extractSettings:
                output.extractSettings ||
                json.concert_extractSettings ||
                json.extractSettings ||
                input.extractSettings ||
                null,

            finalLayout:
                output.finalLayout ||
                json.concert_finalLayout ||
                json.finalLayout ||
                null
        };
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
