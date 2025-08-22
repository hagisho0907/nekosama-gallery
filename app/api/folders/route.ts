// Development API route for folders
import { NextRequest, NextResponse } from 'next/server';
import { mockFolders } from '../mock-data';

export async function GET() {
  try {
    // In development, return mock data
    return NextResponse.json({ 
      folders: mockFolders.map(folder => ({
        ...folder,
        photoCount: folder.photos.length
      }))
    });
  } catch (error) {
    console.error('Error fetching folders:', error);
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

    // Check if folder name already exists
    const existingFolder = mockFolders.find(f => f.name === name.trim());
    if (existingFolder) {
      return NextResponse.json(
        { error: 'Folder name already exists' },
        { status: 409 }
      );
    }

    const newFolder = {
      id: (mockFolders.length + 1).toString(),
      name: name.trim(),
      displayOrder: mockFolders.length + 1,
      status: 'enrolled' as const,
      photoCount: 0,
      photos: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockFolders.push(newFolder);

    return NextResponse.json({ 
      success: true, 
      folder: newFolder 
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}