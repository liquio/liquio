/** Derive named slices without treating legacy dynamic endpoint keys as arbitrary typed state. */
export type StateFromReducerMap<Reducers> = {
  [Key in keyof Reducers as string extends Key
    ? never
    : number extends Key
    ? never
    : Key]: Reducers[Key] extends (...args: never[]) => infer State ? State : never;
};
