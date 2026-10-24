import { desktop } from "./src/utils/desktop";
import { hoverAtBounds } from "./src/utils/mouse";

const selector = `role:Button|name:Explorer Section: vangrex-automation-v5`;

const element = await desktop.locator(selector).first(1000);

const bounds = element.bounds();

console.log(bounds);

await hoverAtBounds({
  role: "Button",
  name: "Explorer Section: vangrex-automation-v5",
});
