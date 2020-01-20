#!/usr/bin/env node
const argv = require('yargs')
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

(async () => {
  const buffer = input === '-' ?
    await readStdin() :
    await promisify(fs.readFile)(path.resolve('.', input));
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
