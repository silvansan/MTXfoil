# Third-party licenses

MTXfoil is released under the [MIT License](LICENSE). It integrates with and depends on the following major open-source projects. None of these require MTXfoil to use a copyleft license (e.g. AGPL).

## Runtime and integration

| Component | License | Source |
|-----------|---------|--------|
| [MediaMTX](https://github.com/bluenviron/mediamtx) | MIT | Streaming server (Docker image / API) |
| [Payload CMS](https://github.com/payloadcms/payload) | MIT | Admin CMS and API |
| [Next.js](https://github.com/vercel/next.js) | MIT | Dashboard web framework |
| [React](https://github.com/facebook/react) | MIT | UI library |
| [PostgreSQL](https://www.postgresql.org/) (via `pg`) | PostgreSQL License (similar to MIT/BSD) | Database |
| [Redis](https://redis.io/) (via `ioredis`) | MIT (client) | Job queue / cache |
| [Bull](https://github.com/OptimalBits/bull) | MIT | Background jobs |
| [hls.js](https://github.com/video-dev/hls.js) | Apache-2.0 | HLS playback in browser |
| [sharp](https://github.com/lovell/sharp) | Apache-2.0 | Image processing (Payload) |
| [GraphQL](https://github.com/graphql/graphql-js) | MIT | API layer |
| [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) | MIT | Styling |
| [Drizzle ORM](https://github.com/drizzle-team/drizzle-orm) | Apache-2.0 | Database ORM (Payload) |

## Notes

- **Transitive dependencies** may use other permissive licenses (BSD, ISC, Apache-2.0, MPL-2.0, etc.). See `dashboard/package-lock.json` and `worker/package-lock.json` for the full dependency tree.
- **sharp** bundles native libraries (e.g. libvips) under LGPL-3.0-or-later; this does not affect MTXfoil’s MIT license for application source code.
- **MediaMTX** is consumed as a separate service (container); its MIT license applies to MediaMTX itself, not to MTXfoil.

For the complete license text of any package, refer to that project’s repository or the `license` field in npm.
