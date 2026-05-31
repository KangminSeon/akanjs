import { by, from, into } from "akanjs/document";

import * as cnst from "../cnst";

export class NotificationFilter extends from(cnst.Notification, (filter) => ({
  query: {},
  sort: {},
})) {}

export class Notification extends by(cnst.Notification) {}

export class NotificationModel extends into(Notification, NotificationFilter, cnst.notification, () => ({})) {}
