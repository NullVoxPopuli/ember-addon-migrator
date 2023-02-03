import { execa } from 'execa';
import Listr from 'listr';

export default async function reset() {
  let tasks = new Listr([
    {
      title: 'git clean -f -d',
      task: () => execa('git', ['clean', '-f', '-d']),
    },
    {
      title: 'git checkout .',
      task: () => execa('git', ['checkout', '.']),
    },
    {
      title: 'rm -rf node_modules/',
      task: () => execa('rm', ['-rf', 'node_modules']),
    },
  ]);

  await tasks.run();
}
