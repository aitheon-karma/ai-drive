export class DocumentControl {
    _id: string;
    document: string;
    type: string;
    pageNumber: number;
    position: {
        x: number;
        y: number;
    };
    isNew: boolean;
    signature: string;
  }