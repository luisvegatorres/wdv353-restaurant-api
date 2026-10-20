import React, { useState } from 'react';

// Send only application fields: PUT replaces the complete document.
function initialValues(kind, record, restaurants) {
  if (kind === 'restaurants')
    return {
      name: record?.name ?? '',
      cuisine: record?.cuisine ?? '',
      rating: record?.rating ?? '',
      isOpen: record?.isOpen ?? true,
      openedOn: record?.openedOn?.slice(0, 10) ?? '',
    };
  return {
    name: record?.name ?? '',
    price: record?.price ?? '',
    available: record?.available ?? true,
    category: record?.category ?? 'main',
    restaurant: record?.restaurant?._id ?? restaurants[0]?._id ?? '',
  };
}

export default function RecordForm({
  kind,
  record,
  restaurants,
  busy,
  onSave,
  onCancel,
}) {
  const [values, setValues] = useState(() =>
    initialValues(kind, record, restaurants)
  );
  const isRestaurant = kind === 'restaurants';
  function change(event) {
    const { name, value, type, checked } = event.target;
    setValues((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }
  function submit(event) {
    event.preventDefault();
    const body = { ...values, name: values.name.trim() };
    if (isRestaurant) {
      body.cuisine = values.cuisine.trim();
      body.rating = Number(values.rating);
    } else body.price = Number(values.price);
    onSave(body);
  }
  const noun = isRestaurant ? 'restaurant' : 'menu item';
  return (
    <section className="panel editor" aria-labelledby="form-title">
      <p className="eyebrow">{record ? 'UPDATE RECORD' : 'NEW RECORD'}</p>
      <h2 id="form-title">
        {record ? 'Edit' : 'Add'} {noun}
      </h2>
      <p className="muted">All fields are required.</p>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <label htmlFor="name">Name</label>
          <input
            id="name"
            name="name"
            value={values.name}
            onChange={change}
            required
            minLength={2}
            maxLength={100}
            pattern=".*\S.*"
            autoFocus
          />
          {isRestaurant ? (
            <>
              <label htmlFor="cuisine">Cuisine</label>
              <input
                id="cuisine"
                name="cuisine"
                value={values.cuisine}
                onChange={change}
                required
                minLength={2}
                maxLength={50}
                pattern=".*\S.*"
              />
              <div className="form-grid">
                <div>
                  <label htmlFor="rating">Rating (0–5)</label>
                  <input
                    id="rating"
                    name="rating"
                    type="number"
                    min="0"
                    max="5"
                    step="any"
                    value={values.rating}
                    onChange={change}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="openedOn">Opening date</label>
                  <input
                    id="openedOn"
                    name="openedOn"
                    type="date"
                    value={values.openedOn}
                    onChange={change}
                    required
                  />
                </div>
              </div>
              <label className="checkbox">
                <input
                  name="isOpen"
                  type="checkbox"
                  checked={values.isOpen}
                  onChange={change}
                />{' '}
                Currently open
              </label>
            </>
          ) : (
            <>
              <label htmlFor="restaurant">Restaurant</label>
              <select
                id="restaurant"
                name="restaurant"
                value={values.restaurant}
                onChange={change}
                required
              >
                <option value="">Choose a restaurant</option>
                {restaurants.map((restaurant) => (
                  <option key={restaurant._id} value={restaurant._id}>
                    {restaurant.name}
                  </option>
                ))}
              </select>
              <div className="form-grid">
                <div>
                  <label htmlFor="price">Price</label>
                  <input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    max="1000"
                    step="any"
                    value={values.price}
                    onChange={change}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="category">Category</label>
                  <select
                    id="category"
                    name="category"
                    value={values.category}
                    onChange={change}
                  >
                    <option value="starter">Starter</option>
                    <option value="main">Main</option>
                    <option value="dessert">Dessert</option>
                    <option value="drink">Drink</option>
                  </select>
                </div>
              </div>
              <label className="checkbox">
                <input
                  name="available"
                  type="checkbox"
                  checked={values.available}
                  onChange={change}
                />{' '}
                Available to order
              </label>
            </>
          )}
          <div className="actions">
            <button className="primary" type="submit">
              {busy ? 'Saving…' : record ? 'Save changes' : `Add ${noun}`}
            </button>
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
