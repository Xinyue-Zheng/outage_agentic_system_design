/* L1 — Initialization. The fixed program phase before the first model call: what is looked up, what is
 * derived, and what the initial State and the first rendering contain. */
(function () {
  var D = window.OutageDraw;
  var CASE = window.OUTAGE_CASE;

  Atlas.register({
    id: 'init',
    refs: [
      'Hamadanian et al., <i>A Holistic View of AI-driven Network Incident Management</i>, HotNets 2023',
      'OpenAI, <i>Unrolling the Codex agent loop</i>, 2026'
    ],
    poster: 2,
    setup: function (ctx) {
      var S = ctx.state;
      S.grid = D.grid(ctx, { x: 820, y: 170, w: 720, h: 480 });
      S.grid.setClasses(CASE.states[0].classes);
      S.grid.showCells(false);
      S.grid.legendRow(820, 690, false);
      S.gridG = S.grid.g;
      S.gridG.setAttribute('opacity', 0.15);
    },
    steps: [
      {
        title: 'Task in',
        beats: [
          {
            say: 'Initialization is program code. It runs once, before the model is called, and it only uses facts the program can look up without any judgment.',
            card: { tag: 'KEY IDEA', title: 'Fixed logic before the loop', body: 'Two inputs, a down cell id and an outage time. Everything in this chamber is deterministic; the model has no part in it.' },
            deep: '<p>The boundary between fixed logic and the model-driven loop is set here. Initialization covers what every investigation needs regardless of the case: the cell, its site, the geography around it, and the references the model may later name. Where to query first is already the model\'s decision.</p>'
          },
          {
            say: 'The first lookup is the cell itself. Cell lookup returns the site position and the cell metadata the program needs to place the investigation on the map.',
            card: { tag: 'HOW IT WORKS', title: 'cell.lookup', body: 'Input: the cell id. Output: site coordinates and cell metadata. It is a data-access tool, so it runs on the MCP server inside the internal environment.' },
            deep: '<p><code>cell.lookup</code> is the first entry of the tool registry used in a run. Its result is written into State as the task object together with the outage time. Other cells of the network are <b>not</b> listed here: they become known only when coverage records mention them at a location.</p>'
          },
          {
            say: 'The outage time fixes the evidence epoch. Coverage data is read as pre-outage evidence, and the time windows for later KPI queries are derived from the same instant.',
            card: { tag: 'HOW IT WORKS', title: 'One time, two uses', body: 'Coverage before the outage says where D0 was present. KPI windows before and after the outage, derived from the same time, measure what changed.' },
            deep: '<p>The task record carries <code>outage_time</code>. Every coverage query is tagged with the epoch <code>pre_outage</code>, and the validator rejects any other value. The KPI windows are proposed for the backup phase: a baseline window before the outage and an impact window after it.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          S.task = ctx.code({ x: 80, y: 180, w: 620, title: 'task', lang: 'text', size: 11.5, color: 'cyan', lines: [
            'down_cell_id: ' + CASE.task.down_cell_id,
            'outage_time:  ' + CASE.task.outage_time,
            'objective:    investigate the outage impact of ' + CASE.task.down_cell_id
          ] });
          return ctx.reveal(S.task, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.lookup = D.kv(ctx, 80, 330, 620, [['tool', 'cell.lookup (MCP server)'], ['input', 'cell id D0'], ['returns', 'site position, cell metadata'], ['other cells', 'not part of the result']], { title: 'first lookup', color: 'blue' });
            return Promise.all([ctx.reveal(S.lookup.g, { from: 'up' }), ctx.fade(S.gridG, 0.5, 500)]);
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.epoch = D.kv(ctx, 80, 480, 620, [['coverage epoch', 'pre_outage (validator rejects any other)'], ['KPI baseline window', 'before the outage (proposed)'], ['KPI impact window', 'after the outage (proposed)']], { title: 'time', color: 'cyan' });
            return ctx.reveal(S.epoch.g, { from: 'up' });
          });
        }
      },
      {
        title: 'Geometry around the cell',
        beats: [
          {
            say: 'The second lookup fetches the map around the site: settlements, roads and land use as geometry. In the real system this is OpenStreetMap; here it is synthetic.',
            card: { tag: 'HOW IT WORKS', title: 'osm.geometry', body: 'Polygons for settlements and land use, centerlines for roads, within a study window around the site. Public data, so no confidentiality constraint.' },
            deep: '<p>The study window is a program choice per case class, not a constant. The synthetic case uses 6 km by 4 km on a 100 m grid. The manual trace used a far larger window; that choice was case-specific and is not a rule.</p>'
          },
          {
            say: 'From the geometry the program builds references: named query scopes the model may use. A settlement is a polygon. A road is a centerline, so its reference is a corridor with a declared width.',
            card: { tag: 'KEY IDEA', title: 'References, not coordinates', body: 'The model will name scopes such as <code>S2</code> or <code>H1_buffer</code>. It never writes coordinates. Each reference resolves to an exact set of grid locations.' },
            deep: '<p>Eleven references in the synthetic case: the study area, three settlements, two road corridors (H1 full width 300 m, H2 full width 500 m, round end caps), three land-use areas and two sub-areas of S2. A reference is the unit of a coverage query, and the validator only accepts reference ids that exist in State.</p>'
          },
          {
            say: 'Spatial relations are computed once: which road crosses which settlement, and what the study area contains. Each relation keeps its geometric evidence.',
            card: { tag: 'HOW IT WORKS', title: 'Relations with evidence', body: 'Highway H1 intersects S1 and S3; H2 intersects S1 and S2. Computed from segment intersection, recorded with the evidence, rendered as text later.' },
            deep: '<p>Relations let the model reason about corridors without reading geometry. They are facts about the map, not about coverage: a settlement crossed by a road may still have no data at all. The rendering says so explicitly.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ['task', 'lookup', 'epoch'].forEach(function (k) { if (S[k]) ctx.fade(S[k].g || S[k], 0.25, 300); });
          return ctx.fade(S.gridG, 1, 600).then(function () { return ctx.pulse(S.gridG, { color: 'cyan', times: 1, dur: 800 }); }).then(function () { return ctx.beat(1); }).then(function () {
            var refs = CASE.references.filter(function (r) { return r.id !== 'Study_area'; });
            S.refs = D.kv(ctx, 80, 560, 620, refs.map(function (r) { return [r.id + (r.buffer_width_m ? ' (corridor, ' + r.buffer_width_m + ' m)' : ''), r.grid_count + ' locations']; }), { title: 'references built from geometry', color: 'cyan', lh: 19, size: 11 });
            return ctx.reveal(S.refs.g, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            var rel = CASE.relations.filter(function (r) { return r.predicate === 'intersects'; });
            S.rel = D.kv(ctx, 80, 180, 620, rel.map(function (r) { return [r.subject_id + ' ' + r.predicate + ' ' + r.object_id, 'segment intersection']; }), { title: 'spatial relations', color: 'cyan', lh: 19, size: 11 });
            return ctx.reveal(S.rel.g, { from: 'up' });
          });
        }
      },
      {
        title: 'Initial State',
        beats: [
          {
            say: 'The initial State holds the task, the geometry, the references and the relations. Coverage is unknown everywhere. Every grid location starts in the unknown class.',
            card: { tag: 'NUMBERS', title: 'State zero', stat: { v: '0 / 2,400', l: 'grid locations queried; every reference has an empty queried set' } },
            deep: '<p>State is an immutable snapshot. Region summaries exist for every reference from the start, with empty queried, valid, missing and target sets, so the rendering can list progress per reference before any query has run.</p>'
          },
          {
            say: 'The State also lists what is not known: one unknown per reference, plus general caveats such as that no stopping rule has been applied yet.',
            card: { tag: 'HOW IT WORKS', title: 'Unknowns are facts too', body: 'Fifteen unknowns at the start. The list shrinks as queries return and grows when results are missing. The model reads it every step.' },
            deep: '<p>Listing unknowns explicitly is how the program later detects a conclusion drawn from missing data, and how a completion check can ask whether a task-relevant region was queried or an explicit reason was recorded.</p>'
          },
          {
            say: 'Nothing from the hidden data enters State. The update function only ever receives executed query results, so the initial State cannot contain coverage the investigation has not asked for.',
            card: { tag: 'PITFALL', title: 'No leakage from the dataset', body: 'The synthetic generator knows every record. The State builder does not: it reads only the task, the geometry and executed observations.' },
            deep: '<p>A unit test in the prototype checks that unqueried coverage never leaks into State. The same rule applies to the real system: the program that updates State must not have a path to the raw data except through executed, recorded queries.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ['refs', 'rel'].forEach(function (k) { if (S[k]) ctx.fade(S[k].g, 0.25, 300); });
          var sa = D.region(0, 'Study_area');
          S.st = D.kv(ctx, 80, 180, 620, [['queried', sa.queried + ' of ' + sa.total], ['references with summaries', CASE.references.length], ['relations', CASE.relations.length], ['coverage class everywhere', 'unknown']], { title: 'state_00', color: 'teal' });
          return ctx.reveal(S.st.g, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.unk = ctx.code({ x: 80, y: 330, w: 620, title: 'unknowns (' + CASE.states[0].unknowns.length + ')', lang: 'text', size: 10.5, color: 'teal', maxLines: 6, lines: CASE.states[0].unknowns.slice(0, 6) });
            return ctx.reveal(S.unk, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.leak = D.kv(ctx, 80, 560, 620, [['State builder reads', 'task · geometry · executed observations'], ['State builder cannot read', 'the dataset, unqueried records'], ['checked by', 'a unit test in the prototype']], { title: 'no leakage', color: 'red' });
            return ctx.reveal(S.leak.g, { from: 'up' });
          });
        }
      },
      {
        title: 'Hand-off to the loop',
        beats: [
          {
            say: 'The last act of initialization is the first rendering. The State becomes text, and that text, behind the fixed investigation skill, is the first model input.',
            card: { tag: 'HOW IT WORKS', title: 'From State to the first context', body: 'Task, geography, relations, progress per reference, unknowns and available actions. The model has everything it needs to choose a first query.' },
            deep: '<p>The Context Builder chamber explains the rendering. At this point the variable part of the context is almost empty: every progress line says zero queried, and the unknowns list is at its longest.</p>'
          },
          {
            say: 'From here the model decides. Which reference to query first, whether to take a whole settlement or part of it, when to move to backup cells. The program validates and executes, but it does not choose.',
            card: { tag: 'KEY IDEA', title: 'Where fixed logic ends', body: 'Initialization never chooses a query. The first decision belongs to the model. In the recorded case it is the settlement nearest the cell.' },
            deep: '<p>Two things remain fixed inside the loop: the set of actions the model may propose, and the completion checks that accept a stop. Everything else about the order of the investigation is the model\'s, within the budget caps.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ['st', 'unk', 'leak'].forEach(function (k) { if (S[k]) ctx.fade(S[k].g || S[k], 0.25, 300); });
          S.ctx0 = ctx.code({ x: 80, y: 180, w: 620, title: 'first rendering · opening lines', lang: 'text', size: 10.5, color: 'amber', maxLines: 8, lines: CASE.states[0].context.split('\n').slice(0, 8) });
          return ctx.reveal(S.ctx0, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.fixed = D.kv(ctx, 80, 440, 620, [['fixed, in program', 'cell lookup · geometry · references · initial State · rendering'], ['fixed, in the loop', 'action set · validation · completion checks · caps'], ['the model\'s', 'which reference, which scope, when to move to backup cells']], { title: 'the boundary', color: 'magenta', lh: 24 });
            return ctx.reveal(S.fixed.g, { from: 'up' });
          });
        }
      }
    ]
  });
})();
