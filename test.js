const fs = require('fs');
const path = require('path');
const globby = require('globby');
const test = require('ava');
const execa = require('execa');
const tempy = require('tempy');

const bin = path.join(__dirname, 'cli.js');
const fixture = fs.readFileSync(path.join(__dirname, 'fixtures/code-of-conduct.md'), 'utf8');
const expectedString = fixture.slice(0, 15);
const expectedStringES = 'Nosotros, como miembros, contribuyentes y administradores';

const setLanguage = (language, cwd) => {
	return execa(bin, [`--language=${language}`], {cwd});
};

const posixJoin = (cwd, file) => {
	const temporaryFileLocation = process.platform === 'win32' ? cwd.split(path.sep) : [cwd];
	return path.posix.join(...temporaryFileLocation, file);
};

// It's serial as it's affected by the `update` test:
// https://github.com/sindresorhus/conduct/pull/12/files#r209551337
test.serial('generate', async t => {
	const cwd = tempy.directory();
	await execa(bin, ['--email=foo@bar.com'], {cwd});
	const src = fs.readFileSync(path.join(cwd, 'code-of-conduct.md'), 'utf8');
	t.true(src.includes(expectedString));
	t.true(src.includes('foo@bar.com'));
});

test('update', async t => {
	const cwd = tempy.directory();
	const filepath = path.join(cwd, 'CODE_OF_CONDUCT.markdown');
	fs.writeFileSync(filepath, fixture);
	await execa(bin, {cwd});
	const src = fs.readFileSync(filepath, 'utf8');
	t.true(src.includes(expectedString));
	t.true(src.includes('fixture@bar.com'));
});

test('readme filename', async t => {
	const cwd = tempy.directory();
	const filepath = path.join(cwd, 'readme.md');
	fs.writeFileSync(filepath, '');
	await execa(bin, {cwd});
	const generatedFile = globby.sync(posixJoin(cwd, 'code-of-conduct.md'))[0];
	t.is(path.parse(generatedFile).base, 'code-of-conduct.md');
});

test('README filename', async t => {
	const cwd = tempy.directory();
	const filepath = path.join(cwd, 'README.md');
	fs.writeFileSync(filepath, '');
	await execa(bin, {cwd});
	const generatedFile = globby.sync(posixJoin(cwd, 'CODE-OF-CONDUCT.md'))[0];
	t.is(path.parse(generatedFile).base, 'CODE-OF-CONDUCT.md');
});

test('filename --uppercase', async t => {
	const cwd = tempy.directory();
	await execa(bin, ['--uppercase'], {cwd});
	const generatedFile = globby.sync(posixJoin(cwd, 'CODE-OF-CONDUCT.md'))[0];
	t.is(path.parse(generatedFile).base, 'CODE-OF-CONDUCT.md');
});

test.serial('set language', async t => {
	const cwd = tempy.directory();
	await setLanguage('es', cwd);
	const src = fs.readFileSync(posixJoin(cwd, 'code-of-conduct.md'), 'utf8');
	t.true(src.includes(expectedStringES));

	// Cleanup
	await setLanguage('en', cwd);
});

test.serial('unsupported language', async t => {
	const cwd = tempy.directory();
	await t.throwsAsync(setLanguage('unicorn', cwd), {message: /Unsupported language 'unicorn'/});
});

test.serial('update language', async t => {
	const cwd = tempy.directory();
	const filepath = path.join(cwd, 'CODE_OF_CONDUCT.markdown');
	fs.writeFileSync(filepath, fixture);
	await setLanguage('es', cwd);
	const src = fs.readFileSync(filepath, 'utf8');
	t.true(src.includes(expectedStringES));

	// Cleanup
	await setLanguage('en', cwd);
});

test.serial('generate with directory', async t => {
	const cwd = tempy.directory();
	fs.mkdirSync(path.join(cwd, 'test'));
	await execa(bin, ['--email=foo@bar.com', '--directory=test'], {cwd});
	const src = fs.readFileSync(path.join(cwd, 'test', 'code-of-conduct.md'), 'utf8');
	t.true(src.includes(expectedString));
	t.true(src.includes('foo@bar.com'));
});

test.serial('generate with directory (directory missing)', async t => {
	const cwd = tempy.directory();
	await execa(bin, ['--email=foo@bar.com', '--directory=test'], {cwd});
	const src = fs.readFileSync(path.join(cwd, 'test', 'code-of-conduct.md'), 'utf8');
	t.true(src.includes(expectedString));
	t.true(src.includes('foo@bar.com'));
});
