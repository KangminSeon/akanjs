import { AkanjsFooter, AkanjsHeader, akanjsHomeHeaderLinks } from "@apps/akan/ui";

interface LayoutProps {
  children: React.ReactNode;
}
export default function Layout({ children }: LayoutProps) {
  return (
    <>
      <AkanjsHeader links={akanjsHomeHeaderLinks} mobileDrawerLinks={akanjsHomeHeaderLinks} />
      <div className="relative flex w-full">
        <div className="w-full">{children}</div>
      </div>
      <AkanjsFooter />
    </>
  );
}
