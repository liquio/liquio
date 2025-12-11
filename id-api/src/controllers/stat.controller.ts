import { Models } from '../models';
import { Express, Request, Response, Router } from '../types';
import { BaseController } from './base_controller';

export class StatController extends BaseController {
  constructor(router: Router, app: Express) {
    super(router, app, 'stat');
  }

  protected registerRoutes() {
    this.router.get('/stat/:date', this.auth.basic(), this.getStat.bind(this));
  }

  /**
   * Get user statistics.
   */
  async getStat(req: Request, res: Response): Promise<void> {
    const { date } = req.params;
    const options = { replacements: { date }, plain: true };

    const db = Models.db;

    const newUsersSql = `
      SELECT COUNT(*) c
      FROM users
      WHERE "createdAt" BETWEEN :date AND :date::date + INTERVAL '1 day - 1 microsecond'
    `;

    const onBoardUsersSql = `
      SELECT COUNT(*) c
      FROM users
      WHERE NOT "needOnboarding" AND "createdAt" BETWEEN :date AND :date::date + INTERVAL '1 day - 1 microsecond'
    `;

    const loginHistorySql = `
      SELECT COUNT(*) c
      FROM login_history
      WHERE created_at BETWEEN :date AND :date::date + INTERVAL '1 day - 1 microsecond'
    `;

    const [new_users, on_board_users, login_count] = await Promise.all([
      db.query(newUsersSql, options).then(([rows]) => (rows[0] as { c: number }).c),
      db.query(onBoardUsersSql, options).then(([rows]) => (rows[0] as { c: number }).c),
      db.query(loginHistorySql, options).then(([rows]) => (rows[0] as { c: number }).c),
    ]);

    res.send({
      new_users,
      on_board_users,
      login_count,
    });
  }
}
