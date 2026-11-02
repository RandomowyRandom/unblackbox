#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// The playground folder: the first argument, or the folder this exe sits in
// (every built playground ships its own copy of the exe).
#[tauri::command]
fn game_dir() -> String {
    std::env::args().nth(1).unwrap_or_else(|| {
        let exe = std::env::current_exe().expect("cannot locate the player exe");
        exe.parent().expect("exe has no folder").to_string_lossy().into_owned()
    })
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![game_dir])
        .run(tauri::generate_context!())
        .expect("error while running the unblackbox playground");
}
