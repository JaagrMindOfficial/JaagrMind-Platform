import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="relative flex flex-col flex-1 items-center justify-center bg-background overflow-hidden min-h-screen">
      
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <main className="z-10 flex flex-col items-center justify-center px-6 text-center max-w-3xl mx-auto py-32 space-y-10">
        
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tighter text-balance leading-[1.1]">
          Assessments that feel{" "}
          <span className="text-primary italic">alive.</span>
        </h1>
        
        <p className="max-w-xl mx-auto text-base md:text-lg text-muted-foreground leading-relaxed">
          Move beyond static forms. JaagrMind delivers multidimensional, interactive 
          experiences that capture deep student insights instantly.
        </p>

        <div className="flex gap-3 pt-2">
          <Link href="/login" passHref>
            <Button size="lg" className="h-11 px-6 font-medium">
              Log in
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="h-11 px-6 font-medium">
            Explore Demo
          </Button>
        </div>
      </main>
    </div>
  );
}
