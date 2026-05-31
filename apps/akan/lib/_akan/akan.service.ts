import { serve } from "akanjs/service";

export class AkanService extends serve("akan" as const, { serverMode: "batch" }, ({ service }) => ({})) {}
