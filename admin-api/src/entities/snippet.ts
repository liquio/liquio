import { Entity } from './entity';
import { SnippetGroupEntityOptions } from './snippet_group';

interface SnippetsEntityOptions {
  /** Snippet ID. */
  id: number;
  /** Snippet name. */
  name: string;
  /** Snippet type. */
  type: string;
  /** Snippet group. */
  snippetGroup: SnippetGroupEntityOptions;
  /** Snippet data. */
  data: string;
  /** Created at. */
  createdAt: Date;
  /** Updated at. */
  updatedAt: Date;
}

/**
 * Snippets entity.
 */
export class SnippetsEntity extends Entity<SnippetsEntityOptions> { }

export interface SnippetsEntity extends SnippetsEntityOptions { }
