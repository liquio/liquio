import { Entity } from './entity';

interface ElasticReindexLogEntityOptions {
  id: string;
  userId: string;
  userName: string;
  filters: object;
  status: string;
  errorMessage: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Elastic reindex log entity.
 */
export class ElasticReindexLogEntity extends Entity<ElasticReindexLogEntityOptions> { }

export interface ElasticReindexLogEntity extends ElasticReindexLogEntityOptions { }
