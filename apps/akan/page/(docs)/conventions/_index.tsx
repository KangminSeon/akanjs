import { router } from "akanjs/client";

export default async function Page() {
  router.redirect("/conventions/workspace/structure");
  return <div>Docs</div>;
}
