import './globals.css';
import { Suspense } from 'react';
import AppContent from '@/components/AppContent';

const App = () => {
  return (
    <>
      <Suspense fallback={<div>로딩 중...</div>}>
        <AppContent />
      </Suspense>
    </>
  );
};
export default App;
