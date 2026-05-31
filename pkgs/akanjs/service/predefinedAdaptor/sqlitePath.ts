import path from "node:path";

interface ResolveDefaultSqliteFileOptions {
  appName: string;
  fileName: string;
  isProduction: boolean;
  workspaceRoot?: string;
}

export const resolveDefaultSqliteFile = ({
  appName,
  fileName,
  isProduction,
  workspaceRoot,
}: ResolveDefaultSqliteFileOptions) => {
  const sqliteDir = process.env.AKAN_SQLITE_DIR;
  if (sqliteDir) return path.join(sqliteDir, fileName);
  if (isProduction) return path.join(process.cwd(), "sqlite", fileName);
  return path.join(workspaceRoot ?? process.cwd(), "local", "apps", appName, fileName);
};
