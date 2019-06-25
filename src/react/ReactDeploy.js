// Imports
const Log = require('../utils/Log');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const GitPush = require('../git/GitPush');
const GAEDeploy = require('../gcp/GAEDeploy');
const S3BundleUpload = require('../aws/s3/S3BundleUpload');
const Config = require('../config/Config');
const Files = require('../utils/Files');
const EBDeploy = require('../aws/eb/EBDeploy');

exports.handler = async (version, platform) => {

	// Check that the platform is valid
	if (platform !== 'eb' && platform !== 'gae') {
		throw 'Invalid platform';
	}

	// Run tests
	await runTests();

	// Run production build
	await runProductionBuild();

	// Update index.html
	await updateIndexHTML();

	// Push to github
	await GitPush.handler(version);

	if (platform === 'gae') {

		// Deploy to gae
		await GAEDeploy.handler(version);

	} else if (platform === 'eb') {

		// Deploy to eb
		await EBDeploy.handler(version, false);

	}

	// Upload bundle to s3
	await S3BundleUpload.handler(true);

};

// Update index.html
async function updateIndexHTML() {

	// Check active s3 config
	await Config.checkActiveConfig('s3');

	// Get the active s3 config
	let config = await Config.getActive('s3');

	// Log updating
	Log.spaced('Updating index.html...', 'info');

	// Update
	await Files.replaceContents('./index.html', './build/index.js', `https://${config.bucket}.s3.${config.region}.amazonaws.com/index.js.gz`);

	// Log success
	Log.standard('Updated index.html', 'success');

}

// Run tests
async function runTests() {

	// Log running npm tests
	Log.spaced('Running npm tests...', 'info');

	// Run tests
	const { stdout, stderr } = await exec('npm run test');

	// Log results
	Log.standard(stderr, 'notice');

}

// Run production build
async function runProductionBuild() {

	// Log running production build
	Log.spaced('Running production build...', 'info');

	// Build
	const { stdout, stderr } = await exec('npm run build:prod');

	// Check for errors
	if (stderr.includes('Exit status')) {
		Log.standard('Error running production build', 'error');
		throw stderr;
	} else {
		Log.standard('Production build completed', 'success');
	}

}
