'use strict';
const { App } = require('./src/app');
const canvas = wx.createCanvas();
const storageKey = 'cat-bus-club-v1';
let openData;
function getOpenData() {
  if (!openData) {
    openData = wx.getOpenDataContext();
    openData.canvas.width = 680; openData.canvas.height = 750;
  }
  return openData;
}
let audio;
const app = new App(canvas, {
  load() { const saved = wx.getStorageSync(storageKey); return saved ? (typeof saved === 'string' ? JSON.parse(saved) : saved) : null; },
  save(data) { wx.setStorageSync(storageKey, JSON.stringify(data)); },
  raf(callback) { requestAnimationFrame(callback); },
  ensureAudio() {
    if (audio) { this.resumeAudio(); return; }
    if (!wx.createWebAudioContext) { this.audioUnsupported = true; return; }
    try { audio = wx.createWebAudioContext(); this.resumeAudio(); } catch (_) { audio = null; this.audioUnsupported = true; }
  },
  resumeAudio() {
    if (!audio || audio.state !== 'suspended' || !audio.resume) return;
    try { const r = audio.resume(); if (r && r.catch) r.catch(() => {}); } catch (_) {}
  },
  tone(freq, dur, vol, type, attack, release) {
    if (!audio) return;
    try {
      const t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(vol, t + (attack || 0.01));
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + dur + 0.01);
    } catch (_) {}
  },
  click() {
    if (!audio) return;
    try {
      const t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(660, t); o.frequency.exponentialRampToValueAtTime(440, t + 0.06);
      g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(0.06, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + 0.1);
    } catch (_) {}
  },
  place() { this.tone(523, 0.1, 0.06, 'sine', 0.005, 0.06); setTimeout(() => this.tone(659, 0.12, 0.05, 'sine', 0.005, 0.08), 55); },
  happy() { this.tone(659, 0.08, 0.05, 'sine', 0.005, 0.05); setTimeout(() => this.tone(784, 0.08, 0.05, 'sine', 0.005, 0.05), 65); setTimeout(() => this.tone(988, 0.14, 0.04, 'sine', 0.005, 0.1), 130); },
  draw() { [523, 659, 784, 988, 1175].forEach((f, i) => { setTimeout(() => this.tone(f, 0.1, 0.03, 'sine', 0.005, 0.06), i * 35); }); },
  feed() { this.tone(440, 0.08, 0.05, 'triangle', 0.005, 0.05); setTimeout(() => this.tone(554, 0.12, 0.04, 'triangle', 0.005, 0.08), 70); },
  advance() {
    if (!audio) return;
    try {
      const t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(330, t); o.frequency.exponentialRampToValueAtTime(523, t + 0.2);
      g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(0.04, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + 0.35);
    } catch (_) {}
  },
  startBgm() {
    this.ensureAudio();
    if (!audio || this._bgm) return;
    if (this._fadeTimer) { clearTimeout(this._fadeTimer); this._fadeTimer = null; }
    this._bgm = true;
    this._musicGain = audio.createGain();
    this._musicGain.gain.setValueAtTime(0.001, audio.currentTime);
    this._musicGain.gain.linearRampToValueAtTime(0.06, audio.currentTime + 2);
    this._musicGain.connect(audio.destination);
    this._nextNote = audio.currentTime + 0.5;
    this._musicTimer = setInterval(() => this._scheduleMusic(), 180);
  },
  _scheduleMusic() {
    if (!this._bgm || !audio || !this._musicGain) return;
    const ahead = audio.currentTime + 2, scale = [262, 294, 330, 392, 440, 523, 587, 659, 784, 880];
    while (this._nextNote < ahead) {
      const time = this._nextNote, freq = scale[Math.floor(Math.random() * scale.length)];
      if (Math.random() > 0.3) {
        const o1 = audio.createOscillator(), o2 = audio.createOscillator(), g = audio.createGain();
        o1.type = 'sine'; o1.frequency.value = freq;
        o2.type = 'triangle'; o2.frequency.value = freq * 2.003;
        g.gain.setValueAtTime(0.001, time);
        g.gain.linearRampToValueAtTime(0.025 + Math.random() * 0.015, time + 0.012);
        g.gain.exponentialRampToValueAtTime(0.001, time + 1.4);
        o1.connect(g); o2.connect(g); g.connect(this._musicGain);
        o1.start(time); o1.stop(time + 1.5); o2.start(time); o2.stop(time + 1.5);
      }
      const step = Math.random() > 0.7 ? 0.35 : 0.5;
      this._nextNote = time + step;
      if (Math.random() > 0.82) {
        const bo = audio.createOscillator(), bg = audio.createGain();
        bo.type = 'sine'; bo.frequency.value = scale[Math.floor(Math.random() * 3)] / 2;
        bg.gain.setValueAtTime(0.001, time); bg.gain.linearRampToValueAtTime(0.015, time + 0.1);
        bg.gain.exponentialRampToValueAtTime(0.001, time + 2);
        bo.connect(bg); bg.connect(this._musicGain); bo.start(time); bo.stop(time + 2.1);
      }
    }
  },
  stopBgm() {
    this._bgm = false;
    if (this._musicTimer) { clearInterval(this._musicTimer); this._musicTimer = null; }
    const gain = this._musicGain;
    this._musicGain = null;
    if (gain && audio) {
      try {
        gain.gain.setValueAtTime(gain.gain.value, audio.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, audio.currentTime + 0.8);
      } catch (_) {}
      this._fadeTimer = setTimeout(() => { try { gain.disconnect(); } catch (_) {} this._fadeTimer = null; }, 1000);
    }
  },
  submitScore(day, score, notify) {
    try { getOpenData().postMessage({ type: 'submit', day, score }); }
    catch (_) { notify('成绩已保存在本机，微信同步暂不可用'); }
  },
  friendRank(day, page) {
    try {
      const local = app.game.profile.daily[day];
      if (local) getOpenData().postMessage({ type: 'submit', day, score: local.score });
      getOpenData().postMessage({ type: 'rank', day, page });
    } catch (_) { app.tell('微信好友排行暂不可用，请稍后再试'); }
  },
  friendCanvas() { try { return getOpenData().canvas; } catch (_) { return null; } }
});
function resize() {
  const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
  const menu = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
  const top = Math.max(info.safeArea ? info.safeArea.top : 0, menu ? menu.bottom + 6 : 0);
  const bottom = info.safeArea ? Math.max(0, info.windowHeight - info.safeArea.bottom) : 0;
  app.resize(info.windowWidth, info.windowHeight, info.pixelRatio || 1, top, bottom);
}
wx.onTouchStart(e => { app.platform.ensureAudio(); if (e.touches[0]) app.down(e.touches[0].clientX, e.touches[0].clientY); });
wx.onTouchMove(e => { if (e.touches[0]) app.move(e.touches[0].clientX, e.touches[0].clientY); });
wx.onTouchEnd(e => { if (e.changedTouches[0]) app.up(e.changedTouches[0].clientX, e.changedTouches[0].clientY); });
wx.onTouchCancel(() => { app.pointer = null; });
wx.onHide(() => { app.stopLoop(); app.platform.stopBgm(); });
wx.onShow(() => { resize(); app.startLoop(); if (app.game.profile.sound) { app.platform.ensureAudio(); app.platform.startBgm(); } });
if (wx.onWindowResize) wx.onWindowResize(resize);
wx.showShareMenu({ menus: ['shareAppMessage'] });
wx.onShareAppMessage(() => ({ title: '我的猫咪巴士发车啦，一起来接猫咪回家！' }));
resize(); app.startLoop();
