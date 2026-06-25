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
import type { Lesson } from '../lesson/lesson-model';

export class Section extends Model<
  InferAttributes<Section>,
  InferCreationAttributes<Section>
> {
  declare id: CreationOptional<number>;
  declare courseId: ForeignKey<number>;
  declare title: string;
  declare position: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare course?: NonAttribute<Course>;
  declare lessons?: NonAttribute<Lesson[]>;
}

Section.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    courseId: { type: DataTypes.BIGINT, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'Section',
    tableName: 'sections',
    timestamps: true,
    indexes: [{ fields: ['courseId'] }],
  }
);

export default Section;
