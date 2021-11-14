#!/usr/bin/env node
const yargs = require('yargs')
  .command(
    '$0',
    'Convert HEIC image to JPEG or PNG',
    yargs => yargs
      .option('format', {
        alias: 'f',
        describe: 'The output format',
        choices: ['jpg', 'png'],
        default: 'jpg',
        coerce: val => {
          if (val.toLowerCase() === 'jpeg') {
            return 'jpg';
          }

          return val.toLowerCase();
        }
      })
      .option('input', {
        alias: 'i',
        describe: 'The input file to convert, - for stdin',
        default: '-'
      })
      .option('output', {
        alias: 'o',
        describe: 'The output file to create, - for stdout',
        default: '-'
      })
      .option('quality', {
        alias: 'q',
        describe: 'The jpeg compression quality, between 0 and 1',
        default: '1',
        type: 'number'
      })
      .option('images', {
        alias: 'm',
        type: 'array',
        describe: 'Which images to decode, -1 for all',
        default: [0]
      })
      .check((args) => {
        if (args.quality != null) {
          if (args.quality <= 0 || args.quality > 1) {
            throw 'quality must be a number between 0 and 1';
          }
        }

        return true;
      }),
    async ({ input, output, format, images, quality }) => {
      const all = images.length === 1 && images[0] === -1;
      const single = images.length === 1;

      try {
        await new Promise(r => setTimeout(() => r(), 0));
        const results = await prep({ input, format, quality });
        results.forEach((img, i) => {
          img.idx = i;
        });

        if (all) {
          return await outputAllImages({ images: results, output });
        }

        for (let i of images) {
          if (!results[i]) {
            throw new RangeError(`no image at index ${i}, images in file: ${results.length}`);
          }
        }

        if (single) {
          return await outputImage({ image: results[images[0]], output });
        }

        return outputAllImages({ images: results.filter((r, i) => images.includes(i)), output });
      } catch (err) {
        onError(err);
      }
    }
  )
  .command(
    'info',
    'See minimum info about each image in the file',
    (yargs) => yargs
      .option('input', {
        alias: 'i',
        describe: 'The input file to convert, - for stdin',
        default: '-'
      })
      .option('count', {
        alias: 'c',
        describe: 'Print only the amount of images in the file as a number',
        type: 'boolean',
        default: false
      }),
    async ({ input, count }) => {
      try {
        await new Promise(r => setTimeout(() => r(), 0));
        const images = await prep({ input });

        // eslint-disable-next-line no-console
        console.log(count ? `${images.length}` : `images in file: ${images.length}`);
      } catch (err) {
        onError(err);
      }
    }
  )
  .help();

yargs.argv;

const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const convert = require('heic-convert');

const FORMAT = {
  png: 'PNG',
  jpg: 'JPEG'
};

const readStdin = () => new Promise(resolve => {
  const result = [];

  process.stdin.on('readable', () => {
    let chunk;

    while ((chunk = process.stdin.read())) {
      result.push(chunk);
    }
  });

  process.stdin.on('end', () => {
    resolve(Buffer.concat(result));
  });
});

const prep = async ({ input, format = 'jpg', quality = 1 }) => {
  const buffer = input === '-' ?
    await readStdin() :
    await promisify(fs.readFile)(path.resolve('.', input));

  const results = await convert.all({ buffer, format: FORMAT[format], quality: quality });

  return results;
};

const outputImage = async ({ image, output }) => {
  const result = await image.convert();

  if (output === '-') {
    process.stdout.write(result);
  } else {
    await promisify(fs.writeFile)(path.resolve('.', output), result);
  }
};

const outputAllImages = async ({ images, output }) => {
  if (output === '-') {
    throw new Error('cannot write all images to standard out, use --output to provide filename template');
  }

  for (let image of images) {
    let name = output.replace(/%s/g, image.idx);

    if (output === name) {
      name = `${image.idx}-${output}`;
    }

    await outputImage({ image, output: name });
  }
};

const onError = err => {
  console.error(err); // eslint-disable-line no-console
  console.error(''); // eslint-disable-line no-console
  yargs.showHelp();
  process.exitCode = 1;
};
