import PageView from "@/components/PageView";
import SinglePage from "@/components/single-page/SinglePage";

/**
 * The homepage: one continuous scroll, pinned once, from frame 1 to 389.
 *
 * Three captioned stops along the way — see `SECTIONS` in
 * `config/sections.ts` for their frame ranges and copy, and
 * `HOMEPAGE_BEATS`/`frameForHomepageProgress` for how the reel paces itself
 * between them. Pricing and Contact are separate pages, each opening on their
 * own short `FilmStrip` hero rather than continuing this reel.
 */
export default function Home() {
  return (
    <PageView>
      <SinglePage />
    </PageView>
  );
}
