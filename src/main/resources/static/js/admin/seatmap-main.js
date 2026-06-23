(() => {
    const PAGE_URL = {
        seatButtonImage: "/admin/seatmap/button-image",
        concert: "/admin/seatmap/concert/stage1",
        small: "/admin/seatmap/small-seat-builder"
    };

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
        concert: "concert_originalImage",
        small: "small_originalImage"
    };

    const ENTRY_KEY = {
        seatButtonImage: "seat_button_entryFromMain",
        concert: "concert_entryFromMain",
        small: "small_entryFromMain"
    };

    const FILE_INPUT_ID = {
        seatButtonImage: "seatButtonImageFileInput",
        concert: "concertFileInput",
        small: "smallFileInput"
    };

    const START_MESSAGE = {
        seatButtonImage: "좌석 이미지 등록 완료. 버튼 이미지화 화면으로 이동합니다.",
        concert: "콘서트 이미지 등록 완료. Stage1로 이동합니다.",
        small: "소극장 이미지 등록 완료. 제작 화면으로 이동합니다."
    };

    const TYPE_LABEL = {
        seatButtonImage: "좌석 이미지 버튼 이미지화",
        concert: "콘서트 제작",
        small: "소극장 제작"
    };

    const $ = (id) => document.getElementById(id);

    document.addEventListener("DOMContentLoaded", () => {
        bindStartButtons();
        bindFileInputs();
        bindResetButton();
        bindContinueButton();
    });

    function bindStartButtons() {
        document.querySelectorAll("[data-start-type]").forEach((button) => {
            button.addEventListener("click", () => {
                const type = button.dataset.startType;
                startNewWork(type);
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

    function bindResetButton() {
        $("resetAllBtn").addEventListener("click", () => {
            clearAllWork();
            toast("저장된 작업을 모두 초기화했습니다.");
        });
    }

    function bindContinueButton() {
        $("continueWorkBtn").addEventListener("click", () => {
            continueSavedWork();
        });
    }

    function startNewWork(type) {
        if (!STORAGE_KEYS[type]) {
            toast("알 수 없는 제작 방식입니다.");
            return;
        }

        clearWork(type);

        const input = $(FILE_INPUT_ID[type]);

        if (!input) {
            toast("파일 입력 요소를 찾을 수 없습니다.");
            return;
        }

        input.value = "";
        input.click();
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

    function continueSavedWork() {
        const savedTypes = Object.keys(IMAGE_KEY).filter((type) => hasSavedWork(type));

        if (savedTypes.length === 0) {
            toast("불러올 작업이 없습니다.");
            return;
        }

        if (savedTypes.length === 1) {
            location.href = PAGE_URL[savedTypes[0]];
            return;
        }

        const message = savedTypes
            .map((type, index) => `${index + 1}. ${TYPE_LABEL[type]}`)
            .join("\n");

        const selected = prompt(
            `불러올 작업 번호를 입력하세요.\n\n${message}`
        );

        const index = Number(selected) - 1;
        const type = savedTypes[index];

        if (!type) {
            toast("작업 불러오기를 취소했습니다.");
            return;
        }

        location.href = PAGE_URL[type];
    }

    function hasSavedWork(type) {
        return Boolean(localStorage.getItem(IMAGE_KEY[type]));
    }

    function clearAllWork() {
        Object.keys(STORAGE_KEYS).forEach((type) => {
            clearWork(type);
        });
    }

    function clearWork(type) {
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

        toastElement.textContent = message;
        toastElement.classList.add("show");

        clearTimeout(window.__seatTraceToastTimer);

        window.__seatTraceToastTimer = setTimeout(() => {
            toastElement.classList.remove("show");
        }, 2000);
    }
})();