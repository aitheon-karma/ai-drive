import { Injectable, ViewContainerRef, ComponentRef, ComponentFactoryResolver } from '@angular/core';

@Injectable()
export class DriveUploaderService {

    viewContainer: ViewContainerRef;
    dropZoneVisible: boolean;

    constructor(
        private componentFactoryResolver: ComponentFactoryResolver,
    ) { }

    init(container: ViewContainerRef, service: { _id: string; key: string }){
        this.setRootViewContainerRef(container);
        // this.createDialog();
    }

    setRootViewContainerRef(container: ViewContainerRef) {
        this.viewContainer = container;
    }

    // createDialog(): ComponentRef<DriveUploaderComponent> {
    //     this.viewContainer.clear();

    //     let dialogComponentFactory = this.componentFactoryResolver.resolveComponentFactory(DriveUploaderComponent);
    //     // let dialogComponentRef = this.viewContainer.createComponent(dialogComponentFactory);

    //     const dialogComponentRef = dialogComponentFactory.create(this.viewContainer.parentInjector)
    //     this.viewContainer.insert(dialogComponentRef.hostView)

    //     dialogComponentRef.instance.closed.subscribe(() => {
    //       dialogComponentRef.destroy();
    //     });

    //     return dialogComponentRef;
    // }

    showDropZone(){
        this.dropZoneVisible = true;
    }

    hideDropZone(){
        this.dropZoneVisible = false;
    }

}
