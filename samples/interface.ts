interface CarInterface {
  manufacturer: string;
  model: string;
 
  wheels: number;
}

class Car implements CarInterface {

  public manufacturer: string;
  public model: string;
  public wheels: number;

  constructor(manufacturer: string, model: string) {
    this.manufacturer = manufacturer;
    this.model = model;
    this.wheels = 4;
  }

  print(): string {
    return '<pre>Manufacturer: ' + this.manufacturer + '\nModel: ' + this.model + '\nWheels: ' + this.wheels + '</pre>';
  }

}


