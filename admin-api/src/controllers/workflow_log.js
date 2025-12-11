const crypto = require('crypto');
const Queue = require('queue');
const moment = require('moment');
const { matchedData } = require('express-validator');

const Controller = require('./controller');
const WorkflowLogBusiness = require('../businesses/workflow_log');
const WorkflowProcessBusiness = require('../businesses/workflow_process');

// 30 min
const PROCESS_TIMEOUT = 30 * 60 * 1000;
const MANUAL_REINDEX_PROCESS_STATUSES = {
  Idle: 'idle',
  Running: 'running',
  Completed: 'completed',
  Failed: 'failed',
};

/**
 * Wokrflow log controller.
 */
class WorkflowLogController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Singleton.
    if (!WorkflowLogController.singleton) {
      super(config);

      // Init queue.
      this.initQueue();

      // Init manual reindex process.
      this.initManualReindexProcess();

      // Init business.
      this.workflowLogBusiness = new WorkflowLogBusiness(config);
      this.workflowProcessBusiness = new WorkflowProcessBusiness(config);

      // Define singleton.
      WorkflowLogController.singleton = this;
    }

    // Return singleton.
    return WorkflowLogController.singleton;
  }

  /**
   * Manual reindex process statuses.
   */
  get ManualReindexProcessStatuses() {
    return MANUAL_REINDEX_PROCESS_STATUSES;
  }

  /**
   * Init manual reindex process.
   */
  initManualReindexProcess() {
    this.manualReindexProcess = {
      jobId: null,
      status: this.ManualReindexProcessStatuses.Idle,
      startTimestamp: null,
      endTimestamp: null,
      total: 0,
      processed: 0,
      failed: 0,
      completed: 0,
      error: null,
      filters: {},
    };
  }

  /**
   * Init queue.
   */
  initQueue() {
    this.queue = Queue({ autostart: true, concurrency: 10 });
    this.queue.timeout = PROCESS_TIMEOUT;
    this.queue.on('timeout', function (next, job) {
      log.save('reindex-workflow-processes|main-reindex-job-timeout', { job: job.toString().replace(/\n/g, '') }, 'error');
      next();
    });
  }

  /**
   * Get workflow logs by workflow id.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getWorkflowLogsByWorkflowId(req, res) {
    const paramsData = matchedData(req, { locations: ['params'] });
    const workflowId = paramsData.id;
    const { token } = req.headers;

    let workflowLogs;
    try {
      // workflowLogs = token;
      workflowLogs = await this.workflowLogBusiness.getByWorkflowId(workflowId, token);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, workflowLogs, true);
  }

  /**
   * Reindex list.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async reindexList(req, res) {
    const queryData = matchedData(req, { locations: ['query'] });
    const sort = queryData.sort || {};
    const filters = queryData.filters || {};
    const { page: currentPage, count: perPage } = queryData;

    this.responseData(res, await models.elasticReindexLog.getAll({ currentPage, perPage, filters, sort }), true);
  }

  /**
   * Obtain Elastic reindex statistics.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async reindexStatistics(req, res) {
    const { bucketSize, timeFrom, timeTo } = matchedData(req, { locations: ['query'] });

    try {
      const [timeStats, periodStats, lastEntries] = await Promise.all([
        models.elasticReindexLog.getReindexTimeStats({ bucketSize, timeFrom, timeTo }),
        models.elasticReindexLog.getReindexPeriodStats({ bucketSize, timeFrom, timeTo }),
        models.elasticReindexLog.getLatestReindexLogs(),
      ]);

      this.responseData(res, { timeStats, periodStats, lastEntries }, true);
    } catch (error) {
      log.save('reindex-statistics-error', { error: error.message, stack: error.stack });
      this.responseError(res, { error: error.message }, 500);
    }
  }

  /**
   * Reindex for period.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async reindexForPeriod(req, res) {
    const filters = matchedData(req, { locations: ['body'] });
    const { authUserInfo: { userId = 'SYSTEM', name: userName = 'SYSTEM' } = {} } = req;
    let { fromCreatedAt, toCreatedAt, fromUpdatedAt, toUpdatedAt } = filters;

    // Check that Elastic enabled.
    const { enabled, reindex: { enabled: isReindexEnabled } = {} } = global.config?.elastic || {};
    if (!enabled || !isReindexEnabled) {
      return this.responseError(res, 'Elastic is disabled.', 500);
    }

    // Define search type.
    let isByUpdated = true;
    let isByCreated = false;

    if ((fromCreatedAt || toCreatedAt) && !fromUpdatedAt && !toUpdatedAt) {
      isByUpdated = false;
      isByCreated = true;
    }

    // Define default shifts.
    if (isByUpdated && !!toUpdatedAt && !fromUpdatedAt) {
      fromUpdatedAt = moment(toUpdatedAt).subtract(2, 'minutes');
    }
    if (isByUpdated && !!fromUpdatedAt && !toUpdatedAt) {
      toUpdatedAt = moment(fromUpdatedAt).add(2, 'minutes');
    }
    if (isByCreated && !!toCreatedAt && !fromCreatedAt) {
      fromCreatedAt = moment(toCreatedAt).subtract(1, 'day');
    }
    if (isByCreated && !!fromCreatedAt && !toCreatedAt) {
      toCreatedAt = moment(fromCreatedAt).add(1, 'day');
    }

    fromUpdatedAt = isByUpdated && (fromUpdatedAt ? moment(fromUpdatedAt) : moment().subtract(2, 'minutes')).format('YYYY-MM-DD HH:mm:ss');
    toUpdatedAt = isByUpdated && (toUpdatedAt ? moment(toUpdatedAt) : moment()).format('YYYY-MM-DD HH:mm:ss');
    fromCreatedAt = isByCreated && (fromCreatedAt ? moment(fromCreatedAt) : moment().subtract(1, 'day')).format('YYYY-MM-DD HH:mm:ss');
    toCreatedAt = isByCreated && (toCreatedAt ? moment(toCreatedAt) : moment()).format('YYYY-MM-DD HH:mm:ss');

    try {
      const preparedFilters = { fromUpdatedAt, toUpdatedAt, fromCreatedAt, toCreatedAt };
      Object.keys(preparedFilters).forEach((key) => (preparedFilters[key] = preparedFilters[key] ? preparedFilters[key] : undefined));
      const reindexLog = await models.elasticReindexLog.create({ userId, userName, filters: preparedFilters });
      this.queue.push(async () => await this.handleReindexForPeriod(reindexLog, fromCreatedAt, toCreatedAt, fromUpdatedAt, toUpdatedAt));
      return this.responseData(res, reindexLog, true);
    } catch (e) {
      this.responseError(res, e, 500);
    }
  }

  /**
   * @param {ElasticReindexLogEntity} reindexLog
   * @param {string} fromCreatedAt
   * @param {string} toCreatedAt
   * @param {string} fromUpdatedAt
   * @param {string} toUpdatedAt
   */
  async handleReindexForPeriod(reindexLog, fromCreatedAt, toCreatedAt, fromUpdatedAt, toUpdatedAt) {
    let currentPage = 1;
    let lastPage = 1;

    try {
      while (currentPage <= lastPage) {
        const { data, pagination } = await this.workflowProcessBusiness.getAll({
          disableElastic: true,
          useSlaveDBInstance: true,
          page: currentPage,
          count: global.config.elastic?.reindexCount || 100,
          sort: { created_at: 'asc' },
          filters: {
            from_created_at: fromCreatedAt,
            to_created_at: toCreatedAt,
            from_updated_at: fromUpdatedAt,
            to_updated_at: toUpdatedAt,
          },
        });

        if (data.length === 0) {
          lastPage = currentPage;
          currentPage++;
          continue;
        }

        if (data.length < pagination.perPage) {
          lastPage = currentPage;
        } else {
          lastPage = pagination.lastPage;
        }

        currentPage = pagination.currentPage;
        currentPage++;

        await this.workflowLogBusiness.reindexWorkflowProcesses(data);
      }

      await models.elasticReindexLog.setFinished(reindexLog.id);
    } catch (error) {
      await models.elasticReindexLog.setError(reindexLog.id, error?.message);
    }
  }

  /**
   * Get manual reindex for period status.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   * @returns
   */
  async getManualReindexForPeriodStatus(req, res) {
    return this.responseData(res, this.manualReindexProcess);
  }

  /**
   * Manual reindex for period.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async manualReindexForPeriod(req, res) {
    // Get filters.
    let { fromCreatedAt, toCreatedAt, fromUpdatedAt, toUpdatedAt, skipErrors = false } = matchedData(req, { locations: ['body'] });
    const { authUserInfo: { userId = 'SYSTEM', name: userName = 'SYSTEM' } = {} } = req;

    // Check that Elastic enabled.
    const { enabled, reindex: { enabled: isReindexEnabled } = {} } = global.config?.elastic || {};
    if (!enabled || !isReindexEnabled) {
      return this.responseError(res, 'Elastic is disabled.', 500);
    }

    // Check status.
    if (this.manualReindexProcess.status === this.ManualReindexProcessStatuses.Running) {
      return this.responseError(res, 'Reindex already running.', 500);
    }

    // Run manual reindex for period.
    const jobId = crypto.randomBytes(32).toString('hex');
    this.runManualReindexForPeriodJob({
      jobId,
      userId,
      userName,
      fromCreatedAt,
      toCreatedAt,
      fromUpdatedAt,
      toUpdatedAt,
      skipErrors,
    });

    // Response.
    this.responseData(res, { jobId }, false, 202);
  }

  /**
   * Run manual reindex for period job.
   * @param {object} params Params.
   * @param {string} params.jobId Job ID.
   * @param {string} params.userId User ID.
   * @param {string} params.userName User name.
   * @param {string} params.fromCreatedAt From created at.
   * @param {string} params.toCreatedAt To created at.
   * @param {string} params.fromUpdatedAt From updated at.
   * @param {string} params.toUpdatedAt To updated at.
   * @param {boolean} [params.skipErrors] Skip errors indicator.
   */
  async runManualReindexForPeriodJob({ jobId, userId, userName, fromCreatedAt, toCreatedAt, fromUpdatedAt, toUpdatedAt, skipErrors = false }) {
    // Set status.
    this.manualReindexProcess = {
      jobId,
      status: this.ManualReindexProcessStatuses.Running,
      startTimestamp: +new Date(),
      endTimestamp: null,
      total: 0,
      processed: 0,
      failed: 0,
      completed: 0,
      error: null,
      filters: {
        fromCreatedAt,
        toCreatedAt,
        fromUpdatedAt,
        toUpdatedAt,
      },
    };

    // Log.
    log.save('manual-reindex-started', { userId, userName, fromCreatedAt, toCreatedAt, fromUpdatedAt, toUpdatedAt });

    // Run reindex.
    let reindexLog;
    try {
      reindexLog = await models.elasticReindexLog.create({
        userId,
        userName,
        filters: {
          fromCreatedAt,
          toCreatedAt,
          fromUpdatedAt,
          toUpdatedAt,
        },
      });

      // Get workflow IDs list.
      log.save('manual-reindex-before-get-workflow-ids-list', { jobId, fromCreatedAt, toCreatedAt, fromUpdatedAt, toUpdatedAt });
      const workflowIds = await models.workflow.getWorkflowIdsList({
        fromCreatedAt,
        toCreatedAt,
        fromUpdatedAt,
        toUpdatedAt,
      });
      log.save('manual-reindex-after-get-workflow-ids-list', {
        jobId,
        fromCreatedAt,
        toCreatedAt,
        fromUpdatedAt,
        toUpdatedAt,
        length: workflowIds.length,
      });
      this.manualReindexProcess.total = workflowIds.length;

      // Run reindex for each workflow ID.
      const processesLength = workflowIds.length;
      let processIndex = 0;
      let workflowIdsToHandle = [...workflowIds];
      while (workflowIdsToHandle.length > 0) {
        // Define chunk.
        const workflowIdsChunk = workflowIdsToHandle.splice(0, 100);
        log.save('manual-reindex-workflow-ids-chunk', { jobId, workflowIdsChunk });
        let workflows;
        try {
          workflows = await this.workflowProcessBusiness.getAllByWorkflowIds(workflowIdsChunk);
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 10e3));
          workflows = await this.workflowProcessBusiness.getAllByWorkflowIds(workflowIdsChunk);
        }

        // Handle chunk.
        for (const workflowIndex in workflows) {
          const workflow = workflows[workflowIndex];
          // Log every 1000th entry.
          if (parseInt(processIndex) % 1000 === 0) {
            log.save('manual-reindex-workflow-handling', { jobId, workflowId: workflow.id, processesLength, processIndex });
          }
          if (skipErrors) {
            // Skip errors and don't wait promise resolving.
            this.workflowLogBusiness.reindexWorkflowProcess(workflow, {
              processesLength,
              processIndex,
            });
            await new Promise((resolve) => setTimeout(resolve, 5));
          } else {
            // Don't skip error but retry if error.
            try {
              await this.workflowLogBusiness.reindexWorkflowProcess(workflow, {
                processesLength,
                processIndex,
              });
            } catch {
              await new Promise((resolve) => setTimeout(resolve, 1e3));
              await this.workflowLogBusiness.reindexWorkflowProcess(workflow, {
                processesLength,
                processIndex,
              });
            }
          }

          // Increment counters.
          processIndex++;
          this.manualReindexProcess.processed++;
          this.manualReindexProcess.completed++;
        }
      }

      // Set status.
      this.manualReindexProcess.status = this.ManualReindexProcessStatuses.Completed;
      this.manualReindexProcess.endTimestamp = +new Date();
      await models.elasticReindexLog.setFinished(reindexLog.id);
    } catch (error) {
      // Set error status.
      this.manualReindexProcess.status = this.ManualReindexProcessStatuses.Failed;
      this.manualReindexProcess.endTimestamp = +new Date();
      this.manualReindexProcess.error = error?.message;
      this.manualReindexProcess.failed = this.manualReindexProcess.total - this.manualReindexProcess.completed;
      await models.elasticReindexLog.setError(reindexLog.id, error?.message);
    }
  }
}

module.exports = WorkflowLogController;
