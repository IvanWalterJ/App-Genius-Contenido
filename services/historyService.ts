
import { AdProject } from "../types";

const HISTORY_KEY = 'adgenius_history_v1';
const MAX_ITEMS = 5; // Conservative limit due to base64 images

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
    // Remove if exists (update scenario)
    const filtered = current.filter(p => p.id !== project.id);
    // Add to top
    const updated = [project, ...filtered].slice(0, MAX_ITEMS);
    
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch (quotaError) {
      console.warn("Storage quota exceeded, removing oldest items...");
      // Emergency trim if base64 images are huge
      const emergencyTrim = [project, ...filtered].slice(0, 2);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(emergencyTrim));
        return emergencyTrim;
      } catch (e) {
        console.error("Critical storage error");
        return filtered; // Return previous state if saving fails completely
      }
    }
    return updated;
  } catch (e) {
    console.error("Failed to save history", e);
    return [];
  }
};

export const deleteFromHistory = (id: string): AdProject[] => {
  const current = getHistory();
  const updated = current.filter(p => p.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
};
