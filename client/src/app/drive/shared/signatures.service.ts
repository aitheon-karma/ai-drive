import { Observable } from 'rxjs/Observable';
import { Injectable } from '@angular/core';
import { RestService } from '@aitheon/core-client';

import { Signature } from './signature';


@Injectable()
export class SignaturesService {

  constructor(private restService: RestService) { }

  list(): Observable<Signature[]> {
    return this.restService.fetch(`/api/signatures`);
  }

  remove(signatureId: string): Observable<void> {
    return this.restService.delete(`/api/signatures/${ signatureId }`);
  }

}
