'use client';

import { ProtectedRoute } from '@/lib/auth-context';
import { DashboardContent } from '@/components/dashboard-content';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
