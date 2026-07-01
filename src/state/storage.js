// Persistence via localStorage so an in-progress puzzle survives closing the app.
//
//   - saveState(game)  -> serialise puzzle + player state to localStorage
//   - loadState()      -> restore, or null if nothing saved / incompatible
//
// Keep a schema version in the payload so old saves can be discarded cleanly
// when the shape changes.

export {};
