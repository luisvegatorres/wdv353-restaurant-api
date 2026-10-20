import React from 'react';

export default function RecordList({ kind, records, busy, onEdit, onDelete }) {
  const isRestaurant = kind === 'restaurants';
  return (
    <div className="record-list">
      {records.map((record) => (
        <article className="panel record" key={record._id}>
          <div className="record-heading">
            <div>
              <p className="eyebrow">
                {isRestaurant ? record.cuisine : record.category}
              </p>
              <h3>{record.name}</h3>
            </div>
            <span
              className={`badge ${(isRestaurant ? record.isOpen : record.available) ? 'positive' : ''}`}
            >
              {isRestaurant
                ? record.isOpen
                  ? 'Open'
                  : 'Closed'
                : record.available
                  ? 'Available'
                  : 'Unavailable'}
            </span>
          </div>
          {isRestaurant ? (
            <>
              <dl>
                <div>
                  <dt>Rating</dt>
                  <dd>{record.rating} / 5</dd>
                </div>
                <div>
                  <dt>Opened</dt>
                  <dd>{record.openedOn.slice(0, 10)}</dd>
                </div>
              </dl>
              <p className="relationship">
                <strong>{record.menuItems?.length ?? 0}</strong> menu items
                {record.menuItems?.length > 0
                  ? ` · ${record.menuItems.map((item) => item.name).join(', ')}`
                  : ''}
              </p>
            </>
          ) : (
            <>
              <dl>
                <div>
                  <dt>Price</dt>
                  <dd>
                    {record.price.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </dd>
                </div>
                <div>
                  <dt>Restaurant</dt>
                  <dd>{record.restaurant?.name ?? 'Restaurant unavailable'}</dd>
                </div>
              </dl>
            </>
          )}
          <div className="actions record-actions">
            <button
              disabled={busy}
              onClick={() => onEdit(record)}
              aria-label={`Edit ${record.name}`}
            >
              Edit
            </button>
            <button
              className="danger-text"
              disabled={busy}
              onClick={() => onDelete(record)}
              aria-label={`Delete ${record.name}`}
            >
              Delete
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
