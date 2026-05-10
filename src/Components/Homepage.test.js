import { render, screen } from '@testing-library/react';
import Homepage from './Homepage';

jest.mock('./TelemetryDemo', () => function MockTelemetryDemo() {
  return <div data-testid="telemetry-demo" />;
});

test('renders a distinct landing page pitch and telemetry description', () => {
  render(<Homepage />);

  expect(screen.getByRole('heading', { name: /flight test systems/i })).toBeInTheDocument();
  expect(screen.getByText(/real-time instrumentation display/i)).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /^miles raker$/i })).not.toBeInTheDocument();
});
