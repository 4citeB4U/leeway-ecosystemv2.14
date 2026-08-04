import { SCREEN_MAP, SCREENS } from "@/src/lib/screens-data";
import ScreenView from "@/components/screen-view";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return SCREENS.map((s) => ({ slug: s.slug }));
}

export default function ScreenPage({ params }: { params: { slug: string } }) {
  const screen = SCREEN_MAP[params.slug];
  if (!screen) notFound();
  return <ScreenView screen={screen} />;
}
