"use client";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

const Error = ({ error, reset }: ErrorProps) => (
  <div>
    <h2>Something went wrong!</h2>
    <p>{error.message}</p>
    <button onClick={() => reset()}>Try again</button>
  </div>
);

export default Error;
