(() => {


  // ============================================================
  // 1. DOM / Canvas / 전역 상태
  // ============================================================
  const $ = (id) => document.getElementById(id);
  const appRoot = $("stage2App");
  const ROUTES = {
    // 이전 스테이지
    stage1: appRoot?.dataset.stage1Url || "/admin/seatmap/concert/stage1",
    // 다음 스테이지
    stage3: appRoot?.dataset.stage3Url || "/admin/seatmap/concert/stage3",
  };
  const STAGE1_SETTINGS_KEY = "concert_stage1Settings";
  const IMAGE_META_KEY = "concert_imageMeta";
  const STAGE2_BACKGROUND_COLOR = "#ffffff";
  const STAGE2_SHAPE_COLOR = "#d9d9d9";

  function getProjectFolderName() {
    const query = new URLSearchParams(location.search);
    return query.get("projectId") ||
      localStorage.getItem("seatmap_current_folder_name") ||
      localStorage.getItem("seatmap_current_project_id") ||
      "seat";
  }

  function getProjectImageUrl(fileName) {
    return `/temp/seatmap/${encodeURIComponent(projectFolderName || getProjectFolderName())}/${fileName}`;
  }
  let stage1Settings = readStage1Settings();

  const base = $("baseCanvas");
  const overlay = $("overlayCanvas");
  const bctx = base.getContext("2d", { willReadFrequently: true });
  const octx = overlay.getContext("2d");
  const preview = $("previewCanvas");
  const pctx = preview.getContext("2d");

  const cleanCanvas = document.createElement("canvas");
  const cleanCtx = cleanCanvas.getContext("2d", { willReadFrequently: true });
  const originalCanvas = document.createElement("canvas");
  const originalCtx = originalCanvas.getContext("2d", {
    willReadFrequently: true,
  });

  let part = 1;
  const projectFolderName = getProjectFolderName();
  let cleanUrl =
    localStorage.getItem("concert_cleanImage") ||
    localStorage.getItem("concert_buttonImage") ||
    localStorage.getItem("seatmap_button_image_url") ||
    getProjectImageUrl("button-image.png") ||
    localStorage.getItem("concert_originalImage") ||
    getProjectImageUrl("cropped-image.png");
  let originalUrl =
    localStorage.getItem("concert_originalImage") ||
    localStorage.getItem("seatmap_original_image_url") ||
    getProjectImageUrl("original-image.png") ||
    cleanUrl;
  let W = 0,
    H = 0;
  let cleanImageLoaded = false;
  let originalImageLoaded = false;
  let sections = [];
  let colorGroups = [];
  let colorRules = [];
  let selectedId = null;
  let nextId = 1;
  let manualMode = false;
  let dragRect = null;
  let cornerDrag = null;
  let pointMode = false;
  let draftPoints = [];
  let editMode = false;
  let editAction = "move";
  let finalMapUrl = null;
  let baseScale = 1;
  let zoomScale = 1;
  let zoomToolOn = false;
  let zoomDragging = false;
  let zoomStartX = 0;
  let zoomStartScale = 1;
  let numberClickMode = false;
  let nextSectionNumber = 1;
  let sectionNumberHistory = [];
  let clickSectionGroupKey = "";
  let part1EditMode = "";
  let part3AutoNumberApplied = false;

  const palette = [
    "#ff7a1a",
    "#f78bb8",
    "#9c7cf4",
    "#f7c875",
    "#b77bf0",
    "#78c7e8",
    "#f97316",
    "#22c55e",
  ];

  // ============================================================
  // 2. 공통 유틸
  // ============================================================
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2300);
  }

  function img(url) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = url;
    });
  }

  function hexToRgb(h) {
    return {
      r: parseInt(h.slice(1, 3), 16),
      g: parseInt(h.slice(3, 5), 16),
      b: parseInt(h.slice(5, 7), 16),
    };
  }
  function rgbToHex(c) {
    return (
      "#" +
      [c.r, c.g, c.b]
        .map((v) =>
          Math.max(0, Math.min(255, Math.round(v)))
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")
    );
  }

  function normalizeHexColor(value, fallback = "#000000") {
    const color = String(value || fallback).trim();

    if (/^#[0-9a-fA-F]{6}$/.test(color)) return color.toLowerCase();

    if (/^#[0-9a-fA-F]{3}$/.test(color)) {
      return (
        "#" +
        color
          .slice(1)
          .split("")
          .map((v) => v + v)
          .join("")
      ).toLowerCase();
    }

    return fallback.toLowerCase();
  }

  function readJsonStorage(key) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (e) {
      return null;
    }
  }

  function readStage1Settings() {
    const settings = readJsonStorage(STAGE1_SETTINGS_KEY);
    const meta = readJsonStorage(IMAGE_META_KEY);

    return {
      shapeColor: normalizeHexColor(
        settings?.shapeColor || meta?.shapeColor || "#000000",
        "#000000",
      ),
      backgroundColor: normalizeHexColor(
        settings?.backgroundColor || meta?.backgroundColor || "#f7f7f7",
        "#f7f7f7",
      ),
      mode: settings?.mode || meta?.mode || "",
    };
  }

  function getStage1ShapeColor() {
    return normalizeHexColor(
      stage1Settings?.shapeColor || $("shapeColor")?.value || "#000000",
      "#000000",
    );
  }

  function getStage1BackgroundColor() {
    return normalizeHexColor(
      stage1Settings?.backgroundColor || $("bgColor")?.value || "#f7f7f7",
      "#f7f7f7",
    );
  }

  function isBlackLikeHex(hex) {
    const c = hexToRgb(normalizeHexColor(hex, "#000000"));
    const max = Math.max(c.r, c.g, c.b);
    const min = Math.min(c.r, c.g, c.b);
    const avg = (c.r + c.g + c.b) / 3;

    return max <= 80 || (max - min <= 24 && avg <= 135);
  }

  function getRenderColorFromStage1Shape() {
    const shapeColor = getStage1ShapeColor();

    if (isBlackLikeHex(shapeColor)) return STAGE2_SHAPE_COLOR;

    return shapeColor;
  }

  function getStage2ShapeColor() {
    return STAGE2_SHAPE_COLOR;
  }

  function getStage2BackgroundColor() {
    return STAGE2_BACKGROUND_COLOR;
  }

  function normalizeStage1CleanImageForStage2() {
    if (!W || !H) return;

    const imageData = cleanCtx.getImageData(0, 0, W, H);
    const data = imageData.data;
    const sourceBg = hexToRgb(getStage1BackgroundColor());
    const targetBg = hexToRgb(STAGE2_BACKGROUND_COLOR);
    const targetShape = hexToRgb(STAGE2_SHAPE_COLOR);

    for (let i = 0; i < data.length; i += 4) {
      const pixel = { r: data[i], g: data[i + 1], b: data[i + 2] };
      const isBackground = dist(pixel, sourceBg) <= 42;

      if (isBackground) {
        data[i] = targetBg.r;
        data[i + 1] = targetBg.g;
        data[i + 2] = targetBg.b;
        data[i + 3] = 255;
      } else {
        data[i] = targetShape.r;
        data[i + 1] = targetShape.g;
        data[i + 2] = targetShape.b;
        data[i + 3] = 255;
      }
    }

    cleanCtx.putImageData(imageData, 0, 0);
  }

  function normalizeStage2SectionColors() {
    sections.forEach((sec) => {
      sec.sourceColor = STAGE2_SHAPE_COLOR;
      sec.stage2ShapeColor = STAGE2_SHAPE_COLOR;
      sec.backgroundColor = STAGE2_BACKGROUND_COLOR;
      sec.renderColor = STAGE2_SHAPE_COLOR;
      sec.sourceGroup = 1;
      sec.ruleKey = "stage2-gray-shape";
      sec.sectionGroupKey = "source-1";
      sec.sectionGroupName = "색상 그룹 1";
    });
  }

  function applyStage1SettingsToInputs() {
    stage1Settings = readStage1Settings();

    if ($("shapeColor")) $("shapeColor").value = STAGE2_SHAPE_COLOR;
    if ($("bgColor")) $("bgColor").value = STAGE2_BACKGROUND_COLOR;
  }
  function dist(a, b) {
    return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
  }
  function posOn(canvas, e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * canvas.width) / r.width,
      y: ((e.clientY - r.top) * canvas.height) / r.height,
    };
  }
  function applyCanvasScale() {
    if (!W || !H) return;

    const scale = baseScale * zoomScale;
    const cssW = W * scale;
    const cssH = H * scale;

    base.style.width = overlay.style.width = cssW + "px";
    base.style.height = overlay.style.height = cssH + "px";

    const canvasBox = $("canvasBox");
    if (canvasBox) {
      canvasBox.style.width = cssW + "px";
      canvasBox.style.height = cssH + "px";
    }

    const zoomValue = $("zoomValue");
    if (zoomValue) {
      zoomValue.textContent = Math.round(zoomScale * 100) + "%";
    }

    const zoomTool = $("zoomTool");
    if (zoomTool) {
      zoomTool.classList.toggle("is-active", zoomToolOn);
    }

    if (canvasBox) {
      canvasBox.classList.toggle("is-zooming", zoomToolOn);
    }
  }

  function setupCanvas(w, h) {
    W = w;
    H = h;
    [base, overlay].forEach((c) => {
      c.width = w;
      c.height = h;
    });
    cleanCanvas.width = w;
    cleanCanvas.height = h;

    baseScale = Math.min(1, 1120 / w, 720 / h);
    zoomScale = 1;
    applyCanvasScale();

    const canvasSize = $("canvasSize");
    if (canvasSize) {
      canvasSize.textContent = w + " × " + h;
    }
    preview.width = w;
    preview.height = h;
  }

  function setZoom(nextZoom) {
    zoomScale = Math.max(0.25, Math.min(4, nextZoom));
    applyCanvasScale();
  }

  function zoomIn() {
    setZoom(zoomScale * 1.15);
  }

  function zoomOut() {
    setZoom(zoomScale / 1.15);
  }

  function resetZoom() {
    setZoom(1);
  }

  // ============================================================
  // 3. 좌표 / 다각형 계산 유틸
  // ============================================================
  function pointInPoly(p, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i],
        b = poly[j];
      if (
        a.y > p.y !== b.y > p.y &&
        p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
      )
        inside = !inside;
    }
    return inside;
  }

  function polyCenter(poly) {
    let x = 0,
      y = 0;
    poly.forEach((p) => {
      x += p.x;
      y += p.y;
    });
    return { x: x / poly.length, y: y / poly.length };
  }

  function bboxOf(poly) {
    const xs = poly.map((p) => p.x),
      ys = poly.map((p) => p.y);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
    };
  }

  function rectFromDrag(r) {
    return {
      x: Math.min(r.x, r.x + r.w),
      y: Math.min(r.y, r.y + r.h),
      w: Math.abs(r.w),
      h: Math.abs(r.h),
    };
  }

  function rectContainsPoint(r, p) {
    return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  }

  function rectIntersectsBBox(r, b) {
    return !(b.x > r.x + r.w || b.x + b.w < r.x || b.y > r.y + r.h || b.y + b.h < r.y);
  }

  function rectPolygon(x, y, w, h) {
    return [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ];
  }

  function bboxOfSections(list) {
    const points = [];
    list.forEach((sec) => {
      (sec.polygon || []).forEach((p) => points.push(p));
    });
    return points.length ? bboxOf(points) : null;
  }

  function polygonArea(poly) {
    let sum = 0;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      sum += (poly[j].x + poly[i].x) * (poly[j].y - poly[i].y);
    }
    return Math.abs(sum / 2);
  }

  function renderPoly(sec) {
    return sec.buttonPolygon || sec.polygon;
  }

  function renderPaths(sec) {
    if (
      sec.buttonShape &&
      sec.buttonShape.paths &&
      sec.buttonShape.paths.length
    ) {
      return sec.buttonShape.paths;
    }
    if (sec.buttonPolygon && sec.buttonPolygon.length >= 3) {
      return [sec.buttonPolygon];
    }
    return [sec.polygon];
  }

  function drawPath(ctx, poly) {
    poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  }

  function orderQuadPoints(points) {
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
    const sorted = points
      .slice()
      .sort(
        (a, b) =>
          Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx),
      );
    // sorted is roughly TL, TR, BR, BL after rotating start to smallest x+y
    let start = 0,
      best = Infinity;
    sorted.forEach((p, i) => {
      const v = p.x + p.y;
      if (v < best) {
        best = v;
        start = i;
      }
    });
    return sorted.slice(start).concat(sorted.slice(0, start));
  }

  function straightenNgon(poly, snapValue) {
    if (!poly || poly.length < 3) return poly;
    const snap = +snapValue || 0;
    if (!snap) return poly;

    const q = poly.map((p) => ({ x: p.x, y: p.y }));
    for (let i = 0; i < q.length; i++) {
      const a = q[i],
        b = q[(i + 1) % q.length];
      if (Math.abs(a.y - b.y) <= snap) {
        const y = (a.y + b.y) / 2;
        a.y = y;
        b.y = y;
      }
      if (Math.abs(a.x - b.x) <= snap) {
        const x = (a.x + b.x) / 2;
        a.x = x;
        b.x = x;
      }
    }
    return q.map((p) => ({
      x: Math.round(p.x * 10) / 10,
      y: Math.round(p.y * 10) / 10,
    }));
  }

  // ============================================================
  // 4. 픽셀 경계 추적 / 다각형 생성
  // ============================================================
  function boundaryCellsFromCells(cells) {
    const set = new Set(cells);
    const out = [];
    for (const idx of cells) {
      const x = idx % W,
        y = (idx / W) | 0;
      const isBoundary =
        x <= 0 ||
        y <= 0 ||
        x >= W - 1 ||
        y >= H - 1 ||
        !set.has(idx - 1) ||
        !set.has(idx + 1) ||
        !set.has(idx - W) ||
        !set.has(idx + W);
      if (isBoundary) out.push(idx);
    }
    return out;
  }

  function traceBoundaryByPoints(cells) {
    const cellSet = new Set(cells);
    const boundarySet = new Set();

    function hasCell(x, y) {
      if (x < 0 || y < 0 || x >= W || y >= H) return false;
      return cellSet.has(y * W + x);
    }

    for (const idx of cells) {
      const x = idx % W,
        y = (idx / W) | 0;
      if (
        !hasCell(x + 1, y) ||
        !hasCell(x - 1, y) ||
        !hasCell(x, y + 1) ||
        !hasCell(x, y - 1)
      ) {
        boundarySet.add(idx);
      }
    }

    if (!boundarySet.size) return [];

    // 시작점: 가장 위쪽, 그중 가장 왼쪽 경계점
    let start = null;
    for (const idx of boundarySet) {
      const x = idx % W,
        y = (idx / W) | 0;
      if (start == null) {
        start = idx;
      } else {
        const sx = start % W,
          sy = (start / W) | 0;
        if (y < sy || (y === sy && x < sx)) start = idx;
      }
    }

    // Moore neighbor tracing.
    // 회색 경계점들을 "순서대로" 따라가서 점 배열을 만든다.
    const dirs = [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
      { x: -1, y: 1 },
      { x: -1, y: 0 },
      { x: -1, y: -1 },
      { x: 0, y: -1 },
      { x: 1, y: -1 },
    ];

    const contour = [];
    let current = start;
    let prevDir = 4; // 시작점의 왼쪽에서 들어온 것으로 가정
    const maxSteps = Math.max(2000, boundarySet.size * 8);
    const visitedCount = new Map();

    for (let step = 0; step < maxSteps; step++) {
      const cx = current % W,
        cy = (current / W) | 0;
      contour.push({ x: cx + 0.5, y: cy + 0.5 });

      const key = current;
      visitedCount.set(key, (visitedCount.get(key) || 0) + 1);

      let found = null,
        foundDir = -1;

      // 이전 방향 기준으로 뒤쪽부터 시계 방향 탐색.
      // 이렇게 해야 점들이 선처럼 이어지고 면으로 닫힌다.
      const startDir = (prevDir + 5) % 8;
      for (let i = 0; i < 8; i++) {
        const dir = (startDir + i) % 8;
        const nx = cx + dirs[dir].x,
          ny = cy + dirs[dir].y;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const ni = ny * W + nx;
        if (boundarySet.has(ni)) {
          found = ni;
          foundDir = dir;
          break;
        }
      }

      if (found == null) break;

      // 한 바퀴 닫힘
      if (found === start && contour.length > 8) break;

      // 같은 점을 너무 많이 돌면 복잡한 경계로 보고 중단
      if ((visitedCount.get(found) || 0) > 3) break;

      current = found;
      prevDir = (foundDir + 4) % 8;
    }

    if (contour.length < 3) return [];
    return contour;
  }

  function normalizeBoundaryPoints(points) {
    if (!points || points.length < 3) return points || [];

    // 중복/너무 가까운 점 제거
    const minEdge = +$("minEdgeLen")?.value || 4;
    const cleaned = [];
    for (const p of points) {
      const last = cleaned[cleaned.length - 1];
      if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= 1.5) {
        cleaned.push({ x: p.x, y: p.y });
      }
    }

    if (cleaned.length > 2) {
      const a = cleaned[0],
        b = cleaned[cleaned.length - 1];
      if (Math.hypot(a.x - b.x, a.y - b.y) < 1.5) cleaned.pop();
    }

    let eps = +$("buttonSimplify")?.value || 5;
    let poly = rdp(cleaned.concat([cleaned[0]]), eps).slice(0, -1);

    // 너무 짧은 변 / 거의 일직선인 점 제거
    poly = removeShortAndCollinear(poly);

    // 최대 꼭짓점 제한. 단, 원본 형태를 살리기 위해 각도가 큰 점 위주로 남김
    poly = limitPolygonPoints(poly);

    // 수평/수직에 가까운 선은 스냅
    poly = straightenNgon(poly, $("buttonSnap")?.value || 0);

    // 최종적으로 시계/반시계 방향으로 정렬 상태 유지
    if (poly.length >= 3 && Math.abs(polygonArea(poly)) < 4) {
      return cleaned.length >= 3 ? cleaned : poly;
    }

    return poly;
  }

  function contourLoopsFromCells(cells) {
    const cellSet = new Set(cells);
    const edges = [];

    function has(x, y) {
      return cellSet.has(y * W + x);
    }

    function addEdge(ax, ay, bx, by) {
      edges.push({ a: { x: ax, y: ay }, b: { x: bx, y: by } });
    }

    for (const idx of cells) {
      const x = idx % W;
      const y = (idx / W) | 0;

      if (!has(x, y - 1)) addEdge(x, y, x + 1, y); // top
      if (!has(x + 1, y)) addEdge(x + 1, y, x + 1, y + 1); // right
      if (!has(x, y + 1)) addEdge(x + 1, y + 1, x, y + 1); // bottom
      if (!has(x - 1, y)) addEdge(x, y + 1, x, y); // left
    }

    if (!edges.length) return [];

    const nextMap = new Map();
    const key = (p) => `${p.x},${p.y}`;
    edges.forEach((e, i) => {
      const k = key(e.a);
      if (!nextMap.has(k)) nextMap.set(k, []);
      nextMap.get(k).push(i);
    });

    const used = new Set();
    const loops = [];

    for (let i = 0; i < edges.length; i++) {
      if (used.has(i)) continue;

      const loop = [];
      let ei = i;
      let guard = 0;

      while (!used.has(ei) && guard++ < edges.length + 10) {
        used.add(ei);
        const e = edges[ei];
        if (!loop.length) loop.push({ x: e.a.x, y: e.a.y });
        loop.push({ x: e.b.x, y: e.b.y });

        const nextCandidates = nextMap.get(key(e.b)) || [];
        let nextIdx = -1;
        for (const ci of nextCandidates) {
          if (!used.has(ci)) {
            nextIdx = ci;
            break;
          }
        }
        if (nextIdx === -1) break;
        ei = nextIdx;

        const first = loop[0],
          last = loop[loop.length - 1];
        if (last.x === first.x && last.y === first.y) break;
      }

      if (loop.length >= 4) {
        const first = loop[0],
          last = loop[loop.length - 1];
        if (first.x === last.x && first.y === last.y) loop.pop();
        loops.push(loop);
      }
    }

    return loops;
  }

  function polygonFromBoundaryPoints(component) {
    const loops = contourLoopsFromCells(component.cells);

    if (loops.length) {
      const best = loops
        .map((loop) => ({ loop, area: Math.abs(polygonArea(loop)) }))
        .sort((a, b) => b.area - a.area)[0];

      if (best && best.loop && best.loop.length >= 3) {
        const poly = normalizeBoundaryPoints(best.loop);
        if (poly && poly.length >= 3) return poly;
      }
    }

    const boundaryPoints = traceBoundaryByPoints(component.cells);
    if (boundaryPoints.length >= 3) {
      const poly = normalizeBoundaryPoints(boundaryPoints);
      if (poly && poly.length >= 3) return poly;
    }

    return polygonFromCells(component.cells, component.bbox);
  }

  function ngonFromComponent(component) {
    // 핵심:
    // 회색 픽셀 덩어리의 경계점들을 이어 외곽 면을 만든다.
    const poly = polygonFromBoundaryPoints(component);
    return poly && poly.length >= 3
      ? poly
      : polygonFromCells(component.cells, component.bbox);
  }

  function quadFromComponent(component, guidePoly) {
    // 이름은 기존 이벤트와 호환을 위해 유지하지만, 실제로는 n각형 버튼을 생성한다.
    return ngonFromComponent(component);
  }

  function removeShortAndCollinear(poly) {
    if (!poly || poly.length < 3) return poly || [];
    const minLen = +($("minEdgeLen")?.value || 4);

    // 1) 너무 가까운 점 제거
    let out = [];
    for (const p of poly) {
      const last = out[out.length - 1];
      if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= minLen) {
        out.push({ x: p.x, y: p.y });
      }
    }
    if (out.length >= 3) {
      const first = out[0],
        last = out[out.length - 1];
      if (Math.hypot(first.x - last.x, first.y - last.y) < minLen) out.pop();
    }
    if (out.length < 3) out = poly.map((p) => ({ x: p.x, y: p.y }));

    // 2) 거의 일직선인 중간점 제거
    let changed = true;
    let guard = 0;
    while (changed && guard++ < 5 && out.length > 3) {
      changed = false;
      const next = [];
      for (let i = 0; i < out.length; i++) {
        const a = out[(i - 1 + out.length) % out.length];
        const b = out[i];
        const c = out[(i + 1) % out.length];

        const ab = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const bc = Math.hypot(c.x - b.x, c.y - b.y) || 1;
        const cross = Math.abs(
          (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x),
        );
        const straightness = cross / (ab + bc);

        if (
          straightness < 0.65 &&
          Math.hypot(c.x - a.x, c.y - a.y) > minLen * 2
        ) {
          changed = true;
          continue;
        }
        next.push(b);
      }
      if (next.length >= 3) out = next;
    }

    return out.map((p) => ({
      x: Math.round(p.x * 10) / 10,
      y: Math.round(p.y * 10) / 10,
    }));
  }

  function limitPolygonPoints(poly) {
    if (!poly || poly.length < 3) return poly || [];
    const maxPts = +($("maxButtonPoints")?.value || 12);
    if (poly.length <= maxPts) return poly;

    let eps = +($("buttonSimplify")?.value || 5);
    let out = poly;

    for (let i = 0; i < 8 && out.length > maxPts; i++) {
      out = rdp(poly.concat([poly[0]]), eps).slice(0, -1);
      eps *= 1.35;
    }

    if (out.length > maxPts) {
      const scored = out.map((p, i) => {
        const a = out[(i - 1 + out.length) % out.length];
        const c = out[(i + 1) % out.length];
        const v1 = { x: a.x - p.x, y: a.y - p.y };
        const v2 = { x: c.x - p.x, y: c.y - p.y };
        const dot = v1.x * v2.x + v1.y * v2.y;
        const len = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y) || 1;
        const angle = Math.acos(Math.max(-1, Math.min(1, dot / len)));
        return { p, i, score: Math.abs(Math.PI - angle) };
      });

      out = scored
        .sort((a, b) => b.score - a.score)
        .slice(0, maxPts)
        .sort((a, b) => a.i - b.i)
        .map((v) => v.p);
    }

    return out.length >= 3 ? out : poly;
  }

  // ============================================================
  // 5. 회색 도형 감지 / 구역 면 생성
  // ============================================================
  function isGrayButtonPixel(data, idx) {
    const c = getPixel(data, idx);

    if (c.a < 20) return false;

    const shape = hexToRgb(getStage2ShapeColor());
    const bg = hexToRgb(getStage2BackgroundColor());

    if (dist(c, bg) < 28) return false;
    return dist(c, shape) <= 54;
  }

  function grayCellsInsideSection(sec) {
    if (!sec || !sec.polygon || sec.polygon.length < 3) return [];

    const data = cleanCtx.getImageData(0, 0, W, H).data;
    const b = bboxOf(sec.polygon);

    const minX = Math.max(0, Math.floor(b.x) - 1);
    const maxX = Math.min(W - 1, Math.ceil(b.x + b.w) + 1);
    const minY = Math.max(0, Math.floor(b.y) - 1);
    const maxY = Math.min(H - 1, Math.ceil(b.y + b.h) + 1);

    const cells = [];

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        // 파트1 점선 구역은 "검사 범위"로만 사용한다.
        if (!pointInPoly({ x: x + 0.5, y: y + 0.5 }, sec.polygon)) continue;

        const idx = y * W + x;
        if (isGrayButtonPixel(data, idx)) {
          cells.push(idx);
        }
      }
    }

    return cells;
  }

  function componentsFromCells(cells) {
    if (!cells || !cells.length) return [];

    const cellSet = new Set(cells);
    const visited = new Set();
    const comps = [];

    for (const start of cells) {
      if (visited.has(start)) continue;

      const q = [start];
      const comp = [];
      let head = 0;
      let minX = start % W,
        maxX = minX;
      let minY = (start / W) | 0,
        maxY = minY;

      visited.add(start);

      while (head < q.length) {
        const n = q[head++];
        const x = n % W;
        const y = (n / W) | 0;

        comp.push(n);

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        const neighbors = [n - 1, n + 1, n - W, n + W];
        for (const ni of neighbors) {
          if (!cellSet.has(ni) || visited.has(ni)) continue;
          visited.add(ni);
          q.push(ni);
        }
      }

      if (comp.length >= 8) {
        comps.push({
          cells: comp,
          bbox: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
        });
      }
    }

    return comps.sort((a, b) => b.cells.length - a.cells.length);
  }

  function polygonCenterDistance(poly, p) {
    const c = polyCenter(poly);
    return Math.hypot(c.x - p.x, c.y - p.y);
  }

  function chooseComponentForSection(sec, comps) {
    if (!comps.length) return null;
    if (comps.length === 1) return comps[0];

    const center = polyCenter(sec.polygon);

    // 구역 안에 여러 회색 덩어리가 들어오면
    // 1) 면적이 너무 작은 잡음은 제외
    // 2) 구역 중심과 가까운 큰 덩어리를 우선
    const maxArea = comps[0].cells.length;
    const candidates = comps.filter(
      (c) => c.cells.length >= Math.max(8, maxArea * 0.18),
    );

    candidates.sort((a, b) => {
      const ca = { x: a.bbox.x + a.bbox.w / 2, y: a.bbox.y + a.bbox.h / 2 };
      const cb = { x: b.bbox.x + b.bbox.w / 2, y: b.bbox.y + b.bbox.h / 2 };
      const da = Math.hypot(ca.x - center.x, ca.y - center.y);
      const db = Math.hypot(cb.x - center.x, cb.y - center.y);

      // 면적이 비슷하면 중심 가까운 것
      const areaRatio =
        Math.abs(a.cells.length - b.cells.length) /
        Math.max(a.cells.length, b.cells.length);
      if (areaRatio < 0.35) return da - db;

      return b.cells.length - a.cells.length;
    });

    return candidates[0] || comps[0];
  }

  function edgeLoopsFromCells(cells) {
    const cellSet = new Set(cells);
    const edgeMap = new Map();
    const used = new Set();
    const edges = [];

    function has(x, y) {
      return x >= 0 && y >= 0 && x < W && y < H && cellSet.has(y * W + x);
    }

    function key(p) {
      return p.x + "," + p.y;
    }

    function addEdge(ax, ay, bx, by) {
      const e = { a: { x: ax, y: ay }, b: { x: bx, y: by } };
      const id = edges.length;
      edges.push(e);
      const k = key(e.a);
      if (!edgeMap.has(k)) edgeMap.set(k, []);
      edgeMap.get(k).push(id);
    }

    for (const idx of cells) {
      const x = idx % W;
      const y = (idx / W) | 0;

      // 방향은 채워진 회색 셀이 항상 선의 오른쪽에 오도록 둔다.
      if (!has(x, y - 1)) addEdge(x, y, x + 1, y); // top
      if (!has(x + 1, y)) addEdge(x + 1, y, x + 1, y + 1); // right
      if (!has(x, y + 1)) addEdge(x + 1, y + 1, x, y + 1); // bottom
      if (!has(x - 1, y)) addEdge(x, y + 1, x, y); // left
    }

    function turnScore(prev, next) {
      const v1 = { x: prev.b.x - prev.a.x, y: prev.b.y - prev.a.y };
      const v2 = { x: next.b.x - next.a.x, y: next.b.y - next.a.y };
      const a1 = Math.atan2(v1.y, v1.x);
      const a2 = Math.atan2(v2.y, v2.x);
      let d = a2 - a1;
      while (d <= -Math.PI) d += Math.PI * 2;
      while (d > Math.PI) d -= Math.PI * 2;

      // 외곽을 자연스럽게 따라가도록 급격한 역회전보다 직진/우회전 우선
      return Math.abs(d - Math.PI / 2) * 0.35 + Math.abs(d) * 0.65;
    }

    const loops = [];

    for (let i = 0; i < edges.length; i++) {
      if (used.has(i)) continue;

      const loop = [];
      let current = i;
      let guard = 0;

      while (!used.has(current) && guard++ < edges.length + 10) {
        used.add(current);

        const e = edges[current];
        if (!loop.length) loop.push({ x: e.a.x, y: e.a.y });
        loop.push({ x: e.b.x, y: e.b.y });

        const first = loop[0];
        const last = loop[loop.length - 1];
        if (loop.length > 3 && first.x === last.x && first.y === last.y) {
          loop.pop();
          break;
        }

        const candidates = (edgeMap.get(key(e.b)) || []).filter(
          (id) => !used.has(id),
        );
        if (!candidates.length) break;

        candidates.sort(
          (ia, ib) => turnScore(e, edges[ia]) - turnScore(e, edges[ib]),
        );
        current = candidates[0];
      }

      if (loop.length >= 3) {
        loops.push(loop);
      }
    }

    return loops;
  }

  function pointSegmentDistance(p, a, b) {
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const len2 = vx * vx + vy * vy;

    if (!len2) return Math.hypot(p.x - a.x, p.y - a.y);

    let t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2;
    t = Math.max(0, Math.min(1, t));

    return Math.hypot(p.x - (a.x + vx * t), p.y - (a.y + vy * t));
  }

  function pointNearPolygonEdge(p, poly, tolerance) {
    if (!poly || poly.length < 2) return false;

    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      if (pointSegmentDistance(p, a, b) <= tolerance) return true;
    }

    return false;
  }

  function pointInsideOrNearPoly(p, poly, tolerance) {
    return pointInPoly(p, poly) || pointNearPolygonEdge(p, poly, tolerance);
  }

  function cleanAdjacentPoints(poly, minDistance = 0.75) {
    if (!poly || poly.length < 3) return poly || [];

    const out = [];

    poly.forEach((p) => {
      const q = { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 };
      const last = out[out.length - 1];

      if (!last || Math.hypot(q.x - last.x, q.y - last.y) >= minDistance) {
        out.push(q);
      }
    });

    if (out.length > 2) {
      const first = out[0];
      const last = out[out.length - 1];
      if (Math.hypot(first.x - last.x, first.y - last.y) < minDistance) out.pop();
    }

    return out.length >= 3 ? out : poly.map((p) => ({ x: p.x, y: p.y }));
  }

  function cornerAngle(a, b, c) {
    const v1x = a.x - b.x;
    const v1y = a.y - b.y;
    const v2x = c.x - b.x;
    const v2y = c.y - b.y;
    const len = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y) || 1;
    const dot = v1x * v2x + v1y * v2y;
    return Math.acos(Math.max(-1, Math.min(1, dot / len)));
  }

  function removeTinyEdges(poly, minLen = 5) {
    if (!poly || poly.length < 3) return poly || [];

    let out = cleanAdjacentPoints(poly);
    let changed = true;
    let guard = 0;

    while (changed && guard++ < 8 && out.length > 3) {
      changed = false;
      const next = [];

      for (let i = 0; i < out.length; i++) {
        const prev = out[(i - 1 + out.length) % out.length];
        const cur = out[i];
        const nxt = out[(i + 1) % out.length];
        const d1 = Math.hypot(cur.x - prev.x, cur.y - prev.y);
        const d2 = Math.hypot(nxt.x - cur.x, nxt.y - cur.y);
        const angle = cornerAngle(prev, cur, nxt);
        const almostStraight = angle > Math.PI * 0.82;
        const almostDuplicate = Math.hypot(nxt.x - prev.x, nxt.y - prev.y) < minLen * 0.8;

        if ((d1 < minLen || d2 < minLen) && (almostStraight || almostDuplicate) && out.length - next.length > 3) {
          changed = true;
          continue;
        }

        next.push(cur);
      }

      if (next.length >= 3) out = next;
    }

    return out;
  }

  function removeAlmostStraightPoints(poly, tolerance = 0.9) {
    if (!poly || poly.length < 4) return poly || [];

    let out = cleanAdjacentPoints(poly);
    let changed = true;
    let guard = 0;

    while (changed && guard++ < 8 && out.length > 3) {
      changed = false;
      const next = [];

      for (let i = 0; i < out.length; i++) {
        const a = out[(i - 1 + out.length) % out.length];
        const b = out[i];
        const c = out[(i + 1) % out.length];
        const ab = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const bc = Math.hypot(c.x - b.x, c.y - b.y) || 1;
        const cross = Math.abs((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x));
        const straightness = cross / (ab + bc);
        const angle = cornerAngle(a, b, c);
        const sharpCorner = angle < Math.PI * 0.65;

        if (!sharpCorner && straightness < tolerance && Math.hypot(c.x - a.x, c.y - a.y) > 4) {
          changed = true;
          continue;
        }

        next.push(b);
      }

      if (next.length >= 3) out = next;
    }

    return out;
  }

  function smartStraightenEdges(poly) {
    if (!poly || poly.length < 3) return poly || [];

    const out = poly.map((p) => ({ x: p.x, y: p.y }));

    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < out.length; i++) {
        const a = out[i];
        const b = out[(i + 1) % out.length];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy);

        if (len < 8) continue;

        const limit = Math.max(1.25, Math.min(6, len * 0.075));

        if (Math.abs(dy) <= limit) {
          const y = (a.y + b.y) / 2;
          a.y = y;
          b.y = y;
        } else if (Math.abs(dx) <= limit) {
          const x = (a.x + b.x) / 2;
          a.x = x;
          b.x = x;
        }
      }
    }

    return out.map((p) => ({
      x: Math.round(p.x * 10) / 10,
      y: Math.round(p.y * 10) / 10,
    }));
  }

  function orientation(a, b, c) {
    const v = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
    if (Math.abs(v) < 0.0001) return 0;
    return v > 0 ? 1 : 2;
  }

  function onSegment(a, b, c) {
    return (
      Math.min(a.x, c.x) - 0.0001 <= b.x && b.x <= Math.max(a.x, c.x) + 0.0001 &&
      Math.min(a.y, c.y) - 0.0001 <= b.y && b.y <= Math.max(a.y, c.y) + 0.0001
    );
  }

  function segmentsIntersect(p1, q1, p2, q2) {
    const o1 = orientation(p1, q1, p2);
    const o2 = orientation(p1, q1, q2);
    const o3 = orientation(p2, q2, p1);
    const o4 = orientation(p2, q2, q1);

    if (o1 !== o2 && o3 !== o4) return true;
    if (o1 === 0 && onSegment(p1, p2, q1)) return true;
    if (o2 === 0 && onSegment(p1, q2, q1)) return true;
    if (o3 === 0 && onSegment(p2, p1, q2)) return true;
    if (o4 === 0 && onSegment(p2, q1, q2)) return true;

    return false;
  }

  function hasSelfIntersection(poly) {
    if (!poly || poly.length < 4) return false;

    for (let i = 0; i < poly.length; i++) {
      const a1 = poly[i];
      const a2 = poly[(i + 1) % poly.length];

      for (let j = i + 1; j < poly.length; j++) {
        if (Math.abs(i - j) <= 1) continue;
        if (i === 0 && j === poly.length - 1) continue;

        const b1 = poly[j];
        const b2 = poly[(j + 1) % poly.length];
        if (segmentsIntersect(a1, a2, b1, b2)) return true;
      }
    }

    return false;
  }

  function samplePolygonEdges(poly, perEdge = 2) {
    const samples = [];
    if (!poly || poly.length < 3) return samples;

    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      samples.push(a);

      for (let step = 1; step <= perEdge; step++) {
        const t = step / (perEdge + 1);
        samples.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }

    return samples;
  }

  function shapeSimilarityOk(original, cleaned, tolerance) {
    if (!original || !cleaned || original.length < 3 || cleaned.length < 3) return false;
    if (hasSelfIntersection(cleaned)) return false;

    const originalArea = polygonArea(original) || 1;
    const cleanedArea = polygonArea(cleaned) || 1;
    const areaRatio = cleanedArea / originalArea;

    if (areaRatio < 0.45 || areaRatio > 1.85) return false;

    const ob = bboxOf(original);
    const cb = bboxOf(cleaned);
    const diag = Math.hypot(ob.w, ob.h) || 1;
    const centerShift = Math.hypot((ob.x + ob.w / 2) - (cb.x + cb.w / 2), (ob.y + ob.h / 2) - (cb.y + cb.h / 2));

    if (centerShift > diag * 0.13) return false;
    if (cb.w < ob.w * 0.62 || cb.w > ob.w * 1.28) return false;
    if (cb.h < ob.h * 0.62 || cb.h > ob.h * 1.28) return false;

    const cleanedSamples = samplePolygonEdges(cleaned, 2);
    const originalSamples = samplePolygonEdges(original, 1);

    const cleanedInside = cleanedSamples.filter((p) => pointInsideOrNearPoly(p, original, tolerance)).length / Math.max(1, cleanedSamples.length);
    const originalInside = originalSamples.filter((p) => pointInsideOrNearPoly(p, cleaned, tolerance)).length / Math.max(1, originalSamples.length);

    return cleanedInside >= 0.64 && originalInside >= 0.64;
  }

  function lineFromCleanEdge(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const limit = Math.max(1.2, Math.min(7, len * 0.08));

    if (Math.abs(dy) <= limit) {
      return { type: "h", y: (a.y + b.y) / 2 };
    }

    if (Math.abs(dx) <= limit) {
      return { type: "v", x: (a.x + b.x) / 2 };
    }

    const A = dy;
    const B = -dx;
    const C = A * a.x + B * a.y;
    return { type: "g", A, B, C };
  }

  function intersectCleanLines(l1, l2, fallback) {
    if (!l1 || !l2) return fallback;

    if (l1.type === "h" && l2.type === "v") return { x: l2.x, y: l1.y };
    if (l1.type === "v" && l2.type === "h") return { x: l1.x, y: l2.y };

    if (l1.type === "h" && l2.type === "g") {
      if (Math.abs(l2.A) < 0.0001) return fallback;
      return { x: (l2.C - l2.B * l1.y) / l2.A, y: l1.y };
    }

    if (l1.type === "g" && l2.type === "h") {
      if (Math.abs(l1.A) < 0.0001) return fallback;
      return { x: (l1.C - l1.B * l2.y) / l1.A, y: l2.y };
    }

    if (l1.type === "v" && l2.type === "g") {
      if (Math.abs(l2.B) < 0.0001) return fallback;
      return { x: l1.x, y: (l2.C - l2.A * l1.x) / l2.B };
    }

    if (l1.type === "g" && l2.type === "v") {
      if (Math.abs(l1.B) < 0.0001) return fallback;
      return { x: l2.x, y: (l1.C - l1.A * l2.x) / l1.B };
    }

    if (l1.type === "h" && l2.type === "h") return fallback;
    if (l1.type === "v" && l2.type === "v") return fallback;

    const det = l1.A * l2.B - l2.A * l1.B;
    if (Math.abs(det) < 0.0001) return fallback;

    return {
      x: (l1.C * l2.B - l2.C * l1.B) / det,
      y: (l1.A * l2.C - l2.A * l1.C) / det,
    };
  }

  function rebuildCornersFromGrayLines(poly, reference, tolerance) {
    if (!poly || poly.length < 3) return poly || [];

    const n = poly.length;
    const lines = [];
    const b = bboxOf(reference || poly);
    const limit = Math.max(6, Math.min(24, Math.hypot(b.w, b.h) * 0.045));

    for (let i = 0; i < n; i++) {
      lines.push(lineFromCleanEdge(poly[i], poly[(i + 1) % n]));
    }

    const refined = [];

    for (let i = 0; i < n; i++) {
      const prevLine = lines[(i - 1 + n) % n];
      const nextLine = lines[i];
      const fallback = poly[i];
      const p = intersectCleanLines(prevLine, nextLine, fallback);

      if (
        !Number.isFinite(p.x) ||
        !Number.isFinite(p.y) ||
        Math.hypot(p.x - fallback.x, p.y - fallback.y) > limit
      ) {
        refined.push({ x: fallback.x, y: fallback.y });
      } else {
        refined.push({ x: p.x, y: p.y });
      }
    }

    const out = cleanAdjacentPoints(refined, 0.75).map((p) => ({
      x: Math.round(p.x * 10) / 10,
      y: Math.round(p.y * 10) / 10,
    }));

    if (out.length < 3 || hasSelfIntersection(out)) return poly;
    if (reference && !shapeSimilarityOk(reference, out, tolerance)) return poly;

    return out;
  }

  function dominantLineOfEdge(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const axisLimit = Math.max(1.5, Math.min(10, len * 0.18));

    if (absDy <= axisLimit) {
      return { type: "h", y: (a.y + b.y) / 2 };
    }

    if (absDx <= axisLimit) {
      return { type: "v", x: (a.x + b.x) / 2 };
    }

    return lineFromCleanEdge(a, b);
  }

  function faceCandidateOk(reference, candidate, tolerance) {
    if (!reference || !candidate || reference.length < 3 || candidate.length < 3) return false;
    if (hasSelfIntersection(candidate)) return false;

    const refArea = Math.abs(polygonArea(reference)) || 1;
    const candArea = Math.abs(polygonArea(candidate)) || 1;
    const ratio = candArea / refArea;

    if (ratio < 0.62 || ratio > 1.48) return false;

    const rb = bboxOf(reference);
    const cb = bboxOf(candidate);
    const diag = Math.hypot(rb.w, rb.h) || 1;
    const pad = Math.max(tolerance * 1.6, diag * 0.035, 3);

    if (cb.x < rb.x - pad) return false;
    if (cb.y < rb.y - pad) return false;
    if (cb.x + cb.w > rb.x + rb.w + pad) return false;
    if (cb.y + cb.h > rb.y + rb.h + pad) return false;
    if (cb.w < rb.w * 0.45 || cb.w > rb.w * 1.28) return false;
    if (cb.h < rb.h * 0.45 || cb.h > rb.h * 1.28) return false;

    const centerShift = Math.hypot(
      rb.x + rb.w / 2 - (cb.x + cb.w / 2),
      rb.y + rb.h / 2 - (cb.y + cb.h / 2),
    );

    if (centerShift > diag * 0.16) return false;

    return true;
  }

  function lineFitCorners(poly, reference, tolerance) {
    if (!poly || poly.length < 3) return poly || [];

    const n = poly.length;
    const lines = [];
    const b = bboxOf(reference || poly);
    const diag = Math.hypot(b.w, b.h) || 1;
    const moveLimit = Math.max(5, Math.min(32, diag * 0.075));

    for (let i = 0; i < n; i += 1) {
      lines.push(dominantLineOfEdge(poly[i], poly[(i + 1) % n]));
    }

    const refined = [];

    for (let i = 0; i < n; i += 1) {
      const fallback = poly[i];
      const p = intersectCleanLines(lines[(i - 1 + n) % n], lines[i], fallback);

      if (
        !Number.isFinite(p.x) ||
        !Number.isFinite(p.y) ||
        Math.hypot(p.x - fallback.x, p.y - fallback.y) > moveLimit
      ) {
        refined.push({ x: fallback.x, y: fallback.y });
      } else {
        refined.push({ x: p.x, y: p.y });
      }
    }

    const out = cleanAdjacentPoints(refined, 0.9).map((p) => ({
      x: Math.round(p.x * 10) / 10,
      y: Math.round(p.y * 10) / 10,
    }));

    if (out.length < 3 || hasSelfIntersection(out)) return poly;
    if (reference && !faceCandidateOk(reference, out, tolerance)) return poly;

    return out;
  }

  function removeSmallZigZagCorners(poly, minLen, straightTolerance) {
    if (!poly || poly.length < 4) return poly || [];

    let out = cleanAdjacentPoints(poly, 0.8);
    let changed = true;
    let guard = 0;

    while (changed && guard++ < 8 && out.length > 3) {
      changed = false;
      const next = [];

      for (let i = 0; i < out.length; i += 1) {
        const a = out[(i - 1 + out.length) % out.length];
        const b = out[i];
        const c = out[(i + 1) % out.length];
        const d = pointSegmentDistance(b, a, c);
        const ab = Math.hypot(b.x - a.x, b.y - a.y);
        const bc = Math.hypot(c.x - b.x, c.y - b.y);
        const ac = Math.hypot(c.x - a.x, c.y - a.y);

        const tinyLeg = Math.min(ab, bc) <= minLen;
        const weakBend = d <= straightTolerance;
        const nearlyDuplicate = ac <= minLen * 0.8;

        if ((tinyLeg && weakBend) || nearlyDuplicate) {
          changed = true;
          continue;
        }

        next.push(b);
      }

      if (next.length >= 3) out = next;
    }

    return out;
  }

  function simplifyContourToMeaningfulLines(loop) {
    if (!loop || loop.length < 3) return loop || [];

    const original = cleanAdjacentPoints(loop, 0.8);
    const b = bboxOf(original);
    const diag = Math.hypot(b.w, b.h) || 1;
    const tolerance = Math.max(4, Math.min(18, diag * 0.045));
    const minLen = Math.max(4, Math.min(18, diag * 0.045));
    const maxPts = Math.max(10, +($("maxButtonPoints")?.value || 18));

    const epsList = [
      diag * 0.100,
      diag * 0.082,
      diag * 0.066,
      diag * 0.052,
      diag * 0.040,
      diag * 0.030,
      diag * 0.022,
      2.4,
      1.6,
    ].map((v) => Math.max(1.2, Math.min(22, v)));

    let best = null;

    for (const eps of epsList) {
      let poly = rdp(original.concat([original[0]]), eps).slice(0, -1);
      poly = cleanAdjacentPoints(poly, 0.9);
      poly = removeSmallZigZagCorners(poly, minLen, Math.max(1.2, eps * 0.72));
      poly = removeTinyEdges(poly, Math.max(3, minLen * 0.75));
      poly = removeAlmostStraightPoints(poly, 0.9);
      poly = lineFitCorners(poly, original, tolerance);
      poly = removeSmallZigZagCorners(poly, minLen * 0.85, Math.max(0.9, eps * 0.52));
      poly = removeAlmostStraightPoints(poly, 0.54);
      poly = cleanAdjacentPoints(poly, 0.9).map((p) => ({
        x: Math.round(p.x * 10) / 10,
        y: Math.round(p.y * 10) / 10,
      }));

      if (!faceCandidateOk(original, poly, tolerance)) continue;

      if (!best || poly.length < best.length) best = poly;
      if (poly.length <= maxPts) return poly;
    }

    if (best && best.length >= 3) return best;

    let fallback = rdp(original.concat([original[0]]), Math.max(1.4, Math.min(6, diag * 0.018))).slice(0, -1);
    fallback = cleanAdjacentPoints(fallback, 0.9);
    fallback = removeSmallZigZagCorners(fallback, minLen * 0.65, Math.max(0.8, diag * 0.010));
    fallback = lineFitCorners(fallback, original, tolerance * 0.8);
    fallback = cleanAdjacentPoints(fallback, 0.9).map((p) => ({
      x: Math.round(p.x * 10) / 10,
      y: Math.round(p.y * 10) / 10,
    }));

    return fallback.length >= 3 ? fallback : original;
  }

  function autoCleanFacePolygon(loop) {
    return simplifyContourToMeaningfulLines(loop);
  }

  function simplifyGrayLoop(loop) {
    return autoCleanFacePolygon(loop);
  }

  function buildFaceFromSectionLines(sec) {
    if (!sec || !sec.polygon || sec.polygon.length < 3) return null;

    const original = cleanAdjacentPoints(sec.polygon, 0.75);
    const outer = autoCleanFacePolygon(original);

    if (!outer || outer.length < 3) return null;

    return {
      paths: [outer],
      outer,
      holes: [],
      source: "line-rebuild",
    };
  }

  function shapeFromGrayComponent(component) {
    const loops = edgeLoopsFromCells(component.cells);

    if (!loops.length) return null;

    const paths = loops
      .map((loop) => simplifyGrayLoop(loop))
      .filter((poly) => poly && poly.length >= 3)
      .map((poly) => ({ poly, area: Math.abs(polygonArea(poly)) }))
      .filter((x) => x.area >= 8)
      .sort((a, b) => b.area - a.area);

    if (!paths.length) return null;

    const outer = paths[0].poly;

    return {
      paths: [outer],
      outer,
      holes: [],
      source: "gray-line-fit",
    };
  }

  function faceFromGrayInsideSection(sec) {
    if (!sec || !sec.polygon || sec.polygon.length < 3) return null;

    const cells = grayCellsInsideSection(sec);
    const comps = componentsFromCells(cells);
    const component = chooseComponentForSection(sec, comps);

    if (!component) return null;

    const shape = shapeFromGrayComponent(component);
    if (!shape || !shape.outer || shape.outer.length < 3) return null;

    return shape;
  }

  function componentForSection(sec) {
    const cells = grayCellsInsideSection(sec);
    const comps = componentsFromCells(cells);
    return chooseComponentForSection(sec, comps);
  }

  function makeButtonForSection(sec) {
    const grayShape = faceFromGrayInsideSection(sec);
    const lineShape = grayShape ? null : buildFaceFromSectionLines(sec);
    const shape = grayShape || lineShape;

    if (!shape || !shape.outer || shape.outer.length < 3) {
      sec.buttonShape = null;
      sec.buttonPolygon = null;
      sec.faceReady = false;
      return false;
    }

    sec.buttonShape = shape;
    sec.buttonPolygon = shape.outer;
    sec.faceReady = true;
    return true;
  }

  function makeButtonsForAll() {
    if (!sections.length) {
      toast("먼저 파트1에서 자동 구역 분석을 하세요");
      return;
    }

    let count = 0;
    let fail = 0;

    sections.forEach((sec) => {
      sec.buttonShape = null;
      sec.buttonPolygon = null;
      sec.faceReady = false;

      if (makeButtonForSection(sec)) count++;
      else fail++;
    });

    if (!selectedId && sections[0]) selectedId = sections[0].id;
    renderAll();
    part3AutoNumberApplied = false;
    toast("전체 구역 면 자동 생성: " + count + "개 / 실패 " + fail + "개");
  }

  function hitButtonCorner(p) {
    if (part !== 3 || !selectedId) return null;
    const sec = getSelected();
    if (!sec || !sec.buttonPolygon) return null;
    const scale = parseFloat(base.style.width) / W || 1;
    const radius = 10 / scale;
    for (let i = 0; i < sec.buttonPolygon.length; i++) {
      const c = sec.buttonPolygon[i];
      if (Math.hypot(p.x - c.x, p.y - c.y) <= radius) return { sec, index: i };
    }
    return null;
  }

  function rdp(points, epsilon) {
    if (points.length <= 2) return points.slice();
    const dmaxObj = (() => {
      let dmax = 0,
        idx = 0;
      const start = points[0],
        end = points[points.length - 1];
      const len = Math.hypot(end.x - start.x, end.y - start.y) || 1;
      for (let i = 1; i < points.length - 1; i++) {
        const p = points[i];
        const d =
          Math.abs(
            (end.y - start.y) * p.x -
              (end.x - start.x) * p.y +
              end.x * start.y -
              end.y * start.x,
          ) / len;
        if (d > dmax) {
          idx = i;
          dmax = d;
        }
      }
      return { dmax, idx };
    })();
    if (dmaxObj.dmax > epsilon) {
      const left = rdp(points.slice(0, dmaxObj.idx + 1), epsilon);
      const right = rdp(points.slice(dmaxObj.idx), epsilon);
      return left.slice(0, -1).concat(right);
    }
    return [points[0], points[points.length - 1]];
  }

  function convexHull(points) {
    const pts = points
      .map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }))
      .sort((a, b) => a.x - b.x || a.y - b.y);
    const unique = [];
    for (const p of pts) {
      const last = unique[unique.length - 1];
      if (!last || last.x !== p.x || last.y !== p.y) unique.push(p);
    }
    if (unique.length <= 1) return unique;
    const cross = (o, a, b) =>
      (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower = [];
    for (const p of unique) {
      while (
        lower.length >= 2 &&
        cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
      )
        lower.pop();
      lower.push(p);
    }
    const upper = [];
    for (let i = unique.length - 1; i >= 0; i--) {
      const p = unique[i];
      while (
        upper.length >= 2 &&
        cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
      )
        upper.pop();
      upper.push(p);
    }
    return lower.slice(0, -1).concat(upper.slice(0, -1));
  }

  function snapPolygon(poly, snap) {
    if (!snap) return poly;
    const out = poly.map((p) => ({ x: p.x, y: p.y }));
    for (let i = 0; i < out.length; i++) {
      const a = out[i],
        b = out[(i + 1) % out.length];
      if (Math.abs(a.y - b.y) <= snap) {
        const y = (a.y + b.y) / 2;
        a.y = y;
        b.y = y;
      }
      if (Math.abs(a.x - b.x) <= snap) {
        const x = (a.x + b.x) / 2;
        a.x = x;
        b.x = x;
      }
    }
    return out;
  }

  function cleanupPolygon(poly) {
    let out = poly.map((p) => ({
      x: Math.round(p.x * 10) / 10,
      y: Math.round(p.y * 10) / 10,
    }));
    out = out.filter((p, i) => {
      const prev = out[(i - 1 + out.length) % out.length];
      return Math.hypot(p.x - prev.x, p.y - prev.y) > 2;
    });
    if (out.length < 3) return poly;
    return out;
  }

  function polygonFromCells(cells, bbox) {
    const loops = contourLoopsFromCells(cells);
    let poly = null;

    if (loops.length) {
      poly = loops
        .map((loop) => ({ loop, area: Math.abs(polygonArea(loop)) }))
        .sort((a, b) => b.area - a.area)[0].loop;
    }

    if (!poly || poly.length < 3) {
      const pointSet = [];
      const cellSet = new Set(cells);
      for (const idx of cells) {
        const x = idx % W,
          y = (idx / W) | 0;
        const boundary =
          x <= 0 ||
          y <= 0 ||
          x >= W - 1 ||
          y >= H - 1 ||
          !cellSet.has(idx - 1) ||
          !cellSet.has(idx + 1) ||
          !cellSet.has(idx - W) ||
          !cellSet.has(idx + W);
        if (boundary) {
          pointSet.push(
            { x, y },
            { x: x + 1, y },
            { x, y: y + 1 },
            { x: x + 1, y: y + 1 },
          );
        }
      }
      poly = pointSet.length ? convexHull(pointSet) : null;
    }

    const epsilon = +($("buttonSimplify")?.value || $("simplify")?.value || 5);
    const snap = +($("buttonSnap")?.value || $("snap")?.value || 0);
    if (poly && poly.length >= 3) {
      poly = rdp(poly.concat([poly[0]]), epsilon).slice(0, -1);
      poly = snapPolygon(poly, snap);
      poly = cleanupPolygon(poly);
    }

    if (!poly || poly.length < 3) {
      poly = [
        { x: bbox.x, y: bbox.y },
        { x: bbox.x + bbox.w, y: bbox.y },
        { x: bbox.x + bbox.w, y: bbox.y + bbox.h },
        { x: bbox.x, y: bbox.y + bbox.h },
      ];
    }
    return poly;
  }

  function getPixel(data, idx) {
    const k = idx * 4;
    return { r: data[k], g: data[k + 1], b: data[k + 2], a: data[k + 3] };
  }

  function isShapePixel(data, idx) {
    const shape = hexToRgb(getStage2ShapeColor());
    const bg = hexToRgb(getStage2BackgroundColor());
    const tol = +$("shapeTol")?.value || 34;
    const c = getPixel(data, idx);

    if (c.a < 20) return false;
    if (dist(c, bg) < tol + 6) return false;

    return dist(c, shape) <= tol;
  }

  function dominantSourceColor(cells, bbox) {
    const color = hexToRgb(STAGE2_SHAPE_COLOR);

    if (!colorGroups.length) {
      colorGroups.push({ id: 1, color });
    }

    return {
      color,
      rawColor: hexToRgb(getStage1ShapeColor()),
      group: 1,
      autoGray: true,
    };
  }

  function makeSection(cells, bbox, namePrefix = "구역") {
    const polygon = polygonFromCells(cells, bbox);
    const id = "sec" + nextId++;

    return {
      id,
      floor: "1",
      section: "",
      sectionName: "",
      name: namePrefix + " 미지정",
      label: "",
      grade: "일반석",
      price: 132000,
      sourceColor: STAGE2_SHAPE_COLOR,
      rawSourceColor: getStage1ShapeColor(),
      stage1ShapeColor: getStage1ShapeColor(),
      stage2ShapeColor: STAGE2_SHAPE_COLOR,
      backgroundColor: STAGE2_BACKGROUND_COLOR,
      autoGray: true,
      sourceGroup: 1,
      ruleKey: "stage2-gray-shape",
      renderColor: STAGE2_SHAPE_COLOR,
      polygon,
      bbox: bboxOf(polygon),
      area: polygonArea(polygon),
    };
  }

  // ============================================================
  // 6. 파트1: 구역 자동 분석 / 수동 추가
  // ============================================================
  function analyzeAll() {
    if (!cleanImageLoaded) {
      toast("Stage1 도면이 없습니다.");
      return;
    }
    const data = cleanCtx.getImageData(0, 0, W, H).data;
    const seen = new Uint8Array(W * H);
    const minArea = +$("minArea").value || 120;
    const found = [];
    colorGroups = [];

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const start = y * W + x;
        if (seen[start] || !isShapePixel(data, start)) continue;
        const q = [start],
          cells = [];
        let head = 0,
          minX = x,
          maxX = x,
          minY = y,
          maxY = y;
        seen[start] = 1;
        while (head < q.length) {
          const n = q[head++],
            nx = n % W,
            ny = (n / W) | 0;
          cells.push(n);
          if (nx < minX) minX = nx;
          if (nx > maxX) maxX = nx;
          if (ny < minY) minY = ny;
          if (ny > maxY) maxY = ny;
          [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ].forEach(([dx, dy]) => {
            const xx = nx + dx,
              yy = ny + dy;
            if (xx < 0 || yy < 0 || xx >= W || yy >= H) return;
            const ni = yy * W + xx;
            if (!seen[ni] && isShapePixel(data, ni)) {
              seen[ni] = 1;
              q.push(ni);
            }
          });
        }
        const bw = maxX - minX + 1,
          bh = maxY - minY + 1;
        if (cells.length >= minArea && bw >= 5 && bh >= 5) {
          found.push({ cells, bbox: { x: minX, y: minY, w: bw, h: bh } });
        }
      }
    }

    sections = found
      .sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x)
      .map((c) => makeSection(c.cells, c.bbox, "구역"));

    normalizeAllSections();
    assignGroupSectionNumbers(false, false);

    selectedId = sections[0]?.id || null;
    fillForm(getSelected());
    renderAll();
    toast("자동 분석 완료: " + sections.length + "개 구역 · 클릭 선택 / Shift+클릭 합치기 / 빈 곳 드래그 추가");
  }

  function findComponentAt(p) {
    const data = cleanCtx.getImageData(0, 0, W, H).data;
    let sx = Math.round(p.x),
      sy = Math.round(p.y),
      found = null;
    const radius = 10;
    for (let r = 0; r <= radius && !found; r++) {
      for (let dy = -r; dy <= r && !found; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const x = sx + dx,
            y = sy + dy;
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const idx = y * W + x;
          if (isShapePixel(data, idx)) {
            found = idx;
            break;
          }
        }
      }
    }
    if (found == null) return null;

    const seen = new Uint8Array(W * H);
    const q = [found],
      cells = [];
    let head = 0,
      minX = found % W,
      maxX = found % W,
      minY = (found / W) | 0,
      maxY = (found / W) | 0;
    seen[found] = 1;
    while (head < q.length) {
      const n = q[head++],
        nx = n % W,
        ny = (n / W) | 0;
      cells.push(n);
      if (nx < minX) minX = nx;
      if (nx > maxX) maxX = nx;
      if (ny < minY) minY = ny;
      if (ny > maxY) maxY = ny;
      [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].forEach(([dx, dy]) => {
        const xx = nx + dx,
          yy = ny + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) return;
        const ni = yy * W + xx;
        if (!seen[ni] && isShapePixel(data, ni)) {
          seen[ni] = 1;
          q.push(ni);
        }
      });
    }
    if (cells.length < 8) return null;
    return {
      cells,
      bbox: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
    };
  }

  // ============================================================
  // 7. 구역별 번호 지정 / 구역 정보 적용
  // ============================================================
  function rawSectionGroupKey(sec) {
    if (!sec) return "group-unknown";
    if (sec.sourceGroup) return "source-" + sec.sourceGroup;
    if (sec.ruleKey) return String(sec.ruleKey);
    if (sec.sourceColor) return "source-color-" + String(sec.sourceColor).toLowerCase();
    return "color-" + String(sec.renderColor || "#d9d9d9").toLowerCase();
  }

  function sectionGroupKey(sec) {
    const key = rawSectionGroupKey(sec);
    sec.sectionGroupKey = key;
    return key;
  }

  function sectionGroupNameFromKey(key, sampleSec) {
    if (sampleSec && sampleSec.sourceGroup) return "색상 그룹 " + sampleSec.sourceGroup;
    const groups = getSectionGroups(false);
    const index = groups.findIndex((g) => g.key === key);
    return "색상 그룹 " + (index >= 0 ? index + 1 : "-");
  }

  function ruleKeyForSection(sec) {
    if (!sec) return "";
    if (!sec.ruleKey) {
      sec.ruleKey = rawSectionGroupKey(sec);
    }
    return sec.ruleKey;
  }

  function getSelected() {
    return sections.find((s) => s.id === selectedId);
  }

  function sectionCenter(sec) {
    return polyCenter(sec.buttonPolygon || sec.polygon);
  }

  function getSectionGroups(normalize = true) {
    const map = new Map();

    sections.forEach((sec) => {
      if (normalize) normalizeSectionInfo(sec, sections.indexOf(sec));
      const key = rawSectionGroupKey(sec);
      if (!map.has(key)) {
        const sourceNo = parseInt(String(sec.sourceGroup || "0"), 10) || 0;
        map.set(key, {
          key,
          sourceNo,
          color: sec.renderColor || sec.sourceColor || "#d9d9d9",
          label: sourceNo ? "색상 그룹 " + sourceNo : "색상 그룹 " + (map.size + 1),
          count: 0,
        });
      }
      map.get(key).count += 1;
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.sourceNo && b.sourceNo) return a.sourceNo - b.sourceNo;
      if (a.sourceNo) return -1;
      if (b.sourceNo) return 1;
      return a.label.localeCompare(b.label, "ko-KR");
    }).map((group, index) => ({
      ...group,
      label: group.sourceNo ? group.label : "색상 그룹 " + (index + 1),
    }));
  }


  function groupByKey(key) {
    return getSectionGroups(false).find((group) => group.key === key) || null;
  }

  function setSectionGroup(sec, groupKey) {
    if (!sec || !groupKey) return;

    const group = groupByKey(groupKey);
    const sourceMatch = String(groupKey).match(/^source-(\d+)$/);
    const sourceNo = sourceMatch ? parseInt(sourceMatch[1], 10) : 0;

    sec.sourceGroup = sourceNo || 0;
    sec.ruleKey = groupKey;
    sec.sectionGroupKey = groupKey;
    sec.sectionGroupName = group?.label || sectionGroupNameFromKey(groupKey, sec);

    if (group?.color) {
      sec.renderColor = group.color;
      if (!sec.sourceColor || sourceNo) sec.sourceColor = group.color;
    }
  }

  function renderSectionGroupSelect() {
    const select = $("sectionGroupSelect");
    if (!select) return;

    const groups = getSectionGroups(false);
    const selected = getSelected();
    const before = select.value || (selected ? sectionGroupKey(selected) : "");

    select.innerHTML = groups
      .map((group) => `<option value="${group.key}">${group.label}</option>`)
      .join("");

    if (groups.some((group) => group.key === before)) {
      select.value = before;
    } else if (selected) {
      select.value = sectionGroupKey(selected);
    }
  }

  function normalizeSectionInfo(sec, index = 0) {
    if (!sec) return sec;

    const no = String(sec.section || sec.label || "").trim();
    const key = rawSectionGroupKey(sec);
    const groupName = sectionGroupNameFromKey(key, sec);

    sec.floor = String(sec.floor || "1").replace("층", "") || "1";
    sec.section = no;
    sec.label = String(sec.label || no).trim();
    sec.sectionName = String(sec.sectionName || sec.name || (no ? "구역 " + no : "미지정 구역")).trim();
    sec.name = sec.sectionName;
    sec.grade = sec.grade || "일반석";
    sec.price = parseInt(sec.price, 10) || 132000;
    sec.renderColor = sec.renderColor || "#d9d9d9";
    sec.sourceGroup = sec.sourceGroup || 0;
    sec.ruleKey = sec.ruleKey || key;
    sec.sectionGroupKey = key;
    sec.sectionGroupName = groupName;

    return sec;
  }

  function normalizeAllSections() {
    sections.forEach((sec, index) => normalizeSectionInfo(sec, index));
  }

  function setSectionNumber(sec, number, pushHistory = true) {
    if (!sec) return;

    normalizeSectionInfo(sec, sections.indexOf(sec));

    const before = {
      id: sec.id,
      floor: sec.floor,
      section: sec.section,
      sectionName: sec.sectionName,
      name: sec.name,
      label: sec.label,
      sectionGroupKey: sec.sectionGroupKey,
      sectionGroupName: sec.sectionGroupName,
    };

    const no = String(number).trim();
    sec.section = no;
    sec.sectionName = "구역 " + no;
    sec.name = sec.sectionName;
    sec.label = no;
    sec.sectionGroupKey = sectionGroupKey(sec);
    sec.sectionGroupName = sectionGroupNameFromKey(sec.sectionGroupKey, sec);

    if (pushHistory) {
      sectionNumberHistory.push(before);
    }
  }

  function sortedSectionsByOrder(order, sourceSections = sections) {
    const list = sourceSections.slice();

    if (order === "left-right") {
      return list.sort((a, b) => {
        const ca = sectionCenter(a);
        const cb = sectionCenter(b);
        return ca.x - cb.x || ca.y - cb.y;
      });
    }

    return list.sort((a, b) => {
      const ca = sectionCenter(a);
      const cb = sectionCenter(b);
      const rowTolerance = Math.max(18, H * 0.035);

      if (Math.abs(ca.y - cb.y) > rowTolerance) return ca.y - cb.y;
      return ca.x - cb.x;
    });
  }

  function assignGroupSectionNumbers(pushHistory = true, showToast = true) {
    if (!sections.length) {
      if (showToast) toast("구역이 없습니다.");
      return;
    }

    const startNo = parseInt($("autoStartNumber")?.value, 10) || 1;
    const order = $("autoNumberOrder")?.value || "top-left";
    const groups = getSectionGroups();

    if (pushHistory) sectionNumberHistory = [];

    groups.forEach((group) => {
      const groupSections = sections.filter((sec) => sectionGroupKey(sec) === group.key);
      const ordered = sortedSectionsByOrder(order, groupSections);
      ordered.forEach((sec, index) => {
        setSectionNumber(sec, startNo + index, pushHistory);
      });
    });

    selectedId = sortedSectionsByOrder(order)[0]?.id || selectedId;
    fillForm(getSelected());
    renderAll();

    if (showToast) toast("색상 그룹별 번호 부여 완료");
  }

  function assignNextSectionNumberInGroup(sec) {
    if (!sec) return;

    const key = sectionGroupKey(sec);
    let maxNo = 0;

    sections.forEach((s) => {
      if (s.id === sec.id) return;
      if (sectionGroupKey(s) !== key) return;
      const no = parseInt(String(s.section || ""), 10);
      if (!Number.isNaN(no) && no > maxNo) maxNo = no;
    });

    setSectionNumber(sec, maxNo + 1, false);
  }

  function autoAssignSectionNumbers() {
    assignGroupSectionNumbers(true, true);
  }

  function startClickNumbering() {
    if (!sections.length) {
      toast("구역이 없습니다.");
      return;
    }

    numberClickMode = true;
    nextSectionNumber = parseInt($("clickStartNumber")?.value, 10) || 1;
    clickSectionGroupKey = "";
    sectionNumberHistory = [];
    renderAll();
    toast("첫 클릭한 색상 그룹 안에서만 번호를 지정합니다.");
  }

  function stopClickNumbering() {
    numberClickMode = false;
    clickSectionGroupKey = "";
    renderAll();
    toast("클릭 번호 지정 종료");
  }

  function undoSectionNumber() {
    const last = sectionNumberHistory.pop();
    if (!last) {
      toast("되돌릴 번호 지정이 없습니다.");
      return;
    }

    const sec = sections.find((s) => s.id === last.id);
    if (sec) {
      sec.floor = last.floor;
      sec.section = last.section;
      sec.sectionName = last.sectionName;
      sec.name = last.name;
      sec.label = last.label;
      sec.sectionGroupKey = last.sectionGroupKey;
      sec.sectionGroupName = last.sectionGroupName;
      selectedId = sec.id;
      fillForm(sec);
    }

    if (numberClickMode) {
      nextSectionNumber = Math.max(1, nextSectionNumber - 1);
    }

    renderAll();
    toast("마지막 번호 지정을 되돌렸습니다.");
  }

  function resetSectionNumbers() {
    if (!confirm("구역 번호를 모두 초기화할까요?")) return;

    sectionNumberHistory = [];
    clickSectionGroupKey = "";
    sections.forEach((sec) => {
      normalizeSectionInfo(sec, sections.indexOf(sec));
      sec.section = "";
      sec.sectionName = "";
      sec.name = "미지정 구역";
      sec.label = "";
    });

    fillForm(getSelected());
    renderAll();
    toast("구역 번호 초기화 완료");
  }

  function validateSectionNumbers() {
    normalizeAllSections();

    const missing = sections.filter((sec) => !String(sec.section || "").trim());
    const map = new Map();
    const duplicates = [];

    sections.forEach((sec) => {
      const no = String(sec.section || "").trim();
      if (!no) return;

      const key = String(sec.floor || "1") + "::" + sectionGroupKey(sec) + "::" + no;
      const arr = map.get(key) || [];
      arr.push(sec);
      map.set(key, arr);
    });

    map.forEach((arr) => {
      if (arr.length > 1) duplicates.push(...arr);
    });

    const noFace = sections.filter(
      (sec) => !(sec.buttonPolygon && sec.buttonPolygon.length >= 3),
    );

    return {
      total: sections.length,
      groups: getSectionGroups().length,
      missing,
      duplicates,
      noFace,
      ok: missing.length === 0 && duplicates.length === 0 && noFace.length === 0,
    };
  }

  function renderNumberStatus() {
    const root = $("numberStatus");
    if (!root) return;

    const result = validateSectionNumbers();
    root.innerHTML = `
      <div class="seatmap-number-status__item">
        <b>${result.total}</b>
        <span>전체 구역</span>
      </div>
      <div class="seatmap-number-status__item">
        <b>${result.groups}</b>
        <span>색상 그룹</span>
      </div>
      <div class="seatmap-number-status__item ${result.missing.length ? "is-warn" : "is-ok"}">
        <b>${result.missing.length}</b>
        <span>번호 미지정</span>
      </div>
      <div class="seatmap-number-status__item ${result.duplicates.length ? "is-warn" : "is-ok"}">
        <b>${result.duplicates.length}</b>
        <span>그룹 내 중복</span>
      </div>
      <div class="seatmap-number-status__item ${result.noFace.length ? "is-warn" : "is-ok"}">
        <b>${result.noFace.length}</b>
        <span>면 미생성</span>
      </div>
    `;
  }

  function fillForm(sec) {
    if (!sec) return;
    normalizeSectionInfo(sec, sections.indexOf(sec));

    renderSectionGroupSelect();

    const groupKey = sectionGroupKey(sec);
    if ($("sectionGroupInput")) $("sectionGroupInput").value = sec.sectionGroupName || sectionGroupNameFromKey(groupKey, sec);
    if ($("sectionGroupSelect")) $("sectionGroupSelect").value = groupKey;
    if ($("floorInput")) $("floorInput").value = sec.floor || "1";
    if ($("sectionInput")) $("sectionInput").value = sec.section || "";
    if ($("sectionNameInput")) $("sectionNameInput").value = sec.sectionName || sec.name || "";
    if ($("labelInput")) $("labelInput").value = sec.label || sec.section || "";
  }

  function applyFormToSection() {
    const sec = getSelected();
    if (!sec) {
      toast("구역을 선택하세요.");
      return false;
    }

    const no = String($("sectionInput")?.value || "").trim();
    if (!no) {
      toast("구역 번호를 입력하세요.");
      return false;
    }

    const selectedGroupKey = $("sectionGroupSelect")?.value;
    if (selectedGroupKey) {
      setSectionGroup(sec, selectedGroupKey);
    }

    sec.floor = String($("floorInput")?.value || sec.floor || "1").replace("층", "") || "1";
    sec.section = no;
    sec.sectionName = "구역 " + no;
    sec.name = sec.sectionName;
    sec.label = no;
    sec.sectionGroupKey = sectionGroupKey(sec);
    sec.sectionGroupName = sectionGroupNameFromKey(sec.sectionGroupKey, sec);

    renderAll();
    toast("선택 구역을 적용했습니다.");
    return true;
  }

  function canMoveToStage3() {
    const result = validateSectionNumbers();

    if (result.missing.length) {
      toast("번호 미지정 구역이 있습니다.");
      return false;
    }
    if (result.duplicates.length) {
      toast("같은 색상 그룹 안에 중복 번호가 있습니다.");
      return false;
    }
    if (result.noFace.length) {
      toast("면 생성이 안 된 구역이 있습니다.");
      return false;
    }

    return true;
  }

  // ============================================================
  // 8. Canvas 렌더링
  // ============================================================
  function drawPart1() {
    bctx.clearRect(0, 0, W, H);
    bctx.drawImage(cleanCanvas, 0, 0);
    octx.clearRect(0, 0, W, H);

    sections.forEach((sec, idx) => {
      octx.save();
      octx.beginPath();
      renderPoly(sec).forEach((p, i) =>
        i ? octx.lineTo(p.x, p.y) : octx.moveTo(p.x, p.y),
      );
      octx.closePath();
      octx.fillStyle =
        sec.id === selectedId ? "rgba(239,68,68,.13)" : "rgba(124,58,237,.08)";
      octx.strokeStyle =
        sec.id === selectedId
          ? "#ef4444"
          : palette[(sec.sourceGroup - 1 + palette.length) % palette.length] ||
            "#7c3aed";
      octx.lineWidth = sec.id === selectedId ? 3 : 2;
      octx.setLineDash([7, 5]);
      octx.fill();
      octx.stroke();
      octx.restore();
    });

    if (dragRect) {
      const rr = rectFromDrag(dragRect);
      octx.save();
      octx.fillStyle = dragRect.action === "cut" ? "rgba(239,68,68,.12)" : "rgba(245,158,11,.12)";
      octx.strokeStyle = dragRect.action === "cut" ? "#ef4444" : "#f59e0b";
      octx.lineWidth = 2;
      octx.setLineDash([5, 4]);
      octx.strokeRect(rr.x, rr.y, rr.w, rr.h);
      octx.fillRect(rr.x, rr.y, rr.w, rr.h);
      octx.restore();
    }
  }

  function drawShapeFill(ctx, paths, fillStyle, strokeStyle, lineWidth) {
    if (!paths || !paths.length) return;

    ctx.save();
    ctx.beginPath();

    paths.forEach((poly) => {
      if (!poly || poly.length < 3) return;
      drawPath(ctx, poly);
      ctx.closePath();
    });

    ctx.fillStyle = fillStyle;
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([]);
    ctx.fill("evenodd");
    ctx.stroke();
    ctx.restore();
  }


  function normalizeColorHex(color, fallback = "#d9d9d9") {
    const value = String(color || fallback).trim();
    if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
    if (/^#[0-9a-fA-F]{3}$/.test(value)) {
      return "#" + value.slice(1).split("").map((v) => v + v).join("");
    }
    return fallback;
  }

  function colorToRgba(color, alpha) {
    const rgb = hexToRgb(normalizeColorHex(color));
    return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
  }

  function textColorForFill(color) {
    const rgb = hexToRgb(normalizeColorHex(color));
    const luminance = (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114) / 255;
    return luminance > 0.58 ? "#111827" : "#ffffff";
  }

  function drawNumberTextOnShape(ctx, sec, activeGroupKey) {
    const label = String(sec.label || sec.section || "").trim();
    const center = sectionCenter(sec);
    const color = normalizeColorHex(sec.renderColor || sec.sourceColor || "#d9d9d9");
    const isRelated = activeGroupKey && sectionGroupKey(sec) === activeGroupKey;
    const isSelected = sec.id === selectedId;
    const text = label || "?";
    const fontSize = Math.max(10, Math.min(18, Math.sqrt(Math.max(sec.area || 0, 80)) * 0.62));

    ctx.save();
    ctx.font = `900 ${fontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.lineWidth = isSelected ? 5 : 4;
    ctx.strokeStyle = label ? "rgba(255,255,255,.92)" : "rgba(239,68,68,.92)";
    ctx.fillStyle = label ? textColorForFill(color) : "#ffffff";

    if (activeGroupKey && !isRelated) {
      ctx.globalAlpha = 0.42;
    }

    ctx.strokeText(text, center.x, center.y + 0.5);
    ctx.fillText(text, center.x, center.y + 0.5);
    ctx.restore();
  }

  function drawGroupNumberShape(sec, activeGroupKey) {
    const paths = renderPaths(sec);
    if (!paths || !paths.length) return;

    const groupKey = sectionGroupKey(sec);
    const color = normalizeColorHex(sec.renderColor || sec.sourceColor || "#d9d9d9");
    const isSelected = sec.id === selectedId;
    const isRelated = activeGroupKey && groupKey === activeGroupKey;
    const hasNumber = String(sec.section || sec.label || "").trim().length > 0;
    const lineWidth = isSelected ? 4.4 : isRelated ? 3.2 : 1.4;
    const fillAlpha = activeGroupKey ? (isRelated ? 0.62 : 0.13) : 0.42;
    const strokeStyle = isSelected
      ? "#111827"
      : isRelated
        ? "#f59e0b"
        : colorToRgba(color, 0.82);

    drawShapeFill(
      octx,
      paths,
      hasNumber ? colorToRgba(color, fillAlpha) : "rgba(239,68,68,.34)",
      strokeStyle,
      lineWidth,
    );
  }

  function drawSelectedGroupGuide(activeGroupKey) {
    if (!activeGroupKey) return;

    const group = getSectionGroups().find((g) => g.key === activeGroupKey);
    const count = sections.filter((sec) => sectionGroupKey(sec) === activeGroupKey).length;

    octx.save();
    octx.font = "900 13px Arial";
    octx.textAlign = "left";
    octx.textBaseline = "top";
    octx.fillStyle = "rgba(15,23,42,.78)";
    octx.fillText(`${group?.label || "선택 색상 그룹"} · 관련 구역 ${count}개`, 12, 10);
    octx.restore();
  }

  function drawButtonPart() {
    bctx.clearRect(0, 0, W, H);
    bctx.drawImage(cleanCanvas, 0, 0);
    octx.clearRect(0, 0, W, H);

    const generatedCount = sections.filter(
      (s) => s.buttonPolygon && s.buttonPolygon.length >= 3,
    ).length;

    sections.forEach((sec) => {
      // 파트1 점선 구역은 검사 범위만 표시한다. 초록 면은 절대 이 점선을 기준으로 만들지 않는다.
      octx.save();
      octx.beginPath();
      drawPath(octx, sec.polygon);
      octx.closePath();
      octx.fillStyle =
        sec.id === selectedId
          ? "rgba(239,68,68,.05)"
          : "rgba(148,163,184,.025)";
      octx.strokeStyle =
        sec.id === selectedId ? "rgba(239,68,68,.75)" : "rgba(100,116,139,.25)";
      octx.lineWidth = sec.id === selectedId ? 2.5 : 1.1;
      octx.setLineDash([4, 4]);
      octx.fill();
      octx.stroke();
      octx.restore();

      // 최종 초록 버튼은 점선 안에 있는 회색 도형 외곽만 사용한다.
      if (
        sec.buttonShape &&
        sec.buttonShape.paths &&
        sec.buttonShape.paths.length
      ) {
        drawShapeFill(
          octx,
          sec.buttonShape.paths,
          sec.id === selectedId
            ? "rgba(239,68,68,.24)"
            : "rgba(16,185,129,.34)",
          sec.id === selectedId ? "#ef4444" : "#10b981",
          sec.id === selectedId ? 4 : +$("buttonStroke").value || 3,
        );
      } else if (sec.buttonPolygon && sec.buttonPolygon.length >= 3) {
        drawShapeFill(
          octx,
          [sec.buttonPolygon],
          sec.id === selectedId
            ? "rgba(239,68,68,.24)"
            : "rgba(16,185,129,.34)",
          sec.id === selectedId ? "#ef4444" : "#10b981",
          sec.id === selectedId ? 4 : +$("buttonStroke").value || 3,
        );
      }

      if (
        part === 3 &&
        editMode &&
        sec.id === selectedId &&
        sec.buttonPolygon
      ) {
        octx.save();
        sec.buttonPolygon.forEach((p, i) => {
          octx.beginPath();
          octx.fillStyle = "#fff";
          octx.strokeStyle =
            editAction === "delete"
              ? "#ef4444"
              : editAction === "add"
                ? "#f59e0b"
                : "#111827";
          octx.lineWidth = 2;
          octx.arc(p.x, p.y, 5, 0, Math.PI * 2);
          octx.fill();
          octx.stroke();
          octx.fillStyle = "#111827";
          octx.font = "bold 9px Arial";
          octx.textAlign = "center";
          octx.textBaseline = "middle";
          octx.fillText(String(i + 1), p.x, p.y);
        });
        octx.restore();
      }
    });

    octx.save();
    octx.font = "bold 12px Arial";
    octx.textAlign = "right";
    octx.textBaseline = "top";
    octx.fillStyle = "rgba(15,23,42,.72)";
    octx.fillText(
      generatedCount
        ? `회색 도형 면 ${generatedCount}개`
        : "아직 회색 면 생성 전",
      W - 12,
      10,
    );
    octx.restore();
  }

  function drawSectionNumberLabels(activeGroupKey = "") {
    sections.forEach((sec) => drawNumberTextOnShape(octx, sec, activeGroupKey));

    drawSelectedGroupGuide(activeGroupKey);

    if (numberClickMode) {
      octx.save();
      octx.font = "bold 13px Arial";
      octx.textAlign = "left";
      octx.textBaseline = "top";
      octx.fillStyle = "rgba(239,68,68,.94)";
      const groupText = clickSectionGroupKey ? " · 같은 색상 그룹" : " · 첫 클릭 색상 그룹";
      octx.fillText("클릭 번호 지정 중" + groupText + " · 다음 번호 " + nextSectionNumber, 12, activeGroupKey ? 32 : 12);
      octx.restore();
    }
  }

  function drawNumberPart() {
    bctx.clearRect(0, 0, W, H);
    bctx.drawImage(cleanCanvas, 0, 0);
    octx.clearRect(0, 0, W, H);

    const selected = getSelected();
    const activeGroupKey = selected ? sectionGroupKey(selected) : "";

    sections.forEach((sec) => drawGroupNumberShape(sec, activeGroupKey));
    drawSectionNumberLabels(activeGroupKey);
  }

  function drawFinalMap(targetCtx, targetCanvas, scaleForPreview = false) {
    targetCanvas.width = W;
    targetCanvas.height = H;
    targetCtx.clearRect(0, 0, W, H);
    targetCtx.fillStyle = $("mapBg")?.value || "#f7f7f7";
    targetCtx.fillRect(0, 0, W, H);

    if (($("guideMode")?.value || "off") === "on" && cleanImageLoaded) {
      targetCtx.save();
      targetCtx.globalAlpha = 0.13;
      targetCtx.drawImage(cleanCanvas, 0, 0);
      targetCtx.restore();
    }

    if (($("stageMode")?.value || "simple") === "simple") {
      targetCtx.save();
      targetCtx.fillStyle = "#bfbfbf";
      const stageW = Math.min(W * 0.36, 320),
        stageH = Math.max(34, H * 0.07);
      targetCtx.fillRect((W - stageW) / 2, H * 0.075, stageW, stageH);
      targetCtx.fillStyle = "#fff";
      targetCtx.font = "bold " + Math.max(14, W * 0.018) + "px Arial";
      targetCtx.textAlign = "center";
      targetCtx.textBaseline = "middle";
      targetCtx.fillText("STAGE", W / 2, H * 0.075 + stageH / 2);
      targetCtx.restore();
    }

    const strokeW = +($("strokeWidth")?.value || 5);
    const labelSize = +($("labelSize")?.value || 15);
    const showLabel = ($("showLabels")?.value || "on") === "on";

    sections.forEach((sec) => {
      const paths = renderPaths(sec);

      targetCtx.save();
      targetCtx.beginPath();
      paths.forEach((poly) => {
        if (!poly || poly.length < 3) return;
        drawPath(targetCtx, poly);
        targetCtx.closePath();
      });

      targetCtx.fillStyle = sec.renderColor || "#d9d9d9";
      targetCtx.strokeStyle = "#ffffff";
      targetCtx.lineWidth = strokeW;
      targetCtx.lineJoin = "round";
      targetCtx.fill("evenodd");
      targetCtx.stroke();

      if (showLabel) {
        const c = polyCenter(sec.buttonPolygon || sec.polygon);
        targetCtx.fillStyle = "#111827";
        targetCtx.font = "bold " + labelSize + "px Arial";
        targetCtx.textAlign = "center";
        targetCtx.textBaseline = "middle";
        targetCtx.fillText(sec.label || sec.name, c.x, c.y);
      }
      targetCtx.restore();
    });

    targetCtx.save();
    targetCtx.strokeStyle = "#b7b7b7";
    targetCtx.lineWidth = 2;
    targetCtx.fillStyle = "rgba(255,255,255,.55)";
    const cw = Math.min(110, W * 0.13),
      ch = 24;
    targetCtx.fillRect((W - cw) / 2, H * 0.62, cw, ch);
    targetCtx.strokeRect((W - cw) / 2, H * 0.62, cw, ch);
    targetCtx.fillStyle = "#8a8a8a";
    targetCtx.font = "bold 12px Arial";
    targetCtx.textAlign = "center";
    targetCtx.textBaseline = "middle";
    targetCtx.fillText("CONSOLE", W / 2, H * 0.62 + ch / 2);
    targetCtx.restore();

    finalMapUrl = targetCanvas.toDataURL("image/png");
  }

  function drawPart2() {
    drawFinalMap(bctx, base);
    octx.clearRect(0, 0, W, H);

    sections.forEach((sec) => {
      if (sec.id !== selectedId) return;
      octx.save();
      octx.beginPath();
      renderPoly(sec).forEach((p, i) =>
        i ? octx.lineTo(p.x, p.y) : octx.moveTo(p.x, p.y),
      );
      octx.closePath();
      octx.strokeStyle = "#ef4444";
      octx.lineWidth = 3;
      octx.setLineDash([8, 5]);
      octx.stroke();
      octx.restore();
    });
  }

  function renderPreview() {
    if (!W || !H) return;
    drawFinalMap(pctx, preview);

    const result = validateSectionNumbers();
    const groups = getSectionGroups();
    const legend = $("legend");
    if (!legend) return;

    const groupRows = groups
      .map((group) => `
        <div class="legend-row">
          <span><i style="background:${group.color}"></i>${group.label}</span>
          <b>${group.count}개</b>
        </div>
      `)
      .join("");

    legend.innerHTML = `
      ${groupRows || '<div class="help">색상 그룹 없음</div>'}
      <div class="legend-row"><span>번호 미지정</span><b>${result.missing.length}</b></div>
      <div class="legend-row"><span>그룹 내 중복</span><b>${result.duplicates.length}</b></div>
      <div class="legend-row"><span>면 미생성</span><b>${result.noFace.length}</b></div>
    `;
  }

  function renderSectionList(rootId) {
    const root = $(rootId);
    if (!root) return;
    if (!sections.length) {
      root.innerHTML = '<div class="help">구역 없음</div>';
      return;
    }

    root.innerHTML = sections
      .map((sec, index) => {
        normalizeSectionInfo(sec, index);
        const no = sec.section || "미지정";
        const faceReady = sec.buttonPolygon && sec.buttonPolygon.length >= 3;
        const groupName = sec.sectionGroupName || sectionGroupNameFromKey(sectionGroupKey(sec), sec);

        return `
          <div class="sec-row ${sec.id === selectedId ? "active" : ""}" data-id="${sec.id}">
            <i class="sec-dot" style="background:${sec.renderColor}"></i>
            <strong>${groupName} · ${no}</strong>
          </div>
        `;
      })
      .join("");

    root.querySelectorAll(".sec-row").forEach((el) => {
      el.onclick = () => {
        selectedId = el.dataset.id;
        fillForm(getSelected());
        renderAll();
      };
    });
  }

  function updatePart1SelectedActions() {
    const box = $("part1SelectedActions");
    const text = $("part1SelectedText");
    if (!box) return;

    const sec = getSelected();
    const show = part === 1 && !!sec;
    box.classList.toggle("hidden", !show);

    if (text && sec) {
      const groupName = sec.sectionGroupName || sectionGroupNameFromKey(sectionGroupKey(sec), sec);
      const no = sec.section || sec.label || "미지정";
      text.textContent = groupName + " · " + no;
    }
  }

  function updateJson() {
    normalizeAllSections();

    const data = {
      type: "CONCERT_SECTIONS",
      version: 1,
      stage: "section-group-numbering",
      width: W,
      height: H,
      sections: sections.map((s) => ({
        id: s.id,
        floor: String(s.floor || "1"),
        sectionGroupKey: sectionGroupKey(s),
        sectionGroupName: s.sectionGroupName || sectionGroupNameFromKey(sectionGroupKey(s), s),
        section: String(s.section || ""),
        sectionName: s.sectionName || s.name || "",
        name: s.sectionName || s.name || "",
        label: String(s.label || s.section || ""),
        grade: s.grade || "일반석",
        price: parseInt(s.price, 10) || 132000,
        sourceColor: s.sourceColor,
        rawSourceColor: s.rawSourceColor || s.sourceColor,
        stage1ShapeColor: s.stage1ShapeColor || getStage1ShapeColor(),
        backgroundColor: s.backgroundColor || getStage1BackgroundColor(),
        autoGray: !!s.autoGray,
        sourceGroup: s.sourceGroup,
        ruleKey: ruleKeyForSection(s),
        renderColor: s.renderColor,
        polygon: s.polygon.map((p) => ({
          x: Math.round(p.x * 100) / 100,
          y: Math.round(p.y * 100) / 100,
        })),
        buttonPolygon: (s.buttonPolygon || []).map((p) => ({
          x: Math.round(p.x * 100) / 100,
          y: Math.round(p.y * 100) / 100,
        })),
        buttonShape: s.buttonShape
          ? {
              source: s.buttonShape.source,
              paths: s.buttonShape.paths.map((path) =>
                path.map((p) => ({
                  x: Math.round(p.x * 100) / 100,
                  y: Math.round(p.y * 100) / 100,
                })),
              ),
            }
          : null,
        bbox: s.bbox,
      })),
      validation: (() => {
        const v = validateSectionNumbers();
        return {
          total: v.total,
          groups: v.groups,
          missing: v.missing.length,
          duplicates: v.duplicates.length,
          noFace: v.noFace.length,
          ok: v.ok,
        };
      })(),
      overviewImage: finalMapUrl,
      updatedAt: new Date().toISOString(),
    };

    const jsonPreview = $("jsonPreview");
    if (jsonPreview) {
      jsonPreview.textContent = JSON.stringify(data, null, 2).slice(0, 4500);
    }

    return data;
  }

  // ============================================================
  // 9. 전체 화면 갱신 / 파트 전환 / 저장
  // ============================================================
  function setCanvasTitle(text) {
    const canvasTitle = $("canvasTitle");
    if (canvasTitle) {
      canvasTitle.textContent = text;
    }
  }

  function renderAll() {
    if (part === 1) {
      setCanvasTitle("파트1 · 회색 도형 구역 추출");
      drawPart1();
    } else if (part === 2) {
      setCanvasTitle("파트2 · 구역 면 자동 생성");
      drawButtonPart();
    } else {
      setCanvasTitle("파트3 · 구역 번호 지정");
      drawNumberPart();
    }

    renderSectionGroupSelect();
    updatePart1SelectedActions();
    renderSectionList("sectionList1");
    renderSectionList("sectionListButton");
    renderSectionList("sectionListNumber");
    renderNumberStatus();
    renderPreview();
    updateJson();
  }

  function setPart(n) {
    part = Math.max(1, Math.min(3, n));
    n = part;

    if (n === 3 && sections.length) {
      const hasMissingNumber = sections.some((sec) => !String(sec.section || "").trim());
      if (!part3AutoNumberApplied || hasMissingNumber) {
        assignGroupSectionNumbers(false, false);
        part3AutoNumberApplied = true;
      }
    }

    const completedParts = [];
    for (let step = 1; step < n; step += 1) {
      completedParts.push(step);
    }

    if (window.SeatmapWorkspace && typeof window.SeatmapWorkspace.setActivePart === "function") {
      window.SeatmapWorkspace.setActivePart(n, completedParts);
    } else {
      [1, 2, 3].forEach((step) => {
        const panel = $("part" + step + "Panel");
        const btn = $("partBtn" + step);

        if (!panel || !btn) return;

        const active = step === n;
        const done = step < n;

        panel.classList.remove("hidden");
        panel.classList.toggle("is-active", active);
        panel.classList.toggle("is-done", done);
        btn.classList.toggle("active", active);
      });
    }

    [1, 2, 3].forEach((step) => {
      const panel = $("part" + step + "Panel");
      const btn = $("partBtn" + step);

      if (!panel || !btn) return;

      const active = step === n;
      const done = step < n;

      panel.classList.remove("hidden");
      panel.classList.toggle("is-active", active);
      panel.classList.toggle("is-done", done);
      btn.classList.toggle("active", active);

      const status = panel.querySelector(".seatmap-step__status");
      if (status) {
        if (active) {
          status.textContent = "진행중";
        } else if (done) {
          status.textContent = "완료";
        } else {
          status.textContent = "대기";
        }
      }
    });

    renderAll();
  }

  function setPart1EditMode(mode) {
    part1EditMode = mode || "";
    manualMode = false;
    dragRect = null;

    const help = $("part1EditHelp");
    const cancel = $("cancelPart1EditBtn");
    const mergeBtn = $("mergeSectionDragBtn");
    const cutBtn = $("cutSectionBtn");

    if (cancel) cancel.classList.toggle("hidden", !part1EditMode);
    if (mergeBtn) mergeBtn.classList.toggle("is-active", part1EditMode === "merge");
    if (cutBtn) cutBtn.classList.toggle("is-active", part1EditMode === "cut");

    if (help) {
      if (part1EditMode === "merge") {
        help.textContent = "합칠 구역들을 포함하도록 캔버스에서 드래그하세요.";
      } else if (part1EditMode === "cut") {
        help.textContent = "먼저 구역을 선택한 뒤, 자를 방향으로 짧게 드래그하세요. 세로 드래그는 좌우 분할, 가로 드래그는 상하 분할입니다.";
      } else {
        help.textContent = "자동 분석 후 잘못 나뉜 구역은 드래그 합치기, 크게 잡힌 구역은 선택 자르기로 보정합니다.";
      }
    }

    renderAll();
  }

  function sectionsInRect(r) {
    return sections.filter((sec) => {
      const b = bboxOf(sec.polygon || []);
      const c = sectionCenter(sec);
      return rectContainsPoint(r, c) || rectIntersectsBBox(r, b);
    });
  }

  function mergeSectionsByRect(r) {
    const targets = sectionsInRect(r);

    if (targets.length < 2) {
      toast("합칠 구역을 2개 이상 포함해서 드래그하세요.");
      return;
    }

    const baseSec = selectedId && targets.some((s) => s.id === selectedId)
      ? getSelected()
      : targets[0];
    const b = bboxOfSections(targets);

    if (!baseSec || !b) return;

    const mergedPolygon = rectPolygon(b.x, b.y, b.w, b.h);
    const targetIds = new Set(targets.map((s) => s.id));

    baseSec.polygon = mergedPolygon;
    baseSec.bbox = bboxOf(mergedPolygon);
    baseSec.area = polygonArea(mergedPolygon);
    baseSec.buttonShape = null;
    baseSec.buttonPolygon = null;
    baseSec.faceReady = false;

    sections = sections.filter((sec) => sec.id === baseSec.id || !targetIds.has(sec.id));
    selectedId = baseSec.id;
    normalizeAllSections();
    fillForm(baseSec);
    renderAll();
    toast("구역 " + targets.length + "개를 합쳤습니다. 파트2에서 면을 다시 생성하세요.");
  }

  function mergeSectionsByIds(baseId, targetId) {
    if (!baseId || !targetId || baseId === targetId) return false;

    const baseSec = sections.find((sec) => sec.id === baseId);
    const targetSec = sections.find((sec) => sec.id === targetId);

    if (!baseSec || !targetSec) return false;

    const b = bboxOfSections([baseSec, targetSec]);
    if (!b) return false;

    const mergedPolygon = rectPolygon(b.x, b.y, b.w, b.h);

    baseSec.polygon = mergedPolygon;
    baseSec.bbox = bboxOf(mergedPolygon);
    baseSec.area = polygonArea(mergedPolygon);
    baseSec.buttonShape = null;
    baseSec.buttonPolygon = null;
    baseSec.faceReady = false;

    sections = sections.filter((sec) => sec.id !== targetSec.id);
    selectedId = baseSec.id;
    normalizeAllSections();
    fillForm(baseSec);
    part3AutoNumberApplied = false;
    toast("선택 구역과 합쳤습니다. 파트2에서 면을 다시 생성하세요.");
    return true;
  }

  function cloneSectionForCut(sec, polygon) {
    const clone = JSON.parse(JSON.stringify(sec));
    clone.id = "sec" + nextId++;
    clone.polygon = polygon;
    clone.bbox = bboxOf(polygon);
    clone.area = polygonArea(polygon);
    clone.buttonShape = null;
    clone.buttonPolygon = null;
    clone.faceReady = false;
    clone.section = "";
    clone.label = "";
    clone.sectionName = "미지정 구역";
    clone.name = clone.sectionName;
    return clone;
  }

  function cutSelectedSectionByDrag(r) {
    const sec = getSelected();

    if (!sec) {
      toast("자를 구역을 먼저 선택하세요.");
      return;
    }

    const b = bboxOf(sec.polygon || []);
    if (!b || b.w < 12 || b.h < 12) {
      toast("자를 수 있는 구역이 아닙니다.");
      return;
    }

    const verticalCut = r.h >= r.w;
    const minSize = 6;
    let first = null;
    let second = null;

    if (verticalCut) {
      const x = Math.max(b.x + minSize, Math.min(b.x + b.w - minSize, r.x + r.w / 2));
      if (x <= b.x + minSize || x >= b.x + b.w - minSize) {
        toast("구역 안쪽을 세로로 드래그하세요.");
        return;
      }
      first = rectPolygon(b.x, b.y, x - b.x, b.h);
      second = rectPolygon(x, b.y, b.x + b.w - x, b.h);
    } else {
      const y = Math.max(b.y + minSize, Math.min(b.y + b.h - minSize, r.y + r.h / 2));
      if (y <= b.y + minSize || y >= b.y + b.h - minSize) {
        toast("구역 안쪽을 가로로 드래그하세요.");
        return;
      }
      first = rectPolygon(b.x, b.y, b.w, y - b.y);
      second = rectPolygon(b.x, y, b.w, b.y + b.h - y);
    }

    sec.polygon = first;
    sec.bbox = bboxOf(first);
    sec.area = polygonArea(first);
    sec.buttonShape = null;
    sec.buttonPolygon = null;
    sec.faceReady = false;

    const clone = cloneSectionForCut(sec, second);
    const index = sections.findIndex((s) => s.id === sec.id);
    sections.splice(index + 1, 0, clone);
    selectedId = clone.id;
    normalizeAllSections();
    fillForm(clone);
    renderAll();
    toast("선택 구역을 2개로 잘랐습니다. 파트2에서 면을 다시 생성하세요.");
  }

  function saveStage2() {
    if (getSelected() && $("sectionInput")) {
      applyFormToSection();
    }

    drawFinalMap(pctx, preview);
    const data = updateJson();

    localStorage.setItem("concert_sections", JSON.stringify(data.sections));
    localStorage.setItem("concert_stage2Data", JSON.stringify(data));
    localStorage.removeItem("concert_colorRules");
    localStorage.removeItem("concert_overviewImage");

    toast("Stage2 저장 완료");
    return data;
  }

  // ============================================================
  // 10. 초기화
  // ============================================================
  async function init() {
    applyStage1SettingsToInputs();

    if (!cleanUrl) {
      toast("Stage1 도면이 없습니다. Stage1로 이동합니다.");
      setTimeout(() => (location.href = ROUTES.stage1), 800);
      return;
    }

    const cleanImg = await img(cleanUrl);
    setupCanvas(cleanImg.naturalWidth, cleanImg.naturalHeight);
    cleanCtx.clearRect(0, 0, W, H);
    cleanCtx.drawImage(cleanImg, 0, 0, W, H);
    normalizeStage1CleanImageForStage2();
    cleanImageLoaded = true;

    try {
      if (originalUrl) {
        const originImg = await img(originalUrl);
        originalCanvas.width = originImg.naturalWidth;
        originalCanvas.height = originImg.naturalHeight;
        originalCtx.drawImage(originImg, 0, 0);
        originalImageLoaded = true;
        $("miniImg").src = originalUrl;
      }
    } catch (e) {
      $("miniImg").src = cleanUrl;
    }

    if (!$("miniImg").src) $("miniImg").src = cleanUrl;

    const savedRules = localStorage.getItem("concert_colorRules");
    if (savedRules) {
      try {
        colorRules = JSON.parse(savedRules);
      } catch (e) {}
    }

    const saved = localStorage.getItem("concert_sections");
    if (saved) {
      try {
        sections = JSON.parse(saved);
        nextId =
          sections.reduce(
            (m, s) =>
              Math.max(m, parseInt(String(s.id).replace(/\D/g, "")) || 0),
            0,
          ) + 1;
        normalizeStage2SectionColors();
        normalizeAllSections();
        selectedId = sections[0]?.id || null;
        fillForm(getSelected());
      } catch (e) {}
    }

    setPart(part);
  }

  // ============================================================
  // 11. 버튼 이벤트 바인딩
  // ============================================================
  function bindClick(id, handler) {
    const el = $(id);
    if (el) el.onclick = handler;
  }

  function bindChange(id, handler) {
    const el = $(id);
    if (!el) return;
    el.oninput = handler;
    el.onchange = handler;
  }

  bindClick("backStage1Btn", () => { location.href = ROUTES.stage1; });
  bindClick("partBtn1", () => setPart(1));
  bindClick("partBtn2", () => setPart(2));
  bindClick("partBtn3", () => setPart(3));
  bindClick("goPart2Btn", () => {
    if (!sections.length) {
      toast("먼저 자동 구역 분석을 하세요.");
      return;
    }

    try {
      makeButtonsForAll();
      setPart(2);
    } catch (e) {
      console.error(e);
      toast("면 자동 생성 오류: " + e.message);
    }
  });
  bindClick("goPart3Btn", () => setPart(3));

  bindClick("autoAnalyzeBtn", analyzeAll);
  bindClick("manualSectionBtn", () => {
    manualMode = true;
    part1EditMode = "";
    toast("캔버스에서 수동 구역 범위를 드래그하세요.");
  });

  bindClick("mergeSectionDragBtn", () => {
    setPart1EditMode(part1EditMode === "merge" ? "" : "merge");
  });

  bindClick("cutSectionBtn", () => {
    setPart1EditMode(part1EditMode === "cut" ? "" : "cut");
  });

  bindClick("cancelPart1EditBtn", () => setPart1EditMode(""));

  bindClick("deleteSectionBtn", () => {
    if (!selectedId) return;
    sections = sections.filter((s) => s.id !== selectedId);
    selectedId = sections[0]?.id || null;
    normalizeAllSections();
    fillForm(getSelected());
    renderAll();
  });

  bindClick("recalcPolygonBtn", () => {
    const sec = getSelected();
    if (!sec) {
      toast("구역 선택 필요");
      return;
    }
    const component = findComponentAt(polyCenter(sec.polygon));
    if (!component) {
      toast("해당 구역의 회색 도형을 다시 찾지 못했습니다.");
      return;
    }
    sec.polygon = polygonFromCells(component.cells, component.bbox);
    sec.bbox = bboxOf(sec.polygon);
    sec.area = polygonArea(sec.polygon);
    renderAll();
    toast("선택 구역 도형 재계산 완료");
  });

  bindClick("makeAllButtonsBtn", () => {
    try {
      makeButtonsForAll();
    } catch (e) {
      console.error(e);
      toast("면 생성 오류: " + e.message);
    }
  });

  bindClick("makeSelectedButtonBtn", () => {
    try {
      const sec = getSelected();
      if (!sec) {
        toast("구역 선택 필요");
        return;
      }
      if (makeButtonForSection(sec)) {
        renderAll();
        toast("선택 구역 면 재생성 완료");
      } else {
        toast("구역 안 회색 도형을 찾지 못했습니다");
      }
    } catch (e) {
      console.error(e);
      toast("면 재생성 오류: " + e.message);
    }
  });

  bindClick("useExtractedAsFaceBtn", () => {
    const sec = getSelected();
    if (!sec) {
      toast("구역 선택 필요");
      return;
    }
    sec.buttonShape = null;
    sec.buttonPolygon = sec.polygon.map((p) => ({ x: p.x, y: p.y }));
    sec.faceReady = true;
    renderAll();
    toast("점선 범위를 임시 면으로 적용했습니다");
  });

  [
    "buttonStroke",
    "buttonSimplify",
    "minEdgeLen",
    "buttonSnap",
    "maxButtonPoints",
  ].forEach((id) => bindChange(id, renderAll));

  bindClick("autoNumberBtn", autoAssignSectionNumbers);
  bindClick("startClickNumberBtn", startClickNumbering);
  bindClick("stopClickNumberBtn", stopClickNumbering);
  bindClick("undoNumberBtn", undoSectionNumber);
  bindClick("resetNumberBtn", resetSectionNumbers);
  bindClick("applySectionBtn", applyFormToSection);
  ["floorInput", "sectionInput", "sectionNameInput", "labelInput", "sectionGroupSelect"].forEach((id) => {
    bindChange(id, () => {
      const sec = getSelected();
      if (!sec) return;
      if (id === "sectionInput") {
        const no = String($("sectionInput")?.value || "").trim();
        if ($("sectionNameInput")) $("sectionNameInput").value = no ? "구역 " + no : "";
        if ($("labelInput")) $("labelInput").value = no;
      }
    });
  });

  bindClick("saveStage2Btn", saveStage2);
  function moveToStage3() {
    if (getSelected()) applyFormToSection();
    if (!canMoveToStage3()) return;
    saveStage2();
    setTimeout(() => (location.href = ROUTES.stage3), 250);
  }

  bindClick("toStage3Btn", moveToStage3);
  bindClick("toStage3BtnBottom", moveToStage3);

  bindClick("resetStage2Btn", () => {
    if (!confirm("Stage2 구역 데이터를 초기화할까요?")) return;
    sections = [];
    selectedId = null;
    nextId = 1;
    colorGroups = [];
    sectionNumberHistory = [];
    numberClickMode = false;
    part1EditMode = "";
    localStorage.removeItem("concert_sections");
    localStorage.removeItem("concert_colorRules");
    localStorage.removeItem("concert_overviewImage");
    localStorage.removeItem("concert_stage2Data");
    renderAll();
    part3AutoNumberApplied = false;
    toast("Stage2 초기화 완료");
  });

  // ============================================================
  // 12. 파트3 꼭짓점 편집 도우미
  // ============================================================
  function setEditMode(on, action = "move") {
    editMode = !!on;
    if (editMode && part !== 3) setPart(3);
    editAction = action;

    if ($("editModeBtn"))
      $("editModeBtn").textContent = editMode
        ? "꼭짓점 편집 ON"
        : "꼭짓점 편집 OFF";
    if ($("editHelp")) {
      const label =
        editAction === "add"
          ? "점 추가: 선 위에 추가할 위치를 클릭하세요."
          : editAction === "delete"
            ? "점 삭제: 삭제할 꼭짓점을 클릭하세요."
            : "점 이동: 꼭짓점을 드래그하세요.";
      $("editHelp").textContent = editMode
        ? label
        : "자동 결과가 이상한 구역만 선택하세요. 편집 ON → 점 이동/추가/삭제로 살짝 고치면 됩니다.";
    }
    renderAll();
  }

  function nearestVertex(poly, p) {
    if (!poly || !poly.length) return null;
    let best = null;
    poly.forEach((v, i) => {
      const d = Math.hypot(v.x - p.x, v.y - p.y);
      if (!best || d < best.dist) best = { index: i, dist: d, point: v };
    });
    return best;
  }

  function nearestEdge(poly, p) {
    if (!poly || poly.length < 2) return null;
    let best = null;

    for (let i = 0; i < poly.length; i++) {
      const a = poly[i],
        b = poly[(i + 1) % poly.length];
      const vx = b.x - a.x,
        vy = b.y - a.y;
      const len2 = vx * vx + vy * vy || 1;
      let t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2;
      t = Math.max(0, Math.min(1, t));
      const proj = { x: a.x + vx * t, y: a.y + vy * t };
      const dist = Math.hypot(p.x - proj.x, p.y - proj.y);
      if (!best || dist < best.dist) best = { index: i, dist, point: proj };
    }

    return best;
  }

  function insertPointOnSelected(p) {
    const sec = getSelected();
    if (!sec || !sec.buttonPolygon) {
      toast("먼저 면을 생성하세요");
      return;
    }
    const edge = nearestEdge(sec.buttonPolygon, p);
    if (!edge) {
      return;
    }
    sec.buttonPolygon.splice(edge.index + 1, 0, {
      x: edge.point.x,
      y: edge.point.y,
    });
    renderAll();
    toast("점을 추가했습니다");
  }

  function deletePointOnSelected(p) {
    const sec = getSelected();
    if (!sec || !sec.buttonPolygon) {
      toast("먼저 면을 생성하세요");
      return;
    }
    if (sec.buttonPolygon.length <= 3) {
      toast("점은 최소 3개가 필요합니다");
      return;
    }

    const v = nearestVertex(sec.buttonPolygon, p);
    const scale = parseFloat(base.style.width) / W || 1;
    const hitRadius = 14 / scale;

    if (v && v.dist <= hitRadius) {
      sec.buttonPolygon.splice(v.index, 1);
      renderAll();
      toast("점을 삭제했습니다");
    } else {
      toast("삭제할 점 가까이를 클릭하세요");
    }
  }

  // ============================================================
  // 13. 캔버스 포인터 이벤트
  // ============================================================
  overlay.onpointerdown = (e) => {
    if (zoomToolOn) {
      zoomDragging = true;
      zoomStartX = e.clientX;
      zoomStartScale = zoomScale;
      e.preventDefault();
      return;
    }

    const p = posOn(overlay, e);
    if (part === 3) {
      const hit = [...sections]
        .reverse()
        .find(
          (s) => pointInPoly(p, renderPoly(s)) || pointInPoly(p, s.polygon),
        );

      if (hit) {
        selectedId = hit.id;

        if (numberClickMode) {
          const hitGroupKey = sectionGroupKey(hit);
          if (!clickSectionGroupKey) {
            clickSectionGroupKey = hitGroupKey;
          }

          if (hitGroupKey !== clickSectionGroupKey) {
            fillForm(hit);
            renderAll();
            toast("클릭 번호 지정은 같은 색상 그룹 안에서만 가능합니다.");
            return;
          }

          setSectionNumber(hit, nextSectionNumber, true);
          nextSectionNumber += 1;
        }

        fillForm(hit);
        renderAll();
      }
      return;
    }

    if (part === 2) {
      const hit = [...sections]
        .reverse()
        .find(
          (s) => pointInPoly(p, renderPoly(s)) || pointInPoly(p, s.polygon),
        );
      if (hit) {
        selectedId = hit.id;
        fillForm(hit);
        renderAll();
      }
      return;
    }

    const hit = [...sections].reverse().find((s) => pointInPoly(p, s.polygon));

    if (hit) {
      if (e.shiftKey) {
        if (selectedId && selectedId !== hit.id) {
          mergeSectionsByIds(selectedId, hit.id);
          renderAll();
        } else {
          selectedId = hit.id;
          fillForm(hit);
          renderAll();
          toast("합칠 기준 구역을 선택했습니다. Shift를 누른 채 다른 구역을 클릭하세요.");
        }
        return;
      }

      selectedId = hit.id;
      fillForm(hit);
      renderAll();
      return;
    }

    dragRect = { x: p.x, y: p.y, w: 0, h: 0, startX: p.x, startY: p.y, action: "manual" };
  };

  window.addEventListener("pointermove", (e) => {
    if (zoomDragging) {
      const deltaX = e.clientX - zoomStartX;
      setZoom(zoomStartScale + deltaX / 260);
      return;
    }

    if (cornerDrag) {
      const p = posOn(overlay, e);
      cornerDrag.sec.buttonPolygon[cornerDrag.index] = { x: p.x, y: p.y };
      renderAll();
      return;
    }
    if (!dragRect) return;
    const p = posOn(overlay, e);
    dragRect.x = Math.min(dragRect.startX, p.x);
    dragRect.y = Math.min(dragRect.startY, p.y);
    dragRect.w = Math.abs(p.x - dragRect.startX);
    dragRect.h = Math.abs(p.y - dragRect.startY);
    renderAll();
  });

  window.addEventListener("pointerup", () => {
    if (zoomDragging) {
      zoomDragging = false;
      return;
    }

    if (cornerDrag) {
      cornerDrag = null;
      return;
    }

    if (!dragRect) return;

    const raw = dragRect;
    const r = rectFromDrag(raw);

    if (r.w > 8 && r.h > 8) {
      const polygon = rectPolygon(r.x, r.y, r.w, r.h);
      const id = "sec" + nextId++;
      const sec = {
        id,
        floor: "1",
        section: "",
        sectionName: "",
        name: "수동 구역 미지정",
        label: "",
        grade: "일반석",
        price: 132000,
        sourceColor: "#d9d9d9",
        sourceGroup: 0,
        ruleKey: "manual-default",
        renderColor: "#d9d9d9",
        polygon,
        bbox: bboxOf(polygon),
        area: polygonArea(polygon),
      };
      sections.push(sec);
      normalizeAllSections();
      assignNextSectionNumberInGroup(sec);
      selectedId = id;
      fillForm(sec);
      toast("수동 구역 추가 완료");
    }

    dragRect = null;
    manualMode = false;
    renderAll();
  });

  // ============================================================
  // 14. Stage1 패턴 공용 작업 도구
  // ============================================================
  if ($("zoomTool")) {
    $("zoomTool").onclick = () => {
      zoomToolOn = !zoomToolOn;
      applyCanvasScale();
      toast(zoomToolOn ? "확대 도구: 오른쪽 드래그 확대 / 왼쪽 드래그 축소" : "확대 도구 OFF");
    };
  }

  if ($("zoomOut")) {
    $("zoomOut").onclick = zoomOut;
  }

  if ($("zoomIn")) {
    $("zoomIn").onclick = zoomIn;
  }

  if ($("zoomReset")) {
    $("zoomReset").onclick = resetZoom;
  }

  if ($("canvasBox")) {
    $("canvasBox").addEventListener("wheel", (e) => {
      if (!zoomToolOn && !e.ctrlKey) return;
      e.preventDefault();
      if (e.deltaY < 0) zoomIn();
      else zoomOut();
    }, { passive: false });
  }

  if ($("undoAction")) {
    $("undoAction").onclick = () => toast("Stage2 이전 작업 기록은 아직 연결하지 않았습니다.");
  }

  if ($("redoAction")) {
    $("redoAction").onclick = () => toast("Stage2 다음 작업 기록은 아직 연결하지 않았습니다.");
  }

  init();
})();
