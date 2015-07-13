class Polygon {
  sides: number;
}

export class Triangle extends Polygon {
  constructor() {
    this.sides = 3;
    super();
  }
}

export class Rectangle extends Polygon {
  height: number;
  width: number;
  constructor(height: number, width: number) {
    this.sides = 4;
    this.height = height;
    this.width = width;
    super();
  }
}

export class Square extends Rectangle {
  constructor(length: number) {
    super(length, length);
  }
}
