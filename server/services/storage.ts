import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..", "..", "data");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getFilePath(collection: string): string {
  return path.join(DATA_DIR, `${collection}.json`);
}

function readCollection<T = any>(collection: string): T[] {
  const filePath = getFilePath(collection);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return [];
  }
}

function writeCollection<T = any>(collection: string, data: T[]): void {
  fs.writeFileSync(getFilePath(collection), JSON.stringify(data, null, 2));
}

function addItem<T extends { id?: string }>(collection: string, item: T): T & { id: string } {
  const items = readCollection(collection);
  const newItem = { ...item, id: item.id || crypto.randomUUID(), createdAt: new Date().toISOString() };
  items.push(newItem);
  writeCollection(collection, items);
  return newItem as T & { id: string };
}

function updateItem<T extends { id: string }>(collection: string, id: string, updates: Partial<T>): T | null {
  const items = readCollection<any>(collection);
  const index = items.findIndex((item: any) => item.id === id);
  if (index === -1) return null;
  items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
  writeCollection(collection, items);
  return items[index];
}

function deleteItem(collection: string, id: string): boolean {
  const items = readCollection(collection);
  const filtered = items.filter((item: any) => item.id !== id);
  if (filtered.length === items.length) return false;
  writeCollection(collection, filtered);
  return true;
}

function getItem<T = any>(collection: string, id: string): T | null {
  const items = readCollection<any>(collection);
  return items.find((item: any) => item.id === id) || null;
}

// Named export matching what the routes expect
const storage = {
  read: readCollection,
  write: writeCollection,
  add: addItem,
  update: updateItem,
  delete: deleteItem,
  get: getItem,
  // Aliases used by admin routes
  getCollection: readCollection,
  addToCollection: addItem,
  updateInCollection: updateItem,
  deleteFromCollection: deleteItem,
};

export { storage };
export default storage;
