import './config/env'; // must be first — validates env vars and exits on failure
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler, notFound } from './middleware/errorHandler';

import authRoutes from './routes/auth';
import contractorRoutes from './routes/contractor';
import clientRoutes from './routes/clients';
import leadRoutes from './routes/leads';
import jobRoutes from './routes/jobs';
import invoiceRoutes from './routes/invoices';
import conversationRoutes from './routes/conversations';
import dashboardRoutes from './routes/dashboard';
import aiRoutes from './routes/ai';

const app = express();

// ——— Global Middleware ————————————————————————————————————————————————————————————
app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  })
);
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
    skip: () => env.NODE_ENV === 'test',
  })
);

// ——— Root & Health Check ——————————————————————————————————————————————————————————
app.get('/', (_req, res) => {
  res.json({ 
    message: 'Prolink Backend API', 
    version: '1.0.0', 
    documentation: 'https://docs.useezly.com' 
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ——— API Routes ———————————————————————————————————————————————————————————————————
const v1 = express.Router();

v1.use('/auth', authRoutes);
v1.use('/contractor', contractorRoutes);
v1.use('/clients', clientRoutes);
v1.use('/leads', leadRoutes);
v1.use('/jobs', jobRoutes);
v1.use('/invoices', invoiceRoutes);
v1.use('/conversations', conversationRoutes);
v1.use('/dashboard', dashboardRoutes);
v1.use('/ai', aiRoutes);

app.use('/api/v1', v1);

// ——— Error Handling ———————————————————————————————————————————————————————————————
app.use(notFound);
app.use(errorHandler);

// ——— Start Server —————————————————————————————————————————————————————————————————
if (require.main === module) {
  app.listen(env.PORT, () => {
    logger.info(`Prolink API running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
}

export default app;
