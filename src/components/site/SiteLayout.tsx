import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

/** Marketing / browsing shell: sticky header + content + footer. */
export function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
