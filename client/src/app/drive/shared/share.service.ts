import { Observable } from 'rxjs/Observable';
import { Injectable } from '@angular/core';
import { RestService } from '@aitheon/core-client';

import { Share } from './share';
import { Document } from './document';
import { Folder } from './folder';

@Injectable()
export class ShareService {

  constructor(private restService: RestService) { }

  listDocuments(folder?: string, organization?: string): Observable<Document[]> {
    const params: { folder?: string, organization?: string } = {};
    if (folder){
      params.folder = folder;
    }
    if (organization){
      params.organization = organization;
    }
    return this.restService.fetch(`/api/share/documents`, params);
  }

  getDocument(documentId: string): Observable<Document>{
    return this.restService.fetch(`/api/share/documents/${ documentId }`);
  }

  getFolder(folderId: string): Observable<Folder>{
    return this.restService.fetch(`/api/share/folders/${ folderId }`);
  }

  listFolders(folder?: string, organization?: string): Observable<Folder[]> {
    const params: { folder?: string, organization?: string } = {};
    if (folder){
      params.folder = folder;
    }
    if (organization){
      params.organization = organization;
    }
    return this.restService.fetch(`/api/share/folders`, params);
  }

  listByItem(shareItemId: string, shareType: string): Observable<Share[]> {
    return this.restService.fetch(`/api/share`, { shareItemId, shareType });
  }

  // get(shareId: string): Observable<Share> {
  //   return this.restService.fetch(`/api/share/${ shareId }`);
  // }

  save(shareItemId: string, shareType: string, sharedTo: Array<{ user: string, email: string }>): Observable<{ isShared: boolean }> {
    return this.restService.post(`/api/share`, { shareItemId, shareType, sharedTo });
  }

  searchUsers(search: string): Observable<Array<any>> {
    const onlyOrg = true;
    return this.restService.fetch(`/users/api/users/profile/search`, { search, onlyOrg }, true);
  }
}
