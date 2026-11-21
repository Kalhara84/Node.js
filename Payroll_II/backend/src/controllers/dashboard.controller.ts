import type { Request, Response } from 'express';
import { DashboardModel } from '../models/dashboard.model';

export const DashboardController = {
  /** GET /api/dashboard */
  async summary(_req: Request, res: Response): Promise<void> {
    res.json(await DashboardModel.summary());
  },
};
