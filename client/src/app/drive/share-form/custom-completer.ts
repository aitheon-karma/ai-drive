import { HttpClient } from "@angular/common/http";
import { Subject } from "rxjs/Subject";

import { CompleterData, CompleterItem } from "ng2-completer";
import { Subscription } from "rxjs/Subscription";
import { map } from 'rxjs/operators';

export class CustomData extends Subject<CompleterItem[]> implements CompleterData {
    private remoteSearch: Subscription;

    constructor(private http: HttpClient) {
        super();
    }
    public search(term: string): void {
        this.cancel();
        this.remoteSearch = this.http.get("/users/api/search?q=" + term)
            .pipe(map(data => {
                let matches = (<Array<any>>data).map((item: any) => this.convertToItem(item)) as CompleterItem[];
                this.next(matches);
            }))
            .subscribe();
    }

    public cancel() {
        // Handle cancel
        if (this.remoteSearch) {
            this.remoteSearch.unsubscribe();
        }
    }

    public convertToItem(data: any): CompleterItem | null {
        if (!data) {
            return null;
        }
        // data will be string if an initial value is set
        let image = '/drive/assets/img/nophoto.png';
        if (data.isTeam){
            image = '';
        } else {
            if (data.profile.avatarUrl){
                image = data.profile.avatarUrl;
            } else {
                data.profile.avatarUrl = image;
            }
        }
        // '/drive/assets/team.png';
        return {
            title: data.name,
            image: image,
            originalObject: data
        } as CompleterItem;
    }
}
