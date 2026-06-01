//! AgentMix business logic, kept free of any Tauri/wry dependency so it can be
//! unit-tested headlessly (the Tauri-linked app binary cannot start outside a
//! GUI on Windows). The src-tauri app crate calls into here from its commands.

pub mod composer;
pub mod exporter;
pub mod health;
pub mod parser;
pub mod scanner;
pub mod security;
