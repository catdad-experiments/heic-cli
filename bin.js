#!/usr/bin/env node
const argv = require('yargs')
  .command('$0 [input] [output]', '', yargs => {
    yargs
      .positional('input', {
        describe: 'the input file to convert',
        required: false
      })
      .positional('output', {
        describe: 'the output file to create',
        required: false
      });
  })
  .coerce('format', val => {
    if (val.toLowerCase() === 'jpeg') {
      return 'jpg';
    }

    return val.toLowerCase();
  })
  .option('format', {
    alias: 'f',
    describe: 'the output format',
    choices: ['jpg', 'png'],
    default: 'jpg'
  })
  .help()
  .argv;

const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const convert = require('heic-convert');

const { input, output, format } = argv;

const FORMAT = {
  png: 'PNG',
  jpg: 'JPEG'
};

(async () => {
  const buffer = await promisify(fs.readFile)(input ? path.resolve('.', input) : process.stdin.fd);
  const result = await convert({ buffer, format: FORMAT[format], quality: 1 });

  if (output) {
    await promisify(fs.writeFile)(path.resolve('.', output), result);
  } else {
    process.stdout.write(result);
  }
})().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
