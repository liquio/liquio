import { Entity } from './entity';

/**
 * Document attachment entity.
 */
export class DocumentAttachmentEntity extends Entity {
  id: any;
  documentId: any;
  link: any;
  name: any;
  type: any;
  size: any;
  labels: any;
  isGenerated: any;
  createdAt: any;
  meta: any;

  /**
   * Constructor.
   * @param {object} options Document attachment object.
   * @param {string} options.id ID.
   * @param {string} options.documentId Document ID.
   * @param {string} options.link Link.
   * @param {string} options.name Name.
   * @param {string} options.type Type.
   * @param {number} options.size Size.
   * @param {string[]} options.labels Labels.
   * @param {boolean} options.isGenerated Is generated.
   * @param {Date} options.createdAt Created at.
   * @param {Object} options.meta Meta.
   */
  constructor({ id, documentId, link, name, type, size, labels, isGenerated, createdAt, meta }: any) {
    super();

    this.id = id;
    this.documentId = documentId;
    this.link = link;
    this.name = name;
    this.type = type;
    this.size = size;
    this.labels = labels;
    this.isGenerated = isGenerated;
    this.createdAt = createdAt;
    this.meta = meta;
  }
}
