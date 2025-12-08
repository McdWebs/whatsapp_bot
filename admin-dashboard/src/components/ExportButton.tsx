import { useState } from 'react';
import axios from 'axios';
import './ExportButton.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function ExportButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message?: string; spreadsheetUrl?: string } | null>(null);

  const handleExport = async () => {
    try {
      setLoading(true);
      setResult(null);
      const response = await axios.post(`${API_BASE_URL}/admin/export/sheets`, {});
      setResult(response.data);
    } catch (err: any) {
      setResult({
        success: false,
        message: err.response?.data?.message || 'Export failed',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="export-container">
      <button onClick={handleExport} disabled={loading} className="export-button">
        {loading ? 'Exporting...' : 'Export to Google Sheets'}
      </button>
      {result && (
        <div className={`export-result ${result.success ? 'success' : 'error'}`}>
          {result.success ? (
            <div>
              <p>{result.message}</p>
              {result.spreadsheetUrl && (
                <a href={result.spreadsheetUrl} target="_blank" rel="noopener noreferrer">
                  Open Spreadsheet
                </a>
              )}
            </div>
          ) : (
            <p>{result.message}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default ExportButton;

