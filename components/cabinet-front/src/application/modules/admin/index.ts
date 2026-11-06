import Curator from 'application/modules/admin/components/Curator';

export default {
  appbar: [
    {
      component: Curator,
      access: { userIsGod: true }
    }
  ]
};
