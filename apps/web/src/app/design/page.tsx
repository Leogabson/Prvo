import React from 'react';
import { notFound } from 'next/navigation';
import { DesignView } from './DesignView';
import { isDesignEnabled } from './guard';

export default function DesignPage() {
  if (!isDesignEnabled()) {
    notFound();
  }

  return <DesignView />;
}
