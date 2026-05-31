import { TypeChecker } from "../typeChecker";

try {
  const configPath = process.env.AKAN_TYPECHECK_TSCONFIG;
  if (!configPath) throw new Error("AKAN_TYPECHECK_TSCONFIG is required");
  const result = TypeChecker.checkProject(configPath);
  if (result.errors.length > 0) {
    console.error(result.message);
    process.exit(1);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
