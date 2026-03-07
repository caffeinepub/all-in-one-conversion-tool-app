import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef } from "react";
import { getMoveNotation } from "./chessLogic";
import type { ChessMove } from "./chessTypes";

interface MoveHistoryProps {
  moves: ChessMove[];
}

export function MoveHistory({ moves }: MoveHistoryProps) {
  const endRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally scroll only when count changes
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [moves.length]);

  // Pair moves into white/black pairs
  const pairs: Array<{ white?: string; black?: string; num: number }> = [];
  for (let i = 0; i < moves.length; i += 2) {
    const wMove = moves[i];
    const bMove = moves[i + 1];
    pairs.push({
      num: Math.floor(i / 2) + 1,
      white: wMove ? getMoveNotation([], wMove) : undefined,
      black: bMove ? getMoveNotation([], bMove) : undefined,
    });
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(20,12,6,0.7)",
        border: "1px solid rgba(101,72,46,0.3)",
      }}
    >
      <div className="px-3 py-2 border-b border-chess-border/20">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-chess-label/70">
          Move History
        </h3>
      </div>
      <ScrollArea className="h-36">
        <div className="px-2 py-1">
          {pairs.length === 0 && (
            <p className="text-xs text-chess-label/40 italic text-center py-3">
              No moves yet
            </p>
          )}
          {pairs.map((pair) => (
            <div
              key={pair.num}
              className="flex items-center gap-1 py-0.5 text-xs"
              data-ocid="chess.row"
            >
              <span className="w-6 text-chess-label/40 tabular-nums shrink-0">
                {pair.num}.
              </span>
              <span
                className="w-14 font-mono text-chess-light-piece font-medium"
                title="White's move"
              >
                {pair.white ?? ""}
              </span>
              <span
                className="w-14 font-mono text-chess-dark-piece/80"
                title="Black's move"
              >
                {pair.black ?? ""}
              </span>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
