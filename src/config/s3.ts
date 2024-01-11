import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { config } from 'dotenv';
import logger from '../config/winston';

config();

const client = new S3Client({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
    region: process.env.AWS_REGION as string,
});

export async function uploadFileToS3(file: Express.Multer.File, key: string) {
    logger.info(`Uploading file ${file.originalname} to S3`);

    const command = new PutObjectCommand({
        Bucket: process.env.AWS_STORAGE_BUCKET_NAME as string,
        Key: key,
        Body: file.buffer,
    });

    try {
        const res = await client.send(command);
        return {
            statusCode: res.$metadata.httpStatusCode,
        };
    } catch (error) {
        logger.error(error);
        throw error;
    }
}

export async function deleteFileFromS3(key: string) {
    logger.info(`Deleting file (${key}) from S3`);

    const command = new DeleteObjectCommand({
        Bucket: process.env.AWS_STORAGE_BUCKET_NAME as string,
        Key: key,
    });

    try {
        const res = await client.send(command);
        return {
            statusCode: res.$metadata.httpStatusCode,
        };
    } catch (error) {
        logger.error(error);
        throw error;
    }
}

// Below is the S3 config with API Gateway

// import logger from '../config/winston';
// import axios from 'axios';

// interface ResponseDataType {
//     message: string;
//     code: number;
// }

// // TODO: fileName을 organizationID + timestamp + filename 으로 해서 중복 방지
// export async function uploadFileToS3(file: Express.Multer.File, key: string) {
//     try {
//         logger.info(`Uploading file ${file.originalname} to S3`);

//         const apiGatewayFullURL = `${process.env.AWS_S3_API_GATEWAY_URL}/${process.env.AWS_S3_BUCKET_NAME}/${key}`;
//         logger.debug(`Request to AWS API Gateway URL: ${apiGatewayFullURL}`);

//         const res = await axios.put(apiGatewayFullURL, file.buffer, {
//             headers: {
//                 'Content-Type': file.mimetype,
//             },
//         });

//         logger.info('File uploaded to S3');
//         logger.info(res);
//         return {
//             uri: `${process.env.AWS_S3_BUCKET_NAME}/${key}`,
//             statusCode: res.status,
//         };
//     } catch (error) {
//         if (axios.isAxiosError<ResponseDataType, any>(error)) {
//             logger.error('error uploading to s3: ', error.response?.data);
//         }
//         throw error; // TODO: Error handling
//     }
// }

// export async function deleteFileFromS3(uri: string) {
//     try {
//         logger.info(`Deleting file (${uri}) from S3`);

//         const apiGatewayFullURL = `${process.env.AWS_S3_API_GATEWAY_URL}/${uri}`;
//         const res = await axios.delete(apiGatewayFullURL);
//         logger.info(res);
//         return {
//             statusCode: res.status,
//         };
//     } catch (error) {
//         if (axios.isAxiosError<ResponseDataType, any>(error)) {
//             logger.error('error deleting from s3: ', error.response?.data);
//         }
//         throw error; // TODO: Error handling
//     }
// }
