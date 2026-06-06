//! Built-in ToolAdapter baseline + destination-root resolution (DESIGN.md §1.4).
//!
//! The baseline `tool-adapters.json` is compiled into the binary via
//! `include_str!`, so the five built-in adapters need no filesystem at runtime.
//! v0.2.0 ships this embedded snapshot only; remote refresh and the freshness
//! UI are deferred to a networked milestone (tasks/v0.2.0 open question 1).
//!
//! This module is the tool "provider": being tool-specific here is allowed, the
//! same way the Skill provider is allowed to be Skill-specific. The export
//! pipeline must instead read behavior from `ToolAdapter` data and never branch
//! on a concrete tool id (enforced by `lint:asset-purity`).

use std::path::{Path, PathBuf};
use std::sync::OnceLock;

use agentmix_types::{ExportScope, ToolAdapter, ToolId};
use serde::Deserialize;

/// The embedded baseline source (the single source of truth for built-in tools).
const BASELINE_JSON: &str = include_str!("tool-adapters.json");

/// Envelope around the adapter list, carrying the date the data was captured so
/// a later remote refresh can compare freshness (DESIGN.md §1.4; deferred).
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Baseline {
    data_date: String,
    adapters: Vec<ToolAdapter>,
}

/// Parse the embedded baseline exactly once.
fn baseline() -> &'static Baseline {
    static BASELINE: OnceLock<Baseline> = OnceLock::new();
    BASELINE.get_or_init(|| {
        // The baseline is embedded at build time, so a parse failure is a bug in
        // the shipped data, not a runtime input error — fail loudly.
        serde_json::from_str(BASELINE_JSON).expect("embedded tool-adapters.json must be valid")
    })
}

/// The built-in tool adapters, parsed from the embedded baseline.
pub fn builtin_adapters() -> &'static [ToolAdapter] {
    &baseline().adapters
}

/// Look up a built-in adapter by tool id. `None` for `Custom`, which has no
/// baseline (its destination comes from the user-supplied path).
pub fn builtin_adapter(id: ToolId) -> Option<&'static ToolAdapter> {
    builtin_adapters().iter().find(|a| a.id == id)
}

/// The date the embedded baseline data was captured (DESIGN.md §1.4). Carried
/// for the freshness comparison a remote refresh adds later (deferred).
pub fn baseline_data_date() -> &'static str {
    &baseline().data_date
}

/// Resolve the absolute destination root(s) `adapter` writes to for `scope`.
///
/// `Project` → each `project_paths` entry under `target_project_path`;
/// `Global`  → each `user_paths` entry under `home_dir`.
///
/// Each relative entry is joined segment-by-segment so the result uses native
/// path separators (Windows normalization) regardless of the forward slashes in
/// the stored data. A scope with no configured paths (e.g. Cursor has no user
/// scope) yields an empty `Vec`, so the caller surfaces "this tool has no
/// <scope> location" rather than writing somewhere unintended.
pub fn resolve_destination_roots(
    adapter: &ToolAdapter,
    scope: ExportScope,
    target_project_path: &Path,
    home_dir: &Path,
) -> Vec<PathBuf> {
    let (base, rels) = match scope {
        ExportScope::Project => (target_project_path, &adapter.project_paths),
        ExportScope::Global => (home_dir, &adapter.user_paths),
    };
    rels.iter()
        .map(|rel| {
            // Join segment-by-segment so a stored `a/b` becomes two path
            // components with native separators, not one component with a slash.
            let mut root = base.to_path_buf();
            for segment in rel.split('/').filter(|s| !s.is_empty()) {
                root.push(segment);
            }
            root
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use agentmix_types::{DuplicateNameBehavior, Precedence};

    /// Forward-slash a path so assertions are separator-agnostic on Windows.
    fn fwd(p: &Path) -> String {
        p.to_string_lossy().replace('\\', "/")
    }

    #[test]
    fn baseline_parses_the_five_builtin_adapters() {
        let adapters = builtin_adapters();
        assert_eq!(adapters.len(), 5, "five built-in tools ship in the baseline");
        for id in [
            ToolId::ClaudeCode,
            ToolId::Cursor,
            ToolId::Codex,
            ToolId::OpenCode,
            ToolId::GeminiCli,
        ] {
            assert!(
                builtin_adapter(id).is_some(),
                "missing built-in adapter for {id:?}"
            );
        }
        // Custom has no baseline entry — its destination comes from the user.
        assert!(builtin_adapter(ToolId::Custom).is_none());
    }

    #[test]
    fn baseline_has_a_data_date() {
        // Pinning a snapshot date is what a later remote refresh compares against.
        assert!(!baseline_data_date().is_empty());
    }

    #[test]
    fn claude_code_fields_match_the_design_table() {
        let a = builtin_adapter(ToolId::ClaudeCode).unwrap();
        assert_eq!(a.display_name, "Claude Code");
        assert_eq!(a.project_paths, vec![".claude/skills".to_string()]);
        assert_eq!(a.user_paths, vec![".claude/skills".to_string()]);
        assert!(a.admin_paths.is_empty());
        assert_eq!(a.precedence, Precedence::ProjectFirst);
        assert_eq!(a.duplicate_name_behavior, DuplicateNameBehavior::LastWins);
    }

    #[test]
    fn cursor_has_project_scope_only() {
        let a = builtin_adapter(ToolId::Cursor).unwrap();
        assert_eq!(a.project_paths, vec![".cursor/skills".to_string()]);
        assert!(a.user_paths.is_empty(), "Cursor has no user scope");
        assert!(a.admin_paths.is_empty());
        assert_eq!(a.duplicate_name_behavior, DuplicateNameBehavior::LastWins);
    }

    #[test]
    fn codex_carries_admin_scope_and_merge_show_both() {
        let a = builtin_adapter(ToolId::Codex).unwrap();
        assert_eq!(a.project_paths, vec![".agents/skills".to_string()]);
        assert_eq!(a.user_paths, vec![".agents/skills".to_string()]);
        assert_eq!(a.admin_paths, vec!["/etc/codex/skills".to_string()]);
        assert_eq!(a.precedence, Precedence::MergeAll);
        assert_eq!(a.duplicate_name_behavior, DuplicateNameBehavior::ShowBoth);
    }

    #[test]
    fn multi_path_tools_list_all_project_paths_in_order() {
        let opencode = builtin_adapter(ToolId::OpenCode).unwrap();
        assert_eq!(
            opencode.project_paths,
            vec![
                ".opencode/skills".to_string(),
                ".claude/skills".to_string(),
                ".agents/skills".to_string(),
            ]
        );
        assert_eq!(
            opencode.user_paths,
            vec![".config/opencode/skills".to_string()]
        );

        let gemini = builtin_adapter(ToolId::GeminiCli).unwrap();
        assert_eq!(
            gemini.project_paths,
            vec![".gemini/skills".to_string(), ".agents/skills".to_string()]
        );
        assert_eq!(gemini.user_paths, vec![".agents/skills".to_string()]);
    }

    #[test]
    fn resolves_project_scope_under_the_target_project() {
        let a = builtin_adapter(ToolId::ClaudeCode).unwrap();
        let project = Path::new("C:/proj");
        let home = Path::new("C:/Users/dev");
        let roots = resolve_destination_roots(a, ExportScope::Project, project, home);
        assert_eq!(roots.len(), 1);
        assert_eq!(fwd(&roots[0]), "C:/proj/.claude/skills");
    }

    #[test]
    fn resolves_global_scope_under_the_home_dir() {
        let a = builtin_adapter(ToolId::ClaudeCode).unwrap();
        let project = Path::new("C:/proj");
        let home = Path::new("C:/Users/dev");
        let roots = resolve_destination_roots(a, ExportScope::Global, project, home);
        assert_eq!(roots.len(), 1);
        assert_eq!(fwd(&roots[0]), "C:/Users/dev/.claude/skills");
    }

    #[test]
    fn resolves_every_project_path_for_a_multi_path_tool() {
        let a = builtin_adapter(ToolId::OpenCode).unwrap();
        let project = Path::new("C:/proj");
        let home = Path::new("C:/Users/dev");
        let roots = resolve_destination_roots(a, ExportScope::Project, project, home);
        let got: Vec<String> = roots.iter().map(|p| fwd(p)).collect();
        assert_eq!(
            got,
            vec![
                "C:/proj/.opencode/skills".to_string(),
                "C:/proj/.claude/skills".to_string(),
                "C:/proj/.agents/skills".to_string(),
            ]
        );
    }

    #[test]
    fn scope_without_paths_resolves_to_nothing() {
        // Cursor has no user scope: a global export resolves to no root rather
        // than silently falling back to some other location.
        let a = builtin_adapter(ToolId::Cursor).unwrap();
        let roots = resolve_destination_roots(
            a,
            ExportScope::Global,
            Path::new("C:/proj"),
            Path::new("C:/Users/dev"),
        );
        assert!(roots.is_empty());
    }

    #[test]
    fn resolution_normalizes_forward_slashes_to_native_segments() {
        // The stored paths use forward slashes; the resolved path must be a real
        // multi-segment path, not one component containing a slash.
        let a = builtin_adapter(ToolId::ClaudeCode).unwrap();
        let roots =
            resolve_destination_roots(a, ExportScope::Project, Path::new("C:/proj"), Path::new("/h"));
        let segments: Vec<String> = roots[0]
            .components()
            .map(|c| c.as_os_str().to_string_lossy().to_string())
            .collect();
        assert!(
            segments.iter().any(|s| s == ".claude"),
            "`.claude` must be its own path segment, got {segments:?}"
        );
        assert!(segments.iter().any(|s| s == "skills"));
    }
}
