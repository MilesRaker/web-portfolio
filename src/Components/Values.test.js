import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Values from './Values';

const definitions = {
  Authentic: 'Staying grounded in who I am and what I believe.',
  Curious: 'Staying open, asking questions, and learning quickly.',
  Kind: 'Treating people with patience, generosity, and respect.',
  Loyal: 'Showing up for the team, especially when it matters.',
  Playful: 'Bringing energy, humor, and creativity into the work.',
  'Self-confident': 'Trusting that I can learn what the mission requires.',
};

test('renders all value names', () => {
  render(<Values />);

  Object.keys(definitions).forEach(name => {
    expect(screen.getByRole('button', { name })).toBeInTheDocument();
  });
});

test('hides definitions before a value is expanded', () => {
  render(<Values />);

  Object.values(definitions).forEach(definition => {
    expect(screen.queryByText(definition)).not.toBeInTheDocument();
  });
});

test('clicking a value expands and collapses its definition', async () => {
  render(<Values />);

  const authentic = screen.getByRole('button', { name: 'Authentic' });
  await userEvent.click(authentic);
  expect(screen.getByText(definitions.Authentic)).toBeInTheDocument();
  expect(authentic).toHaveAttribute('aria-expanded', 'true');

  await userEvent.click(authentic);
  expect(screen.queryByText(definitions.Authentic)).not.toBeInTheDocument();
  expect(authentic).toHaveAttribute('aria-expanded', 'false');
});

test('clicking another value moves the expanded definition', async () => {
  render(<Values />);

  await userEvent.click(screen.getByRole('button', { name: 'Authentic' }));
  await userEvent.click(screen.getByRole('button', { name: 'Curious' }));

  expect(screen.queryByText(definitions.Authentic)).not.toBeInTheDocument();
  expect(screen.getByText(definitions.Curious)).toBeInTheDocument();
});
