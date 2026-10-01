//! Whether text shows anything (G4).
//!
//! "Empty" means nothing visible: a save of text that shows nothing is refused
//! like an empty one (FR-014), and the screen keeps Keep disabled for it. The
//! store and the screen each hold this definition, and both are tested against
//! one list of cases (`tests/fixtures/nothing_visible.json`) so they cannot
//! drift. The screen's copy is `showsNothing` in `src/screens/CheckIn.tsx`.
//!
//! Written by hand, from Unicode's own tables, so that the answer does not
//! move with the toolchain's Unicode version and nothing new is depended on.

/// True when every character of `text` is one that draws nothing.
pub fn shows_nothing(text: &str) -> bool {
    text.chars().all(draws_nothing)
}

fn draws_nothing(c: char) -> bool {
    // White_Space (PropList.txt) and Cc (the C0 and C1 controls, NUL included).
    c.is_whitespace()
        || c.is_control()
        || is_default_ignorable(c)
        // Letters that are blank on screen though they are not Default_Ignorable
        // by the property itself in every Unicode version: Hangul fillers and
        // the braille blank.
        || matches!(c, '\u{115F}' | '\u{1160}' | '\u{3164}' | '\u{FFA0}' | '\u{2800}')
}

/// Default_Ignorable_Code_Point (DerivedCoreProperties.txt, Unicode 15),
/// including its unassigned reserved ranges.
fn is_default_ignorable(c: char) -> bool {
    matches!(c,
        '\u{00AD}'                  // soft hyphen
        | '\u{034F}'                // combining grapheme joiner
        | '\u{061C}'                // arabic letter mark
        | '\u{115F}'..='\u{1160}'   // hangul fillers
        | '\u{17B4}'..='\u{17B5}'   // khmer inherent vowels
        | '\u{180B}'..='\u{180F}'   // mongolian free variation selectors, U+180E vowel separator
        | '\u{200B}'..='\u{200F}'   // zero width space, joiners, direction marks
        | '\u{202A}'..='\u{202E}'   // bidi embeddings and overrides
        | '\u{2060}'..='\u{206F}'   // word joiner, invisible operators, deprecated format characters
        | '\u{3164}'                // hangul filler
        | '\u{FE00}'..='\u{FE0F}'   // variation selectors
        | '\u{FEFF}'                // zero width no-break space
        | '\u{FFA0}'                // halfwidth hangul filler
        | '\u{FFF0}'..='\u{FFF8}'   // reserved
        | '\u{1BCA0}'..='\u{1BCA3}' // shorthand format controls
        | '\u{1D173}'..='\u{1D17A}' // musical symbol format controls
        | '\u{E0000}'..='\u{E0FFF}' // tags and variation selectors supplement
    )
}
