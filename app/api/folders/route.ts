import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/db';

export async function GET() {
  try {
    const folders = await database.getFolders();
    
    // Get photo counts for each folder
    const foldersWithCounts = await Promise.all(folders.map(async (folder) => {
      const photos = await database.getPhotos(folder.id);
      return {
        ...folder,
        photoCount: photos.length,
        photos: photos.slice(0, 3) // Get first 3 photos for thumbnails
      };
    }));

    return NextResponse.json({ folders: foldersWithCounts });
  } catch (error) {
    console.error('Get folders error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      );
    }

    const folder = await database.createFolder(name.trim());
    
    return NextResponse.json({ 
      success: true, 
      folder: {
        ...folder,
        photoCount: 0,
        photos: []
      }
    });

  } catch (error: any) {
    console.error('Create folder error:', error);
    
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return NextResponse.json(
        { error: 'Folder name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}