# ShareDrop in Chess Game Tab

## Current State
- App.tsx is standalone ShareDrop (root entry). ConvertAll modules exist but have no root wrapper. MultimediaApp.tsx and chess/ChessApp.tsx exist as separate components.

## Requested Changes (Diff)

### Add
- ConvertAllApp.tsx: wraps existing ConvertAll modules (PDF Scanner, Image Converter, Image Editor, BG Remover, Passport Photo)
- ShareDrop tab inside Chess Game: ChessApp gets two tabs — Chess and ShareDrop

### Modify
- App.tsx: becomes root studio router (default = ConvertAll); studio switcher for ConvertAll/Multimedia/Chess
- chess/ChessApp.tsx: add ShareDrop as a second tab

### Remove
- Standalone ShareDrop-only App.tsx

## Implementation Plan
1. Create ConvertAllApp.tsx with 5 tabs using existing modules
2. Rewrite App.tsx as root router with currentApp state
3. Add ShareDrop tab panel into chess/ChessApp.tsx
