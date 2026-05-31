"use client";
import { st, usePage } from "@libs/shared/client";
import { Field } from "@libs/shared/ui";
import { Layout } from "akanjs/ui";

interface FileEditProps {
  className?: string;
}
export const General = ({ className }: FileEditProps) => {
  const fileForm = st.use.fileForm();
  const { l } = usePage();
  return (
    <Layout.Template className={className}>
      <Field.Text
        label={l("file.filename")}
        desc={l("file.filename.desc")}
        value={fileForm.url}
        onChange={st.do.setUrlOnFile}
      />
    </Layout.Template>
  );
};
