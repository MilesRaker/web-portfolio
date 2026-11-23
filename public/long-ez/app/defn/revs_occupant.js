// Occupant accommodation (Miles's decision 2026-11-20; coordinator 2026-11-20: checks first, airframe unchanged): the hand reach,
// leg reach, leg clearance and head clearance checks (wpB5_occupant.js, ANSUR II data in wpB5_ansur.js) put on the records of the
// controls, the pedals and the seats as rules, each with its real margin, and an open item on each record until Miles decides
// the cockpit layout (docs/blocks/occupant.md). Applied once to the merged DEFS (release.js), after every other rev source.
// Notional; not for construction.
import { reachRule, legReachRule, legClearRules, headRule, setToeStop, OCC_OPEN, OCC_REQ } from '../parts/wpB5_occupant.js';
import { ANSUR_SRC } from '../parts/wpB5_ansur.js';
import { TOE_STOP } from './c27_pedals.js';
setToeStop(() => TOE_STOP.deg);
const DATE = '2026-11-20';
const next = (r) => String.fromCharCode((r || 'A').charCodeAt(0) + 1);
const OPEN = (r) => ({ ...r, label: `OPEN (cockpit geometry): ${r.label}` });
/** pn → [rules (functions, evaluated at apply), what the rev says] */
const R = (...ids) => () => ids.map(reachRule);
export const OCC_RECS = {
  'LEZ-27-110': [R('stick'), 'the front stick grip through full pitch × roll travel'],
  'LEZ-27-111': [R('rearStick'), 'the rear stick grip through full travel, for the rear occupant'],
  'LEZ-76-100': [R('throttle', 'mixture', 'carbHeat'), 'the throttle and mixture knobs through the full sweep and the carb-heat knob pushed and pulled'],
  'LEZ-28-135': [R('fuelSel'), 'the fuel selector knob, now per occupant (the existing 5th-female check stays)'],
  'LEZ-27-165': [R('trim'), 'the pitch trim knob over the friction guide'],
  'LEZ-52-110': [R('latch'), 'the canopy latch handle from inside, locked and open'],
  'LEZ-31-140': [R('master', 'lbSwitch'), 'the MASTER toggle and the landing-brake switch (fingertip reach)'],
  'LEZ-74-100': [R('key'), 'the ignition / magneto / start key switch (fingertip reach)'],
  'LEZ-27-150': [() => [legReachRule(), ...legClearRules()], 'leg reach to the toe plates through full rudder travel with the toe brakes at their stop, and the 95th-percentile male\'s knee and shin clearance to the panel, the instrument backs, the stick and the consoles with the pedals at full travel'],
  'LEZ-25-120': [() => [headRule('front')], 'head clearance under the canopy, front seat'],
  'LEZ-25-121': [() => [headRule('rear')], 'head clearance under the canopy, rear seat'],
};
export function applyOccupant(DEFS) {
  for (const [pn, [rules, what]] of Object.entries(OCC_RECS)) {
    const d = DEFS[pn]?.def; if (!d) throw new Error(`occupant checks: no record ${pn}`);
    if ((d.revs || []).some((r) => r.phase === 'occ')) continue;
    const rs = rules().map(OPEN);
    d.rules = [...(d.rules || []).filter((r) => !r.occ), ...rs];
    d.interfaces = [...(d.interfaces || []), { id: 'O-OCC', with: 'Miles (open decision, 2026-11-20): cockpit geometry', feature: d.features?.[0]?.id || 'part', what: 'OPEN: occupant accommodation (ANSUR II 5th-percentile female to 95th-percentile male)', open: true,
      check: () => ({ ok: true, detail: `${OCC_OPEN} Checks on this record: ${rs.map((r) => `${r.id} ${r.v.toFixed(2)} (min ${r.min})`).join('; ')}. Data: ${ANSUR_SRC}. ${OCC_REQ.src}.` }) }];
    const rev = next([d.rev, ...(d.revs || []).map((r) => r.rev)].filter(Boolean).sort().at(-1));
    d.revs = [...(d.revs || []), { rev, date: DATE, short: 'Occupant reach and clearance checks (open)', change: `New occupant checks (Miles, 2026-11-20): ${what}, for the ANSUR II 5th-percentile female, 50th-percentile male and 95th-percentile male (${ANSUR_SRC}; model and derivations in wpB5_occupant.js / wpB5_ansur.js). The airframe is unchanged: the checks carry their real margins and stay open with the cockpit geometry (O-OCC; docs/blocks/occupant.md).`, phase: 'occ' }];
    d.rev = rev;
  }
  return DEFS;
}
