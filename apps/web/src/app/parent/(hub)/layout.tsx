import { Sidebar } from '@/components/parent/Sidebar';

export default function ParentHubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <Sidebar />
      <main className="ml-64 px-10 py-8">{children}</main>
    </div>
  );
}
