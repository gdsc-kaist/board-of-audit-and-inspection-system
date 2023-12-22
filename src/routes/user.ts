import express from 'express';
import { Request, Response, NextFunction } from 'express';
import { User } from '../model';
import { wrapAsync } from '../middleware';
import * as OrganizationService from '../service/organization';
import * as UserService from '../service/user';
import { validateIsAdmin } from '../middleware/auth';
import logger from '../config/winston';
import { QueryTypes } from 'sequelize';
import { schemaName } from '../utils/common';
import { sequelize } from '../db';

export function createUsersRouter() {
    const router = express.Router();

    router.get(
        '/',
        wrapAsync(validateIsAdmin),
        wrapAsync(async (req: Request, res: Response, next: NextFunction) => {
            const queryOptions = {
                type: QueryTypes.SELECT,
            };
            const users = await sequelize.query(
                `SELECT 
                    U."id", 
                    U."email", 
                    O."name" organization_name, 
                    U."role",
                    U."isDisabled"
                FROM ${schemaName}."organizations" as O
                    INNER JOIN ${schemaName}."users" as U
                    ON O.id = U."OrganizationId"
                ORDER BY O."name"`,
                queryOptions,
            );
            res.json(users);
        }),
    );

    // 계정 생성
    // TODO: email sanitize (kaist email만 가능하도록)
    router.post(
        '/',
        wrapAsync(async (req: Request, res: Response, next: NextFunction) => {
            const organization = await OrganizationService.findByName(
                req.body.organization_name,
            );

            await UserService.checkDuplicateUserByOrganizationID(
                organization.id,
            );
            await UserService.checkDuplicateUserByEmail(req.body.email);

            const initial_password = UserService.generateRandomPassword();
            const encrypted_password =
                await UserService.encrypt(initial_password);

            const user = await User.create({
                email: req.body.email,
                password: encrypted_password,
                OrganizationId: organization.id,
            });
            res.json({
                email: req.body.email,
                password: initial_password,
                role: user.role,
                is_disabled: user.isDisabled,
                organization_id: organization.id,
            })
        }),
    );

    // 로그인
    router.post(
        '/login',
        wrapAsync(async (req: Request, res: Response, next: NextFunction) => {
            const user = await UserService.findByEmail(req.body.email);
            await UserService.checkPassword(req.body.password, user.password);

            logger.info(`User: ${req.body.email} logged in`);

            req.session.user = {
                id: user.id,
                role: user.role,
                OrganizationId: user.OrganizationId,
            };

            const organization = await OrganizationService.findById(
                user.OrganizationId,
            );
            res.send({
                id: user.id,
                email: user.email,
                role: user.role,
                is_disabled: user.isDisabled,
                organization_name: organization.name,
            });
        }),
    );

    // 비밀번호 변경
    // TODO: 로그인 상태에서만 호출가능하도록 수정
    router.post(
        '/password',
        wrapAsync(async (req: Request, res: Response, next: NextFunction) => {
            const user = await UserService.findByEmail(req.body.email);
            await UserService.checkPassword(req.body.password, user.password);

            const new_password = req.body.new_password;
            UserService.checkPasswordCondition(new_password);

            const encrypted_password = await UserService.encrypt(new_password);
            user.password = encrypted_password;
            await user.save();
            res.sendStatus(200);
        }),
    );

    // 계정 비활성화
    router.put(
        '/disable',
        wrapAsync(validateIsAdmin),
        wrapAsync(async (req: Request, res: Response, next: NextFunction) => {
            const user = await UserService.findByEmail(req.body.email);
            user.isDisabled = true;
            await user.save();
            res.sendStatus(200);
        }),
    );

    // 계정 활성화
    router.put(
        '/enable',
        wrapAsync(validateIsAdmin),
        wrapAsync(async (req: Request, res: Response, next: NextFunction) => {
            const user = await UserService.findByEmail(req.body.email);
            user.isDisabled = false;
            await user.save();
            res.sendStatus(200);
        }),
    );

    return router;
}
