
import { Sun, Moon, Printer, Layout, FileText } from 'lucide-react';
import './NavBar.css';

interface NavBarProps {
  title: string;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  viewMode: 'split' | 'read';
  setViewMode: (mode: 'split' | 'read') => void;
  onPrint: () => void;
}

export function NavBar({ title, theme, toggleTheme, viewMode, setViewMode, onPrint }: NavBarProps) {
  return (
    <nav className="navbar no-print">
      <div className="navbar-left">
        <h2 className="navbar-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem', fontWeight: 600 }}>
          <FileText size={16} /> {title}
        </h2>
      </div>
      <div className="navbar-center">
        <div className="view-toggle">
          <button 
            className={`toggle-btn ${viewMode === 'split' ? 'active' : ''}`}
            onClick={() => setViewMode('split')}
            title="Edit Mode"
          >
            <Layout size={18} />
            <span>Edit</span>
          </button>
          <button 
            className={`toggle-btn ${viewMode === 'read' ? 'active' : ''}`}
            onClick={() => setViewMode('read')}
            title="Read Only Mode"
          >
            <FileText size={18} />
            <span>Read</span>
          </button>
        </div>
      </div>
      <div className="navbar-right">
        <button className="icon-btn" onClick={onPrint} title="Print Document">
          <Printer size={20} />
        </button>
        <button className="icon-btn" onClick={toggleTheme} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>
    </nav>
  );
}
