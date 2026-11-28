import { Router } from 'express';
import { wrap } from '../middleware';
import { requireScreen } from '../lib/permissions';
import { SysenterController as controller } from '../controllers/sysenter.controller';

const router = Router();

// List all system master records
router.get('/', requireScreen('sysenter'), wrap(controller.list));

// Create, update, and delete system master records
router.post('/', requireScreen('sysenter', 'add'), wrap(controller.create));
router.put('/:id', requireScreen('sysenter', 'amend'), wrap(controller.update));
router.delete('/:id', requireScreen('sysenter', 'delete'), wrap(controller.remove));

// Controller-specific error handler
router.use(controller.handleError);

export default router;
