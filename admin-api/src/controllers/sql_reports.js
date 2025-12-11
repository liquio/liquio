const Controller = require('./controller');

const TYPES = {
  integer: 'integer',
  date: 'date',
  uuid: 'uuid',
};

// Define SQL-request here to avoid accidental changes in database and config
const sqlReports = {
  dueDateEventUpdate: {
    name: 'Оновлення dueDate івента на "через 10 хвилин"',
    description: 'необхідно почекати 15 хвилин перевірки dueData',
    taskId: 8179,
    params: {
      event_id: {
        type: TYPES.uuid,
        description: 'id івента',
        example: '05d02ea0-e0c4-11ec-8e46-874f929dce47',
      },
    },
    sql: `
      UPDATE events
      SET due_date = now() + INTERVAL '10 minutes',
        data = ('{"dueDate":"' || TO_CHAR(now() + INTERVAL '10 minutes', 'YYYY-MM-DD HH24:MI:SS') || '","result":{}}')::jsonb,
        updated_at = now()
      WHERE id = :event_id;
    `,
  },
  processesWithErrors: {
    name: 'Отримання списку процесів з помилками, приклад на будівельних',
    description: 'є помилка під час завантаження файлів. немає успішного відправлення (коли вже видалили атачі та перезапустили)',
    taskId: 8090,
    params: {
      event_template_id: {
        type: TYPES.integer,
        description: 'id івента',
        example: 3004003,
      },
      workflow_template_id: {
        type: TYPES.integer,
        description: 'id процесу',
        example: 31534,
      },
    },
    sql: `
      SELECT DISTINCT ON(workflow_id) workflow_id
      FROM workflow_errors
      WHERE workflow_id IN (
          SELECT workflows.id
          FROM workflows
                   INNER JOIN events e ON workflows.id = e.workflow_id AND e.event_template_id = :event_template_id
          WHERE workflow_template_id = :workflow_template_id
          GROUP BY workflows.id
          HAVING (ARRAY_AGG(e.data ORDER BY e.created_at DESC))[1] ->> 'result' IS NULL
      )
        AND data ->> 'error' LIKE '%null value in column \\"file_type\\" violates not-null constraint%';
    `,
  },
  processesWithNoResult: {
    name: 'Список процесів, які пройшли івент, але без результату, за період',
    description: 'ивент завантаження виписки без результатів',
    taskId: 8179,
    params: {
      date_from: {
        type: TYPES.date,
        description: 'дата початку процесу',
        example: '2022-05-06',
      },
      date_to: {
        type: TYPES.date,
        description: 'дата закінчення процесу',
        example: '2022-05-07',
      },
      event_template_id: {
        type: TYPES.integer,
        description: 'id івента',
        example: 3004003,
      },
      workflow_template_id: {
        type: TYPES.integer,
        description: 'id процесу',
        example: 31534,
      },
    },
    sql: `
      SELECT DISTINCT ON (workflow_id) workflow_id,
        (ARRAY_AGG(e.data ORDER BY e.created_at DESC))[1],
        (ARRAY_AGG(e.created_at ORDER BY e.created_at DESC))[1]
      FROM workflows
      LEFT JOIN  events e ON workflows.id = e.workflow_id
        AND event_template_id = :event_template_id
        AND workflows.created_at < :date_from
        AND workflows.created_at > :date_to
        AND workflow_template_id = :workflow_template_id
      GROUP BY workflow_id
      HAVING (ARRAY_AGG(e.data ORDER BY e.created_at DESC))[1] ->> 'error' IS NOT NULL;
    `,
  },
  committedWorkflowsTotal: {
    name: 'Закоммічені процеси за весь період',
    description: 'id шаблону, ім\'я та кількість закоммічених процесів за весь період',
    sql: `
      select wt.id "workflow_template_id",
        wt."name" "name",
        count(1) "count"
      from tasks t
        inner join workflows w on w.id = t.workflow_id
        inner join workflow_templates wt on wt.id = w.workflow_template_id 
      where t.is_entry = true
      group by wt.id, wt."name"
      order by "count" desc;
    `,
  },
  committedWorkflows: {
    name: 'Закоммічені процеси за певний період',
    description: 'id шаблону, ім\'я та кількість закоммічених процесів за весь період',
    params: {
      date_from: {
        type: TYPES.date,
        description: 'дата початку задачі',
        example: '2022-05-06',
      },
      date_to: {
        type: TYPES.date,
        description: 'дата закінчення задачі',
        example: '2022-05-07',
      },
    },
    sql: `
      select wt.id "workflow_template_id",
        wt."name" "name",
        count(1) "count"
      from tasks t
        inner join workflows w on w.id = t.workflow_id
        inner join workflow_templates wt on wt.id = w.workflow_template_id 
      where t.is_entry = true
        and t.finished_at >= :date_from
        and t.finished_at < :date_to
      group by wt.id, wt."name"
      order by "count" desc;
    `,
  },
  fopNoStatus: {
    name: 'Список процессов ФОП, без статуса',
    description: 'workflow_id роцессов ФОП, без статуса',
    params: {
      created_at_from: {
        type: TYPES.date,
        description: 'дата початку створення процесу',
        example: '2022-05-06',
      },
      created_at_to: {
        type: TYPES.date,
        description: 'дата закінчення створення процесу',
        example: '2022-05-07',
      },
      document_template_id: {
        type: TYPES.integer,
        description: 'id документа',
        example: 12100,
      },
    },
    sql: `
      SELECT DISTINCT ON (w.created_at, workflow_id) workflow_id
      FROM documents
              INNER JOIN tasks t ON documents.id = t.document_id
              INNER JOIN workflows w ON w.id = t.workflow_id
      WHERE document_template_id = :document_template_id
        AND w.created_at > :created_at_from
        AND w.created_at < :created_at_to
        AND documents.data -> 'result' ->> 'status' ISNULL
      ORDER BY w.created_at, workflow_id;
    `,
  },
  processDynamic: {
    name: 'Динаміка процесів',
    description: 'id шаблону, ім\'я та кількість закоммічених процесів за весь період',
    params: {
      time_step: {
        type: TYPES.string,
        description: 'крок часу',
        example: 'day',
      },
      during_this_period: {
        type: TYPES.string,
        description: 'період часу',
        example: '1 month',
      },
      until_this_moment: {
        type: TYPES.date,
        description: 'до якого моменту',
        example: 'now',
      },
    },
    sql: `
    select 
    w_t.name,
    t_by_time_count.time_step, 
    coalesce(t_by_time_count.count,0) count,
    coalesce(t_by_time_errors.errors,0) errors,
    case when t_by_time_errors.errors>0 then t_by_time_errors.errors*100/t_by_time_count.count else 0 end percentage 
from workflow_templates w_t
inner join (
	SELECT 
		workflow_template_id, date_trunc(:time_step,created_at) "time_step", COUNT(*) count
	FROM 
		workflows
	where 
		created_at >= :until_this_moment::timestamp  - INTERVAL :during_this_period
    and created_at < :until_this_moment::timestamp
	GROUP by workflow_template_id, date_trunc(:time_step,created_at)) 
t_by_time_count on t_by_time_count.workflow_template_id = w_t.id
left join (
	SELECT 
		workflow_template_id, date_trunc(:time_step,created_at) "time_step", COUNT(*) errors
	FROM 
		workflows
	where 
		created_at >= :until_this_moment::timestamp - INTERVAL :during_this_period 
    and created_at < :until_this_moment::timestamp
    AND has_unresolved_errors IS true
	GROUP by workflow_template_id, date_trunc(:time_step,created_at))
t_by_time_errors on t_by_time_errors.workflow_template_id = w_t.id 
and t_by_time_errors.time_step=t_by_time_count.time_step
order by w_t.name, t_by_time_count.time_step
`,
  },
};

/**
 * SQL Reports controller.
 */
class SqlReportsController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    super(config);
    return SqlReportsController.singleton || (SqlReportsController.singleton = this);
  }

  /**
   * Get list of all SQL reports
   */
  async getAllSqlReports(_req, _res) {
    return Object.entries(sqlReports).reduce((acc, [reportId, { ...params }]) => [...acc, { reportId, ...params }], []);
  }

  /**
   * Get SQL reports result
   * @param {string} params SQL params
   * @param {object} query HTTP Query Params
   */
  async getSqlReports({ params: { reportId }, query }) {
    if (!sqlReports[reportId]) throw new Error(`report ${reportId} not found`);
    const { sql, params: paramsObj = {} } = sqlReports[reportId];
    const params = Object.keys(paramsObj);

    // Check query are not exists in params
    if (Array.isArray(params)) {
      const queryParams = Object.keys(query);
      const missingParams = params.filter((value) => !queryParams.includes(value));
      if (missingParams.length) throw new Error(`the following query params are missing: ${missingParams.join(', ')}`);
    }

    const [result] = await db.query(sql, { replacements: query });
    return result;
  }
}

module.exports = SqlReportsController;
