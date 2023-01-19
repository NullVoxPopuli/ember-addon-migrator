import { execa } from 'execa';

export default async function reset() {
  await execa('git', ['clean', '-f', '-d']);
  await execa('git', ['checkout', '.']);

  // When things get weird? unsure if this is needed still
  // let { stdout: status } = await execa('git', ['status']);

  // /**
  //  * Is there a way to do this for non-English git?
  //  */
  // if (status.includes('Untracked files')) {
  //   await execa('git', ['add', '.']);
  //   await execa('git', ['reset', '--hard', 'HEAD']);
  // }
}
