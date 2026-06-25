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
import type { Lesson } from '../lesson/lesson-model';
import type { Course } from '../course/course-model';

export class LessonProgress extends Model<
  InferAttributes<LessonProgress>,
  InferCreationAttributes<LessonProgress>
> {
  declare id: CreationOptional<number>;
  declare userId: ForeignKey<number>;
  declare courseId: ForeignKey<number>;
  declare lessonId: ForeignKey<number>;
  declare completed: CreationOptional<boolean>;
  declare completedAt: CreationOptional<Date | null>;
  /** Last playback position (seconds) for resume-where-you-left-off. */
  declare lastPositionSec: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare lesson?: NonAttribute<Lesson>;
  declare course?: NonAttribute<Course>;
}

LessonProgress.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT, allowNull: false },
    courseId: { type: DataTypes.BIGINT, allowNull: false },
    lessonId: { type: DataTypes.BIGINT, allowNull: false },
    completed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    completedAt: { type: DataTypes.DATE, allowNull: true },
    lastPositionSec: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'LessonProgress',
    tableName: 'lesson_progress',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['userId', 'lessonId'] },
      { fields: ['userId', 'courseId'] },
    ],
  }
);

export default LessonProgress;
