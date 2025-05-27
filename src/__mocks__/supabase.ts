// src/__mocks__/supabase.ts

const mockSubscription = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockReturnThis(),
  unsubscribe: jest.fn().mockResolvedValue('ok'),
};

const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockReturnThis(),
  unsubscribe: jest.fn().mockResolvedValue('ok'),
};

const mockSupabaseClient = {
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  order: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
  single: jest.fn(() => mockSupabaseClient),
  upsert: jest.fn(() => mockSupabaseClient),
  delete: jest.fn(() => mockSupabaseClient),
  channel: jest.fn(() => mockChannel), // Use the more detailed mockChannel
  removeChannel: jest.fn(),
  auth: {
    getSession: jest.fn(() => Promise.resolve({ data: { session: { user: { id: 'test-user' } } }, error: null })),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    signOut: jest.fn(() => Promise.resolve({ error: null })),
  },
  storage: {
    from: jest.fn(() => mockSupabaseClient),
    remove: jest.fn(() => Promise.resolve({ data: {}, error: null })),
    // Add other storage methods if needed, e.g., upload
    upload: jest.fn(() => Promise.resolve({ data: { path: 'mock/path.jpg' }, error: null })),
  },
  // Mocked promise-like methods for query execution
  then: jest.fn((callback) => callback({ data: [], error: null })), // Default then for generic queries
  // Mock specific data shapes or errors by re-mocking parts of this in tests
};

// Helper to reset all mocks between tests
export const resetSupabaseMocks = () => {
  mockSupabaseClient.from.mockClear().mockReturnThis();
  mockSupabaseClient.select.mockClear().mockReturnThis();
  mockSupabaseClient.order.mockClear().mockReturnThis();
  mockSupabaseClient.eq.mockClear().mockReturnThis();
  mockSupabaseClient.single.mockClear().mockReturnThis();
  mockSupabaseClient.upsert.mockClear().mockReturnThis();
  mockSupabaseClient.delete.mockClear().mockReturnThis();
  mockSupabaseClient.channel.mockClear().mockReturnValue(mockChannel);
  mockSupabaseClient.removeChannel.mockClear();
  
  mockSupabaseClient.auth.getSession.mockClear().mockResolvedValue({ data: { session: { user: { id: 'test-user' } } }, error: null });
  mockSupabaseClient.auth.onAuthStateChange.mockClear().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });
  mockSupabaseClient.auth.signOut.mockClear().mockResolvedValue({ error: null });
  
  mockSupabaseClient.storage.from.mockClear().mockReturnThis();
  mockSupabaseClient.storage.remove.mockClear().mockResolvedValue({ data: {}, error: null });
  mockSupabaseClient.storage.upload.mockClear().mockResolvedValue({ data: { path: 'mock/path.jpg' }, error: null });

  // Reset then to a default successful empty response
  mockSupabaseClient.then.mockImplementation((callback) => callback({ data: [], error: null }));

  // Reset channel mocks
  mockChannel.on.mockClear().mockReturnThis();
  mockChannel.subscribe.mockClear().mockReturnThis();
  mockChannel.unsubscribe.mockClear().mockResolvedValue('ok');
};


export const supabase = mockSupabaseClient;
