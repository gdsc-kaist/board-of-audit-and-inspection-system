import chaiHttp from 'chai-http';
import app from '../../src/app';
import chai, { expect } from 'chai';
import { initDB } from '../../src/db/util';
import { Organization, User } from '../../src/model';
import { requestAsAdmin } from './utils';

chai.use(chaiHttp);

const mockEmail = 'test@kaist.ac.kr';
const mockEmail2 = 'test2@kaist.ac.kr';
const mockPassword = 'password';
const mockCardNumber = '1234567890123456';
const mockCardBank = '신한은행';
const mockCardOwner = '김넙죽';
const mockBankbook = '1102223333';

describe('API /users', function () {
    before(async function () {
        await initDB();
    });

    afterEach(async function () {
        const options = {
            truncate: true,
            cascade: true,
        };
        await Organization.destroy(options);
        await User.destroy(options);
    });

    describe('GET /', async function () {
        it('피감기구 별로 계정 정보를 조회한다.', async function () {
            const organization1 = await Organization.create({
                name: '학부총학생회',
            });
            const organization2 = await Organization.create({
                name: '감사원',
            });
            const organization3 = await Organization.create({
                name: '동아리연합회',
            });

            await User.create({
                email: 'test1@kaist.ac.kr',
                password: mockPassword,
                OrganizationId: organization1.id,
            });
            await User.create({
                email: 'test2@kaist.ac.kr',
                password: mockPassword,
                OrganizationId: organization2.id,
            });
            await User.create({
                email: 'test3@kaist.ac.kr',
                password: mockPassword,
                OrganizationId: organization3.id,
            });

            const agent = chai.request.agent(app);
            requestAsAdmin(agent).then(async () => {
                const res = await agent.get('/users');
                expect(res.body.map((user: any) => user.organization_name)).eql(
                    ['감사원', '동아리연합회', '학부총학생회'],
                );
            });
        });
    });

    describe('POST /', function () {
        it('새로운 계정을 추가할 수 있다.', async function () {
            const organization = await Organization.create({
                name: '학부총학생회',
            });

            const res = await chai.request(app).post('/users').send({
                email: mockEmail,
                organization_name: organization.name,
                card_number: mockCardNumber,
                card_bank: mockCardBank,
                card_owner: mockCardOwner,
                bankbook: mockBankbook,
            });
            expect(res.body.email).to.equal(mockEmail);
            expect(res.body.OrganizationId).to.equal(organization.id);
            expect(res.body.cardNumber).to.equal(mockCardNumber);
            expect(res.body.cardBank).to.equal(mockCardBank);
            expect(res.body.cardOwner).to.equal(mockCardOwner);
            expect(res.body.bankbook).to.equal(mockBankbook);
            expect(res.body.password).not.equal(mockPassword);
        });

        it('이미 등록된 피감기구의 계정을 추가할 수 없다.', async function () {
            const organization = await Organization.create({
                name: '학부총학생회',
            });
            await User.create({
                email: mockEmail,
                password: mockPassword,
                OrganizationId: organization.id,
            });

            const res = await chai.request(app).post('/users').send({
                email: mockEmail2,
                organization_name: organization.name,
                card_number: mockCardNumber,
                card_bank: mockCardBank,
                card_owner: mockCardOwner,
                bankbook: mockBankbook,
            });
            expect(res.status).to.equal(409);
        });

        it('이미 등록된 이메일의 계정을 추가할 수 없다.', async function () {
            const organization = await Organization.create({
                name: '학부총학생회',
            });
            const organization2 = await Organization.create({
                name: '감사원',
            });

            await User.create({
                email: mockEmail,
                password: mockPassword,
                OrganizationId: organization.id,
            });

            const res = await chai.request(app).post('/users').send({
                email: mockEmail,
                organization_name: organization2.name,
                card_number: mockCardNumber,
                card_bank: mockCardBank,
                card_owner: mockCardOwner,
                bankbook: mockBankbook,
            });
            expect(res.status).to.equal(409);
        });
    });

    describe('POST /login', async function () {
        it('로그인에 성공한다.', async function () {
            const organization = await Organization.create({
                name: '학부총학생회',
            });
            await chai.request(app).post('/users').send({
                email: mockEmail,
                organization_name: organization.name,
                card_number: mockCardNumber,
                card_bank: mockCardBank,
                card_owner: mockCardOwner,
                bankbook: mockBankbook,
            });

            const res = await chai.request(app).post('/users/login').send({
                email: mockEmail,
                password: mockPassword,
            });
            expect(res.status).to.equal(200);
        });

        it('비밀번호가 일치하지 않으면 로그인에 실패한다.', async function () {
            const organization = await Organization.create({
                name: '학부총학생회',
            });
            await User.create({
                email: mockEmail,
                password: mockPassword,
                OrganizationId: organization.id,
            });

            const res = await chai.request(app).post('/users/login').send({
                email: mockEmail,
                password: 'wrong_password',
            });
            expect(res.status).to.equal(401);
        });
    });

    describe('POST /password', async function () {
        it('비밀번호를 변경할 수 있다.', async function () {
            const organization = await Organization.create({
                name: '학부총학생회',
            });
            await chai.request(app).post('/users').send({
                email: mockEmail,
                organization_name: organization.name,
                card_number: mockCardNumber,
                card_bank: mockCardBank,
                card_owner: mockCardOwner,
                bankbook: mockBankbook,
            });

            let res = await chai.request(app).post('/users/password').send({
                email: mockEmail,
                password: mockPassword,
                new_password: 'new_password',
            });
            expect(res.status).to.equal(200);

            res = await chai.request(app).post('/users/login').send({
                email: mockEmail,
                password: 'new_password',
            });
            expect(res.status).to.equal(200);

            res = await chai.request(app).post('/users/login').send({
                email: mockEmail,
                password: mockPassword,
            });
            expect(res.status).to.equal(401);
        });
    });

    describe('PUT /disable', async function () {
        it('계정을 비활성화 할 수 있다.', async function () {
            const organization = await Organization.create({
                name: '학부총학생회',
            });
            await User.create({
                email: mockEmail,
                password: mockPassword,
                OrganizationId: organization.id,
            });

            const agent = chai.request.agent(app);
            requestAsAdmin(agent).then(async () => {
                const res = await agent.put('/users/disable').send({
                    email: mockEmail,
                });
                expect(res.status).to.equal(200);

                const disabledUser = await User.findOne({
                    where: {
                        email: mockEmail,
                    },
                });
                expect(disabledUser?.isDisabled).to.be.true;
            });
        });
    });

    describe('PUT /enable', async function () {
        it('계정을 활성화 할 수 있다.', async function () {
            const organization = await Organization.create({
                name: '학부총학생회',
            });
            await User.create({
                email: mockEmail,
                password: mockPassword,
                OrganizationId: organization.id,
                isDisabled: true,
            });

            const agent = chai.request.agent(app);
            requestAsAdmin(agent).then(async () => {
                const res = await agent.put('/users/enable').send({
                    email: mockEmail,
                });
                expect(res.status).to.equal(200);

                const disabledUser = await User.findOne({
                    where: {
                        email: mockEmail,
                    },
                });
                expect(disabledUser?.isDisabled).to.be.false;
            });
        });
    });
});
