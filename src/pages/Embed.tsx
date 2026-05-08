import { useParams } from "react-router-dom";
import PopPage from "../games/pop/PopPage";
import SpinnerPage from "../games/spinner/SpinnerPage";
import SquishyPage from "../games/squishy/SquishyPage";
import WakppuPage from "../games/wakppu/WakppuPage";

export default function EmbedPage() {
  const { game } = useParams();
  const content =
    game === "pop" ? <PopPage embed /> :
    game === "spinner" ? <SpinnerPage embed /> :
    game === "squishy" ? <SquishyPage embed /> :
    game === "wakppu" ? <WakppuPage embed /> :
    <div>Unknown game</div>;
  return <main className="app-main" style={{ padding: 0 }}>{content}</main>;
}
