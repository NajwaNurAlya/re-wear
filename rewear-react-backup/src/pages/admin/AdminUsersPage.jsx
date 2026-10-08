import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import EmptyState from '@/components/ui/EmptyState';
import { useAsync } from '@/hooks/useAsync';
import { authService } from '@/services';

export default function AdminUsersPage() {
  const { data = [], loading, error, reload } = useAsync(() => authService.listUsers(), []);
  const columns = [
    { key: 'fullName', header: 'Member', sortable: true, render: (user) => <><span className="font-medium">{user.fullName}</span><span className="block text-meta">{user.email}</span></> },
    { key: 'role', header: 'Account type', sortable: true, render: (user) => <span className="capitalize">{user.role}</span> },
    { key: 'id', header: 'Account reference', hideBelow: 'md', render: (user) => <span className="font-mono text-xs">{user.id}</span> },
  ];

  return (
    <section className="container-page py-8 md:py-12" aria-labelledby="admin-users-title">
      <p className="text-meta uppercase tracking-[0.16em]">Curator desk</p>
      <h1 id="admin-users-title" className="display-md mt-2">Members</h1>
      <p className="mt-3 max-w-2xl text-brown">Buyer and seller accounts registered on RE:WEAR.</p>
      <div className="mt-8 border-t border-beige pt-6">{error ? <EmptyState title="Members could not be loaded" description="Please retry." action={<Button variant="secondary" onClick={reload}>Retry</Button>} /> : <DataTable caption="RE:WEAR members" columns={columns} rows={data} loading={loading} empty={<EmptyState compact title="No members yet" description="Accounts will appear after registration." />} />}</div>
      <p className="mt-5 text-xs leading-relaxed text-brown">This page is read-only. Passwords and security settings are managed by the sign-in service.</p>
    </section>
  );
}
