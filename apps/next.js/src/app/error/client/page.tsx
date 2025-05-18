'use client';

import { useActionState } from 'react';
import { createPost } from './action';

export type InitialState = {
  message: string;
};

const initialState: InitialState = {
  message: '',
};

const Client = () => {
  const [state, formAction, pending] = useActionState(createPost, initialState);

  return (
    <form action={formAction}>
      <label htmlFor="title">Title</label>
      <input type="text" id="title" name="title" required />
      <label htmlFor="content">Content</label>
      <textarea id="content" name="content" required />
      {state?.message && (
        <p aria-live="polite" className="text-red-500">
          {state.message}
        </p>
      )}
      <button disabled={pending}>Create Post</button>
    </form>
  );
};

export default Client;
