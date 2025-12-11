const moment = require('moment');

const Controller = require('./controller');
const AuthService = require('../services/auth');

/**
 * SQL Reports controller.
 */
class StatController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    super(config);

    this.authService = new AuthService(config.auth);

    return StatController.singleton || (StatController.singleton = this);
  }

  /**
   * Get commmon statistic by date
   * @param {string} params.date Date to check
   */
  async getStatByDate({ params: { date } }) {
    const methodStartTimestamp = Date.now();
    if (!date?.match(/^\d{4}-\d{2}-\d{2}$/)) throw new Error('date should be in YYYY-MM-DD format');
    const yesterday = moment(date).subtract(1, 'day').format('YYYY-MM-DD');
    const date7daysAgo = moment(date).subtract(7, 'day').format('YYYY-MM-DD');

    const options = { replacements: { date, yesterday, date7daysAgo }, raw: true };

    let userStatLast7Days;
    let userStatYesterday;
    let userStat;

    try {
      const getUserStatTimestamp = Date.now();
      [userStatLast7Days, userStatYesterday, userStat] = await Promise.all([
        this.authService.getUserStatByPeriod({ from: date7daysAgo, to: date }),
        this.authService.getUserStatByDate({ date: yesterday }),
        this.authService.getUserStatByDate({ date }),
      ]);
      log.save('get-stat-by-date|get-user-stat-success', {
        date,
        gotFields: ['userStatLast7Days', 'userStatYesterday', 'userStat'],
        executingTime: `${Date.now() - getUserStatTimestamp} ms`,
      });
    } catch (error) {
      log.save('get-stat-by-date|get-user-stat-error', { date, error: error?.message, stack: error?.stack }, 'error');
      throw error;
    }

    let allServices;
    let topServices;
    let errorsCountLast7Days;
    let errorsCountYesterday;
    let errorsCount;
    let errorsTop;
    let allServicesYesterday;
    let allServicesLast7Days;

    try {
      const getWorkflowStatFirstPartStatTimestamp = Date.now();
      [
        [allServices],
        [topServices],
        [errorsCountLast7Days],
        [errorsCountYesterday],
        [errorsCount],
        [errorsTop],
        [allServicesYesterday],
        [allServicesLast7Days],
      ] = await Promise.all([
        // allServices
        db.query(
          `SELECT COUNT(distinct(workflows.id)) c
          FROM workflows
          INNER JOIN tasks on tasks.workflow_id = workflows.id
          WHERE tasks.finished_at BETWEEN :date AND :date::date + INTERVAL '1 day - 1 microsecond'
          AND tasks.is_entry = true
          AND workflows.workflow_template_id <> 3004
        `,
          options,
        ),
        // topServices
        db.query(
          `SELECT workflow_templates.id, workflow_templates.name, COUNT(distinct(workflows.id)) c
          FROM workflows
          INNER JOIN workflow_templates ON workflow_templates.id = workflows.workflow_template_id
          inner join tasks on tasks.workflow_id = workflows.id
          WHERE tasks.finished_at BETWEEN :date AND :date::date + INTERVAL '1 day - 1 microsecond'
          AND tasks.is_entry = true
          AND workflows.workflow_template_id <> 3004
          GROUP BY workflow_templates.id, workflow_templates.name
          ORDER BY COUNT(distinct(workflows.id)) DESC
          LIMIT 10
        `,
          options,
        ),
        // errorsCountLast7Days
        db.query(
          `SELECT  COUNT(*) c
          FROM workflows
          WHERE created_at BETWEEN :date7daysAgo AND :date::date + INTERVAL '1 day - 1 microsecond'
            AND has_unresolved_errors
        `,
          options,
        ),
        // errorsCountYesterday
        db.query(
          `SELECT  COUNT(*) c
          FROM workflows
          WHERE created_at BETWEEN :yesterday AND :yesterday::date + INTERVAL '1 day - 1 microsecond'
            AND has_unresolved_errors
        `,
          options,
        ),
        // errorsCount
        db.query(
          `SELECT  COUNT(*) c
          FROM workflows
          WHERE created_at BETWEEN :date AND :date::date + INTERVAL '1 day - 1 microsecond'
            AND has_unresolved_errors
        `,
          options,
        ),
        // errorsTop
        db.query(
          `SELECT workflow_templates.id, workflow_templates.name, COUNT(distinct(workflows.id)) c
          FROM workflows
          INNER JOIN workflow_templates ON workflow_templates.id = workflows.workflow_template_id
          inner join tasks on tasks.workflow_id = workflows.id
          WHERE workflows.created_at BETWEEN :date AND :date::date + INTERVAL '1 day - 1 microsecond'
            AND has_unresolved_errors
          GROUP BY workflow_templates.id, workflow_templates.name
          ORDER BY COUNT(distinct(workflows.id)) DESC
          LIMIT 3
        `,
          options,
        ),
        // allServicesYesterday
        db.query(
          `SELECT COUNT(distinct(workflows.id)) c
        FROM workflows
        INNER JOIN tasks on tasks.workflow_id = workflows.id
        WHERE tasks.finished_at BETWEEN :yesterday AND :yesterday::date + INTERVAL '1 day - 1 microsecond'
        AND tasks.is_entry = true
        AND workflows.workflow_template_id <> 3004
        `,
          options,
        ),
        // allServicesLast7Days
        db.query(
          `SELECT COUNT(distinct(workflows.id)) c
        FROM workflows
        INNER JOIN tasks on tasks.workflow_id = workflows.id
        WHERE tasks.finished_at BETWEEN :date7daysAgo AND :yesterday::date + INTERVAL '1 day - 1 microsecond'
        AND tasks.is_entry = true
        AND workflows.workflow_template_id <> 3004
        `,
          options,
        ),
      ]);

      log.save('get-stat-by-date|get-workflow-stat-1st-part-success', {
        date,
        gotFields: [
          'allServices',
          'topServices',
          'errorsCountLast7Days',
          'errorsCountYesterday',
          'errorsCount',
          'errorsTop',
          'allServicesYesterday',
          'allServicesLast7Days',
        ],
        executingTime: `${Date.now() - getWorkflowStatFirstPartStatTimestamp} ms`,
      });
    } catch (error) {
      log.save(
        'get-stat-by-date|get-workflow-stat-1st-part-error',
        {
          date,
          didntGetFields: [
            'allServices',
            'topServices',
            'errorsCountLast7Days',
            'errorsCountYesterday',
            'errorsCount',
            'errorsTop',
            'allServicesYesterday',
            'allServicesLast7Days',
          ],
          error: error?.message,
          stack: error?.stack,
        },
        'error',
      );
      throw error;
    }

    options.replacements.ids = topServices.map(({ id }) => id);
    options.replacements.errorsIds = errorsTop.map(({ id }) => id);

    let topServicesYesterday;
    let topServicesLast7Days;
    let errorsTopYesterday;
    let errorsTopLast7Days;

    let topServicesPromises;
    if (options.replacements.ids.length) {
      topServicesPromises = [
        // topServicesYesterday
        db.query(
          `SELECT workflow_templates.id, workflow_templates.name, COUNT(distinct(workflows.id)) c
          FROM workflows
          INNER JOIN workflow_templates ON workflow_templates.id = workflows.workflow_template_id
          inner join tasks on tasks.workflow_id = workflows.id
          WHERE workflow_templates.id IN (:ids) AND tasks.finished_at BETWEEN :yesterday AND :yesterday::date + INTERVAL '1 day - 1 microsecond'
          AND tasks.is_entry = true
          AND workflows.workflow_template_id <> 3004
          GROUP BY workflow_templates.id, workflow_templates.name
          ORDER BY COUNT(distinct(workflows.id)) DESC
          LIMIT 10
          `,
          options,
        ),
        // topServicesLast7Days
        db.query(
          `SELECT workflow_templates.id, workflow_templates.name, COUNT(distinct(workflows.id)) c
          FROM workflows
          INNER JOIN workflow_templates ON workflow_templates.id = workflows.workflow_template_id
          inner join tasks on tasks.workflow_id = workflows.id
          WHERE workflow_templates.id IN (:ids) AND tasks.finished_at BETWEEN :date7daysAgo AND :date::date + INTERVAL '1 day - 1 microsecond'
          AND tasks.is_entry = true
          AND workflows.workflow_template_id <> 3004
          GROUP BY workflow_templates.id, workflow_templates.name
          ORDER BY COUNT(distinct(workflows.id)) DESC
          LIMIT 10
          `,
          options,
        ),
      ];
    }

    let topErrorsPromises;
    if (options.replacements.errorsIds.length) {
      topErrorsPromises = [
        // errorsTopYesterday
        db.query(
          `SELECT workflow_templates.id, workflow_templates.name, COUNT(distinct(workflows.id)) c
          FROM workflows
          INNER JOIN workflow_templates ON workflow_templates.id = workflows.workflow_template_id
          inner join tasks on tasks.workflow_id = workflows.id
          WHERE workflow_templates.id IN (:errorsIds) AND workflows.created_at BETWEEN :yesterday AND :yesterday::date + INTERVAL '1 day - 1 microsecond'
            AND has_unresolved_errors
          GROUP BY workflow_templates.id, workflow_templates.name
          ORDER BY COUNT(distinct(workflows.id)) DESC
          LIMIT 3
        `,
          options,
        ),
        // errorsTopLast7Days
        db.query(
          `SELECT workflow_templates.id, workflow_templates.name, COUNT(distinct(workflows.id)) c
          FROM workflows
          INNER JOIN workflow_templates ON workflow_templates.id = workflows.workflow_template_id
          inner join tasks on tasks.workflow_id = workflows.id
          WHERE workflow_templates.id IN (:errorsIds) AND workflows.created_at BETWEEN :date7daysAgo::date AND :date::date + INTERVAL '1 day - 1 microsecond'
            AND has_unresolved_errors
          GROUP BY workflow_templates.id, workflow_templates.name
          ORDER BY COUNT(distinct(workflows.id)) DESC
          LIMIT 3
        `,
          options,
        ),
      ];
    }
    try {
      const getWorkflowStatSecondPartStatTimestamp = Date.now();
      if (topServicesPromises?.length) {
        [[topServicesYesterday], [topServicesLast7Days]] = await Promise.all(topServicesPromises);
      }
      if (topErrorsPromises?.length) {
        [[errorsTopYesterday], [errorsTopLast7Days]] = await Promise.all(topErrorsPromises);
      }
      log.save('get-stat-by-date|get-workflow-stat-2nd-part-success', {
        date,
        gotFields: ['topServicesYesterday', 'topServicesLast7Days', 'errorsTopYesterday', 'errorsTopLast7Days'],
        executingTime: `${Date.now() - getWorkflowStatSecondPartStatTimestamp} ms`,
      });
    } catch (error) {
      log.save(
        'get-stat-by-date|get-workflow-stat-2nd-part-error',
        {
          date,
          didntGetFields: ['topServicesYesterday', 'topServicesLast7Days', 'errorsTopYesterday', 'errorsTopLast7Days'],
          error: error?.message,
          stack: error?.stack,
        },
        'error',
      );
      throw error;
    }
    const result = {
      users: {
        yesterday: userStatYesterday,
        today: userStat,
        last7Days: userStatLast7Days,
      },
      allServices: {
        yesterday: allServicesYesterday[0].c,
        today: allServices[0].c,
        last7Days: allServicesLast7Days[0].c,
      },
      services: {
        yesterday: topServicesYesterday || [],
        today: topServices || [],
        last7Days: topServicesLast7Days || [],
      },
      errors: {
        yesterday: errorsCountYesterday[0].c,
        today: errorsCount[0].c,
        last7Days: errorsCountLast7Days[0].c,
      },
      topServicesWithErrors: {
        yesterday: errorsTopYesterday || [],
        today: errorsTop || [],
        last7Days: errorsTopLast7Days || [],
      },
    };
    log.save('get-stat-by-date|success', { date, result, executingTime: `${Date.now() - methodStartTimestamp} ms` });
    return result;
  }
}

module.exports = StatController;
