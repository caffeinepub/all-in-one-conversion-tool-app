import { useState } from "react";
import ConvertAllApp from "./ConvertAllApp";
import MultimediaApp from "./MultimediaApp";
import ChessApp from "./chess/ChessApp";

type Studio = "convertall" | "multimedia" | "chess";

export default function App() {
  const [studio, setStudio] = useState<Studio>("convertall");

  return (
    <>
      {studio === "convertall" && (
        <ConvertAllApp
          onOpenMultimedia={() => setStudio("multimedia")}
          onOpenChess={() => setStudio("chess")}
        />
      )}
      {studio === "multimedia" && (
        <MultimediaApp
          onOpenConvertAll={() => setStudio("convertall")}
          onOpenChess={() => setStudio("chess")}
        />
      )}
      {studio === "chess" && (
        <ChessApp onBack={() => setStudio("convertall")} />
      )}
    </>
  );
}
