// Connect CHECK, SAVE and DELETE requests to the User Rights controller.
import { Router } from 'express';
import { wrap } from '../middleware';
import { UsrEnterController } from '../controllers/usrenter.controller';

// This router runs after login, active-account and administrator checks.
const router = Router();

// Show programs of the selected user / module / submodule with their rights (CHECK)
router.get('/', wrap(UsrEnterController.check));

// Save or delete the rights of the selected programs (SAVE / DELETE)
router.post('/', wrap(UsrEnterController.apply));

export default router;
