import { find, isEmpty, omit } from 'lodash';
import fs from 'fs';
import getSectionsTree from './get-sections-tree';
import { ymlToJson, jsonToYml } from './convert';

/**
 * @description Parse translation.
 * @param json
 * @param rootFolder
 */
function parseTranslation(json, rootFolder, options, acc = 0) {
  const final = {};
  if (!json || isEmpty(json)) {
    return final;
  }
  const newJson = {};

  for (const key in json) {
    const targetFolder = `${rootFolder}/${key}`

    if (acc < 1 && typeof json[key] === 'object') {
      if (options.routes && !options.routes.includes(key)) continue

      if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder)
      }

      // this we return
      Object.assign(final, {
        [key]: parseTranslation(json[key], targetFolder, options, acc + 1),
      })

      json = omit(json, key);   // deletes the folder key so that we are
    } else {
      fs.writeFileSync(`${targetFolder}.yml`, jsonToYml(removeNullValues(json[key]) || {}));
      json = omit(json, key);   // deletes the folder key so that we are
    }
  }

  // add new contents of the yml (not parsed)
  Object.assign(final, {
    index: json,
  })

  return final
}

export default function toFolders(rootFolder, target, locale, options) {
  const strippedTarget = ymlToJson(target)[locale];
  return parseTranslation(strippedTarget, rootFolder, options);
}

const removeNullValues = (object) => {
  if (!object || typeof object !== 'object') return object
  const newObject = {}

  Object.keys(object).forEach(key => {
    if (object[key] && typeof object[key] === 'object') {
      newObject[key] = removeNullValues(object[key])
    } else if (object[key] != null) {
      newObject[key] = object[key]
    }

    if (newObject[key] && typeof newObject[key] === 'object' && Object.keys(newObject[key]).length === 0) delete newObject[key]
  })

  return newObject
}
