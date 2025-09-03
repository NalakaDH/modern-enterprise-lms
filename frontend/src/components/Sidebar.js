import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  Users,
  BookOpen,
  GraduationCap,
  BarChart3,
  Settings,
  User,
  X,
  FileText,
  ClipboardList,
  Calendar,
  MessageSquare,
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      roles: ['admin', 'instructor', 'student'],
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: User,
      roles: ['admin', 'instructor', 'student'],
    },
  ];

  const adminNavigation = [
    {
      name: 'User Management',
      href: '/admin/users',
      icon: Users,
    },
    {
      name: 'Course Management',
      href: '/admin/courses',
      icon: BookOpen,
    },
    {
      name: 'System Settings',
      href: '/admin/settings',
      icon: Settings,
    },
  ];

  const instructorNavigation = [
    {
      name: 'My Courses',
      href: '/instructor/courses',
      icon: BookOpen,
    },
    {
      name: 'Gradebook',
      href: '/instructor/gradebook',
      icon: ClipboardList,
    },
  ];

  const studentNavigation = [
    {
      name: 'My Courses',
      href: '/student/courses',
      icon: BookOpen,
    },
    {
      name: 'Course Catalog',
      href: '/student/catalog',
      icon: GraduationCap,
    },
  ];

  const getNavigationItems = () => {
    let items = [...navigation];
    
    if (user?.role === 'admin') {
      items = [...items, ...adminNavigation];
    } else if (user?.role === 'instructor') {
      items = [...items, ...instructorNavigation];
    } else if (user?.role === 'student') {
      items = [...items, ...studentNavigation];
    }
    
    return items;
  };

  const navigationItems = getNavigationItems();

  const NavItem = ({ item }) => {
    const isActive = location.pathname === item.href;
    
    return (
      <NavLink
        to={item.href}
        className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
          isActive
            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-sm border border-blue-200/50'
            : 'text-gray-600 hover:bg-gray-50/80 hover:text-gray-900 hover:shadow-sm'
        }`}
        onClick={onClose}
      >
        <item.icon
          className={`mr-3 h-5 w-5 transition-colors duration-200 ${
            isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
          }`}
        />
        <span className="transition-all duration-200">{item.name}</span>
        {isActive && (
          <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></div>
        )}
      </NavLink>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-gray-600 opacity-75"></div>
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white/95 backdrop-blur-lg shadow-2xl border-r border-gray-200/50 transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">ME</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Enterprise App</h2>
              <p className="text-xs text-gray-500">Learning Platform</p>
            </div>
          </div>
          <button
            type="button"
            className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-8 px-3 space-y-1">
          {navigationItems.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}
        </nav>

        {/* User info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100/50 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-50/80 transition-colors duration-200">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 flex items-center justify-center shadow-md">
              <span className="text-white font-semibold text-sm">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-500 capitalize font-medium">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
