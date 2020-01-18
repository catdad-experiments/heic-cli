#!/usr/bin/env node
const argv = require('yargs')
  .usage('heic-cli [options] input [output]')
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

const [input, output] = argv._;

const format = {
  png: 'PNG',
  jpg: 'JPEG'
};

(async () => {
  const buffer = await promisify(fs.readFile)(path.resolve('.', input));
  const result = await convert({ buffer, format: format[argv.format], quality: 1 });

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
