interface SourceMapLike {
  file?: string;
  sourceRoot?: string;
  sourcesContent?: string[];
}

export class SourceMapConsumer {
  file?: string;
  sourceRoot: string;
  sourcesContent: string[];

  constructor(map: SourceMapLike = {}) {
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
