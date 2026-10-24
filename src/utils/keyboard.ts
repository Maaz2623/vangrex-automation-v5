import { desktop } from "./desktop";

export const typeText = async ({
  role,
  name,
  text,
}: {
  role: string;
  name: string;
  text: string;
}) => {
  const selector = `role:${role}|name:${name}`;

  const element = await desktop.locator(selector).first(2000);

  element.focus();

  element.typeText(text);
};
