export class Document {
    _id: string;
    name: string;
    private: boolean;
    createdAt: Date;
    updatedAt: Date;
    storeKey: string;
    size: number;
    contentType: string;
    organization: string;
    service: {
        _id: string,
        key: string
    };
    createdBy: {
        _id: string,
        profile: {
            firstName: string,
            lastName: string
        }
    };
    disabled: boolean;
    isShared: boolean;
    folder: any;

    deleting?: boolean
}