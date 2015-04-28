var translation = require('./config/translation.json'),
    typescriptDataTypes = require('./config/typescriptDataTypes.json')
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

  function typescriptDataTypeExists(name) {
    var match = false;
    typescriptDataTypes.forEach(function(typeName) {
      if(typeName === name) {
        match = true;
      }
    });
    return match;
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

      if(type.toLowerCase() === 'array') {
        return;
      }

      var xsiType = typescriptDataTypeExists(type) ? "uml:DataType" : "uml:Class";

      createElement('packagedElement', {
        'xmi:id': typeId,
        'name': type,
        'xsi:type': xsiType
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

  function isObjectFlagDefined(flag, obj) {
    return (obj[flag] !== undefined) && (obj[flag] !== null);
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
      typeDefinition.id = getAndHashTypeId(typeObj.typeArguments[0].name);
    } else {
      typeDefinition.id = getAndHashTypeId(typeDefinition.name);
    }

    return typeDefinition;

  }

  function addLowerValue(out, value) {
    addCardinalityValue(out, 'lower', value);
  }

  function addUpperValue(out, value) {
    addCardinalityValue(out, 'upper', value);
  }

  function addCardinalityValue(out, range, value) {
    
    var rangeType = '',
        options = {};

    if (range !== 'upper') {
      rangeType = 'lower';
      options['xsi:type'] = 'uml:LiteralInteger';
    } else {
      rangeType = 'upper';
      options['xsi:type'] = 'uml:LiteralUnlimitedNatural';
    }

    if(value) {
      options.value = value;
    }

    createElement(rangeType + 'Value', options);
    out.endElement();

  }

  function getDefaultCardinality() {
    return {
      lower: null, 
      upper: '*' 
    };
  }

  function addCardinality(out, cardinality) {

    if(!cardinality || !(cardinality instanceof Array)) {
      cardinality = getDefaultCardinality();
    }

    addLowerValue(out, cardinality.lower);
    addUpperValue(out, cardinality.upper);

  }

  function getTranslation(obj) {
    return translation[obj.kind];
  }

  function translateObjectAttributes(obj, attrs, prefix, srcObj) {

    attrs = attrs || {};
    prefix = prefix || '';
    srcObj = srcObj || obj;

    var t = getTranslation(obj);

    var translationValue,
        elementValue,
        pattern;

    // do translation
    Object.keys(t.attrs).forEach(function(translationKey) {

      translationValue = t.attrs[translationKey];

      if(!translationValue || attrs[translationKey]) {
        return;
      }

      Object.keys(srcObj).forEach(function(elementKey) {

        if(elementKey != 'children') {
          elementValue = srcObj[elementKey];

          // replace variables
          pattern = new RegExp('{{' + prefix + elementKey + '}}');
          translationValue = translationValue.replace(pattern, elementValue);

        }

      });

      if(translationValue !== null) {
        if(!isPartiallyUnprocessed(translationValue)) {
          attrs[translationKey] = translationValue;
        }
      }

    });

    return attrs;

  }

  var unprocessedTemplateVariablePattern = new RegExp('{{.*}}');
    function isPartiallyUnprocessed(value) {
      var match = value.match(unprocessedTemplateVariablePattern);
      return match !== null;
    }

  function handleObjectFlags(obj, attrs) {
    if(isObjectFlagEqual('isPrivate', 'true', obj)) {
      attrs.visibility = 'private';
    }

    if(isObjectFlagEqual('isStatic', 'true', obj)) {
      attrs.isStatic = 'true';
    }

    return attrs;
  }

  function processInput(obj, parentObj, parentAttrs) {

    parentObj = parentObj || {};
    parentAttrs = parentAttrs || {};

    // lookup translation
    if(!translation[obj.kind]) {
      if(verbose) {
        console.error('Kind ' + obj.kind + ' has no translation. Skipping');
      }
      return;
    }

    var attrs = translateObjectAttributes(obj);
    attrs = handleObjectFlags(obj, attrs);
    if(parentObj) {
      attrs = translateObjectAttributes(obj, attrs, 'parent:', parentObj);
      attrs = translateObjectAttributes(obj, attrs, 'parent:', parentAttrs);
    }

    if(isObjectFlagDefined('inheritedFrom', obj)) {
      return; // skip inherited elements
    }

    // Handle Type for Attribute-ish items
    try {
      var type = getAndHashTypeId(obj.type.name);
      attrs.type = type;
    } catch(e) {
    }

    // Override Array type
    try {
      var type = extractType(obj.type);
      if(type.multiple === true) {
        attrs.type = type.id
      }
    } catch(e) {
    }

    var elementType = getTranslation(obj).elementType || 'packagedElement';
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

          var type = extractType(parameter.type);

          createElement('ownedParameter', {
            'type': type.id,
            'isUnique': 'false',
            'name': parameter.name
          }, out);

          // Function Parameter Cardinality (optional)
          if(isObjectFlagEqual('isOptional', 'true', parameter) === true) {
            type.multiple = true;
            addCardinalityValue(out, 'lower');
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
        processInput(child, obj, attrs);
      });
    }

    if(getTranslation(obj).injectTypePackage === true) {
      injectTypePackage(types, out);
    }

    out.endElement();

  }

  processInput(input);

})(xw);

xw.endDocument();
console.log(xw.toString());