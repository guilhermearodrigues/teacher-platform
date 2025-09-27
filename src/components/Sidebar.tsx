import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isMobile }) => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { path: '/students', label: 'Students', icon: '👥' },
    { path: '/profile', label: 'Profile', icon: '👤' },
  ];

  const isActive = (path: string) => location.pathname === path;

  if (!isOpen && isMobile) {
    return null;
  }

  return (
    <div style={{
      width: '250px',
      height: '100vh',
      backgroundColor: '#2d3748',
      color: 'white',
      position: 'fixed',
      left: isOpen ? 0 : '-250px',
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      transition: 'left 0.3s ease-in-out',
      zIndex: isMobile ? 1000 : 'auto'
    }}>
      {/* Header */}
      <div style={{
        padding: '1.5rem',
        borderBottom: '1px solid #4a5568',
        marginBottom: '1rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isMobile ? '1rem' : '0'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: '#e2e8f0'
          }}>
            Teacher Platform
          </h2>
          {isMobile && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#e2e8f0',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '0.25rem'
              }}
            >
              ×
            </button>
          )}
        </div>
        <p style={{
          margin: '0.5rem 0 0 0',
          fontSize: '0.875rem',
          color: '#a0aec0'
        }}>
          Welcome, {user?.user_metadata?.first_name || user?.email}
        </p>
      </div>

      {/* Navigation Menu */}
      <nav style={{ flex: 1, padding: '0 1rem' }}>
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => isMobile && onClose()}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.75rem 1rem',
              margin: '0.25rem 0',
              borderRadius: '6px',
              textDecoration: 'none',
              color: isActive(item.path) ? '#1a202c' : '#e2e8f0',
              backgroundColor: isActive(item.path) ? '#4299e1' : 'transparent',
              transition: 'all 0.2s',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              if (!isActive(item.path)) {
                e.currentTarget.style.backgroundColor = '#4a5568';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive(item.path)) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <span style={{ marginRight: '0.75rem', fontSize: '1rem' }}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid #4a5568',
        marginTop: 'auto'
      }}>
        <button
          onClick={() => signOut()}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#e53e3e',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#c53030';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#e53e3e';
          }}
        >
          🚪 Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;