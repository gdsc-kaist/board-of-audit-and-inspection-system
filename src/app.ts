import express from 'express';
import { redisClient } from './db';
import * as routes from './routes';
import bodyParser from 'body-parser';
import session from 'express-session';
import { config } from 'dotenv';
import RedisStore from 'connect-redis';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import YAML from 'yaml';
import logger from './config/winston';
import { initDB } from './db/util';
import errorHandler from './middleware/error_handler';
import cors from 'cors';

declare module 'express-session' {
    export interface SessionData {
        user: { [key: string]: any };
    }
}

const app = express();

const redisStore = new RedisStore({
    client: redisClient,
    prefix: 'BAI:',
    ttl: 86400,
});

if (process.env.NODE_ENV !== 'test') {
    initDB()
        .then(() => {
            logger.info('Database connected');
        })
        .catch((err) => {
            logger.debug(err);
        });
}

if (process.env.NODE_ENV !== 'production') {
    app.use(
        cors({
            origin: 'http://localhost:3000',
            methods: ['GET', 'PUT', 'POST', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            credentials: true,
        }),
    );
}

config();

const file = fs.readFileSync('swagger.yaml', 'utf8');
const swaggerDocument = YAML.parse(file);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(
    session({
        store: redisStore,
        secret: (process.env.SESSION_SECRET as string) || 'keyboard cat',
        resave: false,
        saveUninitialized: false,
    }),
);
app.use(function (req, res, next) {
    if (process.env.NODE_ENV === 'development') {
        logger.debug(`${req.method}, ${req.url}`);
    }
    next();
});

app.use('/budgets', routes.budgetsRouter);
app.use('/organizations', routes.organizations);
app.use('/transactions', routes.transactions);
app.use('/documents', routes.documents);
app.use('/users', routes.usersRouter);
app.use(errorHandler);

app.listen(3000);

export default app;
