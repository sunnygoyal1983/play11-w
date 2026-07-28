'use client';

import dynamic from 'next/dynamic';

const ImportScheduler = dynamic(() => import('./ImportScheduler'), {
  ssr: false,
});

export default function ImportSchedulerClient() {
  return <ImportScheduler />;
}
