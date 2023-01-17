#!/usr/bin/env ts-node
/* eslint-disable n/shebang */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { info } from '../src/log.js';
import { addonFrom, adoptFixture } from './helpers.js';

yargs(hideBin(process.argv))
.command(
    ['output [name]'],
    'outputs a fixture to a tmp directory',
    (yargs) => {
      return yargs.positional('name', {
        description: 'the name of the fixture to copy',
      });
    },
    async (argv) => {
      info('Coping fixture to tmp directory');

      let project = await addonFrom(`${argv.name}`);

      console.info(project.rootPath);

      info('Done! ✨');
    }
  ).command(
    ['adopt [sourceLocation]'], 
    'copies a directory to be a fixture', 
    (yargs) => {
      return yargs.positional('sourceLocation', {
        description: 'the source location of the fixture to copy. package.json is required'
      });
   }, async (argv) => {
      info('Coping fixture to tmp directory');

      await adoptFixture(`${argv.location}`); 

      info('Done! ✨');
  }).help().demandCommand().argv;
