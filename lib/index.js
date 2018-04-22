// TODO:
// . тесты
// . строки с ошибками
// . написать спаврку
// . мультиязычно

const fs = require("fs");
const jsdom = require("jsdom");
const chalk = require("chalk");
const {classesWhiteListString} = require("./data");
const {camelCaseToDash} = require("./helpers");
// todo: remove it after http://node.green/#ESNEXT-candidate--stage-3--Array-prototype--flatten--flatMap--Array-prototype-flatten
require('array.prototype.flatten').shim();

const {JSDOM} = jsdom;

const classesWhiteList = classesWhiteListString.split(/[ \n]+/).filter(value => !!value);

fs.readdir('./', function (err, items) {
    const htmls = items.filter(path => path.includes(".html"));
    const index = htmls.find(path => path.includes("index.html"));
    const htmlsInOrder = index ? [
        index,
        ...htmls.filter(path => path !== index),
    ] : htmls;
    htmlsInOrder.forEach(analyzeFile);
});

function analyzeFile(fileName) {
    console.log(chalk.gray(`\tПроверка "${fileName}"`));
    const content = fs.readFileSync(fileName, 'utf8');
    const jsdom = new JSDOM(content, {includeNodeLocations: true});
    analyzeDocument(jsdom.window, content);
}

function analyzeDocument(window, content) {
    const {body} = window.document;

    if (!(body && body.firstElementChild)) {
        console.log('File skipped: no elements');
        return false;
    }

    // todo: remove it after https://github.com/jsdom/jsdom/pull/1951
    window.Element.prototype.closest = function (selector) {
        let el = this;
        while (el) {
            if (el.matches(selector)) {
                return el;
            }
            el = el.parentElement;
        }
    };

    const classesSet = new Set();
    const forEach = [].forEach;
    forEach.call(body.querySelectorAll('*'), node => {
        Array.from(node.classList)
            .filter(item => !!item.trim())
            .forEach(oneClass => classesSet.add(oneClass));
    });

    const classesAll = Array.from(classesSet);

    const classesBad = [
        ...filterBadClassesByDelimeter(classesAll, "__"),
        ...filterBadClassesByDelimeter(classesAll, "--"),
    ];

    function filterBadClassesByDelimeter(classes, delimeter) {
        return classes.filter(className => {
            const classParts = className.split(delimeter);
            return (classParts.length > 2) || (classParts.length === 2 && (!classParts[0] || !classParts[1]));
        });
    }

    const classesNotBad = classesAll.filter(className => !classesBad.includes(className));

    const classesElements = classesNotBad.filter(className => className.includes("__"));

    const classesModificators = classesNotBad.filter(className => className.includes("--"));

    const badElements = classesElements.filter(element => {
        const classParts = element.split('__');
        const block = classParts[0];
        return Array.from(body.querySelectorAll(`.${element}`)).some(node => !node.closest(`.${block}`));
    });

    const badMods = classesModificators.filter(element => {
        const classParts = element.split('--');
        const basicItemClass = classParts[0];
        return Array.from(body.querySelectorAll(`.${element}`)).some(node => !node.classList.contains(basicItemClass));
    });

    const buttonTypes = ["button", "submit", "reset"];
    const buttons = Array.from(body.querySelectorAll('button'));
    const formElements = Array.from(body.querySelectorAll('input, select, textarea'));
    const buttonsWithoutType = buttons
        .filter(button => button.getAttribute('type') === null);
    const inputsWithTypeButton = formElements
        .filter(element => {
            const type = element.getAttribute("type");
            return buttonTypes.includes(type);
        });
    const inputsWithoutName = formElements
        .filter(element => element.getAttribute('name') === null);

    const wordsSet = new Set(classesNotBad.map(className => camelCaseToDash(className).split(/[-_]+/)).flatten());
    const words = Array.from(wordsSet);
    const classesMaybeTranslit = words.filter(word => !classesWhiteList.includes(word));

    const hasTabs = content.includes("\t");
    const hasSpaces = content.includes("  ");
    const badFormatting = hasTabs && hasSpaces;

    const links = Array.from(body.querySelectorAll('a'));
    const linksWithEmptyHref = links.filter(link => link.getAttribute("href") === "");

    const linesOfCode = content.split("\n");
    const longLines = linesOfCode.filter(line => line.length > 120);

    const notHasNbsp = !content.includes("&nbsp;");

    const h1NotOne = body.querySelectorAll("h1").length !== 1;

    const errorsInArraysTests = [
        classesBad,
        badElements,
        badMods,
        buttonsWithoutType,
        inputsWithTypeButton,
        inputsWithoutName,
        classesMaybeTranslit,
        linksWithEmptyHref,
        longLines,
    ].some(arr => arr.length);

    const hasErrors =
        errorsInArraysTests ||
        badFormatting ||
        notHasNbsp ||
        h1NotOne;

    if (classesBad.length)
        printErrors(`Классы, названные с ошибками по БЭМ`, classesBad);
    if (badElements.length)
        printErrors(`Элементы вне своего блока`, badElements);
    if (badMods.length)
        printErrors(`Модификаторы без элемента/блока`, badMods);
    if (buttonsWithoutType.length)
        printErrors(`На странице имеется тег "button" без указания "type"`);
    if (inputsWithTypeButton.length)
        printErrors(`На странице имеется тег "input" с "type" button/submit/reset`);
    if (inputsWithoutName.length)
        printErrors(`На странице имеется тег "input"/"select"/"textarea" без "name"`);
    if (classesMaybeTranslit.length)
        printErrors(`Возможно, транслит/сокращения/ошибки`, classesMaybeTranslit);
    if (badFormatting)
        printErrors(`Возможно, плохое форматирование, есть и табы, и более двух пробелов`);
    if (notHasNbsp)
        printErrors(`Тексты не оттипографированы. Все тексты нужно прогонять через типограф, например, через artlebedev.ru/typograf`);
    if (h1NotOne)
        printErrors(`На странице больше одного заголовка <h1>`);
    if (linksWithEmptyHref.length)
        printErrors(`Есть ссылки с пустым "href". Если адрес страницы неизвестен, лучше задать href="#"`);
    if (longLines.length)
        printErrors(`Есть строки, содержащие больше 120 символов. Желательно убираться в 120 символов или использовать переносы строк`);

    if (!hasErrors)
        console.log(chalk.green("ошибок нет\n"));
}

function printErrors(text, array) {
    const errorText = `${text}${array ? `:\n${array.join(', \n')}` : ""}`;
    console.error(`${errorText}\n`);
}
