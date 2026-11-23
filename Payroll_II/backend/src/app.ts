import express from 'express';
import cors from 'cors';
import routes from './routes';
import { notFound, errorHandler, requestLogger } from './middleware';

const app = express();
app.use(requestLogger);

// Enable CORS for frontend requests
app.use(cors({ origin: process.env.FRONTEND_URL }));

// Parse incoming JSON payloads
app.use(express.json({ limit: '1mb' }));

// Health-check root endpoint
app.get('/', (_req, res) => {
    res.send('Payroll API is running');
});

// Mount application API routes under /api
app.use('/api', routes);

// 404 handler for unknown endpoints
app.use(notFound);

// Global error handler middleware
app.use(errorHandler);

export default app;
