// Prevents an additional console window on Windows in release; does nothing on debug.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    agentmix_lib::run();
}
