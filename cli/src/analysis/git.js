import { execa } from "execa";

export async function findRoot() {
  let { stdout } = await execa("git", ["rev-parse", "--show-toplevel"]);

  return stdout;
}
