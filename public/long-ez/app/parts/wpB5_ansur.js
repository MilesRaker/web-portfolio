// WPB5 — anthropometric data for the occupant checks (block B, LEZ-25-1xx): ANSUR II percentiles, as printed in
// Gordon, C. C. et al. (2012 survey; report dated December 2014), "2012 Anthropometric Survey of U.S. Army Personnel: Methods and Summary Statistics",
// NATICK/TR-15/007, U.S. Army Natick Soldier RD&E Center (dtic.mil ADA611869, apps.dtic.mil/sti/pdfs/ADA611869.pdf,
// accessed 2026-11-20). The report prints each percentile in cm; the values below are those cm × 10 (mm). Three occupants:
// the 5th-percentile female (f5), the 50th-percentile male (m50) and the 95th-percentile male (m95). Percentiles of single
// dimensions: a sum of 5th-percentile segments is shorter than the 5th percentile of the sum (conservative for reach), and
// no real person is 95th percentile in every dimension (conservative for clearance). Measured on a hard seat, erect, unclothed
// (no helmet, no shoes). Notional; not for construction.
export const ANSUR_SRC = 'Gordon et al. 2012, Anthropometric Survey of U.S. Army Personnel (ANSUR II): Methods and Summary Statistics, NATICK/TR-15/007 (dtic.mil ADA611869, accessed 2026-11-20)';
export const OCC_KEYS = ['f5', 'm50', 'm95'];
export const OCC_NAME = { f5: '5th-percentile female', m50: '50th-percentile male', m95: '95th-percentile male' };
const D = (no, page, f5, m50, m95, what) => ({ no, page, f5, m50, m95, what });
/** mm; `no` is the report's dimension number (D-numbers are its derived dimensions), `page` the page of its percentile table */
export const ANSUR = {
  acromSit: D('D2', 235, 515, 603, 653, 'Acromial height, sitting: seat surface to the acromion'),
  sitHt: D(71, 185, 803, 918, 977, 'Sitting height: seat surface to the top of the head (vertex), erect'),
  eyeSit: D(34, 111, 698, 804, 860, 'Eye height, sitting: seat surface to the ectocanthus'),
  buttKnee: D(19, 82, 541, 617, 669, 'Buttock-knee length: buttock plate to the front of the knee, knee at 90°'),
  buttPop: D(20, 84, 441, 502, 548, 'Buttock-popliteal length: buttock plate to the back of the knee, knee at 90°'),
  kneeSit: D(57, 157, 469, 553, 602, 'Knee height, sitting: footrest to the top of the knee'),
  popHt: D(66, 175, 350, 430, 471, 'Popliteal height: footrest to the underside of the thigh at the knee'),
  thighClr: D(79, 201, 145, 180, 207, 'Thigh clearance: seat surface to the top of the thigh'),
  footLen: D(36, 116, 226, 271, 293, 'Foot length: heel to the tip of the longest toe'),
  ballFoot: D(7, 57, 167, 201, 218, 'Ball of foot length: back of the heel to the first metatarsophalangeal protrusion'),
  calfLink: D('D6', 244, 361, 418, 460, 'Calf link: lateral femoral epicondyle height − lateral malleolus height'),
  shElbow: D(69, 181, 307, 363, 394, 'Shoulder-elbow length: acromion to radiale'),
  radSty: D(67, 177, 218, 267, 295, 'Radiale-stylion length: elbow to wrist'),
  palm: D(65, 173, 100, 116, 127, 'Palm length'),
  hand: D(44, 132, 165, 193, 210, 'Hand length: wrist crease to the tip of the middle finger'),
  thumbReach: D(80, 203, 674, 811, 886, 'Thumbtip reach: back wall to the thumb tip, shoulders on the wall (cross-check only)'),
  biacrom: D(8, 60, 335, 415, 447, 'Biacromial breadth: acromion to acromion'),
  hipSit: D(51, 146, 348, 378, 431, 'Hip breadth, sitting'),
  // occupant-12 2026-11-22: the head and the torso's depth (posture model, wpB4 OCCS / wpB5 occupant)
  chestDepth: D(25, 93, 205, 253, 298, 'Chest depth: back to the front of the chest at the nipple level'),
  headLen: D(47, 138, 178, 200, 211, 'Head length: glabella to the back of the head (opisthocranion)'),
  tragionTop: D(82, 207, 116, 131, 141, 'Tragion-top of head: ear (tragion) to the vertex, head in the Frankfort plane'),
};
const IN = (mm) => mm / 25.4;
/** dimension k of occupant o, in inches */
export const ans = (k, o) => IN(ANSUR[k][o]);
export const cite = (k) => `ANSUR II ${ANSUR[k].what.split(':')[0]} (dim. ${ANSUR[k].no}, p. ${ANSUR[k].page})`;
/** derived values (in), each with its derivation:
 *  grip: acromion to the centre of a power grip = shoulder-elbow + radiale-stylion + ½ palm length (functional grip reach,
 *        arm straight, shoulder held by the locked harness);
 *  tip:  acromion to the fingertip = shoulder-elbow + radiale-stylion + hand length (toggle, push-button and key reach);
 *  leg:  heel to the buttock plate with the knee straight = buttock-popliteal length + popliteal height (ANSUR II has no
 *        functional leg length or buttock-heel length: derived);
 *  shBL: half the biacromial breadth (the shoulder's BL). */
export const DERIVED = {
  grip: (o) => ans('shElbow', o) + ans('radSty', o) + ans('palm', o) / 2,
  tip: (o) => ans('shElbow', o) + ans('radSty', o) + ans('hand', o),
  leg: (o) => ans('buttPop', o) + ans('popHt', o),
  shBL: (o) => ans('biacrom', o) / 2,
};
export const DERIVED_SRC = {
  grip: `derived: ${cite('shElbow')} + ${cite('radSty')} + ½ ${cite('palm')}`,
  tip: `derived: ${cite('shElbow')} + ${cite('radSty')} + ${cite('hand')}`,
  leg: `derived (ANSUR II has no functional leg length or buttock-heel length): ${cite('buttPop')} + ${cite('popHt')}`,
};
