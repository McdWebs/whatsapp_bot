import { useState, useEffect } from 'react';
import axios from 'axios';
import './Stats.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface StatsProps {
  apiKey: string;
}

interface StatsData {
  users: {
    total: number;
  };
  reminders: {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
  };
}

function Stats({ apiKey }: StatsProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/admin/stats`, {
        headers: {
          'X-API-Key': apiKey,
        },
      });
      setStats(response.data);
      setError('');
    } catch (err: any) {
      setError('Failed to load stats');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="stats-container">Loading stats...</div>;
  }

  if (error) {
    return <div className="stats-container error">{error}</div>;
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="stats-container">
      <h2>Statistics</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.users.total}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.reminders.total}</div>
          <div className="stat-label">Total Reminders</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.reminders.sent}</div>
          <div className="stat-label">Sent</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.reminders.delivered}</div>
          <div className="stat-label">Delivered</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.reminders.failed}</div>
          <div className="stat-label">Failed</div>
        </div>
      </div>
      <button onClick={fetchStats} className="refresh-button">
        Refresh
      </button>
    </div>
  );
}

export default Stats;

