import { adapt } from "akanjs/service";

export interface IpfsOptions {
  endpoint: string;
}

export class IpfsApi extends adapt("ipfsApi", ({ env }) => ({
  endpoint: env((option: IpfsOptions) => option.endpoint),
})) {
  getHttpsUri(uri: string) {
    return uri.replace("ipfs://", `${this.endpoint}/`);
  }
}
