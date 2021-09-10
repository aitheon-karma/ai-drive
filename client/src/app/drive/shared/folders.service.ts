import { Observable } from 'rxjs/Observable';
import { Injectable } from '@angular/core';
import { RestService } from '@aitheon/core-client';

import { Folder } from './folder';


@Injectable()
export class FoldersService {

  constructor(private restService: RestService) { }

  list(serviceId?: string, parent?: string): Observable<Folder[]> {
    return this.restService.fetch(`/api/folders`, { service: serviceId || '', parent: parent || '' });
  }

  get(folderId?: string): Observable<Folder> {
    return this.restService.fetch(`/api/folders/${ folderId }`);
  }

  rootTree(folderId?: string): Observable<{ root: Folder, path: string }> {
    return this.restService.fetch(`/api/folders/${ folderId }/root`);
  }

  create(folder: Folder): Observable<Folder> {
    return this.restService.post(`/api/folders`, folder);
  }

  update(folder: Folder): Observable<Folder> {
    return this.restService.put(`/api/folders/${ folder._id }`, folder);
  }

  remove(folderId: string): Observable<Folder> {
    return this.restService.delete(`/api/folders/${ folderId }`);
  }

  serviceKeys(serviceId: string): Observable<Array<{ _id: string, name: string }>> {
    return this.restService.fetch(`/api/acl/${ serviceId }/keys`);
  }

  breadcrumbs(folderId: string): Observable<Array<Folder>> {
    return this.restService.fetch(`/api/folders/${ folderId }/breadcrumbs`);
  }

}
