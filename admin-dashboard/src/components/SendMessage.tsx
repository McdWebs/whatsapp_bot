import { useState } from 'react';
import axios from 'axios';
import './SendMessage.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface SendMessageProps {
  users?: Array<{ id: string; phone_number: string }>;
}

function SendMessage({ users = [] }: SendMessageProps) {
  const [showForm, setShowForm] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState('');
  const [templateName, setTemplateName] = useState('help');
  const [sendRegular, setSendRegular] = useState(true); // Default to regular message for testing
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ 
    success: boolean; 
    message?: string; 
    error?: string;
    status?: string;
    note?: string;
    messageId?: string;
  } | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

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
          templateName: sendRegular ? undefined : (templateName || 'help'),
          templateParams: sendRegular ? undefined : (message ? [message] : []),
          sendRegular: sendRegular,
        }
      );

      const messageId = response.data.messageId;
      setResult({
        success: true,
        message: response.data.message || 'Message sent successfully',
        status: response.data.status,
        note: response.data.note,
        messageId: messageId,
      });
      
      // If message is queued, check status after a delay
      if (messageId && (response.data.status === 'queued' || response.data.status === 'sending')) {
        setTimeout(() => checkMessageStatus(messageId), 3000); // Check after 3 seconds
      }
      
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

  const checkMessageStatus = async (messageSid: string) => {
    setCheckingStatus(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/admin/messages/status/${messageSid}`
      );

      const newStatus = response.data.status;
      const errorCode = response.data.errorCode;
      const errorMessage = response.data.errorMessage;

      setResult(prev => prev ? {
        ...prev,
        status: newStatus,
        note: errorCode || errorMessage 
          ? `Status: ${newStatus} - ${errorCode || ''} ${errorMessage || ''}`.trim()
          : `Status: ${newStatus}. ${newStatus === 'queued' || newStatus === 'sending' ? 'Still processing...' : newStatus === 'delivered' ? 'Message delivered!' : newStatus === 'failed' ? 'Message failed to deliver.' : ''}`,
      } : null);

      // If still queued/sending, check again after 5 seconds
      if (newStatus === 'queued' || newStatus === 'sending') {
        setTimeout(() => checkMessageStatus(messageSid), 5000);
      }
    } catch (err: any) {
      console.error('Error checking message status:', err);
    } finally {
      setCheckingStatus(false);
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
            <label>
              <input
                type="checkbox"
                checked={sendRegular}
                onChange={(e) => setSendRegular(e.target.checked)}
                style={{ marginRight: '0.5rem' }}
              />
              Send as regular message (24-hour window - no template needed)
            </label>
            <small style={{ color: '#666', display: 'block', marginTop: '0.5rem' }}>
              {sendRegular 
                ? '✅ Regular messages work if recipient messaged you first (within 24 hours)'
                : '⚠️ Templates require approval. Use regular message if recipient messaged you first.'}
            </small>
          </div>

          {!sendRegular && (
            <div className="form-group">
              <label htmlFor="templateName">Template</label>
              <select
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              >
                <option value="welcome">Welcome</option>
              </select>
              <small style={{ color: '#666', display: 'block', marginTop: '0.5rem' }}>
                Only the Welcome template is configured. Add more templates in your .env file.
              </small>
            </div>
          )}

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
                <div>
                  <p>✓ {result.message}</p>
                  {result.status && (
                    <p className="status-info">Status: <strong>{result.status}</strong></p>
                  )}
                  {result.note && (
                    <p className="status-note">{result.note}</p>
                  )}
                  {checkingStatus && (
                    <p className="status-note" style={{ fontStyle: 'italic' }}>
                      Checking delivery status...
                    </p>
                  )}
                  {result.messageId && (
                    <p className="status-note" style={{ fontSize: '0.85rem', color: '#666' }}>
                      Message ID: {result.messageId}
                    </p>
                  )}
                </div>
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

