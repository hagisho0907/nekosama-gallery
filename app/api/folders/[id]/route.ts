// Development API route for individual folders
import { NextRequest, NextResponse } from 'next/server';
import { mockFolders } from '../../mock-data';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const folder = mockFolders.find(f => f.id === id);
    if (!folder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      folder: {
        ...folder,
        photoCount: folder.photos.length
      },
      photos: folder.photos || []
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const requestData = await request.json();
    const { name, status } = requestData;

    const folderIndex = mockFolders.findIndex(f => f.id === id);
    if (folderIndex === -1) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    // Check if updating name
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return NextResponse.json(
          { error: 'Folder name is required' },
          { status: 400 }
        );
      }

      // Check if new name already exists (excluding current folder)
      const existingFolder = mockFolders.find(f => f.name === name.trim() && f.id !== id);
      if (existingFolder) {
        return NextResponse.json(
          { error: 'Folder name already exists' },
          { status: 409 }
        );
      }

      mockFolders[folderIndex].name = name.trim();
    }

    // Check if updating status
    if (status !== undefined) {
      if (!['enrolled', 'graduated'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be "enrolled" or "graduated"' },
          { status: 400 }
        );
      }

      mockFolders[folderIndex].status = status;
    }

    mockFolders[folderIndex].updatedAt = new Date().toISOString();

    return NextResponse.json({ 
      success: true, 
      folder: mockFolders[folderIndex]
    });
  } catch (error) {
    console.error('Update folder error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const folderIndex = mockFolders.findIndex(f => f.id === id);
    if (folderIndex === -1) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    // Remove folder from mock data
    mockFolders.splice(folderIndex, 1);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete folder error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}