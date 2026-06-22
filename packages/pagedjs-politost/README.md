# pagedjs (Politost vendored)

Upstream [pagedjs@0.4.3](https://www.npmjs.com/package/pagedjs/v/0.4.3) with one change: **`@babel/polyfill` removed from `dependencies`**.

That polyfill (and `core-js@2`) is never imported by pagedjs ESM/CJS entry points — only declared in upstream `package.json`. Latest beta (`0.5.0-beta.2`) still lists it.

Drop this vendored copy when upstream removes the dead dep or we migrate print-engine off pagedjs.
