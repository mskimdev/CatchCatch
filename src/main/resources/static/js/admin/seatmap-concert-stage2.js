// stage2 js
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
  let cleanUrl =
    localStorage.getItem("concert_cleanImage") ||
    localStorage.getItem("concert_originalImage");
  let originalUrl = localStorage.getItem("concert_originalImage") || cleanUrl;
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
  function setupCanvas(w, h) {
    W = w;
    H = h;
    [base, overlay].forEach((c) => {
      c.width = w;
      c.height = h;
    });
    cleanCanvas.width = w;
    cleanCanvas.height = h;
    const scale = Math.min(1, 1120 / w, 720 / h);
    base.style.width = overlay.style.width = w * scale + "px";
    base.style.height = overlay.style.height = h * scale + "px";
    $("canvasBox").style.width = w * scale + "px";
    $("canvasBox").style.height = h * scale + "px";
    $("canvasSize").textContent = w + " × " + h;
    preview.width = w;
    preview.height = h;
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

    // Stage1에서 만든 도형색 기준. 기본은 회색.
    const shape = hexToRgb($("shapeColor").value || "#d9d9d9");
    const bg = hexToRgb($("bgColor").value || "#f7f7f7");

    // 배경은 제외
    if (dist(c, bg) < 18) return false;

    // 1순위: Stage1 도형색과 유사한 픽셀
    if (dist(c, shape) <= 70) return true;

    // 2순위: 실제 이미지 압축/안티앨리어싱 때문에 약간 달라진 저채도 회색 픽셀
    const max = Math.max(c.r, c.g, c.b);
    const min = Math.min(c.r, c.g, c.b);
    const sat = max - min;
    const bright = (c.r + c.g + c.b) / 3;

    return sat <= 32 && bright >= 125 && bright <= 235;
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

  function simplifyGrayLoop(loop) {
    if (!loop || loop.length < 3) return loop || [];

    // 회색 외곽 그대로가 우선. 아주 미세한 픽셀 계단만 정리한다.
    let eps = +($("buttonSimplify")?.value || 2);
    let poly = rdp(loop.concat([loop[0]]), eps).slice(0, -1);

    poly = removeShortAndCollinear(poly);

    // 최대 꼭짓점은 넉넉하게 둔다. 여기서 억지로 줄이면 네모/박스처럼 망가진다.
    const maxPts = +($("maxButtonPoints")?.value || 32);
    if (poly.length > maxPts) {
      let localEps = eps * 1.2;
      for (let i = 0; i < 6 && poly.length > maxPts; i++) {
        poly = rdp(loop.concat([loop[0]]), localEps).slice(0, -1);
        poly = removeShortAndCollinear(poly);
        localEps *= 1.25;
      }
    }

    // 자동 단계에서는 스냅을 거의 하지 않는다. 스냅은 도형을 박스처럼 만들 수 있음.
    const snap = +($("buttonSnap")?.value || 0);
    if (snap > 0) poly = straightenNgon(poly, snap);

    return poly.length >= 3 ? poly : loop;
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

    // 대부분 좌석 구역은 하나의 외곽 path.
    // 내부 구멍은 일단 path로 보존하되, 렌더링은 evenodd로 처리 가능하게 저장.
    return {
      paths: paths.map((x) => x.poly),
      outer: paths[0].poly,
      holes: paths.slice(1).map((x) => x.poly),
      source: "gray-edge",
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
    const shape = faceFromGrayInsideSection(sec);

    // 회색 도형을 못 찾으면 생성하지 않는다.
    // 여기서 점선 구역으로 fallback하면 지금처럼 이상한 초록 박스가 생긴다.
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
    toast("회색끼리 이어 면 생성: " + count + "개 / 실패 " + fail + "개");
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
    const shape = hexToRgb($("shapeColor").value);
    const bg = hexToRgb($("bgColor").value);
    const tol = +$("shapeTol").value || 34;
    const c = getPixel(data, idx);
    if (c.a < 20) return false;
    if (dist(c, bg) < tol + 6) return false;
    return dist(c, shape) <= tol;
  }

  function dominantSourceColor(cells, bbox) {
    let sourceData = null;
    if (
      originalImageLoaded &&
      originalCanvas.width === W &&
      originalCanvas.height === H
    ) {
      sourceData = originalCtx.getImageData(0, 0, W, H).data;
    }
    if (!sourceData) {
      return { color: { r: 210, g: 210, b: 210 }, group: 0 };
    }
    const buckets = {};
    const step = Math.max(1, Math.floor(cells.length / 900));
    for (let i = 0; i < cells.length; i += step) {
      const idx = cells[i];
      const k = idx * 4;
      const r = sourceData[k],
        g = sourceData[k + 1],
        b = sourceData[k + 2],
        a = sourceData[k + 3];
      if (a < 20) continue;
      const max = Math.max(r, g, b),
        min = Math.min(r, g, b),
        sum = r + g + b;
      if (sum > 690 || sum < 120 || max - min < 18) continue;
      const key = `${Math.round(r / 24)}_${Math.round(g / 24)}_${Math.round(b / 24)}`;
      const bucket =
        buckets[key] || (buckets[key] = { count: 0, r: 0, g: 0, b: 0 });
      bucket.count++;
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
    }
    let best = null;
    for (const k in buckets) {
      if (!best || buckets[k].count > best.count) best = buckets[k];
    }
    if (!best) return { color: { r: 210, g: 210, b: 210 }, group: 0 };
    const color = {
      r: best.r / best.count,
      g: best.g / best.count,
      b: best.b / best.count,
    };
    let groupIndex = colorGroups.findIndex((g) => dist(g.color, color) < 55);
    if (groupIndex < 0) {
      colorGroups.push({ id: colorGroups.length + 1, color });
      groupIndex = colorGroups.length - 1;
    }
    return { color, group: groupIndex + 1 };
  }

  function makeSection(cells, bbox, namePrefix = "구역") {
    const polygon = polygonFromCells(cells, bbox);
    const source = dominantSourceColor(cells, bbox);
    const renderColor = source.group
      ? palette[(source.group - 1) % palette.length]
      : "#d9d9d9";
    const id = "sec" + nextId++;
    const label = String(sections.length + 1);
    return {
      id,
      name: namePrefix + " " + sections.length,
      label,
      floor: "1층",
      grade: "일반석",
      price: 132000,
      sourceColor: rgbToHex(source.color),
      sourceGroup: source.group || 0,
      ruleKey: source.group
        ? "source-" + source.group
        : "color-" + renderColor.toLowerCase(),
      renderColor,
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
      .map((c, i) => {
        const sec = makeSection(c.cells, c.bbox, "구역");
        sec.name = "구역 " + (i + 1);
        sec.label = String(i + 1);
        return sec;
      });

    selectedId = sections[0]?.id || null;
    fillForm(getSelected());
    renderAll();
    toast("자동 분석 완료: " + sections.length + "개 구역");
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
  // 7. 색상 규칙 / 구역 정보 적용
  // ============================================================
  function ruleKeyForSection(sec) {
    if (!sec) return "";
    if (!sec.ruleKey) {
      sec.ruleKey = sec.sourceGroup
        ? "source-" + sec.sourceGroup
        : "color-" + String(sec.renderColor || "#d9d9d9").toLowerCase();
    }
    return sec.ruleKey;
  }

  function syncColorRules() {
    const existing = new Map(colorRules.map((r) => [r.key, r]));
    sections.forEach((sec) => {
      const key = ruleKeyForSection(sec);
      if (!existing.has(key)) {
        const label = sec.sourceGroup
          ? `색상 그룹 ${sec.sourceGroup}`
          : `사용자 색상 ${existing.size + 1}`;
        existing.set(key, {
          key,
          label,
          grade: sec.grade || "일반석",
          price: sec.price || 132000,
          renderColor: sec.renderColor || "#d9d9d9",
          count: 0,
        });
      }
    });

    colorRules = Array.from(existing.values()).map((rule) => {
      const count = sections.filter(
        (s) => ruleKeyForSection(s) === rule.key,
      ).length;
      return { ...rule, count };
    });
  }

  function selectedRule() {
    syncColorRules();
    const key = $("colorRuleSelect")?.value || colorRules[0]?.key;
    return colorRules.find((r) => r.key === key) || colorRules[0];
  }

  function fillRuleForm(rule) {
    if (!rule) return;
    $("ruleGradeInput").value = rule.grade || "일반석";
    $("rulePriceInput").value = rule.price || 132000;
    $("ruleColorInput").value = rule.renderColor || "#d9d9d9";
  }

  function renderColorRuleControls() {
    syncColorRules();
    const opts = colorRules
      .map(
        (rule) => `
        <option value="${rule.key}">${rule.label} · ${rule.count}구역</option>
      `,
      )
      .join("");

    if ($("colorRuleSelect")) {
      const before = $("colorRuleSelect").value;
      $("colorRuleSelect").innerHTML =
        opts || '<option value="">색상 없음</option>';
      if (colorRules.some((r) => r.key === before))
        $("colorRuleSelect").value = before;
    }

    if ($("singleRuleSelect")) {
      const before = $("singleRuleSelect").value;
      $("singleRuleSelect").innerHTML =
        opts || '<option value="">색상 없음</option>';
      if (colorRules.some((r) => r.key === before))
        $("singleRuleSelect").value = before;
    }

    if ($("colorRuleList")) {
      $("colorRuleList").innerHTML =
        colorRules
          .map(
            (rule) => `
          <div class="sec-row" data-rule="${rule.key}">
            <i class="sec-dot" style="background:${rule.renderColor}"></i>
            <div>
              <strong>${rule.label}</strong>
              <span>${rule.grade} · ${Number(rule.price || 0).toLocaleString("ko-KR")}원 · ${rule.count}구역</span>
            </div>
          </div>
        `,
          )
          .join("") || '<div class="help">색상 그룹 없음</div>';

      $("colorRuleList")
        .querySelectorAll(".sec-row")
        .forEach((el) => {
          el.onclick = () => {
            $("colorRuleSelect").value = el.dataset.rule;
            fillRuleForm(selectedRule());
          };
        });
    }
  }

  function applyColorRuleToGroup() {
    syncColorRules();
    const rule = selectedRule();
    if (!rule) {
      toast("색상 그룹이 없습니다.");
      return;
    }

    rule.grade = $("ruleGradeInput").value || "일반석";
    rule.price = parseInt($("rulePriceInput").value, 10) || 0;
    rule.renderColor = $("ruleColorInput").value || "#d9d9d9";

    sections.forEach((sec) => {
      if (ruleKeyForSection(sec) === rule.key) {
        sec.grade = rule.grade;
        sec.price = rule.price;
        sec.renderColor = rule.renderColor;
      }
    });

    const sec = getSelected();
    if (sec) fillForm(sec);
    renderAll();
    toast(rule.label + " 일괄 변경 완료");
  }

  function addColorRule() {
    const key = "custom-" + Date.now();
    const rule = {
      key,
      label:
        "추가 색상 " +
        (colorRules.filter((r) => r.key.startsWith("custom-")).length + 1),
      grade: $("ruleGradeInput").value || "일반석",
      price: parseInt($("rulePriceInput").value, 10) || 0,
      renderColor: $("ruleColorInput").value || "#d9d9d9",
      count: 0,
    };
    colorRules.push(rule);
    renderColorRuleControls();
    $("colorRuleSelect").value = key;
    $("singleRuleSelect").value = key;
    fillRuleForm(rule);
    toast("색상을 추가했습니다. 단일 구역에서 선택해 배정할 수 있습니다.");
  }

  function applyRuleToSingleForm(rule) {
    if (!rule) return;
    $("gradeInput").value = rule.grade || "일반석";
    $("priceInput").value = rule.price || 132000;
    $("renderColorInput").value = rule.renderColor || "#d9d9d9";
  }

  function getSelected() {
    return sections.find((s) => s.id === selectedId);
  }

  function fillForm(sec) {
    if (!sec) return;
    syncColorRules();
    $("floorInput").value = sec.floor;
    $("nameInput").value = sec.name;
    $("gradeInput").value = sec.grade;
    $("priceInput").value = sec.price;
    $("renderColorInput").value = sec.renderColor;
    $("labelInput").value = sec.label || sec.name;

    const key = ruleKeyForSection(sec);
    if ($("singleRuleSelect") && colorRules.some((r) => r.key === key)) {
      $("singleRuleSelect").value = key;
    }
    if ($("colorRuleSelect") && colorRules.some((r) => r.key === key)) {
      $("colorRuleSelect").value = key;
      fillRuleForm(selectedRule());
    }
  }

  function applyFormToSection() {
    const sec = getSelected();
    if (!sec) {
      toast("구역을 선택하세요.");
      return;
    }

    const selectedRuleKey = $("singleRuleSelect")?.value;
    const rule = colorRules.find((r) => r.key === selectedRuleKey);

    sec.floor = $("floorInput").value || "1층";
    sec.name = $("nameInput").value || sec.name;
    sec.ruleKey = selectedRuleKey || ruleKeyForSection(sec);
    sec.grade = $("gradeInput").value || rule?.grade || "일반석";
    sec.price = parseInt($("priceInput").value, 10) || rule?.price || 0;
    sec.renderColor =
      $("renderColorInput").value || rule?.renderColor || sec.renderColor;
    sec.label = $("labelInput").value || sec.name;

    renderAll();
    toast("선택 구역만 변경했습니다.");
  }

  function applyToSameGroup() {
    const sec = getSelected();
    if (!sec) {
      toast("구역을 선택하세요.");
      return;
    }
    applyFormToSection();
    const key = ruleKeyForSection(sec);
    sections.forEach((s) => {
      if (ruleKeyForSection(s) === key) {
        s.grade = sec.grade;
        s.price = sec.price;
        s.renderColor = sec.renderColor;
      }
    });
    renderAll();
    toast("같은 색상 그룹에 적용했습니다.");
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
      octx.save();
      octx.fillStyle = "rgba(245,158,11,.12)";
      octx.strokeStyle = "#f59e0b";
      octx.setLineDash([5, 4]);
      octx.strokeRect(dragRect.x, dragRect.y, dragRect.w, dragRect.h);
      octx.fillRect(dragRect.x, dragRect.y, dragRect.w, dragRect.h);
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

  function drawFinalMap(targetCtx, targetCanvas, scaleForPreview = false) {
    targetCanvas.width = W;
    targetCanvas.height = H;
    targetCtx.clearRect(0, 0, W, H);
    targetCtx.fillStyle = $("mapBg").value || "#f7f7f7";
    targetCtx.fillRect(0, 0, W, H);

    if ($("guideMode").value === "on" && cleanImageLoaded) {
      targetCtx.save();
      targetCtx.globalAlpha = 0.13;
      targetCtx.drawImage(cleanCanvas, 0, 0);
      targetCtx.restore();
    }

    if ($("stageMode").value === "simple") {
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

    const strokeW = +$("strokeWidth").value || 5;
    const labelSize = +$("labelSize").value || 15;
    const showLabel = $("showLabels").value === "on";

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
    const grouped = {};
    sections.forEach((s) => {
      const key = s.grade + "_" + s.price + "_" + s.renderColor;
      grouped[key] = grouped[key] || {
        grade: s.grade,
        price: s.price,
        color: s.renderColor,
        count: 0,
      };
      grouped[key].count++;
    });
    $("legend").innerHTML =
      Object.values(grouped)
        .map(
          (g) => `
        <div class="legend-row">
          <span><i style="background:${g.color}"></i>${g.grade}</span>
          <b>${g.count}구역</b>
        </div>
      `,
        )
        .join("") || '<div class="help">구역 없음</div>';
  }

  function renderSectionList(rootId) {
    const root = $(rootId);
    if (!root) return;
    if (!sections.length) {
      root.innerHTML = '<div class="help">구역 없음</div>';
      return;
    }
    root.innerHTML = sections
      .map(
        (sec) => `
        <div class="sec-row ${sec.id === selectedId ? "active" : ""}" data-id="${sec.id}">
          <i class="sec-dot" style="background:${sec.renderColor}"></i>
          <div>
            <strong>${sec.name}</strong>
            <span>${sec.floor} · ${sec.grade} · ${sec.price.toLocaleString("ko-KR")} · 색상그룹 ${sec.sourceGroup || "-"}</span>
          </div>
        </div>
      `,
      )
      .join("");
    root.querySelectorAll(".sec-row").forEach((el) => {
      el.onclick = () => {
        selectedId = el.dataset.id;
        fillForm(getSelected());
        renderAll();
      };
    });
  }

  function updateJson() {
    const data = {
      type: "CONCERT",
      stage: "section-polygon",
      width: W,
      height: H,
      sections: sections.map((s) => ({
        id: s.id,
        name: s.name,
        label: s.label,
        floor: s.floor,
        grade: s.grade,
        price: s.price,
        sourceColor: s.sourceColor,
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
      overviewImage: finalMapUrl,
      updatedAt: new Date().toISOString(),
    };
    $("jsonPreview").textContent = JSON.stringify(data, null, 2).slice(0, 4500);
    return data;
  }

  // ============================================================
  // 9. 전체 화면 갱신 / 파트 전환 / 저장
  // ============================================================
  function renderAll() {
    if (part === 1) {
      $("canvasTitle").textContent = "파트1 · 회색 도형 구역 추출";
      drawPart1();
    } else if (part === 2) {
      $("canvasTitle").textContent = "파트2 · 구역 안 회색 도형 오토 면 생성";
      drawButtonPart();
    } else if (part === 3) {
      $("canvasTitle").textContent = "파트3 · 선택 구역 꼭짓점 보정";
      drawButtonPart();
    } else {
      $("canvasTitle").textContent = "파트4 · 예매용 컬러 구역도";
      drawPart2();
    }
    renderSectionList("sectionList1");
    renderSectionList("sectionListButton");
    renderSectionList("sectionListFix");
    renderSectionList("sectionList2");
    renderColorRuleControls();
    renderPreview();
    updateJson();
  }

  function setPart(n) {
    part = n;
    $("partBtn1").classList.toggle("active", n === 1);
    $("partBtn2").classList.toggle("active", n === 2);
    $("partBtn3").classList.toggle("active", n === 3);
    $("partBtn4").classList.toggle("active", n === 4);
    $("part1Panel").classList.toggle("hidden", n !== 1);
    $("part2Panel").classList.toggle("hidden", n !== 2);
    $("part3Panel").classList.toggle("hidden", n !== 3);
    $("part4Panel").classList.toggle("hidden", n !== 4);
    renderAll();
  }

  function saveStage2() {
    applyFormToSection();
    drawFinalMap(pctx, preview);
    const data = updateJson();
    localStorage.setItem("concert_sections", JSON.stringify(data.sections));
    localStorage.setItem("concert_colorRules", JSON.stringify(colorRules));
    localStorage.setItem("concert_overviewImage", finalMapUrl);
    localStorage.setItem("concert_stage2Data", JSON.stringify(data));
    toast("Stage2 저장 완료");
  }

  // ============================================================
  // 10. 초기화
  // ============================================================
  async function init() {
    if (!cleanUrl) {
      toast("Stage1 도면이 없습니다. Stage1로 이동합니다.");
      setTimeout(() => (location.href = ROUTES.stage1), 800);
      return;
    }

    const cleanImg = await img(cleanUrl);
    setupCanvas(cleanImg.naturalWidth, cleanImg.naturalHeight);
    cleanCtx.clearRect(0, 0, W, H);
    cleanCtx.drawImage(cleanImg, 0, 0, W, H);
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
        selectedId = sections[0]?.id || null;
        fillForm(getSelected());
      } catch (e) {}
    }

    renderAll();
  }

  // ============================================================
  // 11. 버튼 이벤트 바인딩
  // ============================================================
  $("backStage1Btn").onclick = () => { location.href = ROUTES.stage1; };
  $("partBtn1").onclick = () => setPart(1);
  $("partBtn2").onclick = () => setPart(2);
  $("partBtn3").onclick = () => setPart(3);
  $("partBtn4").onclick = () => setPart(4);
  $("goPart2Btn").onclick = () => setPart(2);
  $("goPart3Btn").onclick = () => setPart(3);
  $("goPart4Btn").onclick = () => setPart(4);
  $("autoAnalyzeBtn").onclick = analyzeAll;
  $("manualSectionBtn").onclick = () => {
    manualMode = true;
    toast("캔버스에서 수동 구역 범위를 드래그하세요.");
  };
  $("deleteSectionBtn").onclick = () => {
    if (!selectedId) return;
    sections = sections.filter((s) => s.id !== selectedId);
    selectedId = sections[0]?.id || null;
    fillForm(getSelected());
    renderAll();
  };
  $("recalcPolygonBtn").onclick = () => {
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
  };
  $("makeAllButtonsBtn").onclick = () => {
    try {
      makeButtonsForAll();
    } catch (e) {
      console.error(e);
      toast("면 생성 오류: " + e.message);
    }
  };
  $("pointModeBtn").onclick = () => {
    if (!getSelected()) {
      toast("구역을 먼저 선택하세요");
      return;
    }
    pointMode = true;
    draftPoints = [];
    toast("캔버스에서 꼭짓점을 순서대로 찍으세요");
  };
  $("cancelPointBtn").onclick = () => {
    pointMode = false;
    draftPoints = [];
    renderAll();
    toast("점 찍기 취소");
  };
  $("finishPointBtn").onclick = () => {
    const sec = getSelected();
    if (!sec) {
      toast("구역을 먼저 선택하세요");
      return;
    }
    if (draftPoints.length < 3) {
      toast("점은 최소 3개 이상 찍어야 합니다");
      return;
    }
    sec.buttonShape = null;
    sec.buttonPolygon = draftPoints.map((p) => ({ x: p.x, y: p.y }));
    pointMode = false;
    draftPoints = [];
    renderAll();
    toast("찍은 점을 선으로 이어 면을 만들었습니다");
  };
  $("makeSelectedButtonBtn").onclick = () => {
    try {
      const sec = getSelected();
      if (!sec) {
        toast("구역 선택 필요");
        return;
      }
      if (makeButtonForSection(sec)) {
        renderAll();
        toast("선택 구역 면 재생성 완료");
      } else toast("구역 안 회색 도형을 찾지 못했습니다");
    } catch (e) {
      console.error(e);
      toast("면 재생성 오류: " + e.message);
    }
  };
  $("useOriginalPolygonBtn").onclick = () => {
    const sec = getSelected();
    if (!sec) return;
    sec.buttonShape = null;
    sec.buttonPolygon = sec.polygon.map((p) => ({ ...p }));
    renderAll();
    toast("선택 구역은 원본 도형을 버튼으로 사용합니다.");
  };
  $("straightenSelectedBtn").onclick = () => {
    const sec = getSelected();
    if (!sec || !sec.buttonPolygon) return;
    sec.buttonPolygon = straightenNgon(
      sec.buttonPolygon,
      $("buttonSnap").value,
    );
    renderAll();
    toast("선택 구역 각 보정 완료");
  };
  [
    "buttonStroke",
    "showButtonHandles",
    "buttonSimplify",
    "minEdgeLen",
    "buttonSnap",
    "maxButtonPoints",
  ].forEach((id) => {
    if ($(id)) {
      $(id).oninput = renderAll;
      $(id).onchange = renderAll;
    }
  });
  $("makeSelectedButtonBtnFix").onclick = () => {
    try {
      const sec = getSelected();
      if (!sec) {
        toast("구역 선택 필요");
        return;
      }
      if (makeButtonForSection(sec)) {
        renderAll();
        toast("선택 구역 자동 재생성 완료");
      } else toast("구역 안 회색 도형을 찾지 못했습니다");
    } catch (e) {
      console.error(e);
      toast("면 재생성 오류: " + e.message);
    }
  };
  $("useExtractedAsFaceBtn").onclick = () => {
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
  };
  $("editModeBtn").onclick = () => setEditMode(!editMode, editAction);
  $("movePointBtn").onclick = () => setEditMode(true, "move");
  $("addPointBtn").onclick = () => setEditMode(true, "add");
  $("deletePointBtn").onclick = () => setEditMode(true, "delete");
  $("doneEditBtn").onclick = () => {
    setEditMode(false, "move");
    toast("보정 완료");
  };
  $("applySectionBtn").onclick = applyFormToSection;
  $("applyColorRuleBtn").onclick = applyColorRuleToGroup;
  $("addColorRuleBtn").onclick = addColorRule;
  $("colorRuleSelect").onchange = () => fillRuleForm(selectedRule());
  $("singleRuleSelect").onchange = () =>
    applyRuleToSingleForm(
      colorRules.find((r) => r.key === $("singleRuleSelect").value),
    );
  $("renderColorMapBtn").onclick = () => {
    renderAll();
    toast("컬러 구역도를 다시 생성했습니다.");
  };
  $("saveStage2Btn").onclick = saveStage2;
  $("toStage3Btn").onclick = () => {
    saveStage2();
    setTimeout(() => (location.href = ROUTES.stage3), 250);
  };
  $("resetStage2Btn").onclick = () => {
    if (!confirm("Stage2 구역 데이터를 초기화할까요?")) return;
    sections = [];
    selectedId = null;
    nextId = 1;
    colorGroups = [];
    localStorage.removeItem("concert_sections");
    localStorage.removeItem("concert_colorRules");
    localStorage.removeItem("concert_overviewImage");
    localStorage.removeItem("concert_stage2Data");
    renderAll();
    toast("Stage2 초기화 완료");
  };

  [
    "strokeWidth",
    "labelSize",
    "showLabels",
    "guideMode",
    "stageMode",
    "mapBg",
  ].forEach((id) => {
    $(id).oninput = renderAll;
    $(id).onchange = renderAll;
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
    const p = posOn(overlay, e);
    if (part === 4) {
      const hit = [...sections]
        .reverse()
        .find((s) => pointInPoly(p, renderPoly(s)));
      if (hit) {
        selectedId = hit.id;
        fillForm(hit);
        renderAll();
      }
      return;
    }

    if (part === 3) {
      if (editMode && selectedId) {
        if (editAction === "add") {
          insertPointOnSelected(p);
          return;
        }
        if (editAction === "delete") {
          deletePointOnSelected(p);
          return;
        }

        const corner = hitButtonCorner(p);
        if (corner) {
          cornerDrag = corner;
          return;
        }
      }

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
    if (hit && !manualMode) {
      selectedId = hit.id;
      fillForm(hit);
      renderAll();
      return;
    }

    if (manualMode) {
      dragRect = { x: p.x, y: p.y, w: 0, h: 0, startX: p.x, startY: p.y };
      return;
    }

    const comp = findComponentAt(p);
    if (comp) {
      const sec = makeSection(comp.cells, comp.bbox, "클릭 구역");
      sec.name = "클릭 구역 " + nextId;
      sec.label = String(sections.length + 1);
      sections.push(sec);
      selectedId = sec.id;
      fillForm(sec);
      renderAll();
      toast("클릭한 도형을 새 구역으로 추가했습니다.");
    }
  };

  window.addEventListener("pointermove", (e) => {
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
    if (cornerDrag) {
      cornerDrag = null;
      return;
    }
    if (!dragRect) return;
    const r = dragRect;
    if (r.w > 8 && r.h > 8) {
      const polygon = [
        { x: r.x, y: r.y },
        { x: r.x + r.w, y: r.y },
        { x: r.x + r.w, y: r.y + r.h },
        { x: r.x, y: r.y + r.h },
      ];
      const id = "sec" + nextId++;
      const sec = {
        id,
        name: "수동 구역 " + sections.length,
        label: String(sections.length + 1),
        floor: "1층",
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
      selectedId = id;
      fillForm(sec);
      toast("수동 구역 추가 완료");
    }
    dragRect = null;
    manualMode = false;
    renderAll();
  });

  init();
})();
