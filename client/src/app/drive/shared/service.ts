export class Service {
    _id: string;
    key: string;
    name: string;
    showAtMenu: boolean;

    opened: boolean;
    isLoading: boolean;
    keys: Array<{ _id: string, name: string }>;
    folders?: Array<any>;
}
