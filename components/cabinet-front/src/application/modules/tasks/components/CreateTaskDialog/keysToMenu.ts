import LTT from 'list-to-tree';

interface KeyItem {
  id?: string | number;
  parentId?: string | number;
  [key: string]: unknown;
}

export default (list: KeyItem[]) =>
  new LTT(
    list.map((item) => ({ ...item, parentId: item.parentId || 0 })),
    {
      key_id: 'id',
      key_parent: 'parentId',
      key_child: 'items'
    }
  ).GetTree();
