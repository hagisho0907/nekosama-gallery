// Temporary in-memory database for Vercel deployment
// This is a fallback solution until we can implement a proper cloud database

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
  likes: number;
}

class MemoryDatabase {
  private folders: CatFolder[] = [
    {
      id: '1',
      name: 'ミケ',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      name: 'しろ',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  private photos: CatPhoto[] = [];

  getFolders(): CatFolder[] {
    return [...this.folders].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getFolder(id: string): CatFolder | null {
    return this.folders.find(f => f.id === id) || null;
  }

  createFolder(name: string): CatFolder {
    // Check if folder name already exists
    if (this.folders.some(f => f.name === name)) {
      throw new Error('SQLITE_CONSTRAINT_UNIQUE');
    }

    const id = Date.now().toString();
    const now = new Date().toISOString();
    
    const folder: CatFolder = {
      id,
      name,
      createdAt: now,
      updatedAt: now
    };

    this.folders.push(folder);
    return folder;
  }

  updateFolder(id: string, name: string): boolean {
    const index = this.folders.findIndex(f => f.id === id);
    if (index === -1) return false;

    // Check if new name conflicts with existing folders (excluding current)
    if (this.folders.some(f => f.id !== id && f.name === name)) {
      throw new Error('SQLITE_CONSTRAINT_UNIQUE');
    }

    this.folders[index] = {
      ...this.folders[index],
      name,
      updatedAt: new Date().toISOString()
    };

    return true;
  }

  deleteFolder(id: string): boolean {
    const index = this.folders.findIndex(f => f.id === id);
    if (index === -1) return false;

    // Delete associated photos
    this.photos = this.photos.filter(p => p.folderId !== id);
    
    // Delete folder
    this.folders.splice(index, 1);
    return true;
  }

  getPhotos(folderId: string): CatPhoto[] {
    return this.photos
      .filter(p => p.folderId === folderId)
      .sort((a, b) => 
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
  }

  addPhoto(photo: Omit<CatPhoto, 'id' | 'uploadedAt' | 'likes'>): CatPhoto {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const uploadedAt = new Date().toISOString();

    const newPhoto: CatPhoto = {
      id,
      ...photo,
      uploadedAt,
      likes: 0
    };

    this.photos.push(newPhoto);
    return newPhoto;
  }

  incrementLikes(photoId: string): number {
    const photo = this.photos.find(p => p.id === photoId);
    if (!photo) return 0;
    
    photo.likes = (photo.likes || 0) + 1;
    return photo.likes;
  }

  deletePhoto(id: string): boolean {
    const index = this.photos.findIndex(p => p.id === id);
    if (index === -1) return false;

    this.photos.splice(index, 1);
    return true;
  }

}

export const memoryDatabase = new MemoryDatabase();