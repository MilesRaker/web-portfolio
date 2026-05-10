import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NavTabsVertical from './NavTabsVertical';

test('renders primary navigation tabs vertically', () => {
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <NavTabsVertical />
    </MemoryRouter>
  );

  expect(screen.getByRole('tab', { name: 'Resume' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Values' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Projects' })).toBeInTheDocument();
});
