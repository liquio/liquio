import { Entity } from './entity';

export interface SnippetGroupEntityOptions {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Snippet group entity.
 */
export class SnippetGroupEntity extends Entity<SnippetGroupEntityOptions> { }

export interface SnippetGroupEntity extends SnippetGroupEntityOptions { }
