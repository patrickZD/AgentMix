//! SKILL.md frontmatter parsing and three-way classification (DESIGN.md §1.1).

use std::collections::HashMap;

use agentmix_types::AssetCategory;

/// Max lengths from the SKILL.md spec (PRD.md "核心概念"). Over-limit is a
/// health warning (computed in the health module, T9), not an `invalid`
/// classification — `invalid` is reserved for the criteria in `classify`.
pub const NAME_MAX_LEN: usize = 64;
pub const DESCRIPTION_MAX_LEN: usize = 1024;

/// Experimental / tool-specific frontmatter keys. Their presence on an
/// otherwise spec-compliant Skill marks it tool-specific rather than portable.
pub const TOOL_SPECIFIC_KEYS: &[&str] = &["allowed-tools"];

/// Frontmatter fields extracted from a SKILL.md, plus whether parsing succeeded.
#[derive(Debug, Clone, Default)]
pub struct ParsedFrontmatter {
    pub name: Option<String>,
    pub description: Option<String>,
    pub compatibility: Option<String>,
    pub metadata: Option<HashMap<String, String>>,
    pub uses_tool_specific_fields: bool,
    /// False when there is no frontmatter block or the YAML failed to parse.
    pub parse_ok: bool,
}

/// Extract and parse the leading `---`-delimited YAML frontmatter of a SKILL.md.
pub fn parse_frontmatter(content: &str) -> ParsedFrontmatter {
    let Some(yaml) = extract_frontmatter_block(content) else {
        return ParsedFrontmatter::default(); // parse_ok = false
    };

    let value: serde_yaml::Value = match serde_yaml::from_str(&yaml) {
        Ok(v) => v,
        Err(_) => return ParsedFrontmatter::default(),
    };

    let Some(map) = value.as_mapping() else {
        // Empty or non-mapping frontmatter: parsed, but no fields.
        return ParsedFrontmatter {
            parse_ok: true,
            ..Default::default()
        };
    };

    let get_str = |key: &str| -> Option<String> {
        map.get(serde_yaml::Value::from(key))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
    };

    let uses_tool_specific_fields = TOOL_SPECIFIC_KEYS
        .iter()
        .any(|k| map.contains_key(serde_yaml::Value::from(*k)));

    let metadata = map
        .get(serde_yaml::Value::from("metadata"))
        .and_then(|v| v.as_mapping())
        .map(|m| {
            m.iter()
                .filter_map(|(k, v)| Some((k.as_str()?.to_string(), v.as_str()?.to_string())))
                .collect::<HashMap<String, String>>()
        });

    ParsedFrontmatter {
        name: get_str("name"),
        description: get_str("description"),
        compatibility: get_str("compatibility"),
        metadata,
        uses_tool_specific_fields,
        parse_ok: true,
    }
}

/// The top-level frontmatter field names in a SKILL.md, in document order. The
/// capability linter (§1.10) compares these against the per-tool matrix. Returns
/// empty when there is no parseable frontmatter mapping.
pub fn frontmatter_field_names(content: &str) -> Vec<String> {
    let Some(yaml) = extract_frontmatter_block(content) else {
        return Vec::new();
    };
    let Ok(value) = serde_yaml::from_str::<serde_yaml::Value>(&yaml) else {
        return Vec::new();
    };
    let Some(map) = value.as_mapping() else {
        return Vec::new();
    };
    map.keys()
        .filter_map(|k| k.as_str().map(|s| s.to_string()))
        .collect()
}

/// Classify a parsed SKILL.md against its parent directory name.
///
/// - `Invalid`: parse failure, missing/empty name or description, or name does
///   not match the parent directory (case-insensitive).
/// - `ToolSpecific`: spec-compliant but uses an experimental field.
/// - `Portable`: spec-compliant with no tool-specific fields.
pub fn classify(fm: &ParsedFrontmatter, dir_name: &str) -> AssetCategory {
    if !fm.parse_ok {
        return AssetCategory::Invalid;
    }
    let (Some(name), Some(description)) = (&fm.name, &fm.description) else {
        return AssetCategory::Invalid;
    };
    if name.is_empty() || description.is_empty() {
        return AssetCategory::Invalid;
    }
    // Windows-friendly: Skill names are ASCII (lowercase/digits/hyphens).
    if !name.eq_ignore_ascii_case(dir_name) {
        return AssetCategory::Invalid;
    }
    if fm.uses_tool_specific_fields {
        return AssetCategory::ToolSpecific;
    }
    AssetCategory::Portable
}

/// Returns the YAML between the leading `---` fences, or None when there is no
/// opening fence on the first line or no closing fence.
fn extract_frontmatter_block(content: &str) -> Option<String> {
    let content = content.strip_prefix('\u{feff}').unwrap_or(content); // tolerate BOM
    let mut lines = content.lines();
    if lines.next().map(str::trim_end) != Some("---") {
        return None;
    }
    let mut yaml = String::new();
    for line in lines {
        if line.trim_end() == "---" {
            return Some(yaml);
        }
        yaml.push_str(line);
        yaml.push('\n');
    }
    None // no closing fence
}

#[cfg(test)]
mod tests {
    use super::*;

    const VALID: &str =
        "---\nname: code-review\ndescription: Reviews code when you ask.\n---\n## Role\nReviewer.";

    #[test]
    fn classifies_spec_compliant_skill_as_portable() {
        let fm = parse_frontmatter(VALID);
        assert_eq!(classify(&fm, "code-review"), AssetCategory::Portable);
        assert_eq!(fm.name.as_deref(), Some("code-review"));
        assert_eq!(
            fm.description.as_deref(),
            Some("Reviews code when you ask.")
        );
    }

    #[test]
    fn classifies_skill_with_experimental_field_as_tool_specific() {
        let content = "---\nname: code-review\ndescription: Reviews code.\nallowed-tools:\n  - Bash\n---\nbody";
        let fm = parse_frontmatter(content);
        assert!(fm.uses_tool_specific_fields);
        assert_eq!(classify(&fm, "code-review"), AssetCategory::ToolSpecific);
    }

    #[test]
    fn missing_name_is_invalid() {
        let fm = parse_frontmatter("---\ndescription: No name here.\n---\nbody");
        assert_eq!(classify(&fm, "code-review"), AssetCategory::Invalid);
    }

    #[test]
    fn missing_description_is_invalid() {
        let fm = parse_frontmatter("---\nname: code-review\n---\nbody");
        assert_eq!(classify(&fm, "code-review"), AssetCategory::Invalid);
    }

    #[test]
    fn name_not_matching_directory_is_invalid() {
        let fm = parse_frontmatter(VALID);
        assert_eq!(classify(&fm, "something-else"), AssetCategory::Invalid);
    }

    #[test]
    fn name_matches_directory_case_insensitively() {
        let content = "---\nname: Code-Review\ndescription: Reviews code.\n---\nbody";
        let fm = parse_frontmatter(content);
        // "Code-Review" vs dir "code-review" must NOT be invalid.
        assert_eq!(classify(&fm, "code-review"), AssetCategory::Portable);
    }

    #[test]
    fn malformed_yaml_is_invalid() {
        let fm = parse_frontmatter("---\nname: : : bad\n  - oops\n---\nbody");
        assert!(!fm.parse_ok);
        assert_eq!(classify(&fm, "anything"), AssetCategory::Invalid);
    }

    #[test]
    fn missing_frontmatter_block_is_invalid() {
        let fm = parse_frontmatter("## Role\nNo frontmatter at all.");
        assert!(!fm.parse_ok);
        assert_eq!(classify(&fm, "anything"), AssetCategory::Invalid);
    }

    #[test]
    fn field_names_list_top_level_frontmatter_keys() {
        let content = "---\nname: code-review\ndescription: Reviews code.\nallowed-tools:\n  - Bash\n---\nbody";
        let names = frontmatter_field_names(content);
        assert_eq!(names, vec!["name", "description", "allowed-tools"]);
        // No frontmatter -> no fields (not a panic).
        assert!(frontmatter_field_names("no frontmatter").is_empty());
    }

    #[test]
    fn extracts_compatibility_and_metadata() {
        let content = "---\nname: deploy\ndescription: Deploys.\ncompatibility: bash >= 5\nmetadata:\n  author: jane\n---\nbody";
        let fm = parse_frontmatter(content);
        assert_eq!(fm.compatibility.as_deref(), Some("bash >= 5"));
        assert_eq!(
            fm.metadata
                .as_ref()
                .and_then(|m| m.get("author"))
                .map(String::as_str),
            Some("jane")
        );
    }
}
