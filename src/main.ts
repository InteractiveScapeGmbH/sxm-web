import { SxmSession } from "./session";

const session = new SxmSession();
session.onStart = (message) => {
  console.log(message);
};
session.start();