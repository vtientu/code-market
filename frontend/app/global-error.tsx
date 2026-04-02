"use client";

const GlobalError = ({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) => {
  return (
    <html>
      <body>
        <h2>{error.name}</h2>
        <p>{error.message}</p>
        <button onClick={() => unstable_retry()}>Try again</button>
      </body>
    </html>
  );
};

export default GlobalError;
