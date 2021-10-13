#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import meow from 'meow';
import inquirer from 'inquirer';
import {globbySync} from 'globby';
import getEmails from 'get-emails';
import chalk from 'chalk';
import Conf from 'conf';
import execa from 'execa';
import logSymbols from 'log-symbols';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = new Conf({
	projectName: 'conduct',
	defaults: {
		language: 'en',
	},
});

let filename = 'code-of-conduct';
const extension = '.md';

const cli = meow(`
	Usage
	  $ conduct

	Example
	  $ conduct --language=de

	Options
	  --uppercase, -c   Use uppercase characters (e.g. CODE-OF-CONDUCT.md)
	  --underscore, -u  Use underscores instead of dashes (e.g. code_of_conduct.md)
	  --language, -l    The language of the Code of Conduct [Default: en]
	  --directory, -d   The output directory [Default: .]
`, {
	importMeta: import.meta,
	flags: {
		uppercase: {
			type: 'boolean',
			default: false,
			alias: 'c',
		},
		underscore: {
			type: 'boolean',
			default: false,
			alias: 'u',
		},
		language: {
			type: 'string',
			alias: 'l',
		},
		directory: {
			type: 'string',
			default: '.',
			alias: 'd',
		},
	},
});

function readmeIsUpperCase() {
	const results = globbySync('readme.*', {caseSensitiveMatch: false});
	if (results.length > 0) {
		const fileObject = path.parse(results[0]);
		return fileObject.name.toUpperCase() === fileObject.name;
	}

	return false;
}

const {flags} = cli;

if (flags.email) {
	config.set('email', flags.email);
}

if (flags.uppercase || readmeIsUpperCase()) {
	filename = filename.toUpperCase();
}

if (flags.underscore) {
	filename = filename.replace(/-/g, '_');
}

if (typeof flags.language === 'string') {
	const language = flags.language.toLowerCase();
	const availableLanguages = loadLanguages();

	if (!availableLanguages.has(language)) {
		console.error(`${logSymbols.error} Unsupported language '${language}' was provided. Conduct currently supports:\n\n${[...availableLanguages].sort().join(', ')}`);
		process.exit(1);
	}

	config.set('language', language);
}

const filePath = path.join(flags.directory, `${filename}${extension}`);

function loadLanguages() {
	const vendorFiles = fs.readdirSync(path.join(__dirname, 'vendor'));
	const languages = vendorFiles.map(file => file.match(/\.([a-z-]+)\.md/)[1]);
	return new Set(languages);
}

function findGitConfigEmail() {
	try {
		return execa.sync('git', ['config', 'user.email']).stdout.trim();
	} catch {}
}

async function findEmail(existingSrc) {
	// Always override with CLI flag
	if (cli.flags.email) {
		return cli.flags.email;
	}

	let email;

	// Load from existing Code of Conduct
	if (existingSrc) {
		const [existingEmail] = [...getEmails(existingSrc)];
		email = existingEmail;
	}

	// Check config
	if (!email) {
		email = config.get('email');
	}

	// Infer from Git
	if (!email) {
		email = findGitConfigEmail();
	}

	// Prompt user
	if (!email && process.stdout.isTTY) {
		const answers = await inquirer.prompt([{
			type: 'input',
			name: 'email',
			message: 'Couldn\'t infer your email. Please enter your email:',
			validate: x => x.includes('@'),
		}]);
		email = answers.email;
	}

	if (email) {
		config.set('email', email);
		return email;
	}

	console.error(`Run \`${chalk.cyan('conduct --email=your@email.com')}\` once to save your email.`);
	process.exit(1);
}

function write(filepath, email, fileToRemove) {
	const target = `vendor/code-of-conduct.${config.get('language')}.md`;
	const source = fs.readFileSync(path.join(__dirname, target), 'utf8');
	fs.mkdirSync(path.dirname(filepath), {recursive: true});
	fs.writeFileSync(filepath, source.replace('[INSERT EMAIL ADDRESS]', email));

	if (fileToRemove) {
		fs.unlinkSync(fileToRemove);
		console.log(`${logSymbols.warning} Deleted ${fileToRemove}`);
	}
}

function generate(filepath, email) {
	write(filepath, email);
	console.log(`${logSymbols.success} Added a Code of Conduct to your project ❤️\n\n${chalk.bold('Please carefully read this document and be ready to enforce it.')}\n\nAdd the following to your contributing.md or readme.md:\nPlease note that this project is released with a [Contributor Code of Conduct](${filepath}). By participating in this project you agree to abide by its terms.`);
}

async function init() {
	const directoryPathParts = process.platform === 'win32' ? flags.directory.split(path.sep) : [flags.directory];
	const results = globbySync([
		path.posix.join(...directoryPathParts, 'code_of_conduct.*'),
		path.posix.join(...directoryPathParts, '.github', 'code_of_conduct.*'),
		path.posix.join(...directoryPathParts, 'code-of-conduct.*'),
		path.posix.join(...directoryPathParts, '.github', 'code-of-conduct.*'),
	], {caseSensitiveMatch: false});

	// Update existing
	if (results.length > 0) {
		const [existing] = results;
		const existingSrc = fs.readFileSync(existing, 'utf8');
		const email = await findEmail(existingSrc);

		if (cli.flags.underscore || cli.flags.uppercase) {
			// If the existing file is different from the
			// intended file, pass it in for removal
			write(filePath, email, existing !== filePath && existing);
		} else {
			// Otherwise, just update the original
			write(existing, email);
		}

		console.log(`${logSymbols.success} Updated your Code of Conduct`);
		return;
	}

	// Generate new
	const email = await findEmail();
	generate(filePath, email);
}

init();
