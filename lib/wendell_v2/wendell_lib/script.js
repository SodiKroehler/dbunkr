const P = {
  roots: 1,
  rootSpread: [0.08, 0.92],
  trunkStep: [0.011, 0.019],
  branchStep: [0.01, 0.021],
  trunkWidth: [3.2, 5.4],
  branchWidthScale: [0.72, 0.95],
  widthDecayTrunk: [0.982, 0.992],
  widthDecayBranch: [0.978, 0.992],
  trunkNodeGap: [4, 8],
  branchNodeGap: [9, 18],
  trunkBranchTarget: 14,
  branchChanceAtNode: 0.78,
  secondaryChanceAtNode: 0.34,
  maxDepth: 4,
  trunkMaxSteps: [145, 250],
  branchMaxSteps: [80, 260],
  headingNoise: [-0.035, 0.035],
  directionPull: [0.02, 0.05],
  turnMomentum: [0.74, 0.9],
  turnClamp: [0.05, 0.1],
  branchAngle: [0.85, 1.5],
  cornerFillChance: 0.55,
  cornerFillSteps: [150, 320],
  forcedCornerSteps: [180, 300],
  smallTwigChance: 0.46,
  longRunnerChance: 0.38,
  growSpeed: 62,
  color: "25, 74, 47",
  alpha: 1,
  /** Prune passes ≈ slider × this × (shootCount / pruneShootCountRef) */
  prunePassMultiplier: 25.8,
  /** ~typical unique branch count; tune so slider “feels” consistent across sizes */
  pruneShootCountRef: 72,
  /** After the vine finishes drawing, run one destructive prune (same as old slider level). */
  autoPruneOnComplete: true,
  /** Effective “slider” level for auto prune (2 was the sweet spot). Set 0 to disable passes scaling only. */
  autoPruneDensity: 0.5
};

const DECOR = {
  leavesEnabled: true,
  flowersEnabled: true,
  /** Scattered vine leaves on regrow / after auto-prune */
  sparseLeafCount: [12, 24],
  /** Extra leaves when you hit Apply (scaled by slider %) */
  leafCount: [70, 120],
  flowerCount: [10, 17],
  leafColor: "44, 102, 66",
  flowerPetal: "201, 89, 132",
  flowerPetalDark: "171, 54, 99",
  flowerCenter: "236, 176, 82",
  leafSize: [7, 50],
  flowerSize: [8, 21],
  leavesAroundFlower: [5, 10],
  bloomRadius: 52,
  clickFlowerRadius: 64,
  bloomMinIntervalMs: 70,
  bloomMinMovePx: 6,
  bloomLeavesPerPulse: [2, 5],
  /** Flower “bloom” pop-in length (ms): swell + settle + slight spin */
  flowerSpawnMs: 380,
  flowerBloomScale: 0.22
};

const INTERACT = {
  enabled: true,
  mode: "flowerScale", // "flowerScale" | "vineGlow" | "none"
  onlyAfterDraw: true,
  hoverRadius: 26,
  hoverScale: 1.32,
  glowColor: "255, 232, 70",
  glowAlpha: 0.98
};

const cvs = document.getElementById("c");
const ctx = cvs.getContext("2d");
const pointer = { x: -9999, y: -9999, inside: false };
let animRaf = null;
const STATE = {
  seed: Date.now(),
  prunePass: 0,
  leafMultiplier: 1.2
};

function resize() {
  cvs.width = window.innerWidth;
  cvs.height = window.innerHeight;
}

function seededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s ^= s >>> 16;
    return (s >>> 0) / 0xffffffff;
  };
}

function rand(r, lo, hi) {
  return lo + r() * (hi - lo);
}

function randArr(r, arr) {
  return rand(r, arr[0], arr[1]);
}

function angleOf(seg) {
  return Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1);
}

function buildVines(seed) {
  const r = seededRng(seed);
  const segs = [];
  const W = cvs.width;
  const H = cvs.height;
  const queue = [];
  let nextShootId = 1;

  function makeShoot(opts) {
    return {
      shootId: nextShootId++,
      parentShootId: opts.parentShootId ?? null,
      x: opts.x,
      y: opts.y,
      heading: opts.heading,
      turn: rand(r, -0.01, 0.01),
      width: opts.width,
      depth: opts.depth,
      maxSteps: opts.maxSteps,
      steps: 0,
      nodeGap: opts.nodeGap,
      nextNode: opts.nodeGap,
      nodeSide: opts.nodeSide,
      isTrunk: opts.isTrunk,
      branchCount: 0,
      preferredHeading: opts.preferredHeading,
      cornerFilledLeft: false,
      cornerFilledRight: false
    };
  }

  function enqueueShoot(shoot) {
    queue.push(shoot);
  }

  function atNode(shoot) {
    if (shoot.steps < shoot.nextNode) return false;
    shoot.nextNode += Math.floor(rand(r, shoot.nodeGap * 0.7, shoot.nodeGap * 1.35));
    return true;
  }

  function spawnFromNode(parent) {
    if (parent.depth >= P.maxDepth) return;
    const mustBranch = parent.isTrunk && parent.branchCount < P.trunkBranchTarget;
    if (!mustBranch && r() > P.branchChanceAtNode) return;

    const side = parent.nodeSide;
    parent.nodeSide *= -1;
    const angleOffset = side * randArr(r, P.branchAngle);
    const heading = parent.heading + angleOffset;

    let maxSteps = Math.floor(randArr(r, P.branchMaxSteps));
    if (r() < P.smallTwigChance) maxSteps = Math.floor(maxSteps * rand(r, 0.2, 0.5));
    if (r() < P.longRunnerChance) maxSteps = Math.floor(maxSteps * rand(r, 1.2, 1.9));

    const branch = makeShoot({
      parentShootId: parent.shootId,
      x: parent.x,
      y: parent.y,
      heading,
      preferredHeading: -Math.PI / 2 + side * rand(r, 0.35, 0.85),
      width: parent.width * randArr(r, P.branchWidthScale),
      depth: parent.depth + 1,
      maxSteps: Math.max(12, maxSteps),
      nodeGap: Math.floor(randArr(r, P.branchNodeGap)),
      nodeSide: -side,
      isTrunk: false
    });

    enqueueShoot(branch);
    parent.branchCount += 1;

    if (r() < P.secondaryChanceAtNode) {
      const s2 = makeShoot({
        parentShootId: parent.shootId,
        x: parent.x,
        y: parent.y,
        heading: parent.heading - angleOffset * rand(r, 0.6, 1.1),
        preferredHeading: -Math.PI / 2 - side * rand(r, 0.3, 0.9),
        width: branch.width * rand(r, 0.75, 0.92),
        depth: parent.depth + 1,
        maxSteps: Math.max(10, Math.floor(branch.maxSteps * rand(r, 0.35, 0.7))),
        nodeGap: Math.floor(randArr(r, P.branchNodeGap)),
        nodeSide: side,
        isTrunk: false
      });
      enqueueShoot(s2);
    }
  }

  for (let i = 0; i < P.roots; i += 1) {
    const t = P.roots === 1 ? 0.5 : i / (P.roots - 1);
    const x = W * (P.rootSpread[0] + (P.rootSpread[1] - P.rootSpread[0]) * t) + rand(r, -W * 0.03, W * 0.03);
    const trunk = makeShoot({
      parentShootId: null,
      x,
      y: H + rand(r, 0, H * 0.02),
      heading: -Math.PI / 2 + rand(r, -0.32, 0.32),
      preferredHeading: -Math.PI / 2 + rand(r, -0.12, 0.12),
      width: randArr(r, P.trunkWidth),
      depth: 0,
      maxSteps: Math.floor(randArr(r, P.trunkMaxSteps)),
      nodeGap: Math.floor(randArr(r, P.trunkNodeGap)),
      nodeSide: r() < 0.5 ? -1 : 1,
      isTrunk: true
    });
    enqueueShoot(trunk);

    // Deterministic early side runners so lower corners are not left empty.
    if (P.roots === 1) {
      const leftRunner = makeShoot({
        parentShootId: trunk.shootId,
        x,
        y: H * rand(r, 0.84, 0.96),
        heading: -Math.PI / 2 - rand(r, 0.95, 1.25),
        preferredHeading: -Math.PI / 2 - rand(r, 0.8, 1.15),
        width: trunk.width * rand(r, 0.74, 0.9),
        depth: 1,
        maxSteps: Math.floor(randArr(r, P.forcedCornerSteps)),
        nodeGap: Math.floor(randArr(r, P.branchNodeGap)),
        nodeSide: -1,
        isTrunk: false
      });
      const rightRunner = makeShoot({
        parentShootId: trunk.shootId,
        x,
        y: H * rand(r, 0.84, 0.96),
        heading: -Math.PI / 2 + rand(r, 0.95, 1.25),
        preferredHeading: -Math.PI / 2 + rand(r, 0.8, 1.15),
        width: trunk.width * rand(r, 0.74, 0.9),
        depth: 1,
        maxSteps: Math.floor(randArr(r, P.forcedCornerSteps)),
        nodeGap: Math.floor(randArr(r, P.branchNodeGap)),
        nodeSide: 1,
        isTrunk: false
      });
      enqueueShoot(leftRunner);
      enqueueShoot(rightRunner);
    }
  }

  while (queue.length > 0) {
    const shoot = queue.pop();

    while (shoot.steps < shoot.maxSteps && shoot.width > 0.3) {
      shoot.steps += 1;

      shoot.turn *= randArr(r, P.turnMomentum);
      shoot.turn += randArr(r, P.headingNoise);
      const pull = randArr(r, P.directionPull);
      shoot.turn += (shoot.preferredHeading - shoot.heading) * pull;
      const clamp = randArr(r, P.turnClamp);
      shoot.turn = Math.max(-clamp, Math.min(clamp, shoot.turn));
      shoot.heading += shoot.turn;

      const segLen = H * randArr(r, shoot.isTrunk ? P.trunkStep : P.branchStep);
      const x1 = shoot.x;
      const y1 = shoot.y;
      shoot.x += Math.cos(shoot.heading) * segLen;
      shoot.y += Math.sin(shoot.heading) * segLen;

      const cx = x1 + Math.cos(shoot.heading - shoot.turn * 1.35) * segLen * 0.55;
      const cy = y1 + Math.sin(shoot.heading - shoot.turn * 1.35) * segLen * 0.55;
      segs.push({
        x1,
        y1,
        cx,
        cy,
        x2: shoot.x,
        y2: shoot.y,
        thick: shoot.width,
        alpha: P.alpha,
        shootId: shoot.shootId,
        parentShootId: shoot.parentShootId,
        shootDepth: shoot.depth,
        isTrunk: shoot.isTrunk
      });

      if (atNode(shoot)) spawnFromNode(shoot);

      if (
        shoot.isTrunk &&
        shoot.y > H * 0.62 &&
        shoot.y < H * 0.95 &&
        shoot.steps > shoot.maxSteps * 0.12
      ) {
        if (!shoot.cornerFilledLeft && r() < P.cornerFillChance) {
          const leftRunner = makeShoot({
            parentShootId: shoot.shootId,
            x: shoot.x,
            y: shoot.y,
            heading: -Math.PI / 2 - rand(r, 0.85, 1.25),
            preferredHeading: -Math.PI / 2 - rand(r, 0.55, 1.05),
            width: shoot.width * rand(r, 0.68, 0.88),
            depth: shoot.depth + 1,
            maxSteps: Math.floor(randArr(r, P.cornerFillSteps)),
            nodeGap: Math.floor(randArr(r, P.branchNodeGap)),
            nodeSide: -1,
            isTrunk: false
          });
          enqueueShoot(leftRunner);
          shoot.cornerFilledLeft = true;
        }

        if (!shoot.cornerFilledRight && r() < P.cornerFillChance) {
          const rightRunner = makeShoot({
            parentShootId: shoot.shootId,
            x: shoot.x,
            y: shoot.y,
            heading: -Math.PI / 2 + rand(r, 0.85, 1.25),
            preferredHeading: -Math.PI / 2 + rand(r, 0.55, 1.05),
            width: shoot.width * rand(r, 0.68, 0.88),
            depth: shoot.depth + 1,
            maxSteps: Math.floor(randArr(r, P.cornerFillSteps)),
            nodeGap: Math.floor(randArr(r, P.branchNodeGap)),
            nodeSide: 1,
            isTrunk: false
          });
          enqueueShoot(rightRunner);
          shoot.cornerFilledRight = true;
        }
      }

      shoot.width *= randArr(r, shoot.isTrunk ? P.widthDecayTrunk : P.widthDecayBranch);

      if (shoot.x < -W * 0.15 || shoot.x > W * 1.15 || shoot.y < -H * 0.18 || shoot.y > H * 1.15) {
        break;
      }
    }
  }

  return segs;
}

let baseSegments = [];
let segments = [];
let decorations = [];
/** User-grown leaves from hovering; persist until regrow / auto-prune */
let bloomLeaves = [];
/** Click-placed azaleas; persist like bloom leaves */
let bloomFlowers = [];
let drawn = 0;
let raf = null;
const bloomPointer = {
  lastX: 0,
  lastY: 0,
  lastTime: 0,
  primed: false
};

function buildDecorations(sourceSegments, seed, leafMultiplier, options) {
  const initialSparse = options && options.initialSparse !== false;
  const r = seededRng(seed);
  const out = [];
  const startIdx = Math.floor(sourceSegments.length * 0.08);

  function sampleAnchor(minThickness, maxThickness) {
    for (let i = 0; i < 80; i += 1) {
      const idx = Math.floor(rand(r, startIdx, sourceSegments.length - 1));
      const seg = sourceSegments[idx];
      if (!seg) continue;
      if (seg.thick >= minThickness && seg.thick <= maxThickness) return idx;
    }
    return Math.floor(rand(r, startIdx, sourceSegments.length - 1));
  }

  if (DECOR.leavesEnabled) {
    let leafCount;
    if (initialSparse) {
      leafCount = Math.floor(randArr(r, DECOR.sparseLeafCount));
    } else {
      leafCount = Math.floor(randArr(r, DECOR.leafCount) * leafMultiplier);
    }
    for (let i = 0; i < leafCount; i += 1) {
      const anchor = sampleAnchor(0.55, 3.4);
      const seg = sourceSegments[anchor];
      const a = angleOf(seg);
      const side = r() < 0.5 ? -1 : 1;
      out.push({
        type: "leaf",
        anchor,
        x: seg.x2,
        y: seg.y2,
        angle: a + side * rand(r, 0.45, 0.95),
        size: randArr(r, DECOR.leafSize)
      });
    }
  }

  if (DECOR.flowersEnabled) {
    const flowerCount = Math.floor(randArr(r, DECOR.flowerCount));
    for (let i = 0; i < flowerCount; i += 1) {
      const anchor = sampleAnchor(0.5, 2.4);
      const seg = sourceSegments[anchor];
      const a = angleOf(seg);
      const side = r() < 0.5 ? -1 : 1;
      out.push({
        type: "flower",
        anchor,
        x: seg.x2 + Math.cos(a + side * 1.25) * rand(r, 3, 10),
        y: seg.y2 + Math.sin(a + side * 1.25) * rand(r, 3, 10),
        angle: a + rand(r, -0.4, 0.4),
        size: randArr(r, DECOR.flowerSize),
        spawnT: null,
        bloomSpin: r() < 0.5 ? -1 : 1
      });

      const flowerLeaves = Math.floor(randArr(r, DECOR.leavesAroundFlower));
      for (let j = 0; j < flowerLeaves; j += 1) {
        const burstSide = r() < 0.5 ? -1 : 1;
        const orbit = rand(r, 0.65, 1.7);
        out.push({
          type: "leaf",
          anchor,
          x: seg.x2 + Math.cos(a + burstSide * orbit) * rand(r, 5, 14),
          y: seg.y2 + Math.sin(a + burstSide * orbit) * rand(r, 5, 14),
          angle: a + burstSide * rand(r, 0.25, 1.15),
          size: randArr(r, DECOR.leafSize) * rand(r, 0.8, 1.25)
        });
      }
    }
  }

  return out;
}

function countUniqueShootIds(sourceSegments) {
  const ids = new Set();
  for (let i = 0; i < sourceSegments.length; i += 1) ids.add(sourceSegments[i].shootId);
  return ids.size;
}

/** Returns Set of shootIds whose entire subtrees would be pruned away. */
function computePruneRemovalShootIds(sourceSegments, densityLimit, seed) {
  const r = seededRng((seed ^ 0xa53c9e11) >>> 0);
  const shoots = new Map();
  const children = new Map();
  const shootCount = countUniqueShootIds(sourceSegments);
  const densityFactor = shootCount / Math.max(12, P.pruneShootCountRef);

  for (let i = 0; i < sourceSegments.length; i += 1) {
    const s = sourceSegments[i];
    const id = s.shootId;
    if (!shoots.has(id)) {
      shoots.set(id, {
        id,
        parentId: s.parentShootId,
        isTrunk: Boolean(s.isTrunk),
        depth: s.shootDepth,
        segmentCount: 0,
        maxThick: 0
      });
    }
    const meta = shoots.get(id);
    meta.segmentCount += 1;
    if (s.thick > meta.maxThick) meta.maxThick = s.thick;
  }

  shoots.forEach((meta) => {
    if (meta.parentId == null || !shoots.has(meta.parentId)) return;
    if (!children.has(meta.parentId)) children.set(meta.parentId, []);
    children.get(meta.parentId).push(meta.id);
  });

  const removed = new Set();
  const passes = Math.max(
    1,
    Math.round(densityLimit * P.prunePassMultiplier * densityFactor)
  );

  function markSubtree(rootId) {
    const stack = [rootId];
    while (stack.length > 0) {
      const id = stack.pop();
      if (removed.has(id)) continue;
      removed.add(id);
      const kids = children.get(id) || [];
      for (let i = 0; i < kids.length; i += 1) stack.push(kids[i]);
    }
  }

  for (let pass = 0; pass < passes; pass += 1) {
    const candidates = [];
    shoots.forEach((meta) => {
      if (meta.isTrunk || removed.has(meta.id)) return;
      const significance = meta.maxThick * 1.8 + meta.segmentCount * 0.025 + (4 - meta.depth) * 0.08;
      candidates.push({ id: meta.id, weight: 1 / Math.max(0.08, significance) });
    });
    if (candidates.length === 0) break;

    let total = 0;
    for (let i = 0; i < candidates.length; i += 1) total += candidates[i].weight;
    let pick = r() * total;
    let chosen = candidates[candidates.length - 1].id;
    for (let i = 0; i < candidates.length; i += 1) {
      pick -= candidates[i].weight;
      if (pick <= 0) {
        chosen = candidates[i].id;
        break;
      }
    }
    markSubtree(chosen);
  }

  return removed;
}

function filterSegmentsByShootIds(sourceSegments, removeShootIds) {
  return sourceSegments.filter((s) => !removeShootIds.has(s.shootId));
}

/** @returns {null | { src: "decor" | "bloom"; i: number }} */
function getHoveredFlowerTarget() {
  if (!INTERACT.enabled || INTERACT.mode === "none" || !pointer.inside) return null;
  if (INTERACT.onlyAfterDraw && drawn < segments.length) return null;
  let best = null;
  let bestDist = INTERACT.hoverRadius;
  for (let i = 0; i < decorations.length; i += 1) {
    const d = decorations[i];
    if (d.type !== "flower" || d.anchor > drawn) continue;
    const dist = Math.hypot(pointer.x - d.x, pointer.y - d.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = { src: "decor", i };
    }
  }
  for (let i = 0; i < bloomFlowers.length; i += 1) {
    const d = bloomFlowers[i];
    const dist = Math.hypot(pointer.x - d.x, pointer.y - d.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = { src: "bloom", i };
    }
  }
  return best;
}

function distToSegmentRough(px, py, seg) {
  const d1 = Math.hypot(px - seg.x1, py - seg.y1);
  const d2 = Math.hypot(px - seg.x2, py - seg.y2);
  const dc = Math.hypot(px - seg.cx, py - seg.cy);
  return Math.min(d1, d2, dc);
}

function findNearestSegmentIndex(px, py, maxDist) {
  let best = -1;
  let bestD = maxDist;
  for (let i = 0; i < drawn; i += 1) {
    const d = distToSegmentRough(px, py, segments[i]);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function tryBloomLeaves(px, py) {
  if (!DECOR.leavesEnabled) return;
  if (drawn === 0 || segments.length === 0) return;

  const now = performance.now();
  const dx = px - bloomPointer.lastX;
  const dy = py - bloomPointer.lastY;
  const moved = Math.hypot(dx, dy);
  if (bloomPointer.primed && moved < DECOR.bloomMinMovePx && now - bloomPointer.lastTime < DECOR.bloomMinIntervalMs) {
    return;
  }
  if (now - bloomPointer.lastTime < DECOR.bloomMinIntervalMs && moved < DECOR.bloomMinMovePx) {
    return;
  }

  const idx = findNearestSegmentIndex(px, py, DECOR.bloomRadius);
  if (idx < 0) return;

  bloomPointer.lastX = px;
  bloomPointer.lastY = py;
  bloomPointer.lastTime = now;
  bloomPointer.primed = true;

  const seg = segments[idx];
  const a = angleOf(seg);
  const r = seededRng(((STATE.seed ^ bloomLeaves.length ^ idx) ^ (px * 9973 + py * 8191)) >>> 0);
  const n = Math.floor(randArr(r, DECOR.bloomLeavesPerPulse));
  for (let k = 0; k < n; k += 1) {
    const off = rand(r, -22, 22);
    const side = r() < 0.5 ? -1 : 1;
    bloomLeaves.push({
      x: seg.x2 + Math.cos(a + side * 0.9) * off + rand(r, -14, 14),
      y: seg.y2 + Math.sin(a + side * 0.9) * off + rand(r, -14, 14),
      angle: a + side * rand(r, 0.2, 1.15),
      size: randArr(r, DECOR.leafSize) * rand(r, 0.85, 1.55)
    });
  }
}

function addClickAzalea(px, py) {
  if (!DECOR.flowersEnabled) return;
  if (drawn === 0 || segments.length === 0) return;
  const idx = findNearestSegmentIndex(px, py, DECOR.clickFlowerRadius);
  if (idx < 0) return;

  const seg = segments[idx];
  const a = angleOf(seg);
  const rng = seededRng(((STATE.seed ^ bloomFlowers.length) ^ (px * 7919 + py * 7537)) >>> 0);
  const side = rng() < 0.5 ? -1 : 1;
  const fx = seg.x2 + Math.cos(a + side * 1.08) * rand(rng, 5, 14);
  const fy = seg.y2 + Math.sin(a + side * 1.08) * rand(rng, 5, 14);
  bloomFlowers.push({
    x: fx,
    y: fy,
    angle: a + rand(rng, -0.38, 0.38),
    size: randArr(rng, DECOR.flowerSize),
    spawnT: performance.now(),
    bloomSpin: rng() < 0.5 ? -1 : 1
  });

  if (!DECOR.leavesEnabled) return;
  const n = Math.floor(rand(rng, 3, 7));
  for (let j = 0; j < n; j += 1) {
    const burstSide = rng() < 0.5 ? -1 : 1;
    const orbit = rand(rng, 0.55, 1.55);
    bloomLeaves.push({
      x: fx + Math.cos(a + burstSide * orbit) * rand(rng, 6, 18),
      y: fy + Math.sin(a + burstSide * orbit) * rand(rng, 6, 18),
      angle: a + burstSide * rand(rng, 0.2, 1.05),
      size: randArr(rng, DECOR.leafSize) * rand(rng, 0.75, 1.2)
    });
  }
}

function drawLeaf(d) {
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.rotate(d.angle);
  ctx.fillStyle = `rgba(${DECOR.leafColor}, 0.85)`;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(d.size * 0.9, -d.size * 0.4, d.size * 1.45, 0);
  ctx.quadraticCurveTo(d.size * 0.9, d.size * 0.4, 0, 0);
  ctx.fill();
  ctx.strokeStyle = `rgba(${DECOR.leafColor}, 0.55)`;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(d.size * 1.3, 0);
  ctx.stroke();
  ctx.restore();
}

function flowerBloomFactors(d) {
  if (d.spawnT == null) return { extraScale: 1, extraRot: 0 };
  const elapsed = performance.now() - d.spawnT;
  const dur = DECOR.flowerSpawnMs;
  if (elapsed >= dur) return { extraScale: 1, extraRot: 0 };
  const t = elapsed / dur;
  const spin = d.bloomSpin != null ? d.bloomSpin : 1;
  const extraScale = 1 + DECOR.flowerBloomScale * Math.sin(t * Math.PI);
  const extraRot = spin * (1 - t) * (1 - t) * 0.48;
  return { extraScale, extraRot };
}

function drawAzalea(d, hovered) {
  const hoverScale = hovered && INTERACT.enabled && INTERACT.mode === "flowerScale" ? INTERACT.hoverScale : 1;
  const { extraScale, extraRot } = flowerBloomFactors(d);
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.rotate(d.angle + extraRot);
  ctx.scale(hoverScale * extraScale, hoverScale * extraScale);

  for (let p = 0; p < 5; p += 1) {
    const a = (Math.PI * 2 * p) / 5;
    ctx.save();
    ctx.rotate(a);
    ctx.fillStyle = `rgba(${DECOR.flowerPetal}, 0.86)`;
    ctx.beginPath();
    ctx.ellipse(d.size * 0.55, 0, d.size * 0.86, d.size * 0.52, 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(${DECOR.flowerPetalDark}, 0.26)`;
    ctx.beginPath();
    ctx.ellipse(d.size * 0.52, 0, d.size * 0.45, d.size * 0.22, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = `rgba(${DECOR.flowerCenter}, 0.92)`;
  ctx.beginPath();
  ctx.arc(0, 0, d.size * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function ensureDecorFlowerSpawnT(d) {
  if (d.type !== "flower" || d.spawnT != null) return;
  if (d.anchor < drawn) d.spawnT = performance.now();
}

function flowerAnimActive() {
  const now = performance.now();
  const margin = 24;
  const lim = DECOR.flowerSpawnMs + margin;
  for (let i = 0; i < decorations.length; i += 1) {
    const d = decorations[i];
    if (d.type === "flower" && d.spawnT != null && now - d.spawnT < lim) return true;
  }
  for (let i = 0; i < bloomFlowers.length; i += 1) {
    const f = bloomFlowers[i];
    if (f.spawnT != null && now - f.spawnT < lim) return true;
  }
  return false;
}

function scheduleAnimFrame() {
  if (raf != null) return;
  if (!flowerAnimActive()) return;
  if (animRaf != null) return;
  animRaf = requestAnimationFrame(() => {
    animRaf = null;
    renderFrame();
  });
}

function renderFrame() {
  const ht = getHoveredFlowerTarget();
  ctx.clearRect(0, 0, cvs.width, cvs.height);

  const glow = INTERACT.enabled && INTERACT.mode === "vineGlow" && ht != null;
  if (glow) {
    const hf = ht.src === "decor" ? decorations[ht.i] : bloomFlowers[ht.i];
    const halo = ctx.createRadialGradient(hf.x, hf.y, 18, hf.x, hf.y, Math.max(cvs.width, cvs.height) * 0.95);
    halo.addColorStop(0, "rgba(255, 245, 130, 0.65)");
    halo.addColorStop(0.25, "rgba(255, 236, 95, 0.35)");
    halo.addColorStop(1, "rgba(255, 236, 95, 0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, cvs.width, cvs.height);
  }

  if (glow) {
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowBlur = 42;
    ctx.shadowColor = `rgba(${INTERACT.glowColor}, ${INTERACT.glowAlpha})`;
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.shadowBlur = 0;
  }

  for (let i = 0; i < drawn; i += 1) {
    const s = segments[i];
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.quadraticCurveTo(s.cx, s.cy, s.x2, s.y2);
    let stroke;
    if (glow) stroke = `rgba(${INTERACT.glowColor}, 0.98)`;
    else stroke = `rgba(${P.color}, ${s.alpha})`;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(0.4, s.thick) * (glow ? 1.35 : 1);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.globalCompositeOperation = "source-over";

  for (let i = 0; i < decorations.length; i += 1) {
    const d = decorations[i];
    if (d.anchor > drawn) continue;
    if (d.type === "leaf") drawLeaf(d);
  }

  for (let i = 0; i < bloomLeaves.length; i += 1) {
    drawLeaf(bloomLeaves[i]);
  }

  for (let i = 0; i < decorations.length; i += 1) {
    const d = decorations[i];
    if (d.anchor > drawn) continue;
    if (d.type === "flower") {
      ensureDecorFlowerSpawnT(d);
      drawAzalea(d, ht != null && ht.src === "decor" && ht.i === i);
    }
  }

  for (let i = 0; i < bloomFlowers.length; i += 1) {
    drawAzalea(bloomFlowers[i], ht != null && ht.src === "bloom" && ht.i === i);
  }

  scheduleAnimFrame();
}

function drawFrame() {
  drawn = Math.min(drawn + P.growSpeed, segments.length);
  renderFrame();
  if (drawn < segments.length) {
    raf = requestAnimationFrame(drawFrame);
  } else {
    raf = null;
    if (P.autoPruneOnComplete && P.autoPruneDensity > 0) {
      runDestructivePrune(P.autoPruneDensity);
    }
    renderFrame();
  }
}

function runDestructivePrune(density) {
  if (baseSegments.length === 0) return;
  if (animRaf) cancelAnimationFrame(animRaf);
  animRaf = null;
  STATE.prunePass += 1;
  const pruneSeed = (STATE.seed ^ (STATE.prunePass * 0x9e3779b9)) >>> 0;
  const removeIds = computePruneRemovalShootIds(baseSegments, density, pruneSeed);
  baseSegments = filterSegmentsByShootIds(baseSegments, removeIds);
  segments = baseSegments;
  bloomLeaves = [];
  bloomFlowers = [];
  bloomPointer.primed = false;
  decorations = buildDecorations(segments, STATE.seed ^ 0x9e3779b9, STATE.leafMultiplier, {
    initialSparse: true
  });
  drawn = segments.length;
}

function regrow() {
  if (raf) cancelAnimationFrame(raf);
  if (animRaf) cancelAnimationFrame(animRaf);
  animRaf = null;
  ctx.clearRect(0, 0, cvs.width, cvs.height);
  STATE.seed = Date.now();
  STATE.prunePass = 0;
  baseSegments = buildVines(STATE.seed);
  segments = baseSegments;
  bloomLeaves = [];
  bloomFlowers = [];
  bloomPointer.primed = false;
  decorations = buildDecorations(segments, STATE.seed ^ 0x9e3779b9, STATE.leafMultiplier, {
    initialSparse: true
  });
  drawn = 0;
  raf = requestAnimationFrame(drawFrame);
}

window.addEventListener("resize", () => {
  resize();
  renderFrame();
});

cvs.addEventListener("click", (event) => {
  const rect = cvs.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  addClickAzalea(x, y);
  if (!raf) renderFrame();
});
cvs.addEventListener("mousemove", (event) => {
  const rect = cvs.getBoundingClientRect();
  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;
  pointer.inside = true;
  tryBloomLeaves(pointer.x, pointer.y);
  if (!raf) renderFrame();
});
cvs.addEventListener("mouseleave", () => {
  pointer.inside = false;
  if (!raf) renderFrame();
});

resize();
regrow();
