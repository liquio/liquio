import { Controller } from './controller';
import { File } from '../types/file';
import { getDb, getModels } from '../lib/context';
import { InvalidParamsError, NotFoundError } from '../lib/errors';

/**
 * Snippets controller.
 */
export class SnippetsController extends Controller {
  private static singleton: SnippetsController;

  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!SnippetsController.singleton) {
      super(config);
      SnippetsController.singleton = this;
    }
    return SnippetsController.singleton;
  }

  /**
   * Get all.
   */
  async getAll() {
    const snippets = await getModels().snippets.getAll();
    if (!snippets.length) {
      throw new NotFoundError('Snippets not found.');
    }
    return snippets;
  }

  /**
   * Get one.
   * @param {{params: Object, body: Object, query: Object, userId: string, userUnitIds: Array<number>}} options
   */
  async getOne({ params }) {
    const snippet = await getModels().snippets.findById(params.id);
    if (!snippet) {
      throw new NotFoundError('Snippet not found.');
    }
    return snippet;
  }

  /**
   * Create one.
   * @param {{params: Object, body: Object, query: Object, userId: string, userUnitIds: Array<number>}} options
   */
  async createOne({ body }) {
    return await getModels().snippets.createOne(body);
  }

  /**
   * Update one.
   * @param {{params: Object, body: Object, query: Object, userId: string, userUnitIds: Array<number>}} options
   */
  async updateOne({ params, body }) {
    const updateResult = await getModels().snippets.updateById(params.id, body);
    if (!updateResult) {
      throw new NotFoundError('Snippets not found.');
    }
    return updateResult;
  }

  /**
   * Delete one.
   * @param {{params: Object, body: Object, query: Object, userId: string, userUnitIds: Array<number>}} options
   */
  async deleteOne({ params }) {
    const deletedCount = await getModels().snippets.deleteById(params.id);
    if (!deletedCount) {
      throw new NotFoundError('Snippets not found.');
    }
    return {
      deletedCount: deletedCount,
    };
  }

  /**
   * Export.
   * @param {{params: Object, body: Object, query: Object, userId: string, userUnitIds: Array<number>}} options
   */
  async export({ body }) {
    const snippets = await getModels().snippets.export({ idList: body.idList });
    return new File({ name: 'snippets.bpmn', content: snippets, dataType: 'application/bpmn' } as any);
  }

  /**
   * Import.
   * @param {{params: Object, body: Object, query: Object, userId: string, userUnitIds: Array<number>}} options
   */
  async import({ query, body }) {
    let snippets;
    try {
      snippets = JSON.parse(body);
    } catch {
      throw new InvalidParamsError('Cannot parse file for import. Invalid JSON.');
    }

    // Append snippetGroupName key to snippets.
    snippets.forEach((snippet) => {
      if (snippet.snippetGroup?.name) {
        snippet.snippetGroupName = snippet.snippetGroup.name;
      }
    });

    // Get uniq list of snippet groups to insert.
    const snippetGroups = Array.from(
      new Map(snippets.filter((snippet) => !!snippet.snippetGroup).map((snippet) => [snippet.snippetGroup.name, snippet.snippetGroup])).values(),
    );

    // Full rewrite.
    if (query.isRewrite) {
      const transaction = await getDb().transaction();
      const snippetsDeletedCount = await getModels().snippets.deleteAll({ transaction });
      const snippetGroupsDeletedCount = await getModels().snippetGroups.deleteAll({ transaction });
      const snippetGroupsCreatedCount = await getModels().snippetGroups.bulkCreate(snippetGroups, { transaction });
      const snippetsCreatedCount = await getModels().snippets.bulkCreate(snippets, { transaction });
      await transaction.commit();
      return { snippetGroupsDeletedCount, snippetGroupsCreatedCount, snippetsDeletedCount, snippetsCreatedCount };
    }

    // Update.
    const transaction = await getDb().transaction();
    const snippetGroupsCreatedCount = await getModels().snippetGroups.bulkCreate(snippetGroups, {
      ignoreDuplicates: true,
      transaction,
    });
    // Remove id for inserting new rows.
    snippets.forEach((snippet) => delete snippet.id);
    const snippetsCreatedCount = await getModels().snippets.bulkCreate(snippets, { transaction });
    await transaction.commit();
    return { snippetGroupsCreatedCount, snippetsCreatedCount };
  }

  /**
   * Get all.
   */
  async getAllGroups() {
    return await getModels().snippetGroups.getAll();
  }

  /**
   * Get one.
   * @param {{params: Object, body: Object, query: Object, userId: string, userUnitIds: Array<number>}} options
   */
  async getOneGroup({ params }) {
    return await getModels().snippetGroups.findById(params.name);
  }

  /**
   * Create one.
   * @param {{params: Object, body: Object, query: Object, userId: string, userUnitIds: Array<number>}} options
   */
  async createOneGroup({ body }) {
    return await getModels().snippetGroups.createOne({ name: body.name });
  }

  /**
   * Update one.
   * @param {{params: Object, body: Object, query: Object, userId: string, userUnitIds: Array<number>}} options
   */
  async updateOneGroup({ params, body }) {
    const updateResult = await getModels().snippetGroups.updateByName(params.nameFromParams, body);
    if (!updateResult) {
      throw new NotFoundError('Snippet group not found.');
    }
    return updateResult;
  }

  /**
   * Delete one.
   * @param {{params: Object, body: Object, query: Object, userId: string, userUnitIds: Array<number>}} options
   */
  async deleteOneGroup({ params }) {
    const deletedCount = await getModels().snippetGroups.deleteByName(params.name);
    if (!deletedCount) {
      throw new NotFoundError('Snippet group not found.');
    }
    return {
      deletedCount: deletedCount,
    };
  }
}
