import express from 'express';
import cors from 'cors';
import { config } from './config';
import { logger } from './utils/logger';
import { whatsappWebhookRouter } from './api/webhooks/whatsapp.webhook';
import { adminRouter } from './api/admin/admin.routes';
import { healthRouter } from './api/health/health.routes';
import { schedulerService } from './scheduler/scheduler.service';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// Routes
app.use('/webhook/whatsapp', whatsappWebhookRouter);
app.use('/admin', adminRouter);
app.use('/health', healthRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = config.server.port;

async function startServer() {
  try {
    // Initialize scheduler
    await schedulerService.initialize();
    logger.info('Scheduler initialized');

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, { env: config.server.nodeEnv });
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await schedulerService.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await schedulerService.shutdown();
  process.exit(0);
});

