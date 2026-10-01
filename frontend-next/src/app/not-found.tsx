import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Compass, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#FAF8F5] dark:bg-[#0B0F17] text-slate-800 dark:text-slate-100 select-none">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-10 text-center shadow-lg space-y-6">
        <div className="h-16 w-16 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto shadow-xs">
          <Compass className="h-8 w-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-bold tracking-wider uppercase text-muted-foreground">
            Error 404
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Page Not Found
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The page or atmosphere theme you requested does not exist or has been retired.
          </p>
        </div>

        <div className="pt-2">
          <Link href="/">
            <Button
              className="w-full h-11 rounded-full font-semibold bg-[#0B4F48] hover:bg-[#083E38] text-white shadow-xs gap-2 cursor-pointer"
            >
              <Home className="h-4 w-4" />
              <span>Return to JaagrMind</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
