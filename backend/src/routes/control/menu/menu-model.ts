import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from 'sequelize';
import { sequelize } from '../../../db/sequelize';

export class Menu extends Model<
  InferAttributes<Menu>,
  InferCreationAttributes<Menu>
> {
  declare id: CreationOptional<number>;
  /** Self-referencing FK to the parent menu (null for top-level items). */
  declare parentId: CreationOptional<number | null>;
  declare label: string;
  declare routeLink: string;
  declare icon: CreationOptional<string | null>;
  declare expanded: CreationOptional<boolean>;
  declare checkList: CreationOptional<string | null>;
  declare isBoth: CreationOptional<boolean>;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

Menu.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    parentId: { type: DataTypes.BIGINT, allowNull: true },
    label: { type: DataTypes.STRING, allowNull: false },
    routeLink: { type: DataTypes.STRING, allowNull: false },
    icon: { type: DataTypes.STRING, allowNull: true },
    expanded: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    checkList: { type: DataTypes.STRING, allowNull: true },
    isBoth: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'Menu',
    tableName: 'menus',
    timestamps: true,
  }
);

export default Menu;
