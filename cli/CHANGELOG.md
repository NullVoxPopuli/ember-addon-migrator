# ember-addon-migrator

## 2.2.1

### Patch Changes

- [#74](https://github.com/NullVoxPopuli/ember-addon-migrator/pull/74) [`7cf1d8d`](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/7cf1d8d88fecbb0283d53a7d6f210108758bc90d) Thanks [@simonihmig](https://github.com/simonihmig)! - Fix references and repo-relative paths in addon's package.json and tsconfig.json after moving.

  Closes: #65, #66, #71

## 2.2.0

### Minor Changes

- [#72](https://github.com/NullVoxPopuli/ember-addon-migrator/pull/72) [`f60862c`](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/f60862c18f1d8ee277cc7fc7280d9780772cbb84) Thanks [@simonihmig](https://github.com/simonihmig)! - Two new flags for managing dependencies:

  - `--reuse-existing-versions`
    When the test-app is generated, instead of using the (latest) dependency versions of the app blueprint it will try to use the same versions previously used in the addon.

  - `--ignore-new-dependencies`
    When the test-app is generated, any dependencies that are part of the default app blueprint which were not used before will be ignored. WARNING: there is a considerable risk that this leaves your dependencies in a broken state, use it only with great caution!

  These two flags are available for both the default command (run), and extract-tests.
  See `--help` for more information.

## 2.1.1

### Patch Changes

- [#60](https://github.com/NullVoxPopuli/ember-addon-migrator/pull/60) [`fee23d2`](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/fee23d2868388b8a560bfb43ba3af46f914e8039) Thanks [@nicolechung](https://github.com/nicolechung)! - Fix typo in default package directory name when --addon-location is omitted

## 2.1.0

### Minor Changes

- [#57](https://github.com/NullVoxPopuli/ember-addon-migrator/pull/57) [`4e5a5c1`](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/4e5a5c1e8c914c084df40ec189f1b7e37e8ae7c5) Thanks [@NullVoxPopuli](https://github.com/NullVoxPopuli)! - New command: make-monorepo -- for doing a 3-phase open source v1 -> v2 addon conversion

## 2.0.3

### Patch Changes

- [#51](https://github.com/NullVoxPopuli/ember-addon-migrator/pull/51) [`dc300c9`](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/dc300c9017e995e36931245cbbdc7c4c9481a9e9) Thanks [@NullVoxPopuli](https://github.com/NullVoxPopuli)! - extract-tests forgot to move tests from the addon over to the new test-app

## 2.0.2

### Patch Changes

- [#52](https://github.com/NullVoxPopuli/ember-addon-migrator/pull/52) [`f395f77`](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/f395f77f8b692935160b76b60386a0dbe98b0694) Thanks [@simonihmig](https://github.com/simonihmig)! - Fix an issue where an addon has a scoped package name, ember-cli will turn the package name into a dasherized version of it as the addon location, which then would not match the location we were expecting. This happened when generating the temporary addon that files get pulled from for migration / merging with the existing addon.

## 2.0.1

### Patch Changes

- [`99b1193`](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/99b1193e131ed125554ae38f3f618b33f360d7f2) Thanks [@NullVoxPopuli](https://github.com/NullVoxPopuli)! - Use ember-cli range rather than 4.10.0-beta

## 2.0.0

### Major Changes

- [#37](https://github.com/NullVoxPopuli/ember-addon-migrator/pull/37) [`fa4c0c8`](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/fa4c0c8c3ef8da301308e57b27fd1705111f1744) Thanks [@NullVoxPopuli](https://github.com/NullVoxPopuli)! - Support running the migrator in existing monorepos, at any depth.

  Additionally, support for

  - npm, yarn, pnpm
  - typescript

  (because the migration is now powered by the v2 addon blueprint)

  Details:

  - analyzes imports to more correctly move dependencies from the old package.json to the new locations

- [`73797d1`](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/73797d1c1b7a113bf4b9896d8941e33a6409b641) Thanks [@NullVoxPopuli](https://github.com/NullVoxPopuli)! - Remove capture-addon behavior

### Minor Changes

- [#46](https://github.com/NullVoxPopuli/ember-addon-migrator/pull/46) [`6fb3134`](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/6fb313487e90dc29acd028c9de37a149014bebc5) Thanks [@NullVoxPopuli](https://github.com/NullVoxPopuli)! - make the reset command also delete the node_modules directory

- [#47](https://github.com/NullVoxPopuli/ember-addon-migrator/pull/47) [`1fded2d`](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/1fded2d2bc008e671551824c98c43ab47e7e5321) Thanks [@NullVoxPopuli](https://github.com/NullVoxPopuli)! - Add new command, `extract-tests`, so that v2 addon migration can happen in phases

## [1.7.1](https://github.com/NullVoxPopuli/ember-addon-migrator/compare/v1.7.0...v1.7.1) (2022-03-09)

### Bug Fixes

- **addon:** move addon-test-support folder ([3dba20f](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/3dba20faaeb531b2ee7edc9d92f13c6bca1e254c))
- remove ember-welcome-page ([7756587](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/775658792d79f412668e1ae89b2e2fb48d372633))
- remove ember-welcome-page ([ffef0fd](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/ffef0fdb7922a9000be0f3f75731d63b0723a3ea))
- **rollup:** add services to default re-exports ([4f17080](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/4f170809cc973f82cd21ae729e1c01c2d8300dd8))

# [1.7.0](https://github.com/NullVoxPopuli/ember-addon-migrator/compare/v1.6.0...v1.7.0) (2022-03-09)

### Features

- improve asserts in package.json level ([5a7feae](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/5a7feaedd9c5e0d9b41c64645d475a0669db30e1))

# [1.6.0](https://github.com/NullVoxPopuli/ember-addon-migrator/compare/v1.5.0...v1.6.0) (2022-02-24)

### Features

- migrate dependencies to v2 addon ([4d59c1c](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/4d59c1c64dd2f3266fd85e663e7c0c47e00b0c58))
- transfer devDeps to test app ([3a4bbc7](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/3a4bbc775a592f387ef729e2549d510accec8e36))

# [1.5.0](https://github.com/NullVoxPopuli/ember-addon-migrator/compare/v1.4.0...v1.5.0) (2022-02-21)

### Features

- fast verify without actual npm install ([5e0c79a](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/5e0c79aa5516b80ca37f87f1049626e345fb7ad4))

# [1.4.0](https://github.com/NullVoxPopuli/ember-addon-migrator/compare/v1.3.0...v1.4.0) (2022-02-21)

### Features

- fast verify for snapshoted addons ([1c9c5c0](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/1c9c5c0cf6db0ff6bcccfe8f0123aaef7e95e69f))

# [1.3.0](https://github.com/NullVoxPopuli/ember-addon-migrator/compare/v1.2.1...v1.3.0) (2022-02-20)

### Features

- addons serialization / capture logic ([8d505f6](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/8d505f634a7b2ab2d5be80c2fdbcc7e95be63225))

## [1.2.1](https://github.com/NullVoxPopuli/ember-addon-migrator/compare/v1.2.0...v1.2.1) (2022-02-15)

### Bug Fixes

- **ts:** ensure that types is specified in package.json ([05eb990](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/05eb9905199e65f469351e53ab1205c2d0b665c5))

# [1.2.0](https://github.com/NullVoxPopuli/ember-addon-migrator/compare/v1.1.4...v1.2.0) (2022-02-14)

### Bug Fixes

- **rollup:** use generalized rollup config ([bca2fc4](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/bca2fc463af484697473122c5b1a68277ebaff33))

### Features

- **tests:** ensure that basic transformation works predictably ([387a825](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/387a82512a336610144c7ad7729ecba6bd9a2105))

## [1.1.4](https://github.com/NullVoxPopuli/ember-addon-migrator/compare/v1.1.3...v1.1.4) (2022-02-12)

### Bug Fixes

- **js/ts:** \_\_dirname was erroring ([395dd84](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/395dd846d6d0afad1614c702ea91918988703cbb))

## [1.1.3](https://github.com/NullVoxPopuli/ember-addon-migrator/compare/v1.1.2...v1.1.3) (2022-02-12)

### Bug Fixes

- ignore node_modules, clarify rollup customization needed ([2399cd8](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/2399cd8a01a4ab1e3d05c0924bf78d4aa3722f82))

## [1.1.2](https://github.com/NullVoxPopuli/ember-addon-migrator/compare/v1.1.1...v1.1.2) (2022-02-12)

### Bug Fixes

- add gitignore files for the generated addon directory ([ffe8ea5](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/ffe8ea5ebdc2dcb80fb2ce22961192ac7f3728e4))
- **deps:** resolve incorrect TS detection ([6e7461c](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/6e7461cc2043660e6a832fc2c69df9231734a450))
- **ts:** ensure a tsconfig.json is generated ([73c5390](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/73c53902bbb1aeae91684ed5c17cd9a7f43a8197))

## [1.1.1](https://github.com/NullVoxPopuli/ember-addon-migrator/compare/v1.1.0...v1.1.1) (2022-02-12)

### Bug Fixes

- **addon:** write new package.json to addon directory ([cbdf7bd](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/cbdf7bd9aec2a2eeea755046915f7b963c019555))

# [1.1.0](https://github.com/NullVoxPopuli/ember-addon-migrator/compare/v1.0.0...v1.1.0) (2022-02-12)

### Features

- **messaging:** better formatted errors and such ([3d07e0c](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/3d07e0c5f305cbf60fc69684d8108f7a7fa5c2a7))

# 1.0.0 (2022-02-12)

### Bug Fixes

- **internal:** automated release ([a740a15](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/a740a1506d79e6d5dc108c11bb872f1a70a63ed3))

### Features

- initial implementation ([ba6f6d6](https://github.com/NullVoxPopuli/ember-addon-migrator/commit/ba6f6d6bc1f181b491b7eac463c9a8dedc2d99bb))

### BREAKING CHANGES

- initial implementation

# @ember-apply/embroider-v1.0.0 (2022-01-23)

### Features

- new applyable for adding embroider to classic apps ([c2c6191](https://github.com/NullVoxPopuli/ember-apply/commit/c2c6191d9148d2c3694f0a84d61078f7fb9b36da))

### BREAKING CHANGES

- initial release
