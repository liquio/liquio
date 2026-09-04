import LTT from 'list-to-tree';

export default (list) =>
  new LTT(
    list.map((item) => ({ ...item, parentId: item.parentId || 0 })),
    {
      key_id: 'id',
      key_parent: 'parentId',
      key_child: 'items'
    }
  ).GetTree();
