import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CvpageComponent } from './cvpage.component';

describe('CvpageComponent', () => {
  let component: CvpageComponent;
  let fixture: ComponentFixture<CvpageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CvpageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CvpageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
