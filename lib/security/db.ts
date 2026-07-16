import Database from 'better-sqlite3'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { DB_FILE_PATH } from './constants'

let db: Database.Database | null = null

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function ensureDbDirectory() {
  const absolute = path.join(process.cwd(), DB_FILE_PATH)
  const dir = path.dirname(absolute)
  if (!fs.existsSync(dir)) {
	fs.mkdirSync(dir, { recursive: true })
  }
  return absolute
}

function createTables(connection: Database.Database) {
  connection.exec(`
	CREATE TABLE IF NOT EXISTS users (
	  id INTEGER PRIMARY KEY AUTOINCREMENT,
	  key_id INTEGER,
	  username TEXT,
	  created_at TEXT NOT NULL DEFAULT (datetime('now')),
	  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
	);

	CREATE TABLE IF NOT EXISTS admins (
	  id INTEGER PRIMARY KEY AUTOINCREMENT,
	  key_hash TEXT NOT NULL UNIQUE,
	  key_prefix TEXT NOT NULL,
	  is_active INTEGER NOT NULL DEFAULT 1,
	  created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);

	CREATE TABLE IF NOT EXISTS keys (
	  id INTEGER PRIMARY KEY AUTOINCREMENT,
	  label TEXT,
	  key_hash TEXT NOT NULL UNIQUE,
	  key_prefix TEXT NOT NULL,
	  is_active INTEGER NOT NULL DEFAULT 1,
	  key_type TEXT NOT NULL DEFAULT 'unlimited',
	  max_uses INTEGER,
	  usage_count INTEGER NOT NULL DEFAULT 0,
	  expires_at TEXT,
	  created_by_admin_id INTEGER,
	  created_at TEXT NOT NULL DEFAULT (datetime('now')),
	  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
	);

	CREATE TABLE IF NOT EXISTS sessions (
	  id INTEGER PRIMARY KEY AUTOINCREMENT,
	  session_hash TEXT NOT NULL UNIQUE,
	  csrf_token TEXT NOT NULL,
	  role TEXT NOT NULL,
	  user_id INTEGER,
	  admin_id INTEGER,
	  key_id INTEGER,
	  ip TEXT,
	  user_agent TEXT,
	  created_at TEXT NOT NULL DEFAULT (datetime('now')),
	  expires_at TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS login_history (
	  id INTEGER PRIMARY KEY AUTOINCREMENT,
	  role TEXT,
	  user_id INTEGER,
	  admin_id INTEGER,
	  key_id INTEGER,
	  success INTEGER NOT NULL,
	  reason TEXT,
	  ip TEXT,
	  user_agent TEXT,
	  created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);

	CREATE TABLE IF NOT EXISTS logs (
	  id INTEGER PRIMARY KEY AUTOINCREMENT,
	  action TEXT NOT NULL,
	  actor_role TEXT,
	  actor_id INTEGER,
	  target_type TEXT,
	  target_id TEXT,
	  details TEXT,
	  ip TEXT,
	  created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);

	CREATE INDEX IF NOT EXISTS idx_keys_active ON keys (is_active);
	CREATE INDEX IF NOT EXISTS idx_sessions_hash ON sessions (session_hash);
	CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);
	CREATE INDEX IF NOT EXISTS idx_logs_created ON logs (created_at);
	CREATE INDEX IF NOT EXISTS idx_login_history_created ON login_history (created_at);
  `)
}

function bootstrapAdmin(connection: Database.Database) {
  const adminKey = process.env.ADMIN_KEY?.trim()
  if (!adminKey) return

  const keyHash = sha256(adminKey)
  const keyPrefix = adminKey.slice(0, 6)

  const exists = connection
	.prepare('SELECT id FROM admins WHERE key_hash = ? LIMIT 1')
	.get(keyHash) as { id: number } | undefined

  if (!exists) {
	connection
	  .prepare('INSERT INTO admins (key_hash, key_prefix, is_active) VALUES (?, ?, 1)')
	  .run(keyHash, keyPrefix)

	connection
	  .prepare(
		'INSERT INTO logs (action, actor_role, target_type, details) VALUES (?, ?, ?, ?)',
	  )
	  .run('ADMIN_BOOTSTRAP', 'system', 'admin', 'Initial admin key from ADMIN_KEY registered')
  }
}

export function getDb() {
  if (db) return db

  const dbPath = ensureDbDirectory()
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  createTables(db)
  bootstrapAdmin(db)

  return db
}
