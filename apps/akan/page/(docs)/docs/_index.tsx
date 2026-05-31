import { router } from "akanjs/client";

export default async function Page() {
  router.redirect("/docs/intro/quickstart");
  return <div>Docs</div>;
}
