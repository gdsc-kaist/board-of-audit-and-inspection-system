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
    if (req.params.year && req.params.half) {
        const auditPeriod = await AuditPeriod.findOne({
            where: {
                year: req.params.year,
                half: req.params.half,
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
    } else if (req.params.year || req.params.half) {
        logger.debug(`year and half must be used together`);
        throw new errors.BadRequestError('년도와 반기는 함께 사용해야 합니다.');
    } else {
        const { year, half } = getAuditPeriod(today);
        const auditPeriod = await AuditPeriod.findOne({
            where: {
                year,
                half,
            },
        });

        if (!auditPeriod) {
            logger.debug(`audit period does not exist`);
            throw new errors.NotFoundError('감사기간이 존재하지 않습니다.');
        }

        if (today < auditPeriod.start || today > auditPeriod.end) {
            logger.debug(`today is not in audit period`);
            throw new errors.ValidationError(
                '현재 감사 기간이 아닙니다. 지난 감사기간에 대해 접근하고 싶다면, 연도와 반기를 요청에 명시하여 주세요.',
            );
        }

        logger.info(`audit period is validated`);
        next();
    }
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

function getAuditPeriod(today: Date) {
    // Determine the half based on the month. 0201~0731: spring, 0801~0131: fall. If the month is January, use the previous year's fall.

    let half;
    if (today.getMonth() === 0) {
        half = 'fall';
    } else if (today.getMonth() < 7) {
        half = 'spring';
    } else {
        half = 'fall';
    }

    // Determine the year, adjusting for the case when the month is January
    const year =
        today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();

    return { year, half };
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
