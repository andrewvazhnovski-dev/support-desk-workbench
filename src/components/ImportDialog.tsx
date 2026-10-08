import { useEffect, useRef, useState } from "react";
import { parseImport } from "../domain/tickets.ts";
import type { Ticket } from "../domain/tickets.ts";
export function ImportDialog({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (tickets: Ticket[]) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="import-heading">
      <div className="dialog-body">
        <h2 id="import-heading">Restore workspace</h2>
        <p>
          Paste exported JSON. This replaces all tickets in this browser. Export
          a backup first if you want to keep your current changes.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            try {
              onImport(parseImport(text));
              ref.current?.close();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Import failed.");
            }
          }}
        >
          <label htmlFor="import-json">Workspace JSON</label>
          <textarea
            autoFocus
            id="import-json"
            value={text}
            maxLength={2_000_001}
            onChange={(e) => {
              setText(e.target.value);
              setError("");
            }}
            rows={8}
            spellCheck={false}
          />
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <button type="button" onClick={() => ref.current?.close()}>
              Cancel
            </button>
            <button className="primary" disabled={!text.trim()}>
              Replace workspace
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
