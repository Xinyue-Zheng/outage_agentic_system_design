/* Shared drawing helpers for the outage scenes: the grid map of the study area, the loop diagram,
 * key-value panels and decision cards. Every helper draws with the scene's ctx and keeps handles on the
 * returned object, so scenes stay deterministic and the engine's instant rebuild works unchanged. */
(function () {
  'use strict';
  var CASE = window.OUTAGE_CASE;

  /* colours for grid classes; the stage is authored for dark and inverted for light */
  var CLASS_FILL = { u: '#262c38', m: '#7a5220', e: '#05070c', o: '#3f74b9', t: '#d75066' };
  var CLASS_NAME = { u: 'unknown: not queried', m: 'queried: missing data', e: 'valid: no cell coverage', o: 'valid: other cells, no D0', t: 'valid: D0 present before outage' };
  var BACKUP_FILL = { B1: '#1a9b70', B2: '#8457cf', B3: '#b8732a', none: '#edb100' };

  function metersToPx(box, xm, ym) {
    var g = CASE.grid;
    var wM = g.columns * g.spacing_m, hM = g.rows * g.spacing_m;
    return [box.x + (xm / wM) * box.w, box.y + (1 - ym / hM) * box.h];
  }

  /* The study-area grid: one rect per location, coloured by class. box = {x, y, w, h} in scene units. */
  function grid(ctx, box, o) {
    o = o || {};
    var G = CASE.grid;
    var cw = box.w / G.columns, ch = box.h / G.rows;
    var g = ctx.group({ parent: o.parent });
    ctx.rect(box.x - 2, box.y - 2, box.w + 4, box.h + 4, { rx: 6, fill: 'rgba(5,10,22,0.6)', stroke: 'line', sw: 1, parent: g });
    var cells = [], byId = {};
    for (var i = 0; i < G.ids.length; i++) {
      var col = i % G.columns, row = Math.floor(i / G.columns);
      var x = box.x + col * cw, y = box.y + (G.rows - 1 - row) * ch;
      var r = ctx.rect(x + 0.6, y + 0.6, cw - 1.2, ch - 1.2, { fill: CLASS_FILL.u, parent: g });
      r.setAttribute('data-grid', G.ids[i]);
      cells.push(r); byId[G.ids[i]] = r;
    }
    var geo = ctx.group({ parent: g });
    var labels = ctx.group({ parent: g });
    var hiddenCells = [];
    CASE.geography.forEach(function (item) {
      var geom = item.geometry;
      if (item.kind === 'study_area') return;
      var pts = geom.coordinates.map(function (p) { return metersToPx(box, p[0], p[1]); });
      if (geom.kind === 'polyline') {
        ctx.poly(pts, { fill: 'none', stroke: '#e8edf5', sw: 2.4, closed: false, parent: geo });
        ctx.poly(pts, { fill: 'none', stroke: '#1b2a44', sw: 1.0, closed: false, parent: geo });
      } else if (item.kind === 'cell') {
        var c = pts[0], isDown = item.id === CASE.task.down_cell_id;
        var dot = ctx.circle(c[0], c[1], 5, { fill: isDown ? '#ff5d73' : '#7fd1ff', stroke: '#05070c', sw: 1.2, parent: geo });
        if (!isDown) { dot.setAttribute('opacity', 0); hiddenCells.push(dot); }
      } else {
        ctx.poly(pts, { fill: 'none', stroke: item.kind === 'settlement' ? '#f2f5fa' : 'rgba(242,245,250,0.35)', sw: item.kind === 'settlement' ? 1.6 : 1, closed: true, parent: geo });
      }
      var ax, ay;
      if (geom.kind === 'polyline') { var mid = pts[Math.floor(pts.length / 2)]; ax = mid[0]; ay = mid[1] - 8; }
      else if (item.kind === 'cell') { ax = pts[0][0] + 8; ay = pts[0][1] - 8; }
      else { ax = Math.min.apply(null, pts.map(function (p) { return p[0]; })) + 6; ay = Math.min.apply(null, pts.map(function (p) { return p[1]; })) + 12; }
      var lab = ctx.text(ax, ay, item.id, { size: 11, color: 'white', weight: 700, parent: labels });
      if (item.kind === 'cell' && item.id !== CASE.task.down_cell_id) { lab.setAttribute('opacity', 0); hiddenCells.push(lab); }
    });
    var outline = ctx.group({ parent: g });
    var api = {
      g: g, cells: cells, box: box,
      /* other cell sites become known only when coverage records list them */
      showCells: function (on) { hiddenCells.forEach(function (e) { e.setAttribute('opacity', on === false ? 0 : 1); }); },
      setClasses: function (classes) {
        for (var i = 0; i < cells.length; i++) cells[i].setAttribute('fill', CLASS_FILL[classes.charAt(i)] || CLASS_FILL.u);
      },
      setAssignment: function (map) {
        Object.keys(map).forEach(function (id) { if (byId[id]) byId[id].setAttribute('fill', BACKUP_FILL[map[id]] || BACKUP_FILL.none); });
      },
      outline: function (ids, color) {
        while (outline.firstChild) outline.removeChild(outline.firstChild);
        if (!ids) return;
        ids.forEach(function (id) {
          var r = byId[id]; if (!r) return;
          ctx.rect(parseFloat(r.getAttribute('x')) - 0.6, parseFloat(r.getAttribute('y')) - 0.6, cw, ch, { fill: 'none', stroke: color || 'white', sw: 1.2, parent: outline });
        });
      },
      /* bounding rect of a reference's grid ids, for a highlight frame */
      frame: function (ids, color) {
        var xs = [], ys = [];
        ids.forEach(function (id) { var r = byId[id]; if (!r) return; xs.push(parseFloat(r.getAttribute('x'))); ys.push(parseFloat(r.getAttribute('y'))); });
        if (!xs.length) return null;
        var x0 = Math.min.apply(null, xs) - 2, y0 = Math.min.apply(null, ys) - 2;
        var x1 = Math.max.apply(null, xs) + cw, y1 = Math.max.apply(null, ys) + ch;
        return ctx.rect(x0, y0, x1 - x0 + 2, y1 - y0 + 2, { fill: 'none', stroke: color || 'cyan', sw: 2, rx: 3, parent: g });
      },
      legendRow: function (x, y, withBackups) {
        var lg = ctx.group({ parent: g });
        var items = withBackups
          ? Object.keys(BACKUP_FILL).map(function (k) { return [BACKUP_FILL[k], k === 'none' ? 'D0, no eligible backup' : 'to ' + k]; })
          : ['u', 'm', 'e', 'o', 't'].map(function (k) { return [CLASS_FILL[k], CLASS_NAME[k].replace('valid: ', '').replace('queried: ', '').replace('unknown: ', '')]; });
        var cx = x;
        items.forEach(function (it) {
          ctx.rect(cx, y - 6, 12, 12, { fill: it[0], stroke: 'line', sw: 0.8, parent: lg });
          ctx.text(cx + 18, y, it[1], { size: 10.5, color: 'dim', parent: lg });
          cx += 18 + it[1].length * 6.4 + 22;
        });
        return lg;
      },
      legend: function (x, y, withBackups) {
        var lg = ctx.group({ parent: g });
        var items = ['u', 'm', 'e', 'o', 't'].map(function (k) { return [CLASS_FILL[k], CLASS_NAME[k]]; });
        if (withBackups) {
          Object.keys(BACKUP_FILL).forEach(function (k) { items.push([BACKUP_FILL[k], k === 'none' ? 'D0 location, no eligible backup' : 'D0 traffic transferred to ' + k]); });
        }
        items.forEach(function (it, i) {
          ctx.rect(x, y + i * 20 - 7, 13, 13, { fill: it[0], stroke: 'line', sw: 0.8, parent: lg });
          ctx.text(x + 20, y + i * 20, it[1], { size: 11, color: 'dim', parent: lg });
        });
        return lg;
      }
    };
    return api;
  }

  /* grid ids of a reference (exported for every reference except the whole study area) */
  function referenceIds(refId) {
    for (var j = 0; j < CASE.references.length; j++) if (CASE.references[j].id === refId) return CASE.references[j].grid_ids || [];
    return [];
  }

  /* The loop as a row of nodes. names in order; returns { nodes: {name: node}, links: [], setActive(name) } */
  function loop(ctx, o) {
    o = o || {};
    var names = o.names || ['render_context', 'llm_call', 'parse', 'validate', 'execute_query', 'update_state', 'write_step', 'loop_guards'];
    var subs = o.subs || { render_context: 'State → text', llm_call: 'action · params · gap', parse: 'strict · retry cap 3', validate: 'registry · State · preconditions', execute_query: 'function · timeout', update_state: 'facts + provenance', write_step: 'pre/post State', loop_guards: 'caps · repeats' };
    var colors = o.colors || { llm_call: 'amber', update_state: 'teal', write_step: 'teal' };
    var x0 = o.x || 90, y = o.y || 230, w = o.w || 150, h = o.h || 56, gap = o.gap || 30;
    var g = ctx.group({ parent: o.parent });
    var nodes = {}, links = [], order = [];
    names.forEach(function (n, i) {
      var node = ctx.node({ x: x0 + i * (w + gap) + w / 2, y: y, w: w, h: h, title: n, sub: subs[n] || '', color: colors[n] || 'magenta', titleSize: 13, subSize: 10.5, glow: false, parent: g });
      nodes[n] = node; order.push(node);
      if (i > 0) links.push(ctx.link(order[i - 1], node, { color: 'dim', sw: 1.2, parent: g }));
    });
    var back = null;
    if (o.loopBack !== false && order.length > 1) {
      back = ctx.link(order[order.length - 1], order[0], { color: 'dim', from: 'b', to: 'b', bend: { x: (order[0].box.cx + order[order.length - 1].box.cx) / 2, y: y + h / 2 + (o.bend || 70) }, dash: '4 4', sw: 1.2, label: o.backLabel || 'next round', labelDy: 14, parent: g });
      links.push(back);
    }
    return {
      g: g, nodes: nodes, order: order, links: links, back: back,
      setActive: function (name) {
        order.forEach(function (n) { n.setAttribute('opacity', name && n !== nodes[name] ? 0.45 : 1); });
      }
    };
  }

  /* A labelled key-value panel. rows = [[key, value], ...]. Returns { g, set(i, value) } */
  function kv(ctx, x, y, w, rows, o) {
    o = o || {};
    var g = ctx.group({ parent: o.parent });
    var lh = o.lh || 22, size = o.size || 12;
    var h = (o.title ? 30 : 10) + rows.length * lh + 6;
    ctx.rect(x, y, w, h, { rx: 8, fill: 'rgba(6,12,24,0.9)', stroke: ctx.alpha(o.color || 'cyan', 0.5), sw: 1.1, parent: g });
    if (o.title) ctx.text(x + 12, y + 17, o.title, { size: 12.5, weight: 700, color: o.color || 'cyan', parent: g });
    var vals = [];
    rows.forEach(function (r, i) {
      var yy = y + (o.title ? 30 : 10) + i * lh + lh / 2;
      ctx.text(x + 12, yy, r[0], { size: size, color: 'dim', parent: g });
      vals.push(ctx.text(x + w - 12, yy, String(r[1]), { size: size, color: 'text', anchor: 'end', font: 'mono', parent: g }));
    });
    return { g: g, h: h, set: function (i, v) { vals[i].textContent = String(v); }, vals: vals };
  }

  /* A decision card: action, parameters, information gap. */
  function decision(ctx, x, y, w, d, o) {
    o = o || {};
    var g = ctx.group({ parent: o.parent });
    var lines = ['action:     ' + d.action, 'parameters: ' + d.parameters];
    var gapLines = wrap('gap: ' + d.gap, Math.floor(w / 8.2));
    var code = ctx.code({ x: x, y: y, w: w, title: o.title || 'model output (illustrative)', lang: 'text', size: 10.5, color: o.color || 'amber', lines: lines.concat(gapLines), parent: g });
    return { g: g, code: code, h: code.h };
  }
  function wrap(str, n) {
    var words = str.split(' '), out = [], cur = '';
    words.forEach(function (w) { if ((cur + ' ' + w).trim().length > n) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
    if (cur) out.push(cur);
    return out.map(function (l, i) { return (i ? '            ' : '') + l; });
  }

  function state(i) { return CASE.states[i]; }
  function region(stateIndex, refId) {
    var rs = CASE.states[stateIndex].regions;
    for (var i = 0; i < rs.length; i++) if (rs[i].reference_id === refId) return rs[i];
    return null;
  }
  function tokens(bytes) { return Math.round(bytes / 4); }
  function fmt(n) { return Number(n).toLocaleString('en-US'); }

  window.OutageDraw = { grid: grid, loop: loop, kv: kv, decision: decision, state: state, region: region, referenceIds: referenceIds, tokens: tokens, fmt: fmt, CLASS_FILL: CLASS_FILL, BACKUP_FILL: BACKUP_FILL, wrap: wrap };
})();
