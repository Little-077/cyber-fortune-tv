// ===== 共享数据：主题 / 求签签库 / 默认频道 / 多语言 =====
// 被 renderer.js 与 settings.js 以 <script> 引入，通过 window.APP_DATA 暴露。

(function () {
  // 预设主题（颜色固定；name=中文 nameEn=英文）
  const THEMES = [
    {
      name: '原机色', nameEn: 'Classic Green', phosphor: '#7CFCD8',
      s1: '#15463f', s2: '#0c2c2a', s3: '#061a19',
      body: '#d9bd84', bodyD: '#b0904f', bodyL: '#f2e0b0', border: '#6b4f2a',
      bezel: '#2a2030', bezelD: '#150f1c', bezelL: '#43374f', power: '#4FA9FF',
      knobA: '#6b4f2a', knobB: '#6b4f2a', leg: '#6b4f2a', ink: '#6b4f2a',
    },
    {
      name: '阳光黄', nameEn: 'Sunny Yellow', phosphor: '#FFC978',
      s1: '#3e2c12', s2: '#281a05', s3: '#160d01',
      body: '#F4D43C', bodyD: '#cdae28', bodyL: '#fded9a', border: '#a8841c',
      bezel: '#2c2218', bezelD: '#161009', bezelL: '#48392a', power: '#FF9F4D',
      knobA: '#F2F2F2', knobB: '#FF9F40', leg: '#4a2d6b', ink: '#7a5e16',
    },
    {
      name: '赛博紫', nameEn: 'Cyber Purple', phosphor: '#E98BFF',
      s1: '#2c1545', s2: '#1a0c2c', s3: '#0d0619',
      body: '#b9a0d4', bodyD: '#8f74b0', bodyL: '#ddccec', border: '#4a3168',
      bezel: '#241830', bezelD: '#120a1c', bezelL: '#3a2850', power: '#B07BFF',
      knobA: '#4a3168', knobB: '#4a3168', leg: '#4a3168', ink: '#4a3168',
    },
    {
      name: '天真蓝', nameEn: 'Sky Blue', phosphor: '#99CCFF',
      s1: '#2a4a6e', s2: '#1c3550', s3: '#0f2236',
      body: '#ffffff', bodyD: '#d4deea', bodyL: '#ffffff', border: '#6699CC',
      bezel: '#1d2a3a', bezelD: '#0e1622', bezelL: '#33485f', power: '#6699CC',
      knobA: '#6699CC', knobB: '#99CCFF', leg: '#6699CC', ink: '#4a6f9c',
    },
    {
      name: '奶油蓝', nameEn: 'Cream Blue', phosphor: '#5a8af5',
      s1: '#1f3f78', s2: '#142a50', s3: '#0a1730',
      body: '#f3ecd6', bodyD: '#d6cdaf', bodyL: '#fffaf0', border: '#c2a96f',
      bezel: '#20242e', bezelD: '#11131a', bezelL: '#353a48', power: '#ff751f',
      knobA: '#2556b0', knobB: '#ff751f', leg: '#2556b0', ink: '#2556b0',
    },
    {
      name: '薄荷蓝', nameEn: 'Mint Blue', phosphor: '#39E6F4',
      s1: '#1c3a7a', s2: '#12275a', s3: '#0a1838',
      body: '#E0FFDC', bodyD: '#bfe0bf', bodyL: '#f3fff0', border: '#3C67DC',
      bezel: '#14233e', bezelD: '#0a1322', bezelL: '#28406a', power: '#3C67DC',
      knobA: '#28BCFF', knobB: '#39E6F4', leg: '#3C67DC', ink: '#2a5cc0',
    },
    {
      name: '彩虹', nameEn: 'Rainbow', phosphor: '#F2F2F2',
      s1: '#3a3a3a', s2: '#262626', s3: '#141414',
      body: '#f7f7f7', bodyD: '#d2d2d2', bodyL: '#ffffff', border: '#cfcfcf',
      bezel: '#2b2b2b', bezelD: '#161616', bezelL: '#454545', power: '#FF5A5F',
      knobA: '#3FA9FF', knobB: '#FF9F40', leg: '#5BC46A', ink: '#666666',
    },
  ];

  // 求签签库：等级权重颜色固定；中英文文案各一份
  const FORTUNES = [
    {
      weight: 8, color: '#FFD93D', level: '大吉', levelEn: 'Great Luck',
      phrases: ['万事顺意，冲就完事了！', '今天宇宙都站你这边 ✨', '想做的事，放手去做吧！', '好运爆棚，去买张彩票？'],
      phrasesEn: ['Smooth sailing—just go!', 'The universe has your back ✨', 'Do it, no hesitation!', 'Luck overflowing—buy a ticket?'],
    },
    {
      weight: 15, color: '#9BE86C', level: '吉', levelEn: 'Good Luck',
      phrases: ['稳中向好，继续保持～', '小确幸正在路上 🍀', '好运在慢慢靠近你。', '今天值得对自己好一点。'],
      phrasesEn: ['Steady and rising, keep it up~', 'A little joy is on its way 🍀', 'Good luck is drawing near.', 'Treat yourself a bit today.'],
    },
    {
      weight: 22, color: '#7CFCD8', level: '小吉', levelEn: 'Small Luck',
      phrases: ['平淡里藏着小惊喜。', '今天适合做点小决定。', '运气在线，别犹豫太久。', '一点点甜，刚刚好。'],
      phrasesEn: ['Small surprises hide in calm.', 'Good day for small calls.', 'Luck is online—don’t stall.', 'A touch of sweet, just right.'],
    },
    {
      weight: 22, color: '#7CC8FC', level: '末吉', levelEn: 'Future Luck',
      phrases: ['先苦后甜，耐心一点。', '起步慢，但会好起来的。', '稳住，黎明在后头。', '慢慢来，比较快。'],
      phrasesEn: ['Bitter first, sweet later—patience.', 'Slow start, it gets better.', 'Hold on, dawn is coming.', 'Slow is fast.'],
    },
    {
      weight: 25, color: '#C9C9D4', level: '平', levelEn: 'Even',
      phrases: ['平平淡淡才是真。', '今天就，随缘吧～', '不悲不喜，岁月静好。', '保持平常心最重要。'],
      phrasesEn: ['Plain and steady is real.', 'Just go with the flow~', 'No highs, no lows—calm.', 'Keep a steady heart.'],
    },
    {
      weight: 2, color: '#FF8C6B', level: '凶', levelEn: 'Bad Luck',
      phrases: ['今天宜低调，明天会更好。', '深呼吸，避避风头吧。', '别强求，缓一缓 🍵', '少说多看，稳一手。'],
      phrasesEn: ['Lay low today—tomorrow’s better.', 'Breathe, dodge the storm.', 'Don’t force it, take a break 🍵', 'Watch, wait, play it safe.'],
    },
    {
      weight: 6, color: '#FF6B8B', level: '小凶', levelEn: 'Minor Curse',
      phrases: ['小心脚下，稳一点。', '今天先别做重大决定哦。', '喝杯热水，避避小霉运。', '万事不顺时，早点睡 😴'],
      phrasesEn: ['Watch your step, steady now.', 'No big decisions today.', 'Sip warm water, dodge bad luck.', 'When stuck, sleep early 😴'],
    },
  ];

  // 界面多语言文案
  const I18N = {
    zh: {
      hintFortune: '点我求签', hintList: '点我决定吧', again: '再抽一次 ↻',
      pomoStartHint: '点我开始专注', pomoRunHint: '进行中 · 点暂停', pomoPauseHint: '已暂停 · 点继续',
      pPomo: '🍅 番茄钟', pFocus: '🍅 专注', pBreak: '☕ 休息',
      focusDone: '专注完成 🎉', breakDone: '休息结束 🎉',
      cWorking: 'Claude 思考中…', cWaiting: 'Claude 等你确认…', cDone: '✓ 完成！',
      sleepy: '有点困…', zzz: 'Zzz…',
      chFortune: '求签', chPomodoro: '番茄钟',
      // 设置
      setTitle: '📺 赛博抽抽机 · 设置',
      tabChannels: '频道', tabFocus: '专注', tabAppearance: '外观', tabGeneral: '通用',
      addChannel: '＋ 新建频道', name: '名称', tagFortune: '内置求签', tagList: '列表', del: '删除',
      fortuneLocked: '七级求签（大吉…小凶）+ 天线彩蛋，选项不可编辑。',
      optsPlaceholder: '每行一个选项，例如：\n+选项A\n选项B\n-选项C',
      optsHint: '每行一个选项。行首加前缀设规则：<br>「+」偏爱：越久没摇到概率越高（连续 5 次没中 +20%）；<br>「-」冷门：每摇到一次 -20% 概率，之后慢慢回升；<br>不加前缀＝普通等概率。',
      noteLabel: '结语', notePlaceholder: '出结果时的一句话，如「就它了！」',
      focusTitle: '专注 · 番茄钟', focusLabel: '专注', breakLabel: '休息', minute: '分钟', preset: '常用',
      focusHint: '专注倒计时，到点提醒并自动进入休息（计时切台也继续走）。改完点底部保存。',
      apprTitle: '主题（点一下立即换肤）', diyTitle: '自定义外观 · DIY',
      diyName: '给这套外观起个名字', diySaveAs: '保存为新外观',
      diyHint: '改色会实时预览在电视上；同部位的深浅会自动推导。保存后出现在上面的主题列表里。',
      diyParts: ['机身', '屏幕', '屏框', '荧光(文字)', '上旋钮', '下旋钮', '腿', '复位灯', '喇叭/字'],
      genTitle: '通用', langLabel: '语言', autoLaunchLabel: '开机自动启动',
      save: '保存', saved: '已保存 ✓', skinned: '已换肤 ✓', savedTheme: '已保存外观 ✓', deletedTheme: '已删除',
      keepOne: '至少保留一个自定义频道', noPomo: '（没有番茄钟频道）',
    },
    en: {
      hintFortune: 'tap for fortune', hintList: 'tap to decide', again: 'draw again ↻',
      pomoStartHint: 'tap to start focus', pomoRunHint: 'running · tap to pause', pomoPauseHint: 'paused · tap to resume',
      pPomo: '🍅 Pomodoro', pFocus: '🍅 Focus', pBreak: '☕ Break',
      focusDone: 'Focus done 🎉', breakDone: 'Break over 🎉',
      cWorking: 'Claude thinking…', cWaiting: 'Claude needs you…', cDone: '✓ Done!',
      sleepy: 'sleepy…', zzz: 'Zzz…',
      chFortune: 'Fortune', chPomodoro: 'Pomodoro',
      setTitle: '📺 Cyber Fortune TV · Settings',
      tabChannels: 'Channels', tabFocus: 'Focus', tabAppearance: 'Look', tabGeneral: 'General',
      addChannel: '＋ New channel', name: 'Name', tagFortune: 'Built-in', tagList: 'List', del: 'Delete',
      fortuneLocked: '7-tier fortune (Great…Minor Curse) + antenna easter egg. Options not editable.',
      optsPlaceholder: 'one option per line, e.g.:\n+Option A\nOption B\n-Option C',
      optsHint: 'One option per line. Prefix sets a rule:<br>“+” favored: odds rise the longer it isn’t picked (+20% after 5 misses);<br>“-” rare: −20% odds each time it’s picked, then recovers;<br>no prefix = normal, equal odds.',
      noteLabel: 'Note', notePlaceholder: 'a line shown on result, e.g. “This one!”',
      focusTitle: 'Focus · Pomodoro', focusLabel: 'Focus', breakLabel: 'Break', minute: 'min', preset: 'preset',
      focusHint: 'Focus countdown; alerts at zero and auto-starts a break (keeps running across channels). Save below after editing.',
      apprTitle: 'Themes (tap to apply)', diyTitle: 'Custom look · DIY',
      diyName: 'name this look', diySaveAs: 'Save as new look',
      diyHint: 'Colors preview live on the TV; shades are derived automatically. Saved looks appear in the theme list above.',
      diyParts: ['Body', 'Screen', 'Bezel', 'Phosphor', 'Knob A', 'Knob B', 'Legs', 'Power LED', 'Speaker/Text'],
      genTitle: 'General', langLabel: 'Language', autoLaunchLabel: 'Launch at login',
      save: 'Save', saved: 'Saved ✓', skinned: 'Skin applied ✓', savedTheme: 'Look saved ✓', deletedTheme: 'Deleted',
      keepOne: 'Keep at least one custom channel', noPomo: '(no Pomodoro channel)',
    },
  };

  function defaultConfig() {
    return {
      current: 0,
      theme: 0,
      lang: 'zh',
      autoLaunch: true,
      customThemes: [],
      channels: [
        { id: 'fortune', name: '求签', type: 'fortune' },
        { id: 'pomodoro', name: '番茄钟', type: 'pomodoro', focusMin: 25, breakMin: 5 },
        {
          id: 'lunch', name: '中午吃什么', type: 'list', note: '就它了！',
          options: ['火锅', '麻辣烫', '黄焖鸡米饭', '沙县小吃', '兰州拉面',
                    '螺蛳粉', '盖浇饭', '日料', '汉堡', '轻食沙拉', '炒饭', '随便！'],
        },
      ],
    };
  }

  window.APP_DATA = { THEMES, FORTUNES, I18N, defaultConfig };
})();
