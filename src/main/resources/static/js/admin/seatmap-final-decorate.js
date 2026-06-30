(() => {
    "use strict";

    const state = {
        projectId: new URLSearchParams(location.search).get("projectId")
            || localStorage.getItem("seatmap_current_project_id")
            || localStorage.getItem("seatmap_current_folder")
            || "seat",
        image: null,
        objects: [],
        selectedId: null,
        tool: "select",
        dragging: false,
        dragOffsetX: 0,
        dragOffsetY: 0
    };

    const dom = {};
    let canvas;
    let ctx;

    document.addEventListener("DOMContentLoaded", init);

    function init() {
        cacheDom();
        bindEvents();
        loadImage();
    }

    function cacheDom() {
        canvas = document.getElementById("finalCanvas");
        ctx = canvas.getContext("2d");

        [
            "finalCanvasInfo",
            "finalMiniMap",
            "decorateObjectList",
            "toolText",
            "toolRect",
            "toolSeat",
            "deleteSelected",
            "decorateText",
            "decorateColor",
            "decorateTextColor",
            "decorateWidth",
            "decorateHeight",
            "decorateFontSize",
            "decorateRadius",
            "applySelectedStyle",
            "saveFinalImage",
            "toast"
        ].forEach((id) => dom[id] = document.getElementById(id));
    }

    function bindEvents() {
        dom.toolText?.addEventListener("click", () => setTool("text"));
        dom.toolRect?.addEventListener("click", () => setTool("rect"));
        dom.toolSeat?.addEventListener("click", () => setTool("seat"));
        dom.deleteSelected?.addEventListener("click", deleteSelected);
        dom.applySelectedStyle?.addEventListener("click", applySelectedStyle);
        dom.saveFinalImage?.addEventListener("click", saveFinalImage);

        canvas.addEventListener("pointerdown", handlePointerDown);
        canvas.addEventListener("pointermove", handlePointerMove);
        canvas.addEventListener("pointerup", handlePointerUp);
        canvas.addEventListener("pointerleave", handlePointerUp);
        canvas.addEventListener("dblclick", editSelectedText);
    }

    function setTool(tool) {
        state.tool = tool;
        showToast(tool === "text" ? "텍스트 추가 모드" : tool === "rect" ? "구역 박스 추가 모드" : "좌석 추가 모드");
    }

    function loadImage() {
        const url = `/temp/seatmap/${encodeURIComponent(state.projectId)}/seatmap-image.png?t=${Date.now()}`;
        const img = new Image();
        img.onload = () => {
            state.image = img;
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            dom.finalMiniMap.src = url;
            dom.finalCanvasInfo.textContent = `${img.naturalWidth} × ${img.naturalHeight}px / ${state.projectId}`;
            render();
        };
        img.onerror = () => {
            dom.finalCanvasInfo.textContent = "도면 이미지를 불러오지 못했습니다.";
            canvas.width = 960;
            canvas.height = 620;
            render();
        };
        img.src = url;
    }

    function handlePointerDown(event) {
        const point = getCanvasPoint(event);
        const hit = hitTest(point.x, point.y);

        if (hit) {
            selectObject(hit.id);
            state.dragging = true;
            state.dragOffsetX = point.x - hit.x;
            state.dragOffsetY = point.y - hit.y;
            return;
        }

        if (state.tool === "text" || state.tool === "rect" || state.tool === "seat") {
            const object = createObject(point.x, point.y, state.tool);
            state.objects.push(object);
            selectObject(object.id);
            state.tool = "select";
            render();
            return;
        }

        selectObject(null);
        render();
    }

    function handlePointerMove(event) {
        if (!state.dragging || !state.selectedId) return;

        const point = getCanvasPoint(event);
        const object = state.objects.find(item => item.id === state.selectedId);
        if (!object) return;

        object.x = Math.round(point.x - state.dragOffsetX);
        object.y = Math.round(point.y - state.dragOffsetY);
        render();
    }

    function handlePointerUp() {
        state.dragging = false;
    }

    function createObject(x, y, type) {
        const color = dom.decorateColor.value;
        const textColor = dom.decorateTextColor.value;
        const width = toNumber(dom.decorateWidth.value, type === "seat" ? 18 : 90);
        const height = toNumber(dom.decorateHeight.value, type === "seat" ? 18 : 42);

        return {
            id: `obj-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
            type,
            x: Math.round(x),
            y: Math.round(y),
            width: type === "text" ? 0 : width,
            height: type === "text" ? 0 : height,
            radius: type === "seat" ? 0 : toNumber(dom.decorateRadius.value, 0),
            text: type === "seat" ? "" : dom.decorateText.value.trim() || "TEXT",
            color,
            textColor,
            fontSize: toNumber(dom.decorateFontSize.value, 22)
        };
    }

    function applySelectedStyle() {
        const object = state.objects.find(item => item.id === state.selectedId);
        if (!object) {
            showToast("선택된 요소가 없습니다.");
            return;
        }

        object.text = dom.decorateText.value.trim() || object.text;
        object.color = dom.decorateColor.value;
        object.textColor = dom.decorateTextColor.value;
        object.width = object.type === "text" ? 0 : toNumber(dom.decorateWidth.value, object.width);
        object.height = object.type === "text" ? 0 : toNumber(dom.decorateHeight.value, object.height);
        object.fontSize = toNumber(dom.decorateFontSize.value, object.fontSize);
        object.radius = toNumber(dom.decorateRadius.value, object.radius);
        render();
    }

    function deleteSelected() {
        if (!state.selectedId) return;
        state.objects = state.objects.filter(item => item.id !== state.selectedId);
        state.selectedId = null;
        render();
    }

    function editSelectedText() {
        const object = state.objects.find(item => item.id === state.selectedId);
        if (!object || object.type === "seat") return;
        const next = prompt("텍스트 입력", object.text || "");
        if (next !== null) {
            object.text = next.trim() || object.text;
            render();
        }
    }

    async function saveFinalImage() {
        render(false);
        const imageDataUrl = canvas.toDataURL("image/png");
        render(true);

        const res = await fetch("/admin/seatmap/temp-save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                page: "seatmap-final-decorate",
                folderName: state.projectId,
                imageDataUrl
            })
        });

        if (!res.ok) {
            showToast("저장 실패");
            return;
        }

        dom.finalMiniMap.src = `/temp/seatmap/${encodeURIComponent(state.projectId)}/seatmap-image.png?t=${Date.now()}`;
        showToast("최종 이미지 저장 완료");
    }

    function render(showSelection = true) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (state.image) {
            ctx.drawImage(state.image, 0, 0);
        } else {
            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        state.objects.forEach((object) => drawObject(object, showSelection && object.id === state.selectedId));
        renderObjectList();
    }

    function drawObject(object, selected) {
        ctx.save();
        if (object.type === "text") {
            ctx.font = `900 ${object.fontSize}px Pretendard, Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.lineWidth = Math.max(2, Math.round(object.fontSize / 8));
            ctx.strokeStyle = "rgba(0,0,0,0.25)";
            ctx.strokeText(object.text, object.x, object.y);
            ctx.fillStyle = object.textColor;
            ctx.fillText(object.text, object.x, object.y);
            if (selected) drawSelection(object.x - 40, object.y - object.fontSize, 80, object.fontSize * 1.8);
        } else {
            ctx.fillStyle = object.color;
            roundRect(ctx, object.x, object.y, object.width, object.height, object.radius);
            ctx.fill();
            if (object.text) {
                ctx.fillStyle = object.textColor;
                ctx.font = `900 ${object.fontSize}px Pretendard, Arial`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(object.text, object.x + object.width / 2, object.y + object.height / 2);
            }
            if (selected) drawSelection(object.x, object.y, object.width, object.height);
        }
        ctx.restore();
    }

    function roundRect(context, x, y, width, height, radius) {
        const r = Math.min(radius, width / 2, height / 2);
        context.beginPath();
        context.moveTo(x + r, y);
        context.lineTo(x + width - r, y);
        context.quadraticCurveTo(x + width, y, x + width, y + r);
        context.lineTo(x + width, y + height - r);
        context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        context.lineTo(x + r, y + height);
        context.quadraticCurveTo(x, y + height, x, y + height - r);
        context.lineTo(x, y + r);
        context.quadraticCurveTo(x, y, x + r, y);
        context.closePath();
    }

    function drawSelection(x, y, width, height) {
        ctx.save();
        ctx.setLineDash([7, 5]);
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 4, y - 4, width + 8, height + 8);
        ctx.restore();
    }

    function renderObjectList() {
        if (!dom.decorateObjectList) return;

        if (state.objects.length === 0) {
            dom.decorateObjectList.innerHTML = `<div class="help-text">아직 추가한 요소가 없습니다.</div>`;
            return;
        }

        dom.decorateObjectList.innerHTML = state.objects.map((object, index) => `
            <button type="button" class="decorate-object-row ${object.id === state.selectedId ? "is-selected" : ""}" data-id="${object.id}">
                <i style="background:${object.color}"></i>
                <span><strong>${index + 1}. ${escapeHtml(typeName(object.type))}</strong><span>${escapeHtml(object.text || `${object.width}×${object.height}`)}</span></span>
            </button>
        `).join("");

        dom.decorateObjectList.querySelectorAll("[data-id]").forEach((button) => {
            button.addEventListener("click", () => {
                selectObject(button.dataset.id);
                render();
            });
        });
    }

    function hitTest(x, y) {
        for (let i = state.objects.length - 1; i >= 0; i--) {
            const object = state.objects[i];
            if (object.type === "text") {
                if (Math.abs(x - object.x) <= 50 && Math.abs(y - object.y) <= object.fontSize) return object;
            } else if (x >= object.x && y >= object.y && x <= object.x + object.width && y <= object.y + object.height) {
                return object;
            }
        }
        return null;
    }

    function selectObject(id) {
        state.selectedId = id;
        const object = state.objects.find(item => item.id === id);
        if (!object) return;
        dom.decorateText.value = object.text || dom.decorateText.value;
        dom.decorateColor.value = object.color || dom.decorateColor.value;
        dom.decorateTextColor.value = object.textColor || dom.decorateTextColor.value;
        dom.decorateWidth.value = object.width || dom.decorateWidth.value;
        dom.decorateHeight.value = object.height || dom.decorateHeight.value;
        dom.decorateFontSize.value = object.fontSize || dom.decorateFontSize.value;
        dom.decorateRadius.value = object.radius || 0;
    }

    function getCanvasPoint(event) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left) * canvas.width / rect.width,
            y: (event.clientY - rect.top) * canvas.height / rect.height
        };
    }

    function toNumber(value, fallback) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    function typeName(type) {
        if (type === "text") return "텍스트";
        if (type === "seat") return "좌석";
        return "구역 박스";
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;");
    }

    function showToast(message) {
        if (!dom.toast) {
            alert(message);
            return;
        }
        dom.toast.textContent = message;
        dom.toast.classList.add("show");
        setTimeout(() => dom.toast.classList.remove("show"), 1600);
    }
})();
