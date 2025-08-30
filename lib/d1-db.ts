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
  isFeatured?: boolean;
  likes: number;
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
      // Try with status column first, ensure valid values
      const result = await db.prepare(`
        SELECT id, name, display_order as displayOrder, 
               CASE 
                 WHEN status IN ('enrolled', 'graduated') THEN status
                 ELSE 'enrolled'
               END as status, 
               created_at as createdAt, updated_at as updatedAt
        FROM folders 
        ORDER BY display_order ASC, created_at DESC
      `).all();
      
      return result.results as CatFolder[];
    } catch (error: any) {
      // Fallback to query without status column
      if (error.message?.includes('no column named status') || error.message?.includes('no such column: status')) {
        const result = await db.prepare(`
          SELECT id, name, display_order as displayOrder, 
                 'enrolled' as status,
                 created_at as createdAt, updated_at as updatedAt,
                 0 as isNew
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
      // Try with status column first, ensure valid values
      const result = await db.prepare(`
        SELECT id, name, display_order as displayOrder, 
               CASE 
                 WHEN status IN ('enrolled', 'graduated') THEN status
                 ELSE 'enrolled'
               END as status, 
               created_at as createdAt, updated_at as updatedAt
        FROM folders 
        WHERE id = ?
      `).bind(id).first();
      
      return result as CatFolder | null;
    } catch (error: any) {
      // Fallback to query without status column
      if (error.message?.includes('no column named status') || error.message?.includes('no such column: status')) {
        const result = await db.prepare(`
          SELECT id, name, display_order as displayOrder, 
                 'enrolled' as status,
                 created_at as createdAt, updated_at as updatedAt,
                 0 as isNew
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
      if (error.message?.includes('no column named status') || error.message?.includes('no such column: status')) {
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
      if (error.message?.includes('no column named status') || error.message?.includes('no such column: status')) {
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
    
    try {
      // Try with is_featured column first
      const result = await db.prepare(`
        SELECT id, folder_id as folderId, filename, original_name as originalName, 
               url, uploaded_at as uploadedAt, 
               CASE WHEN is_featured = 1 THEN 1 ELSE 0 END as isFeatured,
               COALESCE(likes, 0) as likes
        FROM photos 
        WHERE folder_id = ? 
        ORDER BY uploaded_at DESC
      `).bind(folderId).all();
      
      return result.results as CatPhoto[];
    } catch (error: any) {
      // Fallback to query without likes column
      if (error.message?.includes('no column named likes') || error.message?.includes('no such column: likes')) {
        try {
          const result = await db.prepare(`
            SELECT id, folder_id as folderId, filename, original_name as originalName, 
                   url, uploaded_at as uploadedAt, 
                   CASE WHEN is_featured = 1 THEN 1 ELSE 0 END as isFeatured,
                   0 as likes
            FROM photos 
            WHERE folder_id = ? 
            ORDER BY uploaded_at DESC
          `).bind(folderId).all();
          
          return result.results as CatPhoto[];
        } catch (fallbackError: any) {
          // Fallback to query without both is_featured and likes columns
          if (fallbackError.message?.includes('no column named is_featured') || fallbackError.message?.includes('no such column: is_featured')) {
            const result = await db.prepare(`
              SELECT id, folder_id as folderId, filename, original_name as originalName, 
                     url, uploaded_at as uploadedAt, 
                     0 as isFeatured,
                     0 as likes
              FROM photos 
              WHERE folder_id = ? 
              ORDER BY uploaded_at DESC
            `).bind(folderId).all();
            
            return result.results as CatPhoto[];
          } else {
            throw fallbackError;
          }
        }
      } else if (error.message?.includes('no column named is_featured') || error.message?.includes('no such column: is_featured')) {
        const result = await db.prepare(`
          SELECT id, folder_id as folderId, filename, original_name as originalName, 
                 url, uploaded_at as uploadedAt, 
                 0 as isFeatured,
                 COALESCE(likes, 0) as likes
          FROM photos 
          WHERE folder_id = ? 
          ORDER BY uploaded_at DESC
        `).bind(folderId).all();
        
        return result.results as CatPhoto[];
      } else {
        throw error;
      }
    }
  }

  async addPhoto(photo: Omit<CatPhoto, 'id' | 'uploadedAt' | 'likes'>): Promise<CatPhoto> {
    const db = this.ensureDatabase();
    
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const uploadedAt = new Date().toISOString();

    try {
      await db.prepare(`
        INSERT INTO photos (id, folder_id, filename, original_name, url, uploaded_at, likes)
        VALUES (?, ?, ?, ?, ?, ?, 0)
      `).bind(id, photo.folderId, photo.filename, photo.originalName, photo.url, uploadedAt).run();
    } catch (error: any) {
      // Fallback to insert without likes column if it doesn't exist
      if (error.message?.includes('no column named likes') || error.message?.includes('no such column: likes')) {
        await db.prepare(`
          INSERT INTO photos (id, folder_id, filename, original_name, url, uploaded_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(id, photo.folderId, photo.filename, photo.originalName, photo.url, uploadedAt).run();
      } else {
        throw error;
      }
    }

    return {
      id,
      ...photo,
      uploadedAt,
      likes: 0
    };
  }

  async incrementLikes(photoId: string): Promise<number> {
    const db = this.ensureDatabase();
    
    try {
      await db.prepare(`
        UPDATE photos SET likes = likes + 1 WHERE id = ?
      `).bind(photoId).run();

      const result = await db.prepare(`
        SELECT COALESCE(likes, 0) as likes FROM photos WHERE id = ?
      `).bind(photoId).first();
      
      return result?.likes || 0;
    } catch (error: any) {
      // If likes column doesn't exist, return 0 (can't increment)
      if (error.message?.includes('no column named likes') || error.message?.includes('no such column: likes')) {
        return 0;
      } else {
        throw error;
      }
    }
  }

  async deletePhoto(id: string): Promise<boolean> {
    const db = this.ensureDatabase();
    
    const result = await db.prepare('DELETE FROM photos WHERE id = ?').bind(id).run();
    return result.meta.changes > 0;
  }

  async getPhotoById(id: string): Promise<CatPhoto | null> {
    const db = this.ensureDatabase();
    
    try {
      // Try with is_featured column first
      const result = await db.prepare(`
        SELECT id, folder_id as folderId, filename, original_name as originalName, 
               url, uploaded_at as uploadedAt,
               CASE WHEN is_featured = 1 THEN 1 ELSE 0 END as isFeatured
        FROM photos 
        WHERE id = ?
      `).bind(id).first();
      
      return result as CatPhoto | null;
    } catch (error: any) {
      // Fallback to query without is_featured column
      if (error.message?.includes('no column named is_featured') || error.message?.includes('no such column: is_featured')) {
        const result = await db.prepare(`
          SELECT id, folder_id as folderId, filename, original_name as originalName, 
                 url, uploaded_at as uploadedAt,
                 0 as isFeatured
          FROM photos 
          WHERE id = ?
        `).bind(id).first();
        
        return result as CatPhoto | null;
      } else {
        throw error;
      }
    }
  }

  async updatePhotoFeatured(id: string, isFeatured: boolean): Promise<boolean> {
    const db = this.ensureDatabase();
    
    try {
      const result = await db.prepare(`
        UPDATE photos 
        SET is_featured = ? 
        WHERE id = ?
      `).bind(isFeatured ? 1 : 0, id).run();

      return result.meta.changes > 0;
    } catch (error: any) {
      // If is_featured column doesn't exist, we can't update it
      if (error.message?.includes('no column named is_featured') || error.message?.includes('no such column: is_featured')) {
        console.warn('is_featured column does not exist, skipping update');
        return false;
      } else {
        throw error;
      }
    }
  }

  async getFeaturedPhotos(folderId: string): Promise<CatPhoto[]> {
    const db = this.ensureDatabase();
    
    try {
      // Try with is_featured column first
      const result = await db.prepare(`
        SELECT id, folder_id as folderId, filename, original_name as originalName, 
               url, uploaded_at as uploadedAt,
               CASE WHEN is_featured = 1 THEN 1 ELSE 0 END as isFeatured
        FROM photos 
        WHERE folder_id = ? AND is_featured = 1
        ORDER BY uploaded_at DESC
        LIMIT 3
      `).bind(folderId).all();
      
      return result.results as CatPhoto[];
    } catch (error: any) {
      // Fallback: return first 3 photos if no is_featured column
      if (error.message?.includes('no column named is_featured') || error.message?.includes('no such column: is_featured')) {
        const result = await db.prepare(`
          SELECT id, folder_id as folderId, filename, original_name as originalName, 
                 url, uploaded_at as uploadedAt,
                 0 as isFeatured
          FROM photos 
          WHERE folder_id = ? 
          ORDER BY uploaded_at DESC
          LIMIT 3
        `).bind(folderId).all();
        
        return result.results as CatPhoto[];
      } else {
        throw error;
      }
    }
  }

}

// Global instance
export const d1Database = new D1DatabaseManager();

// Helper function to initialize D1 database in Cloudflare environment
export function initializeD1Database(database: D1Database) {
  d1Database.setDatabase(database);
}