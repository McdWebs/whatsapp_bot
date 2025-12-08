import { useState } from 'react';
import axios from 'axios';
import './SendMessage.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface SendMessageProps {
  apiKey: string;
  users?: Array<{ id: string; phone_number: string }>;
}

function SendMessage({ apiKey, users = [] }: SendMessageProps) {
  const [showForm, setShowForm] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState('');
  const [templateName, setTemplateName] = useState('help');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/admin/messages/send`,
        {
          userId: userId || undefined,
          phoneNumber: phoneNumber || undefined,
          message: message || undefined,
          templateName: templateName || 'help',
          templateParams: message ? [message] : [],
        },
        {
          headers: {
            'X-API-Key': apiKey,
          },
        }
      );

      setResult({
        success: true,
        message: response.data.message || 'Message sent successfully',
      });
      
      // Reset form
      setPhoneNumber('');
      setUserId('');
      setMessage('');
    } catch (err: any) {
      setResult({
        success: false,
        error: err.response?.data?.error || 'Failed to send message',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="send-message-container">
      <button onClick={() => setShowForm(!showForm)} className="send-message-toggle">
        {showForm ? '✕ Cancel' : '+ Send Message'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="send-message-form">
          <h3>Send WhatsApp Message</h3>

          {users.length > 0 && (
            <div className="form-group">
              <label htmlFor="userId">Select User (optional)</label>
              <select
                id="userId"
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  if (e.target.value) {
                    const user = users.find((u) => u.id === e.target.value);
                    if (user) {
                      setPhoneNumber(user.phone_number);
                    }
                  }
                }}
              >
                <option value="">-- Select a user --</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.phone_number}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="phoneNumber">Phone Number {users.length > 0 && '(or select user above)'}</label>
            <input
              id="phoneNumber"
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+972501234567"
              required={!userId}
            />
          </div>

          <div className="form-group">
            <label htmlFor="templateName">Template</label>
            <select
              id="templateName"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            >
              <option value="welcome">Welcome</option>
              <option value="reminder">Reminder</option>
              <option value="confirmation">Confirmation</option>
              <option value="help">Help</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="message">Message Content</label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter message text (will be used as template parameter)"
              rows={4}
            />
          </div>

          <button type="submit" disabled={loading} className="send-button">
            {loading ? 'Sending...' : 'Send Message'}
          </button>

          {result && (
            <div className={`result ${result.success ? 'success' : 'error'}`}>
              {result.success ? (
                <p>✓ {result.message}</p>
              ) : (
                <p>✗ {result.error}</p>
              )}
            </div>
          )}
        </form>
      )}
    </div>
  );
}

export default SendMessage;

