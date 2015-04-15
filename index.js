var input = require('../API/output.json');

var XMLWriter = require('xml-writer');
    xw = new XMLWriter;
    xw.startDocument('1.0', 'UTF-8');
    xw.writeAttribute('encoding', 'UTF-8');
    xw.startElement('uml:Model');
    xw.writeAttribute('xmlns:xmi', 'http://www.omg.org/XMI');
    xw.writeAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
    xw.writeAttribute('xmlns:uml', 'http://www.eclipse.org/uml2/4.0.0/UML');
    xw.writeAttribute('xmi:id', '_MgQ4wOHCEeSyAtfQFgWBxA');
    xw.writeAttribute('name', 'model');
    xw.endDocument();