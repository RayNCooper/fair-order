import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/nav";
import { TextLogo } from "@/components/TextLogo";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — hidden on mobile, 240px on md+ */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:border-sidebar-border md:bg-sidebar">
        <div className="p-4">
          <h2>
            <TextLogo size="sm" />
          </h2>
        </div>
        <DashboardNav />
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Bottom tabs — mobile only */}
      <DashboardNav mobile />
    </div>
  );
}
