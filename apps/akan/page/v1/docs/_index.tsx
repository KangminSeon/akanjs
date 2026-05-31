import { router } from "akanjs/client";

export default async function Page() {
  router.redirect("/v1/docs/intro/quickstart");
  return <div>Docs</div>;
}
