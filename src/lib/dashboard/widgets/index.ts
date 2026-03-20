import { blockedWidgets } from "./blocked";
import { coreWidgets } from "./core";
import { exceptionWidgets } from "./exceptions";

export const dashboardWidgets = [
  ...coreWidgets,
  ...exceptionWidgets,
  ...blockedWidgets,
];
