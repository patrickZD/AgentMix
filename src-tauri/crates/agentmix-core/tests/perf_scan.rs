//! DoD-5 performance check: scanning 1000 SKILL.md files completes under 5s on
//! a Release build. Marked `#[ignore]` so it never runs in the normal `cargo
//! test` gate (a debug build is far slower and the file setup is heavy); run it
//! explicitly with `pnpm perf` (which builds `--release`).

use std::time::Instant;

use agentmix_core::scanner;

/// DoD-5 threshold: 1000-file scan must finish within this on Release.
const MAX_SCAN_SECS: f64 = 5.0;
const SKILL_COUNT: usize = 1000;

#[test]
#[ignore = "perf benchmark; run via `pnpm perf` on a release build"]
fn scan_1000_skills_under_5s() {
    let tmp = tempfile::tempdir().unwrap();
    let root = tmp.path();

    // Spread skills across nested directories to exercise the real walk, not a
    // single flat folder. Setup time is excluded from the measurement below.
    for i in 0..SKILL_COUNT {
        let dir = root
            .join(format!("group-{}", i / 50))
            .join(format!("skill-{i}"));
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(
            dir.join("SKILL.md"),
            format!("---\nname: skill-{i}\ndescription: Use when handling case {i}.\n---\n# skill {i}\n"),
        )
        .unwrap();
    }

    let start = Instant::now();
    let project = scanner::scan_project(root);
    let elapsed = start.elapsed();

    let secs = elapsed.as_secs_f64();
    println!(
        "DoD-5: scanned {} skills in {:.3}s (target < {MAX_SCAN_SECS}s)",
        project.skills.len(),
        secs
    );

    assert_eq!(
        project.skills.len(),
        SKILL_COUNT,
        "all skills must be found"
    );
    assert!(
        secs < MAX_SCAN_SECS,
        "scan took {secs:.3}s, exceeds the {MAX_SCAN_SECS}s DoD-5 budget"
    );
}
