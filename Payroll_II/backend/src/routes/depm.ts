import { Router } from 'express';
import { wrap } from '../middleware';
import { DepmController as controller } from '../controllers/depm.controller';

const router = Router();

// List all departments
router.get('/', wrap(controller.list));

// Create, update, and delete department records
router.post('/', wrap(controller.create));
router.put('/:id', wrap(controller.update));
router.delete('/:id', wrap(controller.remove));

// Controller-specific error handler
router.use(controller.handleError);

export default router;
