#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import reset from "./src/git-reset.js";
import run from "./src/index.js";
import { info } from "./src/log.js";

yargs(hideBin(process.argv))
  .command(
    "reset",
    "resets the git workspace -- useful in case of error and you need to re-run" +
      " the migrator. Each step is not idempotent, so resetting continuing after" +
      " an error is not always possible. This runs `git clean -f -d; git checkout .",
    () => {},
    async () => {
      info(`Resetting git repo to clean state...`);

      await reset();

      info("Done! ✨");
    }
  )
  .command(
    ["run", "$0 [addon-location]"],
    "the default command -- runs the addon migrator.",
    (yargs) => {
      yargs.option("addon-location", {
        describe:
          "the folder to place the addon package. defaults to the package name.",
        type: "string",
      });
      yargs.option("test-app-location", {
        describe: "the folder to place the test-app package.",
        type: "string",
        default: "test-app",
      });
      yargs.option("test-app-name", {
        describe: "the name of the test-app package.",
        type: "string",
        default: "test-app",
      });
      yargs.option("directory", {
        describe:
          "the directory to run the migration in. defaults to the current directory",
        type: "string",
        default: process.cwd(),
      });
      yargs.option("analysis-only", {
        describe: "inspect the analysis object, skipping migration entirely",
        type: "boolean",
        default: false,
      });
    },
    (args) => {
      return run(args);
    }
  )
  .help().argv;
