export type SharedMapInitialData<T> =
  | Map<string, T>
  | readonly (readonly [string, T])[]
  | { [key: string]: T }
  | undefined;
