const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { initSchema, seedAgents, seedProviders } = require('./schema');

let dbInstance = null;
let SQL = null;
let dbPath = null;

// Save database to disk
function saveDb() {
  if (!dbInstance || !dbPath) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (err) {
    console.error('Failed to persist database to disk:', err.message);
  }
}

// Convert SQLite query format (? placeholders) and return objects matching better-sqlite3 API
class PreparedStatement {
  constructor(sql, db) {
    this.sql = sql;
    this.db = db;
  }

  run(...params) {
    // Normalize params if passed as single array
    const actualParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    try {
      this.db.run(this.sql, actualParams);
      saveDb();
      return { changes: this.db.getRowsModified() };
    } catch (err) {
      console.error('SQL run error on:', this.sql, 'params:', actualParams, err.message);
      throw err;
    }
  }

  get(...params) {
    const actualParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    try {
      const stmt = this.db.prepare(this.sql);
      stmt.bind(actualParams);
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
      }
      stmt.free();
      return undefined;
    } catch (err) {
      console.error('SQL get error on:', this.sql, err.message);
      throw err;
    }
  }

  all(...params) {
    const actualParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const results = [];
    try {
      const stmt = this.db.prepare(this.sql);
      stmt.bind(actualParams);
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    } catch (err) {
      console.error('SQL all error on:', this.sql, err.message);
      throw err;
    }
  }
}

class DatabaseWrapper {
  constructor(rawDb) {
    this.rawDb = rawDb;
  }

  prepare(sql) {
    return new PreparedStatement(sql, this.rawDb);
  }

  exec(sql) {
    this.rawDb.exec(sql);
    saveDb();
  }

  export() {
    return this.rawDb.export();
  }

  close() {
    saveDb();
    this.rawDb.close();
  }

  pragma(p) {
    try {
      this.rawDb.exec(`PRAGMA ${p};`);
    } catch (e) {
      // ignore non-supported pragmas
    }
  }
}

async function initDb() {
  if (dbInstance) return dbInstance;

  const rawPath = config.paths.database || config.paths.db || path.resolve(__dirname, '../../storage/database.sqlite');
  dbPath = path.resolve(rawPath);
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  SQL = await initSqlJs();

  let rawDb;
  if (fs.existsSync(dbPath)) {
    const filebuffer = fs.readFileSync(dbPath);
    rawDb = new SQL.Database(filebuffer);
  } else {
    rawDb = new SQL.Database();
  }

  dbInstance = new DatabaseWrapper(rawDb);

  // Initialize schema & seeds
  initSchema(dbInstance);
  seedAgents(dbInstance);
  seedProviders(dbInstance);

  saveDb();
  return dbInstance;
}

function getDb() {
  if (!dbInstance) {
    // Synchronous fallback with in-memory sync initialization if already loaded, or throw informative error
    throw new Error('Database not initialized. Call await initDb() at server startup first.');
  }
  return dbInstance;
}

module.exports = { initDb, getDb, saveDb };
