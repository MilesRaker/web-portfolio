import {
  ROTATION_SPEED,
  clamp,
  createOrientationNeutral,
  mapOrientationToStick,
  shouldTriggerRotationPrompt,
} from './flightSimulatorUtils';

describe('flight simulator utilities', () => {
  test('clamps values to a min and max range', () => {
    expect(clamp(-2, -1, 1)).toBe(-1);
    expect(clamp(0.25, -1, 1)).toBe(0.25);
    expect(clamp(2, -1, 1)).toBe(1);
  });

  test('captures beta and gamma as the neutral orientation', () => {
    expect(createOrientationNeutral({ beta: 12, gamma: -8 })).toEqual({ beta: 12, gamma: -8 });
  });

  test('maps calibrated neutral orientation to centered stick', () => {
    const neutral = createOrientationNeutral({ beta: 10, gamma: -5 });

    expect(mapOrientationToStick({ beta: 10, gamma: -5 }, neutral)).toEqual({ stickX: 0, stickY: 0 });
  });

  test('maps tilt toward and away from the user to back and forward stick', () => {
    const neutral = createOrientationNeutral({ beta: 0, gamma: 0 });

    expect(mapOrientationToStick({ beta: 25, gamma: 0 }, neutral).stickY).toBeCloseTo(1);
    expect(mapOrientationToStick({ beta: -25, gamma: 0 }, neutral).stickY).toBeCloseTo(-1);
  });

  test('maps left and right phone tilt to left and right stick', () => {
    const neutral = createOrientationNeutral({ beta: 0, gamma: 0 });

    expect(mapOrientationToStick({ beta: 0, gamma: -25 }, neutral).stickX).toBeCloseTo(1);
    expect(mapOrientationToStick({ beta: 0, gamma: 25 }, neutral).stickX).toBeCloseTo(-1);
  });

  test('applies a small deadband around neutral', () => {
    const neutral = createOrientationNeutral({ beta: 0, gamma: 0 });

    expect(mapOrientationToStick({ beta: 1, gamma: -1 }, neutral)).toEqual({ stickX: 0, stickY: 0 });
  });

  test('clamps extreme device orientation values', () => {
    const neutral = createOrientationNeutral({ beta: 0, gamma: 0 });

    expect(mapOrientationToStick({ beta: 90, gamma: 90 }, neutral)).toEqual({ stickX: -1, stickY: 1 });
    expect(mapOrientationToStick({ beta: -90, gamma: -90 }, neutral)).toEqual({ stickX: 1, stickY: -1 });
  });

  test('triggers the rotation prompt when airspeed crosses Vr once', () => {
    expect(ROTATION_SPEED).toBe(120);
    expect(shouldTriggerRotationPrompt({ previousIas: 119, currentIas: 120, alreadyShown: false })).toBe(true);
    expect(shouldTriggerRotationPrompt({ previousIas: 120, currentIas: 121, alreadyShown: false })).toBe(false);
    expect(shouldTriggerRotationPrompt({ previousIas: 119, currentIas: 120, alreadyShown: true })).toBe(false);
  });
});
