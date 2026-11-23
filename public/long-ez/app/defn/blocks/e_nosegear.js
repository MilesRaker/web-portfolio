// Block e_nosegear: definition records and drawing views for this block's parts. Owned by the block's agent.
// DEFS entries have the same shape as site/defn/release.js; VIEWS entries the same signature as site/defn/sheet.js (k, D).
import { entry, view } from '../e_rec.js';
import { srcAudit } from '../src_audit.js';
import { NGS } from '../e_strut.js';
import { NG30 } from '../e_ng30.js';
import { HNG } from '../e_hinge.js';
import { NG6D } from '../e_ng6.js';
import { NG34 } from '../e_ng34.js';
import { CVR } from '../e_cover.js';
import { FRK } from '../e_fork.js';
import { WHL } from '../e_wheel.js';
import { GBX } from '../e_gearbox.js';
import { WRM } from '../e_worm.js';
import { CRS } from '../e_cross.js';
import { LNK } from '../e_link.js';
import { CRK } from '../e_crank.js';
import { WEL } from '../e_well.js';
import { BMP } from '../e_bumper.js';
import { UPS } from '../e_upstop.js';
import { DRS } from '../e_doors.js';
import { DHG } from '../e_dhinge.js';
import { DDR } from '../e_ddrive.js';
import { solidNS } from '../solid_ref.js';   // solids by reference: meshes load on demand
const S = solidNS('e_nosegear');

const R = [[NGS, 'NGS', { laminate: true }], [NG30, 'NG30', { laminate: true, mirror: true }], [HNG, 'HNG'], [NG6D, 'NG6'], [NG34, 'NG34'], [CVR, 'CVR', { laminate: true }], [FRK, 'FRK'], [WHL, 'WHL'],
  [GBX, 'GBX'], [WRM, 'WRM'], [CRS, 'CRS'], [LNK, 'LNK'], [CRK, 'CRK'], [WEL, 'WEL', { laminate: true }], [BMP, 'BMP'], [UPS, 'UPS'], [DRS, 'DRS', { laminate: true, mirror: true }], [DHG, 'DHG', { mirror: true }], [DDR, 'DDR']];
export const DEFS = Object.fromEntries(R.map(([d, k, o]) => [d.pn, entry(d, S[`${k}_SOLID`] || { hash: 'none', measured: { volume: 0, volumes: {}, bbox: [0, 0, 0, 0, 0, 0], holes: [], faces: 0 }, mesh: { pos: [], idx: [], groups: [] } }, o)]));
const AFT = { h: 0, title: 'VIEW LOOKING AFT (BL ACROSS)' }, SIDE = { h: 1, title: 'VIEW LOOKING INBOARD (FS ACROSS)' };
const note = (pn) => [[`${pn}: AIRCRAFT FRAME, GEAR DOWN; DIMENSIONS ARE THE SOLID'S ENVELOPE. SEE THE RECORD FOR FEATURES AND HOLES.`, 'outline']];
// source audit 2026-11-19: one new rev per changed part
srcAudit(DEFS, {
"LEZ-32-200": [
"MGS motor-aircraft post-cure",
"Post-cure per the shared structural process (MGS L285 / H287, 15 h at 80 °C / 176 °F; was 8 h at 140 °F) so the hot-wet allowables apply."
],
"LEZ-32-207": [
"Source audit: Azusa 280/250-4 OD 8.8 in",
"Tyre OD 8.8 in (Azusa 06-01287 / 06-01288; was 10.2), stowed geometry and well re-checked."
],
"LEZ-32-211": [
"Source audit: worm friction 0.08",
"Self-lock friction 0.08 (shock and vibration low end; was 0.10)."
]
});
export const VIEWS = Object.fromEntries(R.map(([d]) => [d.pn, view(d.pn, note(d.pn), [AFT, SIDE])]));
