import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useMediaQuery from '@mui/material/useMediaQuery';
import TelemetryDemo from './TelemetryDemo';

jest.mock('@mui/material/useMediaQuery');

jest.mock('react-typescript-flight-indicators', () => ({
  AttitudeIndicator: ({ pitch, roll }) => <div data-testid="attitude-indicator">pitch {pitch} roll {roll}</div>,
  Altimeter: ({ altitude }) => <div data-testid="altimeter">alt {altitude}</div>,
  HeadingIndicator: ({ heading }) => <div data-testid="heading-indicator">heading {heading}</div>,
}));

jest.mock('react-gauge-component', () => function MockGaugeComponent({ id, value }) {
  return <div data-testid={id}>value {value}</div>;
});

function renderDesktop() {
  useMediaQuery.mockReturnValue(false);
  return render(<TelemetryDemo />);
}

function renderMobile() {
  useMediaQuery.mockReturnValue(true);
  return render(<TelemetryDemo />);
}

beforeEach(() => {
  jest.useFakeTimers();
  useMediaQuery.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

test('renders the inline simulator on desktop', () => {
  renderDesktop();

  expect(screen.getByText(/telemetry sim/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /click for flight simulator/i })).not.toBeInTheDocument();
});

test('renders only a mobile simulator entry button before launch', () => {
  renderMobile();

  expect(screen.getByRole('button', { name: /click for flight simulator/i })).toBeInTheDocument();
  expect(screen.queryByText(/telemetry sim/i)).not.toBeInTheDocument();
});

test('opens and closes the mobile full-screen overlay', () => {
  renderMobile();

  userEvent.click(screen.getByRole('button', { name: /click for flight simulator/i }));

  expect(screen.getByRole('dialog', { name: /flight simulator/i })).toBeInTheDocument();
  expect(document.body).toHaveStyle({ overflow: 'hidden' });

  userEvent.click(screen.getByRole('button', { name: /exit/i }));

  expect(screen.queryByRole('dialog', { name: /flight simulator/i })).not.toBeInTheDocument();
  expect(document.body.style.overflow).toBe('');
});

test('mobile overlay starts in manual control mode', () => {
  renderMobile();

  userEvent.click(screen.getByRole('button', { name: /click for flight simulator/i }));

  expect(screen.queryByRole('button', { name: /click to take control/i })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /recenter/i })).toBeInTheDocument();
});

test('shows orientation enable control when DeviceOrientationEvent permission is requestable', async () => {
  const requestPermission = jest.fn().mockResolvedValue('granted');
  window.DeviceOrientationEvent = function DeviceOrientationEvent() {};
  window.DeviceOrientationEvent.requestPermission = requestPermission;

  renderMobile();
  userEvent.click(screen.getByRole('button', { name: /click for flight simulator/i }));

  await act(async () => {
    userEvent.click(screen.getByRole('button', { name: /enable tilt control/i }));
  });

  await waitFor(() => expect(requestPermission).toHaveBeenCalledTimes(1));
});

test('shows a tilt unavailable message when orientation is unsupported', () => {
  delete window.DeviceOrientationEvent;

  renderMobile();
  userEvent.click(screen.getByRole('button', { name: /click for flight simulator/i }));

  expect(screen.getByText(/tilt control unavailable/i)).toBeInTheDocument();
});

test('recenter button recalibrates the current orientation', () => {
  window.DeviceOrientationEvent = function DeviceOrientationEvent() {};

  renderMobile();
  userEvent.click(screen.getByRole('button', { name: /click for flight simulator/i }));

  window.dispatchEvent(new Event('deviceorientation'));
  userEvent.click(screen.getByRole('button', { name: /recenter/i }));

  expect(screen.getByRole('button', { name: /recenter/i })).toBeInTheDocument();
});

test('mobile overlay shows labeled throttle and pedal controls', () => {
  renderMobile();

  userEvent.click(screen.getByRole('button', { name: /click for flight simulator/i }));

  expect(screen.getByText(/throttle/i)).toBeInTheDocument();
  expect(screen.getByText(/pedals/i)).toBeInTheDocument();
  expect(screen.getByRole('slider', { name: /throttle/i })).toBeInTheDocument();
  expect(screen.getByRole('slider', { name: /pedals/i })).toBeInTheDocument();
});

test('mobile pedal slider returns to center on release', () => {
  renderMobile();

  userEvent.click(screen.getByRole('button', { name: /click for flight simulator/i }));
  const pedals = screen.getByRole('slider', { name: /pedals/i });

  userEvent.keyboard('{Tab}');
  pedals.focus();
  userEvent.keyboard('{ArrowRight}');
  expect(pedals).toHaveAttribute('aria-valuenow', '1');

  userEvent.tab();
  expect(pedals).toHaveAttribute('aria-valuenow', '0');
});

test('shows initial takeoff prompt briefly when mobile overlay opens', () => {
  renderMobile();

  userEvent.click(screen.getByRole('button', { name: /click for flight simulator/i }));

  expect(screen.getByText(/accelerate to rotation speed/i)).toBeInTheDocument();

  act(() => {
    jest.advanceTimersByTime(2500);
  });

  expect(screen.queryByText(/accelerate to rotation speed/i)).not.toBeInTheDocument();
});
