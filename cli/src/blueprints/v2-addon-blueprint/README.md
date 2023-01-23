# Why is this here?

At the time of writing, the `--typescript` flag is not stable in the ember ecosystem.
This copy-of-the-blueprint gets around the issue by copying the addon-blueprint, and fixing
the known problems.

Known problems:
 - Glint types are not valid by default:
    ```
    [!] (plugin Typescript) TS2688: Cannot find type definition file for 'ember__test-helpers'.
      The file is in the program because:
            Entry point for implicit type library 'ember__test-helpers'
    ```
 - `perpare` script fails due to the above, causing ember-cli to delete the whole project
