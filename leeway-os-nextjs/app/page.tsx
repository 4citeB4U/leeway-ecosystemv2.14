import { SCREEN_MAP } from "@/src/lib/screens-data";
import ScreenView from "@/components/screen-view";

export default function HomePage() {
  const screen = SCREEN_MAP["welcome_to_leeway"];
  return <ScreenView screen={screen} />;
}
