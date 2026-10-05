/* L1 — Tool Registry. One table of actions; data access on the MCP server, judgment in the program;
 * from a validated decision to one Observation. */
(function () {
  var D = window.OutageDraw;

  Atlas.register({
    id: 'tools',
    refs: ['Model Context Protocol, <i>Architecture</i>, specification 2025'],
    poster: 1,
    steps: [
      {
        title: 'One table of actions',
        beats: [
          {
            say: 'Every action the system can run is one entry in one registry, keyed by name. Three parts of the program read it: the validator, the context builder and the executor.',
            card: { tag: 'KEY IDEA', title: 'One table, three readers', body: 'An action the model can see is an action the program can check and run.' },
            deep: '<p>The validator checks a decision against its entry. The context builder lists the entries the model may choose now. The executor runs the call described by the entry.</p>'
          },
          {
            say: 'Five actions. Two run once at initialization. Three are what the model may choose during the loop.',
            card: { tag: 'HOW IT WORKS', title: 'The actions', body: 'cell.lookup · osm.geometry · coverage.query · kpi.query · impact.estimate' },
            deep: '<p>Cost is in the budget\'s unit, grid locations, so the validator can refuse a query that exceeds the remaining budget before it runs.</p>'
          },
          {
            say: 'An entry holds the name, the parameters with their types and units, the phase in which the action may be used, its cost, the shape of its result, and where it runs.',
            card: { tag: 'HOW IT WORKS', title: 'One entry', body: 'name · parameters · phase · cost · result shape · where it runs' },
            deep: '<p>Nothing else is needed to validate a decision, render the action for the model, or execute it.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          S.reg = ctx.node({ x: 800, y: 170, w: 320, h: 56, title: 'tool registry', sub: 'one entry per action', color: 'blue', titleSize: 15, subSize: 11, glow: false });
          S.readers = [['validator', 380], ['context builder', 800], ['executor', 1220]].map(function (r) { return ctx.node({ x: r[1], y: 290, w: 240, h: 46, title: r[0], color: 'magenta', titleSize: 13.5, glow: false }); });
          S.links = S.readers.map(function (n) { return ctx.link(S.reg, n, { color: 'dim', sw: 1.2 }); });
          return ctx.reveal([S.reg].concat(S.readers, S.links), { from: 'fade' }).then(function () { return ctx.beat(1); }).then(function () {
            S.table = D.kv(ctx, 60, 380, 1000, [
              ['cell.lookup · initialization', 'cell id · MCP server'],
              ['osm.geometry · initialization', 'position, radius · MCP server'],
              ['coverage.query · coverage phase', 'areas, epoch · cost: locations · MCP server'],
              ['kpi.query · backup phase', 'cells, window, indicators · MCP server'],
              ['impact.estimate · backup phase', 'scope, thresholds · program']
            ], { title: 'the actions', color: 'blue' });
            return ctx.reveal(S.table.g, { from: 'up' });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.entry = D.kv(ctx, 1100, 380, 440, [['name', ''], ['parameters, types, units', ''], ['phase', ''], ['cost', ''], ['result shape', ''], ['where it runs', '']], { title: 'one entry holds', color: 'blue' });
            return ctx.reveal(S.entry.g, { from: 'up' });
          });
        }
      },
      {
        title: 'Where actions run',
        beats: [
          {
            say: 'The four data actions run on an MCP server inside the internal environment. The registry, the validator, result parsing, State and the impact estimate stay in the program.',
            card: { tag: 'KEY IDEA', title: 'Data on the server, judgment in the program', body: 'The server reads records and returns them. Everything that reads or writes State stays in the program.' },
            deep: '<p>The server holds no State, so it cannot know a precondition or a budget. Those rules live with the registry in the program. The data never leaves the environment; the model only sees what the program renders.</p>'
          },
          {
            say: 'One call goes out with the action name and its parameters. Records come back. The program turns them into an Observation.',
            card: { tag: 'HOW IT WORKS', title: 'Call and records', body: 'The loop is the MCP client. The server answers with rows in the shape of its data source.' },
            deep: '<p>The same server can be called by any other agent harness with the same tools, which is how the baseline comparison is run.</p>'
          },
          {
            say: 'At startup the program reads the server\'s tool list and adds what the server cannot know: phase, cost and result shape. From then on the registry is read-only for the run.',
            card: { tag: 'HOW IT WORKS', title: 'Registration', body: 'Server: name, description, parameters. Program: phase, cost, result shape. The two must match, or the program does not start.' },
            deep: '<p>A mismatch is an error at startup, never a default at run time.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ['reg', 'table', 'entry'].forEach(function (k) { if (S[k]) ctx.fade(S[k].g || S[k], 0, 250); });
          S.readers.forEach(function (n) { ctx.fade(n, 0, 250); }); S.links.forEach(function (l) { ctx.fade(l, 0, 250); });
          S.prog = ctx.group(); S.srv = ctx.group();
          ctx.rect(60, 150, 640, 360, { rx: 12, fill: 'rgba(5,10,22,0.6)', stroke: 'magenta', sw: 1.5, parent: S.prog });
          ctx.text(80, 178, 'the program · the loop · MCP client', { size: 15, weight: 700, color: 'magenta', parent: S.prog });
          [['tool registry', 220, 230], ['validator', 220, 290], ['parse results into Observations', 220, 350], ['State and Trace', 540, 230], ['impact.estimate', 540, 290]].forEach(function (n) {
            ctx.node({ x: n[1], y: n[2], w: 280, h: 44, title: n[0], color: n[0] === 'State and Trace' ? 'teal' : 'magenta', titleSize: 13, glow: false, parent: S.prog });
          });
          ctx.text(380, 470, 'everything that reads or writes State stays here', { size: 12.5, color: 'dim', anchor: 'middle', parent: S.prog });
          ctx.rect(900, 150, 640, 360, { rx: 12, fill: 'rgba(5,10,22,0.6)', stroke: 'blue', sw: 1.5, parent: S.srv });
          ctx.text(920, 178, 'MCP server · inside the internal environment', { size: 15, weight: 700, color: 'blue', parent: S.srv });
          ['cell.lookup', 'osm.geometry', 'coverage.query', 'kpi.query'].forEach(function (n, i) { ctx.node({ x: 1040, y: 230 + i * 60, w: 220, h: 44, title: n, color: 'blue', titleSize: 13, glow: false, parent: S.srv }); });
          ctx.node({ x: 1380, y: 290, w: 240, h: 100, title: 'records', sub: 'cell · coverage · KPI · OSM', color: 'teal', kind: 'cyl', titleSize: 13, subSize: 11, glow: false, parent: S.srv });
          ctx.text(1220, 470, 'reads data · holds no State · data never leaves', { size: 12.5, color: 'dim', anchor: 'middle', parent: S.srv });
          return ctx.reveal([S.prog, S.srv], { from: 'fade' }).then(function () { return ctx.beat(1); }).then(function () {
            S.call = ctx.link({ x: 700, y: 280 }, { x: 900, y: 280 }, { color: 'white', sw: 1.4, label: 'call: action, parameters', labelDy: -10 });
            S.back = ctx.link({ x: 900, y: 360 }, { x: 700, y: 360 }, { color: 'teal', sw: 1.4, label: 'records', labelDy: 18 });
            return ctx.reveal([S.call, S.back], { from: 'draw' }).then(function () { return ctx.packet(S.call, { color: 'white', dur: 900 }); }).then(function () { return ctx.packet(S.back, { color: 'teal', dur: 900 }); });
          }).then(function () { return ctx.beat(2); }).then(function () {
            S.startup = D.kv(ctx, 60, 560, 1480, [['at startup', 'the program reads the server\'s tool list and adds phase, cost and result shape'], ['mismatch', 'the program does not start']], { title: 'registration', color: 'blue' });
            return ctx.reveal(S.startup.g, { from: 'up' });
          });
        }
      },
      {
        title: 'From decision to Observation',
        beats: [
          {
            say: 'A validated decision is executed, its result is parsed into one Observation, and State is updated. The registry feeds the first two stages.',
            card: { tag: 'HOW IT WORKS', title: 'Four stages', body: 'validate · execute · parse the result · update State. A rejected decision never reaches execute; its reason goes back to the model.' },
            deep: '<p>Execute may query several areas in one call when the decision names a set, and every call has a timeout.</p>'
          },
          {
            say: 'Every call ends in one Observation of the same shape, whatever the action: a status for the whole result, and a row per location that is either valid or missing.',
            card: { tag: 'KEY IDEA', title: 'Every call ends in an Observation', body: 'Even a timeout or an empty answer. The next decision always has a result to read, and State records which call produced each fact.' },
            deep: '<p>The raw records stay on disk; State keeps the link. The program parses rows into the fixed shape once, here. A valid row with an empty cell list means no coverage; an absent row means missing data, and the two stay apart.</p>'
          }
        ],
        run: function (ctx) {
          var S = ctx.state;
          ['prog', 'srv', 'call', 'back'].forEach(function (k) { if (S[k]) ctx.fade(S[k], 0, 250); });
          if (S.startup) ctx.fade(S.startup.g, 0, 250);
          S.reg2 = ctx.node({ x: 800, y: 160, w: 320, h: 48, title: 'tool registry', color: 'blue', titleSize: 14, glow: false });
          S.stages = [['validate', 'decision against its entry', 'magenta'], ['execute', 'areas at once · timeout', 'blue'], ['parse the result', 'rows → one Observation', 'magenta'], ['update State', 'facts with their source', 'teal']].map(function (n, i) {
            return ctx.node({ x: 230 + i * 380, y: 290, w: 300, h: 60, title: n[0], sub: n[1], color: n[2], titleSize: 14, subSize: 11.5, glow: false });
          });
          S.slinks = [0, 1, 2].map(function (i) { return ctx.link(S.stages[i], S.stages[i + 1], { color: 'dim', sw: 1.3 }); });
          S.feed = [0, 1].map(function (i) { return ctx.link(S.reg2, S.stages[i], { color: 'blue', sw: 1.1, dash: '4 3' }); });
          return ctx.reveal([S.reg2].concat(S.stages, S.slinks, S.feed), { from: 'fade' }).then(function () { return ctx.beat(1); }).then(function () {
            S.obs = D.kv(ctx, 420, 400, 760, [['which action, which parameters, when', ''], ['status of the whole result', 'ok · empty · missing · error · timeout'], ['one row per location', 'valid, or missing'], ['raw records', 'kept on disk; State keeps the link']], { title: 'one Observation, the same shape for every action', color: 'teal' });
            return ctx.reveal(S.obs.g, { from: 'up' });
          });
        }
      }
    ]
  });
})();
