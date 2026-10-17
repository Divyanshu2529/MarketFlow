import { AIAssistant } from "@/components/assistant/AIAssistant";
import { Navbar } from "./navbar";
import { Sidebar } from "./Sidebar";

type DashboardLayoutProps = {
  children: React.ReactNode;
  assistantContext?: Record<string, unknown>;
};

export function DashboardLayout({
  children,
  assistantContext = {},
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <Navbar />

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>

      <AIAssistant context={assistantContext} />
    </div>
  );
}