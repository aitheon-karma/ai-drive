export class Folder {
    _id: string;
    name: string;
    private: Boolean;
    createdBy: {
        _id: string,
        profile: {
            firstName: string,
            lastName: string
        }
    }
    parent: string;

    parentRef: Folder;
    children: Array<Folder>;
    opened: boolean;
    isLoading: boolean;
    isSharedView: boolean;
    isShared: boolean;
    inlineSelected?: boolean;
    inlineContextSelected?: boolean;

    deleted?: boolean;
    inline?: boolean;
}