import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Monitor, Settings } from 'lucide-react';

const Header: React.FC = () => {
  const location = useLocation();
  const isAdmin = location.pathname.includes('admin');
  
  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Monitor className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-800">Simple Office Show</h1>
        </div>
        <nav>
          {isAdmin ? (
            <Link 
              to="/presentation" 
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              <Monitor className="h-4 w-4" />
              <span>View Presentation</span>
            </Link>
          ) : (
            <Link 
              to="/admin" 
              className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span>Admin</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;