import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NavTabsHorizontal from './NavTabsHorizontal';

test('renders primary navigation tabs horizontally', () => {
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <NavTabsHorizontal />
    </MemoryRouter>
  );

  expect(screen.getByRole('tab', { name: 'Resume' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Values' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Projects' })).toBeInTheDocument();
});
