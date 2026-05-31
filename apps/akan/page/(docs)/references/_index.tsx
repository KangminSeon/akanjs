import { router } from "akanjs/client";

export default async function Page() {
  router.redirect("/references/cli/overview");
  return <div>Docs</div>;
}
