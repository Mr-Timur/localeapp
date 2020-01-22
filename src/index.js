import watch from 'node-watch';
import {init, pull, push, update} from './actions';

/**
 * @description Wrapper entry point.
 * @param command
 * @param rootFolder
 * @param targetPath
 * @param option
 * @param extra
 * @returns {*}
 */
export default function localeapp(command, rootFolder, targetPath, options, extra) {
  const { pushDefault, watchFiles, raw } = extra;
  if (command === 'init') {
    init(options.key);
  }
  else if (command === 'update') {
    if (watchFiles) {
      console.log('Louki watching for changes in root folder...');
      update(rootFolder, targetPath, options); // run once
      watch(rootFolder, { recursive: true, filter: /\.(json|yml)$/ }, (evt, fileName) => {
        console.log(evt, fileName.replace(rootFolder, ''));
        return update(rootFolder, targetPath, options);
      });
    }
    else {
      return update(rootFolder, targetPath, options);
    }
  }  else if (command === 'push') {
    return push(rootFolder, targetPath, options, pushDefault, raw);
  }  else if (command === 'pull') {
    return pull(rootFolder, targetPath, options, raw);
  }  else {
    console.error('Command not found');
  }
}
