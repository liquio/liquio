const Sequelize = require('sequelize');

const Model = require('./model');
const ElasticReindexLogEntity = require('../entities/elastic_reindex_log');

class ElasticReindexLog extends Model {
  constructor(dbInstance) {
    // Singleton.
    if (!ElasticReindexLog.singleton) {
      // Call parent constructor.
      super(dbInstance);

      // Sequelize model.
      this.model = this.db.define(
        'elastic_reindex_log',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV1,
          },
          user_id: {
            allowNull: true,
            type: Sequelize.STRING,
          },
          user_name: {
            allowNull: true,
            type: Sequelize.STRING,
          },
          filters: {
            allowNull: true,
            type: Sequelize.JSONB,
          },
          status: {
            allowNull: false,
            type: Sequelize.ENUM('running', 'finished'),
          },
          error_message: {
            allowNull: true,
            type: Sequelize.STRING,
          },
        },
        {
          tableName: 'elastic_reindex_log',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );

      // Sequelize model params.
      this.model.prototype.prepareEntity = this.prepareEntity;
      this.model.paginate = this.paginate;

      // Define singleton.
      ElasticReindexLog.singleton = this;
    }

    // Return singleton.
    return ElasticReindexLog.singleton;
  }
  /**
   *
   * @param {object} data
   * @returns
   */
  async create(data) {
    const reindexLog = await this.model.create(this.prepareForModel(data));
    return new ElasticReindexLogEntity(reindexLog);
  }

  /**
   *
   * @param {string} logId
   * @param {string} errorMessage
   */
  async setError(id, errorMessage) {
    return await this.model.update({ status: 'error', error_message: errorMessage }, { where: { id } });
  }

  /**
   *
   * @param {string} logId
   */
  async setFinished(id) {
    return await this.model.update({ status: 'finished' }, { where: { id } });
  }

  /**
   * Get all.
   * @returns {Promise<ElasticReindexLogEntity[]>}
   */
  async getAll({ currentPage, perPage, filters, sort }) {
    let sequelizeOptions = {
      currentPage,
      perPage,
      filters: { ...filters },
      sort: [['created_at', 'desc']],
    };

    if (typeof filters.user_name !== 'undefined') {
      sequelizeOptions.filters.user_name = {
        [Sequelize.Op.iLike]: `%${filters.user_name}%`,
      };
    }
    if (typeof filters.from_created_at !== 'undefined' && typeof filters.to_created_at !== 'undefined') {
      sequelizeOptions.filters['created_at'] = Sequelize.where(Sequelize.fn('date', Sequelize.col('created_at')), {
        [Sequelize.Op.between]: [filters.from_created_at, filters.to_created_at],
      });

      delete sequelizeOptions.filters.from_created_at;
      delete sequelizeOptions.filters.to_created_at;
    } else if (typeof filters.from_created_at !== 'undefined') {
      sequelizeOptions.filters['created_at'] = Sequelize.where(Sequelize.fn('date', Sequelize.col('created_at')), {
        [Sequelize.Op.gte]: filters.from_created_at,
      });

      delete sequelizeOptions.filters.from_created_at;
    } else if (typeof filters.to_created_at !== 'undefined') {
      sequelizeOptions.filters['created_at'] = Sequelize.where(Sequelize.fn('date', Sequelize.col('created_at')), {
        [Sequelize.Op.lte]: filters.to_created_at,
      });

      delete sequelizeOptions.filters.to_created_at;
    }

    sort = this.prepareSort(sort);
    if (sort.length > 0) {
      sequelizeOptions.sort = sort;
    }

    const entities = await this.model.paginate(sequelizeOptions);
    entities.data = entities.data.map((item) => this.prepareEntity(item));

    return entities;
  }

  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {ElasticReindexLogEntity}
   */
  prepareEntity(item) {
    return new ElasticReindexLogEntity({
      id: item.id,
      userId: item.user_id,
      userName: item.user_name,
      filters: item.filters,
      status: item.status,
      errorMessage: item.error_message,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    });
  }

  /**
   * Prepare for model.
   * @param {AccessHistoryEntity} item Item.
   * @returns {object} Prepared for model object.
   */
  prepareForModel(item) {
    return {
      id: item.id,
      user_id: item.userId,
      user_name: item.userName,
      filters: item.filters,
      status: item.stats || 'running',
      error_message: item.errorMessage,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }

  /**
   * Get hourly time taken statistics.
   * @param {object} [options] Options.
   * @param {string} [options.bucketSize] Bucket (defaults to hour).
   * @param {string} [options.timeFrom] Time from (defaults to week ago).
   * @param {string} [options.timeTo] Time to (defaults to now).
   */
  async getReindexTimeStats(options = {}) {
    if (!options.bucketSize) {
      options.bucketSize = null;
    }
    if (!options.timeFrom) {
      options.timeFrom = null;
    }
    if (!options.timeTo) {
      options.timeTo = null;
    }

    return this.model.sequelize.query(
      `
        WITH logs AS (
          SELECT
            EXTRACT(EPOCH FROM (updated_at - created_at)) AS time_taken_seconds,
            EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (ORDER BY created_at DESC))) AS reindex_interval_seconds,
            status,
            user_id,
            created_at
          FROM public.elastic_reindex_log
        )
        SELECT
          DATE_TRUNC(COALESCE(:bucketSize, 'hour'), created_at) AS bucket,
          AVG(time_taken_seconds) AS avg_time_taken,
          MIN(time_taken_seconds) AS min_time_taken,
          MAX(time_taken_seconds) AS max_time_taken,
          STDDEV(time_taken_seconds) AS stdev_time_taken,
          COUNT(*) AS total_count,
          COUNT(CASE WHEN status = 'finished' THEN 1 END) AS finished_count,
          COUNT(CASE WHEN status = 'running' THEN 1 END) AS running_count,
          COUNT(CASE WHEN status = 'error' THEN 1 END) AS error_count,
          COUNT(CASE WHEN user_id = 'SYSTEM' THEN 1 END) AS system_count,
          COUNT(CASE WHEN user_id != 'SYSTEM' THEN 1 END) AS non_system_count
        FROM logs
        WHERE created_at BETWEEN COALESCE(:timeFrom, NOW() - INTERVAL '1 week') AND COALESCE(:timeTo, NOW())
        GROUP BY bucket
        ORDER BY bucket
      `,
      {
        replacements: {
          bucketSize: options.bucketSize,
          timeFrom: options.timeFrom,
          timeTo: options.timeTo,
        },
        type: Sequelize.QueryTypes.SELECT,
      },
    );
  }

  /**
   * Get reindex statistics over a period.
   * @param {object} [options] Options.
   * @param {string} [options.timeFrom] Time from (defaults to week ago).
   * @param {string} [options.timeTo] Time to (defaults to now).
   */
  async getReindexPeriodStats(options = {}) {
    if (!options.timeFrom) {
      options.timeFrom = null;
    }
    if (!options.timeTo) {
      options.timeTo = null;
    }

    return this.model.sequelize.query(
      `
        SELECT
          COUNT(*) AS total_count,
          COUNT(CASE WHEN status = 'finished' THEN 1 END) AS finished_count,
          COUNT(CASE WHEN status = 'running' THEN 1 END) AS running_count,
          COUNT(CASE WHEN status = 'error' THEN 1 END) AS error_count,
          COUNT(CASE WHEN user_id = 'SYSTEM' THEN 1 END) AS system_count,
          COUNT(CASE WHEN user_id != 'SYSTEM' THEN 1 END) AS non_system_count,
          COUNT(CASE WHEN EXTRACT(EPOCH FROM (updated_at - created_at)) > 1 THEN 1 END) AS longer_than_1s_count,
          COUNT(CASE WHEN EXTRACT(EPOCH FROM (updated_at - created_at)) > 10 THEN 1 END) AS longer_than_10s_count,
          COUNT(CASE WHEN EXTRACT(EPOCH FROM (updated_at - created_at)) > 60 THEN 1 END) AS longer_than_1m_count,
          COUNT(CASE WHEN EXTRACT(EPOCH FROM (updated_at - created_at)) > 600 THEN 1 END) AS longer_than_10m_count
        FROM public.elastic_reindex_log
        WHERE created_at BETWEEN COALESCE(:timeFrom, NOW() - INTERVAL '1 week') AND COALESCE(:timeTo, NOW())
      `,
      {
        replacements: {
          timeFrom: options.timeFrom,
          timeTo: options.timeTo,
        },
        type: Sequelize.QueryTypes.SELECT,
      },
    );
  }

  /**
   * Get last reindex logs entry data.
   */
  async getLatestReindexLogs() {
    return this.model.sequelize.query(
      `
        (
          SELECT
            id,
            updated_at,
            status,
            EXTRACT(EPOCH FROM (updated_at - created_at)) AS time_taken_seconds
          FROM public.elastic_reindex_log
          WHERE status = 'running'
          ORDER BY updated_at DESC
          LIMIT 1
        )
        UNION ALL
        (
          SELECT
            id,
            updated_at,
            status,
            EXTRACT(EPOCH FROM (updated_at - created_at)) AS time_taken_seconds
          FROM public.elastic_reindex_log
          WHERE status = 'finished'
          ORDER BY updated_at DESC
          LIMIT 1
        )
        UNION ALL
        (
          SELECT
            id,
            updated_at,
            status,
            EXTRACT(EPOCH FROM (updated_at - created_at)) AS time_taken_seconds
          FROM public.elastic_reindex_log
          WHERE status = 'error'
          ORDER BY updated_at DESC
          LIMIT 1
        )
      `,
      {
        type: Sequelize.QueryTypes.SELECT,
      },
    );
  }
}

module.exports = ElasticReindexLog;
