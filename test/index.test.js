/* eslint-env mocha */
const path = require('path');
const { spawn } = require('child_process');

const fs = require('fs-extra');
const root = require('rootrequire');
const tempy = require('tempy');
const { fromBuffer: filetype } = require('file-type');
const { expect } = require('chai');
const eos = require('end-of-stream');
const toUint8 = require('buffer-to-uint8array');
const pixelmatch = require('pixelmatch');
const { PNG } = require('pngjs');
const jpegJs = require('jpeg-js');

describe('heic-convert', () => {
  const HELP_LINE = 'Convert HEIC image to JPEG or PNG';

  const decode = {
    'image/png': buffer => PNG.sync.read(buffer),
    'image/jpeg': buffer => jpegJs.decode(buffer)
  };

  const readControl = async name => {
    const buffer = await fs.readFile(path.resolve(root, `temp/${name}`));
    return decode['image/png'](buffer);
  };

  const compare = (expected, actual, width, height, errString = 'actual image did not match control image') => {
    const result = pixelmatch(toUint8(Buffer.from(expected)), toUint8(Buffer.from(actual)), null, width, height, {
      threshold: 0.1
    });

    // allow 5% of pixels to be different
    expect(result).to.be.below(width * height * 0.05, errString);
  };

  const assertImage = async (buffer, mime, control) => {
    const type = await filetype(buffer);
    expect(type.mime).to.equal(mime);

    const actual = decode[mime](buffer);

    expect(actual.width).to.equal(control.width);
    expect(actual.height).to.equal(control.height);

    compare(control.data, actual.data, control.width, control.height);
  };

  const exec = async (args, options = {}, input = Buffer.from('')) => {
    return await Promise.resolve().then(async () => {
      const proc = spawn(process.execPath, ['bin'].concat(args), Object.assign({}, options, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: root,
        windowsHide: true
      }));

      const stdout = [];
      const stderr = [];

      proc.stdout.on('data', chunk => stdout.push(chunk));
      proc.stderr.on('data', chunk => stderr.push(chunk));

      proc.stdin.end(input);

      const [code] = await Promise.all([
        new Promise(resolve => proc.on('exit', code => resolve(code))),
        new Promise(resolve => eos(proc.stdout, () => resolve())),
        new Promise(resolve => eos(proc.stderr, () => resolve())),
      ]);

      return {
        err: { code },
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr)
      };
    });
  };

  const files = (() => {
    const list = [];

    return {
      get: (...args) => {
        const res = tempy.file(...args);
        list.push(res);
        return res;
      },
      dir: () => {
        const res = tempy.directory();
        list.push(res);
        return res;
      },
      clean: async () => {
        while(list.length) {
          await fs.remove(list.pop());
        }
      }
    };
  })();

  afterEach(async () => {
    await files.clean();
  });

  describe('using --input and --output', () => {
    let control;

    before(async () => {
      control = await readControl('0002-control.png');
    });

    it('converts known image to jpeg', async () => {
      const infile = path.resolve(root, 'temp', '0002.heic');
      const outfile = files.get({ extension: 'jpg' });

      const { stdout, stderr, err } = await exec(['--input', `"${infile}"`, '--output', `"${outfile}"`]);

      expect(stdout.toString()).to.equal('');
      expect(stderr.toString()).to.equal('');
      expect(err).to.have.property('code', 0);

      await assertImage(await fs.readFile(outfile), 'image/jpeg', control);
    });

    it('converts known image to png', async () => {
      const infile = path.resolve(root, 'temp', '0002.heic');
      const outfile = files.get({ extension: 'jpg' });

      const { stdout, stderr, err } = await exec(['--input', `"${infile}"`, '--output', `"${outfile}"`, '--format', 'png']);

      expect(stdout.toString()).to.equal('');
      expect(stderr.toString()).to.equal('');
      expect(err).to.have.property('code', 0);

      await assertImage(await fs.readFile(outfile), 'image/png', control);
    });
  });

  describe('using -i and -o', () => {
    let control;

    before(async () => {
      control = await readControl('0002-control.png');
    });

    it('converts known image to jpeg', async () => {
      const infile = path.resolve(root, 'temp', '0002.heic');
      const outfile = files.get({ extension: 'jpg' });

      const { stdout, stderr, err } = await exec(['-i', `"${infile}"`, '-o', `"${outfile}"`]);

      expect(stdout.toString()).to.equal('');
      expect(stderr.toString()).to.equal('');
      expect(err).to.have.property('code', 0);

      await assertImage(await fs.readFile(outfile), 'image/jpeg', control);
    });

    it('converts known image to png', async () => {
      const infile = path.resolve(root, 'temp', '0002.heic');
      const outfile = files.get({ extension: 'jpg' });

      const { stdout, stderr, err } = await exec(['--input', `"${infile}"`, '--output', `"${outfile}"`, '-f', 'PNG']);

      expect(stdout.toString()).to.equal('');
      expect(stderr.toString()).to.equal('');
      expect(err).to.have.property('code', 0);

      await assertImage(await fs.readFile(outfile), 'image/png', control);
    });
  });

  describe('using stdin and stdout', () => {
    let control;

    before(async () => {
      control = await readControl('0002-control.png');
    });

    it('converts known image to jpeg', async () => {
      const infile = path.resolve(root, 'temp', '0002.heic');
      const inbuffer = await fs.readFile(infile);

      const { stdout, stderr, err } = await exec([], {}, inbuffer);

      expect(stderr.toString()).to.equal('');
      await assertImage(stdout, 'image/jpeg', control);
      expect(err).to.have.property('code', 0);
    });

    it('converts known image to png', async () => {
      const infile = path.resolve(root, 'temp', '0002.heic');
      const inbuffer = await fs.readFile(infile);

      const { stdout, stderr, err } = await exec(['-f', 'PNG'], {}, inbuffer);

      expect(stderr.toString()).to.equal('');
      await assertImage(stdout, 'image/png', control);
      expect(err).to.have.property('code', 0);
    });
  });

  describe('using a multi-image file', () => {
    let controls;

    before(async () => {
      controls = await Promise.all([
        readControl('0003-0-control.png'),
        readControl('0003-1-control.png'),
      ]);
    });

    it('converts the first image by default', async () => {
      const infile = path.resolve(root, 'temp', '0003.heic');

      const { stdout, stderr, err } = await exec(['--input', `"${infile}"`], {});

      expect(stderr.toString()).to.equal('');
      await assertImage(stdout, 'image/jpeg', controls[0]);
      expect(err).to.have.property('code', 0);
    });

    it('can convert multiple images using the --images flag', async () => {
      const infile = path.resolve(root, 'temp', '0003.heic');
      const inbuffer = await fs.readFile(infile);
      const rand = Math.random().toString(36).slice(2);
      const outdir = files.dir();
      const outtemp = path.resolve(outdir, `${rand}-%s-%s.jpg`);

      const { stdout, stderr, err } = await exec(['--output', `"${outtemp}"`, '--images', '1', '2'], {}, inbuffer);

      expect(stdout.toString()).to.equal('');
      expect(stderr.toString()).to.equal('');
      expect(err).to.have.property('code', 0);

      await assertImage(await fs.readFile(path.resolve(outdir, `${rand}-1-1.jpg`)), 'image/jpeg', controls[1]);
      await assertImage(await fs.readFile(path.resolve(outdir, `${rand}-2-2.jpg`)), 'image/jpeg', controls[1]);
    });

    it('can convert all images using -m -1', async () => {
      const infile = path.resolve(root, 'temp', '0003.heic');
      const inbuffer = await fs.readFile(infile);
      const rand = Math.random().toString(36).slice(2);
      const outdir = files.dir();
      const outtemp = path.resolve(outdir, `%s-${rand}-%s-%s.jpg`);

      const { stdout, stderr, err } = await exec(['--output', `"${outtemp}"`, '-m', '-1'], {}, inbuffer);

      expect(stdout.toString()).to.equal('');
      expect(stderr.toString()).to.equal('');
      expect(err).to.have.property('code', 0);

      await assertImage(await fs.readFile(path.resolve(outdir, `0-${rand}-0-0.jpg`)), 'image/jpeg', controls[0]);
      await assertImage(await fs.readFile(path.resolve(outdir, `1-${rand}-1-1.jpg`)), 'image/jpeg', controls[1]);
      await assertImage(await fs.readFile(path.resolve(outdir, `2-${rand}-2-2.jpg`)), 'image/jpeg', controls[1]);
    });

    it('can write a single non-default image to standard out', async () => {
      const infile = path.resolve(root, 'temp', '0003.heic');
      const inbuffer = await fs.readFile(infile);

      const { stdout, stderr, err } = await exec(['--images', '2'], {}, inbuffer);

      expect(stderr.toString()).to.equal('');
      await assertImage(stdout, 'image/jpeg', controls[1]);
      expect(err).to.have.property('code', 0);
    });

    it('errors if writing to standard out with multiple images', async () => {
      const infile = path.resolve(root, 'temp', '0003.heic');
      const inbuffer = await fs.readFile(infile);

      const { stdout, stderr, err } = await exec(['--images', '-1'], {}, inbuffer);

      expect(stderr.toString())
        .to.contain('cannot write all images to standard out, use --output to provide filename template')
        .and.to.contain(HELP_LINE);
      expect(stdout.toString()).to.equal('');
      expect(err).to.have.property('code', 1);
    });

    it('errors if converting an image index that does not exist', async () => {
      const infile = path.resolve(root, 'temp', '0003.heic');
      const inbuffer = await fs.readFile(infile);

      const { stdout, stderr, err } = await exec(['--images', '7'], {}, inbuffer);

      expect(stderr.toString())
        .to.contain('RangeError: no image at index 7, images in file: 3')
        .and.to.contain(HELP_LINE);
      expect(stdout.toString()).to.equal('');
      expect(err).to.have.property('code', 1);
    });
  });

  describe('using invalid inputs', () => {
    it('errors for an unknown output format', async () => {
      const infile = path.resolve(root, 'temp', '0002.heic');
      const outfile = files.get({ extension: 'jpg' });

      const { stdout, stderr, err } = await exec(['--input', `"${infile}"`, '--output', `"${outfile}"`, '-f', 'pineapples']);

      expect(err).to.have.property('code', 1);
      expect(stdout.toString()).to.equal('');
      expect(stderr.toString()).to.include('Invalid values:')
        .and.to.include('Argument: format, Given: "pineapples", Choices: "jpg", "png"')
        .and.to.include(HELP_LINE);
    });

    it('errors for input data that is not a heic image', async () => {
      const infile = path.resolve(root, 'temp', '0001.jpg');
      const outfile = files.get({ extension: 'jpg' });

      const { stdout, stderr, err } = await exec(['--input', `"${infile}"`, '--output', `"${outfile}"`]);

      expect(err).to.have.property('code', 1);
      expect(stdout.toString()).to.equal('');
      expect(stderr.toString()).to.include('TypeError: input buffer is not a HEIC image')
        .and.to.include(HELP_LINE);
    });
  });

  describe('info', () => {
    it('prints a message showing how many images are in the file defined by --input', async () => {
      const infile = path.resolve(root, 'temp', '0002.heic');

      const { stdout, stderr, err } = await exec(['info', '--input', `"${infile}"`]);

      expect(stdout.toString()).to.equal('images in file: 1\n');
      expect(stderr.toString()).to.equal('');
      expect(err).to.have.property('code', 0);
    });

    it('prints a message showing how many images are in the file provided by stdin', async () => {
      const infile = path.resolve(root, 'temp', '0002.heic');
      const inbuffer = await fs.readFile(infile);

      const { stdout, stderr, err } = await exec(['info'], {}, inbuffer);

      expect(stdout.toString()).to.equal('images in file: 1\n');
      expect(stderr.toString()).to.equal('');
      expect(err).to.have.property('code', 0);
    });

    it('prints only a number showing how many images are in the file', async () => {
      const infile = path.resolve(root, 'temp', '0002.heic');

      const { stdout, stderr, err } = await exec(['info', '--input', `"${infile}"`, '--count']);

      expect(stdout.toString()).to.equal('1\n');
      expect(stderr.toString()).to.equal('');
      expect(err).to.have.property('code', 0);
    });

    it('prints the correct number for a known multi-image file', async () => {
      const infile = path.resolve(root, 'temp', '0003.heic');

      const { stdout, stderr, err } = await exec(['info', '--input', `"${infile}"`, '--count']);

      expect(stdout.toString()).to.equal('3\n');
      expect(stderr.toString()).to.equal('');
      expect(err).to.have.property('code', 0);
    });

    it('errors for input data that is not a heic image', async () => {
      const { stdout, stderr, err } = await exec(['info'], {}, Buffer.from('pineapples'));

      // prints `info` help rather than default help
      expect(stderr.toString()).to.include('TypeError: input buffer is not a HEIC image')
        .and.to.include('See minimum info about each image in the file')
        .and.to.not.include(HELP_LINE);

      expect(stdout.toString()).to.equal('');
      expect(err).to.have.property('code', 1);
    });
  });
});
