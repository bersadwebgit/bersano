'use client';

import BlogForm from '../components/BlogForm';

export default function NewBlogPostPage() {
  return (
    <div className="py-2 select-none">
      <BlogForm isEdit={false} />
    </div>
  );
}
