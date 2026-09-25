(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./data'), require('./model'));
  else root.CatBusApp = factory(root.CatBusData, root.CatBusModel);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (D, M) {
  'use strict';
  const C = { bg: '#f3f7ef', ink: '#294e43', green: '#2f6655', mint: '#bbd7bd', pale: '#e3eddd', paper: '#fffcf4', yellow: '#efc575', orange: '#ca854e', gray: '#7a9184', line: '#d8e3d4', pink: '#dda08d', blue: '#cce2e2' };
  const W = 420, H = 840;
  class App {
    constructor(canvas, platform) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.platform = platform;
      let saved = null;
      try { saved = platform.load(); } catch (_) { this.storageError = true; }
      this.game = new M.Game(saved);
      this.screen = this.game.run ? 'trip' : 'home';
      this.hits = []; this.modal = null; this.selected = null; this.toast = null; this.frame = 0;
      this.width = W; this.height = H; this.ratio = 1; this.running = false;
      this.pointer = null; this.friendPage = 0;
      this.now = platform.now || Date.now;
      this.effects = []; this.seatPops = {}; this.travel = null;
      if (this.storageError) this.tell('存档暂不可用，本次进度可能无法保留');
    }
    resize(width, height, ratio = 1, safeTop = 0, safeBottom = 0) {
      this.width = width; this.height = height; this.ratio = Math.min(ratio, 3);
      this.canvas.width = Math.round(width * this.ratio); this.canvas.height = Math.round(height * this.ratio);
      this.scale = Math.min(width / W, (height - safeTop - safeBottom) / H);
      this.ox = (width - W * this.scale) / 2;
      this.oy = safeTop + (height - safeTop - safeBottom - H * this.scale) / 2;
      this.render();
    }
    save() {
      try { this.platform.save(this.game.snapshot()); } catch (_) { this.tell('无法保存进度，请检查设备存储空间'); }
    }
    tell(message) { this.toast = { message, until: Date.now() + 3200 }; }
    feedback() { if (this.game.profile.sound && this.platform.place) this.platform.place(); }
    mutate(result) { if (!result.ok) this.tell(result.reason); else { this.save(); this.feedback(); } return result.ok; }
    go(screen) { this.screen = screen; this.selected = null; this.modal = null; }
    motion() { return !this.platform.reducedMotion; }
    progress(since, duration) { return Math.max(0, Math.min(1, (this.now() - since) / duration)); }
    emit(x, y, kind = 'heart', count = 8) {
      if (!this.motion()) return;
      const since = this.now(), scope = this.modal || this.screen;
      for (let i = 0; i < count; i++) {
        const angle = i * 2.39996;
        this.effects.push({ x, y, kind, since, scope, vx: Math.cos(angle) * (25 + i * 4), vy: -45 - i * 6, life: 900 + i % 4 * 180, spin: angle, size: 8 + i % 3 * 3 });
      }
      this.effects = this.effects.slice(-64);
    }
    drawEffects() {
      const g = this.ctx, now = this.now();
      this.effects = this.motion() ? this.effects.filter(p => now - p.since < p.life && p.scope === (this.modal || this.screen)) : [];
      for (const p of this.effects) {
        const t = (now - p.since) / 1000, progress = (now - p.since) / p.life;
        g.save(); g.globalAlpha = Math.min(1, (1 - progress) * 2.5);
        g.translate(p.x + p.vx * t, p.y + p.vy * t + (p.kind === 'confetti' ? 65 : -8) * t * t);
        if (p.kind === 'confetti') { g.rotate(p.spin + t * 3); this.rr(-3, -6, 6, 12, 2, [C.yellow, C.mint, C.pink, C.blue][Math.floor(p.size) % 4]); }
        else this.icon(p.kind, 0, 0, p.size, p.kind === 'heart' ? C.pink : C.yellow);
        g.restore();
      }
    }
    place(uid, seat) {
      if (!this.mutate(this.game.place(uid, seat))) return;
      if (seat !== null) {
        this.seatPops[uid] = this.now();
        const p = this.game.run.passengers.find(p => p.uid === uid), b = this.seatBox(p.seat);
        if (M.scoreRun(this.game.run).find(s => s.uid === uid).happy) { this.emit(b.x + (p.catId === 'orange' ? 65 : 30), b.y + 10, 'heart', 5); if (this.game.profile.sound && this.platform.happy) this.platform.happy(); }
      }
    }
    beginTravel() { this.travel = this.motion() ? { since: this.now(), stop: this.game.run.stop } : null; this.seatPops = {}; }
    drawTravel() {
      const t = this.progress(this.travel.since, 1100);
      if (t >= 1 || !this.motion()) { this.travel = null; return; }
      const g = this.ctx;
      this.hits = this.hits.filter(h => h.id.startsWith('nav-') || h.id === 'sound-toggle');
      g.save();
      this.rr(24, 216, 372, 482, 27, C.paper, C.line);
      this.scenery(243, 240);
      g.save(); g.beginPath(); g.rect(25, 244, 370, 238); g.clip();
      const arrival = 1 - Math.pow(1 - Math.min(1, t / 0.75), 3);
      this.bus(-260 + 325 * arrival, 305 + Math.sin(t * 20) * 1.5, 1.03, 0, t * 16);
      g.restore();
      this.text('叮咚，' + D.stops[this.travel.stop] + '到啦', 210, 535, 23, C.green, 'bold', 'center', true);
      this.text('坐稳扶好，快乐马上出发', 210, 571, 12, C.gray, 'normal', 'center');
      this.button('skip-arrival', '安排猫咪上车  →', 83, 625, 254, 42, () => { this.travel = null; }, 'outline');
      g.restore();
    }
    start(mode) {
      if (this.game.run) { this.screen = 'trip'; this.tell('先继续这一趟，猫咪还在等你'); return; }
      if (this.mutate(this.game.start(mode))) { this.screen = 'trip'; this.selected = this.game.run.passengers[0].uid; this.beginTravel(); }
    }
    startLoop() {
      if (this.running) return;
      this.running = true;
      const epoch = this.loopEpoch = (this.loopEpoch || 0) + 1;
      let last = 0;
      const loop = (time) => {
        if (!this.running || this.loopEpoch !== epoch) return;
        if (!last || time - last >= 32) { this.render(); last = time; }
        this.platform.raf(loop);
      };
      this.platform.raf(loop);
    }
    stopLoop() { this.running = false; this.save(); }
    pos(x, y) { return { x: (x - this.ox) / this.scale, y: (y - this.oy) / this.scale }; }
    down(x, y) {
      const p = this.pos(x, y);
      const hit = this.hits.slice().reverse().find(h => p.x >= h.x && p.y >= h.y && p.x <= h.x + h.w && p.y <= h.y + h.h);
      this.pointer = { start: p, current: p, hit, dragging: false };
      if (hit && hit.catUid) this.selected = hit.catUid;
    }
    move(x, y) {
      if (!this.pointer) return;
      const p = this.pos(x, y); this.pointer.current = p;
      if (this.pointer.hit && this.pointer.hit.catUid && Math.hypot(p.x - this.pointer.start.x, p.y - this.pointer.start.y) > 8) this.pointer.dragging = true;
    }
    up(x, y) {
      if (!this.pointer) return;
      const p = this.pos(x, y), pointer = this.pointer; this.pointer = null;
      if (pointer.dragging && pointer.hit) {
        const seat = this.seatAt(p.x, p.y);
        if (seat !== null) this.place(pointer.hit.catUid, seat);
        else if (p.y >= 580 && p.y <= 714) this.place(pointer.hit.catUid, null);
      } else if (pointer.hit && p.x >= pointer.hit.x && p.y >= pointer.hit.y && p.x <= pointer.hit.x + pointer.hit.w && p.y <= pointer.hit.y + pointer.hit.h) {
        if (this.game.profile.sound && this.platform.click) this.platform.click();
        pointer.hit.action();
      }
      this.render();
    }
    activate(id) { const h = this.hits.find(h => h.id === id); if (h) { h.action(); this.render(); } }
    rr(x, y, w, h, r, fill, stroke) {
      const g = this.ctx; r = Math.min(r, w / 2, h / 2);
      g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
      if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1.2; g.stroke(); }
    }
    ellipse(x, y, rx, ry, fill, stroke) {
      const g = this.ctx; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1.7; g.stroke(); }
    }
    line(points, color, width = 1.5) {
      const g = this.ctx; g.beginPath(); points.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
    }
    text(t, x, y, size = 14, color = C.ink, weight = 'normal', align = 'left', display = false) {
      const g = this.ctx; g.font = `${weight} ${size}px ${display ? '"STKaiti", "KaiTi", ' : ''}"PingFang SC", "Microsoft YaHei", sans-serif`; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(String(t), x, y);
    }
    wrap(t, x, y, maxWidth, size = 13, color = C.gray, lineHeight = 22) {
      let row = '', line = 0;
      for (const ch of t) { this.ctx.font = `${size}px "Microsoft YaHei", sans-serif`; if (this.ctx.measureText(row + ch).width > maxWidth) { this.text(row, x, y + line * lineHeight, size, color); row = ch; line++; } else row += ch; }
      if (row) this.text(row, x, y + line * lineHeight, size, color);
      return (line + 1) * lineHeight;
    }
    hit(id, label, x, y, w, h, action, extra = {}) { this.hits.push({ id, label, x, y, w, h, action, ...extra }); }
    button(id, label, x, y, w, h, action, variant = 'green') {
      const color = variant === 'green' ? C.green : variant === 'yellow' ? C.yellow : variant === 'muted' ? C.pale : C.paper;
      const pressed = this.motion() && this.pointer && this.pointer.hit && this.pointer.hit.id === id;
      this.ctx.save(); if (pressed) this.ctx.translate(0, 3);
      if (variant === 'green') this.rr(x, y + 4, w, h, 18, '#204b3d');
      this.rr(x, y, w, h, 18, color, variant === 'outline' ? C.line : null);
      this.text(label, x + w / 2, y + h / 2, h > 44 ? 16 : 13, variant === 'green' ? C.paper : C.ink, 'bold', 'center');
      this.ctx.restore();
      this.hit(id, label, x, y, w, h + (variant === 'green' ? 4 : 0), action);
    }
    icon(kind, x, y, size = 20, color = C.ink) {
      const g = this.ctx; g.save(); g.translate(x, y); g.scale(size / 24, size / 24);
      if (kind === 'fish') { this.ellipse(0, 0, 7, 4, color); this.line([[5, 0], [11, -5], [11, 5], [5, 0]], color, 2); this.ellipse(-3, -1, 1, 1, C.paper); }
      else if (kind === 'ticket') { this.rr(-10, -7, 20, 14, 3, null, color); this.line([[3, -5], [3, 5]], color, 1); this.text('•', -3, 0, 10, color, 'bold', 'center'); }
      else if (kind === 'heart') { g.beginPath(); g.moveTo(0, 8); g.bezierCurveTo(-21, -4, -7, -16, 0, -6); g.bezierCurveTo(7, -16, 21, -4, 0, 8); g.fillStyle = color; g.fill(); }
      else if (kind === 'bus') { this.rr(-9, -9, 18, 17, 5, null, color); this.rr(-6, -6, 12, 7, 2, color); this.ellipse(-5, 5, 1.2, 1.2, color); this.ellipse(5, 5, 1.2, 1.2, color); this.line([[-6, 8], [-6, 11]], color, 3); this.line([[6, 8], [6, 11]], color, 3); }
      else if (kind === 'cat') { this.line([[-9, 6], [-10, -8], [-4, -4], [4, -4], [10, -8], [9, 6]], color, 1.8); this.line([[-9, 6], [-4, 10], [4, 10], [9, 6]], color, 1.8); this.ellipse(-4, 1, 1, 1, color); this.ellipse(4, 1, 1, 1, color); this.line([[-2, 5], [0, 6], [2, 5]], color, 1.5); }
      else if (kind === 'cup') { this.rr(-6, -9, 12, 14, 4, null, color); this.line([[-6, -6], [-11, -6], [-10, 0], [-6, 2]], color); this.line([[6, -6], [11, -6], [10, 0], [6, 2]], color); this.line([[0, 5], [0, 10], [-5, 10], [5, 10]], color, 2); }
      else if (kind === 'sound') { this.line([[-9, -3], [-5, -3], [1, -8], [1, 8], [-5, 3], [-9, 3], [-9, -3]], color); this.line([[5, -5], [8, 0], [5, 5]], color); }
      else if (kind === 'leaf') { this.ellipse(0, 0, 8, 4, color); this.line([[-9, 5], [6, -2]], C.paper, 1); }
      g.restore();
    }
    cat(id, x, y, scale = 1, happy = false, dim = false) {
      const cat = D.byId[id], g = this.ctx;
      const phase = D.cats.indexOf(cat) * 1.37, time = this.now() / 1000;
      const alive = this.motion() && !dim, breath = alive ? Math.sin(time * 2.1 + phase) : 0;
      const blink = alive && (time + phase) % 4.7 > 4.52;
      g.save(); g.translate(x, y); g.scale(scale, scale); if (dim) g.globalAlpha = 0.42;
      this.ellipse(0, 33, 29, 5, 'rgba(45,72,55,.10)');
      g.translate(0, -breath * 0.9); g.scale(1 - breath * 0.008, 1 + breath * 0.018);
      const tail = alive ? Math.sin(time * (happy ? 3.2 : 1.8) + phase) * 5 : 0;
      this.line([[21, 23], [34, 23], [38 + tail, 14], [34 + tail, 9 - tail * 0.5]], cat.color, 8);
      this.ellipse(0, 17, id === 'orange' ? 29 : 23, 22, cat.color, cat.ink);
      this.ellipse(0, 22, 14, 14, cat.patch);
      this.line([[-24, -10], [-24, -35], [-9, -24]], cat.ink, 2);
      g.beginPath(); g.moveTo(-24, -9); g.lineTo(-24, -35); g.lineTo(-7, -23); g.closePath(); g.fillStyle = cat.color; g.fill();
      g.beginPath(); g.moveTo(24, -9); g.lineTo(24, -35); g.lineTo(7, -23); g.closePath(); g.fill();
      this.line([[24, -10], [24, -35], [9, -24]], cat.ink, 2);
      g.beginPath(); g.moveTo(-21, -29); g.lineTo(-20, -17); g.lineTo(-13, -23); g.closePath(); g.fillStyle = '#dbaca0'; g.fill();
      g.beginPath(); g.moveTo(21, -29); g.lineTo(20, -17); g.lineTo(13, -23); g.closePath(); g.fill();
      this.ellipse(0, -6, 28, 24, cat.color, cat.ink);
      if (['cream', 'pudding', 'sesame'].includes(id)) this.ellipse(8, -15, 13, 11, cat.patch);
      if (id === 'orange') { this.line([[-8, -28], [-5, -20]], cat.ink, 3); this.line([[0, -29], [1, -20]], cat.ink, 3); this.line([[9, -27], [7, -20]], cat.ink, 3); }
      if (blink) { this.line([[-13, -6], [-7, -6]], cat.ink, 2); this.line([[7, -6], [13, -6]], cat.ink, 2); }
      else if (happy || id === 'cloud') { this.line([[-15, -5], [-11, -8], [-7, -5]], cat.ink, 2); this.line([[7, -5], [11, -8], [15, -5]], cat.ink, 2); }
      else { this.ellipse(-10, -7, 2, 3, cat.ink); this.ellipse(10, -7, 2, 3, cat.ink); }
      this.ellipse(-18, 1, 5, 2.5, '#dfaaa1'); this.ellipse(18, 1, 5, 2.5, '#dfaaa1');
      this.ellipse(0, 0, 2.7, 1.8, cat.ink); this.line([[0, 1], [0, 5], [-4, 7]], cat.ink, 1.4); this.line([[0, 5], [4, 7]], cat.ink, 1.4);
      this.line([[-21, 4], [-33, 1]], cat.ink, 1); this.line([[-21, 8], [-32, 9]], cat.ink, 1); this.line([[21, 4], [33, 1]], cat.ink, 1); this.line([[21, 8], [32, 9]], cat.ink, 1);
      this.ellipse(-13, 32, 8, 5, cat.color, cat.ink); this.ellipse(13, 32, 8, 5, cat.color, cat.ink);
      if (id === 'mint') this.icon('leaf', 20, -28, 13, C.green);
      if (id === 'peach') { this.ellipse(21, -23, 5, 5, '#c57877'); this.ellipse(26, -25, 5, 5, '#c57877'); this.ellipse(23, -25, 2, 2, C.yellow); }
      if (id === 'cloud' && alive) { const z = (time + phase) % 2.8 / 2.8; g.globalAlpha *= Math.sin(z * Math.PI) * 0.75; this.text('z', 30 + z * 8, -30 - z * 19, 11, C.gray, 'bold'); }
      g.restore();
    }
    header() {
      this.icon('cat', 30, 31, 23);
      this.text('猫咪挤挤车', 49, 31, 16, C.ink, 'bold');
      this.rr(185, 15, 86, 33, 16, C.paper, C.line); this.icon('fish', 203, 31, 17, C.orange); this.text(this.game.profile.fish, 223, 32, 13, C.ink, 'bold');
      this.rr(277, 15, 84, 33, 16, C.paper, C.line); this.icon('ticket', 295, 31, 17, C.green); this.text(this.game.profile.tickets, 314, 32, 13, C.ink, 'bold');
      const on = this.game.profile.sound, g = this.ctx;
      g.save(); g.globalAlpha = 0.5;
      this.rr(364, 15, 32, 33, 16, on ? C.green : C.gray);
      g.restore();
      this.icon('sound', 378, 31, 15, C.paper);
      if (!on) this.line([[372, 25], [384, 37]], C.paper, 2);
      this.hit('sound-toggle', on ? '关闭音效和音乐' : '开启音效和音乐', 362, 13, 36, 37, () => this.toggleSound());
      this.line([[24, 62], [396, 62]], C.line);
    }
    nav() {
      this.rr(14, 764, 392, 66, 24, C.paper, C.line);
      const tabs = [['home', '巴士总站', 'bus'], ['station', '车站偶遇', 'ticket'], ['collection', '猫咪小屋', 'cat'], ['daily', '每日挑战', 'cup']];
      tabs.forEach(([screen, label, icon], i) => {
        const x = 19 + i * 97, selected = this.screen === screen || screen === 'home' && this.screen === 'trip';
        if (selected) this.rr(x + 4, 770, 82, 53, 18, C.pale);
        this.icon(icon, x + 45, 786, 21, selected ? C.green : C.gray);
        this.text(label, x + 45, 811, 11, selected ? C.green : C.gray, selected ? 'bold' : 'normal', 'center');
        this.hit('nav-' + screen, label, x, 768, 91, 58, () => this.go(screen === 'home' && this.game.run ? 'trip' : screen));
      });
    }
    toggleSound() {
      this.game.profile.sound = !this.game.profile.sound; this.save();
      if (this.game.profile.sound) {
        if (this.platform.ensureAudio) this.platform.ensureAudio();
        if (this.platform.audioUnsupported) { this.tell('此环境不支持音频，请用手机预览试听'); return; }
        if (this.platform.startBgm) this.platform.startBgm();
        this.tell('音效与音乐已开启');
        this.feedback();
      } else {
        if (this.platform.stopBgm) this.platform.stopBgm();
        this.tell('音效与音乐已关闭');
      }
    }
    scenery(y, h = 235) {
      const g = this.ctx;
      this.rr(24, y, 372, h, 30, '#e0eee2');
      g.save(); g.beginPath(); g.rect(25, y + 1, 370, h - 2); g.clip();
      this.ellipse(332, y + 42, 25, 25, '#f3d38e');
      const wind = this.motion() ? Math.sin(this.now() / 6500) * 17 : 0;
      this.ellipse(80 + wind, y + 39, 28, 9, '#f7faf1'); this.ellipse(101 + wind, y + 36, 19, 13, '#f7faf1');
      this.ellipse(215 - wind * 0.7, y + 65, 28, 8, '#f7faf1'); this.ellipse(231 - wind * 0.7, y + 60, 15, 12, '#f7faf1');
      this.ellipse(112, y + h - 22, 132, 62, '#c3d8b8'); this.ellipse(313, y + h - 6, 137, 86, '#bad3b2');
      this.line([[25, y + h - 17], [395, y + h - 17]], '#edf2db', 23);
      for (const [x, t] of [[48, 0], [367, 16]]) { this.line([[x, y + h - 42], [x, y + h - 120 + t]], '#839b77', 4); this.ellipse(x, y + h - 120 + t, 23, 38, '#91b494'); this.ellipse(x - 12, y + h - 105 + t, 17, 26, '#9abd97'); }
      if (this.motion()) for (let i = 0; i < 4; i++) {
        const t = (this.now() / 6500 + i * 0.24) % 1;
        g.save(); g.translate(380 - t * 380, y + 40 + t * 110 + Math.sin(t * 8 + i) * 10); g.rotate(t * 4 + i); g.globalAlpha = Math.sin(t * Math.PI) * 0.55; this.ellipse(0, 0, 4, 2, C.paper); g.restore();
      }
      g.restore();
    }
    bus(x, y, s = 1, door = 0, wheels = 0) {
      const g = this.ctx; g.save(); g.translate(x, y); g.scale(s, s);
      this.ellipse(140, 141, 126, 10, 'rgba(52,85,65,.13)');
      this.rr(6, 16, 274, 116, 26, '#629981', '#3d6956');
      this.rr(13, 23, 260, 97, 22, '#a9c9a4');
      this.rr(13, 80, 260, 35, 10, '#ecdfb3');
      this.rr(22, 33, 169, 49, 9, '#e9f3df', '#679581');
      [0, 1, 2].forEach(i => { this.cat(['cream', 'orange', 'coal'][i], 50 + i * 55, 63, 0.53, true); if (i < 2) this.line([[77 + i * 55, 33], [77 + i * 55, 81]], '#679581', 4); });
      this.rr(207, 33, 52, 79, 9, '#507463', '#679581');
      this.rr(207, 33, 26 * (1 - door) + 1, 79, 4, '#d6e7d4', '#679581');
      this.rr(232 + 26 * door, 33, 27 * (1 - door) + 1, 79, 4, '#d6e7d4', '#679581');
      this.rr(59, 7, 151, 20, 8, C.paper, '#679581'); this.text('喵  01  ·  花园环线', 134, 17, 10, C.ink, 'bold', 'center');
      this.ellipse(61, 130, 20, 20, '#3c554d'); this.ellipse(61, 130, 9, 9, '#d7dfc9'); this.ellipse(222, 130, 20, 20, '#3c554d'); this.ellipse(222, 130, 9, 9, '#d7dfc9');
      for (const cx of [61, 222]) { g.save(); g.translate(cx, 130); g.rotate(wheels); this.line([[-6, 0], [6, 0]], '#96ad97', 2); this.line([[0, -6], [0, 6]], '#96ad97', 2); g.restore(); }
      this.rr(0, 102, 16, 15, 5, '#daab74'); this.rr(265, 93, 17, 18, 6, '#f6d891');
      this.text('CAT BUS', 127, 99, 12, '#56735a', 'bold', 'center'); this.icon('leaf', 177, 98, 15, '#648767');
      g.restore();
    }
    home() {
      this.text('一辆小巴士，一路好朋友', 210, 94, 13, C.gray, 'normal', 'center');
      this.text('今天也要，满载快乐。', 210, 135, 30, C.ink, 'bold', 'center', true);
      this.scenery(173, 244);
      const bob = this.motion() ? Math.sin(this.now() / 800) * 1.5 : 0;
      this.bus(68, 244 + bob, 1.02);
      this.rr(42, 190, 94, 28, 14, C.paper); this.text('慢慢开，不着急', 89, 204, 10, C.green, 'normal', 'center');
      this.rr(25, 433, 370, 89, 20, C.paper, C.line);
      this.icon('bus', 52, 461, 23, C.green); this.text('花园环线', 74, 459, 17, C.ink, 'bold'); this.text('约 3 分钟 / 不限时', 374, 460, 11, C.gray, 'normal', 'right');
      this.line([[51, 494], [369, 494]], C.line, 2);
      D.stops.forEach((name, i) => { const x = 66 + 144 * i; this.ellipse(x, 494, 4, 4, i === 0 ? C.green : C.mint); this.text(name, x + (i === 0 ? 10 : i === 2 ? -10 : 0), 505, 10, C.gray, 'normal', i === 0 ? 'left' : i === 2 ? 'right' : 'center'); });
      this.button('start-normal', this.game.run ? '继续这一趟  →' : '出发，接猫咪回家  →', 25, 545, 370, 56, () => this.start('normal'));
      this.text('给每一只猫，找一个舒服的位置', 210, 626, 12, C.gray, 'normal', 'center');
      this.button('home-collection', `常客手册  ${Object.keys(this.game.profile.collection).length} / 8`, 25, 651, 179, 53, () => this.go('collection'), 'outline');
      this.button('home-daily', '今日同车挑战  ↗', 215, 651, 180, 53, () => this.go('daily'), 'yellow');
      this.text('已完成 ' + this.game.profile.trips + ' 趟温柔接送', 27, 734, 11, C.gray);
      this.hit('help', '玩法说明', 265, 714, 130, 42, () => { this.modal = { type: 'help' }; }); this.text('怎么玩', 330, 734, 11, C.gray, 'normal', 'center');
    }
    seatBox(index) { return { x: [65, 135, 225, 295][index % 4], y: 300 + Math.floor(index / 4) * 79, w: 60, h: 65 }; }
    seatAt(x, y) { for (let i = 0; i < 12; i++) { const b = this.seatBox(i); if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return i; } return null; }
    trip() {
      const run = this.game.run;
      if (!run) { this.screen = 'home'; this.home(); return; }
      const scores = M.scoreRun(run), total = scores.reduce((s, x) => s + x.points, 0);
      this.text(run.mode === 'daily' ? '每日同车 · ' + run.day.slice(5) : '喵 01  /  花园环线', 25, 88, 11, C.gray);
      this.text(D.stops[run.stop], 25, 121, 28, C.ink, 'bold', 'left', true);
      this.rr(273, 94, 122, 44, 16, '#e5edda'); this.icon('heart', 294, 116, 15, C.orange); this.text(`${run.total} + ${total}`, 313, 117, 16, C.green, 'bold');
      D.stops.forEach((name, i) => {
        const x = 56 + 151 * i;
        if (i < 2) this.line([[x + 10, 165], [x + 139, 165]], i < run.stop ? C.green : C.line, 3);
        this.ellipse(x, 165, 7, 7, i <= run.stop ? C.green : C.line); this.text(name, x, 185, 11, i === run.stop ? C.green : C.gray, 'normal', 'center');
      });
      this.text('拖猫咪上车，或点猫咪后再点空座', 210, 205, 10, C.gray, 'normal', 'center');
      this.rr(35, 218, 350, 332, 37, '#a8c8af', '#7ca78d');
      this.rr(47, 232, 326, 304, 29, '#f5f1dc');
      this.rr(87, 243, 246, 34, 12, '#d4e3cc'); this.text('车  头       ·       安 心 坐 好', 210, 260, 11, '#65816b', 'normal', 'center');
      this.line([[210, 295], [210, 517]], '#dbdbc3', 2);
      for (let row = 0; row < 3; row++) { this.rr(38, 305 + row * 79, 9, 49, 4, '#d8edf0'); this.rr(373, 305 + row * 79, 9, 49, 4, '#d8edf0'); }
      for (let i = 0; i < 12; i++) {
        const b = this.seatBox(i);
        this.rr(b.x, b.y + 4, b.w, b.h, 13, '#c8cbb2'); this.rr(b.x, b.y, b.w, b.h - 2, 13, '#e4e3c8', '#cdceb2');
        this.text('+', b.x + 30, b.y + 32, 22, '#b3baa0', 'normal', 'center');
        this.hit('seat-' + i, '座位 ' + (Math.floor(i / 4) + 1) + ' 排 ' + (i % 4 + 1) + ' 列', b.x, b.y, b.w, b.h, () => {
          if (this.selected) this.place(this.selected, i); else this.tell('先点一只猫咪，再点座位');
        });
      }
      run.passengers.filter(p => p.seat !== null).forEach(p => {
        const b = this.seatBox(p.seat), big = p.catId === 'orange', w = big ? 130 : 60;
        const happy = scores.find(s => s.uid === p.uid).happy;
        if (p.uid === this.selected) this.rr(b.x - 3, b.y - 3, w + 6, b.h + 6, 16, null, C.green);
        if (run.mode === 'normal' && this.game.profile.collection[p.catId] >= 120) this.icon('heart', b.x + w / 2, b.y + 50, 28, '#e8b5a0');
        const pop = this.motion() && this.seatPops[p.uid] !== undefined ? Math.sin(this.progress(this.seatPops[p.uid], 360) * Math.PI) : 0;
        this.cat(p.catId, b.x + w / 2, b.y + 27 - pop * 8, (big ? 0.77 : 0.65) * (1 + pop * 0.1), happy);
        this.rr(b.x + w - 20, b.y - 6, 27, 17, 7, happy ? C.green : '#9da88d'); this.text(happy ? '+18' : '+10', b.x + w - 6, b.y + 3, 9, C.paper, 'bold', 'center');
        this.hit('cat-' + p.uid, D.byId[p.catId].name + '，' + D.byId[p.catId].hint, b.x, b.y, w, b.h, () => { this.selected = p.uid; }, { catUid: p.uid });
      });
      const selected = run.passengers.find(p => p.uid === this.selected);
      this.text(selected ? D.byId[selected.catId].name + '：' + D.byId[selected.catId].hint : '点猫咪，再点座位；也可以直接拖动', 210, 569, selected ? 11 : 12, C.green, 'normal', 'center');
      this.rr(24, 590, 372, 107, 20, C.paper, C.line);
      this.text('候车小站', 39, 608, 11, C.gray);
      const waiting = run.passengers.filter(p => p.seat === null);
      if (!waiting.length) this.text('全员上车啦，随时可以出发', 210, 651, 13, C.green, 'normal', 'center');
      waiting.forEach((p, i) => {
        const spacing = Math.min(79, 333 / waiting.length), x = 44 + spacing / 2 + i * spacing;
        if (p.uid === this.selected) this.rr(x - 32, 622, 64, 66, 13, C.pale);
        this.cat(p.catId, x, 645, 0.54, false);
        this.text(D.byId[p.catId].name, x, 681, 10, C.ink, 'normal', 'center');
        this.hit('cat-' + p.uid, '选择' + D.byId[p.catId].name + '，' + D.byId[p.catId].hint, x - spacing / 2, 621, spacing, 69, () => { this.selected = p.uid; }, { catUid: p.uid });
      });
      this.button('unseat', '回候车区', 25, 711, 112, 38, () => {
        const p = run.passengers.find(p => p.uid === this.selected);
        if (!p) this.tell('先点一只车上的猫咪');
        else if (p.seat === null) this.tell('它已经在候车区啦，点车上的猫咪才能移下来');
        else this.mutate(this.game.place(p.uid, null));
      }, 'outline');
      this.button('advance', run.stop === 2 ? '到达终点 · 收获快乐' : '坐好啦，下一站  →', 148, 709, 247, 40, () => {
        const result = this.game.advance();
        if (!this.mutate(result)) return;
        this.selected = null;
        if (this.game.profile.sound && this.platform.advance) this.platform.advance();
        if (result.finished) {
          this.screen = 'home'; this.modal = { type: 'result', result, since: this.now() }; this.emit(210, 285, 'confetti', 30);
          if (result.mode === 'daily' && this.platform.submitScore) this.platform.submitScore(result.day, this.game.profile.daily[result.day].score, message => this.tell(message));
        } else { this.tell(`幸福值 +${result.stationScore} · ${result.left.length} 位下车，3 位新乘客等车`); this.selected = this.game.run.passengers.find(p => p.seat === null).uid; this.beginTravel(); }
      });
    }
    station() {
      this.text('车站偶遇', 25, 110, 31, C.ink, 'bold', 'left', true);
      this.text('下一扇车门后，会是谁呢？', 26, 147, 13, C.gray);
      this.scenery(172, 219);
      this.bus(66, 222, 1.03);
      this.rr(38, 407, 344, 128, 20, C.paper, C.line);
      this.text('一张车票，一次相遇', 59, 433, 18, C.ink, 'bold');
      this.wrap('每只猫基础概率 12.5%；重复相遇获得 1 枚邮票。集齐 5 枚，可以指定邀请新朋友。', 59, 467, 301, 12, C.gray, 21);
      const missing = D.cats.filter(c => this.game.profile.collection[c.id] === undefined).length;
      this.text(missing ? `最多再 ${Math.max(1, 6 - this.game.profile.pity)} 次，必遇一位新朋友` : '全员到齐！重复邮票为你保留', 210, 559, 13, C.green, 'bold', 'center');
      this.button('draw-cat', '打开车门  ·  1 张车票', 25, 585, 370, 55, () => {
        const result = this.game.draw();
        if (this.mutate(result)) { this.modal = { type: 'draw', result, since: this.now() }; this.emit(210, 305, 'confetti', 18); if (this.game.profile.sound && this.platform.draw) this.platform.draw(); }
      });
      this.text('纪念邮票  ' + this.game.profile.stamps + ' 枚', 210, 672, 14, C.ink, 'normal', 'center');
      this.button('redeem-cats', '查看图鉴 / 指定邀请  →', 75, 699, 270, 42, () => this.go('collection'), 'outline');
    }
    collection() {
      this.text('猫咪小屋', 25, 105, 29, C.ink, 'bold', 'left', true);
      this.text(`${Object.keys(this.game.profile.collection).length} / 8 位常客`, 393, 105, 13, C.gray, 'normal', 'right');
      this.text('喂点好吃的，让关系慢慢升温。', 26, 139, 12, C.gray);
      D.cats.forEach((cat, i) => {
        const x = 25 + i % 2 * 190, y = 167 + Math.floor(i / 2) * 143;
        const hearts = this.game.profile.collection[cat.id], owned = hearts !== undefined;
        this.rr(x, y, 180, 132, 19, owned ? C.paper : '#e9eee4', C.line);
        this.cat(cat.id, x + 45, y + 50, 0.74, hearts >= 20, !owned);
        this.text(cat.name, x + 86, y + 32, 15, C.ink, 'bold');
        this.text(owned ? M.stage(hearts).name : '等待相遇', x + 86, y + 56, 10, C.gray);
        this.text(cat.trait, x + 86, y + 76, 9, C.gray);
        if (this.game.profile.invite === cat.id) { this.rr(x + 11, y + 9, 38, 17, 7, C.green); this.text('已预约', x + 30, y + 18, 8, C.paper, 'normal', 'center'); }
        this.rr(x + 16, y + 104, 113, 6, 3, C.pale);
        if (owned && hearts > 0) this.rr(x + 16, y + 104, Math.max(6, 113 * hearts / 120), 6, 3, C.pink);
        this.text(owned ? hearts + ' / 120' : '未收集', x + 166, y + 107, 9, C.gray, 'normal', 'right');
        this.hit('detail-' + cat.id, cat.name + (owned ? '，好感度 ' + hearts : '，尚未收集'), x, y, 180, 132, () => { this.modal = { type: 'cat', id: cat.id }; });
      });
      this.text('不用打卡，猫咪会一直记得你。', 210, 752, 10, C.gray, 'normal', 'center');
    }
    daily() {
      const today = M.dayKey(), record = this.game.profile.daily[today];
      this.text('每日同车挑战', 25, 108, 28, C.ink, 'bold', 'left', true);
      this.text(today.replace(/-/g, ' . ') + '   /   每天一条新路线', 26, 145, 12, C.gray);
      this.rr(25, 170, 370, 185, 25, C.green);
      this.icon('cup', 66, 209, 31, C.yellow);
      this.text('同一辆车，看谁更懂猫', 94, 210, 19, C.paper, 'bold');
      this.text('相同乘客 · 相同顺序 · 好感度不加分', 49, 251, 12, '#cee1d2');
      this.button('start-daily', this.game.run ? '继续当前旅程  →' : '出发，挑战今日最佳  →', 47, 286, 326, 46, () => this.start('daily'), 'yellow');
      this.rr(25, 373, 370, 96, 20, C.paper, C.line);
      this.text('我的今日最佳', 46, 400, 13, C.gray);
      this.text(record ? record.score : '—', 47, 439, 30, C.green, 'bold');
      this.text(record ? '幸福值' : '还没出发，先去接猫吧', 134, 440, 12, C.gray);
      this.icon('heart', 351, 424, 36, C.pink);
      this.text('乘车记录', 26, 503, 17, C.ink, 'bold');
      this.text('此设备上的真实成绩', 394, 503, 11, C.gray, 'normal', 'right');
      const records = this.game.profile.history.slice(-3).reverse();
      if (!records.length) { this.rr(25, 527, 370, 107, 18, C.pale); this.text('第一张旅程纪念票，等你来写。', 210, 580, 13, C.gray, 'normal', 'center'); }
      records.forEach((r, i) => {
        const y = 527 + i * 43;
        this.line([[28, y + 39], [392, y + 39]], C.line);
        this.text(r.day.slice(5), 30, y + 19, 12, C.gray); this.text(r.mode === 'daily' ? '每日同车' : '花园环线', 105, y + 19, 13); this.text(r.score + ' 幸福值', 388, y + 19, 13, C.green, 'bold', 'right');
      });
      this.button('friends', '好友排行榜  ↗', 25, 678, 370, 43, () => {
        this.modal = { type: 'friends' }; this.friendPage = 0;
        if (this.platform.friendRank) this.platform.friendRank(today, 0);
      }, 'outline');
      this.text('可反复挑战；每天首次完成获得车票与小鱼干', 210, 742, 10, C.gray, 'normal', 'center');
    }
    sheet(title, y = 145, h = 608) {
      this.ctx.fillStyle = 'rgba(27,49,39,.36)'; this.ctx.fillRect(0, 0, W, H);
      this.hits = [];
      this.rr(20, y + 6, 380, h, 29, 'rgba(30,55,41,.10)');
      this.rr(20, y, 380, h, 29, C.paper);
      this.text(title, 44, y + 34, 21, C.ink, 'bold', 'left', true);
      this.text('×', 369, y + 34, 26, C.gray, 'normal', 'center');
      this.hit('close-modal', '关闭弹窗', 343, y + 11, 48, 48, () => { this.modal = null; });
    }
    drawModal() {
      const modal = this.modal;
      if (modal.type === 'cat') this.catModal(modal.id);
      else if (modal.type === 'keepsake') {
        const cat = D.byId[modal.id];
        this.sheet('专属常客纪念卡', 143, 582);
        this.rr(48, 217, 324, 415, 22, '#e7eedc', '#c8d5bd');
        this.text('CAT BUS CLUB · FOREVER FRIENDS', 210, 245, 10, C.gray, 'bold', 'center');
        this.ellipse(210, 366, 96, 88, C.paper); this.cat(cat.id, 210, 360, 1.9, true);
        this.text(cat.name + '的专属座位', 210, 486, 24, C.ink, 'bold', 'center', true);
        this.text('常客编号  CB-00' + (D.cats.indexOf(cat) + 1), 210, 525, 12, C.gray, 'normal', 'center');
        this.wrap(cat.secret, 77, 566, 266, 13, C.green, 23);
        this.button('keepsake-back', '回到常客档案', 70, 656, 280, 42, () => { this.modal = { type: 'cat', id: cat.id }; }, 'outline');
      }
      else if (modal.type === 'draw') {
        const r = modal.result;
        this.sheet(r.isNew ? '认识你，好开心！' : '原来是老朋友呀', 152, 580);
        this.ellipse(210, 318, 107, 101, '#e4edda');
        const reveal = this.motion() ? this.progress(modal.since === undefined ? this.now() - 1000 : modal.since, 900) : 1;
        const bounce = Math.sin(reveal * Math.PI) * 8;
        this.cat(r.cat.id, 210, 308 - bounce, 2.1, true);
        if (reveal < 1) {
          const opening = 1 - Math.pow(1 - reveal, 3), g = this.ctx;
          g.save(); g.beginPath(); g.rect(100, 207, 220, 216); g.clip();
          this.rr(100 - opening * 112, 207, 110, 216, 10, C.green, '#214c3c');
          this.rr(210 + opening * 112, 207, 110, 216, 10, C.green, '#214c3c');
          this.rr(112 - opening * 112, 224, 85, 111, 9, C.blue);
          this.rr(223 + opening * 112, 224, 85, 111, 9, C.blue);
          this.line([[194 - opening * 112, 355], [194 - opening * 112, 381]], C.yellow, 4);
          this.line([[226 + opening * 112, 355], [226 + opening * 112, 381]], C.yellow, 4);
          g.restore();
        }
        this.text(r.cat.name, 210, 441, 29, C.ink, 'bold', 'center', true);
        this.text(r.cat.station + '  /  ' + r.cat.trait, 210, 478, 13, C.gray, 'normal', 'center');
        this.wrap(r.isNew ? r.cat.story : '它给你带来一枚纪念邮票。集齐 5 枚，就能指定邀请还没认识的猫咪。', 52, 526, 316, 14, C.gray, 25);
        this.button('draw-to-cat', r.isNew ? '带它回小屋  →' : '去看看这位老朋友  →', 45, 642, 330, 51, () => { this.screen = 'collection'; this.modal = { type: 'cat', id: r.cat.id }; });
      } else if (modal.type === 'result') {
        const r = modal.result;
        this.sheet('终点到啦，辛苦你了', 159, 552);
        this.text(r.mode === 'daily' ? '每日同车 · ' + r.day : '花园环线 · 旅程纪念票', 210, 232, 12, C.gray, 'normal', 'center');
        this.icon('heart', 210, 288, 42, C.pink);
        const count = this.motion() && modal.since !== undefined ? 1 - Math.pow(1 - this.progress(modal.since, 900), 3) : 1;
        this.text(Math.round(r.score * count), 210, 357, 65, C.green, 'bold', 'center'); this.text('收获的幸福值', 210, 410, 14, C.gray, 'normal', 'center');
        if (r.newBest) { this.rr(145, 440, 130, 29, 14, C.yellow); this.text('新的最佳成绩！', 210, 455, 12, C.ink, 'bold', 'center'); }
        this.line([[49, 493], [371, 493]], C.line);
        this.text(r.fish ? `小鱼干 +${r.fish}     猫咪车票 +${r.tickets}` : '今日奖励已领取，本次记录新成绩', 210, 526, 14, C.green, 'bold', 'center');
        this.button('result-home', '回小屋，喂喂猫  →', 45, 565, 330, 51, () => { this.modal = null; this.screen = 'collection'; });
        this.button('result-again', '还想再开一趟', 100, 636, 220, 40, () => { this.modal = null; this.start(r.mode); }, 'outline');
      } else if (modal.type === 'help') {
        this.sheet('猫咪司机上岗手册', 154, 548);
        const rules = [ ['01', '先选猫，再选座位', '也可以直接拖动。选中车上的猫，再点「回候车区」即可重新安排。'], ['02', '舒服就好，不用着急', '每只猫上车得 10 分，满足偏好多 8 分。邻座只算同侧左右与前后。'], ['03', '三站接送，一张车票', '全部上车即可出发。完成旅程获得小鱼干和车票，用来喂食和认识新猫。'], ['04', '好朋友，慢慢来', '20 好感解锁故事，60 可预约乘车，120 获得爱心座垫。每天不登录也不会掉好感。'] ];
        rules.forEach(([n, title, desc], i) => { const y = 234 + i * 97; this.text(n, 49, y, 17, C.orange, 'bold'); this.text(title, 85, y, 16, C.ink, 'bold'); this.wrap(desc, 85, y + 28, 264, 12, C.gray, 21); });
      } else if (modal.type === 'friends') {
        this.sheet('好友的今日旅程', 154, 556);
        if (this.platform.friendCanvas) {
          const canvas = this.platform.friendCanvas();
          if (canvas) this.ctx.drawImage(canvas, 40, 225, 340, 375);
          this.button('rank-prev', '上一页', 44, 630, 100, 40, () => { this.friendPage = Math.max(0, this.friendPage - 1); this.platform.friendRank(M.dayKey(), this.friendPage); }, 'outline');
          this.text(this.friendPage + 1, 210, 651, 14, C.gray, 'normal', 'center');
          this.button('rank-next', '下一页', 276, 630, 100, 40, () => { this.friendPage++; this.platform.friendRank(M.dayKey(), this.friendPage); }, 'outline');
        } else {
          this.icon('cup', 210, 289, 67, C.orange);
          this.text('和朋友，同坐一班车', 210, 379, 23, C.ink, 'bold', 'center', true);
          this.wrap('浏览器试玩会保存你的真实成绩。微信好友排行需要在已接入 AppID 的微信小游戏中查看，这里不会显示虚构好友。', 53, 438, 313, 14, C.gray, 27);
          this.button('rank-practice', '先去挑战今日路线', 45, 613, 330, 49, () => { this.modal = null; this.start('daily'); });
        }
      }
    }
    catModal(id) {
      const cat = D.byId[id], hearts = this.game.profile.collection[id], owned = hearts !== undefined;
      this.sheet(owned ? '常客档案' : '还没遇见的朋友', 105, 650);
      const feeding = this.motion() && this.feedFX && this.feedFX.id === id;
      const feedProgress = feeding ? this.progress(this.feedFX.since, 650) : 1;
      const delight = Math.sin(feedProgress * Math.PI);
      this.ellipse(210, 254, 102, 76, '#e7eedf'); this.cat(id, 210, 251 - delight * 9, 1.65 + delight * 0.045, hearts >= 20 || delight > 0, !owned);
      this.text(cat.name, 210, 352, 27, C.ink, 'bold', 'center', true);
      this.text(cat.hint, 210, 387, 12, C.gray, 'normal', 'center');
      if (!owned) {
        this.wrap(cat.story, 51, 435, 318, 14, C.gray, 25);
        this.text('纪念邮票 ' + this.game.profile.stamps + ' / 5', 210, 532, 17, C.green, 'bold', 'center');
        this.button('redeem-' + id, '用 5 枚邮票邀请它', 45, 588, 330, 51, () => { const r = this.game.redeem(id); if (this.mutate(r)) this.modal = { type: 'draw', result: r }; });
        this.button('go-draw', '去车站碰碰运气', 75, 669, 270, 40, () => this.go('station'), 'outline');
        return;
      }
      const shownHearts = feeding ? this.feedFX.from + (this.feedFX.to - this.feedFX.from) * (1 - Math.pow(1 - feedProgress, 3)) : hearts;
      this.rr(52, 414, 316, 9, 4, C.pale); if (shownHearts > 0) this.rr(52, 414, Math.max(9, 316 * shownHearts / 120), 9, 4, C.pink);
      this.text(M.stage(hearts).name, 53, 442, 13, C.green, 'bold'); this.text(hearts + ' / 120', 367, 442, 12, C.gray, 'normal', 'right');
      const next = D.stages.find(s => s.threshold > hearts);
      this.text(next ? `再 ${next.threshold - hearts} 点：${next.unlock}` : '爱心座垫已解锁 · 普通路线自动使用', 210, 470, 11, C.gray, 'normal', 'center');
      D.snacks.forEach((snack, i) => {
        const x = 43 + i * 113, favorite = this.game.profile.favorites[id] && cat.favorite === i;
        this.rr(x, 495, 108, 84, 15, favorite ? '#f2e8ce' : '#edf0e3', favorite ? '#d8ba75' : C.line);
        this.icon('fish', x + 53, 516, 23, snack.color);
        this.text(snack.name + (favorite ? ' ♥' : ''), x + 54, 540, 12, C.ink, 'bold', 'center');
        this.text(hearts >= 120 ? '已经吃饱啦' : snack.cost + ' 鱼干 / +' + (snack.hearts + (favorite ? 6 : 0)) + ' 好感', x + 54, 562, 9, C.gray, 'normal', 'center');
        this.hit('feed-' + i, '喂' + snack.name + '，花费' + snack.cost + '小鱼干', x, 495, 108, 84, () => {
          const r = this.game.feed(id, i);
          if (this.mutate(r)) { this.tell((r.favorite ? '找到最爱的零食啦！' : '好吃，蹭蹭你～') + ` 好感 +${r.gain}` + (r.levelUp ? ' · ' + r.stage.name : '')); this.feedFX = { id, from: hearts, to: hearts + r.gain, snack: i, since: this.now() }; this.emit(210, 257, 'heart', r.levelUp ? 16 : 9); if (this.game.profile.sound && this.platform.feed) this.platform.feed(); }
        });
      });
      this.wrap(hearts >= 20 ? cat.secret : cat.story, 48, 608, 324, 13, C.gray, 23);
      if (hearts >= 120) {
        this.text('查看专属常客纪念卡  →', 210, 653, 12, C.green, 'bold', 'center');
        this.hit('keepsake-' + id, '查看专属常客纪念卡', 70, 635, 280, 35, () => { this.modal = { type: 'keepsake', id }; });
      }
      this.button('invite-' + id, hearts >= 60 ? (this.game.profile.invite === id ? '已预约下次乘车 · 点此取消' : '预约下一趟普通路线') : '好感达到 60，可以预约乘车', 44, 679, 332, 45, () => { if (this.mutate(this.game.invite(id))) this.tell(this.game.profile.invite ? '下一趟普通路线，它会第一个上车' : '已取消预约'); }, hearts >= 60 ? 'green' : 'muted');
      if (this.motion() && this.feedFX && this.feedFX.id === id) {
        const t = this.progress(this.feedFX.since, 650);
        if (t < 1) { const fromX = 96 + this.feedFX.snack * 113; this.ctx.save(); this.ctx.globalAlpha = 1 - t; this.icon('fish', fromX + (210 - fromX) * t, 516 - 250 * t - Math.sin(t * Math.PI) * 36, 25 * (1 - t * 0.5), D.snacks[this.feedFX.snack].color); this.ctx.restore(); }
      }
    }
    render() {
      const g = this.ctx;
      if (!this.scale) return;
      this.frame++;
      g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = C.bg; g.fillRect(0, 0, this.canvas.width, this.canvas.height);
      g.setTransform(this.ratio * this.scale, 0, 0, this.ratio * this.scale, this.ox * this.ratio, this.oy * this.ratio);
      this.hits = []; this.header();
      this[this.screen](); this.nav();
      if (this.pointer && this.pointer.dragging && this.pointer.hit.catUid && this.game.run) {
        const p = this.game.run.passengers.find(p => p.uid === this.pointer.hit.catUid);
        if (p) { g.save(); g.globalAlpha = 0.85; this.cat(p.catId, this.pointer.current.x, this.pointer.current.y - 15, 0.9, true); g.restore(); }
      }
      if (this.modal) this.drawModal();
      if (this.travel && this.screen === 'trip' && !this.modal) this.drawTravel();
      this.drawEffects();
      if (this.toast && this.toast.until > Date.now()) {
        this.rr(22, 72, 376, 44, 16, C.green);
        this.text(this.toast.message, 210, 94, this.toast.message.length > 28 ? 10 : 12, C.paper, 'normal', 'center');
      }
      if (this.platform.onControls) this.platform.onControls(this.hits.map(({ id, label, x, y, w, h }) => ({ id, label, x, y, w, h })), { scale: this.scale, x: this.ox, y: this.oy });
    }
  }
  return { App, colors: C, width: W, height: H };
});
