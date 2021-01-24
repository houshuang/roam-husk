const nodes = require("./nodes");
const scheduler = require("./scheduler");
// const getNodes = () =>
//   window.roamAlphaAPI
//     .q(
//       '[:find (pull ?question [:block/uid :block/string]) :where [?question :block/refs ?srPage] [?srPage :node/title "interval"] (not-join [?question] [?question :block/refs ?deltaPage] [?deltaPage :node/title "âˆ†"]) (not-join [?question] [?question :block/refs ?rmoved] [?rmoved :node/title "r/moved"]) (not-join [?question] [?question :block/refs ?query] [?query :node/title "query"])]'
//     )
//     .filter(x => x[0].string)
//     .map(x => [x[0].uid, x[0].string]);

const dateRegex = new RegExp(
  /\[\[(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}(st|nd|th|rd), \d{4}]]/gm
);

const parseDateFromReference = name => {
  return parseDate(name.slice(2).slice(0, -2));
};

const toUSDate = d => {
  const ye = new Intl.DateTimeFormat("en", { year: "numeric" }).format(d);
  const mo = new Intl.DateTimeFormat("en", { month: "short" }).format(d);
  const da = new Intl.DateTimeFormat("en", { day: "2-digit" }).format(d);
  return `${da}-${mo}-${ye}`;
};

const parseDate = name => new Date(name.replace(/(th,|nd,|rd,|st,)/, ","));

const getNodes = () => nodes.nodes;

const parseNodes = nodes => {
  const parsedNodes = [];
  nodes.forEach(node => {
    let str = node[1];
    const rawInterval = str.match(/\[\[\[\[interval\]\]\:(.+?)\]\]/);
    const rawFactor = str.match(/\[\[\[\[factor\]\]\:(.+?)\]\]/);
    const rawDate = str.match(dateRegex);
    str = str
      .replace(/\[\[\[\[interval\]\]\:(.+?)\]\]/g, "")
      .replace(/\[\[\[\[factor\]\]\:(.+?)\]\]/g, "")
      .replace(dateRegex, "")
      .trim();
if(str.match('Elin') || str.match('David')) { return}
    if (rawInterval && rawFactor && rawDate) {
      parsedNodes.push({
        interval: parseFloat(rawInterval[1]),
        factor: parseFloat(rawFactor[1]),
        due: parseDateFromReference(rawDate[0]),
        uid: node[0],
        string: str
      });
    }
  });
  return parsedNodes;
};

const parsedNodes = parseNodes(getNodes());

const fixedLength = (str, length) =>
  (str + "" + " ".repeat(80)).slice(0, length);

const formatNode = node =>
  `F: ${fixedLength(node.factor, 4)}  I: ${fixedLength(
    node.interval,
    4
  )}  D: ${fixedLength(toUSDate(node.due), 12)} ${node.uid}: ${fixedLength(
    node.string,
    80
  )}`;

const updateNode = (node, newParams) => {
  const newNode = { ...node, ...newParams };
  return newNode;
};

const previewSchedule = node => {
  console.log("Original node", formatNode(node));
  console.log(
    "Again",
    formatNode(updateNode(node, scheduler.getNewParameters(node, 1)))
  );
  console.log(
    "Hard",
    formatNode(updateNode(node, scheduler.getNewParameters(node, 2)))
  );
  console.log(
    "Good",
    formatNode(updateNode(node, scheduler.getNewParameters(node, 3)))
  );
  console.log(
    "Easy",
    formatNode(updateNode(node, scheduler.getNewParameters(node, 4)))
  );
};

// previewSchedule(parsedNodes[0]);
const sameDay = (d1, d2) => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

// start by cards due today, then cards that have the oldest due dates
const getSortedDueCards = nodes => {
  const today = new Date();
  let todaysCards = [];
  const overdueCards = nodes
    .filter(x => {
      if (sameDay(x.due, today)) {
        todaysCards.push(x);
        return false;
      } else {
        return true;
      }
    })
    .sort((x, y) => x.due - y.due);
  console.log("Today's cards");
  todaysCards.forEach(x => console.log(formatNode(x)));
  console.log("Other cards, sorted");
  overdueCards.forEach(x => console.log(formatNode(x)));
};
getSortedDueCards(parsedNodes);
