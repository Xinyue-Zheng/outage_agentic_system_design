/* L1 — Initialization. The fixed program phase before the loop: two lookups, the areas derived from them,
 * the initial State and the first rendering. */
(function () {
  var D = window.OutageDraw;
  var CASE = window.OUTAGE_CASE;
  var GRID = { x: 880, y: 150, w: 660, h: 440 };

  Atlas.register({
    id: 'init',
    refs: ['Hamadanian et al., <i>A Holistic View of AI-driven Network Incident Management</i>, HotNets 2023'],
    poster: 2,
    setup: function (ctx) {
      var S = ctx.state;
      S.grid = D.grid(ctx, GRID);
      S.grid.setClasses(CASE.states[0].classes);
      S.grid.showCells(false);
      S.grid.g.setAttribute('opacity', 0.15);
    },
    steps: [
      {
        title: 'Task in',
        beats: [
          {
            say: 'The input is one down cell and one outage time. The program begins; the model is not called yet.',
            card: { tag: 'KEY IDEA', title: 'Two inputs', body: 'Cell <code>D0</code> and the outage time. The outage time fixes the coverage epoch: every later query asks for coverage before the outage.' },
            deep: '<p>The task holds the cell id, the outage time and the objective. Coverage data is only meaningful before the outage, so the epoch is set once here and carried on every coverage query.</p>'
          },
          {
            say: 'The first lookup takes the cell id and returns the site position and the cell metadata. Other cells are not part of the answer.',
            card: { tag: 'HOW IT WORKS', title: 'First lookup: the cell', body: '<code>cell.lookup</code> on the MCP server. In: cell id. Out: site position, cell metadata.' },
            deep: '<p>Other cells become known only later, when coverage records list them at the same locations. Nothing here guesses a backup.</p>'
          },
          {
            say: 'The second lookup takes the site position and returns the map around it over a wider area: settlements, land use and roads.',
            card: { tag: 'HOW IT WORKS', title: 'Second lookup: the map', body: '<code>osm.geometry</code> on the MCP server. In: position and radius. Out: settlement and land-use polygons, road centerlines.' },
            deep: '<p>Knowing a polygon does not mean knowing the coverage inside it. Land-use labels name mapped types only; they are not population or demand.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          S.task = ctx.code({ x: 60, y: 150, w: 760, title: 'task', lang: 'text', size: 13, color: 'cyan', lines: ['down_cell_id: ' + CASE.task.down_cell_id, 'outage_time:  ' + CASE.task.outage_time, 'epoch:        pre_outage'] });
          return ctx.reveal(S.task, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.l1 = D.kv(ctx, 60, 300, 760, [['tool', 'cell.lookup · MCP server'], ['in', 'cell id D0'], ['out', 'site position, cell metadata']], { title: 'first lookup', color: 'blue' });
            S.grid.g.setAttribute('opacity', 0.5);
            return ctx.reveal(S.l1.g, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.l2 = D.kv(ctx, 60, 460, 760, [['tool', 'osm.geometry · MCP server'], ['in', 'site position, radius'], ['out', 'settlements, land use, roads']], { title: 'second lookup', color: 'blue' });
            S.grid.g.setAttribute('opacity', 1);
            return Promise.all([ctx.reveal(S.l2.g, { from: 'up' }), ctx.pulse(S.grid.g, { color: 'cyan', times: 1, dur: 800 })]);
          });
        }
      },
      {
        title: 'Areas around the cell',
        beats: [
          {
            say: 'From the map the program builds the areas a query can name: the settlements as polygons, the roads as corridors of a declared width, and sub-areas of a settlement.',
            card: { tag: 'HOW IT WORKS', title: 'Named areas', body: 'Settlements S1, S2, S3; corridors H1 (300 m) and H2 (500 m); S2 roadside and S2 interior. A query names an area, never coordinates.' },
            deep: '<p>Each area resolves to an exact set of grid locations. The model later chooses an area by name; the program resolves it.</p>'
          },
          {
            say: 'The program also records how the areas relate: which road crosses which settlement, with the geometry that proves it.',
            card: { tag: 'HOW IT WORKS', title: 'Relations', body: 'H1 crosses S1 and S3. H2 crosses S1 and S2. Each relation keeps its geometric evidence.' },
            deep: '<p>Relations let the model reason about where coverage may continue, for example along a road into the next settlement, without reading coordinates.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ['task', 'l1', 'l2'].forEach(function (k) { if (S[k]) ctx.fade(S[k].g || S[k], 0, 250); });
          var refs = CASE.references.filter(function (r) { return r.id !== 'Study_area'; });
          S.areas = D.kv(ctx, 60, 150, 760, refs.slice(0, 7).map(function (r) { return [r.id, r.grid_count + ' locations']; }), { title: 'areas a query can name', color: 'cyan' });
          S.frames = refs.slice(0, 7).map(function (r) { return S.grid.frame(r.grid_ids, 'cyan'); }).filter(Boolean);
          return ctx.reveal([S.areas.g].concat(S.frames), { from: 'fade' }).then(function () { return ctx.beat(1); }).then(function () {
            var rel = CASE.relations.filter(function (r) { return r.predicate === 'intersects'; }).slice(0, 4);
            S.rel = D.kv(ctx, 60, 470, 760, rel.map(function (r) { return [r.subject_id + ' ' + r.predicate + ' ' + r.object_id, 'from geometry']; }), { title: 'relations', color: 'cyan' });
            return ctx.reveal(S.rel.g, { from: 'up' });
          });
        }
      },
      {
        title: 'Initial State',
        beats: [
          {
            say: 'The initial State holds the task, the areas and the relations. Every one of the two thousand four hundred locations is unknown.',
            card: { tag: 'NUMBERS', title: 'State zero', stat: { v: '0 / 2,400', l: 'locations queried' } },
            deep: '<p>State is written by the program from the two lookups. No coverage fact exists yet.</p>'
          },
          {
            say: 'State also lists what is unknown: for every area, its coverage. The model will read this list.',
            card: { tag: 'KEY IDEA', title: 'Unknowns are facts too', body: 'Unqueried is a status, not an absence. Each area starts with all of its locations unknown.' },
            deep: '<p>The distinction between unqueried and missing data starts here and is kept for the whole run.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ['areas', 'rel'].forEach(function (k) { if (S[k]) ctx.fade(S[k].g, 0, 250); });
          S.frames.forEach(function (f) { ctx.fade(f, 0, 250); });
          S.s0 = D.kv(ctx, 60, 150, 760, [['task', 'D0, outage time, epoch'], ['areas', '11, each with its grid locations'], ['relations', CASE.relations.length], ['coverage known', '0 of 2,400 locations']], { title: 'State 0', color: 'teal' });
          return ctx.reveal(S.s0.g, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.unk = D.kv(ctx, 60, 340, 760, CASE.states[0].unknowns.slice(0, 4).map(function (u) { return [u.split(':')[0], 'unknown']; }), { title: 'unknowns, first lines', color: 'amber' });
            return ctx.reveal(S.unk.g, { from: 'up' });
          });
        }
      },
      {
        title: 'Hand-off to the loop',
        beats: [
          {
            say: 'The program renders State into text for the first time. This text, not the lookups, is what the model will read.',
            card: { tag: 'HOW IT WORKS', title: 'First rendering', body: 'Task, areas, relations, progress per area, unknowns. Built by a template from State.' },
            deep: '<p>The Context Builder chamber explains the sections. Every later round renders again from the current State.</p>'
          },
          {
            say: 'Here fixed program logic ends. From the next round on, the model chooses which area to query, how wide, and when to move to backup cells.',
            card: { tag: 'KEY IDEA', title: 'The boundary of fixed logic', body: 'Fixed: the two lookups, the areas, State 0, the rendering. The model\'s: every query after that, within the registry.' },
            deep: '<p>The action set, the validation rules, the completion checks and the caps are fixed too; they frame the model\'s choices without making them.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ['s0', 'unk'].forEach(function (k) { if (S[k]) ctx.fade(S[k].g, 0, 250); });
          var lines = CASE.states[0].context.split('\n').slice(0, 4).map(function (l) { return l.length > 70 ? l.slice(0, 67) + '…' : l; });
          S.first = ctx.code({ x: 60, y: 150, w: 760, title: 'first rendering · opening lines', lang: 'text', size: 12.5, color: 'amber', lines: lines });
          return ctx.reveal(S.first, { from: 'up' }).then(function () { return ctx.beat(1); }).then(function () {
            S.bound = D.kv(ctx, 60, 330, 760, [['fixed, before the loop', 'lookups · areas · State 0 · rendering'], ['fixed, inside the loop', 'action set · validation · completion checks · caps'], ['the model\'s', 'which area, how wide, when to move to backup cells']], { title: 'where fixed logic ends', color: 'pink' });
            return ctx.reveal(S.bound.g, { from: 'up' });
          });
        }
      }
    ]
  });
})();
