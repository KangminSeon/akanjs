import { server } from "../server";

const run = async () => {
  await server.start();

  await server.stop();
};
void run();
