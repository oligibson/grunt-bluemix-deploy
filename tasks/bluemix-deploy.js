/*
 * grunt-bluemix-deploy
 * https://github.com/oligibson/grunt-bluemix-deploy
 *
 * Copyright (c) 2015 Oli Gibson
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function (grunt) {
  var fs = require('fs');
  var path = require('path');
  var shelljs = require('shelljs');

  grunt.registerMultiTask('bluemixdeploy', 'Automatic Bluemix Deployment with Grunt.', function() {

    var done = this.async();
    var gruntDir = shelljs.pwd();
    var remoteName = null;

    var options = this.options({
      branch: 'dist',
      dir: 'dist',
      remote: '../',
      manifest: true,
      org: '',
      space: '',
      message: 'Built %sourceName% and deploying to IBM Bluemix'
    });

    var tokens = {
      name:   '(unavailable)'
    };

    // Wraps shellJs calls that act on the file structure to give better Grunt
    // output and error handling
    // Args:
    // - command: the shell command
    // - verbose: show output on the cli, defaults to true
    function execWrap(command, verbose) {
      var shellResult = shelljs.exec(command, {silent: true});
      verbose = typeof verbose === 'undefined' ? true : verbose;

      if (shellResult.code === 0) {
        if (verbose) {
          grunt.log.write(shellResult.output);
        }
      }
      else {
        throw shellResult.output;
      }
    }

    // Check requirements
    function checkRequirements () {
      // Check that build directory exists
      if (!fs.existsSync(options.dir)) {
        throw('Build directory "' + options.dir + '" doesn\'t exist. Nothing to version.');
      }

      // Check that build directory conteins files
      if (fs.readdirSync(options.dir).length === 0) {
        throw('Build directory "' + options.dir + '" is empty. Nothing to version.');
      }

      // If connectCommits is true check that the main project's working
      // directory is clean
      if (options.connectCommits && shelljs.exec('git diff', {silent: true}).output !== '') {
        throw ('There are uncommitted changes in your working directory. \n' +
          'Please commit changes to the main project before you commit to \n' +
          'the built code.\n');
      }
    }

    // Assign %token% values if available
    function assignTokens () {
      if (shelljs.test('-f', 'package.json', {silent: true})) {
        tokens.name = JSON.parse(fs.readFileSync('package.json', 'utf8')).name;
      }
      else {
        tokens.name = process.cwd().split('/').pop();
      }
    }

    // 
    function setTarget () {
      if (options.org != '' && options.space != '') {
        grunt.log.subhead('Setting IBM Bluemix deployment target to ' + options.org + ' org and ' + options.space + ' space.');

        execWrap('cf target -o "'+ options.org +'" -s "'+ options.space +'"');
      }
    }

    // 
    function bluemixPush () {
      grunt.log.subhead('Pushing ' + target.name + ' to bluemix');

      execWrap('cf push');
    }

    // Run task
    try {

      // Prepare
      //checkRequirements();
      assignTokens();

      // Change working directory
      shelljs.cd(options.dir);

      // Set up repository
      setTarget();
      
      if (options.manifest) {
        bluemixPush();
      }
    }
    catch (e) {
      grunt.fail.warn(e);
      done(false);
    }
    finally {
      // Revert working directory
      shelljs.cd(gruntDir);
      done(true);
    }
  });
};
