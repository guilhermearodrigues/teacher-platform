import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar isOpen={isMobile ? sidebarOpen : true} onClose={() => setSidebarOpen(false)} isMobile={isMobile} />

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main style={{
        marginLeft: isMobile ? '0' : '250px',
        flex: 1,
        padding: isMobile ? '1rem' : '2rem',
        backgroundColor: '#f7fafc',
        minHeight: '100vh',
        width: '100%'
      }}>
        {/* Mobile header */}
        {isMobile && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
            padding: '0.5rem 0',
            borderBottom: '1px solid #e2e8f0'
          }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                padding: '0.5rem',
                backgroundColor: '#4299e1',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1.2rem'
              }}
            >
              ☰
            </button>
            <h2 style={{
              margin: 0,
              color: '#2d3748',
              fontSize: '1.2rem'
            }}>
              Teacher Platform
            </h2>
          </div>
        )}
        {children}
      </main>
    </div>
  );
};

export default Layout;