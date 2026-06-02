//! Update-check pure logic: version comparison, cache freshness and the
//! cache-file (de)serialization (plan T20, DESIGN.md §6.16). Tauri-free — the
//! actual network check / download / install live in the app crate's commands;
//! everything decidable without the network lives here so it tests headlessly.

use std::path::Path;

use serde::{Deserialize, Serialize};

/// How long a successful update-check result stays valid before the next call
/// re-queries GitHub Releases (decision 17: 24h cache, also keeps us far from
/// the anonymous API rate limit).
pub const UPDATE_CHECK_CACHE_TTL_HOURS: u64 = 24;

const SECS_PER_HOUR: u64 = 3600;

/// A newer release recorded by the last successful check.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CachedUpdate {
    pub version: String,
    /// Release notes (GitHub release body) shown in the update modal.
    pub notes: Option<String>,
}

/// Last successful check result, persisted to `~/.agentmix/update-check.json`.
/// Failed checks are NOT cached, so the next launch retries the network.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct UpdateCheckCache {
    pub checked_at_unix_secs: u64,
    /// `None` = the check ran and found no newer version.
    pub latest: Option<CachedUpdate>,
}

/// What the cached state tells us, decided without touching the network.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CacheDecision {
    /// Cache is fresh — answer from it (`Some` = update available).
    Fresh(Option<CachedUpdate>),
    /// Cache is stale — re-query the network.
    Stale,
}

/// Fresh iff `now` is within the TTL window after `checked_at`. A clock that
/// moved backwards (`now < checked_at`) counts as stale, so a future-dated
/// cache triggers a harmless re-check instead of being trusted.
pub fn is_cache_fresh(checked_at_unix_secs: u64, now_unix_secs: u64) -> bool {
    let Some(age_secs) = now_unix_secs.checked_sub(checked_at_unix_secs) else {
        return false;
    };
    age_secs < UPDATE_CHECK_CACHE_TTL_HOURS * SECS_PER_HOUR
}

/// Strict `MAJOR.MINOR.PATCH` comparison; tolerates a leading `v`/`V` on
/// either side (release tags are `vX.Y.Z`). Anything that does not parse as a
/// numeric semver triple is never "newer" — a malformed tag must not trigger
/// an update prompt.
pub fn is_newer_version(current: &str, candidate: &str) -> bool {
    match (parse_semver_triple(current), parse_semver_triple(candidate)) {
        (Some(cur), Some(cand)) => cand > cur,
        _ => false,
    }
}

/// `"v0.1.5"` / `"0.1.5"` -> `(0, 1, 5)`; anything else -> `None`.
fn parse_semver_triple(version: &str) -> Option<(u64, u64, u64)> {
    let bare = version.strip_prefix(['v', 'V']).unwrap_or(version);
    let mut parts = bare.split('.');
    let major = parts.next()?.parse().ok()?;
    let minor = parts.next()?.parse().ok()?;
    let patch = parts.next()?.parse().ok()?;
    if parts.next().is_some() {
        return None;
    }
    Some((major, minor, patch))
}

/// Decide from the cache alone whether an update is available. Re-compares the
/// cached version against `current_version` because the app may have been
/// upgraded since the cache was written (cached "0.1.5 available" must turn
/// into "no update" once the app itself is 0.1.5).
pub fn evaluate_cache(
    cache: &UpdateCheckCache,
    current_version: &str,
    now_unix_secs: u64,
) -> CacheDecision {
    if !is_cache_fresh(cache.checked_at_unix_secs, now_unix_secs) {
        return CacheDecision::Stale;
    }
    let update = cache
        .latest
        .as_ref()
        .filter(|cached| is_newer_version(current_version, &cached.version))
        .cloned();
    CacheDecision::Fresh(update)
}

/// Read the cache file; a missing or corrupt file is `None` (treated as
/// stale — silently retry the network, per the fail-quiet contract).
pub fn load_cache(path: &Path) -> Option<UpdateCheckCache> {
    let raw = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&raw).ok()
}

/// Persist a successful check result, creating parent directories as needed.
pub fn save_cache(path: &Path, cache: &UpdateCheckCache) -> std::io::Result<()> {
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir)?;
    }
    let raw = serde_json::to_string_pretty(cache).map_err(std::io::Error::other)?;
    std::fs::write(path, raw)
}

#[cfg(test)]
mod tests {
    use super::*;

    const TTL_SECS: u64 = UPDATE_CHECK_CACHE_TTL_HOURS * SECS_PER_HOUR;

    fn cache_with(version: &str, checked_at: u64) -> UpdateCheckCache {
        UpdateCheckCache {
            checked_at_unix_secs: checked_at,
            latest: Some(CachedUpdate {
                version: version.to_string(),
                notes: Some("notes".to_string()),
            }),
        }
    }

    // --- is_cache_fresh ---

    #[test]
    fn cache_is_fresh_within_ttl() {
        assert!(is_cache_fresh(1_000, 1_000));
        assert!(is_cache_fresh(1_000, 1_000 + TTL_SECS - 1));
    }

    #[test]
    fn cache_is_stale_at_and_past_ttl() {
        assert!(!is_cache_fresh(1_000, 1_000 + TTL_SECS));
        assert!(!is_cache_fresh(1_000, 1_000 + TTL_SECS + 1));
    }

    #[test]
    fn backwards_clock_counts_as_stale() {
        assert!(!is_cache_fresh(2_000, 1_999));
    }

    // --- is_newer_version ---

    #[test]
    fn newer_patch_minor_and_major_are_detected() {
        assert!(is_newer_version("0.1.0", "0.1.5"));
        assert!(is_newer_version("0.1.5", "0.2.0"));
        assert!(is_newer_version("0.2.3", "1.0.0"));
    }

    #[test]
    fn equal_and_older_versions_are_not_newer() {
        assert!(!is_newer_version("0.1.5", "0.1.5"));
        assert!(!is_newer_version("0.2.0", "0.1.9"));
        assert!(!is_newer_version("1.0.0", "0.9.9"));
    }

    #[test]
    fn comparison_is_numeric_not_lexicographic() {
        assert!(is_newer_version("0.9.0", "0.10.0"));
        assert!(!is_newer_version("0.10.0", "0.9.0"));
    }

    #[test]
    fn leading_v_prefix_is_tolerated() {
        assert!(is_newer_version("0.1.0", "v0.1.5"));
        assert!(is_newer_version("v0.1.0", "0.1.5"));
        assert!(!is_newer_version("0.1.5", "V0.1.5"));
    }

    #[test]
    fn malformed_versions_are_never_newer() {
        assert!(!is_newer_version("0.1.0", "not-a-version"));
        assert!(!is_newer_version("0.1.0", "0.1"));
        assert!(!is_newer_version("0.1.0", "0.1.5-beta"));
        assert!(!is_newer_version("garbage", "0.9.9"));
        assert!(!is_newer_version("0.1.0", ""));
    }

    // --- evaluate_cache ---

    #[test]
    fn fresh_cache_with_newer_version_reports_update() {
        let cache = cache_with("0.1.5", 1_000);
        let decision = evaluate_cache(&cache, "0.1.0", 1_000 + 10);
        assert_eq!(
            decision,
            CacheDecision::Fresh(Some(CachedUpdate {
                version: "0.1.5".to_string(),
                notes: Some("notes".to_string()),
            }))
        );
    }

    #[test]
    fn fresh_cache_is_no_update_after_app_upgraded_to_cached_version() {
        let cache = cache_with("0.1.5", 1_000);
        assert_eq!(
            evaluate_cache(&cache, "0.1.5", 1_000 + 10),
            CacheDecision::Fresh(None)
        );
    }

    #[test]
    fn fresh_cache_recording_no_update_reports_none() {
        let cache = UpdateCheckCache {
            checked_at_unix_secs: 1_000,
            latest: None,
        };
        assert_eq!(
            evaluate_cache(&cache, "0.1.0", 1_000 + 10),
            CacheDecision::Fresh(None)
        );
    }

    #[test]
    fn stale_cache_requires_network_recheck() {
        let cache = cache_with("0.1.5", 1_000);
        assert_eq!(
            evaluate_cache(&cache, "0.1.0", 1_000 + TTL_SECS),
            CacheDecision::Stale
        );
    }

    // --- load_cache / save_cache ---

    #[test]
    fn cache_round_trips_through_the_file() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("update-check.json");
        let cache = cache_with("0.1.5", 42);
        save_cache(&path, &cache).unwrap();
        assert_eq!(load_cache(&path), Some(cache));
    }

    #[test]
    fn missing_or_corrupt_cache_file_loads_as_none() {
        let dir = tempfile::tempdir().unwrap();
        let missing = dir.path().join("nope.json");
        assert_eq!(load_cache(&missing), None);

        let corrupt = dir.path().join("corrupt.json");
        std::fs::write(&corrupt, "{ not json").unwrap();
        assert_eq!(load_cache(&corrupt), None);
    }

    #[test]
    fn save_cache_creates_parent_directories() {
        let dir = tempfile::tempdir().unwrap();
        let nested = dir.path().join("a").join("b").join("update-check.json");
        let cache = UpdateCheckCache {
            checked_at_unix_secs: 7,
            latest: None,
        };
        save_cache(&nested, &cache).unwrap();
        assert_eq!(load_cache(&nested), Some(cache));
    }
}
