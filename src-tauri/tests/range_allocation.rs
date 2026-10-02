//! A range summary builds only what it returns (R5).
//!
//! The widest range a caller can send is thousands of years, and one entry per
//! day of it is memory spent on a list the by-site summary throws away. The
//! allocator here counts the most held at once, so the test does not depend on
//! how fast the machine is.
//!
//! One `#[test]`: the counter is the whole binary's.
#![cfg(feature = "history")]
#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::alloc::{GlobalAlloc, Layout, System};
use std::sync::atomic::{AtomicUsize, Ordering};

use cairn::domain::dates::LocalDate;
use cairn::reflection::over_time::assemble;
use cairn::services::Key;
use cairn::store::history::History;
use cairn::store::key::HistoryKey;

struct Counting;

static HELD: AtomicUsize = AtomicUsize::new(0);
static PEAK: AtomicUsize = AtomicUsize::new(0);

// A global allocator is an unsafe trait; this one only counts, then defers to
// the system's.
#[allow(unsafe_code)]
unsafe impl GlobalAlloc for Counting {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        let held = HELD.fetch_add(layout.size(), Ordering::SeqCst) + layout.size();
        PEAK.fetch_max(held, Ordering::SeqCst);
        System.alloc(layout)
    }
    unsafe fn dealloc(&self, pointer: *mut u8, layout: Layout) {
        HELD.fetch_sub(layout.size(), Ordering::SeqCst);
        System.dealloc(pointer, layout)
    }
    unsafe fn alloc_zeroed(&self, layout: Layout) -> *mut u8 {
        let held = HELD.fetch_add(layout.size(), Ordering::SeqCst) + layout.size();
        PEAK.fetch_max(held, Ordering::SeqCst);
        System.alloc_zeroed(layout)
    }
    unsafe fn realloc(
        &self,
        pointer: *mut u8,
        layout: Layout,
        new_size: usize,
    ) -> *mut u8 {
        if new_size >= layout.size() {
            let held = HELD.fetch_add(new_size - layout.size(), Ordering::SeqCst)
                + new_size
                - layout.size();
            PEAK.fetch_max(held, Ordering::SeqCst);
        } else {
            HELD.fetch_sub(layout.size() - new_size, Ordering::SeqCst);
        }
        System.realloc(pointer, layout, new_size)
    }
}

#[global_allocator]
static ALLOCATOR: Counting = Counting;

#[test]
fn a_range_of_thousands_of_years_holds_nothing_per_day() {
    let directory = tempfile::tempdir().unwrap();
    let key = HistoryKey::Available(Key::from_bytes([7u8; 32]));
    let History::Open(history) = History::open(directory.path(), &key) else {
        panic!("the history opens");
    };
    history.record("example.com", 1_700_000_000).unwrap();

    let first = LocalDate::from_days_since_epoch(-3_650_000);
    let last = LocalDate::from_days_since_epoch(20_000);
    let start = first.days_since_epoch() * 86_400;
    let end = (last.days_since_epoch() + 1) * 86_400;

    let before = HELD.load(Ordering::SeqCst);
    PEAK.store(before, Ordering::SeqCst);
    let range = assemble(&history, first, last, start, end, 0, &[]).unwrap();
    let extra = PEAK.load(Ordering::SeqCst) - before;

    assert_eq!(range.by_site, vec![("example.com".to_string(), 1)]);
    assert!(
        extra < 8 * 1024 * 1024,
        "{extra} bytes held at once for one site"
    );
}
