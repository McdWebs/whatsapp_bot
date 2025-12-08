import { useState, useEffect } from 'react';
import axios from 'axios';
import UserList from './components/UserList';
import Stats from './components/Stats';
import ExportButton from './components/ExportButton';
import SendMessage from './components/SendMessage';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_KEY = import.meta.env.VITE_API_KEY || '';

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [apiKey, setApiKey] = useState(API_KEY);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<Array<{ id: string; phone_number: string }>>([]);

  useEffect(() => {
    if (API_KEY) {
      setAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      // Fetch users for SendMessage component
      axios
        .get(`${API_BASE_URL}/admin/users`, {
          headers: {
            'X-API-Key': apiKey,
          },
        })
        .then((response) => {
          const userList = (response.data.users || []).map((user: any) => ({
            id: user.id,
            phone_number: user.phone_number,
          }));
          setUsers(userList);
        })
        .catch(() => {
          // Silently fail - users list will be empty
        });
    }
  }, [authenticated, apiKey]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // Test API key by making a request
      const response = await axios.get(`${API_BASE_URL}/admin/stats`, {
        headers: {
          'X-API-Key': apiKey,
        },
      });

      if (response.status === 200) {
        setAuthenticated(true);
      }
    } catch (err: any) {
      setError(err.response?.status === 401 ? 'Invalid API key' : 'Connection error');
    }
  };

  if (!authenticated) {
    return (
      <div className="app">
        <div className="login-container">
          <h1>WhatsApp Reminder Bot - Admin</h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Enter API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
            {error && <div className="error">{error}</div>}
            <button type="submit">Login</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <h1>WhatsApp Reminder Bot - Admin Dashboard</h1>
        <button onClick={() => setAuthenticated(false)}>Logout</button>
      </header>
      <main>
        <Stats apiKey={apiKey} />
        <div className="actions">
          <SendMessage apiKey={apiKey} users={users} />
          <ExportButton apiKey={apiKey} />
        </div>
        <UserList apiKey={apiKey} />
      </main>
    </div>
  );
}

export default App;

