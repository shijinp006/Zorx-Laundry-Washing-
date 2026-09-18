// AOSInit is intentionally not mounted. It exists to wire up AOS for the
// on-screen story copy, and no element carries [data-aos] now that the copy is
// gone — mounting it would only ship AOS's stylesheet for nothing. The
// component is kept in components/ for when the copy returns.
import AmbientBackground from "@/components/AmbientBackground";
import CinematicStage from "@/components/CinematicStage";

export default function Home() {
  return (
    <main>
      <AmbientBackground />
      <CinematicStage />
    </main>
  );
}
