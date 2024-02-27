import chai, { expect } from 'chai';
import { Request, Response, NextFunction } from 'express';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import * as model from '../../src/model';
import {
    findYearAndHalf,
    validateAuditPeriod,
} from '../../src/middleware/validate_audit_period';
import * as errors from '../../src/utils/errors';
import { initDB } from '../../src/db/utils';

chai.use(chaiAsPromised);

const dummyAuditPeriod = {
    year: 2023,
    half: 'spring',
    start: new Date('2023-01-01'),
    end: new Date('2023-06-30'),
};

const validDate = new Date('2023-04-01');
const invalidDate = new Date('2023-08-01');

describe('Middleware: validate_audit_period', function () {
    describe('validateAuditPeriod', function () {
        let clock: sinon.SinonFakeTimers;

        afterEach(function () {
            clock.restore();
            sinon.restore();
        });

        it('Request Parameter에 적절한 감사기간이 들어왔을 경우 next()를 호출한다.', async function () {
            const req = {
                params: {
                    year: dummyAuditPeriod.year,
                    half: dummyAuditPeriod.half,
                },
                body: {},
            } as any as Request;
            const res = {} as any as Response;
            const next = sinon.spy();
            clock = sinon.useFakeTimers(validDate);
            sinon
                .stub(model.AuditPeriod, 'findOne')
                .resolves(dummyAuditPeriod as any as model.AuditPeriod);

            await validateAuditPeriod(req, res, next);
            expect(next.calledOnce).to.be.true;
        });

        it('Request body에 적절한 감사기간이 들어왔을 경우 next()를 호출한다.', async function () {
            const req = {
                params: {},
                body: {
                    year: dummyAuditPeriod.year,
                    half: dummyAuditPeriod.half,
                },
            } as any as Request;
            const res = {} as any as Response;
            const next = sinon.spy();
            clock = sinon.useFakeTimers(validDate);
            sinon
                .stub(model.AuditPeriod, 'findOne')
                .resolves(dummyAuditPeriod as any as model.AuditPeriod);

            await validateAuditPeriod(req, res, next);
            expect(next.calledOnce).to.be.true;
        });

        it('request parameter에서 제시된 감사기간이 존재하지 않을 경우 NotFoundError를 발생시킨다.', async function () {
            const req = {
                params: {
                    year: dummyAuditPeriod.year,
                    half: dummyAuditPeriod.half,
                },
                body: {},
            } as any as Request;
            const res = {} as any;
            const next = sinon.spy();
            clock = sinon.useFakeTimers(validDate);
            sinon.stub(model.AuditPeriod, 'findOne').resolves(null);

            expect(
                validateAuditPeriod(req, res, next),
            ).eventually.be.rejectedWith(errors.NotFoundError);
            expect(next.calledOnce).to.be.false;
        });

        it('request body에서 제시된 감사기간이 존재하지 않을 경우 NotFoundError를 발생시킨다.', async function () {
            const req = {
                params: {},
                body: {
                    year: dummyAuditPeriod.year,
                    half: dummyAuditPeriod.half,
                },
            } as any as Request;
            const res = {} as any;
            const next = sinon.spy();
            clock = sinon.useFakeTimers(validDate);
            sinon.stub(model.AuditPeriod, 'findOne').resolves(null);

            expect(
                validateAuditPeriod(req, res, next),
            ).eventually.be.rejectedWith(errors.NotFoundError);
            expect(next.calledOnce).to.be.false;
        });

        it('parameter: 감사기간이 아닐 경우 ValidationError를 발생시킨다.', async function () {
            const req = {
                params: {
                    year: dummyAuditPeriod.year,
                    half: dummyAuditPeriod.half,
                },
                body: {},
            } as any as Request;
            const res = {} as any;
            const next = sinon.spy();
            clock = sinon.useFakeTimers(invalidDate);
            sinon
                .stub(model.AuditPeriod, 'findOne')
                .resolves(dummyAuditPeriod as any as model.AuditPeriod);

            expect(
                validateAuditPeriod(req, res, next),
            ).eventually.be.rejectedWith(errors.ValidationError);
            expect(next.calledOnce).to.be.false;
        });

        it('body: 감사기간이 아닐 경우 ValidationError를 발생시킨다.', async function () {
            const req = {
                params: {},
                body: {
                    year: dummyAuditPeriod.year,
                    half: dummyAuditPeriod.half,
                },
            } as any as Request;
            const res = {} as any;
            const next = sinon.spy();
            clock = sinon.useFakeTimers(invalidDate);
            sinon
                .stub(model.AuditPeriod, 'findOne')
                .resolves(dummyAuditPeriod as any as model.AuditPeriod);

            expect(
                validateAuditPeriod(req, res, next),
            ).eventually.be.rejectedWith(errors.ValidationError);
            expect(next.calledOnce).to.be.false;
        });

        it('body에 income_id와 expense_id가 동시에 존재할 경우 BadRequestError를 발생시킨다.', async function () {
            const req = {
                body: {
                    income_id: 1,
                    expense_id: 1,
                },
            } as any as Request;
            const res = {} as any;
            const next = sinon.spy();

            expect(
                validateAuditPeriod(req, res, next),
            ).eventually.be.rejectedWith(errors.BadRequestError);
            expect(next.calledOnce).to.be.false;
        });
    });

    describe('findYearAndHalf', function () {
        let organization: model.Organization;
        let budget: model.Budget;
        let income: model.Income;
        let expense: model.Expense;
        let transaction: model.Transaction;
        let transaction_record: model.TransactionRecord;
        let card: model.Card;
        let card_record: model.CardRecord;
        let account: model.Account;
        let account_record: model.AccountRecord;

        before(async function () {
            await initDB();
        });

        beforeEach(async function () {
            organization = await model.Organization.create({
                name: '학부총학생회',
            });
            budget = await model.Budget.create({
                manager: '김넙죽',
                year: dummyAuditPeriod.year,
                half: dummyAuditPeriod.half,
                OrganizationId: organization.id,
            });
            income = await model.Income.create({
                code: '101',
                source: '학생회비',
                category: '운영비',
                content: '운영비',
                amount: 1000000,
                BudgetId: budget.id,
            });
            expense = await model.Expense.create({
                code: '401',
                source: '학생회비',
                category: '운영비',
                project: '운영비',
                content: '운영비',
                amount: 1000000,
                BudgetId: budget.id,
            });
            transaction = await model.Transaction.create({
                IncomeId: income.id,
                projectAt: new Date('2023-04-01'),
                manager: '김넙죽 매니저',
                content: '운영비',
                type: '공금카드',
                amount: 5678,
                transactionAt: new Date('2023-04-01'),
                balance: 1234,
                accountNumber: '1234-5678-1234-5678',
                accountBank: '국민은행',
                accountOwner: '통장주인',
            });
            transaction_record = await model.TransactionRecord.create({
                TransactionId: transaction.id,
                URI: 'http://receipt.com',
            });
            card_record = await model.CardRecord.create({
                organizationId: organization.id,
                year: dummyAuditPeriod.year,
                half: dummyAuditPeriod.half,
                URI: 'http://cardrecord.com',
            });
            card = await model.Card.create({
                organizationId: organization.id,
                year: dummyAuditPeriod.year,
                half: dummyAuditPeriod.half,
                name: '카드이름',
                cardNumber: '1234-5678-1234-5678',
            });
            account = await model.Account.create({
                organizationId: organization.id,
                year: dummyAuditPeriod.year,
                half: dummyAuditPeriod.half,
                name: '계좌이름',
                accountNumber: '1234-5678-1234-5678',
                accountBank: '국민은행',
                accountOwner: '통장주인',
            });
            account_record = await model.AccountRecord.create({
                accountId: account.id,
                URI: 'http://accountrecord.com',
                note: 'account record note',
            });
        });

        afterEach(async function () {
            const options = {
                truncate: true,
                cascade: true,
            };
            await model.Organization.destroy(options);
            await model.Budget.destroy(options);
            await model.Income.destroy(options);
            await model.Expense.destroy(options);
            await model.Transaction.destroy(options);
            await model.TransactionRecord.destroy(options);
            await model.Card.destroy(options);
            await model.CardRecord.destroy(options);
            await model.Account.destroy(options);
            await model.AccountRecord.destroy(options);
        });

        it('params에 year와 half가 존재할 경우 year와 half를 반환한다.', async function () {
            const req = {
                params: {
                    year: dummyAuditPeriod.year,
                    half: dummyAuditPeriod.half,
                },
                body: {},
            } as any as Request;

            const { year, half } = await findYearAndHalf(req);
            expect(year).to.be.equal(dummyAuditPeriod.year);
            expect(half).to.be.equal(dummyAuditPeriod.half);
        });

        it('body에 year와 half가 존재할 경우 year와 half를 반환한다.', async function () {
            const req = {
                params: {},
                body: {
                    year: dummyAuditPeriod.year,
                    half: dummyAuditPeriod.half,
                },
            } as any as Request;

            const { year, half } = await findYearAndHalf(req);
            expect(year).to.be.equal(dummyAuditPeriod.year);
            expect(half).to.be.equal(dummyAuditPeriod.half);
        });

        it('params에 budget_id가 존재할 경우 budget_id를 이용해 year와 half를 반환한다.', async function () {
            const req = {
                params: {
                    budget_id: budget.id,
                },
                body: {},
            } as any as Request;

            const { year, half } = await findYearAndHalf(req);
            expect(year).to.be.equal(dummyAuditPeriod.year);
            expect(half).to.be.equal(dummyAuditPeriod.half);
        });

        it('params에 income_id가 존재할 경우 income_id를 이용해 year와 half를 반환한다.', async function () {
            const req = {
                params: {
                    income_id: income.id,
                },
                body: {},
            } as any as Request;

            const { year, half } = await findYearAndHalf(req);
            expect(year).to.be.equal(dummyAuditPeriod.year);
            expect(half).to.be.equal(dummyAuditPeriod.half);
        });

        it('body에 income_id가 존재할 경우 income_id를 이용해 year와 half를 반환한다.', async function () {
            const req = {
                params: {},
                body: {
                    income_id: income.id,
                },
            } as any as Request;

            const { year, half } = await findYearAndHalf(req);
            expect(year).to.be.equal(dummyAuditPeriod.year);
            expect(half).to.be.equal(dummyAuditPeriod.half);
        });

        it('params에 expense_id가 존재할 경우 expense_id를 이용해 year와 half를 반환한다.', async function () {
            const req = {
                params: {
                    expense_id: expense.id,
                },
                body: {},
            } as any as Request;

            const { year, half } = await findYearAndHalf(req);
            expect(year).to.be.equal(dummyAuditPeriod.year);
            expect(half).to.be.equal(dummyAuditPeriod.half);
        });

        it('body에 expense_id가 존재할 경우 expense_id를 이용해 year와 half를 반환한다.', async function () {
            const req = {
                params: {},
                body: {
                    expense_id: expense.id,
                },
            } as any as Request;

            const { year, half } = await findYearAndHalf(req);
            expect(year).to.be.equal(dummyAuditPeriod.year);
            expect(half).to.be.equal(dummyAuditPeriod.half);
        });

        it('params에 transaction_id가 존재할 경우 transaction_id를 이용해 year와 half를 반환한다.', async function () {
            const req = {
                params: {
                    transaction_id: transaction.id,
                },
                body: {},
            } as any as Request;

            const { year, half } = await findYearAndHalf(req);
            expect(year).to.be.equal(dummyAuditPeriod.year);
            expect(half).to.be.equal(dummyAuditPeriod.half);
        });

        it('body에 transaction_id가 존재할 경우 transaction_id를 이용해 year와 half를 반환한다.', async function () {
            const req = {
                params: {},
                body: {
                    transaction_id: transaction.id,
                },
            } as any as Request;

            const { year, half } = await findYearAndHalf(req);
            expect(year).to.be.equal(dummyAuditPeriod.year);
            expect(half).to.be.equal(dummyAuditPeriod.half);
        });

        it('params에 transaction_record_id가 존재할 경우 transaction_record_id를 이용해 year와 half를 반환한다.', async function () {
            const req = {
                params: {
                    transaction_record_id: transaction_record.id,
                },
                body: {},
            } as any as Request;

            const { year, half } = await findYearAndHalf(req);
            expect(year).to.be.equal(dummyAuditPeriod.year);
            expect(half).to.be.equal(dummyAuditPeriod.half);
        });

        it('params에 card_id가 존재할 경우 card_id를 이용해 year와 half를 반환한다.', async function () {
            const req = {
                params: {
                    card_id: card.id,
                },
                body: {},
            } as any as Request;

            const { year, half } = await findYearAndHalf(req);
            expect(year).to.be.equal(dummyAuditPeriod.year);
            expect(half).to.be.equal(dummyAuditPeriod.half);
        });

        it('body에 card_id가 존재할 경우 card_id를 이용해 year와 half를 반환한다.', async function () {
            const req = {
                params: {},
                body: {
                    card_id: card.id,
                },
            } as any as Request;

            const { year, half } = await findYearAndHalf(req);
            expect(year).to.be.equal(dummyAuditPeriod.year);
            expect(half).to.be.equal(dummyAuditPeriod.half);
        });

        it('params에 card_record_id가 존재할 경우 card_record_id를 이용해 year와 half를 반환한다.', async function () {
            const req = {
                params: {
                    card_record_id: card_record.id,
                },
                body: {},
            } as any as Request;

            const { year, half } = await findYearAndHalf(req);
            expect(year).to.be.equal(dummyAuditPeriod.year);
            expect(half).to.be.equal(dummyAuditPeriod.half);
        });

        it('body에 card_record_id가 존재할 경우 card_record_id를 이용해 year와 half를 반환한다.', async function () {
            const req = {
                params: {},
                body: {
                    card_record_id: card_record.id,
                },
            } as any as Request;

            const { year, half } = await findYearAndHalf(req);
            expect(year).to.be.equal(dummyAuditPeriod.year);
            expect(half).to.be.equal(dummyAuditPeriod.half);
        });

        it('params에 account_id가 존재할 경우 account_id를 이용해 year와 half를 반환한다.', async function () {
            const req = {
                params: {
                    account_id: account.id,
                },
                body: {},
            } as any as Request;

            const { year, half } = await findYearAndHalf(req);
            expect(year).to.be.equal(dummyAuditPeriod.year);
            expect(half).to.be.equal(dummyAuditPeriod.half);
        });

        it('body에 account_id가 존재할 경우 account_id를 이용해 year와 half를 반환한다.', async function () {
            const req = {
                params: {},
                body: {
                    account_id: account.id,
                },
            } as any as Request;

            const { year, half } = await findYearAndHalf(req);
            expect(year).to.be.equal(dummyAuditPeriod.year);
            expect(half).to.be.equal(dummyAuditPeriod.half);
        });

        it('params에 account_record_id가 존재할 경우 account_record_id를 이용해 year와 half를 반환한다.', async function () {
            const req = {
                params: {
                    account_record_id: account_record.id,
                },
                body: {},
            } as any as Request;

            const { year, half } = await findYearAndHalf(req);
            expect(year).to.be.equal(dummyAuditPeriod.year);
            expect(half).to.be.equal(dummyAuditPeriod.half);
        });

        it('body에 account_record_id가 존재할 경우 account_record_id를 이용해 year와 half를 반환한다.', async function () {
            const req = {
                params: {},
                body: {
                    account_record_id: account_record.id,
                },
            } as any as Request;

            const { year, half } = await findYearAndHalf(req);
            expect(year).to.be.equal(dummyAuditPeriod.year);
            expect(half).to.be.equal(dummyAuditPeriod.half);
        });

        it('params과 body를 이용해 year와 half를 찾을 수 없는 경우 BadRequestError를 발생시킨다.', async function () {
            const req = {
                params: {},
                body: {},
            } as any as Request;

            expect(findYearAndHalf(req)).eventually.be.rejectedWith(
                errors.BadRequestError,
            );
        });
    });
});
