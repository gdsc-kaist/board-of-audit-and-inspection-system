import { Sequelize } from 'sequelize';
import logger from '../config/winston';
import { schemaName } from '../utils/common';

export const sequelize = new Sequelize(
    'postgres',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'password',
    {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        dialect: 'postgres',
        logging: false,
        schema: schemaName,
    },
);

const {
    Organization,
    User,
    Budget,
    Income,
    Expense,
    Transaction,
    Account,
    TransactionRecord,
    AccountRecord,
    CardEvidence,
} = require('../model');

Organization.hasOne(User, {
    onDelete: 'CASCADE',
});
User.belongsTo(Organization);

Organization.hasMany(Budget, {
    onDelete: 'CASCADE',
});
Budget.belongsTo(Organization);

Organization.hasMany(Account, {
    onDelete: 'CASCADE',
});
Account.belongsTo(Organization);

Organization.hasMany(CardEvidence, {
    onDelete: 'CASCADE',
});
CardEvidence.belongsTo(Organization);

Account.hasOne(AccountRecord, {
    onDelete: 'CASCADE',
});
AccountRecord.belongsTo(Account);

Budget.hasMany(Income, {
    onDelete: 'CASCADE',
});
Income.belongsTo(Budget);

Budget.hasMany(Expense, {
    onDelete: 'CASCADE',
});
Expense.belongsTo(Budget);

Income.hasMany(Transaction, {
    onDelete: 'CASCADE',
});
Transaction.belongsTo(Income);

Expense.hasMany(Transaction, {
    onDelete: 'CASCADE',
});
Transaction.belongsTo(Expense);

Transaction.hasMany(TransactionRecord, {
    onDelete: 'CASCADE',
});
TransactionRecord.belongsTo(Transaction);

sequelize.authenticate().catch((err) => {
    logger.error('Unable to connect to the PostgreSQL database:');
    throw err;
});
