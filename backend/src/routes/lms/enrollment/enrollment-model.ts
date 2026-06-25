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
import type { Course } from '../course/course-model';
import type { User } from '../../control/user/user-model';

export type EnrollmentStatus = 'active' | 'completed';

export class Enrollment extends Model<
  InferAttributes<Enrollment>,
  InferCreationAttributes<Enrollment>
> {
  declare id: CreationOptional<number>;
  declare userId: ForeignKey<number>;
  declare courseId: ForeignKey<number>;
  declare status: CreationOptional<EnrollmentStatus>;
  declare completedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare student?: NonAttribute<User>;
  declare course?: NonAttribute<Course>;
}

Enrollment.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT, allowNull: false },
    courseId: { type: DataTypes.BIGINT, allowNull: false },
    status: {
      type: DataTypes.ENUM('active', 'completed'),
      allowNull: false,
      defaultValue: 'active',
    },
    completedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'Enrollment',
    tableName: 'enrollments',
    timestamps: true,
    indexes: [{ unique: true, fields: ['userId', 'courseId'] }],
  }
);

export default Enrollment;
