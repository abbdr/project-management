import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-6">
          <h1 className="text-6xl font-bold text-gray-400 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Page not found
          </h2>
          <p className="text-gray-600 mb-6">
            The page you're looking for doesn't exist.
          </p>
        </div>
        <div className="space-y-4">
          <Link
            href="/"
            className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 inline-block"
          >
            Go back home
          </Link>
          <div>
            <Link
              href="/dashboard"
              className="text-indigo-600 hover:text-indigo-500 font-medium"
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 