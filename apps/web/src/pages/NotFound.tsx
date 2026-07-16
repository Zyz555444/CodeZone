import { Link } from "react-router-dom";
import { Hash, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-paper text-neutral-9 dark:text-[var(--neutral-9)]">
      <div className="text-center space-y-6 max-w-sm">
        <div className="flex justify-center">
          <span className="grid place-items-center w-12 h-12 rounded-md bg-[var(--color-accent)] text-white">
            <Hash className="w-6 h-6" strokeWidth={2.5} />
          </span>
        </div>
        <h1 className="font-serif text-display-48 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
          404
        </h1>
        <p className="text-copy-16 text-neutral-6 dark:text-[var(--neutral-6)]">
          这个页面不存在，或者你访问的链接已失效。
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-[var(--color-accent)] hover:underline text-copy-14"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
          返回工作台
        </Link>
      </div>
    </div>
  );
}
