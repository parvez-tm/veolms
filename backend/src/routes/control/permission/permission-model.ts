import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  ForeignKey,
  NonAttribute,
} from 'sequelize';
import { sequelize } from '../../../db/sequelize';
import type { Role } from '../role/role-model';
import type { Menu } from '../menu/menu-model';

/**
 * Per-role, per-menu permission flags. Attributes are named `can*` to avoid
 * colliding with Sequelize's instance methods (e.g. `update`) and SQL reserved
 * words; the HTTP layer maps them to/from create/read/update/delete keys.
 */
export class Permission extends Model<
  InferAttributes<Permission>,
  InferCreationAttributes<Permission>
> {
  declare id: CreationOptional<number>;
  declare roleId: ForeignKey<number>;
  declare menuId: ForeignKey<number>;
  declare canCreate: CreationOptional<boolean>;
  declare canRead: CreationOptional<boolean>;
  declare canUpdate: CreationOptional<boolean>;
  declare canDelete: CreationOptional<boolean>;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  declare role?: NonAttribute<Role>;
  declare menu?: NonAttribute<Menu>;
}

Permission.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    roleId: { type: DataTypes.BIGINT, allowNull: false },
    menuId: { type: DataTypes.BIGINT, allowNull: false },
    canCreate: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    canRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    canUpdate: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    canDelete: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'Permission',
    tableName: 'permissions',
    timestamps: true,
    indexes: [
      // One permission row per (role, menu) pair.
      { unique: true, fields: ['roleId', 'menuId'] },
    ],
  }
);

export default Permission;
