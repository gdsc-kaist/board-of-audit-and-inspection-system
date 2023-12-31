import express from 'express';
import { Request, Response, NextFunction } from 'express';
import { ExpenseRecord } from '../model';
import { validateAuditPeriod, wrapAsync } from '../middleware';
import { validateOrganization } from '../middleware/auth';
import { BadRequestError } from '../utils/errors';
import { uploadFileToS3, deleteFileFromS3 } from '../service/s3';
import multer from 'multer';
const upload = multer({ dest: 'uploads/' });
import fs from 'fs';

export function createExpenseRecordsRouter() {
    const router = express.Router();
    router.use(wrapAsync(validateOrganization));

    // TODO: GET Method 구현

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
                    const URL = uploadResponse.url;
                    const expenseRecord = await ExpenseRecord.create({
                        TransactionId: req.params.transaction_id,
                        URL: URL,
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
                        const URL = uploadResponse.url;
                        const originalURL = await ExpenseRecord.findOne({
                            where: {
                                id: req.params.expense_record_id,
                            },
                        }).then((expenseRecord) => {
                            return expenseRecord?.URL;
                        });
                        if (!originalURL) {
                            throw new BadRequestError(
                                'Failed to find original URL',
                            );
                        } // TODO: error handling properly.

                        await ExpenseRecord.update(
                            {
                                URL: URL,
                                note: req.body.memo,
                            },
                            {
                                where: {
                                    id: req.params.expense_record_id,
                                },
                            },
                        );

                        const deleteResponse = await deleteFileFromS3(
                            originalURL,
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
}
