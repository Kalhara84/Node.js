import express from 'express';
import cors from 'cors';
import routes from './routes';
import { notFound, errorHandler } from './middleware';


const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => {
    res.send('Payroll API is running');
});

app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);


export default app;
