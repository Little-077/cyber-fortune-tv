// ===== 共享数据：主题 / 求签签库 / 默认频道 =====
// 同时被电视窗口(renderer.js)与设置窗口(settings.js)以 <script> 方式引入，
// 通过 window.APP_DATA 暴露。

(function () {
  // 几套预设主题：换肤旋钮 / 设置面板里切换
  // knobA/knobB=上/下旋钮色，leg=腿色，ink=品牌字与喇叭色（默认随机身边框色）
  const THEMES = [
    {
      name: '原机色', phosphor: '#7CFCD8',
      s1: '#15463f', s2: '#0c2c2a', s3: '#061a19',
      body: '#d9bd84', bodyD: '#b0904f', bodyL: '#f2e0b0', border: '#6b4f2a',
      bezel: '#2a2030', bezelD: '#150f1c', bezelL: '#43374f', power: '#4FA9FF',
      knobA: '#6b4f2a', knobB: '#6b4f2a', leg: '#6b4f2a', ink: '#6b4f2a',
    },
    {
      // 阳光黄：亮黄机身 + 深紫腿 + 白/橙旋钮
      name: '阳光黄', phosphor: '#FFC978',
      s1: '#3e2c12', s2: '#281a05', s3: '#160d01',
      body: '#F4D43C', bodyD: '#cdae28', bodyL: '#fded9a', border: '#a8841c',
      bezel: '#2c2218', bezelD: '#161009', bezelL: '#48392a', power: '#FF9F4D',
      knobA: '#F2F2F2', knobB: '#FF9F40', leg: '#4a2d6b', ink: '#7a5e16',
    },
    {
      name: '赛博紫', phosphor: '#E98BFF',
      s1: '#2c1545', s2: '#1a0c2c', s3: '#0d0619',
      body: '#b9a0d4', bodyD: '#8f74b0', bodyL: '#ddccec', border: '#4a3168',
      bezel: '#241830', bezelD: '#120a1c', bezelL: '#3a2850', power: '#B07BFF',
      knobA: '#4a3168', knobB: '#4a3168', leg: '#4a3168', ink: '#4a3168',
    },
    {
      // 天真蓝：白机身 + 天蓝/浅蓝旋钮 + 蓝屏
      name: '天真蓝', phosphor: '#99CCFF',
      s1: '#2a4a6e', s2: '#1c3550', s3: '#0f2236',
      body: '#ffffff', bodyD: '#d4deea', bodyL: '#ffffff', border: '#6699CC',
      bezel: '#1d2a3a', bezelD: '#0e1622', bezelL: '#33485f', power: '#6699CC',
      knobA: '#6699CC', knobB: '#99CCFF', leg: '#6699CC', ink: '#4a6f9c',
    },
    {
      // 奶油蓝：奶油机身 + 深蓝/橙旋钮 + 蓝屏（橙色复位灯）
      name: '奶油蓝', phosphor: '#5a8af5',
      s1: '#1f3f78', s2: '#142a50', s3: '#0a1730',
      body: '#f3ecd6', bodyD: '#d6cdaf', bodyL: '#fffaf0', border: '#c2a96f',
      bezel: '#20242e', bezelD: '#11131a', bezelL: '#353a48', power: '#ff751f',
      knobA: '#2556b0', knobB: '#ff751f', leg: '#2556b0', ink: '#2556b0',
    },
    {
      // 薄荷蓝：薄荷机身 + 天蓝/青旋钮 + 海蓝屏
      name: '薄荷蓝', phosphor: '#39E6F4',
      s1: '#1c3a7a', s2: '#12275a', s3: '#0a1838',
      body: '#E0FFDC', bodyD: '#bfe0bf', bodyL: '#f3fff0', border: '#3C67DC',
      bezel: '#14233e', bezelD: '#0a1322', bezelL: '#28406a', power: '#3C67DC',
      knobA: '#28BCFF', knobB: '#39E6F4', leg: '#3C67DC', ink: '#2a5cc0',
    },
    {
      // 彩虹：白机身 + 各部位不同色
      name: '彩虹', phosphor: '#F2F2F2',
      s1: '#3a3a3a', s2: '#262626', s3: '#141414',           // 深灰屏幕
      body: '#f7f7f7', bodyD: '#d2d2d2', bodyL: '#ffffff', border: '#cfcfcf',  // 白机身
      bezel: '#2b2b2b', bezelD: '#161616', bezelL: '#454545', // 深灰屏框
      power: '#FF5A5F',          // 复原按钮灯：红
      knobA: '#3FA9FF',          // 上旋钮：蓝
      knobB: '#FF9F40',          // 下旋钮：橙
      leg: '#5BC46A',            // 腿：绿
      ink: '#666666',            // 白机身上的品牌字/喇叭：深灰
    },
  ];

  // 求签签库（求签频道专用）：等级 + 权重 + 颜色 + 随机签文
  const FORTUNES = [
    { level: '大吉', weight: 8, color: '#FFD93D',
      phrases: ['万事顺意，冲就完事了！', '今天宇宙都站你这边 ✨', '想做的事，放手去做吧！', '好运爆棚，去买张彩票？'] },
    { level: '吉', weight: 15, color: '#9BE86C',
      phrases: ['稳中向好，继续保持～', '小确幸正在路上 🍀', '好运在慢慢靠近你。', '今天值得对自己好一点。'] },
    { level: '小吉', weight: 22, color: '#7CFCD8',
      phrases: ['平淡里藏着小惊喜。', '今天适合做点小决定。', '运气在线，别犹豫太久。', '一点点甜，刚刚好。'] },
    { level: '末吉', weight: 22, color: '#7CC8FC',
      phrases: ['先苦后甜，耐心一点。', '起步慢，但会好起来的。', '稳住，黎明在后头。', '慢慢来，比较快。'] },
    { level: '平', weight: 25, color: '#C9C9D4',
      phrases: ['平平淡淡才是真。', '今天就，随缘吧～', '不悲不喜，岁月静好。', '保持平常心最重要。'] },
    { level: '凶', weight: 2, color: '#FF8C6B',
      phrases: ['今天宜低调，明天会更好。', '深呼吸，避避风头吧。', '别强求，缓一缓 🍵', '少说多看，稳一手。'] },
    { level: '小凶', weight: 6, color: '#FF6B8B',
      phrases: ['小心脚下，稳一点。', '今天先别做重大决定哦。', '喝杯热水，避避小霉运。', '万事不顺时，早点睡 😴'] },
  ];

  // 首次运行的默认配置（频道 + 当前频道/主题）
  function defaultConfig() {
    return {
      current: 0,
      theme: 0,
      channels: [
        { id: 'fortune', name: '求签', type: 'fortune' },
        {
          id: 'lunch', name: '中午吃什么', type: 'list', note: '就它了！',
          options: ['火锅', '麻辣烫', '黄焖鸡米饭', '沙县小吃', '兰州拉面',
                    '螺蛳粉', '盖浇饭', '日料', '汉堡', '轻食沙拉', '炒饭', '随便！'],
        },
      ],
    };
  }

  window.APP_DATA = { THEMES, FORTUNES, defaultConfig };
})();
