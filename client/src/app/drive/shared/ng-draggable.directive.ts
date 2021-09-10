import { Directive, ElementRef, Renderer, Input, Output, OnInit, HostListener, EventEmitter } from '@angular/core';

class Position {
  constructor(public x: number, public y: number) { }
}

@Directive({
  selector: '[ngMyDraggable]'
})
export class NgDraggableDirective implements OnInit {
  private allowDrag: boolean = true;
  private moving: boolean = false;
  private orignal: Position = null;
  private oldTrans: Position = new Position(0, 0);
  private tempTrans: Position = new Position(0, 0);
  private oldZIndex: string = '';
  private oldPosition: string = '';

  @Output() started = new EventEmitter<any>();
  @Output() stopped = new EventEmitter<any>();
  @Output() edge = new EventEmitter<any>();

  @Input() handle: HTMLElement;
  @Input() bounds: HTMLElement;
  @Input() blockBounds: boolean = false;

  // used to disaply shadow because of overflow auto/scroll
  padding = 3; //left/right and top/bottom
  private finalX: number;
  private finalY: number;

  @Input()
  set ngMyDraggable(setting: any) {
    if (setting !== undefined && setting !== null && setting !== '') {
      // this.allowDrag = !!setting;

      let element = this.handle ? this.handle : this.el.nativeElement;
      const position = setting.position;

      const boundsRect = this.bounds.getBoundingClientRect();
      const elemRect = this.el.nativeElement.getBoundingClientRect();
      let x = position.x;
      let y = position.y;
      if (setting.isNew){
         x = position.x - boundsRect.left + this.bounds.scrollLeft;
         y = position.y - boundsRect.top + this.bounds.scrollTop;
      }
    
      console.log('init x:', x, ';y:', y);
      this.orignal = this.getPosition(x, y);
      this.oldTrans = this.getPosition(x, y);
      const isNew = !!setting.isNew;
      setting.isNew = false;
      this.moveTo(x, y, isNew);


      if (this.allowDrag) {
        this.renderer.setElementClass(element, 'ng-draggable', true);
      }
      else {
        this.renderer.setElementClass(element, 'ng-draggable', false);
      }
    }
  }

  constructor(private el: ElementRef, private renderer: Renderer) { }

  ngOnInit() {
    if (this.allowDrag) {
      let element = this.handle ? this.handle : this.el.nativeElement;
      this.renderer.setElementClass(element, 'ng-draggable', true);
    }
  }

  private getPosition(x: number, y: number) {
    return new Position(x, y);
  }

  private moveTo(x: number, y: number, save: boolean = false) {
    //   console.log('x:', x, 'y:', y);
    const inX = x * 1;
    const inY = y * 1;
    if (this.orignal) {
      const bounds = this.boundsCheck();
      let boundary = this.bounds.getBoundingClientRect();
      let elem = this.el.nativeElement.getBoundingClientRect()
      const outLimit = !(!bounds.bottom || !bounds.left || !bounds.right || !bounds.top);

      this.tempTrans.x = x - this.orignal.x;
      this.tempTrans.y = y - this.orignal.y;

      let finalX = this.tempTrans.x + this.oldTrans.x;
      let finalY = this.tempTrans.y + this.oldTrans.y;

      const scrollTop = this.bounds.scrollTop;
      const scrollLeft = this.bounds.scrollLeft;

      if (this.blockBounds) {
        if (finalY < this.padding){
          finalY = this.padding;
        }
        const limitY = (boundary.height + scrollTop - elem.height - this.padding);
        if (finalY > limitY){
          finalY = limitY;
        }
        if (finalX < this.padding){
          finalX = this.padding;
        }
        const limitX = (boundary.width + scrollLeft - elem.width - this.padding);
        if (finalX > limitX){
          finalX = limitX;
        }
      }

      // console.log(`X: ${ finalX }; Y: ${ finalY }`);
      this.finalX = finalX;
      this.finalY = finalY;

      this.setTranslatePostion(finalX, finalY);
      if (save){
       setTimeout(() => {
        const stopXY = {
          x: inX,
          y: inY
        }
        this.stopped.emit(stopXY);
       }, 1000);
      }
      this.edge.emit(outLimit);
    }
  }
  
  private setTranslatePostion(finalX: number, finalY: number){
    let value = `translate(${ finalX }px, ${ finalY }px)`;
    this.renderer.setElementStyle(this.el.nativeElement, 'transform', value);
    this.renderer.setElementStyle(this.el.nativeElement, '-webkit-transform', value);
    this.renderer.setElementStyle(this.el.nativeElement, '-ms-transform', value);
    this.renderer.setElementStyle(this.el.nativeElement, '-moz-transform', value);
    this.renderer.setElementStyle(this.el.nativeElement, '-o-transform', value);
  }
  private pickUp() {
    // get old z-index and position:
    this.oldZIndex = this.el.nativeElement.style.zIndex ? this.el.nativeElement.style.zIndex : '';
    this.oldPosition = this.el.nativeElement.style.position ? this.el.nativeElement.style.position : '';

    if (window) {
      this.oldZIndex = window.getComputedStyle(this.el.nativeElement, null).getPropertyValue("z-index");
      this.oldPosition = window.getComputedStyle(this.el.nativeElement, null).getPropertyValue("position");
    }

    // setup default position:
    let position = 'relative';

    // check if old position is draggable:
    if (this.oldPosition && (
      this.oldPosition === 'absolute' ||
      this.oldPosition === 'fixed' ||
      this.oldPosition === 'relative')) {
      position = this.oldPosition;
    }

    this.renderer.setElementStyle(this.el.nativeElement, 'position', position);
    this.renderer.setElementStyle(this.el.nativeElement, 'z-index', '99999');

    if (!this.moving) {
      this.started.emit(this.el.nativeElement);
      this.moving = true;
    }
  }

  private boundsCheck() {
    let boundary = this.bounds.getBoundingClientRect();
    let elem = this.el.nativeElement.getBoundingClientRect()
    return {
      'top': boundary.top <= elem.top,
      'right': boundary.right >= elem.right,
      'bottom': boundary.bottom >= elem.bottom,
      'left': boundary.left <= elem.left
    };
  }

  private putBack(event: any) {
    event.stopPropagation();
    if (this.oldZIndex) {
      this.renderer.setElementStyle(this.el.nativeElement, 'z-index', this.oldZIndex);
    } else {
      this.el.nativeElement.style.removeProperty('z-index');
    }

    if (this.moving) {
      // substruct padding to get real xy 
      const stopXY = {
        x: this.finalX,
        y: this.finalY
      }
      this.stopped.emit(stopXY);
      console.log('stopXY', stopXY)
      this.edge.emit(this.boundsCheck());
      this.moving = false;
      this.oldTrans.x += this.tempTrans.x;
      this.oldTrans.y += this.tempTrans.y;
      this.tempTrans.x = this.tempTrans.y = 0;
    }
  }

  // Support Mouse Events:
  @HostListener('mousedown', ['$event'])
  onMouseDown(event: any) {
    // 1. skip right click;
    // 2. if handle is set, the element can only be moved by handle
    if (event.button == 2 || (this.handle !== undefined && event.target !== this.handle)) {
      return;
    }

    this.orignal = this.getPosition(event.clientX, event.clientY);
    this.pickUp();
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: any) {
    this.putBack(event);
  }

  @HostListener('document:mouseleave', ['$event'])
  onMouseLeave(event: any) {
    this.putBack(event);
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: any) {
    if (this.moving && this.allowDrag) {
      this.moveTo(event.clientX, event.clientY);
    }
  }

  // Support Touch Events:
  @HostListener('document:touchend', ['$event'])
  onTouchEnd(event: any) {
    this.putBack(event);
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: any) {
    event.stopPropagation();
    event.preventDefault();

    if (this.handle !== undefined && event.target !== this.handle) {
      return;
    }

    this.orignal = this.getPosition(event.changedTouches[0].clientX, event.changedTouches[0].clientY);
    this.pickUp();
  }

  @HostListener('document:touchmove', ['$event'])
  onTouchMove(event: any) {
    event.stopPropagation();
    event.preventDefault();
    if (this.moving && this.allowDrag) {
      this.moveTo(event.changedTouches[0].clientX, event.changedTouches[0].clientY);
    }
  }
}