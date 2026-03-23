import Database from "better-sqlite3";
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

const DB_PATH = path.join(DATA_DIR, "sisg.db");

// Initialize SQLite database
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read/write performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// -------------------------------------------------------------------
// Schema: one table per known collection, plus a generic fallback
// -------------------------------------------------------------------
db.exec(`
  -- Generic document store for any collection
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT NOT NULL,
    collection TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (collection, id)
  );

  -- Index for fast collection reads
  CREATE INDEX IF NOT EXISTS idx_documents_collection ON documents(collection);

  -- Dedicated SAM.gov opportunities table with indexed columns for filtering
  CREATE TABLE IF NOT EXISTS sam_opportunities (
    id TEXT PRIMARY KEY,
    notice_id TEXT UNIQUE,
    title TEXT,
    solicitation_number TEXT,
    type TEXT,
    naics_code TEXT,
    set_aside TEXT,
    score INTEGER DEFAULT 0,
    response_deadline TEXT,
    organization TEXT,
    department TEXT,
    posted_date TEXT,
    active INTEGER DEFAULT 1,
    data TEXT NOT NULL,
    fetched_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_sam_score ON sam_opportunities(score DESC);
  CREATE INDEX IF NOT EXISTS idx_sam_naics ON sam_opportunities(naics_code);
  CREATE INDEX IF NOT EXISTS idx_sam_set_aside ON sam_opportunities(set_aside);
  CREATE INDEX IF NOT EXISTS idx_sam_deadline ON sam_opportunities(response_deadline);

  -- Dedicated contracts table
  CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY,
    title TEXT,
    client TEXT,
    value REAL DEFAULT 0,
    type TEXT,
    status TEXT DEFAULT 'bidding',
    start_date TEXT,
    end_date TEXT,
    description TEXT,
    sam_opportunity_id TEXT,
    solicitation_number TEXT,
    naics_code TEXT,
    set_aside TEXT,
    department TEXT,
    score INTEGER,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
  CREATE INDEX IF NOT EXISTS idx_contracts_sam ON contracts(sam_opportunity_id);
`);

// -------------------------------------------------------------------
// Prepared statements for performance
// -------------------------------------------------------------------
const stmts = {
  upsertDoc: db.prepare(`
    INSERT INTO documents (id, collection, data, created_at, updated_at)
    VALUES (@id, @collection, @data, @created_at, @updated_at)
    ON CONFLICT(collection, id) DO UPDATE SET data = @data, updated_at = @updated_at
  `),
  getDoc: db.prepare(`SELECT data FROM documents WHERE collection = ? AND id = ?`),
  getAllDocs: db.prepare(`SELECT data FROM documents WHERE collection = ? ORDER BY created_at DESC`),
  deleteDoc: db.prepare(`DELETE FROM documents WHERE collection = ? AND id = ?`),
  deleteCollection: db.prepare(`DELETE FROM documents WHERE collection = ?`),
  countCollection: db.prepare(`SELECT COUNT(*) as count FROM documents WHERE collection = ?`),

  // SAM opportunities
  upsertOpp: db.prepare(`
    INSERT INTO sam_opportunities (id, notice_id, title, solicitation_number, type, naics_code, set_aside, score, response_deadline, organization, department, posted_date, active, data, fetched_at)
    VALUES (@id, @notice_id, @title, @solicitation_number, @type, @naics_code, @set_aside, @score, @response_deadline, @organization, @department, @posted_date, @active, @data, @fetched_at)
    ON CONFLICT(id) DO UPDATE SET
      title = @title, score = @score, data = @data, fetched_at = @fetched_at,
      response_deadline = @response_deadline, active = @active
  `),
  getAllOpps: db.prepare(`SELECT data FROM sam_opportunities ORDER BY score DESC`),
  getOppsByScore: db.prepare(`SELECT data FROM sam_opportunities WHERE score >= ? ORDER BY score DESC LIMIT ?`),
  getOppsBySetAside: db.prepare(`SELECT data FROM sam_opportunities WHERE set_aside = ? AND score >= ? ORDER BY score DESC LIMIT ?`),
  deleteAllOpps: db.prepare(`DELETE FROM sam_opportunities`),

  // Contracts
  upsertContract: db.prepare(`
    INSERT INTO contracts (id, title, client, value, type, status, start_date, end_date, description, sam_opportunity_id, solicitation_number, naics_code, set_aside, department, score, data, created_at, updated_at)
    VALUES (@id, @title, @client, @value, @type, @status, @start_date, @end_date, @description, @sam_opportunity_id, @solicitation_number, @naics_code, @set_aside, @department, @score, @data, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      title = @title, client = @client, value = @value, type = @type, status = @status,
      start_date = @start_date, end_date = @end_date, description = @description,
      data = @data, updated_at = @updated_at
  `),
  getAllContracts: db.prepare(`SELECT data FROM contracts ORDER BY created_at DESC`),
  getContract: db.prepare(`SELECT data FROM contracts WHERE id = ?`),
  deleteContract: db.prepare(`DELETE FROM contracts WHERE id = ?`),
};

// -------------------------------------------------------------------
// Migrate existing JSON files into SQLite on first run
// -------------------------------------------------------------------
function migrateJsonToSqlite() {
  const jsonFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".json"));
  if (jsonFiles.length === 0) return;

  console.log(`[Storage] Migrating ${jsonFiles.length} JSON files to SQLite...`);

  const insertMany = db.transaction((collection: string, items: any[]) => {
    for (const item of items) {
      const id = item.id || item.noticeId || crypto.randomUUID();
      const now = new Date().toISOString();

      if (collection === "sam_opportunities") {
        stmts.upsertOpp.run({
          id,
          notice_id: item.noticeId || id,
          title: item.title || "",
          solicitation_number: item.solicitationNumber || "",
          type: item.type || "",
          naics_code: item.naicsCode || "",
          set_aside: item.setAside || "",
          score: item.score || 0,
          response_deadline: item.responseDeadline || null,
          organization: item.organization || "",
          department: item.department || "",
          posted_date: item.postedDate || "",
          active: item.active !== false ? 1 : 0,
          data: JSON.stringify({ ...item, id }),
          fetched_at: item.fetchedAt || now,
        });
      } else if (collection === "contracts") {
        stmts.upsertContract.run({
          id,
          title: item.title || "",
          client: item.client || "",
          value: item.value || 0,
          type: item.type || "",
          status: item.status || "bidding",
          start_date: item.startDate || null,
          end_date: item.endDate || null,
          description: item.description || "",
          sam_opportunity_id: item.samOpportunityId || null,
          solicitation_number: item.solicitationNumber || "",
          naics_code: item.naicsCode || "",
          set_aside: item.setAside || "",
          department: item.department || "",
          score: item.score || null,
          data: JSON.stringify({ ...item, id }),
          created_at: item.createdAt || now,
          updated_at: item.updatedAt || now,
        });
      } else {
        stmts.upsertDoc.run({
          id,
          collection,
          data: JSON.stringify({ ...item, id }),
          created_at: item.createdAt || now,
          updated_at: item.updatedAt || now,
        });
      }
    }
  });

  for (const file of jsonFiles) {
    const collection = file.replace(".json", "");
    try {
      const raw = fs.readFileSync(path.join(DATA_DIR, file), "utf-8");
      const items = JSON.parse(raw);
      if (Array.isArray(items) && items.length > 0) {
        insertMany(collection, items);
        console.log(`  ✓ ${collection}: ${items.length} records migrated`);
      }
      // Rename JSON file so we don't re-migrate
      fs.renameSync(path.join(DATA_DIR, file), path.join(DATA_DIR, `${file}.migrated`));
    } catch (err) {
      console.warn(`  ✗ ${collection}: migration failed —`, err);
    }
  }

  console.log("[Storage] Migration complete");
}

// Run migration on startup
migrateJsonToSqlite();

// -------------------------------------------------------------------
// Storage API — drop-in compatible with the old JSON-based storage
// -------------------------------------------------------------------

function readCollection<T = any>(collection: string): T[] {
  try {
    if (collection === "sam_opportunities") {
      return stmts.getAllOpps.all().map((row: any) => JSON.parse(row.data)) as T[];
    }
    if (collection === "contracts") {
      return stmts.getAllContracts.all().map((row: any) => JSON.parse(row.data)) as T[];
    }
    return stmts.getAllDocs.all(collection).map((row: any) => JSON.parse(row.data)) as T[];
  } catch (err) {
    console.error(`[Storage] read(${collection}) error:`, err);
    return [];
  }
}

function writeCollection<T = any>(collection: string, data: T[]): void {
  try {
    const writeTx = db.transaction((items: any[]) => {
      if (collection === "sam_opportunities") {
        stmts.deleteAllOpps.run();
        for (const item of items) {
          const id = item.id || item.noticeId || crypto.randomUUID();
          stmts.upsertOpp.run({
            id,
            notice_id: item.noticeId || id,
            title: item.title || "",
            solicitation_number: item.solicitationNumber || "",
            type: item.type || "",
            naics_code: item.naicsCode || "",
            set_aside: item.setAside || "",
            score: item.score || 0,
            response_deadline: item.responseDeadline || null,
            organization: item.organization || "",
            department: item.department || "",
            posted_date: item.postedDate || "",
            active: item.active !== false ? 1 : 0,
            data: JSON.stringify({ ...item, id }),
            fetched_at: item.fetchedAt || new Date().toISOString(),
          });
        }
      } else if (collection === "contracts") {
        // For contracts, don't delete all — upsert instead
        for (const item of items) {
          const id = item.id || crypto.randomUUID();
          const now = new Date().toISOString();
          stmts.upsertContract.run({
            id,
            title: item.title || "",
            client: item.client || "",
            value: item.value || 0,
            type: item.type || "",
            status: item.status || "bidding",
            start_date: item.startDate || null,
            end_date: item.endDate || null,
            description: item.description || "",
            sam_opportunity_id: item.samOpportunityId || null,
            solicitation_number: item.solicitationNumber || "",
            naics_code: item.naicsCode || "",
            set_aside: item.setAside || "",
            department: item.department || "",
            score: item.score || null,
            data: JSON.stringify({ ...item, id }),
            created_at: item.createdAt || now,
            updated_at: now,
          });
        }
      } else {
        stmts.deleteCollection.run(collection);
        for (const item of items as any[]) {
          const id = item.id || crypto.randomUUID();
          const now = new Date().toISOString();
          stmts.upsertDoc.run({
            id,
            collection,
            data: JSON.stringify({ ...item, id }),
            created_at: item.createdAt || now,
            updated_at: now,
          });
        }
      }
    });
    writeTx(data);
  } catch (err) {
    console.error(`[Storage] write(${collection}) error:`, err);
  }
}

function addItem<T extends { id?: string }>(collection: string, item: T): T & { id: string } {
  const id = item.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const newItem = { ...item, id, createdAt: (item as any).createdAt || now } as T & { id: string };

  try {
    if (collection === "contracts") {
      stmts.upsertContract.run({
        id,
        title: (newItem as any).title || "",
        client: (newItem as any).client || "",
        value: (newItem as any).value || 0,
        type: (newItem as any).type || "",
        status: (newItem as any).status || "bidding",
        start_date: (newItem as any).startDate || null,
        end_date: (newItem as any).endDate || null,
        description: (newItem as any).description || "",
        sam_opportunity_id: (newItem as any).samOpportunityId || null,
        solicitation_number: (newItem as any).solicitationNumber || "",
        naics_code: (newItem as any).naicsCode || "",
        set_aside: (newItem as any).setAside || "",
        department: (newItem as any).department || "",
        score: (newItem as any).score || null,
        data: JSON.stringify(newItem),
        created_at: now,
        updated_at: now,
      });
    } else if (collection === "sam_opportunities") {
      stmts.upsertOpp.run({
        id,
        notice_id: (newItem as any).noticeId || id,
        title: (newItem as any).title || "",
        solicitation_number: (newItem as any).solicitationNumber || "",
        type: (newItem as any).type || "",
        naics_code: (newItem as any).naicsCode || "",
        set_aside: (newItem as any).setAside || "",
        score: (newItem as any).score || 0,
        response_deadline: (newItem as any).responseDeadline || null,
        organization: (newItem as any).organization || "",
        department: (newItem as any).department || "",
        posted_date: (newItem as any).postedDate || "",
        active: (newItem as any).active !== false ? 1 : 0,
        data: JSON.stringify(newItem),
        fetched_at: (newItem as any).fetchedAt || now,
      });
    } else {
      stmts.upsertDoc.run({
        id,
        collection,
        data: JSON.stringify(newItem),
        created_at: now,
        updated_at: now,
      });
    }
  } catch (err) {
    console.error(`[Storage] add(${collection}) error:`, err);
  }

  return newItem;
}

function updateItem<T extends { id: string }>(collection: string, id: string, updates: Partial<T>): T | null {
  try {
    // Read existing item
    let existing: any = null;
    if (collection === "contracts") {
      const row = stmts.getContract.get(id) as any;
      if (row) existing = JSON.parse(row.data);
    } else if (collection === "sam_opportunities") {
      const rows = stmts.getAllOpps.all() as any[];
      const row = rows.find((r: any) => JSON.parse(r.data).id === id);
      if (row) existing = JSON.parse(row.data);
    } else {
      const row = stmts.getDoc.get(collection, id) as any;
      if (row) existing = JSON.parse(row.data);
    }

    if (!existing) return null;

    const now = new Date().toISOString();
    const merged = { ...existing, ...updates, updatedAt: now };

    if (collection === "contracts") {
      stmts.upsertContract.run({
        id,
        title: merged.title || "",
        client: merged.client || "",
        value: merged.value || 0,
        type: merged.type || "",
        status: merged.status || "bidding",
        start_date: merged.startDate || null,
        end_date: merged.endDate || null,
        description: merged.description || "",
        sam_opportunity_id: merged.samOpportunityId || null,
        solicitation_number: merged.solicitationNumber || "",
        naics_code: merged.naicsCode || "",
        set_aside: merged.setAside || "",
        department: merged.department || "",
        score: merged.score || null,
        data: JSON.stringify(merged),
        created_at: merged.createdAt || now,
        updated_at: now,
      });
    } else if (collection === "sam_opportunities") {
      stmts.upsertOpp.run({
        id,
        notice_id: merged.noticeId || id,
        title: merged.title || "",
        solicitation_number: merged.solicitationNumber || "",
        type: merged.type || "",
        naics_code: merged.naicsCode || "",
        set_aside: merged.setAside || "",
        score: merged.score || 0,
        response_deadline: merged.responseDeadline || null,
        organization: merged.organization || "",
        department: merged.department || "",
        posted_date: merged.postedDate || "",
        active: merged.active !== false ? 1 : 0,
        data: JSON.stringify(merged),
        fetched_at: merged.fetchedAt || now,
      });
    } else {
      stmts.upsertDoc.run({
        id,
        collection,
        data: JSON.stringify(merged),
        created_at: merged.createdAt || now,
        updated_at: now,
      });
    }

    return merged as T;
  } catch (err) {
    console.error(`[Storage] update(${collection}, ${id}) error:`, err);
    return null;
  }
}

function deleteItem(collection: string, id: string): boolean {
  try {
    if (collection === "contracts") {
      const result = stmts.deleteContract.run(id);
      return result.changes > 0;
    }
    const result = stmts.deleteDoc.run(collection, id);
    return result.changes > 0;
  } catch (err) {
    console.error(`[Storage] delete(${collection}, ${id}) error:`, err);
    return false;
  }
}

function getItem<T = any>(collection: string, id: string): T | null {
  try {
    if (collection === "contracts") {
      const row = stmts.getContract.get(id) as any;
      return row ? JSON.parse(row.data) : null;
    }
    const row = stmts.getDoc.get(collection, id) as any;
    return row ? JSON.parse(row.data) : null;
  } catch (err) {
    console.error(`[Storage] get(${collection}, ${id}) error:`, err);
    return null;
  }
}

// -------------------------------------------------------------------
// Enhanced query methods for SAM.gov opportunities
// -------------------------------------------------------------------
function queryOpportunities(options?: { minScore?: number; setAside?: string; limit?: number }) {
  try {
    const minScore = options?.minScore || 0;
    const limit = options?.limit || 50;

    if (options?.setAside) {
      return stmts.getOppsBySetAside.all(options.setAside, minScore, limit)
        .map((row: any) => JSON.parse(row.data));
    }
    if (minScore > 0) {
      return stmts.getOppsByScore.all(minScore, limit)
        .map((row: any) => JSON.parse(row.data));
    }
    return stmts.getAllOpps.all()
      .slice(0, limit)
      .map((row: any) => JSON.parse(row.data));
  } catch (err) {
    console.error("[Storage] queryOpportunities error:", err);
    return [];
  }
}

function getDbStats() {
  try {
    const oppCount = db.prepare("SELECT COUNT(*) as count FROM sam_opportunities").get() as any;
    const contractCount = db.prepare("SELECT COUNT(*) as count FROM contracts").get() as any;
    const docCount = db.prepare("SELECT collection, COUNT(*) as count FROM documents GROUP BY collection").all();
    return {
      sam_opportunities: oppCount?.count || 0,
      contracts: contractCount?.count || 0,
      collections: docCount,
      db_size_bytes: fs.statSync(DB_PATH).size,
    };
  } catch {
    return { sam_opportunities: 0, contracts: 0, collections: [], db_size_bytes: 0 };
  }
}

// -------------------------------------------------------------------
// Export — same API surface as old JSON storage + new query methods
// -------------------------------------------------------------------
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
  // New SQLite-specific methods
  queryOpportunities,
  getDbStats,
  db, // expose raw db for advanced queries
};

export { storage };
export default storage;
