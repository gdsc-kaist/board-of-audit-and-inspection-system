import bodyParser from 'body-parser';
import { config } from 'dotenv';
import express from 'express';
import session from 'express-session';
import swaggerUi from 'swagger-ui-express';
import logger from './config/winston';
import { initDB } from './db/utils';
import { errorHandler, requestLogger } from './middleware/common';
import cors from 'cors';
import { redisStore } from './db';
import { createRouter } from './routes';
import swaggerJSDoc from 'swagger-jsdoc';

declare module 'express-session' {
    export interface SessionData {
        user: { [key: string]: any };
    }
}

config();

// Swagger definition
const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'KAIST board of audit and inspection system API',
        version: '1.0.0',
    },
    // host: 'localhost:3000',
    // basePath: '/api',
};

const options = {
    swaggerDefinition,
    apis: ['swagger/**/*.yaml'],
};
// initialize swagger-jsdoc
const swaggerSpec = swaggerJSDoc(options);

const sessionMiddleware = session({
    store: redisStore,
    secret: (process.env.SESSION_SECRET as string) || 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: false,
        sameSite: 'none',
        secure: true,
    },
});

export function createApp() {
    const app = express();

    if (process.env.NODE_ENV !== 'test') {
        initDB()
            .then(() => {
                logger.info('Database connected');
            })
            .catch((err) => {
                logger.error(err);
                throw err;
            });
    }

    app.use(
        cors({
            origin: 'http://localhost:3000',
            methods: ['GET', 'PUT', 'POST', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            credentials: true,
        }),
    );
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    app.use(sessionMiddleware);
    app.use(requestLogger);

    app.use(createRouter());
    app.use(errorHandler);

    logger.debug('App created');

    return app;
}
