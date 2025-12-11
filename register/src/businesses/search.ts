import Business from './business';

/**
 * Search business.
 */
export default class SearchBusiness extends Business {
  static singleton: SearchBusiness;

  /**
   * RegisterBusiness constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!SearchBusiness.singleton) {
      super(config);
      SearchBusiness.singleton = this;
    }
    return SearchBusiness.singleton;
  }

  /**
   * Get text list.
   * @param {string} text Text to handle.
   * @param {{doNotSearchThisWords: string[], replaceWords: {from: string, to: string}[]}} searchConfig Search config to specific handling.
   * @returns {string[]} Text list.
   */
  getTextList(
    text: string,
    searchConfig: {
      doNotSearchThisWords?: string[];
      replaceWords?: { from: string; to: string }[];
    } = {}
  ) {
    // Define search params.
    const { doNotSearchThisWords = [], replaceWords = [] } = searchConfig;

    // Define and return text list to search.
    const textList = decodeURIComponent(text)
      .toLowerCase()
      .replace(/[.,]/g, ' ')
      .split(' ')
      .map((v) => v && v.trim())
      .filter((v) => !!v)
      .filter((v) => !doNotSearchThisWords.includes(v))
      .map((v) => (replaceWords.find((r) => r.from === v) || { to: v }).to);
    return textList;
  }
}
