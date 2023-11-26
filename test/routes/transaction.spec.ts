import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import sinon from 'sinon';
import { initDB } from '../../src/db/util';
import * as auth from '../../src/middleware/auth';
import * as validate_audit_period from '../../src/middleware/validate_audit_period';
import * as model from '../../src/model';

chai.use(chaiHttp);

describe('API /transactions', () => {
    let app: Express.Application;
    var stubValidateOrganization: sinon.SinonStub;
    var stubValidateAuditPeriod: sinon.SinonStub;

    before(async function () {
        await initDB();

        stubValidateOrganization = sinon
            .stub(auth, 'validateOrganization')
            .callsFake(async (req, res, next) => {
                return next();
            });
        stubValidateAuditPeriod = sinon
            .stub(validate_audit_period, 'validateAuditPeriod')
            .callsFake(async (req, res, next) => {
                return next();
            });

        app = require('../../src/app').default;
    });

    after(function () {
        stubValidateOrganization.restore();
        stubValidateAuditPeriod.restore();
    });

    describe('GET /:organization_id/:year/:half', () => {
        let organization: model.Organization;
        let dates: Date[];

        beforeEach(async () => {
            organization = await model.Organization.create({
                name: '학부총학생회',
            });

            const budget = await model.Budget.create({
                year: 2021,
                half: 'spring',
                manager: '김넙죽',
                OrganizationId: organization.id,
            });

            const income = await model.Income.create({
                code: '101',
                source: '학생회비',
                category: '중앙회계',
                content: '예산',
                amount: 10000,
                BudgetId: budget.id,
            });

            dates = [];
            const t = new Date('2021-01-01:00:00:00');
            for (var i = 0; i < 30; i++) {
                t.setDate(t.getDate() + 1);
                dates.push(new Date(t));
                await model.Transaction.create({
                    projectAt: t,
                    manager: '김넙죽',
                    content: '테스트',
                    type: '공금카드',
                    amount: 10000,
                    transactionAt: t,
                    accountNumber: '1234567890',
                    accountBank: '우리은행',
                    accountOwner: '김넙죽',
                    hasBill: false,
                    IncomeId: income.id,
                });
            }
        });

        afterEach(async () => {
            await model.Organization.destroy({
                truncate: true,
                cascade: true,
            });
            await model.Budget.destroy({
                truncate: true,
                cascade: true,
            });
            await model.Income.destroy({
                truncate: true,
                cascade: true,
            });
            await model.Transaction.destroy({
                truncate: true,
                cascade: true,
            });
        });

        it('should return transactions in page 2', async () => {
            const expected_dates = dates
                .sort((a, b) => b.getTime() - a.getTime())
                .map((date) => date.toISOString())
                .slice(20, 30);

            const res = await chai
                .request(app)
                .get(`/transactions/${organization.id}/2021/spring?page=2`);
            expect(res).to.have.status(200);
            expect(res.body).to.be.an('array');

            const actual_dates = res.body.map(
                (transaction: any) => transaction.transactionAt,
            );
            expect(actual_dates).eql(expected_dates);
        });

        it('should return all transactions', async () => {
            const expected_dates = dates
                .sort((a, b) => b.getTime() - a.getTime())
                .map((date) => date.toISOString());

            const res = await chai
                .request(app)
                .get(`/transactions/${organization.id}/2021/spring`);
            expect(res).to.have.status(200);
            expect(res.body).to.be.an('array');

            const actual_dates = res.body.map(
                (transaction: any) => transaction.transactionAt,
            );
            expect(actual_dates).eql(expected_dates);
        });
    });

    describe('POST /', () => {
        let organization: model.Organization;
        let budget: model.Budget;
        let income: model.Income;

        beforeEach(async () => {
            organization = await model.Organization.create({
                name: '학부총학생회',
            });

            budget = await model.Budget.create({
                year: 2021,
                half: 'spring',
                manager: '김넙죽',
                OrganizationId: organization.id,
            });

            income = await model.Income.create({
                code: '101',
                source: '학생회비',
                category: '중앙회계',
                content: '예산',
                amount: 10000,
                BudgetId: budget.id,
            });
        });

        afterEach(async () => {
            await model.Organization.destroy({
                truncate: true,
                cascade: true,
            });
            await model.Budget.destroy({
                truncate: true,
                cascade: true,
            });
            await model.Income.destroy({
                truncate: true,
                cascade: true,
            });
            await model.Transaction.destroy({
                truncate: true,
                cascade: true,
            });
        });

        it('should create a transaction', async () => {
            const res = await chai
                .request(app)
                .post(`/transactions`)
                .send({
                    project_at: new Date('2021-01-01:00:00:00'),
                    manager: '김넙죽',
                    content: '테스트',
                    type: '공금카드',
                    amount: 10000,
                    transaction_at: new Date('2021-01-01:00:00:00'),
                    account_number: '1234567890',
                    account_bank: '우리은행',
                    account_owner: '김넙죽',
                    income_id: income.id,
                });
            expect(res).to.have.status(200);
            expect(res.body.amount).to.equal(10000);
        });

        it('should return 400 when income_id and expense_id are not provided', async () => {
            const res = await chai
                .request(app)
                .post(`/transactions`)
                .send({
                    project_at: new Date('2021-01-01:00:00:00'),
                    manager: '김넙죽',
                    content: '테스트',
                    type: '공금카드',
                    amount: 10000,
                    transaction_at: new Date('2021-01-01:00:00:00'),
                    account_number: '1234567890',
                    account_bank: '우리은행',
                    account_owner: '김넙죽',
                });
            expect(res).to.have.status(400);
        });

        it('should return 400 when both income_id and expense_id are provided', async () => {
            const res = await chai
                .request(app)
                .post(`/transactions`)
                .send({
                    project_at: new Date('2021-01-01:00:00:00'),
                    manager: '김넙죽',
                    content: '테스트',
                    type: '공금카드',
                    amount: 10000,
                    transaction_at: new Date('2021-01-01:00:00:00'),
                    account_number: '1234567890',
                    account_bank: '우리은행',
                    account_owner: '김넙죽',
                    income_id: income.id,
                    expense_id: income.id,
                });
            expect(res).to.have.status(400);
        });
    });

    describe('DELETE /:transaction_id', () => {
        let organization: model.Organization;
        let budget: model.Budget;
        let income: model.Income;
        let transaction: model.Transaction;

        beforeEach(async () => {
            organization = await model.Organization.create({
                name: '학부총학생회',
            });

            budget = await model.Budget.create({
                year: 2021,
                half: 'spring',
                manager: '김넙죽',
                OrganizationId: organization.id,
            });

            income = await model.Income.create({
                code: '101',
                source: '학생회비',
                category: '중앙회계',
                content: '예산',
                amount: 10000,
                BudgetId: budget.id,
            });

            transaction = await model.Transaction.create({
                projectAt: new Date('2021-01-01:00:00:00'),
                manager: '김넙죽',
                content: '테스트',
                type: '공금카드',
                amount: 10000,
                transactionAt: new Date('2021-01-01:00:00:00'),
                accountNumber: '1234567890',
                accountBank: '우리은행',
                accountOwner: '김넙죽',
                IncomeId: income.id,
            });
        });

        afterEach(async () => {
            await model.Organization.destroy({
                truncate: true,
                cascade: true,
            });
            await model.Budget.destroy({
                truncate: true,
                cascade: true,
            });
            await model.Income.destroy({
                truncate: true,
                cascade: true,
            });
            await model.Transaction.destroy({
                truncate: true,
                cascade: true,
            });
        });

        it('should delete a transaction', async () => {
            const res = await chai
                .request(app)
                .delete(`/transactions/${transaction.id}`);
            expect(res).to.have.status(200);

            const deletedTransaction = await model.Transaction.findByPk(
                transaction.id,
            );
            expect(deletedTransaction).to.be.null;
        });
    });

    describe('PUT /:transaction_id', () => {
        let organization: model.Organization;
        let budget: model.Budget;
        let income: model.Income;
        let transaction: model.Transaction;

        beforeEach(async () => {
            organization = await model.Organization.create({
                name: '학부총학생회',
            });

            budget = await model.Budget.create({
                year: 2021,
                half: 'spring',
                manager: '김넙죽',
                OrganizationId: organization.id,
            });

            income = await model.Income.create({
                code: '101',
                source: '학생회비',
                category: '중앙회계',
                content: '예산',
                amount: 10000,
                BudgetId: budget.id,
            });

            transaction = await model.Transaction.create({
                projectAt: new Date('2021-01-01:00:00:00'),
                manager: '김넙죽',
                content: '테스트',
                type: '공금카드',
                amount: 10000,
                transactionAt: new Date('2021-01-01:00:00:00'),
                accountNumber: '1234567890',
                accountBank: '우리은행',
                accountOwner: '김넙죽',
                IncomeId: income.id,
            });
        });

        afterEach(async () => {
            await model.Organization.destroy({
                truncate: true,
                cascade: true,
            });
            await model.Budget.destroy({
                truncate: true,
                cascade: true,
            });
            await model.Income.destroy({
                truncate: true,
                cascade: true,
            });
            await model.Transaction.destroy({
                truncate: true,
                cascade: true,
            });
        });

        it('should update a transaction', async () => {
            const res = await chai
                .request(app)
                .put(`/transactions/${transaction.id}`)
                .send({
                    content: '테스트2',
                });
            expect(res).to.have.status(200);

            const updatedTransaction = await model.Transaction.findByPk(
                transaction.id,
            );
            expect(updatedTransaction?.content).to.equal('테스트2');
        });

        it('should return 400 when income_id and expense_id are both provided', async () => {
            const res = await chai
                .request(app)
                .put(`/transactions/${transaction.id}`)
                .send({
                    income_id: income.id,
                    expense_id: income.id,
                });
            expect(res).to.have.status(400);
        });
    });
});
