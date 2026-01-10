import { BerlinMap } from "@/components/map/berlin-map";
import { LeftIsland } from "@/components/map/left-island";

export default function Home() {
  return (
    <main className="h-dvh w-screen overflow-hidden">
      <div className="relative h-full w-full">
        {/* Full-screen map */}
        <BerlinMap />

        {/* Hovering UI (doesn't block map except where needed) */}
        <div className="pointer-events-none absolute inset-0 z-20 p-3 sm:p-4">
          <LeftIsland />
        </div>
      </div>
    </main>
  );
}
