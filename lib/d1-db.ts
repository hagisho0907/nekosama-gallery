// Cloudflare D1 database interface
export interface CatFolder {
  id: string;
  name: string;
  displayOrder: number;
  status: 'enrolled' | 'graduated';
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

// D1 Database interface (for Cloudflare environment)
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<D1ExecResult>;
  batch(statements: D1PreparedStatement[]): Promise<D1Result<any>[]>;
}

interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first(): Promise<any>;
  all(): Promise<D1Result<any>>;
  run(): Promise<D1Result<any>>;
}

interface D1Result<T = any> {
  success: boolean;
  results: T[];
  meta: {
    changes: number;
    last_row_id: number;
    rows_read: number;
    rows_written: number;
  };
}

interface D1ExecResult {
  count: number;
  duration: number;
}

class D1DatabaseManager {
  private db: D1Database | null = null;

  constructor(database?: D1Database) {
    this.db = database || null;
  }

  setDatabase(database: D1Database) {
    this.db = database;
  }

  private ensureDatabase() {
    if (!this.db) {
      throw new Error('D1 database not initialized. Make sure you are running in Cloudflare environment.');
    }
    return this.db;
  }

  async getFolders(): Promise<CatFolder[]> {
    const db = this.ensureDatabase();
    
    try {
      // Try with status column first
      const result = await db.prepare(`
        SELECT id, name, display_order as displayOrder, 
               COALESCE(status, 'enrolled') as status, 
               created_at as createdAt, updated_at as updatedAt 
        FROM folders 
        ORDER BY display_order ASC, created_at DESC
      `).all();
      
      return result.results as CatFolder[];
    } catch (error: any) {
      // Fallback to query without status column
      if (error.message?.includes('no such column: status')) {
        const result = await db.prepare(`
          SELECT id, name, display_order as displayOrder, 
                 'enrolled' as status,
                 created_at as createdAt, updated_at as updatedAt 
          FROM folders 
          ORDER BY display_order ASC, created_at DESC
        `).all();
        
        return result.results as CatFolder[];
      } else {
        throw error;
      }
    }
  }

  async getFolder(id: string): Promise<CatFolder | null> {
    const db = this.ensureDatabase();
    
    try {
      // Try with status column first
      const result = await db.prepare(`
        SELECT id, name, display_order as displayOrder, 
               COALESCE(status, 'enrolled') as status, 
               created_at as createdAt, updated_at as updatedAt 
        FROM folders 
        WHERE id = ?
      `).bind(id).first();
      
      return result as CatFolder | null;
    } catch (error: any) {
      // Fallback to query without status column
      if (error.message?.includes('no such column: status')) {
        const result = await db.prepare(`
          SELECT id, name, display_order as displayOrder, 
                 'enrolled' as status,
                 created_at as createdAt, updated_at as updatedAt 
          FROM folders 
          WHERE id = ?
        `).bind(id).first();
        
        return result as CatFolder | null;
      } else {
        throw error;
      }
    }
  }

  async createFolder(name: string): Promise<CatFolder> {
    const db = this.ensureDatabase();
    
    const id = Date.now().toString();
    const now = new Date().toISOString();
    
    // Get max display_order and add 1
    const maxOrderResult = await db.prepare(`
      SELECT COALESCE(MAX(display_order), 0) + 1 as nextOrder 
      FROM folders
    `).first();
    const displayOrder = (maxOrderResult as any)?.nextOrder || 1;
    
    // Try to insert with status column, fallback to without if it doesn't exist
    try {
      await db.prepare(`
        INSERT INTO folders (id, name, display_order, status, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(id, name, displayOrder, 'enrolled', now, now).run();
    } catch (error: any) {
      // If status column doesn't exist, insert without it
      if (error.message?.includes('no such column: status')) {
        await db.prepare(`
          INSERT INTO folders (id, name, display_order, created_at, updated_at) 
          VALUES (?, ?, ?, ?, ?)
        `).bind(id, name, displayOrder, now, now).run();
      } else {
        throw error;
      }
    }

    return {
      id,
      name,
      displayOrder,
      status: 'enrolled',
      createdAt: now,
      updatedAt: now
    };
  }

  async updateFolder(id: string, name: string): Promise<boolean> {
    const db = this.ensureDatabase();
    
    const now = new Date().toISOString();
    
    const result = await db.prepare(`
      UPDATE folders 
      SET name = ?, updated_at = ? 
      WHERE id = ?
    `).bind(name, now, id).run();

    return result.meta.changes > 0;
  }

  async updateFolderStatus(id: string, status: 'enrolled' | 'graduated'): Promise<boolean> {
    const db = this.ensureDatabase();
    
    const now = new Date().toISOString();
    
    try {
      const result = await db.prepare(`
        UPDATE folders 
        SET status = ?, updated_at = ? 
        WHERE id = ?
      `).bind(status, now, id).run();

      return result.meta.changes > 0;
    } catch (error: any) {
      // If status column doesn't exist, just update the updated_at timestamp
      if (error.message?.includes('no such column: status')) {
        const result = await db.prepare(`
          UPDATE folders 
          SET updated_at = ? 
          WHERE id = ?
        `).bind(now, id).run();
        
        return result.meta.changes > 0;
      } else {
        throw error;
      }
    }
  }

  async updateFolderOrder(folderIds: string[]): Promise<boolean> {
    const db = this.ensureDatabase();
    
    try {
      // Update display_order for each folder
      for (let i = 0; i < folderIds.length; i++) {
        await db.prepare(`
          UPDATE folders 
          SET display_order = ?, updated_at = ? 
          WHERE id = ?
        `).bind(i + 1, new Date().toISOString(), folderIds[i]).run();
      }
      return true;
    } catch (error) {
      console.error('Error updating folder order:', error);
      return false;
    }
  }

  async deleteFolder(id: string): Promise<boolean> {
    const db = this.ensureDatabase();
    
    const result = await db.prepare('DELETE FROM folders WHERE id = ?').bind(id).run();
    return result.meta.changes > 0;
  }

  async getPhotos(folderId: string): Promise<CatPhoto[]> {
    const db = this.ensureDatabase();
    
    const result = await db.prepare(`
      SELECT id, folder_id as folderId, filename, original_name as originalName, 
             url, uploaded_at as uploadedAt
      FROM photos 
      WHERE folder_id = ? 
      ORDER BY uploaded_at DESC
    `).bind(folderId).all();
    
    return result.results as CatPhoto[];
  }

  async addPhoto(photo: Omit<CatPhoto, 'id' | 'uploadedAt'>): Promise<CatPhoto> {
    const db = this.ensureDatabase();
    
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const uploadedAt = new Date().toISOString();

    await db.prepare(`
      INSERT INTO photos (id, folder_id, filename, original_name, url, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, photo.folderId, photo.filename, photo.originalName, photo.url, uploadedAt).run();

    return {
      id,
      ...photo,
      uploadedAt
    };
  }

  async deletePhoto(id: string): Promise<boolean> {
    const db = this.ensureDatabase();
    
    const result = await db.prepare('DELETE FROM photos WHERE id = ?').bind(id).run();
    return result.meta.changes > 0;
  }
}

// Global instance
export const d1Database = new D1DatabaseManager();

// Helper function to initialize D1 database in Cloudflare environment
export function initializeD1Database(database: D1Database) {
  d1Database.setDatabase(database);
}