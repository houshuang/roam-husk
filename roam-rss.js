if (!window.roamrss) {
  window.roamrss = {};
}

// Remove element by id
roamrss.removeId = id => {
  let element = document.getElementById(id);
  if (element) element.remove();
};

// Add element to target
roamrss.addElement = (element, target) => {
  if (element.id) roamrss.removeId(element.id);
  target.appendChild(element);
};

// reads a setting attribute from graph, also converts booleans
roamrss.getSetting = settingTitle => {
  let setting = roamAlphaAPI.q(
    `[:find (pull ?question [:block/uid :block/string]) :where [?question :block/refs ?srPage] [?srPage :node/title "roam/husk/${settingTitle}"] ]`
  );
  let settingValue =
    setting &&
    setting[0] &&
    setting[0][0] &&
    setting[0][0].string.split("::") &&
    setting[0][0].string.split("::")[1].trim();
  if (
    settingValue === "true" ||
    settingValue === "True" ||
    settingValue === "1"
  ) {
    return true;
  }
  if (
    settingValue === "false" ||
    settingValue === "False" ||
    settingValue === "0"
  ) {
    return false;
  }
  return settingValue;
};

roamrss.addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

roamrss.randomFromInterval = (min, max) => Math.random() * (max - min) + min;

roamrss.getNewParameters = (node, signal) => {
  // skipping card with 0
  if (signal === 0) {
    return node;
  }

  const factor = node.factor || roamrss.defaultFactor;
  const interval = node.interval || roamrss.defaultInterval;

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

      newInterval = interval * roamrss.hardFactor;
      break;
    case 3:
      newInterval = interval * factor;
      break;
    case 4:
      newInterval = interval * factor;
      newFactor = factor + factorModifier;
      break;
  }
  const newDue = roamrss.addDays(new Date(), newInterval);
  return { ...node, interval: newInterval, factor: newFactor, due: newDue };
};

// 20210119093326
// https://raw.githubusercontent.com/jakearchibald/idb-keyval/master/dist/iife/index-min.js
roamrss.idbKeyval = (function(t) {
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
roamrss.defaultFactor = 2.5;
roamrss.defaultInterval = 2;
roamrss.maxInterval = 50 * 365;
roamrss.minFactor = 1.3;
roamrss.hardFactor = 1.2;
roamrss.jitterPercentage = 0.05;
roamrss.active = false;

roamrss.getParamsFromGraph = () => {
  roamrss.defaultHidePath = roamhusk.getSetting("defaultHidePath");
  roamrss.hidePathTag = roamhusk.getSetting("hidePathTag") || "sr";
  roamrss.showPathTag = roamhusk.getSetting("showPathTag") || "srt";
  roamrss.answerPathTag = roamhusk.getSetting("answerPathTag") || "sra";
  roamrss.fractalInquiryTag = roamhusk.getSetting("fractalInquiryTag") || "fi";
  roamrss.defaultAnswer = roamhusk.getSetting("defaultAnswer") || "3";
  roamrss.includeRoamToolkit = roamhusk.getSetting("includeRoamToolkit");
  roamrss.shouldRemoveInterval = roamhusk.getSetting("removeInterval");

  console.log("Settings", {
    defaultHidePath: roamrss.defaultHidePath,
    hidePathTag: roamrss.hidePathTag,
    showPathTag: roamrss.showPathTag,
    answerPathTag: roamrss.answerPathTag,
    includeRoamToolkit: roamrss.includeRoamToolkit,
    defaultAnswer: roamrss.defaultAnswer,
    fractalInquiryTag: roamrss.fractalInquiryTag,
    removeInterval: roamrss.shouldRemoveInterval
  });
};

roamrss.clearCss = () => {
  try {
    new Array(roamrss.styleSheet.rules.length)
      .fill("")
      .forEach(() => roamrss.styleSheet.deleteRule(0));
  } catch (e) {}
};

// create a custom stylesheet
if (!roamrss.styleSheet) {
  roamrss.style = document.createElement("style");
  roamrss.style.appendChild(document.createTextNode(""));
  document.head.appendChild(roamrss.style);
  roamrss.styleSheet = roamhusk.style.sheet;
} else {
  roamrss.clearCss();
}

roamrss.dateRegex = new RegExp(
  /\[\[(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}(st|nd|th|rd), \d{4}]]/gm
);

roamrss.parseDateFromReference = name => {
  return roamrss.parseDate(name.slice(2).slice(0, -2));
};

roamrss.toUSDate = d => {
  const ye = new Intl.DateTimeFormat("en", { year: "numeric" }).format(d);
  const mo = new Intl.DateTimeFormat("en", { month: "short" }).format(d);
  const da = new Intl.DateTimeFormat("en", { day: "2-digit" }).format(d);
  return `${da}-${mo}-${ye}`;
};

roamrss.parseDate = name => new Date(name.replace(/(th,|nd,|rd,|st,)/, ","));

roamrss.parseNodes = nodes => {
  if (!roamrss.nodes) {
    roamrss.nodes = {};
  }
  const newNodes = { ...roamrss.nodes };
  Object.keys(newNodes).forEach(x => {
    newNodes[x].disabled = true;
  });
  nodes.forEach(node => {
    let str = node[1];
    const rawInterval = str.match(/\[\[\[\[interval\]\]\:(.+?)\]\]/);
    const rawFactor = str.match(/\[\[\[\[factor\]\]\:(.+?)\]\]/);
    const rawDate = str.match(roamrss.dateRegex);
    str = str.trim();
    // preserve existing metadata
    if (roamrss.nodes[node[0]]) {
      newNodes[node[0]].disabled = false;
      newNodes[node[0]].string = str;
    } else if (rawInterval && rawFactor && rawDate) {
      newNodes[node[0]] = {
        interval: parseFloat(rawInterval[1]),
        factor: parseFloat(rawFactor[1]),
        due: roamrss.parseDateFromReference(rawDate[0]),
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
  roamrss.nodes = { ...newNodes };
};

// --- Testing routine ---
var scriptUrl = document.currentScript.src;
var scriptId = document.currentScript.id;
roamrss.testingReload = () => {
  document.removeEventListener("keyup", roamrss.processKey);
  try {
    roamrss.removeId(scriptId);
    roamrss.removeId("roamhusk-review-button");
    roamrss.removeId("roamhusk-refresh-button");
    roamrss.removeId("roamhusk-counter-widget");
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
  id: "roamrss-refresh-button",
  className: "bp3-button bp3-minimal bp3-small bp3-icon-refresh",
  onclick: roamrss.testingReload
});

// Comment/uncomment here for debugging
roamrss.addElement(
  refreshButton,
  document.querySelector(".roam-topbar .flex-h-box")
);

// --- Main helper functions ---

// Go to uid
roamrss.goToUid = uid => {
  let baseUrl =
    "/" +
    new URL(window.location.href).hash
      .split("/")
      .slice(0, 3)
      .join("/");
  let url = uid ? baseUrl + "/page/" + uid : baseUrl;
  console.log("Going to uid", uid, url);
  location.assign(url);

  // sometimes changing URL doesn't "stick" so retry
  window.setTimeout(() => {
    if (!window.location.href === url) {
      console.log("Trying to set URL second time");
      window.location.assign(url);
    } else {
      console.log("Arrived");
    }
  }, 100);
};

// Adding buttons to the topbar
var toggleModeButton = Object.assign(document.createElement("div"), {
  id: "roamrss-review-button",
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
    roamrss.letsGo();
  }
});
toggleModeButton.style.cssText =
  "height: 24px; width: 24px; cursor: pointer; display: grid; place-content: center; gap: 1ch;";

roamrss.addElement(
  toggleModeButton,
  document.querySelector(".roam-topbar .flex-h-box")
);

// Make Alt+D leave review mode

roamrss.getNodes = () => {
  let searchTags = [];
  if (roamrss.includeRoamToolkit) {
    searchTags.push("interval");
  }
  if (roamrss.hidePathTag) {
    searchTags.push(roamrss.hidePathTag);
  }
  if (roamrss.showPathTag) {
    searchTags.push(roamrss.showPathTag);
  }
  if (roamrss.answerPathTag) {
    searchTags.push(roamrss.answerPathTag);
  }
  if (roamrss.fractalInquiryTag) {
    searchTags.push(roamrss.fractalInquiryTag);
  }
  let searchQuery = searchTags.map(x => ` [?srPage :node/title "${x}"]`);

  return window.roamAlphaAPI
    .q(
      `[:find (pull ?question [:block/uid :block/string]) :where [?question :block/refs ?srPage] (or ${searchQuery})
      (not-join [?question] [?question :block/refs ?query] [?query :node/title "query"])]`
    )
    .filter(x => x[0].string)
    .map(x => [x[0].uid, x[0].string]);
};

roamrss.loadNodes = () => {
  roamrss.getParamsFromGraph();
  roamrss.parseNodes(roamhusk.getNodes());
};

roamrss.save = () => {
  roamrss.idbKeyval
    .set("roamrss.srdata", roamhusk.nodes)
    .then(e => console.log("Successfully saved"))
    .catch(e => console.error("Problem saving nodes", e));
};

roamrss.load = () => {
  roamrss.idbKeyval
    .get("roamrss.srdata")
    .then(e => {
      console.log("Successfully loaded");
      roamrss.nodes = e;
    })
    .catch(e => console.error("Problem loading nodes", e));
};

roamrss.load();

roamrss.turnOnCss = () => {
  roamrss.styleSheet.insertRule(
    `.roam-body-main [data-link-title^="[[interval]]:"], [data-tag="sr"], [data-link-title^="[[factor]]:"] {
    display: none;
}`,
    0
  );
  roamrss.styleSheet.insertRule(
    `.roam-main .roam-topbar { background-color: lightblue !important }`,
    1
  );
  roamrss.styleSheet.insertRule(
    `.roam-body-main [data-link-title^="January"], [data-link-title^="February"], [data-link-title^="March"], [data-link-title^="April"], [data-link-title^="May"], [data-link-title^="June"], [data-link-title^="July"], [data-link-title^="August"], [data-link-title^="September"], [data-link-title^="October"], [data-link-title^="November"], [data-link-title^="December"] {
    display: none;
}`,
    2
  );
  roamrss.styleSheet.insertRule(
    ".rm-attr-ref { font-size: 14px !important }",
    3
  );

  // document.querySelector(".bp3-button + div").innerText =
  //   "Roam Husk review session started. x to exit";
};

roamrss.letsGo = () => {
  //find feeds

  const feedBlock = roamAlphaAPI.q(
    `[:find  :find (pull ?e [* {:block/children [*]}])   :where [?e :block/refs ?srPage] [?srPage :node/title "roam/rss/feeds"] ]`
  );
  const feedReaderBlock = roamAlphaAPI.q(
    `[:find  :find (pull ?e [* {:block/children [*]}])   :where [?e :block/refs ?srPage] [?srPage :node/title "roam/rss/feedReader"] ]`
  );
  const feeds = feedBlock[0][0].children;
  feeds.forEach((f, fi) => {
    const newP = new RSSParser();
    console.log("getting", f.string);
    newP.parseURL("https://cors-anywhere.herokuapp.com/" + f.string).then(e => {
      const blogUid = cuid();
      console.log({
        location: { "parent-uid": feedReaderBlock[0][0].uid, order: fi },
        block: { string: f.title, uid: blogUid }
      });
      roamAlphaAPI.createBlock({
        location: { "parent-uid": feedReaderBlock[0][0].uid, order: fi },
        block: { string: e.title || f.string, uid: blogUid }
      });
      e.items.slice(0, 3).forEach((item, i) => {
        console.log("processing", item);
        const uid = cuid();
        console.log({
          location: { "parent-uid": blogUid, order: i },
          block: { string: item.title, uid }
        });
        roamAlphaAPI.createBlock({
          location: { "parent-uid": blogUid, order: i },
          block: { string: item.title, uid }
        });
        roamAlphaAPI.createBlock({
          location: { "parent-uid": blogUid, order: i },
          block: { string: item.title, uid }
        });
        roamAlphaAPI.createBlock({
          location: { "parent-uid": uid, order: 0 },
          block: { string: item['content:encoded'] || item.content }
        });
      });
    });
  });
};
