(() => {
    "use strict";

    window.SeatmapWorkspace = {
        setActivePart,
        completePart,
        completeBefore,
        resetDone,
    };

    function setActivePart(partNumber, completedParts) {
        const completedSet = normalizeCompletedParts(completedParts);

        document.querySelectorAll(".seatmap-step[data-step]").forEach((step) => {
            const stepNumber = Number(step.dataset.step);
            const isActive = stepNumber === partNumber;
            const isDone = completedSet.has(stepNumber) || step.dataset.done === "true";

            step.classList.remove("hidden");
            step.classList.toggle("is-active", isActive);
            step.classList.toggle("is-done", isDone);

            const header = step.querySelector(".seatmap-step__header");
            if (header) {
                header.classList.toggle("active", isActive);
            }
        });
    }

    function completePart(partNumber) {
        const step = document.querySelector(`.seatmap-step[data-step="${partNumber}"]`);

        if (!step) {
            return;
        }

        step.dataset.done = "true";
        step.classList.add("is-done");
    }

    function completeBefore(partNumber) {
        document.querySelectorAll(".seatmap-step[data-step]").forEach((step) => {
            const stepNumber = Number(step.dataset.step);

            if (stepNumber < partNumber) {
                step.dataset.done = "true";
                step.classList.add("is-done");
            }
        });
    }

    function resetDone() {
        document.querySelectorAll(".seatmap-step[data-step]").forEach((step) => {
            delete step.dataset.done;
            step.classList.remove("is-done");
        });
    }

    function normalizeCompletedParts(completedParts) {
        if (completedParts instanceof Set) {
            return completedParts;
        }

        if (Array.isArray(completedParts)) {
            return new Set(completedParts);
        }

        return new Set();
    }
})();