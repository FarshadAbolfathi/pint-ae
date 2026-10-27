# Security Policy

## Scope

`pint-ae` is a library and CLI that build, serialise, parse and validate UAE
PINT AE e-invoices **offline**. It does not transmit documents, open network
connections, or handle credentials. The main security considerations are:

- **Untrusted XML input.** Parsing is done with `fast-xml-parser` (no external
  entity resolution / no XXE) and validation with SaxonJS over pre-compiled SEF.
  Report any input that causes a crash, hang, or unbounded resource use.
- **Supply chain.** Report concerns about dependencies or the build (including
  the generated SEF and code-list artifacts).

## Supported versions

The project is pre-1.0; only the latest `main` is supported. Pin a version in
production and review changes before upgrading.

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

- Preferred: use GitHub's private **"Report a vulnerability"** advisory form
  (Security tab → Report a vulnerability), or
- email **farshad.code@gmail.com** with details and reproduction steps.

You will get an acknowledgement within a few days. Please allow reasonable time
for a fix before any public disclosure. Thank you for helping keep the project
and its users safe.
