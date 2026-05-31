"use client";

import { st, usePage } from "@libs/shared/client";
import { Field } from "@libs/shared/ui";
import { Layout } from "akanjs/ui";

interface AdminEditProps {
  className?: string;
}

export const General = ({ className }: AdminEditProps) => {
  const adminForm = st.use.adminForm();
  const { l } = usePage();
  return (
    <Layout.Template className={className}>
      <Field.Text
        label={l("admin.accountId")}
        desc={l("admin.accountId.desc")}
        value={adminForm.accountId}
        onChange={st.do.setAccountIdOnAdmin}
      />
    </Layout.Template>
  );
};
