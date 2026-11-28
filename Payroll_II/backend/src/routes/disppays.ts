import { Router } from 'express';
import { wrap } from '../middleware';
import { requireScreen } from '../lib/permissions';
import { DisppaysController as controller } from '../controllers/disppays.controller';

const router = Router();

// Load departments, employees, and payroll period
router.get('/options', requireScreen('disppays'), wrap(controller.options));
router.get('/employees', requireScreen('disppays'), wrap(controller.employees));

// Load pay slip transactions for display and printing
router.get('/display', requireScreen('disppays'), wrap(controller.display));

// Controller-specific error handler
router.use(controller.handleError);

export default router;
