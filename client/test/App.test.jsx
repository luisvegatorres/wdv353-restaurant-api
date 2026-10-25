import React from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.jsx';
import { restaurantsApi, menuItemsApi } from '../services/api.js';

vi.mock('../services/api.js', async (original) => ({
  ...(await original()),
  restaurantsApi: {
    list: vi.fn(),
    create: vi.fn(),
    replace: vi.fn(),
    remove: vi.fn(),
  },
  menuItemsApi: {
    list: vi.fn(),
    create: vi.fn(),
    replace: vi.fn(),
    remove: vi.fn(),
  },
}));
const restaurant = {
  _id: 'r1',
  name: 'Olive Kitchen',
  cuisine: 'Italian',
  rating: 4.5,
  isOpen: true,
  openedOn: '2024-06-01T00:00:00.000Z',
  menuItems: [],
};
const menuItem = {
  _id: 'm1',
  name: 'Pizza',
  price: 12.5,
  available: true,
  category: 'main',
  restaurant,
};
beforeEach(() => {
  vi.resetAllMocks();
  restaurantsApi.list.mockResolvedValue([restaurant]);
  menuItemsApi.list.mockResolvedValue([menuItem]);
});
async function start() {
  render(<App />);
  await screen.findByRole('heading', { name: restaurant.name });
  return userEvent.setup();
}

test('loads records and submits typed restaurant fields, then refreshes both lists', async () => {
  const user = await start();
  await user.click(screen.getByRole('button', { name: '+ Add restaurant' }));
  await user.type(screen.getByLabelText('Name'), 'New Kitchen');
  await user.type(screen.getByLabelText('Cuisine'), 'French');
  await user.type(screen.getByLabelText('Rating (0–5)'), '4.2');
  await user.type(screen.getByLabelText('Opening date'), '2025-01-01');
  await user.click(
    screen.getByRole('button', { name: 'Add restaurant', exact: true })
  );
  await waitFor(() =>
    expect(restaurantsApi.create).toHaveBeenCalledWith({
      name: 'New Kitchen',
      cuisine: 'French',
      rating: 4.2,
      isOpen: true,
      openedOn: '2025-01-01',
    })
  );
  await screen.findByText('New Kitchen added.');
  expect(restaurantsApi.list).toHaveBeenCalledTimes(2);
  expect(menuItemsApi.list).toHaveBeenCalledTimes(2);
});

test('edits a menu item with a restaurant ID and all replacement fields', async () => {
  const user = await start();
  await user.click(
    screen.getByRole('button', { name: 'Menu items', exact: true })
  );
  await user.click(screen.getByRole('button', { name: 'Edit Pizza' }));
  await user.clear(screen.getByLabelText('Price'));
  await user.type(screen.getByLabelText('Price'), '15');
  await user.click(screen.getByLabelText('Available to order'));
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() =>
    expect(menuItemsApi.replace).toHaveBeenCalledWith('m1', {
      name: 'Pizza',
      price: 15,
      available: false,
      category: 'main',
      restaurant: 'r1',
    })
  );
});

test('creates a menu item associated with an existing restaurant', async () => {
  const user = await start();
  await user.click(
    screen.getByRole('button', { name: 'Menu items', exact: true })
  );
  await user.click(screen.getByRole('button', { name: '+ Add menu item' }));
  await user.type(screen.getByLabelText('Name'), 'Tiramisu');
  await user.type(screen.getByLabelText('Price'), '6.5');
  await user.selectOptions(screen.getByLabelText('Category'), 'dessert');
  await user.click(
    screen.getByRole('button', { name: 'Add menu item', exact: true })
  );
  await waitFor(() =>
    expect(menuItemsApi.create).toHaveBeenCalledWith({
      name: 'Tiramisu',
      price: 6.5,
      available: true,
      category: 'dessert',
      restaurant: 'r1',
    })
  );
});

test('retains the form and displays server validation errors', async () => {
  restaurantsApi.replace.mockRejectedValue({
    response: {
      data: { error: 'Validation failed.', details: ['Name is too short.'] },
    },
  });
  const user = await start();
  await user.click(screen.getByRole('button', { name: 'Edit Olive Kitchen' }));
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  expect((await screen.findByRole('alert')).textContent).toContain(
    'Name is too short.'
  );
  expect(screen.getByLabelText('Name').value).toBe('Olive Kitchen');
});

test('deletes only after confirmation and refreshes records', async () => {
  const user = await start();
  await user.click(
    screen.getByRole('button', { name: 'Delete Olive Kitchen' })
  );
  expect(restaurantsApi.remove).not.toHaveBeenCalled();
  restaurantsApi.list.mockResolvedValue([]);
  await user.click(screen.getByRole('button', { name: 'Confirm delete' }));
  await screen.findByText('Olive Kitchen deleted.');
  await waitFor(() =>
    expect(screen.queryByRole('heading', { name: 'Olive Kitchen' })).toBeNull()
  );
  expect(restaurantsApi.remove).toHaveBeenCalledWith('r1');
});

test('prevents deleting a parent with children and explains the relationship', async () => {
  restaurantsApi.list.mockResolvedValue([
    { ...restaurant, menuItems: [menuItem] },
  ]);
  const user = await start();
  await user.click(
    screen.getByRole('button', { name: 'Delete Olive Kitchen' })
  );
  const confirmation = screen.getByRole('region', { name: 'Confirm deletion' });
  expect(
    within(confirmation).getByRole('button', { name: 'Confirm delete' })
      .disabled
  ).toBe(true);
  expect(confirmation.textContent).toContain('Delete its menu items first');
});

test('recovers from an initial connection failure using Refresh', async () => {
  restaurantsApi.list.mockRejectedValueOnce(new Error('offline'));
  const user = userEvent.setup();
  render(<App />);
  expect((await screen.findByRole('alert')).textContent).toContain(
    'Could not reach the API'
  );
  await user.click(screen.getByRole('button', { name: 'Refresh' }));
  await screen.findByRole('heading', { name: 'Olive Kitchen' });
  expect(screen.queryByRole('alert')).toBeNull();
});

test('does not offer a duplicate save after a successful write and failed refresh', async () => {
  const user = await start();
  await user.click(screen.getByRole('button', { name: 'Edit Olive Kitchen' }));
  restaurantsApi.list.mockRejectedValueOnce(new Error('offline'));
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  expect((await screen.findByRole('alert')).textContent).toContain(
    'Your change was saved'
  );
  expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
  expect(
    screen.getByRole('button', { name: '+ Add restaurant' }).disabled
  ).toBe(true);
  expect(restaurantsApi.replace).toHaveBeenCalledTimes(1);
});
