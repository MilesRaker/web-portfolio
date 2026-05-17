import { render, screen, waitFor } from '@testing-library/react';
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
