import BookmarksList from '@/components/community/BookmarksList';

export default function BookmarksPage() {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">북마크</h1>
      <BookmarksList />
    </div>
  );
}
