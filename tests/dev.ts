#!/usr/bin/env ts-node
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable no-console */
/* eslint-disable n/shebang */

import { info } from "ember-addon-migrator/log.js";
import { execa } from "execa";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { addonFrom, adoptFixture, binPath, findFixtures } from "./helpers.js";

yargs(hideBin(process.argv))
  .command(
    ["list-fixtures"],
    "lists the known fixtures -- for use for splitting C.I.",
    () => {},
    async () => {
      let names = await findFixtures();

      let fixtures = names.map((name) => ({ name }));
      let output = JSON.stringify({ fixtures });

      console.log(output);
    }
  )
  .command(
    ["output [name]"],
    "outputs a fixture to a tmp directory",
    (yargs) => {
      return yargs.positional("name", {
        description: "the name of the fixture to copy",
      });
    },
    async (argv) => {
      info("Coping fixture to tmp directory");

      let project = await addonFrom(`${argv.name}`);

      console.info(project.rootPath);

      info("Done! ✨");
    }
  )
  .command(
    ["adopt [sourceLocation]"],
    "copies a directory to be a fixture",
    (yargs) => {
      return yargs.positional("sourceLocation", {
        description:
          "the source location of the fixture to copy. package.json is required",
      });
    },
    async (argv) => {
      info("Coping fixture to tmp directory");

      await adoptFixture(`${argv.location}`);

      info("Done! ✨");
    }
  )
  .command(
    ["migrate [fixtureName]"],
    "migrates a fixture within a tmp directory",
    (yargs) => {
      return yargs.positional("fixtureName", {
        description: "the name of the fixture to migrate",
      });
    },
    async (argv) => {
      info(`Migrating ${argv.fixtureName} within ${process.cwd()}`);

      let v1Project = await addonFrom(`${argv.fixtureName}`);

      console.info(`Output directory: ${v1Project.rootPath}`);

      await execa("node", [binPath], {
        cwd: v1Project.rootPath,
        stdio: "inherit",
      });
    }
  )
  .help()
  .demandCommand().argv;
