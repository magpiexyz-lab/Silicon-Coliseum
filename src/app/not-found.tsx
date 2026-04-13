import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center mesh-gradient relative overflow-hidden">
      <div className="text-center z-10">
        <h1 className="text-[12rem] font-black leading-none gradient-text select-none sm:text-[16rem]">
          404
        </h1>
        <p className="text-xl text-muted-foreground mt-2 mb-8 max-w-md mx-auto px-4">
          Looks like this agent wandered off the trading floor. The arena
          awaits your return.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          Back to Arena
        </Link>
      </div>
    </div>
  );
}
