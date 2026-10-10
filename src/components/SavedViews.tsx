import { useEffect, useRef, useState } from "react";
import { addView, readViews, viewsKey } from "../domain/views.ts";
import type { QueueView } from "../domain/views.ts";
import { readFilters, writeFilters } from "../domain/tickets.ts";
import type { Filters } from "../domain/tickets.ts";

function load() {
  try {
    return { views: readViews(localStorage.getItem(viewsKey)), error: "" };
  } catch {
    return { views: [] as QueueView[], error: "Saved views could not be loaded. Existing data has been kept." };
  }
}

export function SavedViews({ filters, onApply }: {
  filters: Filters;
  onApply: (filters: Filters) => void;
}) {
  const [state, setState] = useState(load);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const selectRef = useRef<HTMLSelectElement>(null);
  const search = writeFilters(filters);
  const active = state.views.find(view => view.search === search);
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea === localStorage && (event.key === viewsKey || event.key === null)) {
        setState(load());
        setMessage("Saved views updated from another tab.");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function persist(change: (views: QueueView[]) => QueueView[], success: string) {
    try {
      // Refresh before editing instead of saving the tab's possibly stale list.
      const views = change(readViews(localStorage.getItem(viewsKey)));
      localStorage.setItem(viewsKey, JSON.stringify({ version: 1, views }));
      setState({ views, error: "" });
      setMessage(success);
      return true;
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Storage is unavailable.";
      setState(current => ({ ...current, error: `Could not save views. ${detail}` }));
      setMessage("");
      return false;
    }
  }

  return (
    <div className="saved-views">
      <div className="saved-views-controls">
        <label htmlFor="saved-view">Saved view</label>
        <select id="saved-view" ref={selectRef} value={active?.name ?? ""}
          onChange={event => {
            const view = state.views.find(item => item.name === event.target.value);
            if (view) {
              onApply(readFilters(view.search));
              setMessage(`Applied ${view.name}.`);
            }
          }}>
          <option value="" disabled>Choose a view</option>
          {state.views.map(view => <option key={view.name} value={view.name}>{view.name}</option>)}
        </select>
        <button disabled={!active} aria-label={active ? `Remove saved view ${active.name}` : "Remove saved view"}
          onClick={() => {
            if (active && persist(views => views.filter(view => view.name !== active.name), `Removed ${active.name}.`)) {
              selectRef.current?.focus();
            }
          }}>Remove</button>
        <form onSubmit={event => {
          event.preventDefault();
          if (persist(views => addView(views, name, filters), `Saved ${name.trim()}.`)) setName("");
        }}>
          <label className="sr-only" htmlFor="view-name">New view name</label>
          <input id="view-name" value={name} maxLength={40} placeholder="Name current filters…"
            onChange={event => setName(event.target.value)} required />
          <button type="submit">Save view</button>
        </form>
      </div>
      {state.error && <p role="alert" className="view-error">{state.error}</p>}
      <span className="sr-only" role="status">{message}</span>
    </div>
  );
}
