
import { AdProject } from "../types";

const HISTORY_KEY = 'adgenius_history_v1';
const MAX_ITEMS = 3;

// Strip images from a project to save storage space
const stripImages = (project: AdProject): AdProject => ({
  ...project,
  slides: project.slides.map(s => ({ ...s, backgroundImageUrl: null }))
});

export const getHistory = (): AdProject[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load history", e);
    return [];
  }
};

export const saveToHistory = (project: AdProject): AdProject[] => {
  try {
    const current = getHistory();
    const filtered = current.filter(p => p.id !== project.id);
    const updated = [project, ...filtered].slice(0, MAX_ITEMS);

    // Try saving with full images first
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      // Quota exceeded: keep current project images, strip images from older ones
      console.warn("Storage quota exceeded — stripping images from older history items...");
      const stripped = [project, ...filtered.map(stripImages)].slice(0, MAX_ITEMS);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(stripped));
        return stripped;
      } catch {
        // Still failing: strip ALL images including current project
        console.warn("Still over quota — stripping all images...");
        const allStripped = [stripImages(project), ...filtered.map(stripImages)].slice(0, MAX_ITEMS);
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(allStripped));
          return allStripped;
        } catch (e) {
          console.error("Critical storage error — clearing history");
          try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify([project]));
          } catch { localStorage.removeItem(HISTORY_KEY); }
          return [project];
        }
      }
    }
  } catch (e) {
    console.error("Failed to save history", e);
    return [];
  }
};

export const deleteFromHistory = (id: string): AdProject[] => {
  const current = getHistory();
  const updated = current.filter(p => p.id !== id);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch { /* ignore */ }
  return updated;
};
