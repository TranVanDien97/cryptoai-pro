import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import SignalLab from './pages/SignalLab';
import PaperTradingLab from './pages/PaperTradingLab';
import Settings from './pages/Settings';
import './App.css'; // Will be empty

function App() {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/ai-war-room" replace />} />
            <Route path="/ai-war-room" element={<SignalLab />} />
            <Route path="/paper-trading" element={<PaperTradingLab />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
