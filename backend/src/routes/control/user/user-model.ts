import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  ForeignKey,
  NonAttribute,
} from 'sequelize';
import bcrypt from 'bcryptjs';
import { sequelize } from '../../../db/sequelize';
import type { Role } from '../role/role-model';
import type { MediaAsset } from '../../lms/media/media-asset-model';

export class User extends Model<
  InferAttributes<User>,
  InferCreationAttributes<User>
> {
  declare id: CreationOptional<number>;
  declare userName: string;
  declare firstName: string;
  declare lastName: string;
  declare email: string;
  declare password: string;
  declare roleId: ForeignKey<number>;
  /** Stored as DATEONLY -> serialized as 'YYYY-MM-DD'. */
  declare dateOfBirth: CreationOptional<string | null>;
  declare phone: CreationOptional<string | null>;
  declare address: CreationOptional<string | null>;
  /** Profile image stored in R2 (FK to media_assets); null = no avatar. */
  declare avatarAssetId: CreationOptional<ForeignKey<number> | null>;
  /** Password-reset token (sha256 hash) + expiry. */
  declare passwordResetTokenHash: CreationOptional<string | null>;
  declare passwordResetExpires: CreationOptional<Date | null>;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  /** Populated when queried with `include: [{ model: Role, as: 'role' }]`. */
  declare role?: NonAttribute<Role>;
  declare avatar?: NonAttribute<MediaAsset | null>;
}

User.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    userName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    firstName: { type: DataTypes.STRING, allowNull: false },
    lastName: { type: DataTypes.STRING, allowNull: false },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: { type: DataTypes.STRING, allowNull: false },
    roleId: { type: DataTypes.BIGINT, allowNull: false },
    dateOfBirth: { type: DataTypes.DATEONLY, allowNull: true },
    phone: { type: DataTypes.STRING, allowNull: true },
    address: { type: DataTypes.STRING, allowNull: true },
    avatarAssetId: { type: DataTypes.BIGINT, allowNull: true },
    passwordResetTokenHash: { type: DataTypes.STRING, allowNull: true },
    passwordResetExpires: { type: DataTypes.DATE, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    // Never return the password hash or auth-token secrets unless explicitly
    // requested via .unscoped().
    defaultScope: {
      attributes: {
        exclude: [
          'password',
          'passwordResetTokenHash',
          'passwordResetExpires',
        ],
      },
    },
    hooks: {
      // Hash the password only when it actually changed (create or update).
      // bcrypt.hash accepts the cost rounds directly and generates the salt.
      beforeSave: async (user: User) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
    },
  }
);

export default User;
