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

/**
 * A payment is `created` when we open a Razorpay order and becomes `paid` only
 * after the gateway signature is verified (via the checkout callback or webhook).
 * `failed` records a tampered/invalid verification attempt for auditing.
 */
export type PaymentStatus = 'created' | 'paid' | 'failed';

export class Payment extends Model<
  InferAttributes<Payment>,
  InferCreationAttributes<Payment>
> {
  declare id: CreationOptional<number>;
  declare userId: ForeignKey<number>;
  declare courseId: ForeignKey<number>;
  /** Razorpay order id (`order_...`), our idempotency key for fulfillment. */
  declare razorpayOrderId: string;
  declare razorpayPaymentId: CreationOptional<string | null>;
  /** Amount in the smallest currency unit (paise), snapshotted at order time. */
  declare amount: number;
  declare currency: CreationOptional<string>;
  declare status: CreationOptional<PaymentStatus>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare user?: NonAttribute<User>;
  declare course?: NonAttribute<Course>;
}

Payment.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT, allowNull: false },
    courseId: { type: DataTypes.BIGINT, allowNull: false },
    razorpayOrderId: { type: DataTypes.STRING, allowNull: false, unique: true },
    razorpayPaymentId: { type: DataTypes.STRING, allowNull: true },
    amount: { type: DataTypes.INTEGER, allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'INR' },
    status: {
      type: DataTypes.ENUM('created', 'paid', 'failed'),
      allowNull: false,
      defaultValue: 'created',
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'Payment',
    tableName: 'payments',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['razorpayOrderId'] },
      { fields: ['userId', 'courseId'] },
      { fields: ['status'] },
    ],
  }
);

export default Payment;
