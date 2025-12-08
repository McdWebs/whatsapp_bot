import { useState, useEffect } from 'react';
import axios from 'axios';
import UserList from './components/UserList';
import Stats from './components/Stats';
import ExportButton from './components/ExportButton';
import SendMessage from './components/SendMessage';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  const [users, setUsers] = useState<Array<{ id: string; phone_number: string }>>([]);

  useEffect(() => {
    // Fetch users for SendMessage component
    axios
      .get(`${API_BASE_URL}/admin/users`)
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
  }, []);

  return (
    <div className="app">
      <header>
        <h1>WhatsApp Reminder Bot - Admin Dashboard</h1>
      </header>
      <main>
        <Stats />
        <div className="actions">
          <SendMessage users={users} />
          <ExportButton />
        </div>
        <UserList />
      </main>
    </div>
  );
}

export default App;

