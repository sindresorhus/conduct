import fs from 'fs';
import path from 'path';
import test from 'ava';
import execa from 'execa';
import tempy from 'tempy';

const bin = path.join(__dirname, 'cli.js');
const fixture = fs.readFileSync(path.join(__dirname, 'fixtures/code-of-conduct.md'), 'utf8');

test.beforeEach(async () => {
	const cwd = tempy.directory();
	await execa(bin, ['--language=en'], {cwd});
});

test('generate', async t => {
	const cwd = tempy.directory();
	await execa(bin, ['--email=foo@bar.com'], {cwd});
	const src = fs.readFileSync(path.join(cwd, 'code-of-conduct.md'), 'utf8');
	t.true(src.includes('In the interest of fostering'));
	t.true(src.includes('foo@bar.com'));
});

test('update', async t => {
	const cwd = tempy.directory();
	const filepath = path.join(cwd, 'CODE_OF_CONDUCT.markdown');
	fs.writeFileSync(filepath, fixture);
	await execa(bin, {cwd});
	const src = fs.readFileSync(filepath, 'utf8');
	t.true(src.includes('In the interest of fostering'));
	t.true(src.includes('fixture@bar.com'));
});

test('default language', async t => {
	const cwd = tempy.directory();
	await execa(bin, {cwd});
	const src = fs.readFileSync(path.join(cwd, 'code-of-conduct.md'), 'utf8');
	t.true(src.includes('In the interest of fostering'));
});

test('set language', async t => {
	const cwd = tempy.directory();
	await execa(bin, ['--language=es'], {cwd});
	const src = fs.readFileSync(path.join(cwd, 'code-of-conduct.md'), 'utf8');
	t.true(src.includes('En el interés de fomentar'));
});

test('unsupported language', async t => {
	const cwd = tempy.directory();
	try {
		await execa(bin, ['--language=unicorn'], {cwd});
	} catch (err) {
		t.true(err.stderr.includes(`Unsupported language 'unicorn'`));
	}
});

test('update language', async t => {
	const cwd = tempy.directory();
	const filepath = path.join(cwd, 'CODE_OF_CONDUCT.markdown');
	fs.writeFileSync(filepath, fixture);
	await execa(bin, ['--language=es'], {cwd});
	const src = fs.readFileSync(filepath, 'utf8');
	t.true(src.includes('En el interés de fomentar'));
});
