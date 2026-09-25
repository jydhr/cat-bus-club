'use strict';
// All friend data stays inside the WeChat open-data context.
const canvas = wx.getSharedCanvas(), ctx = canvas.getContext('2d');
const KEY = 'catbus_daily_v1';
let view = { day: '', page: 0 }, viewToken = 0, syncError = '', queue = [], uploading = false;
function text(value, x, y, size = 24, color = '#294e43', align = 'left') {
  ctx.font = size + 'px sans-serif'; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(String(value), x, y);
}
function clear() { ctx.fillStyle = '#fffcf4'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
function message(title, subtitle) { clear(); text(title, 340, 285, 29, '#294e43', 'center'); text(subtitle, 340, 340, 21, '#7a9184', 'center'); }
function parse(list) {
  try {
    const pair = (list || []).find(x => x.key === KEY); if (!pair) return null;
    const r = JSON.parse(pair.value);
    return /^\d{4}-\d{2}-\d{2}$/.test(r.day) && Number.isInteger(r.score) && r.score >= 0 && r.score <= 1000 ? r : null;
  } catch (_) { return null; }
}
function showRank() {
  const token = ++viewToken, day = view.day, page = view.page;
  message('正在查收好友的旅程…', '今天也要满载快乐');
  wx.getFriendCloudStorage({
    keyList: [KEY],
    success(res) {
      if (token !== viewToken) return;
      const friends = (res.data || []).map(u => ({ nickname: u.nickname || '猫咪司机', record: parse(u.KVDataList) })).filter(u => u.record && u.record.day === day).sort((a, b) => b.record.score - a.record.score);
      clear();
      text(day + ' · 好友真实成绩', 340, 35, 23, '#7a9184', 'center');
      if (!friends.length) { text('好友还没有提交今日成绩', 340, 280, 28, '#294e43', 'center'); text('先完成今日挑战，邀请朋友一起玩', 340, 332, 22, '#7a9184', 'center'); }
      else {
        const start = page * 5, slice = friends.slice(start, start + 5);
        if (!slice.length) text('已经到最后一页，返回上一页吧', 340, 300, 25, '#7a9184', 'center');
        slice.forEach((u, i) => {
          const y = 126 + i * 108;
          ctx.fillStyle = i % 2 ? '#fffcf4' : '#edf2e6'; ctx.fillRect(5, y - 39, 670, 91);
          text(start + i + 1, 32, y, 27, '#b48946');
          text(u.nickname.slice(0, 10), 108, y, 26);
          text(u.record.score, 637, y, 30, '#2f6655', 'right');
        });
      }
      if (syncError) text(syncError, 340, 704, 20, '#b47e50', 'center');
      else text('同一乘客顺序 · 不计算养成加成', 340, 704, 21, '#7a9184', 'center');
    },
    fail() { if (token === viewToken) message('暂时无法读取微信好友排行', '请检查网络与小游戏权限，再重新打开'); }
  });
}
function flush() {
  if (uploading || !queue.length) return;
  uploading = true;
  const item = queue.shift();
  function done(error) { uploading = false; syncError = error ? '同步失败，本机成绩仍保留；重新进入可重试' : ''; if (view.day) showRank(); flush(); }
  wx.getUserCloudStorage({ keyList: [KEY], success(res) {
    const previous = parse(res.KVDataList);
    if (previous && (previous.day > item.day || previous.day === item.day && previous.score >= item.score)) { done(false); return; }
    wx.setUserCloudStorage({ KVDataList: [{ key: KEY, value: JSON.stringify(item) }], success() { done(false); }, fail() { done(true); } });
  }, fail() { done(true); } });
}
wx.onMessage(data => {
  if (data.type === 'rank') { view = { day: data.day, page: Math.max(0, Math.floor(data.page || 0)) }; showRank(); }
  if (data.type === 'submit' && /^\d{4}-\d{2}-\d{2}$/.test(data.day) && Number.isInteger(data.score) && data.score >= 0 && data.score <= 1000) { queue.push({ day: data.day, score: data.score }); flush(); }
});
