import type { Request, Response } from 'express';
import { fail } from '../lib/errors';
import { UsrEnterModel } from '../models/usrenter.model';
import { usrAction, usrRows, usrScope } from '../validators/usrenter.validator';

export const UsrEnterController = {
    // CHECK: show the programs of the selected user / module / submodule with their rights
    async check(req: Request, res: Response): Promise<void> {
        const scope = usrScope(req.query);

        const user = await UsrEnterModel.findUser(scope.usrusdsno);
        if (!user) fail('User not found');

        const rows = await UsrEnterModel.programs(scope);
        res.json({ ...scope, usrusdsnoauto: user.usdusd, usdnam: user.usdnam, usdadmin: user.usdadmin, rows });
    },

    // SAVE or DELETE: change the rights of the selected programs
    async apply(req: Request, res: Response): Promise<void> {
        const input: Record<string, unknown> = req.body ?? {};
        const scope = usrScope(input);
        const action = usrAction(input);
        const rows = usrRows(input);

        await UsrEnterModel.apply(scope, rows, action, req.user!.usr);
        res.json({ message: `${rows.length} program rights ${action === 'delete' ? 'deleted' : 'saved'}` });
    },
};
