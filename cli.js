#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const meow = require('meow');
const inquirer = require('inquirer');
const globby = require('globby');
const getEmails = require('get-emails');
const chalk = require('chalk');
const Conf = require('conf');
const execa = require('execa');
const logSymbols = require('log-symbols');

const config = new Conf();

let filename = 'code-of-conduct';
const extension = '.md';

const cli = meow(`
	Usage
	  $ conduct

	Options
	  --uppercase, -c   Use uppercase characters in the filename
	  --underscore, -u  Use underscores instead of dashes in the filename
`, {
	alias: {
		c: 'uppercase',
		u: 'underscore'
	}
});

if (cli.flags.email) {
	config.set('email', cli.flags.email);
}

if (cli.flags.uppercase) {
	filename = filename.toUpperCase();
}

if (cli.flags.underscore) {
	filename = filename.replace(/-/g, '_');
}

const filepath = `${filename}${extension}`;

function findEmail() {
	let email;
	try {
		email = execa.sync('git', ['config', 'user.email']).stdout.trim();
	} catch (err) {}

	return email;
}

function write(filepath, email, fileToRemove) {
	const src = fs.readFileSync(path.join(__dirname, 'vendor/code_of_conduct.md'), 'utf8');
	fs.writeFileSync(filepath, src.replace('[INSERT EMAIL ADDRESS]', email));

	if (fileToRemove) {
		fs.unlinkSync(fileToRemove);
		console.log(`${logSymbols.warning} Deleted ${fileToRemove}`);
	}
}

function generate(filepath, email) {
	write(filepath, email);
	console.log(`${logSymbols.success} Added a Code of Conduct to your project ❤️\n\n${chalk.bold('Please carefully read this document and be ready to enforce it.')}\n\nAdd the following to your contributing.md or readme.md:\nPlease note that this project is released with a [Contributor Code of Conduct](${filepath}). By participating in this project you agree to abide by its terms.`);
}

function init() {
	const results = globby.sync([
		'code_of_conduct.*',
		'code-of-conduct.*',
		'CODE_OF_CONDUCT.*',
		'CODE-OF-CONDUCT.*',
		'.github/code_of_conduct.*',
		'.github/code-of-conduct.*',
		'.github/CODE_OF_CONDUCT.*',
		'.github/CODE-OF-CONDUCT.*'
	], {nocase: false});

	// Update existing
	if (results.length > 0) {
		const existing = results[0];
		const existingSrc = fs.readFileSync(existing, 'utf8');
		const email = Array.from(getEmails(existingSrc))[0];

		if (cli.flags.underscore || cli.flags.uppercase) {
			// If the existing file is different from the
			// intended file, pass it in for removal
			write(filepath, cli.flags.email || email, ((existing !== filepath) && existing) || null);
		} else {
			// Otherwise, just update the original
			write(existing, cli.flags.email || email);
		}

		console.log(`${logSymbols.success} Updated your Code of Conduct`);
		return;
	}

	if (config.has('email')) {
		generate(filepath, config.get('email'));
		return;
	}

	const email = findEmail();
	if (email) {
		config.set('email', email);
		generate(filepath, email);
		return;
	}

	if (process.stdout.isTTY) {
		inquirer.prompt([{
			type: 'input',
			name: 'email',
			message: `Couldn't infer your email. Please enter your email:`,
			validate: x => x.includes('@')
		}]).then(answers => {
			generate(filepath, answers.email);
		});
	} else {
		console.error(`Run \`${chalk.cyan('conduct --email=your@email.com')}\` once to save your email.`);
		process.exit(1);
	}
}

init();
