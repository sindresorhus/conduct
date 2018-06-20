import fs from 'fs';
import path from 'path';
import globby from 'globby';
import test from 'ava';
import execa from 'execa';
import tempy from 'tempy';

const bin = path.join(__dirname, 'cli.js');
const fixture = fs.readFileSync(path.join(__dirname, 'fixtures/code-of-conduct.md'), 'utf8');

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

test('readme filename', async t => {
	const cwd = tempy.directory();
	const filepath = path.join(cwd, 'readme.md');
	fs.writeFileSync(filepath);
	await execa(bin, {cwd});
	const generatedFile = globby.sync(path.join(cwd, 'code-of-conduct.md'))[0];
	t.is(path.parse(generatedFile).base, 'code-of-conduct.md');
});

test('README filename', async t => {
	const cwd = tempy.directory();
	const filepath = path.join(cwd, 'README.md');
	fs.writeFileSync(filepath);
	await execa(bin, {cwd});
	const generatedFile = globby.sync(path.join(cwd, 'CODE-OF-CONDUCT.md'))[0];
	t.is(path.parse(generatedFile).base, 'CODE-OF-CONDUCT.md');
});

test('filename --uppercase', async t => {
	const cwd = tempy.directory();
	await execa(bin, ['--uppercase'], {cwd});
	const generatedFile = globby.sync(path.join(cwd, 'CODE-OF-CONDUCT.md'))[0];
	t.is(path.parse(generatedFile).base, 'CODE-OF-CONDUCT.md');
});
