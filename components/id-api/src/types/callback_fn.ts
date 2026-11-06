export type CallbackFn<T = any> = (err: Error | null, payload?: T | null) => void;
