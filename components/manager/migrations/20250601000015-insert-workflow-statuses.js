module.exports = {
  async up(queryInterface) {
    return queryInterface.sequelize.query(`
      INSERT INTO public.workflow_statuses (id, name, created_at, updated_at)
      SELECT 1, 'doing', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM public.workflow_statuses WHERE id = 1 OR name = 'doing');

      INSERT INTO public.workflow_statuses (id, name, created_at, updated_at)
      SELECT 2, 'done', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM public.workflow_statuses WHERE id = 2 OR name = 'done');

      INSERT INTO public.workflow_statuses (id, name, created_at, updated_at)
      SELECT 3, 'rejected', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM public.workflow_statuses WHERE id = 3 OR name = 'rejected');
    `);
  },

  async down(queryInterface) {
    return queryInterface.sequelize.query(`
      DELETE FROM public.workflow_statuses
      WHERE id IN (1, 2, 3)
         OR name IN ('doing', 'done', 'rejected');
    `);
  },
};
