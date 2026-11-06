declare module 'list-to-tree' {
  interface ListToTreeOptions {
    key_id?: string;
    key_parent?: string;
    key_child?: string;
  }

  class LTT {
    constructor(list: unknown[], options?: ListToTreeOptions);
    GetTree(): unknown[];
  }

  export default LTT;
}
