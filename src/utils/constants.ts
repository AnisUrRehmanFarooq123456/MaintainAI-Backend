import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-100">
      {/* Navbar */}

      <nav className="bg-white shadow">
        <div className="container flex items-center justify-between h-16">
          <h1 className="text-2xl font-bold text-blue-600">My App</h1>

          <div className="space-x-3">
            <Link href="/login">
              <button className="secondary-btn">Login</button>
            </Link>

            <Link href="/signup">
              <button className="primary-btn">Sign Up</button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}

      <section className="container flex flex-col items-center justify-center text-center py-28">
        <h1 className="text-5xl font-bold mb-6">Welcome to My Application</h1>

        <p className="text-gray-600 max-w-xl mb-10">
          This is the landing page. Users can browse basic information here.
          Authentication is required before accessing protected features.
        </p>

        <div className="space-x-4">
          <Link href="/login">
            <button className="primary-btn">Get Started</button>
          </Link>

          <Link href="/signup">
            <button className="secondary-btn">Create Account</button>
          </Link>
        </div>
      </section>
    </main>
  );
}
