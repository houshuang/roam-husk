 roamhusk.addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

roamhusk.randomFromInterval = (min, max) => Math.random() * (max - min) + min;

  roamhusk.schedule: (node, signal) => {
    const newParams = roamhusk.getNewParameters(node, signal);

    const currentDate = new Date();
    return node
      .withInterval(newParams.interval)
      .withFactor(newParams.factor)
      .withDate(addDays(currentDate, Math.ceil(newParams.interval)));
  },

roamhusk.getNewParameters: (node, signal) => {

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
        newInterval = interval * hardFactor;
        break;
      case 3:
        newInterval = interval * factor;
        break;
      case 4:
        newInterval = interval * factor;
        newFactor = factor + factorModifier;
        break;
    }
    const newDue = roamhusk.addDays(node.due, newInterval);
    return {...node,  interval: newInterval, factor: newFactor, due: newDue };
  }


