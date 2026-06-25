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
import type { Category } from '../category/category-model';
import type { Section } from '../section/section-model';
import type { Lesson } from '../lesson/lesson-model';
import type { User } from '../../control/user/user-model';

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type CourseStatus = 'draft' | 'published';

export class Course extends Model<
  InferAttributes<Course>,
  InferCreationAttributes<Course>
> {
  declare id: CreationOptional<number>;
  declare title: string;
  declare subtitle: CreationOptional<string | null>;
  declare description: CreationOptional<string | null>;
  declare categoryId: CreationOptional<ForeignKey<number> | null>;
  declare instructorId: ForeignKey<number>;
  declare thumbnail: CreationOptional<string | null>;
  /** Price in the smallest currency unit (paise). 0 = free. */
  declare price: CreationOptional<number>;
  declare currency: CreationOptional<string>;
  declare level: CreationOptional<CourseLevel>;
  declare status: CreationOptional<CourseStatus>;
  declare publishedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare category?: NonAttribute<Category | null>;
  declare instructor?: NonAttribute<User>;
  declare sections?: NonAttribute<Section[]>;
  declare lessons?: NonAttribute<Lesson[]>;
}

Course.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    subtitle: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    categoryId: { type: DataTypes.BIGINT, allowNull: true },
    instructorId: { type: DataTypes.BIGINT, allowNull: false },
    thumbnail: { type: DataTypes.STRING, allowNull: true },
    // Money is stored in minor units (paise) as an integer to avoid float drift.
    price: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'INR' },
    level: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
      allowNull: false,
      defaultValue: 'beginner',
    },
    status: {
      type: DataTypes.ENUM('draft', 'published'),
      allowNull: false,
      defaultValue: 'draft',
    },
    publishedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'Course',
    tableName: 'courses',
    timestamps: true,
    indexes: [{ fields: ['status'] }, { fields: ['instructorId'] }],
  }
);

export default Course;
