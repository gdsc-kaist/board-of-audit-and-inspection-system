import { Request, Response, NextFunction } from 'express';
import { AuditPeriod, Budget, Income } from '../model';
import * as errors from '../utils/errors';
import logger from '../config/winston';

export async function validateAuditPeriod(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    sanitizeInput(req);

    const today = new Date();
    const year = today.getFullYear();
    const half = today.getMonth() < 8 ? 'spring' : 'fall';

    const auditPeriod = await AuditPeriod.findOne({
        where: {
            year: year,
            half: half,
        },
    });

    if (!auditPeriod) {
        logger.debug(`audit period does not exist`);
        throw new errors.NotFoundError('감사기간이 존재하지 않습니다.');
    }

    if (today < auditPeriod.start || today > auditPeriod.end) {
        logger.debug(`today is not in audit period`);
        throw new errors.ValidationError('감사기간이 아닙니다.');
    }

    logger.info(`audit period is validated`);
    next();
}

export async function findYearAndHalf(req: Request) {
    if (req.params.year && req.params.half) {
        return Promise.resolve({
            year: req.params.year,
            half: req.params.half,
        });
    } else if (req.params.budget_id) {
        return await findYearAndHalfByBudgetId(req.params.budget_id);
    } else if (req.params.income_id) {
        return await findYearAndHalfByIncomeId(req.params.income_id);
    } else if (req.body.income_id) {
        return await findYearAndHalfByIncomeId(req.body.income_id);
    } else if (req.params.expense_id) {
        return await findYearAndHalfByExpenseId(req.params.expense_id);
    } else if (req.body.expense_id) {
        return await findYearAndHalfByBudgetId(req.body.expense_id);
    }
    throw new errors.BadRequestError('년도와 반기를 찾을 수 없습니다.');
}

function sanitizeInput(req: Request) {
    if (req.body.income_id && req.body.expense_id) {
        logger.debug('income_id and expense_id cannot be used together');
        throw new errors.BadRequestError(
            'income_id와 expense_id는 동시에 사용할 수 없습니다.',
        );
    }
}

async function findYearAndHalfByBudgetId(budget_id: number | string) {
    const budget = await Budget.findByPk(budget_id);
    if (!budget) {
        throw new errors.NotFoundError('예산이 존재하지 않습니다.');
    }

    logger.info(
        `find year: ${budget.year} and half: ${budget.half} by budget_id: ${budget_id}`,
    );
    return {
        year: budget.year,
        half: budget.half,
    };
}

async function findYearAndHalfByIncomeId(income_id: number | string) {
    const income = await Income.findByPk(income_id);
    if (!income) {
        throw new errors.NotFoundError('수입항목이 존재하지 않습니다.');
    }
    return findYearAndHalfByBudgetId(income.BudgetId);
}

async function findYearAndHalfByExpenseId(expense_id: number | string) {
    const expense = await Income.findByPk(expense_id);
    if (!expense) {
        throw new errors.NotFoundError('지출항목이 존재하지 않습니다.');
    }
    return findYearAndHalfByBudgetId(expense.BudgetId);
}
