import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GenericConfirmComponent } from './generic-confirm.component';

describe('GenericConfirmComponent', () => {
  let component: GenericConfirmComponent;
  let fixture: ComponentFixture<GenericConfirmComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GenericConfirmComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GenericConfirmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
