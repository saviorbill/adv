/* ADV 高级案例（D3.js）：区别于常规 ECharts 的定制可视化 */
(function (global) {
  'use strict';

  var FONT = '"Inter","Helvetica Neue","PingFang SC",sans-serif';
  var S = {};   // type -> render(container, data, theme)

  function size(el) {
    var w = el.clientWidth || 700, h = el.clientHeight || 380;
    return { w: w, h: h };
  }
  function rgba(hex, a) {
    if (!hex) return 'rgba(26,26,46,' + a + ')';
    var h = hex.charAt(0) === '#' ? hex.slice(1) : hex;
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    if (h.length !== 6) return 'rgba(26,26,46,' + a + ')';
    return 'rgba(' + parseInt(h.slice(0, 2), 16) + ',' + parseInt(h.slice(2, 4), 16) + ',' + parseInt(h.slice(4, 6), 16) + ',' + a + ')';
  }
  function ink(t) { return (t && t.text) || '#1A1A2E'; }
  function muted(t) { return (t && t.muted) || '#8A8A99'; }
  function accent(t) { return (t && t.accent) || '#A67C3D'; }
  function pal(t, i) {
    var a = (t && t.series && t.series.length) ? t.series : ['#1A1A2E', '#A67C3D', '#6F8FA8', '#7A5C3E', '#8A8A99', '#3E5A4E'];
    return a[i % a.length];
  }
  function clear(el) { el.innerHTML = ''; }

  /* 通用：建立 svg 容器 */
  function svgRoot(el, theme) {
    clear(el);
    var d = size(el);
    var d3 = global.d3;
    var svg = d3.select(el).append('svg')
      .attr('width', d.w).attr('height', d.h)
      .attr('viewBox', [0, 0, d.w, d.h])
      .style('display', 'block');
    return { svg: svg, w: d.w, h: d.h };
  }


  /* ---------- 悬停提示（D3 图专用） ---------- */
  function makeTip(el, theme) {
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    var tip = document.createElement('div');
    tip.className = 'd3-tip';
    tip.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;opacity:0;transition:opacity .12s ease;' +
      'background:#fff;border:1px solid rgba(26,26,46,.12);border-radius:8px;padding:7px 10px;' +
      'font:11.5px/1.5 ' + FONT + ';color:' + ink(theme) + ';box-shadow:0 8px 24px rgba(20,20,35,.12);z-index:30;white-space:nowrap;';
    el.appendChild(tip);
    return {
      show: function (html, x, y) {
        /* 图上节点/区域的名字来自用户数据（含分享链接），拼进提示框前统一过白名单 */
        tip.innerHTML = global.ADV_SANITIZE ? global.ADV_SANITIZE(html) : html;
        tip.style.opacity = 1;
        var w = tip.offsetWidth, h = tip.offsetHeight;
        var lx = x + 14, ly = y - h - 10;
        if (lx + w > el.clientWidth - 6) lx = x - w - 14;
        if (ly < 4) ly = y + 14;
        tip.style.left = Math.max(4, lx) + 'px';
        tip.style.top = Math.max(4, ly) + 'px';
      },
      hide: function () { tip.style.opacity = 0; }
    };
  }

  /* ============ 1. 力导向关系网络 ============ */
  S.scForce = function (el, data, theme) {
    if (!global.d3) return;
    var d3 = global.d3;
    var r = svgRoot(el, theme);
    var nodes = data.nodes.map(function (n) { return Object.assign({}, n); });
    var links = data.links.map(function (l) { return Object.assign({}, l); });

    var g = r.svg.append('g');
    var linkSel = g.append('g').attr('class', 'links')
      .selectAll('path').data(links).join('path')
      .attr('fill', 'none')
      .attr('stroke', rgba(ink(theme), 0.16))
      .attr('stroke-width', function (l) { return Math.max(0.8, Math.sqrt(l.value) * 0.9); });

    var nodeSel = g.append('g').selectAll('g').data(nodes).join('g');

    nodeSel.append('circle')
      .attr('r', function (n) { return 5 + Math.sqrt(n.value) * 1.9; })
      .attr('fill', function (n, i) { return rgba(pal(theme, n.group || i), 0.72); })
      .attr('stroke', '#fff').attr('stroke-width', 1.5)
      .style('cursor', 'pointer');

    nodeSel.append('text')
      .text(function (n) { return n.name; })
      .attr('text-anchor', 'middle')
      .attr('dy', function (n) { return 5 + Math.sqrt(n.value) * 1.9 + 12; })
      .attr('font-family', FONT)
      .attr('font-size', 9.5)
      .attr('fill', muted(theme));

    var sc = Math.max(1, Math.min(r.w, r.h) / 280);   // 大画布自动放大斥力与连线
    var tip = makeTip(el, theme);
    nodeSel
      .on('mouseenter', function (ev, n) {
        var related = links.filter(function (l) { return l.source.id === n.id || l.target.id === n.id; }).length;
        tip.show('<b>' + n.name + '</b><br/>权重 ' + n.value + ' · 关联 ' + related + ' 条', ev.offsetX || ev.layerX, ev.offsetY || ev.layerY);
        d3.select(this).select('circle').transition().duration(120).attr('r', 5 + Math.sqrt(n.value) * 1.9 + 4);
        nodeSel.transition().duration(120).style('opacity', function (o) {
          return (o.id === n.id || links.some(function (l) { return (l.source.id === n.id && l.target.id === o.id) || (l.target.id === n.id && l.source.id === o.id); })) ? 1 : 0.18;
        });
        linkSel.transition().duration(120).style('opacity', function (l) {
          return (l.source.id === n.id || l.target.id === n.id) ? 1 : 0.08;
        });
      })
      .on('mousemove', function (ev, n) {
        tip.show('<b>' + n.name + '</b><br/>权重 ' + n.value, ev.offsetX || ev.layerX, ev.offsetY || ev.layerY);
      })
      .on('mouseleave', function (ev, n) {
        tip.hide();
        d3.select(this).select('circle').transition().duration(120).attr('r', 5 + Math.sqrt(n.value) * 1.9);
        nodeSel.transition().duration(150).style('opacity', 1);
        linkSel.transition().duration(150).style('opacity', 1);
      });

    var sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(function (n) { return n.id; }).distance(function (l) { return (60 + Math.sqrt(l.value) * 8) * sc; }).strength(0.35))
      .force('charge', d3.forceManyBody().strength(function (n) { return (-60 - n.value * 3) * sc * sc; }))
      .force('center', d3.forceCenter(r.w / 2, r.h / 2))
      .force('collide', d3.forceCollide().radius(function (n) { return 8 + Math.sqrt(n.value) * 2.4; }))
      .force('x', d3.forceX(r.w / 2).strength(0.06))
      .force('y', d3.forceY(r.h / 2).strength(0.06))
      .on('tick', function () {
        nodes.forEach(function (n) {
          var rr = 8 + Math.sqrt(n.value) * 2.4;
          n.x = Math.max(rr + 4, Math.min(r.w - rr - 4, n.x));
          n.y = Math.max(rr + 4, Math.min(r.h - rr - 16, n.y));
        });
        linkSel.attr('d', function (l) {
          var dx = l.target.x - l.source.x, dy = l.target.y - l.source.y;
          var dr = Math.sqrt(dx * dx + dy * dy) * 1.6;
          return 'M' + l.source.x + ',' + l.source.y + 'A' + dr + ',' + dr + ' 0 0,1 ' + l.target.x + ',' + l.target.y;
        });
        nodeSel.attr('transform', function (n) { return 'translate(' + n.x + ',' + n.y + ')'; });
      });

    return function () { sim.stop(); };
  };

  /* ============ 2. 和弦图（渐变丝带） ============ */
  S.scChord = function (el, data, theme) {
    if (!global.d3) return;
    var d3 = global.d3;
    var r = svgRoot(el, theme);
    var names = data.names, m = data.matrix;
    var n = names.length;
    /* 构建矩阵（含对角为 0） */
    var matrix = m.map(function (row) { return row.slice(); });

    var _narrowC = r.w < 520;
    var outer = Math.min(r.w, r.h) / 2 - (_narrowC ? 10 : 26);
    var inner = outer - (_narrowC ? 9 : 14);
    var g = r.svg.append('g').attr('transform', 'translate(' + (r.w / 2) + ',' + (r.h / 2) + ')');

    var chord = d3.chord().padAngle(0.035).sortSubgroups(d3.descending)(matrix);
    var arc = d3.arc().innerRadius(inner).outerRadius(outer);
    var ribbon = d3.ribbon().radius(inner - 1);

    var defs = r.svg.append('defs');
    chord.groups.forEach(function (d, i) {
      var grd = defs.append('linearGradient')
        .attr('id', 'chordGrad' + i)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', -outer).attr('y1', -outer).attr('x2', outer).attr('y2', outer);
      var baseC = pal(theme, d.index);
      /* 同一色相做透明度渐变，多色系下丝带不混浊 */
      grd.append('stop').attr('offset', '0%').attr('stop-color', rgba(baseC, 0.78));
      grd.append('stop').attr('offset', '100%').attr('stop-color', rgba(baseC, 0.34));
    });

    var tipC = makeTip(el, theme);
    g.append('g').selectAll('path').data(chord).join('path')
      .attr('d', ribbon)
      .attr('fill', function (d) { return 'url(#chordGrad' + d.source.index + ')'; })
      .attr('stroke', rgba(ink(theme), 0.12))
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.9)
      .style('cursor', 'pointer')
      .on('mouseenter', function (ev, d) {
        g.selectAll('path').transition().duration(120).attr('opacity', 0.12);
        d3.select(this).transition().duration(120).attr('opacity', 1).attr('stroke', rgba(ink(theme), 0.45));
        tipC.show('<b>' + names[d.source.index] + ' → ' + names[d.target.index] + '</b><br/>规模 ' + d.source.value.toFixed(1), ev.offsetX || ev.layerX, ev.offsetY || ev.layerY);
      })
      .on('mousemove', function (ev, d) {
        tipC.show('<b>' + names[d.source.index] + ' → ' + names[d.target.index] + '</b><br/>规模 ' + d.source.value.toFixed(1), ev.offsetX || ev.layerX, ev.offsetY || ev.layerY);
      })
      .on('mouseleave', function () {
        g.selectAll('path').transition().duration(150).attr('opacity', 0.9);
        d3.select(this).transition().duration(150).attr('stroke', rgba(ink(theme), 0.12));
        tipC.hide();
      });

    var group = g.append('g').selectAll('g').data(chord.groups).join('g');
    group.append('path')
      .attr('d', arc)
      .attr('fill', function (d) { return pal(theme, d.index); })
      .attr('stroke', '#fff').attr('stroke-width', 1.5);
    group.append('text')
      .each(function (d) { d.angle = (d.startAngle + d.endAngle) / 2; })
      .attr('dy', '.35em')
      .attr('transform', function (d) {
        return 'rotate(' + (d.angle * 180 / Math.PI - 90) + ') translate(' + (outer + 4) + ') ' + (d.angle > Math.PI ? 'rotate(180)' : '');
      })
      .attr('text-anchor', function (d) { return d.angle > Math.PI ? 'end' : 'start'; })
      .attr('font-family', FONT).attr('font-size', 10)
      .attr('fill', ink(theme))
      .text(function (d) { return names[d.index]; });

    return function () {};
  };

  /* ============ 3. 径向树 ============ */
  S.scRadialTree = function (el, data, theme) {
    if (!global.d3) return;
    var d3 = global.d3;
    var r = svgRoot(el, theme);
    var radius = Math.min(r.w * (r.w < 520 ? 0.46 : 0.47), r.h * (r.w < 520 ? 0.58 : 0.50));
    var g = r.svg.append('g').attr('transform', 'translate(' + (r.w / 2) + ',' + (r.h / 2) + ')');

    var root = d3.hierarchy(data.tree);
    d3.tree().size([2 * Math.PI, radius]).separation(function (a, b) { return (a.parent === b.parent ? 1 : 2) / a.depth; })(root);

    g.append('g').selectAll('path').data(root.links()).join('path')
      .attr('d', d3.linkRadial().angle(function (d) { return d.x; }).radius(function (d) { return d.y; }))
      .attr('fill', 'none')
      .attr('stroke', rgba(ink(theme), 0.16))
      .attr('stroke-width', 1.2);

    var node = g.append('g').selectAll('g').data(root.descendants()).join('g')
      .attr('transform', function (d) { return 'rotate(' + (d.x * 180 / Math.PI - 90) + ') translate(' + d.y + ',0)'; });

    var tipT = makeTip(el, theme);
    node.style('cursor', 'pointer')
      .on('mouseenter', function (ev, d) {
        d3.select(this).select('circle').transition().duration(100)
          .attr('r', (d.depth === 0 ? 8 : (d.children ? 5.5 : 3.5)) + 3);
        var path = d.ancestors().reverse().map(function (a) { return a.data.name; }).join(' › ');
        var kids = d.children ? d.children.length : 0;
        node.style('opacity', function (o) { return (o === d || o.parent === d || d.parent === o || d.ancestors().indexOf(o) >= 0) ? 1 : 0.2; });
        tipT.show('<b>' + d.data.name + '</b><br/>' + path + (kids ? '<br/>下级 ' + kids + ' 项' : ''), ev.offsetX || ev.layerX, ev.offsetY || ev.layerY);
      })
      .on('mousemove', function (ev, d) {
        var path = d.ancestors().reverse().map(function (a) { return a.data.name; }).join(' › ');
        tipT.show('<b>' + d.data.name + '</b><br/>' + path, ev.offsetX || ev.layerX, ev.offsetY || ev.layerY);
      })
      .on('mouseleave', function (ev, d) {
        d3.select(this).select('circle').transition().duration(100)
          .attr('r', d.depth === 0 ? 8 : (d.children ? 5.5 : 3.5));
        node.style('opacity', 1);
        tipT.hide();
      });

    node.append('circle')
      .attr('r', function (d) { return d.depth === 0 ? 8 : (d.children ? 5.5 : 3.5); })
      .attr('fill', function (d) { return d.depth === 0 ? ink(theme) : rgba(pal(theme, d.depth - 1), 0.85); })
      .attr('stroke', '#fff').attr('stroke-width', 1.2);

    var small = Math.min(r.w, r.h) <= 320;
    node.append('text')
      .attr('display', function (d) { return (d.depth <= (small ? 1 : 3)) ? null : 'none'; })
      .attr('dy', '0.31em')
      .attr('x', function (d) { return d.x < Math.PI === !d.children ? 7 : -7; })
      .attr('text-anchor', function (d) { return d.x < Math.PI === !d.children ? 'start' : 'end'; })
      .attr('transform', function (d) { return d.x >= Math.PI ? 'rotate(180)' : null; })
      .attr('font-family', FONT)
      .attr('font-size', function (d) { return small ? (d.depth === 0 ? 10 : 8.5) : (d.depth === 0 ? 12 : 9.5); })
      .attr('font-weight', function (d) { return d.depth === 0 ? 700 : 400; })
      .attr('fill', function (d) { return d.depth === 0 ? ink(theme) : muted(theme); })
      .text(function (d) { return d.data.name; })
      .attr('paint-order', 'stroke')
      .attr('stroke', '#fff').attr('stroke-width', 2.5);

    return function () {};
  };

  /* ============ 4. 六边形密度图 ============ */
  S.scHexbin = function (el, data, theme) {
    if (!global.d3) return;
    var d3 = global.d3;
    var r = svgRoot(el, theme);
    var pts = data.points;
    var x = d3.scaleLinear().domain(d3.extent(pts, function (p) { return p[0]; })).nice().range([36, r.w - 18]);
    var y = d3.scaleLinear().domain(d3.extent(pts, function (p) { return p[1]; })).nice().range([r.h - 26, 14]);
    var R = 11;
    var dx = R * 2 * Math.sin(Math.PI / 3), dy = R * 1.5;
    var bins = {};
    pts.forEach(function (p) {
      var px = x(p[0]), py = y(p[1]);
      var ri = Math.round(py / dy), ci = Math.round((px - (ri % 2) * dx / 2) / dx);
      var key = ri + ':' + ci;
      if (!bins[key]) bins[key] = { cx: (ri % 2) * dx / 2 + ci * dx, cy: ri * dy, n: 0 };
      bins[key].n++;
    });
    var arr = Object.keys(bins).map(function (k) { return bins[k]; });
    var maxN = d3.max(arr, function (b) { return b.n; }) || 1;
    var color = d3.scaleSequential(d3.interpolateRgbBasis([rgba(accent(theme), 0.12), rgba(accent(theme), 0.55), accent(theme)])).domain([1, maxN]);

    var hexPath = d3.line().curve(d3.curveLinearClosed);
    var hexPts = d3.range(6).map(function (i) {
      var a = Math.PI / 3 * i + Math.PI / 6;
      return [R * Math.cos(a), R * Math.sin(a)];
    });

    var tipH = makeTip(el, theme);
    r.svg.append('g').selectAll('path').data(arr).join('path')
      .attr('d', hexPath(hexPts))
      .attr('transform', function (b) { return 'translate(' + b.cx + ',' + b.cy + ')'; })
      .attr('fill', function (b) { return color(b.n); })
      .attr('stroke', '#fff').attr('stroke-width', 1.2)
      .style('cursor', 'pointer')
      .on('mouseenter', function (ev, b) {
        d3.select(this).attr('stroke', ink(theme)).attr('stroke-width', 1.8);
        tipH.show('<b>' + b.n + ' 个样本</b><br/>' + Math.round(x.invert(b.cx)) + ' · ' + Math.round(y.invert(b.cy)), ev.offsetX || ev.layerX, ev.offsetY || ev.layerY);
      })
      .on('mousemove', function (ev, b) {
        tipH.show('<b>' + b.n + ' 个样本</b>', ev.offsetX || ev.layerX, ev.offsetY || ev.layerY);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('stroke', '#fff').attr('stroke-width', 1.2);
        tipH.hide();
      });

    /* 轴 */
    var gx = r.svg.append('g').attr('transform', 'translate(0,' + (r.h - 26) + ')');
    gx.call(d3.axisBottom(x).ticks(6).tickSize(-(r.h - 40)).tickFormat(''));
    gx.selectAll('.domain').attr('stroke', rgba(ink(theme), 0.15));
    gx.selectAll('.tick line').attr('stroke', rgba(ink(theme), 0.06));
    r.svg.append('g').attr('transform', 'translate(36,0)').call(d3.axisLeft(y).ticks(5).tickSize(0))
      .call(function (g) { g.select('.domain').remove(); })
      .selectAll('text').attr('fill', muted(theme)).attr('font-size', 9).attr('font-family', FONT);
    gx.selectAll('text').attr('fill', muted(theme)).attr('font-size', 9).attr('font-family', FONT);

    return function () {};
  };

  /* ============ 5. 发光折线（终端风） ============ */
  S.scGlowLine = function (el, data, theme) {
    if (!global.d3) return;
    var d3 = global.d3;
    var r = svgRoot(el, theme);
    var s = data.series[0];
    var vals = s.values.map(function (v, i) { return { i: i, v: v }; });
    var x = d3.scaleLinear().domain([0, vals.length - 1]).range([26, r.w - 16]);
    var y = d3.scaleLinear().domain(d3.extent(vals, function (d) { return d.v; })).nice().range([r.h - 30, 18]);

    var defs = r.svg.append('defs');
    var grd = defs.append('linearGradient').attr('id', 'glowGrad')
      .attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
    grd.append('stop').attr('offset', '0%').attr('stop-color', rgba(accent(theme), 0.35));
    grd.append('stop').attr('offset', '100%').attr('stop-color', rgba(accent(theme), 0));

    var area = d3.area().x(function (d) { return x(d.i); }).y0(r.h - 30).y1(function (d) { return y(d.v); }).curve(d3.curveMonotoneX);
    var line = d3.line().x(function (d) { return x(d.i); }).y(function (d) { return y(d.v); }).curve(d3.curveMonotoneX);

    r.svg.append('path').datum(vals).attr('d', area).attr('fill', 'url(#glowGrad)');
    /* 发光层 */
    r.svg.append('path').datum(vals).attr('d', line)
      .attr('fill', 'none').attr('stroke', accent(theme)).attr('stroke-width', 7)
      .attr('opacity', 0.14).attr('filter', 'blur(1px)');
    var path = r.svg.append('path').datum(vals).attr('d', line)
      .attr('fill', 'none').attr('stroke', accent(theme)).attr('stroke-width', 1.8);

    /* 末端点 + 数值 */
    var last = vals[vals.length - 1];
    r.svg.append('circle').attr('cx', x(last.i)).attr('cy', y(last.v)).attr('r', 3.5).attr('fill', accent(theme));
    r.svg.append('text').attr('x', x(last.i) - 4).attr('y', y(last.v) - 9)
      .attr('text-anchor', 'end').attr('font-family', FONT).attr('font-size', 11).attr('font-weight', 700)
      .attr('fill', ink(theme)).text(Number(last.v.toFixed(2)));

    /* 悬停：十字线 + 最近点数值 */
    var tipL = makeTip(el, theme);
    var vline = r.svg.append('line').attr('y1', 14).attr('y2', r.h - 30)
      .attr('stroke', rgba(ink(theme), 0.25)).attr('stroke-dasharray', '3 3').attr('opacity', 0);
    var vdot = r.svg.append('circle').attr('r', 4).attr('fill', accent(theme)).attr('opacity', 0);
    var overlay = r.svg.append('rect')
      .attr('x', 26).attr('y', 14).attr('width', Math.max(1, r.w - 42)).attr('height', r.h - 44)
      .attr('fill', 'transparent').style('cursor', 'crosshair');
    overlay.on('mousemove', function (ev) {
      var mx = d3.pointer(ev, r.svg.node())[0];
      var i = Math.max(0, Math.min(vals.length - 1, Math.round(x.invert(mx))));
      var d = vals[i];
      vline.attr('x1', x(i)).attr('x2', x(i)).attr('opacity', 1);
      vdot.attr('cx', x(i)).attr('cy', y(d.v)).attr('opacity', 1);
      tipL.show('<b>' + (data.labels[i] || '') + '</b><br/>' + Number(d.v.toFixed(2)), ev.offsetX || ev.layerX, ev.offsetY || ev.layerY);
    }).on('mouseleave', function () {
      vline.attr('opacity', 0); vdot.attr('opacity', 0); tipL.hide();
    });

    var gx = r.svg.append('g').attr('transform', 'translate(0,' + (r.h - 30) + ')')
      .call(d3.axisBottom(x).ticks(6).tickFormat(function (i) { return data.labels[Math.round(i)] || ''; }).tickSize(0));
    gx.select('.domain').attr('stroke', rgba(ink(theme), 0.15));
    gx.selectAll('text').attr('fill', muted(theme)).attr('font-size', 9).attr('font-family', FONT);

    return function () {};
  };

  /* ============ 6. 阶梯瀑布（D3 动画） ============ */
  S.scWaterfall = function (el, data, theme) {
    if (!global.d3) return;
    var d3 = global.d3;
    var r = svgRoot(el, theme);
    var vals = data.values, labels = data.labels;
    var cum = [], run = 0;
    vals.forEach(function (v, i) {
      var isT = (i === 0 || i === vals.length - 1);
      if (isT) { cum.push({ y0: 0, y1: v, total: true }); run = v; }
      else if (v >= 0) { cum.push({ y0: run, y1: run + v }); run += v; }
      else { cum.push({ y0: run + v, y1: run }); run += v; }
    });
    var maxV = d3.max(cum, function (d) { return Math.max(d.y0, d.y1); });
    var x = d3.scaleBand().domain(labels).range([20, r.w - 20]).padding(0.34);
    var y = d3.scaleLinear().domain([0, maxV * 1.1]).range([r.h - 34, 16]);

    var g = r.svg.append('g');
    var tipW = makeTip(el, theme);
    g.selectAll('rect').data(cum).join('rect')
      .style('cursor', 'pointer')
      .on('mouseenter', function (ev, d) {
        var i = cum.indexOf(d);
        d3.select(this).attr('opacity', 1);
        tipW.show('<b>' + labels[i] + '</b><br/>' + (vals[i] >= 0 ? '+' : '') + vals[i], ev.offsetX || ev.layerX, ev.offsetY || ev.layerY);
      })
      .on('mousemove', function (ev, d) {
        var i = cum.indexOf(d);
        tipW.show('<b>' + labels[i] + '</b><br/>' + (vals[i] >= 0 ? '+' : '') + vals[i], ev.offsetX || ev.layerX, ev.offsetY || ev.layerY);
      })
      .on('mouseleave', function () { d3.select(this).attr('opacity', 0.9); tipW.hide(); })
      .attr('x', function (d, i) { return x(labels[i]); })
      .attr('width', x.bandwidth())
      .attr('y', function (d) { return y(Math.max(d.y0, d.y1)); })
      .attr('height', 0)
      .attr('fill', function (d, i) {
        if (d.total) return ink(theme);
        return vals[i] >= 0 ? '#3E7A5A' : '#B5484B';
      })
      .attr('opacity', 0.9)
      .transition().duration(600).delay(function (d, i) { return i * 70; })
      .attr('height', function (d) { return Math.abs(y(d.y0) - y(d.y1)); });

    g.selectAll('text').data(cum).join('text')
      .attr('x', function (d, i) { return x(labels[i]) + x.bandwidth() / 2; })
      .attr('y', function (d) { return y(Math.max(d.y0, d.y1)) - 6; })
      .attr('text-anchor', 'middle').attr('font-family', FONT).attr('font-size', 9.5).attr('font-weight', 600)
      .attr('fill', function (d, i) { return d.total ? ink(theme) : (vals[i] >= 0 ? '#3E7A5A' : '#B5484B'); })
      .text(function (d, i) { return (vals[i] >= 0 ? '+' : '−') + Math.abs(vals[i]); });

    var gx = r.svg.append('g').attr('transform', 'translate(0,' + (r.h - 34) + ')')
      .call(d3.axisBottom(x).tickSize(0));
    gx.select('.domain').attr('stroke', rgba(ink(theme), 0.15));
    gx.selectAll('text').attr('fill', muted(theme)).attr('font-size', 9.5).attr('font-family', FONT);

    return function () {};
  };


  /* ============================================================
     系统架构图（参考 GitHub / 现代 SaaS 架构图风格）
       · 分组容器：极浅底 + 细边 + 全大写等宽分区标签
       · 节点：白底、细边圆角、粗标题 + 等宽小字副标题
       · 强调节点：柔和色底 + 同色系描边
       · 连线：直角圆角、带箭头；同步实线、异步虚线；线上带等宽小标签
       · 配色：只影响「边框与连线」，底色与文字保持中性
     ============================================================ */
  var ARCH = {
    pageBg: '#F4F4F5',
    groupFill: '#F7F7F8',
    groupStroke: '#E6E6E6',
    groupLabel: '#A9A9AB',
    nodeFill: '#FFFFFF',
    nodeStroke: '#D6D6D8',
    title: '#2B2B2E',
    sub: '#8E8E93',
    lineMuted: '#A6A6AA'
  };

  function archTextW(str, size, mono) {
    var w = 0;
    String(str || '').split('').forEach(function (ch) {
      var cjk = /[\u4e00-\u9fa5\uff00-\uffef]/.test(ch);
      w += cjk ? size : size * (mono ? 0.62 : 0.56);
    });
    return w;
  }

  function roundedPoly(pts, r) {
    if (!pts.length) return '';
    var d = 'M' + pts[0][0] + ',' + pts[0][1];
    for (var i = 1; i < pts.length - 1; i++) {
      var p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
      var v1 = [p1[0] - p0[0], p1[1] - p0[1]];
      var v2 = [p2[0] - p1[0], p2[1] - p1[1]];
      var l1 = Math.hypot(v1[0], v1[1]) || 1, l2 = Math.hypot(v2[0], v2[1]) || 1;
      var rr = Math.min(r, l1 / 2, l2 / 2);
      var a = [p1[0] - v1[0] / l1 * rr, p1[1] - v1[1] / l1 * rr];
      var b = [p1[0] + v2[0] / l2 * rr, p1[1] + v2[1] / l2 * rr];
      d += 'L' + a[0] + ',' + a[1] + 'Q' + p1[0] + ',' + p1[1] + ' ' + b[0] + ',' + b[1];
    }
    var last = pts[pts.length - 1];
    return d + 'L' + last[0] + ',' + last[1];
  }

  S.archDiagram = function (el, data, theme) {
    clear(el);
    var d3 = global.d3;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    var tip = document.createElement('div');
    tip.className = 'arch-tip';
    tip.style.cssText = 'position:absolute;pointer-events:none;opacity:0;transition:opacity .12s;' +
      'background:#fff;border:1px solid rgba(20,20,25,.12);border-radius:7px;padding:7px 10px;' +
      'font:11.5px/1.6 "Inter","PingFang SC",sans-serif;color:#2B2B2E;' +
      'box-shadow:0 8px 22px rgba(20,20,35,.13);z-index:20;white-space:nowrap;';
    el.appendChild(tip);
    var groups = data.groups || [], nodes = data.nodes || [], edges = data.edges || [];
    var byId = {};
    nodes.forEach(function (n) { byId[n.id] = n; });

    /* 用色板第 2 色做边框/连线：每套配色的差异一眼可见，又不喧宾夺主 */
    var palMain = (theme && theme.series && (theme.series[1] || theme.series[0])) || '#3C4A5A';
    var acc = (theme && theme.accent) || '#C08A5A';

    /* 逻辑尺寸自适应 */
    var W = 1220, H = 570, pad = 10;
    var d = size(el);
    var scale = Math.min((d.w - pad * 2) / W, (d.h - pad * 2) / H);
    var svg = d3.select(el).append('svg')
      .attr('width', d.w).attr('height', d.h).style('display', 'block');
    var g = svg.append('g')
      .attr('transform', 'translate(' + ((d.w - W * scale) / 2) + ',' + ((d.h - H * scale) / 2) + ') scale(' + scale + ')');

    /* 画布底色 */
    g.append('rect').attr('x', 0).attr('y', 0).attr('width', W).attr('height', H)
      .attr('rx', 14).attr('fill', ARCH.pageBg);

    /* 分组容器 */
    groups.forEach(function (grp) {
      g.append('rect').attr('x', grp.x).attr('y', grp.y).attr('width', grp.w).attr('height', grp.h)
        .attr('rx', 12).attr('fill', ARCH.groupFill).attr('stroke', ARCH.groupStroke).attr('stroke-width', 1);
      g.append('text').attr('x', grp.x + 18).attr('y', grp.y + 26)
        .attr('font-family', FONT).attr('font-size', 11).attr('font-weight', 600)
        .attr('letter-spacing', '0.22em').attr('fill', ARCH.groupLabel)
        .text(grp.label);
    });

    /* 箭头 defs（按颜色各建一个） */
    var defs = svg.append('defs');
    function arrowId(color) { return 'arch-arrow-' + color.replace(/[^a-z0-9]/gi, ''); }
    [palMain, ARCH.lineMuted].forEach(function (c) {
      defs.append('marker').attr('id', arrowId(c)).attr('viewBox', '0 0 10 10')
        .attr('refX', 8.5).attr('refY', 5).attr('markerWidth', 7).attr('markerHeight', 7)
        .attr('orient', 'auto-start-reverse')
        .append('path').attr('d', 'M0,1 L9,5 L0,9 Z').attr('fill', c);
    });

    /* 连线 */
    edges.forEach(function (e) {
      var a = byId[e.from], b = byId[e.to];
      var pts = [].concat(e.pts || []);
      if (!pts.length && a && b) {
        pts = [[a.x, a.y], [b.x, b.y]];
      }
      var markColor = e.muted ? ARCH.lineMuted : palMain;
      var color = e.muted ? ARCH.lineMuted : rgba(palMain, 0.88);
      /* 箭头端点回缩 4px，避免被后画的节点矩形盖住 */
      if (pts.length >= 2) {
        var p1 = pts[pts.length - 2], p2 = pts[pts.length - 1];
        var dx = p2[0] - p1[0], dy = p2[1] - p1[1];
        var len = Math.hypot(dx, dy) || 1;
        pts[pts.length - 1] = [p2[0] - dx / len * 4, p2[1] - dy / len * 4];
      }
      var dPath = roundedPoly(pts, 10);
      var path = g.append('path')
        .attr('class', 'arch-edge')
        .attr('d', dPath)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', e.weight || 1.7)
        .attr('marker-end', 'url(#' + arrowId(markColor) + ')')
        .attr('opacity', e.dashed ? 0.75 : 1);
      if (e.dashed) path.attr('stroke-dasharray', '5 5');

      /* 透明加粗命中区，方便鼠标悬浮 */
      var hit = g.append('path')
        .attr('d', dPath).attr('fill', 'none')
        .attr('stroke', 'transparent').attr('stroke-width', 18)
        .attr('pointer-events', 'stroke').style('cursor', 'pointer');
      var fromLabel = (byId[e.from] && byId[e.from].label) || e.from;
      var toLabel = (byId[e.to] && byId[e.to].label) || e.to;
      hit.on('mouseenter', function (ev) {
        g.selectAll('.arch-edge').attr('opacity', 0.16);
        path.attr('opacity', 1).attr('stroke-width', (e.weight || 1.7) + 1.1);
        var txt = '<b>' + fromLabel + ' → ' + toLabel + '</b>';
        if (e.label) txt += '<br/><span style="color:#8E8E93;letter-spacing:.1em">' + e.label + '</span>';
        if (e.dashed) txt += '<br/><span style="color:#A6A6AA;font-size:10.5px">异步 / 非阻塞</span>';
        tip.innerHTML = global.ADV_SANITIZE ? global.ADV_SANITIZE(txt) : txt;
        tip.style.opacity = 1;
      });
      hit.on('mousemove', function (ev) {
        var rect = el.getBoundingClientRect();
        var mx = ev.clientX - rect.left, my = ev.clientY - rect.top;
        var w = tip.offsetWidth, h = tip.offsetHeight;
        var lx = mx + 14, ly = my - h - 12;
        if (lx + w > rect.width - 6) lx = mx - w - 14;
        if (ly < 4) ly = my + 16;
        tip.style.left = Math.max(4, lx) + 'px';
        tip.style.top = Math.min(rect.height - h - 4, Math.max(4, ly)) + 'px';
      });
      hit.on('mouseleave', function () {
        g.selectAll('.arch-edge').attr('opacity', function () {
          return this.getAttribute('stroke-dasharray') ? 0.75 : 1;
        });
        path.attr('stroke-width', e.weight || 1.7);
        tip.style.opacity = 0;
      });
      if (e.label) {
        var at = e.labelAt || pts[Math.floor(pts.length / 2)];
        var tw = archTextW(e.label, 10, true) + 12;
        var chipFill = ARCH.pageBg;
        for (var gi2 = 0; gi2 < groups.length; gi2++) {
          var gq = groups[gi2];
          if (at[0] >= gq.x && at[0] <= gq.x + gq.w && at[1] >= gq.y && at[1] <= gq.y + gq.h) { chipFill = ARCH.groupFill; break; }
        }
        g.append('text').attr('x', at[0]).attr('y', at[1] + 4)
          .attr('text-anchor', 'middle').attr('font-family', FONT)
          .attr('font-size', 10).attr('letter-spacing', '0.12em').attr('font-weight', 600)
          .attr('paint-order', 'stroke')
          .attr('stroke', chipFill).attr('stroke-width', 4).attr('stroke-linejoin', 'round')
          .attr('fill', e.muted ? ARCH.lineMuted : palMain)
          .text(e.label);
      }
    });

    /* 节点 */
    nodes.forEach(function (n) {
      var w = n.w || 250, h = n.h || 88;
      var ng = g.append('g').attr('transform', 'translate(' + (n.x - w / 2) + ',' + (n.y - h / 2) + ')');
      var isAcc = !!n.accent;
      ng.append('rect').attr('width', w).attr('height', h).attr('rx', 9)
        .attr('fill', isAcc ? '#FBF4EA' : ARCH.nodeFill)
        .attr('stroke', isAcc ? acc : rgba(palMain, 0.52))
        .attr('stroke-width', isAcc ? 1.6 : 1.3);
      ng.append('text').attr('x', w / 2).attr('y', n.sub ? h / 2 - 8 : h / 2 + 5)
        .attr('text-anchor', 'middle').attr('font-family', FONT)
        .attr('font-size', 15).attr('font-weight', 700)
        .attr('fill', ARCH.title)
        .text(n.label);
      if (n.sub) {
        ng.append('text').attr('x', w / 2).attr('y', h / 2 + 15)
          .attr('text-anchor', 'middle').attr('font-family', FONT)
          .attr('font-size', 10.5).attr('letter-spacing', '0.14em').attr('font-weight', 500)
          .attr('fill', ARCH.sub).text(n.sub);
      }
      ng.on('mouseenter', function () {
        ng.select('rect').attr('stroke-width', isAcc ? 2.2 : 2);
        ng.select('rect').attr('stroke', isAcc ? acc : palMain);
      }).on('mouseleave', function () {
        ng.select('rect').attr('stroke-width', isAcc ? 1.6 : 1.3);
        ng.select('rect').attr('stroke', isAcc ? acc : rgba(palMain, 0.52));
      });
    });

    return function () {};
  };

  global.ADV_SHOWCASE = S;
})(window);
