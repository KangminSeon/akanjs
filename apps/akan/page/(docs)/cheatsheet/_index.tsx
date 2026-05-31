import { router } from "akanjs/client";

export default async function Page() {
  router.redirect("/cheatsheet/general/auth");
  return <div>Docs</div>;
}
