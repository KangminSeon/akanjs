import { type ReactNode, Suspense } from "react";

export interface ClientSideProps {
  /** Content that should render inside a React Suspense boundary on the client. */
  children: ReactNode;
  /** Optional Suspense fallback. */
  loading?: ReactNode;
}
export const ClientSide = ({ children, loading }: ClientSideProps) => {
  return <Suspense fallback={loading}>{children}</Suspense>;
};
