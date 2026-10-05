// The warm-up rally: a top-down court on the 240 × 64 grid from game-court-midrally.svg.
// You (left) return the ball to Bradly (right); every return is a rally. Miss once and it's over.

const W = 240;
const H = 64;
const NARROW_VIEW = { x: 25, w: 186 }; // the mobile frame crops the court to x 25–211
const WIDE_VIEW = { x: 0, w: W };

const YOU_X = 34;        // sprite origin; racket tip at x 58
const CPU_X = 206;       // flipped sprite origin; racket tip at x 182
const HIT_LEFT = 59;
const HIT_RIGHT = 182;
const BALL = 3;
const Y_MIN = 0;
const Y_MAX = 52;

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

export function createGame({ canvas, narrowQuery, onRally, onOver }) {
  const ctx = canvas.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const color = (name) => css.getPropertyValue(`--${name}`).trim();
  const C = {
    pink: color('pink'), chalk: color('chalk'), deep: color('deep'), haze: color('haze'),
    cyan: color('cyan'), ball: color('ball'), yellow: color('yellow'), midnight: color('midnight'),
  };
  const you = loadImage('assets/player-top-you.svg');
  const cpu = loadImage('assets/player-top-cpu.svg');

  let view = WIDE_VIEW;
  let running = false;
  let raf = 0;
  let last = 0;
  let s;

  const keys = new Set();
  let pointerY = null;

  function setView() {
    view = narrowQuery.matches ? NARROW_VIEW : WIDE_VIEW;
    canvas.width = view.w;
    canvas.height = H;
    draw();
  }

  function reset() {
    s = {
      py: 22, cy: 30, rallies: 0, speed: 62,
      ball: { x: 176, y: 32, vx: -62, vy: (Math.random() - 0.5) * 40 },
      trail: [], trailClock: 0, plus: 0, cpuError: 0, serveDelay: 0.6,
    };
  }

  function serveFromCpu() {
    s.ball = { x: HIT_RIGHT - BALL - 1, y: s.cy + 2, vx: -s.speed, vy: (Math.random() - 0.5) * 40 };
    s.trail = [];
    s.serveDelay = 0.5;
  }

  function returnAngle(ballY, originY) {
    return (ballY + BALL / 2 - (originY + 5)) * 7 + (Math.random() - 0.5) * 10;
  }

  function update(dt) {
    // You
    const step = 70 * dt;
    if (keys.has('up')) s.py -= step;
    if (keys.has('down')) s.py += step;
    if (pointerY !== null) {
      const target = pointerY - 5;
      s.py += Math.max(-130 * dt, Math.min(130 * dt, target - s.py));
    }
    s.py = Math.max(Y_MIN, Math.min(Y_MAX, s.py));

    // Bradly tracks the ball when it's coming his way, with a little error
    const cpuTarget = s.ball.vx > 0 ? s.ball.y - 2 + s.cpuError : 27;
    const cpuSpeed = Math.min(95, 48 + s.rallies * 2.5) * dt;
    s.cy += Math.max(-cpuSpeed, Math.min(cpuSpeed, cpuTarget - s.cy));
    s.cy = Math.max(Y_MIN, Math.min(Y_MAX, s.cy));

    if (s.plus > 0) s.plus -= dt;
    if (s.serveDelay > 0) { s.serveDelay -= dt; return; }

    const b = s.ball;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.y < 3) { b.y = 3; b.vy = Math.abs(b.vy); }
    if (b.y > 61 - BALL) { b.y = 61 - BALL; b.vy = -Math.abs(b.vy); }

    s.trailClock += dt;
    if (s.trailClock > 1 / 24) {
      s.trailClock = 0;
      s.trail.push({ x: b.x, y: b.y });
      if (s.trail.length > 3) s.trail.shift();
    }

    const overlaps = (originY) => b.y + BALL >= originY && b.y <= originY + 11;

    if (b.vx < 0 && b.x <= HIT_LEFT && b.x > HIT_LEFT - 6 && overlaps(s.py)) {
      s.rallies += 1;
      s.speed = Math.min(150, 62 + s.rallies * 5);
      b.x = HIT_LEFT;
      b.vx = s.speed;
      b.vy = returnAngle(b.y, s.py);
      s.plus = 0.6;
      s.cpuError = (Math.random() - 0.5) * Math.min(10, 2 + s.rallies * 0.4);
      onRally(s.rallies);
    } else if (b.vx > 0 && b.x + BALL >= HIT_RIGHT && b.x + BALL < HIT_RIGHT + 6 && overlaps(s.cy)) {
      b.x = HIT_RIGHT - BALL;
      b.vx = -s.speed;
      b.vy = returnAngle(b.y, s.cy);
    }

    if (b.x < 14) {
      stop();
      onOver(s.rallies);
    } else if (b.x > W - 14) {
      serveFromCpu(); // Bradly missed: he serves again and the rally count carries on
    }
  }

  function rect(fill, x, y, w, h) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }

  function drawCourt() {
    rect(C.pink, 57, 5, 126, 54);
    [[57, 5, 126, 1], [57, 58, 126, 1], [57, 5, 1, 54], [182, 5, 1, 54], [57, 11, 126, 1], [57, 52, 126, 1],
      [86, 11, 1, 42], [153, 11, 1, 42], [86, 31, 68, 1], [58, 31, 2, 1], [180, 31, 2, 1]]
      .forEach(([x, y, w, h]) => rect(C.chalk, x, y, w, h));
    ctx.globalAlpha = 0.3; rect(C.deep, 121, 5, 1, 54); ctx.globalAlpha = 1;
    rect(C.chalk, 119, 3, 2, 58);
    rect(C.haze, 118, 2, 4, 2);
    rect(C.haze, 118, 60, 4, 2);
    // Your movement track
    for (let y = 6; y <= 58; y += 4) rect(C.cyan, 28, y, 1, 2);
    [[28, 1, 1], [27, 2, 3], [26, 3, 5], [26, 60, 5], [27, 61, 3], [28, 62, 1]]
      .forEach(([x, y, w]) => rect(C.cyan, x, y, w, 1));
  }

  function draw() {
    if (!s) reset();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.translate(-view.x, 0);
    drawCourt();

    const py = Math.round(s.py);
    const cy = Math.round(s.cy);
    if (you.complete) ctx.drawImage(you, YOU_X, py - 1, 26, 12);
    if (cpu.complete) {
      ctx.save();
      ctx.translate(CPU_X, cy - 1);
      ctx.scale(-1, 1);
      ctx.drawImage(cpu, 0, 0, 26, 12);
      ctx.restore();
    }

    const b = s.ball;
    const bx = Math.round(b.x);
    const by = Math.round(b.y);
    [0.2, 0.35, 0.55].forEach((alpha, i) => {
      const t = s.trail[i];
      if (!t) return;
      ctx.globalAlpha = alpha;
      rect(C.chalk, Math.round(t.x), Math.round(t.y), 2, 2);
    });
    ctx.globalAlpha = 0.5; rect(C.deep, bx + 1, by + 2, BALL, 2); ctx.globalAlpha = 1;
    rect(C.ball, bx, by, BALL, BALL);
    rect('#FFFFFF', bx, by, 1, 1);

    if (s.plus > 0) {
      ctx.fillStyle = C.yellow;
      ctx.font = "4px 'Press Start 2P', monospace";
      ctx.fillText('+1', 48, Math.max(6, py - 3));
    }
  }

  function frame(t) {
    const dt = Math.min(1 / 30, (t - last) / 1000 || 0);
    last = t;
    update(dt);
    draw();
    if (running) raf = requestAnimationFrame(frame);
  }

  const KEYMAP = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down' };
  function onKeyDown(e) {
    if (e.key === 'Escape') { stop(); onOver(s.rallies); return; }
    const k = KEYMAP[e.key];
    if (!k) return;
    e.preventDefault();
    keys.add(k);
  }
  function onKeyUp(e) {
    const k = KEYMAP[e.key];
    if (k) keys.delete(k);
  }

  function logicalY(clientY) {
    const r = canvas.getBoundingClientRect();
    const scale = Math.min(r.width / view.w, r.height / H);
    const offsetY = (r.height - H * scale) / 2;
    return (clientY - r.top - offsetY) / scale;
  }
  function onPointer(e) {
    if (e.type === 'pointerdown') canvas.setPointerCapture(e.pointerId);
    if (e.type === 'pointerdown' || e.buttons || e.pointerType === 'touch') pointerY = logicalY(e.clientY);
  }
  function onPointerEnd() { pointerY = null; }

  canvas.addEventListener('pointerdown', onPointer);
  canvas.addEventListener('pointermove', onPointer);
  canvas.addEventListener('pointerup', onPointerEnd);
  canvas.addEventListener('pointercancel', onPointerEnd);
  narrowQuery.addEventListener('change', setView);

  function start() {
    reset();
    setView();
    running = true;
    keys.clear();
    pointerY = null;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    keys.clear();
    pointerY = null;
  }

  // Attract mode: the court and players at rest, drawn once (images may still be loading).
  function showIdle() {
    reset();
    setView();
    [you, cpu].forEach((img) => { if (!img.complete) img.addEventListener('load', () => { if (!running) draw(); }, { once: true }); });
  }

  return { start, stop, showIdle, get running() { return running; }, get rallies() { return s ? s.rallies : 0; } };
}
