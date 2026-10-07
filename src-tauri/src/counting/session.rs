//! Counting, running or not running.
//!
//! Binding the ports and counting reaches are two different facts, and slice 002
//! conflated them: the helper bound the ports, nothing ever accepted on them,
//! and Cairn reported counted mode over a record that stayed empty. Principle
//! III does not allow reporting an intention as a state, so this module exists
//! to make "counting" mean one thing — that there are threads accepting on
//! Cairn's ports right now.
//!
//! Everything here is process-wide, because the sockets are. They are handed
//! over once and accepted on once, and a second session would be a second thing
//! holding the same port.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::thread::JoinHandle;

use crate::counting::availability::Counting;
use crate::counting::listener::{serve_until, NoteReach};
use crate::helper::{Handover, HelperChannel};

/// The accept threads and the flag that stops them.
struct Session {
    stop: Arc<AtomicBool>,
    threads: Vec<JoinHandle<()>>,
    /// Where the accept threads send what they read. The threads outlive any
    /// one history, so the destination is the part that can be replaced.
    sink: Arc<Forward>,
}

/// What the accept threads hold: a destination that can be swapped while they
/// run, so that a session never keeps noting into a history that has since
/// been erased or that was never open (FR-022, Principle III).
struct Forward(Mutex<Arc<dyn NoteReach>>);

impl Forward {
    fn replace(&self, sink: Arc<dyn NoteReach>) {
        // The previous sink is dropped here, after any note in flight on it has
        // finished (`note` holds this lock), so nothing still holds its
        // connection once this returns.
        let previous = {
            let mut held = match self.0.lock() {
                Ok(held) => held,
                Err(poisoned) => poisoned.into_inner(),
            };
            std::mem::replace(&mut *held, sink)
        };
        drop(previous);
    }
}

impl NoteReach for Forward {
    fn note(&self, domain: &str, at: i64) {
        let held = match self.0.lock() {
            Ok(held) => held,
            Err(poisoned) => poisoned.into_inner(),
        };
        held.note(domain, at);
    }
}

/// A destination that keeps nothing: the reaches it is handed are dropped.
struct Keeps;

impl NoteReach for Keeps {
    fn note(&self, _domain: &str, _at: i64) {}
}

/// Hand the held session a destination that keeps nothing, and let go of the
/// one it had. Does nothing when no session is held.
///
/// Called before the history file is removed, so that no connection holds it.
pub fn keep_nothing() {
    if let Some(session) = held().as_ref() {
        session.sink.replace(Arc::new(Keeps));
    }
}

fn current() -> &'static Mutex<Option<Session>> {
    static CURRENT: OnceLock<Mutex<Option<Session>>> = OnceLock::new();
    CURRENT.get_or_init(|| Mutex::new(None))
}

fn held() -> std::sync::MutexGuard<'static, Option<Session>> {
    match current().lock() {
        Ok(held) => held,
        Err(poisoned) => poisoned.into_inner(),
    }
}

/// Whether Cairn is accepting on its counting ports at this moment.
///
/// This is the only honest answer to "are you counting?", and it is the one the
/// interface is given.
pub fn is_running() -> bool {
    held().is_some()
}

/// Start counting: take the ports from the helper and accept on them.
///
/// Returns what is actually true afterwards, which is what decides the reach
/// mode. Anything that stops this short of accepting comes back as
/// [`Counting::Unavailable`] carrying the sentence to show — never as available.
///
/// Starting while a session is held takes no ports a second time: the ports are
/// already Cairn's and already being accepted on. What changes is where the
/// running session sends what it reads — to `sink`, the history this start
/// opened — and the sink it had is let go.
pub fn start(
    helper: &dyn HelperChannel,
    sink: Arc<dyn NoteReach>,
    now: fn() -> i64,
) -> Counting {
    let mut held = held();
    if let Some(session) = held.as_ref() {
        session.sink.replace(sink);
        return Counting::Available;
    }

    let listeners = match helper.take_counting_sockets() {
        Ok(Handover::Took(listeners)) if !listeners.is_empty() => listeners,
        Ok(handover) => {
            return Counting::Unavailable {
                because: handover
                    .because()
                    .unwrap_or(crate::helper::NOT_COUNTING_HERE)
                    .to_string(),
            }
        }
        Err(trouble) => {
            return Counting::Unavailable {
                because: trouble.message,
            }
        }
    };

    let stop = Arc::new(AtomicBool::new(false));
    let sink = Arc::new(Forward(Mutex::new(sink)));
    let mut threads = Vec::new();

    for listener in listeners {
        let stop = Arc::clone(&stop);
        let sink = Arc::clone(&sink);
        threads.push(std::thread::spawn(move || {
            serve_until(listener, sink.as_ref(), now, &stop);
        }));
    }

    *held = Some(Session {
        stop,
        threads,
        sink,
    });
    Counting::Available
}

/// Stop counting, and give the ports back.
///
/// Silent mode means nothing listens, and a port Cairn is not using is a port
/// Cairn does not hold. The threads are joined rather than abandoned so that the
/// listeners have actually dropped — and therefore the ports have actually been
/// released — by the time this returns, instead of at some point afterwards.
pub fn stop() {
    let Some(session) = held().take() else {
        return;
    };

    session.stop.store(true, Ordering::Relaxed);
    for thread in session.threads {
        let _ = thread.join();
    }
}
