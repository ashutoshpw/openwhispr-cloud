import { loader } from "fumadocs-core/source";
import { blogCollection, docs } from "../.source/server";

export const docsSource = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
});

export const blog = blogCollection;
