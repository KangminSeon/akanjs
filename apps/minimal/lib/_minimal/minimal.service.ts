import { serve } from "akanjs/service";

export class MinimalService extends serve("minimal" as const, { serverMode: "batch" }, ({ service }) => ({})) {}
