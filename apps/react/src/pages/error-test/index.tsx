import { useSimpleQuery } from '@/hooks';
import { Suspense, useState, useTransition } from 'react';
import AsyncErrorPage from './AsyncErrorPage';

const addComment = (comment: string | null) => {
  // For demonstration purposes to show Error Boundary
  if (comment === null) {
    throw new Error('Add Comment');
  }
};

const ErrorTest = () => {
  const [error, setError] = useState<Error | null>(null);
  const [pending, startTransition] = useTransition();

  const { data } = useSimpleQuery({
    queryFn: async () => {
      if (Math.random() < 0.5) {
        throw new Error('An intentional error occurred');
      }
      return { message: 'Success!' };
    },
    throwOnError: true,
  });

  if (error instanceof Error) {
    throw error;
  }

  if (!data) {
    return <div />;
  }

  return (
    <div>
      {data?.message}
      <button
        onClick={() => {
          setError(new Error('error button'));
        }}
      >
        error button
      </button>
      <button
        onClick={() => {
          new Error('not error button');
        }}
      >
        not error button
      </button>
      <button
        disabled={pending}
        onClick={() => {
          startTransition(() => {
            // Intentionally not passing a comment
            // so error gets thrown
            addComment(null);
          });
        }}
      >
        Add Comment
      </button>
      <Suspense fallback={<div>Loading...</div>}>
        <AsyncErrorPage />
      </Suspense>
    </div>
  );
};

export default ErrorTest;
