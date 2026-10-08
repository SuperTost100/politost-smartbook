# Politost Smartbook

The standalone reader for interactive smartbooks, with the redesigned reading shell, library, formulas, exercises, lab, graphs and print preview.

## Start

Use Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Open http://localhost:5173 and choose "Guida di esempio". This public repository includes only the example book. Import other books as `.ptsb` files or add your own content locally.

The default build works without a backend. For a private platform integration, set `VITE_PLATFORM_ENABLED=true` and `VITE_API_URL` before building. The commercial API and private course books are maintained separately.

## Checks

```bash
npm run lint
npm run test:content
npm run test:unit
npm run build
npm run test:e2e
```

Auth tests run only with `VITE_PLATFORM_ENABLED=true`. Pyodide assets are generated during installation and build.

## Documentation

- [Reader guide](docs/guida.md), also available at `/docs`
- [Reader architecture](docs/reader.md)
- [Design system](design-system/README.md)
- [Content format](https://github.com/SuperTost100/politost-content-core/blob/main/spec/content-format.md)
- [PTSB format](docs/ptsb.md)
- [Self-hosting](docs/Self-Hosting.md)
- [Repository sync](docs/Repository-Sync.md)

## Related repositories

- [content-core](https://github.com/SuperTost100/politost-content-core/tree/main/packages/content-core): shared parser, validator and PTSB reader, MIT
- [ptsb-pack](https://github.com/SuperTost100/politost-content-core/tree/main/packages/ptsb-pack): Python packaging CLI
- [Smart Builder](https://github.com/SuperTost100/politost-smartbook-builder): current authoring app, private
- [Pyxis](https://github.com/SuperTost100/politost-pyxis): desktop study app

Development continues in these standalone repositories. The old monorepo is retained as migration history. The archived `politost-builder` is withdrawn and must not be re-exported.

## License

[AGPL-3.0](LICENSE). The bundled content-core package has its own [MIT license](packages/content-core/LICENSE).
