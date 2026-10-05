/* L0 — Outage Case, End to End. The recorded synthetic run played step by step over the orchestration graph:
 * for each step the decision, the validated query, the observation, the State update on the grid, and the
 * context rendered for the next decision. The graph on top is the design's loop; the active node lights up. */
(function () {
  var D = window.OutageDraw;
  var CASE = window.OUTAGE_CASE;
  var DEC = window.OUTAGE_DECISIONS;
  var GRID_BOX = { x: 20, y: 486, w: 580, h: 368 };
  var PX = { decision: [640, 486, 940], obs: [640, 612, 460], state: [1120, 612, 460], ctx: [640, 776, 940] };

  function kb(bytes) { return (bytes / 1024).toFixed(bytes < 10240 ? 1 : 0) + ' KB'; }
  function tok(bytes) { return D.fmt(D.tokens(bytes)) + ' tokens'; }
  function rsrp(o) { return o.rsrp_min === null ? 'none' : o.rsrp_min + ' to ' + o.rsrp_max; }

  function contextLines(stateIdx, refId, n) {
    var lines = CASE.states[stateIdx].context.split('\n'), out = [];
    for (var i = 0; i < lines.length && out.length < n; i++) {
      var l = lines[i];
      if (l.indexOf('- ' + refId + ' contains') === 0 || l.indexOf('- ' + refId + ':') === 0) {
        out.push(l.trim());
        for (var j = i + 1; j < lines.length && out.length < n && lines[j].indexOf('  ') === 0; j++) out.push(lines[j].trim());
      }
    }
    return out.length ? out : ['(no lines mention ' + refId + ')'];
  }

  var DECISION = ['llm_call', 'parse', 'validate_action', 'record_error_obs', 'END: retry cap', 'verifier', 'completion_checks'];
  function setActive(S, name) {
    Object.keys(S.G).forEach(function (n) {
      var on = !name || n === name || (name === 'decision' && DECISION.indexOf(n) >= 0);
      S.G[n].setAttribute('opacity', on ? 1 : 0.38);
    });
    if (S.box) S.box.setAttribute('opacity', !name || name === 'decision' ? 1 : 0.38);
  }

  function clearPanels(ctx, S) {
    ['decision', 'obsPanel', 'statePanel', 'ctxBlock', 'frame'].forEach(function (k) {
      if (S[k]) { ctx.remove(S[k].g || S[k], 0); S[k] = null; }
    });
  }

  function statePanel(ctx, S, i) {
    var st = CASE.states[i], sa = D.region(i, 'Study_area');
    S.statePanel = D.kv(ctx, PX.state[0], PX.state[1], PX.state[2], [
      ['Study_area queried', D.fmt(sa.queried) + ' / ' + D.fmt(sa.total)],
      ['valid with D0 present', sa.target],
      ['queried, data missing', sa.missing],
      ['boundary, D0 at', sa.boundary_target + ' of ' + sa.boundary]
    ], { title: 'State ' + st.id, color: 'teal' });
    return S.statePanel;
  }

  /* the orchestration graph, drawn paper-style: one pipeline row, branch nodes directly under their source,
   * return edges as nested orthogonal arcs underneath, no crossings. Nodes keyed by name in S.G. */
  function drawGraph(ctx, S) {
    var H = 40, W = 136, RA = 172, RB = 258, RC = 344;
    var g = ctx.group();
    S.G = {};
    function node(name, cx, cy, sub, color, kind, w) {
      S.G[name] = ctx.node({ x: cx, y: cy, w: w || W, h: H, title: name, sub: sub, color: color, kind: kind || 'box', titleSize: 11.5, subSize: 9, glow: false, parent: g });
      return S.G[name];
    }
    /* row A: the pipeline */
    node('START', 65, RA, '', 'white', 'pill', 70);
    node('initialize', 182, RA, 'lookups · State 0', 'magenta');
    node('render_context', 332, RA, 'State → text', 'amber');
    node('llm_call', 482, RA, 'action · params · gap', 'amber');
    node('parse', 632, RA, 'three parts', 'magenta');
    node('validate_action', 782, RA, 'registry · State', 'magenta');
    node('execute_query', 932, RA, 'tool · timeout', 'blue');
    node('update_state', 1082, RA, 'facts + source', 'teal');
    node('write_step', 1232, RA, 'Step record', 'teal');
    node('loop_guards', 1382, RA, 'caps', 'magenta');
    node('END: cap hit', 1519, RA, '', 'red', 'pill', 110);
    /* row B */
    node('END: retry cap', 482, RB, '', 'red', 'pill');
    node('record_error_obs', 632, RB, 'what failed, why', 'magenta');
    node('verifier', 782, RB, 'agree · concern', 'amber');
    /* row C */
    node('completion_checks', 782, RC, 'four rules', 'pink');
    node('END: complete', 919, RC, '', 'red', 'pill', 110);

    function arrow(d, o) { o = o || {}; return ctx.path(d, { stroke: o.color || 'dim', sw: 1.3, dash: o.dash, arrow: true, parent: g }); }
    function lbl(x, y, t, anchor, color) { return ctx.text(x, y, t, { size: 10, color: color || 'dim', anchor: anchor || 'middle', parent: g }); }
    var yA = RA, yB = RB, yC = RC, bot = RA + H / 2, topB = RB - H / 2, botB = RB + H / 2, topC = RC - H / 2, botC = RC + H / 2;
    /* row A, left to right */
    arrow('M100,' + yA + ' L113,' + yA);
    arrow('M250,' + yA + ' L263,' + yA);
    arrow('M400,' + yA + ' L413,' + yA);
    arrow('M550,' + yA + ' L563,' + yA);
    arrow('M700,' + yA + ' L713,' + yA, { dash: '4 3' });
    arrow('M1000,' + yA + ' L1013,' + yA);
    arrow('M1150,' + yA + ' L1163,' + yA);
    arrow('M1300,' + yA + ' L1313,' + yA);
    arrow('M1450,' + yA + ' L1463,' + yA, { dash: '4 3', color: 'red' });
    /* branches down */
    arrow('M632,' + bot + ' L632,' + (topB - 1), { dash: '4 3', color: 'red' }); lbl(624, 224, 'does not parse', 'end', 'red');
    arrow('M745,' + bot + ' L745,222 L668,222 L668,' + (topB - 1), { dash: '4 3', color: 'red' }); lbl(752, 214, 'invalid', 'start', 'red');
    arrow('M800,' + bot + ' L800,' + (topB - 1), { color: 'amber' }); lbl(806, 224, 'checks pass', 'start', 'amber');
    arrow('M564,' + yB + ' L551,' + yB, { dash: '4 3', color: 'red' }); lbl(557, 248, 'cap', 'middle', 'red');
    /* verifier routes by action */
    arrow('M850,' + (yB - 8) + ' L932,' + (yB - 8) + ' L932,' + (bot + 1), { dash: '4 3', color: 'blue' }); lbl(891, 242, 'query', 'middle', 'blue');
    arrow('M782,' + botB + ' L782,' + (topC - 1), { dash: '4 3', color: 'pink' }); lbl(788, 310, 'finish', 'start', 'pink');
    lbl(850, yB + 14, 'concern → fact in State', 'start', 'amber');
    arrow('M850,' + yC + ' L863,' + yC, { dash: '4 3', color: 'pink' }); lbl(857, 334, 'met', 'middle', 'pink');
    /* return arcs, nested */
    arrow('M632,' + botB + ' L632,392 L365,392 L365,' + (bot + 1), { dash: '4 3', color: 'red' }); lbl(498, 386, 'retry: the error becomes an observation', 'middle', 'red');
    arrow('M782,' + botC + ' L782,412 L330,412 L330,' + (bot + 1), { dash: '4 3', color: 'pink' }); lbl(556, 406, 'unmet: requirements written into State', 'middle', 'pink');
    arrow('M1382,' + bot + ' L1382,432 L290,432 L290,' + (bot + 1), { color: 'magenta' }); lbl(836, 426, 'next round', 'middle', 'magenta');
    lbl(1010, 262, 'solid: always · dashed: conditional · model in orange', 'start');
    /* the decision core: model output, parsing, validation, verifier and completion as one zoom target */
    S.box = ctx.group({ parent: g });
    ctx.rect(406, 142, 448, 230, { rx: 10, fill: 'rgba(0,0,0,0.001)', stroke: 'pink', sw: 1.4, dash: '7 5', parent: S.box });
    S.box.box = { x: 406, y: 142, w: 448, h: 230, cx: 630, cy: 257, l: 406, r: 854, t: 142, b: 372 };
    S.box.color = 'pink';
    lbl(412, 134, 'decision core', 'start', 'pink');
    S.graph = g;
    var G = S.G;
    ctx.hotspot(G.initialize, 'init');
    ctx.hotspot(G.render_context, 'context');
    ctx.hotspot(S.box, 'decision');
    ctx.hotspot(G.execute_query, 'tools');
    ctx.hotspot(G.update_state, 'state');
    ctx.hotspot(G.loop_guards, 'caps');
    ctx.hotspot(G['END: complete'], 'offline');
  }

  /* segments of one recorded query step; the gates live in the step's run() */
  function Q(ctx, i) {
    var S = ctx.state, step = CASE.steps[i - 1], o = step.observation, ref = step.action.reference_id;
    return {
      decide: function () {
        clearPanels(ctx, S);
        setActive(S, 'decision');
        S.decision = D.decision(ctx, PX.decision[0], PX.decision[1], PX.decision[2], DEC[i], { title: 'action ' + i + ' · model output (illustrative)' });
        return ctx.reveal(S.decision.g, { from: 'up' });
      },
      execute: function () {
        setActive(S, 'execute_query');
        S.frame = S.grid.frame(D.referenceIds(ref), 'cyan');
        if (i === 1) S.grid.showCells(true);
        S.obsPanel = D.kv(ctx, PX.obs[0], PX.obs[1], PX.obs[2], [
          ['validated', 'name, area and epoch accepted'],
          ['observation', o.id + ' · ' + o.result_status],
          ['requested / valid / missing', o.requested + ' / ' + o.valid + ' / ' + o.missing],
          ['D0 present · RSRP dBm', o.target + ' · ' + rsrp(o)]
        ], { title: 'coverage.query(' + ref + ')', color: 'blue' });
        return Promise.all([ctx.reveal(S.obsPanel.g, { from: 'up' }), ctx.pulse(S.frame, { color: 'cyan', times: 2, dur: 600 })]);
      },
      update: function () {
        setActive(S, 'update_state');
        S.grid.setClasses(CASE.states[i].classes);
        S.grid.outline(D.region(i, 'S2').boundary_ids, '#ffffff');
        statePanel(ctx, S, i);
        return ctx.reveal(S.statePanel.g, { from: 'up' });
      },
      render: function () {
        setActive(S, 'render_context');
        S.ctxBlock = ctx.code({ x: PX.ctx[0], y: PX.ctx[1], w: PX.ctx[2], title: 'context ' + CASE.states[i].id + ' · lines about ' + ref, lang: 'text', size: 12, color: 'amber', maxLines: 4, lines: contextLines(i, ref, 4) });
        return ctx.reveal(S.ctxBlock, { from: 'up' });
      }
    };
  }

  Atlas.register({
    id: 'case',
    refs: [
      'Hamadanian et al., <i>A Holistic View of AI-driven Network Incident Management</i>, HotNets 2023',
      'Guo et al., <i>From Question Answering to Task Completion: A Survey on Agent System and Harness Design</i>, arXiv 2606.20683, 2026',
      'OpenAI, <i>Unrolling the Codex agent loop</i>, 2026',
      'Anthropic, <i>Building effective agents</i>, 2024'
    ],
    poster: 10,
    setup: function (ctx) {
      var S = ctx.state;
      drawGraph(ctx, S);
      S.grid = D.grid(ctx, GRID_BOX);
      S.grid.setClasses(CASE.states[0].classes);
      S.grid.legendRow(20, 874, false);
      ctx.text(640, 892, 'Synthetic study area, 6 km by 4 km, 100 m grid, 2,400 locations. Maps are for people; the model reads text.', { size: 11, color: 'dim' });
    },
    steps: [
      {
        title: 'Start',
        beats: [
          {
            say: 'The run starts with one down cell and one outage time. Nothing else is known about the impact yet. The program, not the model, opens the investigation by writing down what it already knows.',
            card: { tag: 'KEY IDEA', title: 'Two facts start the run', body: 'Cell <code>D0</code> and the outage time. The model has not been called yet; initialization comes next.' },
            deep: '<p>The run begins with a program-side phase. The task record holds the down cell id, the outage time and the objective. A cell lookup returns the cell\'s position and the settlement it sits in. These are facts the program knows for free and writes once, so the model never spends a step discovering them.</p>'
          },
          {
            say: 'Geography is known before any coverage is queried: three settlements, two highways, farmland, a vineyard and a forest, and the site of the down cell. Other cells are not known yet; they appear only in coverage records. Knowing a boundary does not mean knowing the coverage inside it.',
            card: { tag: 'HOW IT WORKS', title: 'Geography first, coverage unknown', body: 'Polygons and road centerlines come from the map layer. Every one of the 2,400 grid locations starts as <b>unknown</b>.' },
            deep: '<p>Eleven resolvable references are derived from the geography: the study area, S1, S2, S3, two road corridors (H1 full width 300 m, H2 full width 500 m, round end caps), three land-use areas and two sub-areas of S2. Each reference resolves to an exact set of grid ids. Land-use labels name mapped types only; they are not population or demand.</p>'
          },
          {
            say: 'The initial State records the task, the geography, the eleven references, and for every reference zero queried locations. It also lists fifteen unknowns, including that no stopping rule has been applied.',
            card: { tag: 'NUMBERS', title: 'State zero', stat: { v: '0 / 2,400', l: 'grid locations queried; 15 unknowns listed, one per reference plus general caveats' } },
            deep: '<p>State is an immutable snapshot. <code>state_00</code> contains the grid, geography, spatial relations, the references and one <b>region summary</b> per reference with empty queried sets. Nothing from the hidden dataset enters State: the update function only ever sees executed query results.</p>'
          },
          {
            say: 'Before the first decision the program renders the State into text. This rendering, not a transcript, is what the model would read. It is about two thousand two hundred tokens.',
            card: { tag: 'NUMBERS', title: 'The first rendering', stat: { v: '2,167', u: 'tokens', l: 'rendered context for state_00; the fixed skill adds about 2.7 KB in front of it' } },
            deep: '<p>The rendering has fixed sections: task, known geography and relations, investigation progress per reference, coverage observations, impact, remaining unknowns, available references, evidence provenance. It is produced by a program template from State. Open the <b>Context Builder</b> chamber for the sections and sizes.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          clearPanels(ctx, S);
          setActive(S, 'START');
          S.grid.setClasses(CASE.states[0].classes);
          S.grid.outline(null);
          S.grid.showCells(false);
          S.taskCard = ctx.code({ x: PX.decision[0], y: PX.decision[1], w: PX.decision[2], title: 'task', lang: 'text', size: 12, color: 'cyan', lines: [
            'down_cell_id: ' + CASE.task.down_cell_id,
            'outage_time:  ' + CASE.task.outage_time,
            'objective:    investigate the outage impact of ' + CASE.task.down_cell_id
          ] });
          S.decision = S.taskCard;
          return ctx.reveal(S.taskCard, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            setActive(S, 'initialize');
            S.obsPanel = D.kv(ctx, PX.obs[0], PX.obs[1], PX.obs[2], [
              ['settlements', 'S1, S2, S3'], ['highways, queried by buffer', 'H1 300 m, H2 500 m'], ['land use', 'F1, V1, F2'],
              ['cells', 'D0 down; others unknown until coverage is queried']
            ], { title: 'geography known at start', color: 'cyan' });
            return Promise.all([ctx.reveal(S.obsPanel.g, { from: 'up' }), ctx.pulse(S.grid.g, { color: 'cyan', times: 1, dur: 800 })]);
          }).then(function () { return ctx.beat(2); }).then(function () {
            statePanel(ctx, S, 0);
            S.statePanel.set(3, 'no boundary yet');
            return ctx.reveal(S.statePanel.g, { from: 'up' });
          }).then(function () { return ctx.beat(3); }).then(function () {
            setActive(S, 'render_context');
            S.ctxBlock = ctx.code({ x: PX.ctx[0], y: PX.ctx[1], w: PX.ctx[2], title: 'context state_00 · first lines', lang: 'text', size: 12, color: 'amber', maxLines: 3, lines: CASE.states[0].context.split('\n').slice(0, 3) });
            return ctx.reveal(S.ctxBlock, { from: 'up' });
          });
        }
      },
      {
        title: 'Action 1: S1',
        beats: [
          {
            say: 'The first decision is the obvious one: query the settlement nearest the down cell. The decision has three parts, the action, its parameters, and the information gap it is meant to close.',
            card: { tag: 'HOW IT WORKS', title: 'One decision, three parts', body: 'action <code>coverage.query</code>, parameter <code>reference = S1</code>, and the gap: which S1 locations had D0 coverage, and how strong.' },
            deep: '<p>The three-part decision is the model\'s whole output. The program parses it strictly: an action name that must exist in the registry, parameters that must match the action\'s schema, and a gap sentence the program can later compare with State. In the recorded run the action is the scripted one; the text shown here illustrates what the model would produce.</p>'
          },
          {
            say: 'The program validates the action and runs the query. S1 resolves to thirty six grid locations. Thirty five come back valid and one is missing. D0 is present at thirty three of them, strong, between minus eighty eight and minus eighty dBm.',
            card: { tag: 'NUMBERS', title: 'First observation', stat: { v: '33 / 36', l: 'locations with D0 present; 1 missing record; RSRP −87.96 to −80.47 dBm' } },
            deep: '<p>Validation checks the action name, that <code>S1</code> is a known reference, that the query geometry equals the reference geometry, that the requested grid set equals the reference\'s set, and that the coverage epoch is pre-outage. The tool returns exactly one record per requested id; a <b>missing</b> record carries no signals. The 12 KB result stays on disk; State keeps a link to it.</p>'
          },
          {
            say: 'State is updated from the observation. Thirty six locations move from unknown to queried, the per reference summary is recomputed, and twenty boundary locations now face the unqueried outside, nineteen of them with D0.',
            card: { tag: 'KEY IDEA', title: 'Query boundary', body: 'Queried grid cells that share an edge with at least one unqueried grid cell. Signal strength plays no part in choosing it.' },
            deep: '<p>The region summary for every reference is recomputed from the union of all executed observations, deduplicated by grid id. For the study area after step 1: 36 queried, 35 valid, 1 missing, 33 with D0, 20 boundary locations of which 19 show D0. Strong D0 at the edge of the queried area means the area is probably too small; a completion check reads this number.</p>'
          },
          {
            say: 'The context for the next decision is rendered again from the new State. The lines about S1 now carry the counts. The whole text grew by about five hundred tokens, not by the twelve kilobytes of the raw result.',
            card: { tag: 'NUMBERS', title: 'Rendering, not appending', stat: { v: '2,687', u: 'tokens', l: 'context after step 1; the raw observation (12 KB) is not in it' } },
            deep: '<p>In an append-only harness the 12 KB result would be added to the transcript and resent on every later call. Here the program computed the counts and wrote four lines. The model will see progress, coverage, boundary and unknowns for S1, and a provenance line that names <code>obs_01</code>.</p>'
          }
        ],
        run: function (ctx) { var q = Q(ctx, 1); return q.decide().then(function () { return ctx.beat(1); }).then(q.execute).then(function () { return ctx.beat(2); }).then(q.update).then(function () { return ctx.beat(3); }).then(q.render); }
      },
      {
        title: 'Action 2: H1 corridor',
        beats: [
          {
            say: 'Highway H1 crosses S1 and S3. The next gap is whether D0 coverage runs along that corridor beyond the settlement. A road is a centerline, so the query uses its declared buffer.',
            card: { tag: 'HOW IT WORKS', title: 'Query a corridor, not a line', body: '<code>H1_buffer</code>: all grid centres within 150 m of the H1 centerline, with round end caps. 88 locations.' },
            deep: '<p>The reference <code>H1_buffer</code> is derived by the program from the road geometry and a declared full width of 300 m. The model never invents coordinates; it names a resolvable reference. Parameters are ids of things that exist in State, not free text.</p>'
          },
          {
            say: 'Eighty eight locations are requested, eighty seven are valid and one is missing. D0 is present at sixty of them. Twenty five valid locations have other cells but not D0, which is a different fact from having no coverage at all.',
            card: { tag: 'NUMBERS', title: 'Along H1', stat: { v: '60 / 88', l: 'with D0; 25 have other cells only; 2 have no cell coverage; 1 missing' } },
            deep: '<p>Four situations are kept apart in every observation: valid with D0, valid with other cells only, valid with an empty cell list (no coverage), and missing data. Only the first marks a potentially affected location. The third and fourth must never be merged: no coverage is evidence, missing is not.</p>'
          },
          {
            say: 'After the update one hundred six locations are queried. The boundary grew to fifty two locations, thirty seven of them with D0, so the area is still open in several directions.',
            card: { tag: 'KEY IDEA', title: 'Boundary counts guide the search', body: 'The program reports where the queried area ends and D0 is still present. The model decides where to push next.' },
            deep: '<p>Study area after step 2: 106 queried, 77 with D0, boundary 52 with D0 at 37. Overlaps are deduplicated: the H1 corridor shares locations with S1, and a location counts once. Counts are reported per reference and the context says they must not be added together.</p>'
          },
          {
            say: 'The rendered context now has lines for both S1 and the H1 corridor. It is still under three thousand tokens.',
            card: { tag: 'NUMBERS', title: 'Context after step 2', stat: { v: '2,747', u: 'tokens', l: 'raw observations so far: 41 KB, about 10,300 tokens if they had been appended' } },
            deep: '<p>The size of the rendering depends on how many references have been touched, not on how many steps have run. Two steps in, the append-only alternative would already be four times larger than the whole rendering.</p>'
          }
        ],
        run: function (ctx) { var q = Q(ctx, 2); return q.decide().then(function () { return ctx.beat(1); }).then(q.execute).then(function () { return ctx.beat(2); }).then(q.update).then(function () { return ctx.beat(3); }).then(q.render); }
      },
      {
        title: 'Action 3: H2 corridor',
        beats: [
          {
            say: 'Highway H2 crosses S1 and S2. The decision follows the same reasoning as the last one, toward the other settlement.',
            card: { tag: 'HOW IT WORKS', title: 'The second corridor', body: '<code>H2_buffer</code>: 500 m full width, 192 locations. The gap is whether D0 reaches toward S2.' },
            deep: '<p>Two corridors, two independent gaps. They could have been one set-valued query, regions {H1_buffer, H2_buffer}, executed together. The recorded run did them one at a time. The cost in queried area is the same; the number of model rounds differs.</p>'
          },
          {
            say: 'This is the largest query of the run: one hundred ninety two locations. One hundred ninety are valid, two are missing, and D0 is present at one hundred sixty nine of them.',
            card: { tag: 'NUMBERS', title: 'Along H2', stat: { v: '169 / 192', l: 'with D0; RSRP −111 to −80.47 dBm; raw result 85 KB' } },
            deep: '<p>The corridor overlaps the southern rows of S2, so S2\'s own summary changes without S2 being queried by name: 36 of its 200 locations are now queried, 20 with D0, and S2 has an 11-location boundary facing its interior. Region summaries are cumulative evidence, not the result of the last step.</p>'
          },
          {
            say: 'Two hundred seventy two locations are queried. D0 is present at two hundred twenty two. The boundary has one hundred seventeen locations and D0 is at ninety two of them.',
            card: { tag: 'WHY IT MATTERS', title: 'S2 is now in view', body: 'The corridor touched S2\'s roadside rows. The S2 summary shows a boundary into its interior with D0 at 4 of 11 locations.' },
            deep: '<p>Study area after step 3: 272 queried, 222 with D0, 7 with no coverage, 41 other cells only, 2 missing. The S2 summary drives the next two decisions: part of S2 is known, the interior is not, and the boundary shows D0.</p>'
          },
          {
            say: 'The context lines for S2 appear although S2 was never named in a query. This is the point of computing summaries per reference from all evidence.',
            card: { tag: 'NUMBERS', title: 'Context after step 3', stat: { v: '2,917', u: 'tokens', l: 'raw observations so far: 128 KB, about 32,000 tokens' } },
            deep: '<p>The append-only alternative is now more than ten times the rendering, and the model in that design would have to find the S2 overlap by reading two corridor results itself.</p>'
          }
        ],
        run: function (ctx) { var q = Q(ctx, 3); return q.decide().then(function () { return ctx.beat(1); }).then(q.execute).then(function () { return ctx.beat(2); }).then(q.update).then(function () { return ctx.beat(3); }).then(q.render); }
      },
      {
        title: 'Action 4: S2 roadside',
        beats: [
          {
            say: 'The H2 corridor showed D0 at the edge of S2. Instead of querying all of S2, the decision targets its five roadside rows, forty locations. This is a scope choice, and it is the model\'s to make.',
            card: { tag: 'TRADE-OFF', title: 'Part of a settlement first', body: 'Smaller query, less cost, but a boundary remains inside S2. The manual trace made the same kind of choice; it is a strategy, not a rule.' },
            deep: '<p><code>S2_roadside</code> is a declared sub-reference: the southern five grid rows of S2, 40 locations. Querying it costs 40 locations against 200 for all of S2. The decision is reasonable, not provably right. The handoff is explicit that the roadside-first choice from the manual case is case-specific.</p>'
          },
          {
            say: 'All forty records are valid. D0 is present at twenty, weak, between minus one hundred eleven and minus one hundred four dBm. The other twenty have other cells only.',
            card: { tag: 'NUMBERS', title: 'S2 roadside', stat: { v: '20 / 40', l: 'with D0 at −111 to −104 dBm; the result status is complete, no missing records' } },
            deep: '<p>This is the only observation in the run with result status <b>complete</b>. Weak D0 at the edge of its range is exactly the case where the boundary rule matters: the signal fades, but fading is not absence.</p>'
          },
          {
            say: 'Within S2, forty locations are queried and one hundred sixty are not. The boundary facing the interior has eight locations, and D0 is present at four of them. The interior stays unknown.',
            card: { tag: 'KEY IDEA', title: 'Half the boundary still shows D0', body: 'Eight boundary locations, D0 at four. The program states the fact; the next decision is the model\'s.' },
            deep: '<p>S2 after step 4: 40 queried of 200, 20 with D0, boundary 8 with D0 at 4, no missing. The study area boundary is 119 with D0 at 92. A completion check on "boundary still shows the down cell" would reject a stop here, and it should.</p>'
          },
          {
            say: 'The rendered context says it directly: along the query boundary facing the unqueried interior, D0 is present at four of eight boundary locations. Coverage in the unqueried interior remains unknown.',
            card: { tag: 'HOW IT WORKS', title: 'Facts, not raw rows', body: 'The model reads one sentence about the boundary. The 17 KB of records that produced it stay in <code>obs_04.json</code>.' },
            deep: '<p>Context after step 4 is 2,895 tokens, slightly smaller than after step 3 because some unknowns were resolved. The lines about <code>S2_roadside</code> and the updated lines about <code>S2</code> are the whole change the model sees.</p>'
          }
        ],
        run: function (ctx) { var q = Q(ctx, 4); return q.decide().then(function () { return ctx.beat(1); }).then(q.execute).then(function () { return ctx.beat(2); }).then(q.update).then(function () { return ctx.beat(3); }).then(q.render); }
      },
      {
        title: 'Action 5: S2 interior',
        beats: [
          {
            say: 'With D0 at half the boundary, the next decision queries the remaining interior of S2, one hundred sixty locations. The gap is whether D0 reaches the interior at all.',
            card: { tag: 'HOW IT WORKS', title: 'Close the boundary', body: '<code>S2_remaining</code>: S2 minus the roadside rows. After it, S2 has no interior boundary left.' },
            deep: '<p>The decision is driven by a program-reported fact, not by a guess. This is the intended division of labour: the program computes where evidence ends, the model chooses what to do about it.</p>'
          },
          {
            say: 'One hundred fifty one records are valid and nine are missing. D0 is present at only thirty interior locations, very weak. Most of the interior is served by other cells.',
            card: { tag: 'NUMBERS', title: 'S2 interior', stat: { v: '30 / 160', l: 'with D0 at −113 to −107 dBm; 113 other cells only; 8 no coverage; 9 missing' } },
            deep: '<p>Nine missing records in one query is the largest gap in the run. They are reported as missing, not as no coverage, and they stay in the unknowns list. The 57 KB result would be the second largest item in an append-only transcript.</p>'
          },
          {
            say: 'S2 is now fully queried: fifty of two hundred locations with D0, nine missing, no interior boundary. The study area has four hundred thirty six queried locations.',
            card: { tag: 'KEY IDEA', title: 'A settlement is closed', body: 'No queried-unqueried boundary remains inside S2. The remaining S2 unknowns are the 9 missing records.' },
            deep: '<p>Study area after step 5: 436 queried, 252 with D0, 158 other cells only, 15 no coverage, 11 missing. The boundary is 158 with D0 at 99, now mostly along the corridors toward the farmland, vineyard and forest, which have no coverage data at all.</p>'
          },
          {
            say: 'The context for S2 changes from a boundary sentence to a closure sentence. The model is told that no interior boundary exists in this reference.',
            card: { tag: 'NUMBERS', title: 'Context after step 5', stat: { v: '3,006', u: 'tokens', l: 'raw observations so far: 203 KB, about 50,700 tokens' } },
            deep: '<p>The rendering crosses 3,000 tokens for the first time. The growth comes from more references having content, not from history. An appended transcript would be seventeen times larger at this point.</p>'
          }
        ],
        run: function (ctx) { var q = Q(ctx, 5); return q.decide().then(function () { return ctx.beat(1); }).then(q.execute).then(function () { return ctx.beat(2); }).then(q.update).then(function () { return ctx.beat(3); }).then(q.render); }
      },
      {
        title: 'Action 6: S3',
        beats: [
          {
            say: 'The H1 corridor had valid data all the way to S3. The remaining settlement is queried to see whether D0 reaches it at all.',
            card: { tag: 'HOW IT WORKS', title: 'The third settlement', body: '<code>S3</code>: 48 locations in the north. The corridor had shown D0 fading along H1.' },
            deep: '<p>This query could have been issued together with the S2 interior as a set-valued action, since the two gaps are independent. Sequencing them costs one extra model round and nothing in queried area.</p>'
          },
          {
            say: 'Forty six records are valid, two are missing, and D0 is present at none of them. Forty five locations are served by other cells, one has no cell coverage.',
            card: { tag: 'NUMBERS', title: 'S3 is not affected', stat: { v: '0 / 48', l: 'with D0; 45 other cells only; 1 no coverage; 2 missing' } },
            deep: '<p>A zero is evidence here because it comes from valid records with other cells listed. Had the 48 records been missing, the same zero would mean nothing. The RSRP range for D0 in S3 is reported as none, not as a number.</p>'
          },
          {
            say: 'The study area now has four hundred sixty six queried locations. The boundary grew to one hundred sixty eight locations, D0 at ninety nine, almost all of them facing the farmland, the vineyard and the forest.',
            card: { tag: 'PITFALL', title: 'The open boundary is rural', body: 'F1, V1 and F2 hold 727 unqueried locations. Land use says nothing about demand there; it is simply unknown.' },
            deep: '<p>Study area after step 6: 466 queried, 252 with D0, 186 other only, 15 no coverage, 13 missing, boundary 168 with D0 at 99. Every settlement is closed; the corridors end at unqueried land. A completion check would still find the down cell on the boundary.</p>'
          },
          {
            say: 'The S3 lines in the context now read: D0 is present at zero of the forty eight queried locations. The unknowns list shrinks for S3 and keeps the three rural references.',
            card: { tag: 'NUMBERS', title: 'Context after step 6', stat: { v: '3,020', u: 'tokens', l: 'raw observations so far: 215 KB, about 53,800 tokens' } },
            deep: '<p>The three rural references still appear in progress as zero queried and in the unknowns as 240, 247 and 240 unknown locations. The model is told what it does not know.</p>'
          }
        ],
        run: function (ctx) { var q = Q(ctx, 6); return q.decide().then(function () { return ctx.beat(1); }).then(q.execute).then(function () { return ctx.beat(2); }).then(q.update).then(function () { return ctx.beat(3); }).then(q.render); }
      },
      {
        title: 'Action 7: a repeated query',
        beats: [
          {
            say: 'Step seven queries S2 roadside a second time. In the recorded run this is deliberate, to show deduplication. In a live run it would be the signature of a stuck model.',
            card: { tag: 'PITFALL', title: 'The same query again', body: 'Same action, same parameters as action 4. The repeated-query guard hashes action and parameters and ends the run on a repeat.' },
            deep: '<p>For queries that cost area, a second identical call ends the run. The guard lives in <code>loop_guards</code>, ends the run with the typed reason <b>repeated_query</b>, and a person reviews the trace. In the recorded run the step is allowed through so the deduplication can be shown.</p>'
          },
          {
            say: 'The query returns the same forty records as before. The observation gets a new id, obs seven, and is stored in full like every other result.',
            card: { tag: 'HOW IT WORKS', title: 'Every execution is an observation', body: 'Even a repeat gets its own id and file. Provenance never overwrites history; State decides which observation is current.' },
            deep: '<p>The contract requires a new observation id per execution. Both <code>obs_04</code> and <code>obs_07</code> exist on disk. For each grid id the evidence index points to the newest observation, so the summaries use obs_07 for the roadside rows.</p>'
          },
          {
            say: 'Nothing in the counts changes. Four hundred sixty six locations are still queried. Overlapping queries never add locations, and a re-query replaces the earlier record for the same grid id.',
            card: { tag: 'KEY IDEA', title: 'Deduplicated by grid id', body: 'Counts are unchanged: 466 queried, 252 with D0. The newest observation wins per location; the older one stays on disk.' },
            deep: '<p>The current fact for a location comes from the latest evidence, and older evidence is kept but not used. This is the state-sync rule of the design applied to analysis.</p>'
          },
          {
            say: 'The rendered context changes in one place: the provenance list gains obs seven. A step history, which the current rendering does not have, would make the repeat visible to the model itself.',
            card: { tag: 'TRADE-OFF', title: 'The model cannot see its own repeat', body: 'Only the provenance list shows two S2_roadside observations. A short step history in the context lets the model see it.' },
            deep: '<p>Context after step 7: 3,041 tokens. Adding the last few steps as action, gap and one-line outcome would let the model notice the repetition without a program guard, at a cost of a few hundred tokens. This is one of the context conditions in the evaluation.</p>'
          }
        ],
        run: function (ctx) { var q = Q(ctx, 7); return q.decide().then(function () { return ctx.beat(1); }).then(q.execute).then(function () { return ctx.beat(2); }).then(q.update).then(function () { return ctx.beat(3); }).then(q.render); }
      },
      {
        title: 'Action 8: backup and load',
        beats: [
          {
            say: 'With every settlement and both corridors queried, the decision moves to the second phase. The candidate backup cells are the other cells that coverage records listed at the same locations: B1, B2 and B3. Which of them takes the traffic of each D0 location, and what load results?',
            card: { tag: 'HOW IT WORKS', title: 'Phase two: impact', body: '<code>impact.estimate</code> over the study area with explicit thresholds: RSRP at least −112 dBm and RSRQ at least −16 dB.' },
            deep: '<p>The scope is every queried, valid location where D0 was present: 252 locations. Missing (13) and unqueried (1,934) locations are excluded and reported as excluded. The rule: exclude D0, keep candidates above both thresholds, pick the strongest RSRP, break ties by cell id. This is a demonstration rule, not a calibrated handover model.</p>'
          },
          {
            say: 'The program computes the assignment. B1 takes one hundred thirty nine locations, B2 ninety five, B3 fourteen, and four locations have no eligible backup. The map colours each D0 location by its backup.',
            card: { tag: 'NUMBERS', title: 'Where the traffic goes', stat: { v: '139 · 95 · 14', l: 'locations to B1, B2, B3; 4 locations with no eligible backup, 3.29 Mbps unserved' } },
            deep: '<p>Location share and traffic share have different denominators and need not agree. B1: 55 percent of locations, 55 percent of traffic. B2: 38 and 38. B3: 6 and 6. Total D0 traffic in scope 243.9 Mbps, unserved 3.29 Mbps. Traffic is synthetic and non-uniform; it is not derived from land use.</p>'
          },
          {
            say: 'Load is estimated with a stated formula: baseline PRB plus one hundred times transferred traffic over capacity. B1 and B2 exceed one hundred percent and are flagged, not clamped.',
            card: { tag: 'NUMBERS', title: 'Two backups overload', stat: { v: '242 % · 185 %', l: 'estimated PRB for B1 and B2; B3 at 64 percent. Above 100 is flagged as potential overload' } },
            deep: '<p>B1: baseline 52 percent, capacity 70 Mbps, plus 133 Mbps transferred gives 242 percent. B2: 68 percent, 80 Mbps, plus 94 Mbps gives 185 percent. B3: 43 percent, 65 Mbps, plus 13 Mbps gives 64 percent. The formula uses PRB baseline and capacity only. Before writing the result into State the program recomputes it from the current evidence and rejects a stale estimate.</p>'
          },
          {
            say: 'The context gains an impact section with scope, exclusions, thresholds, the formula and one line per backup, followed by eight stated limitations. It is now about thirty five hundred tokens.',
            card: { tag: 'NUMBERS', title: 'Context after step 8', stat: { v: '3,498', u: 'tokens', l: 'the largest rendering of the run; 8 limitations are part of the text the model reads' } },
            deep: '<p>The limitations are in the model\'s input: scope is partial, D0 presence is a demand proxy, shares have different denominators, missing and unqueried demand is excluded not zero, the load model is a linear demonstration. Any later spatial observation would invalidate this impact and force a recomputation.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state, i = 8;
          clearPanels(ctx, S);
          setActive(S, 'decision');
          S.decision = D.decision(ctx, PX.decision[0], PX.decision[1], PX.decision[2], DEC[8], { title: 'action 8 · model output (illustrative)' });
          return ctx.reveal(S.decision.g, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            setActive(S, 'execute_query');
            var imp = CASE.states[i].impact;
            S.grid.setClasses(CASE.states[i].classes);
            S.grid.setAssignment(imp.assignment);
            S.grid.outline(null);
            S.backLegend = S.grid.legendRow(20, 874, true);
            S.obsPanel = D.kv(ctx, PX.obs[0], PX.obs[1], PX.obs[2], [
              ['scope', imp.scope_queried + ' queried · ' + imp.target_location_count + ' with D0'],
              ['excluded', imp.excluded_unqueried + ' unqueried, ' + imp.excluded_missing + ' missing'],
              ['assigned B1 / B2 / B3', '139 / 95 / 14 · 4 without backup'],
              ['D0 traffic / unserved (Mbps)', imp.total_target_traffic_mbps + ' / ' + imp.unserved_traffic_mbps]
            ], { title: 'impact.estimate(Study_area)', color: 'blue' });
            return ctx.reveal(S.obsPanel.g, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            setActive(S, 'update_state');
            var imp = CASE.states[i].impact;
            S.statePanel = D.kv(ctx, PX.state[0], PX.state[1], PX.state[2], imp.backup_loads.map(function (b) {
              return [b.cell_id + ': base ' + b.baseline_prb_percent + ' % +' + b.transferred_mbps + ' Mbps', 'PRB ' + b.estimated_prb_percent.toFixed(0) + ' %' + (b.exceeds_capacity ? ' · over' : '')];
            }).concat([['formula', 'base + 100 · transferred / capacity'], ['rendered context', tok(CASE.states[i].context_bytes)]]), { title: 'State state_08 · backup loads', color: 'teal' });
            return ctx.reveal(S.statePanel.g, { from: 'up' });
          }).then(function () { return ctx.beat(3); }).then(function () {
            setActive(S, 'render_context');
            var lines = CASE.states[i].context.split('\n');
            var k = 0; for (var j = 0; j < lines.length; j++) if (lines[j].indexOf('Impact and backup analysis:') === 0) { k = j; break; }
            S.ctxBlock = ctx.code({ x: PX.ctx[0], y: PX.ctx[1], w: PX.ctx[2], title: 'context state_08 · impact section', lang: 'text', size: 12, color: 'amber', maxLines: 4, lines: lines.slice(k, k + 4).map(function (l) { return l.trim(); }) });
            return ctx.reveal(S.ctxBlock, { from: 'up' });
          });
        }
      },
      {
        title: 'End of the run',
        beats: [
          {
            say: 'The script ends here, but the completion checks would not accept a stop. Three rural references have no coverage data, and the down cell is still present at ninety nine of the one hundred sixty eight boundary locations.',
            card: { tag: 'KEY IDEA', title: 'Script end is not completion', body: 'A run ends with a typed reason. This one would be <b>budget or script exhausted</b>, never <b>complete</b>, because the boundary still shows D0.' },
            deep: '<p>The four completion checks: the boundary buffer still shows the down cell (fails: 99 of 168); task-relevant regions queried or an explicit reason recorded (fails: F1, V1, F2 have 727 unqueried locations and no recorded reason); queried locations labelled (passes); backup analysis done for the relevant cells (passes for the queried scope). Thresholds are still to be set from reference results.</p>'
          },
          {
            say: 'Everything the run did is in the trace: eight steps, each with the State before, the context preview, the action and parameters, the observation file, the State after, the context after, and a map for people.',
            card: { tag: 'HOW IT WORKS', title: 'The trace is the product', body: '8 Steps, 9 State snapshots, 7 observations and 1 impact file, 9 rendered contexts. Offline evaluation reads this, not the UI.' },
            deep: '<p>Step records link files by path. Because every State is a complete snapshot, a Step already holds the before and after state of one decision. Adding the serialized State, the data version and the counters to the Step makes it a checkpoint from which a run can be resumed.</p>'
          },
          {
            say: 'Each ringed node in the graph opens its own chamber: the context builder, tool management, state and trace, validation and completion, the loop itself, and offline evaluation.',
            card: { tag: 'TRY IT', title: 'Zoom into a module', body: 'Click a ringed node in the graph, or press Z for the list. Each chamber explains one module with the numbers from this run.' },
            deep: '<p>The seven chambers follow the functional modules of the design. The decision core groups the model call, parsing, validation, the verifier and the completion checks, because together they turn a model output into either an executed action or feedback.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          clearPanels(ctx, S);
          setActive(S, 'decision');
          var sa = D.region(8, 'Study_area');
          S.decision = D.kv(ctx, PX.decision[0], PX.decision[1], PX.decision[2], [
            ['boundary still shows D0', sa.boundary_target + ' of ' + sa.boundary + ' → not accepted'],
            ['rural areas unqueried', 'F1, V1, F2: 727 → not accepted'],
            ['backup analysis in scope', 'done for 252 D0 locations'],
            ['end reason', 'script end']
          ], { title: 'completion checks on state_08', color: 'pink' });
          return ctx.reveal(S.decision.g, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            setActive(S, 'write_step');
            S.obsPanel = ctx.code({ x: 650, y: 620, w: 930, title: 'trace.json · 8 steps', lang: 'text', size: 10.5, color: 'lime', maxLines: 8, lines: CASE.steps.map(function (s) {
              return s.id + '  ' + s.action.tool + '  ' + s.action.reference_id + '  ' + s.state_before + ' → ' + s.state_after;
            }) });
            return ctx.reveal(S.obsPanel, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            setActive(S, null);
            return Promise.all([ctx.pulse(S.G.render_context, { color: 'amber', times: 2, dur: 800 }), ctx.pulse(S.G.execute_query, { color: 'blue', times: 2, dur: 800 }), ctx.pulse(S.G.loop_guards, { color: 'magenta', times: 2, dur: 800 })]);
          });
        }
      }
    ]
  });
})();
