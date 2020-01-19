/* eslint-env mocha */
const path = require('path');
const crypto = require('crypto');
const { execFile, spawn } = require('child_process');

const fs = require('fs-extra');
const root = require('rootrequire');
const tempy = require('tempy');
const { fromBuffer: filetype } = require('file-type');
const { expect } = require('chai');
const eos = require('end-of-stream');

describe('heic-convert', () => {
  const assertImage = async (buffer, mime, hash) => {
    const type = await filetype(buffer);
    expect(type.mime).to.equal(mime);

    const actual = crypto.createHash('sha256').update(buffer).digest('hex');
    expect(actual).to.equal(hash);
  };

  const exec = (args, options = {}) => {
    return new Promise((resolve) => {
      execFile(process.execPath, ['bin.js', ...args], Object.assign({}, options, {
        cwd: root,
        windowsHide: true,
        encoding: 'buffer'
      }), (err, stdout, stderr) => {
        resolve({ err, stdout, stderr });
      });
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
    it('converts known image to jpeg', async () => {
      const infile = path.resolve(root, 'temp', '0002.heic');
      const outfile = files.get({ extension: 'jpg' });

      const { stdout, stderr } = await exec(['--input', `"${infile}"`, '--output', `"${outfile}"`]);

      expect(stdout.toString()).to.equal('');
      expect(stderr.toString()).to.equal('');

      await assertImage(await fs.readFile(outfile), 'image/jpeg', 'f7f1ae16c3fbf035d1b71b1995230305125236d0c9f0513c905ab1cb39fc68e9');
    });

    it('converts known image to png', async () => {
      const infile = path.resolve(root, 'temp', '0002.heic');
      const outfile = files.get({ extension: 'jpg' });

      const { stdout, stderr } = await exec(['--input', `"${infile}"`, '--output', `"${outfile}"`, '--format', 'png']);

      expect(stdout.toString()).to.equal('');
      expect(stderr.toString()).to.equal('');

      await assertImage(await fs.readFile(outfile), 'image/png', '0efc9a4c58d053fb42591acd83f8a5005ee2844555af29b5aba77a766b317935');
    });
  });

  describe('using -i and -o', () => {
    it('converts known image to jpeg', async () => {
      const infile = path.resolve(root, 'temp', '0002.heic');
      const outfile = files.get({ extension: 'jpg' });

      const { stdout, stderr } = await exec(['-i', `"${infile}"`, '-o', `"${outfile}"`]);

      expect(stdout.toString()).to.equal('');
      expect(stderr.toString()).to.equal('');

      await assertImage(await fs.readFile(outfile), 'image/jpeg', 'f7f1ae16c3fbf035d1b71b1995230305125236d0c9f0513c905ab1cb39fc68e9');
    });

    it('converts known image to png', async () => {
      const infile = path.resolve(root, 'temp', '0002.heic');
      const outfile = files.get({ extension: 'jpg' });

      const { stdout, stderr } = await exec(['--input', `"${infile}"`, '--output', `"${outfile}"`, '-f', 'PNG']);

      expect(stdout.toString()).to.equal('');
      expect(stderr.toString()).to.equal('');

      await assertImage(await fs.readFile(outfile), 'image/png', '0efc9a4c58d053fb42591acd83f8a5005ee2844555af29b5aba77a766b317935');
    });
  });

  describe('using stdin and stdout', () => {
    it('converts known image to jpeg', async () => {
      const infile = path.resolve(root, 'temp', '0002.heic');
      const inbuffer = await fs.readFile(infile);

      const { stdout, stderr, err } = await Promise.resolve().then(async () => {
        const proc = spawn(process.execPath, ['bin'], {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: root,
          windowsHide: true
        });

        const stdout = [];
        const stderr = [];

        proc.stdout.on('data', chunk => stdout.push(chunk));
        proc.stderr.on('data', chunk => stderr.push(chunk));

        proc.stdin.end(inbuffer);

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

      await fs.writeFile('./result.jpg', stdout);

      expect(err).to.have.property('code', 0);
      expect(stderr.toString()).to.equal('');
      await assertImage(stdout, 'image/jpeg', 'f7f1ae16c3fbf035d1b71b1995230305125236d0c9f0513c905ab1cb39fc68e9');
    });

    it('converts known image to png', async () => {
      const infile = path.resolve(root, 'temp', '0002.heic');
      const inbuffer = await fs.readFile(infile);

      const { stdout, stderr, err } = await Promise.resolve().then(async () => {
        const proc = spawn(process.execPath, ['bin', '-f', 'PNG'], {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: root,
          windowsHide: true
        });

        const stdout = [];
        const stderr = [];

        proc.stdout.on('data', chunk => stdout.push(chunk));
        proc.stderr.on('data', chunk => stderr.push(chunk));

        proc.stdin.end(inbuffer);

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

      await fs.writeFile('./result.jpg', stdout);

      expect(err).to.have.property('code', 0);
      expect(stderr.toString()).to.equal('');
      await assertImage(stdout, 'image/png', '0efc9a4c58d053fb42591acd83f8a5005ee2844555af29b5aba77a766b317935');
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
        .and.to.include('Argument: format, Given: "pineapples", Choices: "jpg", "png"');
    });

    it('errors for input data that is not a heic image', async () => {
      const infile = path.resolve(root, 'temp', '0001.jpg');
      const outfile = files.get({ extension: 'jpg' });

      const { stdout, stderr, err } = await exec(['--input', `"${infile}"`, '--output', `"${outfile}"`]);

      expect(err).to.have.property('code', 1);
      expect(stdout.toString()).to.equal('');
      expect(stderr.toString()).to.include('TypeError: input buffer is not a HEIC image');
    });
  });
});
