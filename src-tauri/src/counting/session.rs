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
/// Starting twice does nothing the second time. The ports are already Cairn's
/// and already being accepted on.
pub fn start(
    helper: &dyn HelperChannel,
    sink: Arc<dyn NoteReach>,
    now: fn() -> i64,
) -> Counting {
    let mut held = held();
    if held.is_some() {
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
    let mut threads = Vec::new();

    for listener in listeners {
        let stop = Arc::clone(&stop);
        let sink = Arc::clone(&sink);
        threads.push(std::thread::spawn(move || {
            serve_until(listener, sink.as_ref(), now, &stop);
        }));
    }

    *held = Some(Session { stop, threads });
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
