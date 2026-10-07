//! Throwaway, for the hand demo of slice `first-counted` only.
//!
//! `seed <data-dir>` writes a made-up history into a disposable data directory, relative to the
//! computer's clock and its zone (America/Chicago, CDT, -05:00, across every seeded date).
//! `serve <data-dir> <port> <log-dir>` then answers the screen's reads with the REAL core:
//! every request enters through `AppState::summarize_reaches` (or `list_todays_reaches`,
//! `get_day`), exactly as the IPC command serves it, with `now` read from the real clock.
//! The browser's in-page fake core forwards the screen's `invoke` to this process on 127.0.0.1;
//! nothing here computes a row. Every answer is also written to <log-dir> as evidence.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::io::{Read, Write};
use std::net::TcpListener;
use std::path::{Path, PathBuf};
use std::time::Instant;

use cairn::domain::dates::LocalDate;
use cairn::domain::normalize::ReservedNames;
use cairn::enforcement::seed::CategoryStore;
use cairn::helper::NoHelper;
use cairn::ipc::state::OffsetChange;
use cairn::ipc::AppState;
use cairn::platform::hosts::SystemHosts;
use cairn::services::{
    CredentialStore, ElevationService, HelperStatus, Key, KeyUnavailable, Outcome, Removal,
};
use cairn::store::config::ConfigStore;
use cairn::store::history::{CoverageGap, History};
use cairn::store::key::HistoryKey;
use serde_json::{json, Value};

const A_KEY: [u8; 32] = [7u8; 32];
const HOUR: i64 = 3600;
const DAY: i64 = 86_400;
/// CDT, seconds east of UTC. Every seeded date (2025-09, 2026-05, 2026-07 to 2026-10) is in CDT.
const OFF: i64 = -5 * HOUR;

fn real_now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}

fn date(text: &str) -> LocalDate {
    serde_json::from_str(&format!("\"{text}\"")).unwrap()
}

/// Local midnight of a date, in CDT.
fn local_midnight(text: &str) -> i64 {
    date(text).days_since_epoch() * DAY - OFF
}

#[derive(Clone)]
struct Keychain;
impl CredentialStore for Keychain {
    fn get_or_create_history_key(&self) -> Result<Key, KeyUnavailable> {
        Ok(Key::from_bytes(A_KEY))
    }
    fn delete_history_key(&self) -> Outcome<()> {
        Ok(())
    }
}

struct NoElevation;
impl ElevationService for NoElevation {
    fn helper_status(&self) -> HelperStatus {
        HelperStatus::NotInstalled
    }
    fn install_helper(&self) -> Outcome<HelperStatus> {
        Ok(HelperStatus::NotInstalled)
    }
    fn uninstall_helper(&self) -> Outcome<Removal> {
        Ok(Removal::clean())
    }
}

fn app(data: &Path) -> AppState {
    let shipped = Path::new("/home/mbonnic/Cairn-worktrees/first-counted/src-tauri/resources/categories");
    AppState {
        config: ConfigStore::at(data),
        data_directory: data.to_path_buf(),
        credentials: Box::new(Keychain),
        categories: CategoryStore::at(data),
        shipped_categories: shipped.to_path_buf(),
        shipped_quotes: PathBuf::from("no-quotes-here.json"),
        hosts: Box::new(SystemHosts::at(data.join("hosts-not-used"))),
        helper: Box::new(NoHelper),
        elevation: Box::new(NoElevation),
        reserved: ReservedNames::default(),
        now: real_now,
        roll: || 0,
    }
}

/// `seed <data-dir> installed-today|three-weeks|since-2025|installed-yesterday|centuries-back`: both go through the real store
/// (`note_counting`, `record`, `record_gap`), so `first_count` is what the real code derives.
fn seed(data: &Path, which: &str) {
    std::fs::create_dir_all(data).unwrap();
    let History::Open(history) = History::open(data, &HistoryKey::Available(Key::from_bytes(A_KEY)))
    else {
        panic!("a fresh directory with a good key should open");
    };
    let now = real_now();
    let today = (now + OFF).div_euclid(DAY);
    let m = |back: i64| (today - back) * DAY - OFF; // local midnight `back` days ago
    let mut log = Vec::new();
    let mut gaps_log = Vec::new();
    let first;
    match which {
        "installed-today" => {
            // 2:14 PM is already past when this was written (15:00); use 12:40 PM today, leaving the
            // morning unseen. Falls back to a minute after midnight if the clock is earlier.
            first = (m(0) + 12 * HOUR + 40 * 60).min(now - 600).max(m(0) + 60);
            history.note_counting(first).unwrap();
            for (site, at) in [
                ("reddit.com", first),
                ("youtube.com", first + 45 * 60),
                ("x.com", first + 90 * 60),
                ("reddit.com", first + 130 * 60),
            ] {
                if at < now {
                    history.record(site, at).unwrap();
                    log.push(json!({"site": site, "at": at}));
                }
            }
        }
        "three-weeks" => {
            first = m(21) + 14 * HOUR + 14 * 60;
            history.note_counting(first).unwrap();
            let sites = ["reddit.com", "youtube.com", "x.com", "instagram.com"];
            let gap = CoverageGap { from: m(10) + 2 * HOUR, to: m(10) + 5 * HOUR + 30 * 60 };
            history.record_gap(&gap).unwrap();
            gaps_log.push(json!({"from": gap.from, "to": gap.to}));
            let hours = [9, 12, 14, 16, 19, 21, 22, 11];
            for back in (0..=21i64).rev() {
                // most days: skip every fifth (days 4, 9, 14, 19 back hold nothing)
                if back != 21 && back != 0 && back % 5 == 4 {
                    continue;
                }
                let n = if back == 21 { 3 } else { 2 + (back % 4) as usize };
                for t in 0..n {
                    let at = if back == 21 {
                        first + (t as i64) * 50 * 60
                    } else {
                        m(back) + hours[(t + back as usize) % hours.len()] * HOUR + 17 * 60
                    };
                    if at >= now || (at >= gap.from && at < gap.to) {
                        continue;
                    }
                    let site = sites[(t + back as usize) % sites.len()];
                    history.record(site, at).unwrap();
                    log.push(json!({"site": site, "at": at}));
                }
            }
        }
        // N26 (added by the hand on 2026-10-06): a first count on 2025-01-01 at 10:30 AM CST
        // (16:30 UTC), one instagram.com reach every ninth day since at 8:17 PM, and the last
        // seven days carrying N16's counts: reddit.com 1 234, youtube.com 56, x.com 7.
        "since-2025" => {
            first = 1_735_749_000;
            history.note_counting(first).unwrap();
            let mut at = first + 10 * HOUR - 13 * 60; // 8:17 PM CST the same day
            while at < m(7) {
                history.record("instagram.com", at).unwrap();
                log.push(json!({"site": "instagram.com", "at": at}));
                at += 9 * DAY;
            }
            let window_start = m(6);
            let window_end = now - 120;
            for (site, n) in [("reddit.com", 1234i64), ("youtube.com", 56), ("x.com", 7)] {
                for k in 0..n {
                    let at = window_start + (window_end - window_start) * k / n + 7;
                    history.record(site, at).unwrap();
                }
                log.push(json!({"site": site, "count": n, "from": window_start, "to": window_end}));
            }
        }
        // N26: a fresh install seen the next day. Seed A's first count (9:08 AM), one day back.
        "installed-yesterday" => {
            first = m(1) + 9 * HOUR + 8 * 60;
            history.note_counting(first).unwrap();
            for (site, at) in [
                ("reddit.com", first),
                ("youtube.com", first + 45 * 60),
                ("x.com", first + 5 * HOUR),
                ("reddit.com", m(0) + 8 * HOUR + 30 * 60),
                ("youtube.com", m(0) + 11 * HOUR + 5 * 60),
            ] {
                if at < now {
                    history.record(site, at).unwrap();
                    log.push(json!({"site": site, "at": at}));
                }
            }
        }
        // N26, F6's remaining freeze path: counting began 2025-01-01, but one reach was recorded
        // under a clock set centuries back (1000-06-01 18:00 UTC). F6 moves the first count to it.
        "centuries-back" => {
            history.note_counting(1_735_749_000).unwrap();
            history.record("reddit.com", 1_735_749_000 + HOUR).unwrap();
            log.push(json!({"site": "reddit.com", "at": 1_735_749_000 + HOUR}));
            let wrong_clock = -30_597_112_800i64;
            history.record("instagram.com", wrong_clock).unwrap();
            log.push(json!({"site": "instagram.com", "at": wrong_clock, "why": "a clock set centuries back"}));
            first = wrong_clock;
        }
        // N28 (added by the hand on 2026-10-07): site names long enough to wrap beside their bar, with
        // short ones and a count over 999, so By site shows wrapping names and grouped counts together.
        // First count 20 days back at 9:00 AM; every reach in the last fourteen days.
        "long-names" => {
            first = m(20) + 9 * HOUR;
            history.note_counting(first).unwrap();
            let sites: [(&str, i64); 5] = [
                ("community.forums.an-unusually-long-hobby-site-name.example.org", 1234),
                ("video.streaming-service-with-a-long-name.example.com", 41),
                ("reddit.com", 17),
                ("x.com", 3),
                ("news.a-regional-newspaper-with-a-long-name.co.uk", 1),
            ];
            let window_start = m(13);
            let window_end = now - 120;
            for (site, n) in sites {
                for k in 0..n {
                    let at = window_start + (window_end - window_start) * k / n + 11;
                    history.record(site, at).unwrap();
                }
                log.push(json!({"site": site, "count": n, "from": window_start, "to": window_end}));
            }
        }
        other => panic!("unknown seed {other}"),
    }
    let first_count_read = history.first_count().ok().flatten();
    let summary = json!({
        "seed": which,
        "seeded_at": now,
        "first_count_intended": first,
        "first_count_read_back": first_count_read,
        "today_local_midnight": m(0),
        "zone": "America/Chicago (CDT, -18000)",
        "gaps": gaps_log,
        "reach_count": log.len(),
        "reaches": log,
    });
    println!("{}", serde_json::to_string_pretty(&summary).unwrap());
}

/// The movement rows of a large answer are cut to the first and last five in the log; the
/// count is kept. The answer sent to the screen is never cut.
fn for_log(mut answer: Value) -> Value {
    if let Some(rows) = answer.get("movement").and_then(Value::as_array).cloned() {
        if rows.len() > 120 {
            let n = rows.len();
            let mut kept: Vec<Value> = rows[..5].to_vec();
            kept.push(json!(format!("... {} rows not copied into this log ...", n - 10)));
            kept.extend_from_slice(&rows[n - 5..]);
            answer["movement"] = Value::Array(kept);
            answer["movement_len_in_answer"] = json!(n);
        }
    }
    answer
}

fn handle(state: &AppState, body: &str) -> (Value, f64, Value) {
    let request: Value = serde_json::from_str(body).unwrap_or(Value::Null);
    let cmd = request["cmd"].as_str().unwrap_or("");
    let a = &request["args"];
    let started = Instant::now();
    let answer = match cmd {
        "summarize_reaches" => {
            let offsets: Vec<OffsetChange> = serde_json::from_value(a["offsets"].clone()).unwrap();
            let p = state.summarize_reaches(
                date(a["firstDay"].as_str().unwrap()),
                date(a["lastDay"].as_str().unwrap()),
                a["rangeStart"].as_i64().unwrap(),
                a["rangeEnd"].as_i64().unwrap(),
                &offsets,
            );
            serde_json::to_value(p).unwrap()
        }
        "list_todays_reaches" => serde_json::to_value(state.list_todays_reaches(
            a["dayStart"].as_i64().unwrap(),
            a["dayEnd"].as_i64().unwrap(),
        ))
        .unwrap(),
        "get_day" => serde_json::to_value(state.get_day(
            date(a["day"].as_str().unwrap()),
            a["dayStart"].as_i64().unwrap(),
            a["dayEnd"].as_i64().unwrap(),
        ))
        .unwrap(),
        other => json!({ "error": format!("not served: {other}") }),
    };
    (answer, started.elapsed().as_secs_f64() * 1000.0, request)
}

fn serve(data: &Path, port: u16, logs: &Path) {
    std::fs::create_dir_all(logs).unwrap();
    let state = app(data);
    let listener = TcpListener::bind(("127.0.0.1", port)).unwrap();
    eprintln!("serving the real core on 127.0.0.1:{port}");
    let mut n = 0u32;
    for stream in listener.incoming() {
        let mut stream = match stream {
            Ok(s) => s,
            Err(_) => continue,
        };
        let mut buf = Vec::new();
        let mut chunk = [0u8; 8192];
        let (head_end, length) = loop {
            let read = stream.read(&mut chunk).unwrap_or(0);
            if read == 0 {
                break (None, 0);
            }
            buf.extend_from_slice(&chunk[..read]);
            if let Some(i) = buf.windows(4).position(|w| w == b"\r\n\r\n") {
                let head = String::from_utf8_lossy(&buf[..i]).to_lowercase();
                let length = head
                    .lines()
                    .find_map(|l| l.strip_prefix("content-length:").map(|v| v.trim().parse().unwrap_or(0)))
                    .unwrap_or(0usize);
                break (Some(i + 4), length);
            }
        };
        let Some(head_end) = head_end else { continue };
        while buf.len() < head_end + length {
            let read = stream.read(&mut chunk).unwrap_or(0);
            if read == 0 {
                break;
            }
            buf.extend_from_slice(&chunk[..read]);
        }
        let is_options = buf.starts_with(b"OPTIONS");
        let (status, payload) = if is_options {
            ("204 No Content", String::new())
        } else {
            let body = String::from_utf8_lossy(&buf[head_end..]).to_string();
            let (answer, ms, request) = handle(&state, &body);
            let text = serde_json::to_string(&answer).unwrap();
            n += 1;
            let cmd = request["cmd"].as_str().unwrap_or("x").to_string();
            let a = &request["args"];
            let name = match cmd.as_str() {
                "summarize_reaches" => format!(
                    "{n:03}-summarize-{}-to-{}.json",
                    a["firstDay"].as_str().unwrap_or("?"),
                    a["lastDay"].as_str().unwrap_or("?")
                ),
                _ => format!("{n:03}-{cmd}.json"),
            };
            let record = json!({
                "asked_at": real_now(),
                "core_ms": ms,
                "answer_bytes": text.len(),
                "request": request,
                "answer": for_log(answer),
            });
            std::fs::write(logs.join(&name), serde_json::to_string_pretty(&record).unwrap()).unwrap();
            eprintln!("{name}: {ms:.1} ms, {} bytes", text.len());
            ("200 OK", text)
        };
        let response = format!(
            "HTTP/1.1 {status}\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Headers: content-type\r\nAccess-Control-Allow-Methods: POST, OPTIONS\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{payload}",
            payload.len()
        );
        let _ = stream.write_all(response.as_bytes());
    }
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    match args.get(1).map(String::as_str) {
        Some("seed") => seed(Path::new(&args[2]), &args[3]),
        Some("serve") => serve(Path::new(&args[2]), args[3].parse().unwrap(), Path::new(&args[4])),
        _ => eprintln!("usage: seed <dir> installed-today|three-weeks|since-2025|installed-yesterday|centuries-back|long-names | serve <dir> <port> <log-dir>"),
    }
}
