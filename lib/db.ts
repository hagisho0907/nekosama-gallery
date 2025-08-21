import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { memoryDatabase } from './memory-db';
import { d1Database, initializeD1Database } from './d1-db';

const dbPath = process.env.DATABASE_PATH || './data/gallery.db';
const dbDir = path.dirname(dbPath);

// Check if we can use file system (for local development) or need to use memory DB (for Vercel)
const canUseFileSystem = () => {
  try {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    return true;
  } catch {
    return false;
  }
};

export interface CatFolder {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CatPhoto {
  id: string;
  folderId: string;
  filename: string;
  originalName: string;
  url: string;
  uploadedAt: string;
}

class DatabaseManager {
  private db: Database.Database | null = null;
  private useMemoryDB = false;
  private useD1DB = false;

  init() {
    try {
      // Check if we're in Cloudflare environment (D1 available)
      if (typeof process !== 'undefined' && process.env.CF_PAGES) {
        console.log('Using Cloudflare D1 database');
        this.useD1DB = true;
        return null; // We'll use d1Database instead
      }

      if (!canUseFileSystem()) {
        console.log('Using memory database (Vercel serverless environment)');
        this.useMemoryDB = true;
        return null; // We'll use memoryDatabase instead
      }

      if (!this.db) {
        this.db = new Database(dbPath);
        this.createTables();
      }
      return this.db;
    } catch (error) {
      console.log('Failed to initialize file database, falling back to memory database:', error);
      this.useMemoryDB = true;
      return null;
    }
  }

  // Initialize D1 database for Cloudflare environments
  initD1(d1Instance: any) {
    this.useD1DB = true;
    initializeD1Database(d1Instance);
  }

  private createTables() {
    if (!this.db) return;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS photos (
        id TEXT PRIMARY KEY,
        folder_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        url TEXT NOT NULL,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES folders (id) ON DELETE CASCADE
      )
    `);

    this.db.exec(`
      INSERT OR IGNORE INTO folders (id, name) VALUES 
      ('1', 'ミケ'),
      ('2', 'しろ')
    `);
  }

  async getFolders(): Promise<CatFolder[]> {
    this.init();
    
    if (this.useD1DB) {
      return await d1Database.getFolders();
    }

    if (this.useMemoryDB) {
      return memoryDatabase.getFolders();
    }

    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare(`
      SELECT id, name, created_at as createdAt, updated_at as updatedAt 
      FROM folders 
      ORDER BY created_at DESC
    `);
    return stmt.all() as CatFolder[];
  }

  async getFolder(id: string): Promise<CatFolder | null> {
    this.init();
    
    if (this.useD1DB) {
      return await d1Database.getFolder(id);
    }

    if (this.useMemoryDB) {
      return memoryDatabase.getFolder(id);
    }

    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare(`
      SELECT id, name, created_at as createdAt, updated_at as updatedAt 
      FROM folders 
      WHERE id = ?
    `);
    return stmt.get(id) as CatFolder | null;
  }

  async createFolder(name: string): Promise<CatFolder> {
    this.init();
    
    if (this.useD1DB) {
      return await d1Database.createFolder(name);
    }

    if (this.useMemoryDB) {
      return memoryDatabase.createFolder(name);
    }

    if (!this.db) throw new Error('Database not initialized');
    
    const id = Date.now().toString();
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO folders (id, name, created_at, updated_at) 
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(id, name, now, now);

    return {
      id,
      name,
      createdAt: now,
      updatedAt: now
    };
  }

  async updateFolder(id: string, name: string): Promise<boolean> {
    this.init();
    
    if (this.useD1DB) {
      return await d1Database.updateFolder(id, name);
    }

    if (this.useMemoryDB) {
      return memoryDatabase.updateFolder(id, name);
    }

    if (!this.db) throw new Error('Database not initialized');
    
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      UPDATE folders 
      SET name = ?, updated_at = ? 
      WHERE id = ?
    `);
    const result = stmt.run(name, now, id);

    return result.changes > 0;
  }

  async deleteFolder(id: string): Promise<boolean> {
    this.init();
    
    if (this.useD1DB) {
      return await d1Database.deleteFolder(id);
    }

    if (this.useMemoryDB) {
      return memoryDatabase.deleteFolder(id);
    }

    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare('DELETE FROM folders WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async getPhotos(folderId: string): Promise<CatPhoto[]> {
    this.init();
    
    if (this.useD1DB) {
      return await d1Database.getPhotos(folderId);
    }

    if (this.useMemoryDB) {
      return memoryDatabase.getPhotos(folderId);
    }

    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare(`
      SELECT id, folder_id as folderId, filename, original_name as originalName, 
             url, uploaded_at as uploadedAt
      FROM photos 
      WHERE folder_id = ? 
      ORDER BY uploaded_at DESC
    `);
    return stmt.all(folderId) as CatPhoto[];
  }

  async addPhoto(photo: Omit<CatPhoto, 'id' | 'uploadedAt'>): Promise<CatPhoto> {
    this.init();
    
    if (this.useD1DB) {
      return await d1Database.addPhoto(photo);
    }

    if (this.useMemoryDB) {
      return memoryDatabase.addPhoto(photo);
    }

    if (!this.db) throw new Error('Database not initialized');
    
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const uploadedAt = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO photos (id, folder_id, filename, original_name, url, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, photo.folderId, photo.filename, photo.originalName, photo.url, uploadedAt);

    return {
      id,
      ...photo,
      uploadedAt
    };
  }

  async deletePhoto(id: string): Promise<boolean> {
    this.init();
    
    if (this.useD1DB) {
      return await d1Database.deletePhoto(id);
    }

    if (this.useMemoryDB) {
      return memoryDatabase.deletePhoto(id);
    }

    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare('DELETE FROM photos WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
}

export const database = new DatabaseManager();