import { Request, Response, NextFunction } from 'express';
import {
    AuditPeriod,
    Budget,
    Income,
    Transaction,
    TransactionRecord,
    Card,
    CardRecord,
    Account,
    AccountRecord,
} from '../model';
import * as errors from '../utils/errors';
import logger from '../config/winston';

export async function validateAuditPeriod(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    sanitizeInput(req);
    const today = new Date();
    const extracedYearAndHalf = await findYearAndHalf(req);
    if (extracedYearAndHalf.year && extracedYearAndHalf.half) {
        const auditPeriod = await AuditPeriod.findOne({
            where: {
                year: extracedYearAndHalf.year,
                half: extracedYearAndHalf.half,
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
    } else if (extracedYearAndHalf.year || extracedYearAndHalf.half) {
        logger.debug(`year and half must be used together`);
        throw new errors.BadRequestError('년도와 반기는 함께 사용해야 합니다.');
    } else {
        const { year, half } = getAuditPeriodFromDate(today);
        const auditPeriod = await AuditPeriod.findOne({
            where: {
                year,
                half,
            },
        });

        if (!auditPeriod) {
            logger.debug(`audit period does not exist`);
            throw new errors.NotFoundError(
                '요청에 대응되는 감사기간이 존재하지 않습니다.',
            );
        }

        if (today < auditPeriod.start || today > auditPeriod.end) {
            logger.debug(`today is not in audit period`);
            throw new errors.ValidationError('현재 감사 기간이 아닙니다.');
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
    } else if (req.body.year && req.body.half) {
        return Promise.resolve({
            year: req.body.year,
            half: req.body.half,
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
        return await findYearAndHalfByExpenseId(req.body.expense_id);
    } else if (req.params.transaction_id) {
        return await findYearAndHalfByTransactionId(req.params.transaction_id);
    } else if (req.body.transaction_id) {
        return await findYearAndHalfByTransactionId(req.body.transaction_id);
    } else if (req.params.transaction_record_id) {
        return await findYearandHalfByTransactionRecordId(
            req.params.transaction_record_id,
        );
    } else if (req.body.transaction_record_id) {
        return await findYearandHalfByTransactionRecordId(
            req.body.transaction_record_id,
        );
    } else if (req.params.card_id) {
        return await findYearAndHalfByCardId(req.params.card_id);
    } else if (req.body.card_id) {
        return await findYearAndHalfByCardId(req.body.card_id);
    } else if (req.params.card_record_id) {
        return await findYearAndHalfByCardRecordId(req.params.card_record_id);
    } else if (req.body.card_record_id) {
        return await findYearAndHalfByCardRecordId(req.body.card_record_id);
    } else if (req.params.account_id) {
        return await findYearAndHalfByAccountId(req.params.account_id);
    } else if (req.body.account_id) {
        return await findYearAndHalfByAccountId(req.body.account_id);
    } else if (req.params.account_record_id) {
        return await findYearAndHalfByAccountRecordId(
            req.params.account_record_id,
        );
    } else if (req.body.account_record_id) {
        return await findYearAndHalfByAccountRecordId(
            req.body.account_record_id,
        );
    }
    logger.debug(`request: ${req}, Audit Period Not Found.`);
    return { year: null, half: null };
}

function getAuditPeriodFromDate(today: Date) {
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

async function findYearAndHalfByCardId(card_id: number | string) {
    const card = await Card.findOne({
        where: {
            id: card_id,
        },
    });
    if (!card) {
        throw new errors.NotFoundError('카드가 존재하지 않습니다.');
    }
    logger.info(
        `find year: ${card.year} and half: ${card.half} by card_id: ${card_id}`,
    );
    return {
        year: card.year,
        half: card.half,
    };
}

async function findYearAndHalfByCardRecordId(card_record_id: number | string) {
    const cardRecord = await CardRecord.findOne({
        where: {
            id: card_record_id,
        },
    });
    if (!cardRecord) {
        throw new errors.NotFoundError('카드 거래 내역이 존재하지 않습니다.');
    }
    logger.info(
        `find year: ${cardRecord.year} and half: ${cardRecord.half} by card_record_id: ${card_record_id}`,
    );
    return {
        year: cardRecord.year,
        half: cardRecord.half,
    };
}

async function findYearAndHalfByAccountId(account_id: number | string) {
    const account = await Account.findOne({
        where: {
            id: account_id,
        },
    });
    if (!account) {
        throw new errors.NotFoundError('계좌가 존재하지 않습니다.');
    }
    logger.info(
        `find year: ${account.year} and half: ${account.half} by account_id: ${account_id}`,
    );
    return {
        year: account.year,
        half: account.half,
    };
}

async function findYearAndHalfByAccountRecordId(
    account_record_id: number | string,
) {
    const accountRecord = await AccountRecord.findOne({
        where: {
            id: account_record_id,
        },
    });
    if (!accountRecord) {
        throw new errors.NotFoundError('계좌 거래 내역이 존재하지 않습니다.');
    }
    logger.info(
        `find year and half by referencing the account ${accountRecord.AccountId} of account record ${account_record_id}`,
    );
    return findYearAndHalfByAccountId(accountRecord.AccountId);
}

async function findYearAndHalfByTransactionId(transaction_id: number | string) {
    const transaction = await Transaction.findOne({
        where: {
            id: transaction_id,
        },
    });

    if (!transaction) {
        throw new errors.NotFoundError('거래 내역이 존재하지 않습니다.');
    }

    if (transaction.IncomeId) {
        return findYearAndHalfByIncomeId(transaction.IncomeId);
    } else if (transaction.ExpenseId) {
        return findYearAndHalfByExpenseId(transaction.ExpenseId);
    }
    throw new errors.NotFoundError('수입/지출 항목이 존재하지 않습니다.');
}

async function findYearandHalfByTransactionRecordId(
    transaction_record_id: number | string,
) {
    const transactionRecord = await TransactionRecord.findOne({
        where: {
            id: transaction_record_id,
        },
    });
    if (!transactionRecord) {
        throw new errors.NotFoundError(
            '거래 내역 증빙 자료가 존재하지 않습니다.',
        );
    }
    return findYearAndHalfByTransactionId(transactionRecord.TransactionId);
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
