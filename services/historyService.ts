
import { AdProject } from "../types";

const HISTORY_KEY = 'adgenius_history_v1';
const MAX_ITEMS = 3;

// Strip images from a project to save storage space
const stripImages = (project: AdProject): AdProject => ({
  ...project,
  slides: project.slides.map(s => ({ ...s, backgroundImageUrl: null }))
});

export const getHistory = (userId: string = 'default'): AdProject[] => {
  try {
    const raw = localStorage.getItem(`${HISTORY_KEY}_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load history", e);
    return [];
  }
};

export const saveToHistory = (project: AdProject, userId: string = 'default'): AdProject[] => {
  try {
    const current = getHistory(userId);
    const filtered = current.filter(p => p.id !== project.id);
    const updated = [project, ...filtered].slice(0, MAX_ITEMS);
    
    const key = `${HISTORY_KEY}_${userId}`;

    // Try saving with full images first
    try {
      localStorage.setItem(key, JSON.stringify(updated));
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
          localStorage.setItem(key, JSON.stringify(allStripped));
          return allStripped;
        } catch (e) {
          console.error("Critical storage error — clearing history");
          try {
            localStorage.setItem(key, JSON.stringify([project]));
          } catch { localStorage.removeItem(key); }
          return [project];
        }
      }
    }
  } catch (e) {
    console.error("Failed to save history", e);
    return [];
  }
};



export const deleteFromHistory = (id: string, userId: string = 'default'): AdProject[] => {
  const current = getHistory(userId);
  const updated = current.filter(p => p.id !== id);
  try {
    localStorage.setItem(`${HISTORY_KEY}_${userId}`, JSON.stringify(updated));
  } catch { /* ignore */ }
  return updated;
};
