import Link from "next/link";

export function Header() {
  return (
    <header className="flex items-center gap-8 px-8 py-5">
      <Link
        href="/search"
        className="text-sm tracking-wide text-black"
        style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
      >
        SEARCH
      </Link>
      <Link
        href="/research"
        className="text-sm tracking-wide text-black"
        style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
      >
        RESEARCH
      </Link>
    </header>
  );
}
