import { pathGet } from "akanjs/common";

export interface Dictionary {
  [key: string]: {
    [key: string]: unknown;
  };
}
export interface AllDictionary {
  [key: string]: Dictionary;
}

export class Translator {
  static #langDictionaryMap = new Map<string, Dictionary>();
  constructor(dictionary: Record<string, Record<string, Record<string, unknown>>>) {
    Object.entries(dictionary).forEach(([lang, dictionary]) => {
      this.#setDictionary(lang, dictionary);
    });
  }
  hasDictionary(lang: string) {
    return Translator.#langDictionaryMap.has(lang);
  }
  #setDictionary(lang: string, dict: Dictionary) {
    const existingDictionary = Translator.#langDictionaryMap.get(lang);
    const dictionary = existingDictionary ?? {};
    Object.entries(dict).forEach(([key, modelDict]) => {
      if (dictionary[key]) Object.assign(dictionary[key], modelDict);
      else dictionary[key] = modelDict;
    });
    Translator.#langDictionaryMap.set(lang, dictionary);
    return dictionary;
  }
  translate(lang: string, key: string, param?: Record<string, string | number>): string {
    const dictionary = Translator.#langDictionaryMap.get(lang);
    if (!dictionary) return key;
    const msg = (pathGet(key, dictionary, ".", { t: key }) as { t: string }).t;
    return param ? msg.replace(/{([^}]+)}/g, (_, key: string) => param[key] as string) : msg;
  }
  async getDictionary(lang: string) {
    const dictionary = Translator.#langDictionaryMap.get(lang);
    if (!dictionary) throw new Error(`Dictionary for language ${lang} not found`);
    return dictionary;
  }
}
