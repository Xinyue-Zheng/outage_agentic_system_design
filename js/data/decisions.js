/* Hand-written decision texts for the recorded case. The actions are the recorded ones (see case.js);
 * these three-part decisions illustrate what the model would propose at each step. Index = step number. */
window.OUTAGE_DECISIONS = {
  1: { action: 'coverage.query', parameters: 'reference = S1', gap: 'Which locations in S1, the settlement nearest D0, had D0 coverage before the outage, and how strong was it?' },
  2: { action: 'coverage.query', parameters: 'reference = H1_buffer', gap: 'H1 crosses S1 and S3. Does D0 coverage extend along the H1 corridor beyond S1?' },
  3: { action: 'coverage.query', parameters: 'reference = H2_buffer', gap: 'H2 crosses S1 and S2. Does D0 coverage extend along the H2 corridor toward S2?' },
  4: { action: 'coverage.query', parameters: 'reference = S2_roadside', gap: 'The H2 corridor shows D0 at its northern edge next to S2. Is D0 present in the five roadside rows of S2?' },
  5: { action: 'coverage.query', parameters: 'reference = S2_remaining', gap: 'D0 is present at 4 of the 8 frontier locations facing the S2 interior. Does D0 coverage reach the interior of S2?' },
  6: { action: 'coverage.query', parameters: 'reference = S3', gap: 'The H1 corridor has valid data up to S3. Is any location in S3 covered by D0?' },
  7: { action: 'coverage.query', parameters: 'reference = S2_roadside', gap: 'Confirm the S2 roadside result before the backup analysis.' },
  8: { action: 'impact.estimate', parameters: 'scope = Study_area; RSRP >= -112 dBm; RSRQ >= -16 dB', gap: 'For every queried location where D0 was present, which backup cell takes its traffic, and what load results?' }
};
