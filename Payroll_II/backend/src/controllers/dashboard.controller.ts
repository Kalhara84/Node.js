import type { Request, Response } from 'express';
import { DashboardModel } from '../models/dashboard.model';

export const DashboardController = {
    // Return aggregated dashboard summary statistics
    async summary(_req: Request, res: Response): Promise<void> {
        // Ask the model to read dashboard totals and chart data from PostgreSQL.
        const data = await DashboardModel.summary();
        // Send the results back to frontend/src/pages/dashboard.ts.
        res.json(data);
    },
};
