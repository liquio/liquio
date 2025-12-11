const Sequelize = require('sequelize');
const Model = require('./model');
const MassMessagesMailingEntity = require('../entities/mass_messages_mailing');

class MassMessagesMailingModel extends Model {
  // eslint-disable-next-line constructor-super
  constructor(dbInstance) {
    if (!MassMessagesMailingModel.singleton) {
      super(dbInstance);

      this.model = this.db.define(
        'mass_messages_mailing',
        {
          id: {
            primaryKey: true,
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV1,
          },
          initiator_id: Sequelize.STRING,
          emails_list: Sequelize.ARRAY(Sequelize.STRING),
          user_ids_list: Sequelize.ARRAY(Sequelize.STRING),
          subject: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          full_text: Sequelize.STRING,
          response_by_emails: {
            type: Sequelize.JSON,
            allowNull: true,
          },
          response_by_user_ids: {
            type: Sequelize.JSON,
            allowNull: true,
          },
          is_finished: {
            allowNull: false,
            type: Sequelize.BOOLEAN,
            defaultValue: false,
          },
          created_at: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updated_at: {
            allowNull: false,
            type: Sequelize.DATE,
          },
        },
        {
          tableName: 'mass_messages_mailing',
          underscored: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      );
      this.model.prototype.prepareEntity = this.prepareEntity;
      this.model.paginate = this.paginate;
    }
  }

  /**
   * Create mass messages mailing.
   * @param {object} options Options.
   * @param {string} [options.initiatorId] Initiator user ID.
   * @param {[string]} options.emailsList List of emails to send.
   * @param {[string]} options.userIdsList List of user IDs to send.
   * @param {string} options.subject Subject of message.
   * @param {string} options.fullText Full text (body) of message.
   * @returns {Promise<MassMessagesMailingEntity>}
   */
  async create({ initiatorId, emailsList, userIdsList, subject, fullText }) {
    const entityForModel = this.prepareForModel({
      initiatorId,
      emailsList,
      userIdsList,
      subject,
      fullText,
    });

    const rawDbResponse = await this.model.create(entityForModel);

    return this.prepareEntity(rawDbResponse);
  }

  /**
   * Update mass messages mailing.
   * @param {string} id Mass messages mailing ID.
   * @param {object} data Data.
   * @returns {Promise<MassMessagesMailingEntity>}
   */
  async update(id, data) {
    const entityForModel = this.prepareForModel(data);
    const [, updatedMassMessagesMailing] = await this.model.update(entityForModel, {
      where: { id: id },
      returning: true,
    });

    if (updatedMassMessagesMailing.length === 1) {
      return this.prepareEntity(updatedMassMessagesMailing[0]);
    }
  }

  /**
   * Get list with pagination.
   * @returns {Promise<MassMessagesMailingEntity[]>}
   */
  async getListWithPagination({ currentPage, perPage, filters, sort }) {
    const sequelizeOptions = {
      currentPage,
      perPage,
      filters: {},
      sort: [],
    };

    if (typeof filters.id !== 'undefined') {
      sequelizeOptions.filters['id'] = filters.id;
    }
    if (typeof filters.initiator_id !== 'undefined') {
      sequelizeOptions.filters['initiator_id'] = filters.initiator_id;
    }

    const preparedSort = this.prepareSort(sort);
    if (preparedSort.length > 0) {
      sequelizeOptions.sort = preparedSort;
    }

    const massMessagesMailingEntities = await this.model.paginate(sequelizeOptions);

    massMessagesMailingEntities.data = massMessagesMailingEntities.data.map((item) => this.prepareEntity(item));

    return massMessagesMailingEntities;
  }
  /**
   * Prepare entity.
   * @param {object} item Item.
   * @returns {MassMessagesMailingEntity}
   */
  prepareEntity(item) {
    return new MassMessagesMailingEntity({
      id: item.id,
      initiatorId: item.initiator_id,
      emailsList: item.emails_list,
      userIdsList: item.user_ids_list,
      subject: item.subject,
      fullText: item.full_text,
      responseByEmails: item.response_by_emails,
      responseByUserIds: item.response_by_user_ids,
      isFinished: item.is_finished,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    });
  }

  /**
   * Prepare for model.
   * @param {MassMessagesMailingEntity} item Item.
   * @returns {object}
   */
  prepareForModel(item) {
    return {
      id: item.id,
      initiator_id: item.initiatorId,
      emails_list: item.emailsList,
      user_ids_list: item.userIdsList,
      subject: item.subject,
      full_text: item.fullText,
      response_by_emails: item.responseByEmails,
      response_by_user_ids: item.responseByUserIds,
      is_finished: item.isFinished,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }
}

module.exports = MassMessagesMailingModel;
