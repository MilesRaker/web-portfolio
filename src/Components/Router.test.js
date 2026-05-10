import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Router from './Router';

jest.mock('./TelemetryDemo', () => function MockTelemetryDemo() {
  return <div data-testid="telemetry-demo" />;
});
jest.mock('./Resume', () => function MockResume() {
  return <div data-testid="resume-route" />;
});
jest.mock('./Values', () => function MockValues() {
  return <div data-testid="values-route" />;
});
jest.mock('./Projects', () => function MockProjects() {
  return <div data-testid="projects-route" />;
});

test('renders homepage content at the root route', () => {
  render(
    <MemoryRouter
      initialEntries={['/']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Router />
    </MemoryRouter>
  );

  expect(screen.getByRole('heading', { name: /flight test systems/i })).toBeInTheDocument();
});
