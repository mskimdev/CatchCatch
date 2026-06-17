(() => {
    const PAGE_URL = {
        // 콘서트
        concert: "/admin/seatmap/concert-stage1",
        // 소극장
        small: "/admin/seatmap/small-seat-builder"
    };

    const STORAGE_KEYS = {
        concert: [
            "concert_originalImage",
            "concert_cleanImage",
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
        concert: "concert_originalImage",
        small: "small_originalImage"
    };

    const ENTRY_KEY = {
        concert: "concert_entryFromMain",
        small: "small_entryFromMain"
    };

    const FILE_INPUT_ID = {
        concert: "concertFileInput",
        small: "smallFileInput"
    };

    const START_MESSAGE = {
        concert: "콘서트 이미지 등록 완료. Stage1로 이동합니다.",
        small: "소극장 이미지 등록 완료. 제작 화면으로 이동합니다."
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

    // 콘서트 or 소극장 실행 함수
    function bindFileInputs() {
        Object.entries(FILE_INPUT_ID).forEach(([type, inputId]) => {
            const input = $(inputId);

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
        clearWork(type);

        const input = $(FILE_INPUT_ID[type]);
        input.value = "";
        input.click();
    }

    // 이미지 저장 후 해당 URL 이동
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
        const hasConcertWork = hasSavedWork("concert");
        const hasSmallWork = hasSavedWork("small");

        if (!hasConcertWork && !hasSmallWork) {
            toast("불러올 작업이 없습니다.");
            return;
        }

        if (hasConcertWork && !hasSmallWork) {
            location.href = PAGE_URL.concert;
            return;
        }

        if (!hasConcertWork && hasSmallWork) {
            location.href = PAGE_URL.small;
            return;
        }

        const loadConcert = confirm(
            "콘서트 작업과 소극장 작업이 모두 있습니다.\n\n확인: 콘서트 작업 불러오기\n취소: 소극장 작업 불러오기"
        );

        location.href = loadConcert ? PAGE_URL.concert : PAGE_URL.small;
    }

    function hasSavedWork(type) {
        return Boolean(localStorage.getItem(IMAGE_KEY[type]));
    }

    function clearAllWork() {
        clearWork("concert");
        clearWork("small");
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