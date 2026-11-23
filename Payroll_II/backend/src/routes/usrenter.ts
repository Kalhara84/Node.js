import { Router } from 'express';
import { wrap } from '../middleware';
import { UsrEnterController } from '../controllers/usrenter.controller';

const router = Router();

// Show programs of the selected user / module / submodule with their rights (CHECK)
router.get('/', wrap(UsrEnterController.check));

// Save or delete the rights of the selected programs (SAVE / DELETE)
router.post('/', wrap(UsrEnterController.apply));

export default router;
