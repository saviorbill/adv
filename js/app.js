/* ============================================================
 * 主应用 — 导航、渲染调度、主题切换、数据导入、导出
 * ============================================================ */
(function () {
  'use strict';

  var el = function (id) { return document.getElementById(id); };
  var toNum = DataLoader.toNum;

  /* 简洁 SVG 图标（stroke 风格，随主题着色） */
  function svgIcon(path, size) {
    return '<svg viewBox="0 0 24 24" width="' + (size || 15) + '" height="' + (size || 15) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }
  var ICONS = {
    home: svgIcon('<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>'),
    macro: svgIcon('<path d="M6 20v-6M12 20V4M18 20v-9"/>'),
    examples: svgIcon('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
    caret: svgIcon('<path d="M9 18l6-6-6-6"/>', 12),
    trend: svgIcon('<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>'),
    perf: svgIcon('<path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>'),
    kline: svgIcon('<path d="M7 4v3M7 17v3M17 6v3M17 14v3M4 7h6M4 7v3M16 9h6M16 9v3M14 17h6M14 17v3"/>'),
    ml: svgIcon('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'),
    macro: svgIcon('<path d="M19 5L5 19"/><circle cx="7" cy="7" r="2"/><circle cx="17" cy="17" r="2"/>'),
    globe: svgIcon('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18"/>')
  };

  var GOALS = [
    { id: 'trend', label: '趋势图', desc: '时间序列', icon: ICONS.trend },
    { id: 'perf', label: '业绩评估', desc: '收益/波动/回撤', icon: ICONS.perf },
    { id: 'ml', label: '机器学习', desc: '回归/预测', icon: ICONS.ml },
    { id: 'macro', label: '宏观分析', desc: '同比/环比', icon: ICONS.macro }
  ];

  var TEMPLATES = [
    { category: '宏观数据', items: [
      { id: 'macro-gdp-area', label: '渐变面积 · GDP 增速' },
      { id: 'macro-dual', label: '双轴组合 · 社零总额' },
      { id: 'macro-step', label: '阶梯线 · 政策利率' },
      { id: 'macro-heatmap', label: '热力矩阵 · 全球增速' },
      { id: 'macro-sheirong-stack', label: '季节性折线 · 社融近4年' },
      { id: 'macro-pmi-radar', label: '雷达图 · 宏观景气13项' },
      { id: 'macro-world-map', label: '世界地图 · 通胀着色' },
      { id: 'macro-corr-explore', label: '关联探索 · 散点矩阵' }
    ]},
    { category: '行业数据', items: [
      { id: 'industry-rank', label: '横向排名 · 行业涨幅榜' },
      { id: 'industry-bubble', label: '气泡矩阵 · 行业景气' },
      { id: 'industry-treemap', label: '板块热力 · 行业市值' },
      { id: 'industry-stacked', label: '堆叠面积 · 行业成交额' }
    ]},
    { category: '公司财务', items: [
      { id: 'fin-waterfall', label: '瀑布图 · 阳光电源利润桥接' },
      { id: 'fin-combo', label: '双轴组合 · 阳光电源营收/净利率' },
      { id: 'fin-donut', label: '环形图 · 阳光电源收入结构' },
      { id: 'fin-sankey', label: '桑基图 · 阳光电源收入流向' },
      { id: 'apple-sankey', label: '桑基图 · 苹果产品营收拆解' },
      { id: 'fin-kpi', label: '指标卡 · 经营概览' }
    ]},
    { category: '金融资产', items: [
      { id: 'fund-perf', label: '资产净值 · 沪深300' },
      { id: 'asset-rank', label: '全球股指 · 近一年涨幅' },
      { id: 'asset-heat', label: '股指收益 · 年度热力' },
      { id: 'fin-yield-curve', label: '收益率曲线 · 美债' }
    ]},
    { category: '机器学习', items: [
      { id: 'ml-trend', label: '回归趋势 · 置信带' },
      { id: 'ml-forecast', label: '时间序列预测 · 扇面' },
      { id: 'ml-cluster', label: 'K-Means 聚类' },
      { id: 'ml-corr', label: '相关性矩阵' },
      { id: 'ml-dist', label: '收益分布 · KDE' }
    ]}
  ];

  /* 宏观图事件标注（竖线 + 标签 + 详细说明） */
  /* 这些图表类型不是时间序列，不适合「最新值标签 / 极值标注」 */
  var NO_DECOR_TYPES = { waterfall: 1, sankey: 1, donut: 1, treemap: 1, rank: 1, bubble: 1,
    radar: 1, heatmap: 1, matrixHeat: 1, scatterMatrix: 1, perf: 1, worldMap: 1, kpi: 1, season: 0 };

  var EVENTS = {
    'macro-gdp-area': [
      { x: '2020Q1', label: '疫情冲击', desc: '新冠疫情爆发，经济活动停摆，GDP 同比增速骤降至 -6.8%。' },
      { x: '2021Q1', label: '低基数复苏', desc: '低基数叠加复工复产，GDP 同比增速反弹至 18.3%。' }
    ],
    'macro-dual': [
      { x: '2023-11', label: '促销旺季', desc: '双十一等电商大促拉动社零总额同比明显回升。' },
      { x: '2024-01', label: '春节错位', desc: '春节假期错位导致 1 月社零同比读数阶段性波动。' }
    ],
    'macro-step': [
      { x: '2022-01', label: '降息周期', desc: '央行开启降息周期，1 年期 LPR 下调。' },
      { x: '2024-10', label: '大幅降息', desc: '逆周期调节力度加大，LPR 进一步下调至 3.10%。' }
    ]
  };

  /* 中国宏观历史事件（区间标注：start~end） */
  var CN_EVENTS = [
    { start: '2008-11', end: '2010-12', label: '四万亿刺激', desc: '国际金融危机后推出四万亿投资计划，基建与信贷大幅扩张。' },
    { start: '2015-06', end: '2016-02', label: 'A股异常波动', desc: '股市大幅回撤，监管出手救市，金融条件阶段性收紧。' },
    { start: '2018-03', end: '2020-01', label: '中美贸易战', desc: '美国对华加征关税，出口与制造业预期承压。' },
    { start: '2020-01', end: '2020-06', label: '新冠疫情', desc: '疫情爆发、经济活动停摆，GDP 同比创历史最大降幅。' },
    { start: '2020-07', end: '2021-06', label: '低基数', desc: '低基数叠加复工复产，读数普遍冲高。' },
    { start: '2022-03', end: '2022-06', label: '上海封控', desc: '长三角供应链受阻，消费、工业生产明显走弱。' },
    { start: '2023-07', end: '2023-12', label: '政治局会议', desc: '提出活跃资本市场、调整优化房地产政策。' },
    { start: '2024-09', end: '2025-03', label: '一揽子政策', desc: '降准降息 + 地产松绑 + 资本市场支持，预期扭转。' },
    { start: '2025-05', end: '2025-12', label: '降准降息', desc: '政策利率下调、降准落地，稳增长加力。' },
    { start: '2026-11', end: '2026-12', label: '政策利率换锚', desc: '隔夜逆回购成为主政策利率，形成 1.00%~1.50% 走廊。' }
  ];

  /* 按图表时间范围筛选事件（区间有交集才显示） */
  function cnEventsForLabels(labels) {
    if (!labels || labels.length < 2) return [];
    function toMonth(v) {
      var m = String(v === undefined || v === null ? '' : v).match(/(\d{4})\D+(\d{1,2})/);
      if (!m) return null;
      return parseInt(m[1], 10) * 12 + (parseInt(m[2] || '1', 10) - 1);
    }
    var a = toMonth(labels[0]), b = toMonth(labels[labels.length - 1]);
    if (a === null || b === null) return [];
    return CN_EVENTS.filter(function (e) {
      var s = toMonth(e.start), en = toMonth(e.end);
      if (s === null) return false;
      if (en === null) en = s;
      return en >= a - 1 && s <= b + 1;
    });
  }

  function isEn() { return !!(window.I18N && window.I18N.getLang() === 'en'); }
  function tr(zh, en) { return isEn() ? en : zh; }

  /* 金额格式化：中文用「亿」，英文用 B CNY */
  function fmtCny(v) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    return isEn() ? (v / 1e9).toFixed(1) + 'B CNY' : (v / 1e8).toFixed(1) + ' 亿';
  }

  /* 数据层文案翻译（英文模式） */
  function DT(zh) {
    return (window.DATA_I18N && window.DATA_I18N.t) ? window.DATA_I18N.t(zh) : zh;
  }

  /* 拼 innerHTML 时用：事件标注、系列名、指标名都来自用户数据（含分享链接），必须转义 */
  var ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function escHtml(v) {
    return String(v === undefined || v === null ? '' : v).replace(/[&<>"']/g, function (c) { return ESC_MAP[c]; });
  }

  var state = {
    theme: 'paper',
    /* 外观三态：light / dark / system；themeByMode 记住每一档上次用的配色 */
    appearance: 'system',
    themeByMode: { light: 'paper', dark: 'obsidian' },
    currentTemplate: 'macro-gdp-area',
    mode: 'template',
    isImported: false,
    showEvents: true,
    showWatermark: true,
    annotateMode: false,
    tableView: false,
    transposed: false,
    labelMode: 'off',
    palette: 'consult',
    seriesColors: {},
    overrideType: null,
    annotations: {},
    customTitles: {},
    viewKey: 'tpl:macro-gdp-area',
    priceEl: null, echartsEl: null, priceInsts: [],
    table: null, det: null,
    dataset: null, datasets: null, dashboardDatasets: null,
    mapping: { timeCol: '', yCols: [], chartType: 'line' },
    radarPick: null,   // 雷达图参与对比的期数（行标签或月份列）
    uploadedTable: null, overlaySeries: [], _indicatorOptions: null, macroItem: null, finItem: null, intlItem: null, chartConfig: null, exploreConfig: null, lastChart: null, timeRange: 'all', alignToMain: true, macroTypeOverride: null, analysisGoal: 'trend'
  };

  function vnum(v) { var n = toNum(v); return isNaN(n) ? null : n; }

  /* 时间轴裁剪：按所有系列中有数据的范围 [最早, 最晚] 裁剪 */
  function trimToDataRange(labels, series) {
    var n = labels.length, first = n, last = -1;
    series.forEach(function (s) {
      s.values.forEach(function (v, i) {
        if (v !== null && v !== undefined && !isNaN(v)) {
          if (i < first) first = i;
          if (i > last) last = i;
        }
      });
    });
    if (first > last || first === 0 && last === n - 1) return { labels: labels, series: series };
    return {
      labels: labels.slice(first, last + 1),
      series: series.map(function (s) { return { name: s.name, values: s.values.slice(first, last + 1) }; })
    };
  }

  /* 时间区间裁剪：近1年/近5年/近10年/全部 */
  function applyTimeRange(labels, series) {
    if (!state.timeRange || state.timeRange === 'all' || !labels || !labels.length) return { labels: labels, series: series };
    if (state.timeRange === 'ytd') {
      var lastL = String(labels[labels.length - 1]);
      var ym0 = lastL.match(/^(\d{4})/);
      if (!ym0) return { labels: labels, series: series };
      var yr = ym0[1], st0 = -1;
      for (var k = 0; k < labels.length; k++) { if (String(labels[k]).indexOf(yr + '-') === 0) { st0 = k; break; } }
      if (st0 <= 0) return { labels: labels, series: series };
      return { labels: labels.slice(st0), series: series.map(function (x) { return { name: x.name, values: x.values.slice(st0) }; }) };
    }
    var years = { '1y': 1, '3y': 3, '5y': 5, '10y': 10 }[state.timeRange];
    if (!years) return { labels: labels, series: series };
    var lastLabel = String(labels[labels.length - 1]);
    var lastY = parseInt(lastLabel.match(/\d{4}/), 10);
    if (isNaN(lastY)) return { labels: labels, series: series };
    var cutoffY = lastY - years + 1;
    var start = 0;
    for (var i = 0; i < labels.length; i++) {
      var ym = String(labels[i]).match(/\d{4}/);
      if (ym && parseInt(ym[0], 10) >= cutoffY) { start = i; break; }
    }
    if (start === 0) return { labels: labels, series: series };
    if (labels.length - start < 3) start = Math.max(0, labels.length - 3);
    return {
      labels: labels.slice(start),
      series: series.map(function (s) { return { name: s.name, values: s.values.slice(start) }; })
    };
  }


  /* 统一数值显示：最多两位小数，大数加千分位 */
  function fmt2(v) {
    if (v === null || v === undefined || v === '') return '';
    var n = Number(v);
    if (!isFinite(n)) return String(v);
    if (Math.abs(n) >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    return String(Math.round(n * 100) / 100);
  }
  function fmtNum(v) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    return Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  /* 深色主题下把色板颜色提亮，保证对比度 */
  function hexToHsl(hex) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn, hh = 0, ss = 0;
    if (d) {
      ss = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) hh = ((g - b) / d + (g < b ? 6 : 0));
      else if (mx === g) hh = (b - r) / d + 2;
      else hh = (r - g) / d + 4;
      hh /= 6;
    }
    return [hh * 360, ss * 100, l * 100];
  }
  function liftForDark(hex, minL) {
    if (!hex || hex[0] !== '#') return hex;
    var hsl = hexToHsl(hex);
    var l = Math.max(hsl[2], minL || 56);
    var s = Math.min(96, Math.max(28, hsl[1]));
    var h = hsl[0] / 360, S = s / 100, L = l / 100;
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    var q2 = L < 0.5 ? L * (1 + S) : L + S - L * S, p2 = 2 * L - q2;
    var R = Math.round(hue2rgb(p2, q2, h + 1 / 3) * 255), G = Math.round(hue2rgb(p2, q2, h) * 255), B = Math.round(hue2rgb(p2, q2, h - 1 / 3) * 255);
    return '#' + [R, G, B].map(function (v) { return ('0' + Math.max(0, Math.min(255, v)).toString(16)).slice(-2); }).join('');
  }
  function themeIsDark(t) {
    var bg = (t && t.chart && t.chart.bg) || '#FFFFFF';
    return hexToHsl(bg)[2] < 45;
  }

  function getChartTheme() {
    var t = Themes.active();
    var c = Object.assign({}, t.chart);
    c.id = t.id;
    // 单图配色（顶级咨询/金融/期刊风格）
    var pid = state.palette || 'consult';
    var ps = (window.ADV_PALETTES || []).filter(function (p) { return p.id === pid; })[0];
    c.paletteId = pid;
    var dark = themeIsDark(t);
    c._dark = dark;
    c.isDark = dark;
    if (ps) {
      var lift = function (arr) { return (arr || []).map(function (x) { return dark ? liftForDark(x, 58) : x; }); };
      c.series = lift(ps.colors);
      c.paletteRamp = lift(ps.ramp);
      if (ps.accent) c.accent = dark ? liftForDark(ps.accent, 62) : ps.accent;
      if (ps.up) c.up = dark ? liftForDark(ps.up, 58) : ps.up;
      if (ps.down) c.down = dark ? liftForDark(ps.down, 58) : ps.down;
      if (!dark && ps.ink) c.text = ps.ink;
    }
    return c;
  }

  /* 配色芯片预览：深色主题下用提亮后的色块，否则深蓝芯片在深底上看不见 */
  function paletteChipColors(pp) {
    var arr = (pp && pp.colors) || [];
    var dark = themeIsDark(Themes.active());
    return dark ? arr.map(function (c) { return liftForDark(c, 58); }) : arr;
  }

  function currentSeriesNames() {
    // 优先从已渲染图表读取（适配宏观/金融/国际等所有视图）
    if (state.echartsEl && window.echarts) {
      try {
        var _inst = echarts.getInstanceByDom(state.echartsEl);
        if (_inst) {
          var _o = _inst.getOption();
          if (_o.series && _o.series.length) {
            var _names = _o.series.map(function (x) { return x.name; }).filter(Boolean);
            if (_names.length) return _names;
          }
        }
      } catch (e) {}
    }
    if (state.mode === 'imported' || state.mode === 'dataset') return state.mapping.yCols ? state.mapping.yCols.slice() : [];
    if (state.mode === 'template') {
      var s = DataLoader.SAMPLES[state.currentTemplate];
      if (s && s.data) {
        if (s.data.series) return s.data.series.map(function (x) { return x.name; });
        var names = [];
        (s.data.bars || []).forEach(function (b) { names.push(b.name); });
        (s.data.lines || []).forEach(function (l) { names.push(l.name); });
        return names;
      }
    }
    return [];
  }

  function openColorPanel() {
    var names = currentSeriesNames();
    var list = el('color-list');
    list.innerHTML = '';
    if (!names.length) { toast('当前图表无可单独配色的系列'); return; }
    var swatches = Themes.active().chart.series.slice(0, 10); // 主题配色
    names.forEach(function (name) {
      var cur = state.seriesColors[name] || '';
      var row = document.createElement('div');
      row.className = 'color-row';
      var dots = swatches.map(function (c) {
        return '<span class="color-dot' + (c === cur ? ' on' : '') + '" data-name="' + name + '" data-color="' + c + '" style="background:' + c + '"></span>';
      }).join('');
      row.innerHTML =
        '<span class="color-name">' + name + '</span>' +
        '<span class="color-dots">' + dots + '</span>' +
        (cur ? '<button class="btn sm color-reset" data-name="' + name + '">重置</button>' : '');
      list.appendChild(row);
    });
    el('color-overlay').classList.add('open');
  }

  function closeColorPanel() { el('color-overlay').classList.remove('open'); }

  /* 指标增删（从当前数据表里选择要绘制的指标） */
  function openIndicatorPanel() {
    var options = []; // {key, name, labels, values}
    if (state.macroItem) {
      (window.CHINA_MACRO && window.CHINA_MACRO.sections || []).forEach(function (sec) {
        sec.items.forEach(function (item) {
          if (!item.series || !item.series.length) return;
          if (item.title === state.macroItem.title) return;
          options.push({ key: 'macro:' + item.title, name: DT(item.title), labels: item.labels, values: item.series[0].values });
        });
      });
    } else if (state.finItem) {
      financeLoadedItems().forEach(function (item) {
        if (!item.series || !item.series.length) return;
        if (item.title === state.finItem.title) return;
        options.push({ key: 'fin:' + item.title, name: DT(item.title), labels: item.labels, values: item.series[0].values });
      });
    } else if (state.intlItem) {
      // 国际宏观：可叠加其他国家指标 + 中国宏观数据对比
      (window.INTL_MACRO && window.INTL_MACRO.sections || []).forEach(function (sec) {
        sec.items.forEach(function (item) {
          if (!item.series || !item.series.length) return;
          if (item.title === state.intlItem.title) return;
          options.push({ key: 'intl:' + item.title, name: DT(item.title), labels: item.labels, values: item.series[0].values });
        });
      });
      (window.CHINA_MACRO && window.CHINA_MACRO.sections || []).forEach(function (sec) {
        sec.items.forEach(function (item) {
          if (!item.series || !item.series.length) return;
          options.push({ key: 'cn:' + item.title, name: (isEn() ? '[China] ' : '【中国】') + DT(item.title), labels: item.labels, values: item.series[0].values });
        });
      });
    } else if (state.chartConfig) {
      // AI 生成的图：可叠加真实宏观/金融指标
      ['INTL_MACRO', 'CHINA_MACRO'].forEach(function (gname) {
        var D = window[gname];
        ((D && D.sections) || []).forEach(function (sec) {
          (sec.items || []).forEach(function (item) {
            if (!item.series || !item.series.length) return;
            var name = item.title;
            var exists = (state.chartConfig.series || []).some(function (x) { return x.name === name; });
            if (exists) return;
            options.push({ key: 'real:' + gname + ':' + name, name: name, labels: item.labels, values: item.series[0].values });
          });
        });
      });
      /* 已加载的金融条目也可叠加 */
      financeLoadedItems().forEach(function (item) {
        if (!item.series || !item.series.length) return;
        var nm = item.title;
        if ((state.chartConfig.series || []).some(function (x) { return x.name === nm; })) return;
        options.push({ key: 'real:fin:' + nm, name: nm, labels: item.labels, values: item.series[0].values });
      });
    } else {
      var table = state.uploadedTable || state.table || (state.dataset && state.dataset.table);
      if (!table) { toast('请先上传数据，再添加指标'); return; }
      var det = DataLoader.detectTable(table);
      var cols = det.numericCols.filter(function (c) { return c !== det.timeCol; });
      cols.forEach(function (col) {
        var s = extractedSeries(table, det.timeCol, col);
        options.push({ key: 'col:' + col, name: col, labels: s.labels, values: s.values });
      });
    }
    if (!options.length) { list = el('indicator-list'); list.innerHTML = '<span class="hint">暂无可添加的指标</span>'; el('indicator-overlay').classList.add('open'); return; }
    state._indicatorOptions = options;
    var list = el('indicator-list');
    list.innerHTML = '';
    options.forEach(function (o) {
      var on = state.overlaySeries.some(function (x) { return x.key === o.key; });
      if (!on && state.mapping.yCols.indexOf(o.name) >= 0) on = true;
      var chip = document.createElement('div');
      chip.className = 'col-chip' + (on ? ' on' : '');
      chip.textContent = o.name;
      chip.dataset.key = o.key;
      list.appendChild(chip);
    });
    el('indicator-overlay').classList.add('open');
  }
  function closeIndicatorPanel() { el('indicator-overlay').classList.remove('open'); }

  function extractedSeries(table, timeCol, col) {
    var labels = [], values = [];
    table.rows.forEach(function (r) { var v = DataLoader.toNum(r[col]); if (!isNaN(v)) { labels.push(String(r[timeCol])); values.push(v); } });
    return { labels: labels, values: values };
  }

  /* 把额外指标叠加到当前图（按日期对齐） */
  function alignSeriesToBase(baseLabels, overlayLabels, overlayValues) {
    var aligned = new Array(baseLabels.length).fill(null);
    var j = 0;
    for (var i = 0; i < baseLabels.length; i++) {
      var target = String(baseLabels[i]);
      while (j < overlayLabels.length && String(overlayLabels[j]) <= target) j++;
      if (j > 0) aligned[i] = overlayValues[j - 1];
    }
    return aligned;
  }

  function mergeOverlaySeries(baseLabels, baseSeries, overlays) {
    if (!overlays || !overlays.length) return { labels: baseLabels, series: baseSeries };
    if (state.alignToMain) {
      // 按主图频率对齐：保留主图标签，叠加序列取"每个主图时间点之前最近的值"
      var alignedSeries = overlays.map(function (o) {
        return { name: o.name, values: alignSeriesToBase(baseLabels, o.labels, o.values) };
      });
      return { labels: baseLabels, series: baseSeries.concat(alignedSeries) };
    }
    var labelSet = {};
    baseLabels.forEach(function (l) { labelSet[l] = true; });
    overlays.forEach(function (o) { o.labels.forEach(function (l) { labelSet[l] = true; }); });
    var union = Object.keys(labelSet).sort();
    var newSeries = baseSeries.map(function (s) {
      var m = {};
      baseLabels.forEach(function (l, i) { m[l] = s.values[i]; });
      return { name: s.name, values: union.map(function (l) { return m[l] !== undefined ? m[l] : null; }) };
    });
    overlays.forEach(function (o) {
      var m = {};
      o.labels.forEach(function (l, i) { m[l] = o.values[i]; });
      newSeries.push({ name: o.name, values: union.map(function (l) { return m[l] !== undefined ? m[l] : null; }) });
    });
    return { labels: union, series: newSeries };
  }
  /* 量级差异大 → 自动双轴折线 */
  function medianAbs(values) {
    var v = values.filter(function (x) { return x !== null && x !== undefined && !isNaN(x) && x !== 0; });
    if (!v.length) return 0;
    v.sort(function (a, b) { return a - b; });
    return Math.abs(v[Math.floor(v.length / 2)]);
  }
  function magnitudeMismatch(series) {
    var stats = series.map(function (s) {
      var v = s.values.filter(function (x) { return x !== null && x !== undefined && !isNaN(x) && x !== 0; });
      if (!v.length) return null;
      v.sort(function (a, b) { return a - b; });
      return { min: v[0], max: v[v.length - 1], median: v[Math.floor(v.length / 2)] };
    }).filter(Boolean);
    if (stats.length < 2) return false;
    // 只有数量级差距很大（>10 倍）才用双轴；同量级（如各国GDP增速）用单轴
    var mags = stats.map(function (s) { return Math.max(Math.abs(s.max), Math.abs(s.min), Math.abs(s.median)); }).filter(function (m) { return m > 0; });
    if (mags.length >= 2) {
      var mx = Math.max.apply(null, mags), mn = Math.min.apply(null, mags);
      if (mx / mn > 10) return true;
    }
    return false;
  }
  function renderAutoDual(c, type, data, theme) {
    if ((type === 'line' || type === 'area') && data && data.series && data.series.length >= 2 && magnitudeMismatch(data.series)) {
      var meds = data.series.map(function (s) { return medianAbs(s.values); });
      var maxIdx = meds.indexOf(Math.max.apply(null, meds));
      var dup = {
        labels: data.labels,
        series: data.series.map(function (s, i) { return { name: s.name, values: s.values, yAxisIndex: (i === maxIdx ? 0 : 1) }; })
      };
      return ChartFactory.render(c, 'dualLine', dup, theme);
    }
    return ChartFactory.render(c, type, data, theme);
  }


  /* ---------- 多指标：趋同 / 分化分析与区间概率 ---------- */
  function returnsOf(values) {
    var out = [];
    for (var i = 1; i < values.length; i++) {
      var a = values[i - 1], b = values[i];
      out.push((a !== null && a !== undefined && !isNaN(a) && a !== 0 && b !== null && !isNaN(b)) ? (b - a) / Math.abs(a) : null);
    }
    return out;
  }
  function corrOf(x, y) {
    var pairs = [];
    for (var i = 0; i < x.length; i++) if (x[i] !== null && y[i] !== null) pairs.push([x[i], y[i]]);
    var n = pairs.length;
    if (n < 8) return null;
    var sx = 0, sy = 0;
    pairs.forEach(function (p) { sx += p[0]; sy += p[1]; });
    var mx = sx / n, my = sy / n, num = 0, dx = 0, dy = 0;
    pairs.forEach(function (p) {
      var a = p[0] - mx, b = p[1] - my;
      num += a * b; dx += a * a; dy += b * b;
    });
    if (dx === 0 || dy === 0) return null;
    return num / Math.sqrt(dx * dy);
  }
  function analyzeCohesion(labels, series) {
    if (!series || series.length < 2) return null;
    var base = series[0].values;
    /* 一条是债券到期收益率、另一条不是 → 收益率与债券价格反向，相关方向需取反 */
    var invert = isYieldSeries(series[0].name) !== isYieldSeries(series[1].name);
    var out = { pairs: [], overall: null, inverted: invert };
    for (var i = 1; i < series.length; i++) {
      var r1 = returnsOf(base), r2 = returnsOf(series[i].values);
      var r = corrOf(r1, r2);
      if (invert && r !== null) r = -r;
      out.pairs.push({ name: series[i].name, r: r });
    }
    out.overall = out.pairs[0] ? out.pairs[0].r : null;
    /* 滚动相关：窗口 = 60 期或 1/8 长度 */
    var win = Math.max(20, Math.min(120, Math.floor(labels.length / 8)));
    var rA = returnsOf(base), rB = returnsOf(series[1].values);
    var roll = [];
    for (var t = win; t <= rA.length; t++) {
      var c0 = corrOf(rA.slice(t - win, t), rB.slice(t - win, t));
      roll.push({ i: t, c: (invert && c0 !== null) ? -c0 : c0 });
    }
    var conv = 0, div = 0, valid = 0;
    roll.forEach(function (o) {
      if (o.c === null) return;
      valid++;
      if (o.c >= 0.3) conv++;
      else if (o.c <= -0.1) div++;
    });
    out.roll = roll;
    out.convRatio = valid ? conv / valid : 0;
    out.divRatio = valid ? div / valid : 0;
    out.win = win;
    /* 找最长的连续分化段 */
    var best = null, cur = null;
    roll.forEach(function (o) {
      var isDiv = (o.c !== null && o.c <= -0.1);
      if (isDiv) {
        if (!cur) cur = { from: o.i - win, to: o.i, len: 1 };
        else { cur.to = o.i; cur.len++; }
      } else if (cur) {
        if (!best || cur.len > best.len) best = cur;
        cur = null;
      }
    });
    if (cur && (!best || cur.len > best.len)) best = cur;
    out.longestDiv = best;
    return out;
  }

  function renderCohesionPanel(labels, series, inst, theme) {
    var an = analyzeCohesion(labels, series);
    if (!an) return null;
    var wrap = document.createElement('div');
    wrap.className = 'cohesion-panel';
    var r = an.overall;
    var verdict = r === null ? '—'
      : r >= 0.5 ? tr('高度正相关 · 走势高度趋同', 'Strongly positive · highly convergent')
      : r >= 0.15 ? tr('弱正相关 · 大体同向', 'Mildly positive · mostly same direction')
      : r > -0.15 ? tr('基本无关 · 走势分化', 'Uncorrelated · divergent')
      : tr('负相关 · 走势背离', 'Negative · move in opposite directions');
    var cls = r === null ? '' : (r >= 0.15 ? 'pos' : (r <= -0.15 ? 'neg' : ''));

    /* 生成连续时段带：正相关 / 分化 */
    var segs = [];
    var win = an.win;
    an.roll.forEach(function (o) {
      if (o.c === null) return;
      var kind = o.c >= 0.3 ? 'conv' : (o.c <= 0 ? 'div' : null);
      if (!kind) return;
      var from = o.i - win, to = o.i;
      var lastSeg = segs[segs.length - 1];
      if (lastSeg && lastSeg.kind === kind && from <= lastSeg.to + 1) lastSeg.to = to;
      else segs.push({ kind: kind, from: from, to: to });
    });
    /* 图例 + 时段表 */
    var convTot = 0, divTot = 0;
    segs.forEach(function (sg) { if (sg.kind === 'conv') convTot += (sg.to - sg.from); else divTot += (sg.to - sg.from); });
    var list = segs.slice().sort(function (a, b) { return (b.to - b.from) - (a.to - a.from); }).slice(0, 5);

    wrap.innerHTML =
      '<div class="coh-head">' + tr('趋同 / 分化时段', 'Convergence & divergence periods') +
        '<span class="coh-sub">' + tr('滚动窗口 ', 'window ') + win + tr(' 期 · 基于收益率相关系数', ' periods · correlation of returns') +
        (an.inverted ? tr('　·　已按债券价格方向校正（收益率上行＝债券下跌）', '　·　sign-corrected for bond prices') : '') + '</span></div>' +
      '<div class="coh-legend">' +
        '<span class="coh-dot conv"></span>' + tr('正相关（r ≥ 0.3）走势趋同', 'Convergent (r ≥ 0.3)') +
        '<span class="coh-dot div"></span>' + tr('分化（r ≤ 0）背离或无关', 'Divergent (r ≤ 0)') +
      '</div>' +
      '<div class="coh-grid">' +
        '<div class="coh-cell"><div class="coh-k">' + tr('区间相关系数', 'Correlation') + '</div>' +
          '<div class="coh-v ' + cls + '">' + (r === null ? '—' : r.toFixed(2)) + '</div>' +
          '<div class="coh-d">' + verdict + '</div></div>' +
        '<div class="coh-cell"><div class="coh-k">' + tr('趋同时段占比', 'Convergent share') + '</div>' +
          '<div class="coh-v pos">' + (an.convRatio * 100).toFixed(0) + '%</div>' +
          '<div class="coh-d">' + tr('滚动相关 ≥ 0.3', 'rolling r ≥ 0.3') + '</div></div>' +
        '<div class="coh-cell"><div class="coh-k">' + tr('分化时段占比', 'Divergent share') + '</div>' +
          '<div class="coh-v neg">' + (an.divRatio * 100).toFixed(0) + '%</div>' +
          '<div class="coh-d">' + tr('滚动相关 ≤ 0', 'rolling r ≤ 0') + '</div></div>' +
        '<div class="coh-cell"><div class="coh-k">' + tr('主要时段', 'Key periods') + '</div>' +
          '<div class="coh-list">' + (list.length ? list.map(function (sg) {
            return '<span class="coh-tag ' + sg.kind + '">' +
              (sg.kind === 'conv' ? tr('趋同', 'conv') : tr('分化', 'div')) + ' ' +
              String(labels[Math.max(0, sg.from)] || '').slice(0, 7) + '→' + String(labels[Math.min(labels.length - 1, sg.to)] || '').slice(0, 7) +
              '</span>';
          }).join('') : '<span class="coh-d">—</span>') + '</div></div>' +
      '</div>';
    el('chart-stage').appendChild(wrap);

    /* 图上标注：把连续时段画成底色带 */
    if (inst && segs.length) {
      try {
        var areas = segs.filter(function (sg) { return (sg.to - sg.from) >= Math.max(4, win / 2); }).slice(0, 8).map(function (sg) {
          return [
            { xAxis: labels[Math.max(0, sg.from)], itemStyle: { color: sg.kind === 'conv' ? 'rgba(46,107,82,0.09)' : 'rgba(181,72,75,0.08)' } },
            { xAxis: labels[Math.min(labels.length - 1, sg.to)] }
          ];
        });
        if (areas.length) {
          inst.setOption({ series: [{ markArea: {
            silent: true,
            label: { show: false },
            data: areas
          } }] });
        }
      } catch (e) {}
    }
    return wrap;
  }

  /* ---------- 数据管理（保存/导出/URL 载入） ---------- */
  function openDataPanel() { el('data-overlay').classList.add('open'); }
  function closeDataPanel() { el('data-overlay').classList.remove('open'); }

  function applyRemoteTable(table, title) {
    table = DataLoader.maybeTranspose(table);
    state.table = table;
    var det = DataLoader.detectTable(table);
    state.det = det;
    state.mapping.timeCol = det.timeCol;
    state.mapping.yCols = det.numericCols.filter(function (c) { return c !== det.timeCol; });
    state.mapping.chartType = det.isTimeSeries ? 'area' : 'bar';
    state.isImported = true; state.mode = 'imported'; state.viewKey = 'imported';
    state.customTitles = state.customTitles || {};
    state.customTitles['imported'] = title;
    closeDataPanel();
    renderUserChart(false);
    toast('已加载 ' + table.rows.length + ' 行数据');
  }

  function fetchRemote(url) {
    toast('正在拉取数据…');
    fetch(url)
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (json) {
        if (json && json.observations) {
          var obs = json.observations || [];
          var rows = obs.filter(function (o) { return o.value && o.value !== '.'; })
            .map(function (o) { var r = {}; r['日期'] = o.date; r['数值'] = Number(o.value); return r; });
          applyRemoteTable({ columns: ['日期', '数值'], rows: rows }, (json.series && json.series.title) || '远程数据');
        } else if (Array.isArray(json)) {
          var cols = Object.keys(json[0] || {});
          applyRemoteTable({ columns: cols, rows: json }, '远程数据');
        } else if (json && json.type && (json.labels !== undefined || json.series !== undefined || json.data)) {
          applyChartConfig(json); closeDataPanel();
        } else if (json && json.labels && json.series) {
          applyChartConfig(json); closeDataPanel();
        } else {
          toast('无法识别的数据格式');
        }
      })
      .catch(function (e) { toast('拉取失败：' + e.message + '（file:// 下可能被浏览器拦截，请用线上部署）'); });
  }

  function loadDataUrl() {
    var u = el('data-url').value.trim();
    if (!u) { toast('请输入数据 URL'); return; }
    fetchRemote(u);
  }

  function saveLocal() {
    if (!state.table) { toast('当前没有可保存的数据'); return; }
    try {
      localStorage.setItem('advData', JSON.stringify({ table: state.table, title: el('chart-title').textContent || '我的数据' }));
      toast('已保存到浏览器');
    } catch (e) { toast('保存失败：' + e.message); }
  }

  function restoreLocal() {
    try {
      var raw = localStorage.getItem('advData');
      if (!raw) { toast('浏览器中还没有保存的数据'); return; }
      var obj = JSON.parse(raw);
      applyRemoteTable(obj.table, obj.title || '我的数据');
    } catch (e) { toast('恢复失败：' + e.message); }
  }

  function exportJson() {
    if (!state.table) { toast('当前没有可导出的数据'); return; }
    var blob = new Blob([JSON.stringify(state.table, null, 0)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'data.json';
    a.click();
    toast('数据 JSON 已导出（可放到 GitHub 仓库用 URL 载入）');
  }

  var TYPE_LABELS = {
    line: '折线图', area: '面积图', bar: '柱状图', stacked: '堆叠面积', rank: '横向排名',
    candlestick: 'K 线', radar: '雷达图', stackedBar: '堆叠柱状', perf: '业绩评估',
    worldMap: '世界地图', scatterMatrix: '散点矩阵',
    step: '阶梯线', season: '季节性对比', streamgraph: '主题河流图',
    combo: '柱+线组合', dual: '双轴对比', dumbbell: '哑铃图', bullet: 'KPI 达成', tornado: '龙卷风图',
    percentBar: '百分比堆叠', pie: '饼图', donut: '环形图', treemap: '矩形树图', sunburst: '旭日图', waterfall: '瀑布图',
    histogram: '直方图', boxplot: '分布条带', ridge: '山脊图', violin: '小提琴图',
    scatter: '散点图', bubble: '气泡图', heatmap: '热力图', corrMatrix: '相关性矩阵',
    funnel: '漏斗图', sankey: '桑基图',
    choropleth: '分级统计图', heatMapGeo: '热点地图', symbolMap: '标记地图',
    tree: '树形图', orgChart: '组织架构', icicle: '冰柱图', swimlane: '泳道图',
    kpi: 'KPI 卡片', archDiagram: '系统架构图', control: '控制图', parallel: '平行坐标'
  };

  /* ---------- 通用 ---------- */
  var toastTimer = null;
  function toast(msg, isError) {
    var t = el('toast');
    t.textContent = msg;
    t.classList.add('show');
    t.classList.toggle('toast-error', !!isError);
    clearTimeout(toastTimer);
    /* 错误提示停留更久，方便截图/排查 */
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, isError ? 5200 : 2200);
    if (isError && window.console && console.warn) console.warn('[ADV]', msg);
  }

  function toggleSidebar() {
    var sb = el('sidebar');
    var open = sb.classList.toggle('open');
    el('sidebar-backdrop').classList.toggle('show', open);
  }
  function closeSidebar() {
    el('sidebar').classList.remove('open');
    el('sidebar-backdrop').classList.remove('show');
  }

  function setHead(meta) {
    state.currentMeta = meta;
    el('chart-title').textContent = state.customTitles[state.viewKey] || DT(meta.title);
    el('chart-subtitle').textContent = DT(meta.subtitle || '');
    var unit = el('chart-unit');
    if (meta.unit) { unit.style.display = ''; unit.textContent = DT(meta.unit); }
    else unit.style.display = 'none';
    el('chart-source').textContent = DT(meta.source || '');
  }

  function clearStage() {
    hideBack();
    ChartFactory.disposeAll();
    state.priceInsts.forEach(function (inst) { PriceChart.destroy(inst); });
    state.priceInsts = [];
    (state.macroInsts || []).forEach(function (i) { try { i.dispose(); } catch (e) {} });
    state.macroInsts = [];
    (state.catInsts || []).forEach(function (o) { try { o.inst.dispose(); } catch (e) {} });
    state.catInsts = [];
    state.priceEl = null; state.echartsEl = null;
    el('chart-stage').innerHTML = '';
    var en = el('event-notes'); if (en) { en.innerHTML = ''; en.style.display = 'none'; }
    clearAnalysis();
  }

  function normalizeTime(v) {
    var s = String(v).trim();
    if (/^\d{8}$/.test(s)) return s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6, 8);
    var m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m) return m[1] + '-' + (m[2].length < 2 ? '0' : '') + m[2] + '-' + (m[3].length < 2 ? '0' : '') + m[3];
    return s;
  }

  /* ---------- 图上标注（加说明） ---------- */
  function echartsAnnotations(key) {
    return (state.annotations[key] || []).filter(function (a) { return a.cat !== undefined; });
  }
  function priceAnnotations(key) {
    return (state.annotations[key] || []).filter(function (a) { return a.time !== undefined; });
  }

  function attachAnnotationHandler(inst) {
    if (!inst || !inst.getZr) return;
    var zr = inst.getZr();
    if (zr._annotBound) return;
    zr._annotBound = true;
    zr.on('click', function (e) {
      if (!state.annotateMode) return;
      var px = e.offsetX, py = e.offsetY;
      var opt = inst.getOption();
      var xAxis = opt.xAxis && opt.xAxis[0];
      var pt;
      try { pt = inst.convertFromPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [px, py]); }
      catch (err) {
        try { pt = inst.convertFromPixel({ gridIndex: 0 }, [px, py]); }
        catch (err2) { return; }
      }
      if (!pt) return;
      var cat, val = pt[1];
      if (xAxis && xAxis.type === 'category' && xAxis.data) {
        var idx = (typeof pt[0] === 'number') ? Math.round(pt[0]) : xAxis.data.indexOf(pt[0]);
        idx = Math.max(0, Math.min(xAxis.data.length - 1, idx));
        cat = xAxis.data[idx];
      } else { cat = pt[0]; }
      if (cat === undefined || cat === null || isNaN(val)) { toast('请点击图表绘图区域内'); return; }
      showAnnotationInput(px, py, function (text) {
        var list = state.annotations[state.viewKey] || (state.annotations[state.viewKey] = []);
        list.push({ cat: cat, val: val, text: text });
        rerender();
        toast('已添加说明');
      });
    });
  }

  /* 极值标注：标注可视区间内最高 / 最低 / 最新，随缩放更新 */
  /* 极值标注：标注可视区间内各指标的最高/最低/最新，可拖动、带箭头指向 */
  /* 根据背景色自动选择深色/浅色文字 */
  function pickTextColor(bg) {
    if (!bg) return '#FFFFFF';
    var r = 255, g = 255, b = 255;
    if (bg.charAt(0) === '#') {
      var hex = bg.slice(1);
      if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      r = parseInt(hex.slice(0, 2), 16); g = parseInt(hex.slice(2, 4), 16); b = parseInt(hex.slice(4, 6), 16);
    } else {
      var m = bg.match(/rgba?\(([^)]+)\)/);
      if (m) { var p = m[1].split(',').map(Number); r = p[0]; g = p[1]; b = p[2]; }
    }
    var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.6 ? '#0E0F12' : '#FFFFFF';
  }


  /* 全部标注：覆盖层纯数字标签（不依赖 ECharts label，避免高密度时不渲染） */

  /* ===================================================================
     统一数据标注层：最新值 / 最高 / 最低 全部由这一层绘制
     —— 同一套字体、同一套配色逻辑、统一避让与越界收敛
     =================================================================== */
  function labelNum(v) {
    var n = Number(v);
    if (!isFinite(n)) return String(v);
    var a = Math.abs(n);
    if (a >= 1000) return n % 1 === 0 ? n.toLocaleString('en-US') : n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    if (a >= 10) return n.toFixed(1);
    return n.toFixed(2);
  }

  function renderValueLabels(inst) {
    if (!inst || !inst.getDom) return;
    /* 最新值只在金融资产类图表展示：横向对比等场景下标在最后一个点上没有意义 */
    var showLatest = !!state.finItem || state.mode === 'finance';
    var container = inst.getDom();
    if (!container) return;
    Array.prototype.forEach.call(container.querySelectorAll('.last-tag, .ext-label'), function (n) { n.remove(); });
    var oldOv = container.querySelector('.ext-overlay');
    if (oldOv) oldOv.remove();

    var tc = Themes.active().chart;
    var opt = inst.getOption();
    var dz = opt.dataZoom && opt.dataZoom[0];
    var st = dz ? (dz.start || 0) : 0, en = dz ? (dz.end || 100) : 100;
    var pr = getPlotRect(inst);
    var bx = pr ? pr.x : 0, by = pr ? pr.y : 0, bw = pr ? pr.w : (container.clientWidth || 800), bh = pr ? pr.h : (container.clientHeight || 300);

    var items = [];
    (opt.series || []).forEach(function (ser, si) {
      if (!ser || (ser.type !== 'line' && ser.type !== 'bar' && ser.type !== 'scatter')) return;
      var data = ser.data || [];
      var n = data.length;
      if (!n) return;
      var s0 = Math.floor(n * st / 100), e0 = Math.ceil(n * en / 100);
      if (e0 <= s0) e0 = Math.min(n, s0 + 1);
      var vals = [];
      for (var k = s0; k < e0; k++) {
        var raw = data[k];
        var v = (raw && typeof raw === 'object') ? raw.value : raw;
        if (v === null || v === undefined || isNaN(v)) continue;
        vals.push({ i: k, v: v });
      }
      if (!vals.length) return;
      var lastP = vals[vals.length - 1];
      var hiP = vals.reduce(function (a, b) { return b.v > a.v ? b : a; });
      var loP = vals.reduce(function (a, b) { return b.v < a.v ? b : a; });
      var c = (tc.series && tc.series[si % tc.series.length]) || tc.accent;
      var nSer = (opt.series || []).filter(function (x) { return x && x.type === 'line' || x.type === 'bar'; }).length || 1;
      function px(p) {
        try { var r = inst.convertToPixel({ seriesIndex: si }, [p.i, p.v]); return r ? [r[0], r[1]] : null; }
        catch (e) { return null; }
      }
      var sname = ser.name || '';
      var pLast = showLatest ? px(lastP) : null;
      if (pLast) items.push({ px: pLast[0], py: pLast[1], text: labelNum(lastP.v), color: c, kind: 'latest', pri: 1, seriesName: sname });
      if (state.labelMode === 'extreme' && vals.length > 3) {
        var pHi = px(hiP); if (pHi && hiP.i !== lastP.i) if (labelNum(hiP.v) !== labelNum(lastP.v)) items.push({ px: pHi[0], py: pHi[1], text: labelNum(hiP.v), color: '#B5484B', kind: 'max', pri: 2, seriesName: sname });
        var pLo = px(loP); if (pLo && loP.i !== lastP.i && loP.i !== hiP.i) if (labelNum(loP.v) !== labelNum(lastP.v) && labelNum(loP.v) !== labelNum(hiP.v)) items.push({ px: pLo[0], py: pLo[1], text: labelNum(loP.v), color: '#1E7A46', kind: 'min', pri: 3, seriesName: sname });
      }
    });
    if (!items.length) return;

    var overlay = document.createElement('div');
    overlay.className = 'ext-overlay';
    overlay.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:20;';
    container.appendChild(overlay);

    /* 依次放置：最新值优先，其次峰谷；冲突则换方向/移位 */
    items.sort(function (a, b) { return a.pri - b.pri; });
    var placed = [];
    function overlaps(x, y, w, h) {
      return placed.some(function (p) { return x < p.x + p.w + 3 && x + w + 3 > p.x && y < p.y + p.h + 2 && y + h + 2 > p.y; });
    }
    items.forEach(function (it) {
      var el2 = document.createElement('div');
      el2.className = 'last-tag';
      el2.dataset.kind = it.kind;
      el2.dataset.series = it.seriesName || '';
      el2.textContent = it.text;
      var nS = (opt.series || []).filter(function (x) { return x && (x.type === 'line' || x.type === 'bar'); }).length || 1;
      var fs = nS <= 2 ? 11.5 : (nS <= 4 ? 10 : (nS <= 6 ? 9 : 8));
      el2.style.cssText = 'position:absolute;pointer-events:none;background:transparent;color:' + it.color +
        ';font:800 ' + fs + 'px Inter,"PingFang SC",sans-serif;letter-spacing:.2px;padding:0 2px;white-space:nowrap;' +
        'text-shadow:0 0 3px #fff,0 0 5px #fff,0 0 8px #fff,0 0 10px #fff;';
      overlay.appendChild(el2);
      var lw = el2.offsetWidth || 44, lh = el2.offsetHeight || 14;

      var cand = [
        [it.px + 9, it.py - lh / 2],
        [it.px - lw - 9, it.py - lh / 2],
        [it.px - lw / 2, it.py - lh - 8],
        [it.px - lw / 2, it.py + 8],
        [it.px + 9, it.py - lh - 6],
        [it.px - lw - 9, it.py + 6]
      ];
      var pos = null;
      for (var ci = 0; ci < cand.length; ci++) {
        var cx = cand[ci][0], cy = cand[ci][1];
        if (cx < bx + 2 || cx + lw > bx + bw - 2 || cy < by + 2 || cy + lh > by + bh - 2) continue;
        if (overlaps(cx, cy, lw, lh)) continue;
        pos = [cx, cy]; break;
      }
      if (!pos) {
        /* 兜底：贴边收敛 */
        var fx = Math.min(Math.max(bx + 3, it.px + 9), bx + bw - lw - 3);
        var fy = Math.min(Math.max(by + 3, it.py - lh / 2), by + bh - lh - 3);
        pos = [fx, fy];
      }
      el2.style.left = Math.round(pos[0]) + 'px';
      el2.style.top = Math.round(pos[1]) + 'px';
      placed.push({ x: pos[0], y: pos[1], w: lw, h: lh });
    });
  }

  function renderAllValueLabels(inst) {
    var container = inst.getDom && inst.getDom();
    if (!container) return;
    var old = container.querySelector('.all-overlay');
    if (old) old.remove();
    var opt = inst.getOption();
    var dz = opt.dataZoom && opt.dataZoom[0];
    var st = dz ? (dz.start || 0) : 0, en = dz ? (dz.end || 100) : 100;
    var tc = Themes.active().chart;
    var series = opt.series || [];
    var total = 0;
    series.forEach(function (s) { total = Math.max(total, (s.data || []).length); });
    var visible = Math.max(1, Math.round(total * (en - st) / 100));
    var freq = state.dataFreq || '';
    var highFreq = freq === 'day';
    var W = container.clientWidth || 800;

    var picks = [];      // {px,py,val,color,series}
    series.forEach(function (ser, si) {
      if (ser.type && ['line', 'bar', 'area', 'step', 'scatter'].indexOf(ser.type) < 0) return;
      var data = ser.data || [];
      var n = data.length;
      if (!n) return;
      var s0 = Math.floor(n * st / 100), e0 = Math.ceil(n * en / 100);
      var idxs = [];
      if (visible <= 200) {
        for (var i = s0; i < e0; i++) idxs.push(i);          // 全部标注：逐点显示
      } else if (visible <= 600) {
        var step = Math.max(1, Math.ceil(visible / 120));
        for (var j = s0; j < e0; j += step) idxs.push(j);
      } else {
        if (!window.__allLabelToast) {
          window.__allLabelToast = 1;
          toast('当前区间 ' + visible + ' 个数据点，已按间隔抽样；缩小「区间」即可显示全部数值');
          setTimeout(function () { window.__allLabelToast = 0; }, 4000);
        }
        /* 日频 / 超密：每段只取高点与低点 */
        var buckets = Math.max(6, Math.min(20, Math.round(W / 60)));
        var span = Math.max(1, Math.floor((e0 - s0) / buckets));
        for (var b = 0; b < buckets; b++) {
          var bs = s0 + b * span, be = Math.min(e0, bs + span);
          if (be <= bs) break;
          var hiI = -1, loI = -1, hiV = -Infinity, loV = Infinity;
          for (var k = bs; k < be; k++) {
            var raw = data[k];
            var v = (raw && typeof raw === 'object') ? raw.value : raw;
            if (v === null || v === undefined || isNaN(v)) continue;
            if (v > hiV) { hiV = v; hiI = k; }
            if (v < loV) { loV = v; loI = k; }
          }
          if (hiI >= 0) idxs.push(hiI);
          if (loI >= 0 && loI !== hiI) idxs.push(loI);
        }
      }
      idxs.forEach(function (i) {
        var raw = data[i];
        var v = (raw && typeof raw === 'object') ? raw.value : raw;
        if (v === null || v === undefined || isNaN(v)) return;
        var px = null, py = null;
        try { px = inst.convertToPixel({ seriesIndex: si }, [i, v]); } catch (e) {}
        if (!px && typeof i === 'number') {
          try { px = inst.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [i, v]); } catch (e) {}
        }
        if (!px) return;
        picks.push({ px: px[0], py: px[1], val: v, color: (tc.series && tc.series[si % tc.series.length]) || tc.accent, si: si, sname: ser.name || '' });
      });
    });
    if (!picks.length) return;

    var overlay = document.createElement('div');
    overlay.className = 'all-overlay';
    overlay.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:19;';
    container.appendChild(overlay);

    /* 去重：同一系列同一 x 只留一个；不同系列保留（按系列纵向错开） */
    picks.sort(function (a, b) { return a.px - b.px; });
    var placed = [], seenKey = {}, lastXBySeries = {};
    picks.forEach(function (p) {
      var key = p.si + ':' + Math.round(p.px);
      if (seenKey[key]) return;
      var minGap = placed.length > 60 ? 8 : (placed.length > 30 ? 14 : 22);
      var lx0 = lastXBySeries[p.si];
      if (lx0 !== undefined && Math.abs(p.px - lx0) < minGap) return;
      seenKey[key] = 1;
      lastXBySeries[p.si] = p.px;
      placed.push(p);
    });

    var pr = getPlotRect(inst);
    var bx = pr ? pr.x : 0, by = pr ? pr.y : 0, bw = pr ? pr.w : (container.clientWidth || W), bh = pr ? pr.h : (container.clientHeight || 300);
    placed.forEach(function (p) {
      var el2 = document.createElement('div');
      el2.className = 'all-val';
      el2.dataset.series = p.sname || '';
      var txt = Math.abs(p.val) >= 1000 ? Number(p.val.toFixed(0)).toLocaleString('en-US') : (Math.round(p.val * 100) / 100);
      el2.textContent = txt;
      var lx = p.px, ly = p.py - 12 - p.si * 15;
      var many = placed.length > 40;
      el2.style.cssText = 'position:absolute;left:' + lx + 'px;top:' + ly + 'px;transform:translateX(-50%);' +
        'color:' + p.color + ';font:700 ' + (many ? 8.5 : 10.5) + 'px Inter,"PingFang SC",sans-serif;white-space:nowrap;' +
        'text-shadow:0 0 3px #fff,0 0 5px #fff,0 0 6px #fff;';
      overlay.appendChild(el2);
      var lw = el2.offsetWidth || 30, lh = el2.offsetHeight || 12;
      if (lx - lw / 2 < bx + 2) lx = bx + 2 + lw / 2;
      if (lx + lw / 2 > bx + bw - 2) lx = bx + bw - 2 - lw / 2;
      if (ly < by + 2) ly = by + 2;
      if (ly + lh > by + bh - 2) ly = by + bh - 2 - lh;
      el2.style.left = lx + 'px';
      el2.style.top = ly + 'px';
    });
  }

  function applyExtremeLabels(inst) {
    if (!inst) return;
    var container = inst.getDom && inst.getDom();
    if (!container) return;
    var old = container.querySelector('.ext-overlay');
    if (old) old.remove();
    var oldAll = container.querySelector('.all-overlay');
    if (oldAll) oldAll.remove();
    var mode = state.labelMode || 'off';
    var tc = Themes.active().chart;
    // 仅清除本功能自己开启的「全部数据」标签，不影响图表自带标签（如热力图数值）
    if (mode !== 'all' && inst._allLabels) {
      var o0 = inst.getOption();
      inst.setOption({ series: (o0.series || []).map(function () { return { label: { show: false } }; }) });
      inst._allLabels = false;
    }
    if (mode === 'off') return;
    if (mode === 'all') {
      renderAllValueLabels(inst);
      return;
    }
    var opt = inst.getOption();
    var dz = opt.dataZoom && opt.dataZoom[0];
    var start = dz ? (dz.start || 0) : 0, end = dz ? (dz.end || 100) : 100;
    var t = Themes.active().chart;

    var overlay = document.createElement('div');
    overlay.className = 'ext-overlay';
    overlay.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:20;';
    container.appendChild(overlay);
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');
    svg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;';
    overlay.appendChild(svg);
    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.appendChild(defs);

    var marks = [];
    (opt.series || []).forEach(function (series, si) {
      if (series.type !== 'line' && series.type !== 'bar') return;
      var data = series.data || [];
      var n = data.length;
      if (!n) return;
      var s = Math.floor(n * start / 100), e = Math.ceil(n * end / 100);
      if (e <= s) e = Math.min(n, s + 1);
      function valAt(i) { var v = data[i]; if (v === null || v === undefined) return null; return (typeof v === 'object') ? v.value : v; }
      var maxI = -1, minI = -1;
      for (var i = s; i < e; i++) { var v = valAt(i); if (v === null || isNaN(v)) continue; if (maxI < 0 || v > valAt(maxI)) maxI = i; if (minI < 0 || v < valAt(minI)) minI = i; }
      var lastI = e - 1;
      while (lastI >= s && (valAt(lastI) === null || isNaN(valAt(lastI)))) lastI--;
      if (maxI < 0 || minI < 0) return;
      var xAxis = opt.xAxis && opt.xAxis[0];
      function pxOf(i) {
        try { return inst.convertToPixel({ seriesIndex: si }, [i, valAt(i)]); }
        catch (err) { try { return inst.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [i, valAt(i)]); } catch (e2) { return null; } }
      }
      var name = series.name || ('指标' + (si + 1));
      var items = [];
      // 「最新值」已在右侧用固定标签展示，这里只标最高/最低，避免重叠
      if (maxI !== minI) { items.push({ i: maxI, kind: '最高', color: t.up }); items.push({ i: minI, kind: '最低', color: t.down }); }
      items.forEach(function (it) {
        var p = pxOf(it.i);
        if (!p) return;
        marks.push({ px: p[0], py: p[1], name: name, kind: it.kind, val: valAt(it.i), color: it.color, si: si, i: it.i });
      });
    });
    if (!marks.length) return;

    // 计算初始位置并做纵向去重（防遮挡）
    var labelsInfo = marks.map(function (m) {
      var shortName = m.name.length > 7 ? m.name.slice(0, 7) + '…' : m.name;
      var lx = m.px + 6, ly = m.py - 26;
      if (m.kind === '最低') { lx = m.px + 6; ly = m.py + 6; }
      else if (m.kind === '最新') { lx = m.px + 14; ly = m.py - 8; }
      ly -= m.si * 16;
      return { m: m, shortName: shortName, lx: lx, ly: ly };
    });
    labelsInfo.sort(function (a, b) { return a.ly - b.ly; });
    for (var li = 1; li < labelsInfo.length; li++) {
      var prev = labelsInfo[li - 1];
      if (Math.abs(labelsInfo[li].lx - prev.lx) < 130 && (labelsInfo[li].ly - prev.ly) < 22) {
        labelsInfo[li].ly = prev.ly + 22;
      }
    }

    var cw = container.clientWidth || 0, chh = container.clientHeight || 0;
    labelsInfo.forEach(function (info) {
      var m = info.m, lx = info.lx, ly = info.ly;
      var label = document.createElement('div');
      label.className = 'ext-label';
      label.dataset.series = m.name || '';
      label.dataset.idx = m.i;
      var txtColor = pickTextColor(m.color);
      var isHi = (m.kind === '最高');
      var lblColor = isHi ? '#B5484B' : '#1E7A46';
      label.style.cssText = 'position:absolute;left:' + lx + 'px;top:' + ly + 'px;pointer-events:none;cursor:default;background:transparent;color:' + lblColor + ';font:800 11.5px Inter,"PingFang SC",sans-serif;letter-spacing:.2px;padding:0 2px;white-space:nowrap;text-shadow:0 0 3px #fff,0 0 5px #fff,0 0 8px #fff,0 0 10px #fff;';
      label.textContent = fmtNum(m.val);
      overlay.appendChild(label);
      // 边界收敛：保证标签完整显示在图表内
      var lw = label.offsetWidth || 48, lh = label.offsetHeight || 18;
      var pr0 = getPlotRect(inst);
      var bx0 = pr0 ? pr0.x : 0, by0 = pr0 ? pr0.y : 0;
      var bw0 = pr0 ? pr0.w : cw, bh0 = pr0 ? pr0.h : chh;
      if (lx + lw > bx0 + bw0 - 3) lx = bx0 + bw0 - lw - 3;
      if (lx < bx0 + 3) lx = bx0 + 3;
      if (ly + lh > by0 + bh0 - 3) ly = by0 + bh0 - lh - 3;
      if (ly < by0 + 3) ly = by0 + 3;
      label.style.left = lx + 'px';
      label.style.top = ly + 'px';
      label.style.userSelect = 'none';
    });
  }

  function makeExtLabelDraggable(label, line) {
    label.addEventListener('mousedown', function (e) {
      e.preventDefault();
      var sx = e.clientX, sy = e.clientY;
      var ox = label.offsetLeft, oy = label.offsetTop;
      function onMove(ev) {
        var dx = ev.clientX - sx, dy = ev.clientY - sy;
        label.style.left = (ox + dx) + 'px';
        label.style.top = (oy + dy) + 'px';
        if (line) {
          line.setAttribute('x2', ox + dx + 3);
          line.setAttribute('y2', oy + dy + 10);
        }
      }
      function onUp() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  /* 取绘图区（坐标轴内部）范围，标注不得超出 */
  function getPlotRect(inst) {
    try {
      var gm = inst.getModel().getComponent('grid', 0);
      if (gm && gm.coordinateSystem) {
        var r = gm.coordinateSystem.getRect();
        if (r && r.width > 0 && r.height > 0) return { x: r.x, y: r.y, w: r.width, h: r.height };
      }
    } catch (e) {}
    return null;
  }

  /* 统一标注布局：限制在绘图区内 + 两两不重叠（不可拖动） */
  function layoutChartLabels(inst) {
    var container = inst && inst.getDom && inst.getDom();
    if (!container) return;
    var pr = getPlotRect(inst);
    var cw = container.clientWidth, ch = container.clientHeight;
    if (!cw || !ch) return;
    var bx = pr ? pr.x : 0, by = pr ? pr.y : 0;
    var bw = pr ? pr.w : cw, bh = pr ? pr.h : ch;
    var els = Array.prototype.slice.call(container.querySelectorAll('.ext-label, .last-tag'));
    if (!els.length) return;
    var placed = [];
    function collides(px, py, w, h) {
      for (var i = 0; i < placed.length; i++) {
        var p = placed[i];
        if (px < p.x + p.w + 3 && px + w + 3 > p.x && py < p.y + p.h + 3 && py + h + 3 > p.y) return true;
      }
      return false;
    }
    els.sort(function (a, b) { return (a.offsetTop - b.offsetTop) || (a.offsetLeft - b.offsetLeft); });
    els.forEach(function (el) {
      var w = el.offsetWidth || 50, h = el.offsetHeight || 18;
      var x = el.offsetLeft, y = el.offsetTop;
      x = Math.max(bx + 3, Math.min(x, bx + bw - w - 3));
      y = Math.max(by + 3, Math.min(y, by + bh - h - 3));
      var guard = 0;
      while (collides(x, y, w, h) && guard < 40) {
        y += h + 3;
        if (y + h > by + bh - 3) {
          y = by + 3;
          x = (x + w + 6 + w > bx + bw - 3) ? bx + 3 : x + w + 6;
        }
        guard++;
      }
      el.style.left = Math.round(x) + 'px';
      el.style.top = Math.round(y) + 'px';
      el.style.cursor = 'default';
      placed.push({ x: x, y: y, w: w, h: h });
    });
  }

  /* 最新值标签：每个系列各一个，右缘内、不越界、可拖动、自动错开 */
  function applyLastValueTag(inst) {
    if (state.labelMode === 'all') return;   // 全部标注模式由另一层接管
    renderValueLabels(inst);
    return;
  }

  function _legacyLastTag(inst) {
    var _cont = inst && inst.getDom && inst.getDom();
    if (_cont) { var _old = _cont.querySelectorAll('.last-tag'); for (var _k = 0; _k < _old.length; _k++) _old[_k].remove(); }
    if (state.labelMode && state.labelMode !== 'off') return;   // 已有数据标注，避免重复
    var _tsTypes = ['line', 'area', 'stacked', 'stackedLine', 'step', 'dual', 'dualLine', 'season'];
    var _curType = '';
    try { var _oo = inst.getOption(); _curType = (_oo.series && _oo.series[0] && _oo.series[0].type) || ''; } catch (e) {}
    if (state.mode === 'imported' && _curType === 'bar' && state.mapping && _tsTypes.indexOf(state.mapping.chartType) < 0) return;
    if (state.mode === 'imported' && state.mapping && _tsTypes.indexOf(state.mapping.chartType) < 0) return;
    if (!inst) return;
    var container = inst.getDom && inst.getDom();
    if (!container) return;
    Array.prototype.forEach.call(container.querySelectorAll('.last-tag'), function (t) { t.remove(); });
    var opt = inst.getOption();
    var all = opt.series || [];
    var theme = Themes.active().chart;
    var cw = container.clientWidth, chh = container.clientHeight;
    var placed = [];
    var count = 0;
    function overlaps(x, y, w, h) {
      for (var k = 0; k < placed.length; k++) {
        var q = placed[k];
        if (x < q.x + q.w + 2 && x + w + 2 > q.x && y < q.y + q.h + 2 && y + h + 2 > q.y) return true;
      }
      return false;
    }
    all.forEach(function (s, si) {
      if (!s || (s.type !== 'line' && s.type !== 'bar')) return;
      if (!s.data || !s.data.length) return;
      if (count >= 6) return;
      var data = s.data, li = -1, lv = null;
      for (var i = data.length - 1; i >= 0; i--) {
        var v = data[i];
        if (v === null || v === undefined || isNaN(v)) continue;
        li = i; lv = v; break;
      }
      if (li < 0) return;
      // 该点已有「最高/最低」极值标注 → 不再重复显示最新值
      var dupMark = Array.prototype.some.call(container.querySelectorAll('.ext-label'), function (el) {
        return (el.dataset.series || '') === (s.name || '') && String(el.dataset.idx) === String(li);
      });
      if (dupMark) return;
      var p = null;
      try { p = inst.convertToPixel({ seriesIndex: si }, [li, lv]); } catch (e) { return; }
      if (!p) return;
      var color = (s.itemStyle && s.itemStyle.color) || s.color || (theme.series && theme.series[si % theme.series.length]) || theme.accent;
      if (typeof color !== 'string') color = theme.accent;
      var tag = document.createElement('div');
      tag.className = 'last-tag';
      tag.dataset.series = s.name || '';
      tag.title = '最新值';
      tag.style.cssText = 'position:absolute;pointer-events:none;cursor:default;background:transparent;color:' + color +
        ';font:800 11.5px Inter,"PingFang SC",sans-serif;letter-spacing:.2px;padding:0 2px;white-space:nowrap;' +
        'text-shadow:0 0 3px #fff,0 0 5px #fff,0 0 8px #fff,0 0 10px #fff;z-index:21;';
      tag.textContent = fmtNum(lv);
      container.appendChild(tag);
      var tw = tag.offsetWidth || 54, th = tag.offsetHeight || 18;
      var prt = getPlotRect(inst);
      var bxt = prt ? prt.x : 0, byt = prt ? prt.y : 0;
      var bwt = prt ? prt.w : cw, bht = prt ? prt.h : chh;
      var tx = p[0] + 9;
      if (tx + tw > bxt + bwt - 3) tx = p[0] - tw - 9;
      if (tx + tw > bxt + bwt - 3) tx = bxt + bwt - tw - 3;
      if (tx < bxt + 3) tx = bxt + 3;
      var ty = p[1] - th / 2;
      if (ty < byt + 3) ty = byt + 3;
      if (ty + th > byt + bht - 3) ty = byt + bht - th - 3;
      // 纵向错开，避免互相重叠
      var guard = 0;
      while (overlaps(tx, ty, tw, th) && guard < 24) { ty += th + 3; if (ty + th > chh - 6) { ty = Math.max(6, p[1] - th / 2 - (guard + 1) * (th + 3)); } guard++; }
      tag.style.left = tx + 'px';
      tag.style.top = ty + 'px';

      placed.push({ x: tx, y: ty, w: tw, h: th });
      count++;
    });
  }



  /* ---------- 通用悬浮提示（哑铃图 / 平行坐标共用） ---------- */
  function makeHoverTip(dom) {
    if (getComputedStyle(dom).position === 'static') dom.style.position = 'relative';
    var tip = document.createElement('div');
    tip.className = 'adv-hover-tip';
    tip.style.cssText = 'position:absolute;pointer-events:none;opacity:0;transition:opacity .1s;' +
      'background:#fff;border:1px solid rgba(26,26,46,.12);border-radius:8px;padding:8px 10px;' +
      'font:11.5px/1.65 Inter,"PingFang SC",sans-serif;color:#051C2C;' +
      'box-shadow:0 8px 24px rgba(20,20,35,.14);z-index:30;white-space:nowrap;';
    dom.appendChild(tip);
    return {
      el: tip,
      show: function (html, mx, my) {
        /* 提示内容里有来自用户数据的名字（哑铃图行名、平行坐标维度名），统一过白名单 */
        tip.innerHTML = window.ADV_SANITIZE ? window.ADV_SANITIZE(html) : html;
        tip.style.opacity = 1;
        var w = tip.offsetWidth, h = tip.offsetHeight;
        var lx = mx + 16, ly = my - h - 12;
        if (lx + w > dom.clientWidth - 6) lx = mx - w - 16;
        if (ly < 4) ly = my + 16;
        tip.style.left = Math.max(4, lx) + 'px';
        tip.style.top = Math.min(dom.clientHeight - h - 4, Math.max(4, ly)) + 'px';
      },
      hide: function () { tip.style.opacity = 0; }
    };
  }

  /* ---------- 哑铃图：整行悬浮高亮 + 数值提示 ---------- */
  function attachDumbbellHover(inst, data) {
    if (!inst || inst._dumbbellBound || !data || !data.rows) return;
    inst._dumbbellBound = true;
    var zr = inst.getZr(), dom = inst.getDom();
    var tip = makeHoverTip(dom);
    var rows = data.rows.slice().sort(function (a, b) { return (b.to - b.from) - (a.to - a.from); });
    var chartTheme = Themes.active().chart;
    var up = chartTheme.up || '#1E7A46';
    var down = chartTheme.down || '#C0392B';
    var hl = null, lastIdx = -2;

    /* 类目轴几何：默认第一项在底部，按等分带计算每行位置 */
    function geom() {
      var o = inst.getOption();
      var g = (o.grid && o.grid[0]) || {};
      var W = inst.getWidth(), H = inst.getHeight();
      var px = function (v, total, dflt) {
        if (typeof v === 'number') return v;
        if (typeof v === 'string' && v.indexOf('%') >= 0) return parseFloat(v) / 100 * total;
        return dflt;
      };
      var left = px(g.left, W, 72), right = px(g.right, W, 64);
      var top = px(g.top, H, 30), bottom = px(g.bottom, H, 18);
      var n = rows.length || 1;
      var plotTop = top, plotBottom = H - bottom;
      /* 类目轴是否反序（第一项在顶部） */
      var inv = !!(o.yAxis && o.yAxis[0] && o.yAxis[0].inverse);
      return { left: left, right: W - right, plotTop: plotTop, plotBottom: plotBottom,
        bandH: (plotBottom - plotTop) / n, W: W, H: H, inv: inv };
    }
    function idxAt(y) {
      var gg = geom();
      if (y < gg.plotTop - 2 || y > gg.plotBottom + 2) return -1;
      var fromTop = Math.floor((y - gg.plotTop) / gg.bandH);
      var idx = gg.inv ? fromTop : (rows.length - 1 - fromTop);
      return Math.max(0, Math.min(rows.length - 1, idx));
    }
    function hide() {
      lastIdx = -2;
      tip.hide();
      if (hl) { try { zr.remove(hl); } catch (e) {} hl = null; }
    }
    zr.on('mousemove', function (e) {
      var gg = geom();
      var idx = idxAt(e.offsetY);
      if (idx < 0) { hide(); return; }
      var r = rows[idx];
      var dv = r.to - r.from;
      var col = dv >= 0 ? up : down;
      if (idx !== lastIdx) {
        lastIdx = idx;
        try {
          if (hl) zr.remove(hl);
          var fromTop = gg.inv ? idx : (rows.length - 1 - idx);
          hl = new echarts.graphic.Rect({
            silent: true, z: 1,
            shape: { x: gg.left - 6, y: gg.plotTop + fromTop * gg.bandH + 1,
              width: Math.max(40, gg.right - gg.left + 12), height: Math.max(8, gg.bandH - 2) },
            style: { fill: ChartFactory.hexToRgba((chartTheme.text || '#051C2C'), 0.05), r: 5 }
          });
          zr.add(hl);
        } catch (err) {}
      }
      tip.show('<b>' + r.name + '</b><br/>' +
        (data.fromLabel || '起始') + '　' + fmtNum(r.from) + '<br/>' +
        (data.toLabel || '当前') + '　' + fmtNum(r.to) + '<br/>' +
        '变化　<b style="color:' + col + '">' + (dv >= 0 ? '+' : '') + (Math.round(dv * 10) / 10) + '</b>',
        e.offsetX, e.offsetY);
    });
    zr.on('globalout', hide);
  }

  /* ---------- 平行坐标：按几何位置找最近的样本线，高亮并显示各维数值 ---------- */
  function attachParallelHover(inst, data) {
    if (!inst || inst._parallelBound || !data || !data.rows) return;
    inst._parallelBound = true;
    var zr = inst.getZr(), dom = inst.getDom();
    var tip = makeHoverTip(dom);
    var dims = data.dims || [];
    var rows = data.rows || [];
    var n = dims.length;
    var focus = -1;

    function axes() {
      var o = inst.getOption();
      var pp = (o.parallel && o.parallel[0]) || {};
      var W = inst.getWidth(), H = inst.getHeight();
      function px(v, total) {
        if (typeof v === 'number') return v;
        if (typeof v === 'string' && v.indexOf('%') >= 0) return parseFloat(v) / 100 * total;
        return 0;
      }
      var left = px(pp.left, W) || 44, right = px(pp.right, W) || 40;
      var top = px(pp.top, H) || 56, bottom = px(pp.bottom, H) || 28;
      var pas = o.parallelAxis || [];
      var info = pas.map(function (a, k) {
        var vals = rows.map(function (r) { return r.values[k]; });
        var mn = (a.min !== undefined && a.min !== null) ? a.min : Math.min.apply(null, vals);
        var mx = (a.max !== undefined && a.max !== null) ? a.max : Math.max.apply(null, vals);
        return { min: mn, max: mx };
      });
      var spanX = (W - left - right) / Math.max(1, n - 1);
      var box = (H - top - bottom);
      function xOf(k) { return left + k * spanX; }
      function yOf(k, v) {
        var it = info[k] || { min: 0, max: 1 };
        var t = (v - it.min) / ((it.max - it.min) || 1);
        return top + (1 - Math.max(0, Math.min(1, t))) * box;
      }
      return { xOf: xOf, yOf: yOf, top: top, bottom: top + box, left: left, right: W - right };
    }

    function hide() {
      tip.hide();
      if (focus >= 0) {
        try {
          var o = inst.getOption();
          inst.setOption({ series: o.series.map(function (sr, i) {
            return { lineStyle: { opacity: (i === focus) ? 1 : 0.55, width: (i === focus) ? 3 : 1.5 } };
          }) });
        } catch (e) {}
        focus = -1;
      }
    }

    zr.on('mousemove', function (e) {
      var g = axes();
      var mx = e.offsetX, my = e.offsetY;
      if (mx < g.left - 30 || mx > g.right + 30 || my < g.top - 40 || my > g.bottom + 20) { hide(); return; }
      var best = -1, bestD = 16;
      rows.forEach(function (r, i) {
        for (var k = 0; k < n - 1; k++) {
          var x1 = g.xOf(k), x2 = g.xOf(k + 1);
          if (mx < x1 - 2 || mx > x2 + 2) continue;
          var y1 = g.yOf(k, r.values[k]), y2 = g.yOf(k + 1, r.values[k + 1]);
          var t = (x2 === x1) ? 0 : (mx - x1) / (x2 - x1);
          var y = y1 + (y2 - y1) * t;
          var d = Math.abs(y - my);
          if (d < bestD) { bestD = d; best = i; }
        }
      });
      if (best < 0) { hide(); return; }
      if (best !== focus) {
        focus = best;
        try {
          inst.setOption({ series: rows.map(function (sr, i) {
            return { lineStyle: { opacity: (i === focus) ? 1 : 0.18, width: (i === focus) ? 3.2 : 1.4 } };
          }) });
        } catch (err) {}
      }
      var r = rows[best];
      var lines = dims.map(function (nm, k) {
        return '<span style="color:#8A8F98">' + nm + '</span>　<b>' + fmtNum(r.values[k]) + '</b>';
      }).join('<br/>');
      tip.show('<b>' + r.name + '</b><br/>' + lines, mx, my);
    });
    zr.on('globalout', hide);
  }

  /* ---------- 雷达图：悬停高亮（按指标轴 + 按月份曲线） ---------- */
  function attachRadarHover(inst, radarData) {
    if (!inst || inst._radarBound || !radarData || !radarData.indicators) return;
    inst._radarBound = true;
    var zr = inst.getZr();
    var dom = inst.getDom();
    if (getComputedStyle(dom).position === 'static') dom.style.position = 'relative';
    var n = radarData.indicators.length;
    var seriesNames = radarData.series.map(function (x) { return x.name; });
    var tip = document.createElement('div');
    tip.className = 'radar-tip';
    tip.style.cssText = 'position:absolute;pointer-events:none;opacity:0;transition:opacity .1s;background:#fff;' +
      'border:1px solid rgba(26,26,46,.12);border-radius:8px;padding:8px 10px;font:11.5px/1.6 Inter,"PingFang SC",sans-serif;' +
      'color:#051C2C;box-shadow:0 8px 24px rgba(20,20,35,.14);z-index:30;white-space:nowrap;';
    dom.appendChild(tip);
    var mark = null;

    function geom() {
      var opt = inst.getOption();
      var rd = opt.radar && opt.radar[0];
      if (!rd) return null;
      var W = inst.getWidth(), H = inst.getHeight();
      function pct(v, base) { return typeof v === 'string' && v.indexOf('%') >= 0 ? parseFloat(v) / 100 * base : (typeof v === 'number' ? v : null); }
      var cx = pct(rd.center[0], W), cy = pct(rd.center[1], H);
      var rv = rd.radius, R;
      if (typeof rv === 'string' && rv.indexOf('%') >= 0) R = parseFloat(rv) / 100 * Math.min(W, H) / 2;
      else if (Array.isArray(rv)) R = pct(rv[1], Math.min(W, H) / 2);
      else R = pct(rv, Math.min(W, H) / 2) || Math.min(W, H) * 0.3;
      return { cx: cx, cy: cy, R: R };
    }

    zr.on('mousemove', function (e) {
      var g = geom();
      if (!g) return;
      var dx = e.offsetX - g.cx, dy = e.offsetY - g.cy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < g.R * 0.12 || dist > g.R * 1.35) { hide(); return; }
      var ang = Math.atan2(dy, dx) + Math.PI / 2;
      if (ang < 0) ang += Math.PI * 2;
      var step = Math.PI * 2 / n;
      var idx = Math.round(ang / step) % n;
      show(idx, e.offsetX, e.offsetY);
    });
    zr.on('globalout', hide);

    function show(idx, mx, my) {
      var g = geom();
      if (!g) return;
      var ang = -Math.PI / 2 + idx * (Math.PI * 2 / n);
      var x2 = g.cx + Math.cos(ang) * g.R * 1.02, y2 = g.cy + Math.sin(ang) * g.R * 1.02;
      if (!mark) {
        mark = new echarts.graphic.Line({ silent: true,
          shape: { x1: g.cx, y1: g.cy, x2: x2, y2: y2 },
          style: { stroke: '#B5484B', lineWidth: 1.4, lineDash: [3, 3] }, z: 30 });
        zr.add(mark);
      }
      mark.setShape({ x1: g.cx, y1: g.cy, x2: x2, y2: y2 });
      var name = radarData.indicators[idx].name;
      var rows = radarData.series.map(function (sr, si) {
        return '<span style="display:inline-block;width:7px;height:7px;border-radius:2px;background:' +
          ((Themes.active().chart.series || [])[si % 3] || '#051C2C') + ';margin-right:5px"></span>' +
          sr.name + ' <b style="float:right;margin-left:14px">' + (sr.values[idx] == null ? '—' : Number(sr.values[idx]).toFixed(1)) + '</b>';
      }).join('<br/>');
      tip.innerHTML = '<div style="font-weight:800;margin-bottom:4px;color:#B5484B">' + escHtml(name) + '</div>' + rows;
      tip.style.opacity = 1;
      var w = tip.offsetWidth, h = tip.offsetHeight;
      var lx = mx + 16, ly = my - h / 2;
      if (lx + w > inst.getWidth() - 6) lx = mx - w - 16;
      if (ly < 4) ly = 4;
      tip.style.left = Math.max(4, lx) + 'px';
      tip.style.top = ly + 'px';
    }
    function hide() {
      if (mark) { zr.remove(mark); mark = null; }
      tip.style.opacity = 0;
    }
  }

  /* 图例点击：聚焦某条指标，其余变暗（不隐藏），再次点击恢复 */
  function applySeriesFocus(inst, focusName) {
    var opt = inst.getOption();
    var series = opt.series || [];
    if (!series.length) return;
    var theme = Themes.active().chart;
    inst.setOption({
      series: series.map(function (s) {
        var on = (!focusName || s.name === focusName);
        var patch = {
          lineStyle: Object.assign({}, s.lineStyle, { opacity: on ? 1 : 0.18 }),
          itemStyle: Object.assign({}, s.itemStyle, { opacity: on ? 1 : 0.18 })
        };
        // 只有本来就是面积图才调 areaStyle，避免给折线图凭空加面积填充
        if (s.areaStyle) patch.areaStyle = Object.assign({}, s.areaStyle, { opacity: on ? 1 : 0.06 });
        return patch;
      })
    }, false);
    // 提示框里的数据也同步变暗
    inst.setOption({
      tooltip: {
        formatter: function (params) {
          if (!params || !params.length) return '';
          var html = '<div style="font-size:11px;color:' + theme.muted + ';margin-bottom:4px">' + params[0].axisValue + '</div>';
          params.forEach(function (p) {
            var on = (!focusName || p.seriesName === focusName);
            var val = (p.value === null || p.value === undefined || isNaN(p.value)) ? '—' : fmtNum(p.value);
            html += '<div style="opacity:' + (on ? 1 : 0.28) + ';display:flex;justify-content:space-between;gap:14px;line-height:1.7">' +
              '<span>' + (p.marker || '') + p.seriesName + '</span><b>' + val + '</b></div>';
          });
          return html;
        }
      }
    }, false);
  }

  /* 统一：把标注按聚焦系列调暗/恢复 */
  function dimLabelsTo(inst, name) {
    var container = inst && inst.getDom && inst.getDom();
    if (!container) return;
    Array.prototype.forEach.call(container.querySelectorAll('.ext-label, .last-tag, .all-val'), function (el) {
      var sname = el.dataset && el.dataset.series;
      var on = (!name || !sname || sname === name);
      el.style.opacity = on ? '1' : '0.18';
      el.style.filter = on ? '' : 'grayscale(0.7)';
    });
  }

  /* 悬停某条指标时，其他指标的标注（极值/最新值）同步变暗
     —— ECharts 的 mouseover 只在鼠标精确压线时触发，这里改用「鼠标位置找最近指标」 */
  function bindAnnoFocus(inst) {
    if (!inst || inst._annoBound) return;
    inst._annoBound = true;
    var container = inst.getDom && inst.getDom();
    if (!container) return;
    var last = '__init__';
    function dimAll(name) {
      if (name === last) return;
      last = name;
      dimLabelsTo(inst, name);
      applyHoverFocus(inst, name);
    }
    function idle() { return inst._focusName || null; }
    inst.getZr().on('mousemove', function (e) {
      var opt = inst.getOption();
      var series = opt.series || [];
      if (series.length < 2) { dimAll(idle()); return; }
      var pt = null;
      try { pt = inst.convertFromPixel({ gridIndex: 0 }, [e.offsetX, e.offsetY]); } catch (err) { pt = null; }
      if (!pt || pt[0] === null || pt[0] === undefined || isNaN(pt[0])) { dimAll(idle()); return; }
      var idx = Math.round(pt[0]);
      var best = null, bestDist = Infinity;
      series.forEach(function (sr, si) {
        if (!sr || !sr.data || sr.type === 'pie' || sr.type === 'sankey' || sr.type === 'graph') return;
        var v = sr.data[idx];
        if (v === null || v === undefined || isNaN(v)) return;
        var probe = (sr.type === 'bar') ? v / 2 : v;
        var px = null;
        try { px = inst.convertToPixel({ seriesIndex: si }, [idx, probe]); } catch (err) { return; }
        if (!px) return;
        var d = Math.abs(px[1] - e.offsetY);
        if (d < bestDist) { bestDist = d; best = sr.name; }
      });
      dimAll(bestDist <= 70 ? best : idle());
    });
    inst.getZr().on('globalout', function () { dimAll(idle()); });
    inst.on('mouseover', function (p) { if (p && p.seriesName) dimAll(p.seriesName); });
  }

  /* hover 时给非聚焦系列降低不透明度（与 legend 聚焦一致，但不改 tooltip） */
  function applyHoverFocus(inst, focusName) {
    var opt = inst.getOption();
    var series = opt.series || [];
    if (series.length < 2) return;
    try {
      inst.setOption({
        series: series.map(function (s) {
          var on = (!focusName || s.name === focusName);
          var patch = {
            lineStyle: Object.assign({}, s.lineStyle, { opacity: on ? 1 : 0.2 }),
            itemStyle: Object.assign({}, s.itemStyle, { opacity: on ? 1 : 0.2 })
          };
          if (s.areaStyle) patch.areaStyle = Object.assign({}, s.areaStyle, { opacity: on ? 1 : 0.05 });
          return patch;
        })
      }, false);
    } catch (e) {}
  }

  function bindFocusLegend(inst) {
    if (!inst || inst._focusBound) return;
    inst._focusBound = true;
    inst.on('legendselectchanged', function (params) {
      var name = params.name;
      inst._focusName = (inst._focusName === name) ? null : name;
      try { inst.dispatchAction({ type: 'legendAllSelect' }); } catch (e) {}
      applySeriesFocus(inst, inst._focusName);
      dimLabelsTo(inst, inst._focusName);
      applyLastValueTag(inst);
    });
  }

  function attachExtremeLabels(inst) {
    if (!inst) return;
    /* D3 定制渲染返回的是 shim，没有 zrender 相关方法 */
    if (typeof inst.getZr !== 'function') return;
    applyExtremeLabels(inst);
    applyLastValueTag(inst);
    layoutChartLabels(inst);
    bindFocusLegend(inst);
    bindAnnoFocus(inst);
    if (inst._extBound) return;
    inst._extBound = true;
    inst.on('datazoom', function () { applyExtremeLabels(inst); applyLastValueTag(inst); });
  }

  function attachPriceAnnotationHandler(inst, container) {
    if (!inst || !inst.chart || !container || container._annotBound) return;
    container._annotBound = true;
    container.addEventListener('click', function (ev) {
      if (!state.annotateMode) return;
      var rect = container.getBoundingClientRect();
      var x = ev.clientX - rect.left;
      var time = null;
      try { time = inst.chart.timeScale().coordinateToTime(x); } catch (e) {}
      if (!time) { toast('请点击K线区域'); return; }
      showAnnotationInput(x, ev.clientY - rect.top, function (text) {
        var list = state.annotations[state.viewKey] || (state.annotations[state.viewKey] = []);
        list.push({ time: time, text: text });
        rerender();
        toast('已添加说明');
      });
    });
  }

  function applyPriceAnnotations(inst) {
    if (!inst || !inst.candle || !inst.candle.setMarkers) return;
    var list = priceAnnotations(state.viewKey);
    var theme = getChartTheme();
    try {
      inst.candle.setMarkers(list.map(function (a) {
        return { time: a.time, position: 'aboveBar', color: theme.accent, shape: 'circle', text: a.text };
      }));
    } catch (e) {}
  }

  function showAnnotationInput(px, py, cb) {
    var stage = el('chart-stage');
    var wrap = document.createElement('div');
    wrap.className = 'annot-input-wrap';
    var w = 236;
    wrap.style.left = Math.max(4, Math.min(px, stage.clientWidth - w)) + 'px';
    wrap.style.top = Math.max(4, py - 42) + 'px';
    wrap.style.width = w + 'px';
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'annot-input';
    input.placeholder = '输入说明文字，回车确认';
    wrap.appendChild(input);
    stage.appendChild(wrap);
    input.focus();
    var closed = false;
    function close() { if (!closed) { closed = true; wrap.remove(); } }
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { var t = input.value.trim(); close(); if (t) cb(t); }
      else if (ev.key === 'Escape') { close(); }
    });
    input.addEventListener('blur', function () { setTimeout(close, 120); });
  }

  /* ---------- 首页 / 使用说明 ---------- */
  /* AI 画图示例（等价于 Agent 调用 make_chart 生成的结果） */
  function showExampleChart() {
    var cfg = {
      type: 'area', viewKey: 'example', theme: 'paper',
      title: 'AI 示例 · 全球主要经济体 GDP 增速', subtitle: '对 AI 说一句话即可生成这样的图', unit: '%',
      labels: ['2019', '2020', '2021', '2022', '2023', '2024', '2025'],
      series: [
        { name: '中国', values: [6.0, 2.2, 8.4, 3.0, 5.2, 5.0, 5.0] },
        { name: '美国', values: [2.5, -2.2, 5.7, 2.1, 2.5, 2.8, 2.4] },
        { name: '欧元区', values: [1.6, -6.1, 5.4, 3.5, 0.4, 0.8, 1.2] },
        { name: '日本', values: [-0.4, -4.2, 2.6, 1.0, 1.9, 0.3, 1.1] }
      ]
    };
    applyChartConfig(cfg);
    showBack(function () { renderHome(); });
  }

  /* 同步 <select> 里带 data-i18n-opt 的选项文字 */
  function syncSelectI18n() {
    document.querySelectorAll('option[data-i18n-opt]').forEach(function (op) {
      op.textContent = DT(op.getAttribute('data-i18n-opt'));
    });
    document.querySelectorAll('#theme-select option').forEach(function (op) {
      if (op.dataset.zh) op.textContent = isEn() ? (op.dataset.en || op.dataset.zh) : op.dataset.zh;
    });
  }


  /* ---------- 数据按需加载：首屏只加载界面，数据用到时再拉 ---------- */

  /* ---------- 第三方库按需加载 + 空闲预取 ---------- */
  var LIB_SRC = {
    echarts: 'vendor/echarts.min.js',
    worldmap: 'vendor/world-map.js',
    xlsx: 'vendor/xlsx.full.min.js',
    lightweight: 'vendor/lightweight-charts.standalone.production.js',
    d3: 'vendor/d3.v7.min.js'
  };
  var _libPromise = {};

  function loadLib(key) {
    if (key === 'echarts' && window.echarts) return Promise.resolve(window.echarts);
    if (key === 'xlsx' && window.XLSX) return Promise.resolve(window.XLSX);
    if (key === 'lightweight' && window.LightweightCharts) return Promise.resolve(window.LightweightCharts);
    if (key === 'worldmap' && window.WORLD_GEOJSON) return Promise.resolve(window.WORLD_GEOJSON);
    if (key === 'd3' && window.d3) return Promise.resolve(window.d3);
    if (_libPromise[key]) return _libPromise[key];
    _libPromise[key] = new Promise(function (resolve, reject) {
      var sc = document.createElement('script');
      sc.src = LIB_SRC[key];
      sc.async = true;
      sc.onload = function () {
        if (key === 'worldmap') {
          try { if (window.WORLD_GEOJSON) echarts.registerMap('world', window.WORLD_GEOJSON); } catch (e) {}
          resolve(window.WORLD_GEOJSON);
        } else resolve();
      };
      sc.onerror = function () { delete _libPromise[key]; reject(new Error(key)); };
      document.head.appendChild(sc);
    });
    return _libPromise[key];
  }

  function ensureCharts() { return loadLib('echarts'); }
  function ensureWorldMap() {
    return loadLib('echarts').then(function () { return loadLib('worldmap'); });
  }
  function ensureXLSX() { return loadLib('xlsx'); }
  function ensureLightweight() { return loadLib('lightweight'); }
  function ensureD3() { return loadLib('d3'); }
  var SHOWCASE_TYPES = { scForce: 1, scChord: 1, scRadialTree: 1, scHexbin: 1, scGlowLine: 1, scWaterfall: 1, archDiagram: 1 };

  function withCharts(fn) {
    if (window.echarts) { fn(); return; }
    var stage = el('chart-stage');
    if (stage) stage.innerHTML = '<div class="stage-loading"><span class="stage-spinner"></span><span>' + tr('正在加载绘图引擎…', 'Loading chart engine…') + '</span></div>';
    ensureCharts().then(fn).catch(function (err) {
      if (window.console && console.error) console.error('[ADV] chart render failed', err);
      if (stage) stage.innerHTML = '<div class="stage-loading"><span>' + tr('图表渲染失败，请刷新重试', 'Chart failed to render. Please refresh.') + '</span></div>';
    });
  }

  /* 空闲时预取，用户点分类时基本已就绪 */
  /* 首屏不预取绘图引擎（echarts 331KB + world-map 282KB 会拖慢首页）；
     改为用户有「要看图」的意图时再加载 */
  function prefetchLibs() {
    var fired = false;
    var warm = function () {
      if (fired) return;
      fired = true;
      ensureCharts().catch(function () {});
    };
    document.addEventListener('mouseover', function (e) {
      var t = e.target;
      if (!t) return;
      if (t.closest && (t.closest('#sidebar .nav-item') || t.closest('.home-goal') ||
          t.closest('.home-cta') || t.closest('#btn-import'))) warm();
    }, { passive: true });
    document.addEventListener('touchstart', function (e) {
      var t = e.target;
      if (t && t.closest && (t.closest('#sidebar .nav-item') || t.closest('#btn-import'))) warm();
    }, { passive: true });
  }

  var GEO_TYPES = { choropleth: 1, symbolMap: 1, heatMapGeo: 1, trajectory: 1, migration: 1, flowMap: 1, hexMap: 1, worldMap: 1 };

  var DATA_SRC = { china: 'js/china-macro.js', intl: 'js/intl-macro.js', financeIndex: 'js/finance-index.js', akshare: 'js/akshare-data.js' };
  /* 金融数据按板块拆分：进哪个板块才加载哪个（首屏从 5.4MB 降到 ~460KB） */
  var FIN_SECTIONS = {};
  var FIN_LOADING = {};
  function finSectionSrc(key) { return 'js/finance-' + key + '.js'; }
  var DATA_GLOBAL = { china: 'CHINA_MACRO', intl: 'INTL_MACRO', financeIndex: 'FINANCE_INDEX', akshare: 'AKSHARE_DATA' };
  var DATA_LABEL = { china: '中国宏观数据', intl: '国际宏观数据', financeIndex: '金融资产', akshare: '行情数据' };
  var _dataLoading = {};

  function dataReady(k) { return !!window[DATA_GLOBAL[k]]; }


  /* ---------- 金融数据：压缩编码还原 + 按板块懒加载 ---------- */
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function ymdToISO(d) {
    return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
  }
  function yymmddToDate(t) {
    return new Date(Date.UTC(2000 + parseInt(t.slice(0, 2), 10), parseInt(t.slice(2, 4), 10) - 1, parseInt(t.slice(4, 6), 10)));
  }
  function decodeFinLabels(it) {
    if (it._labels) return it._labels;
    var out = [];
    if (it.labels) out = it.labels.slice();
    else if (it.dt) { for (var i = 0; i + 6 <= it.dt.length; i += 6) out.push(it.dt.slice(i, i + 6)); }
    else if (it.ds) {
      var t = it.ds.slice(0, 6), d = yymmddToDate(t);
      out.push(ymdToISO(d));
      for (var k = 6; k < it.ds.length; k++) {
        d = new Date(d.getTime() + parseInt(it.ds[k], 36) * 86400000);
        out.push(ymdToISO(d));
      }
      it._labels = out;
      return out;
    }
    /* YYMMDD → YYYY-MM-DD */
    out = out.map(function (x) {
      var str = String(x);
      return /^\d{6}$/.test(str) ? '20' + str.slice(0, 2) + '-' + str.slice(2, 4) + '-' + str.slice(4, 6) : str;
    });
    it._labels = out;
    return out;
  }
  function normalizeFinItem(it) {
    if (!it || it._ready) return it;
    it.labels = decodeFinLabels(it);
    it.series = (it.series || []).map(function (s) {
      return { name: s.name || it.title, values: (s.values || []).slice() };
    });
    it._ready = true;
    return it;
  }
  function finSection(key) {
    var sec = (window.FINANCE_SECTIONS || {})[key];
    if (!sec) return null;
    if (!sec._ready) { (sec.items || []).forEach(normalizeFinItem); sec._ready = true; }
    return sec;
  }
  function loadFinanceSection(key) {
    if (FIN_SECTIONS[key] && FIN_SECTIONS[key].loaded) return Promise.resolve(FIN_SECTIONS[key].data);
    if (FIN_LOADING[key]) return FIN_LOADING[key];
    FIN_LOADING[key] = new Promise(function (resolve, reject) {
      var sc = document.createElement('script');
      sc.src = finSectionSrc(key);
      sc.async = true;
      sc.onload = function () {
        var sec = finSection(key);
        if (!sec) { delete FIN_LOADING[key]; reject(new Error(key)); return; }
        FIN_SECTIONS[key] = { loaded: true, data: sec };
        try { if (typeof hydrateSamples === 'function') hydrateSamples(); } catch (e) {}
        resolve(sec);
      };
      sc.onerror = function () { delete FIN_LOADING[key]; reject(new Error(key)); };
      document.head.appendChild(sc);
    });
    return FIN_LOADING[key];
  }
  function finIndex() { return window.FINANCE_INDEX || { updated: '', sections: [] }; }
  /* 已加载的金融条目（供叠加指标等使用） */
  function financeLoadedItems() {
    var out = [];
    (finIndex().sections || []).forEach(function (meta) {
      var sec = FIN_SECTIONS[meta.key];
      if (sec && sec.loaded) (sec.data.items || []).forEach(function (it) { out.push(it); });
    });
    return out;
  }

  function loadData(keys) {
    keys = [].concat(keys).filter(function (k) { return DATA_SRC[k]; });
    return Promise.all(keys.map(function (k) {
      if (dataReady(k)) return Promise.resolve();
      if (_dataLoading[k]) return _dataLoading[k];
      _dataLoading[k] = new Promise(function (resolve, reject) {
        var sc = document.createElement('script');
        sc.src = DATA_SRC[k];
        sc.async = true;
        sc.onload = function () {
          try { normalizeSeriesData(window[DATA_GLOBAL[k]]); } catch (e) {}
          resolve();
        };
        sc.onerror = function () { delete _dataLoading[k]; reject(new Error(k)); };
        document.head.appendChild(sc);
      });
      return _dataLoading[k];
    }));
  }

  /* 需要数据时展示加载态 */
  function withData(keys, after) {
    if ([].concat(keys).every(dataReady)) { after(); return; }
    var stage = el('chart-stage');
    if (stage) {
      stage.innerHTML = '<div class="stage-loading"><span class="stage-spinner"></span>' +
        '<span>' + tr('正在加载', 'Loading') + ' ' + ([].concat(keys).map(function (k) { return tr(DATA_LABEL[k] || '', k); }).join(' / ') ) + '…</span></div>';
    }
    Promise.all([loadData(keys), ensureCharts()]).then(function () { after(); }).catch(function () {
      if (stage) stage.innerHTML = '<div class="stage-loading"><span>' + tr('数据加载失败，请检查网络后重试', 'Failed to load data. Check your connection and retry.') + '</span></div>';
    });
  }

  function renderHome() {
    clearStage();
    state.macroItem = null; state.finItem = null; state.intlItem = null; state.chartConfig = null; state.macroTypeOverride = null;
    state.mode = 'home';
    state.viewKey = 'home';
    highlightNav('home');
    el('stat-badge').style.display = 'none';
    el('btn-events').style.display = 'none';
    el('btn-table').style.display = 'none';
    el('hint').textContent = '';
    var T = window.I18N ? window.I18N.t : function (k) { return k; };
    var h = document.createElement('div');
    h.className = 'home-view';
    var fbCount = 0;
    try { fbCount = (JSON.parse(localStorage.getItem('adv_feedback') || '[]') || []).length; } catch (e) {}
    h.innerHTML =
      '<div class="home-layout">' +
      '<div class="home-main">' +
        '<div class="home-logo">ADV</div>' +
        '<div class="home-title">' + T('home.title') + '</div>' +
        '<div class="home-sub">' + T('home.sub') + '</div>' +
        '<div class="home-cta-row" style="margin-top:6px">' +
          '<button class="btn primary home-cta" id="home-import">' + T('home.cta') + '</button>' +
          '<button class="btn" id="home-demo">' + T('home.ai.demo') + '</button>' +
        '</div>' +
        '<div class="home-note">' + T('home.note') + '</div>' +
        '<div class="home-browse" id="home-browse">' +
          '<div class="home-browse-txt">' +
            '<div class="home-browse-title">' + T('home.browse') + ' →</div>' +
            '<div class="home-browse-desc">' + T('home.browse.desc') + '</div>' +
          '</div>' +
          '<div class="home-browse-cats" id="home-browse-cats"></div>' +
        '</div>' +
        '<div class="home-flow">' +
          '<div class="home-flow-title">' + T('home.flow.title') + '</div>' +
          '<div class="home-flow-steps">' +
            '<div class="home-flow-step"><i>1</i><span>' + T('home.flow.1') + '</span></div>' +
            '<div class="home-flow-step"><i>2</i><span>' + T('home.flow.2') + '</span></div>' +
            '<div class="home-flow-step"><i>3</i><span>' + T('home.flow.3') + '</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="home-mcp home-mcp-simple">' +
          '<h3>' + T('home.ai.title') + '</h3>' +
          '<p>' + T('home.ai.desc') + '</p>' +
          '<div class="home-cta-row"><button class="btn primary" id="home-ai-copy">' + T('home.ai.copy') + '</button>' +
          '<button class="btn ghost" id="home-ai-cmd-copy">' + (isEn() ? 'Copy install command' : '复制安装命令') + '</button></div>' +
          '<pre class="home-mcp-cmd" id="home-ai-cmd">bash -c "$(curl -fsSL https://raw.githubusercontent.com/saviorbill/adv/main/mcp-server/install.sh)"</pre>' +
          '<p class="home-ai-hint">' + T('home.ai.hint') + '</p>' +
          '<details class="home-guide-details">' +
            '<summary>' + T('home.ai.adv') + '</summary>' +
            '<div class="home-guide-body">' + ((window.ADV_AI_GUIDE && window.ADV_AI_GUIDE[(window.I18N && window.I18N.getLang()) || 'zh']) || '') + '</div>' +
          '</details>' +
        '</div>' +
      '</div>' +
      '<aside class="home-fb">' +
        '<h3>' + T('home.fb.title') + '</h3>' +
        '<p>' + T('home.fb.desc') + '</p>' +
        '<button class="btn primary home-fb-cta" id="home-fb-btn">' + T('home.fb.cta') + '</button>' +
        '<div class="home-fb-count">' + T('home.fb.count').replace('{n}', fbCount) + '</div>' +
      '</aside>' +
      '</div>';
    el('chart-stage').appendChild(h);
    setHead({ title: 'ADV', subtitle: '', unit: '', source: '' });
    h.querySelector('#home-import').addEventListener('click', openModal);
    (function () {
      var box = h.querySelector('#home-browse-cats');
      if (box) {
        (window.CHART_CATALOG || []).forEach(function (cat) {
          var chip = document.createElement('span');
          chip.className = 'home-cat-chip';
          chip.textContent = (isEn() ? (ADV_EN.cat[cat.id] || cat.name) : cat.name) + ' ' + cat.charts.length;
          chip.addEventListener('click', function (ev) { ev.stopPropagation(); renderCategoryDash(cat.id); });
          box.appendChild(chip);
        });
      }
      var browse = h.querySelector('#home-browse');
      if (browse) browse.addEventListener('click', function () {
        var first = (window.CHART_CATALOG || [])[0];
        if (first) renderCategoryDash(first.id);
      });
    })();
    var demoBtn = h.querySelector('#home-demo');
    if (demoBtn) demoBtn.addEventListener('click', showExampleChart);
    var cmdBtn = h.querySelector('#home-ai-cmd-copy');
    if (cmdBtn) cmdBtn.addEventListener('click', function () {
      var cmd = 'bash -c "$(curl -fsSL https://raw.githubusercontent.com/saviorbill/adv/main/mcp-server/install.sh)"';
      var done = function () { toast(tr('安装命令已复制，粘贴到终端回车即可', 'Install command copied — paste it into your terminal')); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(cmd).then(done, done);
      else { var ta = document.createElement('textarea'); ta.value = cmd; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); done(); }
    });
    var copyBtn = h.querySelector('#home-ai-copy');
    if (copyBtn) copyBtn.addEventListener('click', function () {
      var en = (window.I18N && window.I18N.getLang() === 'en');
      var cmd = 'bash -c "$(curl -fsSL https://raw.githubusercontent.com/saviorbill/adv/main/mcp-server/install.sh)"';
      var prompt = en ? [
        'Set up ADV (a charting tool) for me and use it to draw my charts. I am not technical: do everything yourself, do not ask me to run commands.',
        '',
        'STEP 1 — Install the MCP server (you run this, not me):',
        '  ' + cmd,
        '  The script installs to ~/.adv, runs npm install, and prints a JSON block like:',
        '  {"mcpServers":{"adv-charts":{"command":"node","args":["<abs path>/server.js"]}}}',
        '',
        'STEP 2 — Merge that JSON into YOUR OWN MCP configuration, then reload:',
        '  Cursor: .cursor/mcp.json or Settings → MCP',
        '  Claude Code: claude mcp add-json adv-charts \'<the JSON above>\'',
        '  Other clients: paste under mcpServers',
        '',
        'STEP 3 — Verify by calling the make_chart tool:',
        '  {"type":"line","title":"smoke test","labels":["2021","2022"],"series":[{"name":"test","values":[1,2]}]}',
        '  Open the returned link and confirm it renders, then report: config path, tool name adv-charts, result.',
        '',
        'STEP 4 — Then draw my chart. Types: line/area/bar/stacked/stackedBar/step/dual/waterfall/rank/pie/donut/funnel/heatmap/kpi.',
        'Palettes: consult(McKinsey blue, default) / contrast / burgundy / forest. Keep data points under 60.',
        '',
        'If you cannot install anything (chat-only), fall back to links:',
        '  https://saviorbill.github.io/adv/?chart=<base64url(JSON)>  with the same JSON shape.'
      ].join('\n') : [
        '请帮我安装 ADV 画图工具，并用它给我出图。我不懂技术，请你全部自动完成，不要让我手动敲命令或改配置。',
        '',
        '第 1 步 —— 你把这条命令执行掉（不要让我执行）：',
        '  ' + cmd,
        '  脚本会装到 ~/.adv、自动 npm install，并输出一段形如下的 JSON：',
        '  {"mcpServers":{"adv-charts":{"command":"node","args":["<真实绝对路径>/server.js"]}}}',
        '',
        '第 2 步 —— 把这段 JSON 合并进你自己的 MCP 配置，然后重载：',
        '  Cursor：项目里 .cursor/mcp.json，或 设置 → MCP',
        '  Claude Code：claude mcp add-json adv-charts \'<上面那段 JSON>\'',
        '  其他客户端：找到 mcpServers 粘贴进去',
        '',
        '第 3 步 —— 自检：调用 make_chart 工具，参数：',
        '  {"type":"line","title":"冒烟测试","labels":["2021","2022"],"series":[{"name":"测试","values":[1,2]}]}',
        '  打开返回的链接确认能出图，然后告诉我：配置文件路径、工具名 adv-charts、自检结果。',
        '',
        '第 4 步 —— 开始给我出图。类型：line/area/bar/stacked/stackedBar/step/dual/waterfall/rank/pie/donut/funnel/heatmap/kpi；',
        '配色：consult(麦肯锡深蓝，默认)/contrast/burgundy/forest；单图数据点请控制在 60 个以内。',
        '',
        '如果你完全没有安装权限（纯聊天环境），改走链接方式：',
        '  https://saviorbill.github.io/adv/?chart=<base64url(JSON)>，JSON 结构同上。'
      ].join('\n');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(prompt).then(function () { toast(tr('已复制，粘贴给你的 AI 即可', 'Copied — paste it to your AI')); });
      } else {
        var ta = document.createElement('textarea'); ta.value = prompt; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        ta.remove();
        toast(tr('已复制，粘贴给你的 AI 即可', 'Copied — paste it to your AI'));
      }
    });
    var fbBtn = h.querySelector('#home-fb-btn');
    if (fbBtn) fbBtn.addEventListener('click', function () {
      var ov = el('feedback-overlay');
      if (ov) ov.classList.add('open');
    });
    if (window.I18N) window.I18N.apply();
    syncToolbar();
  }


  /* ---------- 中国宏观数据一览（真实数据看板） ---------- */
  function renderChinaMacro() {
    if (!dataReady('china')) { withData(['china'], renderChinaMacro); return; }
    clearStage();
    state.mode = 'macro';
    state.viewKey = 'china-macro';
    state.currentTemplate = null; state.dataset = null; state.dashboardDatasets = null;
    state.table = null; state.det = null; state.macroItem = null; state.finItem = null; state.intlItem = null; state.chartConfig = null; state.macroTypeOverride = null;
    highlightNav('china-macro');
    el('stat-badge').style.display = 'none';
    el('btn-events').style.display = 'none';
    el('btn-table').style.display = 'none';
    el('hint').textContent = '';
    var M = window.CHINA_MACRO || { sections: [] };
    setHead({
      title: tr('中国宏观数据', 'China Macro') + ' · ' + tr('一览', 'Overview'),
      subtitle: (M.updated ? DT('数据更新到') + ' ' + M.updated : DT('暂无数据')) + ' · ' + tr('点击任意卡片查看完整图表','click any card for the full chart'),
      unit: '', source: tr('Wind / 国家统计局 · 手工整理','Wind / NBS · compiled')
    });

    var wrap = document.createElement('div');
    wrap.className = 'macro-dash';
    var theme = getChartTheme();
    state.macroInsts = [];

    (M.sections || []).forEach(function (sec) {
      var secEl = document.createElement('div');
      secEl.className = 'macro-section';
      var hd = document.createElement('div');
      hd.className = 'macro-cat';
      hd.textContent = DT(sec.name);
      secEl.appendChild(hd);
      var grid = document.createElement('div');
      grid.className = 'macro-grid';
      sec.items.forEach(function (item) {
        if (!item || !item.series || !item.series.length) return;
        var first = item.series[0];
        var latest = first.values[first.values.length - 1];
        var prev = first.values.length > 1 ? first.values[first.values.length - 2] : null;
        var delta = (prev === null || prev === undefined || isNaN(prev)) ? null : (latest - prev);
        var upCls = delta === null ? '' : (delta >= 0 ? 'up' : 'down');
        var arrow = delta === null ? '' : (delta >= 0 ? '▲' : '▼');
        var multi = item.series.length > 1;
        var card = document.createElement('div');
        card.className = 'macro-card';
        card.title = DT('点击查看完整图表');
        card.innerHTML =
          '<div class="mc-name">' + DT(item.title) + (multi ? (isEn() ? ' (' + item.series.length + ' series)' : '（' + item.series.length + '条）') : '') + '</div>' +
          '<div class="mc-val">' + fmtNum(latest) + '</div>' +
          '<div class="mc-delta ' + upCls + '">' + (delta === null ? '—' : arrow + ' ' + fmtNum(Math.abs(delta)) + ' ' + DT('较上期')) + '</div>' +
          '<div class="mc-chart"></div>';
        card.addEventListener('click', function () { openMacroItem(item, false); });
        grid.appendChild(card);
        renderMacroSpark(card.querySelector('.mc-chart'), item, theme);
      });
      secEl.appendChild(grid);
      wrap.appendChild(secEl);
    });

    el('chart-stage').appendChild(wrap);
    syncToolbar();
  }



  /* 社融单项：季节性折线大图 */
  function openSheirongSeasonItem(item, sr) {
    clearStage();
    state.mode = 'season';          // 细分图表：显示功能栏
    state.seasonItem = item;
    state.seasonCurrent = sr;
    state.seasonPanels = [];
    state.viewKey = 'macro-seirong-item:' + sr.name;
    state.macroItem = item;
    highlightNav(null);
    el('stat-badge').style.display = 'none';
    el('btn-events').style.display = 'none';
    el('btn-table').style.display = 'none';
    showBack(function () { renderSheirongSeason(item); });
    setHead({
      title: DT(sr.name) + ' · ' + tr('季节性折线', 'Seasonal line'),
      subtitle: tr('近 4 年同月对比（1–12 月）· 单位：', 'Last 4 years by month · unit: ') + (item.unit || '亿元'),
      unit: item.unit || '亿元', source: '中国人民银行 · akshare 实时'
    });
    var c = document.createElement('div');
    c.className = 'chart-canvas';
    el('chart-stage').appendChild(c);
    var theme = getChartTheme();
    var inst = ChartFactory.render(c, 'season', {
      labels: item.labels,
      series: [{ name: sr.name, values: sr.values }],
      maxYears: 4
    }, theme);
    state.echartsEl = c;
    state.seasonPanels = [{ inst: inst, box: c, sr: sr }];
    attachExtremeLabels(inst);
    try { inst.resize(); } catch (e) {}
    syncToolbar();
  }

  /* 社融结构三项：三张季节性折线（近 4 年，1-12 月对比） */
  function renderSheirongSeason(item) {
    clearStage();
    state.mode = 'macro';           // 三面板总览：不显示功能栏
    state.seasonItem = item;
    state.seasonCurrent = null;
    state.seasonPanels = [];
    state.viewKey = 'macro-seirong-season';
    state.macroItem = item;
    highlightNav(null);
    el('stat-badge').style.display = 'none';
    el('btn-events').style.display = 'none';
    el('btn-table').style.display = 'none';
    showBack(function () { renderChinaMacro(); });
    setHead({
      title: tr('社融结构 · 三项季节性对比', 'Social financing · seasonal comparison'),
      subtitle: tr('近 4 年 · 每月新增（亿元）· 三项各自对比', 'Last 4 years · monthly new issuance (CNY bn)'),
      unit: item.unit || '亿元', source: '中国人民银行 · akshare 实时'
    });
    var theme = getChartTheme(); theme._noZoom = true;
    var grid = document.createElement('div');
    grid.className = 'season-grid';
    el('chart-stage').appendChild(grid);
    (item.series || []).forEach(function (sr) {
      var panel = document.createElement('div');
      panel.className = 'season-panel';
      panel.title = tr('点击查看大图', 'Click for full chart');
      panel.style.cursor = 'pointer';
      panel.addEventListener('click', function () { openSheirongSeasonItem(item, sr); });
      var last = sr.values[sr.values.length - 1];
      panel.innerHTML = '<div class="season-hd"><span class="season-name">' + escHtml(DT(sr.name)) + '</span>' +
        '<span class="season-val">' + fmtNum(last) + '</span></div>';
      var box = document.createElement('div');
      box.className = 'season-box';
      panel.appendChild(box);
      grid.appendChild(panel);
      var sInst = ChartFactory.render(box, 'season', {
        labels: item.labels,
        series: [{ name: sr.name, values: sr.values }],
        maxYears: 4
      }, theme);
      state.seasonPanels.push({ inst: sInst, box: box, sr: sr });
      if (state.seasonPanels.length === 1) state.echartsEl = box;
      try { applyExtremeLabels(sInst); applyLastValueTag(sInst); } catch (e) {}
    });
    syncToolbar();
  }

  function openMacroItem(item, keep) {
    try {
      if (/社融结构/.test(item.title) && (item.series || []).length >= 2) { renderSheirongSeason(item); return; }
      var vk = 'macro-item:' + item.title;
      if (!keep) { state.overlaySeries = []; state.macroTypeOverride = null; delete state.customTitles[vk]; }
      state.macroItem = item;
      var merged = mergeOverlaySeries(item.labels, item.series, state.overlaySeries);
      var type = state.macroTypeOverride || item.type;
      applyChartConfig({ type: type, title: item.title, unit: item.unit, labels: merged.labels, series: merged.series,
        viewKey: vk, events: cnEventsForLabels(merged.labels) }, true);
      showBack(function () { renderChinaMacro(); });
      if (state.overlaySeries.length) renderPeriodTable(merged.labels, merged.series);
    } catch (e) { toast('打开图表失败'); }
  }

  function renderMacroSpark(el2, item, theme) {
    try {
      var inst = echarts.getInstanceByDom(el2) || echarts.init(el2);
      state.macroInsts.push(inst);
      var series = item.series.map(function (s, i) {
        var color = theme.series ? theme.series[i % theme.series.length] : theme.accent;
        return {
          type: 'line', name: s.name, data: s.values, showSymbol: false, smooth: true, silent: true,
          lineStyle: { color: color, width: 1.5 },
          areaStyle: item.series.length === 1 ? { color: ChartFactory.hexToRgba(color, 0.16) } : undefined
        };
      });
      inst.setOption({
        grid: { left: 2, right: 2, top: 6, bottom: 2 },
        xAxis: { type: 'category', show: false, data: item.labels, boundaryGap: false },
        yAxis: { type: 'value', show: false, scale: true },
        series: series,
        tooltip: {
          trigger: 'axis', confine: true,
          backgroundColor: theme.panel, borderColor: theme.accent + '55', borderWidth: 1,
          textStyle: { color: theme.text, fontSize: 11 },
          valueFormatter: function (v) { return fmtNum(v); }
        }
      });
      // 卡片刚插入 DOM 时尺寸可能为 0，下一帧再 resize
      requestAnimationFrame(function () { try { inst.resize(); } catch (e2) {} });
    } catch (e) {}
  }

  /* ---------- 金融数据一览（真实数据看板） ---------- */
  function renderFinance() {
    if (!dataReady('financeIndex')) {
      withData(['financeIndex'], function () {
        loadFinanceSection(state.financeSection || (finIndex().sections[0] || {}).key).then(renderFinance).catch(function () { renderFinance(); });
      });
      return;
    }
    var IDX = finIndex();
    var secs = IDX.sections || [];
    if (!secs.length) return;
    var activeKey = state.financeSection || secs[0].key;
    var activeMeta = secs.filter(function (x) { return x.key === activeKey; })[0] || secs[0];
    activeKey = activeMeta.key;
    state.financeSection = activeKey;

    clearStage();
    state.mode = 'macro';
    state.viewKey = 'finance';
    state.currentTemplate = null; state.dataset = null; state.dashboardDatasets = null;
    state.table = null; state.det = null; state.macroItem = null; state.finItem = null; state.intlItem = null; state.chartConfig = null; state.macroTypeOverride = null;
    highlightNav('finance');
    el('stat-badge').style.display = 'none';
    el('btn-events').style.display = 'none';
    el('btn-table').style.display = 'none';
    el('hint').textContent = '';
    setHead({
      title: tr('金融资产', 'Financial Assets') + ' · ' + tr('一览', 'Overview'),
      subtitle: (IDX.updated ? DT('数据更新到') + ' ' + IDX.updated : DT('暂无数据')) + ' · ' + tr('股票/商品/外汇用业绩模版，债券/VIX 用收益率折线','equities / commodities / FX use performance template; bonds / VIX use yield lines'),
      unit: '', source: tr('Wind / 交易所 · 手工整理','Wind / exchanges · compiled')
    });

    var wrap = document.createElement('div');
    wrap.className = 'macro-dash fin-dash';
    var theme = getChartTheme();
    state.macroInsts = [];

    /* 板块切换条（每次只加载一个板块的数据文件） */
    var tabs = document.createElement('div');
    tabs.className = 'fin-tabs';
    secs.forEach(function (meta) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'fin-tab' + (meta.key === activeKey ? ' on' : '');
      b.innerHTML = DT(meta.name) + '<i>' + meta.count + '</i>';
      b.addEventListener('click', function () {
        if (meta.key === activeKey) return;
        state.financeSection = meta.key;
        renderFinance();
      });
      tabs.appendChild(b);
    });
    wrap.appendChild(tabs);

    var body = document.createElement('div');
    body.className = 'fin-body';
    wrap.appendChild(body);
    el('chart-stage').appendChild(wrap);

    var loaded = FIN_SECTIONS[activeKey] && FIN_SECTIONS[activeKey].loaded;
    if (!loaded) {
      body.innerHTML = '<div class="stage-loading"><span class="stage-spinner"></span><span>' +
        tr('正在加载', 'Loading') + ' ' + DT(activeMeta.name) + '…</span></div>';
      loadFinanceSection(activeKey).then(function () { renderFinance(); }).catch(function () {
        body.innerHTML = '<div class="stage-loading"><span>' + tr('数据加载失败，请检查网络后重试', 'Failed to load data. Please retry.') + '</span></div>';
      });
      syncToolbar();
      return;
    }

    var sec = FIN_SECTIONS[activeKey].data;
    var secEl = document.createElement('div');
    secEl.className = 'macro-section';
    var hd = document.createElement('div');
    hd.className = 'macro-cat';
    hd.textContent = DT(sec.name);
    secEl.appendChild(hd);
    var grid = document.createElement('div');
    grid.className = 'macro-grid';
    (sec.items || []).forEach(function (item) {
      if (!item || !item.series || !item.series.length) return;
      var ranged = applyTimeRange(item.labels, item.series);
      var fi = { title: item.title, unit: item.unit, type: item.type, labels: ranged.labels, series: ranged.series };
      var first = fi.series[0];
      var vals = first.values;
      var latest = vals[vals.length - 1];
      var prev = vals.length > 1 ? vals[vals.length - 2] : null;
      var delta = (prev === null || prev === undefined || isNaN(prev) || prev === 0) ? null : (latest - prev);
      var upCls = delta === null ? '' : (delta >= 0 ? 'up' : 'down');
      var arrow = delta === null ? '' : (delta >= 0 ? '▲' : '▼');
      var card = document.createElement('div');
      card.className = 'macro-card';
      card.title = DT(fi.type === 'line' ? '点击查看走势' : '点击查看业绩');
      card.innerHTML =
        '<div class="mc-name">' + DT(fi.title) + '</div>' +
        '<div class="mc-val">' + fmtNum(latest) + '</div>' +
        '<div class="mc-delta ' + upCls + '">' + (delta === null ? '—' : arrow + ' ' + fmtNum(Math.abs(delta)) + ' ' + DT('较上期')) + '</div>' +
        '<div class="mc-chart"></div>';
      card.addEventListener('click', function () { openFinItem(fi); });
      grid.appendChild(card);
      renderMacroSpark(card.querySelector('.mc-chart'), fi, theme);
    });
    secEl.appendChild(grid);
    body.appendChild(secEl);

    syncToolbar();

    /* 只预取「下一个板块」，且延迟到页面空闲；省流量模式/弱网不预取 */
    var conn = navigator.connection || {};
    var saveData = !!conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');
    var nextSec = secs.filter(function (m) { return m.key !== activeKey && !(FIN_SECTIONS[m.key] && FIN_SECTIONS[m.key].loaded); })[0];
    if (nextSec && !saveData) {
      var idle = window.requestIdleCallback || function (cb) { return setTimeout(cb, 2500); };
      idle(function () { loadFinanceSection(nextSec.key).catch(function () {}); }, { timeout: 6000 });
    }
  }

  function openFinItem(item, keep) {
    try {
      var fvk = 'fin-item:' + item.title;
      if (!keep) { state.overlaySeries = []; state.macroTypeOverride = null; delete state.customTitles[fvk]; }
      state.finItem = item;
      var ranged = applyTimeRange(item.labels, item.series);
      var labels = ranged.labels, values = ranged.series[0].values;
      var merged = mergeOverlaySeries(labels, [{ name: item.title, values: values }], state.overlaySeries);
      clearStage();
      state.mode = 'imported'; state.isImported = true; state.viewKey = fvk;
      state.macroItem = null; state.chartConfig = null;
      highlightNav(null);
      el('btn-events').style.display = 'none';
      el('stat-badge').style.display = 'none';
      showBack(function () { renderFinance(); });
      var theme = getChartTheme();
      var c = document.createElement('div'); c.className = 'chart-canvas'; el('chart-stage').appendChild(c);
      if (item.type === 'line' || state.overlaySeries.length) {
        // 收益率/波动率 或 带叠加对比：直接折线
        var ci = renderAutoDual(c, 'line', { labels: merged.labels, series: merged.series }, theme);
        attachExtremeLabels(ci);
        state.echartsEl = c;
        state.lastChart = { type: 'line', title: item.title, data: { labels: merged.labels, series: merged.series } };
        if (merged.series.length === 2) {
          try { renderCohesionPanel(merged.labels, merged.series, ci, theme); } catch (e) {}
        }
        renderFinanceMetricsTable(merged.labels, merged.series, item.type === 'fund', item.unit === '%', ci);
        setHead({ title: item.title + (state.overlaySeries.length ? ' · 对比' : ''), subtitle: '', unit: item.unit || '', source: '公开数据' });
        el('hint').textContent = DT(state.overlaySeries.length ? '多指标对比' : '收益率/波动率走势');
      } else if (state.overlaySeries && state.overlaySeries.length) {
        // 已叠加对比指标：改为折线（自动双轴）+ 趋同分析
        var ciOv = renderAutoDual(c, 'line', { labels: merged.labels, series: merged.series }, theme);
        attachExtremeLabels(ciOv);
        state.echartsEl = c;
        state.lastChart = { type: 'line', title: item.title, data: { labels: merged.labels, series: merged.series } };
        if (merged.series.length === 2) { try { renderCohesionPanel(merged.labels, merged.series, ciOv, theme); } catch (e) {} }
        renderFinanceMetricsTable(merged.labels, merged.series, true, false, ciOv);
        setHead({ title: item.title + ' · 对比', subtitle: '', unit: item.unit || '净值', source: '公开数据' });
        el('hint').textContent = tr('多指标对比', 'Multi-indicator comparison');
      } else {
        // 业绩评估：净值 + 回撤 + 指标
        var nav = merged.labels.map(function (d, i) { return { date: d, value: merged.series[0].values[i] }; }).filter(function (p) { return p.value !== null && p.value !== undefined && !isNaN(p.value); });
        var ci2 = ChartFactory.render(c, 'perf', { name: item.title, nav: nav }, theme);
        renderPerfMetrics({ name: item.title, nav: nav }, ci2);
        renderFinanceMetricsTable(merged.labels, merged.series, true, false, ci2);
        state.echartsEl = c;
        setHead({ title: item.title + ' · 业绩评估', subtitle: '净值曲线（上）+ 最大回撤（下）', unit: item.unit || '净值', source: '基金' });
        el('hint').textContent = '业绩评估 · 单个资产';
      }
      syncToolbar();
    } catch (e) { toast('打开图表失败'); }
  }

  /* ---------- 国际宏观数据看板 ---------- */
  function renderIntlMacro() {
    if (!dataReady('intl')) { withData(['intl'], renderIntlMacro); return; }
    clearStage();
    state.mode = 'macro';
    state.viewKey = 'intl-macro';
    state.currentTemplate = null; state.dataset = null; state.dashboardDatasets = null;
    state.table = null; state.det = null; state.macroItem = null; state.finItem = null; state.intlItem = null; state.chartConfig = null; state.macroTypeOverride = null;
    highlightNav('intl-macro');
    el('stat-badge').style.display = 'none';
    el('btn-events').style.display = 'none';
    el('btn-table').style.display = 'none';
    el('hint').textContent = '';
    var M = window.INTL_MACRO || { sections: [] };
    setHead({
      title: DT('国际宏观数据'),
      subtitle: (M.updated ? DT('数据更新到') + ' ' + M.updated : DT('暂无数据')) + ' · ' + tr('主流国家 GDP/CPI/PPI/PMI/基准利率','major economies: GDP / CPI / PPI / PMI / policy rates'),
      unit: '', source: tr('akshare · 公开数据','akshare · public data')
    });

    var wrap = document.createElement('div');
    wrap.className = 'macro-dash';
    var theme = getChartTheme();
    state.macroInsts = [];

    (M.sections || []).forEach(function (sec) {
      var secEl = document.createElement('div');
      secEl.className = 'macro-section';
      var hd = document.createElement('div');
      hd.className = 'macro-cat';
      hd.textContent = DT(sec.name);
      secEl.appendChild(hd);
      var grid = document.createElement('div');
      grid.className = 'macro-grid';
      sec.items.forEach(function (item) {
        if (!item || !item.series || !item.series.length) return;
        var first = item.series[0];
        var vals = first.values;
        var latest = vals[vals.length - 1];
        var prev = vals.length > 1 ? vals[vals.length - 2] : null;
        var delta = (prev === null || prev === undefined || isNaN(prev) || prev === 0) ? null : (latest - prev);
        var upCls = delta === null ? '' : (delta >= 0 ? 'up' : 'down');
        var arrow = delta === null ? '' : (delta >= 0 ? '▲' : '▼');
        var card = document.createElement('div');
        card.className = 'macro-card';
        card.title = DT('点击查看走势');
        card.innerHTML =
          '<div class="mc-name">' + DT(item.title) + '</div>' +
          '<div class="mc-val">' + fmtNum(latest) + '</div>' +
          '<div class="mc-delta ' + upCls + '">' + (delta === null ? '—' : arrow + ' ' + fmtNum(Math.abs(delta)) + ' ' + DT('较上期')) + '</div>' +
          '<div class="mc-chart"></div>';
        card.addEventListener('click', function () { openIntlItem(item); });
        grid.appendChild(card);
        renderMacroSpark(card.querySelector('.mc-chart'), item, theme);
      });
      secEl.appendChild(grid);
      wrap.appendChild(secEl);
    });

    el('chart-stage').appendChild(wrap);
    syncToolbar();
  }

  function openIntlItem(item, keep) {
    try {
      var ivk = 'intl-item:' + item.title;
      if (!keep) { state.overlaySeries = []; state.macroTypeOverride = null; delete state.customTitles[ivk]; }
      state.intlItem = item;
      var ranged = applyTimeRange(item.labels, item.series);
      var merged = mergeOverlaySeries(ranged.labels, ranged.series, state.overlaySeries);
      clearStage();
      state.mode = 'imported'; state.isImported = true; state.viewKey = ivk;
      state.macroItem = null; state.finItem = null; state.chartConfig = null;
      highlightNav(null);
      el('btn-events').style.display = 'none';
      el('stat-badge').style.display = 'none';
      showBack(function () { renderIntlMacro(); });
      var theme = getChartTheme();
      var c = document.createElement('div'); c.className = 'chart-canvas'; el('chart-stage').appendChild(c);
      var ci = renderAutoDual(c, 'line', { labels: merged.labels, series: merged.series }, theme);
      attachExtremeLabels(ci);
      state.echartsEl = c;
      state.lastChart = { type: 'line', title: item.title, data: { labels: merged.labels, series: merged.series } };
      if (state.overlaySeries.length) renderPeriodTable(merged.labels, merged.series);
      setHead({ title: item.title + (state.overlaySeries.length ? ' · 对比' : ''), subtitle: '走势 · 可直接叠加中国宏观等指标', unit: item.unit || '', source: '公开数据' });
      el('hint').textContent = DT(state.overlaySeries.length ? '多指标对比' : '单个指标走势');
      syncToolbar();
    } catch (e) { toast('打开图表失败'); }
  }

  /* ---------- 数据探索：用已有数据自由组合生成图表 ---------- */
  var exploreSel = [];
  function exploreData(source) {
    if (source === 'china') return window.CHINA_MACRO;
    if (source === 'intl') return window.INTL_MACRO;
    return { sections: (finIndex().sections || []).map(function (m) {
      var sec = FIN_SECTIONS[m.key];
      return { name: m.name, items: (sec && sec.loaded) ? sec.data.items : [] };
    }) };
  }
  function buildExploreItems(source) {
    var box = el('explore-items');
    if (!box) return;
    exploreSel.length = 0;
    box.innerHTML = '';
    var sources = (source === 'all') ? ['china', 'intl', 'finance'] : [source];
    var labelMap = { china: DT('中国宏观'), intl: DT('国际宏观'), finance: DT('金融资产') };
    sources.forEach(function (src) {
      var D = exploreData(src) || { sections: [] };
      // 该数据源有指标才加分组标题
      var hasAny = D.sections.some(function (s) { return s.items && s.items.length; });
      if (!hasAny) return;
      var hd = document.createElement('div');
      hd.className = 'nav-group-label';
      hd.style.padding = '10px 4px 4px';
      hd.textContent = labelMap[src] || src;
      box.appendChild(hd);
      D.sections.forEach(function (sec) {
        sec.items.forEach(function (item) {
          if (!item.series || !item.series.length) return;
          var key = src + ':' + item.title;
          var chip = document.createElement('div');
          chip.className = 'col-chip';
          chip.textContent = DT(item.title);
          chip.dataset.key = key;
          chip.addEventListener('click', function () {
            var i = exploreSel.indexOf(key);
            if (i >= 0) exploreSel.splice(i, 1); else exploreSel.push(key);
            chip.classList.toggle('on');
          });
          box.appendChild(chip);
          item._exploreKey = key;
        });
      });
    });
  }
  function openExplore() {
    el('explore-overlay').classList.add('open');
    buildExploreItems(el('explore-source').value);
  }
  function closeExplore() { el('explore-overlay').classList.remove('open'); }
  function exploreItemByKey(key) {
    var src = key.split(':')[0];
    var title = key.split(':').slice(1).join(':');
    var D = exploreData(src);
    for (var i = 0; i < D.sections.length; i++) {
      for (var j = 0; j < D.sections[i].items.length; j++) {
        if (D.sections[i].items[j].title === title) return D.sections[i].items[j];
      }
    }
    return null;
  }
  function renderExplore() {
    var source = el('explore-source').value;
    var typ = el('explore-type').value;
    var keys = exploreSel.slice();
    if (keys.length < 2) { toast('请至少选择 2 个指标'); return; }
    var items = keys.map(function (k) { return exploreItemByKey(k); }).filter(Boolean);
    if (items.length < 2) { toast('未找到所选指标'); return; }
    state.exploreConfig = { source: source, keys: keys, type: typ };
    renderExploreFromConfig();
    closeExplore();
  }
  function renderExploreFromConfig() {
    var cfg = state.exploreConfig;
    if (!cfg) return;
    var source = cfg.source, typ = cfg.type, keys = cfg.keys;
    var items = keys.map(function (k) { return exploreItemByKey(k); }).filter(Boolean);
    if (items.length < 2) return;
    var theme = getChartTheme();
    var ranged = items.map(function (it) { return applyTimeRange(it.labels, it.series); });
    clearStage();
    state.mode = 'imported'; state.isImported = true; state.viewKey = 'explore';
    state.macroItem = null; state.finItem = null; state.intlItem = null; state.chartConfig = null;
    highlightNav('explore');
    el('btn-events').style.display = 'none';
    el('stat-badge').style.display = 'none';
    var stage = el('chart-stage');
    var c = document.createElement('div'); c.className = 'chart-canvas'; stage.appendChild(c);
    var title = items.map(function (it) { return it.title; }).join(' vs ');
    function setLast(t, d) { state.lastChart = { type: t, title: title, data: d }; }
    if (typ === 'multi') {
      var merged = mergeOverlaySeries(ranged[0].labels, ranged[0].series, items.slice(1).map(function (it, i) {
        return { name: it.title, labels: ranged[i + 1].labels, values: ranged[i + 1].series[0].values };
      }));
      renderAutoDual(c, 'line', merged, theme);
      setLast('line', merged);
      setHead({ title: '多线对比', subtitle: title, unit: '', source: '已有数据' });
    } else if (typ === 'heatmap') {
      var labelSet = {};
      ranged.forEach(function (r) { r.labels.forEach(function (l) { labelSet[l] = true; }); });
      var xLabels = Object.keys(labelSet).sort();
      var yLabels = items.map(function (it) { return it.title; });
      var values = [];
      items.forEach(function (it, i) {
        var map = {};
        ranged[i].labels.forEach(function (l, k) { map[l] = ranged[i].series[0].values[k]; });
        xLabels.forEach(function (l, j) { if (map[l] !== undefined && map[l] !== null) values.push([j, i, Math.round(map[l] * 100) / 100]); });
      });
      ChartFactory.render(c, 'heatmap', { xLabels: xLabels, yLabels: yLabels, values: values }, theme);
      setLast('heatmap', { xLabels: xLabels, yLabels: yLabels, values: values });
      setHead({ title: '热力矩阵', subtitle: title, unit: '', source: '已有数据' });
    } else if (typ === 'scatter') {
      var ser = items.map(function (it, i) { return { name: it.title, values: ranged[i].series[0].values }; });
      ChartFactory.render(c, 'scatterMatrix', { series: ser }, theme);
      setLast('scatterMatrix', { series: ser });
      setHead({ title: '散点矩阵 · 关联探索', subtitle: title, unit: '', source: '已有数据' });
    } else if (typ === 'radar') {
      var inds = items.map(function (it) { return { name: it.title }; });
      var vals = items.map(function (it, i) { var v = ranged[i].series[0].values; return v[v.length - 1]; });
      ChartFactory.render(c, 'radar', { indicators: inds, series: [{ name: '最新值', values: vals }] }, theme);
      setLast('radar', { indicators: inds, series: [{ name: '最新值', values: vals }] });
      setHead({ title: '雷达图 · 最新快照', subtitle: title, unit: '', source: '已有数据' });
    } else if (typ === 'rank') {
      var rv = items.map(function (it, i) { var v = ranged[i].series[0].values; return v[v.length - 1]; });
      ChartFactory.render(c, 'rank', { categories: items.map(function (it) { return it.title; }), values: rv }, theme);
      setLast('rank', { categories: items.map(function (it) { return it.title; }), values: rv });
      setHead({ title: '横向排名 · 最新值', subtitle: title, unit: '', source: '已有数据' });
    }
    state.echartsEl = c;
    el('hint').textContent = tr('数据探索 · 共 ','Explore · ') + items.length + tr(' 个指标',' indicators');
    syncToolbar();
  }

  /* ---------- 侧边导航 ---------- */

  /* ================= 图表分类（9 大用途） ================= */
  var ADV_EN = {
    cat: { compare: 'Comparison & Ranking', trend: 'Trend & Time', composition: 'Composition & Share',
      distribution: 'Distribution', relation: 'Relationship & Correlation', flow: 'Flow & Conversion',
      geo: 'Geospatial', hierarchy: 'Hierarchy & Process', special: 'Specialized', showcase: 'Showcase' },
    catDesc: {
      compare: 'Who is higher or lower, how much more, ranking, and differences between items or versus a benchmark.',
      trend: 'How values change over time — pace, turning points, cycles, and accumulation.',
      composition: 'What the whole is made of, how much each part contributes, and hierarchical composition.',
      distribution: 'Where values concentrate, dispersion, skewness, outliers, and multi-modal shapes.',
      relation: 'Whether variables are related, strength and direction, network structure, and set overlaps.',
      flow: 'Where data, resources or users come from and go, flow volume, conversion and churn.',
      geo: 'Where things happen, regional gaps, spatial density and location patterns.',
      hierarchy: 'Organizational or categorical hierarchy, and the sequence/ownership of tasks and approvals.',
      special: 'Domain-specific graphics, or charts for state / interval / diagnostics rather than general data.',
      showcase: 'Bespoke D3.js visuals that go beyond standard charts — built for visual impact and narrative.'
    },
    chart: {
      groupedBar: 'Grouped Bar', tornado: 'Tornado / Diverging Bar', lollipop: 'Lollipop', bullet: 'Bullet',
      archDiagram: 'System architecture',
      wordcloud: 'Word Cloud', radar: 'Radar', line: 'Line', area: 'Area', stacked: 'Stacked Area',
      waterfall: 'Waterfall', heatmap: 'Heatmap', pie: 'Pie', donut: 'Donut', stackedBar: 'Stacked Bar',
      percentBar: '100% Stacked Bar', treemap: 'Treemap', sunburst: 'Sunburst', histogram: 'Histogram',
      boxplot: 'Box Plot', violin: 'Violin Plot', beeswarm: 'Beeswarm', ridge: 'Ridge Plot',
      matrixHeat: '2D Heatmap', ecdf: 'Q-Q / ECDF', scatter: 'Scatter', bubble: 'Bubble',
      scatterMatrix: 'Scatter Matrix', corrMatrix: 'Correlation Matrix', venn: 'Venn Diagram',
      arc: 'Arc Diagram', funnel: 'Funnel', sankey: 'Sankey', chord: 'Chord Diagram',
      flowMap: 'Flow Map', choropleth: 'Choropleth', symbolMap: 'Symbol Map', heatMapGeo: 'Heat Map',
      trajectory: 'Trajectory', migration: 'Migration Map', hexMap: 'Hexagon Map', tree: 'Tree',
      orgChart: 'Org Chart', icicle: 'Icicle', flowchart: 'Flowchart', swimlane: 'Swimlane',
      bulletSpecial: 'Bullet (KPI)', control: 'Control Chart', parallel: 'Parallel Coordinates',
      streamgraph: 'Streamgraph',
      dumbbell: 'Dumbbell', pmiRadar: 'PMI Radar (13 items)', season: 'Seasonal Line', dual: 'Dual-axis Trend',
      corrNetwork: 'Correlation Network + Matrix',
      scForce: 'Force Network', scChord: 'Chord Diagram', scRadialTree: 'Radial Tree',
      scHexbin: 'Hexbin Density', scGlowLine: 'Glow Trend', scWaterfall: 'Animated Waterfall'
    },
    chartDesc: {
      groupedBar: 'Side-by-side bars for multi-group comparison', tornado: 'Mirrored bars to compare two sides at once',
      archDiagram: 'Grouped zones with orthogonal connectors and inline labels — palette only changes borders and lines',
      lollipop: 'Ranked comparison, lighter than bars', bullet: 'Actual vs target within qualitative ranges',
      wordcloud: 'Text sized by frequency to surface themes', radar: 'Multi-dimensional profile across axes',
      line: 'The default time-series view: trend and turning points', area: 'Emphasizes accumulated magnitude',
      stacked: 'Total plus composition changing together', waterfall: 'Step-by-step contribution from start to end',
      heatmap: 'Colour-encoded matrix to spot hot and cold zones', pie: 'Share of a whole in 3–5 slices',
      donut: 'Pie with a centre slot for a total or KPI', stackedBar: 'Compare categories and their makeup',
      percentBar: 'Structure only, most fair across groups', treemap: 'Area equals share, two hierarchy levels',
      sunburst: 'Radial hierarchy for three or more levels', histogram: 'Distribution shape and long tails',
      boxplot: 'Five-number summary, compare median and spread', violin: 'Box plot plus density, shows multi-modality',
      beeswarm: 'Every point shown without overlap', ridge: 'Stacked densities to compare distributions',
      matrixHeat: 'Two-dimensional cross-tab heat matrix', ecdf: 'Empirical CDF against theoretical quantiles',
      scatter: 'Direction and strength between two variables', bubble: 'Scatter plus a third size dimension',
      scatterMatrix: 'Pairwise scatters across many variables', corrMatrix: 'Quantified pairwise correlation',
      venn: 'Set overlaps and unique parts', arc: 'One-dimensional order plus long arcs for links',
      funnel: 'Stage-by-stage conversion and drop-off', sankey: 'Multi-stage flow and split ratios',
      chord: 'Bidirectional flows arranged in a ring', flowMap: 'Geographic flows with direction and volume',
      choropleth: 'Shade regions by an indicator', symbolMap: 'Bubble size encodes magnitude by location',
      heatMapGeo: 'Spatial density heat to find hotspots', trajectory: 'Path over time and movement pattern',
      migration: 'Direction and scale of migration', hexMap: 'Equal-area hexagon bins avoid area bias',
      tree: 'Hierarchy expansion', orgChart: 'Reporting lines, top-down',
      icicle: 'Horizontal hierarchy share, space efficient', flowchart: 'Steps, order and branches',
      swimlane: 'Cross-team process by owner lane', bulletSpecial: 'KPI against target and thresholds',
      control: 'Process monitoring with control limits', parallel: 'Multi-dimensional sample lines',
      streamgraph: 'Theme evolution over time',
      dumbbell: 'Two periods joined by a line: who widened the gap',
      pmiRadar: '13 activity indicators over 3 months with the most volatile item called out',
      season: 'Same months across 4 years: seasonality and year-over-year change',
      dual: 'Index level (left) vs interest rate (right): divergence and linkage',
      corrNetwork: 'Network on the left, matrix on the right: see who moves with whom',
      scForce: 'Force-directed network sized by weight', scChord: 'Ring of bidirectional flows with gradient ribbons',
      scRadialTree: 'Circular hierarchy for multi-level categories', scHexbin: '2D density bins without overplotting',
      scGlowLine: 'Single glowing trend line with end emphasis', scWaterfall: 'Bars grow one by one to tell the story'
    }
  };
  function findCat(id) {
    var list = window.CHART_CATALOG || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function findChart(catId, chartId) {
    var cat = findCat(catId); if (!cat) return null;
    for (var i = 0; i < cat.charts.length; i++) if (cat.charts[i].id === chartId) return cat.charts[i];
    return null;
  }
  function catName(cat) { return isEn() ? (ADV_EN.cat[cat.id] || cat.name) : cat.name; }
  function catDesc(cat) { return isEn() ? (ADV_EN.catDesc[cat.id] || cat.desc) : cat.desc; }
  function chartName(ch) { return isEn() ? (ADV_EN.chart[ch.id] || ch.name) : ch.name; }
  function chartDesc(ch) { return isEn() ? (ADV_EN.chartDesc[ch.id] || ch.desc) : ch.desc; }

  /* 分类看板：顶部说明 + 图表案例卡 */
  function renderCategoryDash(catId) {
    state.catId = catId;
    state.catChartId = null;
    if (!window.echarts) { withCharts(function () { renderCategoryDash(catId); }); return; }
    var _needD3 = false;
    (function () {
      var _c = findCat(catId);
      if (_c) _c.charts.forEach(function (ch) { if (SHOWCASE_TYPES[ch.type]) _needD3 = true; });
    })();
    if (_needD3 && !window.d3) {
      var stD = el('chart-stage');
      if (stD) stD.innerHTML = '<div class="stage-loading"><span class="stage-spinner"></span><span>' + tr('正在加载高级绘图引擎…', 'Loading advanced engine…') + '</span></div>';
      ensureD3().then(function () { renderCategoryDash(catId); }).catch(function () {});
      return;
    }
    clearStage();
    state.mode = 'catalog';
    state.catId = catId;
    state.viewKey = 'cat:' + catId;
    state.currentTemplate = null; state.dataset = null; state.dashboardDatasets = null;
    state.table = null; state.det = null; state.macroItem = null; state.finItem = null;
    state.intlItem = null; state.chartConfig = null; state.macroTypeOverride = null;
    highlightNav('cat:' + catId);
    var cat = findCat(catId);
    if (!cat) { renderHome(); return; }
    setHead({ title: catName(cat), subtitle: cat.charts.length + ' ' + tr('种图表 · 点击任意图表查看大图', 'chart types · click any chart for the full view'), unit: '', source: tr('示例数据 · 随机生成 · 仅演示图表形态', 'Sample data · generated · chart form only') });

    var theme = getChartTheme(); theme._noZoom = true;
    var wrap = document.createElement('div');
    wrap.className = 'cat-dash';

    var intro = document.createElement('div');
    intro.className = 'cat-intro';
    intro.innerHTML =
      '<div class="cat-intro-label">' + tr('这个分类解决什么问题', 'What this category solves') + '</div>' +
      '<div class="cat-intro-text">' + catDesc(cat) + '</div>' +
      '<div class="cat-intro-meta">' + tr('共', '') + ' ' + cat.charts.length + ' ' + tr('种图表', 'chart types') + '</div>';
    wrap.appendChild(intro);
    // 配色选择
    var pal = document.createElement('div');
    pal.className = 'cat-palette';
    var plabel = document.createElement('span');
    plabel.className = 'cat-palette-label';
    plabel.textContent = tr('配色', 'Palette');
    pal.appendChild(plabel);
    (window.ADV_PALETTES || []).forEach(function (pp) {
      var chip = document.createElement('button');
      chip.className = 'pal-chip' + ((state.palette || 'consult') === pp.id ? ' on' : '');
      chip.title = isEn() ? pp.nameEn : pp.name;
      chip.innerHTML = paletteChipColors(pp).slice(0, 4).map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('');
      chip.addEventListener('click', function () {
        state.palette = pp.id;
        renderCategoryDash(catId);
      });
      pal.appendChild(chip);
    });
    wrap.appendChild(pal);

    var grid = document.createElement('div');
    grid.className = 'cat-grid';
    var insts = [];
    cat.charts.forEach(function (ch) {
      var card = document.createElement('div');
      card.className = 'cat-card';
      card.innerHTML =
        '<div class="cat-card-hd">' +
          '<div class="cat-card-name">' + chartName(ch) + '</div>' +
          '<div class="cat-card-desc">' + chartDesc(ch) + '</div>' +
        '</div><div class="cat-chart"></div>' +
        '<div class="cat-card-foot">' + tr('查看大图', 'Open full chart') + ' →</div>';
      card.addEventListener('click', function () { openCatalogChart(catId, ch.id); });
      grid.appendChild(card);
      var cv = card.querySelector('.cat-chart');
      var needMap = GEO_TYPES[ch.type] && !window.WORLD_GEOJSON;
      (needMap ? ensureWorldMap() : Promise.resolve()).then(function () {
        requestAnimationFrame(function () {
        try {
          var inst = ChartFactory.render(cv, ch.type, (window.localizeDemo ? localizeDemo(ch.data()) : ch.data()), theme);
          insts.push({ el: cv, inst: inst, chart: ch });
          setTimeout(function () { try { inst.resize(); } catch (e) {} }, 60);
        } catch (e) { cv.innerHTML = '<div class="cat-err">渲染失败</div>'; }
        });
      });
    });
    wrap.appendChild(grid);
    el('chart-stage').appendChild(wrap);
    state.catInsts = insts;
    syncToolbar();
  }

  /* 分类下的单图详情 */
  function openCatalogChart(catId, chartId) {
    state.catId = catId; state.catChartId = chartId;
    if (!window.echarts) { withCharts(function () { openCatalogChart(catId, chartId); }); return; }
    var _ch0 = findChart(catId, chartId);
    if (_ch0 && SHOWCASE_TYPES[_ch0.type] && !window.d3) {
      var stS = el('chart-stage');
      if (stS) stS.innerHTML = '<div class="stage-loading"><span class="stage-spinner"></span><span>' + tr('正在加载高级绘图引擎…', 'Loading advanced engine…') + '</span></div>';
      ensureD3().then(function () { openCatalogChart(catId, chartId); }).catch(function () {});
      return;
    }
    if (_ch0 && GEO_TYPES[_ch0.type] && !window.WORLD_GEOJSON) {
      var st0 = el('chart-stage');
      if (st0) st0.innerHTML = '<div class="stage-loading"><span class="stage-spinner"></span><span>' + tr('正在加载地图数据…', 'Loading map data…') + '</span></div>';
      ensureWorldMap().then(function () { openCatalogChart(catId, chartId); }).catch(function () {});
      return;
    }
    clearStage();
    state.mode = 'catalogChart';
    state.catId = catId;
    state.catalogChartId = chartId;
    state.viewKey = 'cat:' + catId + ':' + chartId;
    state.currentTemplate = null; state.macroItem = null; state.finItem = null; state.intlItem = null;
    var cat = findCat(catId), ch = findChart(catId, chartId);
    if (!cat || !ch) { renderCategoryDash(catId); return; }
    highlightNav('cat:' + catId);
    setHead({ title: chartName(ch), subtitle: chartDesc(ch), unit: '', source: tr('示例数据 · 随机生成', 'Sample data · generated') });

    var back = document.createElement('div');
    back.className = 'cat-back';
    back.innerHTML = '<span class="cat-back-btn">← ' + tr('返回', 'Back') + ' ' + catName(cat) + '</span>';
    back.addEventListener('click', function () { renderCategoryDash(catId); });
    el('chart-stage').appendChild(back);
    var pal2 = document.createElement('div');
    pal2.className = 'cat-palette cat-palette-detail';
    var pl2 = document.createElement('span');
    pl2.className = 'cat-palette-label';
    pl2.textContent = tr('配色', 'Palette');
    pal2.appendChild(pl2);
    (window.ADV_PALETTES || []).forEach(function (pp) {
      var chip = document.createElement('button');
      chip.className = 'pal-chip' + ((state.palette || 'consult') === pp.id ? ' on' : '');
      chip.title = isEn() ? pp.nameEn : pp.name;
      chip.innerHTML = paletteChipColors(pp).slice(0, 4).map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('');
      chip.addEventListener('click', function () { state.palette = pp.id; openCatalogChart(catId, chartId); });
      pal2.appendChild(chip);
    });
    el('chart-stage').appendChild(pal2);

    var c = document.createElement('div');
    c.className = 'chart-canvas cat-single' + (ch.type === 'archDiagram' ? ' flow-tall' : '');
    el('chart-stage').appendChild(c);
    var theme = getChartTheme(); theme._noZoom = true;
    try {
      var _cdata = (window.localizeDemo ? localizeDemo(ch.data()) : ch.data());
      var inst = ChartFactory.render(c, ch.type, _cdata, theme);
      if (ch.type === 'radar') attachRadarHover(inst, _cdata);
      if (ch.type === 'dumbbell') attachDumbbellHover(inst, _cdata);
      if (ch.type === 'parallel') attachParallelHover(inst, _cdata);
      state.echartsEl = c;
      requestAnimationFrame(function () { try { inst.resize(); } catch (e) {} });
    } catch (e) {}

    var note = document.createElement('div');
    note.className = 'cat-note';
    note.textContent = (ch.type === 'archDiagram')
      ? tr('说明：示例数据，展示分区、节点与连线；切换配色只改变边框与连线颜色。', 'Note: sample zones, nodes and connectors — switching palettes only recolours borders and lines.')
      : tr('说明：本页数据为随机生成，仅用于演示该图表的形态与用途。', 'Note: data on this page is generated to demonstrate the chart form and use case.');
    el('chart-stage').appendChild(note);
    syncToolbar();
  }

  function buildSidebar() {
    var sb = el('sidebar');
    sb.innerHTML = '';
    var T = window.I18N ? window.I18N.t : function (k) { return k; };
    function expando(iconSvg, label, id) {
      var item = document.createElement('div');
      item.className = 'nav-item nav-parent';
      item.dataset.id = id;
      item.innerHTML = '<span class="nav-icon">' + iconSvg + '</span><span>' + label + '</span><span class="nav-caret">' + ICONS.caret + '</span>';
      var sub = document.createElement('div');
      sub.className = 'nav-submenu';
      item.addEventListener('click', function () {
        var open = sub.classList.toggle('open');
        item.classList.toggle('open', open);
      });
      sb.appendChild(item); sb.appendChild(sub);
      return sub;
    }

    // 1. 使用说明
    var home = document.createElement('div');
    home.className = 'nav-item'; home.dataset.id = 'home';
    home.innerHTML = '<span class="nav-icon">' + ICONS.home + '</span><span>' + T('nav.home') + '</span>';
    home.addEventListener('click', function () { state.overlaySeries = []; renderHome(); closeSidebar(); });
    sb.appendChild(home);

    // 2. 图表分类（9 类）
    var catSub = expando(ICONS.charts || ICONS.examples, tr('图表分类', 'Chart Types'), 'catalog');
    (window.CHART_CATALOG || []).forEach(function (cat) {
      var nav = document.createElement('div');
      nav.className = 'nav-item nav-sub';
      nav.dataset.id = 'cat:' + cat.id;
      nav.innerHTML = '<span>' + tr(cat.name, ADV_EN.cat[cat.id] || cat.name) + '</span>';
      nav.addEventListener('click', function () { state.overlaySeries = []; renderCategoryDash(cat.id); closeSidebar(); });
      catSub.appendChild(nav);
    });

    // 3. 数据看板（中国宏观 / 国际宏观 / 金融资产）
    var finSub = expando(ICONS.perf, tr('金融数据', 'Financial Data'), 'cases');
    [['china-macro', T('nav.china'), ICONS.macro, renderChinaMacro],
     ['intl-macro',  T('nav.intl'),  ICONS.globe, renderIntlMacro],
     ['finance',     T('nav.finance'), ICONS.perf, renderFinance]].forEach(function (c) {
      var nav = document.createElement('div');
      nav.className = 'nav-item nav-sub';
      nav.dataset.id = c[0];
      nav.innerHTML = '<span>' + c[1] + '</span>';
      nav.addEventListener('click', function () { state.overlaySeries = []; c[3](); closeSidebar(); });
      finSub.appendChild(nav);
    });
  }


  function highlightNav(id) {
    document.querySelectorAll('.nav-item').forEach(function (n) {
      n.classList.toggle('active', n.dataset.id === id);
    });
  }

  /* ---------- 渲染内置模版 ---------- */
  function renderTemplate(id) {
    state.macroItem = null; state.finItem = null; state.intlItem = null; state.chartConfig = null; state.macroTypeOverride = null;
    var sample = DataLoader.SAMPLES[id];
    if (!sample) return;
    clearStage();
    state.mode = 'template';
    state.isImported = false;
    state.dataset = null; state.dashboardDatasets = null;
    state.currentTemplate = id;
    state.viewKey = 'tpl:' + id;
    highlightNav(id);
    var _tm = (window.DATA_I18N && window.DATA_I18N.tMeta) ? window.DATA_I18N.tMeta(id) : null;
    setHead(_tm ? Object.assign({}, sample.meta, { title: _tm.title, subtitle: _tm.subtitle }) : sample.meta);

    // 注入单位、事件标注、图上说明
    if (sample.data) sample.data.unit = sample.meta.unit;
    var hasEvents = !!(EVENTS[id] && EVENTS[id].length);
    if (sample.data) sample.data.events = (hasEvents && state.showEvents) ? EVENTS[id] : [];
    if (sample.data) sample.data.annotations = echartsAnnotations(state.viewKey);
    if (sample.data) sample.data.seriesColors = state.seriesColors;

    var evBtn = el('btn-events');
    if (evBtn) {
      evBtn.style.display = hasEvents ? '' : 'none';
      evBtn.classList.toggle('active', hasEvents && state.showEvents);
    }

    updateStatBadge(sample);

    var theme = getChartTheme();
    var stage = el('chart-stage');

    if (sample.type === 'candlestick') {
      var pc = document.createElement('div'); pc.className = 'chart-canvas'; stage.appendChild(pc);
      var inst = PriceChart.create(pc, theme);
      PriceChart.setData(inst, sample.data.ohlc);
      applyPriceAnnotations(inst);
      attachPriceAnnotationHandler(inst, pc);
      state.priceInsts.push(inst);
      state.priceEl = pc;
    } else if (sample.type === 'kpi') {
      renderKpi(sample.data);
    } else if (sample.type === 'perf') {
      var perfData = sample.data;
      if (perfData && perfData.nav && perfData.nav.length) {
        var navL = perfData.nav.map(function (p) { return String(p.date); });
        var navV = perfData.nav.map(function (p) { return p.value; });
        var rr = applyTimeRange(navL, [{ name: 'nav', values: navV }]);
        if (rr.labels.length !== navL.length) {
          perfData = Object.assign({}, perfData, {
            nav: rr.labels.map(function (l, i) { return { date: l, value: rr.series[0].values[i] }; })
          });
        }
      }
      var c = document.createElement('div'); c.className = 'chart-canvas'; stage.appendChild(c);
      var ci = ChartFactory.render(c, sample.type, perfData, theme);
      attachAnnotationHandler(ci);
      if (!NO_DECOR_TYPES[sample.type]) attachExtremeLabels(ci);
      state.echartsEl = c;
      renderPerfMetrics(perfData, ci);
    } else if (sample.type === 'worldMap' && state.tableView) {
      renderWorldTable(sample.data);
    } else {
      var c2 = document.createElement('div'); c2.className = 'chart-canvas'; stage.appendChild(c2);
      var renderType = sample.type;
      if (state.overrideType && sample.data && sample.data.labels !== undefined && sample.data.series !== undefined) renderType = state.overrideType;
      var renderData = sample.data;
      if (state.overlaySeries.length && sample.data.labels !== undefined && sample.data.series !== undefined) {
        var merged = mergeOverlaySeries(sample.data.labels, sample.data.series, state.overlaySeries);
        merged.unit = sample.data.unit;
        merged.events = sample.data.events;
        merged.annotations = sample.data.annotations;
        merged.seriesColors = sample.data.seriesColors;
        renderData = merged;
      }
      if (renderData.labels !== undefined && renderData.series !== undefined) {
        var ranged2 = applyTimeRange(renderData.labels, renderData.series);
        if (ranged2.labels !== renderData.labels) {
          renderData = Object.assign({}, renderData, { labels: ranged2.labels, series: ranged2.series });
        }
      }
      var ci2 = ChartFactory.render(c2, renderType, renderData, theme);
      attachAnnotationHandler(ci2);
      if (!NO_DECOR_TYPES[sample.type]) attachExtremeLabels(ci2);
      state.echartsEl = c2;
    }
    var tableBtn = el('btn-table');
    if (tableBtn) tableBtn.style.display = (sample.type === 'worldMap') ? '' : 'none';
    renderEventNotes(hasEvents && state.showEvents ? EVENTS[id] : []);
    var anTypes = { area: 1, step: 1, dual: 1, stacked: 1, stackedBar: 1, line: 1 };
    if (anTypes[sample.type]) analysisFromSample(sample);
    el('hint').textContent = tr('内置示例 · 数据仅本地处理','built-in sample · processed locally');
    syncToolbar();
  }

  function analysisFromSample(sample) {
    var d = sample.data;
    if (!d || !d.labels) return;
    var seriesArr = [];
    if (d.series) seriesArr = d.series;
    else if (d.bars || d.lines) {
      (d.bars || []).forEach(function (b) { seriesArr.push({ name: b.name, values: b.values }); });
      (d.lines || []).forEach(function (l) { seriesArr.push({ name: l.name, values: l.values }); });
    }
    if (seriesArr.length) renderAnalysis(d.labels, seriesArr);
  }

  function renderEventNotes(events) {
    var box = el('event-notes');
    if (!box) return;
    if (!events || !events.length) { box.style.display = 'none'; box.innerHTML = ''; return; }
    box.style.display = '';
    function shortDate(v) {
      var m = String(v === undefined || v === null ? '' : v).match(/(\d{4})\D+(\d{1,2})/);
      return m ? (m[1] + '.' + String(m[2]).padStart(2, '0')) : String(v || '');
    }
    var NUMS = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮'];
    var needNo = events.every(function (e) { return !e.no; }) && events.length > 1;
    var html = '<div class="en-title">' + DT('事件标注') + '</div>';
    events.forEach(function (e, idx) {
      var no = e.no ? '<span class="en-no">' + escHtml(e.no) + '</span>'
                    : (needNo ? '<span class="en-no">' + (NUMS[idx] || (idx + 1)) + '</span>' : '<span class="en-dot"></span>');
      var s = (e.start !== undefined) ? e.start : e.x;
      var en = e.end;
      var time = en ? (shortDate(s) + ' ~ ' + shortDate(en)) : shortDate(s);
      html += '<div class="en-item">' + no + '<b>' + escHtml(DT(e.label)) + '</b>' +
        '<span class="en-time">' + escHtml(time) + '</span>' +
        '<span class="en-desc">' + escHtml(DT(e.desc || '')) + '</span></div>';
    });
    box.innerHTML = html;
  }

  function pmiCategory(name) {
    var s = String(name);
    if (/需求|订单|出口|进口/.test(s)) return '需求';
    if (/生产|产出|开工/.test(s)) return '生产';
    if (/采购|库存|原材料/.test(s)) return '采购库存';
    if (/就业|人员|从业|用工/.test(s)) return '就业';
    if (/配送|供应/.test(s)) return '供应商';
    if (/价格|出厂|购进/.test(s)) return '价格';
    return '其他';
  }

  function clearAnalysis() {
    var box = el('analysis');
    if (box) { box.style.display = 'none'; box.innerHTML = ''; }
  }

  /* 分析板块：各指标本月环比 / 同比变动（PMI 分项按需求/生产/采购/库存分组） */
  function renderAnalysis(labels, seriesArr) {
    var box = el('analysis');
    if (!box) return;
    if (!labels || !labels.length || !seriesArr || !seriesArr.length) { clearAnalysis(); return; }
    var freq = DataLoader.inferFreq(labels);
    var lag = freq === 'month' ? 12 : freq === 'quarter' ? 4 : freq === 'year' ? 1 : 1;
    function pct(cur, base) {
      if (base === undefined || base === null || isNaN(cur) || isNaN(base) || base === 0) return null;
      return (cur - base) / Math.abs(base) * 100;
    }
    function fmtV(x) { return (x === null || x === undefined || isNaN(x)) ? '—' : fmtNum(x); }
    function fmtD(x) {
      if (x === null || x === undefined || isNaN(x)) return '<span class="an-na">—</span>';
      var cls = x >= 0 ? 'pos' : 'neg';
      return '<span class="' + cls + '">' + (x >= 0 ? '+' : '') + x.toFixed(2) + '%</span>';
    }
    var rows = seriesArr.map(function (s) {
      var v = s.values, n = v.length;
      var last = v[n - 1], prev = v[n - 2], base = v[n - 1 - lag];
      return { name: s.name, last: last, mom: pct(last, prev), yoy: pct(last, base), cat: pmiCategory(s.name) };
    }).filter(function (r) { return r.last !== undefined && r.last !== null && !isNaN(r.last); });
    if (!rows.length) { clearAnalysis(); return; }

    var isPMI = rows.some(function (r) { return r.cat !== '其他'; });
    var html = '<div class="an-title">' + DT('数据变动分析') + '<span class="an-sub">' + tr('（最新值 · 环比 · 同比）',' (latest · MoM · YoY)') + '</span></div>';
    if (isPMI) {
      var cats = isEn() ? ['Demand','Output','Inventory','Employment','Suppliers','Prices','Other'] : ['需求', '生产', '采购库存', '就业', '供应商', '价格', '其他'];
      cats.forEach(function (cat) {
        var items = rows.filter(function (r) { return r.cat === cat; });
        if (!items.length) return;
        html += '<div class="an-cat">' + cat + '</div>';
        items.forEach(function (r) { html += anRow(r, fmtV, fmtD); });
      });
    } else {
      html += '<div class="an-cat">' + tr('全部指标','All series') + '</div>';
      rows.forEach(function (r) { html += anRow(r, fmtV, fmtD); });
    }
    box.innerHTML = html;
    box.style.display = '';
  }

  function anRow(r, fmtV, fmtD) {
    return '<div class="an-row"><span class="an-name">' + escHtml(DT(r.name)) + '</span>' +
      '<span class="an-last">' + fmtV(r.last) + '</span>' +
      '<span class="an-delta">' + DT('环比') + ' ' + fmtD(r.mom) + '</span>' +
      '<span class="an-delta">' + DT('同比') + ' ' + fmtD(r.yoy) + '</span></div>';
  }

  function buildPerfMetricsHtml(nav, slice) {
    var full = ML.perfMetrics(nav.map(function (p) { return p.value; }), null, nav.map(function (p) { return p.date; }));
    var win = (slice && slice.length >= 2) ? ML.perfMetrics(slice.map(function (p) { return p.value; }), null, slice.map(function (p) { return p.date; })) : full;
    function pct(x) { return (x === null || x === undefined || isNaN(x)) ? '—' : (x >= 0 ? '+' : '') + (x * 100).toFixed(2) + '%'; }
    function num(x) { return (x === null || x === undefined || isNaN(x)) ? '—' : x.toFixed(2); }
    var rows = [
      [DT('年化收益'), pct(full.annReturn), pct(win.annReturn)],
      [DT('年化波动'), pct(full.annVol), pct(win.annVol)],
      [DT('最大回撤'), pct(full.maxDD), pct(win.maxDD)],
      [DT('夏普比率'), num(full.sharp), num(win.sharp)],
      ['VaR(95%)', pct(full.var95), pct(win.var95)],
      [DT('累计收益'), pct(full.totalReturn), pct(win.totalReturn)]
    ];
    var html = '<div class="perf-head">' + DT('业绩指标') + ' <span class="perf-sub">' + DT('左列全周期 · 右列缩放区间') + '</span></div>';
    rows.forEach(function (r) {
      html += '<div class="perf-row"><span class="perf-name">' + r[0] + '</span><span class="perf-v">' + r[1] + '</span><span class="perf-v win">' + r[2] + '</span></div>';
    });
    return html;
  }

  function makeDraggable(elm) {
    var head = elm.querySelector('.perf-head');
    if (!head) return;
    head.style.cursor = 'move';
    head.addEventListener('mousedown', function (e) {
      e.preventDefault();
      var rect = elm.getBoundingClientRect();
      var offX = e.clientX - rect.left, offY = e.clientY - rect.top;
      function onMove(ev) {
        var stage = el('chart-stage').getBoundingClientRect();
        var x = ev.clientX - stage.left - offX;
        var y = ev.clientY - stage.top - offY;
        elm.style.left = Math.max(0, Math.min(x, stage.width - elm.offsetWidth)) + 'px';
        elm.style.top = Math.max(0, Math.min(y, stage.height - elm.offsetHeight)) + 'px';
        elm.style.right = 'auto';
      }
      function onUp() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function renderPerfMetrics(data, inst) {
    var wrap = document.createElement('div');
    wrap.className = 'perf-metrics';
    wrap.innerHTML = buildPerfMetricsHtml(data.nav);
    el('chart-stage').appendChild(wrap);
    makeDraggable(wrap);
    if (inst && inst.on) {
      inst.on('datazoom', function () {
        var opt = inst.getOption();
        var dz = opt.dataZoom && opt.dataZoom[0];
        var start = dz ? dz.start : 0, end = dz ? dz.end : 100;
        var n = data.nav.length;
        var s = Math.floor(n * start / 100), e = Math.ceil(n * end / 100);
        wrap.innerHTML = buildPerfMetricsHtml(data.nav, data.nav.slice(s, e));
        makeDraggable(wrap);
      });
    }
  }

  /* ---------- 业绩评估模块（上传价格/净值数据） ---------- */
  function renderPerfFromUpload() {
    var table = state.table;
    if (!table) { toast('请先上传数据'); return; }
    var timeCol = state.mapping.timeCol;
    var yCols = state.mapping.yCols.filter(function (c) { return c !== timeCol; });
    if (!yCols.length) { toast('请选择至少一个价格/净值列'); return; }
    var navs = [];
    yCols.forEach(function (col) {
      var nav = [];
      table.rows.forEach(function (r) {
        var v = DataLoader.toNum(r[col]);
        if (!isNaN(v) && v > 0) nav.push({ date: String(r[timeCol]), value: v });
      });
      if (nav.length >= 2) navs.push({ name: col, nav: nav });
    });
    if (!navs.length) { toast('所选列无有效价格数据'); return; }

    clearStage();
    state.mode = 'imported'; state.isImported = true; state.viewKey = 'perf-upload';
    state.macroItem = null; state.chartConfig = null;
    highlightNav(null);
    var evBtn2 = el('btn-events');
    if (cfgEvents) {
      evBtn2.style.display = '';
      evBtn2.classList.toggle('active', state.showEvents);
    } else {
      evBtn2.style.display = 'none';
    }
    el('stat-badge').style.display = 'none';
    el('hint').textContent = '业绩评估 · 基于所选价格/净值列';
    setHead({ title: '业绩评估', subtitle: '', unit: '净值', source: '用户数据' });

    var theme = getChartTheme();
    if (navs.length === 1) {
      // 单指标：净值 + 回撤 + 指标卡
      var data = { name: navs[0].name, nav: navs[0].nav };
      var c = document.createElement('div'); c.className = 'chart-canvas'; el('chart-stage').appendChild(c);
      var ci = ChartFactory.render(c, 'perf', data, theme);
      renderPerfMetrics(data, ci);
      renderFinanceMetricsTable(navs[0].nav.map(function (p) { return p.date; }), [{ name: navs[0].name, values: navs[0].nav.map(function (p) { return p.value; }) }], true);
      state.echartsEl = c;
    } else {
      // 多指标：归一化净值对比（上）+ 首个回撤（下）+ 指标表
      var labels = navs[0].nav.map(function (p) { return p.date; });
      var series = navs.map(function (x) {
        var base = x.nav[0].value;
        var m = {};
        x.nav.forEach(function (p) { m[p.date] = p.value; });
        return { name: x.name, values: labels.map(function (d) { return m[d] ? (m[d] / base) : null; }) };
      });
      var dd = [];
      var peak = -Infinity;
      navs[0].nav.forEach(function (p) { peak = Math.max(peak, p.value); dd.push(Math.round((p.value / peak - 1) * 10000) / 100); });
      var c2 = document.createElement('div'); c2.className = 'chart-canvas'; el('chart-stage').appendChild(c2);
      var inst = echarts.init(c2);
      inst.setOption(buildMultiNavPerfOption(theme, labels, series, dd));
      state.echartsEl = c2;
      renderFinanceMetricsTable(labels, series, true);
      renderPerfTable(navs);
    }
    syncToolbar();
  }

  function buildMultiNavPerfOption(theme, labels, series, dd) {
    return {
      backgroundColor: theme.bg,
      tooltip: {
        trigger: 'axis', confine: true,
        backgroundColor: theme.panel, borderColor: theme.accent + '55', borderWidth: 1,
        textStyle: { color: theme.text, fontSize: 12 }
      },
      legend: { top: 8, textStyle: { color: theme.muted }, data: series.map(function (s) { return s.name; }).concat(['回撤']) },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      grid: [
        { left: 12, right: 16, top: 46, height: '48%', containLabel: true },
        { left: 12, right: 16, bottom: 8, height: '24%', containLabel: true }
      ],
      xAxis: [
        { type: 'category', gridIndex: 0, data: labels, axisLabel: { show: false, color: theme.muted } },
        { type: 'category', gridIndex: 1, data: labels, axisLabel: { color: theme.muted, fontSize: 10 } }
      ],
      yAxis: [
        { type: 'value', gridIndex: 0, scale: true, splitLine: { lineStyle: { color: theme.grid } } },
        { type: 'value', gridIndex: 1, max: 0, axisLabel: { color: theme.muted, fontSize: 10, formatter: '{value}%' }, splitLine: { lineStyle: { color: theme.grid } } }
      ],
      dataZoom: [{ type: 'inside', xAxisIndex: [0, 1], zoomOnMouseWheel: true, moveOnMouseMove: true }],
      series: series.map(function (s, i) {
        return { name: s.name, type: 'line', xAxisIndex: 0, yAxisIndex: 0, data: s.values, symbol: 'none', color: theme.series[i % theme.series.length], lineStyle: { width: 2 } };
      }).concat([
        { name: '回撤', type: 'line', xAxisIndex: 1, yAxisIndex: 1, data: dd, symbol: 'none', color: theme.down, lineStyle: { width: 1.2 }, areaStyle: { color: ChartFactory.hexToRgba(theme.down, 0.18) } }
      ])
    };
  }

  /* 多资产对比表（图表下方）：最新值/涨跌幅/高低/均值 + 价格型再补业绩指标 */
  function renderCompareTable(labels, series) {
    if (!series || series.length < 2) return null;
    var priceLike = series.every(function (s) {
      return s.values.some(function (v) { return v !== null && v !== undefined && !isNaN(v) && v > 0; });
    });
    var rows = ['latest', 'change', 'max', 'min', 'mean'];
    var rowNames = { latest: '最新值', change: '区间涨跌幅', max: '最高', min: '最低', mean: '均值' };
    if (priceLike) {
      rows = rows.concat(['annReturn', 'annVol', 'maxDD', 'sharp']);
      rowNames.annReturn = '年化收益'; rowNames.annVol = '年化波动'; rowNames.maxDD = '最大回撤'; rowNames.sharp = '夏普';
    }
    function stats(values) {
      var vv = values.filter(function (v) { return v !== null && v !== undefined && !isNaN(v); });
      if (vv.length < 2) return null;
      var first = vv[0], last = vv[vv.length - 1];
      var s = { latest: last, change: (first !== 0 ? (last - first) / Math.abs(first) * 100 : null), max: Math.max.apply(null, vv), min: Math.min.apply(null, vv), mean: ML.mean(vv) };
      if (priceLike) { var pm = ML.perfMetrics(vv); s.annReturn = pm.annReturn; s.annVol = pm.annVol; s.maxDD = pm.maxDD; s.sharp = pm.sharp; }
      return s;
    }
    var statsArr = series.map(function (s) { return stats(s.values); });
    var html = '<div class="an-head">' + tr('多资产对比','Multi-asset comparison') + '</div><table class="preview-table"><thead><tr><th>' + DT('指标') + '</th>';
    series.forEach(function (s) { html += '<th>' + DT(s.name) + '</th>'; });
    html += '</tr></thead><tbody>';
    rows.forEach(function (k) {
      html += '<tr><td>' + rowNames[k] + '</td>';
      statsArr.forEach(function (st) {
        var v = st ? st[k] : null;
        var txt = '—';
        if (v !== null && v !== undefined && !isNaN(v)) {
          if (k === 'change' || k === 'annReturn' || k === 'annVol' || k === 'maxDD') txt = (v * 100).toFixed(2) + '%';
          else if (k === 'sharp') txt = v.toFixed(2);
          else txt = fmtNum(v);
        }
        html += '<td>' + txt + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    var wrap = document.createElement('div');
    wrap.className = 'analysis';
    wrap.innerHTML = html;
    el('chart-stage').appendChild(wrap);
    return wrap;
  }

  /* 宏观多指标：下方列出每期数据的明细表 */
  function renderPeriodTable(labels, series) {
    if (!series || series.length < 2) return null;
    var html = '<div class="an-head">分期数据</div>';
    html += '<div style="max-height:340px;overflow:auto"><table class="preview-table"><thead><tr><th>时间</th>';
    series.forEach(function (s) { html += '<th>' + DT(s.name) + '</th>'; });
    html += '</tr></thead><tbody>';
    for (var i = labels.length - 1; i >= 0; i--) {
      html += '<tr><td>' + labels[i] + '</td>';
      for (var j = 0; j < series.length; j++) {
        var v = series[j].values[i];
        html += '<td>' + (v === null || v === undefined || isNaN(v) ? '—' : fmtNum(v)) + '</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table></div>';
    var wrap = document.createElement('div');
    wrap.className = 'analysis';
    wrap.innerHTML = html;
    el('chart-stage').appendChild(wrap);
    return wrap;
  }

  /* 金融资产：业绩指标表（年化回报/波动/回撤/夏普/索提诺/M²/Jensen alpha 等） */
  function financeBenchmark() {
    var found = null;
    financeLoadedItems().forEach(function (it) { if (!found && it.title === '沪深300') found = it; });
    return found;
  }

  /* 债券收益率序列判定：收益率上行 = 债券价格下跌，统计需反向换算 */
  function isYieldSeries(name) {
    return /收益率|国债|利率|yield|rate/i.test(String(name || ''));
  }
  function bondPriceProxy(values) {
    var first = null;
    for (var i = 0; i < values.length; i++) {
      var v = values[i];
      if (v !== null && v !== undefined && isFinite(v) && v > 0) { first = v; break; }
    }
    if (!first) return values.slice();
    return values.map(function (v) {
      if (v === null || v === undefined || !isFinite(v) || v <= 0) return null;
      return 100 * first / v;     // 收益率下行 → 价格上行
    });
  }
  function renderFinanceMetricsTable(labels, series, isFund, levelMode, inst) {
    if (!series || !series.length) return null;
    var wrap = document.createElement('div');
    wrap.className = 'analysis';
    el('chart-stage').appendChild(wrap);

    function build(labels2, series2) {
      var metrics, rows, pctRows, head;
      if (levelMode) {
        function lv(values) {
          var v = values.filter(function (x) { return x !== null && x !== undefined && !isNaN(x); });
          if (!v.length) return null;
          return {
            latest: v[v.length - 1], mean: ML.mean(v),
            max: Math.max.apply(null, v), min: Math.min.apply(null, v),
            change: v[v.length - 1] - v[0], std: ML.std(v)
          };
        }
        metrics = series2.map(function (x) { return lv(x.values); });
        rows = [['latest', DT('最新值')], ['mean', tr('平均值','Mean')], ['max', DT('最高')], ['min', DT('最低')], ['change', tr('区间变化','Change')], ['std', tr('标准差','Std Dev')]];
        pctRows = [];
        head = tr('水平统计（利率/点位 · 不适用收益率指标）','Level statistics (rates / points — return metrics not applicable)');
      } else {
        var bench = isFund ? financeBenchmark() : null;
        var benchVals = bench ? alignSeriesToBase(labels2, bench.labels, bench.series[0].values) : null;
        var yieldFlags = series2.map(function (x) { return isYieldSeries(x.name); });
        var hasYield = yieldFlags.some(Boolean);
        var hasOther = yieldFlags.some(function (f) { return !f; });
        metrics = series2.map(function (x, xi) {
          if (yieldFlags[xi]) {
            /* 债券到期收益率：只给水平统计，不计算收益指标（无法用 YTM 算年化回报） */
            var vv = x.values.filter(function (v) { return v !== null && v !== undefined && !isNaN(v); });
            if (vv.length < 2) return null;
            var first = vv[0], last = vv[vv.length - 1];
            return { latest: last, changeBp: (last - first) * 100,
              bp: (Math.max.apply(null, vv) - Math.min.apply(null, vv)) * 100,
              max: Math.max.apply(null, vv), min: Math.min.apply(null, vv),
              _level: true };
          }
          var m = ML.perfMetrics(x.values, benchVals, labels2);
          m.latest = x.values[x.values.length - 1];
          var vv2 = x.values.filter(function (v) { return v !== null && v !== undefined && !isNaN(v); });
          m.changeBp = null;
          m.bp = null;
          m.max = vv2.length ? Math.max.apply(null, vv2) : null;
          m.min = vv2.length ? Math.min.apply(null, vv2) : null;
          return m;
        });
        if (hasYield || hasOther) {
          rows = [['latest', DT('最新值')], ['changeBp', tr('区间变化 (bp)', 'Change (bp)')], ['bp', tr('区间波幅 (bp)', 'Range (bp)')],
            ['max', DT('最高')], ['min', DT('最低')],
            ['annReturn', DT('年化回报')], ['annVol', DT('年化波动（标准差）')], ['maxDD', DT('最大回撤')],
            ['sharp', DT('夏普比率')], ['totalReturn', DT('累计收益')]];
        } else {
          rows = [['annReturn', DT('年化回报')], ['annVol', DT('年化波动（标准差）')], ['maxDD', DT('最大回撤')], ['sharp', DT('夏普比率')]];
          if (isFund) rows = rows.concat([['sortino', tr('索提诺比率','Sortino')], ['m2', 'M²'], ['alpha', tr('詹森 alpha','Jensen alpha')], ['beta', 'Beta']]);
          rows = rows.concat([['calmar', DT('卡玛比率')], ['var95', 'VaR 95%'], ['totalReturn', DT('累计收益')]]);
        }
        pctRows = ['annReturn', 'annVol', 'maxDD', 'totalReturn', 'var95', 'alpha', 'm2'];
        head = tr('业绩指标','Performance') + (isFund ? tr('（基金 · 基准：沪深300 · 无风险利率 2%）',' (fund · benchmark: CSI 300 · risk-free 2%)') : tr('（无风险利率 2%）',' (risk-free 2%)'));
        if (hasYield) {
          head += tr(' · 债券到期收益率列只做水平统计，不计算收益指标', ' · yield columns show level stats only');
        }
      }
      var html = '<div class="an-head">' + head +
        '<span class="an-sub">' + (labels2.length && labels2.length < labels.length
          ? tr('· 已按当前缩放区间计算', '· computed on the zoomed range') : '') + '</span></div>';
      html += '<div style="overflow:auto"><table class="preview-table"><thead><tr><th>' + DT('指标') + '</th>';
      series2.forEach(function (x) { html += '<th>' + escHtml(DT(x.name)) + '</th>'; });
      html += '</tr></thead><tbody>';
      rows.forEach(function (r) {
        html += '<tr><td>' + r[1] + '</td>';
        metrics.forEach(function (m) {
          var v = m ? m[r[0]] : null;
          var txt = '—';
          if (v !== null && v !== undefined && !isNaN(v)) {
            if (r[0] === 'changeBp' || r[0] === 'bp') txt = (v >= 0 ? '+' : '') + v.toFixed(1);
            else if (r[0] === 'latest' || r[0] === 'max' || r[0] === 'min') txt = fmtNum(v);
            else txt = (pctRows.indexOf(r[0]) >= 0) ? (v * 100).toFixed(2) + '%' : v.toFixed(2);
          }
          html += '<td>' + txt + '</td>';
        });
        html += '</tr>';
      });
      html += '</tbody></table></div>';
      return html;
    }

    wrap.innerHTML = build(labels, series);

    /* 跟随时间轴缩放联动：按可见区间重算业绩指标 */
    if (inst && inst.on) {
      var timer = null;
      inst.on('datazoom', function () {
        if (timer) clearTimeout(timer);
        timer = setTimeout(function () {
          try {
            var opt = inst.getOption();
            var dz = opt.dataZoom && opt.dataZoom[0];
            var st = dz ? dz.start : 0, en = dz ? dz.end : 100;
            var n = labels.length;
            var s0 = Math.floor(n * st / 100), e0 = Math.ceil(n * en / 100);
            if (e0 - s0 < 2) return;
            var sl = labels.slice(s0, e0);
            var ss = series.map(function (x) {
              return { name: x.name, values: x.values.slice(s0, e0) };
            });
            wrap.innerHTML = build(sl, ss);
          } catch (e) {}
        }, 90);
      });
    }
    return wrap;
  }

  function renderPerfTable(navs, slice) {
    var wrap = document.createElement('div');
    wrap.className = 'analysis';
    var rows = ['annReturn', 'annVol', 'maxDD', 'sharp', 'var95', 'totalReturn'];
    var labels2 = { annReturn: '年化收益', annVol: '年化波动', maxDD: '最大回撤', sharp: '夏普比率', var95: 'VaR(95%)', totalReturn: '累计收益' };
    function pct(v) { return (v * 100).toFixed(2) + '%'; }
    function metricsOf(x) {
      var nav = slice ? slice(x.nav) : x.nav;
      return ML.perfMetrics(nav.map(function (p) { return p.value; }), null, nav.map(function (p) { return p.date; }));
    }
    var metrics = navs.map(metricsOf);
    var html = '<div class="an-head">' + tr('业绩指标（基于所选价格/净值列）','Performance (based on selected price / NAV columns)') + '</div><table class="preview-table"><thead><tr><th>' + DT('指标') + '</th>';
    navs.forEach(function (x) { html += '<th>' + escHtml(DT(x.name)) + '</th>'; });
    html += '</tr></thead><tbody>';
    rows.forEach(function (k) {
      html += '<tr><td>' + labels2[k] + '</td>';
      metrics.forEach(function (m) {
        var v = m ? m[k] : null;
        var txt = (v === null || v === undefined) ? '—' : (k === 'sharp' ? v.toFixed(2) : pct(v));
        html += '<td>' + txt + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    wrap.innerHTML = html;
    el('chart-stage').appendChild(wrap);
    return wrap;
  }

  /* 价格型多指标：图表下对比指标表，随缩放区间联动更新 */
  function renderPerfTableLive(inst, navs) {
    var wrap = renderPerfTable(navs);
    if (inst && inst.on) {
      inst.on('datazoom', function () {
        try {
          var opt = inst.getOption();
          var dz = opt.dataZoom && opt.dataZoom[0];
          var start = dz ? dz.start : 0, end = dz ? dz.end : 100;
          wrap.innerHTML = renderPerfTableHtml(navs, function (nav) {
            var n = nav.length;
            var s = Math.floor(n * start / 100), e = Math.ceil(n * end / 100);
            return nav.slice(s, e);
          });
        } catch (e) {}
      });
    }
  }

  function renderPerfTableHtml(navs, slice) {
    var rows = ['annReturn', 'annVol', 'maxDD', 'sharp', 'var95', 'totalReturn'];
    var labels2 = { annReturn: '年化收益', annVol: '年化波动', maxDD: '最大回撤', sharp: '夏普比率', var95: 'VaR(95%)', totalReturn: '累计收益' };
    function pct(v) { return (v * 100).toFixed(2) + '%'; }
    var metrics = navs.map(function (x) { var nav = slice ? slice(x.nav) : x.nav; return ML.perfMetrics(nav.map(function (p) { return p.value; }), null, nav.map(function (p) { return p.date; })); });
    var html = '<div class="an-head">' + tr('业绩指标（基于所选价格/净值列）','Performance (based on selected price / NAV columns)') + '</div><table class="preview-table"><thead><tr><th>' + DT('指标') + '</th>';
    navs.forEach(function (x) { html += '<th>' + escHtml(DT(x.name)) + '</th>'; });
    html += '</tr></thead><tbody>';
    rows.forEach(function (k) {
      html += '<tr><td>' + labels2[k] + '</td>';
      metrics.forEach(function (m) {
        var v = m ? m[k] : null;
        var txt = (v === null || v === undefined) ? '—' : (k === 'sharp' ? v.toFixed(2) : pct(v));
        html += '<td>' + txt + '</td>';
      });
      html += '</tr>';
    });
    return html + '</tbody></table>';
  }

  /* ---------- 机器学习模块（上传数据） ---------- */
  function renderMlFromUpload() {
    var table = state.table, timeCol = state.mapping.timeCol;
    var col = state.mapping.yCols.filter(function (c) { return c !== timeCol; })[0];
    if (!col) { toast('请选择至少一个数值列'); return; }
    var labels = [], values = [];
    table.rows.forEach(function (r) { var v = DataLoader.toNum(r[col]); if (!isNaN(v)) { labels.push(String(r[timeCol])); values.push(v); } });
    if (labels.length < 3) { toast('有效数据点太少，无法做回归'); return; }
    clearStage();
    state.mode = 'imported'; state.isImported = true; state.viewKey = 'ml-upload';
    state.macroItem = null; state.chartConfig = null;
    highlightNav(null);
    el('btn-events').style.display = 'none'; el('stat-badge').style.display = 'none';
    setHead({ title: col + ' · 回归趋势', subtitle: '线性回归 · 95% 置信带', unit: '', source: '用户数据' });
    var theme = getChartTheme();
    var c = document.createElement('div'); c.className = 'chart-canvas'; el('chart-stage').appendChild(c);
    var ci = ChartFactory.render(c, 'mlTrend', { labels: labels, values: values }, theme);
    state.echartsEl = c;
    el('hint').textContent = '机器学习 · 回归趋势与置信带';
    syncToolbar();
  }

  /* ---------- 宏观分析模块（上传数据：同比/环比） ---------- */
  function renderMacroFromUpload() {
    var table = state.table, timeCol = state.mapping.timeCol;
    var labels0 = table.rows.map(function (r) { return String(r[timeCol]); });
    var freq = DataLoader.inferFreq(labels0);
    var lag = (freq === 'month') ? 12 : (freq === 'quarter') ? 4 : 1;
    var sub = DataLoader.pctChange(table, timeCol, lag);
    if (!sub || !sub.rows.length) { toast('无法计算同比/环比'); return; }
    var labels = sub.rows.map(function (r) { return String(r[timeCol]); });
    var cols = sub.columns.filter(function (c) { return c !== timeCol; });
    var series = cols.map(function (c) { return { name: c, values: sub.rows.map(function (r) { return vnum(r[c]); }) }; });
    clearStage();
    state.mode = 'imported'; state.isImported = true; state.viewKey = 'macro-upload';
    state.macroItem = null; state.chartConfig = null;
    highlightNav(null);
    el('btn-events').style.display = 'none'; el('stat-badge').style.display = 'none';
    setHead({ title: (lag === 12 ? '同比' : (lag === 4 ? '环比(季)' : '环比')) + '变化', subtitle: '基于所选指标 · 单位：%', unit: '%', source: '用户数据' });
    var theme = getChartTheme();
    var c = document.createElement('div'); c.className = 'chart-canvas'; el('chart-stage').appendChild(c);
    var ci = ChartFactory.render(c, 'line', { labels: labels, series: series }, theme);
    attachExtremeLabels(ci);
    state.echartsEl = c;
    el('hint').textContent = '宏观分析 · 同比/环比（可在「数据变换」里进一步调整）';
    syncToolbar();
  }

  function suggestGoal(det, table) {
    return 'trend';
  }

  /* 是否价格/净值型（指数点位、股价等，中位数>50） */
  function isPriceLike(table, det) {
    if (!table || !det || !det.numericCols) return false;
    var col = det.numericCols[0];
    if (!col || col === det.timeCol) return false;
    var vals = [];
    table.rows.slice(-300).forEach(function (r) { var v = DataLoader.toNum(r[col]); if (!isNaN(v) && v > 0) vals.push(v); });
    if (vals.length < 3) return false;
    vals.sort(function (a, b) { return a - b; });
    return vals[Math.floor(vals.length / 2)] > 50;
  }

  /* 检测是否"已计算好的相关矩阵"（方阵 + 首列标签与列名一致） */
  function detectCorrMatrix(table, det) {
    if (!table || !det || !det.numericCols || det.numericCols.length < 3) return null;
    if (table.rows.length !== det.numericCols.length) return null;
    var labelCol = det.timeCol;
    if (!labelCol) return null;
    var names = det.numericCols.map(function (c) { return String(c).trim(); });
    var labels = table.rows.map(function (r) { return String(r[labelCol]).trim(); });
    var match = 0;
    names.forEach(function (n, i) { if (labels[i] === n) match++; });
    if (match / names.length < 0.8) return null;
    var matrix = [];
    for (var i = 0; i < names.length; i++) {
      var row = [];
      for (var j = 0; j < names.length; j++) row.push(DataLoader.toNum(table.rows[i][names[j]]));
      matrix.push(row);
    }
    return { names: names, matrix: matrix };
  }

  /* 价格型列把 0 视为"无数据"（指数/资产未成立前填 0） */
  function markZerosAsEmpty(table, det) {
    if (!table || !det || !det.numericCols) return table;
    det.numericCols.forEach(function (col) {
      if (col === det.timeCol) return;
      var vals = [];
      table.rows.forEach(function (r) { var v = DataLoader.toNum(r[col]); if (!isNaN(v) && v > 0) vals.push(v); });
      if (vals.length < 3) return;
      vals.sort(function (a, b) { return a - b; });
      var median = vals[Math.floor(vals.length / 2)];
      if (median > 50) { // 价格/点位型（中位数>50），0 视为无数据
        table.rows.forEach(function (r) { if (DataLoader.toNum(r[col]) === 0) r[col] = ''; });
      }
    });
    return table;
  }

  function renderWorldTable(data) {
    var stage = el('chart-stage');
    var wrap = document.createElement('div');
    wrap.className = 'table-view';
    var rows = data.values.slice().sort(function (a, b) { return b.value - a.value; });
    var html = '<table class="preview-table"><thead><tr><th>国家/地区</th><th>GDP 增速(%)</th></tr></thead><tbody>';
    rows.forEach(function (r) { html += '<tr><td>' + r.name + '</td><td>' + (r.value > 0 ? '+' : '') + r.value + '</td></tr>'; });
    html += '</tbody></table>';
    wrap.innerHTML = html;
    stage.appendChild(wrap);
  }

  function updateStatBadge(sample) {
    var badge = el('stat-badge');
    if (!badge) return;
    // 非时间序列类图表不显示「最新值/变动」角标（避免 489→-410 = -183% 这种无意义读数）
    var noStat = { waterfall: 1, donut: 1, sankey: 1, kpi: 1, treemap: 1, rank: 1, bubble: 1, radar: 1, worldMap: 1, heatmap: 1, perf: 1 };
    if (sample && noStat[sample.type]) { badge.style.display = 'none'; return; }
    var d = sample.data;
    var value = null, delta = null;
    if (d && d.ohlc && d.ohlc.length) {
      var last = d.ohlc[d.ohlc.length - 1], prev = d.ohlc[d.ohlc.length - 2];
      value = last.close;
      if (prev) delta = (last.close - prev.close) / prev.close * 100;
    } else if (d && d.series && d.series.length) {
      var v = d.series[0].values, n = v.length;
      value = v[n - 1];
      if (n >= 2 && typeof v[n - 2] === 'number' && v[n - 2] !== 0) delta = (v[n - 1] - v[n - 2]) / Math.abs(v[n - 2]) * 100;
    } else if (d && Array.isArray(d.values)) {
      var vv = d.values, nn = vv.length;
      value = vv[nn - 1];
      if (nn >= 2 && vv[nn - 2] !== 0) delta = (vv[nn - 1] - vv[nn - 2]) / Math.abs(vv[nn - 2]) * 100;
    }
    if (value === null || value === undefined) { badge.style.display = 'none'; return; }
    badge.style.display = '';
    var html = '<span class="stat-value">' + fmtNum(value) + '</span>';
    if (delta !== null && delta !== undefined && isFinite(delta)) {
      html += '<span class="stat-delta ' + (delta >= 0 ? 'pos' : 'neg') + '">' +
        (delta >= 0 ? '▲' : '▼') + ' ' + Math.abs(delta).toFixed(1) + '%</span>';
    }
    badge.innerHTML = html;
  }

  function renderKpi(data) {
    var stage = el('chart-stage');
    var grid = document.createElement('div');
    grid.className = 'kpi-grid';
    var theme = Themes.active();
    data.cards.forEach(function (card) {
      var cardEl = document.createElement('div');
      cardEl.className = 'kpi-card';
      /* label/value/delta 全部来自分享链接里的 cfg JSON，必须转义后再拼 HTML */
      cardEl.innerHTML =
        '<div class="kpi-label">' + escHtml(DT(card.label)) + '</div>' +
        '<div class="kpi-value">' + escHtml(DT(card.value)) + '</div>' +
        '<div class="kpi-delta ' + (card.dir === 'neg' ? 'neg' : card.dir === 'pos' ? 'pos' : '') + '">' + escHtml(card.delta) + '</div>' +
        '<div class="kpi-spark"></div>';
      grid.appendChild(cardEl);
    });
    stage.appendChild(grid);
    grid.querySelectorAll('.kpi-spark').forEach(function (sparkEl, i) {
      var color = data.cards[i].dir === 'neg' ? theme.chart.down : theme.chart.accent;
      ChartFactory.renderKpiSpark(sparkEl, data.cards[i].spark, theme.chart, color);
    });
  }

  /* ---------- 外观：白天 / 暗夜 / 跟随系统 ---------- */
  var APPEARANCE_KEY = 'afgAppearance';
  var MODE_THEME_KEY = 'afgThemeByMode';

  function systemPrefersDark() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); }
    catch (e) { return false; }
  }

  function readAppearance() {
    try {
      var a = localStorage.getItem(APPEARANCE_KEY);
      if (a === 'light' || a === 'dark' || a === 'system') state.appearance = a;
      var map = JSON.parse(localStorage.getItem(MODE_THEME_KEY) || '{}');
      if (map && typeof map === 'object') {
        if (map.light && Themes.getTheme(map.light) && Themes.modeOf(map.light) === 'light') state.themeByMode.light = map.light;
        if (map.dark && Themes.getTheme(map.dark) && Themes.modeOf(map.dark) === 'dark') state.themeByMode.dark = map.dark;
      }
    } catch (e) {}
  }

  function saveAppearance() {
    try {
      localStorage.setItem(APPEARANCE_KEY, state.appearance);
      localStorage.setItem(MODE_THEME_KEY, JSON.stringify(state.themeByMode || {}));
    } catch (e) {}
  }

  /* system → 按操作系统当前的深浅色取实际档位 */
  function resolvedAppearance() {
    if (state.appearance === 'light' || state.appearance === 'dark') return state.appearance;
    return systemPrefersDark() ? 'dark' : 'light';
  }

  function themeForAppearance(mode) {
    var id = (state.themeByMode || {})[mode];
    if (id && Themes.getTheme(id) && Themes.modeOf(id) === mode) return id;
    return Themes.defaultForMode(mode);
  }

  function appearanceLabel(mode) {
    var en = isEn();
    if (mode === 'light') return en ? 'Light' : '白天';
    if (mode === 'dark') return en ? 'Dark' : '暗夜';
    return en ? 'Follow system' : '跟随系统';
  }

  function appearanceToast(mode, resolved) {
    var en = isEn();
    var base = (en ? 'Appearance: ' : '外观：') + appearanceLabel(mode);
    if (mode === 'system') {
      base += en ? (resolved === 'dark' ? ' (dark now)' : ' (light now)')
                 : (resolved === 'dark' ? '（当前深色）' : '（当前浅色）');
    }
    return base;
  }

  function refreshAppearanceUI() {
    var wrap = el('appearance-switch');
    if (!wrap) return;
    var mode = state.appearance;
    var en = isEn();
    var labels = {
      light: en ? 'Light' : '白天 · 浅色',
      dark: en ? 'Dark' : '暗夜 · 深色',
      system: en ? 'Follow system' : '跟随系统'
    };
    Array.prototype.forEach.call(wrap.querySelectorAll('[data-appearance]'), function (b) {
      var v = b.getAttribute('data-appearance');
      var on = v === mode;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.title = labels[v] || v;
      b.setAttribute('aria-label', labels[v] || v);
    });
  }

  /* mode 省略时沿用当前设置；silent 用于首屏恢复，不弹提示也不重绘 */
  function applyAppearance(mode, opt) {
    opt = opt || {};
    if (mode !== 'light' && mode !== 'dark' && mode !== 'system') mode = 'system';
    state.appearance = mode;
    var resolved = resolvedAppearance();
    var tid = themeForAppearance(resolved);
    state.theme = tid;
    Themes.applyTheme(tid);
    state.themeByMode[resolved] = tid;
    var sel = el('theme-select');
    if (sel) sel.value = tid;
    // 配色芯片是按当前明暗生成的，换档后清掉让菜单重建
    var pm = el('tb-palette-menu');
    if (pm) pm.innerHTML = '';
    refreshAppearanceUI();
    saveAppearance();
    if (!opt.silent) {
      rerender();
      toast(appearanceToast(mode, resolved));
    }
    return resolved;
  }

  function buildAppearanceSwitch() {
    var wrap = el('appearance-switch');
    if (!wrap) return;
    refreshAppearanceUI();
    wrap.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-appearance]') : null;
      if (!b || !wrap.contains(b)) return;
      applyAppearance(b.getAttribute('data-appearance'));
    });
  }

  /* 跟随系统时，用户切换系统深/浅色要立刻跟上 */
  function watchSystemAppearance() {
    if (!window.matchMedia) return;
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function () {
      if (state.appearance !== 'system') return;
      applyAppearance('system', { silent: true });
      try { rerender(); } catch (e) {}
      toast(appearanceToast('system', resolvedAppearance()));
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  function buildThemeSelect() {
    var sel = el('theme-select');
    if (!sel) return;
    Themes.ids().forEach(function (id) {
      var o = document.createElement('option');
      o.value = id;
      var th = Themes.getTheme(id);
      o.dataset.zh = th.short || th.name;
      o.dataset.en = th.en || th.name;
      o.textContent = isEn() ? o.dataset.en : o.dataset.zh;
      o.title = th.name;
      sel.appendChild(o);
    });
    sel.value = state.theme;
    sel.style.display = 'none';   // 整体只保留象牙白，配色在单图功能栏选择
    sel.addEventListener('change', function () {
      state.theme = sel.value;
      Themes.applyTheme(state.theme);
      rerender();
      toast('已切换配色：' + Themes.active().name);
    });
  }

  function rerender() {
    /* 上传数据图表：优先按导入视图重绘（配色/标注/主题切换都要生效） */
    if (state.mode === 'imported' && state.table) { renderUserChart(false); return; }
    if (state.mode === 'season' && state.seasonItem && state.seasonCurrent) {
      openSheirongSeasonItem(state.seasonItem, state.seasonCurrent); return;
    }
    if (state.macroItem) { openMacroItem(state.macroItem, true); return; }
    if (state.finItem) { openFinItem(state.finItem, true); return; }
    if (state.intlItem) { openIntlItem(state.intlItem, true); return; }
    if (state.exploreConfig) { renderExploreFromConfig(); return; }
    if (state.chartConfig) { applyChartConfig(state.chartConfig); return; }
    if (state.mode === 'season' && state.seasonItem) {
      if (state.seasonCurrent) { openSheirongSeasonItem(state.seasonItem, state.seasonCurrent); }
      else { renderSheirongSeason(state.seasonItem); }
      return;
    }
    if (state.mode === 'dashboard') renderDashboard(state.dashboardDatasets, false);
    else if (state.mode === 'dataset') renderDatasetSingle(state.dataset);
    else if (state.mode === 'imported') renderUserChart(false);
    else if (state.mode === 'home') renderHome();
    else renderTemplate(state.currentTemplate);
  }

  /* ---------- 导出 ---------- */
  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function exportImage() {
    var theme = getChartTheme();
    try {
      var imgSrc = null, cw = 0, chh = 0, inst = null;
      if (state.priceEl) {
        var pc = state.priceEl.querySelector('canvas');
        if (pc) { imgSrc = pc.toDataURL('image/png'); cw = pc.width / 2; chh = pc.height / 2; }
      } else if (state.echartsEl) {
        inst = echarts.getInstanceByDom(state.echartsEl);
        if (inst) {
          try { inst.dispatchAction({ type: 'hideTip' }); } catch (e1) {}
          imgSrc = inst.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: theme.bg });
          cw = state.echartsEl.clientWidth; chh = state.echartsEl.clientHeight;
        }
      }
      if (!imgSrc) { toast('当前模版暂不支持导出图片'); return; }

      var W = cw * 2, H = chh * 2;
      var title = (el('chart-title').textContent || '').trim();
      var sub = (el('chart-subtitle').textContent || '').trim();
      var unitEl = el('chart-unit');
      var unit = (unitEl && unitEl.style.display !== 'none' && unitEl.textContent) ? unitEl.textContent.trim() : '';
      var xs = [];
      if (inst) { var o0 = inst.getOption(); xs = (o0.xAxis && o0.xAxis[0] && o0.xAxis[0].data) || []; }
      var rangeTxt = xs.length ? (String(xs[0]) + ' → ' + String(xs[xs.length - 1])) : '';
      var metaParts = [];
      if (sub) metaParts.push(sub);
      if (unit) metaParts.push(tr('单位：', 'Unit: ') + unit);
      var meta = metaParts.join('    ·    ');

      var pad = 28;
      var titleH = title ? 38 : 0;
      var metaH = meta ? 26 : 0;
      var evList = (inst && inst._eventOrder) ? inst._eventOrder : [];
      var evLineH = 24, evH = evList.length ? (26 + evList.length * evLineH + 6) : 0;
      var canvas = document.createElement('canvas');
      canvas.width = W + pad * 2;
      canvas.height = pad + titleH + metaH + H + pad + evH;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
      var yy = pad;
      if (title) {
        ctx.fillStyle = theme.text;
        ctx.font = 'bold 30px Inter, -apple-system, "PingFang SC", sans-serif';
        ctx.textBaseline = 'top'; ctx.textAlign = 'left';
        ctx.fillText(title, pad, yy);
        yy += titleH;
      }
      if (meta) {
        ctx.fillStyle = theme.muted || '#8A8578';
        ctx.font = '15px Inter, -apple-system, "PingFang SC", sans-serif';
        ctx.textBaseline = 'top'; ctx.textAlign = 'left';
        ctx.fillText(meta, pad, yy);
        yy += metaH;
      }
      var contRect = state.echartsEl ? state.echartsEl.getBoundingClientRect() : null;
      var extLabels = state.echartsEl ? state.echartsEl.querySelectorAll('.ext-label') : [];
      var img = new Image();
      img.onload = function () {
        ctx.drawImage(img, pad, yy, W, H);
        // 把极值标注也画进图片
        if (contRect && extLabels.length) {
          extLabels.forEach(function (lb) {
            var r = lb.getBoundingClientRect();
            var lx = pad + (r.left - contRect.left) * 2;
            var ly = yy + (r.top - contRect.top) * 2;
            var lw = r.width * 2, lh = r.height * 2;
            ctx.fillStyle = lb.style.backgroundColor || theme.accent;
            roundRectPath(ctx, lx, ly, lw, lh, 6);
            ctx.fill();
            ctx.fillStyle = lb.style.color || '#FFFFFF';
            ctx.font = 'bold 20px Inter, -apple-system, "PingFang SC", sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(lb.textContent, lx + lw / 2, ly + lh / 2);
            ctx.textAlign = 'left'; ctx.textBaseline = 'top';
          });
        }
        // 事件说明（跟随图片导出）
        if (evList.length) {
          function sd(v) {
            var m = String(v === undefined || v === null ? '' : v).match(/(\d{4})\D+(\d{1,2})/);
            return m ? (m[1] + '.' + String(m[2]).padStart(2, '0')) : String(v || '');
          }
          var ey = yy + H + 18;
          ctx.textAlign = 'left'; ctx.textBaseline = 'top';
          ctx.fillStyle = theme.muted;
          ctx.font = 'bold 13px Inter, -apple-system, "PingFang SC", sans-serif';
          ctx.fillText(DT('事件标注'), pad, ey);
          ey += 26;
          evList.forEach(function (ev) {
            ctx.fillStyle = theme.accent;
            ctx.font = 'bold 15px Inter, -apple-system, "PingFang SC", sans-serif';
            ctx.fillText(ev.no || '', pad, ey);
            ctx.fillStyle = theme.text;
            ctx.font = '14px Inter, -apple-system, "PingFang SC", sans-serif';
            var head = DT(ev.label) + '   ' + sd(ev.start) + ' ~ ' + sd(ev.end);
            ctx.fillText(head, pad + 26, ey);
            var hw = ctx.measureText(head).width;
            if (ev.desc) {
              ctx.fillStyle = theme.muted;
              ctx.font = '13px Inter, -apple-system, "PingFang SC", sans-serif';
              var dx = pad + 26 + hw + 18;
              ctx.fillText(DT(ev.desc), dx, ey + 1, Math.max(60, canvas.width - dx - pad));
            }
            ey += evLineH;
          });
        }
        var a = document.createElement('a');
        a.href = canvas.toDataURL('image/png'); a.download = 'chart.png'; a.click();
        toast('图片已导出');
      };
      img.src = imgSrc;
    } catch (e) { toast('导出失败'); }
  }

  function exportSvg() {
    try {
      if (!state.echartsEl) { toast('当前模版暂不支持导出 SVG'); return; }
      var inst = echarts.getInstanceByDom(state.echartsEl);
      if (!inst) { toast('导出失败'); return; }
      var url = inst.getDataURL({ type: 'svg', backgroundColor: 'transparent' });
      var a = document.createElement('a');
      a.href = url; a.download = 'chart.svg'; a.click();
      toast('SVG 已导出');
    } catch (e) { toast('导出失败'); }
  }

  /* ---------- 数据导入弹层 ---------- */
  function openModal() { el('overlay').classList.add('open'); }
  function closeModal() { el('overlay').classList.remove('open'); }

  function buildTabs() {
    el('tabs').addEventListener('click', function (e) {
      var tab = e.target.closest('.tab');
      if (!tab) return;
      document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t === tab); });
      document.querySelectorAll('.tab-pane').forEach(function (p) { p.classList.toggle('active', p.dataset.pane === tab.dataset.tab); });
    });
  }


  /* ---------- 导入后：制图方式（ADV 推荐 / 我自己选） ---------- */
  var PICK_GROUPS = [
    { name: '趋势', types: [['line', '折线图'], ['area', '面积图'], ['stacked', '堆叠面积'], ['step', '阶梯线'], ['season', '季节性对比'], ['streamgraph', '主题河流图']] },
    { name: '比较', types: [['bar', '柱状图'], ['rank', '横向排名'], ['combo', '柱+线组合'], ['dual', '双轴对比'], ['radar', '雷达图'], ['dumbbell', '哑铃图'], ['bullet', 'KPI 达成'], ['tornado', '龙卷风图']] },
    { name: '构成', types: [['stackedBar', '堆叠柱状'], ['percentBar', '百分比堆叠'], ['pie', '饼图'], ['donut', '环形图'], ['treemap', '矩形树图'], ['sunburst', '旭日图'], ['waterfall', '瀑布图']] },
    { name: '分布', types: [['histogram', '直方图'], ['boxplot', '分布条带'], ['ridge', '山脊图'], ['violin', '小提琴图']] },
    { name: '关系', types: [['scatter', '散点图'], ['bubble', '气泡图'], ['scatterMatrix', '矩阵散点'], ['heatmap', '热力图'], ['corrMatrix', '相关性矩阵']] },
    { name: '流向', types: [['funnel', '漏斗图'], ['sankey', '桑基图']] },
    { name: '地理', types: [['choropleth', '分级统计图'], ['heatMapGeo', '热点地图'], ['symbolMap', '标记地图']] },
    { name: '层级', types: [['tree', '树形图'], ['archDiagram', '系统架构图'], ['orgChart', '组织架构'], ['icicle', '冰柱图'], ['swimlane', '泳道图']] },
    { name: '特殊', types: [['kpi', 'KPI 卡片'], ['control', '控制图'], ['parallel', '平行坐标']] }
  ];
  var PICK_DESC = {
    line: '看趋势与拐点', area: '强调累计量', stacked: '总量与结构', step: '阶跃变化',
    season: '同月跨年对比', streamgraph: '多主题此消彼长',
    bar: '分类对比', rank: '排序展示', combo: '柱看总量、线看比率', dual: '量纲不同的双指标',
    radar: '多维能力', dumbbell: '两期差距', bullet: '对照目标', tornado: '双向对比',
    stackedBar: '分类内部构成', percentBar: '只比结构', pie: '占比（≤6类）', donut: '占比+中心指标',
    treemap: '层级占比', sunburst: '多级圆环', waterfall: '增减拆解',
    histogram: '分布形状', boxplot: '分位区间', ridge: '分布位移', violin: '分布密度',
    scatter: '两变量关系', bubble: '三维关系', scatterMatrix: '多变量两两', heatmap: '二维矩阵',
    corrMatrix: '相关性矩阵',
    funnel: '逐级转化', sankey: '多级分流',
    choropleth: '按地区着色', heatMapGeo: '热点聚集', symbolMap: '按点标记',
    tree: '层级结构', archDiagram: '系统/链路拓扑', orgChart: '组织架构', icicle: '层级占比横条', swimlane: '跨部门流程',
    kpi: '关键指标一屏概览', control: '过程监控', parallel: '多维比较'
  };


  /* ---------- 地理：国家/地区名称映射 ---------- */
  var GEO_NAME_CN = {
    '中国':'China','美国':'United States','德国':'Germany','日本':'Japan','印度':'India','英国':'United Kingdom',
    '法国':'France','意大利':'Italy','加拿大':'Canada','巴西':'Brazil','俄罗斯':'Russia','韩国':'South Korea',
    '澳大利亚':'Australia','西班牙':'Spain','墨西哥':'Mexico','印度尼西亚':'Indonesia','印尼':'Indonesia',
    '荷兰':'Netherlands','沙特阿拉伯':'Saudi Arabia','沙特':'Saudi Arabia','土耳其':'Turkey','瑞士':'Switzerland',
    '波兰':'Poland','阿根廷':'Argentina','瑞典':'Sweden','比利时':'Belgium','泰国':'Thailand','爱尔兰':'Ireland',
    '以色列':'Israel','阿联酋':'United Arab Emirates','新加坡':'Singapore','菲律宾':'Philippines','越南':'Vietnam',
    '马来西亚':'Malaysia','南非':'South Africa','丹麦':'Denmark','挪威':'Norway','奥地利':'Austria','伊朗':'Iran',
    '哥伦比亚':'Colombia','智利':'Chile','芬兰':'Finland','孟加拉国':'Bangladesh','埃及':'Egypt','巴基斯坦':'Pakistan',
    '尼日利亚':'Nigeria','捷克':'Czech Republic','葡萄牙':'Portugal','希腊':'Greece','新西兰':'New Zealand',
    '中国香港':'China','中国台湾':'China','香港':'China','台湾':'China','俄罗斯联邦':'Russia'
  };
  function toMapName(v) {
    var t0 = String(v == null ? '' : v).trim();
    if (!t0) return null;
    if (GEO_NAME_CN[t0]) return GEO_NAME_CN[t0];
    if (/^[A-Za-z][A-Za-z\s\.\-']*$/.test(t0)) return t0;
    return null;
  }
  function countryColScore(table, col) {
    if (!table || !table.rows || !table.rows.length) return 0;
    var hit = 0, tot = 0;
    table.rows.forEach(function (r) {
      var v = String(r[col] == null ? '' : r[col]).trim();
      if (!v) return;
      tot++;
      if (toMapName(v)) hit++;
    });
    return tot ? hit / tot : 0;
  }

  function suggestCharts(det, table) {
    var out = [];
    var nSeries = state.mapping.yCols.length;
    var isTS = det && det.isTimeSeries;

    /* ① 国家/地区列 → 地理分级统计图优先 */
    var geoCol = null;
    if (table) {
      if (countryColScore(table, state.mapping.timeCol) >= 0.6) geoCol = state.mapping.timeCol;
      if (!geoCol) table.columns.forEach(function (c) {
        if (geoCol) return;
        if (c === state.mapping.timeCol) return;
        if (!isNaN(toNum(table.rows[0] && table.rows[0][c]))) return;
        if (countryColScore(table, c) >= 0.6) geoCol = c;
      });
    }
    if (geoCol) {
      out.push({ t: 'choropleth', why: '检测到「' + geoCol + '」是国家/地区，可在世界地图上按数值着色' });
    }

    /* ② 量纲差异大的两个指标 → 柱+线组合 */
    var yc = state.mapping.yCols || [];
    if (yc.length === 2 && table) {
      var med = yc.map(function (c) {
        var vv = table.rows.map(function (r) { return toNum(r[c]); }).filter(function (v) { return isFinite(v); });
        vv.sort(function (a, b) { return a - b; });
        return Math.abs(vv[Math.floor(vv.length / 2)] || 0) || 1;
      });
      var big = Math.max(med[0], med[1]), small = Math.min(med[0], med[1]);
      if (big / small >= 8) {
        out.push({ t: 'combo', why: '两个指标量纲差 ' + Math.round(big / small) + '×，建议柱（总量）+ 线（比率）双轴' });
      }
    }

    if (isTS) {
      out.push({ t: 'line', why: '时间序列最通用：看趋势、拐点与节奏' });
      if (nSeries <= 2) out.push({ t: 'area', why: '强调累积量级，视觉重量更强' });
      else out.push({ t: 'stacked', why: '多个指标叠加：总量与结构同步变化' });
      out.push({ t: 'bar', why: '按周期对比高低，适合离散时点' });
      if (nSeries >= 3) out.push({ t: 'stackedBar', why: '分类内看构成变化' });
    } else {
      out.push({ t: 'rank', why: '分类数据先排序，一眼看出高低' });
      out.push({ t: 'bar', why: '标准分类对比' });
      var n = table ? table.rows.length : 0;
      if (n <= 8) out.push({ t: 'pie', why: '类别不多，适合看占比' });
      out.push({ t: 'donut', why: '占比之外，中心还能放总量' });
    }
    return out.slice(0, 4);
  }


  /* 下拉菜单定位：始终落在视口内（手机端尤其重要） */
  function placeMenu(menu, anchor) {
    if (!menu || !anchor) return;
    menu.style.position = 'fixed';
    menu.style.left = 'auto'; menu.style.right = 'auto';
    var r = anchor.getBoundingClientRect();
    var top = Math.round(r.bottom + 6);
    menu.style.top = top + 'px';
    var mw = menu.offsetWidth || 160;
    var vw = window.innerWidth;
    if (r.left + mw > vw - 8) {
      menu.style.right = '8px';
    } else {
      menu.style.left = Math.max(8, Math.round(r.left)) + 'px';
    }
    // 若下方空间不足，向上翻转
    var mh = menu.offsetHeight || 0;
    if (mh && top + mh > window.innerHeight - 8) {
      menu.style.top = Math.max(8, Math.round(r.top - mh - 6)) + 'px';
    }
  }

  function buildPickSection() {
    var body = el('pick-body');
    if (!body || !state.table) return;
    var mode = state.pickMode || 'rec';
    body.innerHTML = '';
    if (mode === 'rec') {
      var recs = suggestCharts(state.det, state.table);
      var wrap = document.createElement('div');
      wrap.className = 'pick-recs';
      recs.forEach(function (r, i) {
        var card = document.createElement('div');
        card.className = 'pick-rec' + (state.mapping.chartType === r.t ? ' on' : '');
        card.innerHTML = '<div class="pick-rec-hd"><span class="pick-rec-name">' +
          (TYPE_LABELS[r.t] || r.t) + '</span>' + (i === 0 ? '<span class="pick-rec-badge">最推荐</span>' : '') + '</div>' +
          '<div class="pick-rec-why">' + r.why + '</div>';
        card.addEventListener('click', function () { selectChartType(r.t); });
        wrap.appendChild(card);
      });
      body.appendChild(wrap);
      var tip = document.createElement('div');
      tip.className = 'pick-tip';
      tip.textContent = '以上基于数据形状自动推荐。也可以切到「我自己选」指定图表类型。';
      body.appendChild(tip);
    } else {
      PICK_GROUPS.forEach(function (g) {
        var hd = document.createElement('div');
        hd.className = 'pick-group-label';
        hd.textContent = g.name;
        body.appendChild(hd);
        var grid = document.createElement('div');
        grid.className = 'pick-grid';
        g.types.forEach(function (tp) {
          var b = document.createElement('div');
          b.className = 'pick-type' + (state.mapping.chartType === tp[0] ? ' on' : '');
          b.innerHTML = '<b>' + tp[1] + '</b><i>' + (PICK_DESC[tp[0]] || '') + '</i>';
          b.addEventListener('click', function () { selectChartType(tp[0]); });
          grid.appendChild(b);
        });
        body.appendChild(grid);
      });
    }
  }

  function selectChartType(t) {
    state.mapping.chartType = t;
    var sel = el('chart-type');
    if (sel && sel.querySelector('option[value="' + t + '"]')) sel.value = t;
    updateChartTypeHint();
    buildPickSection();
  }

  function buildPickTabs() {
    var tabs = el('pick-mode');
    if (!tabs) return;
    tabs.addEventListener('click', function (e) {
      var b = e.target.closest('.pick-tab');
      if (!b) return;
      state.pickMode = b.dataset.mode;
      Array.prototype.forEach.call(tabs.children, function (x) { x.classList.toggle('on', x === b); });
      buildPickSection();
    });
  }

  function buildGoalCards() {
    var box = el('analysis-goal');
    if (!box) return;
    box.innerHTML = '';
    GOALS.forEach(function (g) {
      var card = document.createElement('div');
      card.className = 'goal-card' + (state.analysisGoal === g.id ? ' on' : '');
      card.dataset.goal = g.id;
      card.innerHTML = '<span class="goal-icon">' + g.icon + '</span><span class="goal-text"><b>' + g.label + '</b><i>' + g.desc + '</i></span>';
      card.addEventListener('click', function () { state.analysisGoal = g.id; buildGoalCards(); });
      box.appendChild(card);
    });
  }

  function buildSampleTab() {
    var list = el('sample-list');
    list.innerHTML = '';
    var samples = [
      { label: '时间序列示例（日期 + 多列数值）', csv: '日期,中国GDP增速,美国GDP增速\n2019,6.0,2.5\n2020,2.2,-2.2\n2021,8.4,5.8\n2022,3.0,1.9\n2023,5.2,2.5\n2024,5.0,2.8' },
      { label: '截面数据示例（分类 + 数值）', csv: '行业,营收增速\n电子,18.2\n医药,12.5\n汽车,9.8\n食品饮料,6.3\n地产,-8.1' }
    ];
    samples.forEach(function (s) {
      var b = document.createElement('button');
      b.className = 'btn';
      b.style.margin = '4px';
      b.textContent = s.label;
      b.addEventListener('click', function () {
        el('csv-text').value = s.csv;
        document.querySelector('.tab[data-tab="csv"]').click();
      });
      list.appendChild(b);
    });
  }

  /* ---------- 解析 + 映射 ---------- */
  function updateChartTypeHint() {
    var hint = el('y-hint');
    if (!hint) return;
    var t = el('chart-type').value;
    if (t === 'radar') hint.textContent = state.transposed
      ? '转置：首列为维度，数值列为实体/对象'
      : '每行 = 一个实体，Y 列为维度指标';
    else if (t === 'rank') hint.textContent = '选 1 列作为排名数值';
    else hint.textContent = '点击选择一列或多列作为数值系列';
  }

  function syncExtremeBtn() {
    var b = el('btn-labels');
    if (b) b.classList.toggle('active', state.labelMode && state.labelMode !== 'off');
  }


  function syncToolbar() {
    document.body.classList.toggle('is-home', state.mode === 'home');
    var tb = el('chart-toolbar');
    if (tb) tb.style.display = (state.mode === 'home' || state.mode === 'macro' || state.mode === 'catalog' || state.mode === 'catalogChart') ? 'none' : '';
    syncExtremeBtn();
    // 只有时间序列 / 多指标对比类图表，才显示 区间、指标、事件
    var isTimeSeries = (state.mode === 'macro' || state.mode === 'template' ||
      (state.mode === 'imported' && state.dataFreq !== 'day') || !!state.macroItem || !!state.intlItem);
    var multi = false;
    if (state.echartsEl) {
      var _i = echarts.getInstanceByDom(state.echartsEl);
      if (_i) { var _o = _i.getOption(); multi = (_o.series || []).length > 1; }
    }
    document.querySelectorAll('.tb-time-only').forEach(function (n) { n.style.display = isTimeSeries ? '' : 'none'; });
    /* 金融视图额外提供 今年以来 / 近3年 */
    (function () {
      var selR = el('toolbar-range');
      if (!selR) return;
      var finView = !!state.finItem || state.mode === 'finance';
      ['ytd', '3y'].forEach(function (v) {
        var opt = selR.querySelector('option[value="' + v + '"]');
        if (finView && !opt) {
          var o = document.createElement('option');
          o.value = v;
          o.textContent = v === 'ytd' ? tr('今年以来', 'YTD') : tr('近3年', 'Last 3Y');
          o.setAttribute('data-i18n-opt', v === 'ytd' ? '今年以来' : '近3年');
          o.setAttribute('data-adv-fin', '1');
          selR.insertBefore(o, selR.querySelector('option[value="5y"]'));
        } else if (!finView && opt && opt.getAttribute('data-adv-fin')) {
          opt.remove();
        }
      });
      if (!finView && (selR.value === 'ytd' || selR.value === '3y')) { selR.value = 'all'; state.timeRange = 'all'; }
    })();
    if (el('btn-events')) el('btn-events').style.display = isTimeSeries ? '' : 'none';
    var sel = el('toolbar-chart-type');
    if (!sel) return;
    var isData = (state.mode === 'imported' || state.mode === 'dataset');
    var isTemplate = (state.mode === 'template');
    var isHighFreq = (state.dataFreq === 'day' && state.mode === 'imported');
    // 示例图/高频数据只做展示，图表类型切换关闭；其他频率可选
    sel.disabled = isTemplate || isHighFreq || !!state.finItem || !(isData || !!state.macroItem);
    if (state.macroItem) {
      var mt = state.macroTypeOverride || state.macroItem.type;
      if (mt && sel.querySelector('option[value="' + mt + '"]')) sel.value = mt;
    } else if (isData) {
      var t = state.mode === 'imported' ? state.mapping.chartType : '';
      if (t && sel.querySelector('option[value="' + t + '"]')) sel.value = t;
    } else if (isTemplate) {
      var s2 = DataLoader.SAMPLES[state.currentTemplate];
      var tv = s2 ? s2.type : '';
      if (tv && sel.querySelector('option[value="' + tv + '"]')) sel.value = tv;
    }
    if (el('tb-swapxy')) el('tb-swapxy').classList.toggle('active', state.transposed);
  }

  function showMapping(table) {
    state.table = table;
    state.uploadedTable = table;
    state.overlaySeries = []; state.macroItem = null; state.finItem = null; state.intlItem = null; state.chartConfig = null; state.macroTypeOverride = null;
    var det0 = DataLoader.detectTable(table);
    if (!det0) { toast('无法解析数据'); return; }
    // 转换 Excel 日期序列号（如 46295 → 2026-09-28）后重新识别
    DataLoader.convertSerialTime(table, det0);
    state.det = DataLoader.detectTable(table) || det0;
    markZerosAsEmpty(table, state.det);
    state.isPriceData = isPriceLike(table, state.det);
    var _lbls = table.rows.slice(0, 20).map(function (r) { return String(r[state.det.timeCol]); });
    state.dataFreq = DataLoader.inferFreq(_lbls);
    /* 智能选定 X 列：
       ① 有国家/地区列 → 用它当分类轴（便于做地图/排名）
       ② 否则若 X 列是「排名/序号」这类无意义列 → 换成第一个文本列 */
    var _geoCol = null, _geoScore = 0;
    table.columns.forEach(function (c) {
      var sc = countryColScore(table, c);
      if (sc >= 0.6 && sc > _geoScore) { _geoScore = sc; _geoCol = c; }
    });
    var _rankLike = function (c) {
      if (/排名|序号|序次|rank|no\.?/i.test(String(c))) return true;
      var vals = table.rows.map(function (r) { return toNum(r[c]); }).filter(function (v) { return isFinite(v); });
      if (vals.length < 5) return false;
      var sorted = vals.slice().sort(function (a, b) { return a - b; });
      var seq = true;
      for (var i = 0; i < sorted.length; i++) { if (Math.abs(sorted[i] - (i + 1)) > 1e-9) { seq = false; break; } }
      return seq;
    };
    var _xCol = state.det.timeCol;
    if (_geoCol) _xCol = _geoCol;
    else if (_rankLike(_xCol)) {
      var txtCol = table.columns.filter(function (c) {
        return c !== _xCol && table.rows.some(function (r) { return String(r[c] || '').trim() !== '' && !isFinite(toNum(r[c])); });
      })[0];
      if (txtCol) _xCol = txtCol;
    }
    state.mapping.timeCol = _xCol;
    state.mapping.yCols = state.det.ohlc ? [] : state.det.numericCols.filter(function (c) {
      return c !== _xCol && !_rankLike(c);
    });
    state.mapping.chartType = state.det.ohlc ? 'candlestick'
      : (_geoCol ? 'choropleth' : (state.det.isTimeSeries ? 'line' : 'bar'));
    state.transposed = false;
    if (el('btn-swapxy')) el('btn-swapxy').classList.remove('active');

    el('mapping-area').style.display = '';
    el('dataset-picker').style.display = 'none';
    var info = '检测到 ' + table.rows.length + ' 行 × ' + table.columns.length + ' 列 · 推荐：' +
      (TYPE_LABELS[state.mapping.chartType] || state.mapping.chartType) + '　|　X 列：' + state.mapping.timeCol;
    if (state.det.ohlc) info += '　·　已识别 OHLC 列';
    else if (state.det.isTimeSeries) info += '（时间序列）';
    else info += '（分类/实体）';
    if (state.mapping.yCols.length >= 4) info += '　·　检测到多个指标，建议拆分为多个图表';
    var goal = suggestGoal(state.det, table);
    state.analysisGoal = goal; buildGoalCards();
    var goalLabel = { trend: '趋势图', perf: '业绩评估', kline: 'K线' }[goal] || '趋势图';
    el('detect-info').textContent = info;
    state.pickMode = 'rec';
    buildPickTabs();
    buildPickSection();
    updateChartTypeHint();
    var splitBtn = el('btn-split');
    if (splitBtn) splitBtn.style.display = (state.mapping.yCols.length >= 2) ? '' : 'none';

    // X 列
    var xSel = el('x-col');
    xSel.innerHTML = '';
    table.columns.forEach(function (c) {
      var o = document.createElement('option');
      o.value = c; o.textContent = c;
      xSel.appendChild(o);
    });
    xSel.value = state.mapping.timeCol;

    // Y 列 chips
    renderYChips();
    updatePreview();
  }


  /* ---------- 雷达图：期数（月份）多选 ---------- */
  function radarCandidates() {
    if (!state.table || !state.table.columns || !state.det) return [];
    var wide = state.det.orientation === 'wide';
    if (state.transposed) wide = !wide;
    if (wide) return state.det.numericCols.slice();
    return state.table.rows.map(function (r) { return String(r[state.det.timeCol]); });
  }
  function renderRadarPicker() {
    var box = el('radar-picker');
    if (!box) return;
    var isRadar = state.mapping.chartType === 'radar';
    box.style.display = isRadar ? '' : 'none';
    if (!isRadar) return;
    var cands = radarCandidates();
    if (!cands.length) { box.style.display = 'none'; return; }
    if (!state.radarPick || !state.radarPick.length) {
      state.radarPick = cands.slice(-3);          // 默认最近 3 期
    }
    state.radarPick = state.radarPick.filter(function (c) { return cands.indexOf(c) >= 0; });
    if (!state.radarPick.length) state.radarPick = cands.slice(-3);
    var wide = state.det.orientation === 'wide';
    if (state.transposed) wide = !wide;
    el('rp-sub').textContent = '（每条曲线 = 一个' + (wide ? '月份' : '时期') + '，选 2–4 条最清晰 · 当前 ' + state.radarPick.length + ' 条）';
    var chips = el('rp-chips');
    chips.innerHTML = '';
    cands.forEach(function (c) {
      var d = document.createElement('div');
      d.className = 'rp-chip' + (state.radarPick.indexOf(c) >= 0 ? ' on' : '');
      d.textContent = c;
      d.addEventListener('click', function () {
        var i = state.radarPick.indexOf(c);
        if (i >= 0) state.radarPick.splice(i, 1);
        else state.radarPick.push(c);
        if (!state.radarPick.length) state.radarPick = [c];
        renderRadarPicker(); updatePreview();
      });
      chips.appendChild(d);
    });
    Array.prototype.forEach.call(el('rp-presets').children, function (btn) {
      btn.classList.remove('active');
      btn.onclick = function () {
        var n = btn.getAttribute('data-n');
        state.radarPick = (n === 'all') ? cands.slice() : cands.slice(-parseInt(n, 10));
        renderRadarPicker(); updatePreview();
      };
    });
  }

  function renderYChips() {
    var box = el('y-cols');
    box.innerHTML = '';
    var numericCols = state.det.numericCols;
    numericCols.forEach(function (c) {
      var chip = document.createElement('div');
      chip.className = 'col-chip' + (state.mapping.yCols.indexOf(c) >= 0 ? ' on' : '');
      chip.textContent = c;
      chip.addEventListener('click', function () {
        var idx = state.mapping.yCols.indexOf(c);
        if (idx >= 0) state.mapping.yCols.splice(idx, 1);
        else state.mapping.yCols.push(c);
        chip.classList.toggle('on');
      });
      box.appendChild(chip);
    });
    if (!numericCols.length) box.innerHTML = '<span class="hint">未检测到数值列</span>';
  }

  function updatePreview() {
    var table = state.table;
    var tbl = el('preview-table');
    if (!tbl) return;
    if (!table || !table.columns) { tbl.innerHTML = '<tbody><tr><td class="hint">暂无数据</td></tr></tbody>'; return; }
    var timeCol = state.mapping.timeCol;
    var html = '<thead><tr>';
    table.columns.forEach(function (c) {
      var cls = 'pv-th';
      if (c === timeCol) cls += ' pv-x';
      else if (state.mapping.yCols.indexOf(c) >= 0) cls += ' pv-y';
      /* 列名来自用户上传的文件，属性值和文本都要转义 */
      html += '<th class="' + cls + '" data-col="' + escHtml(c) + '" title="' + (c === timeCol ? 'X / 时间列' : '点击选择/取消该列作为 Y 数值') + '">' + escHtml(c) + '</th>';
    });
    html += '</tr></thead><tbody>';
    table.rows.slice(0, 60).forEach(function (r) {
      html += '<tr>';
      table.columns.forEach(function (c) {
        var cls = (c === timeCol) ? 'pv-x' : ((state.mapping.yCols.indexOf(c) >= 0) ? 'pv-y' : '');
        html += '<td class="' + cls + '">' + escHtml(fmt2(r[c])) + '</td>';
      });
      html += '</tr>';
    });
    if (table.rows.length > 60) html += '<tr><td colspan="' + table.columns.length + '" class="pv-more">… 共 ' + table.rows.length + ' 行，仅预览前 60 行（可用下方「数据行范围」选取区间）</td></tr>';
    html += '</tbody>';
    tbl.innerHTML = html;
    // 表头点击切换 Y 列
    tbl.querySelectorAll('th.pv-th').forEach(function (th) {
      th.addEventListener('click', function () {
        var col = th.dataset.col;
        if (col === timeCol) return;
        var idx = state.mapping.yCols.indexOf(col);
        if (idx >= 0) state.mapping.yCols.splice(idx, 1);
        else state.mapping.yCols.push(col);
        renderYChips();
        updatePreview();
      });
    });
  }

  /* 应用数据行范围（选择数据区间后重新识别） */
  function applyRowRange() {
    if (!state.table) return;
    var n = state.table.rows.length;
    var s = parseInt(el('row-start').value, 10), e = parseInt(el('row-end').value, 10);
    if (isNaN(s)) s = 1;
    if (isNaN(e)) e = n;
    if (s < 1 || e > n || s > e) { toast('行范围无效（1 ~ ' + n + '）'); return; }
    state.table.rows = state.table.rows.slice(s - 1, e);
    showMapping(state.table);
    toast('已选择第 ' + s + ' ~ ' + e + ' 行，共 ' + state.table.rows.length + ' 行');
  }

  /* 构建雷达图数据：wide=转置方向（首列为维度、数值列为实体），否则实体为行、维度为列 */
  function buildRadarData(rows, timeCol, yCols, wide) {
    function ceilMax(vals) { return Math.ceil(Math.max.apply(null, vals.concat([0])) * 1.3); }
    if (wide) {
      var labels = rows.map(function (r) { return String(r[timeCol]); });
      return {
        indicators: labels.map(function (lbl, i) {
          var vals = yCols.map(function (col) { return toNum(rows[i][col]); }).filter(function (v) { return v !== null && v !== undefined && isFinite(v); });
          return { name: lbl, max: ceilMax(vals) };
        }),
        series: yCols.map(function (col) {
          return { name: col, values: rows.map(function (r) { return vnum(r[col]); }) };
        })
      };
    }
    return {
      indicators: yCols.map(function (col) {
        var vals = rows.map(function (r) { return vnum(r[col]); }).filter(function (v) { return v !== null && v !== undefined && isFinite(v); });
        return { name: col, max: ceilMax(vals) };
      }),
      series: rows.map(function (r) {
        return { name: String(r[timeCol]), values: yCols.map(function (col) { return vnum(r[col]); }) };
      })
    };
  }


  /* 从导入表格构造系统架构图：
     ① 有两个文本列（如 上游/下游、调用方/被调方）→ 当作边表，按最长路径分层
     ② 只有一个文本列 → 生成单列节点卡片（无连线）
     数值列作为节点副标题或连线标注 */
  function buildArchFromTable(rows, table, yCols) {
    var cols = (table && table.columns) || [];
    var textCols = cols.filter(function (c) {
      return !rows.some(function (r) { return isFinite(vnum(r[c])) && String(r[c] || '').trim() !== ''; }) ||
        rows.filter(function (r) { var v = String(r[c] || '').trim(); return v && isNaN(Number(v)); }).length > rows.length * 0.6;
    });
    var fromCol = null, toCol = null;
    cols.forEach(function (c) {
      if (!fromCol && /源|from|上游|调用方|父|依赖方/i.test(c)) fromCol = c;
      if (!toCol && /目标|to|下游|被调|子级|依赖对象/i.test(c)) toCol = c;
    });
    if (!fromCol && textCols.length >= 2) { fromCol = textCols[0]; toCol = textCols[1]; }
    if (fromCol && toCol && fromCol === toCol) toCol = null;

    var labelCol = fromCol || textCols[0] || state.mapping.timeCol;
    var valCol = yCols[0] || null;
    var nameOf = function (r) {
      var v = String(r[labelCol] === undefined ? '' : r[labelCol]).trim();
      return v.length > 16 ? v.slice(0, 15) + '…' : v;
    };
    var fmtVal = function (r) {
      if (!valCol) return '';
      var v = vnum(r[valCol]);
      if (!isFinite(v)) return '';
      return String(Math.round(v * 100) / 100);
    };

    var groups = [], nodes = [], edges = [];
    if (fromCol && toCol) {
      /* 边表 → 分层布局 */
      var adj = {}, order = [];
      rows.forEach(function (r) {
        var a = String(r[fromCol] === undefined ? '' : r[fromCol]).trim();
        var b = String(r[toCol] === undefined ? '' : r[toCol]).trim();
        if (!a || !b || a === b) return;
        if (!adj[a]) { adj[a] = []; order.push(a); }
        if (!adj[b]) { adj[b] = []; order.push(b); }
        adj[a].push({ to: b, row: r });
      });
      if (order.length < 2) return null;
      var depth = {};
      order.forEach(function (n) { depth[n] = 0; });
      for (var it = 0; it < 12; it++) {
        var changed = false;
        order.forEach(function (n) {
          (adj[n] || []).forEach(function (e2) {
            if (depth[e2.to] < depth[n] + 1) { depth[e2.to] = depth[n] + 1; changed = true; }
          });
        });
        if (!changed) break;
      }
      var maxDepth = 0;
      order.forEach(function (n) { maxDepth = Math.max(maxDepth, depth[n]); });
      maxDepth = Math.min(maxDepth, 5);
      var layers = [];
      for (var li = 0; li <= maxDepth; li++) layers.push([]);
      order.forEach(function (n) { layers[Math.min(maxDepth, depth[n])].push(n); });
      var nz = layers.length;
      var W = 1220, zoneGap = 18, zoneW = Math.min(300, (W - 40 - (nz - 1) * zoneGap) / nz);
      var maxNodes = 1;
      layers.forEach(function (l) { maxNodes = Math.max(maxNodes, l.length); });
      var nodeH = 58, nodeGap = 18;
      var H = 84 + maxNodes * (nodeH + nodeGap) + 20;
      var zoneLabel = function (i) { return nz <= 1 ? '全部' : (i === 0 ? '入口层' : (i === nz - 1 ? '终端层' : '第 ' + (i + 1) + ' 层')); };
      var pos = {};
      layers.forEach(function (layer, zi) {
        var zx = 20 + zi * (zoneW + zoneGap);
        var zh = H - 40;
        groups.push({ label: zoneLabel(zi), x: zx, y: 20, w: zoneW, h: zh });
        var startY = 20 + (zh - (layer.length * nodeH + (layer.length - 1) * nodeGap)) / 2;
        layer.forEach(function (nm, ni) {
          var ny = startY + ni * (nodeH + nodeGap) + nodeH / 2;
          var r0 = rows.filter(function (r) { return String(r[fromCol]).trim() === nm || String(r[toCol]).trim() === nm; })[0];
          nodes.push({ id: nm, label: nm.length > 16 ? nm.slice(0, 15) + '…' : nm, sub: r0 ? fmtVal(r0) : '', x: zx + zoneW / 2, y: ny, w: zoneW - 44, h: nodeH });
          pos[nm] = { x: zx + zoneW / 2, y: ny, w: zoneW - 44, h: nodeH };
        });
      });
      rows.forEach(function (r) {
        var a = String(r[fromCol] === undefined ? '' : r[fromCol]).trim();
        var b = String(r[toCol] === undefined ? '' : r[toCol]).trim();
        if (!a || !b || a === b || !pos[a] || !pos[b]) return;
        var pa = pos[a], pb = pos[b];
        var sx = pa.x + pa.w / 2, ex = pb.x - pb.w / 2;
        var mx = sx + Math.max(18, (ex - sx) / 2);
        var labY = Math.abs(pb.y - pa.y) > 26 ? (pa.y + pb.y) / 2 : pa.y - 12;
        edges.push({ from: a, to: b, label: fmtVal(r) || '', labelAt: [mx + (labY === pa.y - 12 ? 0 : 14), labY],
          pts: [[sx, pa.y], [mx, pa.y], [mx, pb.y], [ex, pb.y]] });
      });
      return { groups: groups, nodes: nodes, edges: edges };
    }

    /* 单列：一行一个节点，三列铺排 */
    var names = [];
    rows.forEach(function (r) {
      var nm = nameOf(r);
      if (nm) names.push({ name: nm, sub: fmtVal(r) });
    });
    if (!names.length) return null;
    names = names.slice(0, 18);
    var perRow = 3, gapX = 24, gapY = 22, cw = 250, ch = 64;
    var zRows = Math.ceil(names.length / perRow);
    var W2 = 1020, H2 = 80 + zRows * (ch + gapY) + 20;
    groups.push({ label: '系统 / 模块', x: 20, y: 20, w: W2 - 40, h: H2 - 40 });
    names.forEach(function (it, i) {
      var ci = i % perRow, ri = Math.floor(i / perRow);
      var x = 20 + 30 + ci * (cw + gapX) + cw / 2;
      var y = 60 + ri * (ch + gapY) + ch / 2;
      nodes.push({ id: 'n' + i, label: it.name, sub: it.sub, x: x, y: y, w: cw, h: ch });
    });
    return { groups: groups, nodes: nodes, edges: edges };
  }

  function renderUserChart(closeAfter) {
    if (!window.echarts) { withCharts(function () { renderUserChart(closeAfter); }); return; }
    /* 部分类型（架构图等）走 D3 渲染，先确保 D3 就绪 */
    var _ut = state.mapping && state.mapping.chartType;
    if (SHOWCASE_TYPES[_ut] && !window.d3) {
      var stU = el('chart-stage');
      if (stU) stU.innerHTML = '<div class="stage-loading"><span class="stage-spinner"></span><span>' + tr('正在加载高级绘图引擎…', 'Loading advanced engine…') + '</span></div>';
      ensureD3().then(function () { renderUserChart(closeAfter); }).catch(function (err) {
        if (window.console && console.error) console.error('[ADV] d3 render failed', err);
        toast(tr('图表渲染失败', 'Chart failed to render') + (err && err.message ? '：' + err.message : ''), true);
      });
      return;
    }
    state.macroItem = null; state.finItem = null; state.intlItem = null; state.chartConfig = null; state.macroTypeOverride = null;
    var m = state.mapping;
    var table = state.table;
    if (!table) return;
    state.viewKey = 'imported';
    el('btn-events').style.display = 'none';
    el('stat-badge').style.display = 'none';
    var rows = DataLoader.sortRowsByTime(table.rows, state.mapping.timeCol);
    var theme = getChartTheme();

    // 相关矩阵 → 默认热力图
    var corrM = detectCorrMatrix(table, state.det);
    if (corrM) {
      clearStage();
      state.mode = 'imported'; state.isImported = true; state.currentTemplate = null;
      state.dataset = null; state.dashboardDatasets = null;
      highlightNav(null);
      var cm = document.createElement('div'); cm.className = 'chart-canvas'; el('chart-stage').appendChild(cm);
      ChartFactory.render(cm, 'matrixHeat', corrM, theme);
      state.echartsEl = cm;
      setHead({ title: '相关系数矩阵', subtitle: '热力图 · 数值为相关系数', unit: '', source: '用户数据' });
      el('hint').textContent = '相关矩阵热力图';
      syncToolbar();
      if (closeAfter !== false) closeModal();
      return;
    }

    if (m.chartType === 'candlestick') {
      if (!state.det.ohlc) { toast('未检测到 open/high/low/close 列'); return; }
      var o = state.det.ohlc;
      var ohlc = rows.map(function (r) {
        return {
          time: normalizeTime(r[o.time]),
          open: toNum(r[o.open]), high: toNum(r[o.high]),
          low: toNum(r[o.low]), close: toNum(r[o.close]),
          volume: o.volume ? toNum(r[o.volume]) : 0
        };
      }).filter(function (d) { return isFinite(d.open) && isFinite(d.close); });
      if (!ohlc.length) { toast('K 线数据无效'); return; }
      clearStage();
      var pc = document.createElement('div'); pc.className = 'chart-canvas'; el('chart-stage').appendChild(pc);
      var inst = PriceChart.create(pc, theme);
      PriceChart.setData(inst, ohlc);
      applyPriceAnnotations(inst);
      attachPriceAnnotationHandler(inst, pc);
      state.priceInsts.push(inst);
      state.priceEl = pc;
      setHead({ title: '用户数据 · K 线', subtitle: '', unit: '', source: '' });
    } else {
      var yCols = state.mapping.yCols.slice();
      if (!yCols.length) { toast('请至少选择一个数值列'); return; }
      var labels = rows.map(function (r) { return String(r[state.mapping.timeCol]); });
      var type = state.mapping.chartType;
      var data;
      if (type === 'choropleth') {
        /* 找到国家/地区列（优先 X 列，其次自动识别） */
        var geoCol = state.mapping.timeCol;
        if (countryColScore(table, geoCol) < 0.6) {
          var bestCol = null, bestScore = 0;
          table.columns.forEach(function (c) {
            if (c === state.mapping.timeCol) return;
            if (!isNaN(toNum(rows[0] && rows[0][c]))) return;
            var sc = countryColScore(table, c);
            if (sc > bestScore) { bestScore = sc; bestCol = c; }
          });
          if (bestCol) geoCol = bestCol;
        }
        var valCol = yCols[0];
        var gdata = rows.map(function (r) {
          var nm = toMapName(r[geoCol]);
          if (!nm) return null;
          return { name: nm, cn: String(r[geoCol]).trim(), value: vnum(r[valCol]) };
        }).filter(function (x) { return x && isFinite(x.value); });
        if (!gdata.length) { toast('未识别到国家/地区名称，无法绘制地图'); return; }
        data = { data: gdata, metric: valCol + (state.det && state.det.orientation === 'wide' ? '' : '') };
        labels = rows.map(function (r) { return String(r[geoCol]); });
      } else if (type === 'funnel') {
        var fv = rows.map(function (r) { return { name: String(r[state.mapping.timeCol]), value: vnum(r[yCols[0]]) }; })
          .filter(function (x) { return isFinite(x.value) && x.value > 0; })
          .sort(function (a, b) { return b.value - a.value; }).slice(0, 8);
        data = { steps: fv };
      } else if (type === 'control') {
        var cv = rows.map(function (r) { return vnum(r[yCols[0]]); }).filter(function (v) { return isFinite(v); });
        if (cv.length < 6) { toast('控制图至少需要 6 个数据点'); return; }
        var cm0 = cv.reduce(function (a, b) { return a + b; }, 0) / cv.length;
        var sd0 = Math.sqrt(cv.reduce(function (a, b) { return a + (b - cm0) * (b - cm0); }, 0) / cv.length) || 1;
        data = { labels: labels.slice(0, cv.length), values: cv,
          mean: cm0, ucl: cm0 + 3 * sd0, lcl: cm0 - 3 * sd0 };
      } else if (type === 'parallel') {
        data = { dims: yCols.slice(0, 6),
          rows: rows.slice(0, 12).map(function (r) {
            return { name: String(r[state.mapping.timeCol]), values: yCols.slice(0, 6).map(function (c) { return vnum(r[c]); }) };
          }) };
      } else if (type === 'combo') {
        var sers = yCols.map(function (c) { return { name: c, values: rows.map(function (r) { return vnum(r[c]); }) }; });
        data = { labels: labels, series: sers };
      } else if (type === 'kpi') {
        clearStage();
        /* 时间序列：末值 + 环比；横截面（如各国/各公司对比）：合计 + 均值 */
        var isTSk = !!(state.det && state.det.isTimeSeries);
        var cards = yCols.map(function (c) {
          var vals = rows.map(function (r) { return vnum(r[c]); }).filter(function (v) { return isFinite(v); });
          var spark = vals.slice(-12);
          if (!isTSk) {
            var sum = vals.reduce(function (a, b) { return a + b; }, 0);
            var avg = vals.length ? sum / vals.length : 0;
            return {
              label: c,
              value: sum === 0 ? '—' : (Math.abs(sum) >= 1000
                ? sum.toLocaleString('en-US', { maximumFractionDigits: 2 }) : String(Math.round(sum * 100) / 100)),
              delta: vals.length ? ('合计 · 均值 ' + (Math.abs(avg) >= 1000
                ? avg.toLocaleString('en-US', { maximumFractionDigits: 2 }) : String(Math.round(avg * 100) / 100))) : '',
              dir: '',
              spark: spark
            };
          }
          var lastV = vals.length ? vals[vals.length - 1] : null;
          var prevV = vals.length > 1 ? vals[vals.length - 2] : null;
          var dlt = (lastV !== null && prevV !== null && prevV !== 0) ? ((lastV - prevV) / Math.abs(prevV) * 100) : null;
          return {
            label: c,
            value: lastV === null ? '—' : (Math.abs(lastV) >= 1000
              ? lastV.toLocaleString('en-US', { maximumFractionDigits: 2 }) : String(Math.round(lastV * 100) / 100)),
            delta: dlt === null ? '' : (dlt >= 0 ? '+' : '') + dlt.toFixed(1) + '%',
            dir: (dlt !== null && dlt < 0) ? 'neg' : 'pos',
            spark: spark
          };
        });
        var kTitle = state.customTitles[state.viewKey] || ('用户数据 · KPI 卡片');
        state.chartConfig = { type: 'kpi', title: kTitle, data: { cards: cards } };
        state.lastChart = state.chartConfig;
        renderKpi({ cards: cards });
        setHead({ title: kTitle, subtitle: '', unit: '', source: '' });
        state.echartsEl = null;
        syncToolbar();
        return;
      } else if (type === 'histogram') {
        /* 单列做分布（多列量纲不同，混在一起会失真），默认取第一列 */
        var hvCol = yCols[0];
        var hv = rows.map(function (r) { return vnum(r[hvCol]); }).filter(function (v) { return isFinite(v); });
        if (hv.length < 5) { toast('直方图至少需要 5 个数值'); return; }
        data = { values: hv, label: hvCol };
      } else if (type === 'boxplot' || type === 'ridge' || type === 'violin') {
        /* 按 X 列分组，每组一个分布 */
        var groups = [], cats = [];
        rows.forEach(function (r) {
          var key = String(r[state.mapping.timeCol]);
          var gi = cats.indexOf(key);
          var vals2 = yCols.map(function (c) { return vnum(r[c]); }).filter(function (v) { return isFinite(v); });
          if (!vals2.length) return;
          if (gi < 0) { cats.push(key); groups.push(vals2); }
          else { groups[gi] = groups[gi].concat(vals2); }
        });
        if (!groups.length) { toast('没有可分组的数值'); return; }
        if (type === 'boxplot') {
          var boxes = groups.map(function (g) {
            var sv = g.slice().sort(function (a, b) { return a - b; });
            var q = function (p2) { var k = (sv.length - 1) * p2, f = Math.floor(k), c2 = Math.ceil(k); return sv[f] + (sv[c2] - sv[f]) * (k - f); };
            return [sv[0], q(0.25), q(0.5), q(0.75), sv[sv.length - 1]];
          });
          data = { categories: cats, boxes: boxes };
        } else {
          data = { labels: cats, groups: groups };
        }
      } else if (type === 'scatter') {
        if (yCols.length >= 2) {
          var pts = rows.map(function (r) { return [vnum(r[yCols[0]]), vnum(r[yCols[1]])]; })
            .filter(function (p2) { return isFinite(p2[0]) && isFinite(p2[1]); });
          data = { points: pts, xName: yCols[0], yName: yCols[1] };
        } else {
          data = { points: rows.map(function (r) { return [vnum(r[state.mapping.timeCol]), vnum(r[yCols[0]])]; })
            .filter(function (p2) { return isFinite(p2[0]) && isFinite(p2[1]); }), xName: state.mapping.timeCol, yName: yCols[0] };
        }
      } else if (type === 'archDiagram') {
        var arch = buildArchFromTable(rows, table, yCols);
        if (!arch) { toast('数据不足以绘制架构图：需要两个文本列（如 上游/下游）或一列系统名称'); return; }
        data = arch;
      } else if (type === 'rank') {
        var col = yCols[0];
        data = { categories: labels, values: rows.map(function (r) { return vnum(r[col]); }), unit: state.det && state.det.unit };
      } else if (type === 'radar') {
        var wide = state.det && state.det.orientation === 'wide';
        if (state.transposed) wide = !wide;
        var pick = state.radarPick || [];
        var rowsR = rows, yColsR = yCols;
        if (pick.length) {
          if (wide) yColsR = yCols.filter(function (c) { return pick.indexOf(c) >= 0; });
          else rowsR = rows.filter(function (r) { return pick.indexOf(String(r[state.mapping.timeCol])) >= 0; });
        }
        data = buildRadarData(rowsR, state.mapping.timeCol, yColsR.length ? yColsR : yCols, wide);
      } else {
        if (state.transposed) {
          data = { labels: yCols, series: rows.map(function (r) {
            return { name: String(r[state.mapping.timeCol]), values: yCols.map(function (col) { return vnum(r[col]); }) };
          })};
        } else {
          var trimmed = trimToDataRange(labels, yCols.map(function (col) {
            return { name: col, values: rows.map(function (r) { return vnum(r[col]); }) };
          }));
          var ranged3 = applyTimeRange(trimmed.labels, trimmed.series);
          data = { labels: ranged3.labels, series: ranged3.series };
        }
      }
      data.annotations = echartsAnnotations(state.viewKey);
      var _skipPerf = (type === 'radar' || type === 'rank' || type === 'pie' || type === 'donut');
      data.seriesColors = state.seriesColors;
      if (!_skipPerf) renderAnalysis(labels, yCols.map(function (col) { return { name: col, values: rows.map(function (r) { return vnum(r[col]); }) }; }));
      clearStage();
      var c = document.createElement('div'); c.className = 'chart-canvas'; el('chart-stage').appendChild(c);
      var uinst = ChartFactory.render(c, type, data, theme);
      if (type === 'radar') attachRadarHover(uinst, data);
      if (type === 'dumbbell') attachDumbbellHover(uinst, data);
      if (type === 'parallel') attachParallelHover(uinst, data);
      attachAnnotationHandler(uinst);
      if (!SHOWCASE_TYPES[type]) attachExtremeLabels(uinst);
      state.echartsEl = c;
      /* 容器高度在插入 DOM 后才确定，补一次 resize 让 D3/ECharts 自适应 */
      requestAnimationFrame(function () {
        try { if (uinst && uinst.resize) uinst.resize(); } catch (e) {}
      });
      setHead({ title: '用户数据 · ' + (TYPE_LABELS[type] || type), subtitle: '', unit: '', source: '' });
      // 价格型多指标：图表下方加对比指标表（随缩放区间更新）
      if (state.isPriceData && yCols.length >= 2 && !_skipPerf) {
        var navsAll = yCols.map(function (col) {
          var nav = [];
          rows.forEach(function (r) { var v = DataLoader.toNum(r[col]); if (!isNaN(v) && v > 0) nav.push({ date: String(r[state.mapping.timeCol]), value: v }); });
          return { name: col, nav: nav };
        }).filter(function (x) { return x.nav.length >= 2; });
        if (navsAll.length >= 2) renderPerfTableLive(uinst, navsAll);
      }
    }
    state.isImported = true;
    state.mode = 'imported';
    state.currentTemplate = null;
    state.dataset = null; state.dashboardDatasets = null;
    highlightNav(null);
    el('hint').textContent = '已加载用户数据';
    syncToolbar();
    if (closeAfter !== false) closeModal();
  }

  /* ---------- 事件绑定 ---------- */
  function bindEvents() {
    el('btn-import').addEventListener('click', openModal);

    /* ---------- 语言切换 ---------- */
    var langBtn = el('btn-lang');
    if (langBtn) {
      langBtn.textContent = (window.I18N && window.I18N.getLang() === 'en') ? '中文' : 'EN';
      langBtn.addEventListener('click', function () {
        var next = (window.I18N.getLang() === 'en') ? 'zh' : 'en';
        window.I18N.setLang(next);
        this.textContent = (next === 'en') ? '中文' : 'EN';
        syncSelectI18n();
        buildSidebar();
        if (state.mode === 'home') renderHome();
        else if (state.mode === 'catalog' && state.catId) renderCategoryDash(state.catId);
        else if (state.mode === 'catalogChart' && state.catId) openCatalogChart(state.catId, state.catChartId);
        else { try { rerender(); } catch (e) { if (window.I18N) window.I18N.apply(); } }
        if (window.I18N) window.I18N.apply();
        refreshAppearanceUI();
        refreshFooter();
        toast(next === 'en' ? 'Switched to English' : '已切换为中文');
      });
    }

    /* ---------- 用户反馈 ---------- */
    var fbOverlay = el('feedback-overlay');
    function closeFeedback() { fbOverlay.classList.remove('open'); }
    function feedbackText() {
      var type = el('fb-type').value;
      var content = (el('fb-content').value || '').trim();
      var contact = (el('fb-contact').value || '').trim();
      var T = window.I18N ? window.I18N.t : function (k) { return k; };
      var typeLabel = type === 'idea' ? T('fb.type.idea') : T('fb.type.bug');
      var view = state.viewKey || state.mode || '-';
      return { type: type, typeLabel: typeLabel, content: content, contact: contact, view: view };
    }
    if (fbOverlay) {
      var fbTrigger = el('btn-feedback');
      if (fbTrigger) fbTrigger.addEventListener('click', function () { fbOverlay.classList.add('open'); });
      el('feedback-close').addEventListener('click', closeFeedback);
      el('feedback-cancel').addEventListener('click', closeFeedback);
      fbOverlay.addEventListener('click', function (e) { if (e.target === fbOverlay) closeFeedback(); });
      el('fb-copy').addEventListener('click', function () {
        var f = feedbackText();
        if (!f.content) { toast('请先填写内容'); return; }
        var txt = '【' + f.typeLabel + '】\n' + f.content + (f.contact ? ('\n联系方式：' + f.contact) : '') + '\n页面：' + f.view + '\n时间：' + new Date().toLocaleString();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(txt).then(function () {
            toast(window.I18N.t('fb.done.copy'));
          }, function () { toast('复制失败，请手动选择'); });
        } else {
          var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); toast(window.I18N.t('fb.done.copy')); } catch (e) {}
          ta.remove();
        }
      });
      el('fb-submit').addEventListener('click', function () {
        var f = feedbackText();
        if (!f.content) { toast('请先填写内容'); return; }
        var body = f.content + '\n\n---\n' + (f.contact ? ('联系方式：' + f.contact + '\n') : '') + '页面：' + f.view + '\n时间：' + new Date().toLocaleString() + '\n语言：' + (window.I18N ? window.I18N.getLang() : 'zh');
        var title = '[' + f.typeLabel + '] ' + f.content.slice(0, 40);
        var url = 'https://github.com/saviorbill/adv/issues/new?labels=feedback&title=' +
          encodeURIComponent(title) + '&body=' + encodeURIComponent(body);
        // 本地留档（便于同一浏览器复看）
        try {
          var hist = JSON.parse(localStorage.getItem('adv_feedback') || '[]');
          hist.push({ type: f.type, content: f.content, contact: f.contact, view: f.view, at: new Date().toISOString() });
          localStorage.setItem('adv_feedback', JSON.stringify(hist.slice(-50)));
        } catch (e) {}
        window.open(url, '_blank');
        toast(window.I18N.t('fb.done.github'));
        el('fb-content').value = ''; el('fb-contact').value = '';
        closeFeedback();
      });
    }
    if (el('btn-more')) el('btn-more').addEventListener('click', function (e) {
      e.stopPropagation();
      var menu = el('tb-menu');
      menu.classList.toggle('open');
      // 手机上：先让按钮滚入可视区，再把菜单固定在屏内
      if (menu.classList.contains('open')) {
        try {
          this.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          var r = this.getBoundingClientRect();
          var mw = menu.offsetWidth || 180;
          var left = Math.min(Math.max(8, r.right - mw), window.innerWidth - mw - 8);
          menu.style.position = 'fixed';
          menu.style.top = Math.round(r.bottom + 6) + 'px';
          menu.style.left = Math.round(Math.max(8, left)) + 'px';
          menu.style.right = 'auto';
        } catch (err) {}
      } else {
        menu.style.position = '';
        menu.style.top = '';
        menu.style.left = '';
        menu.style.right = '';
      }
    });
    document.addEventListener('click', function (e) {
      var menu = el('tb-menu');
      if (menu && menu.classList.contains('open') && !menu.contains(e.target) && e.target !== el('btn-more')) {
        menu.classList.remove('open');
      }
    });
    el('back-btn').addEventListener('click', function () { if (state.backFn) state.backFn(); });
    el('btn-menu').addEventListener('click', toggleSidebar);
    el('sidebar-backdrop').addEventListener('click', closeSidebar);
    el('modal-close').addEventListener('click', closeModal);
    el('overlay').addEventListener('click', function (e) { if (e.target === el('overlay')) closeModal(); });
    el('btn-export').addEventListener('click', exportImage);
    if (el('btn-share-link')) el('btn-share-link').addEventListener('click', copyShareLink);
    el('btn-events').addEventListener('click', function () {
      state.showEvents = !state.showEvents;
      rerender();
    });
    el('btn-annot').addEventListener('click', function () {
      state.annotateMode = !state.annotateMode;
      el('btn-annot').classList.toggle('active', state.annotateMode);
      el('chart-stage').classList.toggle('annot-mode', state.annotateMode);
      el('btn-clear-annot').style.display = state.annotateMode ? '' : 'none';
      if (state.annotateMode) toast('标注模式已开启：点击图表绘图区添加说明');
    });
    el('btn-clear-annot').addEventListener('click', function () {
      state.annotations[state.viewKey] = [];
      rerender();
      toast('已清除当前图表的说明');
    });
    // 数据标注：下拉选择 全部 / 极值 / 关闭
    function setLabelMode(mode) {
      state.labelMode = mode;
      syncExtremeBtn();
      rerenderLabels();
      var m = el('tb-label-menu'); if (m) m.classList.remove('open');
    }
    function rerenderLabels() {
      if (state.mode === 'season' && state.seasonPanels && state.seasonPanels.length) {
        state.seasonPanels.forEach(function (pp) {
          try { applyExtremeLabels(pp.inst); applyLastValueTag(pp.inst); } catch (e) {}
        });
        return;
      }
      if (!state.echartsEl) return;
      var inst = echarts.getInstanceByDom(state.echartsEl);
      if (inst) { applyExtremeLabels(inst); applyLastValueTag(inst); }
    }
    if (el('btn-labels')) el('btn-labels').addEventListener('click', function (e) {
      e.stopPropagation();
      var m = el('tb-label-menu');
      if (!m) return;
      m.classList.toggle('open');
      placeMenu(m, this);
    });
    if (el('lb-all')) el('lb-all').addEventListener('click', function (e) {
      e.stopPropagation();
      var okTypes = { line: 1, area: 1, bar: 1, step: 1, stacked: 1, stackedBar: 1, stackedLine: 1, dual: 1, dualLine: 1, season: 1, groupedBar: 1, dumbbell: 1, bullet: 1, percentBar: 1, histogram: 1, boxplot: 1, violin: 1, ecdf: 1, scatter: 1, corrMatrix: 1, matrixHeat: 1, heatmap: 1, control: 1, streamgraph: 0 };
      var t = (state.lastChart && state.lastChart.type) || '';
      if (state.echoCharts) {}
      var inst0 = state.echartsEl ? echarts.getInstanceByDom(state.echartsEl) : null;
      var st0 = inst0 ? inst0.getOption() : null;
      var sType = st0 && st0.series && st0.series[0] ? st0.series[0].type : '';
      if (sType && ['pie', 'funnel', 'sankey', 'graph', 'sunburst', 'treemap', 'themeRiver', 'map', 'lines', 'effectScatter', 'parallel', 'radar', 'tree', 'custom'].indexOf(sType) >= 0) {
        toast(tr('该图表类型不支持逐点数值标注', 'This chart type does not support per-point labels'));
        var m0 = el('tb-label-menu'); if (m0) m0.classList.remove('open');
        return;
      }
      setLabelMode('all');
    });
    if (el('lb-extreme')) el('lb-extreme').addEventListener('click', function (e) {
      e.stopPropagation();
      if (!window.echarts) return;
      var inst0 = state.echartsEl ? echarts.getInstanceByDom(state.echartsEl) : null;
      var st0 = inst0 ? inst0.getOption() : null;
      var sType = st0 && st0.series && st0.series[0] ? st0.series[0].type : '';
      if (sType && ['pie', 'funnel', 'sankey', 'graph', 'sunburst', 'treemap', 'themeRiver', 'map', 'lines', 'effectScatter', 'parallel', 'radar', 'tree', 'custom'].indexOf(sType) >= 0) {
        toast(tr('该图表类型不支持极值标注', 'This chart type does not support extreme labels'));
        var m1 = el('tb-label-menu'); if (m1) m1.classList.remove('open');
        return;
      }
      setLabelMode('extreme');
    });
    if (el('lb-off')) el('lb-off').addEventListener('click', function (e) { e.stopPropagation(); setLabelMode('off'); });

    // 单图配色
    if (el('btn-palette')) el('btn-palette').addEventListener('click', function (e) {
      e.stopPropagation();
      var m = el('tb-palette-menu');
      if (!m) return;
      if (!m.children.length) {
        (window.ADV_PALETTES || []).forEach(function (p) {
          var b = document.createElement('button');
          b.className = 'btn sm';
          b.innerHTML = '<span style="display:inline-flex;gap:3px;margin-right:7px">' +
            p.colors.slice(0, 5).map(function (c) { return '<i style="width:10px;height:10px;border-radius:2px;background:' + c + ';display:inline-block"></i>'; }).join('') +
            '</span>' + (isEn() ? p.nameEn : p.name);
          b.addEventListener('click', function (ev) {
            ev.stopPropagation();
            state.palette = p.id;
            m.classList.remove('open');
            rerender();
          });
          m.appendChild(b);
        });
      }
      m.classList.toggle('open');
      placeMenu(m, this);
    });
    el('btn-watermark').addEventListener('click', function () {
      state.showWatermark = !state.showWatermark;
      ChartFactory.setWatermark(state.showWatermark);
      el('btn-watermark').classList.toggle('active', state.showWatermark);
      rerender();
    });
    el('btn-table').addEventListener('click', function () {
      state.tableView = !state.tableView;
      el('btn-table').classList.toggle('active', state.tableView);
      el('btn-table').textContent = state.tableView ? '◉ 地图视图' : '☰ 表格视图';
      rerender();
    });
    if (el('btn-transform')) el('btn-transform').addEventListener('click', openTransform);
    el('tf-close').addEventListener('click', closeTransform);
    el('tf-q').addEventListener('click', function () { doTransform('q', el('tf-agg').value); });
    el('tf-y').addEventListener('click', function () { doTransform('y', el('tf-agg').value); });
    el('tf-yoy').addEventListener('click', function () { doTransform('yoy'); });
    el('tf-mom').addEventListener('click', function () { doTransform('mom'); });
    el('tf-cum').addEventListener('click', function () { doTransform('cum'); });
    el('tf-formula-btn').addEventListener('click', doFormula);
    el('tf-apply').addEventListener('click', commitTransform);

    // 标题编辑
    var titleEl = el('chart-title');
    titleEl.addEventListener('blur', function () {
      var t = titleEl.textContent.trim();
      if (t) state.customTitles[state.viewKey] = t;
      else { delete state.customTitles[state.viewKey]; titleEl.textContent = (state.currentMeta && state.currentMeta.title) || '—'; }
    });
    titleEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); } });

    // 工具栏
    if (el('tb-swapxy')) el('tb-swapxy').addEventListener('click', function () {
      if (state.mode !== 'imported' && state.mode !== 'dataset') { toast('X/Y 交换适用于导入的数据'); return; }
      state.transposed = !state.transposed;
      el('tb-swapxy').classList.toggle('active', state.transposed);
      rerender();
    });
    el('toolbar-chart-type').addEventListener('change', function () {
      if (state.macroItem) {
        var CART = { line: 1, area: 1, bar: 1, stacked: 1, stackedLine: 1, stackedBar: 1, step: 1, season: 1 };
        if (CART[this.value]) { state.macroTypeOverride = this.value; openMacroItem(state.macroItem, true); }
        else toast('该指标仅支持 折线/面积/柱状/堆叠');
        return;
      }
      if (state.mode === 'imported') {
        state.mapping.chartType = this.value;
        if (state.chartConfig) {
          var okTypes = ['line', 'area', 'bar', 'stacked', 'stackedLine', 'stackedBar', 'step'];
          if (okTypes.indexOf(this.value) >= 0) state.chartConfig.type = this.value;
        }
        rerender();
      }
      else if (state.mode === 'template') {
        var s = DataLoader.SAMPLES[state.currentTemplate];
        if (s && s.data && s.data.labels !== undefined && s.data.series !== undefined) {
          state.overrideType = this.value; rerender();
        } else toast('该图表暂不支持切换类型');
      } else toast('图表类型切换适用于导入的数据');
    });
    el('toolbar-range').addEventListener('change', function () {
      state.timeRange = this.value;
      rerender();
    });
    if (el('btn-series-color')) el('btn-series-color').addEventListener('click', openColorPanel);
    el('color-close').addEventListener('click', closeColorPanel);
    el('color-list').addEventListener('click', function (e) {
      var t = e.target;
      if (t.classList.contains('color-dot')) {
        state.seriesColors[t.dataset.name] = t.dataset.color;
        rerender();
        openColorPanel();
      } else if (t.classList.contains('color-reset')) {
        delete state.seriesColors[t.dataset.name];
        openColorPanel();
        rerender();
      }
    });
    el('explore-close').addEventListener('click', closeExplore);
    el('explore-source').addEventListener('change', function () { buildExploreItems(this.value); });
    el('explore-generate').addEventListener('click', renderExplore);
    el('explore-clear').addEventListener('click', function () { exploreSel.length = 0; document.querySelectorAll('#explore-items .col-chip.on').forEach(function (c) { c.classList.remove('on'); }); });
    el('data-close').addEventListener('click', closeDataPanel);
    el('save-local').addEventListener('click', saveLocal);
    el('restore-local').addEventListener('click', restoreLocal);
    el('export-json').addEventListener('click', exportJson);
    el('url-load').addEventListener('click', loadDataUrl);
    el('btn-add-indicator').addEventListener('click', openIndicatorPanel);
    el('align-main').addEventListener('change', function () {
      state.alignToMain = this.checked;
      if (state.macroItem) openMacroItem(state.macroItem, true);
      else if (state.finItem) openFinItem(state.finItem, true);
      else if (state.intlItem) openIntlItem(state.intlItem, true);
      else if (state.mode === 'template') renderTemplate(state.currentTemplate);
      else rerender();
    });
    el('indicator-close').addEventListener('click', closeIndicatorPanel);
    el('indicator-list').addEventListener('click', function (e) {
      var chip = e.target.closest('.col-chip');
      if (!chip) return;
      var key = chip.dataset.key;
      var opt = (state._indicatorOptions || []).filter(function (o) { return o.key === key; })[0];
      if (!opt) return;
      var isImported = (state.mode === 'imported' && state.table && !state.macroItem && !state.finItem && !state.intlItem);
      if (isImported) {
        var idx = state.mapping.yCols.indexOf(opt.name);
        if (idx >= 0) state.mapping.yCols.splice(idx, 1);
        else state.mapping.yCols.push(opt.name);
        openIndicatorPanel();
        rerender();
      } else {
        // 叠加模式：把指标加到当前图对比
        var oi = -1;
        state.overlaySeries.forEach(function (x, i) { if (x.key === key) oi = i; });
        if (oi >= 0) state.overlaySeries.splice(oi, 1);
        else state.overlaySeries.push(opt);
        openIndicatorPanel();
        if (state.macroItem) openMacroItem(state.macroItem, true);
        else if (state.finItem) openFinItem(state.finItem, true);
        else if (state.intlItem) openIntlItem(state.intlItem, true);
        else if (state.mode === 'template') renderTemplate(state.currentTemplate);
        else rerender();
      }
    });

    el('csv-parse').addEventListener('click', function () {
      var txt = el('csv-text').value.trim();
      if (!txt) { toast('请先粘贴数据'); return; }
      try { tryParsePasted(txt); }
      catch (e) { toast('解析失败：' + e.message); }
    });

    // 统一文件上传（自动识别类型）
    var drop = el('file-drop');
    var input = el('file-input');
    drop.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () { if (input.files[0]) handleFile(input.files[0]); });
    ['dragover', 'dragenter'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('dragover'); });
    });
    drop.addEventListener('drop', function (e) {
      var f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handleFile(f);
    });

    el('x-col').addEventListener('change', function () { state.mapping.timeCol = el('x-col').value; updatePreview(); });
    el('chart-type').addEventListener('change', function () { state.mapping.chartType = el('chart-type').value; updateChartTypeHint(); renderRadarPicker(); updatePreview(); });
    el('btn-swapxy').addEventListener('click', function () {
      state.transposed = !state.transposed;
      el('btn-swapxy').classList.toggle('active', state.transposed);
      updateChartTypeHint();
      toast(state.transposed ? '已交换 X/Y（转置方向）' : '已恢复默认 X/Y');
    });
    el('render-btn').addEventListener('click', function () {
      var goal = state.analysisGoal || 'trend';
      state.analysisGoal = goal;
      if (goal === 'perf') { renderPerfFromUpload(); closeModal(); return; }
      if (goal === 'kline') { state.mapping.chartType = 'candlestick'; renderUserChart(true); return; }
      if (goal === 'ml') { renderMlFromUpload(); closeModal(); return; }
      if (goal === 'macro') { renderMacroFromUpload(); closeModal(); return; }
      renderUserChart(true);
    });
    el('btn-split').addEventListener('click', renderSplitCharts);
    el('btn-rowrange').addEventListener('click', applyRowRange);
    el('btn-redetect').addEventListener('click', function () { showMapping(state.table); toast('已重新识别并推荐'); });
    el('render-all-btn').addEventListener('click', function () { renderDashboard(state.datasets, true); });

    window.addEventListener('resize', function () {
      ChartFactory.resizeAll();
      (state.catInsts || []).forEach(function (o) { try { o.inst.resize(); } catch (e) {} });
      if (state.labelMode && state.labelMode !== 'off' && state.echartsEl) {
        var rinst = echarts.getInstanceByDom(state.echartsEl);
        if (rinst) applyExtremeLabels(rinst);
      }
    });
  }

  function handleFile(file) {
    var name = (file.name || '').toLowerCase();
    var ext = name.split('.').pop() || '';
    if (ext !== 'csv' && ext !== 'txt' && ext !== 'json' && !window.XLSX) {
      var stF = el('overlay');
      if (stF) toast(tr('正在加载 Excel 解析器…', 'Loading Excel parser…'));
      ensureXLSX().then(function () { handleFile(file); }).catch(function () { toast(tr('Excel 组件加载失败', 'Failed to load Excel parser')); });
      return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        if (ext === 'json') {
          showMapping(DataLoader.parseJSON(e.target.result));
        } else if (ext === 'csv' || ext === 'txt') {
          showMapping(DataLoader.parseCSV(e.target.result));
        } else {
          var datasets = DataLoader.readExcelAll(e.target.result);
          if (!datasets.length) { toast('未在文件中识别到数据表'); return; }
          if (datasets.length === 1) showMapping(datasets[0].table);
          else showDatasetPicker(datasets);
        }
      } catch (err) { toast('文件解析失败：' + err.message); }
    };
    if (ext === 'csv' || ext === 'txt' || ext === 'json') reader.readAsText(file, 'utf-8');
    else reader.readAsArrayBuffer(file);
  }

  /* ============================================================
   * Excel 多表自动解析
   * ============================================================ */
  function countSheets(datasets) {
    var set = {};
    datasets.forEach(function (d) { set[d.sheet] = true; });
    return Object.keys(set).length;
  }

  function datasetToChart(dataset) {
    var det = dataset.detection || DataLoader.detectTable(dataset.table);
    DataLoader.convertSerialTime(dataset.table, det);
    det = DataLoader.detectTable(dataset.table) || det;
    // 按时间升序（最新在右），无论 Excel 原顺序如何
    var rows = DataLoader.sortRowsByTime(dataset.rows || dataset.table.rows, det.timeCol);
    if (det.ohlc) {
      var o = det.ohlc;
      var ohlc = rows.map(function (r) {
        return {
          time: normalizeTime(r[o.time]),
          open: toNum(r[o.open]), high: toNum(r[o.high]),
          low: toNum(r[o.low]), close: toNum(r[o.close]),
          volume: o.volume ? toNum(r[o.volume]) : 0
        };
      }).filter(function (d) { return isFinite(d.open) && isFinite(d.close); });
      return { type: 'candlestick', ohlc: ohlc };
    }
    var timeCol = det.timeCol;
    var numericCols = det.numericCols.filter(function (c) { return c !== timeCol; });
    if (!numericCols.length) numericCols = det.numericCols.slice();
    var labels = rows.map(function (r) { return String(r[timeCol]); });
    var series = numericCols.map(function (col) {
      return { name: col, values: rows.map(function (r) { return vnum(r[col]); }) };
    });
    var trimmed = trimToDataRange(labels, series);
    labels = trimmed.labels; series = trimmed.series;
    var type = det.isTimeSeries ? 'area' : 'bar';
    return { type: type, data: { labels: labels, series: series } };
  }

  function showDatasetPicker(datasets) {
    state.datasets = datasets;
    el('mapping-area').style.display = 'none';
    el('dataset-picker').style.display = '';
    el('dataset-summary').textContent = '已识别 ' + datasets.length + ' 个数据表（来自 ' + countSheets(datasets) + ' 个工作表），自动判断结构与图表类型：';

    var list = el('dataset-list');
    list.innerHTML = '';
    datasets.forEach(function (ds, i) {
      var det = ds.detection;
      var type = DataLoader.suggestType(det);
      var typeName = TYPE_LABELS[type] || '表格';
      var meta = ds.rows.length + ' 行 × ' + ds.columns.length + ' 列';
      if (det.ohlc) meta += ' · 已识别 OHLC K线';
      else if (det.isTimeSeries) meta += ' · 时间列：' + escHtml(det.timeCol);
      var nums = det.numericCols.filter(function (c) { return c !== det.timeCol; });
      if (nums.length) meta += ' · 数值：' + nums.slice(0, 3).map(escHtml).join('、') + (nums.length > 3 ? '…' : '');

      var card = document.createElement('div');
      card.className = 'dataset-card';
      /* 表名 / 列名都来自用户上传的文件，拼 HTML 前必须转义 */
      card.innerHTML =
        '<div class="ds-head"><span class="ds-name">' + escHtml(ds.name) + '</span>' +
        '<span class="ds-badge">' + typeName + '</span></div>' +
        '<div class="ds-meta">' + meta + '</div>' +
        '<div class="ds-actions"><button class="btn sm" data-render="' + i + '">渲染此表</button></div>';
      list.appendChild(card);
    });

    list.querySelectorAll('[data-render]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        renderDatasetSingle(state.datasets[+btn.dataset.render]);
        closeModal();
      });
    });
  }

  function renderDatasetSingle(dataset) {
    var chart = datasetToChart(dataset);
    clearStage();
    state.mode = 'dataset';
    state.dataset = dataset;
    state.isImported = false;
    state.currentTemplate = null; state.dashboardDatasets = null;
    state.viewKey = 'ds:' + dataset.name;
    highlightNav(null);
    var evBtn2 = el('btn-events');
    if (cfgEvents) {
      evBtn2.style.display = '';
      evBtn2.classList.toggle('active', state.showEvents);
    } else {
      evBtn2.style.display = 'none';
    }
    el('stat-badge').style.display = 'none';
    var theme = getChartTheme();
    var stage = el('chart-stage');

    if (chart.type === 'candlestick') {
      if (!chart.ohlc.length) { toast('K 线数据无效'); return; }
      var pc = document.createElement('div'); pc.className = 'chart-canvas'; stage.appendChild(pc);
      var inst = PriceChart.create(pc, theme);
      PriceChart.setData(inst, chart.ohlc);
      applyPriceAnnotations(inst);
      attachPriceAnnotationHandler(inst, pc);
      state.priceInsts.push(inst);
      state.priceEl = pc;
    } else {
      chart.data.annotations = echartsAnnotations(state.viewKey);
      chart.data.seriesColors = state.seriesColors;
      var c = document.createElement('div'); c.className = 'chart-canvas'; stage.appendChild(c);
      var dsi = ChartFactory.render(c, chart.type, chart.data, theme);
      attachAnnotationHandler(dsi);
      attachExtremeLabels(dsi);
      state.echartsEl = c;
      if (chart.data && chart.data.labels && chart.data.series) renderAnalysis(chart.data.labels, chart.data.series);
    }
    setHead({ title: dataset.name, subtitle: '', unit: '', source: '' });
    el('hint').textContent = '已加载 Excel 数据表';
    syncToolbar();
  }

  function renderDashboard(datasets, closeAfter) {
    clearStage();
    state.mode = 'dashboard';
    state.dashboardDatasets = datasets;
    state.isImported = false;
    state.currentTemplate = null; state.dataset = null;
    highlightNav(null);
    var evBtn2 = el('btn-events');
    if (cfgEvents) {
      evBtn2.style.display = '';
      evBtn2.classList.toggle('active', state.showEvents);
    } else {
      evBtn2.style.display = 'none';
    }
    el('stat-badge').style.display = 'none';
    setHead({ title: 'Excel 数据仪表盘', subtitle: '', unit: '', source: '' });
    el('hint').textContent = '已加载 Excel · ' + datasets.length + ' 个数据表';

    var theme = getChartTheme();
    var stage = el('chart-stage');
    var grid = document.createElement('div');
    grid.className = 'dash-grid';
    var insts = [];
    datasets.forEach(function (ds) {
      var chart = datasetToChart(ds);
      if (chart.data) chart.data.seriesColors = state.seriesColors;
      var panel = document.createElement('div');
      panel.className = 'dash-panel';
      panel.innerHTML =
        '<div class="dash-panel-head"><span class="dash-panel-title">' + escHtml(ds.name) + '</span>' +
        '<span class="ds-badge">' + (TYPE_LABELS[chart.type] || chart.type) + '</span></div>' +
        '<div class="dash-panel-body"></div>';
      grid.appendChild(panel);
      var body = panel.querySelector('.dash-panel-body');
      if (chart.type === 'candlestick') {
        if (chart.ohlc.length) {
          var inst = PriceChart.create(body, theme);
          PriceChart.setData(inst, chart.ohlc);
          state.priceInsts.push(inst);
        }
      } else {
        insts.push(ChartFactory.render(body, chart.type, chart.data, theme));
      }
    });
    stage.appendChild(grid);
    // 联动缩放（同组图表时间轴同步）
    if (insts.length > 1) {
      try {
        insts.forEach(function (i) { i.group = 'dash-' + Date.now(); });
        echarts.connect(insts[0].group);
      } catch (e) {}
    }
    syncToolbar();
    if (closeAfter !== false) closeModal();
  }

  /* 多指标拆分为多个图表（每个指标一张图） */
  function renderSplitCharts() {
    var table = state.table, timeCol = state.mapping.timeCol;
    var cols = state.mapping.yCols.slice();
    if (cols.length < 2) { toast('至少选择 2 个数值列'); return; }
    closeModal();
    clearStage();
    hideBack();
    state.mode = 'dashboard';
    state.dashboardDatasets = null; state.currentTemplate = null; state.dataset = null;
    state.splitCols = cols.slice();
    highlightNav(null);
    var theme = getChartTheme(); theme._noZoom = true;
    var stage = el('chart-stage');
    var grid = document.createElement('div'); grid.className = 'dash-grid';
    stage.appendChild(grid);   // 先挂载再渲染，否则容器尺寸为 0
    cols.forEach(function (col) {
      var panel = document.createElement('div'); panel.className = 'dash-panel split-panel';
      var vals = table.rows.map(function (r) { return vnum(r[col]); });
      var last = vals.length ? vals[vals.length - 1] : null;
      var prev = vals.length > 1 ? vals[vals.length - 2] : null;
      var delta = (last === null || prev === null || isNaN(prev) || isNaN(last)) ? null : (last - prev);
      var dCls = delta === null ? '' : (delta >= 0 ? 'up' : 'down');
      var dTxt = delta === null ? '' : ((delta >= 0 ? '▲ ' : '▼ ') + fmtNum(Math.abs(delta)));
      panel.innerHTML = '<div class="dash-panel-head"><span class="dash-panel-title">' + escHtml(DT(col)) + '</span>' +
        '<span class="dash-panel-val">' + fmtNum(last) + '</span>' +
        '<span class="dash-panel-delta ' + dCls + '">' + dTxt + '</span></div>' +
        '<div class="dash-panel-body"></div>';
      panel.addEventListener('click', function () { openSplitDetail(col); });
      grid.appendChild(panel);
      var body = panel.querySelector('.dash-panel-body');
      var data = { labels: table.rows.map(function (r) { return String(r[timeCol]); }), series: [{ name: col, values: vals }], seriesColors: state.seriesColors };
      var st = state.mapping.chartType;
      var t = ['line', 'area', 'bar', 'step'].indexOf(st) >= 0 ? st : 'line';
      ChartFactory.render(body, t, data, theme);
    });
    setHead({ title: tr('多指标仪表盘', 'Multi-indicator dashboard'), subtitle: cols.length + ' ' + tr('个指标 · 点击任一卡片查看单图', 'indicators · click a card to open'), unit: '', source: tr('用户数据', 'User data') });
    el('hint').textContent = tr('已拆分为 ', 'Split into ') + cols.length + tr(' 个走势图', ' charts');
    syncToolbar();
  }

  function openSplitDetail(col) {
    var table = state.table, timeCol = state.mapping.timeCol;
    clearStage();
    state.mode = 'imported'; state.isImported = true; state.viewKey = 'split-detail';
    state.macroItem = null; state.chartConfig = null;
    highlightNav(null);
    var evBtn2 = el('btn-events');
    if (cfgEvents) {
      evBtn2.style.display = '';
      evBtn2.classList.toggle('active', state.showEvents);
    } else {
      evBtn2.style.display = 'none';
    }
    el('stat-badge').style.display = 'none';
    showBack(function () { renderSplitCharts(); });
    var theme = getChartTheme();
    if (state.isPriceData) {
      // 金融资产：单点进去用基金业绩模版（净值 + 回撤 + 指标，随缩放更新）
      var nav = [];
      table.rows.forEach(function (r) { var v = DataLoader.toNum(r[col]); if (!isNaN(v) && v > 0) nav.push({ date: String(r[timeCol]), value: v }); });
      var c = document.createElement('div'); c.className = 'chart-canvas'; el('chart-stage').appendChild(c);
      var ci = ChartFactory.render(c, 'perf', { name: col, nav: nav }, theme);
      renderPerfMetrics({ name: col, nav: nav }, ci);
      state.echartsEl = c;
      setHead({ title: col + ' · 业绩评估', subtitle: '', unit: '净值', source: '用户数据' });
      el('hint').textContent = '业绩评估 · 单个资产';
    } else {
      var labels = table.rows.map(function (r) { return String(r[timeCol]); });
      var values = table.rows.map(function (r) { return vnum(r[col]); });
      var c2 = document.createElement('div'); c2.className = 'chart-canvas'; el('chart-stage').appendChild(c2);
      var ci2 = ChartFactory.render(c2, 'line', { labels: labels, series: [{ name: col, values: values }], seriesColors: state.seriesColors }, theme);
      attachExtremeLabels(ci2);
      state.echartsEl = c2;
      setHead({ title: col, subtitle: '走势图 · 仅展示有数据的区间', unit: '', source: '用户数据' });
      el('hint').textContent = '单个指标走势';
    }
    syncToolbar();
  }

  function showBack(fn) {
    state.backFn = fn;
    var b = el('back-btn');
    if (b) b.style.display = '';
  }
  function hideBack() {
    state.backFn = null;
    var b = el('back-btn');
    if (b) b.style.display = 'none';
  }

  /* ============================================================
   * 宏观数据变换（变频 / 同比环比累计 / 自定义公式）
   * ============================================================ */
  function currentTable() {
    if (state.mode === 'imported' && state.table) return { table: state.table, timeCol: state.mapping.timeCol };
    if (state.mode === 'dataset' && state.dataset) return { table: state.dataset.table, timeCol: state.dataset.detection.timeCol };
    // 内置数据/探索图：从当前图表数据构造临时表，让数据变换也能用
    var lc = state.lastChart;
    var lcData = (lc && lc.data && lc.data.labels) ? lc.data : lc;
    if (lcData && lcData.labels && lcData.series) {
      var labels = lcData.labels;
      var ser = lcData.series;
      var cols = ['时间'].concat(ser.map(function (x) { return x.name; }));
      var rows = labels.map(function (l, i) {
        var row = {}; row['时间'] = l;
        ser.forEach(function (x) { row[x.name] = x.values[i]; });
        return row;
      });
      return { table: { columns: cols, rows: rows }, timeCol: '时间' };
    }
    return null;
  }

  function openTransform() {
    var src = currentTable();
    if (!src || !src.table) { toast('请先导入数据或选择一个数据表'); return; }
    state.tfTable = src.table;
    state.tfTimeCol = src.timeCol;
    // 填充指标运算下拉
    var cols = state.mapping.yCols.slice();
    if (!cols.length) cols = src.table.columns.filter(function (c) { return c !== src.timeCol && !isNaN(toNum(src.table.rows[0][c])); });
    [el('tf-colA'), el('tf-colB')].forEach(function (sel, i) {
      if (!sel) return;
      sel.innerHTML = '';
      cols.forEach(function (c) { var o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o); });
      if (cols.length > 1) sel.value = cols[i === 0 ? 0 : 1];
    });
    el('transform-overlay').classList.add('open');
    updateTransformPreview();
  }
  function closeTransform() { el('transform-overlay').classList.remove('open'); }

  function updateTransformPreview() {
    var tbl = el('tf-preview');
    if (!tbl) return;
    var t = state.tfTable;
    var html = '<thead><tr>' + t.columns.map(function (c) { return '<th>' + escHtml(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
    t.rows.slice(0, 8).forEach(function (r) {
      html += '<tr>' + t.columns.map(function (c) { return '<td>' + escHtml(fmt2(r[c])) + '</td>'; }).join('') + '</tr>';
    });
    tbl.innerHTML = html + '</tbody>';
  }

  function doTransform(action, arg) {
    var t = state.tfTable, tc = state.tfTimeCol;
    try {
      if (action === 'q') state.tfTable = DataLoader.freqToQuarter(t, tc, arg);
      else if (action === 'y') state.tfTable = DataLoader.freqToYear(t, tc, arg);
      else if (action === 'yoy') {
        var f = DataLoader.inferFreq(t.rows.map(function (r) { return r[tc]; }));
        var lag = f === 'month' ? 12 : f === 'quarter' ? 4 : f === 'year' ? 1 : 1;
        state.tfTable = DataLoader.pctChange(t, tc, lag);
      }
      else if (action === 'mom') state.tfTable = DataLoader.pctChange(t, tc, 1);
      else if (action === 'cum') state.tfTable = DataLoader.cumulative(t, tc);
      updateTransformPreview();
    } catch (e) { toast('变换失败：' + e.message); }
  }

  function doFormula() {
    var A = el('tf-colA').value, B = el('tf-colB').value, op = el('tf-op').value;
    if (!A || !B) { toast('请选择两个指标列'); return; }
    if (A === B) { toast('请选择两个不同的指标列'); return; }
    var name = A + ' ' + op + ' ' + B;
    var expr = A + ' ' + op + ' ' + B;
    try {
      state.tfTable = DataLoader.formula(state.tfTable, state.tfTimeCol, name, expr);
      updateTransformPreview();
      toast('已生成新列：' + name);
    } catch (e) { toast('公式错误：' + e.message); }
  }

  function commitTransform() {
    var t = state.tfTable;
    var prevTitle = (state.lastChart && state.lastChart.title) || '';
    var prevType = (state.lastChart && state.lastChart.type) || '';
    if (['line', 'area', 'bar', 'stacked', 'stackedLine'].indexOf(prevType) < 0) prevType = state.det && state.det.isTimeSeries ? 'line' : 'bar';
    state.table = t;
    state.det = DataLoader.detectTable(t);
    state.mapping.timeCol = state.tfTimeCol;
    state.mapping.yCols = state.det.numericCols.filter(function (c) { return c !== state.tfTimeCol; });
    state.mapping.chartType = state.det.isTimeSeries ? (prevType || 'area') : 'bar';
    state.isImported = true; state.mode = 'imported';
    state.viewKey = 'imported';
    if (prevTitle) state.customTitles['imported'] = prevTitle + ' · 变换';
    closeTransform();
    renderUserChart(false);
  }

  /* ============================================================
   * 图片数据识别（图表描点取数）
   * ============================================================ */

  /* ---------- 图表配置 JSON（大模型输出 / 分享链接） ---------- */
  /* 缩放后：按可见区间重新编号事件标注，并同步图下说明 */
  function bindEventZoom(inst, events, theme) {
    if (!inst || inst._evZoomBound) return;
    inst._evZoomBound = true;
    inst.on('datazoom', function () {
      try {
        var order = ChartFactory.setEvents(inst, events, getChartTheme());
        renderEventNotes(order);
      } catch (e) {}
    });
  }

  function applyChartConfig(cfg, skipOverlayMerge) {
    var type = cfg.type || 'area';

    /* KPI 卡片：走站内卡片视图（与示例路径一致），不走 ECharts 构建器 */
    if (type === 'kpi') {
      var kdata = null;
      if (cfg.data && cfg.data.cards) kdata = cfg.data;
      else if (cfg.cards) kdata = { cards: cfg.cards };
      else if (cfg.labels && cfg.series) {
        kdata = { cards: cfg.series.map(function (sr, i) {
          var vals = (sr.values || []).filter(function (v) { return v !== null && v !== undefined && !isNaN(v); });
          var last = vals.length ? vals[vals.length - 1] : null;
          var prev = vals.length > 1 ? vals[vals.length - 2] : null;
          var delta = (last !== null && prev !== null && prev !== 0) ? ((last - prev) / Math.abs(prev) * 100) : null;
          return {
            label: sr.name || String(i + 1),
            value: last === null ? '—' : fmtNum(last) + (cfg.unit || ''),
            delta: delta === null ? '' : (delta >= 0 ? '+' : '') + delta.toFixed(1) + '%',
            dir: (delta !== null && delta < 0) ? 'neg' : 'pos',
            spark: vals.slice(-12)
          };
        }) };
      }
      if (!kdata || !kdata.cards || !kdata.cards.length) { toast('KPI 数据为空'); return; }
      state.chartConfig = cfg;
      clearStage();
      state.mode = 'imported'; state.isImported = true; state.viewKey = cfg.viewKey || 'imported';
      state.currentTemplate = null; state.dataset = null; state.dashboardDatasets = null;
      state.table = null; state.det = null;
      highlightNav(null);
      el('btn-events').style.display = 'none';
      el('stat-badge').style.display = 'none';
      renderKpi(kdata);
      state.echartsEl = null;
      setHead({ title: cfg.title || 'KPI', subtitle: tr('核心指标看板', 'Key metrics'), unit: '', source: '' });
      el('hint').textContent = tr('AI 生成 · KPI 卡片', 'AI generated · KPI cards');
      syncToolbar();
      return;
    }

    if (!ChartFactory.BUILDERS[type] || type === 'candlestick') { toast('不支持的图表类型: ' + type); return; }
    state.chartConfig = cfg;
    if (cfg && cfg.labels && cfg.series) state.lastChart = cfg;
    // 应用主题（链接可携带；目前是象牙白 / 暗夜两套）
    function applyThemeFromConfig(themeId) {
      if (!Themes.getTheme(themeId)) return;
      state.theme = themeId;
      Themes.applyTheme(themeId);
      var ts = el('theme-select');
      if (ts) ts.value = themeId;
      // 分享链接里带了具体主题：让外观开关跟着切到对应档位
      var m = Themes.modeOf(themeId);
      state.appearance = m;
      state.themeByMode[m] = themeId;
      refreshAppearanceUI();
      saveAppearance();
    }
    if (cfg.theme && Themes.getTheme(cfg.theme)) {
      applyThemeFromConfig(cfg.theme);
    }
    /* 链接可携带配色模板：consult / contrast / burgundy / forest */
    if (cfg.palette) {
      var okPal = (window.ADV_PALETTES || []).some(function (x) { return x.id === cfg.palette; });
      if (okPal) state.palette = cfg.palette;
    }
    var data = {};
    if (cfg.steps) data = { steps: cfg.steps };                                  // 漏斗
    else if (cfg.cards) data = { cards: cfg.cards };                            // KPI
    else if (cfg.data && cfg.data.data) data = cfg.data;                        // 饼/环/树等自描述数据
    else if (cfg.data) data = cfg.data;
    else if (cfg.xLabels !== undefined && cfg.values !== undefined) data = { xLabels: cfg.xLabels, yLabels: cfg.yLabels || [], values: cfg.values };   // 热力图
    else if (cfg.values !== undefined && cfg.labels !== undefined) data = { labels: cfg.labels, values: cfg.values };   // 瀑布图等 {labels, values}
    else if (type === 'rank' && cfg.labels !== undefined && cfg.series !== undefined) {
      data = { categories: cfg.labels, values: (cfg.series[0] && cfg.series[0].values) || [], unit: cfg.unit };
    }
    else if (cfg.labels !== undefined && cfg.series !== undefined) data = { labels: cfg.labels, series: cfg.series };
    else if (cfg.indicators !== undefined && cfg.series !== undefined) data = { indicators: cfg.indicators, series: cfg.series };
    else if (cfg.series !== undefined) data = { series: cfg.series };            // 散点矩阵 / 相关性等无时间轴图表
    else if (cfg.names !== undefined && cfg.matrix !== undefined) data = { names: cfg.names, matrix: cfg.matrix };
    else { toast('JSON 缺少 data / series 数据'); return; }
    if (data.labels !== undefined && data.series !== undefined) {
      if (type === 'season') {
        data.maxYears = ({ '1y': 1, '5y': 5, '10y': 10 })[state.timeRange] || undefined;
      } else {
        var ranged = applyTimeRange(data.labels, data.series);
        data.labels = ranged.labels; data.series = ranged.series;
      }
    }
    // agent 生成的图：把用户通过「＋指标」叠加的系列合并进来
    // （openMacroItem 等已自行合并过的，传 skipOverlayMerge=true 避免重复叠加）
    if (!skipOverlayMerge && data.labels !== undefined && data.series !== undefined && state.overlaySeries && state.overlaySeries.length) {
      var mg = mergeOverlaySeries(data.labels, data.series, state.overlaySeries);
      data = { labels: mg.labels, series: mg.series };
    }
    data.seriesColors = state.seriesColors;
    var cfgEvents = (cfg.events && cfg.events.length) ? cfg.events : null;
    if (cfgEvents) data.events = state.showEvents ? cfgEvents : [];
    clearStage();
    state.mode = 'imported'; state.isImported = true; state.viewKey = cfg.viewKey || 'imported';
    state.currentTemplate = null; state.dataset = null; state.dashboardDatasets = null;
    state.table = null; state.det = null;
    highlightNav(null);
    var evBtn2 = el('btn-events');
    if (cfgEvents) {
      evBtn2.style.display = '';
      evBtn2.classList.toggle('active', state.showEvents);
    } else {
      evBtn2.style.display = 'none';
    }
    el('stat-badge').style.display = 'none';
    var theme = getChartTheme();
    var c = document.createElement('div'); c.className = 'chart-canvas'; el('chart-stage').appendChild(c);
    var ci = renderAutoDual(c, type, data, theme);
    if (cfgEvents && state.showEvents) {
      ci._eventsSource = cfgEvents;
      var order = null;
      try { order = ci.getOption()._eventOrder; } catch (e9) {}
      if (!order || !order.length) { try { order = ChartFactory.setEvents(ci, cfgEvents, theme); } catch (e10) {} }
      if (order && order.length) ci._eventOrder = order;      // 供导出时绘制事件说明
      renderEventNotes(order || cfgEvents);
      bindEventZoom(ci, cfgEvents, theme);
    } else {
      ci._eventsSource = null;
      renderEventNotes(null);
    }
    attachAnnotationHandler(ci);
    attachExtremeLabels(ci);
    state.echartsEl = c;
    setHead({ title: cfg.title || '图表', subtitle: '', unit: cfg.unit || '', source: '' });
    el('hint').textContent = tr('AI 生成 · 可编辑图表类型/区间/＋指标后导出','AI generated · edit type / range / overlays, then export');
    if (data.labels && data.series) renderAnalysis(data.labels, data.series);
    syncToolbar();
  }

  function tryParsePasted(txt) {
    if (txt.charAt(0) === '[' || txt.charAt(0) === '{') {
      var obj = JSON.parse(txt);
      if (obj && obj.type && (obj.labels !== undefined || obj.indicators !== undefined || obj.data)) { applyChartConfig(obj); closeModal(); return; }
      showMapping(DataLoader.parseJSON(txt));
    } else {
      showMapping(DataLoader.parseCSV(txt));
    }
  }

  function buildChartConfig() {
    var type = state.mapping.chartType;
    var labels = state.table.rows.map(function (r) { return String(r[state.mapping.timeCol]); });
    var series = state.mapping.yCols.map(function (col) { return { name: col, values: state.table.rows.map(function (r) { return vnum(r[col]); }) }; });
    var title = state.customTitles[state.viewKey] || (state.currentMeta && state.currentMeta.title) || '图表';
    return { type: type, title: title, labels: labels, series: series };
  }

  function b64Encode(str) { return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function b64Decode(str) {
    var s = str.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return decodeURIComponent(escape(atob(s)));
  }

  function copyShareLink() {
    var cfg;
    if (state.mode === 'imported' && state.table) cfg = buildChartConfig();
    else if (state.lastChart) cfg = state.lastChart;
    else if (state.chartConfig) cfg = state.chartConfig;
    else { toast('当前图表暂不支持复制链接'); return; }
    var json = JSON.stringify(cfg);
    var b64 = b64Encode(json);
    var url = location.href.split('?')[0] + '?chart=' + b64;
    function done() { toast('图表链接已复制（部署后可分享）'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, done);
    } else {
      var ta = document.createElement('textarea'); ta.value = url; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      ta.remove(); done();
    }
  }

  /* 数据归一化：所有序列按日期升序排列（最新数据在右） */
  function normalizeSeriesData(D) {
    if (!D || !D.sections) return D;
    D.sections.forEach(function (sec) {
      (sec.items || []).forEach(function (it) {
        if (!it.labels || !it.series || !it.series.length) return;
        var vals = it.series[0].values;
        var pairs = [];
        for (var i = 0; i < it.labels.length; i++) pairs.push({ l: String(it.labels[i]), v: vals[i] });
        pairs.sort(function (a, b) { return a.l < b.l ? -1 : (a.l > b.l ? 1 : 0); });
        it.labels = pairs.map(function (p) { return p.l; });
        it.series[0].values = pairs.map(function (p) { return p.v; });
      });
    });
    return D;
  }

  /* 用真实最新数据填充示例模板 */
  function hydrateSamples() {
    var S = DataLoader.SAMPLES;
    if (!S) return;
    function each(D, cb) { ((D && D.sections) || []).forEach(function (s) { (s.items || []).forEach(cb); }); }
    function mFind(t) { var r = null; each(window.CHINA_MACRO, function (i) { if (!r && i.title === t) r = i; }); return r; }
    function iFind(t) { var r = null; each(window.INTL_MACRO, function (i) { if (!r && i.title === t) r = i; }); return r; }
    function fFind(t) { var r = null; financeLoadedItems().forEach(function (i) { if (!r && i.title === t) r = i; }); return r; }
    function tailOf(item, n) {
      if (!item || !item.series || !item.series.length) return null;
      var L = item.labels, V = item.series[0].values;
      var k = Math.max(0, L.length - n);
      return { labels: L.slice(k), values: V.slice(k) };
    }
    function alignTo(baseItem, item) {
      return alignSeriesToBase(baseItem.labels, item.labels, item.series[0].values);
    }
    function multi(base, items) {
      if (!base) return null;
      var labels = base.labels, series = [{ name: base._name || '指标', values: base.series[0].values }];
      (items || []).forEach(function (it) {
        if (!it) return;
        series.push({ name: it.title, values: alignTo(base, it) });
      });
      return { labels: labels, series: series };
    }
    function setSample(key, data, meta) {
      if (!S[key] || !data) return;
      S[key].data = data;
      if (meta) S[key].meta = Object.assign({}, S[key].meta, meta);
    }
    function lastN(arr, n) { return arr.slice(Math.max(0, arr.length - n)); }
    function pctChange(item, n) {
      var t = tailOf(item, n + 1);
      if (!t) return null;
      var v = t.values, out = [];
      for (var i = 0; i < v.length; i++) out.push(v[i]);
      return { labels: t.labels, values: out };
    }

    /* 1. 渐变面积 · GDP 增速 → 中国 GDP + 工业增加值 + 社零 */
    var gdp = mFind('GDP 当季同比');
    if (gdp) {
      var d = multi({ labels: gdp.labels, series: gdp.series, _name: gdp.title }, [mFind('规模以上工业增加值'), mFind('社会消费品零售总额')]);
      d.labels = d.labels.slice(-12); d.series.forEach(function (s) { s.values = s.values.slice(-12); });
      setSample('macro-gdp-area', d, { title: '中国 GDP 增速（最新）', subtitle: 'GDP 当季同比 · 工业增加值 · 社零', unit: '%', source: '国家统计局 · akshare 实时' });
    }

    /* 2. 双轴组合 · 社零总额 → 社零(柱) + CPI(线) */
    var retail = mFind('社会消费品零售总额'), cpi = mFind('CPI 整体');
    if (retail && cpi) {
      var base2 = tailOf(retail, 24), cpi2 = alignTo({ labels: base2.labels, series: [{ values: base2.values }] }, cpi).slice(-24);
      setSample('macro-dual', { labels: base2.labels, bars: [{ name: '社会消费品零售总额', values: base2.values }], lines: [{ name: 'CPI 整体', values: cpi2 }] },
        { title: '社零总额 与 CPI（最新）', subtitle: '柱：社零同比 · 线：CPI', unit: '%', source: '国家统计局 · akshare 实时' });
    }

    /* 3. 阶梯线 · 政策利率 → LPR 1年/5年 */
    var lpr1 = mFind('LPR 1年'), lpr5 = mFind('LPR 5年');
    if (lpr1 && lpr5) {
      var t1 = tailOf(lpr1, 60), t5 = alignTo({ labels: t1.labels, series: [{ values: t1.values }] }, lpr5).slice(-60);
      setSample('macro-step', { labels: t1.labels, series: [{ name: 'LPR 1年', values: t1.values }, { name: 'LPR 5年', values: t5 }] },
        { title: 'LPR 走势（最新）', subtitle: '贷款市场报价利率', unit: '%', source: '全国银行间同业拆借中心 · akshare 实时' });
    }

    /* 4. 热力矩阵 → 各国 GDP 增速（统一季度 + 前向填充） */
    var gdpItems = ['欧元区GDP同比', '美国GDP', '英国GDP同比', '德国GDP同比'].map(iFind).filter(Boolean);
    if (gdpItems.length >= 2) {
      function periodOrd(l) {
        var s = String(l);
        var m1 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m1) { var q = Math.ceil(parseInt(m1[2], 10) / 3); return parseInt(m1[1], 10) * 4 + q; }
        var m2 = s.match(/^(\d{4})年(\d{2})月/);
        if (m2) return parseInt(m2[1], 10) * 4 + Math.ceil(parseInt(m2[2], 10) / 3);
        var m3 = s.match(/^(\d{4})第(\d)季度/);
        if (m3) return parseInt(m3[1], 10) * 4 + parseInt(m3[2], 10);
        return null;
      }
      function ordLabel(ord) { var y = Math.floor((ord - 1) / 4), q = ((ord - 1) % 4) + 1; return y + '-Q' + q; }
      var ordSet = {};
      gdpItems.forEach(function (it) { it.labels.forEach(function (l) { var o = periodOrd(l); if (o) ordSet[o] = true; }); });
      var ords = Object.keys(ordSet).map(Number).sort(function (a, b) { return a - b; }).slice(-8);
      var gdpMaps = gdpItems.map(function (it) {
        var m = {};
        it.labels.forEach(function (l, k) { var o = periodOrd(l); if (o) m[o] = it.series[0].values[k]; });
        return m;
      });
      var vals = [];
      gdpItems.forEach(function (it, ri) {
        ords.forEach(function (ord, ci) {
          // 前向填充：找 <= ord 的最近一期
          var v = null;
          for (var oo = ord; oo >= ord - 4; oo--) { if (gdpMaps[ri][oo] !== undefined) { v = gdpMaps[ri][oo]; break; } }
          if (v !== null && v !== undefined && !isNaN(v)) vals.push([ci, ri, Math.round(v * 100) / 100]);
        });
      });
      setSample('macro-heatmap', {
        xLabels: ords.map(ordLabel),
        yLabels: gdpItems.map(function (i) { return i.title.replace('GDP同比', '').replace('GDP', '').trim() || i.title; }),
        values: vals
      }, { title: '全球主要经济体 GDP 增速矩阵（最新）', subtitle: '季度同比（%）', unit: '%', source: '各国统计局 · akshare 实时' });
    }

    /* 5. 横向排名 → 全球股指近1年涨幅 */
    var stocks = ['沪深300', '中证500', '日经225', '德国DAX', '纳斯达克', '标普500', '英国富时100', '法国CAC40'].map(fFind).filter(Boolean);
    if (stocks.length >= 3) {
      var cats = [], vs = [];
      stocks.forEach(function (it) {
        var t = tailOf(it, 53); if (!t || t.values.length < 2) return;
        var a = t.values[0], b = t.values[t.values.length - 1];
        if (a > 0) { cats.push(it.title); vs.push(Math.round(((b / a - 1) * 100) * 100) / 100); }
      });
      setSample('industry-rank', { categories: cats, values: vs },
        { title: '全球股指近一年涨幅排名', subtitle: '涨幅（%）', unit: '%', source: '公开行情 · 实时' });
    }

    /* 6. 气泡矩阵 → PMI vs GDP */
    var pmi = mFind('制造业 PMI');
    if (pmi && gdp) {
      var baseP = { labels: gdp.labels, series: [{ values: gdp.series[0].values }] };
      var pmiAligned = alignSeriesToBase(gdp.labels, pmi.labels, pmi.series[0].values);
      var pts = [];
      for (var i = 0; i < gdp.labels.length; i++) if (pmiAligned[i] != null && gdp.series[0].values[i] != null) pts.push([pmiAligned[i], gdp.series[0].values[i], Math.abs(gdp.series[0].values[i]) + 1, gdp.labels[i]]);
      if (pts.length > 4) setSample('industry-bubble', { xName: '制造业 PMI', yName: 'GDP 当季同比', sizeName: '量级', data: pts.slice(-40) },
        { title: 'PMI 与 GDP 关系（最新）', subtitle: '每个点 = 一个季度', unit: '', source: '国家统计局 · akshare 实时' });
    }

    /* 7. 板块热力/树图 → 全球股指最新点位 */
    if (stocks.length >= 3) {
      var td = stocks.slice(0, 8).map(function (it) { var v = it.series[0].values; return { name: it.title, value: Math.round(v[v.length - 1]) }; });
      setSample('industry-treemap', { data: td }, { title: '全球股指体量分布', subtitle: '按最新点位', unit: '点', source: '公开行情 · 实时' });
    }

    /* 8. 社融 → 近4年季节性折线 + 产业结构（堆叠） */
    var shRong = mFind('社融结构（人民币贷款/企业债/政府债）');
    if (shRong) {
      var sr = shRong;
      // 季节性：只取「人民币贷款」月度序列，按年叠放最近 4 年
      var seasonLabels = sr.labels.map(function (l) { return String(l).slice(0, 7); });
      setSample('macro-sheirong-stack', { labels: seasonLabels, series: [{ name: '社融·人民币贷款', values: sr.series[0].values }], maxYears: 4 },
        { title: '社融人民币贷款 · 近4年季节性对比', subtitle: '各年同期月度走势（亿元）', unit: '亿元', source: '中国人民银行 · akshare 实时' });
      if (S['macro-sheirong-stack']) S['macro-sheirong-stack'].type = 'season';
      // 行业成交额堆叠（真实行业数据，替代社融）
      // 由下方 20.x 段落用 AK.industryTurnover 填充
    }
    if (shRong) {
      setSample('fin-sankey', {
        nodes: [{ name: '社融增量' }, { name: '人民币贷款' }, { name: '企业债券' }, { name: '政府债券' }],
        links: [
          { source: '人民币贷款', target: '社融增量', value: Math.abs(shRong.series[0].values[shRong.series[0].values.length - 1]) || 1 },
          { source: '企业债券', target: '社融增量', value: Math.abs(shRong.series[1].values[shRong.series[1].values.length - 1]) || 1 },
          { source: '政府债券', target: '社融增量', value: Math.abs(shRong.series[2].values[shRong.series[2].values.length - 1]) || 1 }
        ]
      }, { title: '社融结构流向（最新月度）', subtitle: '人民币贷款 / 企业债 / 政府债', unit: '亿元', source: '中国人民银行 · akshare 实时' });
    }

    /* 9. 双轴组合 · 收入毛利 → 沪深300(柱) + VIX(线) */
    var hs300 = fFind('沪深300'), vix = fFind('标普500波动率(VIX)');
    if (hs300 && vix) {
      var h1 = tailOf(hs300, 60), v1 = alignTo({ labels: h1.labels, series: [{ values: h1.values }] }, vix).slice(-60);
      setSample('fin-combo', { labels: h1.labels, bars: [{ name: '沪深300', values: h1.values }], lines: [{ name: 'VIX 波动率', values: v1 }] },
        { title: '沪深300 与 VIX（最新）', subtitle: '柱：沪深300 · 线：VIX', unit: '', source: '公开行情 · 实时' });
    }

    /* 10. 环形图 → 全球股指近一年涨幅占比（绝对值） */
    if (stocks.length >= 3) {
      var donutData = [];
      stocks.slice(0, 6).forEach(function (it) {
        var t = tailOf(it, 53); if (!t || t.values.length < 2) return;
        var ch = t.values[t.values.length - 1] / t.values[0] - 1;
        donutData.push({ name: it.title, value: Math.abs(Math.round(ch * 10000) / 100) || 0.01 });
      });
      setSample('fin-donut', { data: donutData }, { title: '主要股指近一年涨幅强度', subtitle: '绝对值占比', unit: '%', source: '公开行情 · 实时' });
    }

    /* 11. 指标卡 → 金融最新值 */
    var kpiItems = [fFind('沪深300'), fFind('COMEX黄金'), fFind('美元指数'), fFind('WTI原油'), fFind('中国10年期国债')].filter(Boolean);
    if (kpiItems.length) {
      var cards = kpiItems.map(function (it) {
        var v = it.series[0].values; var last = v[v.length - 1], prev = v.length > 1 ? v[v.length - 2] : null;
        var chg = (prev != null && prev !== 0) ? (last - prev) / Math.abs(prev) * 100 : 0;
        return { label: it.title, value: fmtNum(last), delta: (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%', dir: chg >= 0 ? 'pos' : 'neg', spark: v.slice(-12) };
      });
      setSample('fin-kpi', { cards: cards }, { title: tr('金融核心指标（最新）','Key Market Metrics (latest)'), subtitle: tr('一键看盘','at a glance'), unit: '', source: tr('公开行情 · 实时','market data · live') });
    }

    /* 12. ML 趋势/预测/聚类/相关性/分布 → 真实数据 */
    if (hs300) {
      var t2 = tailOf(hs300, 60);
      setSample('ml-trend', { labels: t2.labels, values: t2.values },
        { title: '沪深300 趋势拟合（最新）', subtitle: '线性趋势', unit: '点', source: '公开行情 · 实时' });
      var fcLabels = []; (function(){ var d0 = new Date(); for (var q=1;q<=6;q++){ var dd=new Date(d0.getTime()); dd.setMonth(dd.getMonth()+q*3); fcLabels.push(dd.getFullYear()+'Q'+(Math.floor(dd.getMonth()/3)+1)); } })();
      setSample('ml-forecast', { labels: t2.labels, values: t2.values, horizon: 6, forecastLabels: fcLabels },
        { title: '沪深300 走势与预测（最新）', subtitle: '未来 6 期', unit: '点', source: '公开行情 · 实时' });
      setSample('ml-dist', { values: (function () { var r = []; for (var i = 1; i < t2.values.length; i++) r.push(t2.values[i] / t2.values[i - 1] - 1); return r; })() },
        { title: '沪深300 收益分布（最新）', subtitle: '日收益直方图', unit: '', source: '公开行情 · 实时' });
    }
    if (gdp && pmi) {
      var pmiAl = alignSeriesToBase(gdp.labels, pmi.labels, pmi.series[0].values);
      var cl = [];
      for (var j = 0; j < gdp.labels.length; j++) if (pmiAl[j] != null && gdp.series[0].values[j] != null) cl.push([pmiAl[j], gdp.series[0].values[j], gdp.labels[j]]);
      if (cl.length > 6) {
        setSample('ml-cluster', { xName: '制造业 PMI', yName: 'GDP 同比', k: 3,
          data: cl.slice(-40).map(function (p) { return { name: String(p[2]), x: p[0], y: p[1] }; }) },
          { title: 'PMI 与 GDP 聚类（最新）', subtitle: 'K-means 分 3 类', unit: '', source: '国家统计局 · akshare 实时' });
        setSample('macro-corr-explore', { series: [{ name: '制造业 PMI', values: pmiAl }, { name: 'GDP 当季同比', values: gdp.series[0].values }] },
          { title: 'PMI 与 GDP 相关性（最新）', subtitle: '散点矩阵', unit: '', source: '国家统计局 · akshare 实时' });
      }
    }
    /* 相关性热力图：用经济活动核心指标 */
    var corrItems = ['GDP 当季同比', '制造业 PMI', '规模以上工业增加值', '社会消费品零售总额', 'CPI 整体', 'PPI（出厂）'].map(mFind).filter(Boolean);
    if (corrItems.length >= 3) {
      var baseC = corrItems[0];
      var serC = corrItems.map(function (it) { return { name: it.title, values: alignSeriesToBase(baseC.labels, it.labels, it.series[0].values) }; });
      setSample('ml-corr', { series: serC }, { title: '宏观指标相关性（最新）', subtitle: '相关系数矩阵', unit: '', source: '国家统计局 · akshare 实时' });
    }

    /* 13. 雷达图 → 中国宏观最新景气 */
    var radarItems = ['制造业 PMI', '服务业 PMI', '规模以上工业增加值', '社会消费品零售总额', '出口（美元计）', '固定资产投资'].map(mFind).filter(Boolean);
    if (radarItems.length >= 3) {
      var ind = radarItems.map(function (it) { return { name: it.title }; });
      var vals = radarItems.map(function (it) { var v = it.series[0].values; return v[v.length - 1]; });
      setSample('macro-pmi-radar', { indicators: ind, series: [{ name: '最新值', values: vals }] },
        { title: '中国宏观景气雷达（最新）', subtitle: '各指标最新值', unit: '%', source: '国家统计局 · akshare 实时' });
    }

    /* 14. 业绩评估 → 沪深300 净值 */
    if (hs300) {
      var nav = [];
      hs300.labels.forEach(function (l, i) { var v = hs300.series[0].values[i]; if (v > 0) nav.push({ date: l, value: v }); });
      setSample('fund-perf', { name: '沪深300', nav: nav.slice(-250) }, { title: '沪深300 业绩评估（最新）', subtitle: '净值 · 回撤 · 指标', unit: '点', source: '公开行情 · 实时' });
    }

    /* 15. 世界地图 → 各国通胀（GeoJSON 用英文国名） */
    var CN2EN = { '中国': 'China', '美国': 'United States', '英国': 'United Kingdom', '德国': 'Germany', '加拿大': 'Canada', '日本': 'Japan', '澳大利亚': 'Australia', '印度': 'India', '巴西': 'Brazil', '韩国': 'Korea', '法国': 'France', '意大利': 'Italy', '俄罗斯': 'Russia' };
    var mapVals = [];
    ['美国CPI同比', '日本CPI同比', '英国CPI同比', '德国CPI同比', '澳大利亚CPI同比', '加拿大CPI同比'].map(iFind).forEach(function (it) {
      if (!it) return;
      var v = it.series[0].values; var last = v[v.length - 1];
      var zh = it.title.replace('CPI同比', '').trim();
      var en = CN2EN[zh]; if (!en) return;
      mapVals.push({ name: en, value: Math.round(last * 100) / 100, label: zh });
    });
    if (cpi) { var cv = cpi.series[0].values; mapVals.push({ name: 'China', value: Math.round(cv[cv.length - 1] * 100) / 100, label: '中国' }); }
    if (mapVals.length >= 3) {
      setSample('macro-world-map', { values: mapVals }, { title: '全球通胀地图（最新 CPI 同比）', subtitle: '各国最新 CPI 同比（%）', unit: '%', source: '各国统计局 · akshare 实时' });
      if (S['macro-world-map']) S['macro-world-map'].meta.unit = '%';
    }

    /* 16. 多国对比线 → 全球 GDP 增速 */
    if (gdpItems.length >= 2) {
      var baseG = gdpItems[0];
      var serG = gdpItems.map(function (it) { return { name: it.title, values: alignSeriesToBase(baseG.labels, it.labels, it.series[0].values) }; });
      var kk = Math.max(0, baseG.labels.length - 24);
      setSample('macro-country-groups', { labels: baseG.labels.slice(kk), series: serG.map(function (s) { return { name: s.name, values: s.values.slice(kk) }; }) },
        { title: '全球主要经济体 GDP 增速（最新）', subtitle: '季度同比', unit: '%', source: '各国统计局 · akshare 实时' });
    }

    /* 17. CPI / M2 / PMI 单指标 */
    if (cpi) { var tc = tailOf(cpi, 60); setSample('macro-cpi', { labels: tc.labels, series: [{ name: 'CPI 整体', values: tc.values }] }, { title: '中国 CPI（最新）', subtitle: '当月同比', unit: '%', source: '国家统计局 · akshare 实时' }); }
    var m2 = mFind('M2 同比');
    if (m2) { var tm = tailOf(m2, 60); setSample('macro-m2', { labels: tm.labels, series: [{ name: 'M2 同比', values: tm.values }] }, { title: '中国 M2 增速（最新）', subtitle: '同比', unit: '%', source: '中国人民银行 · akshare 实时' }); }
    var pmiS = mFind('服务业 PMI');
    if (pmi && pmiS) {
      var tp = tailOf(pmi, 36), tsp = alignSeriesToBase({ labels: tp.labels, series: [{ values: tp.values }] }, pmiS).slice(-36);
      setSample('macro-pmi-monthly', { labels: tp.labels, series: [{ name: '制造业 PMI', values: tp.values }, { name: '服务业 PMI', values: tsp }] },
        { title: '中国 PMI（最新）', subtitle: '制造业 / 服务业', unit: '', source: '国家统计局 · akshare 实时' });
    }

    /* 18. 瀑布图 → 用社融三项构成 */
    if (shRong) {
      var names = ['人民币贷款', '企业债券', '政府债券', '合计'];
      var vv = [shRong.series[0].values[shRong.series[0].values.length - 1], shRong.series[1].values[shRong.series[1].values.length - 1], shRong.series[2].values[shRong.series[2].values.length - 1]];
      var total = vv.reduce(function (a, b) { return a + (b || 0); }, 0);
      setSample('fin-waterfall', { labels: names.concat(['社融合计']), values: vv.concat([Math.round(total)]) },
        { title: '社融增量构成（最新月度）', subtitle: '瀑布图 · 亿元', unit: '亿元', source: '中国人民银行 · akshare 实时' });
    }

    /* ========== 19. PMI 雷达 → 13 项核心景气指标 · 最近3个月 ========== */
    var radarTitles = ['制造业 PMI', '服务业 PMI', '规模以上工业增加值', '固定资产投资', '社会消费品零售总额',
      '出口（美元计）', '进口（美元计）', 'PPI（出厂）', 'CPI 整体', 'M1 同比', 'M2 同比', '新增人民币贷款', '人民币贷款余额同比'];
    var radarItems2 = radarTitles.map(mFind).filter(function (x) { return x && x.series && x.series[0].values.length >= 3; });
    if (radarItems2.length >= 6) {
      var inds = radarItems2.map(function (it) { return { name: it.title }; });
      var series3 = [];
      for (var back = 0; back < 3; back++) {
        var vals = radarItems2.map(function (it) { var v = it.series[0].values; return v[v.length - 1 - back]; });
        var lbl = radarItems2[0].labels[radarItems2[0].labels.length - 1 - back];
        series3.push({ name: String(lbl).slice(0, 7), values: vals });
      }
      series3.reverse();
      setSample('macro-pmi-radar', { indicators: inds, series: series3 },
        { title: '中国宏观景气雷达 · 近3个月', subtitle: '13 项核心指标（PMI/工业/消费/进出口/物价/货币）', unit: '', source: '国家统计局 · 中国人民银行 · akshare 实时' });
    }

    /* ========== 20. 行业数据（akshare 行业板块） ========== */
    var AK = window.AKSHARE_DATA;
    if (AK && AK.industries && AK.industries.length) {
      var inds2 = AK.industries.slice().filter(function (x) { return isFinite(x.change) && !/[ⅡⅢ]/.test(x.name); });
      inds2.sort(function (a, b) { return b.change - a.change; });
      // 排名
      var topR = inds2.slice(0, 15);
      setSample('industry-rank', { categories: topR.map(function (x) { return x.name; }), values: topR.map(function (x) { return Math.round(x.change * 100) / 100; }) },
        { title: '行业板块涨幅榜（最新）', subtitle: '申万行业 · 涨跌幅（%）', unit: '%', source: '东方财富 · akshare 实时' });
      // 气泡：换手率 vs 涨跌幅，大小=市值
      var bubbleData = inds2.filter(function (x) { return Math.abs(x.change) < 30 && x.mcap > 0 && isFinite(x.turnover); }).sort(function (a, b) { return b.mcap - a.mcap; }).slice(0, 30)
        .map(function (x) { return { name: x.name, x: Math.round(x.turnover * 100) / 100, y: Math.round(x.change * 100) / 100, size: Math.round(x.mcap / 1e8) }; });
      if (bubbleData.length >= 10) {
        setSample('industry-bubble', { xName: '换手率', yName: '涨跌幅', sizeName: '总市值', data: bubbleData },
          { title: '行业景气气泡图（最新）', subtitle: '换手率 vs 涨跌幅 · 气泡=市值', unit: '%', source: '东方财富 · akshare 实时' });
      }
      // 树图：市值前 20
      var byCap = AK.industries.slice().sort(function (a, b) { return b.mcap - a.mcap; }).slice(0, 20);
      setSample('industry-treemap', { data: byCap.map(function (x) { return { name: x.name, value: Math.round(x.mcap / 1e8) }; }) },
        { title: '行业市值分布（最新）', subtitle: '前 20 大行业 · 单位：亿元', unit: '亿元', source: '东方财富 · akshare 实时' });
    }

    /* ========== 20.5 行业成交额堆叠 ========== */
    var AKi = window.AKSHARE_DATA;
    if (AKi && AKi.industryTurnover && AKi.industryTurnover.series && AKi.industryTurnover.series.length >= 2) {
      var it = AKi.industryTurnover;
      var itSeries = it.series.filter(function (x) { return !/[ⅡⅢ]/.test(x.name); });
      if (itSeries.length < 2) itSeries = it.series;
      setSample('industry-stacked', { labels: it.labels, series: itSeries.map(function (x) { return { name: x.name, values: x.values }; }) },
        { title: '行业成交额堆叠（近45个交易日）', subtitle: '市值前 8 大行业 · 成交额（亿元）', unit: '亿元', source: '东方财富 · akshare 实时' });
    }

    /* ========== 21. 公司财务（阳光电源 300274，akshare 真实财报） ========== */
    if (AK && AK.company) {
      var co = AK.company;
      var L = co.labels || [];
      var rev = co.revenue || [], cost = co.cost || [], net = co.netProfit || [], roe = co.roe || [];
      var lastIdx = L.length - 1;
      var rv = rev[lastIdx], cs = cost[lastIdx], np = net[lastIdx];
      if (rv && cs && np) {
        var period = L[lastIdx] + '（累计）';
        // 同比（与去年同期比）
        var yoy = null;
        var prevIdx = -1;
        for (var pi = lastIdx - 1; pi >= 0; pi--) { if (L[pi] === String(parseInt(L[lastIdx], 10) - 1) + L[lastIdx].slice(4)) { prevIdx = pi; break; } }
        if (prevIdx < 0 && lastIdx - 2 >= 0) prevIdx = lastIdx - 2;
        if (prevIdx >= 0 && rev[prevIdx] > 0) yoy = rev[lastIdx] / rev[prevIdx] - 1;
        var yoyTxt = (yoy !== null && isFinite(yoy)) ? (' · 营收同比 ' + (yoy >= 0 ? '+' : '') + (yoy * 100).toFixed(1) + '%') : '';
        var E8 = 1e8;
        var rvY = rv / E8, csY = cs / E8, feeY = (rv - cs - np) / E8, npY = np / E8;
        var pc = function (v) { return rvY > 0 ? (Math.abs(v) / rvY * 100).toFixed(1) + '%' : '—'; };
        setSample('fin-waterfall', {
          labels: ['营业总收入', '减：营业成本', '减：期间费用', '净利润'],
          values: [Math.round(rvY), -Math.round(csY), -Math.round(feeY), Math.round(npY)],
          totalFromZero: true
        }, {
          title: co.name + ' · 一块钱收入最后剩多少（' + period + '）',
          subtitle: '收入 ' + rvY.toFixed(0) + ' 亿，扣成本 ' + csY.toFixed(0) + ' 亿（' + pc(csY) + '）、费用 ' + feeY.toFixed(0) + ' 亿（' + pc(feeY) + '），净赚 ' + npY.toFixed(0) + ' 亿（' + pc(npY) + '）' + yoyTxt,
          unit: '亿元', source: '公司财报 · akshare 实时'
        });
        // 环形：成本/费用/净利
        var donutV = [
          { name: '营业成本', value: Math.round(cs / 1e8) },
          { name: '期间费用', value: Math.round((rv - cs - np) / 1e8) },
          { name: '净利润', value: Math.round(np / 1e8) }
        ];
        setSample('fin-donut', { data: donutV, unit: ' 亿元', centerLabel: '营业总收入' }, {
          title: co.name + ' · 收入都去哪了（' + period + '）',
          subtitle: '每 100 元收入里：成本、费用、净赚各占多少',
          unit: '亿元', source: '公司财报 · akshare 实时'
        });
        // 桑基
        setSample('fin-sankey', {
          nodes: [{ name: '营业总收入' }, { name: '营业成本' }, { name: '毛利' }, { name: '期间费用' }, { name: '净利润' }],
          links: [
            { source: '营业总收入', target: '营业成本', value: Math.round(cs / 1e8) },
            { source: '营业总收入', target: '毛利', value: Math.round((rv - cs) / 1e8) },
            { source: '毛利', target: '期间费用', value: Math.round((rv - cs - np) / 1e8) },
            { source: '毛利', target: '净利润', value: Math.round(np / 1e8) }
          ]
        }, { title: co.name + ' 收入流向（' + period + '）', subtitle: '营收 → 成本 / 毛利 → 费用 / 净利', unit: '亿元', source: '公司财报 · akshare 实时' });
      }
      // 双轴：营收(柱) + 净利率(线)
      var validIdx = [];
      L.forEach(function (_, i) { if (rev[i] && net[i]) validIdx.push(i); });
      if (validIdx.length >= 6) {
        var L2 = validIdx.map(function (i) { return L[i]; });
        var revBars = validIdx.map(function (i) { return Math.round(rev[i] / 1e8); });
        var margin = validIdx.map(function (i) { return Math.round((net[i] / rev[i]) * 10000) / 100; });
        setSample('fin-combo', { labels: L2, bars: [{ name: '营业总收入', values: revBars }], lines: [{ name: '净利率', values: margin }] },
          { title: co.name + ' 营收与净利率', subtitle: '柱：营业总收入（亿元） · 线：净利率（%）', unit: '亿元', source: '公司财报 · akshare 实时' });
      }
      // 指标卡
      var roeLast = roe[lastIdx];
      var gm = rv ? (rv - cs) / rv * 100 : null;
      if (rv && np) {
        var prevNet = (prevIdx >= 0) ? net[prevIdx] : null;
        var netYoy = (prevNet && prevNet !== 0) ? (np / prevNet - 1) : null;
        var revYoy = yoy;
        function pctStr(v) { return v === null || !isFinite(v) ? '—' : ((v >= 0 ? '+' : '') + (v * 100).toFixed(1) + '%'); }
        var cards2 = [
          { label: '营业总收入', value: fmtCny(rv), delta: pctStr(revYoy), dir: (revYoy >= 0 ? 'pos' : 'neg'), spark: rev.filter(function (x) { return x; }).slice(-12).map(function (x) { return x / 1e8; }) },
          { label: '净利润', value: fmtCny(np), delta: pctStr(netYoy), dir: (netYoy >= 0 ? 'pos' : 'neg'), spark: net.filter(function (x) { return x; }).slice(-12).map(function (x) { return x / 1e8; }) },
          { label: '毛利率', value: gm !== null ? gm.toFixed(1) + '%' : '—', delta: '', dir: 'pos', spark: [] },
          { label: 'ROE', value: roeLast !== null && roeLast !== undefined ? roeLast.toFixed(1) + '%' : '—', delta: '', dir: 'pos', spark: roe.filter(function (x) { return x !== null && x !== undefined; }).slice(-12) }
        ];
        setSample('fin-kpi', { cards: cards2 }, { title: co.name + tr(' 经营概览（',' · Operating Overview (') + period + tr('）',')'), subtitle: tr('营收 / 净利润 / 毛利率 / ROE','Revenue / Net profit / Gross margin / ROE'), unit: '', source: '公司财报 · akshare 实时' });
      }
    }

    /* ========== 21.4 苹果产品营收桑基图（真实财报 TTM） ========== */
    var APPLE = [
      { name: 'iPhone', value: 254.10, icon: '📱', color: '#C9A96A' },
      { name: '服务', value: 123.30, icon: '☁️', color: '#5FA8C9' },
      { name: 'Mac', value: 37.93, icon: '💻', color: '#C08484' },
      { name: '可穿戴/家居', value: 35.58, icon: '⌚', color: '#7FA06F' },
      { name: 'iPad', value: 27.93, icon: '📲', color: '#9B7FB5' }
    ];
    var appleTotal = APPLE.reduce(function (a, b) { return a + b.value; }, 0);
    var S5 = S['apple-sankey'] || (S['apple-sankey'] = { meta: {}, type: 'sankey', data: {} });
    S5.type = 'sankey';
    S5.data = {
      total: appleTotal,
      nodes: [{ name: '苹果总营收', icon: '🍎', color: '#F2EFE6', depth: 0 }].concat(
        APPLE.map(function (p) { return { name: p.name, icon: p.icon, color: p.color, depth: 1,
          displayLabel: p.icon + '  ' + p.name + '   ' + (p.value / appleTotal * 100).toFixed(1) + '%' }; })
      ),
      links: APPLE.map(function (p) { return { source: '苹果总营收', target: p.name, value: p.value }; })
    };
    S5.meta = Object.assign({}, S5.meta, {
      title: '苹果公司 · 营收来自哪块业务（TTM 2026Q3）',
      subtitle: '近 12 个月营收拆解 · 合计 478.8 十亿美元（约 3.4 万亿元）',
      unit: '十亿美元', source: 'Apple 财报 · 实时'
    });

    /* ========== 21.5 美债收益率曲线 ========== */
    if (AK && AK.ustCurve && AK.ustCurve.curves && AK.ustCurve.curves.length) {
      var yc = AK.ustCurve;
      var S4 = S['fin-yield-curve'] || (S['fin-yield-curve'] = { meta: {}, type: 'line', data: {} });
      S4.type = 'line';
      S4.data = { labels: yc.maturities, series: yc.curves.map(function (c) { return { name: c.date, values: c.values }; }) };
      S4.meta = Object.assign({}, S4.meta, { title: '美国国债收益率曲线', subtitle: '不同期限收益率对比（%）', unit: '%', source: '美国财政部 · Tushare 实时' });
    }

    /* ========== 22. 金融资产（新增） ========== */
    if (stocks.length >= 3) {
      // 年度收益热力
      var years = {};
      stocks.slice(0, 8).forEach(function (it) {
        var m = {};
        it.labels.forEach(function (l, i) { var y = String(l).slice(0, 4); if (/^\d{4}$/.test(y)) m[y] = it.series[0].values[i]; });
        years[it.title] = m;
      });
      var allYears = {};
      Object.keys(years).forEach(function (k) { Object.keys(years[k]).forEach(function (y) { allYears[y] = true; }); });
      var ys = Object.keys(allYears).sort().slice(-8);
      var heatVals = [], heatYs = [];
      stocks.slice(0, 8).forEach(function (it, ri) {
        var m = years[it.title];
        heatYs.push(it.title);
        // 年初值：取该年第一个有值点
        var prev = null;
        it.labels.forEach(function (l, i) {
          var y = String(l).slice(0, 4);
          if (!/^\d{4}$/.test(y)) return;
          if (m[y] === undefined) return;
          if (m['__first' + y] === undefined) m['__first' + y] = it.series[0].values[i];
        });
      });
      stocks.slice(0, 8).forEach(function (it, ri) {
        var m = years[it.title];
        ys.forEach(function (y, ci) {
          // 该年最后值与首个值
          var valsInYear = [];
          it.labels.forEach(function (l, i) { if (String(l).slice(0, 4) === y) valsInYear.push(it.series[0].values[i]); });
          if (valsInYear.length >= 2 && valsInYear[0] > 0) {
            heatVals.push([ci, ri, Math.round((valsInYear[valsInYear.length - 1] / valsInYear[0] - 1) * 10000) / 100]);
          }
        });
      });
      if (heatVals.length > 10) {
        var S2 = S['asset-heat'] || (S['asset-heat'] = { meta: {}, type: 'heatmap', data: {} });
        S2.type = 'heatmap';
        S2.data = { xLabels: ys, yLabels: heatYs, values: heatVals };
        S2.meta = Object.assign({}, S2.meta, { title: '全球股指年度收益热力', subtitle: '年度涨跌幅（%）', unit: '%', source: '公开行情 · 实时' });
      }
    }
    if (stocks.length >= 3 && hs300) {
      var S3 = S['asset-rank'] || (S['asset-rank'] = { meta: {}, type: 'rank', data: {} });
      var cats3 = [], vs3 = [];
      ['沪深300', '中证500', '日经225', '德国DAX', '纳斯达克', '标普500', '英国富时100', '法国CAC40'].map(fFind).forEach(function (it) {
        if (!it) return;
        var v = it.series[0].values; if (v.length < 2 || !(v[0] > 0)) return;
        cats3.push(it.title); vs3.push(Math.round((v[v.length - 1] / v[0] - 1) * 10000) / 100);
      });
      S3.type = 'rank';
      S3.data = { categories: cats3, values: vs3 };
      S3.meta = Object.assign({}, S3.meta, { title: '全球股指累计涨幅排名', subtitle: '自上市/起始以来累计涨幅（%）', unit: '%', source: '公开行情 · 实时' });
    }
  }

  /* 事件标注跟随真实数据：从数据自动生成高点/低点/变动点 */
  function hydrateEvents() {
    function seriesOf(id) {
      var smp = DataLoader.SAMPLES[id];
      if (!smp || !smp.data) return null;
      var d = smp.data;
      var meta = smp.meta || {};
      if (d.labels && d.series && d.series.length) return { labels: d.labels, values: d.series[0].values, unit: meta.unit || '', title: meta.title || id };
      if (d.labels && d.values) return { labels: d.labels, values: d.values, unit: meta.unit || '', title: meta.title || id };
      if (d.labels && d.bars && d.bars.length) return { labels: d.labels, values: d.bars[0].values, unit: meta.unit || '', title: (meta.title || id) };
      if (d.labels && d.lines && d.lines.length) return { labels: d.labels, values: d.lines[0].values, unit: meta.unit || '', title: (meta.title || id) };
      if (d.nav && d.nav.length) return { labels: d.nav.map(function (p) { return String(p.date); }), values: d.nav.map(function (p) { return p.value; }), unit: meta.unit || '', title: (meta.title || id) };
      return null;
    }
    function validPoints(ser) {
      var out = [];
      for (var i = 0; i < ser.labels.length; i++) {
        var v = ser.values[i];
        if (v !== null && v !== undefined && !isNaN(v)) out.push({ i: i, v: Number(v) });
      }
      return out;
    }
    function fmtV(v, unit) { return fmtNum(v) + (unit ? (' ' + unit) : ''); }
    function extremes(ser) {
      var pts = validPoints(ser);
      if (pts.length < 5) return [];
      var maxP = pts[0], minP = pts[0];
      pts.forEach(function (p) { if (p.v > maxP.v) maxP = p; if (p.v < minP.v) minP = p; });
      var out = [];
      out.push({ x: String(ser.labels[maxP.i]), label: tr('高点 ','High ') + fmtNum(maxP.v),
        desc: isEn() ? (DT(ser.title || 'Indicator') + ' peaked at ' + fmtV(maxP.v, DT(ser.unit)) + ' on ' + ser.labels[maxP.i] + '.')
                     : ((ser.title || '指标') + ' 于 ' + ser.labels[maxP.i] + ' 达到区间最高 ' + fmtV(maxP.v, ser.unit) + '。') });
      if (minP.i !== maxP.i) {
        out.push({ x: String(ser.labels[minP.i]), label: tr('低点 ','Low ') + fmtNum(minP.v),
          desc: isEn() ? (DT(ser.title || 'Indicator') + ' bottomed at ' + fmtV(minP.v, DT(ser.unit)) + ' on ' + ser.labels[minP.i] + '.')
                       : ((ser.title || '指标') + ' 于 ' + ser.labels[minP.i] + ' 录得区间最低 ' + fmtV(minP.v, ser.unit) + '。') });
      }
      return out;
    }
    function changePoints(ser, n) {
      var pts = validPoints(ser);
      var changes = [];
      for (var k = 1; k < pts.length; k++) {
        if (Math.abs(pts[k].v - pts[k - 1].v) > 1e-9) changes.push({ i: pts[k].i, from: pts[k - 1].v, to: pts[k].v });
      }
      changes = changes.slice(-(n || 2));
      return changes.map(function (c) {
        return { x: String(ser.labels[c.i]), label: (c.to > c.from ? tr('上调 ','Hike ') : tr('下调 ','Cut ')) + fmtNum(Math.abs(c.to - c.from)),
          desc: isEn() ? (DT(ser.title || 'Indicator') + ' moved from ' + fmtV(c.from, DT(ser.unit)) + ' to ' + fmtV(c.to, DT(ser.unit)) + ' on ' + ser.labels[c.i] + '.')
                       : (ser.labels[c.i] + '：' + (ser.title || '指标') + ' 由 ' + fmtV(c.from, ser.unit) + ' 调整为 ' + fmtV(c.to, ser.unit) + '。') };
      });
    }
    function setEvents(id, list) {
      if (!list || !list.length) { delete EVENTS[id]; return; }
      // 去重（同一 x 只保留一个）
      var seen = {};
      EVENTS[id] = list.filter(function (e) { if (seen[e.x]) return false; seen[e.x] = 1; return true; });
    }
    var gdp = seriesOf('macro-gdp-area'); if (gdp) setEvents('macro-gdp-area', extremes(gdp));
    var dual = seriesOf('macro-dual'); if (dual) setEvents('macro-dual', extremes(dual).slice(0, 2));
    var lpr = seriesOf('macro-step'); if (lpr) setEvents('macro-step', changePoints(lpr, 2));
    var seirong = seriesOf('macro-sheirong-stack'); if (seirong) setEvents('macro-sheirong-stack', extremes(seirong));
    var pmiRadar = seriesOf('macro-pmi-radar'); // radar 无 x 轴，跳过
    var cpiT = seriesOf('macro-cpi'); if (cpiT) setEvents('macro-cpi', extremes(cpiT));
    var m2T = seriesOf('macro-m2'); if (m2T) setEvents('macro-m2', extremes(m2T));
    var hsT = seriesOf('fund-perf');
    if (hsT) setEvents('fund-perf', extremes(hsT));
  }

  /* ---------- 启动 ---------- */
  function refreshFooter() {
    var fn = el('footer-note');
    if (!fn) return;
    fn.textContent = 'Advanced Data Visualization (ADV) · ' +
      tr('数据仅本地处理', 'All data processed locally') + ' · ' +
      tr('生成于', 'generated') + ' ' + new Date().toLocaleDateString(isEn() ? 'en-US' : 'zh-CN');
  }

  function init() {
    var q = {};
    try { new URLSearchParams(location.search).forEach(function (v, k) { q[k] = v; }); } catch (e) {}
    // 语言：URL 参数 > 本地存储 > 默认中文
    if (window.I18N) {
      var initLang = q.lang || (function () { try { return localStorage.getItem('adv_lang'); } catch (e) { return null; } })();
      window.I18N.setLang(initLang === 'en' ? 'en' : 'zh');
    }
    // 外观：本地存储 > URL ?theme= > 跟随系统；首屏静默套用，不弹提示
    readAppearance();
    if (q.theme && Themes.getTheme(q.theme)) {
      var qm = Themes.modeOf(q.theme);
      state.appearance = qm;
      state.themeByMode[qm] = q.theme;
    }
    if (q.tpl && DataLoader.SAMPLES[q.tpl]) state.currentTemplate = q.tpl;
    applyAppearance(state.appearance, { silent: true });
    if (window.WORLD_GEOJSON && window.echarts) { try { echarts.registerMap('world', window.WORLD_GEOJSON); } catch (e) {} }
    /* 数据改为按需加载，启动时不再预解析 */
    prefetchLibs();
    buildThemeSelect();
    buildAppearanceSwitch();
    watchSystemAppearance();
    buildSidebar();
    buildTabs();
    buildSampleTab();
    buildGoalCards();
    bindEvents();
    if (el('btn-watermark')) el('btn-watermark').classList.add('active');
    el('footer-note').textContent = 'Advanced Data Visualization (ADV) · ' + tr('数据仅本地处理','All data processed locally') + ' · ' + tr('生成于','generated') + ' ' + new Date().toLocaleDateString(isEn() ? 'en-US' : 'zh-CN');
    if (q.chart) {
      /* 链接里的图需要 ECharts，首屏是懒加载的，先确保库就绪再渲染 */
      var renderFromLink = function () {
        var raw = String(q.chart || '');
        /* 兼容：URL 查询里 '+' 会被解析成空格，标准 base64 需要还原 */
        var tries = [raw, raw.replace(/ /g, '+'), raw.replace(/ /g, '%2B')];
        var cfg = null;
        for (var ti = 0; ti < tries.length && cfg === null; ti++) {
          try { cfg = JSON.parse(b64Decode(tries[ti])); } catch (e) { /* 尝试下一种 */ }
        }
        if (cfg === null) { toast(tr('图表链接无效（数据解析失败）', 'Invalid chart link (cannot parse)'), true); return; }
        try { applyChartConfig(cfg); }
        catch (e) { toast(tr('图表渲染失败：', 'Render failed: ') + (e && e.message ? e.message : ''), true); if (window.console) console.error(e); }
      };
      if (window.echarts) renderFromLink();
      else withCharts(renderFromLink);
      return;
    }
    var bootWithTemplate = function () {
      if (q.tpl && DataLoader.SAMPLES[q.tpl]) renderTemplate(q.tpl);
      else if (q.view === 'macro') renderChinaMacro();
      else if (q.view === 'finance') renderFinance();
      else if (q.view === 'intl') renderIntlMacro();
      else renderHome();
    };
    /* 深链接（示例模板 / 数据看板）都要画图，等引擎就绪再渲染；首页不必等 */
    if (q.tpl || q.view) withCharts(bootWithTemplate);
    else bootWithTemplate();
  }

  document.addEventListener('DOMContentLoaded', init);

  /* 二次访问加速：注册 Service Worker 缓存静态资源（仅 http/https 生效） */
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
    window.addEventListener('load', function () {
      try { navigator.serviceWorker.register('sw.js').catch(function () {}); } catch (e) {}
    });
  }
})();
