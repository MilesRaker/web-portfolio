export const ROTATION_SPEED = 120;
export const TILT_FULL_SCALE_DEG = 25;
export const TILT_DEADBAND_DEG = 2;

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function createOrientationNeutral(reading) {
  return {
    beta: Number(reading?.beta) || 0,
    gamma: Number(reading?.gamma) || 0,
  };
}

function normalizeTilt(deltaDeg) {
  if (Math.abs(deltaDeg) <= TILT_DEADBAND_DEG) return 0;
  const adjusted = deltaDeg > 0
    ? deltaDeg - TILT_DEADBAND_DEG
    : deltaDeg + TILT_DEADBAND_DEG;
  return clamp(adjusted / (TILT_FULL_SCALE_DEG - TILT_DEADBAND_DEG), -1, 1);
}

export function mapOrientationToStick(reading, neutral) {
  const beta = Number(reading?.beta) || 0;
  const gamma = Number(reading?.gamma) || 0;
  const neutralBeta = Number(neutral?.beta) || 0;
  const neutralGamma = Number(neutral?.gamma) || 0;

  return {
    stickX: normalizeTilt(neutralGamma - gamma),
    stickY: normalizeTilt(beta - neutralBeta),
  };
}

export function shouldTriggerRotationPrompt({ previousIas, currentIas, alreadyShown }) {
  return !alreadyShown && previousIas < ROTATION_SPEED && currentIas >= ROTATION_SPEED;
}
