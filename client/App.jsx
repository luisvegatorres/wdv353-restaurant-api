import React, { useEffect, useRef, useState } from 'react';
import { restaurantsApi, menuItemsApi, errorMessage } from './services/api.js';
import RecordForm from './components/RecordForm.jsx';
import RecordList from './components/RecordList.jsx';

export default function App() {
  const [data, setData] = useState({ restaurants: [], menuItems: [] });
  const [kind, setKind] = useState('restaurants');
  const [editor, setEditor] = useState(null);
  const [deletion, setDeletion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const requestNumber = useRef(0);
  const mutationLock = useRef(false);
  const addButton = useRef(null);
  const deleteCancel = useRef(null);
  const busy = loading || pending;
  const isRestaurant = kind === 'restaurants';
  const noun = isRestaurant ? 'restaurant' : 'menu item';
  const api = isRestaurant ? restaurantsApi : menuItemsApi;

  // Refresh both collections together so populated relationships stay in sync.
  async function refresh(signal, afterMutation = false) {
    const number = ++requestNumber.current;
    setLoading(true);
    setError('');
    try {
      const [restaurants, menuItems] = await Promise.all([
        restaurantsApi.list(signal),
        menuItemsApi.list(signal),
      ]);
      if (number !== requestNumber.current || signal?.aborted) return;
      setData({ restaurants, menuItems });
      setReady(true);
    } catch (failure) {
      if (number !== requestNumber.current || signal?.aborted) return;
      setReady(false);
      setError(
        `${afterMutation ? 'Your change was saved, but the list could not refresh. Use Refresh before making another change. ' : ''}${errorMessage(failure)}`
      );
    } finally {
      if (number === requestNumber.current && !signal?.aborted)
        setLoading(false);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal);
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (deletion) deleteCancel.current?.focus();
  }, [deletion]);

  function closeEditor() {
    setEditor(null);
    addButton.current?.focus();
  }
  function changeKind(next) {
    setKind(next);
    setEditor(null);
    setDeletion(null);
    setSearch('');
    setNotice('');
  }
  async function save(body) {
    if (mutationLock.current) return;
    mutationLock.current = true;
    setPending(true);
    setError('');
    setNotice('');
    try {
      if (editor.record) await api.replace(editor.record._id, body);
      else await api.create(body);
      setNotice(`${body.name} ${editor.record ? 'updated' : 'added'}.`);
      closeEditor();
      await refresh(undefined, true);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      mutationLock.current = false;
      setPending(false);
    }
  }
  async function remove() {
    if (mutationLock.current) return;
    mutationLock.current = true;
    setPending(true);
    setError('');
    setNotice('');
    try {
      await api.remove(deletion._id);
      setNotice(`${deletion.name} deleted.`);
      setDeletion(null);
      addButton.current?.focus();
      await refresh(undefined, true);
    } catch (failure) {
      setError(errorMessage(failure));
      setDeletion(null);
      addButton.current?.focus();
    } finally {
      mutationLock.current = false;
      setPending(false);
    }
  }
  const records = (isRestaurant ? data.restaurants : data.menuItems).filter(
    (record) =>
      [
        record.name,
        isRestaurant ? record.cuisine : record.restaurant?.name,
        record.category,
      ].some((value) => value?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="/">
            Restaurant<span>Manager</span>
          </a>
          <span className="course-label">WDV353 · Full stack application</span>
        </div>
      </header>
      <main>
        <div className="page-heading">
          <div>
            <p className="eyebrow">YOUR KITCHEN, ORGANIZED</p>
            <h1>A place for every plate.</h1>
            <p className="muted">
              Manage your restaurants and the menus that bring them to life.
            </p>
          </div>
          <button disabled={busy} onClick={() => refresh()}>
            Refresh
          </button>
        </div>
        <div className="summary">
          <div>
            <strong>{data.restaurants.length}</strong>
            <span>Restaurants</span>
          </div>
          <div>
            <strong>{data.menuItems.length}</strong>
            <span>Menu items</span>
          </div>
          <div>
            <strong>
              {data.restaurants.filter((record) => record.isOpen).length}
            </strong>
            <span>Currently open</span>
          </div>
        </div>
        <nav className="tabs" aria-label="Collections">
          <button
            aria-current={isRestaurant ? 'page' : undefined}
            disabled={busy}
            onClick={() => changeKind('restaurants')}
          >
            Restaurants
          </button>
          <button
            aria-current={!isRestaurant ? 'page' : undefined}
            disabled={busy}
            onClick={() => changeKind('menuItems')}
          >
            Menu items
          </button>
        </nav>
        {error && (
          <div role="alert" className="message error">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="message success">
            {notice}
          </div>
        )}
        <div className="collection-heading">
          <div>
            <h2>{isRestaurant ? 'Restaurants' : 'Menu items'}</h2>
            <p className="muted">
              {isRestaurant
                ? 'Your places, their details, and what’s on the menu.'
                : 'Every dish, connected to its restaurant.'}
            </p>
          </div>
          <button
            ref={addButton}
            className="primary"
            disabled={
              busy || !ready || (!isRestaurant && !data.restaurants.length)
            }
            onClick={() => {
              setEditor({ record: null });
              setDeletion(null);
              setError('');
              setNotice('');
            }}
          >
            + Add {noun}
          </button>
        </div>
        {!isRestaurant && ready && !data.restaurants.length && (
          <p className="message">
            Add a restaurant first, then create its menu items.
          </p>
        )}
        {deletion && (
          <section
            role="region"
            aria-label="Confirm deletion"
            className="panel delete-confirmation"
          >
            <h3>Delete {deletion.name}?</h3>
            <p>
              This permanently removes this {noun}.
              {isRestaurant && deletion.menuItems?.length > 0
                ? ' Delete its menu items first; the API will block this deletion while they exist.'
                : ''}
            </p>
            <div className="actions">
              <button
                className="danger"
                disabled={
                  busy || (isRestaurant && deletion.menuItems?.length > 0)
                }
                onClick={remove}
              >
                Confirm delete
              </button>
              <button
                ref={deleteCancel}
                disabled={busy}
                onClick={() => {
                  setDeletion(null);
                  addButton.current?.focus();
                }}
              >
                Cancel
              </button>
            </div>
          </section>
        )}
        {editor && (
          <RecordForm
            key={`${kind}-${editor.record?._id ?? 'new'}`}
            kind={kind}
            record={editor.record}
            restaurants={data.restaurants}
            busy={busy || !ready}
            onSave={save}
            onCancel={closeEditor}
          />
        )}
        <label htmlFor="search" className="search-label">
          Search {isRestaurant ? 'restaurants' : 'menu items'}
        </label>
        <input
          id="search"
          className="search"
          type="search"
          placeholder={
            isRestaurant
              ? 'Search by name or cuisine…'
              : 'Search by dish, category, or restaurant…'
          }
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div aria-busy={busy}>
          {loading && (
            <p role="status" className="empty">
              Loading records…
            </p>
          )}
          {!loading && ready && records.length === 0 && (
            <div className="panel empty">
              <h3>
                {search
                  ? 'No matching records'
                  : `No ${isRestaurant ? 'restaurants' : 'menu items'} yet`}
              </h3>
              <p>
                {search
                  ? 'Try a different search.'
                  : `Use “Add ${noun}” to create your first record.`}
              </p>
            </div>
          )}
          <RecordList
            kind={kind}
            records={records}
            busy={busy || !ready}
            onEdit={(record) => {
              setEditor({ record });
              setDeletion(null);
              setError('');
              setNotice('');
            }}
            onDelete={(record) => {
              setDeletion(record);
              setEditor(null);
              setError('');
              setNotice('');
            }}
          />
        </div>
        <footer>React + Axios · Node.js + Express · MongoDB</footer>
      </main>
    </>
  );
}
