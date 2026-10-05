/* Glossary for hover definitions in the deep-dive panel.
 * Entry: { t: display term, re: optional regex source (matched case-insensitively with word boundaries by the engine),
 *          d: definition (plain text, <= 32 words), s: id of the chamber that explains it best (optional) } */
window.ATLAS_GLOSSARY = [
  { t: 'State', re: 'structured State|State snapshot', d: 'The structured record of every fact the investigation has established so far, with the observation that produced each fact. The program updates it; the model never touches it.', s: 'state' },
  { t: 'Observation', re: 'Observations?', d: 'The normalized result of one executed action: requested scope, parameters, returned records and a status of ok, empty, missing data, error or timeout.', s: 'observation' },
  { t: 'Step', re: 'Steps?\\b', d: 'One executed decision: the State before, the model input and output, the action, the Observation, and the State after. Steps in order form the Trace.', s: 'state' },
  { t: 'Trace', re: 'Trace', d: 'The ordered list of Steps of one run. It is the input of offline evaluation and the candidate recovery mechanism.', s: 'state' },
  { t: 'rendered context', re: 'rendered context|render_context', d: 'The text the model receives each step, produced by a program template from State. It replaces the append-only transcript of general coding agents.', s: 'context' },
  { t: 'information gap', re: 'information gaps?', d: 'The third part of a decision: what the proposed action is meant to find out. The program can check it against State.', s: 'case' },
  { t: 'completion checks', re: 'completion checks?', d: 'Program rules that decide whether a stop proposed by the model is accepted: frontier, key regions, labels, backup analysis. Thresholds are still open.', s: 'decision' },
  { t: 'frontier', re: 'frontier|interior boundary', d: 'Queried grid locations that have an unqueried orthogonal neighbour inside the same reference. Selected by adjacency only, never by signal.', s: 'state' },
  { t: 'reference', re: 'geographic references?|reference id', d: 'A named, resolvable query scope such as S2_roadside or H2_buffer: a geometry and the exact set of grid ids it covers.', s: 'tools' },
  { t: 'RSRP', re: 'RSRP', d: 'Reference signal received power, in dBm. Higher is stronger. In the synthetic data a down-cell RSRP range is reported per region.', s: 'observation' },
  { t: 'RSRQ', re: 'RSRQ', d: 'Reference signal received quality, in dB. Used with RSRP as the eligibility threshold for a backup cell in the synthetic impact rule.', s: 'observation' },
  { t: 'PRB', re: 'PRB', d: 'Physical resource block utilization, in percent. The synthetic load rule adds transferred traffic over capacity to a baseline PRB.', s: 'case' },
  { t: 'backup cell', re: 'backup cells?', d: 'A cell that still covers a location after the down cell fails and meets the eligibility thresholds. The strongest eligible one is chosen.', s: 'case' },
  { t: 'typed end reason', re: 'typed end reasons?|typed reason', d: 'The program names why a run ended: complete, step cap, query budget, time cap, retry cap, rejection cap, repeated query. Never a crash.', s: 'decision' },
  { t: 'tool registry', re: 'tool registry|action registry|registry entry', d: 'The declared set of actions the model may propose, each with parameter types, units, allowed values, preconditions, phase and a cost estimate.', s: 'tools' },
  { t: 'set-valued parameter', re: 'set-valued parameters?', d: 'A parameter that takes several values at once, such as regions {S2, S3}. One decision, executed concurrently inside the tool, one Observation with a status per member.', s: 'tools' },
  { t: 'provenance', re: 'provenance', d: 'For every fact in State, the observation that produced it. Lets the program check that a conclusion cites only facts that exist.', s: 'state' },
  { t: 'stable prefix', re: 'stable prefix', d: 'The part of the rendered context that does not change between steps: skill, task, geography, relations and action schemas. It can be cached by the model provider.', s: 'context' },
  { t: 'append-only transcript', re: 'append-only transcript|append-only history', d: 'How Codex CLI and Gemini CLI feed the model: every tool output is appended and resent each call, compacted by the model when the window fills.', s: 'context' },
  { t: 'baseline', re: 'baseline', d: 'Codex CLI with the same query functions exposed through an MCP server and the skill as AGENTS.md, run on the same cases. The measurement that answers "why not just use Codex".', s: 'offline' }
];
