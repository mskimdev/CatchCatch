/* =========================================================
   Concert Stage3 Seat Builder
   - HTML: 화면 구조
   - CSS : 화면 스타일
   - JS  : 상태 / 도형 / 좌석 / 렌더링 / 이벤트
   ========================================================= */

(() => {
    'use strict';

    /* =====================================================
       1. Constants / State
       ===================================================== */

    const STORAGE_KEYS = {
        overviewImage: 'concert_overviewImage',
        cleanImage: 'concert_cleanImage',
        originalImage: 'concert_originalImage',
        imageMeta: 'concert_imageMeta',
        sections: 'concert_sections',
        stage3Seats: 'concert_stage3_seats',
        seatJson: 'concert_seat_json',
    };

    const PART = {
        BASE: 1,
        EDIT: 2,
        EXPORT: 3,
    };

    const PAINT_MODE = {
        REMOVED: 'REMOVED',
        AVAILABLE: 'AVAILABLE',
        OBSTRUCTED: 'OBSTRUCTED',
    };

    const SEAT_STATUS = {
        AVAILABLE: 'AVAILABLE',
        REMOVED: 'REMOVED',
        OBSTRUCTED: 'OBSTRUCTED',
    };

    const CANVAS_GRID = {
        width: 900,
        height: 620,
    };

    const COLORS = {
        canvasBg: '#f7f7f7',
        seat: '#dedede',
        seatLine: '#f8fafc',
        removedLine: 'rgba(148,163,184,.22)',
        emptySeat: 'rgba(209,213,219,.18)',
        emptySeatLine: 'rgba(209,213,219,.28)',
        stage: '#c9c9c9',
        selected: '#ef4444',
        normalSection: '#8b5cf6',
        miniNormalFill: 'rgba(148,163,184,.35)',
        miniNormalLine: '#cbd5e1',
        miniSelectedFill: 'rgba(239,68,68,.50)',
        obstructed: '#f59e0b',
        obstructedLine: '#d97706',
    };

    const PART_TITLE = {
        [PART.BASE]: '파트1 · 기준 구역 선택',
        [PART.EDIT]: '파트2 · 선택 구역 좌석 배치',
        [PART.EXPORT]: '파트3 · JSON 정리',
    };

    const FALLBACK_SECTIONS = [
        {
            id: 'sec1',
            name: 'A',
            floor: '1층',
            grade: 'VIP',
            renderColor: '#8b5cf6',
            polygon: [
                { x: 180, y: 120 },
                { x: 360, y: 120 },
                { x: 360, y: 260 },
                { x: 180, y: 260 },
            ],
        },
        {
            id: 'sec2',
            name: 'B',
            floor: '1층',
            grade: 'R',
            renderColor: '#f472b6',
            polygon: [
                { x: 390, y: 120 },
                { x: 570, y: 120 },
                { x: 570, y: 260 },
                { x: 390, y: 260 },
            ],
        },
    ];

    const dom = {};

    const state = {
        part: PART.BASE,
        zoom: 1,
        width: 0,
        height: 0,
        imageUrl:
            localStorage.getItem(STORAGE_KEYS.overviewImage) ||
            localStorage.getItem(STORAGE_KEYS.cleanImage) ||
            localStorage.getItem(STORAGE_KEYS.originalImage),
        meta: readStorageJson(STORAGE_KEYS.imageMeta, {}),
        sections: readStorageJson(STORAGE_KEYS.sections, []),
        seatsBySection: readStorageJson(STORAGE_KEYS.stage3Seats, {}),
        selectedId: null,
        isPainting: false,
        paintMode: PAINT_MODE.REMOVED,
        stageImage: null,
    };

    /* =====================================================
       2. Small Utilities
       ===================================================== */

    function $(id) {
        return document.getElementById(id);
    }

    function readStorageJson(key, fallback) {
        try {
            return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
        } catch (error) {
            console.warn(`[SeatBuilder] localStorage JSON parse failed: ${key}`, error);
            return fallback;
        }
    }

    function writeStorageJson(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function toPositiveInt(value, fallback = 1) {
        return Math.max(1, parseInt(value, 10) || fallback);
    }

    function showToast(message) {
        dom.toast.textContent = message;
        dom.toast.classList.add('show');
        setTimeout(() => dom.toast.classList.remove('show'), 1800);
    }

    function rowName(index) {
        let number = index + 1;
        let name = '';

        while (number > 0) {
            number -= 1;
            name = String.fromCharCode(97 + (number % 26)) + name;
            number = Math.floor(number / 26);
        }

        return name;
    }

    function cleanCode(value, fallback) {
        const raw = String(value || fallback || '').trim();
        const cleaned = raw
            .replace(/^구역\s*/, '')
            .replace(/층/g, '')
            .replace(/\s+/g, '')
            .replace(/[^\w가-힣-]/g, '');

        return cleaned || String(fallback || 'A');
    }

    function floorCode(section) {
        const matched = String(section.floor || '1층').match(/\d+/);
        return matched ? matched[0] : cleanCode(section.floor, '1');
    }

    function sectionCode(section) {
        return cleanCode(section.label || section.name || section.id, section.id);
    }

    /* =====================================================
       3. Section Geometry
       - Stage2에서 넘어온 polygon/buttonShape를 캔버스 도형으로 처리합니다.
       ===================================================== */

    function getSectionPaths(section) {
        if (section.buttonShape?.paths?.length) return section.buttonShape.paths;
        if (section.buttonPolygon?.length) return [section.buttonPolygon];
        if (section.polygon?.length) return [section.polygon];
        return [];
    }

    function getMainPath(section) {
        return getSectionPaths(section)[0] || [];
    }

    function getBBox(poly) {
        if (!poly.length) return { x: 0, y: 0, w: 1, h: 1 };

        const xs = poly.map(point => point.x);
        const ys = poly.map(point => point.y);

        return {
            x: Math.min(...xs),
            y: Math.min(...ys),
            w: Math.max(...xs) - Math.min(...xs),
            h: Math.max(...ys) - Math.min(...ys),
        };
    }

    function polygonArea(poly) {
        let sum = 0;

        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            sum += poly[j].x * poly[i].y - poly[i].x * poly[j].y;
        }

        return Math.abs(sum / 2);
    }

    function sectionArea(section) {
        const paths = getSectionPaths(section);
        if (!paths.length) return 0;

        let area = polygonArea(paths[0]);
        for (let i = 1; i < paths.length; i += 1) {
            area -= polygonArea(paths[i]);
        }

        return Math.max(0, area);
    }

    function pointInPolygon(point, poly) {
        let inside = false;

        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const a = poly[i];
            const b = poly[j];
            const intersect =
                (a.y > point.y) !== (b.y > point.y) &&
                point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;

            if (intersect) inside = !inside;
        }

        return inside;
    }

    function pointInSection(point, section) {
        const paths = getSectionPaths(section);
        if (!paths.length) return false;

        let inside = false;
        paths.forEach(poly => {
            if (pointInPolygon(point, poly)) inside = !inside;
        });

        return inside;
    }

    function drawPath(ctx, poly) {
        poly.forEach((point, index) => {
            if (index === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
        });
    }

    function drawSectionShape(ctx, section, fill, stroke, lineWidth = 2, dash = []) {
        const paths = getSectionPaths(section);
        if (!paths.length) return;

        ctx.save();
        ctx.beginPath();
        paths.forEach(poly => {
            drawPath(ctx, poly);
            ctx.closePath();
        });
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.setLineDash(dash);
        ctx.fill('evenodd');
        ctx.stroke();
        ctx.restore();
    }

    function getSelectedSection() {
        return state.sections.find(section => section.id === state.selectedId) || state.sections[0];
    }

    /* =====================================================
       4. Seat Data
       ===================================================== */

    function estimateGridByArea(section, baseSection, baseRows, baseCols) {
        const baseArea = Math.max(1, sectionArea(baseSection));
        const targetArea = Math.max(1, sectionArea(section));
        const baseCount = Math.max(1, baseRows * baseCols);
        const targetCount = Math.max(1, Math.round((baseCount * targetArea) / baseArea));

        const bbox = getBBox(getMainPath(section));
        const aspect = Math.max(0.25, bbox.w / Math.max(1, bbox.h));
        const cols = Math.max(1, Math.round(Math.sqrt(targetCount * aspect)));
        const rows = Math.max(1, Math.ceil(targetCount / cols));

        return { rows, cols };
    }

    function createSeatsForSection(section, rows, cols) {
        const path = getMainPath(section);
        if (!path.length) return [];

        const bbox = getBBox(path);
        const seatWidth = Math.max(8, Math.min(36, (bbox.w / cols) * 0.72));
        const seatHeight = Math.max(8, Math.min(36, (bbox.h / rows) * 0.72));
        const seats = [];

        for (let row = 0; row < rows; row += 1) {
            for (let col = 0; col < cols; col += 1) {
                const x = bbox.x + (col + 0.5) * (bbox.w / cols);
                const y = bbox.y + (row + 0.5) * (bbox.h / rows);

                if (!pointInSection({ x, y }, section)) continue;

                seats.push({
                    id: `${section.id}-${rowName(row)}-${col + 1}`,
                    sectionId: section.id,
                    rowIndex: row,
                    colIndex: col,
                    row: rowName(row),
                    col: col + 1,
                    x,
                    y,
                    w: seatWidth,
                    h: seatHeight,
                    status: SEAT_STATUS.AVAILABLE,
                });
            }
        }

        section.seatRows = rows;
        section.seatCols = cols;
        return seats;
    }

    function getSectionSeatCount(section) {
        return (state.seatsBySection[section.id] || [])
            .filter(seat => seat.status !== SEAT_STATUS.REMOVED)
            .length;
    }

    function exportSeats() {
        const result = [];

        state.sections.forEach(section => {
            const grade = section.grade || '일반석';
            const floor = floorCode(section);
            const zone = sectionCode(section);
            const seats = state.seatsBySection[section.id] || [];

            seats.forEach(seat => {
                if (seat.status === SEAT_STATUS.REMOVED) return;

                result.push({
                    id: `${floor}-${zone}-${seat.row}-${seat.col}`,
                    grade,
                    status: seat.status === SEAT_STATUS.OBSTRUCTED
                        ? SEAT_STATUS.OBSTRUCTED
                        : SEAT_STATUS.AVAILABLE,
                });
            });
        });

        return result;
    }

    function saveWorkData() {
        writeStorageJson(STORAGE_KEYS.stage3Seats, state.seatsBySection);
        writeStorageJson(STORAGE_KEYS.sections, state.sections);
        writeStorageJson(STORAGE_KEYS.seatJson, exportSeats());
    }

    // JSON 으로 저장하기
    async function saveSeatJsonToServer() {
        const data = JSON.stringify(exportSeats(), null, 2);
        localStorage.setItem(STORAGE_KEYS.seatJson, data);

        const fileName = makeSeatMapFileName();

        try {
            const response = await fetch('/admin/seatmap/json/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fileName,
                    json: data,
                }),
            });

            if (!response.ok) {
                showToast('JSON 저장 실패');
                return;
            }

            const result = await response.json();

            localStorage.setItem('concert_seat_json_url', result.jsonUrl);
            showToast(`JSON 저장 완료: ${result.jsonUrl}`);

        } catch (error) {
            console.error('[SeatBuilder] JSON save failed', error);
            showToast('JSON 저장 중 오류 발생');
        }
    }

    function makeSeatMapFileName() {
        const concertId = localStorage.getItem('concert_id') || 'concert';
        const sessionId = localStorage.getItem('concert_session_id') || 'session';

        return `seatmap-${concertId}-${sessionId}.json`;
    }

    /* =====================================================
       5. Canvas Rendering
       ===================================================== */

    function ensureSections() {
        if (state.sections.length) return;

        state.sections = structuredClone(FALLBACK_SECTIONS);
        state.selectedId = state.sections[0].id;
        showToast('Stage2에서 구역을 먼저 저장하세요. 임시 구역으로 표시합니다.');
    }

    function setupCanvas() {
        ensureSections();

        if (!state.selectedId) {
            state.selectedId = state.sections[0]?.id || null;
        }

        if (state.meta.width && state.meta.height) {
            state.width = state.meta.width;
            state.height = state.meta.height;
        } else {
            const allPoints = state.sections.flatMap(section => getSectionPaths(section).flat());
            state.width = Math.ceil(Math.max(900, ...allPoints.map(point => point.x + 40)));
            state.height = Math.ceil(Math.max(620, ...allPoints.map(point => point.y + 40)));
        }

        dom.miniCanvas.width = state.width;
        dom.miniCanvas.height = state.height;

        if (state.imageUrl) {
            state.stageImage = new Image();
            state.stageImage.onload = () => {
                renderMiniMap();
                draw();
            };
            state.stageImage.src = state.imageUrl;
        } else {
            renderMiniMap();
        }

        resizeView();
    }

    function setCanvasSize(width, height) {
        dom.baseCanvas.width = width;
        dom.overlayCanvas.width = width;
        dom.baseCanvas.height = height;
        dom.overlayCanvas.height = height;
        dom.sizeText.textContent = `${width} × ${height}`;

        const fitScale = Math.min(1, 1080 / width, 680 / height);
        const scale = fitScale * state.zoom;

        [dom.baseCanvas, dom.overlayCanvas].forEach(canvas => {
            canvas.style.width = `${width * scale}px`;
            canvas.style.height = `${height * scale}px`;
        });

        dom.canvasBox.style.width = `${width * scale}px`;
        dom.canvasBox.style.height = `${height * scale}px`;
    }

    function resizeView() {
        if (state.part === PART.EDIT) {
            setCanvasSize(CANVAS_GRID.width, CANVAS_GRID.height);
        } else {
            setCanvasSize(state.width, state.height);
        }

        draw();
    }

    function draw() {
        if (state.part === PART.EDIT) drawSeatGrid();
        else drawFullMap();

        updateSelectedInfo();
    }

    function clearFullCanvas() {
        dom.baseCtx.clearRect(0, 0, dom.baseCanvas.width, dom.baseCanvas.height);
        dom.overlayCtx.clearRect(0, 0, dom.overlayCanvas.width, dom.overlayCanvas.height);
    }

    function drawFullMap() {
        clearFullCanvas();

        dom.baseCtx.fillStyle = COLORS.canvasBg;
        dom.baseCtx.fillRect(0, 0, state.width, state.height);

        if (state.stageImage) {
            dom.baseCtx.save();
            dom.baseCtx.globalAlpha = 0.28;
            dom.baseCtx.drawImage(state.stageImage, 0, 0, state.width, state.height);
            dom.baseCtx.restore();
        }

        state.sections.forEach(section => {
            const selected = section.id === state.selectedId;
            drawSectionShape(
                dom.overlayCtx,
                section,
                selected ? 'rgba(239,68,68,.12)' : 'rgba(124,58,237,.06)',
                selected ? COLORS.selected : (section.renderColor || section.stroke || COLORS.normalSection),
                selected ? 3 : 1.5,
                selected ? [8, 4] : [5, 5],
            );
        });

        renderMiniMap();
    }

    function drawSeatGrid() {
        const layout = getSeatGridLayout();
        const section = layout.section;
        const seats = layout.seats;

        clearFullCanvas();

        dom.baseCtx.fillStyle = COLORS.canvasBg;
        dom.baseCtx.fillRect(0, 0, CANVAS_GRID.width, CANVAS_GRID.height);

        drawStage(layout);
        drawRowLabels(layout);
        drawSeats(layout, seats);

        dom.baseCtx.fillStyle = '#9ca3af';
        dom.baseCtx.font = '15px Arial';
        dom.baseCtx.textAlign = 'center';
        dom.baseCtx.textBaseline = 'middle';
        dom.baseCtx.fillText(
            `현재 보고 계신 구역은 ${section?.floor || '1층'} ${section?.name || '-'} 구역입니다.`,
            CANVAS_GRID.width / 2,
            layout.infoY,
        );

        renderMiniMap();
    }

    function getSeatGridLayout() {
        const section = getSelectedSection();
        const seats = state.seatsBySection[section?.id] || [];
        const rows = section?.seatRows || Math.max(1, Math.max(...seats.map(seat => seat.rowIndex + 1), 5));
        const cols = section?.seatCols || Math.max(1, Math.max(...seats.map(seat => seat.colIndex + 1), 10));

        const stageX = 120;
        const stageY = 14;
        const stageW = CANVAS_GRID.width - 240;
        const stageH = 52;

        const gridX = 110;
        const gridY = 115;
        const gridMaxW = CANVAS_GRID.width - gridX - 85;
        const gridMaxH = CANVAS_GRID.height - gridY - 42;
        const gap = 4;

        const seatW = Math.max(10, Math.min(34, (gridMaxW - (cols - 1) * gap) / cols));
        const seatH = Math.max(10, Math.min(32, (gridMaxH - (rows - 1) * gap) / rows));

        return {
            section,
            seats,
            rows,
            cols,
            stageX,
            stageY,
            stageW,
            stageH,
            infoY: 78,
            gridX,
            gridY,
            gap,
            seatW,
            seatH,
        };
    }

    function drawStage(layout) {
        dom.baseCtx.fillStyle = COLORS.stage;
        dom.baseCtx.fillRect(layout.stageX, layout.stageY, layout.stageW, layout.stageH);

        dom.baseCtx.fillStyle = '#ffffff';
        dom.baseCtx.font = 'bold 18px Arial';
        dom.baseCtx.textAlign = 'center';
        dom.baseCtx.textBaseline = 'middle';
        dom.baseCtx.fillText('무대방향 (STAGE)', CANVAS_GRID.width / 2, layout.stageY + layout.stageH / 2);
    }

    function drawRowLabels(layout) {
        for (let row = 0; row < layout.rows; row += 1) {
            const y = layout.gridY + row * (layout.seatH + layout.gap);

            dom.baseCtx.fillStyle = '#9ca3af';
            dom.baseCtx.font = '26px Arial';
            dom.baseCtx.textAlign = 'right';
            dom.baseCtx.textBaseline = 'middle';
            dom.baseCtx.fillText(String(row + 1), 70, y + layout.seatH / 2);
        }
    }

    function drawSeats(layout, seats) {
        const seatMap = new Map();
        seats.forEach(seat => seatMap.set(`${seat.rowIndex}-${seat.colIndex}`, seat));

        for (let row = 0; row < layout.rows; row += 1) {
            for (let col = 0; col < layout.cols; col += 1) {
                const seat = seatMap.get(`${row}-${col}`);
                const x = layout.gridX + col * (layout.seatW + layout.gap);
                const y = layout.gridY + row * (layout.seatH + layout.gap);

                drawSingleSeat(seat, x, y, layout.seatW, layout.seatH);
            }
        }
    }

    function drawSingleSeat(seat, x, y, width, height) {
        const ctx = dom.baseCtx;

        if (seat && seat.status === SEAT_STATUS.REMOVED) {
            ctx.save();
            ctx.strokeStyle = COLORS.removedLine;
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(x, y, width, height);
            ctx.restore();
            return;
        }

        ctx.save();
        drawRoundRect(ctx, x, y, width, height, 2);

        if (!seat) {
            ctx.fillStyle = COLORS.emptySeat;
            ctx.strokeStyle = COLORS.emptySeatLine;
        } else if (seat.status === SEAT_STATUS.OBSTRUCTED) {
            ctx.fillStyle = COLORS.obstructed;
            ctx.strokeStyle = COLORS.obstructedLine;
        } else {
            ctx.fillStyle = COLORS.seat;
            ctx.strokeStyle = COLORS.seatLine;
        }

        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    function drawRoundRect(ctx, x, y, width, height, radius) {
        const r = Math.min(radius, width / 2, height / 2);

        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + width - r, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + r);
        ctx.lineTo(x + width, y + height - r);
        ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        ctx.lineTo(x + r, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    function renderMiniMap() {
        dom.miniCtx.clearRect(0, 0, state.width, state.height);
        dom.miniCtx.fillStyle = COLORS.canvasBg;
        dom.miniCtx.fillRect(0, 0, state.width, state.height);

        if (state.stageImage) {
            dom.miniCtx.save();
            dom.miniCtx.globalAlpha = 0.28;
            dom.miniCtx.drawImage(state.stageImage, 0, 0, state.width, state.height);
            dom.miniCtx.restore();
        }

        state.sections.forEach(section => {
            const selected = section.id === state.selectedId;

            drawSectionShape(
                dom.miniCtx,
                section,
                selected ? COLORS.miniSelectedFill : COLORS.miniNormalFill,
                selected ? COLORS.selected : COLORS.miniNormalLine,
                selected ? 3 : 1.3,
            );
        });
    }

    /* =====================================================
       6. UI Rendering
       ===================================================== */

    function renderSelects() {
        const options = state.sections
            .map(section => {
                const title = `${section.name || section.id} · ${section.floor || '1층'} · ${section.grade || '등급'}`;
                return `<option value="${section.id}">${title}</option>`;
            })
            .join('');

        dom.baseSectionSelect.innerHTML = options;
        dom.editSectionSelect.innerHTML = options;

        if (state.selectedId) {
            dom.baseSectionSelect.value = state.selectedId;
            dom.editSectionSelect.value = state.selectedId;
        }
    }

    function renderSectionList(rootId) {
        const root = $(rootId);
        if (!root) return;

        if (!state.sections.length) {
            root.innerHTML = '<div class="help-text">구역 없음</div>';
            return;
        }

        root.innerHTML = state.sections
            .map(section => {
                const active = section.id === state.selectedId ? ' active' : '';
                const color = section.renderColor || section.stroke || COLORS.normalSection;
                const rows = section.seatRows || 0;
                const cols = section.seatCols || 0;
                const count = getSectionSeatCount(section);

                return `
                    <div class="section-item${active}" data-id="${section.id}">
                        <i class="section-item__color" style="background:${color}"></i>
                        <div>
                            <strong>${section.name || section.id}</strong>
                            <span>${section.floor || '1층'} · ${section.grade || '등급'} · ${rows}×${cols} · ${count}석</span>
                        </div>
                    </div>
                `;
            })
            .join('');

        root.querySelectorAll('.section-item').forEach(item => {
            item.addEventListener('click', () => selectSection(item.dataset.id));
        });
    }

    function renderLists() {
        renderSelects();
        renderSectionList('sectionsList1');
        renderSectionList('sectionsListRight');
    }

    function selectSection(sectionId) {
        state.selectedId = sectionId;

        const section = getSelectedSection();
        if (section) {
            dom.baseSectionSelect.value = section.id;
            dom.editSectionSelect.value = section.id;
            dom.editRows.value = section.seatRows || dom.baseRows.value || 5;
            dom.editCols.value = section.seatCols || dom.baseCols.value || 10;
        }

        renderLists();
        draw();
    }

    function updateSelectedInfo() {
        const section = getSelectedSection();
        if (!section) return;

        dom.selName.textContent = section.name || section.id;
        dom.selCount.textContent = getSectionSeatCount(section);
    }

    function setPart(nextPart) {
        state.part = nextPart;

        dom.partBtn1.classList.toggle('active', nextPart === PART.BASE);
        dom.partBtn2.classList.toggle('active', nextPart === PART.EDIT);
        dom.partBtn3.classList.toggle('active', nextPart === PART.EXPORT);

        dom.part1Panel.classList.toggle('hidden', nextPart !== PART.BASE);
        dom.part2Panel.classList.toggle('hidden', nextPart !== PART.EDIT);
        dom.part3Panel.classList.toggle('hidden', nextPart !== PART.EXPORT);

        dom.canvasTitle.textContent = PART_TITLE[nextPart];

        resizeView();
        renderLists();

        if (nextPart === PART.EXPORT) {
            updateSummary();
        }
    }

    function updateSummary() {
        const data = exportSeats();
        const floorCount = new Set(state.sections.map(section => floorCode(section))).size;
        const obstructedCount = data.filter(seat => seat.status === SEAT_STATUS.OBSTRUCTED).length;
        const countByGrade = {};

        data.forEach(seat => {
            countByGrade[seat.grade] = (countByGrade[seat.grade] || 0) + 1;
        });

        const gradeText = Object.entries(countByGrade)
            .map(([grade, count]) => `${grade} ${count}석`)
            .join(' · ') || '좌석 없음';

        dom.sumFloors.textContent = floorCount;
        dom.sumSections.textContent = state.sections.length;
        dom.sumSeats.textContent = data.length;
        dom.sumObstructed.textContent = obstructedCount;
        dom.summaryText.textContent =
            `최종 층 수 ${floorCount}개, 구역 ${state.sections.length}개, 좌석 ${data.length}석입니다. ` +
            `장애석 ${obstructedCount}석. 등급별: ${gradeText}`;
        dom.jsonPreview.value = JSON.stringify(data, null, 2);
    }

    function copyJson() {
        const text = dom.jsonPreview.value;

        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text);
        } else {
            dom.jsonPreview.select();
            document.execCommand('copy');
        }

        showToast('JSON 복사 완료');
    }

    function setPaintMode(mode) {
        state.paintMode = mode;
        dom.modeRemove.classList.toggle('active', mode === PAINT_MODE.REMOVED);
        dom.modeAvailable.classList.toggle('active', mode === PAINT_MODE.AVAILABLE);
        dom.modeObstructed.classList.toggle('active', mode === PAINT_MODE.OBSTRUCTED);
    }

    /* =====================================================
       7. Actions
       ===================================================== */

    function applyBaseOne() {
        const section = state.sections.find(item => item.id === dom.baseSectionSelect.value);
        if (!section) return;

        state.selectedId = section.id;

        const rows = toPositiveInt(dom.baseRows.value);
        const cols = toPositiveInt(dom.baseCols.value);
        state.seatsBySection[section.id] = createSeatsForSection(section, rows, cols);

        saveWorkData();
        renderLists();
        draw();
        showToast(`${section.name || section.id} 좌석 생성 완료`);
    }

    function applyBaseAll() {
        const baseSection = state.sections.find(item => item.id === dom.baseSectionSelect.value);
        if (!baseSection) return;

        const baseRows = toPositiveInt(dom.baseRows.value);
        const baseCols = toPositiveInt(dom.baseCols.value);

        state.sections.forEach(section => {
            const grid = section.id === baseSection.id
                ? { rows: baseRows, cols: baseCols }
                : estimateGridByArea(section, baseSection, baseRows, baseCols);

            state.seatsBySection[section.id] = createSeatsForSection(section, grid.rows, grid.cols);
        });

        state.selectedId = baseSection.id;

        saveWorkData();
        renderLists();
        draw();
        showToast('전체 구역 좌석 수 자동 추정 완료');
    }

    function regenSelectedSection() {
        const section = state.sections.find(item => item.id === dom.editSectionSelect.value);
        if (!section) return;

        state.selectedId = section.id;

        const rows = toPositiveInt(dom.editRows.value);
        const cols = toPositiveInt(dom.editCols.value);
        state.seatsBySection[section.id] = createSeatsForSection(section, rows, cols);

        saveWorkData();
        renderLists();
        draw();
        showToast('선택 구역 좌석 재생성 완료');
    }

    /* =====================================================
       8. Pointer / Hit Test
       ===================================================== */

    function canvasPointFromEvent(event) {
        const rect = dom.overlayCanvas.getBoundingClientRect();

        return {
            x: ((event.clientX - rect.left) * dom.overlayCanvas.width) / rect.width,
            y: ((event.clientY - rect.top) * dom.overlayCanvas.height) / rect.height,
        };
    }

    function miniPointFromEvent(event) {
        const rect = dom.miniCanvas.getBoundingClientRect();

        return {
            x: ((event.clientX - rect.left) * dom.miniCanvas.width) / rect.width,
            y: ((event.clientY - rect.top) * dom.miniCanvas.height) / rect.height,
        };
    }

    function findSectionAt(point) {
        return [...state.sections].reverse().find(section => pointInSection(point, section));
    }

    function seatAtGridPoint(point) {
        const layout = getSeatGridLayout();
        const section = layout.section;
        if (!section) return null;

        const col = Math.floor((point.x - layout.gridX) / (layout.seatW + layout.gap));
        const row = Math.floor((point.y - layout.gridY) / (layout.seatH + layout.gap));

        if (row < 0 || col < 0 || row >= layout.rows || col >= layout.cols) return null;

        const seatX = layout.gridX + col * (layout.seatW + layout.gap);
        const seatY = layout.gridY + row * (layout.seatH + layout.gap);
        if (point.x > seatX + layout.seatW || point.y > seatY + layout.seatH) return null;

        const seats = state.seatsBySection[section.id] || [];
        return seats.find(seat => seat.rowIndex === row && seat.colIndex === col) || null;
    }

    function paintSeatAt(point) {
        const seat = seatAtGridPoint(point);
        if (!seat || seat.status === state.paintMode) return;

        seat.status = state.paintMode;
        saveWorkData();
        draw();
    }

    /* =====================================================
       9. Event Binding
       ===================================================== */

    function bindEvents() {
        dom.partBtn1.addEventListener('click', () => setPart(PART.BASE));
        dom.partBtn2.addEventListener('click', () => setPart(PART.EDIT));
        dom.partBtn3.addEventListener('click', () => setPart(PART.EXPORT));
        dom.goPart2.addEventListener('click', () => setPart(PART.EDIT));
        dom.goPart3.addEventListener('click', () => setPart(PART.EXPORT));

        dom.baseSectionSelect.addEventListener('change', event => selectSection(event.target.value));
        dom.editSectionSelect.addEventListener('change', event => selectSection(event.target.value));

        dom.applyBaseOne.addEventListener('click', applyBaseOne);
        dom.applyBaseAll.addEventListener('click', applyBaseAll);
        dom.regenSelected.addEventListener('click', regenSelectedSection);

        dom.modeRemove.addEventListener('click', () => setPaintMode(PAINT_MODE.REMOVED));
        dom.modeAvailable.addEventListener('click', () => setPaintMode(PAINT_MODE.AVAILABLE));
        dom.modeObstructed.addEventListener('click', () => setPaintMode(PAINT_MODE.OBSTRUCTED));

        dom.zoomIn.addEventListener('click', () => {
            state.zoom = Math.min(3, state.zoom + 0.15);
            resizeView();
        });

        dom.zoomOut.addEventListener('click', () => {
            state.zoom = Math.max(0.35, state.zoom - 0.15);
            resizeView();
        });

        dom.zoomReset.addEventListener('click', () => {
            state.zoom = 1;
            resizeView();
        });

        // JSON 폴더에 저장하기
        dom.saveJsonTop.addEventListener('click', saveSeatJsonToServer);

        dom.copyJson.addEventListener('click', copyJson);

        dom.overlayCanvas.addEventListener('pointerdown', event => {
            const point = canvasPointFromEvent(event);

            if (state.part === PART.EDIT) {
                state.isPainting = true;
                paintSeatAt(point);
                return;
            }

            const hit = findSectionAt(point);
            if (hit) selectSection(hit.id);
        });

        window.addEventListener('pointermove', event => {
            if (!state.isPainting || state.part !== PART.EDIT) return;
            paintSeatAt(canvasPointFromEvent(event));
        });

        window.addEventListener('pointerup', () => {
            state.isPainting = false;
        });

        dom.miniCanvas.addEventListener('click', event => {
            const hit = findSectionAt(miniPointFromEvent(event));
            if (!hit) return;

            selectSection(hit.id);
            setPart(PART.EDIT);
        });
    }

    /* =====================================================
       10. Init
       ===================================================== */

    function cacheDom() {
        dom.baseCanvas = $('base');
        dom.overlayCanvas = $('overlay');
        dom.baseCtx = dom.baseCanvas.getContext('2d');
        dom.overlayCtx = dom.overlayCanvas.getContext('2d');
        dom.miniCanvas = $('miniCanvas');
        dom.miniCtx = dom.miniCanvas.getContext('2d');

        dom.canvasBox = $('canvasBox');
        dom.canvasTitle = $('canvasTitle');
        dom.sizeText = $('sizeText');
        dom.toast = $('toast');

        dom.partBtn1 = $('partBtn1');
        dom.partBtn2 = $('partBtn2');
        dom.partBtn3 = $('partBtn3');
        dom.part1Panel = $('part1Panel');
        dom.part2Panel = $('part2Panel');
        dom.part3Panel = $('part3Panel');
        dom.goPart2 = $('goPart2');
        dom.goPart3 = $('goPart3');

        dom.baseSectionSelect = $('baseSectionSelect');
        dom.editSectionSelect = $('editSectionSelect');
        dom.baseRows = $('baseRows');
        dom.baseCols = $('baseCols');
        dom.editRows = $('editRows');
        dom.editCols = $('editCols');

        dom.applyBaseOne = $('applyBaseOne');
        dom.applyBaseAll = $('applyBaseAll');
        dom.regenSelected = $('regenSelected');

        dom.modeRemove = $('modeRemove');
        dom.modeAvailable = $('modeAvailable');
        dom.modeObstructed = $('modeObstructed');

        dom.zoomIn = $('zoomIn');
        dom.zoomOut = $('zoomOut');
        dom.zoomReset = $('zoomReset');
        dom.saveJsonTop = $('saveJsonTop');
        dom.copyJson = $('copyJson');

        dom.selName = $('selName');
        dom.selCount = $('selCount');
        dom.sumFloors = $('sumFloors');
        dom.sumSections = $('sumSections');
        dom.sumSeats = $('sumSeats');
        dom.sumObstructed = $('sumObstructed');
        dom.summaryText = $('summaryText');
        dom.jsonPreview = $('jsonPreview');
    }

    function init() {
        cacheDom();

        if (!state.selectedId) {
            state.selectedId = state.sections[0]?.id || null;
        }

        setupCanvas();
        renderLists();

        const section = getSelectedSection();
        if (section) {
            dom.editRows.value = section.seatRows || 5;
            dom.editCols.value = section.seatCols || 10;
        }

        bindEvents();
        setPart(PART.BASE);
    }

    init();
})();
