export type Cls<T = unknown> = new (...args: unknown[]) => T;

export type DependencyKind = "command" | "script" | "runner";
export type DependencyKey<RefName extends string, Kind extends DependencyKind> = `${RefName}${Capitalize<Kind>}`;

export type DependencyCls<T = unknown, Key extends string = string> = (new () => T) & {
  readonly dependencyKey: Key;
  readonly dependencyKind: DependencyKind;
  readonly refName: string;
};
