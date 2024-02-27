import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../db';

class CardRecord extends Model {
    declare id: number;
    declare year: number;
    declare half: string;
    declare URI: string;
    declare OrganizationId: number;
}

CardRecord.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        year: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        half: {
            type: DataTypes.ENUM('spring', 'fall'),
            allowNull: false,
        },
        URI: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    {
        tableName: 'card_records',
        sequelize,
        indexes: [
            {
                unique: true,
                fields: ['year', 'half', 'OrganizationId'],
            },
        ],
    },
);

export default CardRecord;
