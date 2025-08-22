// Shared mock data for development
export let mockFolders = [
  {
    id: '1',
    name: 'ミケ',
    displayOrder: 1,
    status: 'enrolled' as const,
    photoCount: 5,
    photos: [
      { id: '1', url: '/api/placeholder/200/200?text=Cat1', originalName: 'cat1.jpg', uploadedAt: '2024-01-01T00:00:00Z' },
      { id: '2', url: '/api/placeholder/200/200?text=Cat2', originalName: 'cat2.jpg', uploadedAt: '2024-01-02T00:00:00Z' },
      { id: '3', url: '/api/placeholder/200/200?text=Cat3', originalName: 'cat3.jpg', uploadedAt: '2024-01-03T00:00:00Z' }
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'しろ',
    displayOrder: 2,
    status: 'graduated' as const,
    photoCount: 3,
    photos: [
      { id: '4', url: '/api/placeholder/200/200?text=Shiro1', originalName: 'shiro1.jpg', uploadedAt: '2024-01-04T00:00:00Z' },
      { id: '5', url: '/api/placeholder/200/200?text=Shiro2', originalName: 'shiro2.jpg', uploadedAt: '2024-01-05T00:00:00Z' }
    ],
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z'
  }
];