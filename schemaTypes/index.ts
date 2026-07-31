import { post } from "./post";
import { event } from "./event";
import { cause } from "./cause";
import { team } from "./team";
import { category } from "./category";
import { tag } from "./tag";

// Site settings, Join FAQ, and Brand Kit stay on disk — not Studio documents.

export const schemaTypes = [category, tag, post, event, cause, team];
