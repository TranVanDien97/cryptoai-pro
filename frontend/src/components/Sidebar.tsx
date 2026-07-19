import { NavLink } from 'react-router-dom';
import { Activity, Cpu, LayoutDashboard, Settings } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const Sidebar = () => {
  const balance = useAppStore(state => state.balance);
  const positions = useAppStore(state => state.positions);
  const openPositions = positions.filter(p => p.status === 'OPEN').length;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Cpu size={28} />
        <span>CryptoAILab</span>
      </div>

      <nav className="nav-links">
        <NavLink to="/ai-war-room" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Activity size={20} />
          <span>AI War Room</span>
        </NavLink>
        <NavLink to="/paper-trading" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Paper Trading Lab</span>
          {openPositions > 0 && (
            <span style={{
              marginLeft: 'auto',
              background: 'var(--primary)',
              color: '#000',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {openPositions}
            </span>
          )}
        </NavLink>
        <div style={{ flex: 1 }}></div>
        <div className="glass-panel" style={{ padding: '16px', marginTop: 'auto', marginBottom: '16px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>VỐN KHẢ DỤNG</div>
          <div className="font-mono" style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary)' }}>
            ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={20} />
          <span>Cài đặt</span>
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;
