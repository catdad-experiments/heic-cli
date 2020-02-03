#!/usr/bin/env node
require('yargs')
  .command(
    '$0',
    'convert HEIC image to JPEG or PNG',
    yargs => yargs
      .option('format', {
        alias: 'f',
        describe: 'the output format',
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
        describe: 'the input file to convert, - for stdin',
        default: '-'
      })
      .option('output', {
        alias: 'o',
        describe: 'the output file to create, - for stdout',
        default: '-'
      }),
    async ({ input, output, format }) => {
      try {
        await new Promise(r => setTimeout(() => r(), 0));
        await outputImage({ input, output, format });
      } catch (err) {
        onError(err);
      }
    }
  )
  .command(
    'info',
    'see minimum info about each image in the file',
    (yargs) => yargs
      .option('input', {
        alias: 'i',
        describe: 'the input file to convert, - for stdin',
        default: '-'
      }),
    async ({ input }) => {
      /* eslint-disable no-console */
      try {
        await new Promise(r => setTimeout(() => r(), 0));
        const images = await prep({ input });
        images.forEach((image, idx) => {
          console.log(`------ Image ${+idx + 1} ------`);
          console.log('width ', image.width);
          console.log('height', image.height);
        });
      } catch (err) {
        process.exitCode = 1;
        console.error(err);
      }
      /* eslint-enable no-console */
    }
  )
  .help()
  .argv;

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

const prep = async ({ input, format = 'jpg' }) => {
  const buffer = input === '-' ?
    await readStdin() :
    await promisify(fs.readFile)(path.resolve('.', input));

  const results = await convert.all({ buffer, format: FORMAT[format], quality: 1 });

  return results;
};

const outputImage = async ({ input, output, format }) => {
  const [image] = await prep({ input, format });
  const result = await image.convert();

  if (output === '-') {
    process.stdout.write(result);
  } else {
    await promisify(fs.writeFile)(path.resolve('.', output), result);
  }
};

const onError = err => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
};
