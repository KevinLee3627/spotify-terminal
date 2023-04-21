import type * as b from 'blessed';
import type bc from 'blessed-contrib';
import type { PageName } from './main';

interface PageOptions {
  name: PageName;
  elements: b.Widgets.BlessedElement[];
  grid: bc.Widgets.GridElement;
}

export class Page {
  name: PageName;
  elements: b.Widgets.BlessedElement[];
  grid: bc.Widgets.GridElement;

  constructor(opts: PageOptions) {
    this.name = opts.name;
    this.elements = opts.elements;
    this.grid = opts.grid;
  }

  show(): void {
    this.elements.forEach((b) => {
      b.show();
    });
  }

  hide(): void {
    this.elements.forEach((b) => {
      b.hide();
    });
  }
}
