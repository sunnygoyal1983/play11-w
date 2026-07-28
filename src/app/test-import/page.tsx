import styles from './page.module.css';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ManualImport } from './ManualImport';
import ImportSchedulerClient from './ImportSchedulerClient';

export default async function TestImportPage() {
  // Check authorization
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role;

  // Only admins can access this page
  if (!session?.user || userRole !== 'ADMIN') {
    notFound();
  }

  return (
    <div className={styles.container}>
      <h1>Data Import Tools</h1>

      <div className={styles.tabs}>
        <Link href="/test-import" className={styles.active}>
          Import Tools
        </Link>
      </div>

      <div className={styles.content}>
        <ManualImport />

        <div className={styles.divider}>
          <hr />
          <span>OR</span>
          <hr />
        </div>

        <ImportSchedulerClient />
      </div>
    </div>
  );
}
