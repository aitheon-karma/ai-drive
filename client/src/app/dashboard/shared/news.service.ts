import { Observable } from 'rxjs/Observable';
import { Injectable } from '@angular/core';
import { RequestOptions, Http, Request, Response, Headers } from '@angular/http';
import { Cookie } from '@aitheon/core-client';
import { map } from 'rxjs/operators';

@Injectable()
export class NewsService {

  constructor(
    private http: Http
  ) { }

  list(): Observable<any[]> {
    return this.makeRequest('GET',`/users/api/dashboard/news`);
  }

  private makeRequest(method: string, url: string, body: any = null): Observable<any> {
    const options = new RequestOptions({
      method: method,
      url: url,
      headers: new Headers()
    });

    if (body) {
      options.body = JSON.stringify(body);
    }

    options.headers.set('Content-Type', 'application/json');
    const fl_token = Cookie.get('fl_token');
    if (fl_token) {
      options.headers.set('Authorization', `JWT ${ fl_token }`);
    }

    const request = this.http
      .request(new Request(options))
      .pipe(map((res: Response) => {
        // because 204 does not contain body
        if (res.status >= 201 && res.status <= 226) {
         return;
       } {
         return res.json();
       }
     }))
      .catch(this.handleError);

    return request;
  }

  /**
  * Handle HTTP error
  */
  private handleError(error: any) {
    // We'd also dig deeper into the error to get a better message
    let errMsg = error.status ? `${error.status} - ${error.statusText}` : 'Server error';
    if (error._body) {
      try {
        const json = error.json();
        if (json.message) {
          errMsg = json.message;
        } else {
          errMsg = json;
        }
      } catch (error) {
      }
    }
    console.error(errMsg); // log to console instead
    if (error.status === 401 || error.status === 403) {
      localStorage.removeItem('current_user');
      localStorage.removeItem('last_organization_location');
      let baseHost = Cookie.get('base_host');
      Cookie.delete('fl_token', '/', baseHost);
      if (!baseHost) {
        const domains = window.location.hostname.split('.');
        // assume we have 2 level domain always
        if (domains.length >= 2) {
          baseHost = `${ domains[domains.length - 2] }.${ domains[domains.length - 1 ]}`;
        }
      }
      const returnUrl = window.location.href;
      // tslint:disable-next-line:max-line-length
      const location = `${ window.location.protocol }//${ baseHost }:${ window.location.port }/login?returnUrl=${ encodeURIComponent(returnUrl) }`;
      window.location.href = location;
    }
    return Observable.throw(errMsg);
  }
}

