// WPH8 — block H: the system records' display / mass geometry from the definition records (bought-in envelopes,
// machined parts) and every block H mass from its record, so the 3D view, the firewall layout's "today" positions and
// the mass roll-up read what the sheets define (H-F16: no mass counted twice). Runs last in blk_h. Notional.
import { partByPN } from '../systems.js';
import { FT } from './wpH0_route.js';
import * as LY from './wpH1_layout.js';
import * as PR from './wpH4_prims.js';
import { DEFS } from '../defn/blocks/h_engsys.js';

const box = (c, d) => ({ t: 'box', c: FT(c), d: [d[1] / 12, d[0] / 12, d[2] / 12] });
const toSys = (p) => (p.t === 'box' ? box(p.c, p.d) : { t: 'cyl', a: FT(p.a), b: FT(p.b), r: p.r / 12 });
const keep = (pn, f) => { const p = partByPN(pn); p.geo = [...f(), ...p.geo.filter((g) => g.t === 'path')]; };
// the manifold: first an AN3 bolt on block A's first layout hole (the layout's "today" reads the first box / cylinder)
keep('LEZ-77-120', () => [{ t: 'cyl', a: FT([LY.MANI_HOLES[0][0], 127.20, LY.MANI_HOLES[0][1]]), b: FT([LY.MANI_HOLES[0][0], LY.MANI.fs[1] + 0.2, LY.MANI_HOLES[0][1]]), r: 0.0938 / 12, mat: 'steel' }, ...PR.maniPrims().map(toSys)]);
keep('LEZ-77-130', () => PR.fftPrims().map(toSys));
keep('LEZ-76-100', () => { const Q = LY.QD; return [box([(Q.plateO[0] + Q.plateI[1]) / 2, (Q.plate.fs[0] + Q.plate.fs[1]) / 2, (Q.plate.wl[0] + Q.plate.wl[1]) / 2], [Q.plateI[1] - Q.plateO[0], Q.plate.fs[1] - Q.plate.fs[0], Q.plate.wl[1] - Q.plate.wl[0]]), ...PR.quadPrims().filter((p) => p.feat !== 'plates').map(toSys)]; });
{ const p = partByPN('LEZ-76-100'); delete p.meshes; }
keep('LEZ-77-100', () => PR.geaPrims().filter((p) => p.group !== 'harness').map(toSys));
keep('LEZ-74-120', () => PR.plugPrims().filter((p) => p.feat === 'body').map(toSys));
for (const [pn, D] of Object.entries(DEFS)) { const p = partByPN(pn); if (!p) continue; p.massEach = +D.def.mass.each.toFixed(4); p.qty = D.def.qty; p.massEachFixed = true; p.src = { ...p.src, mass: `GEOMETRY: the definition record (${pn} rev ${D.def.rev})` }; }
partByPN('LEZ-76-100').name = 'Throttle quadrant (throttle, mixture) with the carb-heat control';
partByPN('LEZ-77-100').name = 'Garmin GEA 24 engine interface, shelf and sensor harness';
