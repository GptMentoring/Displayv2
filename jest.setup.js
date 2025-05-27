// jest.setup.js

// Mock Lucide icons
jest.mock('lucide-react', () => {
  const originalModule = jest.requireActual('lucide-react');
  const Svg = ({ children, ...props }) => <svg {...props}>{children}</svg>; // Basic SVG mock

  // Mock specific icons if needed by name, otherwise use a generic mock
  const iconMocks = new Proxy({}, {
    get: (target, prop) => {
      // Return a simple component for any icon name
      // You can customize this to return specific SVG structures if your tests depend on it
      return (props) => {
        const IconComponent = Svg; // Use the basic Svg mock for all icons
        // Create a display name for easier debugging in test snapshots
        IconComponent.displayName = `MockIcon-${String(prop)}`;
        return <IconComponent {...props} />;
      };
    }
  });
  
  return {
    ...originalModule, // Spread original exports
    ...iconMocks,      // Override with mocked icons
    // If specific icons are directly imported and used, mock them explicitly:
    // X: (props) => <Svg {...props} data-testid="mock-x-icon" />,
    // Settings: (props) => <Svg {...props} data-testid="mock-settings-icon" />,
    // GripVertical: (props) => <Svg {...props} data-testid="mock-gripvertical-icon" />,
    // Image: (props) => <Svg {...props} data-testid="mock-image-icon" />,
    // Globe: (props) => <Svg {...props} data-testid="mock-globe-icon" />,
    // Trash2: (props) => <Svg {...props} data-testid="mock-trash2-icon" />,
  };
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock Navigation (if react-router-dom's useNavigate is used extensively and causes issues)
// You might do this per-test file or globally if it's always problematic
// jest.mock('react-router-dom', () => ({
//   ...jest.requireActual('react-router-dom'), // import and retain default behavior
//   useNavigate: () => jest.fn().mockImplementation(() => console.log('Mocked navigate called')),
// }));

// Clean up mocks after each test to ensure test isolation
afterEach(() => {
  // If you have global mocks that need resetting, do it here.
  // For the Supabase mock, it has its own reset function that should be called in test files.
});
