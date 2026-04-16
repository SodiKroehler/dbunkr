export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <section className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-4xl font-semibold tracking-tight">dbunkr</h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-300">
          A simple Next.js + Tailwind CSS stack, ready to deploy on Vercel.
        </p>
      </section>
    </main>
  );
}
