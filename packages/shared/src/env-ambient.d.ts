// Ambient declarations for shared package environment
declare const process: {
  env: Record<string, string | undefined>;
};

interface ErrorConstructor {
  captureStackTrace?(targetObject: object, constructorOpt?: (...args: never[]) => unknown): void;
}
