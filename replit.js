console.log("Loading roam-husk.js.");

if (!window.roamhusk) {
  window.roamhusk = {};
}

roamhusk.addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

roamhusk.randomFromInterval = (min, max) => Math.random() * (max - min) + min;

roamhusk.schedule = (node, signal) => {
  const newParams = roamhusk.getNewParameters(node, signal);

  const currentDate = new Date();
  return node
    .withInterval(newParams.interval)
    .withFactor(newParams.factor)
    .withDate(addDays(currentDate, Math.ceil(newParams.interval)));
};

roamhusk.getNewParameters = (node, signal) => {
  const factor = node.factor || roamhusk.defaultFactor;
  const interval = node.interval || roamhusk.defaultInterval;

  let newFactor = factor;
  let newInterval = interval;

  const factorModifier = 0.15;
  switch (signal) {
    case 1:
      newFactor = factor - 0.2;
      newInterval = 0;
      break;
    case 2:
      newFactor = factor - factorModifier;

      newInterval = interval * roamhusk.hardFactor;
      break;
    case 3:
      newInterval = interval * factor;
      break;
    case 4:
      newInterval = interval * factor;
      newFactor = factor + factorModifier;
      break;
  }
  const newDue = roamhusk.addDays(new Date(), newInterval);
  return { ...node, interval: newInterval, factor: newFactor, due: newDue };
};

// 20210119093326
// https://raw.githubusercontent.com/jakearchibald/idb-keyval/master/dist/iife/index-min.js
roamhusk.idbKeyval = (function(t) {
  "use strict";
  function e(t) {
    return new Promise((e, n) => {
      (t.oncomplete = t.onsuccess = () => e(t.result)),
        (t.onabort = t.onerror = () => n(t.error));
    });
  }
  function n(t, n) {
    const r = indexedDB.open(t);
    r.onupgradeneeded = () => r.result.createObjectStore(n);
    const o = e(r);
    return (t, e) => o.then(r => e(r.transaction(n, t).objectStore(n)));
  }
  let r;
  function o() {
    return r || (r = n("keyval-store", "keyval")), r;
  }
  function u(t, n) {
    return t(
      "readonly",
      t => (
        (t.openCursor().onsuccess = function() {
          this.result && (n(this.result), this.result.continue());
        }),
        e(t.transaction)
      )
    );
  }
  return (
    (t.clear = function(t = o()) {
      return t("readwrite", t => (t.clear(), e(t.transaction)));
    }),
    (t.createStore = n),
    (t.del = function(t, n = o()) {
      return n("readwrite", n => (n.delete(t), e(n.transaction)));
    }),
    (t.entries = function(t = o()) {
      const e = [];
      return u(t, t => e.push([t.key, t.value])).then(() => e);
    }),
    (t.get = function(t, n = o()) {
      return n("readonly", n => e(n.get(t)));
    }),
    (t.getMany = function(t, n = o()) {
      return n("readonly", n => Promise.all(t.map(t => e(n.get(t)))));
    }),
    (t.keys = function(t = o()) {
      const e = [];
      return u(t, t => e.push(t.key)).then(() => e);
    }),
    (t.promisifyRequest = e),
    (t.set = function(t, n, r = o()) {
      return r("readwrite", r => (r.put(n, t), e(r.transaction)));
    }),
    (t.setMany = function(t, n = o()) {
      return n(
        "readwrite",
        n => (t.forEach(t => n.put(t[1], t[0])), e(n.transaction))
      );
    }),
    (t.update = function(t, n, r = o()) {
      return r(
        "readwrite",
        r =>
          new Promise((o, u) => {
            r.get(t).onsuccess = function() {
              try {
                r.put(n(this.result), t), o(e(r.transaction));
              } catch (t) {
                u(t);
              }
            };
          })
      );
    }),
    (t.values = function(t = o()) {
      const e = [];
      return u(t, t => e.push(t.value)).then(() => e);
    }),
    t
  );
})({});

// --- Default settings ---
roamhusk.defaultFactor = 2.5;
roamhusk.defaultInterval = 2;
roamhusk.maxInterval = 50 * 365;
roamhusk.minFactor = 1.3;
roamhusk.hardFactor = 1.2;
roamhusk.jitterPercentage = 0.05;

roamhusk.clearCss = () => {
  new Array(roamhusk.styleSheet.rules.length)
    .fill("")
    .forEach(() => roamhusk.styleSheet.deleteRule(0));
};

// create a custom stylesheet
if (!roamhusk.styleSheet) {
  roamhusk.style = document.createElement("style");
  roamhusk.style.appendChild(document.createTextNode(""));
  document.head.appendChild(roamhusk.style);
  roamhusk.styleSheet = roamhusk.style.sheet;
} else {
  roamhusk.clearCss();
}

roamhusk.dateRegex = new RegExp(
  /\[\[(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}(st|nd|th|rd), \d{4}]]/gm
);

roamhusk.parseDateFromReference = name => {
  return roamhusk.parseDate(name.slice(2).slice(0, -2));
};

roamhusk.toUSDate = d => {
  const ye = new Intl.DateTimeFormat("en", { year: "numeric" }).format(d);
  const mo = new Intl.DateTimeFormat("en", { month: "short" }).format(d);
  const da = new Intl.DateTimeFormat("en", { day: "2-digit" }).format(d);
  return `${da}-${mo}-${ye}`;
};

roamhusk.parseDate = name => new Date(name.replace(/(th,|nd,|rd,|st,)/, ","));

roamhusk.parseNodes = nodes => {
  if (!roamhusk.nodes) {
    roamhusk.nodes = {};
  }
  const newNodes = {};
  nodes.forEach(node => {
    if (roamhusk.nodes[node[0]]) {
      newNodes[node[0]] = roamhusk.nodes[node[0]];
      return;
    }
    let str = node[1];
    const rawInterval = str.match(/\[\[\[\[interval\]\]\:(.+?)\]\]/);
    const rawFactor = str.match(/\[\[\[\[factor\]\]\:(.+?)\]\]/);
    const rawDate = str.match(roamhusk.dateRegex);
    str = str
      .replace(/\[\[\[\[interval\]\]\:(.+?)\]\]/g, "")
      .replace(/\[\[\[\[factor\]\]\:(.+?)\]\]/g, "")
      .replace(roamhusk.dateRegex, "")
      .trim();
    if (str.match("Elin") || str.match("David")) {
      return;
    }
    if (rawInterval && rawFactor && rawDate) {
      newNodes[node[0]] = {
        interval: parseFloat(rawInterval[1]),
        factor: parseFloat(rawFactor[1]),
        due: roamhusk.parseDateFromReference(rawDate[0]),
        uid: node[0],
        string: str
      };
    } else {
      newNodes[node[0]] = {
        interval: 1,
        factor: 2.3,
        due: new Date(),
        uid: node[0],
        string: str
      };
    }
  });
  roamhusk.nodes = { ...newNodes };
};

// --- Variables ---
roamhusk.prompts = {};
roamhusk.promptCounter = -1;
roamhusk.mode = false;
roamhusk.deltaRegex = /[0-9]+(?=\+0\}\})/g;

// Remove element by id
roamhusk.removeId = id => {
  let element = document.getElementById(id);
  if (element) element.remove();
};

// Add element to target
roamhusk.addElement = (element, target) => {
  if (element.id) roamhusk.removeId(element.id);
  target.appendChild(element);
};

// simulateClick by Viktor Tabori
roamhusk.simulateClick = (element, opts) => {
  events = ["mousehover", "mousedown", "click", "mouseup"];
  setTimeout(function() {
    events.forEach(function(type) {
      var _event = new MouseEvent(type, {
        view: window,
        bubbles: true,
        cancelable: true,
        buttons: 1,
        ...opts
      });
      _event.simulated = true;
      element.dispatchEvent(_event);
    });
  }, 0);
};

// --- Testing routine ---
var scriptUrl = document.currentScript.src;
var scriptId = document.currentScript.id;
roamhusk.testingReload = () => {
  document.removeEventListener("keyup", roamhusk.processKey);
  try {
    roamhusk.removeId(scriptId);
    roamhusk.removeId("roamhusk-review-button");
    roamhusk.removeId("roamhusk-refresh-button");
    roamhusk.removeId("roamhusk-counter-widget");
  } catch (e) {}

  document.getElementsByTagName("head")[0].appendChild(
    Object.assign(document.createElement("script"), {
      id: scriptId,
      src: scriptUrl,
      type: "text/javascript"
    })
  );
};

// Create refresh button
var refreshButton = Object.assign(document.createElement("div"), {
  id: "roamhusk-refresh-button",
  className: "bp3-button bp3-minimal bp3-small bp3-icon-refresh",
  onclick: roamhusk.testingReload
});

// Comment/uncomment here for debugging
roamhusk.addElement(
  refreshButton,
  document.querySelector(".roam-topbar .flex-h-box")
);

// --- Main helper functions ---

// Go to uid
roamhusk.goToUid = uid => {
  let baseUrl =
    "/" +
    new URL(window.location.href).hash
      .split("/")
      .slice(0, 3)
      .join("/");
  let url = uid ? baseUrl + "/page/" + uid : baseUrl;
  location.assign(url);
};

// Show/hide block/refs (Cloze deletion)
roamhusk.showBlockRefs = show => {
  document.querySelectorAll(".rm-block-ref").forEach(blockref => {
    blockref.classList.toggle("rm-block-ref-show", show);
  });
};

// Click away
roamhusk.focusMain = () => {
  roamhusk.simulateClick(document.querySelector(".roam-main"));
};

// Update the content of the main block
roamhusk.changeQuestionBlockContent = async transform => {
  roamhusk.simulateClick(document.querySelector(".rm-block-main .roam-block"));
  await roamhusk.sleep();
  var txtarea = document.activeElement;
  txtarea.readOnly = true;
  var setValue = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value"
  ).set;
  setValue.call(txtarea, transform(txtarea.value));
  var e = new Event("input", { bubbles: true });
  txtarea.readOnly = true;
  txtarea.dispatchEvent(e);
  txtarea.readOnly = true;
  await roamhusk.sleep();
  roamhusk.focusMain();
};

// Check [[h]] tag
roamhusk.checkhTag = async () => {
  // Find [[h]] pages id
  let query = window.roamAlphaAPI.q(
    '[:find (pull ?hpage [*]) :where [?hpage :node/title "h"] [?question :block/uid "' +
      roamhusk.prompts[roamhusk.promptCounter][0].uid +
      '"] [?question :block/refs ?hpage]]'
  );
  if (query.length == 0) {
    await roamhusk.changeQuestionBlockContent(text =>
      text.replace(/(\{\{\[\[âˆ†)/g, "#h $1")
    );
  }
};

// --- Spaced repetition ---
// Get current interval
roamhusk.getInterval = () => {
  var interval = roamhusk.prompts[roamhusk.promptCounter][0].string.match(
    roamhusk.deltaRegex
  );
  if (interval && interval.length != 0) return parseInt(interval[0]);
  else return 0;
};

roamhusk.getIntervalHumanReadable = n => {
  if (n == -1) return "<10 min";
  else if (n > 0 && n <= 15) return n + " d";
  else if (n <= 30) return (n / 7).toFixed(1) + " w";
  else if (n <= 365) return (n / 30).toFixed(1) + " m";
};

// --- Main functions ---

// Go to next prompt
roamhusk.goToNextPrompt = async () => {
  // Bump counter
  roamhusk.promptCounter += 1;

  // Update widget
  roamhusk.counterWidget();

  var doStuff = async () => {
    roamhusk.goToUid(roamhusk.prompts[roamhusk.promptCounter][0].uid);
    await roamhusk.sleep();
    roamhusk.showBlockRefs(false); // Cloze deletion
    roamhusk.addCustomElements();
  };

  // Force redirect to next prompt - NO DISTRACTIONS!
  window.onhashchange = doStuff;

  // Go to the next prompt
  await doStuff();
};

// Do funky stuff
roamhusk.clickAndGo = async yes => {
  window.onhashchange = async () => {};

  var doStuff = async transform => {
    await roamhusk.changeQuestionBlockContent(transform);
    await roamhusk.sleep();
    roamhusk.simulateClick(document.querySelector(".rm-orbit-tag"), {
      shiftKey: true
    });
    await roamhusk.sleep();
    await roamhusk.checkhTag();
  };

  if (yes && roamhusk.promptCounter >= roamhusk.countNewPrompts) {
    await doStuff(text =>
      text.replace(roamhusk.deltaRegex, roamhusk.calculateNextInterval(yes))
    );
  } else {
    if (roamhusk.promptCounter < roamhusk.countNewPrompts) {
      await doStuff(text => text + " {{[[âˆ†]]:0+0}}");
      roamhusk.countNewPrompts -= 1;
    }

    roamhusk.prompts.push(roamhusk.prompts[roamhusk.promptCounter]);
    roamhusk.prompts.splice(roamhusk.promptCounter, 1);
    roamhusk.promptCounter -= 1;
  }

  if (!roamhusk.prompts[roamhusk.promptCounter + 1]) {
    await roamhusk.setMode(false);
  } else {
    await roamhusk.goToNextPrompt();
  }
};

// Add response area
roamhusk.addCustomElements = () => {
  // Find container to add elements
  var container = document.querySelector(".roam-article");

  var responseArea = Object.assign(document.createElement("div"), {
    className: "roamhusk-response-area"
  });

  roamhusk.addElement(responseArea, container);

  // Add "Show answer." button
  var showAnswerButton = Object.assign(document.createElement("button"), {
    id: "show-answer-button",
    innerHTML: "Show answer.",
    className: "roamhusk-show-answer-button bp3-button"
  });

  roamhusk.addElement(showAnswerButton, responseArea);

  // Click event on "Show answer." button
  showAnswerButton.onclick = async () => {
    // Show answer
    document.querySelector(".rm-block-children").style.display = "flex";

    showAnswerButton.remove();
    roamhusk.showBlockRefs(true);

    let responses = roamhusk.settings.responses;
    var yesButton = Object.assign(document.createElement("button"), {
      id: "yes-button",
      innerHTML:
        responses[2] +
        "<sup>" +
        roamhusk.getIntervalHumanReadable(
          roamhusk.calculateNextInterval(true)
        ) +
        "</sup>",
      className: "roamhusk-yesno-button bp3-button",
      onclick: () => {
        responseArea.remove();
        roamhusk.clickAndGo(true);
      }
    });

    var noButton = Object.assign(document.createElement("button"), {
      id: "no-button",
      innerHTML:
        responses[1] +
        "<sup>" +
        roamhusk.getIntervalHumanReadable(
          roamhusk.calculateNextInterval(false)
        ) +
        "</sup>",
      className: "roamhusk-yesno-button bp3-button",
      onclick: () => {
        responseArea.remove();
        roamhusk.clickAndGo(false);
      }
    });

    var justLearnedButton = Object.assign(document.createElement("button"), {
      id: "just-learned-button",
      innerHTML:
        responses[0] +
        "<sup>" +
        roamhusk.getIntervalHumanReadable(
          roamhusk.calculateNextInterval(false)
        ) +
        "</sup>",
      className: "roamhusk-yesno-button bp3-button",
      onclick: () => {
        responseArea.remove();
        roamhusk.clickAndGo(false);
      }
    });

    if (roamhusk.promptCounter < roamhusk.countNewPrompts) {
      roamhusk.addElement(justLearnedButton, responseArea);
    } else {
      roamhusk.addElement(noButton, responseArea);
      roamhusk.addElement(yesButton, responseArea);
    }
  };
};

// Number of prompts in the top right
roamhusk.counterWidget = () => {
  let isNew = roamhusk.promptCounter < roamhusk.countNewPrompts;
  let newCount = isNew ? roamhusk.countNewPrompts - roamhusk.promptCounter : 0;
  let reviewCount =
    roamhusk.prompts.length - newCount - (isNew ? 0 : roamhusk.promptCounter);
  let widget = Object.assign(document.createElement("div"), {
    id: "roamhusk-counter-widget",
    innerHTML:
      ` <span style="color:blue;">` +
      newCount +
      `</span> ` +
      `<span style="color:green;">` +
      reviewCount +
      `</span>`,
    className: "roamhusk-counter-widget"
  });
  roamhusk.addElement(
    widget,
    document.querySelector(".roam-topbar .flex-h-box")
  );
};

// Start review session function
roamhusk.review = async () => {
  console.log("starting review");
};

// -----------------------------------------------
// --- Loading prompts & counting their number ---
// ------ calling functions directly here! -------
// -----------------------------------------------

// Adding buttons to the topbar
var toggleModeButton = Object.assign(document.createElement("div"), {
  id: "roamhusk-review-button",
  className: "bp3-button bp3-minimal bp3-small",
  innerHTML: `<svg width="16" height="16" version="1.1" viewBox="0 0 4.2333 4.2333" style="color:5c7080;">
			<g id="chat_1_" transform="matrix(.26458 0 0 .26458 115.06 79.526)">
				<g transform="matrix(-.79341 0 0 -.88644 -420.51 -284.7)" fill="currentColor">
					<path d="m6 13.665c-1.1 0-2-1.2299-2-2.7331v-6.8327h-3c-0.55 0-1 0.61495-1 1.3665v10.932c0 0.7516 0.45 1.3665 1 1.3665h9c0.55 0 1-0.61495 1-1.3665l-5.04e-4 -1.5989v-1.1342h-0.8295zm9-13.665h-9c-0.55 0-1 0.61495-1 1.3665v9.5658c0 0.7516 0.45 1.3665 1 1.3665h9c0.55 0 1-0.61495 1-1.3665v-9.5658c0-0.7516-0.45-1.3665-1-1.3665z"
					 clip-rule="evenodd" fill="currentColor" fill-rule="evenodd" />
				</g>
			</g>
		</svg>`,
  onclick: async () => {
    roamhusk.letsGo();
  }
});
toggleModeButton.style.cssText =
  "height: 24px; width: 24px; cursor: pointer; display: grid; place-content: center; gap: 1ch;";

roamhusk.addElement(
  toggleModeButton,
  document.querySelector(".roam-topbar .flex-h-box")
);

// Make Alt+D leave review mode

roamhusk.getNodes = () =>
  window.roamAlphaAPI
    .q(
      '[:find (pull ?question [:block/uid :block/string]) :where [?question :block/refs ?srPage] [?srPage :node/title "interval"] (not-join [?question] [?question :block/refs ?query] [?query :node/title "query"])]'
    )
    .concat(
      window.roamAlphaAPI.q(
        '[:find (pull ?question [:block/uid :block/string]) :where [?question :block/refs ?srPage] [?srPage :node/title "sr"] (not-join [?question] [?question :block/refs ?query] [?query :node/title "query"])]'
      )
    )
    .filter(x => x[0].string)
    .map(x => [x[0].uid, x[0].string]);

roamhusk.loadNodes = () => {
  roamhusk.parseNodes(roamhusk.getNodes());
};

roamhusk.save = () => {
  roamhusk.idbKeyval
    .set("roamhusk.srdata", roamhusk.nodes)
    .then(e => console.log("Successfully saved"))
    .catch(e => console.error("Problem saving nodes", e));
};

roamhusk.load = () => {
  roamhusk.idbKeyval
    .get("roamhusk.srdata")
    .then(e => {
      console.log("Successfully loaded");
      roamhusk.nodes = e;
    })
    .catch(e => console.error("Problem loading nodes", e));
};

roamhusk.load();

roamhusk.turnOnCss = () => {
  roamhusk.styleSheet.insertRule(".zoom-path-view { display: none; }", 0);
  roamhusk.styleSheet.insertRule(
    `[data-link-title^="[[interval]]:"], [data-link-title^="[[factor]]:"] {
    display: none;
}`,
    1
  );
  roamhusk.styleSheet.insertRule(
    `.roam-main .roam-topbar { background-color: lightblue !important }`,
    2
  );
  roamhusk.styleSheet.insertRule(
    `[data-link-title^="January"], [data-link-title^="February"], [data-link-title^="March"], [data-link-title^="April"], [data-link-title^="May"], [data-link-title^="June"], [data-link-title^="July"], [data-link-title^="August"], [data-link-title^="September"], [data-link-title^="October"], [data-link-title^="November"], [data-link-title^="December"] {
    display: none;
}`,
    3
  );

  // document.querySelector(".bp3-button + div").innerText =
  //   "Roam Husk review session started. x to exit";
};

roamhusk.letsGo = () => {
  if (roamhusk.active) {
    roamhusk.active = false;
    roamhusk.wrapUp();
    return;
  }
  document.addEventListener("keyup", roamhusk.processKey);
  roamhusk.active = true;
  roamhusk.turnOnCss();
  roamhusk.originalURL = document.location.href;
  console.log(
    "Starting, storing original URL to go back ",
    roamhusk.originalURL
  );
  roamhusk.loadNodes();
  roamhusk.save();
  roamhusk.getSortedDueCards(roamhusk.nodes);
};

roamhusk.sameDay = (d1, d2) => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

roamhusk.shuffle = array => {
  var currentIndex = array.length,
    temporaryValue,
    randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
};

roamhusk.fixedLength = (str, length) =>
  (str + "" + " ".repeat(80)).slice(0, length);

roamhusk.formatNode = node =>
  `F: ${roamhusk.fixedLength(node.factor, 4)}  I: ${roamhusk.fixedLength(
    node.interval,
    4
  )}  D: ${roamhusk.fixedLength(roamhusk.toUSDate(node.due), 12)} ${
    node.uid
  }: ${roamhusk.fixedLength(node.string, 80)}`;

roamhusk.getSortedDueCards = () => {
  const today = new Date();
  let todaysCards = [];
  const overdueCards = Object.values(roamhusk.nodes)
    .filter(x => {
      if (roamhusk.sameDay(new Date(x.due), today)) {
        todaysCards.push(x);
        return false;
      } else {
        return true;
      }
    })
    .filter(x => x.due > today);
  console.groupCollapsed("Today's cards");
  todaysCards.forEach(x => console.log(roamhusk.formatNode(x)));
  console.groupEnd();
  console.groupCollapsed("Other cards, sorted");
  roamhusk.shuffle(overdueCards);
  overdueCards.forEach(x => console.log(roamhusk.formatNode(x)));
  console.groupEnd();
  roamhusk.cardsToReview = todaysCards.concat(overdueCards);
  roamhusk.currentCard = 0;
  roamhusk.showAnswer = false;
  roamhusk.showCard();
};

roamhusk.showCard = () => {
  try {
    roamhusk.styleSheet.deleteRule(4);
  } catch (e) {}

  if (!roamhusk.showAnswer) {
    roamhusk.styleSheet.insertRule(
      `.roam-block-container>.rm-block-children { font-size: 0px }`,
      4
    );
    // document.querySelector(".bp3-button + div").innerText =
    //   "Roam Husk Review Session -- <x> to exit, <1-4> to answer";
  } else {
    // document.querySelector(".bp3-button + div").innerText =
    //   "Roam Husk Review Session -- <x> to exit, <SPC> to flip, <1-4> to answer";
  }

  roamhusk.goToUid(roamhusk.cardsToReview[roamhusk.currentCard].uid);
};

roamhusk.download = (filename, text) => {
  var element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(text)
  );
  element.setAttribute("download", filename);

  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
};

roamhusk.downloadNodes = () => {
  console.log("preparing for download");
  roamhusk.download("roamhusk-backup.json", JSON.stringify(roamhusk.nodes));
};

roamhusk.uploadNodes = () => {
  console.log(roamhusk.input);
  if (roamhusk.input) {
    console.log("already exists, cancel");
    return;
  }
  roamhusk.input = document.createElement("input");
  roamhusk.input.setAttribute("type", "file");
  roamhusk.input.setAttribute("id", "roamhusk.upload");
  roamhusk.input.addEventListener("change", roamhusk.onFile);
  roamhusk.input.click();
};

roamhusk.onFile = e => {
  const file = roamhusk.input.files[0];
  roamhusk.input = null;
  const reader = new FileReader();
  reader.onload = event => {
    try {
      newNodes = JSON.parse(reader.result);
      if (Object.values(newNodes)[0].interval) {
        roamhusk.nodes = newNodes;
        roamhusk.save();
        console.log(`Successfully loaded ${newNodes.length} nodes`);
      } else {
        console.error(`Failed parsing`, newNodes);
      }
    } catch (e) {
      console.error(`Failed uploading or parsing`, e);
    }
  };
  reader.readAsText(file);
};

roamhusk.wrapUp = () => {
  console.log("End of play, returning to ", roamhusk.originalURL);

  document.removeEventListener("keyup", roamhusk.processKey);
  // document.querySelector(".bp3-button + div").innerText = "";
  location.assign(roamhusk.originalURL);
  try {
    roamhusk.styleSheet.deleteRule(0);
    roamhusk.styleSheet.deleteRule(0);
    roamhusk.styleSheet.deleteRule(0);
    roamhusk.styleSheet.deleteRule(0);
    roamhusk.styleSheet.deleteRule(0);
  } catch (e) {
    console.warn("Could not delete stylesheet", e);
  }
};

roamhusk.processKey = e => {
  if (e.keyCode === 32 && !roamhusk.showAnswer) {
    roamhusk.showAnswer = true;
    roamhusk.showCard();
  } else if (e.key === "1" || e.key === "2" || e.key === "3" || e.key === "4") {
    const uid = roamhusk.cardsToReview[roamhusk.currentCard].uid;
    console.log(roamhusk.nodes[uid]);
    roamhusk.nodes[uid] = roamhusk.enforceLimits(
      roamhusk.addJitter(
        roamhusk.getNewParameters(roamhusk.nodes[uid], parseInt(e.key, 10))
      )
    );
    console.log(roamhusk.nodes[uid], parseInt(e.key, 10));
    roamhusk.save();
    roamhusk.currentCard += 1;
    roamhusk.showAnswer = false;
    roamhusk.showCard();
  } else if (e.key === "x") {
    roamhusk.active = false;
    roamhusk.wrapUp();
  } else if (e.key === "d") {
    roamhusk.downloadNodes();
  } else if (e.key === "u") {
    roamhusk.uploadNodes();
  }
};
roamhusk.randomFromInterval = (min, max) => Math.random() * (max - min) + min;

roamhusk.addJitter = node => {
  // I wonder if i can make this "regressive" i.e. start with larger number &
  // reduce percentage, as the number grows higher
  const jitter = node.interval * roamhusk.jitterPercentage;
  return {
    ...node,
    interval: node.interval + roamhusk.randomFromInterval(-jitter, jitter)
  };
};

roamhusk.enforceLimits = node => {
  return {
    ...node,
    interval: Math.min(node.interval, roamhusk.maxInterval),
    factor: Math.max(node.factor, roamhusk.minFactor)
  };
};

window.onbeforeunload = () => {
  roamhusk.hasEventListener = null;
};
