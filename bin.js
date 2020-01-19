#!/usr/bin/env node
const argv = require('yargs')
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
  .option('input', {
    alias: 'i',
    describe: 'the input file to convert, - for stdin',
    default: '-'
  })
  .option('output', {
    alias: 'o',
    describe: 'the output file to create, - for stdout',
    default: '-'
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
  const buffer = await promisify(fs.readFile)(input === '-' ? process.stdin.fd : path.resolve('.', input));
  const result = await convert({ buffer, format: FORMAT[format], quality: 1 });

  if (output === '-') {
    process.stdout.write(result);
  } else {
    await promisify(fs.writeFile)(path.resolve('.', output), result);
  }
})().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
