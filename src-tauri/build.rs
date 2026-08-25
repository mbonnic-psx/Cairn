// The build script runs for every feature set, including the one the
// constitution-critical domain tests use — which links no Tauri at all and
// needs no GUI toolchain present to run.

#[cfg(feature = "app")]
fn main() {
    tauri_build::build()
}

#[cfg(not(feature = "app"))]
fn main() {}
