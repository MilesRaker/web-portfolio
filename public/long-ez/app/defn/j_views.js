// Block J drawing views (site/defn/sheet.js VIEWS signature). Each sheet projects the part's own primitives (the solid's
// input) at the largest standard scale that fits its slot, with the record's features as a table. Sheet units: 100 per
// inch at 1:1. Side elevations are drawn nose left (FS increasing to the right); front views look forward (BL + right).
import { primsView, table, wrapRows } from './blkB_views.js';
import { bboxOf } from './blkB_prims.js';

const SCALES = [[200, '2:1'], [100, '1:1'], [50, '1:2'], [25, '1:4'], [12.5, '1:8'], [6.25, '1:16'], [3.125, '1:32'], [1.5625, '1:64'], [0.78125, '1:128']];
const EXT = { side: [2, 4], front: [0, 4], plan: [0, 2] };   // bbox index pairs (u, v) per plane: prims frame x = BL, y = FS, z = WL
const TITLE = { side: 'SIDE ELEVATION, NOSE LEFT', front: 'VIEW LOOKING FORWARD', plan: 'PLAN, NOSE UP' };
const SLOT = { w: 400, h: 430, x0: 70, gap: 60, y: 170 };
/** views: [{ plane, filter?, title? }] — each in its own slot at one common scale (the largest that fits every slot) */
function jSheet(views) {
  return (k, D) => {
    const p = D.params(), feat = p.feat || {}, sets = views.map((v) => ({ ...v, prims: v.filter ? p.prims.filter(v.filter) : p.prims }));
    const size = (v) => { const b = bboxOf(v.prims), [i, j] = EXT[v.plane]; return [b[i + 1] - b[i], b[j + 1] - b[j]]; };
    const [S, lab] = SCALES.find(([s]) => sets.every((v) => { const [u, w] = size(v); return u * s <= SLOT.w - 60 && w * s <= SLOT.h; })) || SCALES.at(-1);
    let o = '';
    sets.forEach((v, i) => { const [u] = size(v), x = SLOT.x0 + i * (SLOT.w + SLOT.gap) + (SLOT.w - 60 - u * S) / 2;
      o += primsView(k, v.prims, feat, v.plane, S, x, SLOT.y, `${v.title || TITLE[v.plane]} · ${lab}`, { feat: D.def.features[0].id }).svg; });
    o += table(k, 1010, 120, 'FEATURES', [80, 480], [{ cells: ['ID', 'FEATURE'] }, ...wrapRows(D, 58).map((r) => ({ feat: r[0] || D.def.features[0].id, cells: r }))]);
    return { svg: o, bottom: 820, scale: lab, notesBox: { x: 40, top: 820, n: 128, bottom: 1072 } };
  };
}
const UNIT = jSheet([{ plane: 'side' }, { plane: 'front' }]), FLAT = jSheet([{ plane: 'plan' }, { plane: 'side' }]), RUN = jSheet([{ plane: 'plan' }, { plane: 'side' }]);
const aft = (fs) => (m) => (m.k === 'cyl' ? Math.min(m.a[1], m.b[1]) : m.k === 'ext' ? fs : (m.c ? m.c[1] : bboxOf([m])[2])) > fs;
const ELT = jSheet([{ plane: 'side', filter: aft(100), title: 'ELT ON ITS BRACKET, NOSE LEFT' }, { plane: 'front', filter: (m) => !aft(100)(m), title: 'PANEL REMOTE, LOOKING FORWARD' }]);
export const VIEWS_J = {
  'LEZ-31-110': UNIT, 'LEZ-31-130': UNIT, 'LEZ-31-150': UNIT, 'LEZ-31-140': UNIT, 'LEZ-31-160': FLAT, 'LEZ-34-100': FLAT, 'LEZ-31-120': FLAT, 'LEZ-31-122': FLAT,
  'LEZ-31-124': UNIT, 'LEZ-34-114': FLAT, 'LEZ-34-112': FLAT, 'LEZ-34-110': UNIT, 'LEZ-25-161': UNIT, 'LEZ-25-160': ELT, 'LEZ-34-120': UNIT, 'LEZ-34-132': UNIT, 'LEZ-34-135': FLAT,
  'LEZ-34-130': RUN, 'LEZ-23-110': RUN, 'LEZ-34-111': RUN, 'LEZ-25-162': RUN, 'LEZ-23-125': RUN, 'LEZ-31-121': RUN, 'LEZ-23-120': RUN,
};
