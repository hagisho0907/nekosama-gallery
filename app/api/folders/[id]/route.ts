import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/db';
import { r2Storage } from '@/lib/r2';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const folder = await database.getFolder(id);
    if (!folder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    const photos = await database.getPhotos(id);
    
    return NextResponse.json({ 
      folder: {
        ...folder,
        photos
      }
    });

  } catch (error) {
    console.error('Get folder error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      );
    }

    const success = await database.updateFolder(id, name.trim());
    
    if (!success) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    const updatedFolder = await database.getFolder(id);
    
    return NextResponse.json({ 
      success: true, 
      folder: updatedFolder
    });

  } catch (error: any) {
    console.error('Update folder error:', error);
    
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Get all photos in the folder before deleting
    const photos = await database.getPhotos(id);
    
    // Delete photos from R2 storage
    await Promise.all(
      photos.map(photo => r2Storage.deletePhoto(photo.url))
    );

    // Delete folder from database (photos will be deleted due to CASCADE)
    const success = await database.deleteFolder(id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete folder error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}