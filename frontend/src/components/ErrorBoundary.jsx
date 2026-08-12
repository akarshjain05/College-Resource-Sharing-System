import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-lg dark:border-slate-800 dark:bg-slate-950 sm:max-w-md w-full">
        <h1 className="mb-4 text-2xl font-bold text-slate-800 dark:text-slate-100">Something went wrong</h1>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          An unexpected error occurred. Please refresh the page or try again later.
        </p>
        <button
          onClick={() => {
            resetErrorBoundary();
            window.location.reload();
          }}
          className="inline-flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}

export default function ErrorBoundary({ children }) {
  return (
    <ReactErrorBoundary FallbackComponent={ErrorFallback}>
      {children}
    </ReactErrorBoundary>
  );
}
