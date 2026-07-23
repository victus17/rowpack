# Security model

Rowpack minimizes the amount of trusted infrastructure by producing a file with no runtime backend.

## Guarantees

- The generated app makes no intentional network requests.
- Its Content Security Policy defaults every source category to `none`.
- `connect-src 'none'` prevents `fetch`, WebSocket and similar connections.
- Scripts and styles are inlined; remote scripts, fonts and images are not used.
- Embedded JSON escapes `<`, U+2028 and U+2029 before entering HTML.
- The embedded document is validated during compilation and again at runtime.
- CSV export prefixes spreadsheet formula starters (`=`, `+`, `-`, `@`) with an apostrophe.

## Trust boundaries

The HTML file contains its records in readable JSON. Rowpack does not encrypt data and cannot defend against someone who can read or replace the file.

Opening a modified file means trusting that file. The bundled Content Security Policy reduces the impact of injected markup and blocks outbound connections, but it is not a substitute for provenance, filesystem permissions or full-disk encryption.

## Browser capabilities

Direct overwrite uses the browser’s File System Access API and always requires a user gesture. Browsers without that API receive a normal download. Rowpack does not ask for persistent filesystem access.

## Out of scope

- multi-user authorization;
- at-rest encryption;
- untrusted third-party browser extensions;
- a compromised browser or operating system;
- automatic backups and version retention outside the current session.
