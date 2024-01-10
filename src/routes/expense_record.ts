import express from 'express';
import { Request, Response, NextFunction } from 'express';
import { ExpenseRecord } from '../model';
import { validateAuditPeriod, wrapAsync } from '../middleware';
import { validateOrganization } from '../middleware/auth';
import { BadRequestError } from '../utils/errors';
import { uploadFileToS3, deleteFileFromS3 } from '../service/s3';
import fs from 'fs';
import { upload } from '../config/multer';

export function createExpenseRecordsRouter() {
    const router = express.Router();
    router.use(wrapAsync(validateOrganization));

    router.post(
        '/:transaction_id',
        validateOrganization,
        upload.single('file'),
        async (req, res, next) => {
            wrapAsync(
                async (req: Request, res: Response, next: NextFunction) => {
                    if (!req.file) {
                        const ret = {
                            statusCode: 400,
                            message: 'No file was uploaded to the server',
                        };
                        return ret;
                    }

                    const uploadResponse = await uploadFileToS3(req.file.path);
                    if (uploadResponse.statusCode !== 200) {
                        throw new BadRequestError(
                            'Failed to upload file to S3',
                        ); // TODO: error handling
                    }
                    fs.unlinkSync(req.file.path);
                    const URI = uploadResponse.uri;
                    const expenseRecord = await ExpenseRecord.create({
                        TransactionId: req.params.transaction_id,
                        URI: URI,
                        note: req.body.memo,
                    });
                    res.sendStatus(200);
                },
            );
        },
    );

    router.put(
        '/:expense_record_id',
        validateOrganization,
        upload.single('file'),
        async (req, res, next) => {
            wrapAsync(
                async (req: Request, res: Response, next: NextFunction) => {
                    if (req.file) {
                        const uploadResponse = await uploadFileToS3(
                            req.file.path,
                        );
                        if (uploadResponse.statusCode !== 200) {
                            throw new BadRequestError(
                                'Failed to upload file to S3',
                            );
                        }
                        fs.unlinkSync(req.file.path);
                        const URI = uploadResponse.uri;
                        const originalURI = await ExpenseRecord.findOne({
                            where: {
                                id: req.params.expense_record_id,
                            },
                        }).then((expenseRecord) => {
                            return expenseRecord?.URI;
                        });
                        if (!originalURI) {
                            throw new BadRequestError(
                                'Failed to find original object',
                            );
                        } // TODO: error handling properly.

                        await ExpenseRecord.update(
                            {
                                URI: URI,
                                note: req.body.memo,
                            },
                            {
                                where: {
                                    id: req.params.expense_record_id,
                                },
                            },
                        );

                        const deleteResponse = await deleteFileFromS3(
                            originalURI,
                        );
                        if (deleteResponse.statusCode !== 200) {
                            throw new BadRequestError(
                                'Failed to delete file from S3',
                            );
                        } // TODO: Error handling properly.

                        res.sendStatus(200);
                    }

                    // No file was uploaded. Only update the memo.
                    await ExpenseRecord.update(
                        {
                            note: req.body.memo,
                        },
                        {
                            where: {
                                id: req.params.expense_record_id,
                            },
                        },
                    );
                    res.sendStatus(200);
                },
            );
        },
    );

    router.delete(
        '/:expense_record_id',
        validateOrganization,
        async (req, res, next) => {
            wrapAsync(
                async (req: Request, res: Response, next: NextFunction) => {
                    const URI = await ExpenseRecord.findOne({
                        where: {
                            id: req.params.expense_record_id,
                        },
                    }).then((expenseRecord) => {
                        return expenseRecord?.URI;
                    });
                    if (!URI) {
                        throw new BadRequestError('Failed to find URL');
                    } // TODO: error handling properly.

                    const deleteResponse = await deleteFileFromS3(URI);
                    if (deleteResponse.statusCode !== 200) {
                        throw new BadRequestError(
                            'Failed to delete file from S3',
                        ); // TODO: Error handling properly.
                    }
                    await ExpenseRecord.destroy({
                        where: {
                            id: req.params.expense_record_id,
                        },
                    });
                    res.sendStatus(200);
                },
            );
        },
    );

    return router;
}
