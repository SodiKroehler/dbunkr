import Link from "next/link";

export function Header() {
  return (
    <header className="flex items-center gap-8 bg-black/35 px-8 py-5 backdrop-blur-sm">
      <Link
        href="/"
        className="text-sm tracking-wide text-white"
        style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
      >
        HOME
      </Link>
      <Link
        href="/research"
        className="text-sm tracking-wide text-white"
        style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
      >
        RESEARCH
      </Link>
    </header>
  );
}
