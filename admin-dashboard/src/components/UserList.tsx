import { useState, useEffect } from 'react';
import axios from 'axios';
import './UserList.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface StatsProps {
  apiKey: string;
}

interface User {
  id: string;
  phone_number: string;
  current_state: string;
  created_at: string;
  reminders: number;
  enabledReminders: number;
}

function UserList({ apiKey }: StatsProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/admin/users`, {
        headers: {
          'X-API-Key': apiKey,
        },
      });
      setUsers(response.data.users || []);
      setError('');
    } catch (err: any) {
      setError('Failed to load users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="user-list-container">Loading users...</div>;
  }

  if (error) {
    return <div className="user-list-container error">{error}</div>;
  }

  return (
    <div className="user-list-container">
      <div className="user-list-header">
        <h2>Users</h2>
        <button onClick={fetchUsers} className="refresh-button">
          Refresh
        </button>
      </div>
      <table className="user-table">
        <thead>
          <tr>
            <th>Phone Number</th>
            <th>State</th>
            <th>Reminders</th>
            <th>Enabled</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.phone_number}</td>
              <td>
                <span className={`state-badge state-${user.current_state.toLowerCase()}`}>
                  {user.current_state}
                </span>
              </td>
              <td>{user.reminders}</td>
              <td>{user.enabledReminders}</td>
              <td>{new Date(user.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && <div className="empty-state">No users found</div>}
    </div>
  );
}

export default UserList;

