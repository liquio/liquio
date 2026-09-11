export class SourceMapConsumer {
  constructor(map = {}) {
    this.file = map.file;
    this.sourceRoot = map.sourceRoot || '';
    this.sourcesContent = map.sourcesContent || [];
  }

  originalPositionFor() {
    return {};
  }

  sourceContentFor() {
    return null;
  }

  destroy() {}
}

export class SourceMapGenerator {
  static fromSourceMap() {
    return new SourceMapGenerator();
  }

  addMapping() {}

  applySourceMap() {}

  setSourceContent() {}

  toJSON() {
    return {
      mappings: '',
      sources: [],
      version: 3
    };
  }

  toString() {
    return JSON.stringify(this.toJSON());
  }
}

export default {
  SourceMapConsumer,
  SourceMapGenerator
};
