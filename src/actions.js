import fs from 'fs';
import {
  getConfigPath,
  getProjectName,
  localeappPush,
  localeappPull,
  ymlToJson,
  jsonToYml,
  toFolders,
  fromFolders,
  createFile,
  localeReplacer,
} from './utils';

function deleteFolderRecursive(path) {
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file,index){
      const curPath = path + "/" + file
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath)
      } else { // delete file
        fs.unlinkSync(curPath)
      }
    });
    fs.rmdirSync(path)
  }
}

/**
 * @description Initialize from key.
 * @param key
 */
export function init(key) {
  const configPath = getConfigPath(true);
  const projectName = getProjectName();
  let existingKeys = {};
  try {
    existingKeys = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  catch (e) {
    console.log('No previous keys');
  }

  const combined = { ...existingKeys, [projectName]: key };
  fs.open(configPath, 'w', (err, fd) => {
    if (err) {
      fs.writeFile(configPath, '', (err) => {
        if(err) throw err;
        writeConfig(fd, combined);
      });
    }
    else {
      writeConfig(fd, combined);
    }
  });
}

/**
 * @description Writes key.
 * @param fd
 * @param keys
 */
function writeConfig(fd, keys) {
  fs.write(fd, JSON.stringify(keys), (err, written) => {
    if (err) {
      console.error('Could not save key');
      throw err;
    }
    console.log('Successfully saved localeapp key');
  });
}

/**
 * @description Pull translations.
 * @param rootFolder
 * @param targetPath
 * @param locale
 * @param raw
 * @returns {Promise<any | never | void>}
 */
export function pull(rootFolder, targetPath, options, raw=false) {
  try {
    const configPath = getConfigPath();
    const projectName = getProjectName();
    const localeappKey = JSON.parse(fs.readFileSync(configPath, 'utf8'))[projectName];

    deleteFolderRecursive(rootFolder)
    fs.mkdirSync(rootFolder)

    return localeappPull(localeappKey)
      .then(({ response, body }) => {
        const localesArray = ymlToJson(body);
        console.log(`Successfully pulled locales ${Object.keys(localesArray).join(', ')} from Localeapp`);
        Object.entries(localesArray).map((l) => {
          const ymlLocale = jsonToYml({ [l[0]]: l[1] });
          createFile(targetPath, l[0], ymlLocale);
        });

        if (raw) return {};

        Object.keys(localesArray).map((locale) => {
          let tmpTargetPath = targetPath

          localeReplacer.map((item) => tmpTargetPath = tmpTargetPath.replace(item, locale))

          const localeYmlPath = `${tmpTargetPath}/${locale}.yml`
          const indexYmlPath = `${tmpTargetPath}/index.yml`

          const compiledLocale = fs.readFileSync(localeYmlPath, 'utf8');
          const updatedFolders = toFolders(tmpTargetPath, compiledLocale, locale, options);
          console.log(locale, 'folder updated');

          if (fs.existsSync(localeYmlPath)) fs.unlinkSync(localeYmlPath);
          if (fs.existsSync(indexYmlPath)) fs.unlinkSync(indexYmlPath);

          return updatedFolders
        })
      })
      .catch((err) => {
        deleteFolderRecursive(rootFolder)
        return console.error(err)
      })
  }
  catch (err) {
    console.error('No localeapp project key found! Please specify one with the init command');
  }
}

/**
 * @description Push translations.
 * @param rootFolder
 * @param targetPath
 * @param locale
 * @param pushDefault
 * @param raw
 * @returns {Promise<any | never | void>}
 */
export function push(rootFolder, targetPath, locale, pushDefault, raw=false) {
  if (pushDefault && !raw) update(rootFolder, targetPath, locale); // only build if default locale is pushed

  try {
    const localeappKey = JSON.parse(fs.readFileSync(getConfigPath(), 'utf8'))[getProjectName()];
    localeReplacer.map((item) => targetPath = targetPath.replace(item, locale));
    const filePath = `${targetPath}/${locale}.yml`;
    const data = fs.createReadStream(filePath);
    return localeappPush(localeappKey, data)
      .then(() => console.log(`Successfully pushed ${locale}.yml to Localeapp`))
      .catch((err) => console.error(err));
  }
  catch (err) {
    console.log('No localeapp project key found! Please specify one with the init command');
  }
}

/**
 * @description Update translations.
 * @param rootFolder
 * @param targetPath
 * @param locale
 * @returns {*}
 */
export function update(rootFolder, targetPath, locale) {
  const finalTranslation = fromFolders(rootFolder, locale);
  try {
    fs.writeFileSync(`${targetPath}/${locale}.yml`, finalTranslation); // file type is hardcoded for now
    console.log(`Updated target file ${locale}.yml`);
  }
  catch (err) {
    console.error(err);
  }
  return finalTranslation;
}
