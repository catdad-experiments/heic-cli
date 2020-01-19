# heic-cli

> Convert HEIC/HEIF images to JPEG and PNG on the command line

[![travis][travis.svg]][travis.link]
[![npm-downloads][npm-downloads.svg]][npm.link]
[![npm-version][npm-version.svg]][npm.link]

[travis.svg]: https://travis-ci.com/catdad-experiments/heic-cli.svg?branch=master
[travis.link]: https://travis-ci.com/catdad-experiments/heic-cli
[npm-downloads.svg]: https://img.shields.io/npm/dm/heic-cli.svg
[npm.link]: https://www.npmjs.com/package/heic-cli
[npm-version.svg]: https://img.shields.io/npm/v/heic-cli.svg

## Usage

```bash
npx heic-cli < input.heic > result.jpg
```

Full options (also printed with `npx heic-cli --help`)

```
Options:
  --version     Show version number                                    [boolean]
  --format, -f  the output format       [choices: "jpg", "png"] [default: "jpg"]
  --input, -i   the input file to convert, - for stdin            [default: "-"]
  --output, -o  the output file to create, - for stdout           [default: "-"]
  --help        Show help
```

## Related

* [heic-convert](https://github.com/catdad-experiments/heic-convert) - convert heic/heif images to jpeg and png
* [heic-decode](https://github.com/catdad-experiments/heic-decode) - decode heic images to raw image data
* [libheif-js](https://github.com/catdad-experiments/libheif-js) - libheif as a pure-javascript npm module
