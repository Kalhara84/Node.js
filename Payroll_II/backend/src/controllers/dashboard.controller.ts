import type { Request, Response } from 'express';
import { DashboardModel } from '../models/dashboard.model';

export const DashboardController = {
    // Return aggregated dashboard summary statistics
    async summary(_req: Request, res: Response): Promise<void> {
        const data = await DashboardModel.summary();
        res.setHeader('Cache-Control', 'no-store');
        res.json(data);
    },
};
