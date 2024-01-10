import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import express from 'express';
import { upload } from '../../src/config/multer';

chai.use(chaiHttp);

const dummyImage1 = 'test/asset/image1.jpg';
const dummyPdf1 = 'test/asset/pdf1.pdf';
const dummyText1 = 'test/asset/text1.txt';

describe('multer config', function () {
    let app: express.Express;

    before(function () {
        app = express();
        app.post('/upload', upload.single('file'), (req, res) => {
            expect(req.file).to.exist;
            expect(req.file!.buffer).to.exist;
            expect(req.file!.mimetype).to.exist;
            expect(req.file!.size).to.be.greaterThan(0);

            res.status(200).send('File uploaded successfully');
        });

        app.use((err: any, req: any, res: any, next: any) => {
            res.status(500).send('Internal server error');
        });
    });

    it('should upload a file to memory', async function () {
        const res = await chai
            .request(app)
            .post('/upload')
            .attach('file', dummyImage1);
        expect(res).to.have.status(200);
    });

    it('should filter a file larger than 10MB', async function () {
        const res = await chai
            .request(app)
            .post('/upload')
            .attach('file', dummyPdf1);
        expect(res).to.have.status(500);
    });

    it('should filter a file with an invalid mimetype', async function () {
        const res = await chai
            .request(app)
            .post('/upload')
            .attach('file', dummyText1);
        expect(res).to.have.status(500);
    });
});
