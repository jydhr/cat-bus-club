(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./data'));
  else root.CatBusModel = factory(root.CatBusData);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (D) {
  'use strict';
  const MAX_HEARTS = 120;
  function dayKey(time = Date.now()) { return new Date(time + 8 * 3600000).toISOString().slice(0, 10); }
  function hash(text) { let h = 2166136261; for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619); return h >>> 0; }
  function random(seed) { let s = seed >>> 0; return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const integer = (n, fallback, max = 10000000) => Number.isInteger(n) && n >= 0 && n <= max ? n : fallback;
  function freshProfile() { return { version: 1, fish: 100, tickets: 3, stamps: 0, pity: 0, collection: { cream: 0, orange: 0, coal: 0 }, favorites: {}, invite: null, trips: 0, best: 0, daily: {}, history: [], sound: true }; }
  function normalizeProfile(raw) {
    const p = freshProfile();
    if (!raw || raw.version !== 1) return p;
    for (const key of ['fish', 'tickets', 'stamps', 'pity', 'trips', 'best']) p[key] = integer(raw[key], p[key]);
    for (const cat of D.cats) if (raw.collection && Object.prototype.hasOwnProperty.call(raw.collection, cat.id)) p.collection[cat.id] = integer(raw.collection[cat.id], 0, MAX_HEARTS);
    p.favorites = Object.fromEntries(D.cats.filter(c => raw.favorites && raw.favorites[c.id] === true).map(c => [c.id, true]));
    p.invite = p.collection[raw.invite] >= 60 ? raw.invite : null;
    p.sound = raw.sound === true;
    if (raw.daily && typeof raw.daily === 'object') for (const key of Object.keys(raw.daily).sort().slice(-31)) {
      const r = raw.daily[key];
      if (/^\d{4}-\d{2}-\d{2}$/.test(key) && r && Number.isInteger(r.score) && r.score >= 0 && r.score <= 1000) p.daily[key] = { score: r.score, rewarded: r.rewarded === true };
    }
    if (Array.isArray(raw.history)) p.history = raw.history.filter(r => r && Number.isInteger(r.score) && r.score >= 0 && r.score <= 1000 && typeof r.day === 'string' && ['daily', 'normal'].includes(r.mode)).slice(-20);
    return p;
  }
  function stage(hearts) { return D.stages.filter(s => hearts >= s.threshold).slice(-1)[0]; }
  function slotsFor(catId, seat) {
    if (!D.byId[catId] || !Number.isInteger(seat) || seat < 0 || seat > 11) return [];
    if (catId === 'orange') { const base = seat - seat % 2; return [base, base + 1]; }
    return [seat];
  }
  function adjacent(a, b) {
    const ar = Math.floor(a / 4), ac = a % 4, br = Math.floor(b / 4), bc = b % 4;
    return (ac === bc && Math.abs(ar - br) === 1) || (ar === br && Math.floor(ac / 2) === Math.floor(bc / 2) && Math.abs(ac - bc) === 1);
  }
  function scoreRun(run) {
    return run.passengers.map(p => {
      const cat = D.byId[p.catId], slots = p.seat === null ? [] : slotsFor(p.catId, p.seat);
      if (!slots.length) return { uid: p.uid, points: 0, happy: false };
      const neighbors = run.passengers.filter(other => other.uid !== p.uid && other.seat !== null && slots.some(s => slotsFor(other.catId, other.seat).some(o => adjacent(s, o))));
      let happy = false;
      switch (cat.type) {
        case 'window': happy = slots.some(s => s % 4 === 0 || s % 4 === 3); break;
        case 'pair': happy = neighbors.length > 0; break;
        case 'quiet': happy = neighbors.length > 0 && neighbors.every(n => D.byId[n.catId].quiet); break;
        case 'social': happy = neighbors.length >= 2; break;
        case 'sleep': happy = neighbors.every(n => D.byId[n.catId].quiet); break;
        case 'front': happy = slots.some(s => s < 4); break;
        case 'back': happy = slots.some(s => s >= 8); break;
        case 'aisle': happy = slots.some(s => s % 4 === 1 || s % 4 === 2); break;
      }
      return { uid: p.uid, points: 10 + (happy ? 8 : 0), happy };
    });
  }
  function addWave(run) {
    const rng = random(hash(run.seed + ':' + run.stop));
    const available = D.cats.map(c => c.id).filter(id => !run.passengers.some(p => p.catId === id));
    for (let i = available.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [available[i], available[j]] = [available[j], available[i]]; }
    if (run.stop === 0 && run.invite) { available.splice(available.indexOf(run.invite), 1); available.unshift(run.invite); }
    available.slice(0, run.stop === 0 ? 4 : 3).forEach((catId, i) => {
      run.passengers.push({ uid: run.stop + '-' + i, catId, seat: null, leave: Math.min(3, run.stop + (i % 2 === 0 ? 1 : 2)) });
    });
  }
  function validRun(r) {
    if (!r || !['normal', 'daily'].includes(r.mode) || typeof r.seed !== 'string' || typeof r.day !== 'string' || !Number.isInteger(r.stop) || r.stop < 0 || r.stop > 2 || !Number.isInteger(r.total) || r.total < 0 || r.total > 1000 || !Array.isArray(r.passengers) || r.passengers.length < 1 || r.passengers.length > 8) return false;
    const occupied = new Set(), uids = new Set(), cats = new Set();
    for (const p of r.passengers) {
      if (!D.byId[p.catId] || typeof p.uid !== 'string' || uids.has(p.uid) || cats.has(p.catId) || !Number.isInteger(p.leave) || p.leave <= r.stop || p.leave > 3) return false;
      uids.add(p.uid); cats.add(p.catId);
      if (p.seat !== null) { const slots = slotsFor(p.catId, p.seat); if (!slots.length || slots.some(s => occupied.has(s))) return false; slots.forEach(s => occupied.add(s)); }
    }
    return true;
  }
  class Game {
    constructor(saved, options = {}) {
      this.profile = normalizeProfile(saved && saved.profile);
      this.run = saved && validRun(saved.run) ? JSON.parse(JSON.stringify(saved.run)) : null;
      this.rng = options.rng || Math.random;
      this.now = options.now || Date.now;
    }
    snapshot() { return { profile: this.profile, run: this.run }; }
    start(mode = 'normal') {
      if (this.run) return { ok: false, reason: '先完成正在进行的这一趟吧' };
      if (!['normal', 'daily'].includes(mode)) return { ok: false, reason: '路线不存在' };
      const day = dayKey(this.now());
      this.run = { mode, day, seed: mode === 'daily' ? 'catbus-v1-' + day : String(this.now()) + '-' + this.rng(), stop: 0, total: 0, invite: mode === 'normal' ? this.profile.invite : null, passengers: [] };
      addWave(this.run);
      return { ok: true };
    }
    place(uid, seat) {
      if (!this.run) return { ok: false, reason: '请先开始一趟路线' };
      const p = this.run.passengers.find(p => p.uid === uid);
      if (!p) return { ok: false, reason: '猫咪已经下车啦' };
      if (seat === null) { p.seat = null; return { ok: true }; }
      const slots = slotsFor(p.catId, seat);
      if (!slots.length) return { ok: false, reason: '请放在车内座位上' };
      const collision = this.run.passengers.some(o => o.uid !== uid && o.seat !== null && slotsFor(o.catId, o.seat).some(s => slots.includes(s)));
      if (collision) return { ok: false, reason: p.catId === 'orange' ? '橘团团需要同侧两个空座位哦' : '这里有猫咪啦，先把它移开吧' };
      p.seat = slots[0];
      return { ok: true };
    }
    advance() {
      if (!this.run) return { ok: false, reason: '这一趟已经结束啦' };
      if (this.run.passengers.some(p => p.seat === null)) return { ok: false, reason: '还有猫咪在等车，先给它安排座位吧' };
      const run = this.run, stationScore = scoreRun(run).reduce((s, p) => s + p.points, 0);
      run.total += stationScore;
      if (run.stop < 2) {
        run.stop++;
        const left = run.passengers.filter(p => p.leave <= run.stop).map(p => D.byId[p.catId].name);
        run.passengers = run.passengers.filter(p => p.leave > run.stop);
        addWave(run);
        return { ok: true, finished: false, stationScore, left };
      }
      const p = this.profile, previous = p.daily[run.day];
      const rewarded = run.mode === 'normal' || !previous || !previous.rewarded;
      const fish = rewarded ? 30 + Math.floor(run.total / 10) : 0, tickets = rewarded ? 1 : 0;
      const result = { ok: true, finished: true, score: run.total, day: run.day, mode: run.mode, fish, tickets, newBest: run.mode === 'daily' ? !previous || run.total > previous.score : run.total > p.best };
      p.fish += fish; p.tickets += tickets; p.trips++;
      if (run.mode === 'daily') p.daily[run.day] = { score: Math.max(previous ? previous.score : 0, run.total), rewarded: true };
      else p.best = Math.max(p.best, run.total);
      p.history.push({ score: run.total, day: run.day, mode: run.mode });
      p.history = p.history.slice(-20);
      Object.keys(p.daily).sort().slice(0, -31).forEach(k => delete p.daily[k]);
      this.run = null;
      return result;
    }
    draw() {
      const p = this.profile;
      if (p.tickets < 1) return { ok: false, reason: '车票不够啦，完成一趟路线就能获得' };
      const missing = D.cats.filter(c => p.collection[c.id] === undefined);
      const pool = p.pity >= 5 && missing.length ? missing : D.cats;
      const cat = pool[Math.min(pool.length - 1, Math.floor(this.rng() * pool.length))];
      const isNew = p.collection[cat.id] === undefined;
      p.tickets--;
      if (isNew) { p.collection[cat.id] = 0; p.pity = 0; } else { p.stamps++; p.pity++; }
      return { ok: true, cat, isNew };
    }
    redeem(id) {
      const p = this.profile;
      if (!D.byId[id] || p.collection[id] !== undefined) return { ok: false, reason: '选择一只还没认识的猫咪吧' };
      if (p.stamps < 5) return { ok: false, reason: '需要 5 枚纪念邮票' };
      p.stamps -= 5; p.collection[id] = 0; p.pity = 0;
      return { ok: true, cat: D.byId[id], isNew: true };
    }
    feed(id, snackIndex) {
      const p = this.profile, snack = D.snacks[snackIndex], cat = D.byId[id];
      if (!cat || p.collection[id] === undefined || !snack) return { ok: false, reason: '先邀请这只猫咪成为常客吧' };
      if (p.collection[id] >= MAX_HEARTS) return { ok: false, reason: '已经是最亲密的专属常客啦' };
      if (p.fish < snack.cost) return { ok: false, reason: '小鱼干不够啦，去开一趟巴士吧' };
      const favorite = cat.favorite === snackIndex;
      const gain = Math.min(MAX_HEARTS - p.collection[id], snack.hearts + (favorite ? 6 : 0));
      const before = stage(p.collection[id]);
      p.fish -= snack.cost; p.collection[id] += gain;
      if (favorite) p.favorites[id] = true;
      return { ok: true, gain, favorite, stage: stage(p.collection[id]), levelUp: before !== stage(p.collection[id]) };
    }
    invite(id) {
      if (!D.byId[id] || !(this.profile.collection[id] >= 60)) return { ok: false, reason: '成为「老朋友」后就能预约啦' };
      this.profile.invite = this.profile.invite === id ? null : id;
      return { ok: true };
    }
  }
  return { Game, freshProfile, normalizeProfile, dayKey, stage, slotsFor, adjacent, scoreRun, validRun, random, hash };
});
