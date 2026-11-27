import { Router } from 'express';
import { wrap } from '../middleware';
import { requireScreen } from '../lib/permissions';
import usrenter from './usrenter';
import { ProgramController } from '../controllers/program.controller';

const router = Router();

// Every endpoint below is controlled by the user's rights on the matching program
// Keys match registered web pages: programs, users and rights.
// Administrators have all rights.

// --- 1. User rights screen ---
router.use('/usrenter', requireScreen('rights'), usrenter);

// --- 2. Lookup masters (modules, submodules, locations) ---
router.get('/lookups', requireScreen(['programs', 'users', 'rights']), wrap(ProgramController.lookups));

// Add new lookup record (module or submodule)
router.post('/lookups', requireScreen('programs', 'add'), wrap(ProgramController.addLookup));

// --- 3. Program Routes ---
router.get('/programs', requireScreen('programs'), wrap(ProgramController.programs));

// Create a new program
router.post('/programs', requireScreen('programs', 'add'), wrap(ProgramController.createProgram));

// Update existing program
router.put('/programs/:id', requireScreen('programs', 'amend'), wrap(ProgramController.updateProgram));

// Delete program and all assigned user rights
router.delete('/programs/:id', requireScreen('programs', 'delete'), wrap(ProgramController.deleteProgram));

// --- 4. User Routes ---
router.get('/users', requireScreen('users'), wrap(ProgramController.users));

// Create new user account
router.post('/users', requireScreen('users', 'add'), wrap(ProgramController.createUser));

// Update user account details
router.put('/users/:id', requireScreen('users', 'amend'), wrap(ProgramController.updateUser));

// --- 5. User Rights Routes ---
// Get program rights assigned to a specific user
router.get('/rights/:id', requireScreen('rights'), wrap(ProgramController.rights));

// Update program rights for a user
router.put('/rights/:id', (req, res, next) => {
    requireScreen('rights', req.body?.clear === true ? 'delete' : 'amend')(req, res, next);
}, wrap(ProgramController.saveRights));

// --- 6. Error handler (validation errors and unique constraint violations) ---
router.use(ProgramController.handleError);

export default router;
