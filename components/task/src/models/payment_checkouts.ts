import { randomUUID } from 'node:crypto';

import { DataTypes, QueryTypes } from 'sequelize';

import { Model } from './model';

export interface PaymentCheckout {
  document_id: string;
  payment_control_path: string;
  attempt_id: string;
  calculated: any;
  paid: boolean;
  success_status: any;
}

/** Durable, session-independent checkout ownership. Never expires a reservation by time alone. */
export class PaymentCheckoutsModel extends Model {
  model: any;

  constructor() {
    super();
    this.model = this.db.define(
      'payment_checkouts',
      {
        document_id: { type: DataTypes.STRING, primaryKey: true },
        payment_control_path: { type: DataTypes.STRING, primaryKey: true },
        attempt_id: { type: DataTypes.UUID, allowNull: false },
        calculated: { type: DataTypes.JSONB, allowNull: true },
        success_status: { type: DataTypes.JSONB, allowNull: true },
        paid: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      },
      { tableName: 'payment_checkouts', timestamps: false },
    );
  }

  async find(documentId: string, path: string): Promise<PaymentCheckout | null> {
    return this.model.findOne({ where: { document_id: documentId, payment_control_path: path }, raw: true });
  }

  /** Insert/adopt once, or replace exactly the terminal attempt that the caller checked. */
  async reserve(documentId: string, path: string, calculated: any = null, previousAttemptId?: string): Promise<PaymentCheckout | null> {
    const rows = await this.db.query(
      `
      INSERT INTO payment_checkouts (document_id, payment_control_path, attempt_id, calculated, paid)
      VALUES (:documentId, :path, :attemptId, CAST(:calculated AS jsonb), false)
      ON CONFLICT (document_id, payment_control_path) DO UPDATE
        SET attempt_id = EXCLUDED.attempt_id, calculated = EXCLUDED.calculated
        WHERE payment_checkouts.attempt_id = CAST(:previousAttemptId AS uuid)
          AND payment_checkouts.paid = false AND payment_checkouts.calculated IS NOT NULL
      RETURNING *`,
      {
        replacements: {
          documentId,
          path,
          attemptId: randomUUID(),
          calculated: calculated == null ? null : JSON.stringify(calculated),
          previousAttemptId: previousAttemptId ?? null,
        },
        type: QueryTypes.SELECT,
      },
    );
    return rows[0] ?? null;
  }

  async saveCalculated(checkout: PaymentCheckout, calculated: any): Promise<void> {
    await this.model.update(
      { calculated },
      {
        where: {
          document_id: checkout.document_id,
          payment_control_path: checkout.payment_control_path,
          attempt_id: checkout.attempt_id,
        },
      },
    );
  }

  async markPaid(documentId: string, path: string, status: any): Promise<void> {
    await this.model.update({ paid: true, success_status: status }, { where: { document_id: documentId, payment_control_path: path } });
  }
}
