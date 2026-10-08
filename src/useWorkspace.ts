import { useEffect, useState } from "react";
import { createSeed } from "./domain/seed.ts";
import { exportTickets, parseImport } from "./domain/tickets.ts";
const storageKey = "support-desk-workbench:v1";

function load() {
  try {
    const saved = localStorage.getItem(storageKey);
    return { tickets: saved ? parseImport(saved) : createSeed(), warning: "" };
  } catch {
    return {
      tickets: createSeed(),
      warning:
        "Saved workspace could not be loaded. Showing sample data; export a backup before closing.",
    };
  }
}
export function useWorkspace() {
  const [initial] = useState(load);
  const [tickets, setTickets] = useState(initial.tickets);
  const [storageWarning, setStorageWarning] = useState(initial.warning);
  useEffect(() => {
    // Do not overwrite an unreadable saved workspace just by opening the app.
    if (tickets === initial.tickets) return;
    try {
      localStorage.setItem(storageKey, exportTickets(tickets));
    } catch {
      queueMicrotask(() =>
        setStorageWarning(
          "Browser storage is unavailable or full. Changes work in this tab only; export a backup.",
        ),
      );
    }
  }, [tickets, initial.tickets]);
  return { tickets, setTickets, storageWarning };
}
