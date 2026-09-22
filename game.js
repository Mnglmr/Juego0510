const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;
const WORLD_W = 4300;

const startScreen = document.getElementById("startScreen");
const startButton = document.getElementById("startButton");
const message = document.getElementById("message");
const livesLabel = document.getElementById("livesLabel");

const keys = {};
let running = false;
let cameraX = 0;
let lastTime = 0;
let transition = 0;

const player = {
  x: 90, y: 450, w: 30, h: 42,
  vx: 0, vy: 0,
  speed: 270,
  jump: 650,
  grounded: false,
  lives: 3,
  invincible: 0
};

const platforms = [
  {x: 0, y: 565, w: 700, h: 83},
  {x: 760, y: 565, w: 650, h: 83},
  {x: 1470, y: 565, w: 780, h: 83},
  {x: 2310, y: 565, w: 640, h: 83},
  {x: 3010, y: 565, w: 700, h: 83},
  {x: 3770, y: 565, w: 530, h: 83},

  {x: 420, y: 470, w: 170, h: 28},
  {x: 900, y: 450, w: 170, h: 28},
  {x: 1260, y: 395, w: 150, h: 28},
  {x: 1660, y: 450, w: 190, h: 28},
  {x: 2040, y: 380, w: 160, h: 28},
  {x: 2500, y: 455, w: 180, h: 28},
  {x: 3150, y: 430, w: 190, h: 28},
  {x: 3510, y: 365, w: 150, h: 28}
];

const boxes = [
  {x: 280, y: 525, w: 40, h: 40},
  {x: 610, y: 525, w: 40, h: 40},
  {x: 1090, y: 525, w: 40, h: 40},
  {x: 1770, y: 525, w: 40, h: 40},
  {x: 1810, y: 525, w: 40, h: 40},
  {x: 2750, y: 525, w: 40, h: 40},
  {x: 3360, y: 525, w: 40, h: 40}
];

const enemies = [
  {x: 520, y: 520, w: 44, h: 45, min: 470, max: 670, vx: 70},
  {x: 1380, y: 520, w: 44, h: 45, min: 1100, max: 1400, vx: -65},
  {x: 2680, y: 520, w: 44, h: 45, min: 2400, max: 2900, vx: 75}
];

const goal = {x: 4010, y: 435, w: 92, h: 130};

const lights = [
  120, 350, 590, 830, 1130, 1430, 1720, 2010, 2290,
  2580, 2880, 3180, 3460, 3710, 3910
];

function resetPlayer() {
  player.x = 90;
  player.y = 450;
  player.vx = 0;
  player.vy = 0;
  player.lives = 3;
  player.invincible = 0;
  cameraX = 0;
  transition = 0;
  updateLives();
  enemies[0].x = 520;
  enemies[1].x = 1380;
  enemies[2].x = 2680;
}

function updateLives() {
  livesLabel.textContent = "❤️".repeat(player.lives) + "🖤".repeat(3 - player.lives);
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

function resolveHorizontal(obj, solids) {
  for (const s of solids) {
    if (!rectsOverlap(obj, s)) continue;
    if (obj.vx > 0) obj.x = s.x - obj.w;
    if (obj.vx < 0) obj.x = s.x + s.w;
    obj.vx = 0;
  }
}

function resolveVertical(obj, solids) {
  obj.grounded = false;
  for (const s of solids) {
    if (!rectsOverlap(obj, s)) continue;

    if (obj.vy > 0) {
      obj.y = s.y - obj.h;
      obj.vy = 0;
      obj.grounded = true;
    } else if (obj.vy < 0) {
      obj.y = s.y + s.h;
      obj.vy = 0;
    }
  }
}

function hurt() {
  if (player.invincible > 0 || transition > 0) return;
  player.lives--;
  updateLives();
  player.invincible = 1.2;
  player.vy = -420;
  player.vx = -Math.sign(player.vx || 1) * 180;

  if (player.lives <= 0) {
    running = false;
    showMessage("Fin del intento", "Prueba nuevamente el nivel 1.", "Volver a jugar", () => {
      hideMessage();
      resetPlayer();
      running = true;
      lastTime = performance.now();
    });
  }
}

function update(dt) {
  if (!running || transition > 0) return;

  player.invincible = Math.max(0, player.invincible - dt);

  let dir = 0;
  if (keys.ArrowLeft || keys.KeyA) dir -= 1;
  if (keys.ArrowRight || keys.KeyD) dir += 1;

  player.vx = dir * player.speed;
  player.vy += 1750 * dt;

  player.x += player.vx * dt;
  resolveHorizontal(player, [...platforms, ...boxes]);

  player.y += player.vy * dt;
  resolveVertical(player, [...platforms, ...boxes]);

  if ((keys.Space || keys.ArrowUp || keys.KeyW) && player.grounded && !keys._jumpLock) {
    player.vy = -player.jump;
    player.grounded = false;
    keys._jumpLock = true;
  }
  if (!(keys.Space || keys.ArrowUp || keys.KeyW)) keys._jumpLock = false;

  player.x = Math.max(0, Math.min(WORLD_W - player.w, player.x));

  if (player.y > H + 200) {
    hurt();
    player.x = Math.max(50, player.x - 220);
    player.y = 300;
    player.vy = -350;
  }

  for (const enemy of enemies) {
    enemy.x += enemy.vx * dt;
    if (enemy.x < enemy.min || enemy.x + enemy.w > enemy.max) {
      enemy.vx *= -1;
    }

    if (rectsOverlap(player, enemy)) {
      const playerBottom = player.y + player.h;
      const enemyTop = enemy.y;
      if (player.vy > 0 && playerBottom - enemyTop < 18) {
        enemy.x = enemy.min;
        player.vy = -470;
      } else {
        hurt();
      }
    }
  }

  if (rectsOverlap(player, goal)) {
    transition = 1;
  }

  const targetCamera = player.x - W * 0.38;
  cameraX += (Math.max(0, Math.min(WORLD_W - W, targetCamera)) - cameraX) * Math.min(1, dt * 7);
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#070812");
  g.addColorStop(.55, "#11142a");
  g.addColorStop(1, "#080a14");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Soft distant glow
  const glow = ctx.createRadialGradient(W * .5, 180, 10, W * .5, 180, 390);
  glow.addColorStop(0, "rgba(103, 91, 255, .18)");
  glow.addColorStop(1, "rgba(103, 91, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 430);

  // Distant silhouettes
  ctx.fillStyle = "#0d1020";
  for (let x = -((cameraX * .15) % 260) - 260; x < W + 300; x += 260) {
    ctx.beginPath();
    ctx.moveTo(x, 430);
    ctx.lineTo(x + 100, 330);
    ctx.lineTo(x + 210, 430);
    ctx.closePath();
    ctx.fill();
  }

  // Neon bars
  for (const worldX of lights) {
    const x = worldX - cameraX;
    if (x < -50 || x > W + 50) continue;
    const hue = Math.round(worldX / 240) % 2 === 0 ? "#7f72ff" : "#53dce5";
    ctx.save();
    ctx.globalAlpha = .18;
    ctx.fillStyle = hue;
    ctx.fillRect(x - 22, 105, 44, 390);
    ctx.globalAlpha = .75;
    ctx.fillRect(x - 3, 112, 6, 360);
    ctx.restore();
  }

  // Small stars/particles
  for (let i = 0; i < 55; i++) {
    const x = (i * 233 - cameraX * .25) % (W + 260) - 130;
    const y = 65 + ((i * 79) % 280);
    const size = i % 4 === 0 ? 3 : 1.5;
    ctx.fillStyle = i % 3 === 0 ? "#8f84ff" : "#d6f9ff";
    ctx.globalAlpha = .5 + (i % 5) * .08;
    ctx.fillRect(x, y, size, size);
  }
  ctx.globalAlpha = 1;
}

function drawWorld() {
  ctx.save();
  ctx.translate(-cameraX, 0);

  // Ground
  for (const p of platforms) {
    ctx.fillStyle = "#171a2d";
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = "#303653";
    ctx.fillRect(p.x, p.y, p.w, 7);
    ctx.fillStyle = "#0c0e18";
    for (let x = p.x + 12; x < p.x + p.w; x += 42) {
      ctx.fillRect(x, p.y + 22, 22, 5);
    }
  }

  // Boxes
  for (const b of boxes) drawBox(b);

  // Enemies
  for (const e of enemies) drawPibble(e);

  // Goal
  drawPhone(goal);

  // Player
  drawPlayer(player);

  ctx.restore();
}

function drawBox(b) {
  ctx.fillStyle = "#9b663e";
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = "#d59a60";
  ctx.fillRect(b.x + 3, b.y + 3, b.w - 6, 5);
  ctx.strokeStyle = "#4d3020";
  ctx.lineWidth = 4;
  ctx.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
  ctx.beginPath();
  ctx.moveTo(b.x + 8, b.y + 8);
  ctx.lineTo(b.x + b.w - 8, b.y + b.h - 8);
  ctx.moveTo(b.x + b.w - 8, b.y + 8);
  ctx.lineTo(b.x + 8, b.y + b.h - 8);
  ctx.stroke();
}

function drawPibble(e) {
  const x = e.x, y = e.y;
  ctx.save();

  // shadow
  ctx.fillStyle = "rgba(0,0,0,.28)";
  ctx.fillRect(x + 3, y + e.h - 2, 40, 7);

  // ears
  ctx.fillStyle = "#8c8f9d";
  ctx.fillRect(x + 4, y + 8, 11, 15);
  ctx.fillRect(x + 29, y + 8, 11, 15);

  // body/head
  ctx.fillStyle = "#b8bbc5";
  ctx.fillRect(x + 9, y + 9, 27, 27);
  ctx.fillStyle = "#d0d2da";
  ctx.fillRect(x + 13, y + 5, 19, 23);

  // muzzle
  ctx.fillStyle = "#d9dbe2";
  ctx.fillRect(x + 16, y + 23, 17, 12);

  // eyes
  ctx.fillStyle = "#202230";
  ctx.fillRect(x + 17, y + 16, 4, 4);
  ctx.fillRect(x + 27, y + 16, 4, 4);

  // nose
  ctx.fillStyle = "#2b2d3a";
  ctx.fillRect(x + 22, y + 25, 6, 5);

  // legs
  ctx.fillStyle = "#9295a2";
  ctx.fillRect(x + 11, y + 34, 7, 11);
  ctx.fillRect(x + 29, y + 34, 7, 11);

  ctx.restore();
}

function drawPhone(g) {
  const x = g.x, y = g.y;
  const pulse = Math.sin(performance.now() / 300) * 3;

  ctx.save();
  ctx.globalAlpha = .18;
  ctx.fillStyle = "#8d7cff";
  ctx.fillRect(x - 22 - pulse, y - 18 - pulse, g.w + 44 + pulse*2, g.h + 36 + pulse*2);
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#0a0b12";
  ctx.fillRect(x, y, g.w, g.h);
  ctx.fillStyle = "#34384e";
  ctx.fillRect(x - 5, y - 5, g.w + 10, g.h + 10);
  ctx.fillStyle = "#111323";
  ctx.fillRect(x, y, g.w, g.h);

  ctx.fillStyle = "#6e63df";
  ctx.fillRect(x + 9, y + 18, g.w - 18, 4);
  ctx.fillStyle = "#53dce5";
  ctx.fillRect(x + 9, y + 37, g.w - 18, 5);
  ctx.fillStyle = "#8d7cff";
  ctx.fillRect(x + 9, y + 56, g.w - 28, 5);

  ctx.fillStyle = "#d9dcf0";
  ctx.fillRect(x + 35, y + 8, 20, 4);

  ctx.fillStyle = "#171a2b";
  ctx.fillRect(x + 36, y + g.h - 16, 20, 6);

  ctx.fillStyle = "#d9dcf0";
  ctx.font = "bold 13px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("ENTRAR", x + g.w/2, y + g.h + 24);

  ctx.restore();
}

function drawPlayer(p) {
  if (p.invincible > 0 && Math.floor(p.invincible * 14) % 2 === 0) return;

  const x = p.x, y = p.y;
  ctx.save();

  // shadow
  ctx.fillStyle = "rgba(0,0,0,.3)";
  ctx.fillRect(x - 2, y + p.h + 2, p.w + 4, 6);

  // simple placeholder character
  ctx.fillStyle = "#f0c9a7";
  ctx.fillRect(x + 7, y, 16, 15);
  ctx.fillStyle = "#25283b";
  ctx.fillRect(x + 5, y - 3, 20, 7);

  ctx.fillStyle = "#7f72ff";
  ctx.fillRect(x + 4, y + 14, 22, 17);

  ctx.fillStyle = "#5b52b8";
  ctx.fillRect(x + 4, y + 28, 9, 14);
  ctx.fillRect(x + 17, y + 28, 9, 14);

  ctx.fillStyle = "#fff";
  ctx.fillRect(x + 11, y + 6, 3, 3);
  ctx.fillRect(x + 18, y + 6, 3, 3);

  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = "rgba(7,8,18,.65)";
  ctx.fillRect(18, 18, 260, 44);
  ctx.fillStyle = "#e9ebf7";
  ctx.font = "bold 14px system-ui";
  ctx.fillText("LLEGA AL TELÉFONO", 34, 46);

  const progress = Math.min(1, player.x / goal.x);
  ctx.fillStyle = "#242840";
  ctx.fillRect(300, 30, 330, 10);
  ctx.fillStyle = "#7f72ff";
  ctx.fillRect(300, 30, 330 * progress, 10);
}

function draw() {
  drawBackground();
  drawWorld();
  drawHUD();

  if (transition > 0) {
    transition += 0.028;
    const alpha = Math.min(1, transition);
    ctx.fillStyle = `rgba(4,5,12,${alpha})`;
    ctx.fillRect(0, 0, W, H);

    if (transition > 1.1) {
      running = false;
      showMessage(
        "¡Nivel 1 completado!",
        "Has llegado al portal. El Nivel 2 quedará para la siguiente versión.",
        "Continuar",
        () => {
          hideMessage();
          resetPlayer();
          running = true;
          lastTime = performance.now();
        }
      );
      transition = 0;
    }
  }
}

function loop(time) {
  const dt = Math.min(0.033, (time - lastTime) / 1000 || 0);
  lastTime = time;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function showMessage(title, text, buttonText, callback) {
  message.innerHTML = `
    <h2>${title}</h2>
    <p>${text}</p>
    <button id="messageButton">${buttonText}</button>
  `;
  message.classList.remove("hidden");
  document.getElementById("messageButton").onclick = callback;
}

function hideMessage() {
  message.classList.add("hidden");
}

startButton.addEventListener("click", () => {
  resetPlayer();
  startScreen.classList.add("hidden");
  running = true;
  lastTime = performance.now();
});

window.addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(e.code)) {
    e.preventDefault();
  }
  keys[e.code] = true;
});

window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

updateLives();
requestAnimationFrame(loop);
