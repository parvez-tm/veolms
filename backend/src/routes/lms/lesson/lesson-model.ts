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
import type { Section } from '../section/section-model';
import type { Course } from '../course/course-model';
import type { MediaAsset } from '../media/media-asset-model';

export type LessonType = 'video' | 'text';

export class Lesson extends Model<
  InferAttributes<Lesson>,
  InferCreationAttributes<Lesson>
> {
  declare id: CreationOptional<number>;
  declare sectionId: ForeignKey<number>;
  /** Denormalized from the section for cheap enrollment/progress queries. */
  declare courseId: ForeignKey<number>;
  declare title: string;
  declare type: LessonType;
  /** Sanitized HTML body for text lessons, or optional notes for video. */
  declare content: CreationOptional<string | null>;
  /** External video URL (YouTube/Vimeo/CDN). Mutually exclusive with videoAssetId. */
  declare videoUrl: CreationOptional<string | null>;
  /** R2-hosted video (FK to media_assets). Mutually exclusive with videoUrl. */
  declare videoAssetId: CreationOptional<ForeignKey<number> | null>;
  declare videoDurationSec: CreationOptional<number | null>;
  declare position: CreationOptional<number>;
  /** Free preview lesson, viewable without enrollment. */
  declare isPreview: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare section?: NonAttribute<Section>;
  declare course?: NonAttribute<Course>;
  declare videoAsset?: NonAttribute<MediaAsset | null>;
}

Lesson.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    sectionId: { type: DataTypes.BIGINT, allowNull: false },
    courseId: { type: DataTypes.BIGINT, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.ENUM('video', 'text'), allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: true },
    videoUrl: { type: DataTypes.STRING, allowNull: true },
    videoAssetId: { type: DataTypes.BIGINT, allowNull: true },
    videoDurationSec: { type: DataTypes.INTEGER, allowNull: true },
    position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    isPreview: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'Lesson',
    tableName: 'lessons',
    timestamps: true,
    indexes: [{ fields: ['sectionId'] }, { fields: ['courseId'] }],
  }
);

export default Lesson;
