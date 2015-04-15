var input = require('../API/output.json');

var XMLWriter = require('xml-writer');
    xw = new XMLWriter;

// Create Document
xw.startDocument('1.0', 'UTF-8');
xw.writeAttribute('encoding', 'UTF-8');
xw.startElement('uml:Model');
xw.writeAttribute('xmlns:xmi', 'http://www.omg.org/XMI');
xw.writeAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
xw.writeAttribute('xmlns:uml', 'http://www.eclipse.org/uml2/4.0.0/UML');
xw.writeAttribute('xmi:id', '_MgQ4wOHCEeSyAtfQFgWBxA');
xw.writeAttribute('name', 'model');
    
(function(out) {

  function generateRandomId(len) {
    len = len || 24;

    var randomString = '_';
    var pool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    while(randomString.length<len) {
      randomString += pool.charAt(Math.floor(Math.random() * pool.length));
    }

    return randomString;
  }

  function createPackagedElement(attrs, target) {
    target = target || out;
    var packagedElement = out.startElement('packagedElement');

    attrs = attrs || {};
    attrs['xmi:id'] = attrs['xmi:id'] || generateRandomId();
    
    for(var key in attrs) {
      packagedElement.writeAttribute(key, attrs[key]);
    }

    return packagedElement;
  }

  createPackagedElement({ 
    'name': 'FooBar',
    'xsi:type': 'uml:Package',
  });

})(xw);


xw.endDocument();
console.log(xw.toString());