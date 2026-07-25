import { Container } from "@/components/layout/container";

export default function GlobalLoading() {
  return (
    <Container className="pt-32 pb-20">
      <div className="space-y-8 animate-pulse">
        {/* Skeleton Header */}
        <div className="h-10 w-64 bg-slate-900/80 rounded-2xl border border-slate-800" />
        
        {/* Skeleton Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-80 bg-slate-900/60 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between">
              <div className="w-full h-48 bg-slate-950/80 rounded-2xl" />
              <div className="space-y-2 mt-4">
                <div className="h-5 w-3/4 bg-slate-800 rounded-lg" />
                <div className="h-4 w-1/2 bg-slate-800/60 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
