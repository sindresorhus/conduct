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

const config = new Conf({
	defaults: {
		language: 'en'
	}
});

const cli = meow(`
	Usage
	  $ conduct
`);

if (cli.flags.email) {
	config.set('email', cli.flags.email);
}

if (typeof cli.flags.language === 'string') {
	const language = cli.flags.language.toLowerCase();
	const availableLanguages = loadLanguages();

	if (!availableLanguages.has(language)) {
		console.error(`${logSymbols.error} Unsupported language '${language}' was provided. Conduct currently supports:\n\n${Array.from(availableLanguages).sort().join(', ')}`);
		process.exit(1);
	}

	config.set('language', language);
}

function loadLanguages() {
	const files = fs.readdirSync(path.join(__dirname, '/vendor'));
	const languages = files.map(file => file.match(/\.([a-z-]+)\.md/)[1]);
	return new Set(languages);
}

function findEmail() {
	let email;
	try {
		email = execa.sync('git', ['config', 'user.email']).stdout.trim();
	} catch (err) {}

	return email;
}

function write(filepath, email) {
	const target = `vendor/code-of-conduct.${config.get('language')}.md`;
	const src = fs.readFileSync(path.join(__dirname, target), 'utf8');
	fs.writeFileSync(filepath, src.replace('[INSERT EMAIL ADDRESS]', email));
}

function generate(filepath, email) {
	write(filepath, email);
	console.log(`${logSymbols.success} Added a Code of Conduct to your project ❤️\n\n${chalk.bold('Please carefully read this document and be ready to enforce it.')}\n\nAdd the following to your contributing.md or readme.md:\nPlease note that this project is released with a [Contributor Code of Conduct](${filepath}). By participating in this project you agree to abide by its terms.`);
}

function init() {
	const results = globby.sync([
		'code_of_conduct.*',
		'code-of-conduct.*',
		'.github/code_of_conduct.*',
		'.github/code-of-conduct.*'
	], {nocase: true});

	// Update existing
	if (results.length > 0) {
		const filepath = results[0];
		const existingSrc = fs.readFileSync(filepath, 'utf8');
		const email = Array.from(getEmails(existingSrc))[0];
		write(filepath, cli.flags.email || email);
		console.log(`${logSymbols.success} Updated your Code of Conduct`);
		return;
	}

	const filepath = 'code-of-conduct.md';

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
