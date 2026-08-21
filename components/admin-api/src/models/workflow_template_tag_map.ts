import Sequelize from 'sequelize';

import { Model } from './model';

export class WorkflowTemplateTagMapModel extends Model {
  static singleton: WorkflowTemplateTagMapModel;

  constructor(dbInstance) {
    if (!WorkflowTemplateTagMapModel.singleton) {
      super(dbInstance);

      this.model = this.db.define(
        'workflowTemplateTagMap',
        {
          workflowTemplateId: {
            type: Sequelize.INTEGER,
            field: 'workflow_template_id',
            primaryKey: true,
            references: {
              model: 'workflow_templates',
              key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          workflowTemplateTagId: {
            type: Sequelize.INTEGER,
            field: 'workflow_template_tag_id',
            primaryKey: true,
            references: {
              model: 'workflow_template_tags',
              key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
        },
        {
          tableName: 'workflow_template_tag_map',
          underscored: true,
          timestamps: false,
        },
      );

      WorkflowTemplateTagMapModel.singleton = this;
    }

    return WorkflowTemplateTagMapModel.singleton;
  }
}
