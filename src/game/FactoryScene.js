import Phaser from "phaser";
import { difficultyLevels, medalForScore, normalizeScore } from "./gameDefinitions";

const W = 960;
const H = 640;
const FONT = "'Inter', 'Trebuchet MS', sans-serif";

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:      0x050d17,
  surface: 0x0a1628,
  panel:   0x0d1e35,
  border:  0x1c3252,
  cyan:    0x67e8f9,
  gold:    0xffd166,
  mint:    0x4ade80,
  danger:  0xf87171,
  purple:  0xa78bfa,
  orange:  0xfb923c,
  text:    0xe8f4ff,
  muted:   0x7ca8c4,
};

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// Filled + stroked rounded rect via Graphics
function gfxRR(g, x, y, w, h, r, fill, fAlpha, stroke, sAlpha) {
  if (fill !== undefined) {
    g.fillStyle(fill, fAlpha ?? 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
  }
  if (stroke !== undefined) {
    g.lineStyle(1, stroke, sAlpha ?? 1);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);
  }
}

// Invisible hit rect — keeps interactive surface separate from visual
function hitRect(scene, x, y, w, h) {
  return scene.add
    .rectangle(x, y, w, h, 0xffffff, 0)
    .setInteractive({ useHandCursor: true });
}

// ── FactoryScene ──────────────────────────────────────────────────────────────
export class FactoryScene extends Phaser.Scene {
  constructor() {
    super("FactoryScene");
    this.activeCleanup = [];
    this.pendingConfig = null;
  }

  create() {
    if (this.pendingConfig) {
      const { game, onComplete, difficulty } = this.pendingConfig;
      this.pendingConfig = null;
      this.startGame(game, onComplete, difficulty);
    }
  }

  configure(game, onComplete, difficulty = "medium") {
    if (this.sys?.isActive()) {
      this.startGame(game, onComplete, difficulty);
      return;
    }
    this.pendingConfig = { game, onComplete, difficulty };
  }

  startGame(game, onComplete, difficulty = "medium") {
    this.gameConfig = game;
    this.finishCallback = onComplete;
    this.difficultyId = difficulty;
    this.difficulty =
      difficultyLevels.find((level) => level.id === difficulty) ??
      difficultyLevels.find((level) => level.id === "medium");
    this.activeCleanup.forEach((fn) => fn());
    this.activeCleanup = [];
    this.children.removeAll();
    this.input.removeAllListeners();
    this.tweens.killAll();
    this.time.removeAllEvents();

    this.score = 0;
    this.combo = 0;
    this.remaining = game.duration;
    this.statLabel = "";
    this.finished = false;

    this.drawBackground();
    this.buildHud();

    if (game.duration) {
      this.timerEvent = this.time.addEvent({
        delay: 1000,
        repeat: game.duration - 1,
        callback: () => {
          this.remaining -= 1;
          this.timerText.setText(`${this.remaining}`);
          if (this.remaining <= 5 && this.remaining > 0) {
            this.timerText.setColor("#f87171");
            this.tweens.add({
              targets: this.timerText,
              scaleX: 1.3,
              scaleY: 1.3,
              yoyo: true,
              duration: 160,
            });
          }
          if (this.remaining <= 0) this.completeGame();
        },
      });
    } else {
      this.timerEvent = null;
      this.timerText.setText(game.durationLabel ?? "");
    }

    if (game.id === "speed")   this.setupSpeedGame();
    if (game.id === "power")   this.setupPowerGame();
    if (game.id === "thermal") this.setupThermalGame();
    if (game.id === "cores")   this.setupCoreGame();
    if (game.id === "routing") this.setupRoutingGame();
    if (game.id === "scan")    this.setupScanGame();
  }

  getDifficultySettings() {
    const id = this.difficultyId ?? "medium";
    return {
      speedSpawnerDelay: id === "easy" ? 620 : id === "hard" ? 370 : 470,
      speedHitWindow: id === "easy" ? 64 : id === "hard" ? 38 : 48,
      speedPerfectWindow: id === "easy" ? 22 : id === "hard" ? 12 : 16,
      speedTravelStep: id === "easy" ? 2.7 : id === "hard" ? 5.5 : 4.8,
      powerSpawnDelay: id === "easy" ? 520 : id === "hard" ? 320 : 420,
      powerDrift: id === "easy" ? 0.9 : id === "hard" ? 1.45 : 1.2,
      powerStableReward: id === "easy" ? 14 : id === "hard" ? 10 : 12,
      powerOverloadPenalty: id === "easy" ? 32 : id === "hard" ? 60 : 46,
      powerBadCatchPenalty: id === "easy" ? 22 : id === "hard" ? 38 : 30,
      powerMissGoodPenalty: id === "easy" ? 10 : id === "hard" ? 18 : 14,
      powerBadLevelSpike: id === "easy" ? 1.15 : id === "hard" ? 1.35 : 1.25,
      powerEndOverloadPenalty: id === "easy" ? 22 : id === "hard" ? 38 : 30,
      powerOverloadCooldownMs: id === "easy" ? 1200 : id === "hard" ? 900 : 1050,
      thermalDeadlineMin: id === "easy" ? 2100 : id === "hard" ? 1450 : 1700,
      thermalDeadlineMax: id === "easy" ? 3200 : id === "hard" ? 2150 : 2600,
      thermalBurnPenalty: id === "easy" ? 100 : id === "hard" ? 170 : 140,
      thermalPassiveReward: id === "easy" ? 0.46 : id === "hard" ? 0.28 : 0.38,
      coreSpawnDelay: id === "easy" ? 980 : id === "hard" ? 620 : 760,
      coreBacklogPenalty: id === "easy" ? 18 : id === "hard" ? 34 : 26,
      coreMissPenalty: id === "easy" ? 50 : id === "hard" ? 92 : 70,
      // Routing tuning:
      // - Medium now matches the previous Hard profile.
      // - Hard is a new tougher tier with denser, tighter hazard fields.
      routingHazardPenalty: id === "easy" ? 95 : id === "hard" ? 250 : 200,
      routingCompletionBonus: id === "easy" ? 520 : id === "hard" ? 280 : 330,
      routingBaseHazards: id === "easy" ? 4 : id === "hard" ? 20 : 8,
      routingHazardsPerRound: id === "easy" ? 1 : id === "hard" ? 5.1 : 2,
      routingHazardRadiusScale: id === "easy" ? 1 : id === "hard" ? 1.42 : 1.28,
      routingRoundMinScore: id === "easy" ? 240 : id === "hard" ? 40 : 90,
      scanRows: id === "easy" ? 6 : id === "hard" ? 8 : 7,
      scanCols: id === "easy" ? 6 : id === "hard" ? 8 : 7,
      scanTargetWindowMs: id === "easy" ? 4200 : id === "hard" ? 2300 : 3200,
      scanWrongPenalty: id === "easy" ? 46 : id === "hard" ? 92 : 68,
      scanTimeoutPenalty: id === "easy" ? 70 : id === "hard" ? 130 : 95,
      scoreMultiplier: this.difficulty?.scoreMultiplier ?? 1,
    };
  }

  // ── Background ─────────────────────────────────────────────────────────────

  drawBackground() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x0c1e34, 0x050d17, 0x050d17, 0x0c1e34, 1);
    g.fillRect(0, 0, W, H);

    // Circuit grid
    for (let x = 0; x < W; x += 48) {
      g.lineStyle(1, C.cyan, 0.055);
      g.lineBetween(x, 0, x, H);
    }
    for (let y = 48; y < H; y += 48) {
      g.lineStyle(1, C.gold, 0.04);
      g.lineBetween(0, y, W, y);
    }

    // Animated intersection dots
    for (let xi = 48; xi < W; xi += 96) {
      for (let yi = 48; yi < H; yi += 96) {
        if (Math.random() < 0.18) {
          const dot = this.add.circle(xi, yi, 2, C.cyan, 0.4)
            .setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({
            targets: dot,
            alpha: { from: 0.08, to: 0.7 },
            duration: 1200 + Math.random() * 2200,
            yoyo: true,
            repeat: -1,
            delay: Math.random() * 2000,
          });
        }
      }
    }

    // Ambient corner glows
    this.add.circle(0, 0, 240, C.cyan, 0.06).setBlendMode(Phaser.BlendModes.ADD);
    this.add.circle(W, H, 200, C.gold, 0.05).setBlendMode(Phaser.BlendModes.ADD);
    this.add.circle(W, 0, 160, C.purple, 0.04).setBlendMode(Phaser.BlendModes.ADD);
  }

  // ── HUD ────────────────────────────────────────────────────────────────────

  buildHud() {
    const g = this.add.graphics().setDepth(10);
    g.fillStyle(C.surface, 0.96);
    g.fillRoundedRect(14, 7, W - 28, 64, 10);
    g.lineStyle(1, C.border, 1);
    g.strokeRoundedRect(14, 7, W - 28, 64, 10);
    // Accent top line
    g.lineStyle(2, C.cyan, 0.45);
    g.lineBetween(26, 7, W - 26, 7);

    // Separator before score
    g.lineStyle(1, C.border, 1);
    g.lineBetween(W - 260, 16, W - 260, 62);
    g.lineBetween(W - 120, 16, W - 120, 62);

    this.add.text(32, 16, this.gameConfig.title, {
      fontFamily: FONT, fontSize: "20px", fontStyle: "bold", color: "#e8f4ff",
    }).setDepth(11);

    this.add.text(32, 46, this.gameConfig.metric.toUpperCase(), {
      fontFamily: FONT, fontSize: "10px", fontStyle: "bold", color: "#67e8f9",
      letterSpacing: 2,
    }).setDepth(11);

    this.add.text(W - 248, 14, "SCORE", {
      fontFamily: FONT, fontSize: "9px", fontStyle: "bold", color: "#4a7a9b",
      letterSpacing: 2,
    }).setDepth(11);

    this.scoreText = this.add.text(W - 248, 28, "0", {
      fontFamily: FONT, fontSize: "26px", fontStyle: "bold", color: "#ffd166",
    }).setDepth(11);

    this.add.text(W - 108, 14, "TIME", {
      fontFamily: FONT, fontSize: "9px", fontStyle: "bold", color: "#4a7a9b",
      letterSpacing: 2,
    }).setDepth(11);

    this.timerText = this.add.text(W - 108, 28, `${this.remaining ?? ""}`, {
      fontFamily: FONT, fontSize: "26px", fontStyle: "bold", color: "#e8f4ff",
    }).setDepth(11);

    this.comboText = this.add
      .text(W / 2, 29, "", {
        fontFamily: FONT, fontSize: "16px", fontStyle: "bold", color: "#a78bfa",
        stroke: "#050d17", strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(11);
  }

  updateHud() {
    this.scoreText.setText(`${Math.round(this.score)}`);
    if (this.combo > 1) {
      this.comboText.setText(`×${this.combo} COMBO`);
    } else {
      this.comboText.setText("");
    }
  }

  // ── Burst ──────────────────────────────────────────────────────────────────

  addBurst(x, y, color) {
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const dist = Phaser.Math.Between(28, 72);
      const size = Phaser.Math.Between(2, 7);
      const p = this.add
        .circle(x, y, size, color, 1)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(60);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.1,
        duration: Phaser.Math.Between(240, 480),
        ease: "Power2",
        onComplete: () => p.destroy(),
      });
    }
    // Central flash ring
    const flash = this.add
      .circle(x, y, 16, color, 0.75)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(60);
    this.tweens.add({
      targets: flash,
      scale: 3.5,
      alpha: 0,
      duration: 320,
      ease: "Power2",
      onComplete: () => flash.destroy(),
    });
  }

  // ── Score popup ────────────────────────────────────────────────────────────

  addScore(amount, x, y, color = "#ffd166") {
    this.score += amount;
    this.updateHud();
    const t = this.add
      .text(x, y, `+${amount}`, {
        fontFamily: FONT, fontSize: "22px", fontStyle: "bold",
        color, stroke: "#000000", strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(50);
    this.tweens.add({
      targets: t,
      y: y - 58,
      alpha: 0,
      duration: 720,
      ease: "Power2",
      onComplete: () => t.destroy(),
    });
  }

  // ── Speed Game ─────────────────────────────────────────────────────────────

  setupSpeedGame() {
    const d = this.getDifficultySettings();
    this.speedHits = 0;
    this.speedPerfect = 0;
    this.speedMisses = 0;
    this.lanes = [];
    this.speedPackets = [];

    const laneX = [220, 480, 740];
    const laneColors = [C.cyan, C.purple, C.gold];
    const laneColorHex = ["#67e8f9", "#a78bfa", "#ffd166"];

    laneX.forEach((x, index) => {
      const lc = laneColors[index];
      const lch = laneColorHex[index];

      // Lane body
      const lg = this.add.graphics();
      gfxRR(lg, x, 365, 178, 460, 12, C.surface, 0.92, lc, 0.18);

      // Header tint
      const hg = this.add.graphics();
      hg.fillStyle(lc, 0.1);
      hg.fillRoundedRect(x - 83, 128, 166, 36, { tl: 10, tr: 10, bl: 0, br: 0 });

      // Inner guide lines
      const tg = this.add.graphics();
      tg.lineStyle(1, lc, 0.07);
      tg.lineBetween(x - 32, 166, x - 32, 502);
      tg.lineBetween(x + 32, 166, x + 32, 502);

      this.add.text(x, 146, `LANE ${index + 1}`, {
        fontFamily: FONT, fontSize: "11px", fontStyle: "bold",
        color: lch, letterSpacing: 2,
      }).setOrigin(0.5);

      // Timing zone
      const zg = this.add.graphics();
      const drawZone = () => {
        zg.clear();
        gfxRR(zg, x, 521, 130, 46, 7, lc, 0.16, lc, 0.65);
      };
      drawZone();
      this.tweens.add({
        targets: zg,
        alpha: { from: 0.7, to: 1 },
        duration: 550,
        yoyo: true,
        repeat: -1,
      });

      // TAP button (visual)
      const bg = this.add.graphics();
      gfxRR(bg, x, 581, 148, 62, 10, lc, 0.9, lc, 1);
      // Inner highlight
      const bgh = this.add.graphics();
      bgh.fillStyle(0xffffff, 0.12);
      bgh.fillRoundedRect(x - 64, 554, 128, 22, { tl: 9, tr: 9, bl: 0, br: 0 });

      // Hit area
      const btn = hitRect(this, x, 581, 148, 62);
      btn.on("pointerdown", () => {
        this.hitSpeedLane(index);
        // Alpha flash only — no scale (Graphics scale from scene origin, not button center)
        this.tweens.add({ targets: bg, alpha: 0.5, yoyo: true, duration: 70 });
      });
      btn.on("pointerover",  () => bg.setAlpha(0.85));
      btn.on("pointerout",   () => bg.setAlpha(1));

      this.add.text(x, 581, "TAP", {
        fontFamily: FONT, fontSize: "20px", fontStyle: "bold", color: "#0d1820",
      }).setOrigin(0.5);

      this.lanes.push({ x, zone: { y: 521 }, color: lc, flashGraphics: lg });
    });

    this.speedSpawner = this.time.addEvent({
      delay: d.speedSpawnerDelay,
      loop: true,
      callback: () => {
        const lane = Phaser.Math.Between(0, 2);
        const lc = laneColors[lane];

        const packet = this.add.circle(this.lanes[lane].x, 140, 17, lc, 1);
        const glow = this.add
          .circle(this.lanes[lane].x, 140, 30, lc, 0.22)
          .setBlendMode(Phaser.BlendModes.ADD);

        packet.lane = lane;
        packet.glowObj = glow;
        packet.pulse = this.tweens.add({
          targets: glow,
          scale: { from: 1, to: 1.5 },
          alpha: { from: 0.22, to: 0.06 },
          yoyo: true, duration: 220, repeat: -1,
        });
        this.speedPackets.push(packet);
      },
    });

    this.activeCleanup.push(() => this.speedSpawner?.destroy());
  }

  hitSpeedLane(laneIndex) {
    let bestPacket = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    this.speedPackets.forEach((packet) => {
      if (packet.lane !== laneIndex) return;
      const distance = Math.abs(packet.y - 521);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestPacket = packet;
      }
    });

    const d = this.getDifficultySettings();
    if (!bestPacket || bestDistance > d.speedHitWindow) {
      this.combo = 0;
      this.speedMisses += 1;
      this.score = Math.max(0, this.score - 35);
      this.updateHud();
      // Miss flash
      const miss = this.add
        .rectangle(this.lanes[laneIndex].x, 360, 178, 460, 0xff4444, 0.14)
        .setOrigin(0.5);
      this.tweens.add({ targets: miss, alpha: 0, duration: 280, onComplete: () => miss.destroy() });
      return;
    }

    const perfect = bestDistance <= d.speedPerfectWindow;
    const great = bestDistance <= d.speedPerfectWindow + 12;
    const base = perfect ? 115 : great ? 75 : 42;
    const scoreColor = perfect ? "#4ade80" : great ? "#67e8f9" : "#ffd166";

    this.combo += 1;
    this.speedHits += 1;
    if (perfect) this.speedPerfect += 1;

    const hitLabel = perfect ? "PERFECT!" : great ? "GREAT!" : "GOOD";
    const hl = this.add
      .text(bestPacket.x, bestPacket.y - 28, hitLabel, {
        fontFamily: FONT, fontSize: "15px", fontStyle: "bold",
        color: scoreColor, stroke: "#000", strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(50);
    this.tweens.add({ targets: hl, y: hl.y - 36, alpha: 0, duration: 480, onComplete: () => hl.destroy() });

    this.addScore(base + this.combo * 4, bestPacket.x, bestPacket.y, scoreColor);
    this.addBurst(bestPacket.x, bestPacket.y, perfect ? 0x4ade80 : 0xffd166);

    bestPacket.pulse?.remove();
    bestPacket.glowObj?.destroy();
    Phaser.Utils.Array.Remove(this.speedPackets, bestPacket);
    bestPacket.destroy();
  }

  // ── Power Game ─────────────────────────────────────────────────────────────

  setupPowerGame() {
    const d = this.getDifficultySettings();
    this.powerStats = { goodCatch: 0, badCatch: 0, stableTicks: 0, overloads: 0 };
    this.powerState = { level: 52, combo: 0 };
    this.powerLastOverloadPenaltyAt = Number.NEGATIVE_INFINITY;

    // Info panel
    const pg = this.add.graphics();
    pg.fillStyle(C.surface, 0.95);
    pg.fillRoundedRect(100, 84, 760, 88, 10);
    pg.lineStyle(1, C.border, 1);
    pg.strokeRoundedRect(100, 84, 760, 88, 10);
    pg.lineStyle(2, C.gold, 0.35);
    pg.lineBetween(112, 84, W - 112, 84);

    this.add.text(116, 91, "BATTERY STABILITY", {
      fontFamily: FONT, fontSize: "10px", fontStyle: "bold", color: "#ffd166",
      letterSpacing: 2,
    });

    this.powerChoiceText = this.add.text(116, 108, "Battery 52% | Combo 0", {
      fontFamily: FONT, fontSize: "17px", fontStyle: "bold", color: "#e8f4ff",
    });

    // Meter track
    const meterBg = this.add.graphics();
    meterBg.fillStyle(C.bg, 1);
    meterBg.fillRoundedRect(116, 148, 728, 18, 6);
    meterBg.lineStyle(1, C.border, 1);
    meterBg.strokeRoundedRect(116, 148, 728, 18, 6);

    // Safe zone: 42%–68% → offset 306, width 190
    const safeG = this.add.graphics();
    safeG.fillStyle(C.mint, 0.15);
    safeG.fillRoundedRect(116 + 306, 148, 190, 18, 4);
    safeG.lineStyle(1, C.mint, 0.5);
    safeG.strokeRoundedRect(116 + 306, 148, 190, 18, 4);

    this.add.text(116 + 306 + 4, 152, "SAFE ZONE", {
      fontFamily: FONT, fontSize: "9px", fontStyle: "bold", color: "#4ade80",
      letterSpacing: 1,
    });

    // Meter fill — Rectangle with origin (0,0.5) so width changes look right
    this.powerMeterFill = this.add
      .rectangle(116, 157, 728 * 0.52, 18, C.gold)
      .setOrigin(0, 0.5);
    // Glow on meter fill
    this.powerMeterGlow = this.add
      .rectangle(116, 157, 728 * 0.52, 18, C.gold, 0.3)
      .setOrigin(0, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Player paddle — plain Rectangles for smooth performance
    this.powerPaddleGlow = this.add
      .rectangle(480, 557, 144, 34, C.cyan, 0.18)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.powerPaddleFill = this.add.rectangle(480, 557, 112, 24, C.cyan, 0.92);

    // Invisible Rectangle for collision math
    this.powerPlayer = this.add.rectangle(480, 557, 112, 24, 0xffffff, 0);
    this._movePaddle(480);

    this.powerSparks = [];
    const lanes = [210, 480, 750];

    lanes.forEach((x, i) => {
      const lg = this.add.graphics();
      lg.lineStyle(1, C.border, 0.7);
      lg.lineBetween(x, 186, x, 522);
      this.add.text(x, 196, `LANE ${i + 1}`, {
        fontFamily: FONT, fontSize: "10px", fontStyle: "bold", color: "#4a7a9b",
        letterSpacing: 2,
      }).setOrigin(0.5);
    });

    this.input.keyboard?.on("keydown-LEFT", () => {
      this._movePaddle(Math.max(172, this.powerPlayer.x - 120));
    });
    this.input.keyboard?.on("keydown-RIGHT", () => {
      this._movePaddle(Math.min(788, this.powerPlayer.x + 120));
    });
    this.input.on("pointerdown", (ptr) => {
      this._movePaddle(clamp(ptr.x, 172, 788));
    });

    this.powerSpawner = this.time.addEvent({
      delay: d.powerSpawnDelay,
      loop: true,
      callback: () => {
        const laneX = Phaser.Utils.Array.GetRandom(lanes);
        const isGood = Phaser.Math.Between(0, 100) > 35;
        const lc = isGood ? C.mint : C.danger;

        const spark = this.add.circle(laneX, 230, 16, lc, 0.92);
        spark.isGood = isGood;
        spark.value = isGood ? Phaser.Math.Between(7, 12) : Phaser.Math.Between(10, 16);
        this.powerSparks.push(spark);
      },
    });

    this.powerLoop = this.time.addEvent({
      delay: 120,
      loop: true,
      callback: () => {
        this.powerState.level = clamp(this.powerState.level - d.powerDrift, 0, 100);
        this.powerSparks.forEach((spark) => {
          spark.y += 10;

          if (
            Math.abs(spark.y - this.powerPlayer.y) < 28 &&
            Math.abs(spark.x - this.powerPlayer.x) < 95
          ) {
            if (spark.isGood) {
              this.powerStats.goodCatch += 1;
              this.powerState.combo += 1;
              this.powerState.level = clamp(this.powerState.level + spark.value, 0, 100);
              this.addScore(42 + this.powerState.combo * 3, spark.x, spark.y, "#4ade80");
            } else {
              this.powerStats.badCatch += 1;
              this.powerState.combo = 0;
              this.powerState.level = clamp(
                this.powerState.level + spark.value * d.powerBadLevelSpike,
                0,
                100,
              );
              this.score = Math.max(0, this.score - d.powerBadCatchPenalty);
              this.updateHud();
            }
            Phaser.Utils.Array.Remove(this.powerSparks, spark);
            spark.destroy();
          } else if (spark.y > 620) {
            if (spark.isGood) {
              this.powerState.combo = 0;
              this.score = Math.max(0, this.score - d.powerMissGoodPenalty);
              this.updateHud();
            }
            Phaser.Utils.Array.Remove(this.powerSparks, spark);
            spark.destroy();
          }
        });

        if (this.powerState.level >= 85 || this.powerState.level <= 15) {
          this.powerState.combo = 0;
          this.powerState.level = clamp(this.powerState.level, 8, 92);
          if (this.time.now - this.powerLastOverloadPenaltyAt >= d.powerOverloadCooldownMs) {
            this.powerStats.overloads += 1;
            this.score = Math.max(0, this.score - d.powerOverloadPenalty);
            this.powerLastOverloadPenaltyAt = this.time.now;
            this.cameras.main.shake(90, 0.003);
            this.updateHud();
          }
        } else if (this.powerState.level >= 42 && this.powerState.level <= 68) {
          this.powerStats.stableTicks += 1;
          this.score += d.powerStableReward;
          this.updateHud();
        }

        this.refreshPowerMeter();
      },
    });

    this.refreshPowerMeter();
    this.activeCleanup.push(() => this.powerSpawner?.destroy());
    this.activeCleanup.push(() => this.powerLoop?.destroy());
  }

  _movePaddle(nx) {
    this.powerPlayer.x = nx;
    this.powerPaddleFill.x = nx;
    this.powerPaddleGlow.x = nx;
  }

  refreshPowerMeter() {
    const lvl = this.powerState.level;
    const fillW = Math.max(4, 728 * (lvl / 100));
    const color =
      lvl >= 42 && lvl <= 68 ? C.mint : lvl < 25 || lvl > 80 ? C.danger : C.gold;

    this.powerMeterFill.width = fillW;
    this.powerMeterFill.fillColor = color;
    this.powerMeterGlow.width = fillW;
    this.powerMeterGlow.fillColor = color;

    this.powerChoiceText.setText(
      `Battery ${Math.round(lvl)}%  ·  Combo ×${this.powerState.combo}`,
    );
  }

  // ── Thermal Game ───────────────────────────────────────────────────────────

  setupThermalGame() {
    const d = this.getDifficultySettings();
    this.thermalCells = [];
    this.thermalStats = { cools: 0, burnouts: 0, prestart: true };
    const cols = 5;
    const rows = 4;
    const startX = 184;
    const startY = 168;
    const gapX = 118;
    const gapY = 104;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = startX + col * gapX;
        const y = startY + row * gapY;

        // Glow layer behind cell (ADD blend)
        const glowG = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
        // Main cell graphics
        const cellG = this.add.graphics();
        // Ring graphics
        const ringG = this.add.graphics();

        // Invisible hit area on top
        const hit = hitRect(this, x, y, 94, 72);
        hit.setDepth(5);

        const cell = {
          cellG, glowG, ringG, hit,
          heat: 0, x, y,
          active: false, burnedOut: false, deadline: 0,
        };

        hit.on("pointerdown", () => {
          if (!cell.active || cell.burnedOut) return;
          cell.active = false;
          cell.heat = 0;
          this.thermalStats.cools += 1;
          this.addScore(110, x, y, "#67e8f9");
          this.addBurst(x, y, 0x67e8f9);
          this.refreshThermalCell(cell);
        });

        this.thermalCells.push(cell);
        this.refreshThermalCell(cell);
      }
    }

    const activateCell = () => {
      const candidates = this.thermalCells.filter((c) => !c.active && !c.burnedOut);
      if (!candidates.length) return;
      const cell = Phaser.Utils.Array.GetRandom(candidates);
      cell.active = true;
      cell.heat = 100;
      cell.deadline = this.time.now + Phaser.Math.Between(d.thermalDeadlineMin, d.thermalDeadlineMax);
      this.refreshThermalCell(cell);
    };

    this.thermalCountdownText = this.add
      .text(W / 2, 100, "Cooling starts in 3", {
        fontFamily: FONT, fontSize: "28px", fontStyle: "bold", color: "#e8f4ff",
        stroke: "#050d17", strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(20);

    let countdown = 3;
    this.thermalCountdown = this.time.addEvent({
      delay: 1000,
      repeat: 2,
      callback: () => {
        countdown -= 1;
        if (countdown > 0) {
          this.thermalCountdownText.setText(`Cooling starts in ${countdown}`);
          this.tweens.add({
            targets: this.thermalCountdownText,
            scaleX: 1.2, scaleY: 1.2,
            yoyo: true, duration: 200,
          });
        } else {
          this.thermalCountdownText.setColor("#4ade80").setText("GO!");
          this.tweens.add({
            targets: this.thermalCountdownText,
            scaleX: 1.4, scaleY: 1.4, alpha: 0,
            duration: 500,
            onComplete: () => this.thermalCountdownText?.destroy(),
          });
          this.thermalStats.prestart = false;
          activateCell();
          activateCell();
        }
      },
    });

    this.thermalLoop = this.time.addEvent({
      delay: 150,
      loop: true,
      callback: () => {
        if (this.thermalStats.prestart) return;
        this.thermalCells.forEach((cell) => {
          if (cell.burnedOut) return;
          if (cell.active) {
            const timeLeft = Math.max(0, cell.deadline - this.time.now);
            cell.heat = clamp(Math.round((timeLeft / 2600) * 100), 0, 100);
            if (timeLeft <= 0) {
              cell.active = false;
              cell.burnedOut = true;
              this.thermalStats.burnouts += 1;
              this.score = Math.max(0, this.score - d.thermalBurnPenalty);
              this.cameras.main.shake(120, 0.003);
            }
          }
          this.refreshThermalCell(cell);
        });

        if (
          this.thermalCells.filter((c) => c.active).length <
          Math.min(5, 2 + Math.floor((this.gameConfig.duration - this.remaining) / 8))
        ) {
          activateCell();
        }

        const saved = this.thermalCells.filter((c) => !c.burnedOut).length;
        this.score += Math.max(1, Math.round(saved * d.thermalPassiveReward));
        this.updateHud();
      },
    });

    this.activeCleanup.push(() => this.thermalCountdown?.destroy());
    this.activeCleanup.push(() => this.thermalLoop?.destroy());
  }

  refreshThermalCell(cell) {
    const { x, y } = cell;
    cell.cellG.clear();
    cell.glowG.clear();
    cell.ringG.clear();

    if (cell.burnedOut) {
      // Dark burned cell
      cell.cellG.fillStyle(0x181818, 0.88);
      cell.cellG.fillRoundedRect(x - 46, y - 35, 92, 70, 8);
      cell.cellG.lineStyle(1, 0x2e2e2e, 1);
      cell.cellG.strokeRoundedRect(x - 46, y - 35, 92, 70, 8);
      // X mark
      cell.cellG.lineStyle(2, 0x553333, 1);
      cell.cellG.lineBetween(x - 14, y - 14, x + 14, y + 14);
      cell.cellG.lineBetween(x + 14, y - 14, x - 14, y + 14);
      return;
    }

    if (!cell.active) {
      // Cool idle cell
      cell.cellG.fillStyle(C.surface, 0.92);
      cell.cellG.fillRoundedRect(x - 46, y - 35, 92, 70, 8);
      cell.cellG.lineStyle(1, C.border, 1);
      cell.cellG.strokeRoundedRect(x - 46, y - 35, 92, 70, 8);
      // Cool dot
      cell.cellG.fillStyle(C.cyan, 0.25);
      cell.cellG.fillCircle(x, y, 10);
      return;
    }

    // Active hot cell — heat=100 just activated, heat=0 about to burn
    const danger = 1 - cell.heat / 100; // 0 = new, 1 = critical
    const color = Phaser.Display.Color.Interpolate.ColorWithColor(
      new Phaser.Display.Color(255, 209, 102), // gold — fresh
      new Phaser.Display.Color(255, 72, 50),   // red — critical
      100,
      Math.round(danger * 100),
    );
    const fill = Phaser.Display.Color.GetColor(color.r, color.g, color.b);

    // Glow halo (ADD)
    cell.glowG.fillStyle(fill, 0.15 + danger * 0.25);
    cell.glowG.fillCircle(x, y, 50 + danger * 12);

    // Cell body
    cell.cellG.fillStyle(fill, 0.22 + danger * 0.35);
    cell.cellG.fillRoundedRect(x - 46, y - 35, 92, 70, 8);
    cell.cellG.lineStyle(2, fill, 0.55 + danger * 0.4);
    cell.cellG.strokeRoundedRect(x - 46, y - 35, 92, 70, 8);

    // Pulsing ring
    const ringR = 16 + danger * 14;
    cell.ringG.lineStyle(2 + danger * 2, fill, 0.65 + danger * 0.3);
    cell.ringG.strokeCircle(x, y, ringR);

    // Urgency second ring
    if (danger > 0.6) {
      cell.ringG.lineStyle(1, fill, 0.3);
      cell.ringG.strokeCircle(x, y, ringR + 8);
    }
  }

  // ── Core Game ──────────────────────────────────────────────────────────────

  setupCoreGame() {
    const d = this.getDifficultySettings();
    this.coreStats = { matches: 0, misses: 0 };
    this.coreTasks = [];

    // Accent colors per task size
    const sizeColors = [0, C.cyan, C.gold, C.orange, C.purple];
    const sizeColorHex = ["", "#67e8f9", "#ffd166", "#fb923c", "#a78bfa"];

    const machineXs = [190, 400, 610, 820];
    this.machines = machineXs.map((x, index) => {
      const size = index + 1;
      const lc = sizeColors[size];
      const lch = sizeColorHex[size];

      // Machine bay visual
      const mg = this.add.graphics();
      mg.fillStyle(C.surface, 0.95);
      mg.fillRoundedRect(x - 78, 468, 156, 130, 12);
      mg.lineStyle(2, lc, 0.45);
      mg.strokeRoundedRect(x - 78, 468, 156, 130, 12);
      // Top accent line
      mg.lineStyle(3, lc, 0.7);
      mg.lineBetween(x - 66, 468, x + 66, 468);
      // Slot dividers
      mg.lineStyle(1, lc, 0.12);
      mg.lineBetween(x - 78, 514, x + 78, 514);

      // Size number
      this.add.text(x, 492, `${size}`, {
        fontFamily: FONT, fontSize: "42px", fontStyle: "bold", color: lch,
        stroke: "#050d17", strokeThickness: 3,
      }).setOrigin(0.5);

      this.add.text(x, 556, `CORE BAY ${size}`, {
        fontFamily: FONT, fontSize: "11px", fontStyle: "bold",
        color: lch, letterSpacing: 2,
      }).setOrigin(0.5);

      // Glow on machine
      const glow = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
      glow.fillStyle(lc, 0.05);
      glow.fillRoundedRect(x - 78, 468, 156, 130, 12);

      return { x, y: 520, size };
    });

    // Task spawn area header
    const zg = this.add.graphics();
    zg.fillStyle(C.surface, 0.6);
    zg.fillRoundedRect(80, 92, 800, 34, 8);
    zg.lineStyle(1, C.border, 1);
    zg.strokeRoundedRect(80, 92, 800, 34, 8);
    this.add.text(480, 109, "DRAG TASKS TO MATCHING CORE BAY", {
      fontFamily: FONT, fontSize: "11px", fontStyle: "bold", color: "#7ca8c4",
      letterSpacing: 3,
    }).setOrigin(0.5);

    const spawnTask = () => {
      const size = Phaser.Math.Between(1, 4);
      const lc = sizeColors[size];
      const lch = sizeColorHex[size];
      const tx = Phaser.Math.Between(160, 800);
      const ty = Phaser.Math.Between(140, 340);

      // Task card visual
      const tg = this.add.graphics().setDepth(2);
      tg.fillStyle(C.surface, 0.95);
      tg.fillRoundedRect(-52, -34, 104, 68, 10);
      tg.lineStyle(2, lc, 0.7);
      tg.strokeRoundedRect(-52, -34, 104, 68, 10);
      tg.lineStyle(3, lc, 0.9);
      tg.lineBetween(-52, -34, 52, -34); // top accent
      tg.setPosition(tx, ty);

      // Task number
      const label = this.add.text(tx, ty - 4, `${size}`, {
        fontFamily: FONT, fontSize: "36px", fontStyle: "bold", color: lch,
        stroke: "#050d17", strokeThickness: 3,
      }).setOrigin(0.5).setDepth(3);

      // Size sub-label
      const sub = this.add.text(tx, ty + 22, `SIZE ${size}`, {
        fontFamily: FONT, fontSize: "9px", fontStyle: "bold",
        color: lch, letterSpacing: 2,
      }).setOrigin(0.5).setDepth(3);

      // Invisible hit area for drag
      const rect = this.add
        .rectangle(tx, ty, 104, 68, 0xffffff, 0)
        .setInteractive({ draggable: true, useHandCursor: true })
        .setDepth(4);
      this.input.setDraggable(rect);

      const task = { rect, tg, label, sub, size, x: tx, y: ty };

      rect.on("dragstart", () => {
        tg.setDepth(20);
        label.setDepth(21);
        sub.setDepth(21);
        this.tweens.add({ targets: [tg, label, sub], scaleX: 1.06, scaleY: 1.06, duration: 80 });
      });
      rect.on("drag", (_ptr, dx, dy) => {
        rect.x = dx; rect.y = dy;
        tg.x = dx;  label.x = dx; sub.x = dx;
        tg.y = dy;  label.y = dy; sub.y = dy;
      });
      rect.on("dragend", () => this.resolveCoreTask(task));
      this.coreTasks.push(task);
    };

    this.coreSpawner = this.time.addEvent({
      delay: d.coreSpawnDelay,
      loop: true,
      callback: () => { if (this.coreTasks.length < 8) spawnTask(); },
    });
    spawnTask(); spawnTask(); spawnTask(); spawnTask();

    this.corePenaltyLoop = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        const backlog = this.coreTasks.length;
        if (backlog >= 4) {
          this.score = Math.max(0, this.score - backlog * d.coreBacklogPenalty);
          this.updateHud();
        }
      },
    });

    this.activeCleanup.push(() => this.coreSpawner?.destroy());
    this.activeCleanup.push(() => this.corePenaltyLoop?.destroy());
  }

  resolveCoreTask(task) {
    task.tg.setDepth(2);
    task.label.setDepth(3);
    task.sub.setDepth(3);
    this.tweens.add({ targets: [task.tg, task.label, task.sub], scaleX: 1, scaleY: 1, duration: 80 });

    const matchingMachine = this.machines.find(
      (m) => Phaser.Math.Distance.Between(task.rect.x, task.rect.y, m.x, m.y) < 90,
    );

    if (matchingMachine && matchingMachine.size === task.size) {
      this.coreStats.matches += 1;
      this.addScore(125, matchingMachine.x, matchingMachine.y - 40, "#4ade80");
      this.addBurst(matchingMachine.x, matchingMachine.y, 0x4ade80);
      this.destroyTask(task);
    } else {
      this.coreStats.misses += 1;
      this.tweens.add({
        targets: [task.rect, task.tg, task.label, task.sub],
        x: task.x, y: task.y,
        duration: 220,
        ease: "Back.out",
      });
      this.score = Math.max(0, this.score - this.getDifficultySettings().coreMissPenalty);
      this.updateHud();
    }
  }

  destroyTask(task) {
    Phaser.Utils.Array.Remove(this.coreTasks, task);
    task.rect.destroy();
    task.tg.destroy();
    task.label.destroy();
    task.sub.destroy();
  }

  // ── Routing Game ───────────────────────────────────────────────────────────

  setupRoutingGame() {
    const d = this.getDifficultySettings();
    this.routeStats = { hazards: 0, completedRounds: 0, pathLength: 0 };
    this.routeRound = 0;
    this.routeLayouts = [
      { start: [120, 540], end: [840, 140] },
      { start: [120, 180], end: [820, 510] },
      { start: [180, 560], end: [790, 240] },
      { start: [150, 520], end: [830, 210] },
      { start: [125, 260], end: [840, 520] },
      { start: [210, 560], end: [780, 160] },
      { start: [110, 420], end: [850, 260] },
      { start: [200, 200], end: [810, 560] },
    ];
    this.routeLastLayoutIndex = -1;
    this.routeGraphics = this.add.graphics().setDepth(8);
    this.routeGlowGraphics = this.add.graphics().setDepth(7).setBlendMode(Phaser.BlendModes.ADD);
    this.routeInfo = this.add.text(92, 140, "", {
      fontFamily: FONT, fontSize: "13px", fontStyle: "bold", color: "#4a7a9b",
      letterSpacing: 1,
    }).setDepth(12);
    this.routeBanner = null;
    this.routeRoundContainer = null;
    this.routeHazards = [];
    this.startRoutingRound();

    this.input.on("pointerdown", (pointer) => {
      if (this.routeFinished) return;
      if (
        Phaser.Math.Distance.Between(pointer.x, pointer.y, this.routeStart.x, this.routeStart.y) <= 45
      ) {
        this.routeDrawing = true;
        this.routePoints = [new Phaser.Math.Vector2(this.routeStart.x, this.routeStart.y)];
      }
    });

    this.input.on("pointermove", (pointer) => {
      if (!this.routeDrawing || this.routeFinished) return;
      const last = this.routePoints[this.routePoints.length - 1];
      const bx = clamp(pointer.x, 80, 880);
      const by = clamp(pointer.y, 140, 610);
      if (Phaser.Math.Distance.Between(last.x, last.y, bx, by) < 12) return;
      const pt = new Phaser.Math.Vector2(bx, by);
      this.routePoints.push(pt);
      this.redrawRoute();
      this.routeHazards.forEach((hazard) => {
        if (Phaser.Math.Distance.Between(pt.x, pt.y, hazard.x0, hazard.y0) <= hazard.radius) {
          this.routeStats.hazards += 1;
          this.score = Math.max(0, this.score - Math.round(d.routingHazardPenalty * 0.3));
          this.cameras.main.shake(60, 0.002);
          this.updateHud();
        }
      });
      if (
        Phaser.Math.Distance.Between(pt.x, pt.y, this.routeEnd.x, this.routeEnd.y) <= 36
      ) {
        this.routeFinished = true;
        this.routeDrawing = false;
        this.completeRoute();
      }
    });

    this.input.on("pointerup", () => {
      if (!this.routeFinished) this.routeDrawing = false;
    });
  }

  redrawRoute() {
    this.routeGraphics.clear();
    this.routeGlowGraphics.clear();

    if (this.routePoints.length < 2) return;

    // Glow pass (wider, faint, ADD blend)
    this.routeGlowGraphics.lineStyle(14, C.mint, 0.18);
    this.routeGlowGraphics.beginPath();
    this.routeGlowGraphics.moveTo(this.routeStart.x, this.routeStart.y);
    this.routePoints.forEach((p) => this.routeGlowGraphics.lineTo(p.x, p.y));
    this.routeGlowGraphics.strokePath();

    // Main trace
    this.routeGraphics.lineStyle(5, C.mint, 0.9);
    this.routeGraphics.beginPath();
    this.routeGraphics.moveTo(this.routeStart.x, this.routeStart.y);
    this.routePoints.forEach((p) => this.routeGraphics.lineTo(p.x, p.y));
    this.routeGraphics.strokePath();
  }

  completeRoute() {
    const d = this.getDifficultySettings();
    let pathLength = 0;
    for (let i = 1; i < this.routePoints.length; i++) {
      pathLength += Phaser.Math.Distance.BetweenPoints(this.routePoints[i - 1], this.routePoints[i]);
    }
    const actual = Math.round(pathLength);
    this.routeStats.pathLength += actual;
    const direct = Math.round(Phaser.Math.Distance.BetweenPoints(this.routeStart, this.routeEnd));
    const ratio = direct / Math.max(direct, actual);
    const roundHazards =
      this.currentRoundHazardsStart !== undefined
        ? this.routeStats.hazards - this.currentRoundHazardsStart
        : this.routeStats.hazards;

    const routeBonus = Math.round(980 * ratio);
    const completionBonus = d.routingCompletionBonus;
    const hazardPenalty = roundHazards * d.routingHazardPenalty;
    const roundScore = Math.max(d.routingRoundMinScore, completionBonus + routeBonus - hazardPenalty);
    this.score += roundScore;
    this.updateHud();

    this.addBurst(this.routeEnd.x, this.routeEnd.y, C.gold);
    this.routeBanner?.destroy();
    this.routeBanner = this.add
      .text(W / 2, 94, `✓ Signal Delivered!  +${roundScore}`, {
        fontFamily: FONT, fontSize: "26px", fontStyle: "bold", color: "#4ade80",
        stroke: "#050d17", strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.routeStats.completedRounds += 1;

    this.time.delayedCall(380, () => {
      if (!this.finished) this.startRoutingRound();
    });
  }

  startRoutingRound() {
    const d = this.getDifficultySettings();
    this.routeRound += 1;
    this.routeFinished = false;
    this.routeDrawing = false;
    this.routePoints = [];
    this.currentRoundHazardsStart = this.routeStats.hazards;
    this.routeGraphics.clear();
    this.routeGlowGraphics.clear();
    this.routeRoundContainer?.destroy(true);
    this.routeRoundContainer = this.add.container(0, 0);
    this.routeHazards = [];
    this.routeBanner?.destroy();

    this.routeBanner = this.add
      .text(W / 2, 94, `BOARD ${this.routeRound}`, {
        fontFamily: FONT, fontSize: "22px", fontStyle: "bold", color: "#67e8f9",
        stroke: "#050d17", strokeThickness: 3,
        letterSpacing: 3,
      })
      .setOrigin(0.5)
      .setDepth(20);

    // Board background — PCB look (covers full gameplay area below HUD)
    const boardG = this.add.graphics();
    boardG.fillStyle(0x071220, 0.9);
    boardG.fillRoundedRect(80, 128, 800, 498, 12);
    boardG.lineStyle(1, 0x1a3252, 1);
    boardG.strokeRoundedRect(80, 128, 800, 498, 12);
    // PCB trace grid
    for (let bx = 80; bx <= 880; bx += 50) {
      boardG.lineStyle(1, C.cyan, 0.04);
      boardG.lineBetween(bx, 128, bx, 626);
    }
    for (let by = 128; by <= 626; by += 50) {
      boardG.lineStyle(1, C.gold, 0.03);
      boardG.lineBetween(80, by, 880, by);
    }
    this.routeRoundContainer.add(boardG);

    let layoutIndex = Phaser.Math.Between(0, this.routeLayouts.length - 1);
    if (this.routeLayouts.length > 1 && layoutIndex === this.routeLastLayoutIndex) {
      layoutIndex = (layoutIndex + 1) % this.routeLayouts.length;
    }
    this.routeLastLayoutIndex = layoutIndex;
    const layout = this.routeLayouts[layoutIndex];
    this.routeStart = new Phaser.Math.Vector2(layout.start[0], layout.start[1]);
    this.routeEnd = new Phaser.Math.Vector2(layout.end[0], layout.end[1]);

    // Start node — pulsing rings
    const startG = this.add.graphics();
    startG.fillStyle(C.mint, 0.9);
    startG.fillCircle(this.routeStart.x, this.routeStart.y, 24);
    this.routeRoundContainer.add(startG);

    const startRing = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    startRing.lineStyle(2, C.mint, 0.5);
    startRing.strokeCircle(this.routeStart.x, this.routeStart.y, 36);
    this.routeRoundContainer.add(startRing);
    this.tweens.add({
      targets: startRing,
      alpha: { from: 0.7, to: 0 },
      duration: 1000, repeat: -1,
    });

    const startLabel = this.add.text(this.routeStart.x, this.routeStart.y, "S", {
      fontFamily: FONT, fontSize: "16px", fontStyle: "bold", color: "#081a0e",
    }).setOrigin(0.5).setDepth(9);
    this.routeRoundContainer.add(startLabel);

    // End node — pulsing rings
    const endG = this.add.graphics();
    endG.fillStyle(C.gold, 0.9);
    endG.fillCircle(this.routeEnd.x, this.routeEnd.y, 24);
    this.routeRoundContainer.add(endG);

    const endRing = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    endRing.lineStyle(2, C.gold, 0.5);
    endRing.strokeCircle(this.routeEnd.x, this.routeEnd.y, 36);
    this.routeRoundContainer.add(endRing);
    this.tweens.add({
      targets: endRing,
      alpha: { from: 0.7, to: 0 },
      duration: 900, repeat: -1,
      delay: 200,
    });

    const endLabel = this.add.text(this.routeEnd.x, this.routeEnd.y, "E", {
      fontFamily: FONT, fontSize: "16px", fontStyle: "bold", color: "#1a1000",
    }).setOrigin(0.5).setDepth(9);
    this.routeRoundContainer.add(endLabel);

    // Hazard clouds
    const hazardCount = Math.min(
      this.difficultyId === "hard" ? 54 : 24,
      Math.round(d.routingBaseHazards + this.routeRound * d.routingHazardsPerRound),
    );
    const useSpreadPlacement =
      this.difficultyId === "medium" || this.difficultyId === "hard";
    const gapBuffer = this.difficultyId === "hard" ? 14 : this.difficultyId === "medium" ? 30 : 10;
    const hazardSpecs = [];
    const canPlaceHazard = (x, y, radius, extraGap = gapBuffer) => {
      const marginToNodes = radius + 58;
      if (
        Phaser.Math.Distance.Between(x, y, this.routeStart.x, this.routeStart.y) < marginToNodes ||
        Phaser.Math.Distance.Between(x, y, this.routeEnd.x, this.routeEnd.y) < marginToNodes
      ) {
        return false;
      }

      return hazardSpecs.every((existing) => {
        const minDistance = radius + existing.radius + extraGap;
        return Phaser.Math.Distance.Between(x, y, existing.x, existing.y) >= minDistance;
      });
    };

    const tryAddHazard = (x, y, radius, extraGap = gapBuffer) => {
      if (!canPlaceHazard(x, y, radius, extraGap)) return false;
      hazardSpecs.push({ x, y, radius });
      return true;
    };

    if (useSpreadPlacement) {
      const zones = Phaser.Utils.Array.Shuffle([
        [220, 190], [420, 190], [620, 190], [760, 240],
        [180, 300], [360, 320], [560, 320], [760, 360],
        [220, 460], [420, 470], [620, 470], [760, 520],
      ]);

      zones.forEach(([zx, zy]) => {
        if (hazardSpecs.length >= hazardCount) return;
        const radius = Math.round(Phaser.Math.Between(32, 58) * d.routingHazardRadiusScale);
        const hx = clamp(zx + Phaser.Math.Between(-55, 55), 160, 800);
        const hy = clamp(zy + Phaser.Math.Between(-50, 50), 180, 560);
        tryAddHazard(hx, hy, radius);
      });
    }

    let attempts = 0;
    while (hazardSpecs.length < hazardCount && attempts < 900) {
      attempts += 1;
      const radius = Math.round(Phaser.Math.Between(32, 58) * d.routingHazardRadiusScale);
      const hx = Phaser.Math.Between(160, 800);
      const hy = Phaser.Math.Between(180, 560);
      tryAddHazard(hx, hy, radius);
    }

    // If placement is still short, relax spacing a little so we still hit target count.
    attempts = 0;
    while (hazardSpecs.length < hazardCount && attempts < 600) {
      attempts += 1;
      const radius = Math.round(Phaser.Math.Between(32, 58) * d.routingHazardRadiusScale);
      const hx = Phaser.Math.Between(160, 800);
      const hy = Phaser.Math.Between(180, 560);
      tryAddHazard(hx, hy, radius, Math.max(4, gapBuffer - 12));
    }

    hazardSpecs.forEach(({ x: hx, y: hy, radius }, i) => {

      // Outer glow
      const hOuter = this.add.circle(hx, hy, radius + 10, C.danger, 0.08)
        .setBlendMode(Phaser.BlendModes.ADD);
      // Main hazard
      const hazard = this.add.circle(hx, hy, radius, 0xff4060, 0.2);
      hazard.radius = radius;
      hazard.x0 = hx;
      hazard.y0 = hy;

      // Danger label
      const dLabel = this.add.text(hx, hy, "⚡", {
        fontFamily: FONT, fontSize: "14px", color: "#ff6080",
      }).setOrigin(0.5).setAlpha(0.6);

      this.routeHazards.push(hazard);
      this.routeRoundContainer.add([hOuter, hazard, dLabel]);
      this.tweens.add({
        targets: [hazard, hOuter],
        alpha: { from: hazard.alpha * 0.6, to: hazard.alpha * 1.7 },
        duration: 800 + i * 90,
        yoyo: true,
        repeat: -1,
      });
    });

    this.routeInfo.setText("30s sprint: draw S to E repeatedly • avoid red hazards");
  }

  // Scan Chain Fault Map
  setupScanGame() {
    const d = this.getDifficultySettings();
    this.scanRows = d.scanRows;
    this.scanCols = d.scanCols;
    this.scanTargetWindowMs = d.scanTargetWindowMs;
    this.scanStats = { correct: 0, wrong: 0, timeouts: 0, resolved: 0, bestStreak: 0 };
    this.scanInput = { row: "", col: "", field: "row" };
    this.scanCurrentTarget = null;
    this.scanTimerWidth = 230;

    const board = { x: 380, y: 170, w: 500, h: 400 };
    this.scanBoard = board;
    this.scanCellW = board.w / this.scanCols;
    this.scanCellH = board.h / this.scanRows;

    const panel = this.add.graphics();
    panel.fillStyle(C.surface, 0.9);
    panel.fillRoundedRect(board.x, board.y, board.w, board.h, 12);
    panel.lineStyle(1, C.border, 1);
    panel.strokeRoundedRect(board.x, board.y, board.w, board.h, 12);

    const grid = this.add.graphics();
    for (let row = 0; row <= this.scanRows; row += 1) {
      const y = board.y + row * this.scanCellH;
      grid.lineStyle(1, C.border, row === 0 || row === this.scanRows ? 0.95 : 0.55);
      grid.lineBetween(board.x, y, board.x + board.w, y);
    }
    for (let col = 0; col <= this.scanCols; col += 1) {
      const x = board.x + col * this.scanCellW;
      grid.lineStyle(1, C.border, col === 0 || col === this.scanCols ? 0.95 : 0.55);
      grid.lineBetween(x, board.y, x, board.y + board.h);
    }

    for (let row = 1; row <= this.scanRows; row += 1) {
      const y = board.y + (row - 0.5) * this.scanCellH;
      this.add.text(board.x - 28, y, `${row}`, {
        fontFamily: FONT, fontSize: "12px", fontStyle: "bold", color: "#7ca8c4",
      }).setOrigin(0.5);
    }
    for (let col = 1; col <= this.scanCols; col += 1) {
      const x = board.x + (col - 0.5) * this.scanCellW;
      this.add.text(x, board.y - 22, `${col}`, {
        fontFamily: FONT, fontSize: "12px", fontStyle: "bold", color: "#7ca8c4",
      }).setOrigin(0.5);
    }

    this.add.text(board.x - 28, board.y - 22, "R/C", {
      fontFamily: FONT, fontSize: "10px", fontStyle: "bold", color: "#4a7a9b",
      letterSpacing: 1,
    }).setOrigin(0.5);

    this.scanInputText = this.add.text(44, 142, "INPUT: R_ C_", {
      fontFamily: FONT, fontSize: "18px", fontStyle: "bold", color: "#e8f4ff",
    });
    this.scanHintText = this.add.text(44, 168, "", {
      fontFamily: FONT, fontSize: "12px", fontStyle: "bold", color: "#7ca8c4",
      letterSpacing: 1,
    });
    this.scanFeedbackText = this.add.text(44, 198, "", {
      fontFamily: FONT, fontSize: "15px", fontStyle: "bold", color: "#67e8f9",
      stroke: "#050d17", strokeThickness: 3,
    });

    const timerX = 44;
    this.add.text(timerX, 226, "FAULT TIMER", {
      fontFamily: FONT, fontSize: "10px", fontStyle: "bold", color: "#4a7a9b",
      letterSpacing: 2,
    });
    this.scanTimerTrack = this.add
      .rectangle(timerX, 254, this.scanTimerWidth, 16, C.bg)
      .setOrigin(0, 0.5);
    this.scanTimerFill = this.add
      .rectangle(timerX, 254, this.scanTimerWidth, 16, C.cyan)
      .setOrigin(0, 0.5);
    this.add.rectangle(timerX + this.scanTimerWidth / 2, 254, this.scanTimerWidth, 16, C.border, 0)
      .setStrokeStyle(1, C.border, 1);

    this.scanTargetGlow = this.add
      .rectangle(0, 0, this.scanCellW + 16, this.scanCellH + 16, C.danger, 0.28)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);
    this.scanTargetCell = this.add
      .rectangle(0, 0, this.scanCellW - 6, this.scanCellH - 6, 0xff365f, 0.62)
      .setStrokeStyle(3, 0xff9cb0, 0.95)
      .setVisible(false);

    this.scanPulseTween = this.tweens.add({
      targets: [this.scanTargetGlow, this.scanTargetCell],
      alpha: { from: 0.45, to: 1 },
      duration: 280,
      yoyo: true,
      repeat: -1,
      paused: true,
    });

    const onKeyDown = (event) => {
      if (this.finished || !this.scanCurrentTarget) return;

      if (event.code === "Space" || event.code === "Enter") {
        event.preventDefault();
        this.submitScanEntry();
        return;
      }

      if (event.code === "Backspace" || event.code === "Delete") {
        event.preventDefault();
        if (this.scanInput.col) {
          this.scanInput.col = "";
          this.scanInput.field = "col";
        } else if (this.scanInput.row) {
          this.scanInput.row = "";
          this.scanInput.field = "row";
        }
        this.refreshScanInputText();
        return;
      }

      const digit = this.getScanDigitFromEvent(event);
      if (!digit) return;

      if (this.scanInput.field === "row") {
        if (digit > this.scanRows) return;
        this.scanInput.row = `${digit}`;
        this.scanInput.field = "col";
      } else {
        if (digit > this.scanCols) return;
        this.scanInput.col = `${digit}`;
      }
      this.refreshScanInputText();
    };

    this.input.keyboard?.on("keydown", onKeyDown);

    this.scanLoop = this.time.addEvent({
      delay: 60,
      loop: true,
      callback: () => this.updateScanTimer(),
    });

    this.activeCleanup.push(() => this.input.keyboard?.off("keydown", onKeyDown));
    this.activeCleanup.push(() => this.scanLoop?.destroy());
    this.activeCleanup.push(() => this.scanPulseTween?.remove());
    this.activeCleanup.push(() => this.scanFeedbackTween?.remove());

    this.refreshScanInputText();
    this.spawnNextScanTarget(true);
  }

  getScanDigitFromEvent(event) {
    const codeMap = {
      Digit1: 1, Digit2: 2, Digit3: 3, Digit4: 4,
      Digit5: 5, Digit6: 6, Digit7: 7, Digit8: 8,
      Numpad1: 1, Numpad2: 2, Numpad3: 3, Numpad4: 4,
      Numpad5: 5, Numpad6: 6, Numpad7: 7, Numpad8: 8,
    };
    if (codeMap[event.code]) return codeMap[event.code];
    const parsed = Number.parseInt(event.key, 10);
    if (Number.isNaN(parsed)) return null;
    return parsed >= 1 && parsed <= 8 ? parsed : null;
  }

  refreshScanInputText() {
    const row = this.scanInput.row || "_";
    const col = this.scanInput.col || "_";
    this.scanInputText.setText(`INPUT: R${row} C${col}`);
    if (this.scanInput.field === "row") {
      this.scanHintText.setText(`Type row (1-${this.scanRows}), then column, then SPACE`);
    } else {
      this.scanHintText.setText(`Type column (1-${this.scanCols}), then SPACE to confirm`);
    }
  }

  spawnNextScanTarget(initial = false) {
    const previous = this.scanCurrentTarget;
    let row = Phaser.Math.Between(1, this.scanRows);
    let col = Phaser.Math.Between(1, this.scanCols);

    if (this.scanRows * this.scanCols > 1 && previous) {
      let attempts = 0;
      while (row === previous.row && col === previous.col && attempts < 20) {
        row = Phaser.Math.Between(1, this.scanRows);
        col = Phaser.Math.Between(1, this.scanCols);
        attempts += 1;
      }
    }

    this.scanCurrentTarget = {
      row,
      col,
      startedAt: this.time.now,
      expiresAt: this.time.now + this.scanTargetWindowMs,
    };

    const cx = this.scanBoard.x + (col - 0.5) * this.scanCellW;
    const cy = this.scanBoard.y + (row - 0.5) * this.scanCellH;
    this.scanTargetGlow.setPosition(cx, cy).setVisible(true);
    this.scanTargetCell.setPosition(cx, cy).setVisible(true);
    this.scanPulseTween.restart();

    this.scanInput = { row: "", col: "", field: "row" };
    this.refreshScanInputText();

    if (!initial) this.scanTimerFill.width = this.scanTimerWidth;
  }

  updateScanTimer() {
    if (!this.scanCurrentTarget || this.finished) return;

    const d = this.getDifficultySettings();
    const remainingMs = Math.max(0, this.scanCurrentTarget.expiresAt - this.time.now);
    const ratio = remainingMs / this.scanTargetWindowMs;

    this.scanTimerFill.width = Math.max(0, Math.round(this.scanTimerWidth * ratio));
    if (ratio <= 0.25) {
      this.scanTimerFill.setFillStyle(C.danger, 0.95);
    } else if (ratio <= 0.5) {
      this.scanTimerFill.setFillStyle(C.gold, 0.95);
    } else {
      this.scanTimerFill.setFillStyle(C.cyan, 0.95);
    }

    if (remainingMs <= 0) {
      this.combo = 0;
      this.scanStats.timeouts += 1;
      this.scanStats.resolved += 1;
      this.score = Math.max(0, this.score - d.scanTimeoutPenalty);
      this.updateHud();
      this.scanFeedbackText.setText("");
      this.cameras.main.shake(80, 0.0022);
      this.spawnNextScanTarget();
    }
  }

  submitScanEntry() {
    if (!this.scanCurrentTarget) return;
    if (!this.scanInput.row || !this.scanInput.col) return;

    const d = this.getDifficultySettings();
    const enteredRow = Number(this.scanInput.row);
    const enteredCol = Number(this.scanInput.col);
    const expectedRow = this.scanCurrentTarget.row;
    const expectedCol = this.scanCurrentTarget.col;
    const correct = enteredRow === expectedRow && enteredCol === expectedCol;

    this.scanStats.resolved += 1;
    if (correct) {
      const reaction = this.time.now - this.scanCurrentTarget.startedAt;
      const speedBonus =
        reaction <= this.scanTargetWindowMs * 0.33
          ? 70
          : reaction <= this.scanTargetWindowMs * 0.66
            ? 42
            : 20;
      const award = 118 + speedBonus + this.combo * 7;
      this.combo += 1;
      this.scanStats.correct += 1;
      this.scanStats.bestStreak = Math.max(this.scanStats.bestStreak, this.combo);
      this.addScore(award, this.scanTargetCell.x, this.scanTargetCell.y, "#4ade80");
      this.addBurst(this.scanTargetCell.x, this.scanTargetCell.y, C.mint);
      this.showScanFeedback(`LOGGED R${enteredRow} C${enteredCol}`, "#4ade80");
    } else {
      this.combo = 0;
      this.scanStats.wrong += 1;
      this.score = Math.max(0, this.score - d.scanWrongPenalty);
      this.updateHud();
      this.cameras.main.shake(80, 0.002);
      this.showScanFeedback(`MISMATCH (R${enteredRow} C${enteredCol})`, "#f87171");
    }

    this.spawnNextScanTarget();
  }

  showScanFeedback(message, color) {
    this.scanFeedbackText.setText(message);
    this.scanFeedbackText.setColor(color);
    this.scanFeedbackText.setAlpha(1);
    this.scanFeedbackTween?.remove();
    this.scanFeedbackTween = this.tweens.add({
      targets: this.scanFeedbackText,
      alpha: 0.12,
      duration: 760,
      delay: 260,
      ease: "Sine.easeOut",
    });
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update() {
    if (!this.gameConfig || this.finished) return;

    if (this.gameConfig.id === "speed") {
      this.speedPackets.forEach((packet) => {
        packet.y += 4.8;
        packet.y += this.getDifficultySettings().speedTravelStep - 4.8;
        if (packet.glowObj) packet.glowObj.y = packet.y;
      });
      const missed = this.speedPackets.filter((p) => p.y > 620);
      missed.forEach((packet) => {
        this.combo = 0;
        this.speedMisses += 1;
        this.score = Math.max(0, this.score - 45);
        packet.pulse?.remove();
        packet.glowObj?.destroy();
        Phaser.Utils.Array.Remove(this.speedPackets, packet);
        packet.destroy();
        this.updateHud();
      });
    }
  }

  // ── Complete Game ──────────────────────────────────────────────────────────

  completeGame() {
    if (this.finished) return;
    this.finished = true;
    this.timerEvent?.destroy();
    const d = this.getDifficultySettings();

    if (this.gameConfig.id === "speed") {
      const accuracy = this.speedHits
        ? Math.round((this.speedPerfect / this.speedHits) * 100)
        : 0;
      this.score = Math.max(0, this.score - this.speedMisses * 90);
      this.statLabel = `${this.speedHits} hits, ${accuracy}% perfect, ${this.speedMisses} misses`;
    }

    if (this.gameConfig.id === "power") {
      this.score += Math.max(
        0,
        this.powerStats.stableTicks * 4 -
          this.powerStats.overloads * d.powerEndOverloadPenalty,
      );
      this.statLabel = `${this.powerStats.goodCatch} clean catches, ${this.powerStats.overloads} overloads`;
    }

    if (this.gameConfig.id === "thermal") {
      const survivors = this.thermalCells.filter((c) => !c.burnedOut).length;
      this.score += survivors * 18;
      this.score = Math.max(0, this.score - this.thermalStats.burnouts * 120);
      this.statLabel = `${this.thermalStats.cools} saves, ${this.thermalStats.burnouts} burnouts`;
    }

    if (this.gameConfig.id === "cores") {
      this.score += this.coreStats.matches * 85;
      this.statLabel = `${this.coreStats.matches} correct, ${this.coreStats.misses} misses`;
    }

    if (this.gameConfig.id === "routing") {
      if (!this.routeStats.completedRounds) {
        this.statLabel = "No complete routes";
      } else {
        this.score += this.routeStats.completedRounds * 120;
        this.statLabel = `${this.routeStats.completedRounds} boards, ${this.routeStats.hazards} hazards`;
      }
    }

    if (this.gameConfig.id === "scan") {
      this.score += this.scanStats.correct * 48;
      this.score = Math.max(0, this.score - this.scanStats.timeouts * 14);
      this.statLabel = `${this.scanStats.correct} logged, ${this.scanStats.wrong} wrong, ${this.scanStats.timeouts} timeouts`;
    }

    this.score = Math.max(0, Math.round(this.score));
    const normalized = normalizeScore(
      this.score,
      Math.round(this.gameConfig.maxScore * d.scoreMultiplier),
    );
    this.time.delayedCall(500, () => {
      this.finishCallback({
        id: this.gameConfig.id,
        shortLabel: this.gameConfig.shortLabel,
        rawScore: this.score,
        normalized,
        medal: medalForScore(normalized),
        statLabel: this.statLabel || this.gameConfig.metric,
        difficultyId: this.difficultyId,
        difficultyLabel: this.difficulty?.label ?? "Medium",
      });
    });
  }
}
