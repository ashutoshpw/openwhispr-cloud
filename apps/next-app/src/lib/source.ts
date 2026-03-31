import { docs, blogCollection } from "../.source/server";
import { loader } from "fumadocs-core/source";

export const docsSource = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
});

export const blog = blogCollection;
