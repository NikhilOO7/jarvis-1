// Imports
const Log = require('../utils/Log');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const GitPush = require('../git/GitPush');
const GAEDeploy = require('../gcp/GAEDeploy');
const S3BundleUpload = require('../aws/s3/S3BundleUpload');

exports.handler = async (version) => {

	// Run tests
	await runTests();

	// Run production build
	await runProductionBuild();

	// Push to github
	await GitPush.handler(version);

	// Deploy to gae
	await GAEDeploy.handler(version);

	// Upload bundle to s3
	await S3BundleUpload.handler();

};

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