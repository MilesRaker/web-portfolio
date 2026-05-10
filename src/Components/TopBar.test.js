import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TopBar from './TopBar';

test('renders logo and professional title', () => {
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <TopBar />
    </MemoryRouter>
  );

  expect(screen.getByRole('img', { name: /rocket idea logo/i })).toBeInTheDocument();
  expect(screen.getByText(/aerospace electrical engineer/i)).toBeInTheDocument();
});
