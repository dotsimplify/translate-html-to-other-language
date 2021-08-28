/*
Github : https://github.com/dotsimplify
*/

class Translator {
  constructor(options = {}) {
    this.config = Object.assign({}, this.defaultConfig, options);
    this.elements = document.querySelectorAll("[data-translate]");
    this.cache = new Map();

    if (this.config.detectLanguage) {
      this.config.defaultLanguage = this.detect_language();
    }

    if (
      this.config.defaultLanguage &&
      typeof this.config.defaultLanguage == "string"
    ) {
      this.get_resource(this.config.defaultLanguage);
    }
  }

  detect_language() {
    let stored = localStorage.getItem("language");

    if (this.config.persist && stored) {
      return stored;
    }

    let lang = navigator.languages
      ? navigator.languages[0]
      : navigator.language;

    return lang.substr(0, 2);
  }

  _fetch(path) {
    return fetch(path)
      .then((response) => response.json())
      .catch(() => {
        console.error(
          `Could not load ${path}. Please make sure that the file exists.`
        );
      });
  }

  async get_resource(lang) {
    if (this.cache.has(lang)) {
      return JSON.parse(this.cache.get(lang));
    }

    let translation = await this._fetch(
      `${this.config.filesLocation}/${lang}.json`
    );

    if (!this.cache.has(lang)) {
      this.cache.set(lang, JSON.stringify(translation));
    }

    return translation;
  }

  async load(lang) {
    if (!this.config.languages.includes(lang)) {
      return;
    }

    this._translate(await this.get_resource(lang));

    document.documentElement.lang = lang;

    if (this.config.persist) {
      localStorage.setItem("language", lang);
    }
  }

  async getTranslationByKey(lang, key) {
    if (!key) throw new Error("Expected a key to translate, got nothing.");

    if (typeof key != "string")
      throw new Error(
        `Expected a string for the key parameter, got ${typeof key} instead.`
      );

    let translation = await this.get_resource(lang);

    return this._getValueFromJSON(key, translation, true);
  }

  _getValueFromJSON(key, json, fallback) {
    let text = key.split(".").reduce((obj, i) => obj[i], json);

    if (!text && this.config.defaultLanguage && fallback) {
      let fallbackTranslation = JSON.parse(
        this.cache.get(this.config.defaultLanguage)
      );

      text = this._getValueFromJSON(key, fallbackTranslation, false);
    } else if (!text) {
      text = key;
      console.warn(`Could not find text for attribute "${key}".`);
    }

    return text;
  }

  _translate(translation) {
    let zip = (keys, values) => keys.map((key, i) => [key, values[i]]);
    let nullSafeSplit = (str, separator) => (str ? str.split(separator) : null);

    let replace = (element) => {
      let keys =
        nullSafeSplit(element.getAttribute("data-translate"), " ") || [];
      let properties = nullSafeSplit(
        element.getAttribute("data-translate-attr"),
        " "
      ) || ["innerHTML"];

      if (keys.length > 0 && keys.length !== properties.length) {
        console.error(
          "data-translate and data-translate-attr must contain the same number of items"
        );
      } else {
        let pairs = zip(keys, properties);
        pairs.forEach((pair) => {
          const [key, property] = pair;
          let text = this._getValueFromJSON(key, translation, true);

          if (text) {
            element[property] = text;
            element.setAttribute(property, text);
          } else {
            console.error(`Could not find text for attribute "${key}".`);
          }
        });
      }
    };

    this.elements.forEach(replace);
  }

  get defaultConfig() {
    return {
      persist: false, //if true then language will be stored in localstorage
      languages: ["en"],
      defaultLanguage: "",
      detectLanguage: true,
      filesLocation: "/translation",
    };
  }
}

let translator = new Translator({
  persist: false, // change to true for persisting language on reload
  languages: ["hi", "en", "bn", "gu", "it", "ru", "zh-Hans"],
  defaultLanguage: "en",
  detectLanguage: true,
  filesLocation: "/translation",
});
let persist_language = localStorage.getItem("language");
translator.load(persist_language);

document.querySelector("select").addEventListener("click", function (evt) {
  if (evt.target.tagName == "SELECT" && evt.target.value !== "") {
    translator.load(evt.target.value);
  }
});
