import fs from 'fs';
import { deleteFileFromS3, uploadFileToS3 } from '../../src/config/s3';
import { expect } from 'chai';

const dummyImage1 = 'test/asset/image1.jpg';
const dummyPdf2 = 'test/asset/pdf2.pdf';

describe('S3 config', function () {
    let file: Express.Multer.File;
    let buffer: Buffer;

    it('should upload and delete a image file to S3', async () => {
        buffer = fs.readFileSync(dummyImage1);
        file = {
            originalname: 'image1.jpg',
            buffer: buffer,
            mimetype: 'image/jpeg',
        } as Express.Multer.File;

        const key = 'unittest/image1.jpg';
        const res = await uploadFileToS3(file, key);
        expect(res.statusCode).to.equal(200);
        await deleteFileFromS3(key);
    });

    it('should upload and delete a pdf file to S3', async () => {
        buffer = fs.readFileSync(dummyPdf2);
        file = {
            originalname: 'pdf2.jpg',
            buffer: buffer,
            mimetype: 'application/pdf',
        } as Express.Multer.File;

        const key = 'unittest/pdf2.pdf';
        const res = await uploadFileToS3(file, key);
        expect(res.statusCode).to.equal(200);
        await deleteFileFromS3(key);
    });
});
