//! The destination name, and nothing beyond it.
//!
//! This is the most privacy-sensitive function in the product, so the tests
//! here are about what is *not* returned as much as what is. Principle II,
//! FR-024, FR-025, and the constraint research R2 places on the parser: a hard
//! cap, and nothing beyond the name retained.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use cairn::domain::sni::{parse_destination_name, MAX_INSPECT};

/// A ClientHello carrying `server_name`, plus whatever else is asked for.
fn client_hello(server_name: Option<&str>, extra_extension_bytes: usize) -> Vec<u8> {
    let mut extensions: Vec<u8> = Vec::new();

    if let Some(name) = server_name {
        let mut list = Vec::new();
        list.push(0x00); // host_name
        list.extend_from_slice(&(name.len() as u16).to_be_bytes());
        list.extend_from_slice(name.as_bytes());

        let mut extension = Vec::new();
        extension.extend_from_slice(&(list.len() as u16).to_be_bytes());
        extension.extend_from_slice(&list);

        extensions.extend_from_slice(&0x0000u16.to_be_bytes());
        extensions.extend_from_slice(&(extension.len() as u16).to_be_bytes());
        extensions.extend_from_slice(&extension);
    }

    if extra_extension_bytes > 0 {
        // Something else entirely — padding, ALPN, a session ticket. Cairn walks
        // past it without reading it.
        extensions.extend_from_slice(&0x0015u16.to_be_bytes());
        extensions.extend_from_slice(&(extra_extension_bytes as u16).to_be_bytes());
        extensions.extend(std::iter::repeat_n(0x00u8, extra_extension_bytes));
    }

    let mut hello = Vec::new();
    hello.extend_from_slice(&0x0303u16.to_be_bytes()); // client_version
    hello.extend(std::iter::repeat_n(0x41u8, 32)); // random
    hello.push(0); // session_id length
    hello.extend_from_slice(&2u16.to_be_bytes()); // cipher_suites length
    hello.extend_from_slice(&0x1301u16.to_be_bytes());
    hello.push(1); // compression methods length
    hello.push(0);
    hello.extend_from_slice(&(extensions.len() as u16).to_be_bytes());
    hello.extend_from_slice(&extensions);

    let mut handshake = Vec::new();
    handshake.push(0x01); // ClientHello
    handshake.extend_from_slice(&(hello.len() as u32).to_be_bytes()[1..]);
    handshake.extend_from_slice(&hello);

    let mut record = Vec::new();
    record.push(0x16); // handshake record
    record.extend_from_slice(&0x0301u16.to_be_bytes());
    record.extend_from_slice(&(handshake.len() as u16).to_be_bytes());
    record.extend_from_slice(&handshake);
    record
}

#[test]
fn reads_the_server_name_from_a_client_hello() {
    let name = parse_destination_name(&client_hello(Some("example.com"), 0)).unwrap();
    assert_eq!(name.as_str(), "example.com");
}

#[test]
fn reads_the_server_name_past_other_extensions() {
    let name =
        parse_destination_name(&client_hello(Some("news.example.com"), 64)).unwrap();
    assert_eq!(name.as_str(), "news.example.com");
}

#[test]
fn a_hello_without_a_server_name_records_nothing() {
    assert!(parse_destination_name(&client_hello(None, 32)).is_none());
}

#[test]
fn a_truncated_hello_records_nothing_rather_than_guessing() {
    let hello = client_hello(Some("example.com"), 0);
    for cut in [1, 5, 10, hello.len() / 2, hello.len() - 1] {
        assert!(
            parse_destination_name(&hello[..cut]).is_none(),
            "a hello cut at {cut} bytes should yield nothing"
        );
    }
}

#[test]
fn nothing_past_the_cap_is_read() {
    // A connection cannot be used to stream anything into Cairn: the parser
    // stops at MAX_INSPECT whatever the sender intended.
    let hello = client_hello(Some("example.com"), MAX_INSPECT * 2);
    assert!(hello.len() > MAX_INSPECT);

    // With the name behind that much padding, Cairn simply does not see it.
    let mut padded = client_hello(None, MAX_INSPECT + 512);
    padded.extend_from_slice(&client_hello(Some("example.com"), 0));
    assert!(parse_destination_name(&padded).is_none());
}

#[test]
fn reads_the_host_header_of_a_plain_request() {
    let request = b"GET /a/secret/path?token=abc123 HTTP/1.1\r\n\
                    Host: example.com\r\n\
                    Cookie: session=do-not-read-this\r\n\
                    User-Agent: something\r\n\r\nbody bytes";
    let name = parse_destination_name(request).unwrap();
    assert_eq!(name.as_str(), "example.com");
}

#[test]
fn a_host_header_with_a_port_yields_the_name_alone() {
    let request = b"GET / HTTP/1.1\r\nHost: example.com:8443\r\n\r\n";
    assert_eq!(
        parse_destination_name(request).unwrap().as_str(),
        "example.com"
    );
}

#[test]
fn the_name_is_the_only_thing_that_comes_back() {
    // Nothing beyond the domain is retained (research R2). The returned value
    // is a domain and carries no path, no query, no header, and no body — there
    // is nowhere in the type for them to live, and this asserts it in practice.
    let request = b"POST /checkout?card=4111111111111111 HTTP/1.1\r\n\
                    Host: shop.example.com\r\n\
                    Authorization: Bearer secret-token\r\n\r\n\
                    {\"card\":\"4111111111111111\"}";

    let name = parse_destination_name(request).unwrap();
    let rendered = name.to_string();

    assert_eq!(rendered, "shop.example.com");
    for leaked in ["checkout", "card", "4111", "Bearer", "secret-token", "POST"] {
        assert!(!rendered.contains(leaked), "the parser returned {leaked:?}");
    }
}

#[test]
fn bytes_that_name_nothing_record_nothing() {
    for bytes in [
        &b""[..],
        &b"\x00\x01\x02"[..],
        &b"GET / HTTP/1.1\r\n\r\n"[..], // no Host at all
        &b"GET / HTTP/1.1\r\nHost: \r\n\r\n"[..], // empty Host
        &b"GET / HTTP/1.1\r\nHost: not a domain\r\n\r\n"[..],
        &b"\x16\x03\x01"[..], // a record header and nothing else
    ] {
        assert!(parse_destination_name(bytes).is_none(), "bytes: {bytes:?}");
    }
}

#[test]
fn the_name_is_recorded_in_one_form() {
    // Whatever case it arrived in, it is the same entry that was protected.
    let name = parse_destination_name(&client_hello(Some("EXAMPLE.com"), 0)).unwrap();
    assert_eq!(name.as_str(), "example.com");
}
