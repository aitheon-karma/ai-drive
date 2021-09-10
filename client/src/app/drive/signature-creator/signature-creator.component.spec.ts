import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SignatureCreatorComponent } from './signature-creator.component';

describe('SignatureCreatorComponent', () => {
  let component: SignatureCreatorComponent;
  let fixture: ComponentFixture<SignatureCreatorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SignatureCreatorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SignatureCreatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
