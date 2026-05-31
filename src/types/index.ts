// Barrel for app/UI view-model types. Components import these via '../types'.
// Canonical domain types are imported explicitly from './generated' where the
// backend contract is needed; they are intentionally NOT re-exported here to
// avoid name clashes with the interim UI types in ./app (e.g. Skill).
export * from './app';
