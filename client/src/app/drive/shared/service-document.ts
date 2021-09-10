import { Document } from './document';
import { Service } from './service';

export class ServiceDocument {
    _id?: string;
    service: Service;
    documents: Document[];
}
