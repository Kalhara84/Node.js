import { Router } from 'express';
import { wrap } from '../middleware';
import { requireScreen } from '../lib/permissions';
import { NoptrnController as controller } from '../controllers/noptrn.controller';

const router = Router();

// Load dropdown options and display employees
router.get('/options', requireScreen('noptrn'), wrap(controller.options));
router.get('/display', requireScreen('noptrn'), wrap(controller.display));

// Save direct transactions
// The controller checks Add/Amend for each record inside the transaction.
router.post('/save', requireScreen('noptrn'), wrap(controller.save));

// Controller-specific error handler
router.use(controller.handleError);

export default router;
