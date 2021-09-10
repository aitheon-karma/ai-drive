import { Service, Inject } from 'typedi';
import { DocumentControlSchema, DocumentControl } from './document-control.model';

@Service()
export class DocumentControlsService {

  async findAll(documentId: string, populateSignature: boolean = false): Promise<DocumentControl[]>  {
    let query = DocumentControlSchema.find({ document: documentId });
    if (populateSignature) {
      query = query.populate('signature');
    }
    return query;
  }

  async countBySignature(signature: string): Promise<number>  {
    return DocumentControlSchema.count({ signature: signature });
  }

  async save(documentControl: DocumentControl): Promise<DocumentControl> {
    if (!documentControl._id) {
      const documentSchema = new DocumentControlSchema(documentControl);
      return documentSchema.save();
    } else {
      return DocumentControlSchema.findByIdAndUpdate(documentControl._id, documentControl);
    }
  }

  async remove(documentControlId: string): Promise<DocumentControl> {
    return DocumentControlSchema.findByIdAndRemove(documentControlId);
  }

  async removeByDocuments(documentIds: string[]): Promise<void> {
    return DocumentControlSchema.remove({ document: { $in: documentIds }}) as any;
  }

}
