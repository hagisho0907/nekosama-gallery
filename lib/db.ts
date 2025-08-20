import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH || './data/gallery.db';
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

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

class Database {
  private db: any = null;

  async init() {
    if (!this.db) {
      this.db = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });

      await this.createTables();
    }
    return this.db;
  }

  private async createTables() {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.db.exec(`
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

    await this.db.exec(`
      INSERT OR IGNORE INTO folders (id, name) VALUES 
      ('1', 'ミケ'),
      ('2', 'しろ')
    `);
  }

  async getFolders(): Promise<CatFolder[]> {
    const db = await this.init();
    return await db.all(`
      SELECT id, name, created_at as createdAt, updated_at as updatedAt 
      FROM folders 
      ORDER BY created_at DESC
    `);
  }

  async getFolder(id: string): Promise<CatFolder | null> {
    const db = await this.init();
    return await db.get(`
      SELECT id, name, created_at as createdAt, updated_at as updatedAt 
      FROM folders 
      WHERE id = ?
    `, [id]);
  }

  async createFolder(name: string): Promise<CatFolder> {
    const db = await this.init();
    const id = Date.now().toString();
    const now = new Date().toISOString();
    
    await db.run(`
      INSERT INTO folders (id, name, created_at, updated_at) 
      VALUES (?, ?, ?, ?)
    `, [id, name, now, now]);

    return {
      id,
      name,
      createdAt: now,
      updatedAt: now
    };
  }

  async updateFolder(id: string, name: string): Promise<boolean> {
    const db = await this.init();
    const now = new Date().toISOString();
    
    const result = await db.run(`
      UPDATE folders 
      SET name = ?, updated_at = ? 
      WHERE id = ?
    `, [name, now, id]);

    return result.changes > 0;
  }

  async deleteFolder(id: string): Promise<boolean> {
    const db = await this.init();
    const result = await db.run('DELETE FROM folders WHERE id = ?', [id]);
    return result.changes > 0;
  }

  async getPhotos(folderId: string): Promise<CatPhoto[]> {
    const db = await this.init();
    return await db.all(`
      SELECT id, folder_id as folderId, filename, original_name as originalName, 
             url, uploaded_at as uploadedAt
      FROM photos 
      WHERE folder_id = ? 
      ORDER BY uploaded_at DESC
    `, [folderId]);
  }

  async addPhoto(photo: Omit<CatPhoto, 'id' | 'uploadedAt'>): Promise<CatPhoto> {
    const db = await this.init();
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const uploadedAt = new Date().toISOString();

    await db.run(`
      INSERT INTO photos (id, folder_id, filename, original_name, url, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, photo.folderId, photo.filename, photo.originalName, photo.url, uploadedAt]);

    return {
      id,
      ...photo,
      uploadedAt
    };
  }

  async deletePhoto(id: string): Promise<boolean> {
    const db = await this.init();
    const result = await db.run('DELETE FROM photos WHERE id = ?', [id]);
    return result.changes > 0;
  }
}

export const database = new Database();