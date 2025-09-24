type Property = {
  id: string;
  name?: string;
  latitude: number;
  longitude: number;
  address?: string;
};

const listeners: Array<(items: Property[]) => void> = [];
let items: Property[] = [];

export function getAll() {
  return [...items];
}

export function addProperty(p: Property) {
  items = [p, ...items];
  listeners.forEach((l) => l(getAll()));
}

export function removeProperty(id: string) {
  items = items.filter((i) => i.id !== id);
  listeners.forEach((l) => l(getAll()));
}

export function subscribe(cb: (items: Property[]) => void) {
  listeners.push(cb);
  
  cb(getAll());
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export type { Property };
