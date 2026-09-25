(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CatBusData = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const cats = [
    { id: 'cream', name: '奶盖', color: '#f3dfb4', patch: '#fff8e9', ink: '#655348', type: 'window', trait: '喜欢窗边', hint: '坐在最左或最右的窗边座位', favorite: 0, quiet: true, station: '花园站', story: '每天最早的一束阳光，总会被奶盖悄悄装进口袋。', secret: '它把靠窗的位置，叫作自己的小太阳。' },
    { id: 'orange', name: '橘团团', color: '#e9a45e', patch: '#ffe3af', ink: '#75482d', type: 'pair', trait: '占两座 · 爱作伴', hint: '占同侧两个座位，前后有邻居更开心', favorite: 1, quiet: true, station: '面包站', story: '圆滚滚不是因为吃得多，是因为装了太多开心的事。', secret: '每次带两份便当，另一份是留给你的。' },
    { id: 'coal', name: '小煤球', color: '#526368', patch: '#839394', ink: '#263d3b', type: 'quiet', trait: '喜欢安静', hint: '旁边有安静的猫，且没有布丁或桃桃', favorite: 2, quiet: true, station: '月亮站', story: '总是小心翼翼地上车，却会认真记得每一句早安。', secret: '虽然胆小，但它一直想去看看海。' },
    { id: 'pudding', name: '布丁', color: '#e3c490', patch: '#fff2d9', ink: '#705a41', type: 'social', trait: '喜欢热闹', hint: '同侧前后或左右，至少有两位邻居', favorite: 0, quiet: false, station: '集市站', story: '上车三分钟，就已经和整车的猫成为了好朋友。', secret: '它的通讯录里，你被备注成「最好的司机」。' },
    { id: 'cloud', name: '云朵', color: '#f9faf4', patch: '#e3e9e5', ink: '#62756d', type: 'sleep', trait: '想睡个好觉', hint: '邻座没有布丁和桃桃，就能安心打盹', favorite: 2, quiet: true, station: '午睡站', story: '它的梦想，是把所有柔软的座位都睡一遍。', secret: '其实每次报站它都听见了，只是不想下车。' },
    { id: 'peach', name: '桃桃', color: '#e6b0a6', patch: '#fbe5d7', ink: '#885b59', type: 'front', trait: '想坐前排', hint: '坐在第一排，看着巴士往前开', favorite: 1, quiet: false, station: '桃花站', story: '好奇下一站，也好奇你今天有没有吃早餐。', secret: '它已经偷偷学会了整条路线的报站词。' },
    { id: 'mint', name: '薄荷', color: '#a7beb1', patch: '#d8e8d8', ink: '#466757', type: 'back', trait: '喜欢后排', hint: '坐在最后一排，安静看看沿途风景', favorite: 0, quiet: true, station: '森林站', story: '带着一片落叶上车，说这是森林寄给你的信。', secret: '它给你种的那盆薄荷，已经悄悄发芽了。' },
    { id: 'sesame', name: '芝麻', color: '#a5a7b6', patch: '#e5e2e9', ink: '#5b5c72', type: 'aisle', trait: '喜欢过道', hint: '坐在中间两列，方便伸伸小短腿', favorite: 1, quiet: true, station: '雨巷站', story: '下雨天会多带一把小伞，尽管自己也很怕淋湿。', secret: '它只把肚皮翻给最信任的人看。' }
  ];
  const snacks = [
    { name: '小鱼饼', cost: 12, hearts: 8, color: '#e7b976' },
    { name: '鸡肉粒', cost: 18, hearts: 12, color: '#dba18b' },
    { name: '鲜鲜猫条', cost: 24, hearts: 16, color: '#95bcb0' }
  ];
  const stages = [
    { threshold: 0, name: '初次见面', unlock: '记住它的乘车偏好' },
    { threshold: 20, name: '慢慢熟悉', unlock: '解锁一段猫咪小秘密' },
    { threshold: 60, name: '老朋友', unlock: '可以预约普通路线乘车' },
    { threshold: 120, name: '专属常客', unlock: '解锁爱心座垫与纪念卡' }
  ];
  return { cats, snacks, stages, stops: ['花园站', '面包站', '海风站'], byId: Object.fromEntries(cats.map(c => [c.id, c])) };
});
