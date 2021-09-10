import { Document } from "./document";
import { Folder } from ".";

export class Share {
    _id: string;
    document: string | Document;
    folder: string | Folder;
    sharedBy: {
        _id: string,
        profile: {
            firstName: string,
            lastName: string
        }
    };
    sharedTo: {
        shareableLink: boolean,
        user: any,
        team: any,
        email: string,
        level: string,
        organization: string
    };
}