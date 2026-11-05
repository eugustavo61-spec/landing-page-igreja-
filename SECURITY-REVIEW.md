# Security review

Date: 2026-11-05

## Scope

Read-only review of the public static site, client-side JavaScript, and Google Sheets API integration.

## Findings

No security vulnerabilities were identified in the reviewed code.

## Configuration recommendations

- The Google Sheets API key in `agenda-config.js` is visible to site visitors because it is used by browser-side code. This is expected for a static site and is not, by itself, a vulnerability.
- Restrict the key to the Google Sheets API and the site's allowed HTTP referrers (`iaded.com.br` and `www.iaded.com.br`).
- Keep private information out of the publicly readable spreadsheet.
- Rotate the key if it was ever used without appropriate restrictions.
