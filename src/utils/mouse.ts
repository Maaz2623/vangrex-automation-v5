import { desktop } from "./desktop";
import robot from "robotjs";

export const clickAtBounds = async ({
  role,
  name,
  double,
  clickType,
}: {
  role: string;
  name: string;
  double: boolean;
  clickType: "left" | "right";
}) => {
  const selector = `role:${role}|name:${name}`;

  const element = await desktop.locator(selector).first(100);

  const { x, y, width, height } = element.bounds();

  const xPercentage = 50;
  const yPercentage = 50;

  const targetX = Math.round(x + (width * xPercentage) / 100);
  const targetY = Math.round(y + (height * yPercentage) / 100);

  robot.moveMouseSmooth(targetX, targetY, -1);

  robot.mouseClick(clickType, double);
};

export const hoverAtBounds = async ({
  role,
  name,
}: {
  role: string;
  name: string;
}) => {
  const selector = `role:${role}|name:${name}`;

  const element = await desktop.locator(selector).first(100);

  const { x, y, width, height } = element.bounds();

  const xPercentage = 50;
  const yPercentage = 50;

  const targetX = Math.round(x + (width * xPercentage) / 100);
  const targetY = Math.round(y + (height * yPercentage) / 100);

  robot.moveMouseSmooth(targetX, targetY, -1);
};
