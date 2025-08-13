'use client';

import dynamic from 'next/dynamic';

const MyStudiesPageContent = dynamic(
  () => import('@/components/My/MyStudiesPageContent'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold-start border-t-transparent"></div>
        <span className="ml-2 text-gray-600">로딩 중...</span>
      </div>
    ),
  }
);

export default function MyStudiesPage() {
  return <MyStudiesPageContent />;
}
