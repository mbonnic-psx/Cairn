//! A calendar date — year, month, day — with no clock and no timezone.
//!
//! `data-model.md` ("journal_entries", "reach_estimates") is explicit about why
//! a day is stored as a local calendar date rather than an instant: "Tuesday's
//! entry" has to survive the person moving timezones, where a stored instant
//! would drift into the day before or after. `contracts/patterns.md` needs the
//! same type for its bucketing arithmetic, so it lives here rather than inside
//! either of the modules that consume it.
//!
//! Pure integer arithmetic only — no calendar crate, no clock, no platform
//! conditional. `scripts/check-domain-purity.sh` enforces that, not just
//! convention.

use std::fmt;
use std::str::FromStr;

use serde::{Deserialize, Serialize};

/// Why a set of year/month/day fields, or a piece of text, does not name a
/// calendar day.
#[derive(Clone, PartialEq, Eq, Debug)]
pub enum DateError {
    /// `month` was not in `1..=12`.
    MonthOutOfRange(u8),
    /// `day` was not a day that exists in the given year and month — including
    /// 29 February in a year that is not a leap year.
    DayOutOfRange { year: i32, month: u8, day: u8 },
    /// Text did not match `YYYY-MM-DD`.
    Malformed,
}

impl fmt::Display for DateError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            DateError::MonthOutOfRange(month) => {
                write!(f, "{month} is not a month between 1 and 12")
            }
            DateError::DayOutOfRange { year, month, day } => {
                write!(f, "{year:04}-{month:02} has no day {day}")
            }
            DateError::Malformed => f.write_str("text was not in the form YYYY-MM-DD"),
        }
    }
}

impl std::error::Error for DateError {}

/// A local calendar date. No timezone, no time of day — a day as a person
/// would write it on a calendar.
///
/// There is no public constructor from unchecked fields: every `LocalDate`
/// that exists has already passed [`LocalDate::new`], so a caller can never
/// hold a 31st of April.
#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Debug, Hash)]
pub struct LocalDate {
    year: i32,
    month: u8,
    day: u8,
}

impl LocalDate {
    /// Build a date from its calendar fields, rejecting anything that is not a
    /// day that exists — month 0 or 13, a 32nd of any month, 31 April, 29
    /// February outside a leap year.
    pub fn new(year: i32, month: u8, day: u8) -> Result<Self, DateError> {
        if !(1..=12).contains(&month) {
            return Err(DateError::MonthOutOfRange(month));
        }
        let last_day = days_in_month(year, month);
        if day == 0 || day > last_day {
            return Err(DateError::DayOutOfRange { year, month, day });
        }
        Ok(LocalDate { year, month, day })
    }

    pub fn year(&self) -> i32 {
        self.year
    }

    pub fn month(&self) -> u8 {
        self.month
    }

    pub fn day(&self) -> u8 {
        self.day
    }

    /// The date `days` days after 1970-01-01, where 1970-01-01 is itself
    /// zero. `days` may be negative, for a date before the epoch.
    ///
    /// Uses the civil-from-days algorithm (Howard Hinnant, "chrono-Compatible
    /// Low-Level Date Algorithms"), which is exact over a far wider range than
    /// this type will ever see. The era is taken with `div_euclid`/`rem_euclid`
    /// rather than `/` and `%`: those floor toward negative infinity, so a
    /// pre-epoch `days` lands in the era that actually contains it instead of
    /// the one truncation would put it in.
    pub fn from_days_since_epoch(days: i64) -> LocalDate {
        let (year, month, day) = civil_from_days(days);
        LocalDate {
            year: year as i32,
            month: month as u8,
            day: day as u8,
        }
    }

    /// The inverse of [`LocalDate::from_days_since_epoch`]: how many days this
    /// date is after 1970-01-01 (negative before it).
    pub fn days_since_epoch(&self) -> i64 {
        days_from_civil(
            i64::from(self.year),
            u32::from(self.month),
            u32::from(self.day),
        )
    }

    /// A number 0–6 for this date's day of the week: 0 for Monday through 6
    /// for Sunday (ISO 8601 numbering, made zero-based).
    ///
    /// 1970-01-01 — day zero of the epoch this whole type is built on — was a
    /// Thursday, so the raw remainder `days_since_epoch().rem_euclid(7)` is
    /// Thursday-based: it comes out 0 on a Thursday, 1 on a Friday, and so on.
    /// `contracts/patterns.md` derives the day of week "against the epoch's
    /// known weekday", i.e. using that fact to correct the remainder rather
    /// than exporting it uncorrected — so three is added, mod 7, to shift the
    /// zero point from Thursday to Monday before anything is returned.
    /// `rem_euclid` rather than `%` for the same reason as above: a negative
    /// `days_since_epoch` must still land on 0–6, not on a negative remainder.
    ///
    /// This returns a number and nothing else. Naming the day is product copy,
    /// and product copy belongs where the banned-word check can see it, not in
    /// the pure layer (`contracts/patterns.md`). Which day an interface draws
    /// first in a week — Monday-first or Sunday-first — is that interface's
    /// choice and has no bearing on what this number means; this layer fixes
    /// only the numbering, never the layout.
    pub fn weekday(&self) -> u8 {
        (self.days_since_epoch() + 3).rem_euclid(7) as u8
    }
}

impl fmt::Display for LocalDate {
    /// `YYYY-MM-DD`, zero-padded. This is the storage form `data-model.md`
    /// specifies for `journal_entries.day` and `reach_estimates.day`.
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if self.year < 0 {
            write!(f, "-{:04}-{:02}-{:02}", -self.year, self.month, self.day)
        } else {
            write!(f, "{:04}-{:02}-{:02}", self.year, self.month, self.day)
        }
    }
}

impl FromStr for LocalDate {
    type Err = DateError;

    /// Parse `YYYY-MM-DD` back into a date, rejecting anything else outright
    /// rather than guessing at what was meant.
    fn from_str(s: &str) -> Result<Self, DateError> {
        let (negative, rest) = match s.strip_prefix('-') {
            Some(rest) => (true, rest),
            None => (false, s),
        };

        let mut parts = rest.split('-');
        let (Some(year_str), Some(month_str), Some(day_str)) =
            (parts.next(), parts.next(), parts.next())
        else {
            return Err(DateError::Malformed);
        };
        if parts.next().is_some() {
            return Err(DateError::Malformed);
        }

        if year_str.len() != 4 || month_str.len() != 2 || day_str.len() != 2 {
            return Err(DateError::Malformed);
        }
        let all_digits = |field: &str| field.bytes().all(|b| b.is_ascii_digit());
        if !all_digits(year_str) || !all_digits(month_str) || !all_digits(day_str) {
            return Err(DateError::Malformed);
        }

        let year: i32 = year_str.parse().map_err(|_| DateError::Malformed)?;
        let year = if negative { -year } else { year };
        let month: u8 = month_str.parse().map_err(|_| DateError::Malformed)?;
        let day: u8 = day_str.parse().map_err(|_| DateError::Malformed)?;

        LocalDate::new(year, month, day)
    }
}

impl Serialize for LocalDate {
    /// Serializes as the same `YYYY-MM-DD` text form it stores as, so a
    /// `LocalDate` field round-trips through JSON configuration or the
    /// encrypted store without a second representation to keep in sync.
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

impl<'de> Deserialize<'de> for LocalDate {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let text = String::deserialize(deserializer)?;
        text.parse().map_err(serde::de::Error::custom)
    }
}

/// True for a Gregorian leap year: divisible by 4, unless divisible by 100,
/// unless divisible by 400.
fn is_leap_year(year: i32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

/// The last valid day number for `month` in `year`. `month` must already be
/// `1..=12`.
fn days_in_month(year: i32, month: u8) -> u8 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => {
            if is_leap_year(year) {
                29
            } else {
                28
            }
        }
        _ => 0,
    }
}

/// Days since 1970-01-01 for a valid `(year, month, day)`. `month` is
/// `1..=12`, `day` is `1..=31`.
///
/// Howard Hinnant's `days_from_civil`, with the era taken by `div_euclid` /
/// `rem_euclid` in place of the sign-checked division the original uses — the
/// two agree everywhere, but `div_euclid` says directly why they agree instead
/// of leaving it in a conditional.
fn days_from_civil(year: i64, month: u32, day: u32) -> i64 {
    let y = if month <= 2 { year - 1 } else { year };
    let era = y.div_euclid(400);
    let year_of_era = y.rem_euclid(400); // [0, 399]
    let month_index = if month > 2 { month - 3 } else { month + 9 } as i64; // [0, 11]
    let day_of_year = (153 * month_index + 2) / 5 + day as i64 - 1; // [0, 365]
    let day_of_era = year_of_era * 365 + year_of_era.div_euclid(4)
        - year_of_era.div_euclid(100)
        + day_of_year; // [0, 146_096]
    era * 146_097 + day_of_era - 719_468
}

/// The inverse of [`days_from_civil`].
fn civil_from_days(days: i64) -> (i64, u32, u32) {
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let day_of_era = z.rem_euclid(146_097); // [0, 146_096]
    let year_of_era = (day_of_era - day_of_era.div_euclid(1460)
        + day_of_era.div_euclid(36_524)
        - day_of_era.div_euclid(146_096))
        / 365; // [0, 399]
    let year = year_of_era + era * 400;
    let day_of_year = day_of_era
        - (365 * year_of_era + year_of_era.div_euclid(4) - year_of_era.div_euclid(100)); // [0, 365]
    let month_index = (5 * day_of_year + 2) / 153; // [0, 11]
    let day = (day_of_year - (153 * month_index + 2) / 5 + 1) as u32; // [1, 31]
    let month = if month_index < 10 {
        month_index + 3
    } else {
        month_index - 9
    } as u32; // [1, 12]
    let year = if month <= 2 { year + 1 } else { year };
    (year, month, day)
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    /// A day number far enough either side of the epoch to exercise several
    /// centuries of eras, but small enough that the resulting year always fits
    /// in `i32` with headroom.
    const WIDE_DAY_RANGE: std::ops::RangeInclusive<i64> = -3_650_000..=3_650_000;

    /// Narrower than [`WIDE_DAY_RANGE`]: kept within roughly ±5000 years so the
    /// resulting year is always representable in the 4-digit `YYYY` the text
    /// form renders — the text round-trip property is about the text encoding,
    /// not about how many digits a year may have.
    const TEXT_SAFE_DAY_RANGE: std::ops::RangeInclusive<i64> = -1_800_000..=1_800_000;

    fn valid_date() -> impl Strategy<Value = LocalDate> {
        TEXT_SAFE_DAY_RANGE.prop_map(LocalDate::from_days_since_epoch)
    }

    proptest! {
        /// Round-trip, days: converting a day number to a date and back returns
        /// the same day number, across a wide range including large negatives.
        #[test]
        fn from_days_since_epoch_round_trips_through_days_since_epoch(days in WIDE_DAY_RANGE) {
            let date = LocalDate::from_days_since_epoch(days);
            prop_assert_eq!(date.days_since_epoch(), days);
        }

        /// Round-trip, text: rendering a date and parsing it back returns the
        /// same date.
        #[test]
        fn to_string_round_trips_through_from_str(date in valid_date()) {
            let rendered = date.to_string();
            let parsed: LocalDate = rendered.parse().unwrap();
            prop_assert_eq!(parsed, date);
        }
    }

    // --- Pre-epoch correctness -------------------------------------------
    //
    // Values below are reasoned out from the calendar, not observed from this
    // file's own implementation.

    #[test]
    fn day_before_epoch_is_1969_12_31() {
        // One calendar day before 1970-01-01 is, trivially, 1969-12-31.
        let date = LocalDate::new(1969, 12, 31).unwrap();
        assert_eq!(date.days_since_epoch(), -1);
        assert_eq!(LocalDate::from_days_since_epoch(-1), date);
    }

    #[test]
    fn a_date_well_before_1900_maps_to_the_day_number_counted_by_hand() {
        // 1600-01-01 to 1970-01-01 is 370 years. Leap years in [1600, 1969]
        // under the Gregorian rule: multiples of 4 in that range (93) minus
        // multiples of 100 (1600, 1700, 1800, 1900 -> 4) plus multiples of 400
        // that would otherwise have been excluded (1600 -> 1) = 90.
        // 370 * 365 + 90 = 135_050 + 90 = 135_140 days, so 1600-01-01 is
        // -135_140.
        let date = LocalDate::new(1600, 1, 1).unwrap();
        assert_eq!(date.days_since_epoch(), -135_140);
        assert_eq!(LocalDate::from_days_since_epoch(-135_140), date);
    }

    // --- Leap years ---------------------------------------------------------

    #[test]
    fn february_29_is_accepted_in_2000_a_leap_year_divisible_by_400() {
        assert!(LocalDate::new(2000, 2, 29).is_ok());
    }

    #[test]
    fn february_29_is_rejected_in_1900_divisible_by_100_but_not_400() {
        assert_eq!(
            LocalDate::new(1900, 2, 29),
            Err(DateError::DayOutOfRange {
                year: 1900,
                month: 2,
                day: 29
            })
        );
    }

    #[test]
    fn february_29_is_accepted_in_2024_an_ordinary_leap_year() {
        assert!(LocalDate::new(2024, 2, 29).is_ok());
    }

    #[test]
    fn february_29_is_rejected_in_2023_an_ordinary_non_leap_year() {
        assert!(LocalDate::new(2023, 2, 29).is_err());
    }

    // --- Weekday --------------------------------------------------------
    //
    // Weekday 0 means Monday and 6 means Sunday (ISO 8601, zero-based), by
    // this module's own definition. Every assertion below is stated from an
    // independently known weekday, not from running the code.

    #[test]
    fn the_epoch_day_1970_01_01_was_a_thursday_so_its_weekday_is_three() {
        // Monday=0, Tuesday=1, Wednesday=2, Thursday=3.
        let date = LocalDate::new(1970, 1, 1).unwrap();
        assert_eq!(date.weekday(), 3);
    }

    #[test]
    fn day_1969_12_31_was_the_wednesday_before_the_epochs_thursday_so_its_weekday_is_two()
    {
        // One day before a Thursday is a Wednesday, and Wednesday is 2 in
        // this numbering (Monday=0, Tuesday=1, Wednesday=2).
        let date = LocalDate::new(1969, 12, 31).unwrap();
        assert_eq!(date.weekday(), 2);
    }

    #[test]
    fn day_2024_01_01_was_a_monday_so_its_weekday_is_zero() {
        // 2024-01-01 is a well known Monday, and Monday is this numbering's
        // zero point. This is the case that would have silently proved the
        // old Thursday-based convention wrong had anyone checked it against a
        // name: the old code returned 4 here, not a weekday's actual name.
        let date = LocalDate::new(2024, 1, 1).unwrap();
        assert_eq!(date.weekday(), 0);
    }

    #[test]
    fn day_1970_01_04_was_the_sunday_three_days_after_the_epochs_thursday_so_its_weekday_is_six(
    ) {
        // Sunday is the boundary value (6) and the one most likely to be off
        // by one under a shifted modulus. Three days after the epoch's known
        // Thursday — Fri, Sat, Sun — is 1970-01-04, a Sunday, independently of
        // any arithmetic this module performs.
        let date = LocalDate::new(1970, 1, 4).unwrap();
        assert_eq!(date.weekday(), 6);
    }

    // --- Invalid input rejected -------------------------------------------

    #[test]
    fn month_zero_is_rejected() {
        assert_eq!(
            LocalDate::new(2024, 0, 1),
            Err(DateError::MonthOutOfRange(0))
        );
    }

    #[test]
    fn month_thirteen_is_rejected() {
        assert_eq!(
            LocalDate::new(2024, 13, 1),
            Err(DateError::MonthOutOfRange(13))
        );
    }

    #[test]
    fn day_zero_is_rejected() {
        assert!(LocalDate::new(2024, 1, 0).is_err());
    }

    #[test]
    fn day_thirty_two_is_rejected() {
        assert!(LocalDate::new(2024, 1, 32).is_err());
    }

    #[test]
    fn april_thirty_first_is_rejected_april_has_thirty_days() {
        assert_eq!(
            LocalDate::new(2024, 4, 31),
            Err(DateError::DayOutOfRange {
                year: 2024,
                month: 4,
                day: 31
            })
        );
    }

    #[test]
    fn malformed_text_missing_a_component_is_rejected() {
        assert_eq!("2024-01".parse::<LocalDate>(), Err(DateError::Malformed));
    }

    #[test]
    fn malformed_text_with_a_short_year_is_rejected() {
        assert_eq!("24-01-01".parse::<LocalDate>(), Err(DateError::Malformed));
    }

    #[test]
    fn malformed_text_with_non_digits_is_rejected() {
        assert_eq!("2024-XX-01".parse::<LocalDate>(), Err(DateError::Malformed));
    }

    #[test]
    fn malformed_text_with_trailing_content_is_rejected() {
        assert_eq!(
            "2024-01-01-extra".parse::<LocalDate>(),
            Err(DateError::Malformed)
        );
    }

    #[test]
    fn text_for_an_impossible_date_is_rejected_not_silently_clamped() {
        assert_eq!(
            "2024-02-30".parse::<LocalDate>(),
            Err(DateError::DayOutOfRange {
                year: 2024,
                month: 2,
                day: 30
            })
        );
    }

    // --- Serde round-trips through the same text form -----------------------

    #[test]
    fn serde_json_round_trips_as_the_yyyy_mm_dd_string() {
        let date = LocalDate::new(2026, 8, 28).unwrap();
        let json = serde_json::to_string(&date).unwrap();
        assert_eq!(json, "\"2026-08-28\"");
        let back: LocalDate = serde_json::from_str(&json).unwrap();
        assert_eq!(back, date);
    }
}
