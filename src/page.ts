import type * as b from 'blessed';
import type bc from 'blessed-contrib';

export type PageName = 'home' | 'artist';

interface PageOptions {
  name: PageName;
  elements: b.Widgets.BlessedElement[];
  // Hides these elements when page is hidden
  autoHide?: b.Widgets.BlessedElement[];
  // Always show these elements
  autoShow?: b.Widgets.BlessedElement[];
  grid: bc.Widgets.GridElement;
}

export class Page {
  name: PageName;
  elements: b.Widgets.BlessedElement[];
  autoHide?: b.Widgets.BlessedElement[];
  autoShow?: b.Widgets.BlessedElement[];
  grid: bc.Widgets.GridElement;

  constructor(opts: PageOptions) {
    this.name = opts.name;
    this.elements = opts.elements;
    this.autoHide = opts.autoHide;
    this.autoShow = opts.autoShow;
    this.grid = opts.grid;
  }

  show(): void {
    this.elements.forEach((b) => {
      b.show();
    });
    this.autoHide?.forEach((b) => {
      b.hide();
    });
  }

  hide(): void {
    this.elements.forEach((b) => {
      if (this.autoShow?.includes(b) === true) {
        b.show();
      } else b.hide();
    });
    this.autoShow?.forEach((b) => {
      b.show();
    });
  }
}
