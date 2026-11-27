import { Router } from 'express';
import { wrap } from '../middleware';
import { NoptrnController as controller } from '../controllers/noptrn.controller';

const router = Router();

// Load dropdown options and display employees
router.get('/options', wrap(controller.options));
router.get('/display', wrap(controller.display));

// Save direct transactions
router.post('/save', wrap(controller.save));

// Controller-specific error handler
router.use(controller.handleError);

export default router;

