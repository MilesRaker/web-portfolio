// The part definition standard's twelve fields in four groups and the states a field can be in (standard.js assesses a
// part against them). Its own module so the Definition tab can draw the readiness matrix from the audit cache without
// loading the definition records.
export const GROUPS = [
  { id: 'def', label: 'Definition' }, { id: 'eng', label: 'Engineering' }, { id: 'int', label: 'Integration' }, { id: 'src', label: 'Sourcing and status' },
];
export const FIELDS = [
  { id: 'identity', label: 'Identity', short: 'ID', group: 'def', holds: 'Part number, name, revision, next-higher assembly, effectivity' },
  { id: 'solid', label: 'Solid', short: 'Sol', group: 'def', holds: 'Feature-accurate solid of the true part shape' },
  { id: 'drawing', label: 'Drawing', short: 'Dwg', group: 'def', holds: 'Dimensioned sheet: views, tolerances, datums, notes, title block' },
  { id: 'cut', label: 'Cut patterns', short: 'Cut', group: 'def', holds: 'Flat patterns, ply cut patterns and hot-wire core templates' },
  { id: 'layup', label: 'Layup', short: 'Lay', group: 'def', holds: 'Ply table: material, orientation, sequence, drop-offs, overlaps, core' },
  { id: 'material', label: 'Material and process', short: 'Mat', group: 'eng', holds: 'Specification for each material, cure, finish, torque' },
  { id: 'subst', label: 'Substantiation', short: 'Sub', group: 'eng', holds: 'Checks that cover every load path, inputs traced to a published source' },
  { id: 'mass', label: 'Mass', short: 'Mass', group: 'eng', holds: 'Computed from the solid' },
  { id: 'hardware', label: 'Hardware', short: 'HW', group: 'int', holds: 'Part numbers, grip lengths, washers, torque, safetying' },
  { id: 'interfaces', label: 'Interfaces', short: 'If', group: 'int', holds: 'Mating features checked against the partner' },
  { id: 'tooling', label: 'Tooling', short: 'Tool', group: 'int', holds: 'Jigs, molds, templates, drill guides' },
  { id: 'sourcing', label: 'Sourcing', short: 'Src', group: 'src', holds: 'Vendor, vendor part number, cost, lead time' },
];
export const STATE = { done: 'Meets the standard', part: 'Defined, still notional', miss: 'Not defined yet', na: 'Does not apply' };

/** fraction of the applicable fields that are done */
export function score(a) {
  const v = Object.values(a.fields).filter((x) => x.st !== 'na');
  return v.length ? v.filter((x) => x.st === 'done').length / v.length : 0;
}
