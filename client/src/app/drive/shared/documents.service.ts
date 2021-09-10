import { Observable } from 'rxjs/Observable';
import { Injectable } from '@angular/core';
import { RestService } from '@aitheon/core-client';

import { Document } from './document';
import { ServiceDocument } from './service-document';
import { DocumentControl } from './document-control';

@Injectable()
export class DocumentsService {

  constructor(private restService: RestService) { }

  list(serviceId?: string, folderId?: string, keyId?: string): Observable<Document[]> {
    return this.restService.fetch(`/api/documents`, { service: serviceId || '', folder: folderId || '', keyId: keyId || '' });
  }

  get(documentId?: string): Observable<Document> {
    return this.restService.fetch(`/api/documents/${ documentId }`);
  }

  update(document: Document): Observable<Document> {
    return this.restService.put(`/api/documents/${ document._id }`, document);
  }

  sign(document: Document): Observable<Document> {
    return this.restService.post(`/api/documents/${ document._id }/sign`, {});
  }

  remove(documentId: string): Observable<Document> {
    return this.restService.delete(`/api/documents/${ documentId }`);
  }

  listDocumentControl(documentId: string): Observable<DocumentControl[]> {
    return this.restService.fetch(`/api/documents/${ documentId }/controls`);
  }

  saveDocumentControl(documentControl: DocumentControl): Observable<DocumentControl> {
    return this.restService.post(`/api/documents/${ documentControl.document }/controls`, documentControl);
  }

  removeDocumentControl(documentControl: DocumentControl): Observable<any> {
    return this.restService.delete(`/api/documents/${ documentControl.document }/controls/${ documentControl._id }`);
  }

}
