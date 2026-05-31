import type { BlobStorageApi } from "@libs/util/srvkit";
import { serve } from "akanjs/service";

export class LocalFileService extends serve("localFile" as const, ({ use }) => ({
  blobStorageApi: use<BlobStorageApi>(),
})) {
  async readLocalFile(path: string) {
    if (path.startsWith("private/")) throw new Error("Private files are not served through localFile");
    return await this.blobStorageApi.readData(path);
  }
}
