import { Router } from 'express';
import { wrap } from '../middleware';
import { requireScreen } from '../lib/permissions';
import { DepmController as controller } from '../controllers/depm.controller';

const router = Router();

// List all departments
router.get('/', requireScreen('depm'), wrap(controller.list));

// Create, update, and delete department records
router.post('/', requireScreen('depm', 'add'), wrap(controller.create));
router.put('/:id', requireScreen('depm', 'amend'), wrap(controller.update));
router.delete('/:id', requireScreen('depm', 'delete'), wrap(controller.remove));

// Controller-specific error handler
router.use(controller.handleError);

export default router;
