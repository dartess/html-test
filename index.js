// TODO:
// . тесты
// . строки с ошибками
// . npm-пакет

const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const classesWhiteListString = `
size caption form add option review next prev control controls footer header page mail author reviews social popup
cost btn make order about wrap contacts write map address color additional label name title text mobile tablet
 desktop toys price us inst tw fb copyright overlay picture icon search nav nojs block user list send
 input fullname main hodden type group toggle item logo link cart value pic production video
 image with sub content catalog info desc play teaser to links options
 visually products properties likes hidden container colored textarea interior
 describe features eco handmade native
 feature inner lists note items like table support buy
 wrapper site description product checkbox full phone number tel email comment instagram facebook twitter
 navigator button week promo characteristics intro img feedback fieldset field telephone radio blue
 hashtag advantage article figure black posts post count player playback area repeat screen
 menu active youtube icons house burger present clean photo gallery
`;
const classesWhiteList = classesWhiteListString.split(/[ \n]+/).filter(value => {return !!value});

function camelCaseToDash( myStr ) {
    return myStr.replace( /([a-z])([A-Z])/g, '$1-$2' ).toLowerCase();
}

function analyzeDocument(window, jsdom) {
      const body = window.document.body;

  if (!(body && body.firstElementChild)) {
    console.log('File skipped: no elements');
    return false;
  }

window.Element.prototype.closest = function (selector) {
    var el = this;
    while (el) {
        if (el.matches(selector)) {
            return el;
        }
        el = el.parentElement;
    }
};

  let classes = new Set();
  let forEach = [].forEach;
  forEach.call(body.querySelectorAll('*'), function (node) {
    node.className.split(' ').filter(function (item) {
      return !!item.trim();
    }).forEach(function (oneClass) {
      classes.add(oneClass);
    });
  });

  classes = Array.from(classes);

  let badClasses = classes.filter(function (item) {
    let e = item.split("__");
    if (e.length > 2) {
      return true;
    } else if (e.length == 2 && (e[0].length == 0 || e[1].length == 0)) {
      return true;
    }
    e = item.split("--");
    if (e.length > 2) {
      return true;
    } else if (e.length == 2 && (e[0].length == 0 || e[1].length == 0)) {
      return true;
    }
  });

  let classesElements = classes.filter(function (item) {
    let e = item.split("__");
    if (e.length == 2) {
      return true;
    }
  });

  let modsElements = classes.filter(function (item) {
    let e = item.split("--");
    if (e.length == 2) {
      return true;
    }
  });

  let badElements = [];

  classesElements.forEach(function (element) {
    let e = element.split('__');
    let block = e[0];
    forEach.call(body.querySelectorAll(`.${element}`), function (node) {
      if (!node.closest(`.${block}`)) {
        badElements.push(element);
      }
    });
  });

  let badMods = [];
  modsElements.forEach(function (element) {
    let e = element.split('--');
    let basicItemClass = e[0];
    forEach.call(body.querySelectorAll(`.${element}`), function (node) {
      if (!node.classList.contains(basicItemClass)) {
        badMods.push(element);
      }
    });
  });
  
  let badButtons = [];  
  forEach.call(body.querySelectorAll('button'), function (node) {
    let type = node.getAttribute('type');
    if (!type) {
      badButtons.push(jsdom.nodeLocation(node));  
    } else if (!(type.toLowerCase() == 'button' || type.toLowerCase() === 'submit')) {
      badButtons.push(jsdom.nodeLocation(node));
    }    
  });
  forEach.call(body.querySelectorAll('input'), function (node) {
    let type = node.getAttribute('type').toLowerCase();
    if ((type == 'button' || type === 'submit')) {
      badButtons.push(jsdom.nodeLocation(node));
    }    
  });
  
  let words = new Set(); 
  classes.forEach(function (currentClass) {
    let currentClassDashed = camelCaseToDash(currentClass);
    currentClassDashed.split(/[-_]+/).forEach(function(currentWold){
        words.add(currentWold);
    });
  });
  words = Array.from(words);
  let badClassesTranslit = words.filter(word => {
          return classesWhiteList.indexOf(word) === -1;
  });
  /*
  // доработать, не работает
  let badPictures = [];
  forEach.call(body.querySelectorAll('svg'), function (node) {
    if (node.style.display !== 'none' && (!node.getAttribute('width') || !node.getAttribute('height'))) {
      badPictures.push(node);
    } 
  });*/

  let errors = false;
  if (badClasses.length) {
    errors = true;
    console.error('Bad classes!');
    console.log(badClasses);
  }
  if (badElements.length) {
    errors = true;
    console.error('Bad elements!');
    console.log(badElements);
  }
  if (badMods.length) {
    errors = true;
    console.error('Bad mods!');
    console.log(badMods);
  }
  if (badButtons.length) {
    errors = true;
    console.error('Bad buttons or input-buttons!');
    console.log(badButtons);
  }
  if (badClassesTranslit.length) {
    errors = true;
    console.error('Translit maybe?');
    console.log(badClassesTranslit);
  }
  /*
  if (badPictures.length) {
    errors = true;
    console.error('Bad images size!');
    console.log(badPictures);
  } 
*/  
  if (!errors) {
    console.log('BEM is correct.');
  }
}

function analyzeFile(contents) {
	const jsdom = new JSDOM(contents, {includeNodeLocations: true});
  analyzeDocument(jsdom.window, jsdom);
}

console.log('Start checking BEM-naming...\n');

fs.readdir('./', function (err, items) {
  for (let i = 0; i < items.length; i++) {
    let fileName = items[i];
    let split = fileName.split('.');
    if (split[split.length - 1].toLowerCase() == 'html') {
      fs.readFile(fileName, 'utf8', function (err, contents) {
        console.log(`Ckecking file "${fileName}"`);
        analyzeFile(contents);
        console.log('');
      });
    }
  }
});

console.log('Checking finished.');
