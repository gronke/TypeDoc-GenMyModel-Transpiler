var translation = require('./config/translation.json'),
    argv = require('optimist').argv,
    path = require('path');

// input file is the first cli argument
var src = path.resolve(__dirname, argv._[0]),
    input = require(src);

var XMLWriter = require('xml-writer');
    xw = new XMLWriter;

var types = ['jQuery', 'number'];

var verbose = false;

// Create Document
xw.startDocument('1.0', 'UTF-8');
xw.writeAttribute('encoding', 'UTF-8');

(function(out) {

  function pad(str, len, character) {

    while(str.length < len) {
      str = character.toString() + str;
    }

    return str;

  }

  function padId(str) {
    return pad(str, 23, '_');
  }

  function getAndHashTypeId(typeName) {

    var typeId = padId(typeName),
        found = false;

    types.forEach(function(type) {
      if(typeName === type) {
        found = true;
      }
    });

    if(!found) {
      types.push(typeName);
    }

    return typeId;

  }

  function injectTypePackage(types, target) {

    target = target || out;
    var typeId;

    // TypeScript Package Container
    createElement('packagedElement', {
      'xmi:id': padId('typescript'),
      'name': 'TypeScript',
      'xsi:type': 'uml:Package'
    }, target);

    types.forEach(function(type) {

      typeId = padId(type);

      createElement('packagedElement', {
        'xmi:id': typeId,
        'name': type,
        'xsi:type': 'uml:Class'
      }, target);

      target.endElement();

    });

    target.endElement();

  };

  function generateRandomId(len) {
    len = len || 24;

    var randomString = '_';
    var pool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    while(randomString.length<len) {
      randomString += pool.charAt(Math.floor(Math.random() * pool.length));
    }

    return randomString;
  }

  function createElement(elementType, attrs, target) {
    target = target || out;
    var packagedElement = target.startElement(elementType);

    attrs = attrs || {};
    attrs['xmi:id'] = attrs['xmi:id'] || generateRandomId();
    
    for(var key in attrs) {
      packagedElement.writeAttribute(key, attrs[key]);
    }

    return packagedElement;
  }

  function createPackagedElement(attrs, target) {
    return createElement('packagedElement', attrs, target);
  }

  function getObjectFlag(flag, obj) {
    if(!obj.flags || !obj.flags[flag])
      return false;

    return obj.flags[flag].toString();
  }

  function isObjectFlagEqual(flag, match, obj, caseSensetive) {

    caseSensetive = !!caseSensetive;
    var flagValue = getObjectFlag(flag, obj);

    if(!caseSensetive && (typeof(flagValue) === 'string')) {
      match = match.toLowerCase();
      flagValue = flagValue.toLowerCase();
    }

    return (flagValue === match);
  }

  function extractType(typeObj) {

    var typeDefinition = {
      name: typeObj.name,
      id: null,
      multiple: false
    };

    if(typeObj.typeArguments) { // cardinality *
      typeDefinition.name = typeObj.typeArguments[0].name;
      typeDefinition.multiple = true;
    }

    typeDefinition.id = getAndHashTypeId(typeDefinition.name);
    return typeDefinition;

  }

  function addCardinality(out) {
    createElement('lowerValue', {
      'xsi:type': 'uml:LiteralInteger'
    });
    out.endElement();

    createElement('upperValue', {
      'xsi:type': 'uml:LiteralUnlimitedNatural',
      'value': '*'
    });
    out.endElement();
  }

  function processInput(obj) {

    // lookup translation
    if(!translation[obj.kind]) {
      if(verbose)
        console.error('Kind ' + obj.kind + ' has no translation. Skipping');
      return;
    }

    var t = translation[obj.kind],
        attrs = {};

    var translationValue,
        elementValue,
        pattern;

    // do translation
    Object.keys(t.attrs).forEach(function(translationKey) {

      translationValue = t.attrs[translationKey];

      Object.keys(obj).forEach(function(elementKey) {

        if(elementKey != 'children') {
          elementValue = obj[elementKey];

          // replace variables
          pattern = new RegExp('{{' + elementKey + '}}');
          translationValue = translationValue.replace(pattern, elementValue);

        }

      });

      if(translationValue !== null) {
        attrs[translationKey] = translationValue;
      }

    });

    if(isObjectFlagEqual('isPrivate', 'true', obj)) {
      attrs.visibility = 'private';
    }

    if(isObjectFlagEqual('isStatic', 'true', obj)) {
      attrs.isStatic = 'true';
    }

    var elementType = t.elementType || 'packagedElement';
    createElement(elementType, attrs);

    // Return Parameter
    try {
      var type = extractType(obj.signatures[0].type);

      createElement('ownedParameter', {
        'type': type.id,
        'name': 'returnParameter',
        'direction': 'return',
        'isUnique': 'false'
      }, out);

      if(type.multiple === true) {
        console.log('oh look at parameter ' + type.name + ' of ' + obj.name);
        addCardinality(out);
      }

      out.endElement();

    } catch(e) {
    }

    // General Parameters
    try {
      
      var parameters = obj.signatures[0].parameters;
      if(parameters && parameters.length>0) {
        parameters.forEach(function(parameter) {

          var type = extractType(parameter);

          createElement('ownedParameter', {
            'type': type.id,
            'isUnique': 'false',
            'name': type.name
          }, out);

          if(type.multiple === true) {
            console.log('oh look at parameter ' + type.name + ' of ' + obj.name);
            addCardinality(out);
          }


          out.endElement();

        });
      }

    } catch(e) {
    }

    // Array Attributes
    try {
      var type = extractType(obj.type);
      if(type.multiple === true) {
        addCardinality(out);
      }
    } catch(e) {
    }


    if(obj.children && obj.children.length > 0) {
      obj.children.forEach(function(child) {
        processInput(child);
      });
    }

    if(t.injectTypePackage === true) {
      injectTypePackage(types, out);
    }

    out.endElement();

  }

  processInput(input);

})(xw);

xw.endDocument();
console.log(xw.toString());