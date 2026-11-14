/* ============================================================
 * 图表工厂 — 基于 Apache ECharts 的模版渲染器
 * 覆盖：面积/双轴/阶梯/热力/排名/气泡/树图/堆叠/瀑布/环形/KPI
 * ============================================================ */
(function (global) {
  'use strict';

  var instances = [];

  function isEnLang() { return !!(window.I18N && window.I18N.getLang() === 'en'); }
  function DTi(s) { return (window.DATA_I18N && window.DATA_I18N.t) ? window.DATA_I18N.t(s) : s; }

  // tooltip / label 以 HTML 注入：系列名、数据点名字、轴名都来自用户数据（含分享链接），必须转义
  var ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function ex(v) {
    return String(v === undefined || v === null ? '' : v).replace(/[&<>"']/g, function (c) { return ESC_MAP[c]; });
  }

  /* tooltip 是 HTML 渲染，formatter 的返回值会直接进 innerHTML。formatter 分散在
     chart-factory / chart-extra / showcase 三个文件里（chart-extra 里还有重复定义的图表），
     逐个手工转义容易漏，这里在交给 ECharts 之前统一过一次白名单：只留排版标签和
     style/class 等属性，img/script/svg/on* 之类全部丢掉。 */
  var TIP_TAGS = { DIV: 1, SPAN: 1, BR: 1, B: 1, I: 1, EM: 1, STRONG: 1, SMALL: 1, P: 1, HR: 1, TABLE: 1, THEAD: 1, TBODY: 1, TR: 1, TD: 1, TH: 1, UL: 1, OL: 1, LI: 1 };
  var TIP_ATTRS = { style: 1, class: 1, color: 1, colspan: 1, rowspan: 1, align: 1 };

  function sanitizeHtml(input) {
    if (input === null || input === undefined) return '';
    var html = String(input);
    if (html.indexOf('<') < 0 && html.indexOf('&') < 0) return html;
    var doc;
    try { doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html'); }
    catch (e) { return ex(html); }
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 1) {
          if (!TIP_TAGS[child.tagName]) {
            // 白名单外的标签整体降级成纯文字（DOMParser 的文档没有浏览上下文，不会真的去加载 img）
            var text = doc.createTextNode(child.textContent || '');
            if (child.parentNode) child.parentNode.replaceChild(text, child);
            return;
          }
          Array.prototype.slice.call(child.attributes).forEach(function (attr) {
            if (!TIP_ATTRS[attr.name.toLowerCase()]) child.removeAttribute(attr.name);
          });
          walk(child);
        } else if (child.nodeType !== 3) {
          if (child.parentNode) child.parentNode.removeChild(child);
        }
      });
    })(doc.body);
    return doc.body.innerHTML;
  }

  function hardenTooltip(tt) {
    if (!tt) return;
    (Array.isArray(tt) ? tt : [tt]).forEach(function (t) {
      if (!t || typeof t.formatter !== 'function') return;
      var f = t.formatter;
      t.formatter = function (p) {
        var out = f.apply(this, arguments);
        return typeof out === 'string' ? sanitizeHtml(out) : out;
      };
    });
  }

  function hardenTooltips(option) {
    if (!option) return option;
    hardenTooltip(option.tooltip);
    (option.series || []).forEach(function (s) { if (s && typeof s === 'object') hardenTooltip(s.tooltip); });
    return option;
  }

  function hexToRgba(hex, alpha) {
    if (hex[0] === '#') hex = hex.slice(1);
    if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
    var r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function fmt(v) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    var n = Number(v), neg = n < 0;
    n = Math.abs(n);
    var s = n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    return (neg ? '-' : '') + s;
  }

  function axisCommon(theme) {
    return {
      axisLine: { lineStyle: { color: theme.axis } },
      axisTick: { show: false },
      axisLabel: { color: theme.muted, fontSize: 11,
        formatter: function (v) { return (typeof v === 'number' && isFinite(v)) ? fmt(v) : String(v); } },
      splitLine: { lineStyle: { color: theme.grid } },
      nameTextStyle: { color: theme.muted, fontSize: 11 }
    };
  }

  function tooltip(theme) {
    return {
      trigger: 'axis',
      triggerOn: 'mousemove|click',
      backgroundColor: theme.panel,
      borderColor: theme.accent + '55',
      borderWidth: 1,
      textStyle: { color: theme.text, fontSize: 12 },
      padding: [10, 14],
      confine: true,
      valueFormatter: function (v) { return fmt(v); },
      extraCssText: 'box-shadow: 0 8px 24px rgba(0,0,0,.4); border-radius: 8px;',
      axisPointer: {
        type: 'cross',
        snap: true,
        lineStyle: { color: theme.muted, opacity: 0.5 },
        crossStyle: { color: theme.muted, opacity: 0.5 },
        label: { backgroundColor: theme.accent, color: '#0E0F12', fontSize: 10 }
      }
    };
  }

  function legend(theme) {
    return {
      top: 6, right: 10, textStyle: { color: theme.muted, fontSize: 11 },
      itemWidth: 14, itemHeight: 8, icon: 'roundRect',
      inactiveColor: theme.muted + '44'
    };
  }

  function gridTop() { return { top: 46, left: 12, right: 16, bottom: 8, containLabel: true }; }
  function gridZoom() { return { top: 46, left: 12, right: 16, bottom: 8, containLabel: true }; }

  var watermarkOn = true;
  function setWatermark(v) { watermarkOn = !!v; }

  /* 可缩放的时间轴（鼠标滚轮/拖拽，无底部滑块） */
  function dataZoomCfg(theme) {
    return [
      { type: 'inside', zoomOnMouseWheel: true, moveOnMouseMove: true, moveOnMouseWheel: false }
    ];
  }

  /* 悬停高亮当前系列、其余变暗 */
  function focusCfg() {
    return {
      emphasis: { focus: 'series' },
      blur: { lineStyle: { opacity: 0.12 }, itemStyle: { opacity: 0.12 }, areaStyle: { opacity: 0.06 } }
    };
  }

  /* 给系列对象合并高亮配置 */
  function withFocus(s) { return Object.assign(s, focusCfg()); }

  function areaGradient(echarts, color) {
    return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: hexToRgba(color, 0.30) },
      { offset: 1, color: hexToRgba(color, 0.00) }
    ]);
  }

  /* ---------- 面积 / 折线 ---------- */
  function lineArea(el, data, theme) {
    var series = data.series.map(function (s, i) {
      var c = theme.series[i % theme.series.length];
      return withFocus({
        name: s.name, type: 'line', smooth: true, symbol: 'none',
        data: s.values, color: c,
        lineStyle: { width: 2.4 },
        areaStyle: { color: areaGradient(echarts, c) }
      });
    });
    var option = {
      backgroundColor: theme.bg,
      tooltip: tooltip(theme),
      legend: legend(theme),
      grid: gridZoom(),
      dataZoom: dataZoomCfg(theme),
      xAxis: [Object.assign({ type: 'category', boundaryGap: false, data: data.labels }, axisCommon(theme))],
      yAxis: [Object.assign({ type: 'value', scale: true }, axisCommon(theme))],
      series: series
    };
    return option;
  }

  /* ---------- 纯折线（无填充） ---------- */
  function lineOnly(el, data, theme) {
    var option = lineArea(el, data, theme);
    option.series.forEach(function (s) { s.areaStyle = undefined; s.symbol = 'circle'; s.symbolSize = 4; });
    return option;
  }

  /* ---------- 分组柱状 ---------- */
  function barChart(el, data, theme) {
    var option = {
      backgroundColor: theme.bg,
      tooltip: tooltip(theme),
      legend: legend(theme),
      grid: gridZoom(),
      dataZoom: dataZoomCfg(theme),
      xAxis: [Object.assign({ type: 'category', data: data.labels }, axisCommon(theme))],
      yAxis: [Object.assign({ type: 'value' }, axisCommon(theme))],
      series: data.series.map(function (s, i) {
        return withFocus({
          name: s.name, type: 'bar', data: s.values, barMaxWidth: 26,
          itemStyle: { color: theme.series[i % theme.series.length], borderRadius: [3, 3, 0, 0] }
        });
      })
    };
    return option;
  }

  /* ---------- 堆叠柱状（如社融按年/月对比） ---------- */
  function stackedBar(el, data, theme) {
    var option = {
      backgroundColor: theme.bg,
      tooltip: tooltip(theme),
      legend: legend(theme),
      grid: gridZoom(),
      dataZoom: dataZoomCfg(theme),
      xAxis: [Object.assign({ type: 'category', data: data.labels }, axisCommon(theme))],
      yAxis: [Object.assign({ type: 'value' }, axisCommon(theme))],
      series: data.series.map(function (s, i) {
        return withFocus({
          name: s.name, type: 'bar', stack: 'total', data: s.values, barMaxWidth: 26,
          itemStyle: { color: theme.series[i % theme.series.length], borderRadius: i === data.series.length - 1 ? [3, 3, 0, 0] : 0 }
        });
      })
    };
    return option;
  }

  /* ---------- 雷达图（如 PMI 分项对比） ---------- */
  function radar(el, data, theme) {
    // 每个维度按实际数据区间自动收窄，让差异更明显
    var indicators = data.indicators.map(function (ind, i) {
      var vals = data.series.map(function (s) { return s.values[i]; }).filter(function (v) { return isFinite(v); });
      var min = ind.min, max = ind.max;
      if (vals.length) {
        var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
        var span = (mx - mn) || Math.abs(mx) || 1;
        min = Math.floor((mn - span * 0.25) * 10) / 10;
        max = Math.ceil((mx + span * 0.25) * 10) / 10;
      }
      return { name: ind.name, min: min !== undefined ? min : undefined, max: max !== undefined ? max : (ind.max || 100) };
    });
    var option = {
      backgroundColor: theme.bg,
      tooltip: Object.assign({}, tooltip(theme), { trigger: 'item' }),
      legend: legend(theme),
      radar: {
        indicator: indicators,
        top: 46, bottom: 16, left: 30, right: 30,
        axisName: { color: theme.muted, fontSize: 11 },
        splitLine: { lineStyle: { color: theme.grid } },
        splitArea: { areaStyle: { color: [hexToRgba(theme.text, 0.02), 'transparent'] } },
        axisLine: { lineStyle: { color: theme.grid } }
      },
      series: [{
        type: 'radar',
        data: data.series.map(function (s, i) {
          return {
            name: s.name, value: s.values,
            lineStyle: { color: theme.series[i % theme.series.length], width: 2 },
            itemStyle: { color: theme.series[i % theme.series.length] },
            areaStyle: { color: hexToRgba(theme.series[i % theme.series.length], 0.15) },
            symbolSize: 4
          };
        })
      }]
    };
    return option;
  }

  /* ---------- 阶梯线 ---------- */
  function stepLine(el, data, theme) {
    var option = lineArea(el, data, theme);
    option.series.forEach(function (s) { s.step = 'end'; s.areaStyle = undefined; });
    return option;
  }

  /* ---------- 柱 + 线 双轴 ---------- */
  function dual(el, data, theme) {
    var barColor = theme.accent;
    var lineColor = theme.series[1] || theme.up;
    var series = [];
    (data.bars || []).forEach(function (b) {
      series.push({
        name: b.name, type: 'bar', data: b.values, yAxisIndex: 0,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: barColor }, { offset: 1, color: hexToRgba(barColor, 0.55) }
          ]),
          borderRadius: [3, 3, 0, 0]
        },
        barMaxWidth: 26
      });
    });
    (data.lines || []).forEach(function (l, i) {
      series.push({
        name: l.name, type: 'line', data: l.values, yAxisIndex: 1,
        color: lineColor, symbol: 'circle', symbolSize: 5, smooth: true,
        lineStyle: { width: 2.4 }
      });
    });
    series.forEach(function (s) { withFocus(s); });
    var option = {
      backgroundColor: theme.bg,
      tooltip: tooltip(theme),
      legend: Object.assign(legend(theme), { right: 16, top: 8 }),
      grid: { top: 50, left: 12, right: 24, bottom: 8, containLabel: true },
      dataZoom: dataZoomCfg(theme),
      xAxis: [Object.assign({ type: 'category', data: data.labels }, axisCommon(theme))],
      yAxis: [
        Object.assign({ type: 'value' }, axisCommon(theme)),
        Object.assign({ type: 'value', splitLine: { show: false } }, axisCommon(theme))
      ],
      series: series
    };
    return option;
  }

  /* ---------- 热力图 ---------- */
  function heatmap(el, data, theme) {
    var max = 0, min = 0;
    data.values.forEach(function (v) { max = Math.max(max, v[2]); min = Math.min(min, v[2]); });
    var option = {
      backgroundColor: theme.bg,
      tooltip: Object.assign({}, tooltip(theme), {
        trigger: 'item',
        axisPointer: null,
        position: 'top',
        formatter: function (p) {
          var yy = (data.yLabels && data.yLabels[p.value[1]]) || '';
          var xx = (data.xLabels && data.xLabels[p.value[0]]) || '';
          return yy + ' · ' + xx + (isEnLang() ? ': ' : '：') + p.value[2] + '%';
        }
      }),
      grid: { top: 46, left: 12, right: 74, bottom: 8, containLabel: true },
      xAxis: [Object.assign({ type: 'category', data: data.xLabels, splitArea: { show: true } }, axisCommon(theme))],
      yAxis: [Object.assign({ type: 'category', data: data.yLabels, splitArea: { show: true } }, axisCommon(theme))],
      visualMap: {
        min: min, max: max, calculable: false, orient: 'vertical', right: 6, top: 'middle',
        itemWidth: 10, itemHeight: 90, textStyle: { color: theme.muted, fontSize: 10 },
        inRange: { color: [hexToRgba(theme.down, 0.9), theme.bg, hexToRgba(theme.accent, 0.95)] }
      },
      series: [{
        type: 'heatmap', data: data.values,
        label: { show: true, color: theme.text, fontSize: 11 },
        itemStyle: { borderColor: theme.bg, borderWidth: 2 },
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,.5)' } }
      }]
    };
    return option;
  }

  /* ---------- 横向排名 ---------- */
  function fmtNumJs(v) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    var n = Number(v);
    if (Math.abs(n) >= 10000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
    return String(Math.round(n * 100) / 100);
  }

  function rank(el, data, theme) {
    var sorted = data.categories.map(function (c, i) { return { c: c, v: data.values[i] }; })
      .sort(function (a, b) { return a.v - b.v; });
    /* 单位可由数据指定：百分比数据用 %，计数/金额等用自定义单位 */
    var unit = (data && data.unit !== undefined && data.unit !== null) ? String(data.unit) : '%';
    var isPct = unit === '%';
    var option = {
      backgroundColor: theme.bg,
      tooltip: Object.assign({}, tooltip(theme), { trigger: 'item', formatter: function (p) { return ex(p.name) + (isEnLang() ? ': ' : '：') + fmtNumJs(p.value) + ex(unit); } }),
      grid: { top: 12, left: 12, right: 52, bottom: 12, containLabel: true },
      xAxis: [Object.assign({ type: 'value', splitLine: { lineStyle: { color: theme.grid } } }, axisCommon(theme))],
      yAxis: [Object.assign({
        type: 'category', data: sorted.map(function (d) { return d.c; }),
        axisLine: { lineStyle: { color: theme.axis } },
        axisTick: { show: false },
        axisLabel: { color: theme.text, fontSize: 12 }
      }, axisCommon(theme))],
      series: [{
        type: 'bar', data: sorted.map(function (d) { return d.v; }),
        barWidth: '58%',
        label: { show: true, position: 'right', color: theme.muted, fontSize: 11,
          formatter: function (p) {
            var v = fmtNumJs(p.value);
            return (isPct && p.value > 0 ? '+' : '') + v + unit;
          } },
        itemStyle: {
          color: function (p) { return p.value >= 0 ? theme.up : theme.down; },
          borderRadius: 3
        }
      }]
    };
    return option;
  }

  /* ---------- 气泡矩阵 ---------- */
  function bubble(el, data, theme) {
    var sizeMin = 8, sizeMax = 52;
    var maxSize = Math.max.apply(null, data.data.map(function (d) { return d.size; }));
    var option = {
      backgroundColor: theme.bg,
      tooltip: Object.assign({}, tooltip(theme), {
        trigger: 'item',
        formatter: function (p) {
          var d = p.data;
          return '<b>' + ex(d.name) + '</b><br/>' + ex(data.xName) + '：' + d.value[0] + '%<br/>' +
                 ex(data.yName) + '：' + d.value[1] + '%<br/>' + ex(data.sizeName) + '：' + d.value[2] + ' 万亿元';
        }
      }),
      grid: gridTop(),
      xAxis: [Object.assign({ type: 'value', name: data.xName + '(%)', splitLine: { lineStyle: { color: theme.grid } } }, axisCommon(theme))],
      yAxis: [Object.assign({ type: 'value', name: data.yName + '(%)' }, axisCommon(theme))],
      series: [{
        type: 'scatter',
        data: data.data.map(function (d) { return { name: d.name, value: [d.x, d.y, d.size] }; }),
        symbolSize: function (v) { return sizeMin + (v[2] / maxSize) * (sizeMax - sizeMin); },
        itemStyle: { color: hexToRgba(theme.accent, 0.65), borderColor: theme.accent, borderWidth: 1 },
        label: { show: true, position: 'top', color: theme.text, fontSize: 10,
          formatter: function (p) { return p.data.name; } },
        labelLayout: { hideOverlap: true },
        emphasis: { itemStyle: { color: theme.accent, opacity: 1 } }
      }]
    };
    return option;
  }

  /* ---------- 树图 / 板块热力 ---------- */
  function treemap(el, data, theme) {
    var total = data.data.reduce(function (s, d) { return s + d.value; }, 0);
    var option = {
      backgroundColor: theme.bg,
      tooltip: Object.assign({}, tooltip(theme), {
        trigger: 'item',
        formatter: function (p) {
          return isEnLang() ? (ex(p.name) + ': CNY ' + p.value + 'tn (' + ((p.value / total) * 100).toFixed(1) + '% of total)') : (ex(p.name) + '：' + p.value + ' 万亿元（' + ((p.value / total) * 100).toFixed(1) + '%）');
        }
      }),
      series: [{
        type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false },
        data: data.data,
        top: 6, left: 6, right: 6, bottom: 6,
        label: { show: true, color: theme.text, fontSize: 12,
          formatter: function (p) { return p.name + '\n' + p.value.toFixed(1); } },
        itemStyle: { borderColor: theme.bg, borderWidth: 3, gapWidth: 3 },
        levels: [{
          itemStyle: { borderColor: theme.bg, borderWidth: 3, gapWidth: 3 },
          color: theme.series,
          colorSaturation: [0.25, 0.55]
        }]
      }]
    };
    return option;
  }

  /* ---------- 堆叠面积 ---------- */
  function stacked(el, data, theme) {
    var option = lineArea(el, data, theme);
    option.series.forEach(function (s) {
      s.stack = 'total';
      s.areaStyle = { color: hexToRgba(s.color, 0.45), opacity: 1 };
      s.lineStyle.width = 1.5;
    });
    return option;
  }

  /* ---------- 堆叠折线（无填充，如社融分项堆叠） ---------- */
  function stackedLine(el, data, theme) {
    var option = lineOnly(el, data, theme);
    option.series.forEach(function (s) {
      s.stack = 'total';
      s.symbol = 'circle';
      s.symbolSize = 4;
      s.lineStyle.width = 2;
    });
    return option;
  }

  /* ---------- 季节性对比（每年一条线，1-12月为横轴，看多年趋势） ---------- */
  function season(el, data, theme) {
    var labels = data.labels || [];
    var values = (data.series && data.series[0]) ? data.series[0].values : [];
    var months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    var yearMap = {}, yearOrder = [];
    labels.forEach(function (l, i) {
      var m = String(l).match(/(\d{4})-(\d{2})/);
      if (!m) return;
      var y = m[1], mon = parseInt(m[2], 10);
      if (mon < 1 || mon > 12) return;
      if (!yearMap[y]) { yearMap[y] = new Array(12).fill(null); yearOrder.push(y); }
      yearMap[y][mon - 1] = values[i];
    });
    yearOrder.sort();
    var maxYears = data.maxYears;
    if (maxYears && yearOrder.length > maxYears) yearOrder = yearOrder.slice(yearOrder.length - maxYears);
    var series = yearOrder.map(function (y, idx) {
      var c = theme.series[idx % theme.series.length];
      return withFocus({
        name: y + '年', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5,
        data: yearMap[y], color: c, lineStyle: { width: 2.4 }
      });
    });
    return {
      backgroundColor: theme.bg,
      tooltip: tooltip(theme),
      legend: legend(theme),
      grid: gridZoom(),
      dataZoom: dataZoomCfg(theme),
      xAxis: [Object.assign({ type: 'category', data: months, boundaryGap: false }, axisCommon(theme))],
      yAxis: [Object.assign({ type: 'value', scale: true }, axisCommon(theme))],
      series: series
    };
  }

  /* ---------- 双轴折线（量级差异大的多指标对比） ---------- */
  function dualLine(el, data, theme) {
    var series = (data.series || []).map(function (s, i) {
      return withFocus({
        name: s.name, type: 'line', data: s.values, yAxisIndex: s.yAxisIndex || 0,
        symbol: 'none', smooth: true, color: theme.series[i % theme.series.length],
        lineStyle: { width: 2.4 }
      });
    });
    return {
      backgroundColor: theme.bg,
      tooltip: tooltip(theme),
      legend: Object.assign(legend(theme), { right: 16, top: 8 }),
      grid: { top: 50, left: 12, right: 24, bottom: 8, containLabel: true },
      dataZoom: dataZoomCfg(theme),
      xAxis: [Object.assign({ type: 'category', data: data.labels }, axisCommon(theme))],
      yAxis: [
        Object.assign({ type: 'value', scale: true }, axisCommon(theme)),
        Object.assign({ type: 'value', scale: true, splitLine: { show: false } }, axisCommon(theme))
      ],
      series: series
    };
  }

  /* ---------- 瀑布图 ---------- */
  function waterfall(el, data, theme) {
    var values = data.values, labels = data.labels;
    var n = values.length, last = n - 1;
    var base = [], positive = [], negative = [], sum = 0, cum = [];
    values.forEach(function (v, i) {
      if (i === 0) { base.push('-'); positive.push(v); negative.push('-'); sum = v; cum.push(v); }
      else if (i === last) {
        if (data.totalFromZero) {
          // 末项作为「结果/总额」从 0 起画，避免柱高为 0 让人看不懂
          base.push('-'); positive.push(values[last]); negative.push('-'); cum.push(values[last]);
        } else {
          base.push(sum); cum.push(values[last]);
          var d = values[last] - sum;
          if (d >= 0) { positive.push(d); negative.push('-'); }
          else { positive.push('-'); negative.push(-d); }
        }
      } else {
        if (v >= 0) { base.push(sum); positive.push(v); negative.push('-'); sum += v; }
        else { base.push(sum + v); positive.push('-'); negative.push(-v); sum += v; }
        cum.push(sum);
      }
    });
    var totalColor = hexToRgba(theme.accent, 0.85);
    function labelCfg(color) {
      return { show: true, position: 'top', color: theme.muted, fontSize: 11,
        formatter: function (p) { return p.value === '-' ? '' : p.value; } };
    }
    var option = {
      backgroundColor: theme.bg,
      tooltip: Object.assign({}, tooltip(theme), { trigger: 'axis' }),
      grid: { top: 46, left: 12, right: 16, bottom: 8, containLabel: true },
      xAxis: [Object.assign({ type: 'category', data: labels, axisLabel: { color: theme.text, fontSize: 11, interval: 0 } }, axisCommon(theme))],
      yAxis: [Object.assign({ type: 'value' }, axisCommon(theme))],
      series: [
        { name: '占位', type: 'bar', stack: 'w', itemStyle: { color: 'transparent' }, data: base, silent: true, tooltip: { show: false } },
        { name: '增长', type: 'bar', stack: 'w', data: positive, label: labelCfg(theme.up),
          itemStyle: { color: theme.up, borderRadius: 2 } },
        { name: '下降', type: 'bar', stack: 'w', data: negative,
          label: { show: true, position: 'top', color: theme.down, fontSize: 11,
            formatter: function (p) { return p.value === '-' ? '' : ('-' + p.value); } },
          itemStyle: { color: theme.down, borderRadius: 2 } }
      ]
    };
    // 首尾总额高亮
    option.series[1].data = positive.map(function (v, i) {
      if (i === 0 || i === last) { return { value: v, itemStyle: { color: totalColor } }; }
      return v;
    });
    return option;
  }

  /* ---------- 环形图 ---------- */
  function donut(el, data, theme) {
    var total = data.data.reduce(function (s, d) { return s + d.value; }, 0);
    var isPct = Math.abs(total - 100) < 2;            // 传入值本身就是百分比
    function pctOf(v) { return isPct ? v : (total > 0 ? v / total * 100 : 0); }
    var w = (el && el.clientWidth) || 800;
    var narrow = w < 520;                              // 手机 / 窄容器
    var cx = narrow ? '50%' : '38%';
    var cy = narrow ? '44%' : '50%';
    var centerMain = isPct ? '100%' : fmt(total);
    var centerSub = data.centerLabel
      ? (DTi(data.centerLabel) + (data.unit ? (isEnLang() ? ' (' + DTi(String(data.unit).trim()) + ')' : '（' + String(data.unit).trim() + '）') : ''))
      : (isPct ? (isEnLang() ? 'of total' : '合计占比') : (isEnLang() ? 'Total' : '合计'));
    var option = {
      backgroundColor: theme.bg,
      tooltip: Object.assign({}, tooltip(theme), { trigger: 'item', formatter: function (p) {
        if (isPct) return ex(p.name) + (isEnLang() ? ': ' : '：') + p.value + '%';
        var u = DTi(data.unit || '');
        return isEnLang()
          ? (ex(p.name) + '<br/>' + ex(u) + ' ' + fmt(p.value) + ' (' + pctOf(p.value).toFixed(1) + '% of total)')
          : (ex(p.name) + '<br/>' + ex(data.unit || '') + ' ' + fmt(p.value) + '（占 ' + pctOf(p.value).toFixed(1) + '%）');
      } }),
      legend: narrow
        ? Object.assign(legend(theme), { orient: 'horizontal', left: 'center', bottom: 2,
            itemWidth: 10, itemHeight: 10, itemGap: 10, textStyle: { color: theme.text, fontSize: 10 },
            formatter: function (nm) {
              var it = data.data.filter(function (d) { return d.name === nm; })[0];
              return it ? (nm + ' ' + pctOf(it.value).toFixed(1) + '%') : nm;
            } })
        : Object.assign(legend(theme), { orient: 'vertical', right: 12, top: 'center', itemWidth: 10, itemHeight: 10,
            formatter: function (nm) {
              var it = data.data.filter(function (d) { return d.name === nm; })[0];
              return it ? (nm + '  ' + pctOf(it.value).toFixed(1) + '%') : nm;
            } }),
      series: [{
        type: 'pie', radius: narrow ? ['46%', '64%'] : ['58%', '80%'], center: [cx, cy],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: theme.bg, borderWidth: 2 },
        label: { show: false },
        labelLine: { show: false },
        data: data.data.map(function (d, i) { return { name: d.name, value: d.value, itemStyle: { color: theme.series[i % theme.series.length] } }; }),
        emphasis: { scale: true, scaleSize: 6 }
      }],
      graphic: [{
        type: 'text', left: cx, top: narrow ? '39%' : '42%', z: 10,
        style: { text: centerMain, fill: theme.text, fontSize: narrow ? 16 : 20, fontWeight: 700, textAlign: 'center' }
      }, {
        type: 'text', left: cx, top: narrow ? '48%' : '53%', z: 10,
        style: {
          text: narrow ? (data.unit ? DTi(String(data.unit).trim()) : (isEnLang() ? 'Total' : '合计')) : centerSub,
          fill: theme.muted, fontSize: narrow ? 10 : 12, textAlign: 'center'
        }
      }]
    };
    return option;
  }

  /* ---------- 双轴折线（量级差异大的多指标对比） ---------- */
  function dualLine(el, data, theme) {
    var series = (data.series || []).map(function (s, i) {
      return withFocus({
        name: s.name, type: 'line', data: s.values, yAxisIndex: s.yAxisIndex || 0,
        symbol: 'none', smooth: true, color: theme.series[i % theme.series.length],
        lineStyle: { width: 2.4 }
      });
    });
    return {
      backgroundColor: theme.bg,
      tooltip: tooltip(theme),
      legend: Object.assign(legend(theme), { right: 16, top: 8 }),
      grid: { top: 50, left: 12, right: 24, bottom: 8, containLabel: true },
      dataZoom: dataZoomCfg(theme),
      xAxis: [Object.assign({ type: 'category', data: data.labels }, axisCommon(theme))],
      yAxis: [
        Object.assign({ type: 'value', scale: true }, axisCommon(theme)),
        Object.assign({ type: 'value', scale: true, splitLine: { show: false } }, axisCommon(theme))
      ],
      series: series
    };
  }

  /* ---------- 瀑布图 ---------- */
  function waterfall(el, data, theme) {
    var values = data.values, labels = data.labels;
    var n = values.length, last = n - 1;
    var base = [], positive = [], negative = [], sum = 0, cum = [];
    values.forEach(function (v, i) {
      if (i === 0) { base.push('-'); positive.push(v); negative.push('-'); sum = v; cum.push(v); }
      else if (i === last) {
        if (data.totalFromZero) {
          // 末项作为「结果/总额」从 0 起画，避免柱高为 0 让人看不懂
          base.push('-'); positive.push(values[last]); negative.push('-'); cum.push(values[last]);
        } else {
          base.push(sum); cum.push(values[last]);
          var d = values[last] - sum;
          if (d >= 0) { positive.push(d); negative.push('-'); }
          else { positive.push('-'); negative.push(-d); }
        }
      } else {
        if (v >= 0) { base.push(sum); positive.push(v); negative.push('-'); sum += v; }
        else { base.push(sum + v); positive.push('-'); negative.push(-v); sum += v; }
        cum.push(sum);
      }
    });
    var totalColor = hexToRgba(theme.accent, 0.85);
    function labelCfg(color) {
      return { show: true, position: 'top', color: theme.muted, fontSize: 11,
        formatter: function (p) { return p.value === '-' ? '' : p.value; } };
    }
    var option = {
      backgroundColor: theme.bg,
      tooltip: Object.assign({}, tooltip(theme), { trigger: 'axis' }),
      grid: { top: 46, left: 12, right: 16, bottom: 8, containLabel: true },
      xAxis: [Object.assign({ type: 'category', data: labels, axisLabel: { color: theme.text, fontSize: 11, interval: 0 } }, axisCommon(theme))],
      yAxis: [Object.assign({ type: 'value' }, axisCommon(theme))],
      series: [
        { name: '占位', type: 'bar', stack: 'w', itemStyle: { color: 'transparent' }, data: base, silent: true, tooltip: { show: false } },
        { name: '增长', type: 'bar', stack: 'w', data: positive, label: labelCfg(theme.up),
          itemStyle: { color: theme.up, borderRadius: 2 } },
        { name: '下降', type: 'bar', stack: 'w', data: negative,
          label: { show: true, position: 'top', color: theme.down, fontSize: 11,
            formatter: function (p) { return p.value === '-' ? '' : ('-' + p.value); } },
          itemStyle: { color: theme.down, borderRadius: 2 } }
      ]
    };
    // 首尾总额高亮
    option.series[1].data = positive.map(function (v, i) {
      if (i === 0 || i === last) { return { value: v, itemStyle: { color: totalColor } }; }
      return v;
    });
    return option;
  }

  /* ---------- 桑基图（公司财务资金流向） ---------- */
  function sankey(el, data, theme) {
    var total = data.total || 0;
    var nodes = (data.nodes || []).map(function (n) {
      return {
        name: n.name, value: n.value, depth: n.depth, icon: n.icon, displayLabel: n.displayLabel,
        itemStyle: { color: n.color || theme.accent, borderColor: theme.bg, borderWidth: 1 },
        label: n.hideLabel ? { show: false } : undefined
      };
    });
    return {
      backgroundColor: theme.bg,
      tooltip: {
        trigger: 'item', triggerOn: 'mousemove|click',
        backgroundColor: theme.panel, borderColor: theme.accent + '55', borderWidth: 1,
        textStyle: { color: theme.text, fontSize: 12 },
        formatter: function (p) {
          if (p.dataType === 'edge') {
            var v = p.data.value;
            var pc = total ? '（' + (v / total * 100).toFixed(1) + '%）' : '';
            return p.data.source + ' → ' + p.data.target + '<br/>' + fmt(v) + ' 十亿美元' + pc;
          }
          var d = p.data;
          var pp = total && d.value ? (d.value / total * 100).toFixed(1) + '%' : '';
          return '<b>' + (d.icon ? ex(d.icon) + ' ' : '') + ex(d.name) + '</b><br/>' +
            (d.value ? fmt(d.value) + ' 十亿美元' + (pp ? '（' + pp + '）' : '') : '');
        }
      },
      series: [{
        type: 'sankey',
        left: 6, right: ((el && el.clientWidth) || 700) < 480 ? 78 : 150, top: 18, bottom: 18,
        nodeWidth: 18, nodeGap: 16,
        data: nodes,
        links: data.links,
        emphasis: { focus: 'adjacency' },
        lineStyle: { color: 'gradient', curveness: 0.55, opacity: 0.4 },
        itemStyle: { borderColor: theme.bg, borderWidth: 1 },
        label: {
          color: theme.text, fontSize: 12,
          formatter: function (p) {
            var d = p.data;
            if (d.displayLabel) return d.displayLabel;
            var icon = d.icon ? d.icon + '  ' : '';
            if (d.icon && total && d.value) return icon + d.name + '   ' + (d.value / total * 100).toFixed(1) + '%';
            return icon + d.name;
          }
        }
      }]
    };
  }

  /* ---------- 迷你图（KPI 卡） ---------- */
  function sparkline(el, values, theme, color) {
    var c = color || theme.accent;
    return {
      grid: { top: 4, left: 4, right: 4, bottom: 4 },
      xAxis: { type: 'category', show: false, boundaryGap: false, data: values.map(function (_, i) { return i; }) },
      yAxis: { type: 'value', show: false, min: 'dataMin', max: 'dataMax' },
      series: [{
        type: 'line', data: values, smooth: true, symbol: 'none',
        lineStyle: { color: c, width: 1.8 },
        areaStyle: { color: areaGradient(echarts, c) }
      }]
    };
  }

  /* ============================================================
   * 事件标注 & 水印（通用后处理）
   * ============================================================ */
  /* 事件标注配色：浅色底用深色字，深色底用白色字，黑金主题保留金色 */
  function eventStyle(theme) {
    var id = theme && theme.id;
    if (id === 'midnight-gold') {
      return { band: hexToRgba(theme.accent, 0.10), label: theme.accent };
    }
    var bg = (theme && theme.bg) || '#000000';
    var light = false;
    var m = String(bg).match(/^#?([0-9a-f]{6})$/i);
    if (m) {
      var v = m[1];
      var r = parseInt(v.slice(0, 2), 16), g = parseInt(v.slice(2, 4), 16), b = parseInt(v.slice(4, 6), 16);
      light = (0.299 * r + 0.587 * g + 0.114 * b) > 150;
    }
    return light
      ? { band: 'rgba(20,20,35,0.07)', label: '#1A1A2E' }
      : { band: 'rgba(255,255,255,0.09)', label: '#FFFFFF' };
  }

  /* 事件标注：区间色带 + 横向文字 */
  function applyEvents(option, events, theme) {
    if (!option.series || !option.series.length || !events || !events.length) return;
    var xa = option.xAxis && (Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis);
    var labels = (xa && xa.data) || [];
    if (!labels.length) return;
    function toMonth(s) {
      var m = String(s === undefined || s === null ? '' : s).match(/(\d{4})\D+(\d{1,2})/);
      if (!m) return null;
      return parseInt(m[1], 10) * 12 + (parseInt(m[2] || '1', 10) - 1);
    }
    function snapMonth(target) {
      if (target === null) return null;
      var best = null, bestDiff = Infinity;
      labels.forEach(function (l) {
        var lm = toMonth(l);
        if (lm === null) return;
        var diff = Math.abs(lm - target);
        if (diff < bestDiff) { bestDiff = diff; best = l; }
      });
      return bestDiff <= 12 ? best : null;      // 超出范围不标
    }
    var st = eventStyle(theme);
    // 先算出每个事件吸附后的起止标签
    var list = [];
    var used = {};
    events.forEach(function (e) {
      var rawS = (e.start !== undefined) ? e.start : ((e.x !== undefined) ? e.x : e.d);
      var rawE = (e.end !== undefined) ? e.end : rawS;
      var s = toMonth(rawS), en = toMonth(rawE);
      if (s === null) return;
      if (en === null || en < s) en = s;
      var ls = snapMonth(s), le = snapMonth(en);
      if (!ls) return;
      if (!le) le = ls;
      if (toMonth(le) < toMonth(ls)) le = ls;
      var key = ls + '|' + le + '|' + e.label;
      if (used[key]) return;
      used[key] = true;
      list.push({ ls: ls, le: le, label: e.label, desc: e.desc, si: labels.indexOf(ls) });
    });
    if (!list.length) return;
    list.sort(function (a, b) { return a.si - b.si; });
    var NUMS = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮'];
    option.series[0].markArea = {
      silent: true,
      itemStyle: { color: st.band },
      label: {
        show: true, position: 'insideTop', color: st.label,
        fontSize: 11, fontWeight: 700, distance: 4, rotate: 0
      },
      data: list.map(function (it, i) {
        return [
          { xAxis: it.ls, name: NUMS[i] || String(i + 1) },
          { xAxis: it.le }
        ];
      })
    };
    // 记录事件顺序，供图下说明使用
    option._eventOrder = list.map(function (it, i) {
      return { no: NUMS[i] || String(i + 1), label: it.label, desc: it.desc, start: it.ls, end: it.le };
    });
  }

  /* 按当前可见区间重新编号事件标注，返回事件清单（供图下说明/导出使用） */
  function setEvents(inst, events, theme) {
    if (!inst || !events || !events.length) return [];
    var opt = inst.getOption();
    var xa = opt.xAxis && (Array.isArray(opt.xAxis) ? opt.xAxis[0] : opt.xAxis);
    var labels = (xa && xa.data) || [];
    if (!labels.length) return [];
    // 计算可见索引区间
    var i0 = 0, i1 = labels.length - 1;
    var dz = opt.dataZoom && opt.dataZoom[0];
    if (dz) {
      if (typeof dz.startValue === 'number') i0 = dz.startValue;
      else if (typeof dz.start === 'number') i0 = Math.floor(dz.start / 100 * (labels.length - 1));
      if (typeof dz.endValue === 'number') i1 = dz.endValue;
      else if (typeof dz.end === 'number') i1 = Math.ceil(dz.end / 100 * (labels.length - 1));
    }
    i0 = Math.max(0, Math.min(i0, labels.length - 1));
    i1 = Math.max(i0, Math.min(i1, labels.length - 1));
    var visible = labels.slice(i0, i1 + 1);
    if (!visible.length) return [];
    function toMonth(s) {
      var m = String(s === undefined || s === null ? '' : s).match(/(\d{4})\D+(\d{1,2})/);
      if (!m) return null;
      return parseInt(m[1], 10) * 12 + (parseInt(m[2] || '1', 10) - 1);
    }
    function snapMonth(target) {
      if (target === null) return null;
      var best = null, bestDiff = Infinity;
      visible.forEach(function (l) {
        var lm = toMonth(l);
        if (lm === null) return;
        var diff = Math.abs(lm - target);
        if (diff < bestDiff) { bestDiff = diff; best = l; }
      });
      return bestDiff <= 12 ? best : null;
    }
    var st = eventStyle(theme);
    var list = [];
    var used = {};
    events.forEach(function (e) {
      var rawS = (e.start !== undefined) ? e.start : ((e.x !== undefined) ? e.x : e.d);
      var rawE = (e.end !== undefined) ? e.end : rawS;
      var s = toMonth(rawS), en = toMonth(rawE);
      if (s === null) return;
      if (en === null || en < s) en = s;
      var ls = snapMonth(s), le = snapMonth(en);
      if (!ls) return;
      if (!le) le = ls;
      var key = ls + '|' + le + '|' + e.label;
      if (used[key]) return;
      used[key] = true;
      list.push({ ls: ls, le: le, label: e.label, desc: e.desc, si: visible.indexOf(ls) });
    });
    list.sort(function (a, b) { return a.si - b.si; });
    var NUMS = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮'];
    var order = list.map(function (it, i) {
      return { no: NUMS[i] || String(i + 1), label: it.label, desc: it.desc, start: it.ls, end: it.le };
    });
    inst.setOption({
      series: [{
        markArea: {
          silent: true,
          itemStyle: { color: st.band },
          label: {
            show: true, position: 'insideTop', color: st.label,
            fontSize: 11, fontWeight: 700, distance: 4, rotate: 0
          },
          data: list.map(function (it, i) {
            return [{ xAxis: it.ls, name: NUMS[i] || String(i + 1), label: { offset: [0, (i % 2) * 11] } }, { xAxis: it.le }];
          })
        }
      }]
    }, false);
    inst._eventOrder = order;
    return order;
  }

  /* 图上说明标注（markPoint） */
  function applyAnnotations(option, annotations, theme) {
    if (!option.series || !option.series.length || !annotations || !annotations.length) return;
    var mp = {
      data: annotations.map(function (a) {
        return {
          xAxis: a.cat, yAxis: a.val, symbolSize: 6,
          itemStyle: { color: theme.accent },
          label: {
            show: true, position: 'top', formatter: a.text,
            color: theme.text, fontSize: 11, fontWeight: 600,
            backgroundColor: theme.panel, borderColor: theme.accent, borderWidth: 1,
            borderRadius: 4, padding: [4, 8]
          }
        };
      })
    };
    if (!option.series[0].markPoint) option.series[0].markPoint = mp;
    else option.series[0].markPoint.data = (option.series[0].markPoint.data || []).concat(mp.data);
  }

  function addWatermark(option, theme, chartType) {
    var wm = {
      type: 'text', left: 'center', top: 'middle', z: 0, silent: true,
      style: {
        text: 'ADV', fill: hexToRgba(theme.text, 0.045),
        font: '800 44px Inter, sans-serif', letterSpacing: 6, textAlign: 'center'
      }
    };
    if (chartType === 'donut' || chartType === 'treemap' || chartType === 'sankey') {
      wm.left = 'right'; wm.top = 'bottom';
      wm.style.textAlign = 'right';
      wm.style.font = '800 30px Inter, sans-serif';
    }
    if (option.graphic == null) option.graphic = [];
    if (!Array.isArray(option.graphic)) option.graphic = [option.graphic];
    option.graphic.push(wm);
  }

  /* ============================================================
   * 机器学习模版
   * ============================================================ */

  /* 线性回归趋势 + 置信带 */
  function mlTrend(el, data, theme) {
    var ys = data.values, n = ys.length;
    var xs = [];
    for (var i = 0; i < n; i++) xs.push(i);
    var lr = ML.linearRegression(xs, ys);
    var fitted = [], lower = [], upper = [];
    for (i = 0; i < n; i++) {
      var f = lr.intercept + lr.slope * xs[i];
      var se = lr.sxx > 0 ? lr.residStd * Math.sqrt(1 + 1 / n + (xs[i] - lr.xmean) * (xs[i] - lr.xmean) / lr.sxx) : lr.residStd;
      fitted.push(Math.round(f * 100) / 100);
      lower.push(Math.round((f - 1.96 * se) * 100) / 100);
      upper.push(Math.round((f + 1.96 * se) * 100) / 100);
    }
    var width = upper.map(function (u, k) { return Math.round((u - lower[k]) * 100) / 100; });
    var option = {
      backgroundColor: theme.bg,
      tooltip: tooltip(theme),
      legend: legend(theme),
      grid: gridZoom(),
      dataZoom: dataZoomCfg(theme),
      xAxis: [Object.assign({ type: 'category', boundaryGap: false, data: data.labels }, axisCommon(theme))],
      yAxis: [Object.assign({ type: 'value', scale: true }, axisCommon(theme))],
      series: [
        { name: '置信下界', type: 'line', data: lower, stack: 'ci', symbol: 'none', lineStyle: { opacity: 0 }, tooltip: { show: false } },
        { name: '95% 置信带', type: 'line', data: width, stack: 'ci', symbol: 'none', lineStyle: { opacity: 0 }, areaStyle: { color: hexToRgba(theme.up, 0.16) } },
        { name: '回归趋势', type: 'line', data: fitted, symbol: 'none', color: theme.up, lineStyle: { width: 2.6 } },
        { name: '观测值', type: 'scatter', data: ys, symbolSize: 7, itemStyle: { color: theme.accent, opacity: 0.9, borderColor: theme.bg, borderWidth: 1 } }
      ],
      graphic: [{ type: 'text', right: 20, top: 10, style: { text: 'R² = ' + lr.r2.toFixed(3), fill: theme.muted, fontSize: 12 } }]
    };
    return option;
  }

  /* 时间序列预测 · 扇面图 */
  function mlForecast(el, data, theme) {
    var ys = data.values, n = ys.length, horizon = data.horizon || 3;
    var xs = [];
    for (var i = 0; i < n; i++) xs.push(i);
    var fc = ML.forecast(xs, ys, horizon);
    var labels = data.labels.concat(data.forecastLabels || []);
    var full = labels.length;
    function padHist(arr) { var a = arr.slice(); while (a.length < full) a.push(null); return a; }
    function padFc(arr) { var a = []; for (var k = 0; k < n; k++) a.push(null); return a.concat(arr); }

    var histSeries = { name: '历史', type: 'line', data: padHist(ys), symbol: 'none', color: theme.accent, lineStyle: { width: 2.6 } };
    var fcLine = { name: '预测', type: 'line', data: padFc(fc.line.map(function (p) { return Math.round(p.y * 100) / 100; })), symbol: 'none', color: theme.up, lineStyle: { width: 2.6, type: 'dashed' } };

    var series = [];
    // 由外到内绘制三层扇面
    var alphas = [0.10, 0.18, 0.30];
    for (var l = 0; l < fc.bands[0].length; l++) { // 0=50%(内) 1=80% 2=90%(外)
      var level = fc.bands[0].length - 1 - l; // 从最外层(90%)开始
      var lowers = [], widths = [];
      for (var k = 0; k < n; k++) { lowers.push(null); widths.push(null); }
      for (var k = 0; k < horizon; k++) {
        var b = fc.bands[k][level];
        lowers.push(Math.round(b.lower * 100) / 100);
        widths.push(Math.round((b.upper - b.lower) * 100) / 100);
      }
      var a = alphas[level];
      series.push({ name: fc.bands[0][level].label + ' 区间下界', type: 'line', data: lowers, stack: 'fan' + level, symbol: 'none', lineStyle: { opacity: 0 }, tooltip: { show: false } });
      series.push({ name: fc.bands[0][level].label + ' 置信区间', type: 'line', data: widths, stack: 'fan' + level, symbol: 'none', lineStyle: { opacity: 0 }, areaStyle: { color: hexToRgba(theme.up, a) } });
    }
    series.push(fcLine);
    series.push(histSeries);

    var option = {
      backgroundColor: theme.bg,
      tooltip: tooltip(theme),
      legend: legend(theme),
      grid: gridZoom(),
      dataZoom: dataZoomCfg(theme),
      xAxis: [Object.assign({ type: 'category', boundaryGap: false, data: labels }, axisCommon(theme))],
      yAxis: [Object.assign({ type: 'value', scale: true }, axisCommon(theme))],
      series: series
    };
    return option;
  }

  /* K-Means 聚类 */
  function mlCluster(el, data, theme) {
    var k = data.k || 3;
    var res = ML.kmeans(data.data, k);
    var series = [];
    for (var c = 0; c < k; c++) {
      series.push({
        name: '簇 ' + (c + 1), type: 'scatter',
        data: data.data.filter(function (_, i) { return res.assignment[i] === c; })
          .map(function (d) { return { name: d.name, value: [d.x, d.y] }; }),
        symbolSize: 15,
        itemStyle: { color: hexToRgba(theme.series[c % theme.series.length], 0.6), borderColor: theme.series[c % theme.series.length], borderWidth: 1 },
        label: { show: true, position: 'top', color: theme.text, fontSize: 10.5, formatter: function (p) { return p.data.name; } }
      });
    }
    series.push({
      name: '聚类中心', type: 'scatter',
      data: res.centroids.map(function (ct) { return { value: [ct.x, ct.y] }; }),
      symbolSize: 26, symbol: 'diamond',
      itemStyle: { color: theme.text, borderColor: theme.accent, borderWidth: 2 },
      label: { show: false }
    });
    var option = {
      backgroundColor: theme.bg,
      tooltip: Object.assign({}, tooltip(theme), {
        trigger: 'item',
        formatter: function (p) {
          if (!p.data.name) return '聚类中心';
          return ex(p.data.name) + '<br/>' + ex(data.xName || 'X') + '：' + p.value[0] + '<br/>' + ex(data.yName || 'Y') + '：' + p.value[1];
        }
      }),
      grid: gridTop(),
      xAxis: [Object.assign({ type: 'value', name: data.xName || '', splitLine: { lineStyle: { color: theme.grid } } }, axisCommon(theme))],
      yAxis: [Object.assign({ type: 'value', name: data.yName || '' }, axisCommon(theme))],
      series: series
    };
    return option;
  }

  /* 相关性矩阵 */
  /* 相关性矩阵热力图（已计算好的矩阵） */
  function matrixHeat(el, data, theme) {
    var names = data.names, mat = data.matrix;
    var cells = [];
    for (var i = 0; i < names.length; i++)
      for (var j = 0; j < names.length; j++)
        cells.push([j, i, Math.round(mat[i][j] * 100) / 100]);
    return {
      backgroundColor: theme.bg,
      tooltip: Object.assign({}, tooltip(theme), { trigger: 'item', axisPointer: null, position: 'top', formatter: function (p) { return names[p.value[1]] + ' × ' + names[p.value[0]] + '：' + p.value[2].toFixed(2); } }),
      grid: { top: 16, left: 16, right: 78, bottom: 18, containLabel: true },
      xAxis: [Object.assign({ type: 'category', data: names, splitArea: { show: true }, axisLabel: { color: theme.muted, fontSize: 10, interval: 0, rotate: 35, margin: 8 } }, axisCommon(theme))],
      yAxis: [Object.assign({ type: 'category', data: names, splitArea: { show: true }, axisLabel: { color: theme.muted, fontSize: 10 } }, axisCommon(theme))],
      visualMap: {
        min: -1, max: 1, calculable: false, orient: 'vertical', right: 6, top: 'middle',
        itemWidth: 10, itemHeight: 90, textStyle: { color: theme.muted, fontSize: 10 },
        inRange: { color: [hexToRgba(theme.down, 0.95), theme.bg, hexToRgba(theme.accent, 0.95)] }
      },
      series: [{
        type: 'heatmap', data: cells,
        label: { show: true, color: theme.text, fontSize: 10, formatter: function (p) { return p.value[2].toFixed(2); } },
        itemStyle: { borderColor: theme.bg, borderWidth: 3 },
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,.5)' } }
      }]
    };
  }

  function mlCorr(el, data, theme) {
    var res = ML.correlationMatrix(data.series);
    return matrixHeat(el, { names: res.names, matrix: res.matrix }, theme);
  }

  /* 收益分布直方图 + KDE */
  function mlDist(el, data, theme) {
    var values = data.values;
    var hist = ML.histogram(values, 30);
    var pad = hist.step * 1.5;
    var kde = ML.kde(values, 120, hist.min - pad, hist.max + pad);
    var mu = ML.mean(values), sd = ML.std(values);
    var maxCount = Math.max.apply(null, hist.counts);
    var maxDensity = Math.max.apply(null, kde.y);
    var scale = maxDensity > 0 ? maxCount / maxDensity : 1;

    var option = {
      backgroundColor: theme.bg,
      tooltip: Object.assign({}, tooltip(theme), { trigger: 'axis' }),
      grid: gridTop(),
      xAxis: [Object.assign({ type: 'value', name: data.unit || '', scale: true }, axisCommon(theme))],
      yAxis: [
        Object.assign({ type: 'value', name: '频数' }, axisCommon(theme)),
        Object.assign({ type: 'value', name: '密度', splitLine: { show: false } }, axisCommon(theme))
      ],
      series: [
        { name: '频数', type: 'bar', data: hist.counts, yAxisIndex: 0, barMaxWidth: 20,
          itemStyle: { color: hexToRgba(theme.accent, 0.55), borderRadius: [3, 3, 0, 0] } },
        { name: '核密度', type: 'line', data: kde.y.map(function (y) { return Math.round(y * scale * 100) / 100; }), yAxisIndex: 1,
          smooth: true, symbol: 'none', color: theme.up, lineStyle: { width: 2.4 } }
      ],
      graphic: [{ type: 'text', right: 20, top: 10, style: { text: 'μ = ' + mu.toFixed(2) + '　σ = ' + sd.toFixed(2), fill: theme.muted, fontSize: 12 } }]
    };
    return option;
  }

  /* ---------- 基金/ETF 业绩评估（净值 + 回撤，可缩放） ---------- */
  function perf(el, data, theme) {
    var nav = data.nav;
    var labels = nav.map(function (p) { return p.date; });
    var values = nav.map(function (p) { return p.value; });
    var dd = [], peak = -Infinity;
    values.forEach(function (v) { peak = Math.max(peak, v); dd.push(Math.round((v / peak - 1) * 10000) / 100); });
    var series = [
      { name: (data.name || '净值'), type: 'line', xAxisIndex: 0, yAxisIndex: 0, data: values, symbol: 'none', color: theme.accent, lineStyle: { width: 2.4 }, areaStyle: { color: areaGradient(echarts, theme.accent) } }
    ];
    if (data.bench) {
      series.push({ name: '基准', type: 'line', xAxisIndex: 0, yAxisIndex: 0, data: data.bench.map(function (p) { return p.value; }), symbol: 'none', color: theme.muted, lineStyle: { width: 1.6, type: 'dashed' } });
    }
    series.push({ name: '回撤', type: 'line', xAxisIndex: 1, yAxisIndex: 1, data: dd, symbol: 'none', color: theme.down, lineStyle: { width: 1.2 }, areaStyle: { color: hexToRgba(theme.down, 0.18) } });
    var option = {
      backgroundColor: theme.bg,
      tooltip: tooltip(theme),
      legend: legend(theme),
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      grid: [
        { left: 12, right: 16, top: 46, height: '48%', containLabel: true },
        { left: 12, right: 16, bottom: 8, height: '24%', containLabel: true }
      ],
      xAxis: [
        Object.assign({ type: 'category', gridIndex: 0, data: labels, axisLabel: { show: false } }, axisCommon(theme)),
        Object.assign({ type: 'category', gridIndex: 1, data: labels }, axisCommon(theme))
      ],
      yAxis: [
        Object.assign({ type: 'value', gridIndex: 0, scale: true }, axisCommon(theme)),
        Object.assign({ type: 'value', gridIndex: 1, max: 0, axisLabel: { color: theme.muted, fontSize: 10, formatter: '{value}%' } }, axisCommon(theme))
      ],
      dataZoom: [
        { type: 'inside', xAxisIndex: [0, 1], zoomOnMouseWheel: true, moveOnMouseMove: true }
      ],
      series: series
    };
    return option;
  }

  /* ---------- 散点图矩阵（关联探索） ---------- */
  function scatterMatrix(el, data, theme) {
    var ss = data.series.slice(0, 4);
    var n = ss.length;
    var corr = ML.correlationMatrix(ss).matrix;
    var grids = [], xAxes = [], yAxes = [], scatterSeries = [], graphics = [];
    var pct = 100 / n;
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        var gi = r * n + c;
        grids.push({ left: (c * pct) + '%', top: (r * pct) + '%', width: pct + '%', height: pct + '%' });
        xAxes.push({ gridIndex: gi, type: 'value', show: false, scale: true });
        yAxes.push({ gridIndex: gi, type: 'value', show: false, scale: true });
        var pts = [];
        var len = Math.min(ss[r].values.length, ss[c].values.length);
        for (var k = 0; k < len; k++) pts.push([ss[c].values[k], ss[r].values[k]]);
        scatterSeries.push({
          type: 'scatter', xAxisIndex: gi, yAxisIndex: gi, data: pts, symbolSize: 2.5,
          itemStyle: { color: r === c ? hexToRgba(theme.muted, 0.5) : hexToRgba(theme.accent, 0.55) },
          emphasis: { focus: 'series' }
        });
        if (r < c) {
          graphics.push({ type: 'text', left: ((c + 0.5) * pct) + '%', top: ((r + 0.5) * pct - 3) + '%', silent: true, style: { text: 'r=' + corr[r][c].toFixed(2), fill: theme.text, fontSize: 11, font: '700 11px Inter, sans-serif', textAlign: 'center' } });
          graphics.push({ type: 'text', left: ((c + 0.5) * pct) + '%', top: ((r + 0.5) * pct + 3) + '%', silent: true, style: { text: (ss[r].name || '') + ' × ' + (ss[c].name || ''), fill: theme.muted, fontSize: 8.5, textAlign: 'center' } });
        }
      }
    }
    return {
      backgroundColor: theme.bg, tooltip: tooltip(theme), grid: grids, xAxis: xAxes, yAxis: yAxes,
      series: scatterSeries, graphic: graphics
    };
  }

  /* ---------- 世界地图着色 ---------- */
  function worldMap(el, data, theme) {
    var values = data.values || [];
    var max = -Infinity, min = Infinity;
    values.forEach(function (d) { max = Math.max(max, d.value); min = Math.min(min, d.value); });
    return {
      backgroundColor: theme.bg,
      tooltip: Object.assign({}, tooltip(theme), {
        trigger: 'item',
        formatter: function (p) { return ex(p.name) + '：' + (p.value !== undefined && !isNaN(p.value) ? p.value : '无数据'); }
      }),
      visualMap: {
        min: Math.min(min, -1), max: Math.max(max, 1), calculable: false, orient: 'vertical', right: 8, top: 'middle',
        itemWidth: 10, itemHeight: 100, textStyle: { color: theme.muted, fontSize: 10 },
        inRange: { color: [hexToRgba(theme.down, 0.75), hexToRgba(theme.accent, 0.35), hexToRgba(theme.accent, 0.95)] }
      },
      series: [{
        type: 'map', map: 'world', roam: true, zoom: 1.25,
        nameProperty: 'name',
        itemStyle: { areaColor: hexToRgba(theme.text, 0.06), borderColor: hexToRgba(theme.text, 0.25), borderWidth: 0.6 },
        emphasis: { itemStyle: { areaColor: hexToRgba(theme.accent, 0.4) }, label: { show: true, color: theme.text, fontSize: 11 } },
        label: { show: false },
        data: values
      }]
    };
  }

  /* ---------- 分发 ---------- */
  var BUILDERS = {
    'area': lineArea, 'line': lineOnly, 'bar': barChart, 'step': stepLine,
    'dual': dual, 'dualLine': dualLine, 'heatmap': heatmap, 'rank': rank, 'bubble': bubble,
    'treemap': treemap, 'stacked': stacked, 'stackedLine': stackedLine, 'season': season, 'waterfall': waterfall, 'donut': donut, 'sankey': sankey,
    'mlTrend': mlTrend, 'mlForecast': mlForecast, 'mlCluster': mlCluster,
    'mlCorr': mlCorr, 'matrixHeat': matrixHeat, 'mlDist': mlDist, 'stackedBar': stackedBar, 'radar': radar,
    'perf': perf, 'scatterMatrix': scatterMatrix, 'worldMap': worldMap
  };
  // 合并扩展图表构建器（图表分类新增类型）
  if (window.ADV_BUILDERS) { Object.keys(window.ADV_BUILDERS).forEach(function (k) { BUILDERS[k] = window.ADV_BUILDERS[k]; }); }

  /* 专业终端化排版：右侧价格轴 / 图例左上 / 底部时间滑块 / 千分位刻度 */
  function axisNum(v) {
    if (v === null || v === undefined || isNaN(v)) return '';
    var a = Math.abs(v);
    if (a >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (a >= 1) return String(Number(v.toFixed(2)));
    if (a === 0) return '0';
    return String(Number(v.toFixed(3)));
  }

  function contrastOn(bg) {
    if (!bg) return '#0E0F12';
    var hex = bg.charAt(0) === '#' ? bg.slice(1) : '';
    if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
    if (hex.length !== 6) return '#0E0F12';
    var r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.6 ? '#0E0F12' : '#FFFFFF';
  }

  /* 量纲差异过大时自动拆双轴（如债券收益率 vs 股票指数） */
  function maybeDualAxis(option, theme, type) {
    var okTypes = { line: 1, area: 1, step: 1, dualLine: 1, stackedLine: 1, season: 1 };
    if (!okTypes[type]) return;
    var ss = option.series || [];
    if (ss.length < 2) return;
    for (var i = 0; i < ss.length; i++) if (ss[i] && ss[i].stack) return;   // 堆叠不拆
    var scales = ss.map(function (ser) {
      var vs = (ser.data || []).map(function (v) { return (v && typeof v === 'object') ? v.value : v; })
        .filter(function (v) { return v !== null && v !== undefined && isFinite(v); })
        .map(function (v) { return Math.abs(v); });
      return vs.length ? Math.max.apply(null, vs) : 0;
    });
    var pos = scales.filter(function (x) { return x > 0; });
    if (pos.length < 2) return;
    var maxS = Math.max.apply(null, pos);
    var minS = Math.min.apply(null, pos);
    if (!(minS > 0 && maxS / minS > 20)) return;         // 差异 20 倍以上才拆
    var explicit = ss.some(function (ser) { return ser.yAxisIndex !== undefined || (ser.yAxis !== undefined); });
    var big = scales.indexOf(maxS);
    var yAxes = Array.isArray(option.yAxis) ? option.yAxis : [option.yAxis || {}];
    option.yAxis = yAxes;
    var first = yAxes[0];
    var others = ss.filter(function (_, i) { return i !== big; }).map(function (ser) { return ser.name; }).filter(Boolean);
    if (others.length) first.name = '';

    var right = Object.assign({}, first, {
      position: 'right', name: '',
      splitLine: { show: false },
      axisLabel: Object.assign({}, first.axisLabel),
      nameTextStyle: { color: theme.muted, fontSize: 10 }
    });
    yAxes[1] = right;
    if (explicit) {
      /* 数据已指定左右轴：只补齐右轴，不移动系列 */
      ss.forEach(function (ser) { if (ser.yAxisIndex === undefined) ser.yAxisIndex = (ser.yAxis === 1) ? 1 : 0; });
    } else {
      ss[big].yAxisIndex = 1;
      ss.forEach(function (ser, i) { if (i !== big) ser.yAxisIndex = 0; });
    }
    /* 双轴时右侧留白加大，避免末点数值与轴标签相撞 */
    if (option.grid && !Array.isArray(option.grid)) {
      option.grid.right = Math.max(option.grid.right || 0, 62);
    } else if (Array.isArray(option.grid) && option.grid[0]) {
      option.grid[0].right = Math.max(option.grid[0].right || 0, 62);
    }
  }

  function polishOption(option, theme, type) {
    if (theme && theme._noZoom) { delete option.dataZoom; }

    var cartesian = ['line', 'area', 'bar', 'stacked', 'stackedBar', 'stackedLine', 'step', 'dual', 'dualLine', 'bump', 'season'];
    if (cartesian.indexOf(type) < 0) return option;
    // 1) 价格轴放右侧（TradingView / Bloomberg 惯例）
    var yAxes = option.yAxis || [];
    if (!Array.isArray(yAxes)) { yAxes = [yAxes]; option.yAxis = yAxes; }
    yAxes.forEach(function (y, yi) {
      if (!y) return;
      delete y.position;
      // 单轴 → 右侧；双轴 → 左(主)+右(次)，避免重叠
      y.position = (yAxes.length > 1 && yi > 0) ? 'right' : 'left';   // 主轴一律左侧，次轴右侧
      if (yAxes.length > 1 && yi > 1) y.offset = (yi - 1) * 46;
      if (y.type === 'value' && !(y.axisLabel && y.axisLabel.formatter)) {
        y.axisLabel = Object.assign({}, y.axisLabel, { formatter: axisNum, margin: 8 });
      }
    });
    // 2) 图例移到左上
    if (option.legend) {
      var lg = Object.assign({}, option.legend);
      delete lg.right;
      option.legend = Object.assign(lg, { left: 12, top: 4, itemGap: 14 });
    }
    // 3) 底部时间滑块
    var dz = option.dataZoom || [];
    var hasSlider = dz.some(function (z) { return z.type === 'slider'; });
    if (!hasSlider) {
      dz.push({
        type: 'slider', height: 16, bottom: 6, left: 12, right: 12,
        borderColor: 'transparent', backgroundColor: hexToRgba(theme.text, 0.04),
        fillerColor: hexToRgba(theme.accent, 0.14),
        dataBackground: { lineStyle: { color: theme.muted, opacity: 0.35 }, areaStyle: { color: theme.muted, opacity: 0.12 } },
        selectedDataBackground: { lineStyle: { color: theme.accent, opacity: 0.6 }, areaStyle: { color: theme.accent, opacity: 0.18 } },
        handleStyle: { color: theme.accent, borderColor: theme.accent },
        moveHandleStyle: { color: theme.accent, opacity: 0.5 },
        textStyle: { color: theme.muted, fontSize: 10 },
        brushSelect: false, showDetail: false
      });
      option.dataZoom = dz;
      var grids = Array.isArray(option.grid) ? option.grid : (option.grid ? [option.grid] : []);
      if (!Array.isArray(option.grid) && option.grid) option.grid = grids;
      grids.forEach(function (g) { if (g) g.bottom = 26; });
    }
    // 4) 最新值参考线 + 轴标签（TradingView 风格）
    if (option.series && option.series.length === 1 && (type === 'line' || type === 'area' || type === 'step')) {
      var s0 = option.series[0];
      var arr = s0.data || [];
      var lastVal = null;
      for (var li = arr.length - 1; li >= 0; li--) {
        var vv = arr[li];
        if (vv !== null && vv !== undefined && !isNaN(vv)) { lastVal = vv; break; }
      }
      if (lastVal !== null && isFinite(lastVal)) {
        var col = s0.color || theme.accent;
        var refEntry = {
          yAxis: lastVal,
          lineStyle: { color: hexToRgba(col, 0.5), type: 'dashed', width: 1 },
          label: { show: false }
        };
        if (s0.markLine && Array.isArray(s0.markLine.data) && s0.markLine.data.length) {
          s0.markLine.data.push(refEntry);          // 已有事件标注 → 追加，不覆盖
        } else {
          s0.markLine = {
            silent: true, symbol: 'none',
            lineStyle: { color: hexToRgba(col, 0.5), type: 'dashed', width: 1 },
            label: { show: false },
            data: [refEntry]
          };
        }
      }
    }
    return option;
  }

  /* 英文模式下深度翻译图表 option（系列名/坐标轴/雷达指标/地图标签/标题文字等） */
  function localizeOption(option) {
    try {
      if (!window.DATA_I18N || !window.I18N || window.I18N.getLang() !== 'en') return;
      var T = window.DATA_I18N.t;
      var KEYS = { name: 1, text: 1, label: 1, displayLabel: 1, subtext: 1 };

      function deep(o, depth) {
        if (!o || depth > 6 || typeof o !== 'object') return;
        if (Array.isArray(o)) { for (var i = 0; i < o.length; i++) deep(o[i], depth + 1); return; }
        Object.keys(o).forEach(function (k) {
          if (typeof o[k] === 'function') return;
          var v = o[k];
          if (typeof v === 'string') {
            if (KEYS[k]) o[k] = T(v);
          } else if (v && typeof v === 'object') {
            deep(v, depth + 1);
          }
        });
      }
      deep(option, 0);

      // 类目轴的数据（时间/行业/月份等）
      ['xAxis', 'yAxis'].forEach(function (k) {
        var axes = option[k];
        if (!axes) return;
        (Array.isArray(axes) ? axes : [axes]).forEach(function (ax) {
          if (ax && Array.isArray(ax.data)) ax.data = ax.data.map(function (v) { return typeof v === 'string' ? T(v) : v; });
        });
      });
      // 桑基图节点连线
      (option.series || []).forEach(function (s) {
        if (s && s.type === 'sankey') {
          if (Array.isArray(s.data)) s.data = s.data.map(function (n) { return Object.assign({}, n, { name: T(n.name) }); });
          (s.links || []).forEach(function (l) { l.source = T(l.source); l.target = T(l.target); });
        }
        if (s && Array.isArray(s.data)) {
          s.data = s.data.map(function (d) {
            if (d && typeof d === 'object' && typeof d.name === 'string') return Object.assign({}, d, { name: T(d.name) });
            return d;
          });
        }
      });
      // 散点矩阵等 graphic 数组里的文字
      if (option.graphic) deep(option.graphic, 0);
    } catch (e) {}
  }

  function render(el, type, data, theme) {
    /* 高级案例：D3 定制渲染（不走 ECharts 管线） */
    if (window.ADV_SHOWCASE && ADV_SHOWCASE[type]) {
      var _dispose = ADV_SHOWCASE[type](el, data, theme) || function () {};
      return {
        resize: function () {
          try { _dispose(); } catch (e) {}
          try { _dispose = ADV_SHOWCASE[type](el, data, theme) || function () {}; } catch (e) {}
        },
        dispose: function () { try { _dispose(); } catch (e) {} el.innerHTML = ''; },
        getDom: function () { return el; },
        getOption: function () { return { series: [] }; },
        on: function () {}
      };
    }
    var builder = BUILDERS[type];
    if (!builder) throw new Error('未知图表类型: ' + type);
    var option = builder(el, data, theme);
    if (data && data.events && data.events.length) applyEvents(option, data.events, theme);
    if (data && data.annotations && data.annotations.length) applyAnnotations(option, data.annotations, theme);
    // 单条系列配色覆盖
    if (data && data.seriesColors) {
      option.series.forEach(function (s) {
        var c = data.seriesColors[s.name];
        if (!c) return;
        s.color = c;
        if (s.type === 'line' || s.type === 'radar') {
          s.lineStyle = Object.assign({}, s.lineStyle, { color: c });
          if (s.areaStyle && s.areaStyle.color) s.areaStyle.color = hexToRgba(c, 0.25);
        }
        if (s.type === 'bar' || s.type === 'scatter' || s.type === 'pie') {
          s.itemStyle = Object.assign({}, s.itemStyle, { color: c });
        }
      });
    }
    if (watermarkOn) addWatermark(option, theme, type);
    option = polishOption(option, theme, type);
    /* 悬停聚焦：突出当前系列，其余变暗（ECharts blur 状态） */
    (function () {
      var selfFocus = { pie: 1, donut: 1, sunburst: 1, treemap: 1, funnel: 1, map: 1, choropleth: 1, heatMapGeo: 1 };
      var skip = { tree: 1, orgChart: 1, swimlane: 1, flowchart: 1, parallel: 1, sankey: 1, graph: 1, lines: 1, themeRiver: 1 };
      if (skip[type]) return;
      var focusMode = selfFocus[type] ? 'self' : 'series';
      var blur = {
        itemStyle: { opacity: 0.10 },
        lineStyle: { opacity: 0.08, width: 1 },
        areaStyle: { opacity: 0.04 },
        label: { opacity: 0.08 },
        labelLine: { opacity: 0.06 },
        symbolSize: 2
      };
      (option.series || []).forEach(function (sr) {
        if (!sr) return;
        sr.emphasis = Object.assign({}, sr.emphasis, { focus: focusMode, blurScope: 'coordinateSystem' });
        sr.blur = Object.assign({}, sr.blur, blur);
      });
    })();
    maybeDualAxis(option, theme, type);
    if (theme && theme._noZoom) { delete option.dataZoom; }
    localizeOption(option);
    // 大数据量不播放入场动画（专业终端习惯，且避免导出时截到半张图）
    var maxPoints = 0;
    (option.series || []).forEach(function (s) { if (s && s.data && s.data.length) maxPoints = Math.max(maxPoints, s.data.length); });
    if (maxPoints > 200) {
      option.animation = false;
    } else {
      option.animationDuration = 700;
      option.animationEasing = 'cubicOut';
      option.animationDurationUpdate = 400;
    }
    var inst = echarts.getInstanceByDom(el) || echarts.init(el);
    inst.setOption(hardenTooltips(option), true);
    instances.push(inst);
    return inst;
  }

  function renderKpiSpark(el, values, theme, color) {
    var option = sparkline(el, values, theme, color);
    var inst = echarts.getInstanceByDom(el) || echarts.init(el);
    inst.setOption(option, true);
    instances.push(inst);
    return inst;
  }

  function disposeAll() {
    instances.forEach(function (i) { try { i.dispose(); } catch (e) {} });
    instances = [];
  }

  function resizeAll() {
    instances.forEach(function (i) { try { i.resize(); } catch (e) {} });
  }

  global.ChartFactory = { render: render, renderKpiSpark: renderKpiSpark, disposeAll: disposeAll, resizeAll: resizeAll, BUILDERS: BUILDERS, setWatermark: setWatermark, hexToRgba: hexToRgba, setEvents: setEvents, eventStyle: eventStyle, localizeOption: localizeOption, sanitizeHtml: sanitizeHtml };
  /* 其他文件（app.js 的悬浮提示、showcase.js 的 D3 提示框）复用同一套白名单 */
  global.ADV_SANITIZE = sanitizeHtml;
})(window);
