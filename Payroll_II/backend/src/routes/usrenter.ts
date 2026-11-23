import { Router } from 'express';
import { wrap } from '../middleware';
import { UsrEnterController } from '../controllers/usrenter.controller';
import { requireScreen } from '../lib/permissions';

const router = Router();

// Show programs of the selected user / module / submodule with their rights (CHECK)
router.get('/', wrap(UsrEnterController.check));

// Save or delete the rights of the selected programs (SAVE / DELETE)
router.post('/', (req, res, next) => {
    // Viewing the matrix does not permit changing or deleting another user's rights.
    requireScreen('rights', req.body?.delete === true ? 'delete' : 'amend')(req, res, next);
}, wrap(UsrEnterController.apply));

export default router;
