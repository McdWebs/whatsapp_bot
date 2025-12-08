import { Request, Response } from 'express';
import { sheetsExportService } from '../../services/sheets-export.service';
import { logger } from '../../utils/logger';

export const exportController = {
  async exportToSheets(req: Request, res: Response): Promise<void> {
    try {
      const result = await sheetsExportService.exportAllData();

      res.json({
        success: true,
        message: 'Data exported to Google Sheets successfully',
        spreadsheetUrl: result.spreadsheetUrl,
      });
    } catch (error) {
      logger.error('Error exporting to sheets', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to export to Google Sheets',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
};

